#!/usr/bin/env node

/**
 * Phase 8 Worker: Azure Speech Generation
 *
 * Standalone worker that generates Azure TTS samples sequentially.
 * Uses a single persistent synthesizer connection (like the old Python script).
 *
 * Input: JSON file with samples to generate
 * Output: JSON file with generation results
 */

// Load environment variables
require('dotenv').config();

const fs = require('fs-extra');
const path = require('path');
const sdk = require('microsoft-cognitiveservices-speech-sdk');

// Configuration from environment
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'westeurope';

// Rate limiting - 5ms between requests = 200 req/s (Azure's limit)
const MIN_REQUEST_INTERVAL = 5;
let lastRequestTime = 0;

// Parse command line arguments
const [,, samplesFile, outputFile, tempDir] = process.argv;

if (!samplesFile || !outputFile || !tempDir) {
  console.error('Usage: node phase8-worker-azure.cjs <samplesFile> <outputFile> <tempDir>');
  process.exit(1);
}

/**
 * Build SSML with speed control
 */
function buildSSML(text, voiceName, speed = 1.0) {
  const speedPercent = Math.round((speed - 1.0) * 100);
  const speedStr = speedPercent === 0 ? '0%' : `${speedPercent > 0 ? '+' : ''}${speedPercent}%`;

  return `<speak version='1.0' xml:lang='en-US' xmlns='http://www.w3.org/2001/10/synthesis'>
    <voice name='${voiceName}'>
        <prosody rate='${speedStr}'>${escapeXML(text)}</prosody>
    </voice>
</speak>`;
}

/**
 * Escape XML special characters
 */
function escapeXML(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Rate limit requests
 */
async function rateLimitRequest() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const delay = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  lastRequestTime = Date.now();
}

/**
 * Generate speech using persistent synthesizer
 */
async function generateWithSynthesizer(synthesizer, text, voiceName, speed) {
  await rateLimitRequest();

  const ssml = buildSSML(text, voiceName, speed);

  return new Promise((resolve, reject) => {
    synthesizer.speakSsmlAsync(
      ssml,
      result => {
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          resolve(Buffer.from(result.audioData));
        } else if (result.reason === sdk.ResultReason.Canceled) {
          const cancellation = sdk.CancellationDetails.fromResult(result);
          reject(new Error(`Azure TTS canceled: ${cancellation.reason} - ${cancellation.errorDetails}`));
        } else {
          reject(new Error(`Azure TTS failed with reason: ${result.reason}`));
        }
      },
      error => {
        reject(new Error(`Azure TTS error: ${error}`));
      }
    );
  });
}

async function generateAzureSamples() {
  console.log('[Azure Worker] Starting Azure TTS generation (single connection mode)...');
  console.log(`[Azure Worker] Input: ${samplesFile}`);
  console.log(`[Azure Worker] Output: ${outputFile}`);
  console.log(`[Azure Worker] Temp: ${tempDir}\n`);

  // Validate credentials
  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    console.error('[Azure Worker] ✗ Missing AZURE_SPEECH_KEY or AZURE_SPEECH_REGION');
    process.exit(1);
  }

  // Read samples to generate
  const samples = await fs.readJson(samplesFile);
  console.log(`[Azure Worker] Loaded ${samples.length} samples\n`);

  await fs.ensureDir(tempDir);

  // Create single persistent synthesizer (like Python script)
  console.log('[Azure Worker] Creating persistent synthesizer connection...');
  const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
  speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz96KBitRateMonoMp3;
  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);
  console.log('[Azure Worker] ✓ Synthesizer ready\n');

  const results = [];

  // Group by voice
  const byVoice = {};
  for (const sample of samples) {
    if (!byVoice[sample.voiceId]) {
      byVoice[sample.voiceId] = [];
    }
    byVoice[sample.voiceId].push(sample);
  }

  try {
    // Generate by voice (sequentially)
    for (const [voiceId, voiceSamples] of Object.entries(byVoice)) {
      console.log(`[Azure Worker] === Generating ${voiceSamples.length} samples with ${voiceId} ===\n`);

      let completed = 0;
      const total = voiceSamples.length;

      // Extract Azure voice name from voiceId (e.g., 'azure_es-ES-TrianaNeural' -> 'es-ES-TrianaNeural')
      const azureVoiceName = voiceId.split('_').slice(1).join('_');

      // Process one at a time (sequential)
      for (const sample of voiceSamples) {
        const outputPath = path.join(tempDir, `${sample.uuid}.mp3`);

        console.log(`[Azure Worker] Generating [${sample.role}/${sample.cadence}] ${azureVoiceName}: "${sample.text.substring(0, 50)}..."`);

        try {
          const audioBuffer = await generateWithSynthesizer(
            synthesizer,
            sample.text,
            azureVoiceName,
            sample.azureSpeed || 1.0
          );

          await fs.writeFile(outputPath, audioBuffer);

          results.push({
            ...sample,
            success: true,
            outputPath,
            provider: 'azure'
          });

          completed++;
          if (completed % 50 === 0 || completed === total) {
            console.log(`[Azure Worker] Progress: ${completed}/${total} samples (${Math.round(completed/total*100)}%)`);
          }
        } catch (error) {
          console.error(`[Azure Worker] ✗ Failed: ${sample.text.substring(0, 30)}... - ${error.message}`);
          results.push({
            ...sample,
            success: false,
            error: error.message,
            provider: 'azure'
          });
          completed++;
        }
      }

      console.log(`[Azure Worker] Voice ${voiceId} complete: ${completed}/${total}\n`);
    }
  } finally {
    // Always close the synthesizer
    console.log('[Azure Worker] Closing synthesizer connection...');
    synthesizer.close();
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
