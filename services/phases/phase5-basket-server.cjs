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
        if (lego.new) {
          allLegos.push({
            legoId: lego.id,
            seed: seed.seed_id,
            target: lego.target,
            known: lego.known,
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
        if (lego.new && !existingBaskets[lego.id]) {
          missingLegos.push({
            legoId: lego.id,
            seed: seed.seed_id,
            target: lego.target,
            known: lego.known,
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
async function loadScaffoldData(baseCourseDir, missingLegos) {
  const legoData = {};
  const legoPairsPath = path.join(baseCourseDir, 'lego_pairs.json');
  const scaffoldDir = path.join(baseCourseDir, 'phase5_scaffolds');

  // Load full lego_pairs for context
  const legoPairs = await fs.readJson(legoPairsPath);

  // Build seed lookup
  const seedMap = {};
  for (const seed of legoPairs.seeds || []) {
    seedMap[seed.seed_id] = seed;
  }

  for (const lego of missingLegos) {
    const seedId = lego.seed;
    // Scaffold files are named seed_s0001.json (lowercase, no '_scaffold' suffix)
    const scaffoldPath = path.join(scaffoldDir, `seed_${seedId.toLowerCase()}.json`);

    // Try to load scaffold
    let scaffoldData = null;
    if (await fs.pathExists(scaffoldPath)) {
      try {
        const fullScaffold = await fs.readJson(scaffoldPath);
        scaffoldData = fullScaffold.legos?.[lego.legoId];
      } catch (err) {
        console.warn(`[Phase 5] Could not load scaffold for ${lego.legoId}: ${err.message}`);
      }
    }

    // Build LEGO data with or without scaffold
    const seedInfo = seedMap[seedId];
    const legoIndex = seedInfo?.legos?.findIndex(l => l.id === lego.legoId) || 0;

    legoData[lego.legoId] = {
      lego: [lego.target, lego.known],
      type: lego.type,
      seed: seedId,

      // Scaffold data (if available)
      recent_context: scaffoldData?.recent_context || {},
      current_seed_earlier_legos: scaffoldData?.current_seed_earlier_legos || [],
      is_final_lego: legoIndex === (seedInfo?.legos?.length - 1),

      // Fallback: basic context if no scaffold
      seed_sentence: seedInfo?.seed_pair || [],
      seed_legos: seedInfo?.legos?.map(l => ({
        id: l.id,
        target: l.target,
        known: l.known,
        new: l.new
      })) || []
    };
  }

  return legoData;
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
  const baseCourseDir = path.join(VFS_ROOT, 'public/vfs/courses', baseCourseCode);
  const courseDir = path.join(VFS_ROOT, 'public/vfs/courses', courseCode);

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

    // STEP 2: THREE-TIER ARCHITECTURE CONFIGURATION (Dynamic Sizing)
    // Choose configuration based on job size
    let masterCount, workersPerMaster, seedsPerWorker, configType;

    if (totalSeeds <= 30) {
      // SMALL TEST PATTERN (≤30 seeds)
      // For testing quality AND processes
      masterCount = 3;           // Browser tabs
      workersPerMaster = 5;      // Workers per Master
      seedsPerWorker = 2;        // Seeds per worker
      configType = 'Small Test';
    } else {
      // FULL COURSE PATTERN (>30 seeds)
      // For production runs
      masterCount = 15;          // Browser tabs
      workersPerMaster = 10;     // Workers per Master
      seedsPerWorker = 5;        // Seeds per worker
      configType = 'Full Course';
    }

    const totalWorkers = masterCount * workersPerMaster;
    const capacity = totalWorkers * seedsPerWorker;

    console.log(`\n[Phase 5] Three-Tier Architecture (${configType} Pattern):`);
    console.log(`[Phase 5]    Tier 1 - Orchestrator: 1 (this server)`);
    console.log(`[Phase 5]    Tier 2 - Masters: ${masterCount} browser tabs`);
    console.log(`[Phase 5]    Tier 3 - Workers: ${workersPerMaster} per Master (${totalWorkers} total)`);
    console.log(`[Phase 5]    Seeds per worker: ${seedsPerWorker}`);
    console.log(`[Phase 5]    Total capacity: ${capacity} seeds`);
    console.log(`[Phase 5]    Job size: ${totalSeeds} seeds`);
    console.log(`[Phase 5]    Target LEGOs: ${targetLegos.length} LEGOs`);

    if (capacity < totalSeeds) {
      console.warn(`[Phase 5] ⚠️  Warning: Capacity (${capacity}) < Total Seeds (${totalSeeds})`);
      console.warn(`[Phase 5]    Increase masterCount or seedsPerWorker!`);
    }

    job.config = {
      configType,
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

    // STEP 3: Spawn Master browser tabs with embedded scaffold data
    // No branch watcher needed - workers upload directly via ngrok
    await spawnBrowserWindows(courseCode, {
      target,
      known,
      startSeed,
      endSeed,
      legoData,        // ← Embedded scaffold data for Masters
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

    // Generate Master orchestrator prompt with embedded scaffold data
    const masterPrompt = generatePhase5OrchestratorPrompt(
      courseCode,
      {
        target,
        known,
        startSeed: parseInt(masterSeeds[0].replace('S', '')),
        endSeed: parseInt(masterSeeds[masterSeeds.length - 1].replace('S', '')),
        legoData: masterLegoData,
        targetLegos: masterTargetLegos,
        agentsPerWindow: workersPerMaster,  // Workers per Master
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
1. Read lego_pairs.json to get LEGO details for assigned LEGO_IDs
2. Generate practice baskets using Phase 5 intelligence
3. Upload via ngrok: \`POST https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/phase5/upload-basket\`
4. Include \`stagingOnly: true\` in upload payload
5. No git commits - all uploads go to staging for review

---

## 🚀 SPAWN ALL ${agentCount} AGENTS NOW

Use the Task tool ${agentCount} times in a single message to spawn all agents in parallel.

Divide the ${legoIds.length} LEGO_IDs evenly among the ${agentCount} agents (~${legosPerAgent} LEGOs each).

**Worker prompt template:** Fetch from https://ssi-dashboard-v7.vercel.app/prompts/phase5_worker.md (includes full Phase 5 intelligence guidance)
`;
  }

  // THREE-TIER MODE: Master spawns workers
  const totalSeeds = endSeed - startSeed + 1;
  const legoData = params.legoData || {};
  const targetLegos = params.targetLegos || [];
  const legoCount = targetLegos.length;

  // Fixed: 10 workers per Master
  const workerCount = 10;
  const legosPerWorker = Math.ceil(legoCount / workerCount);

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
  const seedsPerWorker = Math.ceil(seeds.length / workerCount);

  return `# Phase 5 Master Orchestrator - Three-Tier Architecture

**Course:** \`${courseCode}\`
**Your Range:** Seeds \`S${String(startSeed).padStart(4, '0')}\` to \`S${String(endSeed).padStart(4, '0')}\` (${totalSeeds} seeds)
**Target LEGOs:** ${legoCount} LEGOs across ${seeds.length} seeds
**Workers to spawn:** ${workerCount} (via Task tool)
**LEGOs per worker:** ~${legosPerWorker} LEGOs (~${seedsPerWorker} seeds each)

---

## ⚡ CRITICAL: SILENT OPERATION

**You AND your workers must work silently!**

- ❌ NO verbose logging ("Processing LEGO...", "Generated phrases...")
- ✅ Spawn workers silently (no progress logs)
- ✅ Workers upload via HTTP (doesn't count as output)
- ✅ Only brief final summary: "✅ Master complete: 10 workers spawned, ${legoCount} LEGOs generated"

**Why:** Browser has 32K token output limit. Silent operation keeps you safe.

---

## 🎯 YOUR MISSION: SPAWN 10 WORKERS

You are a **Master Orchestrator**. You DON'T generate baskets yourself.

**Your workflow:**

1. ✅ **Divide scaffolds below** - Split ${seeds.length} seeds among ${workerCount} workers (~${seedsPerWorker} seeds each)
2. ✅ **Spawn ${workerCount} workers** - Use Task tool ${workerCount} times in ONE message (parallel!)
3. ✅ **Work SILENTLY** - No verbose progress logs
4. ✅ **Monitor completion** - Workers will upload via ngrok
5. ✅ **Report brief summary** - "✅ Master complete: 10 workers spawned"

---

## 📋 COMPLETE SCAFFOLD DATA (${legoCount} LEGOs)

**CRITICAL:** All scaffold data is embedded below. Divide this among your ${workerCount} workers.

\`\`\`json
${JSON.stringify(legoData, null, 2)}
\`\`\`

**Each LEGO scaffold includes:**
- \`lego\`: [target, known] language pair
- \`type\`: A/M/F/X (difficulty level)
- \`seed\`: Seed ID this LEGO belongs to
- \`recent_context\`: Vocabulary from recent seeds (GATE compliance)
- \`current_seed_earlier_legos\`: LEGOs taught earlier in same seed
- \`is_final_lego\`: Whether this is the last LEGO in the seed
- \`seed_sentence\`: Full seed sentence (fallback context)
- \`seed_legos\`: All LEGOs in this seed (fallback context)

---

## 🚀 HOW TO SPAWN WORKERS

**CRITICAL: SEEDS ARE ATOMIC UNITS - NEVER SPLIT A SEED ACROSS WORKERS!**

Each worker must receive COMPLETE seeds only. If a seed has 5 LEGOs, all 5 go to the same worker.

**Your seeds:** ${seeds.join(', ')} (${seeds.length} seeds total)

**Division strategy:**
- Assign COMPLETE seeds to workers (never split a seed!)
- ${seeds.length} seeds ÷ ${workerCount} workers = ~${Math.floor(seeds.length / workerCount)} seeds per worker
- Some workers may get more seeds than others (that's OK!)
- Some workers may get 0 seeds if you don't have enough (that's OK!)

**Example division:**
- Worker 1: ${seeds.slice(0, Math.ceil(seeds.length / workerCount)).join(', ')} (complete seeds)
- Worker 2: ${seeds.slice(Math.ceil(seeds.length / workerCount), Math.ceil(seeds.length / workerCount) * 2).join(', ')} (complete seeds)
- Worker 3: ${seeds.slice(Math.ceil(seeds.length / workerCount) * 2, Math.ceil(seeds.length / workerCount) * 3).join(', ')} (complete seeds)
- ... continue until all ${seeds.length} seeds are assigned

**WRONG:** "Worker 1 gets S0001L01-L03, Worker 2 gets S0001L04-L05" ❌ (split seed!)
**RIGHT:** "Worker 1 gets S0001 (all LEGOs), Worker 2 gets S0002 (all LEGOs)" ✅ (complete seeds!)

**2. Spawn all ${workerCount} workers in parallel:**

Use Task tool ${workerCount} times in a SINGLE message. Each worker receives:

\`\`\`
Task tool prompt for worker-1:
{
  "subagent_type": "general-purpose",
  "description": "Phase 5 Worker 1",
  "prompt": "You are Phase 5 Worker 1. Generate baskets for the following LEGOs and upload via ngrok.

## SCAFFOLD DATA (Your subset)
<Embed worker 1's scaffold subset here as JSON>

## INSTRUCTIONS
Fetch worker instructions from: https://ssi-dashboard-v7.vercel.app/prompts/phase5_worker.md

## UPLOAD ENDPOINT
POST ${ngrokUrl}/phase5/upload-basket

## PAYLOAD FORMAT
{
  \\"courseCode\\": \\"${courseCode}\\",
  \\"seed\\": \\"S0001\\",
  \\"baskets\\": { \\"S0001L01\\": {...}, ... },
  \\"stagingOnly\\": ${params.stagingOnly || true}
}

## WORK SILENTLY
Generate baskets silently, upload via HTTP, report brief summary only."
}
\`\`\`

**3. Monitor silently:**

Workers will upload their baskets via ngrok. No need to track - just spawn and let them work.

**4. Report when all spawned:**

\`\`\`
✅ Master complete: ${workerCount} workers spawned for ${legoCount} LEGOs
\`\`\`

---

## 📤 WORKER UPLOAD ENDPOINT

Workers POST to: \`${ngrokUrl}/phase5/upload-basket\`

**Payload format:**
\`\`\`json
{
  "courseCode": "${courseCode}",
  "seed": "S0001",
  "baskets": {
    "S0001L01": {
      "lego": ["target", "known"],
      "type": "M",
      "practice_phrases": [
        ["known phrase", "target phrase", null, 1],
        ...
      ]
    }
  },
  "stagingOnly": ${params.stagingOnly || true}
}
\`\`\`

---

## 🎯 START NOW

**Spawn all ${workerCount} workers in parallel using Task tool!**

Divide the ${seeds.length} seeds evenly, embed each worker's scaffold subset, and let them work silently.

Report: "✅ Master complete: ${workerCount} workers spawned for ${legoCount} LEGOs"
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
    const { preparePhase5Scaffolds } = require('../../scripts/phase5_prep_scaffolds.cjs');
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

  console.log(`\n[Phase 5] ====================================`);
  console.log(`[Phase 5] 12-MASTER LAUNCH`);
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

    // STEP 2: Generate patch manifest
    console.log(`\n[Phase 5] Step 2: Generating patch manifest...`);

    const legos = missingData.missing_baskets.map(b => b.legoId);
    const patches = [
      { name: 'patch_01', range: 'S0001_S0056', start: 1, end: 56 },
      { name: 'patch_02', range: 'S0057_S0112', start: 57, end: 112 },
      { name: 'patch_03', range: 'S0113_S0168', start: 113, end: 168 },
      { name: 'patch_04', range: 'S0169_S0224', start: 169, end: 224 },
      { name: 'patch_05', range: 'S0225_S0280', start: 225, end: 280 },
      { name: 'patch_06', range: 'S0281_S0336', start: 281, end: 336 },
      { name: 'patch_07', range: 'S0337_S0392', start: 337, end: 392 },
      { name: 'patch_08', range: 'S0393_S0448', start: 393, end: 448 },
      { name: 'patch_09', range: 'S0449_S0504', start: 449, end: 504 },
      { name: 'patch_10', range: 'S0505_S0560', start: 505, end: 560 },
      { name: 'patch_11', range: 'S0561_S0616', start: 561, end: 616 },
      { name: 'patch_12', range: 'S0617_S0668', start: 617, end: 668 }
    ];

    const manifest = {
      course: courseCode,
      generated: new Date().toISOString(),
      total_missing: totalMissing,
      patches: []
    };

    patches.forEach(patch => {
      const patchLegos = legos.filter(legoId => {
        const seedNum = parseInt(legoId.substring(1, 5));
        return seedNum >= patch.start && seedNum <= patch.end;
      });

      manifest.patches.push({
        patch_number: parseInt(patch.name.split('_')[1]),
        patch_name: patch.name,
        seed_range: patch.range,
        seed_start: `S${String(patch.start).padStart(4, '0')}`,
        seed_end: `S${String(patch.end).padStart(4, '0')}`,
        lego_count: patchLegos.length,
        legos: patchLegos.sort()
      });
    });

    // Save manifest
    const manifestPath = path.join(baseCourseDir, 'phase5_patch_manifest.json');
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });
    console.log(`[Phase 5] ✅ Manifest saved: ${totalMissing} LEGOs across 12 patches`);

    // STEP 3: Generate 12 master prompts
    console.log(`\n[Phase 5] Step 3: Generating 12 master prompts...`);

    const promptsDir = path.join(__dirname, '../../scripts/phase5_master_prompts');
    await fs.ensureDir(promptsDir);

    for (const patch of manifest.patches) {
      const promptContent = `# Phase 5 Master Orchestrator: Patch ${patch.patch_number}

**Course:** \`${courseCode}\`
**Your Patch:** Seeds \`${patch.seed_start}\` to \`${patch.seed_end}\` (56 seeds)
**Missing LEGOs in your patch:** ${patch.lego_count}

---

## 🎯 YOUR MISSION

You are responsible for generating ALL missing baskets in your patch range.

**Your workflow:**

1. ✅ **Read your LEGO list** (provided below)
2. ✅ **Create scaffolds** for all LEGOs in your list
3. ✅ **Spawn sub-agents** (10 baskets per agent, standard Phase 5 workflow)
4. ✅ **Monitor completion** and report summary

---

## 📋 YOUR LEGO LIST (${patch.lego_count} LEGOs)

\`\`\`json
${JSON.stringify(patch.legos, null, 2)}
\`\`\`

---

## 🔧 STEP 1: Create Scaffolds

For each LEGO in your list, create a scaffold using the **standard Phase 5 scaffold generation logic**.

**Scaffold location:** \`public/vfs/courses/${courseCode}/phase5_scaffolds/\`

**Scaffold format:** Standard Phase 5 scaffold (includes recent_context, current_seed_legos_available, etc.)

Use the existing scaffold generation tools/logic - nothing special needed.

---

## 🚀 STEP 2: Spawn Sub-Agents

Once scaffolds are ready:

1. **Batch your LEGOs:** ~10 baskets per sub-agent
2. **Spawn agents in parallel:** Use the Task tool multiple times in one message
3. **Each sub-agent receives:**
   - Their specific LEGO IDs
   - Path to their scaffolds
   - Standard Phase 5 intelligence prompt: https://ssi-dashboard-v7.vercel.app/docs/phase_intelligence/phase_5_lego_baskets.md

**Sub-agent workflow (v10 - ngrok upload):**
- Read v10 scaffold from \`phase5_scaffolds_v10/seed_sXXXX.json\`
- Generate 10 practice phrases per LEGO (fill 2-2-2-4 slots in v10 structure)
- Self-validate: grammar, FD/LUT rules, naturalness
- **Strip metadata:** Extract ONLY \`lego\`, \`type\`, \`practice_phrases\` (remove _metadata, _instructions, _stats, etc.)
- **Convert v10 to v7 format:** Transform practice_phrases from slot objects to simple arrays:
  - v10: \`{"short_1_to_2_legos": {"slots": [{"phrase": {"english": "X", "mandarin": "Y"}}]}}\`
  - v7: \`[["X", "Y", null, N], ...]\` (flat array of [known, target, notes, lego_count])
- **Upload via ngrok:** POST to \`https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/phase5/upload-basket\`
  - Format: \`{"course": "${courseCode}", "seed": "SXXXX", "baskets": {...}, "agentId": "your-id"}\`
  - Each basket: \`{"lego": ["known", "target"], "type": "A|M", "practice_phrases": [[...], [...]]}\`
  - Auto-merges into lego_baskets.json
  - Returns confirmation with progress stats
- Move to next LEGO (no GitHub pushes needed!)

---

## 📊 STEP 3: Monitor & Report

Track completion and report:

\`\`\`
✅ Patch ${patch.patch_number} Complete
   Seeds: ${patch.seed_start}-${patch.seed_end}
   LEGOs generated: ${patch.lego_count}
   Sub-agents spawned: [calculated]
   Status: All baskets saved to phase5_outputs/
\`\`\`

---

## ⚠️ IMPORTANT NOTES

- **You own this patch** - no coordination needed with other masters
- **Standard Phase 5 workflow** - nothing special about "regeneration"
- **10 baskets per sub-agent** - this means ~100 phrases per agent (10 baskets × 10 phrases)
- **Grammar check required** - sub-agents must self-review before saving
- **Push in batches** - don't push 1000+ files at once

---

## 🚀 BEGIN NOW

Start with Step 1: Create scaffolds for your ${patch.lego_count} LEGOs.
`;

      const promptPath = path.join(promptsDir, `${patch.patch_name}_${patch.seed_range}.md`);
      await fs.writeFile(promptPath, promptContent);
    }

    console.log(`[Phase 5] ✅ Generated 12 master prompts in scripts/phase5_master_prompts/`);

    // STEP 4: Launch 12 Safari windows
    console.log(`\n[Phase 5] Step 4: Launching 12 Safari windows...`);

    for (let i = 0; i < 12; i++) {
      const patch = manifest.patches[i];
      const promptPath = path.join(promptsDir, `${patch.patch_name}_${patch.seed_range}.md`);
      const promptContent = await fs.readFile(promptPath, 'utf8');

      console.log(`[Phase 5]   Launching Patch ${patch.patch_number}: ${patch.lego_count} LEGOs...`);

      try {
        await spawnClaudeCodeSession(promptContent, `Patch ${patch.patch_number}`);
      } catch (error) {
        console.error(`[Phase 5]   ⚠️  Failed to launch Patch ${patch.patch_number}:`, error.message);
      }

      // 5 second delay between launches (critical for reliability)
      if (i < 11) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log(`\n[Phase 5] ✅ Launched 12 master orchestrators`);
    console.log(`[Phase 5] Monitor progress in Safari tabs`);

    res.json({
      success: true,
      message: `Launched 12 masters for ${totalMissing} missing baskets`,
      totalMissing,
      patches: manifest.patches.map(p => ({
        patch: p.patch_number,
        legos: p.lego_count
      }))
    });

  } catch (error) {
    console.error(`[Phase 5] ❌ 12-master launch failed:`, error);
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

    // STAGING WORKFLOW: Never auto-merge to canon
    // Use tools/phase5/extract-and-normalize.cjs to review and merge when ready
    console.log(`   ✅ Staging complete - use extract-and-normalize.cjs to review and merge`);

    return res.json({
      success: true,
      message: 'Baskets saved to staging (use extract-and-normalize.cjs to merge)',
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
