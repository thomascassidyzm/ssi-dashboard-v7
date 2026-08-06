// The course-wide missing-clip block. The assertions that matter are about
// honesty of the number: the headline is the count of clips the learner cannot
// hear, a target2-only gap is never folded into it, gaps the journey never
// plays are still printed, and a failed scan never renders as "no gaps".
//
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AudioPreviewCourseGaps from './AudioPreviewCourseGaps.vue'

const GAPS = {
  courseCode: 'fra_for_eng',
  totals: {
    rows: 3,
    blocking: 2,
    nonBlocking: 1,
    occurrences: 9,
    byRole: { presentation: 1, known: 1, target1: 0, target2: 1 },
    byKind: { 'lego-intro': 1, phrase: 2 },
    roundsAffected: 2,
    roundsTotal: 1529,
    itemsScanned: 33368,
  },
  groups: [
    {
      roundNumber: 30,
      legoId: 'S0009L03',
      seedNumber: 9,
      blocking: 1,
      rows: [{
        key: 'lego-intro:S0009L03', kind: 'lego-intro', blocking: true,
        missing: ['presentation'], roundNumber: 30, legoId: 'S0009L03', seedNumber: 9,
        phraseId: null, knownText: 'I speak a little French',
        targetText: 'je parle un peu français', playedAs: ['intro'], occurrences: 1,
      }],
    },
    {
      roundNumber: 44,
      legoId: 'S0013L01',
      seedNumber: 13,
      blocking: 1,
      rows: [
        {
          key: 'phrase:ph-1', kind: 'phrase', blocking: true, missing: ['known'],
          roundNumber: 44, legoId: 'S0013L01', seedNumber: 13, phraseId: 'ph-1',
          knownText: 'I want to try', targetText: 'je veux essayer',
          playedAs: ['build', 'review'], occurrences: 7,
        },
        {
          key: 'phrase:ph-2', kind: 'phrase', blocking: false, missing: ['target2'],
          roundNumber: 44, legoId: 'S0013L01', seedNumber: 13, phraseId: 'ph-2',
          knownText: 'I can try', targetText: 'je peux essayer',
          playedAs: ['use'], occurrences: 1,
        },
      ],
    },
  ],
  outsideJourney: { phrases: 36, legos: 124, note: 'never played by the journey.' },
  computedInMs: 8154,
  capped: false,
  note: 'Same gap test as Script Viewer.',
}

const openBlock = async (wrapper) => {
  await wrapper.get('[data-walk="audio-preview-course-gaps-toggle"]').trigger('click')
}

describe('AudioPreviewCourseGaps', () => {
  it('leads with the number of clips the learner cannot hear, not the row count', () => {
    const w = mount(AudioPreviewCourseGaps, { props: { gaps: GAPS } })
    expect(w.get('[data-gaps-total]').text()).toBe('2')
    expect(w.text()).toContain('2 of 1529 rounds affected')
  })

  it('names the target2-only row separately instead of folding it into the headline', () => {
    const w = mount(AudioPreviewCourseGaps, { props: { gaps: GAPS } })
    expect(w.text()).toContain('plus 1 row missing only target2')
  })

  it('shows every gap in the payload, grouped by the round it first appears in', async () => {
    const w = mount(AudioPreviewCourseGaps, { props: { gaps: GAPS } })
    await openBlock(w)
    expect(w.findAll('[data-gap-group]')).toHaveLength(2)
    expect(w.findAll('[data-gap-row]')).toHaveLength(3)
    expect(w.text()).toContain('je parle un peu français')
    expect(w.text()).toContain('×7 slots')
  })

  it('prints every role including the zeroes', async () => {
    const w = mount(AudioPreviewCourseGaps, { props: { gaps: GAPS } })
    await openBlock(w)
    const roles = w.findAll('[data-gap-role]').map(r => r.attributes('data-gap-role'))
    expect(roles).toEqual(['presentation', 'known', 'target1', 'target2'])
  })

  it('prints the gaps the journey never plays rather than dropping them silently', async () => {
    const w = mount(AudioPreviewCourseGaps, { props: { gaps: GAPS } })
    await openBlock(w)
    expect(w.get('[data-gaps-outside]').text()).toContain('36 phrases')
    expect(w.get('[data-gaps-outside]').text()).toContain('124 LEGOs')
  })

  it('says a clean course is clean, with the denominator it checked', () => {
    const clean = { ...GAPS, totals: { ...GAPS.totals, rows: 0, blocking: 0, nonBlocking: 0 }, groups: [] }
    const w = mount(AudioPreviewCourseGaps, { props: { gaps: clean } })
    expect(w.text()).toContain('No missing clips anywhere in the course')
    expect(w.text()).toContain('33368')
  })

  it('shows a failed scan as a failure — never as a course with no gaps', () => {
    const w = mount(AudioPreviewCourseGaps, { props: { gaps: null, error: 'missing-clips 500' } })
    expect(w.text()).toContain('Could not list the course')
    expect(w.text()).not.toContain('No missing clips anywhere')
  })
})

// ---------------------------------------------------------------------------
// The player-delivery line. The block already answers "what is there to
// record"; this answers "what does a learner get today", which is the number a
// sign-off turns on. ara_lb_for_eng shows 1,414 rounds here and plays 638.
// ---------------------------------------------------------------------------

const withDelivery = (playerDelivery) => ({
  ...GAPS,
  totals: { ...GAPS.totals, playerDelivery },
})

describe('AudioPreviewCourseGaps — what the live player delivers', () => {
  it('leads with the rounds a learner never reaches', () => {
    const wrapper = mount(AudioPreviewCourseGaps, {
      props: { gaps: withDelivery({
        roundsTotal: 1414, roundsDropped: 776, roundsPlayed: 638,
        rowsUndeliverable: 4210, slotsUndeliverable: 17550,
        byReason: { 'lego-audio': 17500, 'reviewed-lego-dropped': 50 },
      }) },
    })
    const line = wrapper.find('[data-gaps-player-delivery]')
    expect(line.exists()).toBe(true)
    expect(wrapper.find('[data-player-rounds-played]').text()).toBe('638')
    expect(wrapper.find('[data-player-rounds-dropped]').text()).toBe('776')
    expect(line.text()).toContain('of 1414 rounds')
    expect(line.text()).toContain('17550 playback slots')
  })

  it('distinguishes rows skipped inside a round from rounds lost outright', () => {
    const wrapper = mount(AudioPreviewCourseGaps, {
      props: { gaps: withDelivery({
        roundsTotal: 1529, roundsDropped: 0, roundsPlayed: 1529,
        rowsUndeliverable: 12, slotsUndeliverable: 31,
        byReason: { 'phrase-audio': 31 },
      }) },
    })
    const line = wrapper.find('[data-gaps-player-delivery]')
    expect(line.text()).toContain('Every round reaches a learner')
    expect(wrapper.find('[data-player-slots]').text()).toBe('31')
  })

  it('says so plainly when the player delivers the whole course', () => {
    const wrapper = mount(AudioPreviewCourseGaps, {
      props: { gaps: withDelivery({
        roundsTotal: 1570, roundsDropped: 0, roundsPlayed: 1570,
        rowsUndeliverable: 0, slotsUndeliverable: 0, byReason: {},
      }) },
    })
    expect(wrapper.find('[data-gaps-player-delivery]').text())
      .toContain('delivers all 1570 rounds')
  })

  it('stays silent on an older payload that never measured delivery', () => {
    const wrapper = mount(AudioPreviewCourseGaps, { props: { gaps: GAPS } })
    // A zero it did not measure would read as "the player delivers everything".
    expect(wrapper.find('[data-gaps-player-delivery]').exists()).toBe(false)
  })
})
