#!/usr/bin/env node
'use strict';
// tools/course-optimization/spa-271-go-to-work-sir-madam-2026-11-11.cjs — job #271, Kai's rulings of 11 Nov 2026 17:13Z.
// (1) 'go to work' rows that said al trabajo now use the taught irse a trabajar; (2) S0643L01 gains phrases with words
// between 'do you want' and sir/madam, replacing weak 'what she wants' duplicates. Decisions + reasons:
// ops/spa-271-go-to-work-sir-madam/decisions.json. Writes go through Popty only (/api/audio/render, edit-batch).
// Make-before-break as #250: voice every new line first (cast voice, Kai's re-record grant for this job), then apply text
// WITH the new clip ids in one op, so no row is ever silent or speaking the old words.
//   curl -s 'http://localhost:3470/api/production/spa_for_eng/seeds?limit=1000' > seeds.json
//   node <this> check seeds.json    # taught tokens, LEGO containment, ZUT, in-basket dupes
//   node <this> audio seeds.json    # render dry run (APPLY_CONFIRM=1: one real ask each, no retries)
//   node <this> text seeds.json     # edit-batch dry run (APPLY_CONFIRM=1 applies, writes undo-text.json)
//   node <this> verify seeds.json   # fresh seeds: intended text, LEGO in each row, 0 empty, this job's clips
const fs = require('fs');
const path = require('path');
const COURSE = 'spa_for_eng';
const AGENT = 'spa-271-go-to-work-sir-madam (job #271)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const DIR = path.join(__dirname, '../../ops/spa-271-go-to-work-sir-madam');
const DEC = JSON.parse(fs.readFileSync(path.join(DIR, 'decisions.json'), 'utf8')).phrases;
const APPROVAL = 'kai:2026-11-11:Kai granted re-records for job 271 go to work and sir madam phrases, voiced once in the spa_for_eng cast';
const PURPOSE = 'spa_for_eng #271 (Kai 11 Nov): go to work = irse a trabajar; S0643 do you want X sir/madam';

const sid = (id) => String(id).split(':').pop();
const toks = (s) => (String(s || '').toLowerCase().match(/[a-záéíóúñü]+/g) || []);
const flat = (s) => ' ' + toks(s).join(' ') + ' ';
const key = (s) => String(s || '').trim().toLowerCase().replace(/[.?!¿¡]+$/g, '').replace(/^[¿¡]/, '');
const read = (n) => JSON.parse(fs.readFileSync(path.join(DIR, n), 'utf8'));
const save = (n, o) => { const f = path.join(DIR, n); fs.writeFileSync(f, JSON.stringify(o, null, 1)); console.log('wrote', f); };
function load(api) {
  const legos = [], phrases = [];
  for (const s of api.seeds) for (const l of s.legos || []) { legos.push({ ...l, seed_number: l.seed_number ?? s.seed_number }); for (const p of l.basket_phrases || []) phrases.push({ ...p, _lego: l.lego_id }); }
  return { legos, phrases, L: new Map(legos.map((l) => [l.lego_id, l])), P: new Map(phrases.map((p) => [sid(p.id), p])) };
}
const want = (p, d) => ({ known: d.known ?? p.known_text, target: d.target ?? p.target_text });

function check(api) {
  const { legos, phrases, L, P } = load(api);
  const ord = (l) => l.seed_number * 100 + (l.lego_index || +l.lego_id.slice(6, 8));
  const first = new Map();
  for (const l of legos) for (const t of [...toks(l.target_text), ...((l.components || []).flatMap((c) => toks(c && c.target)))]) if (!first.has(t) || first.get(t).o > ord(l)) first.set(t, { o: ord(l), id: l.lego_id });
  const k2t = new Map();
  for (const p of phrases) { if (DEC[sid(p.id)]) continue; const k = key(p.known_text); if (!k2t.has(k)) k2t.set(k, new Set()); k2t.get(k).add(key(p.target_text) + ' [' + sid(p.id) + ']'); }
  for (const [id, d] of Object.entries(DEC)) {
    const p = P.get(id); if (!p) { console.log(id, 'GONE'); continue; }
    const l = L.get(p._lego); const w = want(p, d); const flags = [];
    const un = toks(w.target).map((t) => { const f = first.get(t); return f ? (f.o > ord(l) ? `${t}(first ${f.id})` : null) : `${t}(never)`; }).filter(Boolean);
    if (un.length) flags.push('UNTAUGHT ' + un.join(','));
    if (!flat(w.target).includes(flat(l.target_text))) flags.push(`TARGET lacks LEGO '${l.target_text}'`);
    const others = [...(k2t.get(key(w.known)) || [])].filter((x) => !x.startsWith(key(w.target) + ' ['));
    if (others.length) flags.push(`ZUT elsewhere -> ${others.join(' ; ')}`);
    const dup = phrases.filter((q) => q._lego === l.lego_id && sid(q.id) !== id && key(q.target_text) === key(w.target));
    if (dup.length) flags.push('DUP ' + dup.map((q) => sid(q.id)).join(','));
    console.log(`${id} [${l.lego_id} ${l.target_text}] ${p.known_text} | ${p.target_text}\n   -> ${w.known} | ${w.target}  ${flags.join(' | ') || 'clean'}`);
  }
}

function asks(api) {
  const { P } = load(api); const m = new Map();
  for (const [id, d] of Object.entries(DEC)) {
    const p = P.get(id); if (!p) continue; const w = want(p, d);
    const roles = []; if (d.target) roles.push(['target1', w.target], ['target2', w.target]); if (d.known) roles.push(['known', w.known]);
    for (const [role, text] of roles) { const k = `${role}\u0000${text}`; if (!m.has(k)) m.set(k, { role, text, rows: [] }); m.get(k).rows.push(id); }
  }
  return [...m.values()];
}

function planText(api, dz = require('../../services/phrase-decomposer.cjs')) {
  const { legos, L, P } = load(api);
  const res = read('audio-results.json');
  const clip = (role, text) => { const r = res.find((x) => x.role === role && x.text === text); return r && r.real && r.real.audioId; };
  const vocabFor = (seed) => legos.filter((l) => l.seed_number <= seed).map((l) => ({ lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text, seed_number: l.seed_number }));
  const ops = [], problems = [];
  for (const [id, d] of Object.entries(DEC)) {
    const p = P.get(id); if (!p) { problems.push(`${id} gone`); continue; }
    const w = want(p, d); const set = {};
    if (d.known && d.known !== p.known_text) { set.known_text = d.known; set.known_audio_id = clip('known', d.known); }
    if (d.target && d.target !== p.target_text) {
      set.target_text = d.target; set.target1_audio_id = clip('target1', d.target); set.target2_audio_id = clip('target2', d.target);
      const l = L.get(p._lego);
      const dec = dz.decomposeAnchored(d.target, vocabFor(l.seed_number), { lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text }, COURSE);
      if (dec && dec.blocks && dec.kind !== 'error') set.decomposition = dec.blocks; else problems.push(`${id}: decomposer ${dec && dec.kind}`);
    }
    if (!Object.keys(set).length) { problems.push(`${id} no change (already applied?)`); continue; }
    const missing = Object.entries(set).filter(([k, v]) => /_audio_id$/.test(k) && !v).map(([k]) => k);
    if (missing.length) { problems.push(`${id}: no clip for ${missing.join(',')}`); continue; }
    ops.push({ op: 'phrase.update', phrase_id: p.id, expect: { known_text: p.known_text, target_text: p.target_text }, set });
    console.log(`  ${id}: ${w.known} | ${w.target}  k=${set.known_audio_id || '(kept)'} t1=${set.target1_audio_id || '(kept)'} t2=${set.target2_audio_id || '(kept)'}`);
  }
  return { ops, problems };
}

async function post(url, body) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; }
const batch = (body) => post(`${POPTY}/api/production/${COURSE}/edit-batch`, body);
const renderBody = (a) => ({ courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, approval: APPROVAL, job: '#271' });

async function main() {
  const [mode, file] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: check|audio|text|verify <fresh seeds.json>');
  const api = JSON.parse(fs.readFileSync(file, 'utf8'));
  const apply = process.env.APPLY_CONFIRM === '1';
  if (mode === 'check') return check(api);
  if (mode === 'audio') {
    const list = asks(api);
    if (!apply) {
      let would = 0; const out = [];
      for (const a of list) {
        const d = await post(`${POPTY}/api/audio/render`, { ...renderBody(a), dryRun: true });
        would += d.body.wouldSpendChars || 0;
        console.log(`dry ${d.status} ${a.role} "${a.text}" → ${d.body.source || d.body.code || d.body.error} ${d.body.voiceId || ''} ${d.body.wouldSpendChars || 0}`);
        out.push({ ...a, dry: { status: d.status, source: d.body.source, code: d.body.code, error: d.body.error, voiceId: d.body.voiceId, audioId: d.body.audioId, wouldSpendChars: d.body.wouldSpendChars } });
      }
      console.log(`dry total would spend ${would} chars over ${list.length} asks`);
      return save('audio-plan-dry.json', out);
    }
    const ok = new Set(read('audio-plan-dry.json').filter((r) => r.dry.status === 200).map((r) => `${r.role}\u0000${r.text}`));
    const out = []; let spent = 0;
    for (const a of list) {
      if (!ok.has(`${a.role}\u0000${a.text}`)) { out.push({ ...a, real: { skipped: 'refused in the dry run' } }); console.log(`skip ${a.role} "${a.text}"`); continue; }
      const r = await post(`${POPTY}/api/audio/render`, renderBody(a));
      spent += r.body.charsSpent || 0;
      out.push({ ...a, real: { status: r.status, source: r.body.source, audioId: r.body.audioId, voiceId: r.body.voiceId, charsSpent: r.body.charsSpent, code: r.body.code, error: r.body.error } });
      console.log(`real ${r.status} ${a.role} "${a.text}" → ${r.body.source || r.body.code} ${r.body.audioId || ''} ${r.body.voiceId || ''} ${r.body.charsSpent || 0}`);
    }
    console.log(`spent ${spent} chars`);
    return save('audio-results.json', out);
  }
  if (mode === 'text') {
    const p = planText(api);
    if (p.problems.length) { console.log('STOP:', p.problems); process.exitCode = 1; return; }
    const dry = await batch({ ops: p.ops });
    console.log(`dry run ${dry.status} ${dry.body.error || ''} (${p.ops.length} ops)`);
    if (dry.status !== 200) { console.log(JSON.stringify(dry.body).slice(0, 3000)); process.exitCode = 1; return; }
    if (!apply) return;
    const ap = await batch({ ops: p.ops, apply: true });
    console.log(`APPLIED ${ap.status} event ${ap.body.event_id} undo ${ap.body.undo_file} ${ap.body.error || ''}`);
    return save('undo-text.json', { event_id: ap.body.event_id, undo_file: ap.body.undo_file, ops: ap.body.undo_ops || ap.body.undo });
  }
  if (mode === 'verify') {
    const { L, P } = load(api); const res = read('audio-results.json'); const bad = [], links = [];
    for (const [id, d] of Object.entries(DEC)) {
      const p = P.get(id); if (!p) { bad.push(`${id} missing`); continue; }
      if ((d.known && p.known_text !== d.known) || (d.target && p.target_text !== d.target)) bad.push(`${id} text is "${p.known_text} | ${p.target_text}"`);
      const l = L.get(p._lego);
      if (!flat(p.target_text).includes(flat(l.target_text))) bad.push(`${id} target lacks LEGO ${l.lego_id} "${l.target_text}"`);
      for (const s of ['known', 'target1', 'target2']) {
        const aid = p[`${s}_audio_id`]; if (!aid) { bad.push(`${id} ${s} EMPTY`); continue; }
        const changed = s === 'known' ? d.known : d.target;
        if (!changed) continue; // an untouched slot keeps its old clip; S0274L01U08's known clip differs only in case/punctuation
        const mine = res.find((x) => x.role === s && x.text === changed); if (!mine || !mine.real || mine.real.audioId !== aid) bad.push(`${id} ${s} is ${aid}, not this job's clip`);
        links.push({ op: 'audio.link', target: 'phrase', phrase_id: p.id, slot: s, audio_id: aid });
      }
      console.log(`  ${id} [${l.lego_id} ${l.target_text}] ${p.known_text} | ${p.target_text}  ${p.known_audio_id} ${p.target1_audio_id} ${p.target2_audio_id}`);
    }
    const dry = await batch({ ops: links });
    console.log(`stale check: dry-run re-link of ${links.length} slot clips → ${dry.status} ${dry.body.error || ''}`);
    if (dry.status !== 200) bad.push(`STALE: ${JSON.stringify(dry.body).slice(0, 2000)}`);
    console.log(bad.length ? bad.join('\n') : 'VERIFY: 0 empty, this job\'s clips on every changed slot, LEGO present in each row');
    if (bad.length) process.exitCode = 1;
    return;
  }
  throw new Error(`unknown mode ${mode}`);
}
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
