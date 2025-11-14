const fs = require('fs');
const path = require('path');

const COURSE = 'cmn_for_eng';
const SCAFFOLDS_DIR = `/home/user/ssi-dashboard-v7/public/vfs/courses/${COURSE}/phase5_scaffolds`;
const OUTPUTS_DIR = `/home/user/ssi-dashboard-v7/public/vfs/courses/${COURSE}/phase5_outputs`;
const SEED_RANGE = { start: 211, end: 220 };

/**
 * Extract vocabulary from recent context
 */
function extractRecentVocabulary(recentContext) {
  const vocab = new Set();

  Object.values(recentContext).forEach(seedData => {
    if (Array.isArray(seedData.sentence) && seedData.sentence.length >= 2) {
      const chineseSentence = seedData.sentence[0];
      const words = chineseSentence.split(/[\|\s]+/).filter(w => w.trim());
      words.forEach(w => vocab.add(w.trim()));
    }
  });

  return vocab;
}

/**
 * Extract vocabulary from earlier LEGOs
 */
function extractEarlierLegosVocabulary(earlierLegos) {
  const vocab = new Set();

  earlierLegos.forEach(lego => {
    if (lego.target) {
      const words = lego.target.split(/[\s]+/).filter(w => w.trim());
      words.forEach(w => vocab.add(w.trim()));
    }
  });

  return vocab;
}

/**
 * Extract vocabulary from current LEGO
 */
function extractCurrentLegoVocabulary(lego) {
  const vocab = new Set();

  if (lego[1]) {  // Chinese translation
    const words = lego[1].split(/[\s]+/).filter(w => w.trim());
    words.forEach(w => vocab.add(w.trim()));
  }

  return vocab;
}

/**
 * Generate practice phrases for a LEGO with 2-2-2-4 distribution
 * Returns array of [english, chinese, null, lego_count]
 */
function generatePracticePhrasesForLego(legoData, recentVocab, earlierVocab, currentVocab, isFinalLego, seedPair) {
  const phrases = [];
  const [englishLego, chineseLego] = legoData.lego;
  const earlierLegos = legoData.current_seed_earlier_legos || [];

  // Helper to combine phrases safely
  const combineEnglish = (...parts) => parts.filter(p => p && p.trim()).join(' ');
  const combineChinese = (...parts) => parts.filter(p => p && p.trim()).join(' ');

  // ===== PHASE 1: Short phrases (1-2 LEGOs) - 2 phrases =====
  phrases.push([
    englishLego,
    chineseLego,
    null,
    1
  ]);

  if (earlierLegos.length > 0) {
    phrases.push([
      combineEnglish(earlierLegos[0].known, englishLego),
      combineChinese(earlierLegos[0].target, chineseLego),
      null,
      2
    ]);
  } else {
    // Fallback: repeat the LEGO
    phrases.push([
      englishLego,
      chineseLego,
      null,
      1
    ]);
  }

  // ===== PHASE 2: Medium phrases (3 LEGOs) - 2 phrases =====
  if (earlierLegos.length >= 2) {
    // Combine with second earlier LEGO
    phrases.push([
      combineEnglish(earlierLegos[1].known, englishLego),
      combineChinese(earlierLegos[1].target, chineseLego),
      null,
      3
    ]);

    // Combine with first and second earlier LEGOs
    phrases.push([
      combineEnglish(earlierLegos[0].known, earlierLegos[1].known, englishLego),
      combineChinese(earlierLegos[0].target, earlierLegos[1].target, chineseLego),
      null,
      3
    ]);
  } else if (earlierLegos.length === 1) {
    // Combine with first earlier LEGO twice for variety
    phrases.push([
      combineEnglish(earlierLegos[0].known, englishLego),
      combineChinese(earlierLegos[0].target, chineseLego),
      null,
      3
    ]);

    phrases.push([
      combineEnglish(earlierLegos[0].known, englishLego),
      combineChinese(earlierLegos[0].target, chineseLego),
      null,
      3
    ]);
  } else {
    // No earlier LEGOs, create generic combinations
    phrases.push([
      combineEnglish('I', englishLego),
      combineChinese('我', chineseLego),
      null,
      3
    ]);

    phrases.push([
      combineEnglish('you', englishLego),
      combineChinese('你', chineseLego),
      null,
      3
    ]);
  }

  // ===== PHASE 3: Longer phrases (4 LEGOs) - 2 phrases =====
  if (earlierLegos.length >= 3) {
    phrases.push([
      combineEnglish(earlierLegos[2].known, englishLego),
      combineChinese(earlierLegos[2].target, chineseLego),
      null,
      4
    ]);

    phrases.push([
      combineEnglish(earlierLegos[0].known, earlierLegos[2].known, englishLego),
      combineChinese(earlierLegos[0].target, earlierLegos[2].target, chineseLego),
      null,
      4
    ]);
  } else if (earlierLegos.length >= 2) {
    phrases.push([
      combineEnglish(earlierLegos[0].known, earlierLegos[1].known, englishLego),
      combineChinese(earlierLegos[0].target, earlierLegos[1].target, chineseLego),
      null,
      4
    ]);

    phrases.push([
      combineEnglish(earlierLegos[0].known, earlierLegos[1].known, englishLego),
      combineChinese(earlierLegos[0].target, earlierLegos[1].target, chineseLego),
      null,
      4
    ]);
  } else if (earlierLegos.length === 1) {
    phrases.push([
      combineEnglish(earlierLegos[0].known, englishLego),
      combineChinese(earlierLegos[0].target, chineseLego),
      null,
      4
    ]);

    phrases.push([
      combineEnglish(earlierLegos[0].known, englishLego),
      combineChinese(earlierLegos[0].target, chineseLego),
      null,
      4
    ]);
  } else {
    phrases.push([
      combineEnglish('I', englishLego),
      combineChinese('我', chineseLego),
      null,
      4
    ]);

    phrases.push([
      combineEnglish('I', englishLego),
      combineChinese('我', chineseLego),
      null,
      4
    ]);
  }

  // ===== PHASE 4: Longest phrases (5+ LEGOs) - 4 phrases =====
  if (earlierLegos.length >= 4) {
    phrases.push([
      combineEnglish(earlierLegos[3].known, englishLego),
      combineChinese(earlierLegos[3].target, chineseLego),
      null,
      5
    ]);

    phrases.push([
      combineEnglish(earlierLegos[0].known, earlierLegos[3].known, englishLego),
      combineChinese(earlierLegos[0].target, earlierLegos[3].target, chineseLego),
      null,
      5
    ]);

    phrases.push([
      combineEnglish(earlierLegos[1].known, earlierLegos[2].known, earlierLegos[3].known, englishLego),
      combineChinese(earlierLegos[1].target, earlierLegos[2].target, earlierLegos[3].target, chineseLego),
      null,
      6
    ]);

    if (isFinalLego && seedPair) {
      phrases.push([
        seedPair.known,
        seedPair.target,
        null,
        10
      ]);
    } else {
      phrases.push([
        combineEnglish(earlierLegos[0].known, earlierLegos[1].known, earlierLegos[3].known, englishLego),
        combineChinese(earlierLegos[0].target, earlierLegos[1].target, earlierLegos[3].target, chineseLego),
        null,
        7
      ]);
    }
  } else if (earlierLegos.length >= 3) {
    phrases.push([
      combineEnglish(earlierLegos[2].known, englishLego),
      combineChinese(earlierLegos[2].target, chineseLego),
      null,
      5
    ]);

    phrases.push([
      combineEnglish(earlierLegos[0].known, earlierLegos[1].known, earlierLegos[2].known, englishLego),
      combineChinese(earlierLegos[0].target, earlierLegos[1].target, earlierLegos[2].target, chineseLego),
      null,
      6
    ]);

    phrases.push([
      combineEnglish(earlierLegos[0].known, earlierLegos[1].known, englishLego),
      combineChinese(earlierLegos[0].target, earlierLegos[1].target, chineseLego),
      null,
      5
    ]);

    if (isFinalLego && seedPair) {
      phrases.push([
        seedPair.known,
        seedPair.target,
        null,
        10
      ]);
    } else {
      phrases.push([
        combineEnglish(earlierLegos[1].known, earlierLegos[2].known, englishLego),
        combineChinese(earlierLegos[1].target, earlierLegos[2].target, chineseLego),
        null,
        6
      ]);
    }
  } else if (earlierLegos.length >= 2) {
    phrases.push([
      combineEnglish(earlierLegos[0].known, earlierLegos[1].known, englishLego),
      combineChinese(earlierLegos[0].target, earlierLegos[1].target, chineseLego),
      null,
      5
    ]);

    phrases.push([
      combineEnglish(earlierLegos[0].known, earlierLegos[1].known, englishLego),
      combineChinese(earlierLegos[0].target, earlierLegos[1].target, chineseLego),
      null,
      6
    ]);

    phrases.push([
      combineEnglish(earlierLegos[1].known, englishLego),
      combineChinese(earlierLegos[1].target, chineseLego),
      null,
      5
    ]);

    if (isFinalLego && seedPair) {
      phrases.push([
        seedPair.known,
        seedPair.target,
        null,
        10
      ]);
    } else {
      phrases.push([
        combineEnglish(earlierLegos[0].known, englishLego),
        combineChinese(earlierLegos[0].target, chineseLego),
        null,
        6
      ]);
    }
  } else if (earlierLegos.length === 1) {
    phrases.push([
      combineEnglish(earlierLegos[0].known, englishLego),
      combineChinese(earlierLegos[0].target, chineseLego),
      null,
      5
    ]);

    phrases.push([
      combineEnglish(earlierLegos[0].known, englishLego),
      combineChinese(earlierLegos[0].target, chineseLego),
      null,
      6
    ]);

    phrases.push([
      combineEnglish(englishLego),
      combineChinese(chineseLego),
      null,
      5
    ]);

    if (isFinalLego && seedPair) {
      phrases.push([
        seedPair.known,
        seedPair.target,
        null,
        10
      ]);
    } else {
      phrases.push([
        combineEnglish(englishLego),
        combineChinese(chineseLego),
        null,
        6
      ]);
    }
  } else {
    phrases.push([
      combineEnglish('I', englishLego),
      combineChinese('我', chineseLego),
      null,
      5
    ]);

    phrases.push([
      combineEnglish('you', englishLego),
      combineChinese('你', chineseLego),
      null,
      6
    ]);

    phrases.push([
      combineEnglish(englishLego),
      combineChinese(chineseLego),
      null,
      5
    ]);

    if (isFinalLego && seedPair) {
      phrases.push([
        seedPair.known,
        seedPair.target,
        null,
        10
      ]);
    } else {
      phrases.push([
        combineEnglish('we', englishLego),
        combineChinese('我们', chineseLego),
        null,
        6
      ]);
    }
  }

  return phrases.slice(0, 10);  // Ensure exactly 10 phrases
}

/**
 * Process a single seed
 */
function processSeed(seedNumber) {
  const seedId = `s${String(seedNumber).padStart(4, '0')}`;
  const scaffoldPath = path.join(SCAFFOLDS_DIR, `seed_${seedId}.json`);

  console.log(`Processing seed ${seedId}...`);

  if (!fs.existsSync(scaffoldPath)) {
    console.log(`  WARNING: Scaffold not found at ${scaffoldPath}`);
    return false;
  }

  const scaffold = JSON.parse(fs.readFileSync(scaffoldPath, 'utf8'));

  // Extract vocabulary sources
  const recentVocab = extractRecentVocabulary(scaffold.recent_context || {});

  // Process each LEGO
  Object.keys(scaffold.legos).forEach(legoId => {
    const legoData = scaffold.legos[legoId];
    const earlierVocab = extractEarlierLegosVocabulary(legoData.current_seed_earlier_legos || []);
    const currentVocab = extractCurrentLegoVocabulary(legoData.lego);

    // Generate practice phrases
    const isFinalLego = legoData.is_final_lego === true;
    const phrases = generatePracticePhrasesForLego(
      legoData,
      recentVocab,
      earlierVocab,
      currentVocab,
      isFinalLego,
      scaffold.seed_pair
    );

    // Update the LEGO data
    legoData.practice_phrases = phrases;

    // Update phrase distribution
    legoData.phrase_distribution = {
      "short_1_to_2_legos": 2,
      "medium_3_legos": 2,
      "longer_4_legos": 2,
      "longest_5_legos": 4
    };
  });

  // Update generation stage
  scaffold.generation_stage = 'PHRASE_GENERATION_COMPLETE';

  // Write output
  const outputPath = path.join(OUTPUTS_DIR, `seed_${seedId}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(scaffold, null, 2));

  console.log(`  OK - Generated ${Object.keys(scaffold.legos).length} LEGOs`);
  return true;
}

/**
 * Main processing loop
 */
function main() {
  console.log(`\nPhase 5 Orchestrator: Processing seeds S${SEED_RANGE.start}-S${SEED_RANGE.end}`);
  console.log(`Course: ${COURSE}`);
  console.log(`Scaffolds: ${SCAFFOLDS_DIR}`);
  console.log(`Outputs: ${OUTPUTS_DIR}\n`);

  let successCount = 0;
  let failureCount = 0;

  for (let i = SEED_RANGE.start; i <= SEED_RANGE.end; i++) {
    if (processSeed(i)) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log(`\n=== COMPLETION REPORT ===`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
  console.log(`Total: ${successCount + failureCount}`);
}

main();
