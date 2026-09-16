// Pod detail — the way into the booth is at the top (Aran, 2026-09-11)
//
// From https://popty.app/production/cym_n_for_eng/pods/pod-1: "I'm not now
// seeing a way to open my recording tool" — he went back up to the pods page
// and found the cast tab. The rule under test: every human voice cast on the
// pod gets a link to its own booth (/r/<voiceId>), and it sits under the title,
// above the hold panel, not at the bottom of the page.
//
// Aran again, 2026-09-16, on https://popty.app/production/cym_n_for_eng/pods/
// health-ladder-pilot — a pod with NO characters cast, read solo: "feels
// counter-intuitive that in there is no way I can see to start a recording
// session". So the door keys off WHO IS LOOKING and the pod's declared readers,
// never off the pod's character list.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const SENTENCES = [
  { id: 's-1', global_order: 1, scene_number: 1, speaker: 'Learner',
    target_text: 'dw i eisiau siarad Cymraeg', known_text: 'I want to speak Welsh',
    target_audio_id: null, known_audio_id: null },
  { id: 's-2', global_order: 2, scene_number: 1, speaker: 'Dyn',
    target_text: 'bore da', known_text: 'good morning',
    target_audio_id: null, known_audio_id: null },
]
const CAST = {
  podCast: {
    Learner: { voiceId: 'human_catrinlliar_cym_n', name: 'Catrin', gender: 'f' },
    Dyn: { voiceId: 'human_aran_cym_n', name: 'Aran', gender: 'm' },
  },
}

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { courseCode: 'cym_n_for_eng', slug: 'pod-1' }, query: {} }),
}))
// Who is looking decides whose links show (Tom, 2026-09-12: an artist never
// sees another artist's link). `viewer` is flipped per test.
const viewer = vi.hoisted(() => ({ editor: true, casting: [] }))
vi.mock('@/composables/useAuth.js', () => ({
  useAuth: () => ({
    isAdmin: { value: viewer.editor },
    isEditorOf: () => viewer.editor,
    dashboardUser: { value: { casting: viewer.casting } },
    getAccessToken: async () => 'token',
  }),
}))
vi.mock('@/composables/useCourses.js', () => ({
  useCourses: () => ({ getCourseName: (c) => c }),
  getLanguageName: (code) => code,
}))
vi.mock('@/services/api.js', () => ({ getApiUrl: () => 'http://api.test' }))

import PodDetailView from './PodDetailView.vue'

beforeEach(() => {
  global.fetch = vi.fn(async (url) => {
    const u = String(url)
    if (u.includes('/api/pods/cym_n_for_eng/pod-1')) {
      return { ok: true, json: async () => ({
        pod: { id: 'cym_n_for_eng:pod-1', slug: 'pod-1', title: 'Pod 1', speakers: { Learner: {}, Dyn: {} } },
        sentences: SENTENCES,
      }) }
    }
    if (u.includes('/pods/coverage')) return { ok: true, json: async () => ({ voices: [], pods: [] }) }
    if (u.includes('/pods/cast')) return { ok: true, json: async () => CAST }
    return { ok: false, status: 404, json: async () => ({}) }
  })
})

async function mountView() {
  const wrapper = mount(PodDetailView, {
    global: { stubs: { 'router-link': { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  })
  await flushPromises()
  await flushPromises()
  return wrapper
}

describe('PodDetailView — the booth is one tap from the top of the pod page', () => {
  it('links each cast voice to its own booth, scoped to this course, for the editor', async () => {
    viewer.editor = true
    const links = (await mountView()).findAll('.record-link')
    expect(links.map(l => l.attributes('href')).sort()).toEqual([
      '/r/human_aran_cym_n?course=cym_n_for_eng&pod=pod-1',
      '/r/human_catrinlliar_cym_n?course=cym_n_for_eng&pod=pod-1',
    ])
    expect(links.map(l => l.text()).join(' ')).toContain('Aran')
  })

  it('a cast artist sees their own link and nobody else’s', async () => {
    viewer.editor = false
    viewer.casting = [{ courseCode: 'cym_n_for_eng', voiceId: 'human_aran_cym_n' }]
    const links = (await mountView()).findAll('.record-link')
    expect(links.map(l => l.attributes('href'))).toEqual(['/r/human_aran_cym_n?course=cym_n_for_eng&pod=pod-1'])
    viewer.editor = true
    viewer.casting = []
  })

  it('puts the links above the hold panel, not at the foot of the page', async () => {
    const html = (await mountView()).html()
    expect(html.indexOf('record-links')).toBeGreaterThan(-1)
    expect(html.indexOf('record-links')).toBeLessThan(html.indexOf('Held back'))
  })
})

// A POD WITH NO CHARACTERS AT ALL — the health-ladder pilot after its two
// characters come off it (2026-09-16). pod.speakers is empty, the character cast
// resolves to nothing, and the door must still be there.
describe('PodDetailView — a solo-read pod still has a door', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (url) => {
      const u = String(url)
      if (u.includes('/api/pods/cym_n_for_eng/pod-1')) {
        return { ok: true, json: async () => ({
          pod: {
            id: 'cym_n_for_eng:pod-1', slug: 'pod-1', title: 'Health ladder pilot',
            speakers: {},
            metadata: { solo_readers: ['human_aran_cym_n', 'human_catrinlliar_cym_n'] },
          },
          sentences: SENTENCES,
        }) }
      }
      if (u.includes('/pods/coverage')) return { ok: true, json: async () => ({ voices: [], pods: [] }) }
      if (u.includes('/pods/cast')) return { ok: true, json: async () => ({ podCast: {}, rosterVoices: [
        { voiceId: 'human_aran_cym_n', name: 'Aran' },
        { voiceId: 'human_catrinlliar_cym_n', name: 'Catrin' },
      ] }) }
      return { ok: false, status: 404, json: async () => ({}) }
    })
  })

  it('gives a cast artist one button into their own booth, scoped to this pod', async () => {
    viewer.editor = false
    viewer.casting = [{ courseCode: 'cym_n_for_eng', voiceId: 'human_aran_cym_n', displayName: 'Aran' }]
    const links = (await mountView()).findAll('.record-link')
    expect(links).toHaveLength(1)
    expect(links[0].attributes('href')).toBe('/r/human_aran_cym_n?course=cym_n_for_eng&pod=pod-1')
    expect(links[0].text()).toContain('Record your lines')
    viewer.editor = true
    viewer.casting = []
  })

  it("names the pod's declared solo readers to an editor, with a way into each", async () => {
    viewer.editor = true
    viewer.casting = []
    const wrapper = await mountView()
    expect(wrapper.text()).toContain('Recorded by Aran and Catrin')
    expect(wrapper.findAll('.record-link').map(l => l.attributes('href')).sort()).toEqual([
      '/r/human_aran_cym_n?course=cym_n_for_eng&pod=pod-1',
      '/r/human_catrinlliar_cym_n?course=cym_n_for_eng&pod=pod-1',
    ])
  })

  it('shows a stranger who records it and no links at all', async () => {
    viewer.editor = false
    viewer.casting = []
    const wrapper = await mountView()
    expect(wrapper.text()).toContain('Recorded by Aran and Catrin')
    expect(wrapper.findAll('.record-link')).toHaveLength(0)
    viewer.editor = true
  })
})
