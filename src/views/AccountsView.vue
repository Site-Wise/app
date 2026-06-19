<template>
  <div>
    <!-- Desktop Header with Add Button -->
    <div class="hidden md:flex items-center justify-between mb-8">
      <div>
        <h1 class="font-display text-2xl font-bold text-ink dark:text-cream">{{ t('accounts.title') }}</h1>
        <p class="mt-1 text-sm text-stone-600 dark:text-stone-400">
          {{ t('accounts.subtitle') }}
        </p>
      </div>
      <button @click="handleAddAccount" :disabled="!canCreateAccount" :class="[
        canCreateAccount ? 'btn-primary' : 'btn-disabled'
      ]"
        :title="!canCreateAccount ? t('subscription.banner.freeTierLimitReached') : t('common.keyboardShortcut', { keys: 'Shift+Alt+N' })"
        data-keyboard-shortcut="n">
        <Plus class="mr-2 h-4 w-4" />
        {{ t('accounts.addAccount') }}
      </button>
    </div>

    <!-- Mobile Header -->
    <div class="md:hidden mb-6">
      <div class="mb-4">
        <h1 class="font-display text-2xl font-bold text-ink dark:text-cream">{{ t('accounts.title') }}</h1>
        <p class="mt-1 text-sm text-stone-600 dark:text-stone-400">
          {{ t('accounts.subtitle') }}
        </p>
      </div>
    </div>

    <!-- Search Box -->
    <div class="w-full md:w-96 mb-6" data-tour="search-bar">
      <SearchBox v-model="searchQuery" :placeholder="t('search.accounts')" :search-loading="searchLoading" />
    </div>

    <!-- Accounts Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="account in accounts" :key="account.id"
        class="card hover:shadow-md transition-shadow duration-200 cursor-pointer"
        @click="viewAccountDetail(account.id!)">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center space-x-2 mb-2">
              <component :is="getAccountIcon(account.type)" class="h-5 w-5 text-stone-500 dark:text-stone-400" />
              <h3 class="font-display text-lg font-semibold text-ink dark:text-cream">{{ account.name }}</h3>
              <span v-if="!account.is_active"
                class="sw-badge sw-badge--danger">
                {{ t('common.inactive') }}
              </span>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm text-stone-600 dark:text-stone-400">{{ t('common.type') }}:</span>
                <span class="text-sm font-medium text-ink dark:text-cream capitalize">{{ account.type.replace('_',
                  ' ') }}</span>
              </div>

              <div v-if="account.account_number" class="flex items-center justify-between">
                <span class="text-sm text-stone-600 dark:text-stone-400">{{ t('common.account') }}:</span>
                <span class="text-sm font-medium font-mono tabular-nums text-ink dark:text-cream">{{
                  maskAccountNumber(account.account_number) }}</span>
              </div>

              <div v-if="account.bank_name" class="flex items-center justify-between">
                <span class="text-sm text-stone-600 dark:text-stone-400">{{ t('accounts.bankName') }}:</span>
                <span class="text-sm font-medium text-ink dark:text-cream">{{ account.bank_name }}</span>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-ink-4">
                <span class="text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('accounts.currentBalance')
                }}:</span>
                <span class="text-lg font-bold font-mono tabular-nums"
                  :class="account.current_balance >= 0 ? 'text-forest' : 'text-clay'">
                  ₹{{ account.current_balance.toFixed(2) }}
                </span>
              </div>
            </div>

            <div v-if="account.description" class="mt-3 text-sm text-stone-600 dark:text-stone-400">
              {{ account.description }}
            </div>
          </div>

          <!-- Desktop Action Buttons -->
          <div class="hidden lg:flex items-center space-x-2" @click.stop>
            <button @click="editAccount(account)"
              class="p-2 text-stone-400 hover:text-ink dark:hover:text-cream rounded-md hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors duration-200"
              :title="t('common.edit')">
              <Edit2 class="h-4 w-4" />
            </button>
            <button @click="toggleAccountStatus(account)"
              class="p-2 text-stone-400 hover:text-ink dark:hover:text-cream rounded-md hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors duration-200"
              :title="account.is_active ? t('users.deactivate') : t('users.activate')">
              <component :is="account.is_active ? EyeOff : Eye" class="h-4 w-4" />
            </button>
            <button @click="deleteAccount(account.id!)" :disabled="!canDelete" :class="[
              canDelete
                ? 'text-clay hover:text-clay'
                : 'text-stone-300 dark:text-stone-600 cursor-not-allowed',
              'p-2 rounded-md hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors duration-200'
            ]" :title="t('common.deleteAction')">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>

          <!-- Mobile Dropdown Menu -->
          <div class="lg:hidden">
            <CardDropdownMenu :actions="getAccountActions(account)" @action="handleAccountAction(account, $event)" />
          </div>
        </div>
      </div>

      <div v-if="accounts.length === 0" class="col-span-full">
        <div class="text-center py-12">
          <CreditCard class="mx-auto h-12 w-12 text-stone-400" />
          <h3 class="mt-2 text-sm font-medium text-ink dark:text-cream">{{ t('accounts.noAccounts') }}</h3>
          <p class="mt-1 text-sm text-stone-500 dark:text-stone-400">{{ t('accounts.getStarted') }}</p>
        </div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="card bg-forest/5 dark:bg-forest/10 border-forest/30 dark:border-forest/40">
        <div class="flex items-center">
          <div class="p-2 bg-forest/10 dark:bg-forest/20 rounded-lg">
            <TrendingUp class="h-6 w-6 text-forest" />
          </div>
          <div class="ml-4">
            <p class="sw-eyebrow text-stone-600 dark:text-stone-400">{{ t('accounts.totalBalance') }}</p>
            <p class="sw-stat font-mono tabular-nums text-forest">₹{{ totalBalance.toFixed(2) }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="p-2 bg-amber/15 dark:bg-amber/20 rounded-lg">
            <CreditCard class="h-6 w-6 text-amber-700 dark:text-amber" />
          </div>
          <div class="ml-4">
            <p class="sw-eyebrow text-stone-600 dark:text-stone-400">{{ t('accounts.activeAccounts') }}</p>
            <p class="sw-stat font-mono tabular-nums text-ink dark:text-cream">{{ activeAccountsCount }}</p>
          </div>
        </div>
      </div>

      <div class="card bg-amber/5 dark:bg-amber/10 border-amber/30 dark:border-amber/40">
        <div class="flex items-center">
          <div class="p-2 bg-amber/15 dark:bg-amber/20 rounded-lg">
            <AlertTriangle class="h-6 w-6 text-amber-700 dark:text-amber" />
          </div>
          <div class="ml-4">
            <p class="sw-eyebrow text-stone-600 dark:text-stone-400">{{ t('accounts.lowBalance') }}</p>
            <p class="sw-stat font-mono tabular-nums text-ink dark:text-cream">{{ lowBalanceCount }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingAccount"
      class="fixed inset-0 bg-black/60 overflow-y-auto h-full w-full z-[60]" @click="closeModal"
      @keydown.esc="closeModal" tabindex="-1">
      <div
        class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-modal rounded-xl bg-white dark:bg-ink-3 border-stone-200 dark:border-ink-4 m-4 mb-20 lg:mb-4"
        @click.stop>
        <div class="mt-3">
          <h3 class="font-display text-lg font-semibold text-ink dark:text-cream mb-4">
            {{ editingAccount ? t('accounts.editAccount') : t('accounts.addAccount') }}
          </h3>

          <form @submit.prevent="saveAccount" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('accounts.accountName')
              }}</label>
              <input ref="firstInputRef" v-model="form.name" type="text" required class="input mt-1"
                :placeholder="t('forms.enterAccountName')" autofocus />
            </div>

            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('accounts.accountType')
              }}</label>
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
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('accounts.accountNumber')
              }}</label>
              <input v-model="form.account_number" type="text" class="input mt-1"
                :placeholder="t('forms.enterAccountNumber')" />
            </div>

            <div v-if="form.type === 'bank' || form.type === 'credit_card'">
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('accounts.bankName')
              }}</label>
              <input v-model="form.bank_name" type="text" class="input mt-1" :placeholder="t('forms.enterBankName')" />
            </div>

            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('accounts.openingBalance')
              }}</label>
              <input v-model.number="form.opening_balance" type="number" step="0.01" required class="input mt-1 font-mono tabular-nums"
                :placeholder="t('forms.enterOpeningBalance')" />
            </div>

            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('common.description')
              }}</label>
              <textarea v-model="form.description" class="input mt-1" rows="2"
                :placeholder="t('forms.enterDescription')"></textarea>
            </div>

            <div class="flex items-center">
              <input v-model="form.is_active" type="checkbox" id="is_active"
                class="rounded border-stone-300 dark:border-ink-4 text-amber focus:ring-amber" />
              <label for="is_active" class="ml-2 text-sm text-stone-700 dark:text-stone-300">{{ t('accounts.isActive')
              }}</label>
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