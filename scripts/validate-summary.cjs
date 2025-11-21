#!/usr/bin/env node

/**
 * Summary of LEGO validation results by seed
 */

const fs = require('fs');
const path = require('path');

const basketsDir = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng/phase5_baskets_staging';

const startSeed = parseInt(process.argv[2]) || 121;
const endSeed = parseInt(process.argv[3]) || 140;

console.log(`\n📊 LEGO Validation Summary (S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')})\n`);

const results = [];

for (let i = startSeed; i <= endSeed; i++) {
  const seedId = `S${String(i).padStart(4, '0')}`;
  const filename = `seed_${seedId}_baskets.json`;
  const filepath = path.join(basketsDir, filename);

  if (!fs.existsSync(filepath)) continue;

  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

  let totalLegos = 0;
  let totalPhrases = 0;
  let failedLegos = 0;
  let failedPhrases = 0;

  for (const [legoId, basket] of Object.entries(data)) {
    totalLegos++;
    const lego = basket.lego;
    const legoTarget = lego.target.toLowerCase().trim();
    const legoKnown = lego.known.toLowerCase().trim();

    let legoHasFailures = false;

    for (const phrase of basket.practice_phrases) {
      totalPhrases++;
      const phraseTarget = phrase.target.toLowerCase().trim();
      const phraseKnown = phrase.known.toLowerCase().trim();

      const containsTarget = phraseTarget.includes(legoTarget);
      const containsKnown = phraseKnown.includes(legoKnown);

      if (!containsTarget || !containsKnown) {
        failedPhrases++;
        legoHasFailures = true;
      }
    }

    if (legoHasFailures) {
      failedLegos++;
    }
  }

  results.push({
    seedId,
    totalLegos,
    totalPhrases,
    failedLegos,
    failedPhrases,
    passRate: ((totalLegos - failedLegos) / totalLegos * 100).toFixed(0)
  });
}

// Sort by pass rate (worst first)
results.sort((a, b) => parseFloat(a.passRate) - parseFloat(b.passRate));

console.log('Seed    LEGOs  Pass  Status');
console.log('─────── ────── ───── ──────────────────');

for (const r of results) {
  const status = r.failedLegos === 0 ? '✅ PERFECT' :
                 r.failedLegos === r.totalLegos ? '❌ ALL FAILED' :
                 parseInt(r.passRate) >= 80 ? '🟡 MOSTLY OK' : '❌ BAD';

  console.log(`${r.seedId}  ${String(r.totalLegos).padStart(2)}/${String(r.totalLegos).padStart(2)}   ${String(r.passRate).padStart(3)}%  ${status}`);
}

const totalSeeds = results.length;
const perfectSeeds = results.filter(r => r.failedLegos === 0).length;
const badSeeds = results.filter(r => parseInt(r.passRate) < 50).length;

console.log('\n─────────────────────────────────────');
console.log(`Total Seeds: ${totalSeeds}`);
console.log(`Perfect: ${perfectSeeds} (${((perfectSeeds / totalSeeds) * 100).toFixed(0)}%)`);
console.log(`Bad (<50%): ${badSeeds} (${((badSeeds / totalSeeds) * 100).toFixed(0)}%)`);
console.log();
