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
import { useVAD, type VADConfig, type ChunkGap, type TakePauseReport } from './useVAD'

export interface ContinuousRecorderConfig extends Partial<VADConfig> {
  // Auto-upload after capturing segment
  autoUpload: boolean
  // Auto-advance to next phrase after upload
  autoAdvance: boolean
  // Listen to the room for this long before going live, and set the silence
  // threshold from what is measured. 0 disables it and keeps the fixed default.
  calibrationMs: number
}

export interface RecordedSegment {
  blob: Blob
  durationMs: number
  timestamp: number
  // The deliberate pauses heard INSIDE this take, timed from its start — the
  // LEGO-chunk boundaries of a slow pass. Empty for a phrase read straight
  // through, which is every natural-speed take.
  chunkGaps: ChunkGap[]
  // What else the VAD heard about the pauses in this take — near misses that
  // never reached boundary length. Descriptive only; it is not uploaded and it
  // changes nothing about the audio. The studio uses it to tell the recordist
  // whether a short slow read was "you did not pause there" or "you paused, but
  // too briefly for it to count".
  pauses: TakePauseReport
}

const defaultConfig: ContinuousRecorderConfig = {
  silenceThreshold: 0.02,
  silenceDuration: 800,
  minSpeechDuration: 300,
  pollInterval: 50,
  expectedChunks: 1,
  interChunkSilenceDuration: 4000,
  chunkPauseDuration: 400,
  autoUpload: true,
  autoAdvance: true,
  calibrationMs: 1500
}

export function useContinuousRecorder(config: Partial<ContinuousRecorderConfig> = {}) {
  const cfg = { ...defaultConfig, ...config }

  // VAD for speech detection
  const vad = useVAD({
    silenceThreshold: cfg.silenceThreshold,
    silenceDuration: cfg.silenceDuration,
    minSpeechDuration: cfg.minSpeechDuration,
    pollInterval: cfg.pollInterval,
    expectedChunks: cfg.expectedChunks,
    interChunkSilenceDuration: cfg.interChunkSilenceDuration,
    chunkPauseDuration: cfg.chunkPauseDuration
  })

  // State
  const isFlowMode = ref(false)
  const isCapturing = ref(false)
  const segmentCount = ref(0)
  const lastSegment = ref<RecordedSegment | null>(null)
  const error = ref<string | null>(null)
  // Reactive mirror of cfg.expectedChunks. cfg is a plain object, so a computed
  // over it would never re-evaluate — the studio's chunk indicator needs to
  // repaint when the autocue advances to a phrase with a different chunk count.
  const expectedChunks = ref(cfg.expectedChunks)

  // Audio capture
  let mediaRecorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let chunks: Blob[] = []
  let segmentStartTime: number | null = null
  let activeMimeType = 'audio/webm'
  let wakeLock: any = null
  // Set just before a stop that must NOT produce a segment — see onstop.
  let discardCapture = false
  // Gaps the VAD reported for the take now closing. MediaRecorder.stop() is
  // asynchronous — onstop fires after the last dataavailable — so they are
  // parked here between onSpeechEnd and the blob being assembled.
  let pendingChunkGaps: ChunkGap[] = []
  // Same parking problem as pendingChunkGaps — see above.
  let pendingPauses: TakePauseReport = { shortPauses: 0, longestShortPauseMs: 0 }

  // iOS Safari records audio/mp4 (AAC), not webm/opus — pick the first
  // supported container; the server transcodes whatever arrives (the upload
  // handler maps the blob's mimeType to ffmpeg's input format).
  function pickMimeType(): string | undefined {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
    for (const c of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c)) return c
    }
    return undefined // let the browser choose its default
  }

  // Phones lock their screen fast, which suspends capture mid-session.
  // Best-effort screen wake lock while a flow session is live.
  async function acquireWakeLock() {
    try {
      wakeLock = await (navigator as any).wakeLock?.request('screen')
    } catch { /* unsupported or denied — recording still works while awake */ }
  }
  function releaseWakeLock() {
    try { wakeLock?.release() } catch { /* already released */ }
    wakeLock = null
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && isFlowMode.value) acquireWakeLock()
    })
  }

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

      // Measure the room BEFORE going live and set the silence threshold from
      // it. A threshold that does not clear this room's noise floor never ends
      // a phrase: the studio sits on "Speaking..." and the whole read arrives
      // as one blob. Doing it here, rather than leaving a constant to be right
      // everywhere, also gives the studio something to warn the recordist with
      // while the session can still be saved.
      if (cfg.calibrationMs > 0) {
        await vad.calibrate(cfg.calibrationMs)
      }

      // Set up MediaRecorder with the first container this browser supports
      const mimeType = pickMimeType()
      mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      activeMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm'
      acquireWakeLock()

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        // A capture the VAD disowned (too short to be speech) or one cut short
        // by Stop before it was a take is thrown away here rather than shipped.
        // Uploading it costs a slot, a round trip and a 422, and surfaces to the
        // recordist as an unexplained failed take.
        if (discardCapture) {
          discardCapture = false
          chunks = []
          segmentStartTime = null
          pendingChunkGaps = []
          pendingPauses = { shortPauses: 0, longestShortPauseMs: 0 }
          isCapturing.value = false
          return
        }

        if (chunks.length > 0 && segmentStartTime) {
          const blob = new Blob(chunks, { type: activeMimeType })
          const durationMs = Date.now() - segmentStartTime

          const segment: RecordedSegment = {
            blob,
            durationMs,
            timestamp: segmentStartTime,
            chunkGaps: pendingChunkGaps,
            pauses: pendingPauses
          }

          lastSegment.value = segment
          segmentCount.value++

          if (onSegmentCaptured) {
            onSegmentCaptured(segment)
          }
        }

        chunks = []
        segmentStartTime = null
        pendingChunkGaps = []
        pendingPauses = { shortPauses: 0, longestShortPauseMs: 0 }
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
        pendingChunkGaps = []
        pendingPauses = { shortPauses: 0, longestShortPauseMs: 0 }
        isCapturing.value = true

        if (mediaRecorder.state === 'inactive') {
          mediaRecorder.start()
        }
      })

      vad.onSpeechEnd((durationMs, chunkGaps, pauses) => {
        if (!isFlowMode.value || !mediaRecorder) return

        // Carry the chunk boundaries into the blob this stop produces.
        pendingChunkGaps = chunkGaps || []
        pendingPauses = pauses || { shortPauses: 0, longestShortPauseMs: 0 }

        // Speech ended - stop capturing
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
        }
      })

      // The burst was too short to be a take. Close the capture it opened and
      // drop it — otherwise this recorder stays 'recording' with a stale
      // segmentStartTime until something else stops it, and that something is
      // usually the recordist pressing Stop at the end of the session.
      vad.onSpeechAborted(() => {
        if (!mediaRecorder) return
        if (mediaRecorder.state === 'recording') {
          discardCapture = true
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

    // Stop any in-progress recording. A capture that has not yet run long
    // enough to be speech is a tail, not a take — Stop pressed a moment after
    // the last phrase catches the breath after it, and shipping that produces
    // a phantom failed item on an otherwise clean session.
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      const openMs = segmentStartTime ? Date.now() - segmentStartTime : 0
      discardCapture = openMs < cfg.minSpeechDuration
      mediaRecorder.stop()
    }

    // Stop VAD
    vad.stopListening()

    // Stop media stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      stream = null
    }

    releaseWakeLock()
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
    // Keep the reactive mirror honest whichever door the value came in by.
    expectedChunks.value = cfg.expectedChunks
    vad.updateConfig(newConfig)
  }

  /**
   * Tell the recorder how many LEGO chunks the phrase now on the autocue is
   * read in, so it tolerates the pauses the autocue is drawing gap markers for.
   *
   * Narrow on purpose: it touches expectedChunks and NOTHING else. Pushing a
   * wider config object through here would overwrite silenceThreshold with the
   * constant default and throw away the room calibration measured at startFlow.
   */
  function setExpectedChunks(count: number) {
    const n = Number.isFinite(count) && count >= 1 ? Math.floor(count) : 1
    cfg.expectedChunks = n
    expectedChunks.value = n
    vad.updateConfig({ expectedChunks: n })
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
    isCalibrating: vad.isCalibrating,
    calibration: vad.calibration,
    // The live pause signals, passed straight through. useVAD has always
    // counted chunksSeen; this recorder simply never re-exported it, so the
    // studio had nothing to draw a live chunk indicator from and the recordist
    // learned nothing until the session was over.
    chunksSeen: vad.chunksSeen,
    silenceMs: vad.silenceMs,
    shortPauses: vad.shortPauses,
    chunkPauseMs: vad.chunkPauseMs,
    shortPauseFloorMs: vad.shortPauseFloorMs,
    expectedChunks,
    segmentCount,
    lastSegment,
    error,

    // Actions
    startFlow,
    stopFlow,
    manualStop,
    updateConfig,
    setExpectedChunks,

    // Callbacks
    onSegmentCaptured: onSegmentCapturedCallback,
    onSegmentUploaded: onSegmentUploadedCallback,
    onError: onErrorCallback
  }
}
