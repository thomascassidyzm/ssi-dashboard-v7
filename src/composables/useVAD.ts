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
  // TRUE when the take was ended while the signal was still close to this
  // speaker's own speech level — i.e. we probably cut them off mid-phrase.
  //
  // This is the signal that was missing on 2026-08-19. A take ended for the
  // recordist looked, to them, exactly like a take they finished themselves:
  // the autocue moved on either way. Sitting with Sascha, Kai watched them
  // start speeding up to beat a cut-off nobody had told them about. Whatever
  // else is true, a take the tool ends early must SAY that it did.
  endedWhileLoud: boolean
  // How far below the take's own speech level the signal had fallen when the
  // cut fired, in dB. A real end-of-phrase is far down (25dB+); a bad cut is
  // only a few dB down. Descriptive — nothing branches on it.
  dropAtCutDb: number
}

// What a room measured before recording. `threshold` is what the VAD will
// actually use; `quality` is what the recordist should be told.
export interface VADCalibration {
  // Time-domain RMS the room idles at (high percentile, not the mean, so one
  // chair creak does not set the floor).
  noiseFloor: number
  // The silenceThreshold derived from that floor and now in force.
  threshold: number
  // Headroom between the floor and ordinary speech (~0.23 RMS), in dB.
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

// Calibration constants. Ordinary speech through this pipeline measures ~0.23
// RMS (p95, measured off a real take), which is the number the headroom and the
// quality bands below are reckoned against.
const SPEECH_RMS_REFERENCE = 0.23
// Threshold sits this far above the measured floor, so ordinary room tone reads
// as silence but the recordist does not have to whisper to be heard.
const NOISE_MARGIN = 4
// Clamps. The floor stops a freakishly quiet room from setting a threshold so
// low that a fan spinning up later re-creates the stuck-on-"Speaking" bug. The
// ceiling matters more: past this the threshold would start eating quiet
// speech, and a threshold above the speech level detects nothing at all —
// the same session-lost failure from the other direction.
const MIN_THRESHOLD = 0.01
const MAX_THRESHOLD = 0.08

// ── The relative end-of-speech floor ───────────────────────────────────────────
//
// silenceThreshold alone decides "is this silence?" on an ABSOLUTE level, and
// that is what truncated real takes on 2026-08-19. In a room whose measured
// floor reaches 0.02, calibrate() clamps the threshold to MAX_THRESHOLD (0.08),
// and 0.08 sits INSIDE ordinary speech — Kai's own takes that day measure a p95
// of 0.10-0.25, so the quieter half of a phrase reads as "silence". The 800ms
// end-of-speech timer then runs to completion WHILE THE RECORDIST IS STILL
// TALKING, and the take is cut mid-word.
//
// That is why the truncated takes end with no trailing silence at all: the
// "silence" the VAD timed was never silence, it was speech below the threshold,
// so the blob ends at full amplitude on the last syllable it managed to keep.
// Measured on the raw browser uploads (raw/*.webm, before any server trim):
// median trailing silence across 116 takes is 810ms — exactly what an 800ms cut
// predicts — while the truncated ones sit at 0-30ms. Replaying THIS state
// machine over that audio reproduces each truncated take's exact length only at
// a threshold of 0.065 or above, and at no value at or below 0.06.
//
// So end-of-speech is now judged RELATIVE to the voice actually being heard, not
// only against the absolute threshold: a pause has to be a real drop away from
// this speaker's own level, not merely quieter than a constant that may be
// sitting on top of them.
//
// The bounds keep the two known failure modes in view:
//  - It can only ever LOWER the floor (min with silenceThreshold), so it cannot
//    make the VAD cut more eagerly than it does today. The direction of any
//    residual error is "takes run together", which is recoverable, rather than
//    "the performance was truncated", which is not.
//  - It is floored at twice the room's measured noise, so a quiet room cannot
//    drive it under the room tone and re-create the 2026-08-07 failure where
//    the VAD never saw silence and a whole read landed as one blob.
//
// ...but that room-tone lower bound is itself unbounded, and on a QUIET INPUT it
// swallows the relative protection whole. The bound is 2x the measured room
// tone, an absolute number; the protection it is bounding is 5% of the speaker,
// a relative one. Nothing ties them together, so as the speaker gets quieter the
// bound climbs through the protection and out the other side. Worked: a mic
// running low into a room with a fan in it — noise 0.02, speech peaking 0.06 —
// gives a room bound of 0.04, which is 3.5dB under the loudest thing in the
// take. Every unstressed syllable in the phrase is below it, the 800ms timer
// runs mid-sentence, and the take is cut exactly as it was on 2026-08-19. The
// relative rule is still in the expression and is doing nothing.
//
// So the room bound now has a ceiling of its own, expressed in the same currency
// as the thing it bounds: the end-of-speech floor may never sit closer than
// MIN_SPEECH_DROP_RATIO to the level this speaker is actually being heard at. A
// pause always has to be a real drop — at worst 12dB rather than at worst
// nothing.
//
// The anti-blob guarantee survives because the ceiling can never pull the floor
// below the room tone ITSELF: the raw measured noiseFloor is a hard backstop
// under everything. What the ceiling can do is spend the 2x margin, and it only
// ever does that in a room where 2x room tone is already within 12dB of the
// speaker — a room calibrate() is warning about, and a room where the honest
// choice is the recoverable failure (takes run together) over the unrecoverable
// one (the performance was truncated). That is the same trade the paragraph
// above makes; this only stops the room bound opting out of it.
const SPEECH_DROP_RATIO = 0.05   // ~26dB below the take's own speech level
const NOISE_FLOOR_MARGIN = 2
const MIN_SPEECH_DROP_RATIO = 0.25   // ~12dB: the least drop we will ever call a pause

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
  // The loudest level heard so far inside the take being captured. Reset per
  // take, so it tracks THIS phrase as this person is reading it rather than a
  // session-wide average that a single loud item would skew. See
  // SPEECH_DROP_RATIO.
  const speechLevel = ref(0)
  // The end-of-speech floor actually in force at the last poll, after the
  // relative rule. Published so the studio (and the VAD lab) can see the number
  // the decision was really made on rather than the configured one.
  const endOfSpeechFloor = ref(0)

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
    speechLevel.value = 0
    endOfSpeechFloor.value = 0
  }

  let calibrationSamples: number[] = []

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
   * Caller must have startListening()'d first. Returns the calibration and
   * leaves it on `calibration`.
   */
  async function calibrate(durationMs = 1500): Promise<VADCalibration> {
    if (!analyser) throw new Error('calibrate() needs startListening() first')

    calibrationSamples = []
    isCalibrating.value = true
    await new Promise(resolve => setTimeout(resolve, durationMs))
    isCalibrating.value = false

    const samples = calibrationSamples.slice().sort((a, b) => a - b)
    calibrationSamples = []

    // p90, not the mean: one chair creak or a passing car should not set the
    // room's floor, but a floor under the genuinely noisy moments would let
    // those moments read as speech.
    const noiseFloor = samples.length
      ? samples[Math.min(samples.length - 1, Math.floor(0.9 * samples.length))]
      : 0

    const threshold = Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, noiseFloor * NOISE_MARGIN))
    const headroomDb = noiseFloor > 0
      ? 20 * Math.log10(SPEECH_RMS_REFERENCE / noiseFloor)
      : Infinity

    // Bands are set on headroom, not on whether the threshold hit its clamp.
    // Keying "too-loud" off the clamp left "loud" spanning 20-21.2dB — a sliver
    // no real room lands in, so the gentler warning would never have shown.
    // The boundaries below are where measured behaviour actually changes: at
    // 18dB the segmenter still cut Kai's take correctly (13 takes vs 14 in the
    // clean room), so that is a warning and not a refusal; below ~14dB the
    // threshold is clamped AND sitting inside the noise, and takes start
    // running together.
    let quality: VADCalibration['quality']
    let message: string
    if (headroomDb < 14) {
      quality = 'too-loud'
      message = 'This room is too noisy to split takes reliably — phrases will run together into one recording. Turn off fans, air-con or anything humming, move away from the window, or use a headset mic, then start again.'
    } else if (headroomDb < 22) {
      quality = 'loud'
      message = 'There is a fair amount of background noise. It should still work, but leave a clear beat of silence between phrases.'
    } else if (headroomDb < 30) {
      quality = 'ok'
      message = 'Background noise is fine.'
    } else {
      quality = 'quiet'
      message = 'Nice and quiet.'
    }

    cfg.silenceThreshold = threshold
    calibration.value = { noiseFloor, threshold, headroomDb, quality, message }
    return calibration.value
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

    // ONSET still uses the configured threshold — starting a take on a relative
    // rule would mean the room's own tone could bootstrap itself into "speech".
    // Only the ENDING is judged relatively; see SPEECH_DROP_RATIO.
    const isAboveThreshold = rms > cfg.silenceThreshold

    // Track how loud this speaker actually is inside this take, and derive the
    // floor that "have they stopped?" is judged against. Bounded above by the
    // configured threshold (so this can never cut sooner than today) and below
    // by the room's own measured tone (so it can never stop cutting at all) —
    // with that room bound itself held under MIN_SPEECH_DROP_RATIO of the
    // speaker, and the raw room tone as the hard backstop beneath the lot.
    if (isAboveThreshold && rms > speechLevel.value) speechLevel.value = rms
    const noiseFloor = calibration.value ? calibration.value.noiseFloor : 0
    const roomFloor = noiseFloor * NOISE_FLOOR_MARGIN
    const silenceFloor = speechLevel.value > 0
      ? Math.min(
          cfg.silenceThreshold,
          Math.max(
            noiseFloor,
            Math.min(
              Math.max(roomFloor, speechLevel.value * SPEECH_DROP_RATIO),
              speechLevel.value * MIN_SPEECH_DROP_RATIO
            )
          )
        )
      : cfg.silenceThreshold
    endOfSpeechFloor.value = silenceFloor

    // Starting a take needs the full threshold; SUSTAINING one only needs to
    // stay above the relative floor. That asymmetry is the whole fix: the
    // quieter half of a phrase no longer reads as a pause just because an
    // absolute threshold was calibrated on top of it.
    const isSound = isSpeaking.value ? rms > silenceFloor : isAboveThreshold

    if (isSound) {
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
        speechLevel.value = rms
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
                // How far the signal had actually dropped when we called it an
                // ending. A genuine end-of-phrase is far down into room tone; a
                // few dB means we ended a take the recordist was still reading.
                const dropAtCutDb = speechLevel.value > 0 && rms > 0
                  ? 20 * Math.log10(speechLevel.value / rms)
                  : Infinity
                onSpeechEnd(speechDuration, chunkGaps.map(g => ({ ...g })), {
                  shortPauses: shortPauses.value,
                  longestShortPauseMs: longestShortPauseMs.value,
                  endedWhileLoud: Number.isFinite(dropAtCutDb) && dropAtCutDb < 15,
                  dropAtCutDb: Number.isFinite(dropAtCutDb) ? Math.round(dropAtCutDb) : 99
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
            speechLevel.value = 0
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
    // The relative end-of-speech floor and the level it is derived from, so the
    // VAD lab and the studio can see the number the cut decision was really
    // made on rather than the configured one. See SPEECH_DROP_RATIO.
    speechLevel,
    endOfSpeechFloor,
    // The two constants the recordist is being asked to hit, published so the
    // UI can DRAW the window instead of leaving it a secret. Reading them off
    // the live config means the picture cannot drift from the behaviour.
    chunkPauseMs: () => cfg.chunkPauseDuration,
    shortPauseFloorMs: SHORT_PAUSE_FLOOR_MS,

    // Actions
    startListening,
    stopListening,
    calibrate,
    updateConfig,

    // Callbacks
    onSpeechStart: onSpeechStartCallback,
    onSpeechEnd: onSpeechEndCallback,
    onSpeechAborted: onSpeechAbortedCallback,
    onLevelChange: onLevelChangeCallback
  }
}
