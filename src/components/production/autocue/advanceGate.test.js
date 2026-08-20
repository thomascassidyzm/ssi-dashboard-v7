// @vitest-environment jsdom
//
// Regression test for the 2026-08-19 recordist cut-off.
//
// WHAT HAPPENED. A recordist (Sascha, German; the same defect hit Kai's Finnish
// session the same day) was moved on to the next line while still speaking. Two
// separate harms followed, and this file pins both:
//
//   * The performance changed. Being cut off looked identical to finishing, so
//     the only inference available was "I am too slow" — and they sped up.
//   * The audio was mislabelled. They kept talking; the VAD heard that as a new
//     take; the line index had ALREADY moved, so the tail of line N was filed
//     as a take of line N+1. Silent, and invisible to any audit that counts
//     rows.
//
// The root cause of the bad cut is fixed in useVAD (end-of-speech judged
// relative to the speaker's own level — see useVAD.truncation.test.js). This
// file tests the second lock: that a cut, however it was decided, can no longer
// move the script on its own.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useVAD } from '@/composables/useVAD'
import { createAdvanceGate, CONFIRM_SILENCE_MS, HELD_CUT_OFF, HELD_RESUMED } from './advanceGate'
import fixture from '@/composables/__fixtures__/truncated-take-levels.json'

describe('advanceGate — the script does not move while the recordist is speaking', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  function gate() {
    const advanced = []
    const holds = []
    const g = createAdvanceGate({
      advance: (i) => advanced.push(i),
      onHold: (h) => holds.push(h)
    })
    return { g, advanced, holds }
  }

  // The bug, in its smallest form. Before this module existed, closing a take
  // WAS the advance, so this sequence moved the line and the resumed speech
  // landed on the next one.
  it('cancels the advance when speech resumes inside the confirm window', () => {
    const { g, advanced, holds } = gate()

    g.takeEnded(7, { endedWhileLoud: false, dropAtCutDb: 30 })
    expect(g.isArmed).toBe(true)

    // They were never finished — they carry on 100ms later.
    vi.advanceTimersByTime(100)
    expect(g.speechStarted()).toBe('cancelled')

    // Let every timer in the world run out. The line must not have moved.
    vi.advanceTimersByTime(10_000)
    expect(advanced).toEqual([])
    expect(holds).toEqual([{ itemIndex: 7, reason: HELD_RESUMED, dropDb: null }])
    expect(g.holding.itemIndex).toBe(7)
  })

  it('does advance a clean take, once the quiet has held', () => {
    const { g, advanced } = gate()
    g.takeEnded(7, { endedWhileLoud: false, dropAtCutDb: 30 })

    vi.advanceTimersByTime(CONFIRM_SILENCE_MS - 1)
    expect(advanced).toEqual([])   // not a moment early

    vi.advanceTimersByTime(1)
    expect(advanced).toEqual([7])
  })

  it('never advances a take the VAD admits it cut short', () => {
    const { g, advanced, holds } = gate()

    expect(g.takeEnded(3, { endedWhileLoud: true, dropAtCutDb: 4 })).toBe('held')
    vi.advanceTimersByTime(60_000)

    expect(advanced).toEqual([])
    expect(holds[0]).toEqual({ itemIndex: 3, reason: HELD_CUT_OFF, dropDb: 4 })
  })

  it('moves on only when the recordist explicitly says the held take was fine', () => {
    const { g, advanced } = gate()
    g.takeEnded(3, { endedWhileLoud: true, dropAtCutDb: 4 })
    vi.advanceTimersByTime(60_000)
    expect(advanced).toEqual([])

    g.releaseHold()
    expect(advanced).toEqual([3])
  })

  it('lets a re-read of a held line stand on its own merits', () => {
    const { g, advanced } = gate()
    g.takeEnded(3, { endedWhileLoud: true, dropAtCutDb: 4 })
    // They read it again, and this time it ends properly.
    g.takeEnded(3, { endedWhileLoud: false, dropAtCutDb: 28 })
    expect(g.holding).toBeNull()
    vi.advanceTimersByTime(CONFIRM_SILENCE_MS)
    expect(advanced).toEqual([3])
  })

  it('drops an armed advance on reset, so it cannot fire into a dead session', () => {
    const { g, advanced } = gate()
    g.takeEnded(1, { endedWhileLoud: false, dropAtCutDb: 30 })
    g.reset()
    vi.advanceTimersByTime(10_000)
    expect(advanced).toEqual([])
  })

  // ── The known positive ──────────────────────────────────────────────────────
  //
  // The fixture is the real 50ms RMS trace of raw/1CC0A1C5-…webm, a take from
  // 2026-08-19 that the recorder cut after "…ennen kuin", with "me muutettiin"
  // never recorded.
  //
  // The room is set to a measured floor of 0.04 on purpose. useVAD's relative
  // end-of-speech floor is bounded BELOW by twice the room's own tone (so a
  // quiet room cannot drive it under the noise), and at 0.04 that lower bound
  // meets the 0.08 threshold exactly — the relative rule is pinned back to the
  // absolute one and the pre-fix cut reappears on real audio. That is not a
  // contrived setting; it is an ordinary noisy room, and it is precisely the
  // residual exposure the first fix leaves behind.
  //
  // After the real trace the recordist keeps reading — they never stopped, so
  // "me muutettiin" is still coming. Those samples are SYNTHESISED at the
  // fixture's own p95 speech level; the raw upload cannot contain them, because
  // the recorder had already stopped writing. What the gate must do with them
  // is the whole point: they belong to line 12, and line 12 must still be the
  // line on screen.
  it('holds the line on the real take that was cut mid-sentence', async () => {
    const CONTINUED_SPEECH = Array(20).fill(0.138)   // p95 of the fixture
    const rms = [...fixture.rms, ...CONTINUED_SPEECH]
    let cursor = 0
    const analyser = {
      fftSize: 256,
      smoothingTimeConstant: 0.5,
      getFloatTimeDomainData(arr) { arr.fill(rms[Math.min(cursor, rms.length - 1)]) }
    }
    vi.stubGlobal('AudioContext', class {
      createAnalyser() { return analyser }
      createMediaStreamSource() { return { connect() {} } }
      close() {}
    })

    const { g, advanced, holds } = gate()
    // silenceThreshold 0.08 = MAX_THRESHOLD, the clamp an ordinary room gets.
    const vad = useVAD({ silenceThreshold: 0.08, pollInterval: 50, silenceDuration: 800, minSpeechDuration: 300 })
    vad.onSpeechStart(() => { g.speechStarted() })
    vad.onSpeechEnd((_d, _gaps, pauses) => { g.takeEnded(12, pauses) })

    await vad.startListening({ getTracks: () => [] })
    vad.calibration.value = { noiseFloor: 0.04, threshold: 0.08, headroomDb: 15, quality: 'loud', message: '' }

    let cutAtSample = null
    for (let i = 0; i < rms.length; i++) {
      cursor++
      vi.advanceTimersByTime(50)
      if (cutAtSample === null && (g.isArmed || g.holding)) cutAtSample = i
    }

    // The VAD did misjudge it: a take was closed while the trace still had
    // speech in it. Without that, this test would be proving nothing.
    expect(cutAtSample).not.toBeNull()
    expect(cutAtSample).toBeLessThan(fixture.rms.length + CONTINUED_SPEECH.length - 1)

    // Let every timer in the world run out.
    vi.advanceTimersByTime(10_000)

    // THE ASSERTION THAT MATTERS. The line the recordist was reading is still
    // the line on screen. Before this module existed, `advanced` here was [12]
    // and the words "me muutettiin" were filed as a take of line 13.
    expect(advanced).toEqual([])
    // And the tool owns it in the recordist's own view, rather than leaving
    // them to conclude they were reading too slowly.
    expect(holds.length).toBeGreaterThan(0)
    expect([HELD_CUT_OFF, HELD_RESUMED]).toContain(holds[0].reason)

    vad.stopListening()
  })
})
