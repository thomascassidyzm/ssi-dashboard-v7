#!/usr/bin/env node
/**
 * Analyze LEGO quality issues in first 50 seeds
 *
 * Looks for:
 * 1. Translation errors (infinitive forms)
 * 2. Redundant M-LEGOs (perfect tiles)
 * 3. Component translation errors
 */

const fs = require('fs-extra');

async function analyzeSeed(seed) {
  const issues = [];
  const { seed_id, seed_pair, legos } = seed;

  // Build A-LEGO lookup for tiling check
  const atomicLegos = new Map();
  for (const lego of legos) {
    if (lego.type === 'A') {
      atomicLegos.set(lego.target, lego.known);
    }
  }

  // Check each M-LEGO
  for (const lego of legos) {
    if (lego.type !== 'M') continue;

    const { id, target, known, components } = lego;

    // Check if M-LEGO tiles perfectly with A-LEGOs
    if (components) {
      let canTile = true;
      let reconstructedTarget = [];
      let reconstructedKnown = [];

      for (const [compTarget, compKnown] of components) {
        // Check if this component matches an A-LEGO
        const atomicKnown = atomicLegos.get(compTarget);

        if (atomicKnown && atomicKnown === compKnown) {
          // Perfect match - component tiles with A-LEGO
          reconstructedTarget.push(compTarget);
          reconstructedKnown.push(compKnown);
        } else {
          // No match or different translation
          canTile = false;
          break;
        }
      }

      // If all components tile perfectly, M-LEGO is redundant
      if (canTile && reconstructedTarget.join(' ') === target && reconstructedKnown.join(' ') === known) {
        issues.push({
          seed_id,
          lego_id: id,
          type: 'redundant_mlego',
          target,
          known,
          reason: 'M-LEGO tiles perfectly with A-LEGOs in both languages'
        });
      }
    }

    // Check for common translation errors
    // Rule: Spanish infinitives should translate to "to X" not just "X"
    const infinitivePattern = /^(hablar|decir|recordar|intentar|aprender|parar|comenzar|volver|descubrir|reunirnos|explicar|adivinar|leer|interrumpir|pensar|sentir|responder|mejorar|saber|hacer)$/;

    if (components) {
      for (const [compTarget, compKnown] of components) {
        if (infinitivePattern.test(compTarget)) {
          // It's an infinitive
          if (!compKnown.startsWith('to ') && !compKnown.includes('ing')) {
            issues.push({
              seed_id,
              lego_id: id,
              type: 'component_translation_error',
              component_target: compTarget,
              component_known: compKnown,
              suggested: `to ${compKnown}`,
              reason: `Spanish infinitive "${compTarget}" should translate to "to ${compKnown}" not "${compKnown}"`
            });
          }
        }
      }
    }

    // Check M-LEGO translation itself
    const words = target.split(' ');
    const lastWord = words[words.length - 1];

    if (infinitivePattern.test(lastWord)) {
      // M-LEGO ends with infinitive
      const knownWords = known.split(' ');
      const lastKnownWord = knownWords[knownWords.length - 1];

      // Check if English translation is missing "to"
      if (!known.includes(' to ') && !lastKnownWord.endsWith('ing') && !known.startsWith('to ')) {
        issues.push({
          seed_id,
          lego_id: id,
          type: 'mlego_translation_error',
          target,
          known,
          suggested: known.replace(lastKnownWord, `to ${lastKnownWord}`),
          reason: `M-LEGO ends with Spanish infinitive "${lastWord}" but English is missing "to"`
        });
      }
    }
  }

  return issues;
}

async function main() {
  console.log('🔍 Analyzing LEGO quality in first 50 seeds...\n');

  const legoPairsPath = 'public/vfs/courses/spa_for_eng/lego_pairs.json';
  const data = await fs.readJson(legoPairsPath);

  const first50 = data.seeds.slice(0, 50);

  let allIssues = [];

  for (const seed of first50) {
    const issues = await analyzeSeed(seed);
    allIssues = allIssues.concat(issues);
  }

  // Group by type
  const byType = {
    redundant_mlego: [],
    component_translation_error: [],
    mlego_translation_error: []
  };

  for (const issue of allIssues) {
    byType[issue.type].push(issue);
  }

  // Report
  console.log(`Found ${allIssues.length} total issues:\n`);

  console.log(`📊 Redundant M-LEGOs: ${byType.redundant_mlego.length}`);
  if (byType.redundant_mlego.length > 0) {
    console.log('\nExamples:');
    for (const issue of byType.redundant_mlego.slice(0, 5)) {
      console.log(`  ${issue.lego_id}: "${issue.target}" = "${issue.known}"`);
      console.log(`    → ${issue.reason}`);
    }
  }

  console.log(`\n❌ M-LEGO Translation Errors: ${byType.mlego_translation_error.length}`);
  if (byType.mlego_translation_error.length > 0) {
    console.log('\nExamples:');
    for (const issue of byType.mlego_translation_error.slice(0, 5)) {
      console.log(`  ${issue.lego_id}: "${issue.target}" = "${issue.known}"`);
      console.log(`    → Should be: "${issue.suggested}"`);
      console.log(`    → ${issue.reason}`);
    }
  }

  console.log(`\n⚠️  Component Translation Errors: ${byType.component_translation_error.length}`);
  if (byType.component_translation_error.length > 0) {
    console.log('\nExamples:');
    for (const issue of byType.component_translation_error.slice(0, 5)) {
      console.log(`  ${issue.lego_id}: Component ["${issue.component_target}", "${issue.component_known}"]`);
      console.log(`    → Should be: ["${issue.component_target}", "${issue.suggested}"]`);
      console.log(`    → ${issue.reason}`);
    }
  }

  // Write full report
  const reportPath = 'public/vfs/courses/spa_for_eng/lego_quality_report.json';
  await fs.writeJson(reportPath, {
    analyzed_seeds: 50,
    total_issues: allIssues.length,
    issues_by_type: {
      redundant_mlego: byType.redundant_mlego.length,
      mlego_translation_error: byType.mlego_translation_error.length,
      component_translation_error: byType.component_translation_error.length
    },
    all_issues: allIssues
  }, { spaces: 2 });

  console.log(`\n✅ Full report written to: ${reportPath}`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
