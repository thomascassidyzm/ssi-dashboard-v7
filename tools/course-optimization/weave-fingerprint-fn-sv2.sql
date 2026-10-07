-- Job #22: fingerprint of everything the cym_sv2_for_eng (South sandbox) weave must NOT change —
-- every other course's content and round index (live South, live North and the North sandbox
-- included), master canonical_seeds, every canonical list but the South sandbox's own, and every
-- other course's weave rows. Same output before and after = nothing outside the South sandbox
-- moved. The South sandbox's list is identified by slug, so the fingerprint taken before it
-- exists matches the one taken after. Included by the sv2 weave scripts (\ir).
CREATE OR REPLACE FUNCTION pg_temp.others_fingerprint() RETURNS TABLE(t text, n bigint, h text) LANGUAGE sql AS $$
  SELECT 'courses', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.course_code)) FROM courses x WHERE x.course_code <> 'cym_sv2_for_eng'
  UNION ALL SELECT 'course_seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x WHERE x.course_code <> 'cym_sv2_for_eng'
  UNION ALL SELECT 'course_legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code <> 'cym_sv2_for_eng'
  UNION ALL SELECT 'course_practice_phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x WHERE x.course_code <> 'cym_sv2_for_eng'
  UNION ALL SELECT 'lego_introductions', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM lego_introductions x WHERE x.course_code <> 'cym_sv2_for_eng'
  UNION ALL SELECT 'course_round_index', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.course_code, x.round_index)) FROM course_round_index x WHERE x.course_code <> 'cym_sv2_for_eng'
  UNION ALL SELECT 'canonical_seeds (master)', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_seeds x
  UNION ALL SELECT 'canonical_seed_lists (other lists)', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_seed_lists x WHERE x.slug <> 'cym-south-sandbox'
  UNION ALL SELECT 'canonical_list_seeds (other lists)', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_list_seeds x
    WHERE x.list_id NOT IN (SELECT id FROM canonical_seed_lists WHERE slug = 'cym-south-sandbox')
  UNION ALL SELECT 'canonical_list_assignments (other courses)', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_list_assignments x WHERE x.course_code <> 'cym_sv2_for_eng'
  UNION ALL SELECT 'course_seed_weave (other courses)', count(*), coalesce(md5(string_agg(md5(x::text), '' ORDER BY x::text)), '-') FROM course_seed_weave x WHERE x.course_code <> 'cym_sv2_for_eng'
  UNION ALL SELECT 'course_seed_weave_drops (other courses)', count(*), coalesce(md5(string_agg(md5(x::text), '' ORDER BY x::text)), '-') FROM course_seed_weave_drops x WHERE x.course_code <> 'cym_sv2_for_eng'
$$;
