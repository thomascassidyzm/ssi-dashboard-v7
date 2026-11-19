-- cs #950: the LIVE definitions on the LEGO text-edit path, printed so they can be committed as the record
-- of what was there. Read-only.
\pset tuples_only on
\pset format unaligned
SET statement_timeout = '30s';
SELECT '-- live definitions dumped ' || now()::text || ' from ' || current_database();
SELECT pg_get_functiondef(p.oid) || E';\n'
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('null_lego_audio_on_text_change','audio_id_for_text_same_voice','normalize_text',
                     'audio_canon_voice','bump_course_version','touch_course_content_stamp',
                     'increment_version','audit_content_change','pull_audio_duration_on_link')
 ORDER BY p.proname;
SELECT '-- trigger: ' || pg_get_triggerdef(t.oid) || ';'
  FROM pg_trigger t WHERE t.tgrelid = 'public.course_legos'::regclass AND NOT t.tgisinternal ORDER BY t.tgname;
SELECT '-- index: ' || indexdef || ';' FROM pg_indexes
 WHERE schemaname = 'public' AND tablename IN ('course_audio','course_practice_phrases') ORDER BY tablename, indexname;
