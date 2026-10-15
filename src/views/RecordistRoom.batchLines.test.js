// THE BATCH AS A READABLE LIST, AND AGAIN NEVER ENDS THE BATCH (Aran, live on
// popty.app, 2026-10-15).
//
//   1. "Lines & settings" showed the batch only as grey squares you hover to read —
//      useless on a phone. It is a list now: number, Welsh, English small beneath,
//      a status dot, the current line highlighted; a tap on the words moves the
//      cursor, ▶ plays his take without moving it.
//   2. 15:09 BST, batch 5: on the last line he pressed Again, began reading, paused
//      for breath — and the booth jumped to the batch-finished screen before he had
//      finished. Auto-advance on the LAST line called the same step as Done. The
//      finished screen now comes only from a deliberate Done (› past the last line)
//      or Stop; a silence on the last line waits for him.
//
// Real component, mocked mic and take queue: nothing records or uploads.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const queued = vi.hoisted(() => [])
const savedTakes = vi.hoisted(() => new Map())
const mic = vi.hoisted(() => ({ speech: null, quiet: null }))

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
      beginLine: vi.fn(() => { mic.quiet.value = 0 }),
      endLine: vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)], { type: 'audio/webm' }))),
      discardLine: vi.fn(() => { mic.quiet.value = 0; return Promise.resolve() }),
      stop: vi.fn().mockResolvedValue(undefined),
    }),
  }
})

import RecordistRoom from './RecordistRoom.vue'

const N = 5
function makeLines(recorded = []) {
  return Array.from({ length: N }, (_, k) => ({
    id: `L${k + 1}`, order: k + 1, text: `llinell ${k + 1}`, knownText: `line ${k + 1}`,
    recorded: recorded.includes(k + 1), clipUrl: recorded.includes(k + 1) ? `/clip/L${k + 1}` : null,
  }))
}
function stubQueue(lines) {
  global.fetch = vi.fn().mockImplementation(() => Promise.resolve({
    ok: true, status: 200,
    json: async () => ({ displayName: 'Test Voice', languageName: 'Welsh', total: lines.length, recorded: 0, remaining: lines.length, lines }),
  }))
}

let clock = 1_000_000
async function tap(w, sel) {
  clock += 400
  await w.find(sel).trigger('click')
  await flushPromises()
}
const onLine = (w) => w.find('.line-target').text()
const phaseOf = (w) => (w.find('[data-test="done"]').exists() ? 'done' : w.find('.line-target').exists() ? 'recording' : 'ready')
// He has said something on the line and has now been quiet for `ms`.
async function silence(ms) {
  clock += 400
  mic.speech.value = true
  mic.quiet.value = ms
  await flushPromises()
}

async function mountReady(recorded = []) {
  stubQueue(makeLines(recorded))
  const w = mount(RecordistRoom, { props: { voiceId: 'human_test_zzz' }, attachTo: document.body })
  await flushPromises()
  return w
}
async function startOnLast() {
  const w = await mountReady()
  await w.find('.btn-begin').trigger('click')
  await flushPromises()
  for (let j = 0; j < N - 1; j++) await tap(w, '.ctl-next')
  expect(onLine(w)).toBe(`llinell ${N}`)
  return w
}

describe('RecordistRoom — Again on the last line never ends the batch', () => {
  beforeEach(() => {
    queued.length = 0; savedTakes.clear(); localStorage.clear()
    mic.speech.value = true; mic.quiet.value = 0
    clock = 1_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => clock)
  })
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = '' })

  it('Again on the last line, then a pause mid-read: still recording that line', async () => {
    const w = await startOnLast()
    await tap(w, '.ctl-again')
    await silence(1500) // a breath longer than AUTO_ADVANCE_QUIET_MS
    expect(phaseOf(w)).toBe('recording')
    expect(onLine(w)).toBe(`llinell ${N}`)
  })

  it('the last line re-recorded from the done screen does not finish by itself', async () => {
    const w = await startOnLast()
    await tap(w, '.ctl-next') // Done: the finished screen, as he asked
    expect(phaseOf(w)).toBe('done')
    const agains = w.findAll('.again-btn')
    clock += 400
    await agains[agains.length - 1].trigger('click') // Again on the last line
    await flushPromises()
    expect(onLine(w)).toBe(`llinell ${N}`)
    await silence(1500)
    expect(phaseOf(w)).toBe('recording')
  })

  it('auto-advance still moves on from a line that is not the last', async () => {
    const w = await mountReady()
    await w.find('.btn-begin').trigger('click')
    await flushPromises()
    await silence(1500)
    expect(onLine(w)).toBe('llinell 2')
  })

  it('Done past the last line is what ends the batch, and it files the take', async () => {
    const w = await startOnLast()
    await tap(w, '.ctl-again')
    await silence(1500)
    queued.length = 0
    await tap(w, '.ctl-next')
    expect(phaseOf(w)).toBe('done')
    expect(queued.map(t => t.lineId)).toEqual([`L${N}`])
  })
})

describe('RecordistRoom — Lines & settings lists every line of the batch', () => {
  beforeEach(() => {
    queued.length = 0; savedTakes.clear(); localStorage.clear()
    mic.speech.value = true; mic.quiet.value = 0
    clock = 1_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => clock)
  })
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = '' })

  it('one row per line: number, Welsh, English, a status dot; the current line is marked', async () => {
    const w = await mountReady([1, 2])
    await tap(w, '[data-test="open-sheet"]')
    const rows = w.findAll('[data-test="batch-lines"] li')
    expect(rows.length).toBe(N)
    expect(rows[0].find('.bl-num').text()).toBe('1')
    expect(rows[0].find('.bl-text').text()).toBe('llinell 1')
    expect(rows[0].find('.bl-known').text()).toBe('line 1')
    expect(rows[0].find('.bl-dot').classes()).toContain('done')
    expect(rows[3].find('.bl-dot').classes()).toContain('empty')
    // Start opens on the first line still owed: line 3.
    expect(rows[2].classes()).toContain('now')
    expect(w.findAll('[data-test="batch-lines"] li.now').length).toBe(1)
  })

  it('a tap on the words moves the cursor to that line', async () => {
    const w = await mountReady([1, 2])
    await tap(w, '[data-test="open-sheet"]')
    await w.findAll('[data-test="batch-lines"] .bl-go')[4].trigger('click')
    await flushPromises()
    expect(w.find('[data-test="ready-line"]').text()).toBe('llinell 5')
    await w.find('.btn-begin').trigger('click')
    await flushPromises()
    expect(onLine(w)).toBe('llinell 5')
  })

  it('▶ only on lines with a take, and playing does not move the cursor', async () => {
    const play = vi.fn().mockResolvedValue(undefined)
    window.HTMLMediaElement.prototype.play = play
    globalThis.Audio = class { constructor() { this.src = '' } play() { return play() } pause() {} }
    const w = await mountReady([1, 2])
    await tap(w, '[data-test="open-sheet"]')
    const rows = w.findAll('[data-test="batch-lines"] li')
    expect(rows[0].find('.bl-play').exists()).toBe(true)
    expect(rows[3].find('.bl-play').exists()).toBe(false)
    await rows[0].find('.bl-play').trigger('click')
    await flushPromises()
    expect(play).toHaveBeenCalled()
    expect(w.find('[data-test="ready-line"]').text()).toBe('llinell 3')
    expect(w.findAll('[data-test="batch-lines"] li')[2].classes()).toContain('now')
  })

  it('Again on a row opens the mic on THAT line; Record on a line with no take', async () => {
    const w = await mountReady([1, 2])
    await tap(w, '[data-test="open-sheet"]')
    const rows = w.findAll('[data-test="batch-lines"] li')
    expect(rows[0].find('[data-test="batch-line-record"]').text()).toBe('Again')
    expect(rows[3].find('[data-test="batch-line-record"]').text()).toBe('Record')
    await rows[1].find('[data-test="batch-line-record"]').trigger('click')
    await flushPromises()
    expect(onLine(w)).toBe('llinell 2')
  })
})
