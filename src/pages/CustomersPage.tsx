import React, { useMemo, useState } from 'react';
import {
  Camera,
  ChevronRight,
  CreditCard,
  Edit3,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';
import {
  buildWhatsAppUrl,
  compressImageFile,
  formatIndonesianDate,
  formatRupiah,
  getDaysDiffFromToday,
  getTodayDateStr,
} from '../utils/formatters';

export const CustomersPage: React.FC = () => {
  const {
    customers,
    loans,
    installments,
    settings,
    addCustomer,
    updateCustomer,
    softDeleteCustomer,
    setActiveTab,
    setSelectedCustomerForLoan,
    navigateToPayment,
    showToast,
  } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'semua' | 'aktif' | 'nonaktif'>('semua');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state (Strictly NO NIK and NO Pekerjaan as required by Section 4)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'aktif' | 'nonaktif'>('aktif');
  const [saving, setSaving] = useState(false);

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setAddress('');
    setPhotoUrl('');
    setNotes('');
    setStatus('aktif');
    setFormOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setAddress(c.address);
    setPhotoUrl(c.photoUrl);
    setNotes(c.notes);
    setStatus(c.status);
    setFormOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 400);
      setPhotoUrl(compressed);
      showToast('Foto nasabah siap disimpan.', 'info');
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses foto nasabah.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Nama lengkap nasabah wajib diisi.', 'error');
      return;
    }
    if (phone.trim().length < 5) {
      showToast('Nomor HP nasabah wajib diisi dengan benar.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, {
          name,
          phone,
          address,
          photoUrl,
          notes,
          status,
        });
        if (selectedCustomer?.id === editingCustomer.id) {
          setSelectedCustomer({
            ...editingCustomer,
            name,
            phone,
            address,
            photoUrl,
            notes,
            status,
          });
        }
      } else {
        await addCustomer({
          name,
          phone,
          address,
          photoUrl,
          notes,
          status,
        });
      }
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (statusFilter !== 'semua' && c.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
      );
    });
  }, [customers, search, statusFilter]);

  const getCustomerSummary = (customerId: string) => {
    const custLoans = loans.filter((l) => l.customerId === customerId);
    const activeLoans = custLoans.filter((l) => l.status === 'aktif');
    const totalRemaining = activeLoans.reduce(
      (sum, l) => sum + l.remainingBalance,
      0
    );
    const activeLoanIds = new Set(activeLoans.map((l) => l.id));
    const custOverdue = installments
      .filter(
        (i) =>
          activeLoanIds.has(i.loanId) &&
          i.status !== 'lunas' &&
          i.remainingAmount > 0 &&
          getDaysDiffFromToday(i.dueDate) < 0
      )
      .reduce((sum, i) => sum + i.remainingAmount, 0);

    return {
      custLoans,
      activeCount: activeLoans.length,
      totalRemaining,
      custOverdue,
    };
  };

  return (
    <div className="space-y-4">
      {/* Header & Add Button */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Data Nasabah</h1>
          <p className="text-xs text-slate-500">
            Satu nasabah dapat memiliki beberapa kredit barang & pinjaman uang
          </p>
        </div>
        <button
          type="button"
          data-popup="Tambah Nasabah Baru"
          onClick={openAddModal}
          className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-teal-700 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 hover:bg-teal-800 active:scale-95 transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Nasabah</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama nasabah, nomor HP, kode NSB..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-teal-600"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(['semua', 'aktif', 'nonaktif'] as const).map((st) => (
            <button
              key={st}
              type="button"
              data-popup={`Filter Nasabah ${st}`}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold capitalize transition ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {st === 'semua'
                ? `Semua (${customers.length})`
                : st === 'aktif'
                ? 'Aktif'
                : 'Nonaktif'}
            </button>
          ))}
        </div>
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center">
          <div className="text-sm font-bold text-slate-800">
            Belum ada data nasabah yang sesuai
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tekan tombol Tambah Nasabah untuk mulai mencatat pelanggan baru.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredCustomers.map((c) => {
            const summary = getCustomerSummary(c.id);
            const waUrl = buildWhatsAppUrl({
              phone: c.phone,
              template:
                summary.custOverdue > 0
                  ? settings.waTemplateOverdue
                  : settings.waTemplateDue,
              nama: c.name,
              angsuran: summary.custOverdue || summary.totalRemaining,
              tanggal: getTodayDateStr(),
              jenisKredit: 'Kredit / Pinjaman',
              sisaHutang: summary.totalRemaining,
              jumlahTunggakan: summary.custOverdue,
            });

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-teal-600 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    data-popup={`Detail Nasabah ${c.name}`}
                    onClick={() => setSelectedCustomer(c)}
                    className="flex items-start gap-3 text-left min-w-0 flex-1"
                  >
                    {c.photoUrl ? (
                      <img
                        src={c.photoUrl}
                        alt={c.name}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 font-bold text-base flex items-center justify-center shrink-0">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono-num">{c.code}</span>
                        <span>·</span>
                        <span
                          className={
                            c.status === 'aktif'
                              ? 'text-emerald-700 font-semibold'
                              : 'text-slate-400'
                          }
                        >
                          {c.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      <div className="text-sm sm:text-base font-bold text-slate-900 truncate mt-0.5">
                        {c.name}
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.phone}</span>
                        {c.address && (
                          <>
                            <span>·</span>
                            <span className="truncate">{c.address}</span>
                          </>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="text-slate-600">
                          Kredit Aktif:{' '}
                          <strong className="text-slate-900">
                            {summary.activeCount}
                          </strong>
                        </span>
                        <span>·</span>
                        <span className="text-slate-600">
                          Sisa Hutang:{' '}
                          <strong className="font-mono-num text-slate-900">
                            {formatRupiah(summary.totalRemaining)}
                          </strong>
                        </span>
                        {summary.custOverdue > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-rose-600 font-semibold">
                              Tunggakan:{' '}
                              <span className="font-mono-num">
                                {formatRupiah(summary.custOverdue)}
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-popup={`Chat WA ${c.name}`}
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-700 transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Chat WA</span>
                    </a>
                    <button
                      type="button"
                      data-popup={`Lihat Rincian ${c.name}`}
                      onClick={() => setSelectedCustomer(c)}
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 hover:bg-slate-200 transition"
                    >
                      <span>Rincian</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer Detail Sheet / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                {selectedCustomer.photoUrl ? (
                  <img
                    src={selectedCustomer.photoUrl}
                    alt={selectedCustomer.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 font-bold text-lg flex items-center justify-center">
                    {selectedCustomer.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-xs text-slate-500 font-mono-num">
                    {selectedCustomer.code} · Dibuat{' '}
                    {formatIndonesianDate(selectedCustomer.createdDate)}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedCustomer.name}
                  </h3>
                  <div className="text-xs text-slate-600">
                    {selectedCustomer.phone}
                  </div>
                </div>
              </div>
              <button
                type="button"
                data-popup="Tutup Detail Nasabah"
                onClick={() => setSelectedCustomer(null)}
                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const summary = getCustomerSummary(selectedCustomer.id);
              const waUrl = buildWhatsAppUrl({
                phone: selectedCustomer.phone,
                template:
                  summary.custOverdue > 0
                    ? settings.waTemplateOverdue
                    : settings.waTemplateDue,
                nama: selectedCustomer.name,
                angsuran: summary.custOverdue || summary.totalRemaining,
                tanggal: getTodayDateStr(),
                jenisKredit: 'Kredit / Pinjaman',
                sisaHutang: summary.totalRemaining,
                jumlahTunggakan: summary.custOverdue,
              });

              return (
                <div className="mt-4 space-y-4">
                  <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-xs space-y-1.5">
                    <div>
                      <span className="text-slate-500">Alamat:</span>{' '}
                      <strong className="text-slate-800">
                        {selectedCustomer.address || '-'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Catatan:</span>{' '}
                      <strong className="text-slate-800">
                        {selectedCustomer.notes || '-'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">
                        Total Sisa Kewajiban:
                      </span>{' '}
                      <strong className="font-mono-num text-slate-900">
                        {formatRupiah(summary.totalRemaining)}
                      </strong>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-popup={`Chat WhatsApp ${selectedCustomer.name}`}
                      className="min-h-[44px] px-3 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-emerald-700"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Chat WhatsApp</span>
                    </a>
                    <button
                      type="button"
                      data-popup={`Tambah Kredit untuk ${selectedCustomer.name}`}
                      onClick={() => {
                        setSelectedCustomerForLoan(selectedCustomer.id);
                        setSelectedCustomer(null);
                        setActiveTab('loans');
                      }}
                      className="min-h-[44px] px-3 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-teal-800"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Kredit/Pinjaman</span>
                    </button>
                    <button
                      type="button"
                      data-popup={`Edit Nasabah ${selectedCustomer.name}`}
                      onClick={() => openEditModal(selectedCustomer)}
                      className="min-h-[44px] px-3 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-200"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit Data</span>
                    </button>
                    <button
                      type="button"
                      data-popup={`Arsipkan Nasabah ${selectedCustomer.name}`}
                      onClick={() => setConfirmDeleteId(selectedCustomer.id)}
                      className="min-h-[44px] px-3 py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-rose-100"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Arsipkan</span>
                    </button>
                  </div>

                  {confirmDeleteId === selectedCustomer.id && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
                      <div className="font-bold">
                        Yakin ingin mengarsipkan nasabah {selectedCustomer.name}
                        ?
                      </div>
                      <p>
                        Data tidak dihapus permanen (soft delete) agar riwayat
                        audit tetap aman.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          data-popup="Konfirmasi Arsipkan Nasabah"
                          onClick={async () => {
                            await softDeleteCustomer(selectedCustomer.id);
                            setConfirmDeleteId(null);
                            setSelectedCustomer(null);
                          }}
                          className="px-3 py-2 rounded-xl bg-rose-600 text-white font-semibold"
                        >
                          Ya, Arsipkan
                        </button>
                        <button
                          type="button"
                          data-popup="Batal Arsipkan"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List of Customer's Loans (Kredit Barang & Pinjaman Uang) */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-2">
                      Daftar Kredit Barang & Pinjaman Uang (
                      {summary.custLoans.length})
                    </h4>
                    {summary.custLoans.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-slate-50 text-xs text-slate-500 text-center">
                        Nasabah ini belum memiliki transaksi kredit atau
                        pinjaman.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {summary.custLoans.map((l) => (
                          <div
                            key={l.id}
                            className="p-3.5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-[11px] text-slate-500">
                                {l.code} ·{' '}
                                {l.type === 'barang'
                                  ? 'Kredit Barang'
                                  : 'Pinjaman Uang'}{' '}
                                ·{' '}
                                <span
                                  className={
                                    l.status === 'lunas'
                                      ? 'text-emerald-700 font-bold'
                                      : 'text-teal-700 font-bold'
                                  }
                                >
                                  {l.status.toUpperCase()}
                                </span>
                              </div>
                              <div className="text-sm font-bold text-slate-900 truncate">
                                {l.itemName}
                              </div>
                              <div className="text-xs text-slate-600 font-mono-num mt-0.5">
                                Total: {formatRupiah(l.totalObligation)} · Sisa:{' '}
                                <strong>
                                  {formatRupiah(l.remainingBalance)}
                                </strong>
                              </div>
                            </div>
                            {l.status === 'aktif' && (
                              <button
                                type="button"
                                data-popup={`Bayar ${l.itemName}`}
                                onClick={() => {
                                  setSelectedCustomer(null);
                                  navigateToPayment({
                                    customerId: l.customerId,
                                    loanId: l.id,
                                  });
                                }}
                                className="min-h-[40px] px-3 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold flex items-center gap-1 shrink-0"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Bayar</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Add / Edit Customer Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingCustomer ? 'Edit Data Nasabah' : 'Tambah Nasabah Baru'}
              </h3>
              <button
                type="button"
                data-popup="Tutup Form Nasabah"
                onClick={() => setFormOpen(false)}
                className="p-2 rounded-xl bg-slate-100 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Nasabah *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor HP / WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Tempat Tinggal
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat lengkap nasabah..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Nasabah
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as 'aktif' | 'nonaktif')
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:border-teal-600"
                >
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Foto Nasabah (Opsional)
                </label>
                <div className="flex items-center gap-3">
                  {photoUrl && (
                    <img
                      src={photoUrl}
                      alt="Preview"
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200"
                    />
                  )}
                  <label className="flex-1 min-h-[44px] px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-100">
                    <Camera className="w-4 h-4 text-teal-700" />
                    <span>
                      {photoUrl ? 'Ganti Foto Nasabah' : 'Ambil / Pilih Foto'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {photoUrl && (
                    <button
                      type="button"
                      data-popup="Hapus Foto Nasabah"
                      onClick={() => setPhotoUrl('')}
                      className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Tambahan
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan opsional..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  data-popup="Batal Simpan Nasabah"
                  onClick={() => setFormOpen(false)}
                  className="flex-1 min-h-[46px] py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-popup="Simpan Data Nasabah"
                  disabled={saving}
                  className="flex-1 min-h-[46px] py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 disabled:opacity-60"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Nasabah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
