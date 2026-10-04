/**
 * podAtoms.ts — Popty's own atom-resolution helpers for the Listening Lab.
 *
 * NOT vendored: this is Popty code, and tools/sync-pod-engine.sh does not
 * touch it. It was lifted out of the vendored `stage0Sequence.ts` when Stage 0
 * was retired (Tom, 2026-09-19: "we retired Stage 0 on the pods / We should
 * just have Stages from 1 onwards"). The ladder went; these two lookups did
 * not. Pod explainer clips ("<target> means <gloss>", "[atom] <surface>",
 * role pod_explainer) were removed estate-wide on 2026-10-04 (Tom,
 * r-2026-10-04-pod-explainer-clips); this resolves atoms to text only.
 */
import type { AtomMapEntry } from './podEngine'

export interface ResolvedAtom {
  targetSurface: string
  gloss: string
}

export function resolveAtoms(atomMap: AtomMapEntry[] | null | undefined): ResolvedAtom[] {
  return (atomMap || [])
    .filter((e) => e.kind === 'atom' || e.kind === 'passthrough')
    .map((e) => ({ targetSurface: e.target_surface, gloss: e.gloss }))
}
