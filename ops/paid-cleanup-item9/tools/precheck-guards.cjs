#!/usr/bin/env node
// cs #960, Kai's rule (19 Nov): an apply is a live pre-check of row + LEGO + seed; a mismatch is HELD, never forced.
// The applier's `expect` covers the row. This covers the LEGO and the seed: for every op of <file> not yet in its
// ledger, compare its sidecar guard (<name>.guards.json, the copy's seed and LEGO text; a re-cut also accepts the text
// its own lego.update sets) with what Popty serves NOW (GET /api/production/<course>/script-view — Popty's own read
// route, night only, run by night-run.sh right before the applier). An op whose seed or LEGO text differs is written to
// the ledger as "drift", so apply-changeset.cjs skips it and the runner's 3-filled gate counts it. No write to any DB.
//   node precheck-guards.cjs <file.changeset.jsonl> [--from-snapshot <copy-live course.json>]   (snapshot = offline proof)
// Exit 0 = checked (held ops, if any, are in the ledger) · 1 = could not read live: the runner skips this file tonight.
const fs = require('fs');
const cs = require('../../../services/shared/changeset.cjs');
const { loadLedger } = require('../../../tools/changeset/apply-changeset.cjs');
const [file, ...rest] = process.argv.slice(2);
const snapFile = rest.includes('--from-snapshot') ? rest[rest.indexOf('--from-snapshot') + 1] : null;
const { header, ops } = cs.read(file);
const course = header.course;
const gfile = file.replace(/\.changeset\.jsonl$/, '.guards.json');
if (!fs.existsSync(gfile)) { console.error(`precheck: no guards file ${gfile}: refusing to vouch for this file`); process.exit(1); }
const { guards } = JSON.parse(fs.readFileSync(gfile, 'utf8'));
if (guards.length !== ops.length) { console.error(`precheck: ${gfile} has ${guards.length} guards for ${ops.length} ops`); process.exit(1); }
const ledgerFile = `${file}.applied.jsonl`;
const done = loadLedger(ledgerFile);
const pending = ops.map((_, i) => i).filter((i) => !done.has(i));
const norm = (t) => String(t == null ? '' : t).normalize('NFC').trim();
const sameText = (a, b) => norm(a.known_text) === norm(b.known_text) && norm(a.target_text) === norm(b.target_text);

async function liveSeeds(nums) {
  if (snapFile) {
    const d = JSON.parse(fs.readFileSync(snapFile, 'utf8'));
    return new Map(d.seeds.filter((s) => nums.includes(s.seed_number)).map((s) => [s.seed_number, s]));
  }
  const out = new Map();
  const sorted = [...new Set(nums)].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length;) {
    const a = sorted[i]; let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] - a < 50) j++;
    const b = sorted[j];
    const url = `http://localhost:3470/api/production/${course}/script-view?seedStart=S${String(a).padStart(4, '0')}&seedEnd=S${String(b).padStart(4, '0')}`;
    const r = await fetch(url, { headers: { 'x-agent-id': 'kai-960-item9-precheck' }, signal: AbortSignal.timeout(60000) });
    if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
    const d = await r.json();
    for (const s of d.seeds || []) out.set(s.seed_number, s);
    i = j + 1;
  }
  return out;
}

(async () => {
  if (!pending.length) { console.log(`precheck ${header.id}: nothing pending`); return 0; }
  let live;
  try { live = await liveSeeds(pending.map((i) => guards[i].seed_number)); } catch (e) { console.error(`precheck ${header.id}: could not read live (${e.message}); file skipped tonight`); return 1; }
  const held = [];
  for (const i of pending) {
    const g = guards[i], s = live.get(g.seed_number);
    const l = s && (s.legos || []).find((x) => x.lego_id === g.lego_id);
    let why = null;
    if (!s) why = `seed ${g.seed_number} not served`;
    else if (!sameText(s, g.seed)) why = `seed ${g.seed_number} text changed since the copy: "${s.target_text}" (copy "${g.seed.target_text}")`;
    else if (!l) why = `LEGO ${g.lego_id} not served`;
    else if (!g.lego.some((x) => sameText(l, x))) why = `LEGO ${g.lego_id} text changed since the copy: "${l.known_text} | ${l.target_text}" (copy "${g.lego[0].known_text} | ${g.lego[0].target_text}")`;
    if (why) held.push({ i, why });
  }
  if (!snapFile) for (const h of held) fs.appendFileSync(ledgerFile, JSON.stringify({ at: new Date().toISOString(), status: 'drift', ops: [h.i], detail: `precheck: ${h.why}`.slice(0, 400) }) + '\n');
  console.log(`precheck ${header.id}${snapFile ? ' (offline, snapshot)' : ''}: ${pending.length} pending, ${held.length} held${held.length ? ': ' + held.slice(0, 3).map((h) => `op ${h.i} ${h.why}`).join(' | ') : ''}`);
  return 0;
})().then((c) => process.exit(c), (e) => { console.error(`precheck: ${e.message}`); process.exit(1); });
