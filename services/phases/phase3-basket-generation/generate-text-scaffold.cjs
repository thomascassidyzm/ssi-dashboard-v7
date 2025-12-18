/**
 * Generate human-readable text scaffold for Phase 5 basket generation
 *
 * This replaces the JSON blob approach with clear, helpful text that:
 * - Shows correct order: known (learner's language) → target (learning language)
 * - Includes 10 most recent seed sentences
 * - Includes 30 most recent LEGOs
 * - Shows current_seed_earlier_legos correctly
 * - Provides clear output template with placeholders
 * - Language-agnostic: works for any course
 */

/**
 * Map course code to readable language names
 */
function getLanguageNames(courseCode) {
  const courseMap = {
    'spa_for_eng': { known: 'English', target: 'Spanish' },
    'cmn_for_eng': { known: 'English', target: 'Chinese' },
    'cym_for_eng': { known: 'English', target: 'Welsh' },
    'eng_for_spa': { known: 'Spanish', target: 'English' }
  };

  return courseMap[courseCode] || { known: 'Known Language', target: 'Target Language' };
}

/**
 * Generate text scaffold for a single LEGO
 *
 * @param {object} lego - LEGO to generate scaffold for
 * @param {object} legoPairs - Full lego_pairs.json data
 * @param {object} scaffoldData - Pre-computed scaffold data from phase5_scaffolds
 * @returns {string} Human-readable text scaffold
 */
function generateTextScaffold(lego, legoPairs, scaffoldData) {
  const { legoId, seed, known, target, type } = lego;

  // Get language names from course code
  const courseCode = legoPairs.course_code || legoPairs.course || 'unknown';
  const { known: knownLang, target: targetLang } = getLanguageNames(courseCode);

  // Find seed info
  const seedInfo = legoPairs.seeds.find(s => s.seed_id === seed);
  const seedPair = seedInfo?.seed_pair || { known: '', target: '' };

  // Get LEGOs in this seed
  const seedLegos = seedInfo?.legos || [];
  const legoIndex = seedLegos.findIndex(l => l.id === legoId);
  const isFinalLego = legoIndex === seedLegos.length - 1;

  // Get earlier LEGOs in this seed (only with index < current)
  const currentSeedEarlierLegos = seedLegos
    .slice(0, legoIndex)
    .filter(l => l.new && l.lego)
    .map(l => `  - ${l.id}: "${l.lego.known}" → "${l.lego.target}"`);

  // Get 10 most recent seed sentences (looking back from current seed)
  const recentSeeds = getRecentSeeds(legoPairs, seed, 10);

  // Get 30 most recent LEGOs (looking back from current LEGO)
  const recentLegos = getRecentLegos(legoPairs, seed, legoId, 30);

  // Count available LEGOs
  const availableLegoCount = currentSeedEarlierLegos.length + recentLegos.length;

  // Generate scaffold text
  return `
=== LEGO: ${legoId} ===
Known (${knownLang}): "${known}"
Target (${targetLang}): "${target}"
Type: ${type} (${getTypeDescription(type)})

SEED CONTEXT:
${seed}: "${seedPair.known}"  (${knownLang})
       "${seedPair.target}"  (${targetLang})
Is Final LEGO: ${isFinalLego ? 'YES - This is the last LEGO in this seed! Server will add complete seed sentence.' : 'NO - More LEGOs coming in this seed.'}
LEGO Position: ${legoIndex + 1} of ${seedLegos.length} in this seed

AVAILABLE VOCABULARY (GATE Compliance):
Total available LEGOs: ${availableLegoCount}

Earlier in THIS seed (${seed}):
${currentSeedEarlierLegos.length > 0 ? currentSeedEarlierLegos.join('\n') : '  (none - this is the first LEGO in this seed)'}

10 Most Recent Seed Sentences:
${recentSeeds.join('\n')}

30 Most Recent LEGOs:
${recentLegos.join('\n')}

GENERATION REQUIREMENTS:
- Generate 10 practice phrases with progressive complexity
- Complexity is measured by ADDITIONAL SYLLABLES in the TARGET language
  (beyond the LEGO itself - the LEGO's syllables are fixed)

SYLLABLE COUNTING (Language-Agnostic):
- Count syllables in the TARGET language output
- This works for ANY language:
  * Chinese: each character ≈ 1 syllable (我 = 1, 想要 = 2)
  * Spanish/Italian: count vowel sounds (quiero = 2, recordar = 3)
  * German: count vowel sounds even in compounds (Freundschaft = 2)
  * English: standard syllable counting (remember = 3)
- Word count is NOT a good proxy (German compounds, Chinese, etc.)

PHRASE PROGRESSION (by ADDITIONAL target syllables beyond the LEGO):
  * Phrases 1-2: DEBUT (+1-2 syllables) - Minimal context around LEGO
  * Phrases 3-4: EARLY (+3-4 syllables) - Short additional context
  * Phrases 5-6: MIDDLE (+5-7 syllables) - Medium context with 1-2 PREV LEGOs
  * Phrases 7-10: ETERNAL (+8+ syllables) - Full sentences with multiple PREV LEGOs

Example for LEGO "quiero" (2 syllables in Spanish):
  - DEBUT: "Quiero agua" → +2 syllables (a-gua) = 4 total ✓
  - EARLY: "Quiero ir contigo" → +5 syllables = 7 total ✓
  - MIDDLE: "Quiero aprender a cocinar" → +8 syllables = 10 total ✓
  - ETERNAL: "Quiero que me ayudes con esto" → +9 syllables = 11 total ✓

- Use ONLY vocabulary from "Available Vocabulary" above (GATE compliance!)
- Each phrase must be natural and meaningful in both languages
- Use extended thinking to count syllables accurately for the target language
- Progressive syllable count creates a natural cognitive load curve

FINAL LEGO RULE (Server handles automatically):
- If this is the last LEGO in the seed, server adds the complete seed sentence as phrase #10
- You can generate 9-10 phrases - server will ensure the seed sentence is included
- This ensures learners practice the full target sentence!

OUTPUT FORMAT (EXACT - Copy this structure and fill in your phrases):
{
  "${legoId}": {
    "lego": {
      "known": "${known}",
      "target": "${target}"
    },
    "practice_phrases": [
      { "known": "<${knownLang}>", "target": "<${targetLang} DEBUT +1-2 syl>" },
      { "known": "<${knownLang}>", "target": "<${targetLang} DEBUT +1-2 syl>" },
      { "known": "<${knownLang}>", "target": "<${targetLang} EARLY +3-4 syl>" },
      { "known": "<${knownLang}>", "target": "<${targetLang} EARLY +3-4 syl>" },
      { "known": "<${knownLang}>", "target": "<${targetLang} MIDDLE +5-7 syl>" },
      { "known": "<${knownLang}>", "target": "<${targetLang} MIDDLE +5-7 syl>" },
      { "known": "<${knownLang}>", "target": "<${targetLang} ETERNAL +8+ syl>" },
      { "known": "<${knownLang}>", "target": "<${targetLang} ETERNAL +8+ syl>" },
      { "known": "<${knownLang}>", "target": "<${targetLang} ETERNAL +8+ syl>" },
      { "known": "<${knownLang}>", "target": "<${targetLang} ETERNAL +8+ syl>" }
    ]
  }
}

NOTE: Server will automatically add these fields - you don't need to include them:
- "is_final_lego": Derived from LEGO ID (checks if this is the last LEGO in the seed)
  → If TRUE: Server adds the complete seed sentence as your highest practice phrase
- "phrase_count": Actual count of phrases you provided

SYLLABLE PROGRESSION GUIDELINES (Language-Agnostic):
- DEBUT (1-2): +1-2 target syllables beyond LEGO - Minimal context, easiest recall
- EARLY (3-4): +3-4 target syllables beyond LEGO - Short additional context
- MIDDLE (5-6): +5-7 target syllables beyond LEGO - Building complexity with PREV LEGOs
- ETERNAL (7-10): +8+ target syllables beyond LEGO - Full sentences, highest cognitive load

WHY SYLLABLES (not words)?
- Language-agnostic: works for Chinese (1 char = 1 syl), German compounds, etc.
- Correlates with cognitive load: more syllables = more to process and produce
- The LEGO syllable count is FIXED - we measure ADDITIONAL syllables only

CRITICAL FORMAT RULES:
✅ "lego": { "known": "English", "target": "Spanish" } - Object with labels
✅ "practice_phrases" - Exact key name (not "phrases")
✅ Each phrase MUST be object: { "known": "English", "target": "Spanish" }
✅ Labels are CONSISTENT: "known" = English (input), "target" = Spanish (output)
✅ Known language FIRST, target language SECOND (everywhere)
✅ NO "difficulty" field in phrases
❌ NEVER use array format: ["Spanish", "English"] or ["English", "Spanish", null, 1]
❌ NEVER use language codes: { "es": "...", "en": "..." }
❌ NEVER use different key names like "phrases" or "baskets"

FORMAT SUMMARY:
- CONSISTENT labeled objects throughout
- Always: { "known": "English", "target": "Spanish" }
- lego field: object with labels (NEW - consistent format)
- practice_phrases: array of objects with labels

===END LEGO ${legoId}===
`.trim();
}

/**
 * Get recent seed sentences (looking back from current seed)
 *
 * @param {object} legoPairs - Full lego_pairs.json
 * @param {string} currentSeed - Current seed ID (e.g., "S0024")
 * @param {number} count - Number of recent seeds to retrieve
 * @returns {array} Array of formatted seed strings
 */
function getRecentSeeds(legoPairs, currentSeed, count) {
  const currentSeedNum = parseInt(currentSeed.replace('S', ''));
  const recentSeeds = [];

  // Look back from current seed (not including current)
  for (let i = currentSeedNum - 1; i > 0 && recentSeeds.length < count; i--) {
    const seedId = `S${String(i).padStart(4, '0')}`;
    const seedInfo = legoPairs.seeds.find(s => s.seed_id === seedId);

    if (seedInfo && seedInfo.seed_pair) {
      const { known, target } = seedInfo.seed_pair;
      recentSeeds.push(`  - ${seedId}: "${known}" → "${target}"`);
    }
  }

  if (recentSeeds.length === 0) {
    return ['  (no previous seeds available)'];
  }

  return recentSeeds;
}

/**
 * Get recent LEGOs (looking back from current LEGO)
 *
 * @param {object} legoPairs - Full lego_pairs.json
 * @param {string} currentSeed - Current seed ID
 * @param {string} currentLegoId - Current LEGO ID
 * @param {number} count - Number of recent LEGOs to retrieve
 * @returns {array} Array of formatted LEGO strings
 */
function getRecentLegos(legoPairs, currentSeed, currentLegoId, count) {
  const currentSeedNum = parseInt(currentSeed.replace('S', ''));
  const currentLegoNum = parseInt(currentLegoId.split('L')[1]);
  const recentLegos = [];

  // Start from the LEGO just before current
  let seedNum = currentSeedNum;
  let legoNum = currentLegoNum - 1;

  while (recentLegos.length < count && seedNum > 0) {
    const seedId = `S${String(seedNum).padStart(4, '0')}`;
    const seedInfo = legoPairs.seeds.find(s => s.seed_id === seedId);

    if (!seedInfo) {
      seedNum--;
      continue;
    }

    // Get LEGOs from this seed
    const seedLegos = seedInfo.legos || [];

    // If we're in the current seed, only get LEGOs before current
    if (seedNum === currentSeedNum) {
      for (let i = legoNum; i >= 0 && recentLegos.length < count; i--) {
        const lego = seedLegos[i];
        if (lego && lego.new && lego.lego) {
          recentLegos.push(`  - ${lego.id}: "${lego.lego.known}" → "${lego.lego.target}"`);
        }
      }
    } else {
      // For previous seeds, get all LEGOs (newest first)
      for (let i = seedLegos.length - 1; i >= 0 && recentLegos.length < count; i--) {
        const lego = seedLegos[i];
        if (lego && lego.new && lego.lego) {
          recentLegos.push(`  - ${lego.id}: "${lego.lego.known}" → "${lego.lego.target}"`);
        }
      }
    }

    // Move to previous seed
    seedNum--;
    legoNum = 999; // Reset to large number so we get all LEGOs from previous seeds
  }

  if (recentLegos.length === 0) {
    return ['  (no previous LEGOs available)'];
  }

  return recentLegos;
}

/**
 * Get type description
 */
function getTypeDescription(type) {
  const types = {
    'A': 'Atomic - Simple building block',
    'M': 'Molecular - Combined LEGOs',
    'F': 'Functional - Complex phrase',
    'X': 'Extra - Advanced pattern'
  };
  return types[type] || 'Medium difficulty';
}

module.exports = { generateTextScaffold };
