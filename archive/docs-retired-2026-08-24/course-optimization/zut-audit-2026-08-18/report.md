# ZUT compliance audit — fra_for_eng / spa_for_eng, 2026-08-18

Read-only re-run of the existing rescoped audit tool (`scripts/_audit-phrase-zut.cjs`, gitignored
workspace copy — script itself untouched). Run from `.a74-scratch/a137-zut-audit-0818/` (two levels
deep, so the script's checked-in `../../` require paths resolve without editing the script). Only
SELECT queries against Supabase; the script's only write is its own local JSON snapshot.
**Zero DB writes, zero content changes.** Raw JSON snapshots alongside this report:
`zut-audit-fra_for_eng.json`, `zut-audit-spa_for_eng.json`.

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

## Against the calibration priors — and against the 2026-08-15 run

Baseline from the 2026-07-04 sweep (pilot → rescope → fix-sweep): fra strict bidirectional was 110;
fra/spa target-membership failures were 72/76 pre-fix-sweep, of which 99/148 got cut and 44 logged
as judgment-forks — expect either mostly-noise (wrong check unit) or mostly-orphans (batch debris),
pilot ~40 before committing to a strategy.

**This run's numbers are not just consistent with the 2026-08-15 audit — they are byte-for-byte
identical.** Diffed both raw JSON snapshots (`docs/course-optimization/zut-audit-2026-08-15/` vs
this directory) after key-sorting: zero bytes of difference on both fra and spa, every violation
group, every example row, every seed number matches exactly. Three weeks after the 2026-07-04
fix-sweep and three days since the last audit, **nothing in either course's ZUT-relevant surface
(course_legos, course_practice_phrases, course_seeds target text) has moved at all.**

Since the 2026-08-15 report already did the evidence-pull pilot this protocol calls for (12 items
with full seed context — 6 fra, 6 spa — plus 2 membership spot-checks), and the underlying data is
proven identical, that pilot's classification stands without re-doing the pulls:

- **11 of 12 bidirectional-strict items were grammar the plain-string check can't see, not
  defects**: number/gender agreement (fra "ready" prêt/prêts, "beautiful" beau/beaux; spa "good"
  bueno/buena), aspect (spa "it was" fue/era — preterite vs imperfect, forced by Spanish grammar),
  register (spa "you're doing it" estás/está — R6 tu-first working correctly), true known-side
  polysemy (fra/spa "that" — demonstrative vs conjunction), and one genuine synonym fork (fra "to
  leave" partir/quitter, already in the manual's open-items list).
- **1 of 12 was a confirmed defect**: spa "a good idea" — component "Una idea buena" (adjective-
  after-noun) against sibling seed 189's correct "una buena idea" — swapped-decomposition-halves
  (catalog #2), (c)-cut candidate, not applied.
- That's ~92% non-defect / 8% real — same shape as the original 2026-07-04 pilot's 93%/7% split,
  now confirmed stable across two independent audit dates on unchanged data.
- Membership failures: spa "the"→"los" absent from seed 434 — genuine orphan (catalog #1). fra
  "because"→"parce que" absent from seed 421's "...parce **qu'ils**..." — not a content defect but
  a gate gap: `normalizeForContainment` (`services/course-builder/lib/text-normalization.cjs:29`)
  doesn't strip/normalise apostrophe elision, so a correctly-stored elided component fails the
  containment check on elision alone.

## What a follow-up sweep should look like

1. **Don't sweep bidirectional-strict (81 spa / 101 fra) as a content queue.** Confirmed twice now:
   it's dominated by inflectional agreement, aspect, register and true polysemy the bare-known-
   string check structurally cannot see. The lever here is a scope ruling (compare known+register/
   agreement-tag, not bare known string) — a check-unit fix, same lesson as the original rescope,
   not row-by-row triage.
2. **Membership failures (20 spa / 23 fra) are the one bucket worth a real content pass** — small
   enough to fully evidence-pull in one pilot, same shape as the fix-sweep that cleared 99/148.
   Fix the gate first: extend `normalizeForContainment` to strip/normalise elision (apostrophes)
   before matching. That's a mechanical (a)/(b) win expected to convert some fraction of the 43
   from "membership failure" to "clean" with zero content edits — do this before any per-row
   triage, per the same "check the check before you sweep the content" lesson as 2026-07-04.
3. **Target-side collisions (34 spa / 77 fra) remain informational only** — still flagged in the
   rescope as an unconfirmed reading of Tom's brief, still not enforced by the live gate. No action
   implied; needs a ruling before it's ever treated as a queue.
4. **No fixes applied. No content, gate code, or audit tool modified this pass.**

## Honesty note

This pass leaned on the 2026-08-15 pilot's per-item evidence-pull rather than repeating it, because
the raw data is provably byte-identical between the two dates — re-pulling the same 12 seed rows
would have re-derived the identical answer. If a future pass finds the data has since diverged from
this snapshot, that pilot classification should be re-run fresh rather than assumed to still hold.
