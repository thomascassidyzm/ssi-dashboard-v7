#!/usr/bin/env node

/**
 * Generate Lego Baskets with Component Drills + LEGO Debut (v10.1)
 *
 * Creates a new lego_baskets_v2.json where:
 * - For M-type LEGOs:
 *   1. Component drills (is_component: true) - building blocks
 *   2. LEGO Debut (is_debut: true) - the complete LEGO
 *   3. Practice sentences - LEGO used in context
 * - For A-type LEGOs: baskets remain unchanged (practice sentences only)
 * - Adds lego_id and type to each basket for better traceability
 *
 * Sequence for M-type:
 *   Components → LEGO Debut → Practice Sentences
 *
 * Input: lego_pairs.json (SSoT), lego_baskets.json (existing baskets)
 * Output: lego_baskets_v2.json
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE = process.argv[2] || 'cmn_for_eng';
const VFS_BASE = path.join(__dirname, '../public/vfs/courses', COURSE);

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log(' GENERATE BASKETS WITH COMPONENT DRILLS');
  console.log(' Course: ' + COURSE);
  console.log('═'.repeat(70));

  try {
    // Load source files
    const legoPairsPath = path.join(VFS_BASE, 'lego_pairs.json');
    const legoBasketsPath = path.join(VFS_BASE, 'lego_baskets.json');

    const legoPairs = await fs.readJson(legoPairsPath);
    const legoBaskets = await fs.readJson(legoBasketsPath);

    console.log(`\nLoaded lego_pairs.json: ${legoPairs.seeds.length} seeds`);
    console.log(`Loaded lego_baskets.json: ${Object.keys(legoBaskets.baskets).length} baskets`);

    // Build map of LEGOs by target text for quick lookup
    const legoByTarget = {};
    for (const seed of legoPairs.seeds) {
      for (const lego of seed.legos) {
        // Key by target text (Chinese)
        legoByTarget[lego.lego.target] = {
          id: lego.id,
          type: lego.type,
          known: lego.lego.known,
          target: lego.lego.target,
          components: lego.components || []
        };
      }
    }

    console.log(`Built LEGO lookup: ${Object.keys(legoByTarget).length} entries`);

    // Process each basket
    const newBaskets = {
      version: '2.0.0',
      format: 'component-drills',
      course: COURSE,
      generated: new Date().toISOString(),
      baskets: {}
    };

    let atomicCount = 0;
    let molecularCount = 0;
    let unmatchedCount = 0;
    let totalComponentsAdded = 0;

    for (const [key, basket] of Object.entries(legoBaskets.baskets)) {
      const targetText = basket.lego.target;
      const legoInfo = legoByTarget[targetText];

      if (!legoInfo) {
        // No match found - keep basket as is but flag it
        newBaskets.baskets[key] = {
          ...basket,
          lego_id: null,
          type: 'UNKNOWN',
          warning: 'No matching LEGO found in lego_pairs.json'
        };
        unmatchedCount++;
        continue;
      }

      // Create new basket with enriched info
      const newBasket = {
        lego_id: legoInfo.id,
        type: legoInfo.type,
        lego: basket.lego,
        practice_phrases: []
      };

      // For M-type LEGOs: Components → LEGO Debut → Practice Sentences
      if (legoInfo.type === 'M' && legoInfo.components.length > 0) {
        // 1. Add components (building blocks)
        for (const component of legoInfo.components) {
          newBasket.practice_phrases.push({
            known: component.known,
            target: component.target,
            is_component: true
          });
          totalComponentsAdded++;
        }

        // 2. Add LEGO Debut (the complete LEGO itself)
        newBasket.practice_phrases.push({
          known: legoInfo.known,
          target: legoInfo.target,
          is_debut: true
        });

        molecularCount++;
      } else {
        atomicCount++;
      }

      // 3. Add existing practice phrases (LEGO used in context)
      for (const phrase of basket.practice_phrases) {
        newBasket.practice_phrases.push({
          known: phrase.known,
          target: phrase.target
        });
      }

      // Preserve other fields
      if (basket.is_final_lego !== undefined) {
        newBasket.is_final_lego = basket.is_final_lego;
      }
      newBasket.phrase_count = newBasket.practice_phrases.length;

      newBaskets.baskets[key] = newBasket;
    }

    console.log('\n' + '-'.repeat(70));
    console.log('PROCESSING SUMMARY:');
    console.log('-'.repeat(70));
    console.log(`  Atomic (A): ${atomicCount} baskets (unchanged)`);
    console.log(`  Molecular (M): ${molecularCount} baskets (components prepended)`);
    console.log(`  Unmatched: ${unmatchedCount} baskets (kept as-is)`);
    console.log(`  Total components added: ${totalComponentsAdded}`);

    // Write output
    const outputPath = path.join(VFS_BASE, 'lego_baskets_v2.json');
    await fs.writeJson(outputPath, newBaskets, { spaces: 2 });
    console.log(`\nSaved to: ${outputPath}`);

    // Show examples
    console.log('\n' + '-'.repeat(70));
    console.log('EXAMPLES:');
    console.log('-'.repeat(70));

    // Find first molecular basket with components
    const molecularExample = Object.entries(newBaskets.baskets)
      .find(([key, basket]) => basket.type === 'M' && basket.practice_phrases.some(p => p.is_component));

    if (molecularExample) {
      const [key, basket] = molecularExample;
      console.log(`\n[Basket ${key}] Molecular - ${basket.lego_id}`);
      console.log(`  LEGO: "${basket.lego.known}" = "${basket.lego.target}"`);
      console.log(`  Cycle sequence (${basket.phrase_count} total):`);

      // Show first 6 phrases to include components, debut, and first practice
      const firstSix = basket.practice_phrases.slice(0, 6);
      for (let i = 0; i < firstSix.length; i++) {
        const phrase = firstSix[i];
        let marker = '';
        if (phrase.is_component) marker = '[COMPONENT]';
        else if (phrase.is_debut) marker = '[DEBUT]';
        else marker = '[PRACTICE]';
        console.log(`    ${i + 1}. "${phrase.known}" = "${phrase.target}" ${marker}`);
      }
      if (basket.phrase_count > 6) {
        console.log(`    ... and ${basket.phrase_count - 6} more practice phrases`);
      }
    }

    // Find first atomic basket
    const atomicExample = Object.entries(newBaskets.baskets)
      .find(([key, basket]) => basket.type === 'A');

    if (atomicExample) {
      const [key, basket] = atomicExample;
      console.log(`\n[Basket ${key}] Atomic - ${basket.lego_id}`);
      console.log(`  LEGO: "${basket.lego.known}" = "${basket.lego.target}"`);
      console.log(`  Practice phrases (${basket.phrase_count} total, no components):`);

      // Show first 3 phrases
      const firstThree = basket.practice_phrases.slice(0, 3);
      for (let i = 0; i < firstThree.length; i++) {
        const phrase = firstThree[i];
        console.log(`    ${i + 1}. "${phrase.known}" = "${phrase.target}"`);
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log(' COMPLETE');
    console.log('═'.repeat(70));
    console.log('\nNew basket format (v10.1):');
    console.log('  - lego_id: S0001L02 (links to lego_pairs.json)');
    console.log('  - type: A or M');
    console.log('  - M-type cycle sequence:');
    console.log('      1. Components (is_component: true) - building blocks');
    console.log('      2. LEGO Debut (is_debut: true) - combine into complete LEGO');
    console.log('      3. Practice sentences - LEGO used in context');
    console.log('  - A-type: practice sentences only (no components/debut)\n');

  } catch (error) {
    console.error('\nError:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
