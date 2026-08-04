# Caller side of the two ~988k-call queries (2026-08-04)

Companion to the index/trigger work on `course_audio`. This is the **caller** analysis:
where the calls come from, at what cadence, and what changed in source.

Measured facts used as input (pulled by Tom from live `pg_stat_statements`, window since
2026-06-23, not re-pulled here):

| Query | Role | Calls | Mean | Total | Share of DB time |
|---|---|---|---|---|---|
| A. `course_seeds` approved check | service_role | 987,710 | 1.17 ms | 1,158 s | 0.47 % |
| B. `course_audio` single-row upsert | service_role | 988,656 | 125 ms | 123,649 s | **50.2 %** |

## 1. They are NOT the same loop

The near-identical call counts are a coincidence. Verified against the live DB today:

- `course_audio` has **2,542,255** rows; **872,741 rows with `origin='tts'` were created inside
  the measurement window** (plus a handful of `human`), and `pg_stat_user_tables` reports
  `n_tup_ins = 889,863`.
- So query B's 988,656 calls ≈ one call per row actually written, plus conflict no-ops.
  **B is real work, not a redundant poll.** There is no loop to remove on the caller side; the
  cost per call is the trigger, which is the index lane.
- Query A is written by a completely different service, does no audio work, and its cadence is
  wall-clock driven (below).

## 2. Query A — the poll. `services/course-builder/lib/build-manager.cjs:116`

Only call site in the estate that can emit `NOT approved_at IS NULL` on `course_seeds`
(grepped `~/SSi` across `.cjs/.js/.ts/.vue/.py`, all 22 `approved_at` occurrences read):

```
services/course-builder/lib/build-manager.cjs:110-117   final-pass  → count seeds WHERE approved_at IS NOT NULL
services/course-builder/lib/build-manager.cjs:38        decompose   → same shape on decomposed_at
services/course-builder/lib/build-manager.cjs:99-104    translate   → same shape on target_text
```

**Cadence:** `checkBuilds()` is fired by `setInterval` at `BUILD_CHECK_INTERVAL_MS` (30 s,
`services/course-builder/context.cjs`), started from `services/course-builder-api.cjs:85`. Every
tick loops over **every** `build_jobs` row with `status='running'` and runs one count per job. No
backoff existed.

**Why it never stops:** the code deliberately never kills jobs ("Never kill jobs — … user clicks
Stop manually if needed", line ~137). Live state today:

| status | rows |
|---|---|
| complete | 619 |
| stopped | 196 |
| failed | 29 |
| **running** | **10** |

The 10 `running` rows include jobs started 2026-05-18, 2026-06-01 and 2026-07-03, all
heartbeating right now. Three are `final-pass` (`ara_for_eng` 298/370 and `kor_for_eng` 297/370,
both unmoved since 2026-07-03; `deu_at_for_eng` 6/668). So the approved-seed count has been
re-asking a question whose answer has not changed in a month, every 30 s, for weeks.

3 zombie jobs × 30 s ≈ 8.6k calls/day ≈ 363k over the window; the measured 988k implies roughly
2–3× that, i.e. more `final-pass` zombies earlier in the window and/or more than one host running
`course-builder-api` against the same DB (the 3465/3470/3471 supervision work). Not resolved
here — flagged in §4.

## 3. What changed (applied)

`services/course-builder/lib/build-manager.cjs` + `services/course-builder/context.cjs`.

Per-job exponential backoff on the **progress-count query only**:

- base 60 s (`BUILD_PROGRESS_MIN_INTERVAL_MS`), doubling to a 15-min cap
  (`BUILD_PROGRESS_MAX_INTERVAL_MS`) while the count is unchanged; any change resets to base.
- The **tick stays 30 s and `last_heartbeat` is still written every tick.** This is deliberate:
  `services/production-api.cjs:9589` and the detective brief both call a job stalled at >5 min
  without a heartbeat, so widening the tick itself would have manufactured fake stalls. Widening
  the *query* is the same saving without that side effect.
- A backed-off tick writes **only** `last_heartbeat` — never a stale `seeds_completed`/
  `current_seed`, and it skips the completion check, so nothing is ever marked complete off a
  stale count. Worst case a finished build is noticed up to 15 min late; it is still noticed.
- Backoff state is dropped when a job leaves `running`, and on `stopBuildManager()`.

Verified with a fake-clock harness (`scripts/perf/test-build-backoff.cjs`, gitignored): over
20 min of simulated ticks with nothing changing, **40 counts → 5**, with all 40 heartbeats still
written; at the 15-min cap it settles to 1 count per 30 ticks (**30× fewer calls**). Progress
changes still take effect on the next due check.

No service was restarted — the change takes effect on the next natural start of
`course-builder-api`.

## 4. Deliberately NOT done — for Tom

**(a) Do not batch the `course_audio` upserts.** The trigger is
`CREATE TRIGGER audio_autolink AFTER INSERT ON course_audio FOR EACH ROW` — verified against the
live catalog. A 500-row `.upsert([...])` fires it 500 times, so batching saves PostgREST
round-trips and **nothing of the 125 ms**, which is the entire cost. Against that it costs real
things: the two hot call sites
(`services/phases/phase8-audio-v13.cjs:1975` sibling-reuse, `:2082` post-TTS) both use
`.select('id').single()` and immediately call `bindPresentationAudio(item, insertedAudio.id, …)`,
so a batch needs a second read to map rows back to items; and the driver at `:2134` is
`Promise.allSettled` with a per-item 120 s timeout and per-item error rows, which a batch collapses
into one all-or-nothing failure. Better × simpler × cheaper does not hold on any leg. Recommend
leaving it alone permanently, not just for now.

**(b) Reap the zombie `build_jobs` rows.** The backoff caps the bleeding; it does not fix the
cause, which is 10 `running` rows that will poll forever. A job with no heartbeat-independent
progress for N days is finished, abandoned or dead, and something should say so. Not applied
because "never kill jobs, the human clicks Stop" is an explicit product decision in that file and
overriding it is Tom's call, not a perf agent's. Cheapest version if wanted: a one-off
`UPDATE build_jobs SET status='stopped'` for the rows with no progress since July, plus an age
guard in `checkBuilds`.

**(c) Confirm how many hosts run `course-builder-api`.** If more than one process/machine runs the
build manager against this DB, the poll multiplies by that factor and the 988k number stops needing
a historical explanation. Unresolved gap — not measurable from this checkout.
