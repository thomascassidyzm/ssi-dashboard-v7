/**
 * Job #309 — the two doors a relabelled pod line walked through.
 *
 * run-canonical-231-build.cjs's relabel branch calls draft-pod-known-side.cjs
 * --mode=relabel and then passes only --known-source and --overrides. It does
 * NOT pass --draft=known, which the translate branch immediately above it does
 * pass. So the five language-name lines a model rewrote (global orders 33, 94,
 * 95, 221, 226) were stored target_text_draft:false — structurally invisible to
 * verify-pod-text.cjs, whose selection is `WHERE target_text_draft AND
 * target_text_approved_at IS NULL`, and waved through by promote-pod.cjs, whose
 * gate filtered on that same flag.
 *
 * Machine-written learner-facing text could therefore reach a serving slug with
 * nobody and nothing having read it. Both doors are tested here.
 */
import { describe, it, expect } from 'vitest'

const { draftFlagsFor } = require('./pod-draft-flags.cjs')
const { isUnreviewedMachineText, readinessBlockers } = require('./pod-switchover.cjs')
const { promotionBlockers } = require('./promote-pod.cjs')

describe('door 1 — the relabel path marks what a model wrote (job #309)', () => {
  it('a relabelled language-name line is a draft the verifier can see', () => {
    // The relabel branch's flags: no --draft, no --carry-target-draft.
    const row = draftFlagsFor({ draftSide: 'none', machineKnown: true })
    expect(row.target_text_draft).toBe(true)   // verify-pod-text's WHERE clause
    expect(row.draft_side).toBe('known')       // the second, independent record
  })

  it('a target-side substitution is a draft too, on the target side', () => {
    const row = draftFlagsFor({ draftSide: 'none', machineTarget: true })
    expect(row.target_text_draft).toBe(true)
    expect(row.draft_side).toBe('target')
  })

  it('leaves the 226 lines nobody rewrote alone — 5 to verify, not 231', () => {
    const row = draftFlagsFor({ draftSide: 'none' })
    expect(row.target_text_draft).toBe(false)
    expect(row.draft_side).toBe(null)
  })

  it('the translate path is unchanged: --draft=known still marks every row', () => {
    expect(draftFlagsFor({ draftSide: 'known' })).toEqual({ target_text_draft: true, draft_side: 'known' })
  })

  it('--carry-target-draft is unchanged', () => {
    expect(draftFlagsFor({ carryTargetDraft: true, targetRowIsDraft: true }))
      .toEqual({ target_text_draft: true, draft_side: 'target' })
    expect(draftFlagsFor({ carryTargetDraft: true, targetRowIsDraft: false }))
      .toEqual({ target_text_draft: false, draft_side: null })
  })
})

describe('door 2 — the promote gate refuses unreviewed machine text (job #309)', () => {
  const clean = { target_text_draft: false, draft_side: null, target_text_approved_at: null,
    known_text: 'k', target_text: 't', target_text_review: null }

  it('refuses a row a machine wrote that nobody approved, EVEN with the draft flag false', () => {
    expect(isUnreviewedMachineText({ ...clean, draft_side: 'known' })).toBe(true)
  })

  it('accepts it once a verifier has approved it', () => {
    expect(isUnreviewedMachineText({ ...clean, draft_side: 'known', target_text_approved_at: '2026-09-20T00:00:00Z' })).toBe(false)
  })

  it('refuses a row whose approval was given to different words', () => {
    expect(isUnreviewedMachineText({ ...clean, target_text_approved_at: '2026-09-20T00:00:00Z',
      target_text_review: { known_text_at_check: 'the words that were read', target_text_at_check: 't' } })).toBe(true)
  })

  it('leaves an ordinary hand-authored row alone', () => {
    expect(isUnreviewedMachineText(clean)).toBe(false)
  })

  it('readinessBlockers says so in words', () => {
    const blockers = readinessBlockers({ n: 231, no_text: 0, draft: 0, unreviewed: 5,
      no_target_audio: 0, no_known_text: 0, no_known_audio: 0 })
    expect(blockers.join(' ')).toMatch(/5 staged sentences carry machine-written text no verifier has approved/)
  })

  it('promote-pod REFUSES a pod carrying the five unreviewed relabelled lines', () => {
    const course = 'cym_n_for_eng'
    const srcId = `${course}:pod-1-231`
    const row = (n, over = {}) => ({
      id: `${srcId}:SC01-S${String(n).padStart(3, '0')}`,
      known_text: `k${n}`, target_text: `t${n}`,
      known_audio_id: `ka${n}`, target_audio_id: `ta${n}`,
      target_text_draft: false, draft_side: null, target_text_approved_at: null,
      target_text_review: null, ...over,
    })
    const rows = Array.from({ length: 231 }, (_, i) => row(i + 1))
    for (const n of [33, 94, 95, 221, 226]) rows[n - 1] = row(n, { draft_side: 'known' })

    const blockers = promotionBlockers({ rows, srcId, course, fromSlug: 'pod-1-231' })
    expect(blockers.join(' ')).toMatch(/5 staged sentences carry machine-written text no verifier has approved/)

    // and the same pod, once every one of those five is approved, is promotable
    for (const n of [33, 94, 95, 221, 226]) rows[n - 1] = row(n, { draft_side: 'known', target_text_approved_at: '2026-09-20T00:00:00Z' })
    expect(promotionBlockers({ rows, srcId, course, fromSlug: 'pod-1-231' })).toEqual([])
  })
})
