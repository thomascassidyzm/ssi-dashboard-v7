import { describe, it, expect } from 'vitest'
import { loadPodAtomClipMap, resolveAtoms } from './podAtoms'

// Pod Lab's per-atom "[atom] <target>" slices are role 'pod_atom', not an
// explainer. Reading role 'pod_explainer' (all deleted in #641) empties the map.
describe('loadPodAtomClipMap', () => {
  it('reads atom clips from role pod_atom and resolves atoms against them', async () => {
    const roles: string[] = []
    const b: any = {
      select: () => b,
      eq: (c: string, v: string) => { if (c === 'role') roles.push(v); return b },
      like: () => b,
      then: (r: any) => r({ data: [{ id: 'a1', text: '[atom] Hola' }] }),
    }
    const map = await loadPodAtomClipMap({ from: () => b } as any, 'x_for_eng')
    expect(roles).toEqual(['pod_atom'])
    const out = resolveAtoms([{ kind: 'atom', target_surface: 'hola', gloss: 'hi', lego_key: 'k' } as any], map)
    expect(out[0].targetClipId).toBe('a1')
  })
})
