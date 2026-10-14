// A submitted setup check whose automatic verdict said "try again" must still
// offer Submit, so the artist can re-record and resubmit (review #437).
//
// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { ref, reactive } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/composables/useRecordistQueue', () => ({
  DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
  useRecordistQueue: () => ({
    persistent: ref(true), carriedOverCount: ref(0), refusedCount: ref(0),
    isUnsent: () => false, attach: vi.fn(), teardown: vi.fn(),
    queueTake: vi.fn(), markFailed: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: reactive(new Map()), failed: new Map(),
    flush: vi.fn(), retryFailed: vi.fn(),
  }),
}))
vi.mock('@/composables/useTapRecorder', () => ({
  DEFAULT_CAPTURE_PROFILE: 'voice',
  resolveCaptureProfile: () => 'dry',
  useTapRecorder: () => ({
    isRecording: ref(false), level: ref(0), clipping: ref(false),
    devices: ref([]), appliedSettings: ref({}), profile: ref('voice'), error: ref(null),
    lineHasSpeech: ref(true), quietMs: ref(0), meterTrusted: ref(true),
    inputPeak: ref(0), roomTone: ref(0.001),
    listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    beginLine: vi.fn(), endLine: vi.fn(), discardLine: vi.fn(), stop: vi.fn().mockResolvedValue(undefined),
  }),
}))

import RecordistRoom from './RecordistRoom.vue'

function mountWith(autoVerdict) {
  global.fetch = vi.fn().mockImplementation(() => Promise.resolve({
    ok: true, status: 200,
    json: async () => ({
      displayName: 'T', languageName: 'Welsh', total: 5, recorded: 5, remaining: 0,
      pack: { setup: { status: 'submitted', autoVerdict } },
      lines: Array.from({ length: 5 }, (_, i) => ({ id: `line-${i + 1}`, order: i + 1, text: `l ${i + 1}`, knownText: `l ${i + 1}`, recorded: true, clipUrl: null, canEditText: true })),
    }),
  }))
  return mount(RecordistRoom, { props: { voiceId: 'human_dan_pack' }, global: { stubs: { RouterLink: { template: '<a><slot/></a>' } } } })
}

describe('setup check: resubmit after a retry verdict', () => {
  it('offers Submit when the submitted check got a retry verdict', async () => {
    const w = mountWith({ verdict: 'retry', reasons: ['Try a quieter room.'] })
    await vi.waitFor(() => expect(w.text()).toContain('try again'))
    await flushPromises()
    expect(w.text()).toContain('Submit my setup check')
  })
  it('offers no Submit when the submitted check passed', async () => {
    const w = mountWith({ verdict: 'pass', reasons: [] })
    await vi.waitFor(() => expect(w.text()).toContain('sounds good'))
    await flushPromises()
    expect(w.text()).not.toContain('Submit my setup check')
  })
})
