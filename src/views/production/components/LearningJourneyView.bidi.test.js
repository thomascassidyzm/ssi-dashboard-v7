// @vitest-environment jsdom
/**
 * Deborah (SSi's human course checker) reported the `!` on the wrong side of
 * Arabic AGAIN in September 2026 — after the August bidi pass had supposedly
 * fixed it. It had, everywhere except the one surface she actually reads: the
 * Learning Journey (Rounds) view, where a spaced-review row concatenates the
 * known and target strings into ONE LTR label:
 *
 *     {{ item.known_text }} → {{ item.target_text }}
 *
 * That is the worst shape for this bug. `!` (U+0021, bidi class ON) is a
 * NEUTRAL: a trailing neutral resolves against the surrounding paragraph
 * direction, so inside an LTR label it is pushed to the visual RIGHT of the
 * Arabic run — against the sentence's first word instead of its last. `؟`
 * (U+061F, class AL) is strongly RTL and lands correctly with no help at all,
 * which is exactly why Deborah saw `?` behave and `!` misbehave, and why a
 * passing `؟` proves nothing.
 *
 * The stored text is CORRECT — the mark is the last codepoint in the string.
 * Only the display was wrong, so the assertion is on the `dir` attribute of the
 * element that paints each run, never on `text-align` (which moves the block
 * but still resolves the neutral against the wrong direction).
 *
 * Both sides are asserted: `eng_for_ara` is Arabic-KNOWN, so the known run
 * needs its own direction too.
 *
 * Fixture is the real ara_lb_for_eng row S0001L04U05.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LearningJourneyView from './LearningJourneyView.vue'

const ARABIC = 'بدي أحكي عربي، معك!'
const ENGLISH = 'I want to speak Arabic, with you!'

const item = {
  roundNumber: 1,
  legoId: 'S0001L04',
  legoIndex: 4,
  seedId: 'S0001',
  type: 'review',
  reviewItemKind: 'basket',
  reviewOf: 4,
  known_text: ENGLISH,
  target_text: ARABIC,
  hasAudio: true,
  drawCount: 1,
  basketSize: 1,
  basket: [{ known_text: ENGLISH, target_text: ARABIC, hasAudio: true }],
}

const round = {
  roundNumber: 1,
  legoId: 'S0001L04',
  legoIndex: 4,
  seedId: 'S0001',
  legoType: 'lego',
  isNew: true,
  items: [item],
  spacedRepReviews: [],
  itemCount: 1,
}

async function mountExpanded() {
  const wrapper = mount(LearningJourneyView, {
    props: { rounds: [round], allItems: [item], stats: null, courseCode: 'ara_lb_for_eng', hideControls: true },
    global: { stubs: { Transition: false, RouterLink: true } },
  })
  // The rows live behind the round's expand toggle.
  await wrapper.find('.round-card').trigger('click')
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('LearningJourneyView — the spaced-review row Deborah reads', () => {
  it('paints the Arabic target run with dir="rtl", so a trailing "!" lands at the end', async () => {
    const wrapper = await mountExpanded()
    const spans = wrapper.findAll('.basket-slot span')
    const target = spans.find(s => s.text() === ARABIC)
    expect(target, 'the review row must paint the target string in its own element').toBeTruthy()
    expect(target.attributes('dir')).toBe('rtl')
  })

  it('isolates the target run, so it cannot be reordered by the English around it', async () => {
    const wrapper = await mountExpanded()
    const target = wrapper.findAll('.basket-slot span').find(s => s.text() === ARABIC)
    expect(target.classes()).toContain('bidi-isolate')
  })

  it('gives the KNOWN run its own direction too — eng_for_ara is Arabic-known', async () => {
    const wrapper = await mountExpanded()
    const known = wrapper.findAll('.basket-slot span').find(s => s.text() === ENGLISH)
    expect(known, 'the review row must paint the known string in its own element').toBeTruthy()
    expect(known.attributes('dir')).toBe('ltr')
    expect(known.classes()).toContain('bidi-isolate')
  })
})
