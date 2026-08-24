-- The zzz_test language: a REAL course on the REAL pipeline, for Tom to drive.
--
-- Tom, 2026-08-14: "I also need the ability to test this myself to make sure the
-- tool works perfectly with a non-course", "maybe we create a test-course so it
-- really does behave the same as a real course", "I'm able to load it up, and
-- then record whatever".
--
-- The requirement is that it be REAL: the same tables, the same upload path, the
-- same storage, the same playback, the same coverage bar. A mock or a demo mode
-- would be a failure of the requirement, because a fake pipeline cannot tell him
-- whether the real one works.
--
-- Two things this migration does:
--
-- 1. RETARGETS the course from target_lang 'eng' to 'zzz'. This matters more than
--    it looks. The queue is BY LANGUAGE now, so a test course still claiming to
--    be English would inject two dozen fake lines into the real English queue.
--    'zzz' is a first-class language as of tonight (tools/sync/reference/
--    language_codes.csv), so canonicalLanguage('zzz') resolves and clip identity
--    accepts it. The 'zzz' prefix also keeps it at the bottom of every
--    alphabetical list, which is the point of the name.
--
-- 2. GROWS the pod from 6 lines to 24 — enough to be worth recording, few enough
--    to finish in one sitting. Lines are short and deliberately distinct from one
--    another so that the identity dedupe (language, text_normalized, voice_id) is
--    exercised honestly rather than accidentally collapsing them.
--
-- The course stays status 'draft' and visibility 'hidden'. It is never
-- learner-facing. Nothing here is destructive: the six existing e2e clips are
-- left exactly where they are, still on disk, still reachable.

BEGIN;

-- 1. The language retarget + the cast.
--    Cast matches language_recording_policy for 'zzz': Tom records the male
--    queue himself, a placeholder holds the female queue. Character -> gender is
--    what routes a line to a queue, so every speaker used below is cast here.
UPDATE courses SET
  target_lang  = 'zzz',
  display_name = '[TEST] Recording Surface Test — safe to delete',
  voice_config = jsonb_set(
    COALESCE(voice_config, '{}'::jsonb),
    '{podCast}',
    '{
      "Barista":       {"name": "Test Voice F", "email": "test-f@ssi-test.invalid", "gender": "f", "voiceId": "human_test_f_zzz"},
      "Customer":      {"name": "Tom",          "email": "tom@saysomethingin.com",  "gender": "m", "voiceId": "human_tom_zzz"},
      "__explainer__": {"name": "Tom",          "email": "tom@saysomethingin.com",  "gender": "m", "voiceId": "human_tom_zzz"}
    }'::jsonb
  )
WHERE course_code = 'zzz_test_for_eng';

-- 2. The 18 further lines (global_order 7..24), continuing the same coffee-shop
--    scene so reading it aloud stays natural. Speakers alternate so both the male
--    and the female queue get a real amount of work: 12 lines each.
INSERT INTO listening_pod_sentences
  (id, pod_id, scene_number, sentence_number, global_order, speaker, target_text, known_text)
VALUES
  ('zzz_test_for_eng:pod-0-s7',  'zzz_test_for_eng:pod-0', 1,  7,  7,  'Barista',  'Thank you very much.',                  'Thank you very much.'),
  ('zzz_test_for_eng:pod-0-s8',  'zzz_test_for_eng:pod-0', 1,  8,  8,  'Customer', 'Is there somewhere I can sit?',         'Is there somewhere I can sit?'),
  ('zzz_test_for_eng:pod-0-s9',  'zzz_test_for_eng:pod-0', 1,  9,  9,  'Barista',  'There is a table by the window.',       'There is a table by the window.'),
  ('zzz_test_for_eng:pod-0-s10', 'zzz_test_for_eng:pod-0', 1, 10, 10,  'Customer', 'That looks perfect.',                    'That looks perfect.'),
  ('zzz_test_for_eng:pod-0-s11', 'zzz_test_for_eng:pod-0', 1, 11, 11,  'Barista',  'I will bring it over to you.',           'I will bring it over to you.'),
  ('zzz_test_for_eng:pod-0-s12', 'zzz_test_for_eng:pod-0', 1, 12, 12,  'Customer', 'That is very kind of you.',              'That is very kind of you.'),
  ('zzz_test_for_eng:pod-0-s13', 'zzz_test_for_eng:pod-0', 2, 1,  13,  'Barista',  'How is the coffee?',                     'How is the coffee?'),
  ('zzz_test_for_eng:pod-0-s14', 'zzz_test_for_eng:pod-0', 2, 2,  14,  'Customer', 'It is really good, thank you.',          'It is really good, thank you.'),
  ('zzz_test_for_eng:pod-0-s15', 'zzz_test_for_eng:pod-0', 2, 3,  15,  'Barista',  'We roast it here every morning.',        'We roast it here every morning.'),
  ('zzz_test_for_eng:pod-0-s16', 'zzz_test_for_eng:pod-0', 2, 4,  16,  'Customer', 'I did not know that.',                   'I did not know that.'),
  ('zzz_test_for_eng:pod-0-s17', 'zzz_test_for_eng:pod-0', 2, 5,  17,  'Barista',  'Would you like to try something new?',   'Would you like to try something new?'),
  ('zzz_test_for_eng:pod-0-s18', 'zzz_test_for_eng:pod-0', 2, 6,  18,  'Customer', 'Maybe tomorrow, I think.',               'Maybe tomorrow, I think.'),
  ('zzz_test_for_eng:pod-0-s19', 'zzz_test_for_eng:pod-0', 2, 7,  19,  'Barista',  'We are open until six.',                 'We are open until six.'),
  ('zzz_test_for_eng:pod-0-s20', 'zzz_test_for_eng:pod-0', 2, 8,  20,  'Customer', 'I will come back before then.',           'I will come back before then.'),
  ('zzz_test_for_eng:pod-0-s21', 'zzz_test_for_eng:pod-0', 2, 9,  21,  'Barista',  'See you tomorrow morning.',              'See you tomorrow morning.'),
  ('zzz_test_for_eng:pod-0-s22', 'zzz_test_for_eng:pod-0', 2, 10, 22,  'Customer', 'Have a good afternoon.',                  'Have a good afternoon.'),
  ('zzz_test_for_eng:pod-0-s23', 'zzz_test_for_eng:pod-0', 2, 11, 23,  'Barista',  'You too, take care.',                    'You too, take care.'),
  ('zzz_test_for_eng:pod-0-s24', 'zzz_test_for_eng:pod-0', 2, 12, 24,  'Customer', 'Goodbye for now.',                        'Goodbye for now.')
ON CONFLICT (id) DO UPDATE
  SET target_text = EXCLUDED.target_text,
      known_text  = EXCLUDED.known_text,
      speaker     = EXCLUDED.speaker;

UPDATE listening_pods
   SET title = 'Test Pod — Coffee Shop',
       metadata = COALESCE(metadata, '{}'::jsonb) || '{"test_only": true}'::jsonb
 WHERE id = 'zzz_test_for_eng:pod-0';

COMMIT;
