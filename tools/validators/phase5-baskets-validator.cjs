#!/usr/bin/env node

/**
 * Phase 5 Baskets Validator
 *
 * Validates lego_baskets.json for quality issues:
 * 1. Duplicate phrases (identical in both languages)
 * 2. Partial duplicates (same in one language, different in other - typos)
 * 3. Missing lego content (phrases that don't contain the lego)
 *
 * Usage:
 *   node phase5-baskets-validator.cjs <path-to-lego_baskets.json> [--fix] [--report-only]
 *
 * Options:
 *   --fix          Automatically fix issues (removes duplicates and unrelated phrases)
 *   --report-only  Only report issues, don't fix anything
 *   --verbose      Show detailed output
 */

const fs = require('fs');
const path = require('path');

class BasketsValidator {
  constructor(options = {}) {
    this.options = {
      fix: options.fix || false,
      reportOnly: options.reportOnly || true,
      verbose: options.verbose || false
    };

    this.stats = {
      totalBaskets: 0,
      duplicatesFound: 0,
      duplicatesRemoved: 0,
      partialMatches: 0,
      missingLegoContent: 0,
      unrelatedPhrasesRemoved: 0,
      basketsAffected: 0
    };
  }

  /**
   * Validate baskets file
   */
  validate(basketsPath) {
    console.log(`\n🔍 Validating: ${basketsPath}\n`);

    // Read baskets file
    const data = JSON.parse(fs.readFileSync(basketsPath, 'utf-8'));
    const baskets = data.baskets;

    this.stats.totalBaskets = Object.keys(baskets).length;

    // Run checks
    const duplicateIssues = this.checkDuplicates(baskets);
    const partialIssues = this.checkPartialMatches(baskets);
    const missingLegoIssues = this.checkMissingLego(baskets);

    // Apply fixes if requested
    if (this.options.fix) {
      this.applyFixes(baskets, duplicateIssues, missingLegoIssues);

      // Update metadata
      data.total_baskets = Object.keys(baskets).length;

      // Save fixed file
      fs.writeFileSync(basketsPath, JSON.stringify(data, null, 2));
      console.log(`\n✅ Fixed file saved: ${basketsPath}`);
    }

    // Report
    this.printReport(duplicateIssues, partialIssues, missingLegoIssues);

    return {
      valid: this.stats.duplicatesFound === 0 &&
             this.stats.partialMatches === 0 &&
             this.stats.missingLegoContent === 0,
      stats: this.stats,
      issues: {
        duplicates: duplicateIssues,
        partialMatches: partialIssues,
        missingLego: missingLegoIssues
      }
    };
  }

  /**
   * Check for duplicate phrases (identical in both languages)
   */
  checkDuplicates(baskets) {
    const issues = [];

    for (const [basketId, basket] of Object.entries(baskets)) {
      const phrases = basket.practice_phrases || [];
      const seen = new Set();
      const duplicates = [];

      for (const phrase of phrases) {
        const key = `${phrase.known}|||${phrase.target}`;
        if (seen.has(key)) {
          duplicates.push(phrase);
          this.stats.duplicatesFound++;
        } else {
          seen.add(key);
        }
      }

      if (duplicates.length > 0) {
        issues.push({
          basketId,
          type: 'duplicate',
          count: duplicates.length,
          duplicates
        });
      }
    }

    return issues;
  }

  /**
   * Check for partial matches (same in one language, different in other)
   */
  checkPartialMatches(baskets) {
    const issues = [];

    for (const [basketId, basket] of Object.entries(baskets)) {
      const phrases = basket.practice_phrases || [];

      // Group by known text
      const byKnown = {};
      for (const phrase of phrases) {
        if (!byKnown[phrase.known]) {
          byKnown[phrase.known] = [];
        }
        byKnown[phrase.known].push(phrase.target);
      }

      // Check for same known, different targets
      for (const [known, targets] of Object.entries(byKnown)) {
        const uniqueTargets = [...new Set(targets)];
        if (uniqueTargets.length > 1) {
          issues.push({
            basketId,
            type: 'partial_match',
            known,
            targets: uniqueTargets
          });
          this.stats.partialMatches++;
        }
      }
    }

    return issues;
  }

  /**
   * Check for phrases missing the lego content
   */
  checkMissingLego(baskets) {
    const issues = [];

    for (const [basketId, basket] of Object.entries(baskets)) {
      const legoKnown = basket.lego.known.toLowerCase().trim();
      const legoTarget = basket.lego.target.toLowerCase().trim();
      const phrases = basket.practice_phrases || [];

      const missingPhrases = [];

      for (const phrase of phrases) {
        const phraseKnown = phrase.known.toLowerCase();
        const phraseTarget = phrase.target.toLowerCase();

        // Check if lego appears in either language
        const knownContains = phraseKnown.includes(legoKnown);
        const targetContains = phraseTarget.includes(legoTarget);

        // Flag if BOTH languages are missing the lego (completely unrelated)
        if (!knownContains && !targetContains) {
          missingPhrases.push({
            phrase,
            missingIn: 'both'
          });
          this.stats.missingLegoContent++;
        }
      }

      if (missingPhrases.length > 0) {
        issues.push({
          basketId,
          type: 'missing_lego',
          lego: basket.lego,
          count: missingPhrases.length,
          phrases: missingPhrases
        });
      }
    }

    return issues;
  }

  /**
   * Apply fixes to baskets
   */
  applyFixes(baskets, duplicateIssues, missingLegoIssues) {
    console.log(`\n🔧 Applying fixes...\n`);

    // Fix duplicates
    for (const issue of duplicateIssues) {
      const basket = baskets[issue.basketId];
      const phrases = basket.practice_phrases || [];

      // Keep only unique phrases (first occurrence)
      const seen = new Set();
      const uniquePhrases = [];

      for (const phrase of phrases) {
        const key = `${phrase.known}|||${phrase.target}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniquePhrases.push(phrase);
        } else {
          this.stats.duplicatesRemoved++;
        }
      }

      basket.practice_phrases = uniquePhrases;
      basket.phrase_count = uniquePhrases.length;
      this.stats.basketsAffected++;
    }

    // Fix missing lego content (remove completely unrelated phrases)
    for (const issue of missingLegoIssues) {
      const basket = baskets[issue.basketId];
      const phrases = basket.practice_phrases || [];

      const legoKnown = basket.lego.known.toLowerCase().trim();
      const legoTarget = basket.lego.target.toLowerCase().trim();

      // Keep only phrases that contain the lego in at least one language
      const filteredPhrases = phrases.filter(phrase => {
        const phraseKnown = phrase.known.toLowerCase();
        const phraseTarget = phrase.target.toLowerCase();

        const knownContains = phraseKnown.includes(legoKnown);
        const targetContains = phraseTarget.includes(legoTarget);

        if (!knownContains && !targetContains) {
          this.stats.unrelatedPhrasesRemoved++;
          return false;
        }
        return true;
      });

      basket.practice_phrases = filteredPhrases;
      basket.phrase_count = filteredPhrases.length;

      if (filteredPhrases.length !== phrases.length) {
        this.stats.basketsAffected++;
      }
    }
  }

  /**
   * Print validation report
   */
  printReport(duplicateIssues, partialIssues, missingLegoIssues) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 VALIDATION REPORT`);
    console.log(`${'='.repeat(70)}\n`);

    console.log(`Total baskets: ${this.stats.totalBaskets}\n`);

    // Duplicates
    if (duplicateIssues.length > 0) {
      console.log(`❌ DUPLICATE PHRASES: ${this.stats.duplicatesFound}`);
      console.log(`   Baskets affected: ${duplicateIssues.length}`);
      if (this.options.verbose && duplicateIssues.length <= 5) {
        duplicateIssues.slice(0, 5).forEach(issue => {
          console.log(`   - ${issue.basketId}: ${issue.count} duplicates`);
        });
      }
      if (this.options.fix) {
        console.log(`   ✅ Removed: ${this.stats.duplicatesRemoved}`);
      }
      console.log();
    } else {
      console.log(`✅ No duplicate phrases found\n`);
    }

    // Partial matches
    if (partialIssues.length > 0) {
      console.log(`⚠️  PARTIAL MATCHES (potential typos): ${this.stats.partialMatches}`);
      console.log(`   Baskets affected: ${partialIssues.length}`);
      if (this.options.verbose) {
        partialIssues.slice(0, 3).forEach(issue => {
          console.log(`   - ${issue.basketId}:`);
          console.log(`     Known: "${issue.known}"`);
          issue.targets.forEach(target => {
            console.log(`       → "${target}"`);
          });
        });
        if (partialIssues.length > 3) {
          console.log(`     ... and ${partialIssues.length - 3} more`);
        }
      }
      console.log(`   ⚠️  Manual review recommended`);
      console.log();
    } else {
      console.log(`✅ No partial matches found\n`);
    }

    // Missing lego content
    if (missingLegoIssues.length > 0) {
      console.log(`❌ MISSING LEGO CONTENT: ${this.stats.missingLegoContent} phrases`);
      console.log(`   Baskets affected: ${missingLegoIssues.length}`);
      if (this.options.verbose && missingLegoIssues.length <= 5) {
        missingLegoIssues.slice(0, 5).forEach(issue => {
          console.log(`   - ${issue.basketId}: ${issue.count} phrases without lego`);
          console.log(`     Lego: "${issue.lego.known}" / "${issue.lego.target}"`);
        });
      }
      if (this.options.fix) {
        console.log(`   ✅ Removed: ${this.stats.unrelatedPhrasesRemoved}`);
      }
      console.log();
    } else {
      console.log(`✅ All phrases contain their lego content\n`);
    }

    // Summary
    console.log(`${'='.repeat(70)}`);
    if (this.options.fix) {
      console.log(`✅ Baskets fixed: ${this.stats.basketsAffected}`);
      console.log(`✅ Total items removed: ${this.stats.duplicatesRemoved + this.stats.unrelatedPhrasesRemoved}`);
    } else {
      const totalIssues = this.stats.duplicatesFound + this.stats.partialMatches + this.stats.missingLegoContent;
      if (totalIssues === 0) {
        console.log(`✅ VALIDATION PASSED - No issues found!`);
      } else {
        console.log(`❌ VALIDATION FAILED - ${totalIssues} issues found`);
        console.log(`   Run with --fix to automatically fix duplicates and unrelated phrases`);
      }
    }
    console.log(`${'='.repeat(70)}\n`);
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Phase 5 Baskets Validator

Usage:
  node phase5-baskets-validator.cjs <path-to-lego_baskets.json> [options]

Options:
  --fix          Automatically fix issues (removes duplicates and unrelated phrases)
  --report-only  Only report issues, don't fix anything (default)
  --verbose      Show detailed output
  --help         Show this help message

Examples:
  # Report only
  node phase5-baskets-validator.cjs ./lego_baskets.json

  # Fix issues
  node phase5-baskets-validator.cjs ./lego_baskets.json --fix

  # Verbose report
  node phase5-baskets-validator.cjs ./lego_baskets.json --verbose
    `);
    process.exit(0);
  }

  const basketsPath = args.find(arg => !arg.startsWith('--'));

  if (!basketsPath) {
    console.error('❌ Error: Please provide path to lego_baskets.json');
    process.exit(1);
  }

  if (!fs.existsSync(basketsPath)) {
    console.error(`❌ Error: File not found: ${basketsPath}`);
    process.exit(1);
  }

  const options = {
    fix: args.includes('--fix'),
    reportOnly: !args.includes('--fix'),
    verbose: args.includes('--verbose')
  };

  const validator = new BasketsValidator(options);
  const result = validator.validate(basketsPath);

  process.exit(result.valid ? 0 : 1);
}

module.exports = BasketsValidator;
