# Kai machine — DB access setup

Enables running this repo's direct-DB tooling (e.g.
`tools/refresh-round-index.cjs`, and Supabase-REST-backed service code) from
a machine that doesn't have this repo's env files yet.

## (a) Env files / vars this repo's DB tooling needs

Two separate credential paths — don't merge them:

| File | Vars | Used for |
|---|---|---|
| `.env` | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Service code talking to Supabase over the REST API (PostgREST) — audio generation, course-builder API, most of `services/` |
| `.env.psql` | `DATABASE_URL` (and `SUPABASE_DB_PASSWORD`, from which `DATABASE_URL` is built) | Direct-Postgres tooling — `psql`, `pg_dump`, migration scripts, `tools/refresh-round-index.cjs` |

Both files are gitignored (`.env*`) — Tom needs to send you the *values*
himself; nothing below includes them.

Names only, no values:
```
# .env
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# .env.psql
SUPABASE_DB_PASSWORD=
DATABASE_URL=
```

## (b) Setup steps

1. Clone this repo, `cd` into it.
2. Create `.env` at the repo root with `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (values from Tom).
3. Create `.env.psql` at the repo root with `SUPABASE_DB_PASSWORD` and `DATABASE_URL` (values from Tom — `DATABASE_URL` already embeds the password, so `SUPABASE_DB_PASSWORD` alone isn't enough on its own for tooling that reads `DATABASE_URL` directly). Existing format to match: `set -a; . .env.psql; set +a; psql "$DATABASE_URL"`.
4. Install deps: `npm install` (repo root).
5. Test the REST path (harmless read, no writes):
   ```bash
   node -e "
   require('dotenv').config()
   fetch(process.env.SUPABASE_URL + '/rest/v1/course_seeds?select=course_code&limit=1', {
     headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_KEY }
   }).then(r => r.json()).then(console.log)
   "
   ```
6. Test the direct-Postgres path (harmless read, no writes):
   ```bash
   node tools/refresh-round-index.cjs --check
   ```
   This only runs the dangling-row SELECT — no `REFRESH`, no writes. A clean
   run (a dangling-row count, even 0, with no connection error) confirms
   `DATABASE_URL` works.

## (c) Which key to use — and why

- **`DATABASE_URL` (`.env.psql`) connects as the `postgres` role** — this is
  a direct Postgres connection, not mediated by PostgREST, so **it bypasses
  Row Level Security entirely** and can read/write/drop anything in the
  database. There is no scoped-down equivalent for this path — tools like
  `tools/refresh-round-index.cjs` that run `REFRESH MATERIALIZED VIEW`
  genuinely need it, because matview refresh isn't exposed any other way
  today (a `SECURITY DEFINER` RPC to change that is proposed but **not
  applied** — see `docs/proposals/refresh-course-round-index-rpc.sql`).
- **`SUPABASE_SERVICE_KEY` (`.env`) also bypasses RLS** (it's the Supabase
  service-role key) but goes through the REST API — prefer this over
  `DATABASE_URL` for anything that doesn't specifically need raw SQL/DDL
  (matview refresh, migrations, `pg_dump`).
- **Prefer the anon key + RLS where sufficient** — but check per-table
  before assuming it'll work: the learner-data spine (progress, sessions)
  has RLS policies, but org/content tables (`course_seeds`, `course_legos`,
  etc.) vary in whether RLS is even enabled, so an anon-key read can
  silently return zero rows instead of an auth error. If a task is read-only
  against content tables, try the anon key first and confirm row counts
  look right before assuming it's sufficient.
- **Bottom line**: give Kai `SUPABASE_SERVICE_KEY` + `SUPABASE_URL` by
  default (covers all REST-path service code). Only add `DATABASE_URL` if
  he's specifically running direct-SQL tooling like the round-index refresh
  — and treat that credential as full DB admin, not "just another key".

## (d) Getting the values

Tom: share the values via a secure channel, not Slack.
