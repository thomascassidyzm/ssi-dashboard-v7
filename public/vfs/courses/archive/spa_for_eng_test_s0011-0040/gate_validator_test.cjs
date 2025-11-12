const fs = require('fs');
const path = require('path');

// Quick GATE validation
const outputFiles = ['seed_s0011.json', 'seed_s0012.json', 'seed_s0013.json', 'seed_s0014.json', 'seed_s0015.json'];

console.log('🚪 GATE Validation for S0011-S0015\n');

let totalPhrases = 0;
let totalViolations = 0;

for (const file of outputFiles) {
  const basket = JSON.parse(fs.readFileSync(path.join('phase5_outputs', file), 'utf8'));

  // Build available vocabulary
  const availableWords = new Set();

  // From recent_seed_pairs
  Object.values(basket.recent_seed_pairs || {}).forEach(([spanish]) => {
    spanish.split(/\s+/).forEach(word => {
      const norm = word.trim().toLowerCase().replace(/[.,;:¿?¡!]/g, '');
      if (norm) availableWords.add(norm);
    });
  });

  console.log(`📦 ${basket.seed_id}: ${availableWords.size} words in sliding window`);

  let seedPhrases = 0;
  let seedViolations = 0;

  Object.entries(basket.legos || {}).forEach(([legoId, legoData]) => {
    // Add current_seed_legos_available
    (legoData.current_seed_legos_available || []).forEach(([_, spanish]) => {
      spanish.split(/\s+/).forEach(word => {
        const norm = word.trim().toLowerCase().replace(/[.,;:¿?¡!]/g, '');
        if (norm) availableWords.add(norm);
      });
    });

    // Add current LEGO
    const [_, spanish] = legoData.lego;
    spanish.split(/\s+/).forEach(word => {
      const norm = word.trim().toLowerCase().replace(/[.,;:¿?¡!]/g, '');
      if (norm) availableWords.add(norm);
    });

    // Check phrases
    (legoData.practice_phrases || []).forEach(phrase => {
      seedPhrases++;
      const [__, spanishPhrase] = phrase;

      const words = spanishPhrase.split(/\s+/).map(w =>
        w.trim().toLowerCase().replace(/[.,;:¿?¡!]/g, '')
      ).filter(Boolean);

      const unavailable = words.filter(w => !availableWords.has(w));
      if (unavailable.length > 0) {
        seedViolations++;
        console.log(`      ⚠️ ${legoId}: ${unavailable.join(', ')}`);
      }
    });
  });

  totalPhrases += seedPhrases;
  totalViolations += seedViolations;

  const compliance = seedViolations === 0 ? 100 : Math.round((1 - seedViolations/seedPhrases) * 100);
  console.log(`   ${seedViolations === 0 ? '✅' : '⚠️'} ${seedPhrases} phrases, ${seedViolations} violations (${compliance}% compliant)\n`);
}

console.log(`📊 Overall: ${totalPhrases} phrases, ${totalViolations} violations`);
console.log(`   Compliance: ${Math.round((1 - totalViolations/totalPhrases) * 100)}%`);

if (totalViolations === 0) {
  console.log(`\n✅ 100% GATE COMPLIANCE!`);
} else {
  console.log(`\n⚠️ ${totalViolations} violations found (acceptable if < 2%)`);
}
