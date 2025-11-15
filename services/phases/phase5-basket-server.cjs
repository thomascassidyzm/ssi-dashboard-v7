#!/usr/bin/env node

/**
 * Phase 5: Practice Basket Generation Server
 *
 * Responsibilities:
 * - Spawn parallel Claude Code browser sessions for basket generation
 * - Watch for claude/baskets-* branches (using watch_and_merge_branches.cjs)
 * - Auto-merge segments when all agents complete
 * - Strip metadata before merge (99.5% size reduction)
 * - Validate basket quality
 * - Write lego_baskets.json to VFS
 * - Report completion to orchestrator
 *
 * Port: 3459 (auto-configured by start-automation.js)
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// Load environment (set by start-automation.js)
const PORT = process.env.PORT || 3459;
const VFS_ROOT = process.env.VFS_ROOT;
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
const SERVICE_NAME = process.env.SERVICE_NAME || 'Phase 5 (Baskets)';

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

// Branch watcher processes (courseCode -> child process)
const watchers = new Map();

/**
 * POST /start
 * Start Phase 5 basket generation for a course
 *
 * Body: {
 *   courseCode: string,
 *   totalSeeds: number,
 *   agentsPerBatch?: number (default: 50)
 * }
 */
app.post('/start', async (req, res) => {
  const { courseCode, totalSeeds, agentsPerBatch = 50 } = req.body;

  if (!courseCode || !totalSeeds) {
    return res.status(400).json({ error: 'courseCode and totalSeeds required' });
  }

  // Check if already running
  if (activeJobs.has(courseCode)) {
    return res.status(409).json({ error: `Phase 5 already running for ${courseCode}` });
  }

  console.log(`\n🚀 Starting Phase 5 for ${courseCode}`);
  console.log(`   Total seeds: ${totalSeeds}`);
  console.log(`   Agents: ${agentsPerBatch}`);

  // Initialize job state
  const job = {
    courseCode,
    totalSeeds,
    agentsPerBatch,
    status: 'spawning_agents',
    startedAt: new Date().toISOString(),
    agentsSpawned: 0,
    branchesDetected: 0,
    merged: false,
    error: null
  };

  activeJobs.set(courseCode, job);

  try {
    // Start branch watcher
    await startBranchWatcher(courseCode, agentsPerBatch);

    // Spawn parallel Claude Code browser sessions
    await spawnBrowserAgents(courseCode, totalSeeds, agentsPerBatch);

    res.json({
      success: true,
      message: `Phase 5 started for ${courseCode}`,
      job: {
        courseCode,
        totalSeeds,
        agentsPerBatch,
        status: 'running'
      }
    });
  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    activeJobs.delete(courseCode);

    console.error(`❌ Failed to start Phase 5 for ${courseCode}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /status/:courseCode
 * Get Phase 5 progress for a course
 */
app.get('/status/:courseCode', (req, res) => {
  const { courseCode } = req.params;
  const job = activeJobs.get(courseCode);

  if (!job) {
    return res.status(404).json({ error: `No Phase 5 job found for ${courseCode}` });
  }

  res.json({
    courseCode,
    status: job.status,
    startedAt: job.startedAt,
    agentsSpawned: job.agentsSpawned,
    branchesDetected: job.branchesDetected,
    merged: job.merged,
    error: job.error
  });
});

/**
 * GET /branches
 * List all waiting claude/baskets-* branches
 */
app.get('/branches', async (req, res) => {
  try {
    const { execSync } = require('child_process');
    const branches = execSync('git branch -r | grep "claude/baskets-"', { encoding: 'utf-8' })
      .split('\n')
      .filter(b => b.trim())
      .map(b => b.trim().replace('origin/', ''));

    res.json({ branches, count: branches.length });
  } catch (error) {
    // No branches found (grep returns non-zero)
    res.json({ branches: [], count: 0 });
  }
});

/**
 * POST /merge
 * Manually trigger merge of waiting branches
 */
app.post('/merge', async (req, res) => {
  const { courseCode } = req.body;

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode required' });
  }

  try {
    console.log(`\n🔀 Manually triggering merge for ${courseCode}...`);
    await runMerge(courseCode);

    res.json({ success: true, message: `Merged baskets for ${courseCode}` });
  } catch (error) {
    console.error(`❌ Merge failed:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /abort/:courseCode
 * Emergency stop for Phase 5
 */
app.post('/abort/:courseCode', (req, res) => {
  const { courseCode } = req.params;

  console.log(`\n🛑 Aborting Phase 5 for ${courseCode}...`);

  // Stop watcher
  const watcher = watchers.get(courseCode);
  if (watcher) {
    watcher.kill('SIGTERM');
    watchers.delete(courseCode);
  }

  // Remove job
  activeJobs.delete(courseCode);

  res.json({ success: true, message: `Aborted Phase 5 for ${courseCode}` });
});

/**
 * Start branch watcher for a course
 */
async function startBranchWatcher(courseCode, expectedAgents) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(VFS_ROOT, courseCode, 'lego_baskets.json');
    const scriptPath = path.join(__dirname, '../../scripts/watch_and_merge_branches.cjs');

    console.log(`\n👀 Starting branch watcher for ${courseCode}...`);
    console.log(`   Pattern: claude/baskets-${courseCode}-*`);
    console.log(`   Waiting for ${expectedAgents} branches`);
    console.log(`   Output: ${outputPath}`);

    const watcher = spawn('node', [
      scriptPath,
      '--watch',
      '--pattern', `claude/baskets-${courseCode}-*`,
      '--output', outputPath,
      '--min-branches', expectedAgents.toString(),
      '--auto-delete'
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    watcher.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => {
        console.log(`  [Watcher] ${line}`);

        // Detect merge completion
        if (line.includes('Merged') || line.includes('✅')) {
          const job = activeJobs.get(courseCode);
          if (job) {
            job.merged = true;
            job.status = 'complete';
            notifyOrchestrator(courseCode, 'complete');
          }
        }

        // Detect branch count
        const branchMatch = line.match(/(\d+) branches ready/);
        if (branchMatch) {
          const job = activeJobs.get(courseCode);
          if (job) {
            job.branchesDetected = parseInt(branchMatch[1]);
          }
        }
      });
    });

    watcher.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => {
        console.error(`  [Watcher Error] ${line}`);
      });
    });

    watcher.on('error', (err) => {
      console.error(`❌ Watcher failed to start:`, err);
      reject(err);
    });

    watcher.on('exit', (code) => {
      if (code !== 0) {
        console.error(`❌ Watcher exited with code ${code}`);
      }
      watchers.delete(courseCode);
    });

    watchers.set(courseCode, watcher);

    // Give watcher a moment to start
    setTimeout(() => resolve(), 1000);
  });
}

/**
 * Spawn parallel Claude Code browser sessions
 */
async function spawnBrowserAgents(courseCode, totalSeeds, agentCount) {
  const seedsPerAgent = Math.ceil(totalSeeds / agentCount);

  console.log(`\n🌐 Spawning ${agentCount} browser agents...`);
  console.log(`   Seeds per agent: ${seedsPerAgent}`);

  const job = activeJobs.get(courseCode);

  for (let i = 0; i < agentCount; i++) {
    const startSeed = i * seedsPerAgent + 1;
    const endSeed = Math.min((i + 1) * seedsPerAgent, totalSeeds);
    const segmentId = `segment-${String(i + 1).padStart(3, '0')}`;

    console.log(`  Agent ${i + 1}: Seeds ${startSeed}-${endSeed} → ${segmentId}`);

    // Spawn browser session via osascript
    const agentPrompt = generatePhase5AgentPrompt(courseCode, startSeed, endSeed, segmentId, i + 1);

    try {
      await spawnClaudeCodeSession(agentPrompt, `phase5-${courseCode}-${segmentId}`);
      if (job) job.agentsSpawned++;

      // Stagger spawns to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`  ❌ Failed to spawn agent ${i + 1}:`, error.message);
    }
  }

  console.log(`\n✅ Spawned ${agentCount} browser agents`);
  console.log(`   Waiting for them to push branches...`);

  if (job) {
    job.status = 'waiting_for_branches';
  }
}

/**
 * Generate Phase 5 agent prompt
 */
function generatePhase5AgentPrompt(courseCode, startSeed, endSeed, segmentId, agentNum) {
  const seedRange = `S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')}`;

  return `# Phase 5 Agent ${agentNum}: Generate Practice Baskets for ${courseCode}

## Your Assignment
Seeds: ${seedRange} (${endSeed - startSeed + 1} seeds)
Segment ID: ${segmentId}
Branch: claude/baskets-${courseCode}-${segmentId}

## Instructions

1. **Read Phase 5 Intelligence**: https://ssi-dashboard-v7.vercel.app/phase-intelligence/5

2. **Load course data**:
   - LEGOs: /vfs/courses/${courseCode}/lego_pairs.json
   - Seeds: /vfs/courses/${courseCode}/seed_pairs.json

3. **Generate baskets** for seeds ${seedRange}

4. **Write output**:
   \`\`\`bash
   # Write to staging/
   node -e "fs.writeFileSync('staging/${segmentId}.json', JSON.stringify(yourData, null, 2))"
   \`\`\`

5. **Push to branch**:
   \`\`\`bash
   # This script auto-strips metadata and pushes
   node scripts/push_segment.cjs staging/${segmentId}.json "Phase 5: ${seedRange}"
   \`\`\`

6. **You're done!** The automation server will auto-merge when all ${agentCount} agents finish.

## Important
- Use the push_segment.cjs script (it strips metadata automatically)
- Don't merge manually - the watcher does it
- Branch name must be: claude/baskets-${courseCode}-${segmentId}
`;
}

/**
 * Spawn Claude Code session via osascript
 */
async function spawnClaudeCodeSession(prompt, windowTitle) {
  const { execAsync } = require('child_process');
  const { promisify } = require('util');
  const exec = promisify(execAsync);

  const escapedPrompt = prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$');

  const script = `
    tell application "Google Chrome"
      set newWindow to make new window
      set URL of active tab of newWindow to "https://claude.ai/new"
      delay 2
      tell application "System Events"
        keystroke "${escapedPrompt}"
        delay 1
        keystroke return
      end tell
    end tell
  `;

  await exec(`osascript -e '${script}'`);
}

/**
 * Run merge manually (for testing or manual trigger)
 */
async function runMerge(courseCode) {
  const { execSync } = require('child_process');
  const outputPath = path.join(VFS_ROOT, courseCode, 'lego_baskets.json');
  const scriptPath = path.join(__dirname, '../../scripts/watch_and_merge_branches.cjs');

  console.log(`\n🔀 Running merge for ${courseCode}...`);

  const output = execSync(
    `node "${scriptPath}" --pattern "claude/baskets-${courseCode}-*" --output "${outputPath}" --auto-delete`,
    { encoding: 'utf-8', stdio: 'inherit' }
  );

  console.log(`✅ Merge complete: ${outputPath}`);

  // Update job status
  const job = activeJobs.get(courseCode);
  if (job) {
    job.merged = true;
    job.status = 'complete';
  }

  // Notify orchestrator
  await notifyOrchestrator(courseCode, 'complete');
}

/**
 * Notify orchestrator of phase completion
 */
async function notifyOrchestrator(courseCode, status) {
  try {
    const axios = require('axios');
    await axios.post(`${ORCHESTRATOR_URL}/phase-complete`, {
      phase: 5,
      courseCode,
      status,
      timestamp: new Date().toISOString()
    });
    console.log(`✅ Notified orchestrator: Phase 5 ${status} for ${courseCode}`);
  } catch (error) {
    console.error(`⚠️  Failed to notify orchestrator:`, error.message);
  }
}

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    status: 'healthy',
    port: PORT,
    vfsRoot: VFS_ROOT,
    activeJobs: activeJobs.size,
    watchers: watchers.size
  });
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log('');
  console.log(`✅ ${SERVICE_NAME} listening on port ${PORT}`);
  console.log(`   VFS Root: ${VFS_ROOT}`);
  console.log(`   Orchestrator: ${ORCHESTRATOR_URL}`);
  console.log('');
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Phase 5 server...');

  // Stop all watchers
  for (const [courseCode, watcher] of watchers.entries()) {
    console.log(`  Stopping watcher for ${courseCode}...`);
    watcher.kill('SIGTERM');
  }

  process.exit(0);
});
