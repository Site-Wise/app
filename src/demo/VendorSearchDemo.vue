<template>
  <div class="p-8 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">VendorSearchBox Demo</h1>
    
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-2">Vendor Selection</label>
        <VendorSearchBox
          v-model="selectedVendor"
          :vendors="vendors"
          :deliveries="deliveries"
          :serviceBookings="serviceBookings"
          :outstanding-amount="vendorOutstanding"
          :pending-items-count="vendorPendingCount"
          placeholder="Search and select a vendor..."
          @vendor-selected="handleVendorSelected"
        />
      </div>

      <div v-if="selectedVendor" class="bg-blue-50 p-4 rounded-lg">
        <h3 class="font-semibold mb-2">Selected Vendor Details:</h3>
        <p><strong>ID:</strong> {{ selectedVendor }}</p>
        <p><strong>Name:</strong> {{ selectedVendorData?.name }}</p>
        <p><strong>Outstanding Amount:</strong> ₹{{ vendorOutstanding.toFixed(2) }}</p>
        <p><strong>Pending Items:</strong> {{ vendorPendingCount }}</p>
      </div>

      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="font-semibold mb-2">Instructions:</h3>
        <ul class="text-sm space-y-1">
          <li>• Click on the search box to see dropdown</li>
          <li>• Type to search for vendors</li>
          <li>• Select a vendor to see their name and outstanding amount in the input</li>
          <li>• Outstanding amount is calculated from deliveries and service bookings</li>
          <li>• Start typing again to clear selection and search for other vendors</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import VendorSearchBox from '../components/VendorSearchBox.vue';
import type { Vendor, Delivery, ServiceBooking } from '../services/pocketbase';

const selectedVendor = ref('');

const vendors: Vendor[] = [
  { id: 'vendor1', name: 'ABC Construction', contact_person: 'John Doe', phone: '1234567890', email: 'john@abc.com', address: '123 Main St', tags: [], site: 'site1', created: '', updated: '' },
  { id: 'vendor2', name: 'XYZ Suppliers', contact_person: 'Jane Smith', phone: '0987654321', email: 'jane@xyz.com', address: '456 Oak Ave', tags: [], site: 'site1', created: '', updated: '' },
  { id: 'vendor3', name: 'Quality Materials Inc', contact_person: 'Bob Johnson', phone: '1122334455', email: 'bob@quality.com', address: '789 Pine Rd', tags: [], site: 'site1', created: '', updated: '' },
];

const deliveries: Delivery[] = [
  { 
    id: 'delivery1', 
    vendor: 'vendor1', 
    total_amount: 15000, 
    paid_amount: 5000, 
    payment_status: 'partial',
    delivery_date: '2024-01-15',
    delivery_reference: 'DEL-001',
    notes: '',
    photos: [],
    site: 'site1',
    created: '',
    updated: ''
  },
  { 
    id: 'delivery2', 
    vendor: 'vendor1', 
    total_amount: 8000, 
    paid_amount: 0, 
    payment_status: 'pending',
    delivery_date: '2024-01-16',
    delivery_reference: 'DEL-002',
    notes: '',
    photos: [],
    site: 'site1',
    created: '',
    updated: ''
  },
  { 
    id: 'delivery3', 
    vendor: 'vendor2', 
    total_amount: 12000, 
    paid_amount: 12000, 
    payment_status: 'paid',
    delivery_date: '2024-01-17',
    delivery_reference: 'DEL-003',
    notes: '',
    photos: [],
    site: 'site1',
    created: '',
    updated: ''
  },
  { 
    id: 'delivery4', 
    vendor: 'vendor2', 
    total_amount: 6000, 
    paid_amount: 2000, 
    payment_status: 'partial',
    delivery_date: '2024-01-18',
    delivery_reference: 'DEL-004',
    notes: '',
    photos: [],
    site: 'site1',
    created: '',
    updated: ''
  },
];

const serviceBookings: ServiceBooking[] = [
  { 
    id: 'booking1', 
    vendor: 'vendor1', 
    total_amount: 20000, 
    paid_amount: 8000, 
    payment_status: 'partial',
    service: 'service1',
    start_date: '2024-01-20',
    end_date: '2024-01-25',
    duration: 5,
    unit_rate: 4000,
    status: 'in_progress',
    notes: '',
    completion_photos: [],
    site: 'site1',
    created: '',
    updated: ''
  },
  { 
    id: 'booking2', 
    vendor: 'vendor3', 
    total_amount: 15000, 
    paid_amount: 0, 
    payment_status: 'pending',
    service: 'service2',
    start_date: '2024-01-22',
    end_date: '2024-01-27',
    duration: 3,
    unit_rate: 5000,
    status: 'scheduled',
    notes: '',
    completion_photos: [],
    site: 'site1',
    created: '',
    updated: ''
  },
];

const selectedVendorData = computed(() => {
  if (!selectedVendor.value) return null;
  return vendors.find(v => v.id === selectedVendor.value);
});

const vendorOutstanding = computed(() => {
  if (!selectedVendor.value) return 0;
  
  const vendorDeliveries = deliveries.filter(d => d.vendor === selectedVendor.value);
  const vendorBookings = serviceBookings.filter(b => b.vendor === selectedVendor.value);
  
  const deliveryOutstanding = vendorDeliveries.reduce((sum, delivery) => {
    const outstanding = delivery.total_amount - delivery.paid_amount;
    return sum + (outstanding > 0 ? outstanding : 0);
  }, 0);
  
  const serviceOutstanding = vendorBookings.reduce((sum, booking) => {
    const outstanding = booking.total_amount - booking.paid_amount;
    return sum + (outstanding > 0 ? outstanding : 0);
  }, 0);
  
  return deliveryOutstanding + serviceOutstanding;
});

const vendorPendingCount = computed(() => {
  if (!selectedVendor.value) return 0;
  
  const vendorDeliveries = deliveries.filter(d => 
    d.vendor === selectedVendor.value && d.payment_status !== 'paid'
  );
  const vendorBookings = serviceBookings.filter(b => 
    b.vendor === selectedVendor.value && b.payment_status !== 'paid'
  );
  
  return vendorDeliveries.length + vendorBookings.length;
});

const handleVendorSelected = (vendor: Vendor) => {
  console.log('Vendor selected:', vendor);
};
</script>