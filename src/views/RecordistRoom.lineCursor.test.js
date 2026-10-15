// ONE CURSOR IN A BATCH (Aran, live on popty.app, 2026-10-15 15:02 BST):
//
//   "when I navigate backwards inside a batch it lets me at first, then when I
//   click Next it jumps to the next item after the last one I recorded ... and I
//   go back again, I go back all the way to the furthest back I went. So there's
//   no way to get back to the phrase I wanted to re-record about six phrases back."
//
// The cause was two notions of position: Next scanned for the next line not yet
// recorded (so it leapt over the five recorded lines he had just come back over),
// and Back popped a stack of the lines he had walked (so after that leap it
// returned him to the bottom of the old stack). These tests pin the one cursor
// that replaced both. They drive the real component with a mocked mic and a
// mocked take queue: nothing here records or uploads anything.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const queued = vi.hoisted(() => [])
const savedTakes = vi.hoisted(() => new Map())
const mic = vi.hoisted(() => ({ speech: null, endLine: null }))

vi.mock('@/composables/useRecordistQueue', () => ({
  DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
  useRecordistQueue: () => ({
    persistent: ref(true), carriedOverCount: ref(0), refusedCount: ref(0),
    isUnsent: () => false, attach: vi.fn(), teardown: vi.fn(), reset: vi.fn(),
    queueTake: (take) => { queued.push(take); savedTakes.set(take.lineId, true) },
    markFailed: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: savedTakes, failed: new Map(),
    flush: vi.fn(), retryFailed: vi.fn(),
  }),
}))

vi.mock('@/composables/useTapRecorder', async () => {
  const { ref: vref } = await import('vue')
  mic.speech = vref(true)
  return {
    DEFAULT_CAPTURE_PROFILE: 'voice',
    resolveCaptureProfile: () => 'phone',
    useTapRecorder: () => ({
      isRecording: vref(true), level: vref(0.3), clipping: vref(false),
      devices: vref([]), appliedSettings: vref({}), profile: vref('voice'), error: vref(null),
      lineHasSpeech: mic.speech, quietMs: vref(0), meterTrusted: vref(true),
      inputPeak: vref(0.4), roomTone: vref(0.001),
      listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
      awaitLeadIn: vi.fn().mockResolvedValue(undefined),
      beginLine: vi.fn(),
      endLine: vi.fn(() => (mic.endLine ? mic.endLine() : Promise.resolve(new Blob([new Uint8Array(4096)], { type: 'audio/webm' })))),
      discardLine: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
    }),
  }
})

import RecordistRoom from './RecordistRoom.vue'

// Twelve lines, none recorded: a fresh batch he is reading top to bottom.
const N = 12
function makeLines() {
  return Array.from({ length: N }, (_, k) => ({
    id: `L${k + 1}`, order: k + 1, text: `llinell ${k + 1}`, knownText: `line ${k + 1}`, recorded: false, clipUrl: null,
  }))
}
function stubQueue(lines = makeLines()) {
  global.fetch = vi.fn().mockImplementation(() => Promise.resolve({
    ok: true, status: 200,
    json: async () => ({ displayName: 'Test Voice', languageName: 'Welsh', total: lines.length, recorded: 0, remaining: lines.length, lines }),
  }))
}

let clock = 1_000_000
async function tap(wrapper, sel) {
  clock += 400
  await wrapper.find(sel).trigger('click')
  await flushPromises()
}
const next = (w) => tap(w, '.ctl-next')
const back = (w) => tap(w, '.ctl-back')
const onLine = (w) => w.find('.line-target').text()

async function mountAndStart() {
  const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_test_zzz' } })
  await flushPromises()
  await wrapper.find('.btn-begin').trigger('click')
  await flushPromises()
  return wrapper
}
// He reads lines 1..k and moves on after each.
async function readThrough(wrapper, k) {
  for (let j = 0; j < k; j++) await next(wrapper)
}

describe('RecordistRoom — one cursor: back six, re-record, carry on from there', () => {
  beforeEach(() => {
    queued.length = 0; savedTakes.clear(); localStorage.clear()
    mic.speech.value = true; mic.endLine = null
    stubQueue()
    clock = 1_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => clock)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('back 6 → record → lands on the line after the one re-recorded, not on the first unrecorded', async () => {
    const w = await mountAndStart()
    await readThrough(w, 9) // lines 1-9 read; standing on line 10
    expect(onLine(w)).toBe('llinell 10')
    for (let j = 0; j < 6; j++) await back(w)
    expect(onLine(w)).toBe('llinell 4')
    await next(w) // reads line 4 again and moves on
    expect(onLine(w)).toBe('llinell 5')
    await next(w) // and the one after that, too
    expect(onLine(w)).toBe('llinell 6')
  })

  it('back and forward move exactly one line and never jump', async () => {
    const w = await mountAndStart()
    await readThrough(w, 9)
    mic.speech.value = false // walking, not reading
    for (let j = 0; j < 6; j++) await back(w)
    expect(onLine(w)).toBe('llinell 4')
    await next(w); expect(onLine(w)).toBe('llinell 5')
    await back(w); expect(onLine(w)).toBe('llinell 4')
    await back(w); expect(onLine(w)).toBe('llinell 3')
    await next(w); await next(w); await next(w)
    expect(onLine(w)).toBe('llinell 6')
    // and the screen says where the cursor is and what that line holds
    expect(w.find('[data-test="line-pos"]').text()).toContain('Line 6 of 12')
    expect(w.find('[data-test="line-state"]').text()).toBe('saved')
  })

  it('walking across a saved line files nothing on it', async () => {
    const w = await mountAndStart()
    await readThrough(w, 5)
    const before = queued.length
    mic.speech.value = false
    for (let j = 0; j < 3; j++) await back(w)
    await next(w); await next(w)
    expect(queued.length).toBe(before)
  })

  it('a re-record replaces the take of the right line', async () => {
    const w = await mountAndStart()
    await readThrough(w, 9)
    for (let j = 0; j < 6; j++) await back(w)
    queued.length = 0
    await next(w)
    expect(queued.map(t => t.lineId)).toEqual(['L4'])
    expect(queued[0].text).toBe('llinell 4')
  })

  it('"Jump to next unrecorded" is the one control that skips ahead', async () => {
    const w = await mountAndStart()
    await readThrough(w, 9)
    mic.speech.value = false
    for (let j = 0; j < 6; j++) await back(w)
    const jump = w.find('[data-test="jump-unrecorded"]')
    expect(jump.text()).toContain('line 10')
    await tap(w, '[data-test="jump-unrecorded"]')
    expect(onLine(w)).toBe('llinell 10')
  })

  it('a tap on a rail square puts the cursor on that line', async () => {
    const w = await mountAndStart()
    await readThrough(w, 9)
    clock += 400
    await w.findAll('[data-test="rail"] li')[2].trigger('click')
    await flushPromises()
    expect(onLine(w)).toBe('llinell 3')
    await next(w)
    expect(onLine(w)).toBe('llinell 4')
  })

  it('the cursor survives a reload of the batch', async () => {
    const w = await mountAndStart()
    await readThrough(w, 3)
    // Walking forward over unrecorded lines files nothing, so line 7 is still owed.
    mic.speech.value = false
    for (let j = 0; j < 3; j++) await next(w)
    expect(onLine(w)).toBe('llinell 7')
    w.unmount()
    // A fresh page: the ready card and Start open on the line he left.
    const w2 = mount(RecordistRoom, { props: { voiceId: 'human_test_zzz' } })
    await flushPromises()
    expect(w2.find('[data-test="ready-line"]').text()).toBe('llinell 7')
    await w2.find('.btn-begin').trigger('click')
    await flushPromises()
    expect(onLine(w2)).toBe('llinell 7')
  })

  it('a take whose line is rearranged under its tail is never filed under another line', async () => {
    const w = await mountAndStart()
    await readThrough(w, 3) // standing on line 4
    let land
    mic.endLine = () => new Promise(r => { land = r })
    queued.length = 0
    await next(w) // closes line 4; the blob has not landed yet
    // The batch is reloaded in a different order before the tail finishes.
    w.vm.lines = [...w.vm.lines].reverse()
    land(new Blob([new Uint8Array(4096)], { type: 'audio/webm' }))
    await flushPromises()
    expect(queued.map(t => t.lineId)).toEqual(['L4'])
    expect(queued[0].text).toBe('llinell 4')
  })
})
