#!/usr/bin/env node
/**
 * Find M-LEGO translation errors
 *
 * Look for M-LEGOs where:
 * - Spanish contains an infinitive
 * - English translation is missing "to"
 */

const fs = require('fs-extra');

function startsWithInfinitive(spanishPhrase) {
  const words = spanishPhrase.trim().split(' ');
  const firstWord = words[0].toLowerCase();

  // Check if first word is infinitive (ends in -ar, -er, -ir)
  return (firstWord.endsWith('ar') || firstWord.endsWith('er') || firstWord.endsWith('ir')) &&
         firstWord.length > 2;
}

function shouldHaveTo(spanishPhrase, englishPhrase) {
  // If Spanish starts with infinitive, English should start with "to"
  if (!startsWithInfinitive(spanishPhrase)) return false;

  // Check if English is missing "to"
  const englishLower = englishPhrase.toLowerCase().trim();

  // Already has "to" at start
  if (englishLower.startsWith('to ')) return false;

  // Is gerund (ending in -ing)
  const firstWord = englishLower.split(' ')[0];
  if (firstWord.endsWith('ing')) return false;

  // After modal verbs (can, could, should, etc.)
  if (/^(can|could|should|would|will|must|may|might|shall)\s/.test(englishLower)) return false;

  return true;
}

async function findIssues() {
  console.log('🔍 Finding M-LEGO translation errors (whole LEGO, not components)...\n');

  const legoPairsPath = 'public/vfs/courses/spa_for_eng/lego_pairs.json';
  const data = await fs.readJson(legoPairsPath);

  const issues = [];

  for (const seed of data.seeds) {
    const { seed_id, seed_pair, legos } = seed;

    for (const lego of legos) {
      if (lego.type !== 'M') continue;

      const { id, target, known } = lego;

      if (shouldHaveTo(target, known)) {
        const firstEnglishWord = known.split(' ')[0];
        const suggested = `to ${known}`;

        issues.push({
          seed_id,
          seed_pair,
          lego_id: id,
          target,
          known,
          suggested
        });
      }
    }
  }

  console.log(`Found ${issues.length} M-LEGO translation errors\n`);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('M-LEGO TRANSLATION ERRORS:');
  console.log('(Spanish starts with infinitive, English missing "to")');
  console.log('═══════════════════════════════════════════════════════════\n');

  let currentSeed = null;
  for (const issue of issues) {
    if (issue.seed_id !== currentSeed) {
      console.log(`\n${issue.seed_id}:`);
      console.log(`  Seed: "${issue.seed_pair[0]}" = "${issue.seed_pair[1]}"`);
      console.log('─'.repeat(70));
      currentSeed = issue.seed_id;
    }

    console.log(`  ${issue.lego_id}:`);
    console.log(`    Current:   "${issue.target}" = "${issue.known}"`);
    console.log(`    Should be: "${issue.target}" = "${issue.suggested}"`);
  }

  // Write JSON report
  const reportPath = 'public/vfs/courses/spa_for_eng/mlego_translation_errors.json';
  await fs.writeJson(reportPath, { total_issues: issues.length, issues }, { spaces: 2 });

  console.log(`\n\n✅ Full report written to: ${reportPath}`);
  console.log(`\nReview these ${issues.length} M-LEGO translation errors.`);
}

findIssues().catch(err => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
