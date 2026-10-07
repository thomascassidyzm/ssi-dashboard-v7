-- Populate "Welsh North (sandbox)" and assign it to cym_nv2_for_eng ONLY (job #903, Aran 2026-10-07).
--   seeds   1-305 : canonical_seeds 1-305 verbatim
--   seeds 306-316 : EMPTY (Aran: the 11-seed North insert, text to come)
--   seeds 317-679 : canonical_seeds (N-11), i.e. 306-668
-- The live Welsh courses (cym_n_for_eng, cym_s_for_eng) are NOT assigned.
-- Undo just this: DELETE FROM canonical_list_assignments WHERE course_code='cym_nv2_for_eng';
--                 DELETE FROM canonical_seed_lists WHERE slug='cym-north-sandbox';
BEGIN;
INSERT INTO canonical_seed_lists (slug, name, description, created_by)
VALUES ('cym-north-sandbox', 'Welsh North (sandbox)',
        'canonical_seeds with an 11-seed empty insert at 306-316; 317+ = canonical N-11', 'job-903-aran')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO canonical_list_seeds (list_id, seed_number, source_text)
SELECT l.id, n.seed_number,
       CASE WHEN n.seed_number <= 305 THEN c.source_text
            WHEN n.seed_number <= 316 THEN ''
            ELSE c.source_text END
FROM canonical_seed_lists l
CROSS JOIN generate_series(1, 679) AS n(seed_number)
LEFT JOIN canonical_seeds c
  ON c.seed_number = CASE WHEN n.seed_number <= 305 THEN n.seed_number
                          WHEN n.seed_number <= 316 THEN NULL
                          ELSE n.seed_number - 11 END
WHERE l.slug = 'cym-north-sandbox'
ON CONFLICT (list_id, seed_number) DO NOTHING;

INSERT INTO canonical_list_assignments (course_code, list_id, assigned_by)
SELECT 'cym_nv2_for_eng', id, 'job-903-aran' FROM canonical_seed_lists WHERE slug = 'cym-north-sandbox'
ON CONFLICT (course_code) DO NOTHING;
COMMIT;
