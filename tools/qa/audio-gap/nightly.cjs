#!/usr/bin/env node
/*
 * nightly.cjs — the nightly leg of the text-ahead-of-audio standing count.
 *
 * Runs count-audio-gap.cjs, keeps one snapshot per night, and follows the
 * nightly-CI doctrine on watson-1 (ops/ci-run.sh): QUIET IS SILENT, a RISE IS
 * LOUD. A night where nothing went up writes its snapshot and says nothing —
 * nobody needs a phone notification to be told a number did not move. A night
 * where any course went up posts ONE plain-English notice into the Popty
 * project channel, because a rise means text was edited and no render caught up,
 * and that is the exact event this whole job exists to stop being invisible.
 *
 * It never renders, never edits content, never deletes. It reads and it counts.
 *
 *   node tools/qa/audio-gap/nightly.cjs [--no-notice] [--force-notice]
 *
 * Exit codes: 0 counted (whether or not it rose), 2 could not count. A rise is
 * NOT a failure exit — same rule as ci-run.sh, where the state file is what you
 * read, not systemd's idea of the unit.
 */
const fs = require('fs');
const path = require('path');
const { main } = require('./count-audio-gap.cjs');

const SURFACE = process.env.CS_SURFACE || 'http://localhost:4317';
const STATE = process.env.AUDIO_GAP_STATE || '/home/tomcassidy/.local/state/ssi-audio-gap';
const LOG = process.env.AUDIO_GAP_LOG || '/home/tomcassidy/.local/log/ssi-audio-gap.log';
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

function notice(s) {
  // delta is null on the very first night. --force-notice on a baseline is a
  // deliberate smoke test of the delivery path, so it must produce a sentence
  // rather than "went up by undefined".
  const d = s.delta || { headline_missing: 0, increased: [] };
  const t = s.totals, n = x => Number(x).toLocaleString('en-GB');
  const L = [];
  L.push(s.delta
    ? `Text ran ahead of audio again overnight — the standing count went UP by ${d.headline_missing}.`
    : 'First night of the text-ahead-of-audio count — this is the baseline, nothing to compare it against yet.');
  L.push('');
  L.push(`It now stands at ${n(t.headline.missing)} known-side practice prompts with no audio, across ${t.headline.courses} courses. ${n(t.headline.missing_unrendered)} of those have never been rendered at all; ${n(t.headline.missing_relinkable)} already have a clip for exactly that text and only need relinking.`);
  if (d.increased.length) L.push('');
  if (d.increased.length) L.push('What went up, and by how much:');
  for (const r of d.increased.slice(0, 12)) {
    const bits = [];
    if (r.known_missing) bits.push(`${r.known_missing > 0 ? '+' : ''}${r.known_missing} prompt`);
    if (r.target_missing) bits.push(`${r.target_missing > 0 ? '+' : ''}${r.target_missing} target`);
    if (r.stale_text) bits.push(`${r.stale_text > 0 ? '+' : ''}${r.stale_text} now mismatched`);
    L.push(`  ${r.course_code}: ${bits.join(', ')} — now ${r.now}`);
  }
  if (d.increased.length > 12) L.push(`  …and ${d.increased.length - 12} more courses.`);
  L.push('');
  L.push('A rise means somebody edited course text and no render pass followed. Nothing is lost — the text is there and the old clips are still in S3 — but those rows are DROPPED from the learner\'s walk until audio exists for them, so the learner simply never meets them.');
  L.push('');
  L.push(`Full breakdown: ${s.snapshot_file || path.join(STATE, 'latest.json')} — or re-run it yourself with \`node tools/qa/audio-gap/count-audio-gap.cjs --no-save\`.`);
  return L.join('\n');
}

(async () => {
  let snap;
  try {
    snap = await main(['node', 'count-audio-gap.cjs', '--state', STATE, '--quiet']);
  } catch (e) {
    log(`CANNOT-COUNT: ${e.message}`);
    // Could-not-count is loud too: a count that silently stops running is how
    // this gap became invisible in the first place.
    if (!noNotice) {
      try {
        const ch = await channel();
        if (ch) await api('POST', '/api/reply', { jobId: ch.convId, automated: true, text: `The nightly text-ahead-of-audio count could not run tonight: ${e.message}. The number you last saw is stale until this is fixed.` });
      } catch (e2) { log(`notice FAILED: ${e2.message}`); }
    }
    process.exit(2);
  }

  const t = snap.totals, d = snap.delta;
  log(`counted: headline ${t.headline.missing} (${t.headline.missing_unrendered} unrendered, ${t.headline.missing_relinkable} relinkable), stale ${t.headline.stale_text}, seed-track ${t.seed_track_rendered.missing}, building ${t.building_known.missing}` + (d ? `, delta ${d.headline_missing >= 0 ? '+' : ''}${d.headline_missing}` : ', baseline'));

  const rose = !!(d && d.alarm);
  if (!rose && !forceNotice) { log('quiet — nothing went up, silent by design'); return; }
  if (noNotice) { log('rose, but --no-notice given'); return; }

  try {
    const ch = await channel();
    if (!ch) { log(`no project channel for ${CHANNEL_CWD} — notice NOT delivered:\n${notice(snap)}`); return; }
    await api('POST', '/api/reply', { jobId: ch.convId, automated: true, text: notice(snap) });
    log(`notice posted to the Popty channel (${d.increased.length} courses up)`);
  } catch (e) { log(`notice FAILED: ${e.message}\n${notice(snap)}`); }
})();

async function channel() {
  // GET /api/channels answers {"channels":[…]}; an earlier version of the CI
  // reporter assumed a bare array and silently delivered nothing.
  const raw = await api('GET', '/api/channels');
  const list = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.channels) ? raw.channels : []);
  return list.find(c => c.cwd === CHANNEL_CWD) || null;
}
