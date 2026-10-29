// A BLIP IS NOT A READ (Aran, staging, 2026-10-28 12:45:44 GMT, line S1271L02U03; jobs #909, #915).
// One -30 dB knock and no read, and the line moved on by itself 1.2 s later: in his room both
// meter floors sit at -34 dBFS, one ~16 ms frame over that set "this line has speech", and the
// quiet clock did the rest. The server refused the take (no speech) and he had to go back.
//
// Auto-advance now also needs MIN_VOICED_MS of the line to have been voiced. Same harness as
// RecordistRoom.uploadDrain.test.js: the real RecordistRoom, the real useTapRecorder on a fake
// mic one animation frame at a time, the real upload queue; only the browser's edges are faked.
// The phantom below is his take's own shape: two meter frames at 0.0435 in a quiet room.
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
  const server = { held: [], uploads: [], forms: [], refuse: new Set() }
  global.fetch = vi.fn(async (url, init = {}) => {
    const u = String(url)
    if ((init.method || 'GET') === 'POST' && u.endsWith(`/api/recording/voice/${VOICE}/take`)) {
      const lineId = init.body.get('lineId')
      server.uploads.push(lineId)
      server.forms.push(init.body)
      if (server.refuse.has(lineId)) {
        return { ok: false, status: 422, headers: { get: () => null }, json: async () => ({ error: "We couldn't hear your voice on that one - it sounded like background noise. Please try again somewhere quiet.", noSpeech: true, reason: 'steady_noise_no_speech' }) }
      }
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

async function blip() { await frame(0.0435); await frame(0.0435) }

describe('a blip does not move the line on; a read does (job #915)', () => {
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
    for (let i = 0; i < 200 && !w.find('.ctl-next').exists(); i++) await frame(ROOM(i))
    await room(1000)
    expect(currentLine(w)).toBe('Bore da.')
  })
  afterEach(() => { w.unmount(); vi.useRealTimers(); vi.unstubAllGlobals() })

  it('one blip then silence: the line stays put', async () => {
    await blip()
    const took = await quietUntilAdvance(w, { limitMs: 4000 })
    expect(took, 'moved on after a blip').toBe(Infinity)
    expect(currentLine(w)).toBe('Bore da.')
    expect(server.uploads).toEqual([])
  })

  it('a blip, then he reads: it moves on 1.2 s after the read', async () => {
    await blip()
    await room(2000)
    await read(1500)
    const took = await quietUntilAdvance(w)
    expect(took).toBeLessThan(ADVANCE_AT_MS + 200)
    expect(currentLine(w)).toBe('Prynhawn da.')
  })

  it('a normal read moves on 1.2 s after it, and the take says how much was voiced', async () => {
    await read(1500)
    const took = await quietUntilAdvance(w)
    expect(took).toBeLessThan(ADVANCE_AT_MS + 200)
    expect(currentLine(w)).toBe('Prynhawn da.')
    for (let i = 0; i < 100 && !server.forms.length; i++) await frame(ROOM(i))
    const voiced = Number(server.forms[0].get('voicedMs'))
    // 1500 ms of read, 5 frames in 8 over the floor: ~930 ms voiced.
    expect(voiced).toBeGreaterThan(800)
    expect(voiced).toBeLessThan(1100)
    await settleUploads(server)
  })

  it('a tap still moves on from a line with only a blip on it', async () => {
    await blip()
    await room(300)
    await w.find('.ctl-next').trigger('click')
    await flushPromises()
    expect(currentLine(w)).toBe('Prynhawn da.')
  })

  // A take refused for having no speech on it is a small grey note, never a red bar (Aran uses
  // light mode; nothing red over the reading area).
  it('a no-speech refusal shows a small grey note, not the red re-record bar', async () => {
    server.refuse.add('L0')
    await read(1500)
    await quietUntilAdvance(w)
    for (let i = 0; i < 200 && !w.find('[data-test=refused-summary]').exists(); i++) await frame(ROOM(i))
    const note = w.find('[data-test=refused-summary]')
    expect(note.exists()).toBe(true)
    expect(note.classes()).toContain('quiet')
    expect(note.text()).toContain('No speech heard on 1 line')
    expect(note.text()).not.toMatch(/re-recording/)
  })
})
