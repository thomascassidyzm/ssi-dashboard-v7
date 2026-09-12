// The jump-in marker (Tom, 2026-09-12: a line that jumps in on the previous
// speaker plays with no gap; a genuine turn keeps today's gap). On the pod page
// the line's state is visible and one tap flips it, through the same
// course-scoped PATCH door as a text edit — and the tap sends ONLY jump_in, so
// nothing about the words or the audio moves.
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const SENTENCES = [
  { id: 's1', global_order: 1, scene_number: 1, speaker: 'Tom', target_text: 'Chi lo sa. Comincia tu.', known_text: 'Who knows. You start.', target_audio_id: null, known_audio_id: null, jump_in: null, jumpIn: false },
  { id: 's2', global_order: 2, scene_number: 1, speaker: 'Aran', target_text: '—molto, molto in fretta.', known_text: '—very, very quickly.', target_audio_id: null, known_audio_id: null, jump_in: true, jumpIn: true },
]

let calls
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { courseCode: 'ita_for_eng', slug: 'method-pod' }, query: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))
vi.mock('../lib/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } } }))

beforeEach(() => {
  calls = []
  vi.stubGlobal('fetch', vi.fn(async (url, init) => {
    calls.push({ url: String(url), init })
    if (String(url).includes('/api/pods/')) return { ok: true, status: 200, json: async () => ({ pod: { id: 'ita_for_eng:method-pod', title: 'Method pod', slug: 'method-pod', visibility: 'live' }, sentences: SENTENCES.map((s) => ({ ...s })) }) }
    if (String(url).includes('/pods/sentence/s1') && init?.method === 'PATCH') {
      return { ok: true, status: 200, json: async () => ({ ok: true, sentence: { id: 's1', jump_in: JSON.parse(init.body).jump_in }, unlinkedAudio: {} }) }
    }
    return { ok: false, status: 404, json: async () => ({}) }
  }))
})

async function mountPage() {
  const { default: PodDetailView } = await import('./PodDetailView.vue')
  const wrapper = mount(PodDetailView, { props: { courseCode: 'ita_for_eng', slug: 'method-pod' }, global: { stubs: { RouterLink: true, 'router-link': true } } })
  await flushPromises()
  return wrapper
}

describe('jump-in on the pod page', () => {
  it('shows the state on every line: lit for a jump-in, unlit for a turn', async () => {
    const wrapper = await mountPage()
    const btns = wrapper.findAll('button.jump-in-btn')
    expect(btns.length).toBe(2)
    expect(btns[0].classes()).not.toContain('jump-in-on')
    expect(btns[1].classes()).toContain('jump-in-on')
    expect(btns[1].attributes('title')).toMatch(/jumps in/i)
  })

  it('one tap flips it, sending only jump_in — never text, never audio', async () => {
    const wrapper = await mountPage()
    await wrapper.findAll('button.jump-in-btn')[0].trigger('click')
    await flushPromises()
    const patch = calls.find((c) => c.init?.method === 'PATCH')
    expect(patch).toBeTruthy()
    expect(patch.url).toContain('/api/production/ita_for_eng/pods/sentence/s1')
    expect(JSON.parse(patch.init.body)).toEqual({ jump_in: true })
    expect(wrapper.findAll('button.jump-in-btn')[0].classes()).toContain('jump-in-on')
  })
})
