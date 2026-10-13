-- Job #580 planner (read-only): finds every empty seed clip slot in cym_nv2_for_eng / cym_sv2_for_eng with an eligible, alive human take of
-- the exact same text, prints counts and the skipped reasons, and writes the pick list as CSV on stdout. The picks were then
-- HEAD-checked on S3 and frozen into link-cym-sandbox-seed-clips-580.sql. Run: psql -q -f this > pick.csv
CREATE FUNCTION pg_temp.nz(t text) RETURNS text IMMUTABLE LANGUAGE sql AS $$
  SELECT btrim(regexp_replace(translate(coalesce(t,''), E'’‘ʼ`´′', ''''''''''''), '\s+', ' ', 'g')) $$;
CREATE TEMP TABLE gaps AS
SELECT s.id seed_id, s.course_code, s.seed_number, v.slot, v.txt,
       (ro.seed_number IS NOT NULL) played
FROM course_seeds s
LEFT JOIN (SELECT DISTINCT course_code, seed_number FROM course_running_order) ro USING (course_code, seed_number)
CROSS JOIN LATERAL (VALUES ('known', s.known_text, s.known_audio_id), ('target1', s.target_text, s.target1_audio_id), ('target2', s.target_text, s.target2_audio_id)) v(slot, txt, aid)
WHERE s.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') AND v.aid IS NULL;
CREATE TEMP TABLE pool AS
SELECT a.id, a.course_code, a.role, a.voice_id, a.s3_key, a.duration_ms, a.file_size_bytes, a.veracity_pass, a.created_at, pg_temp.nz(a.text) nt, a.language
FROM course_audio a
WHERE a.origin='human' AND a.role IN ('known','target1','target2')
  AND ((a.role='known' AND a.language='eng') OR (a.role<>'known' AND a.language='cym'));
CREATE INDEX ON pool(nt);
-- every same-text candidate, with its eligibility verdict and preference rank
CREATE TEMP TABLE cand AS
SELECT g.*, p.id audio_id, p.course_code src, p.role src_role, p.voice_id, p.s3_key, p.duration_ms, p.file_size_bytes, p.veracity_pass,
  CASE
    WHEN g.slot='known' AND p.role<>'known' THEN 'role'
    WHEN g.slot<>'known' AND p.role='known' THEN 'role'
    WHEN g.slot='known' THEN 'ok'
    WHEN g.course_code='cym_nv2_for_eng' AND g.slot='target1' AND p.voice_id IN ('human_catrinlliar_cym_n','human_catrinv2_cym_n') THEN 'ok'
    WHEN g.course_code='cym_nv2_for_eng' AND g.slot='target2' AND p.voice_id IN ('human_aran_cym_n','human_aran_cym_n_2','human_aranv3_cym_n') THEN 'ok'
    WHEN g.course_code='cym_sv2_for_eng' AND g.slot='target1' AND p.voice_id = 'human_dan_cym_s' THEN 'ok'
    WHEN g.course_code='cym_sv2_for_eng' AND g.slot='target2' AND p.voice_id = 'human_eleri_cym_s' THEN 'ok'
    WHEN p.voice_id='legacy_import' AND p.role=g.slot AND p.course_code = CASE g.course_code WHEN 'cym_nv2_for_eng' THEN 'cym_n_for_eng' ELSE 'cym_s_for_eng' END THEN 'ok'
    WHEN p.voice_id='legacy_import' AND p.course_code = CASE g.course_code WHEN 'cym_nv2_for_eng' THEN 'cym_n_for_eng' ELSE 'cym_s_for_eng' END THEN 'legacy_other_slot'
    WHEN p.voice_id='legacy_import' THEN 'legacy_other_dialect'
    ELSE 'wrong_voice'
  END verdict,
  CASE WHEN p.file_size_bytes < 2000 OR coalesce(p.duration_ms,0) <= 0 THEN 'dead' WHEN p.veracity_pass IS FALSE THEN 'veracity_fail' ELSE 'ok' END health,
  CASE
    WHEN g.slot='known' THEN CASE WHEN p.course_code = CASE g.course_code WHEN 'cym_nv2_for_eng' THEN 'cym_n_for_eng' ELSE 'cym_s_for_eng' END THEN 1 WHEN p.course_code LIKE 'cym%' THEN 2 ELSE 3 END
    WHEN p.voice_id='legacy_import' THEN 2 ELSE 1 END pref
FROM gaps g JOIN pool p ON p.nt = pg_temp.nz(g.txt) AND pg_temp.nz(g.txt) <> '';
CREATE TEMP TABLE pick AS
SELECT DISTINCT ON (seed_id, slot) * FROM cand WHERE verdict='ok' AND health='ok'
ORDER BY seed_id, slot, pref, src, audio_id;
SELECT course_code, slot, count(*) missing, count(*) FILTER (WHERE played) missing_played FROM gaps GROUP BY 1,2 ORDER BY 1,2;
SELECT course_code, slot, count(*) linkable, count(*) FILTER (WHERE played) linkable_played, count(*) FILTER (WHERE voice_id<>'legacy_import') named, count(*) FILTER (WHERE voice_id='legacy_import') legacy FROM pick GROUP BY 1,2 ORDER BY 1,2;
SELECT course_code, slot, src, voice_id, count(*) FROM pick GROUP BY 1,2,3,4 ORDER BY 1,2,5 DESC;
-- skipped: gaps with a same-text candidate but no eligible+healthy pick
SELECT c.course_code, c.slot, c.verdict, c.health, c.voice_id, c.src, count(DISTINCT c.seed_id) seeds FROM cand c
WHERE NOT EXISTS (SELECT 1 FROM pick k WHERE k.seed_id=c.seed_id AND k.slot=c.slot) GROUP BY 1,2,3,4,5,6 ORDER BY 1,2,7 DESC;
\copy (SELECT seed_id, course_code, seed_number, slot, txt, audio_id, src, src_role, voice_id, s3_key, duration_ms, played FROM pick ORDER BY course_code, seed_number, slot) TO STDOUT CSV HEADER
