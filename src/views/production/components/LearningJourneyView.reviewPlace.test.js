// A REVIEWER'S PLACE IS A LEGO, NOT A ROUND NUMBER (job #804, Kai 15 Oct). Round numbers shift
// after edits and the nightly round-index rebuild; Deborah kept losing her place in deu_for_eng.
// Each round row says its seed in words, and opening or playing a round tells the parent its
// LEGO so the Script Viewer can offer "Continue where you left off".
//
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LearningJourneyView from './LearningJourneyView.vue'

const round = (roundNumber, legoId) => ({
  roundNumber, legoId, legoIndex: 2, seedId: legoId.slice(0, 5), legoType: 'M', isNew: true,
  items: [{ id: `${legoId}-intro`, type: 'intro', legoId, knownText: 'to arrive', targetText: 'ankommen' }],
  spacedRepReviews: [], itemCount: 1,
})
const ROUNDS = [round(318, 'S0566L01'), round(319, 'S0567L02')]
const mountView = () => mount(LearningJourneyView, {
  props: { rounds: ROUNDS, allItems: ROUNDS.flatMap(r => r.items), stats: null, courseCode: 'deu_for_eng', isLoading: false },
})

describe('LearningJourneyView — the reviewer’s place', () => {
  it('says each round’s seed in words beside its number', () => {
    const seeds = mountView().findAll('[data-test="round-seed"]').map(s => s.text())
    expect(seeds).toEqual(['seed 566', 'seed 567'])
  })
  it('opening a round reports its LEGO; closing it again does not', async () => {
    const w = mountView()
    const header = w.findAll('.round-header')[1]
    await header.trigger('click')
    expect(w.emitted('round-open')).toEqual([['S0567L02']])
    await header.trigger('click')
    expect(w.emitted('round-open')).toHaveLength(1)
  })
})
