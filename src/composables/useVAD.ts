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
  // How many LEGO chunks the phrase now on the autocue is read in. 1 = read
  // straight through, which is every natural-speed phrase, and the default.
  expectedChunks: number
  // Silence tolerated while chunks are still to come (ms). Only ever applies
  // BEFORE the last chunk has been read — see pollAudioLevel.
  interChunkSilenceDuration: number
  // Silence that counts as a chunk boundary rather than a breath (ms).
  chunkPauseDuration: number
}

export interface VADState {
  isListening: boolean
  isSpeaking: boolean
  currentLevel: number
  speechStartTime: number | null
  silenceStartTime: number | null
}

// One deliberate pause inside a take, timed from the start of the take.
//
// The VAD has always SEEN these — that is what chunksSeen counts — but it only
// ever counted them and threw the timings away, so the review screen could
// offer nothing between "play the whole take" and "record the whole phrase
// again". Keeping the two edges is what lets a single LEGO chunk be played, or
// re-recorded, on its own.
//
// `endMs` is null for a pause that is still open when the take closes: the
// final silence, whose start IS the end of the last chunk.
//
// Both edges are measured at poll resolution (pollInterval, 50ms), so each is
// accurate to within one poll and lands slightly INSIDE the silence — which is
// the harmless direction: a chunk cut on these edges keeps every syllable and
// at worst carries a few tens of ms of room tone.
export interface ChunkGap {
  startMs: number
  endMs: number | null
}

// A dip that WAS a pause to the ear but never reached chunkPauseDuration, so it
// was never counted as a boundary.
//
// Nothing acts on these — they change no decision the VAD makes. They exist
// only so the studio can tell a recordist WHY a slow read came up short:
// "three of your pauses were too quick" is a thing a person can fix, whereas
// "2 heard, 3 expected" leaves them guessing whether they paused in the wrong
// places or simply not for long enough. The floor is the aligner's own silence
// minimum (services/voice-engine/align.cjs SILENCE_MIN_MS, 150ms) — below that
// even the server would not see it, so it is not a near miss, it is nothing.
const SHORT_PAUSE_FLOOR_MS = 150

// What the VAD heard in a take beyond the boundaries themselves. Reported with
// the take at onSpeechEnd; purely descriptive.
export interface TakePauseReport {
  // Dips that measured >= SHORT_PAUSE_FLOOR_MS but under chunkPauseDuration.
  shortPauses: number
  // The longest of those, so the studio can say how close they came.
  longestShortPauseMs: number
}

// What a room — and, since 2026-08-19, a VOICE — measured before recording.
// `threshold` is what the VAD will actually use; `quality` is what the
// recordist should be told.
export interface VADCalibration {
  // Time-domain RMS the room idles at (high percentile, not the mean, so one
  // chair creak does not set the floor).
  noiseFloor: number
  // Time-domain RMS this recordist's ordinary speech reaches THROUGH THIS MIC,
  // measured from a spoken phrase. Null when only the room was measured, in
  // which case SPEECH_RMS_REFERENCE stands in for it — see placeThreshold.
  voiceLevel: number | null
  // The silenceThreshold derived from those two and now in force.
  threshold: number
  // Headroom between the floor and the voice, in dB. This is the quantity that
  // decides whether the gate can be placed at all: the gate has to clear the
  // room AND stay well under the voice, and a small gap means it cannot do both.
  headroomDb: number
  quality: 'quiet' | 'ok' | 'loud' | 'too-loud'
  message: string
}

const defaultConfig: VADConfig = {
  silenceThreshold: 0.02,      // time-domain RMS; see pollAudioLevel
  silenceDuration: 800,         // 800ms of silence = end of phrase
  minSpeechDuration: 300,       // At least 300ms of speech to count
  pollInterval: 50,             // Check every 50ms
  expectedChunks: 1,            // read straight through unless told otherwise
  // The mid-phrase pause must not cut AT ALL — not merely cut later.
  //
  // Cutting mid-pause does not just truncate the take, it desynchronises the
  // whole session. The cut fires, the segment uploads, and the studio advances
  // the autocue; the recordist then resumes into what is now the NEXT item's
  // slot, and every take after that is one item out of step. Kai's live console
  // on 2026-08-07 caught it happening: item 2 captured fine, then item 3 was
  // captured moments later as a near-empty phantom (12ms of audible speech
  // after trim) and refused 422 by the server's silent-take guard. The phantom
  // is the tail of a pause the recorder should never have cut in.
  //
  // So this is sized to swallow a deliberate pause whole rather than to be a
  // slightly longer fuse. Measured mid-phrase pauses on Kai's own 72.5s take
  // topped out at 1700ms, and his live pauses cleared 800ms comfortably enough
  // to trigger the cut, so the ceiling is not tightly known — this is set well
  // clear of it deliberately.
  //
  // [OPEN — design intent unconfirmed as of 2026-08-07] Whether slow-cadence
  // audio is supposed to carry baked-in pauses between LEGOs at all is still
  // being decided. Both live answers want a tolerant value here: if the pauses
  // are real, this has to survive them; if the finished take is meant to be
  // continuous and the gap markers are only a reading aid, then a dip is never
  // an ending and should be ignored outright. What DOES change with the answer
  // is the cost — see chunkPauseDuration below.
  interChunkSilenceDuration: 4000,
  // What counts as "that was a chunk boundary" rather than a breath.
  //
  // The error here is deliberately asymmetric. Counting too FEW boundaries
  // costs one long wait at the end of a take — slow, harmless. Counting too
  // MANY re-creates the bug, because the counter reaches expectedChunks while
  // the recordist is still mid-phrase and the next pause cuts at 800ms. So the
  // bar sits well above ordinary breath: on the measured take, 45 of 71
  // internal gaps fall under 400ms, while an inter-LEGO pause is a deliberate
  // one the recordist is being shown a gap marker for.
  //
  // The known cost of the tolerant setting, stated plainly: a slow phrase read
  // STRAIGHT THROUGH never reaches its expected chunk count, so its final
  // silence waits out interChunkSilenceDuration before the take closes. That
  // is unavoidable — at the moment the silence begins, "pausing between LEGOs"
  // and "finished reading" are the same signal, and nothing in the audio can
  // tell them apart. It is also exactly why the open question above matters: if
  // slow takes are meant to be continuous, this whole allowance is dead weight
  // on every slow phrase and the right change is to drop expectedChunks back to
  // 1 for slow cadence in AutocueStudio, not to retune these constants.
  chunkPauseDuration: 400
}

// Calibration constants.
//
// SPEECH_RMS_REFERENCE is what ordinary speech measured on ONE real take
// (2026-08-07, Kai, phone mic): p95 0.23 RMS. Until 2026-08-19 it was the only
// speech level this file knew, and the threshold was placed against the room
// alone. That is the bug Kai found: a microphone is a GAIN STAGE, and the room
// and the voice both move through it together. Swap a phone for a quieter,
// lower-output external mic and the voice can land at 0.05 while the room lands
// at 0.0005 — at which point a threshold pinned to an absolute 0.01 is sitting
// only 14dB under the voice instead of the 21dB it was designed for, ordinary
// mid-phrase dips fall through it, and the take is cut in the middle of a
// phrase. It still stands in when only the room has been measured, but a
// calibration that has heard the recordist prefers what it heard.
const SPEECH_RMS_REFERENCE = 0.23
// Where the gate goes, stated the only way that survives a change of
// microphone: in dB BELOW the recordist's own measured speech. -21dB is what
// the working configuration actually was (0.02 against 0.23), kept.
const GATE_BELOW_VOICE_DB = 21
// ...and in dB ABOVE the measured room, which is the other end of the same
// squeeze. Room tone has to read as silence, so the gate cannot sit on it. 12dB
// is under the +16dB the working configuration had (0.02 against a 0.003 floor)
// and is the minimum that kept room tone silent in the two-condition replay.
const GATE_ABOVE_FLOOR_DB = 12
// When the gap between floor and voice is too small to satisfy both — anything
// under 33dB — neither constraint can win outright, so the gate is placed
// proportionally between them and the recordist is TOLD. Splitting the
// difference is the least-bad placement: it is as far from the room as it is
// from the voice.
const MIN_WORKABLE_GAP_DB = GATE_BELOW_VOICE_DB + GATE_ABOVE_FLOOR_DB
// Absolute sanity clamps, deliberately far wider than the old [0.01, 0.08].
// They exist only to catch a degenerate measurement — a muted mic reading
// digital silence, or a calibration taken while something was blaring — not to
// second-guess a real one. Narrow clamps are what made the old placement fail
// on a low-gain mic, so these must never be the operative number for a mic that
// works.
const MIN_THRESHOLD = 0.0006
const MAX_THRESHOLD = 0.08

/**
 * Place the silence gate between a measured room and a measured voice.
 *
 * Everything is done in dB because that is the unit a gain change is a constant
 * offset in: turn the mic up 12dB and floor, voice and gate all move 12dB
 * together, and the VAD behaves identically. That property is the whole fix.
 */
export function placeThreshold(noiseFloor: number, voiceLevel: number | null): {
  threshold: number
  headroomDb: number
  quality: VADCalibration['quality']
  message: string
} {
  const voice = voiceLevel && voiceLevel > 0 ? voiceLevel : SPEECH_RMS_REFERENCE
  const db = (x: number) => 20 * Math.log10(x)
  const headroomDb = noiseFloor > 0 ? db(voice) - db(noiseFloor) : Infinity

  let thresholdDb: number
  if (!(noiseFloor > 0)) {
    // Nothing measurable in the room at all — usually a muted or virtual input.
    // Place off the voice alone and let the clamp catch a nonsense voice level.
    thresholdDb = db(voice) - GATE_BELOW_VOICE_DB
  } else if (headroomDb >= MIN_WORKABLE_GAP_DB) {
    // Room for both constraints. Sit under the voice, which is the edge that
    // decides whether a phrase gets cut in half.
    thresholdDb = db(voice) - GATE_BELOW_VOICE_DB
  } else {
    // Squeezed. Split the gap proportionally rather than favouring one failure
    // mode over the other.
    const share = GATE_ABOVE_FLOOR_DB / MIN_WORKABLE_GAP_DB
    thresholdDb = db(noiseFloor) + headroomDb * share
  }

  const threshold = Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, Math.pow(10, thresholdDb / 20)))

  // Bands are set on the floor-to-voice gap, which is the quantity that decides
  // whether the gate can be placed properly at all. The boundaries are where
  // measured behaviour changes: at 33dB both constraints are exactly satisfied;
  // below ~20dB the gate is inside the noise and takes start running together.
  let quality: VADCalibration['quality']
  let message: string
  if (headroomDb < 20) {
    quality = 'too-loud'
    message = 'Your mic is picking up a lot of room noise — there is not enough difference between your voice and the background to tell them apart, so phrases will run together or get cut in half. Turn off fans, air-con or anything humming, move closer to the mic or away from the window, or use a headset, then check again.'
  } else if (headroomDb < MIN_WORKABLE_GAP_DB) {
    quality = 'loud'
    message = 'There is a fair amount of background noise. It should still work, but move a little closer to the mic and leave a clear beat of silence between phrases.'
  } else if (headroomDb < 45) {
    quality = 'ok'
    message = 'Your mic sounds good.'
  } else {
    quality = 'quiet'
    message = 'Your mic sounds excellent — nice and quiet.'
  }

  return { threshold, headroomDb, quality, message }
}

export function useVAD(config: Partial<VADConfig> = {}) {
  const cfg = { ...defaultConfig, ...config }

  // State
  const isListening = ref(false)
  const isSpeaking = ref(false)
  const currentLevel = ref(0)
  const speechStartTime = ref<number | null>(null)
  const silenceStartTime = ref<number | null>(null)
  const isCalibrating = ref(false)
  const calibration = ref<VADCalibration | null>(null)
  // Chunks completed inside the take currently being captured. Decides which
  // silence tolerance is in force; see pollAudioLevel.
  const chunksSeen = ref(0)
  // Whether the CURRENT run of silence has already been counted as a chunk
  // boundary, so one long pause increments the counter once, not every poll.
  let silenceCounted = false
  // Where those boundaries fell, in ms from the start of the current take. Same
  // events that drive chunksSeen, kept rather than discarded.
  let chunkGaps: ChunkGap[] = []

  // ── Live pause signal, for the recordist's eyes only ───────────────────────
  //
  // How long the silence now in progress has lasted, in ms, 0 when speaking.
  // Read off the SAME poll that decides whether the pause counts, so a studio
  // watching it is watching the actual decision rather than a re-timing of it.
  //
  // Until this existed the recordist got no signal at all while reading: the
  // first they knew of a pause landing (or not) was the review screen after the
  // whole session. That is what made slow reading unlearnable by doing.
  const silenceMs = ref(0)
  // Near-miss pauses in the take being captured — see SHORT_PAUSE_FLOOR_MS.
  const shortPauses = ref(0)
  const longestShortPauseMs = ref(0)

  // Audio nodes
  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let stream: MediaStream | null = null
  let pollInterval: number | null = null

  // Callbacks
  let onSpeechStart: (() => void) | null = null
  let onSpeechEnd: ((durationMs: number, chunkGaps: ChunkGap[], pauses: TakePauseReport) => void) | null = null
  let onSpeechAborted: ((durationMs: number) => void) | null = null
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
    isCalibrating.value = false
    calibrationSamples = []
    chunksSeen.value = 0
    silenceCounted = false
    silenceMs.value = 0
    chunkGaps = []
    shortPauses.value = 0
    longestShortPauseMs.value = 0
  }

  let calibrationSamples: number[] = []
  // The room measurement most recently taken on this stream, kept so a voice
  // measurement can be combined with it without re-listening to the room.
  const measuredFloor = ref<number | null>(null)

  /** Collect polled RMS for `durationMs` with the speech state machine held off. */
  async function collect(durationMs: number): Promise<number[]> {
    if (!analyser) throw new Error('calibration needs startListening() first')
    calibrationSamples = []
    isCalibrating.value = true
    await new Promise(resolve => setTimeout(resolve, durationMs))
    isCalibrating.value = false
    const samples = calibrationSamples.slice().sort((a, b) => a - b)
    calibrationSamples = []
    return samples
  }

  const pct = (sorted: number[], p: number) =>
    sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : 0

  /**
   * Listen to the room before recording starts and set silenceThreshold from
   * what is actually there, rather than from a constant that assumes a studio.
   *
   * A fixed threshold cannot serve both a treated room and a kitchen with a
   * fridge in it. Too low and the VAD never sees silence — it never ends a
   * phrase, the UI sits on "Speaking..." forever and the whole read lands as
   * one blob (the 2026-08-07 failure). Too high and it never hears the
   * recordist at all. Measuring the room removes the guess, and the returned
   * quality lets the studio warn BEFORE a session is lost rather than after.
   *
   * The room ALONE is not enough — see SPEECH_RMS_REFERENCE. This still works
   * on its own, and is what the studio falls back to when nobody has spoken a
   * calibration phrase, but a placement that has also heard the voice
   * (measureVoice, below) is the one that survives a change of microphone.
   *
   * Caller must have startListening()'d first. Returns the calibration and
   * leaves it on `calibration`.
   */
  async function calibrate(durationMs = 1500): Promise<VADCalibration> {
    // p90, not the mean: one chair creak or a passing car should not set the
    // room's floor, but a floor under the genuinely noisy moments would let
    // those moments read as speech.
    const noiseFloor = pct(await collect(durationMs), 0.9)
    measuredFloor.value = noiseFloor
    return applyCalibration(noiseFloor, calibration.value?.voiceLevel ?? null)
  }

  /**
   * Listen to the recordist saying one short phrase, and set the threshold from
   * the GAP between that and the room rather than from the room alone.
   *
   * p75 of the polled RMS, not p95: the useful speech level is what an ordinary
   * syllable reaches, not what the loudest vowel peak reaches. A gate placed
   * under the peaks is a gate sitting on top of the quiet syllables, which is
   * exactly how a phrase gets cut in half. p75 over a short phrase — which is
   * mostly voiced, with the leading and trailing silence trimmed off by the
   * floor test below — lands near the body of the speech.
   *
   * Caller must have startListening()'d and, normally, calibrate()'d first.
   */
  async function measureVoice(durationMs = 3000): Promise<VADCalibration> {
    const samples = await collect(durationMs)
    // Drop everything at or under the room: the recordist does not start
    // talking the instant the prompt appears, and that silence would drag the
    // percentile down.
    const floor = measuredFloor.value ?? 0
    const voiced = samples.filter(v => v > Math.max(floor * 2, 0.002))
    const voiceLevel = voiced.length >= 5 ? pct(voiced, 0.75) : 0
    return applyCalibration(floor, voiceLevel > 0 ? voiceLevel : null)
  }

  /**
   * Put a placement in force — from a fresh measurement, or from one restored
   * off a stored per-device profile so a returning recordist is not made to
   * re-do it. Same arithmetic either way; there is only one placement rule.
   */
  function applyCalibration(noiseFloor: number, voiceLevel: number | null): VADCalibration {
    const placed = placeThreshold(noiseFloor, voiceLevel)
    cfg.silenceThreshold = placed.threshold
    measuredFloor.value = noiseFloor
    calibration.value = { noiseFloor, voiceLevel, ...placed }
    return calibration.value
  }

  /**
   * Throw the measurement away and go back to the fixed default. This is the
   * escape hatch the whole feature hangs on: calibration must never be a wall,
   * so a recordist who skips it, or whose mic check fails, records on exactly
   * today's behaviour rather than on nothing.
   */
  function useFixedThreshold() {
    cfg.silenceThreshold = defaultConfig.silenceThreshold
    measuredFloor.value = null
    calibration.value = null
  }

  /**
   * Poll audio level and detect speech/silence transitions
   */
  function pollAudioLevel() {
    if (!analyser) return

    // Signal level as a TIME-DOMAIN RMS of the waveform, which is the unit
    // silenceThreshold (0.02) was written for.
    //
    // This used to read getByteFrequencyData, and that made the VAD unable to
    // see silence at all. getByteFrequencyData does not return magnitudes; it
    // returns each bin's power mapped from [minDecibels, maxDecibels] —
    // defaults -100dB..-30dB — onto 0..255. Room tone at a perfectly ordinary
    // -70dBFS lands around byte 109, i.e. a "level" of 0.43, twenty times over
    // the threshold. For that reading to fall under 0.02 every bin has to sit
    // below about -98.6dBFS: digital silence, a muted mic. So on any live mic
    // the level was permanently above threshold, onSpeechEnd never fired, and
    // useContinuousRecorder never cut the take — a whole read landed as ONE
    // blob. (2026-08-07: Kai's session arrived as a single 72.5s upload holding
    // ~24 separate utterances. Replaying that exact take through this state
    // machine: 0 cuts, minimum level 0.0250 across all 1450 polls, never once
    // below 0.02. The same take on the time-domain RMS below cuts 14 segments,
    // and its own room tone measures p50 0.0030 against p95 0.227 for speech —
    // ~37dB of separation, with 0.02 sitting cleanly between them.)
    const dataArray = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(dataArray)

    // Calculate RMS energy (0-1)
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i]
    }
    const rms = Math.sqrt(sum / dataArray.length)
    currentLevel.value = rms

    if (onLevelChange) {
      onLevelChange(rms)
    }

    // While calibrating we are deliberately measuring an empty room, so the
    // speech state machine must not run — otherwise the room's own tone starts
    // a phantom "phrase" that the first real word then appears to continue.
    if (isCalibrating.value) {
      calibrationSamples.push(rms)
      return
    }

    const now = Date.now()
    const isAboveThreshold = rms > cfg.silenceThreshold

    if (isAboveThreshold) {
      // Sound detected. Before clearing the run of silence, measure it: a dip
      // that ends here without ever having been counted as a boundary is a
      // pause the recordist made and the recorder did not keep — the single
      // most useful thing we can tell them about a slow read that came up
      // short. It is tallied on RESUME rather than during the silence, because
      // only resuming proves the dip ended below the boundary length.
      if (isSpeaking.value && silenceStartTime.value && !silenceCounted) {
        const dipMs = now - silenceStartTime.value
        if (dipMs >= SHORT_PAUSE_FLOOR_MS) {
          shortPauses.value++
          if (dipMs > longestShortPauseMs.value) longestShortPauseMs.value = dipMs
        }
      }
      silenceStartTime.value = null
      silenceCounted = false
      silenceMs.value = 0

      if (!isSpeaking.value) {
        // Speech just started
        isSpeaking.value = true
        speechStartTime.value = now
        chunksSeen.value = 0
        chunkGaps = []
        shortPauses.value = 0
        longestShortPauseMs.value = 0
        if (onSpeechStart) {
          onSpeechStart()
        }
      } else {
        // Speech RESUMED. If the pause we just came out of was long enough to
        // have been counted as a chunk boundary, this is where the next chunk
        // begins — close the gap off.
        const open = chunkGaps[chunkGaps.length - 1]
        if (open && open.endMs === null && speechStartTime.value) {
          open.endMs = now - speechStartTime.value
        }
      }
    } else {
      // Silence detected
      if (isSpeaking.value) {
        // We were speaking, now silent
        if (!silenceStartTime.value) {
          silenceStartTime.value = now
          silenceCounted = false
          silenceMs.value = 0
        } else {
          const silenceElapsed = now - silenceStartTime.value
          // Published every poll so the studio can draw the pause as it grows.
          silenceMs.value = silenceElapsed

          // A pause long enough to be deliberate closes off a chunk. The slow
          // pass DRAWS a gap marker between LEGO chunks, so a pause mid-phrase
          // is the studio's own instruction being followed — not the end of
          // the take.
          if (!silenceCounted && silenceElapsed >= cfg.chunkPauseDuration) {
            silenceCounted = true
            chunksSeen.value++
            if (speechStartTime.value) {
              chunkGaps.push({
                startMs: silenceStartTime.value - speechStartTime.value,
                endMs: null
              })
            }
          }

          // While chunks are still outstanding, tolerate a long pause; once the
          // last chunk has been read, go back to cutting promptly.
          //
          // This is the whole fix for the 2026-08-07 interaction bug: the flat
          // 800ms cut a slow take at the FIRST gap marker, so the pause the UI
          // asked for was the pause the recorder could not survive. Simply
          // raising the flat value is not available — measured on Kai's own
          // 72.5s take, the gap he leaves BETWEEN phrases runs as short as
          // 600ms, so a flat 2500ms would merge phrase after phrase into one
          // blob, which is the failure this VAD was just fixed for, arriving
          // from the other side. Spending the long tolerance only mid-phrase
          // buys the pause without paying for it at the phrase boundary, where
          // the cut still happens at the snappy 800ms.
          const stillToCome = chunksSeen.value < cfg.expectedChunks
          const effectiveSilence = stillToCome
            ? cfg.interChunkSilenceDuration
            : cfg.silenceDuration

          if (silenceElapsed >= effectiveSilence) {
            // Silence has persisted long enough - speech ended
            const speechDuration = speechStartTime.value
              ? now - speechStartTime.value - effectiveSilence
              : 0

            if (speechDuration >= cfg.minSpeechDuration) {
              // Valid speech segment. The gaps go WITH it: whoever is holding
              // the audio is the only one who can act on them, and this is the
              // last moment they exist.
              if (onSpeechEnd) {
                onSpeechEnd(speechDuration, chunkGaps.map(g => ({ ...g })), {
                  shortPauses: shortPauses.value,
                  longestShortPauseMs: longestShortPauseMs.value
                })
              }
            } else if (onSpeechAborted) {
              // Too short to be a take — a cough, a chair, a door. The VAD is
              // done with it, but whoever acted on onSpeechStart is NOT: the
              // recorder opened a capture and, without this, was left holding
              // it open indefinitely. The next Stop then closed that stale
              // capture and shipped a minutes-long near-silence as a take,
              // which the server's silent-take guard refused 422 — the
              // unexplained "1 failed" on an otherwise clean session.
              onSpeechAborted(speechDuration)
            }

            // Reset state
            isSpeaking.value = false
            speechStartTime.value = null
            silenceStartTime.value = null
            silenceCounted = false
            silenceMs.value = 0
            chunksSeen.value = 0
            chunkGaps = []
            shortPauses.value = 0
            longestShortPauseMs.value = 0
          }
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
  function onSpeechEndCallback(callback: (durationMs: number, chunkGaps: ChunkGap[], pauses: TakePauseReport) => void) {
    onSpeechEnd = callback
  }

  /**
   * Set callback for a speech run that ended too short to count as a take, so
   * the capture opened at onSpeechStart can be abandoned rather than left open.
   */
  function onSpeechAbortedCallback(callback: (durationMs: number) => void) {
    onSpeechAborted = callback
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
    isCalibrating,
    calibration,
    chunksSeen,
    // Live, read-only, for the studio's chunk indicator. Nothing here feeds a
    // decision — see silenceMs / SHORT_PAUSE_FLOOR_MS.
    silenceMs,
    shortPauses,
    longestShortPauseMs,
    // The two constants the recordist is being asked to hit, published so the
    // UI can DRAW the window instead of leaving it a secret. Reading them off
    // the live config means the picture cannot drift from the behaviour.
    chunkPauseMs: () => cfg.chunkPauseDuration,
    shortPauseFloorMs: SHORT_PAUSE_FLOOR_MS,
    // The gate actually in force, read live off the config so a UI drawing it
    // against the level meter cannot drift from the decision being made.
    silenceThresholdNow: () => cfg.silenceThreshold,

    // Actions
    startListening,
    stopListening,
    calibrate,
    measureVoice,
    applyCalibration,
    useFixedThreshold,
    updateConfig,

    // Callbacks
    onSpeechStart: onSpeechStartCallback,
    onSpeechEnd: onSpeechEndCallback,
    onSpeechAborted: onSpeechAbortedCallback,
    onLevelChange: onLevelChangeCallback
  }
}
