# Phrase-level ZUT audit — read-only, 2026-08-11

*Reset-eve spare-capacity pass. Read-only against Supabase (SELECT only, no writes to course
content). Ran `tools/course-optimization/audit-phrase-zut.cjs` against `fra_for_eng` and
`spa_for_eng`, the same two courses and the same script used in the July sweep sequence
(pilot → rescope → fix-sweep). The script's own full-detail JSON output
(`zut-audit-{course}.json`, written next to the script) is covered by
`docs/course-optimization/**/*.json` in `.gitignore` — by design, these are working artifacts, not
committed. This doc is the durable record; re-run the script to regenerate the raw snapshot.*

## Gap first: the audit tool itself was missing from `main`

`tools/course-optimization/audit-phrase-zut.cjs` — the tool the sweep-protocol doctrine names —
does **not exist on `main`**. It was authored and used entirely on
`origin/feat/cue-library-v1-spa-foldin-sweep` (commits `4beb089a`, then rescoped in `1cde09e5`)
and never merged, consistent with `[Popty branches diverge; cherry-pick, never merge]`. Same for
the three source docs the manual cites (`zut-violation-sweep-pilot-fra-40.md`,
`zut-rescope-component-rows-2026-07-04.md`, `zut-membership-fix-sweep-summary-2026-07-04.md`) —
none are on `main`. I pulled the rescoped script (`1cde09e5`, the version with the target-membership
check) read-only via `git show`, ran it unmodified, and am committing it to `main` here since it's
inert (SELECT-only) and the doctrine assumes it's available. I am **not** cherry-picking the docs —
those stay wherever Tom wants them; this commit only restores the tool + today's snapshots.

## Numbers

| | fra_for_eng | spa_for_eng |
|---|---|---|
| total rows scanned | 17,551 | 17,803 |
| component rows | 1,780 | 1,123 |
| distinct normalized knowns | 14,247 | 15,533 |
| **[1] bidirectional strict** (LEGO/BUILD/USE vs LEGO/BUILD/USE — the real ZUT violations) | **101** | **81** |
| [2] target-membership failures (component target not a substring of its own seed) | **23** | **20** |
| [3] target-side collisions (component-only groups, informational, not enforced) | 77 | 34 |

## Reading the distribution against the July calibration priors

**[2] target-membership is not a fresh queue — it's the same 44 judgment calls from July, still
sitting there, correctly untouched.** The 2026-07-04 fix sweep (`d10141ed`) drove membership
failures from 148 (72 fra + 76 spa) down to 44 (23 fra + 21 spa) via 99 deletions + 5 fixes, and
explicitly logged the residual 44 as `(d) judgment-fork — log only, no action` (grammar the
substring check can't express: elision, clitic fusion, interposed words, pipe-annotation rows,
one stacked defect at `S0664L01C01`). Today's fra count is **23 — an exact match**. Today's spa
count is **20 — one fewer than the logged 21**, meaning one item has been resolved somewhere in
the last five weeks (not investigated further here; not a regression). **The direct read: nobody
has broken anything in bucket [2] since July, and there is no new membership-failure sweep to run
— the residue is the already-adjudicated judgment pile, most of which needs Tom's ruling on the
open items in the doctrine (§8 "Open decisions"), not another triage pass.**

**[1] bidirectional dropped hard since the July baseline, more than the fix sweep alone explains.**
The fix sweep's own before/after table records bucket [1] as *untouched* by that sweep — 110 fra /
338 spa, unchanged pre/post. Today: **101 fra (-9) / 81 spa (-257, an 76% drop)**. Fra is roughly
where it was — plausibly natural drift (a handful of seeds touched since). Spa's collapse from 338
to 81 is too large to be background noise and is not explained by anything in the docs available on
`main` or the pulled feature-branch history — **explicit gap: I did not find the commit(s) that did
this work, and am not asserting a cause.** Two honest candidates, neither confirmed: (a) a
bidirectional ZUT sweep on spa happened in a session/branch I don't have visibility into, or (b) a
broader spa content edit (e.g. a register/tu-first pass, given `tu-default-pass-fra-dryrun-log.json`
exists for fra — an spa equivalent may exist elsewhere) incidentally resolved most of these as a
side effect. Worth Tom confirming which, since either changes what a follow-up sweep should assume
as its starting point.

**[3] target-side collisions has no July baseline to compare against** — it's informational-only
(not enforced by the live gate) and the fix-sweep doc only tracked buckets [1] and [2]. 77 fra / 34
spa today, first-ever measurement on `main`.

## What a follow-up sweep would look like

Per the sweep protocol (§7 of the manual):

1. **Bucket [2] (membership, 43 items combined): skip triage, go straight to Tom.** These are
   already individually classified from July — 34ish "grammar the check can't see" (not defects,
   log only) and ~10 "real decision candidates" (his call — synonym/register/seed-vs-sibling
   forks). No new pilot needed; the existing classification should just be re-surfaced as a
   decision list, and bucket [2] itself is close to fully resolved as a *class* of defect (99/148
   were orphans and they're gone).
2. **Bucket [1] (bidirectional, 182 combined) is where a real pilot is now warranted** — it's
   *never* had the pilot-then-classify treatment applied at today's scale, and fra's mild residual
   plus spa's unexplained cliff both deserve a look. Pilot ~40 items (spread across both courses,
   weighted toward spa given the bigger and less-explained bucket), evidence standard = full seed +
   all siblings per item (never the bare fragment), classify a/b/c/d per the rubric. From a skim of
   today's fra sample (pronoun/gender agreement pairs like "friend"→amigo/amiga, "he knows"→sabe/
   Conoce, "that"→eso/que) the shape looks like the pilot's original finding: several of these read
   as **register/word-sense taste-forks (d)**, not mechanical bugs — but that's a first impression
   from the printed sample, not a scored pilot, and shouldn't be treated as one.
3. **Bucket [3] (77/34, informational) is not gate-enforced** — per the rescope's own scoping note,
   whether it should ever become an enforced check is itself an open question (§8 "target-side
   collision bucket [3]"), unconfirmed as Tom's ruling. Recommend leaving it purely observational
   until/unless he rules on it; no sweep against an unconfirmed spec.

**No fixes were applied.** No course_seeds/course_legos/course_practice_phrases rows were written
to. This pass is audit tooling + a snapshot + a read, nothing else.
