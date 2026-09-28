#!/usr/bin/env node
// tools/course-optimization/ita-zut-groupa-fixes-2026-09-28.cjs
//
// ita_for_eng: the eight Check-10 (ZUT) group-A phrase rows Kai approved on
// 2026-09-28 (triage doc d/47241e43; the live DB outranks it and every row is
// re-asserted below before it is touched). English was right, Italian broken,
// except where the not-yet-taught rule forced the English to shrink instead.
//
// KAI'S METHOD, applied row by row (his words: expand to the LEGO, or shrink to
// a chunk where both sides match exactly — equally good — but NO PART OF THE
// SEED MAY BE DROPPED, every phrase must still contain its LEGO, and a phrase
// may use no word the learner has not yet been taught):
//
//   S0403L03B01  remain quiet            in silenzio → rimanere in silenzio      EXPAND (Kai's call)
//   S0376L01B01  didn't go anywhere      da nessuna parte → non sono andato da nessuna parte
//                known → "I didn't go anywhere"                                   EXPAND (Kai's call, with subject)
//   S0376L01     LEGO known "didn't go anywhere" → "I didn't go anywhere": the Italian
//                carries the subject (sono = I am), so the English now matches both sides.
//   S0116L01B03  the best choice / la scelta → the choice / la scelta            SHRINK: "migliore" is new
//                at S0116L02, so a build under L01 may not use it; "la scelta migliore" stays taught by L02.
//   S0642L01U03  I can help you madam / posso aiutare, signora → I can help madam   SHRINK the English:
//   S0642L01U04  I'm going to help you madam / sto per aiutare → I'm going to help madam
//                "aiutarla" is first taught at S0645L01 (is_new), three seeds LATER, so seed 642
//                cannot say it. The Italian stays; the English drops the "you" it never carried.
//   S0618L02B03  a lot of time has passed   molto tempo passato → è passato molto tempo   (the use row already had it)
//   S0478L03B03  she has such a kind heart  un cuore così gentile ha lei → ha un cuore così gentile
//   S0410L02U05  I don't want to argue      voglio non litigare → non voglio litigare  (S0501L03B02 already had it)
//
// WHAT IT WRITES (and nothing else):
//   course_practice_phrases  8 rows: known_text/target_text, word_count, qa_checked = NULL
//   course_legos             1 row:  S0376L01 known_text
//   course_seeds             7 rows: approved_at = NULL (any text change puts the seed back in the proofreading queue)
//   content_edit_events      3 rows, stamped on every row via last_edit_event_id
// It writes NO audio. The BEFORE UPDATE triggers (trg_null_*_audio_on_text_change) relink a
// same-voice clip that already speaks the new text, or null the slot; the nulled slots are
// listed at the end for the phase8 /regenerate-phrase and /regenerate-lego calls that follow.
// No lego_id / lego_index / seed_number moves: course_round_index needs no refresh and
// learner progress (keyed by lego_id) is untouched.
//
// Dry run is the DEFAULT. APPLY=1 writes. Every live row is asserted against its
// expected before-text and the run aborts on any drift.
//
//   node tools/course-optimization/ita-zut-groupa-fixes-2026-09-28.cjs
//   APPLY=1 node tools/course-optimization/ita-zut-groupa-fixes-2026-09-28.cjs

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-zut-groupa-fixes-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;

// Phrase ids are the deterministic text ids (course:SxxxxLyyRzz).
const PHRASES = [
  { id: 'S0403L03B01', lego: 'S0403L03', how: 'expand',
    before: { known: 'remain quiet', target: 'in silenzio' },
    after:  { known: 'remain quiet', target: 'rimanere in silenzio' } },
  { id: 'S0376L01B01', lego: 'S0376L01', how: 'expand',
    before: { known: "didn't go anywhere", target: 'da nessuna parte' },
    after:  { known: "I didn't go anywhere", target: 'non sono andato da nessuna parte' } },
  { id: 'S0116L01B03', lego: 'S0116L01', how: 'shrink',
    before: { known: 'the best choice', target: 'la scelta' },
    after:  { known: 'the choice', target: 'la scelta' } },
  { id: 'S0642L01U03', lego: 'S0642L01', how: 'shrink-known',
    before: { known: 'I can help you madam', target: 'posso aiutare, signora' },
    after:  { known: 'I can help madam', target: 'posso aiutare, signora' } },
  { id: 'S0642L01U04', lego: 'S0642L01', how: 'shrink-known',
    before: { known: "I'm going to help you madam", target: 'sto per aiutare, signora' },
    after:  { known: "I'm going to help madam", target: 'sto per aiutare, signora' } },
  { id: 'S0618L02B03', lego: 'S0618L02', how: 'repair',
    before: { known: 'a lot of time has passed', target: 'molto tempo passato' },
    after:  { known: 'a lot of time has passed', target: 'è passato molto tempo' } },
  { id: 'S0478L03B03', lego: 'S0478L03', how: 'repair',
    before: { known: 'she has such a kind heart', target: 'un cuore così gentile ha lei' },
    after:  { known: 'she has such a kind heart', target: 'ha un cuore così gentile' } },
  { id: 'S0410L02U05', lego: 'S0410L02', how: 'repair',
    before: { known: "I don't want to argue", target: 'voglio non litigare' },
    after:  { known: "I don't want to argue", target: 'non voglio litigare' } },
];

const LEGOS = [
  { id: 'S0376L01',
    before: { known: "didn't go anywhere", target: 'non sono andato da nessuna parte' },
    after:  { known: "I didn't go anywhere", target: 'non sono andato da nessuna parte' } },
];

// Every seed a text change touches goes back to the proofreading queue.
const SEEDS_TO_UNAPPROVE = [...new Set(PHRASES.map(p => Number(p.id.slice(1, 5))))];

// The two vocabulary facts the shrinks rest on. Asserted live so the tool
// refuses to run if the course has moved under it.
const VOCAB_FACTS = [
  { word: 'aiutarla', firstLegoSeed: 645, why: 'seed 642 may not say aiutarla' },
  { word: 'migliore', firstLegoSeed: 116, firstLego: 'S0116L02', why: 'a build under S0116L01 may not say migliore' },
];

const norm = s => (s || '').toLowerCase().replace(/[\s.,?!;:]+/g, ' ').trim();
const contains = (phrase, lego) => (' ' + norm(phrase) + ' ').includes(' ' + norm(lego) + ' ');

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { decoratePhrasesWithDecomposition } = require('../../services/phrase-decomposition-writer.cjs');
  const { evidencePath } = require('../lib/evidence-path.cjs');

  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const log = { apply: APPLY, started: new Date().toISOString(), phrases: [], legos: [], seeds: [], aborted: [], audioBefore: {}, audioAfter: {} };

  // ── vocabulary facts ──
  for (const f of VOCAB_FACTS) {
    const { rows } = await pg.query(
      `SELECT min(seed_number) AS first FROM course_legos WHERE course_code=$1 AND lower(target_text) ~ ('\\m' || $2 || '\\M')`, [COURSE, f.word]);
    if (Number(rows[0].first) !== f.firstLegoSeed) log.aborted.push(`vocab drift: "${f.word}" first LEGO seed is ${rows[0].first}, expected ${f.firstLegoSeed} (${f.why})`);
    if (f.firstLego) {
      const { rows: r2 } = await pg.query(`SELECT lego_id FROM course_legos WHERE course_code=$1 AND seed_number=$2 AND lower(target_text) ~ ('\\m' || $3 || '\\M') ORDER BY lego_index LIMIT 1`, [COURSE, f.firstLegoSeed, f.word]);
      if (r2[0]?.lego_id !== f.firstLego) log.aborted.push(`vocab drift: "${f.word}" first LEGO is ${r2[0]?.lego_id}, expected ${f.firstLego}`);
    }
  }

  // ── phrases: read, assert, check LEGO containment and ZUT ──
  const ids = PHRASES.map(p => `${COURSE}:${p.id}`);
  const { rows: prows } = await pg.query(
    `SELECT p.id, p.seed_number, p.lego_id, p.phrase_role, p.known_text, p.target_text, p.qa_checked,
            p.known_audio_id, p.target1_audio_id, p.target2_audio_id, l.target_text AS lego_target, l.lego_id AS lego_id_joined
       FROM course_practice_phrases p JOIN course_legos l ON l.course_code=p.course_code AND l.seed_number=p.seed_number AND l.lego_index=p.lego_index
      WHERE p.course_code=$1 AND p.id = ANY($2)`, [COURSE, ids]);
  for (const p of PHRASES) {
    const live = prows.find(r => r.id === `${COURSE}:${p.id}`);
    if (!live) { log.aborted.push(`phrase ${p.id} not found`); continue; }
    if (live.known_text !== p.before.known || live.target_text !== p.before.target) {
      log.aborted.push(`phrase ${p.id} drift: live="${live.known_text}" / "${live.target_text}"`); continue;
    }
    // p.lego_id is NULL on these rows; the FK (seed_number, lego_index) is what binds a phrase to its LEGO.
    if (live.lego_id_joined !== p.lego) log.aborted.push(`phrase ${p.id} sits under ${live.lego_id_joined}, expected ${p.lego}`);
    if (!contains(p.after.target, live.lego_target)) log.aborted.push(`phrase ${p.id} after-text "${p.after.target}" does not contain its LEGO "${live.lego_target}"`);
    // ZUT: the new English must not already map elsewhere to a different Italian.
    const { rows: clash } = await pg.query(
      `SELECT id, target_text FROM course_practice_phrases WHERE course_code=$1 AND id<>$2 AND lower(trim(known_text))=lower(trim($3)) AND lower(trim(target_text))<>lower(trim($4))
       UNION ALL SELECT lego_id, target_text FROM course_legos WHERE course_code=$1 AND lower(trim(known_text))=lower(trim($3)) AND lower(trim(target_text))<>lower(trim($4))`,
      [COURSE, live.id, p.after.known, p.after.target]);
    const real = clash.filter(c => !LEGOS.some(l => l.id === c.id)); // S0376L01 is being changed in the same pass
    if (real.length) log.aborted.push(`ZUT: ${p.id} "${p.after.known}" already maps to ${real.map(c => `"${c.target_text}" (${c.id})`).join(', ')}`);
    log.phrases.push({ id: live.id, role: live.phrase_role, how: p.how, before: p.before, after: p.after, wasChecked: !!live.qa_checked,
      audio: { known: live.known_audio_id, target1: live.target1_audio_id, target2: live.target2_audio_id } });
    log.audioBefore[live.id] = { known: live.known_audio_id, target1: live.target1_audio_id, target2: live.target2_audio_id };
  }

  // ── legos ──
  const { rows: lrows } = await pg.query(
    `SELECT lego_id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)`,
    [COURSE, LEGOS.map(l => l.id)]);
  for (const l of LEGOS) {
    const live = lrows.find(r => r.lego_id === l.id);
    if (!live) { log.aborted.push(`lego ${l.id} not found`); continue; }
    if (live.known_text !== l.before.known || live.target_text !== l.before.target) { log.aborted.push(`lego ${l.id} drift: live="${live.known_text}" / "${live.target_text}"`); continue; }
    const { rows: clash } = await pg.query(
      `SELECT lego_id AS id, target_text FROM course_legos WHERE course_code=$1 AND lego_id<>$2 AND lower(trim(known_text))=lower(trim($3)) AND lower(trim(target_text))<>lower(trim($4))`,
      [COURSE, l.id, l.after.known, l.after.target]);
    if (clash.length) log.aborted.push(`ZUT: lego ${l.id} "${l.after.known}" already maps to ${clash.map(c => `"${c.target_text}" (${c.id})`).join(', ')}`);
    log.legos.push({ id: l.id, before: l.before, after: l.after, audio: { known: live.known_audio_id, presentation: live.presentation_audio_id } });
    log.audioBefore[l.id] = { known: live.known_audio_id };
  }

  // ── seeds ──
  const { rows: srows } = await pg.query(`SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2)`, [COURSE, SEEDS_TO_UNAPPROVE]);
  for (const n of SEEDS_TO_UNAPPROVE) {
    const live = srows.find(r => r.seed_number === n);
    if (!live) { log.aborted.push(`seed ${n} not found`); continue; }
    log.seeds.push({ n, wasApproved: !!live.approved_at });
  }

  console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${COURSE}: ${log.phrases.length}/${PHRASES.length} phrases, ${log.legos.length}/${LEGOS.length} legos, ${log.seeds.length} seeds to unapprove (${SEEDS_TO_UNAPPROVE.join(', ')})`);
  for (const p of log.phrases) console.log(`  ${p.id} [${p.how}] "${p.before.known}" / "${p.before.target}"  →  "${p.after.known}" / "${p.after.target}"`);
  for (const l of log.legos) console.log(`  LEGO ${l.id} "${l.before.known}" → "${l.after.known}" (target unchanged)`);
  if (log.aborted.length) { console.log('\nABORT CONDITIONS:'); log.aborted.forEach(a => console.log('  ' + a)); }

  if (!APPLY || log.aborted.length) {
    const f = evidencePath(`tools/course-optimization/${SWEEP}/dryrun-${stamp}.json`);
    fs.writeFileSync(f, JSON.stringify(log, null, 2));
    console.log(`\nWrote ${f}${log.aborted.length ? ' — NOT applying' : ''}`);
    await pg.end();
    process.exit(log.aborted.length ? 2 : 0);
  }

  // ── APPLY ──
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit',
    scope: { phrase_ids: log.phrases.map(p => p.id), seed_numbers: SEEDS_TO_UNAPPROVE, rows: log.phrases.length },
    detail: { source: 'Check 10 ZUT triage group A, d/47241e43, approved by Kai 2026-09-28', edits: log.phrases.map(p => ({ id: p.id, how: p.how, before: p.before, after: p.after })) } });
  const legoEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-update',
    scope: { lego_ids: log.legos.map(l => l.id), rows: log.legos.length },
    detail: { edits: log.legos.map(l => ({ id: l.id, before: l.before, after: l.after })) } });
  const seedEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove',
    scope: { seed_numbers: SEEDS_TO_UNAPPROVE, rows: SEEDS_TO_UNAPPROVE.length },
    detail: { why: 'phrase/LEGO text under these seeds changed; back to the proofreading queue' } });
  log.events = { phraseEvent, legoEvent, seedEvent };

  await pg.query('BEGIN');
  try {
    for (const p of log.phrases) {
      const r = await pg.query(
        `UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=length($2), qa_checked=NULL, last_edit_event_id=$3, updated_at=now()
          WHERE course_code=$4 AND id=$5 AND known_text=$6 AND target_text=$7
          RETURNING known_audio_id, target1_audio_id, target2_audio_id`,
        [p.after.known, p.after.target, phraseEvent, COURSE, p.id, p.before.known, p.before.target]);
      if (r.rowCount !== 1) throw new Error(`phrase ${p.id} write race`);
      log.audioAfter[p.id] = { known: r.rows[0].known_audio_id, target1: r.rows[0].target1_audio_id, target2: r.rows[0].target2_audio_id };
    }
    for (const l of log.legos) {
      const r = await pg.query(
        `UPDATE course_legos SET known_text=$1, last_edit_event_id=$2, updated_at=now()
          WHERE course_code=$3 AND lego_id=$4 AND known_text=$5 AND target_text=$6 RETURNING known_audio_id`,
        [l.after.known, legoEvent, COURSE, l.id, l.before.known, l.before.target]);
      if (r.rowCount !== 1) throw new Error(`lego ${l.id} write race`);
      log.audioAfter[l.id] = { known: r.rows[0].known_audio_id };
    }
    const s = await pg.query(`UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)`,
      [seedEvent, COURSE, SEEDS_TO_UNAPPROVE]);
    if (s.rowCount !== SEEDS_TO_UNAPPROVE.length) throw new Error(`expected ${SEEDS_TO_UNAPPROVE.length} seeds unapproved, got ${s.rowCount}`);
    await pg.query('COMMIT');
  } catch (e) {
    await pg.query('ROLLBACK');
    console.error('ROLLED BACK:', e.message);
    await pg.end();
    process.exit(1);
  }

  // Stored decompositions embed the target text, so recompute them for the rows whose Italian changed.
  const decoRows = log.phrases.filter(p => p.after.target !== p.before.target)
    .map(p => ({ id: p.id, course_code: COURSE, seed_number: Number(p.id.match(/S(\d{4})/)[1]), target_text: p.after.target }));
  try { log.decomposition = await decoratePhrasesWithDecomposition(supabase, decoRows); } catch (e) { log.decomposition = { error: e.message }; }

  // What the triggers did to the audio links, and which slots now need a render.
  log.needsRender = [];
  for (const [id, after] of Object.entries(log.audioAfter)) {
    const before = log.audioBefore[id];
    for (const role of Object.keys(after)) {
      if (after[role] === null && before[role] !== null) log.needsRender.push({ id, role, was: before[role] });
      else if (after[role] !== before[role]) (log.relinked = log.relinked || []).push({ id, role, from: before[role], to: after[role] });
    }
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/applied-${stamp}.json`);
  fs.writeFileSync(f, JSON.stringify(log, null, 2));
  console.log(`\nAPPLIED. events=${JSON.stringify(log.events)}`);
  console.log(`relinked by trigger (same voice, text already voiced): ${(log.relinked || []).length}`);
  for (const r of log.relinked || []) console.log(`  ${r.id} ${r.role}: ${r.from} → ${r.to}`);
  console.log(`slots nulled, need a render: ${log.needsRender.length}`);
  for (const r of log.needsRender) console.log(`  ${r.id} ${r.role} (was ${r.was})`);
  console.log(`Wrote ${f}`);
  await pg.end();
}

module.exports = { PHRASES, LEGOS, SEEDS_TO_UNAPPROVE, contains };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
