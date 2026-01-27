<template>
  <div class="step-content space-y-4">
    <h4 class="text-lg font-semibold text-white">Step 2: Verify S3 Audio</h4>

    <p class="text-slate-300 text-sm">
      Check that all audio files exist in the stage bucket and fix any duration mismatches.
    </p>

    <!-- Verify button -->
    <div v-if="!state.s3Verified || isVerifying">
      <button
        @click="handleVerify"
        :disabled="isLoading || isVerifying"
        class="w-full px-4 py-3 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span v-if="isVerifying" class="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        <span>{{ isVerifying ? 'Verifying...' : 'Verify Audio Files' }}</span>
      </button>

      <!-- Progress bar -->
      <div v-if="progress.total > 0" class="mt-4">
        <div class="flex justify-between text-sm text-slate-400 mb-2">
          <span>Checking S3...</span>
          <span>{{ progress.checked.toLocaleString() }} / {{ progress.total.toLocaleString() }}</span>
        </div>
        <div class="progress-bar-container bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            class="progress-bar bg-blue-500 h-full transition-all duration-300"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
        <p class="text-center text-xs text-slate-500 mt-2">
          {{ progressPercent }}% complete
        </p>
      </div>
    </div>

    <!-- Results -->
    <div v-if="state.s3Verified && verification" class="space-y-4">
      <!-- Success message -->
      <div class="success-box p-4 bg-emerald-900/30 border border-emerald-700 rounded-lg">
        <div class="flex items-center gap-2 text-emerald-400 font-medium">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>All {{ verification.total.toLocaleString() }} files found in stage bucket</span>
        </div>
        <p class="text-sm text-slate-400 mt-1">
          Last verified: {{ formatDate(state.s3VerifiedAt) }}
        </p>
      </div>

      <!-- Stats -->
      <div class="stats-grid grid grid-cols-2 gap-3 text-sm">
        <div class="stat-item flex justify-between p-3 bg-slate-700 rounded border border-slate-600">
          <span class="text-slate-400">Files Found</span>
          <span class="text-emerald-400 font-medium">{{ verification.existing.toLocaleString() }}</span>
        </div>
        <div class="stat-item flex justify-between p-3 bg-slate-700 rounded border border-slate-600">
          <span class="text-slate-400">Missing</span>
          <span :class="verification.missing > 0 ? 'text-red-400' : 'text-emerald-400'" class="font-medium">
            {{ verification.missing.toLocaleString() }}
          </span>
        </div>
      </div>

      <!-- Re-verify button -->
      <button
        @click="handleVerify"
        :disabled="isLoading"
        class="w-full px-4 py-2 text-sm font-medium border border-slate-500 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
      >
        Re-verify
      </button>
    </div>

    <!-- Missing files warning -->
    <div v-if="verification && verification.missing > 0" class="missing-warning p-4 bg-red-900/30 border border-red-700 rounded-lg">
      <p class="text-red-400 font-medium text-sm mb-2">
        {{ verification.missing }} files are missing from S3
      </p>
      <p class="text-slate-400 text-xs">
        Run audio generation (Phase 8) to create missing files before publishing.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ExportState, S3VerificationResult } from '@/composables/useExportWorkflow'

const props = defineProps<{
  state: ExportState
  verification: S3VerificationResult | null
  isLoading: boolean
  isVerifying: boolean
  progress: { checked: number; total: number }
  formatDate: (date: string | null) => string
}>()

const emit = defineEmits<{
  verify: []
}>()

const verification = computed(() => props.state.s3Verification || props.verification)

const progressPercent = computed(() => {
  if (props.progress.total === 0) return 0
  return Math.round((props.progress.checked / props.progress.total) * 100)
})

function handleVerify() {
  emit('verify')
}
</script>

<style scoped>
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.progress-bar-container {
  background: #334155;
}

.progress-bar {
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
}
</style>
