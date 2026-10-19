'use strict';

/* Each statement gets its own named, capped backend transaction, including through
 * transaction-mode poolers. No estate-wide snapshot remains open between batches. */

const STATEMENT_TIMEOUT_MS = 5000;

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
  const { boundedClient } = require('../lib/bounded-client.cjs');
  return fn(boundedClient(db, name));
}

// Missing optional policy tables are allowed; timeouts and access errors are failures.
async function optionalRead(db, sql, params) {
  try { return await db.query(sql, params); }
  catch (e) {
    if (e.code !== '42P01') throw e;
    return { rows: [] };
  }
}

module.exports = { isSocketUrl, nightlyClient, namedRead, optionalRead, STATEMENT_TIMEOUT_MS };
