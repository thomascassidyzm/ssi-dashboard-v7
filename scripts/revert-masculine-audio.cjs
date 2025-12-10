#!/usr/bin/env node

/**
 * Revert Masculine Audio
 *
 * Regenerates MASCULINE Spanish audio for phrases that were incorrectly changed
 * to feminine (because the English uses male pronouns like "he", "his", "boy").
 *
 * Usage:
 *   node scripts/revert-masculine-audio.cjs spa_for_eng --plan
 *   node scripts/revert-masculine-audio.cjs spa_for_eng --execute
 */

require('dotenv').config();

const fs = require('fs-extra');
const path = require('path');
const sdk = require('microsoft-cognitiveservices-speech-sdk');

// Services
const s3Service = require('../services/s3-service.cjs');
const audioProcessor = require('../services/audio-processor.cjs');

// Configuration
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'westeurope';
const VOICE_ID = 'azure_es-ES-TrianaNeural';
const AZURE_VOICE_NAME = 'es-ES-TrianaNeural';
const AZURE_SPEED = 0.7; // slow cadence
const TARGET_LUFS = -16.0;

// Paths
const MAR_PATH = path.join(__dirname, '../samples_database/voices', VOICE_ID, 'samples.json');
const MANIFEST_PATH = 'public/vfs/courses/spa_for_eng/course_manifest.json';
const TEMP_DIR = path.join(__dirname, '../temp');

// Rate limiting for Azure
const MIN_REQUEST_INTERVAL = 5;
let lastRequestTime = 0;

/**
 * Normalize text for matching
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text.toLowerCase().trim().replace(/^[,.\\s]+|[,.\\s]+$/g, '').replace(/\s+/g, ' ');
}

/**
 * Load manifest and find phrases where English has male pronouns
 */
async function findPhrasesToRevert() {
  const manifest = await fs.readJson(MANIFEST_PATH);

  // Load all CSVs to get the changed phrases
  const csvFiles = [
    path.join(__dirname, 'feminine-changes.csv'),
    path.join(__dirname, 'feminine-changes-seeds.csv'),
    path.join(__dirname, 'feminine-changes-intro.csv')
  ];

  const changedPhrases = new Map();
  for (const csvPath of csvFiles) {
    if (!await fs.pathExists(csvPath)) continue;
    const content = await fs.readFile(csvPath, 'utf8');
    const lines = content.split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const match = line.match(/^"([^"]*)","([^"]*)"$/);
      if (match) {
        changedPhrases.set(normalizeText(match[1]), { original: match[1], feminine: match[2] });
      }
    }
  }

  // Male pronouns pattern
  const malePattern = /\b(he|him|his|he's|he'd|he'll|himself|boy|boys|man|men|guy|guys|son|sons|brother|brothers|father|uncle|grandfather|nephew|boyfriend|husband|male)\b/i;

  const toRevert = new Map();

  for (const slice of manifest.slices || []) {
    for (const seed of slice.seeds || []) {
      const check = (targetText, knownText) => {
        const normalized = normalizeText(targetText);
        const changeData = changedPhrases.get(normalized);
        if (changeData && malePattern.test(knownText) && !toRevert.has(normalized)) {
          toRevert.set(normalized, {
            originalText: changeData.original,  // MASCULINE version to regenerate
            feminineText: changeData.feminine,
            englishText: knownText
          });
        }
      };

      check(seed.node?.target?.text, seed.node?.known?.text);

      for (const item of seed.introduction_items || []) {
        check(item.node?.target?.text, item.node?.known?.text);
        for (const node of item.nodes || []) {
          check(node.target?.text, node.known?.text);
        }
      }
    }
  }

  return toRevert;
}

/**
 * Load MAR and build reverse index: normalizedText → uuid
 */
async function buildMARIndex() {
  if (!await fs.pathExists(MAR_PATH)) {
    throw new Error(`MAR not found: ${MAR_PATH}`);
  }

  const mar = await fs.readJson(MAR_PATH);
  const index = new Map();

  for (const [uuid, sample] of Object.entries(mar.samples || {})) {
    if (sample.role === 'target1' && sample.cadence === 'slow') {
      const normalized = normalizeText(sample.text);
      if (!index.has(normalized)) {
        index.set(normalized, { uuid, text: sample.text });
      }
    }
  }

  return index;
}

/**
 * Build generation tasks by matching phrases to MAR entries
 */
function buildTasks(phrasesToRevert, marIndex) {
  const tasks = [];
  const notFound = [];

  for (const [normalized, data] of phrasesToRevert) {
    const marEntry = marIndex.get(normalized);

    if (marEntry) {
      tasks.push({
        uuid: marEntry.uuid,
        masculineText: data.originalText,  // Generate MASCULINE audio
        feminineText: data.feminineText,
        englishText: data.englishText,
        voiceId: VOICE_ID,
        cadence: 'slow',
        azureSpeed: AZURE_SPEED
      });
    } else {
      notFound.push(data.originalText);
    }
  }

  return { tasks, notFound };
}

/**
 * Escape XML special characters for SSML
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

/**
 * Plan mode
 */
async function runPlan(courseCode) {
  console.log('\n=== REVERT MASCULINE AUDIO - PLAN ===\n');

  console.log('Finding phrases where English has male pronouns...');
  const phrasesToRevert = await findPhrasesToRevert();
  console.log(`  Found ${phrasesToRevert.size} unique phrases to revert\n`);

  console.log('Loading MAR and building index...');
  const marIndex = await buildMARIndex();
  console.log(`  MAR contains ${marIndex.size} target1/slow samples\n`);

  console.log('Matching phrases to MAR entries...');
  const { tasks, notFound } = buildTasks(phrasesToRevert, marIndex);
  console.log(`  Matched: ${tasks.length} phrases`);
  console.log(`  Not found in MAR: ${notFound.length} phrases\n`);

  if (notFound.length > 0 && notFound.length <= 10) {
    console.log('Not found in MAR:');
    notFound.forEach(text => console.log(`  - "${text.substring(0, 60)}..."`));
    console.log();
  }

  // Cost estimate
  const totalChars = tasks.reduce((sum, t) => sum + t.masculineText.length, 0);
  console.log('=== COST ESTIMATE ===');
  console.log(`  Total phrases: ${tasks.length}`);
  console.log(`  Total characters: ${totalChars.toLocaleString()}`);
  console.log(`  Azure F0 free tier: 500,000 chars/month`);
  console.log(`  This generation: ${(totalChars / 500000 * 100).toFixed(1)}% of free tier\n`);

  // Sample
  if (tasks.length > 0) {
    console.log('=== SAMPLE TASKS (first 5) ===');
    tasks.slice(0, 5).forEach((task, i) => {
      console.log(`${i + 1}. UUID: ${task.uuid}`);
      console.log(`   Masculine: "${task.masculineText.substring(0, 50)}..."`);
      console.log(`   English: "${task.englishText.substring(0, 50)}..."`);
      console.log();
    });
  }

  console.log('To execute, run:');
  console.log(`  node scripts/revert-masculine-audio.cjs ${courseCode} --execute\n`);
}

/**
 * Execute mode
 */
async function runExecute(courseCode) {
  console.log('\n=== REVERT MASCULINE AUDIO - EXECUTE ===\n');

  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    console.error('Missing AZURE_SPEECH_KEY or AZURE_SPEECH_REGION');
    process.exit(1);
  }

  console.log('Finding phrases to revert...');
  const phrasesToRevert = await findPhrasesToRevert();
  console.log(`  Found ${phrasesToRevert.size} phrases\n`);

  console.log('Loading MAR...');
  const marIndex = await buildMARIndex();
  console.log(`  MAR contains ${marIndex.size} target1/slow samples\n`);

  console.log('Matching phrases to MAR entries...');
  const { tasks, notFound } = buildTasks(phrasesToRevert, marIndex);
  console.log(`  Matched: ${tasks.length} phrases`);
  console.log(`  Not found: ${notFound.length} phrases\n`);

  if (tasks.length === 0) {
    console.log('No tasks to execute.');
    return;
  }

  // Setup directories
  const rawDir = path.join(TEMP_DIR, courseCode, 'revert', 'raw');
  const processedDir = path.join(TEMP_DIR, courseCode, 'revert', 'processed');
  await fs.ensureDir(rawDir);
  await fs.ensureDir(processedDir);

  // Create synthesizer
  console.log('Creating Azure synthesizer...');
  const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
  speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz96KBitRateMonoMp3;
  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);
  console.log('  Synthesizer ready\n');

  const results = {
    generated: 0,
    processed: 0,
    uploaded: 0,
    failed: []
  };

  try {
    console.log(`=== GENERATING ${tasks.length} MASCULINE SAMPLES ===\n`);

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const rawPath = path.join(rawDir, `${task.uuid}.mp3`);
      const processedPath = path.join(processedDir, `${task.uuid}.mp3`);

      if ((i + 1) % 20 === 0 || i === 0 || i === tasks.length - 1) {
        console.log(`Progress: ${i + 1}/${tasks.length} (${Math.round((i + 1) / tasks.length * 100)}%)`);
      }

      try {
        // Skip if already processed
        if (await fs.pathExists(processedPath)) {
          results.generated++;
          results.processed++;
          continue;
        }

        // Generate MASCULINE audio
        const audioBuffer = await generateWithSynthesizer(
          synthesizer,
          task.masculineText,  // Use MASCULINE text
          AZURE_VOICE_NAME,
          task.azureSpeed
        );
        await fs.writeFile(rawPath, audioBuffer);
        results.generated++;

        // Process (normalize)
        await audioProcessor.processAudio(rawPath, processedPath, {
          normalize: true,
          timeStretch: 1.0,
          targetLUFS: TARGET_LUFS
        });
        results.processed++;

      } catch (error) {
        console.error(`Failed: ${task.uuid} - ${error.message}`);
        results.failed.push({ uuid: task.uuid, text: task.masculineText, error: error.message });
      }
    }
  } finally {
    console.log('\nClosing synthesizer...');
    synthesizer.close();
  }

  console.log(`\nGeneration complete: ${results.generated}/${tasks.length}`);
  console.log(`Processing complete: ${results.processed}/${tasks.length}`);
  console.log(`Failed: ${results.failed.length}\n`);

  // Upload to S3
  if (results.processed > 0) {
    console.log('=== UPLOADING TO S3 ===\n');

    const processedFiles = await fs.readdir(processedDir);
    const mp3Files = processedFiles.filter(f => f.endsWith('.mp3'));
    console.log(`Found ${mp3Files.length} processed files to upload\n`);

    let uploaded = 0;
    for (const file of mp3Files) {
      const uuid = path.basename(file, '.mp3');
      const filePath = path.join(processedDir, file);

      try {
        await s3Service.uploadAudioFile(uuid, filePath);
        uploaded++;

        if (uploaded % 50 === 0 || uploaded === mp3Files.length) {
          console.log(`Uploaded: ${uploaded}/${mp3Files.length}`);
        }
      } catch (error) {
        console.error(`Upload failed: ${uuid} - ${error.message}`);
      }
    }

    results.uploaded = uploaded;
    console.log(`\nUpload complete: ${uploaded}/${mp3Files.length}\n`);
  }

  // Summary
  console.log('=== SUMMARY ===');
  console.log(`  Generated: ${results.generated}`);
  console.log(`  Processed: ${results.processed}`);
  console.log(`  Uploaded: ${results.uploaded}`);
  console.log(`  Failed: ${results.failed.length}`);
  console.log();
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const courseCode = args[0];
  const mode = args[1];

  if (!courseCode || !mode) {
    console.log('Usage:');
    console.log('  node scripts/revert-masculine-audio.cjs <courseCode> --plan');
    console.log('  node scripts/revert-masculine-audio.cjs <courseCode> --execute');
    process.exit(1);
  }

  if (mode === '--plan') {
    await runPlan(courseCode);
  } else if (mode === '--execute') {
    await runExecute(courseCode);
  } else {
    console.error(`Unknown mode: ${mode}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
