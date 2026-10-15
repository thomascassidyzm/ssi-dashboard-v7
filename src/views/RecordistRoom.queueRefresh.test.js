// LINES NEWLY CAST TO HIM APPEAR WHEN HE COMES BACK TO THE TAB (job #804, Kai 15 Oct): Dan's
// booth read its queue once and never again, so lines cast to him after he opened it stayed
// invisible until a manual reload. Coming back to the tab now reads it again, keeping his place.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/composables/useTapRecorder', () => ({
  DEFAULT_CAPTURE_PROFILE: 'voice',
  resolveCaptureProfile: () => 'voice',
  useTapRecorder: () => ({
    isRecording: ref(false), level: ref(0), clipping: ref(false),
    devices: ref([]), appliedSettings: ref({}), profile: ref('voice'), error: ref(null),
    lineHasSpeech: ref(true), quietMs: ref(0), meterTrusted: ref(true),
    inputPeak: ref(0), roomTone: ref(0.001),
    listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    awaitLeadIn: vi.fn().mockResolvedValue(1200), activeAgeMs: () => 1200,
    beginLine: vi.fn(), endLine: vi.fn(), discardLine: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  }),
}))

import RecordistRoom from './RecordistRoom.vue'

// Each test is a fresh visit: the booth remembers its line cursor in localStorage per voice
// and batch (booth-cursor.js), and one test's cursor must not open the next test's Start.
beforeEach(() => { if (typeof localStorage === 'undefined') return; for (const k of Object.keys(localStorage)) if (k.startsWith('recordist.cursor.')) localStorage.removeItem(k) })

const VOICE = 'human_dan_cym_s'
let queue
let reads = 0
function serve() {
  reads = 0
  global.fetch = vi.fn(async (url) => {
    const u = String(url)
    if (u.includes(`/api/recording/voice/${VOICE}?`)) {
      reads++
      const lines = queue.map((l, i) => ({ ...l, order: i + 1, speaker: 'Dan', courseCode: 'cym_s_for_eng', kind: 'pod', clipUrl: null }))
      return { ok: true, status: 200, json: async () => ({ displayName: 'Dan', languageName: 'Welsh', total: lines.length, recorded: 0, remaining: lines.length, lines }) }
    }
    throw new Error(`unexpected fetch ${u}`)
  })
}
const RouterLinkStub = { props: ['to'], template: '<a class="rl" :href="to"><slot/></a>' }
const rows = (w) => w.findAll('.bl-row').map(r => r.text())
const comeBack = async () => { document.dispatchEvent(new Event('visibilitychange')); await flushPromises(); await flushPromises() }

describe('RecordistRoom — the queue is read again when the booth comes back into view', () => {
  let now
  beforeEach(() => {
    queue = [{ id: 'A1', text: 'Bore da.', podSlug: 'pod-1', recorded: false }, { id: 'A2', text: 'Nos da.', podSlug: 'pod-1', recorded: false }]
    serve()
    now = 1_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    window.history.replaceState({}, '', `/r/${VOICE}?course=cym_s_for_eng`)
  })

  it('a line cast to him while the tab was away is on the screen when he returns, and his place is kept', async () => {
    const w = mount(RecordistRoom, { props: { voiceId: VOICE }, global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises(); await flushPromises()
    expect(reads).toBe(1)
    expect(w.findAll('.bl-row')).toHaveLength(2)
    // He taps the second line: that is his cursor.
    await w.findAll('.bl-go')[1].trigger('click')
    await flushPromises()
    expect(w.find('[data-test="ready-line"]').text()).toContain('Nos da.')

    queue = [...queue, { id: 'A3', text: 'Diolch.', podSlug: 'pod-1', recorded: false }]
    now += 60_000
    await comeBack()
    expect(reads).toBe(2)
    expect(w.findAll('.bl-row')).toHaveLength(3)
    expect(rows(w).join(' ')).toContain('Diolch.')
    expect(w.find('[data-test="ready-line"]').text()).toContain('Nos da.')
  })

  it('focus and visibilitychange together, or a quick second return, read it once', async () => {
    mount(RecordistRoom, { props: { voiceId: VOICE }, global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises(); await flushPromises()
    now += 60_000
    await comeBack()
    window.dispatchEvent(new Event('focus'))
    await flushPromises()
    now += 5_000
    await comeBack()
    expect(reads).toBe(2)
  })
})
