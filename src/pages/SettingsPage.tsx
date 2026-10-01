import React, { useEffect, useState } from 'react';
import {
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  CloudDownload,
  CloudUpload,
  LogOut,
  MessageCircle,
  Save,
  Sliders,
  Smartphone,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PaymentPeriod, RoundingRule } from '../types';
import {
  compressImageFile,
  downloadBackupJSON,
  FALLBACK_DRIVE_ICON_URL,
  OFFICIAL_ICON_URL,
} from '../utils/formatters';

export const SettingsPage: React.FC = () => {
  const {
    user,
    settings,
    customers,
    loans,
    installments,
    payments,
    saveSettings,
    logout,
    recordBackupLog,
    restoreBackupData,
    notificationPermission,
    requestNotificationPermission,
    sendBrowserNotification,
    showToast,
  } = useApp();

  const { isInstallable, isInstalled, install } = usePWAInstall();

  const [businessName, setBusinessName] = useState(settings.businessName);
  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber);
  const [businessAddress, setBusinessAddress] = useState(
    settings.businessAddress
  );
  const [businessLogoUrl, setBusinessLogoUrl] = useState(
    settings.businessLogoUrl
  );

  const [defaultInterestRate, setDefaultInterestRate] = useState(
    String(settings.defaultInterestRate)
  );
  const [defaultTenor, setDefaultTenor] = useState(
    String(settings.defaultTenor)
  );
  const [defaultPeriod, setDefaultPeriod] = useState<PaymentPeriod>(
    settings.defaultPeriod
  );
  const [roundingRule, setRoundingRule] = useState<RoundingRule>(
    settings.roundingRule
  );

  const [notifH7, setNotifH7] = useState(settings.notifH7);
  const [notifH3, setNotifH3] = useState(settings.notifH3);
  const [notifH1, setNotifH1] = useState(settings.notifH1);
  const [notifHariH, setNotifHariH] = useState(settings.notifHariH);
  const [notifOverdue, setNotifOverdue] = useState(settings.notifOverdue);
  const [pushEnabled, setPushEnabled] = useState(settings.pushEnabled);

  const [waTemplateDue, setWaTemplateDue] = useState(settings.waTemplateDue);
  const [waTemplateOverdue, setWaTemplateOverdue] = useState(
    settings.waTemplateOverdue
  );
  const [waTemplatePaid, setWaTemplatePaid] = useState(settings.waTemplatePaid);

  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    setBusinessName(settings.businessName);
    setOwnerName(settings.ownerName);
    setWhatsappNumber(settings.whatsappNumber);
    setBusinessAddress(settings.businessAddress);
    setBusinessLogoUrl(settings.businessLogoUrl);
    setDefaultInterestRate(String(settings.defaultInterestRate));
    setDefaultTenor(String(settings.defaultTenor));
    setDefaultPeriod(settings.defaultPeriod);
    setRoundingRule(settings.roundingRule);
    setNotifH7(settings.notifH7);
    setNotifH3(settings.notifH3);
    setNotifH1(settings.notifH1);
    setNotifHariH(settings.notifHariH);
    setNotifOverdue(settings.notifOverdue);
    setPushEnabled(settings.pushEnabled);
    setWaTemplateDue(settings.waTemplateDue);
    setWaTemplateOverdue(settings.waTemplateOverdue);
    setWaTemplatePaid(settings.waTemplatePaid);
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 300);
      setBusinessLogoUrl(compressed);
      showToast('Logo usaha siap disimpan.', 'info');
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses logo usaha.', 'error');
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings({
        businessName,
        ownerName,
        whatsappNumber,
        businessAddress,
        businessLogoUrl,
        defaultInterestRate: parseFloat(defaultInterestRate) || 0,
        defaultTenor: parseInt(defaultTenor, 10) || 1,
        defaultPeriod,
        roundingRule,
        notifH7,
        notifH3,
        notifH1,
        notifHariH,
        notifOverdue,
        pushEnabled,
        waTemplateDue,
        waTemplateOverdue,
        waTemplatePaid,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    if (notificationPermission !== 'granted') {
      const perm = await requestNotificationPermission();
      if (perm !== 'granted') return;
    }
    const ok = await sendBrowserNotification(
      '🔔 Jatuh Tempo Hari Ini — KreditKu',
      'Budi memiliki angsuran Rp500.000 yang jatuh tempo hari ini.'
    );
    if (ok) {
      showToast('Notifikasi uji coba berhasil dikirim ke HP Anda!', 'success');
    } else {
      showToast(
        'Pastikan izin notifikasi browser Chrome diaktifkan.',
        'info'
      );
    }
  };

  const handleBackupDownload = async () => {
    if (!user) return;
    downloadBackupJSON({
      exportedAt: new Date().toISOString(),
      ownerId: user.uid,
      settings,
      customers,
      loans,
      installments,
      payments,
    });
    await recordBackupLog();
    showToast('File Backup JSON berhasil diunduh.', 'success');
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoring(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await restoreBackupData(parsed);
    } catch (err) {
      console.error(err);
      showToast('File JSON tidak valid atau gagal dipulihkan.', 'error');
    } finally {
      setRestoring(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSaveAll} className="space-y-5">
        {/* 1. PROFIL USAHA */}
        <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <Building2 className="w-5 h-5 text-teal-700" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                1. Profil Usaha
              </h2>
              <p className="text-xs text-slate-500">
                Identitas usaha yang tampil pada aplikasi dan cetakan laporan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <img
              src={businessLogoUrl || OFFICIAL_ICON_URL}
              onError={(e) => {
                e.currentTarget.src = FALLBACK_DRIVE_ICON_URL;
              }}
              alt="Logo Usaha"
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200 bg-teal-50 shrink-0"
            />
            <div className="flex-1 space-y-1.5">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer">
                <Camera className="w-4 h-4 text-teal-700" />
                <span>Ubah Logo Usaha</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
              {businessLogoUrl && (
                <button
                  type="button"
                  data-popup="Kembalikan Ikon Resmi KreditKu"
                  onClick={() => setBusinessLogoUrl('')}
                  className="ml-2 text-xs text-rose-600 font-semibold hover:underline"
                >
                  Gunakan Ikon Default KreditKu
                </button>
              )}
              <div className="text-[11px] text-slate-500">
                Akun Google Aktif: <strong>{user?.email}</strong>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Usaha *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Pemilik Usaha
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor WhatsApp Usaha
              </label>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="08123456789"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Usaha
              </label>
              <input
                type="text"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="Alamat toko / tempat usaha"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>
        </section>

        {/* 2. PENGATURAN KREDIT */}
        <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <Sliders className="w-5 h-5 text-teal-700" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                2. Pengaturan Default Kredit & Pinjaman
              </h2>
              <p className="text-xs text-slate-500">
                Nilai awal otomatis ketika membuka form tambah kredit barang /
                pinjaman uang
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Bunga (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={defaultInterestRate}
                onChange={(e) => setDefaultInterestRate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-num"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Tenor (Kali)
              </label>
              <input
                type="number"
                min="1"
                max="360"
                value={defaultTenor}
                onChange={(e) => setDefaultTenor(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-num"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Periode Pembayaran
              </label>
              <select
                value={defaultPeriod}
                onChange={(e) =>
                  setDefaultPeriod(e.target.value as PaymentPeriod)
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="bulanan">Bulanan</option>
                <option value="mingguan">Mingguan</option>
                <option value="harian">Harian</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pembulatan Angsuran
              </label>
              <select
                value={roundingRule}
                onChange={(e) =>
                  setRoundingRule(e.target.value as RoundingRule)
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="none">Tanpa Pembulatan</option>
                <option value="100">Ke Atas Rp100</option>
                <option value="500">Ke Atas Rp500</option>
                <option value="1000">Ke Atas Rp1.000</option>
              </select>
            </div>
          </div>
        </section>

        {/* 3. PENGATURAN NOTIFIKASI HP */}
        <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-teal-700" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  3. Pengaturan Notifikasi HP Android
                </h2>
                <p className="text-xs text-slate-500">
                  Pengingat cicilan jatuh tempo (H-7, H-3, H-1, Hari H, dan
                  Tunggakan)
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              Izin Browser:{' '}
              <strong
                className={
                  notificationPermission === 'granted'
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }
              >
                {notificationPermission === 'granted'
                  ? 'Aktif (Granted)'
                  : notificationPermission === 'denied'
                  ? 'Ditolak'
                  : 'Belum Diminta'}
              </strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {notificationPermission !== 'granted' && (
              <button
                type="button"
                data-popup="Minta Izin Notifikasi HP"
                onClick={requestNotificationPermission}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-teal-800"
              >
                <Bell className="w-4 h-4" />
                <span>Minta Izin Notifikasi HP</span>
              </button>
            )}
            <button
              type="button"
              data-popup="Kirim Tes Notifikasi ke HP"
              onClick={handleTestNotification}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-200"
            >
              <CheckCircle2 className="w-4 h-4 text-teal-700" />
              <span>Tes Notifikasi HP Sekarang</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            {[
              {
                label: 'Push Notification ON/OFF',
                checked: pushEnabled,
                set: setPushEnabled,
              },
              {
                label: '☑ Pengingat H-7',
                checked: notifH7,
                set: setNotifH7,
              },
              {
                label: '☑ Pengingat H-3',
                checked: notifH3,
                set: setNotifH3,
              },
              {
                label: '☑ Pengingat H-1',
                checked: notifH1,
                set: setNotifH1,
              },
              {
                label: '☑ Jatuh Tempo Hari H',
                checked: notifHariH,
                set: setNotifHariH,
              },
              {
                label: '☑ Notifikasi Tunggakan',
                checked: notifOverdue,
                set: setNotifOverdue,
              },
            ].map((item, idx) => (
              <label
                key={idx}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => item.set(e.target.checked)}
                  className="w-4 h-4 accent-teal-700 rounded"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* 4. PENGATURAN TEMPLATE WHATSAPP */}
        <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                4. Pengaturan Template WhatsApp
              </h2>
              <p className="text-xs text-slate-500">
                Placeholder otomatis:{' '}
                <code className="text-teal-800 font-mono-num">
                  {'{nama}'} {'{angsuran}'} {'{tanggal}'} {'{jenis_kredit}'}{' '}
                  {'{sisa_hutang}'} {'{jumlah_tunggakan}'}
                </code>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Template Pengingat Jatuh Tempo
              </label>
              <textarea
                rows={2}
                required
                value={waTemplateDue}
                onChange={(e) => setWaTemplateDue(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Template Tagihan Tunggakan / Terlambat
              </label>
              <textarea
                rows={2}
                required
                value={waTemplateOverdue}
                onChange={(e) => setWaTemplateOverdue(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Template Bukti Pembayaran Diterima
              </label>
              <textarea
                rows={2}
                required
                value={waTemplatePaid}
                onChange={(e) => setWaTemplatePaid(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm"
              />
            </div>
          </div>
        </section>

        <button
          type="submit"
          data-popup="Simpan Semua Pengaturan"
          disabled={saving}
          className="w-full min-h-[52px] py-3.5 rounded-2xl bg-teal-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-teal-800 active:scale-[0.99] transition disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          <span>
            {saving
              ? 'Menyimpan ke Cloud...'
              : 'Simpan Semua Pengaturan Usaha'}
          </span>
        </button>
      </form>

      {/* 5. BACKUP & RESTORE DATA + PWA INSTALL + LOGOUT */}
      <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            5. Keamanan Data, Backup JSON & Aplikasi Android
          </h2>
          <p className="text-xs text-slate-500">
            Seluruh data tersimpan otomatis di Cloud Firestore terikat pada akun{' '}
            <strong>{user?.email}</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            data-popup="Unduh Backup Data JSON"
            onClick={handleBackupDownload}
            className="min-h-[46px] px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition"
          >
            <CloudDownload className="w-4 h-4 text-teal-400" />
            <span>Backup Data (.JSON)</span>
          </button>

          <label className="min-h-[46px] px-4 py-3 rounded-2xl bg-teal-50 text-teal-900 border border-teal-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer hover:bg-teal-100 transition">
            <CloudUpload className="w-4 h-4 text-teal-700" />
            <span>
              {restoring ? 'Memulihkan Data...' : 'Restore / Import Backup JSON'}
            </span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleRestoreFile}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          {!isInstalled && isInstallable && (
            <button
              type="button"
              data-popup="Install PWA KreditKu"
              onClick={install}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>Install Aplikasi ke Layar Utama HP</span>
            </button>
          )}

          <button
            type="button"
            data-popup="Keluar / Logout Akun Google"
            onClick={logout}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-rose-100 ml-auto w-full sm:w-auto"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar dari Akun Google ({user?.email})</span>
          </button>
        </div>
      </section>
    </div>
  );
};
