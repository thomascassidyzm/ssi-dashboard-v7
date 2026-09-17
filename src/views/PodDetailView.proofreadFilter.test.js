// Aran's report, 2026-09-17, proofreading the health pods: "ones that I edit
// are now disappearing from view, while ones which I just mark as okay are
// staying on the page", and "I'm only seeing the proofread ones — I thought I
// had from about scene 17 onwards".
//
// Both come from the ?drafts=1 filtered view. Saving an edit used to delete the
// line's id from draftIds, which is the very set the filter selects on, so the
// row fell out from under him; a tick kept the id and stayed. And the filter
// announced itself only as one small button inside the draft panel.
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const SENTENCES = [
  { id: 's1', global_order: 1, scene_number: 1, speaker: 'Tom', target_text: 'Bore da.', known_text: 'Good morning.', target_audio_id: null, known_audio_id: null },
  { id: 's2', global_order: 2, scene_number: 1, speaker: 'Aran', target_text: 'Sut wyt ti?', known_text: 'How are you?', target_audio_id: null, known_audio_id: null },
  { id: 's3', global_order: 3, scene_number: 17, speaker: 'Tom', target_text: 'Dw i wedi brifo.', known_text: 'I am hurt.', target_audio_id: null, known_audio_id: null },
]

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { courseCode: 'cym_n_for_eng', slug: 'health-ward-and-surgery' }, query: { drafts: '1' } }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))
vi.mock('../lib/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } } }))

beforeEach(() => {
  sessionStorage.clear()
  vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
    const u = String(url)
    if (u.includes('/pods/drafts')) {
      return { ok: true, status: 200, json: async () => ({ items: [{ id: 's1', podId: 'cym_n_for_eng:health-ward-and-surgery' }, { id: 's2', podId: 'cym_n_for_eng:health-ward-and-surgery' }] }) }
    }
    if (u.includes('/pods/coverage')) return { ok: true, status: 200, json: async () => ({ items: [] }) }
    if (u.includes('/proofread')) return { ok: true, status: 200, json: async () => ({ ok: true }) }
    if (opts?.method === 'PATCH') {
      const sent = JSON.parse(opts.body)
      return { ok: true, status: 200, json: async () => ({ sentence: { target_text: sent.target_text, known_text: sent.known_text, target_text_draft: false }, unlinkedAudio: { target_audio_id: null } }) }
    }
    if (u.includes('/api/pods/')) {
      return { ok: true, status: 200, json: async () => ({ pod: { id: 'cym_n_for_eng:health-ward-and-surgery', title: 'Health ward and surgery', slug: 'health-ward-and-surgery', visibility: 'live' }, sentences: SENTENCES.map((s) => ({ ...s })) }) }
    }
    return { ok: false, status: 404, json: async () => ({}) }
  }))
})

async function mountPage() {
  const { default: PodDetailView } = await import('./PodDetailView.vue')
  const wrapper = mount(PodDetailView, { props: { courseCode: 'cym_n_for_eng', slug: 'health-ward-and-surgery' }, global: { stubs: { RouterLink: true, 'router-link': true } } })
  await flushPromises()
  return wrapper
}

const rowText = (wrapper) => wrapper.findAll('.phrase-target').map(n => n.text())

describe('proofreading view: an edited line stays visible, like a ticked one', () => {
  it('keeps the row on screen with an EDITED badge after a save', async () => {
    const wrapper = await mountPage()
    expect(rowText(wrapper)).toEqual(['Bore da.', 'Sut wyt ti?'])   // the to-do filter

    await wrapper.findAll('button').find(b => b.attributes('title') === 'Edit target / known text').trigger('click')
    await wrapper.find('textarea[placeholder="target"]').setValue('Bore da!')
    await wrapper.findAll('button').find(b => b.text() === 'Save').trigger('click')
    await flushPromises()

    expect(rowText(wrapper)).toContain('Bore da!')                  // did NOT vanish
    expect(wrapper.text()).toContain('✓ EDITED')
    expect(wrapper.text()).not.toContain('DRAFT — AWAITING PROOFREAD\n      Bore da!')
  })

  it('keeps a ticked row on screen too, unchanged behaviour', async () => {
    const wrapper = await mountPage()
    await wrapper.findAll('button').find(b => (b.attributes('title') || '').startsWith('Mark this line proofread')).trigger('click')
    await flushPromises()
    expect(rowText(wrapper)).toEqual(['Bore da.', 'Sut wyt ti?'])
    expect(wrapper.text()).toContain('✓ PROOFREAD')
  })
})

describe('proofreading view: the filter says it is on, with counts', () => {
  it('shows To do / Done / All counts and a filtered-view banner', async () => {
    const wrapper = await mountPage()
    const labels = wrapper.findAll('button').map(b => b.text())
    expect(labels).toContain('To do 2')
    expect(labels).toContain('Done 0')
    expect(labels).toContain('All 3')
    expect(wrapper.text()).toContain('Filtered view.')
    expect(wrapper.text()).toContain('2 of 3 lines in this pod')
  })

  it('All shows every line, including the scene-17 ones the filter hid', async () => {
    const wrapper = await mountPage()
    await wrapper.findAll('button').find(b => b.text() === 'All 3').trigger('click')
    expect(rowText(wrapper)).toEqual(['Bore da.', 'Sut wyt ti?', 'Dw i wedi brifo.'])
    expect(wrapper.text()).not.toContain('Filtered view.')
  })
})
