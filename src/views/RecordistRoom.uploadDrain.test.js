// DOES THE UPLOAD QUEUE EMPTYING HOLD A LINE? (Aran, 2026-10-26, job #69)
//
// His observation, mid-session on the staging booth: "the delays only happen when the uploading
// has caught up to the previously recorded item: every time the uploading catches up, I'm
// getting delays." #868 (e2e/booth-slow-advance) held every take for 6 s, so its queue never
// emptied mid-line; it proved a SLOW upload does not gate advance, not that the moment the
// queue DRAINS does not.
//
// So this test stages that moment exactly, over the whole real chain: the real RecordistRoom,
// the real useTapRecorder fed by a fake microphone one animation frame at a time, and the real
// useRecordistQueue on a memory shelf. Only the browser's edges are faked (getUserMedia, the
// AudioContext analyser, MediaRecorder, requestAnimationFrame, fetch). The previous line's
// upload is HELD by the test and released at a chosen instant inside the next line — during
// the read, at the start of the quiet, and just before the advance mark — so the queue goes
// to empty there. The line must still move on 1.2 s after the read ends, every time.
//
// If a future change makes an upload completing touch the recorder, the advance watcher, or
// anything that holds the main thread for a beat, the drain cases fail here and the no-drain
// control does not.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const shelf = vi.hoisted(() => ({ backend: null }))
vi.mock('@/services/takeStore', async (importOriginal) => {
  const orig = await importOriginal()
  return { ...orig, openTakeStore: async (opts = {}) => orig.createTakeStore(shelf.backend, opts) }
})

import { createMemoryBackend } from '@/services/takeStore'
import RecordistRoom from './RecordistRoom.vue'

const VOICE = 'human_aran_cym_n'
const LINES = ['Bore da.', 'Prynhawn da.', 'Nos da.', 'Hwyl fawr.', 'Diolch.'].map((text, i) => ({ id: `L${i}`, text, knownText: `known ${i}` }))
const FRAME_MS = 16
const ADVANCE_AT_MS = 1200 // AUTO_ADVANCE_QUIET_MS in RecordistRoom.vue

// ── The microphone and the browser's audio edges ────────────────────────────
let level = 0
let rafQueue = []
class FakeMediaRecorder {
  static isTypeSupported() { return true }
  constructor() { this.state = 'inactive'; this.ondataavailable = null; this.onstop = null }
  start() { this.state = 'recording' }
  stop() {
    this.state = 'inactive'
    // A real take: well over the 1200-byte floor commit() applies.
    this.ondataavailable?.({ data: new Blob([new Uint8Array(4096)], { type: 'audio/webm' }) })
    this.onstop?.()
  }
}
class FakeAudioContext {
  constructor() { this.state = 'running' }
  async resume() {}
  async close() {}
  createMediaStreamSource() { return { connect() {} } }
  createAnalyser() {
    return { fftSize: 1024, getFloatTimeDomainData(buf) { for (let i = 0; i < buf.length; i++) buf[i] = i % 2 ? level : -level } }
  }
}
const track = { applyConstraints: async () => {}, getSettings: () => ({ sampleRate: 48000 }), stop: () => {} }

// ── The server: every take POST is held until the test releases it ─────────
function fakeServer() {
  const server = { held: [], uploads: [], forms: [] }
  global.fetch = vi.fn(async (url, init = {}) => {
    const u = String(url)
    if ((init.method || 'GET') === 'POST' && u.endsWith(`/api/recording/voice/${VOICE}/take`)) {
      const lineId = init.body.get('lineId')
      server.uploads.push(lineId)
      server.forms.push(init.body)
      return new Promise((resolve) => {
        server.held.push({ lineId, release: () => resolve({ ok: true, status: 200, headers: { get: () => null }, json: async () => ({ audioId: `aud-${lineId}`, clipUrl: null }) }) })
      })
    }
    if (u.includes(`/api/recording/voice/${VOICE}?`)) {
      const lines = LINES.map((l, i) => ({ ...l, order: i + 1, speaker: 'Aran', courseCode: 'cym_n_for_eng', kind: 'pod', podSlug: 'senedd', recorded: false, clipUrl: null }))
      return { ok: true, status: 200, json: async () => ({ displayName: 'Aran', languageName: 'Welsh', total: lines.length, recorded: 0, remaining: lines.length, lines }) }
    }
    // Everything else the page polls (text checks) has nothing to say here.
    return { ok: true, status: 200, json: async () => ({ items: [] }) }
  })
  return server
}

// ── Driving time ─────────────────────────────────────────────────────────────
// One animation frame: set the mic level, run every rAF callback the page has queued (the
// meter and the waveform), move the clock one frame, and let Vue's watchers flush.
async function frame(p) {
  level = p
  const due = rafQueue; rafQueue = []
  for (const cb of due) cb(Date.now())
  vi.advanceTimersByTime(FRAME_MS)
  await flushPromises()
}
const msFrames = ms => Math.round(ms / FRAME_MS)
const ROOM = i => 0.002 + 0.004 * Math.abs(Math.sin(((i % 12) / 11) * Math.PI * 2))
async function room(ms) { for (let i = 0; i < msFrames(ms); i++) await frame(ROOM(i)) }
async function read(ms) { for (let i = 0; i < msFrames(ms); i++) await frame(i % 8 < 5 ? 0.05 : 0.0015) }

function currentLine(w) { const el = w.find('.line-target'); return el.exists() ? el.text() : null }

// Room tone after a read, frame by frame, until the line on the stage changes; how long that
// took, and whether `onEvent(msIntoQuiet)` fired its drain inside the window.
async function quietUntilAdvance(w, { onEvent = null, limitMs = 6000 } = {}) {
  const before = currentLine(w)
  const t0 = Date.now()
  for (let i = 0; i < msFrames(limitMs); i++) {
    if (onEvent) await onEvent(Date.now() - t0)
    await frame(ROOM(i))
    if (currentLine(w) !== before) return Date.now() - t0
  }
  return Infinity
}

async function settleUploads(server) {
  while (server.held.length) { server.held.shift().release(); await flushPromises() }
}

describe('a line moves on 1.2 s after the read, whenever the upload queue empties (job #69)', () => {
  let server, w
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    localStorage.clear()
    shelf.backend = createMemoryBackend()
    server = fakeServer()
    rafQueue = []
    vi.stubGlobal('requestAnimationFrame', (cb) => { rafQueue.push(cb); return rafQueue.length })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
    window.AudioContext = FakeAudioContext
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => ({ getAudioTracks: () => [track], getTracks: () => [track] }), enumerateDevices: async () => [] },
    })
    w = mount(RecordistRoom, { props: { voiceId: VOICE }, global: { stubs: { RouterLink: { template: '<a><slot/></a>' } } } })
    for (let i = 0; i < 200 && !w.find('.btn-begin').exists(); i++) { vi.advanceTimersByTime(10); await flushPromises() }
    await w.find('.btn-begin').trigger('click')
    await flushPromises()
    // The cold-start lead-in: room tone until the first line is on the stage and open.
    for (let i = 0; i < 200 && !w.find('.ctl-next').exists(); i++) await frame(ROOM(i))
    await room(1000)
    expect(currentLine(w)).toBe('Bore da.')
  })
  afterEach(() => { w.unmount(); vi.useRealTimers(); vi.unstubAllGlobals() })

  // Line 1 is read and moves on; its take goes up and is held. Line 2 is read; the hold on
  // line 1's take is released at `drainAt` — after which nothing is left in the queue.
  async function lineTwoWithDrain(drainAt) {
    await read(1500)
    const first = await quietUntilAdvance(w)
    expect(first, 'line 1 moved on by itself').toBeLessThan(ADVANCE_AT_MS + 200)
    expect(currentLine(w)).toBe('Prynhawn da.')
    // Line 1's take is on the wire, held. Anything earlier is not.
    for (let i = 0; i < 100 && !server.held.length; i++) await frame(ROOM(i))
    expect(server.held.map(h => h.lineId)).toEqual(['L0'])
    let drainedAtMs = null
    const drain = async () => {
      // Nothing else is on the wire or the shelf: line 2's take is not closed until it moves on.
      expect(server.uploads).toEqual(['L0'])
      server.held.shift().release()
      await flushPromises()
    }
    if (drainAt === 'during-read') {
      await read(700); await drain(); await read(800)
    } else {
      await read(1500)
    }
    const took = await quietUntilAdvance(w, {
      onEvent: async (ms) => {
        if (typeof drainAt === 'number' && drainedAtMs == null && ms >= drainAt) { drainedAtMs = ms; await drain() }
      },
    })
    return { took, drainedAtMs }
  }

  it('control: no drain inside the line', async () => {
    const { took } = await lineTwoWithDrain(null)
    expect(currentLine(w)).toBe('Nos da.')
    expect(took).toBeLessThan(ADVANCE_AT_MS + 200)
    await settleUploads(server)
  })

  it('the queue empties while he is still reading the line', async () => {
    const { took } = await lineTwoWithDrain('during-read')
    expect(currentLine(w)).toBe('Nos da.')
    expect(took).toBeLessThan(ADVANCE_AT_MS + 200)
  })

  for (const at of [100, 600, 1100]) {
    it(`the queue empties ${at} ms into the quiet after the read`, async () => {
      const { took, drainedAtMs } = await lineTwoWithDrain(at)
      expect(drainedAtMs, 'the drain landed inside the quiet window').not.toBeNull()
      // The queue really is empty at that moment: line 2's take has not been closed yet.
      expect(currentLine(w)).toBe('Nos da.')
      expect(took, `moved on ${took} ms after the read; a drain resetting the quiet clock would make it >= ${drainedAtMs + ADVANCE_AT_MS}`).toBeLessThan(ADVANCE_AT_MS + 200)
    })
  }

  // ADVANCE TELEMETRY (job #99): each take's upload says how its line moved on.
  it('the take says auto or tap, with the gap from speech and the thresholds', async () => {
    await read(1500)
    await quietUntilAdvance(w)
    await read(1500)
    await room(300)
    await w.find('.ctl-next').trigger('click')
    for (let i = 0; i < 200 && server.forms.length < 2; i++) { await settleUploads(server); await frame(ROOM(i)) }
    const [auto, tap] = server.forms
    expect(auto.get('lineId')).toBe('L0')
    expect(auto.get('advanceBy')).toBe('auto')
    expect(Number(auto.get('advanceGapMs'))).toBeGreaterThanOrEqual(ADVANCE_AT_MS - 100)
    expect(Number(auto.get('advanceGapMs'))).toBeLessThan(ADVANCE_AT_MS + 300)
    expect(Number(auto.get('thrQuiet'))).toBeLessThanOrEqual(Number(auto.get('thrSpeech')))
    expect(tap.get('lineId')).toBe('L1')
    expect(tap.get('advanceBy')).toBe('tap')
    expect(Number(tap.get('advanceGapMs'))).toBeLessThan(ADVANCE_AT_MS)
    await settleUploads(server)
  })
})
