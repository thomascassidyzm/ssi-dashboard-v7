// Deborah, 16 Oct 2026, proofreading the cym_s health pod: "Every so often I get Not responding …
// And then it jumps back to the start." Every merge to Popty main that day (about 20) shipped a new
// build, and main.js reloads an open tab on its next return into view — the pod came back at line 1
// with her ✓ PROOFREAD badges gone. Every merge also restarted the API, so a tick landing in those
// seconds failed. These tests mount the real page (job #244).
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reloadHeld, resetVersionReload } from '@/router/versionReload.js'
import { fetchThroughRestart, landingRow } from './pod-review-place.js'

const POD_ID = 'cym_s_for_eng:health'
const SENTENCES = [1, 2, 3, 4].map(n => ({
  id: `${POD_ID}:SC0${n}-F01-S01`, global_order: n, scene_number: n, speaker: 'Tom',
  target_text: `Llinell ${n}.`, known_text: `Line ${n}.`, target_audio_id: null, known_audio_id: null,
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { courseCode: 'cym_s_for_eng', slug: 'health' }, query: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), afterEach: vi.fn() }),
}))
vi.mock('../lib/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } } }))

let tickAnswers   // queued statuses for the proofread POST; empty = 200
let navType
const scrolled = []

beforeEach(() => {
  sessionStorage.clear(); localStorage.clear(); resetVersionReload()
  tickAnswers = []; navType = 'navigate'; scrolled.length = 0
  Element.prototype.scrollIntoView = function () { scrolled.push(this.getAttribute('data-sent-id')) }
  performance.getEntriesByType = vi.fn(() => [{ type: navType }])
  vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
    const u = String(url)
    if (u.includes('/pods/drafts')) return { ok: true, status: 200, json: async () => ({ items: SENTENCES.map(s => ({ id: s.id, podId: POD_ID })) }) }
    if (u.includes('/pods/coverage')) return { ok: true, status: 200, json: async () => ({ items: [] }) }
    if (u.includes('/proofread')) {
      const status = tickAnswers.shift() || 200
      return { ok: status === 200, status, json: async () => (status === 200 ? { ok: true } : { error: 'Bad gateway' }) }
    }
    if (u.includes('/api/pods/')) {
      return { ok: true, status: 200, json: async () => ({ pod: { id: POD_ID, title: 'Health', slug: 'health', visibility: 'held' }, sentences: SENTENCES.map(s => ({ ...s })) }) }
    }
    return { ok: false, status: 404, json: async () => ({}) }
  }))
})
afterEach(() => { vi.useRealTimers() })

async function mountPage() {
  const { default: PodDetailView } = await import('./PodDetailView.vue')
  const wrapper = mount(PodDetailView, { attachTo: document.body, props: { courseCode: 'cym_s_for_eng', slug: 'health' }, global: { stubs: { RouterLink: true, 'router-link': true } } })
  await flushPromises()
  return wrapper
}
const tickButtons = (w) => w.findAll('button').filter(b => (b.attributes('title') || '').startsWith('Mark this line proofread'))

describe('pod proofreading survives a new build reloading the tab', () => {
  it('after a reload the page goes back to the line she last ticked, not line 1', async () => {
    const first = await mountPage()
    await tickButtons(first)[2].trigger('click')        // line 3
    await flushPromises()
    first.unmount()

    navType = 'reload'
    const again = await mountPage()
    expect(scrolled).toEqual([SENTENCES[2].id])
    expect(again.find('[data-test="pod-place-note"]').text()).toContain('line 3')
    again.unmount()
  })

  it('keeps this session’s ✓ PROOFREAD badges across the reload', async () => {
    const first = await mountPage()
    await tickButtons(first)[0].trigger('click')
    await flushPromises()
    first.unmount()

    navType = 'reload'
    const again = await mountPage()
    expect(again.text()).toContain('✓ PROOFREAD')
    expect(again.findAll('button').map(b => b.text())).toContain('Done 1')
    again.unmount()
  })

  it('a fresh visit offers the place instead of jumping', async () => {
    localStorage.setItem('popty_pod_place:cym_s_for_eng:health', JSON.stringify({ sentenceId: SENTENCES[3].id, order: 4 }))
    const w = await mountPage()
    expect(scrolled).toEqual([])
    const go = w.findAll('button').find(b => b.text() === 'Continue from line 4')
    await go.trigger('click')
    await flushPromises()
    expect(scrolled).toEqual([SENTENCES[3].id])
    w.unmount()
  })

  it('an open editor holds the new-build reload until it is closed', async () => {
    const w = await mountPage()
    await w.findAll('button').find(b => b.attributes('title') === 'Edit target / known text').trigger('click')
    expect(reloadHeld()).toBe(true)
    await w.findAll('button').find(b => b.text() === 'Cancel').trigger('click')
    expect(reloadHeld()).toBe(false)
    w.unmount()
  })
})

describe('a tick that meets the API mid-restart is asked again', () => {
  it('502 then 200 → ticked, no error on screen', async () => {
    const w = await mountPage()
    vi.useFakeTimers()
    tickAnswers = [502]
    await tickButtons(w)[0].trigger('click')
    await vi.advanceTimersByTimeAsync(2000)
    vi.useRealTimers()
    await flushPromises()
    expect(w.text()).toContain('✓ PROOFREAD')
    expect(w.text()).not.toContain('Could not record that tick')
    w.unmount()
  })
})

describe('pod-review-place helpers', () => {
  it('fetchThroughRestart retries 502/503/504 and network errors, returns any other answer at once', async () => {
    const sleep = async () => {}
    const answers = [new Error('ECONNRESET'), { status: 503 }, { status: 200 }]
    const res = await fetchThroughRestart(async () => { const a = answers.shift(); if (a instanceof Error) throw a; return a }, { sleep })
    expect(res.status).toBe(200)
    let calls = 0
    const four = await fetchThroughRestart(async () => { calls++; return { status: 409 } }, { sleep })
    expect([four.status, calls]).toEqual([409, 1])
    calls = 0
    const down = await fetchThroughRestart(async () => { calls++; return { status: 502 } }, { sleep, delaysMs: [1, 1] })
    expect([down.status, calls]).toEqual([502, 3])
  })
  it('landingRow falls forward to the next shown line when the remembered one is filtered out', () => {
    const shown = [{ id: 'a', global_order: 1 }, { id: 'c', global_order: 3 }]
    expect(landingRow(shown, { sentenceId: 'b', order: 2 }).id).toBe('c')
    expect(landingRow(shown, { sentenceId: 'z', order: 9 }).id).toBe('c')
    expect(landingRow(shown, null)).toBe(null)
  })
})
