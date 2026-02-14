<template>
  <section class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-6">
    <h2 class="text-2xl font-semibold text-slate-100 mb-6 flex items-center gap-2">
      <svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
      </svg>
      Progress Dashboard
    </h2>

    <!-- Progress Stats Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <!-- Total Phrases -->
      <div class="bg-slate-900/50 rounded-lg p-4 text-center border border-slate-700">
        <div class="text-3xl font-bold text-slate-100">
          <span v-if="loading" class="inline-block w-6 h-6 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin"></span>
          <span v-else>{{ total }}</span>
        </div>
        <div class="text-sm text-slate-400 mt-1">Total Audio</div>
      </div>

      <!-- Generated -->
      <div class="bg-slate-900/50 rounded-lg p-4 text-center border border-emerald-500/30">
        <div class="text-3xl font-bold text-emerald-400">
          <span v-if="loading" class="inline-block w-6 h-6 border-2 border-emerald-900 border-t-emerald-400 rounded-full animate-spin"></span>
          <span v-else>{{ generated }}</span>
        </div>
        <div class="text-sm text-slate-400 mt-1">Generated</div>
      </div>

      <!-- Pending -->
      <div class="bg-slate-900/50 rounded-lg p-4 text-center border border-yellow-500/30">
        <div class="text-3xl font-bold text-yellow-400">
          <span v-if="loading" class="inline-block w-6 h-6 border-2 border-yellow-900 border-t-yellow-400 rounded-full animate-spin"></span>
          <span v-else>{{ pending }}</span>
        </div>
        <div class="text-sm text-slate-400 mt-1">Pending</div>
      </div>

      <!-- Failed -->
      <div class="bg-slate-900/50 rounded-lg p-4 text-center border border-red-500/30">
        <div class="text-3xl font-bold text-red-400">
          <span v-if="loading" class="inline-block w-6 h-6 border-2 border-red-900 border-t-red-400 rounded-full animate-spin"></span>
          <span v-else>{{ failed }}</span>
        </div>
        <div class="text-sm text-slate-400 mt-1">Failed</div>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-slate-400">Overall Progress</span>
        <span v-if="loading" class="text-sm text-slate-500">--</span>
        <span v-else class="text-sm font-semibold text-slate-100">{{ progressPercent }}%</span>
      </div>
      <div class="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
        <div v-if="loading" class="h-full w-full bg-slate-600 animate-pulse"></div>
        <div
          v-else
          class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
          :style="{ width: progressPercent + '%' }"
        ></div>
      </div>
    </div>

    <!-- Complete Banner (when 100% done) -->
    <div v-if="isComplete" class="bg-emerald-900/30 rounded-lg p-6 border border-emerald-500/30 text-center">
      <div class="flex items-center justify-center gap-3 mb-2">
        <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span class="text-2xl font-bold text-emerald-400">All Audio Generated</span>
      </div>
      <p class="text-slate-400">{{ generated }} files ready for use</p>
    </div>

    <!-- Cost & Time Estimates (only show when there's work pending) -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Cost Estimate -->
      <CostEstimate
        v-if="estimatedCost"
        :estimated="estimatedCost"
        :actual="actualCost"
      />
      <div v-else class="bg-slate-900/30 rounded-lg p-4 border border-slate-700">
        <div class="flex items-center gap-2 mb-2">
          <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="font-semibold text-slate-100">Cost Estimate</span>
        </div>
        <div class="text-sm text-slate-500">Run plan to estimate</div>
      </div>

      <!-- Time Estimate -->
      <div class="bg-slate-900/30 rounded-lg p-4 border border-slate-700">
        <div class="flex items-center gap-2 mb-2">
          <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="font-semibold text-slate-100">Estimated Time</span>
        </div>
        <div v-if="estimatedTime" class="text-2xl font-bold text-blue-400">{{ estimatedTime }}</div>
        <div v-else class="text-sm text-slate-500">Run plan to estimate</div>
        <div v-if="estimatedTime" class="text-xs text-slate-500 mt-1">Remaining</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CostEstimate from './CostEstimate.vue'

interface Props {
  total: number
  generated: number
  pending: number
  failed: number
  estimatedCost: string | null
  estimatedTime: string | null
  loading?: boolean
}

const props = defineProps<Props>()

const progressPercent = computed(() => {
  if (props.total === 0) return 0
  return Math.round((props.generated / props.total) * 100)
})

const isComplete = computed(() => {
  return props.total > 0 && props.pending === 0 && props.failed === 0
})

const actualCost = computed(() => {
  // Calculate actual cost based on generated samples
  // This would come from the store in a real implementation
  return '$0.00'
})
</script>
