// @vitest-environment jsdom
// Job #392 (Aran 2026-10-14): one booth page with a tab per voice. Proves: a one-voice artist sees
// no tab bar; with two voices the tabs appear, switching moves the address to the other voice's
// /r/ link, each booth is kept alive with its own state, and coming back restores the batch it was
// in. The booth itself (RecordistRoom) is stubbed: this page must not change how it records.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { createRouter, createMemoryHistory, RouterView } from 'vue-router'

// Each test is a fresh visit: the booth remembers its line cursor in localStorage per voice
// and batch (booth-cursor.js), and one test's cursor must not open the next test's Start.
beforeEach(() => { if (typeof localStorage === 'undefined') return; for (const k of Object.keys(localStorage)) if (k.startsWith('recordist.cursor.')) localStorage.removeItem(k) })

const mounts = []
vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ getAccessToken: async () => 'signed-in-admin-token' }),
}))
vi.mock('./RecordistRoom.vue', () => ({
  default: defineComponent({
    name: 'RecordistRoom',
    props: { voiceId: String },
    emits: ['phase'],
    setup(props) {
      const taps = ref(0)
      mounts.push(props.voiceId)
      return () => h('div', { class: 'room', 'data-voice': props.voiceId }, [
        h('button', { class: 'tap', onClick: () => { taps.value += 1 } }, `${props.voiceId}:${taps.value}`),
      ])
    },
  }),
}))
vi.mock('@/services/recordingApi', () => ({
  recordingApiBase: () => '',
  withBoothKey: (u) => u,
  rememberBoothKey: vi.fn(),
}))

const TABS = [
  { voiceId: 'human_aran_cym_n', language: 'cym', languageName: 'Welsh', dialect: 'north', displayName: 'Aran', boothKey: null },
  { voiceId: 'human_aran_eng', language: 'eng', languageName: 'English', dialect: null, displayName: 'Aran', boothKey: null },
]

async function open(path, tabs) {
  global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ tabs }) }))
  const RecordistBooth = (await import('./RecordistBooth.vue')).default
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/r/:voiceId', name: 'RecordistRoom', component: RecordistBooth, props: true }] })
  router.push(path)
  await router.isReady()
  const wrapper = mount({ render: () => h(RouterView) }, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('RecordistBooth', () => {
  beforeEach(() => { localStorage.clear(); mounts.length = 0 })

  it('presents the signed-in identity when asking which sibling voices may be opened', async () => {
    const { wrapper } = await open('/r/human_aran_cym_n', TABS)
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer signed-in-admin-token')
    wrapper.unmount()
  })

  it('a one-voice artist sees no tabs, only the booth', async () => {
    const { wrapper } = await open('/r/human_dan_cym_s', [{ ...TABS[0], voiceId: 'human_dan_cym_s' }])
    expect(wrapper.find('[data-test="booth-tabs"]').exists()).toBe(false)
    expect(wrapper.find('.room').attributes('data-voice')).toBe('human_dan_cym_s')
  })

  it('switches voices by tab, keeps each booth alive, and puts each back where it was', async () => {
    const { wrapper, router } = await open('/r/human_aran_cym_n', TABS)
    const tabs = wrapper.findAll('.booth-tab')
    expect(tabs.map((t) => t.text())).toEqual(['Cymraeg', 'English'])
    expect(global.fetch.mock.calls[0][0]).toBe('/api/recording/voice/human_aran_cym_n/tabs')

    await router.push({ query: { track: 'seed.x', batch: '2' } })
    await wrapper.find('.tap').trigger('click')
    expect(wrapper.find('.tap').text()).toBe('human_aran_cym_n:1')

    await tabs[1].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/r/human_aran_eng')
    expect(router.currentRoute.value.query).toEqual({})
    expect(wrapper.find('.room').attributes('data-voice')).toBe('human_aran_eng')
    expect(global.fetch).toHaveBeenCalledTimes(1) // a switch inside the set asks nothing

    await wrapper.findAll('.booth-tab')[0].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/r/human_aran_cym_n')
    expect(router.currentRoute.value.query).toEqual({ track: 'seed.x', batch: '2' })
    expect(wrapper.find('.tap').text()).toBe('human_aran_cym_n:1') // the same booth, not a new one
    expect(mounts).toEqual(['human_aran_cym_n', 'human_aran_eng'])
  })

  it('the old English link opens on the English tab', async () => {
    const { wrapper } = await open('/r/human_aran_eng', TABS)
    expect(wrapper.find('.booth-tab.on').text()).toBe('English')
    expect(wrapper.find('.room').attributes('data-voice')).toBe('human_aran_eng')
  })

  it('the language bar steps out while a take is live and returns after (job #421)', async () => {
    const { wrapper } = await open('/r/human_aran_cym_n', TABS)
    const room = wrapper.findComponent({ name: 'RecordistRoom' })
    expect(wrapper.find('[data-test="booth-tabs"]').exists()).toBe(true)
    room.vm.$emit('phase', 'recording')
    await flushPromises()
    expect(wrapper.find('[data-test="booth-tabs"]').exists()).toBe(false)
    room.vm.$emit('phase', 'idle')
    await flushPromises()
    expect(wrapper.find('[data-test="booth-tabs"]').exists()).toBe(true)
  })
})
