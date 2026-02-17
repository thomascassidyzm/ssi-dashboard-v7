/**
 * Fix presentation audio binding for ALL courses.
 *
 * The course_audio table has correct presentation records with lego_id.
 * The course_legos table may have wrong presentation_audio_id values.
 * This script rebinds by matching on lego_id.
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const DRY_RUN = process.argv.includes('--dry-run');

(async () => {
  console.log(`Fixing presentation audio binding for ALL courses${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  // Find all courses with presentation audio
  const { data: audioData } = await sb
    .from('course_audio')
    .select('course_code, id, lego_id')
    .eq('role', 'presentation');

  // Group by course
  const byCourse = {};
  for (const a of (audioData || [])) {
    if (!a.lego_id) continue;
    if (!byCourse[a.course_code]) byCourse[a.course_code] = new Map();
    byCourse[a.course_code].set(a.lego_id, a.id);
  }

  const courses = Object.keys(byCourse).sort();
  console.log(`Found ${courses.length} courses with presentation audio\n`);

  let grandFixed = 0;
  let grandCorrect = 0;
  let grandNoAudio = 0;

  for (const course of courses) {
    const legoToAudioId = byCourse[course];

    const { data: legos } = await sb
      .from('course_legos')
      .select('id, seed_number, lego_index, presentation_audio_id')
      .eq('course_code', course)
      .eq('is_new', true)
      .order('seed_number')
      .order('lego_index');

    let fixed = 0;
    let correct = 0;
    let noAudio = 0;

    for (const l of (legos || [])) {
      const legoId = `S${String(l.seed_number).padStart(4,'0')}L${String(l.lego_index).padStart(2,'0')}`;
      const correctAudioId = legoToAudioId.get(legoId);

      if (!correctAudioId) {
        noAudio++;
        continue;
      }

      if (l.presentation_audio_id === correctAudioId) {
        correct++;
        continue;
      }

      if (!DRY_RUN) {
        await sb
          .from('course_legos')
          .update({ presentation_audio_id: correctAudioId })
          .eq('id', l.id);
      }
      fixed++;
    }

    const status = fixed > 0 ? `FIXED ${fixed}` : 'OK';
    console.log(`${course}: ${status} (correct: ${correct}, no audio: ${noAudio})`);

    grandFixed += fixed;
    grandCorrect += correct;
    grandNoAudio += noAudio;
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`TOTAL: ${grandFixed} fixed${DRY_RUN ? ' (would fix)' : ''}, ${grandCorrect} already correct, ${grandNoAudio} no audio`);
})();
