export type MonthName =
  | 'Jan'
  | 'Feb'
  | 'Mar'
  | 'Apr'
  | 'May'
  | 'Jun'
  | 'Jul'
  | 'Aug'
  | 'Sep'
  | 'Oct'
  | 'Nov'
  | 'Dec';

export const ALL_MONTHS: MonthName[] = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export interface MonthPayment {
  amount: number;
  status: 'PAID' | 'UNPAID';
  paymentDate: string | null;
}

export interface RegisterMember {
  id: string;
  name: string;
  monthlyAmount: number;
  months: Record<MonthName, MonthPayment>;
}

export interface MonthlyBreakdownItem {
  expected: number;
  collected: number;
  pending: number;
}

export interface RegisterSummary {
  year: number;
  totalMembers: number;
  totalExpectedYear: number;
  totalCollectedYear: number;
  totalPendingYear: number;
  monthlyBreakdown: Record<MonthName, MonthlyBreakdownItem>;
}

export interface RegisterData {
  year: number;
  members: RegisterMember[];
  summary: RegisterSummary;
  syncStatus: 'CONNECTED' | 'NOT_CONFIGURED' | 'LOCAL_ONLY' | 'ERROR';
  syncError: string | null;
  lastSyncedAt: string | null;
}

export interface PaymentRecord {
  id: string;
  memberId: string;
  name: string;
  month: MonthName;
  year: number;
  amount: number;
  status: 'PAID' | 'UNPAID';
  paymentDate: string;
}

export interface GoogleSheetsStatus {
  connected: boolean;
  type?: string;
  appsScriptUrl?: string;
  title?: string;
  sheets?: string[];
  spreadsheetId?: string;
  message?: string;
  configured?: boolean;
  error?: string;
}
