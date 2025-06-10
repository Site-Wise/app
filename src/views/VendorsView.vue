<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Vendors</h1>
        <p class="mt-1 text-sm text-gray-600">
          Manage your vendor contacts and relationships
        </p>
      </div>
      <button @click="showAddModal = true" class="btn-primary">
        <Plus class="mr-2 h-4 w-4" />
        Add Vendor
      </button>
    </div>

    <!-- Vendors Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="vendor in vendors" :key="vendor.id" class="card">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900">{{ vendor.name }}</h3>
            <div class="mt-2 space-y-1">
              <div v-if="vendor.contact_person" class="flex items-center text-sm text-gray-600">
                <User class="mr-2 h-4 w-4" />
                {{ vendor.contact_person }}
              </div>
              <div v-if="vendor.email" class="flex items-center text-sm text-gray-600">
                <Mail class="mr-2 h-4 w-4" />
                {{ vendor.email }}
              </div>
              <div v-if="vendor.phone" class="flex items-center text-sm text-gray-600">
                <Phone class="mr-2 h-4 w-4" />
                {{ vendor.phone }}
              </div>
              <div v-if="vendor.address" class="flex items-center text-sm text-gray-600">
                <MapPin class="mr-2 h-4 w-4" />
                {{ vendor.address }}
              </div>
            </div>
            <div v-if="vendor.tags && vendor.tags.length > 0" class="mt-4 flex flex-wrap gap-1">
              <span v-for="tag in vendor.tags" :key="tag" class="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">
                {{ tag }}
              </span>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button @click="editVendor(vendor)" class="p-1 text-gray-400 hover:text-gray-600">
              <Edit2 class="h-4 w-4" />
            </button>
            <button @click="deleteVendor(vendor.id!)" class="p-1 text-gray-400 hover:text-red-600">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="vendors.length === 0" class="col-span-full">
        <div class="text-center py-12">
          <Users class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-2 text-sm font-medium text-gray-900">No vendors</h3>
          <p class="mt-1 text-sm text-gray-500">Get started by adding a vendor.</p>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingVendor" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            {{ editingVendor ? 'Edit Vendor' : 'Add New Vendor' }}
          </h3>
          
          <form @submit.prevent="saveVendor" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Company Name</label>
              <input v-model="form.name" type="text" required class="input mt-1" placeholder="Enter company name" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Contact Person</label>
              <input v-model="form.contact_person" type="text" class="input mt-1" placeholder="Enter contact person" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Email</label>
              <input v-model="form.email" type="email" class="input mt-1" placeholder="Enter email address" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Phone</label>
              <input v-model="form.phone" type="tel" class="input mt-1" placeholder="Enter phone number" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Address</label>
              <textarea v-model="form.address" class="input mt-1" rows="2" placeholder="Enter address"></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tags (Specialties)</label>
              <div class="flex flex-wrap gap-2 mb-2">
                <span v-for="(tag, index) in form.tags" :key="index" class="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full flex items-center">
                  {{ tag }}
                  <button type="button" @click="removeTag(index)" class="ml-1 text-primary-600 hover:text-primary-800">
                    <X class="h-3 w-3" />
                  </button>
                </span>
              </div>
              <div class="flex">
                <input 
                  v-model="newTag" 
                  type="text" 
                  class="input flex-1" 
                  placeholder="Add specialty (e.g., Steel, Concrete)"
                  @keydown.enter.prevent="addTag"
                />
                <button type="button" @click="addTag" class="ml-2 btn-outline">
                  <Plus class="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="loading" class="flex-1 btn-primary">
                <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                {{ editingVendor ? 'Update' : 'Create' }}
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
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { Users, Plus, Edit2, Trash2, Loader2, User, Mail, Phone, MapPin, X } from 'lucide-vue-next';
import { vendorService, type Vendor } from '../services/pocketbase';

const vendors = ref<Vendor[]>([]);
const showAddModal = ref(false);
const editingVendor = ref<Vendor | null>(null);
const loading = ref(false);
const newTag = ref('');

const form = reactive({
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  tags: [] as string[]
});

const loadVendors = async () => {
  try {
    vendors.value = await vendorService.getAll();
  } catch (error) {
    console.error('Error loading vendors:', error);
  }
};

const saveVendor = async () => {
  loading.value = true;
  try {
    if (editingVendor.value) {
      await vendorService.update(editingVendor.value.id!, form);
    } else {
      await vendorService.create(form);
    }
    await loadVendors();
    closeModal();
  } catch (error) {
    console.error('Error saving vendor:', error);
  } finally {
    loading.value = false;
  }
};

const editVendor = (vendor: Vendor) => {
  editingVendor.value = vendor;
  Object.assign(form, {
    name: vendor.name,
    contact_person: vendor.contact_person || '',
    email: vendor.email || '',
    phone: vendor.phone || '',
    address: vendor.address || '',
    tags: [...vendor.tags]
  });
};

const deleteVendor = async (id: string) => {
  if (confirm('Are you sure you want to delete this vendor?')) {
    try {
      await vendorService.delete(id);
      await loadVendors();
    } catch (error) {
      console.error('Error deleting vendor:', error);
    }
  }
};

const addTag = () => {
  if (newTag.value.trim() && !form.tags.includes(newTag.value.trim())) {
    form.tags.push(newTag.value.trim());
    newTag.value = '';
  }
};

const removeTag = (index: number) => {
  form.tags.splice(index, 1);
};

const closeModal = () => {
  showAddModal.value = false;
  editingVendor.value = null;
  Object.assign(form, {
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    tags: []
  });
  newTag.value = '';
};

const handleQuickAction = () => {
  showAddModal.value = true;
};

onMounted(() => {
  loadVendors();
  window.addEventListener('show-add-modal', handleQuickAction);
});

onUnmounted(() => {
  window.removeEventListener('show-add-modal', handleQuickAction);
});
</script>