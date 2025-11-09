#!/usr/bin/env node

/**
 * Apply Generation 0 Baseline Corrections
 *
 * Purpose: Convert identified FCFS violations from Gen 0 baseline into training corrections
 *
 * This script demonstrates the AI OS learning loop:
 * 1. Validation detects errors (FCFS violations)
 * 2. Human/system identifies corrections
 * 3. Corrections added to training dataset
 * 4. Next generation learns from mistakes
 * 5. Same errors don't recur (self-healing)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load baseline violations
const baselinePath = path.join(__dirname, '../testing/generation-0-baseline.json');
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));

// Corrections to apply
const corrections = [
  // Spanish: "to meet" FCFS violation
  {
    course: 'spa_for_eng_30seeds',
    seed_id: 'S0022',
    violation: baseline.by_course[0].fcfs_violations[0],
    before: {
      lego_id: 'S0022L02',
      lego_type: 'BASE',
      target_chunk: 'conocer',
      known_chunk: 'to meet'
    },
    after: {
      lego_id: 'S0022L02',
      lego_type: 'COMPOSITE',
      target_chunk: 'conocer a alguien',
      known_chunk: 'to meet someone',
      componentization: 'to meet someone = conocer a alguien, where conocer = to know/meet and a alguien = someone'
    },
    reason: `FCFS violation: "to meet" already mapped to "encontrarnos" (meet/get together) in S0018. This occurrence has different semantic (meet/get to know someone). Chunked up with "someone" to differentiate meaning and maintain FD.`,
    error_type: 'FCFS_VIOLATION'
  },

  // French: "to meet" FCFS violation
  {
    course: 'fra_for_eng_30seeds',
    seed_id: 'S0022',
    violation: baseline.by_course[1].fcfs_violations[1],
    before: {
      lego_id: 'S0022L02',
      lego_type: 'BASE',
      target_chunk: 'rencontrer',
      known_chunk: 'to meet'
    },
    after: {
      lego_id: 'S0022L02',
      lego_type: 'COMPOSITE',
      target_chunk: 'rencontrer quelqu\'un',
      known_chunk: 'to meet someone',
      componentization: 'to meet someone = rencontrer quelqu\'un, where rencontrer = to meet and quelqu\'un = someone'
    },
    reason: `FCFS violation: "to meet" already mapped to "nous rencontrer" (meet/get together) in S0018. This occurrence has different semantic (meet someone new). Chunked up with "someone" to differentiate and maintain FD.`,
    error_type: 'FCFS_VIOLATION'
  },

  // Italian: "to meet" FCFS violation
  {
    course: 'ita_for_eng_30seeds',
    seed_id: 'S0022',
    violation: baseline.by_course[2].fcfs_violations[1],
    before: {
      lego_id: 'S0022L02',
      lego_type: 'BASE',
      target_chunk: 'incontrare',
      known_chunk: 'to meet'
    },
    after: {
      lego_id: 'S0022L02',
      lego_type: 'COMPOSITE',
      target_chunk: 'incontrare qualcuno',
      known_chunk: 'to meet someone',
      componentization: 'to meet someone = incontrare qualcuno, where incontrare = to meet and qualcuno = someone'
    },
    reason: `FCFS violation: "to meet" already mapped to "incontrarci" (meet/get together) in S0018. This occurrence has different semantic (meet someone new). Chunked up with "someone" to differentiate and maintain FD.`,
    error_type: 'FCFS_VIOLATION'
  },

  // Mandarin: "to meet" FCFS violation
  {
    course: 'cmn_for_eng_30seeds',
    seed_id: 'S0022',
    violation: baseline.by_course[3].fcfs_violations[4],
    before: {
      lego_id: 'S0022L02',
      lego_type: 'BASE',
      target_chunk: '认识',
      known_chunk: 'to meet'
    },
    after: {
      lego_id: 'S0022L02',
      lego_type: 'COMPOSITE',
      target_chunk: '认识新朋友',
      known_chunk: 'to meet someone new',
      componentization: 'to meet someone new = 认识新朋友, where 认识 = to know/meet and 新朋友 = new friend'
    },
    reason: `FCFS violation: "to meet" already mapped to "见面" (meet/get together) in S0018. This occurrence has different semantic (meet/get to know someone). Chunked up with "someone new" to differentiate and maintain FD.`,
    error_type: 'FCFS_VIOLATION'
  },

  // Mandarin: "to remember" FCFS violation
  {
    course: 'cmn_for_eng_30seeds',
    seed_id: 'S0010',
    violation: baseline.by_course[3].fcfs_violations[2],
    before: {
      lego_id: 'S0010L03',
      lego_type: 'BASE',
      target_chunk: '记得',
      known_chunk: 'to remember'
    },
    after: {
      lego_id: 'S0010L03',
      lego_type: 'COMPOSITE',
      target_chunk: '记得做某事',
      known_chunk: 'to remember to do something',
      componentization: 'to remember to do something = 记得做某事, where 记得 = to remember and 做某事 = to do something'
    },
    reason: `FCFS violation: "to remember" already mapped to "想起" (remember/recall) in S0006. This occurrence has different aspect (remember to do). Chunked up with "to do something" to differentiate and maintain FD.`,
    error_type: 'FCFS_VIOLATION'
  }
];

console.log('🔧 Applying Generation 0 Corrections to Training Dataset\n');
console.log(`Total corrections to apply: ${corrections.length}\n`);
console.log('These corrections will teach the model:');
console.log('- FCFS rule enforcement');
console.log('- When to chunk up with context');
console.log('- Cross-language pattern generalization\n');
console.log('═'.repeat(70));

let successCount = 0;

for (const correction of corrections) {
  console.log(`\n📝 ${correction.course} - ${correction.seed_id}`);
  console.log(`   Error: ${correction.violation.known_chunk} → ${correction.before.target_chunk}`);
  console.log(`   Fix: ${correction.after.known_chunk} → ${correction.after.target_chunk}`);

  try {
    // Call add-correction.cjs
    const cmd = `node ${path.join(__dirname, 'add-correction.cjs')} \
      --course ${correction.course} \
      --seed ${correction.seed_id} \
      --before '${JSON.stringify(correction.before)}' \
      --after '${JSON.stringify(correction.after)}' \
      --reason "${correction.reason}" \
      --error-type ${correction.error_type}`;

    execSync(cmd, { stdio: 'pipe' });
    console.log('   ✅ Correction added to training dataset');
    successCount++;
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
  }
}

console.log('\n' + '═'.repeat(70));
console.log(`\n✨ Applied ${successCount}/${corrections.length} corrections successfully\n`);

// Update training dataset stats
const manifestPath = path.join(__dirname, 'generation-1/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

manifest.total_corrections = successCount;
manifest.corrections_applied_from = 'generation-0-baseline';
manifest.notes = `Generation 1 baseline (449 examples) + ${successCount} corrections from Gen 0 FCFS violations. Model will learn to avoid same errors.`;

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log('📊 Training Dataset Status:');
console.log(`   Baseline examples: 449`);
console.log(`   Corrections added: ${successCount}`);
console.log(`   Total training examples: ${449 + successCount}`);
console.log(`   Quality improvement expected: +16% (74% → 90%)\n`);

console.log('🎯 Next steps:');
console.log('   1. Convert training dataset to Anthropic format');
console.log('   2. Fine-tune Generation 1 model');
console.log('   3. Re-run validation → measure improvement');
console.log('   4. Prove self-healing (same errors won\'t recur)\n');
