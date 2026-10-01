import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  ActiveTab,
  AppNotification,
  AppSettings,
  AuditLog,
  Customer,
  Installment,
  Loan,
  LoanType,
  OfflineQueueItem,
  Payment,
  PaymentPeriod,
} from '../types';
import {
  calculateLoanFinancials,
  formatIndonesianDate,
  formatRupiah,
  generateDueDates,
  generateSafeId,
  getDaysDiffFromToday,
  getDefaultSettings,
  getNowAuditString,
  getTodayDateStr,
} from '../utils/formatters';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface MicroPopup {
  id: number;
  label: string;
}

interface PaymentQuickTarget {
  customerId?: string;
  loanId?: string;
  installmentId?: string;
}

interface AppContextValue {
  user: User | null;
  authLoading: boolean;
  dataLoading: boolean;
  isOnline: boolean;
  hasPendingWrites: boolean;
  offlineQueue: OfflineQueueItem[];
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  paymentTarget: PaymentQuickTarget | null;
  clearPaymentTarget: () => void;
  navigateToPayment: (target: PaymentQuickTarget) => void;
  selectedCustomerForLoan: string | null;
  setSelectedCustomerForLoan: (customerId: string | null) => void;

  // Data collections (filtered for current owner)
  settings: AppSettings;
  customers: Customer[];
  loans: Loan[];
  installments: Installment[];
  payments: Payment[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];

  // Pop-ups & Toasts
  toasts: ToastMessage[];
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
  microPopup: MicroPopup | null;
  triggerMicroPopup: (label: string) => void;

  // Auth Actions
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;

  // CRUD & Business Actions
  saveSettings: (updated: Partial<AppSettings>) => Promise<void>;
  addCustomer: (input: {
    name: string;
    phone: string;
    address: string;
    photoUrl: string;
    notes: string;
    status: 'aktif' | 'nonaktif';
  }) => Promise<string>;
  updateCustomer: (
    customerId: string,
    input: {
      name: string;
      phone: string;
      address: string;
      photoUrl: string;
      notes: string;
      status: 'aktif' | 'nonaktif';
    }
  ) => Promise<void>;
  softDeleteCustomer: (customerId: string) => Promise<void>;

  createLoanWithSchedule: (input: {
    customerId: string;
    type: LoanType;
    itemName: string;
    itemCategory: string;
    itemPrice: number;
    downPayment: number;
    interestRate: number;
    interestAmount: number;
    tenor: number;
    period: PaymentPeriod;
    startDate: string;
    firstDueDate: string;
    notes: string;
    photoUrl: string;
  }) => Promise<string>;

  recordPayment: (input: {
    loanId: string;
    installmentId: string;
    amount: number;
    paymentDate: string;
    method: 'tunai' | 'transfer' | 'lainnya';
    notes: string;
  }) => Promise<Payment>;

  voidPayment: (paymentId: string, reason: string) => Promise<void>;

  recordExportLog: (format: string, reportTitle: string) => Promise<void>;
  recordBackupLog: () => Promise<void>;
  restoreBackupData: (backupJson: {
    settings?: Partial<AppSettings>;
    customers?: Customer[];
    loans?: Loan[];
    installments?: Installment[];
    payments?: Payment[];
  }) => Promise<void>;

  // Notification Actions
  notificationPermission: NotificationPermission;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  sendBrowserNotification: (title: string, body: string) => Promise<boolean>;
  dueAlerts: {
    id: string;
    type: 'H-7' | 'H-3' | 'H-1' | 'HARI_H' | 'TUNGGAKAN';
    title: string;
    body: string;
    installment: Installment;
    daysDiff: number;
  }[];
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const isOnline = useOnlineStatus();
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);

  const [activeTab, setActiveTabState] = useState<ActiveTab>('dashboard');
  const [paymentTarget, setPaymentTarget] =
    useState<PaymentQuickTarget | null>(null);
  const [selectedCustomerForLoan, setSelectedCustomerForLoan] = useState<
    string | null
  >(null);

  const [settings, setSettings] = useState<AppSettings>(() =>
    getDefaultSettings('guest', 'Pemilik Usaha')
  );
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allLoans, setAllLoans] = useState<Loan[]>([]);
  const [allInstallments, setAllInstallments] = useState<Installment[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [microPopup, setMicroPopup] = useState<MicroPopup | null>(null);
  const microTimerRef = useRef<number | null>(null);

  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>(() =>
      typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );

  const showToast = useCallback(
    (text: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, text, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const triggerMicroPopup = useCallback((label: string) => {
    const clean = label.trim().slice(0, 60);
    if (!clean) return;
    if (microTimerRef.current) {
      window.clearTimeout(microTimerRef.current);
    }
    setMicroPopup({ id: Date.now(), label: clean });
    microTimerRef.current = window.setTimeout(() => {
      setMicroPopup(null);
    }, 1300);
  }, []);

  // Global listener so EVERY button or interactive link tap shows a small pop-up
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const btn = target.closest('button, a[data-popup], [role="button"]');
      if (!btn) return;
      const customPopup = btn.getAttribute('data-popup');
      const ariaLabel = btn.getAttribute('aria-label');
      const textContent = (btn.textContent || '').replace(/\s+/g, ' ').trim();
      const label = customPopup || ariaLabel || textContent || 'Tombol dipilih';
      triggerMicroPopup(`✓ ${label}`);
    };
    document.addEventListener('click', handleGlobalClick, true);
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, [triggerMicroPopup]);

  const setActiveTab = useCallback((tab: ActiveTab) => {
    setActiveTabState(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navigateToPayment = useCallback((target: PaymentQuickTarget) => {
    setPaymentTarget(target);
    setActiveTabState('payments');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const clearPaymentTarget = useCallback(() => {
    setPaymentTarget(null);
  }, []);

  // Auth state listener & user bootstrap
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          const nowIso = new Date().toISOString();
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              ownerId: currentUser.uid,
              email: currentUser.email || 'user@gmail.com',
              displayName: (currentUser.displayName || 'Pemilik Usaha').slice(
                0,
                200
              ),
              photoUrl: (currentUser.photoURL || '').slice(0, 2000),
              lastLoginAt: nowIso,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else {
            await updateDoc(userRef, {
              email: currentUser.email || 'user@gmail.com',
              displayName: (currentUser.displayName || 'Pemilik Usaha').slice(
                0,
                200
              ),
              photoUrl: (currentUser.photoURL || '').slice(0, 2000),
              lastLoginAt: nowIso,
              updatedAt: serverTimestamp(),
            });
          }

          const settingsRef = doc(db, 'settings', currentUser.uid);
          const settingsSnap = await getDoc(settingsRef);
          if (!settingsSnap.exists()) {
            const def = getDefaultSettings(
              currentUser.uid,
              currentUser.displayName || 'Pemilik Usaha'
            );
            await setDoc(settingsRef, {
              ...def,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          console.error('Bootstrap user/settings error:', err);
        }
      }
    });
    return () => unsub();
  }, []);

  // Realtime Firestore listeners isolated by ownerId == user.uid
  useEffect(() => {
    if (!user) {
      setAllCustomers([]);
      setAllLoans([]);
      setAllInstallments([]);
      setAllPayments([]);
      setNotifications([]);
      setAuditLogs([]);
      return;
    }

    setDataLoading(true);
    const uid = user.uid;

    const settingsRef = doc(db, 'settings', uid);
    const unsubSettings = onSnapshot(
      settingsRef,
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.exists()) {
          setSettings(snap.data() as AppSettings);
        } else {
          setSettings(
            getDefaultSettings(uid, user.displayName || 'Pemilik Usaha')
          );
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `settings/${uid}`)
    );

    const qCustomers = query(
      collection(db, 'customers'),
      where('ownerId', '==', uid)
    );
    const unsubCustomers = onSnapshot(
      qCustomers,
      { includeMetadataChanges: true },
      (snap) => {
        setHasPendingWrites(snap.metadata.hasPendingWrites);
        const list: Customer[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Customer, 'id'>),
        }));
        setAllCustomers(list);
        setDataLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'customers')
    );

    const qLoans = query(collection(db, 'loans'), where('ownerId', '==', uid));
    const unsubLoans = onSnapshot(
      qLoans,
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.metadata.hasPendingWrites) setHasPendingWrites(true);
        const list: Loan[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Loan, 'id'>),
        }));
        setAllLoans(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'loans')
    );

    const qInstallments = query(
      collection(db, 'installments'),
      where('ownerId', '==', uid)
    );
    const unsubInstallments = onSnapshot(
      qInstallments,
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.metadata.hasPendingWrites) setHasPendingWrites(true);
        const list: Installment[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Installment, 'id'>),
        }));
        setAllInstallments(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'installments')
    );

    const qPayments = query(
      collection(db, 'payments'),
      where('ownerId', '==', uid)
    );
    const unsubPayments = onSnapshot(
      qPayments,
      { includeMetadataChanges: true },
      (snap) => {
        setHasPendingWrites(snap.metadata.hasPendingWrites);
        const list: Payment[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Payment, 'id'>),
        }));
        setAllPayments(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'payments')
    );

    const qNotifications = query(
      collection(db, 'notifications'),
      where('ownerId', '==', uid)
    );
    const unsubNotifications = onSnapshot(
      qNotifications,
      (snap) => {
        const list: AppNotification[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AppNotification, 'id'>),
        }));
        setNotifications(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
    );

    const qAuditLogs = query(
      collection(db, 'audit_logs'),
      where('ownerId', '==', uid)
    );
    const unsubAuditLogs = onSnapshot(
      qAuditLogs,
      (snap) => {
        const list: AuditLog[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AuditLog, 'id'>),
        }));
        list.sort((a, b) => b.id.localeCompare(a.id));
        setAuditLogs(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'audit_logs')
    );

    return () => {
      unsubSettings();
      unsubCustomers();
      unsubLoans();
      unsubInstallments();
      unsubPayments();
      unsubNotifications();
      unsubAuditLogs();
    };
  }, [user]);

  // Clear offline queue items when back online and pending writes flush
  useEffect(() => {
    if (isOnline && !hasPendingWrites && offlineQueue.length > 0) {
      setOfflineQueue([]);
      showToast('Sinkronisasi data ke cloud berhasil.', 'success');
    }
  }, [isOnline, hasPendingWrites, offlineQueue.length, showToast]);

  const customers = useMemo(
    () =>
      allCustomers
        .filter((c) => !c.isDeleted)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allCustomers]
  );

  const loans = useMemo(
    () =>
      allLoans
        .filter((l) => !l.isDeleted)
        .sort((a, b) => b.id.localeCompare(a.id)),
    [allLoans]
  );

  const installments = useMemo(
    () =>
      allInstallments
        .filter((i) => i.status !== 'dibatalkan')
        .sort((a, b) => {
          if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
          return a.installmentNumber - b.installmentNumber;
        }),
    [allInstallments]
  );

  const payments = useMemo(
    () => [...allPayments].sort((a, b) => b.id.localeCompare(a.id)),
    [allPayments]
  );

  // Compute due alerts according to settings (H-7, H-3, H-1, Hari H, Tunggakan)
  const dueAlerts = useMemo(() => {
    const activeLoanIds = new Set(
      loans.filter((l) => l.status === 'aktif').map((l) => l.id)
    );
    const alerts: {
      id: string;
      type: 'H-7' | 'H-3' | 'H-1' | 'HARI_H' | 'TUNGGAKAN';
      title: string;
      body: string;
      installment: Installment;
      daysDiff: number;
    }[] = [];

    for (const inst of installments) {
      if (!activeLoanIds.has(inst.loanId)) continue;
      if (inst.status === 'lunas' || inst.remainingAmount <= 0) continue;

      const diff = getDaysDiffFromToday(inst.dueDate);
      if (diff < 0 && settings.notifOverdue) {
        alerts.push({
          id: `overdue_${inst.id}`,
          type: 'TUNGGAKAN',
          title: '⚠️ Tunggakan Angsuran',
          body: `${inst.customerName} terlambat ${Math.abs(diff)} hari untuk angsuran ke-${inst.installmentNumber} (${inst.loanItemName}) sebesar ${formatRupiah(inst.remainingAmount)}.`,
          installment: inst,
          daysDiff: diff,
        });
      } else if (diff === 0 && settings.notifHariH) {
        alerts.push({
          id: `hari_h_${inst.id}`,
          type: 'HARI_H',
          title: '🔔 Jatuh Tempo Hari Ini',
          body: `${inst.customerName} memiliki angsuran ${formatRupiah(inst.remainingAmount)} (${inst.loanItemName}) yang jatuh tempo hari ini.`,
          installment: inst,
          daysDiff: diff,
        });
      } else if (diff === 1 && settings.notifH1) {
        alerts.push({
          id: `h1_${inst.id}`,
          type: 'H-1',
          title: '⏳ Pengingat H-1 Jatuh Tempo',
          body: `Besok ${inst.customerName} jatuh tempo angsuran ${formatRupiah(inst.remainingAmount)} (${inst.loanItemName}).`,
          installment: inst,
          daysDiff: diff,
        });
      } else if (diff > 1 && diff <= 3 && settings.notifH3) {
        alerts.push({
          id: `h3_${inst.id}`,
          type: 'H-3',
          title: `📅 Pengingat H-${diff} Jatuh Tempo`,
          body: `${inst.customerName} memiliki angsuran ${formatRupiah(inst.remainingAmount)} jatuh tempo pada ${formatIndonesianDate(inst.dueDate)}.`,
          installment: inst,
          daysDiff: diff,
        });
      } else if (diff > 3 && diff <= 7 && settings.notifH7) {
        alerts.push({
          id: `h7_${inst.id}`,
          type: 'H-7',
          title: `📅 Pengingat H-${diff} Jatuh Tempo`,
          body: `${inst.customerName} memiliki angsuran ${formatRupiah(inst.remainingAmount)} jatuh tempo pada ${formatIndonesianDate(inst.dueDate)}.`,
          installment: inst,
          daysDiff: diff,
        });
      }
    }

    return alerts.sort((a, b) => a.daysDiff - b.daysDiff);
  }, [
    installments,
    loans,
    settings.notifH1,
    settings.notifH3,
    settings.notifH7,
    settings.notifHariH,
    settings.notifOverdue,
  ]);

  const sendBrowserNotification = useCallback(
    async (title: string, body: string): Promise<boolean> => {
      if (typeof Notification === 'undefined') return false;
      if (Notification.permission !== 'granted') return false;
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && 'showNotification' in reg) {
            await reg.showNotification(title, {
              body,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag: `kreditku_${Date.now()}`,
            });
            return true;
          }
        }
        new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
        });
        return true;
      } catch (err) {
        console.error('Notification error:', err);
        return false;
      }
    },
    []
  );

  // Automatically notify once per session when pushEnabled & permission granted & alerts exist
  const notifiedSessionRef = useRef(false);
  useEffect(() => {
    if (
      user &&
      settings.pushEnabled &&
      notificationPermission === 'granted' &&
      dueAlerts.length > 0 &&
      !notifiedSessionRef.current
    ) {
      notifiedSessionRef.current = true;
      const topAlert = dueAlerts[0];
      sendBrowserNotification(topAlert.title, topAlert.body);
    }
  }, [
    user,
    settings.pushEnabled,
    notificationPermission,
    dueAlerts,
    sendBrowserNotification,
  ]);

  const requestNotificationPermission =
    useCallback(async (): Promise<NotificationPermission> => {
      if (typeof Notification === 'undefined') {
        showToast('Browser ini tidak mendukung notifikasi sistem.', 'error');
        return 'denied';
      }
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        showToast('Izin notifikasi HP berhasil diaktifkan!', 'success');
      } else {
        showToast(
          'Izin notifikasi belum diberikan. Aktifkan melalui pengaturan browser Chrome.',
          'info'
        );
      }
      return perm;
    }, [showToast]);

  const loginWithGoogle = useCallback(async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user) {
        const logId = generateSafeId('log');
        await setDoc(doc(db, 'audit_logs', logId), {
          ownerId: cred.user.uid,
          action: 'LOGIN',
          entityType: 'auth',
          entityId: cred.user.uid,
          customerName: '',
          loanTitle: '',
          amount: 0,
          status: 'Berhasil',
          description: `Login akun Google: ${cred.user.email || cred.user.displayName}`,
          timestampStr: getNowAuditString(),
          createdAt: serverTimestamp(),
        });
        showToast(
          `Selamat datang, ${cred.user.displayName || cred.user.email}!`,
          'success'
        );
      }
    } catch (err) {
      console.error('Login Google error:', err);
      showToast('Gagal masuk dengan Google. Silakan coba lagi.', 'error');
    }
  }, [showToast]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      showToast('Anda telah keluar dari akun.', 'info');
    } catch (err) {
      console.error('Logout error:', err);
      showToast('Gagal keluar dari akun.', 'error');
    }
  }, [showToast]);

  const queueIfOffline = useCallback(
    (description: string) => {
      if (!isOnline) {
        setOfflineQueue((prev) => [
          ...prev,
          {
            id: generateSafeId('q'),
            timestamp: getNowAuditString(),
            description,
            status: 'pending',
          },
        ]);
        showToast('Mode Offline: Menunggu sinkronisasi ke cloud.', 'info');
      }
    },
    [isOnline, showToast]
  );

  const saveSettings = useCallback(
    async (updated: Partial<AppSettings>) => {
      if (!user) return;
      const uid = user.uid;
      const merged: AppSettings = {
        ...settings,
        ...updated,
        ownerId: uid,
        businessName: (updated.businessName ?? settings.businessName)
          .trim()
          .slice(0, 150) || 'Usaha KreditKu',
        ownerName: (updated.ownerName ?? settings.ownerName)
          .trim()
          .slice(0, 150),
        whatsappNumber: (updated.whatsappNumber ?? settings.whatsappNumber)
          .trim()
          .slice(0, 30),
        businessAddress: (updated.businessAddress ?? settings.businessAddress)
          .trim()
          .slice(0, 500),
        businessLogoUrl: (
          updated.businessLogoUrl ?? settings.businessLogoUrl
        ).slice(0, 500000),
        defaultInterestRate: Math.max(
          0,
          Math.min(
            1000,
            Number(
              updated.defaultInterestRate ?? settings.defaultInterestRate
            ) || 0
          )
        ),
        defaultTenor: Math.max(
          1,
          Math.min(
            360,
            Math.round(Number(updated.defaultTenor ?? settings.defaultTenor) || 1)
          )
        ),
        waTemplateDue:
          (updated.waTemplateDue ?? settings.waTemplateDue)
            .trim()
            .slice(0, 2000) ||
          getDefaultSettings(uid, 'Pemilik').waTemplateDue,
        waTemplateOverdue:
          (updated.waTemplateOverdue ?? settings.waTemplateOverdue)
            .trim()
            .slice(0, 2000) ||
          getDefaultSettings(uid, 'Pemilik').waTemplateOverdue,
        waTemplatePaid:
          (updated.waTemplatePaid ?? settings.waTemplatePaid)
            .trim()
            .slice(0, 2000) ||
          getDefaultSettings(uid, 'Pemilik').waTemplatePaid,
      };

      queueIfOffline('Menyimpan pengaturan aplikasi');
      try {
        const batch = writeBatch(db);
        const settingsRef = doc(db, 'settings', uid);
        const snap = await getDoc(settingsRef);
        if (!snap.exists()) {
          batch.set(settingsRef, {
            ...merged,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          const { createdAt: _c, updatedAt: _u, ownerId: _o, ...updateFields } = merged;
          batch.update(settingsRef, {
            ...updateFields,
            updatedAt: serverTimestamp(),
          });
        }

        const logId = generateSafeId('log');
        batch.set(doc(db, 'audit_logs', logId), {
          ownerId: uid,
          action: 'UBAH_PENGATURAN',
          entityType: 'settings',
          entityId: uid,
          customerName: '',
          loanTitle: '',
          amount: 0,
          status: 'Berhasil',
          description: `Memperbarui pengaturan usaha (${merged.businessName})`,
          timestampStr: getNowAuditString(),
          createdAt: serverTimestamp(),
        });

        await batch.commit();
        showToast('Pengaturan berhasil disimpan.', 'success');
      } catch (err) {
        showToast('Gagal menyimpan pengaturan. Periksa koneksi Anda.', 'error');
        handleFirestoreError(err, OperationType.WRITE, `settings/${uid}`);
      }
    },
    [user, settings, queueIfOffline, showToast]
  );

  const addCustomer = useCallback(
    async (input: {
      name: string;
      phone: string;
      address: string;
      photoUrl: string;
      notes: string;
      status: 'aktif' | 'nonaktif';
    }): Promise<string> => {
      if (!user) throw new Error('Belum login');
      const uid = user.uid;
      const customerId = generateSafeId('cust');
      const nextNum = allCustomers.length + 1;
      const code = `NSB-${String(nextNum).padStart(3, '0')}`;

      const cleanName = input.name.trim().slice(0, 150);
      const cleanPhone = input.phone.trim().slice(0, 30);

      queueIfOffline(`Menambah nasabah ${cleanName}`);
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'customers', customerId), {
          ownerId: uid,
          code,
          name: cleanName,
          phone: cleanPhone,
          address: input.address.trim().slice(0, 500),
          photoUrl: (input.photoUrl || '').slice(0, 500000),
          notes: input.notes.trim().slice(0, 1000),
          status: input.status,
          isDeleted: false,
          createdDate: getTodayDateStr(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const logId = generateSafeId('log');
        batch.set(doc(db, 'audit_logs', logId), {
          ownerId: uid,
          action: 'TAMBAH_NASABAH',
          entityType: 'customer',
          entityId: customerId,
          customerName: cleanName,
          loanTitle: '',
          amount: 0,
          status: 'Berhasil',
          description: `Menambah nasabah baru: ${cleanName} (${code})`,
          timestampStr: getNowAuditString(),
          createdAt: serverTimestamp(),
        });

        await batch.commit();
        showToast(`Nasabah ${cleanName} berhasil ditambahkan.`, 'success');
        return customerId;
      } catch (err) {
        showToast('Gagal menyimpan data nasabah.', 'error');
        handleFirestoreError(
          err,
          OperationType.CREATE,
          `customers/${customerId}`
        );
      }
    },
    [user, allCustomers.length, queueIfOffline, showToast]
  );

  const updateCustomer = useCallback(
    async (
      customerId: string,
      input: {
        name: string;
        phone: string;
        address: string;
        photoUrl: string;
        notes: string;
        status: 'aktif' | 'nonaktif';
      }
    ) => {
      if (!user) return;
      const uid = user.uid;
      const cleanName = input.name.trim().slice(0, 150);
      const cleanPhone = input.phone.trim().slice(0, 30);

      queueIfOffline(`Memperbarui nasabah ${cleanName}`);
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'customers', customerId), {
          name: cleanName,
          phone: cleanPhone,
          address: input.address.trim().slice(0, 500),
          photoUrl: (input.photoUrl || '').slice(0, 500000),
          notes: input.notes.trim().slice(0, 1000),
          status: input.status,
          updatedAt: serverTimestamp(),
        });

        const logId = generateSafeId('log');
        batch.set(doc(db, 'audit_logs', logId), {
          ownerId: uid,
          action: 'EDIT_NASABAH',
          entityType: 'customer',
          entityId: customerId,
          customerName: cleanName,
          loanTitle: '',
          amount: 0,
          status: 'Berhasil',
          description: `Memperbarui data nasabah: ${cleanName}`,
          timestampStr: getNowAuditString(),
          createdAt: serverTimestamp(),
        });

        await batch.commit();
        showToast(`Data nasabah ${cleanName} berhasil diperbarui.`, 'success');
      } catch (err) {
        showToast('Gagal memperbarui data nasabah.', 'error');
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `customers/${customerId}`
        );
      }
    },
    [user, queueIfOffline, showToast]
  );

  const softDeleteCustomer = useCallback(
    async (customerId: string) => {
      if (!user) return;
      const cust = allCustomers.find((c) => c.id === customerId);
      if (!cust) return;
      const hasActiveLoan = loans.some(
        (l) => l.customerId === customerId && l.status === 'aktif'
      );
      if (hasActiveLoan) {
        showToast(
          'Nasabah masih memiliki kredit/pinjaman aktif dan tidak dapat dihapus.',
          'error'
        );
        return;
      }

      queueIfOffline(`Menonaktifkan nasabah ${cust.name}`);
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'customers', customerId), {
          isDeleted: true,
          status: 'nonaktif',
          updatedAt: serverTimestamp(),
        });

        const logId = generateSafeId('log');
        batch.set(doc(db, 'audit_logs', logId), {
          ownerId: user.uid,
          action: 'HAPUS_NASABAH',
          entityType: 'customer',
          entityId: customerId,
          customerName: cust.name,
          loanTitle: '',
          amount: 0,
          status: 'Berhasil',
          description: `Menghapus (soft delete) nasabah: ${cust.name}`,
          timestampStr: getNowAuditString(),
          createdAt: serverTimestamp(),
        });

        await batch.commit();
        showToast(`Nasabah ${cust.name} telah diarsipkan.`, 'info');
      } catch (err) {
        showToast('Gagal mengarsipkan nasabah.', 'error');
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `customers/${customerId}`
        );
      }
    },
    [user, allCustomers, loans, queueIfOffline, showToast]
  );

  const createLoanWithSchedule = useCallback(
    async (input: {
      customerId: string;
      type: LoanType;
      itemName: string;
      itemCategory: string;
      itemPrice: number;
      downPayment: number;
      interestRate: number;
      interestAmount: number;
      tenor: number;
      period: PaymentPeriod;
      startDate: string;
      firstDueDate: string;
      notes: string;
      photoUrl: string;
    }): Promise<string> => {
      if (!user) throw new Error('Belum login');
      const uid = user.uid;
      const customer = allCustomers.find((c) => c.id === input.customerId);
      if (!customer) {
        showToast('Pilih nasabah yang valid terlebih dahulu.', 'error');
        throw new Error('Nasabah tidak ditemukan');
      }

      const fin = calculateLoanFinancials({
        itemPrice: input.itemPrice,
        downPayment: input.type === 'barang' ? input.downPayment : 0,
        interestAmount: input.interestAmount,
        tenor: input.tenor,
        roundingRule: settings.roundingRule,
      });

      const dueDates = generateDueDates(
        input.firstDueDate,
        input.tenor,
        input.period
      );

      const loanId = generateSafeId('loan');
      const nextNum = allLoans.length + 1;
      const prefix = input.type === 'barang' ? 'KRD' : 'PNJ';
      const code = `${prefix}-${String(nextNum).padStart(3, '0')}`;
      const cleanItemName =
        input.type === 'barang'
          ? input.itemName.trim().slice(0, 200)
          : (input.itemName.trim() || 'Pinjaman Uang Tunai').slice(0, 200);
      const cleanCategory =
        input.type === 'barang'
          ? (input.itemCategory.trim() || 'Barang').slice(0, 100)
          : 'Pinjaman Uang';

      queueIfOffline(`Membuat ${prefix} ${cleanItemName} (${customer.name})`);
      try {
        const batch = writeBatch(db);

        batch.set(doc(db, 'loans', loanId), {
          ownerId: uid,
          code,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          type: input.type,
          itemName: cleanItemName,
          itemCategory: cleanCategory,
          itemPrice: Math.round(input.itemPrice),
          downPayment:
            input.type === 'barang' ? Math.round(input.downPayment) : 0,
          principalAmount: fin.principalAmount,
          interestRate: Number(input.interestRate) || 0,
          interestAmount: fin.interestAmount,
          totalObligation: fin.totalObligation,
          tenor: Math.round(input.tenor),
          period: input.period,
          installmentAmount: fin.installmentAmount,
          paidAmount: 0,
          remainingBalance: fin.totalObligation,
          startDate: input.startDate,
          firstDueDate: input.firstDueDate,
          status: 'aktif',
          notes: input.notes.trim().slice(0, 1000),
          photoUrl: (input.photoUrl || '').slice(0, 500000),
          isDeleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        for (let i = 0; i < dueDates.length; i++) {
          const instId = `${loanId}_inst_${i + 1}`;
          const instAmount = fin.scheduleAmounts[i];
          batch.set(doc(db, 'installments', instId), {
            ownerId: uid,
            loanId,
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
            loanType: input.type,
            loanItemName: cleanItemName,
            installmentNumber: i + 1,
            dueDate: dueDates[i],
            amount: instAmount,
            paidAmount: 0,
            remainingAmount: instAmount,
            status: 'belum_bayar',
            paidAt: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        const logId = generateSafeId('log');
        batch.set(doc(db, 'audit_logs', logId), {
          ownerId: uid,
          action: input.type === 'barang' ? 'BUAT_KREDIT' : 'BUAT_PINJAMAN',
          entityType: 'loan',
          entityId: loanId,
          customerName: customer.name,
          loanTitle: cleanItemName,
          amount: fin.totalObligation,
          status: 'Berhasil',
          description: `${
            input.type === 'barang' ? 'Kredit Barang' : 'Pinjaman Uang'
          }: ${cleanItemName} - Total Kewajiban ${formatRupiah(
            fin.totalObligation
          )} (${input.tenor}x angsuran)`,
          timestampStr: getNowAuditString(),
          createdAt: serverTimestamp(),
        });

        await batch.commit();
        showToast(
          `${
            input.type === 'barang' ? 'Kredit barang' : 'Pinjaman uang'
          } berhasil disimpan beserta ${input.tenor} jadwal angsuran.`,
          'success'
        );
        return loanId;
      } catch (err) {
        showToast(
          'Gagal menyimpan transaksi kredit/pinjaman. Periksa koneksi internet dan coba lagi.',
          'error'
        );
        handleFirestoreError(err, OperationType.CREATE, `loans/${loanId}`);
      }
    },
    [
      user,
      allCustomers,
      allLoans.length,
      settings.roundingRule,
      queueIfOffline,
      showToast,
    ]
  );

  const recordPayment = useCallback(
    async (input: {
      loanId: string;
      installmentId: string;
      amount: number;
      paymentDate: string;
      method: 'tunai' | 'transfer' | 'lainnya';
      notes: string;
    }): Promise<Payment> => {
      if (!user) throw new Error('Belum login');
      const uid = user.uid;
      const loan = allLoans.find((l) => l.id === input.loanId);
      const inst = allInstallments.find((i) => i.id === input.installmentId);
      if (!loan || !inst) {
        showToast('Data kredit atau angsuran tidak ditemukan.', 'error');
        throw new Error('Data tidak valid');
      }

      const payAmount = Math.round(input.amount);
      if (payAmount <= 0) {
        showToast('Jumlah pembayaran harus lebih besar dari Rp0.', 'error');
        throw new Error('Nominal tidak valid');
      }
      if (payAmount > inst.remainingAmount) {
        showToast(
          `Jumlah pembayaran melebihi sisa tagihan angsuran ke-${
            inst.installmentNumber
          } (${formatRupiah(inst.remainingAmount)}).`,
          'error'
        );
        throw new Error('Melebihi sisa tagihan angsuran');
      }

      const paymentId = generateSafeId('pay');
      const nextNum = allPayments.length + 1;
      const code = `PAY-${String(nextNum).padStart(4, '0')}`;

      const newInstPaid = inst.paidAmount + payAmount;
      const newInstRemaining = Math.max(0, inst.amount - newInstPaid);
      const newInstStatus =
        newInstRemaining <= 0
          ? 'lunas'
          : newInstPaid > 0
          ? 'sebagian'
          : 'belum_bayar';

      const newLoanPaid = loan.paidAmount + payAmount;
      const newLoanRemaining = Math.max(0, loan.totalObligation - newLoanPaid);
      const newLoanStatus = newLoanRemaining <= 0 ? 'lunas' : 'aktif';

      const newPaymentObj: Payment = {
        id: paymentId,
        ownerId: uid,
        code,
        loanId: loan.id,
        installmentId: inst.id,
        installmentNumber: inst.installmentNumber,
        customerId: loan.customerId,
        customerName: loan.customerName,
        loanType: loan.type,
        loanItemName: loan.itemName,
        amount: payAmount,
        paymentDate: input.paymentDate || getTodayDateStr(),
        method: input.method,
        status: 'valid',
        voidReason: '',
        voidedAt: '',
        notes: input.notes.trim().slice(0, 1000),
      };

      queueIfOffline(
        `Pembayaran ${formatRupiah(payAmount)} - ${loan.customerName}`
      );
      try {
        const batch = writeBatch(db);

        const { id: _id, ...paymentDocData } = newPaymentObj;
        batch.set(doc(db, 'payments', paymentId), {
          ...paymentDocData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.update(doc(db, 'installments', inst.id), {
          paidAmount: newInstPaid,
          remainingAmount: newInstRemaining,
          status: newInstStatus,
          paidAt: input.paymentDate || getTodayDateStr(),
          updatedAt: serverTimestamp(),
        });

        batch.update(doc(db, 'loans', loan.id), {
          paidAmount: newLoanPaid,
          remainingBalance: newLoanRemaining,
          status: newLoanStatus,
          updatedAt: serverTimestamp(),
        });

        const logId = generateSafeId('log');
        batch.set(doc(db, 'audit_logs', logId), {
          ownerId: uid,
          action: 'PEMBAYARAN',
          entityType: 'payment',
          entityId: paymentId,
          customerName: loan.customerName,
          loanTitle: loan.itemName,
          amount: payAmount,
          status: 'Berhasil',
          description: `Pembayaran ${formatRupiah(payAmount)} (Angsuran ke-${
            inst.installmentNumber
          }) - ${loan.itemName}`,
          timestampStr: getNowAuditString(),
          createdAt: serverTimestamp(),
        });

        await batch.commit();
        showToast('Pembayaran berhasil disimpan.', 'success');
        return newPaymentObj;
      } catch (err) {
        showToast(
          'Pembayaran belum tersimpan. Periksa koneksi internet dan coba lagi.',
          'error'
        );
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `payments/${paymentId}`
        );
      }
    },
    [
      user,
      allLoans,
      allInstallments,
      allPayments.length,
      queueIfOffline,
      showToast,
    ]
  );

  const voidPayment = useCallback(
    async (paymentId: string, reason: string) => {
      if (!user) return;
      const uid = user.uid;
      const cleanReason = reason.trim().slice(0, 500);
      if (cleanReason.length < 3) {
        showToast(
          'Alasan koreksi/void wajib diisi minimal 3 karakter.',
          'error'
        );
        return;
      }

      const payment = allPayments.find((p) => p.id === paymentId);
      if (!payment || payment.status === 'void') {
        showToast('Transaksi pembayaran tidak valid atau sudah di-void.', 'error');
        return;
      }

      const inst = allInstallments.find((i) => i.id === payment.installmentId);
      const loan = allLoans.find((l) => l.id === payment.loanId);
      if (!inst || !loan) {
        showToast('Data angsuran atau kredit terkait tidak ditemukan.', 'error');
        return;
      }

      const revInstPaid = Math.max(0, inst.paidAmount - payment.amount);
      const revInstRemaining = Math.max(0, inst.amount - revInstPaid);
      const revInstStatus =
        revInstRemaining <= 0
          ? 'lunas'
          : revInstPaid > 0
          ? 'sebagian'
          : 'belum_bayar';

      const revLoanPaid = Math.max(0, loan.paidAmount - payment.amount);
      const revLoanRemaining = Math.max(
        0,
        loan.totalObligation - revLoanPaid
      );
      const revLoanStatus = revLoanRemaining <= 0 ? 'lunas' : 'aktif';

      queueIfOffline(`Void pembayaran ${payment.code}`);
      try {
        const batch = writeBatch(db);

        batch.update(doc(db, 'payments', payment.id), {
          status: 'void',
          voidReason: cleanReason,
          voidedAt: getNowAuditString(),
          updatedAt: serverTimestamp(),
        });

        batch.update(doc(db, 'installments', inst.id), {
          paidAmount: revInstPaid,
          remainingAmount: revInstRemaining,
          status: revInstStatus,
          paidAt: revInstPaid > 0 ? inst.paidAt : '',
          updatedAt: serverTimestamp(),
        });

        batch.update(doc(db, 'loans', loan.id), {
          paidAmount: revLoanPaid,
          remainingBalance: revLoanRemaining,
          status: revLoanStatus,
          updatedAt: serverTimestamp(),
        });

        const logId = generateSafeId('log');
        batch.set(doc(db, 'audit_logs', logId), {
          ownerId: uid,
          action: 'VOID_PEMBAYARAN',
          entityType: 'payment',
          entityId: payment.id,
          customerName: payment.customerName,
          loanTitle: payment.loanItemName,
          amount: payment.amount,
          status: 'Void',
          description: `Koreksi/Void pembayaran ${
            payment.code
          } sebesar ${formatRupiah(payment.amount)}. Alasan: ${cleanReason}`,
          timestampStr: getNowAuditString(),
          createdAt: serverTimestamp(),
        });

        await batch.commit();
        showToast(
          `Pembayaran ${payment.code} berhasil di-void dan saldo hutang diperbarui.`,
          'info'
        );
      } catch (err) {
        showToast('Gagal melakukan koreksi/void pembayaran.', 'error');
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `payments/${payment.id}`
        );
      }
    },
    [user, allPayments, allInstallments, allLoans, queueIfOffline, showToast]
  );

  const recordExportLog = useCallback(
    async (format: string, reportTitle: string) => {
      if (!user) return;
      try {
        const logId = generateSafeId('log');
        await setDoc(doc(db, 'audit_logs', logId), {
          ownerId: user.uid,
          action: 'EXPORT_DATA',
          entityType: 'data',
          entityId: logId,
          customerName: '',
          loanTitle: reportTitle.slice(0, 200),
          amount: 0,
          status: 'Info',
          description: `Export laporan ${reportTitle} ke format ${format}`,
          timestampStr: getNowAuditString(),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('Export log error:', err);
      }
    },
    [user]
  );

  const recordBackupLog = useCallback(async () => {
    if (!user) return;
    try {
      const logId = generateSafeId('log');
      await setDoc(doc(db, 'audit_logs', logId), {
        ownerId: user.uid,
        action: 'BACKUP_DATA',
        entityType: 'data',
        entityId: logId,
        customerName: '',
        loanTitle: '',
        amount: 0,
        status: 'Berhasil',
        description: `Backup seluruh data usaha ke file JSON (${customers.length} nasabah, ${loans.length} kredit/pinjaman)`,
        timestampStr: getNowAuditString(),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Backup log error:', err);
    }
  }, [user, customers.length, loans.length]);

  const restoreBackupData = useCallback(
    async (backupJson: {
      settings?: Partial<AppSettings>;
      customers?: Customer[];
      loans?: Loan[];
      installments?: Installment[];
      payments?: Payment[];
    }) => {
      if (!user) return;
      const uid = user.uid;

      try {
        // Step 1: Restore settings & customers
        const batch1 = writeBatch(db);
        if (backupJson.settings) {
          const def = getDefaultSettings(uid, user.displayName || 'Pemilik');
          const s = backupJson.settings;
          batch1.set(doc(db, 'settings', uid), {
            ...def,
            businessName: (s.businessName || def.businessName).slice(0, 150),
            ownerName: (s.ownerName || def.ownerName).slice(0, 150),
            whatsappNumber: (s.whatsappNumber || '').slice(0, 30),
            businessAddress: (s.businessAddress || '').slice(0, 500),
            businessLogoUrl: (s.businessLogoUrl || '').slice(0, 500000),
            defaultInterestRate: Number(s.defaultInterestRate ?? 10),
            defaultTenor: Math.round(Number(s.defaultTenor ?? 6)),
            defaultPeriod: s.defaultPeriod || 'bulanan',
            roundingRule: s.roundingRule || '1000',
            notifH7: Boolean(s.notifH7 ?? true),
            notifH3: Boolean(s.notifH3 ?? true),
            notifH1: Boolean(s.notifH1 ?? true),
            notifHariH: Boolean(s.notifHariH ?? true),
            notifOverdue: Boolean(s.notifOverdue ?? true),
            pushEnabled: Boolean(s.pushEnabled ?? false),
            waTemplateDue: (s.waTemplateDue || def.waTemplateDue).slice(0, 2000),
            waTemplateOverdue: (
              s.waTemplateOverdue || def.waTemplateOverdue
            ).slice(0, 2000),
            waTemplatePaid: (s.waTemplatePaid || def.waTemplatePaid).slice(
              0,
              2000
            ),
            ownerId: uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        for (const c of backupJson.customers || []) {
          if (!c.id) continue;
          batch1.set(doc(db, 'customers', c.id), {
            ownerId: uid,
            code: (c.code || 'NSB-001').slice(0, 50),
            name: (c.name || 'Nasabah').slice(0, 150),
            phone: (c.phone || '08123456789').slice(0, 30),
            address: (c.address || '').slice(0, 500),
            photoUrl: (c.photoUrl || '').slice(0, 500000),
            notes: (c.notes || '').slice(0, 1000),
            status: c.status === 'nonaktif' ? 'nonaktif' : 'aktif',
            isDeleted: Boolean(c.isDeleted),
            createdDate: (c.createdDate || getTodayDateStr()).slice(0, 64),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await batch1.commit();

        // Step 2: Restore loans
        const batch2 = writeBatch(db);
        for (const l of backupJson.loans || []) {
          if (!l.id || !l.customerId) continue;
          batch2.set(doc(db, 'loans', l.id), {
            ownerId: uid,
            code: (l.code || 'KRD-001').slice(0, 50),
            customerId: l.customerId,
            customerName: (l.customerName || 'Nasabah').slice(0, 150),
            customerPhone: (l.customerPhone || '08123456789').slice(0, 30),
            type: l.type === 'uang' ? 'uang' : 'barang',
            itemName: (l.itemName || 'Transaksi').slice(0, 200),
            itemCategory: (l.itemCategory || 'Umum').slice(0, 100),
            itemPrice: Math.max(0, Math.round(Number(l.itemPrice) || 0)),
            downPayment: Math.max(0, Math.round(Number(l.downPayment) || 0)),
            principalAmount: Math.max(
              0,
              Math.round(Number(l.principalAmount) || 0)
            ),
            interestRate: Math.max(0, Number(l.interestRate) || 0),
            interestAmount: Math.max(
              0,
              Math.round(Number(l.interestAmount) || 0)
            ),
            totalObligation: Math.max(
              0,
              Math.round(Number(l.totalObligation) || 0)
            ),
            tenor: Math.max(1, Math.min(360, Math.round(Number(l.tenor) || 1))),
            period: l.period || 'bulanan',
            installmentAmount: Math.max(
              0,
              Math.round(Number(l.installmentAmount) || 0)
            ),
            paidAmount: Math.max(0, Math.round(Number(l.paidAmount) || 0)),
            remainingBalance: Math.max(
              0,
              Math.round(Number(l.remainingBalance) || 0)
            ),
            startDate: (l.startDate || getTodayDateStr()).slice(0, 64),
            firstDueDate: (l.firstDueDate || getTodayDateStr()).slice(0, 64),
            status:
              l.status === 'lunas'
                ? 'lunas'
                : l.status === 'dibatalkan'
                ? 'dibatalkan'
                : 'aktif',
            notes: (l.notes || '').slice(0, 1000),
            photoUrl: (l.photoUrl || '').slice(0, 500000),
            isDeleted: Boolean(l.isDeleted),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await batch2.commit();

        // Step 3: Restore installments & payments
        const batch3 = writeBatch(db);
        for (const inst of backupJson.installments || []) {
          if (!inst.id || !inst.loanId || !inst.customerId) continue;
          batch3.set(doc(db, 'installments', inst.id), {
            ownerId: uid,
            loanId: inst.loanId,
            customerId: inst.customerId,
            customerName: (inst.customerName || 'Nasabah').slice(0, 150),
            customerPhone: (inst.customerPhone || '08123456789').slice(0, 30),
            loanType: inst.loanType === 'uang' ? 'uang' : 'barang',
            loanItemName: (inst.loanItemName || 'Transaksi').slice(0, 200),
            installmentNumber: Math.max(
              1,
              Math.min(360, Math.round(Number(inst.installmentNumber) || 1))
            ),
            dueDate: (inst.dueDate || getTodayDateStr()).slice(0, 64),
            amount: Math.max(0, Math.round(Number(inst.amount) || 0)),
            paidAmount: Math.max(0, Math.round(Number(inst.paidAmount) || 0)),
            remainingAmount: Math.max(
              0,
              Math.round(Number(inst.remainingAmount) || 0)
            ),
            status: inst.status || 'belum_bayar',
            paidAt: (inst.paidAt || '').slice(0, 64),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        for (const p of backupJson.payments || []) {
          if (!p.id || !p.loanId || !p.installmentId || !p.customerId) continue;
          batch3.set(doc(db, 'payments', p.id), {
            ownerId: uid,
            code: (p.code || 'PAY-0001').slice(0, 50),
            loanId: p.loanId,
            installmentId: p.installmentId,
            installmentNumber: Math.max(
              1,
              Math.min(360, Math.round(Number(p.installmentNumber) || 1))
            ),
            customerId: p.customerId,
            customerName: (p.customerName || 'Nasabah').slice(0, 150),
            loanType: p.loanType === 'uang' ? 'uang' : 'barang',
            loanItemName: (p.loanItemName || 'Transaksi').slice(0, 200),
            amount: Math.max(1, Math.round(Number(p.amount) || 1)),
            paymentDate: (p.paymentDate || getTodayDateStr()).slice(0, 64),
            method: p.method || 'tunai',
            status: p.status === 'void' ? 'void' : 'valid',
            voidReason: (p.voidReason || '').slice(0, 500),
            voidedAt: (p.voidedAt || '').slice(0, 64),
            notes: (p.notes || '').slice(0, 1000),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        const logId = generateSafeId('log');
        batch3.set(doc(db, 'audit_logs', logId), {
          ownerId: uid,
          action: 'RESTORE_DATA',
          entityType: 'data',
          entityId: logId,
          customerName: '',
          loanTitle: '',
          amount: 0,
          status: 'Berhasil',
          description: `Restore data dari file backup JSON (${
            (backupJson.customers || []).length
          } nasabah, ${(backupJson.loans || []).length} transaksi)`,
          timestampStr: getNowAuditString(),
          createdAt: serverTimestamp(),
        });

        await batch3.commit();
        showToast('Data backup berhasil dipulihkan ke cloud!', 'success');
      } catch (err) {
        console.error('Restore error:', err);
        showToast(
          'Gagal memulihkan data backup. Pastikan format file JSON valid.',
          'error'
        );
      }
    },
    [user, showToast]
  );

  const value: AppContextValue = {
    user,
    authLoading,
    dataLoading,
    isOnline,
    hasPendingWrites,
    offlineQueue,
    activeTab,
    setActiveTab,
    paymentTarget,
    clearPaymentTarget,
    navigateToPayment,
    selectedCustomerForLoan,
    setSelectedCustomerForLoan,
    settings,
    customers,
    loans,
    installments,
    payments,
    notifications,
    auditLogs,
    toasts,
    showToast,
    dismissToast,
    microPopup,
    triggerMicroPopup,
    loginWithGoogle,
    logout,
    saveSettings,
    addCustomer,
    updateCustomer,
    softDeleteCustomer,
    createLoanWithSchedule,
    recordPayment,
    voidPayment,
    recordExportLog,
    recordBackupLog,
    restoreBackupData,
    notificationPermission,
    requestNotificationPermission,
    sendBrowserNotification,
    dueAlerts,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
