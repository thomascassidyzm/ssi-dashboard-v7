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
    'zho_for_eng': { known: 'English', target: 'Chinese' },
    'cmn_for_eng': { known: 'English', target: 'Chinese' },
    'cym_for_eng': { known: 'English', target: 'Welsh' },
    'cym_n_for_eng': { known: 'English', target: 'Welsh (North)' },
    'cym_s_for_eng': { known: 'English', target: 'Welsh (South)' },
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
- Generate **8-12 practice phrases** (10 is target, flexibility is OK)
- Early in the course, fewer LEGOs are available - 8 good phrases beats 10 forced ones
- Complexity is measured by ADDITIONAL LEGOs combined with the operational LEGO
- Within each tier, order phrases by syllable count (shortest first)

---

**M-LEGO SPECIAL STRUCTURE (Type: M = Molecular)**

M-LEGOs are built from component LEGOs. The basket should:
1. **Components first** - Let learner practice the parts (1-2 phrases per component)
2. **Full M-LEGO** - The complete LEGO itself (1-2 phrases)
3. **Combinations** - Then LEGO+1, LEGO+2, etc.

Example for M-LEGO "我想说" (I want to speak):
  - Component: "我想要" (uses 我想 component)
  - Component: "我说" (uses 说 component)
  - Full LEGO: "我想说" (the complete M-LEGO)
  - LEGO+1: "我想说中文" (M-LEGO + 中文)
  - LEGO+2: "我想跟你说中文" (M-LEGO + 跟你 + 中文)

---

**A-LEGO STANDARD STRUCTURE (Type: A = Atomic)**

PHRASE PROGRESSION (by ADDITIONAL LEGOs combined):
  * ~Phrases 1-2: LEGO+1 - Operational LEGO + 1 other LEGO
  * ~Phrases 3-4: LEGO+2 - Operational LEGO + 2 other LEGOs
  * ~Phrases 5-6: LEGO+3 - Operational LEGO + 3 other LEGOs
  * ~Phrases 7-10: LEGO+4+ - Operational LEGO + 4+ other LEGOs

Example for LEGO "quiero" (Spanish):
  - LEGO+1: "Quiero eso" (LEGO + eso)
  - LEGO+1: "Quiero hablar" (LEGO + hablar)
  - LEGO+2: "Quiero hablar contigo" (LEGO + hablar + contigo)
  - LEGO+3: "Quiero hablar contigo ahora" (LEGO + 3 LEGOs)
  - LEGO+4+: "Quiero hablar español contigo todos los días" (LEGO + 5 LEGOs)

---

CRITICAL RULES:
- Use ONLY vocabulary from "30 Most Recent LEGOs" above (GATE compliance!)
- Grammar: unusual/clunky is OK, WRONG is NEVER OK
- Native speakers must ALWAYS understand the meaning
- Within each tier, order phrases by syllable count (shortest first)
- Keep LEGOs as atomic units - never break them apart!

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
      { "known": "<${knownLang}>", "target": "<${targetLang} LEGO+1>" },
      { "known": "<${knownLang}>", "target": "<${targetLang} LEGO+1>" },
      { "known": "<${knownLang}>", "target": "<${targetLang} LEGO+2>" },
      { "known": "<${knownLang}>", "target": "<${targetLang} LEGO+2>" },
      { "known": "<${knownLang}>", "target": "<${targetLang} LEGO+3>" },
      { "known": "<${knownLang}>", "target": "<${targetLang} LEGO+3>" },
      { "known": "<${knownLang}>", "target": "<${targetLang} LEGO+4+>" },
      { "known": "<${knownLang}>", "target": "<${targetLang} LEGO+4+>" },
      { "known": "<${knownLang}>", "target": "<${targetLang} LEGO+4+>" },
      { "known": "<${knownLang}>", "target": "<${targetLang} LEGO+4+>" }
    ]
  }
}

NOTE: For M-LEGOs, include component phrases before the progression above.

NOTE: Server will automatically add these fields - you don't need to include them:
- "is_final_lego": Derived from LEGO ID (checks if this is the last LEGO in the seed)
  → If TRUE: Server adds the complete seed sentence as your highest practice phrase
- "phrase_count": Actual count of phrases you provided

LEGO COUNT PROGRESSION:
- LEGO+1 (phrases 1-2): Operational LEGO + 1 other LEGO
- LEGO+2 (phrases 3-4): Operational LEGO + 2 other LEGOs
- LEGO+3 (phrases 5-6): Operational LEGO + 3 other LEGOs
- LEGO+4+ (phrases 7-10): Operational LEGO + 4+ other LEGOs

WHY LEGO COUNT (not words or syllables)?
- LEGOs are atomic units the learner already knows
- Automatic GATE compliance (all LEGOs are in vocabulary)
- Consistent across all languages (Chinese, German, Spanish, etc.)
- Syllables used for ORDERING within tier (shortest first), not as targets

STRUCTURE SUMMARY:
- **M-LEGOs**: Components (1-2 each) → Full LEGO (1-2) → Combinations (~2-2-2-4)
- **A-LEGOs**: ~2 LEGO+1, ~2 LEGO+2, ~2 LEGO+3, ~4 LEGO+4+

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
    'A': 'Atomic - Use LEGO+1/+2/+3/+4+ progression',
    'M': 'Molecular - Components first, then full LEGO, then combinations',
    'F': 'Functional - Complex phrase (use A-LEGO structure)',
    'X': 'Extra - Advanced pattern (use A-LEGO structure)'
  };
  return types[type] || 'Use A-LEGO structure';
}

module.exports = { generateTextScaffold };
