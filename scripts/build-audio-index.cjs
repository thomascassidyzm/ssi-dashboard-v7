#!/usr/bin/env node
/**
 * Build Audio Index from MAR
 *
 * Combines all voice samples from the local MAR into a single
 * audio-index.json file and uploads to S3.
 *
 * The index maps: text:role:cadence -> { uuid, voice, language }
 *
 * Usage:
 *   node scripts/build-audio-index.cjs [--upload]
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

// AWS SDK for upload
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const MAR_BASE = path.join(__dirname, '..', 'samples_database', 'voices');
const OUTPUT_PATH = path.join(__dirname, '..', 'temp', 'audio-index.json');

// Normalize text for consistent lookup
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text.toLowerCase().trim().replace(/^[,.\s]+|[,.\s]+$/g, '').replace(/\s+/g, ' ');
}

// Build lookup key
function buildKey(text, role, cadence = 'natural') {
  const normalized = normalizeText(text);
  return `${normalized}|${role}|${cadence}`;
}

async function buildIndex() {
  console.log('Building audio index from MAR...\n');

  const index = {
    version: '1.0.0',
    built_at: new Date().toISOString(),
    voices: {},
    samples: {} // key -> { uuid, voice, language, role, cadence }
  };

  // Get all voice directories
  const voiceDirs = await fs.readdir(MAR_BASE);
  console.log(`Found ${voiceDirs.length} voice directories\n`);

  for (const voiceId of voiceDirs) {
    if (voiceId.startsWith('.')) continue;

    const samplesPath = path.join(MAR_BASE, voiceId, 'samples.json');
    if (!await fs.pathExists(samplesPath)) continue;

    try {
      const voiceSamples = await fs.readJson(samplesPath);
      const sampleCount = Object.keys(voiceSamples.samples || {}).length;

      index.voices[voiceId] = {
        sample_count: sampleCount,
        last_updated: voiceSamples.last_updated
      };

      // Add each sample to the index
      for (const [uuid, sample] of Object.entries(voiceSamples.samples || {})) {
        const key = buildKey(sample.text, sample.role, sample.cadence);

        // Only add if not already present (first voice wins)
        if (!index.samples[key]) {
          index.samples[key] = {
            uuid,
            voice: voiceId,
            language: sample.language,
            role: sample.role,
            cadence: sample.cadence || 'natural'
          };
        }
      }

      console.log(`  ${voiceId}: ${sampleCount} samples`);
    } catch (err) {
      console.error(`  ${voiceId}: Error - ${err.message}`);
    }
  }

  index.total_samples = Object.keys(index.samples).length;
  console.log(`\nTotal indexed samples: ${index.total_samples}\n`);

  return index;
}

async function uploadToS3(index) {
  console.log('Uploading audio-index.json to S3...');

  const s3 = new S3Client({
    region: process.env.AWS_REGION || 'eu-west-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  const body = JSON.stringify(index, null, 2);

  const command = new PutObjectCommand({
    Bucket: 'ssi-audio-stage',
    Key: 'audio-index.json',
    Body: body,
    ContentType: 'application/json',
    CacheControl: 'max-age=3600' // 1 hour cache
  });

  await s3.send(command);
  console.log('✓ Uploaded to s3://ssi-audio-stage/audio-index.json\n');
}

async function main() {
  const shouldUpload = process.argv.includes('--upload');

  // Build index
  const index = await buildIndex();

  // Save locally
  await fs.ensureDir(path.dirname(OUTPUT_PATH));
  await fs.writeJson(OUTPUT_PATH, index, { spaces: 2 });
  console.log(`Saved to ${OUTPUT_PATH}`);

  // Upload if requested
  if (shouldUpload) {
    await uploadToS3(index);
  } else {
    console.log('\nRun with --upload to push to S3\n');
  }

  // Show sample lookup test
  console.log('Sample lookups:');
  const testKeys = Object.keys(index.samples).slice(0, 3);
  for (const key of testKeys) {
    const sample = index.samples[key];
    console.log(`  "${key.substring(0, 40)}..." -> ${sample.uuid}`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
