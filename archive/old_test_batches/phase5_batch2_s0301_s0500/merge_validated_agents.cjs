#!/usr/bin/env node

const fs = require('fs');

console.log('=== MERGING VALIDATED BATCH 2 AGENTS ===\n');

// Agents with 100% GATE compliance:
const validatedAgents = [1, 2, 3, 4, 6, 7, 8];

console.log('Including agents: ' + validatedAgents.join(', '));
console.log('Excluding agents: 5 (broken LEGOs), 9 (incomplete), 10 (major violations)\n');

const mergedData = {
  version: "curated_v6_molecular_lego",
  batch: "batch2_partial",
  seed_range: "S0301-S0500 (partial: 140/200 seeds)",
  included_agents: validatedAgents,
  total_seeds: 0,
  validation_status: "GATE_COMPLIANT",
  merged_at: new Date().toISOString(),
  seeds: {}
};

let totalSeeds = 0;
let totalLegos = 0;
let totalPhrases = 0;

for (const agentNum of validatedAgents) {
  const filename = `batch_output/agent_${String(agentNum).padStart(2, '0')}_baskets.json`;
  console.log(`Loading Agent ${String(agentNum).padStart(2, '0')}...`);

  const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const seeds = data.seeds || data;

  for (const seedId in seeds) {
    if (!seedId.match(/^S\d{4}$/)) continue;

    const seed = seeds[seedId];
    mergedData.seeds[seedId] = seed;
    totalSeeds++;

    // Count LEGOs and phrases
    const legos = seed.legos || seed;
    for (const legoId in legos) {
      if (!legoId.match(/^S\d{4}L\d{2}$/)) continue;
      totalLegos++;
      const lego = legos[legoId];
      if (lego.practice_phrases) {
        totalPhrases += lego.practice_phrases.length;
      }
    }
  }

  console.log(`  ✓ Added ${Object.keys(seeds).filter(k => k.match(/^S\d{4}$/)).length} seeds from Agent ${agentNum}`);
}

mergedData.total_seeds = totalSeeds;

console.log(`\n=== MERGE STATISTICS ===`);
console.log(`Seeds: ${totalSeeds}`);
console.log(`LEGOs: ${totalLegos}`);
console.log(`Phrases: ${totalPhrases}`);

// Save merged file
const outputFile = 'baskets_s0301_s0500_partial_140seeds.json';
fs.writeFileSync(outputFile, JSON.stringify(mergedData, null, 2));

console.log(`\n✅ Saved: ${outputFile}`);
console.log(`\nCoverage: 140/200 seeds (70%)`);
console.log(`Remaining: 60 seeds in agents 5, 9, 10 (need regeneration)`);
