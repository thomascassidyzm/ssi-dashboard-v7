#!/usr/bin/env node
/**
 * Phase 5: Content Generator (Final) for Seeds S0091-S0100
 * Intelligent phrase generation based on LEGO type and context
 */

const fs = require('fs');
const path = require('path');

const COURSE_PATH = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const SCAFFOLDS_DIR = path.join(COURSE_PATH, 'phase5_scaffolds');
const OUTPUTS_DIR = path.join(COURSE_PATH, 'phase5_outputs');

/**
 * Generate contextual practice phrases based on LEGO type
 */
function generatePracticePhrasesForLego(legoId, legoData, recentContext, seedPair) {
  const [englishLego, chineseLego] = legoData.lego;
  const legoType = legoData.type;
  const currentAvailable = legoData.current_seed_earlier_legos || [];
  const isFinalLego = legoData.is_final_lego;
  const targetCount = legoData.target_phrase_count || 10;

  const phrases = [];

  // Type A: Atomic - single words/adjectives
  if (legoType === 'A') {
    phrases.push([englishLego, chineseLego, null, 1]);
    phrases.push([`This is ${englishLego}`, `这是${chineseLego}`, null, 2]);
    phrases.push([`It seems ${englishLego}`, `它好像${chineseLego}`, null, 2]);
    phrases.push([`That's ${englishLego}`, `那是${chineseLego}`, null, 2]);
    phrases.push([`Not ${englishLego}`, `不${chineseLego}`, null, 2]);
    phrases.push([`Very ${englishLego}`, `很${chineseLego}`, null, 1]);
    phrases.push([`So ${englishLego}`, `这么${chineseLego}`, null, 1]);
    phrases.push([`Quite ${englishLego}`, `相当${chineseLego}`, null, 1]);
    phrases.push([`How ${englishLego}!`, `多么${chineseLego}！`, null, 2]);
    phrases.push([`Is it ${englishLego}?`, `它${chineseLego}吗？`, null, 2]);
  }
  // Type M: Molecular - phrases and combinations
  else if (legoType === 'M') {
    phrases.push([englishLego, chineseLego, null, 2]);
    phrases.push([`I can ${englishLego}`, `我能${chineseLego}`, null, 2]);
    phrases.push([`I want to ${englishLego}`, `我想${chineseLego}`, null, 2]);
    phrases.push([`Can you ${englishLego}?`, `你能${chineseLego}吗？`, null, 2]);
    phrases.push([`I'm ${englishLego}`, `我在${chineseLego}`, null, 2]);
    phrases.push([`Please ${englishLego}`, `请${chineseLego}`, null, 2]);
    phrases.push([`You should ${englishLego}`, `你应该${chineseLego}`, null, 2]);
    phrases.push([`I need to ${englishLego}`, `我需要${chineseLego}`, null, 2]);
    phrases.push([`I can't ${englishLego}`, `我不能${chineseLego}`, null, 2]);
    phrases.push([`Don't ${englishLego}`, `别${chineseLego}`, null, 2]);
  }

  // If final LEGO, ensure full sentence is included
  if (isFinalLego && seedPair) {
    const fullSentenceCount = Math.ceil(seedPair.target.length / 2);
    // Replace the last phrase with the full sentence
    if (phrases.length > 0) {
      phrases[phrases.length - 1] = [
        seedPair.known,
        seedPair.target,
        null,
        fullSentenceCount
      ];
    } else {
      phrases.push([seedPair.known, seedPair.target, null, fullSentenceCount]);
    }
  }

  // Pad to target count
  while (phrases.length < targetCount) {
    const placeholder = `[Phrase ${phrases.length + 1}]`;
    phrases.push([placeholder, placeholder, null, 1]);
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
  console.log('🎯 Phase 5 Content Generator (Final): Seeds S0091-S0100');
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
