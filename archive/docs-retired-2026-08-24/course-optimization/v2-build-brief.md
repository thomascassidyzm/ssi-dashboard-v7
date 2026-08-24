# zho_for_eng v2 — controlled regeneration brief (orchestrator frame)

*Frame, not a checklist. For a capable orchestrator. 2026-06-15.*

## The goal (the why)

Regenerate the Chinese course **from the encoded methodology** (prose + gates + pair-contract) and
prove it produces a course **at least as good as v1 with no manual ZUT/contract hand-holding**. If it
does, the encoding is the system-wide lever — apply the same prompt+gates to regenerate all ~70
courses. zho is the controlled experiment, not a one-off rebuild.

## What's fixed vs what's regenerated

- **FIXED (shared with v1):** the seed sentences. `canonical_seeds` (668) + `canonical_seed_translations`
  zho (668) give every seed's **English intention + Chinese sentence**. The golden path auto-fills
  `course_seeds` for a new course from these on first POST. So the A/B holds the sentences constant.
- **REGENERATED:** the **decomposition** (LEGOs A/M + components) and the **practice phrases**
  (component/build/use) — i.e. the whole methodology layer — under the encoded gates.

## Immovable constraints (loud)

- **Gated route only.** Build through the **golden path `POST /api/seed/complete`** — it is the *only*
  route that runs the encoded gates. `routes/v2.cjs` (the staged parallel pipeline) runs tiling+vocab
  ONLY — using it would bypass the experiment. (To parallelise at scale, the gates must first be wired
  into v2.cjs — see Areas.)
- **Sequential.** Vocabulary accumulates seed-by-seed; seed N can only use vocab from seeds 1..N-1 +
  earlier LEGOs in N. Build strictly in order.
- **Isolated lane.** `course_code = zho_for_eng_v2`, POST to the local gated instance
  **`http://localhost:3481`** (`BUILD_MANAGER=off`, current main code). Prod course-builder (Camberley
  :3471) is untouched. All writes land as `status=draft` — nothing serves.
- **TEXT-ONLY. NO TTS.** Audio is a separate, approval-gated step after Tom reviews the text. Never
  trigger synthesis in the build.
- **No role-guard trip.** POST without `x-agent-role: creator` (creators get 403); submit as checker/unset.

## The gates ARE the quality bar (act on them, don't fight them)

| gate | behaviour |
|---|---|
| tiling | HARD — the seed Chinese must rebuild from the LEGO targets |
| vocab | HARD — phrases use only introduced vocab |
| phrase-ZUT | **phrase-granular HOLD-OUT** — a colliding practice phrase is held out (not the seed); `zut_held_out` + `zut_collisions` in the response → consolidate or differentiate, resubmit just that phrase |
| LEGO-ZUT | HARD — a LEGO's known→target conflict is the seed's core wiring; fix it |
| frame-coverage | WARN — USE baskets vary along the new-distinction axis (Principle 7); convergence pairs exempt |
| known-side | WARN (contract-gated) — every English prompt composes from introduced glosses + free class + licensed constructions |
| metadata-gloss | WARN — debuts give a producible intention, not a grammar label |

Warnings are signal, not noise — a clean run with few warnings is the success criterion.

## The authoring move (per seed)

An authoring agent, for seed N: reads N's English+Chinese (canonical) + the **accumulated LEGO
inventory** for `zho_for_eng_v2` (query `course_legos`) → decomposes the Chinese per
`ralph-methodology.md` + `synonym-choice-architecture.md` + the zho pair-contract → authors
build/use phrases (frame-diversity, vocab-tiling, ZUT) → `POST /api/seed/complete` → acts on the gate
response (fix held-out/errors, ≤1 retry) → records the verdict.

## Directions / phases

1. **Prove (this hour):** seeds 1–6 (cold-start) through the lane → eyeball vs v1.
2. **Stress the gates:** a mid-range slice (e.g. ~R200–215) where accumulated vocab makes ZUT/frame
   collisions real — the early seeds barely exercise them.
3. **Proof tier:** seeds 1–150 (Tom's decided proof span).
4. **Full:** 668. Decide parallelisation here (see Areas).

## Areas to think through

- **Parallel scale.** Sequential 668 is slow. Options: (a) wire the 4 encoded gates into `v2.cjs` so
  the staged parallel pipeline enforces them (decompose-parallel → order-respecting finalize →
  phrase-parallel), or (b) keep golden-path sequential and accept the wall-clock. The experiment's
  integrity needs the gates either way.
- **Comparison metric vs v1.** What says "v2 ≥ v1"? Candidates: gate-clean rate, frame-diversity score
  (tools/audit-frame-diversity.cjs), ZUT-collision count, vocab efficiency (legos/seed), human ear on
  a sample. Pick a small honest set before scaling.
- **Seed-rendering.** We hold the English rendering fixed (v1/canonical). The seed-rendering reframe
  (canon=intentions, per-pair rendering) is deferred — note any seed whose English itself forces a ZUT
  problem, don't fix it inline.
- **Two-role split.** The gates do the mechanical checking; a human-style checker adds naturalness/gloss
  judgment. For the experiment we lean on prompt+gates (minimal manual judgment) so the result measures
  the *encoding*. Revisit if quality needs a checker pass.

## Pointers (don't duplicate)

- Methodology: `ralph-methodology.md`, `synonym-choice-architecture.md`
- Contract: `docs/pair-contracts/zho_for_eng.contract.cjs` (+ `_TEMPLATE` for other pairs)
- Gates: `services/course-builder/lib/validation.cjs`; golden path `routes/seed-complete.cjs`
- Lane: `BUILD_MANAGER=off COURSE_BUILDER_PORT=3481 node services/course-builder-api.cjs`
- Reorder pilot / data: `docs/course-optimization/WORKLIST.md`
