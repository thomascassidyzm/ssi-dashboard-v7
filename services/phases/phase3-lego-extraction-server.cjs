#!/usr/bin/env node

/**
 * Phase 3: LEGO Extraction Server
 *
 * Responsibilities:
 * - Spawn parallel Claude Code browser sessions for LEGO extraction
 * - Watch for phase3-segment-* branches (using watch_and_merge_branches.cjs)
 * - Auto-merge segments when all agents complete
 * - Validate LEGO quality (FD compliance, complete tiling)
 * - Write lego_pairs.json to VFS
 * - Report completion to orchestrator
 *
 * Port: 3458 (auto-configured by start-automation.js)
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// Load environment (set by start-automation.js)
const PORT = process.env.PORT || 3458;
const VFS_ROOT = process.env.VFS_ROOT;
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
const SERVICE_NAME = process.env.SERVICE_NAME || 'Phase 3 (LEGO Extraction)';

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
 * - quick_test: 5 windows × 2 agents × 1 seed = 10 seeds (testing)
 * - balanced: 10 windows × 7 agents × 10 seeds = 700 seeds (DEFAULT)
 * - fast: 20 windows × 10 agents × 5 seeds = 1000 seeds (faster, more RAM)
 * - custom: User-specified values
 */
function calculateParallelization(strategy, totalSeeds, custom = {}) {
  let config;

  switch (strategy) {
    case 'quick_test':
      config = {
        browserWindows: 5,
        agentsPerWindow: 2,
        seedsPerAgent: 1
      };
      break;

    case 'balanced':
      config = {
        browserWindows: 10,
        agentsPerWindow: 7,
        seedsPerAgent: 10
      };
      break;

    case 'fast':
      config = {
        browserWindows: 20,
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
 * Start Phase 3 LEGO extraction for a course
 *
 * Body: {
 *   courseCode: string,
 *   totalSeeds: number,
 *
 *   // Parallelization strategy (choose one):
 *   strategy?: 'balanced' | 'fast' | 'quick_test' | 'custom'
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
    return res.status(409).json({ error: `Phase 3 already running for ${courseCode}` });
  }

  // Calculate parallelization strategy
  const config = calculateParallelization(strategy, totalSeeds, {
    browserWindows,
    agentsPerWindow,
    seedsPerAgent
  });

  console.log(`\n🚀 Starting Phase 3 for ${courseCode}`);
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
    segmentsDetected: 0,
    merged: false,
    error: null
  };

  activeJobs.set(courseCode, job);

  try {
    // Start branch watcher for phase3-segment-* branches
    await startBranchWatcher(courseCode, config.browserWindows);

    // Spawn parallel browser windows (each will spawn sub-agents)
    await spawnBrowserWindows(courseCode, totalSeeds, config);

    res.json({
      success: true,
      message: `Phase 3 started for ${courseCode}`,
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

    res.status(500).json({
      error: 'Failed to start Phase 3',
      details: error.message
    });
  }
});

/**
 * Start branch watcher for phase3-segment-* branches
 */
async function startBranchWatcher(courseCode, expectedSegments) {
  const watcherScript = path.join(__dirname, '../orchestration/watch_and_merge_branches.cjs');

  if (!await fs.pathExists(watcherScript)) {
    throw new Error('Branch watcher script not found: watch_and_merge_branches.cjs');
  }

  console.log(`\n👁️  Starting branch watcher for ${courseCode}`);
  console.log(`   Expected segments: ${expectedSegments}`);
  console.log(`   Branch pattern: phase3-segment-*-${courseCode}`);

  const watcher = spawn('node', [
    watcherScript,
    courseCode,
    'phase3',
    expectedSegments.toString()
  ], {
    stdio: 'inherit',
    env: {
      ...process.env,
      VFS_ROOT,
      ORCHESTRATOR_URL
    }
  });

  watcher.on('error', (err) => {
    console.error(`❌ Branch watcher error:`, err);
  });

  watcher.on('exit', (code) => {
    console.log(`✅ Branch watcher exited with code ${code}`);
    watchers.delete(courseCode);
  });

  watchers.set(courseCode, watcher);
}

/**
 * Spawn browser windows for parallel LEGO extraction
 */
async function spawnBrowserWindows(courseCode, totalSeeds, config) {
  const { browserWindows, agentsPerWindow, seedsPerAgent } = config;

  console.log(`\n🌐 Spawning ${browserWindows} browser windows...`);

  const seedsPerWindow = agentsPerWindow * seedsPerAgent;

  for (let i = 0; i < browserWindows; i++) {
    const startSeed = (i * seedsPerWindow) + 1;
    const endSeed = Math.min(startSeed + seedsPerWindow - 1, totalSeeds);

    console.log(`   Window ${i + 1}/${browserWindows}: Seeds ${startSeed}-${endSeed}`);

    // Generate master prompt for this window
    const prompt = generatePhase3MasterPrompt(courseCode, {
      startSeed,
      endSeed,
      agentCount: agentsPerWindow,
      seedsPerAgent
    });

    // Spawn browser window (opens claude.ai)
    // In production, this would use Playwright/Puppeteer
    // For now, just log the prompt
    console.log(`\n📝 Prompt for Window ${i + 1}:`);
    console.log(prompt);
    console.log('\n' + '='.repeat(80) + '\n');
  }

  const job = activeJobs.get(courseCode);
  if (job) {
    job.windowsSpawned = browserWindows;
    job.status = 'running';
  }
}

/**
 * Generate Phase 3 master prompt for a browser window
 */
function generatePhase3MasterPrompt(courseCode, params) {
  const { startSeed, endSeed, agentCount, seedsPerAgent } = params;
  const totalSeeds = endSeed - startSeed + 1;
  const segmentNum = Math.floor((startSeed - 1) / 100) + 1;

  return `# Phase 3 Master Orchestrator: LEGO Extraction (Window ${segmentNum})

**Course**: ${courseCode}
**Seeds**: ${totalSeeds} (S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')})
**Sub-Agents**: ${agentCount} parallel agents
**Seeds per agent**: ${seedsPerAgent}

---

## 🎯 YOUR MISSION

You are the **Master Orchestrator** for this segment. Your job is to:

1. **Read Phase 3 intelligence** from \`public/docs/phase_intelligence/phase_3.md\` (v7.0)
2. **Spawn ${agentCount} sub-agents in parallel** (ONE message with ${agentCount} Task tool calls)
3. **Each sub-agent extracts ${seedsPerAgent} seeds** with IDENTICAL prompt (only seed range differs)
4. **Wait for all ${agentCount} to complete**
5. **Verify all sub-agents committed to branch**: \`phase3-segment-${segmentNum}-${courseCode}\`
6. **Done** - Branch watcher auto-merges when all segments complete

**CRITICAL**: Use ONE message with multiple Task tool calls to spawn all agents simultaneously.

**OUTPUT METHOD**: All agents commit to segment-specific branch:
- Branch name: \`phase3-segment-${segmentNum}-${courseCode}\`
- All ${agentCount} agents push to SAME branch (git handles concurrent commits)

---

## 📚 PHASE 3 INTELLIGENCE (v7.0 - Examples-First Edition)

**YOU AND YOUR SUB-AGENTS MUST READ**: \`public/docs/phase_intelligence/phase_3.md\`

This file contains the complete Phase 3 methodology through three examples:
- **Two Core Heuristics**: Remove learner uncertainty, Maximize patterns with minimum vocab
- **Example 1**: Word order differences (English→Spanish)
- **Example 2**: Complex construction (English→Mandarin)
- **Example 3**: Multi-language demonstration
- **Quality checklist**: FD compliance, complete tiling, componentization

---

## 🚀 SUB-AGENT SPAWNING

Spawn ${agentCount} sub-agents, each handling ${seedsPerAgent} seeds.

**Seed distribution**:
${Array.from({length: agentCount}, (_, i) => {
  const agentStart = startSeed + (i * seedsPerAgent);
  const agentEnd = Math.min(startSeed + ((i + 1) * seedsPerAgent) - 1, endSeed);
  return `- Agent ${i + 1}: S${String(agentStart).padStart(4, '0')}-S${String(agentEnd).padStart(4, '0')}`;
}).join('\n')}

**Input file**: \`public/vfs/courses/${courseCode}/seed_pairs.json\`

---

## 📋 SUB-AGENT PROMPT TEMPLATE

**CRITICAL**: Give IDENTICAL prompts to all ${agentCount} agents - only the seed range changes!

\`\`\`markdown
# Phase 3 Sub-Agent: Extract S00XX-S00YY

## 📚 STEP 1: READ PHASE INTELLIGENCE

**Read this file NOW** (v7.0 - Examples-First Edition):
- \`public/docs/phase_intelligence/phase_3.md\`

This is the **ONLY authoritative source** for Phase 3 extraction.

---

## 🚨 STEP 2: TWO CORE HEURISTICS (From Intelligence Doc)

**Heuristic 1: Remove Learner Uncertainty**
When learner hears KNOWN phrase → ZERO uncertainty about TARGET phrase

**Heuristic 2: Maximize Patterns with Minimum Vocab**
Create overlapping chunks → each LEGO generates multiple sentence patterns

**All extraction strategies serve these two goals.**

---

## 📖 STEP 3: YOUR ASSIGNMENT

**Extract LEGOs from**: Seeds S00XX through S00YY (${seedsPerAgent} seeds)

**Get seed_pairs.json from**: \`public/vfs/courses/${courseCode}/seed_pairs.json\`

---

## 🔄 STEP 4: EXTRACT (Per Seed)

For EACH of your ${seedsPerAgent} seeds:

1. **Chunk KNOWN first** - Bidirectional sweep (forward + backward)
2. **Map to TARGET** - Find corresponding TARGET chunks
3. **Apply FD test** - Known → exactly ONE Target? (zero uncertainty)
4. **If FD fails** - Chunk UP (make it bigger with context)
5. **Check registry** - Any FCFS collisions? (use larger chunk if collision)
6. **Extract BOTH A+M** - Overlapping coverage (same words in both types)
7. **Componentize M-types** - ALL words in components array
8. **Verify tiling** - Perfect reconstruction from LEGOs

---

## 📤 STEP 5: OUTPUT

**Branch**: \`phase3-segment-${segmentNum}-${courseCode}\`

**File**: \`public/vfs/courses/${courseCode}/segments/segment_${segmentNum}/agent_XX_output.json\`

**Format**:
\`\`\`json
{
  "agent_id": "agent_0X",
  "seed_range": "S00XX-S00YY",
  "extracted_at": "2025-11-15T...",
  "methodology": "Phase 3 v5.0 - Functional Determinism",
  "seeds": [
    {
      "seed_id": "S00XX",
      "seed_pair": {
        "target": "...",
        "known": "..."
      },
      "legos": [
        {
          "provisional_id": "PROV_S00XX_01",
          "type": "A" | "M",
          "target": "...",
          "known": "...",
          "new": true,
          "components": [["target_word", "known_word"]]  // M-types only
        }
      ]
    }
  ]
}
\`\`\`

**Commit and push**:
\`\`\`bash
git checkout -b phase3-segment-${segmentNum}-${courseCode}
git add public/vfs/courses/${courseCode}/segments/segment_${segmentNum}/agent_XX_output.json
git commit -m "Phase 3: Agent XX extracts S00XX-S00YY"
git push origin phase3-segment-${segmentNum}-${courseCode}
\`\`\`

---

## ✅ STEP 6: VERIFY

After committing, verify:
1. File exists in branch: \`phase3-segment-${segmentNum}-${courseCode}\`
2. All ${seedsPerAgent} seeds extracted
3. All LEGOs have correct format (A/M type, components for M)
4. Complete tiling verified (seeds reconstruct from LEGOs)

Done! Branch watcher will auto-merge when all segments complete.
\`\`\`

---

## 🎬 ACTION

**Spawn all ${agentCount} agents NOW** using ONE message with ${agentCount} Task tool calls!`;
}

/**
 * GET /status/:courseCode
 * Get current Phase 3 status
 */
app.get('/status/:courseCode', (req, res) => {
  const { courseCode } = req.params;

  const job = activeJobs.get(courseCode);

  if (!job) {
    return res.status(404).json({ error: 'No Phase 3 job found for this course' });
  }

  res.json(job);
});

/**
 * POST /stop/:courseCode
 * Stop Phase 3 for a course
 */
app.post('/stop/:courseCode', async (req, res) => {
  const { courseCode } = req.params;

  const job = activeJobs.get(courseCode);
  if (!job) {
    return res.status(404).json({ error: 'No Phase 3 job found for this course' });
  }

  // Kill branch watcher
  const watcher = watchers.get(courseCode);
  if (watcher) {
    watcher.kill();
    watchers.delete(courseCode);
  }

  activeJobs.delete(courseCode);

  res.json({
    success: true,
    message: `Phase 3 stopped for ${courseCode}`
  });
});

/**
 * GET /health
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    status: 'running',
    port: PORT,
    activeJobs: activeJobs.size
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ ${SERVICE_NAME} listening on port ${PORT}`);
});
