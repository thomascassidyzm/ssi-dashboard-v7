import { describe, it, expect } from 'vitest'
const { servingPodId } = require('./serving-pod-id.cjs')
const { SERVING_POD_SLUGS } = require('../pods/serving-slug.cjs')

// A supabase-js client stub: listening_pods rows filtered the way fetchServingSlug filters.
const clientWith = (rows) => ({
  from: () => ({
    select: () => ({
      eq: (_col, course) => ({
        in: (_c, slugs) => Promise.resolve({
          data: rows.filter(r => r.course_code === course && slugs.includes(r.slug)), error: null,
        }),
      }),
    }),
  }),
})

describe('servingPodId', () => {
  it('resolves the pod the course serves, never a literal', async () => {
    const id = await servingPodId(clientWith([
      { id: 'fra_for_eng:pod-1', course_code: 'fra_for_eng', slug: 'pod-1', pod_type: 'core' },
    ]), 'fra_for_eng')
    expect(id).toBe('fra_for_eng:pod-1')
    expect(SERVING_POD_SLUGS).toContain('pod-1')
  })
  it('a parked slug is not a serving pod: unrecorded reads as "no pods" and the tool fails loudly', async () => {
    await expect(servingPodId(clientWith([
      { id: 'fra_for_eng:unrecorded', course_code: 'fra_for_eng', slug: 'unrecorded', pod_type: 'core' },
    ]), 'fra_for_eng')).rejects.toThrow(/no serving core pod/)
  })
})
