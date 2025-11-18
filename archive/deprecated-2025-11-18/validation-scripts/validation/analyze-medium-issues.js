#!/usr/bin/env node

/**
 * Analyzes MEDIUM severity issues to determine if they're real problems
 * or acceptable given pedagogical constraints
 */

import { checkSpeakability } from './check-speakability.js';
import { checkConjunctions } from './check-conjunctions.js';
import path from 'path';

const basketsPath = 'public/vfs/courses/spa_for_eng/baskets';

console.log('\n📊 ANALYZING MEDIUM SEVERITY ISSUES\n');
console.log('='.repeat(80));

// Get results
const speakabilityResults = checkSpeakability(basketsPath);
const conjunctionResults = checkConjunctions(basketsPath);

// Analyze speakability MEDIUM issues
const mediumSpeakability = speakabilityResults.issues.filter(i => i.severity === 'MEDIUM');

console.log('\n\n📝 SPEAKABILITY - MEDIUM SEVERITY ANALYSIS');
console.log('-'.repeat(80));

// Group by type
const byType = {};
mediumSpeakability.forEach(issue => {
  if (!byType[issue.type]) byType[issue.type] = [];
  byType[issue.type].push(issue);
});

for (const [type, issues] of Object.entries(byType)) {
  console.log(`\n${type}: ${issues.length} issues`);

  // Show a few examples
  console.log('\nSample phrases:');
  issues.slice(0, 5).forEach((issue, idx) => {
    console.log(`  ${idx + 1}. [${issue.legoCount} LEGOs] "${issue.known}"`);
  });
}

// Analyze if these are genuinely problematic
console.log('\n\n🔍 ASSESSMENT:');
console.log('-'.repeat(80));

const longPhrases = mediumSpeakability.filter(i => i.type === 'VERY_LONG_WITHOUT_CONJUNCTION');
console.log(`\nLong phrases without conjunctions: ${longPhrases.length}`);

// Check average word count
const avgWords = longPhrases.reduce((sum, i) =>
  sum + i.known.split(/\s+/).length, 0) / longPhrases.length;
console.log(`Average word count: ${avgWords.toFixed(1)} words`);

// Check if they're actually speakable
const naturalPhrases = longPhrases.filter(i => {
  const phrase = i.known.toLowerCase();
  // These are natural constructions even if long
  return (
    phrase.includes('how to') ||  // "how to" chains are natural
    phrase.includes('as') ||       // "as ... as" comparisons are natural
    phrase.match(/to \w+ to \w+/)  // infinitive chains are natural
  );
});

console.log(`Natural constructions (infinitive chains, "how to", comparisons): ${naturalPhrases.length}`);
console.log(`Potentially problematic: ${longPhrases.length - naturalPhrases.length}`);

console.log('\n\n💡 RECOMMENDATIONS:');
console.log('-'.repeat(80));

if (naturalPhrases.length / longPhrases.length > 0.8) {
  console.log(`
✓ Most (${Math.round(naturalPhrases.length / longPhrases.length * 100)}%) of the "long without conjunction" issues
  are actually NATURAL constructions like:
  - "I want to remember how to..." (infinitive chains)
  - "as ... as possible" (comparisons)
  - "to speak ... to say ..." (multiple infinitives)

  These are pedagogically valuable for learners and don't need conjunctions.

  SUGGESTION: These MEDIUM severity warnings are mostly false positives.
  Consider them informational rather than issues requiring fixes.
  `);
} else {
  console.log(`
⚠️  Some phrases may genuinely be too complex. Manual review recommended.
  `);
}

// Show some examples that might need fixing
const potentiallyProblematic = longPhrases.filter(i => {
  const phrase = i.known.toLowerCase();
  const words = phrase.split(/\s+/).length;
  // Very long (12+ words) without natural structure
  return words >= 12 &&
    !phrase.includes('how to') &&
    !phrase.includes(' as ') &&
    i.legoCount >= 7;
});

if (potentiallyProblematic.length > 0) {
  console.log('\n\n🔴 PHRASES THAT MIGHT NEED REVIEW:');
  console.log('-'.repeat(80));
  potentiallyProblematic.slice(0, 10).forEach((issue, idx) => {
    console.log(`\n${idx + 1}. ${issue.seedId} ${issue.legoKey} (${issue.legoCount} LEGOs)`);
    console.log(`   "${issue.known}"`);
    console.log(`   "${issue.target}"`);
  });
}

console.log('\n' + '='.repeat(80) + '\n');
