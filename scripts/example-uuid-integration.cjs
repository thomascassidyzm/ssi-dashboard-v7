#!/usr/bin/env node
/**
 * Integration Example: How to Use Multi-Format UUID Lookup
 *
 * This demonstrates how to integrate the hardened UUID service into
 * your audio generation workflow to find existing legacy files.
 */

const {
  generateAllFormatUUIDs,
  lookupAudioByText,
  generateSampleUUID
} = require('../services/uuid-service.cjs');

console.log('INTEGRATION EXAMPLE: Multi-Format UUID Lookup in Audio Generation');
console.log('='.repeat(80));
console.log();

// SCENARIO: You're processing a course manifest and want to check if audio already exists
// before calling the expensive TTS API.

// Sample from course manifest
const sample = {
  text: 'quiero',
  language: 'es',  // Could be 'es' or 'spa' in different parts of the system
  role: 'target1',
  cadence: 'natural',
  voiceId: 'azure_es-ES-TrianaNeural'
};

console.log('Sample to process:');
console.log(JSON.stringify(sample, null, 2));
console.log();

// Step 1: Load S3 index (simulated here)
console.log('STEP 1: Load S3 index of existing audio files');
console.log('-'.repeat(80));

// In real code, this would come from: aws s3 ls s3://bucket/mastered/
const s3AudioFiles = [
  'AA765CF4-E53F-5069-B154-1DC5FF1565CD.mp3',  // Legacy format (no voiceId, 3-letter)
  '12345678-90AB-5DEF-CDEF-1234567890AB.mp3',  // Some other file
  'F5866DE2-8779-5DF6-9D2C-9430DBF3D7EA.mp3'   // Current format (with voiceId, 3-letter)
];

// Extract UUIDs from filenames
const s3Index = new Set(s3AudioFiles.map(f => f.replace('.mp3', '')));
console.log(`Loaded ${s3Index.size} existing audio files from S3`);
console.log();

// Step 2: Try to find existing audio using multi-format lookup
console.log('STEP 2: Check if audio exists (all format variants)');
console.log('-'.repeat(80));

const foundUUID = lookupAudioByText(
  sample.text,
  sample.language,
  sample.role,
  sample.cadence,
  sample.voiceId,
  s3Index
);

if (foundUUID) {
  console.log('✓ FOUND: Audio already exists!');
  console.log(`  UUID: ${foundUUID}`);
  console.log(`  File: s3://bucket/mastered/${foundUUID}.mp3`);
  console.log();
  console.log('ACTION: Skip TTS generation, use existing file');
} else {
  console.log('✗ NOT FOUND: Audio does not exist');
  console.log();
  console.log('ACTION: Generate new audio via TTS API');

  // Generate the UUID for the new file
  const newUUID = generateSampleUUID(
    sample.text,
    sample.language,
    sample.role,
    sample.cadence,
    sample.voiceId
  );
  console.log(`  New UUID: ${newUUID}`);
  console.log(`  Will save to: s3://bucket/mastered/${newUUID}.mp3`);
}
console.log();

// Step 3: Show all possible UUIDs for debugging
console.log('STEP 3: Debug - Show all possible UUID variants');
console.log('-'.repeat(80));

const allVariants = generateAllFormatUUIDs(
  sample.text,
  sample.language,
  sample.role,
  sample.cadence,
  sample.voiceId
);

console.log('All possible UUID formats for this sample:');
allVariants.forEach((uuid, idx) => {
  const exists = s3Index.has(uuid) ? '✓ EXISTS' : '✗ missing';
  const priority = idx + 1;
  console.log(`  [${priority}] ${uuid} ${exists}`);
});
console.log();

// Step 4: Code pattern for integration
console.log('STEP 4: Integration Code Pattern');
console.log('-'.repeat(80));
console.log(`
// In your audio generation script:

const { lookupAudioByText } = require('./services/uuid-service.cjs');

async function processManifestSample(sample, s3Index) {
  // Check if audio already exists in S3 (any format)
  const existingUUID = lookupAudioByText(
    sample.text,
    sample.language,
    sample.role,
    sample.cadence,
    sample.voiceId,
    s3Index
  );

  if (existingUUID) {
    console.log(\`Reusing existing audio: \${existingUUID}.mp3\`);
    return { uuid: existingUUID, generated: false };
  }

  // No existing audio found, generate new
  const newUUID = generateSampleUUID(
    sample.text,
    sample.language,
    sample.role,
    sample.cadence,
    sample.voiceId
  );

  await generateTTSAudio(sample, newUUID);
  await uploadToS3(newUUID);

  return { uuid: newUUID, generated: true };
}
`);

console.log('='.repeat(80));
console.log('BENEFITS OF THIS APPROACH:');
console.log('='.repeat(80));
console.log();
console.log('✓ Finds audio files regardless of which UUID format was used originally');
console.log('✓ Prevents duplicate TTS generation (saves API costs)');
console.log('✓ Handles migration between formats seamlessly');
console.log('✓ Supports both 2-letter (es) and 3-letter (spa) language codes');
console.log('✓ Zero breaking changes to existing code');
console.log();
