// services/shared/round-index-refresh.cjs
//
// THE ROUND MAP REFRESHES BY CONSTRUCTION (Tom's ruling, 2026-09-20:
// "yes, this is the more robust way to do it" — the step that writes legos
// refreshes the view as its last act, so a course cannot ship stale).
//
// course_round_index is the map the learner app walks
// (ssi-learning-app/api/courses/[code]/round-map.ts reads it), and a course is
// exactly as long as that view says it is. Nothing used to refresh it on any
// write path: afr_for_eng sat NINE ROUNDS short of its own content for weeks,
// silently, with no error anywhere — the learner reached the end of the old map
// and the course just ended. tools/round-index/nightly.cjs stays as the
// BACKSTOP; this module is the fix.
//
// ─── WHY A WHOLE-VIEW REFRESH, AND WHY IT DOES NOT BLOCK THE CALLER ────────
// Measured against the live database, 2026-09-20, 92,439 view rows:
//   REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index
//   → 1297 ms cold, 816 ms / 819 ms warm.
// PostgreSQL has NO per-course refresh of a matview — REFRESH is all-or-nothing
// — so the three real options were (A) whole-view CONCURRENTLY, coalesced,
// (B) replace the matview with a table maintained per course inside the writing
// transaction, (C) a trigger on course_legos doing (B)'s work. At ~0.8 s for the
// whole estate, (A) wins on better x simpler x cheaper: one object, one
// definition, no schema migration, nothing new to maintain, and it cannot
// disagree with the nightly because the nightly runs the same statement.
// (B) and (C) buy scoping we do not need and cost a migration plus a second
// definition of the view that can drift from the first. Journalled in
// docs/DECISIONS.md.
//
// CONCURRENTLY is load-bearing twice over: it takes no lock that blocks readers
// of the view, and it never blocks a writer of course_legos. It cannot run
// inside a transaction block, so this module always runs it on its own
// connection, never on the caller's.
//
// FIRE-AND-LOG, NOT AWAITED BY THE ROUTE. A second of refresh on the end of
// every seed submission would turn a 90-seed build into 90 extra seconds and
// make a hot route's latency depend on the size of the whole estate. So an HTTP
// caller gets its response immediately and the refresh lands a moment later;
// the promise is returned for the callers that DO want to wait (a tools/ sweep
// that is about to exit, and the tests).
//
// COALESCED. A build submits seed after seed. Without coalescing that is one
// full refresh per seed. Requests inside DEBOUNCE_MS are folded into one run,
// and a request arriving while a run is in flight schedules exactly one more —
// so the view is always refreshed AFTER the last write, and a burst of N writes
// costs at most two refreshes rather than N.
//
// IT NEVER THROWS INTO THE CALLER. A refresh that fails must not fail a content
// write that already succeeded. It resolves { ok: false, error } and logs loudly.

const path = require('path');
const fs = require('fs');

const REFRESH_SQL = 'REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index';

/** How long to wait for more writes before refreshing. */
const DEBOUNCE_MS = Number(process.env.ROUND_INDEX_DEBOUNCE_MS || 2000);

/**
 * The secret lives in .env.psql, gitignored and provisioned per machine, so a
 * checkout that has never been provisioned (the prod checkout, a fresh
 * worktree) has the code but not the URL. ROUND_INDEX_ENV_PSQL names the file
 * to read instead — how the nightly unit runs out of a deployment checkout
 * while reading the secret from the one place it exists.
 */
function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envFile = process.env.ROUND_INDEX_ENV_PSQL || path.join(__dirname, '..', '..', '.env.psql');
  let raw;
  try { raw = fs.readFileSync(envFile, 'utf8'); }
  catch (e) { throw new Error(`cannot read ${envFile} (${e.code}) — set ROUND_INDEX_ENV_PSQL or DATABASE_URL`); }
  const url = (raw.match(/postgresql:\/\/[^\s"']+/) || [])[0];
  if (!url) throw new Error(`no DATABASE_URL in ${envFile}`);
  return url;
}

/** The one statement, on its own connection. Overridable in tests. */
async function refreshNow() {
  const { Client } = require('pg');
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  try { await client.query(REFRESH_SQL); }
  finally { await client.end().catch(() => {}); }
}

// ─── coalescing state ─────────────────────────────────────────────────────
let impl = refreshNow;          // swapped in tests
let logger = console;
let timer = null;               // debounce timer for the next run
let inFlight = null;            // promise of the run currently executing
let pending = null;             // { promise, resolve, courses:Set, reasons:Set }
let runCount = 0;               // observable by tests: how many refreshes ran

function newPending() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  // `immediate` is not just "no debounce": it means a caller is AWAITING this
  // refresh and may be about to exit, so the timer must hold the event loop
  // open. See the unref decision in requestRoundIndexRefresh().
  return { promise, resolve, courses: new Set(), reasons: new Set(), immediate: false };
}

/**
 * Arm the debounce timer. An unref'd timer lets a process exit before the
 * refresh has run — harmless for a long-lived server, fatal for a tools/ script
 * whose last act is `await requestRoundIndexRefresh(..., {immediate:true})`:
 * node sees nothing keeping the loop alive and exits, the refresh never runs,
 * and the script reports success over a stale round map. So a batch that
 * anybody is waiting on keeps its timer REFERENCED.
 */
function armTimer(delay, batch) {
  timer = setTimeout(runPending, delay);
  if (!batch?.immediate) timer.unref?.();
}

async function runPending() {
  timer = null;
  const batch = pending;
  pending = null;
  if (!batch) return;

  const started = Date.now();
  const courses = [...batch.courses].join(', ') || 'unknown';
  let result;
  try {
    inFlight = impl();
    await inFlight;
    runCount++;
    result = { ok: true, refreshed: true, ms: Date.now() - started, courses: [...batch.courses] };
    logger.log?.(`[round-index] refreshed course_round_index in ${result.ms}ms after writes to ${courses}`);
  } catch (err) {
    result = { ok: false, refreshed: false, ms: Date.now() - started, courses: [...batch.courses], error: err.message };
    // Loud, and it names the course — a released course whose map is now stale
    // is the whole failure this module exists to prevent, so silence is the one
    // thing that is not allowed.
    logger.error?.(`[round-index] REFRESH FAILED after writes to ${courses} — `
      + `course_round_index may now be STALE and those rounds invisible to learners: ${err.message}`);
  } finally {
    inFlight = null;
  }
  batch.resolve(result);

  // A write that arrived while we were running gets its own run: the view must
  // be refreshed after the LAST write, not after the one that happened to start
  // the refresh.
  if (pending && !timer) armTimer(DEBOUNCE_MS, pending);
}

/**
 * Call this as the LAST ACT of anything that inserts, updates or deletes rows
 * in course_legos — an HTTP route, a tools/ sweep, a repair script.
 *
 * HTTP routes do not need to call it by hand: services/shared/content-edit-gate.cjs
 * calls it for every surface flagged `legos: true` in content-write-surfaces.cjs,
 * and content-write-surfaces.test.cjs fails if a route mutates course_legos
 * without that flag. Forgetting it is a test failure, not a silent stale course.
 *
 * @param {string} courseCode  for the log line only — the refresh is whole-view.
 * @param {{immediate?: boolean, reason?: string}} [opts]  immediate skips the debounce.
 * @returns {Promise<{ok: boolean, refreshed: boolean, ms: number, error?: string}>}
 *          never rejects. A route ignores it; a script about to exit awaits it.
 */
function requestRoundIndexRefresh(courseCode, opts = {}) {
  if (process.env.ROUND_INDEX_REFRESH_DISABLED === '1') {
    return Promise.resolve({ ok: true, refreshed: false, ms: 0, skipped: 'disabled' });
  }
  if (!pending) pending = newPending();
  if (courseCode) pending.courses.add(courseCode);
  if (opts.reason) pending.reasons.add(opts.reason);

  if (opts.immediate) pending.immediate = true;

  // A run already executing owns the view. Arming a timer now would start a
  // SECOND concurrent REFRESH MATERIALIZED VIEW CONCURRENTLY over the same
  // ~0.8s statement — two connections doing the same work, and the coalescing
  // this module exists for quietly defeated. Recording the intent is enough:
  // runPending's tail re-arms the timer when the current run finishes, so this
  // write is still covered, after it.
  if (inFlight) return pending.promise;

  if (timer) clearTimeout(timer);
  armTimer(opts.immediate ? 0 : DEBOUNCE_MS, pending);
  return pending.promise;
}

/** Await everything outstanding — for scripts that are about to exit, and tests. */
async function flushRoundIndexRefresh() {
  while (pending || inFlight || timer) {
    if (timer) { clearTimeout(timer); timer = null; await runPending(); }
    else if (inFlight) await inFlight.catch(() => {});
    else if (pending) await runPending();
  }
}

/** Test seam: swap the statement, the logger, and read the run count. */
function __setRefreshImpl(fn, log) {
  impl = fn || refreshNow;
  if (log) logger = log;
  if (timer) { clearTimeout(timer); timer = null; }
  pending = null; inFlight = null; runCount = 0;
}
const __runCount = () => runCount;

module.exports = {
  requestRoundIndexRefresh,
  flushRoundIndexRefresh,
  refreshNow,
  databaseUrl,
  REFRESH_SQL,
  DEBOUNCE_MS,
  __setRefreshImpl,
  __runCount,
};
