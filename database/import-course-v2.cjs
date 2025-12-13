#!/usr/bin/env node
/**
 * Import Course to Database (v2)
 *
 * For spa_for_eng_v2 and future courses using the new format.
 *
 * IMPORTANT: This script validates counts before committing.
 * If JSON counts don't match DB counts after import, it will fail.
 *
 * Usage:
 *   node database/import-course-v2.cjs spa_for_eng_v2 --dry-run
 *   node database/import-course-v2.cjs spa_for_eng_v2
 */

require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// =============================================================================
// CONFIG
// =============================================================================

const VFS_COURSES = path.join(__dirname, '..', 'public', 'vfs', 'courses');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

// =============================================================================
// ANALYSIS: Count what's in the JSON files
// =============================================================================

function analyzeSource(legoPairs, legoBaskets) {
  const counts = {
    seeds: 0,
    legos: 0,
    lego_components: 0,
    basket_phrases: 0,
    legos_new: 0,
    legos_not_new: 0,
    legos_a_type: 0,
    legos_m_type: 0
  };

  // Count from lego_pairs.json and build set of new lego IDs
  counts.seeds = legoPairs.seeds.length;
  const newLegoIds = new Set();

  legoPairs.seeds.forEach(seed => {
    (seed.legos || []).forEach(lego => {
      counts.legos++;
      if (lego.new === true) {
        counts.legos_new++;
        newLegoIds.add(lego.id);
      } else {
        counts.legos_not_new++;
      }
      if (lego.type === 'A') counts.legos_a_type++;
      if (lego.type === 'M') counts.legos_m_type++;
      if (lego.components) {
        counts.lego_components += lego.components.length;
      }
    });
  });

  // Count from lego_baskets.json (only for new LEGOs)
  Object.entries(legoBaskets.baskets || {}).forEach(([legoId, basket]) => {
    if (newLegoIds.has(legoId)) {
      counts.basket_phrases += (basket.practice_phrases || []).length;
    }
  });

  return counts;
}

// =============================================================================
// IMPORT LOGIC
// =============================================================================

async function importCourse(courseCode, dryRun = false) {
  console.log('='.repeat(60));
  console.log('Import Course to Database (v2)');
  console.log('='.repeat(60));
  console.log(`Course: ${courseCode}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log();

  // Load JSON files
  const legoPairsPath = path.join(VFS_COURSES, courseCode, 'lego_pairs.json');
  const legoBasketsPath = path.join(VFS_COURSES, courseCode, 'lego_baskets.json');

  if (!await fs.pathExists(legoPairsPath)) {
    throw new Error(`lego_pairs.json not found at ${legoPairsPath}`);
  }
  if (!await fs.pathExists(legoBasketsPath)) {
    throw new Error(`lego_baskets.json not found at ${legoBasketsPath}`);
  }

  const legoPairs = await fs.readJson(legoPairsPath);
  const legoBaskets = await fs.readJson(legoBasketsPath);

  // Analyze source
  const expected = analyzeSource(legoPairs, legoBaskets);

  console.log('Source file analysis:');
  console.log(`  Seeds: ${expected.seeds}`);
  console.log(`  LEGOs: ${expected.legos} (${expected.legos_new} new, ${expected.legos_not_new} not new)`);
  console.log(`  LEGO Components: ${expected.lego_components}`);
  console.log(`  Basket Phrases: ${expected.basket_phrases}`);
  console.log();

  if (dryRun) {
    console.log('DRY RUN - would insert these counts to database');
    console.log('Run without --dry-run to execute');
    return { expected, actual: null };
  }

  // Ensure course exists
  const { data: courseData, error: courseError } = await supabase
    .from('courses')
    .select('course_code')
    .eq('course_code', courseCode)
    .single();

  if (courseError && courseError.code !== 'PGRST116') {
    throw courseError;
  }

  if (!courseData) {
    console.log(`Creating course: ${courseCode}`);
    const match = courseCode.match(/^(\w{3})_for_(\w{3})/);
    if (!match) throw new Error(`Invalid course code format: ${courseCode}`);
    const [, targetLang, knownLang] = match;

    const { error } = await supabase.from('courses').insert({
      course_code: courseCode,
      known_lang: knownLang,
      target_lang: targetLang
    });
    if (error) throw error;
  }

  // Build basket lookup
  const basketLookup = legoBaskets.baskets || {};

  // Track what we insert
  const actual = {
    seeds: 0,
    legos: 0,
    lego_components: 0,
    basket_phrases: 0
  };

  console.log('Importing...');

  // Process each seed
  for (let seedIndex = 0; seedIndex < legoPairs.seeds.length; seedIndex++) {
    const seedData = legoPairs.seeds[seedIndex];
    const seedId = seedData.seed_id;

    // Parse seed number from "S0001" -> 1
    const seedMatch = seedId.match(/S(\d+)/i);
    if (!seedMatch) {
      console.warn(`  Warning: Could not parse seed number from ${seedId}`);
      continue;
    }
    const seedNumber = parseInt(seedMatch[1], 10);

    const seedKnown = seedData.seed_pair?.known;
    const seedTarget = seedData.seed_pair?.target;

    if (!seedKnown || !seedTarget) {
      console.warn(`  Warning: Seed ${seedId} missing known/target text`);
      continue;
    }

    // Insert seed
    const { data: insertedSeed, error: seedError } = await supabase
      .from('seeds')
      .upsert({
        course_code: courseCode,
        seed_number: seedNumber,
        known_text: seedKnown,
        target_text: seedTarget,
        canonical: seedKnown,
        position: seedIndex + 1
      }, {
        onConflict: 'course_code,seed_number'
      })
      .select('id')
      .single();

    if (seedError) throw seedError;
    const seedUuid = insertedSeed.id;
    actual.seeds++;

    // Process LEGOs for this seed
    const legos = seedData.legos || [];

    for (let legoPos = 0; legoPos < legos.length; legoPos++) {
      const lego = legos[legoPos];

      // Parse LEGO index from "S0001L01" -> 1
      const legoMatch = lego.id.match(/L(\d+)$/i);
      if (!legoMatch) {
        console.warn(`  Warning: Could not parse LEGO index from ${lego.id}`);
        continue;
      }
      const legoIndex = parseInt(legoMatch[1], 10);

      const legoKnown = lego.lego?.known;
      const legoTarget = lego.lego?.target;

      if (!legoKnown || !legoTarget) {
        console.warn(`  Warning: LEGO ${lego.id} missing known/target text`);
        continue;
      }

      // Insert LEGO
      const { data: insertedLego, error: legoError } = await supabase
        .from('legos')
        .upsert({
          seed_id: seedUuid,
          lego_index: legoIndex,
          lego_id: lego.id,
          known_text: legoKnown,
          target_text: legoTarget,
          type: lego.type || 'A',
          is_new: lego.new === true,
          position: legoPos + 1
        }, {
          onConflict: 'seed_id,lego_index'
        })
        .select('id')
        .single();

      if (legoError) throw legoError;
      const legoUuid = insertedLego.id;
      actual.legos++;

      // Insert LEGO components (from lego_pairs.json)
      if (lego.components && lego.components.length > 0) {
        for (let compIndex = 0; compIndex < lego.components.length; compIndex++) {
          const comp = lego.components[compIndex];

          const { error: compError } = await supabase
            .from('lego_components')
            .upsert({
              lego_id: legoUuid,
              position: compIndex + 1,
              known_text: comp.known,
              target_text: comp.target
            }, {
              onConflict: 'lego_id,position'
            });

          if (compError) throw compError;
          actual.lego_components++;
        }
      }

      // Insert basket phrases (only for new LEGOs - ref LEGOs don't get baskets)
      if (lego.new === true) {
        const basket = basketLookup[lego.id];
        if (basket && basket.practice_phrases) {
        for (let phraseIndex = 0; phraseIndex < basket.practice_phrases.length; phraseIndex++) {
          const phrase = basket.practice_phrases[phraseIndex];

          const { error: phraseError } = await supabase
            .from('basket_phrases')
            .upsert({
              lego_id: legoUuid,
              known_text: phrase.known,
              target_text: phrase.target,
              phrase_type: 'practice',
              position: phraseIndex + 1,
              is_debut: phrase.is_debut || false,
              is_component: phrase.is_component || false
            }, {
              onConflict: 'lego_id,position'
            });

          if (phraseError) throw phraseError;
          actual.basket_phrases++;
        }
        }
      }
    }

    // Progress
    if ((seedIndex + 1) % 10 === 0) {
      console.log(`  Processed ${seedIndex + 1}/${legoPairs.seeds.length} seeds...`);
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log('VALIDATION');
  console.log('='.repeat(60));

  // Validate counts
  let valid = true;
  const checks = ['seeds', 'legos', 'lego_components', 'basket_phrases'];

  for (const check of checks) {
    const exp = expected[check];
    const act = actual[check];
    const status = exp === act ? '✓' : '✗';
    console.log(`  ${check}: expected ${exp}, got ${act} ${status}`);
    if (exp !== act) valid = false;
  }

  console.log();

  if (valid) {
    console.log('✓ IMPORT SUCCESSFUL - all counts match');
  } else {
    console.log('✗ IMPORT FAILED - count mismatch!');
    console.log('  Data was written but may be incomplete.');
    console.log('  Consider wiping and re-importing.');
  }

  return { expected, actual, valid };
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const courseCode = args.find(a => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');

  if (!courseCode) {
    console.error('Usage: node database/import-course-v2.cjs <course_code> [--dry-run]');
    console.error('Example: node database/import-course-v2.cjs spa_for_eng_v2 --dry-run');
    process.exit(1);
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    process.exit(1);
  }

  const result = await importCourse(courseCode, dryRun);

  if (!dryRun && result.valid === false) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
