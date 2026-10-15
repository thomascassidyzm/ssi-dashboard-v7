// Aran, 2026-10-15 (job #675): "we need clear obvious buttons for pause and stop, instead of just
// the small text about keyboard shortcuts." Stop and Pause must be labelled buttons while the mic
// is live, paused must offer a plain "Resume", and the P shortcut is a hint BESIDE the button —
// no longer part of the footer shortcut line.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const rec = vi.hoisted(() => ({}))
vi.mock('@/composables/useRecordistQueue', () => ({
  DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
  useRecordistQueue: () => ({
    persistent: ref(true), carriedOverCount: ref(0), refusedCount: ref(0),
    isUnsent: () => false, attach: vi.fn(), teardown: vi.fn(), queueTake: vi.fn(), markFailed: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: new Map(), failed: new Map(), flush: vi.fn(), retryFailed: vi.fn(),
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

// Each test is a fresh visit: the booth remembers its line cursor in localStorage per voice
// and batch (booth-cursor.js), and one test's cursor must not open the next test's Start.
beforeEach(() => { if (typeof localStorage === 'undefined') return; for (const k of Object.keys(localStorage)) if (k.startsWith('recordist.cursor.')) localStorage.removeItem(k) })

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

describe('RecordistRoom — Stop and Pause are obvious buttons while recording', () => {
  it('shows a labelled Stop and Pause in a row above Back / Again / Next, and not in the status row (job #681)', async () => {
    const w = await live()
    const stop = w.find('[data-test="stop"]')
    const pause = w.find('[data-test="pause"]')
    expect(stop.exists() && stop.text()).toBe('Stop')
    expect(pause.exists() && pause.text()).toBe('Pause')
    expect(w.find('[data-test="status"] [data-test="stop"], [data-test="status"] [data-test="pause"]').exists()).toBe(false)
    const row = w.find('[data-test="transport"] [data-test="stop-pause"]')
    expect(row.exists()).toBe(true)
    // The row comes before the Back / Again / Next controls in the footer.
    const html = w.find('[data-test="transport"]').html()
    expect(html.indexOf('data-test="stop-pause"')).toBeLessThan(html.indexOf('ctl-next'))
    expect(w.find('.kbd-hint').text()).toMatch(/P.*pause/i)
  })

  it('pause → Resume → Pause, and Stop ends the session', async () => {
    const w = await live()
    await w.find('[data-test="pause"]').trigger('click'); await flushPromises()
    expect(w.find('[data-test="pause"]').text()).toBe('Resume')
    expect(w.find('[data-test="pause"]').classes()).toContain('paused')
    await w.find('[data-test="pause"]').trigger('click'); await flushPromises()
    expect(w.find('[data-test="pause"]').text()).toBe('Pause')
    await w.find('[data-test="stop"]').trigger('click'); await flushPromises()
    expect(w.find('[data-test="stop-pause"]').exists()).toBe(false)
  })
})
