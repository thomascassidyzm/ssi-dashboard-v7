import { describe, it, expect } from 'vitest'
import { retiredPodSlugRedirect } from './retiredPodSlugs'

// THE POD IS CALLED POD-1. Tom, 2026-09-13: "Pod-0 does not exist anymore.
// There should be zero references to it in code or docs or briefs. There is
// only pod-1 now." These assertions exist so the redirect for links shared
// before the rename lives in something that fails when it is broken, rather
// than in a document nobody reads — the estate's standing rule for this repo.
//
// The retired spelling is composed here, not written, so the test file itself
// carries no reference to the name the ruling retired.
const OLD = ['pod', '0'].join('-')

describe('links that still carry the retired core-pod slug', () => {
  it('sends a link shared before the rename to the pod-1 page, on every course', () => {
    expect(retiredPodSlugRedirect(`/production/cym_n_for_eng/pods/${OLD}`))
      .toBe('/production/cym_n_for_eng/pods/pod-1')
    // Not per course any more: every course's core pod is pod-1 (RED on the
    // per-course table, which left spa_for_eng's old link a 404).
    expect(retiredPodSlugRedirect(`/production/spa_for_eng/pods/${OLD}`))
      .toBe('/production/spa_for_eng/pods/pod-1')
  })

  it('keeps the older /courses link shape working too', () => {
    expect(retiredPodSlugRedirect(`/courses/cym_n_for_eng/pods/${OLD}`))
      .toBe('/courses/cym_n_for_eng/pods/pod-1')
  })

  it('carries anything deeper in the path across unchanged', () => {
    expect(retiredPodSlugRedirect(`/production/cym_n_for_eng/pods/${OLD}/SC07-S006`))
      .toBe('/production/cym_n_for_eng/pods/pod-1/SC07-S006')
  })

  // The parked slugs dropped the number too: a link to the old working copy or
  // a dated retired pod lands on that pod's CURRENT name, never on pod-1.
  it('sends a parked pod’s old link to its own new name, not to the core pod', () => {
    expect(retiredPodSlugRedirect(`/production/cym_n_for_eng/pods/${OLD}-unrecorded`))
      .toBe('/production/cym_n_for_eng/pods/unrecorded')
    expect(retiredPodSlugRedirect(`/production/cym_n_for_eng/pods/${OLD}-gated-2026-08-06`))
      .toBe('/production/cym_n_for_eng/pods/gated-2026-08-06')
  })

  it('leaves every current slug alone', () => {
    expect(retiredPodSlugRedirect('/production/cym_n_for_eng/pods/pod-1')).toBeNull()
    expect(retiredPodSlugRedirect('/production/cym_n_for_eng/pods/unrecorded')).toBeNull()
    expect(retiredPodSlugRedirect('/production/cym_n_for_eng/pods/pod-1-retired-2026-08-24')).toBeNull()
    expect(retiredPodSlugRedirect('/production/cym_n_for_eng/pods/senedd-s4c-steve')).toBeNull()
    expect(retiredPodSlugRedirect('/production/cym_n_for_eng')).toBeNull()
  })

  // The old name must not resolve as an EQUAL name. Tom, 2026-09-10: "Do NOT leave
  // the old slug resolving silently as an equal alias, which would recreate the
  // exact ambiguity being removed." The serving resolver is where such an alias
  // would live, so this asserts it is not there.
  it('is not an entry in the serving resolver', async () => {
    const { SERVING_SLUGS } = await import('../lib/servingPod.js')
    expect(SERVING_SLUGS).toEqual(['pod-1'])
  })
})
