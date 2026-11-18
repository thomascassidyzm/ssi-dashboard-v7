#!/usr/bin/env node
'use strict';
// tools/course-optimization/spa-181-wrong-english-2026-11-11.cjs — job #181: the #348 "wrong English" family (#176 proposal) for
// spa_for_eng under Kai's rulings of 11 Nov 2026 (A statement order; B/C fix only where the learner has met the mapping,
// else delete or rewrite with a taught mapping; D plain rewrite or delete; E as proposed). Every row was read in full by hand; decisions + reasons are
// ops/spa-181-wrong-english/decisions.json. Writes go through Popty only (edit-batch, /api/audio/render).
//   curl -s http://localhost:3470/api/production/spa_for_eng/seeds > seeds.json
//   node <this> check seeds.json        # taught tokens, LEGO containment, ZUT, in-basket dupes, floors
//   node <this> text seeds.json         # dry run (APPLY_CONFIRM=1 applies, writes undo-text.json)
//   node <this> audio seeds.json        # render plan dry run (APPLY_CONFIRM=1: one render each, no retries)
//   node <this> link seeds.json         # link still-empty slots to the rendered clips (APPLY_CONFIRM=1 applies)
//   node <this> verify seeds.json       # 0 empty slots on touched rows, deleted rows gone
const fs = require('fs');
const path = require('path');
const COURSE = 'spa_for_eng';
const AGENT = 'spa-181-wrong-english (job #181)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const DIR = path.join(__dirname, '../../ops/spa-181-wrong-english');
const DEC = JSON.parse(fs.readFileSync(path.join(DIR, 'decisions.json'), 'utf8'));
const PURPOSE = 'spa_for_eng #348 wrong-English family (#181, Kai rulings 11 Nov): re-voice edited rows';

const sid = (id) => String(id).split(':').pop();
const toks = (s) => (String(s || '').toLowerCase().match(/[a-záéíóúñü]+/g) || []);
const flat = (s) => ' ' + toks(s).join(' ') + ' ';
const key = (s) => String(s || '').trim().toLowerCase().replace(/[.?!¿¡]+$/g, '').replace(/^[¿¡]/, '');

function load(api) {
  const legos = [], phrases = [];
  for (const s of api.seeds) for (const l of s.legos || []) { legos.push({ ...l, seed_number: l.seed_number ?? s.seed_number }); for (const p of l.basket_phrases || []) phrases.push({ ...p, _lego: l.lego_id }); }
  return { legos, phrases, L: new Map(legos.map((l) => [l.lego_id, l])), P: new Map(phrases.map((p) => [sid(p.id), p])) };
}

/** Second-pass mechanical checks. A token "taught" = it appears in a LEGO target or component at or before this LEGO (P2). */
function check(api) {
  const { legos, phrases, L, P } = load(api);
  const first = new Map();
  const ord = (l) => l.seed_number * 100 + (l.lego_index || +l.lego_id.slice(6, 8));
  for (const l of legos) for (const t of [...toks(l.target_text), ...((l.components || []).flatMap((c) => toks(c && c.target)))]) if (!first.has(t) || first.get(t).o > ord(l)) first.set(t, { o: ord(l), id: l.lego_id });
  const k2t = new Map();
  for (const p of phrases) { if (DEC.phrases[sid(p.id)]) continue; const k = key(p.known_text); if (!k2t.has(k)) k2t.set(k, new Set()); k2t.get(k).add(key(p.target_text) + '  [' + sid(p.id) + ']'); }
  const out = [];
  for (const [id, d] of Object.entries(DEC.phrases)) {
    const p = P.get(id); if (!p) { out.push(`${id} GONE`); continue; }
    const l = L.get(p._lego);
    const basket = phrases.filter((q) => q._lego === l.lego_id && q.phrase_role !== 'component' && !(DEC.phrases[sid(q.id)] || {}).action?.startsWith('del'));
    const nb = basket.filter((q) => q.phrase_role === 'build').length, nu = basket.filter((q) => q.phrase_role === 'use').length;
    const flags = [];
    if (nb < 1 || nu < 2) flags.push(`FLOOR B${nb}/U${nu}`);
    if (d.action === 'del') { out.push(`${id} DEL  basket after: B${nb}/U${nu} ${flags.join(' ')}`); continue; }
    const nk = d.known ?? p.known_text, nt = d.target ?? p.target_text;
    const before = new Set(toks(p.target_text));
    const un = toks(nt).filter((t) => !before.has(t)).map((t) => { const f = first.get(t); return f ? (f.o > ord(l) ? `${t}(first ${f.id})` : null) : `${t}(never)`; }).filter(Boolean);
    if (un.length) flags.push('UNTAUGHT ' + un.join(','));
    const newOnes = toks(nt).filter((t) => !before.has(t)).map((t) => `${t}<-${(first.get(t) || {}).id}`);
    if (!flat(nt).includes(flat(l.target_text))) flags.push(`TARGET lacks LEGO '${l.target_text}'`);
    if (!flat(nk).includes(flat(l.known_text))) flags.push(`(known lacks LEGO known '${l.known_text}')`);
    const others = [...(k2t.get(key(nk)) || [])].filter((x) => !x.startsWith(key(nt) + '  ['));
    if (others.length) flags.push(`ZUT '${nk}' elsewhere -> ${others.join(' ; ')}`);
    const dup = basket.filter((q) => sid(q.id) !== id && key((DEC.phrases[sid(q.id)] || {}).target ?? q.target_text) === key(nt));
    if (dup.length) flags.push('DUP in basket ' + dup.map((q) => sid(q.id)).join(','));
    out.push(`${id} UPD  B${nb}/U${nu} new tokens [${newOnes.join(' ')}] ${flags.join(' | ')}`);
  }
  return out;
}

function planText(api, dz = require('../../services/phrase-decomposer.cjs')) {
  const { legos, P, L } = load(api);
  const ops = [], problems = [], notes = [];
  const vocabFor = (seed) => legos.filter((l) => l.seed_number <= seed).map((l) => ({ lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text, seed_number: l.seed_number }));
  for (const [id, d] of Object.entries(DEC.phrases)) {
    const p = P.get(id);
    if (!p) { problems.push(`${id} gone`); continue; }
    const expect = { known_text: p.known_text, target_text: p.target_text };
    if (d.action === 'del') { ops.push({ op: 'phrase.delete', phrase_id: p.id, expect }); notes.push(`DEL ${id}: ${p.known_text} | ${p.target_text}`); continue; }
    const set = {};
    if (d.known != null && d.known !== p.known_text) set.known_text = d.known;
    if (d.target != null && d.target !== p.target_text) set.target_text = d.target;
    if (!Object.keys(set).length) { problems.push(`${id} no change (already applied?)`); continue; }
    const l = L.get(p._lego);
    const dec = dz.decomposeAnchored(set.target_text || p.target_text, vocabFor(l.seed_number), { lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text }, COURSE);
    if (dec && dec.blocks && dec.kind !== 'error') set.decomposition = dec.blocks; else problems.push(`${id}: decomposer ${dec && dec.kind}`);
    ops.push({ op: 'phrase.update', phrase_id: p.id, expect, set });
    notes.push(`UPD ${id}: ${p.known_text} | ${p.target_text}  →  ${set.known_text || '(same)'} | ${set.target_text || '(same)'}  [${dec && dec.kind}]`);
  }
  return { ops, problems, notes };
}

function planAudio(api) {
  const { P } = load(api);
  const asks = new Map(), problems = [];
  const add = (role, text, slot) => { const k = `${role}\u0000${text}`; if (!asks.has(k)) asks.set(k, { role, text, slots: [] }); asks.get(k).slots.push(slot); };
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
  return { asks: [...asks.values()], problems };
}

async function post(url, body) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; }
const batch = (body) => post(`${POPTY}/api/production/${COURSE}/edit-batch`, body);
const save = (name, obj) => { const f = path.join(DIR, name); fs.writeFileSync(f, JSON.stringify(obj, null, 1)); console.log('wrote', f); };

async function main() {
  const [mode, file] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: check|text|audio|link|verify <fresh seeds.json>');
  const api = JSON.parse(fs.readFileSync(file, 'utf8'));
  const apply = process.env.APPLY_CONFIRM === '1';
  if (mode === 'check') { console.log(check(api).join('\n')); return; }
  if (mode === 'text') {
    const p = planText(api);
    for (const n of p.notes) console.log('  ', n);
    if (p.problems.length) { console.log('STOP:', p.problems); process.exitCode = 1; return; }
    // 68 ops in one transaction hit the DB statement timeout (dry run 409, 57014), so the batch goes in chunks:
    // each chunk is its own transaction, event and undo; every chunk is dry-run before any is applied.
    const N = +(process.env.CHUNK || 12);
    const chunks = [];
    for (let i = 0; i < p.ops.length; i += N) chunks.push(p.ops.slice(i, i + N));
    for (const [i, ops] of chunks.entries()) {
      const dry = await batch({ ops });
      console.log(`dry run chunk ${i + 1}/${chunks.length}: ${dry.status} ${dry.body.error || ''} (${ops.length} ops)`);
      if (dry.status !== 200) { console.log(JSON.stringify(dry.body).slice(0, 3000)); process.exitCode = 1; return; }
    }
    if (!apply) return;
    const undo = [];
    for (const [i, ops] of chunks.entries()) {
      const ap = await batch({ ops, apply: true });
      console.log(`APPLIED chunk ${i + 1}/${chunks.length}: ${ap.status} event ${ap.body.event_id} undo ${ap.body.undo_file} ${ap.body.error || ''}`);
      undo.push({ chunk: i + 1, status: ap.status, event_id: ap.body.event_id, undo_file: ap.body.undo_file, ops: ap.body.undo_ops || ap.body.undo });
      save('undo-text.json', undo);
      if (ap.status !== 200) { process.exitCode = 1; return; }
    }
    return;
  }
  if (mode === 'audio') {
    const { asks, problems } = planAudio(api);
    if (problems.length) { console.log('STOP:', problems); process.exitCode = 1; return; }
    const results = [];
    if (apply) {
      // The real pass reads the dry-run plan (the door caps dry runs per hour) and skips asks a guard refused — those go to a person.
      const prior = JSON.parse(fs.readFileSync(path.join(DIR, 'audio-plan-dry.json'), 'utf8'));
      const refused = new Set(prior.filter((r) => r.dry.status !== 200).map((r) => `${r.role}\u0000${r.text}`));
      let spent = 0;
      for (const a of asks) {
        if (refused.has(`${a.role}\u0000${a.text}`)) { results.push({ ...a, real: { skipped: 'refused in dry run — held for a person' } }); continue; }
        const real = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE });
        spent += real.body.charsSpent || 0;
        results.push({ ...a, real: { status: real.status, source: real.body.source, audioId: real.body.audioId, charsSpent: real.body.charsSpent, code: real.body.code, error: real.body.error } });
        console.log(`real ${real.status} ${a.role} "${a.text}" → ${real.body.source || real.body.code} ${real.body.audioId || ''} ${real.body.charsSpent || 0}`);
      }
      console.log(`spent ${spent} chars`);
      save('audio-results.json', results);
      return;
    }
    let would = 0;
    for (const a of asks) {
      const dry = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, dryRun: true });
      would += dry.body.wouldSpendChars || 0;
      console.log(`dry ${dry.status} ${a.role} "${a.text}" → ${dry.body.source || dry.body.code || dry.body.error} ${dry.body.wouldSpendChars || 0}`);
      results.push({ ...a, dry: { status: dry.status, source: dry.body.source, code: dry.body.code, error: dry.body.error, wouldSpendChars: dry.body.wouldSpendChars } });
    }
    console.log(`dry total would spend ${would} chars over ${asks.length} asks`);
    save('audio-plan-dry.json', results);
    return;
  }
  if (mode === 'link') {
    const results = JSON.parse(fs.readFileSync(path.join(DIR, 'audio-results.json'), 'utf8'));
    const { P } = load(api);
    const ops = [];
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
    const { P } = load(api);
    const bad = [];
    for (const [id, d] of Object.entries(DEC.phrases)) {
      const p = P.get(id);
      if (d.action === 'del') { if (p) bad.push(`${id} still present`); continue; }
      if (!p) { bad.push(`${id} missing`); continue; }
      if (d.target != null && p.target_text !== d.target) bad.push(`${id} target differs`);
      if (d.known != null && p.known_text !== d.known) bad.push(`${id} known differs`);
      for (const s of ['known', 'target1', 'target2']) if (!p[`${s}_audio_id`]) bad.push(`${id} ${s} empty`);
    }
    console.log(bad.length ? bad.join('\n') : 'EMPTY SLOTS: 0; all decisions live');
    return;
  }
  throw new Error(`unknown mode ${mode}`);
}
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { check, planText, planAudio };
