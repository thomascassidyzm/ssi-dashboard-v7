# ZUT rescope for component-role rows — Tom's ruling, 2026-07-04

*Follow-up to `zut-violation-sweep-pilot-fra-40.md` (`c9dae030`), which found ~93% of a
40-item sample of flagged violations were `phrase_role:'component'` rows colliding on the
KNOWN side — not real methodology defects. Tom's ruling:*

> "Component rows for tiling are often NOT part of the sentence — they are often LITERAL
> translations. They are exempt from ZUT in known language — but not in target language.
> They MUST be part of the target sentence of course."

This implements exactly that, for `course_practice_phrases` rows with `phrase_role:'component'`
only (`course_legos` rows are never components — `type` is always `M`/`A`, confirmed empirically
against both courses). LEGOs, BUILD, and USE phrases keep the full, unchanged bidirectional check.

## What changed

**`checkPhraseZUT`** (`services/course-builder/lib/validation.cjs`) and the audit
(`tools/course-optimization/audit-phrase-zut.cjs`, kept in lockstep):

1. **Known-side exemption.** A component row's `known_text` is never used to group/flag it
   against other rows, in either direction — not flagged for its own known→target pairing, and
   never used as a rejection reason for someone else's phrase. Pass `role: 'component'` on a
   phrase object to opt in (`checkNewPhrases`/`checkEditedPhrase` in `zut-gate.cjs` forward this).
   Phrases with no `role` (build/use, or any caller that doesn't pass it) get the exact prior
   behavior — no caller needed to change unless it can submit components.
2. **New target-membership check.** A component's `target_text` must still be a genuine
   constituent of its own seed's target sentence (`course_seeds.target_text`, same
   `seed_number`). Pass `seedNumber` alongside `role: 'component'`.

   **Matching rule (documented per the task brief's request):** plain **substring**
   containment — `normalizeForContainment(seedTarget).includes(normalizeForContainment(target))`
   — not the word-multiset `checkWordContainment` used elsewhere in this file for "does this
   phrase contain its LEGO" (which deliberately tolerates word *reordering*, needed there for
   e.g. German bracket constructions). A component is supposed to be a **literal, contiguous**
   slice of the sentence, not a reordered word-set, so contiguous substring is the more faithful
   test — and it is what actually matches the tiling's own elision/inversion conventions.
   **This mattered in practice**: an early attempt using word-based (whitespace-split)
   containment produced large false-positive counts against French subject-verb inversion
   ("voulons-**nous**", "pourront-**ils**") and elision-fused tokens ("**qu'**il", "t'**appelles**")
   — none of which introduce a space where the component's characters sit, so a word-split check
   wrongly called them non-members. Plain substring resolved those for free.

3. **Real call-site wiring.** Components only ever reach `checkPhraseZUT` through two paths in
   this codebase (confirmed by reading every call site of `checkPhraseZUT`/`checkNewPhrases`/
   `checkEditedPhrase`): `POST /components/backfill` (`components.cjs`, the M-LEGO component
   generator) and `PATCH /phrases/:id` (`qa.cjs`, the Fixer agent's direct-edit endpoint). Both
   now pass `role`/`seedNumber`. Every other wired route (`seed-complete.cjs`, `build.cjs`,
   `v2.cjs`, `drafts.cjs`) only ever submits build/use phrases through this check — unchanged.

## Re-run results (rescoped audit, `node tools/course-optimization/audit-phrase-zut.cjs`)

| Category | fra_for_eng | spa_for_eng |
|---|---|---|
| **[1] bidirectional** (LEGO/BUILD/USE vs LEGO/BUILD/USE, unchanged check) — strict tier | **110** | **338** |
| **[2] target-membership failures** (component target not in its own seed's sentence) | **72** | **76** |
| **[3] target-side collisions** (component-only known groups still disagreeing among themselves — informational, NOT enforced) — strict tier | **79** | **34** |

For reference, the pre-rescope strict count (mixing all roles indiscriminately, from the pilot's
fresh re-run) was **340** for fra_for_eng. Bucket [1] alone (110) shows the known-side exemption
clears roughly two-thirds of what used to be counted for French — consistent with the pilot's
finding that ~93% of a 40-item sample were component-known-side noise, not real defects.

### [2] target-membership: composition, from a manual read of a sample (NOT baked into the
tool's output — supplementary triage for this report only, matching how the original pilot
hand-read its 40-item sample before trusting the count)

Reading a sample of the failures against their seed's actual sentence split into three very
different buckets:

- **Real orphans (~65-75% of the failures on this sample)** — the component's target has **zero
  relation** to its own seed's sentence at all, e.g. `S0132L01C01` ("I'll be able to" → "Podré")
  filed against seed 132, whose actual sentence is "that's less exciting than what she was
  saying" / "eso es menos emocionante que lo que ella estaba diciendo" — no shared words, and the
  row's sibling at the same `lego_index` ("that"→"eso") is correct. This looks like **stale/
  orphaned rows** left behind by an earlier decomposition version or a renumbering pass that
  didn't clean up superseded components — a different, and probably more serious, defect class
  than the "literal-idiom-gloss" case Tom's ruling was written about. Not investigated further
  here (task scope is counts/classification, not root-cause).
- **Near-misses from interposed words (~10-15%)** — e.g. `"they came" -> "ils sont venus"` not
  found in seed "ils sont **tous les deux** venus seuls": the component's words ARE all present
  and in order, but the real sentence inserts extra material between them, so contiguous
  substring fails. Arguably still "part of the sentence" in a looser sense; needs a
  human/agent call on whether that's acceptable tiling or itself a defect.
- **Contraction mismatches (small remainder)** — e.g. `"of" -> "de"` not found in "C'est à côté
  **du** parking" (du = de+le, a genuine French contraction, not elision). A gloss showing the
  dictionary form where the sentence uses a contracted form.

**Recommendation for the (separate, future) fix sweep:** triage this the same way the 40-item
pilot did — read each failure against its seed and sibling rows before acting, since the mix
above means a blind "delete everything the check flags" pass would be wrong for the interposed-
word and contraction buckets.

### [3] target-side collisions — definition note

This bucket is **not specified verbatim** by Tom's one-line ruling (which only mentions the
target-membership requirement) — it's my reading of the task brief's request to report
"target-side ZUT collisions" as a category distinct from membership failures. Defined here as:
a normalized `known_text` used **only** by component rows (no LEGO/BUILD/USE row shares it),
where those components still disagree with each other on `target_text`. It is **reported for
visibility only** — not enforced by the live gate, since Tom's ruling exempts components from
known-side checks without qualification. Flagging this distinction explicitly in case the
intended meaning was something else — happy to re-cut the report if so.

## Tests

- `services/course-builder/lib/zut-gate.test.cjs` — added 3 unit tests directly against
  `checkPhraseZUT`: component known-side collision accepted, component target-membership
  rejection, non-component behavior unchanged.
- `services/course-builder/routes/components-backfill-zut.test.cjs` — rewrote the ad183ea8 test
  that asserted a component known-side collision was *rejected* (now asserts **accepted**, per
  the ruling) and added a new test asserting a component with a non-member target is
  **rejected**. Golden path test retained.
- Full course-builder suite: 40/40 passing (9 files) after the rescope.

## Explicitly out of scope here (per task brief)

No violations were fixed — this is counts and classification only. The fix sweep (triaging the
72+76 membership failures and deciding what to do about the stale-orphan-row hypothesis) is a
separate, future step.
