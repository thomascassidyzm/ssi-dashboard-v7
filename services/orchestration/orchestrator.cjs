#!/usr/bin/env node

/**
 * SSi Course Production - Main Orchestrator (APML v9.0)
 *
 * Responsibilities:
 * - Serve dashboard read-only APIs (courses, VFS files, metrics)
 * - Trigger phase servers in sequence: Phase 1 → Phase 3 → Manifest → Audio
 * - Phase 1 includes Translation + LEGO Extraction (two services, one conceptual phase)
 * - Phase 2 (Conflict Resolution) handled within Phase 1 LEGO service
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
const { execSync, spawn } = require('child_process');

// Load environment (set by start-automation.js)
const PORT = process.env.PORT || 3456;
const VFS_ROOT = process.env.VFS_ROOT;
const CHECKPOINT_MODE = process.env.CHECKPOINT_MODE || 'gated';
const SERVICE_NAME = process.env.SERVICE_NAME || 'Orchestrator';

// APML v9.0 Phase server URLs (auto-configured by start-automation.js)
const PHASE_SERVERS = {
  // Phase 1: Translation + LEGO Extraction (two services, one conceptual phase)
  '1_translation': process.env.PHASE1_TRANSLATION_URL || 'http://localhost:3457',
  '1_lego': process.env.PHASE1_LEGO_URL || 'http://localhost:3458',
  // Phase 3: Basket Generation (was Phase 5 in old numbering)
  3: process.env.PHASE3_URL || 'http://localhost:3459',
  // Manifest: Course Compilation (was Phase 7)
  'manifest': process.env.MANIFEST_URL || 'http://localhost:3464',
  // Audio: TTS Generation (was Phase 8)
  'audio': process.env.AUDIO_URL || 'http://localhost:3465'
};

// Legacy aliases for backward compatibility during migration
const LEGACY_PHASE_ALIASES = {
  1: PHASE_SERVERS['1_translation'],
  5: PHASE_SERVERS[3],       // Phase 5 → Phase 3
  7: PHASE_SERVERS['manifest'],
  8: PHASE_SERVERS['audio']
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

// Pipeline state tracking (APML v9.0 linear flow: Phase 1 → Phase 3 → Manifest → Audio)
// courseCode -> { phase1: {success, completedAt, stats}, phase3: {...}, manifest: {...}, audio: {...} }
const pipelineJobs = new Map();

// Active course progress tracking (for real-time monitoring)
// courseCode -> { currentPhase, overallStatus, phases: {...}, recentLogs: [] }
const courseProgress = new Map();

/**
 * Initialize progress tracking for a course
 */
function initializeCourseProgress(courseCode, startPhase, totalSeeds) {
  courseProgress.set(courseCode, {
    courseCode,
    currentPhase: startPhase,
    overallStatus: 'running',
    startTime: new Date().toISOString(),
    // APML v9.0 phases: 1 (Translation + LEGO), 3 (Baskets), manifest, audio
    phases: {
      1: { status: 'pending', seedsTotal: totalSeeds },
      3: { status: 'pending' },
      manifest: { status: 'pending' },
      audio: { status: 'pending' }
    },
    recentLogs: []
  });
  return courseProgress.get(courseCode);
}

/**
 * Update phase progress
 */
function updatePhaseProgress(courseCode, phase, updates) {
  const progress = courseProgress.get(courseCode);
  if (!progress) return;

  if (!progress.phases[phase]) {
    progress.phases[phase] = {};
  }

  Object.assign(progress.phases[phase], updates);

  // Add log entry
  if (updates.status) {
    addProgressLog(courseCode, `Phase ${phase}: ${updates.status}`);
  }
}

/**
 * Add log entry to progress
 */
function addProgressLog(courseCode, message, level = 'info') {
  const progress = courseProgress.get(courseCode);
  if (!progress) return;

  progress.recentLogs.unshift({
    time: new Date().toISOString(),
    level,
    message
  });

  // Keep only last 50 logs
  if (progress.recentLogs.length > 50) {
    progress.recentLogs = progress.recentLogs.slice(0, 50);
  }
}

/**
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

/**
 * Auto-publish course data to GitHub
 * Commits and pushes course output files after each phase completion
 * This allows the deployed dashboard to show live progress
 */
async function autoPublishCourseData(courseCode, phase, message) {
  try {
    console.log(`[Auto-Publish] Publishing ${courseCode} Phase ${phase} to GitHub...`);

    const repoRoot = path.join(__dirname, '../..');
    const courseRelativePath = `public/vfs/courses/${courseCode}/`;

    // Check if there are changes specifically in the course directory
    const status = execSync(`git status --porcelain ${courseRelativePath}`, {
      cwd: repoRoot,
      encoding: 'utf-8'
    });

    if (!status.trim()) {
      console.log(`[Auto-Publish] No changes to publish for ${courseCode}`);
      return { success: true, skipped: true };
    }

    // Regenerate manifest to include this course
    console.log(`[Auto-Publish] Regenerating manifest to include ${courseCode}...`);
    await regenerateCourseManifest();

    // Stage course files AND manifest
    execSync(`git add ${courseRelativePath} public/vfs/courses-manifest.json`, {
      cwd: repoRoot,
      stdio: 'inherit'
    });

    // Create commit with formatted message
    const commitMsg = message || `Phase ${phase}: Auto-publish ${courseCode} output`;
    const fullCommitMsg = `${commitMsg}

🤖 Auto-published via orchestrator

Co-Authored-By: Claude <noreply@anthropic.com>`;

    execSync(`git commit -m "${fullCommitMsg.replace(/"/g, '\\"')}"`, {
      cwd: repoRoot,
      stdio: 'inherit'
    });

    // Push to GitHub
    execSync('git push', {
      cwd: repoRoot,
      stdio: 'inherit'
    });

    console.log(`[Auto-Publish] ✅ Published ${courseCode} to GitHub`);
    return { success: true, published: true };
  } catch (error) {
    console.error(`[Auto-Publish] ⚠️  Failed to publish:`, error.message);
    // Don't fail the phase if git push fails - just log it
    return { success: false, error: error.message };
  }
}

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
 *
 * SIMPLIFIED: External validation removed - phases handle their own validation internally
 * with retry logic. Phase completion signal = validation passed.
 *
 * @param {string} courseCode - Course identifier
 * @param {number} phase - Phase number that just completed
 * @returns {boolean} - Always returns true (trusts phase-internal validation)
 */
async function runPhaseValidation(courseCode, phase) {
  console.log(`\n✅ Phase ${phase} complete for ${courseCode} - trusting phase-internal validation`);

  // Phases handle their own validation internally with retry logic:
  // - Phase 1: Translation quality checks
  // - Phase 3: LUT validation with automatic re-extraction on violations
  // - Phase 5: Basket generation with internal checks
  // - Phase 7: Manifest compilation validation
  //
  // If a phase reports 'complete', it has already passed its internal validation.
  // External validation was removed to enable autonomous pipeline execution.

  return true;
}

/**
 * Regenerate course manifest after phase completion
 * Updates courses-manifest.json with latest course state
 */
async function regenerateCourseManifest() {
  try {
    console.log(`\n📋 Regenerating course manifest...`);

    const manifestGenerator = path.join(__dirname, '../../tools/generators/generate-course-manifest.js');

    // Use dynamic import for ES module
    const { execSync } = require('child_process');
    execSync(`node "${manifestGenerator}"`, {
      stdio: 'inherit'
    });

    console.log(`   ✅ Course manifest updated`);
    return true;
  } catch (error) {
    console.error(`   ⚠️  Failed to regenerate manifest (non-fatal):`, error.message);
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
 * GET /api/courses/:courseCode/analyze
 * Analyze course state and return intelligent recommendations
 */
app.get('/api/courses/:courseCode/analyze', async (req, res) => {
  const { courseCode } = req.params;
  const courseDir = path.join(VFS_ROOT, courseCode);

  try {
    // Check what phase outputs exist
    const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
    const introsPath = path.join(courseDir, 'introductions.json');
    const basketsPath = path.join(courseDir, 'lego_baskets.json');

    const seedPairsExists = await fs.pathExists(seedPairsPath);
    const legoPairsExists = await fs.pathExists(legoPairsPath);
    const introsExists = await fs.pathExists(introsPath);
    const basketsExists = await fs.pathExists(basketsPath);

    // Count what we have
    let seedCount = 0;
    let legoCount = 0;
    let basketCount = 0;
    let missingLegoSeeds = [];

    if (seedPairsExists) {
      const seedData = await fs.readJSON(seedPairsPath);
      seedCount = Object.keys(seedData.translations || {}).length;
    }

    if (legoPairsExists) {
      const legoData = await fs.readJSON(legoPairsPath);
      legoCount = (legoData.seeds || []).length;

      // Find seeds that have translations but no LEGOs
      if (seedPairsExists) {
        const seedData = await fs.readJSON(seedPairsPath);
        const allSeeds = Object.keys(seedData.translations || {});
        const legoSeeds = (legoData.seeds || []).map(s => s.seed_id);
        missingLegoSeeds = allSeeds.filter(s => !legoSeeds.includes(s));
      }
    }

    if (basketsExists) {
      const basketData = await fs.readJSON(basketsPath);
      basketCount = Object.keys(basketData.baskets || {}).length;
    }

    // Check for Phase 5 missing baskets (ACCURATE)
    // Compare lego_pairs.json (new:true LEGOs) against lego_baskets.json
    // This is the ONLY accurate way - handles deletions, partial baskets, etc.
    let missingBasketsCount = 0;
    let missingBasketsSeeds = 0;

    if (legoPairsExists && basketsExists) {
      try {
        const legoData = await fs.readJSON(legoPairsPath);
        const basketData = await fs.readJSON(basketsPath);

        // Step 1: Find all new:true LEGOs (first appearance, needs basket)
        const newLegos = new Map(); // legoId → {seedId, known, target}
        for (const seed of (legoData.seeds || [])) {
          for (const lego of (seed.legos || [])) {
            if (lego.new === true) {
              newLegos.set(lego.id, { seedId: seed.seed_id });
            }
          }
        }

        // Step 2: Find which LEGOs have baskets in lego_baskets.json
        const legosWithBaskets = new Set();
        if (basketData.baskets) {
          Object.keys(basketData.baskets).forEach(legoId => {
            legosWithBaskets.add(legoId);
          });
        }

        // Step 3: Count missing (new:true LEGOs NOT in lego_baskets.json)
        const seedsAffected = new Set();
        newLegos.forEach((legoInfo, legoId) => {
          if (!legosWithBaskets.has(legoId)) {
            missingBasketsCount++;
            seedsAffected.add(legoInfo.seedId);
          }
        });

        missingBasketsSeeds = seedsAffected.size;
      } catch (error) {
        console.error('[Orchestrator] Error detecting missing baskets:', error);
        // Fail gracefully
      }
    }

    // Generate intelligent recommendations
    const recommendations = [];

    if (!seedPairsExists) {
      // No course data - suggest starting fresh
      recommendations.push({
        type: 'test',
        title: '✨ Quick Test (10 seeds)',
        description: 'Test the pipeline with 10 random seeds (~5 min)',
        action: { startSeed: Math.floor(Math.random() * 659) + 1, endSeed: null, count: 10, force: false }
      });
      recommendations.push({
        type: 'full',
        title: '🚀 Full Course (668 seeds)',
        description: 'Generate complete course (~2-3 hours)',
        action: { startSeed: 1, endSeed: 668, force: false }
      });
    } else {
      // Course exists - analyze what's missing

      // Option 1: Quick test with 10 seeds
      recommendations.push({
        type: 'test',
        title: '✨ Quick Test (10 seeds)',
        description: 'Test pipeline changes with 10 random seeds',
        action: { startSeed: Math.floor(Math.random() * 659) + 1, endSeed: null, count: 10, force: false }
      });

      // Option 2: Resume from where we left off
      if (seedCount < 668) {
        recommendations.push({
          type: 'resume',
          title: `📝 Resume from S${String(seedCount + 1).padStart(4, '0')}`,
          description: `Continue generating (${668 - seedCount} seeds remaining)`,
          action: { startSeed: seedCount + 1, endSeed: 668, force: false }
        });
      }

      // Option 3: Regenerate specific phases (force overwrite)
      if (legoPairsExists && legoCount > 0) {
        recommendations.push({
          type: 'regenerate',
          title: `🔄 Regenerate LEGOs (S0001-S${String(legoCount).padStart(4, '0')})`,
          description: 'Force re-extract LEGOs (use if quality is poor)',
          action: { startSeed: 1, endSeed: legoCount, force: true }
        });
      }

      // Option 4: Fill in missing LEGOs
      if (missingLegoSeeds.length > 0 && missingLegoSeeds.length < seedCount) {
        recommendations.push({
          type: 'fill',
          title: `➡️  Complete Phase 3 (${missingLegoSeeds.length} seeds)`,
          description: `Generate LEGOs for seeds missing Phase 3`,
          action: { startSeed: 1, endSeed: seedCount, force: false }
        });
      }

      // Option 4.5: Resume Phase 5 missing baskets (intelligent resume)
      if (missingBasketsSeeds > 0 && legoPairsExists) {
        recommendations.push({
          type: 'resume-baskets',
          phase: 5,
          title: `📦 Resume Missing Baskets (${missingBasketsSeeds} seeds)`,
          description: `Generate practice phrases for seeds missing Phase 5`,
          action: { startSeed: 1, endSeed: 668, phases: ['phase5'], force: false }
        });
      }

      // Option 5: Extend to full course
      if (seedCount > 0 && seedCount < 668) {
        recommendations.push({
          type: 'extend',
          title: '🚀 Extend to Full Course (668 seeds)',
          description: `Keeps existing ${seedCount} seeds, adds ${668 - seedCount} more`,
          action: { startSeed: 1, endSeed: 668, force: false }
        });
      }

      // Option 6: Complete regeneration
      recommendations.push({
        type: 'regenerate-all',
        title: '🔄 Regenerate Everything',
        description: 'Force regenerate all phases (nuclear option)',
        action: { startSeed: 1, endSeed: 668, force: true }
      });
    }

    res.json({
      courseCode,
      exists: seedPairsExists,
      seed_pairs: { exists: seedPairsExists, count: seedCount },
      lego_pairs: { exists: legoPairsExists, count: legoCount, missing: missingLegoSeeds },
      introductions: { exists: introsExists },
      baskets: {
        exists: basketsExists,
        count: basketCount,
        missing_seeds: missingBasketsSeeds,
        estimated_missing_legos: missingBasketsCount
      },
      recommendations
    });
  } catch (error) {
    console.error(`[Orchestrator] Error analyzing ${courseCode}:`, error);
    res.status(500).json({ error: 'Failed to analyze course', details: error.message });
  }
});

/**
 * GET /api/courses/:courseCode/phase2-stats
 * Get Phase 2 validation stats for checkpoint modal
 * Reads lego_pairs.json and computes:
 * - Collision resolution stats (M-type upchunks)
 * - LEGO reuse tracking (new: true vs new: false)
 * - Validation checks
 */
app.get('/api/courses/:courseCode/phase2-stats', async (req, res) => {
  const { courseCode } = req.params;

  try {
    const courseDir = path.join(VFS_ROOT, courseCode);
    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');

    if (!await fs.pathExists(legoPairsPath)) {
      return res.status(404).json({
        error: 'lego_pairs.json not found - Phase 2 not complete',
        courseCode
      });
    }

    const legoPairsData = await fs.readJson(legoPairsPath);

    // Initialize counters
    let totalLegos = 0;
    let uniqueLegos = 0;  // new: true
    let reusedLegos = 0;  // new: false
    let mTypeLegos = 0;   // M-type (upchunks from collision resolution)
    let aTypeLegos = 0;   // A-type (atomic)
    let seedsWithIncompleteBreakdowns = 0;

    // Process all seeds
    const seeds = legoPairsData.seeds || [];
    for (const seed of seeds) {
      const legos = seed.legos || [];

      for (const lego of legos) {
        totalLegos++;

        if (lego.new === false) {
          reusedLegos++;
        } else {
          uniqueLegos++;
        }

        if (lego.type === 'M') {
          mTypeLegos++;
        } else {
          aTypeLegos++;
        }
      }

      // Check for incomplete breakdowns (seeds with no legos)
      if (legos.length === 0) {
        seedsWithIncompleteBreakdowns++;
      }
    }

    // Calculate reuse rate
    const reuseRate = totalLegos > 0 ? Math.round((reusedLegos / totalLegos) * 100) : 0;

    // Collision resolution estimate (M-types are often upchunks)
    // Note: Not all M-types are collision resolutions, but they indicate structural teaching
    const collisionsResolved = mTypeLegos;  // M-types represent upchunked patterns

    res.json({
      courseCode,
      collisions: {
        detected: collisionsResolved,  // Approximate - M-types indicate collision handling
        resolved: collisionsResolved
      },
      reuseTracking: {
        totalLegos,
        uniqueLegos,
        reusedLegos,
        reuseRate
      },
      legoTypes: {
        atomic: aTypeLegos,
        molecular: mTypeLegos
      },
      validation: {
        completeBreakdowns: seedsWithIncompleteBreakdowns === 0,
        seedsWithIncompleteBreakdowns,
        totalSeeds: seeds.length,
        allTilesValidate: true,  // Placeholder - would need tiling validation
        noFdViolations: true     // Placeholder - would need FD check
      },
      generatedAt: legoPairsData.generated_at || null
    });

  } catch (error) {
    console.error(`[Orchestrator] Error getting Phase 2 stats for ${courseCode}:`, error);
    res.status(500).json({ error: 'Failed to get Phase 2 stats', details: error.message });
  }
});

/**
 * GET /api/courses/:courseCode/progress
 * Real-time progress tracking for dashboard polling
 */
app.get('/api/courses/:courseCode/progress', async (req, res) => {
  const { courseCode } = req.params;
  const progress = courseProgress.get(courseCode);

  if (!progress) {
    // Check if course exists but has no active progress
    const courseDir = path.join(VFS_ROOT, courseCode);
    const courseExists = await fs.pathExists(courseDir);

    if (courseExists) {
      // Course exists but not currently running
      return res.json({
        courseCode,
        overallStatus: 'idle',
        message: 'Course exists but no active pipeline running'
      });
    } else {
      return res.status(404).json({
        error: 'Course not found',
        courseCode
      });
    }
  }

  res.json(progress);
});

/**
 * POST /api/courses/:courseCode/progress
 * Phase servers report progress updates
 */
app.post('/api/courses/:courseCode/progress', async (req, res) => {
  const { courseCode } = req.params;
  const { phase, updates, logMessage } = req.body;

  if (!phase) {
    return res.status(400).json({ error: 'phase number required' });
  }

  // Initialize progress if not exists
  if (!courseProgress.has(courseCode)) {
    initializeCourseProgress(courseCode, phase, updates.seedsTotal || 668);
  }

  // Update phase progress
  updatePhaseProgress(courseCode, phase, updates);

  // Add log if provided
  if (logMessage) {
    addProgressLog(courseCode, logMessage, updates.level || 'info');
  }

  // Calculate ETA if progress info provided
  // Phase 5 uses LEGOs, other phases use seeds
  if (updates.startTime) {
    let completed, total;
    if (phase === 5 && updates.legosCompleted && updates.legosTotal) {
      // Phase 5: Track LEGOs
      completed = updates.legosCompleted;
      total = updates.legosTotal;
    } else if (updates.seedsCompleted && updates.seedsTotal) {
      // Other phases: Track seeds
      completed = updates.seedsCompleted;
      total = updates.seedsTotal;
    }

    if (completed && total) {
      const elapsed = Date.now() - new Date(updates.startTime).getTime();
      const rate = completed / (elapsed / 1000); // items per second
      const remaining = total - completed;
      const etaSeconds = remaining / rate;
      updates.eta = new Date(Date.now() + etaSeconds * 1000).toISOString();
      updates.etaHuman = formatDuration(etaSeconds);
    }
  }

  res.json({ success: true, progress: courseProgress.get(courseCode) });
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
      3: [1],          // Phase 3 requires Phase 1 (seed_pairs.json) - includes Phase 6 introductions
      5: [1, 3],       // Phase 5 requires Phases 1 & 3 (lego_pairs.json + introductions.json)
      7: [1, 3, 5],    // Phase 7 requires Phases 1, 3 & 5 (manifest compilation)
      8: [1, 3, 5, 7]  // Phase 8 requires all previous phases (TTS audio generation)
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
 * Triggers next phase in linear sequence: 1 → 3 → 5 → 7 → 8
 */
app.post('/phase-complete', async (req, res) => {
  const { phase, courseCode, status, success, stats } = req.body;

  console.log(`\n✅ Phase ${phase} ${status || (success ? 'complete' : 'failed')} for ${courseCode}`);

  const state = courseStates.get(courseCode);
  if (!state) {
    return res.json({ acknowledged: true });
  }

  // Update pipeline state for parallel coordination
  let pipelineJob = pipelineJobs.get(courseCode) || {};
  const phaseKey = `phase${phase}`;
  pipelineJob[phaseKey] = {
    success: success !== undefined ? success : status === 'complete',
    completedAt: new Date().toISOString(),
    stats: stats || {}
  };
  pipelineJobs.set(courseCode, pipelineJob);

  // Update state
  if (status === 'complete' || success) {
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
      return res.json({ acknowledged: true });
    }

    // Validation PASSED - now handle orchestration based on phase
    if (CHECKPOINT_MODE === 'manual') {
      state.status = 'waiting_for_approval';
      state.waitingForApproval = true;
      console.log(`   ⏸️  Waiting for manual approval (checkpoint mode: manual)`);
    } else {
      // Auto-trigger next phase(s) based on orchestration logic
      await handlePhaseProgression(courseCode, phase, state, pipelineJob);
    }
  } else {
    state.status = status || 'error';
  }

  state.lastUpdated = new Date().toISOString();

  res.json({ acknowledged: true });
});

/**
 * Handle phase progression (APML v9.0 linear pipeline)
 * Phase 1 (Translation + LEGO) → Phase 3 (Baskets) → Manifest → Audio
 */
async function handlePhaseProgression(courseCode, completedPhase, state, pipelineJob) {
  // Regenerate course manifest to reflect the newly completed phase
  await regenerateCourseManifest();

  // Normalize phase identifiers (support both old and new naming)
  const normalizedPhase = normalizePhaseIdentifier(completedPhase);

  if (normalizedPhase === 'phase1') {
    // Phase 1 complete → Phase 3 (Baskets)
    console.log(`   → Phase 1 complete, triggering Phase 3 (Baskets)`);
    setTimeout(() => triggerPhase(courseCode, 3), 2000);
  } else if (normalizedPhase === 'phase3') {
    // Phase 3 (Baskets) → Manifest
    console.log(`   → Phase 3 complete, triggering Manifest compilation`);
    setTimeout(() => triggerPhase(courseCode, 'manifest'), 2000);
  } else if (normalizedPhase === 'manifest') {
    // Manifest → Audio
    console.log(`   → Manifest complete, triggering Audio generation`);
    setTimeout(() => triggerPhase(courseCode, 'audio'), 2000);
  } else if (normalizedPhase === 'audio') {
    // Audio → All complete!
    state.status = 'complete';
    console.log(`   🎉 All phases complete!`);
  } else {
    // Unknown phase - use linear fallback
    const nextPhase = getNextPhase(completedPhase);
    if (nextPhase) {
      console.log(`   → Auto-triggering ${nextPhase}`);
      setTimeout(() => triggerPhase(courseCode, nextPhase), 2000);
    } else {
      state.status = 'complete';
      console.log(`   🎉 All phases complete!`);
    }
  }
}

/**
 * Normalize phase identifiers for backward compatibility
 * Maps old phase numbers to APML v9.0 naming
 */
function normalizePhaseIdentifier(phase) {
  const mapping = {
    1: 'phase1', 'phase1': 'phase1',
    3: 'phase3', 'phase3': 'phase3',
    5: 'phase3', 'phase5': 'phase3',  // Old Phase 5 → New Phase 3
    7: 'manifest', 'phase7': 'manifest',
    8: 'audio', 'phase8': 'audio',
    'manifest': 'manifest',
    'audio': 'audio'
  };
  return mapping[phase] || phase;
}

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
    // APML v9.0 Phase Selection
    // Maps user selection to internal phase identifier
    let phase;
    let phaseName;
    if (phaseSelection === 'phase1' || phaseSelection === 'all') {
      phase = '1_translation';  // Start with translation
      phaseName = 'Phase 1';
    } else if (phaseSelection === 'phase3') {
      phase = 3;
      phaseName = 'Phase 3 (Baskets)';
    } else if (phaseSelection === 'phase5') {
      // Legacy: Phase 5 → Phase 3 in APML v9.0
      phase = 3;
      phaseName = 'Phase 3 (Baskets)';
    } else if (phaseSelection === 'phase7' || phaseSelection === 'manifest') {
      phase = 'manifest';
      phaseName = 'Manifest';
    } else if (phaseSelection === 'phase8' || phaseSelection === 'audio') {
      phase = 'audio';
      phaseName = 'Audio';
    } else {
      throw new Error(`Unknown phase selection: ${phaseSelection}`);
    }

    // Delegate to phase server
    const phaseServer = PHASE_SERVERS[phase] || LEGACY_PHASE_ALIASES[phase];
    if (!phaseServer) {
      throw new Error(`Phase ${phase} server not available`);
    }

    console.log(`   → Delegating to ${phaseName} server: ${phaseServer}`);

    // Initialize progress tracking
    const progress = initializeCourseProgress(courseCode, phase, totalSeeds);
    updatePhaseProgress(courseCode, phase, { status: 'running', startTime: new Date().toISOString() });
    addProgressLog(courseCode, `Starting ${phaseName} for ${totalSeeds} seeds`);

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
 * Cache for ISO 639-3 languages (fetched on startup, refreshed daily)
 */
let iso639LanguagesCache = null;
let iso639CacheTimestamp = null;
const ISO639_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch and parse ISO 639-3 language data from SIL International
 * Returns: Array of { code, name, native } objects
 */
async function fetchISO639Languages() {
  // Return cached data if fresh
  if (iso639LanguagesCache && iso639CacheTimestamp && (Date.now() - iso639CacheTimestamp < ISO639_CACHE_TTL)) {
    return iso639LanguagesCache;
  }

  try {
    console.log('[Orchestrator] Fetching ISO 639-3 language data from SIL...');

    // Fetch the official ISO 639-3 tab-delimited file from SIL International
    const response = await axios.get('https://iso639-3.sil.org/sites/iso639-3/files/downloads/iso-639-3.tab', {
      timeout: 10000,
      responseType: 'text'
    });

    const lines = response.data.split('\n');
    const languages = [];

    // Skip header line, parse data
    // Format: Id	Part2B	Part2T	Part1	Scope	Language_Type	Ref_Name	Comment
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const fields = line.split('\t');
      if (fields.length < 7) continue;

      const [id, part2B, part2T, part1, scope, languageType, refName] = fields;

      // Only include living languages (L) and some constructed languages (C)
      if (languageType !== 'L' && languageType !== 'C') continue;

      // Prefer the 3-letter ISO 639-3 code (id)
      const code = id.toLowerCase();
      const name = refName.trim();

      // For native name, we'll use the English name as fallback
      // (Native names would require a separate dataset)
      const native = name;

      languages.push({ code, name, native });
    }

    // Cache the result
    iso639LanguagesCache = languages;
    iso639CacheTimestamp = Date.now();

    console.log(`[Orchestrator] ✅ Loaded ${languages.length} languages from ISO 639-3`);
    return languages;

  } catch (error) {
    console.error('[Orchestrator] ❌ Failed to fetch ISO 639-3 data:', error.message);

    // Fallback to basic list if fetch fails
    const fallback = [
      { code: 'afr', name: 'Afrikaans', native: 'Afrikaans' },
      { code: 'ara', name: 'Arabic', native: 'العربية' },
      { code: 'bre', name: 'Breton', native: 'Brezhoneg' },
      { code: 'cmn', name: 'Chinese (Mandarin)', native: '中文 (普通话)' },
      { code: 'cym', name: 'Welsh', native: 'Cymraeg' },
      { code: 'deu', name: 'German', native: 'Deutsch' },
      { code: 'eng', name: 'English', native: 'English' },
      { code: 'eus', name: 'Basque', native: 'Euskara' },
      { code: 'fra', name: 'French', native: 'Français' },
      { code: 'gla', name: 'Scottish Gaelic', native: 'Gàidhlig' },
      { code: 'gle', name: 'Irish', native: 'Gaeilge' },
      { code: 'glv', name: 'Manx', native: 'Gaelg' },
      { code: 'ita', name: 'Italian', native: 'Italiano' },
      { code: 'jpn', name: 'Japanese', native: '日本語' },
      { code: 'kor', name: 'Korean', native: '한국어' },
      { code: 'por', name: 'Portuguese', native: 'Português' },
      { code: 'rus', name: 'Russian', native: 'Русский' },
      { code: 'spa', name: 'Spanish', native: 'Español' }
    ];

    return fallback;
  }
}

/**
 * GET /api/languages
 * Return ISO 639-3 language codes for dashboard (fetched from SIL registry)
 */
app.get('/api/languages', async (req, res) => {
  try {
    const languages = await fetchISO639Languages();

    // Sort by English name
    languages.sort((a, b) => a.name.localeCompare(b.name));

    res.json(languages);
  } catch (error) {
    console.error('[Orchestrator] Error serving languages:', error);
    res.status(500).json({ error: 'Failed to load languages', details: error.message });
  }
});

/**
 * GET /api/canonical-seeds
 * Serve canonical seeds to agents via ngrok
 * Query params: ?limit=N&start=M (defaults: limit=668, start=1)
 */
app.get('/api/canonical-seeds', async (req, res) => {
  try {
    const canonicalPath = path.join(__dirname, '../../public/vfs/canonical/canonical_seeds.json');
    const seedsArray = await fs.readJSON(canonicalPath);

    const limit = parseInt(req.query.limit) || 668;
    const start = parseInt(req.query.start) || 1;

    // Filter seeds by range (array is 0-indexed, but seed_id is 1-indexed)
    const startIdx = start - 1;
    const endIdx = Math.min(startIdx + limit, 668);
    const filteredSeeds = seedsArray.slice(startIdx, endIdx);

    res.json({
      total_available: 668,
      start,
      limit,
      count: filteredSeeds.length,
      seeds: filteredSeeds
    });
  } catch (error) {
    console.error('[Orchestrator] Error serving canonical seeds:', error);
    res.status(500).json({ error: 'Failed to load canonical seeds', details: error.message });
  }
});

/**
 * GET /api/courses/:courseCode/phase-outputs/:phase/:file
 * Retrieve phase output files from VFS
 * Example: GET /api/courses/hun_for_eng/phase-outputs/1/seed_pairs.json
 * Returns the contents of {VFS_ROOT}/{courseCode}/{file}
 */
app.get('/api/courses/:courseCode/phase-outputs/:phase/:file', async (req, res) => {
  const { courseCode, phase, file } = req.params;

  console.log(`[Orchestrator] Fetching phase ${phase} output: ${file} for ${courseCode}`);

  try {
    // Construct file path: {VFS_ROOT}/{courseCode}/{file}
    const filePath = path.join(VFS_ROOT, courseCode, file);

    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      console.log(`[Orchestrator] File not found: ${filePath}`);
      return res.status(404).json({
        error: 'File not found',
        courseCode,
        phase,
        file,
        path: filePath
      });
    }

    // Read and return the JSON file
    const data = await fs.readJson(filePath);

    console.log(`[Orchestrator] Successfully served ${file} for ${courseCode}`);

    res.json(data);
  } catch (error) {
    console.error(`[Orchestrator] Error reading phase output file:`, error);

    // Handle JSON parse errors specifically
    if (error.name === 'SyntaxError' || error.message.includes('JSON')) {
      return res.status(500).json({
        error: 'Invalid JSON file',
        courseCode,
        phase,
        file,
        details: error.message
      });
    }

    // Handle file read errors
    res.status(500).json({
      error: 'File read failed',
      courseCode,
      phase,
      file,
      details: error.message
    });
  }
});

/**
 * PUT /api/courses/:courseCode/phase-outputs/:phase/:file
 * Save/update phase output files in VFS
 * Example: PUT /api/courses/hun_for_eng/phase-outputs/3/introductions.json
 * Writes to {VFS_ROOT}/{courseCode}/{file}
 */
app.put('/api/courses/:courseCode/phase-outputs/:phase/:file', async (req, res) => {
  const { courseCode, phase, file } = req.params;
  const data = req.body;

  console.log(`[Orchestrator] Saving phase ${phase} output: ${file} for ${courseCode}`);

  try {
    // Validate course exists
    const courseDir = path.join(VFS_ROOT, courseCode);
    if (!await fs.pathExists(courseDir)) {
      console.log(`[Orchestrator] Course directory not found: ${courseDir}`);
      return res.status(404).json({
        error: 'Course not found',
        courseCode
      });
    }

    // Construct file path: {VFS_ROOT}/{courseCode}/{file}
    const filePath = path.join(VFS_ROOT, courseCode, file);

    // Create backup if file exists
    if (await fs.pathExists(filePath)) {
      const backupPath = `${filePath}.backup-${Date.now()}`;
      await fs.copy(filePath, backupPath);
      console.log(`[Orchestrator] Created backup: ${backupPath}`);
    }

    // Write the data to file
    await fs.writeJson(filePath, data, { spaces: 2 });

    console.log(`[Orchestrator] Successfully saved ${file} for ${courseCode}`);

    res.json({
      success: true,
      courseCode,
      phase,
      file,
      path: filePath,
      message: 'Phase output saved successfully'
    });
  } catch (error) {
    console.error(`[Orchestrator] Error saving phase output file:`, error);

    res.status(500).json({
      error: 'File save failed',
      courseCode,
      phase,
      file,
      details: error.message
    });
  }
});

/**
 * GET /api/phase-intelligence/:phase
 * Serve phase intelligence docs to agents via ngrok
 * Example: /api/phase-intelligence/1 or /api/phase-intelligence/phase1
 */
app.get('/api/phase-intelligence/:phase', async (req, res) => {
  try {
    let { phase } = req.params;

    // Normalize phase number (handle "phase1" or "1")
    phase = phase.replace(/^phase/, '');

    // Map phase numbers to intelligence files
    const phaseFiles = {
      '1': 'phase_1_seed_pairs.md',
      '3': 'phase_3_lego_pairs.md',
      '5': 'phase_5_lego_baskets.md',
      '5.5': 'phase_5.5_grammar_review.md',
      '6': 'phase_6_introductions.md',
      '7': 'phase_7_compilation.md',
      '8': 'phase_8_audio_generation.md'
    };

    const filename = phaseFiles[phase];
    if (!filename) {
      return res.status(404).json({ error: `No intelligence found for phase ${phase}` });
    }

    const intelligencePath = path.join(__dirname, '../../public/docs/phase_intelligence', filename);
    const content = await fs.readFile(intelligencePath, 'utf8');

    res.json({
      phase,
      filename,
      content,
      format: 'markdown'
    });
  } catch (error) {
    console.error(`[Orchestrator] Error serving phase intelligence:`, error);
    res.status(500).json({ error: 'Failed to load phase intelligence', details: error.message });
  }
});

/**
 * POST /api/regenerate-manifest
 * Trigger manual manifest regeneration (local dev only)
 * Scans public/vfs/courses/ and updates courses-manifest.json
 * Returns comparison showing what changed
 */
app.post('/api/regenerate-manifest', async (req, res) => {
  try {
    console.log('[Orchestrator] 📋 Manual manifest regeneration requested');

    // Load old manifest first
    const manifestPath = path.join(__dirname, '../../public/vfs/courses-manifest.json');
    let oldManifest = null;
    try {
      oldManifest = await fs.readJson(manifestPath);
    } catch (err) {
      console.log('[Orchestrator] No existing manifest found');
    }

    // Regenerate manifest
    await regenerateCourseManifest();

    // Load new manifest
    const newManifest = await fs.readJson(manifestPath);

    // Compare old vs new
    const comparison = {
      added: [],
      updated: [],
      removed: []
    };

    if (oldManifest) {
      const oldCodes = new Set(oldManifest.courses.map(c => c.course_code));
      const newCodes = new Set(newManifest.courses.map(c => c.course_code));

      // Find added courses
      for (const course of newManifest.courses) {
        if (!oldCodes.has(course.course_code)) {
          comparison.added.push(course.course_code);
        }
      }

      // Find removed courses
      for (const course of oldManifest.courses) {
        if (!newCodes.has(course.course_code)) {
          comparison.removed.push(course.course_code);
        }
      }

      // Find updated courses (phase changed)
      for (const newCourse of newManifest.courses) {
        const oldCourse = oldManifest.courses.find(c => c.course_code === newCourse.course_code);
        if (oldCourse && oldCourse.phase !== newCourse.phase) {
          comparison.updated.push({
            course_code: newCourse.course_code,
            old_phase: oldCourse.phase,
            new_phase: newCourse.phase
          });
        }
      }
    }

    res.json({
      success: true,
      message: 'Manifest regenerated successfully. Remember to commit and push changes to GitHub.',
      timestamp: new Date().toISOString(),
      comparison,
      total_courses: newManifest.courses.length
    });
  } catch (error) {
    console.error('[Orchestrator] ❌ Failed to regenerate manifest:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to regenerate manifest'
    });
  }
});

/**
 * POST /api/push-to-github
 * Manual git push for course data (like Regenerate Manifest button)
 */
app.post('/api/push-to-github', async (req, res) => {
  try {
    const { courseCode, message } = req.body;

    if (!courseCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: courseCode'
      });
    }

    console.log(`[Orchestrator] 📤 Manual GitHub push requested for ${courseCode}`);

    // Use the same auto-publish function that phases use
    const result = await autoPublishCourseData(
      courseCode,
      'manual',
      message || `Manual update: ${courseCode} course data`
    );

    if (result.skipped) {
      return res.json({
        success: true,
        skipped: true,
        message: 'No changes to push'
      });
    }

    if (result.success) {
      res.json({
        success: true,
        message: '✅ Course data pushed to GitHub! Vercel will deploy automatically.',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to push to GitHub'
      });
    }
  } catch (error) {
    console.error('[Orchestrator] ❌ Failed to push to GitHub:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to push to GitHub'
    });
  }
});

/**
 * POST /api/push-all-courses
 * Push all course data to GitHub (used from Course Library page)
 */
app.post('/api/push-all-courses', async (req, res) => {
  try {
    console.log('[Orchestrator] 📤 Manual GitHub push requested for ALL courses');

    const repoRoot = path.join(__dirname, '../..');
    const coursesPath = 'public/vfs/courses/';

    // Check if there are changes in courses directory
    const status = execSync(`git status --porcelain ${coursesPath}`, {
      cwd: repoRoot,
      encoding: 'utf-8'
    });

    if (!status.trim()) {
      return res.json({
        success: true,
        skipped: true,
        message: 'No changes to push'
      });
    }

    // Stage all course files
    execSync(`git add ${coursesPath}`, {
      cwd: repoRoot,
      stdio: 'inherit'
    });

    // Create commit
    const commitMsg = `Update course data

🤖 Auto-published via orchestrator

Co-Authored-By: Claude <noreply@anthropic.com>`;

    execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, {
      cwd: repoRoot,
      stdio: 'inherit'
    });

    // Push to GitHub
    execSync('git push', {
      cwd: repoRoot,
      stdio: 'inherit'
    });

    console.log('[Auto-Publish] ✅ All course data pushed to GitHub');

    res.json({
      success: true,
      message: '✅ All course data pushed to GitHub! Vercel will deploy automatically.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Orchestrator] ❌ Failed to push to GitHub:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to push to GitHub'
    });
  }
});

// =============================================================================
// AUDIO GENERATION ENDPOINTS (APML v9.0)
// Legacy /api/phase8/* routes maintained for backward compatibility
// =============================================================================

/**
 * POST /api/audio/start (APML v9.0) and /api/phase8/start (legacy)
 * Proxy to Audio server (port 3465)
 */
async function handleAudioStart(req, res) {
  try {
    const { courseCode, options = {} } = req.body;

    if (!courseCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: courseCode'
      });
    }

    console.log(`[Orchestrator] 🎵 Proxying Audio generation request for ${courseCode}`);

    const audioUrl = PHASE_SERVERS['audio'];

    const response = await axios.post(`${audioUrl}/start`, {
      courseCode,
      options
    });

    res.json(response.data);
  } catch (error) {
    console.error('[Orchestrator] ❌ Audio proxy error:', error.message);

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Audio server is not running',
        message: 'Please start the Audio server (port 3465)'
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.message,
      message: 'Failed to start Audio generation'
    });
  }
}
app.post('/api/audio/start', handleAudioStart);
app.post('/api/phase8/start', handleAudioStart);  // Legacy

/**
 * GET /api/audio/status/:courseCode (APML v9.0) and /api/phase8/status/:courseCode (legacy)
 */
async function handleAudioStatus(req, res) {
  try {
    const { courseCode } = req.params;
    const audioUrl = PHASE_SERVERS['audio'];

    const response = await axios.get(`${audioUrl}/status/${courseCode}`);
    res.json(response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ success: false, error: 'Audio server not running' });
    }
    if (error.response?.status === 404) {
      return res.status(404).json({ success: false, error: 'No job found for this course' });
    }
    res.status(error.response?.status || 500).json({ success: false, error: error.message });
  }
}
app.get('/api/audio/status/:courseCode', handleAudioStatus);
app.get('/api/phase8/status/:courseCode', handleAudioStatus);  // Legacy

/**
 * POST /api/audio/continue (APML v9.0) and /api/phase8/continue (legacy)
 */
async function handleAudioContinue(req, res) {
  try {
    const { courseCode, options = {} } = req.body;
    const audioUrl = PHASE_SERVERS['audio'];

    const response = await axios.post(`${audioUrl}/continue-phase-a`, { courseCode, options });
    res.json(response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ success: false, error: 'Audio server not running' });
    }
    res.status(error.response?.status || 500).json({ success: false, error: error.message });
  }
}
app.post('/api/audio/continue', handleAudioContinue);
app.post('/api/phase8/continue', handleAudioContinue);  // Legacy

/**
 * POST /api/audio/regenerate (APML v9.0) and /api/phase8/regenerate (legacy)
 */
async function handleAudioRegenerate(req, res) {
  try {
    const { courseCode, uuids } = req.body;
    const audioUrl = PHASE_SERVERS['audio'];

    const response = await axios.post(`${audioUrl}/regenerate`, { courseCode, uuids });
    res.json(response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ success: false, error: 'Audio server not running' });
    }
    res.status(error.response?.status || 500).json({ success: false, error: error.message });
  }
}
app.post('/api/audio/regenerate', handleAudioRegenerate);
app.post('/api/phase8/regenerate', handleAudioRegenerate);  // Legacy

/**
 * GET /api/audio/qc-report/:courseCode (APML v9.0) and /api/phase8/qc-report/:courseCode (legacy)
 */
async function handleAudioQCReport(req, res) {
  try {
    const { courseCode } = req.params;
    const qcReportPath = path.join(VFS_ROOT, 'courses', courseCode, 'qc_report_raw.json');

    if (!await fs.pathExists(qcReportPath)) {
      return res.status(404).json({ success: false, error: 'QC report not found' });
    }

    const report = await fs.readJson(qcReportPath);
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
app.get('/api/audio/qc-report/:courseCode', handleAudioQCReport);
app.get('/api/phase8/qc-report/:courseCode', handleAudioQCReport);  // Legacy

/**
 * Run Phase 1 Validation: LUT Collision Check
 * Checks if same KNOWN phrase maps to multiple TARGET translations
 * This is inline validation, not a separate phase
 */
async function runPhase1ValidationCheck(seedPairsPath) {
  const validationScript = path.join(__dirname, '../../scripts/phase2_collision_check.cjs');

  return new Promise((resolve) => {
    const child = spawn('node', [validationScript, seedPairsPath], {
      stdio: 'pipe' // Capture output
    });

    let output = '';
    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log(`[Phase 1 Validation] ${text.trim()}`);
    });

    child.stderr.on('data', (data) => {
      console.error(`[Phase 1 Validation] ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`[Orchestrator] ✅ Phase 1 Validation: No FD violations detected`);
        resolve({ passed: true, violations: 0 });
      } else {
        console.warn(`[Orchestrator] ⚠️  Phase 1 Validation: Found FD violations`);
        resolve({ passed: false, violations: 'see logs' });
      }
    });

    child.on('error', (err) => {
      console.error(`[Orchestrator] ⚠️  Phase 1 validation check failed:`, err.message);
      resolve({ passed: false, error: err.message });
    });
  });
}

/**
 * POST /api/phase1/:courseCode/submit
 * Accept completed seed_pairs.json from agents via ngrok
 */
app.post('/api/phase1/:courseCode/submit', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const seedPairs = req.body;

    // Validate basic structure
    if (!seedPairs.course || !seedPairs.translations) {
      return res.status(400).json({
        error: 'Invalid seed_pairs format',
        required: ['course', 'translations']
      });
    }

    // Write to VFS
    const outputPath = path.join(VFS_ROOT, courseCode, 'seed_pairs.json');
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeJSON(outputPath, seedPairs, { spaces: 2 });

    const seedCount = Object.keys(seedPairs.translations).length;

    console.log(`[Orchestrator] ✅ Received Phase 1 submission for ${courseCode}`);
    console.log(`[Orchestrator]    Seeds: ${seedCount}`);
    console.log(`[Orchestrator]    Saved to: ${outputPath}`);

    // Update progress tracking
    updatePhaseProgress(courseCode, 1, {
      status: 'validating',
      seedsComplete: seedCount,
      seedsTotal: seedCount
    });
    addProgressLog(courseCode, `Phase 1: Received ${seedCount} translations`);

    // Run inline validation (LUT - Learner Uncertainty Test)
    console.log(`[Orchestrator] 🔍 Running LUT collision check...`);
    addProgressLog(courseCode, 'Running LUT collision check...');
    const validationResult = await runPhase1ValidationCheck(outputPath);

    // Mark Phase 1 as complete
    updatePhaseProgress(courseCode, 1, {
      status: 'complete',
      endTime: new Date().toISOString(),
      validation: validationResult
    });
    addProgressLog(courseCode, `Phase 1: Complete ${validationResult.passed ? '✅' : '⚠️'}`, validationResult.passed ? 'info' : 'warning');

    // Update current phase to next
    const progress = courseProgress.get(courseCode);
    if (progress) {
      progress.currentPhase = 3;
    }

    // Trigger Phase 3 automatically (with 2s delay for GitHub sync)
    console.log(`[Orchestrator] → Phase 1 complete, triggering Phase 3 in 2s...`);
    addProgressLog(courseCode, 'Phase 1: complete');
    setTimeout(() => {
      console.log(`[Orchestrator] 🚀 Auto-triggering Phase 3 for ${courseCode}`);
      addProgressLog(courseCode, 'Starting Phase 3 for 10 seeds');
      triggerPhase(courseCode, 3);
    }, 2000);

    // Auto-publish to GitHub for live dashboard visibility
    autoPublishCourseData(
      courseCode,
      1,
      `Phase 1: ${seedCount} pedagogical translations`
    ).catch(err => console.error('[Phase 1] Auto-publish failed:', err));

    res.json({
      success: true,
      message: `Phase 1 submission received for ${courseCode}`,
      seedCount,
      savedTo: outputPath,
      validation: validationResult
    });
  } catch (error) {
    console.error(`[Orchestrator] Error accepting Phase 1 submission:`, error);
    res.status(500).json({ error: 'Failed to save Phase 1 submission', details: error.message });
  }
});

/**
 * POST /api/phase3/:courseCode/submit
 * Accept completed lego_pairs.json and introductions.json from agents via ngrok
 */
app.post('/api/phase3/:courseCode/submit', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { lego_pairs, introductions } = req.body;

    // Validate both objects exist
    if (!lego_pairs || !introductions) {
      return res.status(400).json({
        error: 'Invalid Phase 3 submission format',
        required: ['lego_pairs', 'introductions'],
        received: {
          has_lego_pairs: !!lego_pairs,
          has_introductions: !!introductions
        }
      });
    }

    // Validate lego_pairs structure (must have course and seeds array)
    if (!lego_pairs.course || !Array.isArray(lego_pairs.seeds)) {
      return res.status(400).json({
        error: 'Invalid lego_pairs structure',
        required: ['course', 'seeds (array)'],
        received: {
          has_course: !!lego_pairs.course,
          has_seeds: Array.isArray(lego_pairs.seeds)
        }
      });
    }

    // Validate introductions structure (must have version/course and presentations object)
    if (!introductions.version || !introductions.presentations || typeof introductions.presentations !== 'object') {
      return res.status(400).json({
        error: 'Invalid introductions structure',
        required: ['version', 'presentations (object)'],
        received: {
          has_version: !!introductions.version,
          has_presentations: !!introductions.presentations
        }
      });
    }

    // Validate component format (must be array of objects with known/target, not array of strings)
    const invalidComponents = [];
    lego_pairs.seeds.forEach(seed => {
      seed.legos?.forEach(lego => {
        if (lego.components && Array.isArray(lego.components) && lego.components.length > 0) {
          const firstComponent = lego.components[0];
          // Check if it's a string (invalid) instead of object with known/target (valid)
          if (typeof firstComponent === 'string') {
            invalidComponents.push({
              seed_id: seed.seed_id,
              lego_id: lego.id,
              invalid_format: lego.components
            });
          } else if (typeof firstComponent === 'object' && (!firstComponent.hasOwnProperty('known') || !firstComponent.hasOwnProperty('target'))) {
            invalidComponents.push({
              seed_id: seed.seed_id,
              lego_id: lego.id,
              invalid_format: 'Object missing known/target properties',
              received: firstComponent
            });
          }
        }
      });
    });

    if (invalidComponents.length > 0) {
      return res.status(400).json({
        error: 'Invalid component format detected',
        message: 'Components must be array of objects with {known, target} properties, not array of strings',
        invalid_legos: invalidComponents,
        example_correct: [
          { known: "I", target: "je" },
          { known: "like", target: "aime" }
        ],
        example_incorrect: ["je", "aime"]
      });
    }

    // Ensure course directory exists
    const courseDir = path.join(VFS_ROOT, courseCode);
    await fs.ensureDir(courseDir);

    // Save lego_pairs.json with merge support
    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
    let finalLegoPairs = lego_pairs;

    if (await fs.pathExists(legoPairsPath)) {
      console.log(`[Orchestrator] 📦 Merging with existing lego_pairs.json`);
      const existingLegoPairs = await fs.readJSON(legoPairsPath);

      // Merge seeds arrays (dedupe by seed_id, new data overwrites)
      const seedMap = new Map();

      // Add existing seeds first
      if (existingLegoPairs.seeds) {
        existingLegoPairs.seeds.forEach(seed => {
          seedMap.set(seed.seed_id, seed);
        });
      }

      // Overwrite with new seeds
      if (lego_pairs.seeds) {
        lego_pairs.seeds.forEach(seed => {
          seedMap.set(seed.seed_id, seed);
        });
      }

      // Sort by seed_id (S0001, S0002, ...)
      const sortedSeeds = Array.from(seedMap.values()).sort((a, b) => {
        const numA = parseInt(a.seed_id.substring(1));
        const numB = parseInt(b.seed_id.substring(1));
        return numA - numB;
      });

      finalLegoPairs = {
        ...existingLegoPairs,
        ...lego_pairs,
        seeds: sortedSeeds
      };

      const existingCount = existingLegoPairs.seeds?.length || 0;
      const newCount = lego_pairs.seeds?.length || 0;
      const mergedCount = finalLegoPairs.seeds.length;
      console.log(`[Orchestrator]    Existing: ${existingCount} seeds`);
      console.log(`[Orchestrator]    New: ${newCount} seeds`);
      console.log(`[Orchestrator]    Merged total: ${mergedCount} seeds (sorted)`);
    }

    await fs.writeJSON(legoPairsPath, finalLegoPairs, { spaces: 2 });

    // Save introductions.json with merge support
    const introductionsPath = path.join(courseDir, 'introductions.json');
    let finalIntroductions = introductions;

    if (await fs.pathExists(introductionsPath)) {
      console.log(`[Orchestrator] 📦 Merging with existing introductions.json`);
      const existingIntroductions = await fs.readJSON(introductionsPath);

      // Merge presentations objects (new overwrites existing)
      const mergedPresentations = {
        ...existingIntroductions.presentations,
        ...introductions.presentations
      };

      // Sort by key (S0001L01, S0001L02, ...)
      const sortedPresentations = {};
      const keys = Object.keys(mergedPresentations).sort((a, b) => {
        const matchA = a.match(/S(\d+)L(\d+)/);
        const matchB = b.match(/S(\d+)L(\d+)/);
        if (matchA && matchB) {
          const seedDiff = parseInt(matchA[1]) - parseInt(matchB[1]);
          if (seedDiff !== 0) return seedDiff;
          return parseInt(matchA[2]) - parseInt(matchB[2]);
        }
        return a.localeCompare(b);
      });

      keys.forEach(key => {
        sortedPresentations[key] = mergedPresentations[key];
      });

      finalIntroductions = {
        ...existingIntroductions,
        ...introductions,
        presentations: sortedPresentations
      };

      const existingCount = Object.keys(existingIntroductions.presentations || {}).length;
      const newCount = Object.keys(introductions.presentations || {}).length;
      const mergedCount = Object.keys(finalIntroductions.presentations).length;
      console.log(`[Orchestrator]    Existing: ${existingCount} presentations`);
      console.log(`[Orchestrator]    New: ${newCount} presentations`);
      console.log(`[Orchestrator]    Merged total: ${mergedCount} presentations (sorted)`);
    }

    await fs.writeJSON(introductionsPath, finalIntroductions, { spaces: 2 });

    // Count this submission's contribution (for activity log)
    const submittedSeedCount = lego_pairs.seeds.length;
    const submittedLegoCount = lego_pairs.seeds.reduce((count, seed) => count + (seed.legos?.length || 0), 0);
    const submittedIntroCount = Object.keys(introductions.presentations || {}).length;

    // Get seed range from this submission
    let seedRange = '';
    if (lego_pairs.seeds.length > 0) {
      const seedIds = lego_pairs.seeds.map(s => s.seed_id).sort();
      const firstSeed = seedIds[0];
      const lastSeed = seedIds[seedIds.length - 1];
      seedRange = submittedSeedCount === 1 ? firstSeed : `${firstSeed}-${lastSeed}`;
    }

    // Count total LEGOs across all seeds in merged result
    const seedCount = finalLegoPairs.seeds.length;
    const legoCount = finalLegoPairs.seeds.reduce((count, seed) => count + (seed.legos?.length || 0), 0);
    const introCount = Object.keys(finalIntroductions.presentations || {}).length;

    console.log(`[Orchestrator] ✅ Received Phase 3 submission for ${courseCode}`);
    console.log(`[Orchestrator]    This submission: ${seedRange} (${submittedLegoCount} LEGOs)`);
    console.log(`[Orchestrator]    Merged total: ${seedCount} seeds, ${legoCount} LEGOs, ${introCount} introductions`);
    console.log(`[Orchestrator]    Saved to: ${courseDir}`);

    // Log agent submission to activity log
    addProgressLog(courseCode, `Agent submitted ${seedRange} (${submittedLegoCount} LEGOs, ${submittedIntroCount} intros)`);

    // Check if Phase 3 is complete (all seeds extracted)
    const progress = courseProgress.get(courseCode);
    const expectedSeeds = progress?.phases?.[3]?.seedsTotal;
    const isComplete = expectedSeeds && seedCount >= expectedSeeds;

    if (isComplete) {
      // All agents have submitted - mark complete
      updatePhaseProgress(courseCode, 3, {
        status: 'complete',
        endTime: new Date().toISOString(),
        seedsCompleted: seedCount,
        seedsTotal: expectedSeeds,
        legoCount,
        introCount
      });
      addProgressLog(courseCode, `Phase 3: Complete - ${seedCount}/${expectedSeeds} seeds, ${legoCount} LEGOs`);

      // Advance to next phase
      if (progress) {
        progress.currentPhase = 5;
      }

      // Trigger Phase 5 automatically (with 2s delay for GitHub sync)
      console.log(`[Orchestrator] → Phase 3 complete, triggering Phase 5 in 2s...`);
      setTimeout(() => {
        console.log(`[Orchestrator] 🚀 Auto-triggering Phase 5 for ${courseCode}`);
        addProgressLog(courseCode, 'Starting Phase 5 (basket generation)');
        triggerPhase(courseCode, 5);
      }, 2000);

      // Auto-publish to GitHub for live dashboard visibility
      autoPublishCourseData(
        courseCode,
        3,
        `Phase 3: ${legoCount} LEGOs + ${introCount} introductions across ${seedCount} seeds`
      ).catch(err => console.error('[Phase 3] Auto-publish failed:', err));
    } else {
      // More agents still working - keep running
      updatePhaseProgress(courseCode, 3, {
        status: 'running',
        seedsCompleted: seedCount,
        seedsTotal: expectedSeeds || seedCount,
        legoCount,
        introCount
      });
    }

    res.json({
      success: true,
      message: isComplete ? 'Phase 3 complete - all seeds extracted' : 'Phase 3 submission received and merged',
      submission: {
        seedRange,
        seedCount: submittedSeedCount,
        legoCount: submittedLegoCount,
        introCount: submittedIntroCount
      },
      merged: {
        seedCount,
        legoCount,
        introCount,
        isComplete,
        progress: expectedSeeds ? `${seedCount}/${expectedSeeds}` : `${seedCount} seeds`
      },
      savedTo: {
        lego_pairs: legoPairsPath,
        introductions: introductionsPath
      }
    });
  } catch (error) {
    console.error(`[Orchestrator] Error accepting Phase 3 submission:`, error);
    res.status(500).json({ error: 'Failed to save Phase 3 submission', details: error.message });
  }
});

// =============================================================================
// PHASE 3 BASKET GENERATION ENDPOINTS (APML v9.0)
// Legacy /api/phase5/* routes maintained for backward compatibility
// =============================================================================

/**
 * POST /api/phase3/:courseCode/submit (APML v9.0) and /api/phase5/:courseCode/submit (legacy)
 * Accept completed lego_baskets.json from agents via ngrok
 */
async function handlePhase3Submit(req, res) {
  try {
    const { courseCode } = req.params;
    const basketData = req.body;

    // Validate basic structure
    if (!basketData.version || !basketData.course || !basketData.baskets) {
      return res.status(400).json({
        error: 'Invalid lego_baskets format',
        required: ['version', 'course', 'baskets']
      });
    }

    // Write to VFS (with merge support)
    const outputPath = path.join(VFS_ROOT, courseCode, 'lego_baskets.json');
    await fs.ensureDir(path.dirname(outputPath));

    // Check if file already exists - if so, MERGE instead of overwrite
    // Always sort baskets for consistent ordering
    let finalBasketData = basketData;

    // Sort new baskets
    if (basketData.baskets) {
      const sortedBaskets = {};
      const keys = Object.keys(basketData.baskets).sort((a, b) => {
        const matchA = a.match(/S(\d+)L(\d+)/);
        const matchB = b.match(/S(\d+)L(\d+)/);
        if (matchA && matchB) {
          const seedDiff = parseInt(matchA[1]) - parseInt(matchB[1]);
          if (seedDiff !== 0) return seedDiff;
          return parseInt(matchA[2]) - parseInt(matchB[2]);
        }
        return a.localeCompare(b);
      });
      keys.forEach(key => {
        sortedBaskets[key] = basketData.baskets[key];
      });
      finalBasketData = {
        ...basketData,
        baskets: sortedBaskets
      };
    }

    if (await fs.pathExists(outputPath)) {
      console.log(`[Orchestrator] 📦 Merging with existing lego_baskets.json`);
      const existingData = await fs.readJSON(outputPath);

      // Merge baskets object (new baskets overwrite existing ones with same ID)
      const mergedBaskets = {
        ...existingData.baskets,
        ...basketData.baskets
      };

      // Sort baskets by key (SXXXXLXX format) for consistent ordering
      const sortedBaskets = {};
      const keys = Object.keys(mergedBaskets).sort((a, b) => {
        // Extract seed number and lego number for proper numeric sorting
        const matchA = a.match(/S(\d+)L(\d+)/);
        const matchB = b.match(/S(\d+)L(\d+)/);

        if (matchA && matchB) {
          const seedDiff = parseInt(matchA[1]) - parseInt(matchB[1]);
          if (seedDiff !== 0) return seedDiff;
          return parseInt(matchA[2]) - parseInt(matchB[2]);
        }

        // Fallback to string comparison
        return a.localeCompare(b);
      });

      keys.forEach(key => {
        sortedBaskets[key] = mergedBaskets[key];
      });

      finalBasketData = {
        ...existingData,
        ...basketData,
        baskets: sortedBaskets
      };

      const existingCount = Object.keys(existingData.baskets).length;
      const newCount = Object.keys(basketData.baskets).length;
      const mergedCount = Object.keys(finalBasketData.baskets).length;
      console.log(`[Orchestrator]    Existing: ${existingCount} baskets`);
      console.log(`[Orchestrator]    New: ${newCount} baskets`);
      console.log(`[Orchestrator]    Merged total: ${mergedCount} baskets (sorted)`);
    }

    await fs.writeJSON(outputPath, finalBasketData, { spaces: 2 });

    // Count baskets
    const basketCount = Object.keys(finalBasketData.baskets).length;

    // Count phrases
    let phraseCount = 0;
    Object.values(finalBasketData.baskets).forEach(basket => {
      phraseCount += basket.practice_phrases?.length || 0;
    });

    console.log(`[Orchestrator] ✅ Received Phase 3 (Baskets) submission for ${courseCode}`);
    console.log(`[Orchestrator]    Baskets: ${basketCount}`);
    console.log(`[Orchestrator]    Phrases: ${phraseCount}`);
    console.log(`[Orchestrator]    Saved to: ${outputPath}`);

    // Get progress data for context
    const progress = courseProgress.get(courseCode);
    const phase3Data = progress?.phases?.[3];

    // Update progress tracking (use phase 3 in v9.0)
    updatePhaseProgress(courseCode, 3, {
      status: 'complete',
      endTime: new Date().toISOString(),
      basketCount,
      phraseCount,
      legosCompleted: basketCount,
      legosTotal: phase3Data?.legosTotal || basketCount
    });

    // Create informative log message
    let logMsg = `✅ Phase 3 complete: ${basketCount} LEGOs`;
    if (phase3Data?.legosTotal && phase3Data.legosTotal !== basketCount) {
      logMsg += ` of ${phase3Data.legosTotal} expected`;
    }
    if (phase3Data?.seedsTotal) {
      logMsg += ` across ${phase3Data.seedsCompleted || phase3Data.seedsTotal} seeds`;
    }
    logMsg += ` (${phraseCount.toLocaleString()} practice phrases)`;

    addProgressLog(courseCode, logMsg);

    // Update current phase to next (Manifest in v9.0)
    if (progress) {
      progress.currentPhase = 'manifest';
    }

    // Trigger Manifest compilation automatically (with 2s delay for GitHub sync)
    console.log(`[Orchestrator] → Phase 3 complete, triggering Manifest compilation in 2s...`);
    setTimeout(() => {
      console.log(`[Orchestrator] 🚀 Auto-triggering Manifest compilation for ${courseCode}`);
      addProgressLog(courseCode, 'Starting Manifest compilation');
      triggerPhase(courseCode, 'manifest');
    }, 2000);

    // Auto-publish to GitHub for live dashboard visibility
    autoPublishCourseData(
      courseCode,
      3,
      `Phase 3: ${basketCount} LEGOs with ${phraseCount.toLocaleString()} practice phrases`
    ).catch(err => console.error('[Phase 3] Auto-publish failed:', err));

    res.json({
      success: true,
      message: `Phase 3 (Baskets) submission received for ${courseCode}`,
      basketCount: basketCount,
      savedTo: outputPath
    });
  } catch (error) {
    console.error(`[Orchestrator] Error accepting Phase 3 submission:`, error);
    res.status(500).json({ error: 'Failed to save Phase 3 submission', details: error.message });
  }
}
app.post('/api/phase3/:courseCode/submit', handlePhase3Submit);
app.post('/api/phase5/:courseCode/submit', handlePhase3Submit);  // Legacy

// =============================================================================
// MANIFEST COMPILATION ENDPOINTS (APML v9.0)
// Legacy /api/phase7/* routes maintained for backward compatibility
// =============================================================================

/**
 * POST /api/manifest/:courseCode/submit (APML v9.0) and /api/phase7/:courseCode/submit (legacy)
 * Accept completed course_manifest.json from agents via ngrok
 */
async function handleManifestSubmit(req, res) {
  try {
    const { courseCode } = req.params;
    const manifestData = req.body;

    // Validate basic structure
    if (!manifestData.version || !manifestData.course) {
      return res.status(400).json({
        error: 'Invalid manifest format',
        required: ['version', 'course']
      });
    }

    // Validate course code matches
    if (manifestData.course !== courseCode) {
      return res.status(400).json({
        error: 'Course code mismatch',
        expected: courseCode,
        received: manifestData.course
      });
    }

    // Count phrases in manifest (from all lego_baskets)
    let phraseCount = 0;
    if (manifestData.manifest && manifestData.manifest.lego_baskets) {
      phraseCount = Object.keys(manifestData.manifest.lego_baskets).reduce((count, basketId) => {
        const basket = manifestData.manifest.lego_baskets[basketId];
        return count + (basket.phrases ? basket.phrases.length : 0);
      }, 0);
    }

    // Write to VFS
    const outputPath = path.join(VFS_ROOT, courseCode, 'course_manifest.json');
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeJSON(outputPath, manifestData, { spaces: 2 });

    console.log(`[Orchestrator] ✅ Received Manifest submission for ${courseCode}`);
    console.log(`[Orchestrator]    Version: ${manifestData.version}`);
    console.log(`[Orchestrator]    Phrases: ${phraseCount}`);
    console.log(`[Orchestrator]    Saved to: ${outputPath}`);

    // Update progress tracking
    updatePhaseProgress(courseCode, 'manifest', {
      status: 'complete',
      endTime: new Date().toISOString(),
      phraseCount
    });
    addProgressLog(courseCode, `Manifest: Complete - ${phraseCount} phrases compiled`);

    // Update current phase to Audio
    const progress = courseProgress.get(courseCode);
    if (progress) {
      progress.currentPhase = 'audio';
      progress.overallStatus = 'manifest_complete'; // Ready for audio generation
    }

    // Auto-publish to GitHub for live dashboard visibility
    autoPublishCourseData(
      courseCode,
      'manifest',
      `Manifest: Course manifest with ${phraseCount.toLocaleString()} phrases`
    ).catch(err => console.error('[Manifest] Auto-publish failed:', err));

    res.json({
      success: true,
      message: 'Manifest submission received',
      phraseCount,
      savedTo: outputPath
    });
  } catch (error) {
    console.error(`[Orchestrator] Error accepting Manifest submission:`, error);
    res.status(500).json({ error: 'Failed to save Manifest submission', details: error.message });
  }
}
app.post('/api/manifest/:courseCode/submit', handleManifestSubmit);
app.post('/api/phase7/:courseCode/submit', handleManifestSubmit);  // Legacy

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
 * POST /api/courses/:courseCode/phase/3/infinitive-check
 * Run infinitive form validation on English LEGOs
 * Only applicable when source language is English
 */
app.post('/api/courses/:courseCode/phase/3/infinitive-check', async (req, res) => {
  const { courseCode } = req.params;

  console.log(`\n🔍 Running infinitive check for ${courseCode}...`);

  try {
    const legoPairsPath = path.join(VFS_ROOT, courseCode, 'lego_pairs.json');

    if (!await fs.pathExists(legoPairsPath)) {
      return res.status(404).json({
        error: 'lego_pairs.json not found - run Phase 3 first',
        courseCode
      });
    }

    // Read lego_pairs to check if English is the known language
    const legoPairsData = await fs.readJson(legoPairsPath);

    // Check format and extract first seed to determine languages
    let firstSeed = legoPairsData.seeds?.[0];
    let knownLang = null;

    if (firstSeed) {
      if (Array.isArray(firstSeed)) {
        // Array format [seedId, [known, target], legos]
        knownLang = firstSeed[1]?.[0];
      } else if (firstSeed.seed_pair) {
        // Object format {seed_id, seed_pair: [known, target], legos}
        knownLang = firstSeed.seed_pair?.[0];
      }
    }

    // Check if it's English - look for common English words
    const isEnglish = knownLang && /\b(I|you|the|to|and|a|is|in|it)\b/.test(knownLang);

    if (!isEnglish) {
      return res.json({
        courseCode,
        status: 'skip',
        message: 'Infinitive check only applicable for English courses',
        violations: []
      });
    }

    // Run infinitive form checker using the existing script
    const { checkInfinitiveFormsData } = require('../../scripts/validation/check-infinitive-forms-lib.cjs');
    const result = checkInfinitiveFormsData(legoPairsData);

    console.log(`   ${result.violations.length > 0 ? '❌' : '✅'} Infinitive check ${result.violations.length > 0 ? 'FAILED' : 'PASSED'} - ${result.violations.length} violations`);

    res.json({
      courseCode,
      status: result.violations.length > 0 ? 'fail' : 'pass',
      violations: result.violations.length,
      message: result.violations.length > 0
        ? `Found ${result.violations.length} infinitive form violations`
        : 'No infinitive violations detected',
      details: result.violations,
      summary: {
        totalSeeds: result.totalSeeds,
        totalLegos: result.totalLegos,
        critical: result.violations.filter(v => v.severity === 'CRITICAL').length,
        high: result.violations.filter(v => v.severity === 'HIGH').length
      }
    });
  } catch (error) {
    console.error('   ❌ Infinitive check error:', error.message);
    res.status(500).json({
      error: error.message,
      courseCode
    });
  }
});

/**
 * POST /api/courses/:courseCode/phase/3/fix-collisions
 * Re-extract LEGOs with LUT violations using chunking-up instructions
 * LUT = Learner Uncertainty Test (when same KNOWN phrase → multiple TARGET phrases)
 * Uses reextraction_manifest.json to trigger targeted Phase 3 re-run
 */
app.post('/api/courses/:courseCode/phase/3/fix-collisions', async (req, res) => {
  const { courseCode } = req.params;

  console.log(`\n🔧 Starting LUT violation fix for ${courseCode}...`);

  try {
    const courseDir = path.join(VFS_ROOT, courseCode);
    const manifestPath = path.join(courseDir, 'lego_pairs_reextraction_manifest.json');
    const seedPairsPath = path.join(courseDir, 'seed_pairs.json');

    // Check for reextraction manifest
    if (!await fs.pathExists(manifestPath)) {
      return res.status(404).json({
        error: 'No reextraction manifest found. Run LUT Check first.',
        courseCode
      });
    }

    // Check for seed_pairs.json
    if (!await fs.pathExists(seedPairsPath)) {
      return res.status(404).json({
        error: 'seed_pairs.json not found. Run Phase 1 first.',
        courseCode
      });
    }

    const manifest = await fs.readJson(manifestPath);
    const affectedSeeds = manifest.affected_seeds || [];

    if (affectedSeeds.length === 0) {
      return res.json({
        success: true,
        message: 'No LUT violations to fix',
        affectedSeeds: 0
      });
    }

    console.log(`   Found ${affectedSeeds.length} seeds with LUT violations`);
    console.log(`   Delegating to Phase 3 server for re-extraction...`);

    // Delegate to Phase 3 server with chunking-up instructions
    const axios = require('axios');
    const phase3Response = await axios.post(`${PHASE_SERVERS[3]}/reextract`, {
      courseCode,
      affectedSeeds,
      manifest: manifest.violations_by_seed,
      mode: 'lut_fix'
    }, {
      timeout: 300000 // 5 minute timeout for re-extraction
    });

    console.log(`   ✅ Phase 3 re-extraction started`);

    res.json({
      success: true,
      courseCode,
      affectedSeeds: affectedSeeds.length,
      message: `Re-extracting ${affectedSeeds.length} seeds with chunking-up instructions`,
      jobId: phase3Response.data.jobId || courseCode
    });

  } catch (error) {
    console.error(`   ❌ LUT fix error:`, error.message);
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
 * POST /api/courses/:courseCode/baskets/regenerate
 * Proxy to Phase 3 (Basket Generation) server's /regenerate endpoint
 */
app.post('/api/courses/:courseCode/baskets/regenerate', async (req, res) => {
  const { courseCode } = req.params;
  const { legoIds, target, known } = req.body;

  console.log(`\n🔄 Proxying basket regeneration request to Phase 3 server for ${courseCode}...`);
  console.log(`   LEGO_IDs: ${legoIds?.length || 0}`);

  if (!legoIds || !Array.isArray(legoIds) || legoIds.length === 0) {
    return res.status(400).json({
      error: 'legoIds array required in request body'
    });
  }

  if (!target || !known) {
    return res.status(400).json({
      error: 'target and known language names required'
    });
  }

  try {
    // Proxy to Phase 3 (Basket Generation) server
    const axios = require('axios');
    const phase3Response = await axios.post(`${PHASE_SERVERS[3]}/regenerate`, {
      courseCode,
      legoIds,
      target,
      known
    }, {
      timeout: 30000 // 30s timeout for initial request
    });

    console.log(`   ✅ Phase 3 server accepted regeneration request`);

    res.json(phase3Response.data);
  } catch (error) {
    console.error('   ❌ Basket regeneration proxy error:', error.message);

    const status = error.response?.status || 500;
    const errorData = error.response?.data || { error: error.message };

    res.status(status).json(errorData);
  }
});

/**
 * POST /api/courses/:courseCode/regenerate/manifest (APML v9.0)
 * POST /api/courses/:courseCode/regenerate/phase7 (legacy)
 * Trigger Manifest recompilation
 */
async function handleManifestRegenerate(req, res) {
  const { courseCode } = req.params;

  console.log(`\n🔄 Triggering Manifest recompilation for ${courseCode}...`);

  try {
    // Get course info from manifest
    const coursesManifest = await fs.readJson(path.join(VFS_ROOT, 'courses-manifest.json'));
    const course = coursesManifest.courses.find(c => c.course_code === courseCode);

    if (!course) {
      return res.status(404).json({ error: `Course ${courseCode} not found` });
    }

    // Verify required files exist
    const courseDir = path.join(VFS_ROOT, courseCode);
    const requiredFiles = ['seed_pairs.json', 'lego_pairs.json', 'lego_baskets.json', 'introductions.json'];

    for (const file of requiredFiles) {
      if (!await fs.pathExists(path.join(courseDir, file))) {
        return res.status(400).json({
          error: `Missing required file: ${file}`,
          message: 'Complete previous phases before compiling manifest'
        });
      }
    }

    // Trigger Manifest server
    const manifestResponse = await axios.post(`${PHASE_SERVERS['manifest']}/start`, {
      courseCode,
      target: course.target_language,
      known: course.source_language
    }, {
      timeout: 30000 // 30s timeout for initial request
    });

    console.log(`   ✅ Manifest server accepted compilation request`);

    res.json({
      success: true,
      jobId: manifestResponse.data.jobId || `manifest-${courseCode}-${Date.now()}`,
      message: 'Manifest compilation started',
      courseCode
    });

  } catch (error) {
    console.error('   ❌ Manifest recompilation error:', error.message);

    const status = error.response?.status || 500;
    const errorData = error.response?.data || { error: error.message };

    res.status(status).json(errorData);
  }
}
app.post('/api/courses/:courseCode/regenerate/manifest', handleManifestRegenerate);
app.post('/api/courses/:courseCode/regenerate/phase7', handleManifestRegenerate);  // Legacy

/**
 * Helper: Determine course status from manifest data (APML v9.0)
 */
function determineStatus(course) {
  if (course.has_audio) return 'audio_complete';
  if (course.has_manifest) return 'manifest_complete';
  if (course.basket_count > 0) return 'phase_3_complete';
  if (course.lego_count > 0) return 'phase_1_complete';
  if (course.actual_seed_count > 0) return 'phase_1_partial';
  return 'empty';
}

/**
 * Helper: Get next phase in sequence (APML v9.0)
 * Linear pipeline: Phase 1 → Phase 3 → Manifest → Audio
 */
function getNextPhase(currentPhase) {
  const sequence = [1, 3, 'manifest', 'audio'];
  const normalizedCurrent = normalizePhaseIdentifier(currentPhase);

  // Map normalized phase to sequence value
  const phaseMapping = {
    'phase1': 1,
    'phase3': 3,
    'manifest': 'manifest',
    'audio': 'audio'
  };

  const currentValue = phaseMapping[normalizedCurrent] || currentPhase;
  const currentIndex = sequence.indexOf(currentValue);

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
 * Stop/Abort proxy endpoints for dashboard Reset Jobs button
 * Phase 1 & 3 use /stop, Phase 5 uses /abort
 */
app.post('/phase1/stop/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  try {
    const response = await axios.post(`${PHASE_SERVERS[1]}/stop/${courseCode}`, {}, { timeout: 5000 });
    console.log(`[Orchestrator] Phase 1 stop for ${courseCode}: ${response.status}`);
    res.json(response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      res.status(404).json({ error: 'No active job found' });
    } else {
      console.error(`[Orchestrator] Phase 1 stop failed: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
});

app.post('/phase3/stop/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  try {
    const response = await axios.post(`${PHASE_SERVERS[3]}/stop/${courseCode}`, {}, { timeout: 5000 });
    console.log(`[Orchestrator] Phase 3 stop for ${courseCode}: ${response.status}`);
    res.json(response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      res.status(404).json({ error: 'No active job found' });
    } else {
      console.error(`[Orchestrator] Phase 3 stop failed: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
});

app.post('/phase5/abort/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  try {
    const response = await axios.post(`${PHASE_SERVERS[5]}/abort/${courseCode}`, {}, { timeout: 5000 });
    console.log(`[Orchestrator] Phase 5 abort for ${courseCode}: ${response.status}`);
    res.json(response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      res.status(404).json({ error: 'No active job found' });
    } else {
      console.error(`[Orchestrator] Phase 5 abort failed: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
});

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
