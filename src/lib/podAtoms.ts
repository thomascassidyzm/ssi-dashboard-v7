/**
 * podAtoms.ts — Popty's own atom-resolution helpers for the Listening Lab.
 *
 * Pod Lab's fusion-shapes explorer resolves a sentence's atoms to their real
 * per-atom "[atom] <surface>" clips (course_audio role 'pod_atom') and falls
 * back to them when a chunk has no Take-G slice. These are NOT explainers:
 * the explainer clips ("<target> means <gloss>", role pod_explainer) were
 * removed estate-wide on 2026-10-04 (Tom, r-2026-10-04-pod-explainer-clips),
 * but the atom slices survive under their own role.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AtomMapEntry } from './podEngine'

export const POD_ATOM_ROLE = 'pod_atom'

export interface ResolvedAtom {
  targetSurface: string
  gloss: string
  /** course_audio "[atom] <target>" id, when the course has one */
  targetClipId: string | null
}

/**
 * Normalise an atom surface for "[atom] <surface>" clip lookup. Case-insensitive
 * (a sentence-initial "Come" must resolve the same slice as a mid-sentence
 * "come" — single-word TTS sounds identical) but ACCENT-preserving (so "È"=is
 * stays distinct from "e"=and). MUST be applied identically where the map is
 * built (loadPodAtomClipMaps) and here, or ~10% of atoms silently drop.
 */
export const normSurface = (s: string): string => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()

export function resolveAtoms(
  atomMap: AtomMapEntry[] | null | undefined,
  targetClipBySurface: Map<string, string>,
): ResolvedAtom[] {
  return (atomMap || [])
    .filter((e) => e.kind === 'atom' || e.kind === 'passthrough')
    .map((e) => ({
      targetSurface: e.target_surface,
      gloss: e.gloss,
      targetClipId: targetClipBySurface.get(normSurface(e.target_surface)) ?? null,
    }))
}

/** Course-wide lookup: normalised target_surface → course_audio "[atom] <target>" id. */
export async function loadPodAtomClipMap(
  supabase: SupabaseClient,
  courseCode: string,
): Promise<Map<string, string>> {
  const targetClipMap = new Map<string, string>()
  const { data } = await supabase
    .from('course_audio')
    .select('id, text')
    .eq('course_code', courseCode)
    .eq('role', POD_ATOM_ROLE)
    .like('text', '[atom] %')
  for (const a of (data || []) as Array<{ id: string; text: string }>) {
    const surface = normSurface(a.text.slice('[atom] '.length))
    if (!targetClipMap.has(surface)) targetClipMap.set(surface, a.id)
  }
  return targetClipMap
}
