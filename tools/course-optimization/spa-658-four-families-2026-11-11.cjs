#!/usr/bin/env node
'use strict';
// tools/course-optimization/spa-658-four-families-2026-11-11.cjs — job #144, applying #658 (tense, cuando+future, backshift,
// agreement) for spa_for_eng under Kai's five rulings of 11 Nov 2026. Every row was read in full by hand; the decisions,
// with the reason for each, are ops/spa-658-apply/decisions.json (authored in decisions_src.py, checked by validate.py).
//
// Writes go through Popty only: POST /api/production/spa_for_eng/edit-batch (dry run unless APPLY_CONFIRM=1), then
// POST /api/audio/render (dry run unless APPLY_CONFIRM=1) and audio.link through edit-batch for slots a render leaves empty.
//   curl -s http://localhost:3470/api/production/spa_for_eng/seeds > seeds.json
//   node tools/course-optimization/spa-658-four-families-2026-11-11.cjs text seeds.json     # dry run of the text batch
//   APPLY_CONFIRM=1 node … text seeds.json                                                  # apply, prints event + undo file
//   node … audio seeds.json  (fresh seeds.json after the text apply)                       # render plan, dry run
//   APPLY_CONFIRM=1 node … audio seeds.json                                                 # render once each, then link
//   node … verify seeds.json                                                                # empty slots on touched rows
const fs = require('fs');
const path = require('path');
const COURSE = 'spa_for_eng';
const AGENT = 'spa-658-four-families (job #144)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const DEC = JSON.parse(fs.readFileSync(path.join(__dirname, '../../ops/spa-658-apply/decisions.json'), 'utf8'));
const GROWN = 'S0423L01';
const PURPOSE = 'spa_for_eng #658 four families (Kai rulings 11 Nov): re-voice edited rows';

const sid = (id) => String(id).split(':').pop();
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"¿¡«»]+/g, ' ').replace(/\s+/g, ' ').trim();
function legoPosition(known, legoKnown) { const k = norm(known), l = norm(legoKnown); if (k === l || k.startsWith(l + ' ')) return 'start'; if (k.endsWith(' ' + l)) return 'end'; return 'middle'; }

function load(api) {
  const legos = [], phrases = [];
  for (const s of api.seeds) for (const l of s.legos || []) { legos.push({ ...l, seed_number: l.seed_number ?? s.seed_number }); for (const p of l.basket_phrases || []) phrases.push({ ...p, _lego: l.lego_id }); }
  return { legos, phrases, L: new Map(legos.map((l) => [l.lego_id, l])), P: new Map(phrases.map((p) => [sid(p.id), p])) };
}

/** The text batch: grow S0423L01, edit/delete rows, and store a recomputed decomposition on every row whose words or LEGO changed. */
function planText(api, dz = require('../../services/phrase-decomposer.cjs')) {
  const { legos, phrases, L, P } = load(api);
  const ops = [], problems = [], notes = [];
  const g = DEC.legos[GROWN], lg = L.get(GROWN);
  const grown = (id) => (id === GROWN ? { ...lg, known_text: g.known_text, target_text: g.target_text } : L.get(id));
  if (!lg) problems.push(`${GROWN} gone`);
  else if (lg.known_text === g.known_text && lg.target_text === g.target_text) notes.push(`${GROWN} already grown`);
  else if (lg.known_text !== g.before.known_text || lg.target_text !== g.before.target_text) problems.push(`${GROWN} drifted: ${lg.known_text} | ${lg.target_text}`);
  else ops.push({ op: 'lego.update', lego_id: GROWN, expect: { known_text: lg.known_text, target_text: lg.target_text },
    set: { known_text: g.known_text, target_text: g.target_text, components: g.components } });
  const vocabFor = (seed) => legos.filter((l) => l.seed_number <= seed).map((l) => { const x = grown(l.lego_id); return { lego_id: x.lego_id, target_text: x.target_text, known_text: x.known_text, seed_number: x.seed_number }; });
  const decompose = (text, legoId) => { const to = grown(legoId); const d = dz.decomposeAnchored(text, vocabFor(to.seed_number), { lego_id: to.lego_id, target_text: to.target_text, known_text: to.known_text }, COURSE); return d; };
  const done = new Set();
  for (const [id, d] of Object.entries(DEC.phrases)) {
    if (d.action === 'keep') continue;
    const p = P.get(id);
    if (!p) { problems.push(`${id} gone`); continue; }
    const expect = { known_text: p.known_text, target_text: p.target_text };
    if (d.action === 'del') { ops.push({ op: 'phrase.delete', phrase_id: p.id, expect }); notes.push(`DEL ${id}: ${p.known_text} | ${p.target_text}`); done.add(id); continue; }
    const set = {};
    if (d.known != null && d.known !== p.known_text) set.known_text = d.known;
    if (d.target != null && d.target !== p.target_text) set.target_text = d.target;
    if (!Object.keys(set).length) { problems.push(`${id} no change (already applied?)`); continue; }
    const dec = decompose(set.target_text || p.target_text, p._lego);
    if (dec && dec.blocks && dec.kind !== 'error') set.decomposition = dec.blocks; else problems.push(`${id}: decomposer ${dec && dec.kind} for "${set.target_text || p.target_text}"`);
    if (p._lego === GROWN) set.lego_position = legoPosition(set.known_text || p.known_text, g.known_text);
    ops.push({ op: 'phrase.update', phrase_id: p.id, expect, set });
    notes.push(`UPD ${id}: ${p.known_text} | ${p.target_text}  →  ${set.known_text || '(same)'} | ${set.target_text || '(same)'}  [${dec && dec.kind}]`);
    done.add(id);
  }
  // Knock-on: rows not edited whose stored tiling depends on the grown LEGO (its own basket, or a tile pointing at it).
  for (const p of phrases) {
    const id = sid(p.id); if (done.has(id) || p.phrase_role === 'component') continue;
    const uses = p._lego === GROWN || (Array.isArray(p.decomposition) && p.decomposition.some((b) => b && b.legoId === GROWN));
    if (!uses) continue;
    const dec = decompose(p.target_text, p._lego);
    if (!dec || !dec.blocks || dec.kind === 'error') { problems.push(`${id}: knock-on decomposer ${dec && dec.kind}`); continue; }
    const set = { decomposition: dec.blocks }; if (p._lego === GROWN) set.lego_position = legoPosition(p.known_text, g.known_text);
    ops.push({ op: 'phrase.update', phrase_id: p.id, expect: { known_text: p.known_text, target_text: p.target_text }, set });
    notes.push(`DECOMP ${id}: ${p.known_text} | ${p.target_text}  [${dec.kind}: ${dec.blocks.map((b) => b.legoId || '·').join(' ')}]`);
  }
  return { ops, problems, notes };
}

/** Every slot of a touched row (and the grown LEGO) whose clip no longer speaks its words: one render ask per (role, text). */
function planAudio(api) {
  const { L, P } = load(api);
  const asks = new Map(), problems = [];
  const add = (role, text, target, extra = {}) => { const k = `${role}\u0000${text}`; if (!asks.has(k)) asks.set(k, { role, text, slots: [], ...extra }); asks.get(k).slots.push(target); };
  for (const [id, d] of Object.entries(DEC.phrases)) {
    if (d.action !== 'upd') continue;
    const p = P.get(id); if (!p) { problems.push(`${id} gone`); continue; }
    if (d.target != null && p.target_text !== d.target) problems.push(`${id} target not applied`);
    if (d.known != null && p.known_text !== d.known) problems.push(`${id} known not applied`);
    const t = { target: 'phrase', phrase_id: p.id };
    if (d.target != null || !p.target1_audio_id) add('target1', p.target_text, { ...t, slot: 'target1', current: p.target1_audio_id });
    if (d.target != null || !p.target2_audio_id) add('target2', p.target_text, { ...t, slot: 'target2', current: p.target2_audio_id });
    if (d.known != null || !p.known_audio_id) add('known', p.known_text, { ...t, slot: 'known', current: p.known_audio_id });
  }
  const l = L.get(GROWN), g = DEC.legos[GROWN];
  if (l.target_text !== g.target_text) problems.push(`${GROWN} not grown`);
  const lt = { target: 'lego', lego_id: GROWN };
  add('target1', l.target_text, { ...lt, slot: 'target1', current: l.target1_audio_id });
  add('target2', l.target_text, { ...lt, slot: 'target2', current: l.target2_audio_id });
  add('known', l.known_text, { ...lt, slot: 'known', current: l.known_audio_id });
  add('presentation', `The Spanish for: '${l.known_text}', is:`, { ...lt, slot: 'presentation', current: l.presentation_audio_id }, { legoId: GROWN });
  return { asks: [...asks.values()], problems };
}

async function post(url, body) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; }
const batch = (body) => post(`${POPTY}/api/production/${COURSE}/edit-batch`, body);
const save = (name, obj) => { const f = path.join(__dirname, '../../ops/spa-658-apply', name); fs.writeFileSync(f, JSON.stringify(obj, null, 1)); console.log('wrote', f); };

async function main() {
  const [mode, file] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: text|audio|verify <fresh seeds.json>');
  const api = JSON.parse(fs.readFileSync(file, 'utf8'));
  const apply = process.env.APPLY_CONFIRM === '1';
  if (mode === 'text') {
    const p = planText(api);
    for (const n of p.notes) console.log('  ', n);
    if (p.problems.length) { console.log('STOP:', p.problems); process.exitCode = 1; return; }
    const dry = await batch({ ops: p.ops });
    console.log(`dry run ${dry.status} ${dry.body.error || ''} (${p.ops.length} ops)`);
    if (dry.status !== 200) { console.log(JSON.stringify(dry.body).slice(0, 3000)); process.exitCode = 1; return; }
    if (!apply) return;
    const ap = await batch({ ops: p.ops, apply: true });
    console.log(`APPLIED ${ap.status} event ${ap.body.event_id} undo ${ap.body.undo_file} ${ap.body.error || ''}`);
    save('undo-text.json', { event_id: ap.body.event_id, undo_file: ap.body.undo_file, ops: ap.body.undo_ops || ap.body.undo });
    return;
  }
  if (mode === 'audio') {
    const { asks, problems } = planAudio(api);
    if (problems.length) { console.log('STOP:', problems); process.exitCode = 1; return; }
    const results = [];
    let would = 0;
    for (const a of asks) {
      const body = { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, ...(a.legoId ? { legoId: a.legoId } : {}) };
      const dry = await post(`${POPTY}/api/audio/render`, { ...body, dryRun: true });
      would += dry.body.wouldSpendChars || 0;
      console.log(`dry ${dry.status} ${a.role} "${a.text}" → ${dry.body.source || dry.body.code || dry.body.error} ${dry.body.wouldSpendChars || 0}`);
      results.push({ ...a, dry: { status: dry.status, source: dry.body.source, code: dry.body.code, error: dry.body.error, wouldSpendChars: dry.body.wouldSpendChars } });
    }
    console.log(`dry total would spend ${would} chars over ${asks.length} asks`);
    if (!apply) { save('audio-plan-dry.json', results); return; }
    let spent = 0;
    for (const r of results) {
      if (r.dry.status !== 200) { r.real = { skipped: 'dry run refused' }; continue; }
      const real = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: r.role, text: r.text, purpose: PURPOSE, ...(r.legoId ? { legoId: r.legoId } : {}) });
      spent += real.body.charsSpent || 0;
      r.real = { status: real.status, source: real.body.source, audioId: real.body.audioId, charsSpent: real.body.charsSpent, code: real.body.code, error: real.body.error };
      console.log(`real ${real.status} ${r.role} "${r.text}" → ${real.body.source || real.body.code} ${real.body.audioId || ''} ${real.body.charsSpent || 0}`);
    }
    console.log(`spent ${spent} chars`);
    save('audio-results.json', results);
    return;
  }
  if (mode === 'link') {
    // Link every still-empty slot of a planned ask to the clip its render returned (renders fill target slots, not known ones).
    const results = JSON.parse(fs.readFileSync(path.join(__dirname, '../../ops/spa-658-apply/audio-results.json'), 'utf8'));
    const { L, P } = load(api);
    const ops = [];
    for (const r of results) {
      if (!r.real || !r.real.audioId) continue;
      for (const s of r.slots) {
        const row = s.target === 'lego' ? L.get(s.lego_id) : P.get(sid(s.phrase_id));
        if (!row) continue;
        const now = row[`${s.slot}_audio_id`];
        if (now === r.real.audioId) continue;
        if (now && now !== s.current) continue; // something already filled it fresh
        ops.push({ op: 'audio.link', target: s.target, ...(s.target === 'lego' ? { lego_id: s.lego_id } : { phrase_id: s.phrase_id }), slot: s.slot, audio_id: r.real.audioId });
      }
    }
    console.log(`${ops.length} audio.link ops`);
    if (!ops.length) return;
    const dry = await batch({ ops });
    console.log(`dry run ${dry.status} ${dry.body.error || ''}`);
    if (dry.status !== 200) { console.log(JSON.stringify(dry.body).slice(0, 3000)); process.exitCode = 1; return; }
    if (!apply) return;
    const ap = await batch({ ops, apply: true });
    console.log(`APPLIED ${ap.status} event ${ap.body.event_id} undo ${ap.body.undo_file}`);
    save('undo-audio-link.json', { event_id: ap.body.event_id, undo_file: ap.body.undo_file, ops: ap.body.undo_ops || ap.body.undo });
    return;
  }
  if (mode === 'verify') {
    const { L, P } = load(api);
    const empty = [];
    for (const [id, d] of Object.entries(DEC.phrases)) {
      if (d.action === 'del') { if (P.get(id)) empty.push(`${id} still present`); continue; }
      const p = P.get(id); if (!p) { empty.push(`${id} missing`); continue; }
      for (const s of ['known', 'target1', 'target2']) if (!p[`${s}_audio_id`]) empty.push(`${id} ${s}`);
    }
    for (const p of P.values()) if (p._lego === GROWN && p.phrase_role !== 'component') for (const s of ['known', 'target1', 'target2']) if (!p[`${s}_audio_id`]) empty.push(`${sid(p.id)} ${s}`);
    const l = L.get(GROWN); for (const s of ['known', 'target1', 'target2', 'presentation']) if (!l[`${s}_audio_id`]) empty.push(`${GROWN} ${s}`);
    console.log(empty.length ? empty.join('\n') : 'EMPTY SLOTS: 0');
    return;
  }
  throw new Error(`unknown mode ${mode}`);
}
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { planText, planAudio };
