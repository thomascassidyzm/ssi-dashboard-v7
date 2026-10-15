// @vitest-environment jsdom
/**
 * Aran, 2026-10-15, North Welsh new sentences batch 2: "everything's recorded but the boxes on the
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
    queueTake: vi.fn(), markFailed: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: savedTakes, failed: failedTakes,
    flush: vi.fn(), retryFailed: vi.fn(),
  }),
}))

vi.mock('@/composables/useTapRecorder', () => ({
  DEFAULT_CAPTURE_PROFILE: 'voice',
  resolveCaptureProfile: () => 'dry',
  useTapRecorder: () => ({
    isRecording: ref(false), level: ref(0), clipping: ref(false),
    devices: ref([]), appliedSettings: ref({}), profile: ref('voice'), error: ref(null),
    lineHasSpeech: ref(false), quietMs: ref(0), meterTrusted: ref(true),
    inputPeak: ref(0), roomTone: ref(0.001),
    listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    awaitLeadIn: vi.fn().mockResolvedValue(1200), activeAgeMs: () => 1200,
    beginLine: vi.fn(), endLine: vi.fn(), discardLine: vi.fn().mockResolvedValue(undefined),
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

describe('rail colours: one colour per state, in both themes', () => {
  // The declared background of `<sel>` in the stylesheet, plus how many classes/pseudo-classes
  // the selector carries (its specificity), so a theme rule cannot out-rank a state rule again.
  function paint(sel) {
    const esc = sel.replace(/[.[\]()"=:]/g, '\\$&')
    const m = src.match(new RegExp(`^\\s*${esc}\\s*\\{[^}]*?background:\\s*(#[0-9a-f]{6})`, 'mi'))
    return m ? m[1].toLowerCase() : null
  }
  it('dark: green saved, amber uploading, red refused, grey empty — four different colours', () => {
    const c = ['.rail-sq', '.rail-sq.done', '.rail-sq.up', '.rail-sq.failed'].map(paint)
    expect(c.every(Boolean)).toBe(true)
    expect(new Set(c).size).toBe(4)
  })
  it('light: every state has its own light colour, none of them the empty grey', () => {
    const t = ':root[data-theme="light"]'
    const empty = paint(`${t} .rail-sq`)
    const c = ['done', 'up', 'failed'].map(s => paint(`${t} .rail-sq.${s}`))
    expect(empty).toBeTruthy()
    expect(c.every(Boolean)).toBe(true)
    expect(new Set([empty, ...c]).size).toBe(4)
  })
})

describe('rail squares and the way on from a finished batch', () => {
  beforeEach(() => { savedTakes.clear(); failedTakes.clear(); unsent.clear(); window.history.pushState({}, '', '/') })

  it('draws saved, uploading, refused and empty squares as four different states', async () => {
    unsent.add('line-b')
    failedTakes.set('line-c', 'refused')
    stub(3, LINES)
    openBatchTwo()
    const w = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' } })
    await flushPromises()
    // Saved and uploading lines are out of the reading flow until "show" (job #816).
    expect(w.findAll('[data-test="rail"] .rail-sq').length).toBe(2)
    await w.find('[data-test="hidden-toggle"]').trigger('click')
    const sq = w.findAll('[data-test="rail"] .rail-sq').map(s => ['done', 'up', 'failed'].find(k => s.classes(k)) || 'empty')
    expect(sq).toEqual(['done', 'up', 'failed', 'empty'])
    expect(w.find('[data-test="rail-legend"]').text()).toContain('Saved on the server')
    expect(w.find('[data-test="rail-legend"]').text()).toContain('Recorded, still uploading')
  })

  it('a finished batch offers a big "Next batch →" that opens batch 3', async () => {
    stub(3, LINES.map(l => ({ ...l, recorded: true })))
    openBatchTwo()
    const w = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' } })
    await flushPromises()
    const b = w.find('[data-test="next-batch"]')
    expect(b.exists()).toBe(true)
    expect(b.text()).toContain('Next batch')
    await b.trigger('click')
    expect(window.location.search).toContain('batch=3')
  })

  it('on the last batch the button goes back to the booth home', async () => {
    stub(2, LINES.map(l => ({ ...l, recorded: true })))
    openBatchTwo()
    const w = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' } })
    await flushPromises()
    expect(w.find('[data-test="next-batch"]').exists()).toBe(false)
    await w.find('[data-test="back-home"]').trigger('click')
    expect(window.location.search).toBe('')
  })
})
