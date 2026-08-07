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
