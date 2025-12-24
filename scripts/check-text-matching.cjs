require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  console.log('=== Checking text matching between course_seeds and texts ===\n');

  // Get sample Welsh seeds with known texts
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', 'cym_n_for_eng')
    .order('seed_number')
    .limit(10);

  console.log('Sample seeds:');
  for (const seed of seeds || []) {
    console.log(`  S${seed.seed_number.toString().padStart(4, '0')}: "${seed.known_text}" → "${seed.target_text}"`);
  }

  console.log('\n=== Checking if known texts exist in texts table ===\n');

  for (const seed of seeds || []) {
    // Check exact match
    const { data: exact } = await supabase
      .from('texts')
      .select('id, content, language')
      .eq('content', seed.known_text)
      .eq('language', 'eng')
      .single();

    if (exact) {
      console.log(`✅ "${seed.known_text}" - found in texts (id: ${exact.id.substring(0, 8)}...)`);

      // Now check if this text has audio
      const { data: audio } = await supabase
        .from('audio_files')
        .select('id, voice_id')
        .eq('text_id', exact.id)
        .single();

      if (audio) {
        // Check if linked to course
        const { data: courseLink } = await supabase
          .from('course_audio')
          .select('role')
          .eq('audio_id', audio.id)
          .eq('course_code', 'cym_n_for_eng')
          .single();

        if (courseLink) {
          console.log(`   ✅ Has audio (${audio.id.substring(0, 8)}...) linked with role: ${courseLink.role}`);
        } else {
          console.log(`   ⚠️ Has audio but NOT linked to course_audio for cym_n_for_eng`);
        }
      } else {
        console.log(`   ❌ NO audio_files entry for this text`);
      }
    } else {
      // Try case-insensitive search
      const { data: ilike } = await supabase
        .from('texts')
        .select('id, content, language')
        .ilike('content', seed.known_text)
        .eq('language', 'eng');

      if (ilike && ilike.length > 0) {
        console.log(`⚠️ "${seed.known_text}" - NOT exact match but found similar:`);
        for (const t of ilike) {
          console.log(`   Found: "${t.content}"`);
        }
      } else {
        console.log(`❌ "${seed.known_text}" - NOT FOUND in texts table at all`);
      }
    }
  }

  // Also check a few practice phrases
  console.log('\n=== Checking practice phrases ===\n');
  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('known_text')
    .eq('course_code', 'cym_n_for_eng')
    .limit(5);

  for (const phrase of phrases || []) {
    const { data: textMatch } = await supabase
      .from('texts')
      .select('id')
      .eq('content', phrase.known_text)
      .eq('language', 'eng')
      .single();

    if (textMatch) {
      console.log(`✅ "${phrase.known_text.substring(0, 40)}..." - found`);
    } else {
      console.log(`❌ "${phrase.known_text.substring(0, 40)}..." - NOT found`);
    }
  }
}

check().catch(console.error);
