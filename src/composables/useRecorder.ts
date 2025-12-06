// src/composables/useRecorder.ts
import { ref, onUnmounted } from 'vue'

export interface RecorderState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioLevel: number
  error: string | null
}

export function useRecorder() {
  const isRecording = ref(false)
  const isPaused = ref(false)
  const duration = ref(0)
  const audioLevel = ref(0)
  const error = ref<string | null>(null)
  const audioBlob = ref<Blob | null>(null)
  const audioUrl = ref<string | null>(null)

  let mediaRecorder: MediaRecorder | null = null
  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let stream: MediaStream | null = null
  let chunks: Blob[] = []
  let durationInterval: number | null = null
  let levelInterval: number | null = null

  async function startRecording() {
    error.value = null
    chunks = []

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Set up audio context for level monitoring
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      analyser.fftSize = 256

      // Start level monitoring
      levelInterval = window.setInterval(updateAudioLevel, 50)

      // Create recorder
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      mediaRecorder.onstop = () => {
        audioBlob.value = new Blob(chunks, { type: 'audio/webm' })
        audioUrl.value = URL.createObjectURL(audioBlob.value)
      }

      mediaRecorder.start()
      isRecording.value = true
      isPaused.value = false
      duration.value = 0

      // Duration counter
      durationInterval = window.setInterval(() => {
        if (!isPaused.value) {
          duration.value += 0.1
        }
      }, 100)

    } catch (err) {
      error.value = 'Could not access microphone. Please allow microphone access.'
      console.error('Recording error:', err)
      cleanup()
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    cleanup()
    isRecording.value = false
    isPaused.value = false
  }

  function pauseRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause()
      isPaused.value = true
    }
  }

  function resumeRecording() {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume()
      isPaused.value = false
    }
  }

  function getAudioBlob(): Blob | null {
    return audioBlob.value
  }

  function getAudioUrl(): string | null {
    return audioUrl.value
  }

  function updateAudioLevel() {
    if (!analyser) return

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(dataArray)

    // Calculate RMS level
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i]
    }
    const rms = Math.sqrt(sum / dataArray.length)
    audioLevel.value = rms / 255 // Normalize to 0-1
  }

  function cleanup() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      stream = null
    }

    if (audioContext) {
      audioContext.close()
      audioContext = null
    }

    if (durationInterval) {
      clearInterval(durationInterval)
      durationInterval = null
    }

    if (levelInterval) {
      clearInterval(levelInterval)
      levelInterval = null
    }

    analyser = null
  }

  function reset() {
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value)
    }
    audioBlob.value = null
    audioUrl.value = null
    duration.value = 0
    audioLevel.value = 0
    error.value = null
  }

  onUnmounted(() => {
    cleanup()
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value)
    }
  })

  return {
    // State
    isRecording,
    isPaused,
    duration,
    audioLevel,
    error,

    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    getAudioBlob,
    getAudioUrl,
    reset
  }
}
