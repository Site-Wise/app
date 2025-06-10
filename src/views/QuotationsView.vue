<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Quotations</h1>
        <p class="mt-1 text-sm text-gray-600">
          Manage price quotes from vendors
        </p>
      </div>
      <button @click="showAddModal = true" class="btn-primary">
        <Plus class="mr-2 h-4 w-4" />
        Add Quotation
      </button>
    </div>

    <!-- Quotations Table -->
    <div class="card overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min. Qty</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid Until</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="quotation in quotations" :key="quotation.id">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">{{ quotation.expand?.item?.name }}</div>
              <div class="text-sm text-gray-500">{{ quotation.expand?.item?.unit }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">{{ quotation.expand?.vendor?.name }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              ${{ quotation.unit_price.toFixed(2) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ quotation.minimum_quantity || '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ quotation.valid_until ? formatDate(quotation.valid_until) : '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="`status-${quotation.status}`">
                {{ quotation.status }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <div class="flex items-center space-x-2">
                <button @click="editQuotation(quotation)" class="text-primary-600 hover:text-primary-900">
                  <Edit2 class="h-4 w-4" />
                </button>
                <button @click="deleteQuotation(quotation.id!)" class="text-red-600 hover:text-red-900">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="quotations.length === 0" class="text-center py-12">
        <FileText class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900">No quotations</h3>
        <p class="mt-1 text-sm text-gray-500">Get started by adding a quotation.</p>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingQuotation" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            {{ editingQuotation ? 'Edit Quotation' : 'Add New Quotation' }}
          </h3>
          
          <form @submit.prevent="saveQuotation" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Item</label>
              <select v-model="form.item" required class="input mt-1">
                <option value="">Select an item</option>
                <option v-for="item in items" :key="item.id" :value="item.id">
                  {{ item.name }} ({{ item.unit }})
                </option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Vendor</label>
              <select v-model="form.vendor" required class="input mt-1">
                <option value="">Select a vendor</option>
                <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
                  {{ vendor.name }}
                </option>
              </select>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Unit Price</label>
                <input v-model.number="form.unit_price" type="number" step="0.01" required class="input mt-1" placeholder="0.00" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Min. Quantity</label>
                <input v-model.number="form.minimum_quantity" type="number" class="input mt-1" placeholder="Optional" />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Valid Until</label>
              <input v-model="form.valid_until" type="date" class="input mt-1" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Status</label>
              <select v-model="form.status" required class="input mt-1">
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Notes</label>
              <textarea v-model="form.notes" class="input mt-1" rows="3" placeholder="Additional notes"></textarea>
            </div>
            
            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="loading" class="flex-1 btn-primary">
                <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                {{ editingQuotation ? 'Update' : 'Create' }}
              </button>
              <button type="button" @click="closeModal" class="flex-1 btn-outline">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { FileText, Plus, Edit2, Trash2, Loader2 } from 'lucide-vue-next';
import { 
  quotationService, 
  itemService, 
  vendorService,
  type Quotation, 
  type Item, 
  type Vendor 
} from '../services/pocketbase';

const quotations = ref<Quotation[]>([]);
const items = ref<Item[]>([]);
const vendors = ref<Vendor[]>([]);
const showAddModal = ref(false);
const editingQuotation = ref<Quotation | null>(null);
const loading = ref(false);

const form = reactive({
  vendor: '',
  item: '',
  unit_price: 0,
  minimum_quantity: 0,
  valid_until: '',
  notes: '',
  status: 'pending' as 'pending' | 'approved' | 'rejected' | 'expired'
});

const loadData = async () => {
  try {
    const [quotationsData, itemsData, vendorsData] = await Promise.all([
      quotationService.getAll(),
      itemService.getAll(),
      vendorService.getAll()
    ]);
    
    quotations.value = quotationsData;
    items.value = itemsData;
    vendors.value = vendorsData;
  } catch (error) {
    console.error('Error loading data:', error);
  }
};

const saveQuotation = async () => {
  loading.value = true;
  try {
    const data = { ...form };
    
    // Create a clean data object without optional empty fields
    const cleanData: Partial<Quotation> = {
      vendor: data.vendor,
      item: data.item,
      unit_price: data.unit_price,
      status: data.status
    };
    
    if (data.minimum_quantity) {
      cleanData.minimum_quantity = data.minimum_quantity;
    }
    
    if (data.valid_until) {
      cleanData.valid_until = data.valid_until;
    }
    
    if (data.notes) {
      cleanData.notes = data.notes;
    }
    
    if (editingQuotation.value) {
      await quotationService.update(editingQuotation.value.id!, cleanData);
    } else {
      await quotationService.create(cleanData as Omit<Quotation, 'id'>);
    }
    await loadData();
    closeModal();
  } catch (error) {
    console.error('Error saving quotation:', error);
  } finally {
    loading.value = false;
  }
};

const editQuotation = (quotation: Quotation) => {
  editingQuotation.value = quotation;
  Object.assign(form, {
    vendor: quotation.vendor,
    item: quotation.item,
    unit_price: quotation.unit_price,
    minimum_quantity: quotation.minimum_quantity || 0,
    valid_until: quotation.valid_until || '',
    notes: quotation.notes || '',
    status: quotation.status
  });
};

const deleteQuotation = async (id: string) => {
  if (confirm('Are you sure you want to delete this quotation?')) {
    try {
      await quotationService.delete(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting quotation:', error);
    }
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const closeModal = () => {
  showAddModal.value = false;
  editingQuotation.value = null;
  Object.assign(form, {
    vendor: '',
    item: '',
    unit_price: 0,
    minimum_quantity: 0,
    valid_until: '',
    notes: '',
    status: 'pending'
  });
};

onMounted(() => {
  loadData();
});
</script>