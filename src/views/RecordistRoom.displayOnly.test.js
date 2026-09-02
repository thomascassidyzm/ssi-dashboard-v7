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

// Hoisted so every mount shares ONE set of recorder spies: the mic-hold test
// below asserts on the calls the booth makes to discardLine/beginLine, and a
// factory that minted fresh spies per mount would have nothing to assert on.
const recorderSpies = vi.hoisted(() => ({
  beginLine: null, discardLine: null,
}))
// A real Map, so a queued take reads back as SAVED — which is what puts a
// playable stored clip on the "you just read" bar, which is what the mic-hold
// test needs to play.
const savedTakes = vi.hoisted(() => new Map())

vi.mock('@/composables/useRecordistQueue', () => ({
  useRecordistQueue: () => ({
    queueTake: (take) => { savedTakes.set(take.lineId, true); return queueTake(take) },
    markFailed,
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: savedTakes, failed: new Map(),
    flush: vi.fn(), retryFailed: vi.fn(),
  }),
}))

vi.mock('@/composables/useTapRecorder', () => ({
  DEFAULT_CAPTURE_PROFILE: 'voice',
  useTapRecorder: () => ({
    isRecording: ref(true), level: ref(0.3), clipping: ref(false),
    devices: ref([]), appliedSettings: ref({}), profile: ref('voice'), error: ref(null),
    lineHasSpeech: ref(true), quietMs: ref(0), meterTrusted: ref(true),
    inputPeak: ref(0.4), roomTone: ref(0.001),
    listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    beginLine: (recorderSpies.beginLine ||= vi.fn()),
    // A blob comfortably over the 1200-byte silence floor.
    endLine: vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)], { type: 'audio/webm' }))),
    discardLine: (recorderSpies.discardLine ||= vi.fn().mockResolvedValue(undefined)),
    stop: vi.fn().mockResolvedValue(undefined),
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
  beforeEach(() => { queueTake.mockClear(); savedTakes.clear(); stubQueue() })

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


// ── The two things Tom said were missing (2026-09-02) ────────────────────────
//
// "hard to know what you have recorded, what is playing back". Both are drawn
// state, so both are tested as drawn state: what a person holding a phone would
// actually see, not what the component knows internally.

// A queue with one line already recorded and one still outstanding — the only
// fixture that can show BOTH states at once, which is the whole point of the
// roster.
function stubMixedQueue() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true, status: 200,
    json: async () => ({
      displayName: 'Test Voice', languageName: 'Welsh', total: 2, recorded: 1, remaining: 1,
      lines: [
        { id: 'line-1', order: 1, text: 'Bore da', knownText: 'Good morning', recorded: true, clipUrl: '/api/recording/voice/v/line/line-1/clip' },
        { id: 'line-2', order: 2, text: 'Nos da', knownText: 'Good night', recorded: false, clipUrl: null },
      ],
    }),
  })
}

describe('RecordistRoom — done vs outstanding, at a glance', () => {
  beforeEach(() => { stubMixedQueue() })

  it('marks every line in the queue done or outstanding, before anything is tapped', async () => {
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'test-voice' } })
    await flushPromises()

    const ticks = wrapper.findAll('.roster .strip .tick')
    expect(ticks).toHaveLength(2)
    expect(ticks[0].classes()).toContain('done')       // recorded
    expect(ticks[1].classes()).not.toContain('done')   // still owed
    expect(wrapper.find('.strip-words').text()).toContain('1 recorded')
    expect(wrapper.find('.strip-words').text()).toContain('1 still to read')
  })

  it('opens the full list on one tap, with each line saying which it is', async () => {
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'test-voice' } })
    await flushPromises()

    expect(wrapper.find('.roster-list').exists()).toBe(false)   // closed by default: no wall of rows
    await wrapper.find('.roster-toggle').trigger('click')

    const rows = wrapper.findAll('.roster-list .row')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Bore da')
    expect(rows[0].find('.row-state').text()).toBe('Recorded')
    expect(rows[1].find('.row-state').text()).toBe('To record')
  })
})

function stubThreeLineQueue() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true, status: 200,
    json: async () => ({
      displayName: 'Test Voice', languageName: 'Welsh', total: 3, recorded: 1, remaining: 2,
      lines: [
        { id: 'line-1', order: 1, text: 'Bore da', knownText: 'Good morning', recorded: true, clipUrl: '/api/recording/voice/v/line/line-1/clip' },
        { id: 'line-2', order: 2, text: 'Nos da', knownText: 'Good night', recorded: false, clipUrl: null },
        { id: 'line-3', order: 3, text: 'Diolch', knownText: 'Thanks', recorded: false, clipUrl: null },
      ],
    }),
  })
}

describe('RecordistRoom — recording and playing back can never both look live', () => {
  beforeEach(() => {
    savedTakes.clear()
    stubMixedQueue()
    recorderSpies.beginLine?.mockClear()
    recorderSpies.discardLine?.mockClear()
    // jsdom has no media pipeline: play() is unimplemented and would reject.
    global.Audio = class { play() { return Promise.resolve() } pause() {} }
  })

  it('says "Recording" while the mic is open and "Playing back" while a take plays, never both', async () => {
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'test-voice' } })
    await flushPromises()
    expect(wrapper.find('.state-pill').text()).toBe('Not recording')

    await wrapper.find('.btn-begin').trigger('click')
    await flushPromises()
    expect(wrapper.find('.stage-progress').text()).toContain('Recording')
    expect(wrapper.find('.stage-progress').text()).not.toContain('Playing back')
  })

  it('holds the microphone while a stored take plays, and gives the line back when it stops', async () => {
    stubThreeLineQueue()
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'test-voice' } })
    await flushPromises()
    await wrapper.find('.btn-begin').trigger('click')
    await flushPromises()
    // Read the outstanding line so there is a "you just read" take to play.
    await wrapper.find('.ctl-next').trigger('click')
    await flushPromises()

    recorderSpies.discardLine.mockClear()
    recorderSpies.beginLine.mockClear()

    const play = wrapper.find('.hear-bar button')
    await play.trigger('click')
    await flushPromises()

    // The capture that was running is thrown away, and the screen says which of
    // the two things is happening.
    expect(recorderSpies.discardLine).toHaveBeenCalled()
    expect(wrapper.find('.stage-progress').text()).toContain('Playing back')
    expect(wrapper.find('.meter-tag').text()).toBe('Mic paused while you listen')
    expect(wrapper.find('.meter').classes()).toContain('held')

    // Stop, and the same line is re-opened clean — the playback is discarded
    // rather than filed as the take.
    await play.trigger('click')
    await flushPromises()
    expect(recorderSpies.beginLine).toHaveBeenCalled()
    expect(wrapper.find('.stage-progress').text()).toContain('Recording')
    expect(wrapper.find('.meter-tag').text()).not.toContain('paused')
  })
})
