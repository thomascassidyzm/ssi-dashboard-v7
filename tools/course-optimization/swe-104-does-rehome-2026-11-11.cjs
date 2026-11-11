#!/usr/bin/env node
'use strict';
// tools/course-optimization/swe-104-does-rehome-2026-11-11.cjs — job #133, follow-up to #120·AH (Kai approved, 11 Nov).
//
// #120 flipped S0104L02 "does | gör" NOT NEW (edit-batch b456020b): it is a two-sided duplicate of S0059L02 "does | gör"
// (new, seed 59). A not-new basket is never played (canon P25), so its drill rows move under a NEW LEGO that each one
// contains, built only from LEGOs taught by that LEGO's seed. Same text, same clips; phrase_role 'use' (the precedent,
// ita-held-650-rehome-2026-11-03.cjs). Every row was read in full; the homes below were chosen by hand:
//   B02 what she does | vad hon gör                           → S0059L02 does|gör (hon S0017, vad as in S0059L02U05)
//   U02 do you know what she does? | vet du vad hon gör?      → S0059L02 (vet S0059L01, "do you know" = S0059L01B02)
//   U04 what does she do? | vad gör hon?                      → S0059L02
//   U05 she doesn't know what she does | hon vet inte vad hon gör → S0059L02 ("she doesn't know" = S0059L01B03)
//   U03 she does something similar | hon gör något liknande   → S0100L02 similar|liknande (liknande not taught by 59)
//   U06 ask yourself what she does | fråga dig själv vad hon gör → S0099L02 yourself|dig själv (själv/dig själv after 59)
// Stays, listed: B03 "what we do | vad vi gör" — its English says "do", not "does", so it contains no new LEGO taught after gör
// (S0018L01 we|vi is too early); Kai may allow it under S0059L02, whose basket already holds "I do something". And B01 "does | gör" (the LEGO itself) and U01, the seed sentence "we need to change what we're doing", which
// is ALREADY played as S0104L01U01 (same text, same clips) — moving it would only make a twin.
// Writes go through POST /api/production/swe_for_eng/edit-batch only (dry run unless APPLY_CONFIRM=1); one transaction, undo file.
//   curl -s "http://localhost:3470/api/production/swe_for_eng/seeds" > seeds.json
//   node tools/course-optimization/swe-104-does-rehome-2026-11-11.cjs seeds.json            # dry run
//   APPLY_CONFIRM=1 node tools/course-optimization/swe-104-does-rehome-2026-11-11.cjs seeds.json
const fs = require('fs');
const COURSE = 'swe_for_eng';
const AGENT = 'swe-does-rehome (job #133)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const DARK = 'S0104L02';

const MOVES = [ // [old id, new LEGO]
  ['S0104L02B02', 'S0059L02'],
  ['S0104L02U02', 'S0059L02'],
  ['S0104L02U04', 'S0059L02'],
  ['S0104L02U05', 'S0059L02'],
  ['S0104L02U03', 'S0100L02'],
  ['S0104L02U06', 'S0099L02'],
];
const STAYS = { S0104L02B01: 'the LEGO itself (does | gör)',
  S0104L02B03: 'English "what we do" has no "does", so it cannot contain S0059L02; the only new LEGO it does contain, S0018L01 we|vi, comes before gör is taught',
  S0104L02U01: 'seed sentence, already played as S0104L01U01' };
const COPY = ['introduce', 'status', 'register', 'difficulty', 'connected_lego_ids', 'target_text_roman', 'metadata', 'known_gloss_segments',
  'word_count', 'target_syllable_count', 'known_audio_id', 'target1_audio_id', 'target2_audio_id', 'target1_duration_ms', 'target2_duration_ms', 'lego_count'];

const sid = (id) => String(id).split(':').pop();
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
/** The live gate's rule (word multiset), both sides. */
function contains(hay, needle) { const have = {}; for (const w of words(hay)) have[w] = (have[w] || 0) + 1; for (const w of words(needle)) { if (!have[w]) return false; have[w]--; } return true; }
function legoPosition(known, legoKnown) { const k = norm(known), l = norm(legoKnown); if (k === l || k.startsWith(l + ' ')) return 'start'; if (k.endsWith(' ' + l)) return 'end'; return 'middle'; }

function plan(api, dz = require('../../services/phrase-decomposer.cjs')) {
  const legos = [], phrases = [];
  for (const s of api.seeds) for (const l of s.legos || []) { legos.push({ ...l, seed_number: l.seed_number ?? s.seed_number }); for (const p of l.basket_phrases || []) phrases.push({ ...p, _lego: l.lego_id }); }
  const L = new Map(legos.map((l) => [l.lego_id, l])), P = new Map(phrases.map((p) => [sid(p.id), p]));
  const ops = [], problems = [], notes = [];
  const dark = L.get(DARK);
  if (!dark || dark.is_new) problems.push(`${DARK} is not the not-new does|gör any more`);
  // Played rows: every row under a NEW LEGO (P25 mirror).
  const played = phrases.filter((q) => L.get(q._lego)?.is_new && q.phrase_role !== 'component');
  const nextPos = new Map(), nextU = new Map();
  for (const [oldId, legoId] of MOVES) {
    const p = P.get(oldId), to = L.get(legoId);
    if (!p) { problems.push(`${oldId} gone`); continue; }
    if (p._lego !== DARK) { problems.push(`${oldId} no longer under ${DARK}`); continue; }
    if (!to || !to.is_new) { problems.push(`${legoId} is not a new LEGO`); continue; }
    if (!contains(p.known_text, to.known_text) || !contains(p.target_text, to.target_text)) { problems.push(`${oldId} would not contain ${legoId}`); continue; }
    const twin = played.find((q) => norm(q.known_text) === norm(p.known_text));
    if (twin) { problems.push(`${oldId} known side already played as ${sid(twin.id)} (${twin.known_text} | ${twin.target_text})`); continue; }
    const basket = phrases.filter((q) => q._lego === legoId);
    if (!nextPos.has(legoId)) {
      nextPos.set(legoId, Math.max(0, ...basket.map((q) => q.position || 0)) + 1);
      nextU.set(legoId, Math.max(0, ...basket.filter((q) => /U\d+$/.test(sid(q.id))).map((q) => Number(sid(q.id).slice(9)))) + 1);
    }
    const newId = `${legoId}U${String(nextU.get(legoId)).padStart(2, '0')}`; nextU.set(legoId, nextU.get(legoId) + 1);
    const vocab = legos.filter((l) => l.seed_number <= to.seed_number).map((l) => ({ lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text, seed_number: l.seed_number }));
    const dec = dz.decomposeAnchored(p.target_text, vocab, { lego_id: to.lego_id, target_text: to.target_text, known_text: to.known_text }, COURSE);
    const row = { id: `${COURSE}:${newId}`, course_code: COURSE, seed_number: to.seed_number, lego_index: to.lego_index, known_text: p.known_text, target_text: p.target_text,
      position: nextPos.get(legoId), lego_position: legoPosition(p.known_text, to.known_text), phrase_role: 'use' };
    nextPos.set(legoId, nextPos.get(legoId) + 1);
    for (const c of COPY) if (p[c] !== undefined) row[c] = p[c];
    if (dec && dec.kind !== 'error' && dec.blocks) row.decomposition = dec.blocks;
    else problems.push(`${oldId}: decomposer could not tile it under ${legoId} from LEGOs taught by seed ${to.seed_number} (${dec && dec.kind})`);
    ops.push({ op: 'phrase.insert', row });
    ops.push({ op: 'phrase.delete', phrase_id: p.id, expect: { known_text: p.known_text, target_text: p.target_text } });
    notes.push(`${oldId} → ${newId}: ${p.known_text} | ${p.target_text}${dec && dec.blocks ? '  [' + dec.blocks.map((b) => b.legoId || '·').join(' ') + ']' : ''}`);
  }
  const stay = phrases.filter((q) => q._lego === DARK && !MOVES.some((m) => m[0] === sid(q.id))).map((q) => `${sid(q.id)} ${q.known_text} | ${q.target_text} — ${STAYS[sid(q.id)] || 'NOT PLANNED'}`);
  return { ops, problems, notes, stay };
}

async function main() {
  const file = process.argv[2]; if (!file) throw new Error('usage: <fresh seeds.json>');
  const p = plan(JSON.parse(fs.readFileSync(file, 'utf8')));
  for (const n of p.notes) console.log('  ', n);
  console.log(`stays under the dark ${DARK} (listed):`); for (const s of p.stay) console.log('   ', s);
  if (p.problems.length) { console.log('STOP:', p.problems); process.exitCode = 1; return; }
  const post = async (body) => { const r = await fetch(`${POPTY}/api/production/${COURSE}/edit-batch`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
  const dry = await post({ ops: p.ops });
  console.log(`dry run ${dry.status} ${dry.body.error || ''} (${p.ops.length} ops)`);
  if (dry.status !== 200) { console.log(JSON.stringify(dry.body).slice(0, 2000)); return; }
  if (process.env.APPLY_CONFIRM !== '1') return;
  const ap = await post({ ops: p.ops, apply: true });
  console.log(`APPLIED ${ap.status} event ${ap.body.event_id} undo ${ap.body.undo_file} ${ap.body.error || ''}`);
}
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { plan, contains };
