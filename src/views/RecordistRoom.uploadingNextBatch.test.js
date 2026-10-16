// @vitest-environment jsdom
/**
 * Aran, 15 Oct 15:41: a batch with every line recorded-and-still-uploading (amber) offered no way on. Fixed:
 * the done state counts device takes. (Original header follows.) Aran, 2026-10-15, North Welsh new sentences batch 2: "everything's recorded but the boxes on the
 * left are confusing. The first two rows are greyed out and the rest are orange." The squares that
 * the server held were GREY because the light-mode rule `:root[data-theme="light"] .rail-sq` out-ranked
 * `.rail-sq.done`, and the squares still uploading were the only ones with a light colour of their
 * own. And once the batch was read the only button was a dead "Nothing left to read".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const savedTakes = vi.hoisted(() => new Map())
const failedTakes = vi.hoisted(() => new Map())
const unsent = vi.hoisted(() => new Set())

vi.mock('@/composables/useRecordistQueue', () => ({
  DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
  useRecordistQueue: () => ({
    persistent: ref(true), carriedOverCount: ref(0), refusedCount: ref(0),
    isUnsent: (id) => unsent.has(id), attach: vi.fn(), teardown: vi.fn(),
    queueTake: (t) => { unsent.add(t.lineId) }, markFailed: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: savedTakes, failed: failedTakes,
    flush: vi.fn(), retryFailed: vi.fn(),
  }),
}))

vi.mock('@/composables/useTapRecorder', () => ({
  DEFAULT_CAPTURE_PROFILE: 'voice',
  resolveCaptureProfile: () => 'dry',
  useTapRecorder: () => ({
    isRecording: ref(true), level: ref(0), clipping: ref(false),
    devices: ref([]), appliedSettings: ref({}), profile: ref('voice'), error: ref(null),
    lineHasSpeech: ref(true), quietMs: ref(0), meterTrusted: ref(true),
    inputPeak: ref(0), roomTone: ref(0.001),
    listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    awaitLeadIn: vi.fn().mockResolvedValue(1200), activeAgeMs: () => 1200,
    beginLine: vi.fn(), endLine: vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)], { type: 'audio/webm' }))), discardLine: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('./recordist/BoothTeamStats.vue', () => ({ default: { render: () => null } }))

import RecordistRoom from './RecordistRoom.vue'

// Each test is a fresh visit: the booth remembers its line cursor in localStorage per voice
// and batch (booth-cursor.js), and one test's cursor must not open the next test's Start.
beforeEach(() => { if (typeof localStorage === 'undefined') return; for (const k of Object.keys(localStorage)) if (k.startsWith('recordist.cursor.')) localStorage.removeItem(k) })

const src = readFileSync(resolve(process.cwd(), 'src/views/RecordistRoom.vue'), 'utf8')

const LINES = ['a', 'b', 'c', 'd'].map((x, i) => ({
  id: `line-${x}`, order: i + 1, text: `Brawddeg ${x}.`, knownText: `Sentence ${x}.`, speaker: 'Aran',
  courseCode: 'cym_nv2_for_eng', recorded: i === 0, clipUrl: null,
}))

function track(batchCount) {
  return {
    key: 'seed.cym_nv2_for_eng', kind: 'seed', courseCode: 'cym_nv2_for_eng', newCourse: true, title: 'New sentences',
    total: batchCount * 4, recorded: 0,
    batches: Array.from({ length: batchCount }, (_, i) => ({ n: i + 1, total: 4, recorded: i === 0 ? 4 : 0 })),
  }
}

function stub(batchCount, lines) {
  global.fetch = vi.fn().mockImplementation(async (url) => ({
    ok: true, status: 200,
    json: async () => String(url).includes('/summary')
      ? { home: true, displayName: 'Aran', languageName: 'Welsh', tracks: [track(batchCount)] }
      : { displayName: 'Aran', languageName: 'Welsh', total: lines.length, recorded: lines.filter(l => l.recorded).length, remaining: lines.filter(l => !l.recorded).length, lines },
  }))
}

function openBatchTwo() {
  window.history.pushState({}, '', '/?track=seed.cym_nv2_for_eng&batch=2')
}

describe('a batch recorded but still uploading', () => {
  beforeEach(() => { savedTakes.clear(); failedTakes.clear(); unsent.clear(); window.history.pushState({}, '', '/') })
  const open = async () => {
    stub(3, LINES.map(l => ({ ...l, recorded: false })))
    openBatchTwo()
    const w = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' } })
    await flushPromises()
    return w
  }

  it('all lines amber: Next batch → opens batch 3, with a quiet uploading note', async () => {
    LINES.forEach(l => unsent.add(l.id))
    const w = await open()
    const b = w.find('[data-test="next-batch"]')
    expect(b.exists()).toBe(true)
    expect(w.text()).toContain('Everything is recorded')
    expect(w.find('[data-test="batch-uploading"]').text()).toMatch(/4 still uploading.*background/i)
    await b.trigger('click')
    expect(window.location.search).toContain('batch=3')
  })

  it('reading the batch to the end with › then Done lands on the same way on, uploads and all', async () => {
    let clock = 5_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => clock)
    const w = await open()
    await w.find('.btn-begin').trigger('click')
    await flushPromises()
    for (let i = 0; i < LINES.length; i++) { clock += 400; await w.find('.ctl-next').trigger('click'); await flushPromises() }
    expect(w.find('[data-test="done"]').exists()).toBe(true)
    expect(unsent.size).toBe(4)
    expect(w.find('[data-test="next-batch"]').exists()).toBe(true)
    expect(w.find('[data-test="batch-uploading"]').text()).toMatch(/4 still uploading.*background/i)
    vi.restoreAllMocks()
  })

  it('a refused line blocks "all done": no Next batch, Start is offered', async () => {
    LINES.slice(1).forEach(l => unsent.add(l.id))
    failedTakes.set('line-a', 'refused')
    const w = await open()
    expect(w.find('[data-test="next-batch"]').exists()).toBe(false)
    expect(w.text()).not.toContain('Everything is recorded')
    expect(w.find('[data-test="batch-uploading"]').exists()).toBe(false)
  })
})

// Aran, 2026-10-16 (job #203): phrase.1 batch 2 finished with 45 still uploading and the only way on
// was Home. Practice phrases now get Next batch → too, Home stays as the second button, and with
// nothing left anywhere the screen says so and offers Home only.
describe('the finished screen: Next batch → in Up next order', () => {
  beforeEach(() => { savedTakes.clear(); failedTakes.clear(); unsent.clear(); window.history.pushState({}, '', '/') })
  const phraseTrack = (batches) => ({
    key: 'phrase.1', kind: 'phrase', pass: 1, courseCode: 'cym_nv2_for_eng', title: 'Practice phrases',
    total: batches.length * 4, recorded: 0,
    batches: batches.map((b, i) => ({ n: i + 1, total: 4, ...b })),
  })
  const openAt = async (tracks, address) => {
    const lines = LINES.map(l => ({ ...l, recorded: false }))
    LINES.forEach(l => unsent.add(l.id))
    global.fetch = vi.fn().mockImplementation(async (url) => ({
      ok: true, status: 200,
      json: async () => String(url).includes('/summary')
        ? { home: true, displayName: 'Aran', languageName: 'Welsh', tracks }
        : { displayName: 'Aran', languageName: 'Welsh', total: 4, recorded: 0, remaining: 4, lines },
    }))
    window.history.pushState({}, '', address)
    const w = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' } })
    await flushPromises()
    return w
  }

  it('phrase.1 batch 2 done → Next batch opens phrase.1 batch 3; Home is there as well; uploads untouched', async () => {
    const w = await openAt([phraseTrack([{ recorded: 4 }, { recorded: 0, current: true }, { recorded: 0 }])], '/?track=phrase.1&batch=2')
    expect(w.text()).toContain('Everything is recorded')
    expect(w.find('[data-test="batch-uploading"]').text()).toMatch(/4 still uploading/)
    expect(w.find('[data-test="home-link"]').exists()).toBe(true)
    await w.find('[data-test="next-batch"]').trigger('click')
    expect(window.location.search).toContain('track=phrase.1')
    expect(window.location.search).toContain('batch=3')
    expect(unsent.size).toBe(4)
  })

  it('last batch of the sentences → crosses to the practice phrases', async () => {
    const seeds = { ...track(2), batches: [{ n: 1, total: 4, recorded: 4 }, { n: 2, total: 4, recorded: 0 }] }
    const w = await openAt([seeds, phraseTrack([{ recorded: 0, current: true }])], '/?track=seed.cym_nv2_for_eng&batch=2')
    await w.find('[data-test="next-batch"]').trigger('click')
    expect(window.location.search).toContain('track=phrase.1')
    expect(window.location.search).toContain('batch=1')
  })

  it('nothing left anywhere: says so, Home only', async () => {
    const w = await openAt([phraseTrack([{ recorded: 4 }, { recorded: 0 }])], '/?track=phrase.1&batch=2')
    expect(w.find('[data-test="next-batch"]').exists()).toBe(false)
    expect(w.find('[data-test="home-link"]').exists()).toBe(false)
    expect(w.find('[data-test="all-batches-done"]').text()).toMatch(/Nothing left to record anywhere/)
    expect(w.find('[data-test="back-home"]').exists()).toBe(true)
  })
})
