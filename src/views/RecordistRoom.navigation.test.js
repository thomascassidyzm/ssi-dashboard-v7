// GOING BACK AND FORTH MUST NOT THROW THE QUEUE OUT OF WHACK.
//
// Tom, after recording through the booth on 2026-09-02: "the process worked
// pretty well, although going back and forth threw it out of whack a bit". Two
// state desyncs were behind it, and both of them break the one sentence that
// decides everything on this surface — she never loses her place and she never
// repeats work she has already done:
//
//   1. The run only ever scanned FORWARD for the next line to read, while the
//      outstanding set can grow BEHIND the cursor — a rewrite puts a line back
//      to outstanding wherever it sits, a silent take leaves one behind you, and
//      the roster's one-tap Record drops the cursor into the middle of the list.
//      The run then reached the end, said "Done", and left work owed that it
//      could never offer again, while the roster went on truthfully saying a
//      line was still to read. Two counts on one screen, disagreeing.
//
//   2. The keyboard shortcuts are bound to the WINDOW and did not know about the
//      rewrite box. Every space typed into an edit called onNext(): it advanced
//      the queue, closed the take and filed the held microphone under the line
//      being rewritten. Typing a space was impossible.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const queueTake = vi.fn()
const savedTakes = vi.hoisted(() => new Map())

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
    markFailed: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: savedTakes, failed: new Map(),
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
    endLine: vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)], { type: 'audio/webm' }))),
    discardLine: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  }),
}))

import RecordistRoom from './RecordistRoom.vue'

// THE EVERY-LINE LIST IS SECTIONED NOW (2026-09-04). It opens onto shut
// headings, so a test that wants the rows opens the list and then every section
// in it — the same two taps Aran makes.
async function openEveryLine(wrapper) {
  await wrapper.find('.roster-toggle').trigger('click')
  for (const head of wrapper.findAll('.roster-list .sh-btn')) await head.trigger('click')
}


// Next and Again share a 250ms bounce guard, so two taps in the same tick are
// one tap as far as the booth is concerned. A person moving through a queue is
// not doing that, and the clock is what says so.
let clock = 1_000_000
async function tapNext(wrapper) {
  clock += 400
  await wrapper.find('.ctl-next').trigger('click')
  await flushPromises()
}

// Her real shape, minimised: some lines already have a take, some do not, and
// the outstanding ones are NOT contiguous — which is what a session with any
// re-recording or rewriting in it looks like after ten minutes.
function stubGappyQueue() {
  global.fetch = vi.fn().mockImplementation((url, opts) => {
    if (opts && opts.method === 'PATCH') {
      return Promise.resolve({
        ok: true, status: 200,
        json: async () => ({ ok: true, lineId: 'line-2', text: 'te, os gwelwch yn dda', knownText: 'a tea, please', recorded: false, previousText: 'llinell dau' }),
      })
    }
    return Promise.resolve({
      ok: true, status: 200,
      json: async () => ({
        displayName: 'Test Voice', languageName: 'Welsh', total: 4, recorded: 2, remaining: 2,
        lines: [
          { id: 'line-1', order: 1, text: 'llinell un', knownText: 'line one', recorded: false, clipUrl: null, canEditText: true },
          { id: 'line-2', order: 2, text: 'llinell dau', knownText: 'line two', recorded: true, clipUrl: '/api/recording/voice/v/line/line-2/clip', canEditText: true },
          { id: 'line-3', order: 3, text: 'llinell tri', knownText: 'line three', recorded: true, clipUrl: '/api/recording/voice/v/line/line-3/clip', canEditText: true },
          { id: 'line-4', order: 4, text: 'llinell pedwar', knownText: 'line four', recorded: false, clipUrl: null, canEditText: true },
        ],
      }),
    })
  })
}

describe('RecordistRoom — an outstanding line behind the cursor is never stranded', () => {
  beforeEach(() => {
    queueTake.mockClear(); savedTakes.clear(); stubGappyQueue()
    clock = 1_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => clock)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('offers the line above her when she starts in the middle of the list', async () => {
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_tom_zzz' } })
    await flushPromises()

    // She jumps straight onto the LAST line from the list — line-1 is still
    // owed and now sits behind her.
    await openEveryLine(wrapper)
    const rows = wrapper.findAll('.roster-list .row')
    expect(rows).toHaveLength(4)
    await rows[3].find('.row-record').trigger('click')
    await flushPromises()
    expect(wrapper.find('.line-target').text()).toBe('llinell pedwar')

    // The stage counts the SAME two outstanding lines the roster counted, and
    // says so — it used to say nothing at all, because looking forward from
    // here there was nothing to see.
    expect(wrapper.find('.upnext-head').text()).toContain('2 still to read')
    expect(wrapper.find('.upnext-list').text()).toContain('llinell un')
    // And the forward control is Next, not Done: the run is not over.
    expect(wrapper.find('.ctl-next').text()).toBe('Next')

    await tapNext(wrapper)
    // It wrapped round to the one line still owed instead of ending the session
    // on top of it.
    expect(wrapper.find('.line-target').text()).toBe('llinell un')
    expect(wrapper.find('.stage-progress').text()).toContain('3 of 4 recorded')
    expect(wrapper.find('.ctl-next').text()).toBe('Done')
  })

  it('comes back to a line she rewrote after she had already read it', async () => {
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_tom_zzz' } })
    await flushPromises()

    // Rewriting a recorded line from the list puts it back to outstanding.
    await openEveryLine(wrapper)
    await wrapper.findAll('.roster-list .row')[1].find('.row-text').trigger('click')
    await wrapper.find('.row-edit').setValue('te, os gwelwch yn dda')
    // No Save button anywhere: looking away is what saves it.
    await wrapper.find('.row-edit').trigger('blur')
    await flushPromises()
    expect(wrapper.find('.strip-words').text()).toContain('3 still to read')

    // Then she carries on from the far end of the list.
    await wrapper.findAll('.roster-list .row')[3].find('.row-record').trigger('click')
    await flushPromises()
    expect(wrapper.find('.line-target').text()).toBe('llinell pedwar')
    expect(wrapper.find('.upnext-list').text()).toContain('te, os gwelwch yn dda')

    await tapNext(wrapper)
    expect(wrapper.find('.line-target').text()).toBe('llinell un')
    await tapNext(wrapper)
    // The rewritten line is offered again rather than sitting silently owed —
    // and its one step forward has been given back, so Next can leave it.
    expect(wrapper.find('.line-target').text()).toBe('te, os gwelwch yn dda')
    await tapNext(wrapper)
    // Nothing left anywhere, so the run ends — and the roster on the done
    // screen agrees with it, which is the whole of what went out of whack.
    expect(wrapper.find('.strip-words').text()).toContain('4 recorded')
    expect(wrapper.find('.strip-words').text()).toContain('0 still to read')
  })

  it('does not list the same coming-up line twice once the scan wraps', async () => {
    const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_tom_zzz' } })
    await flushPromises()
    await openEveryLine(wrapper)
    await wrapper.findAll('.roster-list .row')[3].find('.row-record').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.upnext-list li')).toHaveLength(1)
  })
})

describe('RecordistRoom — the keyboard belongs to the keyboard while she is typing', () => {
  let wrapper
  beforeEach(() => { queueTake.mockClear(); savedTakes.clear(); stubGappyQueue() })
  afterEach(() => { if (wrapper) wrapper.unmount() })

  it('does not advance the queue when a space is typed into a rewrite', async () => {
    wrapper = mount(RecordistRoom, { props: { voiceId: 'human_tom_zzz' }, attachTo: document.body })
    await flushPromises()
    await wrapper.find('.btn-begin').trigger('click')   // opens on line-1
    await flushPromises()
    expect(wrapper.find('.line-target').text()).toBe('llinell un')

    await wrapper.find('.line-target').trigger('click')
    await flushPromises()
    const box = wrapper.find('.edit-box')
    expect(box.exists()).toBe(true)

    // A space, an r and a b — the three shortcuts — typed as words, from inside
    // the box, bubbling to the window listener exactly as they do in a browser.
    for (const init of [{ code: 'Space', key: ' ' }, { key: 'r' }, { key: 'b' }]) {
      box.element.dispatchEvent(new window.KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true }))
    }
    await flushPromises()

    // Still editing the same line, no take filed, nothing advanced.
    expect(wrapper.find('.edit-box').exists()).toBe(true)
    expect(queueTake).not.toHaveBeenCalled()
    expect(wrapper.find('.stage-progress').text()).toContain('Editing')
  })

  it('leaves the transport dead while the editor is open', async () => {
    wrapper = mount(RecordistRoom, { props: { voiceId: 'human_tom_zzz' }, attachTo: document.body })
    await flushPromises()
    await wrapper.find('.btn-begin').trigger('click')
    await flushPromises()
    await wrapper.find('.line-target').trigger('click')
    await flushPromises()

    for (const sel of ['.ctl-again', '.ctl-next', '.btn-finish']) {
      expect(wrapper.find(sel).attributes('disabled')).toBeDefined()
    }
    await wrapper.find('.ctl-next').trigger('click')
    await flushPromises()
    expect(queueTake).not.toHaveBeenCalled()
    expect(wrapper.find('.edit-box').exists()).toBe(true)
  })
})
