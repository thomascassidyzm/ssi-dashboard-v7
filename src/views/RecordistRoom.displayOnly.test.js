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
    // The card's own top line says the same thing in one sentence.
    expect(wrapper.find('.rc-progress-line').text()).toBe('2 lines — 1 recorded')
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


// ── Rewriting a line (TEST COURSES ONLY) ─────────────────────────────────────
//
// The safety-critical half is the ABSENCE: Catrin's Welsh lines are live pod
// content and must never show an edit control. The server refuses the write
// anyway (recordist-text-edit.test.cjs), but a button she can press that then
// fails is its own kind of broken.

function stubEditableQueue(canEditText) {
  global.fetch = vi.fn().mockImplementation((url, opts) => {
    if (opts && opts.method === 'PATCH') {
      return Promise.resolve({
        ok: true, status: 200,
        json: async () => ({ ok: true, lineId: 'line-2', text: 'A tea, please.', knownText: 'A tea, please.', recorded: false, previousText: 'Nos da' }),
      })
    }
    return Promise.resolve({
      ok: true, status: 200,
      json: async () => ({
        displayName: 'Test Voice', languageName: 'Test Language', total: 2, recorded: 1, remaining: 1,
        lines: [
          { id: 'line-1', order: 1, text: 'Bore da', knownText: 'Good morning', recorded: true, clipUrl: '/api/recording/voice/v/line/line-1/clip', canEditText },
          { id: 'line-2', order: 2, text: 'Nos da', knownText: 'Good night', recorded: false, clipUrl: null, canEditText },
        ],
      }),
    })
  })
}

describe('RecordistRoom — rewriting a line', () => {
  beforeEach(() => { savedTakes.clear() })

  it('offers no edit control at all on a live course', async () => {
    stubEditableQueue(false)
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_catrinlliar_cym_n' } })
    await flushPromises()
    await wrapper.find('.roster-toggle').trigger('click')
    expect(wrapper.findAll('.row-edit-btn')).toHaveLength(0)

    await wrapper.find('.btn-begin').trigger('click')
    await flushPromises()
    expect(wrapper.find('.edit-open').exists()).toBe(false)
  })

  it('saves the new text and puts the line back to outstanding, without a reload', async () => {
    stubEditableQueue(true)
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_tom_zzz' } })
    await flushPromises()
    await wrapper.find('.btn-begin').trigger('click')   // opens on line-2, the outstanding one
    await flushPromises()

    await wrapper.find('.edit-open').trigger('click')
    await flushPromises()
    // The mic is held while the keyboard is up: a live mic under an open
    // keyboard records the room and files it as the take.
    expect(wrapper.find('.stage-progress').text()).toContain('Editing')
    expect(wrapper.find('.meter-tag').text()).toBe('Mic paused while you listen')

    await wrapper.find('.edit-box').setValue('A tea, please.')
    await wrapper.find('.edit-save').trigger('click')
    await flushPromises()

    const patch = global.fetch.mock.calls.find(c => c[1] && c[1].method === 'PATCH')
    expect(patch[0]).toContain('/line/line-2/text')
    expect(JSON.parse(patch[1].body)).toEqual({ text: 'A tea, please.' })

    // The screen now shows the new words, the mic is live again, and the line
    // counts as outstanding — one recorded of two, exactly as before the edit.
    expect(wrapper.find('.line-target').text()).toBe('A tea, please.')
    expect(wrapper.find('.stage-progress').text()).toContain('Recording')
    expect(wrapper.find('.stage-progress').text()).toContain('1 of 2 recorded')
  })
})


describe('RecordistRoom — one tap back onto a line', () => {
  beforeEach(() => { savedTakes.clear(); stubMixedQueue() })

  it('re-records a finished line straight from the list, without the re-read switch', async () => {
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'test-voice' } })
    await flushPromises()
    await wrapper.find('.roster-toggle').trigger('click')

    const rows = wrapper.findAll('.roster-list .row')
    expect(rows[0].find('.row-record').text()).toBe('Record again')   // already recorded
    expect(rows[1].find('.row-record').text()).toBe('Record')         // still outstanding

    await rows[0].find('.row-record').trigger('click')
    await flushPromises()

    // The mic is open on THAT line — not on the first outstanding one.
    expect(wrapper.find('.line-target').text()).toBe('Bore da')
    expect(wrapper.find('.stage-progress').text()).toContain('Recording')
  })
})


// THE MAP TOM ASKED FOR. Three kinds of work in one queue, and until 2026-09-02
// the screen added them together into a single number that answered nothing:
// "441 lines?  why so many??? there's only 231 lines in POD-1". Each kind now
// carries its own count and its own done-so-far, in his order, and the sections
// must always add back up to the whole queue — a line that falls out of the map
// is the one failure this screen cannot afford.
function stubThreeKindQueue() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true, status: 200,
    json: async () => ({
      displayName: 'Aran', languageName: 'Welsh', total: 4, recorded: 1, remaining: 3,
      lines: [
        { id: 'p-1', order: 1, text: 'Bore da', speaker: 'James', kind: 'pod', recorded: true, clipUrl: '/c/p-1', alsoFills: 2 },
        { id: 'p-2', order: 2, text: 'Sut mae?', speaker: 'Waiter', kind: 'pod', recorded: false, clipUrl: null },
        { id: 's-1', order: 3, text: 'Dw i eisiau mynd', kind: 'seed', seedNumber: 12, recorded: false, clipUrl: null },
        { id: 'r-1', order: 4, text: 'Llygaid blin', kind: 'rerecord', recorded: false, rerecordWanted: true,
          rerecordReason: 'The text says angry eyes but the recording says pretty.', clipUrl: '/c/r-1' },
      ],
    }),
  })
}

describe('RecordistRoom — the three kinds of work, disambiguated', () => {
  beforeEach(() => { stubThreeKindQueue() })

  it('names each kind with its own count and its own done-so-far, in Tom\'s order', async () => {
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' } })
    await flushPromises()

    const map = wrapper.findAll('.section-map-row')
    expect(map).toHaveLength(3)
    // The headline number of recordings in each section, and under it the two
    // truths: how many carry a take, and how many of those we want again.
    expect(map[0].find('.sm-name').text()).toBe('POD-1')
    expect(map[0].find('.sm-count').text()).toBe('2')
    expect(map[0].find('.sm-tally').text()).toBe('1 recorded')
    expect(map[1].find('.sm-name').text()).toBe('New sentences')
    expect(map[1].find('.sm-count').text()).toBe('1')
    expect(map[1].find('.sm-tally').text()).toBe('none recorded yet')
    expect(map[2].find('.sm-name').text()).toBe('Re-recording in this course')
    expect(map[2].find('.sm-count').text()).toBe('1')
    // Read once, asked for again: it is a recording AND it is outstanding.
    expect(map[2].find('.sm-tally').text()).toBe('1 recorded, 1 of those to read again')

    // A LINE ALREADY READ IS NOT A LINE NEVER OPENED. Tom, 2026-09-02: he is
    // "definitely done more than 26 lines recorded - more like 60". The queue is
    // right to keep asking for a re-record; the SCREEN was wrong to call it
    // untouched. Two pod lines (one done) plus a re-record with a take = 2.
    expect(wrapper.find('.rc-progress-line').text()).toBe('4 lines — 2 recorded, 1 of those to read again')

    // POD-1 is the name Tom and the artists use out loud, so it is allowed —
    // deliberately flipped 2026-09-02. "SEED" is still ours and still banned.
    const shown = wrapper.text()
    expect(shown).toContain('POD-1')
    expect(shown).not.toMatch(/\bSEED\b/i)
  })

  it('shows the character on a conversation line and the reason on a re-record', async () => {
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' } })
    await flushPromises()
    await wrapper.find('.roster-toggle').trigger('click')

    const sections = wrapper.findAll('.roster-list .section')
    expect(sections).toHaveLength(3)
    expect(sections[0].find('.row-speaker').text()).toBe('James')
    expect(sections[0].find('.row-also').text()).toContain('2 other lines')
    expect(sections[2].find('.row-reason').text()).toContain('angry eyes')

    // Every line in the queue is in exactly one section: nothing disappears.
    expect(wrapper.findAll('.roster-list .row')).toHaveLength(4)
  })

  it('hides a kind the recordist has none of, rather than showing it as zero', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({
        displayName: 'Someone', languageName: 'Welsh', total: 1, recorded: 0, remaining: 1,
        lines: [{ id: 's-1', order: 1, text: 'Dw i eisiau mynd', kind: 'seed', recorded: false, clipUrl: null }],
      }),
    })
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'someone' } })
    await flushPromises()

    const map = wrapper.findAll('.section-map-row')
    expect(map).toHaveLength(1)
    expect(map[0].find('.sm-name').text()).toBe('New sentences')
  })

  // THE INVARIANT. A line that falls out of the map is the one failure this
  // screen cannot afford, and neither headline number may exceed the queue.
  it('never loses a line from the map, and never counts one twice', async () => {
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' } })
    await flushPromises()
    await wrapper.find('.roster-toggle').trigger('click')

    const counts = wrapper.findAll('.section-map-row .sm-count').map(n => Number(n.text()))
    expect(counts.reduce((a, b) => a + b, 0)).toBe(4)
    expect(wrapper.findAll('.roster-list .row')).toHaveLength(4)
    // 2 recorded + 2 never read = the whole queue.
    expect(wrapper.find('.strip-words').text()).toContain('2 recorded')
    expect(wrapper.find('.strip-words').text()).toContain('2 still to read')
  })
})
