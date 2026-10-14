#!/usr/bin/env node
/*
 * auto-deploy-prod.cjs — makes "main = served checkout" true by construction.
 * (Proof commit, job #396: a trivial line for the timer alone to deploy.)
 *
 * Tom, 2026-09-20, after the Voice Lab fix sat merged on origin/main for hours
 * while the served checkout (ssi-dashboard-v7-clean-prod) stayed behind it:
 * "main = served checkout isn't it?" It wasn't, until this. Polled every 2
 * minutes by a systemd --user timer (ops/systemd/ssi-auto-deploy.timer) rather
 * than a webhook, because a poll needs nothing listening on a port and nothing
 * to secure — Tom's call, simpler than a webhook on this box.
 *
 * Each tick: fetch origin/main, and if the served checkout is clean and behind
 * and a true fast-forward (never diverged), fast-forward it and restart the
 * three units that run out of it. A dirty tree is never touched — it is
 * somebody's in-progress work — and posts one line to the Popty project
 * channel so it doesn't sit silently stale. QUIET IS SILENT, A CHANGE IS LOUD
 * (the same doctrine as tools/round-index/nightly.cjs): an up-to-date tick
 * writes one log line and says nothing; a real deploy, a dirty-skip, or a
 * diverged/failed unit posts to the channel.
 *
 * The frontend (Vue/Vite) is NOT served from this checkout — it is a Vercel
 * SPA that deploys itself on push to main (see src/views/admin/voicelab/
 * labApi.js's header comment and vercel.json's rewrites). Nothing here builds
 * dist/; if that ever changes and a local process starts serving it, add the
 * rebuild step where REBUILD_FRONTEND is marked below rather than running an
 * unused `vite build` on every tick for no server that reads it.
 *
 *   node tools/deploy/auto-deploy-prod.cjs [--once] [--no-notice]
 *
 * Exit codes: 0 ran (whether or not it deployed), 2 could not run at all.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROD_DIR = '/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod';
const UNITS = ['popty-production-api', 'popty-course-builder-api', 'popty-phase8-audio'];
const SURFACE = process.env.CS_SURFACE || 'http://localhost:4317';
const CHANNEL_CWD = '/home/tomcassidy/SSi/ssi-dashboard-v7-clean';
const LOG = process.env.AUTO_DEPLOY_LOG || '/home/tomcassidy/.local/log/ssi-auto-deploy.log';
const DIRTY_MARK = '/home/tomcassidy/.local/log/ssi-auto-deploy.dirty-notice';
// Written ONLY after every unit in UNITS comes back active. Read on the next
// tick as "what HEAD is actually live", never inferred from git alone — see
// the pure functions below for why comparing HEAD to origin/main was the bug.
const DEPLOYED_MARK = process.env.AUTO_DEPLOY_DEPLOYED_MARK || '/home/tomcassidy/.local/log/ssi-auto-deploy.deployed-sha';
// Dedup for the "still down" notice: only speak when the failing SET changes.
const FAILED_MARK = process.env.AUTO_DEPLOY_FAILED_MARK || '/home/tomcassidy/.local/log/ssi-auto-deploy.failed-units';

/*
 * ── Pure decision logic (the part a test can hold still) ───────────────────
 *
 * The bug this replaces: the old tick compared HEAD to origin/main and did
 * nothing at all once they matched — including on every tick after a restart
 * had silently failed. A failed unit stayed down forever because nothing
 * downstream of "up to date" ever looked at systemctl again. These three
 * functions are the fix, kept pure so the logic is provable without a git
 * checkout, a systemd user session, or a network call.
 */

/** True once every named unit answered `systemctl is-active` truthy. */
function allActive (activeByUnit) {
  return Object.values(activeByUnit).every(Boolean);
}

/**
 * Which units to (re)start this tick, given what's active RIGHT NOW.
 *
 * - HEAD has moved past what we last recorded as fully deployed → this is a
 *   fresh deploy; restart everything, regardless of current health, because
 *   a unit that happens to be "active" is still running the OLD code.
 * - HEAD matches the last fully-deployed marker → nothing moved, so only
 *   retry whichever units are not currently active.
 */
function unitsToRestart (headSha, deployedSha, activeByUnit) {
  const units = Object.keys(activeByUnit);
  if (deployedSha !== headSha) return units;
  return units.filter((u) => !activeByUnit[u]);
}

/**
 * The marker value to write for this tick. Advances to HEAD only when every
 * unit is active afterwards; otherwise stays at whatever it was, so a still-
 * failing unit is retried again next tick instead of being marked done.
 */
function nextDeployedSha (headSha, deployedSha, activeByUnitAfter) {
  return allActive(activeByUnitAfter) ? headSha : deployedSha;
}

const noNotice = process.argv.includes('--no-notice');

function log(s) {
  const line = `${new Date().toISOString()} ${s}\n`;
  try { fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.appendFileSync(LOG, line); } catch { /* the console line below is the floor */ }
  process.stdout.write(line);
}

function git(args) {
  return execFileSync('git', args, { cwd: PROD_DIR, encoding: 'utf8' }).trim();
}

async function api(method, route, body) {
  const r = await fetch(SURFACE + route, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${route} → ${r.status} ${t.slice(0, 200)}`);
  try { return JSON.parse(t); } catch { return t; }
}

async function channel() {
  const raw = await api('GET', '/api/channels');
  const list = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.channels) ? raw.channels : []);
  return list.find((c) => c.cwd === CHANNEL_CWD) || null;
}

async function notify(text) {
  if (noNotice) { log(`--no-notice given, not posting:\n${text}`); return; }
  try {
    const ch = await channel();
    if (!ch) { log(`no project channel for ${CHANNEL_CWD} — notice NOT delivered:\n${text}`); return; }
    await api('POST', '/api/reply', { jobId: ch.convId, automated: true, text });
    log('notice posted to the Popty channel');
  } catch (e) { log(`notice FAILED: ${e.message}\n${text}`); }
}

function isActive(unit) {
  try { execFileSync('systemctl', ['--user', 'is-active', '--quiet', unit]); return true; }
  catch { return false; }
}

function restartUnit(unit) {
  execFileSync('systemctl', ['--user', 'restart', unit], { stdio: 'pipe' });
  // Give the ExecStartPre syntax guard + startup a moment, then check it held.
  const deadline = Date.now() + 15000;
  let active = false;
  while (Date.now() < deadline) {
    if (isActive(unit)) { active = true; break; }
    execFileSync('sleep', ['1']);
  }
  return active;
}

function readMark(file) {
  try { return fs.readFileSync(file, 'utf8').trim() || null; } catch { return null; }
}

function writeMark(file, value) {
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, value); }
  catch (e) { log(`could not write ${file}: ${e.message}`); }
}

function clearMark(file) {
  try { fs.unlinkSync(file); } catch { /* nothing to clear */ }
}

async function main() {
  let status;
  try {
    git(['fetch', 'origin', 'main']);
    status = git(['status', '--porcelain']);
  } catch (e) {
    log(`CANNOT-RUN: ${e.message}`);
    await notify(`Auto-deploy could not run tonight: ${e.message}. The served checkout is as stale as whenever it last ran.`);
    process.exit(2);
  }

  if (status) {
    const files = status.split('\n').slice(0, 8).join('; ');
    const digest = require('crypto').createHash('sha1').update(status).digest('hex');
    log(`SKIP: served checkout is dirty — ${files}`);
    let already = null;
    try { already = fs.readFileSync(DIRTY_MARK, 'utf8').trim(); } catch { /* first time */ }
    if (already !== digest) {
      await notify(`Auto-deploy: skipped this tick — ${PROD_DIR} has uncommitted changes (${files}). Not touching it; will pick up as soon as it's clean.`);
      try { fs.mkdirSync(path.dirname(DIRTY_MARK), { recursive: true }); fs.writeFileSync(DIRTY_MARK, digest); } catch { /* best effort */ }
    } else {
      log('same dirty state as last notice — staying quiet');
    }
    process.exit(0);
  }
  // Clean — clear any stale dirty-notice marker so the next real dirty spell notices fresh.
  try { fs.unlinkSync(DIRTY_MARK); } catch { /* nothing to clear */ }

  const before = git(['rev-parse', 'HEAD']);
  const remote = git(['rev-parse', 'origin/main']);
  let after = before;
  let commits = [];

  if (before !== remote) {
    let isAncestor = true;
    try { git(['merge-base', '--is-ancestor', before, remote]); } catch { isAncestor = false; }
    if (!isAncestor) {
      log(`DIVERGED: served checkout at ${before.slice(0, 7)} is not an ancestor of origin/main (${remote.slice(0, 7)}) — cannot fast-forward`);
      await notify(`Auto-deploy: ${PROD_DIR} has diverged from origin/main (${before.slice(0, 7)} vs ${remote.slice(0, 7)}) and cannot be fast-forwarded. This needs a human — never force-resetting a served checkout automatically.`);
      process.exit(0);
    }

    log(`fast-forwarding ${before.slice(0, 7)} → ${remote.slice(0, 7)}`);
    git(['merge', '--ff-only', 'origin/main']);
    after = git(['rev-parse', 'HEAD']);
    commits = git(['log', '--oneline', `${before}..${after}`]).split('\n').filter(Boolean);
  }

  // REBUILD_FRONTEND: nothing to do here today — the Vue/Vite dashboard is a
  // Vercel SPA that deploys itself on push to main and is never served from
  // this checkout's dist/. If that changes, rebuild it here before restarting
  // the units below, not after.

  // Comparing HEAD to origin/main (the old check) only ever notices a NEW
  // commit — a restart that failed on a HEAD we've already seen went
  // unnoticed forever. Compare instead to the last HEAD we know every unit
  // came up healthy for, and re-derive what's active right now regardless.
  const deployedSha = readMark(DEPLOYED_MARK);
  const activeBefore = Object.fromEntries(UNITS.map((u) => [u, isActive(u)]));
  const toRestart = unitsToRestart(after, deployedSha, activeBefore);

  const activeAfter = { ...activeBefore };
  for (const unit of toRestart) activeAfter[unit] = restartUnit(unit);
  const failed = UNITS.filter((u) => !activeAfter[u]);

  const newDeployedSha = nextDeployedSha(after, deployedSha, activeAfter);
  if (newDeployedSha !== deployedSha) writeMark(DEPLOYED_MARK, newDeployedSha);

  if (after === before && toRestart.length === 0) {
    log(`up to date and healthy at ${after.slice(0, 7)}`);
    process.exit(0);
  }

  log(
    `${after === before ? 'no new commit' : `deployed ${before.slice(0, 7)}→${after.slice(0, 7)} (${commits.length} commit(s))`}; ` +
    `${toRestart.length ? `restarted ${toRestart.join(', ')}` : 'no restart needed'}; failed=${failed.join(',') || 'none'}`
  );

  // Dedup the "still down" notice on the failing SET, not on the tick — a
  // unit that stays down for an hour gets one line, not thirty.
  const failedDigest = failed.slice().sort().join(',');
  const lastFailedDigest = readMark(FAILED_MARK);
  if (failed.length) {
    if (failedDigest !== lastFailedDigest) {
      writeMark(FAILED_MARK, failedDigest);
      const lines = after === before
        ? [`Auto-deploy: ${failed.join(', ')} still not active at ${after.slice(0, 7)} — retried this tick and it's still down. Needs a look now, not tomorrow.`]
        : [
            `Auto-deploy: origin/main advanced (${before.slice(0, 7)} → ${after.slice(0, 7)}, ${commits.length} commit${commits.length === 1 ? '' : 's'}). Served checkout fast-forwarded.`,
            ...commits.slice(0, 10).map((c) => `  ${c}`),
            '',
            `${failed.join(', ')} did NOT come back active after restart — needs a look now, not tomorrow. Will keep retrying every tick.`,
          ];
      await notify(lines.join('\n'));
    } else {
      log(`same failing set (${failedDigest}) as last notice — retried quietly`);
    }
  } else {
    if (lastFailedDigest) clearMark(FAILED_MARK);
    if (after !== before) {
      const lines = [
        `Auto-deploy: origin/main advanced (${before.slice(0, 7)} → ${after.slice(0, 7)}, ${commits.length} commit${commits.length === 1 ? '' : 's'}). Served checkout fast-forwarded.`,
        ...commits.slice(0, 10).map((c) => `  ${c}`),
        '',
        `${UNITS.join(', ')} restarted and active.`,
      ];
      await notify(lines.join('\n'));
    } else if (lastFailedDigest) {
      await notify(`Auto-deploy: ${toRestart.join(', ')} came back active on retry at ${after.slice(0, 7)}. All clear.`);
    }
  }

  process.exit(failed.length ? 2 : 0);
}

if (require.main === module) main();

module.exports = { allActive, unitsToRestart, nextDeployedSha };
