#!/usr/bin/env node

/**
 * INFINITIVE FORM LINGUISTIC VALIDATOR
 *
 * Validates that English LEGOs follow proper infinitive construction rules:
 *
 * IRON RULES:
 * 1. Standalone infinitive LEGOs MUST include "to" (e.g., "to speak", NOT "speak")
 * 2. Infinitive LEGOs within modal constructions MAY be bare infinitives
 *    (e.g., "can or can't remember" - "remember" is bare after modal)
 * 3. Initial/starting position LEGOs with infinitives MUST use "to" form
 * 4. Composite infinitive LEGOs MUST maintain "to" (e.g., "to speak with you")
 *
 * BAD EXAMPLES (violations):
 * - "speak with you" (should be "to speak with you")
 * - "speak Mandarin Chinese with you" (should be "to speak Mandarin Chinese with you")
 *
 * GOOD EXAMPLES (compliant):
 * - "to speak with you" ✓
 * - "want to speak Mandarin Chinese with you" ✓
 * - "can or can't remember" ✓ (bare infinitive after modal)
 *
 * Usage: node check-infinitive-forms.js [lego_pairs_path]
 * Example: node check-infinitive-forms.js public/vfs/courses/cmn_for_eng/lego_pairs.json
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

// Common English infinitive verbs
const COMMON_INFINITIVE_VERBS = [
  'speak', 'say', 'talk', 'tell', 'ask', 'answer',
  'go', 'come', 'walk', 'run', 'move', 'travel',
  'do', 'make', 'have', 'get', 'take', 'give',
  'see', 'look', 'watch', 'hear', 'listen',
  'think', 'know', 'understand', 'learn', 'study',
  'remember', 'forget', 'want', 'need', 'like',
  'eat', 'drink', 'cook', 'buy', 'sell',
  'write', 'read', 'send', 'receive',
  'help', 'work', 'play', 'try', 'use',
  'open', 'close', 'start', 'stop', 'finish',
  'call', 'meet', 'visit', 'leave', 'arrive',
  'feel', 'become', 'seem', 'find', 'believe'
];

// Modal verbs that take bare infinitives
const MODAL_VERBS = [
  'can', 'could', 'may', 'might', 'must',
  'shall', 'should', 'will', 'would',
  'ought to', 'used to', 'need to', 'have to',
  "can't", "couldn't", "won't", "wouldn't",
  "shouldn't", "mustn't", "may not", "might not"
];

// Verbs that take bare infinitives (causatives, perception)
const BARE_INFINITIVE_TRIGGERS = [
  'let', 'make', 'have',
  'see', 'watch', 'hear', 'feel', 'notice'
];

/**
 * Check if a text contains a modal verb
 */
function containsModal(text) {
  const lowerText = text.toLowerCase();
  return MODAL_VERBS.some(modal => {
    // Check for modal at start or after common words
    const patterns = [
      new RegExp(`^${modal}\\s`, 'i'),
      new RegExp(`\\s${modal}\\s`, 'i'),
      new RegExp(`or\\s${modal}\\s`, 'i'),
      new RegExp(`n't\\s${modal}\\s`, 'i')
    ];
    return patterns.some(pattern => pattern.test(lowerText));
  });
}

/**
 * Check if text contains bare infinitive trigger
 */
function containsBareInfinitiveTrigger(text) {
  const lowerText = text.toLowerCase();
  return BARE_INFINITIVE_TRIGGERS.some(trigger => {
    return new RegExp(`\\b${trigger}\\s+(?:me|you|him|her|it|us|them|\\w+)\\s+\\w+`).test(lowerText);
  });
}

/**
 * Check if text starts with a bare infinitive verb (violation candidate)
 */
function startsWithBareInfinitive(text) {
  const trimmed = text.trim();
  const firstWord = trimmed.split(/\s+/)[0].toLowerCase();

  // Check if first word is a common infinitive verb
  return COMMON_INFINITIVE_VERBS.includes(firstWord);
}

/**
 * Check if text contains "to + verb" pattern
 */
function hasToInfinitive(text) {
  const lowerText = text.toLowerCase();

  // Check for "to verb" pattern
  return COMMON_INFINITIVE_VERBS.some(verb => {
    return new RegExp(`\\bto\\s+${verb}\\b`).test(lowerText);
  });
}

/**
 * Analyze a LEGO for infinitive form violations
 *
 * IMPORTANT: Each LEGO must be linguistically valid on its own.
 * Even if a LEGO appears within a larger construction (e.g., modal + infinitive),
 * the standalone LEGO must use proper infinitive form.
 *
 * Example:
 * - S0010L06: "to remember the whole sentence" ✓ (standalone infinitive)
 * - S0010L07: "can or can't remember" ✓ (modal + bare infinitive pattern)
 *
 * This allows learners to acquire both patterns from the same vocabulary.
 */
function analyzeLego(lego, seedId) {
  const violations = [];

  // Extract LEGO components based on format
  let legoId, type, target, known, isNew, isRef;

  if (Array.isArray(lego)) {
    // v7.7 or v5.0.0 format: [id, type, target, known, ...]
    [legoId, type, target, known] = lego;
  } else {
    // v5.0.1 format: {id, type, target, known, new/ref}
    ({ id: legoId, type, target, known, new: isNew, ref: isRef } = lego);
  }

  // Skip non-English analysis (we're checking English "known" field)
  if (!known || typeof known !== 'string') {
    return violations;
  }

  const knownText = known.trim();

  // RULE 1: Check for bare infinitive at start (without modal/trigger)
  if (startsWithBareInfinitive(knownText)) {
    const hasModal = containsModal(knownText);
    const hasBareInfinitiveTrigger = containsBareInfinitiveTrigger(knownText);
    const hasTo = hasToInfinitive(knownText);

    // If starts with bare infinitive and no modal/trigger, should have "to"
    if (!hasModal && !hasBareInfinitiveTrigger && !hasTo) {
      violations.push({
        type: 'MISSING_TO_INFINITIVE',
        seedId,
        legoId,
        target,
        known: knownText,
        severity: 'HIGH',
        message: `Bare infinitive without "to" - should be "to ${knownText}"`,
        suggestion: `to ${knownText}`
      });
    }
  }

  // RULE 2: Check for composite infinitive phrases without "to"
  // e.g., "speak with you" should be "to speak with you"
  const hasPrepositionPhrase = /\b(with|to|for|at|in|on|about|from)\s+\w+/.test(knownText);
  if (hasPrepositionPhrase && startsWithBareInfinitive(knownText)) {
    const hasModal = containsModal(knownText);
    const hasTo = hasToInfinitive(knownText);

    if (!hasModal && !hasTo) {
      violations.push({
        type: 'COMPOSITE_BARE_INFINITIVE',
        seedId,
        legoId,
        target,
        known: knownText,
        severity: 'HIGH',
        message: `Composite infinitive phrase missing "to"`,
        suggestion: `to ${knownText}`
      });
    }
  }

  // RULE 3: Check initial LEGO position (if it's the first LEGO in seed)
  // This will be handled at seed level

  return violations;
}

/**
 * Check infinitive forms in lego_pairs.json
 */
function checkInfinitiveForms(legoPairsPath) {
  log('\n' + '='.repeat(80), 'cyan');
  log('INFINITIVE FORM LINGUISTIC VALIDATOR', 'bold');
  log('='.repeat(80), 'cyan');
  log(`\nAnalyzing: ${legoPairsPath}\n`, 'blue');

  // Read lego_pairs file
  if (!fs.existsSync(legoPairsPath)) {
    log(`Error: File not found: ${legoPairsPath}`, 'red');
    return { success: false, violations: [] };
  }

  const data = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));
  const violations = [];
  let totalLegos = 0;
  let totalSeeds = 0;

  // Detect format
  const isV7 = data.version === '7.7';
  const isV5_1 = data.version === '5.0.1' || (data.methodology && data.methodology.includes('COMPLETE TILING'));
  const isV5_0 = data.version === '5.0' || data.version === '5.0.0';

  log(`Format detected: ${data.version || 'unknown'}`, 'blue');

  if (!data.seeds || !Array.isArray(data.seeds)) {
    log('Error: No seeds array found in data', 'red');
    return { success: false, violations: [] };
  }

  // Process each seed
  for (const seed of data.seeds) {
    totalSeeds++;

    let seedId, seedPair, legos;

    if (isV5_1) {
      // v5.0.1: {seed_id, seed_pair, legos, ...}
      ({ seed_id: seedId, seed_pair: seedPair, legos } = seed);
    } else {
      // v7.7 or v5.0.0: [seedId, seedPair, legos]
      [seedId, seedPair, legos] = seed;
    }

    if (!legos || !Array.isArray(legos)) {
      continue;
    }

    // Check each LEGO
    for (let i = 0; i < legos.length; i++) {
      const lego = legos[i];
      totalLegos++;

      const legoViolations = analyzeLego(lego, seedId);

      // Mark if it's the first LEGO (initial position)
      if (i === 0 && legoViolations.length > 0) {
        legoViolations.forEach(v => {
          v.isInitialPosition = true;
          v.severity = 'CRITICAL'; // First LEGO violations are critical
        });
      }

      violations.push(...legoViolations);
    }
  }

  // Print results
  log('\n' + '-'.repeat(80), 'cyan');
  log('SUMMARY', 'bold');
  log('-'.repeat(80), 'cyan');
  log(`Total Seeds Analyzed: ${totalSeeds}`, 'blue');
  log(`Total LEGOs Analyzed: ${totalLegos}`, 'blue');
  log(`Infinitive Violations Found: ${violations.length}\n`, violations.length > 0 ? 'red' : 'green');

  if (violations.length > 0) {
    log('-'.repeat(80), 'yellow');
    log('VIOLATION DETAILS', 'bold');
    log('-'.repeat(80), 'yellow');

    // Group by severity
    const bySeverity = {
      CRITICAL: violations.filter(v => v.severity === 'CRITICAL'),
      HIGH: violations.filter(v => v.severity === 'HIGH'),
      MEDIUM: violations.filter(v => v.severity === 'MEDIUM'),
      LOW: violations.filter(v => v.severity === 'LOW')
    };

    for (const [severity, items] of Object.entries(bySeverity)) {
      if (items.length === 0) continue;

      const color = severity === 'CRITICAL' ? 'red' : severity === 'HIGH' ? 'yellow' : 'blue';
      log(`\n${severity}: ${items.length} violations`, color);

      items.forEach((v, idx) => {
        log(`\n  ${idx + 1}. ${v.seedId} ${v.legoId}${v.isInitialPosition ? ' [INITIAL POSITION]' : ''}`, 'yellow');
        log(`     Target: "${v.target}"`, 'white');
        log(`     Known:  "${v.known}"`, 'white');
        log(`     Issue:  ${v.message}`, 'red');
        log(`     Fix:    "${v.suggestion}"`, 'green');
      });
    }

    log('\n' + '-'.repeat(80), 'yellow');
    log('RECOMMENDED ACTIONS:', 'bold');
    log('-'.repeat(80), 'yellow');
    log('1. Review all CRITICAL violations (initial position LEGOs)', 'yellow');
    log('2. Update bare infinitives to include "to" prefix', 'yellow');
    log('3. Verify modal constructions are correctly identified', 'yellow');
    log('4. Re-run this validator after corrections', 'yellow');

  } else {
    log('✓ No infinitive form violations found!', 'green');
    log('  All English LEGOs follow proper infinitive construction rules.', 'green');
  }

  log('\n' + '='.repeat(80), 'cyan');

  return {
    totalSeeds,
    totalLegos,
    violations,
    bySeverity: {
      CRITICAL: violations.filter(v => v.severity === 'CRITICAL').length,
      HIGH: violations.filter(v => v.severity === 'HIGH').length,
      MEDIUM: violations.filter(v => v.severity === 'MEDIUM').length,
      LOW: violations.filter(v => v.severity === 'LOW').length
    },
    success: violations.length === 0
  };
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const legoPairsPath = process.argv[2];

  if (!legoPairsPath) {
    log('Usage: node check-infinitive-forms.js [lego_pairs_path]', 'yellow');
    log('Example: node check-infinitive-forms.js public/vfs/courses/cmn_for_eng/lego_pairs.json', 'yellow');
    process.exit(1);
  }

  const result = checkInfinitiveForms(legoPairsPath);
  process.exit(result.success ? 0 : 1);
}

export { checkInfinitiveForms };
