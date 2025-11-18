#!/usr/bin/env node

/**
 * Phase 5 Grammar Review v2 - Agent-Friendly Quality Check
 *
 * Checks if practice phrases sound natural and grammatical in BOTH languages.
 *
 * Complexity-Aware Standards:
 * - Short phrases (1-2 LEGOs): Fragments OK, basic grammar
 * - Medium phrases (3 LEGOs): Should form coherent thoughts
 * - Longer phrases (4 LEGOs): Need proper sentence structure
 * - Longest phrases (5 LEGOs): Must be fully grammatical in both languages
 *
 * Can be run three ways:
 * 1. Agent mode: Review single LEGO before committing → Pass/Fail
 * 2. Seed mode: Review one seed's all LEGOs
 * 3. Batch mode: Sample review across multiple seeds
 *
 * Usage:
 *   Agent: node scripts/phase5_grammar_review_v2.cjs <course_code> <seed_id> <lego_id>
 *   Seed:  node scripts/phase5_grammar_review_v2.cjs <course_code> <seed_id>
 *   Batch: node scripts/phase5_grammar_review_v2.cjs <course_code>
 *
 * Examples:
 *   node scripts/phase5_grammar_review_v2.cjs cmn_for_eng S0045 S0045L03
 *   node scripts/phase5_grammar_review_v2.cjs cmn_for_eng S0045
 *   node scripts/phase5_grammar_review_v2.cjs cmn_for_eng
 *
 * Requires: ANTHROPIC_API_KEY environment variable
 *
 * AGENT WORKFLOW INTEGRATION:
 * After generating baskets for a LEGO, agent should run:
 *   node scripts/phase5_grammar_review_v2.cjs cmn_for_eng S0045 S0045L03
 * If exit code = 0 → Proceed to commit
 * If exit code = 1 → Review and regenerate
 */

const fs = require('fs');
const path = require('path');

// Check for API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ Error: ANTHROPIC_API_KEY environment variable not set\n');
  console.error('This script requires Claude API access for grammar review.');
  console.error('Set it with: export ANTHROPIC_API_KEY="your-key-here"\n');
  process.exit(1);
}

// Parse arguments
const courseCode = process.argv[2];
const seedId = process.argv[3];
const legoId = process.argv[4];

if (!courseCode) {
  console.error('Usage: node phase5_grammar_review_v2.cjs <course_code> [seed_id] [lego_id]\n');
  console.error('Modes:');
  console.error('  Agent: <course_code> <seed_id> <lego_id>  # Review before commit');
  console.error('  Seed:  <course_code> <seed_id>            # Review whole seed');
  console.error('  Batch: <course_code>                      # Sample review\n');
  process.exit(1);
}

const coursePath = path.join(__dirname, '..', 'public', 'vfs', 'courses', courseCode);
const phase5OutputsDir = path.join(coursePath, 'phase5_outputs');

const mode = legoId ? 'agent' : (seedId ? 'seed' : 'batch');

console.log('📝 Grammar Review v2 - Natural Language Quality Check');
console.log('═'.repeat(60));
console.log(`Mode: ${mode.toUpperCase()}`);
console.log(`Course: ${courseCode}`);
if (seedId) console.log(`Seed: ${seedId}`);
if (legoId) console.log(`LEGO: ${legoId}`);
console.log();

// ============================================================================
// COLLECT PHRASES
// ============================================================================

const phrasesToReview = [];

function collectFromLego(sId, lId, legoData) {
  if (!legoData.practice_phrases) return;

  legoData.practice_phrases.forEach((phrase, idx) => {
    phrasesToReview.push({
      seed: sId,
      lego: lId,
      index: idx + 1,
      known: phrase[0],
      target: phrase[1],
      complexity: phrase[3] || 1
    });
  });
}

if (mode === 'agent') {
  // Review single LEGO
  const seedNum = seedId.substring(1);
  const basketPath = path.join(phase5OutputsDir, `seed_S${seedNum}_baskets.json`);

  if (!fs.existsSync(basketPath)) {
    console.error(`❌ Basket file not found: ${basketPath}`);
    process.exit(1);
  }

  const basketData = JSON.parse(fs.readFileSync(basketPath, 'utf8'));
  if (!basketData[legoId]) {
    console.error(`❌ LEGO ${legoId} not found in basket`);
    process.exit(1);
  }

  collectFromLego(seedId, legoId, basketData[legoId]);

} else if (mode === 'seed') {
  // Review whole seed
  const seedNum = seedId.substring(1);
  const basketPath = path.join(phase5OutputsDir, `seed_S${seedNum}_baskets.json`);

  if (!fs.existsSync(basketPath)) {
    console.error(`❌ Basket file not found: ${basketPath}`);
    process.exit(1);
  }

  const basketData = JSON.parse(fs.readFileSync(basketPath, 'utf8'));
  Object.entries(basketData).forEach(([lId, legoData]) => {
    collectFromLego(seedId, lId, legoData);
  });

} else {
  // Batch: Sample from random seeds
  const basketFiles = fs.readdirSync(phase5OutputsDir)
    .filter(f => f.match(/^seed_S\d{4}_baskets\.json$/))
    .sort();

  const sampleSize = Math.min(5, basketFiles.length);
  const sampledIndices = new Set();

  while (sampledIndices.size < sampleSize) {
    sampledIndices.add(Math.floor(Math.random() * basketFiles.length));
  }

  Array.from(sampledIndices).forEach(idx => {
    const filename = basketFiles[idx];
    const basketPath = path.join(phase5OutputsDir, filename);
    const basketData = JSON.parse(fs.readFileSync(basketPath, 'utf8'));
    const seedMatch = filename.match(/seed_S(\d{4})_baskets\.json/);
    const sId = `S${seedMatch[1]}`;

    // Sample 2 phrases per LEGO for efficiency
    Object.entries(basketData).forEach(([lId, legoData]) => {
      if (legoData.practice_phrases) {
        legoData.practice_phrases.slice(0, 2).forEach((phrase, idx) => {
          phrasesToReview.push({
            seed: sId,
            lego: lId,
            index: idx + 1,
            known: phrase[0],
            target: phrase[1],
            complexity: phrase[3] || 1
          });
        });
      }
    });
  });

  console.log(`Sampled ${sampledIndices.size} seeds for review`);
}

console.log(`Collected ${phrasesToReview.length} phrases`);
console.log();

if (phrasesToReview.length === 0) {
  console.log('✅ No phrases to review');
  process.exit(0);
}

// ============================================================================
// CALL CLAUDE FOR REVIEW
// ============================================================================

const reviewPrompt = `You are a bilingual language quality expert (English/Chinese). Review these practice phrases for naturalness and grammar.

STANDARDS BY COMPLEXITY:
- 1-2 LEGOs: Fragments OK (e.g., "now", "with you")
- 3 LEGOs: Should make sense (e.g., "I want now")
- 4-5 LEGOs: Must be fully grammatical and natural in BOTH languages

Flag ONLY clear problems:
• Unnatural Chinese (sounds wrong to natives)
• Unnatural English (sounds wrong to natives)
• Grammar errors in longer phrases (4-5 LEGOs)

PHRASES:
${phrasesToReview.map((p, i) =>
  `${i + 1}. [${p.complexity} LEGOs] ${p.seed} ${p.lego}
   EN: "${p.known}"
   中文: "${p.target}"`
).join('\n\n')}

Return JSON only:
{
  "issues": [
    {
      "phrase_number": 1,
      "problem": "Brief description",
      "severity": "minor|moderate|major",
      "suggestion": "How to fix"
    }
  ],
  "summary": {
    "total": ${phrasesToReview.length},
    "issues": 0,
    "quality": "excellent|good|needs_work"
  }
}`;

async function callClaude() {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{ role: 'user', content: reviewPrompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${await response.text()}`);
  }

  return (await response.json()).content[0].text;
}

console.log('🤖 Requesting Claude review...\n');

callClaude()
  .then(text => {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const review = JSON.parse(jsonMatch[0]);

    console.log('═'.repeat(60));
    console.log('RESULTS');
    console.log('═'.repeat(60));
    console.log();
    console.log(`Quality: ${review.summary.quality.toUpperCase()}`);
    console.log(`Issues: ${review.summary.issues} / ${review.summary.total}`);
    console.log();

    if (review.issues && review.issues.length > 0) {
      console.log('Issues found:\n');
      review.issues.forEach(issue => {
        const phrase = phrasesToReview[issue.phrase_number - 1];
        console.log(`${issue.phrase_number}. ${phrase.seed} ${phrase.lego} [${issue.severity}]`);
        console.log(`   EN: "${phrase.known}"`);
        console.log(`   中文: "${phrase.target}"`);
        console.log(`   ❌ ${issue.problem}`);
        if (issue.suggestion) console.log(`   ✅ ${issue.suggestion}`);
        console.log();
      });

      const majorIssues = review.issues.filter(i => i.severity === 'major').length;

      if (mode === 'agent') {
        if (majorIssues > 0) {
          console.log(`❌ ${majorIssues} MAJOR issues - regenerate this LEGO\n`);
          process.exit(1);
        } else {
          console.log(`⚠️  ${review.issues.length} minor/moderate issues - review suggested\n`);
          process.exit(0); // Allow commit with minor issues
        }
      } else {
        console.log(`Found ${review.issues.length} issues (${majorIssues} major)\n`);
        process.exit(majorIssues > 0 ? 1 : 0);
      }
    } else {
      console.log('✅ All phrases sound natural - excellent quality!\n');
      process.exit(0);
    }
  })
  .catch(err => {
    console.error('❌ Review failed:', err.message);
    process.exit(1);
  });
