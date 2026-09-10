// HEARING YOUR TAKES BACK IS NOT THE SAME WANT AS READING THEM AGAIN.
//
// Until 2026-09-10 one checkbox did both. "Re-read lines I've already recorded"
// decides how the RUN is served — with it on, the queue starts at the top and
// offers every line again — and it was also the only way to reach the list of
// everything already recorded, with its per-section counts and its playback.
// Nobody looking for "let me see and hear what I've done" would go looking for
// it behind a label about reading things again, and finding out cost them the
// shape of their session.
//
// So the run's switch keeps its behaviour exactly, and the list gets a switch of
// its own that says what it does.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/composables/useRecordistQueue', () => ({
  DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
  useRecordistQueue: () => ({
    persistent: ref(true), carriedOverCount: ref(0), refusedCount: ref(0),
    isUnsent: () => false, attach: vi.fn(), teardown: vi.fn(),
    queueTake: vi.fn(), markFailed: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: new Map(), failed: new Map(),
    flush: vi.fn(), retryFailed: vi.fn(),
  }),
}))
vi.mock('@/composables/useTapRecorder', () => ({
  DEFAULT_CAPTURE_PROFILE: 'voice',
  resolveCaptureProfile: () => 'voice',
  useTapRecorder: () => ({
    isRecording: ref(false), level: ref(0), clipping: ref(false),
    devices: ref([]), appliedSettings: ref({}), profile: ref('voice'), error: ref(null),
    lineHasSpeech: ref(true), quietMs: ref(0), meterTrusted: ref(true),
    inputPeak: ref(0), roomTone: ref(0),
    listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    beginLine: vi.fn(), endLine: vi.fn(), discardLine: vi.fn(), stop: vi.fn(),
  }),
}))

import RecordistRoom from './RecordistRoom.vue'

// One finished body of work and one still going — Aran's own shape, minimised.
const WIRE = {
  displayName: 'Aran', languageName: 'Welsh', total: 4, recorded: 2, remaining: 2,
  lines: [
    { id: 'p1', order: 1, text: 'Bore da, Sarah!', recorded: true, kind: 'pod', podSlug: 'pod-1', clipUrl: '/c/p1' },
    { id: 'p2', order: 2, text: 'Sut wyt ti?', recorded: true, kind: 'pod', podSlug: 'pod-1', clipUrl: '/c/p2' },
    { id: 's1', order: 3, text: 'Dw i eisiau siarad', recorded: false, kind: 'seed', clipUrl: null },
    { id: 's2', order: 4, text: 'Mae hi yma', recorded: false, kind: 'seed', clipUrl: null },
  ],
}

// The switches, by the words on them, because that is what Aran taps.
function switchSaying(w, words) {
  const row = w.findAll('.toggle-row').find(l => l.text().includes(words))
  return row && row.find('input')
}

describe('RecordistRoom — the already-recorded list has its own switch', () => {
  beforeEach(() => {
    localStorage.clear()
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => WIRE })
  })

  it('opens on its own switch, and does not touch how the run is served', async () => {
    const w = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' } })
    await flushPromises()
    expect(w.find('.listen-back').exists()).toBe(false)

    const mine = switchSaying(w, "Show everything I've already recorded")
    const reread = switchSaying(w, "Re-read lines I've already recorded")
    expect(mine).toBeTruthy()
    await mine.setValue(true)
    await flushPromises()

    // The list is there, with the two takes he has.
    expect(w.find('.listen-back').exists()).toBe(true)
    expect(w.find('.listen-back h3').text()).toContain('2')
    // And the run is untouched: it still starts on the first line that needs
    // reading, not at the top of everything.
    expect(reread.element.checked).toBe(false)
    expect(w.find('.btn-begin').text()).toContain('Dw i eisiau siarad')
  })

  it('the re-read switch keeps doing exactly its own job, and only its own', async () => {
    const w = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' } })
    await flushPromises()
    await switchSaying(w, "Re-read lines I've already recorded").setValue(true)
    await flushPromises()
    // It re-serves the queue from the top — unchanged behaviour, and the point
    // of leaving it alone.
    expect(w.find('.btn-begin').text()).toContain('Bore da, Sarah!')
    // It no longer decides whether a panel is on the page.
    expect(w.find('.listen-back').exists()).toBe(false)
  })

  it('the whole overview was never behind either switch, and stays that way', async () => {
    const w = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' } })
    await flushPromises()
    // Every named section, done and not done, with its tally — with nothing
    // switched on at all.
    const rows = w.findAll('.section-map-row')
    expect(rows.map(r => r.find('.sm-name').text())).toEqual(['POD-1', 'NEW SEEDS'])
    expect(rows[0].find('.sm-tally').text()).toContain('nothing left to read')
    expect(rows[1].find('.sm-tally').text()).toBe('none recorded yet · 2 still to read')
  })
})
