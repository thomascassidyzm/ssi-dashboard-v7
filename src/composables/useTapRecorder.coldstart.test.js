// THE FIRST LINE OF A SESSION HAS NO STANDBY TO PROMOTE.
//
// #104 measured the real defect: a clip's lead-in is nothing but the AGE OF THE
// RECORDER at the first word. The trim asks audio-processor.cjs for a 0.35s
// margin and can only ever be handed what the capture already holds. Inside a
// session that is now solved — a standby recorder runs through the quiet and
// every boundary promotes it — but at a cold start there is no prior quiet to
// have captured, so the very first take of a session was the one clip in the
// day guaranteed to arrive flush against its own first syllable.
//
// So these tests measure AGE, and nothing else. Age is the only currency the
// trim can spend, and an assertion on age is the one that would have caught
// this in the first place.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useTapRecorder, COLD_START_SETTLE_MS, PRE_ROLL_MIN_MS, TAIL_MS } from './useTapRecorder'

// What the processing step asks for outside the read, at each end
// (TRIM_MARGIN_SEC, services/audio-processor.cjs). Duplicated here on purpose:
// if that number ever rises above what the booth settles for, this fails.
const TRIM_MARGIN_MS = 350

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
    mediaDevices: { getUserMedia: async () => fakeStream(), enumerateDevices: async () => [] },
  })
  vi.stubGlobal('AudioContext', undefined)
  vi.stubGlobal('requestAnimationFrame', () => 0)
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('the first take of a session has a lead-in too', () => {
  it('holds the line back until the recorder is older than the trim margin', async () => {
    const r = useTapRecorder()
    await r.start()

    // The moment the mic is granted, the recorder that would take the first
    // take holds nothing at all. This is the defect, stated as a number.
    expect(r.activeAgeMs()).toBe(0)

    let revealedAt = null
    const settling = r.awaitLeadIn().then(() => { revealedAt = Date.now() })

    // Halfway through the settling period the line is still not on screen.
    await vi.advanceTimersByTimeAsync(COLD_START_SETTLE_MS / 2)
    expect(revealedAt).toBeNull()

    await vi.advanceTimersByTimeAsync(COLD_START_SETTLE_MS)
    await settling
    expect(revealedAt).not.toBeNull()

    // THE ASSERTION. The recorder that will hold the first take is this old at
    // the instant the recordist is first shown anything to read — so even a
    // read begun in the same breath as the reveal has this much room in front
    // of it, and the trim gets its margin out of audio that exists.
    const openedLineAt = Date.now()
    r.beginLine()
    const firstTakeRecorder = events.find(e => e.kind === 'start' && e.id === 0)
    const ageAtFirstWord = openedLineAt - firstTakeRecorder.at
    expect(ageAtFirstWord).toBeGreaterThanOrEqual(COLD_START_SETTLE_MS)
    expect(ageAtFirstWord).toBeGreaterThan(TRIM_MARGIN_MS)

    // And the take really does come off that recorder, not a later one.
    const pending = r.endLine()
    await vi.advanceTimersByTimeAsync(TAIL_MS + 100)
    const blob = await pending
    expect(await blob.text()).toBe('take-0')
  })

  it('settles for exactly the floor the steady state already guarantees', () => {
    // Not a number picked for this fix: the same floor every boundary inside a
    // session gets, so the first clip and the two-hundredth are trimmed out of
    // the same amount of room.
    expect(COLD_START_SETTLE_MS).toBe(PRE_ROLL_MIN_MS)
    expect(COLD_START_SETTLE_MS).toBeGreaterThan(TRIM_MARGIN_MS)
  })

  it('never makes her wait for something we already have', async () => {
    const r = useTapRecorder()
    await r.start()

    // A recorder that has already been running through the quiet — which is
    // what #104's standby promotion hands every boundary inside a session.
    await vi.advanceTimersByTimeAsync(COLD_START_SETTLE_MS + 500)

    const before = Date.now()
    const age = await r.awaitLeadIn()
    expect(Date.now() - before).toBe(0)          // no settling period at all
    expect(age).toBeGreaterThanOrEqual(COLD_START_SETTLE_MS)
  })

  it('does not spawn a second recorder to do it — the mic that opened is the mic that records', async () => {
    const r = useTapRecorder()
    await r.start()
    const settling = r.awaitLeadIn()
    await vi.advanceTimersByTimeAsync(COLD_START_SETTLE_MS + 50)
    await settling

    // No meter in this environment, so no standby is spawned; the settling
    // period must not itself be a hand-over, or it would reset the very age it
    // is waiting for.
    expect(events.filter(e => e.kind === 'start')).toHaveLength(1)
    expect(events.filter(e => e.kind === 'stop')).toHaveLength(0)
  })
})
