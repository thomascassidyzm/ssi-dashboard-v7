#!/usr/bin/env node

import fs from 'fs';

// Load whitelists and baskets
const whitelists = JSON.parse(fs.readFileSync('./batch_output/whitelists.json', 'utf8'));

// Validate a single phrase
function validatePhrase(phrase, legoId, whitelist) {
  const spanish = phrase[1];
  const words = spanish
    .toLowerCase()
    .replace(/[.,¿?!¡]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);

  const violations = words.filter(word => !whitelist.includes(word));

  return {
    phrase,
    legoId,
    words,
    violations,
    compliant: violations.length === 0
  };
}

// Count phrase distribution
function countDistribution(phrases) {
  const dist = {
    really_short_1_2: 0,
    quite_short_3: 0,
    longer_4_5: 0,
    long_6_plus: 0
  };

  phrases.forEach(phrase => {
    const count = phrase[3];
    if (count <= 2) dist.really_short_1_2++;
    else if (count === 3) dist.quite_short_3++;
    else if (count <= 5) dist.longer_4_5++;
    else dist.long_6_plus++;
  });

  return dist;
}

// Validate all baskets
let totalSeeds = 0;
let totalLegos = 0;
let totalPhrases = 0;
let totalViolations = 0;
const violations = [];

for (let i = 101; i <= 110; i++) {
  const seedId = `s${String(i).padStart(4, '0')}`;
  const basketPath = `./batch_output/lego_baskets_${seedId}.json`;

  if (!fs.existsSync(basketPath)) {
    console.log(`❌ Missing: ${basketPath}`);
    continue;
  }

  const basket = JSON.parse(fs.readFileSync(basketPath, 'utf8'));
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Validating ${basket.seed}: ${basket.seed_pair.known}`);
  console.log(`${'='.repeat(60)}`);

  totalSeeds++;

  Object.keys(basket).forEach(key => {
    if (!key.startsWith('S')) return;

    const legoData = basket[key];
    const legoId = key;
    totalLegos++;

    const phrases = legoData.practice_phrases;
    totalPhrases += phrases.length;

    console.log(`\n${legoId}: ${legoData.lego[0]} → ${legoData.lego[1]}`);
    console.log(`  Phrases: ${phrases.length}`);

    // Get whitelist for this LEGO
    const whitelist = whitelists[legoId]?.whitelist || [];
    console.log(`  Whitelist: ${whitelist.length} words`);

    // Validate each phrase
    let legoViolations = 0;
    phrases.forEach((phrase, idx) => {
      const result = validatePhrase(phrase, legoId, whitelist);
      if (!result.compliant) {
        legoViolations++;
        totalViolations++;
        violations.push(result);
        console.log(`  ❌ Phrase ${idx + 1}: "${phrase[1]}"`);
        console.log(`     Violations: ${result.violations.join(', ')}`);
      }
    });

    // Check distribution
    const actualDist = countDistribution(phrases);
    const declaredDist = legoData.phrase_distribution;
    const distMatch =
      actualDist.really_short_1_2 === declaredDist.really_short_1_2 &&
      actualDist.quite_short_3 === declaredDist.quite_short_3 &&
      actualDist.longer_4_5 === declaredDist.longer_4_5 &&
      actualDist.long_6_plus === declaredDist.long_6_plus;

    if (legoViolations === 0 && distMatch) {
      console.log(`  ✅ All phrases GATE-compliant`);
      console.log(`  ✅ Distribution correct`);
    } else if (!distMatch) {
      console.log(`  ⚠️  Distribution mismatch:`);
      console.log(`     Declared: ${JSON.stringify(declaredDist)}`);
      console.log(`     Actual:   ${JSON.stringify(actualDist)}`);
    }
  });
}

console.log(`\n${'='.repeat(60)}`);
console.log(`VALIDATION COMPLETE`);
console.log(`${'='.repeat(60)}`);
console.log(`Seeds validated: ${totalSeeds}`);
console.log(`LEGOs validated: ${totalLegos}`);
console.log(`Phrases validated: ${totalPhrases}`);
console.log(`GATE violations: ${totalViolations}`);

if (totalViolations > 0) {
  console.log(`\n❌ ${totalViolations} GATE VIOLATIONS FOUND`);
  console.log(`\nViolations by LEGO:`);
  const byLego = {};
  violations.forEach(v => {
    if (!byLego[v.legoId]) byLego[v.legoId] = [];
    byLego[v.legoId].push(v);
  });
  Object.keys(byLego).forEach(legoId => {
    console.log(`\n${legoId}:`);
    byLego[legoId].forEach(v => {
      console.log(`  "${v.phrase[1]}" - violations: ${v.violations.join(', ')}`);
    });
  });
} else {
  console.log(`\n✅ ALL PHRASES ARE GATE-COMPLIANT!`);
}

console.log(`\nAgent 01 complete: ${totalSeeds} seeds, ${totalLegos} LEGOs, ${totalPhrases} phrases generated`);
