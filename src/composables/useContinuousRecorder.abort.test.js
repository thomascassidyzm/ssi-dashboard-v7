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

  // Blobs are assembled in a promise now (MediaRecorder.onstop is asynchronous
  // in every real browser), so a test that advances timers must also let the
  // microtask queue drain before it looks at what was shipped.
  const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() }

  async function startedRecorder() {
    const captured = []
    const rec = useContinuousRecorder({ calibrationMs: 0, silenceThreshold: 0.02, silenceDuration: 800, minSpeechDuration: 300 })
    rec.onSegmentCaptured(s => captured.push(s))
    await rec.startFlow()
    return {
      rec, captured,
      mr: () => FakeMediaRecorder.instances[0],
      live: () => FakeMediaRecorder.instances[FakeMediaRecorder.instances.length - 1],
      recording: () => FakeMediaRecorder.instances.filter(i => i.state === 'recording').length
    }
  }

  it('closes and drops the capture a cough opened', async () => {
    const { rec, captured, mr, live, recording } = await startedRecorder()

    state.amplitude = SPEECH
    advance(100)
    state.amplitude = ROOM
    advance(2000)                          // past the abort and its overlap
    await flush()

    expect(mr().state).toBe('inactive')    // the cough's recorder is dropped
    expect(captured).toHaveLength(0)       // ...and nothing was shipped
    // ...and the stream is still being captured, so the next phrase already has
    // its pre-roll. Under the old model this was the point at which NOTHING was
    // recording and the front of the next word was lost.
    expect(live().state).toBe('recording')
    expect(recording()).toBeGreaterThanOrEqual(1)
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
    await flush()

    expect(captured).toHaveLength(1)
    // ~2000ms less the poll that noticed the speech starting
    expect(captured[0].durationMs).toBeGreaterThanOrEqual(1900)
  })

  it('delivers a phrase read to the end exactly once', async () => {
    const { rec, captured } = await startedRecorder()

    state.amplitude = SPEECH
    advance(1500)
    state.amplitude = ROOM
    advance(2000)                      // silence, then the tail run-on
    await flush()

    expect(captured).toHaveLength(1)
    rec.stopFlow()
    await flush()
    expect(captured).toHaveLength(1)   // Stop after a clean cut adds nothing
  })

  // THE PRE-ROLL. Every clipped take in the 2026-08-21 archive came from this
  // path starting its encoder inside onSpeechStart: 101 of 101 with no room
  // tone in front of the word at all. These are the assertions that stop it
  // being reintroduced.
  it('is already capturing before anyone has said anything', async () => {
    const { rec, mr } = await startedRecorder()
    expect(mr().state).toBe('recording')
    rec.stopFlow()
  })

  it('ships the audio from before the first word, not just from it', async () => {
    const { rec, captured } = await startedRecorder()

    advance(1200)                      // the recordist reading the line
    state.amplitude = SPEECH
    advance(1000)
    state.amplitude = ROOM
    advance(2000)
    await flush()

    expect(captured).toHaveLength(1)
    // The take carries the lead-in AND the run-on, so it is longer than the
    // speech the VAD timed inside it.
    expect(captured[0].preRollMs).toBeGreaterThanOrEqual(1000)
    expect(captured[0].durationMs).toBeGreaterThan(captured[0].preRollMs + 1000)
    rec.stopFlow()
  })

  it('starts the replacement before it stops the outgoing one', async () => {
    const { rec, recording } = await startedRecorder()

    state.amplitude = SPEECH
    advance(1000)
    state.amplitude = ROOM
    advance(900)                       // the VAD has cut, the tail is running

    // Both recorders live at the boundary: the stream is never unobserved, and
    // that overlap IS the next phrase's pre-roll.
    expect(recording()).toBe(2)
    advance(2000)
    await flush()
    expect(recording()).toBe(1)
    rec.stopFlow()
  })

  it('rolls the pre-roll over rather than shipping a long silence', async () => {
    const { rec, captured, recording } = await startedRecorder()

    advance(12000)                     // a long read-ahead with nothing said
    await flush()
    expect(captured).toHaveLength(0)   // nothing shipped from dead air
    expect(recording()).toBeGreaterThanOrEqual(1)  // still always capturing

    state.amplitude = SPEECH
    advance(1000)
    state.amplitude = ROOM
    advance(2000)
    await flush()

    expect(captured).toHaveLength(1)
    // Bounded by the roll-over, not by how long the recordist paused.
    expect(captured[0].preRollMs).toBeLessThan(5000)
    rec.stopFlow()
  })
})
