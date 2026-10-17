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

// The restored-backup copy (tools/qa-copy) listens on a unix socket only and has no TLS: a socket URL
// (`?host=/…`) must not ask for it. Supabase URLs still do.
const isSocketUrl = (url) => /[?&]host=(%2F|\/)/i.test(String(url || ''));

function nightlyClient(Client, name) {
  return new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: isSocketUrl(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false },
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

/**
 * A read that may fail (a table not every environment has) without aborting the
 * transaction around it: a bare `.catch` leaves Postgres refusing every later
 * statement ("current transaction is aborted"), so it runs under a savepoint.
 */
async function optionalRead(db, sql, params) {
  await db.query('SAVEPOINT optional_read');
  try {
    const r = await db.query(sql, params);
    await db.query('RELEASE SAVEPOINT optional_read');
    return r;
  } catch {
    await db.query('ROLLBACK TO SAVEPOINT optional_read');
    return { rows: [] };
  }
}

module.exports = { isSocketUrl, nightlyClient, namedRead, optionalRead, STATEMENT_TIMEOUT_MS };
