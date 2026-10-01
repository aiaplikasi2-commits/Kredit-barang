import React, { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  MessageCircle,
} from 'lucide-react';

const GUIDE_ITEMS = [
  {
    num: 1,
    title: 'Cara Login dengan Google / Gmail',
    content:
      'Buka aplikasi KreditKu di browser Chrome HP Android, lalu tekan tombol "Masuk dengan Google / Gmail". Pilih akun Gmail pemilik usaha Anda. Tidak perlu membuat username atau password baru. Setiap akun Google memiliki database yang terpisah dan aman.',
  },
  {
    num: 2,
    title: 'Cara Menambah Nasabah',
    content:
      'Buka menu "Nasabah" di navigasi bawah → tekan tombol "+ Tambah Nasabah" → isi Nama Lengkap, Nomor HP/WhatsApp, Alamat, Foto (opsional), dan Catatan → tekan "Simpan Nasabah". ID Nasabah (NSB-001, dst.) akan dibuat secara otomatis.',
  },
  {
    num: 3,
    title: 'Cara Membuat Kredit Barang',
    content:
      'Buka menu "Kredit" → tekan "+ Kredit Barang" → pilih Nasabah, isi Nama Barang, Kategori, Harga Barang, Uang Muka (DP), Bunga/Keuntungan (% atau Rp), Tenor, Periode (Bulanan/Mingguan/Harian), dan Tanggal Jatuh Tempo Pertama → tekan "Simpan Transaksi". Jadwal angsuran akan dibuat otomatis.',
  },
  {
    num: 4,
    title: 'Cara Membuat Pinjaman Uang',
    content:
      'Buka menu "Kredit" → tekan "+ Pinjaman Uang" → pilih Nasabah, masukkan Jumlah Pinjaman (Rp), Bunga/Keuntungan, Tenor, Periode, Tanggal Pencairan, dan Tanggal Jatuh Tempo Pertama → tekan "Simpan Transaksi".',
  },
  {
    num: 5,
    title: 'Cara Mencatat Pembayaran',
    content:
      'Buka menu "Pembayaran" (atau tekan tombol "Bayar" langsung dari daftar Jatuh Tempo) → pilih Nasabah → pilih Kredit/Pinjaman → pilih Angsuran → masukkan nominal uang yang dibayarkan (bisa bayar penuh atau bayar sebagian) → tekan "Simpan Pembayaran". Jika terjadi salah input, gunakan tombol "Koreksi / Void" beserta alasannya.',
  },
  {
    num: 6,
    title: 'Cara Melihat Jatuh Tempo',
    content:
      'Tekan ikon lonceng di bagian atas atau menu "Jatuh Tempo". Pilih tab "HARI INI" untuk melihat daftar cicilan yang harus dibayar hari ini, atau tab "MENDATANG" (Besok, 3 Hari, 7 Hari, 30 Hari) untuk melihat cicilan yang akan datang.',
  },
  {
    num: 7,
    title: 'Cara Melihat Tunggakan',
    content:
      'Pada menu "Jatuh Tempo", pilih tab "TERLAMBAT". Sistem menampilkan nama nasabah, jumlah hari keterlambatan, nominal tagihan yang terlambat, dan total akumulasi tunggakan nasabah tersebut.',
  },
  {
    num: 8,
    title: 'Cara Menggunakan WhatsApp Otomatis',
    content:
      'Di halaman Nasabah, Jatuh Tempo, atau setelah menyimpan Pembayaran, tekan tombol hijau "Chat WhatsApp". Aplikasi akan membuka WhatsApp menuju nomor HP nasabah dengan pesan yang otomatis terisi nama, nominal angsuran, tanggal jatuh tempo, dan sisa hutang.',
  },
  {
    num: 9,
    title: 'Cara Mengaktifkan Notifikasi HP',
    content:
      'Buka menu "Pengaturan" → bagian "Pengaturan Notifikasi HP" → tekan tombol "Aktifkan Izin Notifikasi HP" dan pilih "Izinkan (Allow)" pada pop-up Chrome. Centang pengingat yang diinginkan (H-7, H-3, H-1, Hari H, Tunggakan) lalu tekan "Simpan Pengaturan".',
  },
  {
    num: 10,
    title: 'Cara Install PWA ke Layar Utama Android',
    content:
      'Tekan tombol "Install" di pojok kanan atas aplikasi (atau melalui menu titik tiga Chrome Android → "Tambahkan ke Layar utama / Install aplikasi"). Ikon resmi KreditKu akan muncul di layar utama HP Android Anda seperti aplikasi native.',
  },
  {
    num: 11,
    title: 'Cara Backup Data Usaha',
    content:
      'Buka Dashboard atau menu "Pengaturan" → bagian "Backup & Restore Data" → tekan "Unduh Backup Data (.JSON)". Simpan file tersebut di HP atau Google Drive Anda sebagai cadangan tambahan.',
  },
  {
    num: 12,
    title: 'Cara Export Laporan (Excel, CSV, PDF)',
    content:
      'Buka menu "Laporan" → pilih jenis laporan (Semua Nasabah, Kredit Aktif, Pembayaran, Tunggakan, Piutang, Pendapatan Bunga, Harian, Bulanan) → atur tanggal → tekan tombol "Export Excel", "Export CSV", atau "Export PDF".',
  },
  {
    num: 13,
    title: 'Cara Pindah HP Baru (Data Tidak Hilang)',
    content:
      'Jika HP lama rusak atau berganti HP baru: cukup buka KreditKu di HP baru → install ke layar utama → login dengan akun Google / Gmail yang sama. Seluruh data nasabah, kredit, angsuran, pembayaran, dan pengaturan langsung muncul kembali dari Cloud Database.',
  },
  {
    num: 14,
    title: 'Cara Menggunakan Mode Offline',
    content:
      'Saat sinyal internet terputus, indikator di atas akan berubah menjadi "🔴 Offline". Anda tetap dapat melihat data nasabah & jadwal angsuran terakhir, serta menginput transaksi yang akan disimpan di antrean lokal.',
  },
  {
    num: 15,
    title: 'Cara Sinkronisasi Otomatis',
    content:
      'Ketika koneksi internet kembali menyala ("🟢 Online"), seluruh transaksi yang tercatat saat offline akan dikirim otomatis ke database cloud dan seluruh halaman (Dashboard, Laporan, Riwayat) langsung tersinkronisasi.',
  },
  {
    num: 16,
    title: 'Cara Mengubah Pengaturan Usaha',
    content:
      'Buka menu "Pengaturan" di navigasi bawah → ubah Profil Usaha (Nama usaha, pemilik, nomor WA, alamat, logo), aturan default kredit (bunga, tenor, pembulatan), notifikasi, dan kalimat template WhatsApp → tekan "Simpan Semua Pengaturan".',
  },
];

export const GuidePage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(1);

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-teal-50 text-teal-700">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Panduan Lengkap Penggunaan KreditKu
            </h1>
            <p className="text-xs text-slate-500">
              16 panduan praktis mengelola kredit barang & pinjaman uang dari HP
              Android
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        {GUIDE_ITEMS.map((item) => {
          const isOpen = openIndex === item.num;
          return (
            <div
              key={item.num}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs"
            >
              <button
                type="button"
                data-popup={`Panduan ${item.num}: ${item.title}`}
                onClick={() => setOpenIndex(isOpen ? null : item.num)}
                className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 font-mono-num text-xs font-bold flex items-center justify-center shrink-0">
                    {item.num}
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {item.title}
                  </span>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                  {item.content}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Support & Developer Attribution Box */}
      <section className="bg-teal-950 text-white rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold">
            Butuh Bantuan atau Konsultasi Aplikasi?
          </div>
          <p className="text-xs text-teal-200 mt-0.5">
            Aplikasi KreditKu dirancang khusus untuk kemudahan dan keamanan data
            pemilik usaha.
          </p>
        </div>
        <a
          href="https://wa.me/628179015181?text=Halo%20Jamhur,%20saya%20pengguna%20aplikasi%20KreditKu"
          target="_blank"
          rel="noopener noreferrer"
          data-popup="Chat WhatsApp Jamhur (08179015181)"
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-400 shrink-0"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Created by Jamhur (WA: 08179015181)</span>
        </a>
      </section>
    </div>
  );
};
