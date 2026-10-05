#!/usr/bin/env node
'use strict';
// cat_for_eng seed 28 — teach "it is | és" FIRST (S0028L01, round 86) and "useful | útil" SECOND (S0028L02, round 87).
// Kai's ruling 2026-10-05 (Deborah's finding: bare "és" was used in the R86 "útil" basket before it was taught).
// Supersedes job #854·J's re-text ("una paraula útil"); those six rows go back to the ORIGINAL "és útil …" texts.
//
// WHY THE LEGO ROWS SWAP CONTENT AND NOT IDS: lego_id is generated from lego_index and learner progress, QA flags and
// decompositions are filed under the slot, so the two rows keep S0028L01 / S0028L02 (= rounds 86 / 87, teaching order)
// and exchange what they hold. Nothing is deleted; no learner has progress on either slot (checked 2026-10-05).
// What is exchanged: the LEGO text, its four clips (known/target1/target2/presentation), course_audio.lego_id of those
// clips (so the intro still mirrors its LEGO), and every stored phrase decomposition block bound to either slot
// (458 rows course-wide — a decomposition freezes the slot id, see refresh-stale-phrase-decompositions.cjs).
//
// BASKETS — a basket may only use words taught before its round (plus its own LEGO):
//   R86 "it is | és"  : "és possible…" rows (possible = taught inside S0003L03), and library phrases with "és" whose other
//                       words are all taught by R85 (ara/massa/tard, què, quina és…). No "útil" — it is taught next.
//   R87 "useful | útil": útil, molt útil, then the six ORIGINAL "és útil …" phrases (és now taught at R86).
// Every phrase reuses a clip that already exists (no TTS today); each is read back and checked against its text.
//
//   node tools/course-optimization/cat-seed-28-swap-es-util-2026-10-05.cjs          # dry run
//   APPLY=1 node tools/course-optimization/cat-seed-28-swap-es-util-2026-10-05.cjs  # write
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const COURSE = 'cat_for_eng', SEED = 28, SWEEP = 'cat-seed-28-swap-es-util-2026-10-05', SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const ES_SLOT = 'S0028L01', UTIL_SLOT = 'S0028L02';
const P = (s) => `${COURSE}:${s}`;

// Original "és útil …" phrases (replaced in place by #854·J) — their clips still exist in course_audio.
const ORIG = {
  B03: { known: "it's useful", target: 'és útil', k: '920116b1-28a9-49b7-95d1-e43098262477', t1: 'dc23c7e6-81e3-4b60-a1ed-adbb2fb889de', t2: 'cf32f417-df97-4413-9714-9ace8fd87e72' },
  U01: { known: "it's very useful", target: 'és molt útil', k: '88de4064-27c9-473b-90b0-d55379f8f97a', t1: '85ce14d8-04c5-4928-b86b-1e0cf8eb9446', t2: 'cf008927-4c90-4e0c-a2c8-194a8642460e' },
  U02: { known: "it's useful to practise", target: 'és útil practicar', k: '98b988a5-d767-4f0e-8a63-4f24f09c84aa', t1: '3094c8ad-b287-4c28-a06f-04667b0951d8', t2: '798f120c-9a91-44e1-b462-ec5952aafb96' },
  U03: { known: "it's useful to speak often", target: 'és útil parlar sovint', k: 'f67ed259-3c51-40de-8b9f-09b509cd38f0', t1: '95c63fc4-008e-4950-a51b-9a6f03b631b5', t2: '78134ecf-913d-4d89-9f45-d1f1e06bdde6' },
  U04: { known: "it's useful to learn Catalan", target: 'és útil aprendre català', k: '73010bf6-a07b-4bf4-a400-4260e0e8554e', t1: '24613e84-2a84-4594-9f64-98003da51a45', t2: '45ce796a-7f9f-4088-9065-114d529d55de' },
  U05: { known: "it's very useful to meet people", target: 'és molt útil conèixer gent', k: '9f55f8a5-4de0-4b59-a797-3065540dc3fc', t1: '1d788284-2127-48d1-8006-d24536863cea', t2: '1fc1316a-aa2d-4777-a7d1-b312fba01b14' },
};
// word → [known gloss, taught-in LEGO slot] for the hand-built decompositions of the originals
const W = { 'és': ['it is', ES_SLOT], 'útil': ['useful', UTIL_SLOT], molt: ['very', 'S0013L02'], practicar: ['to practise', 'S0005L01'], parlar: ['to speak', 'S0001L02'],
  sovint: ['often', 'S0003L02'], aprendre: ['to learn', 'S0002L01'], 'català': ['catalan', 'S0001L03'], 'conèixer': ['to meet (people)', 'S0022L03'], gent: ['people', 'S0022L02'] };
const decompOf = (target, salientSlot) => target.split(' ').map((w, i) => { const [known, legoId] = W[w]; const b = { known, legoId, target: (i ? ' ' : '') + w, isGhost: false }; if (legoId === salientSlot) b.isSalient = true; return b; });

// New phrase id → where its content comes from. {from} = an existing row (all its content + clips move); {orig} = ORIG[key].
const ES_BASKET = [ // → S0028L01 (R86)
  ['B01', { from: 'S0028L02B01' }], ['B02', { from: 'S0028L02B03' }], ['B03', { from: 'S0028L02U03' }], ['U01', { from: 'S0028L02U05' }],
  ['U02', { from: 'S0270L03U02' }], ['U03', { from: 'S0068L01B02' }], ['U04', { from: 'S0017L03U02' }], ['U05', { from: 'S0017L03U03' }],
];
const UTIL_BASKET = [ // → S0028L02 (R87)
  ['B01', { from: 'S0028L01B01' }], ['B02', { from: 'S0028L01B02' }],
  ['B03', { orig: 'B03', like: 'S0028L02B02' }], ['U01', { orig: 'U01', like: 'S0028L02U01' }], ['U02', { orig: 'U02' }], ['U03', { orig: 'U03' }], ['U04', { orig: 'U04' }], ['U05', { orig: 'U05' }],
];
const PHRASE_COLS = ['known_text', 'target_text', 'word_count', 'lego_count', 'lego_position', 'known_audio_id', 'target1_audio_id', 'target2_audio_id', 'target1_duration_ms', 'target2_duration_ms'];
const swapSlots = (s) => s.replace(/"S0028L01"/g, '"@@"').replace(/"S0028L02"/g, '"S0028L01"').replace(/"@@"/g, '"S0028L02"');
const tok = (s) => s.toLowerCase().replace(/[.,?!¿¡]/g, '').split(/\s+/).filter(Boolean);
const norm = (s) => (s || '').toLowerCase().replace(/[.,?!¿¡]/g, '').trim();

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const { rows: legos } = await pg.query('SELECT * FROM course_legos WHERE course_code=$1 AND seed_number=$2 ORDER BY lego_index', [COURSE, SEED]);
  const L = Object.fromEntries(legos.map((l) => [l.lego_id, l]));
  if (L[ES_SLOT].target_text !== 'útil' || L[UTIL_SLOT].target_text !== 'és') throw new Error('S0028 is not in the expected pre-swap state (L01=útil, L02=és) — already applied?');
  const { rows: idx } = await pg.query('SELECT lego_id, round_index FROM course_round_index WHERE course_code=$1 AND seed_number=$2', [COURSE, SEED]);
  console.log('round index now:', idx.map((r) => `${r.lego_id}=R${r.round_index}`).join(' '), '(ids keep their rounds; content swaps)');

  // snapshot every source row (decomposition shown AFTER the slot remap, so remap here in JS the same way SQL will)
  const srcIds = [...ES_BASKET, ...UTIL_BASKET].map(([, s]) => s.from).filter(Boolean).concat(['S0028L02B02', 'S0028L02U01']);
  const { rows: srcRows } = await pg.query('SELECT * FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)', [COURSE, srcIds.map(P)]);
  const S = Object.fromEntries(srcRows.map((r) => [r.id, r]));
  for (const id of srcIds) if (!S[P(id)]) throw new Error('missing source row ' + id);
  const remap = (d) => d && JSON.parse(swapSlots(JSON.stringify(d)));
  const salientOnly = (d, slot) => { if (!d || !d.some((b) => b.legoId === slot)) return d; return d.map((b) => { const c = { ...b }; if (c.legoId === slot) c.isSalient = true; else delete c.isSalient; return c; }); };

  const { rows: dur } = await pg.query('SELECT id, text, duration_ms, role FROM course_audio WHERE id = ANY($1)', [Object.values(ORIG).flatMap((o) => [o.k, o.t1, o.t2])]);
  const D = Object.fromEntries(dur.map((r) => [r.id, r]));
  const plan = [];
  for (const [basket, slot, entries] of [['es', ES_SLOT, ES_BASKET], ['util', UTIL_SLOT, UTIL_BASKET]]) {
    for (const [key, spec] of entries) {
      const id = P(`${slot}${key}`); let row;
      if (spec.from) {
        const s = S[P(spec.from)];
        row = { id, known_text: s.known_text, target_text: s.target_text, word_count: s.word_count, lego_count: s.lego_count, lego_position: s.lego_position, known_audio_id: s.known_audio_id,
          target1_audio_id: s.target1_audio_id, target2_audio_id: s.target2_audio_id, target1_duration_ms: s.target1_duration_ms, target2_duration_ms: s.target2_duration_ms,
          decomposition: salientOnly(remap(s.decomposition), slot), src: spec.from };   // every source names the old slots; remap = the post-swap slots
      } else {
        const o = ORIG[spec.orig]; for (const a of [o.k, o.t1, o.t2]) if (!D[a]) throw new Error('original clip missing ' + a);
        if (norm(D[o.k].text) !== norm(o.known) || norm(D[o.t1].text) !== norm(o.target) || norm(D[o.t2].text) !== norm(o.target)) throw new Error('original clip text mismatch ' + spec.orig);
        const like = spec.like && S[P(spec.like)];
        row = { id, known_text: o.known, target_text: o.target, word_count: o.target.length, lego_count: o.target.split(' ').length, lego_position: 'start', known_audio_id: o.k, target1_audio_id: o.t1, target2_audio_id: o.t2,
          target1_duration_ms: D[o.t1].duration_ms, target2_duration_ms: D[o.t2].duration_ms, decomposition: like ? salientOnly(remap(like.decomposition), slot) : decompOf(o.target, slot), src: 'original ' + spec.orig };
        if (like) { row.word_count = like.word_count; row.lego_count = like.lego_count; }
      }
      row.basket = basket; row.slot = slot; plan.push(row);
    }
  }
  // ── taught-before-round check (words), using the post-swap order ──
  const { rows: tl } = await pg.query(`SELECT l.lego_id, l.seed_number, l.target_text, r.round_index FROM course_legos l JOIN course_round_index r USING (course_code, lego_id) WHERE l.course_code=$1`, [COURSE]);
  const wordsBefore = (maxRound) => new Set(tl.filter((l) => l.round_index <= maxRound && l.seed_number !== SEED).flatMap((l) => tok(l.target_text)));
  const base85 = wordsBefore(85); base85.delete('és'); for (const w of tok('quina és')) base85.add(w); // "quina és" S0017L03 (R52) taught the word inside a chunk
  const problems = [];
  for (const r of plan) {
    const allowed = new Set([...base85, 'és']); if (r.basket === 'util') allowed.add('útil');
    const bad = tok(r.target_text).filter((w) => !allowed.has(w));
    if (bad.length) problems.push(`${r.id} "${r.target_text}": not yet taught: ${bad.join(', ')}`);
    if (r.basket === 'es' && /útil/i.test(r.target_text)) problems.push(`${r.id} uses útil before R87`);
    if (!/(^|[^\p{L}])és([^\p{L}]|$)/iu.test(r.target_text) && r.basket === 'es') problems.push(`${r.id} does not practise és`);
    if (r.basket === 'util' && !/útil/i.test(r.target_text)) problems.push(`${r.id} does not practise útil`);
  }
  console.log('\nLEGO rows (content swaps, ids stay):');
  console.log(`  ${ES_SLOT} (R86): "${L[ES_SLOT].known_text}" | ${L[ES_SLOT].target_text}  →  "${L[UTIL_SLOT].known_text}" | ${L[UTIL_SLOT].target_text}`);
  console.log(`  ${UTIL_SLOT} (R87): "${L[UTIL_SLOT].known_text}" | ${L[UTIL_SLOT].target_text}  →  "${L[ES_SLOT].known_text}" | ${L[ES_SLOT].target_text}`);
  const { rows: cur } = await pg.query('SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 AND lego_index IN (1,2)', [COURSE, SEED]);
  const C = Object.fromEntries(cur.map((r) => [r.id, r]));
  console.log('\nphrases (before → after, source of clips):');
  for (const r of plan) console.log(`  ${r.id.split(':')[1]}: "${C[r.id].known_text}" | ${C[r.id].target_text}  →  "${r.known_text}" | ${r.target_text}   [${r.src}]`);
  const { rows: [dc] } = await pg.query(`SELECT count(*)::int n FROM course_practice_phrases WHERE course_code=$1 AND decomposition IS NOT NULL AND (decomposition::text LIKE '%"S0028L01"%' OR decomposition::text LIKE '%"S0028L02"%')`, [COURSE]);
  console.log(`\ndecompositions to re-bind (L01↔L02) course-wide: ${dc.n} rows`);
  if (problems.length) { console.log('\nPROBLEMS:\n  ' + problems.join('\n  ')); if (APPLY) throw new Error('refusing to apply with problems'); }
  else console.log('\nword check OK: every word in each basket was taught before its round');
  if (!APPLY) { console.log('DRY RUN'); return pg.end(); }

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const ev = (operation, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation, scope, detail: { ruling: 'Kai 2026-10-05: teach it is | és first (R86), useful | útil second (R87)', ...detail } });
  const le = await ev('lego-edit', { seed_numbers: [SEED], lego_ids: [ES_SLOT, UTIL_SLOT], rows: 2 }, { what: 'content of S0028L01 and S0028L02 exchanged (text, clips, course_audio.lego_id)' });
  const pe = await ev('phrase-edit', { seed_numbers: [SEED], phrase_ids: plan.map((r) => r.id), rows: plan.length }, { what: 'both baskets re-homed; six originals restored, #854·J re-texts reverted' });
  const de = await ev('phrase-edit', { seed_numbers: [SEED], rows: dc.n }, { what: 'stored decomposition legoId S0028L01<->S0028L02 re-bound course-wide (no text change)' });
  const ue = await ev('unapprove', { seed_numbers: [SEED], rows: 1 }, { why: 'LEGO order and both baskets changed' });
  await pg.query('BEGIN');
  try {
    const rd = await pg.query(`UPDATE course_practice_phrases SET decomposition = replace(replace(replace(decomposition::text,'"S0028L01"','"@@"'),'"S0028L02"','"S0028L01"'),'"@@"','"S0028L02"')::jsonb, last_edit_event_id=$2
      WHERE course_code=$1 AND decomposition IS NOT NULL AND (decomposition::text LIKE '%"S0028L01"%' OR decomposition::text LIKE '%"S0028L02"%')`, [COURSE, de]);
    if (rd.rowCount !== dc.n) throw new Error(`decomposition remap touched ${rd.rowCount}, expected ${dc.n}`);
    const swap = async (to, from) => pg.query(`UPDATE course_legos SET known_text=$3, target_text=$4, components=$5, known_audio_id=$6, target1_audio_id=$7, target2_audio_id=$8, presentation_audio_id=$9,
      target1_duration_ms=$10, target2_duration_ms=$11, last_edit_event_id=$12, updated_at=now() WHERE course_code=$1 AND lego_id=$2`,
      [COURSE, to, from.known_text, from.target_text, from.components, from.known_audio_id, from.target1_audio_id, from.target2_audio_id, from.presentation_audio_id, from.target1_duration_ms, from.target2_duration_ms, le]);
    for (const [to, from] of [[ES_SLOT, L[UTIL_SLOT]], [UTIL_SLOT, L[ES_SLOT]]]) { const u = await swap(to, from); if (u.rowCount !== 1) throw new Error('lego swap ' + to); }
    const ca = await pg.query(`UPDATE course_audio SET lego_id = CASE lego_id WHEN $2 THEN $3 ELSE $2 END WHERE course_code=$1 AND lego_id IN ($2,$3)`, [COURSE, ES_SLOT, UTIL_SLOT]);
    if (ca.rowCount !== 8) throw new Error(`course_audio.lego_id swap touched ${ca.rowCount}, expected 8`);
    for (const r of plan) {
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$2, target_text=$3, word_count=$4, lego_count=$5, lego_position=$6, known_audio_id=$7, target1_audio_id=$8, target2_audio_id=$9,
        target1_duration_ms=$10, target2_duration_ms=$11, decomposition=$12, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, qa_checked=NULL, last_edit_event_id=$13, updated_at=now()
        WHERE course_code=$1 AND id=$14`, [COURSE, r.known_text, r.target_text, r.word_count, r.lego_count, r.lego_position, r.known_audio_id, r.target1_audio_id, r.target2_audio_id, r.target1_duration_ms, r.target2_duration_ms,
        r.decomposition ? JSON.stringify(r.decomposition) : null, pe, r.id]);
      if (u.rowCount !== 1) throw new Error('phrase ' + r.id);
    }
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=$3', [ue, COURSE, SEED]);
    if (un.rowCount !== 1) throw new Error('unapprove');
    // read-back inside the transaction: every slot's clip speaks the row's text
    const { rows: chk } = await pg.query(`SELECT p.id, p.target_text, p.known_text, ak.text kt, a1.text t1, a2.text t2 FROM course_practice_phrases p LEFT JOIN course_audio ak ON ak.id=p.known_audio_id LEFT JOIN course_audio a1 ON a1.id=p.target1_audio_id LEFT JOIN course_audio a2 ON a2.id=p.target2_audio_id WHERE p.course_code=$1 AND p.seed_number=$2 AND p.lego_index IN (1,2)`, [COURSE, SEED]);
    const bad = chk.filter((r) => !r.kt || !r.t1 || !r.t2 || norm(r.kt) !== norm(r.known_text) || norm(r.t1) !== norm(r.target_text) || norm(r.t2) !== norm(r.target_text));
    if (bad.length) throw new Error('clip/text mismatch: ' + bad.map((b) => `${b.id} (${b.target_text} / ${b.t1} / ${b.t2})`).join('; '));
    const { rows: [n] } = await pg.query('SELECT count(*)::int n FROM course_legos WHERE course_code=$1 AND seed_number=$2', [COURSE, SEED]); if (n.n !== 3) throw new Error('LEGO count changed — never delete a LEGO');
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  console.log('APPLIED', { le, pe, de, ue });
  await pg.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
