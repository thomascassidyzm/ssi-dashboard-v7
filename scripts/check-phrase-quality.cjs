/**
 * Deep quality check on fra_for_eng phrases for learner journey
 */
require('dotenv').config();
const { getClient } = require('../services/supabase-client.cjs');

async function main() {
  const supabase = getClient();
  if (!supabase) {
    console.error('Supabase not initialized');
    process.exit(1);
  }

  // Get all LEGOs for seeds 1-50
  const { data: legos } = await supabase
    .from('course_legos')
    .select('*')
    .eq('course_code', 'fra_for_eng')
    .gte('seed_number', 1)
    .lte('seed_number', 50)
    .order('seed_number')
    .order('lego_index');

  // Get all practice phrases
  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('*')
    .eq('course_code', 'fra_for_eng')
    .gte('seed_number', 1)
    .lte('seed_number', 50)
    .order('seed_number')
    .order('lego_index')
    .order('position');

  console.log('='.repeat(80));
  console.log('PHRASE QUALITY DEEP CHECK: fra_for_eng (Seeds 1-50)');
  console.log('='.repeat(80));

  // Check for issues
  const fragmentPhrases = [];
  const unnaturalPhrases = [];
  const veryLongPhrases = [];
  const duplicatePhrases = new Map();

  for (const p of phrases) {
    // Check for fragments (very short USE phrases)
    if (p.phrase_role === 'use') {
      const wordCount = p.target_text.split(/\s+/).length;
      if (wordCount <= 2) {
        fragmentPhrases.push(p);
      }
      if (wordCount >= 15) {
        veryLongPhrases.push(p);
      }
    }

    // Check for unnatural patterns - "de y" is wrong, should be "y" or "d'y"
    if (p.target_text.includes(' de y') || p.target_text.endsWith(' de y')) {
      unnaturalPhrases.push({ ...p, issue: 'French grammar error: "de y" should be just "y"' });
    }

    // Track duplicates
    const key = p.known_text.toLowerCase() + '|||' + p.target_text.toLowerCase();
    if (!duplicatePhrases.has(key)) {
      duplicatePhrases.set(key, []);
    }
    duplicatePhrases.get(key).push(p);
  }

  // Report Fragment USE phrases
  console.log('\n\n=== FRAGMENT USE PHRASES (<=2 words) ===');
  console.log('Found ' + fragmentPhrases.length + ' potential fragments:\n');
  for (const p of fragmentPhrases.slice(0, 20)) {
    console.log('  Seed ' + p.seed_number + ': "' + p.known_text + '" -> "' + p.target_text + '"');
  }

  // Report Unnatural phrases
  console.log('\n\n=== GRAMMAR/NATURALNESS ISSUES ===');
  console.log('Found ' + unnaturalPhrases.length + ' potential grammar issues:\n');
  for (const p of unnaturalPhrases.slice(0, 20)) {
    console.log('  Seed ' + p.seed_number + ': "' + p.known_text + '" -> "' + p.target_text + '"');
    console.log('    Issue: ' + p.issue);
  }

  // Report Very Long phrases
  console.log('\n\n=== VERY LONG PHRASES (>=15 words) ===');
  console.log('Found ' + veryLongPhrases.length + ' very long phrases:\n');
  for (const p of veryLongPhrases.slice(0, 15)) {
    console.log('  Seed ' + p.seed_number + ': "' + p.known_text + '"');
    console.log('      -> "' + p.target_text + '"');
  }

  // Report Duplicates
  const actualDupes = [...duplicatePhrases.entries()].filter(([k, v]) => v.length > 1);
  console.log('\n\n=== DUPLICATE PHRASES ===');
  console.log('Found ' + actualDupes.length + ' duplicate phrase pairs:\n');
  for (const [key, items] of actualDupes.slice(0, 10)) {
    console.log('  "' + items[0].known_text + '" appears ' + items.length + 'x in seeds: ' + items.map(i => i.seed_number).join(', '));
  }

  // Check phrase distribution per LEGO
  console.log('\n\n=== PHRASE COUNT PER LEGO ===');
  const phraseCounts = {};
  for (const p of phrases) {
    const key = p.seed_number + '-' + p.lego_index;
    if (!phraseCounts[key]) phraseCounts[key] = { build: 0, use: 0 };
    if (p.phrase_role === 'build') phraseCounts[key].build++;
    else if (p.phrase_role === 'use') phraseCounts[key].use++;
  }

  const lowUseLegos = [];
  for (const [key, counts] of Object.entries(phraseCounts)) {
    if (counts.use < 3) {
      const [seed, lego] = key.split('-').map(Number);
      const legoData = legos.find(l => l.seed_number === seed && l.lego_index === lego);
      if (legoData && legoData.is_new) {
        lowUseLegos.push({ seed, lego, known: legoData.known_text, useCount: counts.use });
      }
    }
  }
  console.log('LEGOs with < 3 USE phrases (new LEGOs only): ' + lowUseLegos.length);
  for (const item of lowUseLegos.slice(0, 20)) {
    console.log('  Seed ' + item.seed + ', LEGO ' + item.lego + ': "' + item.known + '" has ' + item.useCount + ' USE phrases');
  }

  // Sample some specific seeds for detailed review
  console.log('\n\n=== DETAILED SEED REVIEW ===');

  for (const targetSeed of [1, 10, 25, 40, 50]) {
    console.log('\n--- Seed ' + targetSeed + ' ---');
    const seedLegos = legos.filter(l => l.seed_number === targetSeed);
    const seedPhrases = phrases.filter(p => p.seed_number === targetSeed);

    console.log('  LEGOs: ' + seedLegos.length + ' (' + seedLegos.filter(l => l.is_new).length + ' new)');
    console.log('  Phrases: ' + seedPhrases.length);

    for (const lego of seedLegos) {
      const legoPhrases = seedPhrases.filter(p => p.lego_index === lego.lego_index);
      const build = legoPhrases.filter(p => p.phrase_role === 'build');
      const use = legoPhrases.filter(p => p.phrase_role === 'use');

      console.log('\n  LEGO ' + lego.lego_index + ': "' + lego.known_text + '" (' + lego.type + ', ' + (lego.is_new ? 'NEW' : 'reuse') + ')');
      console.log('    BUILD: ' + build.length + ', USE: ' + use.length);

      // Show all USE phrases for this LEGO
      for (const u of use) {
        console.log('      USE: "' + u.known_text + '" -> "' + u.target_text + '"');
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('END OF QUALITY CHECK');
  console.log('='.repeat(80));
}

main().catch(console.error);
