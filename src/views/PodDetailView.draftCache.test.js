// Aran's report, 2026-09-16: DRAFT — AWAITING PROOFREAD tags briefly vanish
// when he returns to the tab. main.js reloads the whole page on a version
// mismatch on every tab return, which re-mounts this component from a clean
// JS state; draftIds started life as an empty Set() and was only filled once
// loadDrafts()'s fetch (behind a fresh access token) resolved, so every
// re-mount rendered every row with no badge for that window. sessionStorage
// now carries the last-known draft set across the remount.
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const SENTENCES = [
  { id: 's1', global_order: 1, scene_number: 1, speaker: 'Tom', target_text: 'Bore da.', known_text: 'Good morning.', target_audio_id: null, known_audio_id: null },
]

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { courseCode: 'cym_n_for_eng', slug: 'health' }, query: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))
vi.mock('../lib/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } } }))

let draftsResolve
beforeEach(() => {
  sessionStorage.clear()
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    if (String(url).includes('/api/pods/')) {
      return { ok: true, status: 200, json: async () => ({ pod: { id: 'cym_n_for_eng:health', title: 'Health', slug: 'health', visibility: 'live' }, sentences: SENTENCES.map((s) => ({ ...s })) }) }
    }
    if (String(url).includes('/pods/drafts')) {
      // Never resolves within the test — stands in for the slow post-resume
      // fetch (fresh token + mobile network) that left the badges absent.
      return new Promise((resolve) => { draftsResolve = resolve })
    }
    if (String(url).includes('/pods/coverage')) return { ok: true, status: 200, json: async () => ({ items: [] }) }
    return { ok: false, status: 404, json: async () => ({}) }
  }))
})

async function mountPage() {
  const { default: PodDetailView } = await import('./PodDetailView.vue')
  const wrapper = mount(PodDetailView, { props: { courseCode: 'cym_n_for_eng', slug: 'health' }, global: { stubs: { RouterLink: true, 'router-link': true } } })
  await flushPromises()
  return wrapper
}

describe('draft badge survives a remount while the drafts fetch is still in flight', () => {
  it('shows the DRAFT badge immediately from the cached set, before loadDrafts resolves', async () => {
    sessionStorage.setItem('podDraftIds:cym_n_for_eng:health', JSON.stringify(['s1']))
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('DRAFT — AWAITING PROOFREAD')
    draftsResolve({ ok: true, status: 200, json: async () => ({ items: [{ id: 's1', podId: 'cym_n_for_eng:health' }] }) })
  })
})
