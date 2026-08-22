-- A SECOND test-language course, so the by-language recordist queue can be
-- driven end to end on the one thing a single course cannot prove: that the
-- same sentence appearing in two courses is ONE recording, and that the take
-- fills both pods.
--
-- Test language 'zzz' only — hidden, never learner-facing, no TTS, no cost.
-- Its pod deliberately repeats zzz_test_for_eng:pod-0-s2's line verbatim.
--
-- Reverse with:
--   delete from listening_pod_sentences where pod_id = 'zzz_test2_for_eng:pod-0';
--   delete from listening_pods  where course_code = 'zzz_test2_for_eng';
--   delete from course_audio    where course_code = 'zzz_test2_for_eng';
--   delete from courses         where course_code = 'zzz_test2_for_eng';

insert into courses (course_code, display_name, known_lang, target_lang, visibility, status, voice_config)
values (
  'zzz_test2_for_eng',
  '[E2E TEST] Recordist by-language duplicate',
  'eng', 'zzz', 'hidden', 'draft',
  jsonb_build_object('podCast', jsonb_build_object(
    'Customer', jsonb_build_object('name','Tom','email','tom@saysomethingin.com','gender','m','voiceId','human_tom_zzz'),
    'Barista',  jsonb_build_object('name','Test Voice F','email','test-f@ssi-test.invalid','gender','f','voiceId','human_test_f_zzz')
  ))
)
on conflict (course_code) do nothing;

insert into listening_pods (id, course_code, pod_type, slug, speakers)
values ('zzz_test2_for_eng:pod-0', 'zzz_test2_for_eng', 'core', 'pod-0',
        '["Customer","Barista"]'::jsonb)
on conflict (id) do nothing;

insert into listening_pod_sentences
  (id, pod_id, scene_number, sentence_number, global_order, speaker, target_text, known_text)
values
  ('zzz_test2_for_eng:pod-0-s1', 'zzz_test2_for_eng:pod-0', 1, 1, 1, 'Customer', 'A coffee, please.', 'A coffee, please.'),
  ('zzz_test2_for_eng:pod-0-s2', 'zzz_test2_for_eng:pod-0', 1, 2, 2, 'Barista',  'Of course.',        'Of course.')
on conflict (id) do nothing;
