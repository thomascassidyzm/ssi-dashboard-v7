#!/usr/bin/env node
'use strict';
// cs #699·AI — paid cleanup ITEM 3 (known prompts that do not say what the learner must say) + D2 (eng_for_jpn
// full known-side read). Talks ONLY to Popty over HTTP. No DB access, no SQL.
//
// A plan file is TSV:  <phrase id suffix e.g. S0227L01U01> \t <new known text>   (or "\tDELETE" to delete the row)
// Lines starting with # are comments.
//
//   node run.cjs read <course>                 GET /api/admin/phrase-v4/course/<course>?audio=1 (signed, kai key) → $CS_SCRATCH/live/<course>.json
//   node run.cjs gate <course> <plan.tsv>      the builder's per-row gates (POST /api/admin/phrase-v4/gate: bareLego, containment,
//                                              vocab, buildRecombination, knownSide, ZUT within the request + whole course) on every
//                                              changed row, AND the seed-level builder sweep (POST :3471/api/v2/validate with the
//                                              post-edit seed as an in-memory override: tiling, containment, BUILD/USE floors, vocab),
//                                              compared with the same sweep before the edit → out/<course>/<plan>.gate.json
//   node run.cjs batch <course> <plan.tsv> [--apply]   edit-batch (dry run unless --apply) of the rows that PASSED the gate
//                                              → out/<course>/<plan>.{dry,apply}.json (the apply answer carries the undo)
//   node run.cjs readback <course> <plan.tsv>  live known_text of every planned row (via GET .../lego/:id/basket) → <plan>.readback.json
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const OUTROOT = path.join(__dirname, 'out');
const SCR = process.env.CS_SCRATCH || '/tmp';
const AGENT = 'cs #699·AI for Kai (paid cleanup item 3, 18 Nov 2026)';
const KAI_AGENT = 'kai-cs699-item3';

// Popty is restarted by ssi-auto-deploy whenever main moves: wait for it and retry (up to 6 tries). Safe for applies too:
// every op carries an "expect" on the old text, so a replay of an apply that did land aborts on drift and writes nothing.
function signed(method, url, body) {
  for (let i = 0; ; i++) {
    try { return signedOnce(method, url, body); } catch (e) {
      if (i >= 5) throw e;
      console.error(`  (Popty call failed, try ${i + 1}; waiting for it to come back)`);
      execFileSync('bash', ['-c', 'for i in $(seq 1 60); do curl -s -m 5 -o /dev/null http://localhost:3470/api/production/eng_for_jpn/presentation/S0001L01 && exit 0; sleep 3; done; exit 1']);
      execFileSync('sleep', ['5']);
    }
  }
}
function signedOnce(method, url, body) {
  const args = [path.join(ROOT, 'tools/agent-admin/call.cjs'), '--key', 'kai', '--agent', KAI_AGENT, method, url];
  let tmp;
  if (body !== undefined) { tmp = path.join(SCR, `body-${process.pid}-${Date.now()}.json`); fs.writeFileSync(tmp, JSON.stringify(body)); args.push('--body-file', tmp); }
  // stdout to a FILE: call.cjs's console.log of a large answer is cut short when its stdout is a pipe and it exits.
  const of = path.join(SCR, `out-${process.pid}-${Date.now()}.json`); const fd = fs.openSync(of, 'w');
  try { execFileSync('node', args, { stdio: ['ignore', fd, 'inherit'], timeout: 600000 }); } finally { fs.closeSync(fd); }
  if (tmp) fs.unlinkSync(tmp);
  const out = fs.readFileSync(of, 'utf8'); fs.unlinkSync(of);
  return JSON.parse(out);
}
async function post(url, body, extra = {}) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT, ...extra }, body: JSON.stringify(body), signal: AbortSignal.timeout(600000) });
  const t = await res.text(); try { return { status: res.status, ...JSON.parse(t) }; } catch { return { status: res.status, error: t.slice(0, 500) }; }
}
async function get(url) { return (await fetch(url, { headers: { 'x-agent-id': AGENT }, signal: AbortSignal.timeout(120000) })).json(); }

const livePath = (c) => path.join(SCR, 'live', `${c}.json`);
function live(c) { if (!fs.existsSync(livePath(c))) read(c); return JSON.parse(fs.readFileSync(livePath(c), 'utf8')); }
function read(c) {
  fs.mkdirSync(path.dirname(livePath(c)), { recursive: true });
  const d = signed('GET', `/api/admin/phrase-v4/course/${c}?audio=1`);
  if (!d.phrases) throw new Error(`read ${c}: ${JSON.stringify(d).slice(0, 300)}`);
  fs.writeFileSync(livePath(c), JSON.stringify(d));
  console.log(c, 'seeds', d.seeds.length, 'legos', d.legos.length, 'phrases', d.phrases.length);
}
function plan(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => {
    const [id, known] = l.split('\t');
    return { id: id.trim(), known: (known || '').trim() };
  });
}
function outFile(c, file, ext) { const d = path.join(OUTROOT, c); fs.mkdirSync(d, { recursive: true }); return path.join(d, `${path.basename(file, '.tsv')}.${ext}.json`); }

function joinPlan(c, file) {
  const d = live(c);
  const byId = new Map(d.phrases.map((p) => [p.id, p]));
  const legoOf = (p) => d.legos.find((l) => l.seed_number === p.seed_number && +l.lego_index === +p.lego_index && l.is_new) || d.legos.find((l) => l.seed_number === p.seed_number && +l.lego_index === +p.lego_index);
  const rows = plan(file).map((r) => {
    const p = byId.get(`${c}:${r.id}`);
    if (!p) return { ...r, error: 'NO SUCH ROW live' };
    const l = legoOf(p);
    return { ...r, live: p, lego: l, del: r.known === 'DELETE', same: r.known === p.known_text };
  });
  const seen = new Set(); for (const r of rows) { if (seen.has(r.id)) r.error = 'DUPLICATE IN PLAN'; seen.add(r.id); }
  return { d, rows };
}

function seedOverride(d, seed, rows) {
  const change = new Map(rows.filter((r) => r.live && !r.error).map((r) => [r.live.id, r]));
  const phrases = {};
  for (const p of d.phrases) {
    if (p.seed_number !== seed || p.phrase_role === 'component') continue;
    const r = change.get(p.id); if (r && r.del) continue;
    const k = `${seed}:${p.lego_index}`; (phrases[k] = phrases[k] || []).push({ seed_number: seed, lego_index: p.lego_index, phrase_role: p.phrase_role, target_text: p.target_text, known_text: r ? r.known : p.known_text });
  }
  return { seed_number: seed, legos: d.legos.filter((l) => l.seed_number === seed).map((l) => ({ ...l })), phrases };
}

async function gate(c, file) {
  const { d, rows } = joinPlan(c, file);
  const out = { course: c, plan: path.basename(file), at: new Date().toISOString(), rows: [], seeds: {} };
  const changed = rows.filter((r) => !r.error && !r.del && !r.same);
  // 1. per-row gates, 200 at a time (the route's cap). Every changed row of ONE plan goes in the same request where it fits,
  //    so a known given two targets inside the plan is caught (ZUT within the request).
  const refused = new Map();
  for (let i = 0; i < changed.length; i += 40) {
    if (i) execFileSync('sleep', ['2']); // keep the shared DB calm: each row is a whole-course ZUT lookup
    const staged = changed.slice(i, i + 40).map((r) => ({ seed_number: r.live.seed_number, lego_index: r.live.lego_index, phrase_role: r.live.phrase_role,
      known_text: r.known, target_text: r.live.target_text, lego_target: r.lego.target_text, lego_known: r.lego.known_text }));
    const g = signed('POST', '/api/admin/phrase-v4/gate', { courseCode: c, rows: staged });
    if (!Array.isArray(g.refused)) throw new Error(`gate: ${JSON.stringify(g).slice(0, 400)}`);
    for (const f of g.refused) refused.set(`${f.seed_number}:${f.lego_index}:${f.phrase_role}:${f.known_text}:${f.target_text}`, f.reasons);
  }
  // 2. seed-level builder sweep, before and after, per touched seed.
  const seeds = [...new Set(rows.filter((r) => r.live).map((r) => r.live.seed_number))].sort((a, b) => a - b);
  for (const s of seeds) {
    const before = await post(`http://localhost:3471/api/v2/validate/${c}`, { fromSeed: s, override: seedOverride(d, s, []) });
    const after = await post(`http://localhost:3471/api/v2/validate/${c}`, { fromSeed: s, override: seedOverride(d, s, rows) });
    const pick = (v) => (v.failures || []).filter((f) => f.seed === s).flatMap((f) => f.issues);
    if (before.error || after.error) out.seeds[s] = { error: before.error || after.error };
    else { const b = pick(before), a = pick(after); out.seeds[s] = { before: b, after: a, newFailures: a.filter((x) => !b.includes(x)) }; }
  }
  for (const r of rows) {
    if (r.error) { out.rows.push({ id: r.id, verdict: 'SKIP', why: r.error }); continue; }
    const key = `${r.live.seed_number}:${r.live.lego_index}:${r.live.phrase_role}:${r.known}:${r.live.target_text}`;
    const reasons = refused.get(key);
    const seedNew = (out.seeds[r.live.seed_number] || {}).newFailures || [];
    const verdict = r.same ? 'NOOP' : reasons ? 'FAIL' : (r.del && seedNew.length) ? 'FAIL' : 'PASS';
    out.rows.push({ id: r.id, role: r.live.phrase_role, target: r.live.target_text, old: r.live.known_text, new: r.del ? null : r.known, del: r.del, verdict,
      why: reasons || (r.del && seedNew.length ? seedNew : undefined) });
  }
  const f = outFile(c, file, 'gate'); fs.writeFileSync(f, JSON.stringify(out, null, 1));
  const n = (v) => out.rows.filter((x) => x.verdict === v).length;
  console.log(`${c} ${path.basename(file)}: PASS ${n('PASS')} FAIL ${n('FAIL')} NOOP ${n('NOOP')} SKIP ${n('SKIP')} → ${path.relative(ROOT, f)}`);
  for (const x of out.rows.filter((x) => x.verdict === 'FAIL' || x.verdict === 'SKIP')) console.log('  ', x.verdict, x.id, x.new || '', '|', x.target || '', '::', JSON.stringify(x.why).slice(0, 300));
  for (const [s, v] of Object.entries(out.seeds)) if (v.error || v.newFailures.length || v.after.length) console.log('   seed', s, v.error || `before ${JSON.stringify(v.before)} after ${JSON.stringify(v.after)}`);
}

async function batch(c, file, apply) {
  const g = JSON.parse(fs.readFileSync(outFile(c, file, 'gate'), 'utf8'));
  const ok = g.rows.filter((x) => x.verdict === 'PASS');
  const ops = ok.map((x) => x.del
    ? { op: 'phrase.delete', phrase_id: `${c}:${x.id}`, expect: { known_text: x.old, target_text: x.target } }
    : { op: 'phrase.update', phrase_id: `${c}:${x.id}`, expect: { known_text: x.old, target_text: x.target }, set: { known_text: x.new } });
  if (!ops.length) return console.log('nothing to send');
  // ≤50 ops per request with a 2 s pause (#726·AI, after the 18 Nov DB hold): one event per chunk, every answer kept.
  const all = [];
  for (let i = 0; i < ops.length; i += 50) {
    if (i) execFileSync('sleep', ['2']);
    const part = ops.slice(i, i + 50);
    const body = { ops: part, apply: !!apply, note: `paid cleanup item 3 (${g.plan}): known prompt rewritten to say what the English says — Kai approved 18 Nov (cs #699·AI, resumed #726·AI)` };
    const r = signed('POST', `/api/admin/course-edit/${c}/edit-batch`, { ...body, kai_go: 'Kai 18 Nov 2026: "Yes, though I\'d do it carefully - make sure everything passes the builder validator"' });
    all.push(r);
    console.log(`${c} ${g.plan} ${apply ? 'APPLY' : 'dry'} [${i}..${i + part.length}): ok=${r.ok} applied=${r.applied} event=${r.event_id || r.eventId || (r.event && r.event.id) || '-'} changed=${(r.results || []).filter((x) => x.changed).length} ${r.error || ''} ${r.code || ''}`);
    if (!r.ok) break;
  }
  const f = outFile(c, file, apply ? 'apply' : 'dry'); fs.writeFileSync(f, JSON.stringify(all.length === 1 ? all[0] : all, null, 1));
}

async function readback(c, file) {
  const rows = plan(file);
  const legos = [...new Set(rows.map((r) => r.id.slice(0, 8)))];
  const liveRows = {};
  for (const l of legos) for (const p of (await get(`http://localhost:3470/api/production/${c}/lego/${l}/basket`)).phrases || []) liveRows[p.id.split(':')[1]] = p;
  const out = rows.map((r) => { const p = liveRows[r.id]; return r.known === 'DELETE' ? { id: r.id, ok: !p, gone: !p } : { id: r.id, ok: !!p && p.known_text === r.known, live: p && p.known_text, known_audio_id: p && p.known_audio_id }; });
  const f = outFile(c, file, 'readback'); fs.writeFileSync(f, JSON.stringify(out, null, 1));
  console.log(`${c} ${path.basename(file)} readback: ${out.filter((x) => x.ok).length}/${out.length} live as planned`);
  for (const x of out.filter((x) => !x.ok)) console.log('   NOT LIVE', x.id, x.live);
}

// ── AUDIO: known clips for rows whose text APPLIED and read back (readback.json ok) ──
// One ledger for the whole job (out/audio-ledger.json) so the 15,000-char cap is counted across every course.
const CAP = 15000;
const LEDGER = path.join(OUTROOT, 'audio-ledger.json');
// Kai's grant for THIS job (18 Nov): new known clips for the rewritten prompts, cap 15,000 chars. Sent because the route names it
// as the way through EXISTS_IN_LANGUAGE (the words already recorded in another Japanese-known course, in another voice).
const APPROVAL = 'kai:2026-11-18:paid cleanup item 3 known prompts approved by Kai 18 Nov, cap 15000 chars (cs #699·AI)';
const PURPOSE = 'paid cleanup item 3: known prompt rewritten to say what the English says, Kai approved 18 Nov 2026 (cs #699·AI)';
async function audio(c, file, real) {
  const rb = JSON.parse(fs.readFileSync(outFile(c, file, 'readback'), 'utf8'));
  const want = rb.filter((x) => x.ok && !x.gone && x.live && !x.known_audio_id); // only slots the text edit emptied
  const L = fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : {};
  const spent = () => Object.values(L).reduce((s, x) => s + (x.dryRun ? 0 : (x.charsSpent || 0)), 0);
  let would = 0, refusedAt = null;
  const texts = [...new Set(want.map((x) => x.live))];
  for (const t of texts) {
    const key = `${c}|known|${t}`;
    if (L[key] && L[key].ok && !L[key].dryRun) continue;
    if (real && spent() + t.length > CAP) { console.log('CAP: stop before', t); refusedAt = 'CAP'; break; }
    const a = await post('http://localhost:3470/api/audio/render', { courseCode: c, role: 'known', text: t, purpose: PURPOSE, requestedBy: AGENT, job: '#699·AI', dryRun: !real, approval: APPROVAL }, { 'x-cs-conv': process.env.CS_CONV_TOKEN });
    if (real || !L[key] || L[key].dryRun || !L[key].ok) L[key] = { ...a, text: t, course: c, plan: path.basename(file), at: new Date().toISOString() };
    fs.writeFileSync(LEDGER, JSON.stringify(L, null, 1));
    if (!a.ok) { console.log('REFUSED', a.status, a.code, a.error, '::', t); refusedAt = a.code || a.status; break; }
    if (!real && a.source !== 'library') would += t.length;
  }
  console.log(`${c} ${path.basename(file)} audio ${real ? 'LIVE' : 'dry'}: texts ${texts.length}, ${real ? `job spent so far ${spent()}` : `would spend ≈${would} chars (job spent so far ${spent()})`}${refusedAt ? ' STOPPED ' + refusedAt : ''}`);
}
async function link(c, file, apply) {
  const rb = JSON.parse(fs.readFileSync(outFile(c, file, 'readback'), 'utf8'));
  const L = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  const ops = [];
  for (const x of rb) {
    if (!x.ok || x.gone || !x.live || x.known_audio_id) continue; // never repoint a slot that still has its clip
    const a = L[`${c}|known|${x.live}`];
    if (!a || !a.ok || a.dryRun || !a.audioId || x.known_audio_id === a.audioId) continue;
    ops.push({ op: 'audio.link', target: 'phrase', phrase_id: `${c}:${x.id}`, slot: 'known', audio_id: a.audioId, expect: { known_text: x.live } });
  }
  if (!ops.length) return console.log(`${c} ${path.basename(file)} link: nothing to link`);
  const all = [];
  for (let i = 0; i < ops.length; i += 50) { // ≤50 per request, 2 s apart (#726·AI)
    if (i) execFileSync('sleep', ['2']);
    const r = signed('POST', `/api/admin/course-edit/${c}/edit-batch`, { ops: ops.slice(i, i + 50), apply: !!apply, note: `paid cleanup item 3: new known clips linked (cs #699·AI, resumed #726·AI)` });
    all.push(r);
    console.log(`${c} ${path.basename(file)} link ${apply ? 'APPLY' : 'dry'} [${i}..): ok=${r.ok} event=${r.event_id || '-'} changed=${(r.results || []).filter((x) => x.changed).length} ${r.error || ''} ${r.code || ''}`);
    if (!r.ok) break;
  }
  const f = outFile(c, file, apply ? 'link-apply' : 'link-dry'); fs.writeFileSync(f, JSON.stringify(all.length === 1 ? all[0] : all, null, 1));
}

(async () => {
  const [cmd, c, file, flag] = process.argv.slice(2);
  if (cmd === 'audio') return audio(c, file, flag === '--render');
  if (cmd === 'link') return link(c, file, flag === '--apply');
  if (cmd === 'read') return read(c);
  if (cmd === 'gate') return gate(c, file);
  if (cmd === 'batch') return batch(c, file, flag === '--apply');
  if (cmd === 'readback') return readback(c, file);
  console.error('usage: run.cjs read|gate|batch|readback <course> [plan.tsv] [--apply]'); process.exit(64);
})().catch((e) => { console.error(e); process.exit(1); });
