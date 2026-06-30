# Plan — Audio fill + atom-mapping sweep (fleet-wide)

*Drafted 2026-06-30. Owner: Tom. Status: DRAFT — awaiting TTS-cost approval before any render run.*

## Goal

Two separable jobs, deliberately **not** conflated:

- **Axis 1 — Atom/breakdown sweep.** Give every pod course the per-INTENTION
  4-movement breakdown (`whole → known → per-atom [target + "means X"] → whole`)
  that we proved on `ita_for_eng`. Per course this means: flat **tiling**
  `atom_map`s + rendered `[atom]` slices + "means" clips, then **verify 100%
  resolution**.
- **Axis 2 — Course-audio gap-fill.** Render the missing `known` / `target1` /
  `target2` clips on seeds (and pod sentences) so courses are complete to their
  intended boundary.

Both are **idempotent** (skip what exists) and **verified per course** before a
course is marked done.

## Current state (measured 2026-06-30)

**Axis 1 — only `ita_for_eng` is swept** (142 turns, 294 intentions, 900
drillable atoms, **100% resolution** after the case-insensitive fix). 64 pod
courses exist; 47 are silence-split (a prerequisite for per-intention), 17 are
not. `hrv_for_eng` has *old coarse* atom_maps + 521 `[atom]` slices from an
earlier pass → needs a **re-sweep** to the keep-together flat model (idempotent).

**Axis 2 — seed-audio completeness across 94 courses:**

| State | Courses | Action |
|---|---|---|
| 0 — unrendered | 19 | **Out of scope** (these are launch decisions, not fill) |
| ~MVP done (1–320) | 42 | Fill back-half ONLY if promoted past MVP |
| partial back-half (321–660) | 15 | Finish to target |
| full (661+) | 18 | Done |

## Scope decisions (defaults set; change here)

1. **MVP-cap by default.** Fill seed audio to **~300 (the MVP boundary)**; go
   full-668 only on explicitly-flagged flagship courses. Rationale: the
   back-half is content most learners never reach — it's the bulk of the cost
   for the least value, and we already cap surfaced content at ~300.
2. **Croatian first**, as the pilot-of-the-pipeline (proves the fleet recipe on
   a real course before spending on ~60). Then fan out to live/with-learners
   courses, then the rest.
3. **The 19 unrendered courses are out of scope** for this plan (launch calls).

## The recipe (per course)

### Axis 1 — atom sweep
1. **Prereq:** course pod must be silence-split (`sentence_audio_ids`). If not,
   run the split first (the 2026-06-16 silence-split tooling).
2. `node tools/breakdown-flat.cjs <course> [--dry]` — authors the flat tiling
   `atom_map` per turn and renders `[atom]` slices + "means" clips. Granularity =
   **intention is the unit, atoms explain the construction, best-fit per
   language-pair** (break only where it reveals a reusable construction; keep
   useful multi-word chunks whole). Voices auto-read from `voice_config`
   (`target1` → atom in the target language, `known` → means in English).
   Idempotent. `--dry` does LLM authoring only (no TTS, no writes — outside the
   cost gate); use it to preview granularity + get the render count first.
3. **Verify:** `node tools/verify-breakdown.cjs <course>` — must report **0
   partition fails, 100% whole/known/means, 100% `[atom]` slice** (exits non-zero
   on any hole). The case-insensitive resolver is in both composers; expect 100%.
4. Spot-check a few turns in the dashboard Listening Config preview.

### Axis 2 — audio fill
1. Identify gaps: per course, seeds (and pod sentences) missing
   `known/target1/target2` audio, up to the MVP boundary (or full, if flagged).
2. Render the missing clips with the course's own `voice_config` voices
   (known / target1 / target2). Idempotent (dedup by text+voice+role).
3. **Verify:** coverage = 100% up to the boundary; the speed-ramp `voice_config`
   is intact (`target1.settings.speed === 1.0`, per the ramp rule).

## TTS cost (the approval gate)

Rendering audio costs money (CLAUDE.md gate) — **no render run starts without
sign-off.** Rough order of magnitude:
- **Axis 1 per pod course:** ~1,000–1,800 short clips (`[atom]` slices dedup by
  surface, "means" by lego_key). `hrv` is lighter (~521 slices already exist).
- **Axis 2 per course:** up to ~300 × 3 (known/V1/V2) to the MVP cap, fewer where
  partially done.
- **Fleet total** lands in the low hundreds of dollars; **Croatian alone is a few
  dollars.** Exact per-course counts are produced (dry-run) before each run and
  recorded in the worklist below.

## Execution (multi-agent, since agents + tokens are spare)

- **Parallel by course.** One agent per course, after Croatian proves the recipe
  end-to-end. Each agent: dry-run count → (on approval) render → **verify** →
  report holes. Idempotent, so a re-run is always safe.
- **The tools are committed** (`tools/breakdown-flat.cjs`, `tools/verify-breakdown.cjs`)
  so parallel agents on fresh checkouts have them; voices self-configure from
  `voice_config`, so no per-course tuning.
- **A manifest tracks per-course state across both axes** so nothing is
  double-done or silently skipped.

## Worklist (per-course state — fill as we go)

| Course | Split? | Atom-swept? | Atom-verified | Seed audio (to cap) | Notes |
|---|---|---|---|---|---|
| ita_for_eng | ✓ | ✓ | 100% | full (668) | the proven template |
| hrv_for_eng | 92/142 | old coarse → **re-sweep** | — | complete to ~300 (Aran @207) | **PILOT NEXT** + Aran wants a pod1 |
| … | | | | | fan out after Croatian |
