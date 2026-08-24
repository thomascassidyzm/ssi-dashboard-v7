// Pod detail — bidi rendering of the sentence list (A-157).
//
// This is the screen Deborah, SSi's native Lebanese-Arabic reviewer, actually
// reads, and the screen her 2026-08-17 report was about: "Is `!` still placed
// on the wrong side in Arabic (appearing right, like English, should be
// left/end-of-sentence)?" — with `؟` confirmed FINE. That asymmetry is the
// diagnosis: `؟` U+061F is bidi class AL (strong RTL) and joins the Arabic run
// whatever the paragraph direction; `!` U+0021 is class ON (neutral) and a
// trailing neutral inherits the PARAGRAPH direction, so an LTR paragraph pushes
// it to the visual right.
//
// The stored text is CORRECT — the fixture rows below are verbatim Supabase
// rows with the mark at the logical end. Only the display was wrong, so the
// honest test mounts the real component against real rows and reads the `dir`
// the DOM ended up with.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// Real ara_lb_for_eng rows, copied out of Supabase 2026-08-18. Not invented
// Arabic — these are the exact strings the pod serves.
const ARA_EXCLAMATION = 'أحكي عربي هلق!'
const ARA_COMMA = 'بدي أحكي عربي، معك!'
const ARA_FULL_STOP = 'بدي أحكي معك عربي هلق.'

const SENTENCES = [
  {
    id: 'sent-1',
    global_order: 1,
    scene_number: 1,
    speaker: 'Rania',
    target_text: ARA_EXCLAMATION,
    known_text: 'speak Arabic now!',
    target_audio_id: null,
    known_audio_id: null,
  },
  {
    id: 'sent-2',
    global_order: 2,
    scene_number: 1,
    speaker: 'Karim',
    target_text: ARA_COMMA,
    known_text: 'I want to speak Arabic, with you!',
    target_audio_id: null,
    known_audio_id: null,
  },
  {
    id: 'sent-3',
    global_order: 3,
    scene_number: 1,
    speaker: 'Rania',
    target_text: ARA_FULL_STOP,
    known_text: 'I want to speak Arabic with you now.',
    target_audio_id: null,
    known_audio_id: null,
  },
]

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { courseCode: 'ara_lb_for_eng', slug: 'pod-0' }, query: {} }),
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

// Only the pod endpoint needs to answer; the drafts / coverage / cast calls the
// page also fires are caught by the component and left as empty state.
beforeEach(() => {
  global.fetch = vi.fn(async (url) => {
    if (String(url).includes('/api/pods/ara_lb_for_eng/pod-0')) {
      return {
        ok: true,
        json: async () => ({ pod: { id: 'pod-0', title: 'Pod 0', slug: 'pod-0' }, sentences: SENTENCES }),
      }
    }
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

// The target line and the known line under it, by the class pairs unique to
// each — `.text-ink` alone also catches the ✎ button, and `.text-faint.text-xs`
// alone also catches the order number.
const targetLines = (wrapper) => wrapper.findAll('.row-sep .text-ink.truncate')
const knownLines = (wrapper) => wrapper.findAll('.row-sep .text-faint.text-xs.truncate')

describe('PodDetailView — the sentence list Deborah reads', () => {
  it('renders the real Arabic rows', async () => {
    const lines = targetLines(await mountView())
    expect(lines.map((n) => n.text())).toEqual([
      ARA_EXCLAMATION,
      ARA_COMMA,
      ARA_FULL_STOP,
    ])
  })

  it('marks every Arabic target line rtl, so the trailing `!` lands at the end', async () => {
    const lines = targetLines(await mountView())
    expect(lines[0].attributes('dir')).toBe('rtl')
    expect(lines[1].attributes('dir')).toBe('rtl')
  })

  it('marks the full-stop row rtl too — `.` is a neutral like `!`', async () => {
    // Mixed-script strings (an Arabic line opening on a Latin loanword) are
    // where `dir="auto"` guesses wrong; that case is covered at the unit level
    // in src/utils/textDirection.test.js rather than fabricated Arabic here.
    const lines = targetLines(await mountView())
    expect(lines[2].attributes('dir')).toBe('rtl')
    expect(lines[2].text()).toBe(ARA_FULL_STOP)
  })

  it('leaves the known (English) line ltr — the known side must not flip', async () => {
    const wrapper = await mountView()
    const known = knownLines(wrapper)
    expect(known[0].text()).toBe('speak Arabic now!')
    expect(known[0].attributes('dir')).toBeUndefined()
  })

  it('does not leave the stored string reordered — display only, never content', async () => {
    const lines = targetLines(await mountView())
    // The mark is stored at the logical END and stays there. Nothing in this
    // fix may move a character.
    expect(lines[0].text().endsWith('!')).toBe(true)
    expect(lines[0].text()).toBe(ARA_EXCLAMATION)
  })

  it('isolates the target line so the row around it cannot capture the neutral', async () => {
    expect(targetLines(await mountView())[0].classes()).toContain('bidi-isolate')
  })

  it('pins alignment, so directing the line does not restyle the page', async () => {
    expect(targetLines(await mountView())[0].classes()).toContain('text-left')
  })

  it('does not direct any container — navigation and layout stay ltr', async () => {
    const wrapper = await mountView()
    const directed = wrapper.findAll('[dir]')
    expect(directed.length).toBeGreaterThan(0)
    for (const el of directed) {
      // Every directed element is a leaf text run, never a wrapper.
      expect(el.findAll('.row-sep').length).toBe(0)
    }
  })

  it('directs the edit textarea from its content, not from a first-strong guess', async () => {
    const wrapper = await mountView()
    await wrapper.findAll('button[title="Edit target / known text"]')[0].trigger('click')
    const target = wrapper.get('textarea[placeholder="target"]')
    expect(target.attributes('dir')).toBe('rtl')
    const known = wrapper.get('textarea[placeholder="known / translation"]')
    expect(known.attributes('dir')).toBeUndefined()
  })
})
