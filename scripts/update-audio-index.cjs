#!/usr/bin/env node
/**
 * Update Audio Index on S3
 *
 * Incrementally adds new samples to the S3 audio-index.json.
 * Used by Phase 8 after audio generation to make new samples available
 * to the dashboard lookup API.
 *
 * Usage:
 *   node scripts/update-audio-index.cjs --samples='[{"uuid":"...","language":"spa","text":"hola","role":"target1","cadence":"natural","voice":"elevenlabs_xxx"}]'
 *   node scripts/update-audio-index.cjs --file=temp/new-samples.json
 *
 * The audio-index.json on S3 is the Single Source of Truth for audio lookups.
 * Format: { samples: { "language|text|role|cadence": { uuid, voice, duration } } }
 */

const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const AUDIO_BUCKET = 'ssi-audio-stage';
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';

// Initialize S3 client
const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Normalize text for consistent lookup (must match lookup API)
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text.toLowerCase().trim().replace(/^[,.\\s]+|[,.\\s]+$/g, '').replace(/\\s+/g, ' ');
}

// Build lookup key: language|text|role|cadence
function buildKey(language, text, role, cadence = 'natural') {
  const normalized = normalizeText(text);
  return `${language}|${normalized}|${role}|${cadence}`;
}

// Load existing audio index from S3
async function loadAudioIndex() {
  console.log('Loading existing audio-index.json from S3...');

  try {
    const command = new GetObjectCommand({
      Bucket: AUDIO_BUCKET,
      Key: 'audio-index.json'
    });

    const result = await s3.send(command);
    const body = await result.Body.transformToString();
    const index = JSON.parse(body);

    console.log(`Loaded index with ${index.total_samples || Object.keys(index.samples).length} samples`);
    return index;
  } catch (err) {
    if (err.name === 'NoSuchKey') {
      console.log('No existing index found, creating new one');
      return {
        version: '1.0.0',
        built_at: new Date().toISOString(),
        voices: {},
        samples: {},
        total_samples: 0
      };
    }
    throw err;
  }
}

// Save updated audio index to S3
async function saveAudioIndex(index) {
  console.log('Uploading updated audio-index.json to S3...');

  index.last_updated = new Date().toISOString();
  index.total_samples = Object.keys(index.samples).length;

  const body = JSON.stringify(index, null, 2);

  const command = new PutObjectCommand({
    Bucket: AUDIO_BUCKET,
    Key: 'audio-index.json',
    Body: body,
    ContentType: 'application/json',
    CacheControl: 'max-age=60' // Short cache for updates
  });

  await s3.send(command);
  console.log(`✓ Uploaded audio-index.json (${index.total_samples} total samples)`);
}

// Add new samples to the index
function addSamplesToIndex(index, newSamples) {
  let added = 0;
  let updated = 0;

  for (const sample of newSamples) {
    const { uuid, language, text, role, cadence = 'natural', voice, duration } = sample;

    if (!uuid || !language || !text || !role) {
      console.warn(`Skipping invalid sample: ${JSON.stringify(sample).substring(0, 100)}`);
      continue;
    }

    const key = buildKey(language, text, role, cadence);

    // Track voice info
    if (voice && !index.voices[voice]) {
      index.voices[voice] = {
        sample_count: 0,
        last_updated: new Date().toISOString()
      };
    }

    if (index.samples[key]) {
      // Update existing
      index.samples[key] = { uuid, voice, duration: duration || 0 };
      updated++;
    } else {
      // Add new
      index.samples[key] = { uuid, voice, duration: duration || 0 };
      added++;
    }

    if (voice) {
      index.voices[voice].sample_count++;
    }
  }

  console.log(`Added ${added} new samples, updated ${updated} existing`);
  return { added, updated };
}

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let newSamples = [];

  for (const arg of args) {
    if (arg.startsWith('--samples=')) {
      const samplesJson = arg.substring('--samples='.length);
      newSamples = JSON.parse(samplesJson);
    } else if (arg.startsWith('--file=')) {
      const filePath = arg.substring('--file='.length);
      const fs = require('fs-extra');
      newSamples = await fs.readJson(filePath);
    } else if (arg === '--help') {
      console.log(`
Update Audio Index on S3

Usage:
  node scripts/update-audio-index.cjs --samples='[...]'
  node scripts/update-audio-index.cjs --file=path/to/samples.json

Sample format:
  {
    "uuid": "ABC123...",
    "language": "spa",
    "text": "hola",
    "role": "target1",
    "cadence": "natural",
    "voice": "elevenlabs_xxx",
    "duration": 1.5
  }

This script:
1. Downloads existing audio-index.json from S3
2. Adds/updates the provided samples
3. Uploads the updated index back to S3
`);
      process.exit(0);
    }
  }

  if (newSamples.length === 0) {
    console.error('No samples provided. Use --samples=\'[...]\' or --file=path.json');
    process.exit(1);
  }

  console.log(`\n=== Updating Audio Index with ${newSamples.length} samples ===\n`);

  // Load, update, save
  const index = await loadAudioIndex();
  const result = addSamplesToIndex(index, newSamples);
  await saveAudioIndex(index);

  console.log(`\n✅ Audio index updated: +${result.added} new, ~${result.updated} updated\n`);
}

// Only run main() when executed directly as a script, not when required as a module
if (require.main === module) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}

module.exports = {
  loadAudioIndex,
  saveAudioIndex,
  addSamplesToIndex,
  buildKey,
  normalizeText
};
