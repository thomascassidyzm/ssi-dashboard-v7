#!/usr/bin/env node

/**
 * Continue Chinese LEGO Extraction
 * Run with: node continue_extraction.cjs <start_seed> <end_seed>
 * Example: node continue_extraction.cjs 31 50
 */

const fs = require('fs');
const seedPairs = JSON.parse(fs.readFileSync('seed_pairs.json', 'utf8'));
const extraction = JSON.parse(fs.readFileSync('lego_extraction.json', 'utf8'));

// Build registry
const registry = new Map();
extraction.seeds.forEach(seed => {
  seed.legos.forEach(lego => {
    if (lego.new) registry.set(lego.target, {id: lego.id, type: lego.type, known: lego.known, seed: seed.seed_id, components: lego.components || null});
  });
});

let cum = extraction.seeds[extraction.seeds.length - 1].cumulative_legos;

const add = (seedObj) => {
  const rec = seedObj.legos.map(l => l.target).join('');
  const match = rec === seedObj.seed_pair[0];
  console.log(`${seedObj.seed_id}: ${match ? '✓' : '✗ FAIL'}`);
  if (!match) {
    console.log('  Expected:', seedObj.seed_pair[0]);
    console.log('  Got:', rec);
    process.exit(1);
  }
  let n = 0;
  seedObj.legos.forEach(l => { if (l.new) { registry.set(l.target, {id: l.id, type: l.type, known: l.known, seed: seedObj.seed_id, components: l.components || null}); cum++; n++; }});
  seedObj.cumulative_legos = cum;
  extraction.seeds.push(seedObj);
  fs.writeFileSync('lego_extraction.json', JSON.stringify(extraction, null, 2), 'utf8');
};

const startSeed = parseInt(process.argv[2]) || 31;
const endSeed = parseInt(process.argv[3]) || 50;

console.log(`\nExtracting S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')}...\n`);

// Continue extraction with structured seed data
// This script is designed to be extended incrementally

console.log('\n⚠️  This script requires manual seed data for S0031-S0668');
console.log('Current extraction complete up to S0030');
console.log('Please extend the script with additional seed data to continue.');
console.log(`\nCurrent status: ${extraction.seeds.length}/668 seeds, ${cum} LEGOs`);
