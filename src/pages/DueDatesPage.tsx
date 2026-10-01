import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  buildWhatsAppUrl,
  formatIndonesianDate,
  formatRupiah,
  getDaysDiffFromToday,
  getInstallmentDisplayStatus,
} from '../utils/formatters';

export const DueDatesPage: React.FC = () => {
  const { loans, installments, settings, navigateToPayment } = useApp();

  const [mainSection, setMainSection] = useState<
    'hari_ini' | 'terlambat' | 'mendatang'
  >('hari_ini');
  const [upcomingRange, setUpcomingRange] = useState<1 | 3 | 7 | 30>(7);

  const activeLoansMap = useMemo(() => {
    const map = new Map<string, typeof loans[0]>();
    for (const l of loans) {
      if (l.status === 'aktif') {
        map.set(l.id, l);
      }
    }
    return map;
  }, [loans]);

  const categorized = useMemo(() => {
    const unpaid = installments.filter(
      (i) =>
        activeLoansMap.has(i.loanId) &&
        i.status !== 'lunas' &&
        i.remainingAmount > 0
    );

    const todayList = unpaid.filter(
      (i) => getDaysDiffFromToday(i.dueDate) === 0
    );

    const overdueList = unpaid
      .filter((i) => getDaysDiffFromToday(i.dueDate) < 0)
      .sort(
        (a, b) =>
          getDaysDiffFromToday(a.dueDate) - getDaysDiffFromToday(b.dueDate)
      );

    const upcomingList = unpaid
      .filter((i) => {
        const diff = getDaysDiffFromToday(i.dueDate);
        if (upcomingRange === 1) return diff === 1;
        return diff >= 1 && diff <= upcomingRange;
      })
      .sort(
        (a, b) =>
          getDaysDiffFromToday(a.dueDate) - getDaysDiffFromToday(b.dueDate)
      );

    // Calculate customer total overdue for TERLAMBAT view
    const customerArrearsMap = new Map<string, number>();
    for (const item of overdueList) {
      customerArrearsMap.set(
        item.customerId,
        (customerArrearsMap.get(item.customerId) || 0) + item.remainingAmount
      );
    }

    return {
      todayList,
      overdueList,
      upcomingList,
      customerArrearsMap,
    };
  }, [installments, activeLoansMap, upcomingRange]);

  const currentList =
    mainSection === 'hari_ini'
      ? categorized.todayList
      : mainSection === 'terlambat'
      ? categorized.overdueList
      : categorized.upcomingList;

  return (
    <div className="space-y-4">
      {/* Header & Section Switcher (HARI INI, TERLAMBAT, MENDATANG) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Jadwal Jatuh Tempo & Tunggakan
          </h1>
          <p className="text-xs text-slate-500">
            Pantau cicilan hari ini, keterlambatan, dan jadwal mendatang beserta
            tombol Chat WhatsApp otomatis
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button
            type="button"
            data-popup="Tab Jatuh Tempo Hari Ini"
            onClick={() => setMainSection('hari_ini')}
            className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center ${
              mainSection === 'hari_ini'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <span>HARI INI</span>
            <span className="text-[11px] font-mono-num mt-0.5">
              ({categorized.todayList.length})
            </span>
          </button>

          <button
            type="button"
            data-popup="Tab Angsuran Terlambat"
            onClick={() => setMainSection('terlambat')}
            className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center ${
              mainSection === 'terlambat'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <span>TERLAMBAT</span>
            <span className="text-[11px] font-mono-num mt-0.5">
              ({categorized.overdueList.length})
            </span>
          </button>

          <button
            type="button"
            data-popup="Tab Jatuh Tempo Mendatang"
            onClick={() => setMainSection('mendatang')}
            className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center ${
              mainSection === 'mendatang'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <span>MENDATANG</span>
            <span className="text-[11px] font-mono-num mt-0.5">
              ({categorized.upcomingList.length})
            </span>
          </button>
        </div>

        {/* Sub-filter for MENDATANG: Besok, 3 hari, 7 hari, 30 hari */}
        {mainSection === 'mendatang' && (
          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
            {(
              [
                { days: 1, label: 'Besok (H+1)' },
                { days: 3, label: '3 Hari' },
                { days: 7, label: '7 Hari' },
                { days: 30, label: '30 Hari' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.days}
                type="button"
                data-popup={`Filter Mendatang ${opt.label}`}
                onClick={() => setUpcomingRange(opt.days)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  upcomingRange === opt.days
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List Content */}
      {currentList.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center">
          <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
          <div className="mt-2 text-sm font-bold text-slate-800">
            {mainSection === 'hari_ini'
              ? 'Tidak ada angsuran yang jatuh tempo hari ini'
              : mainSection === 'terlambat'
              ? 'Tidak ada angsuran yang terlambat / menunggak'
              : `Tidak ada angsuran jatuh tempo dalam ${
                  upcomingRange === 1 ? 'besok' : `${upcomingRange} hari ke depan`
                }`}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Semua data tagihan nasabah selalu diperbarui secara otomatis.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {currentList.map((inst) => {
            const loan = activeLoansMap.get(inst.loanId);
            const daysDiff = getDaysDiffFromToday(inst.dueDate);
            const isOverdue = daysDiff < 0;
            const lateDays = Math.abs(daysDiff);
            const dispStatus = getInstallmentDisplayStatus(inst);
            const totalCustomerArrears =
              categorized.customerArrearsMap.get(inst.customerId) ||
              inst.remainingAmount;

            const waUrl = buildWhatsAppUrl({
              phone: inst.customerPhone,
              template: isOverdue
                ? settings.waTemplateOverdue
                : settings.waTemplateDue,
              nama: inst.customerName,
              angsuran: inst.remainingAmount,
              tanggal: inst.dueDate,
              jenisKredit: `${
                inst.loanType === 'barang' ? 'Kredit Barang' : 'Pinjaman Uang'
              } (${inst.loanItemName})`,
              sisaHutang: loan ? loan.remainingBalance : inst.remainingAmount,
              jumlahTunggakan: isOverdue
                ? totalCustomerArrears
                : inst.remainingAmount,
            });

            return (
              <div
                key={inst.id}
                className={`bg-white rounded-2xl p-4 border shadow-xs ${
                  isOverdue
                    ? 'border-rose-200'
                    : daysDiff === 0
                    ? 'border-amber-300'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-base font-bold text-slate-900">
                        {inst.customerName}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <Phone className="w-3 h-3" />
                        {inst.customerPhone}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700">
                      Jenis Kredit:{' '}
                      <strong>
                        {inst.loanType === 'barang'
                          ? 'Kredit Barang'
                          : 'Pinjaman Uang'}{' '}
                        — {inst.loanItemName}
                      </strong>{' '}
                      · Angsuran ke-<strong>{inst.installmentNumber}</strong>
                    </div>

                    {isOverdue ? (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs pt-1">
                        <span className="text-rose-700 font-bold inline-flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Terlambat {lateDays} Hari (Jatuh tempo:{' '}
                          {formatIndonesianDate(inst.dueDate)})
                        </span>
                        <span>·</span>
                        <span className="text-slate-700">
                          Tagihan Angsuran Ini:{' '}
                          <strong className="font-mono-num text-rose-700">
                            {formatRupiah(inst.remainingAmount)}
                          </strong>
                        </span>
                        <span>·</span>
                        <span className="text-slate-700">
                          Total Tunggakan Nasabah:{' '}
                          <strong className="font-mono-num text-rose-800">
                            {formatRupiah(totalCustomerArrears)}
                          </strong>
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs pt-1">
                        <span className="text-slate-600 inline-flex items-center gap-1">
                          <CalendarClock className="w-3.5 h-3.5 text-teal-700" />
                          Jatuh Tempo:{' '}
                          <strong>{formatIndonesianDate(inst.dueDate)}</strong>
                          {daysDiff > 0 ? ` (${daysDiff} hari lagi)` : ''}
                        </span>
                        <span>·</span>
                        <span className="text-slate-700">
                          Nominal:{' '}
                          <strong className="font-mono-num text-slate-900">
                            {formatRupiah(inst.remainingAmount)}
                          </strong>
                        </span>
                        <span>·</span>
                        <span className="font-semibold text-amber-800">
                          Status: {dispStatus}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons: Chat WhatsApp & Bayar */}
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-popup={`Chat WhatsApp ${inst.customerName}`}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-700 transition"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Chat WhatsApp</span>
                    </a>
                    <button
                      type="button"
                      data-popup={`Bayar Tagihan ${inst.customerName}`}
                      onClick={() =>
                        navigateToPayment({
                          customerId: inst.customerId,
                          loanId: inst.loanId,
                          installmentId: inst.id,
                        })
                      }
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-teal-800 transition"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Bayar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
