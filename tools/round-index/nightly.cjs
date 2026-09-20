#!/usr/bin/env node
/*
 * nightly.cjs — the nightly leg of the course_round_index refresh.
 *
 * course_round_index is the round map the learner app reads (round-map.ts). It
 * is a materialized view over course_legos and NOTHING in the estate refreshes
 * it: until this timer existed, it was refreshed only when a human remembered
 * to run the tool. afr_for_eng sat nine rounds short of its own content for
 * weeks, and the tool that was supposed to catch it had a one-way check that
 * could not see added content at all.
 *
 * Follows the nightly doctrine on watson-1 (ops/ci-run.sh): QUIET IS SILENT, a
 * CHANGE IS LOUD. A night where the view already matched its own content writes
 * its log line and says nothing. A night where a RELEASED course had drifted
 * posts one plain-English notice into the Popty project channel, because a
 * drifted round map means content was edited and the map the learner walks did
 * not follow. It reports; it does not block.
 *
 *   node tools/round-index/nightly.cjs [--no-notice] [--force-notice] [--check]
 *
 * Exit codes: 0 ran (whether or not it refreshed), 2 could not run. Drift is
 * NOT a failure exit — the log is what you read, not systemd's idea of the unit.
 */
const fs = require('fs');
const path = require('path');
const { run, describe } = require('../refresh-round-index.cjs');

const SURFACE = process.env.CS_SURFACE || 'http://localhost:4317';
const LOG = process.env.ROUND_INDEX_LOG || '/home/tomcassidy/.local/log/ssi-round-index.log';
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
  return list.find(c => c.cwd === CHANNEL_CWD) || null;
}

function notice(res) {
  const b = res.before, L = [];
  // --force-notice on a clean night is a deliberate smoke test of the delivery
  // path, so it has to produce a sentence rather than "drifted on 0 courses".
  L.push(b.needsRefresh
    ? `The round map had drifted from the course content overnight, on ${b.totals.released_courses} released course(s). It has been rebuilt.`
    : 'The round map matched the course content on every course tonight — nothing needed rebuilding. This notice is a delivery test.');
  L.push('');
  for (const r of b.released) {
    const bits = [];
    if (r.missing) bits.push(`${r.missing} round(s) of content the map did not carry`);
    if (r.dangling) bits.push(`${r.dangling} round(s) pointing at content that no longer exists`);
    if (r.renumbered) bits.push(`${r.renumbered} round(s) that shifted number`);
    L.push(`  ${r.course_code}: ${bits.join('; ')} — map held ${r.have_rows}, content says ${r.want_rows}`);
  }
  const unreleased = b.courses.filter(r => !r.released);
  if (unreleased.length) {
    L.push('');
    L.push(`${unreleased.length} unreleased course(s) also drifted and were rebuilt: ${unreleased.map(r => r.course_code).join(', ')}.`);
  }
  L.push('');
  L.push('Drift means somebody changed course content and the map the learner walks did not follow. Learners resume by the piece of content they last played rather than by round number, so a rebuild moves the readout and the pod cadence, not anybody\'s place.');
  if (res.after.needsRefresh) {
    L.push('');
    L.push('WARNING: the rebuild did NOT clear it. Something is wrong beyond a stale map — this one needs a look.');
  }
  return L.join('\n');
}

(async () => {
  let res;
  try {
    res = await run({ check: process.argv.includes('--check') });
  } catch (e) {
    log(`CANNOT-RUN: ${e.message}`);
    if (!noNotice) {
      try {
        const ch = await channel();
        if (ch) await api('POST', '/api/reply', { jobId: ch.convId, automated: true, text: `The nightly round-map refresh could not run tonight: ${e.message}. The round map is as stale as whenever it last ran.` });
      } catch (e2) { log(`notice FAILED: ${e2.message}`); }
    }
    process.exit(2);
  }

  const b = res.before;
  log(`checked: ${b.totals.courses} course(s) drifted (${b.totals.released_courses} released) — ${b.totals.missing} missing, ${b.totals.dangling} dangling, ${b.totals.renumbered} renumbered; refreshed=${res.refreshed}`);
  if (b.needsRefresh) log(describe(b).split('\n').slice(1).join(' | '));

  const loud = !!(b.totals.released_courses && res.refreshed);
  if (!loud && !forceNotice) { log('quiet — no released course drifted, silent by design'); return; }
  if (noNotice) { log(`drifted, but --no-notice given:\n${notice(res)}`); return; }

  try {
    const ch = await channel();
    if (!ch) { log(`no project channel for ${CHANNEL_CWD} — notice NOT delivered:\n${notice(res)}`); return; }
    await api('POST', '/api/reply', { jobId: ch.convId, automated: true, text: notice(res) });
    log('notice posted to the Popty channel');
  } catch (e) { log(`notice FAILED: ${e.message}\n${notice(res)}`); }
})();
