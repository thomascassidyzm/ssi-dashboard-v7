// @vitest-environment jsdom
// Regression cover for the 2026-08-07 recording-session failure.
//
// The VAD read getByteFrequencyData — bin power mapped from -100dB..-30dB onto
// 0..255 — and compared it to silenceThreshold 0.02, a threshold written for a
// time-domain waveform RMS. Room tone at an ordinary -70dBFS reads ~0.43 there,
// so the level never fell below threshold on a live mic, onSpeechEnd never
// fired, and useContinuousRecorder never cut the take. A whole read uploaded as
// one blob: Kai's session arrived as a single 72.5s file holding ~24 utterances.
//
// These tests pin the two things that has to stay true: the level is measured
// from the waveform, and real room tone counts as silence.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useVAD } from './useVAD'

// A fake AnalyserNode we can drive sample-by-sample. It also records whether
// anyone asked for frequency data, which is the specific mistake being pinned.
function makeAudioGraph() {
  const state = { amplitude: 0, frequencyDataRequested: false }
  const analyser = {
    fftSize: 256,
    smoothingTimeConstant: 0.5,
    frequencyBinCount: 128,
    getFloatTimeDomainData(out) {
      // A tone at the requested amplitude — RMS of a full-scale sine is
      // amplitude/√2, close enough for a threshold test.
      for (let i = 0; i < out.length; i++) {
        out[i] = state.amplitude * Math.sin((2 * Math.PI * 8 * i) / out.length)
      }
    },
    getByteFrequencyData(out) {
      state.frequencyDataRequested = true
      // What the old code saw: room tone lands high on the dB->byte scale.
      out.fill(110)
    }
  }
  global.AudioContext = class {
    createAnalyser() { return analyser }
    createMediaStreamSource() { return { connect() {} } }
    close() {}
  }
  return state
}

describe('useVAD level measurement', () => {
  let state

  beforeEach(() => {
    vi.useFakeTimers()
    state = makeAudioGraph()
  })

  afterEach(() => {
    vi.useRealTimers()
    delete global.AudioContext
  })

  // Drive the poll loop for `ms` of wall clock at the configured interval.
  const advance = (ms) => vi.advanceTimersByTime(ms)

  it('measures the waveform, not the frequency bins', async () => {
    const vad = useVAD()
    await vad.startListening({ getTracks: () => [] })

    state.amplitude = 0.3
    advance(200)

    expect(state.frequencyDataRequested).toBe(false)
    // A 0.3 tone is ~0.21 RMS, not the ~0.43 the dB->byte mapping produced.
    expect(vad.currentLevel.value).toBeGreaterThan(0.1)
    expect(vad.currentLevel.value).toBeLessThan(0.3)

    vad.stopListening()
  })

  it('ends a phrase on room tone, which is what cuts the take', async () => {
    const vad = useVAD()
    const onSpeechEnd = vi.fn()
    vad.onSpeechEnd(onSpeechEnd)
    await vad.startListening({ getTracks: () => [] })

    // Speak for a second, comfortably past minSpeechDuration (300ms).
    state.amplitude = 0.3
    advance(1000)

    // Then an ordinary quiet room — NOT digital silence. Measured from Kai's
    // own take: room tone sits around 0.003 RMS against ~0.23 for speech.
    state.amplitude = 0.004
    advance(1000) // past silenceDuration (800ms)

    expect(onSpeechEnd).toHaveBeenCalledTimes(1)
    expect(vad.isSpeaking.value).toBe(false)

    vad.stopListening()
  })

  it('does not cut mid-phrase on the quiet parts of speech', async () => {
    const vad = useVAD()
    const onSpeechEnd = vi.fn()
    vad.onSpeechEnd(onSpeechEnd)
    await vad.startListening({ getTracks: () => [] })

    state.amplitude = 0.3
    advance(500)
    // A brief inter-word dip, shorter than silenceDuration.
    state.amplitude = 0.004
    advance(300)
    state.amplitude = 0.3
    advance(500)

    expect(onSpeechEnd).not.toHaveBeenCalled()
    expect(vad.isSpeaking.value).toBe(true)

    vad.stopListening()
  })
})

describe('useVAD room calibration', () => {
  let state

  beforeEach(() => {
    vi.useFakeTimers()
    state = makeAudioGraph()
  })

  afterEach(() => {
    vi.useRealTimers()
    delete global.AudioContext
  })

  // calibrate() awaits a real setTimeout, so the timers have to be advanced
  // while the promise is in flight rather than before or after it.
  async function runCalibration(vad, ms = 1500) {
    const pending = vad.calibrate(ms)
    await vi.advanceTimersByTimeAsync(ms)
    return pending
  }

  it('sets the threshold from the room rather than from a constant', async () => {
    const vad = useVAD()
    await vad.startListening({ getTracks: () => [] })

    // A noticeably live room: 0.02 amplitude tone is ~0.014 RMS.
    state.amplitude = 0.02
    const result = await runCalibration(vad)

    expect(result.noiseFloor).toBeGreaterThan(0.005)
    // Threshold must clear the measured floor, or the VAD can never see silence.
    expect(result.threshold).toBeGreaterThan(result.noiseFloor)

    vad.stopListening()
  })

  it('does not treat the room it is measuring as speech', async () => {
    const vad = useVAD()
    const onSpeechStart = vi.fn()
    vad.onSpeechStart(onSpeechStart)
    await vad.startListening({ getTracks: () => [] })

    state.amplitude = 0.02
    await runCalibration(vad)

    expect(onSpeechStart).not.toHaveBeenCalled()
    expect(vad.isSpeaking.value).toBe(false)

    vad.stopListening()
  })

  it('warns when the room is too noisy to split takes', async () => {
    const vad = useVAD()
    await vad.startListening({ getTracks: () => [] })

    // Floor within ~9dB of speech (~0.23 RMS) — measured to produce ZERO
    // segment cuts on a real take, i.e. the whole-session-as-one-blob failure.
    state.amplitude = 0.12
    const result = await runCalibration(vad)

    expect(result.quality).toBe('too-loud')
    expect(result.headroomDb).toBeLessThan(14)

    vad.stopListening()
  })

  it('calls a quiet room quiet', async () => {
    const vad = useVAD()
    await vad.startListening({ getTracks: () => [] })

    // Kai's actual room measured 0.00053 RMS / 52.7dB of headroom.
    state.amplitude = 0.00075
    const result = await runCalibration(vad)

    // 'ok', not 'quiet', since 2026-08-19: a room-only calibration has not heard
    // this recordist on this microphone, so its "headroom" is a gap between a
    // real room and an assumed voice. It may not hand out a confident verdict on
    // the strength of that — only measureVoice() earns 'quiet'. What it must
    // still do is keep quiet about a room that is genuinely fine, which is what
    // this pins.
    expect(result.quality).toBe('ok')
    expect(result.voiceLevel).toBeNull()
    // A very quiet room must not push the threshold arbitrarily low — a fan
    // spinning up mid-session would otherwise re-create the original bug.
    expect(result.threshold).toBeGreaterThanOrEqual(0.01)

    vad.stopListening()
  })

  it('the measured threshold is what the state machine then uses', async () => {
    const vad = useVAD()
    const onSpeechEnd = vi.fn()
    vad.onSpeechEnd(onSpeechEnd)
    await vad.startListening({ getTracks: () => [] })

    state.amplitude = 0.02
    const { threshold } = await runCalibration(vad)

    // Speak, then drop back to the room's own level. Under the old fixed 0.02
    // this room's tone would have counted as speech forever.
    state.amplitude = 0.3
    vi.advanceTimersByTime(1000)
    state.amplitude = 0.02
    vi.advanceTimersByTime(1000)

    expect(threshold).toBeGreaterThan(0.02)
    expect(onSpeechEnd).toHaveBeenCalledTimes(1)

    vad.stopListening()
  })
})
