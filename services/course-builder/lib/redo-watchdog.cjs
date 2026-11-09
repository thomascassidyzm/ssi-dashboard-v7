/**
 * Redo watchdog — a seed is never left empty because its rebuild agent died (job #429, Kai, 9 Nov 2026).
 *
 * THE BUG THIS CLOSES. POST /api/build/redo wipes a seed's LEGOs + phrases (after snapshotting them) and
 * spawns one headless `claude` to rebuild it through /api/seed/complete. On 6 Nov pdc_for_eng seeds 200, 203
 * and 225 were redone; each agent exited ~1 s after launch with "You've hit your weekly limit" (both SSi
 * accounts were spent that week) — logs/Redo-pdc_for_eng.log, and "[SPAWN] Redo exited (code: 1)" in the
 * course builder's log. The redo route spawned with no build_jobs row and no exit hook, so nothing ever
 * looked at that exit: the seeds sat empty for three days with no alarm until #412·AF undid them by hand.
 *
 * WHAT NOW HAPPENS
 *   1. Before wiping, the route checks the same two things (agent cap free? an SSi account not at its weekly
 *      limit?). If not, it no longer refuses: since job #457 the redo is QUEUED and nothing is touched until
 *      capacity frees — see redo-queue.cjs (liveBlocker / drainRedoQueue). preflightRedo() below is the
 *      original check, kept for its tests.
 *   2. Every redo spawn is RECORDED: one orchestrator_messages row (it is also the line Kai sees in the
 *      course chat) whose metadata carries redo_watchdog:'v1', the snapshot batch, the seeds, the pid, the
 *      log slice and the account billed. No schema change: build_jobs' pass CHECK has no 'redo', and red/
 *      worker jobs may not migrate.
 *   3. sweepRedos() runs every minute in the course builder. For each recorded redo of the last 48 h whose
 *      seeds are still empty (decomposed_at null, no LEGOs, snapshot not restored):
 *        - agent still alive and younger than REDO_STALL_MS → wait;
 *        - agent dead, or alive past REDO_STALL_MS (killed) → attempt 1: retry ONCE, on the other SSi
 *          account if the log shows a usage limit; attempt 2 (or no account left to retry on): restore the
 *          redo snapshot through the existing undo route and ALERT.
 *   4. The alert goes to the course chat (orchestrator_messages, action 'redo_watchdog_alert') and to the
 *      command surface's ops strip (ops_events, source 'popty-redo-watchdog'), and — since #458 — HELD into
 *      the course owner's Watson room via the surface's POST /api/service-notice (shared/service-notice.cjs).
 *
 * Only redos spawned by this code (metadata.redo_watchdog) are ever acted on. Older empty-after-redo seeds
 * are LISTED by findStuckRedoSeeds() (GET /api/build/redo-watchdog) and never touched automatically.
 *
 * The decision is decideRedoAction() — pure, tested in redo-watchdog.test.cjs. The rest is I/O.
 */

const fs = require('fs');
const path = require('path');
const { parseUsageLimit } = require('./build-stop-reason.cjs');
const { isProcessAlive, killProcessTree, readLogSince } = require('./build-job-runtime.cjs');
const { SNAPSHOT_TABLE } = require('./redo-snapshot.cjs');

const WATCHDOG_TAG = 'v1';
// A one-to-few-seed Opus redo normally submits within ~20 min. 90 min alive with nothing submitted is stuck.
const REDO_STALL_MS = Number(process.env.REDO_STALL_MS) || 90 * 60e3;
// How long a recorded redo stays in the sweep. Past this it is only listed by findStuckRedoSeeds().
const REDO_LOOKBACK_MS = 48 * 3600e3;
const SWEEP_INTERVAL_MS = Number(process.env.REDO_SWEEP_INTERVAL_MS) || 60e3;
const MAX_ATTEMPTS = 2; // the first spawn + ONE retry
const OPS_SOURCE = 'popty-redo-watchdog';

/**
 * PURE. What to do with one recorded redo attempt.
 *   attempt        1 = the spawn the human asked for, 2 = the watchdog's retry
 *   pendingSeeds   seeds of the batch still empty (not submitted, not restored)
 *   agentAlive     true / false / null (null = cannot tell: another machine, or no pid)
 *   ageMs          since this attempt was spawned
 *   logText        this attempt's slice of the agent log
 *   altAccount     (spent) => an SSi account other than `spent` with room, or null
 * Returns { action: 'done'|'wait'|'retry'|'restore', why, kill?, excludeAccount? }.
 */
function decideRedoAction({ attempt = 1, pendingSeeds = [], agentAlive = null, ageMs = 0, logText = '', spentAccount = null, altAccount = () => null }) {
  if (!pendingSeeds.length) return { action: 'done', why: 'every seed submitted or restored' };
  const stalled = ageMs >= REDO_STALL_MS;
  if (agentAlive === true && !stalled) return { action: 'wait', why: 'agent still running' };
  // Cannot see the process: give it the whole stall window before calling it dead.
  if (agentAlive === null && !stalled) return { action: 'wait', why: 'agent liveness unknown; inside the stall window' };

  const kill = agentAlive === true; // alive past the stall window
  const usage = parseUsageLimit(logText);
  const failure = kill
    ? `agent still running after ${Math.round(ageMs / 60e3)} min with nothing submitted`
    : usage ? `agent stopped: ${usage.raw}`
      : agentAlive === null ? `nothing submitted after ${Math.round(ageMs / 60e3)} min`
        : 'agent exited without submitting';

  if (attempt >= MAX_ATTEMPTS) return { action: 'restore', why: `retry failed too (${failure})`, kill };
  if (usage) {
    const alt = altAccount(spentAccount);
    if (!alt) return { action: 'restore', why: `${failure}; no other SSi account has room, so a retry would fail the same way`, kill };
    return { action: 'retry', why: failure, kill, excludeAccount: spentAccount || null };
  }
  return { action: 'retry', why: failure, kill, excludeAccount: null };
}

/** null = fine to wipe and spawn; otherwise a sentence saying why not. Called BEFORE anything is deleted. */
function preflightRedo({ runningAgents, maxAgents, accounts, altAccount }) {
  if (runningAgents >= maxAgents) return `the agent cap is full (${runningAgents}/${maxAgents} agents running) — try again when a build finishes`;
  // accounts = the SSi accounts with a token. None configured → the default token runs; nothing to judge.
  if (accounts > 0 && !altAccount()) return 'both SSi Claude accounts are at their weekly limit — a rebuild agent would stop at once and leave the seed empty';
  return null;
}

// ── I/O ─────────────────────────────────────────────────────────────────────

function liveAccountCount() {
  try { return require('../../shared/claude-config.cjs').candidates().filter((c) => { try { return !!fs.readFileSync(c.file, 'utf8').trim(); } catch { return false; } }).length; } catch { return 0; }
}

function runPreflight() {
  const { getRunningAgentCount, MAX_CONCURRENT_AGENTS } = require('./agent-spawner.cjs');
  const { alternativeAccount } = require('../../shared/claude-config.cjs');
  return preflightRedo({
    runningAgents: getRunningAgentCount(),
    maxAgents: MAX_CONCURRENT_AGENTS,
    accounts: liveAccountCount(),
    altAccount: () => alternativeAccount({}),
  });
}

/**
 * Fetch the redo brief, spawn the agent and RECORD the attempt. Throws if the brief or the spawn fails —
 * the route calls this after the wipe, so it restores on a throw (see build.cjs).
 */
async function spawnRedoAgent(ctx, { courseCode, seeds, notes = '', batchId, attempt = 1, excludeAccounts = [], why = null }) {
  const { spawnInTerminal } = require('./agent-spawner.cjs');
  const port = ctx.config.PORT || 3471;
  const notesParam = notes ? `&notes=${encodeURIComponent(notes)}` : '';
  const resp = await fetch(`http://localhost:${port}/api/brief/${courseCode}/redo?seeds=${seeds.join(',')}${notesParam}`);
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || `Brief generation failed (${resp.status})`);
  }
  const brief = await resp.text();
  const tmpFile = path.join(require('os').tmpdir(), `redo_${courseCode}_${Date.now()}.md`);
  fs.writeFileSync(tmpFile, brief);
  const projectDir = path.resolve(__dirname, '..', '..', '..');
  // Opus (not sonnet): Indic/Sinhala scripts degrade under Sonnet (sonnet-indic-script-degradation).
  const claudeCmd = `cd "${projectDir}" && unset ANTHROPIC_API_KEY && unset CLAUDECODE && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`;
  const child = spawnInTerminal(ctx, claudeCmd, 'Redo', courseCode, undefined, { excludeAccounts });

  const meta = {
    action: attempt === 1 ? 'redo_spawned' : 'redo_retry_spawned',
    redo_watchdog: WATCHDOG_TAG,
    snapshot_batch_id: batchId,
    seeds,
    notes: notes || null,
    attempt,
    spawned_at: new Date().toISOString(),
    machine_name: ctx.MACHINE_NAME || null,
    pid: child?.cbPid ?? null,
    log_file: child?.cbLogFile ?? null,
    log_offset: child?.cbLogOffset ?? 0,
    account: child?.cbAccount ?? null,
  };
  const plural = seeds.length > 1 ? 's' : '';
  const message = attempt === 1
    ? `Redo agent spawned for seed${plural} ${seeds.join(', ')}. The previous decomposition is snapshotted; if the agent does not submit, the watchdog retries once and then restores it.`
    : `Redo agent for seed${plural} ${seeds.join(', ')} did not submit (${why}). Retrying once${meta.account ? ` on ${meta.account}` : ''}.`;
  await ctx.supabase.from('orchestrator_messages').insert({ course_code: courseCode, direction: 'agent_to_human', status: 'pending', message, metadata: meta });
  return { ...meta, message };
}

function opsEventSafe(kind, detail) {
  try { require('../../shared/ops-event.cjs').opsEvent(OPS_SOURCE, kind, detail); } catch { /* best effort */ }
}

/** Seeds of `seeds` still empty: decomposed_at null, no LEGOs, and this batch's snapshot not restored. */
async function pendingSeedsOf(ctx, courseCode, seeds, batchId) {
  const { data: seedRows, error: e1 } = await ctx.supabase.from('course_seeds')
    .select('seed_number, decomposed_at').eq('course_code', courseCode).in('seed_number', seeds);
  if (e1) throw new Error(`seed read failed: ${e1.message}`);
  const { data: legoRows, error: e2 } = await ctx.supabase.from('course_legos')
    .select('seed_number').eq('course_code', courseCode).in('seed_number', seeds);
  if (e2) throw new Error(`LEGO read failed: ${e2.message}`);
  const { data: snaps, error: e3 } = await ctx.supabase.from(SNAPSHOT_TABLE)
    .select('id, seed_number, restored_at').eq('batch_id', batchId);
  if (e3) throw new Error(`snapshot read failed: ${e3.message}`);
  const withLegos = new Set((legoRows || []).map((r) => r.seed_number));
  const decomposed = new Set((seedRows || []).filter((r) => r.decomposed_at).map((r) => r.seed_number));
  const restored = new Set((snaps || []).filter((s) => s.restored_at).map((s) => s.seed_number));
  const pending = seeds.filter((n) => !withLegos.has(n) && !decomposed.has(n) && !restored.has(n));
  return { pending, snapshotBySeed: new Map((snaps || []).map((s) => [s.seed_number, s.id])) };
}

/** Restore through the existing undo route so it is gated, attributed, versioned and chat-logged like a human undo. */
async function restoreViaUndoRoute(ctx, courseCode, snapshotId) {
  const port = ctx.config.PORT || 3471;
  const r = await fetch(`http://localhost:${port}/api/build/redo-undo/${courseCode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-service-name': 'course-builder:redo-watchdog', 'x-agent-role': 'redo-watchdog' },
    body: JSON.stringify({ snapshot_id: snapshotId }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || !body.ok) throw new Error(body.error || `undo route answered ${r.status}`);
  return body;
}

async function alert(ctx, courseCode, message, metadata) {
  console.error(`[REDO-WATCHDOG] ${courseCode}: ${message}`);
  opsEventSafe(metadata.outcome || 'alert', `${courseCode}: ${message}`);
  try {
    await ctx.supabase.from('orchestrator_messages').insert({
      course_code: courseCode, direction: 'agent_to_human', status: 'pending', message,
      metadata: { action: 'redo_watchdog_alert', redo_watchdog: WATCHDOG_TAG, ...metadata },
    });
  } catch (e) { console.error(`[REDO-WATCHDOG] could not write chat alert: ${e.message}`); }
  // …and to the course OWNER's Watson room (job #458): held, deduped per batch on the surface. Never awaited,
  // never throws — the chat alert above stands whatever happens to this.
  try {
    require('../../shared/service-notice.cjs').sendServiceNotice({
      course: courseCode, key: `redo:${courseCode}:${metadata.snapshot_batch_id || message}`,
      text: `Redo watchdog: ${message}`,
    })
  } catch { /* best effort */ }
}

/** The latest recorded attempt per snapshot batch, from the last REDO_LOOKBACK_MS, plus batches already given up on. */
async function loadRecordedRedos(ctx, now) {
  const since = new Date(now.getTime() - REDO_LOOKBACK_MS).toISOString();
  const { data, error } = await ctx.supabase.from('orchestrator_messages')
    .select('course_code, metadata, created_at')
    .eq('metadata->>redo_watchdog', WATCHDOG_TAG)
    .gte('created_at', since)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`orchestrator_messages read failed: ${error.message}`);
  const latest = new Map();
  const finished = new Set();
  for (const row of data || []) {
    const m = row.metadata || {};
    if (!m.snapshot_batch_id) continue;
    if (m.action === 'redo_watchdog_alert' && m.final) { finished.add(m.snapshot_batch_id); continue; }
    if (m.action !== 'redo_spawned' && m.action !== 'redo_retry_spawned') continue;
    const prev = latest.get(m.snapshot_batch_id);
    if (!prev || (m.attempt || 1) >= (prev.metadata.attempt || 1)) latest.set(m.snapshot_batch_id, { course_code: row.course_code, metadata: m });
  }
  return [...latest.values()].filter((r) => !finished.has(r.metadata.snapshot_batch_id));
}

/** One pass. Returns a list of { batch, course, action, why } for the log and the test. */
async function sweepRedos(ctx, { now = new Date(), deps = {} } = {}) {
  const spawn = deps.spawnRedoAgent || spawnRedoAgent;
  const restore = deps.restore || restoreViaUndoRoute;
  const alive = deps.isProcessAlive || isProcessAlive;
  const kill = deps.killProcessTree || killProcessTree;
  const altAccount = deps.altAccount || ((spent) => require('../../shared/claude-config.cjs').alternativeAccount({ exclude: spent ? [spent] : [] }));
  const results = [];

  for (const redo of await loadRecordedRedos(ctx, now)) {
    const m = redo.metadata;
    const courseCode = redo.course_code;
    const batch = m.snapshot_batch_id;
    try {
      const { pending, snapshotBySeed } = await pendingSeedsOf(ctx, courseCode, m.seeds || [], batch);
      const mine = Number.isInteger(m.pid) && (!m.machine_name || !ctx.MACHINE_NAME || m.machine_name === ctx.MACHINE_NAME);
      const agentAlive = mine ? alive(m.pid) : null;
      const decision = decideRedoAction({
        attempt: m.attempt || 1,
        pendingSeeds: pending,
        agentAlive,
        ageMs: now.getTime() - Date.parse(m.spawned_at),
        logText: readLogSince(m.log_file, m.log_offset),
        spentAccount: m.account,
        altAccount,
      });
      results.push({ batch, course: courseCode, seeds: pending, ...decision });
      if (decision.action === 'done' || decision.action === 'wait') continue;
      if (decision.kill && mine) await kill(m.pid);

      if (decision.action === 'retry') {
        try {
          await spawn(ctx, { courseCode, seeds: pending, notes: m.notes || '', batchId: batch, attempt: (m.attempt || 1) + 1, excludeAccounts: decision.excludeAccount ? [decision.excludeAccount] : [], why: decision.why });
          opsEventSafe('retry', `${courseCode} seeds ${pending.join(',')}: ${decision.why}`);
          continue;
        } catch (e) {
          decision.why = `${decision.why}; the retry could not start (${e.message})`;
          // fall through to restore — never leave the seed empty
        }
      }

      const restored = [], failed = [];
      for (const n of pending) {
        const id = snapshotBySeed.get(n);
        try {
          if (!id) throw new Error('no snapshot in this batch');
          await restore(ctx, courseCode, id);
          restored.push(n);
        } catch (e) { failed.push(`${n} (${e.message})`); }
      }
      const parts = [`Redo of ${courseCode} seed${pending.length > 1 ? 's' : ''} ${pending.join(', ')} did not submit: ${decision.why}.`];
      if (restored.length) parts.push(`Restored the pre-redo decomposition for seed${restored.length > 1 ? 's' : ''} ${restored.join(', ')} — press Redo again when an agent can run.`);
      if (failed.length) parts.push(`COULD NOT RESTORE ${failed.join('; ')} — these seeds are EMPTY; undo them by hand (POST /api/build/redo-undo/${courseCode}).`);
      await alert(ctx, courseCode, parts.join(' '), { snapshot_batch_id: batch, seeds: pending, restored, failed, outcome: failed.length ? 'restore_failed' : 'restored', final: true });
    } catch (e) {
      console.error(`[REDO-WATCHDOG] ${courseCode} batch ${batch}: ${e.message}`);
      results.push({ batch, course: courseCode, action: 'error', why: e.message });
    }
  }
  return results;
}

/**
 * READ-ONLY census: every seed whose newest snapshot is a redo, not restored, and which is empty right now
 * (decomposed_at null, no LEGOs). Covers redos from before the watchdog existed. Lists; never fixes.
 */
async function findStuckRedoSeeds(ctx, { sinceDays = 120 } = {}) {
  const since = new Date(Date.now() - sinceDays * 86400e3).toISOString();
  const { data: snaps, error } = await ctx.supabase.from(SNAPSHOT_TABLE)
    .select('id, course_code, seed_number, reason, notes, created_at, restored_at, lego_count, phrase_count')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) throw new Error(`snapshot read failed: ${error.message}`);
  const newest = new Map();
  for (const s of snaps || []) {
    const k = `${s.course_code}#${s.seed_number}`;
    if (!newest.has(k)) newest.set(k, s);
  }
  const candidates = [...newest.values()].filter((s) => s.reason === 'redo' && !s.restored_at);
  const byCourse = new Map();
  for (const s of candidates) {
    if (!byCourse.has(s.course_code)) byCourse.set(s.course_code, []);
    byCourse.get(s.course_code).push(s);
  }
  const stuck = [];
  for (const [courseCode, list] of byCourse) {
    const seeds = list.map((s) => s.seed_number);
    const { data: seedRows } = await ctx.supabase.from('course_seeds').select('seed_number, decomposed_at, known_text').eq('course_code', courseCode).in('seed_number', seeds);
    const { data: legoRows } = await ctx.supabase.from('course_legos').select('seed_number').eq('course_code', courseCode).in('seed_number', seeds);
    const withLegos = new Set((legoRows || []).map((r) => r.seed_number));
    const byNum = new Map((seedRows || []).map((r) => [r.seed_number, r]));
    for (const s of list) {
      const row = byNum.get(s.seed_number);
      if (!row || row.decomposed_at || withLegos.has(s.seed_number)) continue;
      stuck.push({ course_code: courseCode, seed_number: s.seed_number, known_text: row.known_text, redo_at: s.created_at, notes: s.notes, snapshot_id: s.id, snapshot_legos: s.lego_count, snapshot_phrases: s.phrase_count });
    }
  }
  return stuck.sort((a, b) => a.course_code.localeCompare(b.course_code) || a.seed_number - b.seed_number);
}

let sweepTimer = null;
let sweeping = false;
function startRedoWatchdog(ctx) {
  if (sweepTimer) return;
  sweepTimer = setInterval(async () => {
    if (sweeping) return;
    sweeping = true;
    try {
      for (const r of await sweepRedos(ctx)) if (r.action !== 'wait' && r.action !== 'done') console.log(`[REDO-WATCHDOG] ${r.course} batch ${r.batch}: ${r.action} — ${r.why}`);
    } catch (e) { console.error(`[REDO-WATCHDOG] sweep failed: ${e.message}`); }
    finally { sweeping = false; }
  }, SWEEP_INTERVAL_MS);
  sweepTimer.unref?.();
  console.log('[REDO-WATCHDOG] started');
}

module.exports = {
  decideRedoAction, preflightRedo, runPreflight, spawnRedoAgent, sweepRedos, findStuckRedoSeeds, startRedoWatchdog,
  WATCHDOG_TAG, REDO_STALL_MS, MAX_ATTEMPTS, OPS_SOURCE,
};
