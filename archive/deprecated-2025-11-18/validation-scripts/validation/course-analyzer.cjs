#!/usr/bin/env node

/**
 * Course Analyzer - GitHub API Based Completeness Checking
 *
 * Validates course completeness by fetching files from GitHub:
 * - Phase 1: Must have exactly 668 seed pairs
 * - Phase 3: Just validates existence (de-duplication makes count unreliable)
 * - Phase 5: Every LEGO from lego_pairs must have a basket
 * - Phase 6: Every LEGO from lego_pairs must have an introduction
 *
 * Usage:
 *   node course-analyzer.cjs <courseCode> [owner] [repo] [branch]
 *   node course-analyzer.cjs spa_for_eng
 */

const https = require('https');

// GitHub configuration
const DEFAULT_OWNER = 'thomascassidyzm';
const DEFAULT_REPO = 'ssi-dashboard-v7';
const DEFAULT_BRANCH = 'main';

/**
 * Fetch file from GitHub using raw.githubusercontent.com
 * (GitHub Contents API has 1MB limit, course files are larger)
 */
async function fetchGitHubFile(owner, repo, branch, filePath) {
  return new Promise((resolve, reject) => {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
    const options = {
      hostname: 'raw.githubusercontent.com',
      path: `/${owner}/${repo}/${branch}/${filePath}`,
      method: 'GET',
      headers: {
        'User-Agent': 'SSi-Course-Analyzer'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 404) {
          resolve(null); // File doesn't exist
        } else if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Failed to parse JSON from ${url}: ${error.message}`));
          }
        } else {
          reject(new Error(`GitHub error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Analyze a course for completeness
 */
async function analyzeCourse(courseCode, owner = DEFAULT_OWNER, repo = DEFAULT_REPO, branch = DEFAULT_BRANCH) {
  console.log(`\n🔍 Analyzing course: ${courseCode}`);
  console.log(`📦 Repository: ${owner}/${repo}@${branch}`);
  console.log(`📁 Path: ${courseCode}/\n`);

  const analysis = {
    courseCode,
    repository: `${owner}/${repo}`,
    branch,
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

  const phase1 = {
    name: 'Phase 1: Seed Pairs',
    file: 'seed_pairs.json',
    exists: false,
    complete: false,
    required: 668,
    found: 0,
    missing: [],
    issues: []
  };

  console.log(`Fetching public/vfs/courses/${courseCode}/seed_pairs.json...`);
  const seedPairsData = await fetchGitHubFile(owner, repo, branch, `public/vfs/courses/${courseCode}/seed_pairs.json`);

  if (seedPairsData) {
    phase1.exists = true;
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
  } else {
    phase1.issues.push({
      severity: 'error',
      message: 'File does not exist in repository'
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

  const phase3 = {
    name: 'Phase 3: LEGO Pairs',
    file: 'lego_pairs.json',
    exists: false,
    complete: false,
    totalLegos: 0,
    legoIds: [],
    issues: []
  };

  let legoIds = [];

  console.log(`Fetching public/vfs/courses/${courseCode}/lego_pairs.json...`);
  const legoPairsData = await fetchGitHubFile(owner, repo, branch, `public/vfs/courses/${courseCode}/lego_pairs.json`);

  if (legoPairsData) {
    phase3.exists = true;

    // Support both v8.1.1 (seeds array) and legacy (lego_pairs object) formats
    if (legoPairsData.seeds && Array.isArray(legoPairsData.seeds)) {
      // New format: seeds array
      for (const seed of legoPairsData.seeds) {
        if (seed.legos && Array.isArray(seed.legos)) {
          for (const lego of seed.legos) {
            // Support both "id" and "lego_id" field names
            const legoId = lego.id || lego.lego_id;
            if (legoId) {
              legoIds.push(legoId);
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
  } else {
    phase3.issues.push({
      severity: 'error',
      message: 'File does not exist in repository'
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

  const phase5 = {
    name: 'Phase 5: LEGO Baskets',
    file: 'lego_baskets.json',
    exists: false,
    complete: false,
    required: phase3.totalLegos,
    found: 0,
    missing: [],
    issues: []
  };

  console.log(`Fetching public/vfs/courses/${courseCode}/lego_baskets.json...`);
  const legoBasketsData = await fetchGitHubFile(owner, repo, branch, `public/vfs/courses/${courseCode}/lego_baskets.json`);

  if (legoBasketsData && legoIds.length > 0) {
    phase5.exists = true;
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
  } else if (!legoBasketsData) {
    phase5.issues.push({
      severity: 'error',
      message: 'File does not exist in repository'
    });
  } else if (legoIds.length === 0) {
    phase5.issues.push({
      severity: 'warning',
      message: 'Cannot validate: Phase 3 has no LEGOs'
    });
  }

  analysis.phases.phase_5 = phase5;
  if (!phase5.complete && legoBasketsData) {
    analysis.summary.complete = false;
    analysis.summary.totalIssues += phase5.issues.length;
  }

  // ============================================================================
  // PHASE 6: Introductions (Cross-reference with Phase 3 LEGOs)
  // ============================================================================

  const phase6 = {
    name: 'Phase 6: Introductions',
    file: 'introductions.json',
    exists: false,
    complete: false,
    required: phase3.totalLegos,
    found: 0,
    missing: [],
    issues: []
  };

  console.log(`Fetching public/vfs/courses/${courseCode}/introductions.json...`);
  const introductionsData = await fetchGitHubFile(owner, repo, branch, `public/vfs/courses/${courseCode}/introductions.json`);

  if (introductionsData && legoIds.length > 0) {
    phase6.exists = true;
    // Support both "introductions" and "presentations" field names
    const introductions = introductionsData.introductions || introductionsData.presentations || {};
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
  } else if (!introductionsData) {
    phase6.issues.push({
      severity: 'warning',
      message: 'File does not exist in repository (optional phase)'
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
  console.log('');
  console.log('='.repeat(80));
  console.log(`COURSE ANALYSIS: ${analysis.courseCode}`);
  console.log(`Repository: ${analysis.repository}@${analysis.branch}`);
  console.log('='.repeat(80));
  console.log('');

  for (const [phaseKey, phase] of Object.entries(analysis.phases)) {
    const statusIcon = phase.complete ? '✅' : '❌';
    console.log(`${statusIcon} ${phase.name}`);
    console.log(`   File: ${phase.file} ${phase.exists ? '(exists in repo)' : '(NOT IN REPO)'}`);

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
  const owner = process.argv[3] || DEFAULT_OWNER;
  const repo = process.argv[4] || DEFAULT_REPO;
  const branch = process.argv[5] || DEFAULT_BRANCH;

  if (!courseCode) {
    console.error('Usage: node course-analyzer.cjs <courseCode> [owner] [repo] [branch]');
    console.error('Example: node course-analyzer.cjs spa_for_eng');
    console.error(`Default repository: ${DEFAULT_OWNER}/${DEFAULT_REPO}@${DEFAULT_BRANCH}`);
    process.exit(1);
  }

  analyzeCourse(courseCode, owner, repo, branch)
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
