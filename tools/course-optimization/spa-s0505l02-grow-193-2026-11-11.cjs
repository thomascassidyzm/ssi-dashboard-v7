#!/usr/bin/env node
'use strict';
// tools/course-optimization/spa-s0505l02-grow-193-2026-11-11.cjs — job #193 step 2: grow spa_for_eng S0505L02 from
// 'I don't stay | no me quede' to 'so that I don't stay | para que no me quede' (canon P31 case 1; Kai 11 Nov 14:52Z
// allowed swallowing S0505L01). Plan: ops/spa-s0505-193/grow.json. Popty only (edit-batch, /api/audio/render).
//   node <this> plan seeds.json     # print ops (LEGO update + recomputed decompositions of every row naming S0505L02)
//   node <this> text seeds.json     # dry run; APPLY_CONFIRM=1 applies (writes undo-grow-text.json)
//   node <this> audio seeds.json    # LEGO known/target1/target2 + intro: dry run; APPLY_CONFIRM=1 renders once each
//   node <this> link seeds.json     # link LEGO slots to those clips; APPLY_CONFIRM=1 applies
//   node <this> verify seeds.json   # LEGO text live, 4 LEGO slots + every basket slot filled, decompositions anchored
const fs = require('fs');
const path = require('path');
const COURSE = 'spa_for_eng';
const AGENT = 'spa-s0505l02-grow (job #193)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const DIR = path.join(__dirname, '../../ops/spa-s0505-193');
const G = JSON.parse(fs.readFileSync(path.join(DIR, 'grow.json'), 'utf8'));
const PURPOSE = 'spa_for_eng S0505L02 grown to include para que (#193, P31, Kai 11 Nov)';
const SLOTS = ['known', 'target1', 'target2'];

function load(api) {
  const legos = [], phrases = [];
  for (const s of api.seeds) for (const l of s.legos || []) { legos.push({ ...l, seed_number: l.seed_number ?? s.seed_number }); for (const p of l.basket_phrases || []) phrases.push({ ...p, _lego: l.lego_id }); }
  return { legos, phrases, L: new Map(legos.map((l) => [l.lego_id, l])) };
}
const names = (p) => JSON.stringify(p.decomposition || '').includes(G.lego) || (p.connected_lego_ids || []).includes(G.lego) || p._lego === G.lego;

function planText(api, dz = require('../../services/phrase-decomposer.cjs')) {
  const { legos, phrases, L } = load(api);
  const l = L.get(G.lego);
  const ops = [], notes = [], problems = [];
  const grown = l.target_text === G.set.target_text;
  if (!grown) {
    if (l.known_text !== G.was.known_text || l.target_text !== G.was.target_text) problems.push(`${G.lego} is neither the old nor the grown text`);
    ops.push({ op: 'lego.update', lego_id: G.lego, expect: { known_text: l.known_text, target_text: l.target_text }, set: G.set });
  }
  const vocab = (seed) => legos.filter((x) => x.seed_number <= seed).map((x) => (x.lego_id === G.lego ? { ...x, ...G.set } : x)).map((x) => ({ lego_id: x.lego_id, target_text: x.target_text, known_text: x.known_text, seed_number: x.seed_number }));
  for (const p of phrases.filter((p) => names(p) && p.phrase_role !== 'component')) {
    const owner = L.get(p._lego); const anchor = owner.lego_id === G.lego ? { ...owner, ...G.set } : owner;
    const dec = dz.decomposeAnchored(p.target_text, vocab(owner.seed_number), { lego_id: anchor.lego_id, target_text: anchor.target_text, known_text: anchor.known_text }, COURSE);
    if (!dec || !dec.blocks || dec.kind === 'error') { problems.push(`${p.id} decomposer ${dec && dec.kind}`); continue; }
    const usesGrown = dec.blocks.some((b) => b.legoId === G.lego && String(b.target).trim() === G.set.target_text);
    notes.push(`${p.id.split(':')[1]} [${dec.kind}] ${usesGrown ? 'uses grown LEGO' : 'NO grown block'}: ${dec.blocks.map((b) => (b.legoId || '·') + '=' + String(b.target).trim()).join(' + ')}`);
    ops.push({ op: 'phrase.update', phrase_id: p.id, expect: { target_text: p.target_text }, set: { decomposition: dec.blocks } });
  }
  return { ops, notes, problems };
}

async function post(url, body) { let r; try { r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body) }); } catch (e) { return { status: 0, body: { code: 'TRANSPORT', error: String(e.cause || e.message) } }; } return { status: r.status, body: await r.json().catch(() => ({})) }; }
const batch = (body) => post(`${POPTY}/api/production/${COURSE}/edit-batch`, body);
const save = (name, obj) => { const f = path.join(DIR, name); fs.writeFileSync(f, JSON.stringify(obj, null, 1)); console.log('wrote', f); };
const asks = () => [
  { role: 'known', text: G.set.known_text, slot: 'known' },
  { role: 'target1', text: G.set.target_text, slot: 'target1' },
  { role: 'target2', text: G.set.target_text, slot: 'target2' },
  { role: 'presentation', text: G.intro, slot: 'presentation' },
];

async function main() {
  const [mode, file] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: plan|text|audio|link|verify <fresh seeds.json>');
  const api = JSON.parse(fs.readFileSync(file, 'utf8'));
  const apply = process.env.APPLY_CONFIRM === '1';
  if (mode === 'plan' || mode === 'text') {
    const p = planText(api);
    for (const n of p.notes) console.log('  ', n);
    if (p.problems.length) { console.log('STOP:', p.problems); process.exitCode = 1; return; }
    if (mode === 'plan') { console.log(`${p.ops.length} ops`); return; }
    const dry = await batch({ ops: p.ops });
    console.log(`dry run ${dry.status} ${dry.body.error || ''} (${p.ops.length} ops)`);
    if (dry.status !== 200) { console.log(JSON.stringify(dry.body).slice(0, 3000)); process.exitCode = 1; return; }
    if (!apply) return;
    const ap = await batch({ ops: p.ops, apply: true });
    console.log(`APPLIED ${ap.status} event ${ap.body.event_id} undo ${ap.body.undo_file} ${ap.body.error || ''}`);
    save('undo-grow-text.json', { event_id: ap.body.event_id, undo_file: ap.body.undo_file, ops: ap.body.undo_ops || ap.body.undo });
    return;
  }
  if (mode === 'audio') {
    const out = [];
    for (const a of asks()) {
      const body = { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, legoId: G.lego, ...(apply ? {} : { dryRun: true }) };
      const r = await post(`${POPTY}/api/audio/render`, body);
      out.push({ ...a, status: r.status, source: r.body.source, audioId: r.body.audioId, chars: r.body.charsSpent || r.body.wouldSpendChars || 0, code: r.body.code, error: r.body.error });
      console.log(`${apply ? 'real' : 'dry'} ${r.status} ${a.role} "${a.text}" → ${r.body.source || r.body.code || r.body.error} ${r.body.audioId || ''} ${r.body.charsSpent || r.body.wouldSpendChars || 0}`);
      if (apply) save('grow-audio-results.json', out);
    }
    if (!apply) save('grow-audio-plan-dry.json', out);
    return;
  }
  if (mode === 'link') {
    const res = JSON.parse(fs.readFileSync(path.join(DIR, 'grow-audio-results.json'), 'utf8'));
    const { L } = load(api); const l = L.get(G.lego);
    const ops = res.filter((r) => r.audioId && l[`${r.slot}_audio_id`] !== r.audioId).map((r) => ({ op: 'audio.link', target: 'lego', lego_id: G.lego, slot: r.slot, audio_id: r.audioId }));
    console.log(`${ops.length} audio.link ops`); if (!ops.length) return;
    const dry = await batch({ ops }); console.log(`dry run ${dry.status} ${dry.body.error || ''}`);
    if (dry.status !== 200 || !apply) return;
    const ap = await batch({ ops, apply: true });
    console.log(`APPLIED ${ap.status} event ${ap.body.event_id}`);
    save('undo-grow-audio-link.json', { event_id: ap.body.event_id, undo_file: ap.body.undo_file, ops: ap.body.undo_ops || ap.body.undo });
    return;
  }
  if (mode === 'verify') {
    const { L, phrases } = load(api); const l = L.get(G.lego); const bad = [];
    if (l.known_text !== G.set.known_text || l.target_text !== G.set.target_text) bad.push('LEGO text not grown');
    const res = fs.existsSync(path.join(DIR, 'grow-audio-results.json')) ? JSON.parse(fs.readFileSync(path.join(DIR, 'grow-audio-results.json'), 'utf8')) : [];
    for (const s of [...SLOTS, 'presentation']) { const r = res.find((x) => x.slot === s); if (!l[`${s}_audio_id`]) bad.push(`LEGO ${s} empty`); else if (!r || r.audioId !== l[`${s}_audio_id`]) bad.push(`LEGO ${s} not the grow clip`); }
    for (const p of phrases.filter(names)) {
      for (const s of SLOTS) if (!p[`${s}_audio_id`]) bad.push(`${p.id} ${s} empty`);
      if (p.phrase_role !== 'component' && !JSON.stringify(p.decomposition || '').includes(G.set.target_text)) bad.push(`${p.id} decomposition lacks grown block`);
    }
    console.log(bad.length ? bad.join('\n') : 'GROWN; EMPTY SLOTS: 0; every row decomposed on the grown LEGO');
    return;
  }
  throw new Error(`unknown mode ${mode}`);
}
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { planText };
