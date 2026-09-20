#!/usr/bin/env node
/*
 * auto-deploy-prod.cjs — makes "main = served checkout" true by construction.
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

function restartUnit(unit) {
  execFileSync('systemctl', ['--user', 'restart', unit], { stdio: 'pipe' });
  // Give the ExecStartPre syntax guard + startup a moment, then check it held.
  const deadline = Date.now() + 15000;
  let active = false;
  while (Date.now() < deadline) {
    try {
      execFileSync('systemctl', ['--user', 'is-active', '--quiet', unit]);
      active = true;
      break;
    } catch { /* not active yet */ }
    execFileSync('sleep', ['1']);
  }
  return active;
}

(async () => {
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
  if (before === remote) {
    log(`up to date at ${before.slice(0, 7)}`);
    process.exit(0);
  }

  let isAncestor = true;
  try { git(['merge-base', '--is-ancestor', before, remote]); } catch { isAncestor = false; }
  if (!isAncestor) {
    log(`DIVERGED: served checkout at ${before.slice(0, 7)} is not an ancestor of origin/main (${remote.slice(0, 7)}) — cannot fast-forward`);
    await notify(`Auto-deploy: ${PROD_DIR} has diverged from origin/main (${before.slice(0, 7)} vs ${remote.slice(0, 7)}) and cannot be fast-forwarded. This needs a human — never force-resetting a served checkout automatically.`);
    process.exit(0);
  }

  log(`fast-forwarding ${before.slice(0, 7)} → ${remote.slice(0, 7)}`);
  git(['merge', '--ff-only', 'origin/main']);
  const after = git(['rev-parse', 'HEAD']);
  const commits = git(['log', '--oneline', `${before}..${after}`]).split('\n').filter(Boolean);

  // REBUILD_FRONTEND: nothing to do here today — the Vue/Vite dashboard is a
  // Vercel SPA that deploys itself on push to main and is never served from
  // this checkout's dist/. If that changes, rebuild it here before restarting
  // the units below, not after.

  const results = {};
  for (const unit of UNITS) {
    results[unit] = restartUnit(unit);
  }
  const failed = Object.entries(results).filter(([, ok]) => !ok).map(([u]) => u);

  log(`deployed ${before.slice(0, 7)}→${after.slice(0, 7)} (${commits.length} commit(s)); restarted ${UNITS.join(', ')}; failed=${failed.join(',') || 'none'}`);

  const lines = [
    `Auto-deploy: origin/main advanced (${before.slice(0, 7)} → ${after.slice(0, 7)}, ${commits.length} commit${commits.length === 1 ? '' : 's'}). Served checkout fast-forwarded.`,
    ...commits.slice(0, 10).map((c) => `  ${c}`),
    '',
    failed.length
      ? `${failed.join(', ')} did NOT come back active after restart — needs a look now, not tomorrow.`
      : `${UNITS.join(', ')} restarted and active.`,
  ];
  await notify(lines.join('\n'));

  process.exit(failed.length ? 2 : 0);
})();
