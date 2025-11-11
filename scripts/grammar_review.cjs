#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

/**
 * Phase 5.5: Grammar Review (Seeds 1-100 Only)
 *
 * Removes grammatically incorrect phrases using AI-assisted review.
 * Only removes phrases with actual grammar errors - keeps unnatural but correct phrases.
 *
 * Usage:
 *   node scripts/grammar_review.cjs <course_path>
 *
 * Example:
 *   node scripts/grammar_review.cjs public/vfs/courses/spa_for_eng_s0001-0100
 */

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const REVIEW_PROMPT = `You are a grammar checker for language learning materials. Your ONLY job is to identify grammatically INCORRECT phrases.

Review these practice phrases for GRAMMATICAL CORRECTNESS ONLY.

For each phrase, check if it is grammatically correct in BOTH English and Spanish.

REMOVE ONLY if:
- Missing required words (e.g., "I want speak" missing "to")
- Wrong word order (e.g., "español hablar quiero")
- Agreement errors (gender/number/verb: "la palabras", "I is trying")
- Conjugation errors (e.g., "estoy intentar" should be "intentando")
- Structural errors (incomplete phrases, fragments)

DO NOT REMOVE for:
- Unnatural phrasing (if grammatically correct)
- Stylistic preferences
- Collocation awkwardness (if grammatically sound)
- Pedagogical simplicity (e.g., "say" instead of "speak" is fine)
- Formal/literal translations

Return a JSON array of indices (0-based) for phrases that are grammatically INCORRECT and should be removed.

If ALL phrases are grammatically correct, return an empty array: []

Example response format:
{
  "remove_indices": [2, 5, 8],
  "reasons": {
    "2": "Missing preposition 'to' in English",
    "5": "Verb conjugation error in Spanish",
    "8": "Incomplete phrase structure"
  }
}`;

/**
 * Review phrases using Claude API
 */
async function reviewPhrasesWithAI(phrases, legoId, seedId) {
  const phrasesText = phrases.map((p, idx) =>
    `${idx}. [English] ${p[0]} | [Spanish] ${p[1]}`
  ).join('\n');

  const fullPrompt = `${REVIEW_PROMPT}

Seed: ${seedId}
LEGO: ${legoId}

Phrases to review:
${phrasesText}

Return JSON only.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0,
      messages: [{
        role: 'user',
        content: fullPrompt
      }]
    });

    const responseText = message.content[0].text;

    // Extract JSON from response (handle code blocks)
    let jsonText = responseText;
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) ||
                      responseText.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const result = JSON.parse(jsonText);
    return result;

  } catch (error) {
    console.error(`   ⚠️  AI review failed for ${legoId}: ${error.message}`);
    // On error, assume all phrases are correct (conservative approach)
    return { remove_indices: [], reasons: {} };
  }
}

/**
 * Review grammar for a single basket
 */
async function reviewBasket(basketPath) {
  const basket = JSON.parse(fs.readFileSync(basketPath, 'utf8'));
  const seedId = basket.seed_id;

  console.log(`\n📦 Reviewing ${seedId}...`);

  let totalOriginal = 0;
  let totalRemoved = 0;
  let modified = false;
  const reviewLog = {};

  for (const [legoId, legoData] of Object.entries(basket.legos)) {
    const originalCount = legoData.practice_phrases.length;
    totalOriginal += originalCount;

    console.log(`   🔍 ${legoId}: Reviewing ${originalCount} phrases...`);

    // Review with AI
    const reviewResult = await reviewPhrasesWithAI(
      legoData.practice_phrases,
      legoId,
      seedId
    );

    const removeIndices = new Set(reviewResult.remove_indices || []);

    if (removeIndices.size === 0) {
      console.log(`   ✅ ${legoId}: All phrases grammatically correct`);
      continue;
    }

    // Remove flagged phrases
    const validPhrases = legoData.practice_phrases.filter((phrase, idx) => {
      if (removeIndices.has(idx)) {
        const reason = reviewResult.reasons?.[idx] || 'Grammatical error';
        console.log(`   ❌ Removing: "${phrase[0]}" / "${phrase[1]}"`);
        console.log(`      → ${reason}`);
        return false;
      }
      return true;
    });

    const removedCount = originalCount - validPhrases.length;
    if (removedCount > 0) {
      modified = true;
      totalRemoved += removedCount;

      // Update practice_phrases
      legoData.practice_phrases = validPhrases;

      // Recalculate distribution
      const distribution = {
        really_short_1_2: 0,
        quite_short_3: 0,
        longer_4_5: 0,
        long_6_plus: 0,
      };

      validPhrases.forEach(p => {
        const count = p[3];
        if (count <= 2) distribution.really_short_1_2++;
        else if (count === 3) distribution.quite_short_3++;
        else if (count <= 5) distribution.longer_4_5++;
        else distribution.long_6_plus++;
      });

      legoData.phrase_distribution = distribution;

      // Add review metadata
      legoData._grammar_review = {
        phrases_removed: removedCount,
        removal_reasons: Object.values(reviewResult.reasons || {})
      };

      reviewLog[legoId] = {
        removed: removedCount,
        reasons: reviewResult.reasons || {}
      };

      console.log(`   ✅ ${legoId}: ${originalCount} → ${validPhrases.length} phrases (removed ${removedCount})`);
    }
  }

  // Write updated basket if modified
  if (modified) {
    basket.generation_stage = 'GRAMMAR_REVIEWED';
    basket._grammar_review_summary = {
      total_phrases_original: totalOriginal,
      total_phrases_removed: totalRemoved,
      total_phrases_remaining: totalOriginal - totalRemoved,
      legos_affected: Object.keys(reviewLog)
    };

    fs.writeFileSync(basketPath, JSON.stringify(basket, null, 2));

    console.log(`\n   📊 ${seedId} Summary:`);
    console.log(`      Original: ${totalOriginal} phrases`);
    console.log(`      Removed: ${totalRemoved} phrases (${Math.round(totalRemoved/totalOriginal*100)}%)`);
    console.log(`      Remaining: ${totalOriginal - totalRemoved} phrases`);
  } else {
    console.log(`   ✅ No grammar errors found`);
  }

  return {
    seedId,
    original: totalOriginal,
    removed: totalRemoved,
    modified,
  };
}

/**
 * Main function
 */
async function main() {
  const coursePath = process.argv[2];

  if (!coursePath) {
    console.error('Usage: node grammar_review.cjs <course_path>');
    console.error('Example: node grammar_review.cjs public/vfs/courses/spa_for_eng_s0001-0100');
    process.exit(1);
  }

  const outputDir = path.join(coursePath, 'phase5_outputs');

  if (!fs.existsSync(outputDir)) {
    console.error(`Error: Directory not found: ${outputDir}`);
    process.exit(1);
  }

  console.log('🔍 Phase 5.5: Grammar Review (Seeds 1-100 Only)\n');
  console.log(`Course: ${coursePath}`);

  const basketFiles = fs.readdirSync(outputDir)
    .filter(f => f.startsWith('seed_s') && f.endsWith('.json'))
    .map(f => path.join(outputDir, f))
    .sort();

  console.log(`\nFound ${basketFiles.length} baskets to review\n`);

  if (basketFiles.length === 0) {
    console.log('⚠️  No baskets found. Run Phase 5 first.');
    process.exit(0);
  }

  const results = [];

  for (const basketPath of basketFiles) {
    try {
      const result = await reviewBasket(basketPath);
      results.push(result);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`\n❌ Error processing ${basketPath}: ${error.message}`);
    }
  }

  // Overall summary
  console.log('\n\n📊 OVERALL SUMMARY\n');
  console.log('='.repeat(60));

  const totals = results.reduce((acc, r) => ({
    original: acc.original + r.original,
    removed: acc.removed + r.removed,
  }), { original: 0, removed: 0 });

  const modifiedSeeds = results.filter(r => r.modified);

  console.log(`Total phrases original: ${totals.original}`);
  console.log(`Total phrases removed:  ${totals.removed}`);
  console.log(`Total phrases kept:     ${totals.original - totals.removed}`);
  console.log(`Removal rate:           ${Math.round((totals.removed / totals.original) * 100)}%`);
  console.log(`\nSeeds modified: ${modifiedSeeds.length} of ${results.length}`);

  if (modifiedSeeds.length > 0) {
    console.log('\nModified seeds:');
    modifiedSeeds.forEach(r => {
      console.log(`   ${r.seedId}: removed ${r.removed} phrase(s)`);
    });
  }

  console.log('\n✅ Grammar review complete!');
  console.log('\n💡 Next step: Spot check removed phrases in basket files (_grammar_review metadata)');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
