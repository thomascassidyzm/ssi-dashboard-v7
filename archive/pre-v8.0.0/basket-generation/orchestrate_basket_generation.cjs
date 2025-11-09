#!/usr/bin/env node
/**
 * LEGO Basket Generation Orchestrator
 *
 * Automated system that:
 * 1. Spawns agents to generate phrases for each LEGO
 * 2. Validates conversational quality
 * 3. Retries with feedback if needed
 * 4. Saves final validated baskets
 *
 * Goal: Beat hand-crafted baskets on conversational metrics
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Load extraction map
const EXTRACTION_MAP_PATH = path.join(__dirname, 'claude_code_web_test/LEGO_EXTRACTION_MAP_S0001-S0050_AUTHORITATIVE.json');
const BASKETS_DIR = path.join(__dirname, 'public/baskets');
const OUTPUT_DIR = path.join(__dirname, 'generated_baskets');

const extractionMap = JSON.parse(fs.readFileSync(EXTRACTION_MAP_PATH, 'utf8'));

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Build cumulative vocabulary state for GATE compliance
 */
function buildVocabularyState(legoId) {
  const vocab = [];
  const patterns = [];
  let found = false;

  for (const seedKey of Object.keys(extractionMap).filter(k => k.startsWith('S')).sort()) {
    const seed = extractionMap[seedKey];
    const legos = seed.legos || [];

    for (const lego of legos) {
      if (lego.id === legoId) {
        found = true;
        break;
      }

      vocab.push({
        id: lego.id,
        known: lego.lego[0],
        target: lego.lego[1]
      });

      if (lego.pattern_demonstrated && !patterns.includes(lego.pattern_demonstrated)) {
        patterns.push(lego.pattern_demonstrated);
      }
    }

    if (found) break;
  }

  return { vocab, patterns };
}

/**
 * Generate agent prompt for a LEGO
 */
function generateAgentPrompt(lego, state, isLastInSeed, seedPair, attempt = 1, feedback = null) {
  const { vocab, patterns } = state;

  const prompt = `
# LEGO Basket Generation Task

## Your Mission
Generate **15 high-quality practice phrases** for this LEGO that will help learners build conversational confidence.

## LEGO Details
- **ID**: ${lego.id}
- **Known** (English): "${lego.lego[0]}"
- **Target** (Spanish): "${lego.lego[1]}"
- **Type**: ${lego.type}
${isLastInSeed ? `- **FINAL LEGO**: Must include full seed sentence\n- **Seed**: "${seedPair.known}" → "${seedPair.target}"` : ''}

## Available Resources
- **Previously taught LEGOs**: ${vocab.length} (see vocab list below)
- **Available patterns**: ${patterns.join(', ')}

## CRITICAL REQUIREMENTS (Must Meet!)

### 1. CONVERSATIONAL REALISM (★★★★★)
**Generate at least 7-8 phrases with 5+ LEGOs** (after filtering, need 5+ to remain)

Why? These longer phrases:
- Mimic natural thought processes
- Build confidence in chaining ideas
- Prepare learners for real conversations

Examples of GOOD conversational phrases:
- "I want to speak Spanish and I'm trying to learn but I'm not sure" (8 LEGOs)
- "I'm going to try because I want to practise but I can remember" (9 LEGOs)
- "I'm not sure if I can explain but I'm trying to learn Spanish" (9 LEGOs)

### 2. CONJUNCTION GOLD (★★★★★)
**Use conjunctions in 40%+ of phrases** (aim for 6+ out of 15)

GOLD conjunctions:
- **pero** (but) - contrasting ideas
- **y** (and) - connecting thoughts
- **porque** (because) - explaining reasons
- **o** (or) - presenting options
- **si** (if) - conditionals
- **cuando** (when) - time connections

These are UNDER-REPRESENTED in seeds but CRITICAL for real conversation!

### 3. GATE COMPLIANCE (★★★★★)
**ONLY use vocabulary from the taught LEGOs list below**

Every word in your Spanish phrases MUST appear in one of the previously taught LEGOs.
Exception: Common conjugations of taught verbs are allowed (e.g., if "quiero" is taught, "quiere", "quieres" are OK).

### 4. Pattern Variety
Use all ${patterns.length} available patterns across your phrases.

## Phrase Distribution Target
- 2 phrases: 1-2 LEGOs (building blocks)
- 5-6 phrases: 3-4 LEGOs (pattern practice)
- **7-8 phrases: 5+ LEGOs** (conversational, chained thoughts with conjunctions)

${feedback ? `\n## RETRY FEEDBACK (Previous Attempt Failed)\n${feedback}\n\nPLEASE ADDRESS THESE ISSUES IN THIS ATTEMPT.\n` : ''}

## Previously Taught LEGOs (For GATE Compliance)
${vocab.slice(-30).map(v => `- ${v.known} → ${v.target}`).join('\n')}
${vocab.length > 30 ? `\n... and ${vocab.length - 30} more (see extraction map)` : ''}

## Output Format
Return ONLY a JSON array of 15 phrases in this exact format:

[
  ["known phrase", "target phrase", "pattern_code_or_null", lego_count],
  ["I want to speak", "Quiero hablar", "P01", 2],
  ["I want to speak and I'm trying to learn", "Quiero hablar y estoy intentando aprender", "P01", 4],
  ...
]

Each phrase is: [English, Spanish, Pattern (or null), Number of LEGOs used]

## Quality Checklist Before Submitting
- [ ] At least 7-8 phrases have 5+ LEGOs
- [ ] At least 6 phrases use conjunctions (pero, y, porque, si, etc.)
- [ ] All Spanish words appear in taught LEGOs list
- [ ] Natural, conversational phrasing (how people actually think/speak)
- [ ] All ${patterns.length} patterns represented
${isLastInSeed ? '- [ ] Full seed sentence included as one phrase' : ''}

Generate 15 phrases now!
`;

  return prompt;
}

/**
 * Spawn agent to generate phrases for a LEGO
 */
async function generatePhrasesForLego(lego, state, isLastInSeed, seedPair, attempt = 1, feedback = null) {
  console.log(`\n[${ attempt > 1 ? `RETRY ${attempt}` : 'ATTEMPT 1'}] Generating phrases for ${lego.id}...`);

  const prompt = generateAgentPrompt(lego, state, isLastInSeed, seedPair, attempt, feedback);

  // For now, return a mock result (in production, this would spawn an actual agent)
  // You would integrate with Claude API or your agent spawning system here

  console.log(`  Prompt generated (${prompt.length} chars)`);
  console.log(`  Spawning agent...`);

  // Mock: Return a placeholder result
  // In production: const result = await spawnClaudeAgent(prompt);

  return {
    success: false, // Set to true when agent returns valid JSON
    phrases: [],
    error: "Agent spawning not yet implemented - this is the orchestrator framework"
  };
}

/**
 * Validate generated phrases
 */
function validateGeneratedPhrases(phrases, legoId) {
  // Import validator
  const { validateConversationalQuality } = require('./validate_conversational_quality.cjs');

  const result = validateConversationalQuality(phrases);

  console.log(`\n  Validation Results:`);
  console.log(`    Conversational: ${result.conversational_score}/100 (${result.conversational_phrases}/${result.total_phrases} phrases with 5+ LEGOs)`);
  console.log(`    Conjunctions: ${result.conjunction_score}/100 (${result.conjunction_percentage}% usage)`);
  console.log(`    Status: ${result.pass ? '✅ PASS' : '❌ FAIL'}`);

  return result;
}

/**
 * Generate feedback for retry
 */
function generateRetryFeedback(validationResult) {
  const feedback = [];

  if (validationResult.conversational_score < 100) {
    feedback.push(`❌ Only ${validationResult.conversational_phrases}/${validationResult.total_phrases} phrases have 5+ LEGOs (need 5+)`);
    feedback.push(`   → Focus on chaining more thoughts together with conjunctions`);
    feedback.push(`   → Examples: "I want X and I'm trying Y but I'm not sure if Z"`);
  }

  if (validationResult.conjunction_score < 100) {
    feedback.push(`❌ Only ${validationResult.conjunction_percentage}% use conjunctions (need 40%+)`);
    feedback.push(`   → Use more: pero (but), y (and), porque (because), si (if)`);
    feedback.push(`   → Connect ideas naturally: "I speak Spanish pero I'm trying to learn more"`);
  }

  return feedback.join('\n');
}

/**
 * Generate basket for a single LEGO (with retries)
 */
async function generateLegoBasket(lego, state, isLastInSeed, seedPair, maxRetries = 3) {
  let attempt = 1;
  let feedback = null;

  while (attempt <= maxRetries) {
    const result = await generatePhrasesForLego(lego, state, isLastInSeed, seedPair, attempt, feedback);

    if (!result.success) {
      console.log(`  ❌ Agent failed: ${result.error}`);
      return null;
    }

    // Validate phrases
    const validation = validateGeneratedPhrases(result.phrases, lego.id);

    if (validation.pass) {
      console.log(`  ✅ SUCCESS! Basket meets all requirements.`);
      return {
        lego: lego.lego,
        type: lego.type,
        available_legos: state.vocab.length,
        available_patterns: state.patterns,
        practice_phrases: result.phrases,
        validation_score: {
          conversational: validation.conversational_score,
          conjunctions: validation.conjunction_score
        },
        attempt: attempt
      };
    }

    // Generate feedback for retry
    feedback = generateRetryFeedback(validation);
    attempt++;

    if (attempt <= maxRetries) {
      console.log(`\n  Retrying with feedback...`);
    }
  }

  console.log(`  ❌ FAILED after ${maxRetries} attempts`);
  return null;
}

/**
 * Generate complete basket for a seed
 */
async function generateSeedBasket(seedId) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`GENERATING BASKET: ${seedId}`);
  console.log('='.repeat(70));

  const seed = extractionMap[seedId];
  if (!seed) {
    console.error(`Seed ${seedId} not found in extraction map`);
    return null;
  }

  console.log(`Seed: "${seed.seed_pair.known}"`);
  console.log(`LEGOs: ${seed.legos.length}`);
  console.log(`Patterns: ${seed.patterns_introduced.join(', ')}`);

  const basket = {
    version: 'generative_v5_conversational',
    seed: seedId,
    course_direction: 'Spanish for English speakers',
    mapping: 'KNOWN (English) → TARGET (Spanish)',
    seed_pair: seed.seed_pair,
    patterns_introduced: seed.patterns_introduced.join(', '),
    cumulative_patterns: seed.patterns_used,
    cumulative_legos: seed.cumulative_legos,
    note: 'Generated with conversational requirements: 5+ phrases with 5+ LEGOs, 40%+ conjunction usage',
    generation_metadata: {
      generated_at: new Date().toISOString(),
      max_retries: 3,
      requirements: {
        min_conversational_phrases: 5,
        min_conjunction_percentage: 40
      }
    }
  };

  // Generate basket for each LEGO
  for (let i = 0; i < seed.legos.length; i++) {
    const lego = seed.legos[i];
    const isLast = i === seed.legos.length - 1;
    const state = buildVocabularyState(lego.id);

    const legoBasket = await generateLegoBasket(lego, state, isLast, seed.seed_pair);

    if (!legoBasket) {
      console.error(`Failed to generate basket for ${lego.id}`);
      return null;
    }

    basket[lego.id] = legoBasket;
  }

  // Save basket
  const outputPath = path.join(OUTPUT_DIR, `lego_baskets_${seedId.toLowerCase()}_v5.json`);
  fs.writeFileSync(outputPath, JSON.stringify(basket, null, 2), 'utf8');

  console.log(`\n✅ BASKET GENERATED: ${outputPath}`);

  return basket;
}

/**
 * Main orchestrator
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('LEGO Basket Generation Orchestrator\n');
    console.log('Automated system that generates conversational baskets using agents\n');
    console.log('Usage:');
    console.log('  node orchestrate_basket_generation.cjs S0005          # Single seed');
    console.log('  node orchestrate_basket_generation.cjs S0001-S0020    # Range');
    console.log('\nRequirements enforced:');
    console.log('  - At least 5 phrases with 5+ LEGOs (conversational)');
    console.log('  - 40%+ conjunction usage (pero, y, porque, si, etc.)');
    console.log('  - GATE compliance (only taught vocabulary)');
    console.log('  - Pattern variety');
    process.exit(1);
  }

  // Parse seed IDs
  let seedIds = [];
  if (args[0].includes('-')) {
    const [start, end] = args[0].split('-');
    const startNum = parseInt(start.replace('S', ''));
    const endNum = parseInt(end.replace('S', ''));
    for (let i = startNum; i <= endNum; i++) {
      seedIds.push(`S${String(i).padStart(4, '0')}`);
    }
  } else {
    seedIds = args;
  }

  console.log(`\nOrchestrating basket generation for ${seedIds.length} seeds`);
  console.log(`Seeds: ${seedIds.join(', ')}\n`);

  const results = [];

  for (const seedId of seedIds) {
    const result = await generateSeedBasket(seedId);
    results.push({ seedId, success: result !== null });
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('GENERATION SUMMARY');
  console.log('='.repeat(70));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`  ${status} ${r.seedId}`);
  });

  console.log(`\nOutput directory: ${OUTPUT_DIR}`);
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { generateSeedBasket, generateLegoBasket };
