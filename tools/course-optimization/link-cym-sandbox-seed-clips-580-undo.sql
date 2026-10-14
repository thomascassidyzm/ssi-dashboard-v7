-- Undo of link-cym-sandbox-seed-clips-580.sql (job #580): puts the linked seeds' three audio slots and last_edit_event_id back to
-- their backup rows, checks they match the backup and drops it, in one transaction. Refuses if a linked seed was edited since.
-- Dry run unless -v finish=COMMIT.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN ISOLATION LEVEL REPEATABLE READ;
DO $$ BEGIN
  IF to_regclass('backup_cym_seed_clips_580') IS NULL THEN RAISE EXCEPTION 'not applied (no backup_cym_seed_clips_580)'; END IF;
END $$;
SELECT count(*) AS locked_seeds FROM (SELECT 1 FROM course_seeds s JOIN backup_cym_seed_clips_580 b ON b.id = s.id FOR UPDATE OF s) x;
CREATE TEMP TABLE undo_ev AS SELECT id FROM content_edit_events WHERE detail->>'backup'='backup_cym_seed_clips_580';
DO $$ BEGIN
  IF (SELECT count(*) FROM course_seeds s JOIN backup_cym_seed_clips_580 b ON b.id = s.id WHERE s.last_edit_event_id IN (SELECT id FROM undo_ev))
     <> (SELECT count(*) FROM backup_cym_seed_clips_580) THEN RAISE EXCEPTION 'a linked seed was edited since #580: undo by hand'; END IF;
  IF (SELECT count(*) FROM backup_cym_seed_clips_580_links k JOIN course_seeds s ON s.id = k.seed_id
      WHERE CASE k.slot WHEN 'known' THEN s.known_audio_id WHEN 'target1' THEN s.target1_audio_id ELSE s.target2_audio_id END = k.audio_id)
     <> (SELECT count(*) FROM backup_cym_seed_clips_580_links) THEN RAISE EXCEPTION 'a linked slot no longer holds the #580 take: undo by hand'; END IF;
END $$;
UPDATE course_seeds s SET known_audio_id = b.known_audio_id, target1_audio_id = b.target1_audio_id, target2_audio_id = b.target2_audio_id,
  last_edit_event_id = b.last_edit_event_id FROM backup_cym_seed_clips_580 b WHERE s.id = b.id;
DO $$ BEGIN
  -- version and updated_at are bumped by the increment_version trigger on every update and cannot be put back.
  IF EXISTS (SELECT 1 FROM course_seeds s JOIN backup_cym_seed_clips_580 b ON b.id = s.id WHERE (to_jsonb(s) - 'version' - 'updated_at') <> (to_jsonb(b) - 'version' - 'updated_at')) THEN
    RAISE EXCEPTION 'CHECK FAILED: seeds after undo differ from the backup'; END IF;
  RAISE NOTICE 'RESTORED: % seeds identical to the backup but for version/updated_at', (SELECT count(*) FROM backup_cym_seed_clips_580);
END $$;
DROP TABLE backup_cym_seed_clips_580, backup_cym_seed_clips_580_links;
SELECT 'finishing with' k, :'finish' v;
:finish;
