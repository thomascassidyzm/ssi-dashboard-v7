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

  console.log(`\n[Phase 7] Spawning Claude Code agent for manifest compilation...`);

  // Spawn Claude Code agent with compilation task
  const agentPrompt = `
**Phase 7: Course Manifest Compilation for ${courseCode}**

Your task is to compile the 4 phase outputs into the final course_manifest.json format required by the SSi mobile app.

**ORCHESTRATOR URL**: ${ORCHESTRATOR_URL}

**Step 1: Fetch Input Files**

Fetch all 4 required phase outputs via REST API:

\`\`\`bash
curl ${ORCHESTRATOR_URL}/api/courses/${courseCode}/phase-outputs/1/seed_pairs.json > /tmp/seed_pairs.json
curl ${ORCHESTRATOR_URL}/api/courses/${courseCode}/phase-outputs/3/lego_pairs.json > /tmp/lego_pairs.json
curl ${ORCHESTRATOR_URL}/api/courses/${courseCode}/phase-outputs/5/lego_baskets.json > /tmp/lego_baskets.json
curl ${ORCHESTRATOR_URL}/api/courses/${courseCode}/phase-outputs/6/introductions.json > /tmp/introductions.json
\`\`\`

**Step 2: Fetch Phase Intelligence Document**

\`\`\`bash
curl ${ORCHESTRATOR_URL}/api/phase-intelligence/7 > /tmp/phase_7_intelligence.md
\`\`\`

Read this document carefully - it contains all compilation rules, UUID generation algorithm, and validation requirements.

**Step 3: Run Compilation Script**

The compilation script is located at:
\`/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/phase7-compile-manifest.cjs\`

Run it with:
\`\`\`bash
node /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/phase7-compile-manifest.cjs ${courseCode}
\`\`\`

This will generate \`course_manifest.json\` in the course directory.

**Step 4: Submit Compiled Manifest**

After compilation completes successfully, submit the manifest to the orchestrator:

\`\`\`bash
curl -X POST ${ORCHESTRATOR_URL}/api/phase7/${courseCode}/submit \\
  -H "Content-Type: application/json" \\
  -d @/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/${courseCode}/course_manifest.json
\`\`\`

**Expected Output Statistics**:
- Single slice containing all seeds
- ~800+ introduction items (LEGOs)
- ~8000+ practice nodes
- ~15,000+ unique phrases
- ~20,000+ audio sample variants (target1, target2, source roles)

**Validation**:
- Verify all UUIDs are deterministic (same phrase = same UUID)
- Verify top-level \`introduction\` field present
- Verify all samples have \`duration: 0\` placeholder
- Verify no missing LEGO presentations

Report any errors immediately. When complete, confirm the manifest was successfully submitted.
`;

  const agentProcess = spawn('claude', ['--dangerously-skip-update-check'], {
    cwd: path.join(__dirname, '../..'),
    stdio: 'pipe',
    env: {
      ...process.env,
      CLAUDE_PROJECT_ROOT: path.join(__dirname, '../..'),
      VFS_ROOT
    }
  });

  // Send prompt to agent
  agentProcess.stdin.write(agentPrompt);
  agentProcess.stdin.end();

  let agentOutput = '';
  let agentError = '';

  agentProcess.stdout.on('data', (data) => {
    const output = data.toString();
    agentOutput += output;
    console.log(`[Phase 7 Agent] ${output.trim()}`);
  });

  agentProcess.stderr.on('data', (data) => {
    const error = data.toString();
    agentError += error;
    console.error(`[Phase 7 Agent Error] ${error.trim()}`);
  });

  agentProcess.on('close', (code) => {
    if (code === 0) {
      console.log(`[Phase 7] ✅ Agent completed manifest compilation`);
      job.status = 'complete';
      job.endTime = Date.now();
      job.duration = job.endTime - job.startTime;
    } else {
      console.error(`[Phase 7] ❌ Agent exited with code ${code}`);
      job.status = 'failed';
      job.error = agentError || `Agent exited with code ${code}`;
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
