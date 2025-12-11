#!/usr/bin/env node
/**
 * Model Comparison Test for Phase 3 Basket Generation
 *
 * Tests Haiku vs Sonnet vs Opus on basket generation tasks
 * to find optimal model-to-difficulty mapping.
 *
 * Usage:
 *   node model-comparison-test.cjs <courseDir> [--legos S0001L01,S0005L02,...]
 *
 * Requires: ANTHROPIC_API_KEY environment variable
 */

const fs = require('fs-extra');
const path = require('path');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const MODELS = {
  haiku: 'claude-3-5-haiku-20241022',
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-20250514'
};

// Approximate pricing per 1M tokens (input/output)
const PRICING = {
  haiku: { input: 0.25, output: 1.25 },
  sonnet: { input: 3, output: 15 },
  opus: { input: 15, output: 75 }
};

async function callClaude(model, prompt, maxTokens = 2000) {
  const startTime = Date.now();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODELS[model],
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  const elapsed = Date.now() - startTime;

  if (data.error) {
    throw new Error(data.error.message);
  }

  return {
    content: data.content[0].text,
    inputTokens: data.usage.input_tokens,
    outputTokens: data.usage.output_tokens,
    elapsed,
    model
  };
}

function buildPrompt(scaffold) {
  return `You are generating practice phrases for language learning.

LEGO to practice: "${scaffold.lego.known}" → "${scaffold.lego.target}"
Type: ${scaffold.type}

AVAILABLE VOCABULARY (you can ONLY use these words):
Target language: ${scaffold.available_vocab.target.join(', ')}
Known language: ${scaffold.available_vocab.known.join(', ')}

REQUIREMENTS:
1. Generate exactly 10 practice phrases
2. Every phrase MUST contain the complete LEGO "${scaffold.lego.target}"
3. All words must be from the available vocabulary lists above
4. Distribution: 2 short, 2 medium, 2 longer, 4 longest phrases
5. Natural grammar in both languages

OUTPUT FORMAT (JSON only, no explanation):
{
  "phrases": [
    {"known": "...", "target": "..."},
    ...10 phrases
  ]
}`;
}

function validateResponse(response, scaffold) {
  const errors = [];

  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { valid: false, errors: ['No JSON found in response'], phrases: [] };
    }

    const data = JSON.parse(jsonMatch[0]);
    const phrases = data.phrases || [];

    if (phrases.length < 10) {
      errors.push(`Only ${phrases.length} phrases (expected 10)`);
    }

    const targetVocab = new Set(scaffold.available_vocab.target.map(w => w.toLowerCase()));
    const legoTarget = scaffold.lego.target.toLowerCase();

    let gateViolations = 0;
    let missingLego = 0;

    for (let i = 0; i < phrases.length; i++) {
      const phrase = phrases[i];

      // Check LEGO presence
      if (!phrase.target?.toLowerCase().includes(legoTarget)) {
        missingLego++;
      }

      // Check GATE compliance
      const words = phrase.target?.toLowerCase().match(/[\wáéíóúüñ]+/g) || [];
      for (const word of words) {
        if (!targetVocab.has(word)) {
          gateViolations++;
          break; // Count once per phrase
        }
      }
    }

    if (gateViolations > 0) errors.push(`${gateViolations} GATE violations`);
    if (missingLego > 0) errors.push(`${missingLego} missing LEGO`);

    return {
      valid: errors.length === 0,
      errors,
      phrases,
      stats: { gateViolations, missingLego, phraseCount: phrases.length }
    };

  } catch (e) {
    return { valid: false, errors: [`Parse error: ${e.message}`], phrases: [] };
  }
}

async function testLego(scaffold, models = ['haiku', 'sonnet']) {
  const prompt = buildPrompt(scaffold);
  const results = {};

  console.log(`\n  Testing ${scaffold.lego_id}...`);
  console.log(`    LEGO: "${scaffold.lego.known}" → "${scaffold.lego.target}"`);
  console.log(`    Vocab size: ${scaffold.available_vocab.target.length} target words`);

  for (const model of models) {
    try {
      console.log(`    ${model}...`);
      const response = await callClaude(model, prompt);
      const validation = validateResponse(response.content, scaffold);

      const cost = (
        (response.inputTokens / 1000000) * PRICING[model].input +
        (response.outputTokens / 1000000) * PRICING[model].output
      );

      results[model] = {
        success: validation.valid,
        errors: validation.errors,
        stats: validation.stats,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        elapsed: response.elapsed,
        cost: cost.toFixed(6)
      };

      const status = validation.valid ? '✅' : '❌';
      console.log(`      ${status} ${response.elapsed}ms, $${cost.toFixed(6)}, ${validation.errors.join(', ') || 'OK'}`);

    } catch (e) {
      results[model] = { success: false, error: e.message };
      console.log(`      ❌ Error: ${e.message}`);
    }
  }

  return results;
}

async function runComparison(courseDir, legoIds = null) {
  // Load scaffolds
  const scaffoldsDir = path.join(courseDir, 'phase3_scaffolds');
  const indexPath = path.join(scaffoldsDir, 'index.json');

  if (!await fs.pathExists(indexPath)) {
    console.error('❌ No scaffolds found. Run generate-all-scaffolds.cjs first.');
    process.exit(1);
  }

  const index = await fs.readJson(indexPath);

  // Select LEGOs to test
  let testLegos = [];

  if (legoIds) {
    // Specific LEGOs requested
    for (const legoId of legoIds) {
      const seedId = legoId.substring(0, 5);
      const seedPath = path.join(scaffoldsDir, `${seedId}.json`);
      if (await fs.pathExists(seedPath)) {
        const seedData = await fs.readJson(seedPath);
        if (seedData.legos[legoId]) {
          testLegos.push(seedData.legos[legoId]);
        }
      }
    }
  } else {
    // Sample: 1 easy, 1 medium, 1 hard from different parts of course
    const samples = ['S0001L01', 'S0005L02', 'S0010L01']; // Early, mid, later
    for (const legoId of samples) {
      const seedId = legoId.substring(0, 5);
      const seedPath = path.join(scaffoldsDir, `${seedId}.json`);
      if (await fs.pathExists(seedPath)) {
        const seedData = await fs.readJson(seedPath);
        if (seedData.legos[legoId]) {
          testLegos.push(seedData.legos[legoId]);
        }
      }
    }
  }

  if (testLegos.length === 0) {
    console.error('❌ No test LEGOs found');
    process.exit(1);
  }

  console.log(`\n🧪 MODEL COMPARISON TEST`);
  console.log(`   Course: ${index.course}`);
  console.log(`   Testing: ${testLegos.length} LEGOs`);
  console.log(`   Models: Haiku, Sonnet`);

  const allResults = [];

  for (const scaffold of testLegos) {
    const result = await testLego(scaffold, ['haiku', 'sonnet']);
    allResults.push({ legoId: scaffold.lego_id, vocabSize: scaffold.available_vocab.target.length, ...result });
  }

  // Summary
  console.log(`\n\n📊 SUMMARY`);
  console.log('─'.repeat(70));
  console.log('LEGO ID     | Vocab | Haiku          | Sonnet');
  console.log('─'.repeat(70));

  let haikuWins = 0, sonnetWins = 0, ties = 0;
  let haikuCost = 0, sonnetCost = 0;

  for (const r of allResults) {
    const haikuOk = r.haiku?.success ? '✅' : '❌';
    const sonnetOk = r.sonnet?.success ? '✅' : '❌';

    const haikuTime = r.haiku?.elapsed ? `${r.haiku.elapsed}ms` : 'N/A';
    const sonnetTime = r.sonnet?.elapsed ? `${r.sonnet.elapsed}ms` : 'N/A';

    console.log(`${r.legoId.padEnd(11)} | ${String(r.vocabSize).padEnd(5)} | ${haikuOk} ${haikuTime.padEnd(8)} | ${sonnetOk} ${sonnetTime}`);

    if (r.haiku?.success && r.sonnet?.success) ties++;
    else if (r.haiku?.success) haikuWins++;
    else if (r.sonnet?.success) sonnetWins++;

    haikuCost += parseFloat(r.haiku?.cost || 0);
    sonnetCost += parseFloat(r.sonnet?.cost || 0);
  }

  console.log('─'.repeat(70));
  console.log(`\nWINS: Haiku ${haikuWins}, Sonnet ${sonnetWins}, Both ${ties}`);
  console.log(`COST: Haiku $${haikuCost.toFixed(6)}, Sonnet $${sonnetCost.toFixed(6)}`);
  console.log(`\nRECOMMENDATION:`);

  if (haikuWins + ties >= sonnetWins) {
    console.log(`  Use HAIKU for LEGOs with vocab > 30 words (${Math.round((1 - haikuCost/sonnetCost) * 100)}% cost savings)`);
  }
  console.log(`  Use SONNET for early seeds (limited vocab) and complex LEGOs`);

  // Save results
  const resultsPath = path.join(courseDir, 'model_comparison_results.json');
  await fs.writeJson(resultsPath, {
    timestamp: new Date().toISOString(),
    course: index.course,
    results: allResults,
    summary: { haikuWins, sonnetWins, ties, haikuCost, sonnetCost }
  }, { spaces: 2 });

  console.log(`\n💾 Results saved to: ${resultsPath}`);
}

// CLI
const args = process.argv.slice(2);
const courseDir = args[0];

if (!courseDir) {
  console.log('Usage: node model-comparison-test.cjs <courseDir> [--legos S0001L01,S0005L02,...]');
  console.log('');
  console.log('Requires: ANTHROPIC_API_KEY environment variable');
  process.exit(1);
}

if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not set');
  process.exit(1);
}

let legoIds = null;
const legosIdx = args.indexOf('--legos');
if (legosIdx >= 0 && args[legosIdx + 1]) {
  legoIds = args[legosIdx + 1].split(',');
}

runComparison(path.resolve(courseDir), legoIds);
