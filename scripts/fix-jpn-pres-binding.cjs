/**
 * Fix jpn_for_eng presentation audio binding.
 *
 * The course_audio table has correct presentation records with lego_id.
 * The course_legos table has wrong presentation_audio_id values (orphan UUIDs).
 * This script rebinds by matching on lego_id.
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const COURSE = process.argv[2] || 'jpn_for_eng';
const DRY_RUN = process.argv.includes('--dry-run');

(async () => {
  console.log(`Fixing presentation audio binding for ${COURSE}${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  // Get all presentation audio from course_audio
  const { data: presAudio, error: audioErr } = await sb
    .from('course_audio')
    .select('id, lego_id')
    .eq('course_code', COURSE)
    .eq('role', 'presentation');

  if (audioErr) { console.error('Error:', audioErr); return; }
  console.log(`Presentation audio records: ${presAudio.length}`);

  // Build lego_id → audio DB id map
  // If multiple exist for same lego_id, take the latest (last in array)
  const legoToAudioId = new Map();
  for (const a of presAudio) {
    if (a.lego_id) {
      legoToAudioId.set(a.lego_id, a.id);
    }
  }
  console.log(`Unique lego_ids with presentation audio: ${legoToAudioId.size}`);

  // Get all new LEGOs
  const { data: legos } = await sb
    .from('course_legos')
    .select('id, seed_number, lego_index, known_text, target_text, presentation_audio_id, is_new')
    .eq('course_code', COURSE)
    .eq('is_new', true)
    .order('seed_number')
    .order('lego_index');

  console.log(`New LEGOs: ${legos.length}\n`);

  let fixed = 0;
  let alreadyCorrect = 0;
  let noAudio = 0;

  for (const l of legos) {
    const legoId = `S${String(l.seed_number).padStart(4,'0')}L${String(l.lego_index).padStart(2,'0')}`;
    const correctAudioId = legoToAudioId.get(legoId);

    if (!correctAudioId) {
      noAudio++;
      continue;
    }

    if (l.presentation_audio_id === correctAudioId) {
      alreadyCorrect++;
      continue;
    }

    console.log(`${legoId}: ${l.known_text} → ${l.target_text}`);
    console.log(`  old: ${l.presentation_audio_id}`);
    console.log(`  new: ${correctAudioId}`);

    if (!DRY_RUN) {
      const { error } = await sb
        .from('course_legos')
        .update({ presentation_audio_id: correctAudioId })
        .eq('id', l.id);

      if (error) {
        console.log(`  ERROR: ${error.message}`);
      }
    }
    fixed++;
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Already correct: ${alreadyCorrect}`);
  console.log(`Fixed: ${fixed}${DRY_RUN ? ' (would fix)' : ''}`);
  console.log(`No presentation audio: ${noAudio}`);
})();
