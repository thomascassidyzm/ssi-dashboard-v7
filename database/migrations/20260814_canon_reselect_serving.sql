-- ============================================================================
-- Re-select canon for identities whose canonical object is not learner-serving.
--
-- Tom's approval, 2026-08-14. An unaccepted proposal is never canon.
--
-- Reversible: every change is written to audio_clip_promotions with the
-- superseded key, reason 'reselect_nonserving_canon'. No S3 object is deleted;
-- the old object (403 or not) stays exactly where it is.
--
-- Selection uses the SAME ladder as the original backfill — human, then
-- veracity-passed, then measured, then oldest — restricted to members whose
-- own s3_key is on the serving prefix. Every replacement was fetched from the
-- public endpoint and confirmed to be real audio BEFORE this ran: 334 of 334.
-- ============================================================================
\set ON_ERROR_STOP on
SET statement_timeout = 0;

BEGIN;

INSERT INTO audio_clip_promotions
  (clip_id, old_s3_key, new_s3_key, old_origin, new_origin,
   old_revision, new_revision, reason, source_audio_id)
SELECT r.clip_id, r.old_s3_key, r.new_s3_key, r.old_origin, r.new_origin,
       r.old_revision, r.old_revision + 1, 'reselect_nonserving_canon', r.new_source_audio_id
FROM _canon_reselect r;

UPDATE audio_clips c
SET s3_key              = r.new_s3_key,
    duration_ms         = r.new_duration_ms,
    file_size_bytes     = r.new_file_size,
    word_boundaries     = r.new_word_boundaries,
    origin              = r.new_origin,
    text                = r.new_text,
    veracity_checked_at = r.veracity_checked_at,
    veracity_pass       = r.veracity_pass,
    veracity_reason     = r.veracity_reason,
    veracity_cer        = r.veracity_cer,
    veracity_attempts   = r.veracity_attempts,
    veracity_checker    = r.veracity_checker,
    audio_revision      = c.audio_revision + 1,
    source_audio_id     = r.new_source_audio_id,
    updated_at          = now()
FROM _canon_reselect r
WHERE c.id = r.clip_id;

COMMIT;
