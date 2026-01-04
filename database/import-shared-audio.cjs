#!/usr/bin/env node
/**
 * Import Shared Audio to Database (v13 Schema)
 *
 * Imports encouragements and instructions from a course manifest to shared_audio table.
 * These are language-agnostic and shared across all courses with the same known language.
 *
 * v13 Schema:
 * - shared_audio: text, language, audio_type (encouragement|instruction), s3_key
 *
 * Usage:
 *   node database/import-shared-audio.cjs /path/to/manifest.json --dry-run
 *   node database/import-shared-audio.cjs /path/to/manifest.json
 */

require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

// =============================================================================
// HELPERS
// =============================================================================

function normalizeText(text) {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

// =============================================================================
// IMPORT LOGIC
// =============================================================================

async function importSharedAudio(manifestPath, dryRun = false) {
  console.log('='.repeat(60));
  console.log('Import Shared Audio to Database (v13 Schema)');
  console.log('='.repeat(60));
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log();

  // Load manifest
  if (!await fs.pathExists(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }
  const manifest = await fs.readJson(manifestPath);

  // Extract slice and samples
  const slice = manifest.slices?.[0];
  if (!slice) {
    throw new Error('No slices found in manifest');
  }

  const samples = slice.samples || {};
  const orderedEncouragements = slice.orderedEncouragements || [];
  const pooledEncouragements = slice.pooledEncouragements || [];

  // Determine known language from manifest (normalize to ISO 639-3)
  const langMap = { 'en': 'eng', 'es': 'spa', 'it': 'ita', 'cy': 'cym', 'de': 'deu', 'fr': 'fra' };
  const rawLang = manifest.known || 'en';
  const knownLang = langMap[rawLang] || rawLang;

  console.log(`Known language: ${knownLang}`);
  console.log(`Ordered encouragements (instructions): ${orderedEncouragements.length}`);
  console.log(`Pooled encouragements: ${pooledEncouragements.length}`);
  console.log();

  // Build shared audio records
  const sharedRecords = [];

  // Process ordered encouragements → instruction
  for (const enc of orderedEncouragements) {
    const audioList = samples[enc.text];
    if (!audioList || audioList.length === 0) {
      console.warn(`  Warning: No audio for ordered encouragement: ${enc.text.slice(0, 50)}...`);
      continue;
    }

    const audio = audioList[0]; // Take first audio entry
    sharedRecords.push({
      text: enc.text,
      text_normalized: normalizeText(enc.text),
      language: knownLang,
      audio_type: 'instruction',
      voice_id: audio.voice_id || 'human_recording',
      origin: 'human',
      s3_key: `mastered/${audio.id}.mp3`,
      duration_ms: audio.duration ? Math.round(audio.duration * 1000) : null
    });
  }

  // Process pooled encouragements → encouragement
  for (const enc of pooledEncouragements) {
    const audioList = samples[enc.text];
    if (!audioList || audioList.length === 0) {
      console.warn(`  Warning: No audio for pooled encouragement: ${enc.text.slice(0, 50)}...`);
      continue;
    }

    const audio = audioList[0]; // Take first audio entry
    sharedRecords.push({
      text: enc.text,
      text_normalized: normalizeText(enc.text),
      language: knownLang,
      audio_type: 'encouragement',
      voice_id: audio.voice_id || 'human_recording',
      origin: 'human',
      s3_key: `mastered/${audio.id}.mp3`,
      duration_ms: audio.duration ? Math.round(audio.duration * 1000) : null
    });
  }

  console.log(`Total shared audio records to import: ${sharedRecords.length}`);
  console.log();

  if (dryRun) {
    console.log('DRY RUN - would import:');
    console.log(`  - ${orderedEncouragements.length} instruction records`);
    console.log(`  - ${pooledEncouragements.length} encouragement records`);
    console.log();
    console.log('Sample records:');
    sharedRecords.slice(0, 3).forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.audio_type}] ${r.text.slice(0, 60)}...`);
      console.log(`     S3: ${r.s3_key}`);
    });
    console.log();
    console.log('Run without --dry-run to execute');
    return { instructionCount: orderedEncouragements.length, encouragementCount: pooledEncouragements.length };
  }

  // ==========================================================================
  // INSERT TO shared_audio
  // ==========================================================================
  console.log('Inserting shared audio records...');

  const batchSize = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < sharedRecords.length; i += batchSize) {
    const batch = sharedRecords.slice(i, i + batchSize);

    const { error: insertError } = await supabase
      .from('shared_audio')
      .upsert(batch, {
        onConflict: 'text_normalized,language,audio_type',
        ignoreDuplicates: false
      });

    if (insertError) {
      console.error(`  Error in batch ${i}-${i + batch.length}:`, insertError.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  ✓ Inserted ${inserted} shared audio records (${errors} errors)`);

  // ==========================================================================
  // VERIFY
  // ==========================================================================
  console.log();
  console.log('Database verification:');

  const { count: instructionCount } = await supabase
    .from('shared_audio')
    .select('*', { count: 'exact', head: true })
    .eq('language', knownLang)
    .eq('audio_type', 'instruction');

  const { count: encouragementCount } = await supabase
    .from('shared_audio')
    .select('*', { count: 'exact', head: true })
    .eq('language', knownLang)
    .eq('audio_type', 'encouragement');

  console.log(`  Instructions (${knownLang}): ${instructionCount}`);
  console.log(`  Encouragements (${knownLang}): ${encouragementCount}`);

  console.log();
  console.log('='.repeat(60));
  console.log('IMPORT COMPLETE');
  console.log('='.repeat(60));

  return { inserted, instructionCount, encouragementCount };
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const manifestPath = args.find(a => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');

  if (!manifestPath) {
    console.error('Usage: node database/import-shared-audio.cjs <manifest.json> [--dry-run]');
    console.error('Example: node database/import-shared-audio.cjs ~/manifests/italian.json --dry-run');
    process.exit(1);
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    process.exit(1);
  }

  await importSharedAudio(manifestPath, dryRun);
}

main().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
