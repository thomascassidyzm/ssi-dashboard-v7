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

    // STEP 2: Load configuration for parallelization
    const config = loadConfig();
    const phase5Config = config.phase5_basket_generation;

    const browsers = browserWindows || phase5Config.browsers;
    const agents = agentsPerWindow || phase5Config.agents_per_browser;
    const seedsPerAgentConfig = seedsPerAgent || phase5Config.seeds_per_agent || 10;

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
    job.milestones.windowsTotal = browsers;
    job.milestones.branchesExpected = browsers;
    job.status = 'spawning_windows';

    // STEP 3: Start branch watcher
    await startBranchWatcher(courseCode, browsers, baseCourseDir);

    // Update milestone
    job.milestones.watcherStarted = true;
    job.milestones.watcherStartedAt = new Date().toISOString();

    // STEP 4: Spawn browser windows with embedded LEGO data
    await spawnBrowserWindows(courseCode, {
      target,
      known,
      startSeed,
      endSeed,
      legoData,        // ← Embedded LEGO data for web agents
      targetLegos,     // ← List of LEGOs to generate (missing or force regenerate)
      stagingOnly      // ← Pass through staging flag
    }, baseCourseDir, browsers, agents, seedsPerAgentConfig, job);

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
 * Spawn parallel browser windows
 * Each window spawns multiple Task agents (from old system)
 *
 * Migrated from automation_server.cjs lines 2272-2293
 */
async function spawnBrowserWindows(courseCode, params, baseCourseDir, browserCount, agentsPerWindow, seedsPerAgent, job = null) {
  const { target, known, startSeed, endSeed, legoIds, isRegeneration } = params;

  // Handle both regular mode (seed range) and regeneration mode (lego IDs)
  const totalSeeds = isRegeneration ? legoIds.length : (endSeed - startSeed + 1);

  console.log(`\n[Phase 5] 🌐 Spawning ${browserCount} browser windows...`);
  console.log(`[Phase 5]    Mode: ${isRegeneration ? 'REGENERATION (specific LEGO_IDs)' : 'FULL (seed range)'}`);
  console.log(`[Phase 5]    Each window will spawn ${agentsPerWindow} Task agents`);
  console.log(`[Phase 5]    Each agent processes ${isRegeneration ? 'specific LEGOs' : `${seedsPerAgent} seeds`}`);

  const config = loadConfig();
  const spawnDelay = config.phase5_basket_generation.browser_spawn_delay_ms || 5000;

  // job parameter passed from /start endpoint (or null if called standalone)
  let currentSeed = startSeed;
  let currentLegoIndex = 0;

  for (let windowNum = 1; windowNum <= browserCount; windowNum++) {
    console.log(`\n[Phase 5]   Window ${windowNum}/${browserCount}:`);

    let windowPrompt;

    if (isRegeneration) {
      // Regeneration mode: distribute LEGOs across windows
      const legosPerWindow = Math.ceil(legoIds.length / browserCount);
      const windowStartIdx = (windowNum - 1) * legosPerWindow;
      const windowEndIdx = Math.min(windowNum * legosPerWindow, legoIds.length);
      const windowLegoIds = legoIds.slice(windowStartIdx, windowEndIdx);

      console.log(`[Phase 5]     LEGO_IDs: ${windowLegoIds.length} LEGOs (${windowLegoIds.slice(0, 3).join(', ')}...)`);
      console.log(`[Phase 5]     Will spawn ${agentsPerWindow} Task agents`);

      // Generate regeneration-specific prompt
      windowPrompt = generatePhase5OrchestratorPrompt(
        courseCode,
        { target, known, legoIds: windowLegoIds, isRegeneration: true },
        baseCourseDir
      );
    } else {
      // Regular mode: divide SEEDS among windows (not LEGOs - seeds are atomic units)
      const targetLegos = params.targetLegos || [];
      const legoData = params.legoData || {};

      // Group LEGOs by seed
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

      // Divide SEEDS among windows (each seed stays together)
      const seedsPerWindow = Math.ceil(seeds.length / browserCount);
      const windowStartIdx = (windowNum - 1) * seedsPerWindow;
      const windowEndIdx = Math.min(windowNum * seedsPerWindow, seeds.length);
      const windowSeeds = seeds.slice(windowStartIdx, windowEndIdx);

      // Collect all LEGOs from this window's seeds
      const windowTargetLegos = [];
      for (const seedId of windowSeeds) {
        windowTargetLegos.push(...legosBySeed[seedId]);
      }

      // Extract LEGO data for this window's LEGOs
      const windowLegoData = {};
      for (const lego of windowTargetLegos) {
        if (legoData[lego.legoId]) {
          windowLegoData[lego.legoId] = legoData[lego.legoId];
        }
      }

      console.log(`[Phase 5]     Seeds: ${windowSeeds.join(', ')} (${windowTargetLegos.length} LEGOs, ${Math.round(JSON.stringify(windowLegoData).length / 1024)} KB)`);
      console.log(`[Phase 5]     Will spawn ${agentsPerWindow} Task agents`);

      // Generate orchestrator prompt for this window with embedded LEGO data
      windowPrompt = generatePhase5OrchestratorPrompt(
        courseCode,
        {
          target,
          known,
          startSeed,
          endSeed,
          legoData: windowLegoData,
          targetLegos: windowTargetLegos,
          agentsPerWindow,
          stagingOnly: params.stagingOnly
        },
        baseCourseDir
      );
    }

    try {
      await spawnClaudeCodeSession(windowPrompt, `phase5-window-${windowNum}`);

      // Update milestones
      if (job) {
        job.windowsSpawned++;
        job.milestones.windowsSpawned = job.windowsSpawned;
        job.milestones.lastWindowSpawnedAt = new Date().toISOString();
      }

      // Stagger window spawns (from config, default 5000ms)
      if (windowNum < browserCount) {
        console.log(`[Phase 5]     Waiting ${spawnDelay}ms before next window...`);
        await new Promise(resolve => setTimeout(resolve, spawnDelay));
      }
    } catch (error) {
      console.error(`[Phase 5]     ❌ Failed to spawn window ${windowNum}:`, error.message);
      if (job && !job.warnings) job.warnings = [];
      if (job) job.warnings.push(`Failed to spawn window ${windowNum}: ${error.message}`);
    }

    if (!isRegeneration) {
      if (currentSeed > endSeed) break;
    }
  }

  console.log(`\n[Phase 5] ✅ Spawned ${browserCount} browser windows`);
  console.log(`[Phase 5]    Waiting for branches...`);

  if (job) {
    job.status = 'waiting_for_branches';
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

  // REGULAR MODE: Generate baskets for seed range
  const totalSeeds = endSeed - startSeed + 1;
  const legoData = params.legoData || {};
  const targetLegos = params.targetLegos || [];
  const legoCount = targetLegos.length;
  const agentCount = agentsPerWindow || Math.ceil(legoCount / 10); // ~10 LEGOs per agent
  const legosPerAgent = Math.ceil(legoCount / agentCount);
  const ngrokUrl = 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev';

  return `# Phase 5 Master Orchestrator

**Course:** \`${courseCode}\`
**Your Range:** Seeds \`S${String(startSeed).padStart(4, '0')}\` to \`S${String(endSeed).padStart(4, '0')}\` (${totalSeeds} seeds)
**Target LEGOs:** ${legoCount} LEGOs to generate
**Upload mode:** Staging + ngrok ✅

---

## ⚡ CRITICAL: SILENT OPERATION

**DO NOT print verbose output to console!**

- ❌ NO "Processing LEGO S0001L01..." messages
- ❌ NO "Generated 10 phrases for..." logs
- ❌ NO progress bars or status updates
- ✅ Work silently
- ✅ POST results via HTTP
- ✅ Only print brief final summary

**Why:** Browser output has 32k token limit. Verbose logging wastes tokens and risks hitting limits.

---

## 🎯 YOUR MISSION

You are responsible for generating baskets for ${legoCount} LEGOs.

**Your workflow:**

1. ✅ **Read LEGO data below** - All data embedded (NO file reads needed!)
2. ✅ **Generate ${legoCount} baskets** - Use extended thinking for each LEGO
3. ✅ **Work SILENTLY** - No verbose console output
4. ✅ **Upload via HTTP** - POST to ngrok endpoint (details below)
5. ✅ **Report brief summary** - Just final status

---

## 📋 COMPLETE LEGO DATA (${legoCount} LEGOs)

**CRITICAL:** All LEGO and scaffold data is embedded below. You do NOT need to read any local files.

\`\`\`json
${JSON.stringify(legoData, null, 2)}
\`\`\`

**Each LEGO includes:**
- \`lego\`: [target, known] language pair
- \`type\`: A/M/F/X (difficulty level)
- \`seed\`: Seed ID this LEGO belongs to
- \`recent_context\`: Vocabulary from recent seeds (GATE compliance)
- \`current_seed_earlier_legos\`: LEGOs taught earlier in same seed
- \`is_final_lego\`: Whether this is the last LEGO in the seed
- \`seed_sentence\`: Full seed sentence (fallback context)
- \`seed_legos\`: All LEGOs in this seed (fallback context)

---

## 🎨 HOW TO GENERATE BASKETS

For each LEGO, you will:

1. **Use Extended Thinking** - Deeply analyze linguistic patterns and construction
2. **Generate 10 practice phrases** - Progressive difficulty (1-5 stars)
3. **Follow GATE compliance** - Only use vocabulary from \`recent_context\`
4. **Upload via HTTP** - POST to ngrok endpoint

### Generation Process Per LEGO

**Analyze the LEGO:**
- Target language phrase (what learner will produce)
- Known language meaning (what learner starts with)
- Type (A/M/F/X) - complexity level
- Recent context vocabulary (GATE: what words are available)
- Seed context (pedagogical sequence)

**Generate 10 practice phrases:**
1. ⭐ Start simple (isolate the LEGO)
2. ⭐⭐ Add one complexity layer
3. ⭐⭐⭐ Combine with recent LEGOs
4. ⭐⭐⭐⭐ Multi-layer recombination
5. ⭐⭐⭐⭐⭐ Complex natural phrases

**GATE Compliance:**
- Target words MUST come from \`recent_context\` vocabulary
- If needed, use \`current_seed_earlier_legos\` for same-seed recombination
- Fallback: \`seed_legos\` for emergency context

**Basket Format:**
\`\`\`json
{
  "S0001L01": {
    "lego": ["quiero", "I want"],
    "type": "M",
    "practice_phrases": [
      ["I want", "quiero", null, 1],
      ["I want now", "quiero ahora", null, 2],
      ["I want to learn", "quiero aprender", null, 2],
      ...
    ]
  }
}
\`\`\`

Each practice phrase: \`[known, target, audio_filename, difficulty]\`

---

## 📤 UPLOAD INSTRUCTIONS

**Upload URL:** \`${ngrokUrl}/phase5/upload-basket\`

**Request format:**
\`\`\`bash
curl -X POST ${ngrokUrl}/phase5/upload-basket \\
  -H "Content-Type: application/json" \\
  -d '{
    "courseCode": "${courseCode}",
    "seed": "S0001",
    "baskets": { "S0001L01": {...}, "S0001L02": {...} },
    "stagingOnly": ${params.stagingOnly || false}
  }'
\`\`\`

**Upload strategy:**
- Process LEGOs in order (seed by seed)
- Upload each seed when complete (all LEGOs in that seed done)
- Server will merge uploads (safe to upload same seed multiple times)

**Response:**
\`\`\`json
{
  "success": true,
  "seed": "S0001",
  "legoCount": 8,
  "savedTo": "staging"
}
\`\`\`

---

## ⚠️ IMPORTANT NOTES

### Staging Workflow
- **Baskets saved to staging first** → Safe review before canon merge
- **Manual merge when ready** → Use merge tool after review
- **Zero git risk** → Staging is git-ignored

### Silent Operation
- **No verbose logs** - Work quietly, only brief summary at end
- **HTTP uploads track progress** - Server logs each upload
- **Output limit: 32K tokens** - Silent operation keeps you safe

**START NOW: Generate baskets for all ${legoCount} LEGOs!**
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
-- Open Claude on the Web
tell application "${browser}"
    activate

    -- Open new tab with claude.ai/new (fresh conversation)
    tell window 1
        set newTab to make new tab with properties {URL:"https://claude.ai/new"}
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
