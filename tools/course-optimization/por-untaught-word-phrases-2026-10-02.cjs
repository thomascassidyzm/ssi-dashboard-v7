#!/usr/bin/env node
'use strict';
// tools/course-optimization/por-untaught-word-phrases-2026-10-02.cjs — job #357, por_for_eng.
//
// lego-vs-phrase rule + P27/K21 (Kai, Italian #626·I): a practice phrase may not use a word before the seed whose LEGO
// teaches it; the phrase is rewritten from taught material or deleted — never a LEGO. Kai 2026-10-02: apply where obvious.
//   S0112L03U01 "eu não estava à espera disso"  — disso first taught by a LEGO at seed 162
//   S0204L01U03 "estou a falar dos problemas"   — problemas first taught at 325 (problema at 134; the LEGO is "dos",
//   S0204L03U09 "vou tratar dos problemas"        so the singular cannot stand in) → deleted
// STAGED, not written (needs a render, Kai's spend call): S0116L01U10 forma → maneira (maneira taught at 94, P28).
//
//   node tools/course-optimization/por-untaught-word-phrases-2026-10-02.cjs      # check the rule live, print
//   APPLY=1 node …                                                                 # delete
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const COURSE = 'por_for_eng', JOB = '#357', SWEEP = 'por-untaught-word-phrases-2026-10-02', SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const DELETES = {
  S0112L03U01: { word: 'disso', known: "I wasn't expecting that", target: 'eu não estava à espera disso' },
  S0204L01U03: { word: 'problemas', known: "I'm talking about the problems", target: 'estou a falar dos problemas' },
  S0204L03U09: { word: 'problemas', known: "I'm going to deal with the problems", target: 'vou tratar dos problemas' },
};
const words = (s) => String(s || '').toLowerCase().replace(/[.,!?¿¡;:"]/g, ' ').split(/\s+/).filter(Boolean);
/** THE RULE: the first seed at which a LEGO's target carries the exact word (K21: surface form). */
const firstTaught = (legos, w) => Math.min(...legos.filter((l) => words(l.target_text).includes(w)).map((l) => l.seed_number));
const seedOf = (id) => Number(id.slice(1, 5));
const violates = (legos, id, d) => seedOf(id) < firstTaught(legos, d.word);

async function main() {
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { rows: legos } = await pg.query('SELECT seed_number, target_text FROM course_legos WHERE course_code=$1', [COURSE]);
  const todo = Object.entries(DELETES).filter(([id, d]) => violates(legos, id, d));
  for (const [id, d] of todo) console.log(`${id} "${d.known} | ${d.target}" — ${d.word} first taught at seed ${firstTaught(legos, d.word)}`);
  if (process.env.APPLY === '1' && todo.length) {
    const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
    const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
    const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
    const seeds = [...new Set(todo.map(([id]) => seedOf(id)))];
    const ev = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-delete', scope: { seed_numbers: seeds, phrase_ids: todo.map(([id]) => `${COURSE}:${id}`), rows: todo.length },
      detail: { job: JOB, ruling: 'Kai 2026-10-02 (job #357): lego-vs-phrase / P27 — a phrase never uses a word before its teaching seed; deleted where no natural rewrite from taught words exists', deleted: todo.map(([id, d]) => ({ id: `${COURSE}:${id}`, before: { known: d.known, target: d.target }, after: null, why: `${d.word} untaught until seed ${firstTaught(legos, d.word)}` })) } });
    const { rows: appr } = await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) AND approved_at IS NOT NULL', [COURSE, seeds]);
    const un = appr.length ? await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: appr.map((a) => a.seed_number), rows: appr.length }, detail: { job: JOB, why: 'phrase deleted', approved_at_before: appr } }) : null;
    await pg.query('BEGIN');
    try {
      for (const [id, d] of todo) { const r = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, `${COURSE}:${id}`, d.known, d.target]); if (r.rowCount !== 1) throw new Error(`${id}: ${r.rowCount}`); }
      if (appr.length) await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$3 WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, appr.map((a) => a.seed_number), un]);
      await pg.query('COMMIT');
    } catch (e) { await pg.query('ROLLBACK'); throw e; }
    await require('../../services/shared/round-index-refresh.cjs').refreshNow();
    console.log(`DELETED ${todo.length}, event ${ev}; unapproved ${appr.map((a) => a.seed_number).join(',') || 'none'}`);
  }
  await pg.end();
}
module.exports = { firstTaught, violates, DELETES };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
