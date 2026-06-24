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

    <!-- Summary Stat Strip -->
    <div class="mb-6 grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
      <div class="card py-3 px-4 col-span-2 lg:col-span-1">
        <p class="sw-eyebrow text-stone-500 dark:text-stone-400 mb-1">{{ t('accounts.totalBalance') }}</p>
        <p class="sw-stat font-mono sw-tabular text-xl sm:text-2xl"
          :class="totalBalance >= 0 ? 'text-forest-700 dark:text-forest-400' : 'text-clay-600 dark:text-clay-400'">
          ₹{{ totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </p>
      </div>
      <div class="card py-3 px-4">
        <p class="sw-eyebrow text-stone-500 dark:text-stone-400 mb-1">{{ t('accounts.activeAccounts') }}</p>
        <p class="sw-stat font-mono sw-tabular text-ink dark:text-cream">{{ activeAccountsCount }}</p>
      </div>
      <div class="card py-3 px-4">
        <p class="sw-eyebrow text-stone-500 dark:text-stone-400 mb-1">{{ t('accounts.lowBalance') }}</p>
        <p class="sw-stat font-mono sw-tabular"
          :class="lowBalanceCount > 0 ? 'text-clay-600 dark:text-clay-400' : 'text-ink dark:text-cream'">
          {{ lowBalanceCount }}
        </p>
      </div>
    </div>

    <!-- Search Box -->
    <div class="w-full md:w-96 mb-6" data-tour="search-bar">
      <SearchBox v-model="searchQuery" :placeholder="t('search.accounts')" :search-loading="searchLoading" />
    </div>

    <!-- Loading State: skeleton card grid -->
    <div v-if="accountsLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6" aria-hidden="true">
      <div v-for="i in 6" :key="'skel-' + i" class="card flex flex-col">
        <!-- Card header: title + meta line -->
        <div class="flex items-start justify-between mb-1">
          <div class="flex-1 min-w-0 space-y-2">
            <Skeleton height="1.25rem" width="55%" />
            <Skeleton height="0.875rem" width="40%" />
          </div>
        </div>
        <!-- Stat strip -->
        <div class="mt-auto pt-4 border-t border-stone-200 dark:border-ink-4 flex items-end justify-between gap-4">
          <div class="space-y-1.5">
            <Skeleton height="0.625rem" width="4rem" />
            <Skeleton height="1.5rem" width="5rem" />
          </div>
        </div>
      </div>
    </div>

    <!-- Accounts Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
      <div v-for="account in accounts" :key="account.id"
        class="card flex flex-col group card-interactive cursor-pointer transition-colors duration-150 ease-snap"
        @click="viewAccountDetail(account.id!)">

        <!-- Card Header -->
        <div class="flex items-start justify-between mb-1">
          <div class="flex-1 min-w-0 pr-2">
            <div class="flex items-center gap-2 mb-0.5">
              <component :is="getAccountIcon(account.type)" class="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
              <h3 class="font-display text-lg font-semibold tracking-tight text-ink dark:text-cream truncate">{{ account.name }}</h3>
            </div>
            <!-- Secondary meta line: type + optional bank -->
            <p class="text-sm text-stone-500 dark:text-stone-400 truncate capitalize">
              {{ account.type.replace('_', ' ') }}<span v-if="account.bank_name"> · {{ account.bank_name }}</span>
            </p>
          </div>

          <!-- Action cluster: ghost icons on desktop (hover-reveal), dropdown on mobile -->
          <div class="flex items-center gap-0.5 shrink-0">
            <!-- Desktop ghost actions (hover-reveal) -->
            <div class="hidden lg:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150" @click.stop>
              <button @click="editAccount(account)"
                class="h-8 w-8 flex items-center justify-center rounded-md text-stone-400 hover:text-ink dark:hover:text-cream hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors duration-150"
                :title="t('common.edit')">
                <Edit2 class="h-3.5 w-3.5" />
              </button>
              <button @click="toggleAccountStatus(account)"
                class="h-8 w-8 flex items-center justify-center rounded-md text-stone-400 hover:text-ink dark:hover:text-cream hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors duration-150"
                :title="account.is_active ? t('users.deactivate') : t('users.activate')">
                <component :is="account.is_active ? EyeOff : Eye" class="h-3.5 w-3.5" />
              </button>
              <button @click="deleteAccount(account.id!)" :disabled="!canDelete" :class="[
                canDelete
                  ? 'text-clay-600 dark:text-clay-400 hover:bg-stone-100 dark:hover:bg-ink-4'
                  : 'text-stone-300 dark:text-stone-600 cursor-not-allowed',
                'h-8 w-8 flex items-center justify-center rounded-md transition-colors duration-150'
              ]" :title="t('common.deleteAction')">
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>

            <!-- Mobile Dropdown Menu -->
            <div class="lg:hidden" @click.stop>
              <CardDropdownMenu :actions="getAccountActions(account)" @action="handleAccountAction(account, $event)" />
            </div>
          </div>
        </div>

        <!-- Optional: masked account number -->
        <div v-if="account.account_number" class="mb-2">
          <span class="text-xs font-mono sw-tabular text-stone-400 dark:text-stone-500">{{ maskAccountNumber(account.account_number) }}</span>
        </div>

        <!-- Inactive badge -->
        <div v-if="!account.is_active" class="mb-2">
          <span class="sw-badge sw-badge--danger">{{ t('common.inactive') }}</span>
        </div>

        <!-- Optional description -->
        <div v-if="account.description" class="mb-2 text-xs text-stone-500 dark:text-stone-400 line-clamp-1">
          {{ account.description }}
        </div>

        <!-- Stat strip footer — pinned to bottom -->
        <div class="mt-auto border-t border-stone-200 dark:border-ink-4 pt-3">
          <div class="flex items-baseline justify-between">
            <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('accounts.currentBalance') }}</p>
            <p class="text-xl font-mono sw-tabular font-semibold"
              :class="account.current_balance >= 0 ? 'text-forest-700 dark:text-forest-400' : 'text-clay-600 dark:text-clay-400'">
              ₹{{ account.current_balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="accounts.length === 0" class="col-span-full">
        <div class="text-center py-16">
          <CreditCard class="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600" />
          <h3 class="mt-4 font-display text-base font-semibold text-ink dark:text-cream">{{ t('accounts.noAccounts') }}</h3>
          <p class="mt-1 text-sm text-stone-500 dark:text-stone-400">{{ t('accounts.getStarted') }}</p>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingAccount"
      class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/60"
      @click="closeModal" @keydown.esc="closeModal" tabindex="-1">
      <div
        class="w-full sm:max-w-lg bg-white dark:bg-ink-3 shadow-modal border border-stone-200 dark:border-ink-4 rounded-t-2xl sm:rounded-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden"
        @click.stop>

        <!-- Grab handle (mobile only) -->
        <div class="mx-auto mt-3 h-1 w-10 rounded-full bg-stone-300 dark:bg-ink-4 sm:hidden"></div>

        <!-- Sticky header -->
        <div class="sticky top-0 z-10 bg-white dark:bg-ink-3 border-b border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex items-center gap-3">
          <span class="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-amber-500/15">
            <CreditCard class="h-5 w-5 text-amber-700 dark:text-amber-400" />
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide leading-none mb-0.5">
              {{ editingAccount ? t('common.edit') : t('common.create') }}
            </p>
            <h3 class="font-display text-base font-semibold text-ink dark:text-cream leading-tight truncate">
              {{ editingAccount ? t('accounts.editAccount') : t('accounts.addAccount') }}
            </h3>
          </div>
          <button type="button" @click="closeModal" class="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors">
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Scrollable body -->
        <form @submit.prevent="saveAccount" class="flex flex-col flex-1 overflow-hidden">
          <div class="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('accounts.accountName')
                }}</label>
                <input ref="firstInputRef" v-model="form.name" type="text" required class="input mt-1"
                  :placeholder="t('forms.enterAccountName')" autofocus autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
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
                  :placeholder="t('forms.enterAccountNumber')" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
              </div>

              <div v-if="form.type === 'bank' || form.type === 'credit_card'">
                <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('accounts.bankName')
                }}</label>
                <input v-model="form.bank_name" type="text" class="input mt-1" :placeholder="t('forms.enterBankName')" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
              </div>

              <div>
                <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('accounts.openingBalance')
                }}</label>
                <input v-model.number="form.opening_balance" type="number" step="0.01" required class="input mt-1 font-mono tabular-nums"
                  :placeholder="t('forms.enterOpeningBalance')" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
              </div>

              <div>
                <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('common.description')
                }}</label>
                <textarea v-model="form.description" class="input mt-1" rows="2"
                  :placeholder="t('forms.enterDescription')" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>
              </div>

              <div class="flex items-center">
                <input v-model="form.is_active" type="checkbox" id="is_active"
                  class="rounded border-stone-300 dark:border-ink-4 text-amber focus:ring-amber" />
                <label for="is_active" class="ml-2 text-sm text-stone-700 dark:text-stone-300">{{ t('accounts.isActive')
                }}</label>
              </div>
            </div>
          </div>

          <!-- Sticky footer -->
          <div class="sticky bottom-0 bg-white dark:bg-ink-3 border-t border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3">
            <button type="submit" :disabled="loading" class="flex-1 btn-primary">
              <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
              {{ loading ? (editingAccount ? t('common.updating') : t('common.creating')) : (editingAccount ? t('common.update') : t('common.create')) }}
            </button>
            <button type="button" @click="closeModal" class="flex-1 btn-outline">
              {{ t('common.cancel') }}
            </button>
          </div>
        </form>

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
  Banknote,
  Wallet,
  Smartphone,
  Building2,
  X
} from 'lucide-vue-next';
import SearchBox from '../components/SearchBox.vue';
import CardDropdownMenu from '../components/CardDropdownMenu.vue';
import Skeleton from '../components/Skeleton.vue';
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
const { data: accountsData, loading: accountsLoading, reload: reloadAccounts } = useSiteData(async () => {
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

const editAccount = async (account: Account) => {
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
  await nextTick();
  if (typeof firstInputRef.value?.focus === 'function') firstInputRef.value.focus();
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