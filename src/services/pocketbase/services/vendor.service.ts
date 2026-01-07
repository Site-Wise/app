import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { Vendor, Delivery, ServiceBooking, Payment } from '../types';
import { mapRecordToVendor } from './mappers';

// Forward references to avoid circular dependencies
let deliveryServiceRef: { getAll: () => Promise<Delivery[]> } | null = null;
let serviceBookingServiceRef: { getAll: () => Promise<ServiceBooking[]>; calculateProgressBasedAmount: (booking: ServiceBooking) => number } | null = null;
let paymentServiceRef: { getAll: () => Promise<Payment[]> } | null = null;

export function setVendorServiceDependencies(deps: {
  deliveryService: { getAll: () => Promise<Delivery[]> };
  serviceBookingService: { getAll: () => Promise<ServiceBooking[]>; calculateProgressBasedAmount: (booking: ServiceBooking) => number };
  paymentService: { getAll: () => Promise<Payment[]> };
}) {
  deliveryServiceRef = deps.deliveryService;
  serviceBookingServiceRef = deps.serviceBookingService;
  paymentServiceRef = deps.paymentService;
}

export class VendorService {
  async getAll(): Promise<Vendor[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('vendors').getFullList({
      filter: `site="${siteId}"`
    });
    return records.map(record => mapRecordToVendor(record));
  }

  async getById(id: string): Promise<Vendor | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('vendors').getOne(id, {
        filter: `site="${siteId}"`
      });
      return mapRecordToVendor(record);
    } catch (error) {
      return null;
    }
  }

  async create(data: Omit<Vendor, 'id' | 'site'>): Promise<Vendor> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create vendors');
    }

    const record = await pb.collection('vendors').create({
      ...data,
      site: siteId
    });
    return mapRecordToVendor(record);
  }

  async update(id: string, data: Partial<Vendor>): Promise<Vendor> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update vendors');
    }

    const record = await pb.collection('vendors').update(id, data);
    return mapRecordToVendor(record);
  }

  async delete(id: string): Promise<boolean> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete vendors');
    }

    await pb.collection('vendors').delete(id);
    return true;
  }

  async calculateOutstandingAmount(vendorId: string): Promise<number> {
    const siteId = getCurrentSiteId();
    if (!siteId) return 0;

    if (!deliveryServiceRef || !serviceBookingServiceRef || !paymentServiceRef) {
      throw new Error('VendorService dependencies not initialized. Call setVendorServiceDependencies first.');
    }

    // Get all deliveries for this vendor
    const deliveries = await deliveryServiceRef.getAll();
    const deliveriesTotal = deliveries
      .filter(delivery => delivery.vendor === vendorId)
      .reduce((sum, delivery) => sum + delivery.total_amount, 0);

    // Get all service bookings for this vendor
    const serviceBookings = await serviceBookingServiceRef.getAll();
    const serviceBookingsTotal = serviceBookings
      .filter(booking => booking.vendor === vendorId)
      .reduce((sum, booking) => sum + serviceBookingServiceRef!.calculateProgressBasedAmount(booking), 0);

    // Get all payments for this vendor
    const payments = await paymentServiceRef.getAll();
    const totalPaid = payments
      .filter(payment => payment.vendor === vendorId)
      .reduce((sum, payment) => sum + payment.amount, 0);

    // Outstanding = Total Due - Total Paid
    const totalDue = deliveriesTotal + serviceBookingsTotal;
    const outstanding = totalDue - totalPaid;

    return outstanding > 0 ? outstanding : 0;
  }

  async calculateTotalPaid(vendorId: string): Promise<number> {
    const siteId = getCurrentSiteId();
    if (!siteId) return 0;

    if (!paymentServiceRef) {
      throw new Error('VendorService dependencies not initialized. Call setVendorServiceDependencies first.');
    }

    const payments = await paymentServiceRef.getAll();
    return payments
      .filter(payment => payment.vendor === vendorId)
      .reduce((sum, payment) => sum + payment.amount, 0);
  }

  // Synchronous calculation methods for use with existing data
  static calculateOutstandingFromData(
    vendorId: string,
    deliveries: Delivery[],
    serviceBookings: ServiceBooking[],
    payments: Payment[]
  ): number {
    // Calculate total amount due from deliveries
    const deliveriesTotal = deliveries
      .filter(delivery => delivery.vendor === vendorId)
      .reduce((sum, delivery) => sum + delivery.total_amount, 0);

    // Calculate total amount due from service bookings based on progress percentage
    const serviceBookingsTotal = serviceBookings
      .filter(booking => booking.vendor === vendorId)
      .reduce((sum, booking) => sum + VendorService.calculateProgressBasedAmount(booking), 0);

    // Calculate total payments made to this vendor
    const totalPaid = payments
      .filter(payment => payment.vendor === vendorId)
      .reduce((sum, payment) => sum + payment.amount, 0);

    // Outstanding = Total Due - Total Paid
    const totalDue = deliveriesTotal + serviceBookingsTotal;
    const outstanding = totalDue - totalPaid;

    return outstanding > 0 ? outstanding : 0;
  }

  static calculateTotalPaidFromData(vendorId: string, payments: Payment[]): number {
    return payments
      .filter(payment => payment.vendor === vendorId)
      .reduce((sum, payment) => sum + payment.amount, 0);
  }

  // Helper method to calculate progress-based amount from service bookings
  private static calculateProgressBasedAmount(serviceBooking: ServiceBooking): number {
    return (serviceBooking.total_amount * (serviceBooking.percent_completed || 0)) / 100;
  }
}

export const vendorService = new VendorService();
