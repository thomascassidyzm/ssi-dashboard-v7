-- Undo of weave-cym-sv2-new-pairing-468.sql (job #468). cym_sv2_for_eng ONLY. Dry run unless psql -v finish=COMMIT.
-- Deletes exactly the rows it added (refusing if any was edited since), restores is_new from backup_cym_sv2_newpairing_468.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
CREATE TEMP TABLE added (id text PRIMARY KEY);
INSERT INTO added VALUES ('cym_sv2_for_eng:S1407L03U07'), ('cym_sv2_for_eng:S1407L03U08'), ('cym_sv2_for_eng:S1407L03U09'), ('cym_sv2_for_eng:S1432L04U09'), ('cym_sv2_for_eng:S1432L04U10'), ('cym_sv2_for_eng:S1432L04U11'), ('cym_sv2_for_eng:S1442L03U09'), ('cym_sv2_for_eng:S1442L03U10'), ('cym_sv2_for_eng:S1442L03U11'), ('cym_sv2_for_eng:S1474L03U07'), ('cym_sv2_for_eng:S1474L03U08'), ('cym_sv2_for_eng:S1474L03U09'), ('cym_sv2_for_eng:S1504L04U07'), ('cym_sv2_for_eng:S1504L04U08'), ('cym_sv2_for_eng:S1504L04U09'), ('cym_sv2_for_eng:S1505L01U07'), ('cym_sv2_for_eng:S1505L01U08'), ('cym_sv2_for_eng:S1505L01U09'), ('cym_sv2_for_eng:S1506L04U08'), ('cym_sv2_for_eng:S1506L04U09'), ('cym_sv2_for_eng:S1506L04U10'), ('cym_sv2_for_eng:S1563L01U08'), ('cym_sv2_for_eng:S1563L01U09'), ('cym_sv2_for_eng:S1563L01U10'), ('cym_sv2_for_eng:S1584L04U07'), ('cym_sv2_for_eng:S1584L04U08'), ('cym_sv2_for_eng:S1584L04U09');
SELECT id AS ev FROM content_edit_events WHERE course_code = 'cym_sv2_for_eng' AND detail->>'backup' = 'backup_cym_sv2_newpairing_468'
  ORDER BY occurred_at DESC LIMIT 1 \gset
DO $$ BEGIN
  IF to_regclass('backup_cym_sv2_newpairing_468') IS NULL THEN RAISE EXCEPTION 'not applied (no backup_cym_sv2_newpairing_468)'; END IF;
END $$;
CREATE TEMP TABLE ev AS SELECT :'ev'::uuid AS id;
DO $$ BEGIN
  IF (SELECT count(*) FROM course_practice_phrases p JOIN added a USING (id) WHERE p.last_edit_event_id = (SELECT id FROM ev)) <> (SELECT count(*) FROM added) THEN
    RAISE EXCEPTION 'an added phrase is missing or was edited since: undo by hand'; END IF;
END $$;
DELETE FROM course_practice_phrases WHERE id IN (SELECT id FROM added) AND course_code = 'cym_sv2_for_eng';
-- --already-taught: is_new was not written here, so it is not restored here (backup_cym_sv2_newpairing_468 records it for reference).
DROP TABLE backup_cym_sv2_newpairing_468;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
