# Phrase Decomposition Spec

## Why

Practice phrases on the player side currently get decomposed into LEGO blocks at runtime by `LegoAssembly.vue` (substring alignment, gap-filling, ghost-tile fallback). When that alignment can't find a clean chunk match — common in Chinese, where word boundaries aren't whitespace and the same surface chars can recur — it falls back to per-character ghost tiles. That breaks the SSi up-chunking principle: a phrase that should read as three reusable LEGOs renders as seven loose characters, inflating cognitive load instead of growing it.

The fix is to move decomposition **up-stream**: do it at phrase-construction time in the dashboard, when full visibility of the seed → LEGO graph is available, and let an editor see/correct it. The runtime keeps a safety-net path so we never violate the integrity contract: every audible word has a tile, every tile maps to an audible word.

## Schema

New column on `course_practice_phrases`:

```sql
ALTER TABLE course_practice_phrases
  ADD COLUMN decomposition jsonb,
  ADD COLUMN decomposition_course_version integer;
```

`decomposition` is an ordered array of blocks:

```json
[
  { "legoId": "S0042L02", "target": "我想",  "known": "I want",    "isGhost": false },
  { "legoId": "S0017L01", "target": "学",    "known": "to learn",  "isGhost": false },
  { "legoId": null,       "target": "中文",  "known": "Chinese",   "isGhost": true  }
]
```

- `legoId`: the LEGO whose `target_text` this block matches (null for ghost residue).
- `target`: the substring of the phrase's `target_text` this block covers. Concatenated, they must equal `target_text` exactly (allowing whitespace normalisation).
- `known`: best-effort English mapping for the block (for the per-component known display under intro/debut tiles). For ghost blocks this can be `""` or a heuristic guess.
- `isGhost`: true when the block isn't a declared LEGO but is a grokable encounter (per the SSi methodology rule: any token seen inside an earlier M-LEGO target_text is grokable).

`decomposition_course_version` is the version stamp of the course's LEGO set at the time the decomposition was computed (see Drift below).

## Build-time algorithm

Inputs: `course_code`, the phrase's `target_text`, its `seed_number`.

1. Load the vocabulary set `V` = all LEGOs in `course_code` with `seed_number ≤ phrase.seed_number`. No status filter — if a row exists in `course_legos`, it's part of the course (the lego_id encodes its seed; presence in the table is the only test). Order `V` by descending `target_text` length.
2. Scan `target_text` left-to-right. At each position, attempt to match the longest LEGO target_text from `V` starting at that position.
3. If a LEGO matches, emit a block `{ legoId, target, known: lego.known_text, isGhost: false }` and advance past the match.
4. If nothing matches, advance by one token (one char for Chinese/Japanese/Thai; one whitespace-separated word otherwise), emit a ghost block, continue.
5. Coalesce adjacent ghost blocks of the same kind only if they form a single token in the original text — never merge separate tokens into a fake unit (see methodology memory `project_ssi_grokable_encounter_tier`).
6. Validate: `concat(blocks[].target) == target_text` after normalising whitespace. If not, throw — never persist an invalid decomposition.

Store the result on the phrase row. Stamp `decomposition_course_version` with the course's current LEGO-set version.

## Recompute triggers

Decompositions go stale when the LEGO set changes. Cheapest reliable scheme:

- Maintain `courses.version` (integer column added by migration 20260518_courses_version_stamp.sql). Bump it on any insert, update of `target_text`/`known_text`/`seed_number`, or delete in `course_legos`.
- On phrase save, write `decomposition_course_version = courses.version`.
- A nightly (or on-demand) recompute job walks phrases whose stored version is behind the current version and re-runs the algorithm.
- Per-LEGO recompute can be more targeted later (only phrases containing the changed text), but version-stamp + lazy recompute gets us correctness without the bookkeeping cost.

## Runtime contract (player side)

In `LearningPlayer.vue` / `LegoAssembly.vue`:

1. If `cycle.decomposition` is present, **validate** it: every block has a `target`; concatenation equals the cycle's `target.text`. If valid, use it directly — no alignment needed.
2. If absent or invalid, fall back to the existing runtime alignment logic (`alignComponentsToFullText` + `ensureTileCoverage`).
3. Regardless of path, enforce: `concat(rendered tiles) == cycle.target.text`. If a build-time decomposition fails this, **log and fall back** — never render an inconsistent state. This is the integrity contract.

The runtime never has to *invent* chunks once decomposition is good; it just renders. Ghost tiles render as ghost (dashed border, no audio binding required — audio plays as one cycle-level stream anyway). The current alignment code stays in the codebase as the fallback; we don't delete it.

## Drift detection

A dashboard validator (`/api/production/:courseCode/decomposition-audit`) can:

- Count phrases where `decomposition IS NULL` (never computed).
- Count phrases where `decomposition_course_version < courses.version` (stale).
- Re-run the algorithm dry and flag phrases where the new decomposition differs from the stored one (e.g. a newly-added LEGO would now absorb characters previously ghosted).

Editors can review the diff and accept/reject — this is the path where adding an M-LEGO retroactively improves all downstream phrase chunking, with human confirmation.

## Phasing

1. **Schema migration**: add `decomposition` and `decomposition_course_version` columns; add `courses.version` to `courses`. Backfill empty.
2. **Build-time algorithm**: implement in `course-data-service.cjs` or alongside the phrase save path in `course-builder-api.cjs`. Wire into every phrase-create and phrase-update.
3. **Backfill job**: one-shot recompute for every existing phrase across all courses. This is where we discover edge cases — chunked output gets visually QA'd against the current runtime output before being trusted.
4. **Runtime opt-in**: the player reads `cycle.decomposition` and uses it when valid, falling back otherwise. Initially gate behind a feature flag per course so we can A/B against the runtime-only path.
5. **Validator UI**: a Popty page that shows the drift count and lets editors trigger recompute / review changes.
6. **Eventual simplification**: once decompositions are trusted across the catalogue, the runtime alignment path can be slimmed down — but kept as the safety net forever, because the integrity contract is non-negotiable.

## Open questions

- ~~Status filter for `V`~~ — **resolved**: no status filter. Presence in `course_legos` is the test.
- **Cross-seed visibility**: a phrase on seed 42 should be able to chunk against any LEGO from seed 1–41, including spaced-rep LEGOs the learner has retired. That's "all introduced", not "currently in rotation".
- **Known-text mapping for ghost blocks**: the methodology rule is that ghost = grokable from earlier M-LEGO context, so we *could* look up which earlier M-LEGO's component map covers this surface form and copy its `known` value. Worth a follow-up.
- **Hyphenation / carriage mode** for long M-LEGOs: the current runtime splits long M-LEGOs into wagon groups. Build-time decomposition produces flat block lists; the wagon-split can stay at render time (it's pure visual layout).
