import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  MessageCircle,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Payment } from '../types';
import {
  buildWhatsAppUrl,
  formatIndonesianDate,
  formatRupiah,
  getInstallmentDisplayStatus,
  getTodayDateStr,
  parseRupiahInput,
} from '../utils/formatters';

export const PaymentsPage: React.FC = () => {
  const {
    customers,
    loans,
    installments,
    payments,
    settings,
    paymentTarget,
    clearPaymentTarget,
    recordPayment,
    voidPayment,
  } = useApp();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [selectedInstallmentId, setSelectedInstallmentId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayDateStr());
  const [method, setMethod] = useState<'tunai' | 'transfer' | 'lainnya'>(
    'tunai'
  );
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [lastSavedPayment, setLastSavedPayment] = useState<Payment | null>(
    null
  );
  const [searchHistory, setSearchHistory] = useState('');
  const [voidTarget, setVoidTarget] = useState<Payment | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidSubmitting, setVoidSubmitting] = useState(false);

  // Active customers who have active loans
  const activeCustomersWithLoans = useMemo(() => {
    const custIdsWithActiveLoan = new Set(
      loans.filter((l) => l.status === 'aktif').map((l) => l.customerId)
    );
    return customers.filter((c) => custIdsWithActiveLoan.has(c.id));
  }, [customers, loans]);

  // Loans for selected customer
  const customerActiveLoans = useMemo(() => {
    if (!selectedCustomerId) return [];
    return loans.filter(
      (l) => l.customerId === selectedCustomerId && l.status === 'aktif'
    );
  }, [loans, selectedCustomerId]);

  // Unpaid installments for selected loan
  const loanUnpaidInstallments = useMemo(() => {
    if (!selectedLoanId) return [];
    return installments
      .filter(
        (i) =>
          i.loanId === selectedLoanId &&
          i.status !== 'lunas' &&
          i.remainingAmount > 0
      )
      .sort((a, b) => a.installmentNumber - b.installmentNumber);
  }, [installments, selectedLoanId]);

  const currentInstallment = useMemo(
    () =>
      loanUnpaidInstallments.find((i) => i.id === selectedInstallmentId) ||
      null,
    [loanUnpaidInstallments, selectedInstallmentId]
  );

  // Pre-fill when navigated from "Bayar" button elsewhere
  useEffect(() => {
    if (paymentTarget) {
      const { customerId, loanId, installmentId } = paymentTarget;
      if (customerId) setSelectedCustomerId(customerId);
      if (loanId) setSelectedLoanId(loanId);
      if (installmentId) {
        setSelectedInstallmentId(installmentId);
        const inst = installments.find((i) => i.id === installmentId);
        if (inst) {
          setAmountStr(String(inst.remainingAmount));
        }
      }
      clearPaymentTarget();
    }
  }, [paymentTarget, installments, clearPaymentTarget]);

  // Auto-select first loan when customer changes
  useEffect(() => {
    if (!selectedCustomerId) {
      setSelectedLoanId('');
      return;
    }
    if (
      customerActiveLoans.length > 0 &&
      !customerActiveLoans.some((l) => l.id === selectedLoanId)
    ) {
      setSelectedLoanId(customerActiveLoans[0].id);
    }
  }, [selectedCustomerId, customerActiveLoans, selectedLoanId]);

  // Auto-select earliest unpaid installment when loan changes
  useEffect(() => {
    if (!selectedLoanId) {
      setSelectedInstallmentId('');
      setAmountStr('');
      return;
    }
    if (
      loanUnpaidInstallments.length > 0 &&
      !loanUnpaidInstallments.some((i) => i.id === selectedInstallmentId)
    ) {
      const firstInst = loanUnpaidInstallments[0];
      setSelectedInstallmentId(firstInst.id);
      setAmountStr(String(firstInst.remainingAmount));
    }
  }, [selectedLoanId, loanUnpaidInstallments, selectedInstallmentId]);

  const handleInstallmentChange = (instId: string) => {
    setSelectedInstallmentId(instId);
    const found = loanUnpaidInstallments.find((i) => i.id === instId);
    if (found) {
      setAmountStr(String(found.remainingAmount));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedLoanId || !selectedInstallmentId) {
      return;
    }
    const numericAmount = parseRupiahInput(amountStr);
    setSaving(true);
    try {
      const saved = await recordPayment({
        loanId: selectedLoanId,
        installmentId: selectedInstallmentId,
        amount: numericAmount,
        paymentDate,
        method,
        notes,
      });
      setLastSavedPayment(saved);
      setNotes('');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTarget) return;
    setVoidSubmitting(true);
    try {
      await voidPayment(voidTarget.id, voidReason);
      setVoidTarget(null);
      setVoidReason('');
    } finally {
      setVoidSubmitting(false);
    }
  };

  const filteredPayments = useMemo(() => {
    if (!searchHistory.trim()) return payments;
    const q = searchHistory.toLowerCase();
    return payments.filter(
      (p) =>
        p.customerName.toLowerCase().includes(q) ||
        p.loanItemName.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q)
    );
  }, [payments, searchHistory]);

  return (
    <div className="space-y-5">
      {/* Main Payment Input Card */}
      <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="p-2.5 rounded-2xl bg-teal-50 text-teal-700">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Input Pembayaran Angsuran
            </h1>
            <p className="text-xs text-slate-500">
              Pilih nasabah → pilih kredit/pinjaman → pilih angsuran → simpan
            </p>
          </div>
        </div>

        {/* Last Payment Receipt & WhatsApp Confirmation */}
        {lastSavedPayment && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Pembayaran berhasil disimpan!</span>
              </div>
              <button
                type="button"
                data-popup="Tutup Bukti Bayar"
                onClick={() => setLastSavedPayment(null)}
                className="text-emerald-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-emerald-900 space-y-0.5">
              <div>
                No. Kwitansi: <strong>{lastSavedPayment.code}</strong> ·
                Nasabah: <strong>{lastSavedPayment.customerName}</strong>
              </div>
              <div>
                Transaksi: <strong>{lastSavedPayment.loanItemName}</strong>{' '}
                (Angsuran ke-{lastSavedPayment.installmentNumber}) · Dibayar:{' '}
                <strong className="font-mono-num">
                  {formatRupiah(lastSavedPayment.amount)}
                </strong>
              </div>
            </div>
            {(() => {
              const cust = customers.find(
                (c) => c.id === lastSavedPayment.customerId
              );
              const loan = loans.find((l) => l.id === lastSavedPayment.loanId);
              if (!cust) return null;
              const waPaidUrl = buildWhatsAppUrl({
                phone: cust.phone,
                template: settings.waTemplatePaid,
                nama: cust.name,
                angsuran: lastSavedPayment.amount,
                tanggal: lastSavedPayment.paymentDate,
                jenisKredit: lastSavedPayment.loanItemName,
                sisaHutang: loan ? loan.remainingBalance : 0,
                jumlahTunggakan: 0,
              });
              return (
                <a
                  href={waPaidUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-popup={`Kirim Bukti WA ke ${cust.name}`}
                  className="w-full min-h-[42px] py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Kirim Bukti Pembayaran via WhatsApp</span>
                </a>
              );
            })()}
          </div>
        )}

        {activeCustomersWithLoans.length === 0 ? (
          <div className="mt-4 p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-sm font-semibold text-slate-800">
              Belum ada kredit barang atau pinjaman uang yang aktif
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Tambahkan transaksi kredit/pinjaman terlebih dahulu pada menu
              Kredit.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Step 1: Pilih Nasabah */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                1. Pilih Nasabah *
              </label>
              <select
                required
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:border-teal-600"
              >
                <option value="">-- Pilih Nasabah --</option>
                {activeCustomersWithLoans.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Pilih Kredit / Pinjaman */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                2. Pilih Kredit Barang / Pinjaman Uang *
              </label>
              <select
                required
                disabled={!selectedCustomerId}
                value={selectedLoanId}
                onChange={(e) => setSelectedLoanId(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm bg-white disabled:bg-slate-100 focus:outline-none focus:border-teal-600"
              >
                <option value="">-- Pilih Kredit / Pinjaman --</option>
                {customerActiveLoans.map((l) => (
                  <option key={l.id} value={l.id}>
                    [{l.type === 'barang' ? 'BARANG' : 'UANG'}] {l.itemName} —
                    Sisa Hutang: {formatRupiah(l.remainingBalance)}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 3: Pilih Angsuran */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                3. Pilih Jadwal Angsuran *
              </label>
              <select
                required
                disabled={!selectedLoanId}
                value={selectedInstallmentId}
                onChange={(e) => handleInstallmentChange(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm bg-white disabled:bg-slate-100 focus:outline-none focus:border-teal-600"
              >
                <option value="">-- Pilih Angsuran --</option>
                {loanUnpaidInstallments.map((inst) => {
                  const st = getInstallmentDisplayStatus(inst);
                  return (
                    <option key={inst.id} value={inst.id}>
                      Angsuran ke-{inst.installmentNumber} (
                      {formatIndonesianDate(inst.dueDate)}) — Sisa:{' '}
                      {formatRupiah(inst.remainingAmount)} [{st}]
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Selected Installment Info Box */}
            {currentInstallment && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Angsuran:</span>
                  <strong className="text-teal-800">
                    {getInstallmentDisplayStatus(currentInstallment)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal Jatuh Tempo:</span>
                  <strong className="text-slate-900">
                    {formatIndonesianDate(currentInstallment.dueDate)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Sisa Tagihan Angsuran ke-
                    {currentInstallment.installmentNumber}:
                  </span>
                  <strong className="font-mono-num text-sm text-rose-700">
                    {formatRupiah(currentInstallment.remainingAmount)}
                  </strong>
                </div>
              </div>
            )}

            {/* Step 4: Jumlah Pembayaran */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  4. Jumlah Pembayaran (Rp) *
                </label>
                {currentInstallment && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      data-popup="Isi Nominal Penuh"
                      onClick={() =>
                        setAmountStr(String(currentInstallment.remainingAmount))
                      }
                      className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200"
                    >
                      Bayar Penuh (
                      {formatRupiah(currentInstallment.remainingAmount)})
                    </button>
                    <button
                      type="button"
                      data-popup="Isi Setengah Tagihan"
                      onClick={() =>
                        setAmountStr(
                          String(
                            Math.round(currentInstallment.remainingAmount / 2)
                          )
                        )
                      }
                      className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
                    >
                      50%
                    </button>
                  </div>
                )}
              </div>
              <input
                type="text"
                inputMode="numeric"
                required
                value={amountStr}
                onChange={(e) =>
                  setAmountStr(e.target.value.replace(/[^0-9]/g, ''))
                }
                placeholder="Masukkan jumlah uang diterima (Rp)"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-bold font-mono-num focus:outline-none focus:border-teal-600"
              />
              {amountStr && (
                <div className="text-xs text-slate-500 mt-1">
                  Nominal dibaca:{' '}
                  <strong className="font-mono-num text-slate-900">
                    {formatRupiah(parseRupiahInput(amountStr))}
                  </strong>
                </div>
              )}
            </div>

            {/* Tanggal & Metode Pembayaran */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Bayar
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={method}
                  onChange={(e) =>
                    setMethod(
                      e.target.value as 'tunai' | 'transfer' | 'lainnya'
                    )
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white"
                >
                  <option value="tunai">Tunai / Cash</option>
                  <option value="transfer">Transfer Bank / E-Wallet</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Pembayaran (Opsional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Diterima tunai di toko"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <button
              type="submit"
              data-popup="Simpan Pembayaran"
              disabled={saving || !currentInstallment}
              className="w-full min-h-[50px] py-3.5 rounded-2xl bg-teal-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-teal-800 active:scale-[0.99] transition disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4" />
              <span>
                {saving ? 'Menyimpan Pembayaran...' : 'Simpan Pembayaran'}
              </span>
            </button>
          </form>
        )}
      </section>

      {/* Riwayat Pembayaran & Koreksi / Void (Section 9) */}
      <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Daftar Pembayaran & Koreksi (Void)
            </h2>
            <p className="text-xs text-slate-500">
              Riwayat pembayaran tidak dihapus permanen. Gunakan Koreksi/Void
              jika salah input.
            </p>
          </div>
          <div className="relative sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
              placeholder="Cari kode PAY, nasabah..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-teal-600"
            />
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 text-center text-xs text-slate-500">
            Belum ada riwayat pembayaran yang tercatat.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredPayments.slice(0, 25).map((p) => {
              const isVoid = p.status === 'void';
              return (
                <div
                  key={p.id}
                  className={`py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isVoid ? 'opacity-65' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono-num font-bold text-slate-700">
                        {p.code}
                      </span>
                      <span>·</span>
                      <span>{formatIndonesianDate(p.paymentDate)}</span>
                      <span>·</span>
                      <span
                        className={`font-bold ${
                          isVoid ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {isVoid ? 'VOID / DIKOREKSI' : 'BERHASIL'}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {p.customerName} —{' '}
                      <span
                        className={`font-mono-num ${
                          isVoid
                            ? 'line-through text-slate-400'
                            : 'text-emerald-700'
                        }`}
                      >
                        {formatRupiah(p.amount)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      {p.loanItemName} (Angsuran ke-{p.installmentNumber}) ·
                      Metode: <span className="capitalize">{p.method}</span>
                      {p.notes ? ` · Catatan: ${p.notes}` : ''}
                    </div>
                    {isVoid && p.voidReason && (
                      <div className="text-xs text-rose-700 mt-1 font-medium">
                        Alasan Koreksi/Void: {p.voidReason} ({p.voidedAt})
                      </div>
                    )}
                  </div>

                  {!isVoid && (
                    <button
                      type="button"
                      data-popup={`Koreksi / Void ${p.code}`}
                      onClick={() => {
                        setVoidTarget(p);
                        setVoidReason('');
                      }}
                      className="self-start sm:self-center min-h-[38px] px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-100 shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Koreksi / Void</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Void / Correction Confirmation Modal */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-base">
                <AlertTriangle className="w-5 h-5" />
                <span>Koreksi / Void Pembayaran</span>
              </div>
              <button
                type="button"
                data-popup="Tutup Modal Void"
                onClick={() => setVoidTarget(null)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmVoid} className="mt-4 space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div>
                  No. Transaksi: <strong>{voidTarget.code}</strong>
                </div>
                <div>
                  Nasabah: <strong>{voidTarget.customerName}</strong>
                </div>
                <div>
                  Kredit/Pinjaman: <strong>{voidTarget.loanItemName}</strong>{' '}
                  (Angsuran ke-{voidTarget.installmentNumber})
                </div>
                <div>
                  Nominal:{' '}
                  <strong className="font-mono-num text-sm">
                    {formatRupiah(voidTarget.amount)}
                  </strong>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Sesuai standar keamanan keuangan, transaksi tidak dihapus
                permanen melainkan ditandai sebagai <strong>VOID</strong> dan
                sisa hutang nasabah akan dikembalikan secara otomatis.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Koreksi / Void (Wajib diisi) *
                </label>
                <textarea
                  rows={2}
                  required
                  minLength={3}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Contoh: Salah ketik nominal pembayaran"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  data-popup="Batal Void"
                  onClick={() => setVoidTarget(null)}
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-popup="Konfirmasi Koreksi / Void"
                  disabled={voidSubmitting}
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-60"
                >
                  {voidSubmitting ? 'Memproses...' : 'Proses Koreksi / Void'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
