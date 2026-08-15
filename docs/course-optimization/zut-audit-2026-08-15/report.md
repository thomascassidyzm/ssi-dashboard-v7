# ZUT compliance audit — fra_for_eng / spa_for_eng, 2026-08-15

Read-only run of the existing rescoped audit tool (checked in as `scripts/_audit-phrase-zut.cjs`
— relocated there from `tools/course-optimization/` at some point without updating its `../../`
require paths; run from a two-levels-deep scratch copy so the paths resolved, no source edits).
**Zero writes.** Raw JSON snapshots: `zut-audit-fra_for_eng.json`, `zut-audit-spa_for_eng.json`
(same directory as this report).

## Counts

| | spa_for_eng | fra_for_eng |
|---|---|---|
| rows scanned (of which component) | 17,803 (1,123) | 17,551 (1,780) |
| distinct normalized knowns | 15,533 | 14,247 |
| [1] bidirectional — gate-exact | 514 | 114 |
| [1] bidirectional — case-insensitive | 115 | 101 |
| [1] bidirectional — **strict** | **81** | **101** |
| [2] target-membership failures | **20** | **23** |
| [3] target-side collisions (informational, not enforced) | 34 | 77 |

## Against the calibration priors

Baseline from the 2026-07-04 sweep (pilot → rescope → fix-sweep, `docs/course-optimization/`):
fra strict bidirectional was 110 (pre- and post-rescope this bucket is unchanged by rescope, it's
target-membership that the rescope touched); fra/spa target-membership failures were 72 and 76
pre-fix-sweep, of which 99/148 got cut and 44 logged as judgment-forks.

**Five weeks on, target-membership is down hard**: fra 72→23, spa 76→20 — consistent with the
2026-07-04 fix-sweep's cuts holding and not regrowing at any real rate. Bidirectional strict is
flat (fra 101 vs prior ~110; spa wasn't reported at this tier before, gate-exact 514 today).

## Pilot: 12 items pulled with full seed context (evidence standard, not a sweep)

Per the sweep protocol (pilot ~40 before committing to a strategy), I pulled seed text for 12
bidirectional-strict items (6 fra, 6 spa) plus checked `normalizeForContainment`'s actual
behaviour against 2 membership failures. Full detail: seed rows queried live, not re-saved (no
new artifact — see queries in this session's transcript if needed).

**11 of 12 bidirectional items were grammar the check can't see, not defects**:
- Number/gender agreement: fra "ready" (prêt/prêts, sg vs pl subject), "beautiful" (beau/beaux),
  spa "good" (bueno/buena, masc default vs fem noun).
- Aspect (unmarked in English, obligatory in Spanish): spa "it was" (fue/preterite completed
  event vs era/imperfect description) — a real production fork, but forced by Spanish grammar,
  not an authoring error; needs a methodology ruling, not a data fix.
- Register (tu/usted): spa "you're doing it" (estás/está, plain vs "madam") — this is R6 working
  correctly, not broken.
- True known-side polysemy: fra/spa "that" (demonstrative cette/eso vs conjunction que) — a real
  ZUT concern per R1/R5 but a differentiation question for Tom, not a row-level fix.
- Genuine synonym fork: fra "to leave" (partir intransitive vs quitter+object) — matches the
  already-logged fra synonym/register-fork bucket in the manual's open items.

**1 of 12 was a confirmed defect**: spa "a good idea" — component row target "Una idea buena"
(adjective-after-noun) against sibling seed 189's correct "una buena idea". Reads like the
swapped-decomposition-halves failure mode (catalog #2). (c)-cut candidate; not applied.

That's ~92% non-defect / 8% real on this micro-sample — same shape as the original pilot's 93%
noise / 7% real, months after the rescope supposedly fixed the check's unit. **The bidirectional-
strict bucket is still dominated by inflectional agreement, aspect, register and true polysemy the
plain-string check has no way to see** — pointing at another scope-narrowing ruling (agreement-
aware / register-aware comparison) rather than a row-by-row content sweep.

**Membership failures are a different story**: spot-checked 2 —
- spa "the"→"los" not found anywhere in seed 434's target: genuinely absent, looks like a real
  orphan (catalog #1).
- fra "because"→"parce que" not found in seed 421's target "...parce **qu'ils**...": confirmed
  `normalizeForContainment` (`services/course-builder/lib/text-normalization.cjs:29`) does not
  strip or normalise apostrophe elision — so any component that stores the unelided form loses
  the membership check even though it's the correct literal chunk. This is the elision near-miss
  bucket the rescope's substring rule already improved on for *whitespace* tokenization but never
  extended to elision itself (catalog item, rescope §2 lists elision as a solved case for the
  word-split problem, not for the containment string match itself).

## What a follow-up sweep should look like

1. **Don't sweep bidirectional-strict as a content queue.** Pilot suggests it's still mostly
   grammar-conditioned variation, not defects — the fix is a scope ruling (compare known+register/
   agreement-tag, not bare known string) or accept-and-log, matching the original 2026-07-04
   lesson: "the mix flips completely depending on which check produced the queue."
2. **Membership failures (20 spa / 23 fra) are worth a real pass** — small enough to fully
   evidence-pull (all 43 rows) in one pilot, same shape as the fix-sweep that cleared 99/148. Given
   `normalizeForContainment` doesn't handle elision, expect a mechanical (a)/(b) sub-bucket for
   elided components before the orphan-cut bucket — i.e. a small gate fix (elision-aware
   normalisation) likely converts some of these 43 from "membership failure" to "clean" without
   touching content at all, which should happen *before* any per-row triage.
3. **Target-side collisions (34 spa / 77 fra) are informational only** and were explicitly flagged
   in the rescope as "not the implementer's reading of Tom's brief, not confirmed" — still open,
   still not enforced; no action implied by these counts.
4. No fixes were applied in this pass. No content, gate code, or audit tool was modified.
