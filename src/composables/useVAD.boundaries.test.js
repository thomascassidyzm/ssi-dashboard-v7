// @vitest-environment jsdom
/**
 * The VAD's chunk-boundary TIMINGS, which it used to throw away.
 *
 * It has always heard the deliberate pauses inside a slow-pass take — counting
 * them is how it knows not to cut mid-phrase (useVAD.chunks.test.js). But it
 * only ever counted them, so by the time the take reached the review screen
 * nothing knew where one LEGO ended and the next began, and the only controls
 * that could be offered were "play the whole take" and "record it all again".
 *
 * These pin that the timings now come out with the take, that the take is cut
 * in the same places it always was, and that the last pause is reported as the
 * open one — the end of the last chunk, not a boundary with a chunk after it.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useVAD } from './useVAD'

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
// Every edge is measured on a poll, so it lands within one pollInterval of the
// real transition. Assertions allow that and nothing more.
const POLL = 50

describe('useVAD chunk-boundary timings', () => {
  let audio
  const advance = (ms) => vi.advanceTimersByTime(ms)

  beforeEach(() => {
    vi.useFakeTimers()
    audio = makeAudioGraph()
  })

  afterEach(() => {
    vi.useRealTimers()
    delete global.AudioContext
  })

  it('reports both edges of every mid-phrase pause, and leaves the last one open', async () => {
    const vad = useVAD({ expectedChunks: 3 })
    const onSpeechEnd = vi.fn()
    vad.onSpeechEnd(onSpeechEnd)
    await vad.startListening({ getTracks: () => [] })

    // "dw i | eisiau | siarad" — 600ms of speech per chunk, 1000ms pauses.
    audio.amplitude = SPEECH; advance(600)
    audio.amplitude = ROOM;   advance(1000)
    audio.amplitude = SPEECH; advance(600)
    audio.amplitude = ROOM;   advance(1000)
    audio.amplitude = SPEECH; advance(600)
    audio.amplitude = ROOM;   advance(850)   // end of take: short cut-off

    expect(onSpeechEnd).toHaveBeenCalledTimes(1)
    const gaps = onSpeechEnd.mock.calls[0][1]
    expect(gaps).toHaveLength(3)

    // Two closed gaps: pause 1 at ~600-1600, pause 2 at ~2200-3200.
    expect(gaps[0].startMs).toBeGreaterThanOrEqual(600)
    expect(gaps[0].startMs).toBeLessThanOrEqual(600 + POLL)
    expect(gaps[0].endMs).toBeGreaterThanOrEqual(1600)
    expect(gaps[0].endMs).toBeLessThanOrEqual(1600 + POLL)
    expect(gaps[1].startMs).toBeGreaterThanOrEqual(2200)
    expect(gaps[1].startMs).toBeLessThanOrEqual(2200 + POLL)
    expect(gaps[1].endMs).toBeGreaterThanOrEqual(3200)
    expect(gaps[1].endMs).toBeLessThanOrEqual(3200 + POLL)

    // The final silence: speech never resumed, so it has no end — and its start
    // is where the last chunk finished (~3800ms).
    expect(gaps[2].endMs).toBeNull()
    expect(gaps[2].startMs).toBeGreaterThanOrEqual(3800)
    expect(gaps[2].startMs).toBeLessThanOrEqual(3800 + POLL)

    vad.stopListening()
  })

  it('does not report an ordinary breath as a boundary', async () => {
    // Same bar as the counter: under chunkPauseDuration it is a breath, and a
    // breath must not become a cut point on the review screen either.
    const vad = useVAD({ expectedChunks: 2 })
    const onSpeechEnd = vi.fn()
    vad.onSpeechEnd(onSpeechEnd)
    await vad.startListening({ getTracks: () => [] })

    audio.amplitude = SPEECH; advance(600)
    audio.amplitude = ROOM;   advance(200)   // breath
    audio.amplitude = SPEECH; advance(600)
    audio.amplitude = ROOM;   advance(1000)  // real gap marker
    audio.amplitude = SPEECH; advance(600)
    audio.amplitude = ROOM;   advance(850)

    const gaps = onSpeechEnd.mock.calls[0][1]
    expect(gaps.filter(g => g.endMs !== null)).toHaveLength(1)

    vad.stopListening()
  })

  it('gives a phrase read straight through nothing but its closing silence', async () => {
    const vad = useVAD()
    const onSpeechEnd = vi.fn()
    vad.onSpeechEnd(onSpeechEnd)
    await vad.startListening({ getTracks: () => [] })

    audio.amplitude = SPEECH; advance(1000)
    audio.amplitude = ROOM;   advance(850)

    const gaps = onSpeechEnd.mock.calls[0][1]
    expect(gaps).toHaveLength(1)
    expect(gaps[0].endMs).toBeNull()

    vad.stopListening()
  })

  it('starts each take with an empty set, so one take never carries the last one\'s cuts', async () => {
    const vad = useVAD({ expectedChunks: 2 })
    const onSpeechEnd = vi.fn()
    vad.onSpeechEnd(onSpeechEnd)
    await vad.startListening({ getTracks: () => [] })

    // Take 1: two chunks.
    audio.amplitude = SPEECH; advance(600)
    audio.amplitude = ROOM;   advance(1000)
    audio.amplitude = SPEECH; advance(600)
    audio.amplitude = ROOM;   advance(850)
    expect(onSpeechEnd.mock.calls[0][1]).toHaveLength(2)

    // Take 2 on the same live VAD: read straight through.
    audio.amplitude = SPEECH; advance(600)
    audio.amplitude = ROOM;   advance(4100)  // waits out the long tolerance
    expect(onSpeechEnd).toHaveBeenCalledTimes(2)
    expect(onSpeechEnd.mock.calls[1][1]).toHaveLength(1)

    vad.stopListening()
  })
})
