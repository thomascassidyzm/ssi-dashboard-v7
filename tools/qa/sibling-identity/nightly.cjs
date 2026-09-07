#!/usr/bin/env node
/*
 * nightly.cjs — the scheduled leg of the sibling-identity check.
 *
 * Follows the nightly doctrine on watson-1 (~/command-surface/ops/ci-run.sh and
 * tools/qa/voice-variety/nightly.cjs): QUIET IS SILENT, A RISE IS LOUD, AND A
 * NIGHT IT CANNOT RUN IS LOUD TOO.
 *
 * A night where nothing went up writes its snapshot and says nothing. A night
 * where any assertion's collision count ROSE posts one plain-English notice into
 * the Popty project channel, because a rise means somebody authored a variant
 * identical to its sibling — a row that fails its own definition and that every
 * count-based and null-based audit will pass. A night it cannot run says so,
 * because a check that silently stops running is worse than no check: it is a
 * check everyone believes.
 *
 * A FALL IS SILENT AND IS NOT AN ALARM — collisions falling means somebody
 * repaired one, which is the point.
 *
 * It repairs nothing. Which words replace a duplicated flow is a dialect and
 * register call, per case, and is nobody else's to make.
 *
 *   node tools/qa/sibling-identity/nightly.cjs [--no-notice] [--force-notice]
 *
 * Exit codes: 0 ran, 2 could not run (or could not calibrate).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const check = require('./check.cjs');

const SURFACE = process.env.CS_SURFACE || 'http://localhost:4317';
const STATE = process.env.SIBLING_IDENTITY_STATE || '/home/tomcassidy/.local/state/ssi-sibling-identity';
const LOG = process.env.SIBLING_IDENTITY_LOG || '/home/tomcassidy/.local/log/ssi-sibling-identity.log';
const CHANNEL_CWD = '/home/tomcassidy/SSi/ssi-dashboard-v7-clean';

const noNotice = process.argv.includes('--no-notice');
const forceNotice = process.argv.includes('--force-notice');

function log(s) {
  const line = `${new Date().toISOString()} ${s}\n`;
  try { fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.appendFileSync(LOG, line); } catch { /* the console line below is the floor */ }
  process.stdout.write(line);
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

const assertionKey = (a) => `${a.key}|${a.asserted_fields.join('+')}`;

/**
 * A RISE is the alarm. So is a shape that has gone UNKNOWN since last night: a
 * new variant-bearing table nobody has ruled on is exactly what this check exists
 * to surface, and it would otherwise sit quietly in the JSON forever.
 */
function delta(prev, cur) {
  if (!prev) return null;
  const before = new Map((prev.assertions || []).map((a) => [assertionKey(a), a.collisions]));
  const risen = (cur.assertions || [])
    .map((a) => ({ key: assertionKey(a), was: before.has(assertionKey(a)) ? before.get(assertionKey(a)) : null, now: a.collisions, a }))
    .filter((d) => d.was === null ? d.now > 0 : d.now > d.was);
  const knownUnknowns = new Set((prev.unknown || []).map((u) => u.key));
  const newUnknowns = (cur.unknown || []).filter((u) => !knownUnknowns.has(u.key));
  return { risen, newUnknowns, alarm: risen.length > 0 || newUnknowns.length > 0 };
}

function notice(s) {
  const d = s.delta;
  const L = [];
  L.push(d
    ? 'A variant went byte-identical to its sibling overnight — a row that fails its own definition, and one no count-based or null-based audit will ever flag.'
    : 'First night of the sibling-identity check — this is the baseline, nothing to compare it against yet.');
  L.push('');
  L.push(`${s.totals.collisions} sibling collisions across ${s.totals.assertions} assertions and ${s.totals.sibling_groups} sibling groups.`);
  for (const r of d ? d.risen : s.assertions.filter((a) => a.collisions)) {
    const a = r.a || r;
    L.push('');
    L.push(`${a.table}.${a.asserted_fields.join('+')} — ${r.was === undefined ? a.collisions : `${r.was} → ${r.now}`}`);
    for (const e of (a.examples || []).slice(0, 6)) L.push(`  ${e.ids.join(' = ')}`);
  }
  if (d && d.newUnknowns.length) {
    L.push('');
    L.push('New sibling shapes nobody has ruled on — do these have to differ?');
    for (const u of d.newUnknowns) L.push(`  ${u.key}`);
  }
  L.push('');
  L.push('Nothing has been repaired and nothing should be swept: which words replace a duplicated flow is a dialect and register call, per case.');
  L.push(`Full report: ${s.snapshot_file} — or re-run it with \`node tools/qa/sibling-identity/check.cjs\`.`);
  return L.join('\n');
}

(async () => {
  let snap;
  try {
    snap = await check.main(['node', 'check', '--quiet']);
    if (!snap.calibration.ok) throw new Error(`calibration failed — ${snap.calibration.why}`);
  } catch (e) {
    log(`CANNOT-RUN: ${e.message}`);
    if (!noNotice) {
      try {
        const ch = await channel();
        if (ch) await api('POST', '/api/reply', { jobId: ch.convId, automated: true, text: `The nightly sibling-identity check could not run tonight: ${e.message}. The numbers you last saw are stale until this is fixed.` });
      } catch (e2) { log(`notice FAILED: ${e2.message}`); }
    }
    process.exit(2);
  }

  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(path.join(STATE, 'latest.json'), 'utf8')); } catch { /* first night */ }
  snap.delta = delta(prev, snap);

  fs.mkdirSync(STATE, { recursive: true });
  const file = path.join(STATE, `${snap.generated_at.slice(0, 10)}.json`);
  snap.snapshot_file = file;
  fs.writeFileSync(file, JSON.stringify(snap, null, 2));
  fs.writeFileSync(path.join(STATE, 'latest.json'), JSON.stringify(snap, null, 2));

  log(`ran: ${snap.totals.collisions} collisions over ${snap.totals.assertions} assertions`
    + (snap.delta ? `, ${snap.delta.risen.length} risen, ${snap.delta.newUnknowns.length} new unknown shapes` : ', baseline'));

  const rose = !!(snap.delta && snap.delta.alarm);
  if (!rose && !forceNotice) { log('quiet — nothing went up, silent by design'); return; }
  if (noNotice) { log('rose, but --no-notice given'); return; }

  try {
    const ch = await channel();
    if (!ch) { log(`no project channel for ${CHANNEL_CWD} — notice NOT delivered:\n${notice(snap)}`); return; }
    await api('POST', '/api/reply', { jobId: ch.convId, automated: true, text: notice(snap) });
    log('notice posted to the Popty channel');
  } catch (e) { log(`notice FAILED: ${e.message}\n${notice(snap)}`); }
})();
