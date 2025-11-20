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
const { generateTextScaffold } = require('./generate-text-scaffold.cjs');

// Load environment (set by start-automation.js)
const PORT = process.env.PORT || 3459;
const VFS_ROOT = process.env.VFS_ROOT;
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
const SERVICE_NAME = process.env.SERVICE_NAME || 'Phase 5 (Baskets)';

// Load configuration
const { loadConfig } = require('../../shared/config-loader.cjs');

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

// ==============================================================================
// HELPER FUNCTIONS: LEGO DATA PREPARATION FOR WEB AGENTS
// ==============================================================================

/**
 * Identify missing LEGOs in a seed range
 * Returns array of LEGO IDs that need baskets generated
 */
/**
 * Get ALL LEGOs in a seed range (for force regenerate)
 * Does NOT check existing baskets - returns all new LEGOs in range
 */
async function getAllLegosInRange(baseCourseDir, startSeed, endSeed) {
  const legoPairsPath = path.join(baseCourseDir, 'lego_pairs.json');
  const legoPairs = await fs.readJson(legoPairsPath);

  const allLegos = [];

  for (const seed of legoPairs.seeds || []) {
    const seedNum = parseInt(seed.seed_id.replace('S', ''));

    if (seedNum >= startSeed && seedNum <= endSeed) {
      for (const lego of seed.legos || []) {
        if (lego.new && lego.lego) {
          allLegos.push({
            legoId: lego.id,
            seed: seed.seed_id,
            target: lego.lego.target,
            known: lego.lego.known,
            type: lego.type || 'M'
          });
        }
      }
    }
  }

  return allLegos;
}

/**
 * Identify LEGOs that are missing baskets (for intelligent resume)
 * Checks existing lego_baskets.json and only returns LEGOs without baskets
 */
async function identifyMissingLegos(baseCourseDir, startSeed, endSeed) {
  const legoPairsPath = path.join(baseCourseDir, 'lego_pairs.json');
  const basketsPath = path.join(baseCourseDir, 'lego_baskets.json');

  // Load lego_pairs to get all LEGOs
  const legoPairs = await fs.readJson(legoPairsPath);

  // Load existing baskets (if exists)
  let existingBaskets = {};
  if (await fs.pathExists(basketsPath)) {
    const basketsData = await fs.readJson(basketsPath);
    existingBaskets = basketsData.baskets || {};
  }

  // Find all LEGOs in seed range that don't have baskets
  const missingLegos = [];

  for (const seed of legoPairs.seeds || []) {
    const seedNum = parseInt(seed.seed_id.replace('S', ''));

    if (seedNum >= startSeed && seedNum <= endSeed) {
      for (const lego of seed.legos || []) {
        if (lego.new && lego.lego && !existingBaskets[lego.id]) {
          missingLegos.push({
            legoId: lego.id,
            seed: seed.seed_id,
            target: lego.lego.target,
            known: lego.lego.known,
            type: lego.type || 'M'
          });
        }
      }
    }
  }

  return missingLegos;
}

/**
 * Load scaffold data for LEGOs
 * Returns object with complete LEGO data ready to embed in prompt
 */
/**
 * Generate text scaffolds for LEGOs
 * Returns object mapping legoId -> human-readable text scaffold
 */
async function loadScaffoldData(baseCourseDir, missingLegos) {
  const legoPairsPath = path.join(baseCourseDir, 'lego_pairs.json');
  const legoPairs = await fs.readJson(legoPairsPath);

  const textScaffolds = {};

  for (const lego of missingLegos) {
    // Generate text scaffold for this LEGO
    const textScaffold = generateTextScaffold(lego, legoPairs, {});
    textScaffolds[lego.legoId] = textScaffold;
  }

  return textScaffolds;
}

// Branch watcher processes (courseCode -> child process)
const watchers = new Map();

/**
 * Get relative course directory for prompts
 */
function getRelativeCourseDir(absolutePath) {
  return absolutePath.replace(VFS_ROOT + '/', '');
}

/**
 * Merge phase5_outputs/*.json into lego_baskets.json
 * Called automatically after branches are merged
 */
async function mergePhase5Outputs(baseCourseDir, courseCode) {
  const phase5Dir = path.join(baseCourseDir, 'phase5_outputs');
  const basketsPath = path.join(baseCourseDir, 'lego_baskets.json');

  console.log(`\n[Phase 5] 📦 Merging phase5_outputs into lego_baskets.json...`);

  if (!await fs.pathExists(phase5Dir)) {
    console.log(`[Phase 5] ⚠️  No phase5_outputs directory found, skipping merge`);
    return;
  }

  const files = await fs.readdir(phase5Dir);
  const basketFiles = files.filter(f => f.match(/seed_S\d{4}_baskets\.json$/));

  if (basketFiles.length === 0) {
    console.log(`[Phase 5] ⚠️  No basket files found in phase5_outputs, skipping merge`);
    return;
  }

  console.log(`[Phase 5] Found ${basketFiles.length} basket files to merge`);

  // Load or create lego_baskets.json
  let legoBaskets = await fs.pathExists(basketsPath)
    ? await fs.readJson(basketsPath)
    : { baskets: {}, metadata: { generated_at: new Date().toISOString() } };

  let totalBaskets = 0;
  let totalPhrases = 0;

  // Merge each file
  for (const file of basketFiles) {
    const filePath = path.join(phase5Dir, file);
    const seedData = await fs.readJson(filePath);

    // Merge baskets
    for (const [basketId, basketData] of Object.entries(seedData.baskets || {})) {
      legoBaskets.baskets[basketId] = basketData;
      totalBaskets++;
      totalPhrases += basketData.practice_phrases?.length || 0;
    }
  }

  // Update metadata
  legoBaskets.metadata = {
    ...legoBaskets.metadata,
    last_merged: new Date().toISOString(),
    total_baskets: Object.keys(legoBaskets.baskets).length,
    merged_from_phase5_outputs: basketFiles.length
  };

  // Write merged file
  await fs.writeJson(basketsPath, legoBaskets, { spaces: 2 });

  console.log(`[Phase 5] ✅ Merge complete:`);
  console.log(`[Phase 5]    Added ${totalBaskets} baskets`);
  console.log(`[Phase 5]    Total ${totalPhrases} practice phrases`);
  console.log(`[Phase 5]    Output: ${basketsPath}`);
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
    seedsPerAgent,
    stagingOnly = false
  } = req.body;

  if (!courseCode || !startSeed || !endSeed || !target || !known) {
    return res.status(400).json({ error: 'courseCode, startSeed, endSeed, target, known required' });
  }

  // Check if already running - auto-abort stale jobs
  if (activeJobs.has(courseCode)) {
    const existingJob = activeJobs.get(courseCode);
    const jobAge = Date.now() - new Date(existingJob.timing.startedAt).getTime();
    const thirtyMinutes = 30 * 60 * 1000;

    if (jobAge > thirtyMinutes) {
      console.log(`[Phase 5] ⚠️  Auto-aborting stale job (${Math.round(jobAge / 60000)} minutes old)`);
      activeJobs.delete(courseCode);
    } else {
      return res.status(409).json({
        error: `Phase 5 already running for ${courseCode}`,
        elapsedMinutes: Math.round(jobAge / 60000),
        tip: 'Use /abort endpoint or wait for auto-timeout (30min)'
      });
    }
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

  // Check if Phase 5 already complete for FULL COURSE (not specific seed ranges)
  // Skip this check if user is requesting a specific seed range for testing/regeneration
  const isFullCourse = startSeed === 1 && endSeed >= 668;
  const basketsPath = path.join(baseCourseDir, 'lego_baskets.json');

  if (isFullCourse && await fs.pathExists(basketsPath)) {
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
  } else if (!isFullCourse) {
    console.log(`[Phase 5] 🔬 Specific seed range requested (${startSeed}-${endSeed}) - proceeding with generation`);
  }

  // Initialize job state with enhanced tracking
  const job = {
    courseCode,
    totalSeeds,
    baseCourseCode,
    baseCourseDir,
    startSeed,
    endSeed,
    target,
    known,
    stagingOnly,
    status: 'preparing_scaffolds',
    startedAt: new Date().toISOString(),

    // Upload tracking (NEW for HTTP-based workflow)
    uploads: {
      seedsUploaded: new Set(),      // Track which seeds have been uploaded
      legosReceived: 0,               // Total LEGOs uploaded
      expectedSeeds: totalSeeds,       // Seeds we're waiting for
      expectedLegos: null,             // Will be set after reading lego_pairs.json
      lastUploadAt: null,
      complete: false
    },

    // Milestone tracking
    milestones: {
      scaffoldsReady: false,
      scaffoldsReadyAt: null,
      watcherStarted: false,
      watcherStartedAt: null,
      windowsSpawned: 0,
      windowsTotal: 0,
      lastWindowSpawnedAt: null,
      branchesDetected: 0,
      branchesExpected: 0,
      lastBranchDetectedAt: null,
      branchesMerged: 0,
      mergeStartedAt: null,
      mergeCompletedAt: null
    },

    // Branch tracking (detailed)
    branches: [],

    // Configuration (set after prep)
    config: null,

    // Legacy fields (for backward compatibility)
    windowsSpawned: 0,
    branchesDetected: 0,
    merged: false,
    error: null,
    warnings: []
  };

  activeJobs.set(courseCode, job);

  try {
    // STEP 1: Scaffolds already exist in phase5_scaffolds/ directory
    // No need to generate them - they're pre-existing data files
    console.log(`\n[Phase 5] Using existing scaffolds from: ${path.join(baseCourseDir, 'phase5_scaffolds')}`);

    // Update milestone
    job.milestones.scaffoldsReady = true;
    job.milestones.scaffoldsReadyAt = new Date().toISOString();

    // STEP 1.5: Identify LEGOs to generate
    // - Full course: Intelligent resume (only missing LEGOs)
    // - Specific range: Force regenerate (all LEGOs in range)
    let targetLegos;

    if (isFullCourse) {
      console.log(`\n[Phase 5] 🔄 Full course mode: Identifying missing LEGOs for intelligent resume...`);
      targetLegos = await identifyMissingLegos(baseCourseDir, startSeed, endSeed);
      console.log(`[Phase 5] ✅ Found ${targetLegos.length} LEGOs needing baskets`);

      if (targetLegos.length === 0) {
        console.log(`[Phase 5] ✅ All baskets already exist - Phase 5 complete!`);
        return res.json({
          success: true,
          alreadyComplete: true,
          message: `Phase 5 complete - all baskets exist`,
          basketCount: 0
        });
      }
    } else {
      console.log(`\n[Phase 5] 🎯 Specific range mode: Force regenerating seeds ${startSeed}-${endSeed}...`);
      // Get ALL LEGOs in range (ignore existing baskets)
      targetLegos = await getAllLegosInRange(baseCourseDir, startSeed, endSeed);
      console.log(`[Phase 5] ✅ Found ${targetLegos.length} LEGOs to generate (force regenerate)`);
    }

    console.log(`\n[Phase 5] Loading scaffold data for ${targetLegos.length} LEGOs...`);
    const legoData = await loadScaffoldData(baseCourseDir, targetLegos);
    console.log(`[Phase 5] ✅ Scaffold data loaded and ready for embedding`);

    // Store in job for tracking
    job.targetLegos = targetLegos;
    job.legoData = legoData;

    // Set expected LEGOs for upload tracking
    job.uploads.expectedLegos = targetLegos.length;

    // STEP 2: MASTER/WORKER CONFIGURATION
    // Read config from automation.config.simple.json
    const config = loadConfig();
    let masterCount = config.phase5_basket_generation.browsers || 5;
    let workersPerMaster = config.phase5_basket_generation.agents_per_browser || 4;
    const seedsPerWorker = config.phase5_basket_generation.seeds_per_agent || 1;

    // SMART SCALING: Only spawn browsers/workers needed for actual workload
    const uniqueSeeds = new Set(targetLegos.map(l => l.seedId));
    const seedsToProcess = uniqueSeeds.size;
    const workersNeeded = Math.ceil(seedsToProcess / seedsPerWorker);

    // Calculate optimal browser/worker distribution
    if (workersNeeded < (masterCount * workersPerMaster)) {
      console.log(`\n[Phase 5] 🎯 Smart Scaling: Only ${seedsToProcess} seeds to process (${workersNeeded} workers needed)`);

      // Option A: Minimize browsers, maximize workers per browser
      if (workersNeeded <= workersPerMaster) {
        // All work fits in 1 browser
        masterCount = 1;
        workersPerMaster = workersNeeded;
      } else {
        // Distribute evenly across browsers (prefer fewer browsers)
        masterCount = Math.min(masterCount, Math.ceil(workersNeeded / 5)); // ~5 workers per browser
        workersPerMaster = Math.ceil(workersNeeded / masterCount);
      }

      console.log(`[Phase 5]    Scaled down: ${masterCount} browsers × ${workersPerMaster} workers = ${masterCount * workersPerMaster} workers`);
    }

    const totalWorkers = masterCount * workersPerMaster;
    const capacity = totalWorkers * seedsPerWorker;

    console.log(`\n[Phase 5] Master/Worker Configuration:`);
    console.log(`[Phase 5]    Masters: ${masterCount} browser tabs`);
    console.log(`[Phase 5]    Workers per Master: ${workersPerMaster} (via Task tool)`);
    console.log(`[Phase 5]    Seeds per worker: ${seedsPerWorker}`);
    console.log(`[Phase 5]    Total workers: ${totalWorkers}`);
    console.log(`[Phase 5]    Total capacity: ${capacity} seeds`);
    console.log(`[Phase 5]    Seeds to process: ${seedsToProcess} seeds`);
    console.log(`[Phase 5]    Target LEGOs: ${targetLegos.length} LEGOs`);

    if (capacity < totalSeeds) {
      console.warn(`[Phase 5] ⚠️  Warning: Capacity (${capacity}) < Total Seeds (${totalSeeds})`);
      console.warn(`[Phase 5]    Increase browsers or agents_per_browser in config!`);
    }

    job.config = {
      masterCount,
      workersPerMaster,
      seedsPerWorker,
      totalWorkers,
      capacity,
      // Legacy fields for backward compatibility
      browsers: masterCount,
      agents: workersPerMaster,
      totalAgents: totalWorkers
    };
    job.milestones.windowsTotal = masterCount;
    job.milestones.branchesExpected = 0; // No git branches in ngrok architecture
    job.status = 'spawning_masters';

    // STEP 3: Spawn Master browser tabs
    // Each Master spawns workers via Task tool, workers upload via ngrok
    await spawnBrowserWindows(courseCode, {
      target,
      known,
      startSeed,
      endSeed,
      legoData,        // ← Scaffold data for Masters to pass to workers
      targetLegos,     // ← List of LEGOs to generate (missing or force regenerate)
      stagingOnly      // ← Pass through staging flag
    }, baseCourseDir, masterCount, workersPerMaster, seedsPerWorker, job);

    res.json({
      success: true,
      message: `Phase 5 started for ${courseCode}`,
      job: {
        courseCode,
        totalSeeds,
        config: job.config,
        status: 'running'
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
 * Get Phase 5 progress for a course (Enhanced with realistic observables)
 */
app.get('/status/:courseCode', (req, res) => {
  const { courseCode } = req.params;
  const job = activeJobs.get(courseCode);

  if (!job) {
    return res.status(404).json({ error: `No Phase 5 job found for ${courseCode}` });
  }

  // Calculate timing metrics
  const startTime = new Date(job.startedAt).getTime();
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - startTime) / 1000);

  // Calculate velocity (if branches are appearing)
  let velocity = null;
  if (job.branches && job.branches.length > 0) {
    const firstBranchTime = new Date(job.branches[0].detectedAt).getTime();
    const elapsedSinceFirstBranch = (now - firstBranchTime) / 1000;
    const avgSecondsPerBranch = elapsedSinceFirstBranch / job.branches.length;
    const remainingBranches = job.milestones.branchesExpected - job.branches.length;
    const estimatedSecondsRemaining = remainingBranches * avgSecondsPerBranch;

    velocity = {
      branchesCompleted: job.branches.length,
      elapsedSinceFirstBranch: Math.floor(elapsedSinceFirstBranch),
      avgSecondsPerBranch: Math.floor(avgSecondsPerBranch),
      estimatedSecondsRemaining: Math.floor(estimatedSecondsRemaining),
      estimatedCompletionAt: new Date(now + estimatedSecondsRemaining * 1000).toISOString()
    };
  }

  // Calculate coverage
  const coverage = job.config ? {
    seedsAssigned: job.config.capacity || 0,
    seedsActual: job.totalSeeds,
    seedsUnassigned: Math.max(0, job.totalSeeds - (job.config.capacity || 0)),
    coveragePercent: job.config.capacity ?
      Math.round((Math.min(job.totalSeeds, job.config.capacity) / job.totalSeeds) * 1000) / 10 : 0
  } : null;

  // Determine sub-status
  let subStatus = null;
  if (job.status === 'spawning_windows') {
    if (job.milestones.windowsSpawned < job.milestones.windowsTotal) {
      subStatus = `spawning_window_${job.milestones.windowsSpawned + 1}_of_${job.milestones.windowsTotal}`;
    } else {
      subStatus = 'all_windows_spawned';
    }
  } else if (job.status === 'waiting_for_branches') {
    if (job.milestones.branchesDetected === 0) {
      subStatus = 'waiting_for_first_branch';
    } else {
      subStatus = `${job.milestones.branchesDetected}_of_${job.milestones.branchesExpected}_branches_detected`;
    }
  } else if (job.status === 'merging_branches') {
    subStatus = 'merge_in_progress';
  }

  res.json({
    courseCode,
    status: job.status,
    subStatus,

    milestones: job.milestones,

    branches: job.branches.map(b => ({
      branchName: b.branchName,
      detectedAt: b.detectedAt,
      seedRange: b.seedRange,
      expectedSeeds: b.expectedSeeds,
      merged: b.merged || false
    })),

    timing: {
      startedAt: job.startedAt,
      elapsedSeconds,
      velocity
    },

    coverage,

    config: job.config,

    error: job.error,
    warnings: job.warnings || [],

    // Legacy fields for backward compatibility
    windowsSpawned: job.windowsSpawned,
    branchesDetected: job.branchesDetected,
    merged: job.merged
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
async function startBranchWatcher(courseCode, expectedWindows, baseCourseDir, customPattern = null) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(baseCourseDir, 'lego_baskets.json');
    const scriptPath = path.join(__dirname, '../../scripts/watch_and_merge_branches.cjs');

    // Simple pattern: ANY claude/ branch created after job start
    // The watcher script filters by timestamp (isNew), not by name pattern
    const branchPattern = 'claude/';

    console.log(`\n[Phase 5] 👀 Starting branch watcher for ${courseCode}...`);
    console.log(`[Phase 5]    Pattern: ${branchPattern}`);
    console.log(`[Phase 5]    Waiting for ${expectedWindows} branches`);
    console.log(`[Phase 5]    Output: ${outputPath}`);

    const watcher = spawn('node', [
      scriptPath,
      '--watch',
      '--pattern', branchPattern,
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

        const job = activeJobs.get(courseCode);
        if (!job) return;

        // Detect new branch
        const newBranchMatch = line.match(/New branch detected: (claude\/[\w-]+)/);
        if (newBranchMatch) {
          const branchName = newBranchMatch[1];

          // Extract window number if possible
          const windowMatch = branchName.match(/window-(\d+)/i);
          const windowNum = windowMatch ? parseInt(windowMatch[1]) : null;

          // Calculate seed range based on window number and config
          let seedRange = 'unknown';
          let expectedSeeds = 0;
          if (windowNum && job.config) {
            const seedsPerWindow = job.config.agents * job.config.seedsPerAgent;
            const windowStartSeed = job.startSeed + ((windowNum - 1) * seedsPerWindow);
            const windowEndSeed = Math.min(windowStartSeed + seedsPerWindow - 1, job.endSeed);
            seedRange = `S${String(windowStartSeed).padStart(4, '0')}-S${String(windowEndSeed).padStart(4, '0')}`;
            expectedSeeds = windowEndSeed - windowStartSeed + 1;
          }

          // Add to branches array
          job.branches.push({
            branchName,
            detectedAt: new Date().toISOString(),
            seedRange,
            expectedSeeds,
            merged: false
          });

          // Update milestones
          job.milestones.branchesDetected = job.branches.length;
          job.milestones.lastBranchDetectedAt = new Date().toISOString();
          job.branchesDetected = job.branches.length; // Legacy

          console.log(`  [Watcher] Branch ${job.branches.length}/${job.milestones.branchesExpected}: ${branchName} (${seedRange})`);
        }

        // Detect merge start
        if (line.includes('Starting merge') || line.includes('Merging')) {
          job.milestones.mergeStartedAt = new Date().toISOString();
          job.status = 'merging_branches';
        }

        // Detect merge completion
        if (line.includes('Merged') || line.includes('✅ All branches merged')) {
          job.merged = true;
          job.milestones.branchesMerged = job.branches.length;
          job.milestones.mergeCompletedAt = new Date().toISOString();
          job.status = 'complete';

          // Mark all branches as merged
          job.branches.forEach(b => b.merged = true);

          // Auto-merge phase5_outputs into lego_baskets.json
          mergePhase5Outputs(baseCourseDir, courseCode);

          notifyOrchestrator(courseCode, 'complete');
        }

        // Detect branch count (fallback if new branch detection fails)
        const branchMatch = line.match(/(\d+) branches ready/);
        if (branchMatch) {
          const count = parseInt(branchMatch[1]);
          job.milestones.branchesDetected = count;
          job.branchesDetected = count; // Legacy
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
 * Spawn Master browser tabs (THREE-TIER ARCHITECTURE)
 * Each Master receives scaffold subset and spawns Worker agents via Task tool
 *
 * @param {string} courseCode - Course identifier
 * @param {object} params - Contains legoData, targetLegos, startSeed, endSeed, etc.
 * @param {string} baseCourseDir - Base course directory path
 * @param {number} masterCount - Number of Master tabs to spawn (15)
 * @param {number} workersPerMaster - Workers each Master spawns via Task tool (10)
 * @param {number} seedsPerWorker - Seeds per worker agent (5)
 * @param {object} job - Job tracking object
 */
async function spawnBrowserWindows(courseCode, params, baseCourseDir, masterCount, workersPerMaster, seedsPerWorker, job = null) {
  const { target, known, startSeed, endSeed, legoData, targetLegos } = params;

  console.log(`\n[Phase 5] 🌐 Spawning ${masterCount} Master browser tabs...`);
  console.log(`[Phase 5]    Each Master spawns ${workersPerMaster} workers via Task tool`);
  console.log(`[Phase 5]    Each worker processes ~${seedsPerWorker} seeds`);
  console.log(`[Phase 5]    Total LEGOs: ${targetLegos.length}`);

  const config = loadConfig();
  const spawnDelay = config.phase5_basket_generation.browser_spawn_delay_ms || 5000;

  // Group LEGOs by seed for clean division
  const legosBySeed = {};
  for (const lego of targetLegos) {
    const seedId = lego.seed;
    if (!legosBySeed[seedId]) {
      legosBySeed[seedId] = [];
    }
    legosBySeed[seedId].push(lego);
  }

  // Get sorted list of seeds
  const seeds = Object.keys(legosBySeed).sort();
  console.log(`[Phase 5]    Total seeds with LEGOs: ${seeds.length}`);

  // Divide SEEDS among Masters (each seed stays together - atomic unit)
  const seedsPerMaster = Math.ceil(seeds.length / masterCount);

  for (let masterNum = 1; masterNum <= masterCount; masterNum++) {
    console.log(`\n[Phase 5]   Master ${masterNum}/${masterCount}:`);

    // Calculate this Master's seed range
    const masterStartIdx = (masterNum - 1) * seedsPerMaster;
    const masterEndIdx = Math.min(masterNum * seedsPerMaster, seeds.length);
    const masterSeeds = seeds.slice(masterStartIdx, masterEndIdx);

    // Collect all LEGOs from this Master's seeds
    const masterTargetLegos = [];
    for (const seedId of masterSeeds) {
      masterTargetLegos.push(...legosBySeed[seedId]);
    }

    // Extract scaffold data for this Master's LEGOs
    const masterLegoData = {};
    for (const lego of masterTargetLegos) {
      if (legoData[lego.legoId]) {
        masterLegoData[lego.legoId] = legoData[lego.legoId];
      }
    }

    const dataSize = Math.round(JSON.stringify(masterLegoData).length / 1024);
    console.log(`[Phase 5]     Seeds: ${masterSeeds.slice(0, 5).join(', ')}${masterSeeds.length > 5 ? '...' : ''} (${masterSeeds.length} seeds)`);
    console.log(`[Phase 5]     LEGOs: ${masterTargetLegos.length} LEGOs (${dataSize} KB scaffold data)`);
    console.log(`[Phase 5]     Will spawn ${workersPerMaster} workers via Task tool`);

    // Generate Master orchestrator prompt with text scaffolds
    const masterPrompt = generatePhase5OrchestratorPrompt(
      courseCode,
      {
        target,
        known,
        startSeed: parseInt(masterSeeds[0].replace('S', '')),
        endSeed: parseInt(masterSeeds[masterSeeds.length - 1].replace('S', '')),
        legoData: masterLegoData,
        targetLegos: masterTargetLegos,
        agentsPerWindow: workersPerMaster,  // Workers this Master should spawn
        stagingOnly: params.stagingOnly
      },
      baseCourseDir
    );

    try {
      await spawnClaudeCodeSession(masterPrompt, `phase5-master-${masterNum}`);

      // Update milestones
      if (job) {
        job.windowsSpawned++;
        job.milestones.windowsSpawned = job.windowsSpawned;
        job.milestones.lastWindowSpawnedAt = new Date().toISOString();
      }

      // Stagger Master spawns (default 5000ms)
      if (masterNum < masterCount) {
        console.log(`[Phase 5]     Waiting ${spawnDelay}ms before next Master...`);
        await new Promise(resolve => setTimeout(resolve, spawnDelay));
      }
    } catch (error) {
      console.error(`[Phase 5]     ❌ Failed to spawn Master ${masterNum}:`, error.message);
      if (job && !job.warnings) job.warnings = [];
      if (job) job.warnings.push(`Failed to spawn Master ${masterNum}: ${error.message}`);
    }
  }

  console.log(`\n[Phase 5] ✅ Spawned ${masterCount} Master browser tabs`);
  console.log(`[Phase 5]    Masters will spawn ${masterCount * workersPerMaster} workers total`);
  console.log(`[Phase 5]    Workers upload baskets via ngrok`);

  if (job) {
    job.status = 'workers_generating';
  }
}

/**
 * Generate Phase 5 Master Prompt - Self-Managing Practice Basket Generation
 * Supports both regular mode (seed range) and regeneration mode (specific LEGO_IDs)
 */
function generatePhase5OrchestratorPrompt(courseCode, params, courseDir) {
  const { target, known, startSeed, endSeed, legoIds, isRegeneration, agentsPerWindow, seedsPerAgent } = params;

  const relativeDir = getRelativeCourseDir(courseDir);

  if (isRegeneration) {
    // REGENERATION MODE: Generate baskets for specific LEGO_IDs only
    const legosPerAgent = 50; // 50 LEGOs per agent (10 per LEGO × 5 LEGOs = manageable)
    const agentCount = Math.ceil(legoIds.length / legosPerAgent);

    return `# Phase 5 Orchestrator: Regenerate ${legoIds.length} Baskets

**Course**: ${courseCode}
**Mode**: BASKET REGENERATION
**Total LEGOs**: ${legoIds.length} specific LEGO_IDs
**Required Agents**: ${agentCount} parallel agents
**LEGOs per agent**: ~${legosPerAgent}

---

## 🎯 YOUR ONLY JOB: Spawn Agents for Regeneration

You are the orchestrator. **DO NOT** read files or generate content yourself.

**Your task:**
1. Spawn ${agentCount} agents in parallel
2. Pass each agent its specific LEGO_IDs to regenerate
3. Monitor progress and report when complete

**CRITICAL: Each agent should:**
- Read scaffolds ONLY for its assigned LEGO_IDs from \`${relativeDir}/phase5_scaffolds/\`
- Generate baskets using Phase 5 intelligence: https://ssi-dashboard-v7.vercel.app/docs/phase_intelligence/phase_5_lego_baskets.md
- Save outputs to \`${relativeDir}/phase5_outputs/\`
- Follow the EXACT same workflow as regular Phase 5

**LEGO_IDs to distribute among ${agentCount} agents:**
${legoIds.slice(0, 10).join(', ')}${legoIds.length > 10 ? ` ... and ${legoIds.length - 10} more` : ''}

**OUTPUT WORKFLOW** (each agent must follow):
1. Fetch LEGO details: \`GET ${ORCHESTRATOR_URL}/api/courses/${courseCode}/phase-outputs/3/lego_pairs.json\`
2. Fetch phase intelligence: \`GET ${ORCHESTRATOR_URL}/api/phase-intelligence/5\`
3. Generate practice baskets using Phase 5 intelligence guidelines
4. Submit baskets: \`POST ${ORCHESTRATOR_URL}/api/phase5/${courseCode}/submit\`
   - Body: \`{ version: "8.2.0", course: "${courseCode}", baskets: {...} }\`
   - Expected: \`{ success: true, basketCount: N, savedTo: "..." }\`
5. No manual file operations - all submission via REST API

---

## 🚀 SPAWN ALL ${agentCount} AGENTS NOW

Use the Task tool ${agentCount} times in a single message to spawn all agents in parallel.

Divide the ${legoIds.length} LEGO_IDs evenly among the ${agentCount} agents (~${legosPerAgent} LEGOs each).

**Worker prompt template:** Fetch from https://ssi-dashboard-v7.vercel.app/prompts/phase5_worker.md (includes full Phase 5 intelligence guidance)
`;
  }

  // MASTER MODE: Master spawns workers via Task tool
  const totalSeeds = endSeed - startSeed + 1;
  const legoData = params.legoData || {};
  const targetLegos = params.targetLegos || [];
  const legoCount = targetLegos.length;
  const workersToSpawn = params.agentsPerWindow || 4;

  const ngrokUrl = 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev';

  // Group LEGOs by seed for clean division
  const legosBySeed = {};
  for (const lego of targetLegos) {
    const seedId = lego.seed;
    if (!legosBySeed[seedId]) {
      legosBySeed[seedId] = [];
    }
    legosBySeed[seedId].push(lego);
  }
  const seeds = Object.keys(legosBySeed).sort();

  // Create LEGO assignments (1 worker per seed)
  const workerAssignments = seeds.map((seedId, i) => {
    const seedLegos = legosBySeed[seedId];
    const legoIds = seedLegos.map(l => l.legoId);
    return {
      workerNum: i + 1,
      seedId,
      legoIds,
      legoCount: legoIds.length
    };
  });

  return `# Phase 5 Master Orchestrator

**Course:** \`${courseCode}\`
**Your Range:** Seeds \`S${String(startSeed).padStart(4, '0')}\` to \`S${String(endSeed).padStart(4, '0')}\` (${totalSeeds} seeds)
**Target LEGOs:** ${legoCount} LEGOs across ${seeds.length} seeds
**Workers to spawn:** ${workersToSpawn} (via Task tool)

---

## 🎯 YOUR MISSION: SPAWN ${workersToSpawn} WORKERS

You are a **Master Orchestrator**. You DON'T generate baskets yourself.

**Your workflow:**

1. ✅ **Assign LEGOs to workers** - See assignments below (1 worker per seed)
2. ✅ **Spawn ${workersToSpawn} workers** - Use Task tool ${workersToSpawn} times in ONE message (parallel!)
3. ✅ **Work SILENTLY** - No verbose progress logs
4. ✅ **Monitor completion** - Workers will upload via ngrok
5. ✅ **Report brief summary** - "✅ Master complete: ${workersToSpawn} workers spawned"

---

## 📋 WORKER ASSIGNMENTS

${workerAssignments.map(w => `**Worker ${w.workerNum}:** Seed ${w.seedId} - LEGOs: ${w.legoIds.join(', ')} (${w.legoCount} LEGOs)`).join('\n')}

---

## 🚀 SPAWN WORKERS

Use Task tool ${workersToSpawn} times in a SINGLE message (parallel spawn).

**Worker prompt template:**

\`\`\`
{
  "subagent_type": "general-purpose",
  "description": "Phase 5 Worker N",
  "prompt": "# 🎭 YOUR ROLE

You are a **world-leading creator of practice phrases** in the target language that help learners internalize language patterns naturally and quickly.

Your phrases must:
- ✅ Sound **natural in BOTH languages** (English and Spanish)
- ✅ Use **realistic communication scenarios** learners would encounter
- ✅ Follow **vocabulary constraints** (GATE compliance - only use available vocabulary)
- ✅ Help learners **internalize target language grammar patterns** through practice
- ✅ **EVERY phrase MUST contain the complete LEGO** - this is practice, not random conversation

**CRITICAL PRINCIPLE**: Practice phrases are opportunities for learners to **PRACTICE SAYING THE LEGO**.

Not random vocabulary. Not building up TO the lego. Building FROM the lego by adding context.

---

## 📖 UNDERSTAND THE METHODOLOGY

**Read for context**: https://ssi-dashboard-v7.vercel.app/docs/phase_intelligence/phase_5_lego_baskets.md

This explains WHY we generate baskets and the pedagogical principles behind LEGO-based learning.

**Key takeaways:**
- LEGOs are linguistic building blocks for recombination
- GATE compliance ensures learners only practice known vocabulary
- Quality over quantity (better 8 perfect phrases than 10 with 2 bad ones)
- Grammar must ALWAYS be correct in both languages
- Extended linguistic thinking required (not mechanical templates)

---

## 🎯 YOUR ASSIGNMENT

**Seed:** SXXXX
**LEGOs to generate:** [list LEGO IDs here]

---

## 🔧 GENERATION WORKFLOW

For EACH LEGO, follow this exact process:

### Step 1: Fetch Required Data

**Get LEGO details from Phase 3 outputs:**
- GET: \`${ORCHESTRATOR_URL}/api/courses/${courseCode}/phase-outputs/3/lego_pairs.json\`
- Look up your assigned LEGO IDs in the \`lego_pairs.json\` response

**Get phase intelligence:**
- GET: \`${ORCHESTRATOR_URL}/api/phase-intelligence/5\`
- Review generation methodology and best practices

**Example API calls:**
\`\`\`bash
# Get LEGO pairs
curl ${ORCHESTRATOR_URL}/api/courses/${courseCode}/phase-outputs/3/lego_pairs.json

# Get phase intelligence
curl ${ORCHESTRATOR_URL}/api/phase-intelligence/5
\`\`\`

The lego_pairs.json provides:
- The LEGO you're teaching (known → target)
- Complete available vocabulary (from previous seeds and LEGOs)
- LEGO type (M/FD/LUT)
- Seed context

### Step 2: Think Linguistically

**Extended thinking required** - Ask yourself:
- What is this LEGO? (verb/noun/phrase/etc.)
- How would learners naturally use it?
- What realistic scenarios would include this LEGO?
- What relates to the seed theme?

**Start with English thoughts**, then express in Spanish using only available vocabulary.

### Step 3: Generate 10 Practice Phrases

**CRITICAL RULE**: Phrase 1 must ALREADY contain the COMPLETE LEGO.

Build FROM the LEGO, not TO it:
- ✅ CORRECT: \\"I don't know why\\" → \\"I don't know why that is\\" → \\"I don't know why you think so\\"
- ❌ WRONG: \\"I don't know\\" → \\"I don't\\" → \\"I don't know why\\" (building TO it!)

**Progressive complexity** (2-2-2-4 distribution):
- Phrases 1-2: SHORT (LEGO alone or +1 word)
- Phrases 3-4: MEDIUM (LEGO +2-3 words)
- Phrases 5-6: LONGER (LEGO +4-6 words)
- Phrases 7-10: LONGEST (LEGO +6+ words, aim for natural sentences)

### Step 4: Validate EVERY Phrase

**For EACH phrase, check all 3:**

1. ✅ **Contains COMPLETE LEGO?**
   - If LEGO is \\"it's unusual that\\", the phrase must contain \\"it's unusual that\\"
   - NOT \\"it's unusual\\" (incomplete)
   - NOT \\"unusual that\\" (incomplete)
   - The COMPLETE LEGO must be present

2. ✅ **GATE Compliant?**
   - Every Spanish word must exist in the scaffold's vocabulary list
   - Check EVERY word - if ANY word is missing, the phrase FAILS
   - No guessing or introducing new vocabulary

3. ✅ **Grammatically correct in BOTH languages?**
   - Natural English grammar
   - Natural Spanish grammar (verb conjugations, gender agreement, word order)
   - Would a native speaker understand this naturally?

### Step 5: Fix Failures

**If ANY phrase fails ANY check:**
- DELETE that phrase immediately
- Think of a NEW English thought that uses the LEGO
- Express it in Spanish using only available vocabulary
- Re-validate the new phrase

**Keep iterating until ALL 10 phrases pass ALL 3 checks.**

### Step 6: Submit Your Work

**POST submission to orchestrator:**
- Endpoint: \`${ORCHESTRATOR_URL}/api/phase5/${courseCode}/submit\`
- Method: POST
- Content-Type: application/json

**Payload format:**
\`\`\`json
{
  "version": "8.2.0",
  "course": "${courseCode}",
  "baskets": {
    "[LEGO_ID]": {
      "lego": { "known": "...", "target": "..." },
      "practice_phrases": [
        { "known": "...", "target": "..." }
      ]
    }
  }
}
\`\`\`

**Expected response:**
\`\`\`json
{
  "success": true,
  "basketCount": 1,
  "savedTo": "courses/${courseCode}/lego_baskets.json"
}
\`\`\`

**Example API call:**
\`\`\`bash
curl -X POST ${ORCHESTRATOR_URL}/api/phase5/${courseCode}/submit \\
  -H "Content-Type: application/json" \\
  -d '{
    "version": "8.2.0",
    "course": "${courseCode}",
    "baskets": { "S0117L01": { ... } }
  }'
\`\`\`

---

## ⚠️ COMMON MISTAKES TO AVOID

❌ Building up TO the LEGO instead of FROM it
❌ Using vocabulary not in the scaffold's available list
❌ Mechanical/template generation without thinking
❌ Unnatural grammar in either language
❌ Uploading without validating every phrase

✅ Natural, meaningful utterances
✅ Every phrase contains the complete LEGO
✅ Strict GATE compliance
✅ Grammatically perfect in both languages
✅ Evidence of linguistic thinking

---

## 🎯 SUCCESS CRITERIA

Your work is successful when:
- All 10 phrases contain the COMPLETE LEGO
- 100% GATE compliance (every Spanish word from scaffold vocabulary)
- Natural, grammatically correct in both languages
- Progressive complexity from simple to rich contexts
- Quality over speed - better 8 perfect than 10 with failures

**Remember**: You're a linguistic expert creating learning materials, not a mechanical processor. Think, create, validate.

Work silently. Report brief summary when complete."
}
\`\`\`

---

## 🎯 START NOW

**Spawn all ${workersToSpawn} workers in parallel!**

Each worker:
1. Gets its LEGO ID list from assignments above
2. Fetches LEGO data via REST API: \`GET ${ORCHESTRATOR_URL}/api/courses/${courseCode}/phase-outputs/3/lego_pairs.json\`
3. Fetches phase intelligence: \`GET ${ORCHESTRATOR_URL}/api/phase-intelligence/5\`
4. Generates baskets for assigned LEGOs
5. Submits via REST API: \`POST ${ORCHESTRATOR_URL}/api/phase5/${courseCode}/submit\`

Report: "✅ Master complete: ${workersToSpawn} workers spawned for ${legoCount} LEGOs"
`;
}

/**
 * Spawn Claude Code session via osascript
 * Opens browser with prompt
 */
async function spawnClaudeCodeSession(prompt, windowTitle) {
  const { spawn } = require('child_process');

  // Copy prompt to clipboard using pbcopy (avoids osascript length/escaping issues)
  await new Promise((resolve, reject) => {
    const pbcopy = spawn('pbcopy', [], { stdio: ['pipe', 'inherit', 'inherit'] });
    pbcopy.stdin.write(prompt);
    pbcopy.stdin.end();
    pbcopy.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pbcopy failed with code ${code}`));
    });
  });

  // Use Safari (supports AppleScript tab API properly)
  const browser = 'Safari';
  const appleScript = `
-- Open Claude Code on the Web
tell application "${browser}"
    activate

    -- Open new tab with claude.ai/code (has Task tool!)
    tell window 1
        set newTab to make new tab with properties {URL:"https://claude.ai/code"}
        set current tab to newTab
    end tell

    -- Wait for page to load (3 seconds)
    delay 3

    -- Simulate Cmd+V to paste prompt into input field
    tell application "System Events"
        keystroke "v" using command down
        delay 0.5
        -- Auto-submit with Enter for fully automated execution
        keystroke return
    end tell
end tell

-- Return success
return "success"
  `.trim();

  return new Promise((resolve, reject) => {
    const child = spawn('osascript', ['-e', appleScript], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        reject(new Error(`osascript failed: ${stderr || stdout}`));
      }
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
 * GET /scaffold/:courseCode/:legoId
 * Generate and serve text scaffold for a specific LEGO
 * Note: ngrok proxy strips /phase5 prefix before forwarding
 */
app.get('/scaffold/:courseCode/:legoId', async (req, res) => {
  try {
    const { courseCode, legoId } = req.params;

    // Validate LEGO ID format
    if (!/^S\d{4}L\d{2}$/.test(legoId)) {
      return res.status(400).json({ error: 'Invalid LEGO ID format. Expected: S0117L01' });
    }

    // Extract seed from LEGO ID (e.g., S0117L01 → s0117)
    const seedNum = legoId.substring(1, 5); // "0117"
    const seedId = `seed_s${seedNum}.json`;

    const baseCourseDir = path.join(VFS_ROOT, 'public/vfs/courses', courseCode);
    const scaffoldPath = path.join(baseCourseDir, 'phase5_scaffolds', seedId);
    const legoPairsPath = path.join(baseCourseDir, 'lego_pairs.json');

    // Check if scaffold file exists
    if (!await fs.pathExists(scaffoldPath)) {
      return res.status(404).json({
        error: 'Scaffold not found',
        legoId,
        seedId,
        path: scaffoldPath
      });
    }

    // Load scaffold JSON and lego_pairs
    const seedScaffold = await fs.readJson(scaffoldPath);
    const legoPairs = await fs.readJson(legoPairsPath);

    // Find this LEGO in the scaffold (legos is an object keyed by LEGO ID)
    const legoScaffold = seedScaffold.legos?.[legoId];

    if (!legoScaffold) {
      return res.status(404).json({
        error: 'LEGO not found in scaffold',
        legoId,
        availableLegos: Object.keys(seedScaffold.legos || {})
      });
    }

    // Generate text scaffold using the text scaffold generator
    const { generateTextScaffold } = require('./generate-text-scaffold.cjs');

    // Scaffold stores lego as array [known, target]
    const [known, target] = legoScaffold.lego;

    const textScaffold = generateTextScaffold(
      {
        legoId,
        seed: seedScaffold.seed_id,
        known,
        target,
        type: legoScaffold.type
      },
      legoPairs,
      seedScaffold
    );

    res.type('text/plain').send(textScaffold);

  } catch (error) {
    console.error('[Phase 5] Error serving scaffold:', error);
    res.status(500).json({
      error: 'Failed to generate scaffold',
      message: error.message
    });
  }
});

/**
 * POST /regenerate
 * Regenerate specific baskets for given LEGO_IDs
 *
 * Body: {
 *   courseCode: string,
 *   legoIds: string[],        // e.g., ["S0003L02", "S0068L01", ...]
 *   target: string,
 *   known: string
 * }
 *
 * Segmentation Strategy for Regeneration:
 * - 5 baskets per agent (faster, less context)
 * - 10 agents per browser (max parallel)
 * - 50 baskets per browser = 1 work unit
 * - Spawn browsers as needed: Math.ceil(totalBaskets / 50)
 */
app.post('/regenerate', async (req, res) => {
  const { courseCode, legoIds, target, known } = req.body;

  if (!courseCode || !legoIds || !Array.isArray(legoIds) || legoIds.length === 0) {
    return res.status(400).json({ error: 'courseCode and legoIds (array) required' });
  }

  if (!target || !known) {
    return res.status(400).json({ error: 'target and known language names required' });
  }

  // Check if already running
  const jobKey = `${courseCode}_regen`;
  if (activeJobs.has(jobKey)) {
    return res.status(409).json({ error: `Basket regeneration already running for ${courseCode}` });
  }

  console.log(`\n[Phase 5] ====================================`);
  console.log(`[Phase 5] BASKET REGENERATION`);
  console.log(`[Phase 5] ====================================`);
  console.log(`[Phase 5] Course: ${courseCode}`);
  console.log(`[Phase 5] LEGO_IDs to regenerate: ${legoIds.length}`);
  console.log(`[Phase 5] Target: ${target}, Known: ${known}`);

  const baseCourseDir = path.join(VFS_ROOT, 'public/vfs/courses', courseCode);

  // Check prerequisites
  const seedPairsPath = path.join(baseCourseDir, 'seed_pairs.json');
  const legoPairsPath = path.join(baseCourseDir, 'lego_pairs.json');

  if (!await fs.pathExists(seedPairsPath) || !await fs.pathExists(legoPairsPath)) {
    return res.status(400).json({ error: 'Prerequisites missing - need seed_pairs.json and lego_pairs.json' });
  }

  // STEP 1: Clean up old baskets for these LEGO_IDs (if lego_baskets.json exists)
  const basketsPath = path.join(baseCourseDir, 'lego_baskets.json');
  let cleanupResult = null;

  if (await fs.pathExists(basketsPath)) {
    console.log(`\n[Phase 5] Step 1: Cleaning up baskets for ${legoIds.length} LEGOs...`);

    try {
      const basketsData = await fs.readJson(basketsPath);

      if (basketsData.baskets && typeof basketsData.baskets === 'object') {
        // Backup deleted baskets
        const deletedBaskets = {};
        let deletedCount = 0;

        legoIds.forEach(legoId => {
          if (basketsData.baskets[legoId]) {
            deletedBaskets[legoId] = basketsData.baskets[legoId];
            delete basketsData.baskets[legoId];
            deletedCount++;
          }
        });

        if (deletedCount > 0) {
          // Save backup
          const backupPath = path.join(baseCourseDir, 'deleted_baskets_backup.json');
          let existingBackup = {};

          if (await fs.pathExists(backupPath)) {
            existingBackup = await fs.readJson(backupPath);
          }

          const backup = {
            ...existingBackup,
            [new Date().toISOString()]: {
              reason: 'regeneration',
              deleted_count: deletedCount,
              basket_ids: legoIds.filter(id => deletedBaskets[id]),
              baskets: deletedBaskets
            }
          };

          await fs.writeJson(backupPath, backup, { spaces: 2 });

          // Save updated baskets file
          await fs.writeJson(basketsPath, basketsData, { spaces: 2 });

          console.log(`[Phase 5]   ✅ Deleted ${deletedCount} old baskets`);
          console.log(`[Phase 5]   💾 Backup saved: deleted_baskets_backup.json`);

          cleanupResult = {
            deletedCount,
            backupPath
          };
        } else {
          console.log(`[Phase 5]   ℹ️  No existing baskets found for these LEGO_IDs (first-time generation)`);
        }
      }
    } catch (error) {
      console.error(`[Phase 5]   ⚠️  Cleanup failed:`, error.message);
      console.error(`[Phase 5]   Continuing with regeneration anyway...`);
    }
  } else {
    console.log(`\n[Phase 5] ℹ️  No existing lego_baskets.json - first-time generation`);
  }

  // Initialize job state (using same structure as regular Phase 5)
  const totalSeeds = legoIds.length; // For regeneration, treat each LEGO_ID as a "seed"
  const job = {
    courseCode: jobKey,
    totalSeeds,
    baseCourseCode: courseCode,
    baseCourseDir,
    target,
    known,
    legoIds, // Regeneration-specific: list of LEGO_IDs to regenerate
    status: 'preparing_scaffolds',
    startedAt: new Date().toISOString(),
    milestones: {
      scaffoldsReady: false,
      scaffoldsReadyAt: null,
      watcherStarted: false,
      watcherStartedAt: null,
      windowsSpawned: 0,
      windowsTotal: 0,
      lastWindowSpawnedAt: null,
      branchesDetected: 0,
      branchesExpected: 0,
      lastBranchDetectedAt: null,
      branchesMerged: 0,
      mergeStartedAt: null,
      mergeCompletedAt: null
    },
    branches: [],
    config: null,
    windowsSpawned: 0,
    branchesDetected: 0,
    merged: false,
    error: null,
    warnings: []
  };

  activeJobs.set(jobKey, job);

  // ========================================
  // NOW USE EXACT SAME FLOW AS REGULAR PHASE 5
  // ========================================

  try {
    // STEP 2: Prep Phase 5 scaffolds (mechanical work)
    // Only prep scaffolds for the missing LEGO_IDs
    console.log(`\n[Phase 5] STEP 2: Running scaffold prep script for ${legoIds.length} LEGO_IDs...`);
    const { preparePhase5Scaffolds } = require('./prep-scaffolds.cjs');
    const scaffoldResult = await preparePhase5Scaffolds(baseCourseDir, { legoIds }); // Filter to only these LEGO_IDs

    console.log(`[Phase 5] ✅ Phase 5 scaffolds ready`);
    console.log(`[Phase 5]    Total LEGOs: ${scaffoldResult.totalNewLegos || legoIds.length}`);

    // STEP 3: Load configuration for parallelization (use same config as regular Phase 5)
    const config = loadConfig();
    const phase5Config = config.phase5_basket_generation;

    const browsersConfig = phase5Config.browsers;
    const agentsPerBrowser = phase5Config.agents_per_browser;
    const seedsPerAgent = phase5Config.seeds_per_agent || 10;

    console.log(`\n[Phase 5] STEP 3: Parallelization Strategy (using regular Phase 5 config):`);
    console.log(`[Phase 5]    Browser windows: ${browsersConfig}`);
    console.log(`[Phase 5]    Agents per window: ${agentsPerBrowser}`);
    console.log(`[Phase 5]    Seeds per agent: ${seedsPerAgent}`);

    // STEP 4: Start branch watcher (same as regular Phase 5)
    console.log(`\n[Phase 5] STEP 4: Starting branch watcher...`);
    await startBranchWatcher(jobKey, browsersConfig, baseCourseDir);

    // STEP 5: Spawn browser windows (REGENERATION MODE - pass legoIds instead of seed range)
    console.log(`\n[Phase 5] STEP 5: Spawning ${browsersConfig} browser windows...`);
    console.log(`[Phase 5]    Regeneration mode: ${legoIds.length} specific LEGO_IDs`);

    await spawnBrowserWindows(jobKey, {
      target,
      known,
      legoIds, // Pass legoIds for regeneration
      isRegeneration: true
    }, baseCourseDir, browsersConfig, agentsPerBrowser, seedsPerAgent);

    // Send success response
    res.json({
      success: true,
      message: `Basket regeneration started for ${courseCode}`,
      cleanup: cleanupResult ? {
        deletedOldBaskets: cleanupResult.deletedCount,
        backupSaved: true
      } : {
        deletedOldBaskets: 0,
        note: 'No existing baskets to clean up'
      },
      job: {
        courseCode: jobKey,
        totalBaskets: legoIds.length,
        config: { browsers: browsersConfig, agents: agentsPerBrowser, seedsPerAgent },
        status: 'running',
        scaffolds: scaffoldResult
      }
    });
  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    activeJobs.delete(jobKey);
    console.error(`[Phase 5] ❌ Failed to start regeneration:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /launch-12-masters
 * Launch the 12-master orchestration system for Phase 5
 *
 * This endpoint:
 * 1. Runs detection to find missing baskets
 * 2. Generates patch manifest dividing work across 12 masters
 * 3. Generates 12 master prompts
 * 4. Launches 12 Safari windows with Claude Code
 *
 * Body: {
 *   courseCode: string,
 *   target: string,
 *   known: string
 * }
 */
app.post('/launch-12-masters', async (req, res) => {
  const { courseCode, target, known } = req.body;

  if (!courseCode || !target || !known) {
    return res.status(400).json({ error: 'courseCode, target, known required' });
  }

  // Check if already running - auto-abort stale jobs
  if (activeJobs.has(courseCode)) {
    const existingJob = activeJobs.get(courseCode);
    const jobAge = Date.now() - new Date(existingJob.timing.startedAt).getTime();
    const thirtyMinutes = 30 * 60 * 1000;

    if (jobAge > thirtyMinutes) {
      console.log(`[Phase 5] ⚠️  Auto-aborting stale job (${Math.round(jobAge / 60000)} minutes old)`);
      activeJobs.delete(courseCode);
    } else {
      return res.status(409).json({
        error: `Phase 5 already running for ${courseCode}`,
        elapsedMinutes: Math.round(jobAge / 60000),
        tip: 'Use /abort endpoint or wait for auto-timeout (30min)'
      });
    }
  }

  console.log(`\n[Phase 5] ====================================`);
  console.log(`[Phase 5] SMART LEGO-BASED GENERATION`);
  console.log(`[Phase 5] ====================================`);
  console.log(`[Phase 5] Course: ${courseCode}`);
  console.log(`[Phase 5] Target: ${target}, Known: ${known}`);

  const baseCourseDir = path.join(VFS_ROOT, 'public/vfs/courses', courseCode);

  try {
    // STEP 1: Run detection to find missing baskets
    console.log(`\n[Phase 5] Step 1: Running detection...`);
    const { execSync } = require('child_process');

    const detectionOutput = execSync(
      `node scripts/detect_missing_baskets_new_only.cjs ${courseCode}`,
      { cwd: path.join(__dirname, '../..'), encoding: 'utf8' }
    );

    console.log(detectionOutput);

    // Read the detection results
    const missingBasketsPath = path.join(baseCourseDir, 'phase5_missing_baskets_new_only.json');
    if (!await fs.pathExists(missingBasketsPath)) {
      return res.status(500).json({ error: 'Detection script did not generate output file' });
    }

    const missingData = await fs.readJson(missingBasketsPath);
    const totalMissing = missingData.missing_baskets.length;

    console.log(`[Phase 5] ✅ Detection complete: ${totalMissing} missing baskets`);

    if (totalMissing === 0) {
      return res.json({
        success: true,
        message: 'No missing baskets - Phase 5 already complete!',
        totalMissing: 0
      });
    }

    // STEP 2: Read existing baskets to get complete picture
    console.log(`\n[Phase 5] Step 2: Analyzing course state...`);

    const legoBasketsPath = path.join(baseCourseDir, 'lego_baskets.json');
    const introductionsPath = path.join(baseCourseDir, 'introductions.json');

    let existingBaskets = {};
    let totalIntroductions = 0;

    if (await fs.pathExists(legoBasketsPath)) {
      const basketsData = await fs.readJson(legoBasketsPath);
      existingBaskets = basketsData.baskets || {};
    }

    if (await fs.pathExists(introductionsPath)) {
      const introsData = await fs.readJson(introductionsPath);
      totalIntroductions = Object.keys(introsData.presentations || {}).length;
    }

    // Calculate seed-level statistics
    const seedStats = {};
    for (let i = 1; i <= 668; i++) {
      const seedId = `S${String(i).padStart(4, '0')}`;
      seedStats[seedId] = { total: 0, complete: 0, missing: 0 };
    }

    // Count introductions per seed
    if (await fs.pathExists(introductionsPath)) {
      const introsData = await fs.readJson(introductionsPath);
      Object.keys(introsData.presentations || {}).forEach(legoId => {
        const seedId = legoId.substring(0, 5);
        if (seedStats[seedId]) {
          seedStats[seedId].total++;
          if (existingBaskets[legoId]) {
            seedStats[seedId].complete++;
          } else {
            seedStats[seedId].missing++;
          }
        }
      });
    }

    // Identify complete and incomplete seeds
    const completeSeeds = [];
    const incompleteSeeds = [];
    const emptySeeds = [];

    Object.keys(seedStats).forEach(seedId => {
      const stats = seedStats[seedId];
      if (stats.total === 0) {
        emptySeeds.push(seedId);
      } else if (stats.missing === 0) {
        completeSeeds.push(seedId);
      } else {
        incompleteSeeds.push(seedId);
      }
    });

    console.log(`[Phase 5]   Total introductions: ${totalIntroductions}`);
    console.log(`[Phase 5]   Existing baskets: ${Object.keys(existingBaskets).length}`);
    console.log(`[Phase 5]   Complete seeds: ${completeSeeds.length}/668`);
    console.log(`[Phase 5]   Incomplete seeds: ${incompleteSeeds.length}`);
    console.log(`[Phase 5]   Empty seeds: ${emptySeeds.length}`);

    // STEP 3: Calculate optimal LEGO-based distribution
    console.log(`\n[Phase 5] Step 3: Calculating optimal distribution...`);

    const allMissingLegos = missingData.missing_baskets.map(b => b.legoId).sort();

    // Distribution parameters
    const legosPerWorker = 5; // Target <5 LEGOs per worker
    const workersPerBrowser = 15; // Mid-range of 10-20
    const legosPerBrowser = legosPerWorker * workersPerBrowser; // 75 LEGOs per browser

    const browsersNeeded = Math.ceil(totalMissing / legosPerBrowser);
    const actualBrowsers = Math.min(browsersNeeded, 15); // Cap at 15

    console.log(`[Phase 5]   Total missing LEGOs: ${totalMissing}`);
    console.log(`[Phase 5]   Distribution: ${actualBrowsers} browsers × ~${workersPerBrowser} workers × ~${legosPerWorker} LEGOs`);
    console.log(`[Phase 5]   Expected workers: ${Math.ceil(totalMissing / legosPerWorker)}`);

    // STEP 4: Distribute LEGOs across browsers
    console.log(`\n[Phase 5] Step 4: Distributing LEGOs across ${actualBrowsers} browsers...`);

    const browsers = [];
    const legosPerActualBrowser = Math.ceil(totalMissing / actualBrowsers);

    for (let i = 0; i < actualBrowsers; i++) {
      const startIdx = i * legosPerActualBrowser;
      const endIdx = Math.min(startIdx + legosPerActualBrowser, totalMissing);
      const browserLegos = allMissingLegos.slice(startIdx, endIdx);

      // Distribute LEGOs across workers within this browser
      const workers = [];
      const workersInBrowser = Math.ceil(browserLegos.length / legosPerWorker);

      for (let w = 0; w < workersInBrowser; w++) {
        const workerStartIdx = w * legosPerWorker;
        const workerEndIdx = Math.min(workerStartIdx + legosPerWorker, browserLegos.length);
        const workerLegos = browserLegos.slice(workerStartIdx, workerEndIdx);

        workers.push({
          workerNum: w + 1,
          legoIds: workerLegos,
          legoCount: workerLegos.length
        });
      }

      browsers.push({
        browserNum: i + 1,
        name: `browser_${String(i + 1).padStart(2, '0')}`,
        workers,
        totalLegos: browserLegos.length,
        legoIds: browserLegos
      });

      console.log(`[Phase 5]   Browser ${i + 1}: ${browserLegos.length} LEGOs → ${workers.length} workers`);
    }

    // Save manifest with complete course state
    const manifest = {
      course: courseCode,
      generated: new Date().toISOString(),
      course_state: {
        total_introductions: totalIntroductions,
        total_baskets: Object.keys(existingBaskets).length,
        total_missing: totalMissing,
        completion_percentage: totalIntroductions > 0 ? Math.round((Object.keys(existingBaskets).length / totalIntroductions) * 100) : 0,
        seeds: {
          total: 668,
          complete: completeSeeds.length,
          incomplete: incompleteSeeds.length,
          empty: emptySeeds.length
        }
      },
      distribution: {
        browsers: actualBrowsers,
        workers_per_browser: workersPerBrowser,
        legos_per_worker: legosPerWorker
      },
      browsers: browsers.map(b => ({
        name: b.name,
        workers: b.workers.length,
        legos: b.totalLegos,
        lego_ids: b.legoIds
      })),
      seed_details: {
        complete_seeds: completeSeeds,
        incomplete_seeds: incompleteSeeds.map(seedId => ({
          seed: seedId,
          total: seedStats[seedId].total,
          complete: seedStats[seedId].complete,
          missing: seedStats[seedId].missing
        }))
      }
    };

    const manifestPath = path.join(baseCourseDir, 'phase5_lego_distribution_manifest.json');
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });
    console.log(`[Phase 5] ✅ Manifest saved: ${totalMissing} LEGOs across ${actualBrowsers} browsers`);
    console.log(`[Phase 5]   Course completion: ${manifest.course_state.completion_percentage}% (${completeSeeds.length}/668 seeds complete)`);

    // STEP 5: Generate browser prompts
    console.log(`\n[Phase 5] Step 5: Generating ${actualBrowsers} browser prompts...`);

    const promptsDir = path.join(__dirname, '../../scripts/phase5_browser_prompts');
    await fs.ensureDir(promptsDir);

    // Get ngrok URL for scaffolds
    const ngrokUrl = process.env.NGROK_URL || 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev';

    for (const browser of browsers) {
      const promptContent = `# Phase 5 Browser Coordinator: ${browser.name}

**Course:** \`${courseCode}\`
**Your LEGOs:** ${browser.totalLegos} LEGOs
**Workers to spawn:** ${browser.workers.length} (via Task tool)

---

## 🎯 YOUR MISSION: SPAWN ${browser.workers.length} LANGUAGE EXPERT WORKERS

You are a **Browser Coordinator**. You DON'T generate baskets yourself.

**Your workflow:**

1. ✅ **Review worker assignments** below
2. ✅ **Spawn ${browser.workers.length} workers** - Use Task tool ${browser.workers.length} times in ONE message (parallel!)
3. ✅ **Work SILENTLY** - No verbose progress logs
4. ✅ **Monitor completion** - Workers will submit via REST API
5. ✅ **Report brief summary** - "✅ ${browser.name} complete: ${browser.workers.length} workers spawned for ${browser.totalLegos} LEGOs"

---

## 📋 WORKER ASSIGNMENTS

${browser.workers.map(w => `**Worker ${w.workerNum}:** ${w.legoCount} LEGOs (${w.legoIds.join(', ')})`).join('\n')}

---

## 🚀 SPAWN WORKERS

Use Task tool ${browser.workers.length} times in a SINGLE message (parallel spawn).

**Worker prompt template:**

For each worker, use this exact format with the LEGO IDs from assignments above:

\`\`\`json
{
  "subagent_type": "general-purpose",
  "description": "Phase 5 Worker [N] - ${browser.name}",
  "prompt": "# 🎭 YOUR ROLE

You are a **world-leading creator of practice phrases** in the target language that help learners internalize language patterns naturally and quickly.

Your phrases must:
- ✅ Sound **natural in BOTH languages** (English and Spanish)
- ✅ Use **realistic communication scenarios** learners would encounter
- ✅ Follow **vocabulary constraints** (GATE compliance - only use available vocabulary)
- ✅ Help learners **internalize target language grammar patterns** through practice
- ✅ **EVERY phrase MUST contain the complete LEGO** - this is practice, not random conversation

**CRITICAL PRINCIPLE**: Practice phrases are opportunities for learners to **PRACTICE SAYING THE LEGO**.

Not random vocabulary. Not building up TO the lego. Building FROM the lego by adding context.

---

## 📖 UNDERSTAND THE METHODOLOGY

**Read for context**: https://ssi-dashboard-v7.vercel.app/docs/phase_intelligence/phase_5_lego_baskets.md

This explains WHY we generate baskets and the pedagogical principles behind LEGO-based learning.

**Key takeaways:**
- LEGOs are linguistic building blocks for recombination
- GATE compliance ensures learners only practice known vocabulary
- Quality over quantity (better 8 perfect phrases than 10 with 2 bad ones)
- Grammar must ALWAYS be correct in both languages
- Extended linguistic thinking required (not mechanical templates)

---

## 🎯 YOUR ASSIGNMENT

**LEGOs to generate:** [Worker will receive specific LEGO ID list from assignment above]

Replace [Worker N] with the actual worker number (1, 2, 3, etc.) and paste the LEGO IDs from the worker assignments above.

---

## 🔧 GENERATION WORKFLOW

For EACH LEGO in your assignment, follow this exact process:

### Step 1: Fetch Required Data

**Get LEGO details from Phase 3 outputs:**
- GET: \`${ORCHESTRATOR_URL}/api/courses/${courseCode}/phase-outputs/3/lego_pairs.json\`
- Look up your assigned LEGO IDs in the \`lego_pairs.json\` response

**Get phase intelligence:**
- GET: \`${ORCHESTRATOR_URL}/api/phase-intelligence/5\`
- Review generation methodology and best practices

**Example API calls:**
\`\`\`bash
# Get LEGO pairs
curl ${ORCHESTRATOR_URL}/api/courses/${courseCode}/phase-outputs/3/lego_pairs.json

# Get phase intelligence
curl ${ORCHESTRATOR_URL}/api/phase-intelligence/5
\`\`\`

The lego_pairs.json provides:
- The LEGO you're teaching (known → target)
- Complete available vocabulary (from previous seeds and LEGOs)
- LEGO type (M/FD/LUT)
- Seed context

### Step 2: Think Linguistically

**Extended thinking required** - Ask yourself:
- What is this LEGO? (verb/noun/phrase/etc.)
- How would learners naturally use it?
- What realistic scenarios would include this LEGO?
- What relates to the seed theme?

**Start with English thoughts**, then express in Spanish using only available vocabulary.

### Step 3: Generate 10 Practice Phrases

**CRITICAL RULE**: Phrase 1 must ALREADY contain the COMPLETE LEGO.

Build FROM the LEGO, not TO it:
- ✅ CORRECT: \\"I don't know why\\" → \\"I don't know why that is\\" → \\"I don't know why you think so\\"
- ❌ WRONG: \\"I don't know\\" → \\"I don't\\" → \\"I don't know why\\" (building TO it!)

**Progressive complexity** (2-2-2-4 distribution):
- Phrases 1-2: SHORT (LEGO alone or +1 word)
- Phrases 3-4: MEDIUM (LEGO +2-3 words)
- Phrases 5-6: LONGER (LEGO +4-6 words)
- Phrases 7-10: LONGEST (LEGO +6+ words, aim for natural sentences)

### Step 4: Validate EVERY Phrase

**For EACH phrase, check all 3:**

1. ✅ **Contains COMPLETE LEGO?**
   - If LEGO is \\"it's unusual that\\", the phrase must contain \\"it's unusual that\\"
   - NOT \\"it's unusual\\" (incomplete)
   - NOT \\"unusual that\\" (incomplete)
   - The COMPLETE LEGO must be present

2. ✅ **GATE Compliant?**
   - Every Spanish word must exist in the scaffold's vocabulary list
   - Check EVERY word - if ANY word is missing, the phrase FAILS
   - No guessing or introducing new vocabulary

3. ✅ **Grammatically correct in BOTH languages?**
   - Natural English grammar
   - Natural Spanish grammar (verb conjugations, gender agreement, word order)
   - Would a native speaker understand this naturally?

### Step 5: Fix Failures

**If ANY phrase fails ANY check:**
- DELETE that phrase immediately
- Think of a NEW English thought that uses the LEGO
- Express it in Spanish using only available vocabulary
- Re-validate the new phrase

**Keep iterating until ALL 10 phrases pass ALL 3 checks.**

### Step 6: Submit Your Work

**POST submission to orchestrator:**
- Endpoint: \`${ORCHESTRATOR_URL}/api/phase5/${courseCode}/submit\`
- Method: POST
- Content-Type: application/json

**Payload format:**
\`\`\`json
{
  "version": "8.2.0",
  "course": "${courseCode}",
  "baskets": {
    "[LEGO_ID]": {
      "lego": { "known": "...", "target": "..." },
      "practice_phrases": [
        { "known": "...", "target": "..." }
      ]
    }
  }
}
\`\`\`

**Expected response:**
\`\`\`json
{
  "success": true,
  "basketCount": 1,
  "savedTo": "courses/${courseCode}/lego_baskets.json"
}
\`\`\`

**Example API call:**
\`\`\`bash
curl -X POST ${ORCHESTRATOR_URL}/api/phase5/${courseCode}/submit \\
  -H "Content-Type: application/json" \\
  -d '{
    "version": "8.2.0",
    "course": "${courseCode}",
    "baskets": { "S0117L01": { ... } }
  }'
\`\`\`

---

## ⚠️ COMMON MISTAKES TO AVOID

❌ Building up TO the LEGO instead of FROM it
❌ Using vocabulary not in the scaffold's available list
❌ Mechanical/template generation without thinking
❌ Unnatural grammar in either language
❌ Uploading without validating every phrase

✅ Natural, meaningful utterances
✅ Every phrase contains the complete LEGO
✅ Strict GATE compliance
✅ Grammatically perfect in both languages
✅ Evidence of linguistic thinking

---

## 🎯 SUCCESS CRITERIA

Your work is successful when:
- All 10 phrases contain the COMPLETE LEGO
- 100% GATE compliance (every Spanish word from scaffold vocabulary)
- Natural, grammatically correct in both languages
- Progressive complexity from simple to rich contexts
- Quality over speed - better 8 perfect than 10 with failures

**Remember**: You're a linguistic expert creating learning materials, not a mechanical processor. Think, create, validate.

Work silently. Report brief summary when complete."
}
\`\`\`

---

## 🎯 START NOW

**Spawn all ${browser.workers.length} workers in parallel!**

Each worker:
1. Gets its LEGO ID list from assignments above
2. Fetches LEGO data via REST API: \`GET ${ORCHESTRATOR_URL}/api/courses/${courseCode}/phase-outputs/3/lego_pairs.json\`
3. Fetches phase intelligence: \`GET ${ORCHESTRATOR_URL}/api/phase-intelligence/5\`
4. Generates baskets for each LEGO
5. Submits via REST API: \`POST ${ORCHESTRATOR_URL}/api/phase5/${courseCode}/submit\`

Report: "✅ ${browser.name} complete: ${browser.workers.length} workers spawned for ${browser.totalLegos} LEGOs"
`;

      const promptPath = path.join(promptsDir, `${browser.name}.md`);
      await fs.writeFile(promptPath, promptContent);
    }

    console.log(`[Phase 5] ✅ Generated ${actualBrowsers} browser prompts in scripts/phase5_browser_prompts/`);

    // STEP 6: Launch browser windows
    console.log(`\n[Phase 5] Step 6: Launching ${actualBrowsers} browser windows...`);

    for (let i = 0; i < actualBrowsers; i++) {
      const browser = browsers[i];
      const promptPath = path.join(promptsDir, `${browser.name}.md`);
      const promptContent = await fs.readFile(promptPath, 'utf8');

      console.log(`[Phase 5]   Launching ${browser.name}: ${browser.totalLegos} LEGOs → ${browser.workers.length} workers...`);

      try {
        await spawnClaudeCodeSession(promptContent, browser.name);
      } catch (error) {
        console.error(`[Phase 5]   ⚠️  Failed to launch ${browser.name}:`, error.message);
      }

      // 5 second delay between launches (critical for reliability)
      if (i < actualBrowsers - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log(`\n[Phase 5] ✅ Launched ${actualBrowsers} browsers (${Math.ceil(totalMissing / legosPerWorker)} total workers)`);
    console.log(`[Phase 5] Monitor progress in browser tabs`);

    res.json({
      success: true,
      message: `Launched ${actualBrowsers} browsers for ${totalMissing} missing baskets`,
      totalMissing,
      distribution: {
        browsers: actualBrowsers,
        total_workers: Math.ceil(totalMissing / legosPerWorker),
        legos_per_worker: legosPerWorker
      },
      browsers: browsers.map(b => ({
        name: b.name,
        workers: b.workers.length,
        legos: b.totalLegos
      }))
    });

  } catch (error) {
    console.error(`[Phase 5] ❌ LEGO-based launch failed:`, error);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * POST /upload-basket - Receive baskets directly from Claude Code agents
 *
 * Body: {
 *   course: 'cmn_for_eng',
 *   seed: 'S0532',
 *   baskets: { S0532L01: {...}, S0532L02: {...} }
 * }
 */
app.post('/upload-basket', async (req, res) => {
  try {
    const { course, seed, baskets, agentId, stagingOnly = false } = req.body;

    if (!course || !seed || !baskets) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: course, seed, baskets'
      });
    }

    console.log(`📥 Receiving basket upload: ${course} / ${seed} (${Object.keys(baskets).length} LEGOs)${agentId ? ` from ${agentId}` : ''}`);

    // Enrich baskets with server-added fields before validation
    try {
      const legoPairsPath = path.join(VFS_ROOT, 'public/vfs/courses', course, 'lego_pairs.json');
      const seedPairsPath = path.join(VFS_ROOT, 'public/vfs/courses', course, 'seed_pairs.json');

      const legoPairs = await fs.readJson(legoPairsPath);
      const seedPairs = await fs.readJson(seedPairsPath);

      // Find the seed entry in lego_pairs
      const seedEntry = legoPairs.seeds.find(s => s.seed_id === seed);
      if (!seedEntry) {
        return res.status(400).json({
          success: false,
          error: `Seed ${seed} not found in lego_pairs.json`
        });
      }

      // Get the seed sentence from seed_pairs
      const seedSentence = seedPairs.translations[seed];
      if (!seedSentence) {
        return res.status(400).json({
          success: false,
          error: `Seed ${seed} not found in seed_pairs.json`
        });
      }

      // Determine which LEGO is final in this seed
      const legosInSeed = seedEntry.legos || [];
      const finalLegoId = legosInSeed.length > 0 ? legosInSeed[legosInSeed.length - 1].id : null;

      // Enrich each basket
      for (const [legoId, basket] of Object.entries(baskets)) {
        // 1. Derive is_final_lego
        basket.is_final_lego = (legoId === finalLegoId);

        // 2. If final LEGO, append complete seed sentence (if not already present)
        if (basket.is_final_lego && basket.practice_phrases) {
          const hasSeedSentence = basket.practice_phrases.some(p =>
            p.known === seedSentence.known && p.target === seedSentence.target
          );

          if (!hasSeedSentence) {
            basket.practice_phrases.push({
              known: seedSentence.known,
              target: seedSentence.target
            });
          }
        }

        // 3. Add phrase_count
        basket.phrase_count = basket.practice_phrases ? basket.practice_phrases.length : 0;
      }

      console.log(`✅ Enriched ${Object.keys(baskets).length} baskets (final LEGO: ${finalLegoId || 'none'})`);
    } catch (enrichError) {
      console.error(`⚠️  Enrichment failed:`, enrichError.message);
      return res.status(500).json({
        success: false,
        error: `Failed to enrich baskets: ${enrichError.message}`
      });
    }

    // Validate basket format
    for (const [legoId, basket] of Object.entries(baskets)) {
      // Check required fields - NEW: lego is object with labels
      if (!basket.lego || typeof basket.lego !== 'object' || Array.isArray(basket.lego)) {
        return res.status(400).json({
          success: false,
          error: `Invalid basket format for ${legoId}: "lego" must be object { "known": "...", "target": "..." }`,
          received: basket.lego,
          expectedFormat: '{ "known": "English phrase", "target": "Spanish phrase" }'
        });
      }

      if (!basket.lego.known || !basket.lego.target) {
        return res.status(400).json({
          success: false,
          error: `Invalid basket format for ${legoId}: "lego" must have "known" and "target" fields`,
          received: basket.lego,
          expectedFormat: '{ "known": "English phrase", "target": "Spanish phrase" }'
        });
      }

      // Note: "type" field is optional in simplified format (server can derive from lego_pairs.json if needed)
      // Legacy baskets may include it, but it's not required for new submissions

      if (!basket.practice_phrases || !Array.isArray(basket.practice_phrases)) {
        return res.status(400).json({
          success: false,
          error: `Invalid basket format for ${legoId}: "practice_phrases" must be array`,
          received: basket.practice_phrases
        });
      }

      // Validate each practice phrase
      for (let i = 0; i < basket.practice_phrases.length; i++) {
        const phrase = basket.practice_phrases[i];

        // Reject old array format
        if (Array.isArray(phrase)) {
          return res.status(400).json({
            success: false,
            error: `Invalid phrase format for ${legoId} phrase ${i + 1}: array format no longer supported`,
            received: phrase,
            rejectedFormat: '["English phrase", "Spanish phrase", null, 1]',
            expectedFormat: '{ "known": "English phrase", "target": "Spanish phrase" }'
          });
        }

        // Reject language code format (es/en)
        if (phrase.es || phrase.en) {
          return res.status(400).json({
            success: false,
            error: `Invalid phrase format for ${legoId} phrase ${i + 1}: use "known"/"target" not language codes`,
            received: phrase,
            rejectedFormat: '{ "es": "...", "en": "..." }',
            expectedFormat: '{ "known": "English phrase", "target": "Spanish phrase" }'
          });
        }

        // Require object with known/target fields
        if (typeof phrase !== 'object' || !phrase.known || !phrase.target) {
          return res.status(400).json({
            success: false,
            error: `Invalid phrase format for ${legoId} phrase ${i + 1}: must have "known" and "target" fields`,
            received: phrase,
            expectedFormat: '{ "known": "English phrase", "target": "Spanish phrase" }'
          });
        }

        // Validate types
        if (typeof phrase.known !== 'string' || typeof phrase.target !== 'string') {
          return res.status(400).json({
            success: false,
            error: `Invalid phrase format for ${legoId} phrase ${i + 1}: "known" and "target" must be strings`,
            received: phrase
          });
        }
      }

      // Warn if wrong key name used
      if (basket.phrases && !basket.practice_phrases) {
        console.warn(`⚠️  Warning: ${legoId} uses "phrases" instead of "practice_phrases" - this will be rejected`);
      }
    }

    // Course directory
    const courseDir = path.join(VFS_ROOT || process.cwd(), 'public/vfs/courses', course);
    const legoBasketsPath = path.join(courseDir, 'lego_baskets.json');
    const phase5OutputsDir = path.join(courseDir, 'phase5_outputs');
    const phase5StagingDir = path.join(courseDir, 'phase5_baskets_staging');

    // Ensure directories exist
    await fs.ensureDir(phase5OutputsDir);
    await fs.ensureDir(phase5StagingDir);

    // Save individual basket file to phase5_outputs
    // MERGE with existing baskets (multiple workers may upload LEGOs from same seed)
    const basketFilePath = path.join(phase5OutputsDir, `seed_${seed}_baskets.json`);
    let existingOutputBaskets = {};
    if (await fs.pathExists(basketFilePath)) {
      existingOutputBaskets = await fs.readJson(basketFilePath);
    }
    const mergedOutputBaskets = { ...existingOutputBaskets, ...baskets };
    await fs.writeJson(basketFilePath, mergedOutputBaskets, { spaces: 2 });
    console.log(`   💾 Saved to ${basketFilePath} (${Object.keys(mergedOutputBaskets).length} LEGOs)`);

    // Save to staging for review (git-ignored, safe)
    // MERGE with existing baskets (multiple workers may upload LEGOs from same seed)
    const stagingFilePath = path.join(phase5StagingDir, `seed_${seed}_baskets.json`);
    let existingBaskets = {};
    if (await fs.pathExists(stagingFilePath)) {
      existingBaskets = await fs.readJson(stagingFilePath);
    }
    const mergedBaskets = { ...existingBaskets, ...baskets };
    await fs.writeJson(stagingFilePath, mergedBaskets, { spaces: 2 });
    console.log(`   📦 Staged to ${stagingFilePath} (${Object.keys(mergedBaskets).length} LEGOs total)`);

    // Track upload in job state (if job exists)
    const job = activeJobs.get(course);
    if (job && job.uploads) {
      job.uploads.seedsUploaded.add(seed);
      job.uploads.legosReceived += Object.keys(baskets).length;
      job.uploads.lastUploadAt = new Date().toISOString();

      const progress = `${job.uploads.legosReceived}/${job.uploads.expectedLegos} LEGOs`;
      console.log(`   📊 Progress: ${progress} (${job.uploads.seedsUploaded.size}/${job.uploads.expectedSeeds} seeds)`);

      // Check if all uploads complete
      if (!job.uploads.complete && job.uploads.legosReceived >= job.uploads.expectedLegos) {
        job.uploads.complete = true;
        job.status = 'uploads_complete';
        console.log(`\n🎉 ALL UPLOADS COMPLETE! Received ${job.uploads.legosReceived} LEGOs from ${job.uploads.seedsUploaded.size} seeds`);

        // Trigger Phase 5 completion workflow
        triggerPhase5Completion(course, job).catch(err => {
          console.error(`❌ Phase 5 completion workflow failed:`, err);
          job.error = err.message;
          job.status = 'completion_failed';
        });
      }
    }

    return res.json({
      success: true,
      message: job && job.uploads?.complete
        ? '✅ All baskets received! Phase 5 completion workflow started.'
        : 'Baskets saved to staging',
      stagingPath: stagingFilePath,
      basketCount: Object.keys(baskets).length,
      reviewCommand: `node tools/phase5/preview-merge.cjs ${course}`,
      mergeCommand: `node tools/phase5/extract-and-normalize.cjs ${course}`
    });

    // LEGACY AUTO-MERGE CODE (disabled - use extract-and-normalize.cjs instead)
    // Load or create lego_baskets.json
    // let legoBaskets = { metadata: {}, baskets: {} };
    // if (await fs.pathExists(legoBasketsPath)) {
    //   legoBaskets = await fs.readJson(legoBasketsPath);
    // }

    // Merge baskets
    let addedCount = 0;
    let updatedCount = 0;
    for (const [legoId, basket] of Object.entries(baskets)) {
      if (legoBaskets.baskets[legoId]) {
        updatedCount++;
      } else {
        addedCount++;
      }
      legoBaskets.baskets[legoId] = basket;
    }

    // Calculate progress metrics
    const totalBaskets = Object.keys(legoBaskets.baskets).length;
    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
    let totalNeeded = 0;
    let progress = 0;
    let missing = 0;

    if (await fs.pathExists(legoPairsPath)) {
      const legoPairs = await fs.readJson(legoPairsPath);
      legoPairs.seeds.forEach(s => {
        s.legos.forEach(l => {
          if (l.new === true) totalNeeded++;
        });
      });
      missing = Math.max(0, totalNeeded - totalBaskets);
      progress = totalNeeded > 0 ? Math.round((totalBaskets / totalNeeded) * 10000) / 100 : 0;
    }

    // Update metadata with enhanced tracking
    if (!legoBaskets.metadata.uploads) {
      legoBaskets.metadata.uploads = [];
    }

    legoBaskets.metadata = {
      ...legoBaskets.metadata,
      last_upload: new Date().toISOString(),
      last_seed: seed,
      last_agent: agentId || 'unknown',
      total_baskets: totalBaskets,
      total_needed: totalNeeded,
      missing: missing,
      progress: progress
    };

    // Record upload event (keep last 50)
    legoBaskets.metadata.uploads.push({
      timestamp: new Date().toISOString(),
      seed,
      agentId: agentId || 'unknown',
      legosAdded: addedCount,
      legosUpdated: updatedCount,
      totalAfter: totalBaskets
    });

    if (legoBaskets.metadata.uploads.length > 50) {
      legoBaskets.metadata.uploads = legoBaskets.metadata.uploads.slice(-50);
    }

    // Save merged file
    await fs.writeJson(legoBasketsPath, legoBaskets, { spaces: 2 });

    console.log(`   ✅ Merged into lego_baskets.json (${addedCount} added, ${updatedCount} updated)`);
    console.log(`   📊 Total baskets: ${totalBaskets}/${totalNeeded} (${progress}%)`);

    res.json({
      success: true,
      seed,
      agentId: agentId || 'unknown',
      timestamp: new Date().toISOString(),
      legosReceived: Object.keys(baskets).length,
      added: addedCount,
      updated: updatedCount,
      totalBaskets,
      totalNeeded,
      missing,
      progress
    });

  } catch (error) {
    console.error('❌ Upload basket error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /basket-status/:course - Get current basket counts
 */
app.get('/basket-status/:course', async (req, res) => {
  try {
    const { course } = req.params;
    const courseDir = path.join(VFS_ROOT || process.cwd(), 'public/vfs/courses', course);
    const legoBasketsPath = path.join(courseDir, 'lego_baskets.json');
    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');

    if (!await fs.pathExists(legoBasketsPath)) {
      return res.json({
        success: true,
        totalBaskets: 0,
        totalNeeded: 0,
        missing: 0,
        progress: 0
      });
    }

    const legoBaskets = await fs.readJson(legoBasketsPath);
    const totalBaskets = Object.keys(legoBaskets.baskets || {}).length;

    let totalNeeded = 0;
    if (await fs.pathExists(legoPairsPath)) {
      const legoPairs = await fs.readJson(legoPairsPath);
      legoPairs.seeds.forEach(seed => {
        seed.legos.forEach(lego => {
          if (lego.new === true) totalNeeded++;
        });
      });
    }

    const missing = Math.max(0, totalNeeded - totalBaskets);
    const progress = totalNeeded > 0 ? Math.round((totalBaskets / totalNeeded) * 10000) / 100 : 0;

    // Recent activity (last 10 uploads)
    const recentUploads = (legoBaskets.metadata?.uploads || []).slice(-10).reverse();

    // Active agents (agents who uploaded in last 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const activeAgents = new Set();
    (legoBaskets.metadata?.uploads || []).forEach(upload => {
      if (new Date(upload.timestamp).getTime() > fiveMinutesAgo) {
        activeAgents.add(upload.agentId);
      }
    });

    res.json({
      success: true,
      totalBaskets,
      totalNeeded,
      missing,
      progress,
      lastUpload: legoBaskets.metadata?.last_upload,
      lastSeed: legoBaskets.metadata?.last_seed,
      lastAgent: legoBaskets.metadata?.last_agent,
      activeAgents: Array.from(activeAgents),
      recentUploads
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Trigger Phase 5 completion workflow
 * Runs after all uploads complete
 */
async function triggerPhase5Completion(courseCode, job) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PHASE 5 COMPLETION WORKFLOW`);
  console.log('='.repeat(60));
  console.log(`Course: ${courseCode}`);
  console.log(`LEGOs received: ${job.uploads.legosReceived}`);
  console.log(`Seeds received: ${job.uploads.seedsUploaded.size}\n`);

  const courseDir = path.join(VFS_ROOT, 'public/vfs/courses', courseCode);

  try {
    // Step 1: Merge staging baskets
    console.log('📦 Step 1: Merging staging baskets...');
    job.status = 'merging_baskets';
    await execScript(path.join(__dirname, '../../scripts/merge-phase5-staging.cjs'), courseCode);
    console.log('✅ Merge complete\n');

    // Step 2: Clean GATE violations
    console.log('🧹 Step 2: Cleaning GATE violations...');
    job.status = 'cleaning_gate';
    await execScript(path.join(__dirname, '../../scripts/clean-baskets-gate.cjs'), courseCode);
    console.log('✅ GATE cleaning complete\n');

    // Step 3: Ensure minimum phrase
    console.log('🛡️  Step 3: Ensuring minimum phrase...');
    job.status = 'ensuring_minimum';
    await execScript(path.join(__dirname, '../../scripts/ensure-minimum-phrase.cjs'), courseCode);
    console.log('✅ Minimum phrase ensured\n');

    // Step 4: Trigger Phase 5.5 (Grammar Validation)
    console.log('📝 Step 4: Triggering grammar validation (Phase 5.5)...');
    job.status = 'triggering_grammar';

    const phase55Response = await fetch('http://localhost:3460/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseCode })
    });

    if (!phase55Response.ok) {
      throw new Error(`Phase 5.5 start failed: ${phase55Response.statusText}`);
    }

    const phase55Result = await phase55Response.json();
    console.log('✅ Grammar validation started\n');

    // Step 5: Wait for Phase 5.5 completion
    console.log('⏳ Step 5: Waiting for grammar validation to complete...');
    job.status = 'waiting_grammar';
    await waitForPhase55(courseCode);
    console.log('✅ Grammar validation complete\n');

    // Mark Phase 5 complete
    job.status = 'phase5_complete';
    job.completedAt = new Date().toISOString();

    console.log('='.repeat(60));
    console.log('✅ PHASE 5 COMPLETE!');
    console.log('='.repeat(60));
    console.log(`\nNext: Phase 6 (Introductions) ready to start`);
    console.log(`Run: POST http://localhost:3461/start {"courseCode": "${courseCode}"}\n`);

    // Notify orchestrator
    if (ORCHESTRATOR_URL) {
      try {
        await fetch(`${ORCHESTRATOR_URL}/phase-complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phase: 'phase5',
            courseCode,
            success: true,
            stats: {
              legosGenerated: job.uploads.legosReceived,
              seedsProcessed: job.uploads.seedsUploaded.size
            }
          })
        });
      } catch (err) {
        console.error('⚠️  Failed to notify orchestrator:', err.message);
      }
    }

  } catch (error) {
    console.error(`\n❌ Phase 5 completion failed:`, error.message);
    job.status = 'completion_failed';
    job.error = error.message;
    throw error;
  }
}

/**
 * Execute a script and wait for completion
 */
function execScript(scriptPath, ...args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [scriptPath, ...args], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', data => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output);
    });

    proc.stderr.on('data', data => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(output);
    });

    proc.on('close', code => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Script failed with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', err => {
      reject(err);
    });
  });
}

/**
 * Wait for Phase 5.5 to complete
 */
async function waitForPhase55(courseCode) {
  const maxWaitTime = 30 * 60 * 1000; // 30 minutes
  const pollInterval = 5000; // 5 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await fetch(`http://localhost:3460/status/${courseCode}`);
      if (!response.ok) {
        throw new Error(`Phase 5.5 status check failed: ${response.statusText}`);
      }

      const status = await response.json();

      if (status.status === 'completed') {
        const deletionRate = status.stats.phrasesDeleted / (status.stats.phrasesDeleted + status.stats.phrasesKept);

        console.log(`   Grammar validation results:`);
        console.log(`     Phrases deleted: ${status.stats.phrasesDeleted}`);
        console.log(`     Phrases kept: ${status.stats.phrasesKept}`);
        console.log(`     Deletion rate: ${(deletionRate * 100).toFixed(2)}%`);

        if (deletionRate > 0.20) {
          throw new Error(`Grammar validation failed: ${(deletionRate * 100).toFixed(1)}% deletion rate (>20% threshold)`);
        }

        return status;
      }

      if (status.status === 'failed') {
        throw new Error(`Phase 5.5 failed: ${status.error}`);
      }

      // Still running, wait and poll again
      await new Promise(resolve => setTimeout(resolve, pollInterval));

    } catch (error) {
      if (error.message.includes('No job found')) {
        // Phase 5.5 might not have started yet, wait a bit
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } else {
        throw error;
      }
    }
  }

  throw new Error('Phase 5.5 timeout: Grammar validation took longer than 30 minutes');
}

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log('');
  console.log(`✅ ${SERVICE_NAME} listening on port ${PORT}`);
  console.log(`   VFS Root: ${VFS_ROOT}`);
  console.log(`   Orchestrator: ${ORCHESTRATOR_URL}`);
  console.log('');
  console.log(`📡 Upload endpoint: http://localhost:${PORT}/upload-basket`);
  console.log(`   Use ngrok to expose this endpoint for remote agents`);
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
