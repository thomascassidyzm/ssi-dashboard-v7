#!/usr/bin/env node

/**
 * Course Analyzer - Smart Completeness Checking
 *
 * Validates course completeness with intelligent cross-referencing:
 * - Phase 1: Must have exactly 668 seed pairs
 * - Phase 3: Just validates existence (de-duplication makes count unreliable)
 * - Phase 5: Every LEGO from lego_pairs must have a basket
 * - Phase 6: Every LEGO from lego_pairs must have an introduction
 *
 * Usage:
 *   node course-analyzer.cjs <courseCode> [vfsRoot]
 *   node course-analyzer.cjs spa_for_eng
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Analyze a course for completeness
 */
async function analyzeCourse(courseCode, vfsRoot) {
  const coursePath = path.join(vfsRoot, courseCode);

  if (!await fs.pathExists(coursePath)) {
    throw new Error(`Course not found: ${courseCode}`);
  }

  console.log(`\n🔍 Analyzing course: ${courseCode}`);
  console.log(`📁 Path: ${coursePath}\n`);

  const analysis = {
    courseCode,
    timestamp: new Date().toISOString(),
    phases: {},
    summary: {
      complete: true,
      totalIssues: 0
    }
  };

  // ============================================================================
  // PHASE 1: Seed Pairs (Absolute requirement: 668 seeds)
  // ============================================================================

  const seedPairsPath = path.join(coursePath, 'seed_pairs.json');
  const phase1 = {
    name: 'Phase 1: Seed Pairs',
    file: 'seed_pairs.json',
    exists: await fs.pathExists(seedPairsPath),
    complete: false,
    required: 668,
    found: 0,
    missing: [],
    issues: []
  };

  if (phase1.exists) {
    try {
      const seedPairsData = await fs.readJson(seedPairsPath);
      const translations = seedPairsData.translations || {};
      const seedIds = Object.keys(translations);

      phase1.found = seedIds.length;

      // Check for all 668 seeds
      const missingSeedIds = [];
      for (let i = 1; i <= 668; i++) {
        const seedId = `S${String(i).padStart(4, '0')}`;
        if (!translations[seedId]) {
          missingSeedIds.push(seedId);
        }
      }

      phase1.missing = missingSeedIds;
      phase1.complete = missingSeedIds.length === 0;

      if (!phase1.complete) {
        phase1.issues.push({
          severity: 'error',
          message: `Missing ${missingSeedIds.length} seed pairs`,
          count: missingSeedIds.length,
          samples: missingSeedIds.slice(0, 10)
        });
      }

    } catch (error) {
      phase1.issues.push({
        severity: 'error',
        message: `Invalid JSON: ${error.message}`
      });
    }
  } else {
    phase1.issues.push({
      severity: 'error',
      message: 'File does not exist'
    });
  }

  analysis.phases.phase_1 = phase1;
  if (!phase1.complete) {
    analysis.summary.complete = false;
    analysis.summary.totalIssues += phase1.issues.length;
  }

  // ============================================================================
  // PHASE 3: LEGO Pairs (Just validate existence - de-duplication makes count unreliable)
  // ============================================================================

  const legoPairsPath = path.join(coursePath, 'lego_pairs.json');
  const phase3 = {
    name: 'Phase 3: LEGO Pairs',
    file: 'lego_pairs.json',
    exists: await fs.pathExists(legoPairsPath),
    complete: false,
    totalLegos: 0,
    legoIds: [],
    issues: []
  };

  let legoIds = [];

  if (phase3.exists) {
    try {
      const legoPairsData = await fs.readJson(legoPairsPath);

      // Support both v8.1.1 (seeds array) and legacy (lego_pairs object) formats
      if (legoPairsData.seeds && Array.isArray(legoPairsData.seeds)) {
        // New format: seeds array
        for (const seed of legoPairsData.seeds) {
          if (seed.legos && Array.isArray(seed.legos)) {
            for (const lego of seed.legos) {
              if (lego.lego_id) {
                legoIds.push(lego.lego_id);
              }
            }
          }
        }
      } else if (legoPairsData.lego_pairs) {
        // Old format: lego_pairs object
        legoIds = Object.keys(legoPairsData.lego_pairs);
      }

      phase3.totalLegos = legoIds.length;
      phase3.legoIds = legoIds;
      phase3.complete = legoIds.length > 0;

      if (legoIds.length === 0) {
        phase3.issues.push({
          severity: 'error',
          message: 'No LEGOs found in file'
        });
      }

    } catch (error) {
      phase3.issues.push({
        severity: 'error',
        message: `Invalid JSON: ${error.message}`
      });
    }
  } else {
    phase3.issues.push({
      severity: 'error',
      message: 'File does not exist'
    });
  }

  analysis.phases.phase_3 = phase3;
  if (!phase3.complete) {
    analysis.summary.complete = false;
    analysis.summary.totalIssues += phase3.issues.length;
  }

  // ============================================================================
  // PHASE 5: LEGO Baskets (Cross-reference with Phase 3 LEGOs)
  // ============================================================================

  const legoBasketsPath = path.join(coursePath, 'lego_baskets.json');
  const phase5 = {
    name: 'Phase 5: LEGO Baskets',
    file: 'lego_baskets.json',
    exists: await fs.pathExists(legoBasketsPath),
    complete: false,
    required: phase3.totalLegos,
    found: 0,
    missing: [],
    issues: []
  };

  if (phase5.exists && legoIds.length > 0) {
    try {
      const legoBasketsData = await fs.readJson(legoBasketsPath);
      const baskets = legoBasketsData.baskets || {};
      const basketLegoIds = Object.keys(baskets);

      phase5.found = basketLegoIds.length;

      // Cross-reference: Find LEGOs from phase3 that don't have baskets
      const missingBasketIds = [];
      for (const legoId of legoIds) {
        if (!baskets[legoId]) {
          missingBasketIds.push(legoId);
        }
      }

      phase5.missing = missingBasketIds;
      phase5.complete = missingBasketIds.length === 0;

      if (!phase5.complete) {
        phase5.issues.push({
          severity: 'error',
          message: `Missing ${missingBasketIds.length} baskets`,
          count: missingBasketIds.length,
          samples: missingBasketIds.slice(0, 10)
        });
      }

    } catch (error) {
      phase5.issues.push({
        severity: 'error',
        message: `Invalid JSON: ${error.message}`
      });
    }
  } else if (!phase5.exists) {
    phase5.issues.push({
      severity: 'error',
      message: 'File does not exist'
    });
  } else if (legoIds.length === 0) {
    phase5.issues.push({
      severity: 'warning',
      message: 'Cannot validate: Phase 3 has no LEGOs'
    });
  }

  analysis.phases.phase_5 = phase5;
  if (!phase5.complete && phase5.exists) {
    analysis.summary.complete = false;
    analysis.summary.totalIssues += phase5.issues.length;
  }

  // ============================================================================
  // PHASE 6: Introductions (Cross-reference with Phase 3 LEGOs)
  // ============================================================================

  const introductionsPath = path.join(coursePath, 'introductions.json');
  const phase6 = {
    name: 'Phase 6: Introductions',
    file: 'introductions.json',
    exists: await fs.pathExists(introductionsPath),
    complete: false,
    required: phase3.totalLegos,
    found: 0,
    missing: [],
    issues: []
  };

  if (phase6.exists && legoIds.length > 0) {
    try {
      const introductionsData = await fs.readJson(introductionsPath);
      const introductions = introductionsData.introductions || {};
      const introLegoIds = Object.keys(introductions);

      phase6.found = introLegoIds.length;

      // Cross-reference: Find LEGOs from phase3 that don't have introductions
      const missingIntroIds = [];
      for (const legoId of legoIds) {
        if (!introductions[legoId]) {
          missingIntroIds.push(legoId);
        }
      }

      phase6.missing = missingIntroIds;
      phase6.complete = missingIntroIds.length === 0;

      if (!phase6.complete) {
        phase6.issues.push({
          severity: 'error',
          message: `Missing ${missingIntroIds.length} introductions`,
          count: missingIntroIds.length,
          samples: missingIntroIds.slice(0, 10)
        });
      }

    } catch (error) {
      phase6.issues.push({
        severity: 'error',
        message: `Invalid JSON: ${error.message}`
      });
    }
  } else if (!phase6.exists) {
    phase6.issues.push({
      severity: 'warning',
      message: 'File does not exist (optional phase)'
    });
  } else if (legoIds.length === 0) {
    phase6.issues.push({
      severity: 'warning',
      message: 'Cannot validate: Phase 3 has no LEGOs'
    });
  }

  analysis.phases.phase_6 = phase6;
  // Phase 6 is optional, so don't fail overall completeness

  return analysis;
}

/**
 * Print analysis results to console
 */
function printAnalysis(analysis) {
  console.log('='.repeat(80));
  console.log(`COURSE ANALYSIS: ${analysis.courseCode}`);
  console.log('='.repeat(80));
  console.log('');

  for (const [phaseKey, phase] of Object.entries(analysis.phases)) {
    const statusIcon = phase.complete ? '✅' : '❌';
    console.log(`${statusIcon} ${phase.name}`);
    console.log(`   File: ${phase.file} ${phase.exists ? '(exists)' : '(MISSING)'}`);

    if (phase.required !== undefined) {
      console.log(`   Required: ${phase.required}`);
      console.log(`   Found: ${phase.found}`);
      if (phase.missing && phase.missing.length > 0) {
        console.log(`   Missing: ${phase.missing.length} items`);
        if (phase.missing.length <= 10) {
          console.log(`   → ${phase.missing.join(', ')}`);
        } else {
          console.log(`   → ${phase.missing.slice(0, 10).join(', ')} ... (${phase.missing.length - 10} more)`);
        }
      }
    } else if (phase.totalLegos !== undefined) {
      console.log(`   Total LEGOs: ${phase.totalLegos}`);
    }

    if (phase.issues && phase.issues.length > 0) {
      for (const issue of phase.issues) {
        const icon = issue.severity === 'error' ? '🔴' : '⚠️';
        console.log(`   ${icon} ${issue.message}`);
      }
    }

    console.log('');
  }

  console.log('='.repeat(80));
  console.log(`SUMMARY: ${analysis.summary.complete ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
  console.log(`Total Issues: ${analysis.summary.totalIssues}`);
  console.log('='.repeat(80));
  console.log('');
}

/**
 * Export for use as module
 */
module.exports = {
  analyzeCourse,
  printAnalysis
};

/**
 * CLI usage
 */
if (require.main === module) {
  const courseCode = process.argv[2];
  const vfsRoot = process.argv[3] || path.join(__dirname, 'public/vfs/courses');

  if (!courseCode) {
    console.error('Usage: node course-analyzer.cjs <courseCode> [vfsRoot]');
    console.error('Example: node course-analyzer.cjs spa_for_eng');
    process.exit(1);
  }

  analyzeCourse(courseCode, vfsRoot)
    .then(analysis => {
      printAnalysis(analysis);

      // Exit with error code if incomplete
      if (!analysis.summary.complete) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Analysis failed:', error.message);
      process.exit(1);
    });
}
