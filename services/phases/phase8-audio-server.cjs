#!/usr/bin/env node

/**
 * Phase 8: Audio/TTS Server
 *
 * Wraps Kai's comprehensive audio generation orchestrator
 * Port: 3465
 *
 * Features:
 * - Two-phase generation (Phase A: targets/source, Phase B: presentations)
 * - QC checkpoints before processing/upload
 * - Azure TTS + ElevenLabs support
 * - S3 upload with Master Audio Registry (MAR)
 * - Welcome + Encouragement handling
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3465;
const SERVICE_NAME = process.env.SERVICE_NAME || 'Phase 8 (Audio)';

// Import Kai's audio generation orchestrator
const audioOrchestrator = require('../../scripts/phase8-audio-generation.cjs');

// Enable CORS for all origins (adjust as needed)
app.use(cors());

app.use(express.json());

// Active job tracking
const activeJobs = new Map();

/**
 * Start audio generation for a course
 *
 * POST /start
 * Body: {
 *   courseCode: "spa_for_eng",
 *   options: {
 *     phase: "auto",        // "targets", "presentations", or "auto"
 *     skipUpload: false,    // Skip S3 upload (for testing)
 *     skipQC: false,        // Skip QC pause (auto-approve)
 *     uploadBucket: "stage" // "stage" or "prod"
 *   }
 * }
 */
app.post('/start', async (req, res) => {
  const { courseCode, options = {} } = req.body;

  if (!courseCode) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: courseCode'
    });
  }

  // Check if job already running
  if (activeJobs.has(courseCode)) {
    return res.status(409).json({
      success: false,
      error: `Audio generation already in progress for ${courseCode}`
    });
  }

  console.log(`\n[Phase 8] Starting audio generation for ${courseCode}`);
  console.log(`[Phase 8] Options:`, JSON.stringify(options, null, 2));

  // Start job (non-blocking)
  const jobId = `${courseCode}-${Date.now()}`;
  const jobState = {
    courseCode,
    jobId,
    status: 'running',
    startedAt: new Date().toISOString(),
    options
  };

  activeJobs.set(courseCode, jobState);

  // Run audio generation in background
  audioOrchestrator.generateAudioForCourse(courseCode, options)
    .then(result => {
      jobState.status = result.success ? 'complete' : 'failed';
      jobState.completedAt = new Date().toISOString();
      jobState.result = result;

      console.log(`\n[Phase 8] Audio generation ${result.success ? 'complete' : 'failed'} for ${courseCode}`);

      // Notify orchestrator of completion
      if (result.success) {
        notifyOrchestrator(courseCode, 8, { success: true, ...result });
      }
    })
    .catch(error => {
      jobState.status = 'failed';
      jobState.completedAt = new Date().toISOString();
      jobState.error = error.message;

      console.error(`\n[Phase 8] Error in audio generation for ${courseCode}:`, error);
    })
    .finally(() => {
      // Keep job in memory for status queries (cleanup after 1 hour)
      setTimeout(() => activeJobs.delete(courseCode), 3600000);
    });

  // Return immediately with job ID
  res.json({
    success: true,
    message: `Audio generation started for ${courseCode}`,
    jobId,
    courseCode,
    phase: options.phase || 'auto'
  });
});

/**
 * Get status of audio generation job
 *
 * GET /status/:courseCode
 */
app.get('/status/:courseCode', (req, res) => {
  const { courseCode } = req.params;

  const job = activeJobs.get(courseCode);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: `No active or recent job found for ${courseCode}`
    });
  }

  res.json({
    success: true,
    job: {
      courseCode: job.courseCode,
      jobId: job.jobId,
      status: job.status,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      result: job.result,
      error: job.error
    }
  });
});

/**
 * Continue Phase A processing after QC approval
 *
 * POST /continue-phase-a
 * Body: { courseCode: "spa_for_eng", options: {...} }
 */
app.post('/continue-phase-a', async (req, res) => {
  const { courseCode, options = {} } = req.body;

  if (!courseCode) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: courseCode'
    });
  }

  try {
    console.log(`\n[Phase 8] Continuing Phase A processing for ${courseCode}`);

    const result = await audioOrchestrator.continuePhaseAProcessing(courseCode, options);

    res.json({
      success: true,
      message: 'Phase A processing complete',
      result
    });
  } catch (error) {
    console.error(`[Phase 8] Error in Phase A processing:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Regenerate specific samples by UUID
 *
 * POST /regenerate
 * Body: {
 *   courseCode: "spa_for_eng",
 *   uuids: ["uuid1", "uuid2"],
 *   options: {...}
 * }
 */
app.post('/regenerate', async (req, res) => {
  const { courseCode, uuids, options = {} } = req.body;

  if (!courseCode || !uuids || !Array.isArray(uuids)) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: courseCode, uuids (array)'
    });
  }

  try {
    console.log(`\n[Phase 8] Regenerating ${uuids.length} samples for ${courseCode}`);

    const result = await audioOrchestrator.regenerateSamples(courseCode, uuids, options);

    res.json({
      success: true,
      message: `Regenerated ${result.regenerated} samples`,
      result
    });
  } catch (error) {
    console.error(`[Phase 8] Error regenerating samples:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get voice assignments for a course
 *
 * GET /voices/:courseCode
 */
app.get('/voices/:courseCode', async (req, res) => {
  const { courseCode } = req.params;

  try {
    const assignments = await audioOrchestrator.getVoiceAssignments(courseCode);
    res.json({
      success: true,
      courseCode,
      voices: assignments
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Discover and assign voices for a new course
 *
 * POST /voices/discover
 * Body: {
 *   courseCode: "spa_for_eng",
 *   targetLanguage: "spa",
 *   knownLanguage: "eng"
 * }
 */
app.post('/voices/discover', async (req, res) => {
  const { courseCode, targetLanguage, knownLanguage = 'eng' } = req.body;

  if (!courseCode || !targetLanguage) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: courseCode, targetLanguage'
    });
  }

  try {
    const result = await audioOrchestrator.discoverAndAssignVoices(
      courseCode,
      targetLanguage,
      knownLanguage
    );

    res.json({
      success: true,
      message: 'Voice discovery complete. Review output and assign voices.',
      availableVoices: result.availableVoices,
      recommended: result.recommended
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    status: 'running',
    port: PORT,
    features: {
      twoPhaseGeneration: true,
      qcCheckpoints: true,
      azureTTS: true,
      elevenLabs: true,
      s3Upload: true,
      mar: true,
      welcomes: true,
      encouragements: true
    }
  });
});

/**
 * Notify orchestrator of phase completion
 */
async function notifyOrchestrator(courseCode, phase, result) {
  const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';

  try {
    const fetch = require('node-fetch');
    await fetch(`${orchestratorUrl}/api/phase-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseCode,
        phase,
        result
      })
    });
    console.log(`[Phase 8] Notified orchestrator: ${courseCode} phase ${phase} complete`);
  } catch (error) {
    console.error(`[Phase 8] Failed to notify orchestrator:`, error.message);
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`✅ ${SERVICE_NAME} listening on port ${PORT}`);
  console.log(`   Features: Azure TTS, ElevenLabs, S3 Upload, MAR, QC Gates`);
  console.log(`   Kai's Audio Orchestrator: Ready`);
});
