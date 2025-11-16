#!/usr/bin/env node

/**
 * Phase 1: Translation Server
 *
 * Responsibilities:
 * - Spawn parallel Claude Code browser sessions for translation
 * - Coordinate multiple translation agents (typically 70 seeds/agent)
 * - Watch for phase1-* branches
 * - Merge translation outputs into seed_pairs.json
 * - Validate translation quality
 * - Write seed_pairs.json to VFS
 * - Report completion to orchestrator
 *
 * Port: 3457 (auto-configured by start-automation.js)
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { spawn, execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(require('child_process').exec);

// Load environment (set by start-automation.js)
const PORT = process.env.PORT || 3457;
const VFS_ROOT = process.env.VFS_ROOT;
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
const SERVICE_NAME = process.env.SERVICE_NAME || 'Phase 1 (Translation)';
const AGENT_SPAWN_DELAY = process.env.AGENT_SPAWN_DELAY || 3000;

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
 * Language code to full name mapping
 */
function getLanguageName(code) {
  const names = {
    'eng': 'English',
    'ita': 'Italian',
    'spa': 'Spanish',
    'fra': 'French',
    'gle': 'Irish',
    'cym': 'Welsh',
    'cmn': 'Mandarin Chinese',
    'mkd': 'Macedonian',
    'deu': 'German',
    'por': 'Portuguese',
    'nld': 'Dutch',
    'swe': 'Swedish',
    'nor': 'Norwegian',
    'dan': 'Danish',
    'fin': 'Finnish',
    'jpn': 'Japanese',
    'kor': 'Korean',
    'rus': 'Russian',
    'ara': 'Arabic',
    'hin': 'Hindi'
  };
  return names[code.toLowerCase()] || code.toUpperCase();
}

/**
 * Generate Phase 1 Master Prompt
 * Creates a prompt that spawns parallel translation agents
 */
function generatePhase1MasterPrompt(courseCode, params, courseDir) {
  const { target, known, startSeed, endSeed } = params;
  const totalSeeds = endSeed - startSeed + 1;

  // SEQUENTIAL PROCESSING: One agent handles all seeds for consistency
  // Critical for maintaining:
  // - Cognate preference (trabajar vs laborer)
  // - Zero variation (same translation for repeated concepts)
  // - Consistent register (formal/informal choices)
  const seedsPerAgent = totalSeeds;
  const agentCount = 1;

  return `# Phase 1: Pedagogical Translation (Sequential)

**Course**: ${courseCode}
**Target Language**: ${target} (${getLanguageName(target)})
**Known Language**: ${known} (${getLanguageName(known)})
**Total Seeds**: ${totalSeeds} (S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')})
**Processing Mode**: Sequential (single agent for consistency)

---

## Your Mission

Translate all ${totalSeeds} canonical seeds into ${getLanguageName(target)} and ${getLanguageName(known)}.

**CRITICAL**: You must maintain translation consistency across ALL seeds:
- Use the SAME translation for repeated concepts
- Follow cognate preference rules consistently
- Maintain consistent register (formal/informal) throughout

**Phase Intelligence**: https://ssi-dashboard-v7.vercel.app/intelligence (Phase 1 - v2.6)

**Canonical Seeds**: https://ssi-dashboard-v7.vercel.app/api/seeds?limit=${endSeed}

---

## Instructions

1. **Fetch Phase 1 intelligence**: https://ssi-dashboard-v7.vercel.app/intelligence (Phase 1 - v2.6)
   Read the complete methodology before starting

2. **Fetch canonical seeds**: https://ssi-dashboard-v7.vercel.app/api/seeds?limit=${endSeed}
   You need all ${totalSeeds} seeds for context

3. **Translate sequentially** (seeds ${startSeed} through ${endSeed}):
   - Replace {target} placeholder with "${getLanguageName(target)}"
   - Translate to ${getLanguageName(target)} (target language)
   - Translate to ${getLanguageName(known)} (known language)
   - **Maintain a glossary** as you work - if you translate "work" as "trabajar" once, use "trabajar" every time
   - Follow Phase 1 intelligence rules strictly

## CRITICAL: {target} Placeholder
- Canonical: "I want to speak {target}"
- Replace with: "I want to speak ${getLanguageName(target)}"

## Output Format

Write to: \`public/vfs/courses/${courseCode}/seed_pairs.json\`

\`\`\`json
{
  "course_code": "${courseCode}",
  "generated_at": "<ISO timestamp>",
  "methodology": "Phase 1 v2.6 - Pedagogical Translation",
  "target_language": "${target}",
  "known_language": "${known}",
  "total_seeds": ${totalSeeds},
  "translations": {
    "S${String(startSeed).padStart(4, '0')}": ["${target} translation", "${known} translation"],
    "S${String(startSeed + 1).padStart(4, '0')}": ["${target} translation", "${known} translation"]
  }
}
\`\`\`

**After completing all translations:**
1. Write the seed_pairs.json file
2. Commit and push to your Claude Code session branch

---

**Target completion time**: ~10 minutes for ${totalSeeds} seeds (Sonnet 4.5 is fast!)
`;
}

/**
 * POST /start
 * Start Phase 1 translation for a course
 *
 * Body: {
 *   courseCode: string,
 *   totalSeeds: number,
 *   target: string,    // e.g., 'spa', 'cmn'
 *   known: string,     // e.g., 'eng'
 *   startSeed?: number,
 *   endSeed?: number
 * }
 */
app.post('/start', async (req, res) => {
  const {
    courseCode,
    totalSeeds,
    target,
    known,
    startSeed = 1,
    endSeed = totalSeeds
  } = req.body;

  if (!courseCode || !totalSeeds || !target || !known) {
    return res.status(400).json({
      error: 'courseCode, totalSeeds, target, and known are required'
    });
  }

  // Check if already running
  if (activeJobs.has(courseCode)) {
    return res.status(409).json({
      error: `Phase 1 already running for ${courseCode}`
    });
  }

  console.log(`\n🚀 Starting Phase 1 for ${courseCode}`);
  console.log(`   Target: ${getLanguageName(target)}`);
  console.log(`   Known: ${getLanguageName(known)}`);
  console.log(`   Total seeds: ${totalSeeds}`);
  console.log(`   Range: S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')}`);

  // Sequential processing for consistency
  const seedsPerAgent = totalSeeds;
  const agentCount = 1;

  console.log(`   Mode: Sequential (1 agent for all ${totalSeeds} seeds)`);

  // Initialize job state
  const job = {
    courseCode,
    totalSeeds,
    target,
    known,
    startSeed,
    endSeed,
    agentCount,
    status: 'spawning_orchestrator',
    startedAt: new Date().toISOString(),
    orchestratorSpawned: false,
    branchesDetected: 0,
    merged: false,
    error: null
  };

  activeJobs.set(courseCode, job);

  try {
    // Ensure course directory exists
    const courseDir = path.join(VFS_ROOT, courseCode);
    await fs.ensureDir(courseDir);
    await fs.ensureDir(path.join(courseDir, 'translations'));

    // Start branch watcher for phase1-* branches
    await startBranchWatcher(courseCode, agentCount);

    // Spawn master orchestrator in browser
    await spawnMasterOrchestrator(courseCode, {
      target,
      known,
      startSeed,
      endSeed
    }, courseDir);

    res.json({
      success: true,
      message: `Phase 1 started for ${courseCode}`,
      job: {
        courseCode,
        totalSeeds,
        target: getLanguageName(target),
        known: getLanguageName(known),
        agentCount,
        status: 'running'
      }
    });
  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    activeJobs.delete(courseCode);

    console.error(`❌ Failed to start Phase 1 for ${courseCode}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start branch watcher for phase1-* branches
 */
async function startBranchWatcher(courseCode, expectedAgents) {
  console.log(`\n👁️  Starting branch watcher for ${courseCode}`);
  console.log(`   Expected agents: ${expectedAgents}`);
  console.log(`   Branch pattern: claude/phase1-*${courseCode}*`);

  const job = activeJobs.get(courseCode);
  if (!job) return;

  // Poll for branches every 10 seconds
  const watchInterval = setInterval(async () => {
    try {
      // Fetch latest from remote
      await execAsync('git fetch --all', { cwd: VFS_ROOT });

      // Look for Phase 1 branches for this course
      const result = await execAsync(
        `git branch -r | grep "claude/phase1.*${courseCode}" || true`,
        { cwd: VFS_ROOT }
      );

      const branches = result.stdout
        .split('\n')
        .filter(b => b.trim())
        .map(b => b.trim().replace('origin/', ''));

      if (branches.length > 0) {
        console.log(`\n📦 Detected ${branches.length} Phase 1 branch(es) for ${courseCode}`);

        // Merge the first branch (sequential mode = only 1 branch expected)
        const branchName = branches[0];
        console.log(`   Merging: ${branchName}`);

        try {
          // Switch to main and merge
          await execAsync('git checkout main', { cwd: VFS_ROOT });
          await execAsync(`git merge origin/${branchName} --no-edit -m "Auto-merge Phase 1: ${courseCode}"`, { cwd: VFS_ROOT });
          console.log(`   ✅ Merged ${branchName} to main`);

          // Verify seed_pairs.json was created
          await mergeTranslations(courseCode);

          // Update job status
          if (job) {
            job.status = 'complete';
            job.merged = true;
          }

          // Notify orchestrator
          await notifyOrchestrator(courseCode, 'complete');

          // Stop watching
          clearInterval(watchInterval);
          watchers.delete(courseCode);
        } catch (mergeError) {
          console.error(`   ❌ Failed to merge ${branchName}:`, mergeError.message);
        }
      }
    } catch (error) {
      console.error(`⚠️  Branch watcher error:`, error.message);
    }
  }, 10000); // Check every 10 seconds

  watchers.set(courseCode, { interval: watchInterval });
  console.log(`   Watching for branches... (checking every 10s)`);
}

/**
 * Spawn master orchestrator in browser
 */
async function spawnMasterOrchestrator(courseCode, params, courseDir) {
  console.log(`\n🌐 Spawning Phase 1 master orchestrator...`);

  // Generate master prompt
  const prompt = generatePhase1MasterPrompt(courseCode, params, courseDir);

  // Import browser spawning utility
  const spawnClaudeWebAgent = await loadWebAgentSpawner();

  if (spawnClaudeWebAgent) {
    try {
      await spawnClaudeWebAgent(prompt, 1, 'safari');
      console.log(`✅ Master orchestrator spawned`);

      const job = activeJobs.get(courseCode);
      if (job) {
        job.orchestratorSpawned = true;
        job.status = 'waiting_for_completion';
      }
    } catch (error) {
      console.error(`❌ Failed to spawn orchestrator:`, error.message);
      throw error;
    }
  } else {
    // Fallback: just log the prompt
    console.log(`\n📝 Phase 1 Master Prompt:`);
    console.log(prompt);
    console.log('\n' + '='.repeat(80) + '\n');

    const job = activeJobs.get(courseCode);
    if (job) {
      job.status = 'prompt_ready';
    }
  }
}

/**
 * Load web agent spawner (if available)
 */
async function loadWebAgentSpawner() {
  try {
    const spawnerPath = path.join(__dirname, '../../spawn_claude_web_agent.cjs');
    if (await fs.pathExists(spawnerPath)) {
      const { spawnClaudeWebAgent } = require(spawnerPath);
      return spawnClaudeWebAgent;
    }
  } catch (error) {
    console.warn(`⚠️  Web agent spawner not available: ${error.message}`);
  }
  return null;
}

/**
 * GET /status/:courseCode
 * Get current Phase 1 status
 */
app.get('/status/:courseCode', (req, res) => {
  const { courseCode } = req.params;
  const job = activeJobs.get(courseCode);

  if (!job) {
    return res.status(404).json({
      error: `No Phase 1 job found for ${courseCode}`
    });
  }

  res.json(job);
});

/**
 * POST /stop/:courseCode
 * Stop Phase 1 for a course
 */
app.post('/stop/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const job = activeJobs.get(courseCode);

  if (!job) {
    return res.status(404).json({
      error: `No Phase 1 job found for ${courseCode}`
    });
  }

  console.log(`\n🛑 Stopping Phase 1 for ${courseCode}...`);

  // Kill branch watcher
  const watcher = watchers.get(courseCode);
  if (watcher && watcher.interval) {
    clearInterval(watcher.interval);
    watchers.delete(courseCode);
  }

  activeJobs.delete(courseCode);

  res.json({
    success: true,
    message: `Phase 1 stopped for ${courseCode}`
  });
});

/**
 * POST /phase-complete
 * Webhook for agents reporting completion
 */
app.post('/phase-complete', async (req, res) => {
  const { courseCode, agentId, status } = req.body;

  console.log(`\n✅ Agent ${agentId} ${status} for ${courseCode}`);

  const job = activeJobs.get(courseCode);
  if (!job) {
    return res.json({ acknowledged: true });
  }

  job.branchesDetected = (job.branchesDetected || 0) + 1;

  // Check if all agents complete
  if (job.branchesDetected >= job.agentCount) {
    console.log(`\n🎉 All agents complete for ${courseCode}!`);
    job.status = 'merging';

    // Merge all translation files
    await mergeTranslations(courseCode);

    job.status = 'complete';
    job.merged = true;

    // Notify orchestrator
    await notifyOrchestrator(courseCode, 'complete');
  }

  res.json({ acknowledged: true });
});

/**
 * Verify seed_pairs.json was created (sequential mode - agent writes directly)
 */
async function mergeTranslations(courseCode) {
  console.log(`\n✅ Verifying translations for ${courseCode}...`);

  const courseDir = path.join(VFS_ROOT, courseCode);
  const seedPairsPath = path.join(courseDir, 'seed_pairs.json');

  // In sequential mode, the agent writes seed_pairs.json directly
  // We just need to verify it exists and is valid
  if (await fs.pathExists(seedPairsPath)) {
    try {
      const data = await fs.readJson(seedPairsPath);
      const translationCount = Object.keys(data.translations || {}).length;
      console.log(`✅ Found seed_pairs.json with ${translationCount} translations`);
    } catch (error) {
      console.error(`⚠️  Error reading seed_pairs.json:`, error.message);
    }
  } else {
    console.log(`⚠️  Warning: seed_pairs.json not found yet`);
  }
}

/**
 * Notify orchestrator of phase completion
 */
async function notifyOrchestrator(courseCode, status) {
  try {
    const axios = require('axios');
    await axios.post(`${ORCHESTRATOR_URL}/phase-complete`, {
      phase: 1,
      courseCode,
      status,
      timestamp: new Date().toISOString()
    });
    console.log(`✅ Notified orchestrator: Phase 1 ${status} for ${courseCode}`);
  } catch (error) {
    console.error(`⚠️  Failed to notify orchestrator:`, error.message);
  }
}

/**
 * GET /health
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
  console.log('\n🛑 Shutting down Phase 1 server...');

  // Stop all watchers
  for (const [courseCode, watcher] of watchers.entries()) {
    console.log(`  Stopping watcher for ${courseCode}...`);
    if (watcher.interval) {
      clearInterval(watcher.interval);
    }
  }

  process.exit(0);
});
