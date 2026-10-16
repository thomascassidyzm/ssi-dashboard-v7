// Script Viewer annotation: ALWAYS show the intended course, and flag the rows
// and rounds the live player cannot currently deliver (2026-08-06 ruling).
// Asserted on the rendered rows, because the point of the feature is what a
// reviewer sees — the flagged row must still be there.
//
// The flags come from the generator (learning-script-generator.cjs
// annotatePlayerDelivery); the unit tests for the rules themselves live in
// services/learning-script-generator.test.cjs.
//
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LearningJourneyView from './LearningJourneyView.vue'

const item = (type, extra = {}) => ({
  type,
  legoId: 'S0015L01',
  seedNumber: 15,
  known_text: `known ${type}`,
  target_text: `ziel ${type}`,
  hasAudio: true,
  playerCanDeliver: true,
  ...extra,
})

// R47: the fra_for_eng shape from the systematic diff — S0015L01 has no second
// target voice, so the player emits no round at all and renumbers what follows.
const DROPPED_ROUND = {
  roundNumber: 47,
  legoId: 'S0015L01',
  legoIndex: 1,
  seedId: 'S0015',
  legoType: 'A',
  isNew: true,
  items: [
    item('intro', { playerCanDeliver: false, playerDropReason: 'lego-audio', missingAudioRoles: ['target2'] }),
    item('debut', { playerCanDeliver: false, playerDropReason: 'lego-audio', missingAudioRoles: ['target2'] }),
  ],
  spacedRepReviews: [],
  itemCount: 2,
  playerDelivers: false,
  playerDropReason: 'lego-audio',
  missingAudioRoles: ['target2'],
  playerRoundNumber: null,
  undeliverableItemCount: 2,
}

// R48: the round itself is fine; one BUILD phrase is unvoiced, and one review
// points at the LEGO the player dropped.
const PARTIAL_ROUND = {
  roundNumber: 48,
  legoId: 'S0016L01',
  legoIndex: 1,
  seedId: 'S0016',
  legoType: 'A',
  isNew: true,
  items: [
    item('debut'),
    item('build', {
      known_text: 'the unvoiced one',
      hasAudio: false,
      playerCanDeliver: false,
      playerDropReason: 'phrase-audio',
      missingAudioRoles: ['known', 'target2'],
    }),
    item('review', {
      legoId: 'S0015L01',
      known_text: 'a review that never fires',
      playerCanDeliver: false,
      playerDropReason: 'reviewed-lego-dropped',
      missingAudioRoles: [],
    }),
  ],
  spacedRepReviews: [47],
  itemCount: 3,
  playerDelivers: true,
  playerRoundNumber: 47,
  undeliverableItemCount: 2,
}

const ROUNDS = [DROPPED_ROUND, PARTIAL_ROUND]

function mountView(rounds = ROUNDS, stats = null) {
  return mount(LearningJourneyView, {
    props: {
      rounds,
      allItems: rounds.flatMap(r => r.items),
      stats,
      courseCode: 'fra_for_eng',
      isLoading: false,
    },
  })
}

// The view auto-expands the first round, so click only the still-closed ones.
const expandAll = async (wrapper) => {
  for (const card of wrapper.findAll('.round-card')) {
    if (!card.find('.round-items').exists()) await card.find('.round-header').trigger('click')
  }
}

describe('LearningJourneyView — player-delivery flags', () => {
  it('still renders the round the player drops', () => {
    const wrapper = mountView()
    expect(wrapper.text()).toContain('R47')
    expect(wrapper.findAll('.round-card')).toHaveLength(2)
  })

  it('flags the dropped round in its header, naming the missing voice', () => {
    const wrapper = mountView()
    const badges = wrapper.findAll('.round-undeliverable-badge')
    expect(badges).toHaveLength(1)
    // Wording changed 2026-08-06 (90b684d8e): a gap costs cycles, and only a
    // round with NOTHING playable is flagged; the title says why.
    expect(badges[0].text()).toContain('nothing playable in this round')
    expect(badges[0].attributes('title')).toContain('still shown')
    expect(badges[0].attributes('title')).toContain('number is unaffected')
  })

  it('never renumbers rounds: a gap costs the cycle, not the number', () => {
    const wrapper = mountView()
    expect(wrapper.findAll('.round-renumber-badge')).toHaveLength(0)
    expect(wrapper.text()).toContain('R48')
    // the partly-voiced round says how many cycles it loses, not a new number
    expect(wrapper.find('.round-partial-badge').text()).toBe('2 cycles skipped for audio')
  })

  it('keeps every undeliverable row on screen', async () => {
    const wrapper = mountView()
    await expandAll(wrapper)

    // Every row of the intended script is still rendered.
    expect(wrapper.findAll('.item-row')).toHaveLength(5)
    expect(wrapper.text()).toContain('the unvoiced one')
    expect(wrapper.text()).toContain('a review that never fires')
  })

  it('does not repeat what the row already shows — a chip ONLY where nothing else says it', async () => {
    const wrapper = mountView()
    await expandAll(wrapper)

    // Missing audio already reads as a dropped play button + amber triangle;
    // the only chip is for an intro whose narration is missing (looks healthy
    // on the row). Reviews no longer get one: they fire on their own audio.
    expect(wrapper.findAll('.item-undeliverable-badge')).toHaveLength(0)

    // The audio gaps are still visible — via the existing indicator, on all
    // four rows the player will not play.
    expect(wrapper.findAll('.audio-missing-icon').length).toBe(4)
    const phraseGap = wrapper.findAll('.audio-missing-icon')
      .map(i => i.attributes('title'))
      .find(t => t.includes('prompt + voice 2'))
    expect(phraseGap).toContain('No prompt + voice 2 audio for this phrase')
  })

  it('leaves deliverable rows unflagged', async () => {
    const wrapper = mountView()
    await expandAll(wrapper)
    // R48's debut — the fully-voiced round, not R47's (which the player drops).
    const rows = wrapper.findAll('.round-card')[1].findAll('.item-row')
    const debutRow = rows.find(r => r.text().includes('known debut'))
    expect(debutRow.find('.item-undeliverable-badge').exists()).toBe(false)
    expect(debutRow.find('.audio-ok-icon').exists()).toBe(true)
  })

  it('shows the amber tick as the PLAYER sees it, not as the preview does', async () => {
    // hasAudio true (known + target1 present) but the player still drops it.
    const rounds = [{
      ...PARTIAL_ROUND,
      items: [item('build', {
        hasAudio: true,
        playerCanDeliver: false,
        playerDropReason: 'phrase-audio',
        missingAudioRoles: ['target2'],
      })],
      itemCount: 1,
    }]
    const wrapper = mountView(rounds)
    await expandAll(wrapper)
    expect(wrapper.find('.audio-ok-icon').exists()).toBe(false)
    expect(wrapper.find('.audio-missing-icon').exists()).toBe(true)
  })

  it('summarises the gap count in the stats bar', () => {
    const wrapper = mountView(ROUNDS, {
      roundsGenerated: 2, totalItems: 5, itemsWithAudio: 4, itemsMissingAudio: 1,
      itemsPlayerCannotDeliver: 4, roundsPlayerDrops: 1, generationTimeMs: 12,
    })
    const val = wrapper.find('.stat-val-undeliverable')
    expect(val.text()).toBe('4')
    expect(wrapper.find('.stat-label-undeliverable').text()).toBe("Player can't deliver")
    expect(wrapper.text()).toContain('1 round has nothing playable')
  })

  it('flags nothing on a fully-voiced course', async () => {
    const clean = [{
      ...PARTIAL_ROUND,
      items: [item('debut'), item('build')],
      itemCount: 2,
      playerDelivers: true,
      playerRoundNumber: 48,
      undeliverableItemCount: 0,
    }]
    const wrapper = mountView(clean, {
      roundsGenerated: 1, totalItems: 2, itemsWithAudio: 2, itemsMissingAudio: 0,
      itemsPlayerCannotDeliver: 0, roundsPlayerDrops: 0, generationTimeMs: 5,
    })
    await expandAll(wrapper)
    expect(wrapper.find('.item-undeliverable-badge').exists()).toBe(false)
    expect(wrapper.find('.round-undeliverable-badge').exists()).toBe(false)
    expect(wrapper.find('.round-renumber-badge').exists()).toBe(false)
    expect(wrapper.find('.stat-val-undeliverable').exists()).toBe(false)
  })
})
