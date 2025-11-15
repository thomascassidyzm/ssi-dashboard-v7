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
 * Calculate parallelization strategy
 *
 * Strategies:
 * - conservative: 7 windows × 10 agents × 10 seeds = Low RAM, slower
 * - balanced: 10 windows × 10 agents × 7 seeds = Good balance (DEFAULT)
 * - fast: 14 windows × 10 agents × 5 seeds = Faster, more RAM
 * - custom: User-specified values
 */
function calculateParallelization(strategy, totalSeeds, custom = {}) {
  let config;

  switch (strategy) {
    case 'conservative':
      config = {
        browserWindows: 7,
        agentsPerWindow: 10,
        seedsPerAgent: 10
      };
      break;

    case 'balanced':
      config = {
        browserWindows: 10,
        agentsPerWindow: 10,
        seedsPerAgent: 7
      };
      break;

    case 'fast':
      config = {
        browserWindows: 14,
        agentsPerWindow: 10,
        seedsPerAgent: 5
      };
      break;

    case 'custom':
      if (!custom.browserWindows || !custom.agentsPerWindow || !custom.seedsPerAgent) {
        throw new Error('Custom strategy requires browserWindows, agentsPerWindow, and seedsPerAgent');
      }
      config = {
        browserWindows: custom.browserWindows,
        agentsPerWindow: custom.agentsPerWindow,
        seedsPerAgent: custom.seedsPerAgent
      };
      break;

    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }

  // Calculate totals
  config.totalAgents = config.browserWindows * config.agentsPerWindow;
  config.capacity = config.totalAgents * config.seedsPerAgent;

  // Warn if capacity doesn't match seeds
  if (config.capacity < totalSeeds) {
    console.warn(`⚠️  Warning: Capacity (${config.capacity}) < Total Seeds (${totalSeeds})`);
    console.warn(`   Some seeds will not be processed!`);
  }

  return config;
}

/**
 * POST /start
 * Start Phase 5 basket generation for a course
 *
 * Body: {
 *   courseCode: string,
 *   totalSeeds: number,
 *
 *   // Parallelization strategy (choose one):
 *   strategy?: 'balanced' | 'fast' | 'conservative' | 'custom'
 *
 *   // Custom parallelization (if strategy='custom'):
 *   browserWindows?: number,      // How many browser windows to open
 *   agentsPerWindow?: number,     // How many Claude Code agents per window (using Task tool)
 *   seedsPerAgent?: number        // How many seeds each agent processes
 * }
 */
app.post('/start', async (req, res) => {
  const {
    courseCode,
    totalSeeds,
    strategy = 'balanced',
    browserWindows,
    agentsPerWindow,
    seedsPerAgent
  } = req.body;

  if (!courseCode || !totalSeeds) {
    return res.status(400).json({ error: 'courseCode and totalSeeds required' });
  }

  // Check if already running
  if (activeJobs.has(courseCode)) {
    return res.status(409).json({ error: `Phase 5 already running for ${courseCode}` });
  }

  // Calculate parallelization strategy
  const config = calculateParallelization(strategy, totalSeeds, {
    browserWindows,
    agentsPerWindow,
    seedsPerAgent
  });

  console.log(`\n🚀 Starting Phase 5 for ${courseCode}`);
  console.log(`   Strategy: ${strategy}`);
  console.log(`   Total seeds: ${totalSeeds}`);
  console.log(`   Browser windows: ${config.browserWindows}`);
  console.log(`   Agents per window: ${config.agentsPerWindow}`);
  console.log(`   Seeds per agent: ${config.seedsPerAgent}`);
  console.log(`   Total agents: ${config.totalAgents}`);

  // Initialize job state
  const job = {
    courseCode,
    totalSeeds,
    config,
    status: 'spawning_agents',
    startedAt: new Date().toISOString(),
    windowsSpawned: 0,
    branchesDetected: 0,
    merged: false,
    error: null
  };

  activeJobs.set(courseCode, job);

  try {
    // Start branch watcher
    await startBranchWatcher(courseCode, config.browserWindows);

    // Spawn parallel browser windows (each will spawn sub-agents)
    await spawnBrowserWindows(courseCode, totalSeeds, config);

    res.json({
      success: true,
      message: `Phase 5 started for ${courseCode}`,
      job: {
        courseCode,
        totalSeeds,
        strategy,
        config,
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
 * Spawn parallel browser windows (each spawns multiple Task agents)
 */
async function spawnBrowserWindows(courseCode, totalSeeds, config) {
  const { browserWindows, agentsPerWindow, seedsPerAgent } = config;

  console.log(`\n🌐 Spawning ${browserWindows} browser windows...`);
  console.log(`   Each window will spawn ${agentsPerWindow} Task agents`);
  console.log(`   Each agent processes ${seedsPerAgent} seeds`);

  const job = activeJobs.get(courseCode);
  let currentSeed = 1;

  for (let windowNum = 1; windowNum <= browserWindows; windowNum++) {
    console.log(`\n  Window ${windowNum}/${browserWindows}:`);

    // Calculate seed range for this window
    const seedsInWindow = agentsPerWindow * seedsPerAgent;
    const windowStartSeed = currentSeed;
    const windowEndSeed = Math.min(currentSeed + seedsInWindow - 1, totalSeeds);

    console.log(`    Seed range: ${windowStartSeed}-${windowEndSeed}`);
    console.log(`    Will spawn ${agentsPerWindow} Task agents`);

    // Generate orchestrator prompt for this window
    const windowPrompt = generateWindowOrchestratorPrompt(
      courseCode,
      windowNum,
      windowStartSeed,
      windowEndSeed,
      agentsPerWindow,
      seedsPerAgent
    );

    try {
      await spawnClaudeCodeSession(windowPrompt, `phase5-window-${windowNum}`);
      if (job) job.windowsSpawned++;

      // Stagger window spawns
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`    ❌ Failed to spawn window ${windowNum}:`, error.message);
    }

    currentSeed = windowEndSeed + 1;
    if (currentSeed > totalSeeds) break;
  }

  console.log(`\n✅ Spawned ${browserWindows} browser windows`);
  console.log(`   Total agents across all windows: ${config.totalAgents}`);
  console.log(`   Waiting for branches...`);

  if (job) {
    job.status = 'waiting_for_branches';
  }
}

/**
 * Generate Window Orchestrator Prompt
 *
 * This prompt spawns multiple Task agents in parallel within one browser window
 */
function generateWindowOrchestratorPrompt(courseCode, windowNum, startSeed, endSeed, agentCount, seedsPerAgent) {
  const windowId = `w${String(windowNum).padStart(2, '0')}`;
  const seedRange = `S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')}`;

  return `# Phase 5 Window Orchestrator ${windowNum}: Spawn ${agentCount} Parallel Agents

## Your Assignment
You are Window ${windowNum}. Your job is to spawn ${agentCount} parallel Task agents.

Seed range for this window: ${seedRange} (${endSeed - startSeed + 1} seeds)
Each agent processes ${seedsPerAgent} seeds.

## Instructions

**Read Phase 5 Intelligence first:** https://ssi-dashboard-v7.vercel.app/phase-intelligence/5

**Then spawn ${agentCount} Task agents in parallel:**

Use a single message with ${agentCount} Task tool calls to run them in parallel.

For each agent (agent 1 to ${agentCount}):
- Calculate its seed range (${seedsPerAgent} seeds per agent)
- Agent 1: seeds ${startSeed}-${startSeed + seedsPerAgent - 1}
- Agent 2: seeds ${startSeed + seedsPerAgent}-${startSeed + (2 * seedsPerAgent) - 1}
- ... and so on

**Agent prompt template:**

\`\`\`
Generate Phase 5 practice baskets for ${courseCode}.

Seed range: S####-S#### (your ${seedsPerAgent} seeds)
Segment ID: ${windowId}-agent-##

Steps:
1. Load LEGOs from /vfs/courses/${courseCode}/lego_pairs.json
2. Load seeds from /vfs/courses/${courseCode}/seed_pairs.json
3. Generate baskets for your seed range
4. Write to staging/${windowId}-agent-##.json
5. Push: node scripts/push_segment.cjs staging/${windowId}-agent-##.json "Phase 5: S####-S####"

Branch name: claude/baskets-${courseCode}-${windowId}-agent-##
\`\`\`

## Example

\`\`\`
I'll spawn ${agentCount} agents in parallel to process seeds ${seedRange}.

[Makes ${agentCount} Task tool calls simultaneously]
\`\`\`

## Important
- Spawn all ${agentCount} agents in a **single message** (parallel execution)
- Each agent gets its own segment ID: ${windowId}-agent-01, ${windowId}-agent-02, etc.
- Each agent pushes to its own branch: claude/baskets-${courseCode}-${windowId}-agent-##
- The automation server watches for all branches and auto-merges when complete
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
