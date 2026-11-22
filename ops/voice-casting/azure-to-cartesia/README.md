# Azure → Cartesia, four daily batches (cs #35, 19 Nov 2026)

Plan (cs #35) and the runner that executes it (cs #59). Only `run-day.cjs` renders, and only through Popty's HTTP routes.

| File | What | Regenerates with |
|---|---|---|
| `azure-census.cjs` | read-only census: slots whose clip is Azure TTS in a role whose resolved cast is Cartesia | `set -a; . ~/ssi-restore/qa-copy.env; set +a; node ops/voice-casting/azure-to-cartesia/azure-census.cjs --out <census.json>` (QA copy; cast from Popty's resolved route) |
| `build-days.py` + `fixes.json` | census + owed course-fix ledger (charged first, per Kai 19 Nov) → `course-summary.json`, `day-plan.json`, `day1-batch.jsonl` (replacement day lists live in its `DAYS`, fixes carry their `day`) | `python3 -I ops/voice-casting/azure-to-cartesia/build-days.py <census.json> ops/voice-casting/azure-to-cartesia` |
| `day1-batch.jsonl` | the exact day-1 asks: course, role, text, cast voiceId, chars, slots (with the pointer seen in the 19 Nov 03:30Z QA copy as `current`) | as above |
| `day1-dryrun-*.jsonl` | the 70 dry-run asks sent to `POST /api/audio/render` and what came back | not regenerated (one-off evidence) |

Days 2-4 are re-censused (same two commands) before Kai's Y/N for that day.
| `run-day.cjs` | cs #59: renders one day's committed list ONE ask at a time via `POST /api/audio/render` (Kai's approval token), re-points every listed slot via `link-clip` (replace + expectCurrent), checks the day/total/reserve caps before every ask, stops at the first limit error, never retries; results append to `~/ssi-evidence/ssi-dashboard-v7/ops/voice-casting/azure-to-cartesia/dayN-results.jsonl` | n/a |
| `day5-batch.jsonl` | cs #468·AK, Tom 22 Nov (r-2026-11-22-spanish-courses-use-the-cartesia-spanish): spa_for_zho, counted by the census (284,125 chars) but on no day list. Seed order, targets first. Runs with `run-day.cjs --day 5 --approver tom --cap 330000 --reason …` | census `--courses spa_for_zho` + one python pass (in the commit message) |
| `day.sh` | cs #59: what the day timers run: wait for an earlier day, stop check, day-of re-census + `build-days.py --batch-day N`, commit + push the list, `run-day.cjs`, wake | n/a |
| `day7-batch.jsonl` | cs #486·AK, Tom 22 Nov (re-record grant #184, spa_for_zho target1/target2/known, until 25 Nov): the 10,866 `spa_for_zho-library-gaps.jsonl` lines (236,309 chars, 11,562 slots) as runnable asks, i.e. the `day5-batch.jsonl` rows whose (role, text) is a gap; disjoint from day 6. Runs with `run-day.cjs --day 7 --approver tom --cap 260000 --reason …` | the one python filter in the commit message |
