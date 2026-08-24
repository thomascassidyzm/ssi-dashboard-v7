// Teleprompter phrase card — bidi rendering (A-157).
//
// This card is what a recording speaker READS ALOUD, so it is the one place a
// direction bug can walk into an audio take rather than just look wrong. Two
// distinct defects live here, and the chunked view has the worse one:
//
//   1. Plain view — an Arabic line inside an LTR paragraph pushes its trailing
//      NEUTRAL punctuation (`!` `.` `,`, bidi class ON) to the visual right.
//      `؟` U+061F is class AL, strong RTL, and was never affected — Deborah
//      confirmed exactly that asymmetry on 2026-08-17.
//   2. Chunked view — each chunk is its OWN element with a gap marker between
//      chunks, so the order the elements lay out in IS the reading order. Under
//      an LTR container an Arabic phrase renders back-to-front and every pause
//      falls in the wrong place.
//
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PhraseCard from './PhraseCard.vue'

// Real ara_lb_for_eng rows, copied out of Supabase 2026-08-18.
const ARA = 'أحكي عربي هلق!' // known: "speak Arabic now!"
const ARA_COMMA = 'بدي أحكي عربي، معك!' // known: "I want to speak Arabic, with you!"
const ENG = 'I want to speak Arabic with you now.'

const card = (props) => mount(PhraseCard, { props })

describe('PhraseCard — the line a speaker reads aloud', () => {
  it('marks an Arabic phrase rtl', () => {
    const text = card({ phrase: { text: ARA } }).get('.phrase-text')
    expect(text.attributes('dir')).toBe('rtl')
    expect(text.text()).toBe(ARA)
  })

  it('marks an English phrase ltr', () => {
    expect(card({ phrase: { text: ENG } }).get('.phrase-text').attributes('dir')).toBe('ltr')
  })

  it('does not move a character of the stored string', () => {
    // Display only. The `!` is stored at the logical end and stays there.
    expect(card({ phrase: { text: ARA } }).get('.phrase-text').text()).toBe(ARA)
  })

  it('directs the CHUNKED view on the container, where chunk order is reading order', () => {
    const wrapper = card({
      phrase: { text: ARA_COMMA, chunks: ['بدي أحكي عربي،', 'معك!'] },
      showGaps: true,
    })
    const gapped = wrapper.get('.phrase-with-gaps')
    expect(gapped.attributes('dir')).toBe('rtl')
    // Chunks stay in logical order in the DOM — the browser mirrors them.
    expect(wrapper.findAll('.chunk-segment').map((c) => c.text())).toEqual([
      'بدي أحكي عربي،',
      'معك!',
    ])
    expect(wrapper.findAll('.gap-marker').length).toBe(1)
  })

  it('leaves an English chunked phrase ltr', () => {
    const wrapper = card({
      phrase: { text: ENG, chunks: ['I want to speak Arabic', 'with you now.'] },
      showGaps: true,
    })
    expect(wrapper.get('.phrase-with-gaps').attributes('dir')).toBe('ltr')
  })

  it('directs the translation line from its own text, not from the phrase', () => {
    const wrapper = card({ phrase: { text: ARA, translation: 'speak Arabic now!' } })
    expect(wrapper.get('.phrase-translation').attributes('dir')).toBe('ltr')
    expect(wrapper.get('.phrase-text').attributes('dir')).toBe('rtl')
  })

  it('does not direct the card itself — no page or container is flipped', () => {
    const wrapper = card({ phrase: { text: ARA } })
    expect(wrapper.get('.phrase-card').attributes('dir')).toBeUndefined()
    expect(wrapper.get('.phrase-content').attributes('dir')).toBeUndefined()
    expect(wrapper.get('.phrase-marker').attributes('dir')).toBeUndefined()
  })

  it('is safe when a phrase has no text yet', () => {
    expect(card({ phrase: {} }).get('.phrase-text').attributes('dir')).toBe('ltr')
  })
})
