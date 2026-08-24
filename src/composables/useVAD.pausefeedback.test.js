// @vitest-environment jsdom
//
// Cover for the two signals the recordist is shown WHILE reading a slow phrase.
//
// Kai, after recording on the autocue on 2026-08-19: "it would be better to
// prompt the recorder for the slow phrase again if it does not get the gaps
// right, rather than carrying on... Also would be good to show the progression
// as you do the chunks. It is nice to know it is OK to move on to the next
// chunk."
//
// Both of those need the VAD to publish, live, what it is already deciding:
// how long the pause in progress has lasted, and how many pauses were made but
// came up short. Neither changes a decision the VAD makes — these tests exist
// to keep them honest against the decision, not to pin new behaviour into it.

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

describe('useVAD live pause feedback', () => {
  let audio
  const advance = (ms) => vi.advanceTimersByTime(ms)

  beforeEach(() => {
    vi.useFakeTimers()
    audio = makeAudioGraph()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  async function start(config = {}) {
    const vad = useVAD({ calibrationMs: 0, ...config })
    await vad.startListening({ getTracks: () => [] })
    return vad
  }

  const speak = (ms) => { audio.amplitude = SPEECH; advance(ms) }
  const quiet = (ms) => { audio.amplitude = ROOM; advance(ms) }

  it('publishes the pause in progress so the studio can draw it growing', async () => {
    const vad = await start()

    speak(600)
    expect(vad.silenceMs.value).toBe(0)

    quiet(300)
    // Measured at 50ms poll resolution, so allow one poll of slack either way.
    expect(vad.silenceMs.value).toBeGreaterThanOrEqual(200)
    expect(vad.silenceMs.value).toBeLessThanOrEqual(300)

    // Crossing the boundary length is the moment the pause counts — and the
    // moment the indicator is allowed to go green.
    quiet(200)
    expect(vad.silenceMs.value).toBeGreaterThanOrEqual(400)
    expect(vad.chunksSeen.value).toBe(1)

    // Speaking again resets it to zero, not to a stale last value.
    speak(200)
    expect(vad.silenceMs.value).toBe(0)
  })

  it('counts a pause that was made but was too quick to register', async () => {
    const vad = await start({ expectedChunks: 3 })

    speak(600)
    quiet(250)   // a real pause to the ear; under the 400ms boundary length
    speak(600)

    expect(vad.chunksSeen.value).toBe(0)
    expect(vad.shortPauses.value).toBe(1)
    expect(vad.longestShortPauseMs.value).toBeGreaterThanOrEqual(200)
  })

  it('does not count a gap between words as a pause the recordist made', async () => {
    const vad = await start({ expectedChunks: 3 })

    speak(600)
    quiet(100)   // under the aligner's own 150ms floor — this is not a pause
    speak(600)

    expect(vad.shortPauses.value).toBe(0)
  })

  it('never counts a real boundary as a near miss as well', async () => {
    const vad = await start({ expectedChunks: 3 })

    speak(600)
    quiet(700)   // comfortably a boundary
    speak(600)

    expect(vad.chunksSeen.value).toBe(1)
    expect(vad.shortPauses.value).toBe(0)
  })

  it('reports the near misses with the take, and starts the next one clean', async () => {
    const vad = await start({ expectedChunks: 2 })
    const onSpeechEnd = vi.fn()
    vad.onSpeechEnd(onSpeechEnd)

    speak(600)
    quiet(250)   // too quick — this is the pause that will be missing
    speak(600)
    // The take never reaches its expected chunk count, so its closing silence
    // waits out interChunkSilenceDuration rather than cutting at 800ms. That
    // slow close IS the known cost of a missed pause (see useVAD's
    // chunkPauseDuration note) and it is the take the studio now refuses.
    quiet(4200)

    expect(onSpeechEnd).toHaveBeenCalledTimes(1)
    const report = onSpeechEnd.mock.calls[0][2]
    expect(report.shortPauses).toBe(1)

    // The next take must not inherit it — that is what would turn one bad read
    // into a run of false refusals.
    speak(600)
    expect(vad.shortPauses.value).toBe(0)
  })

  it('publishes the boundary length it is actually using, not a copy of it', async () => {
    const vad = await start({ chunkPauseDuration: 550 })
    expect(vad.chunkPauseMs()).toBe(550)
    vad.updateConfig({ chunkPauseDuration: 300 })
    expect(vad.chunkPauseMs()).toBe(300)
  })
})
