# The QA approval gate page — fixed, not removed (2026-08-14)

Tom hit this on `popty.app/production/cym_n_for_eng/qa-gate`: a red box reading
`read rounds: canceling statement due to statement timeout`, under a heading
saying `Unknown — 0 of 0 required rounds signed off`.

Both halves were the same fault. `0 of 0` was not a second bug and not a real
count: the page's header renders `{{ progress.passed }} of {{ windowSize }}` from
the course-status call, and that call reads the *same* view through
`evaluateGate`. When it timed out the header fell back to zeros and "Unknown".
The gate's own record for cym_n_for_eng was `0 of 100` the whole time.

## Was yesterday's migration applied to live? Yes.

`ops/sql/20260813-qa-gate-round-status-delateralise.sql` **was** applied.
Verified against the live database with `pg_get_viewdef('course_qa_round_status')`
— the shipped definition and the live one match line for line, LATERALs gone,
rollup aggregated once per lego. The covering index it specifies
(`idx_course_audio_id_revision`) was present too. No migrations table was
trusted for this.

It just did not cover the whole cost.

## What was still slow

`course_qa_round_status` joined the clip rollup to clip status on the uuid alone:

```sql
FROM course_qa_cycle_clips cc
JOIN course_qa_clip_status cs ON cs.audio_id = cc.audio_id
```

`course_qa_clip_status` is a view over `course_audio`, so `id = <uuid>` was the
only predicate available and the planner had no option but a nested loop —
18,785 random probes for cym_n_for_eng, one per clip, scattered across a 198MB
index in uuid order. `EXPLAIN` put 12.5s of a 14.3s run in that single node,
12,129 pages fetched from disk. Warm it hid at 2.2s. Cold — which is exactly
what a producer opening the page for the first time gets — it could never fit
the 8-second budget PostgREST's `authenticator` role carries.

## What was done

Three changes, all in `ops/sql/20260814-qa-gate-round-status-push-course-code.sql`:

1. **`course_code` added to the clip-status join.** It was already carried on
   both sides. Adding it turns 18,785 random uuid probes into one index-only
   range scan over the course's own slice of `course_audio`, hash-joined.
2. **`idx_course_audio_course_id_revision`** `(course_code, id) INCLUDE (audio_revision)`
   — the index that range scan reads.
3. **`idx_practice_phrases_role_covering`** — with the audio join fixed, the
   next bottleneck surfaced on the two Hindi-known courses: a non-covering scan
   of `course_practice_phrases` doing 8,586 random heap reads. The new index has
   the identical key to the old `idx_practice_phrases_role` plus the four columns
   the view actually reads, so it is index-only.

Two now-superseded indexes were dropped: `idx_course_audio_id_revision` (198MB,
what the old join shape probed) and `idx_practice_phrases_role` (98MB, an exact
key-prefix subset of the new one). Net index footprint on the two hottest tables
went **down** 219MB — the replacements are 124MB and 77MB against 296MB removed.

## Measured

| | before | after |
|---|---|---|
| cym_n_for_eng, 500 rounds, cold | **14,282ms — cancelled at 8s** | — |
| cym_n_for_eng, 500 rounds, warm | 2,232ms | **96ms** |
| shared buffers touched | ~62,000 | 11,529 |

Estate-wide, all 143 gated courses, `from=1&limit=500`:

- **Through psql at `statement_timeout=8s`:** 0 timeouts. Median 118ms, max 422ms.
  (Before: 2 courses cancelled — `kor_for_hin`, `zho_for_hin`.)
- **Through PostgREST itself** — the real path, the same `authenticator`
  connection and 8s budget the page uses: 143/143 HTTP 200, median 0.30s, max 0.67s.

The publish-gate query (`evaluateGate`, first 100 rounds) now runs in 120–243ms
on the worst courses.

## Equivalence, and the one row that changed

Adding `course_code` to the join is not a no-op — it drops any clip whose
`course_audio` row belongs to a different course than the lego pointing at it.
Counted before applying: **2,284,091 clip links estate-wide, exactly one crosses
courses, zero dangle.** Full-column `EXCEPT` both ways over the whole estate
returned that single row and nothing else, in either direction. Every other
round, and every fingerprint, is bit-identical.

The one row is a data defect, not a case worth preserving:

> **`bre_for_fra` lego `S0089L03`, debut/known → a `zho_for_jpn` clip whose text is `短.`**

A Breton-for-French course's known line points at a Mandarin clip. That was its
*only* clip, so under the new view that lego reports no audio rather than
reporting a Chinese clip as its Breton one — which is the honest answer. The bad
`known_audio_id` is **not patched here**; content is not a migration's job. It is
flagged for a decision.

## Why fixed and not removed

The removal option was live and was tested against the data. It fails on one
fact: **the gate is not decorative — it hard-blocks publication today.**

`services/production-api.cjs:2509` calls `qaGate().checkPublishAllowed()` on
every course-status save, and refuses promotion to `live`/`beta` with HTTP 409
`qa_gate_unpassed`. It fails *closed*: if the gate cannot be evaluated the route
returns 503 `gate_unavailable` rather than waving the course through. So the
timeout was not only breaking a page — it was making the publish check
unevaluable, and every promotion to learner-visible with it.

The empirical numbers on whether the gate has ever gated anything:

| | count |
|---|---|
| rows in `course_round_signoffs` (ever, all courses, all people) | **0** |
| rows in `audio_clip_signoffs` | **0** |
| rows in `audio_clip_flags` | **0** |
| rows in `course_round_assignments` | **0** |
| courses with a gate row | 143 — **all `unpassed`** |
| required rounds configured | 100 on 100 courses, 20 on 43 |

Zero sign-offs is exactly what "doing work for nobody" looks like — and it is
also exactly what a nine-day-old gate whose only sign-off surface has been
throwing a timeout looks like. Those two readings are distinguished by the
publish path, not by the counts: the required-rounds column is populated for all
143 courses, the block is wired and fails closed, and Tom's ruling on 2026-08-05
is quoted in the code — *"No course should EVER go out to learners unless it has
passed a manual approval gate."*

Removing the page would have deleted the only way to ever satisfy a gate that
still refuses every promotion. That is the opposite of dead weight: it is a
live block with its release valve broken off. Fix.

## What this leaves for a decision

- **`bre_for_fra` S0089L03's known clip points at Mandarin.** One row, not
  patched here.
- **Nothing has ever been signed off.** The gate now works; whether the first
  play-through gets scheduled is a producer call, not a code one. Until it does,
  no course can be promoted to learner-visible except under a recorded override.
