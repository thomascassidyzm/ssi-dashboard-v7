// src/composables/useVAD.ts
/**
 * Voice Activity Detection (VAD) composable
 * 
 * Detects speech vs silence in real-time for continuous flow recording.
 * Uses energy-based detection with configurable thresholds.
 */

import { ref, computed, onUnmounted } from 'vue'

export interface VADConfig {
  // Energy threshold (0-1) - below this is considered silence
  silenceThreshold: number
  // How long silence must persist before triggering end-of-speech (ms)
  silenceDuration: number
  // Minimum speech duration to be considered valid (ms)
  minSpeechDuration: number
  // How often to check audio levels (ms)
  pollInterval: number
}

export interface VADState {
  isListening: boolean
  isSpeaking: boolean
  currentLevel: number
  speechStartTime: number | null
  silenceStartTime: number | null
}

const defaultConfig: VADConfig = {
  silenceThreshold: 0.02,      // ~2% of max - quite sensitive
  silenceDuration: 800,         // 800ms of silence = end of phrase
  minSpeechDuration: 300,       // At least 300ms of speech to count
  pollInterval: 50              // Check every 50ms
}

export function useVAD(config: Partial<VADConfig> = {}) {
  const cfg = { ...defaultConfig, ...config }

  // State
  const isListening = ref(false)
  const isSpeaking = ref(false)
  const currentLevel = ref(0)
  const speechStartTime = ref<number | null>(null)
  const silenceStartTime = ref<number | null>(null)

  // Audio nodes
  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let stream: MediaStream | null = null
  let pollInterval: number | null = null

  // Callbacks
  let onSpeechStart: (() => void) | null = null
  let onSpeechEnd: ((durationMs: number) => void) | null = null
  let onLevelChange: ((level: number) => void) | null = null

  /**
   * Start listening to microphone
   */
  async function startListening(mediaStream?: MediaStream) {
    if (isListening.value) return

    try {
      // Use provided stream or get new one
      stream = mediaStream || await navigator.mediaDevices.getUserMedia({ audio: true })

      // Create audio context and analyser
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.5

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      // Start polling for audio levels
      isListening.value = true
      pollInterval = window.setInterval(pollAudioLevel, cfg.pollInterval)

    } catch (err) {
      console.error('[VAD] Failed to start listening:', err)
      throw err
    }
  }

  /**
   * Stop listening
   */
  function stopListening() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }

    if (audioContext) {
      audioContext.close()
      audioContext = null
    }

    // Only stop stream if we created it
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      stream = null
    }

    analyser = null
    isListening.value = false
    isSpeaking.value = false
    currentLevel.value = 0
    speechStartTime.value = null
    silenceStartTime.value = null
  }

  /**
   * Poll audio level and detect speech/silence transitions
   */
  function pollAudioLevel() {
    if (!analyser) return

    // Get frequency data
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(dataArray)

    // Calculate RMS energy (0-1)
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = dataArray[i] / 255
      sum += normalized * normalized
    }
    const rms = Math.sqrt(sum / dataArray.length)
    currentLevel.value = rms

    if (onLevelChange) {
      onLevelChange(rms)
    }

    const now = Date.now()
    const isAboveThreshold = rms > cfg.silenceThreshold

    if (isAboveThreshold) {
      // Sound detected
      silenceStartTime.value = null

      if (!isSpeaking.value) {
        // Speech just started
        isSpeaking.value = true
        speechStartTime.value = now
        if (onSpeechStart) {
          onSpeechStart()
        }
      }
    } else {
      // Silence detected
      if (isSpeaking.value) {
        // We were speaking, now silent
        if (!silenceStartTime.value) {
          silenceStartTime.value = now
        } else if (now - silenceStartTime.value >= cfg.silenceDuration) {
          // Silence has persisted long enough - speech ended
          const speechDuration = speechStartTime.value 
            ? now - speechStartTime.value - cfg.silenceDuration 
            : 0

          if (speechDuration >= cfg.minSpeechDuration) {
            // Valid speech segment
            if (onSpeechEnd) {
              onSpeechEnd(speechDuration)
            }
          }

          // Reset state
          isSpeaking.value = false
          speechStartTime.value = null
          silenceStartTime.value = null
        }
      }
    }
  }

  /**
   * Set callback for when speech starts
   */
  function onSpeechStartCallback(callback: () => void) {
    onSpeechStart = callback
  }

  /**
   * Set callback for when speech ends
   */
  function onSpeechEndCallback(callback: (durationMs: number) => void) {
    onSpeechEnd = callback
  }

  /**
   * Set callback for level changes
   */
  function onLevelChangeCallback(callback: (level: number) => void) {
    onLevelChange = callback
  }

  /**
   * Update VAD config on the fly
   */
  function updateConfig(newConfig: Partial<VADConfig>) {
    Object.assign(cfg, newConfig)
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopListening()
  })

  return {
    // State
    isListening,
    isSpeaking,
    currentLevel,

    // Actions
    startListening,
    stopListening,
    updateConfig,

    // Callbacks
    onSpeechStart: onSpeechStartCallback,
    onSpeechEnd: onSpeechEndCallback,
    onLevelChange: onLevelChangeCallback
  }
}
