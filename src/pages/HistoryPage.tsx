import React, { useMemo, useState } from 'react';
import { History, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  formatIndonesianDate,
  formatRupiah,
  getDaysDiffFromToday,
} from '../utils/formatters';

type HistoryCategory =
  | 'semua'
  | 'kredit'
  | 'pinjaman'
  | 'pembayaran'
  | 'tunggakan'
  | 'audit';

export const HistoryPage: React.FC = () => {
  const { customers, loans, installments, payments, auditLogs } = useApp();

  const [category, setCategory] = useState<HistoryCategory>('semua');
  const [selectedCustomerId, setSelectedCustomerId] = useState('semua');
  const [dateFilter, setDateFilter] = useState('');

  const unifiedRows = useMemo(() => {
    const activeLoanIds = new Set(
      loans.filter((l) => l.status === 'aktif').map((l) => l.id)
    );

    const items: {
      id: string;
      dateStr: string;
      displayDate: string;
      customerId: string;
      customerName: string;
      category: HistoryCategory;
      typeLabel: string;
      amount: number;
      description: string;
      status: string;
    }[] = [];

    // 1. Kredit Barang & Pinjaman Uang
    for (const l of loans) {
      items.push({
        id: `loan_${l.id}`,
        dateStr: l.startDate,
        displayDate: formatIndonesianDate(l.startDate),
        customerId: l.customerId,
        customerName: l.customerName,
        category: l.type === 'barang' ? 'kredit' : 'pinjaman',
        typeLabel:
          l.type === 'barang' ? 'Kredit Barang' : 'Pinjaman Uang',
        amount: l.totalObligation,
        description: `${l.code} — ${l.itemName} (${l.tenor}x ${l.period})`,
        status: l.status.toUpperCase(),
      });
    }

    // 2. Pembayaran
    for (const p of payments) {
      items.push({
        id: `pay_${p.id}`,
        dateStr: p.paymentDate.slice(0, 10),
        displayDate: formatIndonesianDate(p.paymentDate),
        customerId: p.customerId,
        customerName: p.customerName,
        category: 'pembayaran',
        typeLabel: 'Pembayaran',
        amount: p.amount,
        description: `${p.code} — ${p.loanItemName} (Angsuran ke-${
          p.installmentNumber
        })${p.voidReason ? ` [Void: ${p.voidReason}]` : ''}`,
        status: p.status === 'void' ? 'VOID' : 'BERHASIL',
      });
    }

    // 3. Tunggakan
    for (const inst of installments) {
      if (
        activeLoanIds.has(inst.loanId) &&
        inst.status !== 'lunas' &&
        inst.remainingAmount > 0 &&
        getDaysDiffFromToday(inst.dueDate) < 0
      ) {
        items.push({
          id: `ovd_${inst.id}`,
          dateStr: inst.dueDate,
          displayDate: formatIndonesianDate(inst.dueDate),
          customerId: inst.customerId,
          customerName: inst.customerName,
          category: 'tunggakan',
          typeLabel: 'Tunggakan',
          amount: inst.remainingAmount,
          description: `${inst.loanItemName} — Angsuran ke-${
            inst.installmentNumber
          } (Terlambat ${Math.abs(getDaysDiffFromToday(inst.dueDate))} hari)`,
          status: 'TERLAMBAT',
        });
      }
    }

    return items
      .filter((row) => {
        if (category !== 'semua' && category !== 'audit' && row.category !== category) {
          return false;
        }
        if (
          selectedCustomerId !== 'semua' &&
          row.customerId !== selectedCustomerId
        ) {
          return false;
        }
        if (dateFilter && row.dateStr !== dateFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }, [
    loans,
    payments,
    installments,
    category,
    selectedCustomerId,
    dateFilter,
  ]);

  return (
    <div className="space-y-4">
      {/* Header & Filter Bar */}
      <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Riwayat Transaksi & Audit Log
          </h1>
          <p className="text-xs text-slate-500">
            Rekam jejak seluruh transaksi kredit, pinjaman, pembayaran,
            tunggakan, dan aktivitas sistem
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(
            [
              { id: 'semua', label: 'Semua Transaksi' },
              { id: 'kredit', label: 'Kredit Barang' },
              { id: 'pinjaman', label: 'Pinjaman Uang' },
              { id: 'pembayaran', label: 'Pembayaran' },
              { id: 'tunggakan', label: 'Tunggakan' },
              { id: 'audit', label: 'Audit Log Sistem' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-popup={`Filter Riwayat ${tab.label}`}
              onClick={() => setCategory(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                category === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Customer & Date Filter */}
        {category !== 'audit' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Filter Nasabah
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white"
              >
                <option value="semua">Semua Nasabah</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Filter Tanggal Spesifik
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm"
                />
                {dateFilter && (
                  <button
                    type="button"
                    data-popup="Reset Filter Tanggal"
                    onClick={() => setDateFilter('')}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Audit Log View vs Unified Transaction History View */}
      {category === 'audit' ? (
        <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>Audit Log Aktivitas Penting ({auditLogs.length})</span>
          </div>
          {auditLogs.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 text-center text-xs text-slate-500">
              Belum ada catatan audit log.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 first:pt-0 last:pb-0 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="font-mono-num">{log.timestampStr}</span>
                    <span
                      className={`font-bold ${
                        log.status === 'Void'
                          ? 'text-rose-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      Status: {log.status}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {log.action.replace(/_/g, ' ')}
                    {log.amount > 0 ? ` — ${formatRupiah(log.amount)}` : ''}
                  </div>
                  {log.customerName && (
                    <div className="text-slate-700">
                      Nasabah: <strong>{log.customerName}</strong>
                      {log.loanTitle ? ` · Kredit: ${log.loanTitle}` : ''}
                    </div>
                  )}
                  <div className="text-slate-600 mt-0.5">{log.description}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <History className="w-4 h-4 text-teal-700" />
            <span>Daftar Riwayat Transaksi ({unifiedRows.length})</span>
          </div>

          {unifiedRows.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 text-center text-xs text-slate-500">
              Tidak ada riwayat transaksi yang sesuai dengan filter.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {unifiedRows.map((row) => (
                <div
                  key={row.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{row.displayDate}</span>
                      <span>·</span>
                      <span className="font-semibold text-teal-800">
                        {row.typeLabel}
                      </span>
                      <span>·</span>
                      <span
                        className={`font-bold ${
                          row.status === 'VOID' || row.status === 'TERLAMBAT'
                            ? 'text-rose-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {row.status}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {row.customerName}
                    </div>
                    <div className="text-xs text-slate-600">
                      {row.description}
                    </div>
                  </div>
                  <div className="font-mono-num text-sm font-bold text-slate-900 shrink-0">
                    {formatRupiah(row.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
