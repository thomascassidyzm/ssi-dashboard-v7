#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// File paths
const AGENT_INPUT = path.join(__dirname, 'batch_input/agent_07_seeds.json');
const REGISTRY_PATH = path.join(__dirname, 'registry/lego_registry_s0001_s0500.json');
const OUTPUT_PATH = path.join(__dirname, 'batch_output/agent_07_baskets.json');

// Load data
console.log('Loading input files...');
const agentInput = JSON.parse(fs.readFileSync(AGENT_INPUT, 'utf8'));
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));

// Build whitelist up to a specific LEGO ID
function buildWhitelistUpTo(legoId) {
  const whitelist = new Set();

  // Extract seed number from legoId (e.g., "S0421L03" -> 421)
  const targetSeedNum = parseInt(legoId.match(/S(\d+)/)[1]);
  const targetLegoNum = parseInt(legoId.match(/L(\d+)/)[1]);

  // Add all words from LEGOs up to and including this one
  for (const [id, lego] of Object.entries(registry.legos)) {
    const seedNum = parseInt(id.match(/S(\d+)/)[1]);
    const legoNum = parseInt(id.match(/L(\d+)/)[1]);

    // Include if seed is before target, or same seed but LEGO number is before or equal
    if (seedNum < targetSeedNum || (seedNum === targetSeedNum && legoNum <= targetLegoNum)) {
      if (lego.spanish_words) {
        lego.spanish_words.forEach(word => whitelist.add(word.toLowerCase()));
      }
    }
  }

  return Array.from(whitelist);
}

// Count LEGOs up to a specific seed
function countLegosUpTo(seedId) {
  const targetSeedNum = parseInt(seedId.match(/S(\d+)/)[1]);
  let count = 0;

  for (const id of Object.keys(registry.legos)) {
    const seedNum = parseInt(id.match(/S(\d+)/)[1]);
    if (seedNum < targetSeedNum) {
      count++;
    }
  }

  return count;
}

// Validate Spanish phrase against whitelist
function validatePhrase(spanish, whitelist) {
  const words = spanish.toLowerCase()
    .replace(/[¿?¡!,;:.()[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);

  const violations = [];
  for (const word of words) {
    if (!whitelist.includes(word)) {
      violations.push(word);
    }
  }

  return violations;
}

// Count words in phrase
function countWords(text) {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

// Categorize phrase by word count
function categorizePhrase(wordCount) {
  if (wordCount <= 2) return 'really_short_1_2';
  if (wordCount === 3) return 'quite_short_3';
  if (wordCount <= 5) return 'longer_4_5';
  return 'long_6_plus';
}

// Generate practice phrases for a LEGO
function generatePractices(lego, whitelist, isLastLego, seedSentence) {
  const phrases = [];

  const legoEnglish = lego.known;
  const legoSpanish = lego.target;

  // For S0421L01: "they know"
  if (lego.id === 'S0421L01') {
    phrases.push(
      ["they know", "saben", null, 2],
      ["they already know", "ya saben", null, 3],
      ["Because they know", "Porque saben", null, 3],
      ["Because they already know", "Porque ya saben", null, 4],
      ["They know that", "Saben que", null, 3],
      ["Because they already know that", "Porque ya saben que", null, 5],
      ["They know that he wants to speak", "Saben que quiere hablar", null, 6],
      ["Because they already know that you're trying to learn", "Porque ya saben que estás intentando aprender", null, 9],
      ["They know that they need to make sure", "Saben que necesitan asegurarse de", null, 7],
      ["Because they already know that we want to speak Spanish", "Porque ya saben que queremos hablar español", null, 9]
    );
  }

  // For S0421L02: "he's getting" (se está poniendo)
  else if (lego.id === 'S0421L02') {
    phrases.push(
      ["he's getting", "se está poniendo", null, 2],
      ["he's getting weak", "se está poniendo débil", null, 3],
      ["They know he's getting weak", "Saben que se está poniendo débil", null, 6],
      ["Because he's getting tired", "Porque se está poniendo cansado", null, 5],
      ["They already know he's getting old", "Ya saben que se está poniendo viejo", null, 7],
      ["Because they know that he's getting nervous", "Porque saben que se está poniendo nervioso", null, 8],
      ["They think that he's getting better", "Piensan que se está poniendo mejor", null, 7],
      ["Because they already know that he's getting ready", "Porque ya saben que se está poniendo preparado", null, 9],
      ["They need to make sure that he's getting strong", "Necesitan asegurarse de que se está poniendo fuerte", null, 10],
      ["They already know that he's getting sick", "Ya saben que se está poniendo enfermo", null, 8]
    );
  }

  // For S0421L03: "weak" (débil) - FINAL LEGO
  else if (lego.id === 'S0421L03') {
    phrases.push(
      ["weak", "débil", null, 1],
      ["very weak", "muy débil", null, 2],
      ["He's weak", "Está débil", null, 2],
      ["He's getting weak", "Se está poniendo débil", null, 4],
      ["They know he's weak", "Saben que está débil", null, 5],
      ["They already know he's weak", "Ya saben que está débil", null, 6],
      ["Because they know he's getting weak", "Porque saben que se está poniendo débil", null, 7],
      ["They already know that he's very weak", "Ya saben que está muy débil", null, 8],
      ["Because they need to know that he's getting weak", "Porque necesitan saber que se está poniendo débil", null, 9],
      ["Because they already know he's getting weak.", "Porque ya saben que se está poniendo débil.", null, 7]
    );
  }

  // S0422L01: "A" (Una) - only 1 LEGO for this seed, needs to end with seed
  else if (lego.id === 'S0272L04' && seedSentence === 'A question.') {
    phrases.push(
      ["A", "Una", null, 1],
      ["A question", "Una pregunta", null, 2],
      ["A simple question", "Una pregunta simple", null, 3],
      ["A very important question", "Una pregunta muy importante", null, 4],
      ["I want to ask a question", "Quiero preguntar una pregunta", null, 6],
      ["They need to ask a question", "Necesitan preguntar una pregunta", null, 6],
      ["Do you have a question?", "¿Tienes una pregunta?", null, 5],
      ["I would like to ask you a simple question", "Me gustaría preguntarte una pregunta simple", null, 9],
      ["They want to know if you have a question", "Quieren saber si tienes una pregunta", null, 9],
      ["A question.", "Una pregunta.", null, 2]
    );
  }

  // For S0423L01: "Do they need" (Necesitan)
  else if (lego.id === 'S0423L01') {
    phrases.push(
      ["they need", "necesitan", null, 2],
      ["Do they need", "Necesitan", null, 3],
      ["They need to ask", "Necesitan preguntar", null, 4],
      ["Do they need to know?", "¿Necesitan saber?", null, 4],
      ["They need to make sure", "Necesitan asegurarse de", null, 5],
      ["Do they need to speak Spanish?", "¿Necesitan hablar español?", null, 5],
      ["They need to understand that it's important", "Necesitan entender que es importante", null, 7],
      ["Do they need to ask such a difficult question?", "¿Necesitan preguntar una pregunta tan difícil?", null, 8],
      ["They need to make sure that they understand everything", "Necesitan asegurarse de que entienden todo", null, 9],
      ["They need to know if it's possible to start soon", "Necesitan saber si es posible empezar pronto", null, 10]
    );
  }

  // Continue with more seeds...
  // For now, return a template that shows the structure
  else {
    // Generic template - will be replaced with actual content
    const wordCount = countWords(legoEnglish);
    for (let i = 0; i < 10; i++) {
      if (isLastLego && i === 9) {
        // Last phrase must be the complete seed sentence
        const [known, target] = seedSentence.split('|');
        phrases.push([known.trim(), target.trim(), null, countWords(known.trim())]);
      } else {
        phrases.push([
          `${legoEnglish} ${i + 1}`,
          `${legoSpanish} ${i + 1}`,
          null,
          wordCount
        ]);
      }
    }
  }

  return phrases;
}

// Main generation function
function generateBaskets() {
  console.log('Generating baskets for Agent 07 (S0421-S0440)...\n');

  const output = {
    version: "curated_v6_molecular_lego",
    agent_id: 7,
    seed_range: "S0421-S0440",
    total_seeds: 20,
    validation_status: "PENDING",
    validated_at: null,
    seeds: {}
  };

  // Process each seed
  for (const seed of agentInput.seeds) {
    console.log(`Processing ${seed.seed_id}...`);

    const cumulativeLegos = countLegosUpTo(seed.seed_id);
    const seedData = {
      seed: seed.seed_id,
      seed_pair: seed.seed_pair,
      cumulative_legos: cumulativeLegos,
      legos: {}
    };

    const legoIds = seed.legos.map(l => l.id);

    // Process each LEGO in the seed
    for (let i = 0; i < seed.legos.length; i++) {
      const lego = seed.legos[i];
      const isLastLego = (i === seed.legos.length - 1);

      // Build whitelist for this LEGO
      const whitelist = buildWhitelistUpTo(lego.id);
      const availableLegos = countLegosUpTo(seed.seed_id) + i;

      // Generate practice phrases
      const seedSentence = isLastLego ? `${seed.seed_pair.known}|${seed.seed_pair.target}` : null;
      const practices = generatePractices(lego, whitelist, isLastLego, seedSentence);

      // Calculate distribution
      const distribution = {
        really_short_1_2: 0,
        quite_short_3: 0,
        longer_4_5: 0,
        long_6_plus: 0
      };

      practices.forEach(([eng, spa, pat, count]) => {
        const category = categorizePhrase(count);
        distribution[category]++;
      });

      seedData.legos[lego.id] = {
        lego: [lego.known, lego.target],
        type: lego.type,
        available_legos: availableLegos,
        practice_phrases: practices,
        phrase_distribution: distribution,
        gate_compliance: "STRICT - All words from taught LEGOs only"
      };
    }

    output.seeds[seed.seed_id] = seedData;
  }

  return output;
}

// Validation functions
function validateFormat(data) {
  console.log('\n=== GATE 1: Format Validation ===');
  let errors = [];

  if (!data.seeds) errors.push("Missing 'seeds' key at root");
  if (!data.agent_id) errors.push("Missing 'agent_id'");
  if (!data.validation_status) errors.push("Missing 'validation_status'");

  const seedIds = Object.keys(data.seeds || {});
  if (seedIds.length !== 20) {
    errors.push(`Expected 20 seeds, got ${seedIds.length}`);
  }

  for (const seedId of seedIds) {
    const seed = data.seeds[seedId];
    if (!seed.seed_pair) errors.push(`${seedId}: Missing seed_pair`);
    if (!seed.legos) errors.push(`${seedId}: Missing legos`);

    for (const legoId in seed.legos || {}) {
      const lego = seed.legos[legoId];
      if (!lego.practice_phrases) {
        errors.push(`${legoId}: Missing practice_phrases`);
      } else if (lego.practice_phrases.length !== 10) {
        errors.push(`${legoId}: Expected 10 phrases, got ${lego.practice_phrases.length}`);
      }
      if (!lego.phrase_distribution) {
        errors.push(`${legoId}: Missing phrase_distribution`);
      }
    }
  }

  if (errors.length > 0) {
    console.log('❌ Format validation FAILED:');
    errors.forEach(e => console.log(`  - ${e}`));
    return false;
  }

  console.log('✅ GATE 1: Format validation PASSED');
  return true;
}

function validateQuality(data) {
  console.log('\n=== GATE 2: Quality Validation ===');

  let gateViolations = [];
  let distributionErrors = [];
  let completenessWarnings = [];

  const seedIds = Object.keys(data.seeds);

  for (const seedId of seedIds) {
    const seed = data.seeds[seedId];

    for (const legoId in seed.legos) {
      const lego = seed.legos[legoId];
      const whitelist = buildWhitelistUpTo(legoId);

      // Check GATE compliance
      for (let i = 0; i < lego.practice_phrases.length; i++) {
        const [english, spanish, pattern, count] = lego.practice_phrases[i];
        const violations = validatePhrase(spanish, whitelist);

        if (violations.length > 0) {
          gateViolations.push({
            lego: legoId,
            phrase: i + 1,
            words: violations,
            spanish: spanish
          });
        }

        // Check completeness (phrases 3-10)
        if (i >= 2) {
          if (english.length < 10) {
            completenessWarnings.push({
              lego: legoId,
              phrase: i + 1,
              english: english
            });
          }
        }
      }

      // Check distribution
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
      gateViolations.push({
        lego: legoIds[legoIds.length - 1],
        phrase: 10,
        error: "Final phrase must be complete seed sentence",
        expected: expectedSeed,
        got: finalPhrase[0]
      });
    }
  }

  // Report
  console.log(`GATE Violations: ${gateViolations.length}`);
  console.log(`Distribution Errors: ${distributionErrors.length}`);
  console.log(`Completeness Warnings: ${completenessWarnings.length}`);

  if (gateViolations.length > 0) {
    console.log('\n❌ GATE VIOLATIONS (MUST FIX):');
    gateViolations.slice(0, 10).forEach(v => {
      if (v.words) {
        console.log(`  ${v.lego} phrase ${v.phrase}: ${v.words.join(', ')} not in whitelist`);
        console.log(`    Full phrase: "${v.spanish}"`);
      } else {
        console.log(`  ${v.lego} phrase ${v.phrase}: ${v.error}`);
        console.log(`    Expected: "${v.expected}"`);
        console.log(`    Got: "${v.got}"`);
      }
    });
  }

  if (distributionErrors.length > 0) {
    console.log('\n⚠️  DISTRIBUTION ERRORS:');
    distributionErrors.slice(0, 10).forEach(e => console.log(`  ${e}`));
  }

  const validationPassed = (gateViolations.length === 0 && distributionErrors.length === 0);

  if (validationPassed) {
    console.log('\n✅ GATE 2: Quality validation PASSED');
  } else {
    console.log('\n❌ GATE 2: Quality validation FAILED');
  }

  return validationPassed;
}

// Main execution
try {
  const output = generateBaskets();

  // Initial validation
  const formatValid = validateFormat(output);
  const qualityValid = validateQuality(output);

  if (formatValid && qualityValid) {
    output.validation_status = "PASSED";
    output.validated_at = new Date().toISOString();

    // Save output
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    console.log(`\n✅ Output saved to: ${OUTPUT_PATH}`);

    // Count totals
    let totalLegos = 0;
    let totalPhrases = 0;
    for (const seed of Object.values(output.seeds)) {
      const legoCount = Object.keys(seed.legos).length;
      totalLegos += legoCount;
      totalPhrases += legoCount * 10;
    }

    console.log(`\n🎉 Agent 07: ✅ VALIDATED - 20 seeds, ${totalLegos} LEGOs, ${totalPhrases} phrases`);
  } else {
    console.log('\n❌ Validation failed. Please fix errors and re-run.');
    process.exit(1);
  }
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
