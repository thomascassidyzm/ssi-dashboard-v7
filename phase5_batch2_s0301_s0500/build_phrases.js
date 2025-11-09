import fs from 'fs';

const agentInput = JSON.parse(fs.readFileSync('./batch_input/agent_04_seeds.json', 'utf8'));
const registry = JSON.parse(fs.readFileSync('./registry/lego_registry_s0001_s0500.json', 'utf8'));

function buildWhitelistUpTo(seedId) {
  const seedNum = parseInt(seedId.substring(1));
  const whitelist = new Set();
  for (const legoId in registry.legos) {
    const lego = registry.legos[legoId];
    const legoSeedNum = parseInt(legoId.substring(1, 5));
    if (legoSeedNum <= seedNum) {
      if (lego.spanish_words) {
        lego.spanish_words.forEach(word => whitelist.add(word.toLowerCase()));
      }
    }
  }
  return Array.from(whitelist);
}

function countWords(phrase) {
  return phrase.toLowerCase()
    .replace(/[¿?¡!,;:.()[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0).length;
}

function p(eng, spa) {
  return [eng, spa, null, countWords(spa)];
}

// Count cumulative LEGOs
let cumulative = 0;
for (const legoId in registry.legos) {
  if (parseInt(legoId.substring(1, 5)) < 361) cumulative++;
}

const seeds = {};

// Manually curate high-quality phrases for each LEGO
// I'll now systematically create all phrases

console.log(`Starting with ${cumulative} cumulative LEGOs`);
console.log(`Whitelist for S0380 has ${buildWhitelistUpTo('S0380').length} words`);
console.log('Ready to generate all 20 seeds');
console.log('Please run the manual curation process');

// Export helper for manual generation
fs.writeFileSync('./agent_04_helpers.json', JSON.stringify({
  cumulative_at_start: cumulative,
  whitelist_size: buildWhitelistUpTo('S0380').length,
  total_seeds: 20,
  seeds_list: agentInput.seeds.map(s => ({
    id: s.seed_id,
    sentence: s.seed_pair.known,
    lego_count: s.legos.filter(l => l.target !== '.' && l.target !== '?' && l.target !== '!').length
  }))
}, null, 2));

console.log('Helpers saved. Total LEGOs to process:',
  agentInput.seeds.reduce((sum, s) => sum + s.legos.filter(l => l.target !== '.' && l.target !== '?' && l.target !== '!').length, 0));
