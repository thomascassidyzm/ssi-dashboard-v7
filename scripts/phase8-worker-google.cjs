#!/usr/bin/env node

/**
 * Phase 8 Worker: Google Cloud TTS (Chirp 3 HD) Generation
 *
 * Standalone worker that generates Google TTS samples in parallel with other providers.
 * Drop-in replacement for phase8-worker-azure.cjs
 *
 * Input: JSON file with samples to generate
 * Output: JSON file with generation results
 *
 * Usage:
 *   node phase8-worker-google.cjs <samplesFile> <outputFile> <tempDir>
 */

// Load environment variables
require('dotenv').config();

const fs = require('fs-extra');
const path = require('path');
const googleTTS = require('../services/google-tts-service.cjs');

// Catch unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Google Worker] ✗ UNHANDLED REJECTION:', reason);
  console.error('[Google Worker] Promise:', promise);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('[Google Worker] ✗ UNCAUGHT EXCEPTION:', error);
  console.error('[Google Worker] Stack:', error.stack);
  process.exit(1);
});

// Parse command line arguments
const [,, samplesFile, outputFile, tempDir] = process.argv;

if (!samplesFile || !outputFile || !tempDir) {
  console.error('Usage: node phase8-worker-google.cjs <samplesFile> <outputFile> <tempDir>');
  process.exit(1);
}

async function generateGoogleSamples() {
  console.log('[Google Worker] Starting Google Cloud TTS (Chirp 3 HD) generation...');
  console.log(`[Google Worker] Input: ${samplesFile}`);
  console.log(`[Google Worker] Output: ${outputFile}`);
  console.log(`[Google Worker] Temp: ${tempDir}\n`);

  // Read samples to generate
  const samples = await fs.readJson(samplesFile);
  console.log(`[Google Worker] Loaded ${samples.length} samples\n`);

  await fs.ensureDir(tempDir);

  const results = [];
  const MAX_CONCURRENT = 10; // Google allows higher concurrency than Azure

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
    console.log(`[Google Worker] === Generating ${voiceSamples.length} samples with ${voiceId} ===\n`);

    let completed = 0;
    const total = voiceSamples.length;

    // Extract voice details from SSi voice ID (google_<lang>_<voice>)
    const voiceParts = voiceId.split('_');
    const languageCode = voiceParts[1] || 'en-US';
    const voiceName = voiceParts.slice(2).join('_') || 'Kore';

    // Process in batches
    for (let i = 0; i < voiceSamples.length; i += MAX_CONCURRENT) {
      const batch = voiceSamples.slice(i, i + MAX_CONCURRENT);

      try {
        const batchResults = await Promise.all(
          batch.map(async (sample) => {
            const outputPath = path.join(tempDir, `${sample.uuid}.mp3`);

            // Get speed from sample (googleSpeed or default based on cadence)
            const speed = sample.googleSpeed || (sample.cadence === 'slow' ? 0.85 : 1.0);

            console.log(`[Google Worker] Generating [${sample.role}/${sample.cadence}] ${voiceName}: "${sample.text.substring(0, 50)}..."`);

            try {
              const audioBuffer = await googleTTS.generateSpeech(
                sample.text,
                voiceName,
                languageCode,
                {
                  rate: speed,
                  audioEncoding: 'MP3'
                }
              );

              await fs.writeFile(outputPath, audioBuffer);

              return {
                ...sample,
                success: true,
                outputPath,
                provider: 'google'
              };
            } catch (error) {
              console.error(`[Google Worker] ✗ Failed: ${sample.text.substring(0, 50)}... - ${error.message}`);
              return {
                ...sample,
                success: false,
                error: error.message,
                provider: 'google'
              };
            }
          })
        );

        results.push(...batchResults);
        completed += batch.length;

        if (completed < total) {
          console.log(`[Google Worker] Progress: ${completed}/${total} samples (${Math.round(completed/total*100)}%)`);
        }
      } catch (batchError) {
        console.error(`[Google Worker] ✗ Batch failed at ${i}-${i + batch.length}: ${batchError.message}`);
        console.error(`[Google Worker] Stack trace:`, batchError.stack);
        // Add failed results for this batch
        for (const sample of batch) {
          results.push({
            ...sample,
            success: false,
            error: `Batch processing error: ${batchError.message}`,
            provider: 'google'
          });
        }
        completed += batch.length;
      }
    }

    console.log(`[Google Worker] Progress: ${completed}/${total} samples (100%)\n`);
  }

  // Write results
  await fs.writeJson(outputFile, results, { spaces: 2 });

  const successCount = results.filter(r => r.success).length;
  console.log(`[Google Worker] ✅ Complete: ${successCount}/${results.length} samples generated`);
  console.log(`[Google Worker] Results saved to: ${outputFile}\n`);

  // Exit with failure if we didn't process all input samples
  const expectedCount = samples.length;
  if (results.length < expectedCount) {
    console.error(`[Google Worker] ❌ Only processed ${results.length}/${expectedCount} samples - exiting with error`);
    process.exit(1);
  }

  process.exit(successCount > 0 ? 0 : 1);
}

// Run
generateGoogleSamples().catch(err => {
  console.error('[Google Worker] Fatal error:', err);
  process.exit(1);
});
