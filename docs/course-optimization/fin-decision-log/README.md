# fin_for_eng — Decision Log Bundle

Consolidated record of every decision made while translating, building, and
proofreading the Finnish course (`fin_for_eng`). Copied here from the agent
memory store so any agent/session can read them from git. Snapshot date: 2026-08-12.

> These are point-in-time observation logs, not live state. Verify any code
> path / file:line claim against the current code before acting on it.

## Files in this folder

| File | Phase | Covers |
|------|-------|--------|
| `fin-build-and-translation-log.md` | Build + translation (2026-04-13 → 07-16) | Translation setup, "think"/"can-could" reclassification, ~251 seed-edit QA passes, golden seeds 1–10 calibration, 300-seed build review, ZUT rulings |
| `fin-proofread-decision-log.md` | Proofread (2026-07-20 → 08-04) | Dated ledger of every flag, ruling, and applied fix: come→come-back sweep, possessive→spoken sweep, `tää`, `tarvii` paradigm, go/leave policy, `-maan` binding, `sen`/`sitä` rule, `kovin`/`tosi`, happy split, comma passes, seed rebuilds (S24/29/51/82/127/209/263), deepening/backfill batches |
| `fin-spoken-register-rules.md` | Register doctrine | Kai's native-speaker rulings (mä/sä, se-for-hän, plural→singular verb, keep-full-infinitives, pitää+genitive, etc.) that underpin all the above |

## Related docs already tracked in git (parent folder)

- `../fin-calibration-golden.md` — decomposition authority for the build
- `../fin-general-issues-status.md` — QA pass status + held items
- `../fin-zut-concern-context.md` — ZUT rulings context

## Not in git (by design)

- `scripts/proofread-fixes/*.cjs` — the applied fix scripts. `scripts/` is the
  gitignored agent workspace, so these are local-only. They are the *mechanical*
  application of the decisions logged above, not the decisions themselves.
- `tools/proofread/progress/fin_for_eng.json` — per-phrase tool decision state
  (this one **is** tracked).

## ⚠️ Open items carried forward (as of the 08-04 log entries)

- **`REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index`** is still
  PENDING (needs `.env.psql`). Must run before `fin_for_eng` serves learners or
  it risks INF-PLAY (stale/empty round index after lego mutations).
- Several items **deferred to Kai** in the final proofread entries (e.g. S137
  lego-expand, `earlier`/`aiemmin` split, assorted vocab-not-taught cases). See
  the tail of `fin-proofread-decision-log.md`.
