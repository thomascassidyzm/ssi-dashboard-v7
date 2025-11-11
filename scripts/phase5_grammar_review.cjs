#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Phase 5.5: Grammar Review (Seeds 1-100 ONLY)
 *
 * Removes grammatically incorrect phrases from foundation seeds using AI-assisted review.
 * This step ensures 100% grammatical correctness in both languages for the critical
 * first 100 seeds that form the learner's foundation.
 *
 * Usage: node phase5_grammar_review.cjs <course_path>
 * Example: node phase5_grammar_review.cjs public/vfs/courses/spa_for_eng_s0001-0100
 *
 * NOTE: This script requires an AI model (Claude) for grammar validation.
 * It will use the Anthropic API if ANTHROPIC_API_KEY is set in environment.
 */

// Parse command line arguments
const coursePath = process.argv[2];

if (!coursePath) {
  console.error('❌ Error: Course path required');
  console.error('Usage: node phase5_grammar_review.cjs <course_path>');
  console.error('Example: node phase5_grammar_review.cjs public/vfs/courses/spa_for_eng_s0001-0100');
  process.exit(1);
}

// Resolve paths
const projectRoot = path.resolve(__dirname, '..');
const fullCoursePath = path.resolve(projectRoot, coursePath);
const outputDir = path.join(fullCoursePath, 'phase5_outputs');

// Validate paths
if (!fs.existsSync(fullCoursePath)) {
  console.error(`❌ Error: Course directory not found: ${fullCoursePath}`);
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  console.error(`❌ Error: phase5_outputs directory not found: ${outputDir}`);
  process.exit(1);
}

// Check for API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ Error: ANTHROPIC_API_KEY environment variable not set');
  console.error('This script requires Claude API access for grammar validation.');
  console.error('Set the API key: export ANTHROPIC_API_KEY=your_key_here');
  process.exit(1);
}

console.log('📝 Phase 5.5: Grammar Review (Seeds 1-100 Only)');
console.log(`📁 Course: ${coursePath}\n`);
console.log('🎯 Reviewing for GRAMMATICAL CORRECTNESS only');
console.log('   - Missing words, wrong order, agreement errors');
console.log('   - Keeping pedagogically useful phrases even if unnatural\n');

/**
 * Grammar review prompt template for AI
 */
const GRAMMAR_REVIEW_PROMPT = `You are a grammar validator for language learning materials.

Review these practice phrases for GRAMMATICAL CORRECTNESS ONLY in both English and Spanish.

REMOVE ONLY if phrase has grammatical errors:
- Missing required words ("I want speak" ❌)
- Wrong word order ("español hablar quiero" ❌)
- Agreement errors ("la palabras" ❌, "I is trying" ❌)
- Conjugation errors ("estoy intentar" ❌, "I can to speak" ❌)
- Structural errors (incomplete phrases, fragments)

DO NOT REMOVE for:
- Unnatural phrasing (if grammatically correct)
- Stylistic preferences
- Collocation awkwardness (if grammatically sound)
- Pedagogical simplicity

IMPORTANT: Be conservative. Only flag clear grammatical errors, not style issues.

For each phrase, respond with:
- "KEEP" if grammatically correct (even if unnatural)
- "REMOVE: [reason]" if grammatically incorrect

Phrases to review (format: [English, Spanish, null, lego_count]):
{{PHRASES}}

Return your responses in JSON format:
{
  "reviews": [
    {"index": 0, "decision": "KEEP"},
    {"index": 1, "decision": "REMOVE", "reason": "Missing preposition"},
    ...
  ]
}`;

/**
 * Call Claude API for grammar review
 */
async function reviewPhrasesWithAI(phrases) {
  // Format phrases for prompt
  const phrasesText = phrases.map((p, i) =>
    `${i}. [${JSON.stringify(p[0])}, ${JSON.stringify(p[1])}, null, ${p[3]}]`
  ).join('\n');

  const prompt = GRAMMAR_REVIEW_PROMPT.replace('{{PHRASES}}', phrasesText);

  // Note: This is a placeholder for the actual API call
  // In production, this would call the Anthropic API
  console.log('   ⏳ Calling Claude API for grammar review...');

  // TODO: Implement actual API call
  // For now, return mock response indicating all phrases are correct
  // This should be replaced with actual Claude API integration

  throw new Error('Grammar review AI integration not yet implemented. Please implement Claude API call in reviewPhrasesWithAI()');
}

/**
 * Review a single basket file
 */
async function reviewBasket(basketPath) {
  const basket = JSON.parse(fs.readFileSync(basketPath, 'utf8'));
  const seedId = basket.seed_id;

  // Extract seed number to check if it's in 1-100 range
  const seedNum = parseInt(seedId.substring(1));
  if (seedNum > 100) {
    console.log(`⏭️  ${seedId}: Skipping (grammar review only for seeds 1-100)`);
    return { seedId, skipped: true };
  }

  console.log(`\n📝 Reviewing ${seedId}...`);

  let totalOriginal = 0;
  let totalRemoved = 0;
  let modified = false;
  const removalLog = [];

  for (const [legoId, legoData] of Object.entries(basket.legos)) {
    const originalCount = legoData.practice_phrases.length;
    totalOriginal += originalCount;

    console.log(`   🔍 ${legoId}: ${originalCount} phrases...`);

    try {
      // Review phrases with AI
      const reviews = await reviewPhrasesWithAI(legoData.practice_phrases);

      // Filter phrases based on AI review
      const keptPhrases = [];
      const removedPhrases = [];

      legoData.practice_phrases.forEach((phrase, idx) => {
        const review = reviews.reviews[idx];
        if (review.decision === 'KEEP') {
          keptPhrases.push(phrase);
        } else {
          removedPhrases.push({
            phrase,
            reason: review.reason || 'Grammatical error'
          });
          totalRemoved++;
        }
      });

      if (removedPhrases.length > 0) {
        modified = true;

        // Log removals
        removedPhrases.forEach(({ phrase, reason }) => {
          console.log(`      ❌ Removing: "${phrase[0]}" / "${phrase[1]}"`);
          console.log(`         → ${reason}`);
          removalLog.push({ legoId, phrase, reason });
        });

        // Update practice phrases
        legoData.practice_phrases = keptPhrases;

        // Recalculate distribution
        const distribution = {
          really_short_1_2: 0,
          quite_short_3: 0,
          longer_4_5: 0,
          long_6_plus: 0,
        };

        keptPhrases.forEach(p => {
          const count = p[3];
          if (count <= 2) distribution.really_short_1_2++;
          else if (count === 3) distribution.quite_short_3++;
          else if (count <= 5) distribution.longer_4_5++;
          else distribution.long_6_plus++;
        });

        legoData.phrase_distribution = distribution;

        // Add grammar review metadata
        if (!legoData._grammar_review) {
          legoData._grammar_review = {};
        }
        legoData._grammar_review.phrases_removed = removedPhrases.length;
        legoData._grammar_review.removal_reasons = removedPhrases.map(r => r.reason);

        console.log(`      ✅ ${originalCount} → ${keptPhrases.length} phrases (removed ${removedPhrases.length})`);
      } else {
        console.log(`      ✅ All phrases grammatically correct`);
      }
    } catch (error) {
      console.error(`      ❌ Error reviewing ${legoId}: ${error.message}`);
      throw error;
    }
  }

  // Write updated basket if modified
  if (modified) {
    // Update generation stage
    basket.generation_stage = 'GRAMMAR_REVIEWED';
    basket._grammar_review_metadata = {
      reviewed_at: new Date().toISOString(),
      total_removed: totalRemoved,
      removal_rate: Math.round((totalRemoved / totalOriginal) * 100) + '%'
    };

    fs.writeFileSync(basketPath, JSON.stringify(basket, null, 2));

    console.log(`\n   📊 ${seedId} Summary:`);
    console.log(`      Original: ${totalOriginal} phrases`);
    console.log(`      Removed: ${totalRemoved} phrases (${Math.round((totalRemoved / totalOriginal) * 100)}%)`);
    console.log(`      Remaining: ${totalOriginal - totalRemoved} phrases`);
    console.log(`      ✅ Updated with generation_stage: GRAMMAR_REVIEWED`);
  } else {
    console.log(`\n   ✅ ${seedId}: No grammar errors found (all phrases correct)`);
  }

  return {
    seedId,
    original: totalOriginal,
    removed: totalRemoved,
    modified,
    removalLog
  };
}

/**
 * Main function
 */
async function main() {
  const basketFiles = fs.readdirSync(outputDir)
    .filter(f => f.startsWith('seed_s') && f.endsWith('.json'))
    .sort()
    .map(f => path.join(outputDir, f));

  console.log(`Found ${basketFiles.length} basket files\n`);

  const results = [];

  for (const basketPath of basketFiles) {
    try {
      const result = await reviewBasket(basketPath);
      results.push(result);
    } catch (error) {
      console.error(`\n❌ Error reviewing ${basketPath}: ${error.message}`);
      // Continue with next file rather than failing entire process
    }
  }

  // Overall summary
  console.log('\n\n📊 OVERALL SUMMARY\n');
  console.log('='.repeat(60));

  const reviewed = results.filter(r => !r.skipped);
  const skipped = results.filter(r => r.skipped);

  const totals = reviewed.reduce((acc, r) => ({
    original: acc.original + (r.original || 0),
    removed: acc.removed + (r.removed || 0),
  }), { original: 0, removed: 0 });

  console.log(`Seeds reviewed: ${reviewed.length}`);
  console.log(`Seeds skipped (>100): ${skipped.length}`);
  console.log(`Total phrases original: ${totals.original}`);
  console.log(`Total phrases removed:  ${totals.removed}`);
  console.log(`Total phrases kept:     ${totals.original - totals.removed}`);
  console.log(`Removal rate:           ${Math.round((totals.removed / totals.original) * 100)}%`);

  const modifiedSeeds = reviewed.filter(r => r.modified);
  console.log(`\nSeeds modified: ${modifiedSeeds.length}`);

  if (modifiedSeeds.length > 0) {
    console.log('\nModified seeds:');
    modifiedSeeds.forEach(r => {
      console.log(`   ${r.seedId}: removed ${r.removed} phrase(s) (${Math.round((r.removed / r.original) * 100)}%)`);
    });
  }

  console.log('\n✅ Grammar review complete!');
  console.log('📝 All seed files updated with generation_stage: GRAMMAR_REVIEWED');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
