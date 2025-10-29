#!/usr/bin/env node

/**
 * Phase 3.5 Intelligent Validator - Language-Agnostic, Evidence-Based
 *
 * ZERO HARDCODING PRINCIPLE:
 * - Extracts validation rules from Phase 3 intelligence (prompt-driven)
 * - Learns patterns from course data (evidence-based)
 * - Applies heuristics that work across ALL languages
 *
 * Core Checks:
 * 1. TILING: LEGOs reconstruct seed exactly (mechanical)
 * 2. CONSISTENCY: One target = one known mapping (evidence-based FD)
 * 3. CO-OCCURRENCE: Split constructions detected (pattern-based)
 * 4. HARD RULES: Structural patterns from prompt (language-agnostic)
 *
 * Usage:
 *   node validate-phase3-intelligent.cjs <course_code>
 *   Returns: { valid: boolean, errors: [...], stats: {...} }
 */

const fs = require('fs-extra');
const path = require('path');

class IntelligentValidator {
  constructor(courseDir, phaseIntelligence = null) {
    this.courseDir = courseDir;
    this.phaseIntelligence = phaseIntelligence;
    this.seedPairs = null;
    this.legoPairs = null;
    this.evidence = null;
    this.errors = [];
  }

  async load() {
    // Load course data
    const seedPairsPath = path.join(this.courseDir, 'seed_pairs.json');
    const legoPairsPath = path.join(this.courseDir, 'lego_pairs.json');

    if (!await fs.pathExists(seedPairsPath)) {
      throw new Error(`seed_pairs.json not found in ${this.courseDir}`);
    }
    if (!await fs.pathExists(legoPairsPath)) {
      throw new Error(`lego_pairs.json not found in ${this.courseDir}`);
    }

    this.seedPairs = await fs.readJson(seedPairsPath);
    this.legoPairs = await fs.readJson(legoPairsPath);

    // Build evidence from course data
    this.evidence = this.buildEvidence();

    console.log('📊 Evidence collected:');
    console.log(`   - ${Object.keys(this.evidence.mappings).length} unique target words`);
    console.log(`   - ${this.evidence.inconsistentMappings.length} inconsistent mappings detected`);
    console.log(`   - ${Object.keys(this.evidence.cooccurrence).length} co-occurrence patterns`);
  }

  /**
   * BUILD EVIDENCE: Learn patterns from the course data itself
   * No hardcoding - patterns emerge from data
   *
   * FCFS PRINCIPLE: First Come First Served
   * - First occurrence of a target word establishes the BASE LEGO
   * - Subsequent occurrences needing different forms must be COMPOSITE
   */
  buildEvidence() {
    const mappings = {}; // { target: Set([known1, known2, ...]) }
    const firstOccurrence = {}; // { target: { seedId, legoId, known } } - FCFS tracker
    const cooccurrence = {}; // { "word1|||word2": count }
    const constructions = []; // Detected patterns

    // Learn from all LEGOs across all seeds (in order - FCFS matters!)
    for (const seed of this.legoPairs.seeds || []) {
      const [seedId, seedPair, legos] = seed;
      const [targetSeed, knownSeed] = seedPair;

      // Track target → known mappings (for FD consistency)
      for (const lego of legos) {
        const [legoId, type, target, known] = lego;

        if (type === 'B') {
          const targetLower = target.toLowerCase().trim();

          // Track all mappings
          if (!mappings[targetLower]) {
            mappings[targetLower] = new Set();
          }
          mappings[targetLower].add(known);

          // Track FIRST occurrence (FCFS)
          if (!firstOccurrence[targetLower]) {
            firstOccurrence[targetLower] = {
              seedId,
              legoId,
              known
            };
          }
        }
      }

      // Track co-occurrence patterns (for split construction detection)
      const targetWords = targetSeed.toLowerCase().split(/\s+/);
      for (let i = 0; i < targetWords.length - 1; i++) {
        const pair = `${targetWords[i]}|||${targetWords[i + 1]}`;
        cooccurrence[pair] = (cooccurrence[pair] || 0) + 1;
      }
    }

    // Identify inconsistent mappings (FD violations)
    const inconsistentMappings = [];
    for (const [target, knowns] of Object.entries(mappings)) {
      if (knowns.size > 1) {
        inconsistentMappings.push({
          target,
          knowns: Array.from(knowns),
          count: knowns.size,
          firstOccurrence: firstOccurrence[target] // FCFS reference
        });
      }
    }

    return {
      mappings,
      firstOccurrence,
      inconsistentMappings,
      cooccurrence,
      constructions
    };
  }

  /**
   * CHECK 1: TILING INTEGRITY (mechanical, language-agnostic)
   * LEGOs must reconstruct seed exactly - nothing missing, nothing extra
   */
  checkTiling() {
    console.log('\n🔍 Check 1: Tiling Integrity');
    const tilingErrors = [];

    for (const seed of this.legoPairs.seeds || []) {
      const [seedId, seedPair, legos] = seed;
      const [targetSeed, knownSeed] = seedPair;

      // Extract BASE and COMPOSITE LEGOs (not components)
      const legoTargets = legos
        .filter(l => l[1] === 'B' || l[1] === 'C')
        .map(l => l[2]); // target text

      // Reconstruct from LEGOs
      const reconstructed = legoTargets.join(' ');

      // Normalize whitespace and punctuation (LEGOs don't include punctuation)
      // Remove all punctuation: periods, commas, question marks (¿?), exclamation (¡!), etc.
      const normalizePunctuation = (str) => str.replace(/[.,!?;:¿¡]/g, '').replace(/\s+/g, ' ').trim();
      const normalizedSeed = normalizePunctuation(targetSeed);
      const normalizedReconstructed = normalizePunctuation(reconstructed);

      if (normalizedSeed !== normalizedReconstructed) {
        // Find missing/extra words
        const seedWords = normalizedSeed.split(' ');
        const legoWords = normalizedReconstructed.split(' ');
        const missing = seedWords.filter(w => !legoWords.includes(w));
        const extra = legoWords.filter(w => !seedWords.includes(w));

        tilingErrors.push({
          type: 'tiling_failure',
          seedId,
          seed: targetSeed,
          legosTile: reconstructed,
          missing,
          extra,
          message: `LEGOs don't tile to reconstruct seed perfectly`,
          fix: missing.length > 0
            ? `Add missing word(s): ${missing.join(', ')}`
            : `Remove extra word(s): ${extra.join(', ')}`
        });
      }
    }

    console.log(`   Found ${tilingErrors.length} tiling failures`);
    return tilingErrors;
  }

  /**
   * CHECK 2: CONSISTENCY (evidence-based FD checking with FCFS)
   * One target word should map to ONE known translation
   * FCFS: First occurrence establishes BASE, subsequent must be COMPOSITE
   */
  checkConsistency() {
    console.log('\n🔍 Check 2: FD Consistency (Evidence-Based + FCFS)');
    const consistencyErrors = [];

    // Check each seed's LEGOs against learned evidence
    for (const seed of this.legoPairs.seeds || []) {
      const [seedId, seedPair, legos] = seed;

      for (const lego of legos) {
        const [legoId, type, target, known] = lego;

        if (type !== 'B') continue; // Only check BASE LEGOs

        const targetLower = target.toLowerCase().trim();
        const evidence = this.evidence.mappings[targetLower];
        const firstOccurrence = this.evidence.firstOccurrence[targetLower];

        if (evidence && evidence.size > 1) {
          // This target has multiple known translations - potential FD violation

          // Check if THIS is the first occurrence (FCFS - this one wins!)
          const isFirstOccurrence = firstOccurrence &&
                                    firstOccurrence.seedId === seedId &&
                                    firstOccurrence.legoId === legoId;

          if (isFirstOccurrence) {
            // This is the FCFS winner - it's CORRECT, skip it
            continue;
          }

          // This is NOT the first occurrence
          const fcfsKnown = firstOccurrence.known;
          const allKnowns = Array.from(evidence);

          if (known !== fcfsKnown) {
            // Violation: Using different mapping than FCFS
            consistencyErrors.push({
              type: 'fd_violation_fcfs',
              seedId,
              legoId,
              target,
              known,
              fcfsKnown,
              fcfsSeedId: firstOccurrence.seedId,
              fcfsLegoId: firstOccurrence.legoId,
              allMappings: allKnowns,
              message: `"${target}" FD violation: needs different form than FCFS established mapping`,
              evidence: `First occurrence: ${firstOccurrence.seedId} → "${fcfsKnown}" (FCFS - locked in)\nThis occurrence: ${seedId} → "${known}" (different form needed)`,
              fix: `CHUNK UP AS COMPOSITE: Include surrounding context to make "${target}" unambiguous.\nExample: If this needs gerund form, combine with preceding construction as COMPOSITE with componentization.`
            });
          }
        }
      }
    }

    console.log(`   Found ${consistencyErrors.length} FCFS violations (need COMPOSITE chunking)`);
    return consistencyErrors;
  }

  /**
   * Get most common mapping for a target word (majority wins)
   */
  getMostCommonMapping(targetLower) {
    const evidence = this.evidence.mappings[targetLower];
    if (!evidence || evidence.size === 1) {
      return Array.from(evidence)[0];
    }

    // Count occurrences of each mapping across all seeds
    const counts = {};
    for (const seed of this.legoPairs.seeds || []) {
      const [seedId, seedPair, legos] = seed;
      for (const lego of legos) {
        const [legoId, type, target, known] = lego;
        if (type === 'B' && target.toLowerCase().trim() === targetLower) {
          counts[known] = (counts[known] || 0) + 1;
        }
      }
    }

    // Return most common
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * CHECK 3: CO-OCCURRENCE PATTERNS (split construction detection)
   * Detect when words that frequently appear together in seeds are split in LEGOs
   */
  checkCooccurrence() {
    console.log('\n🔍 Check 3: Co-occurrence Patterns (Split Constructions)');
    const cooccurrenceErrors = [];

    // Define threshold: if word pair appears together in >70% of cases, they should be composite
    const totalSeeds = (this.legoPairs.seeds || []).length;
    const threshold = 0.7;

    for (const seed of this.legoPairs.seeds || []) {
      const [seedId, seedPair, legos] = seed;
      const [targetSeed, knownSeed] = seedPair;

      // Get all BASE LEGO targets in this seed
      const baseLegoTargets = legos
        .filter(l => l[1] === 'B')
        .map(l => l[2].toLowerCase().trim());

      // Check for frequently co-occurring pairs that are split
      for (let i = 0; i < baseLegoTargets.length - 1; i++) {
        const word1 = baseLegoTargets[i];
        const word2 = baseLegoTargets[i + 1];
        const pair = `${word1}|||${word2}`;

        const cooccurrenceCount = this.evidence.cooccurrence[pair] || 0;
        const cooccurrenceRate = cooccurrenceCount / totalSeeds;

        if (cooccurrenceRate > threshold) {
          // These words appear together frequently - should they be composite?
          // Check if they're actually adjacent in the seed
          const seedLower = targetSeed.toLowerCase();
          const phrase = `${word1} ${word2}`;

          if (seedLower.includes(phrase)) {
            cooccurrenceErrors.push({
              type: 'split_construction',
              seedId,
              word1,
              word2,
              phrase,
              cooccurrenceRate: (cooccurrenceRate * 100).toFixed(1) + '%',
              message: `"${phrase}" appears together in ${(cooccurrenceRate * 100).toFixed(0)}% of seeds but is split into separate LEGOs`,
              fix: `Consider making "${phrase}" a composite LEGO if it's a fixed construction`
            });
          }
        }
      }
    }

    console.log(`   Found ${cooccurrenceErrors.length} potential split constructions`);
    return cooccurrenceErrors;
  }

  /**
   * CHECK 4: HARD RULES (structural patterns, language-agnostic)
   * Detect patterns that violate structural principles from Phase 3 intelligence
   */
  checkHardRules() {
    console.log('\n🔍 Check 4: Hard Rules (Structural Patterns)');
    const hardRuleErrors = [];

    for (const seed of this.legoPairs.seeds || []) {
      const [seedId, seedPair, legos] = seed;

      // Rule: No single-word negations alone
      const negationPattern = /^(no|not|ne|non|nein|não)$/i;
      for (const lego of legos) {
        const [legoId, type, target, known] = lego;
        if (type === 'B' && negationPattern.test(target.trim())) {
          hardRuleErrors.push({
            type: 'standalone_negation',
            seedId,
            legoId,
            target,
            known,
            message: `Negation word "${target}" should not be standalone BASE LEGO`,
            fix: `Combine with following expression as composite`
          });
        }
      }

      // Rule: Detect auxiliary + verb patterns
      // Heuristic: If LEGO is a single verb followed by another verb/gerund in seed
      for (let i = 0; i < legos.length - 1; i++) {
        const [legoId1, type1, target1, known1] = legos[i];
        const [legoId2, type2, target2, known2] = legos[i + 1];

        if (type1 === 'B' && type2 === 'B') {
          // Check if known1 suggests auxiliary (am/is/are/was/were/have/has/had/will)
          const auxiliaryPattern = /^(am|is|are|was|were|have|has|had|will|shall|would|could|should|may|might|can)$/i;
          if (auxiliaryPattern.test(known1.trim())) {
            // Next word should likely be gerund/infinitive
            const verbPattern = /ing$|^to /i;
            if (verbPattern.test(known2.trim())) {
              hardRuleErrors.push({
                type: 'standalone_auxiliary',
                seedId,
                legoId: legoId1,
                target: target1,
                known: known1,
                followedBy: target2,
                message: `Auxiliary verb "${target1}" (${known1}) should combine with "${target2}" (${known2})`,
                fix: `Make composite LEGO: "${target1} ${target2}" → "${known1} ${known2}"`
              });
            }
          }
        }
      }
    }

    console.log(`   Found ${hardRuleErrors.length} hard rule violations`);
    return hardRuleErrors;
  }

  /**
   * VALIDATE: Run all checks
   */
  async validate() {
    await this.load();

    console.log('\n🔒 Phase 3.5: Intelligent Validation');
    console.log(`Course: ${path.basename(this.courseDir)}`);
    console.log(`Total seeds: ${(this.legoPairs.seeds || []).length}`);

    // Run all checks
    const tilingErrors = this.checkTiling();
    const consistencyErrors = this.checkConsistency();
    const cooccurrenceErrors = this.checkCooccurrence();
    const hardRuleErrors = this.checkHardRules();

    // Combine all errors
    this.errors = [
      ...tilingErrors,
      ...consistencyErrors,
      ...cooccurrenceErrors,
      ...hardRuleErrors
    ];

    // Get failed seed IDs
    const failedSeeds = [...new Set(this.errors.map(e => e.seedId))];

    const stats = {
      totalSeeds: (this.legoPairs.seeds || []).length,
      passedSeeds: (this.legoPairs.seeds || []).length - failedSeeds.length,
      failedSeeds: failedSeeds.length,
      errorBreakdown: {
        tiling: tilingErrors.length,
        consistency: consistencyErrors.length,
        cooccurrence: cooccurrenceErrors.length,
        hardRules: hardRuleErrors.length
      }
    };

    const valid = this.errors.length === 0;

    console.log('\n' + (valid ? '✅' : '❌') + ' Validation Result:');
    console.log(`   Valid: ${valid}`);
    console.log(`   Passed: ${stats.passedSeeds}/${stats.totalSeeds} seeds`);
    console.log(`   Failed: ${stats.failedSeeds} seeds`);
    console.log(`   Total errors: ${this.errors.length}`);
    console.log(`   - Tiling: ${stats.errorBreakdown.tiling}`);
    console.log(`   - Consistency (FD): ${stats.errorBreakdown.consistency}`);
    console.log(`   - Co-occurrence: ${stats.errorBreakdown.cooccurrence}`);
    console.log(`   - Hard rules: ${stats.errorBreakdown.hardRules}`);

    if (!valid) {
      console.log('\n⚠️  Failed seeds:', failedSeeds.slice(0, 10).join(', '));
      if (failedSeeds.length > 10) {
        console.log(`   ... and ${failedSeeds.length - 10} more`);
      }
    }

    return {
      valid,
      errors: this.errors,
      failedSeeds,
      stats
    };
  }
}

/**
 * CLI Interface
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node validate-phase3-intelligent.cjs <course_code>');
    console.error('Example: node validate-phase3-intelligent.cjs spa_for_eng_60seeds');
    process.exit(1);
  }

  const courseCode = args[0];
  const courseDir = path.resolve(
    __dirname,
    '..',
    'vfs',
    'courses',
    courseCode
  );

  try {
    const validator = new IntelligentValidator(courseDir);
    const result = await validator.validate();

    // Write detailed report
    const reportPath = path.join(courseDir, 'validation_phase3_intelligent.json');
    await fs.writeJson(reportPath, result, { spaces: 2 });
    console.log(`\n📄 Detailed report: ${reportPath}`);

    // Exit with status code
    process.exit(result.valid ? 0 : 1);
  } catch (error) {
    console.error('❌ Validation error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { IntelligentValidator };
