<template>
  <div>
    <!-- Desktop Header with Add Button -->
    <div class="hidden md:flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('accounts.title') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ t('accounts.subtitle') }}
        </p>
      </div>
      <button 
        @click="handleAddAccount" 
        :disabled="!canCreateAccount"
        :class="[
          canCreateAccount ? 'btn-primary' : 'btn-disabled'
        ]"
        :title="!canCreateAccount ? t('subscription.banner.freeTierLimitReached') : t('common.keyboardShortcut', { keys: 'Shift+Alt+N' })"
        data-keyboard-shortcut="n"
      >
        <Plus class="mr-2 h-4 w-4" />
        {{ t('accounts.addAccount') }}
      </button>
    </div>

    <!-- Mobile Header -->
    <div class="md:hidden mb-6">
      <div class="mb-4">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('accounts.title') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ t('accounts.subtitle') }}
        </p>
      </div>
    </div>

    <!-- Search Box -->
    <div class="mb-6">
      <div class="max-w-md">
        <SearchBox
          v-model="searchQuery"
          :placeholder="t('search.accounts')"
          :search-loading="searchLoading"
        />
      </div>
    </div>

    <!-- Accounts Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="account in accounts" :key="account.id" class="card hover:shadow-md transition-shadow duration-200 cursor-pointer" @click="viewAccountDetail(account.id!)">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center space-x-2 mb-2">
              <component :is="getAccountIcon(account.type)" class="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ account.name }}</h3>
              <span v-if="!account.is_active" class="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs rounded-full">
                {{ t('common.inactive') }}
              </span>
            </div>
            
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('common.type') }}:</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white capitalize">{{ account.type.replace('_', ' ') }}</span>
              </div>
              
              <div v-if="account.account_number" class="flex items-center justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('common.account') }}:</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ maskAccountNumber(account.account_number) }}</span>
              </div>
              
              <div v-if="account.bank_name" class="flex items-center justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('accounts.bankName') }}:</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ account.bank_name }}</span>
              </div>
              
              <div class="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('accounts.currentBalance') }}:</span>
                <span class="text-lg font-bold" :class="account.current_balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                  ₹{{ account.current_balance.toFixed(2) }}
                </span>
              </div>
            </div>
            
            <div v-if="account.description" class="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {{ account.description }}
            </div>
          </div>
          
          <!-- Desktop Action Buttons -->
          <div class="hidden lg:flex items-center space-x-2" @click.stop>
            <button
              @click="editAccount(account)"
              class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              :title="t('common.edit')"
            >
              <Edit2 class="h-4 w-4" />
            </button>
            <button
              @click="toggleAccountStatus(account)"
              class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              :title="account.is_active ? t('users.deactivate') : t('users.activate')"
            >
              <component :is="account.is_active ? EyeOff : Eye" class="h-4 w-4" />
            </button>
            <button
              @click="deleteAccount(account.id!)"
              :disabled="!canDelete"
              :class="[
                canDelete 
                  ? 'text-red-400 hover:text-red-600 dark:hover:text-red-300' 
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
                'p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200'
              ]"
              :title="t('common.deleteAction')"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>

          <!-- Mobile Dropdown Menu -->
          <div class="lg:hidden">
            <CardDropdownMenu
              :actions="getAccountActions(account)"
              @action="handleAccountAction(account, $event)"
            />
          </div>
        </div>
      </div>
      
      <div v-if="accounts.length === 0" class="col-span-full">
        <div class="text-center py-12">
          <CreditCard class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ t('accounts.noAccounts') }}</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ t('accounts.getStarted') }}</p>
        </div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
        <div class="flex items-center">
          <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <TrendingUp class="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-green-700 dark:text-green-300">{{ t('accounts.totalBalance') }}</p>
            <p class="text-2xl font-bold text-green-900 dark:text-green-100">₹{{ totalBalance.toFixed(2) }}</p>
          </div>
        </div>
      </div>

      <div class="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
        <div class="flex items-center">
          <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <CreditCard class="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-blue-700 dark:text-blue-300">{{ t('accounts.activeAccounts') }}</p>
            <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">{{ activeAccountsCount }}</p>
          </div>
        </div>
      </div>

      <div class="card bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700">
        <div class="flex items-center">
          <div class="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <AlertTriangle class="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-yellow-700 dark:text-yellow-300">{{ t('accounts.lowBalance') }}</p>
            <p class="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{{ lowBalanceCount }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingAccount" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="closeModal" @keydown.esc="closeModal" tabindex="-1">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 m-4" @click.stop>
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {{ editingAccount ? t('accounts.editAccount') : t('accounts.addAccount') }}
          </h3>
          
          <form @submit.prevent="saveAccount" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('accounts.accountName') }}</label>
              <input ref="firstInputRef" v-model="form.name" type="text" required class="input mt-1" :placeholder="t('forms.enterAccountName')" autofocus />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('accounts.accountType') }}</label>
              <select v-model="form.type" required class="input mt-1">
                <option value="">{{ t('forms.selectAccountType') }}</option>
                <option value="bank">{{ t('accounts.accountTypes.bank') }}</option>
                <option value="credit_card">{{ t('accounts.accountTypes.creditCard') }}</option>
                <option value="cash">{{ t('accounts.accountTypes.cash') }}</option>
                <option value="digital_wallet">{{ t('accounts.accountTypes.digitalWallet') }}</option>
                <option value="other">{{ t('accounts.accountTypes.other') }}</option>
              </select>
            </div>
            
            <div v-if="form.type === 'bank' || form.type === 'credit_card'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('accounts.accountNumber') }}</label>
              <input v-model="form.account_number" type="text" class="input mt-1" :placeholder="t('forms.enterAccountNumber')" />
            </div>
            
            <div v-if="form.type === 'bank' || form.type === 'credit_card'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('accounts.bankName') }}</label>
              <input v-model="form.bank_name" type="text" class="input mt-1" :placeholder="t('forms.enterBankName')" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('accounts.openingBalance') }}</label>
              <input v-model.number="form.opening_balance" type="number" step="0.01" required class="input mt-1" :placeholder="t('forms.enterOpeningBalance')" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.description') }}</label>
              <textarea v-model="form.description" class="input mt-1" rows="2" :placeholder="t('forms.enterDescription')"></textarea>
            </div>
            
            <div class="flex items-center">
              <input v-model="form.is_active" type="checkbox" id="is_active" class="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500" />
              <label for="is_active" class="ml-2 text-sm text-gray-700 dark:text-gray-300">{{ t('accounts.isActive') }}</label>
            </div>
            
            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="loading" class="flex-1 btn-primary">
                <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                {{ editingAccount ? t('common.update') : t('common.create') }}
              </button>
              <button type="button" @click="closeModal" class="flex-1 btn-outline">
                {{ t('common.cancel') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue';
import { useKeyboardShortcutSingle } from '../composables/useKeyboardShortcut';
import { useRouter } from 'vue-router';
import { 
  CreditCard, 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  AlertTriangle,
  Banknote,
  Wallet,
  Smartphone,
  Building2
} from 'lucide-vue-next';
import SearchBox from '../components/SearchBox.vue';
import CardDropdownMenu from '../components/CardDropdownMenu.vue';
import { 
  accountService,
  type Account
} from '../services/pocketbase';
import { useI18n } from '../composables/useI18n';
import { useAccountSearch } from '../composables/useSearch';
import { useSiteData } from '../composables/useSiteData';
import { usePermissions } from '../composables/usePermissions';
import { useSubscription } from '../composables/useSubscription';
import { useModalState } from '../composables/useModalState';

const { t } = useI18n();
const { canDelete } = usePermissions();
const { checkCreateLimit, isReadOnly } = useSubscription();
const { openModal, closeModal: closeModalState } = useModalState();
const router = useRouter();
// Use site-aware data loading
const { data: accountsData, reload: reloadAccounts } = useSiteData(async () => {
  const accounts = await accountService.getAll();
  return accounts;
});

// Search functionality
const { searchQuery, loading: searchLoading, results: searchResults } = useAccountSearch();

// Display items: use search results if searching, otherwise site data
const accounts = computed(() => {
  return searchQuery.value.trim() ? searchResults.value : (accountsData.value || [])
});

// Removed unused allAccounts computed property
const showAddModal = ref(false);
const editingAccount = ref<Account | null>(null);
const loading = ref(false);
const firstInputRef = ref<HTMLInputElement>();

const form = reactive({
  name: '',
  type: '' as Account['type'],
  account_number: '',
  bank_name: '',
  description: '',
  is_active: true,
  opening_balance: 0
});

const totalBalance = computed(() => {
  return accounts.value
    .filter(account => account.is_active)
    .reduce((sum, account) => sum + account.current_balance, 0);
});

const activeAccountsCount = computed(() => {
  return accounts.value.filter(account => account.is_active).length;
});

const lowBalanceCount = computed(() => {
  return accounts.value.filter(account => account.is_active && account.current_balance < 1000).length;
});

const canCreateAccount = computed(() => {
  return checkCreateLimit('accounts') && !isReadOnly.value;
});

const getAccountIcon = (type: Account['type']) => {
  const icons = {
    bank: Building2,
    credit_card: CreditCard,
    cash: Banknote,
    digital_wallet: Smartphone,
    other: Wallet
  };
  return icons[type] || Wallet;
};

const maskAccountNumber = (accountNumber: string | number) => {
  if (!accountNumber) return accountNumber;
  const accountStr = String(accountNumber);
  if (accountStr.length <= 4) return accountStr;
  const lastFour = accountStr.slice(-4);
  const masked = '*'.repeat(accountStr.length - 4);
  return masked + lastFour;
};

const viewAccountDetail = (accountId: string) => {
  try {
    router.push(`/accounts/${accountId}`);
  } catch (error) {
    console.error('Navigation error:', error);
  }
};


const saveAccount = async () => {
  loading.value = true;
  try {
    if (editingAccount.value) {
      await accountService.update(editingAccount.value.id!, form);
    } else {
      await accountService.create(form);
    }
    await reloadAccounts();
    closeModal();
  } catch (error) {
    console.error('Error saving account:', error);
  } finally {
    loading.value = false;
  }
};

const editAccount = (account: Account) => {
  editingAccount.value = account;
  Object.assign(form, {
    name: account.name,
    type: account.type,
    account_number: account.account_number || '',
    bank_name: account.bank_name || '',
    description: account.description || '',
    is_active: account.is_active,
    opening_balance: account.opening_balance
  });
  showAddModal.value = true;
  openModal('accounts-edit-modal');
};

const toggleAccountStatus = async (account: Account) => {
  try {
    await accountService.update(account.id!, { is_active: !account.is_active });
    await reloadAccounts();
  } catch (error) {
    console.error('Error updating account status:', error);
  }
};

const deleteAccount = async (id: string) => {
  if (confirm(t('messages.confirmDelete', { item: t('common.account') }) + ' ' + t('messages.cannotUndo'))) {
    try {
      await accountService.delete(id);
      await reloadAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  }
};

const closeModal = () => {
  showAddModal.value = false;
  editingAccount.value = null;
  Object.assign(form, {
    name: '',
    type: '',
    account_number: '',
    bank_name: '',
    description: '',
    is_active: true,
    opening_balance: 0
  });
  closeModalState('accounts-add-modal');
  closeModalState('accounts-edit-modal');
};

const getAccountActions = (account: Account) => {
  return [
    {
      key: 'edit',
      label: t('common.edit'),
      icon: Edit2,
      variant: 'default' as const
    },
    {
      key: 'toggle-status',
      label: account.is_active ? t('users.deactivate') : t('users.activate'),
      icon: account.is_active ? EyeOff : Eye,
      variant: 'default' as const
    },
    {
      key: 'delete',
      label: t('common.deleteAction'),
      icon: Trash2,
      variant: 'danger' as const,
      disabled: !canDelete
    }
  ];
};

const handleAccountAction = (account: Account, action: string) => {
  switch (action) {
    case 'edit':
      editAccount(account);
      break;
    case 'toggle-status':
      toggleAccountStatus(account);
      break;
    case 'delete':
      deleteAccount(account.id!);
      break;
  }
};

const handleAddAccount = async () => {
  showAddModal.value = true;
  openModal('accounts-add-modal');
  await nextTick();
  firstInputRef.value?.focus();
};

// Keyboard shortcut for adding new account (Shift+Alt+N)
useKeyboardShortcutSingle('n', handleAddAccount, { shiftKey: true, altKey: true });
</script>