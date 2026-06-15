<template>
  <div class="recording-studio">
    <!-- Header -->
    <div class="studio-header">
      <div class="header-left">
        <h1 class="studio-title">Recording Studio</h1>
        <p class="studio-subtitle">{{ courseCode }}</p>
      </div>

      <!-- Flow Mode Toggle -->
      <div class="flow-mode-toggle">
        <button
          @click="toggleFlowMode"
          :class="['flow-btn', { active: isFlowMode, recording: flowRecorder.isCapturing.value }]"
        >
          <span v-if="!isFlowMode" class="flow-icon">▶</span>
          <span v-else-if="flowRecorder.isCapturing.value" class="flow-icon pulse">●</span>
          <span v-else class="flow-icon">◉</span>
          <span class="flow-label">
            {{ isFlowMode ? (flowRecorder.isCapturing.value ? 'Recording...' : 'Listening...') : 'Start Flow Mode' }}
          </span>
        </button>
        <p class="flow-hint" v-if="!isFlowMode">
          Just talk — auto-detects speech, uploads, advances
        </p>
      </div>

      <div class="header-stats">
        <div class="stat-item">
          <span class="stat-label">Queue</span>
          <span class="stat-value">{{ queueStats.recorded }} / {{ queueStats.total }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Progress</span>
          <span class="stat-value">{{ queueStats.percentage }}%</span>
        </div>
      </div>
    </div>

    <!-- Flow Mode Audio Level Indicator -->
    <div v-if="isFlowMode" class="flow-level-bar">
      <div class="level-fill" :style="{ width: (flowRecorder.currentLevel.value * 100) + '%' }"></div>
      <div class="level-threshold" :style="{ left: '2%' }"></div>
    </div>

    <!-- Main Layout: Autocue + Queue Panel -->
    <div class="studio-layout">
      <!-- Left Panel: Autocue Display + Controls -->
      <div class="autocue-panel">
        <AutocueDisplay
          v-if="currentPhrase"
          :phrase="currentPhrase"
          :context-phrases="contextPhrases"
          :slow-mode="slowMode"
        />

        <div v-else class="no-phrase-message">
          <p v-if="queue.length === 0">No phrases in queue</p>
          <p v-else>Select a phrase from the queue to begin</p>
        </div>

        <RecordingControls
          v-if="currentPhrase"
          :is-recording="recorderState.isRecording"
          :is-paused="recorderState.isPaused"
          :has-recording="hasRecording"
          :upload-status="uploadState"
          @record="handleRecord"
          @stop="handleStop"
          @play="handlePlay"
          @upload="handleUpload"
          @re-record="handleReRecord"
        />
      </div>

      <!-- Right Panel: Queue -->
      <div class="queue-panel">
        <RecordingQueue
          :items="queue"
          :current-item-uuid="currentPhrase?.uuid"
          :filters="queueFilters"
          @select="selectPhrase"
          @filter="updateFilters"
        />
      </div>
    </div>

    <!-- Upload Status Toast -->
    <div v-if="uploadStatus" class="upload-toast" :class="uploadStatus.type">
      {{ uploadStatus.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useProductionStore } from '@/stores/production'
import { useRecorder } from '@/composables/useRecorder'
import { useAudioUpload } from '@/composables/useAudioUpload'
import { useContinuousRecorder } from '@/composables/useContinuousRecorder'

import AutocueDisplay from './components/AutocueDisplay.vue'
import RecordingControls from './components/RecordingControls.vue'
import RecordingQueue from './components/RecordingQueue.vue'

const route = useRoute()
const store = useProductionStore()

// Props from route
const courseCode = computed(() => route.params.courseCode as string)

// Composables
const recorder = useRecorder()
const uploader = useAudioUpload()
const flowRecorder = useContinuousRecorder({
  silenceThreshold: 0.02,
  silenceDuration: 800,
  minSpeechDuration: 300
})

// Flow mode state
const isFlowMode = computed(() => flowRecorder.isFlowMode.value)

// State
const slowMode = ref(false)
const currentPhraseIndex = ref(0)
const queueFilters = ref({
  voice: null,
  role: null,
  status: 'pending'
})
const uploadStatus = ref<{ message: string; type: 'success' | 'error' } | null>(null)

// Computed
const queue = computed(() => store.recordingQueue)
const currentPhrase = computed(() => store.currentRecordingPhrase)
const recorderState = computed(() => ({
  isRecording: recorder.isRecording.value,
  isPaused: recorder.isPaused.value,
  duration: recorder.duration.value,
  audioLevel: recorder.audioLevel.value
}))
const hasRecording = computed(() => recorder.getAudioBlob() !== null)
const uploadState = computed(() => ({
  isUploading: uploader.isUploading.value,
  progress: uploader.progress.value,
  error: uploader.error.value
}))

const queueStats = computed(() => {
  const total = queue.value.length
  const recorded = queue.value.filter(item => item.status === 'recorded').length
  const percentage = total > 0 ? Math.round((recorded / total) * 100) : 0

  return { total, recorded, remaining: total - recorded, percentage }
})

const contextPhrases = computed(() => {
  if (!currentPhrase.value || queue.value.length === 0) return { previous: null, next: null }

  const currentIdx = queue.value.findIndex(item => item.uuid === currentPhrase.value?.uuid)
  if (currentIdx === -1) return { previous: null, next: null }

  return {
    previous: currentIdx > 0 ? queue.value[currentIdx - 1] : null,
    next: currentIdx < queue.value.length - 1 ? queue.value[currentIdx + 1] : null
  }
})

// Actions
async function loadQueue() {
  await store.loadRecordingQueue(courseCode.value, queueFilters.value)

  // Auto-select first phrase if none selected
  if (queue.value.length > 0 && !currentPhrase.value) {
    selectPhrase(queue.value[0])
  }
}

function selectPhrase(phrase: any) {
  store.startRecording(phrase)
  recorder.reset()
}

function handleRecord() {
  if (recorder.isRecording.value) {
    recorder.pauseRecording()
  } else if (recorder.isPaused.value) {
    recorder.resumeRecording()
  } else {
    recorder.startRecording()
  }
}

function handleStop() {
  recorder.stopRecording()
  const audioBlob = recorder.getAudioBlob()
  if (audioBlob) {
    store.stopRecording(audioBlob)
  }
}

function handlePlay() {
  const audioUrl = recorder.getAudioUrl()
  if (audioUrl) {
    const audio = new Audio(audioUrl)
    audio.play()
  }
}

async function handleUpload() {
  if (!currentPhrase.value || !hasRecording.value) return

  const audioBlob = recorder.getAudioBlob()
  if (!audioBlob) return

  try {
    const metadata = {
      uuid: currentPhrase.value.uuid,
      text: currentPhrase.value.text,
      language: currentPhrase.value.language,
      role: currentPhrase.value.role,
      cadence: slowMode.value ? 'slow' : 'natural',
      voiceId: `human_${courseCode.value}`,
      courseCode: courseCode.value
    }

    await store.uploadRecording(audioBlob, metadata)

    uploadStatus.value = {
      message: 'Upload successful!',
      type: 'success'
    }

    // Clear status after 3 seconds
    setTimeout(() => {
      uploadStatus.value = null
    }, 3000)

    // Auto-advance to next phrase
    const currentIdx = queue.value.findIndex(item => item.uuid === currentPhrase.value?.uuid)
    if (currentIdx < queue.value.length - 1) {
      selectPhrase(queue.value[currentIdx + 1])
    }

  } catch (err: any) {
    uploadStatus.value = {
      message: `Upload failed: ${err.message}`,
      type: 'error'
    }
  }
}

function handleReRecord() {
  recorder.reset()
  recorder.startRecording()
}

function updateFilters(filters: any) {
  queueFilters.value = { ...queueFilters.value, ...filters }
  loadQueue()
}

// ============================================================================
// FLOW MODE (Continuous Recording)
// ============================================================================

async function toggleFlowMode() {
  if (isFlowMode.value) {
    flowRecorder.stopFlow()
  } else {
    await flowRecorder.startFlow()
  }
}

// Handle captured segment in flow mode
flowRecorder.onSegmentCaptured(async (segment) => {
  if (!currentPhrase.value) return

  try {
    // Upload the segment
    const metadata = {
      uuid: currentPhrase.value.uuid,
      text: currentPhrase.value.text,
      language: currentPhrase.value.language,
      role: currentPhrase.value.role,
      cadence: slowMode.value ? 'slow' : 'natural',
      voiceId: `human_${courseCode.value}`,
      courseCode: courseCode.value
    }

    await store.uploadRecording(segment.blob, metadata)

    uploadStatus.value = {
      message: `✓ Uploaded (${Math.round(segment.durationMs / 100) / 10}s)`,
      type: 'success'
    }

    // Clear status after 2 seconds (faster in flow mode)
    setTimeout(() => {
      uploadStatus.value = null
    }, 2000)

    // Auto-advance to next phrase
    const currentIdx = queue.value.findIndex(item => item.uuid === currentPhrase.value?.uuid)
    if (currentIdx < queue.value.length - 1) {
      selectPhrase(queue.value[currentIdx + 1])
    } else {
      // Queue complete!
      flowRecorder.stopFlow()
      uploadStatus.value = {
        message: '🎉 All phrases recorded!',
        type: 'success'
      }
    }

  } catch (err: any) {
    uploadStatus.value = {
      message: `Upload failed: ${err.message}`,
      type: 'error'
    }
  }
})

flowRecorder.onError((error) => {
  uploadStatus.value = {
    message: `Flow mode error: ${error}`,
    type: 'error'
  }
})

// Lifecycle
onMounted(() => {
  loadQueue()
})

watch(courseCode, () => {
  loadQueue()
})
</script>

<style scoped>
.recording-studio {
  min-height: 100vh;
  background: var(--color-void, var(--canvas));
  padding: 2rem;
}

.studio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-graphite, var(--surface-3));
}

.header-left {
  flex: 1;
}

.studio-title {
  font-family: var(--font-display, 'Crimson Pro', serif);
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-paper, var(--ink));
  margin: 0 0 0.25rem 0;
}

.studio-subtitle {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.875rem;
  color: var(--color-paper-dim, var(--muted));
  margin: 0;
}

.header-stats {
  display: flex;
  gap: 1.5rem;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 0.75rem;
  color: var(--color-paper-dim, var(--muted));
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.stat-value {
  display: block;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--color-emerald, #06ffa5);
}

.studio-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  height: calc(100vh - 200px);
}

.autocue-panel {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.queue-panel {
  background: var(--color-shadow, var(--surface));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 12px;
  overflow: hidden;
}

.no-phrase-message {
  background: var(--color-shadow, var(--surface));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 12px;
  padding: 4rem 2rem;
  text-align: center;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-phrase-message p {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 1.125rem;
  color: var(--color-paper-dim, var(--muted));
  margin: 0;
}

.upload-toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  animation: slideIn 0.3s ease;
}

.upload-toast.success {
  background: var(--color-emerald, #06ffa5);
  color: var(--color-void, var(--canvas));
}

.upload-toast.error {
  background: var(--color-film-red, #e63946);
  color: white;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 1024px) {
  .studio-layout {
    grid-template-columns: 1fr;
    height: auto;
  }

  .queue-panel {
    order: -1;
    max-height: 300px;
  }
}

/* Flow Mode Styles */
.flow-mode-toggle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.flow-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.5rem;
  background: var(--color-slate, var(--surface-2));
  border: 2px solid var(--color-graphite, var(--surface-3));
  border-radius: 50px;
  color: var(--color-paper, var(--ink));
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.flow-btn:hover {
  background: var(--color-graphite, var(--surface-3));
  border-color: var(--color-emerald, #06ffa5);
}

.flow-btn.active {
  background: var(--color-emerald, #06ffa5);
  border-color: var(--color-emerald, #06ffa5);
  color: var(--color-void, var(--canvas));
  box-shadow: 0 0 20px rgba(6, 255, 165, 0.3);
}

.flow-btn.active.recording {
  background: var(--color-film-red, #e63946);
  border-color: var(--color-film-red, #e63946);
  color: white;
  box-shadow: 0 0 20px rgba(230, 57, 70, 0.4);
  animation: recordPulse 1.5s ease-in-out infinite;
}

.flow-icon {
  font-size: 1.25rem;
}

.flow-icon.pulse {
  animation: iconPulse 0.8s ease-in-out infinite;
}

@keyframes iconPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}

@keyframes recordPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(230, 57, 70, 0.4); }
  50% { box-shadow: 0 0 40px rgba(230, 57, 70, 0.7); }
}

.flow-hint {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 0.75rem;
  color: var(--color-paper-dim, var(--muted));
  margin: 0;
  opacity: 0.7;
}

.flow-level-bar {
  height: 4px;
  background: var(--color-slate, var(--surface-2));
  border-radius: 2px;
  margin-bottom: 1rem;
  position: relative;
  overflow: hidden;
}

.level-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-emerald, #06ffa5), var(--color-tungsten, var(--accent)));
  border-radius: 2px;
  transition: width 0.05s linear;
}

.level-threshold {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-film-red, #e63946);
  opacity: 0.5;
}
</style>
