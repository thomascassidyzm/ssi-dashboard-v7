#!/usr/bin/env node
/**
 * anon-grant-canary — is any public table readable or writable by the internet?
 *
 * THE RULE THIS ASSERTS. A table in the `public` schema with RLS disabled and a
 * grant to `anon` is reachable by anyone holding the publishable key, which is
 * shipped in the browser bundle and is therefore public knowledge. On
 * 2026-09-21 there were 22 such tables and the open internet could read AND
 * write 746,535 rows of audio_clips. They were closed by
 * database/migrations/20260921_revoke_anon_on_rls_off_tables.sql.
 *
 * WHY THIS CANARY HAS TO EXIST RATHER THAN THE MIGRATION BEING ENOUGH. That
 * migration also closed the `postgres` default ACL that made new tables arrive
 * grant-open — but `supabase_admin` carries an identical default ACL on schema
 * public and is a superuser role we cannot alter. So a table created through
 * the Supabase dashboard STILL arrives granted to anon, silently, with no
 * error and no alarm. This canary is the alarm.
 *
 * NOTE ON WHAT IS *NOT* FLAGGED. The course tables the learner app reads with
 * the anon key — course_seeds and friends — do not trip this canary, because
 * they have RLS ENABLED: policies decide what anon sees, which is the correct
 * mechanism. This canary only catches the other case, a grant with no RLS
 * behind it, where the grant is the whole of the access control. ALLOWED below
 * is the escape hatch for a table deliberately left open with RLS off; as of
 * 2026-09-21 nothing needs it, so it should normally stay empty.
 *
 * Usage:  node tools/security/anon-grant-canary.cjs
 *         DATABASE_URL comes from .env.psql at the repo root.
 * Exit 0 = clean. Exit 1 = a table is exposed that should not be.
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Names accepted as deliberately open WITH RLS OFF. Empty in effect today:
// every table listed here currently has RLS enabled and so never reaches this
// check. Kept as the documented escape hatch — adding a name is a decision to
// put that table on the internet with nothing but the grant in front of it.
const ALLOWED = new Set([
  'courses', 'course_seeds', 'course_legos', 'course_practice_phrases',
  'course_audio', 'course_gender_expansions', 'canonical_seeds',
  'listening_pods', 'listening_pod_sentences', 'pod_legos',
  'audio_flags', 'content_feedback', 'dashboard_users', 'orchestrator_messages',
])

function databaseUrl () {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const envPath = path.join(__dirname, '..', '..', '.env.psql')
  const m = fs.readFileSync(envPath, 'utf8').match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/m)
  if (!m) throw new Error(`no DATABASE_URL in ${envPath}`)
  return m[1].replace(/^["']|["']$/g, '')
}

// The audit's own predicate: public schema, ordinary table, RLS off, and anon
// holds at least one of the four DML privileges.
const QUERY = `
  SELECT c.relname,
         string_agg(p, ',' ORDER BY p) AS privs
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) AS p
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = false
    AND has_table_privilege('anon', c.oid, p)
  GROUP BY c.relname
  ORDER BY c.relname;
`

const out = execFileSync('psql', [databaseUrl(), '-At', '-F', '|', '-c', QUERY], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'],
}).trim()

const rows = out ? out.split('\n').map(l => l.split('|')) : []
const exposed = rows.filter(([name]) => !ALLOWED.has(name))
const allowedSeen = rows.filter(([name]) => ALLOWED.has(name)).map(([n]) => n)

if (exposed.length === 0) {
  console.log(`anon-grant-canary OK — no unexpected public table is exposed to anon.`)
  console.log(`  ${allowedSeen.length} deliberately-open table(s): ${allowedSeen.join(', ') || '(none)'}`)
  process.exit(0)
}

console.error(`anon-grant-canary FAIL — ${exposed.length} public table(s) with RLS off are granted to anon:`)
for (const [name, privs] of exposed) console.error(`  ${name}  (${privs})`)
console.error(`
These are reachable by anyone with the publishable key. Either close them:
  REVOKE ALL ON TABLE public.<name> FROM anon, authenticated, PUBLIC;
or, if the exposure is intended, add the name to ALLOWED in this file with the
reason — which is a deliberate decision to put that table on the internet.

Most likely cause: the table was created through the Supabase dashboard, which
acts as supabase_admin, whose default ACL still grants anon and which we cannot
alter as the postgres role.`)
process.exit(1)
