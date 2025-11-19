#!/usr/bin/env node

/**
 * Identify common bad patterns in Chinese baskets
 *
 * Scans S0001-S0100 for mechanical combination errors:
 * - Incomplete fragments ("how to some", "I want to often")
 * - Wrong grammar ("I'm going to speaking", "am trying to")
 * - Wrong word order ("to speak often Chinese")
 * - Nonsensical combinations
 */

const fs = require('fs-extra');
const path = require('path');

// Bad patterns to detect
const BAD_PATTERNS = [
  // Incomplete "how to X" where X is not a verb
  { regex: /\bhow to (some|often|a |the |with |now|today)\b/i, desc: 'Incomplete "how to X"' },

  // "to be + -ing" errors
  { regex: /\b(going to|want to|trying to) (speaking|learning|saying|trying)\b/i, desc: 'Wrong verb form after "to"' },

  // Incomplete fragments ending with "to"
  { regex: /\b(am|is|are) (trying to|going to|want to)$/i, desc: 'Incomplete fragment ending with "to"' },

  // Wrong word order with adverbs
  { regex: /\bto speak (often|now|today) (Chinese|English)/i, desc: 'Wrong adverb placement' },

  // "I want to X" where X is not a verb
  { regex: /\bI want to (Chinese|English|some|often|with|now)\b/i, desc: 'I want to + non-verb' },

  // "I'm trying to X" where X is not a verb
  { regex: /\btrying to (some|often|with|now|today|Chinese)\b/i, desc: 'trying to + non-verb' },

  // Duplicate words
  { regex: /\b(\w+)\s+\1\b/i, desc: 'Duplicate words' },

  // "as...as" fragments
  { regex: /\bas (often|hard|much) as$/i, desc: 'Incomplete "as...as" phrase' }
];

async function identifyBadPatterns() {
  const courseDir = path.join(__dirname, '../public/vfs/courses/cmn_for_eng');
  const basketsPath = path.join(courseDir, 'lego_baskets.json');

  console.log('📖 Loading lego_baskets.json...\n');
  const baskets = await fs.readJson(basketsPath);

  const issues = [];

  // Scan S0001-S0100
  for (let seedNum = 1; seedNum <= 100; seedNum++) {
    const seedId = `S${String(seedNum).padStart(4, '0')}`;

    // Get all LEGOs for this seed
    const seedLegos = Object.entries(baskets.baskets || {})
      .filter(([legoId]) => legoId.startsWith(seedId));

    for (const [legoId, basket] of seedLegos) {
      if (!basket.practice_phrases) continue;

      for (const phrase of basket.practice_phrases) {
        const text = phrase.known || '';

        // Check against all bad patterns
        for (const pattern of BAD_PATTERNS) {
          if (pattern.regex.test(text)) {
            issues.push({
              legoId,
              phrase: text,
              pattern: pattern.desc,
              chinese: phrase.target
            });
          }
        }
      }
    }
  }

  // Group by pattern
  const byPattern = {};
  for (const issue of issues) {
    if (!byPattern[issue.pattern]) {
      byPattern[issue.pattern] = [];
    }
    byPattern[issue.pattern].push(issue);
  }

  // Display results
  console.log('🔍 BAD PATTERN ANALYSIS (S0001-S0100)\n');
  console.log('='.repeat(80));

  for (const [pattern, examples] of Object.entries(byPattern)) {
    console.log(`\n📊 ${pattern}: ${examples.length} occurrences`);
    console.log('-'.repeat(80));

    // Show first 10 examples
    const toShow = examples.slice(0, 10);
    for (const ex of toShow) {
      console.log(`  ${ex.legoId}: "${ex.phrase}"`);
      if (ex.chinese) {
        console.log(`             → "${ex.chinese}"`);
      }
    }

    if (examples.length > 10) {
      console.log(`  ... and ${examples.length - 10} more`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📈 SUMMARY:`);
  console.log(`   Total issues found: ${issues.length}`);
  console.log(`   Patterns detected: ${Object.keys(byPattern).length}`);
  console.log(`   Seeds scanned: 100 (S0001-S0100)`);

  if (issues.length > 0) {
    console.log('\n❌ Quality assessment: POOR - mechanical combination errors present');
    console.log('   Recommendation: Regenerate with agent-based approach');
  } else {
    console.log('\n✅ Quality assessment: GOOD - no obvious mechanical errors detected');
  }
}

// Run
identifyBadPatterns().catch(err => {
  console.error('❌ Analysis failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
