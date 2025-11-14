#!/usr/bin/env node
/**
 * Find infinitive translation issues in M-LEGO components
 *
 * Focus on M-LEGO components where:
 * - Spanish word is an infinitive (ends in -ar, -er, -ir)
 * - English translation is bare infinitive (no "to")
 */

const fs = require('fs-extra');

function isSpanishInfinitive(word) {
  const clean = word.toLowerCase().trim();
  return (clean.endsWith('ar') || clean.endsWith('er') || clean.endsWith('ir')) &&
         clean.length > 2; // At least 3 letters
}

async function findIssues() {
  console.log('🔍 Finding infinitive translation issues in M-LEGO components...\n');

  const legoPairsPath = 'public/vfs/courses/spa_for_eng/lego_pairs.json';
  const data = await fs.readJson(legoPairsPath);

  const issues = [];

  for (const seed of data.seeds) {
    const { seed_id, seed_pair, legos } = seed;

    for (const lego of legos) {
      if (lego.type !== 'M' || !lego.components) continue;

      const { id, target, known, components } = lego;

      // Check each component
      for (let i = 0; i < components.length; i++) {
        const [compTarget, compKnown] = components[i];

        // Is Spanish component an infinitive?
        if (!isSpanishInfinitive(compTarget)) continue;

        // Is English component missing "to"?
        const needsTo = !compKnown.startsWith('to ') &&
                       !compKnown.endsWith('ing') &&
                       !compKnown.includes(' to ');

        if (needsTo) {
          issues.push({
            seed_id,
            seed_pair,
            lego_id: id,
            mlego_target: target,
            mlego_known: known,
            component_index: i,
            comp_target: compTarget,
            comp_known: compKnown,
            comp_suggested: `to ${compKnown}`
          });
        }
      }
    }
  }

  console.log(`Found ${issues.length} component translation issues\n`);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('INFINITIVE COMPONENT ISSUES:');
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
    console.log(`    M-LEGO: "${issue.mlego_target}" = "${issue.mlego_known}"`);
    console.log(`    Component [${issue.component_index}]: ["${issue.comp_target}", "${issue.comp_known}"]`);
    console.log(`    Should be:  ["${issue.comp_target}", "${issue.comp_suggested}"]`);
  }

  // Write JSON report
  const reportPath = 'public/vfs/courses/spa_for_eng/infinitive_component_issues.json';
  await fs.writeJson(reportPath, { total_issues: issues.length, issues }, { spaces: 2 });

  console.log(`\n\n✅ Full report written to: ${reportPath}`);
  console.log(`\nNext step: Review these ${issues.length} issues and decide which need fixing.`);
}

findIssues().catch(err => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
