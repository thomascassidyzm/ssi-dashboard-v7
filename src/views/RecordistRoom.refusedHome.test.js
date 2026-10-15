// Aran, 2026-10-15 (live bug): the booth HOME page said "7 takes the server would not accept. They are
// listed below with the reason." and listed nothing. This drives the real home page over the real queue and
// take-store rules, with refused takes on the device's shelf.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const shelf = vi.hoisted(() => ({ backend: null }))
vi.mock('@/services/takeStore', async (importOriginal) => {
  const orig = await importOriginal()
  return { ...orig, openTakeStore: async (opts = {}) => orig.createTakeStore(shelf.backend, opts) }
})
vi.mock('@/composables/useTapRecorder', () => ({
  DEFAULT_CAPTURE_PROFILE: 'voice', resolveCaptureProfile: () => 'voice',
  useTapRecorder: () => ({
    isRecording: ref(true), level: ref(0.3), clipping: ref(false), devices: ref([]), appliedSettings: ref({}),
    profile: ref('voice'), error: ref(null), lineHasSpeech: ref(true), quietMs: ref(0), meterTrusted: ref(true),
    inputPeak: ref(0.4), roomTone: ref(0.001), listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    awaitLeadIn: vi.fn().mockResolvedValue(1200), activeAgeMs: () => 1200, beginLine: vi.fn(),
    endLine: vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)]))),
    discardLine: vi.fn().mockResolvedValue(undefined), stop: vi.fn().mockResolvedValue(undefined),
  }),
}))
import { createMemoryBackend } from '@/services/takeStore'
import RecordistRoom from './RecordistRoom.vue'

// Each test is a fresh visit: the booth remembers its line cursor in localStorage per voice
// and batch (booth-cursor.js), and one test's cursor must not open the next test's Start.
beforeEach(() => { if (typeof localStorage === 'undefined') return; for (const k of Object.keys(localStorage)) if (k.startsWith('recordist.cursor.')) localStorage.removeItem(k) })

const VOICE = 'human_aran_cym_n'
const TRACK = 'seed.cym_n_for_eng'
const LINES = Array.from({ length: 150 }, (_, i) => ({
  id: `s${i + 1}`, order: i + 1, text: `Cymraeg ${i + 1}`, knownText: `English ${i + 1}`,
  kind: 'seed', courseCode: 'cym_n_for_eng', recorded: i + 1 === 7,
}))
const SUMMARY = {
  home: true, fresh: true, displayName: 'Aran', languageName: 'Welsh', language: 'cym',
  tracks: [{
    key: TRACK, kind: 'seed', courseCode: 'cym_n_for_eng', total: 150, recorded: 1,
    batches: [{ n: 1, from: 1, to: 100, total: 100, recorded: 1 }, { n: 2, from: 101, to: 150, total: 50, recorded: 0 }],
  }],
}
const refusedRec = (lineId, text, why) => ({
  id: `r-${lineId}`, voiceId: VOICE, lineId, text, blob: new Blob([new Uint8Array(10)]), device: '',
  status: 'refused', attempts: 1, lastError: why, createdAt: 1, refusedAt: 2, nextAttemptAt: 0,
})

function serve() {
  global.fetch = vi.fn(async (url) => {
    const u = String(url)
    const json = (body) => ({ ok: true, status: 200, json: async () => body })
    if (u.includes('/summary')) return json(SUMMARY)
    const q = new URL(u, 'http://x').searchParams
    const lines = q.get('track') ? LINES.slice((Number(q.get('batch')) - 1) * 100, Number(q.get('batch')) * 100) : LINES
    return json({ displayName: 'Aran', languageName: 'Welsh', total: lines.length, recorded: 0, remaining: lines.length, lines })
  })
}
async function home(refused) {
  shelf.backend = createMemoryBackend(refused)
  window.history.replaceState({}, '', '/')
  serve()
  const w = mount(RecordistRoom, { props: { voiceId: VOICE }, global: { stubs: { RouterLink: { template: '<a><slot/></a>' }, BoothTeamStats: true } } })
  for (let i = 0; i < 10; i++) await flushPromises()
  return w
}
const rows = (w) => w.findAll('[data-test^="refused-row-"]')

describe('booth home — the refused takes the banner points at', () => {
  beforeEach(() => { vi.spyOn(window, 'confirm').mockReturnValue(true) })

  it('lists each refused take with Welsh, English, section, batch and the server\'s reason; the banner count matches', async () => {
    const w = await home([refusedRec('s120', 'Cymraeg 120', 'no audible speech'), refusedRec('s5', 'Cymraeg 5', 'file too short')])
    expect(w.find('.safety-banner').text()).toContain('2 takes the server would not accept')
    expect(rows(w)).toHaveLength(2)
    const r = w.find('[data-test="refused-row-s120"]')
    expect(r.text()).toContain('Cymraeg 120')
    expect(r.text()).toContain('English 120')
    expect(r.text()).toContain('Batch 2')
    expect(r.text()).toContain('no audible speech')
    expect(w.find('[data-test="refused-row-s5"]').text()).toContain('Batch 1')
  })

  it('Re-record opens that exact line in the recording screen', async () => {
    const w = await home([refusedRec('s120', 'Cymraeg 120', 'no audible speech')])
    await w.find('[data-test="refused-rerecord"]').trigger('click')
    for (let i = 0; i < 10; i++) await flushPromises()
    const q = new URLSearchParams(window.location.search)
    expect([q.get('track'), q.get('batch'), q.get('line')]).toEqual([TRACK, '2', 's120'])
    expect(w.find('.line-target').text()).toContain('Cymraeg 120')
  })

  it('Dismiss (after a confirm) removes the take from the device and the banner count follows', async () => {
    const w = await home([refusedRec('s120', 'Cymraeg 120', 'x'), refusedRec('s5', 'Cymraeg 5', 'y')])
    await w.find('[data-test="refused-row-s120"] [data-test="refused-dismiss"]').trigger('click')
    for (let i = 0; i < 5; i++) await flushPromises()
    expect(window.confirm).toHaveBeenCalled()
    expect(rows(w)).toHaveLength(1)
    expect(w.find('.safety-banner').text()).toContain('1 take the server would not accept')
    expect((await shelf.backend.getAll()).map(r => r.lineId)).toEqual(['s5'])
  })

  it('a refused take whose line is no longer in the queue says so and can only be dismissed', async () => {
    const w = await home([refusedRec('gone-1', 'Hen frawddeg', 'x')])
    const r = w.find('[data-test="refused-row-gone-1"]')
    expect(r.find('[data-test="refused-gone"]').text()).toMatch(/already recorded/i)
    expect(r.find('[data-test="refused-rerecord"]').exists()).toBe(false)
    expect(r.find('[data-test="refused-dismiss"]').exists()).toBe(true)
  })

  it('a refused take on a line the server now holds is not listed or counted', async () => {
    const w = await home([refusedRec('s7', 'Cymraeg 7', 'x')])
    expect(rows(w)).toHaveLength(0)
    expect(w.find('.safety-banner').exists()).toBe(false)
  })
})
