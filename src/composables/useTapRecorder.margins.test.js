// The capture boundary must never cut the utterance (Tom, 2026-08-21).
//
// These tests pin the three properties that make that true, each of which the
// per-line recorder this replaced got wrong:
//
//   1. Capture is running BEFORE the line opens, so the encoder's spin-up
//      happens in dead air rather than eating the first word.
//   2. The replacement recorder is started BEFORE the outgoing one is stopped,
//      so there is no instant at which the stream is unobserved.
//   3. The outgoing recorder keeps running past the boundary for a real tail,
//      so a tap landing on the final syllable does not truncate it.
//
// Written against a fake MediaRecorder that records the ORDER and TIME of every
// start/stop, because order and time are the whole defect.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useTapRecorder, TAIL_MS } from './useTapRecorder'

let events = []
let instances = []

class FakeMediaRecorder {
  static isTypeSupported() { return true }
  constructor() {
    this.state = 'inactive'
    this.ondataavailable = null
    this.onstop = null
    this.id = instances.length
    instances.push(this)
  }
  start() {
    this.state = 'recording'
    events.push({ kind: 'start', id: this.id, at: Date.now() })
    // A real recorder delivers data as it goes; one chunk is enough to prove
    // the blob came from this instance.
    this.ondataavailable?.({ data: new Blob([`take-${this.id}`], { type: 'audio/webm' }) })
  }
  stop() {
    this.state = 'inactive'
    events.push({ kind: 'stop', id: this.id, at: Date.now() })
    this.onstop?.()
  }
}

function fakeStream() {
  return {
    getAudioTracks: () => [{
      applyConstraints: async () => {},
      getSettings: () => ({ sampleRate: 48000 }),
      stop: () => {},
    }],
    getTracks: () => [{ stop: () => {} }],
  }
}

beforeEach(() => {
  events = []
  instances = []
  vi.useFakeTimers()
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: async () => fakeStream(),
      enumerateDevices: async () => [],
    },
  })
  // No AudioContext: the meter is explicitly optional, and its absence must not
  // stop the recorder from capturing. That is itself worth pinning.
  vi.stubGlobal('AudioContext', undefined)
  vi.stubGlobal('requestAnimationFrame', () => 0)
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('the capture boundary never cuts the utterance', () => {
  it('is already recording before the first line is opened', async () => {
    const r = useTapRecorder()
    await r.start()

    // The old recorder constructed and started nothing until beginLine(). If
    // this is empty, the first word of line one is being encoded into a
    // recorder that does not exist yet.
    expect(events.filter(e => e.kind === 'start')).toHaveLength(1)

    r.beginLine()
    // Opening a line must not touch the recorder at all — it is a mark, not a
    // capture edge.
    expect(events.filter(e => e.kind === 'start')).toHaveLength(1)
    expect(events.filter(e => e.kind === 'stop')).toHaveLength(0)
  })

  it('starts the next recorder before it stops the one it is replacing', async () => {
    const r = useTapRecorder()
    await r.start()
    r.beginLine()

    const pending = r.endLine()
    // At this instant the replacement is live and the outgoing one is STILL
    // recording. Any ordering other than start-then-stop leaves a hole in the
    // capture exactly where the recordist starts reading the next line.
    const starts = events.filter(e => e.kind === 'start')
    expect(starts).toHaveLength(2)
    expect(events.filter(e => e.kind === 'stop')).toHaveLength(0)
    expect(instances[1].state).toBe('recording')

    await vi.advanceTimersByTimeAsync(TAIL_MS + 100)
    await pending

    const stops = events.filter(e => e.kind === 'stop')
    expect(stops).toHaveLength(1)
    expect(stops[0].id).toBe(0)                 // the outgoing one, not the new one
    const startOfReplacement = starts.find(e => e.id === 1)
    expect(startOfReplacement.at).toBeLessThanOrEqual(stops[0].at)
  })

  it('keeps recording for a real tail after the line is closed', async () => {
    const r = useTapRecorder()
    await r.start()
    r.beginLine()

    const closedAt = Date.now()
    const pending = r.endLine()

    // Half a tail in, nothing has been cut yet.
    await vi.advanceTimersByTimeAsync(TAIL_MS / 2)
    expect(events.filter(e => e.kind === 'stop')).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(TAIL_MS / 2 + 100)
    const blob = await pending
    const stop = events.find(e => e.kind === 'stop')
    expect(stop.at - closedAt).toBeGreaterThanOrEqual(TAIL_MS)
    expect(blob).toBeTruthy()
  })

  it('gives every line of a run its own blob, from its own recorder', async () => {
    const r = useTapRecorder()
    await r.start()

    const blobs = []
    for (let line = 0; line < 3; line++) {
      r.beginLine()
      const pending = r.endLine()
      await vi.advanceTimersByTimeAsync(TAIL_MS + 100)
      blobs.push(await pending)
    }

    expect(blobs.filter(Boolean)).toHaveLength(3)
    // Three lines, four recorders: one per line plus the one left live and
    // warming up the pre-roll for whatever comes next.
    expect(instances).toHaveLength(4)
    expect(instances[3].state).toBe('recording')
  })

  // What this pins is only that the stream is never unobserved across a
  // re-read. Whether the replacement recorder actually HOLDS any audio at that
  // moment — which is what decides whether the re-take gets trimmed like a
  // first take — is the block at the bottom of this file.
  it('re-reading a line hands over too, so the stream is never unobserved', async () => {
    const r = useTapRecorder()
    await r.start()
    r.beginLine()

    await r.discardLine()

    // The discarded recorder is stopped and another is already running for the
    // re-read. With no meter there is no clean standby to promote, so this is
    // the fresh-recorder fallback — the old behaviour, kept deliberately.
    expect(events.filter(e => e.kind === 'start')).toHaveLength(2)
    expect(events.filter(e => e.kind === 'stop').map(e => e.id)).toEqual([0])
    expect(instances[1].state).toBe('recording')
  })
})

// THE RE-READ GETS THE SAME LEAD-IN AS A FIRST READ.
//
// The tests above pin that a replacement recorder is running at the boundary.
// They cannot see the defect that mattered, because "running" and "holding
// audio" are not the same thing: a recorder constructed at the instant of the
// boundary is running and holds nothing, and the clip it produces starts at the
// tap. A first take survives that because the recordist spends a second or two
// reading the line before speaking. A re-read does not — they already know the
// line — so it began flush against its own first syllable.
//
// So these tests measure the AGE of the recorder that ends up holding the take,
// which is the only thing the trim can spend. Same fake MediaRecorder, plus a
// fake meter, because the standby is maintained from the meter's own reading of
// whether the room is talking.
describe('a re-read has as much lead-in as a first read', () => {
  let rafCb = null
  let amp = 0.002

  function fakeAnalyser() {
    return {
      fftSize: 1024,
      getFloatTimeDomainData(buf) { for (let i = 0; i < buf.length; i++) buf[i] = amp },
    }
  }

  beforeEach(() => {
    rafCb = null
    amp = 0.002
    const ctx = {
      state: 'running',
      resume: async () => {},
      close: async () => {},
      createMediaStreamSource: () => ({ connect: () => {} }),
      createAnalyser: fakeAnalyser,
    }
    const AC = function () { return ctx }
    vi.stubGlobal('AudioContext', AC)
    vi.stubGlobal('window', { AudioContext: AC })
    vi.stubGlobal('requestAnimationFrame', (cb) => { rafCb = cb; return 1 })
  })

  // Run the meter for `ms` of wall time at a given peak: quiet room by default,
  // a read when `level` is up over the speech floor.
  async function pump(ms, level) {
    amp = level
    for (let t = 0; t < ms; t += 20) {
      await vi.advanceTimersByTimeAsync(20)
      if (rafCb) { const cb = rafCb; rafCb = null; cb() }
    }
  }

  const QUIET = 0.002
  const SPEECH = 0.25

  function nowRecording() {
    return instances.filter(i => i.state === 'recording')
  }
  function startedAt(inst) {
    return events.find(e => e.kind === 'start' && e.id === inst.id).at
  }

  it('opens the re-read on a recorder that has been capturing the room for a while', async () => {
    const r = useTapRecorder()
    await r.start()
    await pump(1500, QUIET)
    r.beginLine()
    await pump(800, SPEECH)      // the read he is about to reject
    await pump(600, QUIET)       // a beat, then he taps Again

    const tapAt = Date.now()
    await r.discardLine()

    // Exactly one recorder is live: the one now holding the re-read.
    const live = nowRecording()
    expect(live).toHaveLength(1)
    // And it has been capturing since the room went quiet after the rejected
    // read — a real lead-in, not the instant of the tap. A recorder made at the
    // tap would score 0 here, which is what shipped a 0ms head margin.
    expect(tapAt - startedAt(live[0])).toBeGreaterThanOrEqual(500)
  })

  it('gives a first read no more lead-in than the re-read gets', async () => {
    const r = useTapRecorder()
    await r.start()
    await pump(1500, QUIET)
    r.beginLine()
    await pump(800, SPEECH)
    await pump(600, QUIET)

    const tapAt = Date.now()
    const pending = r.endLine()
    const live = nowRecording().filter(i => i.state === 'recording')
    // The outgoing one is still running for its tail, so the newest live
    // recorder is the one the next line will use.
    const next = live[live.length - 1]
    expect(tapAt - startedAt(next)).toBeGreaterThanOrEqual(500)
    await vi.advanceTimersByTimeAsync(TAIL_MS + 100)
    await pending
  })

  it('never promotes a recorder that has heard the read it is replacing', async () => {
    const r = useTapRecorder()
    await r.start()
    await pump(1500, QUIET)
    r.beginLine()
    // Talking right up to the tap: there is no clean room tone to hand over, so
    // the only honest thing is a fresh recorder. Never worse than before — but
    // it must never be the standby, which is holding that read.
    await pump(900, SPEECH)

    const tapAt = Date.now()
    await r.discardLine()
    // The newest recorder is the one holding the re-read, and it was made right
    // here — the standby was holding the rejected read, so it was not promoted.
    const holder = instances[instances.length - 1]
    expect(holder.state).toBe('recording')
    expect(startedAt(holder)).toBe(tapAt)
    // And the soiled standby is thrown away the moment the room goes quiet,
    // rather than lingering to be promoted at the next boundary.
    const soiledId = holder.id - 1
    await pump(200, QUIET)
    expect(instances[soiledId].state).toBe('inactive')
  })

  it('keeps a full pre-roll behind the active recorder while a line sits unread', async () => {
    const r = useTapRecorder()
    await r.start()
    r.beginLine()
    // Twelve seconds of a recordist reading the line off the screen in silence.
    // The roll-over keeps clips from growing without bound; what it must not do
    // is leave the active recorder empty at any instant, because a read begun
    // just after a roll then has nothing in front of it.
    for (let i = 0; i < 40; i++) {
      await pump(300, QUIET)
      const live = nowRecording()
      expect(live.length).toBeGreaterThan(0)
    }
    // Now he reads. Whatever the roll-over did, the recorder holding this take
    // was capturing well before the first word.
    const speakAt = Date.now()
    const holder = nowRecording()[0]
    expect(speakAt - startedAt(holder)).toBeGreaterThanOrEqual(800)
  })
})
