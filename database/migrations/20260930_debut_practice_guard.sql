-- EVERY DEBUT KEEPS ITS PRACTICE — enforced by the database, for every course, whatever its status (job #912).
--
-- Tom 2026-09-30 11:35Z: "these courses are live already, so they can't ever move off being alive" —
-- the #906/#910 release gate only fires on a status change, and the damage happens to courses that are
-- already live. The JS sweep-exit hook misses write paths (job #909). So the rule lives HERE, where no
-- path can walk round it: a transaction that would leave a debut LEGO (is_new = true) with no real
-- practice phrase is refused at COMMIT.
--
-- Rulings: r-2026-09-30-practice-phrases-belong-to-a-lego, r-2026-09-30-a-debut-lego-counts-as-practised.
-- A real practice phrase = a BUILD or USE row under the LEGO whose target is not the bare LEGO itself
-- (the SQL twin of phrase-structure.cjs isBareLegoPhrase / text-normalization.cjs normalizeForContainment;
-- a live test pins the two together). S0001L01 has a phrase floor of 0 and is never checked.
--
-- GRANDFATHERED: a debut that is ALREADY empty (the #911 backlog) may be written to, and every unrelated
-- write passes; only a write that MAKES a debut empty is refused. INSERTing a new LEGO is a birth, not a
-- loss — a builder inserts LEGOs before their phrases — so it passes; the release gate (new courses) and
-- the daily alarm (live courses) cover an empty birth.
--
-- DEFERRED to commit, so a transaction may move, replace or re-home rows in any order as long as it ends
-- whole. A seed teardown (phrases then LEGOs) must therefore happen in ONE transaction:
-- public.wipe_seed_teaching() below is that transaction, and every JS wipe path calls it.
--
-- Rollback: the ROLLBACK.sql sibling.

CREATE OR REPLACE FUNCTION public.debut_norm(t text)
 RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT btrim(regexp_replace(
           regexp_replace(
             regexp_replace(lower(coalesce(t, '')), '[ً-ْ]', '', 'g'),
             '[.,!?;:¿¡«»"''。，！？؟،؛、：；]', '', 'g'),
           '[\s 　]+', ' ', 'g'))
$$;

-- Does this LEGO key have at least one real practice phrase, judged against lego_target?
CREATE OR REPLACE FUNCTION public.debut_is_practised(p_course text, p_seed int, p_idx int, p_lego_target text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM course_practice_phrases p
     WHERE p.course_code = p_course AND p.seed_number = p_seed AND p.lego_index = p_idx
       AND p.phrase_role IN ('build', 'use')
       AND (debut_norm(p_lego_target) = '' OR debut_norm(p.target_text) <> debut_norm(p_lego_target)))
$$;

-- Raise if the LEGO now at this key is a debut with no real practice. p_grandfathered short-circuits.
CREATE OR REPLACE FUNCTION public.debut_guard_assert(p_course text, p_seed int, p_idx int, p_why text)
 RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE l course_legos%ROWTYPE;
BEGIN
  IF p_seed = 1 AND p_idx = 1 THEN RETURN; END IF;             -- phrase floor 0 (phraseFloor)
  SELECT * INTO l FROM course_legos WHERE course_code = p_course AND seed_number = p_seed AND lego_index = p_idx;
  IF NOT FOUND OR NOT l.is_new THEN RETURN; END IF;             -- LEGO gone, or not a debut
  IF debut_is_practised(p_course, p_seed, p_idx, l.target_text) THEN RETURN; END IF;
  RAISE EXCEPTION 'DEBUT_WITHOUT_PRACTICE: % % "%" → "%" would be left with no practice phrase (%)',
      p_course, l.lego_id, l.known_text, l.target_text, p_why
    USING ERRCODE = 'check_violation',
          HINT = 'A debut LEGO (is_new) keeps at least one BUILD or USE phrase beyond the bare LEGO. '
              || 'Write the replacement first, then remove the old row, in any order inside one transaction. '
              || 'To tear down whole seeds use wipe_seed_teaching(). Rule: services/shared/debut-practice.cjs.';
END $$;

-- course_practice_phrases: a row that WAS real practice left its LEGO (deleted, re-roled, re-keyed, or
-- rewritten to the bare LEGO). Check the LEGO it left.
CREATE OR REPLACE FUNCTION public.debut_guard_phrase()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE old_lego_target text;
BEGIN
  IF OLD.phrase_role NOT IN ('build', 'use') THEN RETURN NULL; END IF;
  SELECT target_text INTO old_lego_target FROM course_legos
   WHERE course_code = OLD.course_code AND seed_number = OLD.seed_number AND lego_index = OLD.lego_index;
  IF NOT FOUND THEN RETURN NULL; END IF;
  -- a bare-LEGO row never counted, so losing it loses nothing
  IF debut_norm(old_lego_target) <> '' AND debut_norm(OLD.target_text) = debut_norm(old_lego_target) THEN RETURN NULL; END IF;
  PERFORM debut_guard_assert(OLD.course_code, OLD.seed_number, OLD.lego_index,
    format('%s of phrase %s', lower(TG_OP), OLD.id));
  RETURN NULL;
END $$;

-- course_legos: a debut flag switched on, a target rewritten, or a LEGO re-keyed. Grandfathered when the
-- LEGO was already an empty debut before (judged at its old key, against its old target).
CREATE OR REPLACE FUNCTION public.debut_guard_lego()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE cur course_legos%ROWTYPE;
BEGIN
  SELECT * INTO cur FROM course_legos WHERE id = NEW.id;       -- the row as it stands at commit
  IF NOT FOUND OR NOT cur.is_new THEN RETURN NULL; END IF;
  IF OLD.is_new AND NOT debut_is_practised(OLD.course_code, OLD.seed_number, OLD.lego_index, OLD.target_text)
    THEN RETURN NULL; END IF;                                   -- was already an empty debut: grandfathered
  PERFORM debut_guard_assert(cur.course_code, cur.seed_number, cur.lego_index,
    CASE WHEN NOT OLD.is_new THEN 'is_new switched on with no practice'
         WHEN OLD.target_text IS DISTINCT FROM cur.target_text THEN 'LEGO target rewritten so its phrases no longer practise it'
         ELSE 'LEGO moved to a key with no practice' END);
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS debut_keeps_practice ON public.course_practice_phrases;
CREATE CONSTRAINT TRIGGER debut_keeps_practice
  AFTER DELETE OR UPDATE OF phrase_role, target_text, seed_number, lego_index, course_code
  ON public.course_practice_phrases
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.debut_guard_phrase();

DROP TRIGGER IF EXISTS debut_keeps_practice ON public.course_legos;
CREATE CONSTRAINT TRIGGER debut_keeps_practice
  AFTER UPDATE OF is_new, target_text, seed_number, lego_index, course_code
  ON public.course_legos
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.debut_guard_lego();

-- ONE-TRANSACTION SEED TEARDOWN. Every "delete the seed's phrases, then its LEGOs" path calls this, so the
-- guard sees the LEGOs gone at commit and the teardown passes. p_seeds NULL = every seed of the course.
CREATE OR REPLACE FUNCTION public.wipe_seed_teaching(p_course text, p_seeds int[])
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE n_phrases int; n_legos int;
BEGIN
  IF p_course IS NULL OR p_course = '' THEN RAISE EXCEPTION 'wipe_seed_teaching: course required'; END IF;
  DELETE FROM course_practice_phrases WHERE course_code = p_course AND (p_seeds IS NULL OR seed_number = ANY (p_seeds));
  GET DIAGNOSTICS n_phrases = ROW_COUNT;
  DELETE FROM course_legos WHERE course_code = p_course AND (p_seeds IS NULL OR seed_number = ANY (p_seeds));
  GET DIAGNOSTICS n_legos = ROW_COUNT;
  RETURN jsonb_build_object('phrases_deleted', n_phrases, 'legos_deleted', n_legos);
END $$;

-- The standing gaps: every debut with no real practice, per course. The daily alarm reads this.
CREATE OR REPLACE FUNCTION public.debut_practice_gaps(p_courses text[])
 RETURNS TABLE (course_code text, lego_id text, seed_number int, lego_index int, known_text text, target_text text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT l.course_code, l.lego_id, l.seed_number, l.lego_index, l.known_text, l.target_text
    FROM course_legos l
   WHERE l.is_new AND l.course_code = ANY (p_courses)
     AND NOT (l.seed_number = 1 AND l.lego_index = 1)
     AND NOT debut_is_practised(l.course_code, l.seed_number, l.lego_index, l.target_text)
   ORDER BY l.course_code, l.seed_number, l.lego_index
$$;

REVOKE ALL ON FUNCTION public.wipe_seed_teaching(text, int[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.debut_practice_gaps(text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.debut_guard_assert(text, int, int, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.debut_is_practised(text, int, int, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wipe_seed_teaching(text, int[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.debut_practice_gaps(text[]) TO service_role;
