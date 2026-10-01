import React, { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  Camera,
  ChevronRight,
  CreditCard,
  MessageCircle,
  Package,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Loan, LoanType, PaymentPeriod } from '../types';
import {
  buildWhatsAppUrl,
  calculateLoanFinancials,
  compressImageFile,
  formatIndonesianDate,
  formatRupiah,
  generateDueDates,
  getDaysDiffFromToday,
  getInstallmentDisplayStatus,
  getTodayDateStr,
  parseRupiahInput,
} from '../utils/formatters';

export const LoansPage: React.FC = () => {
  const {
    customers,
    loans,
    installments,
    settings,
    createLoanWithSchedule,
    navigateToPayment,
    selectedCustomerForLoan,
    setSelectedCustomerForLoan,
    showToast,
  } = useApp();

  const [filterType, setFilterType] = useState<'semua' | 'barang' | 'uang'>(
    'semua'
  );
  const [filterStatus, setFilterStatus] = useState<'semua' | 'aktif' | 'lunas'>(
    'semua'
  );
  const [search, setSearch] = useState('');

  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // Form states for Kredit Barang & Pinjaman Uang
  const [loanType, setLoanType] = useState<LoanType>('barang');
  const [customerId, setCustomerId] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('Elektronik');
  const [itemPriceStr, setItemPriceStr] = useState('');
  const [downPaymentStr, setDownPaymentStr] = useState('0');
  const [interestMode, setInterestMode] = useState<'percent' | 'nominal'>(
    'percent'
  );
  const [interestRateStr, setInterestRateStr] = useState(
    String(settings.defaultInterestRate)
  );
  const [interestNominalStr, setInterestNominalStr] = useState('0');
  const [tenorStr, setTenorStr] = useState(String(settings.defaultTenor));
  const [period, setPeriod] = useState<PaymentPeriod>(settings.defaultPeriod);
  const [startDate, setStartDate] = useState(getTodayDateStr());
  const [firstDueDate, setFirstDueDate] = useState(() => {
    const dt = new Date();
    dt.setMonth(dt.getMonth() + 1);
    return dt.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // If navigated from Customer detail with a preselected customer
  useEffect(() => {
    if (selectedCustomerForLoan) {
      openCreateModal('barang', selectedCustomerForLoan);
      setSelectedCustomerForLoan(null);
    }
  }, [selectedCustomerForLoan, setSelectedCustomerForLoan]);

  const openCreateModal = (type: LoanType, preCustId?: string) => {
    setLoanType(type);
    setCustomerId(preCustId || customers[0]?.id || '');
    setItemName(type === 'uang' ? 'Pinjaman Uang Tunai' : '');
    setItemCategory(type === 'uang' ? 'Pinjaman Uang' : 'Elektronik');
    setItemPriceStr('');
    setDownPaymentStr('0');
    setInterestMode('percent');
    setInterestRateStr(String(settings.defaultInterestRate));
    setInterestNominalStr('0');
    setTenorStr(String(settings.defaultTenor));
    setPeriod(settings.defaultPeriod);
    const today = getTodayDateStr();
    setStartDate(today);
    const nextDue = new Date();
    if (settings.defaultPeriod === 'harian') {
      nextDue.setDate(nextDue.getDate() + 1);
    } else if (settings.defaultPeriod === 'mingguan') {
      nextDue.setDate(nextDue.getDate() + 7);
    } else {
      nextDue.setMonth(nextDue.getMonth() + 1);
    }
    setFirstDueDate(nextDue.toISOString().slice(0, 10));
    setNotes('');
    setPhotoUrl('');
    setFormOpen(true);
  };

  // Real-time financial calculation preview
  const previewCalc = useMemo(() => {
    const price = parseRupiahInput(itemPriceStr);
    const dp = loanType === 'barang' ? parseRupiahInput(downPaymentStr) : 0;
    const principal = Math.max(0, price - dp);
    const rate = Math.max(0, parseFloat(interestRateStr) || 0);
    const calcInterest =
      interestMode === 'percent'
        ? Math.round((principal * rate) / 100)
        : parseRupiahInput(interestNominalStr);

    const tenor = Math.max(1, Math.min(360, parseInt(tenorStr, 10) || 1));

    const fin = calculateLoanFinancials({
      itemPrice: price,
      downPayment: dp,
      interestAmount: calcInterest,
      tenor,
      roundingRule: settings.roundingRule,
    });

    const dates = generateDueDates(firstDueDate || getTodayDateStr(), tenor, period);

    return {
      price,
      dp,
      principal: fin.principalAmount,
      interestAmount: fin.interestAmount,
      effectiveRate:
        principal > 0
          ? Number(((fin.interestAmount / principal) * 100).toFixed(2))
          : 0,
      totalObligation: fin.totalObligation,
      installmentAmount: fin.installmentAmount,
      scheduleAmounts: fin.scheduleAmounts,
      tenor,
      dates,
    };
  }, [
    itemPriceStr,
    downPaymentStr,
    loanType,
    interestMode,
    interestRateStr,
    interestNominalStr,
    tenorStr,
    firstDueDate,
    period,
    settings.roundingRule,
  ]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 480);
      setPhotoUrl(compressed);
      showToast('Foto barang siap disimpan.', 'info');
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses foto barang.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      showToast('Pilih nasabah terlebih dahulu.', 'error');
      return;
    }
    if (loanType === 'barang' && !itemName.trim()) {
      showToast('Nama barang wajib diisi.', 'error');
      return;
    }
    if (previewCalc.price <= 0) {
      showToast(
        loanType === 'barang'
          ? 'Harga barang harus lebih dari Rp0.'
          : 'Jumlah pinjaman harus lebih dari Rp0.',
        'error'
      );
      return;
    }
    if (loanType === 'barang' && previewCalc.dp > previewCalc.price) {
      showToast('DP tidak boleh lebih besar dari harga barang!', 'error');
      return;
    }
    if (previewCalc.principal <= 0) {
      showToast('Jumlah yang dibiayai harus lebih besar dari Rp0.', 'error');
      return;
    }

    setSaving(true);
    try {
      await createLoanWithSchedule({
        customerId,
        type: loanType,
        itemName:
          loanType === 'barang'
            ? itemName
            : itemName || 'Pinjaman Uang Tunai',
        itemCategory:
          loanType === 'barang' ? itemCategory : 'Pinjaman Uang',
        itemPrice: previewCalc.price,
        downPayment: previewCalc.dp,
        interestRate: previewCalc.effectiveRate,
        interestAmount: previewCalc.interestAmount,
        tenor: previewCalc.tenor,
        period,
        startDate,
        firstDueDate,
        notes,
        photoUrl,
      });
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const filteredLoans = useMemo(() => {
    return loans.filter((l) => {
      if (filterType !== 'semua' && l.type !== filterType) return false;
      if (filterStatus !== 'semua' && l.status !== filterStatus) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        l.customerName.toLowerCase().includes(q) ||
        l.itemName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
      );
    });
  }, [loans, filterType, filterStatus, search]);

  const selectedLoanInstallments = useMemo(() => {
    if (!selectedLoan) return [];
    return installments
      .filter((i) => i.loanId === selectedLoan.id)
      .sort((a, b) => a.installmentNumber - b.installmentNumber);
  }, [installments, selectedLoan]);

  return (
    <div className="space-y-4">
      {/* Top Action Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Kredit Barang & Pinjaman Uang
            </h1>
            <p className="text-xs text-slate-500">
              Jadwal angsuran, bunga, dan sisa kewajiban dihitung otomatis
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-popup="Tambah Kredit Barang"
              onClick={() => openCreateModal('barang')}
              className="min-h-[46px] px-3.5 py-2.5 rounded-2xl bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-teal-800 active:scale-95 transition"
            >
              <Package className="w-4 h-4" />
              <span>+ Kredit Barang</span>
            </button>
            <button
              type="button"
              data-popup="Tambah Pinjaman Uang"
              onClick={() => openCreateModal('uang')}
              className="min-h-[46px] px-3.5 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-800 active:scale-95 transition"
            >
              <Banknote className="w-4 h-4" />
              <span>+ Pinjaman Uang</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="pt-2 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama nasabah, nama barang, kode KRD/PNJ..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(
                [
                  { id: 'semua', label: 'Semua' },
                  { id: 'barang', label: 'Kredit Barang' },
                  { id: 'uang', label: 'Pinjaman Uang' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  data-popup={`Filter ${t.label}`}
                  onClick={() => setFilterType(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterType === t.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(
                [
                  { id: 'semua', label: 'Semua Status' },
                  { id: 'aktif', label: 'Aktif' },
                  { id: 'lunas', label: 'Lunas' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  data-popup={`Status ${s.label}`}
                  onClick={() => setFilterStatus(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterStatus === s.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Loans List */}
      {filteredLoans.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center">
          <div className="text-sm font-bold text-slate-800">
            Belum ada transaksi kredit barang atau pinjaman uang
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gunakan tombol + Kredit Barang atau + Pinjaman Uang di atas untuk
            membuat jadwal angsuran otomatis.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLoans.map((loan) => {
            const loanInsts = installments.filter((i) => i.loanId === loan.id);
            const paidInstCount = loanInsts.filter(
              (i) => i.status === 'lunas' || i.remainingAmount <= 0
            ).length;

            return (
              <div
                key={loan.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-teal-600 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    data-popup={`Jadwal Angsuran ${loan.itemName}`}
                    onClick={() => setSelectedLoan(loan)}
                    className="text-left min-w-0 flex-1"
                  >
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <span className="font-mono-num font-semibold text-slate-700">
                        {loan.code}
                      </span>
                      <span>·</span>
                      <span className="font-medium text-teal-800">
                        {loan.type === 'barang'
                          ? 'Kredit Barang'
                          : 'Pinjaman Uang'}
                      </span>
                      <span>·</span>
                      <span
                        className={
                          loan.status === 'lunas'
                            ? 'text-emerald-700 font-bold'
                            : 'text-amber-700 font-bold'
                        }
                      >
                        {loan.status === 'lunas' ? 'LUNAS' : 'AKTIF'}
                      </span>
                    </div>

                    <div className="text-base font-bold text-slate-900 mt-1">
                      {loan.itemName}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Nasabah: <strong>{loan.customerName}</strong> ({loan.customerPhone})
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-500">
                          Total Kewajiban
                        </div>
                        <div className="font-mono-num font-bold text-slate-900">
                          {formatRupiah(loan.totalObligation)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">
                          Sudah Dibayar
                        </div>
                        <div className="font-mono-num font-bold text-emerald-700">
                          {formatRupiah(loan.paidAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">
                          Sisa Kewajiban
                        </div>
                        <div className="font-mono-num font-bold text-rose-700">
                          {formatRupiah(loan.remainingBalance)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                      <span>
                        Angsuran: {formatRupiah(loan.installmentAmount)} /{' '}
                        {loan.period} ({paidInstCount}/{loan.tenor} lunas)
                      </span>
                      <span className="text-teal-700 font-semibold inline-flex items-center gap-0.5">
                        Lihat Jadwal <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Loan Detail & Full Installment Schedule Modal */}
      {selectedLoan && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <div className="text-xs text-slate-500 font-mono-num">
                  {selectedLoan.code} ·{' '}
                  {selectedLoan.type === 'barang'
                    ? `Kredit Barang (${selectedLoan.itemCategory})`
                    : 'Pinjaman Uang'}
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedLoan.itemName}
                </h3>
                <div className="text-xs text-slate-600">
                  Nasabah: <strong>{selectedLoan.customerName}</strong> (
                  {selectedLoan.customerPhone})
                </div>
              </div>
              <button
                type="button"
                data-popup="Tutup Detail Kredit"
                onClick={() => setSelectedLoan(null)}
                className="p-2 rounded-xl bg-slate-100 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {selectedLoan.photoUrl && (
                <img
                  src={selectedLoan.photoUrl}
                  alt={selectedLoan.itemName}
                  className="w-full h-44 object-cover rounded-2xl border border-slate-200"
                />
              )}

              {/* Financial Breakdown Table */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
                {selectedLoan.type === 'barang' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Harga Barang:</span>
                      <span className="font-mono-num font-semibold">
                        {formatRupiah(selectedLoan.itemPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Uang Muka (DP):</span>
                      <span className="font-mono-num font-semibold">
                        - {formatRupiah(selectedLoan.downPayment)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Jumlah yang Dibiayai:
                      </span>
                      <span className="font-mono-num font-semibold">
                        {formatRupiah(selectedLoan.principalAmount)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Jumlah Pinjaman:</span>
                    <span className="font-mono-num font-semibold">
                      {formatRupiah(selectedLoan.principalAmount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Bunga / Keuntungan ({selectedLoan.interestRate}%):
                  </span>
                  <span className="font-mono-num font-semibold">
                    + {formatRupiah(selectedLoan.interestAmount)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                  <span>Total Kewajiban:</span>
                  <span className="font-mono-num">
                    {formatRupiah(selectedLoan.totalObligation)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Total Sudah Dibayar:</span>
                  <span className="font-mono-num">
                    {formatRupiah(selectedLoan.paidAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-rose-700 font-bold text-sm">
                  <span>Sisa Kewajiban (Hutang):</span>
                  <span className="font-mono-num">
                    {formatRupiah(selectedLoan.remainingBalance)}
                  </span>
                </div>
                <div className="pt-1 text-[11px] text-slate-500">
                  Tanggal Mulai: {formatIndonesianDate(selectedLoan.startDate)}{' '}
                  · Tenor: {selectedLoan.tenor}x ({selectedLoan.period})
                </div>
                {selectedLoan.notes && (
                  <div className="text-[11px] text-slate-600">
                    Catatan: {selectedLoan.notes}
                  </div>
                )}
              </div>

              {/* Jadwal Angsuran Section (Section 8) */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-2.5">
                  Jadwal Angsuran ({selectedLoanInstallments.length} Periode)
                </h4>
                <div className="space-y-2">
                  {selectedLoanInstallments.map((inst) => {
                    const dispStatus = getInstallmentDisplayStatus(inst);
                    const isPaid =
                      inst.status === 'lunas' || inst.remainingAmount <= 0;
                    const daysDiff = getDaysDiffFromToday(inst.dueDate);
                    const waUrl = buildWhatsAppUrl({
                      phone: inst.customerPhone,
                      template:
                        daysDiff < 0
                          ? settings.waTemplateOverdue
                          : settings.waTemplateDue,
                      nama: inst.customerName,
                      angsuran: inst.remainingAmount,
                      tanggal: inst.dueDate,
                      jenisKredit: inst.loanItemName,
                      sisaHutang: selectedLoan.remainingBalance,
                      jumlahTunggakan: inst.remainingAmount,
                    });

                    return (
                      <div
                        key={inst.id}
                        className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          isPaid
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : daysDiff < 0
                            ? 'bg-rose-50/60 border-rose-200'
                            : daysDiff === 0
                            ? 'bg-amber-50/60 border-amber-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-slate-900">
                              Angsuran {inst.installmentNumber}
                            </span>
                            <span>·</span>
                            <span
                              className={`font-semibold ${
                                dispStatus === 'Lunas'
                                  ? 'text-emerald-700'
                                  : dispStatus === 'Terlambat'
                                  ? 'text-rose-700'
                                  : dispStatus === 'Jatuh tempo hari ini'
                                  ? 'text-amber-800'
                                  : dispStatus === 'Dibayar sebagian'
                                  ? 'text-blue-700'
                                  : 'text-slate-600'
                              }`}
                            >
                              Status: {dispStatus}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            Jatuh tempo:{' '}
                            <strong>
                              {formatIndonesianDate(inst.dueDate)}
                            </strong>
                          </div>
                          <div className="text-xs text-slate-700 font-mono-num mt-0.5">
                            Tagihan: <strong>{formatRupiah(inst.amount)}</strong>
                            {inst.paidAmount > 0 && !isPaid && (
                              <span>
                                {' '}
                                · Dibayar: {formatRupiah(inst.paidAmount)} ·
                                Sisa:{' '}
                                <strong className="text-rose-700">
                                  {formatRupiah(inst.remainingAmount)}
                                </strong>
                              </span>
                            )}
                          </div>
                        </div>

                        {!isPaid && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-popup={`Ingatkan WA Angsuran ${inst.installmentNumber}`}
                              className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WA</span>
                            </a>
                            <button
                              type="button"
                              data-popup={`Bayar Angsuran ke-${inst.installmentNumber}`}
                              onClick={() => {
                                setSelectedLoan(null);
                                navigateToPayment({
                                  customerId: inst.customerId,
                                  loanId: inst.loanId,
                                  installmentId: inst.id,
                                });
                              }}
                              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-teal-700 text-white text-xs font-semibold flex items-center gap-1"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Bayar</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Kredit Barang / Pinjaman Uang Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {loanType === 'barang'
                  ? 'Form Tambah Kredit Barang'
                  : 'Form Tambah Pinjaman Uang'}
              </h3>
              <button
                type="button"
                data-popup="Tutup Form Kredit"
                onClick={() => setFormOpen(false)}
                className="p-2 rounded-xl bg-slate-100 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Switch Type */}
            <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                data-popup="Pilih Jenis Kredit Barang"
                onClick={() => {
                  setLoanType('barang');
                  if (itemName === 'Pinjaman Uang Tunai') setItemName('');
                }}
                className={`py-2.5 rounded-xl text-xs font-bold transition ${
                  loanType === 'barang'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-700'
                }`}
              >
                A. Kredit Barang
              </button>
              <button
                type="button"
                data-popup="Pilih Jenis Pinjaman Uang"
                onClick={() => {
                  setLoanType('uang');
                  if (!itemName) setItemName('Pinjaman Uang Tunai');
                }}
                className={`py-2.5 rounded-xl text-xs font-bold transition ${
                  loanType === 'uang'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700'
                }`}
              >
                B. Pinjaman Uang
              </button>
            </div>

            {customers.length === 0 ? (
              <div className="mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                Belum ada data nasabah. Silakan tambahkan nasabah terlebih
                dahulu di menu <strong>Nasabah</strong>.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Nasabah *
                  </label>
                  <select
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:border-teal-600"
                  >
                    <option value="">-- Pilih Nasabah --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone}) - {c.code}
                      </option>
                    ))}
                  </select>
                </div>

                {loanType === 'barang' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Barang *
                      </label>
                      <input
                        type="text"
                        required
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        placeholder="Contoh: TV Samsung 43 Inch / HP Redmi"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Kategori Barang
                      </label>
                      <select
                        value={itemCategory}
                        onChange={(e) => setItemCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                      >
                        <option value="Elektronik">Elektronik</option>
                        <option value="HP & Gadget">HP & Gadget</option>
                        <option value="Perabot / Furniture">
                          Perabot / Furniture
                        </option>
                        <option value="Kendaraan">Kendaraan</option>
                        <option value="Alat Usaha">Alat Usaha</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Harga Barang (Rp) *
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          value={itemPriceStr}
                          onChange={(e) =>
                            setItemPriceStr(
                              e.target.value.replace(/[^0-9]/g, '')
                            )
                          }
                          placeholder="3000000"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-num"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Uang Muka / DP (Rp)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={downPaymentStr}
                          onChange={(e) =>
                            setDownPaymentStr(
                              e.target.value.replace(/[^0-9]/g, '')
                            )
                          }
                          placeholder="500000"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-num"
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                      <span className="text-slate-600">
                        Jumlah yang Dibiayai (Harga - DP):
                      </span>
                      <strong className="font-mono-num text-sm text-slate-900">
                        {formatRupiah(previewCalc.principal)}
                      </strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Keterangan / Judul Pinjaman
                      </label>
                      <input
                        type="text"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        placeholder="Contoh: Pinjaman Modal Usaha"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Jumlah Pinjaman Uang (Rp) *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={itemPriceStr}
                        onChange={(e) =>
                          setItemPriceStr(e.target.value.replace(/[^0-9]/g, ''))
                        }
                        placeholder="2000000"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-num"
                      />
                    </div>
                  </>
                )}

                {/* Bunga / Keuntungan */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Bunga / Keuntungan Usaha
                    </label>
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px]">
                      <button
                        type="button"
                        data-popup="Input Bunga Persen (%)"
                        onClick={() => setInterestMode('percent')}
                        className={`px-2 py-1 rounded-md font-semibold ${
                          interestMode === 'percent'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        Persen (%)
                      </button>
                      <button
                        type="button"
                        data-popup="Input Bunga Nominal (Rp)"
                        onClick={() => setInterestMode('nominal')}
                        className={`px-2 py-1 rounded-md font-semibold ${
                          interestMode === 'nominal'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        Nominal (Rp)
                      </button>
                    </div>
                  </div>

                  {interestMode === 'percent' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={interestRateStr}
                        onChange={(e) => setInterestRateStr(e.target.value)}
                        className="w-28 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-num"
                      />
                      <span className="text-xs text-slate-600">
                        % ={' '}
                        <strong className="font-mono-num text-slate-900">
                          {formatRupiah(previewCalc.interestAmount)}
                        </strong>
                      </span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      inputMode="numeric"
                      value={interestNominalStr}
                      onChange={(e) =>
                        setInterestNominalStr(
                          e.target.value.replace(/[^0-9]/g, '')
                        )
                      }
                      placeholder="Masukkan nominal keuntungan (Rp)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-num"
                    />
                  )}
                </div>

                {/* Tenor & Periode */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tenor (Kali Angsuran) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="360"
                      required
                      value={tenorStr}
                      onChange={(e) => setTenorStr(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Periode Pembayaran
                    </label>
                    <select
                      value={period}
                      onChange={(e) =>
                        setPeriod(e.target.value as PaymentPeriod)
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                    >
                      <option value="bulanan">Bulanan</option>
                      <option value="mingguan">Mingguan</option>
                      <option value="harian">Harian</option>
                    </select>
                  </div>
                </div>

                {/* Tanggal Mulai / Pencairan & Jatuh Tempo Pertama */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {loanType === 'barang'
                        ? 'Tanggal Mulai'
                        : 'Tanggal Pencairan'}
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Jatuh Tempo Pertama
                    </label>
                    <input
                      type="date"
                      required
                      value={firstDueDate}
                      onChange={(e) => setFirstDueDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                {/*Foto Barang (khusus kredit barang) */}
                {loanType === 'barang' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Foto Barang (Opsional)
                    </label>
                    <div className="flex items-center gap-3">
                      {photoUrl && (
                        <img
                          src={photoUrl}
                          alt="Preview Barang"
                          className="w-14 h-14 rounded-2xl object-cover border border-slate-200"
                        />
                      )}
                      <label className="flex-1 min-h-[42px] px-3 py-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 cursor-pointer">
                        <Camera className="w-4 h-4 text-teal-700" />
                        <span>
                          {photoUrl ? 'Ganti Foto Barang' : 'Upload Foto Barang'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catatan
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan tambahan (opsional)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                {/* Automatic Calculation & Schedule Summary Box */}
                <div className="p-4 rounded-2xl bg-teal-950 text-white space-y-2">
                  <div className="text-xs text-teal-200 font-semibold">
                    Ringkasan Perhitungan Otomatis
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Total Kewajiban:</span>
                    <strong className="font-mono-num text-base text-white">
                      {formatRupiah(previewCalc.totalObligation)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">
                      Nominal Angsuran ({previewCalc.tenor}x {period}):
                    </span>
                    <strong className="font-mono-num text-base text-teal-300">
                      {formatRupiah(previewCalc.installmentAmount)} / {period}
                    </strong>
                  </div>
                  {previewCalc.dates.length > 0 && (
                    <div className="pt-2 border-t border-teal-800/80 text-[11px] text-teal-200">
                      Jadwal: Angsuran 1 (
                      {formatIndonesianDate(previewCalc.dates[0])}) s/d Angsuran{' '}
                      {previewCalc.dates.length} (
                      {formatIndonesianDate(
                        previewCalc.dates[previewCalc.dates.length - 1]
                      )}
                      )
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    data-popup="Batal Buat Kredit"
                    onClick={() => setFormOpen(false)}
                    className="flex-1 min-h-[46px] py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    data-popup="Simpan Transaksi & Jadwal Angsuran"
                    disabled={saving}
                    className="flex-1 min-h-[46px] py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 disabled:opacity-60"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Transaksi'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
