<template>
  <div class="audio-recorder bg-surface border border-line rounded-lg p-6">
    <!-- Recording Status -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <div
          class="w-4 h-4 rounded-full"
          :class="isRecording ? 'bg-red-500 animate-pulse' : 'bg-surface-3'"
        ></div>
        <span class="text-ink">
          {{ isRecording ? 'Recording...' : hasRecording ? 'Recording ready' : 'Ready to record' }}
        </span>
      </div>
      <span v-if="duration" class="text-muted font-mono text-sm">
        {{ formatDuration(duration) }}
      </span>
    </div>

    <!-- Waveform Visualization (simple bars) -->
    <div class="waveform h-20 bg-canvas rounded-lg mb-4 flex items-center justify-center overflow-hidden">
      <div v-if="isRecording" class="flex items-end gap-1 h-full py-2">
        <div
          v-for="i in 20"
          :key="i"
          class="w-2 bg-emerald-500 rounded-full transition-all duration-100"
          :style="{ height: `${audioLevels[i % audioLevels.length] || 20}%` }"
        ></div>
      </div>
      <div v-else-if="hasRecording" class="text-faint">
        <audio ref="audioPreview" :src="recordingUrl" class="hidden"></audio>
        Click Play to preview
      </div>
      <div v-else class="text-faint">
        Click Record to start
      </div>
    </div>

    <!-- Controls -->
    <div class="flex items-center justify-center gap-4">
      <!-- Record Button -->
      <button
        v-if="!isRecording && !hasRecording"
        @click="startRecording"
        class="w-16 h-16 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors"
        title="Start Recording"
      >
        <svg class="w-8 h-8 text-ink" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="6"/>
        </svg>
      </button>

      <!-- Stop Button -->
      <button
        v-if="isRecording"
        @click="stopRecording"
        class="w-16 h-16 bg-surface-3 hover:bg-surface-3 rounded-full flex items-center justify-center transition-colors"
        title="Stop Recording"
      >
        <svg class="w-6 h-6 text-ink" fill="currentColor" viewBox="0 0 20 20">
          <rect x="5" y="5" width="10" height="10" rx="1"/>
        </svg>
      </button>

      <!-- Playback Controls (when recording exists) -->
      <template v-if="hasRecording && !isRecording">
        <button
          @click="playRecording"
          class="w-12 h-12 bg-emerald-600 hover:bg-emerald-500 rounded-full flex items-center justify-center transition-colors"
          title="Play"
        >
          <svg class="w-5 h-5 text-ink ml-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6 4l10 6-10 6V4z"/>
          </svg>
        </button>

        <button
          @click="reRecord"
          class="w-12 h-12 bg-surface-2 hover:bg-surface-3 rounded-full flex items-center justify-center transition-colors"
          title="Re-record"
        >
          <svg class="w-5 h-5 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>

        <button
          @click="clearRecording"
          class="w-12 h-12 bg-surface-2 hover:bg-surface-3 rounded-full flex items-center justify-center transition-colors"
          title="Clear"
        >
          <svg class="w-5 h-5 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </template>
    </div>

    <!-- Error Message -->
    <p v-if="error" class="text-red-400 text-sm text-center mt-4">
      {{ error }}
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['recorded', 'cleared'])

// State
const isRecording = ref(false)
const hasRecording = ref(false)
const recordingUrl = ref(null)
const recordingBlob = ref(null)
const duration = ref(0)
const error = ref(null)
const audioLevels = ref([])

// Refs
const audioPreview = ref(null)
let mediaRecorder = null
let audioContext = null
let analyser = null
let stream = null
let chunks = []
let durationInterval = null
let visualizerInterval = null

async function startRecording() {
  error.value = null
  chunks = []

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    // Set up audio context for visualization
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioContext.createAnalyser()
    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)
    analyser.fftSize = 64

    // Start visualizer
    visualizerInterval = setInterval(updateVisualization, 50)

    // Create recorder
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    mediaRecorder.onstop = () => {
      recordingBlob.value = new Blob(chunks, { type: 'audio/webm' })
      recordingUrl.value = URL.createObjectURL(recordingBlob.value)
      hasRecording.value = true
      emit('recorded', recordingBlob.value)
    }

    mediaRecorder.start()
    isRecording.value = true
    duration.value = 0

    // Duration counter
    durationInterval = setInterval(() => {
      duration.value += 0.1
    }, 100)

  } catch (err) {
    error.value = 'Could not access microphone. Please allow microphone access.'
    console.error('Recording error:', err)
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }

  if (stream) {
    stream.getTracks().forEach(track => track.stop())
  }

  if (audioContext) {
    audioContext.close()
  }

  clearInterval(durationInterval)
  clearInterval(visualizerInterval)
  audioLevels.value = []
  isRecording.value = false
}

function playRecording() {
  if (audioPreview.value) {
    audioPreview.value.play()
  }
}

function reRecord() {
  clearRecording()
  startRecording()
}

function clearRecording() {
  if (recordingUrl.value) {
    URL.revokeObjectURL(recordingUrl.value)
  }
  recordingUrl.value = null
  recordingBlob.value = null
  hasRecording.value = false
  duration.value = 0
  emit('cleared')
}

function updateVisualization() {
  if (!analyser) return

  const dataArray = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(dataArray)

  audioLevels.value = Array.from(dataArray.slice(0, 20)).map(v => (v / 255) * 100)
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`
}

// Toggle recording (for keyboard shortcuts)
function toggleRecording() {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

// Expose methods for parent components
defineExpose({
  getRecording: () => recordingBlob.value,
  hasRecording: () => hasRecording.value,
  toggleRecording,
  playRecording,
  clearRecording,
  startRecording,
  stopRecording
})

onUnmounted(() => {
  clearInterval(durationInterval)
  clearInterval(visualizerInterval)
  if (recordingUrl.value) URL.revokeObjectURL(recordingUrl.value)
  if (stream) stream.getTracks().forEach(t => t.stop())
  if (audioContext) audioContext.close()
})
</script>
