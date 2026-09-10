// PAUSED, HE CAN STILL STEP BACK AND STILL STOP.
//
// Aran, 2026-09-10: "pause disables the back button". He pressed Pause because
// he wanted to go back, and that is the one moment the old guard locked him
// out. The guard exists to protect the HELD MICROPHONE, and it treated four
// buttons alike when they are not: Again and Next need the mic open and file a
// take onto the line on screen; Back and Stop here file nothing at all.
//
// The three ways relaxing it could go wrong, and all three are pinned below:
// Back quietly re-opens the microphone behind a screen still saying Paused;
// Stop files the discarded attempt as a take; or the hold survives into the
// next session. Again and Next must stay locked.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const queueTake = vi.fn()
const savedTakes = vi.hoisted(() => new Map())
const rec = vi.hoisted(() => ({ beginLine: null, discardLine: null, endLine: null }))

vi.mock('@/composables/useRecordistQueue', () => ({
  DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
  useRecordistQueue: () => ({
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
  await wrapper.find('.btn-begin').trigger('click')
  await flushPromises()
  return wrapper
}

describe('RecordistRoom — Back and Stop while paused', () => {
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

  it('steps back while paused without re-opening the microphone', async () => {
    const wrapper = await intoTheBooth()
    // Onto line two, so there is somewhere to go back to.
    clock += 5000
    await wrapper.find('.ctl-next').trigger('click')
    await flushPromises()
    expect(wrapper.find('.line-target').text()).toBe('llinell dau')

    // Next filed line one, which is what Next is for. From here on nothing
    // should reach the queue.
    queueTake.mockClear()
    clock += 5000
    await wrapper.find('.ctl-pause').trigger('click')
    await flushPromises()
    expect(wrapper.find('.ctl-pause').text()).toBe('Play')

    const back = wrapper.find('.ctl-back')
    expect(back.attributes('disabled')).toBeUndefined()
    rec.beginLine.mockClear()
    clock += 5000
    await back.trigger('click')
    await flushPromises()

    // He is on the line he wanted…
    expect(wrapper.find('.line-target').text()).toBe('llinell un')
    // …still paused, with the mic still held and nothing recording.
    expect(wrapper.find('.ctl-pause').text()).toBe('Play')
    expect(rec.beginLine).not.toHaveBeenCalled()
    expect(wrapper.find('.meter-tag').text()).toContain('nothing is being recorded')
    // Back files nothing, paused or not.
    expect(queueTake).not.toHaveBeenCalled()
    // Again and Next stay locked: those two do need the mic.
    expect(wrapper.find('.ctl-again').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.ctl-next').attributes('disabled')).toBeDefined()
  })

  it('stops while paused without filing the discarded attempt', async () => {
    const wrapper = await intoTheBooth()
    clock += 5000
    await wrapper.find('.ctl-pause').trigger('click')
    await flushPromises()

    const stop = wrapper.find('.btn-finish')
    expect(stop.attributes('disabled')).toBeUndefined()
    rec.endLine.mockClear()
    await stop.trigger('click')
    await flushPromises()

    // The session is over and the attempt he paused on was thrown away, never
    // closed — so nothing reached the queue and no phantom take was filed.
    expect(rec.endLine).not.toHaveBeenCalled()
    expect(queueTake).not.toHaveBeenCalled()
    expect(wrapper.find('.stage').exists()).toBe(false)
  })
})
