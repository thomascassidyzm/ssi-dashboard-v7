// @vitest-environment jsdom
/**
 * Aran, 2026-10-15 15:42 (job #791), on /r/human_aran_cym_n?track=lego.cym_nv2_for_eng: "it shows me
 * as NOT having recorded any of the batches I have just done." The section's counts were the
 * server's only, and 242 of his takes were still uploading from his Chromebook — none of them a LEGO
 * the server held yet. A batch read on this device now reads as recorded, still uploading (amber),
 * on the section page and the home cards, whether or not this device opened the batch since the fix.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, reactive } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const unsent = vi.hoisted(() => ({ set: null }))

vi.mock('@/composables/useRecordistQueue', async () => {
  const { ref: r, reactive: re } = await import('vue')
  unsent.set = re(new Set())
  return {
    DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
    useRecordistQueue: () => ({
      persistent: r(true), carriedOverCount: r(0), refusedCount: r(0), refusedTakes: r([]),
      isUnsent: (id) => unsent.set.has(id), attach: vi.fn(), teardown: vi.fn(), reconcile: vi.fn(),
      queueTake: vi.fn(), markFailed: vi.fn(),
      pendingCount: r(0), savedCount: r(0), failedCount: r(0),
      saved: new Map(), failed: new Map(), unsentLines: unsent.set,
      flush: vi.fn(), retryFailed: vi.fn(),
    }),
  }
})

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

const VOICE = 'human_aran_cym_n'
const SEED = 'seed.cym_nv2_for_eng'
const LEGO = 'lego.cym_nv2_for_eng'
const line = (kind, i, recorded) => ({
  id: `${kind}:row${i}:target2`, order: i, text: `${kind} ${i}`, knownText: `${kind} ${i}`,
  courseCode: 'cym_nv2_for_eng', kind, role: 'target2', recorded, clipUrl: null,
})
// Every sentence of seed batch 1 is saved on the server; no LEGO has been read at all.
const SEEDS = Array.from({ length: 200 }, (_, i) => line('seed', i, i < 100))
const LEGOS = Array.from({ length: 200 }, (_, i) => line('lego', i, false))
const tracks = [
  { key: SEED, kind: 'seed', courseCode: 'cym_nv2_for_eng', newCourse: true, total: 200, recorded: 100,
    batches: [{ n: 1, from: 1, to: 100, total: 100, recorded: 100 }, { n: 2, from: 101, to: 200, total: 100, recorded: 0 }] },
  { key: LEGO, kind: 'lego', courseCode: 'cym_nv2_for_eng', newCourse: true, total: 200, recorded: 0,
    batches: [{ n: 1, from: 1, to: 100, total: 100, recorded: 0 }, { n: 2, from: 101, to: 200, total: 100, recorded: 0 }] },
]

function stub() {
  global.fetch = vi.fn().mockImplementation(async (url) => {
    const u = String(url)
    if (u.includes('/summary')) return { ok: true, status: 200, json: async () => ({ home: true, fresh: true, displayName: 'Aran', language: 'cym', languageName: 'Welsh', tracks }) }
    if (u.includes('/rerecord')) return { ok: true, status: 200, json: async () => ({ fresh: true, total: 0, items: [], recordedAlso: [] }) }
    const q = new URL(u, 'http://x').searchParams
    const track = q.get('track')
    const batch = Number(q.get('batch'))
    const pool = track === SEED ? SEEDS : track === LEGO ? LEGOS : [...SEEDS, ...LEGOS]
    const lines = track ? pool.slice((batch - 1) * 100, batch * 100) : pool
    const recorded = lines.filter(l => l.recorded).length
    return { ok: true, status: 200, json: async () => ({ displayName: 'Aran', languageName: 'Welsh', track, batch: track ? batch : null, total: lines.length, recorded, remaining: lines.length - recorded, lines }) }
  })
}

beforeEach(() => {
  unsent.set.clear()
  for (const k of Object.keys(localStorage)) localStorage.removeItem(k)
})

describe('a batch is never credited with another batch’s lines (Aran, 15 Oct, job #818)', () => {
  it('opening a LEGO batch straight after a finished sentence batch leaves the LEGO batch at 0 recorded', async () => {
    stub()
    window.history.pushState({}, '', `/?track=${SEED}&batch=1`)
    const w = mount(RecordistRoom, { props: { voiceId: VOICE } })
    await flushPromises(); await flushPromises()
    // Home, the LEGO card, LEGO batch 2 — the sentence batch's 100 recorded lines are still loaded.
    await w.find('[data-test="back-home"]').trigger('click')
    await flushPromises(); await flushPromises()
    await w.find(`[data-test="card-${LEGO}"]`).trigger('click')
    await flushPromises()
    await w.find('[data-test="batch-2"]').trigger('click')
    await flushPromises(); await flushPromises()
    await w.find('[data-test="back-home"]').trigger('click')
    await flushPromises(); await flushPromises()
    await w.find(`[data-test="card-${LEGO}"]`).trigger('click')
    await flushPromises()
    expect(w.find('[data-test="batch-2"]').text()).toMatch(/(^|\D)0 of 100 recorded/)
    expect(w.find('[data-test="batch-2"] .bh-bn').text()).toBe('2')
    expect(w.find('.bh-track').text()).toMatch(/(^|\D)0 of 200 recorded/)
  })

  it('Next batch from a finished sentence batch does not tick the next one before it is read', async () => {
    stub()
    window.history.pushState({}, '', `/?track=${SEED}&batch=1`)
    const w = mount(RecordistRoom, { props: { voiceId: VOICE } })
    await flushPromises(); await flushPromises()
    await w.find('[data-test="next-batch"]').trigger('click')
    await flushPromises(); await flushPromises()
    await w.find('[data-test="back-home"]').trigger('click')
    await flushPromises(); await flushPromises()
    // Batch 2 is still his next sentence batch, not ticked off by batch 1's lines.
    expect(w.find('[data-test="up-next"]').text()).toContain('whole sentences')
    await w.find('[data-test="up-next-all"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="batch-1"]').text()).toContain('100 of 100 recorded')
    expect(w.find('[data-test="batch-2"]').text()).toMatch(/(^|\D)0 of 100 recorded/)
  })
})
