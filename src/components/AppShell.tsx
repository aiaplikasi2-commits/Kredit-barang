import React, { useState } from 'react';
import {
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Download,
  FileSpreadsheet,
  History,
  Home,
  Menu,
  Package,
  Settings,
  Smartphone,
  Users,
  Wifi,
  WifiOff,
  X,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ActiveTab } from '../types';
import {
  FALLBACK_DRIVE_ICON_URL,
  OFFICIAL_ICON_URL,
} from '../utils/formatters';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    activeTab,
    setActiveTab,
    settings,
    isOnline,
    hasPendingWrites,
    offlineQueue,
    toasts,
    dismissToast,
    microPopup,
    dueAlerts,
  } = useApp();

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);

  const mainNavItems: {
    id: ActiveTab;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'customers', label: 'Nasabah', icon: Users },
    { id: 'loans', label: 'Kredit', icon: Package },
    { id: 'payments', label: 'Pembayaran', icon: CreditCard },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  const secondaryNavItems: {
    id: ActiveTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }[] = [
    {
      id: 'duedates',
      label: 'Jatuh Tempo',
      icon: CalendarClock,
      badge: dueAlerts.length,
    },
    { id: 'reports', label: 'Laporan', icon: FileSpreadsheet },
    { id: 'history', label: 'Riwayat & Audit', icon: History },
    { id: 'guide', label: 'Panduan', icon: BookOpen },
  ];

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setInstallGuideOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col pb-24">
      {/* Global Micro Pop-up on EVERY Button Tap */}
      {microPopup && (
        <div
          key={microPopup.id}
          className="fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none no-print animate-bounce"
        >
          <div className="bg-slate-900/95 text-white text-xs font-medium px-3.5 py-1.5 rounded-full shadow-lg border border-slate-700 flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            <span>{microPopup.label}</span>
          </div>
        </div>
      )}

      {/* Action Toasts */}
      <div className="fixed top-20 right-3 left-3 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none no-print">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 px-4 py-3 rounded-2xl shadow-lg border text-xs sm:text-sm font-medium ${
              t.type === 'success'
                ? 'bg-emerald-950 text-emerald-50 border-emerald-700'
                : t.type === 'error'
                ? 'bg-rose-950 text-rose-50 border-rose-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {t.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : t.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Bell className="w-4 h-4 text-teal-400 shrink-0" />
              )}
              <span>{t.text}</span>
            </div>
            <button
              type="button"
              data-popup="Tutup Notifikasi"
              onClick={() => dismissToast(t.id)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Sticky Top App Bar (Mobile-First) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 no-print">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          {/* Brand Zone */}
          <button
            type="button"
            data-popup="Beranda KreditKu"
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 text-left min-w-0 py-1"
          >
            <img
              src={settings.businessLogoUrl || OFFICIAL_ICON_URL}
              onError={(e) => {
                const img = e.currentTarget;
                if (img.src !== FALLBACK_DRIVE_ICON_URL) {
                  img.src = FALLBACK_DRIVE_ICON_URL;
                }
              }}
              alt="KreditKu"
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0 bg-teal-50"
            />
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate">
                {settings.businessName || 'KreditKu'}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                {isOnline ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <span>🟢 Online</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                    <span>🔴 Offline</span>
                  </span>
                )}
                {(hasPendingWrites || offlineQueue.length > 0) && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Menunggu sinkronisasi
                    </span>
                  </>
                )}
              </div>
            </div>
          </button>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isInstalled && (
              <button
                type="button"
                data-popup="Install Aplikasi KreditKu"
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 active:scale-95 transition min-h-[40px]"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Install</span>
              </button>
            )}

            <button
              type="button"
              data-popup="Buka Jatuh Tempo"
              onClick={() => setActiveTab('duedates')}
              className={`relative min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl border transition ${
                activeTab === 'duedates'
                  ? 'bg-teal-50 border-teal-600 text-teal-700'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              aria-label="Jatuh Tempo"
            >
              <Bell className="w-4 h-4" />
              {dueAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {dueAlerts.length > 99 ? '99+' : dueAlerts.length}
                </span>
              )}
            </button>

            <button
              type="button"
              data-popup="Menu Lainnya"
              onClick={() => setDrawerOpen((prev) => !prev)}
              className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"
              aria-label="Menu Lainnya"
            >
              {drawerOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Sub-bar quick strip for Jatuh Tempo, Laporan, Riwayat, Panduan */}
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-1.5 bg-slate-100/80 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-popup={`Menu ${item.label}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition shrink-0 ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`ml-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-white text-teal-800'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 no-print">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium">
              <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                🔴 Mode Offline aktif — Data terakhir ditampilkan & transaksi
                baru akan masuk antrean lokal lalu disinkronkan otomatis saat
                internet kembali.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Modal for Secondary Navigation & Info */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs flex justify-end no-print">
          <div className="w-72 max-w-[85vw] bg-white h-full shadow-2xl p-5 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <img
                    src={OFFICIAL_ICON_URL}
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_DRIVE_ICON_URL;
                    }}
                    alt="KreditKu"
                    className="w-8 h-8 rounded-lg"
                  />
                  <div>
                    <div className="font-bold text-sm text-slate-900">
                      Menu KreditKu
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Buku Kredit Digital
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  data-popup="Tutup Menu"
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-1">
                {[...mainNavItems, ...secondaryNavItems].map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-popup={`Buka ${item.label}`}
                      onClick={() => {
                        setActiveTab(item.id);
                        setDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition ${
                        active
                          ? 'bg-teal-700 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {!isInstalled && (
                <div className="mt-5 p-3.5 rounded-2xl bg-teal-50 border border-teal-200">
                  <div className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-teal-700" />
                    Install ke Layar Utama HP
                  </div>
                  <p className="text-[11px] text-teal-800 mt-1">
                    Pasang KreditKu di HP Android agar dapat dibuka cepat
                    seperti aplikasi biasa.
                  </p>
                  <button
                    type="button"
                    data-popup="Install Aplikasi ke HP"
                    onClick={() => {
                      setDrawerOpen(false);
                      handleInstallClick();
                    }}
                    className="mt-2.5 w-full py-2 px-3 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800"
                  >
                    Install Sekarang
                  </button>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 text-center">
              <div className="text-xs text-slate-500">
                Status Koneksi:{' '}
                <strong className="text-slate-800">
                  {isOnline ? '🟢 Online' : '🔴 Offline'}
                </strong>
              </div>
              <a
                href="https://wa.me/628179015181?text=Halo%20Jamhur,%20saya%20pengguna%20aplikasi%20KreditKu"
                target="_blank"
                rel="noopener noreferrer"
                data-popup="Hubungi Jamhur (08179015181)"
                className="mt-2 inline-block text-xs font-semibold text-teal-700 hover:underline"
              >
                Created by Jamhur (WA: 08179015181)
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Install Guide Modal when native prompt isn't triggered yet */}
      {installGuideOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <img
                src={OFFICIAL_ICON_URL}
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_DRIVE_ICON_URL;
                }}
                alt="KreditKu"
                className="w-12 h-12 rounded-2xl border border-slate-200"
              />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Install KreditKu di HP
                </h3>
                <p className="text-xs text-slate-500">
                  Progressive Web App (PWA)
                </p>
              </div>
            </div>

            {isIOS ? (
              <div className="mt-4 text-xs text-slate-700 space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <p className="font-semibold text-slate-900">
                  Cara Install di iPhone / iPad:
                </p>
                <p>
                  1. Ketuk tombol <strong>Bagikan (Share)</strong> di bagian
                  bawah browser Safari.
                </p>
                <p>
                  2. Gulir ke bawah lalu pilih{' '}
                  <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>
                  .
                </p>
              </div>
            ) : (
              <div className="mt-4 text-xs text-slate-700 space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <p className="font-semibold text-slate-900">
                  Cara Install di HP Android (Chrome):
                </p>
                <p>
                  1. Ketuk ikon <strong>Titik Tiga (⋮)</strong> di pojok kanan
                  atas browser Chrome.
                </p>
                <p>
                  2. Pilih menu <strong>Install aplikasi</strong> atau{' '}
                  <strong>Tambahkan ke Layar utama</strong>.
                </p>
                <p>
                  3. Ketuk <strong>Install</strong> — ikon{' '}
                  <strong>KreditKu</strong> akan langsung muncul di layar utama
                  HP Anda.
                </p>
              </div>
            )}

            <button
              type="button"
              data-popup="Tutup Panduan Install"
              onClick={() => setInstallGuideOpen(false)}
              className="mt-5 w-full py-3 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-6 pt-4 pb-8">
        {children}

        {/* Footer attribution on every page */}
        <footer className="mt-10 pt-6 border-t border-slate-200/80 text-center text-xs text-slate-500 space-y-1.5 no-print">
          <div className="flex items-center justify-center gap-2">
            <span>KreditKu — Buku Kredit Digital Usaha Perorangan</span>
            <span>·</span>
            <button
              type="button"
              data-popup="Buka Panduan Aplikasi"
              onClick={() => setActiveTab('guide')}
              className="text-teal-700 font-semibold hover:underline"
            >
              Panduan Penggunaan
            </button>
          </div>
          <div>
            <a
              href="https://wa.me/628179015181?text=Halo%20Jamhur,%20saya%20pengguna%20aplikasi%20KreditKu"
              target="_blank"
              rel="noopener noreferrer"
              data-popup="Chat WA Jamhur (08179015181)"
              className="inline-flex items-center gap-1.5 font-semibold text-teal-700 hover:text-teal-800 hover:underline py-1 px-2 rounded-lg"
            >
              <span>Created by Jamhur (WA: 08179015181)</span>
            </a>
          </div>
        </footer>
      </main>

      {/* Fixed Bottom Navigation Bar (5 Primary Tabs as specified in Section 22) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 no-print">
        <div className="max-w-4xl mx-auto grid grid-cols-5 h-16 px-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-popup={`Menu ${item.label}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center min-h-[48px] rounded-xl transition ${
                  active
                    ? 'text-teal-700 font-bold'
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition ${
                    active ? 'bg-teal-50 text-teal-700' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] tracking-tight mt-0.5 truncate max-w-full px-1">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
