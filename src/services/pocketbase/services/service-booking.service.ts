import type { RecordModel } from 'pocketbase';
import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { ServiceBooking } from '../types';
import { mapRecordToServiceBooking } from './mappers';

// Forward reference to paymentAllocationService
let paymentAllocationServiceRef: { getByServiceBooking: (bookingId: string) => Promise<any[]> } | null = null;

export function setServiceBookingServiceDependencies(deps: { paymentAllocationService: typeof paymentAllocationServiceRef }) {
  paymentAllocationServiceRef = deps.paymentAllocationService;
}

export class ServiceBookingService {
  async getAll(): Promise<ServiceBooking[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('service_bookings').getFullList({
      filter: `site="${siteId}"`,
      expand: 'vendor,service'
    });
    return records.map(record => mapRecordToServiceBooking(record));
  }

  async getById(id: string): Promise<ServiceBooking | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('service_bookings').getOne(id, {
        filter: `site="${siteId}"`,
        expand: 'vendor,service'
      });
      return mapRecordToServiceBooking(record);
    } catch (error) {
      return null;
    }
  }

  async create(data: Omit<ServiceBooking, 'id' | 'site'>): Promise<ServiceBooking> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create service bookings');
    }

    const record = await pb.collection('service_bookings').create({
      ...data,
      site: siteId
    });
    return mapRecordToServiceBooking(record);
  }

  async update(id: string, data: Partial<ServiceBooking>): Promise<ServiceBooking> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update service bookings');
    }

    const record = await pb.collection('service_bookings').update(id, data);
    return mapRecordToServiceBooking(record);
  }

  async delete(id: string): Promise<boolean> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete service bookings');
    }

    // Check if service booking has any payment allocations
    if (!paymentAllocationServiceRef) {
      throw new Error('PaymentAllocationService dependency not initialized');
    }
    const allocations = await paymentAllocationServiceRef.getByServiceBooking(id);
    if (allocations.length > 0) {
      throw new Error('Cannot delete service booking: It has payments assigned to it. Please remove all payments before deleting.');
    }

    await pb.collection('service_bookings').delete(id);
    return true;
  }

  async uploadCompletionPhoto(bookingId: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('completion_photos', file);
    const record = await pb.collection('service_bookings').update(bookingId, formData);
    return record.completion_photos[record.completion_photos.length - 1];
  }

  async calculatePaidAmount(bookingId: string): Promise<number> {
    if (!paymentAllocationServiceRef) {
      throw new Error('PaymentAllocationService dependency not initialized');
    }
    const allocations = await paymentAllocationServiceRef.getByServiceBooking(bookingId);
    return allocations.reduce((total, allocation) => total + allocation.allocated_amount, 0);
  }

  async calculatePaymentStatus(bookingId: string, totalAmount: number, percentCompleted: number): Promise<'pending' | 'partial' | 'paid' | 'currently_paid_up'> {
    const paidAmount = await this.calculatePaidAmount(bookingId);

    // Calculate the amount due based on percent completion
    const amountDueBasedOnProgress = (totalAmount * percentCompleted) / 100;

    if (paidAmount === 0) return 'pending';
    if (paidAmount >= totalAmount) return 'paid';

    // If paid amount covers the progress-based due amount, it's "currently paid up"
    if (paidAmount >= amountDueBasedOnProgress && percentCompleted < 100) {
      return 'currently_paid_up';
    }

    return 'partial';
  }

  // Centralized calculation methods
  static calculateProgressBasedAmount(serviceBooking: ServiceBooking): number {
    return (serviceBooking.total_amount * (serviceBooking.percent_completed || 0)) / 100;
  }

  static async calculateOutstandingAmount(serviceBooking: ServiceBooking): Promise<number> {
    const progressAmount = this.calculateProgressBasedAmount(serviceBooking);
    const paidAmount = await serviceBookingService.calculatePaidAmount(serviceBooking.id!);
    const outstanding = progressAmount - paidAmount;
    return outstanding > 0 ? outstanding : 0;
  }

  static calculateOutstandingAmountFromData(serviceBooking: ServiceBooking, paidAmount: number): number {
    const progressAmount = this.calculateProgressBasedAmount(serviceBooking);
    const outstanding = progressAmount - paidAmount;
    return outstanding > 0 ? outstanding : 0;
  }

  static calculatePaymentStatusFromData(serviceBooking: ServiceBooking, paidAmount: number): 'pending' | 'partial' | 'paid' | 'currently_paid_up' {
    const progressAmount = this.calculateProgressBasedAmount(serviceBooking);

    if (paidAmount === 0) return 'pending';
    if (paidAmount >= serviceBooking.total_amount) return 'paid';

    // If paid amount covers the progress-based due amount, it's "currently paid up"
    if (paidAmount >= progressAmount && (serviceBooking.percent_completed || 0) < 100) {
      return 'currently_paid_up';
    }

    return 'partial';
  }
}

export const serviceBookingService = new ServiceBookingService();
