#!/usr/bin/env node

/**
 * SSi Course Pipeline Server
 *
 * Unified server for course generation pipeline:
 * - Phase 1: Translation + LEGO Extraction (Swarm)
 * - Phase 2: Conflict Resolution (Upchunking Agent)
 * - Phase 3: Basket Generation (existing)
 *
 * Features:
 * - Per-seed POST for granular progress tracking
 * - Real-time progress for dashboard
 * - Script endpoints for instant operations
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3457;
const VFS_ROOT = process.env.VFS_ROOT || path.join(__dirname, '../../public/vfs/courses');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ============================================================================
// IN-MEMORY STATE (for progress tracking)
// ============================================================================

const courseState = new Map();

function getCourseState(courseCode) {
  if (!courseState.has(courseCode)) {
    courseState.set(courseCode, {
      phase1: {
        seeds: new Map(),
        startedAt: null,
        completedAt: null,
        expectedSeeds: 75
      },
      phase2: {
        conflicts: null,
        resolutionsApplied: false
      },
      phase3: {
        baskets: new Map(),
        startedAt: null,
        completedAt: null
      }
    });
  }
  return courseState.get(courseCode);
}

// ============================================================================
// HEALTH & STATUS ENDPOINTS
// ============================================================================

app.get('/health', (req, res) => {
  const courses = {};
  for (const [code, state] of courseState) {
    courses[code] = {
      phase1: {
        seeds: state.phase1.seeds.size,
        expected: state.phase1.expectedSeeds,
        progress: `${state.phase1.seeds.size}/${state.phase1.expectedSeeds}`
      },
      phase2: {
        conflicts: state.phase2.conflicts,
        resolved: state.phase2.resolutionsApplied
      },
      phase3: {
        baskets: state.phase3.baskets.size
      }
    };
  }

  res.json({
    service: 'SSi Pipeline Server',
    status: 'healthy',
    port: PORT,
    vfsRoot: VFS_ROOT,
    activeCourses: courseState.size,
    courses
  });
});

app.get('/courses', async (req, res) => {
  try {
    const dirs = await fs.readdir(VFS_ROOT);
    const courses = [];

    for (const dir of dirs) {
      const coursePath = path.join(VFS_ROOT, dir);
      const stat = await fs.stat(coursePath);
      if (stat.isDirectory()) {
        const files = await fs.readdir(coursePath);
        courses.push({
          code: dir,
          hasSeeds: files.includes('seed_pairs.json') || files.includes('draft_lego_pairs.json'),
          hasLegos: files.includes('lego_pairs.json'),
          hasBaskets: files.includes('lego_baskets.json'),
          hasManifest: files.includes('course_manifest.json')
        });
      }
    }

    res.json({ success: true, data: { courses } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/course/:code/status', (req, res) => {
  const { code } = req.params;
  const state = getCourseState(code);

  const phase1Seeds = Array.from(state.phase1.seeds.keys()).sort();
  const lastSeed = phase1Seeds[phase1Seeds.length - 1] || null;

  res.json({
    success: true,
    data: {
      course: code,
      phase1: {
        completed: state.phase1.seeds.size,
        expected: state.phase1.expectedSeeds,
        progress: ((state.phase1.seeds.size / state.phase1.expectedSeeds) * 100).toFixed(1) + '%',
        lastSeed,
        startedAt: state.phase1.startedAt,
        completedAt: state.phase1.completedAt
      },
      phase2: {
        conflicts: state.phase2.conflicts,
        resolved: state.phase2.resolutionsApplied
      },
      phase3: {
        baskets: state.phase3.baskets.size,
        startedAt: state.phase3.startedAt
      }
    }
  });
});

// ============================================================================
// PHASE 1: TRANSLATION + LEGO EXTRACTION (per-seed)
// ============================================================================

/**
 * POST /upload-seed
 * Receives a single seed from swarm agents
 */
app.post('/upload-seed', async (req, res) => {
  try {
    const { course, seed, agentId } = req.body;

    if (!course || !seed || !seed.seed_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: course, seed, seed.seed_id'
      });
    }

    const state = getCourseState(course);

    // Start timer on first seed
    if (!state.phase1.startedAt) {
      state.phase1.startedAt = new Date().toISOString();
    }

    // Store seed in memory
    state.phase1.seeds.set(seed.seed_id, {
      ...seed,
      receivedAt: new Date().toISOString(),
      agentId
    });

    // Also persist to disk (individual file for safety)
    const courseDir = path.join(VFS_ROOT, course, 'seeds');
    await fs.ensureDir(courseDir);
    await fs.writeJson(
      path.join(courseDir, `${seed.seed_id}.json`),
      { ...seed, agentId, receivedAt: new Date().toISOString() },
      { spaces: 2 }
    );

    const completed = state.phase1.seeds.size;
    const expected = state.phase1.expectedSeeds;

    console.log(`[Phase 1] ${course}: ${seed.seed_id} received (${completed}/${expected}) from ${agentId || 'unknown'}`);

    // Check if complete
    if (completed >= expected && !state.phase1.completedAt) {
      state.phase1.completedAt = new Date().toISOString();
      console.log(`[Phase 1] ${course}: COMPLETE! All ${expected} seeds received.`);
    }

    res.json({
      success: true,
      data: {
        seedId: seed.seed_id,
        completed,
        expected,
        progress: ((completed / expected) * 100).toFixed(1) + '%',
        isComplete: completed >= expected
      }
    });

  } catch (err) {
    console.error('[Phase 1] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /upload-batch (backward compatibility)
 * Receives a batch of seeds, processes them individually
 */
app.post('/upload-batch', async (req, res) => {
  try {
    const { course, seeds, agentId, browserId } = req.body;

    if (!course || !seeds || !Array.isArray(seeds)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: course, seeds[]'
      });
    }

    const state = getCourseState(course);
    const agent = agentId || `${browserId}.x`;

    // Start timer on first batch
    if (!state.phase1.startedAt) {
      state.phase1.startedAt = new Date().toISOString();
    }

    // Process each seed
    for (const seed of seeds) {
      state.phase1.seeds.set(seed.seed_id, {
        ...seed,
        receivedAt: new Date().toISOString(),
        agentId: agent
      });
    }

    // Persist batch to disk
    const batchDir = path.join(VFS_ROOT, course, 'batch_outputs');
    await fs.ensureDir(batchDir);
    const batchFile = `batch_${agent}_${Date.now()}.json`;
    await fs.writeJson(
      path.join(batchDir, batchFile),
      { course, agentId: agent, seeds, receivedAt: new Date().toISOString() },
      { spaces: 2 }
    );

    const completed = state.phase1.seeds.size;
    const expected = state.phase1.expectedSeeds;

    console.log(`[Phase 1] ${course}: Batch ${agent} received (${seeds.length} seeds, total ${completed}/${expected})`);

    res.json({
      success: true,
      data: {
        batchFile,
        seedsReceived: seeds.length,
        completed,
        expected,
        progress: ((completed / expected) * 100).toFixed(1) + '%'
      }
    });

  } catch (err) {
    console.error('[Phase 1] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /phase1/merge
 * Script: Merge all seeds → draft_lego_pairs.json
 */
app.post('/phase1/merge', async (req, res) => {
  try {
    const { course } = req.body;

    if (!course) {
      return res.status(400).json({ success: false, error: 'Missing course' });
    }

    const state = getCourseState(course);
    const seeds = Array.from(state.phase1.seeds.values())
      .sort((a, b) => a.seed_id.localeCompare(b.seed_id));

    if (seeds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No seeds to merge. Run Phase 1 swarm first.'
      });
    }

    // Count LEGOs
    let totalLegos = 0;
    for (const seed of seeds) {
      totalLegos += (seed.legos || []).length;
    }

    // Write draft_lego_pairs.json
    const output = {
      course,
      generated: new Date().toISOString(),
      phase: 'draft',
      totalSeeds: seeds.length,
      totalLegos,
      seeds
    };

    const outPath = path.join(VFS_ROOT, course, 'draft_lego_pairs.json');
    await fs.writeJson(outPath, output, { spaces: 2 });

    console.log(`[Phase 1] ${course}: Merged ${seeds.length} seeds → draft_lego_pairs.json`);

    res.json({
      success: true,
      data: {
        file: 'draft_lego_pairs.json',
        totalSeeds: seeds.length,
        totalLegos,
        message: 'Ready for Phase 2 conflict detection'
      }
    });

  } catch (err) {
    console.error('[Phase 1 Merge] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// PHASE 2: CONFLICT RESOLUTION
// ============================================================================

/**
 * POST /phase2/detect
 * Script: Analyze draft_lego_pairs.json for conflicts
 */
app.post('/phase2/detect', async (req, res) => {
  try {
    const { course } = req.body;

    if (!course) {
      return res.status(400).json({ success: false, error: 'Missing course' });
    }

    const draftPath = path.join(VFS_ROOT, course, 'draft_lego_pairs.json');

    if (!await fs.pathExists(draftPath)) {
      return res.status(400).json({
        success: false,
        error: 'draft_lego_pairs.json not found. Run /phase1/merge first.'
      });
    }

    const data = await fs.readJson(draftPath);
    const seeds = data.seeds || [];

    // Group LEGOs by KNOWN
    const knownToTargets = new Map();
    let totalLegos = 0;

    for (const seed of seeds) {
      for (const lego of seed.legos || []) {
        totalLegos++;
        const known = lego.lego.known.toLowerCase().trim();
        if (!knownToTargets.has(known)) {
          knownToTargets.set(known, new Set());
        }
        knownToTargets.get(known).add(lego.lego.target);
      }
    }

    // Find conflicts
    const conflicts = [];
    for (const [known, targets] of knownToTargets) {
      if (targets.size > 1) {
        conflicts.push({
          known,
          targets: Array.from(targets)
        });
      }
    }

    // Update state
    const state = getCourseState(course);
    state.phase2.conflicts = conflicts.length;

    // Write conflict report
    const report = {
      course,
      generated: new Date().toISOString(),
      stats: {
        totalSeeds: seeds.length,
        totalLegos,
        uniqueKnown: knownToTargets.size,
        conflicts: conflicts.length,
        conflictRate: ((conflicts.length / knownToTargets.size) * 100).toFixed(1) + '%'
      },
      conflicts
    };

    await fs.writeJson(
      path.join(VFS_ROOT, course, 'conflict_report.json'),
      report,
      { spaces: 2 }
    );

    console.log(`[Phase 2] ${course}: ${conflicts.length} conflicts detected (${report.stats.conflictRate})`);

    // If no conflicts, auto-promote to lego_pairs.json
    if (conflicts.length === 0) {
      await fs.copy(draftPath, path.join(VFS_ROOT, course, 'lego_pairs.json'));
      state.phase2.resolutionsApplied = true;

      return res.json({
        success: true,
        data: {
          conflicts: 0,
          message: 'No conflicts! draft_lego_pairs.json promoted to lego_pairs.json',
          ready: 'phase3'
        }
      });
    }

    res.json({
      success: true,
      data: {
        conflicts: conflicts.length,
        conflictRate: report.stats.conflictRate,
        reportFile: 'conflict_report.json',
        message: 'Run upchunking agent, then POST /phase2/apply'
      }
    });

  } catch (err) {
    console.error('[Phase 2 Detect] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /phase2/apply
 * Script: Apply upchunk_resolutions.json → lego_pairs.json
 */
app.post('/phase2/apply', async (req, res) => {
  try {
    const { course } = req.body;

    if (!course) {
      return res.status(400).json({ success: false, error: 'Missing course' });
    }

    const draftPath = path.join(VFS_ROOT, course, 'draft_lego_pairs.json');
    const resPath = path.join(VFS_ROOT, course, 'upchunk_resolutions.json');

    if (!await fs.pathExists(draftPath)) {
      return res.status(400).json({ success: false, error: 'draft_lego_pairs.json not found' });
    }

    if (!await fs.pathExists(resPath)) {
      return res.status(400).json({
        success: false,
        error: 'upchunk_resolutions.json not found. Run upchunking agent first.'
      });
    }

    const draft = await fs.readJson(draftPath);
    const resolutions = await fs.readJson(resPath);

    // Build canonical lookup
    const canonicalForms = new Map();
    const newMTypes = [];

    for (const res of resolutions.resolutions || []) {
      if (res.canonical) {
        canonicalForms.set(res.conflict.toLowerCase(), res.canonical.target);
      }
      for (const upchunk of res.upchunks || []) {
        newMTypes.push({ ...upchunk, source: 'phase2_upchunk' });
      }
    }

    // Apply normalizations
    let capitalNormalized = 0;
    let canonicalApplied = 0;

    for (const seed of draft.seeds) {
      for (const lego of seed.legos || []) {
        // Auto-normalize capitalization
        const target = lego.lego.target;
        if (target && target[0] === target[0].toUpperCase() && target[0] !== target[0].toLowerCase()) {
          lego.lego.target = target[0].toLowerCase() + target.slice(1);
          capitalNormalized++;
        }

        // Apply canonical forms
        const known = lego.lego.known.toLowerCase();
        if (canonicalForms.has(known)) {
          const canonical = canonicalForms.get(known);
          if (lego.lego.target !== canonical) {
            lego.lego.target = canonical;
            canonicalApplied++;
          }
        }
      }
    }

    // Add metadata
    draft.phase = 'final';
    draft.phase2Applied = new Date().toISOString();
    draft.upchunked_mtypes = newMTypes;

    // Write final lego_pairs.json
    const outPath = path.join(VFS_ROOT, course, 'lego_pairs.json');
    await fs.writeJson(outPath, draft, { spaces: 2 });

    // Update state
    const state = getCourseState(course);
    state.phase2.resolutionsApplied = true;

    console.log(`[Phase 2] ${course}: Applied resolutions → lego_pairs.json`);

    res.json({
      success: true,
      data: {
        capitalNormalized,
        canonicalApplied,
        mTypesAdded: newMTypes.length,
        file: 'lego_pairs.json',
        message: 'Ready for Phase 3 basket generation'
      }
    });

  } catch (err) {
    console.error('[Phase 2 Apply] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// PHASE 3: BASKET GENERATION (placeholder - existing server handles this)
// ============================================================================

/**
 * POST /upload-basket
 * Receives a single basket from basket agents
 */
app.post('/upload-basket', async (req, res) => {
  try {
    const { course, basket, agentId } = req.body;

    if (!course || !basket) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: course, basket'
      });
    }

    const state = getCourseState(course);

    if (!state.phase3.startedAt) {
      state.phase3.startedAt = new Date().toISOString();
    }

    const basketId = basket.basket_id || basket.id || `basket_${Date.now()}`;
    state.phase3.baskets.set(basketId, {
      ...basket,
      receivedAt: new Date().toISOString(),
      agentId
    });

    // Persist
    const basketDir = path.join(VFS_ROOT, course, 'baskets');
    await fs.ensureDir(basketDir);
    await fs.writeJson(
      path.join(basketDir, `${basketId}.json`),
      basket,
      { spaces: 2 }
    );

    console.log(`[Phase 3] ${course}: ${basketId} received (total: ${state.phase3.baskets.size})`);

    res.json({
      success: true,
      data: {
        basketId,
        totalBaskets: state.phase3.baskets.size
      }
    });

  } catch (err) {
    console.error('[Phase 3] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

/**
 * POST /reset-course
 * Clear in-memory state for a course (for re-runs)
 */
app.post('/reset-course', (req, res) => {
  const { course, phase } = req.body;

  if (!course) {
    return res.status(400).json({ success: false, error: 'Missing course' });
  }

  const state = getCourseState(course);

  if (!phase || phase === 1) {
    state.phase1.seeds.clear();
    state.phase1.startedAt = null;
    state.phase1.completedAt = null;
  }

  if (!phase || phase === 2) {
    state.phase2.conflicts = null;
    state.phase2.resolutionsApplied = false;
  }

  if (!phase || phase === 3) {
    state.phase3.baskets.clear();
    state.phase3.startedAt = null;
  }

  console.log(`[Reset] ${course}: Phase ${phase || 'all'} state cleared`);

  res.json({ success: true, message: `Reset ${course} phase ${phase || 'all'}` });
});

/**
 * POST /set-expected-seeds
 * Configure expected seed count for a course
 */
app.post('/set-expected-seeds', (req, res) => {
  const { course, count } = req.body;

  if (!course || !count) {
    return res.status(400).json({ success: false, error: 'Missing course or count' });
  }

  const state = getCourseState(course);
  state.phase1.expectedSeeds = count;

  res.json({ success: true, message: `${course}: Expected seeds set to ${count}` });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              SSi COURSE PIPELINE SERVER                        ║
╠════════════════════════════════════════════════════════════════╣
║  Port:     ${String(PORT).padEnd(49)}║
║  VFS:      ${VFS_ROOT.slice(-48).padEnd(49)}║
║                                                                ║
║  Endpoints:                                                    ║
║    GET  /health              - Server status                   ║
║    GET  /courses             - List courses                    ║
║    GET  /course/:code/status - Course progress                 ║
║                                                                ║
║  Phase 1 (Swarm):                                              ║
║    POST /upload-seed         - Single seed from agent          ║
║    POST /upload-batch        - Batch (backward compat)         ║
║    POST /phase1/merge        - Merge → draft_lego_pairs        ║
║                                                                ║
║  Phase 2 (Conflicts):                                          ║
║    POST /phase2/detect       - Analyze conflicts               ║
║    POST /phase2/apply        - Apply resolutions               ║
║                                                                ║
║  Phase 3 (Baskets):                                            ║
║    POST /upload-basket       - Single basket from agent        ║
║                                                                ║
║  Utilities:                                                    ║
║    POST /reset-course        - Clear state for re-run          ║
║    POST /set-expected-seeds  - Configure seed count            ║
╚════════════════════════════════════════════════════════════════╝
`);
});

module.exports = app;
