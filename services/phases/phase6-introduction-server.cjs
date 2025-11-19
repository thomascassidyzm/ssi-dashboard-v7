#!/usr/bin/env node

/**
 * Phase 6: Introduction Server
 *
 * Port: 3460
 *
 * Generates introduction presentations for LEGOs by reading lego_pairs.json
 * and creating natural language text that will be spoken to introduce each LEGO.
 */

const express = require('express');
const path = require('path');
const axios = require('axios');
const { generateIntroductions } = require('../../scripts/phase6-generate-introductions.cjs');

const app = express();
const PORT = process.env.PORT || 3460;
const SERVICE_NAME = process.env.SERVICE_NAME || 'Phase 6 (Introductions)';
const VFS_ROOT = process.env.VFS_ROOT || path.join(__dirname, '../../public/vfs/courses');
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';

app.use(express.json());

// Active jobs tracking
const activeJobs = new Map();

app.post('/start', async (req, res) => {
  const { courseCode } = req.body;

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode is required' });
  }

  // Check if job already running
  if (activeJobs.has(courseCode)) {
    return res.status(409).json({
      error: `Phase 6 job already running for ${courseCode}`,
      status: activeJobs.get(courseCode)
    });
  }

  console.log(`[Phase 6] Starting introduction generation for ${courseCode}`);

  const courseDir = path.join(VFS_ROOT, courseCode);

  // Create job state
  const job = {
    courseCode,
    status: 'generating',
    startedAt: new Date().toISOString(),
    error: null
  };

  activeJobs.set(courseCode, job);

  // Run generation asynchronously
  generateIntroductions(courseDir)
    .then(async result => {
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.result = result;
      console.log(`[Phase 6] ✅ Completed for ${courseCode}`);

      // Notify orchestrator that Phase 6 is complete
      try {
        await axios.post(`${ORCHESTRATOR_URL}/phase-complete`, {
          phase: 6,
          courseCode: courseCode,
          status: 'completed',
          result: result
        });
        console.log(`[Phase 6] Notified orchestrator of completion`);
      } catch (error) {
        console.error(`[Phase 6] Failed to notify orchestrator:`, error.message);
      }

      // Clean up after 5 minutes
      setTimeout(() => activeJobs.delete(courseCode), 5 * 60 * 1000);
    })
    .catch(async error => {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date().toISOString();
      console.error(`[Phase 6] ❌ Failed for ${courseCode}:`, error.message);

      // Notify orchestrator of failure
      try {
        await axios.post(`${ORCHESTRATOR_URL}/phase-complete`, {
          phase: 6,
          courseCode: courseCode,
          status: 'failed',
          error: error.message
        });
      } catch (notifyError) {
        console.error(`[Phase 6] Failed to notify orchestrator:`, notifyError.message);
      }

      // Clean up after 5 minutes
      setTimeout(() => activeJobs.delete(courseCode), 5 * 60 * 1000);
    });

  res.json({
    success: true,
    courseCode,
    message: `Phase 6 introduction generation started for ${courseCode}`,
    status: job.status
  });
});

app.get('/status/:courseCode', (req, res) => {
  const { courseCode } = req.params;
  const job = activeJobs.get(courseCode);

  if (!job) {
    return res.status(404).json({ error: `No Phase 6 job found for ${courseCode}` });
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
