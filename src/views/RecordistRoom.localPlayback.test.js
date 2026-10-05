// The take just made plays from the in-browser blob AT ONCE, while the upload
// is still in flight (Aran, 2026-10-05: the lag of waiting for it to load).
// It is labelled RAW LOCAL, switches to STORED once saved, and says NOT SAVED
// if the upload failed. Fails on the old code, where the button read
// "Saving… not playable yet" and could not be pressed.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const saved = vi.hoisted(() => new Map())
const failed = vi.hoisted(() => new Map())

vi.mock('@/composables/useRecordistQueue', () => ({
  DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
  useRecordistQueue: () => ({
    persistent: ref(true), carriedOverCount: ref(0), refusedCount: ref(0),
    isUnsent: () => false, attach: vi.fn(), teardown: vi.fn(),
    queueTake: vi.fn(),            // in flight: never becomes saved by itself
    markFailed: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved, failed, flush: vi.fn(), retryFailed: vi.fn(),
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
    awaitLeadIn: vi.fn().mockResolvedValue(1200), activeAgeMs: () => 1200,
    beginLine: vi.fn(),
    endLine: vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)], { type: 'audio/webm' }))),
    discardLine: vi.fn().mockResolvedValue(undefined), stop: vi.fn().mockResolvedValue(undefined),
  }),
}))

import RecordistRoom from './RecordistRoom.vue'

describe('RecordistRoom — the take just made plays locally, at once', () => {
  let played
  beforeEach(() => {
    saved.clear(); failed.clear(); played = []
    global.URL.createObjectURL = vi.fn(() => 'blob:local-take')
    global.URL.revokeObjectURL = vi.fn()
    global.Audio = class {
      set src(v) { played.push(v) }
      play() { return Promise.resolve() } pause() {}
    }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({
        displayName: 'T', languageName: 'Welsh', total: 2, recorded: 0, remaining: 2,
        lines: [
          { id: 'line-1', order: 1, text: 'Bore da', knownText: 'Good morning', recorded: false, clipUrl: null },
          { id: 'line-2', order: 2, text: 'Nos da', knownText: 'Good night', recorded: false, clipUrl: null },
        ],
      }),
    })
  })

  async function readOne() {
    const w = mount(RecordistRoom, { props: { voiceId: 'test-voice' } })
    await flushPromises()
    await w.find('.btn-begin').trigger('click'); await flushPromises()
    await w.find('.ctl-next').trigger('click'); await flushPromises()
    return w
  }

  it('plays the local blob while uploading, tagged RAW LOCAL', async () => {
    const w = await readOne()
    const btn = w.find('.hear-bar button')
    expect(btn.attributes('disabled')).toBeUndefined()
    expect(w.find('.hear-bar .stb-tag').text()).toBe('RAW LOCAL')
    await btn.trigger('click'); await flushPromises()
    expect(played).toEqual(['blob:local-take'])
  })

  it('moves to the STORED clip once saved', async () => {
    const w = await readOne()
    saved.set('line-1', true)
    await w.vm.$forceUpdate(); await flushPromises()
    expect(w.find('.hear-bar .stb-tag').text()).toBe('STORED')
  })

  it('says NOT SAVED, unplayable, when the upload failed', async () => {
    const w = await readOne()
    failed.set('line-1', 'The server would not take that recording.')
    await w.vm.$forceUpdate(); await flushPromises()
    expect(w.find('.hear-bar .stb-tag').text()).toBe('NOT SAVED')
    expect(w.find('.hear-bar button').attributes('disabled')).toBeDefined()
  })
})
