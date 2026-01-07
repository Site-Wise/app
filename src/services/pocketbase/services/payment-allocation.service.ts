import type { RecordModel } from 'pocketbase';
import { pb } from '../client';
import { getCurrentSiteId } from '../context';
import type { PaymentAllocation } from '../types';
import { mapRecordToPaymentAllocation } from './mappers';

export class PaymentAllocationService {
  async getAll(): Promise<PaymentAllocation[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('payment_allocations')
      .getFullList({
        filter: `site="${siteId}"`,
        expand: 'delivery,service_booking,service_booking.service'
      });
    return records.map(record => mapRecordToPaymentAllocation(record));
  }

  async getById(id: string): Promise<PaymentAllocation | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('payment_allocations').getOne(id, {
        filter: `site="${siteId}"`,
        expand: 'delivery,service_booking,service_booking.service'
      });
      return mapRecordToPaymentAllocation(record);
    } catch (error) {
      return null;
    }
  }

  async create(data: Omit<PaymentAllocation, 'id' | 'created' | 'updated'>): Promise<PaymentAllocation> {
    const record = await pb.collection('payment_allocations').create(data);
    return mapRecordToPaymentAllocation(record);
  }

  async getByPayment(paymentId: string): Promise<PaymentAllocation[]> {
    const records = await pb.collection('payment_allocations')
      .getFullList({
        filter: `payment="${paymentId}"`,
        expand: 'delivery,service_booking,service_booking.service'
      });
    return records.map(record => mapRecordToPaymentAllocation(record));
  }

  async getByDelivery(deliveryId: string): Promise<PaymentAllocation[]> {
    const records = await pb.collection('payment_allocations')
      .getFullList({
        filter: `delivery="${deliveryId}"`
      });
    return records.map(record => mapRecordToPaymentAllocation(record));
  }

  async getByServiceBooking(serviceBookingId: string): Promise<PaymentAllocation[]> {
    const records = await pb.collection('payment_allocations')
      .getFullList({
        filter: `service_booking="${serviceBookingId}"`
      });
    return records.map(record => mapRecordToPaymentAllocation(record));
  }

  async deleteByPayment(paymentId: string): Promise<void> {
    const allocations = await this.getByPayment(paymentId);
    for (const allocation of allocations) {
      if (allocation.id) {
        await pb.collection('payment_allocations').delete(allocation.id);
      }
    }
  }
}

export const paymentAllocationService = new PaymentAllocationService();
