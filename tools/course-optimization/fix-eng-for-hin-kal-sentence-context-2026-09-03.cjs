#!/usr/bin/env node
// Apply Kai's 2026-09-03 sentence-context ruling on ambiguous time words to
// eng_for_hin: "every time we use yesterday/tomorrow, there must be clear
// context IN THE SENTENCE. Any sentences that don't need to be fixed or
// deleted and replaced with others."
//
// कल is Hindi for both "yesterday" and "tomorrow". A course-wide read of all
// 312 phrases carrying कल (see docs/course-optimization/
// eng-for-hin-kal-sentence-context-2026-09-03.md) found 13 prompts where the
// sentence alone does not fix the time:
//   - 12 verbless BUILD rungs hanging off the bare adverbial LEGOs
//     (कल सुबह / कल दोपहर / कल रात / कल रात के मुक़ाबले / या कि कल), and
//   - 1 USE phrase at seed 305 whose bare imperfective irrealis reads past
//     while its English says "tomorrow".
// Each is rewritten here into a tensed frame built only from chunks already
// taught by that seed, so the gate's whole-chunk DP still tiles it.
//
// What this writes, per row:
//   known_text, target_text, decomposition, decomposition_course_version
//   and — only where the row carried a clip — target1_audio_id/target2_audio_id
//   set to NULL. That last part is deliberate: course_practice_phrases has NO
//   trigger that nulls the TARGET-side link on a target_text change, so leaving
//   it would keep a clip that speaks the OLD sentence pointed at the NEW text —
//   stale-and-wrong, which is worse for a learner than silent. No course_audio
//   row is deleted; only the link is dropped.
//
// This tool generates NO audio. eng_for_hin's voice_config is all-xAI, a
// retired provider, so the course cannot render at all until it is recast;
// the affected slots are reported and an audio pass is queued separately.
//
// Usage:
//   node tools/course-optimization/fix-eng-for-hin-kal-sentence-context-2026-09-03.cjs
//   node tools/course-optimization/fix-eng-for-hin-kal-sentence-context-2026-09-03.cjs --apply
// Dry run is the DEFAULT. Every applied row's pre-write state is kept verbatim
// in the log next to this file, so an apply is reversible by hand.

const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
require(path.join(ROOT, 'node_modules', 'dotenv')).config({ path: path.join(ROOT, '.env') });
const { createClient } = require(path.join(ROOT, 'node_modules', '@supabase', 'supabase-js'));
const { decomposeText } = require(path.join(ROOT, 'services', 'phrase-decomposer.cjs'));

const COURSE = 'eng_for_hin';
const APPLY = process.argv.includes('--apply');

// seed, current text (both sides, used as the match key), replacement text.
const EDITS = [
  { seed: 42,
    old_k: 'कल रात के मुक़ाबले बेहतर', old_t: 'better than last night',
    new_k: 'लेकिन मैं कल रात के मुक़ाबले ज़्यादा अच्छा महसूस करने लगा था', new_t: 'but I was starting to feel better than last night' },
  { seed: 44,
    old_k: 'या कि कल', old_t: 'or tomorrow',
    new_k: 'मैं कल मिलना चाहता हूँ या कि आज रात', new_t: 'I want to meet tomorrow or tonight' },
  { seed: 155,
    old_k: 'कल सुबह मिलना', old_t: 'to meet tomorrow morning',
    new_k: 'मैं कल सुबह मिलना चाहता हूँ', new_t: 'I want to meet tomorrow morning' },
  { seed: 155,
    old_k: 'कल सुबह जागना', old_t: 'to wake tomorrow morning',
    new_k: 'मुझे कल सुबह जागना है', new_t: 'I need to wake tomorrow morning' },
  { seed: 155,
    old_k: 'कल सुबह बात करना', old_t: 'to speak tomorrow morning',
    new_k: 'मैं कल सुबह बात करना चाहता हूँ', new_t: 'I want to speak tomorrow morning' },
  { seed: 156,
    old_k: 'कल सुबह किसी रेस्टोरेंट में जाना', old_t: 'to go to a restaurant tomorrow morning',
    new_k: 'क्या आप कल सुबह किसी रेस्टोरेंट में जाना चाहते हैं?', new_t: 'do you want to go to a restaurant tomorrow morning?' },
  { seed: 167,
    old_k: 'कल दोपहर मिलना', old_t: 'to meet tomorrow afternoon',
    new_k: 'मैं कल दोपहर मिलना चाहता हूँ', new_t: 'I want to meet tomorrow afternoon' },
  { seed: 167,
    old_k: 'कल दोपहर आराम करना', old_t: 'to relax tomorrow afternoon',
    new_k: 'मैं कल दोपहर आराम करना चाहता हूँ', new_t: 'I want to relax tomorrow afternoon' },
  { seed: 167,
    old_k: 'कल दोपहर बात करना', old_t: 'to speak tomorrow afternoon',
    new_k: 'मुझे कल दोपहर बात करना है', new_t: 'I need to speak tomorrow afternoon' },
  { seed: 181,
    old_k: 'कल सुबह डॉक्टर के पास जाना', old_t: 'to go to the doctor tomorrow morning',
    new_k: 'क्या आप कल सुबह डॉक्टर के पास जाना चाहते हैं?', new_t: 'do you want to go to the doctor tomorrow morning?' },
  { seed: 192,
    old_k: 'कल रात मिलना', old_t: 'to meet tomorrow night',
    new_k: 'मुझे कल रात मिलना है', new_t: 'I need to meet tomorrow night' },
  { seed: 192,
    old_k: 'कल रात आराम करना', old_t: 'to relax tomorrow night',
    new_k: 'मैं कल रात आराम करना चाहता हूँ', new_t: 'I want to relax tomorrow night' },
  { seed: 305,
    old_k: 'वह औरत कल आपकी मदद कर देती।', old_t: 'that woman would help you tomorrow',
    new_k: 'वह औरत आज रात आपकी मदद कर देती।', new_t: 'that woman would help you tonight' },
];

const legoId = (s, i) => `S${String(s).padStart(4, '0')}L${String(i).padStart(2, '0')}`;

(async () => {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { data: legos, error: le } = await sb.from('course_legos')
    .select('seed_number, lego_index, target_text, known_text').eq('course_code', COURSE);
  if (le) throw new Error(le.message);
  const vocab = legos.map(l => ({
    lego_id: legoId(l.seed_number, l.lego_index),
    target_text: l.target_text, known_text: l.known_text, seed_number: l.seed_number,
  }));

  const { data: course, error: ce } = await sb.from('courses')
    .select('version').eq('course_code', COURSE).single();
  if (ce) throw new Error(ce.message);

  const log = { course: COURSE, applied: APPLY, at: new Date().toISOString(), course_version: course.version, rows: [] };
  let clipsDropped = 0;

  for (const e of EDITS) {
    const { data: rows, error } = await sb.from('course_practice_phrases')
      .select('id, seed_number, lego_index, phrase_role, known_text, target_text, decomposition, decomposition_course_version, known_audio_id, target1_audio_id, target2_audio_id')
      .eq('course_code', COURSE).eq('seed_number', e.seed)
      .eq('known_text', e.old_k).eq('target_text', e.old_t);
    if (error) throw new Error(error.message);
    if (rows.length !== 1) { console.error(`SKIP S${e.seed} "${e.old_t}" — matched ${rows.length} rows, expected 1`); continue; }
    const row = rows[0];

    // Unanchored decomposeText, deliberately: all 10,917 existing decompositions
    // in this course are unanchored (0 carry isSalient), and the anchored
    // decomposer fragments seed 305's taught chunk "that woman would help you"
    // into two ghost blocks to force its salient. Match the course.
    const blocks = decomposeText(e.new_t, vocab.filter(v => v.seed_number <= row.seed_number));
    const kind = 'unanchored';
    const joined = blocks.map(b => b.target).join('');
    if (joined !== e.new_t) { console.error(`SKIP S${e.seed} — decomposition does not concat back to the text:\n  got "${joined}"\n  want "${e.new_t}"`); continue; }

    const patch = {
      known_text: e.new_k, target_text: e.new_t,
      decomposition: blocks, decomposition_course_version: course.version,
    };
    // Target-side links have no nulling trigger — drop them by hand or the old
    // clip keeps speaking the old sentence under the new text.
    if (row.target1_audio_id) { patch.target1_audio_id = null; clipsDropped++; }
    if (row.target2_audio_id) { patch.target2_audio_id = null; clipsDropped++; }

    const entry = { id: row.id, seed: row.seed_number, lego: legoId(row.seed_number, row.lego_index),
      role: row.phrase_role, kind, before: row, patch };
    log.rows.push(entry);
    console.log(`S${e.seed} ${entry.lego} ${row.phrase_role}: "${e.old_t}" -> "${e.new_t}" [decomp ${kind}, ${blocks.length} blocks]`);

    if (APPLY) {
      const { error: ue } = await sb.from('course_practice_phrases').update(patch).eq('id', row.id);
      if (ue) throw new Error(`update ${row.id}: ${ue.message}`);
      const { data: after } = await sb.from('course_practice_phrases')
        .select('known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, decomposition_course_version')
        .eq('id', row.id).single();
      entry.after = after;
      const ok = after.known_text === e.new_k && after.target_text === e.new_t
        && !after.target1_audio_id && !after.target2_audio_id;
      console.log(`   verified: ${ok ? 'OK' : 'MISMATCH'} known_audio=${after.known_audio_id || 'null'}`);
      if (!ok) throw new Error(`post-write verification failed for ${row.id}`);
    }
  }

  const out = path.join(__dirname, `fix-eng-for-hin-kal-sentence-context-2026-09-03-${APPLY ? 'applied' : 'dryrun'}-log.json`);
  fs.writeFileSync(out, JSON.stringify(log, null, 1));
  console.log(`\n${log.rows.length}/${EDITS.length} rows ${APPLY ? 'APPLIED' : 'planned'}; target-side clip links dropped: ${clipsDropped}`);
  console.log(`log: ${path.relative(ROOT, out)}`);
})().catch(e => { console.error(e); process.exit(1); });
