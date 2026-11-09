/**
 * Redo queue — a Redo that cannot run yet WAITS instead of being refused (job #457, Kai, 9 Nov 2026).
 *
 * WHY. #429 made POST /api/build/redo refuse (503 REDO_PREFLIGHT, nothing deleted) when all agent slots were
 * busy or both SSi Claude accounts were at their weekly limit. That kept seeds from being emptied, but Kai:
 * "refusing is bad UX — users press Redo, get refused, and don't understand why." (The page ignored the 503
 * body, so the press simply did nothing.)
 *
 * WHAT NOW HAPPENS
 *   - Redo while blocked (or while other redos are already waiting — first come, first served) → the request
 *     is QUEUED: 202, nothing snapshotted, nothing deleted. The seed shows "Redo queued — waiting for …" in
 *     the course builder with its plain-English reason, its place in the queue, and an ETA where one is
 *     knowable (an account's weekly reset; the agent cap has none).
 *   - drainRedoQueue() runs every QUEUE_INTERVAL_MS in the course builder (and right after each enqueue).
 *     Oldest first: it re-runs the SAME preflight as #429 immediately before each one; only if that passes
 *     does it claim the entry and run the redo — snapshot, wipe, spawn — through performRedo(), the very code
 *     the route runs, so the #429 watchdog (retry once, then restore + alert) covers a queued redo exactly as
 *     it covers a direct one. The first blocked entry stops the pass: later ones keep their places.
 *   - A queued redo can be cancelled until it starts. Nothing was deleted, so cancelling changes nothing.
 *
 * NEVER DELETES BEFORE IT CAN RUN. The only path to a wipe is performRedo(), and the drain reaches it only
 * after preflight() answered null for that entry in the same pass.
 *
 * PERSISTENCE, NO SCHEMA CHANGE. Each queue event is one orchestrator_messages row (the course chat — it is
 * also the line Kai reads) whose metadata carries redo_queue:'v1': 'redo_queued' opens an entry; a later
 * 'redo_queue_started' / 'redo_queue_cancelled' / 'redo_queue_failed' row with the same queue_id closes it.
 * Open = queued with no closing row. So the queue survives a restart of the course builder by construction.
 * The editor identity the gate resolved on the original press is stored on the entry and used for the
 * content-edit event when the wipe finally happens, so the wipe is attributed to the person who asked.
 *
 * The decisions — openEntries(), nextAction(), describeBlocker() — are pure and tested in redo-queue.test.cjs.
 */

const crypto = require('crypto');
const { snapshotSeeds, restoreSnapshot } = require('./redo-snapshot.cjs');
const { wipeSeedTeaching } = require('../../shared/wipe-seed-teaching.cjs');
const { bumpCourseVersion } = require('../../shared/course-version.cjs');

const QUEUE_TAG = 'v1';
const QUEUE_INTERVAL_MS = Number(process.env.REDO_QUEUE_INTERVAL_MS) || 30e3;
// An entry older than this is still listed and still runs; the window only bounds the read.
const QUEUE_LOOKBACK_MS = 60 * 86400e3;
const OPEN = 'redo_queued';
const CLOSERS = new Set(['redo_queue_started', 'redo_queue_cancelled', 'redo_queue_failed']);
const REDO_SURFACE = 'course-builder:POST /api/build/redo/:courseCode';

// ── pure ────────────────────────────────────────────────────────────────────

/** rows (orchestrator_messages, oldest first) → open entries, oldest first. */
function openEntries(rows) {
  const opened = new Map();
  const closed = new Set();
  for (const row of rows || []) {
    const m = row.metadata || {};
    if (m.redo_queue !== QUEUE_TAG || !m.queue_id) continue;
    if (m.action === OPEN && !opened.has(m.queue_id)) {
      opened.set(m.queue_id, {
        queue_id: m.queue_id, course_code: row.course_code, seeds: m.seeds || [], notes: m.notes || '',
        queued_at: m.queued_at || row.created_at, queued_by: m.identity?.label || m.identity?.id || null,
        identity: m.identity || null, first_reason: m.reason || null,
      });
    } else if (CLOSERS.has(m.action)) closed.add(m.queue_id);
  }
  return [...opened.values()].filter((e) => !closed.has(e.queue_id))
    .sort((a, b) => Date.parse(a.queued_at) - Date.parse(b.queued_at));
}

/**
 * What blocks a redo right now, in plain English, or null. Same two checks as #429's preflightRedo.
 *   accountResets — ISO reset instants of the SSi accounts (for the ETA); may be empty.
 */
function describeBlocker({ runningAgents, maxAgents, accounts, altAccount, accountResets = [], now = Date.now() }) {
  if (runningAgents >= maxAgents) {
    return { kind: 'agents', reason: `waiting for a free agent — all ${maxAgents} agent slots are busy (${runningAgents} running)`, eta: null, eta_text: 'as soon as a running build or redo finishes' };
  }
  if (accounts > 0 && !altAccount()) {
    const soonest = accountResets.map((s) => Date.parse(s)).filter((t) => Number.isFinite(t) && t > now).sort((a, b) => a - b)[0];
    return {
      kind: 'accounts',
      reason: 'waiting for account capacity — both SSi Claude accounts are at their weekly limit, and a rebuild agent would stop at once',
      eta: soonest ? new Date(soonest).toISOString() : null,
      eta_text: soonest ? `when the first account resets, ${new Date(soonest).toUTCString().replace(':00 GMT', ' UTC')}` : 'when an account resets (reset time unknown)',
    };
  }
  return null;
}

/** PURE. Given the open queue and the current blocker: what the drain does with the head entry. */
function nextAction(entries, blocker) {
  if (!entries.length) return { action: 'idle' };
  if (blocker) return { action: 'wait', entry: entries[0], why: blocker.reason };
  return { action: 'run', entry: entries[0] };
}

/**
 * PURE. rows = every orchestrator_messages row for ONE queue_id, oldest first. The FIRST closing row decides
 * the entry's fate; a 'started' or 'cancelled' writer whose own claim_id is not that first closer lost a race
 * (Cancel pressed as the drain claimed it, or two course-builder processes draining the one shared DB).
 */
function claimWinner(rows, claimId) {
  const first = (rows || []).find((r) => CLOSERS.has(r.metadata?.action));
  return { won: !!first && first.metadata.claim_id === claimId, first: first ? first.metadata : null };
}

/** Seeds of `seeds` that already sit in an open entry for this course. */
function overlapping(entries, courseCode, seeds) {
  const queued = new Set(entries.filter((e) => e.course_code === courseCode).flatMap((e) => e.seeds));
  return seeds.filter((n) => queued.has(n));
}

// ── I/O ─────────────────────────────────────────────────────────────────────

// OPERATOR HOLD — hold every redo in the queue for up to an hour (maintenance, or to see the queued state on
// purpose: the only way to check the "Redo queued" banner live when capacity is free). In memory only, so a
// restart lifts it: a hold can never strand the queue.
let hold = null; // { until, reason, by }
function setHold({ minutes = 0, reason = '', by = null } = {}) {
  const m = Math.max(0, Math.min(60, Number(minutes) || 0));
  hold = m ? { until: Date.now() + m * 60e3, reason: String(reason || 'held by an operator').slice(0, 200), by } : null;
  return hold;
}
function currentHold() { return hold && hold.until > Date.now() ? hold : null; }

function liveBlocker() {
  const h = currentHold();
  if (h) return { kind: 'hold', reason: `redos are on hold — ${h.reason}`, eta: new Date(h.until).toISOString(), eta_text: `when the hold lifts, ${new Date(h.until).toUTCString().replace(' GMT', ' UTC')}` };
  const { getRunningAgentCount, MAX_CONCURRENT_AGENTS } = require('./agent-spawner.cjs');
  const cfg = require('../../shared/claude-config.cjs');
  const fs = require('fs');
  let accounts = 0, resets = [];
  try {
    const live = cfg.candidates().filter((c) => { try { return !!fs.readFileSync(c.file, 'utf8').trim(); } catch { return false; } });
    accounts = live.length;
    const usage = JSON.parse(fs.readFileSync(process.env.SSI_CLAUDE_USAGE_FILE || require('path').join(require('os').homedir(), 'command-surface', 'ops', 'account-usage.json'), 'utf8'));
    const acc = usage.accounts || usage;
    resets = live.map((c) => { const k = Object.keys(acc).find((x) => x.toLowerCase() === c.email); return k && acc[k] && acc[k].weekly_all_resets_at; }).filter(Boolean);
  } catch { /* no gauge → no ETA */ }
  return describeBlocker({
    runningAgents: getRunningAgentCount(),
    maxAgents: MAX_CONCURRENT_AGENTS,
    accounts,
    altAccount: () => cfg.alternativeAccount({}),
    accountResets: resets,
  });
}

async function loadOpenEntries(ctx, now = new Date()) {
  const since = new Date(now.getTime() - QUEUE_LOOKBACK_MS).toISOString();
  const { data, error } = await ctx.supabase.from('orchestrator_messages')
    .select('course_code, metadata, created_at')
    .eq('metadata->>redo_queue', QUEUE_TAG)
    .gte('created_at', since)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`orchestrator_messages read failed: ${error.message}`);
  return openEntries(data);
}

/** Every row of one queue entry, oldest first (ties broken by id, so every reader sees the same order). */
async function entryRows(ctx, queueId) {
  const { data, error } = await ctx.supabase.from('orchestrator_messages')
    .select('id, metadata, created_at')
    .eq('metadata->>redo_queue', QUEUE_TAG)
    .eq('metadata->>queue_id', queueId)
    .order('created_at', { ascending: true }).order('id', { ascending: true });
  if (error) throw new Error(`orchestrator_messages read failed: ${error.message}`);
  return data || [];
}

async function writeRow(ctx, courseCode, message, metadata) {
  const { error } = await ctx.supabase.from('orchestrator_messages').insert({
    course_code: courseCode, direction: 'agent_to_human', status: 'pending', message,
    metadata: { redo_queue: QUEUE_TAG, ...metadata },
  });
  if (error) throw new Error(`orchestrator_messages write failed: ${error.message}`);
}

const plural = (seeds) => (seeds.length > 1 ? `seeds ${seeds.join(', ')}` : `seed ${seeds[0]}`);

/** Queue a redo. Writes ONE chat row; touches no course content. */
async function enqueueRedo(ctx, { courseCode, seeds, notes = '', identity = null, blocker = null }) {
  const queue_id = crypto.randomUUID();
  const queued_at = new Date().toISOString();
  const why = blocker ? blocker.reason : 'waiting behind redos queued earlier';
  await writeRow(ctx, courseCode,
    `Redo of ${plural(seeds)} queued — ${why}. Nothing has been changed yet; it will start by itself${blocker?.eta_text ? ` ${blocker.eta_text}` : ' when an agent can run'}. You can cancel it until then.`,
    { action: OPEN, queue_id, seeds, notes: notes || null, queued_at, reason: why, identity: identity ? { kind: identity.kind, id: identity.id, label: identity.label, email: identity.email || null, role: identity.role || null, verified: !!identity.verified } : null });
  return { queue_id, queued_at, seeds, reason: why };
}

/** The queue as the page shows it: every open entry with its place, plus the live reason and ETA. */
async function queueStatus(ctx, { courseCode = null, blocker } = {}) {
  const all = await loadOpenEntries(ctx);
  const b = blocker === undefined ? liveBlocker() : blocker;
  const entries = all.map((e, i) => ({
    queue_id: e.queue_id, course_code: e.course_code, seeds: e.seeds, notes: e.notes, queued_at: e.queued_at, queued_by: e.queued_by,
    position: i + 1, of: all.length,
    reason: b ? b.reason : (i === 0 ? 'starting now — an agent is free' : 'waiting behind earlier redos'),
    eta: b ? b.eta : null, eta_text: b ? b.eta_text : null,
  }));
  return { blocker: b, total: all.length, entries: courseCode ? entries.filter((e) => e.course_code === courseCode) : entries };
}

async function cancelQueuedRedo(ctx, { courseCode, queueId, by = null }) {
  const entry = (await loadOpenEntries(ctx)).find((e) => e.queue_id === queueId && e.course_code === courseCode);
  if (!entry) return { ok: false, error: 'No queued redo with that id — it has already started, finished or been cancelled.' };
  const claim_id = crypto.randomUUID();
  await writeRow(ctx, courseCode, `Queued redo of ${plural(entry.seeds)} cancelled${by ? ` by ${by}` : ''}. Nothing was changed.`,
    { action: 'redo_queue_cancelled', queue_id: queueId, seeds: entry.seeds, by, claim_id });
  // The drain may have claimed it in the same instant: only the first closing row counts (see claimWinner).
  const { won, first } = claimWinner(await entryRows(ctx, queueId), claim_id);
  if (!won) return { ok: false, error: `Too late to cancel — the redo ${first?.action === 'redo_queue_cancelled' ? 'was already cancelled' : 'had already started'}.` };
  return { ok: true, cancelled: entry };
}

/**
 * THE REDO ITSELF — snapshot, wipe, spawn (with #429's restore-on-failed-spawn). Shared by the route (capacity
 * free, nobody waiting) and the drain (a queued entry whose turn came). Callers MUST have run the preflight.
 *   recordEdit({scope}) → content_edit_events id for the wipe (the gate's req.contentEdit.record, or the drain's).
 * Returns the route's success body; throws { status, body } on a spawn failure after the wipe (seeds restored).
 */
async function performRedo(ctx, { courseCode, seedNumbers, notes = '', recordEdit = null, deps = {} }) {
  const spawnRedoAgent = deps.spawnRedoAgent || require('./redo-watchdog.cjs').spawnRedoAgent;
  const snapshot = deps.snapshotSeeds || snapshotSeeds;
  const wipe = deps.wipeSeedTeaching || wipeSeedTeaching;
  const restore = deps.restoreSnapshot || restoreSnapshot;
  const bump = deps.bumpCourseVersion || bumpCourseVersion;

  // SNAPSHOT BEFORE DELETE — feeds the undo and the redo brief's "previous decomposition". Throws → nothing deleted.
  const { batchId, snapshots } = await snapshot(ctx.supabase, courseCode, seedNumbers, { reason: 'redo', notes });
  console.log(`[REDO] ${courseCode} snapshot batch ${batchId}: ${snapshots.length} seed(s) captured before delete`);
  const eventId = recordEdit ? await recordEdit({ scope: { seed_numbers: seedNumbers, rows: seedNumbers.length } }) : null;

  let totalPhrasesDeleted = 0, totalLegosDeleted = 0, totalSeedsReset = 0;
  for (const seedNum of seedNumbers) {
    const { phrases_deleted: p, legos_deleted: l } = await wipe(ctx.supabase, courseCode, [seedNum]);
    const { count } = await ctx.supabase.from('course_seeds')
      .update({ decomposed_at: null, approved_at: null, flagged_at: null, last_edit_event_id: eventId }, { count: 'exact' })
      .eq('course_code', courseCode).eq('seed_number', seedNum);
    totalPhrasesDeleted += p || 0; totalLegosDeleted += l || 0; totalSeedsReset += count || 0;
  }
  ctx.courseVocabCache?.delete(courseCode);
  await bump(ctx.supabase, courseCode, 'minor');

  // Rebuilt seeds need re-review.
  const { data: course } = await ctx.supabase.from('courses').select('quality_rules').eq('course_code', courseCode).single();
  if (course?.quality_rules?.final_pass_completed) {
    await ctx.supabase.from('courses').update({ quality_rules: { ...course.quality_rules, final_pass_completed: false } }).eq('course_code', courseCode);
  }

  // Spawn + RECORD (so the #429 watchdog retries once then restores). A failed spawn puts the seeds back now.
  let spawned;
  try {
    spawned = await spawnRedoAgent(ctx, { courseCode, seeds: seedNumbers, notes, batchId, attempt: 1 });
  } catch (spawnErr) {
    const restored = [];
    for (const s of snapshots) {
      try { await restore(ctx.supabase, { courseCode, snapshotId: s.id, restoredBy: 'redo-spawn-failed' }); restored.push(s.seed_number); }
      catch (e) { console.error(`[REDO] ${courseCode} seed ${s.seed_number}: restore after failed spawn ALSO failed: ${e.message}`); }
    }
    ctx.courseVocabCache?.delete(courseCode);
    const err = new Error(`Redo agent could not start (${spawnErr.message}); restored seed(s) ${restored.join(', ') || 'NONE — undo by hand'}.`);
    err.status = 500; err.restored = restored;
    throw err;
  }

  return {
    ok: true, seeds: seedNumbers, phrases_deleted: totalPhrasesDeleted, legos_deleted: totalLegosDeleted, seeds_reset: totalSeedsReset,
    snapshot_batch_id: batchId, snapshots, account: spawned.account,
    message: `Redo agent spawned for ${seedNumbers.length} seed(s). Previous decomposition snapshotted — if the agent does not submit it is retried once, then restored automatically (undo by hand: POST /api/build/redo-undo/${courseCode}).`,
  };
}

/** The wipe's content-edit event when the drain runs a queued entry: the person who pressed Redo, if known. */
function drainRecorder(ctx, entry) {
  return async ({ scope }) => {
    const { recordContentEdit } = require('../../shared/content-edit-log.cjs');
    const { serviceIdentity } = require('../../shared/editor-identity.cjs');
    const identity = entry.identity && entry.identity.id ? entry.identity : serviceIdentity('course-builder:redo-queue');
    return recordContentEdit(ctx.supabase, {
      identity, courseCode: entry.course_code, surface: REDO_SURFACE, operation: 'redo-wipe',
      scope, detail: { redo_queue_id: entry.queue_id, queued_at: entry.queued_at, run_by: 'course-builder:redo-queue' },
    });
  };
}

/**
 * One pass over the queue. Oldest first; preflight before EACH entry; the first blocked entry ends the pass.
 * deps (tests): blocker() → describeBlocker result|null, performRedo, refreshRoundIndex.
 * Returns [{ queue_id, action, why? }].
 */
async function drainRedoQueue(ctx, { deps = {} } = {}) {
  const blockerOf = deps.blocker || liveBlocker;
  const perform = deps.performRedo || performRedo;
  const refresh = deps.refreshRoundIndex || ((code) => require('../../shared/round-index-refresh.cjs').requestRoundIndexRefresh(code));
  const results = [];
  let entries = await loadOpenEntries(ctx);
  for (let guard = 0; entries.length && guard < 100; guard++) {
    const step = nextAction(entries, blockerOf());
    if (step.action === 'wait') { results.push({ queue_id: step.entry.queue_id, action: 'wait', why: step.why }); break; }
    const e = step.entry;
    // CLAIM FIRST: the 'started' row closes the entry, so a crash or a second pass cannot run it twice — and
    // nothing is touched unless this row is the entry's FIRST closer (a Cancel or another drain may have won).
    const claim_id = crypto.randomUUID();
    await writeRow(ctx, e.course_code, `Queued redo of ${plural(e.seeds)} is starting — an agent is free.`,
      { action: 'redo_queue_started', queue_id: e.queue_id, seeds: e.seeds, started_at: new Date().toISOString(), claim_id });
    const claim = claimWinner(await (deps.entryRows || entryRows)(ctx, e.queue_id), claim_id);
    if (!claim.won) {
      results.push({ queue_id: e.queue_id, action: 'lost-claim', why: claim.first?.action || 'unknown' });
      entries = await loadOpenEntries(ctx);
      continue;
    }
    try {
      const out = await perform(ctx, { courseCode: e.course_code, seedNumbers: e.seeds, notes: e.notes, recordEdit: drainRecorder(ctx, e) });
      results.push({ queue_id: e.queue_id, action: 'ran', account: out.account });
      try { await refresh(e.course_code); } catch { /* the refresh helper logs its own failures */ }
    } catch (err) {
      results.push({ queue_id: e.queue_id, action: 'failed', why: err.message });
      try {
        await writeRow(ctx, e.course_code, `Queued redo of ${plural(e.seeds)} could not run: ${err.message}`,
          { action: 'redo_queue_failed', queue_id: e.queue_id, seeds: e.seeds, error: err.message });
      } catch (w) { console.error(`[REDO-QUEUE] could not record failure: ${w.message}`); }
      try { await refresh(e.course_code); } catch { /* ditto */ }
    }
    // Re-read rather than slice: a Cancel pressed while this one ran must be honoured for the next.
    entries = await loadOpenEntries(ctx);
  }
  return results;
}

let timer = null, draining = false;
async function drainNow(ctx) {
  if (draining) return [];
  draining = true;
  try {
    const r = await drainRedoQueue(ctx);
    for (const x of r) if (x.action !== 'wait') console.log(`[REDO-QUEUE] ${x.queue_id}: ${x.action}${x.why ? ` — ${x.why}` : ''}`);
    return r;
  } catch (e) { console.error(`[REDO-QUEUE] drain failed: ${e.message}`); return []; }
  finally { draining = false; }
}
function startRedoQueue(ctx) {
  if (timer) return;
  timer = setInterval(() => { drainNow(ctx); }, QUEUE_INTERVAL_MS);
  timer.unref?.();
  setTimeout(() => drainNow(ctx), 5e3).unref?.(); // pick up anything left waiting across a restart
  console.log('[REDO-QUEUE] started');
}

module.exports = {
  openEntries, describeBlocker, nextAction, overlapping, claimWinner,
  liveBlocker, setHold, currentHold, loadOpenEntries, enqueueRedo, queueStatus, cancelQueuedRedo, performRedo, drainRedoQueue, drainNow, startRedoQueue,
  QUEUE_TAG,
};
