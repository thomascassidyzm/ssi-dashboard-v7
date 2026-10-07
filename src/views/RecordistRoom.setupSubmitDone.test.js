// THE SETUP CHECK's SUBMIT IS OFFERED ON THE DONE CARD (job #844, review #843).
// The ready card only knew the page-load count, so an artist who recorded all
// ten in one sitting landed on the done card with nothing to press. The server
// still re-checks completeness; this proves the button is there, and that it
// is not there for an ordinary (non-setup) voice.
//
// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, reactive } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const queueTake = vi.fn()
const savedTakes = vi.hoisted(() => new Map())
const rec = vi.hoisted(() => ({
  beginLine: null, discardLine: null, endLine: null,
}))

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
    saved: reactive(savedTakes), failed: new Map(),
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
    beginLine: rec.beginLine,
    endLine: rec.endLine,
    discardLine: rec.discardLine,
    stop: vi.fn().mockResolvedValue(undefined),
  }),
}))

import RecordistRoom from './RecordistRoom.vue'

const wait = ms => new Promise(r => setTimeout(r, ms))
async function until(cond, what, limit = 4000) {
  const t0 = Date.now()
  while (Date.now() - t0 < limit) { await flushPromises(); if (cond()) return; await wait(20) }
  throw new Error(`gave up waiting for: ${what}`)
}

function stub(pack, n = 1) {
  global.fetch = vi.fn().mockImplementation(() => Promise.resolve({
    ok: true, status: 200,
    json: async () => ({
      displayName: 'Test Voice', languageName: 'Welsh', total: n, recorded: 0, remaining: n, pack,
      lines: Array.from({ length: n }, (_, i) => ({ id: `line-${i + 1}`, order: i + 1, text: `llinell ${i + 1}`, knownText: `line ${i + 1}`, recorded: false, clipUrl: null, canEditText: true })),
    }),
  }))
}

async function recordOneAndStop(w) {
  await w.find('.btn-begin').trigger('click')
  await until(() => w.find('.ctl-next').exists(), 'the stage')
  await wait(300)
  await w.find('.ctl-next').trigger('click')
  await flushPromises()
  // the last line's Next ends the session; otherwise stop here
  if (w.find('.btn-finish').exists()) await w.find('.btn-finish').trigger('click')
  await until(() => !w.find('.ctl-next').exists() && w.find('.rc-card').exists(), 'the done card')
}

describe('setup check: Submit on the done card', () => {
  beforeEach(() => {
    savedTakes.clear()
    rec.beginLine = vi.fn()
    rec.discardLine = vi.fn().mockResolvedValue(undefined)
    rec.endLine = vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)], { type: 'audio/webm' })))
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('offers Submit once recording stops on an open setup pack, and posts to the submit route', async () => {
    stub({ setup: { status: 'open' } })
    const w = mount(RecordistRoom, { props: { voiceId: 'human_dan_pack' }, global: { stubs: { RouterLink: { template: '<a><slot/></a>' } } } })
    await until(() => w.find('.btn-begin').exists(), 'the ready card')
    await recordOneAndStop(w)
    const submit = w.findAll('.setup-go').find(b => b.text().includes('Submit my setup check'))
    expect(submit, 'Submit on the done card').toBeTruthy()
    await submit.trigger('click')
    await flushPromises()
    expect(global.fetch.mock.calls.some(([url, o]) => /\/voice\/human_dan_pack\/submit$/.test(url) && o && o.method === 'POST')).toBe(true)
  })

  it('offers no Submit to an ordinary voice', async () => {
    stub(undefined)
    const w = mount(RecordistRoom, { props: { voiceId: 'human_dan' }, global: { stubs: { RouterLink: { template: '<a><slot/></a>' } } } })
    await until(() => w.find('.btn-begin').exists(), 'the ready card')
    await recordOneAndStop(w)
    expect(w.text()).not.toContain('Submit my setup check')
  })

  it('ten-line pack: no Submit after one saved phrase, Submit once all ten are saved', async () => {
    stub({ setup: { status: 'open' } }, 10)
    const w = mount(RecordistRoom, { props: { voiceId: 'human_dan_pack' }, global: { stubs: { RouterLink: { template: '<a><slot/></a>' } } } })
    await until(() => w.find('.btn-begin').exists(), 'the ready card')
    await w.find('.btn-begin').trigger('click')
    await until(() => w.find('.ctl-next').exists(), 'the stage')
    await wait(300)
    await w.find('.ctl-next').trigger('click')
    await flushPromises()
    // stop after one: leave the session via the finish control if offered
    if (w.find('.btn-finish').exists()) await w.find('.btn-finish').trigger('click')
    await until(() => w.find('.rc-card').exists(), 'the done card')
    expect(w.text()).not.toContain('Submit my setup check')
    expect(w.text()).toMatch(/\d+ of your setup check phrases are still to record/)
    for (let i = 1; i <= 10; i++) reactive(savedTakes).set(`line-${i}`, true)
    await flushPromises()
    expect(w.text()).toContain('Submit my setup check')
  })
})
