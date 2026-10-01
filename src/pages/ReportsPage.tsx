import React, { useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  downloadCSV,
  downloadExcel,
  formatIndonesianDate,
  formatRupiah,
  getDaysDiffFromToday,
  getTodayDateStr,
} from '../utils/formatters';

type ReportType =
  | 'nasabah'
  | 'kredit_aktif'
  | 'pinjaman_aktif'
  | 'kredit_lunas'
  | 'pinjaman_lunas'
  | 'pembayaran'
  | 'tunggakan'
  | 'piutang'
  | 'pendapatan_bunga'
  | 'harian'
  | 'bulanan';

const REPORT_OPTIONS: { id: ReportType; label: string }[] = [
  { id: 'nasabah', label: '1. Semua Nasabah' },
  { id: 'kredit_aktif', label: '2. Kredit Barang Aktif' },
  { id: 'pinjaman_aktif', label: '3. Pinjaman Uang Aktif' },
  { id: 'kredit_lunas', label: '4. Kredit Barang Lunas' },
  { id: 'pinjaman_lunas', label: '5. Pinjaman Uang Lunas' },
  { id: 'pembayaran', label: '6. Pembayaran Masuk' },
  { id: 'tunggakan', label: '7. Tunggakan Angsuran' },
  { id: 'piutang', label: '8. Piutang Usaha' },
  { id: 'pendapatan_bunga', label: '9. Pendapatan Bunga / Keuntungan' },
  { id: 'harian', label: '10. Laporan Harian' },
  { id: 'bulanan', label: '11. Laporan Bulanan' },
];

export const ReportsPage: React.FC = () => {
  const {
    settings,
    customers,
    loans,
    installments,
    payments,
    recordExportLog,
    showToast,
  } = useApp();

  const [reportType, setReportType] = useState<ReportType>('pembayaran');
  const [dateFrom, setDateFrom] = useState(() => {
    const today = getTodayDateStr();
    return `${today.slice(0, 7)}-01`;
  });
  const [dateTo, setDateTo] = useState(getTodayDateStr());

  const inDateRange = (dateStr: string) => {
    const clean = (dateStr || '').slice(0, 10);
    if (!clean) return true;
    if (dateFrom && clean < dateFrom) return false;
    if (dateTo && clean > dateTo) return false;
    return true;
  };

  const reportData = useMemo(() => {
    const activeLoanIds = new Set(
      loans.filter((l) => l.status === 'aktif').map((l) => l.id)
    );

    switch (reportType) {
      case 'nasabah': {
        const headers = [
          'Kode',
          'Nama Lengkap',
          'Nomor HP',
          'Alamat',
          'Status',
          'Tanggal Dibuat',
        ];
        const rows = customers
          .filter((c) => inDateRange(c.createdDate))
          .map((c) => [
            c.code,
            c.name,
            c.phone,
            c.address || '-',
            c.status.toUpperCase(),
            formatIndonesianDate(c.createdDate),
          ]);
        return {
          title: 'Laporan Semua Nasabah',
          summaryCards: [
            { label: 'Total Nasabah', value: String(rows.length) },
            {
              label: 'Nasabah Aktif',
              value: String(
                customers.filter((c) => c.status === 'aktif').length
              ),
            },
          ],
          headers,
          rows,
        };
      }

      case 'kredit_aktif':
      case 'pinjaman_aktif':
      case 'kredit_lunas':
      case 'pinjaman_lunas': {
        const targetType =
          reportType === 'kredit_aktif' || reportType === 'kredit_lunas'
            ? 'barang'
            : 'uang';
        const targetStatus =
          reportType === 'kredit_aktif' || reportType === 'pinjaman_aktif'
            ? 'aktif'
            : 'lunas';

        const list = loans.filter(
          (l) =>
            l.type === targetType &&
            l.status === targetStatus &&
            inDateRange(l.startDate)
        );

        const totalObl = list.reduce((s, l) => s + l.totalObligation, 0);
        const totalPaid = list.reduce((s, l) => s + l.paidAmount, 0);
        const totalRem = list.reduce((s, l) => s + l.remainingBalance, 0);

        const headers = [
          'Kode',
          'Tanggal Mulai',
          'Nasabah',
          'Barang / Pinjaman',
          'Pokok Pembiayaan',
          'Bunga/Keuntungan',
          'Total Kewajiban',
          'Sudah Dibayar',
          'Sisa Kewajiban',
          'Status',
        ];
        const rows = list.map((l) => [
          l.code,
          formatIndonesianDate(l.startDate),
          l.customerName,
          l.itemName,
          formatRupiah(l.principalAmount),
          formatRupiah(l.interestAmount),
          formatRupiah(l.totalObligation),
          formatRupiah(l.paidAmount),
          formatRupiah(l.remainingBalance),
          l.status.toUpperCase(),
        ]);

        return {
          title:
            REPORT_OPTIONS.find((o) => o.id === reportType)?.label.slice(3) ||
            'Laporan Transaksi',
          summaryCards: [
            { label: 'Jumlah Transaksi', value: String(list.length) },
            { label: 'Total Kewajiban', value: formatRupiah(totalObl) },
            { label: 'Sudah Dibayar', value: formatRupiah(totalPaid) },
            { label: 'Sisa Hutang', value: formatRupiah(totalRem) },
          ],
          headers,
          rows,
        };
      }

      case 'pembayaran': {
        const list = payments.filter(
          (p) => p.status === 'valid' && inDateRange(p.paymentDate)
        );
        const totalIn = list.reduce((s, p) => s + p.amount, 0);
        const headers = [
          'No. Kwitansi',
          'Tanggal Bayar',
          'Nasabah',
          'Jenis',
          'Kredit / Pinjaman',
          'Angsuran Ke',
          'Metode',
          'Nominal Masuk',
        ];
        const rows = list.map((p) => [
          p.code,
          formatIndonesianDate(p.paymentDate),
          p.customerName,
          p.loanType === 'barang' ? 'Kredit Barang' : 'Pinjaman Uang',
          p.loanItemName,
          p.installmentNumber,
          p.method.toUpperCase(),
          formatRupiah(p.amount),
        ]);
        return {
          title: 'Laporan Pembayaran Masuk',
          summaryCards: [
            { label: 'Frekuensi Pembayaran', value: `${list.length}x` },
            { label: 'Total Uang Masuk', value: formatRupiah(totalIn) },
          ],
          headers,
          rows,
        };
      }

      case 'tunggakan': {
        const list = installments.filter(
          (i) =>
            activeLoanIds.has(i.loanId) &&
            i.status !== 'lunas' &&
            i.remainingAmount > 0 &&
            getDaysDiffFromToday(i.dueDate) < 0
        );
        const totalArrears = list.reduce((s, i) => s + i.remainingAmount, 0);
        const headers = [
          'Nasabah',
          'Nomor HP',
          'Kredit / Pinjaman',
          'Angsuran Ke',
          'Jatuh Tempo',
          'Hari Terlambat',
          'Nominal Tunggakan',
        ];
        const rows = list.map((i) => [
          i.customerName,
          i.customerPhone,
          i.loanItemName,
          i.installmentNumber,
          formatIndonesianDate(i.dueDate),
          `${Math.abs(getDaysDiffFromToday(i.dueDate))} hari`,
          formatRupiah(i.remainingAmount),
        ]);
        return {
          title: 'Laporan Tunggakan Angsuran',
          summaryCards: [
            { label: 'Angsuran Menunggak', value: String(list.length) },
            { label: 'Total Nilai Tunggakan', value: formatRupiah(totalArrears) },
          ],
          headers,
          rows,
        };
      }

      case 'piutang': {
        const list = loans.filter((l) => l.status === 'aktif');
        const totalPiutang = list.reduce((s, l) => s + l.remainingBalance, 0);
        const totalObl = list.reduce((s, l) => s + l.totalObligation, 0);
        const headers = [
          'Kode',
          'Nasabah',
          'Nomor HP',
          'Jenis',
          'Nama Barang/Pinjaman',
          'Total Kewajiban',
          'Sudah Dibayar',
          'Sisa Piutang',
        ];
        const rows = list.map((l) => [
          l.code,
          l.customerName,
          l.customerPhone,
          l.type === 'barang' ? 'Kredit Barang' : 'Pinjaman Uang',
          l.itemName,
          formatRupiah(l.totalObligation),
          formatRupiah(l.paidAmount),
          formatRupiah(l.remainingBalance),
        ]);
        return {
          title: 'Laporan Piutang Usaha Aktif',
          summaryCards: [
            { label: 'Kontrak Aktif', value: String(list.length) },
            { label: 'Total Kontrak', value: formatRupiah(totalObl) },
            { label: 'Total Sisa Piutang', value: formatRupiah(totalPiutang) },
          ],
          headers,
          rows,
        };
      }

      case 'pendapatan_bunga': {
        const list = loans.filter(
          (l) => l.status !== 'dibatalkan' && inDateRange(l.startDate)
        );
        const totalPrincipal = list.reduce((s, l) => s + l.principalAmount, 0);
        const totalProfit = list.reduce((s, l) => s + l.interestAmount, 0);
        const headers = [
          'Kode',
          'Tanggal',
          'Nasabah',
          'Jenis',
          'Barang / Pinjaman',
          'Modal / Pokok',
          'Bunga / Keuntungan',
          'Total Kewajiban',
        ];
        const rows = list.map((l) => [
          l.code,
          formatIndonesianDate(l.startDate),
          l.customerName,
          l.type === 'barang' ? 'Kredit Barang' : 'Pinjaman Uang',
          l.itemName,
          formatRupiah(l.principalAmount),
          formatRupiah(l.interestAmount),
          formatRupiah(l.totalObligation),
        ]);
        return {
          title: 'Laporan Pendapatan Bunga & Keuntungan',
          summaryCards: [
            { label: 'Total Modal Pokok', value: formatRupiah(totalPrincipal) },
            {
              label: 'Total Bunga / Keuntungan',
              value: formatRupiah(totalProfit),
            },
          ],
          headers,
          rows,
        };
      }

      case 'harian': {
        const targetDay = dateTo || getTodayDateStr();
        const dayPayments = payments.filter(
          (p) => p.status === 'valid' && p.paymentDate.startsWith(targetDay)
        );
        const dayLoans = loans.filter((l) => l.startDate === targetDay);
        const totalIn = dayPayments.reduce((s, p) => s + p.amount, 0);
        const totalOut = dayLoans.reduce((s, l) => s + l.principalAmount, 0);

        const headers = [
          'Tanggal',
          'Kategori',
          'Kode',
          'Nasabah',
          'Keterangan',
          'Nominal',
        ];
        const rows: (string | number)[][] = [
          ...dayPayments.map((p) => [
            formatIndonesianDate(p.paymentDate),
            'PEMBAYARAN MASUK',
            p.code,
            p.customerName,
            `${p.loanItemName} (Angsuran ke-${p.installmentNumber})`,
            formatRupiah(p.amount),
          ]),
          ...dayLoans.map((l) => [
            formatIndonesianDate(l.startDate),
            l.type === 'barang' ? 'KREDIT BARANG BARU' : 'PINJAMAN UANG BARU',
            l.code,
            l.customerName,
            l.itemName,
            formatRupiah(l.totalObligation),
          ]),
        ];

        return {
          title: `Laporan Harian (${formatIndonesianDate(targetDay)})`,
          summaryCards: [
            { label: 'Pembayaran Masuk', value: formatRupiah(totalIn) },
            { label: 'Pencairan / Pembiayaan Baru', value: formatRupiah(totalOut) },
          ],
          headers,
          rows,
        };
      }

      case 'bulanan': {
        const monthPrefix = (dateTo || getTodayDateStr()).slice(0, 7);
        const monthPayments = payments.filter(
          (p) => p.status === 'valid' && p.paymentDate.startsWith(monthPrefix)
        );
        const monthLoans = loans.filter((l) =>
          l.startDate.startsWith(monthPrefix)
        );
        const totalIn = monthPayments.reduce((s, p) => s + p.amount, 0);
        const totalProfit = monthLoans.reduce(
          (s, l) => s + l.interestAmount,
          0
        );

        const headers = [
          'Tanggal',
          'Kategori',
          'Kode',
          'Nasabah',
          'Keterangan',
          'Nominal',
        ];
        const rows: (string | number)[][] = [
          ...monthPayments.map((p) => [
            formatIndonesianDate(p.paymentDate),
            'PEMBAYARAN MASUK',
            p.code,
            p.customerName,
            `${p.loanItemName} (Angsuran ke-${p.installmentNumber})`,
            formatRupiah(p.amount),
          ]),
          ...monthLoans.map((l) => [
            formatIndonesianDate(l.startDate),
            l.type === 'barang' ? 'KREDIT BARANG' : 'PINJAMAN UANG',
            l.code,
            l.customerName,
            l.itemName,
            formatRupiah(l.totalObligation),
          ]),
        ];

        return {
          title: `Laporan Bulanan (Periode ${monthPrefix})`,
          summaryCards: [
            { label: 'Total Pembayaran Bulan Ini', value: formatRupiah(totalIn) },
            { label: 'Transaksi Baru Bulan Ini', value: String(monthLoans.length) },
            { label: 'Potensi Keuntungan Baru', value: formatRupiah(totalProfit) },
          ],
          headers,
          rows,
        };
      }
    }
  }, [
    reportType,
    customers,
    loans,
    installments,
    payments,
    dateFrom,
    dateTo,
  ]);

  const handleExportCSV = async () => {
    downloadCSV(
      `KreditKu_${reportType}_${getTodayDateStr()}.csv`,
      reportData.headers,
      reportData.rows
    );
    await recordExportLog('CSV', reportData.title);
    showToast('File CSV berhasil diunduh.', 'success');
  };

  const handleExportExcel = async () => {
    downloadExcel(
      `KreditKu_${reportType}_${getTodayDateStr()}.xls`,
      `${settings.businessName} — ${reportData.title}`,
      `Periode: ${formatIndonesianDate(dateFrom)} s/d ${formatIndonesianDate(
        dateTo
      )}`,
      reportData.headers,
      reportData.rows
    );
    await recordExportLog('Excel', reportData.title);
    showToast('File Excel (.xls) berhasil diunduh.', 'success');
  };

  const handleExportPDF = async () => {
    await recordExportLog('PDF', reportData.title);
    showToast('Menyiapkan dokumen PDF siap cetak...', 'info');
    window.setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-4">
      {/* Filter & Export Controls (Hidden when printing PDF) */}
      <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4 no-print">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Laporan Keuangan & Rekap Usaha
          </h1>
          <p className="text-xs text-slate-500">
            Tabel & ringkasan angka akurat tanpa grafik — siap di-export ke
            Excel, CSV, dan PDF
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Jenis Laporan
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white font-semibold"
            >
              {REPORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm"
            />
          </div>
        </div>

        {/* Export Buttons: Excel, CSV, PDF */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            data-popup="Export Laporan ke Excel"
            onClick={handleExportExcel}
            className="min-h-[44px] px-3 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-emerald-800 transition"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            data-popup="Export Laporan ke CSV"
            onClick={handleExportCSV}
            className="min-h-[44px] px-3 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-teal-800 transition"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            data-popup="Export Laporan ke PDF / Cetak"
            onClick={handleExportPDF}
            className="min-h-[44px] px-3 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-800 transition"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>Export PDF</span>
          </button>
        </div>
      </section>

      {/* Printable & Viewable Report Content (Numbers + Table Only, Zero Charts) */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-teal-800">
              {settings.businessName}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {reportData.title}
            </h2>
            <div className="text-xs text-slate-500">
              Filter Tanggal: {formatIndonesianDate(dateFrom)} s/d{' '}
              {formatIndonesianDate(dateTo)}
            </div>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            <span>Total Baris: {reportData.rows.length}</span>
          </div>
        </div>

        {/* Summary Number Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {reportData.summaryCards.map((card, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200"
            >
              <div className="text-[11px] text-slate-500">{card.label}</div>
              <div className="mt-1 text-sm sm:text-base font-bold font-mono-num text-slate-900">
                {card.value}
              </div>
            </div>
          ))}
        </div>

        {/* Simple Clean Data Table */}
        {reportData.rows.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-50 text-center text-xs text-slate-500">
            Tidak ada data pada rentang tanggal dan kategori laporan ini.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  {reportData.headers.map((h, i) => (
                    <th
                      key={i}
                      className="py-3 px-3.5 font-bold whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/80">
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="py-2.5 px-3.5 text-slate-700 whitespace-nowrap font-mono-num"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
