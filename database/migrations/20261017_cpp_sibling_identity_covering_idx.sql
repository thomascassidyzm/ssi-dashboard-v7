-- Job #683: the nightly sibling-identity check (tools/qa/sibling-identity/check.cjs, application_name
-- qa:sibling-identity) groups ~855k course_practice_phrases rows by
--   (course_code, lego_index, seed_number, phrase_role, known_text, target_text)  HAVING count(*) > 1
-- and aggregates id + position per group. With no index leading on that key it hash-aggregates a full heap scan
-- of the wide rows (jsonb metadata, arrays): 65-86 s every night (watchdog events 2026-10-16/17).
-- This index is that exact key in that order, partial on the check's own filter (components are excluded by
-- ruling, see register.cjs), INCLUDEing id + "position" so the whole query is a streaming GroupAggregate over an
-- INDEX-ONLY scan: no hash table, no heap fetch. Built CONCURRENTLY (run outside a transaction). No GRANTs or
-- NOTIFY pgrst: an index changes no API surface. Safe to drop: the check works without it, just slowly.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cpp_sibling_identity
  ON public.course_practice_phrases (course_code, lego_index, seed_number, phrase_role, known_text, target_text)
  INCLUDE (id, "position")
  WHERE phrase_role IS DISTINCT FROM 'component' AND known_text IS NOT NULL;
