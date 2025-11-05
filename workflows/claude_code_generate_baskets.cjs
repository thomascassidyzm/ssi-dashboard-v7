#!/usr/bin/env node
/**
 * Conversational Basket Generation - Claude Code Orchestrator
 *
 * Runs INSIDE Claude Code session:
 * 1. You run this script
 * 2. Script spawns Task agents (Claude Code sub-agents) for phrase generation
 * 3. Agents do creative work using phase intelligence
 * 4. Main script validates automatically
 * 5. Retries with feedback if needed
 * 6. Saves final baskets
 *
 * ALL LLM calls happen within Claude Code - no external API needed!
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
 * Build agent task file for Claude Code to process
 */
function buildAgentTaskFile(lego, state, isLastInSeed, seedPair, attempt, feedback) {
  const { vocab, patterns } = state;

  const taskContent = `${phasePrompt}

## Current LEGO

**ID**: ${lego.id}
**Known** (English): "${lego.lego[0]}"
**Target** (Spanish): "${lego.lego[1]}"
**Type**: ${lego.type}
${isLastInSeed ? `\n**THIS IS THE FINAL LEGO** - You MUST include the full seed sentence as one of your phrases:\n**Seed**: "${seedPair.known}" → "${seedPair.target}"\n` : ''}

## Available Resources

**Previously Taught LEGOs** (${vocab.length} total):
${vocab.slice(-30).map(v => `- ${v.known} → ${v.target}`).join('\n')}
${vocab.length > 30 ? `\n... and ${vocab.length - 30} more LEGOs available` : ''}

**Available Patterns**: ${patterns.join(', ')}

${feedback ? `\n## RETRY FEEDBACK (Previous Attempt Failed)\n\n${feedback}\n\n**PLEASE ADDRESS THESE ISSUES IN THIS ATTEMPT!**\n` : ''}

## Your Task

Generate 15 phrases now and return ONLY the JSON array in this format:

\`\`\`json
[
  ["known phrase", "target phrase", "pattern_code_or_null", lego_count],
  ["I want to speak", "Quiero hablar", "P01", 2],
  ...
]
\`\`\`

Write the JSON array to: \`${OUTPUT_DIR}/temp_${lego.id}_attempt${attempt}.json\`

Use the Write tool to save the JSON array.
`;

  return taskContent;
}

/**
 * Spawn Claude Code agent using Task tool
 */
function spawnClaudeCodeAgent(lego, state, isLastInSeed, seedPair, attempt, feedback) {
  console.log(`\n[${ attempt > 1 ? `RETRY ${attempt}` : 'ATTEMPT 1'}] Spawning Claude Code agent for ${lego.id}...`);

  const taskContent = buildAgentTaskFile(lego, state, isLastInSeed, seedPair, attempt, feedback);
  const taskFile = path.join(OUTPUT_DIR, `task_${lego.id}_attempt${attempt}.md`);

  // Write task file
  fs.writeFileSync(taskFile, taskContent, 'utf8');

  console.log(`  📝 Task written to: ${taskFile}`);
  console.log(`  ⏳ Waiting for agent to complete...`);
  console.log(`\n  AGENT TASK:`);
  console.log(`  Generate 15 conversational Spanish phrases for "${lego.lego[0]}" → "${lego.lego[1]}"`);
  console.log(`  Requirements: 5+ phrases with 5+ LEGOs, 40%+ conjunctions, GATE compliant`);
  console.log(`  Output: ${OUTPUT_DIR}/temp_${lego.id}_attempt${attempt}.json`);

  return {
    taskFile,
    outputFile: path.join(OUTPUT_DIR, `temp_${lego.id}_attempt${attempt}.json`)
  };
}

/**
 * Wait for agent to complete and read results
 */
function waitForAgentCompletion(agentInfo, lego, timeoutSeconds = 300) {
  const { outputFile } = agentInfo;
  const startTime = Date.now();

  console.log(`\n  ⏳ Waiting for agent output at: ${outputFile}`);
  console.log(`     Timeout: ${timeoutSeconds}s`);
  console.log(`\n     👉 PLEASE PROCESS THE TASK FILE IN CLAUDE CODE 👈`);
  console.log(`        Then this script will automatically continue...\n`);

  // Poll for output file
  while (true) {
    if (fs.existsSync(outputFile)) {
      console.log(`  ✅ Agent completed! Reading results...`);

      try {
        const content = fs.readFileSync(outputFile, 'utf8');
        const phrases = JSON.parse(content);

        console.log(`  📊 Agent returned ${phrases.length} phrases`);

        return {
          success: true,
          phrases: phrases
        };
      } catch (error) {
        console.log(`  ❌ Failed to parse agent output: ${error.message}`);
        return {
          success: false,
          phrases: [],
          error: error.message
        };
      }
    }

    // Check timeout
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    if (elapsed > timeoutSeconds) {
      console.log(`  ❌ Timeout after ${timeoutSeconds}s`);
      return {
        success: false,
        phrases: [],
        error: 'Timeout waiting for agent'
      };
    }

    // Wait 2 seconds before checking again
    execSync('sleep 2');
    process.stdout.write('.');
  }
}

/**
 * Validate generated phrases
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
 * Generate retry feedback
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
 * Generate basket for a single LEGO (with retries)
 */
function generateLegoBasket(lego, state, isLastInSeed, seedPair, maxRetries = 3) {
  let attempt = 1;
  let feedback = null;

  while (attempt <= maxRetries) {
    // Spawn Claude Code agent
    const agentInfo = spawnClaudeCodeAgent(lego, state, isLastInSeed, seedPair, attempt, feedback);

    // Wait for completion
    const agentResult = waitForAgentCompletion(agentInfo, lego);

    if (!agentResult.success) {
      console.log(`  ⚠️  Agent failed: ${agentResult.error}`);
      attempt++;
      continue;
    }

    // Validate phrases
    const validation = validatePhrases(agentResult.phrases, lego.id);

    if (validation.pass) {
      console.log(`  ✅ SUCCESS! Basket meets all requirements.`);

      // Cleanup temp files
      fs.unlinkSync(agentInfo.taskFile);
      fs.unlinkSync(agentInfo.outputFile);

      return {
        lego: lego.lego,
        type: lego.type,
        available_legos: state.vocab.length,
        available_patterns: state.patterns,
        practice_phrases: agentResult.phrases,
        validation_score: {
          conversational: validation.conversational_score,
          conjunctions: validation.conjunction_score
        },
        attempt: attempt,
        generated_at: new Date().toISOString()
      };
    }

    // Generate feedback for retry
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
 * Generate complete basket for a seed
 */
function generateSeedBasket(seedId) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`GENERATING CONVERSATIONAL BASKET: ${seedId}`);
  console.log(`Using Claude Code agents (this session)`);
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
    version: 'generative_v5_conversational_claude_code',
    seed: seedId,
    course_direction: 'Spanish for English speakers',
    mapping: 'KNOWN (English) → TARGET (Spanish)',
    seed_pair: seed.seed_pair,
    patterns_introduced: seed.patterns_introduced.join(', '),
    cumulative_patterns: seed.patterns_used,
    cumulative_legos: seed.cumulative_legos,
    note: 'Generated with Claude Code agents + automated validation: 5+ phrases with 5+ LEGOs, 40%+ conjunction usage',
    generation_metadata: {
      generated_at: new Date().toISOString(),
      generated_by: 'Claude Code Web',
      max_retries: 3,
      requirements: {
        min_conversational_phrases: 5,
        min_conjunction_percentage: 40
      }
    }
  };

  const startTime = Date.now();

  // Generate basket for each LEGO
  for (let i = 0; i < seed.legos.length; i++) {
    const lego = seed.legos[i];
    const isLast = i === seed.legos.length - 1;
    const state = buildVocabularyState(lego.id);

    const legoBasket = generateLegoBasket(lego, state, isLast, seed.seed_pair);

    if (!legoBasket) {
      console.error(`\n❌ Failed to generate basket for ${lego.id} after retries`);
      return null;
    }

    basket[lego.id] = legoBasket;
  }

  const duration = Math.round((Date.now() - startTime) / 1000);

  // Save basket
  const outputPath = path.join(OUTPUT_DIR, `lego_baskets_${seedId.toLowerCase()}_conversational.json`);
  fs.writeFileSync(outputPath, JSON.stringify(basket, null, 2), 'utf8');

  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ BASKET GENERATED SUCCESSFULLY`);
  console.log(`   Output: ${outputPath}`);
  console.log(`   Duration: ${duration}s (${Math.round(duration / 60)}m ${duration % 60}s)`);
  console.log(`   LEGOs: ${seed.legos.length}`);
  console.log('='.repeat(70));

  return basket;
}

/**
 * Main entry point
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Conversational Basket Generation - Claude Code Orchestrator  ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    console.log('Runs INSIDE Claude Code session - all LLM work happens here!\n');
    console.log('Usage:');
    console.log('  node workflows/claude_code_generate_baskets.cjs S0005\n');
    console.log('How it works:');
    console.log('  1. Script creates task files for each LEGO');
    console.log('  2. You process tasks in Claude Code (generates phrases)');
    console.log('  3. Script automatically validates results');
    console.log('  4. Retries with feedback if needed');
    console.log('  5. Saves final baskets\n');
    console.log('Requirements enforced:');
    console.log('  ✓ At least 5 phrases with 5+ LEGOs (conversational)');
    console.log('  ✓ 40%+ conjunction usage (pero, y, porque, si)');
    console.log('  ✓ GATE compliance (only taught vocabulary)');
    console.log('  ✓ Pattern variety\n');
    process.exit(1);
  }

  // Parse seed ID
  const seedId = args[0];

  console.log(`\n🚀 Starting conversational basket generation`);
  console.log(`   Seed: ${seedId}`);
  console.log(`   Method: Claude Code agents (this session)\n`);

  const result = generateSeedBasket(seedId);

  if (!result) {
    console.log(`\n❌ Generation failed`);
    process.exit(1);
  }

  console.log(`\n💡 Next step: Validate quality:`);
  console.log(`   node validate_conversational_quality.cjs ${seedId}\n`);

  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateSeedBasket, generateLegoBasket };
