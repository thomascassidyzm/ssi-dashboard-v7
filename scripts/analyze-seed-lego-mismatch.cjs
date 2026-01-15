#!/usr/bin/env node
/**
 * Analyze seed vs LEGO mismatches
 * Compare seed translations to what would be derived from LEGOs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const COURSE_CODE = 'zho_for_eng';

async function analyze() {
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', COURSE_CODE)
    .order('seed_number');

  console.log('SEED vs DERIVED-FROM-LEGOS ANALYSIS');
  console.log('='.repeat(70));

  const results = {
    match: [],
    derivable: [],      // Seed empty or wrong, but LEGOs match seed English
    totalMismatch: []   // LEGOs don't even relate to seed English
  };

  for (const seed of seeds || []) {
    const { data: legos } = await supabase
      .from('course_legos')
      .select('lego_index, known_text, target_text, is_new')
      .eq('course_code', COURSE_CODE)
      .eq('seed_number', seed.seed_number)
      .order('lego_index');

    if (!legos || legos.length === 0) continue;

    // Derive seed from LEGOs
    const derivedTarget = legos.map(l => l.target_text).join('');
    const derivedKnown = legos.map(l => l.known_text).join(' ');

    const seedTarget = seed.target_text || '';

    // Check if current seed matches derived
    const targetMatches = seedTarget === derivedTarget ||
      seedTarget.replace(/[。，！？、：；]/g, '') === derivedTarget;

    if (targetMatches) {
      results.match.push(seed.seed_number);
      continue;
    }

    // Check if LEGOs relate to seed English (word overlap)
    const legoKnowns = legos.map(l => l.known_text.toLowerCase());
    const seedWords = seed.known_text.toLowerCase()
      .replace(/[.,!?'"]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);  // Skip short words like "I", "to", etc.

    // Count meaningful overlap
    let overlapCount = 0;
    for (const word of seedWords) {
      if (legoKnowns.some(lk => lk.includes(word) || word.includes(lk.split(' ')[0]))) {
        overlapCount++;
      }
    }

    const overlapRatio = overlapCount / seedWords.length;

    if (overlapRatio >= 0.3) {
      // LEGOs seem to relate to seed - just need derivation
      results.derivable.push({
        seed: seed.seed_number,
        seedKnown: seed.known_text,
        currentTarget: seedTarget,
        derivedTarget,
        derivedKnown
      });
    } else {
      // Total mismatch - LEGOs don't relate to seed English
      results.totalMismatch.push({
        seed: seed.seed_number,
        seedKnown: seed.known_text,
        currentTarget: seedTarget,
        derivedTarget,
        derivedKnown,
        legoKnowns: legos.map(l => l.known_text)
      });
    }
  }

  // Report
  console.log(`\nMATCHING SEEDS: ${results.match.length}`);
  console.log(`  ${results.match.slice(0, 20).join(', ')}${results.match.length > 20 ? '...' : ''}`);

  console.log(`\nDERIVABLE (LEGOs match seed meaning): ${results.derivable.length}`);
  results.derivable.slice(0, 5).forEach(r => {
    console.log(`  S${String(r.seed).padStart(4, '0')}:`);
    console.log(`    Seed EN: "${r.seedKnown}"`);
    console.log(`    Current: "${r.currentTarget || '(empty)'}"`);
    console.log(`    Derived: "${r.derivedTarget}"`);
  });
  if (results.derivable.length > 5) console.log(`  ... and ${results.derivable.length - 5} more`);

  console.log(`\nTOTAL MISMATCH (LEGOs don't match seed): ${results.totalMismatch.length}`);
  results.totalMismatch.slice(0, 10).forEach(r => {
    console.log(`  S${String(r.seed).padStart(4, '0')}:`);
    console.log(`    Seed EN: "${r.seedKnown}"`);
    console.log(`    LEGOs:   "${r.legoKnowns.join(' + ')}"`);
    console.log(`    Current: "${r.currentTarget || '(empty)'}"`);
  });
  if (results.totalMismatch.length > 10) console.log(`  ... and ${results.totalMismatch.length - 10} more`);

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY:');
  console.log(`  Already correct: ${results.match.length}`);
  console.log(`  Can be derived from LEGOs: ${results.derivable.length}`);
  console.log(`  Total mismatch (needs investigation): ${results.totalMismatch.length}`);

  return results;
}

analyze().catch(console.error);
