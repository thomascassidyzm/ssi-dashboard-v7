#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-s0072l01-penso-che-phrases-2026-09-29.cjs
//
// ita_for_eng — S0072L01 "I think that | penso che" is a NEW LEGO whose basket was empty (its drill rows sit under
// the not-new S0261L01 and never play, P25). Kai (job #888·I): write ~4 natural, standalone-sayable phrases that use
// only what seed 72 has taught and NO subjunctive after "penso che". The tense that fits is the FUTURE or the
// CONDITIONAL, both indicative and both normal after "penso che" (the course already does it: S0317/S0323/S0328).
// Every content word below is a lexeme taught before seed 72 (mi aiuterai S0057.., non potrò, mi piacerebbe,
// imparare, di più, chiederti, qualcosa, più tardi, tornare, domani, questa sera). No audio rendered: the rows are
// created without clips and the course is queued for an audio pass.
//
//   node tools/course-optimization/ita-s0072l01-penso-che-phrases-2026-09-29.cjs          # dry run
//   APPLY=1 node tools/course-optimization/ita-s0072l01-penso-che-phrases-2026-09-29.cjs  # write
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-s0072l01-penso-che-phrases-2026-09-29';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = 'Kai, 2026-09-29 (job #888·I): give S0072L01 penso che a basket of natural phrases, taught vocabulary only, no subjunctive';
const LEGO = { id: 'S0072L01', seed: 72, lego_index: 1, known: 'I think that', target: 'penso che' };
const PHRASES = [
  { id: 'S0072L01U01', position: 1, known: "I think that you'll help me this evening", target: 'penso che mi aiuterai questa sera' },
  { id: 'S0072L01U02', position: 2, known: "I think that I won't be able to come back tomorrow", target: 'penso che non potrò tornare domani' },
  { id: 'S0072L01U03', position: 3, known: "I think that I'd like to learn more", target: 'penso che mi piacerebbe imparare di più' },
  { id: 'S0072L01U04', position: 4, known: "I think that I'd like to ask you something later on", target: 'penso che mi piacerebbe chiederti qualcosa più tardi' },
];
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
const startsWithLego = (p) => norm(p.known).startsWith(norm(LEGO.known) + ' ') && norm(p.target).startsWith(norm(LEGO.target) + ' ');

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const problems = [];
  const { rows: [l] } = await pg.query('SELECT is_new, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, LEGO.id]);
  if (!l || l.known_text !== LEGO.known || l.target_text !== LEGO.target) problems.push('LEGO S0072L01 is not "I think that | penso che"'); else if (!l.is_new) problems.push('S0072L01 is not new — its basket would never play (P25)');
  for (const p of PHRASES) {
    if (!startsWithLego(p)) problems.push(`${p.id} does not start with the LEGO`);
    const { rows } = await pg.query(`SELECT id, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND lower(trim(known_text))=lower($2)
      UNION ALL SELECT lego_id, target_text FROM course_legos WHERE course_code=$1 AND lower(trim(known_text))=lower($2)`, [COURSE, p.known]);
    rows.filter((x) => norm(x.target_text) !== norm(p.target)).forEach((x) => problems.push(`ZUT: ${p.id} vs ${x.id} → ${x.target_text}`));
    const { rows: [e] } = await pg.query('SELECT id FROM course_practice_phrases WHERE course_code=$1 AND id=$2', [COURSE, `${COURSE}:${p.id}`]);
    if (e) problems.push(`${p.id} already exists`);
  }
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} ${PHRASES.length} phrases under ${LEGO.id}`, problems.length ? '\nPROBLEMS:\n  ' + problems.join('\n  ') : '— guards hold');
  if (!APPLY || problems.length) { await pg.end(); process.exit(problems.length ? 2 : 0); }
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const rec = (operation, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation, scope, detail: { ruling: RULING, job: '#888·I', ...detail } });
  const ev = await rec('phrase-add', { seed_numbers: [LEGO.seed], phrase_ids: PHRASES.map((p) => `${COURSE}:${p.id}`), rows: PHRASES.length }, { rows: PHRASES });
  const { rows: [s] } = await pg.query('SELECT approved_at FROM course_seeds WHERE course_code=$1 AND seed_number=$2', [COURSE, LEGO.seed]);
  const un = s?.approved_at ? await rec('unapprove', { seed_numbers: [LEGO.seed], rows: 1 }, { why: 'phrases added', approved_at_before: s.approved_at }) : null;
  await pg.query('BEGIN');
  try {
    for (const p of PHRASES) {
      const r = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, last_edit_event_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft','use','{}','start',$11,true,$12)`,
        [`${COURSE}:${p.id}`, COURSE, LEGO.seed, LEGO.lego_index, p.position, p.known, p.target, p.target.length, p.target.split(/\s+/).length, JSON.stringify({ format: 'build_use', source: SWEEP, job: '#888·I' }), LEGO.id, ev]);
      if (r.rowCount !== 1) throw new Error(`${p.id}: insert ${r.rowCount}`);
    }
    if (un) await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=$3', [un, COURSE, LEGO.seed]);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  console.log('APPLIED event', ev);
  await pg.end();
}
module.exports = { LEGO, PHRASES, startsWithLego };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
