<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
        @click.self="close"
      >
        <div class="modal-content bg-slate-800 rounded-lg shadow-xl max-w-lg w-full">
          <!-- Header -->
          <div class="modal-header flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <h3 class="text-lg font-semibold text-white">Export Legacy Manifest</h3>
            <button
              @click="close"
              class="text-slate-400 hover:text-white transition-colors"
              title="Close (Esc)"
              :disabled="isExporting"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body px-6 py-6">
            <!-- Options (when not exporting) -->
            <div v-if="!isExporting && !exportComplete" class="options-section space-y-4">
              <p class="text-slate-300 text-sm">
                Export a legacy-format manifest for the old learning app.
              </p>

              <!-- Combined audio option -->
              <label class="option-item flex items-start gap-3 p-4 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
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

              <!-- Info box -->
              <div class="info-box p-3 bg-slate-900 rounded-lg border border-slate-700">
                <p class="text-slate-400 text-sm">
                  <span class="text-amber-400 mr-1">Note:</span>
                  The manifest will download immediately with placeholder presentation UUIDs.
                  If you enable combined audio, it will be generated in the background.
                </p>
              </div>
            </div>

            <!-- Progress Section (when exporting) -->
            <div v-if="isExporting" class="progress-section space-y-4">
              <div class="text-center">
                <div class="spinner w-12 h-12 mx-auto mb-4 border-4 border-slate-600 border-t-emerald-500 rounded-full animate-spin"></div>
                <p class="text-lg font-medium text-white">{{ statusMessage }}</p>
                <p class="text-sm text-slate-400 mt-1" v-if="audioJobId">
                  Job ID: {{ audioJobId }}
                </p>
              </div>

              <!-- Progress bar (for audio generation) -->
              <div v-if="audioTotal > 0" class="progress-bar-section">
                <div class="flex justify-between text-sm text-slate-400 mb-2">
                  <span>Generating combined audio...</span>
                  <span>{{ audioCompleted }} / {{ audioTotal }}</span>
                </div>
                <div class="progress-bar-container bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    class="progress-bar bg-emerald-500 h-full transition-all duration-300"
                    :style="{ width: `${progressPercent}%` }"
                  ></div>
                </div>
                <p class="text-center text-xs text-slate-500 mt-2">
                  {{ progressPercent }}% complete
                </p>
              </div>
            </div>

            <!-- Export Complete -->
            <div v-if="exportComplete && !isExporting" class="complete-section space-y-4">
              <div class="text-center">
                <div class="success-icon text-5xl">{{ exportError ? '❌' : '✅' }}</div>
                <p class="text-lg font-medium" :class="exportError ? 'text-red-400' : 'text-emerald-400'">
                  {{ exportError ? 'Export Failed' : 'Export Complete!' }}
                </p>
              </div>

              <!-- Validation Error Details -->
              <div v-if="validation && !validation.valid" class="validation-errors space-y-3">
                <!-- Invalid UUIDs -->
                <div v-if="validation.invalidUUIDs > 0" class="error-section p-3 bg-red-900/30 border border-red-700 rounded-lg">
                  <p class="text-red-400 font-medium text-sm mb-2">
                    Invalid UUIDs ({{ validation.invalidUUIDs }}):
                  </p>
                  <ul class="text-xs text-red-300 space-y-1 font-mono">
                    <li v-for="(item, idx) in validation.invalidUUIDDetails" :key="idx">
                      {{ item.path }}: "{{ item.value }}"
                    </li>
                    <li v-if="validation.invalidUUIDs > 5" class="text-red-400">
                      ... and {{ validation.invalidUUIDs - 5 }} more
                    </li>
                  </ul>
                </div>

                <!-- Empty Strings -->
                <div v-if="validation.emptyStrings > 0" class="error-section p-3 bg-red-900/30 border border-red-700 rounded-lg">
                  <p class="text-red-400 font-medium text-sm mb-2">
                    Empty Strings ({{ validation.emptyStrings }}):
                  </p>
                  <ul class="text-xs text-red-300 space-y-1 font-mono">
                    <li v-for="(path, idx) in validation.emptyStringDetails" :key="idx">
                      {{ path }}
                    </li>
                    <li v-if="validation.emptyStrings > 5" class="text-red-400">
                      ... and {{ validation.emptyStrings - 5 }} more
                    </li>
                  </ul>
                </div>

                <p class="text-slate-400 text-xs text-center">
                  Fix these issues in the source data before exporting.
                </p>
              </div>

              <!-- Success Stats -->
              <div v-if="exportStats && !exportError" class="stats-grid grid grid-cols-2 gap-3 text-sm">
                <div class="stat-item flex justify-between p-2 bg-slate-700 rounded">
                  <span class="text-slate-400">Seeds</span>
                  <span class="text-emerald-400 font-medium">{{ exportStats.seeds?.toLocaleString() }}</span>
                </div>
                <div class="stat-item flex justify-between p-2 bg-slate-700 rounded">
                  <span class="text-slate-400">Encouragements</span>
                  <span class="text-emerald-400 font-medium">{{ (exportStats.orderedEncouragements || 0) + (exportStats.pooledEncouragements || 0) }}</span>
                </div>
              </div>

              <p v-if="audioJobId && withAudio && !exportError" class="text-sm text-slate-400 text-center">
                Combined audio generation is running in the background.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700">
            <!-- Cancel button (when not complete) -->
            <button
              v-if="!exportComplete"
              @click="isExporting ? cancelExport() : close()"
              class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              :class="isExporting ? 'bg-red-600 text-white hover:bg-red-700' : 'text-slate-300 hover:text-white'"
            >
              {{ isExporting ? 'Stop' : 'Cancel' }}
            </button>

            <!-- Export button (when not exporting and not complete) -->
            <button
              v-if="!isExporting && !exportComplete"
              @click="startExport"
              class="px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
            >
              <span>{{ withAudio ? 'Export & Generate Audio' : 'Export Manifest' }}</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>

            <!-- Done button (when complete) -->
            <button
              v-if="exportComplete"
              @click="close"
              class="px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { io, Socket } from 'socket.io-client'

// Props
const props = defineProps<{
  visible: boolean
  courseCode: string
}>()

// Emits
const emit = defineEmits<{
  close: []
}>()

// Get API base URL
function getApiBaseUrl(): string {
  const storedUrl = localStorage.getItem('api_base_url')
  if (storedUrl) return storedUrl

  const isVercel = typeof window !== 'undefined' && (
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname === 'popty.app' ||
    window.location.hostname.endsWith('.popty.app')
  )
  if (isVercel) return ''

  return getApiUrl()
}

// State
const withAudio = ref(false)
const isExporting = ref(false)
const exportComplete = ref(false)
const exportError = ref<string | null>(null)
const exportStats = ref<{ seeds?: number; orderedEncouragements?: number; pooledEncouragements?: number } | null>(null)

// Validation state
const validation = ref<{
  valid: boolean
  summary: string
  invalidUUIDs: number
  emptyStrings: number
  invalidUUIDDetails: Array<{ path: string; value: string }>
  emptyStringDetails: string[]
} | null>(null)

// Audio job progress
const audioJobId = ref<string | null>(null)
const audioTotal = ref(0)
const audioCompleted = ref(0)
const statusMessage = ref('Preparing export...')

// WebSocket connection
let socket: Socket | null = null
let pollInterval: ReturnType<typeof setInterval> | null = null

// Computed
const progressPercent = computed(() => {
  if (audioTotal.value === 0) return 0
  return Math.round((audioCompleted.value / audioTotal.value) * 100)
})

// Methods
function close() {
  if (!isExporting.value) {
    emit('close')
    // Reset state after close animation
    setTimeout(resetState, 200)
  }
}

function resetState() {
  withAudio.value = false
  isExporting.value = false
  exportComplete.value = false
  exportError.value = null
  exportStats.value = null
  validation.value = null
  audioJobId.value = null
  audioTotal.value = 0
  audioCompleted.value = 0
  statusMessage.value = 'Preparing export...'
}

async function startExport() {
  isExporting.value = true
  exportError.value = null
  statusMessage.value = 'Generating manifest...'

  try {
    const apiBase = getApiBaseUrl()
    const url = `${apiBase}/api/production/${props.courseCode}/export-legacy${withAudio.value ? '?withAudio=true' : ''}`

    const response = await fetch(url, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Export failed')
    }

    const data = await response.json()

    if (!data.success || !data.manifest) {
      throw new Error(data.error || 'No manifest data')
    }

    // Store validation results
    if (data.validation) {
      validation.value = data.validation
    }

    // Check if validation failed - block export if critical issues
    if (data.validation && !data.validation.valid) {
      exportError.value = `Validation failed: ${data.validation.summary}`
      exportComplete.value = true
      isExporting.value = false
      return // Don't download the manifest if validation fails
    }

    // Download the manifest immediately
    downloadManifest(data.manifest, data.filename)
    exportStats.value = data.stats

    // If audio job was started, track it
    if (data.audioJobId) {
      audioJobId.value = data.audioJobId
      statusMessage.value = 'Manifest downloaded. Generating combined audio...'
      connectWebSocket()
    } else {
      // No audio job, we're done
      exportComplete.value = true
      isExporting.value = false
    }
  } catch (err) {
    exportError.value = err instanceof Error ? err.message : 'Export failed'
    exportComplete.value = true
    isExporting.value = false
  }
}

function downloadManifest(manifest: any, filename: string) {
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `${props.courseCode}_legacy.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function connectWebSocket() {
  const apiBase = getApiBaseUrl()
  const wsUrl = apiBase || window.location.origin

  socket = io(wsUrl, {
    path: '/api/production/websocket',
    transports: ['websocket', 'polling']
  })

  socket.on('connect', () => {
    console.log('[LegacyExport] WebSocket connected')
  })

  // Start polling as fallback (every 2 seconds)
  // This ensures we get status updates even if WebSocket events are missed
  pollInterval = setInterval(pollJobStatus, 2000)
  // Also poll immediately in case job already finished
  setTimeout(pollJobStatus, 500)

  socket.on('legacyAudio:started', (data: { jobId: string; courseCode: string; total: number }) => {
    if (data.courseCode === props.courseCode) {
      audioTotal.value = data.total
      audioCompleted.value = 0
      statusMessage.value = `Generating combined audio (0/${data.total})...`
    }
  })

  socket.on('legacyAudio:progress', (data: { jobId: string; completed: number; total: number }) => {
    audioCompleted.value = data.completed
    audioTotal.value = data.total
    statusMessage.value = `Generating combined audio (${data.completed}/${data.total})...`
  })

  socket.on('legacyAudio:completed', (data: { jobId: string }) => {
    statusMessage.value = 'Audio generation complete!'
    exportComplete.value = true
    isExporting.value = false
    disconnectWebSocket()
  })

  socket.on('legacyAudio:cancelled', (data: { jobId: string }) => {
    statusMessage.value = 'Audio generation cancelled'
    exportComplete.value = true
    isExporting.value = false
    disconnectWebSocket()
  })

  socket.on('legacyAudio:failed', (data: { jobId: string; error: string }) => {
    exportError.value = `Audio generation failed: ${data.error}`
    exportComplete.value = true
    isExporting.value = false
    disconnectWebSocket()
  })

  socket.on('disconnect', () => {
    console.log('[LegacyExport] WebSocket disconnected')
  })
}

function disconnectWebSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

// Poll job status as fallback (in case WebSocket events are missed)
async function pollJobStatus() {
  if (!audioJobId.value) return

  try {
    const apiBase = getApiBaseUrl()
    const response = await fetch(`${apiBase}/api/production/${props.courseCode}/legacy-audio-status`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    if (!response.ok) return

    const data = await response.json()

    if (data.status === 'completed') {
      statusMessage.value = 'Audio generation complete!'
      exportComplete.value = true
      isExporting.value = false
      disconnectWebSocket()
    } else if (data.status === 'cancelled') {
      statusMessage.value = 'Audio generation cancelled'
      exportComplete.value = true
      isExporting.value = false
      disconnectWebSocket()
    } else if (data.status === 'failed') {
      exportError.value = 'Audio generation failed'
      exportComplete.value = true
      isExporting.value = false
      disconnectWebSocket()
    } else if (data.status === 'running') {
      // Update progress from poll
      audioCompleted.value = data.completed || 0
      audioTotal.value = data.total || 0
      if (data.total > 0) {
        statusMessage.value = `Generating combined audio (${data.completed}/${data.total})...`
      }
    }
  } catch (err) {
    console.error('[LegacyExport] Poll error:', err)
  }
}

async function cancelExport() {
  if (!audioJobId.value) {
    // No audio job, just close
    isExporting.value = false
    exportComplete.value = true
    return
  }

  try {
    const apiBase = getApiBaseUrl()
    const response = await fetch(`${apiBase}/api/production/${props.courseCode}/cancel-legacy-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    })

    if (!response.ok) {
      console.error('Failed to cancel audio job')
    }
    // The WebSocket will receive the cancelled event
  } catch (err) {
    console.error('Error cancelling export:', err)
    isExporting.value = false
    exportComplete.value = true
  }
}

// Keyboard shortcuts
function handleKeydown(event: KeyboardEvent) {
  if (!props.visible) return

  if (event.key === 'Escape' && !isExporting.value) {
    event.preventDefault()
    close()
  }
}

// Watch for visibility changes
watch(() => props.visible, (newValue) => {
  if (!newValue) {
    disconnectWebSocket()
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  disconnectWebSocket()
})
</script>

<style scoped>
.modal-overlay {
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(4px);
}

.modal-content {
  background: #1e293b;
  border: 1px solid #334155;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.modal-header {
  background: linear-gradient(180deg, #334155 0%, transparent 100%);
  border-bottom-color: #334155;
}

.modal-footer {
  background: #1e293b;
  border-top-color: #334155;
}

/* Option item */
.option-item {
  border: 1px solid #475569;
}

.option-item:hover {
  border-color: #64748b;
}

/* Checkbox styling */
input[type="checkbox"] {
  accent-color: #10b981;
}

/* Spinner */
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Progress bar */
.progress-bar-container {
  background: #334155;
}

.progress-bar {
  background: linear-gradient(90deg, #10b981, #059669);
}

/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}

/* Stat items */
.stat-item {
  background: #334155;
  border: 1px solid #475569;
}

/* Info box */
.info-box {
  border-color: #475569;
}
</style>
