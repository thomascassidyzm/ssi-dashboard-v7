#!/usr/bin/env node
'use strict';
// tools/course-optimization/spa-472-deborah-apply-2026-11-12.cjs — job #472: Kai's 12 Nov rulings on Deborah's answers,
// items 1-5 (S0414 could we order / pedir, S0416 liderar el proyecto, S0437 una causa benéfica, S0604 to let us stay =
// acogernos, S0567 estupendo). Rows: ops/spa-472-deborah-apply/decisions.json (built from #413's proposal + Kai's amendments).
// Popty only (edit-batch, /api/audio/render). Make-before-break as #271: voice every changed line first, then apply text WITH
// the new clip ids in one batch, so no slot is ever empty or speaking old words. Intros (O13) are rendered after the text
// lands, with legoId, so the route binds them.
//   curl -s 'http://localhost:3470/api/production/spa_for_eng/seeds?limit=1000' > seeds.json
//   node <this> check seeds.json    # taught tokens, LEGO containment, ZUT, in-basket dupes, phrase floors after deletes
//   node <this> audio seeds.json    # render dry run (APPLY_CONFIRM=1: one real ask each, no retries)
//   node <this> text seeds.json     # edit-batch dry run (APPLY_CONFIRM=1 applies, writes undo-text.json)
//   node <this> intro seeds.json    # LEGO intros whose known side changed (APPLY_CONFIRM=1 renders + binds)
//   node <this> verify seeds.json   # fresh seeds: intended text, LEGO in each row, 0 empty on every touched seed
const fs = require('fs');
const path = require('path');
const COURSE = 'spa_for_eng';
const AGENT = 'spa-deborah-12nov-apply (job #472)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const DIR = path.join(__dirname, '../../ops/spa-472-deborah-apply');
const ROWS = JSON.parse(fs.readFileSync(path.join(DIR, 'decisions.json'), 'utf8')).rows;
const APPROVAL = 'kai:2026-11-12:Kai authorised re-voicing for job 472 spa Deborah 12 Nov items 1-5, voiced once in the spa_for_eng cast';
const PURPOSE = 'spa_for_eng #472 (Kai 12 Nov): Deborah answers items 1-5 — pedir, liderar el proyecto, una causa benéfica, acogernos, estupendo';
const TOUCHED = [414, 416, 432, 437, 567, 584, 604];
const INTRO = { S0416L02: "The Spanish for: 'the project', as in — 'they want to lead the project next year', is:", S0604L02: "The Spanish for: 'to let us stay', is:" };

const sid = (id) => String(id).split(':').pop();
const toks = (s) => (String(s || '').toLowerCase().match(/[a-záéíóúñü]+/g) || []);
const flat = (s) => ' ' + toks(s).join(' ') + ' ';
const key = (s) => String(s || '').trim().toLowerCase().replace(/[.?!¿¡,]+/g, '').replace(/\s+/g, ' ');
const read = (n) => JSON.parse(fs.readFileSync(path.join(DIR, n), 'utf8'));
const save = (n, o) => { const f = path.join(DIR, n); fs.writeFileSync(f, JSON.stringify(o, null, 1)); console.log('wrote', f); };
function load(api) {
  const seeds = new Map(), legos = [], phrases = [];
  for (const s of api.seeds) { seeds.set('S' + String(s.seed_number).padStart(4, '0'), s); for (const l of s.legos || []) { legos.push({ ...l, seed_number: l.seed_number ?? s.seed_number }); for (const p of l.basket_phrases || []) phrases.push({ ...p, _lego: l.lego_id }); } }
  return { seeds, legos, phrases, L: new Map(legos.map((l) => [l.lego_id, l])), P: new Map(phrases.map((p) => [sid(p.id), p])) };
}
const D = new Map(ROWS.map((r) => [r.id, r]));
const legoNew = (l) => { const d = D.get(l.lego_id); return d ? { ...l, known_text: d.known ?? l.known_text, target_text: d.target ?? l.target_text } : l; };
const want = (row, d) => ({ known: d.known ?? row.known_text, target: d.target ?? row.target_text });
const rowOf = (m, d) => (d.kind === 'seed' ? m.seeds.get(d.id) : d.kind === 'lego' ? m.L.get(d.id) : m.P.get(d.id));

function check(api) {
  const m = load(api); const { legos, phrases, L } = m;
  const ord = (l) => l.seed_number * 100 + (l.lego_index || +l.lego_id.slice(6, 8));
  const first = new Map();
  for (const l0 of legos) { const l = legoNew(l0); const comps = (D.get(l.lego_id) || {}).components || l.components || [];
    for (const t of [...toks(l.target_text), ...comps.flatMap((c) => toks(c && c.target))]) if (!first.has(t) || first.get(t).o > ord(l)) first.set(t, { o: ord(l), id: l.lego_id }); }
  const k2t = new Map();
  const addKT = (k, t, id) => { k = key(k); if (!k2t.has(k)) k2t.set(k, new Set()); k2t.get(k).add(key(t) + ' [' + id + ']'); };
  for (const p of phrases) { const d = D.get(sid(p.id)); if (d && d.delete) continue; const w = d ? want(p, d) : p; addKT(w.known ?? w.known_text, w.target ?? w.target_text, sid(p.id)); }
  for (const l0 of legos) { const l = legoNew(l0); addKT(l.known_text, l.target_text, l.lego_id); }
  for (const d of ROWS) {
    const row = rowOf(m, d); if (!row) { console.log(d.id, 'GONE'); continue; }
    if (d.delete) { console.log(`${d.id} DELETE  ${row.known_text} | ${row.target_text}`); continue; }
    const w = want(row, d); const flags = [];
    const anchor = d.kind === 'phrase' ? legoNew(L.get(row._lego)) : d.kind === 'lego' ? legoNew(row) : null;
    const at = d.kind === 'seed' ? row.seed_number * 100 + 99 : ord(d.kind === 'lego' ? row : L.get(row._lego));
    const un = toks(w.target).map((t) => { const f = first.get(t); return f ? (f.o > at ? `${t}(first ${f.id})` : null) : `${t}(never)`; }).filter(Boolean);
    if (un.length) flags.push('UNTAUGHT ' + un.join(','));
    if (anchor && d.kind === 'phrase' && row.phrase_role !== 'component' && !flat(w.target).includes(flat(anchor.target_text))) flags.push(`TARGET lacks LEGO '${anchor.target_text}'`);
    const others = [...(k2t.get(key(w.known)) || [])].filter((x) => !x.startsWith(key(w.target) + ' ['));
    if (others.length) flags.push(`ZUT -> ${others.join(' ; ')}`);
    if (d.kind === 'phrase') { const dup = phrases.filter((q) => q._lego === row._lego && sid(q.id) !== d.id && !(D.get(sid(q.id)) || {}).delete && key(want(q, D.get(sid(q.id)) || {}).target) === key(w.target)); if (dup.length) flags.push('DUP ' + dup.map((q) => sid(q.id)).join(',')); }
    console.log(`${d.id} ${row.known_text} | ${row.target_text}\n   -> ${w.known} | ${w.target}  ${flags.join(' | ') || 'clean'}`);
  }
  // phrase floors after deletes (3 BUILD / 5 USE, canon gate table)
  for (const lid of new Set(ROWS.filter((d) => d.delete).map((d) => d.id.slice(0, 8)))) {
    const live = phrases.filter((p) => p._lego === lid && !(D.get(sid(p.id)) || {}).delete);
    const b = live.filter((p) => p.phrase_role === 'build').length, u = live.filter((p) => p.phrase_role === 'use').length;
    console.log(`FLOOR ${lid}: ${b} build / ${u} use after deletes${b < 3 || u < 5 ? '  BELOW 3/5' : ''}`);
  }
}

// every (role, text) the changed rows need, deduplicated
function asks(api) {
  const m = load(api); const out = new Map();
  for (const d of ROWS) {
    if (d.delete) continue; const row = rowOf(m, d); if (!row) continue; const w = want(row, d);
    const roles = [];
    if (d.target !== undefined && d.target !== row.target_text) roles.push(['target1', w.target], ['target2', w.target]);
    if (d.known !== undefined && d.known !== row.known_text) roles.push(['known', w.known]);
    for (const [role, text] of roles) { const k = `${role}\u0000${text}`; if (!out.has(k)) out.set(k, { role, text, rows: [] }); out.get(k).rows.push(d.id); }
  }
  return [...out.values()];
}

function planText(api, dz = require('../../services/phrase-decomposer.cjs')) {
  const m = load(api); const { legos, phrases, L } = m;
  const res = read('audio-results.json');
  const clip = (role, text) => { const r = res.find((x) => x.role === role && x.text === text); return r && r.real && r.real.audioId; };
  const vocabFor = (seed) => legos.filter((l) => l.seed_number <= seed).map(legoNew).map((l) => ({ lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text, seed_number: l.seed_number }));
  const ops = [], problems = [];
  const changedLegos = new Set(ROWS.filter((d) => d.kind === 'lego' && d.target).map((d) => d.id));
  const decomp = (p, text) => { const l = legoNew(L.get(p._lego)); const dec = dz.decomposeAnchored(text, vocabFor(l.seed_number), { lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text }, COURSE); if (dec && dec.blocks && dec.kind !== 'error') return dec.blocks; problems.push(`${sid(p.id)}: decomposer ${dec && dec.kind}`); return null; };
  for (const d of ROWS) {
    const row = rowOf(m, d); if (!row) { problems.push(`${d.id} gone`); continue; }
    if (d.delete) { ops.push({ op: 'phrase.delete', phrase_id: row.id, expect: { known_text: row.known_text, target_text: row.target_text } }); continue; }
    const set = {};
    const audio = (slotK, slotT) => {
      if (d.known !== undefined && d.known !== row.known_text) { set.known_text = d.known; set[slotK] = clip('known', d.known); }
      if (d.target !== undefined && d.target !== row.target_text) { set.target_text = d.target; set[slotT[0]] = clip('target1', d.target); set[slotT[1]] = clip('target2', d.target); }
    };
    audio('known_audio_id', ['target1_audio_id', 'target2_audio_id']);
    if (d.components) set.components = d.components;
    if (d.kind === 'phrase' && set.target_text && row.phrase_role !== 'component') { const b = decomp(row, set.target_text); if (b) set.decomposition = b; }
    if (!Object.keys(set).length) { problems.push(`${d.id} no change (already applied?)`); continue; }
    const missing = Object.entries(set).filter(([k, v]) => /_audio_id$/.test(k) && !v).map(([k]) => k);
    if (missing.length) { problems.push(`${d.id}: no clip for ${missing.join(',')}`); continue; }
    const expect = { known_text: row.known_text, target_text: row.target_text };
    if (d.kind === 'seed') ops.push({ op: 'seed.update', seed_number: row.seed_number, expect, set });
    else if (d.kind === 'lego') ops.push({ op: 'lego.update', lego_id: row.lego_id, expect, set });
    else ops.push({ op: 'phrase.update', phrase_id: row.id, expect, set });
  }
  // rows outside the decisions whose decomposition names a changed LEGO: re-anchor them on the new text
  for (const p of phrases) {
    if (D.has(sid(p.id)) || p.phrase_role === 'component') continue;
    const s = JSON.stringify(p.decomposition || '');
    if ([...changedLegos].some((lid) => s.includes(`"${lid}"`))) { const b = decomp(p, p.target_text); if (b) ops.push({ op: 'phrase.update', phrase_id: p.id, expect: { target_text: p.target_text }, set: { decomposition: b } }); console.log('  re-anchor', sid(p.id)); }
  }
  return { ops, problems };
}

async function post(url, body) { let r; try { r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body) }); } catch (e) { return { status: 0, body: { code: 'TRANSPORT', error: String(e.cause || e.message) } }; } return { status: r.status, body: await r.json().catch(() => ({})) }; }
const batch = (body) => post(`${POPTY}/api/production/${COURSE}/edit-batch`, body);
const renderBody = (a) => ({ courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, approval: APPROVAL, job: '#472', ...(a.legoId ? { legoId: a.legoId } : {}) });

async function render(list, apply, dryName, realName) {
  if (!apply) {
    let would = 0; const out = [];
    for (const a of list) {
      const d = await post(`${POPTY}/api/audio/render`, { ...renderBody(a), dryRun: true });
      would += d.body.wouldSpendChars || 0;
      console.log(`dry ${d.status} ${a.role} "${a.text}" → ${d.body.source || d.body.code || d.body.error} ${d.body.voiceId || ''} ${d.body.wouldSpendChars || 0}`);
      out.push({ ...a, dry: { status: d.status, source: d.body.source, code: d.body.code, error: d.body.error, voiceId: d.body.voiceId, audioId: d.body.audioId, wouldSpendChars: d.body.wouldSpendChars } });
    }
    console.log(`dry total would spend ${would} chars over ${list.length} asks`);
    return save(dryName, out);
  }
  // A 429 BULK_DRY_RUN_ON_LIVE dry answer is the dry-run rate cap (100/h), not a refusal of the text: those asks go to the real
  // route (library-first, spend-guarded) with their cost bounded by text length. Any other non-200 dry answer is skipped.
  const ok = new Set(read(dryName).filter((r) => r.dry.status === 200 || r.dry.code === 'BULK_DRY_RUN_ON_LIVE').map((r) => `${r.role}\u0000${r.text}`));
  const prior = fs.existsSync(path.join(DIR, realName)) ? read(realName) : [];
  const out = []; let spent = 0;
  for (const a of list) {
    const done = prior.find((x) => x.role === a.role && x.text === a.text && x.real && x.real.audioId);
    if (done) { out.push(done); continue; } // never ask twice
    if (!ok.has(`${a.role}\u0000${a.text}`)) { out.push({ ...a, real: { skipped: 'refused in the dry run' } }); console.log(`skip ${a.role} "${a.text}"`); continue; }
    const r = await post(`${POPTY}/api/audio/render`, renderBody(a));
    spent += r.body.charsSpent || 0;
    out.push({ ...a, real: { status: r.status, source: r.body.source, audioId: r.body.audioId, voiceId: r.body.voiceId, charsSpent: r.body.charsSpent, code: r.body.code, error: r.body.error } });
    console.log(`real ${r.status} ${a.role} "${a.text}" → ${r.body.source || r.body.code} ${r.body.audioId || ''} ${r.body.voiceId || ''} ${r.body.charsSpent || 0}`);
    save(realName, out);
  }
  console.log(`spent ${spent} chars`);
  return save(realName, out);
}

async function main() {
  const [mode, file] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: check|audio|text|intro|verify <fresh seeds.json>');
  const api = JSON.parse(fs.readFileSync(file, 'utf8'));
  const apply = process.env.APPLY_CONFIRM === '1';
  if (mode === 'check') return check(api);
  if (mode === 'audio') return render(asks(api), apply, 'audio-plan-dry.json', 'audio-results.json');
  if (mode === 'intro') return render(Object.entries(INTRO).map(([legoId, text]) => ({ role: 'presentation', text, legoId })), apply, 'intro-plan-dry.json', 'intro-results.json');
  if (mode === 'text') {
    const p = planText(api);
    if (p.problems.length) { console.log('STOP:', p.problems); process.exitCode = 1; return; }
    const dry = await batch({ ops: p.ops });
    console.log(`dry run ${dry.status} ${dry.body.error || ''} (${p.ops.length} ops)`);
    if (dry.status !== 200) { console.log(JSON.stringify(dry.body).slice(0, 3000)); process.exitCode = 1; return; }
    if (!apply) return save('text-plan-dry.json', p.ops);
    const ap = await batch({ ops: p.ops, apply: true });
    console.log(`APPLIED ${ap.status} event ${ap.body.event_id} undo ${ap.body.undo_file} ${ap.body.error || ''}`);
    return save('undo-text.json', { event_id: ap.body.event_id, undo_file: ap.body.undo_file, ops: ap.body.undo_ops || ap.body.undo });
  }
  if (mode === 'verify') {
    const m = load(api); const bad = [];
    for (const d of ROWS) {
      const row = rowOf(m, d);
      if (d.delete) { if (row) bad.push(`${d.id} still present`); continue; }
      if (!row) { bad.push(`${d.id} missing`); continue; }
      if ((d.known !== undefined && row.known_text !== d.known) || (d.target !== undefined && row.target_text !== d.target)) bad.push(`${d.id} text is "${row.known_text} | ${row.target_text}"`);
    }
    let slots = 0;
    for (const n of TOUCHED) {
      const s = api.seeds.find((x) => x.seed_number === n);
      for (const k of ['known', 'target1', 'target2']) { slots++; if (!s[`${k}_audio_id`]) bad.push(`S${n} seed ${k} EMPTY`); }
      for (const l of s.legos) {
        for (const k of ['known', 'target1', 'target2', 'presentation']) { slots++; if (!l[`${k}_audio_id`]) bad.push(`${l.lego_id} ${k} EMPTY`); }
        const ps = l.basket_phrases || [];
        if (!ps.some((p) => p.phrase_role !== 'component')) bad.push(`${l.lego_id} has no phrases`);
        for (const p of ps) {
          for (const k of ['known', 'target1', 'target2']) { slots++; if (!p[`${k}_audio_id`]) bad.push(`${sid(p.id)} ${k} EMPTY`); }
          if (p.phrase_role !== 'component' && !flat(p.target_text).includes(flat(l.target_text))) bad.push(`${sid(p.id)} lacks LEGO '${l.target_text}'`);
        }
      }
    }
    const intro = fs.existsSync(path.join(DIR, 'intro-results.json')) ? read('intro-results.json') : [];
    for (const [lid] of Object.entries(INTRO)) { const l = m.L.get(lid); const r = intro.find((x) => x.legoId === lid); if (!r || !r.real || r.real.audioId !== l.presentation_audio_id) bad.push(`${lid} intro is ${l.presentation_audio_id}, not this job's clip`); }
    console.log(bad.length ? bad.join('\n') : `VERIFY: ${slots} slots on seeds ${TOUCHED.join(',')} all filled (0 empty); intended text on every row; LEGO in every phrase; new intros bound`);
    if (bad.length) process.exitCode = 1;
    return;
  }
  throw new Error(`unknown mode ${mode}`);
}
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
