import type { Vendor } from './vendor';
import type { Account } from './account';
import type { Delivery } from './delivery';
import type { ServiceBooking } from './service';
import type { VendorCreditNote } from './vendor-returns';

export interface Payment {
  id?: string;
  vendor: string;
  account: string; // Account ID for payment mode
  amount: number;
  payment_date: string;
  reference?: string;
  notes?: string;
  deliveries: string[]; // Multi-item deliveries
  service_bookings: string[]; // New field for service payments
  credit_notes?: string[]; // Credit notes used in this payment
  payment_allocations?: string[]; // Payment allocation IDs for expand functionality
  site: string; // Site ID
  created?: string;
  updated?: string;
  running_balance?: number; // Calculated field for account statements
  expand?: {
    vendor?: Vendor;
    account?: Account;
    deliveries?: Delivery[];
    service_bookings?: ServiceBooking[];
    payment_allocations?: PaymentAllocation[];
    credit_notes?: VendorCreditNote[];
  };
}

export interface PaymentAllocation {
  id?: string;
  payment: string; // Payment ID
  delivery?: string; // Delivery ID (optional)
  service_booking?: string; // ServiceBooking ID (optional)
  allocated_amount: number; // Amount allocated to this delivery/booking
  site: string; // Site ID
  created?: string;
  updated?: string;
  expand?: {
    payment?: Payment;
    delivery?: Delivery;
    service_booking?: ServiceBooking;
  };
}
