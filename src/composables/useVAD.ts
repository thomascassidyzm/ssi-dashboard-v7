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
  pollInterval: 50              // Check every 50ms
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
    isCalibrating.value = false
    calibrationSamples = []
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
    isCalibrating,
    calibration,

    // Actions
    startListening,
    stopListening,
    calibrate,
    updateConfig,

    // Callbacks
    onSpeechStart: onSpeechStartCallback,
    onSpeechEnd: onSpeechEndCallback,
    onLevelChange: onLevelChangeCallback
  }
}
