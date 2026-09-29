#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-raccontato-527-2026-09-29.cjs
//
// ita_for_eng — Kai's 2026-09-29 ruling (job #834·I): seed 527 teaches "who told me | chi mi ha raccontato" (S0527L02), so from
// seed 527 onwards a phrase whose "told me" is that STORY / TELLING sense says mi ha RACCONTATO, not mi ha detto. Nothing before
// 527 moves. "said", commands (told me to …), reported speech (told me she'd …) and the earlier me l'ha detto family (S0367,
// S0599 / S0600 "if you'd told me") stay detto — they are a different sense, listed in LEFT_ALONE with the reason.
//
//   node tools/course-optimization/ita-raccontato-527-2026-09-29.cjs           # dry run: checks + the ZUT clash query
//   APPLY=1 node …                                                              # edit, unapprove, read back
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const JOB = '#834·I';
const SWEEP = 'ita-raccontato-527-2026-09-29';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = 'Kai, 2026-09-29: seed 527 teaches told me → raccontato; use raccontato consistently from 527 on where "told me" is the story/telling sense';
const full = (id) => `${COURSE}:${id}`;

// The mi ha detto → mi ha raccontato swap. participle stays invariant with mi (no agreement change); the clitic stays mi.
const swapDetto = (t) => t.replace(/\bha detto\b/, 'ha raccontato');

const EDITS = [
  { id: 'S0527L01U01', known: 'guess who told me!', before: 'indovina chi mi ha detto!', after: 'indovina chi mi ha raccontato!', why: 'the seed’s own L02 sense (who told me) — the intro’s example sentence' },
  { id: 'S0527L03U05', known: 'she told me something very funny', before: 'mi ha detto qualcosa di molto divertente', after: 'mi ha raccontato qualcosa di molto divertente', why: 'a funny thing told = a story told (L03/L04 are the funny story)' },
  { id: 'S0597L02U02', known: 'he told me many stories', before: 'mi ha detto molte storie', after: 'mi ha raccontato molte storie', why: 'stories are raccontate; S0597L02U01 and U04 already say raccontato' },
];

// Every other "told me" / "told her" row from seed 527 on that stays detto, with the reason.
const LEFT_ALONE = [
  ['S0572L02U03, S0572L03U04, S0572L04U04', 'she told me what happened (the last time…)', 'BORDERLINE — telling an account of events; mi ha detto che cosa è successo is ordinary Italian and the object is a clause, not a story. Kai’s call to widen.'],
  ['S0572L04U03', 'I told you what happened the last time they visited us', 'same borderline, first person; ti ho detto'],
  ['S0602L01U02', 'she told me how it started', 'BORDERLINE — an account of how something began; not a story object'],
  ['S0598L02U02', 'he told me what they were doing', 'informing, not narrating'],
  ['S0597L04U05, S0598L01U04', 'she told me / him a hundred (a thousand) things', 'BORDERLINE — "things", no story; ha detto cento cose'],
  ['S0572L02U01, S0572L02U05, S0581L02U03, S0598L02U01, S0614L01U05, S0621 (dirle), S0652L01U03', 'can you tell me / to tell her / tell me sir', 'infinitive or imperative "tell" — dire, not the past told me of the LEGO'],
  ['S0589L02B03/U01/U02/seed, S0590L01U02, S0615L02U05, S0617L02B02/B03/U03, S0605L01U05', 'she told me she’d just seen / the station is here / you were very brave / it was a mistake / we told them we needed help', 'reported speech (told me that…) = said'],
  ['S0596L03U03, S0609L01U05, S0621L02U03', 'she told me to close my eyes / he told me to ask / to tell her', 'a command — dire di'],
  ['S0599L02 (LEGO, B, C, U, seed), S0600L03 (LEGO, B, C, U, seed), S0606L03U02, S0606L01U02', 'if you’d told me / if you had told me / I’d have told you', 'the me l’hai detto family (S0367 area / L02 conditional perfect): an earlier, separate LEGO taught with detto'],
  ['S0600L02B02, S0600L03U01', 'you told me how tired you were', 'information about a state, not a story; mi hai detto'],
  ['S0572L01U04', 'what I told you', 'quello che ti ho detto — the earlier me l’ha detto sense'],
  ['S0528L01U03, S0535L01U05, S0535L02U03, S0545L01U03, S0621L03U01/B03, S0621L02B01-U05', 'tell the truth / said he wouldn’t choose to tell the truth / tell her', 'dire la verità and "tell her" are say-type; not told me a story'],
];

async function main() {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const seeds = [...new Set(EDITS.map((e) => Number(e.id.slice(1, 5))))];
  try {
    const cur = (await pg.query('SELECT id, known_text, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)', [COURSE, EDITS.map((e) => full(e.id))])).rows;
    for (const e of EDITS) {
      const r = cur.find((c) => c.id === full(e.id));
      if (!r || r.known_text !== e.known || r.target_text !== e.before) throw new Error(`${e.id} is not as expected: ${JSON.stringify(r)}`);
      if (swapDetto(e.before) !== e.after) throw new Error(`${e.id}: after is not the raccontato swap`);
      if (Number(e.id.slice(1, 5)) < 527) throw new Error(`${e.id} is before seed 527`);
    }
    // raccontato is taught at 527 L02 (the LEGO) — check it, and that no edited seed is earlier
    const { rows: [lego] } = await pg.query(`SELECT known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id='S0527L02'`, [COURSE]);
    console.log('taught form:', lego);
    // ZUT: one English → two Italians against every live row not in this batch
    const ours = new Set(EDITS.map((e) => full(e.id)));
    const clashes = [];
    for (const e of EDITS) {
      const { rows } = await pg.query(`SELECT id, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND regexp_replace(lower(trim(known_text)),'[!?.,]','','g')=regexp_replace(lower($2),'[!?.,]','','g') AND regexp_replace(lower(trim(target_text)),'[!?.,]','','g')<>regexp_replace(lower($3),'[!?.,]','','g')
        UNION ALL SELECT lego_id, target_text FROM course_legos WHERE course_code=$1 AND regexp_replace(lower(trim(known_text)),'[!?.,]','','g')=regexp_replace(lower($2),'[!?.,]','','g') AND regexp_replace(lower(trim(target_text)),'[!?.,]','','g')<>regexp_replace(lower($3),'[!?.,]','','g')`, [COURSE, e.known, e.after]);
      for (const r of rows.filter((r) => !ours.has(r.id))) clashes.push(`${e.id} "${e.known}" → "${e.after}" vs ${r.id} → "${r.target_text}"`);
    }
    console.log(clashes.length ? 'ZUT CLASHES:\n  ' + clashes.join('\n  ') : 'no new ZUT clash on the three rows');
    const { rows: gx } = await pg.query(`SELECT original_text FROM course_gender_expansions WHERE course_code=$1 AND original_text = ANY($2)`, [COURSE, EDITS.flatMap((e) => [e.before, e.after])]);
    console.log('gender-expansion rows on old/new text:', gx.length);
    console.log('audio on the rows today:', cur.map((c) => `${c.id.slice(13)} t1=${c.target1_audio_id ? 'yes' : 'no'} t2=${c.target2_audio_id ? 'yes' : 'no'}`).join('; '));
    if (clashes.length) throw new Error('would raise the ZUT count');
    if (process.env.APPLY !== '1') return console.log('DRY RUN — nothing written. APPLY=1 to edit.');
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
    const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
    const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
    const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
    const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail });
    const approvedBefore = Object.fromEntries((await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, seeds])).rows.map((r) => [r.seed_number, r.approved_at]));
    const evP = await ev('phrase-edit', { seed_numbers: seeds, phrase_ids: EDITS.map((e) => full(e.id)), rows: EDITS.length }, { ruling: RULING, job: JOB, changes: EDITS.map((e) => ({ id: full(e.id), from: { known: e.known, target: e.before }, to: { known: e.known, target: e.after }, why: e.why })) });
    const evU = await ev('unapprove', { seed_numbers: seeds, rows: seeds.length }, { why: 'seeds whose phrases this job edited — Kai should read them', job: JOB, approved_at_before: approvedBefore });
    await pg.query('BEGIN');
    try {
      // text edit: the trigger null_phrase_audio_on_text_change drops the clip of a changed side (assets kept)
      for (const e of EDITS) {
        const r = await pg.query(`UPDATE course_practice_phrases SET target_text=$1, word_count=$2, lego_count=$3, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$4, updated_at=now()
          WHERE course_code=$5 AND id=$6 AND target_text=$7`, [e.after, e.after.length, e.after.split(/\s+/).length, evP, COURSE, full(e.id), e.before]);
        if (r.rowCount !== 1) throw new Error(`${e.id}: ${r.rowCount} rows`);
      }
      const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [evU, COURSE, seeds]);
      console.log('unapproved seeds', seeds, 'rows', un.rowCount);
      await pg.query('COMMIT');
    } catch (err) { await pg.query('ROLLBACK'); throw err; }
    const { rows: after } = await pg.query('SELECT id, target_text, target1_audio_id, target2_audio_id, known_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) ORDER BY id', [COURSE, EDITS.map((e) => full(e.id))]);
    console.log('read-back:'); for (const r of after) console.log(' ', r.id.slice(13), r.target_text, `known=${r.known_audio_id ? 'kept' : 'EMPTY'} t1=${r.target1_audio_id ? 'kept' : 'EMPTY'} t2=${r.target2_audio_id ? 'kept' : 'EMPTY'}`);
    const { rows: ap } = await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, seeds]);
    console.log('seeds approved_at:', JSON.stringify(ap));
  } finally { await pg.end(); }
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { swapDetto, EDITS, LEFT_ALONE };
