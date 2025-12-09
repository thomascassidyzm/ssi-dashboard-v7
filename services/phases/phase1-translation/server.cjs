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
 * Reads v4.4 unified prompt from PROMPT.md and adds operational instructions
 */
function generatePhase1MasterPrompt(courseCode, params, courseDir) {
  const { target, known, startSeed, endSeed } = params;
  const totalSeeds = endSeed - startSeed + 1;
  const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';

  // Read the v4.4 unified prompt from PROMPT.md
  const promptPath = path.join(__dirname, 'PROMPT.md');
  let unifiedPrompt = '';
  try {
    unifiedPrompt = require('fs').readFileSync(promptPath, 'utf8');
  } catch (err) {
    console.error(`⚠️  Failed to read PROMPT.md: ${err.message}`);
    unifiedPrompt = '# Phase 1 Prompt Missing - check services/phases/phase1-translation/PROMPT.md';
  }

  return `# Phase 1: Translation + LEGO Extraction

**Course**: ${courseCode}
**Target**: ${getLanguageName(target)} (${target})
**Known**: ${getLanguageName(known)} (${known})
**Seeds**: ${totalSeeds} (S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')})

---

## 📥 STEP 1: FETCH CANONICAL SEEDS

**GET**: ${orchestratorUrl}/api/canonical-seeds?limit=${endSeed}

Returns all ${totalSeeds} seeds in English. You will translate each to ${getLanguageName(target)} and extract LEGOs.

---

## 📚 STEP 2: METHODOLOGY (READ CAREFULLY)

${unifiedPrompt}

---

## ✍️ STEP 3: PROCESS SEEDS (${startSeed}-${endSeed})

For EACH seed:
1. Translate to ${getLanguageName(target)} (following Translation Rules above)
2. Extract LEGOs (following LEGO Types and Algorithm above)
3. Mark embedded LEGOs as \`new: false\` (same-seed only!)
4. Output in EXACT format shown above

**CRITICAL - DO NOT CREATE SCRIPTS:**
- ❌ Do NOT write Python/Node/bash automation
- ✅ Process directly, seed by seed
- ✅ Build up the output array as you work

---

## 📊 STEP 4: REPORT PROGRESS (Every 50 Seeds)

**POST**: \`${orchestratorUrl}/api/courses/${courseCode}/progress\`

\`\`\`json
{
  "phase": 1,
  "updates": {
    "status": "running",
    "seedsCompleted": 50,
    "seedsTotal": ${totalSeeds},
    "currentSeed": "S0050"
  },
  "logMessage": "Completed S0050"
}
\`\`\`

---

## 📝 STEP 5: OUTPUT

Write to: \`public/vfs/courses/${courseCode}/draft_lego_pairs.json\`

The output is a JSON array of seed objects (see Output Format above).

**After completing all seeds:**
1. Write to \`public/vfs/courses/${courseCode}/draft_lego_pairs.json\`
2. POST completion to: \`${orchestratorUrl}/api/phase1/${courseCode}/submit\`

---

**Target**: ~${Math.ceil(totalSeeds / 60)} minutes for ${totalSeeds} seeds
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
    const spawnerPath = path.join(__dirname, '../../shared/spawn-agent.cjs');
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
 * POST /launch-15-masters
 * Launch 15-master orchestration for Phase 1 (Translation + LEGO Extraction)
 *
 * 15 masters × 15 workers × 3 seeds = 675 seeds (covers 668)
 */
app.post('/launch-15-masters', async (req, res) => {
  const { courseCode, target, known, totalSeeds = 668 } = req.body;

  if (!courseCode || !target || !known) {
    return res.status(400).json({ error: 'courseCode, target, known required' });
  }

  console.log(`\n[Phase 1] ====================================`);
  console.log(`[Phase 1] 15-MASTER PARALLEL LAUNCH`);
  console.log(`[Phase 1] ====================================`);
  console.log(`[Phase 1] Course: ${courseCode}`);
  console.log(`[Phase 1] Target: ${target}, Known: ${known}`);
  console.log(`[Phase 1] Total Seeds: ${totalSeeds}`);

  const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
  const courseDir = path.join(VFS_ROOT, courseCode);

  // Read the v4.4 unified prompt
  const promptPath = path.join(__dirname, 'PROMPT.md');
  let unifiedPrompt = '';
  try {
    unifiedPrompt = require('fs').readFileSync(promptPath, 'utf8');
  } catch (err) {
    return res.status(500).json({ error: `Failed to read PROMPT.md: ${err.message}` });
  }

  // Distribution: 15 masters, each spawns 15 workers, each does 3 seeds
  const mastersCount = 15;
  const workersPerMaster = 15;
  const seedsPerWorker = 3;
  const seedsPerMaster = workersPerMaster * seedsPerWorker; // 45 seeds per master

  console.log(`[Phase 1] Distribution: ${mastersCount} masters × ${workersPerMaster} workers × ${seedsPerWorker} seeds`);

  // Generate master assignments
  const masters = [];
  for (let m = 0; m < mastersCount; m++) {
    const startSeed = m * seedsPerMaster + 1;
    const endSeed = Math.min(startSeed + seedsPerMaster - 1, totalSeeds);

    if (startSeed > totalSeeds) break;

    // Divide into worker batches
    const workers = [];
    for (let w = 0; w < workersPerMaster; w++) {
      const workerStart = startSeed + w * seedsPerWorker;
      const workerEnd = Math.min(workerStart + seedsPerWorker - 1, endSeed);

      if (workerStart > endSeed) break;

      workers.push({
        workerNum: w + 1,
        startSeed: workerStart,
        endSeed: workerEnd,
        seedCount: workerEnd - workerStart + 1
      });
    }

    masters.push({
      masterNum: m + 1,
      name: `phase1_master_${String(m + 1).padStart(2, '0')}`,
      startSeed,
      endSeed,
      seedCount: endSeed - startSeed + 1,
      workers
    });
  }

  console.log(`[Phase 1] Created ${masters.length} master assignments`);

  // Generate master prompts
  const generateMasterPrompt = (master) => {
    const workerInstructions = master.workers.map(w =>
      `  - Worker ${w.workerNum}: Seeds S${String(w.startSeed).padStart(4, '0')}-S${String(w.endSeed).padStart(4, '0')} (${w.seedCount} seeds)`
    ).join('\n');

    return `# Phase 1 Master ${master.masterNum}: Translation + LEGO Extraction

**Course**: ${courseCode}
**Target**: ${getLanguageName(target)} (${target})
**Known**: ${getLanguageName(known)} (${known})
**Your Seeds**: S${String(master.startSeed).padStart(4, '0')}-S${String(master.endSeed).padStart(4, '0')} (${master.seedCount} seeds)

---

## YOUR ROLE: MASTER ORCHESTRATOR

You spawn ${master.workers.length} worker agents via Task tool. Each worker processes a batch of seeds.

**Worker assignments:**
${workerInstructions}

---

## STEP 1: SPAWN ALL WORKERS IN PARALLEL

Use the Task tool ${master.workers.length} times in a SINGLE message to spawn all workers in parallel.

Each worker prompt should include:
1. The seed range they process
2. Instructions to FETCH methodology from the API
3. The upload endpoint

**CRITICAL**: Workers fetch their own methodology - do NOT summarize or paraphrase it!

---

## WORKER PROMPT TEMPLATE

For each worker, use this prompt (fill in START and END seed numbers):

\`\`\`
# Phase 1 Worker: Seeds S[START]-S[END]

Course: ${courseCode}
Target: ${getLanguageName(target)}
Known: ${getLanguageName(known)}

## STEP 1: FETCH ZUT EXAMPLES (language-specific)

curl -s "${orchestratorUrl}/api/zut-examples/${known}/${target}"

This shows what FAILS and PASSES ZUT for ${getLanguageName(known)} → ${getLanguageName(target)}.

## STEP 2: FETCH METHODOLOGY

curl -s "${orchestratorUrl}/api/phase-intelligence/1"

Read BOTH responses before proceeding.

## STEP 3: FETCH YOUR SEEDS

curl -s "${orchestratorUrl}/api/canonical-seeds?start=[START]&end=[END]"

## STEP 4: PROCESS EACH SEED

Apply ZUT to every potential LEGO:
1. Translate seed to ${getLanguageName(target)}
2. For each chunk: does learner ALWAYS know what to produce?
3. If uncertain → chunk UP until zero ambiguity
4. Mark embedded chunks as new: 0

## STEP 5: UPLOAD (COMPACT FORMAT)

curl -X POST "${orchestratorUrl}/api/phase1/${courseCode}/upload-batch" \\
  -H "Content-Type: application/json" \\
  -d '[YOUR_COMPACT_JSON]'

**COMPACT FORMAT** (saves tokens):
\`\`\`json
[{"s":"S0001","k":"known text","t":"target text","l":[
  {"y":"A","n":1,"k":"I want","t":"quiero"},
  {"y":"M","n":1,"k":"in Spanish","t":"en español","c":[{"k":"Spanish","t":"español"}]}
]}]
\`\`\`
Keys: s=seed_id, k=known, t=target, l=legos, y=type, n=new(1/0), c=components
\`\`\`

---

## STEP 2: WAIT FOR COMPLETION

After spawning all workers, wait for their Task tool results.

## STEP 3: REPORT COMPLETION

When all workers complete, use curl to POST:

curl -X POST "${orchestratorUrl}/api/phase1/${courseCode}/master-complete" \\
  -H "Content-Type: application/json" \\
  -d '{"masterNum": ${master.masterNum}, "seedsProcessed": ${master.seedCount}}'

---

**DO NOT process seeds yourself - spawn workers and coordinate!**
**IMPORTANT: Use curl for all HTTP requests, NOT WebFetch!**
`;
  };

  // Save prompts and launch browsers
  const promptsDir = path.join(courseDir, 'phase1_master_prompts');
  await fs.ensureDir(promptsDir);

  for (const master of masters) {
    const prompt = generateMasterPrompt(master);
    await fs.writeFile(path.join(promptsDir, `${master.name}.md`), prompt);
  }

  console.log(`[Phase 1] ✅ Generated ${masters.length} master prompts in ${promptsDir}`);

  // Load web agent spawner
  const spawnClaudeWebAgent = await loadWebAgentSpawner();
  if (!spawnClaudeWebAgent) {
    return res.status(500).json({ error: 'Web agent spawner not available' });
  }

  // Launch all masters in Safari
  console.log(`[Phase 1] Launching ${masters.length} Safari windows...`);

  const launchResults = [];
  for (const master of masters) {
    try {
      const prompt = generateMasterPrompt(master);
      await spawnClaudeWebAgent(prompt, master.masterNum, 'safari');
      launchResults.push({ master: master.masterNum, status: 'launched' });
      console.log(`[Phase 1]   ✅ Master ${master.masterNum} launched`);

      // Delay between launches - needs to be long enough for Safari to load page and paste before next clipboard write
      // 8 seconds: 3s page load + 0.5s paste + 4.5s buffer to prevent clipboard race
      await new Promise(r => setTimeout(r, 8000));
    } catch (err) {
      launchResults.push({ master: master.masterNum, status: 'failed', error: err.message });
      console.error(`[Phase 1]   ❌ Master ${master.masterNum} failed: ${err.message}`);
    }
  }

  // Track the job
  activeJobs.set(courseCode, {
    status: 'running',
    masters: masters.length,
    totalSeeds,
    startedAt: new Date().toISOString(),
    launchResults
  });

  res.json({
    success: true,
    message: `Launched ${masters.length} masters for Phase 1`,
    courseCode,
    masters: masters.length,
    workersPerMaster,
    seedsPerWorker,
    totalSeeds,
    launchResults
  });
});

/**
 * Expand compact format to full format
 *
 * v6 Compact: {s, k, t, l: [{y, n, k, t, c?}]}
 * v7 Hybrid:  ["S0001", {k,t}, [[type, new, {k,t}, ?[{k,t}...]]]]
 * Full: {seed_id, seed_pair: {known, target}, legos: [{id, type, new, lego: {known, target}, components?}]}
 */
function expandCompactFormat(compactData) {
  return compactData.map(seed => {
    // Check if already in full format
    if (seed.seed_id) return seed;

    // v7 Hybrid format: array-based
    // ["S0001", {k:"known",t:"target"}, [[type, new, {k,t}, ?components]]]
    if (Array.isArray(seed)) {
      const [seedId, seedPair, legos] = seed;
      return {
        seed_id: seedId,
        seed_pair: {
          known: seedPair.k,
          target: seedPair.t
        },
        legos: (legos || []).map((lego, idx) => {
          // lego = [type, new, {k,t}, ?[{k,t}...]]
          const [type, isNew, legoPair, components] = lego;
          const expanded = {
            id: `${seedId}L${String(idx + 1).padStart(2, '0')}`,
            type: type,
            new: isNew === 1 || isNew === true,
            lego: {
              known: legoPair.k,
              target: legoPair.t
            }
          };
          if (components && components.length > 0) {
            expanded.components = components.map(c => ({
              known: c.k,
              target: c.t
            }));
          }
          return expanded;
        })
      };
    }

    // v6 Compact format: object-based {s, k, t, l}
    const seedId = seed.s;
    return {
      seed_id: seedId,
      seed_pair: {
        known: seed.k,
        target: seed.t
      },
      legos: (seed.l || []).map((lego, idx) => {
        const expanded = {
          id: `${seedId}L${String(idx + 1).padStart(2, '0')}`,
          type: lego.y,
          new: lego.n === 1 || lego.n === true,
          lego: {
            known: lego.k,
            target: lego.t
          }
        };
        if (lego.c) {
          expanded.components = lego.c.map(c => ({
            known: c.k,
            target: c.t
          }));
        }
        return expanded;
      })
    };
  });
}

/**
 * POST /api/phase1/:courseCode/upload-batch
 * Workers upload their completed batches here
 * Accepts both compact and full format
 */
app.post('/api/phase1/:courseCode/upload-batch', async (req, res) => {
  const { courseCode } = req.params;
  let batchData = req.body;

  if (!Array.isArray(batchData)) {
    return res.status(400).json({ error: 'Expected JSON array of seed objects' });
  }

  // Detect and expand compact formats (v6 object-based or v7 array-based)
  const isV7Hybrid = batchData.length > 0 && Array.isArray(batchData[0]);
  const isV6Compact = batchData.length > 0 && batchData[0].s && !batchData[0].seed_id;

  if (isV7Hybrid) {
    console.log(`[Phase 1] 📦 Expanding v7 hybrid format (${batchData.length} seeds)`);
    batchData = expandCompactFormat(batchData);
  } else if (isV6Compact) {
    console.log(`[Phase 1] 📦 Expanding v6 compact format (${batchData.length} seeds)`);
    batchData = expandCompactFormat(batchData);
  }

  const courseDir = path.join(VFS_ROOT, courseCode);
  const batchesDir = path.join(courseDir, 'phase1_batches');
  await fs.ensureDir(batchesDir);

  // Save batch with timestamp + random suffix to avoid collisions
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const batchFile = `batch_${Date.now()}_${randomSuffix}_${batchData.length}seeds.json`;
  await fs.writeJson(path.join(batchesDir, batchFile), batchData, { spaces: 2 });

  console.log(`[Phase 1] ✅ Received batch: ${batchData.length} seeds → ${batchFile}`);

  res.json({ success: true, received: batchData.length, file: batchFile, expanded: isCompact });
});

/**
 * POST /api/phase1/:courseCode/master-complete
 * Masters report completion here
 */
app.post('/api/phase1/:courseCode/master-complete', async (req, res) => {
  const { courseCode } = req.params;
  const { masterNum, seedsProcessed } = req.body;

  console.log(`[Phase 1] ✅ Master ${masterNum} complete: ${seedsProcessed} seeds`);

  const job = activeJobs.get(courseCode);
  if (job) {
    job.mastersComplete = (job.mastersComplete || 0) + 1;
    job.seedsProcessed = (job.seedsProcessed || 0) + seedsProcessed;

    // Check if all masters complete
    if (job.mastersComplete >= job.masters) {
      console.log(`[Phase 1] 🎉 All masters complete! Merging batches...`);
      await mergeBatches(courseCode);
      job.status = 'complete';
    }
  }

  res.json({ success: true, masterNum, acknowledged: true });
});

/**
 * Merge all batch files into draft_lego_pairs.json
 */
async function mergeBatches(courseCode) {
  const courseDir = path.join(VFS_ROOT, courseCode);
  const batchesDir = path.join(courseDir, 'phase1_batches');

  if (!await fs.pathExists(batchesDir)) {
    console.log(`[Phase 1] No batches directory found`);
    return;
  }

  const batchFiles = (await fs.readdir(batchesDir)).filter(f => f.endsWith('.json'));
  console.log(`[Phase 1] Merging ${batchFiles.length} batch files...`);

  const allSeeds = [];
  for (const file of batchFiles) {
    const batch = await fs.readJson(path.join(batchesDir, file));
    allSeeds.push(...batch);
  }

  // Sort by seed_id
  allSeeds.sort((a, b) => a.seed_id.localeCompare(b.seed_id));

  // Write draft_lego_pairs.json
  const outputPath = path.join(courseDir, 'draft_lego_pairs.json');
  await fs.writeJson(outputPath, allSeeds, { spaces: 2 });

  console.log(`[Phase 1] ✅ Merged ${allSeeds.length} seeds → draft_lego_pairs.json`);

  // Notify orchestrator
  await notifyOrchestrator(courseCode, 'complete');
}

/**
 * POST /resume
 * Intelligent gap-fill: scan for missing seeds and launch targeted masters
 *
 * 1. Scans batch files to find processed seeds
 * 2. Compares against totalSeeds to find gaps
 * 3. Groups missing seeds into masters (5 workers each, 3 seeds per worker)
 * 4. Generates prompts with EXACT seed IDs (not ranges)
 * 5. Launches Safari windows
 */
app.post('/resume', async (req, res) => {
  const { courseCode, target, known, totalSeeds = 668, workersPerMaster = 5, seedsPerWorker = 3 } = req.body;

  if (!courseCode || !target || !known) {
    return res.status(400).json({ error: 'courseCode, target, known required' });
  }

  console.log(`\n[Phase 1] ====================================`);
  console.log(`[Phase 1] RESUME / GAP-FILL MODE`);
  console.log(`[Phase 1] ====================================`);
  console.log(`[Phase 1] Course: ${courseCode}`);
  console.log(`[Phase 1] Total Seeds Expected: ${totalSeeds}`);

  const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
  const courseDir = path.join(VFS_ROOT, courseCode);
  const batchesDir = path.join(courseDir, 'phase1_batches');

  // Step 1: Scan draft_lego_pairs.json (the actual output file) for processed seeds
  // Fall back to batch files if draft doesn't exist yet
  const processedSeeds = new Set();
  const draftPath = path.join(courseDir, 'draft_lego_pairs.json');

  if (await fs.pathExists(draftPath)) {
    // Primary: scan the merged output file
    try {
      const draft = await fs.readJson(draftPath);
      for (const seed of draft) {
        if (seed.seed_id) {
          processedSeeds.add(seed.seed_id);
        }
      }
      console.log(`[Phase 1] Scanned draft_lego_pairs.json: ${processedSeeds.size} seeds`);
    } catch (err) {
      console.error(`[Phase 1] Error reading draft_lego_pairs.json: ${err.message}`);
    }
  } else if (await fs.pathExists(batchesDir)) {
    // Fallback: scan batch files if draft doesn't exist
    console.log(`[Phase 1] No draft_lego_pairs.json found, scanning batch files...`);
    const batchFiles = (await fs.readdir(batchesDir)).filter(f => f.endsWith('.json'));
    for (const file of batchFiles) {
      try {
        const batch = await fs.readJson(path.join(batchesDir, file));
        for (const seed of batch) {
          if (seed.seed_id) {
            processedSeeds.add(seed.seed_id);
          }
        }
      } catch (err) {
        console.error(`[Phase 1] Error reading ${file}: ${err.message}`);
      }
    }
    console.log(`[Phase 1] Scanned ${batchFiles.length} batch files: ${processedSeeds.size} seeds`);
  }

  console.log(`[Phase 1] Processed seeds found: ${processedSeeds.size}`);

  // Step 2: Find missing seeds
  const missingSeeds = [];
  for (let i = 1; i <= totalSeeds; i++) {
    const seedId = 'S' + String(i).padStart(4, '0');
    if (!processedSeeds.has(seedId)) {
      missingSeeds.push(seedId);
    }
  }

  console.log(`[Phase 1] Missing seeds: ${missingSeeds.length}`);

  if (missingSeeds.length === 0) {
    return res.json({
      success: true,
      message: 'No missing seeds - Phase 1 is complete!',
      processedSeeds: processedSeeds.size,
      missingSeeds: 0
    });
  }

  // Step 3: Group into batches of seedsPerWorker
  const workerBatches = [];
  for (let i = 0; i < missingSeeds.length; i += seedsPerWorker) {
    workerBatches.push(missingSeeds.slice(i, i + seedsPerWorker));
  }

  // Step 4: Group into masters of workersPerMaster each
  const masters = [];
  for (let m = 0; m * workersPerMaster < workerBatches.length; m++) {
    const masterWorkers = workerBatches.slice(m * workersPerMaster, (m + 1) * workersPerMaster);
    masters.push({
      masterNum: m + 1,
      workers: masterWorkers.map((seeds, idx) => ({
        workerNum: idx + 1,
        seeds: seeds  // EXACT seed IDs, not ranges
      }))
    });
  }

  console.log(`[Phase 1] Gap-fill plan: ${masters.length} masters × ${workersPerMaster} workers × ${seedsPerWorker} seeds`);

  // Read the v4.4 unified prompt
  const promptPath = path.join(__dirname, 'PROMPT.md');
  let unifiedPrompt = '';
  try {
    unifiedPrompt = require('fs').readFileSync(promptPath, 'utf8');
  } catch (err) {
    return res.status(500).json({ error: `Failed to read PROMPT.md: ${err.message}` });
  }

  // Generate master prompts with EXACT seed IDs
  const generateGapFillMasterPrompt = (master) => {
    const workerInstructions = master.workers.map(w =>
      `  - Worker ${w.workerNum}: Seeds ${w.seeds.join(', ')} (${w.seeds.length} seeds)`
    ).join('\n');

    const totalMasterSeeds = master.workers.reduce((sum, w) => sum + w.seeds.length, 0);

    return `# Phase 1 Gap-Fill Master ${master.masterNum}: Translation + LEGO Extraction

**Course**: ${courseCode}
**Target**: ${getLanguageName(target)} (${target})
**Known**: ${getLanguageName(known)} (${known})
**Your Seeds**: ${totalMasterSeeds} specific seeds (gap-fill mode)

---

## YOUR ROLE: MASTER ORCHESTRATOR

You spawn ${master.workers.length} worker agents via Task tool. Each worker processes SPECIFIC seeds (not ranges).

**Worker assignments:**
${workerInstructions}

---

## STEP 1: SPAWN ALL WORKERS IN PARALLEL

Use the Task tool ${master.workers.length} times in a SINGLE message to spawn all workers in parallel.

Each worker prompt should include:
1. The EXACT seed IDs they process
2. The methodology below
3. The output format
4. The upload endpoint

---

## WORKER PROMPT TEMPLATE

For each worker, use this prompt (fill in the EXACT SEED_IDS):

\`\`\`
# Phase 1 Worker: Seeds [SEED_IDS]

Course: ${courseCode}
Target: ${getLanguageName(target)}
Known: ${getLanguageName(known)}

## STEP 1: FETCH SEEDS
GET: ${orchestratorUrl}/api/canonical-seeds?ids=[SEED_IDS_COMMA_SEPARATED]

Example: ${orchestratorUrl}/api/canonical-seeds?ids=S0049,S0050,S0051

## STEP 2: METHODOLOGY
${unifiedPrompt}

## STEP 3: PROCESS EACH SEED
For each seed in your list:
1. Translate to ${getLanguageName(target)}
2. Extract LEGOs (A-type and M-type)
3. Mark embedded LEGOs as new: false (same-seed only)

## STEP 4: UPLOAD RESULTS
Use curl (NOT WebFetch) to POST your JSON array:

curl -X POST "${orchestratorUrl}/api/phase1/${courseCode}/upload-batch" \\
  -H "Content-Type: application/json" \\
  -d '[YOUR_JSON_ARRAY]'

Output format: JSON array of seed objects (see methodology above)
\`\`\`

---

## STEP 2: WAIT FOR COMPLETION

After spawning all workers, wait for their Task tool results.

## STEP 3: REPORT COMPLETION

When all workers complete, use curl to POST:

curl -X POST "${orchestratorUrl}/api/phase1/${courseCode}/master-complete" \\
  -H "Content-Type: application/json" \\
  -d '{"masterNum": ${master.masterNum}, "seedsProcessed": ${totalMasterSeeds}}'

---

**DO NOT process seeds yourself - spawn workers and coordinate!**
**IMPORTANT: Tell workers to use curl for uploads, NOT WebFetch!**
`;
  };

  // Save prompts
  const promptsDir = path.join(courseDir, 'phase1_gapfill_prompts');
  await fs.ensureDir(promptsDir);

  for (const master of masters) {
    const prompt = generateGapFillMasterPrompt(master);
    const filename = `gapfill_master_${String(master.masterNum).padStart(2, '0')}.md`;
    await fs.writeFile(path.join(promptsDir, filename), prompt);
  }

  console.log(`[Phase 1] ✅ Generated ${masters.length} gap-fill prompts in ${promptsDir}`);

  // Load web agent spawner
  const spawnClaudeWebAgent = await loadWebAgentSpawner();
  if (!spawnClaudeWebAgent) {
    return res.status(500).json({ error: 'Web agent spawner not available' });
  }

  // Launch all masters in Safari
  console.log(`[Phase 1] Launching ${masters.length} Safari windows...`);

  const launchResults = [];
  for (const master of masters) {
    try {
      const prompt = generateGapFillMasterPrompt(master);
      await spawnClaudeWebAgent(prompt, master.masterNum, 'safari');
      launchResults.push({ master: master.masterNum, status: 'launched' });
      console.log(`[Phase 1]   ✅ Gap-fill Master ${master.masterNum} launched`);

      // Delay between launches
      await new Promise(r => setTimeout(r, 8000));
    } catch (err) {
      launchResults.push({ master: master.masterNum, status: 'failed', error: err.message });
      console.error(`[Phase 1]   ❌ Gap-fill Master ${master.masterNum} failed: ${err.message}`);
    }
  }

  // Track the job
  activeJobs.set(courseCode + '_gapfill', {
    status: 'running',
    mode: 'gap-fill',
    masters: masters.length,
    missingSeeds: missingSeeds.length,
    startedAt: new Date().toISOString(),
    launchResults
  });

  res.json({
    success: true,
    message: `Launched ${masters.length} gap-fill masters for ${missingSeeds.length} missing seeds`,
    courseCode,
    processedSeeds: processedSeeds.size,
    missingSeeds: missingSeeds.length,
    masters: masters.length,
    workersPerMaster,
    seedsPerWorker,
    missingSeedsList: missingSeeds,
    launchResults
  });
});

/**
 * GET /health
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    port: PORT,
    timestamp: new Date().toISOString(),
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
