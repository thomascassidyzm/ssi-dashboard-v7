// THE MIC OPENS BEFORE THE LINE APPEARS (Tom's ruling, 2026-09-02).
//
// The composable's own test (useTapRecorder.coldstart.test.js) pins the AGE the
// recorder reaches. This one pins the thing that makes that age reach the take:
// the booth must not put a line in front of the recordist until the settling
// period is over, because a line on screen is a line being read. And it must
// not make her wait when there is nothing to wait for.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const spies = vi.hoisted(() => ({ beginLine: vi.fn(), resolveLeadIn: null, leadInCalls: 0 }))

vi.mock('@/composables/useRecordistQueue', () => ({
  useRecordistQueue: () => ({
    queueTake: vi.fn(), markFailed: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: new Map(), failed: new Map(),
    flush: vi.fn(), retryFailed: vi.fn(),
  }),
}))

vi.mock('@/composables/useTapRecorder', () => ({
  DEFAULT_CAPTURE_PROFILE: 'voice',
  resolveCaptureProfile: () => 'dry',
  useTapRecorder: () => ({
    isRecording: ref(true), level: ref(0.3), clipping: ref(false),
    devices: ref([]), appliedSettings: ref({}), profile: ref('voice'), error: ref(null),
    lineHasSpeech: ref(false), quietMs: ref(0), meterTrusted: ref(true),
    inputPeak: ref(0.4), roomTone: ref(0.001),
    listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    // Held open so the test can stand inside the settling period and look at
    // the screen — which is the only moment this fix is about.
    awaitLeadIn: vi.fn(() => {
      spies.leadInCalls += 1
      return new Promise((resolve) => { spies.resolveLeadIn = resolve })
    }),
    activeAgeMs: () => 0,
    beginLine: spies.beginLine,
    endLine: vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)], { type: 'audio/webm' }))),
    discardLine: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  }),
}))

import RecordistRoom from './RecordistRoom.vue'

function stubQueue() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true, status: 200,
    json: async () => ({
      displayName: 'Catrin', languageName: 'Welsh', total: 2, recorded: 0, remaining: 2,
      lines: [
        { id: 'line-1', order: 1, text: 'Bore da', knownText: 'Good morning', courseCode: 'cym_n_for_eng', recorded: false, clipUrl: null },
        { id: 'line-2', order: 2, text: 'Nos da', knownText: 'Good night', courseCode: 'cym_n_for_eng', recorded: false, clipUrl: null },
      ],
    }),
  })
}

async function startSession() {
  const wrapper = mount(RecordistRoom, { props: { voiceId: 'catrin' } })
  await flushPromises()
  await wrapper.find('.btn-begin').trigger('click')
  await flushPromises()
  return wrapper
}

describe('RecordistRoom — the cold start', () => {
  beforeEach(() => { spies.beginLine.mockClear(); spies.resolveLeadIn = null; spies.leadInCalls = 0; stubQueue() })

  it('shows nothing to read while the recorder is filling', async () => {
    const wrapper = await startSession()

    // The mic is open — we are past recorder.start() — and the line is NOT on
    // screen. If this ever finds a line here, the first take of the day is
    // being read into a newborn recorder again.
    expect(spies.leadInCalls).toBe(1)
    expect(wrapper.find('.line-target').exists()).toBe(false)
    expect(wrapper.find('.arming-well').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Bore da')

    // And the line is not open yet either: nothing is being timed against a
    // read that cannot have started.
    expect(spies.beginLine).not.toHaveBeenCalled()
  })

  it('says on air throughout, arming first and live at the reveal', async () => {
    const wrapper = await startSession()

    const armed = wrapper.find('.onair')
    expect(armed.exists()).toBe(true)               // always visible, from the first frame
    expect(armed.text()).toBe('Getting ready')
    expect(armed.classes()).toContain('arming')
    // No counting down at anybody.
    expect(wrapper.text()).not.toMatch(/\b3\b.*\b2\b.*\b1\b/)

    spies.resolveLeadIn()
    await flushPromises()

    const live = wrapper.find('.onair')
    expect(live.text()).toBe('On air')
    expect(live.classes()).not.toContain('arming')
    // The reveal IS the go signal: the words arrive in the same frame the
    // indicator settles.
    expect(wrapper.find('.line-target').text()).toBe('Bore da')
    expect(spies.beginLine).toHaveBeenCalledTimes(1)
  })

  it('holds the transport inert until the line is on screen', async () => {
    const wrapper = await startSession()

    expect(wrapper.find('.ctl-next').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.ctl-again').attributes('disabled')).toBeDefined()

    spies.resolveLeadIn()
    await flushPromises()
    expect(wrapper.find('.ctl-next').attributes('disabled')).toBeUndefined()
  })
})
