#!/usr/bin/env node

/**
 * Generate 12 Master Orchestrator Prompts
 *
 * Reads the patch manifest and creates individualized prompts
 * for each of the 12 master agents.
 *
 * Usage: node scripts/phase5_generate_master_prompts.cjs <course_code>
 * Example: node scripts/phase5_generate_master_prompts.cjs cmn_for_eng
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2] || 'cmn_for_eng';
const coursePath = path.join(__dirname, '..', 'public', 'vfs', 'courses', courseCode);
const manifestPath = path.join(coursePath, 'phase5_patch_manifest.json');
const templatePath = path.join(__dirname, 'phase5_master_orchestrator_prompt.md');

if (!fs.existsSync(manifestPath)) {
  console.error(`❌ Patch manifest not found: ${manifestPath}`);
  console.error('Run: node scripts/phase5_divide_into_patches.cjs <course_code>');
  process.exit(1);
}

if (!fs.existsSync(templatePath)) {
  console.error(`❌ Template not found: ${templatePath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const template = fs.readFileSync(templatePath, 'utf8');

console.log('📝 Generating Master Orchestrator Prompts');
console.log('═'.repeat(60));
console.log();
console.log(`Course: ${courseCode}`);
console.log(`Masters: ${manifest.num_masters}`);
console.log();

// Create prompts directory
const promptsDir = path.join(__dirname, 'phase5_master_prompts');
if (!fs.existsSync(promptsDir)) {
  fs.mkdirSync(promptsDir, { recursive: true });
}

manifest.patches.forEach(patch => {
  // Fill template
  let prompt = template
    .replace(/\{\{PATCH_ID\}\}/g, patch.patch_id)
    .replace(/\{\{COURSE_CODE\}\}/g, courseCode)
    .replace(/\{\{START_SEED\}\}/g, patch.start_seed)
    .replace(/\{\{END_SEED\}\}/g, patch.end_seed)
    .replace(/\{\{SEED_COUNT\}\}/g, patch.seed_count)
    .replace(/\{\{MISSING_LEGO_COUNT\}\}/g, patch.missing_legos)
    .replace(/\{\{LEGO_LIST\}\}/g, JSON.stringify(patch.lego_ids, null, 2));

  // Save individual prompt
  const filename = `patch_${String(patch.patch_id).padStart(2, '0')}_${patch.start_seed}_${patch.end_seed}.md`;
  const filepath = path.join(promptsDir, filename);
  fs.writeFileSync(filepath, prompt);

  console.log(`✅ Patch ${patch.patch_id}: ${patch.start_seed}-${patch.end_seed} (${patch.missing_legos} LEGOs)`);
  console.log(`   Saved: ${filename}`);
});

console.log();
console.log('═'.repeat(60));
console.log(`✅ All prompts saved to: ${promptsDir}/`);
console.log();
console.log('Next step: Open 12 browser tabs and paste each prompt');
console.log();
