/**
 * Phase Deep Validator
 *
 * Performs deep content validation within each phase to detect:
 * - Missing data
 * - Incomplete records
 * - Data quality issues
 * - Structural problems
 */

const fs = require('fs');
const path = require('path');

/**
 * Validate Phase 1: Seeds
 * Checks seed_pairs.json for completeness
 */
function validatePhase1Seeds(coursePath) {
  const seedPairsPath = path.join(coursePath, 'seed_pairs.json');

  if (!fs.existsSync(seedPairsPath)) {
    return {
      phase: 'phase_1',
      exists: false,
      error: 'seed_pairs.json not found'
    };
  }

  try {
    const data = JSON.parse(fs.readFileSync(seedPairsPath, 'utf8'));

    const issues = [];
    const warnings = [];

    // Count actual seeds in translations object
    const actualSeeds = Object.keys(data.translations || {}).length;

    // Check expected vs actual seed count
    if (data.total_seeds !== actualSeeds) {
      issues.push({
        severity: 'error',
        message: `Seed count mismatch: expected ${data.total_seeds}, got ${actualSeeds}`,
        expected: data.total_seeds,
        actual: actualSeeds
      });
    }

    // Check for missing seeds in sequence
    const missingSeedIds = [];
    for (let i = 1; i <= data.total_seeds; i++) {
      const seedId = `S${String(i).padStart(4, '0')}`;
      if (!data.translations[seedId]) {
        missingSeedIds.push(seedId);
      }
    }

    if (missingSeedIds.length > 0) {
      issues.push({
        severity: 'error',
        message: `Missing ${missingSeedIds.length} seeds in sequence`,
        missingSeedIds: missingSeedIds.slice(0, 10), // First 10
        totalMissing: missingSeedIds.length
      });
    }

    // Check for empty translations
    const emptySeeds = [];
    for (const [seedId, pair] of Object.entries(data.translations || {})) {
      if (!pair || pair.length !== 2 || !pair[0] || !pair[1]) {
        emptySeeds.push(seedId);
      }
    }

    if (emptySeeds.length > 0) {
      issues.push({
        severity: 'error',
        message: `${emptySeeds.length} seeds have empty/invalid translations`,
        examples: emptySeeds.slice(0, 5)
      });
    }

    // Check for very short translations (potential quality issue)
    const shortSeeds = [];
    for (const [seedId, pair] of Object.entries(data.translations || {})) {
      if (pair && pair[0] && pair[0].length < 5) {
        shortSeeds.push({ seedId, text: pair[0] });
      }
    }

    if (shortSeeds.length > 0) {
      warnings.push({
        severity: 'warning',
        message: `${shortSeeds.length} seeds have very short translations (< 5 chars)`,
        examples: shortSeeds.slice(0, 3)
      });
    }

    return {
      phase: 'phase_1',
      exists: true,
      valid: issues.length === 0,
      stats: {
        totalSeeds: data.total_seeds,
        actualSeeds: actualSeeds,
        missingSeeds: missingSeedIds.length,
        emptySeeds: emptySeeds.length,
        completeness: ((actualSeeds - missingSeedIds.length) / data.total_seeds * 100).toFixed(1) + '%'
      },
      issues,
      warnings
    };

  } catch (err) {
    return {
      phase: 'phase_1',
      exists: true,
      valid: false,
      error: `Failed to parse seed_pairs.json: ${err.message}`
    };
  }
}

/**
 * Validate Phase 3: LEGOs
 * Checks lego_pairs.json for completeness
 */
function validatePhase3Legos(coursePath) {
  const legoPairsPath = path.join(coursePath, 'lego_pairs.json');

  if (!fs.existsSync(legoPairsPath)) {
    return {
      phase: 'phase_3',
      exists: false,
      error: 'lego_pairs.json not found'
    };
  }

  try {
    const data = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

    const issues = [];
    const warnings = [];

    // Count total LEGOs from the new structure (v8.1.1)
    let totalLegos = 0;
    let emptyLegos = 0;
    let invalidLegos = 0;
    const seedsWithLegos = new Set();

    // Check if using new format (seeds array) or old format (lego_pairs object)
    if (data.seeds && Array.isArray(data.seeds)) {
      // New format
      for (const seed of data.seeds) {
        seedsWithLegos.add(seed.seed_id);

        if (seed.legos && Array.isArray(seed.legos)) {
          for (const lego of seed.legos) {
            totalLegos++;

            if (!lego.target || !lego.known) {
              emptyLegos++;
            }
            if (!lego.id) {
              invalidLegos++;
            }
          }
        }
      }
    } else if (data.lego_pairs) {
      // Old format
      for (const [legoId, legoPair] of Object.entries(data.lego_pairs || {})) {
        totalLegos++;

        // Extract seed ID from LEGO ID (e.g., S0001L01 -> S0001)
        const seedId = legoId.match(/^(S\d{4})/)?.[1];
        if (seedId) {
          seedsWithLegos.add(seedId);
        }

        // Check for empty or invalid LEGO pairs
        if (!legoPair || legoPair.length !== 2) {
          invalidLegos++;
          continue;
        }

        if (!legoPair[0] || !legoPair[1]) {
          emptyLegos++;
        }
      }
    }

    if (invalidLegos > 0) {
      issues.push({
        severity: 'error',
        message: `${invalidLegos} LEGOs have invalid structure (not a pair)`,
        count: invalidLegos
      });
    }

    if (emptyLegos > 0) {
      issues.push({
        severity: 'error',
        message: `${emptyLegos} LEGOs have empty translations`,
        count: emptyLegos
      });
    }

    // Check LEGO count makes sense (should have more LEGOs than seeds)
    const seedCount = data.total_seeds || 0;
    if (totalLegos < seedCount) {
      warnings.push({
        severity: 'warning',
        message: `Fewer LEGOs (${totalLegos}) than seeds (${seedCount}) - unusual`,
        legoCount: totalLegos,
        seedCount: seedCount
      });
    }

    return {
      phase: 'phase_3',
      exists: true,
      valid: issues.length === 0,
      stats: {
        totalLegos,
        emptyLegos,
        invalidLegos,
        uniqueSeeds: seedsWithLegos.size,
        avgLegosPerSeed: (totalLegos / seedsWithLegos.size).toFixed(2)
      },
      issues,
      warnings
    };

  } catch (err) {
    return {
      phase: 'phase_3',
      exists: true,
      valid: false,
      error: `Failed to parse lego_pairs.json: ${err.message}`
    };
  }
}

/**
 * Validate Phase 5: Baskets
 * Checks lego_baskets.json for completeness
 */
function validatePhase5Baskets(coursePath) {
  const basketsPath = path.join(coursePath, 'lego_baskets.json');

  if (!fs.existsSync(basketsPath)) {
    return {
      phase: 'phase_5',
      exists: false,
      error: 'lego_baskets.json not found'
    };
  }

  try {
    const data = JSON.parse(fs.readFileSync(basketsPath, 'utf8'));

    const issues = [];
    const warnings = [];

    let totalBaskets = 0;
    let emptyBaskets = 0;
    let incompleteBasketsE = [];
    let incompleteBasketsD = [];
    let shortEPhrases = [];

    for (const [legoId, basket] of Object.entries(data)) {
      totalBaskets++;

      // Check if basket is empty
      if (!basket || (!basket.e && !basket.d)) {
        emptyBaskets++;
        continue;
      }

      // Check e-phrases (should have 3-5)
      const ePhraseCount = basket.e?.length || 0;
      if (ePhraseCount === 0) {
        incompleteBasketsE.push({ legoId, count: 0 });
      } else if (ePhraseCount < 3) {
        warnings.push({
          severity: 'warning',
          message: `${legoId} has only ${ePhraseCount} e-phrases (expected 3-5)`,
          legoId,
          count: ePhraseCount
        });
      }

      // Check e-phrase lengths (should be 7-10 words)
      if (basket.e) {
        for (let i = 0; i < basket.e.length; i++) {
          const phrase = basket.e[i];
          if (phrase && phrase[0]) {
            const wordCount = phrase[0].split(/\s+/).length;
            if (wordCount < 7) {
              shortEPhrases.push({
                legoId,
                phraseIndex: i,
                wordCount,
                phrase: phrase[0].substring(0, 50)
              });
            }
          }
        }
      }

      // Check d-phrases (should have 2, 3, 4, 5)
      const expectedDSizes = ['2', '3', '4', '5'];
      const missingDSizes = [];

      for (const size of expectedDSizes) {
        if (!basket.d || !basket.d[size] || basket.d[size].length === 0) {
          missingDSizes.push(size);
        }
      }

      if (missingDSizes.length > 0) {
        incompleteBasketsD.push({
          legoId,
          missingSizes: missingDSizes
        });
      }
    }

    if (emptyBaskets > 0) {
      issues.push({
        severity: 'error',
        message: `${emptyBaskets} baskets are completely empty`,
        count: emptyBaskets
      });
    }

    if (incompleteBasketsE.length > 0) {
      issues.push({
        severity: 'error',
        message: `${incompleteBasketsE.length} baskets have no e-phrases`,
        examples: incompleteBasketsE.slice(0, 5)
      });
    }

    if (incompleteBasketsD.length > 0) {
      issues.push({
        severity: 'error',
        message: `${incompleteBasketsD.length} baskets have incomplete d-phrases`,
        examples: incompleteBasketsD.slice(0, 5)
      });
    }

    if (shortEPhrases.length > 0) {
      warnings.push({
        severity: 'warning',
        message: `${shortEPhrases.length} e-phrases are too short (< 7 words)`,
        examples: shortEPhrases.slice(0, 5)
      });
    }

    return {
      phase: 'phase_5',
      exists: true,
      valid: issues.length === 0,
      stats: {
        totalBaskets,
        emptyBaskets,
        basketsWithoutE: incompleteBasketsE.length,
        basketsWithIncompleteD: incompleteBasketsD.length,
        shortEPhrases: shortEPhrases.length,
        completeness: ((totalBaskets - emptyBaskets) / totalBaskets * 100).toFixed(1) + '%'
      },
      issues,
      warnings
    };

  } catch (err) {
    return {
      phase: 'phase_5',
      exists: true,
      valid: false,
      error: `Failed to parse lego_baskets.json: ${err.message}`
    };
  }
}

/**
 * Validate Phase 6: Introductions
 * Checks introductions.json for completeness
 */
function validatePhase6Introductions(coursePath) {
  const introsPath = path.join(coursePath, 'introductions.json');

  if (!fs.existsSync(introsPath)) {
    return {
      phase: 'phase_6',
      exists: false,
      error: 'introductions.json not found'
    };
  }

  try {
    const data = JSON.parse(fs.readFileSync(introsPath, 'utf8'));

    const issues = [];
    const warnings = [];

    let totalIntros = 0;
    let emptyIntros = 0;

    for (const [legoId, intro] of Object.entries(data)) {
      totalIntros++;

      if (!intro || intro.length === 0) {
        emptyIntros++;
      }
    }

    if (emptyIntros > 0) {
      issues.push({
        severity: 'error',
        message: `${emptyIntros} introductions are empty`,
        count: emptyIntros
      });
    }

    return {
      phase: 'phase_6',
      exists: true,
      valid: issues.length === 0,
      stats: {
        totalIntros,
        emptyIntros,
        completeness: ((totalIntros - emptyIntros) / totalIntros * 100).toFixed(1) + '%'
      },
      issues,
      warnings
    };

  } catch (err) {
    return {
      phase: 'phase_6',
      exists: true,
      valid: false,
      error: `Failed to parse introductions.json: ${err.message}`
    };
  }
}

/**
 * Validate Phase 7: Scaffolds
 * Checks phase5_outputs directory for completeness
 */
function validatePhase7Scaffolds(coursePath) {
  const outputsPath = path.join(coursePath, 'phase5_outputs');
  const scaffoldsPath = path.join(coursePath, 'phase5_scaffolds');

  if (!fs.existsSync(outputsPath)) {
    return {
      phase: 'phase_7',
      exists: false,
      error: 'phase5_outputs directory not found'
    };
  }

  try {
    const issues = [];
    const warnings = [];

    // Count output files
    const outputFiles = fs.readdirSync(outputsPath).filter(f => !f.startsWith('.'));
    const scaffoldFiles = fs.existsSync(scaffoldsPath)
      ? fs.readdirSync(scaffoldsPath).filter(f => !f.startsWith('.'))
      : [];

    // Check expected seed count (should be ~668 or total_seeds)
    const seedPairsPath = path.join(coursePath, 'seed_pairs.json');
    let expectedCount = 668; // default

    if (fs.existsSync(seedPairsPath)) {
      const seedData = JSON.parse(fs.readFileSync(seedPairsPath, 'utf8'));
      expectedCount = seedData.total_seeds || 668;
    }

    const outputCount = outputFiles.length;
    const scaffoldCount = scaffoldFiles.length;

    if (outputCount < expectedCount) {
      issues.push({
        severity: 'error',
        message: `Missing scaffold outputs: expected ${expectedCount}, got ${outputCount}`,
        expected: expectedCount,
        actual: outputCount,
        missing: expectedCount - outputCount
      });
    }

    if (scaffoldCount === 0) {
      warnings.push({
        severity: 'warning',
        message: 'phase5_scaffolds directory is empty or missing',
        expected: '> 0',
        actual: 0
      });
    }

    return {
      phase: 'phase_7',
      exists: true,
      valid: issues.length === 0,
      stats: {
        outputFiles: outputCount,
        scaffoldFiles: scaffoldCount,
        expectedOutputs: expectedCount,
        completeness: ((outputCount / expectedCount) * 100).toFixed(1) + '%'
      },
      issues,
      warnings
    };

  } catch (err) {
    return {
      phase: 'phase_7',
      exists: true,
      valid: false,
      error: `Failed to validate scaffolds: ${err.message}`
    };
  }
}

/**
 * Deep validate all phases for a course
 */
function deepValidateCourse(courseCode, vfsRoot = 'public/vfs/courses') {
  const coursePath = path.join(vfsRoot, courseCode);

  if (!fs.existsSync(coursePath)) {
    return {
      courseCode,
      exists: false,
      error: 'Course directory not found'
    };
  }

  return {
    courseCode,
    exists: true,
    timestamp: new Date().toISOString(),
    phases: {
      phase_1: validatePhase1Seeds(coursePath),
      phase_3: validatePhase3Legos(coursePath),
      phase_5: validatePhase5Baskets(coursePath),
      phase_6: validatePhase6Introductions(coursePath),
      phase_7: validatePhase7Scaffolds(coursePath)
    }
  };
}

/**
 * Get summary of all issues across phases
 */
function getIssuesSummary(deepValidation) {
  const allIssues = [];
  const allWarnings = [];

  for (const [phaseKey, phaseData] of Object.entries(deepValidation.phases || {})) {
    if (phaseData.issues) {
      allIssues.push(...phaseData.issues.map(i => ({ ...i, phase: phaseKey })));
    }
    if (phaseData.warnings) {
      allWarnings.push(...phaseData.warnings.map(w => ({ ...w, phase: phaseKey })));
    }
  }

  return {
    totalIssues: allIssues.length,
    totalWarnings: allWarnings.length,
    criticalIssues: allIssues.filter(i => i.severity === 'error'),
    issues: allIssues,
    warnings: allWarnings
  };
}

module.exports = {
  validatePhase1Seeds,
  validatePhase3Legos,
  validatePhase5Baskets,
  validatePhase6Introductions,
  validatePhase7Scaffolds,
  deepValidateCourse,
  getIssuesSummary
};

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node phase-deep-validator.cjs <courseCode> [phase]');
    console.log('');
    console.log('Examples:');
    console.log('  node phase-deep-validator.cjs spa_for_eng');
    console.log('  node phase-deep-validator.cjs cmn_for_eng phase_5');
    process.exit(1);
  }

  const courseCode = args[0];
  const specificPhase = args[1];

  if (specificPhase) {
    // Validate specific phase
    console.log(`\n🔍 Deep validating ${specificPhase} for ${courseCode}\n`);
    const coursePath = path.join('public/vfs/courses', courseCode);

    let result;
    switch (specificPhase) {
      case 'phase_1':
        result = validatePhase1Seeds(coursePath);
        break;
      case 'phase_3':
        result = validatePhase3Legos(coursePath);
        break;
      case 'phase_5':
        result = validatePhase5Baskets(coursePath);
        break;
      case 'phase_6':
        result = validatePhase6Introductions(coursePath);
        break;
      case 'phase_7':
        result = validatePhase7Scaffolds(coursePath);
        break;
      default:
        console.error(`Unknown phase: ${specificPhase}`);
        process.exit(1);
    }

    console.log(JSON.stringify(result, null, 2));
  } else {
    // Validate all phases
    console.log(`\n🔍 Deep validating all phases for ${courseCode}\n`);
    const result = deepValidateCourse(courseCode);
    const summary = getIssuesSummary(result);

    console.log(JSON.stringify({ ...result, summary }, null, 2));
  }
}
