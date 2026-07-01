// ─────────────────────────────────────────────────────────────────────────────
// Vendored pod composition engine — barrel.
// Canonical source: @ssi/core/pods. See the per-file GENERATED banners and
// tools/sync-pod-engine.sh. Vendored so Popty's single-repo Vercel build has the
// engine without the cross-repo @ssi/core file: link. Import the SAME functions
// the learner's main flow runs (composeSentenceArc, loadStage0ClipMaps, …).
// ─────────────────────────────────────────────────────────────────────────────
export * from './stage0Sequence'
export * from './podStageComposition'
