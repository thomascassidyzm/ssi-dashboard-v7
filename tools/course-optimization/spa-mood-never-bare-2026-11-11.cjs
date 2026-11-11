#!/usr/bin/env node
'use strict';
// tools/course-optimization/spa-mood-never-bare-2026-11-11.cjs — job #170, spa_for_eng wrong-mood family under Kai's 11 Nov rulings:
//   (1) fix both ways, validity first: keep a trigger where a TAUGHT subjunctive fits (changing person/verb is fine if valid), else
//       reword into the ordinary form;
//   (2) a subjunctive LEGO NEVER appears bare: every phrase under it carries a trigger, with as much variety as possible, and its
//       intro "as in" carries a trigger too.
// The decisions (each read in full by hand; regex only ever surfaced candidates) are ops/spa-mood-170/decisions.json, one row per
// phrase with its reason. STAGE=v2 is #165's v2 draft as checked by #170; STAGE=sweep is #170's own sweep of the other subjunctive
// LEGOs. Writes go through Popty only:
//   curl -s http://localhost:3470/api/production/spa_for_eng/seeds > seeds.json
//   STAGE=v2 node tools/course-optimization/spa-mood-never-bare-2026-11-11.cjs text seeds.json     # dry run of the text batch
//   STAGE=v2 APPLY_CONFIRM=1 node … text seeds.json                                                 # apply; writes the undo
//   STAGE=v2 node … audio seeds.json      (fresh seeds.json after the text apply)                   # render plan, dry run
//   STAGE=v2 APPLY_CONFIRM=1 node … audio seeds.json                                                # one render each, no retries
//   STAGE=v2 [APPLY_CONFIRM=1] node … link seeds.json                                              # fill slots a render left empty
//   STAGE=v2 node … verify seeds.json                                                               # empty slots on touched rows
const fs = require('fs');
const path = require('path');
const COURSE = 'spa_for_eng';
const AGENT = 'spa-mood-never-bare (job #170)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const DIR = path.join(__dirname, '../../ops/spa-mood-170');
const STAGE = process.env.STAGE || 'v2';
const ALL = JSON.parse(fs.readFileSync(path.join(DIR, 'decisions.json'), 'utf8'));
const DEC = { rows: ALL.rows.filter((r) => r.stage === STAGE), intros: ALL.intros.filter((r) => r.stage === STAGE) };
const PURPOSE = `spa_for_eng wrong-mood / never-bare subjunctive (Kai 11 Nov), job #170 stage ${STAGE}: re-voice edited and new rows`;
// Copied from a sibling row of the same basket onto an inserted row (never ids, audio, timestamps or attribution).
const COPY = ['introduce', 'status', 'register', 'difficulty', 'metadata', 'release_batch'];

const sid = (id) => String(id).split(':').pop();
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"¿¡«»—]+/g, ' ').replace(/\s+/g, ' ').trim();
function legoPosition(known, legoKnown) { const k = norm(known), l = norm(legoKnown); if (k === l || k.startsWith(l + ' ')) return 'start'; if (k.endsWith(' ' + l)) return 'end'; return 'middle'; }

function load(api) {
  const legos = [], phrases = [];
  for (const s of api.seeds) for (const l of s.legos || []) { legos.push({ ...l, seed_number: l.seed_number ?? s.seed_number }); for (const p of l.basket_phrases || []) phrases.push({ ...p, _lego: l.lego_id }); }
  return { legos, phrases, L: new Map(legos.map((l) => [l.lego_id, l])), P: new Map(phrases.map((p) => [sid(p.id), p])) };
}

/** word_count / lego_count exactly as the course-builder's v2 route stores them (services/course-builder/routes/v2.cjs). */
const counts = (d) => ({ word_count: d.target.length, lego_count: (d.known.match(/\s+/g) || []).length + 1 });

/** Rows a NEW decision became: matched by lego + exact texts, so the plan is idempotent after the apply. */
function findNew(phrases, d) { return phrases.find((p) => p._lego === d.lego_id && p.known_text === d.known && p.target_text === d.target); }

function planText(api, dz = require('../../services/phrase-decomposer.cjs')) {
  const { legos, phrases, L, P } = load(api);
  const ops = [], problems = [], notes = [];
  const vocabFor = (seed) => legos.filter((l) => l.seed_number <= seed).map((l) => ({ lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text, seed_number: l.seed_number }));
  const decompose = (text, lg) => dz.decomposeAnchored(text, vocabFor(lg.seed_number), { lego_id: lg.lego_id, target_text: lg.target_text, known_text: lg.known_text }, COURSE);
  const nextPos = new Map(), nextU = new Map(), nextB = new Map();
  for (const d of DEC.rows) {
    const lg = L.get(d.lego_id);
    if (!lg) { problems.push(`${d.lego_id} gone`); continue; }
    if (d.action === 'del') {
      const p = P.get(d.phrase_id); if (!p) { notes.push(`${d.phrase_id} already gone`); continue; }
      if (p.known_text !== d.before.known || p.target_text !== d.before.target) { problems.push(`${d.phrase_id} drifted: ${p.known_text} | ${p.target_text}`); continue; }
      ops.push({ op: 'phrase.delete', phrase_id: p.id, expect: { known_text: p.known_text, target_text: p.target_text } });
      notes.push(`DEL ${d.phrase_id}: ${p.known_text} | ${p.target_text}`);
      continue;
    }
    const dec = decompose(d.target, lg);
    const blocks = dec && dec.blocks && dec.kind !== 'error' ? dec.blocks : null;
    if (!blocks) problems.push(`${d.phrase_id || d.lego_id + ' NEW'}: decomposer ${dec && dec.kind} for "${d.target}"`);
    if (d.action === 'upd') {
      const p = P.get(d.phrase_id);
      if (!p) { problems.push(`${d.phrase_id} gone`); continue; }
      if (p.known_text === d.known && p.target_text === d.target && p.phrase_role === d.role) { notes.push(`${d.phrase_id} already applied`); continue; }
      if (p.known_text !== d.before.known || p.target_text !== d.before.target) { problems.push(`${d.phrase_id} drifted: ${p.known_text} | ${p.target_text}`); continue; }
      const set = {};
      if (d.known !== p.known_text) set.known_text = d.known;
      if (d.target !== p.target_text) set.target_text = d.target;
      if (d.role !== p.phrase_role) set.phrase_role = d.role;
      if (blocks) set.decomposition = blocks;
      set.lego_position = legoPosition(d.known, lg.known_text);
      Object.assign(set, counts(d));
      ops.push({ op: 'phrase.update', phrase_id: p.id, expect: { known_text: p.known_text, target_text: p.target_text }, set });
      notes.push(`UPD ${d.phrase_id}: ${p.known_text} | ${p.target_text}  →  ${d.known} | ${d.target}  [${dec && dec.kind}]`);
      continue;
    }
    // new
    if (findNew(phrases, d)) { notes.push(`NEW under ${d.lego_id} already present: ${d.known}`); continue; }
    const basket = phrases.filter((q) => q._lego === d.lego_id);
    const sib = basket.find((q) => q.phrase_role === d.role) || basket.find((q) => q.phrase_role !== 'component');
    if (!nextPos.has(d.lego_id)) {
      nextPos.set(d.lego_id, Math.max(0, ...basket.map((q) => q.position || 0)) + 1);
      nextU.set(d.lego_id, Math.max(0, ...basket.filter((q) => /U\d+$/.test(sid(q.id))).map((q) => Number(sid(q.id).slice(9)))) + 1);
      nextB.set(d.lego_id, Math.max(0, ...basket.filter((q) => /B\d+$/.test(sid(q.id))).map((q) => Number(sid(q.id).slice(9)))) + 1);
    }
    const ctr = d.role === 'build' ? nextB : nextU;
    const newId = `${d.lego_id}${d.role === 'build' ? 'B' : 'U'}${String(ctr.get(d.lego_id)).padStart(2, '0')}`; ctr.set(d.lego_id, ctr.get(d.lego_id) + 1);
    const row = { id: `${COURSE}:${newId}`, course_code: COURSE, seed_number: lg.seed_number, lego_index: lg.lego_index, known_text: d.known, target_text: d.target,
      phrase_role: d.role, position: nextPos.get(d.lego_id), lego_position: legoPosition(d.known, lg.known_text), connected_lego_ids: [], introduce: true,
      ...counts(d) };
    nextPos.set(d.lego_id, nextPos.get(d.lego_id) + 1);
    if (sib) for (const c of COPY) if (sib[c] !== undefined && sib[c] !== null) row[c] = sib[c];
    row.metadata = { ...(row.metadata || {}), added_by: 'job #170 (Kai 11 Nov never-bare subjunctive ruling)' };
    if (blocks) row.decomposition = blocks;
    ops.push({ op: 'phrase.insert', row });
    notes.push(`NEW ${newId}: ${d.known} | ${d.target}  [${dec && dec.kind}]`);
  }
  return { ops, problems, notes };
}

/** One render ask per (role, text); every slot of a touched row whose clip no longer speaks its words, plus each new intro. */
function planAudio(api) {
  const { L, P, phrases } = load(api);
  const asks = new Map(), problems = [];
  const add = (role, text, target, extra = {}) => { const k = `${role}\u0000${text}`; if (!asks.has(k)) asks.set(k, { role, text, slots: [], ...extra }); asks.get(k).slots.push(target); };
  for (const d of DEC.rows) {
    if (d.action === 'del') continue;
    const p = d.action === 'upd' ? P.get(d.phrase_id) : findNew(phrases, d);
    if (!p) { problems.push(`${d.phrase_id || d.lego_id + ' NEW ' + d.known} not found`); continue; }
    if (p.known_text !== d.known || p.target_text !== d.target) { problems.push(`${sid(p.id)} text not applied`); continue; }
    const t = { target: 'phrase', phrase_id: p.id };
    const tChanged = d.action === 'new' || d.before.target !== d.target, kChanged = d.action === 'new' || d.before.known !== d.known;
    if (tChanged || !p.target1_audio_id) add('target1', p.target_text, { ...t, slot: 'target1', current: p.target1_audio_id });
    if (tChanged || !p.target2_audio_id) add('target2', p.target_text, { ...t, slot: 'target2', current: p.target2_audio_id });
    if (kChanged || !p.known_audio_id) add('known', p.known_text, { ...t, slot: 'known', current: p.known_audio_id });
  }
  for (const i of DEC.intros) {
    const l = L.get(i.lego_id); if (!l) { problems.push(`${i.lego_id} gone`); continue; }
    add('presentation', i.text, { target: 'lego', lego_id: i.lego_id, slot: 'presentation', current: l.presentation_audio_id }, { legoId: i.lego_id });
  }
  return { asks: [...asks.values()], problems };
}

async function post(url, body) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; }
const batch = (body) => post(`${POPTY}/api/production/${COURSE}/edit-batch`, body);
const save = (name, obj) => { const f = path.join(DIR, `${STAGE}-${name}`); fs.writeFileSync(f, JSON.stringify(obj, null, 1)); console.log('wrote', f); };
const read = (name) => JSON.parse(fs.readFileSync(path.join(DIR, `${STAGE}-${name}`), 'utf8'));

async function main() {
  const [mode, file] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: text|audio|link|verify <fresh seeds.json>');
  const api = JSON.parse(fs.readFileSync(file, 'utf8'));
  const apply = process.env.APPLY_CONFIRM === '1';
  if (mode === 'text') {
    const p = planText(api);
    for (const n of p.notes) console.log('  ', n);
    if (p.problems.length) { console.log('STOP:', p.problems); process.exitCode = 1; return; }
    if (!p.ops.length) { console.log('nothing to do'); return; }
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
    if (!apply) {
      let would = 0;
      for (const a of asks) {
        const dry = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, ...(a.legoId ? { legoId: a.legoId } : {}), dryRun: true });
        would += dry.body.wouldSpendChars || 0;
        console.log(`dry ${dry.status} ${a.role} "${a.text}" → ${dry.body.source || dry.body.code || dry.body.error} ${dry.body.wouldSpendChars || 0}`);
        results.push({ ...a, dry: { status: dry.status, source: dry.body.source, code: dry.body.code, error: dry.body.error, wouldSpendChars: dry.body.wouldSpendChars } });
      }
      console.log(`dry total would spend ${would} chars over ${asks.length} asks`);
      save('audio-plan-dry.json', results);
      return;
    }
    // The real pass reads the dry-run plan and skips any ask a guard refused there — those go to a person, never retried.
    const prior = read('audio-plan-dry.json');
    const refused = new Set(prior.filter((r) => r.dry.status && r.dry.status !== 200 && r.dry.status !== 429).map((r) => `${r.role}\u0000${r.text}`));
    let spent = 0;
    for (const a of asks) {
      const r = { ...a };
      if (refused.has(`${a.role}\u0000${a.text}`)) { r.real = { skipped: 'refused by a guard in the dry run — held for a person' }; results.push(r); continue; }
      // A dropped connection is recorded and the pass moves on (never retried here): a re-run answers library-first, so a clip the
      // server did make before the drop is linked for 0 chars rather than paid for twice.
      let real;
      try { real = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, ...(a.legoId ? { legoId: a.legoId } : {}) }); }
      catch (e) { r.real = { error: `transport: ${e.message}` }; results.push(r); console.log(`real ERR ${a.role} "${a.text}" → ${e.message}`); save('audio-results.json', results); continue; }
      spent += real.body.charsSpent || 0;
      r.real = { status: real.status, source: real.body.source, audioId: real.body.audioId, charsSpent: real.body.charsSpent, legoLinked: real.body.legoLinked, code: real.body.code, error: real.body.error };
      console.log(`real ${real.status} ${a.role} "${a.text}" → ${real.body.source || real.body.code} ${real.body.audioId || ''} ${real.body.charsSpent || 0}`);
      results.push(r);
      if (results.length % 10 === 0) save('audio-results.json', results);
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
        if (!row) continue;
        const now = row[`${s.slot}_audio_id`];
        if (now === r.real.audioId) continue;
        if (now && now !== s.current) continue; // filled fresh by something else since the plan
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
    const { L, P, phrases } = load(api);
    const bad = [];
    for (const d of DEC.rows) {
      if (d.action === 'del') { if (P.get(d.phrase_id)) bad.push(`${d.phrase_id} still present`); continue; }
      const p = d.action === 'upd' ? P.get(d.phrase_id) : findNew(phrases, d);
      if (!p) { bad.push(`${d.phrase_id || d.lego_id + ' NEW ' + d.known} missing`); continue; }
      if (p.known_text !== d.known || p.target_text !== d.target) bad.push(`${sid(p.id)} text differs`);
      for (const s of ['known', 'target1', 'target2']) if (!p[`${s}_audio_id`]) bad.push(`${sid(p.id)} ${s} empty`);
    }
    const results = fs.existsSync(path.join(DIR, `${STAGE}-audio-results.json`)) ? read('audio-results.json') : [];
    for (const i of DEC.intros) {
      const l = L.get(i.lego_id);
      if (!l.presentation_audio_id) { bad.push(`${i.lego_id} presentation empty`); continue; }
      const r = results.find((x) => x.role === 'presentation' && x.legoId === i.lego_id);
      if (!r || !r.real || r.real.audioId !== l.presentation_audio_id) bad.push(`${i.lego_id} presentation is not the new intro clip (${l.presentation_audio_id})`);
    }
    console.log(bad.length ? bad.join('\n') : `EMPTY SLOTS: 0 (${DEC.rows.length} rows, ${DEC.intros.length} intros)`);
    return;
  }
  throw new Error(`unknown mode ${mode}`);
}
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { planText, planAudio };
