// THE OFF-CHAIN SAMPLE GATE (Tom r-2026-10-31, job #428): "check the sample of 10 ... before
// allowing it to do a thousand. But you can't have anything in the chain."
//
// First session ever (no approval stored) and the first session after a recorder change (stored
// approval is for another build): the booth stops itself after 10 saved takes and shows them.
// Approved for this build: it never stops. And the takes it files are exactly the takes it files
// without the gate — same count, same order, same fields — because the gate only observes.
//
// Real component, mocked mic and take queue: nothing records or uploads.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const queued = vi.hoisted(() => [])
const savedTakes = vi.hoisted(() => new Map())
const gate = vi.hoisted(() => ({ approvedBuild: null, approvals: [] }))

vi.mock('@/composables/useRecordistQueue', () => ({
  DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
  useRecordistQueue: () => ({
    persistent: ref(true), carriedOverCount: ref(0), refusedCount: ref(0),
    isUnsent: () => false, unsentBlob: async () => null,
    attach: vi.fn(), teardown: vi.fn(), reset: vi.fn(),
    queueTake: (take) => { queued.push(take); savedTakes.set(take.lineId, true) },
    markFailed: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: savedTakes, failed: new Map(),
    flush: vi.fn(), retryFailed: vi.fn(),
  }),
}))

vi.mock('@/composables/useTapRecorder', async () => {
  const { ref: vref } = await import('vue')
  return {
    DEFAULT_CAPTURE_PROFILE: 'voice',
    resolveCaptureProfile: () => 'phone',
    useTapRecorder: () => ({
      isRecording: vref(true), level: vref(0.3), clipping: vref(false),
      devices: vref([]), appliedSettings: vref({}), profile: vref('voice'), error: vref(null),
      lineHasSpeech: vref(true), quietMs: vref(0), meterTrusted: vref(true),
      inputPeak: vref(0.4), roomTone: vref(0.001),
      listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
      awaitLeadIn: vi.fn().mockResolvedValue(undefined),
      beginLine: vi.fn(),
      endLine: vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)], { type: 'audio/webm' }))),
      discardLine: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
    }),
  }
})

import RecordistRoom from './RecordistRoom.vue'
import { RECORDER_BUILD } from './recordist/sample-gate.js'

const N = 14
const lines = Array.from({ length: N }, (_, k) => ({
  id: `L${k + 1}`, order: k + 1, text: `llinell ${k + 1}`, knownText: `line ${k + 1}`, recorded: false, clipUrl: null,
}))
function stubServer() {
  global.fetch = vi.fn().mockImplementation((url, opts = {}) => {
    const u = String(url)
    if (u.includes('/sample-gate/approve')) {
      gate.approvals.push(JSON.parse(opts.body).build)
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ approvedBuild: JSON.parse(opts.body).build }) })
    }
    if (u.includes('/sample-gate/measure')) return Promise.resolve({ ok: true, status: 200, json: async () => ({ measured: true, hints: [] }) })
    if (u.includes('/sample-gate')) {
      const build = new URL(u, 'http://x').searchParams.get('build')
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ sampleSize: 10, approvedBuild: gate.approvedBuild, needsSample: gate.approvedBuild !== build }) })
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ displayName: 'Test Voice', languageName: 'Welsh', total: N, recorded: 0, remaining: N, lines }) })
  })
}

let clock = 1_000_000
async function tap(w, sel) {
  clock += 400
  await w.find(sel).trigger('click')
  await flushPromises()
}
const isDone = (w) => w.find('[data-test="done"]').exists()
async function startSession() {
  stubServer()
  const w = mount(RecordistRoom, { props: { voiceId: 'human_test_zzz' }, attachTo: document.body })
  await flushPromises()
  await w.find('.btn-begin').trigger('click')
  await flushPromises()
  return w
}
async function readLines(w, n) {
  for (let j = 0; j < n && !isDone(w); j++) await tap(w, '.ctl-next')
}
const takeShape = () => queued.map(t => ({ voiceId: t.voiceId, lineId: t.lineId, text: t.text, size: t.blob.size }))

describe('RecordistRoom — the off-chain sample gate', () => {
  beforeEach(() => {
    queued.length = 0; savedTakes.clear(); localStorage.clear()
    gate.approvedBuild = null; gate.approvals.length = 0
    clock = 1_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => clock)
  })
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = '' })

  it('the build is named (vite define), so the gate can key on it', () => {
    expect(RECORDER_BUILD).toMatch(/^[0-9a-f]{12}$/)
  })

  it('first session ever: stops itself after 10 saved takes and shows them for review', async () => {
    const w = await startSession()
    await readLines(w, 10)
    expect(isDone(w)).toBe(true)
    const card = w.find('[data-test="sample-gate"]')
    expect(card.exists()).toBe(true)
    expect(w.findAll('[data-test="sample-list"] li')).toHaveLength(10)
    // The 11th line was opened, nothing was read on it before the gate's Stop... the mock mic
    // says speech, so Stop files it exactly as the artist's own Stop would.
    expect(queued.length).toBeGreaterThanOrEqual(10)
  })

  it('after a recorder change (approved for another build) it gates again', async () => {
    gate.approvedBuild = 'oldbuild0000'
    const w = await startSession()
    await readLines(w, 10)
    expect(w.find('[data-test="sample-gate"]').exists()).toBe(true)
  })

  it('approved for this build: never stops — reads straight through', async () => {
    gate.approvedBuild = RECORDER_BUILD
    const w = await startSession()
    await readLines(w, 12)
    expect(isDone(w)).toBe(false)
    expect(w.find('[data-test="sample-gate"]').exists()).toBe(false)
    expect(queued).toHaveLength(12)
  })

  it('approve: stores this build and carries on into the bulk without stopping again', async () => {
    const w = await startSession()
    await readLines(w, 10)
    await tap(w, '[data-test="sample-approve"]')
    expect(gate.approvals).toEqual([RECORDER_BUILD])
    expect(isDone(w)).toBe(false)
    expect(w.find('.ctl-next').exists()).toBe(true)
    const before = queued.length
    await readLines(w, 2)
    expect(queued.length).toBe(before + 2)
    expect(w.find('[data-test="sample-gate"]').exists()).toBe(false)
  })

  it('redo: reopens the first sample line and records them again', async () => {
    const w = await startSession()
    await readLines(w, 10)
    await tap(w, '[data-test="sample-redo"]')
    expect(isDone(w)).toBe(false)
    expect(w.find('.line-target').text()).toBe('llinell 1')
    expect(gate.approvals).toEqual([])
  })

  it('never alters the take-saving path: the first 10 takes are filed identically with and without the gate', async () => {
    gate.approvedBuild = RECORDER_BUILD
    let w = await startSession()
    await readLines(w, 10)
    const ungated = takeShape().slice(0, 10)
    w.unmount(); document.body.innerHTML = ''
    queued.length = 0; savedTakes.clear(); localStorage.clear()
    gate.approvedBuild = null
    w = await startSession()
    await readLines(w, 10)
    expect(takeShape().slice(0, 10)).toEqual(ungated)
  })

  it('a gate that cannot be read never stops anyone (fails open)', async () => {
    stubServer()
    const base = global.fetch
    global.fetch = vi.fn((url, opts) => (String(url).includes('/sample-gate') ? Promise.reject(new Error('down')) : base(url, opts)))
    const w = mount(RecordistRoom, { props: { voiceId: 'human_test_zzz' }, attachTo: document.body })
    await flushPromises()
    await w.find('.btn-begin').trigger('click'); await flushPromises()
    await readLines(w, 12)
    expect(isDone(w)).toBe(false)
  })
})
