// Script viewer: the page must SET UP. Job #804 shipped a `watch(..., {immediate:true})`
// that read `authUser` hundreds of lines before `useAuth()` declared it — a TDZ
// ReferenceError at setup, so the page never rendered for anyone. Helper tests
// (review-place, regen-request) could not see it; only mounting the component can.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { ref, defineComponent, h } from 'vue'

vi.mock('@/services/api', () => ({ getApiUrl: () => 'http://api.test' }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { courseCode: 'fra_for_eng' }, query: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))
vi.mock('@/composables/useAuth.js', () => ({
  useAuth: () => ({
    user: ref({ email: 'deborah@example.com' }),
    getAccessToken: async () => 'tok',
  }),
}))

import ScriptViewer from './ScriptViewer.vue'

const json = (body) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
const ROUNDS = [{ legoId: 'S0566L01', roundNumber: 2 }, { legoId: 'S0567L02', roundNumber: 3 }]
beforeEach(() => {
  localStorage.clear()
  globalThis.fetch = vi.fn(async (url) => {
    const u = String(url)
    if (u.includes('/learning-journey/search')) return json({ rounds: ROUNDS })
    if (u.includes('/learning-journey')) return json({ rounds: ROUNDS, allItems: [], totalLegoCount: 10 })
    return json({})
  })
})

// Stands in for LearningJourneyView: renders a marker and exposes scrollToRound like the real one.
const scrolled = []
const JourneyStub = defineComponent({
  name: 'LearningJourneyView',
  setup(_, { expose }) {
    expose({ scrollToRound: async (n) => { scrolled.push(n); return true } })
    return () => h('div', { 'data-test': 'journey' })
  },
})

describe('ScriptViewer setup', () => {
  it('mounts without throwing', async () => {
    const errors = []
    const wrapper = shallowMount(ScriptViewer, {
      global: { config: { errorHandler: (e) => errors.push(e) } },
    })
    await flushPromises()
    expect(errors.filter(e => /before initialization/.test(String(e?.message)))).toEqual([])
    expect(wrapper.exists()).toBe(true)
  })

  it('offers the place this reviewer left off', async () => {
    const { savePlace } = await import('./review-place.js')
    savePlace('deborah@example.com', 'fra_for_eng', 'S0567L02')
    const wrapper = shallowMount(ScriptViewer)
    await flushPromises()
    expect(wrapper.text()).toContain('567')
  })

  it('the resume banner and the journey show together, and Continue scrolls to that LEGO\'s round (job #812)', async () => {
    const { savePlace } = await import('./review-place.js')
    savePlace('deborah@example.com', 'fra_for_eng', 'S0567L02')
    scrolled.length = 0
    const wrapper = shallowMount(ScriptViewer, { global: { stubs: { LearningJourneyView: JourneyStub } } })
    await flushPromises()
    expect(wrapper.find('[data-test="resume-place"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="journey"]').exists()).toBe(true)
    await wrapper.find('[data-test="resume-continue"]').trigger('click')
    await flushPromises()
    expect(scrolled).toContain(3)
    expect(wrapper.find('[data-test="resume-place"]').exists()).toBe(false)
  })
})
