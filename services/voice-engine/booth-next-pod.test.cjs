import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { nextPodFor } = require('./booth-next-pod.cjs')

// Dan's shape: pod-1 (held, status draft — the pod he is recording), a staged
// draft pod, an archived one, then a topic pod with lines owed, plus LEGOs.
const line = (podSlug, recorded, extra = {}) => ({ kind: 'pod', courseCode: 'cym_s_for_eng', podSlug, podId: `cym_s_for_eng:${podSlug}`, podTitle: `${podSlug} title`, recorded, ...extra })
const PODS = new Map([
  ['cym_s_for_eng:pod-1', { id: 'cym_s_for_eng:pod-1', visibility: 'held', metadata: { status: 'draft', gated: false } }],
  ['cym_s_for_eng:health', { id: 'cym_s_for_eng:health', visibility: 'held', metadata: { staged_draft: {} } }],
  ['cym_s_for_eng:old', { id: 'cym_s_for_eng:old', visibility: 'held', metadata: { archived: true } }],
  ['cym_s_for_eng:market', { id: 'cym_s_for_eng:market', visibility: 'held', metadata: { status: 'draft' } }],
])

describe('nextPodFor — the pod a finished pod link offers next', () => {
  it('skips staged-draft and archived pods, but not a held pod being recorded', () => {
    const lines = [
      line('health', false), line('market', false), line('old', false),
      line('pod-1', true), line('pod-1', true),
      { kind: 'lego', courseCode: 'cym_s_for_eng', recorded: false },
    ]
    const r = nextPodFor(lines, 'pod-1', PODS)
    expect(r.nextPod).toMatchObject({ podSlug: 'market', remaining: 1, podTitle: 'market title' })
    expect(r.remainingOutsidePods).toBe(1)
  })

  it('never offers the current pod, and wraps round to an earlier pod with lines owed', () => {
    const lines = [line('market', false), line('pod-1', false)]
    expect(nextPodFor(lines, 'pod-1', PODS).nextPod.podSlug).toBe('market')
    expect(nextPodFor(lines, 'market', PODS).nextPod.podSlug).toBe('pod-1')
  })

  it('a takeg line counts toward its pod; a full pod id names the current pod too', () => {
    const lines = [line('pod-1', true), line('market', true), line('market', false, { kind: 'takeg' })]
    expect(nextPodFor(lines, 'cym_s_for_eng:pod-1', PODS).nextPod.podSlug).toBe('market')
  })

  it('null when every other pod is recorded or not offered — the "all done" case', () => {
    const lines = [line('pod-1', true), line('market', true), line('health', false), line('old', false)]
    expect(nextPodFor(lines, 'pod-1', PODS)).toEqual({ nextPod: null, remainingOutsidePods: 0 })
  })

  it('F39: a bare slug shared by two courses names the pod of the link\'s course', () => {
    const other = (slug, recorded) => line(slug, recorded, { courseCode: 'cym_n_for_eng', podId: `cym_n_for_eng:${slug}` })
    // The other course's pod-1 comes FIRST, with its own market owed straight after: a bare-slug match picks it and offers cym_n's market.
    const lines = [other('pod-1', true), other('market', false), line('pod-1', true), line('market', false)]
    const r = nextPodFor(lines, 'pod-1', new Map(), 'cym_s_for_eng')
    expect(r.nextPod).toMatchObject({ podId: 'cym_s_for_eng:market' })
  })
})
