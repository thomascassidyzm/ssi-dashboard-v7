/**
 * THE PROGRESS-MIGRATION RULE, proved (2026-09-02).
 *
 * Tom, 2026-09-02, restating the nuance the migration must carry: "the same, or close to
 * the same sentence, if it's close to the same position in the sequence — else revert to
 * the most logical position before that."
 *
 * Two conditions, both required. TEXT similarity AND POSITIONAL proximity. The same line
 * at a very different point in the walk is not the same place in the learner's journey; a
 * nearby slot carrying different content is not their position either. And where the
 * match cannot be made, the learner degrades BACKWARDS — never forwards. Going back costs
 * them repetition of material they have already met. Going FORWARD drops them into
 * material whose prerequisites they have never seen, and it is invisible: they read it as
 * their own inability rather than as a migration bug.
 *
 * WHY THIS FILE EXISTS AT ALL. `planMigration()` is the estate's one implementation of
 * that rule — `pod-switchover.cjs` uses it, `planInflightFold()` re-enters it verbatim,
 * and `promote-pod.cjs` is due to call it once the switchover's apply block is extracted.
 * Until today it had NO direct test: it was exercised only sideways, through the in-flight
 * fold's fixtures. So the rule most likely to be quietly simplified by a refactor was the
 * one nothing asserted. These tests are the thing that makes the extraction safe to do.
 *
 * RECORDED RED, against the naive slot map — what a swap does with no migration at all,
 * and what a "simplification" of planMigration collapses into
 * (tools/pods/.pod-state-migrate-slotmap.scaffold.cjs, deleted after the run):
 *   FAIL  REFUSES to carry a sentence relocated to a different scene, though the text is identical
 *     AssertionError: expected 'carry' to be 'drop' // Object.is equality
 *   FAIL  REFUSES to credit the learner with the new sentence sitting in their old slot
 *     AssertionError: expected 'i would like to pay by card' to be 'where is the station?' // Object.is equality
 *   FAIL  LANDS THE LEARNER EARLIER, NEVER LATER, when no close match at a close position exists
 *     AssertionError: expected 'carry' to be 'drop' // Object.is equality
 *   FAIL  NEVER credits a learner with text they did not hear — the invariant, over every action
 *     AssertionError: expected 'i would like to pay by card' to be 'where is the station?' // Object.is equality
 *   FAIL  REFUSES a slot whose sentence was reworded — a changed line is a new line, never a survivor
 *     AssertionError: expected 'carry' to be 'drop' // Object.is equality
 *   FAIL  carries progress across a renumbered scene whose content moved together
 *     AssertionError: expected [ 'drop', 'drop', 'drop' ] to deeply equal [ 'carry', 'carry', 'carry' ]
 *
 *   Test Files  1 failed (1)
 *        Tests  6 failed | 1 passed (7)
 *
 * Read the last two together, because between them they are the whole rule: the slot map
 * CARRIES the thing it must drop (an unheard line at the same index) and DROPS everything
 * it must carry (a whole scene that moved together, learner's position intact). Position
 * without text and text without position are both wrong, in opposite directions.
 */

import { describe, it, expect } from 'vitest'

const MOD = process.env.POD_STATE_MIGRATE_MODULE || './pod-state-migrate.cjs'
const { planMigration, norm } = require(MOD)

const row = (scene, sentence, order, text, slug = 'pod-0') => ({
  id: `cym_for_eng:${slug}:SC${String(scene).padStart(2, '0')}-S${String(sentence).padStart(3, '0')}`,
  scene_number: scene, sentence_number: sentence, global_order: order, known_text: text,
})

/**
 * The scenario, built to be the one that matters: a pod grows, one line is RELOCATED to a
 * much later scene, and a brand-new line takes the slot it vacated. The learner has
 * progress on the relocated line.
 */
const OLD = [
  row(1, 1, 1, 'hello'),
  row(1, 2, 2, 'good morning'),
  row(1, 3, 3, 'how are you?'),
  row(2, 1, 4, 'where is the station?'),
  row(2, 2, 5, 'it is over there'),
  row(2, 3, 6, 'thank you very much'),
]
const NEW = [
  row(1, 1, 1, 'hello', 'pod-0-new'),
  row(1, 2, 2, 'good morning', 'pod-0-new'),
  row(1, 3, 3, 'how are you?', 'pod-0-new'),
  // A NEW line takes the slot the station question used to hold.
  row(2, 1, 4, 'i would like to pay by card', 'pod-0-new'),
  row(2, 2, 5, 'it is over there', 'pod-0-new'),
  row(2, 3, 6, 'thank you very much', 'pod-0-new'),
  // …and the station question now lives in a much later scene, in a different dialogue.
  row(7, 1, 20, 'where is the station?', 'pod-0-new'),
]
const state = (id, exposures = 5) => ({ learner_id: 'L1', course_code: 'cym_for_eng', sentence_id: id, exposures })

const byId = (canon) => new Map(canon.map(r => [r.id, r]))

describe('the two conditions — text AND position, never one alone', () => {
  it('REFUSES to carry a sentence relocated to a different scene, though the text is identical', () => {
    const { actions } = planMigration(OLD, NEW, [state('cym_for_eng:pod-0:SC02-S001')])
    expect(actions[0].action).toBe('drop')
    expect(actions[0].reason).toMatch(/relocated|scene/)
  })

  it('REFUSES to credit the learner with the new sentence sitting in their old slot', () => {
    // This is the mis-credit itself: the slot survives, the sentence in it does not.
    const { actions } = planMigration(OLD, NEW, [state('cym_for_eng:pod-0:SC02-S001')])
    const to = actions[0].to
    if (to) {
      const landed = byId(NEW).get(String(to).replace(/:s\d+$/, ''))
      expect(norm(landed.known_text)).toBe(norm('where is the station?'))
    }
    expect(actions[0].action).not.toBe('carry')
  })

  it('LANDS THE LEARNER EARLIER, NEVER LATER, when no close match at a close position exists', () => {
    // The asymmetry, stated as an assertion. The learner heard "where is the station?" at
    // global_order 4. The slot map would credit them with the card line — same index,
    // unheard content — leaving them holding maturity on something they have never met.
    // The rule drops the row instead, which puts that sentence back to unseen: backwards.
    const heardAt = 4
    const { actions } = planMigration(OLD, NEW, [state('cym_for_eng:pod-0:SC02-S001')])
    const a = actions[0]
    const landedOrder = a.to
      ? byId(NEW).get(String(a.to).replace(/:s\d+$/, '')).global_order
      : null
    // Either it did not land at all (dropped → unseen → strictly backwards), or it landed
    // on the very sentence it heard. It NEVER lands on later, unheard material.
    expect(landedOrder === null || landedOrder <= heardAt || norm(byId(NEW).get(String(a.to).replace(/:s\d+$/, '')).known_text) === norm(a.heard)).toBe(true)
    expect(a.action).toBe('drop')
  })

  it('carries every surviving sentence it SHOULD, so the rule is not just "refuse everything"', () => {
    const rows = [
      state('cym_for_eng:pod-0:SC01-S001'),
      state('cym_for_eng:pod-0:SC02-S002'),
      state('cym_for_eng:pod-0:SC02-S003'),
    ]
    const { actions } = planMigration(OLD, NEW, rows)
    expect(actions.every(a => a.action === 'carry' || a.action === 'keep')).toBe(true)
  })

  it('NEVER credits a learner with text they did not hear — the invariant, over every action', () => {
    const rows = OLD.map(r => state(r.id))
    const { actions } = planMigration(OLD, NEW, rows)
    const newById = byId(NEW)
    for (const a of actions) {
      if (a.action === 'drop') continue
      const landed = newById.get(String(a.to).replace(/:s\d+$/, ''))
      expect(landed, `action ${a.action} pointed at a sentence not in the new canon`).toBeTruthy()
      expect(norm(landed.known_text)).toBe(norm(a.heard))
    }
  })
})

describe('position alone is not a match either', () => {
  const OLD2 = [row(1, 1, 1, 'hello'), row(1, 2, 2, 'good morning'), row(1, 3, 3, 'how are you?')]
  const NEW2 = [
    row(1, 1, 1, 'hello', 'x'),
    row(1, 2, 2, 'good evening', 'x'),          // the slot survives, the sentence changed
    row(1, 3, 3, 'how are you?', 'x'),
  ]

  it('REFUSES a slot whose sentence was reworded — a changed line is a new line, never a survivor', () => {
    const { actions } = planMigration(OLD2, NEW2, [state('cym_for_eng:pod-0:SC01-S002')])
    expect(actions[0].action).toBe('drop')
    expect(actions[0].reason).toMatch(/text_absent/)
  })
})

describe('a wholesale scene renumber is still a match — the bound is on the WALK, not the index', () => {
  // Seven scenes inserted before it: old scene 2 becomes new scene 9 in its entirety.
  // Every line keeps its neighbours, so the learner's position is unchanged and the
  // progress must follow. A naive "same scene number" rule would drop all of this.
  const OLD3 = [row(2, 1, 4, 'where is the station?'), row(2, 2, 5, 'it is over there'), row(2, 3, 6, 'thank you very much')]
  const NEW3 = [row(9, 1, 30, 'where is the station?', 'y'), row(9, 2, 31, 'it is over there', 'y'), row(9, 3, 32, 'thank you very much', 'y')]

  it('carries progress across a renumbered scene whose content moved together', () => {
    const rows = OLD3.map(r => state(r.id))
    const { actions } = planMigration(OLD3, NEW3, rows)
    expect(actions.map(a => a.action)).toEqual(['carry', 'carry', 'carry'])
    for (const a of actions) expect(String(a.to)).toMatch(/SC09-/)
  })
})

describe('the one place the rule rounds UP, documented so a refactor cannot change it quietly', () => {
  // Two old lines with the same text collapse onto one new line. The learner is part-way
  // through both — 5 exposures on one, 1 on the other — and the merge keeps Math.max.
  //
  // UNDER TOM'S ASYMMETRY THE SAFE CHOICE IS `min`: someone part-way through both halves
  // of a merged line is not mature on the whole of it, and `exposures` is a maturity
  // counter — a higher value means the sentence is SERVED LESS OFTEN, so rounding up
  // advances them past material. This test asserts TODAY'S behaviour, not the right one:
  // changing it re-schedules real learners, so it is Tom's call, logged as a decision
  // candidate in docs/pods/pod-doors-closed-2026-09-02.md. If he rules for `min`, this
  // test changes with the code, deliberately, and that is the point of writing it down.
  const OLD4 = [row(1, 1, 1, 'hello'), row(1, 2, 2, 'ten'), row(1, 3, 3, 'ten')]
  const NEW4 = [row(1, 1, 1, 'hello', 'z'), row(1, 2, 2, 'ten', 'z')]

  it('keeps the HIGHER exposures when two old rows collapse onto one new sentence', () => {
    const rows = [state('cym_for_eng:pod-0:SC01-S002', 5), state('cym_for_eng:pod-0:SC01-S003', 1)]
    const { actions } = planMigration(OLD4, NEW4, rows)
    const kept = actions.find(a => a.action === 'carry' || a.action === 'keep')
    const merged = actions.find(a => a.action === 'merge')
    expect(merged, 'the two rows should collapse onto one target').toBeTruthy()
    expect(kept.exposures).toBe(5)
  })
})
