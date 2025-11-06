#!/usr/bin/env node

/**
 * Build vocabulary whitelist from extraction map
 * Extracts all Spanish words from taught LEGOs through a given seed
 */

const fs = require('fs');

// Load extraction map
const extractionMap = JSON.parse(
  fs.readFileSync('./claude_code_web_test/LEGO_EXTRACTION_MAP_S0001-S0050_AUTHORITATIVE.json', 'utf8')
);

/**
 * Extract Spanish vocabulary from all seeds up to and including targetSeed
 */
function buildWhitelist(targetSeed) {
  const whitelist = new Set();

  // Parse seed number (e.g., "S0011" -> 11)
  const targetNum = parseInt(targetSeed.substring(1));

  // Iterate through all seeds up to target
  for (let i = 1; i <= targetNum; i++) {
    const seedKey = `S${String(i).padStart(4, '0')}`;
    const seed = extractionMap[seedKey];

    if (!seed) {
      console.error(`Warning: Seed ${seedKey} not found in extraction map`);
      continue;
    }

    // Extract Spanish words from each LEGO
    for (const lego of seed.legos) {
      const spanish = lego.lego[1]; // [known, target] -> target

      // Add base word
      whitelist.add(spanish);

      // Tokenize multi-word expressions
      const words = spanish.split(/\s+/);
      words.forEach(word => whitelist.add(word));
    }
  }

  return Array.from(whitelist).sort();
}

/**
 * Generate conjugation variants for common verbs
 */
function addConjugations(whitelist) {
  const verbConjugations = {
    // Infinitives
    'hablar': ['hablo', 'hablas', 'habla', 'hablamos', 'hablan', 'hablando', 'hablado'],
    'aprender': ['aprendo', 'aprendes', 'aprende', 'aprendemos', 'aprenden', 'aprendiendo', 'aprendido'],
    'intentar': ['intento', 'intentas', 'intenta', 'intentamos', 'intentan', 'intentando', 'intentado'],
    'practicar': ['practico', 'practicas', 'practica', 'practicamos', 'practican', 'practicando', 'practicado'],
    'recordar': ['recuerdo', 'recuerdas', 'recuerda', 'recordamos', 'recuerdan', 'recordando', 'recordado'],
    'explicar': ['explico', 'explicas', 'explica', 'explicamos', 'explican', 'explicando', 'explicado'],

    // Estar
    'estar': ['estoy', 'estás', 'está', 'estamos', 'están', 'estando', 'estado'],

    // Querer
    'querer': ['quiero', 'quieres', 'quiere', 'queremos', 'quieren', 'queriendo', 'querido'],

    // Poder
    'poder': ['puedo', 'puedes', 'puede', 'podemos', 'pueden', 'pudiendo', 'podido'],

    // Ir
    'ir': ['voy', 'vas', 'va', 'vamos', 'van', 'yendo', 'ido'],
  };

  const expanded = new Set(whitelist);

  whitelist.forEach(word => {
    if (verbConjugations[word]) {
      verbConjugations[word].forEach(conjugation => expanded.add(conjugation));
    }
  });

  return Array.from(expanded).sort();
}

// Main execution
if (require.main === module) {
  const targetSeed = process.argv[2] || 'S0011';

  console.log(`Building vocabulary whitelist for ${targetSeed}...`);

  let whitelist = buildWhitelist(targetSeed);
  console.log(`Base vocabulary: ${whitelist.length} words`);

  whitelist = addConjugations(whitelist);
  console.log(`With conjugations: ${whitelist.length} words`);

  // Output
  const output = {
    seed: targetSeed,
    vocabulary_count: whitelist.length,
    vocabulary: whitelist,
    generated_at: new Date().toISOString()
  };

  const outputPath = `./vocabulary_whitelist_${targetSeed.toLowerCase()}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nWhitelist saved to: ${outputPath}`);

  // Also output first 20 words for verification
  console.log(`\nFirst 20 words:`);
  console.log(whitelist.slice(0, 20).join(', '));
}

module.exports = { buildWhitelist, addConjugations };
