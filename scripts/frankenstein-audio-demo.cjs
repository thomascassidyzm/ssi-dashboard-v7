#!/usr/bin/env node
/**
 * Frankenstein Audio Demo
 *
 * Demonstrates building Seed 60 "dw i ddim isio siarad Cymraeg rŵan"
 * from LEGOs extracted from Seeds 1, 6, and 11.
 *
 * Usage:
 *   node scripts/frankenstein-audio-demo.cjs
 *
 * Prerequisites:
 *   - ffmpeg installed
 *   - whisper.cpp installed (for segmentation)
 *   - AWS credentials configured (for S3 access)
 */

const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process');

const supabase = require('../services/supabase-client.cjs');
const audioProcessor = require('../services/audio-processor.cjs');

const DEMO_DIR = path.join(__dirname, '../temp/frankenstein-demo');
const COURSE_CODE = 'cym_n_for_eng';

// The phrases we need
const SOURCE_PHRASES = [
  { seed: 1, text: 'dw i isio siarad Cymraeg', provides: ['dw', 'i', 'isio', 'siarad', 'Cymraeg'] },
  { seed: 6, text: 'fedra i ddim cofio sut i siarad Cymraeg', provides: ['ddim'] },
  { seed: 11, text: 'ond well i mi ymarfer siarad Cymraeg rŵan', provides: ['rŵan'] },
];

const TARGET_PHRASE = {
  seed: 60,
  text: 'dw i ddim isio siarad Cymraeg rŵan',
  english: "I don't want to speak Welsh now",
  // Build order: which words and from which source
  buildOrder: [
    { word: 'dw', from: 1 },
    { word: 'i', from: 1 },
    { word: 'ddim', from: 6 },
    { word: 'isio', from: 1 },
    { word: 'siarad', from: 1 },
    { word: 'Cymraeg', from: 1 },
    { word: 'rŵan', from: 11 },
  ],
};

async function downloadAudio(phrase, filename) {
  const client = supabase.getClient();

  // Find the audio in the database
  const { data } = await client
    .from('course_audio')
    .select('id, s3_key')
    .eq('course_code', COURSE_CODE)
    .ilike('text', phrase)
    .eq('role', 'target1')
    .limit(1)
    .single();

  if (!data) {
    throw new Error(`Audio not found for: ${phrase}`);
  }

  // Download from S3 using s3_key directly
  const outputPath = path.join(DEMO_DIR, 'sources', filename);
  console.log(`  Downloading: ${phrase.substring(0, 30)}...`);

  // Construct URL from s3_key
  const S3_BUCKET = 'ssi-audio-stage';
  const AWS_REGION = 'eu-west-1';
  const url = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${data.s3_key}`;

  // Download with curl
  execSync(`curl -s -o "${outputPath}" "${url}"`);

  return outputPath;
}

async function main() {
  console.log('═'.repeat(60));
  console.log('FRANKENSTEIN AUDIO DEMO');
  console.log('═'.repeat(60));
  console.log(`\nBuilding: "${TARGET_PHRASE.text}"`);
  console.log(`English:  "${TARGET_PHRASE.english}"\n`);

  // Setup directories
  await fs.ensureDir(path.join(DEMO_DIR, 'sources'));
  await fs.ensureDir(path.join(DEMO_DIR, 'segments'));
  await fs.ensureDir(path.join(DEMO_DIR, 'output'));

  // Step 1: Download source phrase audio
  console.log('─'.repeat(60));
  console.log('STEP 1: Download source phrase recordings\n');

  const sourcePaths = {};
  for (const source of SOURCE_PHRASES) {
    const filename = `seed_${source.seed}.mp3`;
    sourcePaths[source.seed] = await downloadAudio(source.text, filename);
    console.log(`  ✓ Seed ${source.seed}: ${source.text}`);
  }

  // Step 2: Download target phrase (for comparison)
  console.log('\n  ✓ Seed 60 (original for comparison)');
  const originalPath = await downloadAudio(TARGET_PHRASE.text, 'seed_60_original.mp3');

  // Step 3: Segment with Whisper (placeholder - would need whisper.cpp)
  console.log('\n' + '─'.repeat(60));
  console.log('STEP 2: Segment audio with Whisper\n');
  console.log('  ⚠ Whisper segmentation would extract word boundaries here.');
  console.log('  For demo purposes, we\'ll simulate with manual extraction.\n');

  // In a real implementation, we'd run whisper on each source file
  // and extract the word segments. For now, show the concept:
  console.log('  Simulated extraction:');
  for (const source of SOURCE_PHRASES) {
    console.log(`  Seed ${source.seed}: ${source.provides.map(w => `"${w}"`).join(', ')}`);
  }

  // Step 4: Splice (simulated - would need actual segments)
  console.log('\n' + '─'.repeat(60));
  console.log('STEP 3: Splice LEGOs together\n');

  console.log('  Build order:');
  for (const item of TARGET_PHRASE.buildOrder) {
    console.log(`    "${item.word}" ← Seed ${item.from}`);
  }

  // For a real demo, we'd:
  // 1. Extract each word segment using ffmpeg with timestamps from Whisper
  // 2. Normalize each segment
  // 3. Crossfade splice them together

  console.log('\n  ⚠ Full splice requires Whisper segmentation.');
  console.log('  Run: node tools/recording-optimizer/segment-audio.cjs');
  console.log('  Then: node tools/recording-optimizer/splice-legos.cjs');

  // Step 5: Show output paths
  console.log('\n' + '─'.repeat(60));
  console.log('OUTPUT FILES:\n');
  console.log(`  Sources:     ${DEMO_DIR}/sources/`);
  console.log(`  Segments:    ${DEMO_DIR}/segments/ (after Whisper)`);
  console.log(`  Original:    ${DEMO_DIR}/sources/seed_60_original.mp3`);
  console.log(`  Spliced:     ${DEMO_DIR}/output/seed_60_spliced.mp3 (after splice)`);

  console.log('\n' + '═'.repeat(60));
  console.log('DEMO COMPLETE - Audio files downloaded for manual testing');
  console.log('═'.repeat(60));

  // Show what's in the demo directory
  console.log('\nFiles created:');
  const files = await fs.readdir(path.join(DEMO_DIR, 'sources'));
  for (const f of files) {
    const stats = await fs.stat(path.join(DEMO_DIR, 'sources', f));
    console.log(`  ${f} (${Math.round(stats.size / 1024)}KB)`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
