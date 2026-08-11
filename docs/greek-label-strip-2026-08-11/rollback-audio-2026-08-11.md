# Rollback — ell_for_eng presentation AUDIO re-render, 2026-08-11

The text-only rollback for this campaign is in `rollback.md`. This file covers the
second half: the 16 clips whose audio was re-rendered after Kai approved the spend.

**Nothing was deleted.** All 16 superseded S3 objects were re-headed after the
swap and all 16 are still in the bucket.

## What changed

16 rows in `course_audio`, all `role='presentation'`, all `ell_for_eng`, all
revision 1 → 2. Ids and old values: `audio-before-image-2026-08-11.json`.

Per row the swap set `s3_key`, `duration_ms`, `file_size_bytes`,
`audio_revision`, `veracity_*`, and cleared `word_boundaries` (stale against the
new bytes — the word-boundary pass recomputes them).

**`text`, `text_normalized`, `language`, `role` and `voice_id` were NOT touched.**
That is what keeps `unique_course_audio_per_voice` satisfied with no tombstone,
and it is why no row was created, deleted or orphaned and no FK moved.

## Three independent ways to undo it

1. **The pipeline's own revert** — preferred, it is what the mechanism is for:
   `require('./services/audio-repair.cjs').revert({ courseCode: 'ell_for_eng', audioId: '<id>', actor: '<you>' })`
   `course_audio_revisions` holds the previous key for each of the 16, so this is
   a data-only operation.

2. **From the before-image**, if the ledger is ever in doubt:
   `PATCH course_audio?id=eq.<id>` with `s3_key`, `duration_ms`,
   `file_size_bytes`, `audio_revision`, `word_boundaries` and the `veracity_*`
   fields taken from `audio-before-image-2026-08-11.json` → `course_audio[]`.

3. **The old bytes are still fetchable** at the `s3_key` recorded in the
   before-image, independently of either of the above.

Reverting to revision 1 restores audio that SPEAKS THE GRAMMAR LABEL — that is
the defect this pass removed. Revert only to undo damage, not to tidy up.

## Why revision, not a new clip id

`ssi-learning-app/api/audio/[audioId].ts` serves audio `immutable` for a year and
player-vue caches blobs in IndexedDB by audio id, so fresh bytes under an
unchanged URL would never reach a device that had already played the old clip.
`fetchRevisedAudioRefs()` in `api/_utils/audioAccess.ts` stamps every clip with
`audio_revision > 1` as `<uuid>.v<rev>`, `AUDIO_ID_COLUMNS` includes
`presentation_audio_id`, and `cycles.ts` applies it — so the URL changed while the
id did not. Checked, not assumed.

## The one clip that needed a relaxed gate

S0216L01 / `848e39ea` ("The Greek for: 'I saw', is:") was refused by the standard
veracity gate on `last_word_missing` across three independent takes. The decode
was `"The Greek 'for', 'I saw', 'is'."` — every word present, CER 0.167 against a
0.3 threshold. Rule 3 fired because `normalise()` keeps apostrophes, so the
script's `is` and whisper's `'is'` are 2 edits apart on a word whose length gives
it tolerance 0. Re-scored with apostrophes stripped from both sides it passes at
CER 0. Reasoning, and the one-off wrapper that did it without editing the shared
gate: `propose-s0216-apostrophe-blind.cjs`. Its stored verdict reason is
`ok_apostrophe_blind`, not `ok`, so it is distinguishable in the row.

**Recommendation, not done here:** the same false positive will fire on any
`"The X for: 'Y', is:"` intro whose final word whisper happens to quote — the
other 15 passed only because it did not. Widening `normalise()` to drop
apostrophes, or exempting quote characters from the last-word comparison, is a
one-line change in `services/audio-veracity.cjs`, but that gate screens every
clip on the estate and the change is out of this job's remit.
