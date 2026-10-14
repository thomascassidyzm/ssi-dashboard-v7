// THE PROMPTER (Aran, 2026-10-14, job #424; design #419 Option A, B's rail, C's done list).
//
// What this pins is the SHAPE Aran chose, with a mocked mic and a mocked queue — nothing here
// records or uploads anything:
//   · the batch page IS the reading screen: the first line to read is already drawn big, and
//     Start sits in the transport, where Next will be;
//   · one where-am-I row (‹ home on its left); while the mic is live it is words only;
//   · one status row while live (Stop · one mic chip · the count · Pause), far from the thumb;
//   · the transport pinned at the bottom is ‹ Back · Again · Next, in that order;
//   · everything that is not the line lives in ONE sheet, never on the stage;
//   · the done screen lists this session's takes, each with ▶ and Again.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const savedTakes = vi.hoisted(() => new Map())

vi.mock('@/composables/useRecordistQueue', () => ({
  DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
  useRecordistQueue: () => ({
    persistent: ref(true), carriedOverCount: ref(0), refusedCount: ref(0),
    isUnsent: () => false, attach: vi.fn(), teardown: vi.fn(), reset: vi.fn(),
    queueTake: (take) => { savedTakes.set(take.lineId, true) },
    markFailed: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: savedTakes, failed: new Map(),
    flush: vi.fn(), retryFailed: vi.fn(),
  }),
}))

vi.mock('@/composables/useTapRecorder', () => ({
  DEFAULT_CAPTURE_PROFILE: 'voice',
  resolveCaptureProfile: () => 'phone',
  useTapRecorder: () => ({
    isRecording: ref(true), level: ref(0.3), clipping: ref(false),
    devices: ref([]), appliedSettings: ref({}), profile: ref('voice'), error: ref(null),
    lineHasSpeech: ref(true), quietMs: ref(0), meterTrusted: ref(true),
    inputPeak: ref(0.4), roomTone: ref(0.001),
    listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    awaitLeadIn: vi.fn().mockResolvedValue(undefined),
    beginLine: vi.fn(),
    endLine: vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)], { type: 'audio/webm' }))),
    discardLine: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  }),
}))

import RecordistRoom from './RecordistRoom.vue'

// One line of each kind the booth serves: a new sentence, a LEGO (#366), a practice phrase and a
// pod line with its exchange around it. The layout is the same for all of them.
const LINES = [
  { id: 's1', kind: 'seed', seedNumber: 12, text: "Dw i'n mynd i ddysgu Cymraeg", knownText: "I'm going to learn Welsh", recorded: false, clipUrl: null },
  { id: 'l1', kind: 'lego', legoId: 'S0012L02', text: 'i ddysgu', knownText: 'to learn', recorded: false, clipUrl: null },
  { id: 'p1', kind: 'phrase', text: 'dysgu Cymraeg', knownText: 'learn Welsh', recorded: false, clipUrl: null },
  { id: 'd1', kind: 'pod', podSlug: 'pod-1', speaker: 'Aran', text: 'Bore da', knownText: 'Good morning', recorded: false, clipUrl: null,
    context: { before: [{ speaker: 'Catrin', text: 'Helo!' }], after: [{ speaker: 'Catrin', text: 'Sut wyt ti?' }] } },
]

function stubQueue() {
  global.fetch = vi.fn().mockImplementation(() => Promise.resolve({
    ok: true, status: 200,
    json: async () => ({ displayName: 'Aran', languageName: 'Welsh', total: 4, recorded: 0, remaining: 4, lines: LINES }),
  }))
}

async function readyPage() {
  const w = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' }, global: { stubs: { RouterLink: true } } })
  await flushPromises()
  return w
}

describe('RecordistRoom — the prompter layout', () => {
  let clock = 1_000_000
  beforeEach(() => {
    savedTakes.clear(); stubQueue()
    vi.spyOn(Date, 'now').mockImplementation(() => clock)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('draws the first line on the batch page, with Start in the transport where Next will be', async () => {
    const w = await readyPage()
    expect(w.find('[data-test="ready-line"]').text()).toBe("Dw i'n mynd i ddysgu Cymraeg")
    expect(w.find('[data-test="ready"] .line-known').text()).toBe("I'm going to learn Welsh")
    const transport = w.find('[data-test="transport"]')
    expect(transport.find('.btn-begin').text()).toBe('Start recording')
    // The settings are one line above Start, not a page of switches before it.
    expect(transport.find('[data-test="setline"]').text()).toContain('Change')
    // ONE where-am-I row, ‹ home on its left, and no second row of links.
    expect(w.findAll('[data-test="where"]')).toHaveLength(1)
    expect(w.find('[data-test="where"] [data-test="back-home"]').exists()).toBe(true)
    // Everything else is in the sheet, which is shut until he opens it.
    const shown = () => !(w.find('[data-test="sheet"]').attributes('style') || '').includes('display: none')
    expect(shown()).toBe(false)
    expect(w.find('[data-test="sheet"] .roster').exists()).toBe(true)
    expect(w.find('[data-test="sheet"] .rc-nav').exists()).toBe(true)
    await w.find('[data-test="open-sheet"]').trigger('click')
    expect(shown()).toBe(true)
  })

  it('while live: words-only where row, one status row, Back · Again · Next at the bottom, no sheet', async () => {
    const w = await readyPage()
    await w.find('.btn-begin').trigger('click')
    await flushPromises()
    const where = w.find('[data-test="where"]')
    expect(where.classes()).toContain('live')
    expect(where.findAll('button, a')).toHaveLength(0)
    const status = w.find('[data-test="status"]')
    expect(status.find('.btn-finish').text()).toBe('Stop')
    expect(status.findAll('.mic')).toHaveLength(1)
    expect(status.find('.mic-word').text()).toBe('Recording')
    expect(status.find('[data-test="count"]').text()).toBe('0 of 4')
    expect(status.find('.ctl-pause').text()).toBe('Pause')
    // The old four signals are gone.
    for (const old of ['.onair', '.meter-tag', '.state-pill', '.live-dot']) expect(w.find(old).exists()).toBe(false)
    const transport = w.findAll('[data-test="transport"] .controls button').map(b => b.text())
    expect(transport).toEqual(['‹', 'Again', 'Next'])
    expect(w.find('[data-test="sheet"]').exists()).toBe(false)
    expect(w.find('.line-target').text()).toBe("Dw i'n mynd i ddysgu Cymraeg")
  })

  it('serves every line kind in the same frame, and the pod line keeps its exchange', async () => {
    const w = await readyPage()
    await w.find('.btn-begin').trigger('click')
    await flushPromises()
    const seen = []
    for (let i = 0; i < 4; i++) {
      seen.push([w.find('.line-kind').text(), w.find('.line-target').text()])
      expect(w.find('[data-test="transport"] .ctl-next').exists()).toBe(true)
      if (i === 3) {
        expect(w.find('.cue-before').text()).toContain('Helo!')
        expect(w.find('.cue-after').text()).toContain('Sut wyt ti?')
      }
      clock += 5000
      if (i < 3) { await w.find('.ctl-next').trigger('click'); await flushPromises() }
    }
    expect(seen.map(s => s[1])).toEqual(["Dw i'n mynd i ddysgu Cymraeg", 'i ddysgu', 'dysgu Cymraeg', 'Bore da'])
    expect(seen[1][0]).toContain('LEGO')
    expect(seen[2][0]).toContain('Practice phrase')
    // The line just read sits right under the line being read.
    expect(w.find('.hear-bar').text()).toContain('dysgu Cymraeg')
  })

  it('ends on the listen-back list: each take this session with ▶ and Again', async () => {
    const w = await readyPage()
    await w.find('.btn-begin').trigger('click')
    await flushPromises()
    clock += 5000
    await w.find('.ctl-next').trigger('click'); await flushPromises()
    clock += 5000
    await w.find('.btn-finish').trigger('click'); await flushPromises()
    const done = w.find('[data-test="done"]')
    expect(done.exists()).toBe(true)
    const rows = done.findAll('.done-list li')
    expect(rows.map(r => r.find('.listen-text').text())).toEqual(["Dw i'n mynd i ddysgu Cymraeg", 'i ddysgu'])
    for (const r of rows) expect(r.find('.again-btn').text()).toBe('Again')
    // Back on the navbar side: the where row's ‹ and the sheet come back with the mic off.
    expect(w.find('[data-test="back-home"]').exists()).toBe(true)
    expect(w.find('[data-test="sheet"]').exists()).toBe(true)
  })
})
