-- Verifies 20261111_human_authored_presentations_soft_guard. Writes two probes and ROLLS THEM BACK: nothing persists.
-- Every live fact it reads is RAISE NOTICEd, so the run's output is itself the evidence. Fails (ON_ERROR_STOP) unless:
--   * guard column: text, NOT NULL, DEFAULT 'hard' (a missing default fails: NULL is checked explicitly);
--   * every row is 'hard' or 'soft', none NULL (counts noticed; soft rows are legitimate after application, cs #437);
--   * constraint human_authored_presentations_guard_check: CHECK, validated, guard IN ('hard','soft');
--   * public.guard_human_authored_presentation(): SECURITY DEFINER, search_path=public, pg_temp, carries the
--     soft early return / check_violation / REFUSED message, and md5(prosrc) equals the md5 of the exact body between
--     the $$ markers in 20261111_human_authored_presentations_soft_guard.sql (32390c1bfa260b5f3dc9bbe4c9a01731, 1218 chars);
--   * an enabled trigger on public.course_audio calls that function;
--   * a soft mark admits different words (the course_audio insert lands, ROW_COUNT 1);
--   * a hard mark refuses different words with the AUTHORSHIP guard's own message, naming that course/lego —
--     any other check_violation, or no exception, fails.
-- cs #438·AI closed the gaps #436·AI's cold verify found in the first version of this file.
BEGIN;
DO $$
DECLARE
  c text; col record; con record; fn record; trg record;
  n_rows int; n_hard int; n_soft int; n_null int; n_other int; n int;
  body_md5 text;
  expected_md5 constant text := '32390c1bfa260b5f3dc9bbe4c9a01731';
  msg text;
BEGIN
  -- 1. The column.
  SELECT is_nullable, column_default, data_type INTO col FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'human_authored_presentations' AND column_name = 'guard';
  IF NOT FOUND THEN RAISE EXCEPTION 'verify: guard column missing'; END IF;
  RAISE NOTICE 'live column guard: data_type=% is_nullable=% column_default=%', col.data_type, col.is_nullable, coalesce(col.column_default, '<NULL>');
  IF col.data_type IS DISTINCT FROM 'text' THEN RAISE EXCEPTION 'verify: guard data_type is %, not text', col.data_type; END IF;
  IF col.is_nullable IS DISTINCT FROM 'NO' THEN RAISE EXCEPTION 'verify: guard is nullable (%)', col.is_nullable; END IF;
  IF col.column_default IS NULL OR col.column_default NOT LIKE '''hard''%' THEN
    RAISE EXCEPTION 'verify: guard default is %, not ''hard''', coalesce(col.column_default, '<NULL>'); END IF;

  -- 2. The rows: hard or soft, never NULL.
  SELECT count(*),
         count(*) FILTER (WHERE guard = 'hard'),
         count(*) FILTER (WHERE guard = 'soft'),
         count(*) FILTER (WHERE guard IS NULL),
         count(*) FILTER (WHERE guard NOT IN ('hard', 'soft'))
    INTO n_rows, n_hard, n_soft, n_null, n_other
    FROM public.human_authored_presentations;
  RAISE NOTICE 'live rows: total=% hard=% soft=% null=% other=%', n_rows, n_hard, n_soft, n_null, n_other;
  IF n_null <> 0 OR n_other <> 0 THEN RAISE EXCEPTION 'verify: % rows NULL, % rows neither hard nor soft', n_null, n_other; END IF;

  -- 3. The constraint.
  SELECT con2.contype, con2.convalidated, pg_get_constraintdef(con2.oid) AS def INTO con
    FROM pg_constraint con2
   WHERE con2.conrelid = 'public.human_authored_presentations'::regclass
     AND con2.conname = 'human_authored_presentations_guard_check';
  IF NOT FOUND THEN RAISE EXCEPTION 'verify: constraint human_authored_presentations_guard_check missing'; END IF;
  RAISE NOTICE 'live constraint human_authored_presentations_guard_check: contype=% convalidated=% def=%', con.contype, con.convalidated, con.def;
  IF con.contype <> 'c' OR NOT con.convalidated THEN RAISE EXCEPTION 'verify: constraint is contype % validated %', con.contype, con.convalidated; END IF;
  IF con.def <> 'CHECK ((guard = ANY (ARRAY[''hard''::text, ''soft''::text])))' THEN
    RAISE EXCEPTION 'verify: constraint def is %', con.def; END IF;

  -- 4. The trigger function.
  SELECT p.oid, p.prosecdef, p.proconfig, p.prosrc INTO fn
    FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
   WHERE ns.nspname = 'public' AND p.proname = 'guard_human_authored_presentation' AND p.pronargs = 0;
  IF NOT FOUND THEN RAISE EXCEPTION 'verify: public.guard_human_authored_presentation() missing'; END IF;
  body_md5 := md5(fn.prosrc);
  RAISE NOTICE 'live function public.guard_human_authored_presentation(): prosecdef=% proconfig=% prosrc_md5=% prosrc_len=% (expected md5 %)',
    fn.prosecdef, fn.proconfig, body_md5, length(fn.prosrc), expected_md5;
  IF NOT fn.prosecdef THEN RAISE EXCEPTION 'verify: function is not SECURITY DEFINER'; END IF;
  IF fn.proconfig IS NULL OR NOT ('search_path=public, pg_temp' = ANY (fn.proconfig)) THEN
    RAISE EXCEPTION 'verify: function proconfig is %', fn.proconfig; END IF;
  IF position('v_mark.guard = ''soft''' IN fn.prosrc) = 0
     OR position('check_violation' IN fn.prosrc) = 0
     OR position('REFUSED: the presentation line of' IN fn.prosrc) = 0 THEN
    RAISE EXCEPTION 'verify: function body lacks the 20261111 markers'; END IF;
  IF body_md5 <> expected_md5 THEN RAISE EXCEPTION 'verify: function body md5 % differs from the migration''s %', body_md5, expected_md5; END IF;

  -- 5. The trigger that calls it.
  n := 0;
  FOR trg IN SELECT t.tgname, t.tgenabled FROM pg_trigger t
              WHERE t.tgrelid = 'public.course_audio'::regclass AND NOT t.tgisinternal AND t.tgfoid = fn.oid LOOP
    RAISE NOTICE 'live trigger on public.course_audio: % tgenabled=%', trg.tgname, trg.tgenabled;
    IF trg.tgenabled <> 'D' THEN n := n + 1; END IF;
  END LOOP;
  IF n = 0 THEN RAISE EXCEPTION 'verify: no enabled trigger on public.course_audio calls guard_human_authored_presentation()'; END IF;

  -- 6. Soft probe: a soft mark admits different words, and the insert really lands.
  SELECT course_code INTO c FROM public.courses ORDER BY course_code LIMIT 1;
  INSERT INTO public.human_authored_presentations (course_code, lego_id, text, author, source, guard)
    VALUES (c, 'S9999L95', 'Soft verify words.', 'verify', '__verify_20261111_soft__', 'soft'),
           (c, 'S9999L94', 'Hard verify words.', 'verify', '__verify_20261111_soft__', 'hard');
  INSERT INTO public.course_audio (course_code, text, text_normalized, language, role, voice_id, origin, s3_key, lego_id)
    VALUES (c, 'Different verify words.', 'different verify words.', 'eng', 'presentation', 'azure_en-GB-CanaryNeural', 'tts', 'pending/__VERIFY_SOFT__.mp3', 'S9999L95');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'verify: soft probe course_audio insert landed % rows, not 1', n; END IF;
  RAISE NOTICE 'soft probe: %/S9999L95 soft mark admitted different words (ROW_COUNT=%)', c, n;

  -- 7. Hard probe: the AUTHORSHIP guard, and nothing else, must refuse.
  BEGIN
    INSERT INTO public.course_audio (course_code, text, text_normalized, language, role, voice_id, origin, s3_key, lego_id)
      VALUES (c, 'Other verify words.', 'other verify words.', 'eng', 'presentation', 'azure_en-GB-CanaryNeural', 'tts', 'pending/__VERIFY_HARD__.mp3', 'S9999L94');
    RAISE EXCEPTION 'verify: a hard mark admitted different words';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT;
    IF msg NOT LIKE 'REFUSED: the presentation line of ' || c || '/S9999L94 %' THEN
      RAISE EXCEPTION 'verify: hard probe raised a check_violation that is not the authorship guard: %', msg; END IF;
    RAISE NOTICE 'hard probe: refused by the authorship guard: %', left(msg, 120);
  END;

  RAISE NOTICE 'verify OK: column, rows, constraint, function body, trigger, soft probe and hard probe all match 20261111';
END $$;
ROLLBACK;
