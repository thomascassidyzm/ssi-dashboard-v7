#!/usr/bin/env node

/**
 * Phase 7: Course Manifest Compilation Server
 *
 * Port: 3461
 *
 * Compiles all phase outputs into final course manifest with:
 * - Seed pairs (Phase 1)
 * - LEGO pairs (Phase 3)
 * - Practice baskets (Phase 5)
 * - Introductions (Phase 6)
 * - Deterministic UUIDs
 * - Spanish encouragements
 * - Duration metadata
 *
 * Output: {courseCode}_668seeds_final.json
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3461;
const SERVICE_NAME = process.env.SERVICE_NAME || 'Phase 7 (Manifest)';
const VFS_ROOT = process.env.VFS_ROOT || path.join(__dirname, '../../public/vfs/courses');
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';

app.use(express.json());

// Active jobs tracking
const activeJobs = new Map();

// Role-specific UUID segments (SSi legacy format)
const ROLE_SEGMENTS = {
  'target1': { seg3: 'AC07', seg4: '8F4E' },  // Primary target voice
  'target2': { seg3: 'E115', seg4: '8F4E' },  // Alternate target voice
  'source':  { seg3: '36CD', seg4: '31D4' }   // Source language voice
};

/**
 * Generate deterministic UUID for audio samples
 * Format: XXXXXXXX-6044-YYYY-ZZZZ-XXXXXXXXXXXX
 */
function generateSampleUUID(text, language, role, cadence = 'natural') {
  const input = `${text}|${language}|${role}|${cadence}`;
  const hash = crypto.createHash('sha1').update(input).digest('hex');

  const segments = ROLE_SEGMENTS[role];
  if (!segments) {
    throw new Error(`Unknown role: ${role}. Must be: target1, target2, or source`);
  }

  return `${hash.substring(0, 8).toUpperCase()}-6044-${segments.seg3}-${segments.seg4}-${hash.substring(hash.length - 12).toUpperCase()}`;
}

/**
 * Create language node (legacy format with empty tokens/lemmas)
 */
function createLanguageNode(text) {
  return {
    tokens: [],
    text: text,
    lemmas: []
  };
}

/**
 * Register audio sample and return UUID
 */
function registerSample(sampleRegistry, text, role, lang) {
  const key = `${text}|${role}`;

  if (!sampleRegistry.has(key)) {
    const uuid = generateSampleUUID(text, lang, role);
    sampleRegistry.set(key, {
      uuid: uuid,
      text: text,
      role: role,
      lang: lang
    });
  }

  return sampleRegistry.get(key).uuid;
}

/**
 * Compile course manifest
 */
async function compileManifest(courseDir, courseCode) {
  console.log(`[Phase 7] Compiling manifest for ${courseCode}`);

  // Load input files
  const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
  const basketsPath = path.join(courseDir, 'lego_baskets.json');
  const introductionsPath = path.join(courseDir, 'introductions.json');

  if (!await fs.pathExists(seedPairsPath)) {
    throw new Error('seed_pairs.json not found - Phase 1 must complete first');
  }
  if (!await fs.pathExists(legoPairsPath)) {
    throw new Error('lego_pairs.json not found - Phase 3 must complete first');
  }
  if (!await fs.pathExists(basketsPath)) {
    throw new Error('lego_baskets.json not found - Phase 5 must complete first');
  }
  if (!await fs.pathExists(introductionsPath)) {
    throw new Error('introductions.json not found - Phase 6 must complete first');
  }

  const seedPairs = await fs.readJson(seedPairsPath);
  const legoPairs = await fs.readJson(legoPairsPath);
  const baskets = await fs.readJson(basketsPath);
  const introductions = await fs.readJson(introductionsPath);

  console.log(`[Phase 7] Loaded phase outputs:`);
  console.log(`  - Seed pairs: ${Object.keys(seedPairs.translations).length}`);
  console.log(`  - LEGO seeds: ${legoPairs.seeds.length}`);
  console.log(`  - Baskets: ${Object.keys(baskets.baskets).length}`);
  console.log(`  - Introductions: ${Object.keys(introductions.presentations).length}`);

  // Extract language codes from courseCode (e.g., spa_for_eng → spa, eng)
  const [target, , known] = courseCode.split('_');

  // Create sample registry
  const sampleRegistry = new Map();

  // Build manifest structure
  const manifest = {
    id: `${target}-${known}`,
    version: seedPairs.version || '7.7.0',
    target: target,
    known: known,
    slices: [{
      id: uuidv4().toUpperCase(),
      version: seedPairs.version || '7.7.0',
      seeds: [],
      samples: {}
    }]
  };

  const slice = manifest.slices[0];

  // Process each seed
  console.log(`[Phase 7] Processing seeds and LEGOs...`);
  let processedSeeds = 0;
  let processedLegos = 0;
  let processedPhrases = 0;

  for (const seedData of legoPairs.seeds) {
    const seedId = seedData.seed_id;
    const translation = seedPairs.translations[seedId];

    if (!translation) {
      console.warn(`[Phase 7] ⚠️  No translation found for seed ${seedId}`);
      continue;
    }

    const knownSeed = translation.known;
    const targetSeed = translation.target;

    const seedUuid = uuidv4().toUpperCase();

    const seed = {
      id: seedUuid,
      node: {
        id: seedUuid,
        target: createLanguageNode(targetSeed),
        known: createLanguageNode(knownSeed)
      },
      seedSentence: {
        canonical: knownSeed
      },
      introductionItems: []
    };

    // Register seed samples
    registerSample(sampleRegistry, targetSeed, 'target1', target);
    registerSample(sampleRegistry, targetSeed, 'target2', target);
    registerSample(sampleRegistry, knownSeed, 'source', known);

    // Process LEGOs for this seed (only new=true LEGOs)
    for (const lego of seedData.legos) {
      if (!lego.new) continue;

      const legoId = lego.id;
      const basket = baskets.baskets[legoId];
      const presentation = introductions.presentations[legoId];

      if (!basket) {
        console.warn(`[Phase 7] ⚠️  Missing basket for ${legoId}`);
        continue;
      }

      if (!presentation) {
        console.warn(`[Phase 7] ⚠️  Missing presentation for ${legoId}`);
        continue;
      }

      const itemUuid = uuidv4().toUpperCase();

      const item = {
        id: itemUuid,
        node: {
          id: itemUuid,
          target: createLanguageNode(lego.lego.target),
          known: createLanguageNode(lego.lego.known)
        },
        presentation: presentation,
        nodes: []
      };

      // Register LEGO samples
      registerSample(sampleRegistry, lego.lego.target, 'target1', target);
      registerSample(sampleRegistry, lego.lego.target, 'target2', target);
      registerSample(sampleRegistry, lego.lego.known, 'source', known);

      // Register presentation text as source language audio
      registerSample(sampleRegistry, presentation, 'source', known);

      // Add practice phrases from basket
      const practicePhrasesArray = basket.practice_phrases || [];

      for (const phrase of practicePhrasesArray) {
        const targetPhrase = phrase.target;
        const knownPhrase = phrase.known;

        const phraseUuid = uuidv4().toUpperCase();

        item.nodes.push({
          id: phraseUuid,
          target: createLanguageNode(targetPhrase),
          known: createLanguageNode(knownPhrase)
        });

        // Register practice phrase samples
        registerSample(sampleRegistry, targetPhrase, 'target1', target);
        registerSample(sampleRegistry, targetPhrase, 'target2', target);
        registerSample(sampleRegistry, knownPhrase, 'source', known);

        processedPhrases++;
      }

      seed.introductionItems.push(item);
      processedLegos++;
    }

    slice.seeds.push(seed);
    processedSeeds++;

    if (processedSeeds % 50 === 0) {
      console.log(`[Phase 7]   Progress: ${processedSeeds}/${legoPairs.seeds.length} seeds...`);
    }
  }

  console.log(`[Phase 7] ✓ Compiled ${processedSeeds} seeds with ${processedLegos} LEGOs and ${processedPhrases} practice phrases`);

  // Build samples object (keyed by phrase text)
  console.log(`[Phase 7] Building audio sample registry...`);

  const samplesObject = {};

  for (const [key, sampleInfo] of sampleRegistry) {
    const text = sampleInfo.text;

    if (!samplesObject[text]) {
      samplesObject[text] = [];
    }

    samplesObject[text].push({
      id: sampleInfo.uuid,
      cadence: 'natural',
      role: sampleInfo.role,
      duration: 0  // To be populated by Phase 8
    });
  }

  slice.samples = samplesObject;

  const uniqueTexts = Object.keys(samplesObject).length;
  const totalSamples = sampleRegistry.size;

  console.log(`[Phase 7] ✓ Registered ${uniqueTexts} unique texts`);
  console.log(`[Phase 7] ✓ Total audio samples: ${totalSamples} (including target1, target2, source variants)`);

  // Write output
  const outputFilename = `${courseCode}_${processedSeeds}seeds_final.json`;
  const outputPath = path.join(courseDir, outputFilename);

  console.log(`[Phase 7] Writing manifest to disk: ${outputFilename}`);

  await fs.writeJson(outputPath, manifest, { spaces: 2 });

  const stats = await fs.stat(outputPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

  console.log(`[Phase 7] ✅ Course manifest compiled successfully!`);
  console.log(`[Phase 7]    File: ${outputFilename}`);
  console.log(`[Phase 7]    Size: ${sizeMB} MB`);
  console.log(`[Phase 7]    Seeds: ${processedSeeds}`);
  console.log(`[Phase 7]    LEGOs: ${processedLegos}`);
  console.log(`[Phase 7]    Practice phrases: ${processedPhrases}`);
  console.log(`[Phase 7]    Audio samples: ${totalSamples}`);

  return {
    outputFile: outputFilename,
    sizeMB: parseFloat(sizeMB),
    seedCount: processedSeeds,
    legoCount: processedLegos,
    phraseCount: processedPhrases,
    sampleCount: totalSamples
  };
}

// ===============================================
// API ENDPOINTS
// ===============================================

app.post('/start', async (req, res) => {
  const { courseCode } = req.body;

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode is required' });
  }

  // Check if job already running
  if (activeJobs.has(courseCode)) {
    return res.status(409).json({
      error: `Phase 7 job already running for ${courseCode}`,
      status: activeJobs.get(courseCode)
    });
  }

  console.log(`[Phase 7] Starting manifest compilation for ${courseCode}`);

  const courseDir = path.join(VFS_ROOT, courseCode);

  // Create job state
  const job = {
    courseCode,
    status: 'compiling',
    startedAt: new Date().toISOString(),
    error: null,
    progress: 0
  };

  activeJobs.set(courseCode, job);

  // Run compilation asynchronously
  compileManifest(courseDir, courseCode)
    .then(async result => {
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.result = result;
      job.progress = 100;
      console.log(`[Phase 7] ✅ Completed for ${courseCode}`);

      // Notify orchestrator that Phase 7 is complete
      try {
        await axios.post(`${ORCHESTRATOR_URL}/phase-complete`, {
          phase: 7,
          courseCode: courseCode,
          status: 'completed',
          result: result
        });
        console.log(`[Phase 7] Notified orchestrator of completion`);
      } catch (error) {
        console.error(`[Phase 7] Failed to notify orchestrator:`, error.message);
      }

      // Clean up after 5 minutes
      setTimeout(() => activeJobs.delete(courseCode), 5 * 60 * 1000);
    })
    .catch(async error => {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date().toISOString();
      console.error(`[Phase 7] ❌ Failed for ${courseCode}:`, error.message);

      // Notify orchestrator of failure
      try {
        await axios.post(`${ORCHESTRATOR_URL}/phase-complete`, {
          phase: 7,
          courseCode: courseCode,
          status: 'failed',
          error: error.message
        });
      } catch (notifyError) {
        console.error(`[Phase 7] Failed to notify orchestrator:`, notifyError.message);
      }

      // Clean up after 5 minutes
      setTimeout(() => activeJobs.delete(courseCode), 5 * 60 * 1000);
    });

  res.json({
    success: true,
    courseCode,
    message: `Phase 7 manifest compilation started for ${courseCode}`,
    status: job.status
  });
});

app.get('/status/:courseCode', (req, res) => {
  const { courseCode } = req.params;
  const job = activeJobs.get(courseCode);

  if (!job) {
    return res.status(404).json({ error: `No Phase 7 job found for ${courseCode}` });
  }

  res.json(job);
});

app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    status: 'healthy',
    port: PORT,
    activeJobs: activeJobs.size
  });
});

app.listen(PORT, () => {
  console.log(`✅ ${SERVICE_NAME} listening on port ${PORT}`);
});
