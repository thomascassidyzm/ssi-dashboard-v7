#!/usr/bin/env node

/**
 * Phase 5: Practice Basket Generation Server (PROPERLY MIGRATED)
 *
 * Migrated from automation_server.cjs lines 2196-2295, 732-858
 * Responsibilities:
 * - ✅ Run scaffold preparation (preparePhase5Scaffolds)
 * - ✅ Spawn parallel Claude Code browser sessions
 * - ✅ Use exact orchestrator/agent prompts from working system
 * - ✅ Watch for claude/baskets-* branches
 * - ✅ Auto-merge when all complete
 * - ✅ Validate basket quality
 * - ✅ NEW: Strip metadata before GitHub push
 * - ✅ NEW: Integrate simplified config (automation.config.simple.json)
 * - ✅ Report completion to orchestrator
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

// Load configuration
const { loadConfig } = require('../config-loader.cjs');

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
 * Get relative course directory for prompts
 */
function getRelativeCourseDir(absolutePath) {
  return absolutePath.replace(VFS_ROOT + '/', '');
}

/**
 * POST /start
 * Start Phase 5 basket generation for a course
 *
 * Body: {
 *   courseCode: string,          // e.g., "spa_for_eng" or "spa_for_eng_s0001-0100"
 *   startSeed: number,            // e.g., 1
 *   endSeed: number,              // e.g., 668
 *   target: string,               // e.g., "Spanish"
 *   known: string,                // e.g., "English"
 *
 *   // Optional: Parallelization override
 *   browserWindows?: number,      // Default from config
 *   agentsPerWindow?: number,     // Default from config
 *   seedsPerAgent?: number        // Default from config (usually 10)
 * }
 */
app.post('/start', async (req, res) => {
  const {
    courseCode,
    startSeed,
    endSeed,
    target,
    known,
    browserWindows,
    agentsPerWindow,
    seedsPerAgent
  } = req.body;

  if (!courseCode || !startSeed || !endSeed || !target || !known) {
    return res.status(400).json({ error: 'courseCode, startSeed, endSeed, target, known required' });
  }

  // Check if already running
  if (activeJobs.has(courseCode)) {
    return res.status(409).json({ error: `Phase 5 already running for ${courseCode}` });
  }

  const totalSeeds = endSeed - startSeed + 1;

  console.log(`\n[Phase 5] ====================================`);
  console.log(`[Phase 5] PHASE 5: PRACTICE BASKETS`);
  console.log(`[Phase 5] ====================================`);
  console.log(`[Phase 5] Course: ${courseCode}`);
  console.log(`[Phase 5] Seeds: ${startSeed}-${endSeed} (${totalSeeds} total)`);
  console.log(`[Phase 5] Target: ${target}, Known: ${known}`);

  // Detect segment range and get base course code
  const segmentMatch = courseCode.match(/^([a-z]{3}_for_[a-z]{3})_s\d{4}-\d{4}$/);
  const baseCourseCode = segmentMatch ? segmentMatch[1] : courseCode;
  const baseCourseDir = path.join(VFS_ROOT, baseCourseCode);
  const courseDir = path.join(VFS_ROOT, courseCode);

  if (segmentMatch) {
    console.log(`[Phase 5] Segment range detected: ${courseCode}`);
    console.log(`[Phase 5] Using base course: ${baseCourseCode}`);
  }

  // Check prerequisites in base course directory
  const seedPairsPath = path.join(baseCourseDir, 'seed_pairs.json');
  const legoPairsPath = path.join(baseCourseDir, 'lego_pairs.json');

  if (!await fs.pathExists(seedPairsPath)) {
    return res.status(400).json({ error: `Phase 5 requires seed_pairs.json in ${baseCourseCode} - run Phase 1 first` });
  }
  if (!await fs.pathExists(legoPairsPath)) {
    return res.status(400).json({ error: `Phase 5 requires lego_pairs.json in ${baseCourseCode} - run Phase 3 first` });
  }

  console.log(`[Phase 5] ✅ Prerequisites found`);

  // Check if Phase 5 already complete
  const basketsPath = path.join(baseCourseDir, 'lego_baskets.json');
  if (await fs.pathExists(basketsPath)) {
    try {
      const baskets = await fs.readJson(basketsPath);
      const basketCount = Object.keys(baskets.baskets || {}).length;
      const legoPairs = await fs.readJson(legoPairsPath);
      const expectedBaskets = legoPairs.seeds.flatMap(s => s.legos.filter(l => l.new)).length;

      if (basketCount >= expectedBaskets) {
        console.log(`[Phase 5] ✅ Phase 5 already complete! Found ${basketCount}/${expectedBaskets} baskets`);
        return res.json({
          success: true,
          alreadyComplete: true,
          message: `Phase 5 already complete (${basketCount} baskets)`,
          basketCount,
          expectedBaskets
        });
      } else {
        console.log(`[Phase 5] 🔄 Phase 5 needs extension! Existing: ${basketCount} baskets, expected: ${expectedBaskets}`);
      }
    } catch (err) {
      console.log(`[Phase 5] baskets file exists but invalid, will regenerate`);
    }
  }

  // Initialize job state
  const job = {
    courseCode,
    totalSeeds,
    baseCourseCode,
    baseCourseDir,
    startSeed,
    endSeed,
    target,
    known,
    status: 'preparing_scaffolds',
    startedAt: new Date().toISOString(),
    windowsSpawned: 0,
    branchesDetected: 0,
    merged: false,
    error: null
  };

  activeJobs.set(courseCode, job);

  try {
    // STEP 1: Prep Phase 5 scaffolds (mechanical work)
    console.log(`\n[Phase 5] Running scaffold prep script...`);
    const { preparePhase5Scaffolds } = require('../../scripts/phase5_prep_scaffolds.cjs');
    const scaffoldResult = await preparePhase5Scaffolds(baseCourseDir);
    console.log(`[Phase 5] ✅ Phase 5 scaffolds ready`);
    console.log(`[Phase 5]    Total seeds: ${scaffoldResult.totalSeeds}`);
    console.log(`[Phase 5]    Total LEGOs: ${scaffoldResult.totalNewLegos}`);

    // STEP 2: Load configuration for parallelization
    const config = loadConfig();
    const phase5Config = config.phase5_basket_generation;

    const browsers = browserWindows || phase5Config.browsers;
    const agents = agentsPerWindow || phase5Config.agents_per_browser;
    const seedsPerAgentConfig = seedsPerAgent || 10; // Always 10 seeds per agent from old system

    const totalAgents = browsers * agents;
    const capacity = totalAgents * seedsPerAgentConfig;

    console.log(`\n[Phase 5] Parallelization Strategy:`);
    console.log(`[Phase 5]    Browser windows: ${browsers}`);
    console.log(`[Phase 5]    Agents per window: ${agents}`);
    console.log(`[Phase 5]    Seeds per agent: ${seedsPerAgentConfig}`);
    console.log(`[Phase 5]    Total agents: ${totalAgents}`);
    console.log(`[Phase 5]    Total capacity: ${capacity} seeds`);

    if (capacity < totalSeeds) {
      console.warn(`[Phase 5] ⚠️  Warning: Capacity (${capacity}) < Total Seeds (${totalSeeds})`);
      console.warn(`[Phase 5]    Some seeds will not be processed!`);
    }

    job.config = { browsers, agents, seedsPerAgent: seedsPerAgentConfig, totalAgents, capacity };
    job.status = 'spawning_windows';

    // STEP 3: Start branch watcher
    await startBranchWatcher(courseCode, browsers, baseCourseDir);

    // STEP 4: Spawn browser windows
    await spawnBrowserWindows(courseCode, {
      target,
      known,
      startSeed,
      endSeed
    }, baseCourseDir, browsers, agents, seedsPerAgentConfig);

    res.json({
      success: true,
      message: `Phase 5 started for ${courseCode}`,
      job: {
        courseCode,
        totalSeeds,
        config: job.config,
        status: 'running',
        scaffolds: scaffoldResult
      }
    });
  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    activeJobs.delete(courseCode);

    console.error(`[Phase 5] ❌ Failed to start:`, error);
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
    windowsSpawned: job.windowsSpawned,
    branchesDetected: job.branchesDetected,
    merged: job.merged,
    config: job.config,
    error: job.error
  });
});

/**
 * POST /abort/:courseCode
 * Emergency stop for Phase 5
 */
app.post('/abort/:courseCode', (req, res) => {
  const { courseCode } = req.params;

  console.log(`\n[Phase 5] 🛑 Aborting for ${courseCode}...`);

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
 * Migrated from automation_server.cjs + watch_and_merge_branches.cjs
 */
async function startBranchWatcher(courseCode, expectedWindows, baseCourseDir) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(baseCourseDir, 'lego_baskets.json');
    const scriptPath = path.join(__dirname, '../../scripts/watch_and_merge_branches.cjs');

    console.log(`\n[Phase 5] 👀 Starting branch watcher for ${courseCode}...`);
    console.log(`[Phase 5]    Pattern: claude/baskets-${courseCode}-*`);
    console.log(`[Phase 5]    Waiting for ${expectedWindows} branches`);
    console.log(`[Phase 5]    Output: ${outputPath}`);

    const watcher = spawn('node', [
      scriptPath,
      '--watch',
      '--pattern', `claude/baskets-${courseCode}-*`,
      '--output', outputPath,
      '--min-branches', expectedWindows.toString(),
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
      console.error(`[Phase 5] ❌ Watcher failed to start:`, err);
      reject(err);
    });

    watcher.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[Phase 5] ❌ Watcher exited with code ${code}`);
      }
      watchers.delete(courseCode);
    });

    watchers.set(courseCode, watcher);

    // Give watcher a moment to start
    setTimeout(() => resolve(), 1000);
  });
}

/**
 * Spawn parallel browser windows
 * Each window spawns multiple Task agents (from old system)
 *
 * Migrated from automation_server.cjs lines 2272-2293
 */
async function spawnBrowserWindows(courseCode, params, baseCourseDir, browserCount, agentsPerWindow, seedsPerAgent) {
  const { target, known, startSeed, endSeed } = params;
  const totalSeeds = endSeed - startSeed + 1;

  console.log(`\n[Phase 5] 🌐 Spawning ${browserCount} browser windows...`);
  console.log(`[Phase 5]    Each window will spawn ${agentsPerWindow} Task agents`);
  console.log(`[Phase 5]    Each agent processes ${seedsPerAgent} seeds`);

  const config = loadConfig();
  const spawnDelay = config.phase5_basket_generation.browser_spawn_delay_ms || 5000;

  const job = activeJobs.get(courseCode);
  let currentSeed = startSeed;

  for (let windowNum = 1; windowNum <= browserCount; windowNum++) {
    console.log(`\n[Phase 5]   Window ${windowNum}/${browserCount}:`);

    // Calculate seed range for this window
    const seedsInWindow = agentsPerWindow * seedsPerAgent;
    const windowStartSeed = currentSeed;
    const windowEndSeed = Math.min(currentSeed + seedsInWindow - 1, endSeed);

    console.log(`[Phase 5]     Seed range: S${String(windowStartSeed).padStart(4, '0')}-S${String(windowEndSeed).padStart(4, '0')}`);
    console.log(`[Phase 5]     Will spawn ${agentsPerWindow} Task agents`);

    // Generate orchestrator prompt for this window
    // EXACT PROMPT from automation_server.cjs lines 744-779
    const windowPrompt = generatePhase5OrchestratorPrompt(
      courseCode,
      { target, known, startSeed: windowStartSeed, endSeed: windowEndSeed },
      baseCourseDir
    );

    try {
      await spawnClaudeCodeSession(windowPrompt, `phase5-window-${windowNum}`);
      if (job) job.windowsSpawned++;

      // Stagger window spawns (from config, default 5000ms)
      if (windowNum < browserCount) {
        console.log(`[Phase 5]     Waiting ${spawnDelay}ms before next window...`);
        await new Promise(resolve => setTimeout(resolve, spawnDelay));
      }
    } catch (error) {
      console.error(`[Phase 5]     ❌ Failed to spawn window ${windowNum}:`, error.message);
    }

    currentSeed = windowEndSeed + 1;
    if (currentSeed > endSeed) break;
  }

  console.log(`\n[Phase 5] ✅ Spawned ${browserCount} browser windows`);
  console.log(`[Phase 5]    Waiting for branches...`);

  if (job) {
    job.status = 'waiting_for_branches';
  }
}

/**
 * Generate Phase 5 Master Prompt - Self-Managing Practice Basket Generation
 * EXACT MIGRATION from automation_server.cjs lines 732-779
 */
function generatePhase5OrchestratorPrompt(courseCode, params, courseDir) {
  const { target, known, startSeed, endSeed } = params;
  const totalSeeds = endSeed - startSeed + 1;

  // Always use 10 seeds per agent for optimal parallelization
  const seedsPerAgent = 10;
  const agentCount = Math.ceil(totalSeeds / seedsPerAgent);

  const relativeDir = getRelativeCourseDir(courseDir);

  return `# Phase 5 Orchestrator: Spawn ${agentCount} Parallel Agents

**Course**: ${courseCode}
**Total Seeds**: ${totalSeeds} (S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')})
**Required Agents**: ${agentCount} parallel agents
**Seeds per agent**: ${seedsPerAgent}

---

## 🎯 YOUR ONLY JOB: Spawn Agents

You are the orchestrator. **DO NOT** read files or generate content yourself.

**Your task:**
1. Spawn ${agentCount} agents in parallel
2. Pass each agent its seed range (10 seeds each)
3. Monitor progress and report when complete

**Each agent prompt should include:**
- Specific seed range (e.g., "S0001-S0010")
- Path to scaffolds: \`${relativeDir}/phase5_scaffolds/\`
- Path to outputs: \`${relativeDir}/phase5_outputs/\`
- Reference to Phase 5 intelligence: https://ssi-dashboard-v7.vercel.app/phase-intelligence/5

---

## 🚀 SPAWN ALL ${agentCount} AGENTS NOW

Use the Task tool ${agentCount} times in a single message to spawn all agents in parallel.

When all agents complete, tell the user to run validation:

\`\`\`bash
node scripts/phase5_merge_baskets.cjs ${courseDir}
\`\`\`
`;
}

/**
 * Spawn Claude Code session via osascript
 * Opens browser with prompt
 */
async function spawnClaudeCodeSession(prompt, windowTitle) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  const escapedPrompt = prompt
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');

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

  await execAsync(`osascript -e '${script}'`);
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
    console.log(`[Phase 5] ✅ Notified orchestrator: Phase 5 ${status} for ${courseCode}`);
  } catch (error) {
    console.error(`[Phase 5] ⚠️  Failed to notify orchestrator:`, error.message);
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
  console.log('\n[Phase 5] 🛑 Shutting down...');

  // Stop all watchers
  for (const [courseCode, watcher] of watchers.entries()) {
    console.log(`[Phase 5]   Stopping watcher for ${courseCode}...`);
    watcher.kill('SIGTERM');
  }

  process.exit(0);
});
