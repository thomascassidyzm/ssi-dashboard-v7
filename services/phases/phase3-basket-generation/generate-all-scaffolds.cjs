#!/usr/bin/env node
/**
 * Pre-generate ALL Phase 3 scaffolds for a course
 *
 * READS FROM SUPABASE (database is SSoT)
 *
 * Usage:
 *   node generate-all-scaffolds.cjs <courseCode>
 *   node generate-all-scaffolds.cjs zho_for_eng
 *
 * Output structure:
 *   <vfsRoot>/<courseCode>/phase3_scaffolds/
 *     ├── index.json           # Manifest: {seeds: [...], totalLegos: N, generatedAt: ...}
 *     ├── S0001.json           # All LEGOs for seed S0001
 *     ├── S0002.json           # All LEGOs for seed S0002
 *     └── ...
 */

const fs = require('fs-extra');
const path = require('path');

// Get Supabase client from shared service
const getSupabase = () => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    }

    return createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.error('Failed to initialize Supabase:', error.message);
    process.exit(1);
  }
};

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
  'licence': 'license',
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
  if (!text) return [];
  const matches = text.toLowerCase().match(/[\wáéíóúüñàèìòùâêîôûäëïöüç\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]+/g);
  if (!matches) return [];
  return matches.map(normalizeSpelling);
}

/**
 * Count syllables in text (language-agnostic)
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
 */
function assignModelTier(seedNum, vocabSize, legoSyllableCount, legoType) {
  if (vocabSize < 15) return 'opus';
  if (vocabSize < 30) return 'sonnet';
  if (legoType === 'M' && legoSyllableCount >= 3) return 'sonnet';
  if (vocabSize < 60) return 'sonnet';
  return 'haiku';
}

/**
 * Build available vocabulary using TAUGHT UNITS only:
 * 1. Intact A-LEGOs learned before current position
 * 2. Intact M-LEGOs learned before current position
 * 3. Components of M-LEGOs learned before current position
 *
 * This is language-agnostic - works for word-based (Italian) and character-based (Chinese) languages.
 * We don't extract words/characters - we use the actual taught units.
 *
 * @param {Array} allLegos - All LEGOs from DB (must include 'components' column)
 * @param {number} targetSeedNum - Current seed number
 * @param {number} targetLegoIndex - Current LEGO index
 * @returns {Object} { known: string[], target: string[] } - Arrays of taught units (not Sets)
 */
function buildTaughtUnitsVocab(allLegos, targetSeedNum, targetLegoIndex) {
  const knownUnits = [];
  const targetUnits = [];

  // Get all LEGOs learned BEFORE current position
  const learnedLegos = allLegos.filter(lego =>
    lego.seed_number < targetSeedNum ||
    (lego.seed_number === targetSeedNum && lego.lego_index < targetLegoIndex)
  );

  for (const lego of learnedLegos) {
    // Add the intact LEGO (A-type or M-type)
    if (lego.known_text) knownUnits.push(lego.known_text);
    if (lego.target_text) targetUnits.push(lego.target_text);

    // For M-types, also add their explicit components
    if (lego.type === 'M' && lego.components && Array.isArray(lego.components)) {
      for (const comp of lego.components) {
        // Handle all three formats: { k, t }, { known, target }, { known_text, target_text }
        const knownComp = comp.k || comp.known || comp.known_text;
        const targetComp = comp.t || comp.target || comp.target_text;
        if (knownComp) knownUnits.push(knownComp);
        if (targetComp) targetUnits.push(targetComp);
      }
    }
  }

  // Remove duplicates while preserving as arrays (not Sets)
  return {
    known: [...new Set(knownUnits)],
    target: [...new Set(targetUnits)]
  };
}

// Legacy wrapper for backwards compatibility (returns Sets with extracted words)
// TODO: Remove once all code is updated to use buildTaughtUnitsVocab
function buildVocabForLego(allSeeds, allLegos, seedNumber, legoIndex) {
  const taught = buildTaughtUnitsVocab(allLegos, seedNumber, legoIndex);
  // Convert to Sets and extract words for backwards compatibility
  const knownVocab = new Set();
  const targetVocab = new Set();
  for (const unit of taught.known) {
    extractWords(unit).forEach(w => knownVocab.add(w));
  }
  for (const unit of taught.target) {
    extractWords(unit).forEach(w => targetVocab.add(w));
  }
  return { known: knownVocab, target: targetVocab };
}

/**
 * Get recent NEW LEGOs for context (for recombination priority)
 */
function getRecentLegos(allLegos, seedNumber, legoIndex, count = 30) {
  const result = [];

  // Get all new LEGOs before this position
  const newLegosBefore = allLegos.filter(l =>
    l.is_new &&
    (l.seed_number < seedNumber ||
     (l.seed_number === seedNumber && l.lego_index < legoIndex))
  );

  // Sort by position descending (most recent first)
  newLegosBefore.sort((a, b) => {
    if (b.seed_number !== a.seed_number) return b.seed_number - a.seed_number;
    return b.lego_index - a.lego_index;
  });

  // Take the most recent N
  for (const lego of newLegosBefore.slice(0, count)) {
    result.push({
      id: lego.lego_id,
      known: lego.known_text,
      target: lego.target_text,
      type: lego.type
    });
  }

  return result;
}

/**
 * Generate scaffold for a single LEGO
 */
function generateLegoScaffold(allSeeds, allLegos, lego, seedLegos) {
  const seedNumber = lego.seed_number;
  const legoIndex = lego.lego_index;

  // Get available vocabulary as TAUGHT UNITS (intact LEGOs + M-LEGO components)
  const taughtUnits = buildTaughtUnitsVocab(allLegos, seedNumber, legoIndex);

  // Get recent LEGOs for context
  const recentLegos = getRecentLegos(allLegos, seedNumber, legoIndex, 30);

  // Is this the final LEGO in the seed?
  const maxLegoIndex = Math.max(...seedLegos.map(l => l.lego_index));
  const isFinalLego = legoIndex === maxLegoIndex;

  // Calculate difficulty metrics (use count of taught units)
  const vocabSize = taughtUnits.target.length;
  const legoSyllableCount = countSyllables(lego.target_text);
  const recommendedModel = assignModelTier(seedNumber, vocabSize, legoSyllableCount, lego.type);

  // Build compact scaffold
  return {
    lego_id: lego.lego_id,
    lego: {
      known: lego.known_text,
      target: lego.target_text
    },
    type: lego.type,
    is_new: lego.is_new,
    is_final_lego: isFinalLego,
    position: `${legoIndex}/${maxLegoIndex}`,

    // Difficulty metrics for model selection
    difficulty: {
      vocab_size: vocabSize,
      lego_syllable_count: legoSyllableCount,
      seed_position: seedNumber,
      recommended_model: recommendedModel
    },

    // Available vocabulary as TAUGHT UNITS (intact LEGOs + M-LEGO components)
    // NOT extracted words - these are the actual units the learner has been taught
    // Phrases must be built from combinations of these units
    available_vocab: {
      known: taughtUnits.known.sort(),
      target: taughtUnits.target.sort()
    },

    // Recent context (30 most recent new:true LEGOs)
    recent_legos: recentLegos.map(l => ({
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
 * Generate all scaffolds for a course (reads from Supabase)
 */
async function generateAllScaffolds(courseCode) {
  const supabase = getSupabase();

  // Determine output directory
  const vfsRoot = process.env.VFS_ROOT || path.join(__dirname, '../../../public/vfs/courses');
  const outputDir = path.join(vfsRoot, courseCode, 'phase3_scaffolds');

  console.log(`\n📚 Generating Phase 3 scaffolds for ${courseCode}`);
  console.log(`   Reading from Supabase (database is SSoT)`);

  // Fetch all seeds for this course
  const { data: allSeeds, error: seedError } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', courseCode)
    .order('seed_number');

  if (seedError) {
    console.error(`❌ Failed to fetch seeds:`, seedError.message);
    process.exit(1);
  }

  console.log(`   Seeds: ${allSeeds.length}`);

  // Fetch ALL LEGOs for this course (need all for vocab building)
  const { data: allLegos, error: legoError } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, lego_id, type, is_new, known_text, target_text, components')
    .eq('course_code', courseCode)
    .order('seed_number')
    .order('lego_index');

  if (legoError) {
    console.error(`❌ Failed to fetch LEGOs:`, legoError.message);
    process.exit(1);
  }

  const totalLegos = allLegos.length;
  const newLegos = allLegos.filter(l => l.is_new);
  console.log(`   Total LEGOs: ${totalLegos}`);
  console.log(`   NEW LEGOs (is_new=true): ${newLegos.length}`);

  // Create output directory
  await fs.ensureDir(outputDir);

  // Group LEGOs by seed
  const legosBySeed = {};
  for (const lego of allLegos) {
    if (!legosBySeed[lego.seed_number]) {
      legosBySeed[lego.seed_number] = [];
    }
    legosBySeed[lego.seed_number].push(lego);
  }

  // Track stats
  const seedIndex = [];
  let totalNewLegos = 0;

  // Process each seed that has new LEGOs
  for (const seed of allSeeds) {
    const seedLegos = legosBySeed[seed.seed_number] || [];
    const newLegosInSeed = seedLegos.filter(l => l.is_new);

    if (newLegosInSeed.length === 0) continue;

    totalNewLegos += newLegosInSeed.length;

    // Generate scaffolds for new LEGOs in this seed
    const seedScaffolds = {};
    for (const lego of newLegosInSeed) {
      seedScaffolds[lego.lego_id] = generateLegoScaffold(allSeeds, allLegos, lego, seedLegos);
    }

    // Write seed file
    const seedId = `S${String(seed.seed_number).padStart(4, '0')}`;
    const seedFile = {
      seed_id: seedId,
      seed_pair: {
        known: seed.known_text,
        target: seed.target_text
      },
      lego_count: newLegosInSeed.length,
      legos: seedScaffolds
    };

    await fs.writeJson(
      path.join(outputDir, `${seedId}.json`),
      seedFile,
      { spaces: 2 }
    );

    seedIndex.push({
      seed_id: seedId,
      lego_count: newLegosInSeed.length,
      lego_ids: Object.keys(seedScaffolds)
    });
  }

  // Write index
  const index = {
    course: courseCode,
    generated_at: new Date().toISOString(),
    source: 'supabase',
    total_seeds: allSeeds.length,
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
  if (seedIndex.length > 0) {
    console.log(`   Avg per seed: ${(totalSize / seedIndex.length / 1024).toFixed(1)} KB`);
  }

  return { totalNewLegos, seedCount: seedIndex.length };
}

// Export for programmatic use
module.exports = { generateAllScaffolds };

// CLI entry point (only runs when executed directly)
if (require.main === module) {
  // Load .env if available
  try {
    require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
  } catch (e) {
    // dotenv not available, rely on environment
  }

  const courseCode = process.argv[2];
  if (!courseCode) {
    console.error('Usage: node generate-all-scaffolds.cjs <courseCode>');
    console.error('Example: node generate-all-scaffolds.cjs zho_for_eng');
    process.exit(1);
  }

  generateAllScaffolds(courseCode).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
