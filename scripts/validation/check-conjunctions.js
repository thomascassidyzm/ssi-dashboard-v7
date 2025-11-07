#!/usr/bin/env node

/**
 * CONJUNCTION USAGE CHECKER
 *
 * This script analyzes longer phrases to ensure they use conjunctions effectively:
 * - Identifies phrases that would benefit from conjunctions
 * - Checks proper conjunction usage in complex sentences
 * - Validates natural flow in multi-clause phrases
 * - Ensures very long phrases have appropriate connectors
 *
 * Usage: node check-conjunctions.js [course_path]
 * Example: node check-conjunctions.js public/vfs/courses/spa_for_eng
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

// English conjunctions and connectors
const englishConjunctions = {
  coordinating: ['and', 'but', 'or', 'nor', 'for', 'yet', 'so'],
  subordinating: ['if', 'when', 'while', 'because', 'although', 'though', 'since',
                  'unless', 'until', 'before', 'after', 'as', 'where'],
  correlative: ['both...and', 'either...or', 'neither...nor', 'not only...but also'],
  transitional: ['however', 'therefore', 'moreover', 'furthermore', 'nevertheless']
};

// Spanish conjunctions and connectors
const spanishConjunctions = {
  coordinating: ['y', 'e', 'pero', 'o', 'u', 'ni', 'mas', 'sino'],
  subordinating: ['si', 'cuando', 'mientras', 'porque', 'aunque', 'como', 'donde',
                  'hasta que', 'antes de que', 'después de que', 'para que', 'sin que'],
  correlative: ['tanto...como', 'ni...ni', 'o...o'],
  transitional: ['sin embargo', 'por lo tanto', 'además', 'no obstante']
};

function getAllConjunctions(lang) {
  const conjSet = lang === 'english' ? englishConjunctions : spanishConjunctions;
  return Object.values(conjSet).flat().map(c => c.split('...')[0]); // Handle correlatives
}

function hasConjunction(phrase, lang) {
  const conjunctions = getAllConjunctions(lang);
  const words = phrase.toLowerCase().split(/\s+/);
  return conjunctions.some(conj => words.includes(conj.toLowerCase()));
}

function countClauses(phrase) {
  // Rough estimate: count verbs as proxy for clauses
  const verbPatterns = [
    /\b(am|is|are|was|were|be|been|being)\b/gi,
    /\b(have|has|had|having)\b/gi,
    /\b(do|does|did|doing)\b/gi,
    /\b(can|could|will|would|shall|should|may|might|must)\b/gi,
    /\b\w+ing\b/gi,  // gerunds
    /\b\w+ed\b/gi    // past tense
  ];

  let verbCount = 0;
  verbPatterns.forEach(pattern => {
    const matches = phrase.match(pattern);
    if (matches) verbCount += matches.length;
  });

  return Math.max(1, Math.floor(verbCount / 2)); // Rough estimate
}

function analyzeConjunctionUsage(phrase, lang) {
  const conjunctions = getAllConjunctions(lang);
  const words = phrase.toLowerCase().split(/\s+/);
  const foundConjunctions = [];

  conjunctions.forEach(conj => {
    const conjWords = conj.toLowerCase().split(/\s+/);
    for (let i = 0; i <= words.length - conjWords.length; i++) {
      const match = conjWords.every((cw, j) => words[i + j] === cw);
      if (match) {
        foundConjunctions.push({
          conjunction: conj,
          position: i
        });
      }
    }
  });

  return foundConjunctions;
}

function checkConjunctions(basketsPath) {
  const issues = [];
  const goodExamples = [];
  let totalLongPhrases = 0;
  let phrasesWithConjunctions = 0;

  // Get all basket files
  const files = fs.readdirSync(basketsPath)
    .filter(f => f.startsWith('lego_baskets_s') && f.endsWith('.json'))
    .sort();

  log('\n' + '='.repeat(80), 'cyan');
  log('CONJUNCTION USAGE CHECKER', 'bold');
  log('='.repeat(80), 'cyan');
  log(`\nAnalyzing ${files.length} basket files...\n`, 'blue');

  for (const file of files) {
    const filePath = path.join(basketsPath, file);
    const basket = parseBasketFile(filePath);

    if (!basket) continue;

    const seedId = basket.seed;
    const legoKeys = Object.keys(basket).filter(key => key.match(/S\d{4}L\d{2}/));

    for (const legoKey of legoKeys) {
      const legoSection = basket[legoKey];

      if (legoSection.practice_phrases && Array.isArray(legoSection.practice_phrases)) {
        for (let i = 0; i < legoSection.practice_phrases.length; i++) {
          const [known, target, pattern, legoCount] = legoSection.practice_phrases[i];

          // Focus on phrases with 4+ LEGOs
          if (legoCount >= 4) {
            totalLongPhrases++;

            const knownWords = known.split(/\s+/).length;
            const targetWords = target.split(/\s+/).length;

            const knownHasConj = hasConjunction(known, 'english');
            const targetHasConj = hasConjunction(target, 'spanish');

            if (knownHasConj || targetHasConj) {
              phrasesWithConjunctions++;
            }

            const knownConjs = analyzeConjunctionUsage(known, 'english');
            const targetConjs = analyzeConjunctionUsage(target, 'spanish');

            // Check for missing conjunctions in very long phrases
            if (legoCount >= 6 && knownWords >= 10 && !knownHasConj) {
              issues.push({
                type: 'MISSING_CONJUNCTION',
                severity: 'MEDIUM',
                seedId,
                legoKey,
                phraseIndex: i,
                known,
                target,
                legoCount,
                wordCount: knownWords,
                message: `Long phrase (${legoCount} LEGOs, ${knownWords} words) without conjunction - may be hard to speak naturally`
              });
            }

            // Check for good conjunction usage (for positive examples)
            if (legoCount >= 5 && knownConjs.length > 0 && targetConjs.length > 0) {
              goodExamples.push({
                seedId,
                legoKey,
                known,
                target,
                legoCount,
                knownConjs: knownConjs.map(c => c.conjunction),
                targetConjs: targetConjs.map(c => c.conjunction)
              });
            }

            // Check for mismatched conjunction usage
            if ((knownHasConj && !targetHasConj) || (!knownHasConj && targetHasConj)) {
              issues.push({
                type: 'CONJUNCTION_MISMATCH',
                severity: 'LOW',
                seedId,
                legoKey,
                phraseIndex: i,
                known,
                target,
                legoCount,
                knownHasConj,
                targetHasConj,
                message: `Conjunction usage differs between languages (EN: ${knownHasConj}, ES: ${targetHasConj})`
              });
            }

            // Check for excessive conjunctions (multiple in short phrase)
            if (legoCount <= 4 && (knownConjs.length > 1 || targetConjs.length > 1)) {
              issues.push({
                type: 'EXCESSIVE_CONJUNCTIONS',
                severity: 'LOW',
                seedId,
                legoKey,
                phraseIndex: i,
                known,
                target,
                legoCount,
                message: `Short phrase (${legoCount} LEGOs) has multiple conjunctions - may be overly complex`
              });
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
  log(`Total Phrases with 4+ LEGOs: ${totalLongPhrases}`, 'blue');
  log(`Phrases with Conjunctions: ${phrasesWithConjunctions} (${Math.round(phrasesWithConjunctions/totalLongPhrases*100)}%)`, 'blue');
  log(`Conjunction Issues Found: ${issues.length}`, issues.length > 0 ? 'yellow' : 'green');
  log(`Good Conjunction Examples: ${goodExamples.length}`, 'green');

  // Count by severity
  const bySeverity = {
    HIGH: issues.filter(i => i.severity === 'HIGH').length,
    MEDIUM: issues.filter(i => i.severity === 'MEDIUM').length,
    LOW: issues.filter(i => i.severity === 'LOW').length
  };

  log(`\nIssue Breakdown:`, 'bold');
  log(`  - HIGH severity: ${bySeverity.HIGH}`, bySeverity.HIGH > 0 ? 'red' : 'green');
  log(`  - MEDIUM severity: ${bySeverity.MEDIUM}`, bySeverity.MEDIUM > 0 ? 'yellow' : 'green');
  log(`  - LOW severity: ${bySeverity.LOW}`, bySeverity.LOW > 0 ? 'blue' : 'green');

  // Show good examples first (limited to 5)
  if (goodExamples.length > 0) {
    log('\n' + '━'.repeat(80), 'green');
    log(`GOOD EXAMPLES - Natural Conjunction Usage (showing ${Math.min(5, goodExamples.length)} of ${goodExamples.length})`, 'bold');
    log('━'.repeat(80), 'green');

    goodExamples.slice(0, 5).forEach((ex, idx) => {
      log(`\n  ${idx + 1}. ${ex.seedId} ${ex.legoKey} (${ex.legoCount} LEGOs)`, 'green');
      log(`     Known: "${ex.known}"`, 'cyan');
      log(`     Conjunctions: ${ex.knownConjs.join(', ')}`, 'white');
      log(`     Target: "${ex.target}"`, 'magenta');
      log(`     Conjunctions: ${ex.targetConjs.join(', ')}`, 'white');
    });
  }

  // Show issues
  if (issues.length > 0) {
    log('\n' + '-'.repeat(80), 'yellow');
    log('ISSUES DETAILS', 'bold');
    log('-'.repeat(80), 'yellow');

    // Group by type
    const byType = {};
    issues.forEach(i => {
      if (!byType[i.type]) byType[i.type] = [];
      byType[i.type].push(i);
    });

    for (const [type, items] of Object.entries(byType)) {
      log(`\n${'━'.repeat(80)}`, 'yellow');
      log(`${type} (${items.length} issues)`, 'bold');
      log('━'.repeat(80), 'yellow');

      items.slice(0, 10).forEach((issue, idx) => {  // Limit to 10 per type
        log(`\n  ${idx + 1}. ${issue.seedId} ${issue.legoKey} (${issue.legoCount} LEGOs)`, 'yellow');
        log(`     Known: "${issue.known}"`, 'cyan');
        log(`     Target: "${issue.target}"`, 'magenta');
        log(`     Issue: ${issue.message}`, 'white');
      });

      if (items.length > 10) {
        log(`\n     ... and ${items.length - 10} more`, 'yellow');
      }
    }
  } else {
    log('\n✓ No conjunction issues found! All longer phrases use conjunctions effectively.', 'green');
  }

  log('\n' + '='.repeat(80), 'cyan');

  return {
    totalLongPhrases,
    phrasesWithConjunctions,
    issues,
    goodExamples,
    bySeverity,
    success: bySeverity.HIGH === 0
  };
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const coursePath = process.argv[2] || 'public/vfs/courses/spa_for_eng';
  const basketsPath = path.join(coursePath, 'baskets');

  if (!fs.existsSync(basketsPath)) {
    log(`Error: Baskets directory not found at ${basketsPath}`, 'red');
    log('Usage: node check-conjunctions.js [course_path]', 'yellow');
    log('Example: node check-conjunctions.js public/vfs/courses/spa_for_eng', 'yellow');
    process.exit(1);
  }

  const result = checkConjunctions(basketsPath);
  process.exit(result.success ? 0 : 1);
}

export { checkConjunctions };
