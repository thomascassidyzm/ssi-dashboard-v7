#!/usr/bin/env node
/**
 * Pre-generate ALL Phase 3 scaffolds for a course
 *
 * This is a BATCH operation that runs ONCE per course (or when lego_pairs.json changes).
 * Agents then simply fetch pre-computed scaffolds via REST - no computation needed.
 *
 * Usage: node generate-all-scaffolds.cjs <courseDir>
 *
 * Output structure:
 *   <courseDir>/phase3_scaffolds/
 *     ├── index.json           # Manifest: {seeds: [...], totalLegos: N, generatedAt: ...}
 *     ├── S0001.json           # All LEGOs for seed S0001
 *     ├── S0002.json           # All LEGOs for seed S0002
 *     └── ...
 *
 * Each seed file contains:
 *   {
 *     "seed_id": "S0001",
 *     "seed_pair": { "known": "...", "target": "..." },
 *     "legos": {
 *       "S0001L01": { scaffold text },
 *       "S0001L02": { scaffold text },
 *       ...
 *     }
 *   }
 */

const fs = require('fs-extra');
const path = require('path');

// Spelling normalization for GATE validation
const SPELLING_VARIANTS = {
  'practise': 'practice', 'practising': 'practicing', 'practised': 'practiced',
  'recognise': 'recognize', 'recognising': 'recognizing', 'recognised': 'recognized',
  'realise': 'realize', 'realising': 'realizing', 'realised': 'realized',
  'organise': 'organize', 'organising': 'organizing', 'organised': 'organized',
  'colour': 'color', 'colours': 'colors', 'coloured': 'colored',
  'favour': 'favor', 'favours': 'favors', 'favoured': 'favored',
  'honour': 'honor', 'honours': 'honors', 'honoured': 'honored',
  'behaviour': 'behavior', 'behaviours': 'behaviors',
  'neighbour': 'neighbor', 'neighbours': 'neighbors',
  'labour': 'labor', 'labours': 'labors',
  'travelling': 'traveling', 'travelled': 'traveled',
  'cancelled': 'canceled', 'cancelling': 'canceling',
  'modelling': 'modeling', 'modelled': 'modeled',
  'centre': 'center', 'centres': 'centers',
  'theatre': 'theater', 'theatres': 'theaters',
  'metre': 'meter', 'metres': 'meters',
  'litre': 'liter', 'litres': 'liters',
  'defence': 'defense', 'offence': 'offense',
  'licence': 'license', 'practise': 'practice',
  'analyse': 'analyze', 'analysing': 'analyzing', 'analysed': 'analyzed',
  'catalogue': 'catalog', 'dialogue': 'dialog',
  'programme': 'program', 'programmes': 'programs',
  'grey': 'gray', 'judgement': 'judgment'
};

const SPELLING_NORMALIZE = {};
for (const [british, american] of Object.entries(SPELLING_VARIANTS)) {
  SPELLING_NORMALIZE[british] = british;
  SPELLING_NORMALIZE[american] = british;
}

function normalizeSpelling(word) {
  return SPELLING_NORMALIZE[word] || word;
}

function extractWords(text) {
  const matches = text.toLowerCase().match(/[\wáéíóúüñàèìòùâêîôûäëïöüç]+/g);
  if (!matches) return [];
  return matches.map(normalizeSpelling);
}

/**
 * Build cumulative vocabulary up to (but not including) a specific seed
 * Returns { known: Set, target: Set }
 */
function buildVocabUpToSeed(legoPairs, targetSeedNum) {
  const knownVocab = new Set();
  const targetVocab = new Set();

  for (const seed of legoPairs.seeds) {
    const seedNum = parseInt(seed.seed_id.replace('S', ''));
    if (seedNum >= targetSeedNum) break;

    // Add seed sentence words
    if (seed.seed_pair) {
      extractWords(seed.seed_pair.known).forEach(w => knownVocab.add(w));
      extractWords(seed.seed_pair.target).forEach(w => targetVocab.add(w));
    }

    // Add all LEGO words from this seed
    for (const lego of (seed.legos || [])) {
      if (lego.lego) {
        extractWords(lego.lego.known).forEach(w => knownVocab.add(w));
        extractWords(lego.lego.target).forEach(w => targetVocab.add(w));
      }
    }
  }

  return { known: knownVocab, target: targetVocab };
}

/**
 * Build vocabulary available for a specific LEGO within its seed
 * (prior seeds + earlier LEGOs in current seed + current LEGO)
 */
function buildVocabForLego(legoPairs, seedId, legoIndex) {
  const seedNum = parseInt(seedId.replace('S', ''));
  const vocab = buildVocabUpToSeed(legoPairs, seedNum);

  // Find this seed
  const seed = legoPairs.seeds.find(s => s.seed_id === seedId);
  if (!seed) return vocab;

  // Add seed sentence
  if (seed.seed_pair) {
    extractWords(seed.seed_pair.known).forEach(w => vocab.known.add(w));
    extractWords(seed.seed_pair.target).forEach(w => vocab.target.add(w));
  }

  // Add LEGOs up to and including current index
  for (let i = 0; i <= legoIndex; i++) {
    const lego = seed.legos[i];
    if (lego?.lego) {
      extractWords(lego.lego.known).forEach(w => vocab.known.add(w));
      extractWords(lego.lego.target).forEach(w => vocab.target.add(w));
    }
  }

  return vocab;
}

/**
 * Get recent LEGOs for context (last N LEGOs before current position)
 */
function getRecentLegos(legoPairs, seedId, legoIndex, count = 20) {
  const result = [];
  const seedNum = parseInt(seedId.replace('S', ''));

  // Start from current position and work backwards
  let currentSeedNum = seedNum;
  let currentLegoIdx = legoIndex - 1;

  while (result.length < count && currentSeedNum > 0) {
    const currentSeed = legoPairs.seeds.find(s => s.seed_id === `S${String(currentSeedNum).padStart(4, '0')}`);

    if (currentSeed && currentSeed.legos) {
      // If we're in a previous seed, start from the end
      if (currentSeedNum < seedNum) {
        currentLegoIdx = currentSeed.legos.length - 1;
      }

      while (currentLegoIdx >= 0 && result.length < count) {
        const lego = currentSeed.legos[currentLegoIdx];
        if (lego?.new && lego.lego) {
          result.push({
            id: lego.id,
            known: lego.lego.known,
            target: lego.lego.target,
            type: lego.type
          });
        }
        currentLegoIdx--;
      }
    }

    currentSeedNum--;
    currentLegoIdx = 999; // Reset for next seed
  }

  return result;
}

/**
 * Count syllables in text (language-agnostic)
 * - CJK languages: each character ≈ 1 syllable
 * - Alphabetic languages: estimate via vowel clusters
 */
function countSyllables(text) {
  if (!text || typeof text !== 'string') return 0;
  text = text.trim();
  if (!text) return 0;

  // CJK: count characters
  const cjkRegex = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;
  if (cjkRegex.test(text)) {
    const cjkChars = text.match(/[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/g);
    return cjkChars ? cjkChars.length : 0;
  }

  // Alphabetic: estimate via vowel clusters
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  let syllables = 0;
  for (const word of words) {
    const clean = word.replace(/[^a-záéíóúàèìòùâêîôûäëïöüñç]/gi, '');
    if (!clean) continue;
    const vowelGroups = clean.match(/[aeiouyáéíóúàèìòùâêîôûäëïöü]+/gi);
    let count = vowelGroups ? vowelGroups.length : 1;
    if (clean.endsWith('e') && count > 1) count--;
    syllables += Math.max(1, count);
  }
  return syllables || 1;
}

/**
 * Assign recommended model tier based on difficulty factors
 * @returns 'haiku' | 'sonnet' | 'opus'
 *
 * Difficulty factors (hardest first):
 * 1. Very limited vocab (<15 words) - OPUS only
 * 2. Limited vocab (<30) OR complex M-type (3+ syllables) - SONNET
 * 3. Moderate vocab (30-60) - SONNET (safe default)
 * 4. Rich vocab (>60) with simple LEGO - HAIKU
 */
function assignModelTier(seedNum, vocabSize, legoSyllableCount, legoType) {
  // Tier 1: OPUS - Very constrained (hardest cases)
  // Very limited vocabulary makes GATE compliance extremely difficult
  if (vocabSize < 15) return 'opus';

  // Tier 2: SONNET - Moderate difficulty (default safe choice)
  // Limited vocab OR complex multi-word LEGOs
  if (vocabSize < 30) return 'sonnet';
  if (legoType === 'M' && legoSyllableCount >= 3) return 'sonnet';

  // Tier 3: Still SONNET for moderate vocab (30-60)
  // This is the "safe zone" - Sonnet handles these well
  if (vocabSize < 60) return 'sonnet';

  // Tier 4: HAIKU - Rich vocabulary with simple LEGOs
  // Plenty of vocab options makes generation easier
  return 'haiku';
}

/**
 * Generate scaffold for a single LEGO
 */
function generateLegoScaffold(legoPairs, seed, legoIndex) {
  const lego = seed.legos[legoIndex];
  const seedNum = parseInt(seed.seed_id.replace('S', ''));

  // Get available vocabulary
  const vocab = buildVocabForLego(legoPairs, seed.seed_id, legoIndex);

  // Get recent LEGOs for context (30 most recent new:true LEGOs for recombination priority)
  const recentLegos = getRecentLegos(legoPairs, seed.seed_id, legoIndex, 30);

  // Is this the final LEGO in the seed?
  const isFinalLego = legoIndex === seed.legos.length - 1;

  // Calculate difficulty metrics
  const vocabSize = vocab.target.size;
  const legoSyllableCount = countSyllables(lego.lego.target);
  const recommendedModel = assignModelTier(seedNum, vocabSize, legoSyllableCount, lego.type);

  // Build compact scaffold
  return {
    lego_id: lego.id,
    lego: {
      known: lego.lego.known,
      target: lego.lego.target
    },
    type: lego.type,
    is_new: lego.new,
    is_final_lego: isFinalLego,
    position: `${legoIndex + 1}/${seed.legos.length}`,

    // Difficulty metrics for model selection
    difficulty: {
      vocab_size: vocabSize,
      lego_syllable_count: legoSyllableCount,
      seed_position: seedNum,
      recommended_model: recommendedModel
    },

    // Vocabulary as sorted arrays (compact)
    available_vocab: {
      known: Array.from(vocab.known).sort(),
      target: Array.from(vocab.target).sort()
    },

    // Recent context (30 most recent new:true LEGOs - prioritize these for recombination)
    recent_legos: recentLegos.slice(0, 30).map(l => ({
      id: l.id,
      known: l.known,
      target: l.target
    })),

    // Generation requirements
    requirements: {
      phrase_count: 10,
      distribution: '2-2-2-4',
      rules: [
        'Every phrase MUST contain the complete LEGO',
        'All words must be in available_vocab (GATE compliance)',
        'Natural grammar in both languages'
      ]
    }
  };
}

/**
 * Generate all scaffolds for a course
 */
async function generateAllScaffolds(courseDir) {
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
  const outputDir = path.join(courseDir, 'phase3_scaffolds');

  // Load lego_pairs.json
  if (!await fs.pathExists(legoPairsPath)) {
    console.error(`❌ lego_pairs.json not found in ${courseDir}`);
    process.exit(1);
  }

  const legoPairs = await fs.readJson(legoPairsPath);
  console.log(`\n📚 Generating Phase 3 scaffolds for ${path.basename(courseDir)}`);
  console.log(`   Seeds: ${legoPairs.seeds.length}`);

  // Create output directory
  await fs.ensureDir(outputDir);

  // Track stats
  let totalLegos = 0;
  let totalNewLegos = 0;
  const seedIndex = [];

  // Process each seed
  for (const seed of legoPairs.seeds) {
    const seedLegos = {};
    let newLegosInSeed = 0;

    for (let i = 0; i < seed.legos.length; i++) {
      const lego = seed.legos[i];
      totalLegos++;

      if (lego.new) {
        totalNewLegos++;
        newLegosInSeed++;
        seedLegos[lego.id] = generateLegoScaffold(legoPairs, seed, i);
      }
    }

    // Write seed file (only if it has new LEGOs)
    if (newLegosInSeed > 0) {
      const seedFile = {
        seed_id: seed.seed_id,
        seed_pair: seed.seed_pair,
        lego_count: newLegosInSeed,
        legos: seedLegos
      };

      await fs.writeJson(
        path.join(outputDir, `${seed.seed_id}.json`),
        seedFile,
        { spaces: 2 }
      );

      seedIndex.push({
        seed_id: seed.seed_id,
        lego_count: newLegosInSeed,
        lego_ids: Object.keys(seedLegos)
      });
    }
  }

  // Write index
  const index = {
    course: path.basename(courseDir),
    generated_at: new Date().toISOString(),
    total_seeds: legoPairs.seeds.length,
    seeds_with_new_legos: seedIndex.length,
    total_legos: totalLegos,
    total_new_legos: totalNewLegos,
    seeds: seedIndex
  };

  await fs.writeJson(
    path.join(outputDir, 'index.json'),
    index,
    { spaces: 2 }
  );

  console.log(`\n✅ Generated scaffolds:`);
  console.log(`   Output: ${outputDir}`);
  console.log(`   Seeds with new LEGOs: ${seedIndex.length}`);
  console.log(`   Total new LEGOs: ${totalNewLegos}`);
  console.log(`   Index: ${outputDir}/index.json`);

  // Calculate sizes
  const files = await fs.readdir(outputDir);
  let totalSize = 0;
  for (const file of files) {
    const stat = await fs.stat(path.join(outputDir, file));
    totalSize += stat.size;
  }
  console.log(`   Total size: ${(totalSize / 1024).toFixed(1)} KB`);
  console.log(`   Avg per seed: ${(totalSize / seedIndex.length / 1024).toFixed(1)} KB`);
}

// CLI entry point
const courseDir = process.argv[2];
if (!courseDir) {
  console.error('Usage: node generate-all-scaffolds.cjs <courseDir>');
  console.error('Example: node generate-all-scaffolds.cjs public/vfs/courses/spa_for_eng_v2');
  process.exit(1);
}

generateAllScaffolds(path.resolve(courseDir));
