#!/usr/bin/env node

/**
 * Generate All Encouragements
 *
 * Regenerates all encouragements from canonical file using ElevenLabs.
 * Clears existing samples and creates fresh, consistent set.
 */

const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const elevenlabsService = require('../services/elevenlabs-service.cjs');
const audioProcessor = require('../services/audio-processor.cjs');
const s3Service = require('../services/s3-service.cjs');

const CANONICAL_PATH = path.join(__dirname, '../public/vfs/canonical/eng_encouragements.json');
const SAMPLES_PATH = path.join(__dirname, '../samples_database/encouragement_samples/eng_samples.json');
const VOICES_PATH = path.join(__dirname, '../public/vfs/canonical/voices.json');
const TEMP_DIR = path.join(__dirname, '../temp/encouragements');
const S3_BUCKET = 'popty-bach-lfs';

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('Generate All Encouragements');
  console.log('='.repeat(60) + '\n');

  // Load canonical encouragements
  const canonical = await fs.readJson(CANONICAL_PATH);
  const allEncouragements = [
    ...(canonical.pooledEncouragements || []),
    ...(canonical.orderedEncouragements || [])
  ];

  console.log(`Loaded ${allEncouragements.length} canonical encouragements\n`);

  // Load voice config
  const voices = await fs.readJson(VOICES_PATH);
  const voiceId = 'elevenlabs_FOIN928B9X0jwgJ95cLt';
  const voiceConfig = voices.voices[voiceId];

  if (!voiceConfig) {
    throw new Error(`Voice not found: ${voiceId}`);
  }

  console.log(`Using voice: ${voiceConfig.display_name}`);
  console.log(`Provider: ${voiceConfig.provider}`);
  console.log(`Model: ${voiceConfig.model}\n`);

  // Prepare temp directory
  await fs.ensureDir(TEMP_DIR);
  await fs.ensureDir(path.join(TEMP_DIR, 'raw'));
  await fs.ensureDir(path.join(TEMP_DIR, 'processed'));

  // Generate all encouragements
  const results = [];
  const newSamples = {};

  for (let i = 0; i < allEncouragements.length; i++) {
    const enc = allEncouragements[i];
    const sampleUuid = uuidv4(); // New UUID for each audio sample

    console.log(`\n[${i + 1}/${allEncouragements.length}] Generating...`);
    console.log(`  Text: "${enc.text.substring(0, 60)}${enc.text.length > 60 ? '...' : ''}"`);
    console.log(`  Sample UUID: ${sampleUuid}`);

    const rawPath = path.join(TEMP_DIR, 'raw', `${sampleUuid}.mp3`);
    const processedPath = path.join(TEMP_DIR, 'processed', `${sampleUuid}.mp3`);

    try {
      // Generate with ElevenLabs
      await elevenlabsService.generateAudioWithRetry(
        enc.text,
        voiceConfig.provider_id,
        rawPath,
        {
          model_id: voiceConfig.model || 'eleven_flash_v2_5',
          stability: 0.3,  // Lower for more lively delivery
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true
        }
      );

      console.log(`  ✓ Generated raw audio`);

      // Process (normalize)
      await audioProcessor.processAudio(rawPath, processedPath, {
        normalize: true,
        timeStretch: 1.0,  // Natural pace for encouragements
        targetLUFS: -16.0
      });

      console.log(`  ✓ Processed audio`);

      // Get duration
      const duration = await audioProcessor.getAudioDuration(processedPath);
      console.log(`  ✓ Duration: ${duration.toFixed(2)}s`);

      // Upload to S3
      await s3Service.uploadAudioFile(sampleUuid, processedPath, S3_BUCKET);
      console.log(`  ✓ Uploaded to S3`);

      // Add to samples
      newSamples[sampleUuid] = {
        text: enc.text,
        uuid: sampleUuid,
        canonicalId: enc.id,
        duration: duration,
        voice: voiceId,
        cadence: 'natural',
        role: 'presentation',
        generated_at: new Date().toISOString()
      };

      results.push({ success: true, uuid: sampleUuid, text: enc.text });

    } catch (error) {
      console.error(`  ✗ Failed: ${error.message}`);
      results.push({ success: false, text: enc.text, error: error.message });
    }

    // Small delay between requests
    await new Promise(r => setTimeout(r, 200));
  }

  // Save samples file
  const samplesData = {
    language: 'eng',
    voice_id: voiceId,
    version: '2.0.0',
    last_updated: new Date().toISOString(),
    sample_count: Object.keys(newSamples).length,
    samples: newSamples
  };

  await fs.writeJson(SAMPLES_PATH, samplesData, { spaces: 2 });

  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Total: ${allEncouragements.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`\nSamples saved to: ${SAMPLES_PATH}`);

  if (failed > 0) {
    console.log('\nFailed items:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - "${r.text.substring(0, 50)}...": ${r.error}`);
    });
  }

  console.log('\n');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
