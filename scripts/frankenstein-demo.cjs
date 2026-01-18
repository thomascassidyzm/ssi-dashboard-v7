#!/usr/bin/env node
/**
 * Frankenstein Demo - Show how a later phrase can be built from early LEGOs
 */

const supabase = require('../services/supabase-client.cjs');

async function analyze() {
  const client = supabase.getClient();

  console.log('═'.repeat(60));
  console.log('FRANKENSTEIN DEMO: Welsh North Course');
  console.log('═'.repeat(60));
  console.log('\nSCENARIO: We record Seeds 1-20. Can we BUILD Seed 60?\n');

  console.log('TARGET PHRASE (Seed 60):');
  console.log('  English: "I don\'t want to speak Welsh now"');
  console.log('  Welsh:   "dw i ddim isio siarad Cymraeg rŵan"');
  console.log('\n' + '─'.repeat(60) + '\n');

  // Get all LEGOs from first 20 seeds
  const { data: legos } = await client
    .from('course_legos')
    .select('seed_number, known_text, target_text')
    .eq('course_code', 'cym_n_for_eng')
    .lte('seed_number', 20);

  // Build index: word → [seed numbers]
  const wordSources = {};
  const legoSources = {};

  for (const l of legos || []) {
    // Track full LEGO
    const legoKey = l.target_text.toLowerCase();
    if (!legoSources[legoKey]) {
      legoSources[legoKey] = { seeds: [], known: l.known_text };
    }
    if (!legoSources[legoKey].seeds.includes(l.seed_number)) {
      legoSources[legoKey].seeds.push(l.seed_number);
    }

    // Track individual words
    const words = l.target_text.toLowerCase().split(/\s+/);
    for (const w of words) {
      if (!wordSources[w]) wordSources[w] = [];
      if (!wordSources[w].includes(l.seed_number)) {
        wordSources[w].push(l.seed_number);
      }
    }
  }

  // Analyze target: "dw i ddim isio siarad Cymraeg rŵan"
  // This naturally breaks into: "dw i" + "ddim" + "isio" + "siarad" + "Cymraeg" + "rŵan"

  const components = [
    { target: 'dw i', english: 'I (want)' },
    { target: 'ddim', english: 'not/don\'t' },
    { target: 'isio', english: 'want' },
    { target: 'siarad', english: 'to speak' },
    { target: 'Cymraeg', english: 'Welsh' },
    { target: 'rŵan', english: 'now' },
  ];

  console.log('COMPONENTS TO EXTRACT:\n');

  for (const comp of components) {
    const key = comp.target.toLowerCase();
    const sources = wordSources[key] || legoSources[key]?.seeds || [];

    console.log(`  "${comp.target}" (${comp.english})`);
    if (sources.length > 0) {
      console.log(`    ✓ Found in Seed ${sources[0]} (also: ${sources.slice(1).join(', ') || 'none'})`);
    } else {
      console.log(`    ✗ NOT FOUND in seeds 1-20`);
    }
  }

  console.log('\n' + '─'.repeat(60) + '\n');
  console.log('SOURCE RECORDINGS (where we extract each LEGO):\n');

  // Get the key source seeds
  const { data: sourceSeeds } = await client
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', 'cym_n_for_eng')
    .in('seed_number', [1, 6, 11])
    .order('seed_number');

  for (const s of sourceSeeds || []) {
    const provides = [];
    if (s.seed_number === 1) provides.push('"dw i"', '"isio"', '"siarad"', '"Cymraeg"');
    if (s.seed_number === 6) provides.push('"ddim"');
    if (s.seed_number === 11) provides.push('"rŵan"');

    console.log(`SEED ${s.seed_number}: "${s.known_text}"`);
    console.log(`  Welsh: ${s.target_text}`);
    console.log(`  Provides: ${provides.join(', ')}`);
    console.log();
  }

  console.log('─'.repeat(60));
  console.log('\nFRANKENSTEIN PROCESS:');
  console.log('  1. Record Seed 1:  "dw i isio siarad Cymraeg"');
  console.log('  2. Record Seed 6:  "fedra i ddim cofio..."');
  console.log('  3. Record Seed 11: "...siarad Cymraeg rŵan"');
  console.log('  4. Whisper extracts word boundaries');
  console.log('  5. Extract: "dw i" + "ddim" + "isio" + "siarad" + "Cymraeg" + "rŵan"');
  console.log('  6. Normalize each segment to -16 LUFS');
  console.log('  7. Crossfade splice → "dw i ddim isio siarad Cymraeg rŵan"');
  console.log('\n═'.repeat(60));
  console.log('RESULT: Seed 60 built from 3 recorded phrases!');
  console.log('═'.repeat(60));
}

analyze().catch(console.error);
