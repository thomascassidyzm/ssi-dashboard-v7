-- Job #22 (Aran 2026-10-07): the South sandbox weave must not move a byte of live South
-- (cym_s_for_eng), live North (cym_n_for_eng), the North sandbox (cym_nv2_for_eng), the master
-- canonical_seeds list, or the North Hadau Creiddiol list. Run before and after; same output
-- = untouched. Read-only.
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
  UNION ALL SELECT 'canonical_list_seeds (HC North)', '-', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_list_seeds x WHERE list_id='8a1af4aa-6733-4d5e-9724-e6f9df3212e0'
) s ORDER BY 1,2;
