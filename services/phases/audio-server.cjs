#!/usr/bin/env node

/**
 * Phase 8: Audio/TTS Server
 *
 * Wraps Kai's comprehensive audio generation orchestrator
 * Port: 3465
 *
 * Endpoints:
 *   POST /plan              - Run preflight + show generation plan (REQUIRES APPROVAL)
 *   POST /start             - Start audio generation (after plan approval)
 *   POST /continue          - Continue after QC checkpoint
 *   POST /regenerate        - Regenerate specific samples
 *   GET  /status/:courseCode - Get job status
 *   GET  /voices/:courseCode - Get voice assignments
 *   POST /voices/discover   - Discover voices for new course
 *   GET  /health            - Health check
 *
 * Workflow (matches AUDIO_GENERATION_WORKFLOW.md):
 *   1. POST /plan           → Review costs, approve
 *   2. POST /start          → Phase A generation (targets/source)
 *   3. [QC checkpoint]      → Review samples
 *   4. POST /continue       → Phase A processing + Phase B (presentations)
 *   5. [Auto: encouragements, welcome]
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

// Plan cache - avoids re-running 65k UUID checks on every page load
// Cache expires after 5 minutes (S3 state can change)
const planCache = new Map();
const PLAN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedPlan(courseCode) {
  const cached = planCache.get(courseCode);
  if (cached && (Date.now() - cached.timestamp) < PLAN_CACHE_TTL) {
    console.log(`[Phase 8] Using cached plan for ${courseCode} (${Math.round((Date.now() - cached.timestamp) / 1000)}s old)`);
    return cached.plan;
  }
  return null;
}

function setCachedPlan(courseCode, plan) {
  planCache.set(courseCode, { plan, timestamp: Date.now() });
}

function invalidatePlanCache(courseCode) {
  planCache.delete(courseCode);
}

// Import Kai's audio generation orchestrator
const audioOrchestrator = require('../../scripts/phase8-audio-generation.cjs');

// Import preflight service for plan endpoint
let preflightService;
let plannerService;
try {
  preflightService = require('../preflight-check-service.cjs');
  plannerService = require('../audio-generation-planner.cjs');
} catch (e) {
  console.warn('[Phase 8] Could not load preflight/planner services:', e.message);
}

// Enable CORS for all origins (adjust as needed)
app.use(cors());

app.use(express.json());

// Active job tracking
const activeJobs = new Map();

// Plan cache (stores approved plans)
const approvedPlans = new Map();

/**
 * Run preflight checks and show generation plan
 *
 * POST /plan
 * Body: {
 *   courseCode: "spa_for_eng",
 *   options: {
 *     skipSync: false,     // Skip S3 sync during preflight
 *     skipDedup: false     // Skip deduplication during preflight
 *   }
 * }
 *
 * Response includes:
 * - Preflight check results (pass/fail with details)
 * - Sample counts by role
 * - Cost estimates (Azure free, ElevenLabs paid)
 * - Time estimates
 * - Voice assignments
 *
 * IMPORTANT: This does NOT start generation. User must call /start after reviewing.
 */
app.post('/plan', async (req, res) => {
  const { courseCode, options = {}, voices: voiceOverrides } = req.body;

  if (!courseCode) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: courseCode'
    });
  }

  // Check cache first (unless force refresh requested or voices provided)
  if (!options.forceRefresh && !voiceOverrides) {
    const cachedPlan = getCachedPlan(courseCode);
    if (cachedPlan) {
      return res.json(cachedPlan);
    }
  }

  console.log(`\n[Phase 8] Running plan for ${courseCode}`);

  try {
    // Load manifest and voice assignments
    const manifest = await audioOrchestrator.loadCourseManifest(courseCode);
    let voices = await audioOrchestrator.getVoiceAssignments(courseCode);

    // Apply voice overrides if provided
    if (voiceOverrides) {
      voices = { ...voices, ...voiceOverrides };
      console.log('[Phase 8] Using voice overrides:', voiceOverrides);
    }

    // Analyze what needs to be generated
    // Note: Parameter order is (manifest, courseCode, voiceAssignments) - manifest first!
    const analysis = await audioOrchestrator.analyzeRequiredGeneration(manifest, courseCode, voices);

    // Run preflight if service available
    let preflightResult = { passed: true, checks: [], warnings: [] };
    if (preflightService && preflightService.runPreflight) {
      try {
        preflightResult = await preflightService.runPreflight(courseCode, {
          skipSync: options.skipSync,
          skipDedup: options.skipDedup,
          autoFix: true
        });
      } catch (e) {
        preflightResult = {
          passed: false,
          checks: [{ name: 'preflight', passed: false, error: e.message }],
          warnings: []
        };
      }
    }

    // Build plan summary
    // Note: analyzeRequiredGeneration returns { toGenerate: [], matched: [] }
    const toGenerateList = analysis.toGenerate || [];
    const matchedList = analysis.matched || [];

    // Count samples by role
    const byRole = {};
    for (const sample of toGenerateList) {
      byRole[sample.role] = (byRole[sample.role] || 0) + 1;
    }

    // Estimate costs based on actual voice provider selection
    // Check voice prefix to determine provider: azure_ vs elevenlabs_
    const getProvider = (role) => {
      const voiceId = voices[role] || '';
      if (voiceId.startsWith('elevenlabs_')) return 'elevenlabs';
      if (voiceId.startsWith('azure_')) return 'azure';
      return 'azure'; // default to azure (free)
    };

    let azureCount = 0;
    let elevenLabsCount = 0;
    for (const sample of toGenerateList) {
      const provider = getProvider(sample.role);
      if (provider === 'elevenlabs') {
        elevenLabsCount++;
      } else {
        azureCount++;
      }
    }

    // Rough cost estimate: ElevenLabs ~$0.30 per 1000 chars, avg 20 chars per sample
    const estimatedCost = elevenLabsCount > 0
      ? `~$${((elevenLabsCount * 20 * 0.30) / 1000).toFixed(2)} (ElevenLabs: ${elevenLabsCount} samples)`
      : '$0 (Azure free tier only)';

    // Rough time estimate: ~2 samples/sec for Azure, ~1 sample/sec for ElevenLabs
    const estimatedSeconds = (azureCount / 2) + (elevenLabsCount / 1);
    const estimatedTime = estimatedSeconds > 60
      ? `~${Math.ceil(estimatedSeconds / 60)} minutes`
      : `~${Math.ceil(estimatedSeconds)} seconds`;

    const plan = {
      courseCode,
      timestamp: new Date().toISOString(),
      preflight: preflightResult,
      voices,
      analysis: {
        totalSamples: toGenerateList.length + matchedList.length,
        alreadyInMAR: matchedList.length,
        toGenerate: toGenerateList.length,
        byRole
      },
      estimates: {
        azureSamples: azureCount,
        elevenLabsSamples: elevenLabsCount,
        estimatedCost,
        estimatedTime
      },
      readyToStart: preflightResult.passed
    };

    // Cache the plan for approval
    approvedPlans.set(courseCode, {
      plan,
      createdAt: Date.now(),
      approved: false
    });

    // Expire plan cache after 1 hour
    setTimeout(() => approvedPlans.delete(courseCode), 3600000);

    const response = {
      success: true,
      message: preflightResult.passed
        ? 'Plan ready. Review and call POST /start to begin generation.'
        : 'Preflight checks failed. Fix issues before starting.',
      plan,
      nextStep: preflightResult.passed
        ? `POST /start with courseCode: "${courseCode}"`
        : 'Fix preflight issues and re-run POST /plan'
    };

    // Cache the response for quick subsequent loads
    setCachedPlan(courseCode, response);

    res.json(response);

  } catch (error) {
    console.error(`[Phase 8] Error creating plan for ${courseCode}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Start audio generation for a course
 *
 * POST /start
 * Body: {
 *   courseCode: "spa_for_eng",
 *   approved: true,         // Must be true to confirm plan review
 *   voices: {               // Optional: override voice assignments
 *     target1: "azure_zh-CN-XiaoxiaoNeural",
 *     target2: "azure_zh-CN-YunxiNeural",
 *     source: "azure_en-GB-BellaNeural",
 *     presentation: "elevenlabs_FOIN928B9X0jwgJ95cLt"
 *   },
 *   options: {
 *     phase: "auto",        // "targets", "presentations", "encouragements", "welcome", "finalize", or "auto"
 *     skipUpload: false,    // Skip S3 upload (for testing)
 *     skipQC: false,        // Skip QC pause (auto-approve)
 *     uploadBucket: "stage" // "stage" or "prod"
 *   }
 * }
 */
app.post('/start', async (req, res) => {
  const { courseCode, approved, voices, options = {} } = req.body;

  if (!courseCode) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: courseCode'
    });
  }

  // Check if plan was reviewed (warn but don't block)
  const cachedPlan = approvedPlans.get(courseCode);
  if (!cachedPlan && !approved) {
    return res.status(400).json({
      success: false,
      error: 'No plan found. Run POST /plan first to review costs and time estimates.',
      hint: 'Or set approved: true to skip plan review (not recommended)'
    });
  }

  if (cachedPlan && !cachedPlan.plan.readyToStart && !options.force) {
    return res.status(400).json({
      success: false,
      error: 'Preflight checks failed. Fix issues before starting.',
      preflight: cachedPlan.plan.preflight,
      hint: 'Set options.force: true to start anyway (not recommended)'
    });
  }

  // Check if job already running
  if (activeJobs.has(courseCode)) {
    const existingJob = activeJobs.get(courseCode);
    return res.status(409).json({
      success: false,
      error: `Audio generation already in progress for ${courseCode}`,
      job: {
        jobId: existingJob.jobId,
        status: existingJob.status,
        startedAt: existingJob.startedAt
      }
    });
  }

  console.log(`\n[Phase 8] Starting audio generation for ${courseCode}`);
  console.log(`[Phase 8] Options:`, JSON.stringify(options, null, 2));

  // Invalidate plan cache since S3 state will change
  invalidatePlanCache(courseCode);

  // Mark plan as approved
  if (cachedPlan) {
    cachedPlan.approved = true;
  }

  // Start job (non-blocking)
  const jobId = `${courseCode}-${Date.now()}`;
  const jobState = {
    courseCode,
    jobId,
    status: 'running',
    phase: 'phase-a',
    startedAt: new Date().toISOString(),
    options,
    progress: {
      current: 0,
      total: cachedPlan?.plan?.analysis?.toGenerate || 0
    }
  };

  activeJobs.set(courseCode, jobState);

  // If custom voice assignments provided, add them to options
  const generationOptions = { ...options };
  if (voices) {
    generationOptions.voiceOverrides = voices;
    console.log(`[Phase 8] Using custom voice assignments:`, JSON.stringify(voices, null, 2));
  }

  // Run audio generation in background
  audioOrchestrator.generateAudioForCourse(courseCode, generationOptions)
    .then(result => {
      // Check if paused at QC checkpoint
      if (result.pausedAtQC) {
        jobState.status = 'qc-review';
        jobState.phase = 'qc-checkpoint';
        jobState.qcReport = result.qcReport;
        console.log(`\n[Phase 8] Audio generation paused at QC checkpoint for ${courseCode}`);
      } else {
        jobState.status = result.success ? 'complete' : 'failed';
        jobState.completedAt = new Date().toISOString();
        jobState.result = result;

        console.log(`\n[Phase 8] Audio generation ${result.success ? 'complete' : 'failed'} for ${courseCode}`);

        // Notify orchestrator of completion
        if (result.success) {
          notifyOrchestrator(courseCode, 8, { success: true, ...result });
        }
      }
    })
    .catch(error => {
      jobState.status = 'failed';
      jobState.completedAt = new Date().toISOString();
      jobState.error = error.message;

      console.error(`\n[Phase 8] Error in audio generation for ${courseCode}:`, error);
    })
    .finally(() => {
      // Keep job in memory for status queries (cleanup after 1 hour, unless at QC)
      if (jobState.status !== 'qc-review') {
        setTimeout(() => activeJobs.delete(courseCode), 3600000);
      }
    });

  // Return immediately with job ID
  res.json({
    success: true,
    message: `Audio generation started for ${courseCode}`,
    jobId,
    courseCode,
    phase: options.phase || 'auto',
    workflow: [
      '1. Phase A: Generate target1, target2, source samples',
      '2. QC Checkpoint: Review flagged samples (if not skipped)',
      '3. POST /continue to process and upload Phase A',
      '4. Phase B: Generate presentation samples',
      '5. Finalize: Encouragements + Welcome'
    ]
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
 * Continue processing after QC approval
 *
 * POST /continue
 * Body: {
 *   courseCode: "spa_for_eng",
 *   qcApproved: true,       // Confirm QC review was done
 *   options: {
 *     skipUpload: false,
 *     uploadBucket: "stage"
 *   }
 * }
 *
 * This continues the workflow after QC checkpoint:
 * - Normalizes and processes Phase A audio
 * - Uploads to S3
 * - Proceeds to Phase B (presentations)
 * - Finishes with encouragements and welcome
 */
app.post('/continue', async (req, res) => {
  const { courseCode, qcApproved, options = {} } = req.body;

  if (!courseCode) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: courseCode'
    });
  }

  // Check if there's a job at QC checkpoint
  const job = activeJobs.get(courseCode);
  if (!job) {
    return res.status(404).json({
      success: false,
      error: `No active job found for ${courseCode}. Start with POST /start first.`
    });
  }

  if (job.status !== 'qc-review' && !options.force) {
    return res.status(400).json({
      success: false,
      error: `Job is not at QC checkpoint. Current status: ${job.status}`,
      hint: 'Set options.force: true to continue anyway'
    });
  }

  if (!qcApproved && !options.skipQC) {
    return res.status(400).json({
      success: false,
      error: 'QC not approved. Set qcApproved: true to confirm you reviewed the samples.',
      qcReport: job.qcReport,
      hint: 'Review samples in qc_review/ directory, then call with qcApproved: true'
    });
  }

  try {
    console.log(`\n[Phase 8] Continuing processing for ${courseCode} (QC approved: ${qcApproved})`);

    // Update job status
    job.status = 'processing';
    job.phase = 'phase-a-processing';

    const result = await audioOrchestrator.continuePhaseAProcessing(courseCode, options);

    // Update job with result
    job.status = result.success ? 'complete' : 'failed';
    job.completedAt = new Date().toISOString();
    job.result = result;

    // Notify orchestrator if complete
    if (result.success) {
      notifyOrchestrator(courseCode, 8, { success: true, ...result });
    }

    // Schedule cleanup
    setTimeout(() => activeJobs.delete(courseCode), 3600000);

    res.json({
      success: true,
      message: 'Audio generation complete',
      result
    });
  } catch (error) {
    console.error(`[Phase 8] Error continuing processing:`, error);

    // Update job status
    job.status = 'failed';
    job.error = error.message;

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Legacy endpoint alias
app.post('/continue-phase-a', (req, res) => {
  console.warn('[Phase 8] /continue-phase-a is deprecated. Use /continue instead.');
  req.body.qcApproved = true; // Assume approved for legacy calls
  app._router.handle({ ...req, url: '/continue' }, res);
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
 * Get all available voices from voices.json
 * Returns voices grouped by language for selection UI
 *
 * GET /voices
 */
app.get('/voices', async (req, res) => {
  try {
    const registry = await audioOrchestrator.loadVoiceRegistry();

    // Group voices by language for the UI
    const voicesByLanguage = {};
    const englishVoices = [];

    for (const [voiceId, voice] of Object.entries(registry.voices)) {
      const lang = voice.language;
      if (lang === 'eng') {
        englishVoices.push({ id: voiceId, ...voice });
      } else {
        if (!voicesByLanguage[lang]) {
          voicesByLanguage[lang] = [];
        }
        voicesByLanguage[lang].push({ id: voiceId, ...voice });
      }
    }

    res.json({
      success: true,
      voices: registry.voices,
      byLanguage: voicesByLanguage,
      english: englishVoices,
      languagePairAssignments: registry.language_pair_assignments,
      courseAssignments: registry.course_assignments
    });
  } catch (error) {
    console.error(`[Phase 8] Error loading voices:`, error);
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
