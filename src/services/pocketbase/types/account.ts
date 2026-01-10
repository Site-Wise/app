import type { Vendor } from './vendor';
import type { VendorRefund } from './vendor-returns';

export interface Account {
  id?: string;
  name: string;
  type: 'bank' | 'credit_card' | 'cash' | 'digital_wallet' | 'other';
  account_number?: string;
  bank_name?: string;
  description?: string;
  is_active: boolean;
  opening_balance: number;
  current_balance: number;
  site: string; // Site ID
  created?: string;
  updated?: string;
}

export interface AccountTransaction {
  id?: string;
  account: string; // Account ID
  type: 'credit' | 'debit';
  amount: number;
  transaction_date: string;
  description: string;
  reference?: string;
  notes?: string;
  vendor?: string; // Vendor ID (optional, for payment-related transactions)
  payment?: string; // Payment ID (optional, for debit transactions linked to payments)
  vendor_refund?: string; // VendorRefund ID (optional, for credit transactions linked to vendor refunds)
  transaction_category?: 'payment' | 'refund' | 'credit_adjustment' | 'manual'; // Category of transaction
  site: string; // Site ID
  created?: string;
  updated?: string;
  expand?: {
    account?: Account;
    vendor?: Vendor;
    payment?: import('./payment').Payment;
    vendor_refund?: VendorRefund;
  };
}
