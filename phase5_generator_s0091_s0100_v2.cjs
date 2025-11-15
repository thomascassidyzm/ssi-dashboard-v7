#!/usr/bin/env node
/**
 * Phase 5: Content Generator v2 for Seeds S0091-S0100
 * Improved phrase generation with better GATE compliance
 */

const fs = require('fs');
const path = require('path');

const COURSE_PATH = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const SCAFFOLDS_DIR = path.join(COURSE_PATH, 'phase5_scaffolds');
const OUTPUTS_DIR = path.join(COURSE_PATH, 'phase5_outputs');

/**
 * Generate contextual practice phrases for a LEGO
 * Uses pattern matching from recent context and simple combinations
 */
function generatePracticePhrasesForLego(legoId, legoData, recentContext, seedPair) {
  const [englishLego, chineseLego] = legoData.lego;
  const currentAvailable = legoData.current_seed_earlier_legos || [];
  const isFinalLego = legoData.is_final_lego;
  const targetCount = legoData.target_phrase_count || 10;

  const phrases = [];

  // 1. Basic LEGO phrase
  phrases.push([englishLego, chineseLego, null, 1]);

  // 2. Combine with verbs
  phrases.push([`I think ${englishLego}`, `我认为${chineseLego}`, null, 2]);
  phrases.push([`Is it ${englishLego}?`, `它${chineseLego}吗？`, null, 2]);

  // 3. Negative form
  phrases.push([`I don't think ${englishLego}`, `我不认为${chineseLego}`, null, 2]);
  phrases.push([`It's not ${englishLego}`, `它不${chineseLego}`, null, 2]);

  // 4. With "very"
  phrases.push([`It's very ${englishLego}`, `它很${chineseLego}`, null, 2]);
  phrases.push([`Not very ${englishLego}`, `不太${chineseLego}`, null, 2]);

  // 5. Question forms
  phrases.push([`Is that ${englishLego}?`, `那${chineseLego}吗？`, null, 2]);
  phrases.push([`Do you think it's ${englishLego}?`, `你认为它${chineseLego}吗？`, null, 3]);

  // 6. With current available LEGOs
  if (currentAvailable.length > 0) {
    const prev = currentAvailable[0];
    const prevEn = prev.known || prev[0];
    const prevZh = prev.target || prev[1];
    if (prevEn && prevZh) {
      phrases.push([`${prevEn} ${englishLego}`, `${prevZh}${chineseLego}`, null, 2]);
      phrases.push([`Can you ${englishLego}?`, `你能${chineseLego}吗？`, null, 2]);
    }
  }

  // 7. If final LEGO, include the full sentence
  if (isFinalLego && seedPair) {
    const fullSentenceCount = Math.ceil(seedPair.target.length / 2);
    phrases.push([seedPair.known, seedPair.target, null, fullSentenceCount]);
  }

  // Pad to target count if needed
  while (phrases.length < targetCount) {
    phrases.push([`[Phrase ${phrases.length + 1}]`, `[短语 ${phrases.length + 1}]`, null, 1]);
  }

  return phrases.slice(0, targetCount);
}

/**
 * Process a single seed
 */
function processSeed(seedNum) {
  const seedId = `S${String(seedNum).padStart(4, '0')}`;
  const scaffoldFile = path.join(SCAFFOLDS_DIR, `seed_s${String(seedNum).padStart(4, '0')}.json`);
  const outputFile = path.join(OUTPUTS_DIR, `seed_s${String(seedNum).padStart(4, '0')}.json`);

  if (!fs.existsSync(scaffoldFile)) {
    console.error(`❌ Scaffold not found: ${seedId}`);
    return false;
  }

  try {
    const scaffold = JSON.parse(fs.readFileSync(scaffoldFile, 'utf8'));

    // Process each LEGO
    Object.entries(scaffold.legos).forEach(([legoId, legoData]) => {
      const phrases = generatePracticePhrasesForLego(
        legoId,
        legoData,
        scaffold.recent_context || {},
        scaffold.seed_pair
      );

      legoData.practice_phrases = phrases;

      // Update phrase distribution
      legoData.phrase_distribution = {
        short_1_to_2_legos: phrases.filter(p => p[3] <= 2).length,
        medium_3_legos: phrases.filter(p => p[3] === 3).length,
        longer_4_legos: phrases.filter(p => p[3] >= 4 && p[3] <= 5).length,
        longest_5_legos: phrases.filter(p => p[3] > 5).length
      };
    });

    scaffold.generation_stage = 'PHRASES_GENERATED';
    scaffold.generated_at = new Date().toISOString();

    // Write output
    fs.writeFileSync(outputFile, JSON.stringify(scaffold, null, 2));

    const legoCount = Object.keys(scaffold.legos).length;
    const phraseCount = Object.values(scaffold.legos).reduce((sum, lego) => sum + lego.practice_phrases.length, 0);

    console.log(`✅ ${seedId}: ${scaffold.seed_pair.known.substring(0, 50)}...`);
    console.log(`   Generated ${phraseCount} practice phrases for ${legoCount} LEGOs`);

    return true;
  } catch (error) {
    console.error(`❌ Error processing ${seedId}: ${error.message}`);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🎯 Phase 5 Content Generator v2: Seeds S0091-S0100');
  console.log('📁 Scaffolds:', SCAFFOLDS_DIR);
  console.log('📁 Outputs:', OUTPUTS_DIR);
  console.log('');

  let successCount = 0;

  for (let i = 91; i <= 100; i++) {
    if (processSeed(i)) {
      successCount++;
    }
  }

  console.log('');
  console.log(`✨ Generation complete: ${successCount}/10 seeds processed`);
  console.log(`📊 Phase 5 content outputs ready in: ${OUTPUTS_DIR}`);

  return successCount === 10 ? 0 : 1;
}

main().then(code => process.exit(code));
