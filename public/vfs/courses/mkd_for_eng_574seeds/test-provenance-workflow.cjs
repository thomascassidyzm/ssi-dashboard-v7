#!/usr/bin/env node

/**
 * Provenance Workflow Demonstration
 *
 * Demonstrates how editing a seed propagates through the amino acid system.
 * Shows complete traceability from seed → LEGOs → deduplicated LEGOs → baskets.
 */

const fs = require('fs-extra');
const path = require('path');

const TRANSLATIONS_DIR = path.join(__dirname, 'amino_acids', 'translations');
const LEGOS_DIR = path.join(__dirname, 'amino_acids', 'legos');
const DEDUPE_DIR = path.join(__dirname, 'amino_acids', 'legos_deduplicated');
const BASKETS_DIR = path.join(__dirname, 'amino_acids', 'baskets');

// =============================================================================
// PROVENANCE TRACER
// =============================================================================

/**
 * Trace complete provenance chain for a seed
 */
async function traceSeedProvenance(seedId) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`Provenance Chain for Seed ${seedId}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Find the translation
  console.log('📖 Step 1: Translation (Seed)\n');
  const translationFiles = await fs.readdir(TRANSLATIONS_DIR);
  let translation = null;

  for (const file of translationFiles) {
    const data = await fs.readJson(path.join(TRANSLATIONS_DIR, file));
    if (data.seed_id === seedId) {
      translation = data;
      break;
    }
  }

  if (!translation) {
    console.log(`   ❌ Seed ${seedId} not found`);
    return;
  }

  console.log(`   UUID: ${translation.uuid}`);
  console.log(`   Seed ID: ${translation.seed_id}`);
  console.log(`   Source: "${translation.source}"`);
  console.log(`   Target: "${translation.target}"`);
  console.log('');

  // 2. Find all LEGOs from this translation
  console.log('🧬 Step 2: LEGOs Extracted\n');
  const legoFiles = await fs.readdir(LEGOS_DIR);
  const legos = [];

  for (const file of legoFiles) {
    const data = await fs.readJson(path.join(LEGOS_DIR, file));
    if (data.source_translation_uuid === translation.uuid) {
      legos.push(data);
    }
  }

  legos.sort((a, b) => a.provenance.localeCompare(b.provenance));

  console.log(`   Found ${legos.length} LEGOs:\n`);
  legos.forEach(lego => {
    console.log(`   ${lego.provenance}: "${lego.text}"`);
    console.log(`      UUID: ${lego.uuid}`);
    console.log(`      Scores: FCFS=${lego.fcfs_score}, Utility=${lego.utility_score}, Pedagogical=${lego.pedagogical_score}`);
    console.log('');
  });

  // 3. Find deduplicated LEGOs
  console.log('🔄 Step 3: Deduplicated LEGOs\n');
  const dedupeFiles = await fs.readdir(DEDUPE_DIR);
  const deduplicatedLEGOs = [];

  for (const file of dedupeFiles) {
    const data = await fs.readJson(path.join(DEDUPE_DIR, file));

    // Check if any provenance in this deduplicated LEGO came from our seed
    const hasOurSeed = data.provenance.some(p => p.source_seed_id === seedId);

    if (hasOurSeed) {
      deduplicatedLEGOs.push(data);
    }
  }

  console.log(`   Found ${deduplicatedLEGOs.length} deduplicated LEGOs containing our seed:\n`);
  deduplicatedLEGOs.forEach(lego => {
    console.log(`   "${lego.text}"`);
    console.log(`      UUID: ${lego.uuid}`);
    console.log(`      Duplicate Count: ${lego.metadata.duplicate_count}`);
    console.log(`      All Sources: ${lego.metadata.all_sources}`);

    // Show which specific provenance entries are from our seed
    const ourProvenance = lego.provenance.filter(p => p.source_seed_id === seedId);
    ourProvenance.forEach(p => {
      console.log(`      ✓ Our seed: ${p.provenance} (original UUID: ${p.original_uuid})`);
    });

    console.log('');
  });

  // 4. Find baskets containing these LEGOs
  console.log('🗂️  Step 4: Baskets Containing Our LEGOs\n');
  const basketFiles = await fs.readdir(BASKETS_DIR);
  const basketsWithOurLEGOs = [];

  for (const file of basketFiles) {
    const basket = await fs.readJson(path.join(BASKETS_DIR, file));

    // Check if basket contains any of our deduplicated LEGOs
    const ourLegoUUIDs = new Set(deduplicatedLEGOs.map(l => l.uuid));
    const containsOurLEGOs = basket.legos.some(l => ourLegoUUIDs.has(l.uuid));

    if (containsOurLEGOs) {
      basketsWithOurLEGOs.push(basket);
    }
  }

  console.log(`   Found ${basketsWithOurLEGOs.length} baskets containing our LEGOs:\n`);
  basketsWithOurLEGOs.forEach(basket => {
    console.log(`   Basket ${basket.basket_id}:`);
    console.log(`      Total LEGOs: ${basket.lego_count}`);

    // Show which specific LEGOs in this basket came from our seed
    const ourLegoUUIDs = new Set(deduplicatedLEGOs.map(l => l.uuid));
    const ourLEGOsInBasket = basket.legos.filter(l => ourLegoUUIDs.has(l.uuid));

    ourLEGOsInBasket.forEach(lego => {
      console.log(`      ✓ "${lego.text}"`);
    });

    console.log('');
  });

  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Provenance Summary');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Seed ${seedId}: "${translation.source}"`);
  console.log(`  → ${legos.length} LEGOs extracted`);
  console.log(`  → ${deduplicatedLEGOs.length} deduplicated LEGOs`);
  console.log(`  → ${basketsWithOurLEGOs.length} baskets impacted`);
  console.log('');
  console.log('Edit Impact Analysis:');
  console.log('  If you edit this seed:');
  console.log(`  - ${legos.length} LEGOs would need regeneration`);
  console.log(`  - ${deduplicatedLEGOs.length} deduplicated LEGOs would need update`);
  console.log(`  - ${basketsWithOurLEGOs.length} baskets would be affected`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  return {
    seed: translation,
    legos: legos,
    deduplicatedLEGOs: deduplicatedLEGOs,
    baskets: basketsWithOurLEGOs
  };
}

/**
 * Simulate editing a seed and show propagation
 */
async function simulateEdit(seedId, newSourceText) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`Simulating Edit: ${seedId}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Get current provenance
  const provenance = await traceSeedProvenance(seedId);

  if (!provenance) {
    return;
  }

  console.log('🔄 Edit Simulation:\n');
  console.log(`   Old Source: "${provenance.seed.source}"`);
  console.log(`   New Source: "${newSourceText}"`);
  console.log('');

  console.log('📋 Propagation Steps Required:\n');
  console.log('   1. Update translation amino acid:');
  console.log(`      - File: amino_acids/translations/${provenance.seed.uuid}.json`);
  console.log(`      - Update source field`);
  console.log(`      - Regenerate UUID (deterministic hash of new content)`);
  console.log('');

  console.log('   2. Regenerate LEGOs:');
  console.log(`      - Delete ${provenance.legos.length} old LEGO files`);
  console.log('      - Extract new LEGOs from updated source');
  console.log('      - Preserve provenance format (S{seed}L{position})');
  console.log('');

  console.log('   3. Update deduplicated LEGOs:');
  console.log(`      - Update ${provenance.deduplicatedLEGOs.length} deduplicated files`);
  console.log('      - Remove old provenance entries from our seed');
  console.log('      - Add new provenance entries from regenerated LEGOs');
  console.log('      - Recalculate merged scores');
  console.log('');

  console.log('   4. Refresh baskets:');
  console.log(`      - Update ${provenance.baskets.length} basket files`);
  console.log('      - Replace old LEGO references with new ones');
  console.log('      - Recalculate basket scores');
  console.log('');

  console.log('✅ Provenance System Benefits:\n');
  console.log('   • Complete traceability: seed → LEGOs → baskets');
  console.log('   • Edit impact analysis: know exactly what changes');
  console.log('   • Immutability: edits create NEW amino acids, preserving history');
  console.log('   • Deterministic UUIDs: reproducible builds');
  console.log('   • Graph integrity: adjacency patterns automatically update');
  console.log('');
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       SSi Course Production - Provenance System Demo         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  // Test 1: Trace seed C0044
  await traceSeedProvenance('C0044');

  // Test 2: Simulate editing seed C0044
  await simulateEdit('C0044', 'I believe that you are doing extremely well.');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ Provenance Demonstration Complete!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Key Takeaways:');
  console.log('  1. Every amino acid has deterministic UUID (hash-based)');
  console.log('  2. Provenance preserved at every step (S{seed}L{position})');
  console.log('  3. Complete traceability: seed → LEGO → dedupe → basket');
  console.log('  4. Edit impact visible before making changes');
  console.log('  5. System designed for immutability + reproducibility');
  console.log('');
  console.log('Ready for production course editing workflow!');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Demo failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
