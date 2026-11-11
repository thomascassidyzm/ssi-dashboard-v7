#!/usr/bin/env node
'use strict';
// tools/course-optimization/spa-clumsy-163-2026-11-11.cjs — job #163, applying the #348 "clumsy phrases" family for
// spa_for_eng under Kai's rulings of 11 Nov 2026 (24 word-order/grammar fixes "yes if valid, flag where no precedent";
// delete both '…in less than an hour, already/ya' rows; S0262L01U10 → 'ese hombre' "yes if valid"). Every row was re-read
// live and checked by hand; decisions + the three held rows (with reasons) are ops/spa-clumsy-163/decisions.json.
// Adapted from the #144 tool (spa-658-four-families-2026-11-11.cjs). Writes go through Popty only.
//   curl -s http://localhost:3470/api/production/spa_for_eng/seeds > seeds.json
//   node tools/course-optimization/spa-clumsy-163-2026-11-11.cjs text seeds.json      # dry run (APPLY_CONFIRM=1 applies)
//   node … audio seeds.json   (fresh seeds.json after the text apply)                  # render dry run (APPLY_CONFIRM=1: once each)
//   node … link seeds.json    (fresh)                                                  # audio.link slots a render left on the old clip
//   node … verify seeds.json  (fresh)                                                  # empty / stale slots on touched rows
const fs = require('fs');
const path = require('path');
const COURSE = 'spa_for_eng';
const AGENT = 'spa-clumsy-163 (job #163)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const DIR = path.join(__dirname, '../../ops/spa-clumsy-163');
const DEC = JSON.parse(fs.readFileSync(path.join(DIR, 'decisions.json'), 'utf8'));
const PURPOSE = 'spa_for_eng #348 clumsy family (Kai rulings 11 Nov, job #163): re-voice edited rows';

const sid = (id) => String(id).split(':').pop();
function load(api) {
  const legos = [], phrases = [];
  for (const s of api.seeds) for (const l of s.legos || []) { legos.push({ ...l, seed_number: l.seed_number ?? s.seed_number }); for (const p of l.basket_phrases || []) phrases.push({ ...p, _lego: l.lego_id }); }
  return { legos, phrases, L: new Map(legos.map((l) => [l.lego_id, l])), P: new Map(phrases.map((p) => [sid(p.id), p])) };
}

function planText(api, dz = require('../../services/phrase-decomposer.cjs')) {
  const { legos, L, P } = load(api);
  const ops = [], problems = [], notes = [];
  const vocabFor = (seed) => legos.filter((l) => l.seed_number <= seed).map((l) => ({ lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text, seed_number: l.seed_number }));
  for (const [id, d] of Object.entries(DEC.phrases)) {
    const p = P.get(id);
    if (!p) { problems.push(`${id} gone`); continue; }
    if (p.known_text !== d.before.known || p.target_text !== d.before.target) { problems.push(`${id} drifted: ${p.known_text} | ${p.target_text}`); continue; }
    const expect = { known_text: p.known_text, target_text: p.target_text };
    if (d.action === 'del') { ops.push({ op: 'phrase.delete', phrase_id: p.id, expect }); notes.push(`DEL ${id}: ${p.known_text} | ${p.target_text}`); continue; }
    const set = {};
    if (d.known !== p.known_text) set.known_text = d.known;
    if (d.target !== p.target_text) set.target_text = d.target;
    const lg = L.get(p._lego);
    const dec = dz.decomposeAnchored(d.target, vocabFor(lg.seed_number), { lego_id: lg.lego_id, target_text: lg.target_text, known_text: lg.known_text }, COURSE);
    if (dec && dec.blocks && dec.kind !== 'error') set.decomposition = dec.blocks; else problems.push(`${id}: decomposer ${dec && dec.kind} for "${d.target}"`);
    ops.push({ op: 'phrase.update', phrase_id: p.id, expect, set });
    notes.push(`UPD ${id}: ${p.known_text} | ${p.target_text}  →  ${set.known_text || '(same)'} | ${set.target_text || '(same)'}  [${dec && dec.kind}]`);
  }
  return { ops, problems, notes };
}

function planAudio(api) {
  const { P } = load(api);
  const asks = new Map(), problems = [];
  const add = (role, text, target) => { const k = `${role}\u0000${text}`; if (!asks.has(k)) asks.set(k, { role, text, slots: [] }); asks.get(k).slots.push(target); };
  for (const [id, d] of Object.entries(DEC.phrases)) {
    if (d.action !== 'upd') continue;
    const p = P.get(id); if (!p) { problems.push(`${id} gone`); continue; }
    // PRE=1 plans from the decisions before the text is applied, so a guard refusal is known before any row changes.
    if (process.env.PRE !== '1' && (p.target_text !== d.target || p.known_text !== d.known)) { problems.push(`${id} text not applied`); continue; }
    const t = { target: 'phrase', phrase_id: p.id };
    if (d.target !== d.before.target) { add('target1', d.target, { ...t, slot: 'target1', current: p.target1_audio_id }); add('target2', d.target, { ...t, slot: 'target2', current: p.target2_audio_id }); }
    if (d.known !== d.before.known) add('known', d.known, { ...t, slot: 'known', current: p.known_audio_id });
  }
  return { asks: [...asks.values()], problems };
}

async function post(url, body) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; }
const batch = (body) => post(`${POPTY}/api/production/${COURSE}/edit-batch`, body);
const save = (name, obj) => { const f = path.join(DIR, name); fs.writeFileSync(f, JSON.stringify(obj, null, 1)); console.log('wrote', f); };
async function runBatch(ops, apply, undoName) {
  const dry = await batch({ ops });
  console.log(`dry run ${dry.status} ${dry.body.error || ''} (${ops.length} ops)`);
  if (dry.status !== 200) { console.log(JSON.stringify(dry.body).slice(0, 3000)); process.exitCode = 1; return; }
  if (!apply) return;
  const ap = await batch({ ops, apply: true });
  console.log(`APPLIED ${ap.status} event ${ap.body.event_id} undo ${ap.body.undo_file} ${ap.body.error || ''}`);
  save(undoName, { event_id: ap.body.event_id, undo_file: ap.body.undo_file, ops: ap.body.undo_ops || ap.body.undo });
}

async function main() {
  const [mode, file] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: text|audio|link|verify <fresh seeds.json>');
  const api = JSON.parse(fs.readFileSync(file, 'utf8'));
  const apply = process.env.APPLY_CONFIRM === '1';
  if (mode === 'text') {
    const p = planText(api);
    for (const n of p.notes) console.log('  ', n);
    if (p.problems.length) { console.log('STOP:', p.problems); process.exitCode = 1; return; }
    return runBatch(p.ops, apply, 'undo-text.json');
  }
  if (mode === 'audio') {
    const { asks, problems } = planAudio(api);
    if (problems.length) { console.log('STOP:', problems); process.exitCode = 1; return; }
    const planFile = path.join(DIR, 'audio-plan-dry.json');
    if (!apply) {
      const results = []; let would = 0;
      for (const a of asks) {
        const dry = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, dryRun: true });
        would += dry.body.wouldSpendChars || 0;
        console.log(`dry ${dry.status} ${a.role} "${a.text}" → ${dry.body.source || dry.body.code || dry.body.error} ${dry.body.wouldSpendChars || 0}`);
        results.push({ ...a, dry: { status: dry.status, source: dry.body.source, code: dry.body.code, error: dry.body.error, wouldSpendChars: dry.body.wouldSpendChars } });
      }
      console.log(`dry total would spend ${would} chars over ${asks.length} asks`);
      save('audio-plan-dry.json', results); return;
    }
    // Real pass: one render per ask the dry run cleared, no retries; a guard refusal is held for a person.
    const prior = JSON.parse(fs.readFileSync(planFile, 'utf8'));
    const ok = new Set(prior.filter((r) => r.dry.status === 200).map((r) => `${r.role}\u0000${r.text}`));
    const results = []; let spent = 0;
    for (const a of asks) {
      if (!ok.has(`${a.role}\u0000${a.text}`)) { results.push({ ...a, real: { skipped: 'not cleared by the dry run — held' } }); continue; }
      const real = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE });
      spent += real.body.charsSpent || 0;
      results.push({ ...a, real: { status: real.status, source: real.body.source, audioId: real.body.audioId, charsSpent: real.body.charsSpent, code: real.body.code, error: real.body.error } });
      console.log(`real ${real.status} ${a.role} "${a.text}" → ${real.body.source || real.body.code} ${real.body.audioId || ''} ${real.body.charsSpent || 0}`);
    }
    console.log(`spent ${spent} chars`);
    save('audio-results.json', results); return;
  }
  if (mode === 'link') {
    const results = JSON.parse(fs.readFileSync(path.join(DIR, 'audio-results.json'), 'utf8'));
    const { P } = load(api); const ops = [];
    for (const r of results) {
      if (!r.real || !r.real.audioId) continue;
      for (const s of r.slots) {
        const row = P.get(sid(s.phrase_id)); if (!row) continue;
        const now = row[`${s.slot}_audio_id`];
        if (now === r.real.audioId) continue;
        if (now && now !== s.current) continue;
        ops.push({ op: 'audio.link', target: 'phrase', phrase_id: s.phrase_id, slot: s.slot, audio_id: r.real.audioId });
      }
    }
    console.log(`${ops.length} audio.link ops`);
    if (!ops.length) return;
    return runBatch(ops, apply, 'undo-audio-link.json');
  }
  if (mode === 'verify') {
    const { P } = load(api); const bad = [];
    for (const [id, d] of Object.entries(DEC.phrases)) {
      const p = P.get(id);
      if (d.action === 'del') { if (p) bad.push(`${id} still present`); continue; }
      if (!p) { bad.push(`${id} missing`); continue; }
      if (p.known_text !== d.known || p.target_text !== d.target) bad.push(`${id} text differs`);
      for (const s of ['known', 'target1', 'target2']) {
        const changed = s === 'known' ? d.known !== d.before.known : d.target !== d.before.target;
        if (!p[`${s}_audio_id`]) bad.push(`${id} ${s} EMPTY`);
        else if (changed && p[`${s}_audio_id`] === d.before.clips[s]) bad.push(`${id} ${s} STALE (still the pre-edit clip)`);
      }
    }
    console.log(bad.length ? bad.join('\n') : 'EMPTY SLOTS: 0, STALE SLOTS: 0');
    return;
  }
  throw new Error(`unknown mode ${mode}`);
}
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { planText, planAudio };
