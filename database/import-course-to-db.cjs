#!/usr/bin/env node
/**
 * Import Course Structure to Database
 *
 * Imports lego_pairs.json and lego_baskets.json into Supabase tables.
 * This is a one-time migration from JSON files to database-first architecture.
 *
 * Usage:
 *   node database/import-course-to-db.cjs <course_code> [--dry-run]
 *
 * Example:
 *   node database/import-course-to-db.cjs spa_for_eng_v2 --dry-run
 *   node database/import-course-to-db.cjs spa_for_eng_v2
 */

require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Config
const VFS_COURSES = path.join(__dirname, '..', 'public', 'vfs', 'courses');
const CANONICAL_DIR = path.join(__dirname, '..', 'public', 'vfs', 'canonical');

// Supabase client
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
// HELPERS
// =============================================================================

/**
 * Parse seed number from seed_id
 * "s0042" -> 42
 */
function parseSeedNumber(seedId) {
  const match = seedId.match(/s?(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parse LEGO index from lego_id
 * "lego_s0042_001" -> 1
 */
function parseLegoIndex(legoId) {
  const match = legoId.match(/_(\d+)$/);
  return match ? parseInt(match[1], 10) : 1;
}

// =============================================================================
// MAIN IMPORT
// =============================================================================

async function importCourse(courseCode, dryRun = false) {
  console.log('='.repeat(60));
  console.log('Import Course to Database');
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

  console.log(`Loaded lego_pairs.json: ${legoPairs.seeds?.length || 0} seeds`);
  console.log(`Loaded lego_baskets.json: ${Object.keys(legoBaskets.baskets || {}).length} baskets`);
  console.log();

  // Build basket lookup
  const basketLookup = {};
  for (const [legoId, basket] of Object.entries(legoBaskets.baskets || {})) {
    basketLookup[legoId] = basket;
  }

  // Check course exists
  const { data: courseData, error: courseError } = await supabase
    .from('courses')
    .select('course_code')
    .eq('course_code', courseCode)
    .single();

  if (courseError && courseError.code !== 'PGRST116') {
    throw courseError;
  }

  if (!courseData) {
    console.log(`Course ${courseCode} not found in database. Creating...`);
    if (!dryRun) {
      // Extract language codes from course code (spa_for_eng -> spa, eng)
      const match = courseCode.match(/^(\w{3})_for_(\w{3})/);
      if (!match) {
        throw new Error(`Invalid course code format: ${courseCode}`);
      }
      const [, targetLang, knownLang] = match;

      await supabase.from('courses').insert({
        course_code: courseCode,
        known_lang: knownLang,
        target_lang: targetLang
      });
      console.log(`Created course: ${courseCode}`);
    }
  }

  // Stats
  const stats = {
    seeds: 0,
    legos: 0,
    newLegos: 0,
    components: 0,
    basketPhrases: 0
  };

  // Process seeds
  console.log('\nProcessing seeds...\n');

  for (let seedIndex = 0; seedIndex < legoPairs.seeds.length; seedIndex++) {
    const seedData = legoPairs.seeds[seedIndex];
    const seedId = seedData.seed_id;
    const seedNumber = parseSeedNumber(seedId);

    if (!seedNumber) {
      console.warn(`  Warning: Could not parse seed number from ${seedId}`);
      continue;
    }

    const seedKnown = seedData.seed_pair?.known || seedData.seed?.known;
    const seedTarget = seedData.seed_pair?.target || seedData.seed?.target;

    if (!seedKnown || !seedTarget) {
      console.warn(`  Warning: Seed ${seedId} missing known/target text`);
      continue;
    }

    // Insert seed
    let seedUuid;
    if (!dryRun) {
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
      seedUuid = insertedSeed.id;
    }

    stats.seeds++;

    // Process LEGOs for this seed
    const legos = seedData.legos || [];
    let legoPosition = 0;

    for (const lego of legos) {
      legoPosition++;
      const legoIndex = parseLegoIndex(lego.id);
      const legoKnown = lego.lego?.known;
      const legoTarget = lego.lego?.target;

      if (!legoKnown || !legoTarget) {
        console.warn(`  Warning: LEGO ${lego.id} missing known/target text`);
        continue;
      }

      // Insert LEGO
      let legoUuid;
      if (!dryRun) {
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
            position: legoPosition
          }, {
            onConflict: 'seed_id,lego_index'
          })
          .select('id')
          .single();

        if (legoError) throw legoError;
        legoUuid = insertedLego.id;
      }

      stats.legos++;
      if (lego.new === true) stats.newLegos++;

      // Insert components (for M-type LEGOs)
      if (lego.type === 'M' && lego.components && lego.components.length > 0) {
        for (let compIndex = 0; compIndex < lego.components.length; compIndex++) {
          const comp = lego.components[compIndex];
          if (!dryRun && legoUuid) {
            await supabase
              .from('lego_components')
              .upsert({
                lego_id: legoUuid,
                position: compIndex + 1,
                known_text: comp.known,
                target_text: comp.target
              }, {
                onConflict: 'lego_id,position'
              });
          }
          stats.components++;
        }
      }

      // Insert basket phrases
      const basket = basketLookup[lego.id];
      if (basket && !dryRun && legoUuid) {
        const phrases = basket.debut_phrases || basket.practice_phrases || [];
        for (let phraseIndex = 0; phraseIndex < phrases.length; phraseIndex++) {
          const phrase = phrases[phraseIndex];
          await supabase
            .from('basket_phrases')
            .upsert({
              lego_id: legoUuid,
              known_text: phrase.known,
              target_text: phrase.target,
              phrase_type: phrase.is_debut ? 'debut' : (phrase.is_component ? 'component' : 'practice'),
              position: phraseIndex + 1,
              is_debut: phrase.is_debut || false,
              is_component: phrase.is_component || false
            }, {
              onConflict: 'lego_id,position'
            });
          stats.basketPhrases++;
        }
      } else if (basket) {
        // Dry run - just count
        stats.basketPhrases += (basket.debut_phrases || basket.practice_phrases || []).length;
      }
    }

    // Progress indicator
    if ((seedIndex + 1) % 50 === 0) {
      console.log(`  Processed ${seedIndex + 1}/${legoPairs.seeds.length} seeds...`);
    }
  }

  // Import encouragements
  console.log('\nImporting encouragements...');
  const encouragementsPath = path.join(CANONICAL_DIR, 'eng_encouragements.json');
  if (await fs.pathExists(encouragementsPath)) {
    const encouragements = await fs.readJson(encouragementsPath);

    if (!dryRun) {
      // Pooled encouragements
      for (const enc of (encouragements.pooledEncouragements || [])) {
        await supabase
          .from('encouragements')
          .upsert({
            text: enc.text,
            pool_type: 'pooled',
            lang: 'eng'
          }, {
            onConflict: 'text'
          });
      }

      // Ordered encouragements
      for (let i = 0; i < (encouragements.orderedEncouragements || []).length; i++) {
        const enc = encouragements.orderedEncouragements[i];
        await supabase
          .from('encouragements')
          .upsert({
            text: enc.text,
            pool_type: 'ordered',
            position: i + 1,
            lang: 'eng'
          }, {
            onConflict: 'text'
          });
      }
    }

    console.log(`  Pooled: ${encouragements.pooledEncouragements?.length || 0}`);
    console.log(`  Ordered: ${encouragements.orderedEncouragements?.length || 0}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('IMPORT COMPLETE');
  console.log('='.repeat(60));
  console.log(`Seeds:          ${stats.seeds}`);
  console.log(`LEGOs:          ${stats.legos} (${stats.newLegos} new)`);
  console.log(`Components:     ${stats.components}`);
  console.log(`Basket phrases: ${stats.basketPhrases}`);
  console.log();

  if (dryRun) {
    console.log('DRY RUN - no changes made to database');
    console.log('Remove --dry-run to execute');
  }

  return stats;
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const courseCode = args.find(a => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');

  if (!courseCode) {
    console.error('Usage: node database/import-course-to-db.cjs <course_code> [--dry-run]');
    console.error('Example: node database/import-course-to-db.cjs spa_for_eng_v2');
    process.exit(1);
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    process.exit(1);
  }

  await importCourse(courseCode, dryRun);
}

main().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});

module.exports = { importCourse };
