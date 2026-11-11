#!/usr/bin/env node
'use strict';
// tools/course-optimization/spa-s0182l04-anywhere-212-2026-11-11.cjs — job #212: spa_for_eng S0182L04 'anywhere | en algún sitio'
// under Kai's ruling of 11 Nov 2026 14:55Z: keep the gloss, give the intro an 'as in' showing anywhere in a question
// (where en algún sitio is right), sweep every anywhere / algún sitio row; negatives before seed 376 need ningún (untaught)
// and are all #194 group-B rows (#210·AH), excluded. Decisions, the sweep and reasons: ops/spa-212-anywhere/decisions.json.
// Adapted from spa-s0505l02-193-2026-11-11.cjs (job #193). Writes go through Popty only (edit-batch, /api/audio/render). No DB access.
//   curl -s http://localhost:3470/api/production/spa_for_eng/seeds > seeds.json
//   node <this> check seeds.json [dec194.json]  # floors after deletes (+ #210 plan), sweep rows unchanged, intro quotes LEGO, English only
//   node <this> text seeds.json         # dry run (APPLY_CONFIRM=1 applies, writes undo-text.json)
//   node <this> audio seeds.json        # render plan dry run (APPLY_CONFIRM=1: one render each, no retries)
//   node <this> link seeds.json         # link slots to the rendered clips (APPLY_CONFIRM=1 applies)
//   node <this> verify seeds.json       # 0 empty slots on the LEGO and its basket, decisions live, intro linked
const fs = require('fs');
const path = require('path');
const COURSE = 'spa_for_eng';
const AGENT = 'spa-s0182l04-anywhere (job #212)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const DIR = path.join(__dirname, '../../ops/spa-212-anywhere');
const DEC = JSON.parse(fs.readFileSync(path.join(DIR, 'decisions.json'), 'utf8'));
const PURPOSE = 'spa_for_eng S0182L04 anywhere as-in intro (#212, Kai ruling 11 Nov 14:55Z)';

// Kai 2026-11-11 15:03Z: the S0182L04 intro is rendered WHOLE in Tom-006 (one-slot exception, services/shared/slot-voice-exceptions.cjs),
// replacing old banned-xAI clips of the same words, which the re-record gate counts — hence Kai's approval token.
const TOM006 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9';
const KAI_APPROVAL = 'kai:2026-11-11:spa S0182L04 anywhere as-in intro in Tom-006, job #212';
const sid = (id) => String(id).split(':').pop();
const toks = (s) => (String(s || '').toLowerCase().match(/[a-záéíóúñü]+/g) || []);
const flat = (s) => ' ' + toks(s).join(' ') + ' ';
const key = (s) => String(s || '').trim().toLowerCase().replace(/[.?!¿¡]+$/g, '').replace(/^[¿¡]/, '');

function load(api) {
  const legos = [], phrases = [];
  for (const s of api.seeds) for (const l of s.legos || []) { legos.push({ ...l, seed_number: l.seed_number ?? s.seed_number }); for (const p of l.basket_phrases || []) phrases.push({ ...p, _lego: l.lego_id }); }
  return { legos, phrases, L: new Map(legos.map((l) => [l.lego_id, l])), P: new Map(phrases.map((p) => [sid(p.id), p])) };
}

/** Basket floors after this job's deletes AND #210's planned group-B outcome; intro quotes the LEGO; sweep rows still live as read. */
function check(api, dec210 = null) {
  const { phrases, L, P } = load(api);
  const out = [];
  const l = L.get(DEC.lego);
  const gone = new Set(Object.entries(DEC.phrases).filter(([, d]) => d.action === 'del').map(([id]) => id));
  if (dec210) for (const r of dec210) if (r.action === 'delete') gone.add(r.id);
  const basket = phrases.filter((q) => q._lego === l.lego_id && q.phrase_role !== 'component' && !gone.has(sid(q.id)));
  const b = basket.filter((q) => q.phrase_role === 'build').length, u = basket.filter((q) => q.phrase_role === 'use').length;
  out.push(`basket ${l.lego_id} after deletes${dec210 ? ' (incl. #210 plan)' : ''}: B${b}/U${u} ${b >= 2 && u >= 4 ? 'floor OK' : 'BELOW FLOOR 2/4'}`);
  for (const [id] of Object.entries(DEC.phrases)) if (!P.get(id)) out.push(`${id} GONE already`);
  for (const r of DEC.sweep) { const p = P.get(r.id); if (!p) out.push(`sweep ${r.id} no longer live`); else if (p.known_text !== r.known || p.target_text !== r.target) out.push(`sweep ${r.id} CHANGED since read: ${p.known_text} | ${p.target_text}`); }
  if (!DEC.intro.text.includes(`'${l.known_text}'`)) out.push(`INTRO does not quote LEGO known '${l.known_text}'`);
  if (/[áéíóúñ¿¡]|\b(en|algún|sitio)\b/i.test(DEC.intro.text)) out.push('INTRO carries target-language words');
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
    if (d.action === 'del') { ops.push({ op: 'phrase.delete', phrase_id: p.id, expect }); notes.push(`DEL ${id}`); continue; }
    const set = {};
    if (d.known != null && d.known !== p.known_text) set.known_text = d.known;
    if (d.target != null && d.target !== p.target_text) set.target_text = d.target;
    if (d.position != null && d.position !== p.position) set.position = d.position;
    if (!Object.keys(set).length) { problems.push(`${id} no change (already applied?)`); continue; }
    if (set.target_text) {
      const l = L.get(p._lego);
      const dec = dz.decomposeAnchored(set.target_text, vocabFor(l.seed_number), { lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text }, COURSE);
      if (dec && dec.blocks && dec.kind !== 'error') set.decomposition = dec.blocks; else problems.push(`${id}: decomposer ${dec && dec.kind}`);
      notes.push(`   decomposition ${id}: ${dec && dec.kind}`);
    }
    ops.push({ op: 'phrase.update', phrase_id: p.id, expect, set });
    notes.push(`UPD ${id}: ${p.known_text} | ${p.target_text}  →  ${JSON.stringify({ ...set, decomposition: undefined })}`);
  }
  return { ops, problems, notes };
}

function planAudio(api) {
  const { P, L } = load(api);
  const asks = new Map(), problems = [];
  const add = (role, text, slot, extra = {}) => { const k = `${role}\u0000${text}`; if (!asks.has(k)) asks.set(k, { role, text, slots: [], ...extra }); asks.get(k).slots.push(slot); };
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
  const l = L.get(DEC.lego);
  add('presentation', DEC.intro.text, { target: 'lego', lego_id: l.lego_id, slot: 'presentation', current: l.presentation_audio_id }, { legoId: l.lego_id, voiceId: TOM006, approval: KAI_APPROVAL });
  return { asks: [...asks.values()], problems };
}

async function post(url, body) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; }
const batch = (body) => post(`${POPTY}/api/production/${COURSE}/edit-batch`, body);
const save = (name, obj) => { const f = path.join(DIR, name); fs.writeFileSync(f, JSON.stringify(obj, null, 1)); console.log('wrote', f); };
const renderBody = (a, dryRun) => ({ courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, ...(a.legoId ? { legoId: a.legoId } : {}), ...(a.voiceId ? { voiceId: a.voiceId } : {}), ...(a.approval ? { approval: a.approval } : {}), job: '#212', ...(dryRun ? { dryRun: true } : {}) });

async function main() {
  const [mode, file] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: check|text|audio|link|verify <fresh seeds.json>');
  const api = JSON.parse(fs.readFileSync(file, 'utf8'));
  const apply = process.env.APPLY_CONFIRM === '1';
  if (mode === 'check') { console.log(check(api, process.argv[4] ? JSON.parse(fs.readFileSync(process.argv[4], 'utf8')) : null).join('\n')); return; }
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
    if (apply) {
      const prior = JSON.parse(fs.readFileSync(path.join(DIR, 'audio-plan-dry.json'), 'utf8'));
      const refused = new Set(prior.filter((r) => r.dry.status !== 200).map((r) => `${r.role}\u0000${r.text}`));
      let spent = 0;
      for (const a of asks) {
        if (refused.has(`${a.role}\u0000${a.text}`)) { results.push({ ...a, real: { skipped: 'refused in dry run — held for a person' } }); continue; }
        const real = await post(`${POPTY}/api/audio/render`, renderBody(a, false));
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
      const dry = await post(`${POPTY}/api/audio/render`, renderBody(a, true));
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
    const { P, L } = load(api);
    const ops = [];
    for (const r of results) {
      if (!r.real || !r.real.audioId) continue;
      for (const s of r.slots) {
        const row = s.target === 'lego' ? L.get(s.lego_id) : P.get(sid(s.phrase_id)); if (!row) continue;
        const now = row[`${s.slot}_audio_id`];
        if (now === r.real.audioId) continue;
        if (now && now !== s.current) continue;
        ops.push(s.target === 'lego'
          ? { op: 'audio.link', target: 'lego', lego_id: s.lego_id, slot: s.slot, audio_id: r.real.audioId }
          : { op: 'audio.link', target: 'phrase', phrase_id: s.phrase_id, slot: s.slot, audio_id: r.real.audioId });
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
    const { P, L, phrases } = load(api);
    const bad = [];
    for (const [id, d] of Object.entries(DEC.phrases)) {
      const p = P.get(id);
      if (d.action === 'del') { if (p) bad.push(`${id} still present`); continue; }
      if (!p) { bad.push(`${id} missing`); continue; }
      if (d.target != null && p.target_text !== d.target) bad.push(`${id} target differs`);
      if (d.known != null && p.known_text !== d.known) bad.push(`${id} known differs`);
    }
    const l = L.get(DEC.lego);
    for (const s of ['known', 'target1', 'target2', 'presentation']) if (!l[`${s}_audio_id`]) bad.push(`${l.lego_id} ${s} empty`);
    const results = fs.existsSync(path.join(DIR, 'audio-results.json')) ? JSON.parse(fs.readFileSync(path.join(DIR, 'audio-results.json'), 'utf8')) : [];
    const pr = results.find((x) => x.role === 'presentation');
    if (!pr || !pr.real || pr.real.audioId !== l.presentation_audio_id) bad.push(`${l.lego_id} presentation is not the new intro clip (${l.presentation_audio_id})`);
    const basket = phrases.filter((q) => q._lego === l.lego_id);
    for (const p of basket) for (const s of ['known', 'target1', 'target2']) if (!p[`${s}_audio_id`]) bad.push(`${sid(p.id)} ${s} empty`);
    console.log(bad.length ? bad.join('\n') : `EMPTY SLOTS: 0 (${basket.length} rows incl. components + LEGO + intro); all decisions live`);
    return;
  }
  throw new Error(`unknown mode ${mode}`);
}
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { check, planText, planAudio };
