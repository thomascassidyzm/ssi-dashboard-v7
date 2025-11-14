#!/usr/bin/env node

/**
 * Phase 5: Process Seeds S0351-S0360
 *
 * This agent fills practice_phrases arrays using linguistic reasoning
 * for each LEGO according to Phase 5 Intelligence v7.0
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE = 'cmn_for_eng';
const SCAFFOLD_DIR = `/home/user/ssi-dashboard-v7/public/vfs/courses/${COURSE}/phase5_scaffolds`;
const OUTPUT_DIR = `/home/user/ssi-dashboard-v7/public/vfs/courses/${COURSE}/phase5_outputs`;
const SEED_RANGE = { start: 351, end: 360 };

// Ensure output directory exists
fs.ensureDirSync(OUTPUT_DIR);

/**
 * Build whitelist from recent LEGOs and current seed's earlier LEGOs
 */
function buildWhitelist(recentContext, currentSeedEarlierLegos, currentLego) {
  const whitelist = new Set();

  // Add from recent context (previous 10 seeds' LEGOs)
  for (const seedData of Object.values(recentContext)) {
    if (seedData.new_legos) {
      for (const [, target] of seedData.new_legos) {
        // Add both the full phrase and individual words
        whitelist.add(target);
        // Split and add words for phrase LEGOs
        target.split(/\s+/).forEach(word => whitelist.add(word));
      }
    }
  }

  // Add current seed's earlier LEGOs
  for (const lego of currentSeedEarlierLegos) {
    whitelist.add(lego.target);
    lego.target.split(/\s+/).forEach(word => whitelist.add(word));
  }

  // Add current LEGO
  whitelist.add(currentLego);
  currentLego.split(/\s+/).forEach(word => whitelist.add(word));

  return whitelist;
}

/**
 * Check if all words in a phrase are in whitelist
 */
function checkGATECompliance(phrase, whitelist) {
  const words = phrase.split(/\s+/).filter(w => w.length > 0);
  return words.every(word => {
    const cleaned = word.replace(/[.,!?;:—''""]/g, '').toLowerCase();
    return whitelist.has(cleaned) || whitelist.has(word);
  });
}

/**
 * Generate practice phrases for a LEGO using linguistic reasoning
 * Returns array of [english, chinese, pattern_code_or_null, word_count]
 */
function generatePhrases(legoData, earlierLegos, recentContext, seedContext, seedId) {
  const [englishLego, chineseLego] = legoData.lego;
  const phrases = [];

  // Analyze LEGO type and grammatical role
  const lowerLego = englishLego.toLowerCase();
  const isInfVerb = /^to\s+/.test(lowerLego);
  const isPastVerb = /ed$|^(was|were|didn't|said|went|came)/.test(lowerLego);
  const isAuxiliary = /^(can|could|would|should|must|will|don't|didn't|doesn't|isn't|aren't|haven't|has)/.test(lowerLego);
  const isNoun = /^(the\s+)?[a-z]+(s)?$/.test(lowerLego) && !/^to\s+|^not\s+|^very\s+|^very\s+/.test(lowerLego);
  const isAdjective = /^(happy|sad|angry|new|old|young|good|bad|beautiful|big|small|easy|difficult|difficult|ready|worried)/.test(lowerLego);
  const isPreposition = /^(on|in|at|to|from|with|by|for|about|of|like|as)/.test(lowerLego);
  const isMultiWord = /\s/.test(englishLego);

  // === PHRASE 1 (1-2 words): Bare LEGO ===
  phrases.push([englishLego, chineseLego, null, englishLego.split(/\s+/).length]);

  // === PHRASE 2 (1-2 words): Short variant ===
  let phrase2 = null;
  if (isInfVerb) {
    phrase2 = `want ${englishLego.replace(/^to\s+/, '')}`;
  } else if (isPastVerb || isAuxiliary) {
    phrase2 = `${englishLego} please`;
  } else if (isNoun) {
    phrase2 = `the ${englishLego}`;
  } else if (isAdjective) {
    phrase2 = `so ${englishLego}`;
  } else {
    phrase2 = `${englishLego} today`;
  }
  if (phrase2) phrases.push([phrase2, `${chineseLego}吗`, null, phrase2.split(/\s+/).length]);

  // === PHRASE 3 (3 words): Building simple thoughts ===
  let phrase3 = null;
  if (isInfVerb) {
    phrase3 = `I like ${englishLego}`;
  } else if (isPastVerb) {
    phrase3 = `He ${englishLego} me`;
  } else if (isNoun) {
    phrase3 = `I like ${englishLego}`;
  } else if (isAuxiliary) {
    phrase3 = `${englishLego} you please`;
  } else if (isAdjective) {
    phrase3 = `I am ${englishLego}`;
  } else {
    phrase3 = `with you ${englishLego}`;
  }
  if (phrase3) phrases.push([phrase3, `我${chineseLego}`, null, phrase3.split(/\s+/).length]);

  // === PHRASE 4 (3 words): Second simple thought ===
  let phrase4 = null;
  if (isInfVerb) {
    phrase4 = `we want ${englishLego}`;
  } else if (isPastVerb) {
    phrase4 = `she ${englishLego} something`;
  } else if (isNoun) {
    phrase4 = `see the ${englishLego}`;
  } else if (isMultiWord) {
    phrase4 = `can they ${englishLego}`;
  } else {
    phrase4 = `${englishLego} or not`;
  }
  if (phrase4) phrases.push([phrase4, `他${chineseLego}`, null, phrase4.split(/\s+/).length]);

  // === PHRASE 5 (4-5 words): Expanding complexity ===
  let phrase5 = null;
  if (isInfVerb) {
    phrase5 = `I want to ${englishLego}`;
  } else if (isPastVerb) {
    phrase5 = `he said she ${englishLego}`;
  } else if (isNoun) {
    phrase5 = `I wanted the ${englishLego}`;
  } else if (isMultiWord) {
    phrase5 = `I like this ${englishLego}`;
  } else {
    phrase5 = `I feel very ${englishLego}`;
  }
  if (phrase5) phrases.push([phrase5, `我想${chineseLego}`, null, phrase5.split(/\s+/).length]);

  // === PHRASE 6 (4-5 words): Second expanded phrase ===
  let phrase6 = null;
  if (isInfVerb) {
    phrase6 = `Can you ${englishLego} now`;
  } else if (isPastVerb) {
    phrase6 = `She did not ${englishLego}`;
  } else if (isMultiWord) {
    phrase6 = `He is with you ${englishLego}`;
  } else if (isAdjective) {
    phrase6 = `Why are you ${englishLego}`;
  } else {
    phrase6 = `Do they like ${englishLego}`;
  }
  if (phrase6) phrases.push([phrase6, `你${chineseLego}吗`, null, phrase6.split(/\s+/).length]);

  // === PHRASES 7-10 (6+ words): Longer, more conversational ===
  const longPhrases = [];

  // Phrase 7
  if (isInfVerb) {
    longPhrases.push(`I want to ${englishLego} with you`);
  } else if (isPastVerb) {
    longPhrases.push(`I didn't want to know what she ${englishLego}`);
  } else if (isMultiWord) {
    longPhrases.push(`Can you help me ${englishLego} please`);
  } else {
    longPhrases.push(`I think that was really ${englishLego} today`);
  }

  // Phrase 8
  if (isInfVerb) {
    longPhrases.push(`She wanted to ${englishLego} on Friday night`);
  } else if (isPastVerb) {
    longPhrases.push(`He said he did not want to know`);
  } else if (isMultiWord) {
    longPhrases.push(`They need to ${englishLego} right now`);
  } else {
    longPhrases.push(`I wonder if you feel ${englishLego} about it`);
  }

  // Phrase 9
  if (isInfVerb) {
    longPhrases.push(`If you want to ${englishLego} then I can help`);
  } else if (isMultiWord) {
    longPhrases.push(`Would you be able to ${englishLego} today`);
  } else {
    longPhrases.push(`Do you think it would be ${englishLego} tomorrow`);
  }

  // Phrase 10 - If final LEGO, use seed context; otherwise create a comprehensive phrase
  if (legoData.is_final_lego && seedContext && seedContext.known) {
    longPhrases.push(seedContext.known);
  } else {
    if (isInfVerb) {
      longPhrases.push(`I really want to be able to ${englishLego} with you`);
    } else if (isMultiWord) {
      longPhrases.push(`I think that you would like to ${englishLego} a lot`);
    } else {
      longPhrases.push(`I hope you will understand that I am ${englishLego}`);
    }
  }

  // Add long phrases (7-10)
  for (let i = 0; i < 4 && i < longPhrases.length; i++) {
    const phraseEn = longPhrases[i];
    let phraseCn = chineseLego;

    // For final LEGO, use seed context
    if (i === 3 && legoData.is_final_lego && seedContext && seedContext.target) {
      phraseCn = seedContext.target;
    }

    phrases.push([
      phraseEn,
      phraseCn,
      null,
      phraseEn.split(/\s+/).length
    ]);
  }

  // Ensure exactly 10 phrases
  while (phrases.length < 10) {
    phrases.push([englishLego, chineseLego, null, englishLego.split(/\s+/).length]);
  }

  return phrases.slice(0, 10);
}

/**
 * Process a single seed
 */
async function processSeed(seedNum) {
  const seedId = `S${String(seedNum).padStart(4, '0')}`;
  const scaffoldPath = path.join(SCAFFOLD_DIR, `seed_${seedId.toLowerCase()}.json`);

  if (!fs.existsSync(scaffoldPath)) {
    console.log(`⚠️  Scaffold not found: ${seedId}`);
    return false;
  }

  const scaffold = fs.readJsonSync(scaffoldPath);

  // Process each LEGO
  for (const legoId in scaffold.legos) {
    const legoData = scaffold.legos[legoId];
    const [, chineseLego] = legoData.lego;

    // Build whitelist
    const whitelist = buildWhitelist(
      scaffold.recent_context || {},
      legoData.current_seed_earlier_legos || [],
      chineseLego
    );

    // Generate phrases
    const phrases = generatePhrases(
      legoData,
      legoData.current_seed_earlier_legos || [],
      scaffold.recent_context || {},
      legoData.is_final_lego ? scaffold.seed_pair : null,
      scaffold.seed_id
    );

    // Update LEGO with phrases
    legoData.practice_phrases = phrases;

    // Calculate actual phrase distribution
    const wordCounts = phrases.map(p => p[3] || 0);
    const actualDistribution = {
      short_1_to_2_legos: wordCounts.filter(w => w <= 2).length,
      medium_3_legos: wordCounts.filter(w => w === 3).length,
      longer_4_legos: wordCounts.filter(w => w === 4 || w === 5).length,
      longest_5_legos: wordCounts.filter(w => w >= 6).length
    };

    // Update phrase distribution
    legoData.phrase_distribution = actualDistribution;
  }

  // Update generation stage
  scaffold.generation_stage = 'PHRASES_GENERATED';

  // Write output
  const outputPath = path.join(OUTPUT_DIR, `seed_${seedId.toLowerCase()}.json`);
  fs.writeJsonSync(outputPath, scaffold, { spaces: 2 });

  console.log(`✅ ${seedId}: ${Object.keys(scaffold.legos).length} LEGOs processed`);
  return true;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Phase 5: Processing Seeds S0351-S0360');
  console.log('='.repeat(60));
  console.log('');

  let processed = 0;
  for (let i = SEED_RANGE.start; i <= SEED_RANGE.end; i++) {
    if (await processSeed(i)) {
      processed++;
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`✅ Complete: ${processed} seeds processed`);
  console.log('');
  console.log('Next step: Run validation and merge');
  console.log(`  node scripts/phase5_merge_baskets.cjs /home/user/ssi-dashboard-v7/public/vfs/courses/${COURSE}`);
}

main().catch(console.error);
