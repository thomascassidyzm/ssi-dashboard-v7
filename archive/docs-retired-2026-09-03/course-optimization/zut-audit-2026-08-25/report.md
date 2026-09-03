# ZUT compliance audit — fra_for_eng / spa_for_eng, 2026-08-25

Reset-eve spare-capacity pass. Read-only re-run of the existing rescoped audit tool. The tool
(`tools/course-optimization/audit-phrase-zut.cjs`) is still not on `main` — it lives only on the
unmerged `docs/zut-phrase-audit-2026-08-11` branch (commit `c4b6c8df6`). Per branch-hygiene doctrine
("Popty branches diverge; cherry-pick, never merge") I did not merge that branch; I pulled the file
read-only via `git show c4b6c8df6:tools/course-optimization/audit-phrase-zut.cjs` into the gitignored
`scripts/` workspace, fixed only its two relative `require()` paths (one directory shallower than the
original `tools/course-optimization/` location), and ran it unmodified otherwise. Only SELECT queries
ran against Supabase; the script's only write is its own local JSON snapshot in `scripts/` (gitignored,
not committed). **Zero DB writes, zero content changes, zero fixes applied.** Raw JSON snapshots
alongside this report: `zut-audit-fra_for_eng.json`, `zut-audit-spa_for_eng.json`.

Gap still open, same as the 2026-08-11/15/18 runs before it: `tools/course-optimization/
audit-phrase-zut.cjs` and the three doctrine source docs it depends on remain absent from `main`.
This pass did not fix that gap (out of scope for a read-only audit) — flagging it again since it
recurs on every run.

## Counts

| | fra_for_eng | spa_for_eng |
|---|---|---|
| rows scanned (of which component) | 17,551 (1,780) | 17,803 (1,123) |
| distinct normalized knowns | 14,247 | 15,533 |
| [1] bidirectional — gate-exact | 114 | 514 |
| [1] bidirectional — case-insensitive | 101 | 115 |
| [1] bidirectional — **strict** | **101** | **81** |
| [2] target-membership failures | **23** | **20** |
| [3] target-side collisions (informational, not enforced) | 77 | 34 |

## Against the calibration priors — and against the 2026-08-18 run

Baseline from the 2026-07-04 sweep (pilot → rescope → fix-sweep): fra strict-bidirectional was 110
pre-fix-sweep (untouched by that sweep, which only worked bucket [2]); fra/spa target-membership was
72/76 pre-fix-sweep, driven to 23/21 via 99 deletions + 5 fixes with the residue logged as
`(d) judgment-fork`. Protocol: expect either mostly-noise (checking the wrong unit) or mostly-orphans
(batch debris) in any fresh queue — pilot ~40 before committing to a sweep strategy, never assume a
count is a work count.

**This run is byte-for-byte identical in content to the 2026-08-18 audit**, not just count-identical.
Diffed both raw JSON snapshots (`docs/course-optimization/zut-audit-2026-08-18/` vs today's): fra
matches exactly; spa's raw arrays came back in a different order (non-deterministic Postgres/JS
iteration order — same 81 `known_norm` values in bucket [1], same 20 in bucket [2], set-equal by
value) but the counts and every underlying item are unchanged. **Seven days, zero drift**, on top of
the zero drift already reported between 08-15 and 08-18. Three consecutive fortnightly-ish snapshots
(08-15, 08-18, 08-25) now agree exactly: nothing has touched fra_for_eng's or spa_for_eng's ZUT
surface since at least 2026-08-15, and the spa bidirectional-strict collapse from July's 338 → 81
(noted as an unexplained gap on 08-11) has itself been stable at 81 for three straight snapshots — it
was a one-time step change sometime between the July fix-sweep and 08-11, not ongoing drift, and its
cause is still not identified in anything on `main` (same open gap as before; not re-investigated
this pass).

## What a follow-up sweep would look like

The recommendation is unchanged from 08-11/08-15/08-18, because the underlying data hasn't moved:

1. **Bucket [2] (membership, 43 combined) still needs no new triage pass** — it's the same 44-minus-one
   July judgment-fork residue, already individually classified (grammar the substring check can't
   see: elision, clitic fusion, interposed words, pipe-annotation rows, the one stacked defect at
   `S0664L01C01`). What it needs is Tom's ruling on the open decisions in the manual (§8), re-surfaced
   as a decision list — not another sweep.
2. **Bucket [1] (bidirectional, 182 combined) is still the one bucket that has never had a scored
   pilot at today's scale.** Spot-reads across three runs (this one and the two before it) keep
   showing the same shape — pronoun/gender-agreement pairs ("good"→bueno/buena, "he knows"→sabe/
   Conoce, "that"→eso/que) that read as register/word-sense taste-forks (d), not mechanical bugs —
   but that's an impression from printed samples, not a scored classification. A real ~40-item pilot,
   evidence standard = full seed + all siblings per item, is the concrete next step if this bucket is
   ever going to be worked rather than re-observed.
3. **Bucket [3] (111 combined, informational) still isn't gate-enforced** and whether it should ever
   become one is an open, unconfirmed question (rescope §[3]) — no sweep against an unconfirmed spec.
4. **Given three flat snapshots in ten days, a cheaper standing move than re-running this audit every
   few days on the same two courses would be widening scope** — the 2026-08-22 pass already showed
   this (gle_cn_for_eng, eng_for_hin) and found eng_for_hin's 230 membership failures need their own
   pilot. Recommend the next read-only pass pick courses not yet covered rather than a fourth fra/spa
   snapshot, unless something is known to have touched fra/spa content since 08-18.

**No fixes were applied. No content, gate code, or audit tool was modified this pass.**
