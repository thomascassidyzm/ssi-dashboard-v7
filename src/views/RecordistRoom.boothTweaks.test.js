// THREE SMALL THINGS ARAN ASKED FOR ON 2026-09-10, EACH PINNED BY WHAT IT COSTS.
//
//  • THE WAY BACK. "When I go to /r/human_aran_cym_n there is no navigation
//    back to the main stuff." There was none. It belongs on the ready card and
//    NOT on the recording stage — a link within reach of a thumb while the mic
//    is live is a lost take.
//  • THE AUTO-ADVANCE SWITCH, ON THE STAGE. "If I pause for thought, it starts
//    flicking through items." The switch existed, on the ready card only, so
//    the only way to reach it was to stop. The threshold is deliberately NOT
//    retuned; the reachable off-switch is the fix.
//  • THE CROSSING. Going from pod dialogue into the course's own sentences was
//    nearly silent, so the kind of material changed under him with no signal.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const savedTakes = vi.hoisted(() => new Map())
const rec = vi.hoisted(() => ({ beginLine: null, discardLine: null, endLine: null }))

vi.mock('@/composables/useRecordistQueue', () => ({
  DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
  useRecordistQueue: () => ({
    persistent: ref(true), carriedOverCount: ref(0), refusedCount: ref(0),
    isUnsent: () => false, attach: vi.fn(), teardown: vi.fn(),
    queueTake: (take) => { savedTakes.set(take.lineId, true) },
    markFailed: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: savedTakes, failed: new Map(),
    flush: vi.fn(), retryFailed: vi.fn(),
  }),
}))

vi.mock('@/composables/useTapRecorder', () => ({
  DEFAULT_CAPTURE_PROFILE: 'voice',
  resolveCaptureProfile: () => 'voice',
  useTapRecorder: () => ({
    isRecording: ref(true), level: ref(0.3), clipping: ref(false),
    devices: ref([]), appliedSettings: ref({}), profile: ref('voice'), error: ref(null),
    lineHasSpeech: ref(true), quietMs: ref(0), meterTrusted: ref(true),
    inputPeak: ref(0.4), roomTone: ref(0.001),
    listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    beginLine: rec.beginLine, endLine: rec.endLine, discardLine: rec.discardLine,
    stop: vi.fn().mockResolvedValue(undefined),
  }),
}))

import RecordistRoom from './RecordistRoom.vue'

const RouterLinkStub = { props: ['to'], template: '<a class="rl" :href="to"><slot/></a>' }

// A pod line and a course sentence, in that order — the crossing he hit.
function stubQueue(extra = {}) {
  global.fetch = vi.fn().mockImplementation(() => Promise.resolve({
    ok: true, status: 200,
    json: async () => ({
      displayName: 'Aran', languageName: 'Welsh', total: 2, recorded: 0, remaining: 2,
      lines: [
        { id: 'p1', order: 1, text: 'llinell pod', knownText: 'a pod line', kind: 'pod', podSlug: 'pod-0', recorded: false, clipUrl: null, canEditText: true },
        { id: 's1', order: 2, text: 'brawddeg cwrs', knownText: 'a course sentence', kind: 'seed', seedNumber: 7, recorded: false, clipUrl: null, canEditText: false },
      ],
      ...extra,
    }),
  }))
}

const mountBooth = () => mount(RecordistRoom, {
  props: { voiceId: 'human_aran_cym_n' },
  global: { stubs: { RouterLink: RouterLinkStub } },
})

describe('RecordistRoom — the way back, the switch and the crossing', () => {
  let clock = 1_000_000
  beforeEach(() => {
    savedTakes.clear(); stubQueue()
    rec.beginLine = vi.fn()
    rec.discardLine = vi.fn().mockResolvedValue(undefined)
    rec.endLine = vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)], { type: 'audio/webm' })))
    clock = 1_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => clock)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('offers a way back to Popty from the ready card, and never from the stage', async () => {
    const w = mountBooth()
    await flushPromises()
    const back = w.find('.rc-back')
    expect(back.exists()).toBe(true)
    expect(back.attributes('href')).toBe('/')

    await w.find('.btn-begin').trigger('click')
    await flushPromises()
    expect(w.find('.stage').exists()).toBe(true)
    expect(w.find('.rc-back').exists()).toBe(false)
  })

  it('puts the auto-advance switch on the recording screen, reachable mid-session', async () => {
    const w = mountBooth()
    await flushPromises()
    await w.find('.btn-begin').trigger('click')
    await flushPromises()

    const sw = w.find('.stage-auto input')
    expect(sw.exists()).toBe(true)
    expect(sw.element.checked).toBe(true)
    expect(w.find('.stage-auto').text()).toContain('Moving on by itself')

    await sw.setValue(false)
    expect(w.find('.stage-auto').text()).toContain('tap Next')
    // Turning it off does not stop the session — that is the entire point.
    expect(w.find('.stage').exists()).toBe(true)
  })

  it('tells him about takes he made on lines that are now somebody else\'s', async () => {
    // Tom, 2026-09-10: "we recast Aran's lines for Catrin to disambiguate the
    // roles better." 29 real lines moved that way. His takes stayed; the LINES
    // went to her bucket, so they left his queue and his history stopped dead
    // at the last line he still owns — which is exactly the gap at scene 14 he
    // reported. It has to say the takes are still there and still his doing.
    stubQueue({ handedOn: [{ podId: 'cym_n_for_eng:pod-0', podSlug: 'pod-0', podTitle: 'x', courseCode: 'cym_n_for_eng', castTo: 'Catrin', lines: 29 }] })
    const w = mountBooth()
    await flushPromises()
    const said = w.find('.handed-on')
    expect(said.exists()).toBe(true)
    const words = said.text().replace(/\s+/g, ' ')
    expect(words).toContain('You recorded 29 more lines of POD-1')
    expect(words).toContain('given to Catrin to read')
    expect(words).toContain('still there')
    // AND IT IS NOT WORK. Nothing about it may reach a count of what is left or
    // put a line in front of him: re-recording what he has already done is the
    // one outcome worth more than all the rest of this put together.
    expect(w.find('.rc-progress-line').text()).toContain('2 lines')
    expect(w.findAll('.tick').length).toBe(2)
  })

  it('says so when the run crosses from pod dialogue into course sentences', async () => {
    const w = mountBooth()
    await flushPromises()
    await w.find('.btn-begin').trigger('click')
    await flushPromises()
    // Nothing to announce on the first line of a run.
    expect(w.find('.crossing').exists()).toBe(false)

    clock += 5000
    await w.find('.ctl-next').trigger('click')
    await flushPromises()
    expect(w.find('.line-target').text()).toBe('brawddeg cwrs')
    const said = w.find('.crossing')
    expect(said.exists()).toBe(true)
    expect(said.text()).toContain('POD-1')
    expect(said.text()).toContain('NEW SEEDS')
    // A marker, not an alert: the run is still running and nothing is waiting
    // on a tap.
    expect(w.find('.stage').exists()).toBe(true)
    expect(w.find('.ctl-next').attributes('disabled')).toBeUndefined()
  })
})
