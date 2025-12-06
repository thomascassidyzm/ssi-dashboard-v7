<template>
  <section class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold text-slate-100 flex items-center gap-2">
        <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
        </svg>
        Generation Queue
        <span class="text-sm text-slate-400 font-normal">({{ filteredItems.length }} items)</span>
      </h2>

      <!-- Status Filter -->
      <div class="flex items-center gap-2">
        <label class="text-sm text-slate-400">Filter:</label>
        <select
          :value="statusFilter"
          @change="$emit('update-filter', ($event.target as HTMLSelectElement).value)"
          class="bg-slate-700 text-slate-100 px-3 py-2 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
        >
          <option value="all">All Items</option>
          <option value="queued">Queued</option>
          <option value="generating">Generating</option>
          <option value="complete">Complete</option>
          <option value="failed">Failed</option>
        </select>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredItems.length === 0" class="text-center py-12">
      <svg class="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
      </svg>
      <p class="text-slate-400">No items in queue</p>
    </div>

    <!-- Virtualized Queue List -->
    <div v-else class="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
      <QueueItem
        v-for="item in visibleItems"
        :key="item.uuid"
        :item="item"
      />
    </div>

    <!-- Load More (if using pagination) -->
    <div v-if="hasMore" class="mt-4 text-center">
      <button
        @click="loadMore"
        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition"
      >
        Load More
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import QueueItem from './QueueItem.vue'

interface QueueItemData {
  uuid: string
  text: string
  voiceId: string
  status: 'queued' | 'generating' | 'complete' | 'failed'
  audioUrl?: string
  error?: string
}

interface Props {
  items: QueueItemData[]
  statusFilter: string
}

const props = defineProps<Props>()

defineEmits<{
  'update-filter': [value: string]
}>()

const pageSize = ref(50)
const currentPage = ref(1)

// Filter items by status
const filteredItems = computed(() => {
  if (props.statusFilter === 'all') {
    return props.items
  }
  return props.items.filter(item => item.status === props.statusFilter)
})

// Paginate for performance
const visibleItems = computed(() => {
  const start = 0
  const end = currentPage.value * pageSize.value
  return filteredItems.value.slice(start, end)
})

const hasMore = computed(() => {
  return visibleItems.value.length < filteredItems.value.length
})

const loadMore = () => {
  currentPage.value++
}
</script>

<style scoped>
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgb(71, 85, 105) rgb(30, 41, 59);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgb(30, 41, 59);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgb(71, 85, 105);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgb(100, 116, 139);
}
</style>
