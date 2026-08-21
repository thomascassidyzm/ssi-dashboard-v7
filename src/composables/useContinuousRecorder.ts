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
  // Length of the BLOB, pre-roll and run-on included — not of the speech.
  durationMs: number
  timestamp: number
  // Audio held ahead of the first word. Every VAD timestamp in this segment is
  // already shifted by it, so chunkGaps line up with the blob.
  preRollMs: number
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

  // Audio capture. A recorder is ALWAYS running while the mic is open — see
  // the pre-roll note above spawnRecorder.
  type Capture = { rec: MediaRecorder, chunks: Blob[], startedAt: number, harvested?: Promise<Blob | null> }
  let active: Capture | null = null
  let retiring: Capture[] = []
  let stream: MediaStream | null = null
  let segmentStartTime: number | null = null
  // How much audio the active recorder already held when the VAD called speech.
  // This is the lead-in in front of the first word, and it is also the offset
  // every VAD timestamp has to be shifted by to line up with the blob.
  let preRollMs = 0
  let activeMimeType = 'audio/webm'
  let wakeLock: any = null
  let rolloverTimer: any = null
  // Gaps the VAD reported for the take now closing. MediaRecorder.stop() is
  // asynchronous — onstop fires after the last dataavailable — so they are
  // parked here between onSpeechEnd and the blob being assembled.
  let pendingChunkGaps: ChunkGap[] = []
  // Same parking problem as pendingChunkGaps — see above.
  let pendingPauses: TakePauseReport = { shortPauses: 0, longestShortPauseMs: 0, endedWhileLoud: false, dropAtCutDb: 99 }

  // THE CAPTURE BOUNDARY NEVER CUTS THE UTTERANCE (Tom's ruling, 2026-08-21).
  //
  // This surface used to start the encoder INSIDE vad.onSpeechStart, so the
  // recorder only began once the VAD had already heard speech. Measured across
  // 101 archived script-path takes: median head margin 0 ms, and not one take
  // had even 100 ms of room tone before the word — 42 of them opened at full
  // vowel level, i.e. inside a syllable already in progress. Three lags stacked
  // up in front of every one of them: the VAD's own trip point (-34 dBFS,
  // discarding 35 ms median and 120 ms p90 of the onset climbing under it), the
  // 50 ms poll interval, and MediaRecorder's spin-up, which does not begin
  // capturing when start() returns. Nothing said in that window reached any
  // file, including the raw archive. The clean control was the pod surface on
  // the same day through the same upload route: 1530 ms of lead-in, 0/19
  // clipped. The two paths did not overlap at a single take.
  // Full measurement: docs/recording/clip-forensics-2026-08-21.md.
  //
  // So the recorder runs from the moment the mic opens and the VAD no longer
  // decides when capture BEGINS — only where the take is cut, and the cut is
  // always made outside the speech:
  //
  //   * A recorder is live from startFlow, before the first phrase is on
  //     screen. The encoder's spin-up happens in dead air.
  //   * At a take boundary the replacement is started BEFORE the outgoing one
  //     is stopped. Two recorders overlap on one stream, so the stream is never
  //     unobserved, and that overlap IS the next take's pre-roll.
  //   * The outgoing recorder runs on for TAIL_RUNON_MS past the VAD's
  //     end-of-speech, on top of the silenceDuration the VAD already waited
  //     through, so a take can never end on the last syllable.
  //   * While the recordist reads ahead in silence, the pre-roll is rolled over
  //     rather than growing without bound — a fresh recorder is started and the
  //     stale one dropped only after a full overlap, so a long pause does not
  //     ship a long clip.
  //
  // Nothing here trims or discards on level. Every boundary decision belongs to
  // the server's processing step, where the raw original is archived first and
  // a trim is therefore reversible (services/audio-processor.cjs).

  // How long the outgoing recorder keeps running past end-of-speech. Matches
  // the pod recorder's tail so both surfaces have one shape, not two.
  const TAIL_RUNON_MS = 900
  // Guaranteed overlap before a replaced recorder is dropped — also the floor
  // on how much pre-roll any take has.
  const PRE_ROLL_MIN_MS = 800
  // Once the live recorder holds this much with nothing said yet, roll it over.
  const PRE_ROLL_MAX_MS = 3000

  function nowMs() { return Date.now() }

  // Construct and start a recorder on the live stream. Its chunks accumulate on
  // its own entry, so a recorder running out its tail can never mix its audio
  // with the one that replaced it.
  function spawnRecorder(): Capture | null {
    if (!stream) return null
    const mimeType = pickMimeType()
    const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    activeMimeType = rec.mimeType || mimeType || 'audio/webm'
    const entry: Capture = { rec, chunks: [], startedAt: nowMs() }
    rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) entry.chunks.push(e.data) }
    try { rec.start() } catch { return null }
    return entry
  }

  // Stop a recorder and resolve the blob it captured (null if it captured
  // nothing). Memoised, and it never throws: a dead recorder must not take the
  // session with it.
  function harvest(entry: Capture | null): Promise<Blob | null> {
    if (!entry) return Promise.resolve(null)
    if (entry.harvested) return entry.harvested
    const p = new Promise<Blob | null>((resolve) => {
      const assemble = () => {
        const type = (entry.chunks[0] && entry.chunks[0].type) || activeMimeType
        resolve(entry.chunks.length ? new Blob(entry.chunks, { type }) : null)
      }
      if (entry.rec.state === 'inactive') { assemble(); return }
      entry.rec.onstop = assemble
      try { entry.rec.stop() } catch { resolve(null) }
    })
    entry.harvested = p
    retiring = retiring.filter(e => e !== entry)
    return p
  }

  // Emit the take a retiring recorder was holding.
  //
  // The blob now carries the pre-roll in front of the first word and the
  // run-on behind the last, so durationMs is the length of the BLOB, and
  // every VAD timestamp inside it is shifted by the pre-roll to match. A
  // chunk gap the VAD timed at 400 ms into the speech is 400 + preRoll into
  // the audio; leaving that unshifted would draw the slow-pass chunk
  // boundaries in the wrong place on the review card.
  function emitTake(entry: Capture | null, leadMs: number, gaps: ChunkGap[], pauses: TakePauseReport, speechStartedAt: number) {
    harvest(entry).then((blob) => {
      isCapturing.value = false
      if (!blob || !entry) return

      const segment: RecordedSegment = {
        blob,
        durationMs: nowMs() - entry.startedAt,
        timestamp: speechStartedAt,
        preRollMs: leadMs,
        chunkGaps: gaps.map(g => ({
          startMs: g.startMs + leadMs,
          endMs: g.endMs === null ? null : g.endMs + leadMs
        })),
        pauses
      }

      lastSegment.value = segment
      segmentCount.value++
      if (onSegmentCaptured) onSegmentCaptured(segment)
    })
  }

  // Hand over to a fresh recorder and return the one that was active, still
  // running. The new one is live BEFORE the old one is touched.
  function handOver(): Capture | null {
    const outgoing = active
    active = spawnRecorder()
    if (outgoing) retiring.push(outgoing)
    return outgoing
  }

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
      // DSP OFF, deliberately — the same request the pod recorder makes.
      // Browser noiseSuppression gates exactly the quiet onset consonants the
      // VAD then fails to hear, so the two defects compounded: the mic pushed
      // /s/, /f/, /h/ and nasals further under the trip point and the recorder
      // started after it. Capture the dry voice and let the server be the only
      // processing stage.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
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

      acquireWakeLock()

      // Capture starts HERE, before the first phrase is on screen. From this
      // moment the stream is continuously observed.
      active = spawnRecorder()

      // Roll the pre-roll over while nothing is being said, so a recordist who
      // reads ahead for twenty seconds does not ship a twenty-second clip. The
      // stale recorder is dropped only after a full overlap, so everything it
      // held is also held by the one that replaced it.
      rolloverTimer = setInterval(() => {
        if (!isFlowMode.value || isCapturing.value || !active) return
        if (nowMs() - active.startedAt <= PRE_ROLL_MAX_MS) return
        const stale = handOver()
        setTimeout(() => { harvest(stale) }, PRE_ROLL_MIN_MS)
      }, 500)

      // Wire up VAD callbacks
      vad.onSpeechStart(() => {
        if (!isFlowMode.value) return
        // The recorder is already running and has been since before this phrase
        // was on screen. Nothing is started here — this only marks where the
        // speech sits inside audio we already have.
        if (!active) active = spawnRecorder()
        segmentStartTime = nowMs()
        preRollMs = active ? Math.max(0, segmentStartTime - active.startedAt) : 0
        pendingChunkGaps = []
        pendingPauses = { shortPauses: 0, longestShortPauseMs: 0, endedWhileLoud: false, dropAtCutDb: 99 }
        isCapturing.value = true
      })

      vad.onSpeechEnd((_durationMs, chunkGaps, pauses) => {
        if (!isFlowMode.value || !isCapturing.value) return

        pendingChunkGaps = chunkGaps || []
        pendingPauses = pauses || { shortPauses: 0, longestShortPauseMs: 0, endedWhileLoud: false, dropAtCutDb: 99 }

        // Hand over FIRST — the replacement is live before the outgoing one is
        // touched, and its head start is the next phrase's pre-roll — then let
        // the outgoing recorder run on before harvesting it.
        const outgoing = handOver()
        const lead = preRollMs
        const gaps = pendingChunkGaps
        const pausesNow = pendingPauses
        const startedAt = segmentStartTime || nowMs()
        segmentStartTime = null
        setTimeout(() => emitTake(outgoing, lead, gaps, pausesNow, startedAt), TAIL_RUNON_MS)
      })

      // The burst was too short to be a take. Roll over and drop what it held,
      // rather than shipping a take the recordist never made — uploading it
      // costs a slot, a round trip and a 422, and surfaces as an unexplained
      // failed take. The roll-over still leaves the stream observed throughout.
      vad.onSpeechAborted(() => {
        if (!isFlowMode.value) return
        const stale = handOver()
        segmentStartTime = null
        isCapturing.value = false
        setTimeout(() => { harvest(stale) }, PRE_ROLL_MIN_MS)
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

    if (rolloverTimer) { clearInterval(rolloverTimer); rolloverTimer = null }

    // Close the live recorder. A capture that has not yet run long enough to be
    // speech is a tail, not a take — Stop pressed a moment after the last
    // phrase catches the breath after it, and shipping that produces a phantom
    // failed item on an otherwise clean session.
    const openMs = segmentStartTime ? Date.now() - segmentStartTime : 0
    const live = active
    active = null
    const pending: Promise<any>[] = retiring.map(e => harvest(e))
    if (segmentStartTime && openMs >= cfg.minSpeechDuration) {
      emitTake(live, preRollMs, pendingChunkGaps, pendingPauses, segmentStartTime)
      pending.push(harvest(live))
    } else {
      pending.push(harvest(live))
    }
    segmentStartTime = null

    // Stop VAD
    vad.stopListening()

    // Release the mic only once every recorder has produced its blob — pulling
    // the tracks out from under a stop() in flight truncates that take.
    const dying = stream
    stream = null
    Promise.all(pending).catch(() => {}).then(() => {
      if (dying) dying.getTracks().forEach(track => track.stop())
    })

    releaseWakeLock()
    isFlowMode.value = false
    isCapturing.value = false
  }

  /**
   * Manually trigger capture stop (e.g., if user presses button)
   */
  function manualStop() {
    if (!isCapturing.value || !segmentStartTime) return
    const outgoing = handOver()
    const lead = preRollMs
    const gaps = pendingChunkGaps
    const pausesNow = pendingPauses
    const startedAt = segmentStartTime
    segmentStartTime = null
    emitTake(outgoing, lead, gaps, pausesNow, startedAt)
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
