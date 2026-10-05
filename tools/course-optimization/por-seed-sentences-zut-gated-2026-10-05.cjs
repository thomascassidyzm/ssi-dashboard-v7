#!/usr/bin/env node
'use strict';
// tools/course-optimization/por-seed-sentences-zut-gated-2026-10-05.cjs
//
// por_for_eng — second P26 pass (job #847). Kai, 2026-10-05: "it doesn't hurt if we just add the seeds as practice
// phrases as well in valid legos." The #357 pass LISTED every seed whose English already stood over a different
// Portuguese (mostly the pro-drop twin: seed "eu quero…" vs phrase "quero…"). Here the ZUT listing is not a veto:
// each such seed gets the USE row under the home chooseHome picks, and the row is KEPT only if the strict ZUT count
// (audit-phrase-zut.cjs auditRows, same as the nightly) does not rise with it; a row that raises it is dropped and listed.
// Seeds the #357 job HELD by judgement (HOLD) and seeds with no valid new LEGO stay listed. Seed clips reused; no TTS.
//
//   node tools/course-optimization/por-seed-sentences-zut-gated-2026-10-05.cjs        # dry run
//   APPLY=1 node …                                                                      # write

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const ITA = require('./ita-seed-sentences-in-played-baskets-2026-09-28.cjs');
const POR = require('./por-seed-sentences-in-played-baskets-2026-10-02.cjs');

const COURSE = 'por_for_eng';
const SWEEP = 'por-seed-sentences-zut-gated-2026-10-05';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#847';
const RULING = 'Kai, 2026-10-05 (job #847): "it doesn\'t hurt if we just add the seeds as practice phrases as well in valid legos" — P26 rows for seeds #357 listed as ZUT variants, kept only where ZUT strict does not rise';
const short = (id) => String(id).replace(/^.*:/, '');

function zutStrictCount(db, inserts) {
  const { auditRows } = require('./audit-phrase-zut.cjs');
  const legos = db.legos.map((l) => ({ id: l.lego_id, seed_number: l.seed_number, known_text: l.known_text, target_text: l.target_text }));
  const phrases = db.phrases.map((p) => ({ id: short(p.id), seed_number: p.seed_number, phrase_role: p.phrase_role, known_text: p.known_text, target_text: p.target_text }))
    .concat(inserts.map((r) => ({ id: r.id, seed_number: r.lego_seed, phrase_role: 'use', known_text: r.known, target_text: r.target })));
  return auditRows({ legos, phrases, seeds: db.seeds }).bidirectional.violationsStrict.length;
}

/** Pure: which uncovered seeds get a row. `db` as POR's load(). */
function planGated(db) {
  const legosById = Object.fromEntries(db.legos.map((l) => [l.lego_id, l]));
  const nonComp = db.phrases.filter((p) => p.phrase_role !== 'component');
  const seedsOut = [], listed = [], dropped = [];
  const perLego = new Map(); for (const p of db.phrases) { if (!perLego.has(p.lego_id)) perLego.set(p.lego_id, []); perLego.get(p.lego_id).push(p); }
  const base = zutStrictCount(db, []);
  let current = base; const rows = [];
  for (const s of db.seeds) {
    if (ITA.seedSentenceCoverage(s, nonComp).played.length) continue;
    if (POR.HOLD[s.seed_number]) { listed.push({ seed: s.seed_number, why: POR.HOLD[s.seed_number] }); continue; }
    const home = ITA.chooseHome(s, db.legos, db.wordTaught);
    if (!home.lego) { listed.push({ seed: s.seed_number, known: s.known_text, target: s.target_text, why: home.why }); continue; }
    const aud = POR.reusableSeedAudio(s, db.clipsById);
    if (aud.length) { listed.push({ seed: s.seed_number, why: `seed clips not reusable (${aud.join(', ')})` }); continue; }
    const slot = ITA.nextUseSlot(home.lego, [...(perLego.get(home.lego.lego_id) || []), ...rows.filter((r) => r.lego_id === home.lego.lego_id).map((r) => ({ id: r.id, position: r.position }))]);
    const row = { seed: s.seed_number, id: slot.id, position: slot.position, lego_id: home.lego.lego_id, lego_seed: home.lego.seed_number, lego_index: home.lego.lego_index,
      lego_known: home.lego.known_text, lego_target: home.lego.target_text, why: home.why, known: s.known_text, target: s.target_text,
      lego_position: ITA.legoPosition(s.known_text, home.lego.known_text), audio: { known: s.known_audio_id, target1: s.target1_audio_id, target2: s.target2_audio_id } };
    if (!ITA.phraseIsPlayed(row, legosById)) throw new Error(`${row.id} lands under a not-new LEGO`);
    const after = zutStrictCount(db, [...rows, row]);
    if (after > current) { dropped.push({ seed: s.seed_number, known: s.known_text, target: s.target_text, home: row.lego_id, why: `ZUT strict would rise ${current} → ${after}` }); continue; }
    current = after; rows.push(row);
  }
  return { rows, listed, dropped, zutBefore: base, zutAfter: current };
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
  const db = await POR.load(pg);
  const p = planGated(db);
  const log = { sweep: SWEEP, job: JOB, apply: APPLY, ...p, started: new Date().toISOString() };
  console.log(`══ ${COURSE} P26 gated — ${APPLY ? 'APPLY' : 'DRY RUN'} ══\nZUT strict ${p.zutBefore} → ${p.zutAfter}; rows ${p.rows.length}; dropped ${p.dropped.length}; listed ${p.listed.length}`);
  for (const r of p.rows) console.log(`  seed ${r.seed} → ${r.id} [${r.lego_id}] ${r.why.replace(/ \(.*$/, '')}`);
  console.log('DROPPED:'); for (const l of p.dropped) console.log(`  seed ${l.seed} → ${l.home}: ${l.why}`);
  console.log('LISTED:'); for (const l of p.listed) console.log(`  seed ${l.seed}: ${l.why}`);
  if (APPLY && p.rows.length) { await apply(pg, supabase, p.rows, log); console.log(`APPLIED ${p.rows.length} rows, event ${log.event}`); }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end();
}
module.exports = { planGated, zutStrictCount };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
