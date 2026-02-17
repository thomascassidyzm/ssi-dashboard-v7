/**
 * Fix course_audio text_normalized to properly strip punctuation
 *
 * Normalization should remove punctuation - this was missing before.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// All punctuation to strip from normalized text
const PUNCT_REGEX = /[。？！、，.!?,;:()（）「」『』\[\]]+/g;

function normalize(text) {
  if (!text) return '';
  return text.toLowerCase().replace(PUNCT_REGEX, '').trim();
}

async function fixAudioRecords() {
  const courseCode = 'jpn_for_eng';

  console.log('Fetching audio records for', courseCode, '...');

  // Get all audio records for this course
  const { data: audio, error } = await supabase
    .from('course_audio')
    .select('id, text, text_normalized')
    .eq('course_code', courseCode);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total audio records:', audio.length);

  // Find records where text_normalized doesn't match proper normalization
  const needsUpdate = [];
  for (const record of audio) {
    const properNorm = normalize(record.text);
    if (record.text_normalized !== properNorm) {
      needsUpdate.push({
        id: record.id,
        oldNorm: record.text_normalized,
        newNorm: properNorm
      });
    }
  }

  console.log('Records needing normalization fix:', needsUpdate.length);

  if (needsUpdate.length === 0) {
    console.log('Nothing to update!');
    return;
  }

  console.log('\nSample changes:');
  needsUpdate.slice(0, 5).forEach(r => {
    console.log(`  "${r.oldNorm}" -> "${r.newNorm}"`);
  });

  // Update them
  console.log('\nUpdating...');
  let updated = 0;
  let errors = 0;

  for (const record of needsUpdate) {
    const { error: updateError } = await supabase
      .from('course_audio')
      .update({ text_normalized: record.newNorm })
      .eq('id', record.id);

    if (updateError) {
      errors++;
      if (errors <= 5) console.error('Update error:', updateError);
    } else {
      updated++;
    }
  }

  console.log('\nComplete!');
  console.log('Updated:', updated);
  console.log('Errors:', errors);
}

fixAudioRecords().catch(console.error);
