#!/usr/bin/env node
/**
 * Import Course to Database (v13 Schema)
 *
 * Imports legacy course manifests (slices/samples/seeds format) to v13 schema.
 *
 * v13 Schema:
 * - courses: code (PK), voice_config JSONB
 * - course_audio: flat table, course owns audio directly
 * - course_seeds: seed content
 * - course_legos: lego content
 *
 * Role mapping:
 * - source → known
 * - target → target1 (default target voice)
 * - presentation → presentation
 *
 * Usage:
 *   node database/import-course-v13.cjs /path/to/manifest.json --dry-run
 *   node database/import-course-v13.cjs /path/to/manifest.json
 */

require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { canonicalLanguage } = require('../services/shared/clip-identity.cjs');
// One scheme for "this clip is a recording and the manifest names no voice",
// shared with the CLI/API importer so both spell it identically.
const { legacyHumanVoiceId } = require('./lib/import-legacy-course-core.cjs');

// =============================================================================
// CONFIG
// =============================================================================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

// Role mapping: legacy → v13
const ROLE_MAP = {
  'source': 'known',
  'target': 'target1',
  'presentation': 'presentation'
};

// =============================================================================
// HELPERS
// =============================================================================

function normalizeText(text) {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

function mapCourseId(legacyId) {
  // en-cy-south → cym_s_for_eng
  // en-cy-north → cym_n_for_eng
  // en-es-es → spa_for_eng (European Spanish)
  // en-es-mx → spa_mx_for_eng (Mexican Spanish)
  const mapping = {
    'en-cy-south': 'cym_s_for_eng',
    'en-cy-north': 'cym_n_for_eng',
    'en-es': 'spa_for_eng',
    'en-es-v2': 'spa_for_eng',
    'en-es-es': 'spa_for_eng',
    'en-es-mx': 'spa_mx_for_eng',
    'en-pt-pt': 'por_for_eng',
    'en-pt-br': 'por_br_for_eng',
  };
  return mapping[legacyId] || legacyId;
}

function extractLanguages(courseId) {
  // cym_s_for_eng → { known: 'eng', target: 'cym' }
  // spa_mx_for_eng → { known: 'eng', target: 'spa' }
  // por_br_for_eng → { known: 'eng', target: 'por' }
  const match = courseId.match(/^([a-z]{3})(?:_[a-z]{1,5})?_for_([a-z]{3})$/i);
  if (match) {
    return { target: match[1], known: match[2] };
  }
  return { known: 'eng', target: 'und' };
}

// =============================================================================
// IMPORT LOGIC
// =============================================================================

async function importCourse(manifestPath, dryRun = false) {
  console.log('='.repeat(60));
  console.log('Import Course to Database (v13 Schema)');
  console.log('='.repeat(60));
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log();

  // Load manifest
  if (!await fs.pathExists(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }
  const manifest = await fs.readJson(manifestPath);

  // Extract course info
  const legacyId = manifest.id;
  const courseCode = mapCourseId(legacyId);
  const { known: knownLang, target: targetLang } = extractLanguages(courseCode);

  console.log(`Legacy ID: ${legacyId}`);
  console.log(`Course Code: ${courseCode}`);
  console.log(`Languages: ${knownLang} → ${targetLang}`);
  console.log();

  // Analyze manifest
  const slice = manifest.slices?.[0];
  if (!slice) {
    throw new Error('No slices found in manifest');
  }

  const samples = slice.samples || {};
  const seeds = slice.seeds || [];
  const sampleCount = Object.keys(samples).length;

  console.log('Manifest analysis:');
  console.log(`  Seeds: ${seeds.length}`);
  console.log(`  Sample texts: ${sampleCount}`);

  // Count total audio entries
  let totalAudio = 0;
  for (const audioList of Object.values(samples)) {
    totalAudio += audioList.length;
  }
  console.log(`  Total audio entries: ${totalAudio}`);

  // Count introduction audio
  if (manifest.introduction) {
    console.log(`  Course introduction: ${manifest.introduction.id}`);
    totalAudio += 1;
  }
  console.log();

  if (dryRun) {
    console.log('DRY RUN - would import:');
    console.log(`  - 1 course record`);
    console.log(`  - ${totalAudio} course_audio records`);
    console.log(`  - ${seeds.length} seed records`);
    console.log();
    console.log('Run without --dry-run to execute');
    return { courseCode, sampleCount: totalAudio, seedCount: seeds.length };
  }

  // ==========================================================================
  // STEP 1: Upsert course record
  // ==========================================================================
  console.log('Step 1: Upserting course record...');

  const displayName = legacyId === 'en-cy-south'
    ? 'Welsh (South) for English Speakers'
    : legacyId === 'en-cy-north'
    ? 'Welsh (North) for English Speakers'
    : `${targetLang.toUpperCase()} for ${knownLang.toUpperCase()} Speakers`;

  const { error: courseError } = await supabase
    .from('courses')
    .upsert({
      code: courseCode,
      display_name: displayName,
      known_lang: knownLang,
      target_lang: targetLang,
      status: 'released',
      course_type: 'official'
      // voice_config will be populated separately or inferred
    }, {
      onConflict: 'code'
    });

  if (courseError) throw courseError;
  console.log(`  ✓ Course record: ${courseCode}`);

  // ==========================================================================
  // STEP 2: Import audio samples to course_audio
  // ==========================================================================
  console.log('Step 2: Importing audio samples to course_audio...');

  let audioImported = 0;
  let audioErrors = 0;
  const batchSize = 100;
  const audioRecords = [];

  // Process samples dictionary
  for (const [text, audioList] of Object.entries(samples)) {
    for (const audio of audioList) {
      const role = ROLE_MAP[audio.role] || audio.role;
      const language = canonicalLanguage(audio.role === 'source' ? knownLang : targetLang);

      audioRecords.push({
        course_code: courseCode,
        text: text,
        text_normalized: normalizeText(text),
        language: language,
        role: role,
        // Unknown from legacy manifest: no voice is named, so the clip is filed
        // under the registry's human_<course>_<role> scheme (see
        // legacyHumanVoiceId) rather than a placeholder no reader can match.
        voice_id: legacyHumanVoiceId(courseCode, role),
        origin: 'tts', // Assume TTS, human recordings marked separately
        s3_key: `mastered/${audio.id}.mp3`,
        duration_ms: audio.duration ? Math.round(audio.duration * 1000) : null
      });
    }
  }

  // Add course introduction if present
  if (manifest.introduction) {
    const intro = manifest.introduction;
    audioRecords.push({
      course_code: courseCode,
      text: '[Course Introduction]',
      text_normalized: '[course introduction]',
      language: canonicalLanguage(knownLang),
      role: 'presentation',
      voice_id: legacyHumanVoiceId(courseCode, 'presentation'),
      origin: 'human', // Introductions are typically human recorded
      s3_key: `mastered/${intro.id}.mp3`,
      duration_ms: intro.duration ? Math.round(intro.duration * 1000) : null
    });
  }

  // Batch insert
  for (let i = 0; i < audioRecords.length; i += batchSize) {
    const batch = audioRecords.slice(i, i + batchSize);

    const { error: insertError } = await supabase
      .from('course_audio')
      .upsert(batch, {
        onConflict: 'course_code,text_normalized,language,role',
        ignoreDuplicates: true
      });

    if (insertError) {
      console.error(`  Error in batch ${i}-${i + batch.length}:`, insertError.message);
      audioErrors += batch.length;
    } else {
      audioImported += batch.length;
    }

    if ((i + batchSize) % 1000 === 0 || i + batchSize >= audioRecords.length) {
      console.log(`  Processed ${Math.min(i + batchSize, audioRecords.length)}/${audioRecords.length} audio records...`);
    }
  }

  console.log(`  ✓ Imported ${audioImported} audio records (${audioErrors} errors)`);

  // ==========================================================================
  // STEP 3: Import seeds to course_seeds
  // ==========================================================================
  console.log('Step 3: Importing seeds to course_seeds...');

  let seedsImported = 0;
  const seedRecords = [];

  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];
    const mainNode = seed.node;

    if (!mainNode) continue;

    seedRecords.push({
      course_code: courseCode,
      seed_number: i + 1,
      // seed_id is auto-generated by database
      known_text: mainNode.known?.text || '',
      target_text: mainNode.target?.text || ''
    });
  }

  // Batch insert seeds
  for (let i = 0; i < seedRecords.length; i += batchSize) {
    const batch = seedRecords.slice(i, i + batchSize);

    const { error: seedError } = await supabase
      .from('course_seeds')
      .upsert(batch, {
        onConflict: 'course_code,seed_number'
      });

    if (seedError) {
      console.error(`  Error inserting seeds:`, seedError.message);
    } else {
      seedsImported += batch.length;
    }
  }

  console.log(`  ✓ Imported ${seedsImported} seeds`);

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log();
  console.log('='.repeat(60));
  console.log('IMPORT COMPLETE');
  console.log('='.repeat(60));
  console.log(`  Course: ${courseCode}`);
  console.log(`  Audio records: ${audioImported}`);
  console.log(`  Seeds: ${seedsImported}`);
  console.log();

  // Verify counts in database
  const { count: dbAudioCount } = await supabase
    .from('course_audio')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode);

  const { count: dbSeedCount } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode);

  console.log('Database verification:');
  console.log(`  course_audio: ${dbAudioCount} records`);
  console.log(`  course_seeds: ${dbSeedCount} records`);

  return {
    courseCode,
    audioImported,
    seedsImported,
    dbAudioCount,
    dbSeedCount
  };
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const manifestPath = args.find(a => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');

  if (!manifestPath) {
    console.error('Usage: node database/import-course-v13.cjs <manifest.json> [--dry-run]');
    console.error('Example: node database/import-course-v13.cjs ~/Downloads/en-cy-south.json --dry-run');
    process.exit(1);
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    process.exit(1);
  }

  await importCourse(manifestPath, dryRun);
}

main().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
