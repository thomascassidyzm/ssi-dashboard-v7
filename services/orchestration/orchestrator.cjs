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

    if (phase === 5) {
      // Phase 5 validators - Check gate violations in practice baskets
      const basketsFile = path.join(VFS_ROOT, courseCode, 'phase_5', 'lego_baskets.json');

      if (!fs.existsSync(basketsFile)) {
        console.log(`   ❌ lego_baskets.json not found`);
        return false;
      }

      // Validator: Gate violations check (curriculum integrity)
      const gateValidatorPath = path.join(__dirname, '../../scripts/validation/check-gate-violations.js');

      try {
        execSync(`node "${gateValidatorPath}" "${path.dirname(basketsFile)}"`, {
          cwd: VFS_ROOT,
          stdio: 'inherit'
        });
        console.log(`   ✅ Gate violation validation PASSED - curriculum integrity maintained`);
        return true;
      } catch (error) {
        console.log(`   ❌ Gate violation validation FAILED - curriculum integrity violations detected`);
        console.log(`   📄 Review report: ${basketsFile.replace('.json', '_gate_report.json')}`);

        // Check if we should block on validation failures
        const config = require('../config-loader.cjs').loadConfig();
        const thresholds = config.validation_thresholds;

        // TODO: Calculate actual violation rate from report and compare to threshold
        // For now, always fail on any gate violations
        return false;
      }
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

    // Validate prerequisite phases are complete
    const prerequisites = {
      1: [],           // Phase 1 has no prerequisites
      3: [1],          // Phase 3 requires Phase 1 (seed_pairs.json)
      5: [1, 3],       // Phase 5 requires Phases 1 & 3 (lego_pairs.json)
      6: [1, 3, 5],    // Phase 6 requires Phases 1, 3 & 5
      8: [1, 3, 5, 6]  // Phase 8 requires all previous phases
    };

    const requiredPhases = prerequisites[phase] || [];
    const missingPrereqs = [];

    for (const prereqPhase of requiredPhases) {
      // Check if prerequisite file exists
      let prereqFile;
      if (prereqPhase === 1) {
        prereqFile = path.join(VFS_ROOT, courseCode, 'seed_pairs.json');
      } else if (prereqPhase === 3) {
        prereqFile = path.join(VFS_ROOT, courseCode, 'lego_pairs.json');
      } else if (prereqPhase === 5) {
        prereqFile = path.join(VFS_ROOT, courseCode, 'lego_baskets.json');
      }

      if (prereqFile && !fs.existsSync(prereqFile)) {
        missingPrereqs.push({
          phase: prereqPhase,
          file: path.basename(prereqFile)
        });
      }
    }

    if (missingPrereqs.length > 0) {
      const error = `Cannot start Phase ${phase} - missing prerequisites: ${missingPrereqs.map(p => `Phase ${p.phase} (${p.file})`).join(', ')}`;
      console.log(`   ❌ ${error}`);
      return res.status(400).json({
        error,
        missingPrerequisites: missingPrereqs
      });
    }

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
      target,
      known,
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
 * GET /api/health
 * Dashboard-compatible health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '7.0.0',
    timestamp: new Date().toISOString(),
    vfs_root: VFS_ROOT,
    jobs_active: courseStates.size
  });
});

/**
 * GET /api/languages
 * Return ISO 639-3 language codes for dashboard
 */
app.get('/api/languages', (req, res) => {
  const languages = [
    { code: 'afr', name: 'Afrikaans', native: 'Afrikaans' },
    { code: 'ara', name: 'Arabic', native: 'العربية' },
    { code: 'ben', name: 'Bengali', native: 'বাংলা' },
    { code: 'bre', name: 'Breton', native: 'Brezhoneg' },
    { code: 'bul', name: 'Bulgarian', native: 'Български' },
    { code: 'cat', name: 'Catalan', native: 'Català' },
    { code: 'cmn', name: 'Mandarin Chinese', native: '中文' },
    { code: 'cor', name: 'Cornish', native: 'Kernewek' },
    { code: 'ces', name: 'Czech', native: 'Čeština' },
    { code: 'cym', name: 'Welsh', native: 'Cymraeg' },
    { code: 'dan', name: 'Danish', native: 'Dansk' },
    { code: 'deu', name: 'German', native: 'Deutsch' },
    { code: 'ell', name: 'Greek', native: 'Ελληνικά' },
    { code: 'eng', name: 'English', native: 'English' },
    { code: 'eus', name: 'Basque', native: 'Euskara' },
    { code: 'fas', name: 'Persian', native: 'فارسی' },
    { code: 'fra', name: 'French', native: 'Français' },
    { code: 'gla', name: 'Scottish Gaelic', native: 'Gàidhlig' },
    { code: 'gle', name: 'Irish', native: 'Gaeilge' },
    { code: 'glv', name: 'Manx', native: 'Gaelg' },
    { code: 'heb', name: 'Hebrew', native: 'עברית' },
    { code: 'hin', name: 'Hindi', native: 'हिन्दी' },
    { code: 'hrv', name: 'Croatian', native: 'Hrvatski' },
    { code: 'hun', name: 'Hungarian', native: 'Magyar' },
    { code: 'ind', name: 'Indonesian', native: 'Bahasa Indonesia' },
    { code: 'isl', name: 'Icelandic', native: 'Íslenska' },
    { code: 'ita', name: 'Italian', native: 'Italiano' },
    { code: 'jpn', name: 'Japanese', native: '日本語' },
    { code: 'kor', name: 'Korean', native: '한국어' },
    { code: 'mkd', name: 'Macedonian', native: 'Македонски' },
    { code: 'msa', name: 'Malay', native: 'Bahasa Melayu' },
    { code: 'nld', name: 'Dutch', native: 'Nederlands' },
    { code: 'nor', name: 'Norwegian', native: 'Norsk' },
    { code: 'pol', name: 'Polish', native: 'Polski' },
    { code: 'por', name: 'Portuguese', native: 'Português' },
    { code: 'ron', name: 'Romanian', native: 'Română' },
    { code: 'rus', name: 'Russian', native: 'Русский' },
    { code: 'slk', name: 'Slovak', native: 'Slovenčina' },
    { code: 'slv', name: 'Slovenian', native: 'Slovenščina' },
    { code: 'spa', name: 'Spanish', native: 'Español' },
    { code: 'srp', name: 'Serbian', native: 'Српски' },
    { code: 'swa', name: 'Swahili', native: 'Kiswahili' },
    { code: 'swe', name: 'Swedish', native: 'Svenska' },
    { code: 'tgl', name: 'Tagalog', native: 'Tagalog' },
    { code: 'tha', name: 'Thai', native: 'ไทย' },
    { code: 'tur', name: 'Turkish', native: 'Türkçe' },
    { code: 'ukr', name: 'Ukrainian', native: 'Українська' },
    { code: 'urd', name: 'Urdu', native: 'اردو' },
    { code: 'vie', name: 'Vietnamese', native: 'Tiếng Việt' },
    { code: 'yue', name: 'Cantonese', native: '粵語' }
  ];

  // Sort by English name
  languages.sort((a, b) => a.name.localeCompare(b.name));

  res.json(languages);
});

/**
 * GET /api/courses/validate/all
 * List all courses with their validation status
 */
app.get('/api/courses/validate/all', async (req, res) => {
  try {
    const manifestPath = path.join(__dirname, '../../public/vfs/courses-manifest.json');
    const manifest = await fs.readJson(manifestPath);

    const coursesValidation = [];

    for (const course of manifest.courses) {
      if (course.actual_seed_count === 0) continue; // Skip empty courses

      const courseCode = course.course_code;
      const legoPairsPath = path.join(VFS_ROOT, courseCode, 'lego_pairs.json');
      const reportPath = legoPairsPath.replace('.json', '_fd_report.json');

      // Determine completed phases
      const completedPhases = [];
      if (course.actual_seed_count > 0) completedPhases.push(1);
      if (await fs.pathExists(legoPairsPath)) completedPhases.push(3);
      if (course.basket_count > 0) completedPhases.push(5);

      let validationStatus = {
        courseCode,
        hasLegoPairs: await fs.pathExists(legoPairsPath),
        hasBaskets: course.basket_count > 0,
        collisions: 0,
        status: 'not_validated',
        completedPhases,
        canProgress: false
      };

      // Check if there's an existing FD report
      if (await fs.pathExists(reportPath)) {
        const report = await fs.readJson(reportPath);
        validationStatus.collisions = report.total_violations || 0;
        validationStatus.status = validationStatus.collisions > 0 ? 'has_violations' : 'valid';
        validationStatus.lastValidated = report.timestamp;
      }

      coursesValidation.push(validationStatus);
    }

    res.json({
      courses: coursesValidation,
      total: coursesValidation.length
    });
  } catch (error) {
    console.error('Error loading validation data:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/courses/:courseCode/validate
 * Run Phase 3 FD collision detection and return results
 */
app.get('/api/courses/:courseCode/validate', async (req, res) => {
  const { courseCode } = req.params;

  try {
    const legoPairsPath = path.join(VFS_ROOT, courseCode, 'lego_pairs.json');

    if (!await fs.pathExists(legoPairsPath)) {
      return res.status(404).json({
        error: 'lego_pairs.json not found - run Phase 3 first',
        courseCode
      });
    }

    // Run FD collision detection script
    const validatorScript = path.join(__dirname, '../../scripts/validation/check-lego-fd-violations.cjs');
    const { execSync } = require('child_process');

    try {
      execSync(`node "${validatorScript}" "${legoPairsPath}"`, {
        cwd: VFS_ROOT,
        stdio: 'inherit'
      });

      // If script exits 0, no violations found
      res.json({
        courseCode,
        status: 'valid',
        collisions: 0,
        message: 'No FD violations detected'
      });
    } catch (error) {
      // Script exits with non-zero if violations found
      // Check for the FD report file
      const reportPath = legoPairsPath.replace('.json', '_fd_report.json');

      if (await fs.pathExists(reportPath)) {
        const report = await fs.readJson(reportPath);

        res.json({
          courseCode,
          status: 'violations_detected',
          collisions: report.total_violations || 0,
          report,
          message: `Found ${report.total_violations} FD violations`
        });
      } else {
        throw new Error('Validation failed but no report generated');
      }
    }
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      error: error.message,
      courseCode
    });
  }
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
