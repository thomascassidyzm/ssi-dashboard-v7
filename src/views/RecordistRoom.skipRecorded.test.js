// LINES ALREADY RECORDED ARE NOT IN THE READING FLOW (Aran, live on popty.app, 2026-10-15,
// recording North LEGO batches, job #816):
//
//   "when I open a new batch, quite often several of them are marked green already ... But when
//   I move through them I'm given those to re-record again in the flow with the rest. That seems
//   wasteful. Could we just skip them? Ideally they wouldn't even show."
//
// One take covers every copy of the same words (#791), so a batch often opens with lines saved
// (green) or still uploading from this device (amber). Start, ›, ‹, auto-advance and Jump walk
// only the lines still owed; one small line says how many are hidden, and "show" draws them in
// Lines & settings, where Again is on every row. Applies to every kind of line.
// Drives the real component with a mocked mic and a mocked take queue: nothing records or uploads.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const queued = vi.hoisted(() => [])
const savedTakes = vi.hoisted(() => new Map())
const unsent = vi.hoisted(() => new Set())
const mic = vi.hoisted(() => ({ speech: null, quiet: null }))

vi.mock('@/composables/useRecordistQueue', () => ({
  DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
  useRecordistQueue: () => ({
    persistent: ref(true), carriedOverCount: ref(0), refusedCount: ref(0),
    isUnsent: (id) => unsent.has(id), unsentBlob: async () => null,
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

// Eight lines of mixed kinds — a seed sentence, LEGOs (the minimal set) and practice phrases.
// Lines 2, 3 and 5 are saved on the server; line 6 was recorded on this device and is still
// going up. The reading flow is lines 1, 4, 7, 8.
const KINDS = ['seed', 'quarry', 'quarry', 'quarry', 'phrase', 'phrase', 'phrase', 'seed']
const SAVED = [2, 3, 5]
function makeLines() {
  return KINDS.map((kind, k) => ({
    id: `L${k + 1}`, order: k + 1, kind, text: `llinell ${k + 1}`, knownText: `line ${k + 1}`,
    recorded: SAVED.includes(k + 1), clipUrl: SAVED.includes(k + 1) ? `/clip/L${k + 1}` : null,
  }))
}
function stubQueue() {
  global.fetch = vi.fn().mockImplementation(() => Promise.resolve({
    ok: true, status: 200,
    json: async () => { const lines = makeLines(); return { displayName: 'Test Voice', languageName: 'Welsh', total: lines.length, recorded: 3, remaining: 5, lines } },
  }))
}

let clock = 1_000_000
async function tap(w, sel) {
  clock += 400
  await w.find(sel).trigger('click')
  await flushPromises()
}
const next = (w) => tap(w, '.ctl-next')
const back = (w) => tap(w, '.ctl-back')
const onLine = (w) => w.find('.line-target').text()
const phaseOf = (w) => (w.find('[data-test="done"]').exists() ? 'done' : w.find('.line-target').exists() ? 'recording' : 'ready')

async function mountReady() {
  const w = mount(RecordistRoom, { props: { voiceId: 'human_test_zzz' }, attachTo: document.body })
  await flushPromises()
  return w
}
async function mountAndStart() {
  const w = await mountReady()
  await w.find('.btn-begin').trigger('click')
  await flushPromises()
  return w
}

describe('RecordistRoom — lines already recorded are left out of the reading flow (job #816)', () => {
  beforeEach(() => {
    queued.length = 0; savedTakes.clear(); unsent.clear(); localStorage.clear()
    unsent.add('L6')
    mic.speech.value = true; mic.quiet.value = 0
    stubQueue()
    clock = 1_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => clock)
  })
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = '' })

  it('› walks only the lines still owed, and the count is of those lines', async () => {
    const w = await mountAndStart()
    expect(onLine(w)).toBe('llinell 1')
    expect(w.find('[data-test="line-pos"]').text()).toContain('Line 1 of 4')
    await next(w); expect(onLine(w)).toBe('llinell 4')
    expect(w.find('[data-test="line-pos"]').text()).toContain('Line 2 of 4')
    await next(w); expect(onLine(w)).toBe('llinell 7')
    await next(w); expect(onLine(w)).toBe('llinell 8')
    expect(w.find('.ctl-next').text()).toBe('Done')
    await next(w)
    expect(phaseOf(w)).toBe('done')
    // Every take filed under the line it was read on, and nothing on a hidden line.
    expect(queued.map(t => t.lineId)).toEqual(['L1', 'L4', 'L7', 'L8'])
  })

  it('auto-advance skips them too', async () => {
    const w = await mountAndStart()
    clock += 400
    mic.quiet.value = 1500
    await flushPromises()
    expect(onLine(w)).toBe('llinell 4')
  })

  it('the coming-up list is the flow, not the batch', async () => {
    const w = await mountAndStart()
    expect(w.findAll('.upnext-list li').map(li => li.text())).toEqual(['llinell 4', 'llinell 7', 'llinell 8'])
  })

  it('‹ goes back within the flow, to lines recorded this session', async () => {
    const w = await mountAndStart()
    await next(w); await next(w)
    expect(onLine(w)).toBe('llinell 7')
    mic.speech.value = false
    await back(w); expect(onLine(w)).toBe('llinell 4')
    await back(w); expect(onLine(w)).toBe('llinell 1')
  })

  it('says how many are hidden, and the rail and the list draw only the flow', async () => {
    const w = await mountReady()
    expect(w.find('[data-test="hidden-note"]').text()).toContain('4 already recorded — hidden')
    expect(w.find('[data-test="hidden-toggle"]').text()).toBe('show')
    expect(w.findAll('[data-test="rail"] .rail-sq').length).toBe(4)
    expect(w.findAll('[data-test="batch-lines"] li').map(li => li.find('.bl-text').text()))
      .toEqual(['llinell 1', 'llinell 4', 'llinell 7', 'llinell 8'])
  })

  it('"show" reveals them in Lines & settings, with Again, and Again opens the mic on that line', async () => {
    const w = await mountReady()
    await tap(w, '[data-test="hidden-toggle"]')
    expect(w.find('[data-test="sheet"]').isVisible()).toBe(true)
    const rows = w.findAll('[data-test="batch-lines"] li')
    expect(rows.length).toBe(8)
    expect(rows[2].find('.bl-text').text()).toBe('llinell 3')
    expect(rows[2].find('[data-test="batch-line-record"]').text()).toBe('Again')
    expect(w.find('[data-test="hidden-note"]').text()).toContain('shown')
    await rows[2].find('[data-test="batch-line-record"]').trigger('click')
    await flushPromises()
    expect(onLine(w)).toBe('llinell 3')
    // From there, › carries on along the flow and the take is filed on line 3.
    await next(w)
    expect(onLine(w)).toBe('llinell 4')
    expect(queued.map(t => t.lineId)).toEqual(['L3'])
  })

  it('a reload left on a line that is now recorded opens on the next line still owed after it', async () => {
    localStorage.setItem('recordist.cursor.v1:human_test_zzz:door:|', 'L2')
    const w = await mountReady()
    expect(w.find('[data-test="ready-line"]').text()).toBe('llinell 4')
  })

  it('a batch whose every line is recorded opens on nothing to read', async () => {
    savedTakes.set('L1', true); savedTakes.set('L4', true); savedTakes.set('L7', true); savedTakes.set('L8', true)
    const w = await mountReady()
    expect(w.find('.btn-begin').text()).toBe('Nothing left to read')
    expect(w.find('[data-test="hidden-note"]').text()).toContain('8 already recorded')
  })
})
