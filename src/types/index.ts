export type PaymentPeriod = 'harian' | 'mingguan' | 'bulanan';
export type RoundingRule = 'none' | '100' | '500' | '1000';
export type LoanType = 'barang' | 'uang';
export type LoanStatus = 'aktif' | 'lunas' | 'dibatalkan';
export type InstallmentStoredStatus = 'belum_bayar' | 'sebagian' | 'lunas' | 'dibatalkan';
export type InstallmentDisplayStatus =
  | 'Belum jatuh tempo'
  | 'Jatuh tempo hari ini'
  | 'Terlambat'
  | 'Dibayar sebagian'
  | 'Lunas';

export interface UserProfile {
  ownerId: string;
  email: string;
  displayName: string;
  photoUrl: string;
  lastLoginAt: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AppSettings {
  ownerId: string;
  businessName: string;
  ownerName: string;
  whatsappNumber: string;
  businessAddress: string;
  businessLogoUrl: string;
  defaultInterestRate: number;
  defaultTenor: number;
  defaultPeriod: PaymentPeriod;
  roundingRule: RoundingRule;
  notifH7: boolean;
  notifH3: boolean;
  notifH1: boolean;
  notifHariH: boolean;
  notifOverdue: boolean;
  pushEnabled: boolean;
  waTemplateDue: string;
  waTemplateOverdue: string;
  waTemplatePaid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Customer {
  id: string;
  ownerId: string;
  code: string;
  name: string;
  phone: string;
  address: string;
  photoUrl: string;
  notes: string;
  status: 'aktif' | 'nonaktif';
  isDeleted: boolean;
  createdDate: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Loan {
  id: string;
  ownerId: string;
  code: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  type: LoanType;
  itemName: string;
  itemCategory: string;
  itemPrice: number;
  downPayment: number;
  principalAmount: number;
  interestRate: number;
  interestAmount: number;
  totalObligation: number;
  tenor: number;
  period: PaymentPeriod;
  installmentAmount: number;
  paidAmount: number;
  remainingBalance: number;
  startDate: string;
  firstDueDate: string;
  status: LoanStatus;
  notes: string;
  photoUrl: string;
  isDeleted: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Installment {
  id: string;
  ownerId: string;
  loanId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  loanType: LoanType;
  loanItemName: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: InstallmentStoredStatus;
  paidAt: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Payment {
  id: string;
  ownerId: string;
  code: string;
  loanId: string;
  installmentId: string;
  installmentNumber: number;
  customerId: string;
  customerName: string;
  loanType: LoanType;
  loanItemName: string;
  amount: number;
  paymentDate: string;
  method: 'tunai' | 'transfer' | 'lainnya';
  status: 'valid' | 'void';
  voidReason: string;
  voidedAt: string;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AppNotification {
  id: string;
  ownerId: string;
  installmentId: string;
  loanId: string;
  customerId: string;
  customerName: string;
  type: 'H-7' | 'H-3' | 'H-1' | 'HARI_H' | 'TUNGGAKAN' | 'SISTEM';
  title: string;
  body: string;
  dueDate: string;
  amount: number;
  isRead: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuditLog {
  id: string;
  ownerId: string;
  action: string;
  entityType: 'auth' | 'customer' | 'loan' | 'payment' | 'settings' | 'data';
  entityId: string;
  customerName: string;
  loanTitle: string;
  amount: number;
  status: 'Berhasil' | 'Void' | 'Info';
  description: string;
  timestampStr: string;
  createdAt?: unknown;
}

export interface OfflineQueueItem {
  id: string;
  timestamp: string;
  description: string;
  status: 'pending' | 'failed';
  errorMsg?: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'customers'
  | 'loans'
  | 'payments'
  | 'duedates'
  | 'reports'
  | 'history'
  | 'guide'
  | 'settings';
