// The proofreading page WRAPS a phrase, never clips it. Aran, 2026-09-11: long
// Welsh phrases on the Senedd pod were cut off so he had to open Edit just to
// read them. A proofreader reads the words in place, on a phone.
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const LONG_TARGET = 'Dw i’n meddwl bod y pwyllgor wedi cytuno i ohirio’r drafodaeth tan y cyfarfod nesaf, os ydy hynny’n gyfleus i bawb sydd yma heddiw.'
const LONG_KNOWN = 'I think the committee has agreed to postpone the discussion until the next meeting, if that is convenient for everyone who is here today.'
const SENTENCES = [{ id: 's1', global_order: 1, scene_number: 1, speaker: 'Cadeirydd', target_text: LONG_TARGET, known_text: LONG_KNOWN, target_audio_id: null, known_audio_id: null }]

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { courseCode: 'cym_n_for_eng', slug: 'senedd-s4c-steve' }, query: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    if (String(url).includes('/api/pods/')) return { ok: true, status: 200, json: async () => ({ pod: { id: 'p', title: 'Senedd', slug: 'senedd-s4c-steve' }, sentences: SENTENCES }) }
    return { ok: false, status: 404, json: async () => ({}) }
  }))
})

const CLIPPING = ['truncate', 'overflow-hidden', 'text-ellipsis', 'whitespace-nowrap', 'line-clamp']

describe('phrase text is readable in place', () => {
  it('neither the target nor the known line carries a clipping class', async () => {
    const { default: PodDetailView } = await import('./PodDetailView.vue')
    const wrapper = mount(PodDetailView, { props: { courseCode: 'cym_n_for_eng', slug: 'senedd-s4c-steve' }, global: { stubs: { RouterLink: true, 'router-link': true } } })
    await flushPromises()
    const target = wrapper.find('.row-sep .phrase-target')
    const known = wrapper.find('.row-sep .phrase-known')
    expect(target.exists()).toBe(true)
    expect(target.text()).toBe(LONG_TARGET)
    expect(known.text()).toBe(LONG_KNOWN)
    for (const el of [target, known]) {
      const cls = el.classes()
      for (const bad of CLIPPING) expect(cls.some(c => c.includes(bad)), `${bad} on ${cls.join(' ')}`).toBe(false)
      expect(cls).toContain('whitespace-normal')
      expect(cls).toContain('break-words')
    }
  })
})
