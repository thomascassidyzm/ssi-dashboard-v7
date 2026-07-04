# ZUT compliance audit — read-only, 2026-07-04

*Requested to verify the owner's assertion that phrase-level ZUT compliance in the latest
pipeline means cue/target mismatches "should never have ambiguity." No fixes applied here —
count + verdict only, per the ask. Reproducible via `node tools/course-optimization/audit-phrase-zut.cjs`.*

## Verdict: the gate exists, but it is new-submission-only and does not cover any content already in the database

`checkPhraseZUT` (phrase-level, `services/course-builder/lib/validation.cjs:630`) and
`checkLegoConflict` (LEGO-level, same file:476) are real, working ZUT gates — not aspirational.
But they are wired into exactly two routes:

- `services/course-builder/routes/seed-complete.cjs`
- `services/course-builder/routes/seed-translate.cjs`

i.e. the agent-submission golden path for **new** seeds (`POST /api/seed/complete`,
`POST /api/seed/translate`). Grepping the rest of the course-builder routes
(`edit-cascade.cjs`, `build.cjs`, `components.cjs`, `qa.cjs`, `checkpoint.cjs`, etc.) turns up
no calls to either gate — inline edits, regeneration, and checkpoint flows are not gated.
Nor is any retroactive/background sweep wired up: nothing re-checks existing rows once they're
in the database. And critically, **direct-DB scripts bypass it entirely** — every fold-in
script from today's session (this one included: `apply-cut-it-out-115.cjs`,
`apply-empieces-bind-281.cjs`, and every other worker's `apply-*.cjs` in
`tools/course-optimization/`) writes to Supabase directly via `services/supabase-client.cjs`,
never touching `/api/seed/complete`. So today's own edits were verified by hand
(before/after assertions + manual collision queries), not by this gate.

So: **new seeds submitted through the golden path get real ZUT protection. Everything else —
the pre-existing course body, any edit-flow change, any direct-DB fold-in pass — is
unprotected.** The owner's expectation ("should never have ambiguity") does not hold for
existing content, and the gap is structural, not a bug to patch quietly.

## Live violation count (course-wide, both directions of "same known → different targets")

Method: fetched every `course_legos` + `course_practice_phrases` row for each course, grouped
by normalized `known_text`, and checked whether the same known text maps to 2+ distinct
normalized `target_text` values. Three normalization tiers, tightest last:

| Tier | Normalization | spa_for_eng | fra_for_eng |
|---|---|---|---|
| gate-exact | verbatim `checkPhraseZUT` rules (case-sensitive target) | 887 | 353 |
| case-insensitive | + lowercases target (removes lego-vs-phrase capitalization noise, e.g. "cuánto tiempo" vs "Cuánto tiempo") | 506 | 340 |
| strict | + strips ¿¡«»'’ (removes Spanish/French inverted-punctuation noise the live gate's own char class misses, e.g. "has oído" vs "¿Has oído?") | **473** | **340** |

The gate-exact tier is inflated by two normalization gaps in the *live gate itself*
(case-sensitivity, missing ¿¡ in its strip regex) — those aren't real methodology violations,
just the same content in lego-gloss form vs full-sentence form. The **strict tier is the
closest read on genuine phrase-level ZUT violations**: **473 in spa_for_eng, 340 in
fra_for_eng.** Full data (every group, all three tiers) is reproducible on demand via
`node tools/course-optimization/audit-phrase-zut.cjs` — not committed as a static JSON
(same call as the parenthetical audit above: too large to push reliably over this session's
connection).

## Confirmed: the owner's seed-162 example is real

Course-wide search on fra_for_eng for known "do you think" (not just within seed 162):

| Row | Seed | Known | Target |
|---|---|---|---|
| lego | 162 | do you think | tu penses |
| build `S0162L01B01`/`B02` | 162 | do you think | tu penses |
| lego | 316 | do you think | **penses-tu** |
| build `S0316L01B01` | 316 | do you think | **penses-tu** |
| component `S0337L03C01` | 337 | do you think | **penses-tu** |

Byte-identical English prompt, two genuinely different French production forms
(declarative-order "tu penses" vs inverted-question "penses-tu") depending on which seed the
learner is in — exactly the ambiguity ZUT is meant to prevent, and exactly the kind of
violation `checkLegoConflict` would hard-reject on a fresh submission. It survives today only
because seeds 162/316/337 predate the gate and nothing re-checks existing rows.

(Also noticed in passing, not investigated further: `S0162L01B01` and `B02` are themselves a
byte-identical duplicate row — same known, same target, both build role. Separate issue from
ZUT, not counted in the totals above.)

## Not done here (by design — read-only ask)
No violations were fixed or triaged individual-by-individual. 473 + 340 = 813 groups is real
content-authoring/consolidation work (CONSOLIDATE to one target or DIFFERENTIATE the English
prompt per seed, per `ralph-methodology.md`'s ZUT resolution guidance) — a scoping call for
Tom, not a mechanical sweep in this pass.
