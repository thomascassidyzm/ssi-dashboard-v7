// THE EXCHANGE AROUND THE LINE, IN THE BOOTH.
//
// Aran (North Welsh), 2026-09-16, agreed by Tom: he was proofreading all 438
// lines of the cym_n health pod on the POD PAGE before recording, because to
// judge a line he has to see it IN CONTEXT — both speakers — and in the booth
// he only ever sees his own lines. The queue now carries the exchange
// (`context`, recordist-queue.cjs) and the booth draws it around the well.
//
// What these lock is the shape of that drawing, which is all constraint:
//   - the cue lines are dimmed context with a speaker chip, never lines to read;
//   - nothing about them is interactive — the mic is live and the thumb is near
//     the transport;
//   - the line being read stays the biggest thing on the screen and NOTHING
//     moves when the edit box opens inside the well.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const savedTakes = vi.hoisted(() => new Map())
const rec = vi.hoisted(() => ({ beginLine: null, discardLine: null, endLine: null }))

vi.mock('@/composables/useRecordistQueue', () => ({
  DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
  useRecordistQueue: () => ({
    persistent: ref(true), carriedOverCount: ref(0), refusedCount: ref(0),
    isUnsent: () => false, attach: vi.fn(), teardown: vi.fn(),
    queueTake: (take) => { savedTakes.set(take.lineId, true) },
    markFailed: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: savedTakes, failed: new Map(),
    flush: vi.fn(), retryFailed: vi.fn(),
  }),
}))

vi.mock('@/composables/useTapRecorder', () => ({
  DEFAULT_CAPTURE_PROFILE: 'voice',
  resolveCaptureProfile: () => 'voice',
  useTapRecorder: () => ({
    isRecording: ref(true), level: ref(0.3), clipping: ref(false),
    devices: ref([]), appliedSettings: ref({}), profile: ref('voice'), error: ref(null),
    lineHasSpeech: ref(true), quietMs: ref(0), meterTrusted: ref(true),
    inputPeak: ref(0.4), roomTone: ref(0.001),
    listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    beginLine: rec.beginLine, endLine: rec.endLine, discardLine: rec.discardLine,
    stop: vi.fn().mockResolvedValue(undefined),
  }),
}))

import RecordistRoom from './RecordistRoom.vue'

const RouterLinkStub = { props: ['to'], template: '<a class="rl" :href="to"><slot/></a>' }

// His line of the health pod, with Siân's either side of it — and a seed,
// which is nobody's conversation and carries no context at all.
const CONTEXTED = {
  id: 'p1', order: 2, text: 'dw i wedi blino', knownText: "I'm tired",
  kind: 'pod', podSlug: 'health', speaker: 'Wil', recorded: false, clipUrl: null, canEditText: true,
  context: {
    before: [{ speaker: 'Siân', text: 'sut wyt ti heddiw', knownText: 'how are you today' }],
    after: [
      { speaker: 'Siân', text: 'ers pryd', knownText: 'since when' },
      { speaker: 'Wil', text: 'ers dydd Llun', knownText: 'since Monday' },
    ],
  },
}
const BARE = {
  id: 's1', order: 3, text: 'un a dau', knownText: 'one and two',
  kind: 'seed', seedNumber: 7, recorded: false, clipUrl: null, canEditText: false, context: null,
}

function stubQueue(lines) {
  global.fetch = vi.fn().mockImplementation(() => Promise.resolve({
    ok: true, status: 200,
    json: async () => ({
      displayName: 'Aran', languageName: 'Welsh',
      total: lines.length, recorded: 0, remaining: lines.length, lines,
    }),
  }))
}

const mountBooth = () => mount(RecordistRoom, {
  props: { voiceId: 'human_aran_cym_n' },
  global: { stubs: { RouterLink: RouterLinkStub } },
})

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// The mic opens BEFORE the line appears (COLD_START_SETTLE_MS) — the well says
// "Getting ready" until it has. Real timers, because Date.now is frozen here.
async function until(cond, what) {
  for (let i = 0; i < 200; i += 1) {
    await flushPromises()
    if (cond()) return
    await wait(20)
  }
  throw new Error(`gave up waiting for: ${what}`)
}

async function intoTheBooth(lines) {
  stubQueue(lines)
  const w = mountBooth()
  await flushPromises()
  await w.find('.btn-begin').trigger('click')
  await until(() => w.find('.line-target').exists(), 'the line on screen')
  return w
}

describe('the booth draws the exchange around the line being read', () => {
  beforeEach(() => {
    savedTakes.clear()
    rec.beginLine = vi.fn()
    rec.discardLine = vi.fn().mockResolvedValue(undefined)
    rec.endLine = vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)], { type: 'audio/webm' })))
    vi.spyOn(Date, 'now').mockImplementation(() => 1_000_000)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('shows what is said before and after, greyed, with the speaker named', async () => {
    const w = await intoTheBooth([CONTEXTED, BARE])

    const before = w.find('.cue-before')
    const after = w.find('.cue-after')
    expect(before.exists()).toBe(true)
    expect(after.exists()).toBe(true)
    expect(before.text()).toContain('sut wyt ti heddiw')
    expect(before.text()).toContain('Siân')
    expect(after.text()).toContain('ers pryd')

    // THE LINE IS STILL THE LINE. The cue is outside the well entirely, so
    // nothing about it can be mistaken for the words to read.
    expect(w.find('.line-well').text()).toContain('dw i wedi blino')
    expect(w.find('.line-well .cue-line').exists()).toBe(false)
    // One short cue each side on a phone — the well is 44vh.
    expect(w.findAll('.cue-before .cue-line').length).toBe(1)
    expect(w.findAll('.cue-after .cue-line').length).toBe(1)
    // Nothing to touch while the mic is live.
    expect(w.findAll('.cue button, .cue a, .cue input').length).toBe(0)
  })

  it('draws no cue at all for a line that has no exchange', async () => {
    const w = await intoTheBooth([BARE])
    expect(w.find('.cue-before').exists()).toBe(false)
    expect(w.find('.cue-after').exists()).toBe(false)
    expect(w.find('.line-well').text()).toContain('un a dau')
  })

  it('leaves the line being read untouched while it is being edited', async () => {
    const w = await intoTheBooth([CONTEXTED, BARE])
    const wellBefore = w.find('.line-well').text()

    await w.find('.line-target').trigger('click')
    await flushPromises()

    // The editor is open ON the line...
    expect(w.find('.edit-box').exists()).toBe(true)
    expect(w.find('.edit-box').element.value).toBe('dw i wedi blino')
    expect(wellBefore).toContain('dw i wedi blino')
    // ...and the cue lines are exactly where they were, saying the same thing.
    expect(w.findAll('.cue-before .cue-line').length).toBe(1)
    expect(w.find('.cue-before').text()).toContain('sut wyt ti heddiw')
    expect(w.find('.cue-after').text()).toContain('ers pryd')
  })
})
