# Bucket (b) convergence — done. And bucket (c) is permanently closed.

**2026-08-14. Live database. Verified on served bytes at every step.**

Tom's doctrine: **human decisions outrank canon.** A clip touched by human QA IS the
canon for that line — convergence promotes it, never over it. Divergence is a signal
to classify, not automatically an error to fix.

## The partition, and what happened to each bucket

| Bucket | Rows | Ruling | Touched |
|---|---|---|---|
| **(a) provably human-corrected** | 5,570 | Promote to canon, never converge | **0** |
| **(b) provably stale/duplicate** | 204,221 | Approved for convergence | **202,917 converged** |
| **(c) unknown** | 52,306 | **Permanently unconverged** | **0** |

Verified after the run: every one of the 5,570 (a) rows and all 52,306 (c) rows
still diverge — i.e. still serve their own bytes. Zero rows outside bucket (b)
appear in the convergence log.

97 courses had `audio_stamp` bumped, once each, so the player's cache invalidates.

## Bucket (c) is a ruling, not a deferral

- An unprovable divergence **keeps what learners currently hear**. Existing bytes stay authoritative.
- The storage cost of **52,306 duplicate S3 objects is knowingly accepted** as the price of not guessing.
- The **only** thing that may ever reclassify a (c) row is **positive evidence** — a human
  re-record through the new recordist pipeline, which self-resolves the row by giving it
  real provenance. It then belongs in bucket (a), and is **promoted**, not converged.
- **No batch process may revisit bucket (c) speculatively.** A future sweep that finds
  52,306 "unresolved" rows and decides to finish the job is the exact failure this ruling
  prevents. There is nothing to finish.

## Excluded from the approved 204,221

| Excluded | Rows | Why |
|---|---|---|
| Legacy `text_normalized` | 1,088 | `trg_course_audio_normalize` would re-key the row on UPDATE and collide with `unique_course_audio_per_voice` |
| Dead canonical object | 216 | Canonical object returns HTTP 403 — not learner-serving |

## Two defects this pass exposed

**1. 623 canonical clips point at unaccepted repair candidates.** Canon selection preferred
the *oldest* row, and for some identities the oldest is a `repair-candidates/` object — a take
**proposed** for a human decision and never accepted. An unaccepted candidate became canon:
the human-outranks-canon doctrine violated in reverse. Canon selection must exclude any
prefix that is not learner-serving. **Not fixed here** — re-selecting canon is a different
write and needs its own approval.

**2. 12 `fra_for_eng` rows were converged onto 403 objects, and restored.** The pre-flight
emitted `failures.slice(0, 200)` beside an honest `failed=212`, and the exclusion set was
built from the truncated array. All 12 restored from `audio_convergence_log`
(pass `REVERT-nonserving-2026-08-14`) and byte-verified serving real audio again. The slice
is gone. A capped list beside an uncapped count is worse than no list: both numbers look
right and only one is usable.

## Verification evidence

- **Pre-flight:** all **49,802** distinct canonical objects fetched from the public endpoint
  before a single row was repointed. 49,590 alive, 212 dead — the dead ones excluded.
- **Probe, before and after:** 20 randomly selected rows, real bytes fetched and SHA-256'd
  either side of the write. **20/20 now serve exactly the canonical bytes.** 16 of the 20
  changed bytes; 4 were already byte-identical under a different key — the pure-duplicate case.
- **Reverted rows:** all 12 re-fetched, all HTTP 200, all real MP3.
- **Bucket safety:** 0 rows from (a) or (c) in the convergence log.

## Reversal

`audio_convergence_log` carries every `old_s3_key` → `new_s3_key` pair with the pass name.
No S3 object was deleted, so every superseded take is still on the bucket and any row or the
whole pass can be restored from the log — as the 12 already were.
