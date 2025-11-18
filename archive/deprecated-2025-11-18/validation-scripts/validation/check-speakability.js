#!/usr/bin/env node

/**
 * SPEAKABILITY CHECKER
 *
 * This script checks phrases with 4+ LEGOs for speakability issues in both languages:
 * - Checks for awkward phrasing
 * - Identifies very long phrases without natural breaks
 * - Looks for grammar issues (KNOWN language gerunds, etc.)
 * - Validates natural word flow
 *
 * Usage: node check-speakability.js [course_path]
 * Example: node check-speakability.js public/vfs/courses/spa_for_eng
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes
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

// Known problematic patterns in KNOWN language (English)
const knownLanguageIssues = [
  {
    name: 'GERUND_WITHOUT_ARTICLE',
    pattern: /\b(?<!forward )to \w+ing\b/i,
    exclude: /\blooking forward to \w+ing\b/i, // "looking forward to [gerund]" is correct
    message: 'Gerund without article (e.g., "to speaking" should be "to speak")',
    severity: 'HIGH'
  },
  {
    name: 'DOUBLE_TO',
    pattern: /\bto to\b/i,
    message: 'Double "to" - grammatical error',
    severity: 'HIGH'
  },
  {
    name: 'AWKWARD_GERUND',
    pattern: /\b(for \w+ing something)\b/i,
    message: 'Awkward gerund construction',
    severity: 'MEDIUM'
  }
];

// Speakability issues common to both languages
const generalIssues = [
  {
    name: 'VERY_LONG_WITHOUT_CONJUNCTION',
    check: (phrase, legoCount) => {
      const words = phrase.split(/\s+/).length;
      const hasConjunction = /\b(and|but|if|when|because|although|so|while|or|y|pero|si|cuando|porque|aunque|así que|mientras|o)\b/i.test(phrase);
      return legoCount >= 6 && words >= 10 && !hasConjunction;
    },
    message: 'Long phrase (6+ LEGOs) without conjunctions - may be hard to speak naturally',
    severity: 'MEDIUM'
  },
  {
    name: 'EXCESSIVE_LENGTH',
    check: (phrase, legoCount) => {
      const words = phrase.split(/\s+/).length;
      return legoCount >= 7 && words >= 15;
    },
    message: 'Excessively long phrase - consider breaking into smaller chunks',
    severity: 'LOW'
  },
  {
    name: 'REPETITIVE_WORDS',
    check: (phrase) => {
      const words = phrase.toLowerCase().split(/\s+/);
      const wordCounts = {};
      words.forEach(w => {
        if (w.length > 3) { // Only check words longer than 3 chars
          wordCounts[w] = (wordCounts[w] || 0) + 1;
        }
      });
      return Object.values(wordCounts).some(count => count >= 3);
    },
    message: 'Same word repeated 3+ times - may sound unnatural',
    severity: 'MEDIUM'
  }
];

// Spanish-specific issues
const targetLanguageIssues = [
  {
    name: 'MISSING_PREPOSITION_DE',
    pattern: /un poco español/i, // Should be "un poco de español"
    message: 'Missing preposition "de" (should be "un poco de español")',
    severity: 'HIGH'
  },
  {
    name: 'DOUBLE_ARTICLE',
    pattern: /\b(la la|el el|un un|una una)\b/i,
    message: 'Repeated article - grammatical error',
    severity: 'HIGH'
  }
];

function checkSpeakability(basketsPath) {
  const issues = [];
  let totalPhrasesChecked = 0;
  let phrasesWithFourPlusLegos = 0;

  // Get all basket files
  const files = fs.readdirSync(basketsPath)
    .filter(f => f.startsWith('lego_baskets_s') && f.endsWith('.json'))
    .sort();

  log('\n' + '='.repeat(80), 'cyan');
  log('SPEAKABILITY CHECKER - Phrases with 4+ LEGOs', 'bold');
  log('='.repeat(80), 'cyan');
  log(`\nAnalyzing ${files.length} basket files...\n`, 'blue');

  for (const file of files) {
    const filePath = path.join(basketsPath, file);
    const basket = parseBasketFile(filePath);

    if (!basket) continue;

    const seedId = basket.seed;

    // Get all LEGO sections
    const legoKeys = Object.keys(basket).filter(key => key.match(/S\d{4}L\d{2}/));

    for (const legoKey of legoKeys) {
      const legoSection = basket[legoKey];

      if (legoSection.practice_phrases && Array.isArray(legoSection.practice_phrases)) {
        for (let i = 0; i < legoSection.practice_phrases.length; i++) {
          const [known, target, pattern, legoCount] = legoSection.practice_phrases[i];

          // Only check phrases with 4+ LEGOs
          if (legoCount >= 4) {
            totalPhrasesChecked++;
            phrasesWithFourPlusLegos++;

            // Check KNOWN language (English) issues
            for (const issue of knownLanguageIssues) {
              // Check if pattern matches and exclude pattern doesn't match
              const patternMatches = issue.pattern.test(known);
              const excludeMatches = issue.exclude ? issue.exclude.test(known) : false;

              if (patternMatches && !excludeMatches) {
                issues.push({
                  type: issue.name,
                  severity: issue.severity,
                  language: 'KNOWN (English)',
                  seedId,
                  legoKey,
                  phraseIndex: i,
                  known,
                  target,
                  legoCount,
                  message: issue.message
                });
              }
            }

            // Check TARGET language (Spanish) issues
            for (const issue of targetLanguageIssues) {
              if (issue.pattern.test(target)) {
                issues.push({
                  type: issue.name,
                  severity: issue.severity,
                  language: 'TARGET (Spanish)',
                  seedId,
                  legoKey,
                  phraseIndex: i,
                  known,
                  target,
                  legoCount,
                  message: issue.message
                });
              }
            }

            // Check general issues
            for (const issue of generalIssues) {
              if (issue.check(known, legoCount) || issue.check(target, legoCount)) {
                issues.push({
                  type: issue.name,
                  severity: issue.severity,
                  language: 'BOTH',
                  seedId,
                  legoKey,
                  phraseIndex: i,
                  known,
                  target,
                  legoCount,
                  message: issue.message
                });
              }
            }
          }
        }
      }
    }
  }

  // Print results
  log('\n' + '-'.repeat(80), 'cyan');
  log('SUMMARY', 'bold');
  log('-'.repeat(80), 'cyan');
  log(`Total Phrases with 4+ LEGOs: ${phrasesWithFourPlusLegos}`, 'blue');
  log(`Speakability Issues Found: ${issues.length}`, issues.length > 0 ? 'yellow' : 'green');

  // Count by severity
  const bySeverity = {
    HIGH: issues.filter(i => i.severity === 'HIGH').length,
    MEDIUM: issues.filter(i => i.severity === 'MEDIUM').length,
    LOW: issues.filter(i => i.severity === 'LOW').length
  };

  log(`  - HIGH severity: ${bySeverity.HIGH}`, bySeverity.HIGH > 0 ? 'red' : 'green');
  log(`  - MEDIUM severity: ${bySeverity.MEDIUM}`, bySeverity.MEDIUM > 0 ? 'yellow' : 'green');
  log(`  - LOW severity: ${bySeverity.LOW}`, bySeverity.LOW > 0 ? 'blue' : 'green');

  if (issues.length > 0) {
    log('\n' + '-'.repeat(80), 'yellow');
    log('ISSUES DETAILS', 'bold');
    log('-'.repeat(80), 'yellow');

    // Group by severity
    ['HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
      const severityIssues = issues.filter(i => i.severity === severity);
      if (severityIssues.length > 0) {
        log(`\n${'━'.repeat(80)}`, severity === 'HIGH' ? 'red' : severity === 'MEDIUM' ? 'yellow' : 'blue');
        log(`${severity} SEVERITY (${severityIssues.length} issues)`, 'bold');
        log('━'.repeat(80), severity === 'HIGH' ? 'red' : severity === 'MEDIUM' ? 'yellow' : 'blue');

        severityIssues.forEach((issue, idx) => {
          log(`\n  ${idx + 1}. ${issue.type} [${issue.language}]`, severity === 'HIGH' ? 'red' : severity === 'MEDIUM' ? 'yellow' : 'blue');
          log(`     Location: ${issue.seedId} ${issue.legoKey} (phrase #${issue.phraseIndex + 1})`, 'white');
          log(`     LEGOs: ${issue.legoCount}`, 'white');
          log(`     Known: "${issue.known}"`, 'cyan');
          log(`     Target: "${issue.target}"`, 'magenta');
          log(`     Issue: ${issue.message}`, 'white');
        });
      }
    });
  } else {
    log('\n✓ No speakability issues found! All phrases with 4+ LEGOs are natural and grammatically correct.', 'green');
  }

  log('\n' + '='.repeat(80), 'cyan');

  return {
    totalPhrasesChecked: phrasesWithFourPlusLegos,
    issues,
    bySeverity,
    success: bySeverity.HIGH === 0 // Only fail on HIGH severity issues
  };
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const coursePath = process.argv[2] || 'public/vfs/courses/spa_for_eng';
  const basketsPath = path.join(coursePath, 'baskets');

  if (!fs.existsSync(basketsPath)) {
    log(`Error: Baskets directory not found at ${basketsPath}`, 'red');
    log('Usage: node check-speakability.js [course_path]', 'yellow');
    log('Example: node check-speakability.js public/vfs/courses/spa_for_eng', 'yellow');
    process.exit(1);
  }

  const result = checkSpeakability(basketsPath);
  process.exit(result.success ? 0 : 1);
}

export { checkSpeakability };
