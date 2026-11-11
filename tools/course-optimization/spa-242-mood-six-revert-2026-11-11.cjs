#!/usr/bin/env node
'use strict';
// tools/course-optimization/spa-242-mood-six-revert-2026-11-11.cjs — job #242, follow-up to #170 (record d/40aa7f45), under Kai's
// grant of 11 Nov 2026 ("feel free to record the intros and everything you need").
//
// A) Six rows that #170 re-worded by ONE added word only because the render route refused their intended wording with
//    409 EXISTS_IN_LANGUAGE (services/shared/exists-in-language-guard.cjs, called from audio-render-entry.cjs renderClip):
//    the Spanish was already recorded in the language, but only in voices outside spa_for_eng's cast (Azure Alvaro/Laia in
//    spa_for_jpn, Azure Elvira/Alvaro old spa_for_eng rows). The guard's one sanctioned way past is the route's existing
//    re-record authority: Kai's `kai:YYYY-MM-DD:<reason>` approval token (rerecord-gate.cjs rerecordGranted). This puts
//    each row back to its intended (#170 sweep) wording and voices it ONCE in the course's own cast with that token.
// B) Four intros whose "as in" carried no trigger: the triggered line #170 wrote (same template as its 19 live ones) was
//    refused 403 RERECORD_NOT_PERMITTED (rerecord-gate.cjs: these words already had working presentation clips in other
//    voices). Rendered once in the cast presentation voice under the same token; bindPresentation links it to the LEGO.
// C) S0153L03U13: all three slots empty before #233 — voiced as it stands.
//
// Writes go through Popty only (edit-batch, /api/audio/render). Dry run unless APPLY_CONFIRM=1.
//   curl -s http://localhost:3470/api/production/spa_for_eng/seeds > seeds.json
//   node tools/course-optimization/spa-242-mood-six-revert-2026-11-11.cjs audio seeds.json  (dry run asks each render once; APPLY_CONFIRM=1 renders)
//   node … text seeds.json    (APPLY_CONFIRM=1 to apply)
//   node … link seeds.json    (fresh seeds after text)                                           (APPLY_CONFIRM=1 links)
//   node … verify seeds.json
const fs = require('fs');
const path = require('path');
const COURSE = 'spa_for_eng';
const AGENT = 'spa-242-mood-six-revert (job #242)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const OUT = path.join(__dirname, '../../ops/spa-242-mood-six-revert');
const APPROVAL = 'kai:2026-11-11:Kai grant to #242 - intended #170 wording and triggered intros voiced once in the spa_for_eng cast';
const PURPOSE = 'spa_for_eng #242: #170 six rows back to intended wording, 4 triggered intros, S0153L03U13 fill (Kai grant 11 Nov)';

// before = what #170 sweep2 left live (event f6a0a822); intended = the #170 sweep wording (event 6ab0bb8b decisions).
const ROWS = {
  S0119L01B01: { before: ["I don't want you to leave now", 'No quiero que te vayas ahora'], known: "I don't want you to leave", target: 'No quiero que te vayas' },
  S0169L01B03: { before: ['Do you want me to do something else?', '¿Quieres que haga algo más?'], known: 'Do you want me to do something?', target: '¿Quieres que haga algo?' },
  S0203L03B01: { before: ['I wanted you to help me today', 'Quería que me ayudaras hoy'], known: 'I wanted you to help me', target: 'Quería que me ayudaras' },
  S0370L01B01: { before: ["I didn't see anyone I knew today", 'No vi a nadie que conociera hoy'], known: "I didn't see anyone I knew there", target: 'No vi a nadie que conociera allí' },
  S0238L01B01: { before: ['If you told me the truth', 'Si me dijeras la verdad'], known: 'If you told me', target: 'Si me dijeras' },
  S0203L03B03: { before: ['If I asked you to help me now', 'Si te pidiera que me ayudaras ahora'], known: 'If I asked you to help me with this', target: 'Si te pidiera que me ayudaras con esto' },
};
// Canon PR3/L24 "as in" heads-up: quotes the LEGO in full, the example is the seed's own sentence and carries the trigger.
const INTROS = {
  S0237L01: "The Spanish for: 'me to tell you', as in — 'he wanted me to tell you before the weekend', is:",
  S0249L01: "The Spanish for: 'you to help me', as in — 'I want you to help me before you go', is:",
  S0346L02: "The Spanish for: 'her to know', as in — 'I wanted her to know that I liked her book', is:",
  S0526L02: "The Spanish for: 'that you can't guess', as in — 'I'm finding it hard to believe that you can't guess', is:",
};
const FILL = ['S0153L03U13'];

const sid = (id) => String(id).split(':').pop();
function load(api) {
  const legos = [], phrases = [];
  for (const s of api.seeds) for (const l of s.legos || []) { legos.push({ ...l, seed_number: l.seed_number ?? s.seed_number }); for (const p of l.basket_phrases || []) phrases.push({ ...p, _lego: l.lego_id }); }
  return { legos, L: new Map(legos.map((l) => [l.lego_id, l])), P: new Map(phrases.map((p) => [sid(p.id), p])) };
}

function planText(api, dz = require('../../services/phrase-decomposer.cjs')) {
  const { legos, L, P } = load(api);
  const ops = [], problems = [], notes = [];
  for (const [id, d] of Object.entries(ROWS)) {
    const p = P.get(id);
    if (!p) { problems.push(`${id} gone`); continue; }
    if (p.known_text === d.known && p.target_text === d.target) { notes.push(`${id} already intended`); continue; }
    if (p.known_text !== d.before[0] || p.target_text !== d.before[1]) { problems.push(`${id} drifted: ${p.known_text} | ${p.target_text}`); continue; }
    const lg = L.get(p._lego);
    const vocab = legos.filter((l) => l.seed_number <= lg.seed_number).map((l) => ({ lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text, seed_number: l.seed_number }));
    const dec = dz.decomposeAnchored(d.target, vocab, { lego_id: lg.lego_id, target_text: lg.target_text, known_text: lg.known_text }, COURSE);
    if (!dec || !dec.blocks || dec.kind === 'error') { problems.push(`${id}: decomposer ${dec && dec.kind}`); continue; }
    ops.push({ op: 'phrase.update', phrase_id: p.id, expect: { known_text: p.known_text, target_text: p.target_text }, set: { known_text: d.known, target_text: d.target, decomposition: dec.blocks } });
    notes.push(`UPD ${id}: ${p.known_text} | ${p.target_text}  →  ${d.known} | ${d.target}  [${dec.kind}: ${dec.blocks.map((b) => b.legoId || '·').join(' ')}]`);
  }
  return { ops, problems, notes };
}

function planAudio(api) {
  const { L, P } = load(api);
  const asks = new Map(), problems = [];
  const add = (role, text, slot, extra = {}) => { const k = `${role}\u0000${text}`; if (!asks.has(k)) asks.set(k, { role, text, slots: [], ...extra }); asks.get(k).slots.push(slot); };
  for (const id of [...Object.keys(ROWS), ...FILL]) {
    const p = P.get(id); if (!p) { problems.push(`${id} gone`); continue; }
    // Audio FIRST (canon A6, make-before-break): the clips for the intended words exist before the text moves, so the
    // text-change trigger re-links them and a played row is never silent; the link step fills whatever it did not.
    const d = ROWS[id] || { known: p.known_text, target: p.target_text };
    const t = { target: 'phrase', phrase_id: p.id };
    add('target1', d.target, { ...t, slot: 'target1', current: p.target1_audio_id });
    add('target2', d.target, { ...t, slot: 'target2', current: p.target2_audio_id });
    add('known', d.known, { ...t, slot: 'known', current: p.known_audio_id });
  }
  for (const [lid, text] of Object.entries(INTROS)) {
    const l = L.get(lid); if (!l) { problems.push(`${lid} gone`); continue; }
    add('presentation', text, { target: 'lego', lego_id: lid, slot: 'presentation', current: l.presentation_audio_id }, { legoId: lid });
  }
  return { asks: [...asks.values()], problems };
}

async function post(url, body) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; }
const batch = (body) => post(`${POPTY}/api/production/${COURSE}/edit-batch`, body);
const save = (name, obj) => { fs.mkdirSync(OUT, { recursive: true }); const f = path.join(OUT, name); fs.writeFileSync(f, JSON.stringify(obj, null, 1)); console.log('wrote', f); };
const read = (name) => JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8'));
const renderBody = (a) => ({ courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, approval: APPROVAL, job: '#242', ...(a.legoId ? { legoId: a.legoId } : {}) });

async function main() {
  const [mode, file] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: text|audio|link|verify <fresh seeds.json>');
  const api = JSON.parse(fs.readFileSync(file, 'utf8'));
  const apply = process.env.APPLY_CONFIRM === '1';
  if (mode === 'text') {
    const p = planText(api);
    for (const n of p.notes) console.log('  ', n);
    if (p.problems.length) { console.log('STOP:', p.problems); process.exitCode = 1; return; }
    if (!p.ops.length) return;
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
    if (!apply) {
      let would = 0; const results = [];
      for (const a of asks) {
        const dry = await post(`${POPTY}/api/audio/render`, { ...renderBody(a), dryRun: true });
        would += dry.body.wouldSpendChars || 0;
        console.log(`dry ${dry.status} ${a.role} "${a.text}" → ${dry.body.source || dry.body.code || dry.body.error} ${dry.body.wouldSpendChars || 0}`);
        results.push({ ...a, dry: { status: dry.status, source: dry.body.source, code: dry.body.code, error: dry.body.error, wouldSpendChars: dry.body.wouldSpendChars } });
      }
      console.log(`dry total would spend ${would} chars over ${asks.length} asks`);
      save('audio-plan-dry.json', results);
      return;
    }
    // ONE real ask per (role, text), never retried; an ask the dry run saw refused is not sent (it goes to the record).
    const prior = read('audio-plan-dry.json');
    const ok = new Set(prior.filter((r) => r.dry.status === 200).map((r) => `${r.role}\u0000${r.text}`));
    const results = []; let spent = 0;
    for (const a of asks) {
      if (!ok.has(`${a.role}\u0000${a.text}`)) { results.push({ ...a, real: { skipped: 'refused in the dry run' } }); console.log(`skip ${a.role} "${a.text}"`); continue; }
      const real = await post(`${POPTY}/api/audio/render`, renderBody(a));
      spent += real.body.charsSpent || 0;
      results.push({ ...a, real: { status: real.status, source: real.body.source, audioId: real.body.audioId, charsSpent: real.body.charsSpent, legoLinked: real.body.legoLinked, code: real.body.code, error: real.body.error } });
      console.log(`real ${real.status} ${a.role} "${a.text}" → ${real.body.source || real.body.code} ${real.body.audioId || ''} ${real.body.charsSpent || 0}`);
    }
    console.log(`spent ${spent} chars`);
    save('audio-results.json', results);
    return;
  }
  if (mode === 'link') {
    const results = read('audio-results.json');
    const { L, P } = load(api);
    const ops = [];
    for (const r of results) {
      if (!r.real || !r.real.audioId) continue;
      for (const s of r.slots) {
        const row = s.target === 'lego' ? L.get(s.lego_id) : P.get(sid(s.phrase_id));
        if (!row || row[`${s.slot}_audio_id`] === r.real.audioId) continue;
        ops.push({ op: 'audio.link', target: s.target, ...(s.target === 'lego' ? { lego_id: s.lego_id } : { phrase_id: s.phrase_id }), slot: s.slot, audio_id: r.real.audioId });
      }
    }
    console.log(`${ops.length} audio.link ops`); for (const o of ops) console.log('  ', o.lego_id || sid(o.phrase_id), o.slot, o.audio_id);
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
    const bad = [];
    let results = []; try { results = read('audio-results.json'); } catch { /* before audio */ }
    for (const id of [...Object.keys(ROWS), ...FILL]) {
      const p = P.get(id); if (!p) { bad.push(`${id} missing`); continue; }
      if (ROWS[id] && (p.known_text !== ROWS[id].known || p.target_text !== ROWS[id].target)) bad.push(`${id} not intended text`);
      for (const s of ['known', 'target1', 'target2']) if (!p[`${s}_audio_id`]) bad.push(`${id} ${s} empty`);
    }
    for (const lid of Object.keys(INTROS)) {
      const l = L.get(lid);
      for (const s of ['known', 'target1', 'target2', 'presentation']) if (!l[`${s}_audio_id`]) bad.push(`${lid} ${s} empty`);
      const r = results.find((x) => x.role === 'presentation' && x.legoId === lid);
      if (!r || !r.real || r.real.audioId !== l.presentation_audio_id) bad.push(`${lid} presentation is not the new intro clip (${l.presentation_audio_id})`);
    }
    console.log(bad.length ? bad.join('\n') : `EMPTY SLOTS: 0 (${Object.keys(ROWS).length + FILL.length} rows, ${Object.keys(INTROS).length} intros)`);
    return;
  }
  throw new Error(`unknown mode ${mode}`);
}
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { planText, planAudio, ROWS, INTROS };
