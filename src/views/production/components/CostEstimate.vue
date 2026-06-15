<template>
  <div class="bg-canvas/30 rounded-lg p-4 border border-line">
    <div class="flex items-center gap-2 mb-2">
      <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span class="font-semibold text-ink">Cost Estimate</span>
    </div>

    <div class="space-y-3">
      <!-- Estimated Cost -->
      <div>
        <div class="text-xs text-faint mb-1">Estimated</div>
        <div class="text-2xl font-bold text-emerald-400">{{ estimated }}</div>
      </div>

      <!-- Actual Cost So Far -->
      <div v-if="actual && actual !== '$0.00'">
        <div class="text-xs text-faint mb-1">Actual (so far)</div>
        <div class="text-lg font-semibold text-blue-400">{{ actual }}</div>
      </div>

      <!-- TTS Provider Breakdown -->
      <div v-if="breakdown && breakdown.length > 0" class="pt-2 border-t border-line">
        <div class="text-xs text-faint mb-2">Provider Breakdown</div>
        <div class="space-y-1">
          <div
            v-for="provider in breakdown"
            :key="provider.name"
            class="flex items-center justify-between text-xs"
          >
            <span class="text-muted">{{ provider.name }}</span>
            <span class="text-ink font-medium">{{ provider.cost }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Provider {
  name: string
  cost: string
}

interface Props {
  estimated: string
  actual?: string
  breakdown?: Provider[]
}

defineProps<Props>()
</script>
