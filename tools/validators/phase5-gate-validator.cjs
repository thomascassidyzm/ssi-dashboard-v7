#!/usr/bin/env node

/**
 * Phase 5 GATE (Grammar And Timing Enforcement) Validator
 *
 * Validates that practice phrases only use vocabulary that has been introduced
 * in previous legos. This prevents "leaking" of future vocabulary into practice.
 *
 * Usage:
 *   node phase5-gate-validator.cjs <pairs-path> <baskets-path> [options]
 *
 * Options:
 *   --fix          Automatically remove phrases with GATE violations
 *   --report-only  Only report issues, don't fix (default)
 *   --verbose      Show detailed output
 *   --threshold N  Set violation threshold (default: 0 - no violations allowed)
 */

const fs = require('fs');
const path = require('path');

class GateValidator {
  constructor(options = {}) {
    this.options = {
      fix: options.fix || false,
      reportOnly: options.reportOnly || true,
      verbose: options.verbose || false,
      threshold: options.threshold || 0
    };

    this.stats = {
      totalBaskets: 0,
      totalPhrases: 0,
      violations: 0,
      phrasesRemoved: 0,
      basketsAffected: 0
    };

    this.legoRegistry = [];
    this.legoIdToPosition = {};
    this.vocabByPosition = [];
  }

  /**
   * Build lego registry from pairs file
   */
  buildLegoRegistry(pairsPath) {
    console.log(`\n📚 Building lego registry from: ${pairsPath}`);

    const pairsData = JSON.parse(fs.readFileSync(pairsPath, 'utf-8'));

    let position = 0;
    let cumulativeVocab = new Set();

    for (const seed of pairsData.seeds) {
      for (const lego of seed.legos) {
        // Store lego
        this.legoRegistry.push({
          id: lego.id,
          new: lego.new,
          known: lego.lego.known,
          target: lego.lego.target
        });

        this.legoIdToPosition[lego.id] = position;

        // Extract vocabulary from target (Spanish)
        const words = this.extractWords(lego.lego.target);
        words.forEach(word => cumulativeVocab.add(word));

        // Store cumulative vocabulary at this position
        this.vocabByPosition.push(new Set(cumulativeVocab));

        position++;
      }
    }

    console.log(`   Total legos: ${this.legoRegistry.length}`);
    console.log(`   Final vocabulary size: ${cumulativeVocab.size} words`);
  }

  /**
   * Extract words from text
   */
  extractWords(text) {
    // Extract alphanumeric words, lowercased
    const matches = text.toLowerCase().match(/\w+/g);
    return matches || [];
  }

  /**
   * Validate baskets file
   */
  validate(pairsPath, basketsPath) {
    console.log(`\n🔍 GATE Validation\n`);

    // Build registry
    this.buildLegoRegistry(pairsPath);

    // Read baskets
    console.log(`\n📦 Reading baskets: ${basketsPath}`);
    const data = JSON.parse(fs.readFileSync(basketsPath, 'utf-8'));
    const baskets = data.baskets;

    this.stats.totalBaskets = Object.keys(baskets).length;

    // Check each basket
    const violations = [];

    for (const [basketId, basket] of Object.entries(baskets)) {
      if (!(basketId in this.legoIdToPosition)) {
        console.warn(`⚠️  Warning: Basket ${basketId} not found in lego registry`);
        continue;
      }

      const position = this.legoIdToPosition[basketId];
      const availableVocab = this.vocabByPosition[position];

      const basketViolations = [];

      for (const phrase of basket.practice_phrases || []) {
        this.stats.totalPhrases++;

        const phraseWords = new Set(this.extractWords(phrase.target));
        const unknownWords = new Set([...phraseWords].filter(w => !availableVocab.has(w)));

        if (unknownWords.size > 0) {
          this.stats.violations++;
          basketViolations.push({
            phrase: phrase.target,
            phraseKnown: phrase.known,
            unknownWords: Array.from(unknownWords)
          });
        }
      }

      if (basketViolations.length > 0) {
        violations.push({
          basketId,
          position: position + 1,
          totalPhrases: basket.practice_phrases.length,
          violationCount: basketViolations.length,
          violations: basketViolations
        });
      }
    }

    // Apply fixes if requested
    if (this.options.fix && violations.length > 0) {
      this.applyFixes(baskets, violations);

      // Update metadata
      data.total_baskets = Object.keys(baskets).length;

      // Save
      fs.writeFileSync(basketsPath, JSON.stringify(data, null, 2));
      console.log(`\n✅ Fixed file saved: ${basketsPath}`);
    }

    // Report
    this.printReport(violations);

    return {
      valid: this.stats.violations <= this.options.threshold,
      stats: this.stats,
      violations
    };
  }

  /**
   * Apply fixes - remove phrases with GATE violations
   */
  applyFixes(baskets, violations) {
    console.log(`\n🔧 Applying fixes (removing violating phrases)...\n`);

    for (const violation of violations) {
      const basket = baskets[violation.basketId];
      if (!basket) continue;

      const originalCount = basket.practice_phrases.length;

      // Build set of violating phrases
      const violatingPhrases = new Set(
        violation.violations.map(v => v.phrase)
      );

      // Filter out violating phrases
      basket.practice_phrases = basket.practice_phrases.filter(
        phrase => !violatingPhrases.has(phrase.target)
      );

      basket.phrase_count = basket.practice_phrases.length;

      const removed = originalCount - basket.practice_phrases.length;
      this.stats.phrasesRemoved += removed;

      if (removed > 0) {
        this.stats.basketsAffected++;
      }
    }
  }

  /**
   * Print report
   */
  printReport(violations) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 GATE VALIDATION REPORT`);
    console.log(`${'='.repeat(70)}\n`);

    console.log(`Total baskets checked: ${this.stats.totalBaskets}`);
    console.log(`Total phrases checked: ${this.stats.totalPhrases}`);
    console.log(`Lego registry size: ${this.legoRegistry.length} legos\n`);

    if (violations.length === 0) {
      console.log(`✅ NO GATE VIOLATIONS - All phrases use available vocabulary!`);
    } else {
      console.log(`❌ GATE VIOLATIONS FOUND\n`);
      console.log(`Violations: ${this.stats.violations} phrases (${(this.stats.violations * 100 / this.stats.totalPhrases).toFixed(1)}%)`);
      console.log(`Baskets affected: ${violations.length}`);

      if (this.options.verbose && violations.length > 0) {
        console.log(`\nFirst 10 violations:\n`);

        for (let i = 0; i < Math.min(10, violations.length); i++) {
          const v = violations[i];
          console.log(`${i + 1}. ${v.basketId} (position ${v.position}/${this.legoRegistry.length}):`);
          console.log(`   ${v.violationCount}/${v.totalPhrases} phrases have violations`);

          // Show first violation
          if (v.violations.length > 0) {
            const firstViolation = v.violations[0];
            console.log(`   Example: "${firstViolation.phrase}"`);
            console.log(`   Unknown words: ${firstViolation.unknownWords.join(', ')}`);
          }
          console.log();
        }

        if (violations.length > 10) {
          console.log(`... and ${violations.length - 10} more baskets\n`);
        }
      }

      // Analyze most common unknown words
      const allUnknown = [];
      for (const v of violations) {
        for (const viol of v.violations) {
          allUnknown.push(...viol.unknownWords);
        }
      }

      const unknownCounts = {};
      for (const word of allUnknown) {
        unknownCounts[word] = (unknownCounts[word] || 0) + 1;
      }

      const sortedUnknown = Object.entries(unknownCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

      console.log(`\nMost common unknown words (top 20):`);
      for (const [word, count] of sortedUnknown) {
        console.log(`  ${word}: ${count} violations`);
      }

      if (this.options.fix) {
        console.log(`\n✅ Fixes applied:`);
        console.log(`   Phrases removed: ${this.stats.phrasesRemoved}`);
        console.log(`   Baskets updated: ${this.stats.basketsAffected}`);
      } else {
        console.log(`\n💡 Run with --fix to automatically remove violating phrases`);
      }
    }

    console.log(`\n${'='.repeat(70)}\n`);
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Phase 5 GATE (Grammar And Timing Enforcement) Validator

Ensures practice phrases only use vocabulary from legos that have been
introduced earlier in the course.

Usage:
  node phase5-gate-validator.cjs <pairs-path> <baskets-path> [options]

Arguments:
  pairs-path     Path to lego_pairs.json
  baskets-path   Path to lego_baskets.json

Options:
  --fix          Automatically remove phrases with GATE violations
  --report-only  Only report issues, don't fix (default)
  --verbose      Show detailed output
  --threshold N  Set violation threshold (default: 0)
  --help         Show this help message

Examples:
  # Report violations
  node phase5-gate-validator.cjs lego_pairs.json lego_baskets.json

  # Fix violations
  node phase5-gate-validator.cjs lego_pairs.json lego_baskets.json --fix

  # Verbose output
  node phase5-gate-validator.cjs lego_pairs.json lego_baskets.json --verbose
    `);
    process.exit(0);
  }

  const pairsPath = args.find(arg => !arg.startsWith('--') && arg.includes('pairs'));
  const basketsPath = args.find(arg => !arg.startsWith('--') && arg.includes('baskets'));

  if (!pairsPath || !basketsPath) {
    console.error('❌ Error: Please provide paths to both lego_pairs.json and lego_baskets.json');
    process.exit(1);
  }

  if (!fs.existsSync(pairsPath)) {
    console.error(`❌ Error: File not found: ${pairsPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(basketsPath)) {
    console.error(`❌ Error: File not found: ${basketsPath}`);
    process.exit(1);
  }

  const options = {
    fix: args.includes('--fix'),
    reportOnly: !args.includes('--fix'),
    verbose: args.includes('--verbose'),
    threshold: 0
  };

  const validator = new GateValidator(options);
  const result = validator.validate(pairsPath, basketsPath);

  process.exit(result.valid ? 0 : 1);
}

module.exports = GateValidator;
