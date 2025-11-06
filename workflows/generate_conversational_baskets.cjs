#!/usr/bin/env node
/**
 * Conversational Basket Generation Workflow
 *
 * Manual trigger, automated execution:
 * 1. You run: node workflows/generate_conversational_baskets.cjs S0005
 * 2. System spawns LLM agents for phrase generation (creative work)
 * 3. System validates results automatically (checking quality)
 * 4. System retries with feedback if needed (workflow management)
 * 5. System saves final baskets (automation)
 *
 * The right tool for each job:
 * - LLMs: Creative phrase generation
 * - Automation: Orchestration, validation, retries, saving
 */

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

// Configuration
const EXTRACTION_MAP_PATH = path.join(__dirname, '../claude_code_web_test/LEGO_EXTRACTION_MAP_S0001-S0050_AUTHORITATIVE.json');
const PHASE_PROMPT_PATH = path.join(__dirname, '../docs/phase_intelligence/phase_5_conversational_baskets.md');
const OUTPUT_DIR = path.join(__dirname, '../generated_baskets');

// Load resources
const extractionMap = JSON.parse(fs.readFileSync(EXTRACTION_MAP_PATH, 'utf8'));
const phasePrompt = fs.readFileSync(PHASE_PROMPT_PATH, 'utf8');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Build vocabulary state for GATE compliance
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
 * Generate context for LLM agent
 */
function buildAgentContext(lego, state, isLastInSeed, seedPair, feedback = null) {
  const { vocab, patterns } = state;

  let context = `## Current LEGO

**ID**: ${lego.id}
**Known** (English): "${lego.lego[0]}"
**Target** (Spanish): "${lego.lego[1]}"
**Type**: ${lego.type}
${isLastInSeed ? `\n**THIS IS THE FINAL LEGO** - You MUST include the full seed sentence as one of your phrases:\n**Seed**: "${seedPair.known}" → "${seedPair.target}"\n` : ''}

## Available Resources

**Previously Taught LEGOs** (${vocab.length} total):
${vocab.slice(-30).map(v => `- ${v.known} → ${v.target}`).join('\n')}
${vocab.length > 30 ? `\n... and ${vocab.length - 30} more LEGOs available (check extraction map)` : ''}

**Available Patterns**: ${patterns.join(', ')}

`;

  if (feedback) {
    context += `\n## RETRY FEEDBACK (Previous Attempt Failed)

${feedback}

**PLEASE ADDRESS THESE ISSUES IN THIS ATTEMPT!**

`;
  }

  context += `\nGenerate your 15 phrases now!`;

  return context;
}

/**
 * Spawn LLM agent for phrase generation (THE CREATIVE WORK)
 */
async function generatePhrasesWithLLM(lego, state, isLastInSeed, seedPair, attempt = 1, feedback = null) {
  console.log(`\n[${ attempt > 1 ? `RETRY ${attempt}` : 'ATTEMPT 1'}] Generating phrases for ${lego.id}...`);

  const context = buildAgentContext(lego, state, isLastInSeed, seedPair, feedback);

  const fullPrompt = phasePrompt + '\n\n' + context;

  try {
    console.log(`  🤖 Spawning LLM agent (${fullPrompt.length} chars)...`);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: fullPrompt
      }]
    });

    const responseText = message.content[0].text;

    // Extract JSON from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const phrases = JSON.parse(jsonMatch[0]);

    console.log(`  ✅ LLM returned ${phrases.length} phrases`);

    return {
      success: true,
      phrases: phrases
    };

  } catch (error) {
    console.log(`  ❌ LLM agent failed: ${error.message}`);
    return {
      success: false,
      phrases: [],
      error: error.message
    };
  }
}

/**
 * Validate generated phrases (AUTOMATED CHECKING)
 */
function validatePhrases(phrases, legoId) {
  const { validateConversationalQuality } = require('../validate_conversational_quality.cjs');

  const result = validateConversationalQuality(phrases);

  console.log(`\n  📊 Validation Results:`);
  console.log(`    Conversational: ${result.conversational_score}/100 (${result.conversational_phrases}/${result.total_phrases} phrases with 5+ LEGOs)`);
  console.log(`    Conjunctions: ${result.conjunction_score}/100 (${result.conjunction_percentage}% usage)`);
  console.log(`    Status: ${result.pass ? '✅ PASS' : '❌ FAIL'}`);

  if (!result.pass) {
    console.log(`\n  Issues:`);
    result.conversational_score < 100 && console.log(`    - Need ${5 - result.conversational_phrases} more phrases with 5+ LEGOs`);
    result.conjunction_score < 100 && console.log(`    - Conjunction usage too low (${result.conjunction_percentage}% vs 40% needed)`);
  }

  return result;
}

/**
 * Generate retry feedback (AUTOMATED FEEDBACK)
 */
function generateRetryFeedback(validationResult) {
  const feedback = [];

  if (validationResult.conversational_score < 100) {
    feedback.push(`❌ CONVERSATIONAL REQUIREMENT NOT MET`);
    feedback.push(`You generated ${validationResult.conversational_phrases}/${validationResult.total_phrases} phrases with 5+ LEGOs.`);
    feedback.push(`You need ${5 - validationResult.conversational_phrases} MORE conversational phrases.`);
    feedback.push(``);
    feedback.push(`Focus on chaining thoughts together:`);
    feedback.push(`- "I want to speak Spanish and I'm trying to learn but I'm not sure" (8 LEGOs)`);
    feedback.push(`- "I'm going to try because I want to practise but I can remember" (9 LEGOs)`);
    feedback.push(``);
  }

  if (validationResult.conjunction_score < 100) {
    feedback.push(`❌ CONJUNCTION REQUIREMENT NOT MET`);
    feedback.push(`Only ${validationResult.conjunction_percentage}% of phrases use conjunctions (need 40%+).`);
    feedback.push(``);
    feedback.push(`Use more conjunctions to connect ideas:`);
    feedback.push(`- pero (but) - "I want to speak pero I'm not sure"`);
    feedback.push(`- y (and) - "I'm trying to learn y I want to practise"`);
    feedback.push(`- porque (because) - "I'm practising porque I want to learn"`);
    feedback.push(`- si (if) - "I'm not sure si I can remember"`);
    feedback.push(``);
  }

  return feedback.join('\n');
}

/**
 * Generate basket for a single LEGO (with LLM + validation loop)
 */
async function generateLegoBasket(lego, state, isLastInSeed, seedPair, maxRetries = 3) {
  let attempt = 1;
  let feedback = null;

  while (attempt <= maxRetries) {
    // LLM DOES THE CREATIVE WORK
    const llmResult = await generatePhrasesWithLLM(lego, state, isLastInSeed, seedPair, attempt, feedback);

    if (!llmResult.success) {
      console.log(`  ⚠️  LLM error, retrying...`);
      attempt++;
      continue;
    }

    // AUTOMATION VALIDATES THE WORK
    const validation = validatePhrases(llmResult.phrases, lego.id);

    if (validation.pass) {
      console.log(`  ✅ SUCCESS! Basket meets all requirements.`);
      return {
        lego: lego.lego,
        type: lego.type,
        available_legos: state.vocab.length,
        available_patterns: state.patterns,
        practice_phrases: llmResult.phrases,
        validation_score: {
          conversational: validation.conversational_score,
          conjunctions: validation.conjunction_score
        },
        attempt: attempt,
        generated_at: new Date().toISOString()
      };
    }

    // AUTOMATION GENERATES FEEDBACK FOR RETRY
    feedback = generateRetryFeedback(validation);
    attempt++;

    if (attempt <= maxRetries) {
      console.log(`\n  🔄 Retrying with feedback...`);
    }
  }

  console.log(`  ❌ FAILED after ${maxRetries} attempts`);
  return null;
}

/**
 * Generate complete basket for a seed (WORKFLOW ORCHESTRATION)
 */
async function generateSeedBasket(seedId) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`GENERATING CONVERSATIONAL BASKET: ${seedId}`);
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
    note: 'Generated with LLM agents + automated validation: 5+ phrases with 5+ LEGOs, 40%+ conjunction usage',
    generation_metadata: {
      generated_at: new Date().toISOString(),
      max_retries: 3,
      requirements: {
        min_conversational_phrases: 5,
        min_conjunction_percentage: 40
      }
    }
  };

  const startTime = Date.now();

  // ORCHESTRATION: Generate basket for each LEGO
  for (let i = 0; i < seed.legos.length; i++) {
    const lego = seed.legos[i];
    const isLast = i === seed.legos.length - 1;
    const state = buildVocabularyState(lego.id);

    const legoBasket = await generateLegoBasket(lego, state, isLast, seed.seed_pair);

    if (!legoBasket) {
      console.error(`\n❌ Failed to generate basket for ${lego.id} after retries`);
      return null;
    }

    basket[lego.id] = legoBasket;
  }

  const duration = Math.round((Date.now() - startTime) / 1000);

  // AUTOMATION: Save results
  const outputPath = path.join(OUTPUT_DIR, `lego_baskets_${seedId.toLowerCase()}_conversational.json`);
  fs.writeFileSync(outputPath, JSON.stringify(basket, null, 2), 'utf8');

  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ BASKET GENERATED SUCCESSFULLY`);
  console.log(`   Output: ${outputPath}`);
  console.log(`   Duration: ${duration}s`);
  console.log(`   LEGOs: ${seed.legos.length}`);
  console.log('='.repeat(70));

  return basket;
}

/**
 * Main workflow entry point (MANUAL TRIGGER)
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Conversational Basket Generation Workflow                     ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    console.log('Manual trigger, automated execution:\n');
    console.log('  LLMs: Creative phrase generation (15 natural phrases per LEGO)');
    console.log('  Automation: Validation, retries, feedback, saving\n');
    console.log('Usage:');
    console.log('  node workflows/generate_conversational_baskets.cjs S0005\n');
    console.log('  node workflows/generate_conversational_baskets.cjs S0001-S0020\n');
    console.log('Requirements enforced:');
    console.log('  ✓ At least 5 phrases with 5+ LEGOs (conversational)');
    console.log('  ✓ 40%+ conjunction usage (pero, y, porque, si)');
    console.log('  ✓ GATE compliance (only taught vocabulary)');
    console.log('  ✓ Pattern variety (all patterns represented)\n');
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

  console.log(`\n🚀 Starting conversational basket generation`);
  console.log(`   Seeds: ${seedIds.join(', ')}`);
  console.log(`   API: Anthropic Claude Sonnet 4\n`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ERROR: ANTHROPIC_API_KEY not set in environment');
    console.error('   Set it in .env file or export ANTHROPIC_API_KEY=your_key');
    process.exit(1);
  }

  const results = [];
  const overallStartTime = Date.now();

  // ORCHESTRATION: Process each seed
  for (const seedId of seedIds) {
    const result = await generateSeedBasket(seedId);
    results.push({
      seedId,
      success: result !== null,
      legos: result ? Object.keys(extractionMap[seedId].legos).length : 0
    });
  }

  const totalDuration = Math.round((Date.now() - overallStartTime) / 1000);

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('WORKFLOW SUMMARY');
  console.log('='.repeat(70));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalLegos = results.reduce((sum, r) => sum + (r.legos || 0), 0);

  console.log(`\n✅ Successful: ${successful}/${seedIds.length} seeds`);
  console.log(`❌ Failed: ${failed}/${seedIds.length} seeds`);
  console.log(`📦 Total LEGOs generated: ${totalLegos}`);
  console.log(`⏱️  Total duration: ${totalDuration}s (${Math.round(totalDuration / 60)}m ${totalDuration % 60}s)`);

  console.log(`\nResults:`);
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`  ${status} ${r.seedId} ${r.success ? `(${r.legos} LEGOs)` : '(failed)'}`);
  });

  console.log(`\n📁 Output directory: ${OUTPUT_DIR}`);
  console.log(`\n💡 Next step: Run conversational validator to verify quality:`);
  console.log(`   node validate_conversational_quality.cjs --all\n`);

  process.exit(failed > 0 ? 1 : 0);
}

// Run workflow
if (require.main === module) {
  main().catch(err => {
    console.error('\n❌ FATAL ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { generateSeedBasket, generateLegoBasket };
