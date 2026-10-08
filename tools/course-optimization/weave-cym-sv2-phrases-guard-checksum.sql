-- Job #429 SOUTH run (Aran 2026-10-08 21:45Z): practice phrases go into the South sandbox (cym_sv2_for_eng) ONLY.
-- Live North (cym_n_for_eng), live South (cym_s_for_eng), the North sandbox (cym_nv2_for_eng) and the
-- master canonical_seeds must not move a byte. Run before and after; same output = untouched. Read-only.
SELECT * FROM (
  SELECT 'courses' t, course_code c, count(*) n, md5(string_agg(md5(x::text), '' ORDER BY x.course_code)) h FROM courses x WHERE course_code IN ('cym_s_for_eng','cym_n_for_eng','cym_nv2_for_eng') GROUP BY 2
  UNION ALL SELECT 'course_seeds', course_code, count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x WHERE course_code IN ('cym_s_for_eng','cym_n_for_eng','cym_nv2_for_eng') GROUP BY 2
  UNION ALL SELECT 'course_legos', course_code, count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE course_code IN ('cym_s_for_eng','cym_n_for_eng','cym_nv2_for_eng') GROUP BY 2
  UNION ALL SELECT 'course_practice_phrases', course_code, count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x WHERE course_code IN ('cym_s_for_eng','cym_n_for_eng','cym_nv2_for_eng') GROUP BY 2
  UNION ALL SELECT 'lego_introductions', course_code, count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM lego_introductions x WHERE course_code IN ('cym_s_for_eng','cym_n_for_eng','cym_nv2_for_eng') GROUP BY 2
  UNION ALL SELECT 'course_audio', course_code, count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM course_audio x WHERE course_code IN ('cym_s_for_eng','cym_n_for_eng','cym_nv2_for_eng') GROUP BY 2
  UNION ALL SELECT 'course_seed_weave', course_code, count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM course_seed_weave x WHERE course_code IN ('cym_s_for_eng','cym_n_for_eng','cym_nv2_for_eng') GROUP BY 2
  UNION ALL SELECT 'course_seed_weave_drops', course_code, count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM course_seed_weave_drops x WHERE course_code IN ('cym_s_for_eng','cym_n_for_eng','cym_nv2_for_eng') GROUP BY 2
  UNION ALL SELECT 'course_round_index', course_code, count(*), md5(string_agg(md5(x::text), '' ORDER BY x.round_index)) FROM course_round_index x WHERE course_code IN ('cym_s_for_eng','cym_n_for_eng','cym_nv2_for_eng') GROUP BY 2
  UNION ALL SELECT 'canonical_seeds (master)', '-', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_seeds x
) s ORDER BY 1,2;
