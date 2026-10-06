#!/usr/bin/env node
'use strict';
// tools/course-optimization/por-br-108-grow-no-meio-da-2026-10-06.cjs
//
// por_br_for_eng seed 108 — KAI'S RULING B (2026-10-06, job #349·K, after #332·K's proposal):
//   seed: "we didn't hope to wake in the middle of the night | nós não esperávamos acordar no meio da noite"
//   "no" (in the) sat in no LEGO of 108 — the stored decompositions show it as a ghost block — and no
//   LEGO teaches it before S0377L02. S3 + L27: grow the neighbouring LEGO, both sides.
//
//   S0108L01  middle of the | meio da  →  in the middle of the | no meio da   (is_new stays true)
//             components: in the → no · middle → meio · of the → da
//
// Ruling A (re-cut S0108L02 to "we didn't expect") was CONDITIONAL on canonical seed 108 saying "expect".
// canonical_seeds 108 reads "We didn't hope to wake in the middle of the night." — so L02 is NOT touched here.
//
// PHRASES UNDER L01 (P17/O12): B01 was the LEGO itself ("middle of the | meio da") and becomes the grown
// LEGO; B02 already read "in the middle of the | no meio da", so it would be a duplicate of B01 and goes.
// Every other row under L01 already contains "in the middle of the | no meio da" on both sides.
// Course-wide: no row outside seed 108 says "meio d…" or "middle" (checked in plan()).
//
// AUDIO, make-before-break, all through the one route (tools/audio/render.cjs):
//   LEGO known/target1/target2 = the existing B02 clips (library hits, same Bella/Brenda/Julio voices
//   as the rest of seed 108; 0 chars). Intro = new clip bced3fbc… rendered BEFORE this runs (112 chars,
//   course cast voice Charlotte). The old intro clip 34be6df4… is unlinked (lego_id cleared), never deleted.
//
//   node tools/course-optimization/por-br-108-grow-no-meio-da-2026-10-06.cjs           # dry run
//   APPLY=1 node tools/course-optimization/por-br-108-grow-no-meio-da-2026-10-06.cjs   # write

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'por_br_for_eng';
const SEED = 108;
const JOB = '#349·K';
const SWEEP = 'por-br-108-grow-no-meio-da-2026-10-06';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = "Kai, 2026-10-06 (job #349·K, ruling B): 'no' in 'no meio da noite' is uncovered; S0108L01 grows to 'in the middle of the | no meio da' (S3/L27)";
const SENTENCE = { known: "we didn't hope to wake in the middle of the night", target: 'nós não esperávamos acordar no meio da noite' };
const LEGO = {
  id: 'S0108L01',
  from: { known: 'middle of the', target: 'meio da' },
  to: { known: 'in the middle of the', target: 'no meio da',
    components: [{ known: 'in the', target: 'no' }, { known: 'middle', target: 'meio' }, { known: 'of the', target: 'da' }] },
};
const NEW_INTRO = { id: 'bced3fbc-ad87-4e76-9467-6c90ca5d1ef8',
  text: "The Portuguese for: 'in the middle of the', as in — 'it wasn't possible to wait in the middle of the night', is:" };
const OLD_INTRO = '34be6df4-3a17-4eaf-b04e-cc1038af9134';
const P = (s) => `${COURSE}:${s}`;
const B01 = P('S0108L01B01'), B02 = P('S0108L01B02');

const norm = (s) => String(s || '').toLowerCase().replace(/[.,!?;:"]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
function containsWords(hay, needle) {
  const h = words(hay);
  for (const w of words(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); }
  return true;
}
const containsRun = (hay, needle) => ` ${norm(hay)} `.includes(` ${norm(needle)} `);
const tile = (cs, side) => cs.map((c) => c[side]).join(' ');

/** Pure plan over the live rows; every guard that can be checked without writing. */
function plan(rows) {
  const problems = [];
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  const seed = rows.find((r) => r.kind === 'seed' && r.sn === SEED);
  if (!seed || seed.known !== SENTENCE.known || seed.target !== SENTENCE.target) problems.push(`seed ${SEED} is not "${SENTENCE.known}"`);
  const l = byId[LEGO.id];
  if (!l || l.known !== LEGO.from.known || l.target !== LEGO.from.target) problems.push(`${LEGO.id} not in pre-state (${l && l.known} | ${l && l.target})`);
  if (l && l.is_new !== true) problems.push(`${LEGO.id} is_new is not true`);
  // the grown LEGO is a contiguous piece of the seed, and its components tile it in order on both sides
  if (!containsRun(SENTENCE.known, LEGO.to.known) || !containsRun(SENTENCE.target, LEGO.to.target)) problems.push('grown LEGO is not a piece of the seed');
  if (norm(tile(LEGO.to.components, 'known')) !== norm(LEGO.to.known) || norm(tile(LEGO.to.components, 'target')) !== norm(LEGO.to.target)) problems.push('components do not tile the LEGO');
  // after the change: L01 + L02 tile the seed (S3)
  const l2 = byId['S0108L02'];
  if (l2 && norm(`${l2.target} ${LEGO.to.target} noite`) !== norm(SENTENCE.target)) problems.push('L01+L02 (+noite, already taught) do not tile the seed target');
  // phrases under L01 after the change
  const under = rows.filter((r) => r.id.startsWith(P(LEGO.id)) && r.kind !== 'component' && r.id !== B02)
    .map((r) => (r.id === B01 ? { ...r, known: LEGO.to.known, target: LEGO.to.target } : r));
  for (const p of under) if (!containsRun(p.known, LEGO.to.known) || !containsRun(p.target, LEGO.to.target)) problems.push(`${p.id} does not contain the grown LEGO`);
  const b2 = byId[B02];
  if (!b2 || norm(b2.known) !== norm(LEGO.to.known) || norm(b2.target) !== norm(LEGO.to.target)) problems.push('B02 is not the would-be duplicate "in the middle of the | no meio da"');
  const seen = new Set();
  for (const p of under) { const k = `${norm(p.known)}|${norm(p.target)}`; if (seen.has(k)) problems.push(`duplicate under L01: ${p.id}`); seen.add(k); }
  // course-wide (O12): anything outside seed 108 using the old or new gloss / target
  const elsewhere = rows.filter((r) => r.sn !== SEED && r.kind !== 'seed' && (/\bmeio d[oa]\b/i.test(r.target) || /\bmiddle\b/i.test(r.known))).map((r) => r.id);
  // ZUT: the new pair against every LEGO and non-component phrase in the course
  const zut = rows.filter((r) => r.kind !== 'component' && r.kind !== 'seed' && r.id !== LEGO.id && r.id !== B01 && r.id !== B02 && (
    (norm(r.known) === norm(LEGO.to.known) && norm(r.target) !== norm(LEGO.to.target)) ||
    (norm(r.target) === norm(LEGO.to.target) && norm(r.known) !== norm(LEGO.to.known)))).map((r) => `${r.id} "${r.known}" → "${r.target}"`);
  if (zut.length) problems.push(`ZUT: ${zut.join('; ')}`);
  // a later LEGO that is now a both-sides duplicate of the grown one
  const dupLegos = rows.filter((r) => r.kind === 'lego' && r.id !== LEGO.id && norm(r.known) === norm(LEGO.to.known) && norm(r.target) === norm(LEGO.to.target)).map((r) => r.id);
  if (dupLegos.length) problems.push(`duplicate LEGO(s): ${dupLegos.join(', ')}`);
  return { problems, under: under.map((p) => p.id), elsewhere, zut, dupLegos };
}

async function loadRows(pg) {
  const { rows } = await pg.query(
    `SELECT 'lego' AS kind, seed_number AS sn, lego_id AS id, known_text AS known, target_text AS target, is_new FROM course_legos WHERE course_code=$1
     UNION ALL SELECT phrase_role, seed_number, id, known_text, target_text, NULL FROM course_practice_phrases WHERE course_code=$1
     UNION ALL SELECT 'seed', seed_number, seed_id, known_text, target_text, NULL FROM course_seeds WHERE course_code=$1`, [COURSE]);
  return rows.map((r) => ({ ...r, sn: Number(r.sn) }));
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  try {
    const D = plan(await loadRows(pg));
    // the clips the LEGO will point at: B02's three (library) + the new intro — alive and saying the right words
    const { rows: [b2] } = await pg.query('SELECT known_audio_id, target1_audio_id, target2_audio_id, target1_duration_ms, target2_duration_ms FROM course_practice_phrases WHERE id=$1', [B02]);
    const ids = b2 ? [b2.known_audio_id, b2.target1_audio_id, b2.target2_audio_id, NEW_INTRO.id] : [NEW_INTRO.id];
    const { rows: clips } = await pg.query('SELECT id::text, role, voice_id, text, s3_key, duration_ms FROM course_audio WHERE id::text = ANY($1)', [ids]);
    const C = Object.fromEntries(clips.map((c) => [c.id, c]));
    const want = b2 ? [[b2.known_audio_id, 'known', LEGO.to.known], [b2.target1_audio_id, 'target1', LEGO.to.target], [b2.target2_audio_id, 'target2', LEGO.to.target], [NEW_INTRO.id, 'presentation', NEW_INTRO.text]] : [];
    for (const [id, role, text] of want) { const c = C[id]; if (!c || !c.s3_key || c.role !== role || norm(c.text) !== norm(text)) D.problems.push(`clip ${id} (${role}) missing or not "${text}"`); }
    console.log(`══ ${COURSE} seed ${SEED} — grow ${LEGO.id} — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
    console.log(`  ${LEGO.id}: "${LEGO.from.known} | ${LEGO.from.target}" → "${LEGO.to.known} | ${LEGO.to.target}"`);
    console.log(`  B01 → the grown LEGO (B02's clips); B02 deleted (duplicate); rows kept under L01: ${D.under.length}`);
    console.log(`  clips: ${want.map(([id, r]) => `${r}=${C[id] ? C[id].voice_id : 'MISSING'}`).join(' ')}`);
    console.log(`  rows outside seed ${SEED} using middle/meio d…: ${D.elsewhere.length ? D.elsewhere.join(', ') : 'none'}`);
    console.log(`  ZUT: ${D.zut.length ? D.zut.join('; ') : 'no clash'}; duplicate LEGOs: ${D.dupLegos.length ? D.dupLegos.join(', ') : 'none'}`);
    if (D.problems.length) { console.log('PROBLEMS:\n  ' + D.problems.join('\n  ')); process.exitCode = 2; return; }
    console.log('guards hold');
    if (!APPLY) { console.log('DRY RUN — nothing written'); return; }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
    const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
    const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
    const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
    const ev = (operation, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation, scope, detail: { ruling: RULING, job: JOB, ...detail } });
    const le = await ev('lego-edit', { seed_numbers: [SEED], lego_ids: [LEGO.id], rows: 1 }, { from: LEGO.from, to: LEGO.to, intro: { old: OLD_INTRO, new: NEW_INTRO.id } });
    const pe = await ev('phrase-edit', { seed_numbers: [SEED], phrase_ids: [B01], rows: 1 }, { what: 'B01 is the LEGO itself: now the grown LEGO, on B02\'s clips' });
    const de = await ev('phrase-delete', { seed_numbers: [SEED], phrase_ids: [B02], rows: 1 }, { why: 'B02 "in the middle of the | no meio da" duplicates the grown B01' });
    const { rows: [dn] } = await pg.query(`SELECT count(*)::int n FROM course_practice_phrases WHERE course_code=$1 AND id<>$3 AND decomposition::text LIKE $2`, [COURSE, `%"${LEGO.id}"%`, B02]);
    const xe = await ev('phrase-edit', { seed_numbers: [SEED], rows: dn.n }, { what: `stored decompositions naming ${LEGO.id} recomputed (no text change)` });
    const ue = await ev('unapprove', { seed_numbers: [SEED], rows: 1 }, { why: `${LEGO.id} grown` });

    const { decomposeAnchored } = require('../../services/phrase-decomposer.cjs');
    await pg.query('BEGIN');
    try {
      const u = await pg.query(`UPDATE course_legos SET known_text=$1, target_text=$2, components=$3, known_audio_id=$4, target1_audio_id=$5, target2_audio_id=$6,
          target1_duration_ms=$7, target2_duration_ms=$8, presentation_audio_id=$9, last_edit_event_id=$10, updated_at=now()
        WHERE course_code=$11 AND lego_id=$12 AND known_text=$13 AND target_text=$14 AND is_new=true`,
        [LEGO.to.known, LEGO.to.target, JSON.stringify(LEGO.to.components), b2.known_audio_id, b2.target1_audio_id, b2.target2_audio_id,
          b2.target1_duration_ms, b2.target2_duration_ms, NEW_INTRO.id, le, COURSE, LEGO.id, LEGO.from.known, LEGO.from.target]);
      if (u.rowCount !== 1) throw new Error(`lego update ${u.rowCount}`);
      await pg.query('UPDATE course_audio SET lego_id=$1 WHERE id=$2', [LEGO.id, NEW_INTRO.id]);
      await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id=$1 AND lego_id=$2', [OLD_INTRO, LEGO.id]);   // unlinked, not deleted (O11)
      const p1 = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=1, known_audio_id=$4, target1_audio_id=$5, target2_audio_id=$6,
          target1_duration_ms=$7, target2_duration_ms=$8, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL,
          last_edit_event_id=$9, updated_at=now() WHERE id=$10 AND known_text=$11 AND target_text=$12`,
        [LEGO.to.known, LEGO.to.target, LEGO.to.target.length, b2.known_audio_id, b2.target1_audio_id, b2.target2_audio_id, b2.target1_duration_ms, b2.target2_duration_ms, pe, B01, LEGO.from.known, LEGO.from.target]);
      if (p1.rowCount !== 1) throw new Error(`B01 update ${p1.rowCount}`);
      const d = await pg.query(`DELETE FROM course_practice_phrases WHERE id=$1 AND phrase_role='build' AND target_text=$2`, [B02, LEGO.to.target]);
      if (d.rowCount !== 1) throw new Error(`B02 delete ${d.rowCount}`);
      // decompositions: recompute every stored one naming the LEGO (and B01's, cleared above)
      const { rows: legos } = await pg.query('SELECT lego_id, seed_number, target_text, known_text FROM course_legos WHERE course_code=$1', [COURSE]);
      const vocab = legos.map((x) => ({ lego_id: x.lego_id, target_text: x.target_text, known_text: x.known_text, seed_number: x.seed_number }));
      const byLego = new Map(vocab.map((x) => [x.lego_id, x]));
      const { rows: dp } = await pg.query(`SELECT id, seed_number, lego_index, target_text FROM course_practice_phrases WHERE course_code=$1 AND (decomposition::text LIKE $2 OR id=$3)`, [COURSE, `%"${LEGO.id}"%`, B01]);
      let recomputed = 0;
      for (const p of dp) {
        const parent = byLego.get(`S${String(p.seed_number).padStart(4, '0')}L${String(p.lego_index).padStart(2, '0')}`) || null;
        const r = decomposeAnchored(p.target_text, vocab.filter((x) => x.seed_number <= p.seed_number), parent, COURSE);
        if (r.kind === 'error') throw new Error(`decomposition of ${p.id} failed: phrase does not contain its own LEGO`);
        await pg.query('UPDATE course_practice_phrases SET decomposition=$1, last_edit_event_id=$2 WHERE id=$3', [JSON.stringify(r.blocks), p.id === B01 ? pe : xe, p.id]);
        recomputed++;
      }
      const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=$3', [ue, COURSE, SEED]);
      if (un.rowCount !== 1) throw new Error('unapprove');
      const { rows: [n] } = await pg.query('SELECT count(*)::int n FROM course_legos WHERE course_code=$1 AND seed_number=$2', [COURSE, SEED]);
      if (n.n !== 2) throw new Error('LEGO count changed — never delete a LEGO');
      await pg.query('COMMIT');
      console.log(`APPLIED: events lego=${le} phrase=${pe} delete=${de} decomp=${xe} unapprove=${ue}; decompositions recomputed: ${recomputed}`);
    } catch (e) { await pg.query('ROLLBACK'); throw e; }
    await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  } finally { await pg.end(); }
}

module.exports = { plan, LEGO, SENTENCE, containsRun };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
