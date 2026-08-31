-- courses.known_dialect — WHICH variant of the KNOWN language a course teaches FROM.
--
-- `courses.dialect` (2026-08-19) states the dialect of a course's TARGET content:
-- "a Southern Welsh course is Southern as a fact of its content" (Tom). It says
-- nothing about the language on the OTHER side, and for nine courses that is a
-- real gap: eng_for_cym, spa_for_cym and their seven siblings are taught FROM
-- Welsh, and Welsh has two variants in play on this estate. Nothing in the data
-- said which one a learner of those courses already has.
--
-- ── WHY NULLABLE, WHEN `dialect` IS NOT NULL DEFAULT 'standard' ─────────────
-- Deliberately different, and the difference is the point. `dialect` defaults
-- because every non-Welsh, non-Irish course genuinely IS 'standard' — there is
-- one dialect, so the default is a fact rather than a guess.
--
-- The known side is not like that. A course taught from Spanish, French,
-- German, Arabic or Portuguese is taught from a language that HAS a regional
-- fork on this estate (spa/spa_mx, fra/fra_ca, deu/deu_at/deu_ch, ara/ara_eg…),
-- and nobody has ever stated which side of that fork its known text sits on.
-- Writing 'standard' there would be inventing an answer. So NULL means exactly
-- one thing and it is honest: NOT STATED. A reader that needs an answer must
-- ask for one rather than receive a default it cannot distinguish from a fact.
--
-- Vocabulary is `courses.dialect`'s, unchanged — 'north', 'south', 'standard' —
-- so services/shared/dialect.cjs canonicalises both columns identically and
-- 'North' and 'north' can never route to two different places.

ALTER TABLE courses ADD COLUMN IF NOT EXISTS known_dialect text;

COMMENT ON COLUMN courses.known_dialect IS
  'Which variant of the KNOWN language this course is taught FROM: ''north'', '
  '''south'', ''standard'', or NULL. NULL means NOT STATED — never "standard" — '
  'because most known languages on the estate have a regional fork nobody has '
  'ruled on. Same vocabulary as courses.dialect (which describes the TARGET '
  'side); canonicalised by services/shared/dialect.cjs. Read by '
  'services/shared/cast-language-key.cjs to key the known-side cast, so a '
  'Northern-Welsh-known course keys ''cym_north'' and a cast on plain ''cym'' '
  'does not reach it (Tom''s ruling, 2026-08-31: a dialect is its own language).';
