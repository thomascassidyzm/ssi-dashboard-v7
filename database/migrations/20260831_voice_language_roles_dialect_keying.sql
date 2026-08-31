-- voice_language_roles.language is a CAST ENTITY, not a base language tag.
--
-- Tom's ruling, 2026-08-31, stated as a definition rather than a preference:
-- dialects are different LANGUAGES in this product — different text and
-- different voices. Mexican Spanish is not a variant of spa; Austrian German is
-- not a variant of deu. A cast on the parent code reaching a dialect course is
-- a DEFECT, not an inheritance.
--
-- Nothing about the table's SHAPE changes: the column is text and 'deu_at' has
-- always fitted in it. What changes is what a reader may assume a value means,
-- and that assumption is the thing that was wrong — so it is written where the
-- next person to open \d+ voice_language_roles will find it.
--
-- The key is computed by services/shared/cast-language-key.cjs from the two
-- columns that STATE a course's regional identity (courses.voice_pool_key,
-- courses.dialect). The course CODE is never read.

COMMENT ON COLUMN voice_language_roles.language IS
  'The CAST ENTITY a voice is cast for, NOT necessarily a base language tag. A '
  'plain language is itself (''fra''); a dialect is its own entity and its own '
  'row (''deu_at'', ''spa_mx'', ''cym_north'', ''gle_munster''). Computed by '
  'services/shared/cast-language-key.cjs from courses.voice_pool_key and '
  'courses.dialect — never from the course code. A cast on ''deu'' does not '
  'reach deu_at_for_eng, by design (Tom''s ruling, 2026-08-31).';
