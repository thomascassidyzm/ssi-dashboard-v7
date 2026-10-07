-- Job #905: one checksum per (live Welsh course, table) over every course_code-keyed
-- content table the sandbox clone could conceivably touch. Same output before and after
-- = the clone left cym_s_for_eng and cym_n_for_eng byte-identical.
SELECT * FROM (
  SELECT 'courses' t, course_code, count(*) n, md5(string_agg(x::text, '|' ORDER BY x::text)) h FROM courses x WHERE course_code IN ('cym_s_for_eng','cym_n_for_eng') GROUP BY 2
  UNION ALL SELECT 'course_seeds', course_code, count(*), md5(string_agg(x::text, '|' ORDER BY x.id)) FROM course_seeds x WHERE course_code IN ('cym_s_for_eng','cym_n_for_eng') GROUP BY 2
  UNION ALL SELECT 'course_legos', course_code, count(*), md5(string_agg(x::text, '|' ORDER BY x.id)) FROM course_legos x WHERE course_code IN ('cym_s_for_eng','cym_n_for_eng') GROUP BY 2
  UNION ALL SELECT 'course_practice_phrases', course_code, count(*), md5(string_agg(x::text, '|' ORDER BY x.id)) FROM course_practice_phrases x WHERE course_code IN ('cym_s_for_eng','cym_n_for_eng') GROUP BY 2
  UNION ALL SELECT 'lego_introductions', course_code, count(*), md5(string_agg(x::text, '|' ORDER BY x.id)) FROM lego_introductions x WHERE course_code IN ('cym_s_for_eng','cym_n_for_eng') GROUP BY 2
  UNION ALL SELECT 'course_audio', course_code, count(*), md5(string_agg(x::text, '|' ORDER BY x::text)) FROM course_audio x WHERE course_code IN ('cym_s_for_eng','cym_n_for_eng') GROUP BY 2
  UNION ALL SELECT 'course_lego_positions', course_code, count(*), md5(string_agg(x::text, '|' ORDER BY x::text)) FROM course_lego_positions x WHERE course_code IN ('cym_s_for_eng','cym_n_for_eng') GROUP BY 2
  UNION ALL SELECT 'course_seed_drafts', course_code, count(*), md5(string_agg(x::text, '|' ORDER BY x::text)) FROM course_seed_drafts x WHERE course_code IN ('cym_s_for_eng','cym_n_for_eng') GROUP BY 2
  UNION ALL SELECT 'canonical_list_assignments', course_code, count(*), md5(string_agg(x::text, '|' ORDER BY x::text)) FROM canonical_list_assignments x WHERE course_code IN ('cym_s_for_eng','cym_n_for_eng') GROUP BY 2
) s ORDER BY 1,2;
