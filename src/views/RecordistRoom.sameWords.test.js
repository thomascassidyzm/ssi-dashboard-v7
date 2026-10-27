// ONE TAKE, EVERY LINE OF THE SAME WORDS (job #198) — see the comment above the describe block.
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const queued = vi.hoisted(() => [])
const savedTakes = vi.hoisted(() => new Map())
const mic = vi.hoisted(() => ({ speech: null, endLine: null }))

vi.mock('@/composables/useRecordistQueue', () => ({
  DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
  useRecordistQueue: () => ({
    persistent: ref(true), carriedOverCount: ref(0), refusedCount: ref(0),
    isUnsent: () => false, attach: vi.fn(), teardown: vi.fn(), reset: vi.fn(),
    queueTake: (take) => { queued.push(take); savedTakes.set(take.lineId, true) },
    markFailed: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: savedTakes, failed: new Map(),
    flush: vi.fn(), retryFailed: vi.fn(),
  }),
}))

vi.mock('@/composables/useTapRecorder', async () => {
  const { ref: vref } = await import('vue')
  mic.speech = vref(true)
  return {
    DEFAULT_CAPTURE_PROFILE: 'voice',
    resolveCaptureProfile: () => 'phone',
    useTapRecorder: () => ({
      isRecording: vref(true), level: vref(0.3), clipping: vref(false),
      devices: vref([]), appliedSettings: vref({}), profile: vref('voice'), error: vref(null),
      lineHasSpeech: mic.speech, quietMs: vref(0), meterTrusted: vref(true),
      inputPeak: vref(0.4), roomTone: vref(0.001),
      listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
      awaitLeadIn: vi.fn().mockResolvedValue(undefined),
      beginLine: vi.fn(),
      endLine: vi.fn(() => (mic.endLine ? mic.endLine() : Promise.resolve(new Blob([new Uint8Array(4096)], { type: 'audio/webm' })))),
      discardLine: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
    }),
  }
})

import RecordistRoom from './RecordistRoom.vue'

// ONE TAKE, EVERY LINE OF THE SAME WORDS (Aran, 27 Oct 2026, job #198). On staging he read a seed
// sentence and the booth's very next line was the LEGO of exactly the same words — ten times in one
// session — because the next line is picked the instant he moves on, before the seed's take lands,
// and "settled" was decided by line id alone. A line whose spoken words (case and punctuation
// aside) were just said, or are already recorded on another line, is not in the reading flow.
function line(id, kind, text, extra = {}) {
  return { id, kind, role: 'target2', text, knownText: `crib ${id}`, recorded: false, clipUrl: null, readStyle: 'natural', ...extra }
}
function stubQueue(lines) {
  global.fetch = vi.fn().mockImplementation(() => Promise.resolve({
    ok: true, status: 200,
    json: async () => ({ displayName: 'Aran', languageName: 'Welsh', total: lines.length, recorded: lines.filter((l) => l.recorded).length, remaining: lines.length, lines }),
  }))
}
let clock = 1_000_000
async function next(w) { clock += 400; await w.find('.ctl-next').trigger('click'); await flushPromises() }
const onLine = (w) => w.find('.line-target').text()
async function mountAndStart() {
  const w = mount(RecordistRoom, { props: { voiceId: 'human_test_zzz' } })
  await flushPromises()
  await w.find('.btn-begin').trigger('click')
  await flushPromises()
  return w
}

describe('RecordistRoom — the same words are never asked for twice', () => {
  beforeEach(() => {
    queued.length = 0; savedTakes.clear(); localStorage.clear()
    mic.speech.value = true; mic.endLine = null
    clock = 1_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => clock)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('reading a seed skips the LEGO of exactly its words (curly vs straight apostrophe, same words)', async () => {
    stubQueue([
      line('seed:a:target2', 'seed', "esgusodwch fi, dach chi'n barod?"),
      line('lego:b:target2', 'lego', 'esgusodwch fi, dach chi’n barod?'),
      line('phrase:c:target2', 'phrase', 'esgusodwch fi, dach chi’n barod rŵan?'),
    ])
    const w = await mountAndStart()
    expect(onLine(w)).toContain('barod?')
    await next(w)
    expect(onLine(w)).toContain('rŵan')
    expect(queued.map((t) => t.lineId)).toEqual(['seed:a:target2'])
  })

  it('a phrase read first settles the seed and the LEGO that say the same words, punctuation aside', async () => {
    stubQueue([
      line('phrase:p:target2', 'phrase', 'esgusodwch fi, be’ ddudoch chi?'),
      line('seed:s:target2', 'seed', 'Esgusodwch fi be ddudoch chi'),
      line('lego:l:target2', 'lego', 'esgusodwch fi, be’ ddudoch chi?'),
      line('seed:t:target2', 'seed', 'esgusodwch fi, dach chi isio?'),
    ])
    const w = await mountAndStart()
    await next(w)
    expect(onLine(w)).toContain('isio')
  })

  it('a batch opening with a line already recorded keeps its twin out of the flow', async () => {
    stubQueue([
      line('seed:a:target2', 'seed', 'bag Siân ydy hwnna', { recorded: true }),
      line('lego:b:target2', 'lego', 'bag Siân ydy hwnna'),
      line('phrase:c:target2', 'phrase', 'ond bag Siân ydy hwnna'),
    ])
    const w = await mountAndStart()
    expect(onLine(w)).toContain('ond bag')
  })

  it('different words stay owed: a mutated form is not its unmutated LEGO, and a known line is not a target one', async () => {
    stubQueue([
      line('seed:a:target2', 'seed', 'mae o’n flasus'),
      line('lego:b:target2', 'lego', 'blasus'),
      line('lego:c:target2', 'lego', 'mae o’n flasus', { role: 'known' }),
    ])
    const w = await mountAndStart()
    await next(w)
    expect(onLine(w)).toBe('blasus')
  })

  it('a line walked across without speech settles nothing: its twin is still asked for', async () => {
    stubQueue([
      line('seed:a:target2', 'seed', 'Dach chi’n barod?'),
      line('lego:b:target2', 'lego', 'dach chi’n barod'),
    ])
    const w = await mountAndStart()
    mic.speech.value = false
    await next(w)
    expect(onLine(w)).toBe('dach chi’n barod')
    expect(queued).toEqual([])
  })
})
