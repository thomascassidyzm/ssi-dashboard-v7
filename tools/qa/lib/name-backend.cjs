'use strict';

/*
 * name-backend.cjs — put a nightly QA check's name on its Postgres BACKEND (job #683).
 *
 * The nightlies reach the database through Supavisor, which does not pass a client's startup
 * parameters on (see voice-variety/named-read.cjs, #672): `application_name` given to
 * `new Client({...})` leaves pg_stat_activity showing "Supavisor". The DB watchdog
 * (command-surface ops/db-watchdog.cjs) budgets by that name, so every QA check calls this
 * straight after connect. Session-scoped (is_local = false): a check runs many statements and
 * ends its connection when it finishes. The name must start `qa:` — that prefix is the contract
 * the watchdog's off-peak budget keys on.
 */

const QA_PREFIX = 'qa:';

async function nameBackend(client, name, { statementTimeoutMs } = {}) {
  if (!name.startsWith(QA_PREFIX)) throw new Error(`QA check name must start with "${QA_PREFIX}": ${name}`);
  await client.query("SELECT set_config('application_name', $1, false)", [name]);
  if (statementTimeoutMs) await client.query("SELECT set_config('statement_timeout', $1, false)", [String(statementTimeoutMs)]);
  return client;
}

module.exports = { nameBackend, QA_PREFIX };
