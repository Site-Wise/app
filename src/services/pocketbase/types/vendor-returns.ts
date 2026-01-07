import type { Vendor } from './vendor';
import type { User } from './user';
import type { DeliveryItem } from './delivery';
import type { Account } from './account';
import type { Payment } from './payment';

export interface VendorReturn {
  id?: string;
  vendor: string; // Vendor ID
  return_date: string;
  reason: 'damaged' | 'wrong_item' | 'excess_delivery' | 'quality_issue' | 'specification_mismatch' | 'other';
  status: 'initiated' | 'approved' | 'rejected' | 'completed' | 'refunded';
  processing_option?: 'credit_note' | 'refund'; // Choice between credit note or direct refund
  notes?: string;
  photos?: string[]; // Array of photo filenames
  approval_notes?: string;
  approved_by?: string; // User ID who approved/rejected
  approved_at?: string;
  total_return_amount: number; // Total amount to be refunded
  actual_refund_amount?: number; // Actual refunded amount (might be different due to deductions)
  completion_date?: string;
  site: string; // Site ID
  created?: string;
  updated?: string;
  expand?: {
    vendor?: Vendor;
    approved_by?: User;
  };
}

export interface VendorReturnItem {
  id?: string;
  vendor_return: string; // VendorReturn ID
  delivery_item: string; // DeliveryItem ID being returned
  quantity_returned: number;
  return_rate: number; // Rate per unit for return calculation
  return_amount: number; // quantity_returned * return_rate
  condition: 'unopened' | 'opened' | 'damaged' | 'used';
  item_notes?: string;
  site: string; // Site ID
  created?: string;
  updated?: string;
  expand?: {
    vendor_return?: VendorReturn;
    delivery_item?: DeliveryItem;
  };
}

export interface VendorRefund {
  id?: string;
  vendor_return: string; // VendorReturn ID
  vendor: string; // Vendor ID
  account: string; // Account ID for refund processing
  refund_amount: number;
  refund_date: string;
  refund_method: 'cash' | 'bank_transfer' | 'cheque' | 'adjustment' | 'other';
  reference?: string; // Transaction reference
  notes?: string;
  processed_by?: string; // User ID who processed the refund
  site: string; // Site ID
  created?: string;
  updated?: string;
  expand?: {
    vendor_return?: VendorReturn;
    vendor?: Vendor;
    account?: Account;
    processed_by?: User;
  };
}

export interface VendorCreditNote {
  id: string;
  vendor: string; // Vendor ID
  credit_amount: number; // Original credit amount
  balance: number; // Remaining balance
  issue_date: string;
  expiry_date?: string; // Optional expiry date
  reference?: string; // Reference number for the credit note
  reason: string; // Reason for credit note issuance
  return_id?: string; // Related VendorReturn ID if applicable
  status: 'active' | 'fully_used' | 'expired' | 'cancelled';
  site: string; // Site ID
  created?: string;
  updated?: string;
  expand?: {
    vendor?: Vendor;
    return?: VendorReturn;
  };
}

export interface CreditNoteUsage {
  id?: string;
  credit_note: string; // VendorCreditNote ID
  used_amount: number;
  used_date: string;
  payment: string; // Required - Payment ID (credit notes now go through payments)
  vendor: string; // Vendor ID for quick filtering
  description?: string; // Description of usage
  site: string; // Site ID
  created?: string;
  updated?: string;
  expand?: {
    credit_note?: VendorCreditNote;
    payment?: Payment;
  };
}
