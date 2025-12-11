#!/usr/bin/env node
/**
 * Model Comparison Harness for Phase 3 Basket Generation
 *
 * This script prepares and tracks full model comparison runs using Claude Code on Web.
 *
 * WORKFLOW:
 * 1. Run this script to prepare a fresh test
 * 2. Open Claude Code on Web, set model to HAIKU
 * 3. Paste the generated prompt, let it run
 * 4. Run this script again to record results
 * 5. Repeat for SONNET and OPUS
 * 6. Run this script with --report to see comparison
 *
 * Usage:
 *   node model-comparison-harness.cjs <courseDir> --prepare    # Reset and prepare test
 *   node model-comparison-harness.cjs <courseDir> --record <model>  # Record results after run
 *   node model-comparison-harness.cjs <courseDir> --report     # Generate comparison report
 *   node model-comparison-harness.cjs <courseDir> --prompt     # Generate agent prompt
 */

const fs = require('fs-extra');
const path = require('path');

const RESULTS_FILE = 'model_comparison_runs.json';

async function prepare(courseDir) {
  const scaffoldsIndex = path.join(courseDir, 'phase3_scaffolds', 'index.json');
  const basketsPath = path.join(courseDir, 'lego_baskets.json');
  const resultsPath = path.join(courseDir, RESULTS_FILE);

  if (!await fs.pathExists(scaffoldsIndex)) {
    console.error('❌ No scaffolds found. Run generate-all-scaffolds.cjs first.');
    process.exit(1);
  }

  const index = await fs.readJson(scaffoldsIndex);

  // Backup existing baskets if any
  if (await fs.pathExists(basketsPath)) {
    const backupPath = path.join(courseDir, `lego_baskets_backup_${Date.now()}.json`);
    await fs.copy(basketsPath, backupPath);
    console.log(`📦 Backed up existing baskets to: ${path.basename(backupPath)}`);
  }

  // Clear baskets and staging
  await fs.remove(basketsPath);
  await fs.remove(path.join(courseDir, 'phase3_outputs'));
  await fs.remove(path.join(courseDir, 'phase3_baskets_staging'));

  // Initialize results tracking
  const results = {
    course: index.course,
    total_legos: index.total_new_legos,
    total_seeds: index.seeds_with_new_legos,
    prepared_at: new Date().toISOString(),
    runs: {}
  };

  await fs.writeJson(resultsPath, results, { spaces: 2 });

  console.log(`\n✅ PREPARED MODEL COMPARISON TEST`);
  console.log(`   Course: ${index.course}`);
  console.log(`   LEGOs to generate: ${index.total_new_legos}`);
  console.log(`   Seeds: ${index.seeds_with_new_legos}`);
  console.log(`\n📋 NEXT STEPS:`);
  console.log(`   1. Run: node model-comparison-harness.cjs ${courseDir} --prompt`);
  console.log(`   2. Copy prompt to Claude Code on Web (set model to HAIKU first)`);
  console.log(`   3. When complete, run: node model-comparison-harness.cjs ${courseDir} --record haiku`);
  console.log(`   4. Repeat steps 1-3 for SONNET and OPUS`);
  console.log(`   5. Run: node model-comparison-harness.cjs ${courseDir} --report`);
}

async function generatePrompt(courseDir) {
  const scaffoldsIndex = path.join(courseDir, 'phase3_scaffolds', 'index.json');
  const index = await fs.readJson(scaffoldsIndex);

  // Get server URL (assuming local)
  const serverUrl = 'http://localhost:3459';

  const prompt = `# Phase 3 Basket Generation - Model Comparison Test

You are generating practice phrase baskets for language learning.

## CONFIGURATION
- Course: ${index.course}
- Total LEGOs: ${index.total_new_legos}
- Total Seeds: ${index.seeds_with_new_legos}
- Server: ${serverUrl}

## YOUR TASK

Generate 10 practice phrases for EACH LEGO in the course.
Work through ALL seeds sequentially: ${index.seeds.map(s => s.seed_id).join(', ')}

## WORKFLOW (for each seed)

### Step 1: Fetch scaffold
\`\`\`bash
curl ${serverUrl}/scaffolds/${index.course}/seed/S0001
\`\`\`

This returns all LEGOs for that seed with:
- \`lego\`: The phrase to practice (known → target)
- \`available_vocab\`: Words you can use (GATE compliance)
- \`difficulty\`: Recommended model tier (ignore - you're the model!)

### Step 2: Generate baskets for each LEGO

For each LEGO in the scaffold:
1. Read the LEGO and available vocabulary
2. Generate 10 practice phrases following 2-2-2-4 distribution:
   - Phrases 1-2: SHORT (LEGO + 0-1 words)
   - Phrases 3-4: MEDIUM (LEGO + 2-3 words)
   - Phrases 5-6: LONGER (LEGO + 4-5 words)
   - Phrases 7-10: LONGEST (LEGO + 6+ words)
3. EVERY phrase MUST contain the complete LEGO
4. EVERY word MUST be in available_vocab (both languages)

### Step 3: Submit the seed's baskets
\`\`\`bash
curl -X POST ${serverUrl}/upload-basket \\
  -H "Content-Type: application/json" \\
  -d '{
    "course": "${index.course}",
    "seed": "S0001",
    "baskets": {
      "S0001L01": {
        "lego": {"known": "...", "target": "..."},
        "practice_phrases": [
          {"known": "...", "target": "..."},
          ...10 phrases
        ]
      },
      "S0001L02": { ... }
    }
  }'
\`\`\`

### Step 4: Handle rejections

If the server returns validation errors:
- Read the error messages carefully
- Fix GATE violations (use only available vocab)
- Fix missing LEGO (ensure complete LEGO is present)
- Resubmit

### Step 5: Move to next seed

Repeat for all seeds: ${index.seeds.map(s => s.seed_id).join(', ')}

## SUCCESS CRITERIA

- All ${index.total_new_legos} LEGOs have baskets
- 0 validation errors
- Natural phrases in both languages

## START NOW

Begin with seed S0001. Fetch its scaffold, generate baskets, submit, then continue.

Report progress periodically: "Completed S0001 (5 LEGOs), moving to S0002..."

When finished, report: "COMPLETE: Generated baskets for all ${index.total_new_legos} LEGOs"
`;

  console.log(prompt);
  console.log('\n' + '='.repeat(70));
  console.log('📋 Copy the prompt above and paste into Claude Code on Web');
  console.log('   Make sure to set the model BEFORE pasting!');
  console.log('='.repeat(70));
}

async function recordResults(courseDir, model) {
  const resultsPath = path.join(courseDir, RESULTS_FILE);
  const basketsPath = path.join(courseDir, 'lego_baskets.json');
  const scaffoldsIndex = path.join(courseDir, 'phase3_scaffolds', 'index.json');

  if (!await fs.pathExists(resultsPath)) {
    console.error('❌ No comparison prepared. Run --prepare first.');
    process.exit(1);
  }

  const results = await fs.readJson(resultsPath);
  const index = await fs.readJson(scaffoldsIndex);

  // Count baskets generated
  let basketCount = 0;
  let phraseCount = 0;

  if (await fs.pathExists(basketsPath)) {
    const baskets = await fs.readJson(basketsPath);
    basketCount = Object.keys(baskets).length;
    for (const legoId of Object.keys(baskets)) {
      phraseCount += baskets[legoId].practice_phrases?.length || 0;
    }
  }

  // Calculate completion rate
  const completionRate = Math.round((basketCount / index.total_new_legos) * 100);

  // Record this run
  results.runs[model] = {
    recorded_at: new Date().toISOString(),
    baskets_generated: basketCount,
    phrases_generated: phraseCount,
    expected_legos: index.total_new_legos,
    completion_rate: completionRate,
    avg_phrases_per_lego: basketCount > 0 ? (phraseCount / basketCount).toFixed(1) : 0
  };

  await fs.writeJson(resultsPath, results, { spaces: 2 });

  // Backup this run's baskets
  if (await fs.pathExists(basketsPath)) {
    const backupPath = path.join(courseDir, `lego_baskets_${model}.json`);
    await fs.copy(basketsPath, backupPath);
  }

  // Clear for next run
  await fs.remove(basketsPath);
  await fs.remove(path.join(courseDir, 'phase3_outputs'));
  await fs.remove(path.join(courseDir, 'phase3_baskets_staging'));

  console.log(`\n✅ RECORDED ${model.toUpperCase()} RUN`);
  console.log(`   Baskets: ${basketCount}/${index.total_new_legos} (${completionRate}%)`);
  console.log(`   Phrases: ${phraseCount} (${results.runs[model].avg_phrases_per_lego} avg/LEGO)`);
  console.log(`   Saved to: lego_baskets_${model}.json`);

  // Show next steps
  const models = ['haiku', 'sonnet', 'opus'];
  const remaining = models.filter(m => !results.runs[m]);

  if (remaining.length > 0) {
    console.log(`\n📋 NEXT: Run with ${remaining[0].toUpperCase()}`);
    console.log(`   node model-comparison-harness.cjs ${courseDir} --prompt`);
  } else {
    console.log(`\n📊 ALL RUNS COMPLETE! Generate report:`);
    console.log(`   node model-comparison-harness.cjs ${courseDir} --report`);
  }
}

async function generateReport(courseDir) {
  const resultsPath = path.join(courseDir, RESULTS_FILE);

  if (!await fs.pathExists(resultsPath)) {
    console.error('❌ No results found. Run tests first.');
    process.exit(1);
  }

  const results = await fs.readJson(resultsPath);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`MODEL COMPARISON REPORT: ${results.course}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Total LEGOs: ${results.total_legos}`);
  console.log(`Prepared: ${results.prepared_at}`);
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`Model     | Baskets    | Phrases  | Completion | Avg/LEGO`);
  console.log(`${'─'.repeat(70)}`);

  const models = ['haiku', 'sonnet', 'opus'];

  for (const model of models) {
    const run = results.runs[model];
    if (run) {
      const baskets = String(run.baskets_generated).padEnd(10);
      const phrases = String(run.phrases_generated).padEnd(8);
      const completion = `${run.completion_rate}%`.padEnd(10);
      const avg = run.avg_phrases_per_lego;
      console.log(`${model.toUpperCase().padEnd(9)} | ${baskets} | ${phrases} | ${completion} | ${avg}`);
    } else {
      console.log(`${model.toUpperCase().padEnd(9)} | (not run)`);
    }
  }

  console.log(`${'─'.repeat(70)}`);

  // Recommendations
  console.log(`\n📊 ANALYSIS:`);

  const haiku = results.runs.haiku;
  const sonnet = results.runs.sonnet;
  const opus = results.runs.opus;

  if (haiku && sonnet) {
    if (haiku.completion_rate >= 90 && sonnet.completion_rate >= 90) {
      console.log(`   ✅ Both Haiku and Sonnet achieved 90%+ completion`);
      console.log(`   → Consider using HAIKU for cost savings`);
    } else if (sonnet.completion_rate > haiku.completion_rate + 10) {
      console.log(`   ⚠️  Sonnet significantly outperformed Haiku`);
      console.log(`   → Use SONNET for reliable results`);
    }
  }

  if (opus && sonnet) {
    if (Math.abs(opus.completion_rate - sonnet.completion_rate) < 5) {
      console.log(`   ✅ Opus and Sonnet performed similarly`);
      console.log(`   → SONNET is cost-effective for this task`);
    }
  }

  // Cost estimates
  console.log(`\n💰 ESTIMATED COSTS (for full 668-seed course):`);
  const scale = 668 / results.total_seeds;
  console.log(`   Haiku:  ~$${(scale * 0.5).toFixed(0)} (cheapest)`);
  console.log(`   Sonnet: ~$${(scale * 6).toFixed(0)} (balanced)`);
  console.log(`   Opus:   ~$${(scale * 30).toFixed(0)} (premium)`);
}

// CLI
const args = process.argv.slice(2);
const courseDir = args[0];
const command = args[1];

if (!courseDir || !command) {
  console.log(`
Usage:
  node model-comparison-harness.cjs <courseDir> --prepare     # Reset and prepare test
  node model-comparison-harness.cjs <courseDir> --prompt      # Generate agent prompt
  node model-comparison-harness.cjs <courseDir> --record <model>  # Record results (haiku|sonnet|opus)
  node model-comparison-harness.cjs <courseDir> --report      # Generate comparison report

Example workflow:
  1. node model-comparison-harness.cjs public/vfs/courses/spa_for_eng_v2 --prepare
  2. node model-comparison-harness.cjs public/vfs/courses/spa_for_eng_v2 --prompt
  3. [Paste prompt into Claude Code on Web with HAIKU model]
  4. node model-comparison-harness.cjs public/vfs/courses/spa_for_eng_v2 --record haiku
  5. Repeat steps 2-4 for sonnet and opus
  6. node model-comparison-harness.cjs public/vfs/courses/spa_for_eng_v2 --report
`);
  process.exit(1);
}

const resolvedDir = path.resolve(courseDir);

switch (command) {
  case '--prepare':
    prepare(resolvedDir);
    break;
  case '--prompt':
    generatePrompt(resolvedDir);
    break;
  case '--record':
    const model = args[2]?.toLowerCase();
    if (!['haiku', 'sonnet', 'opus'].includes(model)) {
      console.error('❌ Model must be: haiku, sonnet, or opus');
      process.exit(1);
    }
    recordResults(resolvedDir, model);
    break;
  case '--report':
    generateReport(resolvedDir);
    break;
  default:
    console.error(`❌ Unknown command: ${command}`);
    process.exit(1);
}
