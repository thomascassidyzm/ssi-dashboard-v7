// Aran, 2026-10-15 (job #679): a take the server REFUSES (e.g. 422 "no audible speech") must be
// impossible to miss while recording: a red notice naming the line, kept until he re-records or
// dismisses it, and the line must not count as recorded.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, reactive } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const rec = vi.hoisted(() => ({ failed: null }))
vi.mock('@/composables/useRecordistQueue', () => ({
  DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
  useRecordistQueue: () => ({
    persistent: ref(true), carriedOverCount: ref(0), refusedCount: ref(0),
    isUnsent: () => false, attach: vi.fn(), teardown: vi.fn(), queueTake: vi.fn(), markFailed: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: reactive(new Map()), failed: rec.failed, flush: vi.fn(), retryFailed: vi.fn(),
  }),
}))
vi.mock('@/composables/useTapRecorder', () => ({
  DEFAULT_CAPTURE_PROFILE: 'voice', resolveCaptureProfile: () => 'voice',
  useTapRecorder: () => ({
    isRecording: ref(true), level: ref(0.3), clipping: ref(false), devices: ref([]),
    appliedSettings: ref({}), profile: ref('voice'), error: ref(null), lineHasSpeech: ref(true),
    quietMs: ref(0), meterTrusted: ref(true), inputPeak: ref(0.4), roomTone: ref(0.001),
    listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    beginLine: vi.fn(), endLine: vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)]))),
    discardLine: vi.fn().mockResolvedValue(undefined), stop: vi.fn().mockResolvedValue(undefined),
  }),
}))
import RecordistRoom from './RecordistRoom.vue'

beforeEach(() => {
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
})

async function live() {
  const w = mount(RecordistRoom, { props: { voiceId: 'human_tom_zzz' } })
  await flushPromises()
  await w.find('.btn-begin').trigger('click')
  await flushPromises()
  return w
}


rec.failed = reactive(new Map())

describe('RecordistRoom — a refused take shows a red notice', () => {
  it('names the line, keeps the reason, uncounts it, and survives until dismissed', async () => {
    rec.failed.clear()
    const w = await live()
    expect(w.find('[data-test="refused-notice"]').exists()).toBe(false)
    rec.failed.set('line-1', 'This take contains no audible speech (0ms after silence trimming), so it was not saved.')
    await flushPromises()
    const n = w.find('[data-test="refused-notice"]')
    expect(n.exists()).toBe(true)
    expect(n.text()).toContain("That line didn't save")
    expect(n.text()).toContain('llinell un')
    expect(n.text()).toContain('no audible speech')
    expect(w.find('[data-test="refused-rerecord"]').text()).toContain('re-record')
    expect(w.text()).toContain('0 of 2')
    await w.find('[data-test="refused-dismiss"]').trigger('click')
    expect(w.find('[data-test="refused-notice"]').exists()).toBe(false)
  })
})
