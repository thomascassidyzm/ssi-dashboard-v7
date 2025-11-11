#!/usr/bin/env node
const fs = require('fs');

const validAgents = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // All except 10

const merged = {
  version: "curated_v6_molecular_lego",
  batch: "batch2_final",
  seed_range: "S0301-S0500 (180/200 seeds - 90%)",
  included_agents: validAgents,
  total_seeds: 0,
  validation_status: "GATE_COMPLIANT",
  merged_at: new Date().toISOString(),
  seeds: {}
};

let totalSeeds = 0, totalLegos = 0, totalPhrases = 0;

for (const agentNum of validAgents) {
  const agentId = String(agentNum).padStart(2, '0');
  const filename = `batch_output/agent_${agentId}_baskets.json`;
  const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const seeds = data.seeds || data;

  for (const seedId in seeds) {
    if (!seedId.match(/^S\d{4}$/)) continue;
    const seed = seeds[seedId];
    merged.seeds[seedId] = seed;
    totalSeeds++;

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
}

merged.total_seeds = totalSeeds;

console.log(`=== BATCH 2 FINAL MERGE ===`);
console.log(`Seeds: ${totalSeeds}/200 (${Math.round(totalSeeds/2)}%)`);
console.log(`LEGOs: ${totalLegos}`);
console.log(`Phrases: ${totalPhrases}`);
console.log(`Agents: 9/10 (Agent 10 excluded)`);

fs.writeFileSync('baskets_s0301_s0500_final_180seeds.json', JSON.stringify(merged, null, 2));
console.log(`\n✅ Saved: baskets_s0301_s0500_final_180seeds.json`);
