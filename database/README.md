# database/ — where the real schema lives

**This directory does not describe the live database.** The nominal schema that used to sit
in `database/schema/` named tables (`seeds`, `legos`, `basket_phrases`) that do not exist;
it is retired to `archive/schema-retired-2026-09-05/` and carries no standing.

The DB schema source of truth, in order:

1. `psql "$DATABASE_URL" -c '\d+ <table>'` — `.env.psql` at this repo root. The live database.
2. `ssi-learning-app/supabase/schema.sql` — a `pg_dump` snapshot in the sibling repo
   (one shared Supabase project, so it is authoritative for this repo's tables too).
   Regenerate with `ssi-learning-app/supabase/snapshot-schema.sh` (needs pg_dump >= PG17).

What is here:

- `migrations/`, `changes/` — dated DDL history. History, not a description of now
  (see `migrations/README.md`).
- `functions/`, `runbooks/` — operational SQL, run by hand.
- `*.cjs`, `lib/` — importer code.

Triggers do real work (normalisation, audio linking) that application code depends on;
they are visible only in the live database and in `migrations/`, never in a schema summary.
