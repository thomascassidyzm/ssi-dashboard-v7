-- Verifies 20261111_human_authored_presentations_soft_guard. Writes a probe and ROLLS IT BACK: nothing persists.
-- Fails (ON_ERROR_STOP) unless: the guard column exists NOT NULL DEFAULT 'hard', every existing row is hard,
-- and a soft mark can be written and then admits different presentation words.
BEGIN;
DO $$
DECLARE c text; n_not_hard int; col record;
BEGIN
  SELECT is_nullable, column_default INTO col FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'human_authored_presentations' AND column_name = 'guard';
  IF NOT FOUND THEN RAISE EXCEPTION 'verify: guard column missing'; END IF;
  IF col.is_nullable <> 'NO' OR col.column_default NOT LIKE '''hard''%' THEN
    RAISE EXCEPTION 'verify: guard column is % / default %', col.is_nullable, col.column_default; END IF;
  EXECUTE 'SELECT count(*) FROM public.human_authored_presentations WHERE guard IS DISTINCT FROM ''hard''' INTO n_not_hard;
  IF n_not_hard <> 0 THEN RAISE EXCEPTION 'verify: % existing rows are not hard', n_not_hard; END IF;
  SELECT course_code INTO c FROM public.courses ORDER BY course_code LIMIT 1;
  EXECUTE 'INSERT INTO public.human_authored_presentations (course_code, lego_id, text, author, source, guard)
           VALUES ($1, ''S9999L95'', ''Soft verify words.'', ''verify'', ''__verify_20261111_soft__'', ''soft'')' USING c;
  INSERT INTO public.course_audio (course_code, text, text_normalized, language, role, voice_id, origin, s3_key, lego_id)
    VALUES (c, 'Different verify words.', 'different verify words.', 'eng', 'presentation', 'azure_en-GB-CanaryNeural', 'tts', 'pending/__VERIFY_SOFT__.mp3', 'S9999L95');
  RAISE NOTICE 'verify OK: guard column present NOT NULL default hard, 0 rows not hard, soft mark written and admitted different words';
END $$;
ROLLBACK;
