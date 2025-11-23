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
const AGENT_SPAWN_DELAY = process.env.AGENT_SPAWN_DELAY || 6000; // 6s to avoid clipboard race

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
1. Write the seed_pairs.json file to \`public/vfs/courses/${courseCode}/seed_pairs.json\`
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

      // Look for ANY recent claude/* branches (Claude Code auto-generates names)
      const result = await execAsync(
        `git branch -r --sort=-committerdate | grep "origin/claude/" | head -5 || true`,
        { cwd: VFS_ROOT }
      );

      const recentBranches = result.stdout
        .split('\n')
        .filter(b => b.trim())
        .map(b => b.trim().replace('origin/', ''));

      // Check each recent branch for seed_pairs.json in the course directory
      for (const branchName of recentBranches) {
        try {
          const checkFile = await execAsync(
            `git ls-tree -r origin/${branchName} --name-only | grep "courses/${courseCode}/seed_pairs.json" || true`,
            { cwd: VFS_ROOT }
          );

          if (checkFile.stdout.trim()) {
            console.log(`\n📦 Found Phase 1 output in branch: ${branchName}`);
            console.log(`   File: courses/${courseCode}/seed_pairs.json`);
            console.log(`   Merging branch...`);

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
                job.branchesDetected = 1;
              }

              // Notify orchestrator
              await notifyOrchestrator(courseCode, 'complete');

              // Stop watching
              clearInterval(watchInterval);
              watchers.delete(courseCode);
              return; // Exit the loop once merged
            } catch (mergeError) {
              console.error(`   ❌ Failed to merge ${branchName}:`, mergeError.message);
            }
          }
        } catch (checkError) {
          // Branch doesn't have our file, skip it
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
 * POST /upload-translations - Receive translations directly from Claude Code agents
 *
 * Body: {
 *   course: 'cmn_for_eng',
 *   seedId: 'S0532',
 *   agentId: 'agent-01',
 *   translation: ['English sentence', '中文翻译']
 * }
 */
app.post('/upload-translations', async (req, res) => {
  try {
    const { course, seedId, translation, agentId } = req.body;

    if (!course || !seedId || !translation) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: course, seedId, translation'
      });
    }

    if (!Array.isArray(translation) || translation.length !== 2) {
      return res.status(400).json({
        success: false,
        error: 'translation must be an array of [known, target] strings'
      });
    }

    console.log(`📥 Receiving translation: ${course} / ${seedId} (${translation[0]})${agentId ? ` from ${agentId}` : ''}`);

    // Course directory
    const courseDir = path.join(VFS_ROOT || process.cwd(), 'public/vfs/courses', course);
    const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
    const phase1OutputsDir = path.join(courseDir, 'phase1_outputs');

    // Ensure directories exist
    await fs.ensureDir(phase1OutputsDir);

    // Save individual translation file
    const translationFilePath = path.join(phase1OutputsDir, `seed_${seedId}_translation.json`);
    await fs.writeJson(translationFilePath, { seedId, translation, agentId, timestamp: new Date().toISOString() }, { spaces: 2 });
    console.log(`   💾 Saved to ${translationFilePath}`);

    // Load or create seed_pairs.json
    let seedPairs = {
      version: '7.7.1',
      course,
      target_language: course.split('_')[0], // e.g., 'cmn' from 'cmn_for_eng'
      known_language: course.split('_')[2] || 'eng', // e.g., 'eng' from 'cmn_for_eng'
      seed_range: { start: 1, end: 0 },
      generated: new Date().toISOString(),
      total_seeds: 0,
      actual_seeds: 0,
      translations: {},
      metadata: {}
    };

    if (await fs.pathExists(seedPairsPath)) {
      seedPairs = await fs.readJson(seedPairsPath);
    }

    // Add or update translation
    const isNew = !seedPairs.translations[seedId];
    seedPairs.translations[seedId] = translation;

    // Update counts
    const totalTranslations = Object.keys(seedPairs.translations).length;
    seedPairs.total_seeds = totalTranslations;
    seedPairs.actual_seeds = totalTranslations;

    // Update seed range
    const seedNumbers = Object.keys(seedPairs.translations)
      .map(id => parseInt(id.replace('S', '')))
      .filter(n => !isNaN(n));

    if (seedNumbers.length > 0) {
      seedPairs.seed_range.start = Math.min(...seedNumbers);
      seedPairs.seed_range.end = Math.max(...seedNumbers);
    }

    // Update metadata with enhanced tracking
    if (!seedPairs.metadata.uploads) {
      seedPairs.metadata.uploads = [];
    }

    seedPairs.metadata = {
      ...seedPairs.metadata,
      last_upload: new Date().toISOString(),
      last_seed: seedId,
      last_agent: agentId || 'unknown',
      total_translations: totalTranslations
    };

    // Record upload event (keep last 50)
    seedPairs.metadata.uploads.push({
      timestamp: new Date().toISOString(),
      seedId,
      agentId: agentId || 'unknown',
      isNew,
      totalAfter: totalTranslations
    });

    if (seedPairs.metadata.uploads.length > 50) {
      seedPairs.metadata.uploads = seedPairs.metadata.uploads.slice(-50);
    }

    // Save merged file
    await fs.writeJson(seedPairsPath, seedPairs, { spaces: 2 });

    console.log(`   ✅ Merged into seed_pairs.json (${isNew ? 'new' : 'updated'})`);
    console.log(`   📊 Total translations: ${totalTranslations}`);

    res.json({
      success: true,
      seedId,
      agentId: agentId || 'unknown',
      timestamp: new Date().toISOString(),
      isNew,
      totalTranslations
    });

  } catch (error) {
    console.error('❌ Upload translation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
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
 * Verify seed_pairs.json was created and run Phase 2 collision check
 * (LUT - Learner Uncertainty Test)
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

      // Run Phase 2: Collision Check (LUT - Learner Uncertainty Test)
      console.log(`\n🔍 Running Phase 2: LUT Collision Check...`);
      await runPhase2CollisionCheck(courseDir, seedPairsPath);

    } catch (error) {
      console.error(`⚠️  Error reading seed_pairs.json:`, error.message);
    }
  } else {
    console.log(`⚠️  Warning: seed_pairs.json not found yet`);
  }
}

/**
 * Run Phase 2: LUT Collision Check
 * Checks if same KNOWN phrase maps to multiple TARGET translations
 */
async function runPhase2CollisionCheck(courseDir, seedPairsPath) {
  const phase2Script = path.join(__dirname, '../../scripts/phase2_collision_check.cjs');

  return new Promise((resolve, reject) => {
    const child = spawn('node', [phase2Script, seedPairsPath], {
      cwd: courseDir,
      stdio: 'inherit' // Show output directly
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Phase 2: No FD violations detected\n`);
        resolve();
      } else {
        console.warn(`⚠️  Phase 2: Found FD violations (see report above)\n`);
        // Don't fail the whole phase - just warn
        resolve();
      }
    });

    child.on('error', (err) => {
      console.error(`⚠️  Phase 2 check failed:`, err.message);
      resolve(); // Continue anyway
    });
  });
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
