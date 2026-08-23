// The hold gate as the RESOLVER sees it (Tom, 2026-08-23).
//
// listening_pods.visibility is enforced in RLS for the learner app, but every
// Popty surface reads with the service role and sees held pods perfectly well.
// So the resolver has to carry the rule itself, and these tests pin the two
// halves of it: excluded by default, and NOT excluded for admin callers who
// explicitly ask.
//
// The fail-closed test is the one that matters. A caller that forgets to select
// the column must get null, not the pod — because the failure mode on the other
// side of that choice is held content reaching a learner.

import { describe, it, expect } from 'vitest'
import { pickServingPod, isLivePod, SERVING_SLUGS } from './servingPod.js'

const pod = (slug, visibility, extra = {}) => ({
  id: `cym_n_for_eng:${slug}`, slug, pod_type: 'core', visibility, ...extra,
})

describe('pickServingPod — held pods and the learner-facing default', () => {
  it('serves a live pod', () => {
    expect(pickServingPod([pod('pod-0', 'live')]).slug).toBe('pod-0')
  })

  it('never serves a held pod by default', () => {
    expect(pickServingPod([pod('pod-0', 'held')])).toBeNull()
  })

  it('falls through a held pod-1 to a live pod-0 rather than serving the held one', () => {
    // The preference order still applies — it just applies to the live pods.
    expect(pickServingPod([pod('pod-1', 'held'), pod('pod-0', 'live')]).slug).toBe('pod-0')
  })

  it('FAILS CLOSED: a row with no visibility column is not servable', () => {
    // A thin projection must not become a hole in the gate.
    expect(pickServingPod([{ id: 'x:pod-0', slug: 'pod-0', pod_type: 'core' }])).toBeNull()
  })

  it('includeHeld gives admin listings the held pod back, unchanged', () => {
    expect(pickServingPod([pod('pod-0', 'held')], { includeHeld: true }).slug).toBe('pod-0')
    expect(pickServingPod([pod('pod-1', 'held'), pod('pod-0', 'live')], { includeHeld: true }).slug).toBe('pod-1')
  })

  it('includeHeld does not resurrect a retired or non-core pod', () => {
    // The hold gate is additive to the existing rules, never a bypass of them.
    expect(pickServingPod([pod('pod-0-retired-2026-08-22', 'live')], { includeHeld: true })).toBeNull()
    expect(pickServingPod([pod('pod-0', 'live', { pod_type: 'aux' })], { includeHeld: true })).toBeNull()
  })

  it('isLivePod is the single expression of "live", and it is exact', () => {
    expect(isLivePod({ visibility: 'live' })).toBe(true)
    expect(isLivePod({ visibility: 'held' })).toBe(false)
    expect(isLivePod({})).toBe(false)
    expect(isLivePod(null)).toBe(false)
  })

  it('leaves the serving slug allowlist alone', () => {
    expect(SERVING_SLUGS).toEqual(['pod-1', 'pod-0'])
  })
})
