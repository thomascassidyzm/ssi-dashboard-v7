#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Fix Array Order Convention
 *
 * Converts all arrays to [known, target] format EXCEPT components which stay [target, known]
 *
 * Arrays to fix:
 * - seed_pair arrays
 * - recent_seed_pairs arrays
 * - lego arrays
 * - current_seed_legos_available arrays
 * - practice_phrases arrays (already correct)
 *
 * Arrays to LEAVE ALONE:
 * - components arrays (stay [target, known] for teaching)
 */

console.log('🔧 Fixing Array Order Convention\n');
console.log('Rule: [known, target] everywhere EXCEPT components\n');

// Fix Phase 3 lego_pairs files
const phase3Files = [
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_test_s0011-0040/lego_pairs_deduplicated_final.json',
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_test_s0011-0040/lego_pairs_merged.json',
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_test_s0011-0040/lego_pairs.json'
];

console.log('📁 Phase 3: Fixing lego_pairs files...\n');

phase3Files.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Not found: ${filePath}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  data.seeds.forEach(seed => {
    // Fix seed_pair: [target, known] → [known, target]
    if (seed.seed_pair && Array.isArray(seed.seed_pair)) {
      const [target, known] = seed.seed_pair;
      seed.seed_pair = [known, target];
    }
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log(`✅ ${path.basename(filePath)}`);
});

// Fix Phase 5 basket files
console.log('\n📁 Phase 5: Fixing basket files...\n');

const phase5Dir = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_test_s0011-0040/phase5_outputs';
const basketFiles = fs.readdirSync(phase5Dir)
  .filter(f => f.startsWith('seed_s') && f.endsWith('.json'))
  .sort();

basketFiles.forEach(file => {
  const filePath = path.join(phase5Dir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Fix recent_seed_pairs: {"S0001": [target, known]} → [known, target]
  if (data.recent_seed_pairs) {
    Object.keys(data.recent_seed_pairs).forEach(seedId => {
      const pair = data.recent_seed_pairs[seedId];
      if (Array.isArray(pair)) {
        const [target, known] = pair;
        data.recent_seed_pairs[seedId] = [known, target];
      }
    });
  }

  // lego, current_seed_legos_available, practice_phrases are already [known, target]
  // components stay [target, known]

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log(`✅ ${file}`);
});

console.log('\n✅ Array order convention fixed across all files\n');
console.log('📋 Summary:');
console.log('   - seed_pair: [known, target] ✅');
console.log('   - recent_seed_pairs: [known, target] ✅');
console.log('   - lego: [known, target] ✅');
console.log('   - current_seed_legos_available: [known, target] ✅');
console.log('   - practice_phrases: [known, target] ✅');
console.log('   - components: [target, known] ✅ (unchanged)\n');
