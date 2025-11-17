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
 * Run basket gap analysis for a course
 * @param {string} courseCode - Course identifier
 * @returns {object} - Analysis results
 */
async function runBasketGapAnalysis(courseCode) {
  console.log(`   Running basket gap analysis...`);

  try {
    // Fetch lego_pairs.json from local (current/updated registry)
    const legoPairsPath = path.join(VFS_ROOT, courseCode, 'lego_pairs.json');

    if (!await fs.pathExists(legoPairsPath)) {
      throw new Error('lego_pairs.json not found');
    }

    const legoPairsData = await fs.readJson(legoPairsPath);

    // Extract all LEGO_IDs from current lego_pairs.json
    const allLegoIds = new Set();
    if (legoPairsData.seeds && Array.isArray(legoPairsData.seeds)) {
      legoPairsData.seeds.forEach(seed => {
        if (seed.legos && Array.isArray(seed.legos)) {
          seed.legos.forEach(lego => {
            if (lego.id) {
              allLegoIds.add(lego.id);
            }
          });
        }
      });
    }

    // Load existing baskets from local file (GitHub fetch would be in endpoint)
    let existingBaskets = new Set();
    const basketsPath = path.join(VFS_ROOT, courseCode, 'lego_baskets.json');

    if (await fs.pathExists(basketsPath)) {
      const basketsData = await fs.readJson(basketsPath);
      if (basketsData.baskets && typeof basketsData.baskets === 'object') {
        existingBaskets = new Set(Object.keys(basketsData.baskets));
      }
    }

    // Load collision report (if exists) to identify deprecated LEGOs
    let deprecatedLegoIds = new Set();
    const collisionReportPath = path.join(VFS_ROOT, courseCode, 'lego_pairs_fd_report.json');

    if (await fs.pathExists(collisionReportPath)) {
      const collisionReport = await fs.readJson(collisionReportPath);

      if (collisionReport.status === 'FAIL' && collisionReport.violations) {
        collisionReport.violations.forEach(violation => {
          violation.mappings.forEach((mapping, idx) => {
            if (idx > 0) {
              mapping.legos.forEach(lego => {
                deprecatedLegoIds.add(lego.lego_id);
              });
            }
          });
        });
      }
    }

    // Analysis
    const missingBaskets = [];
    const basketsToDelete = [];
    const basketsToKeep = [];

    allLegoIds.forEach(legoId => {
      if (!existingBaskets.has(legoId)) {
        missingBaskets.push(legoId);
      }
    });

    existingBaskets.forEach(legoId => {
      if (deprecatedLegoIds.has(legoId)) {
        basketsToDelete.push(legoId);
      } else if (allLegoIds.has(legoId)) {
        basketsToKeep.push(legoId);
      } else {
        basketsToDelete.push(legoId);
      }
    });

    // Save report
    const report = {
      course_code: courseCode,
      timestamp: new Date().toISOString(),
      total_legos: allLegoIds.size,
      existing_baskets: existingBaskets.size,
      analysis: {
        baskets_to_keep: basketsToKeep.length,
        baskets_to_delete: basketsToDelete.length,
        baskets_missing: missingBaskets.length
      },
      baskets_to_keep: basketsToKeep.sort(),
      baskets_to_delete: basketsToDelete.sort(),
      baskets_missing: missingBaskets.sort(),
      deprecated_legos: Array.from(deprecatedLegoIds).sort()
    };

    const reportPath = path.join(VFS_ROOT, courseCode, 'basket_gaps_report.json');
    await fs.writeJson(reportPath, report, { spaces: 2 });

    return {
      success: true,
      basketsToKeep: basketsToKeep.length,
      basketsToDelete: basketsToDelete.length,
      basketsMissing: missingBaskets.length,
      reportPath
    };
  } catch (error) {
    throw new Error(`Basket gap analysis failed: ${error.message}`);
  }
}

/**
 * Generate consolidated re-extraction task list
 * @param {string} courseCode - Course identifier
 * @returns {object} - Task list summary
 */
async function generateReextractionTaskList(courseCode) {
  console.log(`   Generating re-extraction task list...`);

  try {
    // Load FD report
    const fdReportPath = path.join(VFS_ROOT, courseCode, 'lego_pairs_fd_report.json');
    const gapReportPath = path.join(VFS_ROOT, courseCode, 'basket_gaps_report.json');

    if (!await fs.pathExists(fdReportPath)) {
      throw new Error('FD report not found');
    }

    const fdReport = await fs.readJson(fdReportPath);
    let gapReport = null;

    if (await fs.pathExists(gapReportPath)) {
      gapReport = await fs.readJson(gapReportPath);
    }

    // Extract affected seeds from FD report
    const affectedSeeds = new Set();
    if (fdReport.reextraction_manifest && fdReport.reextraction_manifest.affected_seeds) {
      fdReport.reextraction_manifest.affected_seeds.forEach(seedId => {
        affectedSeeds.add(seedId);
      });
    }

    // Create consolidated task list
    const taskList = {
      course_code: courseCode,
      timestamp: new Date().toISOString(),
      workflow_status: 'REEXTRACTION_REQUIRED',
      phase_3_reextraction: {
        affected_seeds: Array.from(affectedSeeds).sort(),
        seed_count: affectedSeeds.size,
        reextraction_manifest: fdReport.reextraction_manifest
      },
      phase_5_basket_cleanup: gapReport ? {
        baskets_to_delete: gapReport.baskets_to_delete,
        baskets_to_generate: gapReport.baskets_missing,
        baskets_to_keep: gapReport.baskets_to_keep
      } : null,
      action_items: [
        {
          step: 1,
          action: 'Re-run Phase 3 LEGO extraction',
          description: `Re-extract ${affectedSeeds.size} seeds with chunking-up instructions`,
          seeds: Array.from(affectedSeeds).sort(),
          automated: false,
          status: 'pending'
        },
        {
          step: 2,
          action: 'Verify LUT check passes',
          description: 'Run POST /api/courses/:courseCode/phase/3/validate',
          automated: true,
          status: 'pending'
        },
        {
          step: 3,
          action: 'Clean up deprecated baskets',
          description: gapReport
            ? `Delete ${gapReport.baskets_to_delete.length} deprecated baskets`
            : 'No basket cleanup needed',
          automated: true,
          status: 'pending',
          endpoint: 'POST /api/courses/:courseCode/baskets/cleanup'
        },
        {
          step: 4,
          action: 'Generate new baskets',
          description: gapReport
            ? `Generate ${gapReport.baskets_missing.length} new baskets for Phase 5`
            : 'No new baskets needed',
          automated: false,
          status: 'pending'
        }
      ]
    };

    const taskListPath = path.join(VFS_ROOT, courseCode, 'reextraction_task_list.json');
    await fs.writeJson(taskListPath, taskList, { spaces: 2 });

    return {
      success: true,
      affectedSeeds: affectedSeeds.size,
      basketsToDelete: gapReport ? gapReport.baskets_to_delete.length : 0,
      basketsToGenerate: gapReport ? gapReport.baskets_missing.length : 0,
      taskListPath
    };
  } catch (error) {
    throw new Error(`Task list generation failed: ${error.message}`);
  }
}

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

      // Validator 1: LEGO-level FD check (learner uncertainty test / LUT check)
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

        // Automatically trigger basket gap analysis workflow
        console.log(`\n   🔄 Triggering automated basket gap analysis workflow...`);

        try {
          // Run basket gap analysis
          const gapAnalysisResult = await runBasketGapAnalysis(courseCode);

          if (gapAnalysisResult.success) {
            console.log(`\n   📊 Basket Gap Analysis Results:`);
            console.log(`      Baskets to keep: ${gapAnalysisResult.basketsToKeep}`);
            console.log(`      Baskets to delete: ${gapAnalysisResult.basketsToDelete}`);
            console.log(`      Baskets missing: ${gapAnalysisResult.basketsMissing}`);
            console.log(`      Report: ${gapAnalysisResult.reportPath}`);

            // Create consolidated re-extraction task list
            const taskList = await generateReextractionTaskList(courseCode);
            console.log(`\n   📋 Re-extraction Task List:`);
            console.log(`      ${taskList.affectedSeeds} seeds need re-extraction`);
            console.log(`      ${taskList.basketsToDelete} baskets need cleanup`);
            console.log(`      ${taskList.basketsToGenerate} new baskets needed`);
            console.log(`      Task list saved: ${taskList.taskListPath}`);
          }
        } catch (workflowError) {
          console.log(`   ⚠️  Automated workflow error (non-fatal): ${workflowError.message}`);
        }

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
 * Enhanced to include detailed tracking from active phase server
 */
app.get('/api/courses/:courseCode/status', async (req, res) => {
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

  // Base response with orchestrator-level state
  const response = {
    courseCode,
    currentPhase: state.currentPhase,
    status: state.status,
    startedAt: state.startedAt,
    lastUpdated: state.lastUpdated,
    phasesCompleted: state.phasesCompleted,
    checkpointMode: CHECKPOINT_MODE,
    waitingForApproval: state.waitingForApproval
  };

  // If there's an active phase, fetch detailed status from phase server
  if (state.currentPhase && state.status === 'running') {
    const phaseDetails = await fetchPhaseServerStatus(courseCode, state.currentPhase);
    if (phaseDetails) {
      // Merge detailed phase tracking into response
      response.phaseDetails = phaseDetails;

      // Calculate overall progress based on phases completed + current phase progress
      if (phaseDetails.timing && phaseDetails.timing.velocity) {
        response.estimatedCompletion = phaseDetails.timing.velocity.estimatedCompletionAt;
      }
    }
  }

  res.json(response);
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
    strategy = 'balanced',
    courseCode: providedCourseCode
  } = req.body;

  // Generate or use provided course code
  let courseCode;
  if (providedCourseCode) {
    courseCode = providedCourseCode;
  } else if (target && known) {
    courseCode = `${target.toLowerCase()}_for_${known.toLowerCase()}`;
  } else {
    return res.status(400).json({ error: 'Either courseCode or both target and known are required' });
  }

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
 * POST /api/courses/:courseCode/phase/3/validate
 * Run LUT check on Phase 3 LEGO extraction
 * Returns collision report and re-extraction manifest if violations found
 */
app.post('/api/courses/:courseCode/phase/3/validate', async (req, res) => {
  const { courseCode } = req.params;

  console.log(`\n🔍 Running LUT check for ${courseCode}...`);

  try {
    const legoPairsPath = path.join(VFS_ROOT, courseCode, 'lego_pairs.json');

    if (!await fs.pathExists(legoPairsPath)) {
      return res.status(404).json({
        error: 'lego_pairs.json not found - run Phase 3 first',
        courseCode
      });
    }

    // Run LUT collision checker
    const validatorScript = path.join(__dirname, '../../scripts/validation/check-lego-fd-violations.cjs');

    try {
      execSync(`node "${validatorScript}" "${legoPairsPath}"`, {
        cwd: VFS_ROOT,
        stdio: 'inherit'
      });

      // No violations found
      console.log(`   ✅ LUT check PASSED - no collisions detected`);

      res.json({
        courseCode,
        status: 'pass',
        collisions: 0,
        message: 'No LUT violations detected',
        reextractionNeeded: false
      });
    } catch (error) {
      // Violations found - check for reports
      const reportPath = legoPairsPath.replace('.json', '_fd_report.json');
      const manifestPath = legoPairsPath.replace('.json', '_reextraction_manifest.json');

      if (!await fs.pathExists(reportPath)) {
        throw new Error('Validation failed but no report generated');
      }

      const report = await fs.readJson(reportPath);
      let manifest = null;

      if (await fs.pathExists(manifestPath)) {
        manifest = await fs.readJson(manifestPath);
      }

      console.log(`   ❌ LUT check FAILED - ${report.violation_count} collisions found`);
      console.log(`   📋 Re-extraction needed for ${manifest?.affected_seeds?.length || 0} seeds`);

      res.json({
        courseCode,
        status: 'fail',
        collisions: report.violation_count || report.violations?.length || 0,
        message: `Found ${report.violation_count || report.violations?.length || 0} LUT violations`,
        reextractionNeeded: true,
        report,
        manifest
      });
    }
  } catch (error) {
    console.error('   ❌ LUT check error:', error.message);
    res.status(500).json({
      error: error.message,
      courseCode
    });
  }
});

/**
 * GET /api/courses/:courseCode/baskets/gaps
 * Analyze basket gaps after LEGO re-extraction
 * Fetches data from GitHub main branch, not local files
 */
app.get('/api/courses/:courseCode/baskets/gaps', async (req, res) => {
  const { courseCode } = req.params;

  console.log(`\n📊 Analyzing basket gaps for ${courseCode}...`);

  try {
    // Fetch lego_pairs.json from local (current/updated registry)
    const legoPairsPath = path.join(VFS_ROOT, courseCode, 'lego_pairs.json');

    if (!await fs.pathExists(legoPairsPath)) {
      return res.status(404).json({
        error: 'lego_pairs.json not found - run Phase 3 first',
        courseCode
      });
    }

    const legoPairsData = await fs.readJson(legoPairsPath);

    // Extract all LEGO_IDs from current lego_pairs.json
    const allLegoIds = new Set();
    if (legoPairsData.seeds && Array.isArray(legoPairsData.seeds)) {
      legoPairsData.seeds.forEach(seed => {
        if (seed.legos && Array.isArray(seed.legos)) {
          seed.legos.forEach(lego => {
            if (lego.id) {
              allLegoIds.add(lego.id);
            }
          });
        }
      });
    }

    console.log(`   Total LEGOs in current registry: ${allLegoIds.size}`);

    // Fetch lego_baskets.json from GitHub main (existing baskets)
    let existingBaskets = new Set();
    let basketsData = null;

    // Try to fetch from GitHub using gh CLI
    const githubPath = `public/vfs/courses/${courseCode}/lego_baskets.json`;
    console.log(`   Fetching baskets from GitHub main...`);

    try {
      const ghOutput = execSync(
        `gh api repos/:owner/:repo/contents/${githubPath} --jq '.content' | base64 -d`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );

      basketsData = JSON.parse(ghOutput);

      if (basketsData.baskets && typeof basketsData.baskets === 'object') {
        existingBaskets = new Set(Object.keys(basketsData.baskets));
      }

      console.log(`   ✅ Fetched ${existingBaskets.size} baskets from GitHub`);
    } catch (ghError) {
      // If gh CLI fails, try using node-fetch with GitHub API
      console.log(`   ⚠️  gh CLI failed, trying GitHub API...`);

      try {
        // Try to infer repo from git remote
        let repo = null;
        try {
          const remote = execSync('git config --get remote.origin.url', {
            encoding: 'utf8',
            cwd: __dirname
          }).trim();

          const match = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
          if (match) {
            repo = match[1];
          }
        } catch (e) {
          // Ignore
        }

        if (!repo) {
          throw new Error('Could not determine GitHub repository');
        }

        const fetch = require('node-fetch');
        const apiUrl = `https://api.github.com/repos/${repo}/contents/${githubPath}?ref=main`;

        const response = await fetch(apiUrl, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'SSi-Orchestrator'
          }
        });

        if (!response.ok) {
          throw new Error(`GitHub API returned ${response.status}`);
        }

        const data = await response.json();
        const content = Buffer.from(data.content, 'base64').toString('utf8');
        basketsData = JSON.parse(content);

        if (basketsData.baskets && typeof basketsData.baskets === 'object') {
          existingBaskets = new Set(Object.keys(basketsData.baskets));
        }

        console.log(`   ✅ Fetched ${existingBaskets.size} baskets from GitHub API`);
      } catch (apiError) {
        // Fall back to local file if GitHub fetch fails
        console.log(`   ⚠️  GitHub fetch failed, using local baskets file...`);

        const basketsPath = path.join(VFS_ROOT, courseCode, 'lego_baskets.json');
        if (await fs.pathExists(basketsPath)) {
          basketsData = await fs.readJson(basketsPath);

          if (basketsData.baskets && typeof basketsData.baskets === 'object') {
            existingBaskets = new Set(Object.keys(basketsData.baskets));
          }

          console.log(`   📁 Using local baskets: ${existingBaskets.size}`);
        } else {
          console.log(`   ℹ️  No existing baskets found - all LEGOs need baskets`);
        }
      }
    }

    // Load collision report (if exists) to identify deprecated LEGOs
    let deprecatedLegoIds = new Set();
    const collisionReportPath = path.join(VFS_ROOT, courseCode, 'lego_pairs_fd_report.json');

    if (await fs.pathExists(collisionReportPath)) {
      const collisionReport = await fs.readJson(collisionReportPath);

      if (collisionReport.status === 'FAIL' && collisionReport.violations) {
        // Extract all LEGO_IDs from collisions (except first instance - the "debut")
        collisionReport.violations.forEach(violation => {
          violation.mappings.forEach((mapping, idx) => {
            if (idx > 0) {
              // Skip first mapping (debut), mark rest as deprecated
              mapping.legos.forEach(lego => {
                deprecatedLegoIds.add(lego.lego_id);
              });
            }
          });
        });
      }

      console.log(`   Deprecated LEGOs (from collisions): ${deprecatedLegoIds.size}`);
    }

    // Analysis
    const missingBaskets = [];
    const basketsToDelete = [];
    const basketsToKeep = [];

    // 1. Find LEGOs that need baskets (missing)
    allLegoIds.forEach(legoId => {
      if (!existingBaskets.has(legoId)) {
        missingBaskets.push(legoId);
      }
    });

    // 2. Find baskets that reference deprecated LEGOs (need deletion)
    // 3. Find baskets for current LEGOs (keep)
    existingBaskets.forEach(legoId => {
      if (deprecatedLegoIds.has(legoId)) {
        basketsToDelete.push(legoId);
      } else if (allLegoIds.has(legoId)) {
        basketsToKeep.push(legoId);
      } else {
        // Basket exists but LEGO doesn't - orphaned basket
        basketsToDelete.push(legoId);
      }
    });

    // Sort for readability
    missingBaskets.sort();
    basketsToDelete.sort();
    basketsToKeep.sort();

    // Calculate stats
    const totalLegoCount = allLegoIds.size;
    const coveragePercentage = totalLegoCount > 0
      ? Math.round((basketsToKeep.length / totalLegoCount) * 100)
      : 0;

    console.log(`   ✅ Analysis complete:`);
    console.log(`      Baskets to keep: ${basketsToKeep.length} (${coveragePercentage}% coverage)`);
    console.log(`      Baskets to delete: ${basketsToDelete.length}`);
    console.log(`      Baskets missing: ${missingBaskets.length}`);

    // Generate report
    const report = {
      course_code: courseCode,
      timestamp: new Date().toISOString(),
      total_legos: totalLegoCount,
      existing_baskets: existingBaskets.size,
      coverage_percentage: coveragePercentage,
      analysis: {
        baskets_to_keep: basketsToKeep.length,
        baskets_to_delete: basketsToDelete.length,
        baskets_missing: missingBaskets.length
      },
      baskets_to_keep: basketsToKeep,
      baskets_to_delete: basketsToDelete,
      baskets_missing: missingBaskets,
      deprecated_legos: Array.from(deprecatedLegoIds).sort(),
      next_steps: [
        `1. Delete ${basketsToDelete.length} deprecated/orphaned baskets`,
        `2. Generate ${missingBaskets.length} new baskets`,
        `3. Verify ${basketsToKeep.length} existing baskets remain valid`
      ]
    };

    // Save report to local file
    const reportPath = path.join(VFS_ROOT, courseCode, 'basket_gaps_report.json');
    await fs.writeJson(reportPath, report, { spaces: 2 });

    console.log(`   📄 Report saved: ${reportPath}`);

    res.json(report);
  } catch (error) {
    console.error('   ❌ Basket gap analysis error:', error.message);
    res.status(500).json({
      error: error.message,
      courseCode
    });
  }
});

/**
 * POST /api/courses/:courseCode/baskets/cleanup
 * Clean up baskets after gap analysis
 * Backs up deleted baskets and removes them from lego_baskets.json
 */
app.post('/api/courses/:courseCode/baskets/cleanup', async (req, res) => {
  const { courseCode } = req.params;
  const { basketIdsToDelete } = req.body;

  console.log(`\n🗑️  Cleaning up baskets for ${courseCode}...`);

  if (!basketIdsToDelete || !Array.isArray(basketIdsToDelete)) {
    return res.status(400).json({
      error: 'basketIdsToDelete array required in request body'
    });
  }

  if (basketIdsToDelete.length === 0) {
    return res.json({
      courseCode,
      message: 'No baskets to delete',
      deleted: 0
    });
  }

  try {
    const basketsPath = path.join(VFS_ROOT, courseCode, 'lego_baskets.json');

    if (!await fs.pathExists(basketsPath)) {
      return res.status(404).json({
        error: 'lego_baskets.json not found',
        courseCode
      });
    }

    // Load current baskets
    const basketsData = await fs.readJson(basketsPath);

    if (!basketsData.baskets || typeof basketsData.baskets !== 'object') {
      return res.status(400).json({
        error: 'Invalid lego_baskets.json structure',
        courseCode
      });
    }

    // Backup deleted baskets
    const deletedBaskets = {};
    const notFound = [];
    let deletedCount = 0;

    basketIdsToDelete.forEach(basketId => {
      if (basketsData.baskets[basketId]) {
        deletedBaskets[basketId] = basketsData.baskets[basketId];
        delete basketsData.baskets[basketId];
        deletedCount++;
      } else {
        notFound.push(basketId);
      }
    });

    console.log(`   Deleted ${deletedCount} baskets`);
    if (notFound.length > 0) {
      console.log(`   ⚠️  ${notFound.length} basket IDs not found`);
    }

    // Save backup
    const backupPath = path.join(VFS_ROOT, courseCode, 'deleted_baskets_backup.json');
    let existingBackup = {};

    if (await fs.pathExists(backupPath)) {
      existingBackup = await fs.readJson(backupPath);
    }

    const backup = {
      ...existingBackup,
      [new Date().toISOString()]: {
        deleted_count: deletedCount,
        basket_ids: basketIdsToDelete.filter(id => !notFound.includes(id)),
        baskets: deletedBaskets
      }
    };

    await fs.writeJson(backupPath, backup, { spaces: 2 });
    console.log(`   💾 Backup saved: ${backupPath}`);

    // Save updated baskets
    await fs.writeJson(basketsPath, basketsData, { spaces: 2 });
    console.log(`   ✅ Updated baskets file: ${basketsPath}`);

    // Commit changes to git
    try {
      console.log(`   📦 Committing changes to git...`);

      execSync('git add lego_baskets.json deleted_baskets_backup.json', {
        cwd: path.join(VFS_ROOT, courseCode),
        stdio: 'inherit'
      });

      const commitMessage = `chore(${courseCode}): cleanup ${deletedCount} deprecated/orphaned baskets

Automated basket cleanup after LEGO re-extraction.

- Deleted: ${deletedCount} baskets
- Backup: deleted_baskets_backup.json
- Basket IDs: ${basketIdsToDelete.slice(0, 5).join(', ')}${basketIdsToDelete.length > 5 ? ` ... and ${basketIdsToDelete.length - 5} more` : ''}`;

      execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
        cwd: path.join(VFS_ROOT, courseCode),
        stdio: 'inherit'
      });

      console.log(`   ✅ Changes committed to git`);
    } catch (gitError) {
      console.log(`   ⚠️  Git commit failed (non-fatal): ${gitError.message}`);
    }

    res.json({
      courseCode,
      success: true,
      deleted: deletedCount,
      notFound: notFound.length,
      backupPath,
      message: `Deleted ${deletedCount} baskets and saved backup`
    });
  } catch (error) {
    console.error('   ❌ Basket cleanup error:', error.message);
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
 * Helper: Fetch detailed status from phase server
 * @param {string} courseCode - Course identifier
 * @param {number} phase - Phase number (1, 3, 5, 6, 8)
 * @returns {object|null} - Phase server status details or null if unavailable
 */
async function fetchPhaseServerStatus(courseCode, phase) {
  const phaseServerUrl = PHASE_SERVERS[phase];

  if (!phaseServerUrl) {
    console.log(`[Orchestrator] No server URL configured for Phase ${phase}`);
    return null;
  }

  try {
    // Fetch status from phase server
    const response = await axios.get(`${phaseServerUrl}/status/${courseCode}`, {
      timeout: 2000 // 2 second timeout
    });

    if (response.data) {
      console.log(`[Orchestrator] Fetched Phase ${phase} details for ${courseCode}`);
      return response.data;
    }

    return null;
  } catch (error) {
    // Phase server might not be running or course not found - this is OK
    if (error.response?.status === 404) {
      console.log(`[Orchestrator] Phase ${phase} has no active job for ${courseCode}`);
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`[Orchestrator] Phase ${phase} server not running at ${phaseServerUrl}`);
    } else {
      console.log(`[Orchestrator] Failed to fetch Phase ${phase} status: ${error.message}`);
    }
    return null;
  }
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
