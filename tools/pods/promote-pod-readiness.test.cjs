/**
 * Unit tests for the promote-pod FITNESS gate (2026-09-02).
 *
 * The failure they exist to prevent is the one job #91 closed on the OTHER door.
 * `pod-switchover.cjs` and `promote-pod.cjs` are two separate tools that both put a
 * pod onto the slug the player serves. #91 taught the switchover to refuse a pod with
 * a complete target side and a SILENT OR EMPTY KNOWN SIDE. `promote-pod.cjs` had never
 * heard of `known_text` or `known_audio_id` at all: it checked drafts, empty target
 * text and missing target audio, and would happily promote a pod that plays nothing on
 * the known side.
 *
 * An invariant guarded at one door is not guarded. So this file tests that promote-pod
 * refuses the same content it refuses — and it does that by importing the SAME exported
 * `readinessBlockers()` from pod-switchover.cjs rather than growing a second copy of the
 * rule, because two implementations of one rule is how this class of bug returns.
 *
 * RECORDED RED (against the extracted pre-fix predicate, before the import landed):
 *   FAIL  REFUSES a pod whose known side is silent
 *     AssertionError: expected [] to not have a length of +0
 *   FAIL  REFUSES a pod whose known side is empty
 *     AssertionError: expected [] to not have a length of +0
 *   FAIL  refuses on a PARTIAL known-side hole — one silent row is enough
 *     AssertionError: expected [] to not have a length of +0
 */

import { describe, it, expect } from 'vitest'

const { promotionBlockers } = require('./promote-pod.cjs')

const COURSE = 'cym_n_for_eng'
const FROM = 'pod-0-unrecorded'
const srcId = `${COURSE}:${FROM}`

/** A source pod row with nothing wrong with it: both sides have text and a clip. */
const good = (n) => ({
  id: `${srcId}:SC01-S${String(n).padStart(3, '0')}`,
  target_text: 'bore da',
  target_audio_id: `aud-t-${n}`,
  known_text: 'good morning',
  known_audio_id: `aud-k-${n}`,
  target_text_draft: false,
})

/** A fit source pod: 12 complete rows. */
const fit = (over = {}, count = 12) =>
  Array.from({ length: count }, (_, i) => ({ ...good(i + 1), ...over }))

const base = { srcId, course: COURSE, fromSlug: FROM }
const blockersFor = (rows, extra = {}) => promotionBlockers({ rows, ...base, ...extra })

describe('promotionBlockers — the known side', () => {
  it('REFUSES a pod whose known side is silent', () => {
    const blockers = blockersFor(fit({ known_audio_id: null }))
    expect(blockers).not.toHaveLength(0)
    expect(blockers.join(' ')).toMatch(/no known audio/)
  })

  it('REFUSES a pod whose known side is empty', () => {
    const blockers = blockersFor(fit({ known_text: '   ' }))
    expect(blockers).not.toHaveLength(0)
    expect(blockers.join(' ')).toMatch(/no known text/)
  })

  it('refuses on a PARTIAL known-side hole — one silent row is enough', () => {
    const rows = fit()
    rows[7].known_audio_id = null
    const blockers = blockersFor(rows)
    expect(blockers).not.toHaveLength(0)
    expect(blockers.join(' ')).toMatch(/no known audio/)
  })

  it('passes a pod that is complete on BOTH sides', () => {
    expect(blockersFor(fit())).toEqual([])
  })

  it('speaks the same sentences as the switchover gate — one rule, not two', () => {
    // The exact strings come from pod-switchover.cjs's readinessBlockers. If this
    // stops matching, someone has written a second implementation of the rule.
    const { readinessBlockers } = require('./pod-switchover.cjs')
    const mine = blockersFor(fit({ known_audio_id: null, known_text: '' }))
    const theirs = readinessBlockers({ n: 12, no_text: 0, draft: 0, no_target_audio: 0, no_known_text: 12, no_known_audio: 12 })
    for (const b of theirs) expect(mine).toContain(b)
  })
})

describe('promotionBlockers — the checks promote-pod already had, still binding', () => {
  it('refuses a source pod with no rows', () => {
    expect(blockersFor([]).join(' ')).toMatch(/no sentence rows|no sentences/)
  })

  it('refuses mis-slugged row ids and names the reslug tool', () => {
    const rows = fit()
    rows[0].id = `${COURSE}:pod-0:SC01-S001`
    expect(blockersFor(rows).join(' ')).toMatch(/reslug-pod-rows\.cjs/)
  })

  it('refuses unproofread drafts, and --allow-drafts still waives them', () => {
    const rows = fit({ target_text_draft: true })
    expect(blockersFor(rows).join(' ')).toMatch(/marked draft/)
    expect(blockersFor(rows, { allow: { drafts: true } })).toEqual([])
  })

  it('refuses empty target text, and --allow-empty-target=N still waives up to N', () => {
    const rows = fit()
    rows[0].target_text = ''
    expect(blockersFor(rows).join(' ')).toMatch(/no target text/)
    expect(blockersFor(rows, { allow: { emptyTarget: 1 } })).toEqual([])
    rows[1].target_text = ''
    expect(blockersFor(rows, { allow: { emptyTarget: 1 } })).not.toHaveLength(0)
  })

  it('refuses missing target audio, and --allow-missing-audio still waives it', () => {
    const rows = fit({ target_audio_id: null })
    expect(blockersFor(rows).join(' ')).toMatch(/no target audio/)
    expect(blockersFor(rows, { allow: { missingAudio: true } })).toEqual([])
  })

  it('refuses id clashes on other pods', () => {
    const clashes = [{ id: `${COURSE}:pod-0:SC01-S001`, pod_id: `${COURSE}:pod-0-retired` }]
    expect(blockersFor(fit(), { clashes }).join(' ')).toMatch(/already exist on other pods/)
  })
})
