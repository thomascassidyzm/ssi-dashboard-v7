/**
 * Unit tests: the cast pinning guard (Tom, 2026-08-24).
 *
 * "add a per-course cast pinning guard to pod-sync.cjs so a pool re-sync can
 * never overwrite an approved per-course cast."
 *
 * Motivating hazard (docs/pods/deu-pod-1-cutover-record-2026-08-22.md):
 * deu_for_eng and deu_at_for_eng share pool key 'deu' but their approved
 * rulings want OPPOSITE voices (German: Moritz/Lena; Austrian German:
 * Felix/Sonja). A pool-driven re-sync of one must never stomp the other's
 * approved cast.
 *
 * checkCastPin() is pure — no DB — so these tests hold the decision directly,
 * the same pattern pod-voice-approvals.test.cjs uses for evaluateApproval().
 *
 * Run: npx vitest run tools/pod-sync-cast-pinning-guard
 */

import { describe, it, expect } from 'vitest'

const { checkCastPin } = require('./pod-sync.cjs')
const { castFingerprint } = require('../services/pod-voice-approvals.cjs')

const MORITZ = { provider: 'xai', voice_id: '41321eb41295' }
const LENA = { provider: 'xai', voice_id: '3a7889066fa2' }
const FELIX = { provider: 'xai', voice_id: 'e1fc5a89' }
const SONJA = { provider: 'xai', voice_id: '44c91d64' }
const TOM_EN = { provider: 'xai', voice_id: 'gfzdpspr5fdp' }
const OLIVIA = { provider: 'xai', voice_id: 'bedd6226' }

// deu_for_eng's approved pod-1: Bruno on Moritz, Anna on Lena.
const DEU_SPEAKERS = {
  Bruno: { target: MORITZ, known: TOM_EN },
  Anna: { target: LENA, known: OLIVIA },
}
// deu_at_for_eng's approved pod-1: Bruno on Felix, Anna on Sonja.
const DEU_AT_SPEAKERS = {
  Bruno: { target: FELIX, known: TOM_EN },
  Anna: { target: SONJA, known: OLIVIA },
}

describe('checkCastPin — the deu/deu_at hazard', () => {
  it('no approval on record → always ok (nothing pinned yet)', () => {
    const result = checkCastPin('deu_for_eng', 'deu_for_eng:pod-1', null, [], DEU_AT_SPEAKERS)
    expect(result.ok).toBe(true)
  })

  it('re-syncing a pinned course with its OWN cast is ok (no-op recast)', () => {
    const existingPods = [{ id: 'deu_for_eng:pod-1', speakers: DEU_SPEAKERS }]
    const approval = { approved_by: 'tom', approved_at: '2026-08-22', cast_fingerprint: castFingerprint(existingPods) }
    const result = checkCastPin('deu_for_eng', 'deu_for_eng:pod-1', approval, existingPods, DEU_SPEAKERS)
    expect(result.ok).toBe(true)
  })

  it('THE HAZARD: a pool-driven re-sync that would stomp deu onto deu_at (or vice versa) is refused', () => {
    // deu_for_eng is approved on Moritz/Lena.
    const existingPods = [{ id: 'deu_for_eng:pod-1', speakers: DEU_SPEAKERS }]
    const approval = { approved_by: 'tom', approved_at: '2026-08-22', cast_fingerprint: castFingerprint(existingPods) }
    // A shared-pool-key resync resolves fresh voices that happen to be
    // deu_at's approved pair instead — exactly the cross-contamination Tom
    // flagged as a latent hazard.
    const result = checkCastPin('deu_for_eng', 'deu_for_eng:pod-1', approval, existingPods, DEU_AT_SPEAKERS)
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/APPROVED cast/)
    expect(result.message).toMatch(/Refusing to overwrite/)
    expect(result.message).toMatch(/deu_for_eng/)
  })

  it('fails loudly with an actionable message naming the re-approve command', () => {
    const existingPods = [{ id: 'deu_at_for_eng:pod-1', speakers: DEU_AT_SPEAKERS }]
    const approval = { approved_by: 'tom', approved_at: '2026-08-22', cast_fingerprint: castFingerprint(existingPods) }
    const result = checkCastPin('deu_at_for_eng', 'deu_at_for_eng:pod-1', approval, existingPods, DEU_SPEAKERS)
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/pod-approve-voices\.cjs --course=deu_at_for_eng/)
    expect(result.message).toMatch(/voice_pool_key/)
  })

  it('a NEW pod for an already-pinned course is checked too (pod not yet in existingPods)', () => {
    const existingPods = [{ id: 'deu_for_eng:pod-1', speakers: DEU_SPEAKERS }]
    const approval = { approved_by: 'tom', approved_at: '2026-08-22', cast_fingerprint: castFingerprint(existingPods) }
    // Syncing a brand-new pod-2 with a cast that disagrees with the pinned
    // pod-1 cast changes the course-level fingerprint — still a conflict.
    const result = checkCastPin('deu_for_eng', 'deu_for_eng:pod-2', approval, existingPods, DEU_AT_SPEAKERS)
    expect(result.ok).toBe(false)
  })

  it('an approval already stale for unrelated reasons is not this guard\'s fight', () => {
    // Live cast has already drifted from the approval out of band (someone
    // else recast) — the guard defers to the existing stale-approval gate
    // rather than refusing a sync that isn't the cause.
    const existingPods = [{ id: 'deu_for_eng:pod-1', speakers: DEU_AT_SPEAKERS }]
    const approval = { approved_by: 'tom', approved_at: '2026-08-22', cast_fingerprint: 'not-the-live-fingerprint' }
    const result = checkCastPin('deu_for_eng', 'deu_for_eng:pod-1', approval, existingPods, DEU_SPEAKERS)
    expect(result.ok).toBe(true)
  })
})
