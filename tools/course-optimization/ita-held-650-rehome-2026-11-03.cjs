#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-held-650-rehome-2026-11-03.cjs — job #650, the knock-on of Kai's 3 Nov seed-311 ruling.
//
// Seed 311 now teaches "to believe | credere" (S0311L03, new). S0526L02 "to believe | credere" is therefore a LATER EXACT
// DUPLICATE on both sides → NOT NEW (L17, the duplicate rule, Kai 2026-09-23). A not-new basket is never played (P25), so in
// the same pass its rows worth drilling move under a NEW LEGO that they contain, its intro is detached (the clip is kept),
// and what cannot move is LISTED, never silently left:
//   B02 / U02 / U03 "I'm finding it hard to believe …" → S0526L01 "I'm finding it hard to | trovo difficile" (same text, same clips)
//   U05 "I find it hard to believe that it happened" → S0526L01, English made "I'm finding it hard to …" so it contains the LEGO
//   U01 "it's hard to believe | è difficile credere" → deleted: the exact pair is now S0311L03U01, played
//   B01 (the LEGO itself), B03 "hard to believe | difficile da credere", U04 "it's hard to believe the truth | è difficile credere
//   la verità" → stay under the dark LEGO, listed (no new LEGO of 526 in them; moving them back to 311 would add constructions)
// Also ruling 7's second half: S0313L02U04 → "he wants to remember all five games | vuole ricordare tutte e cinque le partite".
// Writes go through POST /api/production/ita_for_eng/edit-batch only (dry run unless APPLY_CONFIRM=1); one transaction, undo file.
//   node tools/course-optimization/ita-held-650-rehome-2026-11-03.cjs <fresh seeds.json>            # dry run
//   APPLY_CONFIRM=1 node tools/course-optimization/ita-held-650-rehome-2026-11-03.cjs <fresh seeds.json>
const fs = require('fs');
const COURSE = 'ita_for_eng';
const AGENT = 'ita-held-30-apply (job #650)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');

const MOVES = [ // [old id, new LEGO, new known | null]
  ['S0526L02B02', 'S0526L01', null],
  ['S0526L02U02', 'S0526L01', null],
  ['S0526L02U03', 'S0526L01', null],
  ['S0526L02U05', 'S0526L01', "I'm finding it hard to believe that it happened"],
];
const DELETES = [['S0526L02U01', 'exact twin of S0311L03U01 it\'s hard to believe | è difficile credere (played)']];
const PHRASE_EDITS = [
  ['S0313L02U04', ['he wants to believe in what happened in all five games', 'vuole credere ai fatti di tutte e cinque le partite'],
    ['he wants to remember all five games', 'vuole ricordare tutte e cinque le partite']],
];
const NOT_NEW = { lego: 'S0526L02', pair: ['to believe', 'credere'], earlier: 'S0311L03' };
const COPY = ['phrase_role', 'introduce', 'status', 'register', 'difficulty', 'connected_lego_ids', 'target_text_roman', 'metadata',
  'known_gloss_segments', 'word_count', 'target_syllable_count', 'known_audio_id', 'target1_audio_id', 'target2_audio_id'];

const sid = (id) => String(id).split(':').pop();
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
/** The live gate's rule (word multiset), both sides. */
function contains(hay, needle) { const have = {}; for (const w of words(hay)) have[w] = (have[w] || 0) + 1; for (const w of words(needle)) { if (!have[w]) return false; have[w]--; } return true; }
function legoPosition(known, legoKnown) { const k = norm(known), l = norm(legoKnown); if (k === l || k.startsWith(l + ' ')) return 'start'; if (k.endsWith(' ' + l)) return 'end'; return 'middle'; }

function plan(api, dz = require('../../services/phrase-decomposer.cjs')) {
  const legos = [], phrases = [];
  for (const s of api.seeds) for (const l of s.legos || []) { legos.push(l); for (const p of l.basket_phrases || []) phrases.push(p); }
  const L = new Map(legos.map((l) => [l.lego_id, l])), P = new Map(phrases.map((p) => [sid(p.id), p]));
  const ops = [], problems = [], notes = [];
  const dup = L.get(NOT_NEW.lego), earlier = L.get(NOT_NEW.earlier);
  if (!dup || dup.known_text !== NOT_NEW.pair[0] || dup.target_text !== NOT_NEW.pair[1]) problems.push(`${NOT_NEW.lego} drifted`);
  if (!earlier || !earlier.is_new || earlier.known_text !== NOT_NEW.pair[0] || earlier.target_text !== NOT_NEW.pair[1]) problems.push(`${NOT_NEW.earlier} is not the new exact pair yet`);
  if (dup && dup.is_new) {
    ops.push({ op: 'lego.update', lego_id: dup.lego_id, set: { is_new: false }, expect: { known_text: dup.known_text, target_text: dup.target_text } });
    if (dup.presentation_audio_id) ops.push({ op: 'audio.link', target: 'lego', lego_id: dup.lego_id, slot: 'presentation', audio_id: null });
  }
  const nextPos = new Map(), nextU = new Map();
  for (const [oldId, legoId, newKnown] of MOVES) {
    const p = P.get(oldId), to = L.get(legoId);
    if (!p) { problems.push(`${oldId} gone`); continue; }
    if (!to || !to.is_new) { problems.push(`${legoId} is not a new LEGO`); continue; }
    const known = newKnown || p.known_text;
    if (!contains(known, to.known_text) || !contains(p.target_text, to.target_text)) { problems.push(`${oldId} would not contain ${legoId}`); continue; }
    const basket = phrases.filter((q) => sid(q.id).startsWith(legoId));
    if (basket.some((q) => norm(q.known_text) === norm(known) && norm(q.target_text) === norm(p.target_text))) { problems.push(`${oldId} would twin a row of ${legoId}`); continue; }
    if (!nextPos.has(legoId)) {
      nextPos.set(legoId, Math.max(0, ...basket.map((q) => q.position || 0)) + 1);
      nextU.set(legoId, Math.max(0, ...basket.filter((q) => /U\d+$/.test(sid(q.id))).map((q) => Number(sid(q.id).slice(9)))) + 1);
    }
    const newId = `${legoId}U${String(nextU.get(legoId)).padStart(2, '0')}`; nextU.set(legoId, nextU.get(legoId) + 1);
    const vocab = legos.filter((l) => l.seed_number <= to.seed_number).map((l) => ({ lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text, seed_number: l.seed_number }));
    const dec = dz.decomposeAnchored(p.target_text, vocab, { lego_id: to.lego_id, target_text: to.target_text, known_text: to.known_text }, COURSE);
    const row = { id: `${COURSE}:${newId}`, course_code: COURSE, seed_number: to.seed_number, lego_index: to.lego_index, known_text: known, target_text: p.target_text,
      position: nextPos.get(legoId), lego_position: legoPosition(known, to.known_text), lego_count: p.lego_count };
    nextPos.set(legoId, nextPos.get(legoId) + 1);
    for (const c of COPY) if (p[c] !== undefined) row[c] = p[c];
    row.phrase_role = 'use';
    if (newKnown) row.known_audio_id = null; // the English changed: its clip no longer speaks the row
    if (dec && dec.kind !== 'error' && dec.blocks) row.decomposition = dec.blocks;
    ops.push({ op: 'phrase.insert', row });
    ops.push({ op: 'phrase.delete', phrase_id: p.id, expect: { known_text: p.known_text, target_text: p.target_text } });
    notes.push(`${oldId} → ${newId}: ${known} | ${p.target_text}`);
  }
  for (const [id, why] of DELETES) {
    const p = P.get(id); if (!p) { problems.push(`${id} gone`); continue; }
    ops.push({ op: 'phrase.delete', phrase_id: p.id, expect: { known_text: p.known_text, target_text: p.target_text } });
    notes.push(`${id} deleted: ${why}`);
  }
  for (const [id, now, fix] of PHRASE_EDITS) {
    const p = P.get(id); if (!p) { problems.push(`${id} gone`); continue; }
    if (p.known_text !== now[0] || p.target_text !== now[1]) { problems.push(`${id} drifted: ${p.known_text} | ${p.target_text}`); continue; }
    ops.push({ op: 'phrase.update', phrase_id: p.id, set: { known_text: fix[0], target_text: fix[1], word_count: fix[1].length }, expect: { known_text: now[0], target_text: now[1] } });
    // no unlink op: the text-change trigger on course_practice_phrases clears the clips of a side whose words change
    notes.push(`${id}: ${fix[0]} | ${fix[1]}`);
  }
  const stay = phrases.filter((q) => sid(q.id).startsWith(NOT_NEW.lego) && q.phrase_role !== 'component' && !MOVES.some((m) => m[0] === sid(q.id)) && !DELETES.some((d) => d[0] === sid(q.id)))
    .map((q) => `${sid(q.id)} ${q.known_text} | ${q.target_text}`);
  return { ops, problems, notes, stay };
}

async function main() {
  const file = process.argv[2]; if (!file) throw new Error('usage: <fresh seeds.json>');
  const p = plan(JSON.parse(fs.readFileSync(file, 'utf8')));
  for (const n of p.notes) console.log('  ', n);
  console.log('stays under the dark S0526L02 (listed):'); for (const s of p.stay) console.log('   ', s);
  if (p.problems.length) { console.log('STOP:', p.problems); process.exitCode = 1; return; }
  const post = async (body) => { const r = await fetch(`${POPTY}/api/production/${COURSE}/edit-batch`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
  const dry = await post({ ops: p.ops });
  console.log(`dry run ${dry.status} ${dry.body.error || ''} (${p.ops.length} ops)`);
  if (dry.status !== 200 || process.env.APPLY_CONFIRM !== '1') return;
  const ap = await post({ ops: p.ops, apply: true });
  console.log(`APPLIED ${ap.status} event ${ap.body.event_id} undo ${ap.body.undo_file} ${ap.body.error || ''}`);
}
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { plan, contains };
