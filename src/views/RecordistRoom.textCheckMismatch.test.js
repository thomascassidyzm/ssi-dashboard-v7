// Job #842 (Tom's condition on moving the script check after the upload's reply): a take that
// SAVED but whose background whisper check says it does not say its line comes back to the artist
// within the session — on the recording screen's one slim bar (#783), red on the rail, back in the
// reading flow, with what was heard under the words. Reading it again clears it at once.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, reactive } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const rec = vi.hoisted(() => ({ queueTake: null }))
vi.mock('@/composables/useRecordistQueue', () => ({
  DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
  useRecordistQueue: () => ({
    persistent: ref(true), carriedOverCount: ref(0), refusedCount: ref(0),
    isUnsent: () => false, attach: vi.fn(), teardown: vi.fn(), queueTake: rec.queueTake, markFailed: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: reactive(new Map([['line-2', true]])), failed: reactive(new Map()), flush: vi.fn(), retryFailed: vi.fn(),
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

const LINES = [1, 2, 3, 4].map(n => ({
  id: `line-${n}`, order: n, text: `llinell ${n}`, knownText: `line ${n}`, recorded: n <= 2, clipUrl: null,
}))
let failures
beforeEach(() => {
  rec.queueTake = vi.fn()
  if (typeof localStorage !== 'undefined') for (const k of Object.keys(localStorage)) if (k.startsWith('recordist.cursor.')) localStorage.removeItem(k)
  failures = [{ lineId: 'line-2', takeId: 'TAKE-2', heard: 'llinell dau', reason: 'cer_above_threshold' }]
  global.fetch = vi.fn().mockImplementation((url) => Promise.resolve({
    ok: true, status: 200,
    json: async () => (String(url).includes('/text-check-failures')
      ? { items: failures, pending: 0 }
      : { displayName: 'Test Voice', languageName: 'Welsh', total: 4, recorded: 2, remaining: 2, lines: LINES }),
  }))
})

describe("RecordistRoom — a saved take that didn't match its words", () => {
  it('is counted on the slim bar, red and back in the flow, and says what was heard', async () => {
    const w = mount(RecordistRoom, { props: { voiceId: 'human_tom_zzz' } })
    await flushPromises()
    await w.find('.btn-begin').trigger('click')
    await flushPromises()
    expect(global.fetch.mock.calls.some(([u]) => String(u).includes('/voice/human_tom_zzz/text-check-failures'))).toBe(true)
    const bar = w.find('[data-test="refused-summary"]')
    expect(bar.exists()).toBe(true)
    expect(bar.text()).toContain('1 line needs re-recording')
    await w.find('[data-test="refused-go-first"]').trigger('click')
    await flushPromises()
    expect(w.find('.line-target').text()).toContain('llinell 2')
    expect(w.find('[data-test="line-state"]').text()).toBe("didn't match")
    expect(w.find('[data-test="refused-why"]').text()).toBe("Last take didn't match the words — we heard “llinell dau”")
  })

  it('reading the line again clears it at once', async () => {
    const w = mount(RecordistRoom, { props: { voiceId: 'human_tom_zzz' } })
    await flushPromises()
    await w.find('.btn-begin').trigger('click')
    await flushPromises()
    await w.find('[data-test="refused-go-first"]').trigger('click')
    await flushPromises()
    // the next tap ends this line's capture and files it
    failures = []
    await w.find('.ctl-next').trigger('click')
    await flushPromises()
    expect(rec.queueTake).toHaveBeenCalled()
    expect(rec.queueTake.mock.calls[0][0].lineId).toBe('line-2')
    expect(w.find('[data-test="refused-summary"]').exists()).toBe(false)
  })
})
