#!/usr/bin/env node
/**
 * Import LEGO Introductions
 *
 * Links LEGOs to their presentation/introduction audio.
 * Reads from course JSON manifest and populates lego_introductions table.
 *
 * Usage:
 *   node database/import-lego-introductions.cjs <json-path> [--dry-run]
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Course code aliases
const COURSE_ALIASES = {
  'en-cy-north': 'cym_n_for_eng',
  'en-cy-south': 'cym_s_for_eng',
  'en-es': 'spa_for_eng',
  'En-Ch': 'zho_for_eng'
};

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const JSON_PATH = args.find(a => !a.startsWith('--'));

if (!JSON_PATH) {
  console.error('Usage: node import-lego-introductions.cjs <json-path> [--dry-run]');
  process.exit(1);
}

async function main() {
  console.log('Loading JSON...');
  const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

  const JSON_COURSE_ID = jsonData.id;
  const COURSE_CODE = COURSE_ALIASES[JSON_COURSE_ID] || JSON_COURSE_ID;
  const slice = jsonData.slices[0];
  const samples = slice.samples;
  const seeds = slice.seeds || [];

  console.log('='.repeat(60));
  console.log('LEGO Introductions Import');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE IMPORT'}`);
  console.log(`Course: ${COURSE_CODE}`);
  console.log(`Seeds: ${seeds.length}`);
  console.log('');

  // Build intro data: lego_id -> { audio_uuid, duration_ms }
  const introductions = [];

  for (let seedIdx = 0; seedIdx < seeds.length; seedIdx++) {
    const seed = seeds[seedIdx];
    const seedNumber = seedIdx + 1;
    const legos = seed.introductionItems || seed.introduction_items || [];

    for (let legoIdx = 0; legoIdx < legos.length; legoIdx++) {
      const lego = legos[legoIdx];
      const legoId = `S${String(seedNumber).padStart(4, '0')}L${String(legoIdx + 1).padStart(2, '0')}`;

      // Get presentation text
      const presText = lego.presentation;
      if (!presText) continue;

      // Find audio in samples
      const sampleList = samples[presText];
      if (!sampleList) continue;

      const presAudio = sampleList.find(s => s.role === 'presentation');
      if (!presAudio) continue;

      introductions.push({
        course_code: COURSE_CODE,
        lego_id: legoId,
        audio_uuid: presAudio.id.toUpperCase(),  // Match S3 uppercase
        duration_ms: Math.round(presAudio.duration * 1000)
      });
    }
  }

  console.log(`Found ${introductions.length} LEGO introductions`);

  if (DRY_RUN) {
    console.log('\nDRY RUN - No changes made.');
    console.log('\nSample:');
    introductions.slice(0, 3).forEach(i =>
      console.log(`  ${i.lego_id}: ${i.audio_uuid} (${i.duration_ms}ms)`)
    );
    return;
  }

  // Connect to Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('\nConnected to Supabase.');

  // Delete existing intros for this course
  console.log('Clearing existing introductions...');
  await supabase.from('lego_introductions').delete().eq('course_code', COURSE_CODE);

  // Insert in batches
  console.log('Inserting introductions...');
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < introductions.length; i += BATCH_SIZE) {
    const batch = introductions.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('lego_introductions').insert(batch);

    if (error) {
      console.error('Error:', error.message);
    } else {
      inserted += batch.length;
    }
    process.stdout.write(`\r  Inserted: ${inserted}/${introductions.length}`);
  }

  console.log('\n\nDone!');
  console.log(`  Introductions: ${inserted}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
