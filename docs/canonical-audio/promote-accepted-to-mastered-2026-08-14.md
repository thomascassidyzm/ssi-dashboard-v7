# 1,329 accepted clips promoted to `mastered/` — canon-eligible, byte-identical

**2026-08-14 · pass `promote-accepted-to-mastered-2026-08-14` · all 1,329 promoted, 0 failures, 0 could not be promoted**

Job 1c5b0f9b left one thing on the table: 1,329 `course_audio` rows that a learner can
hear today but which live off the serving convention — 1,303 on `repair-candidates/`,
26 on `mastered-v2/`. `mastered/` is the one prefix the bucket policy makes publicly
readable and the only prefix canon reuse will ever touch, so while those bytes played
fine, the clips could never become canon. Tom approved the promotion: the clips already
serve, so standardising where they live exposes nothing new.

This was a **plain byte copy**. Nothing was re-rendered. Nothing was re-chosen. The
source object's bytes are the only thing that ever reached `mastered/`.

## Result

| | count |
|---|---|
| in scope, re-measured live before touching anything | **1,329** |
| promoted and verified byte-identical | **1,329** |
| failed / could not be promoted | **0** |
| of which Tom's own acceptances | **292** — all PASS |
| `audio_clips` rows repointed alongside | 289 |
| S3 objects deleted or overwritten | **0** |

Prefix counts reconcile exactly: `mastered/` 2,563,234 → **2,564,563** (+1,329);
`repair-candidates/` 1,303 → **0**; `mastered-v2/` 26 → **0**; `pending/` **46,
untouched** (that is job 1c5b0f9b's queued re-render backlog, not this pass's business).
`audio_clips` is now 100% on `mastered/`. `audio_convergence_log` holds exactly 1,329
rows for this pass and no others — 1,303 stamped `repair-candidates`, 26 `mastered-v2`.

## Scope, re-measured rather than inherited

The handover's numbers were not trusted; the plan was recomputed from the live DB:

- 1,303 `repair-candidates/` rows, **every one** matched by a `status='accepted'` row in
  `audio_repair_candidates` on the same `audio_id` **and** the same `s3_key`.
- Deciders: `overnight-qc-campaign` 729, **`tom` 291**, `claude` 266,
  `greek-16-clips-generate (for Kai)` 16, **`watson-on-behalf-of-tom` 1** —
  the last two lines are Tom's own hand: **292**, matching his figure exactly.
- 26 `mastered-v2/` rows (all `zho_for_eng`), no repair-candidate row — live serving
  rows on a legacy prefix.
- 1,329 rows, 1,329 distinct keys. Courses: `deu_for_eng` 1,287, `zho_for_eng` 26,
  `ell_for_eng` 16.

## The one thing the dry run caught

Every `mastered-v2/X.mp3` has an **older `mastered/X.mp3` of the same UUID and different
bytes** — that is what "v2" meant. A naive same-basename promotion would have overwritten
26 existing objects. It didn't: the tool probes the destination first and refuses to write
over differing bytes. Those 26 took a **fresh `mastered/` UUID** instead, carrying the
identical source bytes. All 26 pre-existing `mastered/` originals were re-checked
afterwards and are still present, untouched. (They are referenced by zero rows in
`course_audio` and zero in `audio_clips` — superseded originals — but they were left
alone regardless.)

This is also why the first full dry run reported "1,303 ready, 26 skipped": the guard
firing is the guard working. The fix was a new key, never a forced write.

## Make-before-break, in order (`AUDIO_PIPELINE_ARCHITECTURE.md` §6b)

Per clip, and nothing out of order:

1. fetch the **source** object the way a learner's browser does — presigned GET, no
   credentials — and SHA-256 it;
2. probe the destination; **refuse** to write over an existing object with different
   bytes (an existing *identical* object is treated as already promoted);
3. `CopyObject` source → `mastered/…`, `ContentType: audio/mpeg` and the standard
   `CacheControl`, so promoted objects behave like every other `mastered/` object;
4. re-fetch the **new** key and require SHA-256 equality with the source — **a clip that
   fails here is never swapped**;
5. only then `INSERT` the supersede into `audio_convergence_log` and `UPDATE` the row,
   the `UPDATE` asserting the old key in its `WHERE` clause so a row that moved under us
   aborts the transaction whole rather than being silently overwritten;
6. re-read the stored key from the DB, fetch it again, SHA-256 must still match.

1,329/1,329 reached step 6 with `PASS`. A 20-row pilot apply ran first and came back
20/20 before the remaining 1,309 were released.

Old objects on `repair-candidates/` and `mastered-v2/` were **not deleted** — spot-checked
after the fact, 30/30 still present. Deletion is a separate decision on a separate day.

## Verification at the learner's own layer

S3-layer SHA equality proves the copy. It doesn't prove a learner receives it. So a second
pass fetched clips through the **real serving path** — `GET https://saysomethingin.app/api/audio/:audioId`,
the credentialed proxy in `ssi-learning-app/api/audio/[audioId].ts` — re-read each row's
stored `s3_key` from the live DB, and required the delivered bytes to SHA-256-match the
**source** bytes:

- **584 clips fetched, 584 PASS, 0 FAIL**, every one `200 audio/mpeg`.
- **All 292 of Tom's personal acceptances: 292/292 PASS** — not a sample, the complete set.
  What he picked is byte-for-byte what the learner now receives, from the new location.
- 292 machine-accepted clips sampled deterministically alongside them: 292/292 PASS.

## Files

- `tools/promote-accepted-clips-to-mastered.cjs` — the gated tool (DRY RUN default,
  `--apply`, `--limit` for pilots)
- `tools/verify-promoted-clips-serve.cjs` — the learner-layer verifier
- `docs/canonical-audio/promote-accepted-to-mastered-dryrun-log.json` — pre-apply dry run
- `docs/canonical-audio/promote-accepted-to-mastered-applied-log.json` — per-clip record:
  old key, new key, source SHA, destination SHA, stored key after, verdict
- `docs/canonical-audio/promote-accepted-to-mastered-serving-verification-full.json` —
  the 584-clip learner-path evidence

## What this unlocks

All 1,329 clips are now canon-eligible: they sit on the one prefix canon reuse reads, they
are anonymously fetchable like every other mastered object, and `audio_clips` no longer
has a single row off-convention. Human decisions were carried, never re-made — per
[[project_human_decisions_outrank_canon]], Tom's 292 acceptances moved as bytes, not as
choices to be revisited.
