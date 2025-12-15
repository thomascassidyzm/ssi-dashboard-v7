#!/usr/bin/env node
/**
 * Inspect all database data for a specific course
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function inspectCourse(courseCode) {
  console.log(`\n=== DATABASE INSPECTION: ${courseCode} ===\n`);

  // 1. Get all seeds for this course
  const { data: seeds, error: seedErr } = await supabase
    .from('seeds')
    .select('id, seed_number, known_text, target_text')
    .eq('course_code', courseCode)
    .order('seed_number');

  if (seedErr) {
    console.error('Error fetching seeds:', seedErr.message);
    return;
  }

  console.log(`SEEDS: ${seeds.length}`);
  if (seeds.length > 0) {
    console.log('  First 3:');
    seeds.slice(0, 3).forEach(s => {
      console.log(`    S${String(s.seed_number).padStart(4, '0')}: "${s.known_text}" → "${s.target_text}"`);
    });
    if (seeds.length > 3) {
      console.log(`    ... and ${seeds.length - 3} more`);
    }
  }

  // 2. Get all LEGOs for these seeds
  const seedIds = seeds.map(s => s.id);

  if (seedIds.length === 0) {
    console.log('\nNo seeds found - cannot check LEGOs');
    return;
  }

  const { data: legos, error: legoErr } = await supabase
    .from('legos')
    .select('id, seed_id, lego_id, lego_index, known_text, target_text, type, is_new')
    .in('seed_id', seedIds)
    .order('lego_id');

  if (legoErr) {
    console.error('Error fetching legos:', legoErr.message);
    return;
  }

  console.log(`\nLEGOS: ${legos.length}`);

  // Group by seed to show distribution
  const legosBySeed = {};
  legos.forEach(l => {
    if (!legosBySeed[l.seed_id]) legosBySeed[l.seed_id] = [];
    legosBySeed[l.seed_id].push(l);
  });

  const legoCounts = Object.values(legosBySeed).map(arr => arr.length);
  const avgLegos = legoCounts.length > 0 ? (legoCounts.reduce((a,b) => a+b, 0) / legoCounts.length).toFixed(1) : 0;
  const minLegos = legoCounts.length > 0 ? Math.min(...legoCounts) : 0;
  const maxLegos = legoCounts.length > 0 ? Math.max(...legoCounts) : 0;

  console.log(`  Distribution: min=${minLegos}, avg=${avgLegos}, max=${maxLegos} per seed`);
  console.log(`  Types: A=${legos.filter(l => l.type === 'A').length}, M=${legos.filter(l => l.type === 'M').length}`);
  console.log(`  New: ${legos.filter(l => l.is_new).length}, Not new: ${legos.filter(l => !l.is_new).length}`);

  if (legos.length > 0) {
    console.log('  First 5:');
    legos.slice(0, 5).forEach(l => {
      console.log(`    ${l.lego_id}: "${l.known_text}" → "${l.target_text}" [${l.type}${l.is_new ? ', NEW' : ''}]`);
    });
  }

  // 3. Get LEGO components
  const legoIds = legos.map(l => l.id);

  if (legoIds.length > 0) {
    const { data: components, error: compErr } = await supabase
      .from('lego_components')
      .select('id, lego_id, position, known_text, target_text')
      .in('lego_id', legoIds);

    if (!compErr) {
      console.log(`\nLEGO COMPONENTS: ${components.length}`);
      if (components.length > 0) {
        console.log('  First 3:');
        components.slice(0, 3).forEach(c => {
          console.log(`    Position ${c.position}: "${c.known_text}" → "${c.target_text}"`);
        });
      }
    }

    // 4. Get basket phrases
    const { data: baskets, error: basketErr } = await supabase
      .from('basket_phrases')
      .select('id, lego_id, position, known_text, target_text, phrase_type, is_debut, is_component')
      .in('lego_id', legoIds);

    if (!basketErr) {
      console.log(`\nBASKET PHRASES: ${baskets.length}`);

      const byType = {};
      baskets.forEach(b => {
        byType[b.phrase_type] = (byType[b.phrase_type] || 0) + 1;
      });
      console.log('  By type:', JSON.stringify(byType));
      console.log(`  Debut: ${baskets.filter(b => b.is_debut).length}, Component: ${baskets.filter(b => b.is_component).length}`);

      if (baskets.length > 0) {
        console.log('  First 3:');
        baskets.slice(0, 3).forEach(b => {
          console.log(`    [${b.phrase_type}] "${b.known_text}" → "${b.target_text}"`);
        });
      }
    }
  }

  // 5. Compare with source JSON
  console.log('\n=== SOURCE FILE COMPARISON ===');
  const fs = require('fs-extra');
  const path = require('path');

  const coursePath = path.join(__dirname, '..', 'public', 'vfs', 'courses', courseCode);

  const legoPairsPath = path.join(coursePath, 'lego_pairs.json');
  const legoBasketsPath = path.join(coursePath, 'lego_baskets.json');

  if (await fs.pathExists(legoPairsPath)) {
    const legoPairs = await fs.readJson(legoPairsPath);
    const jsonSeeds = legoPairs.seeds?.length || 0;
    let jsonLegos = 0;
    let jsonComponents = 0;

    legoPairs.seeds?.forEach(s => {
      jsonLegos += (s.legos || []).length;
      s.legos?.forEach(l => {
        if (l.components) jsonComponents += l.components.length;
      });
    });

    console.log(`lego_pairs.json:`);
    console.log(`  Seeds: ${jsonSeeds} (DB: ${seeds.length}) ${jsonSeeds === seeds.length ? '✓' : '✗ MISMATCH'}`);
    console.log(`  LEGOs: ${jsonLegos} (DB: ${legos.length}) ${jsonLegos === legos.length ? '✓' : '✗ MISMATCH'}`);
  }

  if (await fs.pathExists(legoBasketsPath)) {
    const legoBaskets = await fs.readJson(legoBasketsPath);
    let jsonPhrases = 0;

    Object.values(legoBaskets.baskets || {}).forEach(basket => {
      jsonPhrases += (basket.debut_phrases || basket.practice_phrases || []).length;
    });

    const { data: dbBaskets } = await supabase
      .from('basket_phrases')
      .select('id')
      .in('lego_id', legoIds);

    const dbPhraseCount = dbBaskets?.length || 0;
    console.log(`lego_baskets.json:`);
    console.log(`  Baskets: ${Object.keys(legoBaskets.baskets || {}).length}`);
    console.log(`  Phrases: ${jsonPhrases} (DB: ${dbPhraseCount}) ${jsonPhrases === dbPhraseCount ? '✓' : '✗ MISMATCH'}`);
  }

  console.log('\n=== END ===\n');
}

// CLI
const courseCode = process.argv[2] || 'spa_for_eng_v2';
inspectCourse(courseCode).catch(console.error);
