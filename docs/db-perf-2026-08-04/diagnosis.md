# SSi shared Supabase — query performance diagnosis, 2026-08-04

Evidence: `pg-stat-statements-top25-2026-08-04.json` in this directory, pulled live
from `pg_stat_statements` ordered by `total_exec_time`. Stats window opened
**2026-06-23 03:02:44Z** (`pg_stat_statements_info.stats_reset`) and covers
**33,820,553 calls / 246,458 s** of execution across 4,754 distinct statements.

All figures below are mine, measured against the live database, unless a line
says otherwise. Where a figure came second-hand from the commission it is
labelled **[reported]** and not treated as measured.

---

## The headline

| # | statement | role | calls | mean | total | share |
|---|---|---|---|---|---|---|
| 1 | `course_audio` single-row UPSERT (PostgREST) | service_role | 988,656 | 125.07 ms | 123,649 s | **50.17%** |
| 2 | `link_all_audio_ids(p_course_code)` RPC | service_role | 5,011 | 2,240.99 ms | 11,230 s | 4.56% |
| 3 | `course_practice_phrases.*` by course, paginated | authenticated | 63,167 | 164.27 ms | 10,377 s | 4.21% |
| 4 | `demographic_cycle_averages` view | authenticated | 12,494 | 702.20 ms | 8,773 s | 3.56% |
| 5 | `bump_speaking_opportunities` RPC | authenticated | 5,284 | 1,593.22 ms | 8,419 s | 3.42% |
| 9 | `SELECT EXTRACT(... max(created_at)) FROM course_audio` | postgres | 625 | 5,777.10 ms | 3,611 s | 1.47% |
| 21 | `course_seeds` approved check | service_role | 987,710 | 1.17 ms | 1,158 s | 0.47% |

The commission reported the upsert at **61% [reported]**; I measure **50.17%**
over the full window since 2026-06-23. Same finding, different denominator —
nothing hinges on the gap.

---

## Thread 1 — the `course_audio` UPSERT (50.17% of all DB time)

**Cause: none of the three hypotheses in the brief. It is a trigger.**

Hypotheses tested and eliminated:

- **(a) bloated / badly-shaped ON CONFLICT index — NO.** `ON CONFLICT` resolves
  to `unique_course_audio_per_voice (course_code, text_normalized, language,
  role, voice_id)`, 388 MB against a 1,522 MB heap on 2,547,415 rows. That ratio
  is normal for a five-column text index, and autovacuum is current
  (last run 2026-08-03 19:22Z, 43,220 dead tuples against 2.5 M live).
- **(b) lock contention — NOT the mean.** `shared_blks_hit` on this statement is
  **100.0%** — it never touches disk. A contention-bound statement waits, it
  does not burn a million cache hits. Contention is real but it is the *tail*
  (see "the 8-second wall" below), not the 125 ms mean.
- **(c) RLS / set_config overhead — NO.** All three policies on `course_audio`
  (`anon_read_course_audio`, `authenticated_read_course_audio`,
  `course_audio_service_policy`) have `USING (true)` / `WITH CHECK (true)`.
  There is no subquery to pay for.

**What it actually is.** `course_audio` carries five triggers. The expensive one
is `audio_autolink` → `link_audio_to_content()`, `AFTER INSERT FOR EACH ROW`,
which for every inserted row runs both

```sql
UPDATE course_legos            SET targetN_audio_id = NEW.id, ...
 WHERE course_code = NEW.course_code AND targetN_audio_id IS NULL
   AND lower(trim(target_text)) = NEW.text_normalized;
UPDATE course_practice_phrases SET targetN_audio_id = NEW.id, ...
 WHERE course_code = NEW.course_code AND targetN_audio_id IS NULL
   AND lower(trim(target_text)) = NEW.text_normalized;
```

No index covered `lower(trim(...))`, so each one bitmap-scanned the whole
course's phrase set and filtered in the heap. Measured on `fra_for_eng`
(15,894 phrases) for **one** of the two UPDATEs:

```
Bitmap Heap Scan  Rows Removed by Filter: 15894  Heap Blocks: exact=12507
Buffers: shared hit=12769                        actual time=43.914 ms
```

Two of those, plus four more triggers, is the 125 ms — and it is entirely
buffer-cache work, which is exactly why cache hit rate reads 100%.

**Fixed** — `database/migrations/20260804_audio_link_trigger_indexes.sql`, five
expression indexes built `CONCURRENTLY` on the live database:

```
before  43.914 ms, shared hit=12769   (Bitmap Heap Scan)
after    0.018 ms, shared hit=3       (Index Scan using idx_cpp_course_target_text_norm)
```

That is the same statement, measured before and after, on the same database.

**Not yet measurable:** the production-workload delta. Both pipelines were idle
when the indexes landed (`pg_stat_activity`: 1 active connection, 0 lock waits;
the upsert counter did not move over the measurement window), and I did not
restart anything. The `pg_stat_statements` mean for this statement will only
move on the next natural pipeline run. Re-check with the query at the foot of
this file.

### The 8-second wall — why learners were affected

`statement_timeout` is set per role: **`anon` 3 s, `authenticated` 8 s**,
`service_role` unset (falls back to the database's 120 s). The `authenticated`
statements in the top 25 cluster their `max_exec_time` at 7,995 / 7,995 /
7,982 / 7,979 / 7,943 / 7,214 ms — those are not slow queries, they are queries
**killed at the 8 s ceiling**. They are the learner path: whole-course fetches
of `course_practice_phrases` and `course_audio`. The most likely explanation is
saturation while the audio pipelines were hammering the same instance. Removing
50% of database time is therefore a learner-facing fix, not just a pipeline one.

### Secondary write amplification (reported, not changed)

- `touch_course_content_stamp` updates one row of `courses` on every insert,
  update **and** delete across the content tables. `courses` has 143 live rows
  and **1,566,157 updates**. The debounce comment in the function is correct
  *within* a transaction, but each PostgREST upsert is its own transaction, so
  every single write bumps the same row. Parallel pipelines writing the same
  course therefore serialise on one row lock — that is the best explanation for
  the 7.9 s tail on the service_role upsert. Autovacuum is coping (6,160 kB
  heap, 32 dead tuples), so this is a concurrency cost, not a bloat cost.
- `content_audit_log` is **2,860,724 rows / 1,687 MB** — a full old-row JSONB
  copy for every upsert that overwrites an existing `course_audio` row. That is
  now the third-largest object in the database. Retention is a policy call.

Both are listed under *Needing Tom* rather than changed here: they alter what
gets written, not just how fast.

---

## Thread 2 — the `course_audio` freshness probe

`SELECT EXTRACT($1 FROM (now()-max(created_at))) FROM course_audio`, run as role
`postgres` (a raw pg connection, not PostgREST): 625 calls, 5,777 ms mean,
15,385 ms max, 10.1% cache hit. There was **no index on `created_at`** — it was
a parallel sequential scan of the 1.5 GB heap.

**Fixed** — `idx_course_audio_created_at`, built `CONCURRENTLY`:

```
before  10634.731 ms   Buffers: shared hit=14900 read=179877  (Finalize Aggregate / Gather / Parallel Seq Scan)
after       0.703 ms   Buffers: shared hit=3 read=2           (Result / InitPlan index scan)
```

The caller-side fix is with the `perf-freshness-probe` worker; commit
`172fce73` (this afternoon's `audio-stats?fresh=1` 500 fix) was flagged to it as
must-read-first so that work is not undone.

---

## Thread 3 — the ~988,000-call polling loop

Confirmed as two distinct statements with call counts 946 apart —
`course_seeds` approved check at 987,710 and the `course_audio` upsert at
988,656 — i.e. almost certainly one loop doing one of each per iteration. The
approved check itself is cheap (1.17 ms mean, 0.47% of DB time); the cost was
always the upsert, which thread 1 has now addressed at the database end.
Caller-side cadence and backoff are with the `perf-polling-loops` worker.

---

## Thread 4 — the index_advisor suggestions: **all four skipped, all four already satisfied**

Checked against the real schema. Not one of them is a missing index.

| suggestion | verdict | evidence |
|---|---|---|
| partial index on `course_practice_phrases.target1_audio_id` | **skip — exists** | `idx_practice_phrases_target1_audio ... (target1_audio_id) WHERE target1_audio_id IS NOT NULL` |
| partial index on `course_practice_phrases.target2_audio_id` | **skip — exists** | `idx_practice_phrases_target2_audio ... (target2_audio_id) WHERE target2_audio_id IS NOT NULL` |
| index on `sessions.course_id` | **skip — exists, and the table is tiny** | `idx_sessions_course_started (course_id, started_at)` already leads on `course_id`. `public.sessions` is 16,336 rows / 7.4 MB. (`auth.sessions` is a separate 948-row table.) |
| index on `schools.region_code` | **skip — exists, and the table is 21 rows** | `idx_schools_region (region_code) WHERE region_code IS NOT NULL`. A 21-row table is one heap page; an index cannot beat that. |
| index on `user_tags.tag_value` | **skip — two exist, and the table is 762 rows** | `idx_user_tags_class` and `idx_user_tags_school`, both partial on `tag_value` |

This is the expected failure mode of an advisor that reasons from query shape
alone: it re-proposes indexes that are already there in partial form, and it
proposes indexes on tables too small to benefit. The real missing indexes were
on **expressions** (`lower(trim(...))`) and on `created_at` — shapes the advisor
did not surface at all.

---

## Bonus find — `link_all_audio_ids` (4.56% of all DB time)

Not in the four threads, but it is #2 in the table and it is the same
audio-linking machinery, so it was in scope.

Its nine UPDATEs assign a scalar subquery into an `audio_id` column for every
row where that column `IS NULL` — including rows where the subquery returns
NULL. Postgres writes NULL over NULL, creates a new row version anyway, and
fires five AFTER triggers per row, for zero effect. Measured on `hak_for_eng`
(24,563 phrases, zero `target1` audio), the single `target1` UPDATE, EXPLAIN
ANALYZE inside a rolled-back transaction:

```
before  20241.726 ms   24,563 rows written NULL -> NULL
        Buffers: shared hit=1190794 read=23052 dirtied=14499
        Trigger course_practice_phrases_audit:              2300.694 ms
        Trigger course_practice_phrases_touch_content_stamp: 810.347 ms
after       0.920 ms   0 rows written   Buffers: shared hit=3 read=3
```

**Fixed** — `database/migrations/20260804_link_all_audio_ids_skip_no_op_updates.sql`
adds an `EXISTS` guard with the identical predicate to each of the nine UPDATEs,
plus three partial indexes so the `IS NULL` side stops BitmapAnd-ing the wide
`idx_practice_phrases_audio` composite (that bitmap scan alone was 5,805 ms /
8,446 blocks read). Whole-RPC timing after, on real courses, rolled back:

```
hak_for_eng 0.06 s    fra_for_eng 0.99 s    spa_for_eng 0.14 s
```

against a 2,241 ms mean before — and `spa_for_eng` still linked everything
genuinely linkable (legos 1/1/1, phrases known 1), so the guard does not skip
real work.

Final table state is bit-identical. The one thing that changes is the returned
count: it now reports rows *actually linked* rather than rows *examined*
(`hak_for_eng` previously returned `phrases.target1 = 24563` having linked
nothing). Nothing branches on it — `services/phases/phase8-audio-v13.cjs:1137`
reads flat keys (`result.phrases_known`) that the function has never returned
(it returns nested `{"phrases":{"known":…}}`), so its `rpcTotal` was already
always 0 and only reaches a log line. That pre-existing key mismatch is
deliberately **not** fixed here — it is behaviour-visible and belongs to Tom.

---

## Note on where migrations live

`database/migrations/README.md` says the directory is archived and "No new files
go in this directory", with the learning-app `supabase/schema.sql` snapshot as
the canonical record. The commission for this job said the opposite —
migrations in `database/migrations/`, `YYYYMMDD_snake_case_description.sql`. I
followed the commission, because the governing rule underneath both is *"fixes
land as migrations and code changes in this repo, never as ad-hoc SQL typed into
a console"*, and a committed dated file satisfies that either way. Flagged for a
one-line ruling; if the README wins, the two files move and the snapshot gets
refreshed instead.

---

## Re-check query

```sql
SELECT left(regexp_replace(query,'\s+',' ','g'),80) AS q, calls,
       round(mean_exec_time::numeric,2) AS mean_ms,
       round((total_exec_time/1000)::numeric,1) AS total_s
  FROM pg_stat_statements
 WHERE query LIKE '%INSERT INTO "public"."course_audio"%text_normalized%'
    OR query LIKE '%link_all_audio_ids%'
    OR query LIKE '%max(created_at)) FROM course_audio%'
 ORDER BY total_exec_time DESC;
```

Counters are cumulative since 2026-06-23, so the historical mean will drag for a
while. The honest way to read the improvement is the delta: snapshot `calls` and
`total_exec_time`, wait for a pipeline run, and divide the differences.
