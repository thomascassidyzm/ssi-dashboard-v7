// PAUSE THROWS THE ATTEMPT AWAY, AND NOTHING REACHES THE SERVER.
//
// Aran, after reading 250 phrases on 2026-09-03: "a pause button which
// automatically discards that attempt and starts from fresh when they hit play
// would be brilliant". He needs a word, or the dog barks, and background noise
// KEEPS THE RECORDING GOING — so the ruined take has to be dealt with
// afterwards. The whole point is that it never gets that far.
//
// The two assertions that matter, and they are the two failure shapes: pausing
// DISCARDS and FILES NOTHING, and Play re-opens the SAME line clean rather than
// resuming mid-take.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const queueTake = vi.fn()
const savedTakes = vi.hoisted(() => new Map())
const rec = vi.hoisted(() => ({
  beginLine: null, discardLine: null, endLine: null,
}))

vi.mock('@/composables/useRecordistQueue', () => ({
  // The component renders this as an attribute on its root element, so a mock
  // of this module that omits it makes every mount in the file throw. That is
  // what took all four RecordistRoom suites red on 2026-09-03 -- 26 tests, the
  // whole of this component's mount coverage, silently gone.
  DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
  useRecordistQueue: () => ({
    // The durable take store, landed 2026-09-03. Every one of these is read by
    // the component, so a mock missing them throws on render rather than
    // failing an assertion -- which is how the drift stayed invisible.
    persistent: ref(true), carriedOverCount: ref(0), refusedCount: ref(0),
    isUnsent: () => false, attach: vi.fn(), teardown: vi.fn(),
    queueTake: (take) => { savedTakes.set(take.lineId, true); return queueTake(take) },
    markFailed: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: savedTakes, failed: new Map(),
    flush: vi.fn(), retryFailed: vi.fn(),
  }),
}))

vi.mock('@/composables/useTapRecorder', () => ({
  DEFAULT_CAPTURE_PROFILE: 'voice',
  resolveCaptureProfile: () => 'dry',
  useTapRecorder: () => ({
    isRecording: ref(true), level: ref(0.3), clipping: ref(false),
    devices: ref([]), appliedSettings: ref({}), profile: ref('voice'), error: ref(null),
    lineHasSpeech: ref(true), quietMs: ref(0), meterTrusted: ref(true),
    inputPeak: ref(0.4), roomTone: ref(0.001),
    listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    beginLine: rec.beginLine,
    endLine: rec.endLine,
    discardLine: rec.discardLine,
    stop: vi.fn().mockResolvedValue(undefined),
  }),
}))

import RecordistRoom from './RecordistRoom.vue'

// THE EVERY-LINE LIST IS SECTIONED NOW (2026-09-04). It opens onto shut
// headings, so a test that wants the rows opens the list and then every section
// in it — the same two taps Aran makes.
async function openEveryLine(wrapper) {
  await wrapper.find('.roster-toggle').trigger('click')
  for (const head of wrapper.findAll('.roster-list .sh-btn')) await head.trigger('click')
}


function stubQueue() {
  global.fetch = vi.fn().mockImplementation(() => Promise.resolve({
    ok: true, status: 200,
    json: async () => ({
      displayName: 'Test Voice', languageName: 'Welsh', total: 2, recorded: 0, remaining: 2,
      lines: [
        { id: 'line-1', order: 1, text: 'llinell un', knownText: 'line one', recorded: false, clipUrl: null, canEditText: true },
        { id: 'line-2', order: 2, text: 'llinell dau', knownText: 'line two', recorded: false, clipUrl: null, canEditText: true },
      ],
    }),
  }))
}

async function intoTheBooth() {
  const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_tom_zzz' } })
  await flushPromises()
  await openEveryLine(wrapper)
  await wrapper.findAll('.roster-list .row')[0].find('.row-record').trigger('click')
  await flushPromises()
  expect(wrapper.find('.line-target').text()).toBe('llinell un')
  return wrapper
}

describe('RecordistRoom — Pause discards the attempt', () => {
  let clock = 1_000_000
  beforeEach(() => {
    queueTake.mockClear(); savedTakes.clear(); stubQueue()
    rec.beginLine = vi.fn()
    rec.discardLine = vi.fn().mockResolvedValue(undefined)
    rec.endLine = vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)], { type: 'audio/webm' })))
    clock = 1_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => clock)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('discards the open capture, files nothing, and re-opens the same line on Play', async () => {
    const wrapper = await intoTheBooth()
    const pause = wrapper.find('.ctl-pause')
    expect(pause.text()).toBe('Pause')

    rec.discardLine.mockClear(); rec.beginLine.mockClear()
    await pause.trigger('click')
    await flushPromises()

    // The attempt is gone and the mic has stopped being a witness.
    expect(rec.discardLine).toHaveBeenCalledTimes(1)
    expect(rec.beginLine).not.toHaveBeenCalled()
    // Nothing was closed, so nothing was queued and no failure row appeared.
    expect(queueTake).not.toHaveBeenCalled()
    expect(rec.endLine).not.toHaveBeenCalled()

    // The screen says so, in words, and the control is now the way back.
    expect(wrapper.find('.ctl-pause').text()).toBe('Play')
    expect(wrapper.find('.stage-progress').text()).toContain('Paused')
    expect(wrapper.find('.meter-tag').text()).toContain('nothing is being recorded')

    // And nothing else on the transport can file a take while he is away.
    expect(wrapper.find('.ctl-next').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.ctl-again').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.btn-finish').attributes('disabled')).toBeDefined()

    // Play starts the SAME line again from scratch: discard whatever was caught
    // while held, then re-open line one clean. Not a resume.
    rec.discardLine.mockClear()
    await wrapper.find('.ctl-pause').trigger('click')
    await flushPromises()
    expect(rec.discardLine).toHaveBeenCalledTimes(1)
    expect(rec.beginLine).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.line-target').text()).toBe('llinell un')
    expect(wrapper.find('.ctl-pause').text()).toBe('Pause')
    expect(wrapper.find('.ctl-next').attributes('disabled')).toBeUndefined()
    expect(queueTake).not.toHaveBeenCalled()
  })

  it('takes P from the keyboard, and never while the rewrite box is open', async () => {
    const wrapper = await intoTheBooth()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }))
    await flushPromises()
    expect(wrapper.find('.ctl-pause').text()).toBe('Play')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'P' }))
    await flushPromises()
    expect(wrapper.find('.ctl-pause').text()).toBe('Pause')

    // A p typed into a rewrite is a letter, not a control — the same rule Space,
    // R and B already live by.
    await wrapper.find('.line-target').trigger('click')
    await flushPromises()
    expect(wrapper.find('.edit-box').exists()).toBe(true)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }))
    await flushPromises()
    expect(wrapper.find('.ctl-pause').text()).toBe('Pause')
  })
})
