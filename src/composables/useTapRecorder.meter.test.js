// The level meter may never veto audio (Tom, 2026-08-22, mid-session on an
// iPhone: every one of twelve lines read aloud, every take refused as silent).
//
// The meter is built best-effort and documented as optional. Then lineHasSpeech
// — which is derived from the meter and only from the meter — became what
// decides whether a take is saved at all, and "optional" quietly became
// "load-bearing". Two ways that destroys a session, both reproduced here:
//
//   1. The meter reads nothing. An AudioContext that never leaves suspended, an
//      iOS MediaStreamAudioSourceNode that produces silence, a constructor that
//      threw: peak is 0 forever, no line ever registers speech, and every take
//      is thrown away while the microphone is working perfectly.
//   2. The meter reads, but quietly. autoGainControl is OFF by design, so a
//      phone at arm's length peaks well under the fixed 0.06 speech threshold
//      while reading perfectly audibly — and every syllable falls below it.
//
// The rule these pin: the meter reports true, false, or NOT KNOWN, and only a
// confident false may refuse a take.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useTapRecorder } from './useTapRecorder'

let frames = []          // queued rAF callbacks
let sampleLevel = 0      // what the fake analyser hands back, as a peak

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

// An analyser that fills the buffer with whatever `sampleLevel` currently is.
// Setting sampleLevel to exactly 0 is the dead-graph case: a live graph on a
// silent mic still carries dither, a dead one carries literal zeroes.
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
  // The composable reaches through `window`, not the bare global.
  vi.stubGlobal('window', { AudioContext: Ctx })
}

// Run the meter for n frames at the current sampleLevel.
function meterFrames(n) {
  for (let i = 0; i < n; i++) {
    const cb = frames.shift()
    if (!cb) return
    cb()
  }
}

beforeEach(() => {
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

afterEach(() => { vi.unstubAllGlobals() })

describe('a meter that is not reading gets no vote', () => {
  it('does not trust a meter that has never delivered a non-zero sample', async () => {
    const r = useTapRecorder()
    await r.start()
    r.beginLine()

    sampleLevel = 0        // the dead graph: literal zeroes, forever
    meterFrames(200)

    // The take that follows is the whole session. If this is true, the surface
    // believes a report of silence from a witness that heard nothing at all.
    expect(r.meterTrusted.value).toBe(false)
    expect(r.lineHasSpeech.value).toBe(false)
  })

  it('does not trust a meter that was never built', async () => {
    vi.stubGlobal('window', {})   // no AudioContext of any kind
    const r = useTapRecorder()
    await r.start()
    r.beginLine()
    meterFrames(50)
    expect(r.meterTrusted.value).toBe(false)
  })

  it('trusts the meter as soon as one frame carries any signal at all', async () => {
    const r = useTapRecorder()
    await r.start()
    r.beginLine()

    sampleLevel = 0.0002   // room dither on a live graph, far under any speech
    meterFrames(3)

    expect(r.meterTrusted.value).toBe(true)
    expect(r.lineHasSpeech.value).toBe(false)   // trusted, and it says: nothing said
  })

  it('forgets its trust when the mic is closed', async () => {
    const r = useTapRecorder()
    await r.start()
    sampleLevel = 0.2
    meterFrames(3)
    expect(r.meterTrusted.value).toBe(true)

    await r.stop()
    expect(r.meterTrusted.value).toBe(false)
  })
})

describe('a quiet microphone is still a microphone', () => {
  it('hears speech from a phone at arm\'s length, peaking under the old 0.06', async () => {
    const r = useTapRecorder()
    await r.start()
    r.beginLine()

    // The room first — a session always opens on one, and it is what the floor
    // is measured against.
    sampleLevel = 0.0004
    meterFrames(120)
    // Then a real read, well under the fixed absolute threshold that used to be
    // the test. Under the old rule this line was refused and the audio binned.
    sampleLevel = 0.03
    meterFrames(20)

    expect(r.meterTrusted.value).toBe(true)
    expect(r.lineHasSpeech.value).toBe(true)
  })

  it('still calls a genuinely silent line silent on that same quiet mic', async () => {
    const r = useTapRecorder()
    await r.start()

    // Establish the session's scale with a room and a real read on line one...
    r.beginLine()
    sampleLevel = 0.0004
    meterFrames(120)
    sampleLevel = 0.03
    meterFrames(20)
    expect(r.lineHasSpeech.value).toBe(true)

    // ...then say nothing on line two. The floor is relative, not absent: room
    // tone three orders of magnitude down must not read as a read.
    r.beginLine()
    sampleLevel = 0.00005
    meterFrames(60)
    expect(r.lineHasSpeech.value).toBe(false)
  })

  it('hears a whisper-level signal that no fixed floor could have been set under', async () => {
    const r = useTapRecorder()
    await r.start()

    // Tom's iPhone, 2026-08-22: "a very, very small but definite signal". The
    // room is quieter still. Any absolute threshold chosen in advance sits over
    // BOTH of these, which is why the threshold is not absolute any more.
    r.beginLine()
    sampleLevel = 0.0006          // room, ~-64dBFS
    meterFrames(120)
    sampleLevel = 0.004           // the read, ~-48dBFS
    meterFrames(20)

    expect(r.lineHasSpeech.value).toBe(true)
  })

  it('does not call that same room speech when nobody reads', async () => {
    const r = useTapRecorder()
    await r.start()
    r.beginLine()

    sampleLevel = 0.0006
    meterFrames(200)

    expect(r.meterTrusted.value).toBe(true)   // the graph is alive...
    expect(r.lineHasSpeech.value).toBe(false) // ...and it heard a room, not a read
  })

  it('behaves exactly as before on a mic that is running hot', async () => {
    const r = useTapRecorder()
    await r.start()
    r.beginLine()

    sampleLevel = 0.0004
    meterFrames(120)
    sampleLevel = 0.5
    meterFrames(20)
    expect(r.lineHasSpeech.value).toBe(true)
  })
})
