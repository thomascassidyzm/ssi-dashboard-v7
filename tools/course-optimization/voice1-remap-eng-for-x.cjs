#!/usr/bin/env node
/**
 * voice1-remap-eng-for-x.cjs — repair the voice-1/voice-2 duplication in
 * eng_for_X courses (Tom's report 2026-07-31: eng_for_kan plays his voice in
 * BOTH roles).
 *
 * Root cause: tools/course-optimization/clone-copy-pass.cjs applies ONE
 * voiceId (default CLONE_VOICE_ID = gfzdpspr5fdp, Tom's male clone) to every
 * slot role. Run with --apply against eng_for_kan and eng_for_tel on
 * 2026-07-05T00:29–00:32Z, it inserted male-voice course_audio rows into the
 * female target1 role and linkAudioIds pointed the live FKs at them.
 *
 * Fix (zero TTS, existing assets only):
 *   1. For every target1 row with voice_id 'gfzdpspr5fdp' in the course,
 *      find a female (bedd6226/xai_bedd6226) target1 row for the SAME
 *      normalized text anywhere in the eng_for_X family.
 *   2. Insert a course-owned target1 row (voice_id 'bedd6226') sharing the
 *      source's s3_key — the established copy convention (shared physical
 *      object, never a new render).
 *   3. Repoint course_seeds/course_legos/course_practice_phrases
 *      target1_audio_id from the male row to the female row. The UPDATE's
 *      WHERE clause (course_code + target1_audio_id = <male row id>) IS the
 *      per-row before-state assertion — a drifted row simply doesn't match.
 *
 * Never deletes anything. Male target1 rows are left unlinked (deletion is
 * approval-gated); they are listed in the log for a separate cleanup pass.
 *
 * Usage: node tools/course-optimization/voice1-remap-eng-for-x.cjs <course> [--apply]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const MALE_VOICE = 'gfzdpspr5fdp';
const FEMALE_VOICES = ['xai_bedd6226', 'bedd6226']; // preference order: real render first
const FAMILY = ['eng_for_ara', 'eng_for_ben', 'eng_for_guj', 'eng_for_hin', 'eng_for_jpn',
  'eng_for_kan', 'eng_for_mar', 'eng_for_pan', 'eng_for_sin', 'eng_for_tam',
  'eng_for_tel', 'eng_for_urd', 'eng_for_zho'];
const FK_SITES = [
  ['course_practice_phrases', 'target1_audio_id'],
  ['course_legos', 'target1_audio_id'],
  ['course_seeds', 'target1_audio_id'],
];

async function pageAll(build) {
  const out = [];
  let from = 0;
  for (;;) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) return out;
    from += 1000;
  }
}

async function run(courseCode, apply) {
  const log = { courseCode, apply, startedAt: new Date().toISOString(), inserts: [], repoints: [], residue: [], maleRowsLeftUnlinked: [] };

  // 1. the wrong rows
  const wrong = await pageAll(() => supabase.from('course_audio')
    .select('id,text,text_normalized,duration_ms')
    .eq('course_code', courseCode).eq('role', 'target1').eq('voice_id', MALE_VOICE));
  console.log(`[${courseCode}] male target1 rows: ${wrong.length}`);

  // 2. family female source index (first hit per text in preference order)
  const fem = new Map();
  for (const voice of FEMALE_VOICES) {
    for (const cc of FAMILY) {
      const rows = await pageAll(() => supabase.from('course_audio')
        .select('text_normalized,s3_key,duration_ms,course_code,voice_id')
        .eq('course_code', cc).eq('role', 'target1').eq('voice_id', voice));
      for (const r of rows) if (!fem.has(r.text_normalized)) fem.set(r.text_normalized, r);
    }
  }
  console.log(`[${courseCode}] family female pool: ${fem.size} texts`);

  const covered = wrong.filter(w => fem.has(w.text_normalized));
  const uncovered = wrong.filter(w => !fem.has(w.text_normalized));
  log.residue = uncovered.map(w => ({ id: w.id, text: w.text }));
  console.log(`[${courseCode}] covered: ${covered.length}, uncovered (NO female source anywhere — escalate, never generate): ${uncovered.length}`);

  // 3. insert owned female copy rows
  const insertRows = covered.map(w => {
    const src = fem.get(w.text_normalized);
    return {
      course_code: courseCode,
      text: w.text,
      text_normalized: w.text_normalized,
      language: 'eng',
      role: 'target1',
      voice_id: 'bedd6226',
      origin: 'tts',
      s3_key: src.s3_key,
      duration_ms: src.duration_ms,
      lego_id: null,
    };
  });
  if (apply) {
    for (let i = 0; i < insertRows.length; i += 200) {
      const slice = insertRows.slice(i, i + 200);
      const { error } = await supabase.from('course_audio')
        .upsert(slice, { onConflict: 'course_code,text_normalized,language,role,voice_id', ignoreDuplicates: true });
      if (error) throw new Error(`insert batch ${i}: ${error.message}`);
    }
  }
  log.inserts = insertRows.map(r => ({ text: r.text, s3_key: r.s3_key, source: fem.get(r.text_normalized).course_code }));
  console.log(`[${courseCode}] ${apply ? 'inserted' : 'would insert'} ${insertRows.length} female copy rows`);

  // 4. map male row id -> new female row id (query back after insert)
  const femaleOwned = new Map();
  if (apply) {
    const rows = await pageAll(() => supabase.from('course_audio')
      .select('id,text_normalized')
      .eq('course_code', courseCode).eq('role', 'target1').eq('voice_id', 'bedd6226'));
    for (const r of rows) femaleOwned.set(r.text_normalized, r.id);
  }

  // 5. repoint FKs, per male row, WHERE-clause asserts the before state
  let repointed = 0, misses = 0;
  for (const w of covered) {
    const newId = apply ? femaleOwned.get(w.text_normalized) : '(dry-run)';
    if (apply && !newId) { console.error(`[${courseCode}] MISSING owned female row for "${w.text}" — skipping`); misses++; continue; }
    for (const [table, col] of FK_SITES) {
      if (apply) {
        const { data, error } = await supabase.from(table)
          .update({ [col]: newId })
          .eq('course_code', courseCode).eq(col, w.id)
          .select('id');
        if (error) throw new Error(`${table} repoint ${w.id}: ${error.message}`);
        if (data.length) { repointed += data.length; log.repoints.push({ table, from: w.id, to: newId, rows: data.length, text: w.text }); }
      } else {
        const { count, error } = await supabase.from(table)
          .select('id', { count: 'exact', head: true })
          .eq('course_code', courseCode).eq(col, w.id);
        if (error) throw new Error(error.message);
        if (count) { repointed += count; log.repoints.push({ table, from: w.id, to: newId, rows: count, text: w.text }); }
      }
    }
    log.maleRowsLeftUnlinked.push(w.id);
  }
  log.repointedFks = repointed;
  log.finishedAt = new Date().toISOString();
  console.log(`[${courseCode}] ${apply ? 'repointed' : 'would repoint'} ${repointed} FK slots (${misses} misses)`);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join('docs/audio-sweeps', `voice1-remap-${courseCode}-${apply ? 'applied' : 'dryrun'}-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(log, null, 1));
  console.log(`[${courseCode}] log: ${file}`);
}

const [courseCode] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const apply = process.argv.includes('--apply');
if (!courseCode) { console.error('Usage: voice1-remap-eng-for-x.cjs <course_code> [--apply]'); process.exit(1); }
run(courseCode, apply).catch(e => { console.error(e); process.exit(1); });
