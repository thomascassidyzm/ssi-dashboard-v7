#!/usr/bin/env node

/**
 * Unified Progress Tracker API
 *
 * Provides a single endpoint to query progress across all phases
 * for real-time dashboard monitoring.
 *
 * Endpoints:
 * - GET /api/progress/:course - Get progress for all phases
 * - GET /api/progress/:course/:phase - Get progress for specific phase
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3462;
const VFS_ROOT = process.env.VFS_ROOT || path.join(__dirname, '../../public/vfs/courses');

/**
 * Get Phase 1 progress (seed_pairs.json)
 */
async function getPhase1Progress(courseDir) {
  const seedPairsPath = path.join(courseDir, 'seed_pairs.json');

  if (!await fs.pathExists(seedPairsPath)) {
    return {
      phase: 'phase1',
      complete: false,
      totalSeeds: 0,
      progress: 0
    };
  }

  const seedPairs = await fs.readJson(seedPairsPath);
  const totalSeeds = seedPairs.seeds?.length || 0;

  return {
    phase: 'phase1',
    complete: totalSeeds > 0,
    totalSeeds,
    progress: totalSeeds > 0 ? 100 : 0,
    lastGenerated: seedPairs.metadata?.generated_at
  };
}

/**
 * Get Phase 3 progress (lego_pairs.json)
 */
async function getPhase3Progress(courseDir) {
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
  const seedPairsPath = path.join(courseDir, 'seed_pairs.json');

  if (!await fs.pathExists(legoPairsPath)) {
    return {
      phase: 'phase3',
      complete: false,
      totalLegos: 0,
      totalSeeds: 0,
      expectedSeeds: 0,
      progress: 0
    };
  }

  const legoPairs = await fs.readJson(legoPairsPath);
  const totalLegos = legoPairs.seeds.reduce((sum, seed) => sum + seed.legos.length, 0);
  const totalSeeds = legoPairs.seeds.length;

  let expectedSeeds = totalSeeds;
  if (await fs.pathExists(seedPairsPath)) {
    const seedPairs = await fs.readJson(seedPairsPath);
    expectedSeeds = seedPairs.seeds?.length || totalSeeds;
  }

  const complete = totalSeeds >= expectedSeeds;
  const progress = expectedSeeds > 0 ? Math.round((totalSeeds / expectedSeeds) * 10000) / 100 : 0;

  return {
    phase: 'phase3',
    complete,
    totalLegos,
    totalSeeds,
    expectedSeeds,
    progress,
    lastGenerated: legoPairs.metadata?.generated_at || legoPairs.metadata?.last_merged
  };
}

/**
 * Get Phase 5 progress (lego_baskets.json)
 */
async function getPhase5Progress(courseDir) {
  const legoBasketsPath = path.join(courseDir, 'lego_baskets.json');
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');

  if (!await fs.pathExists(legoBasketsPath)) {
    return {
      phase: 'phase5',
      complete: false,
      totalBaskets: 0,
      totalNeeded: 0,
      missing: 0,
      progress: 0
    };
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
  const complete = missing === 0 && totalBaskets > 0;

  // Recent activity
  const recentUploads = (legoBaskets.metadata?.uploads || []).slice(-5).reverse();
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  const activeAgents = new Set();
  (legoBaskets.metadata?.uploads || []).forEach(upload => {
    if (new Date(upload.timestamp).getTime() > fiveMinutesAgo) {
      activeAgents.add(upload.agentId);
    }
  });

  return {
    phase: 'phase5',
    complete,
    totalBaskets,
    totalNeeded,
    missing,
    progress,
    lastUpload: legoBaskets.metadata?.last_upload,
    lastSeed: legoBaskets.metadata?.last_seed,
    lastAgent: legoBaskets.metadata?.last_agent,
    activeAgents: Array.from(activeAgents),
    recentUploads: recentUploads.map(u => ({
      timestamp: u.timestamp,
      seed: u.seed,
      agentId: u.agentId,
      legosAdded: u.legosAdded
    }))
  };
}

/**
 * Get Phase 6 progress (introductions.json)
 */
async function getPhase6Progress(courseDir) {
  const introductionsPath = path.join(courseDir, 'introductions.json');
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');

  if (!await fs.pathExists(introductionsPath)) {
    return {
      phase: 'phase6',
      complete: false,
      totalIntroductions: 0,
      totalNeeded: 0,
      progress: 0
    };
  }

  const introductions = await fs.readJson(introductionsPath);
  const totalIntroductions = Object.keys(introductions.introductions || {}).length;

  let totalNeeded = 0;
  if (await fs.pathExists(legoPairsPath)) {
    const legoPairs = await fs.readJson(legoPairsPath);
    legoPairs.seeds.forEach(seed => {
      seed.legos.forEach(lego => {
        if (lego.new === true) totalNeeded++;
      });
    });
  }

  const missing = Math.max(0, totalNeeded - totalIntroductions);
  const progress = totalNeeded > 0 ? Math.round((totalIntroductions / totalNeeded) * 10000) / 100 : 0;
  const complete = missing === 0 && totalIntroductions > 0;

  return {
    phase: 'phase6',
    complete,
    totalIntroductions,
    totalNeeded,
    missing,
    progress,
    lastGenerated: introductions.metadata?.generated_at
  };
}

/**
 * Get Phase 7 progress (course manifest)
 */
async function getPhase7Progress(courseDir) {
  const manifestPath = path.join(courseDir, 'course-manifest.json');

  if (!await fs.pathExists(manifestPath)) {
    return {
      phase: 'phase7',
      complete: false,
      progress: 0
    };
  }

  const manifest = await fs.readJson(manifestPath);
  const totalLessons = manifest.lessons?.length || 0;

  return {
    phase: 'phase7',
    complete: totalLessons > 0,
    totalLessons,
    progress: totalLessons > 0 ? 100 : 0,
    lastGenerated: manifest.metadata?.generated_at
  };
}

/**
 * GET /api/progress/:course - Get progress for all phases
 */
app.get('/api/progress/:course', async (req, res) => {
  try {
    const { course } = req.params;
    const courseDir = path.join(VFS_ROOT, course);

    if (!await fs.pathExists(courseDir)) {
      return res.status(404).json({
        success: false,
        error: `Course not found: ${course}`
      });
    }

    const [phase1, phase3, phase5, phase6, phase7] = await Promise.all([
      getPhase1Progress(courseDir),
      getPhase3Progress(courseDir),
      getPhase5Progress(courseDir),
      getPhase6Progress(courseDir),
      getPhase7Progress(courseDir)
    ]);

    // Calculate overall progress
    const phases = [phase1, phase3, phase5, phase6, phase7];
    const completedPhases = phases.filter(p => p.complete).length;
    const overallProgress = Math.round((completedPhases / phases.length) * 100);

    res.json({
      success: true,
      course,
      overallProgress,
      completedPhases,
      totalPhases: phases.length,
      phases: {
        phase1,
        phase3,
        phase5,
        phase6,
        phase7
      }
    });

  } catch (error) {
    console.error('Progress API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/progress/:course/:phase - Get progress for specific phase
 */
app.get('/api/progress/:course/:phase', async (req, res) => {
  try {
    const { course, phase } = req.params;
    const courseDir = path.join(VFS_ROOT, course);

    if (!await fs.pathExists(courseDir)) {
      return res.status(404).json({
        success: false,
        error: `Course not found: ${course}`
      });
    }

    let phaseData;
    switch (phase) {
      case 'phase1':
        phaseData = await getPhase1Progress(courseDir);
        break;
      case 'phase3':
        phaseData = await getPhase3Progress(courseDir);
        break;
      case 'phase5':
        phaseData = await getPhase5Progress(courseDir);
        break;
      case 'phase6':
        phaseData = await getPhase6Progress(courseDir);
        break;
      case 'phase7':
        phaseData = await getPhase7Progress(courseDir);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Invalid phase: ${phase}. Must be phase1, phase3, phase5, phase6, or phase7`
        });
    }

    res.json({
      success: true,
      course,
      ...phaseData
    });

  } catch (error) {
    console.error('Progress API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /health - Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Progress Tracker API',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log('');
  console.log(`✅ Progress Tracker API listening on port ${PORT}`);
  console.log(`   VFS Root: ${VFS_ROOT}`);
  console.log('');
  console.log(`📊 Endpoints:`);
  console.log(`   GET http://localhost:${PORT}/api/progress/:course`);
  console.log(`   GET http://localhost:${PORT}/api/progress/:course/:phase`);
  console.log(`   GET http://localhost:${PORT}/health`);
  console.log('');
});

module.exports = app;
