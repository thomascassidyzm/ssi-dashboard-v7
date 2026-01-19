// src/composables/useContinuousRecorder.ts
/**
 * Continuous Flow Recorder
 * 
 * Enables "teleprompt mode" where the creator:
 * 1. Hits record once
 * 2. Reads phrases as they appear on autocue
 * 3. System auto-detects speech end, segments, uploads
 * 4. Autocue advances to next phrase
 * 
 * Uses VAD for speech detection and MediaRecorder for capture.
 */

import { ref, computed, onUnmounted } from 'vue'
import { useVAD, type VADConfig } from './useVAD'

export interface ContinuousRecorderConfig extends Partial<VADConfig> {
  // Auto-upload after capturing segment
  autoUpload: boolean
  // Auto-advance to next phrase after upload
  autoAdvance: boolean
}

export interface RecordedSegment {
  blob: Blob
  durationMs: number
  timestamp: number
}

const defaultConfig: ContinuousRecorderConfig = {
  silenceThreshold: 0.02,
  silenceDuration: 800,
  minSpeechDuration: 300,
  pollInterval: 50,
  autoUpload: true,
  autoAdvance: true
}

export function useContinuousRecorder(config: Partial<ContinuousRecorderConfig> = {}) {
  const cfg = { ...defaultConfig, ...config }

  // VAD for speech detection
  const vad = useVAD({
    silenceThreshold: cfg.silenceThreshold,
    silenceDuration: cfg.silenceDuration,
    minSpeechDuration: cfg.minSpeechDuration,
    pollInterval: cfg.pollInterval
  })

  // State
  const isFlowMode = ref(false)
  const isCapturing = ref(false)
  const segmentCount = ref(0)
  const lastSegment = ref<RecordedSegment | null>(null)
  const error = ref<string | null>(null)

  // Audio capture
  let mediaRecorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let chunks: Blob[] = []
  let segmentStartTime: number | null = null

  // Callbacks
  let onSegmentCaptured: ((segment: RecordedSegment) => void) | null = null
  let onSegmentUploaded: ((segment: RecordedSegment) => void) | null = null
  let onError: ((error: string) => void) | null = null

  /**
   * Start continuous flow recording
   */
  async function startFlow() {
    if (isFlowMode.value) return

    error.value = null

    try {
      // Get microphone access
      stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })

      // Start VAD listening (share the stream)
      await vad.startListening(stream)

      // Set up MediaRecorder
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        if (chunks.length > 0 && segmentStartTime) {
          const blob = new Blob(chunks, { type: 'audio/webm' })
          const durationMs = Date.now() - segmentStartTime

          const segment: RecordedSegment = {
            blob,
            durationMs,
            timestamp: segmentStartTime
          }

          lastSegment.value = segment
          segmentCount.value++

          if (onSegmentCaptured) {
            onSegmentCaptured(segment)
          }
        }

        chunks = []
        segmentStartTime = null
        isCapturing.value = false

        // If still in flow mode, we're ready for next segment
        // MediaRecorder will be started again when speech is detected
      }

      // Wire up VAD callbacks
      vad.onSpeechStart(() => {
        if (!isFlowMode.value || !mediaRecorder) return

        // Speech started - begin capturing
        chunks = []
        segmentStartTime = Date.now()
        isCapturing.value = true

        if (mediaRecorder.state === 'inactive') {
          mediaRecorder.start()
        }
      })

      vad.onSpeechEnd((durationMs) => {
        if (!isFlowMode.value || !mediaRecorder) return

        // Speech ended - stop capturing
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
        }
      })

      isFlowMode.value = true

    } catch (err: any) {
      error.value = err.message || 'Failed to start recording'
      if (onError) {
        onError(error.value)
      }
      throw err
    }
  }

  /**
   * Stop continuous flow recording
   */
  function stopFlow() {
    if (!isFlowMode.value) return

    // Stop any in-progress recording
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
    }

    // Stop VAD
    vad.stopListening()

    // Stop media stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      stream = null
    }

    mediaRecorder = null
    isFlowMode.value = false
    isCapturing.value = false
  }

  /**
   * Manually trigger capture stop (e.g., if user presses button)
   */
  function manualStop() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
    }
  }

  /**
   * Set callback for when a segment is captured
   */
  function onSegmentCapturedCallback(callback: (segment: RecordedSegment) => void) {
    onSegmentCaptured = callback
  }

  /**
   * Set callback for when a segment is uploaded
   */
  function onSegmentUploadedCallback(callback: (segment: RecordedSegment) => void) {
    onSegmentUploaded = callback
  }

  /**
   * Set callback for errors
   */
  function onErrorCallback(callback: (error: string) => void) {
    onError = callback
  }

  /**
   * Update config on the fly
   */
  function updateConfig(newConfig: Partial<ContinuousRecorderConfig>) {
    Object.assign(cfg, newConfig)
    vad.updateConfig(newConfig)
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopFlow()
  })

  return {
    // State
    isFlowMode,
    isCapturing,
    isSpeaking: vad.isSpeaking,
    currentLevel: vad.currentLevel,
    segmentCount,
    lastSegment,
    error,

    // Actions
    startFlow,
    stopFlow,
    manualStop,
    updateConfig,

    // Callbacks
    onSegmentCaptured: onSegmentCapturedCallback,
    onSegmentUploaded: onSegmentUploadedCallback,
    onError: onErrorCallback
  }
}
