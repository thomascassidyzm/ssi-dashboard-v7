// THE RECORDIST EDITS THEIR OWN LINES, AND FINDS THE WAY AROUND.
//
// Tom, 2026-09-12, testing /r/human_tom_zzz as a voice artist: "the whole nav
// is not very clear … I should as a voice artist be able to see the way to get
// to the course Overview page and maybe other PODS … because I am also an
// editor of the lines. I should be able to see those to edit / proof … Probably
// to edit BOTH known and target languages, although editing a known language
// will of course orphan the audio."
//
// A sibling of the artist's day (RecordistRoom.artistsDay.test.js): the same
// real RecordistRoom, real useRecordistQueue and real take-store rules, the
// same faked edges — and the server here also honours the two-side edit
// contract of recordist-router.cjs, which recordist-text-edit.test.cjs proves
// on the real route:
//
//   - a TARGET edit puts the line back to still-to-read for this voice; the
//     old take is kept, filed under the words it says, and never served for the
//     new words (the mark IS the unlink — nothing is deleted);
//   - a KNOWN edit touches the known side only: this voice's take stays
//     recorded, the line does not come back onto the queue.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const shelf = vi.hoisted(() => ({ backend: null }))
const mic = vi.hoisted(() => ({ heard: null }))

vi.mock('@/services/takeStore', async (importOriginal) => {
  const orig = await importOriginal()
  return { ...orig, openTakeStore: async (opts = {}) => orig.createTakeStore(shelf.backend, opts) }
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
    endLine: vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)], { type: 'audio/webm' }))),
    discardLine: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  }),
}))

import { createMemoryBackend } from '@/services/takeStore'
mic.heard = ref(true)
import RecordistRoom from './RecordistRoom.vue'

const VOICE = 'human_aran_cym_n'
const COURSE = 'cym_n_for_eng'

// THE SERVER, as the booth sees it. Sentences carry both sides; a take is
// filed under the words it was read to (clip identity is by text), and a line
// is RECORDED iff a take of its CURRENT target words exists — the one
// resolver's by-text rule. A take never leaves `takes`.
function fakeServer() {
  const server = {
    sentences: new Map([
      ['A', { target: 'Bore da.', known: 'Good morning.', podSlug: 'senedd', podTitle: 'Senedd' }],
      ['B', { target: 'Prynhawn da.', known: 'Good afternoon.', podSlug: 'senedd', podTitle: 'Senedd' }],
      ['C', { target: 'Nos da.', known: 'Good night.', podSlug: 'pod-1', podTitle: 'POD 1' }],
    ]),
    takes: [],        // { audioId, lineId, text }
    knownTakes: [],   // the known-side voice's takes: { audioId, lineId, text }
    uploads: [],
    patches: [],
  }
  server.knownTakes.push({ audioId: 'known-A', lineId: 'A', text: 'Good morning.' })
  const isRecorded = (id) => server.takes.some(t => t.lineId === id && t.text === server.sentences.get(id).target)
  global.fetch = vi.fn(async (url, init = {}) => {
    const u = String(url)
    const method = init.method || 'GET'
    if (method === 'POST' && u.endsWith(`/api/recording/voice/${VOICE}/take`)) {
      const lineId = init.body.get('lineId')
      server.uploads.push(lineId)
      const audioId = `aud-${lineId}-${server.uploads.length}`
      server.takes.push({ audioId, lineId, text: server.sentences.get(lineId).target })
      return { ok: true, status: 200, json: async () => ({ audioId, clipUrl: `/clip/${lineId}.mp3` }) }
    }
    if (method === 'PATCH') {
      const m = /\/line\/([^/]+)\/text$/.exec(u)
      const id = m && decodeURIComponent(m[1])
      const body = JSON.parse(init.body)
      const s = server.sentences.get(id)
      server.patches.push({ id, body })
      const changed = []
      if (typeof body.text === 'string' && body.text.trim() !== s.target) { s.target = body.text.trim(); changed.push('target') }
      if (typeof body.knownText === 'string' && body.knownText.trim() !== s.known) { s.known = body.knownText.trim(); changed.push('known') }
      return { ok: true, status: 200, json: async () => ({ ok: true, lineId: id, text: s.target, knownText: s.known, courseCode: COURSE, recorded: isRecorded(id), changed, alsoChanged: 0 }) }
    }
    if (u.includes(`/api/recording/voice/${VOICE}?`)) {
      const lines = [...server.sentences.entries()].map(([id, s], i) => ({
        id, text: s.target, knownText: s.known, order: i + 1, speaker: 'Aran', courseCode: COURSE, kind: 'pod',
        podSlug: s.podSlug, podTitle: s.podTitle, canEditText: true,
        recorded: isRecorded(id), clipUrl: isRecorded(id) ? `/clip/${id}.mp3` : null,
      }))
      return {
        ok: true, status: 200,
        json: async () => ({
          displayName: 'Aran', languageName: 'Welsh',
          total: lines.length, recorded: lines.filter(l => l.recorded).length, remaining: lines.filter(l => !l.recorded).length,
          lines,
        }),
      }
    }
    throw new Error(`unexpected fetch ${method} ${u}`)
  })
  server.isRecorded = isRecorded
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
const tapGap = () => wait(300)

function counts(w) {
  const strip = w.find('.strip-words')
  const m = strip.exists() && /(\d+) recorded · (-?\d+) still to read/.exec(strip.text())
  return m ? { recorded: Number(m[1]), stillToRead: Number(m[2]) } : null
}
function startButton(w) {
  const b = w.find('.btn-begin')
  return b.exists() ? { text: b.text(), disabled: b.attributes('disabled') !== undefined } : null
}
async function start(w) {
  mic.heard.value = true
  await w.find('.btn-begin').trigger('click')
  await until(() => w.find('.ctl-next').exists(), 'the stage')
}
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
async function serverSettled(w, server, expectUploads) {
  await until(() => server.uploads.length >= expectUploads, `${expectUploads} uploads`)
  await until(() => !w.text().includes('still to upload') && !w.text().includes('still going up'), 'nothing in flight')
}
// Open "See every line" and every section under it, so a row can be tapped.
async function openEveryLine(w) {
  if (!w.find('.roster-list').exists()) await w.find('.roster-toggle').trigger('click')
  for (const head of w.findAll('.roster-list .sh-btn')) {
    if (head.attributes('aria-expanded') !== 'true') await head.trigger('click')
  }
  await flushPromises()
}
function rowFor(w, text) {
  return w.findAll('.roster-list .row').find(r => r.find('.row-text').text() === text)
}
async function editInRow(w, row, selector, value) {
  await row.find(selector).trigger('click')
  await until(() => w.find('.row-edit').exists(), 'the edit box')
  await w.find('.row-edit').setValue(value)
  await w.find('.row-edit').trigger('blur')
  await until(() => !w.find('.row-edit').exists(), 'the edit box closed')
}

describe('the recordist edits their own lines', () => {
  let server
  beforeEach(() => {
    shelf.backend = createMemoryBackend()
    localStorage.clear()
    sessionStorage.clear()
    server = fakeServer()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('a target edit puts the line back to still-to-read and keeps the old take; a known edit touches nothing of his', async () => {
    let w = openBooth()
    await until(() => counts(w) !== null, 'the ready card')
    expect(counts(w)).toEqual({ recorded: 0, stillToRead: 3 })

    // 1. Record line A. The server confirms; A is recorded.
    await start(w)
    await readAndNext(w)
    await serverSettled(w, server, 1)
    await stopHere(w)
    expect(server.isRecorded('A')).toBe(true)
    expect(counts(w)).toEqual({ recorded: 1, stillToRead: 2 })

    // 2. Edit A's TARGET words from the every-line list. A is still-to-read
    //    again, on this screen and on the server's answer after a reload; the
    //    old take is still on the server, filed under the old words, and it is
    //    not what the new words are served with.
    await openEveryLine(w)
    const takeBefore = server.takes.find(t => t.lineId === 'A')
    expect(takeBefore).toBeTruthy()
    await editInRow(w, rowFor(w, 'Bore da.'), '.row-text', 'Bore da i chi.')
    expect(server.patches.at(-1)).toEqual({ id: 'A', body: { text: 'Bore da i chi.' } })
    expect(counts(w)).toEqual({ recorded: 0, stillToRead: 3 })
    expect(server.isRecorded('A')).toBe(false)
    expect(server.takes).toContainEqual(takeBefore)  // never deleted: stale, not gone
    expect(server.knownTakes).toHaveLength(1)        // the known side was not touched

    w.unmount()
    w = openBooth()
    await until(() => counts(w) !== null, 'the ready card after reload')
    await flushPromises()
    expect(counts(w)).toEqual({ recorded: 0, stillToRead: 3 })
    expect(startButton(w)).toEqual({ text: expect.stringContaining('Bore da i chi.'), disabled: false })

    // 3. Read the new A, then edit A's KNOWN side. His take is untouched: A
    //    stays recorded, nothing comes back onto the queue, the crib changed.
    await start(w)
    await readAndNext(w)
    await serverSettled(w, server, 2)
    await stopHere(w)
    expect(server.isRecorded('A')).toBe(true)
    expect(counts(w)).toEqual({ recorded: 1, stillToRead: 2 })
    await openEveryLine(w)
    const row = rowFor(w, 'Bore da i chi.')
    expect(row.find('.row-known').text()).toBe('Good morning.')
    await editInRow(w, row, '.row-known', 'Good morning to you.')
    expect(server.patches.at(-1)).toEqual({ id: 'A', body: { knownText: 'Good morning to you.' } })
    expect(server.sentences.get('A').target).toBe('Bore da i chi.')
    expect(server.isRecorded('A')).toBe(true)
    expect(counts(w)).toEqual({ recorded: 1, stillToRead: 2 })
    expect(rowFor(w, 'Bore da i chi.').find('.row-known').text()).toBe('Good morning to you.')
    // And the target take is still exactly the take that was there.
    expect(server.takes.filter(t => t.lineId === 'A' && t.text === 'Bore da i chi.')).toHaveLength(1)
  })

  it('the nav row names Booth · Lines · Pods · Course and resolves them for this voice', async () => {
    const w = openBooth()
    await until(() => counts(w) !== null, 'the ready card')
    const nav = w.find('.rc-nav')
    expect(nav.exists()).toBe(true)
    expect(nav.text()).toMatch(/Booth.*Lines.*Pods.*Course/s)
    expect(nav.find('.is-here').attributes('href')).toBe(`/r/${VOICE}`)
    // Every pod this voice is cast in, named by the pod's own title, to its drafts page.
    const pods = nav.findAll('.rc-nav-pod').map(a => [a.text(), a.attributes('href')])
    expect(pods).toEqual([
      ['Senedd', `/production/${COURSE}/pods/senedd`],
      ['POD 1', `/production/${COURSE}/pods/pod-1`],
    ])
    expect(nav.find('.rc-nav-course').attributes('href')).toBe(`/production/${COURSE}`)
    // "Lines" opens the whole list on this page.
    expect(w.find('.roster-list').exists()).toBe(false)
    await nav.find('.rc-nav-btn').trigger('click')
    await flushPromises()
    expect(w.find('.roster-list').exists()).toBe(true)
    // And the course pages can find their way back: the booth remembered itself.
    expect(sessionStorage.getItem('popty.booth.voice')).toBe(VOICE)
  })
})
