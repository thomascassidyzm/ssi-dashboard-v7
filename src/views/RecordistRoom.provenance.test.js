// WHO WROTE THE LINE, ON THE SCREEN THE ARTIST IS ACTUALLY LOOKING AT.
//
// Tom, 2026-09-03: the artist "should be able to SEE that a line is
// machine-drafted rather than human-authored, and their correction must write
// back to the text -- that is a booth affordance, not a gate, and it must not
// add a step or a wait."
//
// So this file tests THREE things and refuses to test a fourth:
//   1. a machine-written line says so, in words, on the card being read;
//   2. a line a person wrote says nothing at all;
//   3. fixing the line takes the note off it in the same breath.
// The fourth -- that a drafted line is still readable, recordable and counted
// exactly like every other -- is the whole ruling, so it is asserted too: the
// note must never become a gate.
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

// The composable's real shape, stubbed: the booth reads a dozen counters off it
// on every render, and this file is about the words on the card.
vi.mock('@/composables/useRecordistQueue', () => ({
  DURABLE_TAKES_FEATURE: 'off',
  useRecordistQueue: () => ({
    attach: vi.fn(), teardown: vi.fn(), reset: vi.fn(), drain: vi.fn(),
    discardRefused: vi.fn(), isUnsent: () => false,
    queueTake: (take) => { savedTakes.set(take.lineId, true); return queueTake(take) },
    markFailed,
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    carriedOverCount: ref(0), refusedCount: ref(0), staleCount: ref(0),
    persistent: ref(true), storageNote: ref(null), uploadingLine: ref(null), lastError: ref(null),
    saved: savedTakes, failed: failedTakes, unsentLines: ref([]),
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

const DRAFTED = { id: 'line-1', order: 1, text: 'Bore da.', knownText: 'Good morning.', speaker: 'Aran', courseCode: 'cym_n_for_eng', recorded: false, clipUrl: null, canEditText: true, machineDrafted: true }
const HUMAN = { id: 'line-2', order: 2, text: 'Nos da.', knownText: 'Good night.', speaker: 'Aran', courseCode: 'cym_n_for_eng', recorded: false, clipUrl: null, canEditText: true, machineDrafted: false }

// One fetch stub for the two calls this screen makes: the queue on load, and
// the text write-back when a line is corrected.
function stubApi({ onPatch } = {}) {
  global.fetch = vi.fn((url, opts = {}) => {
    if ((opts.method || 'GET') === 'PATCH') {
      const body = JSON.parse(opts.body)
      if (onPatch) onPatch(url, body)
      return Promise.resolve({
        ok: true, status: 200,
        json: async () => ({
          ok: true, lineId: 'line-1', text: body.text, knownText: 'Good morning.',
          courseCode: 'cym_n_for_eng', recorded: false, machineDrafted: false,
          previousText: 'Bore da.', alsoChanged: 0, unlinkedAudioId: null, progressDropped: 0,
        }),
      })
    }
    return Promise.resolve({
      ok: true, status: 200,
      json: async () => ({
        displayName: 'Aran', languageName: 'Welsh', total: 2, recorded: 0, remaining: 2,
        lines: [{ ...DRAFTED }, { ...HUMAN }],
      }),
    })
  })
}

async function inTheBooth() {
  const wrapper = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' } })
  await flushPromises()
  await wrapper.find('.btn-begin').trigger('click')
  await flushPromises()
  return wrapper
}

describe('RecordistRoom — a machine-written line says so', () => {
  beforeEach(() => { queueTake.mockClear(); savedTakes.clear(); stubApi() })

  it('tells the artist who wrote the line, and what to do about it', async () => {
    const wrapper = await inTheBooth()
    const note = wrapper.find('.line-drafted')
    expect(note.exists()).toBe(true)
    expect(note.text()).toBe("A machine wrote this line. If it's wrong, tap it and fix it.")
    // The line itself is still the biggest thing on the screen and still the
    // thing being read -- the note is next to it, not instead of it.
    expect(wrapper.find('.line-target').text()).toBe('Bore da.')
  })

  it('says nothing about a line a person wrote', async () => {
    const wrapper = await inTheBooth()
    await wrapper.find('.ctl-next').trigger('click')
    await flushPromises()
    expect(wrapper.find('.line-target').text()).toBe('Nos da.')
    expect(wrapper.find('.line-drafted').exists()).toBe(false)
  })

  it('is a note and never a gate — the drafted line records like any other', async () => {
    const wrapper = await inTheBooth()
    await wrapper.find('.ctl-next').trigger('click')
    await flushPromises()
    // Read, queued, done. Nothing was approved and nobody was waited for.
    expect(queueTake).toHaveBeenCalledTimes(1)
    expect(queueTake.mock.calls[0][0].lineId).toBe('line-1')
  })

  it('takes the note off the moment the artist fixes the line', async () => {
    const patched = []
    stubApi({ onPatch: (url, body) => patched.push({ url, body }) })
    const wrapper = await inTheBooth()

    await wrapper.find('.line-target').trigger('click')
    await flushPromises()
    const box = wrapper.find('textarea.edit-box')
    expect(box.exists()).toBe(true)
    await box.setValue('Prynhawn da.')
    await box.trigger('blur')
    await flushPromises()

    expect(patched).toHaveLength(1)
    expect(patched[0].body.text).toBe('Prynhawn da.')
    expect(patched[0].url).toContain('/line/line-1/text')
    expect(wrapper.find('.line-target').text()).toBe('Prynhawn da.')
    expect(wrapper.find('.line-drafted').exists()).toBe(false)
  })
})
