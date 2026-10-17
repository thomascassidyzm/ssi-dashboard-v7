'use strict';

/*
 * named-read.cjs — how the voice-variety nightly talks to Postgres.
 *
 * Since #391 the nightly is a SYSTEM unit running as `popty` on the owner login,
 * and that login reaches the database through Supavisor. Supavisor does NOT pass
 * a client's startup parameters on: `application_name` and `statement_timeout`
 * given to `new Client({...})` (#104's fix) never reached the backend, so the
 * watchdog saw "Supavisor" with no name and the pooler's own timeout cancelled
 * the aggregates every night from 2026-10-15 (job #672).
 *
 * So the name and the timeout are SET LOCAL inside one read-only transaction:
 * that reaches the backend through any pooler mode (session or transaction) and
 * on the direct host alike, and pg_stat_activity shows the name the moment it
 * is set. The startup parameters stay too — harmless, and they name the
 * connection before the first statement on a direct host.
 */

const STATEMENT_TIMEOUT_MS = 15 * 60 * 1000;

function nightlyClient(Client, name) {
  return new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    application_name: name,
    statement_timeout: STATEMENT_TIMEOUT_MS,
  });
}

/** Run `fn(db)` inside BEGIN READ ONLY with the name and timeout set on the backend. */
async function namedRead(db, name, fn) {
  await db.query('BEGIN READ ONLY');
  try {
    await db.query("SELECT set_config('application_name', $1, true), set_config('statement_timeout', $2, true)", [name, String(STATEMENT_TIMEOUT_MS)]);
    const out = await fn(db);
    await db.query('COMMIT');
    return out;
  } catch (e) {
    await db.query('ROLLBACK').catch(() => {});
    throw e;
  }
}

module.exports = { nightlyClient, namedRead, STATEMENT_TIMEOUT_MS };
