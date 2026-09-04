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
// THIS SESSION'S REFUSALS. Deliberately a separate map from the wire, because
// that separation IS the line Tom's 2026-09-02 ruling is drawn along: the wire
// carries HISTORY (masked) and this carries what just happened in the room
// (shown, loudly). A take refused the instant she reads it has to say so, or
// she walks away from a line she never actually recorded.
const failedTakes = vi.hoisted(() => new Map())

vi.mock('@/composables/useRecordistQueue', () => ({
  // The component renders this as an attribute on its root element, so a mock
  // of this module that omits it makes every mount in the file throw. That is
  // what took all four RecordistRoom suites red on 2026-09-03 -- 26 tests, the
  // whole of this component's mount coverage, silently gone.
  DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
  useRecordistQueue: () => ({
    // The durable take store, landed 2026-09-03. Every one of these is read by
    // the component, so a mock missing them throws on render rather than
    // failing an assertion -- which is how the drift stayed invisible.
    persistent: ref(true), carriedOverCount: ref(0), refusedCount: ref(0),
    isUnsent: () => false, attach: vi.fn(), teardown: vi.fn(),
    queueTake: (take) => { savedTakes.set(take.lineId, true); return queueTake(take) },
    markFailed,
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: savedTakes, failed: failedTakes,
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
    // The settling period at a cold start. Already satisfied here: these tests
    // are about what the well shows, not about when it shows it.
    awaitLeadIn: vi.fn().mockResolvedValue(1200),
    activeAgeMs: () => 1200,
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

function stubEditableQueue(canEditText, { unlinkedAudioId = null } = {}) {
  global.fetch = vi.fn().mockImplementation((url, opts) => {
    if (opts && opts.method === 'PATCH') {
      return Promise.resolve({
        ok: true, status: 200,
        // `unlinkedAudioId` is the server's answer to "did this edit take
        // anything away?" — null when the line had never been read.
        json: async () => ({ ok: true, lineId: 'line-2', text: 'A tea, please.', knownText: 'A tea, please.', recorded: false, previousText: 'Nos da', unlinkedAudioId }),
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
    expect(wrapper.findAll('.row-text.tappable')).toHaveLength(0)
    await wrapper.findAll('.roster-list .row')[0].find('.row-text').trigger('click')
    expect(wrapper.find('.row-edit').exists()).toBe(false)

    await wrapper.find('.btn-begin').trigger('click')
    await flushPromises()
    expect(wrapper.find('.line-target').classes()).not.toContain('tappable')
    await wrapper.find('.line-target').trigger('click')
    await flushPromises()
    expect(wrapper.find('.edit-box').exists()).toBe(false)
  })

  it('saves the new text and puts the line back to outstanding, without a reload', async () => {
    stubEditableQueue(true)
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_tom_zzz' } })
    await flushPromises()
    await wrapper.find('.btn-begin').trigger('click')   // opens on line-2, the outstanding one
    await flushPromises()

    await wrapper.find('.line-target').trigger('click')
    await flushPromises()
    // The mic is held while the keyboard is up: a live mic under an open
    // keyboard records the room and files it as the take.
    expect(wrapper.find('.stage-progress').text()).toContain('Editing')
    expect(wrapper.find('.meter-tag').text()).toBe('Mic paused while you listen')

    await wrapper.find('.edit-box').setValue('A tea, please.')
    // NO SAVE BUTTON. Looking away is what saves it.
    expect(wrapper.find('.edit-save').exists()).toBe(false)
    await wrapper.find('.edit-box').trigger('blur')
    await flushPromises()

    const patch = global.fetch.mock.calls.find(c => c[1] && c[1].method === 'PATCH')
    expect(patch[0]).toContain('/line/line-2/text')
    expect(JSON.parse(patch[1].body)).toEqual({ text: 'A tea, please.' })

    // The screen now shows the new words, the mic is live again, and the line
    // counts as outstanding — one recorded of two, exactly as before the edit.
    expect(wrapper.find('.line-target').text()).toBe('A tea, please.')
    expect(wrapper.find('.stage-progress').text()).toContain('Recording')
    expect(wrapper.find('.stage-progress').text()).toContain('1 of 2 recorded')

    // AND IT SAYS NOTHING AT ALL. Tom, 2026-09-03: fixing a line nobody has
    // read is not an edit with a consequence — there is no take to clear and
    // nothing goes back into the queue, so there is nothing to report. The
    // corrected line IS the receipt.
    expect(wrapper.find('.saved-note, .row-saved').exists()).toBe(false)
  })

  it('says one short line, and only when the edit actually cost a take', async () => {
    // line-1 is the recorded one. Editing it DOES take something away: the take
    // it had says the wrong words now, so the artist has to know to read it again.
    stubEditableQueue(true, { unlinkedAudioId: 'clip-1' })
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_tom_zzz' } })
    await flushPromises()
    await wrapper.find('.roster-toggle').trigger('click')
    await wrapper.findAll('.roster-list .row')[0].find('.row-text').trigger('click')
    await wrapper.find('.row-edit').setValue('Bore da iawn')
    await wrapper.find('.row-edit').trigger('blur')
    await flushPromises()

    // One element, never a stack — and ON THE ROW that was edited, not under
    // the whole list. Catrin's roster is 466 rows long; a message several
    // screens below the row she just changed is a message nobody reads.
    const saved = wrapper.findAll('.row-saved')
    expect(saved).toHaveLength(1)
    expect(saved[0].text()).toBe('Saved, read it again.')
    expect(wrapper.findAll('.roster-list .row')[0].find('.row-saved').exists()).toBe(true)
  })

  it('Esc puts the original words back and saves nothing', async () => {
    stubEditableQueue(true)
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_tom_zzz' } })
    await flushPromises()
    await wrapper.find('.btn-begin').trigger('click')
    await flushPromises()

    await wrapper.find('.line-target').trigger('click')
    await flushPromises()
    await wrapper.find('.edit-box').setValue('something she did not mean')
    await wrapper.find('.edit-box').trigger('keydown.esc')
    await flushPromises()
    // The box is gone the moment Esc lands, so the blur it causes on its way out
    // has nothing to save from — and `abandoning` catches the browsers that fire
    // one at a detached node anyway.
    expect(wrapper.find('.edit-box').exists()).toBe(false)

    expect(global.fetch.mock.calls.find(c => c[1] && c[1].method === 'PATCH')).toBeUndefined()
    expect(wrapper.find('.line-target').text()).toBe('Nos da')
    expect(wrapper.find('.saved-note, .row-saved').exists()).toBe(false)
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
        // DELIBERATELY THE OLD WIRE, still carrying the verdict, the reason and
        // a playable clip. The server stopped sending all three on 2026-09-02
        // (recordist-queue's `maskRejectedHistory`); this fixture keeps them so
        // the tests below prove the SCREEN refuses them on its own too. A leak
        // this screen must never spring needs both sides to fail, not one.
        { id: 'r-1', order: 4, text: 'Llygaid blin', kind: 'rerecord', recorded: false, rerecordWanted: true,
          rerecordReason: 'The text says angry eyes but the recording says pretty.', clipUrl: '/c/r-1' },
      ],
    }),
  })
}

describe('RecordistRoom — the three kinds of work, disambiguated', () => {
  beforeEach(() => { savedTakes.clear(); failedTakes.clear(); stubThreeKindQueue() })

  it('names each kind with its own count and its own done-so-far, in Tom\'s order', async () => {
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' } })
    await flushPromises()

    const map = wrapper.findAll('.section-map-row')
    expect(map).toHaveLength(3)
    // The headline number of recordings in each section, and under it the two
    // truths: how many carry a take, and how many of those we want again.
    expect(map[0].find('.sm-name').text()).toBe('POD-1')
    expect(map[0].find('.sm-count').text()).toBe('2')
    // Both numbers per section since 2026-09-03: each section now carries its
    // own grid of marks, so its caption has to add up to that section alone.
    expect(map[0].find('.sm-tally').text()).toBe('1 recorded · 1 still to read')
    expect(map[1].find('.sm-name').text()).toBe('NEW SEEDS')
    expect(map[1].find('.sm-count').text()).toBe('1')
    expect(map[1].find('.sm-tally').text()).toBe('none recorded yet · 1 still to read')
    // NAMED FOR WHAT THE LINES ARE, NOT FOR OUR VERDICT ON THEM. This heading
    // read "Re-recording in this course" until Tom's ruling of 2026-09-02:
    // "they must NOT see any clips that have already been ruled unusable - they
    // must just see those as lines that still need recording."
    expect(map[2].find('.sm-name').text()).toBe('MORE LINES')
    expect(map[2].find('.sm-count').text()).toBe('1')
    // A REJECTED TAKE IS NOT A RECORDING. The line has a take on the wire and a
    // want against it, and it reads here exactly as a line nobody has opened.
    expect(map[2].find('.sm-tally').text()).toBe('none recorded yet · 1 still to read')

    // ONE NUMBER. It used to end ", 1 of those to read again" — our judgement of
    // the reader's own work, in the first sentence on their page.
    expect(wrapper.find('.rc-progress-line').text()).toBe('4 lines — 1 recorded')
    expect(wrapper.text()).not.toMatch(/read again/i)
    expect(wrapper.text()).not.toMatch(/re-record/i)

    // POD-1 and SEEDS are both names Tom and the artists use out loud, so both
    // are allowed. POD-1 was flipped earlier on 2026-09-02; the SEED ban went
    // the same way later the same day, when Tom overruled the taste call that
    // had kept it off the screen -- his words, in full: "it's SEEDS". Do not
    // re-ban it. What is still ours and still off the screen is "kind".
    const shown = wrapper.text()
    expect(shown).toContain('POD-1')
    expect(shown).toContain('NEW SEEDS')
    expect(shown).not.toMatch(/\bkind\b/i)
  })

  it('shows the character on a conversation line, and NEVER why a take was rejected', async () => {
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' } })
    await flushPromises()
    await wrapper.find('.roster-toggle').trigger('click')

    const sections = wrapper.findAll('.roster-list .section')
    expect(sections).toHaveLength(3)
    expect(sections[0].find('.row-speaker').text()).toBe('James')
    expect(sections[0].find('.row-also').text()).toContain('2 other lines')

    // THE REJECTED LINE, READ AS AN UNRECORDED ONE. Tom, 2026-09-02. Its row
    // says "To record", offers "Record" rather than "Record again", prints no
    // reason, and gives no way to hear the take we threw away — even though the
    // fixture's wire still offers all three.
    const rejected = sections[2].findAll('.row')
    expect(rejected).toHaveLength(1)
    expect(rejected[0].find('.row-state').text()).toBe('To record')
    expect(rejected[0].find('.row-record').text()).toBe('Record')
    expect(rejected[0].find('.row-reason').exists()).toBe(false)
    expect(rejected[0].find('.row-play').exists()).toBe(false)
    expect(rejected[0].text()).not.toContain('angry eyes')

    // ...and it reads identically to a line nobody has ever recorded: the
    // never-touched seed row above it. Indistinguishable is the whole ruling.
    const untouched = sections[1].findAll('.row')[0]
    expect(rejected[0].find('.row-state').text()).toBe(untouched.find('.row-state').text())
    expect(rejected[0].find('.row-record').text()).toBe(untouched.find('.row-record').text())
    expect(rejected[0].find('.row-play').exists()).toBe(untouched.find('.row-play').exists())
    expect(rejected[0].classes()).toContain('is-todo')

    // Every line in the queue is in exactly one section: nothing disappears.
    // The RECORD is not destroyed — the clip is still in the database and still
    // on Tom's coverage page. It is this screen that does not mention it.
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
    expect(map[0].find('.sm-name').text()).toBe('NEW SEEDS')
  })

  // WHERE THE LINE IS DRAWN, AND IT IS THE WHOLE SUBTLETY OF THE RULING.
  //
  // Tom, 2026-09-02, is ruling about HISTORY: "they must NOT see any clips that
  // have already been ruled unusable". A take refused THIS SECOND, on a line she
  // has just this moment read, is not history — it is the only way she learns to
  // read it again, and taking it away would cost her the line silently. So the
  // two live side by side on one screen and must be told apart by WHERE THE
  // JUDGEMENT CAME FROM, not by how harsh it is:
  //
  //   - off the WIRE  (rerecordWanted / rerecordReason / clipUrl) = history. Gone.
  //   - off THIS SESSION (queue.failed, filled by the upload's own response) = now. Kept.
  //
  // A reload turns the second into the first by construction: a refused take was
  // never saved, so there is no clip and no want, and the line is simply owed.
  it('says nothing about a take we rejected before today, and everything about one refused just now', async () => {
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' } })
    await flushPromises()
    await wrapper.find('.roster-toggle').trigger('click')

    // HISTORY IS SILENT, on the page she lands on. The rejected line's own
    // reason is nowhere, even though the fixture's wire still offers it.
    expect(wrapper.text()).not.toContain('angry eyes')
    expect(wrapper.text()).not.toContain('pretty')

    // Now she reads a line and the speech gate refuses it on the spot.
    await wrapper.find('.btn-begin').trigger('click')
    await flushPromises()
    failedTakes.set('p-2', "That take didn't capture any speech — check the right microphone is selected, then read the line again.")
    await wrapper.find('.ctl-next').trigger('click')
    await flushPromises()

    // THIS SESSION IS LOUD. The gate's own words, verbatim, still reach her —
    // and they must, or she walks away from a line she never recorded.
    expect(wrapper.text()).toContain("didn't capture any speech")
    // ...and it is the NOTE that carries it, the one element the ruling must
    // not sweep away with the wire's reason field.
    expect(wrapper.find('.note.error').text()).toContain("didn't capture any speech")
    // And still not one word about the take we rejected in August.
    expect(wrapper.text()).not.toContain('angry eyes')
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
    // 1 recorded + 3 still to read = the whole queue. The rejected line counts
    // in the second number, which is the entire point of the ruling, and the two
    // numbers still sum to 4.
    expect(wrapper.find('.strip-words').text()).toContain('1 recorded')
    expect(wrapper.find('.strip-words').text()).toContain('3 still to read')
  })
})

// TWO PODS ARE TWO BODIES OF WORK. Tom, 2026-09-04: "Aran's lines are now
// confusing - this special senedd pod lines are mixed in with his recorded
// already POD lines - this is just confusing and so these would be best
// separated out." Both are kind 'pod', so before this the screen added a
// 567-line committee session to his half of the POD-1 conversations and put one
// heading over the sum. The invariant from the section above is unchanged and
// is asserted here again on purpose: the sections must add back up to the whole
// queue, whatever the split is.
describe('RecordistRoom — two pods, two bodies of work', () => {
  function stubTwoPodQueue() {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({
        displayName: 'Aran', languageName: 'Welsh', total: 6, recorded: 1, remaining: 5,
        lines: [
          { id: 'p-1', order: 1, text: 'Bore da', speaker: 'James', kind: 'pod', podId: 'A', podSlug: 'pod-0', podTitle: 'Northern Welsh — Pod 0', recorded: true, clipUrl: '/c/p-1' },
          { id: 'p-2', order: 2, text: 'Sut mae?', speaker: 'Waiter', kind: 'pod', podId: 'A', podSlug: 'pod-0', podTitle: 'Northern Welsh — Pod 0', recorded: false, clipUrl: null },
          { id: 'n-1', order: 3, text: 'Diolch, Gadeirydd', speaker: 'Steve', kind: 'pod', podId: 'B', podSlug: 'senedd-s4c-steve', podTitle: 'Senedd: allegations of bullying at S4C', recorded: false, clipUrl: null },
          { id: 'n-2', order: 4, text: 'Dyna ni', speaker: 'Steve', kind: 'pod', podId: 'B', podSlug: 'senedd-s4c-steve', podTitle: 'Senedd: allegations of bullying at S4C', recorded: false, clipUrl: null },
          // A POD NOBODY HAS WRITTEN A HEADING FOR. It must not vanish and it
          // must not be named by its slug — its own title is a human sentence.
          { id: 'x-1', order: 5, text: 'Rhywbeth arall', speaker: 'Mair', kind: 'pod', podId: 'C', podSlug: 'sector-retail-1', podTitle: 'Retail counter conversations', recorded: false, clipUrl: null },
          { id: 's-1', order: 6, text: 'Dw i eisiau mynd', kind: 'seed', seedNumber: 12, recorded: false, clipUrl: null },
        ],
      }),
    })
  }
  beforeEach(() => { savedTakes.clear(); failedTakes.clear(); stubTwoPodQueue() })

  it('gives each pod its own section, in queue order, named in the artist\'s words', async () => {
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' } })
    await flushPromises()

    const map = wrapper.findAll('.section-map-row')
    const names = map.map(r => r.find('.sm-name').text())
    // POD-1 first because pod-0 sorts first on the server, and the sections
    // follow the queue rather than re-sorting it.
    expect(names).toEqual(['POD-1', 'SENEDD', 'Retail counter conversations', 'NEW SEEDS'])
    expect(map.map(r => Number(r.find('.sm-count').text()))).toEqual([2, 2, 1, 1])
    // OUR VOCABULARY NEVER REACHES THE SCREEN.
    expect(wrapper.text()).not.toContain('senedd-s4c-steve')
    expect(wrapper.text()).not.toContain('sector-retail-1')
  })

  it('the sections still add back up to the whole queue', async () => {
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' } })
    await flushPromises()
    const counts = wrapper.findAll('.section-map-row').map(r => Number(r.find('.sm-count').text()))
    expect(counts.reduce((a, b) => a + b, 0)).toBe(6)
  })

  it('a pod line with no pod on the wire keeps the one name this screen has always used', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({
        displayName: 'Aran', languageName: 'Welsh', total: 1, recorded: 0, remaining: 1,
        lines: [{ id: 'p-1', order: 1, text: 'Bore da', kind: 'pod', recorded: false, clipUrl: null }],
      }),
    })
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' } })
    await flushPromises()
    expect(wrapper.findAll('.section-map-row').map(r => r.find('.sm-name').text())).toEqual(['POD-1'])
  })
})
