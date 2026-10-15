// Script viewer: the page must SET UP. Job #804 shipped a `watch(..., {immediate:true})`
// that read `authUser` hundreds of lines before `useAuth()` declared it — a TDZ
// ReferenceError at setup, so the page never rendered for anyone. Helper tests
// (review-place, regen-request) could not see it; only mounting the component can.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

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

beforeEach(() => {
  localStorage.clear()
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({}), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  }))
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
})
