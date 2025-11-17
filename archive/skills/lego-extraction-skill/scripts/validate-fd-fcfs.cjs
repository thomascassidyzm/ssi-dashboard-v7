#!/usr/bin/env node

/**
 * FD + FCFS Validator for LEGO Extractions
 *
 * Purpose: Validate that LEGOs follow correct methodology:
 * - FD (Functionally Deterministic): Learner sees known chunk → knows exactly ONE target
 * - FCFS (First Come First Served): First occurrence claims mapping, subsequent must chunk up
 *
 * This validator uses the CORRECTED FD definition (not the old FD_LOOP).
 *
 * Usage:
 *   node validate-fd-fcfs.cjs <course_dir>
 *   node validate-fd-fcfs.cjs /path/to/vfs/courses/spa_for_eng_30seeds
 *   node validate-fd-fcfs.cjs --all
 */

const fs = require('fs');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// =============================================================================
// FD (FUNCTIONALLY DETERMINISTIC) VALIDATION
// =============================================================================

/**
 * Test if a LEGO is functionally deterministic from learner's perspective
 *
 * CORRECT DEFINITION: Learner sees known_chunk → knows exactly ONE target_chunk
 *
 * This is NOT about backward translation (target → known).
 * This is about: Can the learner produce the right target when shown the known?
 */
function validateFD(lego, courseMetadata) {
  const issues = [];

  // Check 1: Articles without nouns (always ambiguous)
  const articles = ['el', 'la', 'los', 'las', 'un', 'una', 'il', 'le', 'les', 'the', 'a', 'an'];
  if (articles.includes(lego.target_chunk.toLowerCase().trim())) {
    issues.push({
      type: 'FD_VIOLATION_ARTICLE',
      severity: 'CRITICAL',
      lego_id: lego.lego_id,
      known_chunk: lego.known_chunk,
      target_chunk: lego.target_chunk,
      message: `Standalone article "${lego.target_chunk}" fails FD - learner doesn't know which article to use without noun context`
    });
  }

  // Check 2: Standalone prepositions (meaningless without object)
  const prepositions = ['to', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'of', 'about',
                        'de', 'a', 'en', 'con', 'por', 'para', 'di', 'da', 'per', 'avec', 'sans'];
  if (prepositions.includes(lego.known_chunk.toLowerCase().trim()) ||
      prepositions.includes(lego.target_chunk.toLowerCase().trim())) {
    issues.push({
      type: 'FD_VIOLATION_PREPOSITION',
      severity: 'CRITICAL',
      lego_id: lego.lego_id,
      known_chunk: lego.known_chunk,
      target_chunk: lego.target_chunk,
      message: `Standalone preposition fails FD - needs object for meaningful mapping`
    });
  }

  // Check 3: Gender-ambiguous possessives without nouns
  const genderAmbiguous = ['su', 'sus', 'son', 'sa', 'ses', 'leur', 'il suo', 'la sua'];
  if (genderAmbiguous.some(g => lego.target_chunk.toLowerCase().trim() === g)) {
    issues.push({
      type: 'FD_VIOLATION_GENDER',
      severity: 'HIGH',
      lego_id: lego.lego_id,
      known_chunk: lego.known_chunk,
      target_chunk: lego.target_chunk,
      message: `Gender-ambiguous "${lego.target_chunk}" without noun fails FD - learner doesn't know which form`
    });
  }

  // Check 4: Empty chunks
  if (!lego.target_chunk || !lego.target_chunk.trim()) {
    issues.push({
      type: 'FD_VIOLATION_EMPTY',
      severity: 'CRITICAL',
      lego_id: lego.lego_id,
      message: 'Empty target_chunk'
    });
  }

  if (!lego.known_chunk || !lego.known_chunk.trim()) {
    issues.push({
      type: 'FD_VIOLATION_EMPTY',
      severity: 'CRITICAL',
      lego_id: lego.lego_id,
      message: 'Empty known_chunk'
    });
  }

  return issues;
}

// =============================================================================
// FCFS (FIRST COME FIRST SERVED) VALIDATION
// =============================================================================

/**
 * Build mapping of known_chunk → [seed_ids] to detect FCFS violations
 */
function buildKnownChunkMap(breakdowns) {
  const knownChunkMap = new Map();

  for (const breakdown of breakdowns) {
    // Process lego_pairs
    for (const lego of breakdown.lego_pairs || []) {
      const knownKey = lego.known_chunk.toLowerCase().trim();

      if (!knownChunkMap.has(knownKey)) {
        knownChunkMap.set(knownKey, []);
      }

      knownChunkMap.get(knownKey).push({
        seed_id: breakdown.seed_id,
        lego_id: lego.lego_id,
        target_chunk: lego.target_chunk,
        known_chunk: lego.known_chunk
      });
    }

    // Process feeder_pairs
    for (const feeder of breakdown.feeder_pairs || []) {
      const knownKey = feeder.known_chunk.toLowerCase().trim();

      if (!knownChunkMap.has(knownKey)) {
        knownChunkMap.set(knownKey, []);
      }

      knownChunkMap.get(knownKey).push({
        seed_id: breakdown.seed_id,
        feeder_id: feeder.feeder_id,
        target_chunk: feeder.target_chunk,
        known_chunk: feeder.known_chunk
      });
    }
  }

  return knownChunkMap;
}

/**
 * Validate FCFS rule: First occurrence claims mapping, subsequent must chunk up
 */
function validateFCFS(knownChunkMap) {
  const issues = [];

  for (const [knownChunk, occurrences] of knownChunkMap.entries()) {
    if (occurrences.length <= 1) {
      continue; // No conflict if only one occurrence
    }

    // Group by target_chunk
    const targetGroups = {};
    for (const occ of occurrences) {
      const targetKey = occ.target_chunk.toLowerCase().trim();
      if (!targetGroups[targetKey]) {
        targetGroups[targetKey] = [];
      }
      targetGroups[targetKey].push(occ);
    }

    // If same known maps to DIFFERENT targets → FCFS violation
    const uniqueTargets = Object.keys(targetGroups);
    if (uniqueTargets.length > 1) {
      // Find first occurrence (FCFS claim)
      const firstOccurrence = occurrences[0];
      const firstTarget = firstOccurrence.target_chunk.toLowerCase().trim();

      // All subsequent with different targets are violations
      for (const occ of occurrences.slice(1)) {
        const targetKey = occ.target_chunk.toLowerCase().trim();
        if (targetKey !== firstTarget) {
          issues.push({
            type: 'FCFS_VIOLATION',
            severity: 'CRITICAL',
            seed_id: occ.seed_id,
            lego_id: occ.lego_id || occ.feeder_id,
            known_chunk: occ.known_chunk,
            target_chunk: occ.target_chunk,
            first_claim: {
              seed_id: firstOccurrence.seed_id,
              target_chunk: firstOccurrence.target_chunk
            },
            message: `FCFS violation: "${knownChunk}" already mapped to "${firstOccurrence.target_chunk}" in ${firstOccurrence.seed_id}. This occurrence maps to "${occ.target_chunk}" - should chunk up with context instead.`,
            suggestion: `Chunk up with more context to make it deterministic (e.g., expand "${occ.known_chunk}" to include surrounding words)`
          });
        }
      }
    }
  }

  return issues;
}

// =============================================================================
// CLASSIFICATION VALIDATION
// =============================================================================

function validateClassification(lego) {
  const issues = [];

  // BASE LEGOs should NOT have componentization
  if (lego.lego_type === 'BASE' && lego.componentization) {
    issues.push({
      type: 'CLASSIFICATION_ERROR',
      severity: 'MEDIUM',
      lego_id: lego.lego_id,
      message: `BASE LEGO has componentization field - should be COMPOSITE or remove componentization`
    });
  }

  // COMPOSITE LEGOs SHOULD have componentization
  if (lego.lego_type === 'COMPOSITE' && !lego.componentization) {
    issues.push({
      type: 'CLASSIFICATION_ERROR',
      severity: 'LOW',
      lego_id: lego.lego_id,
      message: `COMPOSITE LEGO missing componentization field (may be in feeder_pairs instead)`
    });
  }

  // FEEDER type doesn't exist in lego_pairs (only in feeder_pairs)
  if (lego.lego_type === 'FEEDER' && lego.lego_id) {
    issues.push({
      type: 'CLASSIFICATION_ERROR',
      severity: 'HIGH',
      lego_id: lego.lego_id,
      message: `FEEDER type should only appear in feeder_pairs, not lego_pairs`
    });
  }

  return issues;
}

// =============================================================================
// VALIDATION ORCHESTRATION
// =============================================================================

/**
 * Validate entire course
 */
function validateCourse(courseDir) {
  const coursePath = path.resolve(courseDir);
  const courseName = path.basename(coursePath);

  console.log(`\n${colors.cyan}Validating: ${courseName}${colors.reset}`);
  console.log(`${'─'.repeat(70)}`);

  // Load files
  const legoPath = path.join(coursePath, 'LEGO_BREAKDOWNS_COMPLETE.json');
  const translationsPath = path.join(coursePath, 'translations.json');

  if (!fs.existsSync(legoPath)) {
    console.error(`${colors.red}Error: ${legoPath} not found${colors.reset}`);
    return null;
  }

  const legoData = JSON.parse(fs.readFileSync(legoPath, 'utf-8'));
  const courseMetadata = legoData.course_metadata || {};
  const breakdowns = legoData.lego_breakdowns || [];

  let translations = {};
  if (fs.existsSync(translationsPath)) {
    translations = JSON.parse(fs.readFileSync(translationsPath, 'utf-8'));
  }

  const allIssues = [];

  // Step 1: Validate FD for each LEGO
  console.log(`\n${colors.blue}[1/3] Validating FD (Functionally Deterministic)...${colors.reset}`);
  for (const breakdown of breakdowns) {
    for (const lego of breakdown.lego_pairs || []) {
      const fdIssues = validateFD(lego, courseMetadata);
      allIssues.push(...fdIssues.map(issue => ({
        ...issue,
        seed_id: breakdown.seed_id
      })));

      const classIssues = validateClassification(lego);
      allIssues.push(...classIssues.map(issue => ({
        ...issue,
        seed_id: breakdown.seed_id
      })));
    }
  }

  // Step 2: Validate FCFS (cross-seed validation)
  console.log(`${colors.blue}[2/3] Validating FCFS (First Come First Served)...${colors.reset}`);
  const knownChunkMap = buildKnownChunkMap(breakdowns);
  const fcfsIssues = validateFCFS(knownChunkMap);
  allIssues.push(...fcfsIssues);

  // Step 3: Generate report
  console.log(`${colors.blue}[3/3] Generating report...${colors.reset}\n`);
  const report = generateReport(allIssues, courseName);

  return {
    ...report,
    issues: allIssues,
    course_name: courseName,
    total_seeds: breakdowns.length,
    total_legos: breakdowns.reduce((sum, b) => sum + (b.lego_pairs?.length || 0), 0)
  };
}

/**
 * Generate validation report
 */
function generateReport(allIssues, courseName) {
  console.log(`${'═'.repeat(70)}`);
  console.log(`${colors.cyan}FD + FCFS VALIDATION REPORT${colors.reset}`);
  console.log(`Course: ${colors.blue}${courseName}${colors.reset}`);
  console.log(`${'═'.repeat(70)}\n`);

  // Group by severity
  const critical = allIssues.filter(i => i.severity === 'CRITICAL');
  const high = allIssues.filter(i => i.severity === 'HIGH');
  const medium = allIssues.filter(i => i.severity === 'MEDIUM');
  const low = allIssues.filter(i => i.severity === 'LOW');

  // Group by type
  const byType = {};
  for (const issue of allIssues) {
    if (!byType[issue.type]) {
      byType[issue.type] = [];
    }
    byType[issue.type].push(issue);
  }

  // Summary
  console.log(`${colors.magenta}SUMMARY${colors.reset}`);
  console.log(`  Total Issues: ${allIssues.length}`);
  console.log(`  ${colors.red}CRITICAL: ${critical.length}${colors.reset}`);
  console.log(`  ${colors.yellow}HIGH: ${high.length}${colors.reset}`);
  console.log(`  ${colors.blue}MEDIUM: ${medium.length}${colors.reset}`);
  console.log(`  ${colors.gray}LOW: ${low.length}${colors.reset}\n`);

  // Issue type breakdown
  if (Object.keys(byType).length > 0) {
    console.log(`${colors.magenta}ISSUE TYPES${colors.reset}`);
    for (const [type, issues] of Object.entries(byType).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${type}: ${issues.length}`);
    }
    console.log();
  }

  // Critical issues
  if (critical.length > 0) {
    console.log(`${colors.red}🚨 CRITICAL ISSUES${colors.reset}`);
    console.log(`${'─'.repeat(70)}`);
    for (const issue of critical.slice(0, 10)) {
      console.log(`\n  ${colors.red}●${colors.reset} ${issue.seed_id} - ${issue.lego_id || 'N/A'}`);
      console.log(`    ${issue.message}`);
      if (issue.known_chunk) console.log(`    Known: "${issue.known_chunk}"`);
      if (issue.target_chunk) console.log(`    Target: "${issue.target_chunk}"`);
      if (issue.suggestion) console.log(`    ${colors.cyan}💡 ${issue.suggestion}${colors.reset}`);
    }
    if (critical.length > 10) {
      console.log(`\n  ${colors.gray}... and ${critical.length - 10} more critical issues${colors.reset}`);
    }
    console.log();
  }

  // High priority
  if (high.length > 0) {
    console.log(`${colors.yellow}⚠️  HIGH PRIORITY ISSUES${colors.reset}`);
    console.log(`${'─'.repeat(70)}`);
    for (const issue of high.slice(0, 5)) {
      console.log(`\n  ${colors.yellow}●${colors.reset} ${issue.seed_id} - ${issue.lego_id || 'N/A'}`);
      console.log(`    ${issue.message}`);
    }
    if (high.length > 5) {
      console.log(`\n  ${colors.gray}... and ${high.length - 5} more high priority issues${colors.reset}`);
    }
    console.log();
  }

  // Final verdict
  console.log(`${'═'.repeat(70)}`);
  const qualityScore = allIssues.length === 0 ? 100 :
                      Math.max(0, 100 - (critical.length * 5 + high.length * 2 + medium.length * 0.5));

  if (critical.length === 0 && high.length === 0) {
    console.log(`${colors.green}✅ VALIDATION PASSED${colors.reset}`);
    console.log(`   Quality Score: ${qualityScore.toFixed(1)}%`);
  } else {
    console.log(`${colors.red}❌ VALIDATION FAILED${colors.reset}`);
    console.log(`   Quality Score: ${qualityScore.toFixed(1)}%`);
    console.log(`   Fix ${critical.length} critical and ${high.length} high-priority issues`);
  }
  console.log(`${'═'.repeat(70)}\n`);

  return {
    passed: critical.length === 0 && high.length === 0,
    quality_score: qualityScore,
    total: allIssues.length,
    critical: critical.length,
    high: high.length,
    medium: medium.length,
    low: low.length,
    by_type: Object.fromEntries(
      Object.entries(byType).map(([type, issues]) => [type, issues.length])
    )
  };
}

// =============================================================================
// MAIN
// =============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`${colors.yellow}Usage:${colors.reset}`);
    console.log(`  node validate-fd-fcfs.cjs <course_dir>`);
    console.log(`  node validate-fd-fcfs.cjs /path/to/vfs/courses/spa_for_eng_30seeds`);
    console.log(`  node validate-fd-fcfs.cjs --all\n`);
    process.exit(1);
  }

  if (args[0] === '--all') {
    // Find all course directories
    const vfsPath = path.resolve(__dirname, '../../../vfs/courses');
    if (!fs.existsSync(vfsPath)) {
      console.error(`${colors.red}Error: VFS courses directory not found: ${vfsPath}${colors.reset}`);
      process.exit(1);
    }

    const courses = fs.readdirSync(vfsPath)
      .filter(name => name.includes('_for_'))
      .map(name => path.join(vfsPath, name));

    const results = [];
    for (const courseDir of courses) {
      const result = validateCourse(courseDir);
      if (result) {
        results.push(result);
      }
    }

    // Overall summary
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`${colors.cyan}MULTI-COURSE VALIDATION SUMMARY${colors.reset}`);
    console.log(`${'═'.repeat(70)}\n`);

    for (const result of results) {
      const status = result.passed ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
      console.log(`${status}  ${result.course_name} (${result.quality_score.toFixed(1)}%)`);
      console.log(`       ${result.total_seeds} seeds, ${result.total_legos} LEGOs`);
      console.log(`       Issues: ${result.critical} critical, ${result.high} high, ${result.medium} medium, ${result.low} low`);
    }
    console.log();

    // Exit code based on overall results
    const anyFailed = results.some(r => !r.passed);
    process.exit(anyFailed ? 1 : 0);

  } else {
    const result = validateCourse(args[0]);
    if (result && !result.passed) {
      process.exit(1);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateCourse, validateFD, validateFCFS, buildKnownChunkMap };
