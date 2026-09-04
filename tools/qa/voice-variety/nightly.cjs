#!/usr/bin/env node
/*
 * nightly.cjs — the scheduled leg of both voice-variety checks.
 *
 * Runs check 1 (a voice speaking a variety the course does not claim) and
 * check 2 (two counts that must agree), keeps one snapshot per night, and
 * follows the nightly-CI doctrine on watson-1 (~/command-surface/ops/ci-run.sh):
 * QUIET IS SILENT, A RISE IS LOUD, AND A NIGHT IT CANNOT RUN IS LOUD TOO.
 *
 * A night where nothing went up writes its snapshot and says nothing. A night
 * where either count rose posts ONE plain-English notice into the Popty project
 * channel, because a rise means somebody cast a voice or wrote audio that makes
 * a claim about content it does not own. A night it cannot run says so, because
 * a check that silently stops running is worse than no check: it is a check
 * everyone believes.
 *
 * It recasts nothing, renders nothing, deletes nothing.
 *
 *   node tools/qa/voice-variety/nightly.cjs [--no-notice] [--force-notice]
 *
 * Exit codes: 0 ran, 2 could not run (or could not calibrate). A rise is NOT a
 * failure exit — same rule as ci-run.sh: the snapshot is what you read.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const variety = require('./check-voice-variety.cjs');
const counts = require('./count-reconciliation.cjs');

const SURFACE = process.env.CS_SURFACE || 'http://localhost:4317';
const STATE = process.env.VOICE_VARIETY_STATE || '/home/tomcassidy/.local/state/ssi-voice-variety';
const LOG = process.env.VOICE_VARIETY_LOG || '/home/tomcassidy/.local/log/ssi-voice-variety.log';
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

/**
 * A RISE is the alarm, in either check. A fall is good news and is silent — the
 * snapshot records it and nobody's phone buzzes about a number going down.
 *
 * The COLLISION count rises too: one voice cast across two varieties of a
 * language is a claim to be native to both, and at most one of those can be
 * true. It needs no locale, which is why it can convict Cartesia voices that
 * `judge` can only call UNKNOWN.
 */
function delta(prev, cur) {
  if (!prev) return null;
  const d = {
    mismatches: cur.variety.totals.mismatches - (prev.variety.totals.mismatches || 0),
    collisions: cur.variety.totals.collisions - (prev.variety.totals.collisions || 0),
    failures: cur.counts.totals.failures - (prev.counts.totals.failures || 0),
  };
  const before = new Set((prev.variety.mismatches || []).map((f) => `${f.course_code}|${f.layer}|${f.role}|${f.voice_id}`));
  d.new_mismatches = (cur.variety.mismatches || []).filter((f) => !before.has(`${f.course_code}|${f.layer}|${f.role}|${f.voice_id}`));
  d.alarm = d.mismatches > 0 || d.collisions > 0 || d.failures > 0;
  return d;
}

function notice(s) {
  const d = s.delta;
  const L = [];
  L.push(d
    ? 'A voice started making a claim about content it does not own — the standing count went UP overnight.'
    : 'First night of the voice-variety count — this is the baseline, nothing to compare it against yet.');
  L.push('');
  L.push(`${s.variety.totals.mismatches} target-side variety mismatches across ${s.variety.totals.mismatch_courses} courses; ${s.variety.totals.collisions} voices cast across two or more varieties of one language; ${s.counts.totals.failures} count-reconciliation failures.`);
  if (d && d.new_mismatches.length) {
    L.push('');
    L.push('New since last night:');
    for (const f of d.new_mismatches.slice(0, 12)) L.push(`  ${f.course_code} ${f.role} — ${f.sentence}`);
    if (d.new_mismatches.length > 12) L.push(`  …and ${d.new_mismatches.length - 12} more.`);
  }
  L.push('');
  L.push('Target-side audio must be native to the variety the course claims to teach (Tom, 2026-09-03). Which native voice replaces a wrong one is a taste call and is nobody else\'s to make — this only says which pairings are false.');
  L.push('');
  L.push(`Full breakdown: ${s.snapshot_file} — or re-run it with \`node tools/qa/voice-variety/check-voice-variety.cjs\`.`);
  return L.join('\n');
}

(async () => {
  let snap;
  try {
    const [v, c] = [
      await variety.main(['node', 'check', '--quiet']),
      await counts.main(['node', 'count', '--quiet']),
    ];
    if (!v.calibrated || !c.calibrated) throw new Error('a check failed its calibration — it can no longer see a known positive, so its numbers are not to be trusted');
    snap = { generated_at: new Date().toISOString(), variety: v, counts: c };
  } catch (e) {
    log(`CANNOT-RUN: ${e.message}`);
    if (!noNotice) {
      try {
        const ch = await channel();
        if (ch) await api('POST', '/api/reply', { jobId: ch.convId, automated: true, text: `The nightly voice-variety check could not run tonight: ${e.message}. The numbers you last saw are stale until this is fixed.` });
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

  log(`ran: ${snap.variety.totals.mismatches} mismatches, ${snap.variety.totals.collisions} collisions, ${snap.counts.totals.failures} count failures`
    + (snap.delta ? `, delta ${snap.delta.mismatches >= 0 ? '+' : ''}${snap.delta.mismatches}/${snap.delta.collisions >= 0 ? '+' : ''}${snap.delta.collisions}/${snap.delta.failures >= 0 ? '+' : ''}${snap.delta.failures}` : ', baseline'));

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
