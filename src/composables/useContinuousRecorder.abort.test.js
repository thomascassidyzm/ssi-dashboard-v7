// @vitest-environment jsdom
/**
 * The phantom take behind an unexplained "1 failed" (Sascha, 2026-08-10).
 *
 * The VAD opens a capture the instant the level clears the threshold, but only
 * CLOSES it (onSpeechEnd) if the run turns out long enough to be speech. A
 * cough, a chair, a door therefore left the MediaRecorder running with a stale
 * start time. Whatever stopped it next — usually the recordist pressing Stop at
 * the end of the session — shipped that as a take: room tone, trimmed to
 * nothing server-side and refused 422 by the silent-take guard, surfacing as a
 * failure on a session the recordist knows went fine.
 *
 * Fixed in two places, both covered here: the VAD now says when it has
 * disowned a run, and the recorder abandons the capture rather than leaving it
 * open — and a capture still shorter than a take when Stop arrives is dropped.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useVAD } from './useVAD'
import { useContinuousRecorder } from './useContinuousRecorder'

// Same audio-graph fake as useVAD.chunks.test.js: amplitude in, RMS out.
function makeAudioGraph() {
  const state = { amplitude: 0 }
  const analyser = {
    fftSize: 256,
    smoothingTimeConstant: 0.5,
    frequencyBinCount: 128,
    getFloatTimeDomainData(out) {
      for (let i = 0; i < out.length; i++) {
        out[i] = state.amplitude * Math.sin((2 * Math.PI * 8 * i) / out.length)
      }
    },
    getByteFrequencyData(out) { out.fill(110) }
  }
  global.AudioContext = class {
    createAnalyser() { return analyser }
    createMediaStreamSource() { return { connect() {} } }
    close() {}
  }
  return state
}

const SPEECH = 0.3
const ROOM = 0.004

class FakeMediaRecorder {
  static instances = []
  static isTypeSupported() { return true }
  constructor() {
    this.state = 'inactive'
    this.mimeType = 'audio/webm'
    FakeMediaRecorder.instances.push(this)
  }
  start() { this.state = 'recording' }
  stop() {
    this.state = 'inactive'
    // The browser flushes buffered data, then fires onstop.
    this.ondataavailable?.({ data: { size: 4096, type: 'audio/webm' } })
    this.onstop?.()
  }
}

describe('useVAD disowns a run too short to be speech', () => {
  let state
  const advance = (ms) => vi.advanceTimersByTime(ms)

  beforeEach(() => {
    vi.useFakeTimers()
    state = makeAudioGraph()
  })
  afterEach(() => {
    vi.useRealTimers()
    delete global.AudioContext
  })

  it('reports it as aborted, not as a finished take', async () => {
    const vad = useVAD({ silenceThreshold: 0.02, silenceDuration: 800, minSpeechDuration: 300 })
    const ended = []
    const aborted = []
    vad.onSpeechEnd(ms => ended.push(ms))
    vad.onSpeechAborted(ms => aborted.push(ms))

    await vad.startListening({ getTracks: () => [] })

    state.amplitude = SPEECH
    advance(100)           // a cough: well under minSpeechDuration
    state.amplitude = ROOM
    advance(1000)          // silence past the 800ms cut-off

    expect(ended).toHaveLength(0)
    expect(aborted).toHaveLength(1)
    vad.stopListening()
  })

  it('still reports a real phrase as a finished take', async () => {
    const vad = useVAD({ silenceThreshold: 0.02, silenceDuration: 800, minSpeechDuration: 300 })
    const ended = []
    const aborted = []
    vad.onSpeechEnd(ms => ended.push(ms))
    vad.onSpeechAborted(ms => aborted.push(ms))

    await vad.startListening({ getTracks: () => [] })

    state.amplitude = SPEECH
    advance(1500)
    state.amplitude = ROOM
    advance(1000)

    expect(ended).toHaveLength(1)
    expect(aborted).toHaveLength(0)
    vad.stopListening()
  })
})

describe('the recorder never ships a phantom take', () => {
  let state
  const advance = (ms) => vi.advanceTimersByTime(ms)

  beforeEach(() => {
    vi.useFakeTimers()
    state = makeAudioGraph()
    FakeMediaRecorder.instances = []
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) } })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    delete global.AudioContext
  })

  async function startedRecorder() {
    const captured = []
    const rec = useContinuousRecorder({ calibrationMs: 0, silenceThreshold: 0.02, silenceDuration: 800, minSpeechDuration: 300 })
    rec.onSegmentCaptured(s => captured.push(s))
    await rec.startFlow()
    return { rec, captured, mr: () => FakeMediaRecorder.instances[0] }
  }

  it('closes and drops the capture a cough opened', async () => {
    const { rec, captured, mr } = await startedRecorder()

    state.amplitude = SPEECH
    advance(100)
    expect(mr().state).toBe('recording')   // the burst opened a capture

    state.amplitude = ROOM
    advance(1000)

    expect(mr().state).toBe('inactive')    // ...and it is no longer left open
    expect(captured).toHaveLength(0)       // ...and nothing was shipped
    rec.stopFlow()
  })

  it('drops a capture that Stop catches before it is a take', async () => {
    const { rec, captured, mr } = await startedRecorder()

    state.amplitude = SPEECH
    advance(100)
    rec.stopFlow()

    expect(mr().state).toBe('inactive')
    expect(captured).toHaveLength(0)
    expect(rec.isFlowMode.value).toBe(false)
  })

  it('still delivers a real take that Stop catches mid-phrase', async () => {
    const { rec, captured } = await startedRecorder()

    state.amplitude = SPEECH
    advance(2000)
    rec.stopFlow()

    expect(captured).toHaveLength(1)
    // ~2000ms less the poll that noticed the speech starting
    expect(captured[0].durationMs).toBeGreaterThanOrEqual(1900)
  })

  it('delivers a phrase read to the end exactly once', async () => {
    const { rec, captured } = await startedRecorder()

    state.amplitude = SPEECH
    advance(1500)
    state.amplitude = ROOM
    advance(1000)

    expect(captured).toHaveLength(1)
    rec.stopFlow()
    expect(captured).toHaveLength(1)   // Stop after a clean cut adds nothing
  })
})
