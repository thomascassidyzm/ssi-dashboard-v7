# fin_for_eng — unapproving the seeds that were never fully reviewed (2026-08-11)

Kai's rule: a seed may not read *approved* while it still holds a phrase nobody
has ever looked at. Stage 1 (2026-08-06) measured the violations and deliberately
wrote nothing. This pass performed the write.

**Scope: `fin_for_eng` only.** Kai ruled that explicitly. The same rule applied
estate-wide would hit ~31.6k of ~32.1k approved seeds across 82 courses, which
measures nothing except that those courses have never been proofread.

## What was written

`course_seeds.approved_at` set to `NULL` for 21 seeds — 1–15, 20, 25, 26, 34, 37, 52.

One PostgREST `UPDATE`, one round trip, scoped
`course_code='fin_for_eng' AND seed_number IN (…21…) AND approved_at IS NOT NULL`.
All 21 rows came back with the same `updated_at` (`2026-08-11T14:00:22.042968Z`),
which is the statement timestamp — evidence it executed as a single statement.

Approved seeds in the course: **104 before → 83 after.**

## Verification

`after-verification.json` holds a diff of all 668 seed rows × 18 columns, before
against after:

- 21 seeds changed; 0 unexpected; 0 intended-but-missed.
- Columns that moved: `approved_at` (intended), plus `version` (+1 each) and
  `updated_at` — both bumped by a database trigger, not by this write.
- Approved seeds in every other course: 32,047, unchanged.
- The live tool now reports `staleApprovals: 0`, and the reviewer's progress file
  is untouched at 2,245 decisions.

## Calibration (reproduced before trusting the detector)

S0020: approved `2026-07-20T13:23:35.38Z`, 27 non-component phrases, 26 decisions
in the progress file, the one missing being `fin_for_eng:S0020L02U06`. Reproduced
exactly. Three independent paths then agreed on the same 21 seeds: this pass's
standalone derivation, the running tool's own `staleApprovals`, and stage 1.

Also confirmed: **zero** approved seeds are fully checked but carrying a flag, so
there was no ambiguous middle category to escalate.

## Discrepancy against stage 1 (reported, not silently absorbed)

Stage 1 said 102 approved seeds; the live count before this write was **104**.
Not drift in the rule — the extra two are S0059 and S0106, which Kai reviewed and
approved in the tool at 2026-08-06 20:05–20:06, after stage 1 measured that
afternoon (its tool change landed 13:16). Both are fully reviewed, so neither
qualifies for unapproval; only the denominator moved. This also reconciles the
estate figure: 32,149 + 2 − 21 = 32,130, which is what the database now reports.

## Reversing it

    node docs/fin-unapprove-2026-08-11/rollback.cjs --dry-run
    node docs/fin-unapprove-2026-08-11/rollback.cjs --apply

`before-image.json` holds all 18 columns of all 21 rows as they stood before the
write, so each `approved_at` is restored to its own original timestamp rather
than to "now". The rollback aborts if `seed_id`, `known_text`, `target_text`,
`status`, `flagged_at` or `decomposed_at` has drifted on any row, so it can never
bury someone else's later edit. It does not restore `version`/`updated_at` —
those are trigger-owned and will bump again.

## Gap

`course_seeds` records **no approver identity** — `approved_at` is a bare
timestamp, with no column naming who approved. "Who approved it" therefore could
not be snapshotted, because the database has never stored it.
