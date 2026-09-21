-- ROLLBACK for 20260921_revoke_anon_on_rls_off_tables.sql
--
-- ############################################################################
-- #  IF SOMETHING BROKE AND YOU ONLY WANT ONE TABLE BACK, THIS IS THE LINE.  #
-- #  Substitute the table name from the permission-denied error and run it:  #
-- #                                                                          #
-- #    GRANT ALL ON TABLE public.audio_clips TO anon, authenticated;         #
-- #                                                                          #
-- #  Then say which table it was, so the set can be corrected on the record. #
-- #  Do NOT run the whole file below unless you actually want all 22 open to #
-- #  the public internet again.                                              #
-- ############################################################################
--
-- The full undo, restoring the exact pre-2026-09-21 state:
--   anon and authenticated held DELETE, INSERT, REFERENCES, SELECT, TRIGGER,
--   TRUNCATE, UPDATE (i.e. ALL) on all 22 tables; USAGE/SELECT/UPDATE on the
--   four owned sequences; EXECUTE on the three functions (also held by PUBLIC);
--   and the postgres default ACL on schema public granted arwdDxtm on tables
--   and rwU on sequences to anon and authenticated.

BEGIN;

GRANT ALL PRIVILEGES ON TABLE
  public._audit_s3_touch, public._canon_alive, public._canon_lang_map,
  public._canon_reselect, public._canon_stage, public._canon_voice_map,
  public._converge_probe, public._converge_set, public._divergence_partition,
  public._fix_broken, public._fix_lang_map, public._fix_plan,
  public._fix_serving, public._fix_voice_map, public.audio_clip_promotions,
  public.audio_clips, public.audio_convergence_log,
  public.canonical_pod_walk_steps, public.canonical_script_versions,
  public.language_canonical, public.relink_refusals, public.voice_language_roles
TO anon, authenticated;

GRANT ALL PRIVILEGES ON SEQUENCE
  public.audio_clip_promotions_id_seq, public.audio_convergence_log_id_seq,
  public.canonical_script_versions_id_seq, public.relink_refusals_id_seq
TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.link_all_audio_ids(text)           TO anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_audio_to_content()            TO anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.course_audio_link_canonical_clip() TO anon, authenticated, PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated;

COMMIT;
