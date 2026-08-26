#!/usr/bin/env node

/**
 * Phase 3: Practice Basket Generation Server (DATABASE-ONLY ARCHITECTURE)
 *
 * IMPORTANT: DATABASE-ONLY ARCHITECTURE (January 2026)
 * =====================================================
 * Course data is stored EXCLUSIVELY in Supabase, NOT in JSON files.
 * This service reads and writes directly to Supabase:
 * - Reads LEGOs from course_legos table
 * - Writes practice phrases to course_practice_phrases table
 *
 * JSON files (lego_pairs.json, lego_baskets.json) are DEPRECATED.
 * Do NOT read course data from JSON files - always query Supabase.
 *
 * Key Methods Used:
 * - getLegosByCourse(courseCode, { status: 'released', isNew: true }) - read LEGOs needing baskets
 * - savePracticePhrase(courseCode, phraseData) - save generated phrases to course_practice_phrases
 *
 * Port: 3459 (auto-configured by start-automation.js)
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const path = require('path');

// Database service for database-first operations
const courseDataService = require('../../course-data-service.cjs');
// Same predicate every course-builder write path uses, so this pipeline drops
// bare-LEGO phrases the same way and at the same place they do.
const { partitionBareLegoPhrases } = require('../../course-builder/lib/phrase-structure.cjs');

// Load environment (set by start-automation.js)
const PORT = process.env.PORT || 3459;
const VFS_ROOT = process.env.VFS_ROOT;
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
const SERVICE_NAME = process.env.SERVICE_NAME || 'Phase 3 (Baskets) [DB-First]';
// External URLs for prompts sent to remote Claude browsers
const ngrokUrl = process.env.EXTERNAL_URL || process.env.ORCHESTRATOR_URL || 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev';
// Direct upload endpoint via ngrok - uses minimal /upload-basket (DB-only, token efficient)
const BASKET_UPLOAD_URL = `${ngrokUrl}/upload-basket`;

// Load configuration
const { loadConfig } = require('../../shared/config-loader.cjs');
const { getModeConfig, SEED_COUNTS, MODES } = require('../../config/course-mode-loader.cjs');

// Unified agent spawner (CLI or browser)
const unifiedSpawner = require('../../shared/spawn-agent-unified.cjs');

// Validate config
if (!VFS_ROOT) {
  console.error('Error: VFS_ROOT not set');
  process.exit(1);
}

// Initialize Express
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Active jobs (courseCode -> job state)
const activeJobs = new Map();

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

/**
 * Common British/American spelling equivalents
 */
const SPELLING_VARIANTS = {
  'practise': 'practice', 'practising': 'practicing', 'practised': 'practiced',
  'recognise': 'recognize', 'recognising': 'recognizing', 'recognised': 'recognized',
  'organise': 'organize', 'organising': 'organizing', 'organised': 'organized',
  'realise': 'realize', 'realising': 'realizing', 'realised': 'realized',
  'colour': 'color', 'favour': 'favor', 'honour': 'honor', 'behaviour': 'behavior',
  'neighbour': 'neighbor', 'travelling': 'traveling', 'centre': 'center',
  'theatre': 'theater', 'defence': 'defense', 'grey': 'gray'
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
 * Count LEGOs present in a phrase
 */
function countLegosInPhrase(phraseTarget, legoTargets) {
  return legoTargets.filter(legoTarget =>
    phraseTarget.toLowerCase().includes(legoTarget.toLowerCase())
  ).length;
}

/**
 * Format LEGO ID from seed number and lego index
 */
function formatSeedId(seedNumber) {
  return `S${String(seedNumber).padStart(4, '0')}`;
}

function formatLegoId(seedNumber, legoIndex) {
  return `S${String(seedNumber).padStart(4, '0')}L${String(legoIndex).padStart(2, '0')}`;
}

/**
 * Parse LEGO ID to extract seed number and lego index
 */
function parseLegoId(legoId) {
  const match = legoId.match(/S(\d+)L(\d+)/i);
  if (!match) return { seedNumber: 0, legoIndex: 0 };
  return {
    seedNumber: parseInt(match[1], 10),
    legoIndex: parseInt(match[2], 10)
  };
}

// ==============================================================================
// DATABASE-FIRST SCAFFOLD BUILDING
// ==============================================================================

/**
 * Build taught units vocabulary from database LEGOs
 * This is the vocabulary available at a specific LEGO position
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
        const knownComp = comp.k || comp.known || comp.known_text;
        const targetComp = comp.t || comp.target || comp.target_text;
        if (knownComp) knownUnits.push(knownComp);
        if (targetComp) targetUnits.push(targetComp);
      }
    }
  }

  return {
    known: [...new Set(knownUnits)],
    target: [...new Set(targetUnits)]
  };
}

/**
 * Get recent NEW LEGOs for recombination priority
 */
function getRecentLegos(allLegos, seedNumber, legoIndex, count = 30) {
  const newLegosBefore = allLegos.filter(l =>
    l.is_new &&
    (l.seed_number < seedNumber ||
     (l.seed_number === seedNumber && l.lego_index < legoIndex))
  );

  // Sort by position descending (most recent first)
  newLegosBefore.sort((a, b) => {
    if (a.seed_number !== b.seed_number) return b.seed_number - a.seed_number;
    return b.lego_index - a.lego_index;
  });

  return newLegosBefore.slice(0, count).map(l => ({
    legoId: formatLegoId(l.seed_number, l.lego_index),
    known: l.known_text,
    target: l.target_text,
    type: l.type
  }));
}

/**
 * Build scaffold data for a LEGO directly from database
 */
function buildLegoScaffold(lego, allLegos) {
  const vocab = buildTaughtUnitsVocab(allLegos, lego.seed_number, lego.lego_index);
  const recentLegos = getRecentLegos(allLegos, lego.seed_number, lego.lego_index);

  return {
    lego_id: formatLegoId(lego.seed_number, lego.lego_index),
    seed_number: lego.seed_number,
    lego_index: lego.lego_index,
    lego: {
      known: lego.known_text,
      target: lego.target_text
    },
    type: lego.type || 'M',
    is_new: lego.is_new,
    available_vocab: vocab,
    recent_legos: recentLegos,
    vocab_size: vocab.known.length + vocab.target.length
  };
}

// ==============================================================================
// V9 SCAFFOLD FORMAT - ELEGANT [BRACKETS] IN CONTEXT
// ==============================================================================

/**
 * Format a sentence with [brackets] around NEW LEGOs
 * This shows agents which parts are recently learned and should be prioritized
 */
function formatSentenceWithBrackets(sentence, legos) {
  if (!sentence) return '';
  let result = sentence;

  // Sort LEGOs by text length descending (replace longer ones first)
  const sortedLegos = [...legos]
    .filter(l => l.is_new && (l.known_text || l.target_text))
    .sort((a, b) => {
      const aLen = (a.known_text || '').length;
      const bLen = (b.known_text || '').length;
      return bLen - aLen;
    });

  // Track replacements with placeholders to avoid double-bracketing
  const bracketed = new Map();
  let idx = 0;

  for (const lego of sortedLegos) {
    const text = lego.known_text;
    if (!text) continue;

    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');

    if (regex.test(result)) {
      const placeholder = `__BRACKET_${idx}__`;
      bracketed.set(placeholder, `[${text}]`);
      result = result.replace(regex, placeholder);
      idx++;
    }
  }

  // Restore placeholders
  for (const [placeholder, bracketedText] of bracketed) {
    result = result.replace(placeholder, bracketedText);
  }

  return result;
}

/**
 * Format target sentence with [brackets] - handles CJK characters
 */
function formatTargetWithBrackets(sentence, legos) {
  if (!sentence) return '';
  let result = sentence;

  const sortedLegos = [...legos]
    .filter(l => l.is_new && l.target_text)
    .sort((a, b) => (b.target_text || '').length - (a.target_text || '').length);

  const bracketed = new Map();
  let idx = 0;

  for (const lego of sortedLegos) {
    const text = lego.target_text;
    if (!text) continue;

    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // For CJK, don't require word boundaries
    const isCJK = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/.test(text);
    const regex = isCJK ? new RegExp(escaped, 'g') : new RegExp(`\\b${escaped}\\b`, 'gi');

    if (regex.test(result)) {
      const placeholder = `__TBRACKET_${idx}__`;
      bracketed.set(placeholder, `[${text}]`);
      result = result.replace(regex, placeholder);
      idx++;
    }
  }

  for (const [placeholder, bracketedText] of bracketed) {
    result = result.replace(placeholder, bracketedText);
  }

  return result;
}

/**
 * Build v9 elegant scaffold with [brackets] showing NEW LEGOs in context
 */
async function buildV9Scaffold(courseCode, lego, allLegos, seedSentences) {
  const seedNumber = lego.seed_number;
  const legoIndex = lego.lego_index;
  const legoId = formatLegoId(seedNumber, legoIndex);

  // Get seed sentence
  const seedSentence = seedSentences.get(seedNumber) || { known: '', target: '' };

  // Get LEGOs for this seed (for bracketing)
  const seedLegos = allLegos.filter(l => l.seed_number === seedNumber);

  // Get recent NEW LEGOs (30 most recent before current position)
  const recentLegos = getRecentLegos(allLegos, seedNumber, legoIndex, 30);

  // Get seeds containing recent LEGOs
  const recentSeedNumbers = [...new Set(recentLegos.map(l => {
    const match = l.legoId.match(/S(\d+)L/);
    return match ? parseInt(match[1], 10) : 0;
  }).filter(n => n > 0))].sort((a, b) => b - a).slice(0, 12);

  // Format current seed with brackets
  const currentKnown = formatSentenceWithBrackets(seedSentence.known, seedLegos);
  const currentTarget = formatTargetWithBrackets(seedSentence.target, seedLegos);

  // Build recent patterns section
  const recentPatterns = [];
  for (const sn of recentSeedNumbers) {
    const ss = seedSentences.get(sn);
    if (!ss) continue;
    const sLegos = allLegos.filter(l => l.seed_number === sn);
    recentPatterns.push({
      seedId: formatSeedId(sn),
      known: formatSentenceWithBrackets(ss.known, sLegos),
      target: formatTargetWithBrackets(ss.target, sLegos)
    });
  }

  // Determine language names
  const [targetLang, , knownLang] = courseCode.split('_');
  const langNames = {
    'eng': 'English', 'ita': 'Italian', 'spa': 'Spanish', 'zho': 'Chinese',
    'cmn': 'Mandarin', 'fra': 'French', 'deu': 'German', 'por': 'Portuguese',
    'jpn': 'Japanese', 'kor': 'Korean', 'cym': 'Welsh'
  };
  const knownName = langNames[knownLang] || knownLang;
  const targetName = langNames[targetLang] || targetLang;

  // Build the elegant v9 scaffold with pedagogical framing
  let scaffold = `=== PHASE 3: BASKET GENERATION ===

You are a WORLD-CLASS LANGUAGE TEACHER creating practice phrases.

Course: ${courseCode}
Languages: ${knownName} → ${targetName}

---

## YOUR LEGO: [${lego.known_text}] / [${lego.target_text}]

From seed ${formatSeedId(seedNumber)}:
  "${currentKnown}"
  "${currentTarget}"

---

## RECENT PATTERNS ([brackets] = NEW LEGOs - prioritize these for recombination)

`;

  for (const p of recentPatterns) {
    scaffold += `${p.seedId}: "${p.known}"
       "${p.target}"

`;
  }

  scaffold += `---

## THE SSi METHOD: LEGO Recombination

You're creating practice phrases that help learners RECOMBINE vocabulary.
- Each [bracketed] item is a LEGO - a vocabulary building block
- Non-bracketed words (to, the, a, is, etc.) are GRAMMAR GLUE - you MUST include them!
- Example: "[I] [want] to [speak]" → the "to" is essential grammar, not a LEGO

## CRITICAL: Do NOT just concatenate LEGOs!

❌ WRONG: "I want speak Chinese" (missing "to")
✅ RIGHT: "I want to speak Chinese" (natural English grammar)

❌ WRONG: "I learn Chinese" (grammatically awkward without context)
✅ RIGHT: "I'm learning Chinese" or "I want to learn Chinese"

Phrases MUST sound like something a native speaker would actually say.

## TASK: Generate 15-20 practice phrases containing [${lego.known_text}] / [${lego.target_text}]

### Guidelines:
- Write COMPLETE, NATURAL sentences - not LEGO concatenations
- PRIORITIZE [bracketed] LEGOs from recent patterns above
- Natural in BOTH ${knownName} AND ${targetName} - quality over quantity
- Include all necessary grammar words (to, the, a, is, are, etc.)
- Server filters to best 6-13 depending on LEGO richness, so OVERGENERATE naturally

### Output JSON:
{
  "phrases": [
    { "known": "...", "target": "..." },
    ... (15-20 phrases)
  ]
}
`;

  return scaffold;
}

/**
 * Get LEGOs that need baskets generated (from database)
 */
async function getMissingLegosFromDB(courseCode, startSeed = 1, endSeed = 9999) {
  console.log(`[Phase 3] Querying database for NEW LEGOs needing baskets: ${courseCode} (seeds ${startSeed}-${endSeed})`);

  // Get missing LEGOs directly from database
  const missingLegos = await courseDataService.getMissingLegosFromDatabase(courseCode, startSeed, endSeed);

  if (missingLegos === null) {
    throw new Error('Database reads not available - check SUPABASE_URL and SUPABASE_SERVICE_KEY');
  }

  console.log(`[Phase 3] Found ${missingLegos.length} LEGOs needing baskets`);
  return missingLegos;
}

/**
 * Build scaffolds for LEGOs dynamically from database
 */
async function buildScaffoldsFromDB(courseCode, targetLegos) {
  console.log(`[Phase 3] Building scaffolds from database for ${targetLegos.length} LEGOs...`);

  // Get ALL LEGOs for the course (needed for vocabulary building)
  const allLegos = await courseDataService.getLegosByCourse(courseCode, { status: 'all' });

  if (!allLegos || allLegos.length === 0) {
    throw new Error(`No LEGOs found in database for ${courseCode}`);
  }

  console.log(`[Phase 3] Loaded ${allLegos.length} total LEGOs for vocabulary context`);

  // Build scaffold for each target LEGO
  const scaffolds = {};
  for (const lego of targetLegos) {
    const { seedNumber, legoIndex } = parseLegoId(lego.legoId);

    // Find the full LEGO record from allLegos
    const fullLego = allLegos.find(l =>
      l.seed_number === seedNumber && l.lego_index === legoIndex
    );

    if (fullLego) {
      scaffolds[lego.legoId] = buildLegoScaffold(fullLego, allLegos);
    } else {
      console.warn(`[Phase 3] Could not find LEGO ${lego.legoId} in database`);
    }
  }

  console.log(`[Phase 3] Built ${Object.keys(scaffolds).length} scaffolds from database`);
  return scaffolds;
}

/**
 * Get total count of NEW LEGOs for a course (from database)
 */
async function getTotalNewLegosForCourse(courseCode) {
  try {
    const legos = await courseDataService.getLegosByCourse(courseCode, { onlyNew: true, status: 'all' });
    return legos?.length || 0;
  } catch (error) {
    console.warn(`[Phase 3] Could not get NEW LEGO count: ${error.message}`);
    return 0;
  }
}

// ==============================================================================
// VALIDATION FUNCTIONS
// ==============================================================================

/**
 * Check if phrase contains the complete LEGO
 */
function phraseContainsLego(phraseTarget, legoTarget) {
  return phraseTarget.toLowerCase().includes(legoTarget.toLowerCase());
}

/**
 * Decompose phrase into taught units
 */
function decomposeIntoUnits(phrase, units) {
  const sortedUnits = [...new Set(units)]
    .filter(u => u && u.length > 0)
    .sort((a, b) => b.length - a.length);

  let remaining = phrase.replace(/[.,!?;:"()[\]{}]/g, '').trim();
  const matched = [];

  while (remaining.length > 0) {
    remaining = remaining.trimStart();
    if (remaining.length === 0) break;

    let foundMatch = false;
    for (const unit of sortedUnits) {
      const unitLower = unit.toLowerCase();
      const remainingLower = remaining.toLowerCase();

      if (remainingLower.startsWith(unitLower)) {
        const afterUnit = remaining.slice(unit.length);
        const isWordBoundary = afterUnit.length === 0 ||
                               afterUnit[0] === ' ' ||
                               /[\u4E00-\u9FFF]/.test(unit);

        if (isWordBoundary) {
          matched.push(unit);
          remaining = afterUnit.trimStart();
          foundMatch = true;
          break;
        }
      }
    }

    if (!foundMatch) {
      return { valid: false, unmatched: remaining, matched };
    }
  }

  return { valid: true, unmatched: '', matched };
}

/**
 * Validate basket phrases for GATE compliance
 *
 * IMPORTANT: The current LEGO being debuted MUST be included in decomposition units.
 * Practice phrases for a LEGO's debut basket are ALLOWED to contain that LEGO.
 */
function validateBasketPhrases(phrases, legoData, scaffoldVocab) {
  const errors = [];

  // Build taught units - MUST include current LEGO (it's being debuted in this basket)
  const currentLegoKnown = legoData?.known;
  const currentLegoTarget = legoData?.target;
  const currentLegoComponents = legoData?.components || [];

  if (!currentLegoKnown || !currentLegoTarget) {
    console.warn(`   GATE: Missing LEGO data - known: "${currentLegoKnown}", target: "${currentLegoTarget}"`);
  }

  // Start with previously taught vocab
  const knownUnits = [...(scaffoldVocab?.known || [])];
  const targetUnits = [...(scaffoldVocab?.target || [])];

  // Add the current LEGO being debuted
  if (currentLegoKnown) knownUnits.push(currentLegoKnown);
  if (currentLegoTarget) targetUnits.push(currentLegoTarget);

  // For M-type LEGOs, also add their components (they're taught as part of the LEGO)
  for (const comp of currentLegoComponents) {
    const knownComp = comp.k || comp.known || comp.known_text;
    const targetComp = comp.t || comp.target || comp.target_text;
    if (knownComp) knownUnits.push(knownComp);
    if (targetComp) targetUnits.push(targetComp);
  }

  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    const phraseNum = i + 1;

    // Check LEGO presence
    if (!phraseContainsLego(phrase.target, legoData.target)) {
      errors.push({
        phraseNum,
        type: 'missing_lego',
        error: `Phrase ${phraseNum} target doesn't contain LEGO "${legoData.target}"`,
        phrase: phrase.target
      });
    }

    // Check GATE: target decomposition
    const targetCheck = decomposeIntoUnits(phrase.target, targetUnits);
    if (!targetCheck.valid) {
      errors.push({
        phraseNum,
        type: 'gate_target',
        error: `GATE violation (target): cannot decompose "${targetCheck.unmatched}"`,
        phrase: phrase.target
      });
    }

    // Check GATE: known decomposition
    const knownCheck = decomposeIntoUnits(phrase.known, knownUnits);
    if (!knownCheck.valid) {
      errors.push({
        phraseNum,
        type: 'gate_known',
        error: `GATE violation (known): cannot decompose "${knownCheck.unmatched}"`,
        phrase: phrase.known
      });
    }

    // Check syllable count (max 20 for cognitive load - ~10-12 English words)
    const syllables = countSyllables(phrase.target);
    if (syllables > 20) {
      errors.push({
        phraseNum,
        type: 'syllable_overload',
        error: `Phrase ${phraseNum} has ${syllables} syllables (max 20 for cognitive load)`,
        phrase: phrase.target
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

// ==============================================================================
// PROMPT TEMPLATE LOADING
// ==============================================================================

const fs = require('fs-extra');

function loadPromptTemplate(templateName, placeholders) {
  const templatePath = path.join(__dirname, '../../../public/prompts', templateName);

  if (!fs.existsSync(templatePath)) {
    console.error(`Template not found: ${templatePath}`);
    throw new Error(`Prompt template not found: ${templateName}`);
  }

  let template = fs.readFileSync(templatePath, 'utf8');

  for (const [key, value] of Object.entries(placeholders)) {
    const placeholder = `{{${key}}}`;
    template = template.split(placeholder).join(String(value));
  }

  return template;
}

function getRelativeCourseDir(absolutePath) {
  return absolutePath.replace(VFS_ROOT + '/', '');
}

// ==============================================================================
// MASTER/WORKER ORCHESTRATION
// ==============================================================================

/**
 * Generate Phase 3 Master Prompt with LEGO-based assignments
 */
function generatePhase3OrchestratorPrompt(courseCode, params, courseDir) {
  const { target, known, legoData, targetLegos, agentsPerWindow, legosPerWorker, stagingOnly } = params;

  const sortedLegos = [...targetLegos].sort((a, b) => a.legoId.localeCompare(b.legoId));
  const legoCount = sortedLegos.length;
  const requestedWorkers = agentsPerWindow || 13;
  const targetLegosPerWorker = legosPerWorker || 5;

  // Calculate workers needed
  const workersNeeded = Math.ceil(legoCount / targetLegosPerWorker);
  const workersToSpawn = Math.max(1, Math.min(requestedWorkers, workersNeeded, legoCount));
  const actualLegosPerWorker = Math.ceil(legoCount / workersToSpawn);

  // Create worker assignments
  const workerAssignments = [];
  for (let workerNum = 1; workerNum <= workersToSpawn; workerNum++) {
    const workerStartIdx = (workerNum - 1) * actualLegosPerWorker;
    const workerEndIdx = Math.min(workerNum * actualLegosPerWorker, sortedLegos.length);
    const workerLegos = sortedLegos.slice(workerStartIdx, workerEndIdx);

    if (workerLegos.length === 0) continue;

    const workerLegoIds = workerLegos.map(l => l.legoId);
    workerAssignments.push({
      workerNum,
      legoIds: workerLegoIds,
      legoCount: workerLegoIds.length,
      firstLego: workerLegoIds[0],
      lastLego: workerLegoIds[workerLegoIds.length - 1]
    });
  }

  const actualWorkersToSpawn = workerAssignments.length;
  const workerAssignmentsText = workerAssignments.map(w => {
    const legoRangeDisplay = w.legoCount === 1
      ? `LEGO ${w.firstLego}`
      : `LEGOs ${w.firstLego} to ${w.lastLego}`;
    const legoListDisplay = w.legoIds.length <= 8
      ? w.legoIds.join(', ')
      : `${w.legoIds.slice(0, 8).join(', ')}... +${w.legoIds.length - 8} more`;
    return `**Worker ${w.workerNum}:** ${legoRangeDisplay} (${w.legoCount} LEGOs): ${legoListDisplay}`;
  }).join('\n');

  return loadPromptTemplate('phase3_master.md', {
    COURSE_CODE: courseCode,
    START_SEED: sortedLegos[0]?.seed || 'N/A',
    END_SEED: sortedLegos[sortedLegos.length - 1]?.seed || 'N/A',
    TOTAL_SEEDS: new Set(sortedLegos.map(l => l.seed)).size,
    LEGO_COUNT: legoCount,
    SEEDS_COUNT: new Set(sortedLegos.map(l => l.seed)).size,
    WORKERS_TO_SPAWN: actualWorkersToSpawn,
    WORKER_ASSIGNMENTS: workerAssignmentsText,
    KNOWN_LANGUAGE: known,
    TARGET_LANGUAGE: target,
    ORCHESTRATOR_URL: ngrokUrl
  });
}

/**
 * Spawn Master browser tabs for Phase 3
 */
async function spawnBrowserWindows(courseCode, params, baseCourseDir, masterCount, workersPerMaster, legosPerWorker, job = null) {
  const { target, known, legoData, targetLegos, spawnerMode = 'cli' } = params;
  const modeLabel = spawnerMode === 'cli' ? 'CLI agents (iTerm2)' : 'Safari tabs';

  console.log(`\n[Phase 3] Spawning ${masterCount} Master ${modeLabel}...`);
  console.log(`[Phase 3]    Each Master spawns ${workersPerMaster} workers via Task tool`);
  console.log(`[Phase 3]    Each worker processes ~${legosPerWorker} LEGOs`);
  console.log(`[Phase 3]    Total LEGOs: ${targetLegos.length}`);

  const config = loadConfig();
  const spawnDelay = config.phase3_basket_generation?.browser_spawn_delay_ms || 5000;

  // Sort LEGOs by ID and distribute across masters
  const sortedLegos = [...targetLegos].sort((a, b) => a.legoId.localeCompare(b.legoId));
  const legosPerMaster = Math.ceil(sortedLegos.length / masterCount);

  for (let masterNum = 1; masterNum <= masterCount; masterNum++) {
    console.log(`\n[Phase 3]   Master${masterNum}/${masterCount}:`);

    const masterStartIdx = (masterNum - 1) * legosPerMaster;
    const masterEndIdx = Math.min(masterNum * legosPerMaster, sortedLegos.length);
    const masterTargetLegos = sortedLegos.slice(masterStartIdx, masterEndIdx);

    if (masterTargetLegos.length === 0) {
      console.log(`[Phase 3]    No LEGOs for this Master, skipping...`);
      continue;
    }

    // Extract scaffold data for this Master's LEGOs
    const masterLegoData = {};
    for (const lego of masterTargetLegos) {
      if (legoData[lego.legoId]) {
        masterLegoData[lego.legoId] = legoData[lego.legoId];
      }
    }

    const firstLegoId = masterTargetLegos[0]?.legoId || 'N/A';
    const lastLegoId = masterTargetLegos[masterTargetLegos.length - 1]?.legoId || 'N/A';
    console.log(`[Phase 3]    LEGOs: ${firstLegoId} to ${lastLegoId} (${masterTargetLegos.length} LEGOs)`);
    console.log(`[Phase 3]    Will spawn ${workersPerMaster} workers via Task tool`);

    const masterPrompt = generatePhase3OrchestratorPrompt(
      courseCode,
      {
        target,
        known,
        legoData: masterLegoData,
        targetLegos: masterTargetLegos,
        agentsPerWindow: workersPerMaster,
        legosPerWorker,
        stagingOnly: params.stagingOnly
      },
      baseCourseDir
    );

    try {
      if (spawnerMode === 'cli') {
        await unifiedSpawner.spawnSingleAgent(masterPrompt, {
          mode: 'cli',
          model: 'sonnet',
          workingDir: baseCourseDir
        });
      } else {
        await spawnClaudeCodeSession(masterPrompt, `phase3-master-${masterNum}`);
      }

      if (job) {
        job.windowsSpawned++;
        job.milestones.windowsSpawned = job.windowsSpawned;
        job.milestones.lastWindowSpawnedAt = new Date().toISOString();
      }

      const actualDelay = spawnerMode === 'cli' ? Math.min(spawnDelay, 2000) : spawnDelay;
      if (masterNum < masterCount) {
        console.log(`[Phase 3]    Waiting ${actualDelay}ms before next Master...`);
        await new Promise(resolve => setTimeout(resolve, actualDelay));
      }
    } catch (error) {
      console.error(`[Phase 3]     Failed to spawn Master ${masterNum}:`, error.message);
      if (job && !job.warnings) job.warnings = [];
      if (job) job.warnings.push(`Failed to spawn Master ${masterNum}: ${error.message}`);
    }
  }

  console.log(`\n[Phase 3] Spawned ${masterCount} Master ${modeLabel}`);
  if (job) {
    job.status = 'workers_generating';
  }
}

/**
 * Spawn Claude Code session via osascript (Safari)
 */
async function spawnClaudeCodeSession(prompt, windowTitle) {
  // Copy prompt to clipboard
  await new Promise((resolve, reject) => {
    const pbcopy = spawn('pbcopy', [], { stdio: ['pipe', 'inherit', 'inherit'] });
    pbcopy.stdin.write(prompt);
    pbcopy.stdin.end();
    pbcopy.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pbcopy failed with code ${code}`));
    });
  });

  const appleScript = `
tell application "Safari"
    activate
    tell window 1
        set newTab to make new tab with properties {URL:"https://claude.ai/code"}
        set current tab to newTab
    end tell
    delay 5
    tell application "System Events"
        keystroke "a" using command down
        keystroke "v" using command down
        delay 1.5
        keystroke return
    end tell
    delay 8
end tell
return "success"
  `.trim();

  return new Promise((resolve, reject) => {
    const child = spawn('osascript', ['-e', appleScript], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });
    child.on('close', (code) => {
      if (code === 0) resolve({ success: true });
      else reject(new Error(`osascript failed: ${stderr || stdout}`));
    });
  });
}

/**
 * Report progress to orchestrator
 */
async function reportProgressToOrchestrator(courseCode, progressData) {
  try {
    await fetch(`${ngrokUrl}/api/courses/${courseCode}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progressData)
    });
  } catch (error) {
    // Silent fail
  }
}

// ==============================================================================
// API ENDPOINTS
// ==============================================================================

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    port: PORT,
    timestamp: new Date().toISOString(),
    architecture: 'database-first',
    activeJobs: activeJobs.size
  });
});

/**
 * GET /preview/:courseCode
 * Preview what a Phase 3 job would look like (dry run)
 */
app.get('/preview/:courseCode', async (req, res) => {
  const { courseCode } = req.params;

  console.log(`\n[Phase 3] Preview requested for: ${courseCode}`);

  try {
    // Get missing LEGOs from database
    const missingLegos = await courseDataService.getMissingNewLegos(courseCode);

    if (missingLegos === null) {
      return res.status(503).json({
        error: 'Database reads not available',
        hint: 'Check SUPABASE_URL and SUPABASE_SERVICE_KEY'
      });
    }

    const legosToProcess = missingLegos.length;

    if (legosToProcess === 0) {
      return res.json({
        phase: 3,
        courseCode,
        alreadyComplete: true,
        legosToProcess: 0,
        message: 'Phase 3 is already complete - all baskets exist in database'
      });
    }

    // Calculate job shape
    const config = loadConfig();
    const phase3Config = config.phase_overrides?.phase3_basket_generation || {};
    const AGENTS_PER_BROWSER = phase3Config.agents_per_browser || 13;

    const totalNewLegosInCourse = await getTotalNewLegosForCourse(courseCode);
    const isResumeMode = totalNewLegosInCourse > 0 && legosToProcess < totalNewLegosInCourse;
    const LEGOS_PER_AGENT = isResumeMode
      ? (phase3Config.legos_per_agent_resume || 5)
      : (phase3Config.legos_per_agent || 5);

    const totalWorkersNeeded = Math.ceil(legosToProcess / LEGOS_PER_AGENT);
    const masterCount = Math.max(1, Math.ceil(totalWorkersNeeded / AGENTS_PER_BROWSER));
    const totalWorkers = masterCount * AGENTS_PER_BROWSER;
    const legosPerWorker = Math.ceil(legosToProcess / totalWorkers);

    const estimatedMinutes = Math.ceil(legosPerWorker);

    res.json({
      phase: 3,
      courseCode,
      hasActiveJob: activeJobs.has(courseCode),
      legosToProcess,
      totalNewLegosInCourse,
      isResumeMode,
      mode: isResumeMode ? 'resume' : 'fresh',
      browserTabs: masterCount,
      agentsPerBrowser: AGENTS_PER_BROWSER,
      totalAgents: totalWorkers,
      legosPerAgent: LEGOS_PER_AGENT,
      estimatedMinutes,
      summary: `Will process ${legosToProcess} LEGOs using ${masterCount} browser tab(s) x ${AGENTS_PER_BROWSER} agents`
    });

  } catch (error) {
    console.error(`[Phase 3] Preview error:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /status/:courseCode
 * Get Phase 3 progress for a course
 */
app.get('/status/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const job = activeJobs.get(courseCode);

  // If no active job, get status from database
  if (!job) {
    try {
      const progress = await courseDataService.getCourseProgress(courseCode);
      return res.json({
        courseCode,
        status: 'idle',
        databaseProgress: progress?.phase3 || null
      });
    } catch (error) {
      return res.status(404).json({ error: `No Phase 3 job found for ${courseCode}` });
    }
  }

  const startTime = new Date(job.startedAt).getTime();
  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

  res.json({
    courseCode,
    status: job.status,
    milestones: job.milestones,
    timing: {
      startedAt: job.startedAt,
      elapsedSeconds
    },
    uploads: job.uploads ? {
      legosReceived: job.uploads.legosReceived,
      expectedLegos: job.uploads.expectedLegos,
      lastUploadAt: job.uploads.lastUploadAt,
      complete: job.uploads.complete
    } : null,
    config: job.config,
    error: job.error,
    warnings: job.warnings || [],
    masters: (job.masters || []).map(m => ({
      masterNum: m.masterNum,
      seedRange: m.seedRange,
      status: m.status,
      legosExpected: m.legosExpected,
      legosReceived: m.legosReceived
    }))
  });
});

/**
 * POST /abort/:courseCode
 * Emergency stop for Phase 3
 */
app.post('/abort/:courseCode', (req, res) => {
  const { courseCode } = req.params;
  console.log(`\n[Phase 3] Aborting for ${courseCode}...`);
  activeJobs.delete(courseCode);
  res.json({ success: true, message: `Aborted Phase 3 for ${courseCode}` });
});

/**
 * POST /start
 * Start Phase 3 basket generation for a course (DB-first)
 */
app.post('/start', async (req, res) => {
  const {
    courseCode,
    startSeed = 1,
    endSeed = 9999,
    target,
    known,
    browserWindows,
    agentsPerWindow,
    seedsPerAgent,
    stagingOnly = false,
    spawnerMode = 'cli',
    forceRegenerate = false
  } = req.body;

  if (!courseCode || !target || !known) {
    return res.status(400).json({ error: 'courseCode, target, known required' });
  }

  // Pre-flight check
  try {
    console.log(`[Phase 3] Pre-flight check: verifying orchestrator at ${ngrokUrl}...`);
    const healthCheck = await fetch(`${ngrokUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    if (!healthCheck.ok) {
      return res.status(503).json({
        error: 'Orchestrator is not healthy',
        tip: 'Start the orchestrator first: npm run pipeline'
      });
    }
    console.log(`[Phase 3] Pre-flight passed: orchestrator is online`);
  } catch (error) {
    return res.status(503).json({
      error: 'Cannot reach orchestrator - is it running?',
      tip: 'Start the orchestrator first: npm run pipeline'
    });
  }

  // Check for existing job
  if (activeJobs.has(courseCode)) {
    const existingJob = activeJobs.get(courseCode);
    const jobAge = existingJob.startedAt ? Date.now() - new Date(existingJob.startedAt).getTime() : 0;
    const thirtyMinutes = 30 * 60 * 1000;

    if (jobAge > thirtyMinutes) {
      console.log(`[Phase 3] Auto-aborting stale job (${Math.round(jobAge / 60000)} minutes old)`);
      activeJobs.delete(courseCode);
    } else {
      return res.status(409).json({
        error: `Phase 3 already running for ${courseCode}`,
        elapsedMinutes: Math.round(jobAge / 60000)
      });
    }
  }

  console.log(`\n[Phase 3] ====================================`);
  console.log(`[Phase 3] PHASE 3: PRACTICE BASKETS (DB-FIRST)`);
  console.log(`[Phase 3] ====================================`);
  console.log(`[Phase 3] Course: ${courseCode}`);
  console.log(`[Phase 3] Seeds: ${startSeed}-${endSeed}`);
  console.log(`[Phase 3] Target: ${target}, Known: ${known}`);

  const baseCourseDir = path.join(VFS_ROOT, courseCode);

  // Initialize job state
  const job = {
    courseCode,
    baseCourseDir,
    startSeed,
    endSeed,
    target,
    known,
    stagingOnly,
    status: 'querying_database',
    startedAt: new Date().toISOString(),
    uploads: {
      legosReceived: 0,
      expectedLegos: null,
      lastUploadAt: null,
      complete: false
    },
    milestones: {
      scaffoldsReady: false,
      windowsSpawned: 0,
      windowsTotal: 0
    },
    masters: [],
    config: null,
    windowsSpawned: 0,
    error: null,
    warnings: []
  };

  activeJobs.set(courseCode, job);

  try {
    // STEP 1: Get LEGOs needing baskets from database
    console.log(`\n[Phase 3] Step 1: Querying database for missing LEGOs...`);
    const targetLegos = await getMissingLegosFromDB(courseCode, startSeed, endSeed);

    if (targetLegos.length === 0) {
      console.log(`[Phase 3] All baskets already exist in database - Phase 3 complete!`);
      activeJobs.delete(courseCode);
      return res.json({
        success: true,
        alreadyComplete: true,
        message: `Phase 3 complete - all baskets exist in database`
      });
    }

    job.uploads.expectedLegos = targetLegos.length;
    job.targetLegos = targetLegos;

    // STEP 2: Build scaffolds from database
    console.log(`\n[Phase 3] Step 2: Building scaffolds from database...`);
    job.status = 'building_scaffolds';
    const legoData = await buildScaffoldsFromDB(courseCode, targetLegos);

    job.legoData = legoData;
    job.milestones.scaffoldsReady = true;
    job.milestones.scaffoldsReadyAt = new Date().toISOString();
    console.log(`[Phase 3] Scaffolds built for ${Object.keys(legoData).length} LEGOs`);

    // STEP 3: Calculate parallelization
    // Use passed values if provided, otherwise fall back to config
    const config = loadConfig();
    const phase3Config = config.phase_overrides?.phase3_basket_generation || {};
    const AGENTS_PER_BROWSER = agentsPerWindow || phase3Config.agents_per_browser || 13;

    const totalNewLegosInCourse = await getTotalNewLegosForCourse(courseCode);
    const isResumeMode = totalNewLegosInCourse > 0 && targetLegos.length < totalNewLegosInCourse;
    const LEGOS_PER_AGENT = seedsPerAgent || (isResumeMode
      ? (phase3Config.legos_per_agent_resume || 5)
      : (phase3Config.legos_per_agent || 5));

    const totalWorkersNeeded = Math.ceil(targetLegos.length / LEGOS_PER_AGENT);
    // Use passed browserWindows if provided, otherwise calculate dynamically
    const masterCount = browserWindows || Math.max(1, Math.ceil(totalWorkersNeeded / AGENTS_PER_BROWSER));
    const totalWorkers = masterCount * AGENTS_PER_BROWSER;
    const legosPerWorker = Math.ceil(targetLegos.length / totalWorkers);

    console.log(`\n[Phase 3] Step 3: Parallelization config:`);
    console.log(`[Phase 3]    Mode: ${isResumeMode ? 'Resume' : 'Fresh'}`);
    console.log(`[Phase 3]    LEGOs: ${targetLegos.length}`);
    console.log(`[Phase 3]    Masters: ${masterCount}, Workers/Master: ${AGENTS_PER_BROWSER}`);

    job.config = {
      masterCount,
      workersPerMaster: AGENTS_PER_BROWSER,
      legosPerWorker,
      totalWorkers,
      legosToProcess: targetLegos.length,
      isResumeMode
    };
    job.milestones.windowsTotal = masterCount;
    job.status = 'spawning_masters';

    // STEP 4: Spawn Master agents
    console.log(`\n[Phase 3] Step 4: Spawning ${masterCount} Master agents...`);
    await spawnBrowserWindows(courseCode, {
      target,
      known,
      legoData,
      targetLegos,
      stagingOnly,
      spawnerMode
    }, baseCourseDir, masterCount, AGENTS_PER_BROWSER, legosPerWorker, job);

    res.json({
      success: true,
      message: `Phase 3 started for ${courseCode}`,
      job: {
        courseCode,
        legosToProcess: targetLegos.length,
        config: job.config,
        status: 'running'
      }
    });

  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    activeJobs.delete(courseCode);
    console.error(`[Phase 3] Failed to start:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /launch-15-masters
 * Launch the multi-master orchestration system for Phase 3 (DB-first)
 */
app.post('/launch-15-masters', async (req, res) => {
  const fullCourseConfig = getModeConfig(MODES.FULL_COURSE);
  const defaultPattern = fullCourseConfig.pattern;

  const {
    courseCode,
    target = 'spa',
    known = 'eng',
    mastersCount = defaultPattern.browsers,
    workersPerMaster = defaultPattern.agents_per_browser,
    legosPerWorker = defaultPattern.seeds_per_agent,
    spawnerMode = 'cli'
  } = req.body;

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode required' });
  }

  console.log(`\n[Phase 3] ====================================`);
  console.log(`[Phase 3] LAUNCH MASTERS (DB-FIRST)`);
  console.log(`[Phase 3] ====================================`);
  console.log(`[Phase 3] Course: ${courseCode}`);
  console.log(`[Phase 3] Config: ${mastersCount} masters x ${workersPerMaster} workers x ${legosPerWorker} LEGOs`);

  const baseCourseDir = path.join(VFS_ROOT, courseCode);

  try {
    // STEP 1: Get missing LEGOs from database
    console.log(`\n[Phase 3] Step 1: Querying database for missing baskets...`);
    const missingLegos = await courseDataService.getMissingNewLegos(courseCode);

    if (!missingLegos) {
      return res.status(503).json({
        error: 'Database reads not available',
        hint: 'Check SUPABASE_URL and SUPABASE_SERVICE_KEY'
      });
    }

    const totalMissing = missingLegos.length;
    const completeLegos = await courseDataService.getCompletedNewLegosCount(courseCode);

    console.log(`[Phase 3] Found ${totalMissing} missing baskets (DB-first)`);
    console.log(`[Phase 3] Complete baskets in DB: ${completeLegos}`);

    if (totalMissing === 0) {
      return res.json({
        success: true,
        message: 'No missing baskets - Phase 3 already complete!',
        totalMissing: 0,
        completeLegos
      });
    }

    // STEP 2: Build scaffolds from database
    console.log(`\n[Phase 3] Step 2: Building scaffolds from database...`);
    const legoData = await buildScaffoldsFromDB(courseCode, missingLegos);

    // STEP 3: Calculate distribution
    const legosPerMaster = workersPerMaster * legosPerWorker;
    const actualMasters = Math.min(mastersCount, Math.ceil(totalMissing / legosPerMaster));

    console.log(`\n[Phase 3] Step 3: Distribution planning...`);
    console.log(`[Phase 3] Launching ${actualMasters} masters for ${totalMissing} LEGOs`);

    // STEP 4: Distribute LEGOs across masters
    const masters = [];
    for (let m = 0; m < actualMasters; m++) {
      const masterStartIdx = m * legosPerMaster;
      if (masterStartIdx >= totalMissing) break;

      const masterLegos = missingLegos.slice(masterStartIdx, masterStartIdx + legosPerMaster);
      const workers = [];

      for (let w = 0; w < workersPerMaster; w++) {
        const workerStartIdx = w * legosPerWorker;
        if (workerStartIdx >= masterLegos.length) break;

        const workerLegos = masterLegos.slice(workerStartIdx, workerStartIdx + legosPerWorker);
        workers.push({
          workerNum: w + 1,
          legoIds: workerLegos.map(l => l.legoId),
          legoCount: workerLegos.length,
          legos: workerLegos
        });
      }

      const seedIds = [...new Set(masterLegos.map(l => l.seed))].sort();
      masters.push({
        masterNum: m + 1,
        workers,
        legoCount: masterLegos.length,
        seedRange: seedIds.length > 0 ? `${seedIds[0]}-${seedIds[seedIds.length - 1]}` : 'N/A',
        legos: masterLegos
      });
    }

    // STEP 5: Create job tracking
    const jobKey = courseCode;
    const job = {
      courseCode,
      status: 'spawning_masters',
      startedAt: new Date().toISOString(),
      uploads: {
        legosReceived: 0,
        expectedLegos: totalMissing,
        lastUploadAt: null,
        complete: false
      },
      milestones: {
        scaffoldsReady: true,
        scaffoldsReadyAt: new Date().toISOString()
      },
      masters: masters.map(m => ({
        masterNum: m.masterNum,
        seedRange: m.seedRange,
        legosExpected: m.legoCount,
        legosReceived: 0,
        status: 'pending',
        workers: m.workers.map(w => ({
          workerNum: w.workerNum,
          legoIds: w.legoIds,
          legoCount: w.legoCount,
          status: 'pending'
        }))
      })),
      config: { mastersCount, workersPerMaster, legosPerWorker },
      warnings: [],
      error: null
    };
    activeJobs.set(jobKey, job);

    // STEP 6: Spawn masters
    const modeLabel = spawnerMode === 'cli' ? 'CLI agents' : 'Safari tabs';
    console.log(`\n[Phase 3] Step 4: Launching ${masters.length} ${modeLabel}...`);

    for (const master of masters) {
      console.log(`[Phase 3] Launching Master ${master.masterNum}: ${master.seedRange} (${master.legoCount} LEGOs)`);

      const jobMaster = job.masters.find(m => m.masterNum === master.masterNum);
      if (jobMaster) {
        jobMaster.status = 'spawning';
        jobMaster.spawnedAt = new Date().toISOString();
      }

      // Build master-specific scaffold data
      const masterLegoData = {};
      for (const lego of master.legos) {
        if (legoData[lego.legoId]) {
          masterLegoData[lego.legoId] = legoData[lego.legoId];
        }
      }

      const prompt = generatePhase3MasterPrompt({
        courseCode,
        target,
        known,
        masterNum: master.masterNum,
        workers: master.workers,
        totalLegos: master.legoCount,
        seedRange: master.seedRange
      });

      try {
        if (spawnerMode === 'cli') {
          await unifiedSpawner.spawnSingleAgent(prompt, {
            mode: 'cli',
            model: 'sonnet',
            workingDir: baseCourseDir
          });
        } else {
          await spawnClaudeCodeSession(prompt, `phase3-master-${master.masterNum}`);
        }
        if (jobMaster) jobMaster.status = 'running';
      } catch (error) {
        console.error(`[Phase 3] Master ${master.masterNum} launch failed:`, error.message);
        if (jobMaster) {
          jobMaster.status = 'failed';
          jobMaster.error = error.message;
        }
      }

      // Delay between spawns
      const spawnDelay = spawnerMode === 'cli' ? 2000 : 5000;
      if (master.masterNum < masters.length) {
        await new Promise(r => setTimeout(r, spawnDelay));
      }
    }

    job.status = 'workers_generating';

    console.log(`\n[Phase 3] Launched ${masters.length} masters`);
    console.log(`[Phase 3] Total workers: ${masters.reduce((sum, m) => sum + m.workers.length, 0)}`);
    console.log(`[Phase 3] Total LEGOs: ${totalMissing}`);

    res.json({
      success: true,
      message: `Launched ${masters.length} Phase 3 masters`,
      totalMissing,
      completeLegos,
      masters: masters.map(m => ({
        masterNum: m.masterNum,
        seedRange: m.seedRange,
        workers: m.workers.length,
        legos: m.legoCount
      }))
    });

  } catch (error) {
    console.error(`[Phase 3] Launch failed:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate Phase 3 Master prompt with explicit worker assignments
 */
function generatePhase3MasterPrompt({ courseCode, target, known, masterNum, workers, totalLegos, seedRange }) {
  const workerPrompts = workers.map(w => {
    const legoList = w.legoIds.join(', ');

    return `
## WORKER ${w.workerNum} PROMPT:

\`\`\`
# Phase 3 Worker ${w.workerNum}

Course: ${courseCode}
LEGOs: ${legoList}
API: ${ngrokUrl}

## WORKFLOW: For each LEGO in your list:

### Step 1: Fetch the scaffold
\`\`\`bash
curl ${ngrokUrl}/scaffold-v9/${courseCode}/[LEGO_ID]
\`\`\`

The scaffold contains:
- YOUR LEGO in context
- RECENT PATTERNS showing how vocabulary combines naturally
- TASK instructions

### Step 2: Generate phrases using the scaffold
- READ the recent patterns carefully - they show natural English grammar
- Generate 15-20 phrases that sound natural in BOTH English AND Chinese
- English grammar MUST be perfect (e.g., "I want TO say" not "I want say")
- Every phrase must contain the complete LEGO

### Step 3: Upload
\`\`\`bash
curl -X POST ${ngrokUrl}/upload-basket -H "Content-Type: application/json" -d '{
  "course": "${courseCode}",
  "legoId": "[LEGO_ID]",
  "phrases": [
    { "known": "English phrase", "target": "Chinese phrase" }
  ]
}'
\`\`\`

## CRITICAL: English must be grammatically perfect
- "I want to speak" NOT "I want speak"
- "Can I say..." NOT "Can or not say..."
- "I'm not sure if I can..." NOT "I'm not sure can..."

Work silently. Report when done: "Worker ${w.workerNum}: ${w.legoCount} LEGOs done"
\`\`\`
`;
  }).join('\n');

  return `# Phase 3 Master ${masterNum}

Course: ${courseCode} | LEGOs: ${totalLegos} (${seedRange})

## SPAWN ${workers.length} WORKERS IN PARALLEL

Use Task tool ${workers.length} times in ONE message.

Worker assignments:
${workers.map(w => `- Worker ${w.workerNum}: ${w.legoIds.join(', ')} (${w.legoCount})`).join('\n')}

---
${workerPrompts}
---

When all complete, report: "Master ${masterNum}: ${workers.length} workers, ${totalLegos} LEGOs done"
`;
}

/**
 * POST /resume
 * Alias for /launch-15-masters
 */
app.post('/resume', async (req, res) => {
  console.log(`[Phase 3] /resume called - forwarding to /launch-15-masters`);
  req.url = '/launch-15-masters';
  app._router.handle(req, res, () => {});
});

// ==============================================================================
// UPLOAD ENDPOINTS (DB-FIRST)
// ==============================================================================

/**
 * POST /upload-basket - Minimal per-basket upload endpoint (DB-FIRST)
 *
 * TOKEN-EFFICIENT: Workers send only essential data, server enriches.
 * DATABASE-FIRST: Writes directly to Supabase, no JSON files.
 *
 * Payload:
 * {
 *   course: "zho_for_eng",
 *   legoId: "S0007L07",
 *   phrases: [
 *     { known: "I want to try", target: "..." },
 *     ...
 *   ]
 * }
 */
app.post('/upload-basket', async (req, res) => {
  try {
    const { course, legoId, phrases, agentId } = req.body;

    // Validate required fields
    if (!course || !legoId || !Array.isArray(phrases)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: course, legoId, phrases[]'
      });
    }

    if (phrases.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'phrases array cannot be empty'
      });
    }

    // Validate phrase format
    for (let i = 0; i < phrases.length; i++) {
      const p = phrases[i];
      if (!p.known || !p.target) {
        return res.status(400).json({
          success: false,
          error: `Phrase ${i + 1} missing known or target field`,
          received: p
        });
      }
    }

    console.log(`[upload-basket] ${course}/${legoId}: ${phrases.length} phrases${agentId ? ` from ${agentId}` : ''}`);

    // Parse legoId
    const { seedNumber, legoIndex } = parseLegoId(legoId);
    if (seedNumber === 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid legoId format: ${legoId} (expected S0001L01)`
      });
    }

    // Build scaffold from database for GATE validation
    let scaffoldVocab = null;
    let legoData = null;
    let allLegos = null;

    try {
      allLegos = await courseDataService.getLegosByCourse(course, { status: 'all' });
      const currentLego = allLegos.find(l =>
        l.seed_number === seedNumber && l.lego_index === legoIndex
      );

      if (currentLego) {
        // Include the LEGO itself plus any components (for M-types)
        legoData = {
          known: currentLego.known_text,
          target: currentLego.target_text,
          components: currentLego.components || []
        };
        scaffoldVocab = buildTaughtUnitsVocab(allLegos, seedNumber, legoIndex);
      }
    } catch (err) {
      console.warn(`   Could not load LEGO data for validation: ${err.message}`);
    }

    // GATE Validation
    if (scaffoldVocab && legoData) {
      const validation = validateBasketPhrases(phrases, legoData, scaffoldVocab);

      if (!validation.valid) {
        console.log(`   GATE validation failed: ${validation.errors.length} errors`);
        validation.errors.slice(0, 3).forEach(e => console.log(`      - ${e.error}`));

        return res.status(400).json({
          success: false,
          error: 'GATE validation failed - fix phrases and retry',
          legoId,
          errorCount: validation.errors.length,
          errors: validation.errors.slice(0, 10)
        });
      }

      console.log(`   GATE validation passed`);
    } else {
      console.warn(`   No scaffold found for ${legoId} - skipping GATE validation`);
    }

    // DATABASE WRITE
    if (!courseDataService.USE_DATABASE_WRITES) {
      return res.status(503).json({
        success: false,
        error: 'Database writes not enabled (USE_DATABASE_WRITES=false)'
      });
    }

    try {
      // Clear existing phrases for this LEGO
      await courseDataService.clearPracticePhrases(course, seedNumber, legoIndex);

      // A phrase that IS the bare LEGO is padding, never practice — drop it
      // HERE, before positions are assigned, so the surviving phrases stay
      // contiguous (savePracticePhrase refuses it too, but a refusal at the
      // writer would leave a hole in the position sequence).
      const legoTargetForBasket = legoData ? legoData.target : null;
      const { kept: writablePhrases, bare: barePhrases } = legoTargetForBasket
        ? partitionBareLegoPhrases(phrases, legoTargetForBasket)
        : { kept: phrases, bare: [] };
      if (barePhrases.length > 0) {
        console.log(`   ⚠ Dropped ${barePhrases.length} bare-LEGO phrase(s) ("${legoTargetForBasket}") — not practice, not padding`);
      }

      // Save each phrase with enrichment
      let phraseCount = 0;
      for (let i = 0; i < writablePhrases.length; i++) {
        const phrase = writablePhrases[i];

        await courseDataService.savePracticePhrase(course, seedNumber, legoIndex, {
          knownText: phrase.known,
          targetText: phrase.target,
          position: i + 1,
          wordCount: phrase.target.split(/\s+/).filter(w => w.length > 0).length,
          targetSyllableCount: countSyllables(phrase.target),
          legoCount: 1,
          status: 'draft'
        }, legoTargetForBasket ? { primaryLegoTarget: legoTargetForBasket } : {});
        phraseCount++;
      }

      console.log(`   Database: ${phraseCount} phrases saved to course_practice_phrases`);

      // CULMINATING LEGO: Add seed sentence as final practice phrase
      // The culminating LEGO is the highest-indexed LEGO in a seed -
      // it's the first time the learner can say the complete seed sentence
      try {
        if (!allLegos) {
          allLegos = await courseDataService.getLegosByCourse(course, { status: 'all' });
        }
        const seedLegos = allLegos.filter(l => l.seed_number === seedNumber);
        const maxLegoIndex = Math.max(...seedLegos.map(l => l.lego_index));

        if (legoIndex === maxLegoIndex) {
          // This is the culminating LEGO - add the seed sentence
          const seed = await courseDataService.getSeed(course, seedNumber);

          if (seed && seed.known_text && seed.target_text) {
            // Check if seed sentence is already in the phrases (avoid duplicates)
            const seedAlreadyIncluded = phrases.some(
              p => p.target === seed.target_text || p.known === seed.known_text
            );

            // A one-LEGO seed's sentence IS its LEGO, so the culminating row
            // would be a bare-LEGO row. The writer refuses it and returns null;
            // only count what actually landed.
            if (!seedAlreadyIncluded) {
              const saved = await courseDataService.savePracticePhrase(course, seedNumber, legoIndex, {
                knownText: seed.known_text,
                targetText: seed.target_text,
                position: phraseCount + 1,
                wordCount: seed.target_text.split(/\s+/).filter(w => w.length > 0).length,
                targetSyllableCount: countSyllables(seed.target_text),
                legoCount: seedLegos.filter(l => l.is_new).length, // All NEW LEGOs in this seed
                status: 'draft',
                isCulminatingPhrase: true  // Mark this as the seed sentence
              }, legoTargetForBasket ? { primaryLegoTarget: legoTargetForBasket } : {});
              if (saved) {
                phraseCount++;
                console.log(`   ✓ Culminating LEGO: Added seed sentence as phrase #${phraseCount}`);
              } else {
                console.log('   ✓ Culminating LEGO: seed sentence IS the bare LEGO — not written');
              }
            } else {
              console.log(`   ✓ Culminating LEGO: Seed sentence already included`);
            }
          }
        }
      } catch (culminatingErr) {
        console.warn(`   Could not add culminating phrase: ${culminatingErr.message}`);
      }

      // Track in job state
      const job = activeJobs.get(course);
      if (job) {
        job.uploads = job.uploads || { legosReceived: 0, lastUploadAt: null };
        job.uploads.legosReceived++;
        job.uploads.lastUploadAt = new Date().toISOString();

        // Report progress
        reportProgressToOrchestrator(course, {
          phase: 3,
          updates: {
            status: 'running',
            legosCompleted: job.uploads.legosReceived,
            legosTotal: job.uploads.expectedLegos || 0,
            currentLego: legoId
          },
          logMessage: `LEGO complete: ${legoId} (${phraseCount} phrases)`
        }).catch(() => {});

        // Check completion
        if (!job.uploads.complete && job.uploads.expectedLegos &&
            job.uploads.legosReceived >= job.uploads.expectedLegos) {
          job.uploads.complete = true;
          job.status = 'uploads_complete';
          console.log(`\n ALL UPLOADS COMPLETE! ${job.uploads.legosReceived} LEGOs received`);
        }
      }

      return res.json({
        success: true,
        legoId,
        phraseCount
      });

    } catch (dbErr) {
      console.error(`   Database write failed: ${dbErr.message}`);
      return res.status(500).json({
        success: false,
        error: `Database write failed: ${dbErr.message}`
      });
    }

  } catch (error) {
    console.error('upload-basket error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /basket-status/:course - Get current basket counts from database
 */
app.get('/basket-status/:course', async (req, res) => {
  try {
    const { course } = req.params;

    // Get progress from database
    const progress = await courseDataService.getCourseProgress(course);

    if (!progress) {
      return res.json({
        success: true,
        totalBaskets: 0,
        totalNeeded: 0,
        missing: 0,
        progress: 0
      });
    }

    const totalBaskets = progress.phase3?.complete || 0;
    const totalNeeded = progress.phase3?.target || 0;
    const missing = progress.phase3?.missingCount || 0;
    const progressPercent = progress.phase3?.percent || 0;

    res.json({
      success: true,
      totalBaskets,
      totalNeeded,
      missing,
      progress: progressPercent,
      source: 'database'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /scaffold-v9/:courseCode/:legoId
 * Serve v9 elegant scaffold with [brackets] showing LEGOs in context
 */
app.get('/scaffold-v9/:courseCode/:legoId', async (req, res) => {
  try {
    const { courseCode, legoId } = req.params;

    // Validate LEGO ID format
    if (!/^S\d{4}L\d{2}$/.test(legoId)) {
      return res.status(400).json({ error: 'Invalid LEGO ID format. Expected: S0117L01' });
    }

    const { seedNumber, legoIndex } = parseLegoId(legoId);

    // Get all LEGOs from database
    const allLegos = await courseDataService.getLegosByCourse(courseCode, { status: 'all' });

    if (!allLegos || allLegos.length === 0) {
      return res.status(404).json({
        error: 'No LEGOs found in database for this course',
        courseCode
      });
    }

    // Find the specific LEGO
    const lego = allLegos.find(l =>
      l.seed_number === seedNumber && l.lego_index === legoIndex
    );

    if (!lego) {
      return res.status(404).json({
        error: 'LEGO not found in database',
        legoId
      });
    }

    // Get seed sentences from database
    const seedNumbers = [...new Set(allLegos.map(l => l.seed_number))];
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { data: seedsData } = await supabase
      .from('course_seeds')
      .select('seed_number, known_text, target_text')
      .eq('course_code', courseCode)
      .in('seed_number', seedNumbers);

    const seedSentences = new Map();
    for (const s of seedsData || []) {
      seedSentences.set(s.seed_number, { known: s.known_text, target: s.target_text });
    }

    // Build v9 scaffold
    const scaffold = await buildV9Scaffold(courseCode, lego, allLegos, seedSentences);

    res.type('text/plain').send(scaffold);

  } catch (error) {
    console.error('[Phase 3] Error serving v9 scaffold:', error);
    res.status(500).json({
      error: 'Failed to build v9 scaffold',
      message: error.message
    });
  }
});

/**
 * GET /scaffold/:courseCode/:legoId
 * Serve scaffold for a specific LEGO (built from database)
 */
app.get('/scaffold/:courseCode/:legoId', async (req, res) => {
  try {
    const { courseCode, legoId } = req.params;

    // Validate LEGO ID format
    if (!/^S\d{4}L\d{2}$/.test(legoId)) {
      return res.status(400).json({ error: 'Invalid LEGO ID format. Expected: S0117L01' });
    }

    const { seedNumber, legoIndex } = parseLegoId(legoId);

    // Get all LEGOs from database
    const allLegos = await courseDataService.getLegosByCourse(courseCode, { status: 'all' });

    if (!allLegos || allLegos.length === 0) {
      return res.status(404).json({
        error: 'No LEGOs found in database for this course',
        courseCode
      });
    }

    // Find the specific LEGO
    const lego = allLegos.find(l =>
      l.seed_number === seedNumber && l.lego_index === legoIndex
    );

    if (!lego) {
      return res.status(404).json({
        error: 'LEGO not found in database',
        legoId
      });
    }

    // Build scaffold
    const scaffold = buildLegoScaffold(lego, allLegos);

    res.json(scaffold);

  } catch (error) {
    console.error('[Phase 3] Error serving scaffold:', error);
    res.status(500).json({
      error: 'Failed to build scaffold',
      message: error.message
    });
  }
});

/**
 * GET /scaffolds/:courseCode/seed/:seedId
 * Serve all scaffolds for a specific seed (built from database)
 */
app.get('/scaffolds/:courseCode/seed/:seedId', async (req, res) => {
  try {
    const { courseCode, seedId } = req.params;

    // Validate seed ID format
    if (!/^S\d{4}$/.test(seedId)) {
      return res.status(400).json({ error: 'Invalid seed ID format. Expected: S0117' });
    }

    const seedNumber = parseInt(seedId.substring(1), 10);

    // Get all LEGOs from database
    const allLegos = await courseDataService.getLegosByCourse(courseCode, { status: 'all' });

    if (!allLegos || allLegos.length === 0) {
      return res.status(404).json({
        error: 'No LEGOs found in database for this course',
        courseCode
      });
    }

    // Get LEGOs for this seed
    const seedLegos = allLegos.filter(l => l.seed_number === seedNumber && l.is_new);

    if (seedLegos.length === 0) {
      return res.status(404).json({
        error: 'No new LEGOs found for this seed',
        seedId
      });
    }

    // Build scaffolds for all LEGOs in this seed
    const result = {
      seed_id: seedId,
      seed_number: seedNumber,
      legos: {}
    };

    for (const lego of seedLegos) {
      const legoId = formatLegoId(lego.seed_number, lego.lego_index);
      result.legos[legoId] = buildLegoScaffold(lego, allLegos);
    }

    res.json(result);

  } catch (error) {
    console.error('[Phase 3] Error serving seed scaffolds:', error);
    res.status(500).json({
      error: 'Failed to build scaffolds',
      message: error.message
    });
  }
});

// ==============================================================================
// SERVER STARTUP
// ==============================================================================

app.listen(PORT, () => {
  console.log('');
  console.log(`${SERVICE_NAME} listening on port ${PORT}`);
  console.log(`   Architecture: DATABASE-FIRST`);
  console.log(`   VFS Root: ${VFS_ROOT}`);
  console.log(`   Data fetch URL: ${ngrokUrl}`);
  console.log(`   Basket upload URL: ${BASKET_UPLOAD_URL}`);
  console.log('');
});

process.on('SIGTERM', () => {
  console.log('\n[Phase 3] Shutting down...');
  process.exit(0);
});
