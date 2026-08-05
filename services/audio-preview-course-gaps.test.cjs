// The course-wide missing-clip fold. What matters is that the number a person
// reads is the number of things they have to fix — the journey replays one USE
// phrase in a dozen review rounds, and counting those replays as separate gaps
// would inflate fra_for_eng's real ~1,600 rows into 3,214.
import { describe, it, expect } from 'vitest'

const { computeCourseGaps, missingRolesFor, rowKeyFor } = require('./audio-preview-course-gaps.cjs')

const intro = (over = {}) => ({
  type: 'intro', roundNumber: 1, legoId: 'S0001L01', seedNumber: 1,
  known_text: 'to speak', target_text: 'parler',
  presentation_audio: { id: 'p1' }, target1_audio_uuid: 't1', target2_audio_uuid: 't2',
  hasAudio: true, ...over,
})
const phrase = (over = {}) => ({
  type: 'build', roundNumber: 2, legoId: 'S0001L01', seedNumber: 1,
  phrase_id: 'ph-1', known_text: 'I speak', target_text: 'je parle',
  known_audio_uuid: 'k1', target1_audio_uuid: 't1', target2_audio_uuid: 't2',
  hasAudio: true, ...over,
})

describe('missingRolesFor', () => {
  it('reads presentation for intros and known for everything else', () => {
    expect(missingRolesFor(intro({ presentation_audio: null }))).toEqual(['presentation'])
    expect(missingRolesFor(phrase({ known_audio_uuid: null }))).toEqual(['known'])
  })

  it('reports every missing role, not just the first', () => {
    expect(missingRolesFor(phrase({ known_audio_uuid: null, target1_audio_uuid: null, target2_audio_uuid: null })))
      .toEqual(['known', 'target1', 'target2'])
  })

  it('says nothing when the row is complete', () => {
    expect(missingRolesFor(phrase())).toEqual([])
  })
})

describe('rowKeyFor', () => {
  it('keys a phrase by the row a repair would touch, not by the round', () => {
    expect(rowKeyFor(phrase({ roundNumber: 2 }))).toBe(rowKeyFor(phrase({ roundNumber: 90, type: 'review' })))
  })

  it('keeps a LEGO intro and its debut apart — different audio, different repairs', () => {
    expect(rowKeyFor(intro())).not.toBe(rowKeyFor({ ...intro(), type: 'debut' }))
  })
})

describe('computeCourseGaps', () => {
  it('counts one phrase replayed across review rounds ONCE, and says how many slots it blocks', () => {
    const gappy = { known_audio_uuid: null, hasAudio: false }
    const { totals, groups } = computeCourseGaps({
      allItems: [
        phrase({ ...gappy, roundNumber: 2 }),
        phrase({ ...gappy, roundNumber: 3, type: 'review' }),
        phrase({ ...gappy, roundNumber: 15, type: 'review' }),
      ],
      roundCount: 20,
    })
    expect(totals.rows).toBe(1)
    expect(totals.blocking).toBe(1)
    expect(totals.occurrences).toBe(3)
    expect(groups).toHaveLength(1)
    expect(groups[0].roundNumber).toBe(2)          // earliest round: where to go and hear it
    expect(groups[0].rows[0].playedAs).toEqual(['build', 'review'])
  })

  it('never folds a target2-only gap into the blocking count', () => {
    const { totals } = computeCourseGaps({
      allItems: [
        phrase({ target2_audio_uuid: null, hasAudio: true }),
        phrase({ phrase_id: 'ph-2', known_audio_uuid: null, hasAudio: false }),
      ],
      roundCount: 5,
    })
    expect(totals.rows).toBe(2)
    expect(totals.blocking).toBe(1)
    expect(totals.nonBlocking).toBe(1)
    expect(totals.byRole).toEqual({ presentation: 0, known: 1, target1: 0, target2: 1 })
  })

  it('groups gaps by the round they first appear in, in round order', () => {
    const { groups, totals } = computeCourseGaps({
      allItems: [
        phrase({ phrase_id: 'ph-b', roundNumber: 7, known_audio_uuid: null, hasAudio: false }),
        phrase({ phrase_id: 'ph-a', roundNumber: 3, known_audio_uuid: null, hasAudio: false }),
        phrase({ phrase_id: 'ph-c', roundNumber: 3, target1_audio_uuid: null, hasAudio: false }),
      ],
      roundCount: 10,
    })
    expect(groups.map(g => g.roundNumber)).toEqual([3, 7])
    expect(groups[0].rows).toHaveLength(2)
    expect(totals.roundsAffected).toBe(2)
    expect(totals.roundsTotal).toBe(10)
  })

  it('reports a clean course as clean, with the denominator it checked', () => {
    const { totals, groups } = computeCourseGaps({ allItems: [intro(), phrase()], roundCount: 2 })
    expect(totals.rows).toBe(0)
    expect(totals.blocking).toBe(0)
    expect(totals.itemsScanned).toBe(2)
    expect(groups).toEqual([])
  })
})
