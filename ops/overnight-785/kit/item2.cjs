#!/usr/bin/env node
'use strict';
// ops/overnight-785/kit/item2.cjs — cs #789·AK, item 2 of Kai's overnight run #785·AK (eng_for_jpn known prompts D2, seeds
// 74-300; plans by the sibling planner in ops/overnight-785/item2-jpn-d2/plans/, READY.txt lists the finished files).
//
// Same gate as ops/paid-cleanup-item3/run.cjs (#699·AI/#726·AI), split so the heavy half never touches live:
//   copygate <plan.tsv>...  the builder's seed sweep (/v2/validate, before vs after the edit, per touched seed) run IN PROCESS
//                           on the nightly copy by the committed ops/paid-cleanup-scan-447/copy-read.cjs validate — the
//                           live gate in run.cjs read the whole course twice per seed (~280 whole-course reads for 14 files).
//   nightgate <plan.tsv>... the per-row gate (POST /api/admin/phrase-v4/gate: bareLego, containment, vocab, knownSide, ZUT
//                           within the request + whole course), live, 40 rows a request, 2 s apart, 22:00-07:00 UK only.
//   → out/item2/<plan>.gate.json, rows PASS | FAIL (FAIL = HELD, counted, never forced) | NOOP | SKIP.
// The apply goes through night-kit.cjs with item2-jpn-d2/plan-data.cjs, which reads these gate files: the new known clip is
// rendered FIRST and the text edit + link land in one transaction (make before break), with the load gate read before every
// call. run.cjs's own audio step is not used: its job ledger holds #699/#726's 15,000-char grant, 13,832 already spent.
const LIVEGATE = require('../../paid-cleanup-livegate.cjs'); LIVEGATE.install();
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const C = 'eng_for_jpn';
const ROOT = path.join(__dirname, '..', '..', '..');
const OUT = path.join(__dirname, '..', 'item2-jpn-d2', 'out');
fs.mkdirSync(OUT, { recursive: true });
const SCR = process.env.CS_SCRATCH || path.join(ROOT, '.scratch');
const KAI_AGENT = 'kai-789-eng_for_jpn-item2';
const SNAP = process.env.SNAP || path.join(SCR, 'copy', `${C}.snap.json`);

function plan(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => {
    const [id, known] = l.split('\t');
    return { id: id.trim(), known: (known || '').trim() };
  });
}
const outFile = (file, ext) => path.join(OUT, `${path.basename(file, '.tsv')}.${ext}.json`);

function load() {
  const sn = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
  return { sn, byId: new Map(sn.phrases.map((p) => [p.id, p])) };
}
function join(d, file) {
  const rows = plan(file).map((r) => {
    const p = d.byId.get(`${C}:${r.id}`);
    if (!p) return { ...r, error: 'NO SUCH ROW on the copy' };
    const l = d.sn.legos.find((x) => x.seed_number === p.seed_number && x.lego_index === p.lego_index);
    return { ...r, live: p, lego: l, del: r.known === 'DELETE', same: r.known === p.known_text };
  });
  const seen = new Set(); for (const r of rows) { if (seen.has(r.id)) r.error = 'DUPLICATE IN PLAN'; seen.add(r.id); }
  return rows;
}
// run.cjs seedOverride, on the copy snapshot
function override(d, seed, rows) {
  const change = new Map(rows.filter((r) => r.live && !r.error).map((r) => [r.live.id, r]));
  const phrases = {};
  for (const p of d.sn.phrases) {
    if (p.seed_number !== seed || p.phrase_role === 'component') continue;
    const r = change.get(p.id); if (r && r.del) continue;
    const k = `${seed}:${p.lego_index}`;
    (phrases[k] = phrases[k] || []).push({ seed_number: seed, lego_index: p.lego_index, phrase_role: p.phrase_role, target_text: p.target_text, known_text: r ? r.known : p.known_text });
  }
  return { seed_number: seed, legos: d.sn.legos.filter((l) => l.seed_number === seed).map((l) => ({ lego_index: l.lego_index, known_text: l.known_text, target_text: l.target_text, type: l.type, components: l.components, is_new: l.is_new })), phrases };
}

function copygate(files) {
  const d = load();
  for (const file of files) {
    const rows = join(d, file);
    const seeds = [...new Set(rows.filter((r) => r.live).map((r) => r.live.seed_number))].sort((a, b) => a - b);
    const reqs = [];
    for (const s of seeds) { reqs.push({ fromSeed: s, override: override(d, s, []) }); reqs.push({ fromSeed: s, override: override(d, s, rows) }); }
    const rq = path.join(SCR, `item2-req-${path.basename(file)}.json`), ans = path.join(SCR, `item2-ans-${path.basename(file)}.json`);
    fs.writeFileSync(rq, JSON.stringify(reqs));
    execFileSync('node', [path.join(ROOT, 'ops/paid-cleanup-scan-447/copy-read.cjs'), 'validate', C, rq, ans], { stdio: ['ignore', 'ignore', 'inherit'] });
    const A = JSON.parse(fs.readFileSync(ans, 'utf8'));
    const out = { course: C, plan: path.basename(file), copy: d.sn.db, at: new Date().toISOString(), seeds: {}, rows: [] };
    seeds.forEach((s, i) => {
      const pick = (v) => (v.failures || []).filter((f) => f.seed === s).flatMap((f) => f.issues);
      const b = pick(A[2 * i]), a = pick(A[2 * i + 1]);
      out.seeds[s] = { before: b, after: a, newFailures: a.filter((x) => !b.includes(x)) };
    });
    for (const r of rows) {
      if (r.error) { out.rows.push({ id: r.id, verdict: 'SKIP', why: r.error }); continue; }
      // run.cjs: a delete FAILs on any new seed-sweep failure; a rewrite FAILs when a new failure names its new words
      // (e.g. it now duplicates a phrase in its LEGO) — the seed's other rewrites go on.
      const seedNew = out.seeds[r.live.seed_number].newFailures;
      const mine = r.del ? seedNew : seedNew.filter((m) => m.includes(`"${r.known}"`));
      const verdict = r.same ? 'NOOP' : mine.length ? 'FAIL' : 'PENDING';
      out.rows.push({ id: r.id, seed: r.live.seed_number, role: r.live.phrase_role, target: r.live.target_text, old: r.live.known_text, new: r.del ? null : r.known, del: r.del, verdict, why: mine.length ? mine : undefined });
    }
    fs.writeFileSync(outFile(file, 'gate'), JSON.stringify(out, null, 1));
    const n = (v) => out.rows.filter((x) => x.verdict === v).length;
    console.log(`${path.basename(file)} copygate: PENDING ${n('PENDING')} FAIL(seed sweep) ${n('FAIL')} NOOP ${n('NOOP')} SKIP ${n('SKIP')}`);
    for (const [s, v] of Object.entries(out.seeds)) if (v.newFailures.length) console.log('   seed', s, 'new:', JSON.stringify(v.newFailures).slice(0, 300));
  }
}

function signed(method, url, body) {
  LIVEGATE.requireLive(`item2 nightgate ${url}`);
  const args = [path.join(ROOT, 'tools/agent-admin/call.cjs'), '--key', 'kai', '--agent', KAI_AGENT, method, url];
  const tmp = path.join(SCR, `item2-body-${process.pid}-${Date.now()}.json`); fs.writeFileSync(tmp, JSON.stringify(body)); args.push('--body-file', tmp);
  const of = path.join(SCR, `item2-out-${process.pid}-${Date.now()}.json`); const fd = fs.openSync(of, 'w');
  try { execFileSync('node', args, { stdio: ['ignore', fd, 'inherit'], timeout: 600000 }); } finally { fs.closeSync(fd); fs.unlinkSync(tmp); }
  const t = fs.readFileSync(of, 'utf8'); fs.unlinkSync(of); return JSON.parse(t);
}
function gateGreen() {
  for (let i = 0; i < 40; i++) {
    let lvl = '?';
    try { lvl = JSON.parse(execFileSync('curl', ['-s', '-m', '10', 'http://localhost:3470/health'], { encoding: 'utf8' })).dbLoadGate.level; } catch (e) { lvl = 'unreachable'; }
    if (lvl === 'green') return;
    console.log(`  load gate ${lvl}; waiting 30 s (${i + 1}/40)`); execFileSync('sleep', ['30']);
  }
  throw new Error('load gate not green for 20 min: stopped, nothing sent');
}

function nightgate(files) {
  const d = load();
  for (const file of files) {
    const g = JSON.parse(fs.readFileSync(outFile(file, 'gate'), 'utf8'));
    if (g.rows.every((x) => x.verdict !== 'PENDING')) { console.log(`${path.basename(file)}: nothing pending`); continue; }
    const pend = g.rows.filter((x) => x.verdict === 'PENDING');
    const changed = pend.filter((x) => !x.del);
    const refused = new Map();
    for (let i = 0; i < changed.length; i += 40) {
      gateGreen();
      if (i) execFileSync('sleep', ['2']);
      const staged = changed.slice(i, i + 40).map((x) => {
        const p = d.byId.get(`${C}:${x.id}`); const l = d.sn.legos.find((y) => y.seed_number === p.seed_number && y.lego_index === p.lego_index);
        return { seed_number: p.seed_number, lego_index: p.lego_index, phrase_role: p.phrase_role, known_text: x.new, target_text: p.target_text, lego_target: l.target_text, lego_known: l.known_text };
      });
      const r = signed('POST', '/api/admin/phrase-v4/gate', { courseCode: C, rows: staged });
      if (!Array.isArray(r.refused)) throw new Error(`gate: ${JSON.stringify(r).slice(0, 400)}`);
      for (const f of r.refused) refused.set(`${f.seed_number}:${f.lego_index}:${f.phrase_role}:${f.known_text}:${f.target_text}`, f.reasons);
    }
    for (const x of pend) {
      if (x.del) { x.verdict = 'PASS'; continue; } // a delete's gate is the seed sweep (copygate), as in run.cjs
      const p = d.byId.get(`${C}:${x.id}`);
      const why = refused.get(`${p.seed_number}:${p.lego_index}:${p.phrase_role}:${x.new}:${p.target_text}`);
      x.verdict = why ? 'FAIL' : 'PASS'; if (why) x.why = why;
    }
    g.nightgateAt = new Date().toISOString();
    fs.writeFileSync(outFile(file, 'gate'), JSON.stringify(g, null, 1));
    const n = (v) => g.rows.filter((x) => x.verdict === v).length;
    console.log(`${path.basename(file)} gate: PASS ${n('PASS')} FAIL ${n('FAIL')} NOOP ${n('NOOP')} SKIP ${n('SKIP')}`);
  }
}

const [cmd, ...files] = process.argv.slice(2);
if (cmd === 'copygate') copygate(files);
else if (cmd === 'nightgate') nightgate(files);
else { console.error('usage: item2.cjs copygate|nightgate <plan.tsv>...'); process.exit(64); }
