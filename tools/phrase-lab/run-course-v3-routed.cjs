#!/usr/bin/env node
/**
 * RUN THE v3 COURSE RUNNER ACROSS THE ACCOUNT POOLS ROUTING CHOOSES.
 *
 * `run-course-v3.cjs` spends whichever pool SSI_CLAUDE_CONFIG_DIR names (the
 * builder default is account-3). Tom, 2026-09-27: "Do not pin … let routing
 * choose (soonest-resetting pool first)". So this driver does not pick an
 * account — it asks the command surface's resolver order
 * (GET /api/accounts/routing → urgencyOrder.all, the drain-priority ladder) and
 * takes the open pools in that order, re-asking before every chunk, so a
 * change in the ladder (a reset, a human arriving, #412's fix) is obeyed
 * mid-run rather than at launch.
 *
 * The unit of work is a SEED CHUNK handed to the existing runner as a child
 * process with that pool's config dir — same generator, same gates, same
 * on-disk layout, same resume-by-file-exists. A child exiting 3 means its pool
 * stopped serving (POOL_EXHAUSTED_EXIT): the pool is dropped for the rest of
 * the run and the chunk goes back on the queue for the next pool. Any other
 * non-zero exit re-queues the chunk once, then ends the run — that is the
 * environment (Supabase, the box), not a pool, and racing on would repeat the
 * 2026-09-21 "RUN COMPLETE having generated nothing".
 *
 * PARALLELISM: up to --pools pools at once, each running one child at
 * --per-pool concurrency. Total in flight = pools × per-pool. The safe figures
 * come from the measured ramp, not from assumption.
 *
 * --box-target N: THE BOX IS THE LIMIT, NOT THE TOKENS (Tom, 2026-09-27: aim
 * for close to 12 workers in play box-wide). Before each chunk the driver
 * counts every `claude` process on the machine, subtracts the ones its own
 * lanes are running, and gives the chunk only what is left of N (at least 1,
 * at most --per-pool). Other people's workers arriving shrink this run; their
 * leaving grows it back, chunk by chunk.
 *
 * WRITES NOTHING TO THE DATABASE. Needs CS_CONV_TOKEN in the environment to
 * read the routing ladder.
 *
 *   CS_CONV_TOKEN=… node tools/phrase-lab/run-course-v3-routed.cjs ita_for_eng \
 *     --from 11 --to 668 --out <candidates-dir> --pools 3 --per-pool 8 --chunk 6
 */
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { POOL_EXHAUSTED_EXIT } = require('./run-course-v3.cjs');

const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i === -1 ? d : process.argv[i + 1]; };
const SURFACE = process.env.CS_SURFACE || 'http://localhost:4317';

/** The resolver's own order, open pools only. Never a list maintained here. */
async function routedPools() {
  const res = await fetch(`${SURFACE}/api/accounts/routing`, { headers: { 'x-cs-conv': process.env.CS_CONV_TOKEN || '' } });
  if (!res.ok) throw new Error(`routing ladder unreadable: HTTP ${res.status}`);
  const j = await res.json();
  return (j.urgencyOrder?.all || []).filter((a) => a.open && !a.heldForHuman).map((a) => a.name);
}

/** Seed chunks over [from, to]. */
function chunks(from, to, size) {
  const out = [];
  for (let s = from; s <= to; s += size) out.push([s, Math.min(to, s + size - 1)]);
  return out;
}

async function main() {
  const course = process.argv[2];
  const from = +arg('--from'); const to = +arg('--to');
  const out = arg('--out');
  const pools = +arg('--pools', 1); const perPool = +arg('--per-pool', 2); const size = +arg('--chunk', 6);
  if (!course || !from || !to || !out) { console.error('usage: <course> --from N --to M --out <dir> [--pools K --per-pool P --chunk S]'); process.exit(2); }
  const accountsDir = path.join(os.homedir(), '.cs-accounts');
  const logPath = path.join(out, 'routed-log.jsonl');
  fs.mkdirSync(out, { recursive: true });

  const queue = chunks(from, to, size);
  const exhausted = new Set();
  const busy = new Set();
  const retried = new Set();
  let fatal = null;
  const boxTarget = +arg('--box-target', 0);
  let mine = 0; // claude processes this driver's lanes have in flight

  /** claude processes descended from this driver, counted from the process table (not from intent). */
  function myClaudeCount() {
    let rows = [];
    try { rows = execFileSync('ps', ['-eo', 'pid=,ppid=,comm=']).toString().trim().split('\n').map((l) => l.trim().split(/\s+/)); } catch { return 0; }
    const kids = new Map();
    for (const [pid, ppid] of rows) (kids.get(ppid) || kids.set(ppid, []).get(ppid)).push(pid);
    const comm = new Map(rows.map(([pid, , c]) => [pid, c]));
    let n = 0; const stack = [String(process.pid)];
    while (stack.length) { const p = stack.pop(); for (const k of kids.get(p) || []) { if (comm.get(k) === 'claude') n += 1; stack.push(k); } }
    return n;
  }

  /**
   * Workers this chunk may use: what is left of the box target after EVERY
   * claude process on the box — other people's, and this driver's own already
   * running — and the workers other lanes have reserved but not yet spawned.
   */
  function chunkConcurrency() {
    if (!boxTarget) return perPool;
    let all = 0;
    try { all = Number(execFileSync('pgrep', ['-c', '-x', 'claude']).toString().trim()) || 0; } catch { all = 0; }
    const running = myClaudeCount();
    const others = Math.max(0, all - running);
    // Reserved = what the lanes asked for; whichever is larger of reserved and running is ours.
    return Math.max(1, Math.min(perPool, boxTarget - others - Math.max(mine, running)));
  }

  async function lane() {
    for (;;) {
      if (fatal || !queue.length) return;
      let order;
      try { order = await routedPools(); } catch (e) { fatal = e.message; return; }
      const pool = order.find((a) => !exhausted.has(a) && !busy.has(a) && fs.existsSync(path.join(accountsDir, a)));
      if (!pool) return; // no free open pool for this lane — the other lanes carry on
      const chunk = queue.shift();
      if (!chunk) return;
      busy.add(pool);
      const conc = chunkConcurrency();
      mine += conc;
      const started = Date.now();
      const rc = await new Promise((resolve) => {
        const child = spawn(process.execPath, [path.join(__dirname, 'run-course-v3.cjs'), course,
          '--from', String(chunk[0]), '--to', String(chunk[1]), '--out', out, '--concurrency', String(conc),
          ...(process.argv.includes('--deal') ? ['--deal'] : []),
          ...(arg('--view') ? ['--view', arg('--view')] : []),
          ...(arg('--view-before') ? ['--view-before', arg('--view-before')] : [])],
        { env: { ...process.env, SSI_CLAUDE_CONFIG_DIR: path.join(accountsDir, pool) }, stdio: ['ignore', 'inherit', 'inherit'] });
        child.on('exit', (code) => resolve(code ?? 1));
      });
      busy.delete(pool);
      mine -= conc;
      fs.appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), pool, seeds: chunk, conc, rc, secs: Math.round((Date.now() - started) / 1000) }) + '\n');
      console.log(`=== seeds ${chunk[0]}-${chunk[1]} on ${pool} x${conc} rc=${rc} in ${Math.round((Date.now() - started) / 1000)}s`);
      if (rc === POOL_EXHAUSTED_EXIT) { exhausted.add(pool); queue.unshift(chunk); continue; }
      if (rc !== 0) {
        const k = chunk.join('-');
        if (retried.has(k)) { fatal = `seeds ${k} failed twice (rc ${rc})`; return; }
        retried.add(k); queue.push(chunk);
      }
    }
  }

  await Promise.all(Array.from({ length: pools }, lane));
  console.log(fatal ? `=== STOPPED: ${fatal}` : queue.length ? `=== STOPPED: no open pool left (${[...exhausted].join(', ')} exhausted), ${queue.length} chunks unrun` : '=== RUN COMPLETE');
  if (fatal || queue.length) process.exitCode = 1;
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { chunks };
