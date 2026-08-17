# A-134 step 5/5 — eng_for_sin orphan presentation clips, soft-deleted 2026-08-17

Plate A-134. Kai ruled 2026-08-17 that spend and going-live on this plate are authorised.

## What these 6 rows are

Of the 33 corrupt presentation clips found earlier in `eng_for_sin`, 27 are linked to a
real card (`course_legos.presentation_audio_id` points at them) and are being replaced
separately — **not touched here**. These 6 carry the same corrupt-text defect but their
`lego_id` does not exist in `course_legos` for `eng_for_sin` at all — consistent with the
presentation set having been composed against a LEGO numbering that has since been
renumbered. A learner resolves audio only by `course_audio.id`, and nothing points at
these 6 ids, so nothing ever played them.

| lego_id | course_audio.id | s3_key |
|---|---|---|
| S0181L03 | `8790e212-3bc8-44f7-b9eb-c4b31b46528e` | `mastered/04E2C7C1-B9C6-4649-BCFE-ED23E76DC18F.mp3` |
| S0181L04 | `c4937825-2c14-4842-9188-7154c49579b3` | `mastered/C3178B51-593C-489D-960F-406FF0397042.mp3` |
| S0197L03 | `7d70e86c-ad79-43b4-b24b-42e1b47d9caf` | `mastered/0CDD6A71-7F7E-483A-8DB7-BC01AF7C9CBA.mp3` |
| S0198L03 | `9a179777-4fa9-4d4b-bbb6-8e01a46e0c6c` | `mastered/55477201-B035-4445-BB4B-D3C8DECA364A.mp3` |
| S0202L03 | `1b7796d6-ed4a-4913-b421-9bc6860b4f00` | `mastered/A1A79699-D44A-40F0-8DF4-2832085AB218.mp3` |
| S0204L02 | `3eade834-d625-4ba7-8392-0abf5936c35c` | `mastered/8575875C-020F-49E0-BBA9-920E11D7B77F.mp3` |

Full rows (all columns: text, voice_id, duration_ms, word_boundaries, provenance, etc.)
are in [`orphan-archive.json`](./orphan-archive.json) alongside this doc, dumped from the
live DB before any row was touched.

Note: the query for these `lego_id`s at `course_audio` also returns 21 rows total — the
other 15 are `known`/`target1`/`target2` audio for the same `lego_id`s, e.g. "mother",
"doctor", "teacher", "council", "nobody", "arrangements". **Those 15 are untouched.**
They were not in scope for this job (only the 6 presentation-role clips were named) and
the independent verification below is scoped to the presentation rows only — a claim
about those 15 rows' link status is an explicit gap, not asserted here.

## Independent orphan verification (done before any change)

For each of the 6 presentation rows:

1. `SELECT * FROM course_legos WHERE course_code='eng_for_sin' AND lego_id = <lego_id>`
   → **0 rows** for all 6. The LEGO these clips were built for does not exist in the
   course today.
2. `SELECT * FROM course_legos WHERE known_audio_id = <id> OR target1_audio_id = <id> OR
   target2_audio_id = <id> OR presentation_audio_id = <id>` (across **all** courses, not
   just `eng_for_sin`) → **0 rows** for all 6.
3. Swept every other column in the `public` schema named `*_audio_id` or `*_clip_id`
   (`course_practice_phrases`, `course_seeds`, `lego_introductions`,
   `listening_pod_sentences`, `pod_legos`, `audio_clip_flags`, `audio_clip_signoffs`,
   `audio_clip_promotions`, `content_feedback`, `course_qa_cycle_clips`,
   `feedback_aggregated`, `course_audio_revisions`, `course_audio_envelope`,
   `audio_repair_candidates`) → all **clean (0)** except `course_qa_clip_status`, which
   held one row per id. That table has **no FK constraint** to `course_audio` (confirmed
   via `pg_constraint`) — it's QA-tracking metadata *about* the clip (`status:
   'unverified'`, no sign-off), not a reference *into* the clip from course content. It
   doesn't contradict the orphan claim; it's just a stale QA-queue entry that will now
   point at an archived clip. Left as-is — no FK to break, and it carries no learner-facing
   consequence. Flagged here rather than silently ignored.

No row of the 6 was referenced anywhere. All 6 proceed.

## Schema gap: no soft-delete column exists

`course_audio` has no `status`/`deleted`/`archived` column. Checked before choosing a
marker:

- `role` is pinned by a CHECK constraint (`course_audio_role_check`) to a fixed list —
  `known`/`target1`/`target2`/`presentation`/`welcome`/`encouragement`/`instruction`/
  `bookend_listen_intro`/`bookend_listen_outro`/`pod_explainer`/`pod_fine_known`/
  `pod_take_g`. No `archived` value is allowed.
- `course_code` has `FOREIGN KEY ... REFERENCES courses(course_code) ON DELETE CASCADE` —
  can't repoint it to a synthetic archived course code without that code existing in
  `courses`.
- No other column is free of constraints and semantically neutral **except** `lego_id`,
  which has no FK and only a plain non-unique index (`idx_course_audio_lego`).

**Marker used:** `lego_id` prefixed with `ARCHIVED_ORPHAN_2026-08-17_`, e.g.
`S0181L03` → `ARCHIVED_ORPHAN_2026-08-17_S0181L03`. This de-lists the row from any
`lego_id`-keyed lookup or census (it was already orphaned, so nothing was resolving by
that value anyway) while touching nothing else on the row — same `id`, same `text`, same
`voice_id`, same `s3_key`, same `word_boundaries`. The original `lego_id` is preserved
verbatim in `orphan-archive.json` (`original_lego_id`) for restoration.

This is the plainly-stated gap the job brief asked for: **the schema offers no dedicated
soft-delete column**; this is the least-destructive substitute available today.

## What was changed

Applied to all 6 rows, via the [`Client`/`pg`] connection (no ORM):

```sql
UPDATE course_audio SET lego_id = 'ARCHIVED_ORPHAN_2026-08-17_S0181L03' WHERE id = '8790e212-3bc8-44f7-b9eb-c4b31b46528e';
UPDATE course_audio SET lego_id = 'ARCHIVED_ORPHAN_2026-08-17_S0181L04' WHERE id = 'c4937825-2c14-4842-9188-7154c49579b3';
UPDATE course_audio SET lego_id = 'ARCHIVED_ORPHAN_2026-08-17_S0197L03' WHERE id = '7d70e86c-ad79-43b4-b24b-42e1b47d9caf';
UPDATE course_audio SET lego_id = 'ARCHIVED_ORPHAN_2026-08-17_S0198L03' WHERE id = '9a179777-4fa9-4d4b-bbb6-8e01a46e0c6c';
UPDATE course_audio SET lego_id = 'ARCHIVED_ORPHAN_2026-08-17_S0202L03' WHERE id = '1b7796d6-ed4a-4913-b421-9bc6860b4f00';
UPDATE course_audio SET lego_id = 'ARCHIVED_ORPHAN_2026-08-17_S0204L02' WHERE id = '3eade834-d625-4ba7-8392-0abf5936c35c';
```

`role`, `text`, `voice_id`, `s3_key`, `duration_ms`, `word_boundaries`, `course_code`,
and every other column were **not** touched. No `DELETE` was ever run. No S3 object was
touched or deleted — all 6 mp3s remain at their `mastered/...` keys.

`course_audio` carries an `AFTER DELETE OR UPDATE` trigger (`course_audio_audit` →
`audit_content_change()`) that writes the pre-change row into `content_audit_log`, so the
before-state is captured twice over: once in this doc/JSON, once in the DB's own audit
log.

## Reversal SQL

```sql
UPDATE course_audio SET lego_id = 'S0181L03' WHERE id = '8790e212-3bc8-44f7-b9eb-c4b31b46528e';
UPDATE course_audio SET lego_id = 'S0181L04' WHERE id = 'c4937825-2c14-4842-9188-7154c49579b3';
UPDATE course_audio SET lego_id = 'S0197L03' WHERE id = '7d70e86c-ad79-43b4-b24b-42e1b47d9caf';
UPDATE course_audio SET lego_id = 'S0198L03' WHERE id = '9a179777-4fa9-4d4b-bbb6-8e01a46e0c6c';
UPDATE course_audio SET lego_id = 'S0202L03' WHERE id = '1b7796d6-ed4a-4913-b421-9bc6860b4f00';
UPDATE course_audio SET lego_id = 'S0204L02' WHERE id = '3eade834-d625-4ba7-8392-0abf5936c35c';
```

Restoring these 6 to active status (should a LEGO renumbering ever bring
S0181L03/S0181L04/S0197L03/S0198L03/S0202L03/S0204L02 back into `course_legos` for
`eng_for_sin`) is exactly: run the reversal SQL, then re-link the relevant
`course_legos.presentation_audio_id` to the restored `course_audio.id` by hand — nothing
auto-relinks a `lego_id` value back into a card.

## Order of operations followed

1. Dumped and verified all 6 rows (this doc + JSON) — done first.
2. Committed doc + JSON to this branch **before** touching any row.
3. Ran the 6 `UPDATE` statements above.
4. Re-verified post-change (see below).

## Post-apply verification

- All 6 `UPDATE`s returned `rowCount: 1` (matched on `id AND` the prior `lego_id`, so a
  re-run would no-op rather than double-apply).
- Re-selected all 6 rows post-change: `role`, `text`, `text_normalized`, `s3_key`,
  `duration_ms`, `voice_id`, `language`, `word_boundaries` all confirmed byte-identical to
  the pre-change dump. Only `lego_id` changed.
- `HeadObjectCommand` against S3 (`bucket ssi-audio-stage`) for all 6 `s3_key`s: **all 6
  EXIST**, byte counts unchanged (90432 / 87552 / 91296 / 99648 / 97056 / 86112 bytes for
  S0181L03 / S0181L04 / S0197L03 / S0198L03 / S0202L03 / S0204L02 respectively). No S3
  object was deleted or modified.

Full post-apply detail recorded in `orphan-archive.json` → `post_apply_verification`.
