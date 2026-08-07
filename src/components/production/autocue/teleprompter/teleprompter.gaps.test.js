// @vitest-environment jsdom
/**
 * Guards the two things a live recordist reads off the autocue:
 *  1. natural-speed text is white, slow-speed text is amber (the script-loaded
 *     screen promises exactly this);
 *  2. the slow pass shows pause markers between LEGO chunks in script mode,
 *     not just in the legacy two-pass mode.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PhraseCard from './PhraseCard.vue'
import TeleprompterDisplay from './TeleprompterDisplay.vue'

const natural = { id: 'n', text: 'dw i eisiau siarad', cadence: 'natural', chunksString: 'dw i|eisiau|siarad' }
const slow = { id: 's', text: 'dw i eisiau siarad', cadence: 'slow', chunksString: 'dw i|eisiau|siarad' }

describe('PhraseCard colour', () => {
  it('does not paint the current natural-speed phrase with the slow-cadence class', () => {
    const w = mount(PhraseCard, { props: { phrase: natural, state: 'current' } })
    expect(w.find('.phrase-text').classes()).not.toContain('slow-cadence')
  })

  it('marks the slow phrase with the amber slow-cadence class', () => {
    const w = mount(PhraseCard, { props: { phrase: slow, state: 'current' } })
    expect(w.find('.phrase-text, .phrase-with-gaps').classes()).toContain('slow-cadence')
  })
})

describe('pause markers', () => {
  it('renders one gap marker between each chunk when gaps are on', () => {
    const w = mount(PhraseCard, { props: { phrase: slow, state: 'current', showGaps: true } })
    expect(w.findAll('.chunk-segment').map(c => c.text())).toEqual(['dw i', 'eisiau', 'siarad'])
    expect(w.findAll('.gap-marker')).toHaveLength(2)
  })

  it('shows gaps on the slow item and not the natural one in script mode', () => {
    const w = mount(TeleprompterDisplay, {
      props: { phrases: [natural, slow], currentIndex: 1, scriptMode: true }
    })
    const cards = w.findAllComponents(PhraseCard)
    expect(cards[0].findAll('.gap-marker')).toHaveLength(0)
    expect(cards[1].findAll('.gap-marker')).toHaveLength(2)
  })
})
