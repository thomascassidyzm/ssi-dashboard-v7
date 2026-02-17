/**
 * Fix course_audio text_normalized - AZURE ONLY
 *
 * Only update: known, target1, target2, presentation roles
 * Do NOT touch: encouragement, instruction, welcome (ElevenLabs)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Punctuation to strip from normalized text
const PUNCT_REGEX = /[。？！、，.!?,;:()（）「」『』\[\]]+/g;

function normalize(text) {
  if (!text) return '';
  return text.toLowerCase().replace(PUNCT_REGEX, '').trim();
}

// Only these roles (Azure TTS)
const AZURE_ROLES = ['known', 'target1', 'target2', 'presentation'];

async function fixAudioRecords() {
  const courseCode = 'jpn_for_eng';

  console.log('Fetching AZURE audio records for', courseCode, '...');
  console.log('Roles:', AZURE_ROLES.join(', '));

  // Get audio records for Azure roles only
  const { data: audio, error } = await supabase
    .from('course_audio')
    .select('id, text, text_normalized, role')
    .eq('course_code', courseCode)
    .in('role', AZURE_ROLES);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total Azure audio records:', audio.length);

  // Find records where text_normalized doesn't match proper normalization
  const needsUpdate = [];
  for (const record of audio) {
    const properNorm = normalize(record.text);
    if (record.text_normalized !== properNorm) {
      needsUpdate.push({
        id: record.id,
        role: record.role,
        oldNorm: record.text_normalized,
        newNorm: properNorm
      });
    }
  }

  console.log('Records needing normalization fix:', needsUpdate.length);

  // Count by role
  const byRole = {};
  for (const r of needsUpdate) {
    byRole[r.role] = (byRole[r.role] || 0) + 1;
  }
  console.log('By role:', byRole);

  if (needsUpdate.length === 0) {
    console.log('Nothing to update!');
    return;
  }

  console.log('\nSample changes:');
  needsUpdate.slice(0, 5).forEach(r => {
    console.log(`  [${r.role}] "${r.oldNorm}" -> "${r.newNorm}"`);
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
