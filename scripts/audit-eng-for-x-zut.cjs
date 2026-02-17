#!/usr/bin/env node
/**
 * ZUT Asymmetry Audit for eng_for_X courses
 *
 * Generates learning scripts for first 50 rounds and checks for ZUT violations:
 * - Same known_text (L1) appearing with different target_text (L2) = learner confusion
 *
 * Usage: node scripts/audit-eng-for-x-zut.cjs <course_code>
 */

const { createClient } = require('@supabase/supabase-js');
const { generateLearningScript } = require('../services/learning-script-generator.cjs');
require('dotenv').config();

const courseCode = process.argv[2];
if (!courseCode) {
  console.error('Usage: node scripts/audit-eng-for-x-zut.cjs <course_code>');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function auditZUT() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`ZUT ASYMMETRY AUDIT: ${courseCode}`);
  console.log(`${'='.repeat(70)}\n`);

  // Generate learning script for first 50 rounds
  console.log('Generating learning script for first 50 rounds...');
  const { rounds, allItems, stats } = await generateLearningScript(supabase, courseCode, 50, 0);

  if (rounds.length === 0) {
    console.log('ERROR: No rounds generated. Course may have insufficient data.');
    process.exit(1);
  }

  console.log(`Generated ${rounds.length} rounds with ${allItems.length} items\n`);

  // Collect all known → target mappings from the learner's perspective
  // These are what the learner sees and must respond to
  const knownToTargets = new Map(); // known_text -> { targets: Set, occurrences: [] }

  for (const item of allItems) {
    // Skip intro items (no response expected)
    if (item.type === 'intro') continue;

    const known = item.known_text?.trim();
    const target = item.target_text?.trim();
    if (!known || !target) continue;

    // Normalize for comparison (lowercase, remove punctuation)
    const knownNorm = known.toLowerCase().replace(/[.,!?;:¡¿'"。、！？]+/g, '').trim();

    if (!knownToTargets.has(knownNorm)) {
      knownToTargets.set(knownNorm, {
        original: known,
        targets: new Set(),
        occurrences: []
      });
    }

    const entry = knownToTargets.get(knownNorm);
    entry.targets.add(target);
    entry.occurrences.push({
      round: item.roundNumber,
      type: item.type,
      target: target
    });
  }

  // Find ZUT violations (same known -> different targets)
  const violations = [];
  for (const [knownNorm, data] of knownToTargets) {
    if (data.targets.size > 1) {
      violations.push({
        known_text: data.original,
        target_count: data.targets.size,
        targets: [...data.targets],
        occurrence_count: data.occurrences.length,
        sample_occurrences: data.occurrences.slice(0, 5)
      });
    }
  }

  // Sort by most targets first (worst violations)
  violations.sort((a, b) => b.target_count - a.target_count);

  // Report
  console.log('SUMMARY');
  console.log('-'.repeat(70));
  console.log(`Rounds analyzed:        ${rounds.length}`);
  console.log(`Total learner items:    ${allItems.filter(i => i.type !== 'intro').length}`);
  console.log(`Unique known prompts:   ${knownToTargets.size}`);
  console.log(`ZUT violations:         ${violations.length}`);
  console.log(`Violation rate:         ${(violations.length / knownToTargets.size * 100).toFixed(1)}%`);
  console.log();

  if (violations.length === 0) {
    console.log('✅ NO ZUT VIOLATIONS FOUND - Course is clean!');
  } else {
    console.log(`⚠️  ${violations.length} ZUT VIOLATIONS DETECTED\n`);
    console.log('TOP 15 VIOLATIONS (same L1 prompt → different L2 expected):');
    console.log('-'.repeat(70));

    for (let i = 0; i < Math.min(15, violations.length); i++) {
      const v = violations[i];
      console.log(`\n${i + 1}. "${v.known_text}"`);
      console.log(`   → ${v.target_count} different targets expected (${v.occurrence_count} occurrences):`);
      for (const t of v.targets.slice(0, 5)) {
        console.log(`      • "${t}"`);
      }
      if (v.targets.length > 5) {
        console.log(`      ... and ${v.targets.length - 5} more`);
      }
    }

    // Severity assessment
    console.log('\n' + '-'.repeat(70));
    console.log('SEVERITY ASSESSMENT:');

    const critical = violations.filter(v => v.target_count >= 4).length;
    const moderate = violations.filter(v => v.target_count >= 2 && v.target_count < 4).length;

    console.log(`  CRITICAL (4+ targets): ${critical}`);
    console.log(`  MODERATE (2-3 targets): ${moderate}`);

    if (critical > 10) {
      console.log('\n❌ RECOMMENDATION: Course needs rebuild with fresh translations');
    } else if (critical > 0 || moderate > 20) {
      console.log('\n⚠️  RECOMMENDATION: Course needs significant cleanup');
    } else {
      console.log('\n✓ RECOMMENDATION: Minor fixes needed, course is usable');
    }
  }

  // Output JSON for programmatic use
  const result = {
    course_code: courseCode,
    rounds_analyzed: rounds.length,
    total_items: allItems.filter(i => i.type !== 'intro').length,
    unique_prompts: knownToTargets.size,
    zut_violations: violations.length,
    violation_rate_pct: (violations.length / knownToTargets.size * 100).toFixed(1),
    critical_count: violations.filter(v => v.target_count >= 4).length,
    moderate_count: violations.filter(v => v.target_count >= 2 && v.target_count < 4).length,
    top_violations: violations.slice(0, 20)
  };

  console.log('\n' + '='.repeat(70));
  console.log('JSON OUTPUT:');
  console.log(JSON.stringify(result, null, 2));
}

auditZUT().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
