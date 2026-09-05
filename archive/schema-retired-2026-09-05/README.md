# Retired schema SQL — 2026-09-05

Historical artifacts. None of these describes the live database; read `archive/README.md`.

Real schema: `psql "$DATABASE_URL" -c '\d+ <table>'`, or the sibling repo's
`ssi-learning-app/supabase/schema.sql`. Pointer also in `database/README.md`.

- `database-schema/course-structure-schema.sql` — named `seeds` / `legos` / `baskets`;
  authoring writes `course_seeds` / `course_legos` / `course_practice_phrases` (finding P5).
- `new_vision/supabase-schema.sql`, `…-v2.sql` — same nominal tables, plus `audio_samples`
  (deprecated).
- `apml-core/audio-registry-v12.sql` — v12 `course_audio` shape over `texts` / `audio_files`
  (both deprecated). Its live sibling `apml/core/audio-registry-v12.apml` is read by
  `services/schema-validator.cjs` and stayed put.
