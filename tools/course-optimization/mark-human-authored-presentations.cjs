#!/usr/bin/env node
/**
 * mark-human-authored-presentations.cjs — put the MARK on the presentation
 * lines a human wrote, so no regeneration can template-overwrite them and none
 * can skip them silently (Kai's ruling 2026-09-21, job #506).
 *
 * Source of the words: services/course-builder/lib/separable-verbs.cjs
 * HUMAN_AUTHORED_TEXT (Kai's deu_for_eng lines for seeds 83 and 92, jobs
 * #486/#491/#501). The mark is keyed to (course_code, lego_id) in
 * human_authored_presentations and records the LEGO revision (known/target
 * text) the words were reconciled against — read LIVE here, never assumed.
 *
 * Idempotent: re-running with unchanged words only reconciles the revision.
 * No TTS, no row deletion, no course_audio write at all.
 *
 *   node tools/course-optimization/mark-human-authored-presentations.cjs           # dry run: shows what would be marked
 *   node tools/course-optimization/mark-human-authored-presentations.cjs --apply   # writes the marks, then re-reads them
 */
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const { HUMAN_AUTHORED_TEXT } = require('../../services/course-builder/lib/separable-verbs.cjs');
const ha = require('../../services/shared/human-authored-presentations.cjs');

const APPLY = process.argv.includes('--apply');
const BY = 'tools:mark-human-authored-presentations (job #506)';

/** The lines to mark: one per seed in the record, on that seed's FIRST LEGO — where jobs #497/#501 placed them live. */
function linesToMark() {
  const course = HUMAN_AUTHORED_TEXT.course;
  return Object.entries(HUMAN_AUTHORED_TEXT.bySeed).map(([seed, entry]) => ({
    courseCode: course,
    legoId: `S${String(seed).padStart(4, '0')}L01`,
    text: entry.text,
    author: HUMAN_AUTHORED_TEXT.author,
    authoredOn: HUMAN_AUTHORED_TEXT.ruled,
    source: `separable-verbs.cjs HUMAN_AUTHORED_TEXT (seed ${seed}: ${entry.where}); jobs #486/#491/#501; ruling ${HUMAN_AUTHORED_TEXT.ruled}`,
  }));
}

async function main() {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const lines = linesToMark();
  let marked = 0;
  for (const line of lines) {
    const { data: lego, error } = await sb.from('course_legos').select('lego_id, seed_number, known_text, target_text')
      .eq('course_code', line.courseCode).eq('lego_id', line.legoId).maybeSingle();
    if (error) throw error;
    if (!lego) { console.log(`SKIP ${line.courseCode}/${line.legoId}: no such LEGO live — nothing marked`); continue; }
    const { data: rows } = await sb.from('course_audio').select('id, s3_key, text')
      .eq('course_code', line.courseCode).eq('role', 'presentation').eq('lego_id', line.legoId);
    const carrying = (rows || []).filter(r => ha.sameWords(r.text, line.text));
    console.log(`\n${line.courseCode}/${line.legoId}  LEGO "${lego.known_text}" → "${lego.target_text}"`);
    console.log(`  words: "${line.text}"`);
    console.log(`  course_audio rows for this LEGO: ${(rows || []).length}, carrying these words: ${carrying.length} (${carrying.map(r => r.s3_key.startsWith('pending/') ? 'pending' : 'rendered').join(', ') || 'none'})`);
    if (!APPLY) { console.log('  dry run — not marked'); continue; }
    const mark = await ha.markHumanAuthored(sb, { ...line, lego, by: BY, why: 'initial mark of Kai\'s human-authored line' });
    marked++;
    console.log(`  MARKED: author=${mark.author} reconciled against "${mark.reconciled_known_text}" / "${mark.reconciled_target_text}" at ${mark.reconciled_at}; decisions=${mark.decisions.length}`);
  }
  if (APPLY) {
    const { data: all } = await sb.from(ha.TABLE).select('course_code, lego_id, author, text, reconciled_known_text, reconciled_target_text, open_flag_id')
      .eq('course_code', HUMAN_AUTHORED_TEXT.course);
    console.log(`\nRe-read live: ${(all || []).length} mark(s) on ${HUMAN_AUTHORED_TEXT.course} (${marked} written this run)`);
    for (const m of all || []) console.log(`  ${m.lego_id} [${m.author}] "${m.text.slice(0, 70)}…" reconciled vs "${m.reconciled_known_text}"/"${m.reconciled_target_text}"`);
  }
}

main().catch(err => { console.error(`FAILED: ${err.message}`); process.exit(1); });
