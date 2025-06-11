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
      <div class="flex items-center space-x-3">
        <button @click="recalculateBalance" :disabled="recalculating" class="btn-outline">
          <RefreshCw :class="{ 'animate-spin': recalculating }" class="mr-2 h-4 w-4" />
          Recalculate Balance
        </button>
        <button @click="exportStatement" class="btn-outline">
          <Download class="mr-2 h-4 w-4" />
          Export Statement
        </button>
        <button @click="editAccount" class="btn-primary">
          <Edit2 class="mr-2 h-4 w-4" />
          Edit Account
        </button>
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
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Vendor</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Balance</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reference</th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="transaction in filteredTransactions" :key="transaction.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {{ formatDate(transaction.payment_date) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900 dark:text-white">Payment to {{ transaction.expand?.vendor?.name || 'Unknown Vendor' }}</div>
                <div v-if="transaction.notes" class="text-sm text-gray-500 dark:text-gray-400">{{ transaction.notes }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {{ transaction.expand?.vendor?.name || 'Unknown Vendor' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-medium text-red-600 dark:text-red-400">
                  -₹{{ transaction.amount.toFixed(2) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                ₹{{ transaction.running_balance?.toFixed(2) || '0.00' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {{ transaction.reference || '-' }}
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
    <div v-if="showEditModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
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
  </div>
  
  <div v-else class="flex items-center justify-center min-h-96">
    <Loader2 class="h-8 w-8 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
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
  CreditCard
} from 'lucide-vue-next';
import { 
  accountService, 
  paymentService,
  type Account,
  type Payment
} from '../services/pocketbase';

const route = useRoute();
const router = useRouter();

const account = ref<Account | null>(null);
const accountTransactions = ref<Payment[]>([]);
const showEditModal = ref(false);
const editLoading = ref(false);
const recalculating = ref(false);
const filterPeriod = ref('all');

const editForm = reactive({
  name: '',
  type: '' as Account['type'],
  account_number: '',
  bank_name: '',
  description: '',
  is_active: true
});

const totalPayments = computed(() => {
  return accountTransactions.value.reduce((sum, payment) => sum + payment.amount, 0);
});

const thisMonthTransactions = computed(() => {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  
  return accountTransactions.value.filter(transaction => {
    const transactionDate = new Date(transaction.payment_date);
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
      new Date(transaction.payment_date) >= filterDate
    );
  }
  
  // Calculate running balance for each transaction
  let runningBalance = account.value?.opening_balance || 0;
  
  // Sort by date (oldest first) for balance calculation
  const sortedTransactions = filtered.sort((a, b) => 
    new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
  );
  
  // Calculate running balance
  sortedTransactions.forEach(transaction => {
    runningBalance -= transaction.amount;
    transaction.running_balance = runningBalance;
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

const maskAccountNumber = (accountNumber: string) => {
  if (!accountNumber || accountNumber.length <= 4) return accountNumber;
  const lastFour = accountNumber.slice(-4);
  const masked = '*'.repeat(accountNumber.length - 4);
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
  console.log('Loading account data for ID:', accountId);
  
  try {
    const [accountData, allPayments] = await Promise.all([
      accountService.getById(accountId),
      paymentService.getAll()
    ]);
    
    console.log('Account data loaded:', accountData);
    console.log('All payments:', allPayments);
    
    account.value = accountData;
    accountTransactions.value = allPayments
      .filter(payment => payment.account === accountId)
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
      
    console.log('Account transactions:', accountTransactions.value);
      
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
    await accountService.recalculateBalance(account.value.id!);
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

const generateStatementCSV = () => {
  if (!account.value) return '';
  
  const headers = ['Date', 'Description', 'Vendor', 'Amount', 'Balance', 'Reference', 'Notes'];
  
  const rows = filteredTransactions.value.map(transaction => [
    transaction.payment_date,
    `Payment to ${transaction.expand?.vendor?.name || 'Unknown Vendor'}`,
    transaction.expand?.vendor?.name || 'Unknown Vendor',
    -transaction.amount, // Negative for payments
    transaction.running_balance || 0,
    transaction.reference || '',
    transaction.notes || ''
  ]);
  
  // Add summary row
  rows.push([
    '',
    'ACCOUNT SUMMARY',
    '',
    '',
    account.value.current_balance,
    '',
    `Statement generated on ${new Date().toISOString().split('T')[0]}`
  ]);
  
  // Convert to CSV
  const csvRows = [headers, ...rows];
  return csvRows.map(row => 
    row.map(field => 
      typeof field === 'string' && field.includes(',') ? `"${field}"` : field
    ).join(',')
  ).join('\n');
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

onMounted(() => {
  console.log('AccountDetailView mounted, route params:', route.params);
  loadAccountData();
});
</script>