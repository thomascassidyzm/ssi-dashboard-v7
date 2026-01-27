<template>
  <div class="step-content space-y-4">
    <h4 class="text-lg font-semibold text-white">Step 4: Deploy Audio to Production</h4>

    <p class="text-slate-300 text-sm">
      Copy audio files from stage bucket to production bucket.
    </p>

    <div class="bucket-info p-3 bg-slate-700 rounded-lg border border-slate-600 text-sm">
      <div class="flex items-center gap-2 text-slate-400">
        <span class="font-mono text-slate-300">ssi-audio-stage</span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
        <span class="font-mono text-slate-300">ssiborg-assets</span>
      </div>
    </div>

    <!-- Check plan button -->
    <div v-if="!deployPlan">
      <button
        @click="handleCheckPlan"
        :disabled="isLoading"
        class="w-full px-4 py-3 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span v-if="isLoading && !isDeploying" class="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        <span>{{ isLoading && !isDeploying ? 'Checking...' : 'Check Production Status' }}</span>
      </button>
    </div>

    <!-- Deploy plan results -->
    <div v-if="deployPlan" class="space-y-4">
      <!-- Stats -->
      <div class="stats-grid grid grid-cols-3 gap-3 text-sm">
        <div class="stat-item flex flex-col p-3 bg-slate-700 rounded border border-slate-600">
          <span class="text-slate-400">Total</span>
          <span class="text-white font-semibold text-lg">{{ deployPlan.total.toLocaleString() }}</span>
        </div>
        <div class="stat-item flex flex-col p-3 bg-slate-700 rounded border border-slate-600">
          <span class="text-slate-400">New Files</span>
          <span class="text-emerald-400 font-semibold text-lg">{{ deployPlan.newFiles.toLocaleString() }}</span>
        </div>
        <div class="stat-item flex flex-col p-3 bg-slate-700 rounded border border-slate-600">
          <span class="text-slate-400">Overwrites</span>
          <span :class="deployPlan.overwrites > 0 ? 'text-amber-400' : 'text-slate-400'" class="font-semibold text-lg">
            {{ deployPlan.overwrites.toLocaleString() }}
          </span>
        </div>
      </div>

      <!-- Overwrite warning -->
      <div v-if="deployPlan.overwrites > 0" class="overwrite-warning p-4 bg-amber-900/30 border border-amber-700 rounded-lg space-y-3">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p class="text-amber-400 font-medium text-sm">
              {{ deployPlan.overwrites }} files already exist in production
            </p>
            <p class="text-slate-400 text-xs mt-1">
              Overwriting affects ALL courses using these files.
              Time this with manifest deployment to avoid sync issues.
            </p>
          </div>
        </div>

        <!-- Confirmation input -->
        <div class="confirmation-input">
          <label class="text-sm text-slate-400 block mb-2">
            Type "overwrite" to confirm:
          </label>
          <input
            v-model="confirmationText"
            type="text"
            placeholder="overwrite"
            class="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <!-- Deploy progress -->
      <div v-if="isDeploying" class="progress-section space-y-4">
        <!-- Deployment phase -->
        <div v-if="!progress.verifying">
          <div class="flex justify-between text-sm text-slate-400 mb-2">
            <span>Deploying to production...</span>
            <span>{{ progress.deployed.toLocaleString() }} / {{ progress.total.toLocaleString() }}</span>
          </div>
          <div class="progress-bar-container bg-slate-700 rounded-full h-3 overflow-hidden">
            <div
              class="progress-bar bg-amber-500 h-full transition-all duration-300"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
          <p class="text-center text-xs text-slate-500 mt-2">
            {{ progressPercent }}% complete
          </p>
        </div>

        <!-- Verification phase -->
        <div v-if="progress.verifying" class="verification-phase">
          <div class="flex justify-between text-sm text-slate-400 mb-2">
            <span>Verifying deployed durations...</span>
            <span>{{ progress.verifyChecked || 0 }} / {{ progress.verifyTotal || 0 }}</span>
          </div>
          <div class="progress-bar-container bg-slate-700 rounded-full h-3 overflow-hidden">
            <div
              class="progress-bar bg-purple-500 h-full transition-all duration-300"
              :style="{ width: `${verifyProgressPercent}%` }"
            />
          </div>

          <!-- Verification stats -->
          <div class="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div class="text-center">
              <div class="text-emerald-400 font-medium">{{ progress.verifyMatched || 0 }}</div>
              <div class="text-slate-500">Matched</div>
            </div>
            <div class="text-center">
              <div class="text-amber-400 font-medium">{{ progress.verifyMismatched || 0 }}</div>
              <div class="text-slate-500">Mismatched</div>
            </div>
            <div class="text-center">
              <div class="text-red-400 font-medium">{{ progress.verifyErrors || 0 }}</div>
              <div class="text-slate-500">Errors</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Deploy button -->
      <button
        v-if="!state.audioDeployed"
        @click="handleDeploy"
        :disabled="isLoading || (deployPlan.overwrites > 0 && confirmationText !== 'overwrite')"
        class="w-full px-4 py-3 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span v-if="isDeploying" class="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        <span>{{ isDeploying ? 'Deploying...' : 'Deploy Audio to Production' }}</span>
      </button>

      <!-- Verify Production Durations button (independent of deployment) -->
      <button
        v-if="!isDeploying && !isVerifying"
        @click="handleVerifyProduction"
        :disabled="isLoading"
        class="w-full px-4 py-2 text-sm font-medium bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span v-if="isLoading" class="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        <span>{{ isLoading ? 'Verifying...' : 'Verify Production Durations' }}</span>
      </button>

      <!-- Refresh plan button -->
      <button
        v-if="!isDeploying && !isVerifying"
        @click="handleCheckPlan"
        :disabled="isLoading"
        class="w-full px-4 py-2 text-sm font-medium border border-slate-500 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span v-if="isLoading" class="spinner w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></span>
        <span>{{ isLoading ? 'Checking...' : 'Refresh Plan' }}</span>
      </button>

      <!-- Production verification results (standalone - before deployment) -->
      <div v-if="state.deployVerification && !state.audioDeployed" class="verification-results space-y-3 mt-4">
        <!-- Existence summary -->
        <div class="stats-grid grid grid-cols-3 gap-3 text-sm">
          <div class="stat-item flex flex-col p-3 bg-slate-700 rounded border border-slate-600">
            <span class="text-slate-400">Total Files</span>
            <span class="text-white font-semibold text-lg">{{ state.deployVerification.total?.toLocaleString() || 0 }}</span>
          </div>
          <div class="stat-item flex flex-col p-3 bg-slate-700 rounded border border-slate-600">
            <span class="text-slate-400">In Production</span>
            <span class="text-emerald-400 font-semibold text-lg">{{ state.deployVerification.existing?.toLocaleString() || 0 }}</span>
          </div>
          <div class="stat-item flex flex-col p-3 bg-slate-700 rounded border border-slate-600">
            <span class="text-slate-400">Missing</span>
            <span :class="(state.deployVerification.missing || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'" class="font-semibold text-lg">
              {{ state.deployVerification.missing?.toLocaleString() || 0 }}
            </span>
          </div>
        </div>

        <!-- Duration verification stats -->
        <div v-if="state.deployVerification.durationChecked && state.deployVerification.durationChecked > 0" class="stats-grid grid grid-cols-3 gap-3 text-sm">
          <div class="stat-item flex flex-col p-3 bg-slate-700 rounded border border-slate-600">
            <span class="text-slate-400">Durations Checked</span>
            <span class="text-white font-semibold text-lg">{{ state.deployVerification.durationChecked?.toLocaleString() || 0 }}</span>
          </div>
          <div class="stat-item flex flex-col p-3 bg-slate-700 rounded border border-slate-600">
            <span class="text-slate-400">Matched</span>
            <span class="text-emerald-400 font-semibold text-lg">{{ state.deployVerification.durationMatched?.toLocaleString() || 0 }}</span>
          </div>
          <div class="stat-item flex flex-col p-3 bg-slate-700 rounded border border-slate-600">
            <span class="text-slate-400">Mismatched</span>
            <span :class="(state.deployVerification.durationMismatched || 0) > 0 ? 'text-red-400' : 'text-emerald-400'" class="font-semibold text-lg">
              {{ state.deployVerification.durationMismatched?.toLocaleString() || 0 }}
            </span>
          </div>
        </div>

        <!-- Warning about duration mismatches -->
        <div v-if="state.deployVerification.durationMismatched && state.deployVerification.durationMismatched > 0"
             class="p-4 bg-red-900/30 border border-red-700 rounded-lg">
          <div class="flex items-center gap-2 text-red-400 font-medium mb-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Duration Mismatches Found</span>
          </div>
          <p class="text-sm text-slate-300">
            {{ state.deployVerification.durationMismatched }} files in production have different durations than the manifest.
            DO NOT redeploy these - investigate why they differ.
          </p>
        </div>

        <!-- Deploy missing files button -->
        <button
          v-if="state.deployVerification.missing && state.deployVerification.missing > 0 && !isDeploying"
          @click="handleDeployMissingOnly"
          :disabled="isLoading"
          class="w-full px-4 py-3 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span v-if="isLoading" class="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>Deploy {{ state.deployVerification.missing }} Missing Files</span>
        </button>
      </div>
    </div>

    <!-- Deployed success -->
    <div v-if="state.audioDeployed" class="success-box p-4 bg-emerald-900/30 border border-emerald-700 rounded-lg space-y-2">
      <div class="flex items-center gap-2 text-emerald-400 font-medium">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>Audio deployed to production</span>
      </div>
      <p class="text-sm text-slate-400">
        Deployed: {{ formatDate(state.audioDeployedAt) }}
      </p>

      <!-- Verification results -->
      <div v-if="state.deployVerification" class="mt-3 space-y-2">
        <div class="flex items-center gap-2 text-sm">
          <svg v-if="state.deployVerification.errors === 0 && state.deployVerification.mismatched === 0" class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span class="text-slate-400">
            Duration verification: {{ state.deployVerification.matched || 0 }} matched,
            {{ state.deployVerification.mismatched || 0 }} mismatched,
            {{ state.deployVerification.errors || 0 }} errors
          </span>
        </div>

        <!-- Duration mismatch details -->
        <div v-if="state.deployVerification.details && state.deployVerification.details.length > 0"
             class="p-3 bg-amber-900/30 border border-amber-700 rounded text-xs">
          <p class="text-amber-400 font-medium mb-1">Duration issues found:</p>
          <div class="max-h-32 overflow-y-auto space-y-1 text-slate-400 font-mono">
            <div v-for="detail in state.deployVerification.details.slice(0, 5)" :key="detail.uuid">
              {{ detail.uuid }}: {{ detail.issue }}
              <span v-if="detail.expected && detail.actual">
                (expected {{ detail.expected.toFixed(3) }}s, actual {{ detail.actual.toFixed(3) }}s)
              </span>
            </div>
            <p v-if="state.deployVerification.details.length > 5" class="text-slate-500 italic">
              ...and {{ state.deployVerification.details.length - 5 }} more
            </p>
          </div>
        </div>
      </div>

      <!-- Info about skipped encouragements -->
      <div class="mt-2 text-xs text-slate-500 italic">
        Note: Shared encouragements not re-deployed (already in production)
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ExportState, DeployPlan } from '@/composables/useExportWorkflow'

const props = defineProps<{
  state: ExportState
  deployPlan: DeployPlan | null
  isLoading: boolean
  isDeploying: boolean
  isVerifying: boolean
  progress: {
    deployed: number
    total: number
    verifying?: boolean
    verifyChecked?: number
    verifyTotal?: number
    verifyMatched?: number
    verifyMismatched?: number
    verifyErrors?: number
  }
  formatDate: (date: string | null) => string
}>()

const emit = defineEmits<{
  checkPlan: []
  deploy: [confirmation: string | undefined]
  verifyProduction: []
  deployMissingOnly: []
}>()

const confirmationText = ref('')

const progressPercent = computed(() => {
  if (props.progress.total === 0) return 0
  return Math.round((props.progress.deployed / props.progress.total) * 100)
})

const verifyProgressPercent = computed(() => {
  if (!props.progress.verifyTotal || props.progress.verifyTotal === 0) return 0
  return Math.round(((props.progress.verifyChecked || 0) / props.progress.verifyTotal) * 100)
})

function handleCheckPlan() {
  emit('checkPlan')
}

function handleDeploy() {
  const confirmation = props.deployPlan?.overwrites ? confirmationText.value : undefined
  emit('deploy', confirmation)
}

function handleVerifyProduction() {
  emit('verifyProduction')
}

function handleDeployMissingOnly() {
  emit('deployMissingOnly')
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
  background: linear-gradient(90deg, #f59e0b, #d97706);
}
</style>
