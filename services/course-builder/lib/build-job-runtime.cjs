/**
 * Build job runtime — the I/O half of job #482's stop-reason work: is the builder process
 * alive, kill it, read this run's slice of its log, and write how the job ended.
 * The decisions are in build-stop-reason.cjs (pure, tested); this file applies them.
 *
 * Every headless spawn records, in build_jobs.metadata:
 *   pid         the detached `bash -c` that runs claude; detached ⇒ it leads its own
 *               process group, so -pid reaches claude, its subagents and their tools
 *   log_file    the appended per-course log (logs/<Label>-<course>.log)
 *   log_offset  the log's size before this run, so a finished run is judged on ITS
 *               output only — the fry log holds three runs, and run 1's background-kill
 *               line would otherwise colour every later run
 *   account     the SSi Claude account the spawn billed (claude@ or kai-gmail)
 */

const fs = require('fs');
const { execFileSync } = require('child_process');
const { classifyBuildExit, describeStop } = require('./build-stop-reason.cjs');

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 1) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

/** Every descendant pid of `root` (from `ps`), deepest last. */
function descendants(root) {
  let out = '';
  try { out = execFileSync('ps', ['-e', '-o', 'pid=,ppid='], { encoding: 'utf8' }); } catch { return []; }
  const kids = new Map();
  for (const line of out.split('\n')) {
    const [p, pp] = line.trim().split(/\s+/).map(Number);
    if (!p) continue;
    if (!kids.has(pp)) kids.set(pp, []);
    kids.get(pp).push(p);
  }
  const found = [];
  const stack = [root];
  while (stack.length) {
    for (const k of kids.get(stack.pop()) || []) { found.push(k); stack.push(k); }
  }
  return found;
}

/**
 * Kill the orchestrator and everything under it. SIGTERM to the process group and to every
 * descendant (a tool may have started its own group), then SIGKILL whatever is left after
 * `graceMs`. Resolves to { killed: [pids], survivors: [pids] }.
 */
async function killProcessTree(pid, { graceMs = 5000 } = {}) {
  if (!isProcessAlive(pid)) return { killed: [], survivors: [], wasAlive: false };
  const tree = [pid, ...descendants(pid)];
  const signal = (sig) => {
    try { process.kill(-pid, sig); } catch { /* not a group leader, or already gone */ }
    for (const p of tree) { try { process.kill(p, sig); } catch { /* gone */ } }
  };
  signal('SIGTERM');
  const deadline = Date.now() + graceMs;
  while (Date.now() < deadline && tree.some(isProcessAlive)) await new Promise((r) => setTimeout(r, 200));
  if (tree.some(isProcessAlive)) signal('SIGKILL');
  await new Promise((r) => setTimeout(r, 200));
  return { killed: tree, survivors: tree.filter(isProcessAlive), wasAlive: true };
}

/** This run's output: the log from `offset` on, capped to the last `maxBytes`. */
function readLogSince(file, offset = 0, maxBytes = 256 * 1024) {
  if (!file) return '';
  try {
    const size = fs.statSync(file).size;
    const start = Math.max(Number(offset) || 0, size - maxBytes, 0);
    if (start >= size) return '';
    const fd = fs.openSync(file, 'r');
    try {
      const buf = Buffer.alloc(size - start);
      fs.readSync(fd, buf, 0, buf.length, start);
      return buf.toString('utf8');
    } finally { fs.closeSync(fd); }
  } catch { return ''; }
}

/** Is this job's recorded process ours to check (same machine, pid known)? */
function ownsPid(ctx, job) {
  const pid = job?.metadata?.pid;
  return Number.isInteger(pid) && (!job.machine_name || !ctx.MACHINE_NAME || job.machine_name === ctx.MACHINE_NAME);
}

/**
 * Write how a job ended. Called by /build/job-done (the shell wrapper, with the exit code)
 * and by the liveness sweep (process vanished, exit code unknown). Only acts on a job that
 * is still running/stalled, so a human Stop already recorded is never overwritten.
 * `decideResume(job, outcome)` (optional) returns an auto_resume block for usage-limit stops.
 */
async function finalizeJob(ctx, job, { exitCode = null, now = new Date(), reasonIfSilent = null, decideResume = null } = {}) {
  if (!job || !['running', 'stalled'].includes(job.status)) return { ok: true, already: job?.status };
  const meta = job.metadata || {};
  const logText = readLogSince(meta.log_file, meta.log_offset);
  let completed = 0, total = job.total_seeds || 0;
  try {
    const p = await require('./build-manager.cjs').getBuildProgress(ctx, job.course_code);
    completed = p.completed || 0;
    total = job.total_seeds || p.total || 0;
  } catch { /* progress unknown → classify as not finished */ }

  let outcome = classifyBuildExit({ logText, exitCode, completed, total, pass: job.pass, now });
  if (reasonIfSilent && outcome.stop_reason === 'ended_early') outcome = { ...outcome, stop_reason: reasonIfSilent };

  const newMeta = {
    ...meta,
    stop_reason: outcome.stop_reason,
    exit_code: exitCode,
    seeds_at_stop: completed,
    detail: outcome.detail || null,
    reset_at: outcome.reset_at || null,
    usage_limit: outcome.limit || null,
  };
  if (outcome.stop_reason === 'usage_limit' && typeof decideResume === 'function') {
    newMeta.auto_resume = decideResume({ ...job, metadata: newMeta }, outcome, now);
  }
  const update = {
    status: outcome.status,
    completed_at: now.toISOString(),
    seeds_completed: completed,
    metadata: newMeta,
    error_message: outcome.status === 'complete' ? null : (outcome.detail || outcome.stop_reason),
  };
  // Conditional on status so a Stop that lands between our read and this write wins.
  await ctx.supabase.from('build_jobs').update(update).eq('id', job.id).in('status', ['running', 'stalled']);
  const finished = { ...job, ...update };
  return { ok: true, outcome, job: finished, message: describeStop(finished, { completed, now }) };
}

module.exports = { isProcessAlive, killProcessTree, readLogSince, finalizeJob, ownsPid, descendants };
