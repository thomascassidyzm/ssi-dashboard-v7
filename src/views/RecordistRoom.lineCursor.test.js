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
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'

const queued = vi.hoisted(() => [])
const savedTakes = vi.hoisted(() => new Map())
const mic = vi.hoisted(() => ({ speech: null, quiet: null, endLine: null }))

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
  mic.quiet = vref(0)
  return {
    DEFAULT_CAPTURE_PROFILE: 'voice',
    resolveCaptureProfile: () => 'phone',
    useTapRecorder: () => ({
      isRecording: vref(true), level: vref(0.3), clipping: vref(false),
      devices: vref([]), appliedSettings: vref({}), profile: vref('voice'), error: vref(null),
      lineHasSpeech: mic.speech, quietMs: mic.quiet, meterTrusted: vref(true),
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

// Every booth in this file shares one fake mic; a booth left mounted would hear the next test.
enableAutoUnmount(afterEach)

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
    await readThrough(w, 9)
    mic.speech.value = false
    for (let j = 0; j < 6; j++) await back(w)
    expect(onLine(w)).toBe('llinell 4')
    w.unmount()
    // A fresh page: the ready card and Start open on the line he left.
    const w2 = mount(RecordistRoom, { props: { voiceId: 'human_test_zzz' } })
    await flushPromises()
    expect(w2.find('[data-test="ready-line"]').text()).toBe('llinell 4')
    await w2.find('.btn-begin').trigger('click')
    await flushPromises()
    expect(onLine(w2)).toBe('llinell 4')
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


// AGAIN ON THE LAST LINE (Aran, live, 2026-10-15 15:09 BST): he pressed Again on the last line of
// a batch, started reading, paused, and the booth jumped to the finished screen before he had
// finished speaking. Auto-advance had fired on the pause; on the last line "advance" meant
// "finish", and the half-read take was filed. The last line now never moves on by itself.
describe('RecordistRoom — the last line never finishes the batch by itself', () => {
  beforeEach(() => {
    queued.length = 0; savedTakes.clear(); localStorage.clear()
    mic.speech.value = true; mic.quiet.value = 0; mic.endLine = null
    stubQueue()
    clock = 1_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => clock)
  })
  afterEach(() => { vi.restoreAllMocks() })

  async function pauseMidSentence(w) {
    clock += 2000
    mic.quiet.value = 1500
    await flushPromises()
    mic.quiet.value = 0
    await flushPromises()
  }

  it('Again on the last line, then a pause mid-read: still recording that line, nothing filed', async () => {
    const w = await mountAndStart()
    await readThrough(w, N - 1)
    expect(onLine(w)).toBe(`llinell ${N}`)
    queued.length = 0
    clock += 400
    await w.find('.ctl-again').trigger('click'); await flushPromises()
    await pauseMidSentence(w)
    expect(w.find('[data-test="done"]').exists()).toBe(false)
    expect(onLine(w)).toBe(`llinell ${N}`)
    expect(queued.map(t => t.lineId)).toEqual([])
    // He finishes and taps Done himself: the take is filed under the last line, and only now
    // does the finished screen appear.
    expect(w.find('.ctl-next').text()).toBe('Done')
    await next(w)
    expect(queued.map(t => t.lineId)).toEqual([`L${N}`])
    expect(w.find('[data-test="done"]').exists()).toBe(true)
  })

  it('Again from the finished screen on the last line does not end the batch on a pause', async () => {
    const w = await mountAndStart()
    await readThrough(w, N) // Done on the last line → finished screen
    expect(w.find('[data-test="done"]').exists()).toBe(true)
    const again = w.findAll('.again-btn').find(b => b.element.closest('li')?.textContent.includes(`llinell ${N}`))
    expect(again).toBeTruthy()
    await again.trigger('click'); await flushPromises()
    expect(onLine(w)).toBe(`llinell ${N}`)
    queued.length = 0
    await pauseMidSentence(w)
    expect(w.find('[data-test="done"]').exists()).toBe(false)
    expect(queued).toHaveLength(0)
  })

  it('a pause on any other line still moves on by itself, one line', async () => {
    const w = await mountAndStart()
    await readThrough(w, 3)
    await pauseMidSentence(w)
    expect(onLine(w)).toBe('llinell 5')
    expect(queued.at(-1).lineId).toBe('L4')
  })
})

// LINES & SETTINGS AS A READABLE LIST (Aran, 2026-10-15): every line of the batch, one per row,
// numbered, the words and the other language beneath, a dot in the rail's colours; the current
// line highlighted; tapping the words moves the cursor; ▶ plays his take and never moves it.
describe('RecordistRoom — the batch as a list in Lines & settings', () => {
  let played
  beforeEach(() => {
    queued.length = 0; savedTakes.clear(); localStorage.clear()
    mic.speech.value = true; mic.quiet.value = 0; mic.endLine = null
    const lines = makeLines()
    lines[1] = { ...lines[1], recorded: true, clipUrl: '/api/recording/voice/v/line/L2/clip' }
    lines[2] = { ...lines[2], recorded: true, clipUrl: '/api/recording/voice/v/line/L3/clip' }
    stubQueue(lines)
    played = []
    global.Audio = class { constructor() { this.src = '' } play() { played.push(this.src); return Promise.resolve() } pause() {} }
    clock = 1_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => clock)
  })
  afterEach(() => { vi.restoreAllMocks() })

  async function openList() {
    const w = mount(RecordistRoom, { props: { voiceId: 'human_test_zzz' } })
    await flushPromises()
    await w.find('[data-test="open-sheet"]').trigger('click'); await flushPromises()
    return w
  }
  const rows = (w) => w.findAll('[data-test="batch-line"]')

  it('shows every line, numbered, with the words, the other language and a state dot', async () => {
    const w = await openList()
    expect(rows(w)).toHaveLength(N)
    const r2 = rows(w)[1]
    expect(r2.find('.bl-n').text()).toBe('2')
    expect(r2.find('.bl-text').text()).toBe('llinell 2')
    expect(r2.find('.bl-known').text()).toBe('line 2')
    expect(r2.find('.bl-dot').classes()).toContain('saved')
    expect(rows(w)[0].find('.bl-dot').classes()).toContain('not-yet')
    // The current line (Start's line: the first one still owed) is the highlighted row.
    expect(rows(w)[0].classes()).toContain('now')
    // ▶ only where there is a take to hear; Again / Record on every row.
    expect(rows(w)[0].find('[data-test="batch-line-play"]').exists()).toBe(false)
    expect(r2.find('[data-test="batch-line-play"]').exists()).toBe(true)
    expect(r2.find('[data-test="batch-line-record"]').text()).toBe('Again')
    expect(rows(w)[0].find('[data-test="batch-line-record"]').text()).toBe('Record')
    // The grid of squares is tucked away behind its own toggle.
    expect(w.find('.section-map').isVisible()).toBe(false)
  })

  it('tapping a row\'s words moves the cursor there; ▶ plays and does not', async () => {
    const w = await openList()
    await rows(w)[2].find('[data-test="batch-line-play"]').trigger('click'); await flushPromises()
    expect(played).toHaveLength(1)
    expect(played[0]).toContain('L3')
    expect(w.find('[data-test="ready-line"]').text()).toBe('llinell 1')
    expect(rows(w)[0].classes()).toContain('now')

    await rows(w)[6].find('[data-test="batch-line-go"]').trigger('click'); await flushPromises()
    expect(w.find('[data-test="ready-line"]').text()).toBe('llinell 7')
    expect(rows(w)[6].classes()).toContain('now')
    await w.find('.btn-begin').trigger('click'); await flushPromises()
    expect(onLine(w)).toBe('llinell 7')
  })

  it('Again on a row opens the mic on that line', async () => {
    const w = await openList()
    await rows(w)[2].find('[data-test="batch-line-record"]').trigger('click'); await flushPromises()
    expect(onLine(w)).toBe('llinell 3')
  })
})
