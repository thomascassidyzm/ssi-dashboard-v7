#!/usr/bin/env node
/**
 * Import Welsh Course Structure from JSON
 *
 * Re-imports seeds, LEGOs, and practice phrases after cascade deletion.
 * Uses cym_n_for_eng as course_code to match existing courses table.
 *
 * Usage:
 *   node database/import-welsh-structure.cjs --dry-run
 *   node database/import-welsh-structure.cjs
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const JSON_PATH = '/Users/tomcassidy/Downloads/Welsh-north_for_English_speakers_20250604_162031 (5).json';
const COURSE_CODE = 'cym_n_for_eng';  // Must match courses table

// Parse args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

async function main() {
  console.log('='.repeat(60));
  console.log('Welsh Course Structure Import');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE IMPORT'}`);
  console.log(`JSON: ${JSON_PATH}`);
  console.log(`Course: ${COURSE_CODE}`);
  console.log('');

  // Load JSON
  console.log('Loading JSON...');
  const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const slice = jsonData.slices[0];

  // Extract seeds from the slice
  const seeds = slice.seeds || [];
  console.log(`Found ${seeds.length} seeds in JSON`);

  // Build data structures
  const seedsToInsert = [];
  const legosToInsert = [];
  const phrasesToInsert = [];

  // Welsh JSON structure:
  // - seed.node.known.text / seed.node.target.text = seed sentence
  // - seed.introductionItems[] = LEGOs
  // - introductionItem.node.known.text / .target.text = LEGO phrase
  // - introductionItem.nodes[] = practice phrases

  for (let seedIdx = 0; seedIdx < seeds.length; seedIdx++) {
    const seed = seeds[seedIdx];
    const seedNumber = seedIdx + 1;  // 1-indexed
    const seedId = `S${String(seedNumber).padStart(4, '0')}`;

    // Get seed sentence from node
    const knownText = seed.node?.known?.text || seed.seedSentence?.known?.text || '';
    const targetText = seed.node?.target?.text || seed.seedSentence?.target?.text || '';

    // Add seed (seed_id is auto-generated from course_code + seed_number)
    // Omit status to use database default
    seedsToInsert.push({
      course_code: COURSE_CODE,
      seed_number: seedNumber,
      known_text: knownText,
      target_text: targetText
    });

    // Process LEGOs for this seed (called introductionItems in Welsh JSON)
    const legos = seed.introductionItems || [];
    for (let legoIdx = 0; legoIdx < legos.length; legoIdx++) {
      const lego = legos[legoIdx];
      const legoId = `${seedId}L${String(legoIdx + 1).padStart(2, '0')}`;

      // Get LEGO text from node
      const legoKnown = lego.node?.known?.text || '';
      const legoTarget = lego.node?.target?.text || '';

      // lego_id is auto-generated, store our expected id for phrase mapping
      legosToInsert.push({
        course_code: COURSE_CODE,
        seed_number: seedNumber,
        lego_index: legoIdx + 1,
        type: 'A',  // Default to atomic
        is_new: true,
        known_text: legoKnown,
        target_text: legoTarget,
        components: null,
        _expected_lego_id: legoId  // For phrase mapping, not inserted
      });

      // Process practice phrases for this LEGO (called nodes in Welsh JSON)
      // Store seed_number and lego_index for later mapping to actual lego_id
      const phrases = lego.nodes || [];
      for (let phraseIdx = 0; phraseIdx < phrases.length; phraseIdx++) {
        const phrase = phrases[phraseIdx];
        const phraseKnown = phrase.known?.text || '';
        const phraseTarget = phrase.target?.text || '';

        phrasesToInsert.push({
          course_code: COURSE_CODE,
          _seed_number: seedNumber,       // For mapping
          _lego_index: legoIdx + 1,       // For mapping
          phrase_index: phraseIdx + 1,
          known_text: phraseKnown,
          target_text: phraseTarget
        });
      }
    }
  }

  console.log('');
  console.log('Data to import:');
  console.log(`  Seeds: ${seedsToInsert.length}`);
  console.log(`  LEGOs: ${legosToInsert.length}`);
  console.log(`  Practice phrases: ${phrasesToInsert.length}`);

  if (DRY_RUN) {
    console.log('');
    console.log('DRY RUN - No database changes made.');
    console.log('');
    console.log('Sample seed:', JSON.stringify(seedsToInsert[0], null, 2));
    console.log('');
    console.log('Sample LEGO:', JSON.stringify(legosToInsert[0], null, 2));
    console.log('');
    console.log('Sample phrase:', JSON.stringify(phrasesToInsert[0], null, 2));
    return;
  }

  // Connect to Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('');
  console.log('Connected to Supabase.');

  // Step 1: Insert seeds
  console.log('\nStep 1: Inserting seeds...');
  const BATCH_SIZE = 100;
  let seedsInserted = 0;

  for (let i = 0; i < seedsToInsert.length; i += BATCH_SIZE) {
    const batch = seedsToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('course_seeds')
      .upsert(batch, { onConflict: 'course_code,seed_number' });

    if (error) {
      console.error('Error inserting seeds:', error);
      process.exit(1);
    }
    seedsInserted += batch.length;
    process.stdout.write(`\r  Inserted: ${seedsInserted}/${seedsToInsert.length}`);
  }
  console.log('\n  Done.');

  // Step 2: Insert LEGOs
  console.log('\nStep 2: Inserting LEGOs...');
  let legosInserted = 0;

  for (let i = 0; i < legosToInsert.length; i += BATCH_SIZE) {
    const batch = legosToInsert.slice(i, i + BATCH_SIZE);
    // Strip _expected_lego_id before inserting
    const cleanBatch = batch.map(({ _expected_lego_id, ...rest }) => rest);

    const { error } = await supabase
      .from('course_legos')
      .insert(cleanBatch);

    if (error) {
      console.error('Error inserting LEGOs:', error);
      process.exit(1);
    }
    legosInserted += batch.length;
    process.stdout.write(`\r  Inserted: ${legosInserted}/${legosToInsert.length}`);
  }
  console.log('\n  Done.');

  // Step 2b: Query back generated lego_ids for phrase mapping
  console.log('\nStep 2b: Fetching generated lego_ids...');
  const { data: insertedLegos, error: legoQueryError } = await supabase
    .from('course_legos')
    .select('lego_id, seed_number, lego_index')
    .eq('course_code', COURSE_CODE);

  if (legoQueryError) {
    console.error('Error fetching lego_ids:', legoQueryError);
    process.exit(1);
  }

  // Build mapping: seed_number,lego_index -> lego_id
  const legoIdMap = new Map();
  for (const lego of insertedLegos) {
    const key = `${lego.seed_number}:${lego.lego_index}`;
    legoIdMap.set(key, lego.lego_id);
  }
  console.log(`  Mapped ${legoIdMap.size} LEGOs.`);

  // Step 3: Insert practice phrases
  console.log('\nStep 3: Inserting practice phrases...');
  let phrasesInserted = 0;
  let phrasesSkipped = 0;

  for (let i = 0; i < phrasesToInsert.length; i += BATCH_SIZE) {
    const batch = phrasesToInsert.slice(i, i + BATCH_SIZE);

    // Map _seed_number and _lego_index to actual lego_id
    const cleanBatch = batch.map(({ _seed_number, _lego_index, ...rest }) => {
      const key = `${_seed_number}:${_lego_index}`;
      const lego_id = legoIdMap.get(key);
      if (!lego_id) {
        phrasesSkipped++;
        return null;
      }
      return { ...rest, lego_id };
    }).filter(p => p !== null);

    if (cleanBatch.length === 0) continue;

    const { error } = await supabase
      .from('course_practice_phrases')
      .insert(cleanBatch);

    if (error) {
      console.error('Error inserting phrases:', error);
      // Continue with next batch
    } else {
      phrasesInserted += cleanBatch.length;
    }
    process.stdout.write(`\r  Inserted: ${phrasesInserted}/${phrasesToInsert.length}`);
  }
  console.log(`\n  Done. (Skipped: ${phrasesSkipped})`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Import Complete');
  console.log('='.repeat(60));
  console.log(`  Seeds: ${seedsInserted}`);
  console.log(`  LEGOs: ${legosInserted}`);
  console.log(`  Practice phrases: ${phrasesInserted}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
