/**
 * Unit tests for the slug allowlist on delete-blank-pod-sentence (2026-08-23).
 *
 * Why this exists: the tool originally refused any slug that did not end
 * `-unrecorded`, which was the whole safety story. The same textless SC15-S012 row
 * then turned up on two Group 1 STAGED clones (`pod-1-staged-2026-08-23`), so the
 * guard had to widen. Widening a safety guard is exactly the kind of change that
 * quietly grows a hole, so the allowed set is pinned here: the two staging shapes
 * pass and everything else — above all a live `pod-0` — is refused.
 */

import { describe, it, expect } from 'vitest'

const { podSlugAllowed, STAGING_SLUGS } = require('./delete-blank-pod-sentence.cjs')

describe('podSlugAllowed', () => {
  it('allows the Group 2 staging slug', () => {
    expect(podSlugAllowed('bul_for_eng:pod-0-unrecorded')).toBe(true)
    expect(podSlugAllowed('tha_for_eng:pod-0-unrecorded')).toBe(true)
  })

  it('allows the dated Group 1 staged-clone slug', () => {
    expect(podSlugAllowed('ara_sy_for_eng:pod-1-staged-2026-08-23')).toBe(true)
    expect(podSlugAllowed('fra_ca_for_eng:pod-1-staged-2026-08-23')).toBe(true)
  })

  it('REFUSES the live pod slugs', () => {
    expect(podSlugAllowed('ara_sy_for_eng:pod-0')).toBe(false)
    expect(podSlugAllowed('fin_for_eng:pod-0')).toBe(false)
    expect(podSlugAllowed('hrv_for_eng:pod-1')).toBe(false)
  })

  it('REFUSES a slug that merely looks staged', () => {
    // A future dated clone is not covered until someone adds it on purpose.
    expect(podSlugAllowed('spa_for_eng:pod-1-staged-2026-09-01')).toBe(false)
    expect(podSlugAllowed('spa_for_eng:pod-0-unrecorded-live')).toBe(false)
    expect(podSlugAllowed('spa_for_eng:unrecorded')).toBe(false)
  })

  it('REFUSES junk rather than defaulting open', () => {
    expect(podSlugAllowed('')).toBe(false)
    expect(podSlugAllowed(null)).toBe(false)
    expect(podSlugAllowed('no-colon-here')).toBe(false)
  })

  it('keeps the staging allowlist literal and short', () => {
    expect(STAGING_SLUGS).toEqual(['pod-1-staged-2026-08-23'])
  })
})
