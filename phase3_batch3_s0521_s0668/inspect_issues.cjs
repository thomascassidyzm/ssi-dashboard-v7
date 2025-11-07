#!/usr/bin/env node
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('phase3_batch3_s0521_s0668/lego_pairs_s0521_s0668.json', 'utf8'));
const problemSeeds = ['S0567', 'S0568', 'S0572', 'S0573', 'S0580', 'S0599', 'S0600'];

problemSeeds.forEach(seedId => {
  const seed = data.seeds.find(s => s.seed_id === seedId);
  if (seed) {
    console.log(`\n=== ${seedId} ===`);
    console.log(`Seed pair: "${seed.seed_pair.target}" = "${seed.seed_pair.known}"`);
    console.log(`\nLEGOs:`);
    seed.legos.forEach((lego, idx) => {
      const hasIssue = !lego.target || !lego.known || lego.target === '' || lego.known === '';
      const marker = hasIssue ? '❌' : '✓';
      console.log(`${marker} ${idx + 1}. id=${lego.id}, type=${lego.type}, new=${lego.new}, target="${lego.target}", known="${lego.known}"`);
    });
  }
});
