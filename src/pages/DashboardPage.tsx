import React, { useMemo } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Download,
  FileSpreadsheet,
  History,
  MessageCircle,
  Package,
  Plus,
  Users,
  Wallet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  buildWhatsAppUrl,
  downloadBackupJSON,
  formatIndonesianDate,
  formatRupiah,
  getDaysDiffFromToday,
  getInstallmentDisplayStatus,
  getTodayDateStr,
} from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const {
    user,
    settings,
    customers,
    loans,
    installments,
    payments,
    setActiveTab,
    navigateToPayment,
    recordBackupLog,
    showToast,
  } = useApp();

  const todayStr = getTodayDateStr();
  const currentMonthPrefix = todayStr.slice(0, 7); // YYYY-MM

  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const activeBarangLoans = loans.filter(
      (l) => l.type === 'barang' && l.status === 'aktif'
    ).length;
    const activeUangLoans = loans.filter(
      (l) => l.type === 'uang' && l.status === 'aktif'
    ).length;
    const paidOffLoans = loans.filter((l) => l.status === 'lunas').length;

    const totalReceivables = loans
      .filter((l) => l.status === 'aktif')
      .reduce((sum, l) => sum + l.remainingBalance, 0);

    const validPayments = payments.filter((p) => p.status === 'valid');
    const todayPayments = validPayments
      .filter((p) => p.paymentDate.startsWith(todayStr))
      .reduce((sum, p) => sum + p.amount, 0);

    const monthPayments = validPayments
      .filter((p) => p.paymentDate.startsWith(currentMonthPrefix))
      .reduce((sum, p) => sum + p.amount, 0);

    const activeLoanIds = new Set(
      loans.filter((l) => l.status === 'aktif').map((l) => l.id)
    );

    const unpaidInstallments = installments.filter(
      (i) =>
        activeLoanIds.has(i.loanId) &&
        i.status !== 'lunas' &&
        i.remainingAmount > 0
    );

    const dueTodayList = unpaidInstallments.filter(
      (i) => getDaysDiffFromToday(i.dueDate) === 0
    );
    const overdueList = unpaidInstallments.filter(
      (i) => getDaysDiffFromToday(i.dueDate) < 0
    );

    const totalArrears = overdueList.reduce(
      (sum, i) => sum + i.remainingAmount,
      0
    );
    const dueTodayTotal = dueTodayList.reduce(
      (sum, i) => sum + i.remainingAmount,
      0
    );

    return {
      totalCustomers,
      activeBarangLoans,
      activeUangLoans,
      paidOffLoans,
      totalReceivables,
      todayPayments,
      monthPayments,
      totalArrears,
      dueTodayCount: dueTodayList.length,
      dueTodayTotal,
      overdueCount: overdueList.length,
      dueTodayList,
      overdueList,
    };
  }, [customers, loans, installments, payments, todayStr, currentMonthPrefix]);

  const handleQuickBackup = async () => {
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

  const getLoanRemaining = (loanId: string) => {
    const loan = loans.find((l) => l.id === loanId);
    return loan ? loan.remainingBalance : 0;
  };

  return (
    <div className="space-y-5">
      {/* Welcome & Primary Quick Actions */}
      <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500">
              {formatIndonesianDate(todayStr)} · Pemilik:{' '}
              <span className="font-semibold text-slate-700">
                {settings.ownerName || user?.displayName || 'Pemilik Usaha'}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              Ringkasan Usaha {settings.businessName}
            </h1>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            <button
              type="button"
              data-popup="Catat Pembayaran Baru"
              onClick={() => setActiveTab('payments')}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-teal-800 active:scale-95 transition"
            >
              <CreditCard className="w-4 h-4" />
              <span>Catat Bayar</span>
            </button>
            <button
              type="button"
              data-popup="Buat Kredit / Pinjaman"
              onClick={() => setActiveTab('loans')}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-800 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Kredit Baru</span>
            </button>
          </div>
        </div>

        {/* Highlight Financial Summary Cards (No Charts) */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Total Piutang Aktif (Sisa Kewajiban)</span>
              <Wallet className="w-4 h-4 text-teal-400" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono-num tracking-tight">
              {formatRupiah(stats.totalReceivables)}
            </div>
            <div className="mt-1.5 text-[11px] text-slate-300 flex items-center gap-2">
              <span>{stats.activeBarangLoans} Kredit Barang</span>
              <span>·</span>
              <span>{stats.activeUangLoans} Pinjaman Uang</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-rose-800 font-medium">
              <span>Total Tunggakan (Lewat Jatuh Tempo)</span>
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono-num tracking-tight text-rose-700">
              {formatRupiah(stats.totalArrears)}
            </div>
            <div className="mt-1.5 text-[11px] text-rose-800 flex items-center justify-between">
              <span>{stats.overdueCount} angsuran terlambat</span>
              <button
                type="button"
                data-popup="Lihat Daftar Tunggakan"
                onClick={() => setActiveTab('duedates')}
                className="font-bold underline hover:text-rose-950"
              >
                Lihat Detail →
              </button>
            </div>
          </div>
        </div>

        {/* 10 Required Key Metrics Grid (Pure Numbers & Cards, No Charts) */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            data-popup="Buka Data Nasabah"
            onClick={() => setActiveTab('customers')}
            className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-left hover:bg-slate-100 transition"
          >
            <div className="text-[11px] text-slate-500">Total Nasabah</div>
            <div className="mt-1 text-lg font-bold font-mono-num text-slate-900">
              {stats.totalCustomers}
            </div>
            <div className="text-[11px] text-teal-700 font-medium mt-0.5">
              Nasabah terdaftar
            </div>
          </button>

          <button
            type="button"
            data-popup="Buka Kredit Barang Aktif"
            onClick={() => setActiveTab('loans')}
            className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-left hover:bg-slate-100 transition"
          >
            <div className="text-[11px] text-slate-500">Kredit Aktif</div>
            <div className="mt-1 text-lg font-bold font-mono-num text-slate-900">
              {stats.activeBarangLoans}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              Kredit barang berjalan
            </div>
          </button>

          <button
            type="button"
            data-popup="Buka Pinjaman Uang Aktif"
            onClick={() => setActiveTab('loans')}
            className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-left hover:bg-slate-100 transition"
          >
            <div className="text-[11px] text-slate-500">Pinjaman Aktif</div>
            <div className="mt-1 text-lg font-bold font-mono-num text-slate-900">
              {stats.activeUangLoans}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              Pinjaman uang berjalan
            </div>
          </button>

          <button
            type="button"
            data-popup="Buka Transaksi Lunas"
            onClick={() => setActiveTab('loans')}
            className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-left hover:bg-slate-100 transition"
          >
            <div className="text-[11px] text-slate-500">
              Kredit/Pinjaman Lunas
            </div>
            <div className="mt-1 text-lg font-bold font-mono-num text-emerald-700">
              {stats.paidOffLoans}
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5">
              Transaksi selesai
            </div>
          </button>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-left">
            <div className="text-[11px] text-emerald-800">
              Pembayaran Hari Ini
            </div>
            <div className="mt-1 text-base sm:text-lg font-bold font-mono-num text-emerald-900 truncate">
              {formatRupiah(stats.todayPayments)}
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5">
              Uang masuk hari ini
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 text-left">
            <div className="text-[11px] text-teal-800">
              Pembayaran Bulan Ini
            </div>
            <div className="mt-1 text-base sm:text-lg font-bold font-mono-num text-teal-900 truncate">
              {formatRupiah(stats.monthPayments)}
            </div>
            <div className="text-[11px] text-teal-700 mt-0.5">
              Akumulasi bulan berjalan
            </div>
          </div>

          <button
            type="button"
            data-popup="Lihat Jatuh Tempo Hari Ini"
            onClick={() => setActiveTab('duedates')}
            className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-left hover:bg-amber-100/70 transition"
          >
            <div className="text-[11px] text-amber-900">
              Jatuh Tempo Hari Ini
            </div>
            <div className="mt-1 text-lg font-bold font-mono-num text-amber-900">
              {stats.dueTodayCount} Angsuran
            </div>
            <div className="text-[11px] font-mono-num text-amber-800 mt-0.5 truncate">
              {formatRupiah(stats.dueTodayTotal)}
            </div>
          </button>

          <button
            type="button"
            data-popup="Lihat Angsuran Terlambat"
            onClick={() => setActiveTab('duedates')}
            className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-left hover:bg-rose-100/70 transition"
          >
            <div className="text-[11px] text-rose-900">Angsuran Terlambat</div>
            <div className="mt-1 text-lg font-bold font-mono-num text-rose-700">
              {stats.overdueCount} Angsuran
            </div>
            <div className="text-[11px] font-mono-num text-rose-800 mt-0.5 truncate">
              {formatRupiah(stats.totalArrears)}
            </div>
          </button>
        </div>
      </section>

      {/* Jatuh Tempo Hari Ini & Terlambat Action List */}
      <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Tagihan Perlu Perhatian Segera
            </h2>
            <p className="text-xs text-slate-500">
              Angsuran jatuh tempo hari ini & terlambat
            </p>
          </div>
          <button
            type="button"
            data-popup="Buka Halaman Jatuh Tempo"
            onClick={() => setActiveTab('duedates')}
            className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1 py-2 px-2"
          >
            <span>Semua Jadwal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {stats.dueTodayList.length === 0 && stats.overdueList.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <div className="mt-2 text-sm font-semibold text-slate-800">
              Tidak ada angsuran jatuh tempo hari ini atau tunggakan
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Semua jadwal pembayaran nasabah dalam kondisi terkendali.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {[...stats.overdueList, ...stats.dueTodayList]
              .slice(0, 6)
              .map((inst) => {
                const daysDiff = getDaysDiffFromToday(inst.dueDate);
                const isLate = daysDiff < 0;
                const displayStatus = getInstallmentDisplayStatus(inst);
                const sisaHutang = getLoanRemaining(inst.loanId);
                const waUrl = buildWhatsAppUrl({
                  phone: inst.customerPhone,
                  template: isLate
                    ? settings.waTemplateOverdue
                    : settings.waTemplateDue,
                  nama: inst.customerName,
                  angsuran: inst.remainingAmount,
                  tanggal: inst.dueDate,
                  jenisKredit: inst.loanItemName,
                  sisaHutang,
                  jumlahTunggakan: inst.remainingAmount,
                });

                return (
                  <div
                    key={inst.id}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {inst.customerName}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span
                          className={`font-semibold ${
                            isLate ? 'text-rose-600' : 'text-amber-700'
                          }`}
                        >
                          {displayStatus}
                          {isLate ? ` (${Math.abs(daysDiff)} hari)` : ''}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {inst.loanType === 'barang'
                          ? 'Kredit Barang'
                          : 'Pinjaman Uang'}
                        : <strong>{inst.loanItemName}</strong> · Angsuran ke-
                        {inst.installmentNumber}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>
                          Jatuh tempo: {formatIndonesianDate(inst.dueDate)}
                        </span>
                        <span>·</span>
                        <span className="font-mono-num font-bold text-slate-900">
                          {formatRupiah(inst.remainingAmount)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-popup={`Chat WA ${inst.customerName}`}
                        className="min-h-[42px] px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-700 transition"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat WA</span>
                      </a>
                      <button
                        type="button"
                        data-popup={`Bayar Angsuran ${inst.customerName}`}
                        onClick={() =>
                          navigateToPayment({
                            customerId: inst.customerId,
                            loanId: inst.loanId,
                            installmentId: inst.id,
                          })
                        }
                        className="min-h-[42px] px-3.5 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-teal-800 transition"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Bayar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* Shortcut Tools Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <button
          type="button"
          data-popup="Buka Menu Nasabah"
          onClick={() => setActiveTab('customers')}
          className="p-4 rounded-2xl bg-white border border-slate-200 text-left hover:border-teal-600 transition flex items-start gap-3"
        >
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">
              Data Nasabah
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Tambah & lihat nasabah
            </div>
          </div>
        </button>

        <button
          type="button"
          data-popup="Buka Menu Kredit & Pinjaman"
          onClick={() => setActiveTab('loans')}
          className="p-4 rounded-2xl bg-white border border-slate-200 text-left hover:border-teal-600 transition flex items-start gap-3"
        >
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">
              Kredit & Pinjaman
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Barang & pinjaman uang
            </div>
          </div>
        </button>

        <button
          type="button"
          data-popup="Buka Menu Jatuh Tempo"
          onClick={() => setActiveTab('duedates')}
          className="p-4 rounded-2xl bg-white border border-slate-200 text-left hover:border-teal-600 transition flex items-start gap-3"
        >
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">
              Jatuh Tempo
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Hari ini, terlambat, esok
            </div>
          </div>
        </button>

        <button
          type="button"
          data-popup="Buka Menu Laporan"
          onClick={() => setActiveTab('reports')}
          className="p-4 rounded-2xl bg-white border border-slate-200 text-left hover:border-teal-600 transition flex items-start gap-3"
        >
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">
              Laporan & Export
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Excel, CSV, dan PDF
            </div>
          </div>
        </button>

        <button
          type="button"
          data-popup="Buka Menu Riwayat & Audit"
          onClick={() => setActiveTab('history')}
          className="p-4 rounded-2xl bg-white border border-slate-200 text-left hover:border-teal-600 transition flex items-start gap-3"
        >
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">
              Riwayat Transaksi
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Mutasi & audit log
            </div>
          </div>
        </button>

        <button
          type="button"
          data-popup="Backup Data JSON Sekarang"
          onClick={handleQuickBackup}
          className="p-4 rounded-2xl bg-white border border-slate-200 text-left hover:border-teal-600 transition flex items-start gap-3"
        >
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">
              Backup Data
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Simpan cadangan JSON
            </div>
          </div>
        </button>
      </section>
    </div>
  );
};
