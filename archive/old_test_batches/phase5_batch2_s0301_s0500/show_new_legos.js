import fs from 'fs';

const input = JSON.parse(fs.readFileSync('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/batch_input/agent_10_seeds.json', 'utf8'));

const seedId = process.argv[2] || 'S0482';

const seed = input.seeds.find(s => s.seed_id === seedId);
if (!seed) {
  console.log(`Seed ${seedId} not found`);
  process.exit(1);
}

console.log(`\n${seedId} LEGOs:`);
console.log(`Seed: ${seed.seed_pair.known}`);
console.log(`Target: ${seed.seed_pair.target}\n`);

seed.legos.forEach(lego => {
  const marker = lego.new ? '[NEW]' : '';
  console.log(`  ${lego.id}: ${lego.target} = ${lego.known} ${marker}`);
  if (lego.components && Array.isArray(lego.components) && lego.components.length > 0) {
    console.log(`    Components: ${lego.components.join(', ')}`);
  }
});
