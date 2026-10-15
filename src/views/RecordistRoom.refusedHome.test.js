// Aran, 2026-10-15 (job #806): refused takes sat on the booth home as a stack of big red cards above
// the one Re-record card. They are rows of that ONE card now: counts add up, no per-take cards, old
// ones cleared by one action after a confirm. This drives the real home page over the real queue and
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
    if (u.includes('/rerecord')) return json({ voiceId: VOICE, fresh: true, items: [{ lineId: 's3', why: 'skipped', text: 'Cymraeg 3', track: TRACK, batch: 1 }], recordedAlso: [] })
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
const card = (w) => w.find('[data-test="rerecord-card"]')

describe('booth home — refused takes are rows of the one Re-record card', () => {
  beforeEach(() => { vi.spyOn(window, 'confirm').mockReturnValue(true) })

  it('shows ONE card, no per-take cards, and the counts add up', async () => {
    const w = await home([refusedRec('s120', 'Cymraeg 120', 'no audible speech'), refusedRec('s5', 'Cymraeg 5', 'file too short'), refusedRec('gone-1', 'Hen', 'x')])
    expect(w.findAll('[data-test="rerecord-card"]')).toHaveLength(1)
    expect(w.find('[data-test="refused-list"]').exists()).toBe(false)
    expect(w.findAll('[data-test^="refused-row-"]')).toHaveLength(0)
    expect(w.find('.safety-banner').exists()).toBe(false)
    // 1 skipped (s3) + 2 refused on lines still in the queue = 3; the 3rd refused take is old.
    expect(card(w).find('[data-test="rerecord-count"]').text()).toBe('3 lines to re-record')
    expect(card(w).find('[data-test="rerecord-breakdown"]').text()).toBe("2 didn't save · 1 skipped")
    await card(w).find('[data-test="rerecord-toggle"]').trigger('click')
    expect(card(w).findAll('[data-test^="rerecord-row-"]')).toHaveLength(3)
    expect(card(w).findAll('[data-test="rerecord-play"]')).toHaveLength(2)
    expect(card(w).find('[data-test="rerecord-old-toggle"]').text()).toBe('Clear old ones (1)')
  })

  it('Clear old ones removes only the old refused copies, after a confirm', async () => {
    const w = await home([refusedRec('s120', 'Cymraeg 120', 'x'), refusedRec('gone-1', 'Hen', 'y'), refusedRec('gone-2', 'Hen 2', 'y')])
    expect(card(w).find('[data-test="rerecord-old-toggle"]').text()).toBe('Clear old ones (2)')
    await card(w).find('[data-test="rerecord-old-clear"]').trigger('click')
    for (let i = 0; i < 8; i++) await flushPromises()
    expect(window.confirm).toHaveBeenCalled()
    expect((await shelf.backend.getAll()).map(r => r.lineId)).toEqual(['s120'])
    expect(card(w).find('[data-test="rerecord-old"]').exists()).toBe(false)
    expect(card(w).find('[data-test="rerecord-count"]').text()).toBe('2 lines to re-record')
  })

  it('declining the confirm clears nothing', async () => {
    window.confirm.mockReturnValue(false)
    const w = await home([refusedRec('gone-1', 'Hen', 'y')])
    await card(w).find('[data-test="rerecord-old-clear"]').trigger('click')
    for (let i = 0; i < 5; i++) await flushPromises()
    expect((await shelf.backend.getAll()).map(r => r.lineId)).toEqual(['gone-1'])
  })

  it('Start re-recording opens the re-record batch', async () => {
    const w = await home([refusedRec('s120', 'Cymraeg 120', 'x')])
    await card(w).find('[data-test="rerecord-start"]').trigger('click')
    for (let i = 0; i < 10; i++) await flushPromises()
    expect(new URLSearchParams(window.location.search).get('track')).toBe('rerecord')
  })

  it('a refused take on a line the server now holds is not listed or counted', async () => {
    const w = await home([refusedRec('s7', 'Cymraeg 7', 'x')])
    expect(w.find('[data-test="rerecord-old"]').exists()).toBe(false)
    expect(card(w).find('[data-test="rerecord-count"]').text()).toBe('1 line to re-record')
  })
})
