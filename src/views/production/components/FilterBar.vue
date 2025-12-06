<template>
  <div class="filter-bar bg-slate-800 border-b border-slate-700 px-6 py-4">
    <div class="filter-controls flex flex-wrap items-center gap-4">
      <!-- Search -->
      <div class="search-field flex-1 min-w-64">
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="localSearch"
            type="text"
            placeholder="Search by text..."
            class="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            @input="onSearchInput"
          />
          <button
            v-if="localSearch"
            @click="clearSearch"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            title="Clear search"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Status Filter -->
      <div class="status-filter">
        <label class="block text-xs font-medium text-slate-400 mb-1">Status</label>
        <select
          v-model="localStatus"
          class="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          @change="onFilterChange"
        >
          <option value="all">All Samples</option>
          <option value="pending">Pending</option>
          <option value="flagged">Flagged (All)</option>
          <option value="flagged_text_edit">Flagged: Text Edit</option>
          <option value="flagged_regen_tts">Flagged: Regen TTS</option>
          <option value="flagged_human_needed">Flagged: Human Needed</option>
          <option value="approved">Approved</option>
          <option value="needs_review">Needs Review</option>
          <option value="in_pipeline">In Pipeline</option>
          <option value="complete">Complete</option>
        </select>
      </div>

      <!-- Seed Range Filter -->
      <div class="seed-range-filter flex items-end gap-2">
        <div>
          <label class="block text-xs font-medium text-slate-400 mb-1">Seed Range</label>
          <div class="flex items-center gap-2">
            <input
              v-model="localSeedStart"
              type="text"
              placeholder="S0001"
              class="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent uppercase"
              @input="onSeedRangeInput"
            />
            <span class="text-slate-400">to</span>
            <input
              v-model="localSeedEnd"
              type="text"
              placeholder="S0100"
              class="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent uppercase"
              @input="onSeedRangeInput"
            />
          </div>
        </div>
      </div>

      <!-- Quick Filters -->
      <div class="quick-filters flex items-end gap-2">
        <button
          @click="toggleFlaggedOnly"
          class="px-4 py-2 rounded-lg font-medium text-sm transition-all"
          :class="showFlaggedOnly
            ? 'bg-amber-500 text-white hover:bg-amber-600'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'"
          title="Show only flagged items"
        >
          <svg class="w-4 h-4 inline-block mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" />
          </svg>
          Flagged Only
        </button>
      </div>

      <!-- Clear All Filters -->
      <div class="clear-filters flex items-end ml-auto">
        <button
          v-if="hasActiveFilters"
          @click="clearAllFilters"
          class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          Clear Filters
        </button>
      </div>
    </div>

    <!-- Active Filters Summary -->
    <div v-if="hasActiveFilters" class="active-filters-summary mt-4 flex flex-wrap items-center gap-2">
      <span class="text-xs text-slate-400">Active filters:</span>

      <span v-if="localSearch" class="filter-tag">
        Search: "{{ localSearch }}"
        <button @click="clearSearch" class="ml-1 hover:text-white">×</button>
      </span>

      <span v-if="localStatus !== 'all'" class="filter-tag">
        Status: {{ formatStatus(localStatus) }}
        <button @click="localStatus = 'all'; onFilterChange();" class="ml-1 hover:text-white">×</button>
      </span>

      <span v-if="localSeedStart || localSeedEnd" class="filter-tag">
        Seeds: {{ localSeedStart || '...' }} - {{ localSeedEnd || '...' }}
        <button @click="clearSeedRange" class="ml-1 hover:text-white">×</button>
      </span>

      <span v-if="showFlaggedOnly" class="filter-tag">
        Flagged Only
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

// Local state (for debouncing)
const localStatus = ref(props.status || 'all');
const localSeedStart = ref(props.seedStart || '');
const localSeedEnd = ref(props.seedEnd || '');
const localSearch = ref(props.searchText || '');
const showFlaggedOnly = ref(props.flaggedOnly || false);

// Debounce timers
let searchDebounce: NodeJS.Timeout | null = null;
let seedRangeDebounce: NodeJS.Timeout | null = null;

// Computed
const hasActiveFilters = computed(() => {
  return localStatus.value !== 'all'
    || localSeedStart.value !== ''
    || localSeedEnd.value !== ''
    || localSearch.value !== ''
    || showFlaggedOnly.value;
});

// Methods
const onSearchInput = () => {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    emit('update:searchText', localSearch.value);
    emit('change');
  }, 300);
};

const onSeedRangeInput = () => {
  if (seedRangeDebounce) clearTimeout(seedRangeDebounce);
  seedRangeDebounce = setTimeout(() => {
    emit('update:seedStart', localSeedStart.value.toUpperCase());
    emit('update:seedEnd', localSeedEnd.value.toUpperCase());
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

const clearSeedRange = () => {
  localSeedStart.value = '';
  localSeedEnd.value = '';
  emit('update:seedStart', '');
  emit('update:seedEnd', '');
  emit('change');
};

const clearAllFilters = () => {
  localStatus.value = 'all';
  localSeedStart.value = '';
  localSeedEnd.value = '';
  localSearch.value = '';
  showFlaggedOnly.value = false;

  emit('update:status', 'all');
  emit('update:seedStart', '');
  emit('update:seedEnd', '');
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
