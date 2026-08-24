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

describe('auto-advance fires when the recordist stops reading', () => {
  it('reaches the advance threshold after a read, in a room that wanders', async () => {
    const r = await openSession()
    r.beginLine()

    play(read(120))                       // ~2s of reading
    expect(r.lineHasSpeech.value).toBe(true)

    // He stops. Two full seconds of the same room he has been sitting in all
    // session. Under the old floors this room was permanently "not quiet" and
    // quietMs never left the low hundreds.
    const hi = peakQuietMs(r, room(125))
    expect(hi).toBeGreaterThanOrEqual(ADVANCE_AT_MS)
  })

  it('fires the same way on a hot mic in a noisier room', async () => {
    const r = useTapRecorder()
    await r.start()
    play(room(90, { floor: 0.008, ceil: 0.02 }))
    r.beginLine()
    play(read(120, { peak: 0.4, trough: 0.006 }))
    expect(r.lineHasSpeech.value).toBe(true)

    const hi = peakQuietMs(r, room(125, { floor: 0.008, ceil: 0.02 }))
    expect(hi).toBeGreaterThanOrEqual(ADVANCE_AT_MS)
  })

  it('fires on the very quiet phone-at-arms-length signal too', async () => {
    const r = useTapRecorder()
    await r.start()
    play(room(90, { floor: 0.0003, ceil: 0.0009 }))
    r.beginLine()
    play(read(120, { peak: 0.004, trough: 0.0002 }))
    expect(r.lineHasSpeech.value).toBe(true)

    const hi = peakQuietMs(r, room(125, { floor: 0.0003, ceil: 0.0009 }))
    expect(hi).toBeGreaterThanOrEqual(ADVANCE_AT_MS)
  })

  it('recovers within one line: line two advances after line one dragged the estimate down', async () => {
    const r = await openSession()
    // Line one: a long read, all of whose troughs pull a trough-tracker under
    // the room, then a stop.
    r.beginLine()
    play(read(240))
    play(room(125))
    // Line two, immediately after, no time for anything slow to re-converge.
    r.beginLine()
    play(read(90))
    const hi = peakQuietMs(r, room(125))
    expect(hi).toBeGreaterThanOrEqual(ADVANCE_AT_MS)
  })
})

describe('auto-advance does not fire while he is still speaking', () => {
  it('does not reach the threshold across a pause for breath mid-line', async () => {
    const r = await openSession()
    r.beginLine()

    // Read, breathe for ~600ms, read on. A breath is not the end of a line, and
    // advancing here would cut him off — the failure that costs a take, where
    // failing to advance only costs a tap.
    const hi = peakQuietMs(r, [
      ...read(60),
      ...room(38),            // ~600ms of pause
      ...read(60),
    ])
    expect(hi).toBeLessThan(ADVANCE_AT_MS)
  })

  it('does not reach the threshold while a quiet read is actually running', async () => {
    const r = useTapRecorder()
    await r.start()
    play(room(90, { floor: 0.0003, ceil: 0.0009 }))
    r.beginLine()
    // Two and a half seconds of continuous quiet reading, no gap long enough to
    // be the end of anything.
    const hi = peakQuietMs(r, read(160, { peak: 0.004, trough: 0.0004 }))
    expect(hi).toBeLessThan(ADVANCE_AT_MS)
  })

  it('never counts quiet on a line nobody has spoken on', async () => {
    const r = await openSession()
    r.beginLine()
    const hi = peakQuietMs(r, room(300))
    expect(hi).toBe(0)   // no speech on the line: quietMs is pinned at zero
  })
})
