#!/usr/bin/env node

/**
 * LEGO_BREAKDOWNS Quality Validator
 *
 * Validates Phase 3 LEGO decompositions for:
 * - FD_LOOP compliance (critical)
 * - IRON RULE compliance
 * - Translation synchronization
 * - CHUNK UP principle (subjunctive/context-dependent forms)
 * - COMPOSITE vs BASE classification
 * - FEEDER pairs for COMPOSITEs
 * - Completeness checks
 *
 * Usage:
 *   node validate-lego-breakdowns.cjs <course_dir>
 *   node validate-lego-breakdowns.cjs spa_for_eng_30seeds
 *   node validate-lego-breakdowns.cjs --all  (validates all courses)
 */

const fs = require('fs-extra');
const path = require('path');

// ANSI colors for output
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

// IRON RULE: Standalone prepositions without objects
const STANDALONE_PREPOSITIONS = new Set([
  'to', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'of', 'about',
  'as', 'into', 'like', 'through', 'after', 'over', 'between', 'out',
  'against', 'during', 'without', 'before', 'under', 'around', 'among',
  // Spanish
  'de', 'a', 'en', 'con', 'por', 'para', 'sin',
  // Italian
  'di', 'da', 'per',
  // French
  'de', 'à', 'avec', 'sans', 'pour'
]);

// Known context-ambiguous forms that should be chunked up
const CONTEXT_AMBIGUOUS = {
  // Spanish subjunctive
  'pueda': ['en cuanto pueda', 'para que pueda'],
  'puedas': ['en cuanto puedas', 'para que puedas'],
  'hable': ['que hable', 'para que hable'],
  'hables': ['que hables', 'para que hables'],
  // Italian subjunctive
  'fossi': ['come se fossi', 'se fossi'],
  'sia': ['che sia', 'perché sia'],
  // French subjunctive
  'sois': ['que tu sois'],
  'soit': ["qu'il soit"]
};

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Check if word is standalone preposition (IRON RULE violation)
 */
function isStandalonePreposition(chunk) {
  const trimmed = chunk.trim().toLowerCase();
  return STANDALONE_PREPOSITIONS.has(trimmed);
}

/**
 * Simulate FD_LOOP test: Target → Known → Target
 */
function testFDLoop(targetChunk, knownChunk, courseMetadata) {
  // This is a simplified heuristic check
  // Full FD test would require LLM translation

  const issues = [];

  // Check 1: Standalone subjunctive/conditional forms
  const targetWords = targetChunk.toLowerCase().split(/\s+/);
  for (const word of targetWords) {
    if (CONTEXT_AMBIGUOUS[word]) {
      // Check if chunk contains proper context
      const hasContext = CONTEXT_AMBIGUOUS[word].some(contextPhrase =>
        targetChunk.toLowerCase().includes(contextPhrase.toLowerCase())
      );
      if (!hasContext) {
        issues.push({
          type: 'FD_CONTEXT_MISSING',
          severity: 'HIGH',
          message: `"${word}" needs context. Suggested: ${CONTEXT_AMBIGUOUS[word].join(' or ')}`
        });
      }
    }
  }

  // Check 2: Gender-ambiguous words without context
  const genderAmbiguous = ['su', 'son', 'sua', 'leur', 'his', 'her', 'their'];
  if (genderAmbiguous.some(g => targetChunk.toLowerCase().split(/\s+/).includes(g)) &&
      targetChunk.split(/\s+/).length === 1) {
    issues.push({
      type: 'FD_GENDER_AMBIGUOUS',
      severity: 'MEDIUM',
      message: `Gender-ambiguous word "${targetChunk}" should include noun for FD clarity`
    });
  }

  // Check 3: Standalone articles/pronouns
  const articles = ['el', 'la', 'il', 'le', 'un', 'une', 'the', 'a', 'an'];
  if (articles.includes(targetChunk.toLowerCase().trim())) {
    issues.push({
      type: 'FD_INCOMPLETE',
      severity: 'HIGH',
      message: `Standalone article "${targetChunk}" is not FD - needs noun`
    });
  }

  return issues;
}

/**
 * Validate a single LEGO pair
 */
function validateLegoPair(lego, seedId, courseMetadata) {
  const issues = [];

  // Required fields
  const requiredFields = ['lego_id', 'lego_type', 'target_chunk', 'known_chunk', 'fd_validated'];
  for (const field of requiredFields) {
    if (!(field in lego)) {
      issues.push({
        type: 'MISSING_FIELD',
        severity: 'HIGH',
        field,
        message: `Missing required field: ${field}`
      });
    }
  }

  if (issues.length > 0) return issues; // Can't proceed without basic fields

  // IRON RULE: No standalone prepositions
  if (isStandalonePreposition(lego.target_chunk)) {
    issues.push({
      type: 'IRON_RULE_VIOLATION',
      severity: 'CRITICAL',
      lego_id: lego.lego_id,
      chunk: lego.target_chunk,
      message: `IRON RULE violation: Standalone preposition "${lego.target_chunk}"`
    });
  }

  if (isStandalonePreposition(lego.known_chunk)) {
    issues.push({
      type: 'IRON_RULE_VIOLATION',
      severity: 'CRITICAL',
      lego_id: lego.lego_id,
      chunk: lego.known_chunk,
      message: `IRON RULE violation: Standalone preposition "${lego.known_chunk}"`
    });
  }

  // FD_LOOP validation
  if (lego.fd_validated === true) {
    const fdIssues = testFDLoop(lego.target_chunk, lego.known_chunk, courseMetadata);
    if (fdIssues.length > 0) {
      issues.push(...fdIssues.map(issue => ({
        ...issue,
        lego_id: lego.lego_id,
        target_chunk: lego.target_chunk,
        known_chunk: lego.known_chunk
      })));
    }
  } else if (lego.fd_validated === false) {
    issues.push({
      type: 'FD_VALIDATION_FAILED',
      severity: 'CRITICAL',
      lego_id: lego.lego_id,
      message: `LEGO marked as fd_validated: false - should not be in final output`
    });
  }

  // COMPOSITE LEGOs must have componentization or feeder_pairs
  if (lego.lego_type === 'COMPOSITE') {
    if (!lego.componentization && !lego.feeder_pairs) {
      issues.push({
        type: 'MISSING_COMPONENTIZATION',
        severity: 'MEDIUM',
        lego_id: lego.lego_id,
        message: 'COMPOSITE LEGO should have componentization explanation or appear in feeder_pairs'
      });
    }
  }

  // Empty chunks
  if (!lego.target_chunk || !lego.target_chunk.trim()) {
    issues.push({
      type: 'EMPTY_CHUNK',
      severity: 'CRITICAL',
      lego_id: lego.lego_id,
      message: 'Empty target_chunk'
    });
  }

  if (!lego.known_chunk || !lego.known_chunk.trim()) {
    issues.push({
      type: 'EMPTY_CHUNK',
      severity: 'CRITICAL',
      lego_id: lego.lego_id,
      message: 'Empty known_chunk'
    });
  }

  return issues;
}

/**
 * Validate translations sync
 */
function validateTranslationSync(breakdown, translations) {
  const issues = [];

  const seedId = breakdown.seed_id;
  const translation = translations[seedId];

  if (!translation) {
    issues.push({
      type: 'TRANSLATION_MISSING',
      severity: 'HIGH',
      seed_id: seedId,
      message: `No translation found for ${seedId} in translations.json`
    });
    return issues;
  }

  const [targetTranslation, knownTranslation] = translation;

  if (breakdown.original_target !== targetTranslation) {
    issues.push({
      type: 'TRANSLATION_MISMATCH',
      severity: 'CRITICAL',
      seed_id: seedId,
      expected: targetTranslation,
      actual: breakdown.original_target,
      message: `LEGO breakdown target doesn't match translations.json`
    });
  }

  if (breakdown.original_known !== knownTranslation) {
    issues.push({
      type: 'TRANSLATION_MISMATCH',
      severity: 'CRITICAL',
      seed_id: seedId,
      expected: knownTranslation,
      actual: breakdown.original_known,
      message: `LEGO breakdown known doesn't match translations.json`
    });
  }

  return issues;
}

/**
 * Validate seed structure
 */
function validateSeedBreakdown(breakdown, translations, courseMetadata) {
  const issues = [];

  // Check translations sync
  issues.push(...validateTranslationSync(breakdown, translations));

  // Validate each LEGO pair
  if (breakdown.lego_pairs && Array.isArray(breakdown.lego_pairs)) {
    for (const lego of breakdown.lego_pairs) {
      const legoIssues = validateLegoPair(lego, breakdown.seed_id, courseMetadata);
      issues.push(...legoIssues.map(issue => ({
        ...issue,
        seed_id: breakdown.seed_id
      })));
    }
  } else {
    issues.push({
      type: 'MISSING_LEGO_PAIRS',
      severity: 'CRITICAL',
      seed_id: breakdown.seed_id,
      message: 'No lego_pairs array found'
    });
  }

  // Check for feeder_pairs if there are COMPOSITE LEGOs
  const hasComposite = breakdown.lego_pairs?.some(l => l.lego_type === 'COMPOSITE');
  if (hasComposite && (!breakdown.feeder_pairs || breakdown.feeder_pairs.length === 0)) {
    issues.push({
      type: 'MISSING_FEEDERS',
      severity: 'LOW',
      seed_id: breakdown.seed_id,
      message: 'Seed has COMPOSITE LEGOs but no feeder_pairs (may be intentional)'
    });
  }

  return issues;
}

/**
 * Generate validation report
 */
function generateReport(allIssues, courseName) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`${colors.cyan}LEGO BREAKDOWNS VALIDATION REPORT${colors.reset}`);
  console.log(`Course: ${colors.blue}${courseName}${colors.reset}`);
  console.log(`${'═'.repeat(70)}\n`);

  // Group by severity
  const critical = allIssues.filter(i => i.severity === 'CRITICAL');
  const high = allIssues.filter(i => i.severity === 'HIGH');
  const medium = allIssues.filter(i => i.severity === 'MEDIUM');
  const low = allIssues.filter(i => i.severity === 'LOW');

  // Summary
  console.log(`${colors.magenta}SUMMARY${colors.reset}`);
  console.log(`  Total Issues: ${allIssues.length}`);
  console.log(`  ${colors.red}CRITICAL: ${critical.length}${colors.reset}`);
  console.log(`  ${colors.yellow}HIGH: ${high.length}${colors.reset}`);
  console.log(`  ${colors.blue}MEDIUM: ${medium.length}${colors.reset}`);
  console.log(`  ${colors.gray}LOW: ${low.length}${colors.reset}\n`);

  // Critical issues (must fix)
  if (critical.length > 0) {
    console.log(`${colors.red}🚨 CRITICAL ISSUES (Must Fix)${colors.reset}`);
    console.log(`${'─'.repeat(70)}`);
    for (const issue of critical) {
      console.log(`\n  ${colors.red}●${colors.reset} ${issue.seed_id || 'GLOBAL'} - ${issue.type}`);
      console.log(`    ${issue.message}`);
      if (issue.lego_id) console.log(`    LEGO: ${issue.lego_id}`);
      if (issue.target_chunk) console.log(`    Target: "${issue.target_chunk}"`);
      if (issue.known_chunk) console.log(`    Known: "${issue.known_chunk}"`);
    }
    console.log();
  }

  // High priority issues
  if (high.length > 0) {
    console.log(`${colors.yellow}⚠️  HIGH PRIORITY ISSUES${colors.reset}`);
    console.log(`${'─'.repeat(70)}`);
    for (const issue of high.slice(0, 10)) {
      console.log(`\n  ${colors.yellow}●${colors.reset} ${issue.seed_id || 'GLOBAL'} - ${issue.type}`);
      console.log(`    ${issue.message}`);
    }
    if (high.length > 10) {
      console.log(`\n  ... and ${high.length - 10} more HIGH priority issues`);
    }
    console.log();
  }

  // Medium/Low summary
  if (medium.length > 0 || low.length > 0) {
    console.log(`${colors.blue}ℹ️  MEDIUM/LOW PRIORITY ISSUES${colors.reset}`);
    console.log(`  ${medium.length} medium priority, ${low.length} low priority`);
    console.log(`  Run with --verbose to see all issues\n`);
  }

  // Final verdict
  console.log(`${'═'.repeat(70)}`);
  if (critical.length === 0 && high.length === 0) {
    console.log(`${colors.green}✅ VALIDATION PASSED${colors.reset} - No critical or high-priority issues`);
  } else {
    console.log(`${colors.red}❌ VALIDATION FAILED${colors.reset} - Fix critical/high-priority issues`);
  }
  console.log(`${'═'.repeat(70)}\n`);

  return {
    passed: critical.length === 0 && high.length === 0,
    total: allIssues.length,
    critical: critical.length,
    high: high.length,
    medium: medium.length,
    low: low.length
  };
}

/**
 * Validate a course directory
 */
async function validateCourse(courseDir) {
  const coursePath = path.resolve(courseDir);
  const courseName = path.basename(coursePath);

  // Load files
  const legoPath = path.join(coursePath, 'LEGO_BREAKDOWNS_COMPLETE.json');
  const translationsPath = path.join(coursePath, 'translations.json');

  if (!await fs.pathExists(legoPath)) {
    console.error(`${colors.red}Error: ${legoPath} not found${colors.reset}`);
    return null;
  }

  if (!await fs.pathExists(translationsPath)) {
    console.error(`${colors.red}Error: ${translationsPath} not found${colors.reset}`);
    return null;
  }

  const legoData = await fs.readJson(legoPath);
  const translations = await fs.readJson(translationsPath);

  const courseMetadata = legoData.course_metadata || {};

  // Validate each seed
  const allIssues = [];

  for (const breakdown of legoData.lego_breakdowns || []) {
    const seedIssues = validateSeedBreakdown(breakdown, translations, courseMetadata);
    allIssues.push(...seedIssues);
  }

  // Generate report
  const report = generateReport(allIssues, courseName);

  return { ...report, issues: allIssues };
}

/**
 * Validate all courses
 */
async function validateAllCourses() {
  const coursesDir = path.resolve(__dirname);
  const entries = await fs.readdir(coursesDir);

  const results = [];

  for (const entry of entries) {
    const entryPath = path.join(coursesDir, entry);
    const stat = await fs.stat(entryPath);

    if (stat.isDirectory() && entry.includes('_for_')) {
      console.log(`\n${colors.cyan}Validating ${entry}...${colors.reset}`);
      const result = await validateCourse(entryPath);
      if (result) {
        results.push({ course: entry, ...result });
      }
    }
  }

  // Overall summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`${colors.cyan}MULTI-COURSE VALIDATION SUMMARY${colors.reset}`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const result of results) {
    const status = result.passed ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
    console.log(`${status}  ${result.course}`);
    console.log(`       Critical: ${result.critical}, High: ${result.high}, Medium: ${result.medium}, Low: ${result.low}`);
  }

  console.log();
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`${colors.yellow}Usage:${colors.reset}`);
    console.log(`  node validate-lego-breakdowns.cjs <course_dir>`);
    console.log(`  node validate-lego-breakdowns.cjs spa_for_eng_30seeds`);
    console.log(`  node validate-lego-breakdowns.cjs --all\n`);
    process.exit(1);
  }

  if (args[0] === '--all') {
    await validateAllCourses();
  } else {
    const result = await validateCourse(args[0]);
    if (result && !result.passed) {
      process.exit(1);
    }
  }
}

main().catch(err => {
  console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
  process.exit(1);
});
