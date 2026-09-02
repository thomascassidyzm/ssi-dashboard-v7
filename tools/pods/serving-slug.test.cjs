/**
 * Unit tests for THE RULE — tools/pods/serving-slug.cjs (2026-09-02).
 *
 * What they exist to hold. Ten write paths create, rename, empty or move a pod on a slug
 * the player serves (docs/pods/pod-doors-2026-09-02.md), and this job found an eleventh:
 * tools/pods/align-welsh-pod0-to-canonical.cjs, whose POD_SLUG is the literal 'pod-0' and
 * which blanks known and target text on it with no serving check at all. Every one of
 * those doors now asks the same question through this module, so the answer cannot drift
 * between them. That is the whole point: an invariant guarded at one door is not guarded,
 * and a rule written five times is five rules.
 *
 * Two things it deliberately does NOT do. It never reads `visibility` as a defence — no
 * learner consumer reads the column (api/courses/[code]/bundle.ts says so in its own
 * comment), so a held pod on a serving slug is served, and Tom's ruling of 2026-09-02 is
 * that visibility never stands in for a guard anywhere. And it never refuses on learner
 * progress: it NAMES the learners at risk and lets `serveNow` through, because a guard
 * that blocks a legitimate swap on a course with real learners is a wall in front of the
 * product, not a safety feature.
 *
 * RECORDED RED, against the pre-fix state — before this file existed the rule lived in
 * one tool only, and four of the five doors had no serving check whatsoever, so the
 * faithful reconstruction refuses nothing and knows no serving slugs
 * (tools/pods/.serving-slug.prefix.scaffold.cjs, deleted after the run):
 *   FAIL  knows pod-0 and pod-1 are served
 *     AssertionError: expected [] to include 'pod-0'
 *   FAIL  names both numbers when it can
 *     AssertionError: expected '' to match /9 of this course's 12 learners/
 *   FAIL  says "0 learners currently" rather than staying silent
 *     AssertionError: expected '' to match /0 learners currently/
 *   FAIL  says UNAVAILABLE when the count could not be read
 *     AssertionError: expected '' to match /unavailable/i
 *   FAIL  REFUSES a write onto a serving slug
 *     AssertionError: expected null to be truthy
 *   FAIL  REFUSES a held pod — visibility is never a guard
 *     AssertionError: expected null to be truthy
 *   FAIL  REFUSES a pod that does not exist yet — creating the header row IS the serving
 *     AssertionError: expected null to be truthy
 *   FAIL  REFUSES when the learner count is unavailable — never allows on an unmeasured risk
 *     TypeError: .toMatch() expects to receive a string, but got object
 *   FAIL  carries the call site's own wording, so each door explains its own harm
 *     TypeError: .toMatch() expects to receive a string, but got object
 *
 *   Test Files  1 failed (1)
 *        Tests  9 failed | 4 passed (13)
 *
 * The 4 that passed are the not-a-door cases — a parked slug, a non-core pod, and
 * serveNow — which pass trivially against a rule that refuses nothing, and are here so
 * the fix has to keep them passing.
 */

import { describe, it, expect } from 'vitest'

const MOD = process.env.SERVING_SLUG_MODULE || './serving-slug.cjs'
const { SERVING_POD_SLUGS, servesLearners, learnersAtRisk, servingRefusal } = require(MOD)

const wording = {
  action: 'This does the thing,',
  harm: 'and here is what it does to them.',
  escape: '--serve-now',
  remedy: 'Do it somewhere parked instead',
}
const serving = (over = {}) => ({
  podId: 'cym_for_eng:pod-0',
  slug: 'pod-0',
  podType: 'core',
  podExists: true,
  podVisibility: 'live',
  rows: 240,
  learnersOnCourse: 12,
  learnersOnPod: 9,
  serveNow: false,
  ...wording,
  ...over,
})

describe('servesLearners — the slugs the player resolves', () => {
  it('knows pod-0 and pod-1 are served', () => {
    expect(SERVING_POD_SLUGS).toContain('pod-0')
    expect(SERVING_POD_SLUGS).toContain('pod-1')
    expect(servesLearners({ slug: 'pod-0', podType: 'core' })).toBe(true)
    expect(servesLearners({ slug: 'pod-1', podType: 'core' })).toBe(true)
  })
  it('a parked slug is not served', () => {
    expect(servesLearners({ slug: 'pod-0-unrecorded', podType: 'core' })).toBe(false)
  })
  it('a non-core pod on a serving slug is not served — the resolver filters pod_type', () => {
    expect(servesLearners({ slug: 'pod-0', podType: 'choice' })).toBe(false)
  })
})

describe('learnersAtRisk — the refusal names who, never "policy"', () => {
  it('names both numbers when it can', () => {
    expect(learnersAtRisk({ learnersOnCourse: 12, learnersOnPod: 9 })).toMatch(/9 of this course's 12 learners/)
  })
  it('says "0 learners currently" rather than staying silent', () => {
    expect(learnersAtRisk({ learnersOnCourse: 0, learnersOnPod: 0 })).toMatch(/0 learners currently/)
  })
  it('says UNAVAILABLE when the count could not be read', () => {
    expect(learnersAtRisk({ learnersOnCourse: null, learnersOnPod: null })).toMatch(/unavailable/i)
  })
})

describe('servingRefusal — one rule, five doors', () => {
  it('REFUSES a write onto a serving slug', () => {
    const r = servingRefusal(serving())
    expect(r).toBeTruthy()
    expect(r).toMatch(/pod-0/)
    expect(r).toMatch(/9 of this course's 12 learners/)
    expect(r).toMatch(/--serve-now/)
  })
  it('REFUSES a held pod — visibility is never a guard', () => {
    expect(servingRefusal(serving({ podVisibility: 'held' }))).toBeTruthy()
  })
  it('REFUSES a pod that does not exist yet — creating the header row IS the serving', () => {
    const r = servingRefusal(serving({ podExists: false, podVisibility: null, rows: 0, learnersOnPod: 0 }))
    expect(r).toBeTruthy()
    expect(r).toMatch(/does not exist yet/)
  })
  it('REFUSES when the learner count is unavailable — never allows on an unmeasured risk', () => {
    expect(servingRefusal(serving({ learnersOnCourse: null, learnersOnPod: null }))).toMatch(/unavailable/i)
  })
  it('carries the call site’s own wording, so each door explains its own harm', () => {
    const r = servingRefusal(serving())
    expect(r).toMatch(/This does the thing/)
    expect(r).toMatch(/here is what it does to them/)
    expect(r).toMatch(/Do it somewhere parked instead/)
  })
  it('is NOT a wall: serveNow goes through, because progress must never block a swap', () => {
    expect(servingRefusal(serving({ serveNow: true }))).toBeNull()
  })
  it('allows a parked slug', () => {
    expect(servingRefusal(serving({ slug: 'pod-0-unrecorded' }))).toBeNull()
  })
})
