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
      <div v-if="isDeploying" class="progress-section">
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

      <!-- Refresh plan button -->
      <button
        v-if="!isDeploying"
        @click="handleCheckPlan"
        :disabled="isLoading"
        class="w-full px-4 py-2 text-sm font-medium border border-slate-500 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
      >
        Refresh Plan
      </button>
    </div>

    <!-- Deployed success -->
    <div v-if="state.audioDeployed" class="success-box p-4 bg-emerald-900/30 border border-emerald-700 rounded-lg">
      <div class="flex items-center gap-2 text-emerald-400 font-medium">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>Audio deployed to production</span>
      </div>
      <p class="text-sm text-slate-400 mt-1">
        Deployed: {{ formatDate(state.audioDeployedAt) }}
      </p>
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
  progress: { deployed: number; total: number }
  formatDate: (date: string | null) => string
}>()

const emit = defineEmits<{
  checkPlan: []
  deploy: [confirmation: string | undefined]
}>()

const confirmationText = ref('')

const progressPercent = computed(() => {
  if (props.progress.total === 0) return 0
  return Math.round((props.progress.deployed / props.progress.total) * 100)
})

function handleCheckPlan() {
  emit('checkPlan')
}

function handleDeploy() {
  const confirmation = props.deployPlan?.overwrites ? confirmationText.value : undefined
  emit('deploy', confirmation)
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
