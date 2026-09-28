#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-632-clear-fixes-2026-09-28.cjs
//
// ita_for_eng — the "clear fixes" of the #632·I downstream audit (published d/197f2605), applied by job #639·I.
// Kai read the report on 2026-09-28 and did not object to these; each is decided by the canon already.
//
//   (1) SIX EXACT DUPLICATE PAIRS both marked new — the LATER one becomes is_new:false (L17 pure restatement; a
//       duplicate is BOTH sides matching, Kai 2026-09-23): S0171L01 you want|vuoi (first at S0020L01), S0202L02 how to
//       answer|come rispondere (S0043L02), S0209L01 they want|vogliono (S0200L02), S0478L01 kind|gentile (S0142L01),
//       S0562L01 just|solo (S0357L01), S0620L01 really|davvero (S0496L01). Their intro clips stop being played; nothing
//       is deleted.
//       P25 (not-new baskets are never played): every non-component row under those six was checked. A row MOVES to
//       the earlier twin (same pair, NEW) when every word of it is taught by the twin's seed — the same test the
//       #621·I rehome ran — and the twin does not already hold the same pair; two rows of 202 that cannot go to 43
//       go under 202's own NEW LEGO L01 "nobody|nessuno", which they contain. A move keeps text and clips (insert under
//       the new LEGO, delete the old row). Everything that cannot move — untaught at the twin, an exact copy of a twin
//       row, or not containing the LEGO on the known side ("I can only do this|posso solo farlo" under just|solo;
//       "want to|vogliono" with no person, K26) — STAYS where it is and is LISTED (canon P25: never silently left).
//   (2) S0257L01 blue|blu → is_new:true — blu occurs nowhere before 257, so L17 "familiar" cannot apply. Intro exists.
//   (3) S0207L01 you've done|hai fatto → is_new:true — the pair first occurs at 207 and carries an intro. Intro exists.
//   (4) S0204L02 her to help you|che lei ti aiutasse: components re-cut from [that she|che lei, help you|ti aiutasse]
//       to [that she|che lei, you|ti, help|aiutasse] so aiutasse stands on its own (K29 — S0603L02U02 uses it bare).
//       Components are course_legos.components (tiles); this LEGO has no component rows, so nothing is rendered. The
//       LEGO's text is unchanged, so its intro still mirrors it (O13 — verified by the strict check at exit).
//   (5) K26 on components: the single component of S0153L01, S0211L01, S0215L01, S0376L01, S0429L01 takes the pronoun
//       its LEGO already carries (text only — component clips are never played; 376 is otherwise Kai's to re-cut).
//
// Rails: live text/is_new asserted before every write; sibling seeds (131, 360, 614, 152, 347, 367, 390, 391, 485,
// 348, 609, 201, 519, 246) never touched; seeds that gain or lose a played row are unapproved for Kai's read; the
// round index is refreshed; an audio-pass request is queued (no clip is expected from it — every moved row keeps
// its clips and no played text changes); intro-mirror --strict runs at exit through recordContentEdit.
//
//   node tools/course-optimization/ita-632-clear-fixes-2026-09-28.cjs            # dry run
//   APPLY=1 node tools/course-optimization/ita-632-clear-fixes-2026-09-28.cjs    # apply

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-632-clear-fixes-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#639·I';
const RULING = 'The #632·I clear fixes (d/197f2605), Kai not objecting 2026-09-28: later exact duplicates not-new (L17, duplicate = both sides), their drill rows rehomed under a NEW LEGO or listed (P25); blu and hai fatto new (L17 cannot make a first occurrence familiar); 204 L02 components re-cut so aiutasse stands alone (K29); five single components take their pronoun (K26)';
const SIBLING_SEEDS = [131, 360, 614, 152, 347, 367, 390, 391, 485, 348, 609, 201, 519, 246];

// ── Rules (pure; the test exercises these) ─────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
function containsWords(hay, needle) {
  const have = {}; for (const w of words(hay)) have[w] = (have[w] || 0) + 1;
  for (const w of words(needle)) { if (!have[w]) return false; have[w]--; }
  return true;
}
const rowContainsLego = (row, lego) => containsWords(row.known, lego.known) && containsWords(row.target, lego.target);
function legoPosition(known, legoKnown) {
  const k = norm(known), l = norm(legoKnown);
  if (k === l || k.startsWith(l + ' ')) return 'start';
  if (k.endsWith(' ' + l)) return 'end';
  return 'middle';
}
/** P25 as the player applies it (generateLearningScript.ts `.filter(l => l.is_new)`). */
const phraseIsPlayed = (row, legosById) => Boolean(legosById[row.lego]?.is_new);
const playedCount = (rows, legosById) => rows.filter(r => r.role !== 'component' && phraseIsPlayed(r, legosById)).length;
/** A LEGO is a duplicate only if BOTH sides match (Kai, 2026-09-23). */
const isExactDuplicate = (a, b) => norm(a.known) === norm(b.known) && norm(a.target) === norm(b.target);
/** Tiles: the components' target texts, joined, must be the LEGO's target text (L4). */
const componentsTileTarget = (comps, target) => norm(comps.map(c => c.target).join(' ')) === norm(target);
const componentsTileKnown = (comps, known) => norm(comps.map(c => c.known).join(' ')) === norm(known);

// ── The LEGOs (live-asserted BEFORE state) ───────────────────────────────────────────────
const LEGOS = {
  // the six later duplicates → not new
  S0171L01: { seed: 171, lego_index: 1, is_new: true, known: 'you want', target: 'vuoi', twin: 'S0020L01', to_is_new: false },
  S0202L02: { seed: 202, lego_index: 2, is_new: true, known: 'how to answer', target: 'come rispondere', twin: 'S0043L02', to_is_new: false },
  S0209L01: { seed: 209, lego_index: 1, is_new: true, known: 'they want', target: 'vogliono', twin: 'S0200L02', to_is_new: false },
  S0478L01: { seed: 478, lego_index: 1, is_new: true, known: 'kind', target: 'gentile', twin: 'S0142L01', to_is_new: false },
  S0562L01: { seed: 562, lego_index: 1, is_new: true, known: 'just', target: 'solo', twin: 'S0357L01', to_is_new: false },
  S0620L01: { seed: 620, lego_index: 1, is_new: true, known: 'really', target: 'davvero', twin: 'S0496L01', to_is_new: false },
  // the earlier twins (unchanged, NEW — landing baskets)
  S0020L01: { seed: 20, lego_index: 1, is_new: true, known: 'you want', target: 'vuoi' },
  S0043L02: { seed: 43, lego_index: 2, is_new: true, known: 'how to answer', target: 'come rispondere' },
  S0200L02: { seed: 200, lego_index: 2, is_new: true, known: 'they want', target: 'vogliono' },
  S0142L01: { seed: 142, lego_index: 1, is_new: true, known: 'kind', target: 'gentile' },
  S0357L01: { seed: 357, lego_index: 1, is_new: true, known: 'just', target: 'solo' },
  S0496L01: { seed: 496, lego_index: 1, is_new: true, known: 'really', target: 'davvero' },
  S0202L01: { seed: 202, lego_index: 1, is_new: true, known: 'nobody', target: 'nessuno' },
  // → new
  S0257L01: { seed: 257, lego_index: 1, is_new: false, known: 'blue', target: 'blu', to_is_new: true },
  S0207L01: { seed: 207, lego_index: 1, is_new: false, known: "you've done", target: 'hai fatto', to_is_new: true },
  // component re-cut / pronoun (text unchanged)
  S0204L02: { seed: 204, lego_index: 2, is_new: true, known: 'her to help you', target: 'che lei ti aiutasse' },
  S0153L01: { seed: 153, lego_index: 1, is_new: true, known: "I wouldn't have said it", target: "non l'avrei detto" },
  S0211L01: { seed: 211, lego_index: 1, is_new: true, known: 'they told us', target: 'ci hanno detto' },
  S0215L01: { seed: 215, lego_index: 1, is_new: true, known: 'I went out', target: 'sono uscito' },
  S0376L01: { seed: 376, lego_index: 1, is_new: true, known: "I didn't go anywhere", target: 'non sono andato da nessuna parte' },
  S0429L01: { seed: 429, lego_index: 1, is_new: true, known: 'it would be perfect', target: 'sarebbe perfetto' },
};
const IS_NEW_FLIPS = Object.entries(LEGOS).filter(([, l]) => 'to_is_new' in l).map(([id, l]) => ({ id, from: l.is_new, to: l.to_is_new }));
const COMPONENT_EDITS = [
  { id: 'S0204L02', from: [{ known: 'that she', target: 'che lei' }, { known: 'help you', target: 'ti aiutasse' }], to: [{ known: 'that she', target: 'che lei' }, { known: 'you', target: 'ti' }, { known: 'help', target: 'aiutasse' }], why: 'K29: aiutasse used bare later (S0603L02U02) — stands alone as a component; #632·I (4)' },
  { id: 'S0153L01', from: [{ known: "wouldn't have said it", target: "non l'avrei detto" }], to: [{ known: "I wouldn't have said it", target: "non l'avrei detto" }], why: 'K26: the component carries the pronoun its LEGO carries' },
  { id: 'S0211L01', from: [{ known: 'told us', target: 'ci hanno detto' }], to: [{ known: 'they told us', target: 'ci hanno detto' }], why: 'K26' },
  { id: 'S0215L01', from: [{ known: 'went out', target: 'sono uscito' }], to: [{ known: 'I went out', target: 'sono uscito' }], why: 'K26' },
  { id: 'S0376L01', from: [{ known: "didn't go anywhere", target: 'non sono andato da nessuna parte' }], to: [{ known: "I didn't go anywhere", target: 'non sono andato da nessuna parte' }], why: 'K26 (text only; the LEGO itself awaits Kai\'s re-cut)' },
  { id: 'S0429L01', from: [{ known: 'would be perfect', target: 'sarebbe perfetto' }], to: [{ known: 'it would be perfect', target: 'sarebbe perfetto' }], why: 'K26' },
];
// MOVES: from (id + expected text, under a LEGO that becomes not-new) → to (new id under a NEW LEGO). Text identical, clips kept.
const MOVES = [
  // 171 L01 → 20 L01 (the bare pair; everything else in the basket uses words untaught at 20)
  { from: 'S0171L01B01', to: 'S0020L01U05', lego: 'S0020L01', known: 'you want', target: 'vuoi' },
  // 202 L02 → 43 L02 / 202 L01 "nobody"
  { from: 'S0202L02B03', to: 'S0043L02U06', lego: 'S0043L02', known: 'sure how to answer', target: 'sicuro di come rispondere' },
  { from: 'S0202L02U02', to: 'S0202L01U09', lego: 'S0202L01', known: 'nobody was sure how to answer', target: 'nessuno era sicuro di come rispondere' },
  { from: 'S0202L02U06', to: 'S0202L01U10', lego: 'S0202L01', known: 'I think nobody was sure how to answer', target: 'penso che nessuno fosse sicuro di come rispondere' },
  // 209 L01 → 200 L02
  { from: 'S0209L01U01', to: 'S0200L02U10', lego: 'S0200L02', known: 'they want to help', target: 'vogliono aiutare' },
  { from: 'S0209L01U02', to: 'S0200L02U11', lego: 'S0200L02', known: 'they want to learn', target: 'vogliono imparare' },
  { from: 'S0209L01U04', to: 'S0200L02U12', lego: 'S0200L02', known: 'they want to understand', target: 'vogliono capire' },
  { from: 'S0209L01U06', to: 'S0200L02U13', lego: 'S0200L02', known: 'they want to speak Italian', target: 'vogliono parlare italiano' },
  { from: 'S0209L01U07', to: 'S0200L02U14', lego: 'S0200L02', known: 'they want to learn how to say it', target: 'vogliono imparare come dirlo' },
  // 478 L01 → 142 L01
  { from: 'S0478L01B01', to: 'S0142L01U06', lego: 'S0142L01', known: 'kind', target: 'gentile' },
  { from: 'S0478L01U01', to: 'S0142L01U07', lego: 'S0142L01', known: "she's very kind", target: 'è molto gentile' },
  { from: 'S0478L01U02', to: 'S0142L01U08', lego: 'S0142L01', known: "he's kind to everyone", target: 'è gentile con tutti' },
  // 562 L01 → 357 L01
  { from: 'S0562L01B02', to: 'S0357L01U07', lego: 'S0357L01', known: 'I just want', target: 'voglio solo' },
  { from: 'S0562L01B03', to: 'S0357L01U08', lego: 'S0357L01', known: 'I just need', target: 'ho solo bisogno di' },
  { from: 'S0562L01U01', to: 'S0357L01U09', lego: 'S0357L01', known: 'I just want to speak Italian', target: 'voglio solo parlare italiano' },
  { from: 'S0562L01U02', to: 'S0357L01U10', lego: 'S0357L01', known: 'I just need a minute', target: 'ho solo bisogno di un minuto' },
  { from: 'S0562L01U03', to: 'S0357L01U11', lego: 'S0357L01', known: 'I just want to go', target: 'voglio solo andare' },
  { from: 'S0562L01U05', to: 'S0357L01U12', lego: 'S0357L01', known: "it's just here", target: 'è solo qui' },
  // 620 L01 → 496 L01
  { from: 'S0620L01B02', to: 'S0496L01U06', lego: 'S0496L01', known: "it's really long", target: 'è davvero lungo' },
  { from: 'S0620L01B03', to: 'S0496L01U07', lego: 'S0496L01', known: 'really a long time', target: 'davvero molto tempo' },
  { from: 'S0620L01U01', to: 'S0496L01U08', lego: 'S0496L01', known: "it's really been a very long time", target: 'è passato davvero molto tempo' },
  { from: 'S0620L01U02', to: 'S0496L01U09', lego: 'S0496L01', known: "that's really interesting", target: 'è davvero interessante' },
  { from: 'S0620L01U03', to: 'S0496L01U10', lego: 'S0496L01', known: "it's really important", target: 'è davvero importante' },
  { from: 'S0620L01U04', to: 'S0496L01U11', lego: 'S0496L01', known: "that's really a long time", target: 'è davvero molto tempo' },
];
// Rows that STAY under a now-not-new LEGO, and why (P25: listed, never silently left).
const STAYS = [
  ...['S0171L01B02', 'S0171L01B03', 'S0171L01U01', 'S0171L01U02', 'S0171L01U03', 'S0171L01U04', 'S0171L01U05', 'S0171L01U06', 'S0171L01U07', 'S0171L01U08', 'S0171L01U09'].map(id => ({ id, why: 'uses words untaught at seed 20 (see, help, stay, go, tell, farlo, read, work, venire, her, why…) and contains no other NEW LEGO of seed 171' })),
  { id: 'S0202L02B01', why: 'exact copy of S0043L02B01' }, { id: 'S0202L02B02', why: 'exact copy of S0043L02B01' },
  ...['S0202L02B04', 'S0202L02U01', 'S0202L02U03', 'S0202L02U04', 'S0202L02U08'].map(id => ({ id, why: 'sapere/era/facile untaught at seed 43; contains neither nobody nor question (202 L01/L03)' })),
  { id: 'S0209L01B01', why: '"they want to|vogliono" — the twin already drills the bare pair (S0200L02B01)' }, { id: 'S0209L01B02', why: 'as B01' },
  { id: 'S0209L01B03', why: '"want to|vogliono" names no person (K26) — not propagated' }, { id: 'S0209L01B04', why: 'exact copy of S0200L02B01' }, { id: 'S0209L01U03', why: 'exact copy of S0200L02B03' },
  { id: 'S0478L01B02', why: 'exact copy of S0142L01B01' }, { id: 'S0478L01B03', why: 'paziente untaught at 142' }, { id: 'S0478L01U03', why: 'nonno untaught at 142' }, { id: 'S0478L01U04', why: 'le untaught at 142' }, { id: 'S0478L01U05', why: 'potrebbe untaught at 142' },
  { id: 'S0562L01B01', why: 'exact copy of S0357L01B01' }, { id: 'S0562L01U04', why: '"I can only do this" does not contain "just" (P17)' },
  { id: 'S0620L01B01', why: 'exact copy of S0496L01B01' }, { id: 'S0620L01U05', why: 'coraggioso untaught at 496' },
];
const LANDING = MOVES.map(m => ({ id: m.to, lego: m.lego, seed: LEGOS[m.lego].seed, lego_index: LEGOS[m.lego].lego_index, known: m.known, target: m.target, lego_position: legoPosition(m.known, LEGOS[m.lego].known), role: 'use', movedFrom: m.from }));
const DARKENED = IS_NEW_FLIPS.filter(f => f.to === false).map(f => f.id);
const SEEDS_WITH_CONTENT_CHANGE = [...new Set([...IS_NEW_FLIPS.map(f => LEGOS[f.id].seed), ...LANDING.map(r => r.seed), ...MOVES.map(m => Number(m.from.slice(1, 5))), ...COMPONENT_EDITS.map(c => LEGOS[c.id].seed)])].sort((a, b) => a - b);

// ── Guards ──────────────────────────────────────────────────────────────────────────────
async function newVocabulary(pg, seed, text, side) {
  const col = side === 'known' ? 'known_text' : 'target_text';
  const out = [];
  for (const w of new Set(words(text))) {
    const { rows } = await pg.query(
      `SELECT 1 FROM (SELECT seed_number, ${col} AS t FROM course_practice_phrases WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_legos WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_seeds WHERE course_code=$1) x
       WHERE seed_number <= $2 AND ' '||regexp_replace(lower(replace(t,'’','''')), '[.,!?;:"]', ' ', 'g')||' ' LIKE '% '||$3||' %' LIMIT 1`, [COURSE, seed, w]);
    if (!rows.length) out.push(w);
  }
  return out;
}
function paperGuards(problems) {
  for (const s of SEEDS_WITH_CONTENT_CHANGE) if (SIBLING_SEEDS.includes(s)) problems.push(`seed ${s} belongs to a sibling job`);
  for (const [id, l] of Object.entries(LEGOS)) if (l.twin && !isExactDuplicate(l, LEGOS[l.twin])) problems.push(`${id} is not an exact duplicate of ${l.twin}`);
  for (const [id, l] of Object.entries(LEGOS)) if (l.twin && LEGOS[l.twin].seed >= l.seed) problems.push(`${id}: twin ${l.twin} is not earlier`);
  for (const m of MOVES) {
    if (!DARKENED.includes(m.from.slice(0, 8))) problems.push(`${m.from} is not under a LEGO this pass darkens — why move it?`);
    const l = LEGOS[m.lego]; if (!l || !l.is_new || 'to_is_new' in l) problems.push(`${m.to} lands under ${m.lego}, which is not a NEW LEGO after this pass`);
  }
  for (const r of LANDING) if (!rowContainsLego(r, LEGOS[r.lego])) problems.push(`${r.id} "${r.known}" → "${r.target}" does not contain ${r.lego}`);
  const ids = [...LANDING.map(r => r.id), ...MOVES.map(m => m.from), ...STAYS.map(s => s.id)];
  if (new Set(ids).size !== ids.length) problems.push('a row id appears twice across MOVES/LANDING/STAYS');
  for (const c of COMPONENT_EDITS) {
    if (!componentsTileTarget(c.to, LEGOS[c.id].target)) problems.push(`${c.id}: components do not tile the Italian`);
    // English components that tiled before must tile after; literal glosses that never tiled (204 L02 "that she + help you"
    // under "her to help you", L23) stay literal glosses.
    if (componentsTileKnown(c.from, LEGOS[c.id].known) && !componentsTileKnown(c.to, LEGOS[c.id].known)) problems.push(`${c.id}: components tiled the English before and do not after`);
  }
}
async function guardLive(pg, problems, log) {
  const { rows: legos } = await pg.query('SELECT lego_id, seed_number, lego_index, is_new, known_text, target_text, components, presentation_audio_id FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, Object.keys(LEGOS)]);
  log.live = Object.fromEntries(legos.map(r => [r.lego_id, r]));
  for (const [id, l] of Object.entries(LEGOS)) {
    const r = log.live[id];
    if (!r || r.known_text !== l.known || r.target_text !== l.target || r.is_new !== l.is_new || r.seed_number !== l.seed || r.lego_index !== l.lego_index) problems.push(`${id} reads "${r?.known_text}" → "${r?.target_text}" is_new=${r?.is_new} (${r?.seed_number}/${r?.lego_index}) — expected "${l.known}" → "${l.target}" is_new=${l.is_new}`);
  }
  for (const f of IS_NEW_FLIPS) if (f.to === true && !log.live[f.id]?.presentation_audio_id) problems.push(`${f.id} becomes new but has no intro`);
  for (const c of COMPONENT_EDITS) if (JSON.stringify(log.live[c.id]?.components) !== JSON.stringify(c.from)) problems.push(`${c.id}: live components are ${JSON.stringify(log.live[c.id]?.components)} — expected ${JSON.stringify(c.from)}`);
  // Every non-component row under a darkened LEGO is accounted for: moved or listed.
  const { rows: basket } = await pg.query(`SELECT split_part(id,':',2) id, known_text, target_text, lego_id FROM course_practice_phrases WHERE course_code=$1 AND (seed_number, lego_index) IN (${DARKENED.map((_, i) => `($${2 + i * 2}, $${3 + i * 2})`).join(',')}) AND phrase_role<>'component'`, [COURSE, ...DARKENED.flatMap(id => [LEGOS[id].seed, LEGOS[id].lego_index])]);
  const accounted = new Set([...MOVES.map(m => m.from), ...STAYS.map(s => s.id)]);
  for (const b of basket) if (!accounted.has(b.id)) problems.push(`${b.id} "${b.known_text}" → "${b.target_text}" sits under a LEGO this pass darkens and is neither moved nor listed`);
  const liveIds = new Set(basket.map(b => b.id));
  for (const id of accounted) if (!liveIds.has(id)) problems.push(`${id} is in MOVES/STAYS but not live under a darkened LEGO`);
  const { rows: src } = await pg.query(`SELECT split_part(id,':',2) id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, phrase_role FROM course_practice_phrases WHERE course_code=$1 AND split_part(id,':',2) = ANY($2)`, [COURSE, MOVES.map(m => m.from)]);
  log.src = Object.fromEntries(src.map(r => [r.id, r]));
  for (const m of MOVES) { const r = log.src[m.from]; if (!r || r.known_text !== m.known || r.target_text !== m.target) problems.push(`${m.from} reads "${r?.known_text}" → "${r?.target_text}" — expected "${m.known}" → "${m.target}"`); }
  const { rows: clash } = await pg.query('SELECT id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)', [COURSE, LANDING.map(r => `${COURSE}:${r.id}`)]);
  for (const c of clash) problems.push(`${c.id} already exists`);
  // The twin must not already hold the pair (an exact copy adds nothing); positions follow the live max.
  log.positions = {};
  for (const key of new Set(LANDING.map(r => r.lego))) {
    const l = LEGOS[key];
    const { rows: twinRows } = await pg.query('SELECT known_text, target_text, position FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3', [COURSE, l.seed, l.lego_index]);
    for (const r of LANDING.filter(x => x.lego === key)) if (twinRows.some(t => isExactDuplicate({ known: t.known_text, target: t.target_text }, r))) problems.push(`${r.id} "${r.known}" already sits under ${key}`);
    let p = Math.max(0, ...twinRows.map(t => t.position));
    for (const r of LANDING.filter(x => x.lego === key)) r.position = ++p;
    log.positions[key] = LANDING.filter(x => x.lego === key).map(r => `${r.id}@${r.position}`);
  }
  for (const r of LANDING) {
    const nk = await newVocabulary(pg, r.seed, r.known, 'known'), nt = await newVocabulary(pg, r.seed, r.target, 'target');
    if (nk.length || nt.length) problems.push(`${r.id} introduces vocabulary not taught by seed ${r.seed}: ${[...nk, ...nt].join(', ')}`);
  }
  const { rows: seeds } = await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) ORDER BY 1', [COURSE, SEEDS_WITH_CONTENT_CHANGE]);
  log.seedsApprovedBefore = Object.fromEntries(seeds.map(s => [s.seed_number, s.approved_at]));
  // Concurrency: any surface other than this tool writing these seeds in the last 90 minutes (the seed-sentence
  // sweep of 23:01Z added rows under OTHER LEGOs of these seeds; its rows are re-read above, so it is allowed through).
  const { rows: ev } = await pg.query(`SELECT id, surface, operation FROM content_edit_events WHERE course_code=$1 AND occurred_at > now() - interval '90 minutes' AND surface NOT LIKE '%' || $2 || '%' AND surface NOT LIKE '%ita-seed-sentences-in-played-baskets-2026-09-28%' AND EXISTS (SELECT 1 FROM jsonb_array_elements(scope->'seed_numbers') e WHERE (e#>>'{}')::int = ANY($3))`, [COURSE, SWEEP, SEEDS_WITH_CONTENT_CHANGE]);
  for (const e of ev) problems.push(`another surface touched these seeds in the last 90 min: ${e.surface} ${e.operation} (${e.id}) — re-read before writing`);
  // P25 arithmetic across every seed this pass touches: played rows before → after.
  const touchedSeeds = [...new Set([...SEEDS_WITH_CONTENT_CHANGE])];
  const { rows: all } = await pg.query(`SELECT split_part(p.id,':',2) id, l.lego_id AS lego, l.is_new, p.phrase_role AS role FROM course_practice_phrases p JOIN course_legos l ON l.course_code=p.course_code AND l.seed_number=p.seed_number AND l.lego_index=p.lego_index WHERE p.course_code=$1 AND p.seed_number = ANY($2)`, [COURSE, touchedSeeds]);
  const beforeById = {}; for (const b of all) beforeById[b.lego] = { is_new: b.is_new };
  const afterById = { ...beforeById }; for (const f of IS_NEW_FLIPS) afterById[f.id] = { is_new: f.to };
  const gone = new Set(MOVES.map(m => m.from));
  const after = [...all.filter(b => !gone.has(b.id)), ...LANDING.map(r => ({ id: r.id, lego: r.lego, role: 'use' }))];
  log.played = { before: playedCount(all, beforeById), after: playedCount(after, afterById), rowsUnderDarkenedAfter: STAYS.length, rowsUnder257and207Lit: all.filter(b => b.role !== 'component' && ['S0257L01', 'S0207L01'].includes(b.lego)).length };
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function apply(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const legoEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-edit', scope: { seed_numbers: [...new Set([...IS_NEW_FLIPS, ...COMPONENT_EDITS].map(x => LEGOS[x.id].seed))], lego_ids: [...IS_NEW_FLIPS, ...COMPONENT_EDITS].map(x => x.id), rows: IS_NEW_FLIPS.length + COMPONENT_EDITS.length },
    detail: { ruling: RULING, job: JOB, is_new: IS_NEW_FLIPS.map(f => ({ id: f.id, from: f.from, to: f.to, twin: LEGOS[f.id].twin || null })), components: COMPONENT_EDITS.map(c => ({ id: c.id, from: c.from, to: c.to, why: c.why })) } });
  const moveEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-move', scope: { seed_numbers: [...new Set([...LANDING.map(r => r.seed), ...MOVES.map(m => Number(m.from.slice(1, 5)))])], phrase_ids: MOVES.map(m => `${COURSE}:${m.to}`), rows: MOVES.length },
    detail: { ruling: RULING, job: JOB, moves: MOVES.map(m => ({ from: `${COURSE}:${m.from}`, to: `${COURSE}:${m.to}`, lego: m.lego, position: LANDING.find(r => r.id === m.to)?.position, known: m.known, target: m.target, clips_kept: true })), stays: STAYS } });
  const toUnapprove = SEEDS_WITH_CONTENT_CHANGE.filter(s => log.seedsApprovedBefore[s]);
  const unapproveEvent = toUnapprove.length ? await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: toUnapprove, rows: toUnapprove.length }, detail: { why: 'a LEGO flipped new/not-new, a component re-cut, or a drill row arrived/left (#632·I clear fixes); needs Kai\'s read', job: JOB, approved_at_before: log.seedsApprovedBefore } }) : null;
  log.events = { legoEvent, moveEvent, unapproveEvent, unapproved: toUnapprove };
  await pg.query('BEGIN');
  try {
    for (const f of IS_NEW_FLIPS) {
      const l = LEGOS[f.id];
      const u = await pg.query('UPDATE course_legos SET is_new=$1, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND lego_id=$4 AND is_new=$5 AND known_text=$6 AND target_text=$7', [f.to, legoEvent, COURSE, f.id, f.from, l.known, l.target]);
      if (u.rowCount !== 1) throw new Error(`${f.id}: is_new update ${u.rowCount}`);
    }
    for (const c of COMPONENT_EDITS) {
      const l = LEGOS[c.id];
      const u = await pg.query('UPDATE course_legos SET components=$1, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND lego_id=$4 AND known_text=$5 AND target_text=$6 AND components::text=$7::jsonb::text', [JSON.stringify(c.to), legoEvent, COURSE, c.id, l.known, l.target, JSON.stringify(c.from)]);
      if (u.rowCount !== 1) throw new Error(`${c.id}: components update ${u.rowCount}`);
    }
    for (const m of MOVES) {
      const s = log.src[m.from];
      const r = LANDING.find(x => x.id === m.to);
      const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, known_audio_id, target1_audio_id, target2_audio_id, last_edit_event_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft','use','{}',$11,$12,true,$13,$14,$15,$16)`,
        [`${COURSE}:${r.id}`, COURSE, r.seed, r.lego_index, r.position, r.known, r.target, r.target.length, r.target.split(/\s+/).length, JSON.stringify({ format: 'build_use', source: SWEEP, job: JOB, moved_from: `${COURSE}:${m.from}` }), r.lego_position, r.lego, s.known_audio_id, s.target1_audio_id, s.target2_audio_id, moveEvent]);
      if (ins.rowCount !== 1) throw new Error(`${r.id}: insert ${ins.rowCount}`);
      const del = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, `${COURSE}:${m.from}`, m.known, m.target]);
      if (del.rowCount !== 1) throw new Error(`${m.from}: delete ${del.rowCount}`);
    }
    if (toUnapprove.length) {
      const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [unapproveEvent, COURSE, toUnapprove]);
      if (un.rowCount !== toUnapprove.length) throw new Error('seed unapprove');
    }
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: #632·I clear fixes — six later duplicates not-new, blu/hai fatto new, 204 L02 components re-cut, five components take their pronoun, ${MOVES.length} drill rows rehomed with their clips; no new clip expected`, metadata: { job: JOB, seeds: SEEDS_WITH_CONTENT_CHANGE, moved: MOVES.length, flips: IS_NEW_FLIPS.length, components: COMPONENT_EDITS.length } });
}

async function main() {
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
  const log = { job: JOB, sweep: SWEEP, at: new Date().toISOString(), apply: process.env.APPLY === '1' };
  const problems = [];
  paperGuards(problems);
  await guardLive(pg, problems, log);
  console.log(`${SWEEP} — ${log.apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`  is_new flips: ${IS_NEW_FLIPS.map(f => `${f.id} ${f.from}→${f.to}`).join(', ')}`);
  console.log(`  components: ${COMPONENT_EDITS.map(c => `${c.id} → ${c.to.map(x => `${x.known}|${x.target}`).join(' + ')}`).join('; ')}`);
  console.log(`  moves: ${MOVES.length} rows, clips kept — ${Object.entries(log.positions).map(([k, v]) => `${k}: ${v.join(' ')}`).join('; ')}`);
  console.log(`  stays (listed, under a not-new LEGO): ${STAYS.length}`);
  console.log(`  P25 played rows across seeds ${SEEDS_WITH_CONTENT_CHANGE.join(',')}: ${log.played.before} → ${log.played.after} (${log.played.rowsUnder257and207Lit} rows under 257 L01/207 L01 lit)`);
  console.log(`  seeds approved now (to unapprove): ${SEEDS_WITH_CONTENT_CHANGE.filter(s => log.seedsApprovedBefore[s]).join(',') || 'none'}`);
  if (problems.length) { console.log('\nPROBLEMS:\n  ' + problems.join('\n  ')); await pg.end(); process.exit(1); }
  console.log('guards hold: live text/is_new/components match, every darkened-basket row is moved or listed, every landing row contains its NEW LEGO, no untaught word at the landing seed, no twin copy, no sibling seed, components tile');
  if (log.apply) {
    await apply(pg, supabase, log);
    console.log(`\nAPPLIED. events ${JSON.stringify(log.events)}; audio pass ${JSON.stringify(log.audioPass)}`);
  }
  const out = evidencePath(`tools/course-optimization/${SWEEP}.${log.apply ? 'applied' : 'dry'}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(log, null, 2));
  console.log(`evidence: ${out}`);
  await pg.end();
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { LEGOS, IS_NEW_FLIPS, COMPONENT_EDITS, MOVES, STAYS, LANDING, DARKENED, SIBLING_SEEDS, SEEDS_WITH_CONTENT_CHANGE, phraseIsPlayed, playedCount, rowContainsLego, isExactDuplicate, componentsTileTarget, componentsTileKnown, legoPosition, paperGuards };
