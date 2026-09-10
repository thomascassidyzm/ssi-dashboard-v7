import { describe, it, expect } from 'vitest'
import { RETIRED_POD_SLUGS, retiredPodSlugRedirect } from './retiredPodSlugs'

// THE POD IS CALLED POD-1. Tom, 2026-09-10: "THERE IS NO POD-0 anymore by name,
// so giving it that slug name is legacy naming debt, we will trip up over it
// again at a later date with new agents." These assertions exist so the rule
// lives in something that fails when it is broken, rather than in a document
// nobody reads — the estate's standing rule for this repo.
describe('the retired pod-0 slug on cym_n_for_eng', () => {
  it('sends a pod-0 link shared before the rename to the pod-1 page', () => {
    expect(retiredPodSlugRedirect('/production/cym_n_for_eng/pods/pod-0'))
      .toBe('/production/cym_n_for_eng/pods/pod-1')
  })

  it('keeps the older /courses link shape working too', () => {
    expect(retiredPodSlugRedirect('/courses/cym_n_for_eng/pods/pod-0'))
      .toBe('/courses/cym_n_for_eng/pods/pod-1')
  })

  it('carries anything deeper in the path across unchanged', () => {
    expect(retiredPodSlugRedirect('/production/cym_n_for_eng/pods/pod-0/SC07-S006'))
      .toBe('/production/cym_n_for_eng/pods/pod-1/SC07-S006')
  })

  // pod-0-unrecorded is a DIFFERENT pod with its own 61 provenance rows. A prefix
  // match would send it somewhere that does not exist.
  it('does not catch a longer slug that merely starts the same way', () => {
    expect(retiredPodSlugRedirect('/production/cym_n_for_eng/pods/pod-0-unrecorded')).toBeNull()
    expect(retiredPodSlugRedirect('/production/cym_n_for_eng/pods/pod-0-gated-2026-08-06')).toBeNull()
  })

  // 44 courses still hold the REAL slug pod-0. Redirecting theirs would send them
  // to a pod that does not exist, which is why the table is keyed per course.
  it('leaves every course that has not been re-slugged alone', () => {
    expect(retiredPodSlugRedirect('/production/cym_s_for_eng/pods/pod-0')).toBeNull()
    expect(retiredPodSlugRedirect('/production/spa_for_eng/pods/pod-0')).toBeNull()
  })

  it('is a tombstone and says so: one dated entry, not a general alias', () => {
    expect(RETIRED_POD_SLUGS).toEqual([
      { courseCode: 'cym_n_for_eng', from: 'pod-0', to: 'pod-1', retiredOn: '2026-09-10' },
    ])
  })

  // The old name must not resolve as an EQUAL name. Tom, 2026-09-10: "Do NOT leave
  // the old slug resolving silently as an equal alias, which would recreate the
  // exact ambiguity being removed." The serving resolver is where such an alias
  // would live, so this asserts it is not there.
  it('is not an entry in the serving resolver', async () => {
    const { SERVING_SLUGS } = await import('../lib/servingPod.js')
    expect(SERVING_SLUGS[0]).toBe('pod-1')
    expect(SERVING_SLUGS).not.toContain('cym_n_for_eng:pod-0')
  })
})
