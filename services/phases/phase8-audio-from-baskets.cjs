/**
 * Phase 8: Audio Generation from Lego Baskets
 *
 * Generates audio samples from lego_baskets.json input.
 * Audio is content-addressed (UUID from voice+text), enabling cross-course reuse.
 *
 * Flow:
 * 1. Read lego_baskets.json
 * 2. Extract unique texts (known + target from all practice_phrases)
 * 3. Generate deterministic UUIDs from text+voice parameters
 * 4. Check Supabase for existing audio (skip if exists)
 * 5. Generate missing audio via TTS (Azure/ElevenLabs)
 * 6. Store in S3 and register in Supabase
 *
 * Port: 3465
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const createLogger = require('../../services/shared/logger.cjs');
const uuidService = require('../../services/uuid-v11.cjs');
const supabaseClient = require('../../services/supabase-client.cjs');
const genderExpansion = require('../../services/gender-expansion-service.cjs');
const { findBaskets, findVoiceAssignments } = require('../../services/data-finders.cjs');

const logger = createLogger('Phase8-Baskets');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PHASE8_PORT || 3465;
// VFS_ROOT can point to either /public/vfs or /public/vfs/courses
// We normalize to point at the courses directory
const VFS_ROOT = process.env.VFS_ROOT?.endsWith('/courses')
  ? process.env.VFS_ROOT
  : path.join(process.env.VFS_ROOT || path.join(__dirname, '../../public/vfs'), 'courses');

// Active generation jobs
const activeJobs = new Map();

/**
 * Load lego_baskets.json for a course
 * Uses data-finders for resilient data extraction
 */
async function loadLegoBaskets(courseCode) {
  const basketsPath = path.join(VFS_ROOT, courseCode, 'lego_baskets.json');

  if (!await fs.pathExists(basketsPath)) {
    throw new Error(`lego_baskets.json not found for course: ${courseCode}`);
  }

  const data = await fs.readJson(basketsPath);
  const baskets = findBaskets(data);

  if (!baskets) {
    throw new Error(`Could not find baskets in lego_baskets.json for course: ${courseCode}`);
  }

  return baskets;
}

/**
 * Load voice assignments for a course
 * Uses data-finders for resilient data extraction
 */
async function loadVoiceAssignmentsForCourse(courseCode) {
  // voices.json is in canonical folder, not per-course
  const voicesPath = path.join(VFS_ROOT, '../canonical/voices.json');

  if (!await fs.pathExists(voicesPath)) {
    throw new Error('voices.json not found');
  }

  const registry = await fs.readJson(voicesPath);
  const assignments = findVoiceAssignments(registry, courseCode);

  if (!assignments) {
    throw new Error(`No voice assignments found for course: ${courseCode}`);
  }

  return assignments;
}

/**
 * Extract unique text samples from lego_baskets
 * Returns Map<normalizedText, { text, lang, roles }>
 */
function extractUniqueSamples(baskets, courseCode) {
  const [targetLang, knownLang] = courseCode.split('_for_');
  const samples = new Map();

  for (const [basketId, basket] of Object.entries(baskets)) {
    // Add lego known/target
    if (basket.lego) {
      addSample(samples, basket.lego.known, knownLang.substring(0, 3), 'source');
      addSample(samples, basket.lego.target, targetLang.substring(0, 3), 'target1');
      addSample(samples, basket.lego.target, targetLang.substring(0, 3), 'target2');
    }

    // Add practice phrases
    if (basket.practice_phrases) {
      for (const phrase of basket.practice_phrases) {
        addSample(samples, phrase.known, knownLang.substring(0, 3), 'source');
        addSample(samples, phrase.target, targetLang.substring(0, 3), 'target1');
        addSample(samples, phrase.target, targetLang.substring(0, 3), 'target2');
      }
    }
  }

  return samples;
}

/**
 * Add a sample to the map, deduplicating by normalized text+lang
 */
function addSample(samples, text, lang, role) {
  if (!text) return;

  const normalized = uuidService.normalizeText(text);
  const key = `${lang}:${normalized}`;

  if (!samples.has(key)) {
    samples.set(key, {
      text: text,
      normalizedText: normalized,
      lang: lang,
      roles: new Set()
    });
  }

  samples.get(key).roles.add(role);
}

/**
 * Generate sample specifications with UUIDs
 * Each unique text+voice combo gets a UUID
 */
function generateSampleSpecs(samples, voiceAssignments) {
  const specs = [];

  for (const [key, sample] of samples) {
    for (const role of sample.roles) {
      const voiceId = voiceAssignments[role];
      if (!voiceId) {
        logger.warn(`No voice assigned for role: ${role}`);
        continue;
      }

      const cadence = uuidService.getCadenceForRole(role);

      // Apply gender expansion for target roles
      let ttsText = sample.text;
      if (role === 'target1' || role === 'target2') {
        ttsText = genderExpansion.expandForVoice(sample.text, voiceId, role);
      }

      // Strip parenthetical notes so TTS doesn't read them aloud
      ttsText = ttsText.replace(/\s*\([^)]*\)/g, '').trim();

      const uuid = uuidService.generateSampleId(
        voiceId,
        ttsText,
        sample.lang,
        role,
        cadence
      );

      specs.push({
        uuid,
        text: sample.text,
        ttsText,  // Text after gender expansion
        normalizedText: sample.normalizedText,
        lang: sample.lang,
        role,
        voiceId,
        cadence
      });
    }
  }

  // Deduplicate by UUID (same voice+text = same UUID)
  const uniqueSpecs = new Map();
  for (const spec of specs) {
    if (!uniqueSpecs.has(spec.uuid)) {
      uniqueSpecs.set(spec.uuid, spec);
    }
  }

  return Array.from(uniqueSpecs.values());
}

/**
 * Check which samples already exist in Supabase
 */
async function checkExistingSamples(specs) {
  if (!supabaseClient.isInitialized()) {
    logger.warn('Supabase not initialized - assuming no existing samples');
    return { existing: [], missing: specs };
  }

  const existing = [];
  const missing = [];

  // Check in batches to avoid overwhelming Supabase
  const batchSize = 100;
  for (let i = 0; i < specs.length; i += batchSize) {
    const batch = specs.slice(i, i + batchSize);
    const uuids = batch.map(s => s.uuid);

    const found = await supabaseClient.checkSamplesExist(uuids);

    for (const spec of batch) {
      if (found.includes(spec.uuid)) {
        existing.push(spec);
      } else {
        missing.push(spec);
      }
    }
  }

  return { existing, missing };
}

/**
 * Generate a plan for audio generation (dry run)
 */
app.post('/plan', async (req, res) => {
  try {
    const { courseCode } = req.body;

    if (!courseCode) {
      return res.status(400).json({ error: 'courseCode required' });
    }

    logger.log(`Planning audio generation for: ${courseCode}`);

    // Load inputs
    const baskets = await loadLegoBaskets(courseCode);
    const voiceAssignments = await loadVoiceAssignmentsForCourse(courseCode);

    // Extract and generate specs
    const samples = extractUniqueSamples(baskets, courseCode);
    const specs = generateSampleSpecs(samples, voiceAssignments);

    // Check existing
    const { existing, missing } = await checkExistingSamples(specs);

    // Estimate costs (rough: $0.015 per 1000 chars for Azure)
    const totalChars = missing.reduce((sum, s) => sum + s.ttsText.length, 0);
    const estimatedCost = (totalChars / 1000) * 0.015;

    const plan = {
      courseCode,
      basketCount: Object.keys(baskets).length,
      uniqueTexts: samples.size,
      totalSamples: specs.length,
      existingSamples: existing.length,
      missingSamples: missing.length,
      estimatedCharacters: totalChars,
      estimatedCostUSD: estimatedCost.toFixed(2),
      voiceAssignments,
      sampleBreakdown: {
        source: specs.filter(s => s.role === 'source').length,
        target1: specs.filter(s => s.role === 'target1').length,
        target2: specs.filter(s => s.role === 'target2').length
      }
    };

    res.json({ success: true, plan });

  } catch (error) {
    logger.error('Plan error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start audio generation
 */
app.post('/generate', async (req, res) => {
  try {
    const { courseCode, options = {} } = req.body;

    if (!courseCode) {
      return res.status(400).json({ error: 'courseCode required' });
    }

    if (activeJobs.has(courseCode)) {
      return res.status(409).json({ error: 'Generation already in progress for this course' });
    }

    logger.log(`Starting audio generation for: ${courseCode}`);

    // Load inputs
    const baskets = await loadLegoBaskets(courseCode);
    const voiceAssignments = await loadVoiceAssignmentsForCourse(courseCode);

    // Extract and generate specs
    const samples = extractUniqueSamples(baskets, courseCode);
    const specs = generateSampleSpecs(samples, voiceAssignments);

    // Check existing
    const { existing, missing } = await checkExistingSamples(specs);

    // Create job
    const job = {
      courseCode,
      status: 'running',
      startedAt: new Date().toISOString(),
      total: missing.length,
      completed: 0,
      failed: 0,
      skipped: existing.length,
      errors: []
    };

    activeJobs.set(courseCode, job);

    // Return immediately, process in background
    res.json({
      success: true,
      message: `Started generation for ${missing.length} samples (${existing.length} already exist)`,
      jobId: courseCode
    });

    // Process in background
    processGeneration(courseCode, missing, job).catch(error => {
      logger.error(`Generation failed for ${courseCode}:`, error);
      job.status = 'failed';
      job.error = error.message;
    });

  } catch (error) {
    logger.error('Generate error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Process a single audio sample
 */
async function processSingleSample(spec, courseCode, azureTTS, s3Service) {
  // ONE CANONICAL RENDERED PACE (Tom's ruling, 2026-08-29): "playback speed is
  // a player concern, not a baked-in render concern". A 'slow' cadence used to
  // bake 0.8x into the MP3, which is exactly what made the same sentence need a
  // second clip for a second role. The player slows it now; the render does not.
  const speed = 1.0;

  // Strip provider prefix from voice ID (e.g., azure_es-ES-TrianaNeural -> es-ES-TrianaNeural)
  const azureVoiceName = spec.voiceId.replace(/^azure_/, '');

  const audioBuffer = await azureTTS.generateSpeech(
    spec.ttsText,
    azureVoiceName,
    spec.lang,
    { rate: speed }
  );

  // Upload to S3 (uploadAudio expects uuid, not full key)
  const s3Result = await s3Service.uploadAudio(spec.uuid, audioBuffer);

  // Register in Supabase
  if (supabaseClient.isInitialized()) {
    await supabaseClient.registerSample({
      uuid: spec.uuid,
      text: spec.text,
      tts_text: spec.ttsText,
      lang: spec.lang,
      role: spec.role,
      voice_id: spec.voiceId,
      cadence: spec.cadence,
      s3_key: s3Result.key,
      s3_bucket: s3Result.bucket,
      course_code: courseCode
    });
  }

  return { success: true, uuid: spec.uuid, text: spec.text, role: spec.role };
}

/**
 * Process audio generation in background with parallel batches
 */
async function processGeneration(courseCode, specs, job) {
  const azureTTS = require('../../services/azure-tts-service.cjs');
  const s3Service = require('../../services/s3-service.cjs');

  const BATCH_SIZE = 10;  // Process 10 samples concurrently

  for (let i = 0; i < specs.length; i += BATCH_SIZE) {
    if (job.status === 'cancelled') {
      break;
    }

    const batch = specs.slice(i, i + BATCH_SIZE);

    // Process batch in parallel
    const results = await Promise.allSettled(
      batch.map(spec => processSingleSample(spec, courseCode, azureTTS, s3Service))
    );

    // Tally results
    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const spec = batch[j];

      if (result.status === 'fulfilled') {
        job.completed++;
        logger.log(`Generated ${spec.uuid} (${spec.role}): "${spec.text.substring(0, 30)}..."`);
      } else {
        job.failed++;
        job.errors.push({
          uuid: spec.uuid,
          text: spec.text,
          error: result.reason?.message || 'Unknown error'
        });
        logger.error(`Failed ${spec.uuid}:`, result.reason?.message);
      }
    }

    // Log batch progress
    const progress = ((job.completed + job.failed) / job.total * 100).toFixed(1);
    logger.log(`Progress: ${job.completed + job.failed}/${job.total} (${progress}%) - ${job.failed} errors`);
  }

  job.status = job.failed > 0 ? 'completed_with_errors' : 'completed';
  job.completedAt = new Date().toISOString();

  logger.log(`Generation complete for ${courseCode}: ${job.completed} succeeded, ${job.failed} failed`);
}

/**
 * Get generation status
 */
app.get('/status/:courseCode', (req, res) => {
  const { courseCode } = req.params;
  const job = activeJobs.get(courseCode);

  if (!job) {
    return res.status(404).json({ error: 'No active job for this course' });
  }

  res.json({
    success: true,
    job: {
      ...job,
      progress: job.total > 0 ? ((job.completed + job.failed) / job.total * 100).toFixed(1) : 0
    }
  });
});

/**
 * Cancel generation
 */
app.delete('/cancel/:courseCode', (req, res) => {
  const { courseCode } = req.params;
  const job = activeJobs.get(courseCode);

  if (!job) {
    return res.status(404).json({ error: 'No active job for this course' });
  }

  job.status = 'cancelled';
  res.json({ success: true, message: 'Cancellation requested' });
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Phase 8 Audio Generator (Baskets)',
    port: PORT,
    supabase: supabaseClient.isInitialized() ? 'connected' : 'not initialized',
    activeJobs: activeJobs.size
  });
});

app.listen(PORT, () => {
  logger.log(`Phase 8 Audio Generator listening on port ${PORT}`);
  logger.log(`VFS Root: ${VFS_ROOT}`);
});
