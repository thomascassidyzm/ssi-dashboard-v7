#!/usr/bin/env node
'use strict';
// tools/course-optimization/por-seed-sentences-in-played-baskets-2026-10-02.cjs
//
// por_for_eng — canon P26 (EVERY SEED SENTENCE SITS IN A PLAYED BASKET), applied as the Italian #635·I pass did.
// Kai, 2026-10-02 (job #357): "apply what is CLEARLY the same as what I already ruled for Italian".
//
// The rule and the home-choosing logic are NOT re-implemented here: `plan` / `chooseHome` / `nextUseSlot` come from
// the Italian tool, so the two courses are judged by one piece of code. What is Portuguese-specific is only the load
// and the audio: the seed's own clips are linked (target1 Raquel, target2 Duarte, known = whatever the seed carries);
// a seed whose target clip is missing or off-cast is LISTED, never rendered — this job renders nothing.
// Seeds are NOT unapproved (adding the seed's own sentence is not a word change). ZUT: a seed English that already
// stands over a different Portuguese anywhere is LISTED (P16), as in Italian.
//
//   node tools/course-optimization/por-seed-sentences-in-played-baskets-2026-10-02.cjs        # dry run
//   APPLY=1 node …                                                                              # write

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const ITA = require('./ita-seed-sentences-in-played-baskets-2026-09-28.cjs');

const COURSE = 'por_for_eng';
const SWEEP = 'por-seed-sentences-in-played-baskets-2026-10-02';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#357';
const RULING = 'Kai, 2026-10-02 (job #357): apply the Italian rulings that clearly carry over — canon P26 (Kai 2026-09-28, job #635·I): each seed sentence not already a phrase under a NEW LEGO is added as a USE row under a new LEGO it contains, reusing the seed\'s clips; seeds not unapproved';
/** The course's cast voices (live: 660 of 668 seeds' target clips are on these). */
const CAST = { target1: ['azure_pt-PT-RaquelNeural', 'pt-PT-RaquelNeural'], target2: ['azure_pt-PT-DuarteNeural', 'pt-PT-DuarteNeural'] };

/** A seed's clips are reusable for its USE row only if every slot is present and each target clip is on its cast voice. */
function reusableSeedAudio(seed, clipsById) {
  const why = [];
  if (!seed.known_audio_id) why.push('no known clip');
  for (const role of ['target1', 'target2']) {
    const c = clipsById[seed[`${role}_audio_id`]];
    if (!c) why.push(`no ${role} clip`);
    else if (!CAST[role].includes(c.voice_id)) why.push(`${role} clip on ${c.voice_id}`);
    else if (!c.s3_key || c.s3_key.startsWith('pending/')) why.push(`${role} clip not mastered`);
  }
  return why;
}

async function load(pg) {
  const { rows: seeds } = await pg.query('SELECT seed_number, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, approved_at FROM course_seeds WHERE course_code=$1 ORDER BY seed_number', [COURSE]);
  const { rows: legos } = await pg.query('SELECT lego_id, seed_number, lego_index, is_new, known_text, target_text FROM course_legos WHERE course_code=$1 ORDER BY seed_number, lego_index', [COURSE]);
  const { rows: phrases } = await pg.query(`SELECT p.id, p.seed_number, p.lego_index, p.position, p.phrase_role, p.known_text, p.target_text, l.is_new, l.lego_id FROM course_practice_phrases p JOIN course_legos l ON l.course_code=p.course_code AND l.seed_number=p.seed_number AND l.lego_index=p.lego_index WHERE p.course_code=$1`, [COURSE]);
  const first = { known: new Map(), target: new Map() };
  const feed = (side, n, text) => { for (const w of new Set(ITA.norm(text).split(' ').filter(Boolean))) { const m = first[side]; if (!m.has(w) || m.get(w) > n) m.set(w, n); } };
  for (const s of seeds) { feed('known', s.seed_number, s.known_text); feed('target', s.seed_number, s.target_text); }
  for (const l of legos) { feed('known', l.seed_number, l.known_text); feed('target', l.seed_number, l.target_text); }
  for (const p of phrases) { feed('known', p.seed_number, p.known_text); feed('target', p.seed_number, p.target_text); }
  const wordTaught = (w, side) => (first[side].has(w) ? first[side].get(w) : Infinity);
  const ids = seeds.flatMap((s) => [s.known_audio_id, s.target1_audio_id, s.target2_audio_id]).filter(Boolean);
  const { rows: clips } = await pg.query('SELECT id, voice_id, s3_key FROM course_audio WHERE id = ANY($1)', [ids]);
  return { seeds, legos, phrases, wordTaught, clipsById: Object.fromEntries(clips.map((c) => [c.id, c])) };
}

/** Homes the plan would choose that this job judged wrong — listed, never written. */
const HOLD = {
  43: 'only home is S0074L02 "to | a" at a LATER seed, matched by coincidence (the a of estar a pensar, the to of how to answer) — needs a real home (L30), Kai',
  406: 'only home is S0654L01 "sure | a certeza", a FORMAL seed: every phrase there must end sir/madam (K32), and 406\'s LEGO says vai ficar bem where its seed says vai correr bem (L26) — Kai',
};
/** ITA.plan, then drop (and list) any row whose seed clips cannot be reused — this job renders nothing. */
function planPor(db) {
  const p = ITA.plan(db, { skip: [] });
  const seedsByN = Object.fromEntries(db.seeds.map((s) => [s.seed_number, s]));
  const rows = [], audioHeld = [];
  for (const r of p.rows) {
    if (HOLD[r.seed]) { p.listed.push({ seed: r.seed, known: r.known, target: r.target, why: HOLD[r.seed] }); continue; }
    const why = reusableSeedAudio(seedsByN[r.seed], db.clipsById);
    if (why.length) audioHeld.push({ seed: r.seed, known: r.known, target: r.target, why: `seed clips not reusable (${why.join(', ')}) — would need a render` });
    else rows.push(r);
  }
  // ids were sequenced across all planned rows; a dropped row leaves a gap in U-numbers, which is harmless.
  return { ...p, rows, audioHeld };
}

async function apply(pg, supabase, rows, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const event = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-add',
    scope: { seed_numbers: [...new Set(rows.map((r) => r.lego_seed))].sort((a, b) => a - b), phrase_ids: rows.map((r) => `${COURSE}:${r.id}`), rows: rows.length },
    detail: { ruling: RULING, job: JOB, rows: rows.map((r) => ({ id: `${COURSE}:${r.id}`, from_seed: r.seed, lego: r.lego_id, why: r.why, before: null, after: { known: r.known, target: r.target } })) } });
  log.event = event;
  await pg.query('BEGIN');
  try {
    for (const r of rows) {
      const { rows: clash } = await pg.query('SELECT 1 FROM course_practice_phrases WHERE course_code=$1 AND id=$2', [COURSE, `${COURSE}:${r.id}`]);
      if (clash.length) throw new Error(`${r.id} already exists — re-run the plan`);
      const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, known_audio_id, target1_audio_id, target2_audio_id, last_edit_event_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft','use','{}',$11,$12,true,$13,$14,$15,$16)`,
      [`${COURSE}:${r.id}`, COURSE, r.lego_seed, r.lego_index, r.position, r.known, r.target, r.target.length, r.target.split(/\s+/).length,
        JSON.stringify({ format: 'build_use', source: SWEEP, job: JOB, seed_sentence_of: r.seed, why: r.why }), r.lego_position, r.lego_id, r.audio.known, r.audio.target1, r.audio.target2, event]);
      if (ins.rowCount !== 1) throw new Error(`${r.id}: insert ${ins.rowCount}`);
    }
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const db = await load(pg);
  const p = planPor(db);
  const log = { sweep: SWEEP, job: JOB, apply: APPLY, census: p.census, rows: p.rows, listed: p.listed, audioHeld: p.audioHeld, started: new Date().toISOString() };
  console.log(`══ ${COURSE} P26 — ${APPLY ? 'APPLY' : 'DRY RUN'} ══\nCENSUS ${JSON.stringify(p.census)}\nPLAN ${p.rows.length} rows; listed ${p.listed.length}; audio-held ${p.audioHeld.length}`);
  for (const r of p.rows) console.log(`  seed ${String(r.seed).padStart(3)} → ${r.id} [${r.lego_id} "${r.lego_known} | ${r.lego_target}"] ${r.why.replace(/ \(.*$/, '')}  "${r.known}" | "${r.target}"`);
  console.log('LISTED:'); for (const l of p.listed) console.log(`  seed ${l.seed} "${l.known}" | "${l.target}": ${l.why}`);
  console.log('AUDIO-HELD:'); for (const l of p.audioHeld) console.log(`  seed ${l.seed} "${l.known}" | "${l.target}": ${l.why}`);
  if (APPLY && p.rows.length) { await apply(pg, supabase, p.rows, log); console.log(`APPLIED ${p.rows.length} rows, event ${log.event}`); }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end();
}
module.exports = { reusableSeedAudio, planPor, CAST, HOLD };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
