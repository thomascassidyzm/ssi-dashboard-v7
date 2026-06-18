<template>
  <section class="queue-controls bg-surface/50 rounded-lg border border-line p-6">
    <h2 class="text-xl font-semibold text-ink mb-4 flex items-center gap-2">
      <svg class="w-5 h-5 text-accent-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
      </svg>
      Queue Controls
    </h2>

    <div class="flex flex-wrap gap-4">
      <!-- Start Generation -->
      <button
        @click="$emit('start')"
        :disabled="!canStart || isRunning"
        class="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-surface-2 disabled:to-surface-3 disabled:cursor-not-allowed rounded-lg font-semibold transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center gap-2"
      >
        <svg v-if="isRunning" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        {{ isRunning ? 'Generating...' : 'Start Generation' }}
      </button>

      <!-- Cancel -->
      <button
        v-if="isRunning"
        @click="$emit('cancel')"
        class="px-6 py-3 bg-red-600/80 hover:bg-red-600 rounded-lg font-semibold transition-all flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        Cancel
      </button>

      <!-- Retry Failed -->
      <button
        v-if="hasFailed && !isRunning"
        @click="$emit('retry')"
        class="px-6 py-3 bg-yellow-600/80 hover:bg-yellow-600 rounded-lg font-semibold transition-all flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        Retry Failed
      </button>

      <!-- Plan (Dry Run) -->
      <button
        @click="$emit('plan')"
        :disabled="isRunning"
        class="px-6 py-3 bg-surface-2 hover:bg-surface-3 disabled:bg-surface disabled:cursor-not-allowed rounded-lg font-semibold transition-all flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
        </svg>
        Plan (Dry Run)
      </button>
    </div>

    <!-- Status Message -->
    <div v-if="statusMessage" class="mt-4 p-3 rounded-lg" :class="statusClass">
      <p class="text-sm font-medium">{{ statusMessage }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  canStart: boolean
  isRunning: boolean
  hasFailed: boolean
  statusMessage?: string
}

const props = defineProps<Props>()

defineEmits<{
  start: []
  cancel: []
  retry: []
  plan: []
}>()

const statusClass = computed(() => {
  if (props.isRunning) {
    return 'status-pill status-running bg-blue-900/20 border border-blue-500/50 text-blue-300'
  }
  if (props.hasFailed) {
    return 'status-pill status-failed bg-red-900/20 border border-red-500/50 text-red-300'
  }
  return 'status-pill status-idle bg-surface-2 border border-line text-ink'
})
</script>

<style scoped>
/* Light mode: dark-tinted status pills (blue-900/red-900 @20% + 300-level text)
   lose contrast on the near-white canvas, so retint them to legible AA values.
   Dark mode is untouched. */
:root[data-theme='light'] .status-pill.status-running {
  background-color: #eff6ff; /* blue-50 */
  border-color: #93c5fd; /* blue-300 */
  color: #1e40af; /* blue-800 -> ~8.3:1 on blue-50 */
}
:root[data-theme='light'] .status-pill.status-failed {
  background-color: #fef2f2; /* red-50 */
  border-color: #fca5a5; /* red-300 */
  color: #b91c1c; /* red-700 -> ~6.4:1 on red-50 */
}
/* Subtle shadow so the translucent card lifts off the canvas in light mode. */
:root[data-theme='light'] .queue-controls {
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
}
</style>
