#!/usr/bin/env node
/**
 * Find infinitive translation issues across ALL seeds
 *
 * Looks for A-LEGOs where:
 * - Spanish word is an infinitive (ends in -ar, -er, -ir)
 * - English translation is bare infinitive (no "to")
 *
 * These need manual review because sometimes the bare form IS correct
 * (e.g., in M-LEGOs after modals)
 */

const fs = require('fs-extra');

// Common Spanish infinitive endings
const INFINITIVE_ENDINGS = ['-ar', '-er', '-ir'];

// Common English words that are NOT infinitives (to avoid false positives)
const NOT_INFINITIVES = new Set([
  'estar', 'sugar', 'under', 'over', 'after', 'never', 'better', 'later',
  'other', 'either', 'neither', 'whether', 'rather', 'number', 'remember',
  // Note: 'remember' IS an infinitive, but keeping it out of NOT_INFINITIVES set
]);

function isSpanishInfinitive(word) {
  const clean = word.toLowerCase().trim();
  return INFINITIVE_ENDINGS.some(ending => clean.endsWith(ending)) &&
         !NOT_INFINITIVES.has(clean);
}

function isBareInfinitive(englishPhrase) {
  // Check if English phrase is missing "to" at the start
  return !englishPhrase.trim().startsWith('to ');
}

async function findIssues() {
  console.log('🔍 Finding infinitive translation issues across ALL seeds...\n');

  const legoPairsPath = 'public/vfs/courses/spa_for_eng/lego_pairs.json';
  const data = await fs.readJson(legoPairsPath);

  const issues = [];

  for (const seed of data.seeds) {
    const { seed_id, seed_pair, legos } = seed;

    // Check M-LEGOs (both the LEGO itself and components)
    for (const lego of legos) {
      if (lego.type !== 'M') continue;

      const { id, target, known, components } = lego;

      // Check if M-LEGO itself ends with infinitive
      const targetWords = target.split(' ');
      const lastTargetWord = targetWords[targetWords.length - 1];

      if (isSpanishInfinitive(lastTargetWord)) {
        // Check if known translation is missing "to"
        const knownWords = known.split(' ');
        const lastKnownWord = knownWords[knownWords.length - 1];

        // Check if it's a bare infinitive (not gerund, not after modal)
        if (!lastKnownWord.endsWith('ing') &&
            !known.includes(' to ' + lastKnownWord) &&
            !known.startsWith('to ')) {

          // Check if it's after a modal (might be OK)
          const hasModal = /\b(can|could|should|would|will|must|may|might)\b/.test(known);

          if (!hasModal) {
            issues.push({
              seed_id,
              lego_id: id,
              lego_type: 'M-LEGO',
              target,
              known,
              suggested: known.replace(lastKnownWord, `to ${lastKnownWord}`),
              seed_pair: seed_pair,
              likely_error: true
            });
          }
        }
      }

      // Check M-LEGO components
      if (!components) continue;

      for (let i = 0; i < components.length; i++) {
        const [compTarget, compKnown] = components[i];

        if (isSpanishInfinitive(compTarget) && isBareInfinitive(compKnown)) {
          // Check if this is in a modal context (might be OK)
          const prevComponent = i > 0 ? components[i - 1][1] : null;
          const isAfterModal = prevComponent && (
            prevComponent.includes('can') ||
            prevComponent.includes('could') ||
            prevComponent.includes('should') ||
            prevComponent.includes('would') ||
            prevComponent.includes('will') ||
            prevComponent.includes('must') ||
            prevComponent.includes('may') ||
            prevComponent.includes('might')
          );

          issues.push({
            seed_id,
            lego_id: id,
            lego_type: 'M',
            component_index: i,
            target: compTarget,
            known: compKnown,
            suggested: `to ${compKnown}`,
            context: `M-LEGO: "${lego.target}" = "${lego.known}"`,
            after_modal: isAfterModal,
            likely_error: !isAfterModal,
            seed_pair: seed_pair
          });
        }
      }
    }
  }

  // Group by likely_error status
  const definiteErrors = issues.filter(i => i.likely_error !== false);
  const maybeOK = issues.filter(i => i.after_modal === true);

  console.log(`Found ${issues.length} total infinitive issues:`);
  console.log(`  ${definiteErrors.length} likely errors (need fixing)`);
  console.log(`  ${maybeOK.length} possibly OK (after modals - review manually)\n`);

  // Print by seed for manual review
  console.log('═══════════════════════════════════════════════════════════');
  console.log('LIKELY ERRORS (should be fixed):');
  console.log('═══════════════════════════════════════════════════════════\n');

  let currentSeed = null;
  for (const issue of definiteErrors) {
    if (issue.seed_id !== currentSeed) {
      console.log(`\n${issue.seed_id}: "${issue.seed_pair[0]}" = "${issue.seed_pair[1]}"`);
      console.log('─'.repeat(70));
      currentSeed = issue.seed_id;
    }

    if (issue.lego_type === 'M-LEGO') {
      console.log(`  ${issue.lego_id} [M-LEGO translation]`);
      console.log(`    Current:   "${issue.target}" = "${issue.known}"`);
      console.log(`    Should be: "${issue.target}" = "${issue.suggested}"`);
    } else if (issue.lego_type === 'M') {
      console.log(`  ${issue.lego_id} [M-LEGO component]`);
      console.log(`    Component: ["${issue.target}", "${issue.known}"]`);
      console.log(`    Should be: ["${issue.target}", "${issue.suggested}"]`);
      console.log(`    Context:   ${issue.context}`);
    }
  }

  if (maybeOK.length > 0) {
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('POSSIBLY OK (after modals - review manually):');
    console.log('═══════════════════════════════════════════════════════════\n');

    currentSeed = null;
    for (const issue of maybeOK.slice(0, 10)) { // Show first 10
      if (issue.seed_id !== currentSeed) {
        console.log(`\n${issue.seed_id}: "${issue.seed_pair[0]}" = "${issue.seed_pair[1]}"`);
        console.log('─'.repeat(70));
        currentSeed = issue.seed_id;
      }

      console.log(`  ${issue.lego_id} [M-LEGO component after modal]`);
      console.log(`    Component: ["${issue.target}", "${issue.known}"]`);
      console.log(`    Context:   ${issue.context}`);
    }

    if (maybeOK.length > 10) {
      console.log(`\n  ... and ${maybeOK.length - 10} more`);
    }
  }

  // Write JSON report
  const reportPath = 'public/vfs/courses/spa_for_eng/infinitive_issues.json';
  await fs.writeJson(reportPath, {
    total_issues: issues.length,
    likely_errors: definiteErrors.length,
    possibly_ok: maybeOK.length,
    issues: definiteErrors.map(i => ({
      seed_id: i.seed_id,
      lego_id: i.lego_id,
      type: i.lego_type,
      target: i.target,
      current_known: i.known,
      suggested_known: i.suggested,
      seed_pair: i.seed_pair
    }))
  }, { spaces: 2 });

  console.log(`\n\n✅ Full report written to: ${reportPath}`);
  console.log(`\nReview these ${definiteErrors.length} issues manually, then we can create a fix script.`);
}

findIssues().catch(err => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
