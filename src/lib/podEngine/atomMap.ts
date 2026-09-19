// ─────────────────────────────────────────────────────────────────────────────
// GENERATED — DO NOT EDIT BY HAND.
// Canonical source: @ssi/core/pods (ssi-learning-app/packages/core/src/pods).
// Vendored here because Popty's Vercel build is single-repo and can't resolve
// the @ssi/core file: link at build time. This is a VERBATIM copy of the one
// engine the learner runs — not a re-implementation. Re-sync after any change
// to the canonical source with:  bash tools/sync-pod-engine.sh
// ─────────────────────────────────────────────────────────────────────────────

/**
 * atomMap.ts — the per-atom breakdown a pod sentence carries on its row.
 *
 * `atom_map` is authored in Popty and rides on every
 * `listening_pod_sentences` row. It is DATA about a sentence, not a playlist:
 * nothing composes audio from it. The Stage-0 breakdown ladder that used to
 * (stage0Sequence.ts) is retired — Tom, 2026-09-19: "we retired Stage 0 on the
 * pods / We should just have Stages from 1 onwards" — so this type is all that
 * outlived it. Its live readers are podStageComposition's PodSentenceRow and
 * usePodLapScheduler's per-sentence split, which regroups the atoms when a
 * silence-split turn is flattened into its sentences.
 */
export interface AtomMapEntry {
  lego_key: string
  kind: 'atom' | 'passthrough' | 'note'
  gloss: string
  target_surface: string
  target_start_ms?: number | null
  target_end_ms?: number | null
}
