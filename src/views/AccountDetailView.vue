<template>
  <div v-if="account">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center space-x-4">
        <button @click="goBack" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft class="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div class="flex items-center space-x-3">
          <component :is="getAccountIcon(account.type)" class="h-8 w-8 text-gray-500 dark:text-gray-400" />
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ account.name }}</h1>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {{ account.type.replace('_', ' ').toUpperCase() }} Account Transactions
            </p>
          </div>
        </div>
      </div>
      <!-- Desktop Actions -->
      <div class="hidden md:flex items-center space-x-3">
        <button @click="recalculateBalance" :disabled="recalculating" class="btn-outline">
          <RefreshCw :class="{ 'animate-spin': recalculating }" class="mr-2 h-4 w-4" />
          Recalculate Balance
        </button>
        <div class="relative export-dropdown">
          <button @click="showExportDropdown = !showExportDropdown" class="btn-outline flex items-center">
            <Download class="mr-2 h-4 w-4" />
            Export Statement
            <ChevronDown class="ml-2 h-4 w-4" />
          </button>
          
          <!-- Export Dropdown Menu -->
          <div v-if="showExportDropdown" class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
            <div class="py-1">
              <button @click="exportStatement(); showExportDropdown = false" class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <FileSpreadsheet class="mr-3 h-4 w-4 text-green-600" />
                Export CSV
              </button>
              <button @click="handleExportPdf(); showExportDropdown = false" class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <FileText class="mr-3 h-4 w-4 text-red-600" />
                Export PDF
              </button>
            </div>
          </div>
        </div>
        <button @click="showCreditModal = true" class="btn-outline">
          <Plus class="mr-2 h-4 w-4" />
          Add Credit Entry
        </button>
        <button @click="editAccount" class="btn-primary">
          <Edit2 class="mr-2 h-4 w-4" />
          Edit Account
        </button>
      </div>

      <!-- Mobile Menu -->
      <div class="md:hidden relative mobile-menu">
        <button @click="showMobileMenu = !showMobileMenu" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <MoreVertical class="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        
        <!-- Mobile Dropdown Menu -->
        <div v-if="showMobileMenu" class="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
          <div class="py-1">
            <!-- Recalculate Balance -->
            <button @click="handleMobileAction('recalculateBalance')" :disabled="recalculating" class="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50">
              <RefreshCw :class="{ 'animate-spin': recalculating }" class="mr-3 h-5 w-5 text-gray-600" />
              Recalculate Balance
            </button>
            
            <!-- Export Options -->
            <div class="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
              Export Statement
            </div>
            <button @click="handleMobileAction('exportCsv')" class="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <FileSpreadsheet class="mr-3 h-5 w-5 text-green-600" />
              Export CSV
            </button>
            <button @click="handleMobileAction('exportPdf')" class="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <FileText class="mr-3 h-5 w-5 text-red-600" />
              Export PDF
            </button>
            
            <!-- Divider -->
            <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
            
            <!-- Other Actions -->
            <button @click="handleMobileAction('addCredit')" class="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Plus class="mr-3 h-5 w-5 text-gray-600" />
              Add Credit Entry
            </button>
            <button @click="handleMobileAction('editAccount')" class="flex items-center w-full px-4 py-3 text-sm text-white bg-blue-600 hover:bg-blue-700">
              <Edit2 class="mr-3 h-5 w-5 text-white" />
              Edit Account
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Account Summary -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
      <!-- Account Info -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Details</h2>
        <div class="space-y-3">
          <div>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</span>
            <p class="text-gray-900 dark:text-white capitalize">{{ account.type.replace('_', ' ') }}</p>
          </div>
          <div v-if="account.account_number">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Account Number:</span>
            <p class="text-gray-900 dark:text-white">{{ maskAccountNumber(account.account_number) }}</p>
          </div>
          <div v-if="account.bank_name">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Bank:</span>
            <p class="text-gray-900 dark:text-white">{{ account.bank_name }}</p>
          </div>
          <div>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
            <span :class="account.is_active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
              {{ account.is_active ? 'Active' : 'Inactive' }}
            </span>
          </div>
          <div v-if="account.description">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Description:</span>
            <p class="text-gray-900 dark:text-white">{{ account.description }}</p>
          </div>
        </div>
      </div>

      <!-- Balance Summary -->
      <div class="lg:col-span-3">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
            <div class="flex items-center">
              <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Wallet class="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-blue-700 dark:text-blue-300">Opening Balance</p>
                <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">₹{{ account.opening_balance.toFixed(2) }}</p>
              </div>
            </div>
          </div>

          <div class="card" :class="account.current_balance >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'">
            <div class="flex items-center">
              <div class="p-2 rounded-lg" :class="account.current_balance >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'">
                <TrendingUp v-if="account.current_balance >= 0" class="h-6 w-6 text-green-600 dark:text-green-400" />
                <TrendingDown v-else class="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium" :class="account.current_balance >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'">Current Balance</p>
                <p class="text-2xl font-bold" :class="account.current_balance >= 0 ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'">₹{{ account.current_balance.toFixed(2) }}</p>
              </div>
            </div>
          </div>

          <div class="card bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700">
            <div class="flex items-center">
              <div class="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <ArrowDownCircle class="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-purple-700 dark:text-purple-300">Total Payments</p>
                <p class="text-2xl font-bold text-purple-900 dark:text-purple-100">₹{{ totalPayments.toFixed(2) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Transaction Summary -->
        <div class="mt-6 card">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Transaction Summary</h3>
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ accountTransactions.length }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Total Transactions</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ thisMonthTransactions }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">This Month</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">₹{{ averageTransaction.toFixed(2) }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Avg. Transaction</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Transaction History -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Transaction History</h2>
        <div class="flex items-center space-x-2">
          <select v-model="filterPeriod" class="input text-sm">
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <span class="text-sm text-gray-500 dark:text-gray-400">{{ filteredTransactions.length }} transactions</span>
        </div>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Balance</th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="transaction in filteredTransactions" :key="transaction.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {{ formatDate(transaction.transaction_date) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  transaction.type === 'credit' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                ]">
                  {{ transaction.type === 'credit' ? 'Credit' : 'Debit' }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900 dark:text-white">{{ transaction.description }}</div>
                <div v-if="transaction.notes" class="text-sm text-gray-500 dark:text-gray-400">{{ transaction.notes }}</div>
                <div v-if="transaction.reference" class="text-sm text-gray-500 dark:text-gray-400">Ref: {{ transaction.reference }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="[
                  'text-sm font-medium',
                  transaction.type === 'credit' 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                ]">
                  {{ transaction.type === 'credit' ? '+' : '-' }}₹{{ transaction.amount.toFixed(2) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                ₹{{ (transaction as any).running_balance?.toFixed(2) || '0.00' }}
              </td>
            </tr>
          </tbody>
        </table>
        
        <div v-if="filteredTransactions.length === 0" class="text-center py-12">
          <ArrowDownCircle class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No transactions</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">No transactions found for the selected period.</p>
        </div>
      </div>
    </div>

    <!-- Edit Account Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="showEditModal = false" @keydown.esc="showEditModal = false" tabindex="-1">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" @click.stop>
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Edit Account</h3>
          
          <form @submit.prevent="saveAccount" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Name</label>
              <input v-model="editForm.name" type="text" required class="input mt-1" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Type</label>
              <select v-model="editForm.type" required class="input mt-1">
                <option value="bank">Bank Account</option>
                <option value="credit_card">Credit Card</option>
                <option value="cash">Cash</option>
                <option value="digital_wallet">Digital Wallet</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div v-if="editForm.type === 'bank' || editForm.type === 'credit_card'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Number</label>
              <input v-model="editForm.account_number" type="text" class="input mt-1" />
            </div>
            
            <div v-if="editForm.type === 'bank' || editForm.type === 'credit_card'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Bank Name</label>
              <input v-model="editForm.bank_name" type="text" class="input mt-1" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea v-model="editForm.description" class="input mt-1" rows="2"></textarea>
            </div>
            
            <div class="flex items-center">
              <input v-model="editForm.is_active" type="checkbox" id="edit_is_active" class="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500" />
              <label for="edit_is_active" class="ml-2 text-sm text-gray-700 dark:text-gray-300">Account is active</label>
            </div>
            
            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="editLoading" class="flex-1 btn-primary">
                <Loader2 v-if="editLoading" class="mr-2 h-4 w-4 animate-spin" />
                Update Account
              </button>
              <button type="button" @click="showEditModal = false" class="flex-1 btn-outline">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Credit Entry Modal -->
    <div v-if="showCreditModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="showCreditModal = false" @keydown.esc="showCreditModal = false" tabindex="-1">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" @click.stop>
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Add Credit Entry</h3>
          
          <form @submit.prevent="saveCreditEntry" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
              <input v-model.number="creditForm.amount" type="number" min="0" step="0.01" required class="input mt-1" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <input v-model="creditForm.description" type="text" required class="input mt-1" 
                     placeholder="e.g., Bank deposit, Refund, Correction" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Reference</label>
              <input v-model="creditForm.reference" type="text" class="input mt-1" 
                     placeholder="e.g., Transaction ID, Check number" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
              <input v-model="creditForm.transaction_date" type="date" required class="input mt-1" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
              <textarea v-model="creditForm.notes" class="input mt-1" rows="2" 
                        placeholder="Additional details about this credit entry"></textarea>
            </div>
            
            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="creditLoading" class="flex-1 btn-primary">
                <Loader2 v-if="creditLoading" class="mr-2 h-4 w-4 animate-spin" />
                Add Credit Entry
              </button>
              <button type="button" @click="showCreditModal = false" class="flex-1 btn-outline">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
  
  <div v-else class="flex items-center justify-center min-h-96">
    <Loader2 class="h-8 w-8 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useRoute, useRouter } from 'vue-router';
import { 
  ArrowLeft, 
  Download, 
  Edit2, 
  RefreshCw,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowDownCircle,
  Loader2,
  Banknote,
  Smartphone,
  Building2,
  CreditCard,
  Plus,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  MoreVertical
} from 'lucide-vue-next';
import { jsPDF } from 'jspdf';
import { 
  accountService, 
  accountTransactionService,
  type Account,
  type AccountTransaction
} from '../services/pocketbase';

const route = useRoute();
const router = useRouter();

const account = ref<Account | null>(null);
const accountTransactions = ref<AccountTransaction[]>([]);
const showEditModal = ref(false);
const showCreditModal = ref(false);
const editLoading = ref(false);
const creditLoading = ref(false);
const recalculating = ref(false);
const filterPeriod = ref('all');
const showExportDropdown = ref(false);
const showMobileMenu = ref(false);

const editForm = reactive({
  name: '',
  type: '' as Account['type'],
  account_number: '',
  bank_name: '',
  description: '',
  is_active: true
});

const creditForm = reactive({
  amount: 0,
  description: '',
  reference: '',
  notes: '',
  transaction_date: new Date().toISOString().split('T')[0]
});

const totalPayments = computed(() => {
  return accountTransactions.value
    .filter(transaction => transaction.type === 'debit')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
});

const thisMonthTransactions = computed(() => {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  
  return accountTransactions.value.filter(transaction => {
    const transactionDate = new Date(transaction.transaction_date);
    return transactionDate.getMonth() === thisMonth && transactionDate.getFullYear() === thisYear;
  }).length;
});

const averageTransaction = computed(() => {
  if (accountTransactions.value.length === 0) return 0;
  return totalPayments.value / accountTransactions.value.length;
});

const filteredTransactions = computed(() => {
  let filtered = [...accountTransactions.value];
  
  if (filterPeriod.value !== 'all') {
    const now = new Date();
    const filterDate = new Date();
    
    switch (filterPeriod.value) {
      case 'month':
        filterDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        filterDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        filterDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    filtered = filtered.filter(transaction => 
      new Date(transaction.transaction_date) >= filterDate
    );
  }
  
  // Calculate running balance for each transaction
  let runningBalance = account.value?.opening_balance || 0;
  
  // Sort by date (oldest first) for balance calculation
  const sortedTransactions = filtered.sort((a, b) => 
    new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
  );
  
  // Calculate running balance
  sortedTransactions.forEach(transaction => {
    if (transaction.type === 'credit') {
      runningBalance += transaction.amount;
    } else {
      runningBalance -= transaction.amount;
    }
    (transaction as any).running_balance = runningBalance;
  });
  
  // Return in reverse order (newest first) for display
  return sortedTransactions.reverse();
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

const goBack = () => {
  try {
    router.back();
  } catch (error) {
    console.error('Navigation error:', error);
    router.push('/accounts');
  }
};

const loadAccountData = async () => {
  const accountId = route.params.id as string;
  
  try {
    const [accountData, transactions] = await Promise.all([
      accountService.getById(accountId),
      accountTransactionService.getByAccount(accountId)
    ]);
    
    
    account.value = accountData;
    accountTransactions.value = transactions.sort((a, b) => 
      new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );
      
    if (!account.value) {
      console.error('Account not found, redirecting to accounts list');
      router.push('/accounts');
    }
  } catch (error) {
    console.error('Error loading account data:', error);
    router.push('/accounts');
  }
};

const editAccount = () => {
  if (!account.value) return;
  
  Object.assign(editForm, {
    name: account.value.name,
    type: account.value.type,
    account_number: account.value.account_number || '',
    bank_name: account.value.bank_name || '',
    description: account.value.description || '',
    is_active: account.value.is_active
  });
  
  showEditModal.value = true;
};

const saveAccount = async () => {
  if (!account.value) return;
  
  editLoading.value = true;
  try {
    await accountService.update(account.value.id!, editForm);
    await loadAccountData();
    showEditModal.value = false;
  } catch (error) {
    console.error('Error updating account:', error);
  } finally {
    editLoading.value = false;
  }
};

const recalculateBalance = async () => {
  if (!account.value) return;
  
  recalculating.value = true;
  try {
    // Calculate balance using account transaction service
    const newBalance = await accountTransactionService.calculateAccountBalance(account.value.id!);
    
    // Update the account balance
    await accountService.update(account.value.id!, { current_balance: newBalance });
    
    await loadAccountData();
  } catch (error) {
    console.error('Error recalculating balance:', error);
  } finally {
    recalculating.value = false;
  }
};

const exportStatement = () => {
  if (!account.value) return;
  
  // Create CSV content
  const csvContent = generateStatementCSV();
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${account.value.name}_statement_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const addFooter = (doc: any, pageWidth: number, pageHeight: number, margin: number) => {
  const footerY = pageHeight - 15;
  
  // Horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  // Footer text
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128); // Gray color
  doc.text('Generated with SiteWise - One stop solution for construction site management', margin, footerY);
  
  // Page number (right aligned)
  const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
  doc.text(`Page ${pageNum}`, pageWidth - margin - 15, footerY);
};

const exportStatementPDF = async () => {
  if (!account.value) return;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  let yPosition = 25;
  
  // Load and add logo
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      logoImg.onload = resolve;
      logoImg.onerror = reject;
      logoImg.src = '/logo.png';
    });
    
    // Add logo to the right side of header with proper aspect ratio
    const maxLogoWidth = 25;
    const maxLogoHeight = 15;
    
    // Calculate aspect ratio and fit within bounds
    const aspectRatio = logoImg.naturalWidth / logoImg.naturalHeight;
    let logoWidth = maxLogoWidth;
    let logoHeight = maxLogoWidth / aspectRatio;
    
    // If height exceeds max, scale by height instead
    if (logoHeight > maxLogoHeight) {
      logoHeight = maxLogoHeight;
      logoWidth = maxLogoHeight * aspectRatio;
    }
    
    const logoX = pageWidth - margin - logoWidth;
    const logoY = yPosition - 5;
    
    doc.addImage(logoImg, 'PNG', logoX, logoY, logoWidth, logoHeight);
  } catch (error) {
    console.warn('Could not load logo for PDF:', error);
    // Continue without logo if it fails to load
  }
  
  // Document title (no SiteWise text in header, just logo)
  yPosition += 10;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0); // Black for main content
  doc.text('Account Statement', margin, yPosition);
  
  // Account information
  yPosition += 12;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Account: ${account.value.name}`, margin, yPosition);
  
  yPosition += 6;
  doc.text(`Type: ${account.value.type.replace('_', ' ').toUpperCase()}`, margin, yPosition);
  
  yPosition += 6;
  doc.text(`Generated: ${new Date().toLocaleDateString('en-CA')}`, margin, yPosition);
  
  yPosition += 15;
  
  // Table headers
  doc.setFont('helvetica', 'bold');
  const headers = ['Date', 'Description', 'Debit', 'Credit'];
  const colWidths = [30, 90, 35, 35];
  let xPos = margin;
  
  headers.forEach((header, i) => {
    doc.text(header, xPos, yPosition);
    xPos += colWidths[i];
  });
  
  yPosition += 8;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;
  
  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Use ascending order (oldest first) for PDF
  const ascendingTransactions = [...filteredTransactions.value].reverse();
  
  ascendingTransactions.forEach(transaction => {
    if (yPosition > 240) { // Leave more space for footer
      doc.addPage();
      yPosition = 30;
    }
    
    xPos = margin;
    
    // Date column
    doc.setTextColor(0, 0, 0);
    doc.text(new Date(transaction.transaction_date).toLocaleDateString('en-CA'), xPos, yPosition);
    xPos += colWidths[0];
    
    // Description column with reference as subtext
    doc.setTextColor(0, 0, 0);
    doc.text(transaction.description.substring(0, 50), xPos, yPosition);
    if (transaction.reference) {
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128); // Gray color
      doc.text(`Ref: ${transaction.reference}`, xPos, yPosition + 4);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
    }
    xPos += colWidths[1];
    
    // Debit column
    doc.text(transaction.type === 'debit' ? transaction.amount.toFixed(2) : '', xPos, yPosition);
    xPos += colWidths[2];
    
    // Credit column
    doc.text(transaction.type === 'credit' ? transaction.amount.toFixed(2) : '', xPos, yPosition);
    
    yPosition += transaction.reference ? 10 : 6; // Extra space if reference exists
  });
  
  // Summary
  if (yPosition > 200) { // Leave more space for footer
    doc.addPage();
    yPosition = 30;
  }
  
  yPosition += 10;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;
  
  doc.setFont('helvetica', 'bold');
  
  // Calculate totals
  const totalDebits = ascendingTransactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalCredits = ascendingTransactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  
  doc.text(`Total Debits: ${totalDebits.toFixed(2)}`, margin, yPosition);
  yPosition += 6;
  doc.text(`Total Credits: ${totalCredits.toFixed(2)}`, margin, yPosition);
  yPosition += 6;
  const balanceText = account.value.current_balance >= 0 
    ? `Current Balance: ${account.value.current_balance.toFixed(2)} Dr`
    : `Current Balance: ${Math.abs(account.value.current_balance).toFixed(2)} Cr`;
  doc.text(balanceText, margin, yPosition);
  
  // Add footer to all pages
  const totalPages = doc.internal.pages.length - 1; // Subtract 1 because pages array includes a null first element
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, pageWidth, pageHeight, margin);
  }
  
  // Save the PDF
  doc.save(`${account.value.name}_statement_${new Date().toISOString().split('T')[0]}.pdf`);
};

const generateStatementCSV = () => {
  if (!account.value) return '';
  
  const headers = ['Date', 'Description', 'Reference', 'Debit', 'Credit', 'Notes'];
  
  const rows = filteredTransactions.value.map(transaction => [
    new Date(transaction.transaction_date).toLocaleDateString('en-CA'),
    transaction.description,
    transaction.reference || '',
    transaction.type === 'debit' ? transaction.amount : '', // Debit
    transaction.type === 'credit' ? transaction.amount : '', // Credit
    transaction.notes || ''
  ]);
  
  // Add summary row with total debits and credits
  const totalDebits = filteredTransactions.value
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalCredits = filteredTransactions.value
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  
  rows.push([
    '',
    'TOTALS',
    '',
    totalDebits.toFixed(2),
    totalCredits.toFixed(2),
    `Current Balance: ${account.value.current_balance.toFixed(2)}`
  ]);
  
  // Convert to CSV
  const csvRows = [headers, ...rows];
  return csvRows.map(row => 
    row.map(field => 
      typeof field === 'string' && field.includes(',') ? `"${field}"` : field
    ).join(',')
  ).join('\n');
};

const saveCreditEntry = async () => {
  if (!account.value) return;
  
  creditLoading.value = true;
  try {
    await accountTransactionService.create({
      account: account.value.id!,
      type: 'credit',
      amount: creditForm.amount,
      transaction_date: creditForm.transaction_date,
      description: creditForm.description,
      reference: creditForm.reference,
      notes: creditForm.notes
    });
    
    // Reset form
    Object.assign(creditForm, {
      amount: 0,
      description: '',
      reference: '',
      notes: '',
      transaction_date: new Date().toISOString().split('T')[0]
    });
    
    showCreditModal.value = false;
    await loadAccountData();
  } catch (error) {
    console.error('Error saving credit entry:', error);
  } finally {
    creditLoading.value = false;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-CA');
};

// Handle async PDF export
const handleExportPdf = async () => {
  try {
    await exportStatementPDF();
  } catch (error) {
    console.error('Error exporting PDF:', error);
  }
};

// Handle mobile menu actions
const handleMobileAction = async (action: string) => {
  // Close the menu first
  showMobileMenu.value = false;
  
  // Then execute the action after a small delay to ensure menu closes
  setTimeout(async () => {
    try {
      switch (action) {
        case 'recalculateBalance':
          await recalculateBalance();
          break;
        case 'exportCsv':
          exportStatement();
          break;
        case 'exportPdf':
          await handleExportPdf();
          break;
        case 'addCredit':
          showCreditModal.value = true;
          break;
        case 'editAccount':
          editAccount();
          break;
        default:
          console.warn('Unknown mobile action:', action);
      }
    } catch (error) {
      console.error('Error executing mobile action:', action, error);
    }
  }, 100);
};

// Click outside handler for dropdowns
const handleClickOutside = (event: Event) => {
  const exportDropdown = document.querySelector('.export-dropdown');
  const mobileMenu = document.querySelector('.mobile-menu');
  
  if (exportDropdown && !exportDropdown.contains(event.target as Node)) {
    showExportDropdown.value = false;
  }
  
  if (mobileMenu && !mobileMenu.contains(event.target as Node)) {
    showMobileMenu.value = false;
  }
};

// Event listeners using @vueuse/core
useEventListener(document, 'click', handleClickOutside);

onMounted(() => {
  loadAccountData();
});
</script>