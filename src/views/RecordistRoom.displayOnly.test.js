// THE ONE THING THAT WOULD MAKE THE ELLIPSIS STRIP A REAL BUG.
//
// The breakdown ellipsis comes off the SCREEN and off nothing else. The same
// string is also the clip's identity: recordist-queue.cjs keys recorded-or-not
// on audioKeyCandidates(line.text) against course_audio.text_normalized, and
// normalizeForDb() strips only TRAILING punctuation — an internal `…` is
// load-bearing in that key. Strip it before the upload and every take Catrin
// makes lands under an identity the queue is not looking for, silently.
//
// So: the well shows the line stripped, and queueTake still receives the
// original string, markers intact. Both, in one test, on purpose.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const queueTake = vi.fn()
const markFailed = vi.fn()

vi.mock('@/composables/useRecordistQueue', () => ({
  useRecordistQueue: () => ({
    queueTake, markFailed,
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
    lineHasSpeech: ref(true), quietMs: ref(0), meterTrusted: ref(true),
    inputPeak: ref(0.4), roomTone: ref(0.001),
    listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    beginLine: vi.fn(),
    // A blob comfortably over the 1200-byte silence floor.
    endLine: vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)], { type: 'audio/webm' }))),
    discardLine: vi.fn().mockResolvedValue(undefined), stop: vi.fn().mockResolvedValue(undefined),
  }),
}))

import RecordistRoom from './RecordistRoom.vue'

// Verbatim from listening_pod_sentences, 2026-08-23.
const RAW_FIRST = 'Mae\'r oen yn ardderchog. Mae o… wedi\'i goginio\'n… araf, efo rhosmari.'
const RAW_SECOND = 'Esgusodwch fi,… ydy\'r sedd yma… wedi\'i chymryd?'

function stubQueue() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true, status: 200,
    json: async () => ({
      displayName: 'Test Voice', languageName: 'Welsh', total: 2, recorded: 0, remaining: 2,
      lines: [
        { id: 'line-1', order: 1, text: RAW_FIRST, knownText: 'The lamb is excellent. It is… slow-cooked, with rosemary.', speaker: 'Waiter', courseCode: 'cym_n_for_eng', recorded: false, clipUrl: null },
        { id: 'line-2', order: 2, text: RAW_SECOND, knownText: null, speaker: 'Sarah', courseCode: 'cym_s_for_eng', recorded: false, clipUrl: null },
      ],
    }),
  })
}

describe('RecordistRoom — breakdown markers are display-only', () => {
  beforeEach(() => { queueTake.mockClear(); stubQueue() })

  it('shows the line without its breakdown ellipses, everywhere on the screen', async () => {
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'test-voice' } })
    await flushPromises()
    await wrapper.find('.btn-begin').trigger('click')
    await flushPromises()

    const well = wrapper.find('.line-target').text()
    expect(well).toBe('Mae\'r oen yn ardderchog. Mae o wedi\'i goginio\'n araf, efo rhosmari.')
    expect(well).not.toMatch(/…|\.\.\./)

    // The known-language line under it gets the same treatment: the recordist
    // reads whatever is on the screen, so a stripped target over an unstripped
    // known would be worse than not stripping at all.
    expect(wrapper.find('.line-known').text()).toBe('The lamb is excellent. It is slow-cooked, with rosemary.')

    // And "Coming up", which is the other thing being read ahead of time.
    expect(wrapper.find('.upnext-list').text()).toContain('Esgusodwch fi, ydy\'r sedd yma wedi\'i chymryd?')
    expect(wrapper.text()).not.toMatch(/…\s*\S|\S…/)   // no marker left anywhere mid-line
  })

  it('uploads the ORIGINAL text, breakdown markers intact — the clip identity', async () => {
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'test-voice' } })
    await flushPromises()
    await wrapper.find('.btn-begin').trigger('click')
    await flushPromises()

    await wrapper.find('.ctl-next').trigger('click')
    await flushPromises()

    expect(queueTake).toHaveBeenCalledTimes(1)
    const posted = queueTake.mock.calls[0][0]
    expect(posted.lineId).toBe('line-1')
    expect(posted.text).toBe(RAW_FIRST)          // byte-for-byte what the DB holds
    expect(posted.text).toContain('…')
  })
})
