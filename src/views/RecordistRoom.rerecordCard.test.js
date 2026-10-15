// Aran, 2026-10-15 (job #788): "give me a 're-record' card on my recording page, where all the misses
// get dumped together." This drives the real booth home over the real take-store rules: the server's
// skipped and text-changed lines, a refused take and a take still uploading on the device's shelf.
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
    isRecording: ref(false), level: ref(0.3), clipping: ref(false), devices: ref([]), appliedSettings: ref({}),
    profile: ref('voice'), error: ref(null), lineHasSpeech: ref(true), quietMs: ref(0), meterTrusted: ref(true),
    inputPeak: ref(0.4), roomTone: ref(0.001), listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    awaitLeadIn: vi.fn().mockResolvedValue(1200), activeAgeMs: () => 1200, beginLine: vi.fn(),
    endLine: vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)]))),
    discardLine: vi.fn().mockResolvedValue(undefined), stop: vi.fn().mockResolvedValue(undefined),
  }),
}))
import { createMemoryBackend } from '@/services/takeStore'
import RecordistRoom from './RecordistRoom.vue'

beforeEach(() => { if (typeof localStorage === 'undefined') return; for (const k of Object.keys(localStorage)) if (k.startsWith('recordist.') || k.startsWith('popty.')) localStorage.removeItem(k) })

const VOICE = 'human_aran_cym_n'
const TRACK = 'seed.cym_nv2_for_eng'
const line = (n, extra = {}) => ({ id: `s${n}`, order: n, text: `Cymraeg ${n}`, knownText: `English ${n}`, kind: 'seed', courseCode: 'cym_nv2_for_eng', seedNumber: n, recorded: false, ...extra })
const SUMMARY = {
  home: true, fresh: true, displayName: 'Aran', languageName: 'Welsh', language: 'cym',
  tracks: [{ key: TRACK, kind: 'seed', courseCode: 'cym_nv2_for_eng', total: 200, recorded: 120, batches: [{ n: 1, from: 1, to: 100, total: 100, recorded: 95 }, { n: 2, from: 101, to: 200, total: 100, recorded: 25 }] }],
}
// The server's list: two skips (s4 among them) and a line whose words changed after he read it.
const ITEMS = [
  { lineId: 's3', why: 'skipped', text: 'Cymraeg 3', track: TRACK, batch: 1 },
  { lineId: 's4', why: 'skipped', text: 'Cymraeg 4', track: TRACK, batch: 1 },
  { lineId: 's9', why: 'text_changed', text: 'Cymraeg 9', oldText: 'Hen Gymraeg 9', track: TRACK, batch: 1 },
]
const rec = (lineId, status, lastError = null) => ({
  id: `r-${lineId}`, voiceId: VOICE, lineId, text: `Cymraeg ${lineId.slice(1)}`, blob: new Blob([new Uint8Array(4096)]), device: '',
  status, attempts: status === 'refused' ? 1 : 0, lastError, createdAt: Date.now() - 1000, refusedAt: status === 'refused' ? 2 : undefined, nextAttemptAt: 0,
})

let calls = []
function serve() {
  calls = []
  global.fetch = vi.fn((url, opts = {}) => {
    const u = String(url)
    calls.push(u)
    const json = (body) => Promise.resolve({ ok: true, status: 200, json: async () => body })
    // A take going up never lands in this test: s4's take stays on the device, uploading.
    if ((opts.method || 'GET') !== 'GET') return new Promise(() => {})
    if (u.includes('/summary')) return json(SUMMARY)
    if (u.includes('/rerecord')) return json({ voiceId: VOICE, fresh: true, total: ITEMS.length, items: ITEMS, recordedAlso: [] })
    const q = new URL(u, 'http://x').searchParams
    if (q.get('track') === 'rerecord') {
      const lines = [line(3, { rerecordWhy: 'skipped' }), line(4, { rerecordWhy: 'skipped' }), line(9, { rerecordWhy: 'text_changed' }), line(120, { rerecordWhy: 'refused' })]
      return json({ displayName: 'Aran', languageName: 'Welsh', track: 'rerecord', batch: 1, total: lines.length, recorded: 0, remaining: lines.length, lines })
    }
    const all = Array.from({ length: 200 }, (_, i) => line(i + 1, { recorded: ![3, 4, 9, 120].includes(i + 1) }))
    return json({ displayName: 'Aran', languageName: 'Welsh', total: all.length, recorded: 196, remaining: 4, lines: all })
  })
}
async function home(shelfRecs) {
  shelf.backend = createMemoryBackend(shelfRecs)
  window.history.replaceState({}, '', '/')
  serve()
  const w = mount(RecordistRoom, { props: { voiceId: VOICE }, global: { stubs: { RouterLink: { template: '<a><slot/></a>' }, BoothTeamStats: true } } })
  for (let i = 0; i < 12; i++) await flushPromises()
  return w
}
const card = (w) => w.find('[data-test="rerecord-card"]')

describe('booth home — the re-record card', () => {
  it('counts the skips, the text change and the refused take, never the take still uploading, each with why', async () => {
    const w = await home([rec('s120', 'refused', "That take didn't capture any speech — check the right microphone is selected, then read the line again."), rec('s4', 'pending')])
    expect(card(w).exists()).toBe(true)
    expect(w.find('[data-test="rerecord-count"]').text()).toBe('3 lines to re-record')
    // it sits above Up next
    const html = w.html()
    expect(html.indexOf('data-test="rerecord-card"')).toBeLessThan(html.indexOf('data-test="up-next"'))
    await w.find('[data-test="rerecord-toggle"]').trigger('click')
    const why = (id) => w.find(`[data-test="rerecord-row-${id}"] [data-test="rerecord-why"]`)
    expect(why('s3').text()).toBe('skipped')
    expect(why('s9').text()).toBe('text changed')
    expect(w.find('[data-test="rerecord-row-s9"]').text()).toContain('was: Hen Gymraeg 9')
    expect(why('s120').text()).toBe("didn't save: no speech")
    expect(w.find('[data-test="rerecord-row-s4"]').exists()).toBe(false)
    // the page asked the server about its refused take
    expect(calls.some(u => u.includes('/rerecord') && u.includes('also=s120'))).toBe(true)
  })

  it('one tap opens a batch of only those lines; the uploading one is not in it', async () => {
    const w = await home([rec('s120', 'refused', 'no audible speech'), rec('s4', 'pending')])
    await w.find('[data-test="rerecord-start"]').trigger('click')
    for (let i = 0; i < 12; i++) await flushPromises()
    const q = new URLSearchParams(window.location.search)
    expect([q.get('track'), q.get('batch')]).toEqual(['rerecord', '1'])
    expect(calls.some(u => u.includes('track=rerecord') && u.includes('also=s120'))).toBe(true)
    expect(w.text()).toContain('Re-record · 3 left')
  })

  it('does not classify a refused phrase outside the currently served batch as an old copy', async () => {
    // The ordinary queue contains only the current phrase batch. /rerecord indexes
    // all batches and returns neither recordedAlso nor goneAlso for this valid id.
    const id = 'phrase:later:target1'
    const w = await home([rec(id, 'refused', 'no audible speech'), rec('s4', 'pending')])
    expect(w.find('[data-test="rerecord-count"]').text()).toBe('3 lines to re-record')
    expect(w.find('[data-test="rerecord-old"]').exists()).toBe(false)
    w.unmount()
  })

  it('hides when there is nothing to re-record', async () => {
    ITEMS.splice(0, ITEMS.length)
    const w = await home([])
    expect(card(w).exists()).toBe(false)
  })
})
