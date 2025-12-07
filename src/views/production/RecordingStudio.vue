<template>
  <div class="recording-studio">
    <!-- Header -->
    <div class="studio-header">
      <div class="header-left">
        <h1 class="studio-title">Recording Studio</h1>
        <p class="studio-subtitle">{{ courseCode }}</p>
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
  background: var(--color-void, #0f172a);
  padding: 2rem;
}

.studio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-graphite, #475569);
}

.header-left {
  flex: 1;
}

.studio-title {
  font-family: var(--font-display, 'Crimson Pro', serif);
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-paper, #f7f7f2);
  margin: 0 0 0.25rem 0;
}

.studio-subtitle {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.875rem;
  color: var(--color-paper-dim, #c1c1bb);
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
  color: var(--color-paper-dim, #c1c1bb);
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
  background: var(--color-shadow, #1e293b);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 12px;
  overflow: hidden;
}

.no-phrase-message {
  background: var(--color-shadow, #1e293b);
  border: 1px solid var(--color-graphite, #475569);
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
  color: var(--color-paper-dim, #c1c1bb);
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
  color: var(--color-void, #0f172a);
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
</style>
