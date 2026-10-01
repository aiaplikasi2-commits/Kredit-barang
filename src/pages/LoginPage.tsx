import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Cloud,
  Download,
  Lock,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  FALLBACK_DRIVE_ICON_URL,
  OFFICIAL_ICON_URL,
} from '../utils/formatters';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, microPopup } = useApp();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [submitting, setSubmitting] = useState(false);
  const [showQuickGuide, setShowQuickGuide] = useState(false);

  const handleLogin = async () => {
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6">
      {/* Global Micro Pop-up on Button Tap */}
      {microPopup && (
        <div
          key={microPopup.id}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-bounce"
        >
          <div className="bg-slate-900/95 text-white text-xs font-medium px-3.5 py-1.5 rounded-full shadow-lg border border-slate-700 flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            <span>{microPopup.label}</span>
          </div>
        </div>
      )}

      <div className="max-w-md w-full mx-auto my-auto pt-4 pb-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 text-center">
          {/* Official App Icon */}
          <div className="relative mx-auto w-24 h-24 rounded-3xl overflow-hidden shadow-md border border-slate-200 bg-teal-50 flex items-center justify-center">
            <img
              src={OFFICIAL_ICON_URL}
              onError={(e) => {
                const img = e.currentTarget;
                if (img.src !== FALLBACK_DRIVE_ICON_URL) {
                  img.src = FALLBACK_DRIVE_ICON_URL;
                }
              }}
              alt="Ikon Aplikasi KreditKu"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            KreditKu
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            Buku kredit digital modern untuk pemilik usaha{' '}
            <strong className="text-slate-900">Kredit Barang</strong> &{' '}
            <strong className="text-slate-900">Pinjaman Uang</strong>.
          </p>

          {/* Google Login CTA */}
          <div className="mt-6 space-y-3">
            <button
              type="button"
              data-popup="Login dengan Akun Google"
              disabled={submitting}
              onClick={handleLogin}
              className="w-full min-h-[52px] px-5 py-3.5 rounded-2xl bg-slate-900 text-white font-semibold text-sm flex items-center justify-center gap-3 shadow-sm hover:bg-slate-800 active:scale-[0.99] transition disabled:opacity-60"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                />
              </svg>
              <span>
                {submitting
                  ? 'Memverifikasi Akun Google...'
                  : 'Masuk dengan Google / Gmail'}
              </span>
            </button>

            {!isInstalled && isInstallable && (
              <button
                type="button"
                data-popup="Install Aplikasi KreditKu ke HP"
                onClick={install}
                className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-teal-50 text-teal-800 border border-teal-200 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-teal-100 transition"
              >
                <Download className="w-4 h-4" />
                <span>Install Aplikasi KreditKu ke Layar Utama HP</span>
              </button>
            )}

            <button
              type="button"
              data-popup="Lihat Panduan Singkat"
              onClick={() => setShowQuickGuide((prev) => !prev)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <BookOpen className="w-4 h-4 text-teal-700" />
              <span>
                {showQuickGuide
                  ? 'Tutup Panduan Singkat'
                  : 'Lihat Panduan Penggunaan (16 Langkah)'}
              </span>
            </button>
          </div>

          {/* Key Security & Sync Highlights */}
          <div className="mt-6 pt-6 border-t border-slate-100 text-left space-y-3 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <Cloud className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">
                  Tersimpan Online di Cloud:
                </strong>{' '}
                Data aman walaupun HP rusak atau ganti HP baru. Cukup login
                dengan Gmail yang sama.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Data Terpisah & Aman:</strong>{' '}
                Setiap akun Google memiliki ruang penyimpanan pribadi yang
                terisolasi dengan Security Rules.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">
                  Siap Di-install di Android:
                </strong>{' '}
                Mendukung PWA layar penuh, pengingat jatuh tempo, dan kirim
                tagihan WhatsApp otomatis.
              </div>
            </div>
          </div>

          {showQuickGuide && (
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-700 space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-700" />
                Ringkasan Alur Penggunaan KreditKu:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-600">
                <li>Login menggunakan akun Google / Gmail pemilik usaha.</li>
                <li>Atur nama usaha & template WA di menu Pengaturan.</li>
                <li>Tambahkan data Nasabah (Nama, No HP, Alamat).</li>
                <li>
                  Buat transaksi Kredit Barang atau Pinjaman Uang (jadwal
                  angsuran dibuat otomatis).
                </li>
                <li>
                  Pantau tagihan di menu Jatuh Tempo & kirim pengingat via
                  WhatsApp.
                </li>
                <li>
                  Catat pembayaran cicilan di menu Pembayaran & unduh laporan
                  Excel/CSV/PDF kapan saja.
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* Footer Attribution */}
      <footer className="text-center text-xs text-slate-500 pb-2">
        <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-1">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>Keamanan Cloud Firestore & Google Auth</span>
        </div>
        <a
          href="https://wa.me/628179015181?text=Halo%20Jamhur,%20saya%20pengguna%20aplikasi%20KreditKu"
          target="_blank"
          rel="noopener noreferrer"
          data-popup="Hubungi Jamhur via WhatsApp (08179015181)"
          className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:text-teal-800 hover:underline py-1 px-2"
        >
          Created by Jamhur (WA: 08179015181)
        </a>
      </footer>
    </div>
  );
};
