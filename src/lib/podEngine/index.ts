// ─────────────────────────────────────────────────────────────────────────────
// Vendored pod composition engine — barrel.
// Canonical source: @ssi/core/pods. See the per-file GENERATED banners and
// tools/sync-pod-engine.sh. Vendored so Popty's single-repo Vercel build has the
// engine without the cross-repo @ssi/core file: link. Import the SAME functions
// the learner's main flow runs (buildMainStage, ROLE_SPEED, …).
//
// Stage 0 is retired (Tom, 2026-09-19), so the vendored stage0Sequence.ts is
// gone with it. Pod Lab's own atom lookups live in ../podAtoms — Popty code,
// not vendored.
// ─────────────────────────────────────────────────────────────────────────────
export * from './atomMap'
export * from './podStageComposition'
