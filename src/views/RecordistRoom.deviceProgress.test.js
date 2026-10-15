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
const KEY = 'lego.cym_nv2_for_eng'
const legoLine = (i, recorded = false) => ({
  id: `lego:row${i}:target2`, order: 9007199254740991, text: `darn ${i}`, knownText: `piece ${i}`,
  courseCode: 'cym_nv2_for_eng', kind: 'lego', role: 'target2', recorded, clipUrl: null,
})
const ALL = Array.from({ length: 250 }, (_, i) => legoLine(i))
const legoTrack = {
  key: KEY, kind: 'lego', courseCode: 'cym_nv2_for_eng', newCourse: true, total: 250, recorded: 0,
  batches: [{ n: 1, from: 1, to: 100, total: 100, recorded: 0 }, { n: 2, from: 101, to: 200, total: 100, recorded: 0 }, { n: 3, from: 201, to: 250, total: 50, recorded: 0 }],
}

let fullQueueReads = 0
function stub() {
  fullQueueReads = 0
  global.fetch = vi.fn().mockImplementation(async (url) => {
    const u = String(url)
    if (u.includes('/summary')) return { ok: true, status: 200, json: async () => ({ home: true, fresh: true, displayName: 'Aran', language: 'cym', languageName: 'Welsh', tracks: [legoTrack] }) }
    // The re-record card's list (job #788) is its own small read, not the queue.
    if (u.includes('/rerecord')) return { ok: true, status: 200, json: async () => ({ fresh: true, total: 0, items: [], recordedAlso: [] }) }
    // Nor is the script-check poll (job #842).
    if (u.includes('/text-check-failures')) return { ok: true, status: 200, json: async () => ({ items: [], pending: 0 }) }
    const q = new URL(u, 'http://x').searchParams
    if (!q.get('track')) fullQueueReads += 1
    const batch = Number(q.get('batch'))
    const lines = q.get('track') ? ALL.slice((batch - 1) * 100, batch * 100) : ALL
    return { ok: true, status: 200, json: async () => ({ displayName: 'Aran', languageName: 'Welsh', track: q.get('track'), batch: q.get('track') ? batch : null, total: lines.length, recorded: 0, remaining: lines.length, lines }) }
  })
}

beforeEach(() => {
  unsent.set.clear()
  for (const k of Object.keys(localStorage)) localStorage.removeItem(k)
  window.history.pushState({}, '', `/?track=${KEY}`)
})

describe('the LEGO section counts takes still on the device (job #791)', () => {
  it('batches he read on the device, placed by reading the queue once: recorded, still uploading — not 0', async () => {
    for (let i = 0; i < 140; i++) unsent.set.add(`lego:row${i}:target2`)
    stub()
    const w = mount(RecordistRoom, { props: { voiceId: VOICE } })
    await flushPromises(); await flushPromises()
    expect(fullQueueReads).toBe(1)
    const track = w.find('.bh-track').text()
    expect(track).toContain('140 of 250 recorded')
    expect(w.find('[data-test="track-uploading"]').text()).toContain('140 still uploading')
    expect(w.find('[data-test="batch-1"]').text()).toContain('100 of 100 recorded (100 still uploading)')
    expect(w.find('[data-test="batch-2"]').text()).toContain('40 of 100 recorded (40 still uploading)')
    expect(w.find('[data-test="batch-1"] .bh-bn').text()).toBe('✓')
    // Kept, so the next visit does not read the whole queue again.
    const kept = JSON.parse(localStorage.getItem(`booth.home.places.${VOICE}`))
    expect(kept['lego:row0:target2']).toEqual([KEY, 1, false])
  })

  it('a batch this device opened is placed from its own lines, with no whole-queue read', async () => {
    stub()
    window.history.pushState({}, '', `/?track=${KEY}&batch=2`)
    const w = mount(RecordistRoom, { props: { voiceId: VOICE } })
    await flushPromises(); await flushPromises()
    for (let i = 100; i < 160; i++) unsent.set.add(`lego:row${i}:target2`)
    w.unmount()
    window.history.pushState({}, '', `/?track=${KEY}`)
    stub()
    const again = mount(RecordistRoom, { props: { voiceId: VOICE } })
    await flushPromises(); await flushPromises()
    expect(fullQueueReads).toBe(0)
    expect(again.find('[data-test="batch-2"]').text()).toContain('60 of 100 recorded (60 still uploading)')
  })

  it('nothing on the device: the server count stands, no amber, no whole-queue read', async () => {
    stub()
    const w = mount(RecordistRoom, { props: { voiceId: VOICE } })
    await flushPromises(); await flushPromises()
    expect(fullQueueReads).toBe(0)
    expect(w.find('.bh-track').text()).toContain('0 of 250 recorded')
    expect(w.find('[data-test="track-uploading"]').exists()).toBe(false)
  })
})
