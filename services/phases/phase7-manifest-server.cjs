#!/usr/bin/env node

/**
 * Phase 7: Course Manifest Compilation Server
 *
 * Responsibilities:
 * - Accept POST /start requests from orchestrator
 * - Spawn Claude Code agent to compile course manifest
 * - Agent fetches phase outputs (1, 3, 5, 6) via orchestrator API
 * - Agent runs compilation logic (UUID generation, structure transformation)
 * - Agent submits final manifest via POST /api/phase7/:courseCode/submit
 *
 * Port: 3464 (auto-configured by start-automation.js)
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

// Load environment (set by start-automation.js)
const PORT = process.env.PORT || 3464;
const VFS_ROOT = process.env.VFS_ROOT;
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
const SERVICE_NAME = process.env.SERVICE_NAME || 'Phase 7 (Manifest)';

// Validate config
if (!VFS_ROOT) {
  console.error('❌ Error: VFS_ROOT not set');
  process.exit(1);
}

// Initialize Express
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Active jobs (courseCode -> job state)
const activeJobs = new Map();

/**
 * POST /start
 * Start Phase 7 manifest compilation for a course
 *
 * Body: {
 *   courseCode: string,          // e.g., "cmn_for_eng"
 *   target: string,              // e.g., "Chinese"
 *   known: string                // e.g., "English"
 * }
 */
app.post('/start', async (req, res) => {
  const {
    courseCode,
    target,
    known
  } = req.body;

  if (!courseCode || !target || !known) {
    return res.status(400).json({ error: 'courseCode, target, known required' });
  }

  // Check if already running
  if (activeJobs.has(courseCode)) {
    const existingJob = activeJobs.get(courseCode);
    const jobAge = Date.now() - existingJob.startTime;
    const tenMinutes = 10 * 60 * 1000;

    if (jobAge > tenMinutes) {
      console.log(`[Phase 7] ⚠️  Auto-aborting stale job (${Math.round(jobAge / 60000)} minutes old)`);
      activeJobs.delete(courseCode);
    } else {
      return res.status(409).json({
        error: `Phase 7 already running for ${courseCode}`,
        elapsedMinutes: Math.round(jobAge / 60000)
      });
    }
  }

  console.log(`\n[Phase 7] ====================================`);
  console.log(`[Phase 7] PHASE 7: MANIFEST COMPILATION`);
  console.log(`[Phase 7] ====================================`);
  console.log(`[Phase 7] Course: ${courseCode}`);
  console.log(`[Phase 7] Target: ${target}, Known: ${known}`);

  const baseCourseDir = path.join(VFS_ROOT, courseCode);

  // Verify required input files exist
  const requiredFiles = [
    'seed_pairs.json',
    'lego_pairs.json',
    'lego_baskets.json',
    'introductions.json'
  ];

  console.log(`\n[Phase 7] Verifying input files...`);
  for (const file of requiredFiles) {
    const filePath = path.join(baseCourseDir, file);
    if (!await fs.pathExists(filePath)) {
      console.error(`[Phase 7] ❌ Missing required file: ${file}`);
      return res.status(400).json({
        error: `Missing required file: ${file}`,
        path: filePath
      });
    }
    const stats = await fs.stat(filePath);
    console.log(`[Phase 7]    ✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  }

  // Create job tracking
  const job = {
    courseCode,
    target,
    known,
    startTime: Date.now(),
    status: 'spawning_agent'
  };
  activeJobs.set(courseCode, job);

  console.log(`\n[Phase 7] Running deterministic manifest compilation script...`);

  // Run the compilation script directly (no agent needed - this is deterministic)
  const scriptPath = path.join(__dirname, '../../scripts/phase7-compile-manifest.cjs');
  const compilationProcess = spawn('node', [scriptPath, courseCode], {
    cwd: path.join(__dirname, '../..'),
    stdio: 'pipe',
    env: {
      ...process.env,
      VFS_ROOT
    }
  });

  let compilationOutput = '';
  let compilationError = '';

  compilationProcess.stdout.on('data', (data) => {
    const output = data.toString();
    compilationOutput += output;
    console.log(`[Phase 7 Script] ${output.trim()}`);
  });

  compilationProcess.stderr.on('data', (data) => {
    const error = data.toString();
    compilationError += error;
    console.error(`[Phase 7 Script Error] ${error.trim()}`);
  });

  compilationProcess.on('close', async (code) => {
    if (code === 0) {
      console.log(`[Phase 7] ✅ Compilation script completed successfully`);

      // Submit manifest to orchestrator
      try {
        const manifestPath = path.join(baseCourseDir, 'course_manifest.json');
        const manifest = await fs.readJson(manifestPath);

        const submissionData = {
          version: manifest.version || '8.2.0',
          course: courseCode,
          manifest
        };

        console.log(`[Phase 7] Submitting manifest to orchestrator...`);
        const response = await axios.post(`${ORCHESTRATOR_URL}/api/phase7/${courseCode}/submit`, submissionData);

        console.log(`[Phase 7] ✅ Manifest submitted successfully`);
        console.log(`[Phase 7]    Phrases: ${response.data.phraseCount || 'N/A'}`);

        job.status = 'complete';
        job.endTime = Date.now();
        job.duration = job.endTime - job.startTime;
        job.phraseCount = response.data.phraseCount;
      } catch (submitError) {
        console.error(`[Phase 7] ❌ Failed to submit manifest:`, submitError.message);
        job.status = 'failed';
        job.error = `Compilation succeeded but submission failed: ${submitError.message}`;
      }
    } else {
      console.error(`[Phase 7] ❌ Compilation script exited with code ${code}`);
      job.status = 'failed';
      job.error = compilationError || `Script exited with code ${code}`;
    }

    // Clean up job after 5 minutes
    setTimeout(() => {
      activeJobs.delete(courseCode);
    }, 5 * 60 * 1000);
  });

  // Return immediate response
  res.json({
    success: true,
    message: `Phase 7 manifest compilation started for ${courseCode}`,
    agentSpawned: true,
    checkStatusAt: `/status/${courseCode}`
  });
});

/**
 * GET /status/:courseCode
 * Get current status of Phase 7 compilation
 */
app.get('/status/:courseCode', (req, res) => {
  const { courseCode } = req.params;

  if (!activeJobs.has(courseCode)) {
    return res.status(404).json({ error: 'No active job found for this course' });
  }

  const job = activeJobs.get(courseCode);
  res.json({
    courseCode,
    status: job.status,
    elapsedSeconds: Math.floor((Date.now() - job.startTime) / 1000),
    target: job.target,
    known: job.known,
    error: job.error
  });
});

/**
 * POST /abort/:courseCode
 * Abort Phase 7 compilation
 */
app.post('/abort/:courseCode', (req, res) => {
  const { courseCode } = req.params;

  if (!activeJobs.has(courseCode)) {
    return res.status(404).json({ error: 'No active job found for this course' });
  }

  activeJobs.delete(courseCode);
  console.log(`[Phase 7] 🛑 Aborted job for ${courseCode}`);

  res.json({
    success: true,
    message: `Phase 7 job aborted for ${courseCode}`
  });
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Phase 7 (Manifest Compilation)',
    port: PORT,
    activeJobs: activeJobs.size
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ ${SERVICE_NAME} server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   VFS Root: ${VFS_ROOT}`);
  console.log(`   Orchestrator: ${ORCHESTRATOR_URL}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log(`\n[Phase 7] Received SIGTERM, shutting down gracefully...`);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(`\n[Phase 7] Received SIGINT, shutting down gracefully...`);
  process.exit(0);
});
