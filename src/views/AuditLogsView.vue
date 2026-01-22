<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
    <!-- Header Section -->
    <div class="max-w-7xl mx-auto mb-8">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
              <History class="h-6 w-6 text-white" />
            </div>
            <h1 class="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              {{ t('auditLogs.title') }}
            </h1>
          </div>
          <p class="text-gray-600 dark:text-gray-400 max-w-2xl">
            {{ t('auditLogs.subtitle') }}
          </p>
        </div>

        <!-- Refresh Button -->
        <div class="flex items-center gap-3">
          <button
            @click="loadLogs"
            :disabled="loading"
            class="btn-outline gap-2"
          >
            <RefreshCw class="h-5 w-5" :class="{ 'animate-spin': loading }" />
            {{ t('common.refresh') }}
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto space-y-6">
      <!-- Filters Card -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Filter class="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('auditLogs.filters') }}</h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Entity Type Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ t('auditLogs.entityType') }}
            </label>
            <select
              v-model="filters.entity_type"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{{ t('common.all') }}</option>
              <option v-for="type in entityTypes" :key="type" :value="type">
                {{ formatEntityType(type) }}
              </option>
            </select>
          </div>

          <!-- Action Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ t('auditLogs.action') }}
            </label>
            <select
              v-model="filters.action"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{{ t('common.all') }}</option>
              <option value="CREATE">{{ t('auditLogs.actions.create') }}</option>
              <option value="UPDATE">{{ t('auditLogs.actions.update') }}</option>
              <option value="DELETE">{{ t('auditLogs.actions.delete') }}</option>
            </select>
          </div>

          <!-- User Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ t('auditLogs.user') }}
            </label>
            <select
              v-model="filters.user_id"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{{ t('common.all') }}</option>
              <option v-for="user in users" :key="user.user_id" :value="user.user_id">
                {{ user.user_email || user.user_id }}
              </option>
            </select>
          </div>

          <!-- Date Range -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ t('auditLogs.dateRange') }}
            </label>
            <div class="flex gap-2">
              <input
                v-model="filters.from_date"
                type="date"
                class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
              <input
                v-model="filters.to_date"
                type="date"
                class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div class="flex justify-end mt-4 gap-2">
          <button @click="clearFilters" class="btn-outline">
            {{ t('common.clear') }}
          </button>
          <button @click="applyFilters" class="btn-primary">
            {{ t('common.apply') }}
          </button>
        </div>
      </div>

      <!-- Stats Summary -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText class="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ totalCount }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('auditLogs.totalLogs') }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Plus class="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ actionCounts.CREATE }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('auditLogs.actions.create') }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Edit3 class="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ actionCounts.UPDATE }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('auditLogs.actions.update') }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Trash2 class="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ actionCounts.DELETE }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('auditLogs.actions.delete') }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Audit Logs List -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <History class="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('auditLogs.activityLog') }}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('auditLogs.showingLogs', { count: logs.length, total: totalCount }) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="p-8 text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p class="mt-4 text-gray-600 dark:text-gray-400">{{ t('common.loading') }}...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="logs.length === 0" class="p-8 text-center">
          <History class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">{{ t('auditLogs.noLogs') }}</h3>
          <p class="mt-2 text-gray-600 dark:text-gray-400">{{ t('auditLogs.noLogsDescription') }}</p>
        </div>

        <!-- Logs Timeline -->
        <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
          <div
            v-for="log in logs"
            :key="log.id"
            class="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
            @click="selectedLog = log"
          >
            <div class="flex items-start gap-4">
              <!-- Action Icon -->
              <div :class="getActionIconClass(log.action)">
                <Plus v-if="log.action === 'CREATE'" class="h-4 w-4" />
                <Edit3 v-else-if="log.action === 'UPDATE'" class="h-4 w-4" />
                <Trash2 v-else class="h-4 w-4" />
              </div>

              <!-- Log Content -->
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2 mb-1">
                  <span :class="getActionBadgeClass(log.action)">
                    {{ t(`auditLogs.actions.${log.action.toLowerCase()}`) }}
                  </span>
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ formatEntityType(log.entity_type) }}
                  </span>
                  <span class="text-sm text-gray-600 dark:text-gray-400">
                    {{ log.entity_name || log.entity_id }}
                  </span>
                </div>

                <div class="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <span class="flex items-center gap-1">
                    <User class="h-3.5 w-3.5" />
                    {{ log.user_email || t('auditLogs.unknownUser') }}
                  </span>
                  <span v-if="log.user_role" class="flex items-center gap-1">
                    <Shield class="h-3.5 w-3.5" />
                    {{ t(`users.roles.${log.user_role}`) }}
                  </span>
                  <span class="flex items-center gap-1">
                    <Clock class="h-3.5 w-3.5" />
                    {{ formatTimestamp(log.timestamp) }}
                  </span>
                </div>

                <!-- Changes Preview (for updates) -->
                <div v-if="log.action === 'UPDATE' && log.changes" class="mt-2">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="field in Object.keys(log.changes).slice(0, 3)"
                      :key="field"
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    >
                      {{ formatFieldName(field) }}
                    </span>
                    <span
                      v-if="Object.keys(log.changes).length > 3"
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    >
                      +{{ Object.keys(log.changes).length - 3 }} {{ t('common.more') }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- View Details Arrow -->
              <ChevronRight class="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalCount > pageSize" class="p-4 border-t border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ t('auditLogs.page', { current: currentPage, total: totalPages }) }}
            </p>
            <div class="flex gap-2">
              <button
                @click="prevPage"
                :disabled="currentPage === 1"
                class="btn-outline px-3 py-1.5 text-sm"
              >
                {{ t('common.previous') }}
              </button>
              <button
                @click="nextPage"
                :disabled="currentPage >= totalPages"
                class="btn-outline px-3 py-1.5 text-sm"
              >
                {{ t('common.next') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Log Detail Modal -->
    <div v-if="selectedLog" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" @click.self="selectedLog = null">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div :class="getActionIconClass(selectedLog.action)">
                <Plus v-if="selectedLog.action === 'CREATE'" class="h-5 w-5" />
                <Edit3 v-else-if="selectedLog.action === 'UPDATE'" class="h-5 w-5" />
                <Trash2 v-else class="h-5 w-5" />
              </div>
              <div>
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ t('auditLogs.logDetails') }}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ formatTimestamp(selectedLog.timestamp) }}</p>
              </div>
            </div>
            <button @click="selectedLog = null" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <X class="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div class="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          <!-- Summary -->
          <div class="space-y-4 mb-6">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('auditLogs.action') }}</p>
                <span :class="getActionBadgeClass(selectedLog.action)" class="mt-1 inline-block">
                  {{ t(`auditLogs.actions.${selectedLog.action.toLowerCase()}`) }}
                </span>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('auditLogs.entityType') }}</p>
                <p class="text-gray-900 dark:text-white">{{ formatEntityType(selectedLog.entity_type) }}</p>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('auditLogs.entityName') }}</p>
                <p class="text-gray-900 dark:text-white">{{ selectedLog.entity_name || selectedLog.entity_id }}</p>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('auditLogs.user') }}</p>
                <p class="text-gray-900 dark:text-white">{{ selectedLog.user_email || t('auditLogs.unknownUser') }}</p>
              </div>
              <div v-if="selectedLog.user_role">
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('auditLogs.role') }}</p>
                <p class="text-gray-900 dark:text-white">{{ t(`users.roles.${selectedLog.user_role}`) }}</p>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('auditLogs.entityId') }}</p>
                <p class="text-gray-900 dark:text-white font-mono text-sm">{{ selectedLog.entity_id }}</p>
              </div>
            </div>
          </div>

          <!-- Changes Detail (for updates) -->
          <div v-if="selectedLog.action === 'UPDATE' && selectedLog.changes && Object.keys(selectedLog.changes).length > 0">
            <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('auditLogs.changesDetail') }}</h4>
            <div class="space-y-3">
              <div
                v-for="(change, field) in selectedLog.changes"
                :key="field"
                class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4"
              >
                <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ formatFieldName(field) }}</p>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">{{ t('auditLogs.oldValue') }}</p>
                    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
                      <pre class="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap break-all">{{ formatValue(change.old) }}</pre>
                    </div>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">{{ t('auditLogs.newValue') }}</p>
                    <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2">
                      <pre class="text-sm text-green-700 dark:text-green-300 whitespace-pre-wrap break-all">{{ formatValue(change.new) }}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- No changes (for create/delete) -->
          <div v-else-if="selectedLog.action !== 'UPDATE'" class="text-center py-4 text-gray-500 dark:text-gray-400">
            <p>{{ selectedLog.action === 'CREATE' ? t('auditLogs.recordCreated') : t('auditLogs.recordDeleted') }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import {
  History,
  RefreshCw,
  Filter,
  FileText,
  Plus,
  Edit3,
  Trash2,
  User,
  Shield,
  Clock,
  ChevronRight,
  X
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { auditLogService, type AuditLog, type AuditLogFilters } from '../services/pocketbase';

const { t } = useI18n();

// State
const loading = ref(false);
const logs = ref<AuditLog[]>([]);
const totalCount = ref(0);
const entityTypes = ref<string[]>([]);
const users = ref<{ user_id: string; user_email: string }[]>([]);
const selectedLog = ref<AuditLog | null>(null);

// Pagination
const pageSize = 50;
const currentPage = ref(1);
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize));

// Filters
const filters = reactive<AuditLogFilters>({
  entity_type: '',
  action: undefined,
  user_id: '',
  from_date: '',
  to_date: ''
});

// Action counts for stats
const actionCounts = computed(() => {
  const counts = { CREATE: 0, UPDATE: 0, DELETE: 0 };
  for (const log of logs.value) {
    if (log.action in counts) {
      counts[log.action as keyof typeof counts]++;
    }
  }
  return counts;
});

// Load audit logs
async function loadLogs() {
  loading.value = true;
  try {
    const activeFilters: AuditLogFilters = {};
    if (filters.entity_type) activeFilters.entity_type = filters.entity_type;
    if (filters.action) activeFilters.action = filters.action;
    if (filters.user_id) activeFilters.user_id = filters.user_id;
    if (filters.from_date) activeFilters.from_date = filters.from_date;
    if (filters.to_date) activeFilters.to_date = filters.to_date;

    const offset = (currentPage.value - 1) * pageSize;
    const result = await auditLogService.getAll(activeFilters, pageSize, offset);
    logs.value = result.logs;
    totalCount.value = result.totalCount;
  } catch (error) {
    console.error('Failed to load audit logs:', error);
  } finally {
    loading.value = false;
  }
}

// Load filter options
async function loadFilterOptions() {
  try {
    const [types, userList] = await Promise.all([
      auditLogService.getEntityTypes(),
      auditLogService.getUsers()
    ]);
    entityTypes.value = types;
    users.value = userList;
  } catch (error) {
    console.error('Failed to load filter options:', error);
  }
}

// Filter actions
function applyFilters() {
  currentPage.value = 1;
  loadLogs();
}

function clearFilters() {
  filters.entity_type = '';
  filters.action = undefined;
  filters.user_id = '';
  filters.from_date = '';
  filters.to_date = '';
  currentPage.value = 1;
  loadLogs();
}

// Pagination
function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    loadLogs();
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    loadLogs();
  }
}

// Formatting helpers
function formatEntityType(type: string): string {
  // Convert snake_case to Title Case
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatFieldName(field: string): string {
  return field
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(empty)';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function getActionIconClass(action: string): string {
  const base = 'p-2 rounded-lg';
  switch (action) {
    case 'CREATE':
      return `${base} bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400`;
    case 'UPDATE':
      return `${base} bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400`;
    case 'DELETE':
      return `${base} bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400`;
    default:
      return `${base} bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400`;
  }
}

function getActionBadgeClass(action: string): string {
  const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';
  switch (action) {
    case 'CREATE':
      return `${base} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300`;
    case 'UPDATE':
      return `${base} bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300`;
    case 'DELETE':
      return `${base} bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300`;
    default:
      return `${base} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300`;
  }
}

// Initialize
onMounted(() => {
  loadLogs();
  loadFilterOptions();
});
</script>
