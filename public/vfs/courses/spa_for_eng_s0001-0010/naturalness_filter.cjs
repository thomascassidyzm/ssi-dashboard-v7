const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });
const Anthropic = require('@anthropic-ai/sdk');

/**
 * Phase 5.5: Grammar Filter using Claude Haiku 4.5
 *
 * Filters practice phrases for grammatical correctness:
 * - Only filters phrases with 3+ words in Spanish (shorter phrases are fragments)
 * - Rejects UNGRAMMATICAL phrases only (lenient with elliptical learner phrases)
 * - Flags baskets with < 5 phrases remaining
 * - Checks both English and Spanish for grammar errors
 *
 * Usage: ANTHROPIC_API_KEY=xxx node naturalness_filter.cjs
 */

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Configuration
const MIN_WORDS_TO_FILTER = 3; // Only filter phrases with 3+ words (in Spanish)
const MIN_PHRASES_WARNING = 5; // Warn if basket has < 5 phrases after filtering
const BATCH_SIZE = 50; // Process 50 phrases per API call

console.log('🔍 Phase 5.5: Grammar Filter using Claude Haiku 4.5\n');

/**
 * Rate a batch of phrases for naturalness
 */
async function ratePhrasesBatch(phrases) {
  // Build prompt with all phrases
  const phraseList = phrases.map((p, idx) => {
    return `${idx + 1}. English: "${p.english}"\n   Spanish: "${p.spanish}"`;
  }).join('\n\n');

  const prompt = `You are a grammar validator for a Spanish learning app.

Rate each phrase pair for GRAMMATICAL CORRECTNESS. These are practice phrases for language learners - they should be grammatically correct but don't need to be perfectly natural or complete sentences.

IMPORTANT: Be LENIENT with learner phrases. Only mark UNGRAMMATICAL if there are actual grammar errors or nonsensical word combinations.

For each phrase, respond with ONE of:
- OK: Grammatically correct in both languages (even if simple, elliptical, or slightly stilted)
- UNGRAMMATICAL: Contains actual grammatical errors or wrong word collocations

Examples of OK phrases (keep these):
- "I'm trying to learn how to speak Spanish" → OK (perfectly grammatical)
- "I want to learn how to speak Spanish more often" → OK (grammatically fine)
- "I'm trying to remember how to speak" → OK (elliptical but grammatical)
- "if I'm trying to learn how to speak" → OK (subordinate clause, useful for learners)
- "I'm not sure if I want" → OK (elliptical but natural in context)
- "I speak as often as possible" → OK (grammatically correct)
- "I'm trying as hard as I can" → OK (perfectly fine)

Examples of UNGRAMMATICAL phrases (reject these):
- "I want to say Spanish with you" → UNGRAMMATICAL (wrong verb collocation - should be "speak Spanish")
- "quiero decir español" → UNGRAMMATICAL (wrong verb - should be "hablar español")
- "how more often possible" → UNGRAMMATICAL (missing words/bad grammar)
- "I want what I mean" → UNGRAMMATICAL (nonsensical)
- "I want a little" → UNGRAMMATICAL (incomplete, needs object)

PHRASES TO RATE:

${phraseList}

RESPOND WITH ONLY THE RATINGS, one per line, in format:
1. OK
2. UNGRAMMATICAL
3. OK
...etc.`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 2000,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  });

  // Parse response
  const ratings = message.content[0].text
    .trim()
    .split('\n')
    .map(line => line.match(/OK|UNGRAMMATICAL/)?.[0])
    .filter(Boolean);

  return ratings;
}

/**
 * Filter phrases in a single basket
 */
async function filterBasket(basketPath) {
  const basket = JSON.parse(fs.readFileSync(basketPath, 'utf8'));
  const seedId = basket.seed_id;

  console.log(`\n📦 Processing ${seedId}...`);

  let totalPhrasesOriginal = 0;
  let totalPhrasesFiltered = 0;
  let totalPhrasesKept = 0;
  let legoWarnings = [];

  // Process each LEGO
  for (const [legoId, legoData] of Object.entries(basket.legos)) {
    const originalPhrases = legoData.practice_phrases;
    const originalCount = originalPhrases.length;
    totalPhrasesOriginal += originalCount;

    // Separate phrases to filter (4+ words) vs keep (< 4 words)
    // Count words in Spanish phrase (index 1)
    const phrasesToKeep = originalPhrases.filter(p => p[1].split(' ').length < MIN_WORDS_TO_FILTER);
    const phrasesToFilter = originalPhrases.filter(p => p[1].split(' ').length >= MIN_WORDS_TO_FILTER);

    console.log(`   ${legoId}: ${originalCount} phrases (${phrasesToFilter.length} to filter, ${phrasesToKeep.length} auto-keep)`);

    if (phrasesToFilter.length === 0) {
      // Nothing to filter for this LEGO
      totalPhrasesKept += originalCount;
      continue;
    }

    // Batch filter phrases
    const batches = [];
    for (let i = 0; i < phrasesToFilter.length; i += BATCH_SIZE) {
      batches.push(phrasesToFilter.slice(i, i + BATCH_SIZE));
    }

    let filteredPhrases = [...phrasesToKeep];

    for (const batch of batches) {
      const batchForRating = batch.map(p => ({
        english: p[0],
        spanish: p[1],
        legoCount: p[3],
        original: p,
      }));

      try {
        const ratings = await ratePhrasesBatch(batchForRating);

        // Keep only OK phrases (reject UNGRAMMATICAL)
        for (let i = 0; i < ratings.length; i++) {
          if (ratings[i] === 'OK') {
            filteredPhrases.push(batchForRating[i].original);
          } else {
            totalPhrasesFiltered++;
            console.log(`      ❌ UNGRAMMATICAL: "${batchForRating[i].english}"`);
          }
        }
      } catch (error) {
        console.error(`      ⚠️  API error, keeping batch: ${error.message}`);
        filteredPhrases.push(...batch);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update basket
    legoData.practice_phrases = filteredPhrases;

    // Update distribution
    const distribution = {
      really_short_1_2: 0,
      quite_short_3: 0,
      longer_4_5: 0,
      long_6_plus: 0,
    };

    filteredPhrases.forEach(p => {
      const count = p[3];
      if (count <= 2) distribution.really_short_1_2++;
      else if (count === 3) distribution.quite_short_3++;
      else if (count <= 5) distribution.longer_4_5++;
      else distribution.long_6_plus++;
    });

    legoData.phrase_distribution = distribution;

    const newCount = filteredPhrases.length;
    totalPhrasesKept += newCount;

    const culledPct = Math.round(((originalCount - newCount) / originalCount) * 100);
    console.log(`      ✅ Kept ${newCount}/${originalCount} phrases (${culledPct}% culled)`);

    // Warn if too few phrases remain
    if (newCount < MIN_PHRASES_WARNING) {
      legoWarnings.push(`${legoId}: Only ${newCount} phrases remaining!`);
    }
  }

  // Update generation stage
  basket.generation_stage = 'GRAMMAR_FILTER_COMPLETE';

  // Write filtered basket
  fs.writeFileSync(basketPath, JSON.stringify(basket, null, 2));

  console.log(`\n   📊 ${seedId} Summary:`);
  console.log(`      Original: ${totalPhrasesOriginal} phrases`);
  console.log(`      Filtered: ${totalPhrasesFiltered} phrases`);
  console.log(`      Kept: ${totalPhrasesKept} phrases`);
  const overallCulled = Math.round((totalPhrasesFiltered / totalPhrasesOriginal) * 100);
  console.log(`      Culled: ${overallCulled}%`);

  if (legoWarnings.length > 0) {
    console.log(`\n   ⚠️  WARNINGS:`);
    legoWarnings.forEach(w => console.log(`      ${w}`));
  }

  return {
    seedId,
    original: totalPhrasesOriginal,
    filtered: totalPhrasesFiltered,
    kept: totalPhrasesKept,
    warnings: legoWarnings,
  };
}

/**
 * Main function
 */
async function main() {
  // Find all baskets
  const outputDir = path.join(__dirname, 'phase5_outputs');
  const basketFiles = fs.readdirSync(outputDir)
    .filter(f => f.startsWith('seed_s') && f.endsWith('.json'))
    .map(f => path.join(outputDir, f));

  console.log(`Found ${basketFiles.length} baskets to filter\n`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Error: ANTHROPIC_API_KEY environment variable not set');
    process.exit(1);
  }

  const results = [];

  for (const basketPath of basketFiles) {
    try {
      const result = await filterBasket(basketPath);
      results.push(result);
    } catch (error) {
      console.error(`\n❌ Error processing ${basketPath}: ${error.message}`);
    }
  }

  // Overall summary
  console.log('\n\n📊 OVERALL SUMMARY\n');
  console.log('=' .repeat(60));

  const totals = results.reduce((acc, r) => ({
    original: acc.original + r.original,
    filtered: acc.filtered + r.filtered,
    kept: acc.kept + r.kept,
  }), { original: 0, filtered: 0, kept: 0 });

  console.log(`Total phrases original:  ${totals.original}`);
  console.log(`Total phrases filtered:  ${totals.filtered}`);
  console.log(`Total phrases kept:      ${totals.kept}`);
  console.log(`Overall culled:          ${Math.round((totals.filtered / totals.original) * 100)}%`);

  const allWarnings = results.flatMap(r => r.warnings);
  if (allWarnings.length > 0) {
    console.log(`\n⚠️  ${allWarnings.length} LEGOs with < ${MIN_PHRASES_WARNING} phrases:`);
    allWarnings.forEach(w => console.log(`   ${w}`));
  }

  console.log('\n✅ Naturalness filtering complete!');
}

main().catch(console.error);
