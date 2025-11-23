#!/usr/bin/env node

/**
 * Merge Phase 5 baskets from multiple GitHub branches
 * Created by Claude to recover baskets from web-based agent sessions
 */

const fs = require('fs-extra');
const { execSync } = require('child_process');
const path = require('path');

const COURSE_CODE = 'cmn_for_eng';
const OUTPUT_FILE = path.join(__dirname, '../public/vfs/courses', COURSE_CODE, 'lego_baskets_NEW.json');

const AGENT_BRANCHES = [
  'origin/claude/spawn-workers-orchestrator-012XwmDCKFas2957wLeebr1y',  // S0001-S0003
  'origin/claude/spawn-workers-seeds-016dvFVmM7myET5M7hWDj1bN',         // S0014
  'origin/claude/spawn-workers-orchestrator-01KuZjKkHqWbzugtf2TrGHXM', // S0019-S0024
  'origin/claude/spawn-workers-seeds-01EXQio4UEeEN2hRmMAya9Jv',        // S0026, S0028
];

async function main() {
  console.log('🔀 Merging Phase 5 baskets from agent branches...\n');

  let mergedBaskets = {
    baskets: {}
  };

  for (const branch of AGENT_BRANCHES) {
    console.log(`📦 Processing branch: ${branch}`);

    try {
      // Extract baskets JSON from branch
      const basketsJson = execSync(
        `git show ${branch}:public/vfs/courses/${COURSE_CODE}/lego_baskets.json`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );

      const branchData = JSON.parse(basketsJson);
      const basketCount = Object.keys(branchData.baskets || {}).length;

      console.log(`   Found ${basketCount} baskets`);

      // Merge baskets (later baskets override earlier ones if duplicate)
      if (branchData.baskets) {
        mergedBaskets.baskets = {
          ...mergedBaskets.baskets,
          ...branchData.baskets
        };
      }

      // Copy metadata from first branch
      if (!mergedBaskets.version && branchData.version) {
        mergedBaskets.version = branchData.version;
      }
      if (!mergedBaskets.generated_at && branchData.generated_at) {
        mergedBaskets.generated_at = branchData.generated_at;
      }

    } catch (error) {
      console.error(`   ❌ Error reading from ${branch}:`, error.message);
    }
  }

  // Update metadata
  mergedBaskets.merged_at = new Date().toISOString();
  mergedBaskets.merged_from = AGENT_BRANCHES;

  const totalBaskets = Object.keys(mergedBaskets.baskets).length;
  console.log(`\n✅ Merged total: ${totalBaskets} baskets`);

  // Write to new file (don't overwrite original yet)
  await fs.writeJSON(OUTPUT_FILE, mergedBaskets, { spaces: 2 });
  console.log(`\n📝 Written to: ${OUTPUT_FILE}`);
  console.log(`\nNext steps:`);
  console.log(`1. Review the new file: lego_baskets_NEW.json`);
  console.log(`2. Compare with backup: lego_baskets copy.json`);
  console.log(`3. If satisfied, rename to lego_baskets.json`);
}

main().catch(console.error);
