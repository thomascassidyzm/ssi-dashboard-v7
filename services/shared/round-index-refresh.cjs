// services/shared/round-index-refresh.cjs
//
// THE ROUND MAP REFRESHES BY CONSTRUCTION (Tom's ruling, 2026-09-20:
// "yes, this is the more robust way to do it" — the step that writes legos
// refreshes the map as its last act, so a course cannot ship stale).
//
// course_round_index is the map the learner app walks
// (ssi-learning-app/api/courses/[code]/round-map.ts, bundle.ts and cycles.ts
// read it), and a course is exactly as long as that map says it is. Nothing
// used to refresh it on any write path: afr_for_eng sat NINE ROUNDS short of
// its own content for weeks, silently, with no error anywhere — the learner
// reached the end of the old map and the course just ended.
// tools/round-index/nightly.cjs stays as the BACKSTOP; this module is the fix.
//
// ─── ONLY THE EDITED COURSE IS REBUILT (#533·AL, 2026-11-26) ───────────────
// SUPERSEDES the 2026-09-20 option (A) below for SCOPING. On 26 Nov Tom heard
// that each of Kai's edits rebuilt the round map ("ok, that's dumb that each
// Kai edit does this"): the dumb part was that every edit to one course
// rebuilt the map for EVERY course. #528·AL measured the whole-view refresh at
// up to 46% of all active backend samples on the live database in an hour,
// with Supabase's >80% CPU alarm tripped (report
// https://watson-1.tail4968cb.ts.net/d/037ac318). The 2026-09-20 measurement
// (0.8 s for 92k rows) priced one refresh, not a paced writer buying one every
// few seconds, so it judged scoping unneeded; that is overturned.
//
// PostgreSQL cannot refresh PART of a materialised view, so the migration
// database/migrations/20261126_round_index_table.sql turns course_round_index
// into an ordinary TABLE of the same name and columns, defined in ONE place
// (the plain view course_round_index_source), and rebuilt by
//   course_round_index_rebuild(course)  — one course, a DIFF in one
//                                          transaction: rows that changed are
//                                          rewritten, an unchanged course
//                                          writes nothing, readers never see
//                                          it empty
//   course_round_index_rebuild_all()    — every course, for the nightly.
//
// THIS CODE RUNS BEFORE AND AFTER THAT MIGRATION. Each run asks the catalogue
// whether course_round_index_rebuild(text) exists (one cheap lookup): if so it
// rebuilds the coalesced course; if not it falls back to the whole-view
// REFRESH it always ran, under a process-wide one-a-minute floor, so the
// pre-migration cost is exactly #528·AL's.
//
// ─── THE 2026-09-20 CHOICE, KEPT FOR THE RECORD ───────────────────────────
// Measured against the live database, 2026-09-20, 92,439 view rows:
//   REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index
//   → 1297 ms cold, 816 ms / 819 ms warm.
// The options were (A) whole-view CONCURRENTLY, coalesced, (B) replace the
// matview with a table maintained per course, (C) a trigger on course_legos
// doing (B)'s work. (A) was taken as needing no migration and no second
// definition. (B) is what #533·AL built — with ONE definition, the source
// view, so the drift objection does not apply. (C) stays rejected: a trigger
// would rebuild on every row of a multi-row write, inside the writer's own
// transaction, where this module coalesces and runs off the writer's path.
// Journalled in docs/DECISIONS.md.
//
// FIRE-AND-LOG, NOT AWAITED BY THE ROUTE. An HTTP caller gets its response
// immediately and the rebuild lands a moment later; the promise is returned
// for the callers that DO want to wait (a tools/ sweep about to exit, tests).
//
// COALESCED, PER COURSE. A build submits seed after seed. Requests for one
// course inside DEBOUNCE_MS fold into one run, a request arriving while that
// course's run is in flight schedules exactly one more, and MIN_INTERVAL_MS
// floors each course at one rebuild a minute — so the map is always rebuilt
// AFTER the last write, and writes to different courses never wait on each
// other.
//
// IT NEVER THROWS INTO THE CALLER. A refresh that fails must not fail a content
// write that already succeeded. It resolves { ok: false, error } and logs loudly.

const path = require('path');
const fs = require('fs');

/** The whole-view statement: the fallback before the migration. */
const REFRESH_SQL = 'REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index';

/**
 * After the migration, these rebuild the table — one course, or every course.
 * Both diff against course_round_index_source and return how many rows they
 * changed, so an edit that moved no round writes nothing at all.
 */
const REBUILD_COURSE_SQL = 'SELECT public.course_round_index_rebuild($1) AS changed';
const REBUILD_ALL_SQL = 'SELECT public.course_round_index_rebuild_all() AS changed';
const SCOPED_PROBE_SQL = "SELECT to_regprocedure('public.course_round_index_rebuild(text)') IS NOT NULL AS scoped";

/** The key a write that named no course is filed under: the whole estate. */
const WHOLE = '*';

/** How long to wait for more writes before refreshing. */
const DEBOUNCE_MS = Number(process.env.ROUND_INDEX_DEBOUNCE_MS || 2000);

/**
 * The floor between two rebuilds OF ONE COURSE from this process (#528·AL,
 * 2026-11-26; per course since #533·AL the same night).
 * The 2 s debounce only coalesces a burst. A writer PACED by the load
 * governor writes every few seconds, so every write outlived the debounce and
 * bought its own whole-estate refresh: on the night of 25-26 Nov the refresh
 * was the single largest consumer of active time on the live database (up to
 * 46% of all active backend samples in an hour) and Supabase emailed >80% CPU.
 * With this floor a sustained writer costs one rebuild of ITS course a minute,
 * and the last write is still followed by a rebuild, at most a minute later.
 * Before the migration the fallback is a whole-view refresh, and that keeps a
 * process-wide floor of its own (lastWholeStarted), so two courses being
 * edited still cost one whole refresh a minute, never two. `immediate` (a
 * script about to exit) is held by neither.
 */
const MIN_INTERVAL_MS = Number(process.env.ROUND_INDEX_MIN_INTERVAL_MS || 60000);
let lastWholeStarted = 0;       // when this process last started a whole-view REFRESH

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

/** Is the per-course rebuild installed? One catalogue lookup, on the caller's connection. */
async function scopedAvailable(client) {
  const { rows } = await client.query(SCOPED_PROBE_SQL);
  return !!rows[0]?.scoped;
}

/**
 * Rebuild the round map on a client the caller owns: one course, or every
 * course when `courseCode` is empty or WHOLE. With the per-course function
 * installed it rebuilds exactly that scope; without it, it falls back to the
 * whole-view REFRESH (tools/refresh-round-index.cjs uses this too, so the
 * nightly and the write paths can never disagree about what a rebuild is).
 *
 * `gate` is the coalescer's: { since, immediate }. In fallback mode a whole
 * REFRESH that STARTED after `since` (the batch's last write) already covers
 * the batch, so it is skipped; one started under a minute ago asks to be
 * retried later rather than stacking a second whole-estate statement. With no
 * gate (the legacy tools/ scripts that call refreshNow() directly) it just runs.
 *
 * @returns {Promise<{scope: string, mode: 'course'|'all'|'whole-view',
 *           changed?: number, covered?: boolean, retryInMs?: number}>}
 */
async function rebuildOn(client, courseCode, gate) {
  const scope = courseCode && courseCode !== WHOLE ? courseCode : WHOLE;
  if (await scopedAvailable(client)) {
    const { rows } = scope === WHOLE
      ? await client.query(REBUILD_ALL_SQL)
      : await client.query(REBUILD_COURSE_SQL, [scope]);
    return { scope, mode: scope === WHOLE ? 'all' : 'course', changed: Number(rows[0]?.changed) || 0 };
  }
  // ── FALLBACK: the migration has not run; course_round_index is still a matview.
  if (gate) {
    if (lastWholeStarted >= gate.since) return { scope, mode: 'whole-view', covered: true };
    const wait = lastWholeStarted + MIN_INTERVAL_MS - Date.now();
    if (wait > 0 && !gate.immediate) return { scope, mode: 'whole-view', retryInMs: wait };
  }
  lastWholeStarted = Date.now();
  await client.query(REFRESH_SQL);
  return { scope, mode: 'whole-view' };
}

/** rebuildOn, on its own connection. Overridable in tests. */
async function refreshNow(courseCode, gate) {
  const { Client } = require('pg');
  const client = new Client({ connectionString: databaseUrl(), application_name: 'popty:round-index' });
  await client.connect();
  try { return await rebuildOn(client, courseCode, gate); }
  finally { await client.end().catch(() => {}); }
}

// ─── coalescing state, PER COURSE ─────────────────────────────────────────
// One slot per course code (WHOLE for a write that named none). Each slot is
// the little machine the whole-view version had — debounce, floor, one in
// flight, one more pending. Slots are never dropped (the floor lives in them);
// there are only as many as there are courses.
let impl = refreshNow;          // swapped in tests
let logger = console;
const slots = new Map();        // key → { key, timer, inFlight, pending, lastStarted }
let runCount = 0;               // observable by tests: how many rebuilds ran

function slotFor(key) {
  let s = slots.get(key);
  if (!s) { s = { key, timer: null, inFlight: null, pending: null, lastStarted: 0 }; slots.set(key, s); }
  return s;
}

function newPending() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  // `immediate` is not just "no debounce": it means a caller is AWAITING this
  // refresh and may be about to exit, so the timer must hold the event loop
  // open. See armTimer().
  return { promise, resolve, reasons: new Set(), immediate: false, lastRequestAt: 0 };
}

/** Delay for a non-immediate run: the debounce, or longer if this course's floor says so. */
function flooredDelay(slot) {
  return Math.max(DEBOUNCE_MS, slot.lastStarted + MIN_INTERVAL_MS - Date.now());
}

/**
 * Arm a slot's timer. An unref'd timer lets a process exit before the
 * refresh has run — harmless for a long-lived server, fatal for a tools/ script
 * whose last act is `await requestRoundIndexRefresh(..., {immediate:true})`:
 * node sees nothing keeping the loop alive and exits, the refresh never runs,
 * and the script reports success over a stale round map. So a batch that
 * anybody is waiting on keeps its timer REFERENCED.
 */
function armTimer(slot, delay) {
  slot.timer = setTimeout(() => runPending(slot), delay);
  if (!slot.pending?.immediate) slot.timer.unref?.();
}

async function runPending(slot) {
  slot.timer = null;
  const batch = slot.pending;
  slot.pending = null;
  if (!batch) return;

  const started = Date.now();
  slot.lastStarted = started;
  const label = slot.key === WHOLE ? 'every course (no course named)' : slot.key;
  let result;
  try {
    slot.inFlight = impl(slot.key, { since: batch.lastRequestAt, immediate: batch.immediate });
    const out = (await slot.inFlight) || {};
    if (out.retryInMs) {
      // Fallback mode, and a whole-view refresh ran under a minute ago: put the
      // batch back, same promise, and come back when the process-wide floor
      // allows. Writes that arrived meanwhile fold into it.
      slot.inFlight = null;
      const later = slot.pending;
      if (later) {
        for (const r of later.reasons) batch.reasons.add(r);
        batch.immediate = batch.immediate || later.immediate;
        batch.lastRequestAt = Math.max(batch.lastRequestAt, later.lastRequestAt);
        batch.promise.then(later.resolve);
      }
      slot.pending = batch;
      if (!slot.timer) armTimer(slot, batch.immediate ? 0 : out.retryInMs);
      return;
    }
    if (!out.covered) runCount++;
    result = { ok: true, refreshed: !out.covered, ms: Date.now() - started, courses: [slot.key], ...out };
    logger.log?.(out.mode === 'whole-view'
      ? (out.covered
        ? `[round-index] writes to ${label} already covered by a whole-view refresh started after them`
        : `[round-index] refreshed course_round_index (whole view — per-course rebuild not installed) in ${result.ms}ms after writes to ${label}`)
      : `[round-index] rebuilt round map for ${label} in ${result.ms}ms — ${out.changed} row(s) changed`);
  } catch (err) {
    result = { ok: false, refreshed: false, ms: Date.now() - started, courses: [slot.key], error: err.message };
    // Loud, and it names the course — a released course whose map is now stale
    // is the whole failure this module exists to prevent, so silence is the one
    // thing that is not allowed.
    logger.error?.(`[round-index] REFRESH FAILED after writes to ${label} — `
      + `course_round_index may now be STALE and those rounds invisible to learners: ${err.message}`);
  } finally {
    slot.inFlight = null;
  }
  batch.resolve(result);

  // A write that arrived while we were running gets its own run: the map must
  // be rebuilt after the LAST write, not after the one that happened to start it.
  if (slot.pending && !slot.timer) armTimer(slot, slot.pending.immediate ? 0 : flooredDelay(slot));
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
 * @param {string} courseCode  the course whose round map is rebuilt; empty = every course.
 * @param {{immediate?: boolean, reason?: string}} [opts]  immediate skips the debounce and floor.
 * @returns {Promise<{ok: boolean, refreshed: boolean, ms: number, error?: string}>}
 *          never rejects. A route ignores it; a script about to exit awaits it.
 */
function requestRoundIndexRefresh(courseCode, opts = {}) {
  if (process.env.ROUND_INDEX_REFRESH_DISABLED === '1') {
    return Promise.resolve({ ok: true, refreshed: false, ms: 0, skipped: 'disabled' });
  }
  const slot = slotFor(courseCode || WHOLE);
  if (!slot.pending) slot.pending = newPending();
  const pending = slot.pending;
  pending.lastRequestAt = Date.now();
  if (opts.reason) pending.reasons.add(opts.reason);
  if (opts.immediate) pending.immediate = true;

  // A run already executing for this course owns it. Arming a timer now would
  // start a SECOND concurrent rebuild of the same course — the coalescing this
  // module exists for quietly defeated. Recording the intent is enough:
  // runPending's tail re-arms the timer when the current run finishes, so this
  // write is still covered, after it.
  if (slot.inFlight) return pending.promise;

  // A timer already armed keeps its time unless this caller is waiting: a
  // steady trickle of writes must not push the refresh back for ever.
  if (slot.timer && !opts.immediate) return pending.promise;
  if (slot.timer) clearTimeout(slot.timer);
  armTimer(slot, opts.immediate ? 0 : flooredDelay(slot));
  return pending.promise;
}

/** Await everything outstanding — for scripts that are about to exit, and tests. */
async function flushRoundIndexRefresh() {
  for (;;) {
    const busy = [...slots.values()].filter(s => s.pending || s.inFlight || s.timer);
    if (!busy.length) return;
    await Promise.all(busy.map(async (s) => {
      if (s.inFlight) { await s.inFlight.catch(() => {}); return; }
      if (s.timer) { clearTimeout(s.timer); s.timer = null; }
      if (s.pending) { s.pending.immediate = true; await runPending(s); }
    }));
  }
}

/** Test seam: swap the statement, the logger, and read the run count. */
function __setRefreshImpl(fn, log) {
  impl = fn || refreshNow;
  if (log) logger = log;
  for (const s of slots.values()) if (s.timer) clearTimeout(s.timer);
  slots.clear(); runCount = 0; lastWholeStarted = 0;
}
const __runCount = () => runCount;

module.exports = {
  requestRoundIndexRefresh,
  flushRoundIndexRefresh,
  refreshNow,
  rebuildOn,
  scopedAvailable,
  databaseUrl,
  REFRESH_SQL,
  REBUILD_COURSE_SQL,
  REBUILD_ALL_SQL,
  WHOLE,
  DEBOUNCE_MS,
  MIN_INTERVAL_MS,
  __setRefreshImpl,
  __runCount,
};
