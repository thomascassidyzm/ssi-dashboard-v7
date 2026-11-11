#!/usr/bin/env node
'use strict';
// tools/course-optimization/spa-missing-lego-2026-11-11.cjs — job #177, applying the spa_for_eng missing-LEGO family
// (v4 draft #173, d/11d06f02) under Kai's 11 Nov ruling: the assistant leads the rewrite, a separate check covers it, then apply.
// Decisions (v4 + #177's check overrides, each with its reason) are ops/spa-missing-lego-apply/decisions.json, built by
// decisions_src.py. Every row carries the live text v4 read; a row whose live text no longer matches is SKIPPED as drifted
// (another job moved it), never forced.
//
// Writes go through Popty only: POST /api/production/spa_for_eng/edit-batch (dry run unless APPLY_CONFIRM=1), then
// POST /api/audio/render (dry run unless APPLY_CONFIRM=1), then audio.link through edit-batch for slots still on an old clip.
//   curl -s http://localhost:3470/api/production/spa_for_eng/seeds > seeds.json
//   node tools/course-optimization/spa-missing-lego-2026-11-11.cjs text seeds.json      # dry run of the text batch
//   APPLY_CONFIRM=1 node … text seeds.json                                              # apply; writes ops/…/applied.json + undo
//   node … audio seeds.json   (fresh seeds.json after the text apply)                   # render plan, dry run
//   APPLY_CONFIRM=1 node … audio seeds.json                                             # render once each
//   APPLY_CONFIRM=1 node … link seeds.json  (fresh)                                     # point stale/empty slots at the new clips
//   node … verify seeds.json  (fresh)                                                   # P17 + basket floor + empty + stale check
const fs = require('fs');
const path = require('path');
const COURSE = 'spa_for_eng';
const AGENT = 'spa-missing-lego-apply (job #177)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const DIR = path.join(__dirname, '../../ops/spa-missing-lego-apply');
const DEC = JSON.parse(fs.readFileSync(path.join(DIR, 'decisions.json'), 'utf8'));
const PURPOSE = 'spa_for_eng missing-LEGO family (#177, Kai ruling 11 Nov): voice rewritten and new practice rows';

const sid = (id) => String(id).split(':').pop();
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"¿¡«»]+/g, ' ').replace(/\s+/g, ' ').trim();
// Containment per P17 as widened by K49 (Kai 19 Oct): words may sit INSIDE the LEGO, so the LEGO's words must appear in
// order, not necessarily side by side ('tu idea no fue' contains 'tu idea fue'; 'wasn't' carries 'was').
function contains(text, lego) {
  const t = norm(text).split(' '), l = norm(lego).split(' ');
  let i = 0;
  for (const w of t) if (i < l.length && (w === l[i] || w.startsWith(l[i] + "'") || w === l[i] + "n't")) i++;
  return i === l.length;
}
// Known-side senses Kai has ruled for a LEGO beyond its gloss. S0145L01 'already | ya': seed 145 is 'Why are you not happy
// any more? | ¿Por qué ya no estás contento?', and Kai ruled on 11 Nov that 'Not any more | Ya no' stays in this basket, so
// a 'ya no' row whose English says 'any more' contains the LEGO.
const KNOWN_SENSES = { S0145L01: ['already', 'any more'] };
const containsLego = (p, l) => contains(p.target_text, l.target_text) && (KNOWN_SENSES[l.lego_id] || [l.known_text]).some((k) => contains(p.known_text, k));
function legoPosition(known, legoKnown) { const k = norm(known), l = norm(legoKnown); if (k === l || k.startsWith(l + ' ')) return 'start'; if (k.endsWith(' ' + l)) return 'end'; return 'middle'; }

function load(api) {
  const legos = [], phrases = [];
  for (const s of api.seeds) for (const l of s.legos || []) { legos.push({ ...l, seed_number: l.seed_number ?? s.seed_number }); for (const p of l.basket_phrases || []) phrases.push({ ...p, _lego: l.lego_id }); }
  return { legos, phrases, L: new Map(legos.map((l) => [l.lego_id, l])), P: new Map(phrases.map((p) => [sid(p.id), p])) };
}

/** Text batch: updates, deletes, inserts (with fresh ids), and a 1..n position renumber on LEGOs that gain rows. */
function planText(api, dz = require('../../services/phrase-decomposer.cjs')) {
  const { legos, phrases, L, P } = load(api);
  const ops = [], problems = [], notes = [], drifted = [], newIds = [];
  const vocabFor = (seed) => legos.filter((l) => l.seed_number <= seed).map((l) => ({ lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text, seed_number: l.seed_number }));
  const decompose = (text, lego) => dz.decomposeAnchored(text, vocabFor(lego.seed_number), { lego_id: lego.lego_id, target_text: lego.target_text, known_text: lego.known_text }, COURSE);
  const deleted = new Set();
  for (const d of DEC.rows) {
    if (d.action !== 'REWRITE' && d.action !== 'DELETE') continue;
    const p = P.get(d.row_id);
    if (!p) { drifted.push(`${d.row_id} gone`); continue; }
    if (p.known_text !== d.live.en || p.target_text !== d.live.es) { drifted.push(`${d.row_id} now "${p.known_text} | ${p.target_text}"`); continue; }
    const expect = { known_text: p.known_text, target_text: p.target_text };
    if (d.action === 'DELETE') { ops.push({ op: 'phrase.delete', phrase_id: p.id, expect }); deleted.add(d.row_id); notes.push(`DEL ${d.row_id}: ${p.known_text} | ${p.target_text}`); continue; }
    const lego = L.get(p._lego);
    const set = { known_text: d.proposed.en, target_text: d.proposed.es, lego_position: legoPosition(d.proposed.en, lego.known_text) };
    const dec = decompose(set.target_text, lego);
    if (dec && dec.blocks && dec.kind !== 'error') set.decomposition = dec.blocks; else problems.push(`${d.row_id}: decomposer ${dec && dec.kind}`);
    ops.push({ op: 'phrase.update', phrase_id: p.id, expect, set });
    notes.push(`UPD ${d.row_id}: ${p.known_text} | ${p.target_text}  →  ${set.known_text} | ${set.target_text}  [${dec && dec.kind}]`);
  }
  // Inserts, grouped per LEGO so the basket can be renumbered once.
  const byLego = new Map();
  for (const d of DEC.rows) if (d.action === 'NEW-B' || d.action === 'NEW-U') { if (!byLego.has(d.lego_id)) byLego.set(d.lego_id, []); byLego.get(d.lego_id).push(d); }
  for (const [legoId, news] of byLego) {
    const lego = L.get(legoId);
    if (!lego) { problems.push(`${legoId} gone`); continue; }
    const basket = phrases.filter((p) => p._lego === legoId && p.phrase_role !== 'component');
    const have = new Set(basket.map((p) => norm(p.known_text) + '|' + norm(p.target_text)));
    const maxIdx = { build: 0, use: 0 };
    for (const p of phrases.filter((q) => q._lego === legoId)) { const m = /([BU])(\d+)$/.exec(sid(p.id)); if (m) { const r = m[1] === 'B' ? 'build' : 'use'; maxIdx[r] = Math.max(maxIdx[r], +m[2]); } }
    const keep = basket.filter((p) => !deleted.has(sid(p.id))).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    let builds = keep.filter((p) => p.phrase_role === 'build'), uses = keep.filter((p) => p.phrase_role === 'use');
    const sib = (role) => (role === 'build' ? builds : uses)[0] || keep[0];
    const fresh = [];
    for (const d of news) {
      const role = d.proposed.role;
      if (have.has(norm(d.proposed.en) + '|' + norm(d.proposed.es))) { drifted.push(`${d.new_key}: already in the basket`); continue; }
      if (!containsLego({ known_text: d.proposed.en, target_text: d.proposed.es }, lego)) { problems.push(`${d.new_key}: does not contain the LEGO (P17)`); continue; }
      const idx = ++maxIdx[role];
      const id = `${COURSE}:${legoId}${role === 'build' ? 'B' : 'U'}${String(idx).padStart(2, '0')}`;
      const s = sib(role) || {};
      const dec = decompose(d.proposed.es, lego);
      if (!(dec && dec.blocks && dec.kind !== 'error')) problems.push(`${d.new_key}: decomposer ${dec && dec.kind}`);
      const row = { id, course_code: COURSE, seed_number: lego.seed_number, lego_index: lego.lego_index, phrase_role: role,
        known_text: d.proposed.en, target_text: d.proposed.es, status: s.status || 'draft', introduce: s.introduce ?? true,
        metadata: { format: 'build_use', pipeline: 'v2', added_by: 'job #177 missing-LEGO family (v4 d/11d06f02)' },
        lego_position: legoPosition(d.proposed.en, lego.known_text), connected_lego_ids: [], decomposition: dec && dec.blocks, position: 0,
        // word_count is NOT NULL; the course stores known + target words together ('Not any more | Ya no' = 5).
        word_count: norm(d.proposed.en).split(' ').length + norm(d.proposed.es).split(' ').length,
        lego_count: ((dec && dec.blocks) || []).filter((b) => b && b.legoId && !b.isGhost).length || 1 };
      fresh.push(row); newIds.push(sid(id));
      notes.push(`INS ${sid(id)} (${d.new_key}): ${row.known_text} | ${row.target_text}  [${dec && dec.kind}]`);
    }
    if (!fresh.length) continue;
    const anchor = DEC.place_after[legoId];
    const fb = fresh.filter((r) => r.phrase_role === 'build'), fu = fresh.filter((r) => r.phrase_role === 'use');
    const at = anchor ? builds.findIndex((p) => sid(p.id) === anchor) : -1;
    builds = at >= 0 ? [...builds.slice(0, at + 1), ...fb, ...builds.slice(at + 1)] : [...builds, ...fb];
    uses = [...uses, ...fu];
    // (course, seed, lego_index, position) is unique, so a shifted row parks at 1000+ first, the new rows go in, then the
    // parked rows take their final place — all inside the one batch transaction.
    // Component rows share the position space and are never played or moved: skip the positions they hold.
    const held = new Set(phrases.filter((q) => q._lego === legoId && q.phrase_role === 'component').map((q) => q.position));
    let next = 0; const take = () => { do next++; while (held.has(next)); return next; };
    const order = [...builds, ...uses].map((r) => ({ r, pos: take() }));
    const moved = order.filter(({ r, pos }) => !fresh.includes(r) && r.position !== pos);
    for (const { r, pos } of moved) ops.push({ op: 'phrase.update', phrase_id: r.id, expect: { position: r.position }, set: { position: 1000 + pos } });
    for (const { r, pos } of order) if (fresh.includes(r)) { r.position = pos; ops.push({ op: 'phrase.insert', row: r }); }
    for (const { r, pos } of moved) ops.push({ op: 'phrase.update', phrase_id: r.id, expect: { position: 1000 + pos }, set: { position: pos } });
  }
  return { ops, problems, notes, drifted, newIds };
}

/** Every slot of a rewritten or inserted row: one render ask per (role, text). */
function planAudio(api, applied) {
  const { P } = load(api);
  const asks = new Map(), problems = [];
  const add = (role, text, slot) => { const k = `${role}\u0000${text}`; if (!asks.has(k)) asks.set(k, { role, text, slots: [] }); asks.get(k).slots.push(slot); };
  for (const id of applied.touched) {
    const p = P.get(id); if (!p) { problems.push(`${id} missing`); continue; }
    const t = { phrase_id: p.id, current: {} };
    for (const s of ['known', 'target1', 'target2']) t.current[s] = p[`${s}_audio_id`] || null;
    add('target1', p.target_text, { ...t, slot: 'target1' });
    add('target2', p.target_text, { ...t, slot: 'target2' });
    add('known', p.known_text, { ...t, slot: 'known' });
  }
  return { asks: [...asks.values()], problems };
}

// A 300-op batch can outrun fetch's default 300 s header timeout; a request that dies mid-apply leaves the outcome unknown,
// so the batch calls wait up to 30 minutes.
const { Agent, fetch } = require('undici');
const SLOW = new Agent({ headersTimeout: 30 * 60e3, bodyTimeout: 30 * 60e3 });
async function post(url, body) { const r = await fetch(url, { dispatcher: SLOW, method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; }
const batch = (body) => post(`${POPTY}/api/production/${COURSE}/edit-batch`, body);
const save = (name, obj) => { const f = path.join(DIR, name); fs.writeFileSync(f, JSON.stringify(obj, null, 1)); console.log('wrote', f); };
const read = (name) => JSON.parse(fs.readFileSync(path.join(DIR, name), 'utf8'));

async function main() {
  const [mode, file] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: text|audio|link|verify <fresh seeds.json>');
  const api = JSON.parse(fs.readFileSync(file, 'utf8'));
  const apply = process.env.APPLY_CONFIRM === '1';
  if (mode === 'text') {
    const p = planText(api);
    for (const n of p.notes) console.log('  ', n);
    console.log(`drifted/skipped ${p.drifted.length}:`, p.drifted);
    if (p.problems.length) { console.log('STOP:', p.problems); process.exitCode = 1; return; }
    // One 328-op batch outran the server's request timeout and rolled back whole (11 Nov), so the batch goes in chunks of
    // whole LEGOs (a LEGO's renumbering must stay in one transaction), each dry-run then applied, its event and undo kept.
    const legoOf = (o) => /(S\d{4}L\d{2})/.exec(o.phrase_id || (o.row && o.row.id) || '')[1];
    const groups = new Map(); for (const o of p.ops) { const k = legoOf(o); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(o); }
    const chunks = []; let cur = [];
    for (const g of groups.values()) { if (cur.length && cur.length + g.length > 40) { chunks.push(cur); cur = []; } cur.push(...g); }
    if (cur.length) chunks.push(cur);
    const prior = fs.existsSync(path.join(DIR, 'applied.json')) ? read('applied.json') : { events: [], touched: [], deleted: [] };
    const doneLegos = new Set(prior.done_legos || []);
    for (const [n, ops] of chunks.entries()) {
      const legosHere = [...new Set(ops.map(legoOf))];
      if (legosHere.every((l) => doneLegos.has(l))) continue;
      const dry = await batch({ ops });
      console.log(`chunk ${n + 1}/${chunks.length} dry run ${dry.status} ${dry.body.error || ''} (${ops.length} ops: ${legosHere.join(' ')})`);
      if (dry.status !== 200) { console.log(JSON.stringify(dry.body).slice(0, 3000)); process.exitCode = 1; return; }
      if (!apply) continue;
      const ap = await batch({ ops, apply: true });
      console.log(`  APPLIED ${ap.status} event ${ap.body.event_id} ${ap.body.error || ''}`);
      if (ap.status !== 200) { process.exitCode = 1; return; }
      prior.events.push(ap.body.event_id);
      prior.touched.push(...ops.filter((o) => o.op === 'phrase.update' && o.set.target_text).map((o) => sid(o.phrase_id)), ...ops.filter((o) => o.op === 'phrase.insert').map((o) => sid(o.row.id)));
      prior.deleted.push(...ops.filter((o) => o.op === 'phrase.delete').map((o) => sid(o.phrase_id)));
      prior.done_legos = [...doneLegos, ...legosHere]; legosHere.forEach((l) => doneLegos.add(l));
      prior.drifted = p.drifted; prior.legos = [...new Set(DEC.rows.map((d) => d.lego_id))];
      save('applied.json', prior);
      save(`undo-text-${n + 1}.json`, { event_id: ap.body.event_id, undo_file: ap.body.undo_file, ops: ap.body.undo_ops || ap.body.undo });
    }
    return;
  }
  if (mode === 'audio') {
    // The plan is frozen on the first pass (audio-asks.json) so each slot keeps the clip it held BEFORE any render, and the
    // real pass saves after every ask: Popty restarts several times a day under parallel deploys, and a resumed pass skips
    // what is done. A dropped connection is not a refusal — the same ask is re-sent once Popty answers again, and a take
    // that did land comes back from the library for nothing. A refusal (409/402) is recorded and never retried.
    const planFile = path.join(DIR, 'audio-asks.json');
    let asks;
    if (fs.existsSync(planFile)) asks = read('audio-asks.json');
    else { const pl = planAudio(api, read('applied.json')); if (pl.problems.length) { console.log('STOP:', pl.problems); process.exitCode = 1; return; } asks = pl.asks; if (apply) save('audio-asks.json', asks); }
    let would = 0, spent = 0;
    if (!apply) {
      const results = [];
      const k = Math.max(1, Math.floor(asks.length / Number(process.env.DRY_SAMPLE || 12)));
      for (const a of asks.filter((_, i) => i % k === 0)) {
        const dry = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, dryRun: true });
        would += dry.body.wouldSpendChars || 0;
        console.log(`dry ${dry.status} ${a.role} "${a.text}" → ${dry.body.source || dry.body.code || dry.body.error} ${dry.body.wouldSpendChars || 0}`);
        results.push({ ...a, dry: { status: dry.status, source: dry.body.source, code: dry.body.code, error: dry.body.error, wouldSpendChars: dry.body.wouldSpendChars } });
      }
      console.log(`dry sample would spend ${would} chars (plan: ${asks.length} asks)`); save('audio-plan-dry.json', results); return;
    }
    const resFile = path.join(DIR, 'audio-results.json');
    const results = fs.existsSync(resFile) ? read('audio-results.json') : [];
    const done = new Set(results.map((r) => `${r.role}\u0000${r.text}`));
    for (const a of asks) {
      if (done.has(`${a.role}\u0000${a.text}`)) continue;
      let real;
      for (let tries = 0; ; tries++) {
        try { real = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE }); break; }
        catch (e) { if (tries >= 20) throw e; console.log(`  connection lost (${e.cause && e.cause.code || e.message}); waiting for Popty`); await new Promise((r) => setTimeout(r, 30e3)); }
      }
      spent += real.body.charsSpent || 0;
      console.log(`real ${real.status} ${a.role} "${a.text}" → ${real.body.source || real.body.code} ${real.body.audioId || ''} ${real.body.charsSpent || 0}`);
      results.push({ ...a, real: { status: real.status, source: real.body.source, audioId: real.body.audioId, charsSpent: real.body.charsSpent, code: real.body.code, error: real.body.error } });
      fs.writeFileSync(resFile, JSON.stringify(results, null, 1));
    }
    console.log(`spent ${spent} chars this pass; ${results.length}/${asks.length} asks recorded`); return;
  }
  if (mode === 'link') {
    const results = read('audio-results.json');
    const { P } = load(api);
    const ops = [];
    for (const r of results) {
      if (!r.real || !r.real.audioId) continue;
      for (const s of r.slots) {
        const row = P.get(sid(s.phrase_id)); if (!row) continue;
        const now = row[`${s.slot}_audio_id`];
        if (now === r.real.audioId) continue;
        if (now && now !== s.current[s.slot]) continue; // filled fresh by someone else since the plan
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
  if (mode === 'hold') {
    // Rows whose new words exist only as off-cast clips (EXISTS_IN_LANGUAGE: a cast-voice take needs Kai's re-record grant)
    // cannot be voiced, and a slot left on its old clip would play the old words. As in #144, such a row goes back to how it
    // was — text, tiling and clips from the pre-apply snapshot (argv[4]) — and an inserted row is removed; all are listed
    // for Kai. A row is held if ANY of its slots was refused.
    const results = read('audio-results.json');
    const snap = load(JSON.parse(fs.readFileSync(process.argv[4], 'utf8'))).P;
    const { P } = load(api);
    const held = new Map();
    for (const r of results) if (!(r.real && r.real.audioId)) for (const s of r.slots) { const id = sid(s.phrase_id); if (!held.has(id)) held.set(id, []); held.get(id).push(`${s.slot}: ${(r.real && (r.real.code || r.real.error)) || 'no clip'} "${r.text}"`); }
    const ops = [];
    for (const [id, why] of held) {
      const now = P.get(id), was = snap.get(id);
      if (!now) continue;
      const expect = { known_text: now.known_text, target_text: now.target_text };
      if (!was) { ops.push({ op: 'phrase.delete', phrase_id: now.id, expect }); console.log(`HOLD (remove new row) ${id}: ${now.known_text} | ${now.target_text} — ${why.join('; ')}`); continue; }
      const set = {}; for (const c of ['known_text', 'target_text', 'decomposition', 'lego_position', 'known_audio_id', 'target1_audio_id', 'target2_audio_id']) set[c] = was[c] ?? null;
      ops.push({ op: 'phrase.update', phrase_id: now.id, expect, set });
      console.log(`HOLD (back to "${was.known_text} | ${was.target_text}") ${id} — ${why.join('; ')}`);
    }
    console.log(`${ops.length} hold ops`);
    save('held.json', [...held].map(([id, why]) => ({ id, why })));
    if (!ops.length) return;
    const dry = await batch({ ops });
    console.log(`dry run ${dry.status} ${dry.body.error || ''}`);
    if (dry.status !== 200) { console.log(JSON.stringify(dry.body).slice(0, 3000)); process.exitCode = 1; return; }
    if (!apply) return;
    const ap = await batch({ ops, apply: true });
    console.log(`APPLIED ${ap.status} event ${ap.body.event_id} undo ${ap.body.undo_file}`);
    save('undo-hold.json', { event_id: ap.body.event_id, undo_file: ap.body.undo_file, ops: ap.body.undo_ops || ap.body.undo });
    const a = read('applied.json'); const h = new Set(held.keys());
    a.held = [...h]; a.touched = a.touched.filter((x) => !h.has(x)); save('applied.json', a);
    return;
  }
  if (mode === 'verify') {
    // Knock-on check over every LEGO the family touched: each touched row contains its LEGO on both sides (P17), no basket
    // lost its last BUILD or USE row, deletes are gone, no touched slot is empty — and no touched slot is STALE: a dry-run
    // audio.link of each slot's current clip is refused by the door unless the clip speaks the row's words.
    const applied = read('applied.json');
    const { L, P, phrases } = load(api);
    const bad = [];
    for (const id of applied.deleted) if (P.get(id)) bad.push(`${id} still present`);
    const links = [];
    for (const id of applied.touched) {
      const p = P.get(id); if (!p) { bad.push(`${id} missing`); continue; }
      const l = L.get(p._lego);
      if (!containsLego(p, l)) bad.push(`${id} P17: lacks "${l.known_text} | ${l.target_text}"`);
      for (const s of ['known', 'target1', 'target2']) { const a = p[`${s}_audio_id`]; if (!a) bad.push(`${id} ${s} EMPTY`); else links.push({ op: 'audio.link', target: 'phrase', phrase_id: p.id, slot: s, audio_id: a }); }
    }
    for (const lid of applied.legos) {
      const b = phrases.filter((p) => p._lego === lid && p.phrase_role !== 'component');
      const nb = b.filter((p) => p.phrase_role === 'build').length, nu = b.filter((p) => p.phrase_role === 'use').length;
      console.log(`  ${lid} new=${L.get(lid).is_new} build ${nb} use ${nu}`);
      if (!nb || !nu) bad.push(`${lid} basket now build ${nb} / use ${nu}`);
    }
    if (links.length) {
      const dry = await batch({ ops: links });
      console.log(`stale check: dry-run re-link of ${links.length} current slot clips → ${dry.status} ${dry.body.error || ''}`);
      if (dry.status !== 200) bad.push(`STALE: ${JSON.stringify(dry.body).slice(0, 2000)}`);
    }
    console.log(bad.length ? bad.join('\n') : 'VERIFY: 0 empty, 0 stale, P17 holds, no basket emptied');
    if (bad.length) process.exitCode = 1;
    return;
  }
  throw new Error(`unknown mode ${mode}`);
}
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { planText, planAudio };
