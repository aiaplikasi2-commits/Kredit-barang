import {
  AppSettings,
  Customer,
  Installment,
  InstallmentDisplayStatus,
  Loan,
  Payment,
  PaymentPeriod,
  RoundingRule,
} from '../types';

export const OFFICIAL_ICON_URL = '/pwa-512x512.png';
export const FALLBACK_DRIVE_ICON_URL =
  'https://lh3.googleusercontent.com/d/1XbkSh2jhOubELGwC0TkjlePP2NrnQgfW';

/**
 * Format integer/number into Indonesian Rupiah string without floating point errors.
 */
export function formatRupiah(value: number): string {
  const safeInt = Math.round(Number.isFinite(value) ? value : 0);
  return 'Rp' + safeInt.toLocaleString('id-ID');
}

/**
 * Parse digits from user input string into safe integer.
 */
export function parseRupiahInput(raw: string): number {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return 0;
  const num = parseInt(digits, 10);
  return Number.isSafeInteger(num) ? num : 0;
}

/**
 * Get today's local date in YYYY-MM-DD format.
 */
export function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format YYYY-MM-DD into human-readable Indonesian date (e.g. "10 Oktober 2026").
 */
export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '-';
  const clean = dateStr.split(' ')[0].split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || monthIdx < 0 || monthIdx > 11 || isNaN(day)) return dateStr;
  return `${String(day).padStart(2, '0')} ${months[monthIdx]} ${year}`;
}

/**
 * Format current date & time into Indonesian audit string (e.g. "01 Oktober 2026 08:30").
 */
export function getNowAuditString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${formatIndonesianDate(`${y}-${m}-${d}`)} ${hh}:${mm}`;
}

/**
 * Calculate difference in days between target YYYY-MM-DD and today YYYY-MM-DD.
 * Positive = in the future (e.g., +3 means 3 days from now).
 * 0 = today.
 * Negative = overdue in the past (e.g., -5 means 5 days late).
 */
export function getDaysDiffFromToday(dueDateStr: string): number {
  const todayStr = getTodayDateStr();
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const cleanDue = dueDateStr.split(' ')[0].split('T')[0];
  const [dy, dm, dd] = cleanDue.split('-').map(Number);
  if (!dy || !dm || !dd) return 0;
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const dueUtc = Date.UTC(dy, dm - 1, dd);
  return Math.round((dueUtc - todayUtc) / (1000 * 60 * 60 * 24));
}

/**
 * Apply rounding rule to an installment amount using safe integer math.
 */
export function applyInstallmentRounding(
  rawAmount: number,
  rule: RoundingRule
): number {
  const safe = Math.round(rawAmount);
  if (rule === 'none' || safe <= 0) return safe;
  const unit = parseInt(rule, 10);
  if (!unit || unit <= 0) return safe;
  return Math.ceil(safe / unit) * unit;
}

/**
 * Compute loan financials safely using integer arithmetic.
 */
export function calculateLoanFinancials(params: {
  itemPrice: number;
  downPayment: number;
  interestAmount: number;
  tenor: number;
  roundingRule: RoundingRule;
}) {
  const price = Math.max(0, Math.round(params.itemPrice));
  const dp = Math.max(0, Math.min(price, Math.round(params.downPayment)));
  const principalAmount = price - dp;
  const interestAmount = Math.max(0, Math.round(params.interestAmount));
  const baseTotalObligation = principalAmount + interestAmount;
  const safeTenor = Math.max(1, Math.min(360, Math.round(params.tenor)));

  const rawInstallment = baseTotalObligation / safeTenor;
  const installmentAmount = applyInstallmentRounding(
    rawInstallment,
    params.roundingRule
  );

  // Build schedule amounts so sum of installments == totalObligation
  const scheduleAmounts: number[] = [];
  if (params.roundingRule === 'none') {
    const basePerInst = Math.floor(baseTotalObligation / safeTenor);
    const remainder = baseTotalObligation - basePerInst * safeTenor;
    for (let i = 0; i < safeTenor; i++) {
      scheduleAmounts.push(i === 0 ? basePerInst + remainder : basePerInst);
    }
  } else {
    for (let i = 0; i < safeTenor; i++) {
      scheduleAmounts.push(installmentAmount);
    }
  }

  const totalObligation = scheduleAmounts.reduce((acc, v) => acc + v, 0);

  return {
    principalAmount,
    interestAmount,
    totalObligation,
    installmentAmount,
    scheduleAmounts,
  };
}

/**
 * Generate due dates for each installment starting from firstDueDate.
 */
export function generateDueDates(
  firstDueDateStr: string,
  tenor: number,
  period: PaymentPeriod
): string[] {
  const dates: string[] = [];
  const [y, m, d] = firstDueDateStr.split('-').map(Number);
  const start = new Date(y, (m || 1) - 1, d || 1);

  for (let i = 0; i < tenor; i++) {
    const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    if (period === 'harian') {
      dt.setDate(dt.getDate() + i);
    } else if (period === 'mingguan') {
      dt.setDate(dt.getDate() + i * 7);
    } else {
      // bulanan
      const targetMonth = start.getMonth() + i;
      const temp = new Date(start.getFullYear(), targetMonth, 1);
      const maxDayInMonth = new Date(
        temp.getFullYear(),
        temp.getMonth() + 1,
        0
      ).getDate();
      temp.setDate(Math.min(start.getDate(), maxDayInMonth));
      dt.setTime(temp.getTime());
    }
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    dates.push(`${yy}-${mm}-${dd}`);
  }
  return dates;
}

/**
 * Determine the automatic 5-state installment display status required by spec Section 8:
 * - Belum jatuh tempo
 * - Jatuh tempo hari ini
 * - Terlambat
 * - Dibayar sebagian
 * - Lunas
 */
export function getInstallmentDisplayStatus(
  inst: Pick<Installment, 'status' | 'paidAmount' | 'remainingAmount' | 'dueDate'>
): InstallmentDisplayStatus {
  if (inst.status === 'lunas' || inst.remainingAmount <= 0) {
    return 'Lunas';
  }
  if (inst.paidAmount > 0 && inst.remainingAmount > 0) {
    return 'Dibayar sebagian';
  }
  const diff = getDaysDiffFromToday(inst.dueDate);
  if (diff < 0) {
    return 'Terlambat';
  }
  if (diff === 0) {
    return 'Jatuh tempo hari ini';
  }
  return 'Belum jatuh tempo';
}

/**
 * Normalize Indonesian phone number to international format (628...) for WhatsApp links.
 */
export function normalizePhoneForWA(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) {
    return '62' + digits.slice(1);
  }
  if (digits.startsWith('8')) {
    return '62' + digits;
  }
  return digits;
}

/**
 * Build WhatsApp chat URL with automatic template placeholder replacement.
 * Required placeholders:
 * {nama}, {angsuran}, {tanggal}, {jenis_kredit}, {sisa_hutang}, {jumlah_tunggakan}
 */
export function buildWhatsAppUrl(params: {
  phone: string;
  template: string;
  nama: string;
  angsuran: number;
  tanggal: string;
  jenisKredit: string;
  sisaHutang: number;
  jumlahTunggakan: number;
}): string {
  const cleanPhone = normalizePhoneForWA(params.phone);
  const text = params.template
    .replace(/\{nama\}/g, params.nama || '-')
    .replace(/\{angsuran\}/g, formatRupiah(params.angsuran || 0))
    .replace(/\{tanggal\}/g, formatIndonesianDate(params.tanggal || ''))
    .replace(/\{jenis_kredit\}/g, params.jenisKredit || '-')
    .replace(/\{sisa_hutang\}/g, formatRupiah(params.sisaHutang || 0))
    .replace(/\{jumlah_tunggakan\}/g, formatRupiah(params.jumlahTunggakan || 0));

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Compress an uploaded image File into a small base64 JPEG data URL (< 120KB)
 * so it can be stored reliably in Firestore and work offline.
 */
export function compressImageFile(file: File, maxDim = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak didukung.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal memproses gambar.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Default Settings generator for a newly logged-in business owner.
 */
export function getDefaultSettings(
  ownerId: string,
  ownerName: string
): AppSettings {
  return {
    ownerId,
    businessName: 'Usaha KreditKu',
    ownerName: ownerName || 'Pemilik Usaha',
    whatsappNumber: '',
    businessAddress: '',
    businessLogoUrl: '',
    defaultInterestRate: 10,
    defaultTenor: 6,
    defaultPeriod: 'bulanan',
    roundingRule: '1000',
    notifH7: true,
    notifH3: true,
    notifH1: true,
    notifHariH: true,
    notifOverdue: true,
    pushEnabled: false,
    waTemplateDue:
      'Halo {nama}, kami mengingatkan bahwa angsuran {jenis_kredit} Anda sebesar {angsuran} jatuh tempo pada {tanggal}. Sisa kewajiban saat ini: {sisa_hutang}. Terima kasih.',
    waTemplateOverdue:
      'Halo {nama}, angsuran {jenis_kredit} Anda telah melewati jatuh tempo ({tanggal}) dengan total tunggakan sebesar {jumlah_tunggakan}. Mohon segera melakukan pembayaran. Sisa hutang: {sisa_hutang}. Terima kasih.',
    waTemplatePaid:
      'Terima kasih {nama}, pembayaran angsuran {jenis_kredit} sebesar {angsuran} pada {tanggal} telah kami terima. Sisa kewajiban Anda saat ini: {sisa_hutang}.',
  };
}

/**
 * Generate a safe Firestore ID matching ^[a-zA-Z0-9_\-]+$
 */
export function generateSafeId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${Date.now()}_${rand}`;
}

/**
 * Export tabular rows to CSV file download.
 */
export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };
  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join(
      '\r\n'
    );
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export tabular rows to Excel (.xls HTML Workbook) file download so Android/Desktop Excel opens it cleanly with formatting.
 */
export function downloadExcel(
  filename: string,
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const escapeHtml = (val: string | number) =>
    String(val ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8" />
      <style>
        table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11pt; }
        th { background-color: #0f766e; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
        td { border: 1px solid #cbd5e1; padding: 6px 8px; }
        .title { font-size: 14pt; font-weight: bold; color: #0f172a; }
        .sub { font-size: 10pt; color: #475569; }
      </style>
    </head>
    <body>
      <div class="title">${escapeHtml(title)}</div>
      <div class="sub">${escapeHtml(subtitle)}</div>
      <br/>
      <table>
        <thead>
          <tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) =>
                `<tr>${r.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
            )
            .join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download full JSON backup of all user data.
 */
export function downloadBackupJSON(data: {
  exportedAt: string;
  ownerId: string;
  settings: AppSettings;
  customers: Customer[];
  loans: Loan[];
  installments: Installment[];
  payments: Payment[];
}) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `KreditKu_Backup_${getTodayDateStr()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
