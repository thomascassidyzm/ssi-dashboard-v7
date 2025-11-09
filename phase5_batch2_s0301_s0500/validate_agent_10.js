import fs from 'fs';

// Load the basket file
const basketPath = '/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/batch_output/agent_10_baskets.json';
const registryPath = '/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/registry/lego_registry_s0001_s0500.json';

const data = JSON.parse(fs.readFileSync(basketPath, 'utf8'));
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

console.log('=== AGENT 10 SELF-VALIDATION ===\n');

// GATE 1: Format Validation
console.log('Gate 1: Format validation...');
let formatErrors = [];

try {
  if (!data.seeds) formatErrors.push("Missing 'seeds' key at root");
  if (!data.agent_id) formatErrors.push("Missing 'agent_id'");
  if (!data.validation_status) formatErrors.push("Missing 'validation_status'");

  const seedIds = Object.keys(data.seeds);
  if (seedIds.length !== 20) {
    formatErrors.push(`Expected 20 seeds, got ${seedIds.length}`);
  } else {
    console.log(`✅ 20 seeds present`);
  }

  for (const seedId of seedIds) {
    const seed = data.seeds[seedId];
    if (!seed.seed_pair) formatErrors.push(`${seedId}: Missing seed_pair`);
    if (!seed.legos) formatErrors.push(`${seedId}: Missing legos`);

    for (const legoId in seed.legos) {
      const lego = seed.legos[legoId];
      if (!lego.practice_phrases) {
        formatErrors.push(`${legoId}: Missing practice_phrases`);
      } else if (lego.practice_phrases.length !== 10) {
        formatErrors.push(`${legoId}: Expected 10 phrases, got ${lego.practice_phrases.length}`);
      }
      if (!lego.phrase_distribution) {
        formatErrors.push(`${legoId}: Missing phrase_distribution`);
      }
    }
  }

  if (formatErrors.length === 0) {
    console.log('✅ Structure valid');
    console.log('✅ All seeds have required fields');
    console.log('✅ All LEGOs have 10 phrases');
    console.log('✅ GATE 1: Format validation PASSED\n');
  } else {
    console.log('❌ GATE 1: Format validation FAILED');
    formatErrors.forEach(e => console.log(`  - ${e}`));
    process.exit(1);
  }
} catch (error) {
  console.log('❌ GATE 1: Format validation FAILED');
  console.log(`  Error: ${error.message}`);
  process.exit(1);
}

// GATE 2: Quality Validation
console.log('Gate 2: Quality validation...');
console.log('Checking GATE compliance (word-by-word)...');
console.log('Checking distribution (2-2-2-4)...');
console.log('Checking completeness (phrases 3-10)...');
console.log('Checking final seed sentences...\n');

// Build whitelist function - includes registry + NEW words from current seed
function buildWhitelistUpTo(registry, targetSeedId, seedData) {
  const targetNum = parseInt(targetSeedId.substring(1));
  const whitelist = [];

  // Add words from registry
  for (const legoId in registry.legos) {
    const lego = registry.legos[legoId];
    const legoSeedNum = parseInt(legoId.substring(1, 5));

    if (legoSeedNum <= targetNum) {
      if (lego.spanish_words) {
        lego.spanish_words.forEach(word => {
          const cleanWord = word.toLowerCase().trim();
          if (cleanWord && !whitelist.includes(cleanWord)) {
            whitelist.push(cleanWord);
          }
        });
      }
    }
  }

  // Add NEW words from current seed's LEGOs
  if (seedData && seedData.legos) {
    for (const legoId in seedData.legos) {
      const lego = seedData.legos[legoId];
      // Extract Spanish words from LEGO target
      if (lego.lego && lego.lego[1]) {
        const spanishText = lego.lego[1];
        const words = spanishText.toLowerCase()
          .replace(/[¿?¡!,;:.()[\]{}]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length > 0);
        words.forEach(word => {
          if (!whitelist.includes(word)) {
            whitelist.push(word);
          }
        });
      }
    }
  }

  return whitelist;
}

let gateViolations = [];
let distributionErrors = [];
let completenessWarnings = [];
let finalSeedErrors = [];

const seedIds = Object.keys(data.seeds).sort();

for (const seedId of seedIds) {
  const seed = data.seeds[seedId];
  const whitelist = buildWhitelistUpTo(registry, seedId, seed);

  for (const legoId in seed.legos) {
    const lego = seed.legos[legoId];

    // Check GATE compliance for each phrase
    for (let i = 0; i < lego.practice_phrases.length; i++) {
      const [english, spanish, pattern, count] = lego.practice_phrases[i];

      // Tokenize Spanish phrase
      const words = spanish.toLowerCase()
        .replace(/[¿?¡!,;:.()[\]{}]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 0);

      // Check every word against whitelist
      for (const word of words) {
        if (!whitelist.includes(word)) {
          gateViolations.push({
            lego: legoId,
            phrase: i + 1,
            word: word,
            spanish: spanish,
            english: english
          });
        }
      }

      // Check completeness (phrases 3-10 must be complete)
      if (i >= 2) {
        if (english.length < 15 || spanish.length < 15) {
          completenessWarnings.push({
            lego: legoId,
            phrase: i + 1,
            english: english,
            reason: 'Possibly too short for a complete thought'
          });
        }
      }
    }

    // Check distribution (2-2-2-4)
    const dist = lego.phrase_distribution;
    if (dist.really_short_1_2 !== 2) {
      distributionErrors.push(`${legoId}: Short = ${dist.really_short_1_2}, expected 2`);
    }
    if (dist.quite_short_3 !== 2) {
      distributionErrors.push(`${legoId}: Quite short = ${dist.quite_short_3}, expected 2`);
    }
    if (dist.longer_4_5 !== 2) {
      distributionErrors.push(`${legoId}: Longer = ${dist.longer_4_5}, expected 2`);
    }
    if (dist.long_6_plus !== 4) {
      distributionErrors.push(`${legoId}: Long = ${dist.long_6_plus}, expected 4`);
    }
  }

  // Check final seed sentence
  const legoIds = Object.keys(seed.legos).sort();
  const finalLego = seed.legos[legoIds[legoIds.length - 1]];
  const finalPhrase = finalLego.practice_phrases[9];
  const expectedSeed = seed.seed_pair.known;

  const finalText = finalPhrase[0].replace(/[.!?]/g, '').trim().toLowerCase();
  const seedText = expectedSeed.replace(/[.!?]/g, '').trim().toLowerCase();

  if (finalText !== seedText) {
    finalSeedErrors.push({
      seed: seedId,
      lego: legoIds[legoIds.length - 1],
      expected: expectedSeed,
      got: finalPhrase[0]
    });
  }
}

// Report validation results
console.log('=== GATE 2: Quality Validation ===');
console.log(`GATE Violations: ${gateViolations.length}`);
console.log(`Distribution Errors: ${distributionErrors.length}`);
console.log(`Completeness Warnings: ${completenessWarnings.length}`);
console.log(`Final Seed Errors: ${finalSeedErrors.length}\n`);

if (gateViolations.length > 0) {
  console.log('❌ GATE VIOLATIONS (MUST FIX):');
  gateViolations.slice(0, 20).forEach(v => {
    console.log(`  ${v.lego} phrase ${v.phrase}: "${v.word}" not in whitelist`);
    console.log(`    EN: "${v.english}"`);
    console.log(`    ES: "${v.spanish}"`);
  });
  if (gateViolations.length > 20) {
    console.log(`  ... and ${gateViolations.length - 20} more violations`);
  }
  console.log('');
}

if (distributionErrors.length > 0) {
  console.log('⚠️  DISTRIBUTION ERRORS:');
  distributionErrors.slice(0, 10).forEach(e => console.log(`  ${e}`));
  if (distributionErrors.length > 10) {
    console.log(`  ... and ${distributionErrors.length - 10} more errors`);
  }
  console.log('');
}

if (finalSeedErrors.length > 0) {
  console.log('❌ FINAL SEED ERRORS:');
  finalSeedErrors.forEach(e => {
    console.log(`  ${e.seed}: Final phrase mismatch`);
    console.log(`    Expected: "${e.expected}"`);
    console.log(`    Got: "${e.got}"`);
  });
  console.log('');
}

if (completenessWarnings.length > 0 && gateViolations.length === 0) {
  console.log('⚠️  COMPLETENESS WARNINGS (review recommended):');
  completenessWarnings.slice(0, 5).forEach(w => {
    console.log(`  ${w.lego} phrase ${w.phrase}: ${w.reason}`);
    console.log(`    "${w.english}"`);
  });
  if (completenessWarnings.length > 5) {
    console.log(`  ... and ${completenessWarnings.length - 5} more warnings`);
  }
  console.log('');
}

// PASS/FAIL decision
const validationPassed = (gateViolations.length === 0 && distributionErrors.length === 0 && finalSeedErrors.length === 0);

if (validationPassed) {
  console.log('✅ GATE 2: Quality validation PASSED\n');

  // Update validation status
  data.validation_status = 'PASSED';
  data.validated_at = new Date().toISOString();
  fs.writeFileSync(basketPath, JSON.stringify(data, null, 2));

  console.log('=== VALIDATION REPORT ===');
  console.log('✅ ALL CHECKS PASSED');
  console.log('Agent 10 ready for submission\n');

  // Count totals
  let totalLegos = 0;
  let totalPhrases = 0;
  for (const seedId in data.seeds) {
    const legoCount = Object.keys(data.seeds[seedId].legos).length;
    totalLegos += legoCount;
    totalPhrases += legoCount * 10;
  }

  console.log(`Output: ${basketPath}`);
  console.log(`Status: ✅ VALIDATED`);
  console.log(`Seeds: 20`);
  console.log(`LEGOs: ${totalLegos}`);
  console.log(`Phrases: ${totalPhrases}`);

} else {
  console.log('❌ GATE 2: Quality validation FAILED\n');
  console.log('ACTION REQUIRED:');
  console.log('1. Fix all GATE violations (remove untaught words)');
  console.log('2. Fix distribution errors (adjust phrase counts)');
  console.log('3. Fix final seed sentence mismatches');
  console.log('4. Re-run validation');
  console.log('5. Repeat until ✅ PASSED');
  process.exit(1);
}
