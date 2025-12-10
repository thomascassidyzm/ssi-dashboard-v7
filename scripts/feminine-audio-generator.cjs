#!/usr/bin/env node

/**
 * Feminine Audio Generator
 *
 * Generates feminine Spanish audio (target1) for phrases that have gendered endings,
 * replacing existing audio files while keeping original UUIDs.
 *
 * Usage:
 *   node scripts/feminine-audio-generator.cjs spa_for_eng --plan
 *   node scripts/feminine-audio-generator.cjs spa_for_eng --execute
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
const SCRIPTS_DIR = __dirname;
const MAR_PATH = path.join(__dirname, '../samples_database/voices', VOICE_ID, 'samples.json');
const TEMP_DIR = path.join(__dirname, '../temp');

// CSV files
const CSV_FILES = [
  path.join(SCRIPTS_DIR, 'feminine-changes.csv'),
  path.join(SCRIPTS_DIR, 'feminine-changes-seeds.csv'),
  path.join(SCRIPTS_DIR, 'feminine-changes-intro.csv')
];

// Rate limiting for Azure
const MIN_REQUEST_INTERVAL = 5;
let lastRequestTime = 0;

/**
 * Normalize text for MAR lookup (matches mar-service.cjs)
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text
    .toLowerCase()
    .trim()
    .replace(/^[,.\s]+|[,.\s]+$/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Simple CSV parser for "Original,Changed" format with quoted values
 */
function parseCSV(content) {
  const lines = content.split('\n');
  const records = [];

  for (let i = 1; i < lines.length; i++) { // Skip header
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted CSV: "value1","value2"
    const match = line.match(/^"([^"]*)","([^"]*)"$/);
    if (match) {
      records.push({ Original: match[1], Changed: match[2] });
    } else {
      // Fallback for unquoted or malformed
      const parts = line.split(',');
      if (parts.length >= 2) {
        records.push({ Original: parts[0], Changed: parts.slice(1).join(',') });
      }
    }
  }

  return records;
}

/**
 * Parse all CSV files and build original→feminine map
 */
async function loadCSVChanges() {
  const changes = new Map();

  for (const csvPath of CSV_FILES) {
    if (!await fs.pathExists(csvPath)) {
      console.log(`Warning: CSV not found: ${csvPath}`);
      continue;
    }

    const content = await fs.readFile(csvPath, 'utf8');
    const records = parseCSV(content);

    for (const record of records) {
      const original = record.Original?.trim();
      const changed = record.Changed?.trim();

      if (original && changed && original !== changed) {
        changes.set(normalizeText(original), {
          original,
          feminine: changed
        });
      }
    }
  }

  return changes;
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
 * Build generation tasks by matching CSV changes to MAR entries
 */
function buildGenerationTasks(changes, marIndex) {
  const tasks = [];
  const notFound = [];

  for (const [normalizedOriginal, data] of changes) {
    const marEntry = marIndex.get(normalizedOriginal);

    if (marEntry) {
      tasks.push({
        uuid: marEntry.uuid,
        originalText: data.original,
        feminineText: data.feminine,
        voiceId: VOICE_ID,
        cadence: 'slow',
        azureSpeed: AZURE_SPEED
      });
    } else {
      notFound.push(data.original);
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
 * Plan mode - show what would be generated
 */
async function runPlan(courseCode) {
  console.log('\n=== FEMININE AUDIO GENERATOR - PLAN ===\n');

  // Load data
  console.log('Loading CSV files...');
  const changes = await loadCSVChanges();
  console.log(`  Found ${changes.size} phrases with feminine changes\n`);

  console.log('Loading MAR and building index...');
  const marIndex = await buildMARIndex();
  console.log(`  MAR contains ${marIndex.size} target1/slow samples\n`);

  // Build tasks
  console.log('Matching changes to MAR entries...');
  const { tasks, notFound } = buildGenerationTasks(changes, marIndex);
  console.log(`  Matched: ${tasks.length} phrases`);
  console.log(`  Not found in MAR: ${notFound.length} phrases\n`);

  if (notFound.length > 0 && notFound.length <= 20) {
    console.log('Not found in MAR:');
    notFound.forEach(text => console.log(`  - "${text.substring(0, 60)}..."`));
    console.log();
  } else if (notFound.length > 20) {
    console.log(`Not found in MAR (showing first 20 of ${notFound.length}):`);
    notFound.slice(0, 20).forEach(text => console.log(`  - "${text.substring(0, 60)}..."`));
    console.log();
  }

  // Cost estimate
  const totalChars = tasks.reduce((sum, t) => sum + t.feminineText.length, 0);
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
      console.log(`   Original: "${task.originalText.substring(0, 50)}..."`);
      console.log(`   Feminine: "${task.feminineText.substring(0, 50)}..."`);
      console.log();
    });
  }

  console.log('To execute, run:');
  console.log(`  node scripts/feminine-audio-generator.cjs ${courseCode} --execute\n`);
}

/**
 * Execute mode - generate, process, and upload audio
 */
async function runExecute(courseCode) {
  console.log('\n=== FEMININE AUDIO GENERATOR - EXECUTE ===\n');

  // Validate credentials
  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    console.error('Missing AZURE_SPEECH_KEY or AZURE_SPEECH_REGION');
    process.exit(1);
  }

  // Load data
  console.log('Loading CSV files...');
  const changes = await loadCSVChanges();
  console.log(`  Found ${changes.size} phrases\n`);

  console.log('Loading MAR and building index...');
  const marIndex = await buildMARIndex();
  console.log(`  MAR contains ${marIndex.size} target1/slow samples\n`);

  // Build tasks
  console.log('Matching changes to MAR entries...');
  const { tasks, notFound } = buildGenerationTasks(changes, marIndex);
  console.log(`  Matched: ${tasks.length} phrases`);
  console.log(`  Not found: ${notFound.length} phrases\n`);

  if (tasks.length === 0) {
    console.log('No tasks to execute.');
    return;
  }

  // Setup directories
  const rawDir = path.join(TEMP_DIR, courseCode, 'target1', 'slow');
  const processedDir = path.join(TEMP_DIR, courseCode, 'target1', 'slow_processed');
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
    // Generate audio
    console.log(`=== GENERATING ${tasks.length} SAMPLES ===\n`);

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const rawPath = path.join(rawDir, `${task.uuid}.mp3`);
      const processedPath = path.join(processedDir, `${task.uuid}.mp3`);

      // Progress
      if ((i + 1) % 50 === 0 || i === 0 || i === tasks.length - 1) {
        console.log(`Progress: ${i + 1}/${tasks.length} (${Math.round((i + 1) / tasks.length * 100)}%)`);
      }

      try {
        // Skip if already exists
        if (await fs.pathExists(processedPath)) {
          results.generated++;
          results.processed++;
          continue;
        }

        // Generate
        const audioBuffer = await generateWithSynthesizer(
          synthesizer,
          task.feminineText,
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
        results.failed.push({ uuid: task.uuid, text: task.feminineText, error: error.message });
      }
    }
  } finally {
    console.log('\nClosing synthesizer...');
    synthesizer.close();
  }

  console.log(`\nGeneration complete: ${results.generated}/${tasks.length}`);
  console.log(`Processing complete: ${results.processed}/${tasks.length}`);
  console.log(`Failed: ${results.failed.length}\n`);

  if (results.failed.length > 0) {
    console.log('Failed samples:');
    results.failed.slice(0, 10).forEach(f => console.log(`  - ${f.uuid}: ${f.error}`));
    if (results.failed.length > 10) {
      console.log(`  ... and ${results.failed.length - 10} more`);
    }
    console.log();
  }

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

        if (uploaded % 100 === 0 || uploaded === mp3Files.length) {
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
    console.log('  node scripts/feminine-audio-generator.cjs <courseCode> --plan');
    console.log('  node scripts/feminine-audio-generator.cjs <courseCode> --execute');
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
