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

  it('re-reading a line hands over too, so the retake has pre-roll as well', async () => {
    const r = useTapRecorder()
    await r.start()
    r.beginLine()

    await r.discardLine()

    // The discarded recorder is stopped, and a fresh one is already running for
    // the re-read — a re-read that started capture from cold would clip its
    // first word exactly as the original did.
    expect(events.filter(e => e.kind === 'start')).toHaveLength(2)
    expect(events.filter(e => e.kind === 'stop').map(e => e.id)).toEqual([0])
    expect(instances[1].state).toBe('recording')
  })
})
