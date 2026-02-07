<template>
  <div class="filter-bar bg-slate-800 border-b border-slate-700 px-6 py-3">
    <div class="filter-controls flex flex-wrap items-center gap-4">
      <!-- Pagination -->
      <div class="pagination flex items-center gap-2">
        <button
          @click="prevPage"
          :disabled="!canGoPrev"
          class="px-3 py-2 rounded-lg text-sm font-medium transition-all"
          :class="canGoPrev
            ? 'bg-slate-700 text-white hover:bg-slate-600'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed'"
        >
          ← Prev 50
        </button>
        <span class="text-sm text-slate-300 font-mono px-2">
          {{ localSeedStart }} – {{ localSeedEnd }}
        </span>
        <button
          @click="nextPage"
          :disabled="!canGoNext"
          class="px-3 py-2 rounded-lg text-sm font-medium transition-all"
          :class="canGoNext
            ? 'bg-slate-700 text-white hover:bg-slate-600'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed'"
        >
          Next 50 →
        </button>
      </div>

      <!-- Search -->
      <div class="search-field w-48">
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="localSearch"
            type="text"
            placeholder="Search..."
            class="w-full pl-9 pr-8 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            @input="onSearchInput"
          />
          <button
            v-if="localSearch"
            @click="clearSearch"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            title="Clear search"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Status Filter -->
      <select
        v-model="localStatus"
        class="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        @change="onFilterChange"
      >
        <option value="all">All Samples</option>
        <option value="flagged">Flagged</option>
      </select>

      <!-- Regen Queue Toggle -->
      <button
        @click="toggleFlaggedOnly"
        class="px-3 py-2 rounded-lg font-medium text-sm transition-all"
        :class="showFlaggedOnly
          ? 'bg-amber-500 text-white hover:bg-amber-600'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'"
        title="Show only items pending regeneration"
      >
        Regen Queue
      </button>

      <!-- Clear All Filters -->
      <button
        v-if="hasActiveFilters"
        @click="clearAllFilters"
        class="ml-auto px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        Clear Filters
      </button>
    </div>

    <!-- Active Filters Summary -->
    <div v-if="activeFilterCount > 0" class="active-filters-summary mt-3 flex flex-wrap items-center gap-2">
      <span class="text-xs text-slate-400">Active filters:</span>

      <span v-if="localSearch" class="filter-tag">
        Search: "{{ localSearch }}"
        <button @click="clearSearch" class="ml-1 hover:text-white">×</button>
      </span>

      <span v-if="localStatus !== 'all'" class="filter-tag">
        Status: {{ formatStatus(localStatus) }}
        <button @click="localStatus = 'all'; onFilterChange();" class="ml-1 hover:text-white">×</button>
      </span>

      <span v-if="showFlaggedOnly" class="filter-tag">
        Regen Queue
        <button @click="toggleFlaggedOnly" class="ml-1 hover:text-white">×</button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { SampleStatus } from '@/types/production';

// Props
const props = defineProps<{
  status?: SampleStatus | 'all' | 'flagged';
  seedStart?: string;
  seedEnd?: string;
  searchText?: string;
  flaggedOnly?: boolean;
  totalSeeds?: number;
}>();

// Emits
const emit = defineEmits<{
  'update:status': [value: SampleStatus | 'all' | 'flagged'];
  'update:seedStart': [value: string];
  'update:seedEnd': [value: string];
  'update:searchText': [value: string];
  'update:flaggedOnly': [value: boolean];
  change: [];
}>();

// Pagination constants
const PAGE_SIZE = 50;

// Local state
const localStatus = ref(props.status || 'all');
const localSeedStart = ref(props.seedStart || 'S0001');
const localSeedEnd = ref(props.seedEnd || 'S0050');
const localSearch = ref(props.searchText || '');
const showFlaggedOnly = ref(props.flaggedOnly || false);

// Debounce timer for search
let searchDebounce: NodeJS.Timeout | null = null;

// Pagination computed values
const currentStartNum = computed(() => {
  const match = localSeedStart.value.match(/S(\d+)/i);
  return match ? parseInt(match[1], 10) : 1;
});

const currentEndNum = computed(() => {
  const match = localSeedEnd.value.match(/S(\d+)/i);
  return match ? parseInt(match[1], 10) : PAGE_SIZE;
});

const maxSeeds = computed(() => props.totalSeeds || 300);

const canGoPrev = computed(() => currentStartNum.value > 1);
const canGoNext = computed(() => currentEndNum.value < maxSeeds.value);

// Count of active non-pagination filters (for showing summary)
const activeFilterCount = computed(() => {
  let count = 0;
  if (localSearch.value) count++;
  if (localStatus.value !== 'all') count++;
  if (showFlaggedOnly.value) count++;
  return count;
});

// hasActiveFilters includes pagination awareness
const hasActiveFilters = computed(() => {
  return localStatus.value !== 'all'
    || localSearch.value !== ''
    || showFlaggedOnly.value;
});

// Methods
const formatSeedId = (num: number): string => {
  return `S${String(num).padStart(4, '0')}`;
};

const prevPage = () => {
  const newStart = Math.max(1, currentStartNum.value - PAGE_SIZE);
  const newEnd = newStart + PAGE_SIZE - 1;
  localSeedStart.value = formatSeedId(newStart);
  localSeedEnd.value = formatSeedId(newEnd);
  emitPageChange();
};

const nextPage = () => {
  const newStart = currentEndNum.value + 1;
  const newEnd = Math.min(maxSeeds.value, newStart + PAGE_SIZE - 1);
  localSeedStart.value = formatSeedId(newStart);
  localSeedEnd.value = formatSeedId(newEnd);
  emitPageChange();
};

const emitPageChange = () => {
  emit('update:seedStart', localSeedStart.value);
  emit('update:seedEnd', localSeedEnd.value);
  emit('change');
};

const onSearchInput = () => {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    emit('update:searchText', localSearch.value);
    emit('change');
  }, 300);
};

const onFilterChange = () => {
  emit('update:status', localStatus.value as SampleStatus | 'all' | 'flagged');
  emit('change');
};

const toggleFlaggedOnly = () => {
  showFlaggedOnly.value = !showFlaggedOnly.value;
  emit('update:flaggedOnly', showFlaggedOnly.value);
  emit('change');
};

const clearSearch = () => {
  localSearch.value = '';
  emit('update:searchText', '');
  emit('change');
};

const clearAllFilters = () => {
  localStatus.value = 'all';
  localSearch.value = '';
  showFlaggedOnly.value = false;

  emit('update:status', 'all');
  emit('update:searchText', '');
  emit('update:flaggedOnly', false);
  emit('change');
};

const formatStatus = (status: string): string => {
  return status.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

// Watch props for external changes
watch(() => props.status, (newVal) => {
  if (newVal) localStatus.value = newVal;
});

watch(() => props.seedStart, (newVal) => {
  if (newVal !== undefined) localSeedStart.value = newVal;
});

watch(() => props.seedEnd, (newVal) => {
  if (newVal !== undefined) localSeedEnd.value = newVal;
});

watch(() => props.searchText, (newVal) => {
  if (newVal !== undefined) localSearch.value = newVal;
});

watch(() => props.flaggedOnly, (newVal) => {
  if (newVal !== undefined) showFlaggedOnly.value = newVal;
});
</script>

<style scoped>
.filter-tag {
  @apply inline-flex items-center gap-1 px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-md;
}

.filter-tag button {
  @apply transition-colors;
}
</style>
