#!/usr/bin/env node

/**
 * SSi Course Production - Main Orchestrator
 *
 * Responsibilities:
 * - Serve dashboard read-only APIs (courses, VFS files, metrics)
 * - Trigger phase servers in sequence (1 → 3 → 5 → 6 → 8)
 * - Checkpoint management (manual/gated/full modes)
 * - Health monitoring of phase servers
 * - Course status tracking
 *
 * Port: 3456 (maintains backward compatibility with dashboard)
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

// Load environment (set by start-automation.js)
const PORT = process.env.PORT || 3456;
const VFS_ROOT = process.env.VFS_ROOT;
const CHECKPOINT_MODE = process.env.CHECKPOINT_MODE || 'gated';
const SERVICE_NAME = process.env.SERVICE_NAME || 'Orchestrator';

// Phase server URLs (auto-configured by start-automation.js)
const PHASE_SERVERS = {
  1: process.env.PHASE1_URL || 'http://localhost:3457',
  3: process.env.PHASE3_URL || 'http://localhost:3458',
  5: process.env.PHASE5_URL || 'http://localhost:3459',
  6: process.env.PHASE6_URL || 'http://localhost:3460',
  8: process.env.PHASE8_URL || 'http://localhost:3461'
};

// Validate config
if (!VFS_ROOT) {
  console.error('❌ Error: VFS_ROOT not set');
  process.exit(1);
}

// Initialize Express
const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://ssi-dashboard-v7.vercel.app',
    /\.vercel\.app$/
  ]
}));
app.use(bodyParser.json({ limit: '50mb' }));

// Course state tracking (courseCode -> state)
const courseStates = new Map();

/**
 * GET /api/courses
 * List all available courses
 */
app.get('/api/courses', async (req, res) => {
  try {
    const manifestPath = path.join(__dirname, '../../public/vfs/courses-manifest.json');
    const manifest = await fs.readJson(manifestPath);

    const courses = manifest.courses
      .filter(c => c.actual_seed_count > 0)
      .map(c => ({
        course_code: c.course_code,
        source_language: c.source_language,
        target_language: c.target_language,
        total_seeds: c.total_seeds,
        version: c.format,
        status: determineStatus(c),
        seed_pairs: c.actual_seed_count,
        lego_pairs: c.lego_count,
        lego_baskets: c.basket_count || 0,
        amino_acids: {
          introductions: c.introductions_count || 0
        },
        phases_completed: c.phases_completed || []
      }));

    res.json({ courses });
  } catch (error) {
    console.error('Failed to load courses:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/courses/:courseCode
 * Get detailed course information
 */
app.get('/api/courses/:courseCode', async (req, res) => {
  const { courseCode } = req.params;

  try {
    // Load course files from VFS
    const coursePath = path.join(VFS_ROOT, courseCode);

    const seedPairsPath = path.join(coursePath, 'seed_pairs.json');
    const legoPairsPath = path.join(coursePath, 'lego_pairs.json');
    const basketsPath = path.join(coursePath, 'lego_baskets.json');

    const [seedPairs, legoPairs, baskets] = await Promise.all([
      fs.readJson(seedPairsPath).catch(() => null),
      fs.readJson(legoPairsPath).catch(() => null),
      fs.readJson(basketsPath).catch(() => null)
    ]);

    if (!seedPairs) {
      return res.status(404).json({ error: `Course ${courseCode} not found` });
    }

    // Count elements
    const seedCount = Object.keys(seedPairs.translations || {}).length;
    const legoCount = legoPairs ? (legoPairs.seeds || []).reduce((sum, seed) => {
      return sum + (Array.isArray(seed[2]) ? seed[2].length : 0);
    }, 0) : 0;
    const basketCount = baskets ? Object.keys(baskets.baskets || {}).length : 0;

    res.json({
      course_code: courseCode,
      seed_count: seedCount,
      lego_count: legoCount,
      basket_count: basketCount,
      has_phase1: !!seedPairs,
      has_phase3: !!legoPairs,
      has_phase5: !!baskets
    });
  } catch (error) {
    console.error(`Failed to load course ${courseCode}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// =======================================
// PHASE VALIDATION FUNCTIONS
// =======================================

/**
 * Run phase-specific validation after completion
 * @param {string} courseCode - Course identifier
 * @param {number} phase - Phase number that just completed
 * @returns {boolean} - true if validation passed, false otherwise
 */
async function runPhaseValidation(courseCode, phase) {
  console.log(`\n🔬 Running Phase ${phase} validation for ${courseCode}...`);

  try {
    if (phase === 1) {
      // Phase 2: FD Collision Check
      const seedPairsFile = path.join(VFS_ROOT, courseCode, 'phase_1', 'seed_pairs.json');

      if (!fs.existsSync(seedPairsFile)) {
        console.log(`   ❌ seed_pairs.json not found`);
        return false;
      }

      const validatorPath = path.join(__dirname, '../../scripts/phase2_collision_check.cjs');

      try {
        // Run Phase 2 collision check - it exits with 0 on success, 1 on failure
        execSync(`node "${validatorPath}" "${seedPairsFile}"`, {
          cwd: VFS_ROOT,
          stdio: 'inherit'
        });
        console.log(`   ✅ Phase 2 validation PASSED - no FD violations`);
        return true;
      } catch (error) {
        console.log(`   ❌ Phase 2 validation FAILED - FD violations detected`);
        console.log(`   📄 Review report: ${seedPairsFile.replace('.json', '_phase2_report.json')}`);
        return false;
      }
    }

    if (phase === 3) {
      // Phase 3 validators (run AFTER deduplication in Phase 3 server)
      const legoPairsFile = path.join(VFS_ROOT, courseCode, 'phase_3', 'lego_pairs.json');

      if (!fs.existsSync(legoPairsFile)) {
        console.log(`   ❌ lego_pairs.json not found`);
        return false;
      }

      // Validator 1: LEGO-level FD check (learner uncertainty test)
      const fdValidatorPath = path.join(__dirname, '../../scripts/validation/check-lego-fd-violations.cjs');

      try {
        execSync(`node "${fdValidatorPath}" "${legoPairsFile}"`, {
          cwd: VFS_ROOT,
          stdio: 'inherit'
        });
        console.log(`   ✅ LEGO FD validation PASSED - no learner uncertainty`);
      } catch (error) {
        console.log(`   ❌ LEGO FD validation FAILED - learner uncertainty detected`);
        console.log(`   📄 Review report: ${legoPairsFile.replace('.json', '_fd_report.json')}`);
        return false;
      }

      // Validator 2: Infinitive form check (English linguistic rules)
      const infinitiveValidatorPath = path.join(__dirname, '../../scripts/validation/check-infinitive-forms.js');

      try {
        execSync(`node "${infinitiveValidatorPath}" "${legoPairsFile}"`, {
          cwd: VFS_ROOT,
          stdio: 'inherit'
        });
        console.log(`   ✅ Infinitive form validation PASSED`);
      } catch (error) {
        console.log(`   ❌ Infinitive form validation FAILED - linguistic violations found`);
        return false;
      }

      console.log(`   ✅ All Phase 3 validations PASSED`);
      return true;
    }

    // No validators for other phases yet
    console.log(`   ℹ️  No validators configured for Phase ${phase}`);
    return true;

  } catch (error) {
    console.error(`   ❌ Validation error:`, error.message);
    return false;
  }
}

/**
 * Programmatically trigger a phase (used by auto-progression)
 * @param {string} courseCode - Course identifier
 * @param {number} phase - Phase number to trigger
 * @param {number} totalSeeds - Number of seeds (defaults to 668)
 */
async function triggerPhase(courseCode, phase, totalSeeds = 668) {
  try {
    console.log(`\n🚀 Auto-triggering Phase ${phase} for ${courseCode}`);

    // Initialize or update course state
    let state = courseStates.get(courseCode) || {
      courseCode,
      currentPhase: null,
      status: 'idle',
      phasesCompleted: [],
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      waitingForApproval: false
    };

    state.currentPhase = phase;
    state.status = 'running';
    state.lastUpdated = new Date().toISOString();
    courseStates.set(courseCode, state);

    // Delegate to appropriate phase server
    const phaseServer = PHASE_SERVERS[phase];
    if (!phaseServer) {
      throw new Error(`No server configured for Phase ${phase}`);
    }

    console.log(`   Delegating to: ${phaseServer}`);

    await axios.post(`${phaseServer}/start`, {
      courseCode,
      totalSeeds
    });

    console.log(`   ✓ Phase ${phase} started successfully`);
  } catch (error) {
    console.error(`   ❌ Failed to trigger Phase ${phase}:`, error.message);

    const state = courseStates.get(courseCode);
    if (state) {
      state.status = 'error';
      state.error = error.message;
    }
  }
}

/**
 * GET /api/courses/:courseCode/status
 * Get current phase status for a course
 */
app.get('/api/courses/:courseCode/status', (req, res) => {
  const { courseCode } = req.params;
  const state = courseStates.get(courseCode);

  if (!state) {
    return res.json({
      courseCode,
      currentPhase: null,
      status: 'idle',
      checkpointMode: CHECKPOINT_MODE
    });
  }

  res.json({
    courseCode,
    currentPhase: state.currentPhase,
    status: state.status,
    startedAt: state.startedAt,
    lastUpdated: state.lastUpdated,
    phasesCompleted: state.phasesCompleted,
    checkpointMode: CHECKPOINT_MODE,
    waitingForApproval: state.waitingForApproval
  });
});

/**
 * POST /api/courses/:courseCode/start-phase
 * Trigger the next phase for a course
 */
app.post('/api/courses/:courseCode/start-phase', async (req, res) => {
  const { courseCode } = req.params;
  const { phase, totalSeeds } = req.body;

  if (!phase) {
    return res.status(400).json({ error: 'phase number required' });
  }

  try {
    console.log(`\n🚀 Starting Phase ${phase} for ${courseCode}`);

    // Initialize or update course state
    let state = courseStates.get(courseCode) || {
      courseCode,
      currentPhase: null,
      status: 'idle',
      phasesCompleted: [],
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      waitingForApproval: false
    };

    state.currentPhase = phase;
    state.status = 'running';
    state.lastUpdated = new Date().toISOString();
    courseStates.set(courseCode, state);

    // Delegate to appropriate phase server
    const phaseServer = PHASE_SERVERS[phase];
    if (!phaseServer) {
      throw new Error(`No server configured for Phase ${phase}`);
    }

    console.log(`   Delegating to: ${phaseServer}`);

    const response = await axios.post(`${phaseServer}/start`, {
      courseCode,
      totalSeeds: totalSeeds || 668
    });

    res.json({
      success: true,
      message: `Phase ${phase} started for ${courseCode}`,
      phaseServer,
      details: response.data
    });
  } catch (error) {
    console.error(`Failed to start Phase ${phase}:`, error.message);

    const state = courseStates.get(courseCode);
    if (state) {
      state.status = 'error';
      state.error = error.message;
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /phase-complete
 * Callback from phase servers when they complete
 */
app.post('/phase-complete', async (req, res) => {
  const { phase, courseCode, status } = req.body;

  console.log(`\n✅ Phase ${phase} ${status} for ${courseCode}`);

  const state = courseStates.get(courseCode);
  if (!state) {
    return res.json({ acknowledged: true });
  }

  // Update state
  if (status === 'complete') {
    if (!state.phasesCompleted.includes(phase)) {
      state.phasesCompleted.push(phase);
    }

    // ALWAYS run phase-specific validators (regardless of checkpoint mode)
    // Validation is a data integrity check, not a user approval gate
    const validationPassed = await runPhaseValidation(courseCode, phase);

    if (!validationPassed) {
      // Validation FAILED - block all progression
      state.status = 'validation_failed';
      state.currentPhase = null;
      console.log(`   ❌ Validation failed - manual intervention required`);
      return;
    }

    // Validation PASSED - now check checkpoint mode for progression
    if (CHECKPOINT_MODE === 'manual') {
      state.status = 'waiting_for_approval';
      state.waitingForApproval = true;
      console.log(`   ⏸️  Waiting for manual approval (checkpoint mode: manual)`);
    } else if (CHECKPOINT_MODE === 'gated') {
      // Auto-trigger next phase
      const nextPhase = getNextPhase(phase);
      if (nextPhase) {
        console.log(`   ✓ Validation passed, auto-triggering Phase ${nextPhase}`);
        setTimeout(() => triggerPhase(courseCode, nextPhase), 2000);
      } else {
        state.status = 'complete';
        console.log(`   🎉 All phases complete!`);
      }
    } else {
      // Full automation - trigger next phase
      const nextPhase = getNextPhase(phase);
      if (nextPhase) {
        console.log(`   → Auto-triggering Phase ${nextPhase} (checkpoint mode: full)`);
        setTimeout(() => triggerPhase(courseCode, nextPhase), 2000);
      } else {
        state.status = 'complete';
        console.log(`   🎉 All phases complete!`);
      }
    }
  } else {
    state.status = status;
  }

  state.lastUpdated = new Date().toISOString();

  res.json({ acknowledged: true });
});

/**
 * POST /api/courses/generate
 * Dashboard compatibility endpoint - triggers course generation
 * Routes to appropriate phase based on phaseSelection parameter
 */
app.post('/api/courses/generate', async (req, res) => {
  const {
    target,
    known,
    startSeed,
    endSeed,
    phaseSelection = 'all',
    executionMode,
    strategy = 'balanced'
  } = req.body;

  // Generate course code
  const courseCode = `${target.toLowerCase()}_for_${known.toLowerCase()}`;
  const totalSeeds = endSeed - startSeed + 1;

  console.log(`\n📋 Course generation request from dashboard:`);
  console.log(`   Course: ${courseCode}`);
  console.log(`   Seeds: ${startSeed}-${endSeed} (${totalSeeds} seeds)`);
  console.log(`   Phase: ${phaseSelection}`);
  console.log(`   Strategy: ${strategy}`);

  try {
    // Determine which phase to trigger
    let phase;
    if (phaseSelection === 'phase1') {
      phase = 1;
    } else if (phaseSelection === 'phase3') {
      phase = 3;
    } else if (phaseSelection === 'phase5') {
      phase = 5;
    } else if (phaseSelection === 'phase6') {
      phase = 6;
    } else if (phaseSelection === 'all') {
      // Start from Phase 1
      phase = 1;
    } else {
      throw new Error(`Unknown phase selection: ${phaseSelection}`);
    }

    // Delegate to phase server
    const phaseServer = PHASE_SERVERS[phase];
    if (!phaseServer) {
      throw new Error(`Phase ${phase} server not available`);
    }

    console.log(`   → Delegating to Phase ${phase} server: ${phaseServer}`);

    const response = await axios.post(`${phaseServer}/start`, {
      courseCode,
      totalSeeds,
      strategy,
      startSeed,
      endSeed
    });

    res.json({
      success: true,
      courseCode,
      phase,
      message: `${phaseSelection === 'all' ? 'Full course generation' : `Phase ${phase}`} started for ${courseCode}`,
      details: response.data
    });
  } catch (error) {
    console.error(`Failed to start generation:`, error.message);
    res.status(500).json({
      error: error.message,
      courseCode
    });
  }
});

/**
 * GET /api/vfs/courses/:code/:file(*)
 * Serve VFS files for dashboard
 */
app.get('/api/vfs/courses/:code/:file(*)', async (req, res) => {
  const { code, file } = req.params;

  try {
    const filePath = path.join(VFS_ROOT, code, file);

    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const data = await fs.readJson(filePath);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /health
 * Health check for this service
 */
app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    status: 'healthy',
    port: PORT,
    vfsRoot: VFS_ROOT,
    checkpointMode: CHECKPOINT_MODE,
    phaseServers: PHASE_SERVERS,
    activeCourses: courseStates.size
  });
});

/**
 * GET /health/all
 * Health check for all services
 */
app.get('/health/all', async (req, res) => {
  const health = {
    orchestrator: { status: 'healthy', port: PORT },
    phases: {}
  };

  // Check each phase server
  for (const [phase, url] of Object.entries(PHASE_SERVERS)) {
    try {
      const response = await axios.get(`${url}/health`, { timeout: 2000 });
      health.phases[phase] = { status: 'healthy', ...response.data };
    } catch (error) {
      health.phases[phase] = { status: 'unreachable', error: error.message };
    }
  }

  const allHealthy = Object.values(health.phases).every(p => p.status === 'healthy');
  res.status(allHealthy ? 200 : 503).json(health);
});

/**
 * Helper: Determine course status from manifest data
 */
function determineStatus(course) {
  if (course.basket_count > 0) return 'phase_5_complete';
  if (course.lego_count > 0) return 'phase_3_complete';
  if (course.actual_seed_count > 0) return 'phase_1_complete';
  return 'empty';
}

/**
 * Helper: Get next phase in sequence
 */
function getNextPhase(currentPhase) {
  const sequence = [1, 3, 5, 6, 8];
  const currentIndex = sequence.indexOf(currentPhase);
  return currentIndex >= 0 && currentIndex < sequence.length - 1
    ? sequence[currentIndex + 1]
    : null;
}

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log('');
  console.log(`✅ ${SERVICE_NAME} listening on port ${PORT}`);
  console.log(`   VFS Root: ${VFS_ROOT}`);
  console.log(`   Checkpoint Mode: ${CHECKPOINT_MODE}`);
  console.log('');
  console.log('   Phase Servers:');
  for (const [phase, url] of Object.entries(PHASE_SERVERS)) {
    console.log(`     Phase ${phase}: ${url}`);
  }
  console.log('');
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down orchestrator...');
  process.exit(0);
});
