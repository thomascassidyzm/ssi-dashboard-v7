/**
 * Unit tests for the pod-switchover grace guard (2026-08-24).
 *
 * The failure it exists to prevent, in full: the switchover PLANS the learner-progress
 * migration from a snapshot of `learner_pod_state` taken before its transaction opens,
 * then commits. A learner who is mid-session in that window writes rows the plan has
 * never seen, keyed under a slug the flip is about to archive — so they survive the
 * commit pointing at nothing. That is what happened to nld_for_eng on 2026-08-24:
 * learner 33344e24 wrote 14 rows around the 08:34:44Z flip and they had to be repaired
 * by hand (job #227).
 *
 * The guard re-reads every row touched since the snapshot, immediately before the plan
 * is applied, and folds the unseen ones through one more planMigration pass — retired
 * canon → promoted canon, exactly the mapping they would have got a second earlier.
 */

import { describe, it, expect } from 'vitest'

const { planInflightFold } = require('./pod-switchover.cjs')

const COURSE = 'nld_for_eng'
const LIVE = 'pod-0'
const RETIRED = 'pod-0-retired-2026-08-24'
const PROMOTED = 'pod-1'

/** The old canon, as it stands on the retired slug once the flip has moved it. */
const retiredCanon = [
  { id: `${COURSE}:${RETIRED}:SC01-S001`, scene_number: 1, sentence_number: 1, global_order: 1, known_text: 'good morning' },
  { id: `${COURSE}:${RETIRED}:SC01-S002`, scene_number: 1, sentence_number: 2, global_order: 2, known_text: 'how are you' },
  { id: `${COURSE}:${RETIRED}:SC01-S003`, scene_number: 1, sentence_number: 3, global_order: 3, known_text: 'very well thanks' },
  { id: `${COURSE}:${RETIRED}:SC02-S001`, scene_number: 2, sentence_number: 1, global_order: 4, known_text: 'where is the station' },
]

/** The new canon on the promoted slug. Same scene, one sentence inserted at the top —
 *  which is precisely why slot keys cannot be trusted and content matching is used. */
const promotedCanon = [
  { id: `${COURSE}:${PROMOTED}:SC01-S001`, scene_number: 1, sentence_number: 1, global_order: 1, known_text: 'hello there' },
  { id: `${COURSE}:${PROMOTED}:SC01-S002`, scene_number: 1, sentence_number: 2, global_order: 2, known_text: 'good morning' },
  { id: `${COURSE}:${PROMOTED}:SC01-S003`, scene_number: 1, sentence_number: 3, global_order: 3, known_text: 'how are you' },
  { id: `${COURSE}:${PROMOTED}:SC01-S004`, scene_number: 1, sentence_number: 4, global_order: 4, known_text: 'very well thanks' },
  { id: `${COURSE}:${PROMOTED}:SC02-S001`, scene_number: 2, sentence_number: 1, global_order: 5, known_text: 'where is the station' },
]

const fold = (over) => planInflightFold({
  course: COURSE, liveSlug: LIVE, retiredSlug: RETIRED, promoteTo: PROMOTED,
  plannedKeys: new Map(), stragglers: [], retiredCanon, promotedCanon, ...over
})

const row = (sentence_id, exposures = 1, learner_id = 'jackbrooks_25') =>
  ({ learner_id, course_code: COURSE, sentence_id, exposures, updated_at: new Date('2026-08-24T08:34:45Z') })

describe('pod-switchover grace guard', () => {
  it('folds in a write that lands after the plan was made', () => {
    // The learner heard "how are you" from the OLD canon while the flip was running.
    const r = fold({ stragglers: [row(`${COURSE}:${LIVE}:SC01-S002`, 3)] })

    expect(r.unknown).toEqual([])
    expect(r.actions).toHaveLength(1)
    const [a] = r.actions
    expect(a.action).toBe('carry')
    // It lands on the sentence carrying the same text in the promoted canon — which has
    // shifted down a slot. A slot-key swap would have credited "good morning" instead.
    expect(a.to).toBe(`${COURSE}:${PROMOTED}:SC01-S003`)
    // The delete must target the id the learner actually wrote, not the rekeyed lookup.
    expect(a.stored_sentence_id).toBe(`${COURSE}:${LIVE}:SC01-S002`)
    expect(a.exposures).toBe(3)
  })

  it('folds in the whole in-flight burst, mapping each row on its own content', () => {
    const r = fold({
      stragglers: [
        row(`${COURSE}:${LIVE}:SC01-S001`, 2),
        row(`${COURSE}:${LIVE}:SC01-S003`, 1),
        row(`${COURSE}:${LIVE}:SC02-S001`, 5),
      ]
    })
    expect(r.actions.map(a => a.to)).toEqual([
      `${COURSE}:${PROMOTED}:SC01-S002`,
      `${COURSE}:${PROMOTED}:SC01-S004`,
      `${COURSE}:${PROMOTED}:SC02-S001`,
    ])
    expect(r.actions.every(a => a.action === 'carry')).toBe(true)
  })

  it('drops an in-flight row whose sentence was reworded out of the new canon', () => {
    // Same rule 6 that dropped 5 of the 14 nld rows in the hand repair: the learner heard
    // something the new canon no longer contains, so there is nothing to credit them with.
    const gone = [...retiredCanon, { id: `${COURSE}:${RETIRED}:SC02-S002`, scene_number: 2, sentence_number: 2, global_order: 5, known_text: 'it is over there' }]
    const r = fold({ retiredCanon: gone, stragglers: [row(`${COURSE}:${LIVE}:SC02-S002`, 4)] })
    expect(r.actions).toHaveLength(1)
    expect(r.actions[0].action).toBe('drop')
    expect(r.actions[0].reason).toBe('text_absent_from_new_canon')
  })

  it('reports a row the plan already covers whose exposures moved, and only that row', () => {
    // GREATEST protection: the caller restamps the planned action so its exact-exposures
    // delete still matches, and the insert keeps whichever count is higher.
    const planned = new Map([
      [`jackbrooks_25|${COURSE}:${LIVE}:SC01-S001`, 2],   // was 2 at snapshot, now 7
      [`jackbrooks_25|${COURSE}:${LIVE}:SC01-S002`, 4],   // unchanged — a no-op
    ])
    const r = fold({
      plannedKeys: planned,
      stragglers: [row(`${COURSE}:${LIVE}:SC01-S001`, 7), row(`${COURSE}:${LIVE}:SC01-S002`, 4)]
    })
    expect(r.actions).toEqual([])
    expect(r.refresh.map(x => [x.sentence_id, x.exposures]))
      .toEqual([[`${COURSE}:${LIVE}:SC01-S001`, 7]])
  })

  it('leaves alone a row already sitting on the promoted slug', () => {
    const r = fold({ stragglers: [row(`${COURSE}:${PROMOTED}:SC01-S001`, 1)] })
    expect(r.actions).toEqual([])
    expect(r.ignored).toHaveLength(1)
    expect(r.unknown).toEqual([])
  })

  it('reports a row under neither slug rather than guessing', () => {
    const r = fold({ stragglers: [row(`${COURSE}:pod-2:SC01-S001`, 1)] })
    expect(r.unknown).toHaveLength(1)
    expect(r.actions).toEqual([])
  })

  it('reads a same-slug flip as the OLD canon, because that is what the learner was served', () => {
    // The default case: promote-to equals live, so both prefixes are the same string. A
    // learner mid-session was necessarily still being served the pre-flip content.
    const samePromoted = promotedCanon.map(s => ({ ...s, id: s.id.replace(`:${PROMOTED}:`, `:${LIVE}:`) }))
    const r = planInflightFold({
      course: COURSE, liveSlug: LIVE, retiredSlug: RETIRED, promoteTo: LIVE,
      plannedKeys: new Map(), stragglers: [row(`${COURSE}:${LIVE}:SC01-S002`, 3)],
      retiredCanon, promotedCanon: samePromoted
    })
    expect(r.ignored).toEqual([])
    expect(r.actions).toHaveLength(1)
    expect(r.actions[0].to).toBe(`${COURSE}:${LIVE}:SC01-S003`)
  })

  it('carries a :sN split suffix across the rekey', () => {
    const r = fold({ stragglers: [row(`${COURSE}:${LIVE}:SC01-S002:s2`, 1)] })
    expect(r.actions).toHaveLength(1)
    expect(r.actions[0].to).toBe(`${COURSE}:${PROMOTED}:SC01-S003:s2`)
    expect(r.actions[0].stored_sentence_id).toBe(`${COURSE}:${LIVE}:SC01-S002:s2`)
  })

  it('does nothing at all when nothing landed in the window', () => {
    expect(fold({})).toEqual({ actions: [], refresh: [], ignored: [], unknown: [] })
  })
})
