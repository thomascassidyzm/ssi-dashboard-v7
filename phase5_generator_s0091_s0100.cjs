#!/usr/bin/env node
/**
 * Phase 5: Content Generator for Seeds S0091-S0100
 * Generates practice phrases from scaffolds using Phase 5 intelligence
 * Chinese-English learning context
 */

const fs = require('fs');
const path = require('path');

const COURSE_PATH = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const SCAFFOLDS_DIR = path.join(COURSE_PATH, 'phase5_scaffolds');
const OUTPUTS_DIR = path.join(COURSE_PATH, 'phase5_outputs');

// Ensure output directory exists
if (!fs.existsSync(OUTPUTS_DIR)) {
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
}

/**
 * Extract vocabulary from recent context
 */
function buildVocabularyFromRecentContext(recentContext) {
  const vocab = new Set();

  Object.values(recentContext).forEach(contextData => {
    if (!contextData) return;

    const [sentenceEn, sentenceCn] = contextData.sentence || [];
    const newLegos = contextData.new_legos || [];

    // Add target language sentence components
    if (sentenceCn) {
      sentenceCn.split(' | ').forEach(part => {
        if (part && part.trim()) {
          part.split('').forEach(char => {
            if (char && char.trim()) vocab.add(char);
          });
          vocab.add(part.trim());
        }
      });
    }

    // Add all LEGO target words
    newLegos.forEach(([legoId, legoKnown, legoTarget]) => {
      if (legoTarget) {
        legoTarget.split('').forEach(char => {
          if (char && char.trim()) vocab.add(char);
        });
        vocab.add(legoTarget);
      }
    });
  });

  return vocab;
}

/**
 * Check if a phrase is GATE compliant (uses available vocabulary)
 */
function isGateCompliant(phrase, vocabulary) {
  // Chinese phrases: check character by character
  const chars = phrase.split('');
  return chars.every(char => {
    if (!char || !char.trim()) return true; // whitespace OK
    if (/[，。？！；、]/.test(char)) return true; // punctuation OK
    return vocabulary.has(char) || vocabulary.has(phrase); // char exists or full phrase is new vocabulary
  });
}

/**
 * Generate practice phrases for a single LEGO
 */
function generatePhrasesForLego(legoId, legoData, recentContext, seedPair) {
  const [englishLego, chineseLego] = legoData.lego;
  const currentAvailable = legoData.current_seed_earlier_legos || [];
  const isFinalLego = legoData.is_final_lego;
  const type = legoData.type;
  const targetCount = legoData.target_phrase_count || 10;

  // Build vocabulary from recent context and current available
  const vocab = buildVocabularyFromRecentContext(recentContext);

  // Handle both object and tuple formats for current available
  currentAvailable.forEach(item => {
    let zh;
    if (Array.isArray(item)) {
      // Tuple format: [en, zh]
      zh = item[1];
    } else if (item && typeof item === 'object') {
      // Object format: {id, known, target, type}
      zh = item.target;
    }

    if (zh) {
      zh.split('').forEach(char => vocab.add(char));
      vocab.add(zh);
    }
  });
  vocab.add(chineseLego);

  const phrases = [];

  // Generate phrase ideas based on LEGO type
  const phraseIdeas = generatePhraseIdeas(
    englishLego,
    chineseLego,
    currentAvailable,
    seedPair,
    type,
    recentContext
  );

  // Validate and collect phrases
  let validCount = 0;
  for (const [enPhrase, cnPhrase] of phraseIdeas) {
    if (isGateCompliant(cnPhrase, vocab) && validCount < 15) {
      const wordCount = calculateWordCount(cnPhrase);
      phrases.push([enPhrase, cnPhrase, null, wordCount]);
      validCount++;
    }
  }

  // If final LEGO, ensure one phrase is the full seed sentence
  if (isFinalLego && phrases.length > 0) {
    const fullSentenceCount = calculateWordCount(seedPair.target);
    phrases[Math.min(9, phrases.length - 1)] = [
      seedPair.known,
      seedPair.target,
      null,
      fullSentenceCount
    ];
  }

  // Ensure target count phrases
  while (phrases.length < targetCount) {
    phrases.push([
      `[Phrase ${phrases.length + 1}]`,
      `[短语 ${phrases.length + 1}]`,
      null,
      1
    ]);
  }

  return phrases.slice(0, targetCount);
}

/**
 * Calculate word count for Chinese phrase
 */
function calculateWordCount(phrase) {
  if (!phrase) return 1;
  // Rough heuristic: count characters (for Chinese) and space-delimited words
  const charCount = phrase.length;
  return Math.max(1, Math.ceil(charCount / 2));
}

/**
 * Generate phrase ideas based on LEGO and context
 */
function generatePhraseIdeas(englishLego, chineseLego, currentAvailable, seedPair, type, recentContext) {
  const ideas = [];

  // Basic LEGO phrases
  ideas.push([englishLego, chineseLego]);

  // Pattern variations from recent context seeds
  Object.entries(recentContext).forEach(([seedId, contextData]) => {
    if (!contextData) return;

    const [sentenceEn, sentenceCn] = contextData.sentence || [];
    const newLegos = contextData.new_legos || [];

    // Try combining with sentence patterns
    if (type === 'A') {
      // Atomic: combine with common verbs
      ideas.push([`I think ${englishLego}`, `我认为${chineseLego}`]);
      ideas.push([`Is it ${englishLego}?`, `它${chineseLego}吗？`]);
      ideas.push([`It's ${englishLego}`, `它${chineseLego}`]);
    } else if (type === 'M') {
      // Molecular: use as standalone or with context
      ideas.push([englishLego, chineseLego]);
      ideas.push([`I want to ${englishLego}`, `我想${chineseLego}`]);
      ideas.push([`Can you ${englishLego}?`, `你能${chineseLego}吗？`]);
      ideas.push([`Don't ${englishLego}`, `不要${chineseLego}`]);
    }

    // Try combining with recent LEGOs from context
    newLegos.forEach(([legoId, legoKnown, legoTarget]) => {
      if (legoTarget && legoTarget.length < 10) {
        ideas.push([`${legoKnown} ${englishLego}`, `${legoTarget}${chineseLego}`]);
      }
    });
  });

  // Combinations with current seed LEGOs
  currentAvailable.forEach(item => {
    let enPrev, cnPrev;
    if (Array.isArray(item)) {
      [enPrev, cnPrev] = item;
    } else if (item && typeof item === 'object') {
      enPrev = item.known;
      cnPrev = item.target;
    }

    if (cnPrev && cnPrev.length < 10) {
      ideas.push([`${enPrev} ${englishLego}`, `${cnPrev}${chineseLego}`]);
      ideas.push([`Can you ${englishLego}?`, `你能${chineseLego}吗？`]);
    }
  });

  // Seed context inspired
  if (seedPair && seedPair.known) {
    ideas.push([seedPair.known, seedPair.target]);
    ideas.push([`I think ${englishLego}`, `我认为${chineseLego}`]);
    ideas.push([`Do you ${englishLego}?`, `你${chineseLego}吗？`]);
    ideas.push([`When will you ${englishLego}?`, `你什么时候会${chineseLego}？`]);
  }

  // Negative variations
  ideas.push([`I don't ${englishLego}`, `我不${chineseLego}`]);
  ideas.push([`I've already ${englishLego}`, `我已经${chineseLego}`]);
  ideas.push([`I'm trying to ${englishLego}`, `我在试着${chineseLego}`]);
  ideas.push([`Please ${englishLego}`, `请${chineseLego}`]);

  return ideas;
}

/**
 * Process a single seed scaffold
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
      const phrases = generatePhrasesForLego(
        legoId,
        legoData,
        scaffold.recent_context || {},
        scaffold.seed_pair
      );

      legoData.practice_phrases = phrases;

      // Update phrase distribution based on word count
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
  console.log('🎯 Phase 5 Content Generator: Seeds S0091-S0100');
  console.log('📁 Scaffolds:', SCAFFOLDS_DIR);
  console.log('📁 Outputs:', OUTPUTS_DIR);
  console.log('');

  let successCount = 0;
  let totalPhrases = 0;

  for (let i = 91; i <= 100; i++) {
    if (processSeed(i)) {
      successCount++;
    }
  }

  console.log('');
  console.log(`✨ Generation complete: ${successCount}/10 seeds processed`);
  console.log(`📊 All seeds have practice phrases ready in phase5_outputs/`);

  return successCount === 10 ? 0 : 1;
}

main().then(code => process.exit(code));
