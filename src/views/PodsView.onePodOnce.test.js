// A pod appears ONCE on the pods page (Tom, 2026-09-10, over cym_n_for_eng:
// "good but what???? 2 versions of the same POD? Wait, what are they? both
// Pod-1? What???"). The page had a state card restating the serving pod's
// title, HELD badge, counts and coverage directly above that pod's own row, so
// someone landing cold counted three pods where there were two.
//
// The one control that lived only in that card — Release to learners / Hold
// back from learners — must survive, on the serving pod's row, still asking
// before a release. The fixture is the real cym_n_for_eng shape on 2026-09-10:
// a held core pod-1, a held choice pod, an archived placeholder in the drawer.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const TITLE = 'Northern Welsh (colloquial Gogledd Cymru Welsh) Listening Pods — Pod 1'
const cov = (t, k, n) => ({ target: t, known: k, total_sentences: n })
const PODS = [
  { id: 'cym_n_for_eng:pod-1', slug: 'pod-1', title: TITLE, pod_type: 'core', visibility: 'held',
    sentence_count: 231, audio_coverage: cov(143, 11, 231), speakers: {} },
  { id: 'cym_n_for_eng:senedd-s4c-steve', slug: 'senedd-s4c-steve', title: 'Senedd S4C — Steve',
    pod_type: 'choice', visibility: 'held', sentence_count: 567, audio_coverage: cov(567, 0, 567), speakers: {} },
  { id: 'cym_n_for_eng:pod-0-gated-2026-08-06', slug: 'pod-0-gated-2026-08-06',
    title: '[ARCHIVED 2026-08-11] [GATED 2026-08-06] placeholder — kept for rollback',
    pod_type: 'core', visibility: 'held', sentence_count: 0, audio_coverage: cov(0, 0, 0), speakers: {} },
]

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { courseCode: 'cym_n_for_eng' }, query: {} }),
}))
vi.mock('@/composables/useAuth.js', () => ({
  useAuth: () => ({ isAdmin: { value: true }, getAccessToken: async () => 'token' }),
}))
vi.mock('@/composables/useCourses', () => ({
  useCourses: () => ({ getCourseName: (c) => c }),
}))
vi.mock('@/services/api.js', () => ({ getApiUrl: () => 'http://api.test' }))
vi.mock('@/components/PodCastPanel.vue', () => ({ default: { template: '<div />' } }))

import PodsView from './PodsView.vue'

let calls
beforeEach(() => {
  calls = []
  global.fetch = vi.fn(async (url, init) => {
    const u = String(url)
    calls.push({ url: u, init })
    if (u.endsWith('/api/pods/cym_n_for_eng')) return { ok: true, json: async () => ({ pods: PODS }) }
    if (u.endsWith('/visibility')) return { ok: true, json: async () => ({ ok: true }) }
    return { ok: false, status: 404, json: async () => ({}) }
  })
})

async function mountView() {
  const wrapper = mount(PodsView, {
    global: { stubs: { 'router-link': { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  })
  await flushPromises()
  await flushPromises()
  return wrapper
}

const count = (text, needle) => text.split(needle).length - 1

describe('PodsView — a pod appears once', () => {
  it('states the serving pod\'s title once, not once per level', async () => {
    const w = await mountView()
    expect(count(w.text(), TITLE)).toBe(1)
    expect(count(w.text(), '143/231')).toBe(1)
    expect(w.text()).not.toContain('already generated')
  })

  it('still counts two current pods and one archived', async () => {
    const w = await mountView()
    expect(w.text()).toContain('2 pods · 798 sentences total · 1 archived')
  })

  it('offers the create step only when there is no serving pod', async () => {
    const w = await mountView()
    expect(w.text()).not.toContain('Generate Pod 1')
  })
})

describe('PodsView — the release control survives, on the serving pod\'s row', () => {
  it('shows exactly one Release to learners button, on the pod-1 row, not on the choice pod', async () => {
    const w = await mountView()
    const buttons = w.findAll('button').filter(b => b.text() === 'Release to learners')
    expect(buttons).toHaveLength(1)
    const row = w.findAll('a').find(a => a.attributes('href') === '/production/cym_n_for_eng/pods/pod-1')
    expect(row.text()).toContain('Release to learners')
    const choice = w.findAll('a').find(a => a.attributes('href') === '/production/cym_n_for_eng/pods/senedd-s4c-steve')
    expect(choice.text()).not.toContain('Release to learners')
  })

  it('asks before releasing, and a "no" writes nothing', async () => {
    const w = await mountView()
    window.confirm = vi.fn(() => false)
    await w.findAll('button').find(b => b.text() === 'Release to learners').trigger('click')
    await flushPromises()
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining(`Release ${TITLE} to learners on cym_n_for_eng?`))
    expect(calls.some(c => c.url.endsWith('/visibility'))).toBe(false)
  })

  it('a "yes" posts the deliberate-act token naming the pod', async () => {
    const w = await mountView()
    window.confirm = vi.fn(() => true)
    await w.findAll('button').find(b => b.text() === 'Release to learners').trigger('click')
    await flushPromises()
    const post = calls.find(c => c.url.endsWith('/api/admin/pods/cym_n_for_eng/pod-1/visibility'))
    expect(JSON.parse(post.init.body)).toEqual({ visibility: 'live', confirm: 'cym_n_for_eng:pod-1' })
  })
})
