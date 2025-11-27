#!/usr/bin/env node

/**
 * Phase 8 Worker: ElevenLabs Generation
 *
 * Standalone worker that generates ElevenLabs samples in parallel with other providers
 * Input: JSON file with samples to generate
 * Output: JSON file with generation results
 */

// Load environment variables
require('dotenv').config();

const fs = require('fs-extra');
const path = require('path');
const elevenLabs = require('../services/elevenlabs-service.cjs');

// Parse command line arguments
const [,, samplesFile, outputFile, tempDir] = process.argv;

if (!samplesFile || !outputFile || !tempDir) {
  console.error('Usage: node phase8-worker-elevenlabs.cjs <samplesFile> <outputFile> <tempDir>');
  process.exit(1);
}

async function generateElevenLabsSamples() {
  console.log('[ElevenLabs Worker] Starting ElevenLabs generation...');
  console.log(`[ElevenLabs Worker] Input: ${samplesFile}`);
  console.log(`[ElevenLabs Worker] Output: ${outputFile}`);
  console.log(`[ElevenLabs Worker] Temp: ${tempDir}\n`);

  // Read samples to generate
  const samples = await fs.readJson(samplesFile);
  console.log(`[ElevenLabs Worker] Loaded ${samples.length} samples\n`);

  await fs.ensureDir(tempDir);

  const results = [];
  const MAX_CONCURRENT = 8;

  // Group by voice
  const byVoice = {};
  for (const sample of samples) {
    if (!byVoice[sample.voiceId]) {
      byVoice[sample.voiceId] = [];
    }
    byVoice[sample.voiceId].push(sample);
  }

  // Generate by voice
  for (const [voiceId, voiceSamples] of Object.entries(byVoice)) {
    console.log(`[ElevenLabs Worker] === Generating ${voiceSamples.length} samples with ${voiceId} ===\n`);

    let completed = 0;
    const total = voiceSamples.length;

    // Get voice details
    const providerId = voiceId.split('_').slice(1).join('_'); // 'FVdzAUsp8apoOdc0907A'

    // Process in batches
    for (let i = 0; i < voiceSamples.length; i += MAX_CONCURRENT) {
      const batch = voiceSamples.slice(i, i + MAX_CONCURRENT);

      const batchResults = await Promise.all(
        batch.map(async (sample) => {
          // Use sample.outputPath if set (hierarchical), otherwise fall back to legacy flat structure
          const outputPath = sample.outputPath || path.join(tempDir, `${sample.uuid}.mp3`);

          // Ensure output directory exists (for hierarchical structure)
          await fs.ensureDir(path.dirname(outputPath));

          console.log(`[ElevenLabs Worker] Generating [${sample.role}/${sample.cadence}] ${providerId}: "${sample.text}..."`);

          try {
            const audioBuffer = await elevenLabs.generateSpeech(
              sample.text,
              providerId,
              {
                model: sample.model || 'eleven_flash_v2_5',
                stability: sample.stability || 0.5,
                similarity_boost: sample.similarity_boost || 0.75,
                output_format: 'mp3_44100_192'
              }
            );

            await fs.writeFile(outputPath, audioBuffer);

            return {
              ...sample,
              success: true,
              outputPath,
              provider: 'elevenlabs'
            };
          } catch (error) {
            console.error(`[ElevenLabs Worker] ✗ Failed: ${sample.text} - ${error.message}`);
            return {
              ...sample,
              success: false,
              error: error.message,
              provider: 'elevenlabs'
            };
          }
        })
      );

      results.push(...batchResults);
      completed += batch.length;

      if (completed < total) {
        console.log(`[ElevenLabs Worker] Progress: ${completed}/${total} samples (${Math.round(completed/total*100)}%)`);
      }
    }

    console.log(`[ElevenLabs Worker] Progress: ${completed}/${total} samples (100%)\n`);
  }

  // Write results
  await fs.writeJson(outputFile, results, { spaces: 2 });

  const successCount = results.filter(r => r.success).length;
  console.log(`[ElevenLabs Worker] ✅ Complete: ${successCount}/${results.length} samples generated`);
  console.log(`[ElevenLabs Worker] Results saved to: ${outputFile}\n`);

  process.exit(successCount > 0 ? 0 : 1);
}

// Run
generateElevenLabsSamples().catch(err => {
  console.error('[ElevenLabs Worker] Fatal error:', err);
  process.exit(1);
});
