#!/usr/bin/env node

/**
 * GATE VIOLATION CHECKER
 *
 * This script validates that all practice phrases in LEGO baskets only use:
 * - LEGOs that are available at that point in the curriculum
 * - Patterns that are available at that point in the curriculum
 *
 * Usage: node check-gate-violations.js [course_path]
 * Example: node check-gate-violations.js public/vfs/courses/spa_for_eng
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function parseBasketFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    log(`Error reading ${filePath}: ${error.message}`, 'red');
    return null;
  }
}

function extractLegoId(legoKey) {
  // Extract S0001L01 from "S0001L01" key
  const match = legoKey.match(/S\d{4}L\d{2}/);
  return match ? match[0] : null;
}

function checkGateViolations(basketsPath) {
  const violations = [];
  let totalPhrases = 0;
  let totalBaskets = 0;
  let totalLegoSections = 0;

  // Get all basket files
  const files = fs.readdirSync(basketsPath)
    .filter(f => f.startsWith('lego_baskets_s') && f.endsWith('.json'))
    .sort();

  log('\n' + '='.repeat(80), 'cyan');
  log('GATE VIOLATION CHECKER', 'bold');
  log('='.repeat(80), 'cyan');
  log(`\nAnalyzing ${files.length} basket files...\n`, 'blue');

  // Track cumulative LEGOs across all seeds
  const allAvailableLegos = new Set();
  const allAvailablePatterns = new Set();

  for (const file of files) {
    const filePath = path.join(basketsPath, file);
    const basket = parseBasketFile(filePath);

    if (!basket) continue;

    totalBaskets++;
    const seedId = basket.seed;
    const patternsIntroduced = basket.patterns_introduced || '';
    const cumulativePatterns = basket.cumulative_patterns || [];

    // Get all LEGO sections in this basket
    const legoKeys = Object.keys(basket).filter(key => key.match(/S\d{4}L\d{2}/));

    for (const legoKey of legoKeys) {
      const legoSection = basket[legoKey];
      totalLegoSections++;

      // Add this LEGO to available set
      const currentLegoId = extractLegoId(legoKey);
      allAvailableLegos.add(currentLegoId);

      // Add patterns from this LEGO
      if (legoSection.available_patterns) {
        legoSection.available_patterns.forEach(p => allAvailablePatterns.add(p));
      }

      // Allowed patterns include:
      // 1. Available patterns (from previous LEGOs)
      // 2. Patterns introduced in this seed (pattern_coverage for this LEGO)
      // 3. Cumulative patterns up to this seed
      const allowedPatterns = new Set([
        ...(legoSection.available_patterns || []),
        ...(legoSection.pattern_coverage ? legoSection.pattern_coverage.split(', ') : []),
        ...cumulativePatterns
      ]);

      // Check each practice phrase
      if (legoSection.practice_phrases && Array.isArray(legoSection.practice_phrases)) {
        for (let i = 0; i < legoSection.practice_phrases.length; i++) {
          const phrase = legoSection.practice_phrases[i];
          totalPhrases++;

          const [known, target, pattern, legoCount] = phrase;

          // Check if lego count seems suspicious (too high for available LEGOs)
          if (legoCount > legoSection.available_legos + 1) {
            violations.push({
              type: 'LEGO_COUNT_MISMATCH',
              seedId,
              legoKey,
              phraseIndex: i,
              phrase: known,
              legoCount,
              availableLegos: legoSection.available_legos,
              message: `Phrase uses ${legoCount} LEGOs but only ${legoSection.available_legos + 1} should be available`
            });
          }

          // Check if pattern is valid (only if pattern is not null)
          if (pattern) {
            // Handle multiple patterns separated by commas
            const patterns = pattern.split(',').map(p => p.trim());
            const invalidPatterns = patterns.filter(p => !allowedPatterns.has(p));

            if (invalidPatterns.length > 0) {
              violations.push({
                type: 'PATTERN_VIOLATION',
                seedId,
                legoKey,
                phraseIndex: i,
                phrase: known,
                pattern,
                invalidPatterns,
                allowedPatterns: Array.from(allowedPatterns),
                message: `Pattern(s) ${invalidPatterns.join(', ')} not in allowed patterns [${Array.from(allowedPatterns).join(', ')}]`
              });
            }
          }
        }
      }

      // Check gate_compliance field exists
      if (!legoSection.gate_compliance) {
        violations.push({
          type: 'MISSING_GATE_COMPLIANCE',
          seedId,
          legoKey,
          message: `Missing gate_compliance field`
        });
      }
    }
  }

  // Print results
  log('\n' + '-'.repeat(80), 'cyan');
  log('SUMMARY', 'bold');
  log('-'.repeat(80), 'cyan');
  log(`Total Baskets Analyzed: ${totalBaskets}`, 'blue');
  log(`Total LEGO Sections: ${totalLegoSections}`, 'blue');
  log(`Total Practice Phrases: ${totalPhrases}`, 'blue');
  log(`Gate Violations Found: ${violations.length}\n`, violations.length > 0 ? 'red' : 'green');

  if (violations.length > 0) {
    log('-'.repeat(80), 'yellow');
    log('VIOLATIONS DETAILS', 'bold');
    log('-'.repeat(80), 'yellow');

    // Group by type
    const byType = {};
    violations.forEach(v => {
      if (!byType[v.type]) byType[v.type] = [];
      byType[v.type].push(v);
    });

    for (const [type, items] of Object.entries(byType)) {
      log(`\n${type}: ${items.length} violations`, 'red');
      items.forEach((v, idx) => {
        log(`\n  ${idx + 1}. ${v.seedId} ${v.legoKey}`, 'yellow');
        if (v.phrase) log(`     Phrase: "${v.phrase}"`, 'white');
        log(`     ${v.message}`, 'white');
      });
    }
  } else {
    log('✓ No gate violations found! All phrases respect GATE compliance rules.', 'green');
  }

  log('\n' + '='.repeat(80), 'cyan');

  return {
    totalBaskets,
    totalLegoSections,
    totalPhrases,
    violations,
    success: violations.length === 0
  };
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const coursePath = process.argv[2] || 'public/vfs/courses/spa_for_eng';
  const basketsPath = path.join(coursePath, 'baskets');

  if (!fs.existsSync(basketsPath)) {
    log(`Error: Baskets directory not found at ${basketsPath}`, 'red');
    log('Usage: node check-gate-violations.js [course_path]', 'yellow');
    log('Example: node check-gate-violations.js public/vfs/courses/spa_for_eng', 'yellow');
    process.exit(1);
  }

  const result = checkGateViolations(basketsPath);
  process.exit(result.success ? 0 : 1);
}

export { checkGateViolations };
