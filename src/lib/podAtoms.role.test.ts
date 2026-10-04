import { describe, it, expect } from 'vitest'
import { loadPodAtomClipMaps } from './podAtoms'

// Pod Lab's per-atom "[atom] <target>" slices are role 'pod_atom', not an
// explainer. Reading role 'pod_explainer' (deleted in #641) would empty the map.
describe('loadPodAtomClipMaps role', () => {
  it('reads atom clips from role pod_atom', async () => {
    const roles: string[] = []
    const q: any = (table: string) => {
      const b: any = {
        select: () => b,
        eq: (c: string, v: string) => { if (c === 'role') roles.push(v); return b },
        like: () => b,
        then: (r: any) => r({ data: table === 'course_audio' ? [{ id: 'a1', text: '[atom] hola' }] : [] }),
      }
      return b
    }
    const { targetClipMap } = await loadPodAtomClipMaps({ from: q } as any, 'x_for_eng')
    expect(roles).toEqual(['pod_atom'])
    expect(targetClipMap.size).toBe(1)
  })
})
