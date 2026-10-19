#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-538-l03-notnew-2026-10-19.cjs — deu_for_eng S0538L03 (job #252, Kai 19 Oct 2026).
//
// S0538L03 "as though | als ob" duplicates S0497L04 "as though | als ob" on BOTH sides (the duplicate rule, Kai 2026-09-23),
// so the later one is introduced once: it goes NOT NEW (L17/L27(2)), with no intro of its own (the S0519L04 / ita 201
// precedent: a not-new LEGO is not introduced). Never delete a LEGO. A not-new LEGO's basket is never played (P25), so its
// one full-sentence row — "she doesn't want to seem as though she doesn't care" — MOVES under S0538L01 "to seem as though |
// so wirken, als ob" (new), which it contains on both sides, keeping its clips (0 characters). Its other rows are fragments
// ("as though she could | als ob sie könnte"): a fragment may never be a USE row (P7), so they are NOT rehomed as they stand;
// they go dark with the LEGO and are listed for Kai (rewriting them into sentences needs audio).
//
//   node …/deu-538-l03-notnew-2026-10-19.cjs check <seeds.json>      # the plan on this dump (pure)
//   APPLY_CONFIRM=1 node …  run <seeds.json>                        # edit-batch preview, then apply
//   node …/deu-538-l03-notnew-2026-10-19.cjs verify <seeds.json>
const fs = require('fs');
const path = require('path');
const K = require('./deu-k48-group-a-2026-10-19.cjs');

const COURSE = 'deu_for_eng';
const AGENT = 'deu-538-l03-notnew (job #252)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const LEGO = 'S0538L03', EARLIER = 'S0497L04', HOME = 'S0538L01';
const MOVE = [['U21', 'U22']]; // [from suffix under L03, to suffix under L01]
const sid = (id) => String(id).split(':').pop();
const P = (id) => `${COURSE}:${id}`;

function plan(db) {
  const l3 = db.legos.find((l) => l.lego_id === LEGO), early = db.legos.find((l) => l.lego_id === EARLIER), home = db.legos.find((l) => l.lego_id === HOME);
  if (!l3 || !early || !home) throw new Error('LEGOs missing from the dump');
  if (K.fold(l3.target_text) !== K.fold(early.target_text) || K.foldKnown(l3.known_text) !== K.foldKnown(early.known_text)) throw new Error(`${LEGO} no longer duplicates ${EARLIER} on both sides`);
  if (!home.is_new) throw new Error(`${HOME} is not new — no played home`);
  const out = { notNew: l3.is_new !== false, unlinkIntro: !!l3.presentation_audio_id, wasIntro: l3.presentation_audio_id, moves: [], dark: [] };
  const homeRows = db.phrases.filter((p) => sid(p.id).startsWith(HOME));
  let pos = Math.max(0, ...homeRows.map((p) => p.position || 0)) + 1;
  for (const [from, to] of MOVE) {
    const r = db.phrases.find((p) => sid(p.id) === `${LEGO}${from}`);
    if (!r) { if (db.phrases.find((p) => sid(p.id) === `${HOME}${to}`)) continue; throw new Error(`${LEGO}${from} missing`); }
    if (!K.containsLego(r, { known: home.known_text, target: home.target_text })) throw new Error(`${LEGO}${from} does not contain ${HOME}`);
    if (homeRows.some((h) => K.fold(h.target_text) === K.fold(r.target_text) && K.foldKnown(h.known_text) === K.foldKnown(r.known_text))) throw new Error(`${HOME} already has ${from}'s sentence`);
    const row = { ...r, id: P(`${HOME}${to}`), lego_index: home.lego_index, position: pos++, metadata: { ...(r.metadata || {}), rehomed_from: `${LEGO}${from}`, rehomed_by: 'job #252 (P25: S0538L03 not new)' } };
    for (const c of ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id', 'last_edit_event_id', 'created_at', 'updated_at', 'version', 'qa_checked']) delete row[c];
    out.moves.push({ from: sid(r.id), to: `${HOME}${to}`, row, clips: { known: r.known_audio_id, target1: r.target1_audio_id, target2: r.target2_audio_id }, before: r });
  }
  for (const r of db.phrases.filter((p) => sid(p.id).startsWith(LEGO) && p.phrase_role !== 'component' && !MOVE.some(([f]) => sid(p.id) === `${LEGO}${f}`))) out.dark.push(`${sid(r.id)}: ${r.known_text} | ${r.target_text}`);
  return out;
}

function editOps(p) {
  const ops = [];
  if (p.notNew) ops.push({ op: 'lego.update', lego_id: LEGO, set: { is_new: false }, expect: { is_new: true } });
  if (p.unlinkIntro) ops.push({ op: 'audio.link', target: 'lego', lego_id: LEGO, slot: 'presentation', audio_id: null });
  for (const m of p.moves) {
    ops.push({ op: 'phrase.insert', row: m.row });
    for (const slot of ['known', 'target1', 'target2']) if (m.clips[slot]) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: m.row.id, slot, audio_id: m.clips[slot] });
    ops.push({ op: 'phrase.delete', phrase_id: P(m.from) });
  }
  return ops;
}

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function main() {
  const [mode, file] = process.argv.slice(2);
  const db = K.fromApi(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (mode === 'verify') {
    const l3 = db.legos.find((l) => l.lego_id === LEGO), bad = [];
    if (l3.is_new !== false) bad.push(`${LEGO} still new`);
    if (l3.presentation_audio_id) bad.push(`${LEGO} still has an intro link`);
    for (const [f, t] of MOVE) {
      const r = db.phrases.find((x) => sid(x.id) === `${HOME}${t}`);
      if (!r) bad.push(`${HOME}${t} missing`); else for (const c of ['known_audio_id', 'target1_audio_id', 'target2_audio_id']) if (!r[c]) bad.push(`${HOME}${t} ${c} empty`);
      if (db.phrases.find((x) => sid(x.id) === `${LEGO}${f}`)) bad.push(`${LEGO}${f} still there`);
    }
    console.log(`verify: ${bad.length} breaches`); for (const b of bad) console.log('  ', b); process.exitCode = bad.length ? 1 : 0; return;
  }
  const p = plan(db);
  const audit = require('./audit-phrase-zut.cjs');
  const post_ = { ...db, legos: db.legos.map((l) => ({ ...l, id: l.lego_id })), phrases: db.phrases.filter((r) => !p.moves.some((m) => sid(r.id) === m.from)).concat(p.moves.map((m) => m.row)) };
  const zut = [audit.auditRows({ ...db, legos: post_.legos }).bidirectional.violationsStrict.length, audit.auditRows(post_).bidirectional.violationsStrict.length];
  console.log(`plan: not-new ${p.notNew}, intro unlink ${p.unlinkIntro}, ${p.moves.length} row moved (${p.moves.map((m) => `${m.from}→${m.to}`).join(', ')}), ${p.dark.length} fragment rows go dark; ZUT strict ${zut[0]} → ${zut[1]}`);
  for (const d of p.dark) console.log('  dark:', d);
  if (mode === 'check') return;
  const ops = editOps(p);
  const prev = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops });
  console.log(`preview HTTP ${prev.status} ${JSON.stringify(prev.body.error || '').slice(0, 300)}`);
  if (prev.status !== 200 || process.env.APPLY_CONFIRM !== '1') return;
  const res = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops, apply: true });
  const log = { job: '#252', at: new Date().toISOString(), plan: p, ops, applied: { status: res.status, event: res.body.event_id, undo_file: res.body.undo_file, undo: res.body.undo_ops || res.body.undo, error: res.status === 200 ? undefined : res.body } };
  const f = path.join(process.env.LOG_DIR || process.cwd(), `deu-538-l03-applied-${log.at.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(f, JSON.stringify(log, null, 2));
  console.log(`APPLY HTTP ${res.status}; event ${log.applied.event}; log ${f}`);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { plan, editOps, LEGO, EARLIER, HOME, MOVE };
