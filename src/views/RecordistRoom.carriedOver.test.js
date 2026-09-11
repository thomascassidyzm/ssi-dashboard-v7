// @vitest-environment jsdom
/**
 * A take carried over on the device from an earlier session, uploaded after
 * the queue loaded, is a RECORDING (Tom, 2026-09-11). The wire said
 * recorded:false when the page opened; the durable store then got the take
 * through; the line must not come back as "still to read" the moment it stops
 * being pending. That gap re-served Aran on 2026-09-11.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const savedTakes = vi.hoisted(() => new Map())
const failedTakes = vi.hoisted(() => new Map())

vi.mock('@/composables/useRecordistQueue', () => ({
  DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
  useRecordistQueue: () => ({
    persistent: ref(true), carriedOverCount: ref(0), refusedCount: ref(0),
    isUnsent: () => false, attach: vi.fn(), teardown: vi.fn(),
    queueTake: vi.fn(), markFailed: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: savedTakes, failed: failedTakes,
    flush: vi.fn(), retryFailed: vi.fn(),
  }),
}))

vi.mock('@/composables/useTapRecorder', () => ({
  DEFAULT_CAPTURE_PROFILE: 'voice',
  resolveCaptureProfile: () => 'dry',
  useTapRecorder: () => ({
    isRecording: ref(false), level: ref(0), clipping: ref(false),
    devices: ref([]), appliedSettings: ref({}), profile: ref('voice'), error: ref(null),
    lineHasSpeech: ref(false), quietMs: ref(0), meterTrusted: ref(true),
    inputPeak: ref(0), roomTone: ref(0.001),
    listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    awaitLeadIn: vi.fn().mockResolvedValue(1200), activeAgeMs: () => 1200,
    beginLine: vi.fn(), endLine: vi.fn(), discardLine: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  }),
}))

import RecordistRoom from './RecordistRoom.vue'

function stubQueue() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true, status: 200,
    json: async () => ({
      displayName: 'Aran', languageName: 'Welsh', total: 2, recorded: 0, remaining: 2,
      lines: [
        { id: 'line-1', order: 1, text: 'Prynhawn da.', knownText: 'Good afternoon.', speaker: 'Aran', courseCode: 'cym_n_for_eng', recorded: false, clipUrl: null },
        { id: 'line-2', order: 2, text: 'Nos da.', knownText: 'Good night.', speaker: 'Aran', courseCode: 'cym_n_for_eng', recorded: false, clipUrl: null },
      ],
    }),
  })
}

describe('RecordistRoom — a carried-over take that got through is a recorded line', () => {
  beforeEach(() => { savedTakes.clear(); failedTakes.clear(); stubQueue() })

  it('does not offer the line again, and does not count it as still to read', async () => {
    // The device's durable store confirmed line-1 AFTER the wire said recorded:false.
    savedTakes.set('line-1', { audioId: 'a1', clipUrl: '/clip' })
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' } })
    await flushPromises()
    expect(wrapper.text()).toContain('1 still to read')
    expect(wrapper.text()).not.toContain('2 still to read')
    await wrapper.find('.btn-begin').trigger('click')
    await flushPromises()
    expect(wrapper.find('.line-target').text()).toBe('Nos da.')
  })

  it('still offers a line the store has NOT confirmed', async () => {
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' } })
    await flushPromises()
    expect(wrapper.text()).toContain('2 still to read')
    await wrapper.find('.btn-begin').trigger('click')
    await flushPromises()
    expect(wrapper.find('.line-target').text()).toBe('Prynhawn da.')
  })
})
