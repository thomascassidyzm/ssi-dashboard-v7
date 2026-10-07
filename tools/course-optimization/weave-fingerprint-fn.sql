-- Job #949: fingerprint of everything the cym_nv2_for_eng weave must NOT change — every other
-- course's content and round index, master canonical_seeds, and every other canonical list.
-- Same output before and after = nothing outside the sandbox moved. Included by the weave
-- scripts (\ir); defines pg_temp.others_fingerprint() for the current session only.
CREATE OR REPLACE FUNCTION pg_temp.others_fingerprint() RETURNS TABLE(t text, n bigint, h text) LANGUAGE sql AS $$
  SELECT 'courses', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.course_code)) FROM courses x WHERE x.course_code <> 'cym_nv2_for_eng'
  UNION ALL SELECT 'course_seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x WHERE x.course_code <> 'cym_nv2_for_eng'
  UNION ALL SELECT 'course_legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code <> 'cym_nv2_for_eng'
  UNION ALL SELECT 'course_practice_phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x WHERE x.course_code <> 'cym_nv2_for_eng'
  UNION ALL SELECT 'lego_introductions', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM lego_introductions x WHERE x.course_code <> 'cym_nv2_for_eng'
  UNION ALL SELECT 'course_round_index', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.course_code, x.round_index)) FROM course_round_index x WHERE x.course_code <> 'cym_nv2_for_eng'
  UNION ALL SELECT 'canonical_seeds (master)', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_seeds x
  UNION ALL SELECT 'canonical_list_seeds (other lists)', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_list_seeds x WHERE x.list_id <> '8a1af4aa-6733-4d5e-9724-e6f9df3212e0'
  UNION ALL SELECT 'canonical_list_assignments', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_list_assignments x
  UNION ALL SELECT 'course_seed_weave (other courses)', count(*), coalesce(md5(string_agg(md5(x::text), '' ORDER BY x::text)), '-') FROM course_seed_weave x WHERE x.course_code <> 'cym_nv2_for_eng'
$$;
