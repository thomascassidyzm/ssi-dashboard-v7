-- Job #591 planner (read-only): finds every empty seed clip slot in the LIVE Welsh courses cym_n_for_eng / cym_s_for_eng that has an
-- existing, alive human take of the exact same text BY THE SAME SPEAKER the course already uses on that slot (Tom's condition, 2026-10-13).
-- The slot's speaker = the voice_id holding the majority of that slot's currently filled takes in that course.
--   named human voice  -> link takes by that voice, or a voice_id the course's own voice_config.podCastAliases declares as the same person;
--   legacy_import      -> speaker unknown, so link ONLY legacy_import takes from the SAME course and the SAME role (slot lineage);
--   a TTS voice        -> no human take can be that speaker: the slot links nothing and every candidate is reported as voice mismatch.
-- Prints the slot voices, counts and skips, and writes the pick list as CSV on stdout. Run: psql -q -f this > pick.csv
CREATE FUNCTION pg_temp.nz(t text) RETURNS text IMMUTABLE LANGUAGE sql AS $$
  SELECT btrim(regexp_replace(translate(coalesce(t,''), E'’‘ʼ`´′', ''''''''''''), '\s+', ' ', 'g')) $$;
CREATE TEMP TABLE slots AS
SELECT s.id seed_id, s.course_code, s.seed_number, v.slot, v.txt, v.aid
FROM course_seeds s
CROSS JOIN LATERAL (VALUES ('known', s.known_text, s.known_audio_id), ('target1', s.target_text, s.target1_audio_id), ('target2', s.target_text, s.target2_audio_id)) v(slot, txt, aid)
WHERE s.course_code IN ('cym_n_for_eng','cym_s_for_eng');
-- the speaker each live slot already uses
CREATE TEMP TABLE slot_voice AS
SELECT DISTINCT ON (x.course_code, x.slot) x.course_code, x.slot, a.voice_id, a.origin, count(*) n,
       sum(count(*)) OVER (PARTITION BY x.course_code, x.slot) filled
FROM slots x JOIN course_audio a ON a.id = x.aid GROUP BY 1,2,3,4 ORDER BY x.course_code, x.slot, count(*) DESC;
-- voice_ids proven to be the same person as the slot speaker (the course's own config aliases)
CREATE TEMP TABLE same_speaker AS
SELECT sv.course_code, sv.slot, sv.voice_id speaker, sv.voice_id ok_voice FROM slot_voice sv WHERE sv.origin = 'human'
UNION SELECT sv.course_code, sv.slot, sv.voice_id, jsonb_array_elements_text(c.voice_config->'podCastAliases'->sv.voice_id)
FROM slot_voice sv JOIN courses c USING (course_code) WHERE sv.origin = 'human' AND sv.voice_id <> 'legacy_import';
SELECT 'slot speaker' k, sv.*, (SELECT string_agg(ok_voice, ',') FROM same_speaker w WHERE w.course_code = sv.course_code AND w.slot = sv.slot) linkable_voices FROM slot_voice sv ORDER BY 2,3;
CREATE TEMP TABLE gaps AS SELECT * FROM slots WHERE aid IS NULL;
CREATE TEMP TABLE pool AS
SELECT a.id, a.course_code, a.role, a.voice_id, a.origin, a.s3_key, a.duration_ms, a.file_size_bytes, a.veracity_pass, pg_temp.nz(a.text) nt, a.language
FROM course_audio a WHERE a.origin = 'human' AND a.role IN ('known','target1','target2');
CREATE INDEX ON pool(nt);
CREATE TEMP TABLE cand AS
SELECT g.seed_id, g.course_code, g.seed_number, g.slot, g.txt, p.id audio_id, p.course_code src, p.role src_role, p.voice_id, p.s3_key, p.duration_ms,
  CASE
    WHEN (g.slot = 'known') <> (p.language = 'eng') THEN 'language'
    WHEN g.slot <> 'known' AND p.role = 'known' THEN 'role'
    WHEN sv.origin <> 'human' THEN 'voice_mismatch (slot speaker is ' || sv.voice_id || ', synthetic)'
    WHEN sv.voice_id = 'legacy_import' AND p.voice_id = 'legacy_import' AND p.course_code = g.course_code AND p.role = g.slot THEN 'ok'
    WHEN sv.voice_id = 'legacy_import' THEN 'voice_mismatch (not ' || g.course_code || ' ' || g.slot || ' legacy lineage)'
    WHEN EXISTS (SELECT 1 FROM same_speaker w WHERE w.course_code = g.course_code AND w.slot = g.slot AND w.ok_voice = p.voice_id) THEN 'ok'
    ELSE 'voice_mismatch (not ' || sv.voice_id || ')'
  END verdict,
  CASE WHEN coalesce(p.file_size_bytes, 2000) < 2000 OR coalesce(p.duration_ms, 0) <= 0 THEN 'dead' WHEN p.veracity_pass IS FALSE THEN 'veracity_fail' ELSE 'ok' END health,
  CASE WHEN p.course_code = g.course_code THEN 1 ELSE 2 END pref
FROM gaps g JOIN slot_voice sv USING (course_code, slot) JOIN pool p ON p.nt = pg_temp.nz(g.txt) AND pg_temp.nz(g.txt) <> '';
CREATE TEMP TABLE pick AS
SELECT DISTINCT ON (seed_id, slot) * FROM cand WHERE verdict = 'ok' AND health = 'ok' ORDER BY seed_id, slot, pref, (voice_id = 'legacy_import') DESC, src, audio_id;
SELECT 'gaps' k, course_code, slot, count(*) missing FROM gaps GROUP BY 2,3 ORDER BY 2,3;
SELECT 'linkable' k, course_code, slot, voice_id, src, src_role, count(*) FROM pick GROUP BY 2,3,4,5,6 ORDER BY 2,3,7 DESC;
-- skipped: gaps with a same-text human candidate but no eligible+healthy pick
SELECT 'skipped' k, c.course_code, c.slot, c.verdict, c.health, count(DISTINCT c.seed_id) seeds FROM cand c
WHERE NOT EXISTS (SELECT 1 FROM pick k WHERE k.seed_id = c.seed_id AND k.slot = c.slot) GROUP BY 2,3,4,5 ORDER BY 2,3,6 DESC;
\copy (SELECT seed_id, course_code, seed_number, slot, txt, audio_id, src, src_role, voice_id, s3_key, duration_ms FROM pick ORDER BY course_code, seed_number, slot) TO STDOUT CSV HEADER
