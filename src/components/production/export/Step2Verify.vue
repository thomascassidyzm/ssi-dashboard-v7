<template>
  <div class="step-content space-y-4">
    <h4 class="text-lg font-semibold text-white">Step 2: Verify S3 Audio</h4>

    <p class="text-slate-300 text-sm">
      Check that all audio files exist in the stage bucket and fix any duration mismatches.
    </p>

    <!-- Audio generation still running warning -->
    <div v-if="audioProgress.status === 'running'" class="warning-box p-4 bg-amber-900/30 border border-amber-700 rounded-lg">
      <div class="flex items-center gap-2 text-amber-400 font-medium mb-2">
        <span class="spinner w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
        <span>Audio generation in progress</span>
      </div>
      <p class="text-sm text-slate-400">
        Combined presentation audio is still being generated. Please wait for it to complete before verifying S3.
      </p>
      <div class="mt-2 text-sm text-slate-400">
        {{ audioProgress.completed }} / {{ audioProgress.total }} audio files ({{ audioProgressPercent }}%)
      </div>
    </div>

    <!-- Verify button -->
    <div v-if="!state.s3Verified || isVerifying">
      <button
        @click="handleVerify"
        :disabled="isLoading || isVerifying || audioProgress.status === 'running'"
        class="w-full px-4 py-3 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span v-if="isVerifying" class="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        <span>{{ isVerifying ? 'Verifying...' : 'Verify Audio Files' }}</span>
      </button>

      <!-- Small stop button while verification is running -->
      <button
        v-if="isVerifying"
        @click="handleStop"
        class="mt-2 px-3 py-1.5 text-xs font-medium border border-red-500 text-red-400 rounded hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5 mx-auto"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span>Stop</span>
      </button>

      <!-- Progress bar - Two-phase verification -->
      <div v-if="progress.total > 0" class="mt-4">
        <!-- Phase indicator with icon -->
        <div class="flex justify-between text-sm mb-2">
          <div class="flex items-center gap-2">
            <span class="spinner w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
            <span :class="currentPhase === 'duration' ? 'text-purple-400' : 'text-blue-400'" class="font-medium">
              {{ currentPhaseText }}
            </span>
          </div>
          <span class="text-slate-400">{{ progress.checked.toLocaleString() }} / {{ progress.total.toLocaleString() }}</span>
        </div>
        <div class="progress-bar-container bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            class="progress-bar h-full transition-all duration-300"
            :class="{
              'bg-purple-500': currentPhase === 'duration',
              'bg-amber-500': currentPhase === 'fixing',
              'bg-blue-500': currentPhase === 'existence'
            }"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>

        <!-- Duration phase stats -->
        <div v-if="currentPhase === 'duration' && progress.matched !== undefined" class="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div class="text-center">
            <div class="text-emerald-400 font-medium">{{ progress.matched }}</div>
            <div class="text-slate-500">Matched</div>
          </div>
          <div class="text-center">
            <div class="text-amber-400 font-medium">{{ progress.mismatched }}</div>
            <div class="text-slate-500">Mismatched</div>
          </div>
          <div class="text-center">
            <div class="text-red-400 font-medium">{{ progress.errors }}</div>
            <div class="text-slate-500">Errors</div>
          </div>
        </div>

        <!-- Fixing phase stats -->
        <div v-if="currentPhase === 'fixing' && progress.fixed !== undefined" class="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div class="text-center">
            <div class="text-emerald-400 font-medium">{{ progress.fixed }}</div>
            <div class="text-slate-500">Fixed</div>
          </div>
          <div class="text-center">
            <div class="text-red-400 font-medium">{{ progress.errors || 0 }}</div>
            <div class="text-slate-500">Errors</div>
          </div>
        </div>

        <p class="text-center text-xs text-slate-500 mt-2">
          {{ progressPercent }}% complete
        </p>
      </div>
    </div>

    <!-- Results -->
    <div v-if="verification" class="space-y-4">
      <!-- Duration check failed - CRITICAL ERROR -->
      <div v-if="verification.durationCheckFailed" class="error-box p-4 bg-red-900/30 border border-red-700 rounded-lg">
        <div class="flex items-center gap-2 text-red-400 font-medium mb-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Duration verification FAILED</span>
        </div>
        <p class="text-sm text-slate-300 mb-2">
          {{ verification.durationCheckError || 'Duration check did not run' }}
        </p>
        <p class="text-xs text-slate-400">
          Step 3 (Publish Manifest) is blocked until durations are verified.
        </p>
      </div>

      <!-- Success message (only if duration check passed) -->
      <div v-else-if="state.s3Verified && verification.durationChecked > 0" class="success-box p-4 bg-emerald-900/30 border border-emerald-700 rounded-lg">
        <div class="flex items-center gap-2 text-emerald-400 font-medium">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>All {{ verification.total.toLocaleString() }} files verified</span>
        </div>
        <p class="text-sm text-slate-400 mt-1">
          Durations checked: {{ verification.durationChecked.toLocaleString() }} files • Last verified: {{ formatDate(state.s3VerifiedAt) }}
        </p>
      </div>

      <!-- Partial success (files found but no duration check) -->
      <div v-else-if="verification.missing === 0 && (!verification.durationChecked || verification.durationChecked === 0)" class="warning-box p-4 bg-amber-900/30 border border-amber-700 rounded-lg">
        <div class="flex items-center gap-2 text-amber-400 font-medium mb-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Files exist but durations not verified</span>
        </div>
        <p class="text-sm text-slate-300">
          {{ verification.total.toLocaleString() }} files found, but duration verification did not run.
        </p>
        <p class="text-xs text-slate-400 mt-1">
          Re-verify to check durations with sox.
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

        <!-- Duration stats (if duration check was performed) -->
        <template v-if="verification.durationChecked">
          <div class="stat-item flex justify-between p-3 bg-slate-700 rounded border border-slate-600">
            <span class="text-slate-400">Duration Matched</span>
            <span class="text-emerald-400 font-medium">{{ verification.durationMatched?.toLocaleString() || 0 }}</span>
          </div>
          <div class="stat-item flex justify-between p-3 bg-slate-700 rounded border border-slate-600">
            <span class="text-slate-400">Auto-Fixed</span>
            <span :class="(verification.durationMismatched || 0) > 0 ? 'text-emerald-400' : 'text-emerald-400'" class="font-medium">
              {{ verification.durationMismatched?.toLocaleString() || 0 }}
            </span>
          </div>
        </template>
      </div>

      <!-- Auto-fixed durations info -->
      <div v-if="verification.durationsFixed && verification.durationsFixed > 0"
           class="auto-fixed p-4 bg-emerald-900/30 border border-emerald-700 rounded-lg">
        <p class="text-emerald-400 font-medium text-sm">
          ✓ Auto-fixed {{ verification.durationsFixed }} durations to match S3 exactly
        </p>
        <p class="text-slate-300 text-xs mt-1">
          Manifest updated with exact durations extracted from S3 audio files using sox.
        </p>
      </div>

      <!-- Duration mismatches (being auto-fixed) -->
      <div v-if="verification.durationMismatched && verification.durationMismatched > 0 && !verification.durationsFixed"
           class="duration-warning p-4 bg-emerald-900/30 border border-emerald-700 rounded-lg">
        <p class="text-emerald-400 font-medium text-sm mb-2">
          {{ verification.durationMismatched }} files auto-fixed
        </p>
        <p class="text-slate-300 text-xs">
          Durations updated to match exact S3 values.
        </p>
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
  progress: {
    checked: number
    total: number
    phase?: string
    matched?: number
    mismatched?: number
    errors?: number
    fixed?: number
  }
  audioProgress: { completed: number; total: number; status: 'none' | 'running' | 'completed' | 'failed' }
  formatDate: (date: string | null) => string
}>()

const emit = defineEmits<{
  verify: []
  stop: []
}>()

const verification = computed(() => props.state.s3Verification || props.verification)

const progressPercent = computed(() => {
  if (props.progress.total === 0) return 0
  return Math.round((props.progress.checked / props.progress.total) * 100)
})

const audioProgressPercent = computed(() => {
  if (props.audioProgress.total === 0) return 0
  return Math.round((props.audioProgress.completed / props.audioProgress.total) * 100)
})

const currentPhase = computed(() => props.progress.phase || 'existence')

const currentPhaseText = computed(() => {
  switch (currentPhase.value) {
    case 'duration':
      return 'Phase 2: Verifying durations with sox...'
    case 'fixing':
      return 'Phase 3: Auto-fixing mismatched durations...'
    default:
      return 'Phase 1: Checking file existence...'
  }
})

function handleVerify() {
  emit('verify')
}

function handleStop() {
  emit('stop')
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
