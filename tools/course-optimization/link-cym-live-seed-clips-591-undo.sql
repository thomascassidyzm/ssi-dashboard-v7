-- Undo of link-cym-live-seed-clips-591.sql (job #591): puts the linked cym_s_for_eng seeds' three audio slots and last_edit_event_id
-- back to their backup rows, checks they match the backup and drops it, in one transaction. Refuses if a linked seed was edited since.
-- content_version is bumped FORWARD again (never rolled back) so devices that cached the linked clips drop them once more.
-- Dry run unless -v finish=COMMIT.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN ISOLATION LEVEL REPEATABLE READ;
DO $$ BEGIN
  IF to_regclass('backup_cym_seed_clips_591') IS NULL THEN RAISE EXCEPTION 'not applied (no backup_cym_seed_clips_591)'; END IF;
END $$;
SELECT count(*) AS locked_seeds FROM (SELECT 1 FROM course_seeds s JOIN backup_cym_seed_clips_591 b ON b.id = s.id FOR UPDATE OF s) x;
CREATE TEMP TABLE undo_ev AS SELECT id FROM content_edit_events WHERE detail->>'backup' = 'backup_cym_seed_clips_591';
DO $$ BEGIN
  IF (SELECT count(*) FROM course_seeds s JOIN backup_cym_seed_clips_591 b ON b.id = s.id WHERE s.last_edit_event_id IN (SELECT id FROM undo_ev))
     <> (SELECT count(*) FROM backup_cym_seed_clips_591) THEN RAISE EXCEPTION 'a linked seed was edited since #591: undo by hand'; END IF;
  IF (SELECT count(*) FROM backup_cym_seed_clips_591_links k JOIN course_seeds s ON s.id = k.seed_id
      WHERE CASE k.slot WHEN 'known' THEN s.known_audio_id WHEN 'target1' THEN s.target1_audio_id ELSE s.target2_audio_id END = k.audio_id)
     <> (SELECT count(*) FROM backup_cym_seed_clips_591_links) THEN RAISE EXCEPTION 'a linked slot no longer holds the #591 take: undo by hand'; END IF;
END $$;
UPDATE course_seeds s SET known_audio_id = b.known_audio_id, target1_audio_id = b.target1_audio_id, target2_audio_id = b.target2_audio_id,
  last_edit_event_id = b.last_edit_event_id FROM backup_cym_seed_clips_591 b WHERE s.id = b.id;
UPDATE courses SET content_version = (SELECT format('%s.%s.%s', p[1], p[2], p[3]::int + 1) FROM string_to_array(coalesce(content_version, '0.0.0'), '.') p)
WHERE course_code = 'cym_s_for_eng';
DO $$ BEGIN
  -- version and updated_at are bumped by the increment_version trigger on every update and cannot be put back.
  IF EXISTS (SELECT 1 FROM course_seeds s JOIN backup_cym_seed_clips_591 b ON b.id = s.id WHERE (to_jsonb(s) - 'version' - 'updated_at') <> (to_jsonb(b) - 'version' - 'updated_at')) THEN
    RAISE EXCEPTION 'CHECK FAILED: seeds after undo differ from the backup'; END IF;
  RAISE NOTICE 'RESTORED: % seeds identical to the backup but for version/updated_at; cym_s content_version now %',
    (SELECT count(*) FROM backup_cym_seed_clips_591), (SELECT content_version FROM courses WHERE course_code = 'cym_s_for_eng');
END $$;
DROP TABLE backup_cym_seed_clips_591, backup_cym_seed_clips_591_links, backup_cym_seed_clips_591_course;
SELECT 'finishing with' k, :'finish' v;
:finish;
