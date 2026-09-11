// THE ARTIST'S DAY, END TO END, AGAINST THE REAL BOOTH.
//
// Tom, 2026-09-11, after Aran read the same 34 lines for the third time in one
// day: a week of booth commits each tested its own change, and none of them
// tested the day the artist actually has. The refused-take list lived in
// IndexedDB and was never reconciled against the server's recorded set, so a
// page that said "994 recorded · 0 still to read" also said "34 takes the
// server would not accept … read those lines again". He did.
//
// So this is ONE scenario, in the order he lives it, over the real
// RecordistRoom, the real useRecordistQueue and the real take-store rules. The
// only things faked are the edges the browser owns: the microphone, the
// network, and the IndexedDB shelf — which here is one memory backend that
// deliberately OUTLIVES the mount, so "reload the page" is a fresh composable
// over the same shelf, exactly as it is on his phone.
//
// It runs nightly on watson-1 (ops/ci/ci-checks.sh, dashboard leg, check
// `booth-artists-day`) and the nightly goes red if it fails.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

// The shelf. Created once per test and shared by every mount inside it.
const shelf = vi.hoisted(() => ({ backend: null }))
// Whether the recorder heard a voice on the line that is open. "Stop here" on a
// line nobody read files nothing; on a line he read, it files the take.
const mic = vi.hoisted(() => ({ heard: null }))

vi.mock('@/services/takeStore', async (importOriginal) => {
  const orig = await importOriginal()
  return {
    ...orig,
    // The rules over the persistent shelf, in place of IndexedDB.
    openTakeStore: async (opts = {}) => orig.createTakeStore(shelf.backend, opts),
  }
})

vi.mock('@/composables/useTapRecorder', () => ({
  DEFAULT_CAPTURE_PROFILE: 'voice',
  resolveCaptureProfile: () => 'voice',
  useTapRecorder: () => ({
    isRecording: ref(true), level: ref(0.3), clipping: ref(false),
    devices: ref([]), appliedSettings: ref({}), profile: ref('voice'), error: ref(null),
    lineHasSpeech: mic.heard, quietMs: ref(0), meterTrusted: ref(true),
    inputPeak: ref(0.4), roomTone: ref(0.001),
    listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    awaitLeadIn: vi.fn().mockResolvedValue(1200), activeAgeMs: () => 1200,
    beginLine: vi.fn(),
    // Every read comes back as a take with something on it.
    endLine: vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)], { type: 'audio/webm' }))),
    discardLine: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  }),
}))

import { createMemoryBackend } from '@/services/takeStore'
mic.heard = ref(true)
import RecordistRoom from './RecordistRoom.vue'

const VOICE = 'human_aran_cym_n'
const LINES = [
  { id: 'A', text: 'Bore da.', knownText: 'Good morning.' },
  { id: 'B', text: 'Prynhawn da.', knownText: 'Good afternoon.' },
  { id: 'C', text: 'Nos da.', knownText: 'Good night.' },
]
const N = LINES.length
const REFUSAL = 'silent/empty take (1ms after trim)'

// THE SERVER, as the booth sees it: a set of lines it holds a take for, and a
// set of lines it will refuse the next take of. Every accepted take is a
// recording from then on, whichever session posted it.
function fakeServer() {
  const server = { recorded: new Set(), refuse: new Set(), uploads: [] }
  global.fetch = vi.fn(async (url, init = {}) => {
    const u = String(url)
    if ((init.method || 'GET') === 'POST' && u.endsWith(`/api/recording/voice/${VOICE}/take`)) {
      const lineId = init.body.get('lineId')
      server.uploads.push(lineId)
      if (server.refuse.has(lineId)) {
        return { ok: false, status: 422, json: async () => ({ error: REFUSAL }) }
      }
      server.recorded.add(lineId)
      return { ok: true, status: 200, json: async () => ({ audioId: `aud-${lineId}-${server.uploads.length}`, clipUrl: `/clip/${lineId}.mp3` }) }
    }
    if (u.includes(`/api/recording/voice/${VOICE}?`)) {
      const lines = LINES.map((l, i) => ({
        ...l, order: i + 1, speaker: 'Aran', courseCode: 'cym_n_for_eng', kind: 'pod', podSlug: 'senedd',
        recorded: server.recorded.has(l.id),
        clipUrl: server.recorded.has(l.id) ? `/clip/${l.id}.mp3` : null,
      }))
      return {
        ok: true, status: 200,
        json: async () => ({
          displayName: 'Aran', languageName: 'Welsh',
          total: N, recorded: lines.filter(l => l.recorded).length, remaining: lines.filter(l => !l.recorded).length,
          lines,
        }),
      }
    }
    throw new Error(`unexpected fetch ${init.method || 'GET'} ${u}`)
  })
  return server
}

const RouterLinkStub = { props: ['to'], template: '<a class="rl" :href="to"><slot/></a>' }
const openBooth = () => mount(RecordistRoom, { props: { voiceId: VOICE }, global: { stubs: { RouterLink: RouterLinkStub } } })

const wait = ms => new Promise(r => setTimeout(r, ms))
async function until(cond, what, limit = 4000) {
  const t0 = Date.now()
  while (Date.now() - t0 < limit) {
    await flushPromises()
    if (cond()) return
    await wait(20)
  }
  throw new Error(`gave up waiting for: ${what}`)
}
// The tap debounce is 250ms of real time; a person cannot tap faster either.
const tapGap = () => wait(300)

// ── What the artist reads off the screen ────────────────────────────────────
// The roster's whole-run strip ("N recorded · M still to read") is on the ready
// card and the done card; the banner sits above every phase.
function counts(w) {
  const strip = w.find('.strip-words')
  const m = strip.exists() && /(\d+) recorded · (-?\d+) still to read/.exec(strip.text())
  return m ? { recorded: Number(m[1]), stillToRead: Number(m[2]) } : null
}
function banner(w) {
  const b = w.find('.safety-banner')
  return b.exists() ? { cls: b.classes().filter(c => c !== 'safety-banner').join(' '), text: b.text() } : null
}
function refusedListed(w) {
  return w.findAll('.redo-list li').map(li => ({ text: li.find('.redo-text').text(), why: li.find('.redo-why').text() }))
}
function currentLine(w) { const el = w.find('.line-target'); return el.exists() ? el.text() : null }
function tickShown(w) { return /✓ all \d+ recorded/.test(w.text()) }

// THE INVARIANT, checked at every settled point of the day: the two numbers on
// the strip add up to the run, neither is negative, and no done-tick is shown
// while a refusal or a pending upload exists anywhere.
function assertInvariant(w, { pendingOrRefused }) {
  const c = counts(w)
  expect(c, 'the strip is on the page').not.toBeNull()
  expect(c.recorded).toBeGreaterThanOrEqual(0)
  expect(c.stillToRead).toBeGreaterThanOrEqual(0)
  expect(c.recorded + c.stillToRead, `recorded + still-to-read == ${N}`).toBe(N)
  if (pendingOrRefused) expect(tickShown(w), 'no done-tick while a refusal or pending upload exists').toBe(false)
}

// ── Driving the booth as he does ────────────────────────────────────────────
async function start(w) {
  mic.heard.value = true
  await w.find('.btn-begin').trigger('click')
  await until(() => w.find('.ctl-next').exists(), 'the stage')
}
// Read the line on the stage and tap Next; the take files itself behind the tap.
async function readAndNext(w) {
  mic.heard.value = true
  await tapGap()
  await w.find('.ctl-next').trigger('click')
  await flushPromises()
}
async function stopHere(w) {
  mic.heard.value = false
  await w.find('.btn-finish').trigger('click')
  await until(() => w.find('.rc-card').text().length > 0 && !w.find('.ctl-next').exists(), 'the done card')
}
// The server has answered every upload the shelf held and the queue has caught up.
async function serverSettled(w, server, expectUploads) {
  await until(() => server.uploads.length >= expectUploads, `${expectUploads} uploads`)
  await until(() => !w.text().includes('still to upload') && !w.text().includes('still going up'), 'nothing in flight')
}

describe("the artist's day at the booth", () => {
  let server
  beforeEach(() => {
    shelf.backend = createMemoryBackend()
    localStorage.clear()
    server = fakeServer()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('reads, is refused once, re-reads, reloads, and is never asked for a saved line again', async () => {
    // 1. A queue of N lines, none recorded.
    let w = openBooth()
    await until(() => counts(w) !== null, 'the ready card')
    expect(counts(w)).toEqual({ recorded: 0, stillToRead: N })
    expect(banner(w)).toBeNull()
    assertInvariant(w, { pendingOrRefused: false })

    // 2. Record line A — the server confirms. Counts move by exactly one and A
    //    is never on the stage again.
    await start(w)
    expect(currentLine(w)).toBe('Bore da.')
    await readAndNext(w)
    await serverSettled(w, server, 1)
    expect(server.recorded.has('A')).toBe(true)
    expect(currentLine(w)).toBe('Prynhawn da.')

    // 3. Record line B — the server refuses it. B stays still-to-read, the
    //    banner names the refusal with the server's own words, and the count
    //    of refused takes is exactly one.
    server.refuse.add('B')
    await readAndNext(w)
    await serverSettled(w, server, 2)
    await until(() => banner(w) && banner(w).cls === 'refused', 'the refused banner')
    expect(banner(w).text).toContain('1 take the server would not accept')
    // The stage's own count agrees with the map: B is still to read.
    expect(w.find('.upnext-head').text()).toContain('2 still to read')
    await stopHere(w)
    expect(counts(w)).toEqual({ recorded: 1, stillToRead: 2 })
    expect(w.text()).toContain('1 did not save')
    expect(refusedListed(w)).toEqual([{ text: 'Prynhawn da.', why: REFUSAL }])
    assertInvariant(w, { pendingOrRefused: true })

    // 4. Re-read B from "Record it again" — confirmed this time. The banner is
    //    gone, nothing is listed as refused, B is recorded. The old refused
    //    record on the shelf must not resurrect it.
    server.refuse.delete('B')
    await w.find('.redo-btn').trigger('click')
    await until(() => currentLine(w) === 'Prynhawn da.', 'B back on the stage')
    await readAndNext(w)
    await serverSettled(w, server, 3)
    await until(() => !w.find('.ctl-next').exists() || currentLine(w) === 'Nos da.', 'the run moved on')
    if (w.find('.ctl-next').exists()) await stopHere(w)
    expect(server.recorded.has('B')).toBe(true)
    expect(banner(w)).toBeNull()
    expect(refusedListed(w)).toEqual([])
    expect(w.text()).not.toContain('did not save')
    expect(counts(w)).toEqual({ recorded: 2, stillToRead: 1 })
    assertInvariant(w, { pendingOrRefused: false })

    // 5. RELOAD. A fresh composable over the same shelf, the server's line list
    //    now saying A and B are recorded. Everything in 4 still holds — this is
    //    the step that was never tested, and the day it cost Aran.
    w.unmount()
    w = openBooth()
    await until(() => counts(w) !== null, 'the ready card after reload')
    await flushPromises()
    await wait(50)
    expect(counts(w)).toEqual({ recorded: 2, stillToRead: 1 })
    expect(banner(w), 'no stale refusal banner after reload').toBeNull()
    expect(w.text()).not.toContain('would not accept')
    expect(w.text()).not.toContain('did not save')
    assertInvariant(w, { pendingOrRefused: false })
    // …and the run starts on C, not on A or B.
    await start(w)
    expect(currentLine(w)).toBe('Nos da.')
    await stopHere(w)

    // 6. A take carried over from an EARLIER session, confirmed AFTER this
    //    queue loaded: the shelf holds a pending take of C from before this
    //    page opened, and the wire still says C is unrecorded. Once it goes up,
    //    C counts as recorded and is not served again.
    w.unmount()
    await shelf.backend.put({
      id: 'carried-C', voiceId: VOICE, lineId: 'C', text: 'Nos da.', device: 'earlier session',
      blob: new Blob([new Uint8Array(4096)], { type: 'audio/webm' }),
      status: 'pending', attempts: 0, lastError: null,
      createdAt: Date.now() - 60_000, nextAttemptAt: 0,
    })
    w = openBooth()
    await until(() => counts(w) !== null, 'the ready card with a carried-over take')
    await serverSettled(w, server, 4)
    expect(server.recorded.has('C')).toBe(true)
    await until(() => counts(w).recorded === N, 'the carried-over take counted as recorded')
    expect(counts(w)).toEqual({ recorded: N, stillToRead: 0 })
    expect(banner(w)).toBeNull()
    expect(w.find('.btn-begin').attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('Nothing left to read')
    assertInvariant(w, { pendingOrRefused: false })
    expect(tickShown(w), 'the done-tick, now everything is genuinely recorded').toBe(true)

    // 7. And the shelf is empty: every take reached the server and nothing was
    //    left behind to be counted tomorrow.
    expect(await shelf.backend.getAll()).toEqual([])
    w.unmount()
  })
})
