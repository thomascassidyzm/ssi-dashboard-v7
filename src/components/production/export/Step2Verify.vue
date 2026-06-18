<template>
  <div class="step-content space-y-4">
    <h4 class="text-lg font-semibold text-ink">Step 2: Verify S3 Audio</h4>

    <p class="text-ink text-sm">
      Check that all audio files exist in the stage bucket and fix any duration mismatches.
    </p>

    <!-- Audio generation still running warning -->
    <div v-if="audioProgress.status === 'running'" class="warning-box p-4 bg-amber-900/30 border border-amber-700 rounded-lg">
      <div class="flex items-center gap-2 text-amber-400 font-medium mb-2">
        <span class="spinner w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
        <span>Audio generation in progress</span>
      </div>
      <p class="text-sm text-muted">
        Combined presentation audio is still being generated. Please wait for it to complete before verifying S3.
      </p>
      <div class="mt-2 text-sm text-muted">
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

      <!-- Multi-stage progress indicator -->
      <div v-if="progress.total > 0 || verification" class="mt-4 space-y-3">
        <!-- Stage 1: Checking existence - ONLY show when actively running -->
        <div v-if="currentStage === 'existence'" class="stage-progress">
          <div class="flex justify-between text-sm mb-2">
            <div class="flex items-center gap-2">
              <span class="spinner w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
              <span class="text-blue-400 font-medium">Stage 1: Checking file existence</span>
            </div>
            <span class="text-muted text-xs">{{ stage1Percent }}%</span>
          </div>
          <div class="progress-bar-container bg-surface-2 rounded-full h-2 overflow-hidden">
            <div class="progress-bar h-full transition-all duration-300 bg-blue-500" :style="{ width: `${stage1Percent}%` }" />
          </div>
        </div>

        <!-- Stage 2: Extracting S3 durations - ONLY show when actively running -->
        <div v-if="currentStage === 'duration'" class="stage-progress">
          <div class="flex justify-between text-sm mb-2">
            <div class="flex items-center gap-2">
              <span class="spinner w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></span>
              <span class="text-purple-400 font-medium">Stage 2: Extracting S3 durations with sox</span>
            </div>
            <span class="text-muted text-xs">{{ stage2Percent }}%</span>
          </div>
          <div class="progress-bar-container bg-surface-2 rounded-full h-2 overflow-hidden">
            <div class="progress-bar h-full transition-all duration-300 bg-purple-500" :style="{ width: `${stage2Percent}%` }" />
          </div>
          <!-- Duration stats -->
          <div v-if="progress.matched !== undefined" class="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div class="text-center">
              <div class="text-emerald-400 font-medium">{{ progress.matched }}</div>
              <div class="text-faint">Matched</div>
            </div>
            <div class="text-center">
              <div class="text-amber-400 font-medium">{{ progress.mismatched }}</div>
              <div class="text-faint">Mismatched</div>
            </div>
            <div class="text-center">
              <div class="text-red-400 font-medium">{{ progress.errors }}</div>
              <div class="text-faint">Errors</div>
            </div>
          </div>
        </div>

        <!-- Stage 3: Auto-fixing durations - ONLY show when actively running -->
        <div v-if="currentStage === 'fixing'" class="stage-progress">
          <div class="flex justify-between text-sm mb-2">
            <div class="flex items-center gap-2">
              <span class="spinner w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
              <span class="text-amber-400 font-medium">Stage 3: Auto-fixing durations in manifest</span>
            </div>
            <span class="text-muted text-xs">{{ stage3Percent }}%</span>
          </div>
          <div class="progress-bar-container bg-surface-2 rounded-full h-2 overflow-hidden">
            <div class="progress-bar h-full transition-all duration-300 bg-amber-500" :style="{ width: `${stage3Percent}%` }" />
          </div>
          <!-- Fix stats -->
          <div v-if="progress.fixed !== undefined" class="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div class="text-center">
              <div class="text-emerald-400 font-medium">{{ progress.fixed }}</div>
              <div class="text-faint">Fixed</div>
            </div>
            <div class="text-center">
              <div class="text-red-400 font-medium">{{ progress.errors || 0 }}</div>
              <div class="text-faint">Errors</div>
            </div>
          </div>
        </div>

        <!-- Stage 4: Verifying fixed durations - ONLY show when actively running -->
        <div v-if="currentStage === 'verifying'" class="stage-progress">
          <div class="flex justify-between text-sm mb-2">
            <div class="flex items-center gap-2">
              <span class="spinner w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
              <span class="text-cyan-400 font-medium">Stage 4: Verifying fixed durations</span>
            </div>
            <span class="text-muted text-xs">{{ stage4Percent }}%</span>
          </div>
          <div class="progress-bar-container bg-surface-2 rounded-full h-2 overflow-hidden">
            <div class="progress-bar h-full transition-all duration-300 bg-cyan-500" :style="{ width: `${stage4Percent}%` }" />
          </div>
          <!-- Verification stats -->
          <div v-if="progress.matched !== undefined" class="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div class="text-center">
              <div class="text-emerald-400 font-medium">{{ progress.matched }}</div>
              <div class="text-faint">Matched</div>
            </div>
            <div class="text-center">
              <div class="text-amber-400 font-medium">{{ progress.mismatched || 0 }}</div>
              <div class="text-faint">Mismatched</div>
            </div>
          </div>
        </div>

        <!-- Completed stages summary - shown after verification complete -->
        <div v-if="verification && currentStage === 'complete'" class="space-y-2">
          <div class="flex items-center gap-2 text-sm">
            <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
            <span class="text-emerald-400">Stage 1: File existence check complete</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
            <span class="text-emerald-400">Stage 2: Duration extraction complete</span>
          </div>

          <!-- Format check (ID3v2 / LAME encoder) -->
          <div v-if="verification.formatChecked" class="flex items-center gap-2 text-sm">
            <svg class="w-4 h-4" :class="(verification.formatFailed || 0) === 0 ? 'text-emerald-400' : 'text-red-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
            <span :class="(verification.formatFailed || 0) === 0 ? 'text-emerald-400' : 'text-red-400'">
              Format check: {{ (verification.formatFailed || 0) === 0 ? `all ${verification.formatChecked.toLocaleString()} correctly encoded` : `${verification.formatFailed.toLocaleString()} BADLY ENCODED` }}
            </span>
          </div>

          <!-- Stage 3: Auto-fix (if it happened) -->
          <div v-if="verification.durationsFixed && verification.durationsFixed > 0" class="flex items-center gap-2 text-sm">
            <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
            <span class="text-emerald-400">Stage 3: Auto-fixed {{ verification.durationsFixed }} durations</span>
          </div>

          <!-- Stage 4: Re-verification (if auto-fix happened) -->
          <div v-if="verification.verifyFixed" class="flex items-center gap-2 text-sm">
            <svg class="w-4 h-4" :class="verification.verifyFixed.mismatched === 0 ? 'text-emerald-400' : 'text-red-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
            <span :class="verification.verifyFixed.mismatched === 0 ? 'text-emerald-400' : 'text-red-400'">
              Stage 4: {{ verification.verifyFixed.mismatched === 0 ? 'Verification passed' : `Verification failed (${verification.verifyFixed.mismatched} mismatches)` }}
            </span>
          </div>
        </div>

        <!-- Overall summary -->
        <div class="text-center text-xs text-muted pt-2 border-t border-line">
          {{ overallStatusText }}
        </div>
      </div>
    </div>

    <!-- Cancelled message -->
    <div v-if="verification?.cancelled" class="p-4 bg-amber-900/30 border border-amber-700 rounded-lg">
      <div class="flex items-center gap-2 text-amber-400 font-medium">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span>Verification cancelled</span>
      </div>
      <p class="text-sm text-muted mt-1">Click "Verify Audio Files" to start again.</p>
    </div>

    <!-- Results -->
    <div v-else-if="verification" class="space-y-4">
      <!-- Duration check failed - CRITICAL ERROR -->
      <div v-if="verification.durationCheckFailed" class="error-box p-4 bg-red-900/30 border border-red-700 rounded-lg">
        <div class="flex items-center gap-2 text-red-400 font-medium mb-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Duration verification FAILED</span>
        </div>
        <p class="text-sm text-ink mb-2">
          {{ verification.durationCheckError || 'Duration check did not run' }}
        </p>
        <p class="text-xs text-muted">
          Step 3 (Publish Manifest) is blocked until durations are verified.
        </p>
      </div>

      <!-- Format check failed - CRITICAL ERROR (iOS playback bug) -->
      <div v-if="(verification.formatFailed || 0) > 0" class="error-box p-4 bg-red-900/30 border border-red-700 rounded-lg">
        <div class="flex items-center gap-2 text-red-400 font-medium mb-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ verification.formatFailed.toLocaleString() }} audio file(s) have bad encoding (iOS playback risk)</span>
        </div>
        <p class="text-sm text-ink mb-2">
          These files have an ID3v2 wrapper or were not encoded by LAME — the issue that breaks iOS playback. Re-encode them before publishing.
        </p>
        <ul class="text-xs text-muted font-mono space-y-0.5 max-h-32 overflow-y-auto">
          <li v-for="f in (verification.formatFailDetails || []).slice(0, 10)" :key="f.uuid">
            {{ f.uuid }} — {{ (f.issues || []).join(', ') }}
          </li>
          <li v-if="(verification.formatFailDetails || []).length > 10" class="text-faint">
            …and {{ verification.formatFailDetails.length - 10 }} more
          </li>
        </ul>
        <p class="text-xs text-muted mt-2">
          Publishing is blocked until these are re-encoded (fixed via the lame pipeline).
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
        <p class="text-sm text-muted mt-1">
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
        <p class="text-sm text-ink">
          {{ verification.total.toLocaleString() }} files found, but duration verification did not run.
        </p>
        <p class="text-xs text-muted mt-1">
          Re-verify to check durations with sox.
        </p>
      </div>

      <!-- Stats -->
      <div class="stats-grid grid grid-cols-2 gap-3 text-sm">
        <div class="stat-item flex justify-between p-3 bg-surface-2 rounded border border-line">
          <span class="text-muted">Files Found</span>
          <span class="text-emerald-400 font-medium">{{ verification.existing.toLocaleString() }}</span>
        </div>
        <div class="stat-item flex justify-between p-3 bg-surface-2 rounded border border-line">
          <span class="text-muted">Missing</span>
          <span :class="verification.missing > 0 ? 'text-red-400' : 'text-emerald-400'" class="font-medium">
            {{ verification.missing.toLocaleString() }}
          </span>
        </div>

        <!-- Duration stats (if duration check was performed) -->
        <template v-if="verification.durationChecked">
          <div class="stat-item flex justify-between p-3 bg-surface-2 rounded border border-line">
            <span class="text-muted">Duration Matched</span>
            <span class="text-emerald-400 font-medium">{{ verification.durationMatched?.toLocaleString() || 0 }}</span>
          </div>
          <div class="stat-item flex justify-between p-3 bg-surface-2 rounded border border-line">
            <span class="text-muted">Auto-Fixed</span>
            <span :class="(verification.durationMismatched || 0) > 0 ? 'text-emerald-400' : 'text-emerald-400'" class="font-medium">
              {{ verification.durationMismatched?.toLocaleString() || 0 }}
            </span>
          </div>
        </template>
      </div>

      <!-- Auto-fix results summary -->
      <div v-if="verification.durationsFixed && verification.durationsFixed > 0">
        <!-- Success: Durations verified after auto-fix -->
        <div v-if="verification.fixVerification?.passed"
             class="auto-fixed p-4 bg-emerald-900/30 border border-emerald-700 rounded-lg">
          <p class="text-emerald-400 font-medium text-sm">
            ✓ Auto-fixed {{ verification.durationsFixed }} durations
          </p>
          <p class="text-ink text-xs mt-1">
            Manifest updated with exact durations from S3. Re-verified {{ verification.fixVerification.reVerifyTotal }} files - all match.
          </p>
        </div>

        <!-- Error: Durations still don't match after auto-fix (should be rare) -->
        <div v-else-if="verification.fixVerification?.passed === false"
             class="error-box p-4 bg-red-900/30 border-2 border-red-700 rounded-lg">
          <div class="flex items-center gap-2 text-red-400 font-medium mb-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Auto-fix verification FAILED</span>
          </div>
          <p class="text-sm text-ink mb-2">
            {{ verification.fixVerification.message }}
          </p>
          <p class="text-xs text-muted">
            {{ verification.fixVerification.stillMismatched }} durations still don't match S3 after auto-fix.
            This may indicate corrupt audio files.
          </p>
          <button
            @click="handleVerify"
            class="mt-3 px-4 py-2 text-sm font-medium bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Retry Verification
          </button>
        </div>
      </div>

      <!-- Re-verify button -->
      <button
        @click="handleVerify"
        :disabled="isLoading"
        class="w-full px-4 py-2 text-sm font-medium border border-line text-ink rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50"
      >
        Re-verify
      </button>
    </div>

    <!-- Missing files warning -->
    <div v-if="verification && verification.missing > 0" class="missing-warning p-4 bg-red-900/30 border border-red-700 rounded-lg">
      <p class="text-red-400 font-medium text-sm mb-2">
        {{ verification.missing }} files are missing from S3
      </p>
      <p class="text-muted text-xs">
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

// Multi-stage progress tracking
const currentStage = computed(() => {
  // If verification complete, no active stage
  if (verification.value && verification.value.durationChecked > 0 && props.progress.total === 0) {
    return 'complete'
  }

  // Active stages based on current phase
  return currentPhase.value
})

const stage1Percent = computed(() => {
  if (currentStage.value === 'existence') {
    // Currently running
    return progressPercent.value
  } else if (currentStage.value !== 'existence' && props.progress.checked > 0) {
    // Completed
    return 100
  }
  return 0
})

const stage2Percent = computed(() => {
  if (currentStage.value === 'duration') {
    // Currently running
    return progressPercent.value
  } else if (stage2Complete.value) {
    // Completed
    return 100
  }
  return 0
})

const stage2Complete = computed(() => {
  return verification.value && verification.value.durationChecked > 0
})

const stage3Percent = computed(() => {
  if (currentStage.value === 'fixing') {
    // Currently running
    return progressPercent.value
  }
  return 0
})

const stage4Percent = computed(() => {
  if (currentStage.value === 'verifying') {
    // Currently running
    return progressPercent.value
  }
  return 0
})

const overallStatusText = computed(() => {
  if (currentStage.value === 'existence') {
    return `Checking ${props.progress.checked.toLocaleString()} of ${props.progress.total.toLocaleString()} files...`
  } else if (currentStage.value === 'duration') {
    return `Extracting durations: ${props.progress.checked.toLocaleString()} of ${props.progress.total.toLocaleString()} files...`
  } else if (currentStage.value === 'fixing') {
    return `Auto-fixing durations: ${props.progress.fixed || 0} fixed, ${props.progress.errors || 0} errors`
  } else if (currentStage.value === 'verifying') {
    return `Verifying fixed durations: ${props.progress.checked.toLocaleString()} of ${props.progress.total.toLocaleString()} checked...`
  } else if (verification.value?.verifyFixed?.mismatched === 0) {
    return 'All stages complete - verification passed ✓'
  } else if (verification.value?.verifyFixed?.mismatched > 0) {
    return `Verification failed - ${verification.value.verifyFixed.mismatched} mismatches`
  } else if (verification.value?.durationsFixed && !verification.value?.verifyFixed) {
    return 'Auto-fixing manifest and re-verifying...'
  } else if (stage2Complete.value) {
    return 'Verification complete'
  }
  return 'Preparing verification...'
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
  background: var(--surface-2);
}

.progress-bar {
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
}

/*
 * Light-mode contrast overrides.
 * The template uses hardcoded Tailwind palette colors (bg-*-900/30 dark
 * translucent fills + text-*-400 bright text + border-*-700) tuned for the
 * dark canvas. In light mode those fills resolve near-white and the 400-weight
 * text drops well below WCAG AA. Re-tone the status boxes (tinted light fills),
 * darken the text to ~700 weight, and firm up the borders. Dark mode is
 * untouched because every rule is scoped under [data-theme="light"].
 */
:root[data-theme='light'] .step-content {
  /* Status box fills: light tints instead of dark/30 washes */
  --st-amber-bg: #fef3c7;   /* amber-100 */
  --st-amber-bd: #f59e0b;   /* amber-500 */
  --st-amber-tx: #92400e;   /* amber-800 ~ 6.4:1 on amber-100 */
  --st-red-bg: #fee2e2;     /* red-100 */
  --st-red-bd: #ef4444;     /* red-500 */
  --st-red-tx: #b91c1c;     /* red-700 ~ 5.1:1 on red-100 */
  --st-emerald-bg: #d1fae5; /* emerald-100 */
  --st-emerald-bd: #10b981; /* emerald-500 */
  --st-emerald-tx: #047857; /* emerald-700 ~ 4.9:1 on emerald-100 */
}

/* Amber (warning) boxes */
:root[data-theme='light'] .step-content .bg-amber-900\/30 {
  background-color: var(--st-amber-bg) !important;
}
:root[data-theme='light'] .step-content .border-amber-700 {
  border-color: var(--st-amber-bd) !important;
}
:root[data-theme='light'] .step-content .text-amber-400 {
  color: var(--st-amber-tx) !important;
}

/* Red (error) boxes */
:root[data-theme='light'] .step-content .bg-red-900\/30 {
  background-color: var(--st-red-bg) !important;
}
:root[data-theme='light'] .step-content .border-red-700 {
  border-color: var(--st-red-bd) !important;
}
:root[data-theme='light'] .step-content .text-red-400 {
  color: var(--st-red-tx) !important;
}

/* Emerald (success) boxes + inline success text */
:root[data-theme='light'] .step-content .bg-emerald-900\/30 {
  background-color: var(--st-emerald-bg) !important;
}
:root[data-theme='light'] .step-content .border-emerald-700 {
  border-color: var(--st-emerald-bd) !important;
}
:root[data-theme='light'] .step-content .text-emerald-400 {
  color: var(--st-emerald-tx) !important;
}

/* Inline progress accents (on light surface, not in a tinted box) */
:root[data-theme='light'] .step-content .text-blue-400 {
  color: #1d4ed8 !important;   /* blue-700 ~ 5.8:1 on white */
}
:root[data-theme='light'] .step-content .text-purple-400 {
  color: #6d28d9 !important;   /* violet-700 ~ 6.1:1 on white */
}
:root[data-theme='light'] .step-content .text-cyan-400 {
  color: #0e7490 !important;   /* cyan-700 ~ 4.7:1 on white */
}

/* Stop button border: red-500 too pale on white */
:root[data-theme='light'] .step-content .border-red-500 {
  border-color: #dc2626 !important; /* red-600 */
}
</style>
