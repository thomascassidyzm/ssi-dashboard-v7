<template>
  <div class="step-content space-y-4">
    <h4 class="text-lg font-semibold text-white">Step 1: Generate Manifest</h4>

    <!-- Options (when not generated) -->
    <div v-if="!state.manifestGenerated" class="space-y-4">
      <p class="text-slate-300 text-sm">
        Generate a legacy-format manifest for the old learning app.
      </p>

      <!-- Combined audio option -->
      <label class="option-item flex items-start gap-3 p-4 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors border border-slate-600">
        <input
          v-model="withAudio"
          type="checkbox"
          class="mt-1 w-4 h-4 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-800 rounded"
        />
        <div>
          <div class="text-white font-medium">Generate combined presentation audio</div>
          <div class="text-sm text-slate-400 mt-1">
            Creates narration + target1 + target2 combined files for each LEGO introduction.
            This runs in the background after the manifest downloads.
          </div>
        </div>
      </label>

      <!-- Use presentations as-is sub-option -->
      <label
        v-if="withAudio"
        class="flex items-start gap-2 ml-8 mt-1 cursor-pointer"
      >
        <input
          v-model="useAsIs"
          type="checkbox"
          class="mt-0.5 w-3.5 h-3.5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-800 rounded"
        />
        <span class="text-xs text-slate-400">
          Use existing presentations as-is (skip target concatenation)
        </span>
      </label>

      <!-- Generate button -->
      <button
        @click="handleGenerate"
        :disabled="isLoading"
        class="w-full px-4 py-3 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span v-if="isLoading" class="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        <span>{{ isLoading ? 'Generating...' : 'Generate Manifest' }}</span>
      </button>
    </div>

    <!-- Completed state -->
    <div v-else class="space-y-4">
      <!-- Audio generation progress (if running) -->
      <div v-if="audioProgress.status === 'running'" class="progress-box p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
        <div class="flex items-center gap-2 text-blue-400 font-medium mb-2">
          <span class="spinner w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
          <span>Generating combined presentation audio...</span>
        </div>
        <div class="progress-bar-container w-full bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            class="progress-bar-fill h-full bg-blue-500 transition-all duration-300"
            :style="{ width: audioProgressPercent + '%' }"
          ></div>
        </div>
        <div class="text-sm text-slate-400 mt-2">
          {{ audioProgress.completed }} / {{ audioProgress.total }} audio files
        </div>
      </div>

      <!-- Audio generation completed -->
      <div v-else-if="audioProgress.status === 'completed'" class="success-box p-4 bg-emerald-900/30 border border-emerald-700 rounded-lg">
        <div class="flex items-center gap-2 text-emerald-400 font-medium">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>Combined audio generation complete</span>
        </div>

        <!-- Audio generation errors/warnings -->
        <div v-if="audioProgress.skipped && audioProgress.skipped.length > 0" class="mt-3 p-3 bg-amber-900/30 border border-amber-700 rounded">
          <div class="flex items-center gap-2 text-amber-400 font-medium mb-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{{ audioProgress.skipped.length }} presentation{{ audioProgress.skipped.length > 1 ? 's' : '' }} skipped</span>
          </div>
          <div class="text-sm text-slate-300 space-y-1 max-h-48 overflow-y-auto">
            <div v-for="skip in audioProgress.skipped.slice(0, 10)" :key="skip.legoId" class="font-mono text-xs">
              <span class="text-amber-400">{{ skip.legoId }}</span>: missing <span class="text-red-400">{{ skip.missing.join(', ') }}</span>
            </div>
            <div v-if="audioProgress.skipped.length > 10" class="text-slate-400 italic">
              ... and {{ audioProgress.skipped.length - 10 }} more
            </div>
          </div>
        </div>

        <div v-if="audioProgress.errors && audioProgress.errors.length > 0" class="mt-3 p-3 bg-red-900/30 border border-red-700 rounded">
          <div class="flex items-center gap-2 text-red-400 font-medium mb-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>{{ audioProgress.errors.length }} concatenation error{{ audioProgress.errors.length > 1 ? 's' : '' }}</span>
          </div>
          <div class="text-sm text-slate-300 space-y-1 max-h-48 overflow-y-auto">
            <div v-for="err in audioProgress.errors.slice(0, 5)" :key="err.legoId" class="font-mono text-xs">
              <span class="text-red-400">{{ err.legoId }}</span>: {{ err.error }}
            </div>
            <div v-if="audioProgress.errors.length > 5" class="text-slate-400 italic">
              ... and {{ audioProgress.errors.length - 5 }} more
            </div>
          </div>
        </div>
      </div>

      <!-- Audio generation failed -->
      <div v-else-if="audioProgress.status === 'failed'" class="error-box p-4 bg-red-900/30 border border-red-700 rounded-lg">
        <div class="flex items-center gap-2 text-red-400 font-medium">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Audio generation failed</span>
        </div>
      </div>

      <!-- Success message -->
      <div class="success-box p-4 bg-emerald-900/30 border border-emerald-700 rounded-lg">
        <div class="flex items-center gap-2 text-emerald-400 font-medium">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>Generated: {{ formatDate(state.manifestGeneratedAt) }}</span>
        </div>
        <!-- Show machine name and pending path -->
        <div v-if="state.generatedOnMachine" class="mt-2 text-sm text-slate-400">
          <div class="flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Generated on <strong class="text-slate-300">{{ state.generatedOnMachine }}</strong></span>
          </div>
          <div v-if="state.pendingManifestPath" class="mt-1 font-mono text-xs text-slate-500">
            {{ state.pendingManifestPath }}
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div v-if="stats" class="stats-grid grid grid-cols-3 gap-3 text-sm">
        <div class="stat-item flex flex-col p-3 bg-slate-700 rounded">
          <span class="text-slate-400">Seeds</span>
          <span class="text-emerald-400 font-semibold text-lg">{{ stats.seeds?.toLocaleString() }}</span>
        </div>
        <div class="stat-item flex flex-col p-3 bg-slate-700 rounded">
          <span class="text-slate-400">Ordered Enc.</span>
          <span class="text-emerald-400 font-semibold text-lg">{{ stats.orderedEncouragements?.toLocaleString() }}</span>
        </div>
        <div class="stat-item flex flex-col p-3 bg-slate-700 rounded">
          <span class="text-slate-400">Pooled Enc.</span>
          <span class="text-emerald-400 font-semibold text-lg">{{ stats.pooledEncouragements?.toLocaleString() }}</span>
        </div>
      </div>

      <!-- Validation warnings -->
      <div v-if="validation && !validation.valid" class="validation-warning p-3 bg-amber-900/30 border border-amber-700 rounded-lg">
        <p class="text-amber-400 text-sm">
          {{ validation.summary }}
        </p>
      </div>

      <!-- API warnings (e.g., welcome missing) -->
      <div v-if="warnings && warnings.length > 0" class="warnings-box p-3 bg-amber-900/30 border border-amber-700 rounded-lg space-y-1">
        <div v-for="(warning, idx) in warnings" :key="idx" class="flex items-center gap-2 text-amber-400 text-sm">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{{ warning }}</span>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex gap-3">
        <button
          @click="handleRedownload"
          :disabled="isLoading"
          class="flex-1 px-4 py-2 text-sm font-medium bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors disabled:opacity-50"
        >
          Re-download Manifest
        </button>
        <button
          @click="handleRegenerate"
          :disabled="isLoading"
          class="flex-1 px-4 py-2 text-sm font-medium border border-slate-500 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          Regenerate
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ExportState, ManifestStats, ValidationResult } from '@/composables/useExportWorkflow'

const props = defineProps<{
  state: ExportState
  stats: ManifestStats | null
  validation: ValidationResult | null
  warnings: string[] | null
  isLoading: boolean
  audioProgress: {
    completed: number
    total: number
    status: 'none' | 'running' | 'completed' | 'failed'
    errors: Array<{ legoId: string, error: string }>
    skipped: Array<{ legoId: string, missing: string[] }>
  }
  formatDate: (date: string | null) => string
}>()

const emit = defineEmits<{
  generate: [withAudio: boolean, useAsIs: boolean]
  redownload: []
  regenerate: []
}>()

const withAudio = ref(true) // Default to true - always generate combined audio
const useAsIs = ref(false) // When true, skip target concatenation and use existing presentation audio

const audioProgressPercent = computed(() => {
  if (props.audioProgress.total === 0) return 0
  return Math.round((props.audioProgress.completed / props.audioProgress.total) * 100)
})

function handleGenerate() {
  emit('generate', withAudio.value, useAsIs.value)
}

function handleRedownload() {
  emit('redownload')
}

function handleRegenerate() {
  emit('regenerate')
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

.stat-item {
  border: 1px solid #475569;
}

input[type="checkbox"] {
  accent-color: #10b981;
}
</style>
