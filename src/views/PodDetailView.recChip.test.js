// Pod detail — whose line is this? (Aran, 2026-09-10)
//
// Aran read this page as a wall of outstanding lines and reasonably took them
// for his own work. They were not: of the 91 post-Croatia lines in
// cym_n_for_eng:pod-1, 12 are his and all 12 are recorded; the other 79 belong
// to the single character "Learner", cast to Catrin. His own booth is filtered
// to his cast and never carried him there, correctly. This page is not
// filtered, and it said nothing at all — a bare em-dash — about who each
// outstanding line was waiting on.
//
// So the rule under test is one sentence: an unrecorded line names the person
// cast to read it. The fixture is the real shape — real characters, the real
// cast keys, the real coverage payload.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const SENTENCES = [
  // Catrin's, unrecorded — the post-Croatia block Aran misread as his.
  { id: 's-learner', global_order: 141, scene_number: 15, speaker: 'Learner',
    target_text: 'dw i eisiau siarad Cymraeg', known_text: 'I want to speak Welsh',
    target_audio_id: null, known_audio_id: null },
  // Aran's, unrecorded, and his label carries the paren decoration the cast is
  // NOT keyed by — "Dyn (M)" must still resolve to the "Dyn" entry.
  { id: 's-dyn', global_order: 142, scene_number: 15, speaker: 'Dyn (M)',
    target_text: 'bore da', known_text: 'good morning',
    target_audio_id: null, known_audio_id: null },
  // A character nobody is cast to. There is no name to give, so the dash stays.
  { id: 's-uncast', global_order: 143, scene_number: 15, speaker: 'Narrator',
    target_text: 'diwedd', known_text: 'the end',
    target_audio_id: null, known_audio_id: null },
  // Recorded: the chip goes on naming the VOICE ON THE CLIP, unchanged.
  { id: 's-done', global_order: 144, scene_number: 15, speaker: 'Dyn (M)',
    target_text: 'nos da', known_text: 'good night',
    target_audio_id: 'a-1', known_audio_id: null },
  // RECORDED BY ARAN, SINCE RECAST TO CATRIN. 29 of this pod's real lines are
  // this shape (Tom, 2026-09-10) and the chip could not say it: it named the
  // voice on the clip and stopped, so a line he has handed on read exactly like
  // one he still owns.
  { id: 's-recast', global_order: 145, scene_number: 15, speaker: 'Learner',
    target_text: 'diolch yn fawr', known_text: 'thank you very much',
    target_audio_id: 'a-2', known_audio_id: null },
]

const COVERAGE = {
  voices: [{ voiceId: 'human_aran_cym_n', name: 'Aran' }],
  pods: [{
    podId: 'cym_n_for_eng:pod-1',
    sentences: [
      { sentenceId: 's-learner', kinds: { target: { origin: null, recorded: false, voiceId: null } } },
      { sentenceId: 's-dyn', kinds: { target: { origin: null, recorded: false, voiceId: null } } },
      { sentenceId: 's-uncast', kinds: { target: { origin: null, recorded: false, voiceId: null } } },
      { sentenceId: 's-done', kinds: { target: { origin: 'human', recorded: true, voiceId: 'human_aran_cym_n' } } },
      { sentenceId: 's-recast', kinds: { target: { origin: 'human', recorded: true, voiceId: 'human_aran_cym_n' } } },
    ],
  }],
}

// courses.voice_config.podCast, in the shape the cast endpoint serves it.
const CAST = {
  podCast: {
    Learner: { voiceId: 'human_catrinlliar_cym_n', name: 'Catrin', gender: 'f' },
    Dyn: { voiceId: 'human_aran_cym_n', name: 'Aran', gender: 'm' },
    __explainer__: { voiceId: 'human_steve_eng', name: 'Steve' },
  },
}

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { courseCode: 'cym_n_for_eng', slug: 'pod-1' }, query: {} }),
}))
vi.mock('@/composables/useAuth.js', () => ({
  useAuth: () => ({ isAdmin: { value: true }, getAccessToken: async () => 'token' }),
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
      return {
        ok: true,
        json: async () => ({
          pod: {
            id: 'cym_n_for_eng:pod-1',
            slug: 'pod-1',
            title: 'Northern Welsh (colloquial Gogledd Cymru Welsh) Listening Pods — Pod 1',
            speakers: { Learner: {}, Dyn: {}, Narrator: {} },
          },
          sentences: SENTENCES,
        }),
      }
    }
    if (u.includes('/pods/coverage')) return { ok: true, json: async () => COVERAGE }
    if (u.includes('/pods/cast')) return { ok: true, json: async () => CAST }
    return { ok: false, status: 404, json: async () => ({}) }
  })
})

async function mountView() {
  const wrapper = mount(PodDetailView, {
    global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } },
  })
  await flushPromises()
  await flushPromises()
  return wrapper
}

/** The status chip on one sentence row, by the title the row's text gives it. */
function chipFor(wrapper, targetText) {
  const row = wrapper.findAll('.row-sep').find((r) => r.text().includes(targetText))
  if (!row) return null
  const chip = row.findAll('span').find((s) => s.classes().includes('whitespace-nowrap'))
  return chip || null
}

describe('PodDetailView — an outstanding line says whose it is', () => {
  it('names Catrin on the line cast to Catrin', async () => {
    const chip = chipFor(await mountView(), 'dw i eisiau siarad Cymraeg')
    expect(chip.text()).toBe('Catrin to read')
  })

  it('resolves a speaker label carrying a gender marker — "Dyn (M)" is the "Dyn" entry', async () => {
    const chip = chipFor(await mountView(), 'bore da')
    expect(chip.text()).toBe('Aran to read')
  })

  it('keeps the bare dash only where there is genuinely no name to give', async () => {
    const chip = chipFor(await mountView(), 'diwedd')
    expect(chip.text()).toBe('—')
  })

  it('leaves a recorded line naming the voice on the clip', async () => {
    const chip = chipFor(await mountView(), 'nos da')
    expect(chip.text()).toBe('Aran')
  })

  it('says it in the tooltip too, where the per-track detail lives', async () => {
    const chip = chipFor(await mountView(), 'dw i eisiau siarad Cymraeg')
    expect(chip.attributes('title')).toBe('target: not recorded — Catrin to read')
  })
})

describe('PodDetailView — the pod is called Pod 1', () => {
  // It is now called that all the way down. The display shim that read a `pod-0`
  // row as "Pod 1" is still live for the 44 courses the 2026-08-22 switchover has
  // not reached, but this pod no longer needs it: the slug itself says pod-1 since
  // the re-slug of 2026-09-10, so the heading and the identifier agree without a
  // translation layer between them.
  it('shows the product name in the heading and the identifier agrees with it', async () => {
    const wrapper = await mountView()
    const heading = wrapper.find('h1').text()
    expect(heading).toContain('Pod 1')
    expect(heading).not.toContain('Pod 0')
    expect(wrapper.text()).toContain('cym_n_for_eng:pod-1')
    expect(wrapper.text()).not.toContain('cym_n_for_eng:pod-0')
  })
})

describe('a line recorded by one reader and since cast to another', () => {
  it('says both, so a recast cannot read as work he failed to do', async () => {
    const w = await mountView()
    const chip = chipFor(w, 'diolch yn fawr')
    // The reader who MADE the take, then the reader the line belongs to now.
    expect(chip.text()).toBe('Aran → Catrin')
    expect(chip.attributes('title')).toContain('recorded by Aran, now cast to Catrin')
  })

  it('leaves an ordinary recorded line exactly as it was', async () => {
    const w = await mountView()
    // Still Aran's line, still recorded by Aran: nothing new to say.
    expect(chipFor(w, 'nos da').text()).toBe('Aran')
  })
})
