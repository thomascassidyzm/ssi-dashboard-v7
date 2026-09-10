// WHICH PODS THE PRODUCTION PODS PAGE STOPS SHOWING (Tom, 2026-09-10).
//
// "what the hell is this abomination of a page??? why are we even displaying
// the old archived PODS?" — said over the Welsh row
// `pod-0-gated-2026-08-06`, an empty placeholder titled "[ARCHIVED …] [GATED …]
// … superseded by pod-0-unrecorded, kept for rollback".
//
// Every fixture below is a real row copied out of `listening_pods` on
// 2026-09-10, because the rule is only worth anything against the estate it has
// to survive. The two tests that matter are the two NEGATIVE ones: a HELD pod is
// not parked, and a serving slug is never parked. Get either wrong and this
// filter hides the 231-line pod Aran is recording.

import { describe, it, expect } from 'vitest'
import { podParkedReason, isParkedPod, partitionPods } from './servingPod.js'

const row = (slug, title, sentence_count = 231, extra = {}) => ({
  id: `cym_n_for_eng:${slug}`, slug, title, pod_type: 'core',
  visibility: 'held', sentence_count, ...extra,
})

describe('podParkedReason — production bookkeeping, off the working page', () => {
  it('parks the abomination row Tom was reading', () => {
    expect(podParkedReason(row(
      'pod-0-gated-2026-08-06',
      '[ARCHIVED 2026-08-11] [GATED 2026-08-06] placeholder — sentences moved to '
        + 'cym_n_for_eng:pod-0-unrecorded until Aran/Catrin record them — superseded '
        + 'by pod-0-unrecorded, kept for rollback',
      0,
    ))).toBe('gated')
  })

  it('parks both switchover generations by slug suffix', () => {
    expect(podParkedReason(row('pod-0-retired-2026-08-22', 'German … Pod 0', 142))).toBe('retired')
    expect(podParkedReason(row('pod-1-retired-2026-08-24', 'German … Pod 1'))).toBe('retired')
    expect(podParkedReason(row('pod-1-staged-2026-08-23', 'Syrian Arabic … working copy'))).toBe('staged')
  })

  it('parks a title-marked pod even when its slug looks clean', () => {
    // The marker sweep is the other half: a slug can be renamed back, a title
    // saying [RETIRED] still means retired.
    expect(podParkedReason(row('some-pod', '[RETIRED 2026-08-22] Arabic Listening Pods'))).toBe('retired')
    expect(podParkedReason(row('some-pod', 'placeholder — superseded by pod-1'))).toBe('superseded')
  })

  it('parks a non-serving pod holding nothing at all', () => {
    expect(podParkedReason(row('leftover', 'Leftover', 0))).toBe('empty')
  })

  it('does NOT park a HELD pod — held is the state of live work', () => {
    // cym_n_for_eng:pod-1, 231 lines, held, the pod Aran is recording tonight.
    expect(isParkedPod(row('pod-1', 'Northern Welsh Listening Pods — Pod 1'))).toBe(false)
  })

  it('does NOT park a serving slug, even an empty one', () => {
    // An empty pod-0 is a fact the producer must SEE, not a row to hide.
    expect(podParkedReason(row('pod-0', 'Welsh Listening Pods — Pod 0', 0))).toBeNull()
  })

  it('does NOT park choice pods or the unrecorded working copy', () => {
    expect(isParkedPod(row('senedd-s4c-steve', 'Senedd: allegations of bullying at S4C', 567, { pod_type: 'choice' }))).toBe(false)
    expect(isParkedPod(row('music', 'Spanish Choice Pod — Music (*Música*)', 749, { pod_type: 'choice' }))).toBe(false)
    expect(isParkedPod(row('travel-situations', 'Spanish Situational Pod — Travel Situations', 72, { pod_type: 'choice' }))).toBe(false)
    expect(isParkedPod(row('method-pod', 'Italian Method Pod — Tom and Aran Talk Bollocks', 309))).toBe(false)
    expect(isParkedPod(row('pod-0-unrecorded', 'Bulgarian … Pod 0 — UNRECORDED working copy, not learner-facing'))).toBe(false)
  })
})

describe('partitionPods — what the page shows, and in what order', () => {
  it('shows Welsh its real pod and its choice pod, and parks the placeholder', () => {
    const { current, parked } = partitionPods([
      row('senedd-s4c-steve', 'Senedd: allegations of bullying at S4C', 567, { pod_type: 'choice' }),
      row('pod-0-gated-2026-08-06', '[ARCHIVED 2026-08-11] [GATED 2026-08-06] placeholder', 0),
      row('pod-1', 'Northern Welsh Listening Pods — Pod 1'),
    ])
    // The serving pod reads first — "what is the state of this course's content".
    expect(current.map((p) => p.slug)).toEqual(['pod-1', 'senedd-s4c-steve'])
    expect(parked.map((p) => p.slug)).toEqual(['pod-0-gated-2026-08-06'])
  })

  it('never empties a course: every course in the estate keeps its serving pod', () => {
    const { current } = partitionPods([
      row('pod-0-retired-2026-08-22', '[RETIRED 2026-08-22] German … Pod 0', 142),
      row('pod-1-retired-2026-08-24', '[RETIRED 2026-08-24] German … Pod 1'),
      row('pod-1', 'German Listening Pods — Pod 1', 231, { visibility: 'live' }),
    ])
    expect(current.map((p) => p.slug)).toEqual(['pod-1'])
  })
})
