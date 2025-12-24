/**
 * Migrate audio_samples data to V12 schema
 *
 * Simpler approach: batch insert with conflict handling
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const COURSE_LANGS = {
  'zho_for_eng': { target: 'cmn', source: 'eng' },
  'spa_for_eng': { target: 'spa', source: 'eng' },
  'cmn_for_eng': { target: 'cmn', source: 'eng' }
};

// Map: source -> known (course_audio constraint)
const ROLE_MAP = { 'source': 'known', 'target1': 'target1', 'target2': 'target2' };

const COURSE_CODE = process.argv[2] || 'zho_for_eng';
const langs = COURSE_LANGS[COURSE_CODE];
if (!langs) {
  console.error(`Unknown course: ${COURSE_CODE}`);
  process.exit(1);
}

async function migrate() {
  console.log(`\n=== Migrating ${COURSE_CODE} to V12 Schema ===\n`);

  // 1. Fetch all audio_samples
  console.log('1. Fetching samples...');
  const { data: targetSamples } = await supabase.from('audio_samples').select('*').eq('lang', langs.target);
  const { data: sourceSamples } = await supabase.from('audio_samples').select('*').eq('lang', langs.source);
  const samples = [...targetSamples, ...sourceSamples];
  console.log(`   ${samples.length} samples\n`);

  // 2. Build text lookup map (content+lang -> text.id)
  console.log('2. Building text lookup...');
  const { data: allTexts } = await supabase.from('texts').select('id, content, language');
  const textMap = new Map();
  for (const t of allTexts) {
    textMap.set(`${t.content}|${t.language}`, t.id);
  }
  console.log(`   ${textMap.size} texts in DB\n`);

  // 3. Insert audio_files
  console.log('3. Inserting audio_files...');
  let inserted = 0, skipped = 0, errors = 0;

  for (const sample of samples) {
    const textId = textMap.get(`${sample.text}|${sample.lang}`);
    if (!textId) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from('audio_files').upsert({
      id: sample.uuid.toLowerCase(),
      text_id: textId,
      voice_id: 'legacy',
      cadence: sample.cadence || 'natural',
      s3_bucket: sample.s3_bucket || 'popty-bach-lfs',
      s3_key: sample.s3_key || `mastered/${sample.uuid}.mp3`
      // Don't set source - let it default to null
    }, { onConflict: 'id', ignoreDuplicates: true });

    if (error) {
      if (error.message.includes('unique_rendering')) {
        skipped++; // Same text+voice+cadence already exists
      } else {
        errors++;
        if (errors < 5) console.log(`   Error: ${error.message}`);
      }
    } else {
      inserted++;
    }
  }
  console.log(`   Inserted: ${inserted}, Skipped: ${skipped}, Errors: ${errors}\n`);

  // 4. Insert course_audio
  console.log('4. Inserting course_audio...');
  let caInserted = 0, caSkipped = 0, caErrors = 0;

  for (const sample of samples) {
    const role = ROLE_MAP[sample.role] || sample.role;
    const audioId = sample.uuid.toLowerCase();

    const { error } = await supabase.from('course_audio').upsert({
      course_code: COURSE_CODE,
      audio_id: audioId,
      role: role
    }, { onConflict: 'course_code,audio_id,role,context', ignoreDuplicates: true });

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        caSkipped++;
      } else if (error.message.includes('foreign key')) {
        caSkipped++; // audio_file doesn't exist
      } else {
        caErrors++;
        if (caErrors < 5) console.log(`   Error: ${error.message}`);
      }
    } else {
      caInserted++;
    }
  }
  console.log(`   Inserted: ${caInserted}, Skipped: ${caSkipped}, Errors: ${caErrors}\n`);

  // Summary
  const { count: afCount } = await supabase.from('audio_files').select('*', { count: 'exact', head: true }).eq('voice_id', 'legacy');
  const { count: caCount } = await supabase.from('course_audio').select('*', { count: 'exact', head: true }).eq('course_code', COURSE_CODE);
  console.log('=== Final counts ===');
  console.log(`audio_files (legacy): ${afCount}`);
  console.log(`course_audio (${COURSE_CODE}): ${caCount}`);
}

migrate().catch(console.error);
