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
- Phrase length progression (HEURISTIC - flexible guidelines):
  * Phrases 1-2: SHORT (2-3 words each)
  * Phrases 3-4: MEDIUM (3-4 words each)
  * Phrases 5-6: LONGER (4-6 words each)
  * Phrases 7-10: LONGEST (6+ words, aim for 7-10 words average)
- Use ONLY vocabulary from "Available Vocabulary" above (GATE compliance!)
- Each phrase must be natural and meaningful in both languages
- Use extended thinking to ensure linguistic accuracy
- Progressive length creates natural learning curve

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
      { "known": "<${knownLang} 2-3 words>", "target": "<${targetLang} 2-3 words>" },
      { "known": "<${knownLang} 2-3 words>", "target": "<${targetLang} 2-3 words>" },
      { "known": "<${knownLang} 3-4 words>", "target": "<${targetLang} 3-4 words>" },
      { "known": "<${knownLang} 3-4 words>", "target": "<${targetLang} 3-4 words>" },
      { "known": "<${knownLang} 4-6 words>", "target": "<${targetLang} 4-6 words>" },
      { "known": "<${knownLang} 4-6 words>", "target": "<${targetLang} 4-6 words>" },
      { "known": "<${knownLang} 7-10 words>", "target": "<${targetLang} 7-10 words>" },
      { "known": "<${knownLang} 7-10 words>", "target": "<${targetLang} 7-10 words>" },
      { "known": "<${knownLang} 7-10 words>", "target": "<${targetLang} 7-10 words>" },
      { "known": "<${knownLang} 7-10 words>", "target": "<${targetLang} 7-10 words>" }
    ]
  }
}

NOTE: Server will automatically add these fields - you don't need to include them:
- "is_final_lego": Derived from LEGO ID (checks if this is the last LEGO in the seed)
  → If TRUE: Server adds the complete seed sentence as your highest practice phrase
- "phrase_count": Actual count of phrases you provided

PHRASE LENGTH GUIDELINES (Heuristics):
- SHORT (1-2): 2-3 words - Simple, direct usage
- MEDIUM (3-4): 3-4 words - Adding context
- LONGER (5-6): 4-6 words - More complete thoughts
- LONGEST (7-10): 6+ words, targeting 7-10 words average - Full natural sentences

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
