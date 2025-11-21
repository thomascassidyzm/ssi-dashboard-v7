#!/usr/bin/env node

/**
 * Phase 8 Worker: Azure Speech Generation
 *
 * Standalone worker that generates Azure TTS samples in parallel with other providers
 * Input: JSON file with samples to generate
 * Output: JSON file with generation results
 */

// Load environment variables
require('dotenv').config();

const fs = require('fs-extra');
const path = require('path');
const azureTTS = require('../services/azure-tts-service.cjs');

// Catch unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Azure Worker] ✗ UNHANDLED REJECTION:', reason);
  console.error('[Azure Worker] Promise:', promise);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('[Azure Worker] ✗ UNCAUGHT EXCEPTION:', error);
  console.error('[Azure Worker] Stack:', error.stack);
  process.exit(1);
});

// Parse command line arguments
const [,, samplesFile, outputFile, tempDir] = process.argv;

if (!samplesFile || !outputFile || !tempDir) {
  console.error('Usage: node phase8-worker-azure.cjs <samplesFile> <outputFile> <tempDir>');
  process.exit(1);
}

async function generateAzureSamples() {
  console.log('[Azure Worker] Starting Azure TTS generation...');
  console.log(`[Azure Worker] Input: ${samplesFile}`);
  console.log(`[Azure Worker] Output: ${outputFile}`);
  console.log(`[Azure Worker] Temp: ${tempDir}\n`);

  // Read samples to generate
  const samples = await fs.readJson(samplesFile);
  console.log(`[Azure Worker] Loaded ${samples.length} samples\n`);

  await fs.ensureDir(tempDir);

  const results = [];
  const MAX_CONCURRENT = 1; // Sequential processing to avoid Azure backend throttling

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
    console.log(`[Azure Worker] === Generating ${voiceSamples.length} samples with ${voiceId} ===\n`);

    let completed = 0;
    const total = voiceSamples.length;

    // Get voice details
    const voiceDetails = {
      provider: voiceId.split('_')[0], // 'azure'
      voiceId: voiceId.split('_').slice(1).join('_'), // 'it-IT-ElsaNeural'
      displayName: voiceId
    };

    // Process in batches
    for (let i = 0; i < voiceSamples.length; i += MAX_CONCURRENT) {
      const batch = voiceSamples.slice(i, i + MAX_CONCURRENT);

      try {
        const batchResults = await Promise.all(
          batch.map(async (sample) => {
            const outputPath = path.join(tempDir, `${sample.uuid}.mp3`);

            console.log(`[Azure Worker] Generating [${sample.role}/${sample.cadence}] ${voiceDetails.voiceId}: "${sample.text}..."`);

            try {
              const audioBuffer = await azureTTS.generateSpeech(
                sample.text,
                voiceDetails.voiceId,
                sample.language,
                {
                  rate: sample.azureSpeed || 1.0,
                  outputFormat: 'audio-48khz-192kbitrate-mono-mp3'
                }
              );

              await fs.writeFile(outputPath, audioBuffer);

              return {
                ...sample,
                success: true,
                outputPath,
                provider: 'azure'
              };
            } catch (error) {
              console.error(`[Azure Worker] ✗ Failed: ${sample.text} - ${error.message}`);
              return {
                ...sample,
                success: false,
                error: error.message,
                provider: 'azure'
              };
            }
          })
        );

        results.push(...batchResults);
        completed += batch.length;

        if (completed < total) {
          console.log(`[Azure Worker] Progress: ${completed}/${total} samples (${Math.round(completed/total*100)}%)`);
        }
      } catch (batchError) {
        console.error(`[Azure Worker] ✗ Batch failed at ${i}-${i + batch.length}: ${batchError.message}`);
        console.error(`[Azure Worker] Stack trace:`, batchError.stack);
        // Add failed results for this batch
        for (const sample of batch) {
          results.push({
            ...sample,
            success: false,
            error: `Batch processing error: ${batchError.message}`,
            provider: 'azure'
          });
        }
        completed += batch.length;
      }
    }

    console.log(`[Azure Worker] Progress: ${completed}/${total} samples (100%)\n`);
  }

  // Write results
  await fs.writeJson(outputFile, results, { spaces: 2 });

  const successCount = results.filter(r => r.success).length;
  console.log(`[Azure Worker] ✅ Complete: ${successCount}/${results.length} samples generated`);
  console.log(`[Azure Worker] Results saved to: ${outputFile}\n`);

  // Exit with failure if we didn't process all input samples
  const expectedCount = samples.length;
  if (results.length < expectedCount) {
    console.error(`[Azure Worker] ❌ Only processed ${results.length}/${expectedCount} samples - exiting with error`);
    process.exit(1);
  }

  process.exit(successCount > 0 ? 0 : 1);
}

// Run
generateAzureSamples().catch(err => {
  console.error('[Azure Worker] Fatal error:', err);
  process.exit(1);
});
