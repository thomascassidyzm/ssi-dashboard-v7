/**
 * podAtoms.ts — Popty's own atom-resolution helpers for the Listening Lab.
 *
 * NOT vendored: this is Popty code, and tools/sync-pod-engine.sh does not
 * touch it. It was lifted out of the vendored `stage0Sequence.ts` when Stage 0
 * was retired (Tom, 2026-09-19: "we retired Stage 0 on the pods / We should
 * just have Stages from 1 onwards"). The ladder went; these two lookups did
 * not, because Pod Lab's fusion-shapes explorer resolves a sentence's atoms to
 * their real "[atom] <surface>" clips and their "means <gloss>" clips to build
 * seam rungs — nothing to do with the retired breakdown ladder.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AtomMapEntry } from './podEngine'

export interface ResolvedAtom {
  targetSurface: string
  gloss: string
  /** course_audio "[atom] <target>" id, when the course has one */
  targetClipId: string | null
  /** pod_legos.explainer_audio_id — the merged "<target> means <gloss>" clip */
  meansGlossClipId: string | null
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
  meansGlossByLego: Map<string, string>,
  targetClipBySurface: Map<string, string>,
): ResolvedAtom[] {
  return (atomMap || [])
    .filter((e) => e.kind === 'atom' || e.kind === 'passthrough')
    .map((e) => ({
      targetSurface: e.target_surface,
      gloss: e.gloss,
      targetClipId: targetClipBySurface.get(normSurface(e.target_surface)) ?? null,
      meansGlossClipId: meansGlossByLego.get(e.lego_key) ?? null,
    }))
}

/**
 * Load the two course-wide atom lookup maps:
 *   - glossMap: lego_key → pod_legos.explainer_audio_id ("means <gloss>")
 *   - targetClipMap: normalised target_surface → course_audio "[atom] <target>" id
 */
export async function loadPodAtomClipMaps(
  supabase: SupabaseClient,
  courseCode: string,
): Promise<{ glossMap: Map<string, string>; targetClipMap: Map<string, string> }> {
  const glossMap = new Map<string, string>()
  const targetClipMap = new Map<string, string>()
  const [legoRes, atomRes] = await Promise.all([
    supabase.from('pod_legos').select('lego_key, explainer_audio_id').eq('course_code', courseCode),
    supabase.from('course_audio').select('id, text').eq('course_code', courseCode).eq('role', 'pod_explainer').like('text', '[atom] %'),
  ])
  for (const l of (legoRes.data || []) as Array<{ lego_key: string; explainer_audio_id: string | null }>) {
    if (l.explainer_audio_id) glossMap.set(l.lego_key, l.explainer_audio_id)
  }
  for (const a of (atomRes.data || []) as Array<{ id: string; text: string }>) {
    const surface = normSurface(a.text.slice('[atom] '.length))
    if (!targetClipMap.has(surface)) targetClipMap.set(surface, a.id)
  }
  return { glossMap, targetClipMap }
}
