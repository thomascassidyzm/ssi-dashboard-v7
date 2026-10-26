// Auto-advance on Aran's REAL room, 2026-10-26 (job #36): the booth "failed to
// move on to the next item on multiple occasions". This file replays the meter
// frames of his own raw takes; the harness below is copied from
// useTapRecorder.autoadvance.test.js, whose header explains quietMs.
//
// Original header follows.
// Auto-advance has to fire on a real room (Aran, 2026-08-23, mid-session on
// https://popty.app/r/human_aran_cym_n: "the moving on to the next one
// automatically is beautiful - but only seems to work about half the time").
//
// Auto-advance is driven by ONE number, `quietMs`: how long the input has sat
// under quietFloor() since the line last had speech on it. The surface advances
// at 1200ms of it. So "half the time" means quietMs never reaches 1200 on half
// his lines — and the reason is in the two floors, not in the surface.
//
// The floors are both derived from `noiseEst`, and noiseEst is a TROUGH
// tracker: it falls toward the input fast (NOISE_FALL 0.1) and rises out of it
// glacially (NOISE_RISE 0.0006, a time constant of many seconds at 60fps). Fed
// a real room — whose frame peaks wander over a 6-10dB range — it converges on
// the QUIETEST frames that room produces, not its typical level. The old
// quietFloor then sat at speechFloor x 0.33 = noiseEst x 1.32, i.e. about 2.4dB
// over the quietest frame of the room. The room's own ordinary frames are
// louder than that. Every one of them reset the quiet timer, quietMs never
// climbed past a couple of hundred ms, and the line sat there waiting for a
// tap.
//
// Whether it happened on a given line depended on how far the read's
// inter-syllable troughs had dragged noiseEst down, and on how noisy the room
// happened to be in that moment. Which is exactly the shape of "about half the
// time", varying line to line with no pattern the recordist can see.
//
// These tests feed synthetic meter frames through the real onMeterFrame /
// speechFloor / quietFloor path — a read, then room tone — and assert on
// quietMs, the number the surface actually watches.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useTapRecorder } from './useTapRecorder'
import { STALLED_LINES } from './__fixtures__/aran-room-2026-10-26.js'

const FRAME_MS = 16          // ~60fps, what requestAnimationFrame delivers
const ADVANCE_AT_MS = 1200   // AUTO_ADVANCE_QUIET_MS in RecordistRoom.vue

let frames = []
let sampleLevel = 0

class FakeMediaRecorder {
  static isTypeSupported() { return true }
  constructor() { this.state = 'inactive'; this.ondataavailable = null; this.onstop = null }
  start() { this.state = 'recording'; this.ondataavailable?.({ data: new Blob(['x'], { type: 'audio/webm' }) }) }
  stop() { this.state = 'inactive'; this.onstop?.() }
}

function fakeStream() {
  return {
    getAudioTracks: () => [{ applyConstraints: async () => {}, getSettings: () => ({ sampleRate: 48000 }), stop: () => {} }],
    getTracks: () => [{ stop: () => {} }],
  }
}

function stubAudioContext() {
  const Ctx = class {
    constructor() { this.state = 'running' }
    async resume() {}
    async close() {}
    createMediaStreamSource() { return { connect() {} } }
    createAnalyser() {
      return {
        fftSize: 1024,
        getFloatTimeDomainData(buf) { for (let i = 0; i < buf.length; i++) buf[i] = i % 2 ? sampleLevel : -sampleLevel },
      }
    }
  }
  vi.stubGlobal('window', { AudioContext: Ctx })
}

// Play a sequence of per-frame peaks through the meter, advancing the clock one
// animation frame per value — so quietMs measures what it would measure live.
function play(peaks) {
  for (const p of peaks) {
    sampleLevel = p
    const cb = frames.shift()
    if (!cb) return
    cb()
    vi.advanceTimersByTime(FRAME_MS)
  }
}

// A room is not one number. Real room tone wanders; these are the frame peaks a
// quiet domestic room produces, deterministic here so the test is not flaky.
function room(n, { floor = 0.0020, ceil = 0.0060 } = {}) {
  const out = []
  for (let i = 0; i < n; i++) {
    // A repeating wander between floor and ceil, hitting both ends.
    const phase = (i % 12) / 11
    out.push(floor + (ceil - floor) * Math.abs(Math.sin(phase * Math.PI * 2)))
  }
  return out
}

// A read on a phone at reading distance: syllables well above the room, with
// the gaps between them dropping back to — and below — the room's own floor.
// Those troughs are what drag a trough-tracking room estimate under the room.
function read(n, { peak = 0.05, trough = 0.0015 } = {}) {
  const out = []
  for (let i = 0; i < n; i++) out.push(i % 8 < 5 ? peak : trough)
  return out
}

// The highest quietMs seen while playing a sequence — the surface advances on a
// watcher, so what matters is whether the number ever crosses, not where it ends.
function peakQuietMs(r, peaks) {
  let hi = 0
  for (const p of peaks) {
    sampleLevel = p
    const cb = frames.shift()
    if (!cb) break
    cb()
    vi.advanceTimersByTime(FRAME_MS)
    if (r.quietMs.value > hi) hi = r.quietMs.value
  }
  return hi
}

beforeEach(() => {
  vi.useFakeTimers()
  frames = []
  sampleLevel = 0
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  vi.stubGlobal('navigator', {
    mediaDevices: { getUserMedia: async () => fakeStream(), enumerateDevices: async () => [] },
  })
  vi.stubGlobal('requestAnimationFrame', (cb) => { frames.push(cb); return frames.length })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  stubAudioContext()
})

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

async function openSession() {
  const r = useTapRecorder()
  await r.start()
  // A session always opens on the room before anyone reads.
  play(room(90))
  return r
}


// WHAT HELD THESE LINES. quietFloor() is min(FLOOR_PEAK, speechFloor, max(...,
// roomCeil x 1.6)). speechFloor is 4x noiseEst, and noiseEst tracks the room's
// TROUGHS. In his room the room's own upper edge sits within 4dB of that, so
// roomCeil x 1.6 is above speechFloor on every frame of the session and the
// min() hands the decision straight back to the trough tracker: the 2026-08-23
// roomCeil fix never takes effect. Ordinary room frames then cross the quiet
// floor, each one restarts the 1.2s quiet clock, and the line moves on only
// when the room happens to stay under it for 1.2s straight - seconds late, or
// not at all until he taps.
describe("Aran's room, 2026-10-26: a line moves on within 2s of his last syllable", () => {
  for (const c of STALLED_LINES) {
    it(c.name, async () => {
      const r = useTapRecorder()
      await r.start()
      play(c.peaks.slice(0, c.lineAt).map(p => p / 10000))
      r.beginLine()
      play(c.peaks.slice(c.lineAt, c.readEndsAt + 1).map(p => p / 10000))
      expect(r.lineHasSpeech.value).toBe(true)
      // Frames after his last syllable, until quietMs crosses the advance mark.
      let movedAt = null
      const after = c.peaks.slice(c.readEndsAt + 1).map(p => p / 10000)
      for (let i = 0; i < after.length; i++) {
        sampleLevel = after[i]
        const cb = frames.shift()
        if (!cb) break
        cb()
        vi.advanceTimersByTime(FRAME_MS)
        if (r.quietMs.value >= ADVANCE_AT_MS) { movedAt = (i + 1) * FRAME_MS; break }
      }
      // Live, this line took c.movedAfterMs. The bar is the band the on-time
      // lines of the same session landed in.
      expect(movedAt).not.toBeNull()
      expect(movedAt).toBeLessThanOrEqual(2000)
    })
  }
})

// ADVANCE TELEMETRY (job #99): at the instant a line moves on, the recorder can
// say how long ago it last heard speech and what the two thresholds were — the
// numbers the [BoothTake] log line carries.
describe('advanceSnapshot()', () => {
  it('reports ms since the last speech frame and both thresholds in dBFS', async () => {
    const c = STALLED_LINES[0]
    const r = useTapRecorder()
    await r.start()
    play(c.peaks.slice(0, c.lineAt).map(p => p / 10000))
    r.beginLine()
    expect(r.advanceSnapshot().gapMs).toBeNull()
    play(c.peaks.slice(c.lineAt, c.readEndsAt + 1).map(p => p / 10000))
    play(room(75))
    const s = r.advanceSnapshot()
    // 75 frames of 16 ms after the read (a room frame could still count as speech).
    expect(s.gapMs).toBeGreaterThan(0)
    expect(s.gapMs).toBeLessThanOrEqual(75 * FRAME_MS + FRAME_MS)
    expect(typeof s.thrSpeech).toBe('number')
    expect(typeof s.thrQuiet).toBe('number')
    expect(s.thrQuiet).toBeLessThanOrEqual(s.thrSpeech)
    expect(s.thrSpeech).toBeLessThan(0)
  })
})
