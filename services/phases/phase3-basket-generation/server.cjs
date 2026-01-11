#!/usr/bin/env node

/**
 * Phase 3: Practice Basket Generation Server (PROPERLY MIGRATED)
 *
 * Migrated from automation_server.cjs lines 2196-2295, 732-858
 * Responsibilities:
 * - ✅ Run scaffold preparation (preparePhase3Scaffolds)
 * - ✅ Spawn parallel Claude Code browser sessions
 * - ✅ Use exact orchestrator/agent prompts from working system
 * - ✅ Watch for claude/baskets-* branches
 * - ✅ Auto-merge when all complete
 * - ✅ Validate basket quality
 * - ✅ NEW: Strip metadata before GitHub push
 * - ✅ NEW: Integrate simplified config (automation.config.simple.json)
 * - ✅ Report completion to orchestrator
 *
 * Port: 3459 (auto-configured by start-automation.js)
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { generateTextScaffold } = require('./generate-text-scaffold.cjs');

// Load environment (set by start-automation.js)
const PORT = process.env.PORT || 3459;
const VFS_ROOT = process.env.VFS_ROOT;
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
const SERVICE_NAME = process.env.SERVICE_NAME || 'Phase 3 (Baskets)';
// External URLs for prompts sent to remote Claude browsers
const ngrokUrl = process.env.EXTERNAL_URL || process.env.ORCHESTRATOR_URL || 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev';
// Direct upload endpoint via ngrok - uses minimal /upload-basket (DB-only, token efficient)
const BASKET_UPLOAD_URL = `${ngrokUrl}/upload-basket`;

// Database service for database-first writes
const courseDataService = require('../../course-data-service.cjs');

// Load configuration
const { loadConfig } = require('../../shared/config-loader.cjs');
const { getModeConfig, getPatternForSeeds, SEED_COUNTS, MODES } = require('../../config/course-mode-loader.cjs');

// Unified agent spawner (CLI or browser)
const unifiedSpawner = require('../../shared/spawn-agent-unified.cjs');

/**
 * Get total count of NEW LEGOs (is_new=true) for a course
 * Used to determine if this is a fresh run vs resume
 * @param {string} courseCode - Course identifier
 * @returns {Promise<number>} Count of NEW LEGOs in the course
 */
async function getTotalNewLegosForCourse(courseCode) {
  try {
    // Use status: 'all' since LEGOs may be in 'draft' status
    const legos = await courseDataService.getLegosByCourse(courseCode, { onlyNew: true, status: 'all' });
    return legos?.length || 0;
  } catch (error) {
    console.warn(`[Phase 3] Could not get NEW LEGO count for ${courseCode}: ${error.message}`);
    return 0;
  }
}

/**
 * Load a prompt template and substitute placeholders
 * @param {string} templateName - Template filename (e.g., 'phase3_master.md')
 * @param {Object} placeholders - Key-value pairs for {{PLACEHOLDER}} substitution
 * @returns {string} Substituted prompt
 */
function loadPromptTemplate(templateName, placeholders) {
  const templatePath = path.join(__dirname, '../../../public/prompts', templateName);

  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Template not found: ${templatePath}`);
    throw new Error(`Prompt template not found: ${templateName}`);
  }

  let template = fs.readFileSync(templatePath, 'utf8');

  // Substitute all {{PLACEHOLDER}} values
  for (const [key, value] of Object.entries(placeholders)) {
    const placeholder = `{{${key}}}`;
    template = template.split(placeholder).join(String(value));
  }

  // Warn about any unsubstituted placeholders
  const remaining = template.match(/\{\{[A-Z_]+\}\}/g);
  if (remaining) {
    console.warn(`⚠️  Unsubstituted placeholders in ${templateName}:`, remaining);
  }

  return template;
}

// Validate config
if (!VFS_ROOT) {
  console.error('❌ Error: VFS_ROOT not set');
  process.exit(1);
}

// Initialize Express
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Active jobs (courseCode -> job state)
const activeJobs = new Map();

// ==============================================================================
// VALIDATION FUNCTIONS: GATE + HAS_LEGO CHECKS
// ==============================================================================

/**
 * Common British/American spelling equivalents
 * We normalize to accept both variants
 */
const SPELLING_VARIANTS = {
  // British -> American (we store both directions)
  'practise': 'practice',
  'practising': 'practicing',
  'practised': 'practiced',
  'recognise': 'recognize',
  'recognising': 'recognizing',
  'recognised': 'recognized',
  'organise': 'organize',
  'organising': 'organizing',
  'organised': 'organized',
  'realise': 'realize',
  'realising': 'realizing',
  'realised': 'realized',
  'apologise': 'apologize',
  'apologising': 'apologizing',
  'apologised': 'apologized',
  'colour': 'color',
  'colours': 'colors',
  'favour': 'favor',
  'favours': 'favors',
  'favourite': 'favorite',
  'favourites': 'favorites',
  'honour': 'honor',
  'honours': 'honors',
  'behaviour': 'behavior',
  'behaviours': 'behaviors',
  'neighbour': 'neighbor',
  'neighbours': 'neighbors',
  'travelling': 'traveling',
  'travelled': 'traveled',
  'traveller': 'traveler',
  'cancelled': 'canceled',
  'cancelling': 'canceling',
  'centre': 'center',
  'centres': 'centers',
  'theatre': 'theater',
  'theatres': 'theaters',
  'metre': 'meter',
  'metres': 'meters',
  'litre': 'liter',
  'litres': 'liters',
  'defence': 'defense',
  'offence': 'offense',
  'licence': 'license',
  'grey': 'gray'
};

// Build reverse mapping (American -> British)
const SPELLING_NORMALIZE = {};
for (const [british, american] of Object.entries(SPELLING_VARIANTS)) {
  SPELLING_NORMALIZE[british] = british;  // British maps to itself
  SPELLING_NORMALIZE[american] = british; // American maps to British (canonical)
}

/**
 * Normalize a word to canonical spelling (British)
 */
function normalizeSpelling(word) {
  return SPELLING_NORMALIZE[word] || word;
}

/**
 * Extract words from text (lowercase, alphanumeric, normalized spelling)
 */
function extractWords(text) {
  const matches = text.toLowerCase().match(/[\wáéíóúüñ]+/g);
  if (!matches) return [];
  return matches.map(normalizeSpelling);
}

/**
 * Build cumulative vocabulary up to a given LEGO position
 * @param {Object} legoPairs - The lego_pairs.json data
 * @param {string} targetLegoId - The LEGO we're building vocab for (e.g., "S0010L01")
 * @returns {Object} { known: Set<string>, target: Set<string> } Available vocabulary in both languages
 */
function buildAvailableVocab(legoPairs, targetLegoId) {
  const knownVocab = new Set();
  const targetVocab = new Set();

  // Parse target seed and lego numbers
  const targetMatch = targetLegoId.match(/S(\d+)L(\d+)/);
  if (!targetMatch) return { known: knownVocab, target: targetVocab };

  const targetSeedNum = parseInt(targetMatch[1]);
  const targetLegoNum = parseInt(targetMatch[2]);

  for (const seed of legoPairs.seeds) {
    const seedNum = parseInt(seed.seed_id.replace('S', ''));
    if (seedNum > targetSeedNum) break;

    // Add seed sentence words (available for all LEGOs in that seed)
    if (seed.seed_pair && seedNum <= targetSeedNum) {
      extractWords(seed.seed_pair.known).forEach(w => knownVocab.add(w));
      extractWords(seed.seed_pair.target).forEach(w => targetVocab.add(w));
    }

    for (let i = 0; i < seed.legos.length; i++) {
      const lego = seed.legos[i];
      const legoNum = i + 1;

      // Include LEGOs up to AND including target LEGO
      if (seedNum === targetSeedNum && legoNum > targetLegoNum) break;

      // Add this LEGO's words to vocabulary (both languages)
      // Handle both flat format { known, target } and nested format { lego: { known, target } }
      const knownWords = extractWords(lego.lego?.known || lego.known);
      const targetWords = extractWords(lego.lego?.target || lego.target);
      knownWords.forEach(w => knownVocab.add(w));
      targetWords.forEach(w => targetVocab.add(w));
    }
  }

  return { known: knownVocab, target: targetVocab };
}

/**
 * Check if phrase contains the complete LEGO (case-insensitive)
 * @param {string} phraseTarget - The target language phrase
 * @param {string} legoTarget - The LEGO's target text
 * @returns {boolean}
 */
function phraseContainsLego(phraseTarget, legoTarget) {
  // Normalize both for comparison
  const normalizedPhrase = phraseTarget.toLowerCase();
  const normalizedLego = legoTarget.toLowerCase();
  return normalizedPhrase.includes(normalizedLego);
}

/**
 * Count syllables in text (language-agnostic)
 * - CJK languages: each character ≈ 1 syllable
 * - Alphabetic languages: estimate via vowel clusters
 * @param {string} text - The text to count syllables in
 * @returns {number} Syllable count
 */
function countSyllables(text) {
  if (!text || typeof text !== 'string') return 0;
  text = text.trim();
  if (!text) return 0;

  // Check if text contains CJK characters (Chinese, Japanese, Korean)
  // CJK Unified Ideographs: \u4E00-\u9FFF
  // Hiragana: \u3040-\u309F, Katakana: \u30A0-\u30FF
  // Korean Hangul: \uAC00-\uD7AF
  const cjkRegex = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;

  if (cjkRegex.test(text)) {
    // For CJK: count characters (excluding punctuation and spaces)
    const cjkChars = text.match(/[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/g);
    return cjkChars ? cjkChars.length : 0;
  }

  // For alphabetic languages: estimate syllables via vowel clusters
  // This is a rough approximation that works for most European languages
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  let syllables = 0;

  for (const word of words) {
    // Remove punctuation
    const clean = word.replace(/[^a-záéíóúàèìòùâêîôûäëïöüñç]/gi, '');
    if (!clean) continue;

    // Count vowel groups (including accented vowels)
    const vowelGroups = clean.match(/[aeiouyáéíóúàèìòùâêîôûäëïöü]+/gi);
    let count = vowelGroups ? vowelGroups.length : 1;

    // Adjustments for common patterns
    if (clean.endsWith('e') && count > 1) count--; // Silent e
    if (clean.endsWith('le') && clean.length > 2) count++; // -le ending
    if (clean.endsWith('es') && count > 1) count--; // -es ending often silent

    syllables += Math.max(1, count);
  }

  return syllables || 1;
}

// Legacy alias for backwards compatibility
function countWords(text) {
  return countSyllables(text);
}

/**
 * Count unique LEGOs present in a phrase
 * @param {string} phraseTarget - The phrase's target text
 * @param {Array<string>} legoTargets - Array of LEGO target texts from this seed
 * @returns {number} Number of unique LEGOs found in the phrase
 */
function countLegosInPhrase(phraseTarget, legoTargets) {
  return legoTargets.filter(legoTarget =>
    phraseContainsLego(phraseTarget, legoTarget)
  ).length;
}

/**
 * Validate a single basket's phrases for GATE compliance and LEGO presence
 * GATE checks BOTH languages - known (prompt) and target (response)
 * ZUT (Zero Uncertainty Test): learner must know all words in both directions
 *
 * @param {Object} basket - The basket with lego and practice_phrases
 * @param {string} legoId - The LEGO ID (e.g., "S0010L01")
 * @param {Object} legoPairs - The lego_pairs.json data
 * @returns {Object} { valid: boolean, errors: Array<{phrase, error}> }
 */
function validateBasketPhrases(basket, legoId, legoPairs) {
  const errors = [];
  const legoKnown = basket.lego.known;
  const legoTarget = basket.lego.target;

  // Build available vocabulary for this LEGO position (both languages)
  const availableVocab = buildAvailableVocab(legoPairs, legoId);

  // Also add the current LEGO's words (it's always available)
  const legoKnownWords = extractWords(legoKnown);
  const legoTargetWords = extractWords(legoTarget);
  legoKnownWords.forEach(w => availableVocab.known.add(w));
  legoTargetWords.forEach(w => availableVocab.target.add(w));

  for (let i = 0; i < basket.practice_phrases.length; i++) {
    const phrase = basket.practice_phrases[i];
    const phraseNum = i + 1;

    // Check 1: LEGO presence in target
    if (!phraseContainsLego(phrase.target, legoTarget)) {
      errors.push({
        phraseNum,
        phrase: phrase.target,
        error: `Phrase ${phraseNum} target does not contain LEGO "${legoTarget}"`,
        type: 'missing_lego'
      });
    }

    // Check 2: GATE compliance - TARGET language
    const targetWords = extractWords(phrase.target);
    const unknownTargetWords = targetWords.filter(w => !availableVocab.target.has(w));

    if (unknownTargetWords.length > 0) {
      errors.push({
        phraseNum,
        phrase: phrase.target,
        error: `GATE violation (target): unknown words [${unknownTargetWords.join(', ')}] not in available vocabulary`,
        type: 'gate_violation_target',
        unknownWords: unknownTargetWords
      });
    }

    // Check 3: GATE compliance - KNOWN language (ZUT: learner must understand the prompt)
    const knownWords = extractWords(phrase.known);
    const unknownKnownWords = knownWords.filter(w => !availableVocab.known.has(w));

    if (unknownKnownWords.length > 0) {
      errors.push({
        phraseNum,
        phrase: phrase.known,
        error: `GATE violation (known): unknown words [${unknownKnownWords.join(', ')}] - learner won't understand prompt (ZUT fail)`,
        type: 'gate_violation_known',
        unknownWords: unknownKnownWords
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ==============================================================================
// HELPER FUNCTIONS: LEGO DATA PREPARATION FOR WEB AGENTS
// ==============================================================================

/**
 * Identify missing LEGOs in a seed range
 * Returns array of LEGO IDs that need baskets generated
 */
/**
 * Get ALL LEGOs in a seed range (for force regenerate)
 * Does NOT check existing baskets - returns all new LEGOs in range
 */
async function getAllLegosInRange(baseCourseDir, startSeed, endSeed) {
  const legoPairsPath = path.join(baseCourseDir, 'lego_pairs.json');
  const legoPairs = await fs.readJson(legoPairsPath);

  const allLegos = [];

  for (const seed of legoPairs.seeds || []) {
    const seedNum = parseInt(seed.seed_id.replace('S', ''));

    if (seedNum >= startSeed && seedNum <= endSeed) {
      for (const lego of seed.legos || []) {
        // Handle both flat format { known, target } and nested format { lego: { known, target } }
        const legoTarget = lego.lego?.target || lego.target;
        const legoKnown = lego.lego?.known || lego.known;
        if (lego.new && legoTarget && legoKnown) {
          allLegos.push({
            legoId: lego.id,
            seed: seed.seed_id,
            target: legoTarget,
            known: legoKnown,
            type: lego.type || 'M'
          });
        }
      }
    }
  }

  return allLegos;
}

/**
 * Identify LEGOs that are missing baskets (for intelligent resume)
 * Tries database first (if enabled), falls back to local JSON files
 */
async function identifyMissingLegos(baseCourseDir, startSeed, endSeed) {
  // Extract courseCode from baseCourseDir (e.g., /path/to/vfs/zho_for_eng -> zho_for_eng)
  const courseCode = path.basename(baseCourseDir);

  // Try database-first approach
  try {
    const dbMissingLegos = await courseDataService.getMissingLegosFromDatabase(courseCode, startSeed, endSeed);
    if (dbMissingLegos !== null) {
      console.log(`[Phase 3] Using DATABASE for missing LEGO detection: ${dbMissingLegos.length} LEGOs need practice phrases`);
      return dbMissingLegos;
    }
    console.log(`[Phase 3] Database reads disabled, falling back to JSON files`);
  } catch (dbError) {
    console.warn(`[Phase 3] Database query failed, falling back to JSON: ${dbError.message}`);
  }

  // Fallback: JSON-based detection
  console.log(`[Phase 3] Using JSON FILES for missing LEGO detection`);

  const legoPairsPath = path.join(baseCourseDir, 'lego_pairs.json');
  const basketsPath = path.join(baseCourseDir, 'lego_baskets.json');

  // Load lego_pairs to get all LEGOs
  const legoPairs = await fs.readJson(legoPairsPath);

  // Load existing baskets (if exists) - handle both formats:
  // Format A: { baskets: { S0001L01: {...}, ... } }
  // Format B: { S0001L01: {...}, ... } (flat)
  let existingBaskets = {};
  if (await fs.pathExists(basketsPath)) {
    const basketsData = await fs.readJson(basketsPath);
    // Check if wrapped in 'baskets' property or flat at root
    if (basketsData.baskets && typeof basketsData.baskets === 'object') {
      existingBaskets = basketsData.baskets;
    } else {
      // Flat format - use as-is (filter out metadata keys)
      existingBaskets = Object.fromEntries(
        Object.entries(basketsData).filter(([k]) => k.match(/^S\d{4}L\d{2}$/))
      );
    }
  }

  // Find all LEGOs in seed range that don't have baskets
  const missingLegos = [];

  for (const seed of legoPairs.seeds || []) {
    const seedNum = parseInt(seed.seed_id.replace('S', ''));

    if (seedNum >= startSeed && seedNum <= endSeed) {
      for (const lego of seed.legos || []) {
        // Only check new:true LEGOs (first appearance needs basket)
        if (lego.new === true && !existingBaskets[lego.id]) {
          missingLegos.push({
            legoId: lego.id,
            seed: seed.seed_id,    // Keep as 'seed' for compatibility with generateTextScaffold()
            target: lego.target,
            known: lego.known,
            type: lego.type || 'M'
          });
        }
      }
    }
  }

  return missingLegos;
}

/**
 * Load scaffold data for LEGOs
 * Returns object with complete LEGO data ready to embed in prompt
 */
/**
 * Generate text scaffolds for LEGOs
 * Returns object mapping legoId -> human-readable text scaffold
 */
async function loadScaffoldData(baseCourseDir, missingLegos) {
  const legoPairsPath = path.join(baseCourseDir, 'lego_pairs.json');
  const legoPairs = await fs.readJson(legoPairsPath);

  const textScaffolds = {};

  for (const lego of missingLegos) {
    // Generate text scaffold for this LEGO
    const textScaffold = generateTextScaffold(lego, legoPairs, {});
    textScaffolds[lego.legoId] = textScaffold;
  }

  return textScaffolds;
}

// Branch watcher processes (courseCode -> child process)
const watchers = new Map();

/**
 * Get relative course directory for prompts
 */
function getRelativeCourseDir(absolutePath) {
  return absolutePath.replace(VFS_ROOT + '/', '');
}

/**
 * Merge phase3_outputs/*.json into lego_baskets.json
 * Called automatically after branches are merged
 */
async function mergePhase3Outputs(baseCourseDir, courseCode) {
  const phase3Dir = path.join(baseCourseDir, 'phase3_outputs');
  const basketsPath = path.join(baseCourseDir, 'lego_baskets.json');

  console.log(`\n[Phase 3] 📦 Merging phase3_outputs into lego_baskets.json...`);

  if (!await fs.pathExists(phase3Dir)) {
    console.log(`[Phase 3] ⚠️  No phase3_outputs directory found, skipping merge`);
    return;
  }

  const files = await fs.readdir(phase3Dir);
  const basketFiles = files.filter(f => f.match(/seed_S\d{4}_baskets\.json$/));

  if (basketFiles.length === 0) {
    console.log(`[Phase 3] ⚠️  No basket files found in phase3_outputs, skipping merge`);
    return;
  }

  console.log(`[Phase 3] Found ${basketFiles.length} basket files to merge`);

  // Load or create lego_baskets.json
  let legoBaskets = await fs.pathExists(basketsPath)
    ? await fs.readJson(basketsPath)
    : { baskets: {}, metadata: { generated_at: new Date().toISOString() } };

  let totalBaskets = 0;
  let totalPhrases = 0;

  // Merge each file
  for (const file of basketFiles) {
    const filePath = path.join(phase3Dir, file);
    const seedData = await fs.readJson(filePath);

    // Merge baskets
    for (const [basketId, basketData] of Object.entries(seedData.baskets || {})) {
      legoBaskets.baskets[basketId] = basketData;
      totalBaskets++;
      totalPhrases += basketData.practice_phrases?.length || 0;
    }
  }

  // Update metadata
  legoBaskets.metadata = {
    ...legoBaskets.metadata,
    last_merged: new Date().toISOString(),
    total_baskets: Object.keys(legoBaskets.baskets).length,
    merged_from_phase3_outputs: basketFiles.length
  };

  // Write merged file (JSON fallback)
  await fs.writeJson(basketsPath, legoBaskets, { spaces: 2 });

  console.log(`[Phase 3] ✅ Merge complete:`);
  console.log(`[Phase 3]    Added ${totalBaskets} baskets`);
  console.log(`[Phase 3]    Total ${totalPhrases} practice phrases`);
  console.log(`[Phase 3]    Output: ${basketsPath}`);

  // DATABASE-FIRST: Write basket phrases to database
  let dbPhrases = 0;
  if (courseDataService.USE_DATABASE_WRITES) {
    try {
      for (const [legoId, basketData] of Object.entries(legoBaskets.baskets || {})) {
        const result = await courseDataService.importBasket(courseCode, legoId, basketData);
        if (result) {
          dbPhrases += result.phraseCount || 0;
        }
      }
      console.log(`[Phase 3] 💾 Database: Saved ${dbPhrases} phrases to database`);
    } catch (dbError) {
      console.error(`[Phase 3] ⚠️  Database write failed:`, dbError.message);
    }
  }
}

/**
 * POST /start
 * Start Phase 3 basket generation for a course
 *
 * Body: {
 *   courseCode: string,          // e.g., "spa_for_eng" or "spa_for_eng_s0001-0100"
 *   startSeed: number,            // e.g., 1
 *   endSeed: number,              // e.g., 668
 *   target: string,               // e.g., "Spanish"
 *   known: string,                // e.g., "English"
 *
 *   // Optional: Parallelization override
 *   browserWindows?: number,      // Default from config
 *   agentsPerWindow?: number,     // Default from config
 *   seedsPerAgent?: number        // Default from config (usually 10)
 * }
 */
app.post('/start', async (req, res) => {
  const {
    courseCode,
    startSeed,
    endSeed,
    target,
    known,
    browserWindows,
    agentsPerWindow,
    seedsPerAgent,
    stagingOnly = false,
    spawnerMode = 'cli'  // 'cli' (iTerm2 + Claude CLI) or 'browser' (Safari)
  } = req.body;

  if (!courseCode || !startSeed || !endSeed || !target || !known) {
    return res.status(400).json({ error: 'courseCode, startSeed, endSeed, target, known required' });
  }

  // PRE-FLIGHT CHECK: Verify orchestrator is online before spawning browsers
  try {
    console.log(`[Phase 3] Pre-flight check: verifying orchestrator at ${ngrokUrl}...`);
    const healthCheck = await fetch(`${ngrokUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!healthCheck.ok) {
      console.error(`[Phase 3] ❌ Pre-flight failed: orchestrator returned ${healthCheck.status}`);
      return res.status(503).json({
        error: 'Orchestrator is not healthy',
        orchestratorUrl: ORCHESTRATOR_URL,
        status: healthCheck.status,
        tip: 'Start the orchestrator first: npm run pipeline'
      });
    }
    console.log(`[Phase 3] ✅ Pre-flight passed: orchestrator is online`);
  } catch (error) {
    console.error(`[Phase 3] ❌ Pre-flight failed: cannot reach orchestrator`);
    console.error(`[Phase 3]    Error: ${error.message}`);
    return res.status(503).json({
      error: 'Cannot reach orchestrator - is it running?',
      orchestratorUrl: ORCHESTRATOR_URL,
      errorMessage: error.message,
      tip: 'Start the orchestrator first: npm run pipeline'
    });
  }

  // Check if already running - auto-abort stale jobs
  if (activeJobs.has(courseCode)) {
    const existingJob = activeJobs.get(courseCode);

    // Handle jobs with missing timing field (legacy or corrupted state)
    if (!existingJob.timing || !existingJob.timing.startedAt) {
      console.log(`[Phase 3] ⚠️  Found job with missing timing data, auto-aborting`);
      activeJobs.delete(courseCode);
    } else {
      const jobAge = Date.now() - new Date(existingJob.timing.startedAt).getTime();
      const thirtyMinutes = 30 * 60 * 1000;

      if (jobAge > thirtyMinutes) {
        console.log(`[Phase 3] ⚠️  Auto-aborting stale job (${Math.round(jobAge / 60000)} minutes old)`);
        activeJobs.delete(courseCode);
      } else {
        return res.status(409).json({
          error: `Phase 3 already running for ${courseCode}`,
          elapsedMinutes: Math.round(jobAge / 60000),
          tip: 'Use /abort endpoint or wait for auto-timeout (30min)'
        });
      }
    }
  }

  const totalSeeds = endSeed - startSeed + 1;

  console.log(`\n[Phase 3] ====================================`);
  console.log(`[Phase 3] PHASE 3: PRACTICE BASKETS`);
  console.log(`[Phase 3] ====================================`);
  console.log(`[Phase 3] Course: ${courseCode}`);
  console.log(`[Phase 3] Seeds: ${startSeed}-${endSeed} (${totalSeeds} total)`);
  console.log(`[Phase 3] Target: ${target}, Known: ${known}`);

  // Detect segment range and get base course code
  const segmentMatch = courseCode.match(/^([a-z]{3}_for_[a-z]{3})_s\d{4}-\d{4}$/);
  const baseCourseCode = segmentMatch ? segmentMatch[1] : courseCode;
  const baseCourseDir = path.join(VFS_ROOT, baseCourseCode);
  const courseDir = path.join(VFS_ROOT, courseCode);

  if (segmentMatch) {
    console.log(`[Phase 3] Segment range detected: ${courseCode}`);
    console.log(`[Phase 3] Using base course: ${baseCourseCode}`);
  }

  // Check prerequisites in base course directory
  const seedPairsPath = path.join(baseCourseDir, 'seed_pairs.json');
  const legoPairsPath = path.join(baseCourseDir, 'lego_pairs.json');

  // lego_pairs.json is always required
  if (!await fs.pathExists(legoPairsPath)) {
    return res.status(400).json({ error: `Phase 3 requires lego_pairs.json in ${baseCourseCode} - run Phase 2 first` });
  }

  // seed_pairs.json is optional in v2 format (seed_pair embedded in lego_pairs.json)
  const hasSeedPairs = await fs.pathExists(seedPairsPath);
  if (!hasSeedPairs) {
    // Check if lego_pairs.json has embedded seed_pair (v2 format)
    const legoPairs = await fs.readJson(legoPairsPath);
    const hasEmbeddedSeedPairs = legoPairs.seeds?.some(s => s.seed_pair);
    if (!hasEmbeddedSeedPairs) {
      return res.status(400).json({ error: `Phase 3 requires seed_pairs.json OR embedded seed_pair in lego_pairs.json - run Phase 1 first` });
    }
    console.log(`[Phase 3] ✅ Using v2 format (seed_pair embedded in lego_pairs.json)`);
  }

  console.log(`[Phase 3] ✅ Prerequisites found`);

  // NOTE: Removed early completion check (lines 315-342)
  // This was checking basketCount >= expectedCount, but that's unreliable after deletions
  // (e.g., 2954 baskets but 213 missing after Spanish cleanup deleted incorrect baskets)
  // The correct check is done later by identifyMissingLegos() which checks WHICH baskets exist,
  // not just the count. See lines 417-430 for intelligent resume logic.

  // ALWAYS use intelligent resume (only missing LEGOs) unless forceRegenerate is explicitly true
  const forceRegenerate = req.body.forceRegenerate === true;
  const isFullCourse = !forceRegenerate;
  const basketsPath = path.join(baseCourseDir, 'lego_baskets.json');

  if (forceRegenerate) {
    console.log(`[Phase 3] ⚠️ Force regenerate mode - will regenerate ALL LEGOs in range ${startSeed}-${endSeed}`);
  } else {
    console.log(`[Phase 3] 🔄 Intelligent resume mode - will only process MISSING LEGOs in range ${startSeed}-${endSeed}`);
  }

  // Initialize job state with enhanced tracking
  const job = {
    courseCode,
    totalSeeds,
    baseCourseCode,
    baseCourseDir,
    startSeed,
    endSeed,
    target,
    known,
    stagingOnly,
    status: 'preparing_scaffolds',
    startedAt: new Date().toISOString(),

    // Upload tracking (NEW for HTTP-based workflow)
    uploads: {
      seedsUploaded: new Set(),      // Track which seeds have been uploaded
      legosReceived: 0,               // Total LEGOs uploaded
      expectedSeeds: totalSeeds,       // Seeds we're waiting for
      expectedLegos: null,             // Will be set after reading lego_pairs.json
      lastUploadAt: null,
      complete: false
    },

    // Milestone tracking
    milestones: {
      scaffoldsReady: false,
      scaffoldsReadyAt: null,
      watcherStarted: false,
      watcherStartedAt: null,
      windowsSpawned: 0,
      windowsTotal: 0,
      lastWindowSpawnedAt: null,
      branchesDetected: 0,
      branchesExpected: 0,
      lastBranchDetectedAt: null,
      branchesMerged: 0,
      mergeStartedAt: null,
      mergeCompletedAt: null
    },

    // Branch tracking (detailed)
    branches: [],

    // Master/Worker tracking (for swimlane monitoring)
    masters: [],

    // Configuration (set after prep)
    config: null,

    // Legacy fields (for backward compatibility)
    windowsSpawned: 0,
    branchesDetected: 0,
    merged: false,
    error: null,
    warnings: []
  };

  activeJobs.set(courseCode, job);

  try {
    // STEP 1: Scaffolds already exist in phase3_scaffolds/ directory
    // No need to generate them - they're pre-existing data files
    console.log(`\n[Phase 3] Using existing scaffolds from: ${path.join(baseCourseDir, 'phase3_scaffolds')}`);

    // Update milestone
    job.milestones.scaffoldsReady = true;
    job.milestones.scaffoldsReadyAt = new Date().toISOString();

    // STEP 1.5: Identify LEGOs to generate
    // - Full course: Intelligent resume (only missing LEGOs)
    // - Specific range: Force regenerate (all LEGOs in range)
    let targetLegos;

    if (isFullCourse) {
      console.log(`\n[Phase 3] 🔄 Full course mode: Identifying missing LEGOs for intelligent resume...`);
      targetLegos = await identifyMissingLegos(baseCourseDir, startSeed, endSeed);
      console.log(`[Phase 3] ✅ Found ${targetLegos.length} LEGOs needing baskets`);

      if (targetLegos.length === 0) {
        console.log(`[Phase 3] ✅ All baskets already exist - Phase 3 complete!`);
        return res.json({
          success: true,
          alreadyComplete: true,
          message: `Phase 3 complete - all baskets exist`,
          basketCount: 0
        });
      }
    } else {
      console.log(`\n[Phase 3] 🎯 Specific range mode: Force regenerating seeds ${startSeed}-${endSeed}...`);
      // Get ALL LEGOs in range (ignore existing baskets)
      targetLegos = await getAllLegosInRange(baseCourseDir, startSeed, endSeed);
      console.log(`[Phase 3] ✅ Found ${targetLegos.length} LEGOs to generate (force regenerate)`);
    }

    console.log(`\n[Phase 3] Loading scaffold data for ${targetLegos.length} LEGOs...`);
    const legoData = await loadScaffoldData(baseCourseDir, targetLegos);
    console.log(`[Phase 3] ✅ Scaffold data loaded and ready for embedding`);

    // Store in job for tracking
    job.targetLegos = targetLegos;
    job.legoData = legoData;

    // Set expected LEGOs for upload tracking
    job.uploads.expectedLegos = targetLegos.length;

    // STEP 2: MASTER/WORKER CONFIGURATION - LEGO-BASED SCALING
    // Use centralized config for parallelization patterns
    const config = loadConfig();
    const phase3Config = config.phase_overrides?.phase3_basket_generation || {};

    // LEGO-based assignment: LEGOs are the work unit, not seeds
    const legosToProcess = targetLegos.length;

    // Get Phase 3 specific config (defaults from config file)
    const AGENTS_PER_BROWSER = phase3Config.agents_per_browser || 13;

    // Determine LEGOs per agent: 10 for fresh runs, 5 for resume (smaller batches)
    // "Resume" = some LEGOs already have baskets (partial completion)
    // We detect this by checking if we're processing fewer LEGOs than the total NEW LEGOs
    const totalNewLegosInCourse = await getTotalNewLegosForCourse(courseCode);
    const isResumeMode = totalNewLegosInCourse > 0 && legosToProcess < totalNewLegosInCourse;
    const LEGOS_PER_AGENT = isResumeMode
      ? (phase3Config.legos_per_agent_resume || 5)
      : (phase3Config.legos_per_agent || 10);

    console.log(`[Phase 3]    Total NEW LEGOs in course: ${totalNewLegosInCourse}`);
    console.log(`[Phase 3]    LEGOs to process: ${legosToProcess} (${isResumeMode ? 'RESUME' : 'FRESH'} mode)`);

    let masterCount, workersPerMaster, legosPerWorker;

    if (legosToProcess === 0) {
      masterCount = 0;
      workersPerMaster = 0;
      legosPerWorker = 0;
    } else {
      workersPerMaster = AGENTS_PER_BROWSER;

      // Calculate how many total workers needed
      const totalWorkersNeeded = Math.ceil(legosToProcess / LEGOS_PER_AGENT);

      // Calculate how many masters (browser tabs) needed
      masterCount = Math.max(1, Math.ceil(totalWorkersNeeded / AGENTS_PER_BROWSER));

      // Recalculate actual LEGOs per worker based on total workers
      const totalWorkers = masterCount * workersPerMaster;
      legosPerWorker = Math.ceil(legosToProcess / totalWorkers);

      console.log(`\n[Phase 3] 📊 LEGO-Based Scaling:`);
      console.log(`[Phase 3]    Mode: ${isResumeMode ? 'Resume (5 LEGOs/agent)' : 'Fresh (10 LEGOs/agent)'}`);
      console.log(`[Phase 3]    LEGOs to process: ${legosToProcess}`);
      console.log(`[Phase 3]    Pattern: ${masterCount} browsers × ${workersPerMaster} agents × ~${legosPerWorker} LEGOs/agent`);
    }

    const totalWorkers = masterCount * workersPerMaster;

    console.log(`\n[Phase 3] Master/Worker Configuration:`);
    console.log(`[Phase 3]    Masters: ${masterCount} browser tabs`);
    console.log(`[Phase 3]    Workers per Master: ${workersPerMaster} (via Task tool)`);
    console.log(`[Phase 3]    LEGOs per worker: ~${legosPerWorker}`);
    console.log(`[Phase 3]    Total workers: ${totalWorkers}`);
    console.log(`[Phase 3]    Target LEGOs: ${legosToProcess} LEGOs`);

    job.config = {
      masterCount,
      workersPerMaster,
      legosPerWorker,
      totalWorkers,
      legosToProcess,
      isResumeMode,
      // Legacy fields for backward compatibility
      browsers: masterCount,
      agents: workersPerMaster,
      totalAgents: totalWorkers
    };
    job.milestones.windowsTotal = masterCount;
    job.milestones.branchesExpected = 0; // No git branches in ngrok architecture
    job.status = 'spawning_masters';

    // STEP 3: Spawn Master agents (CLI or Safari based on spawnerMode)
    // Each Master spawns workers via Task tool, workers upload via ngrok
    console.log(`[Phase 3] Using spawner mode: ${spawnerMode} (${spawnerMode === 'cli' ? 'iTerm2 + Claude CLI' : 'Safari + Claude Web'})`);
    await spawnBrowserWindows(courseCode, {
      target,
      known,
      startSeed,
      endSeed,
      legoData,        // ← Scaffold data for Masters to pass to workers
      targetLegos,     // ← List of LEGOs to generate (missing or force regenerate)
      stagingOnly,     // ← Pass through staging flag
      spawnerMode      // ← 'cli' or 'browser'
    }, baseCourseDir, masterCount, workersPerMaster, legosPerWorker, job);

    res.json({
      success: true,
      message: `Phase 3 started for ${courseCode}`,
      job: {
        courseCode,
        totalSeeds,
        config: job.config,
        status: 'running'
      }
    });
  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    activeJobs.delete(courseCode);

    console.error(`[Phase 3] ❌ Failed to start:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /preview/:courseCode
 * Preview what a Phase 3 job would look like without starting it (dry run)
 */
app.get('/preview/:courseCode', async (req, res) => {
  const { courseCode } = req.params;

  console.log(`\n[Phase 3] 🔍 Preview requested for: ${courseCode}`);

  try {
    // Parse course code for language pair
    const parts = courseCode.split('_for_');
    if (parts.length !== 2) {
      return res.status(400).json({ error: 'Invalid course code format. Expected: target_for_known' });
    }

    const [target, known] = parts;
    const baseCourseDir = path.join(__dirname, '..', '..', '..', 'public', 'vfs', 'courses', courseCode);

    // Check if course exists
    if (!await fs.pathExists(baseCourseDir)) {
      return res.status(404).json({ error: `Course not found: ${courseCode}` });
    }

    // Check for existing active job
    const existingJob = activeJobs.get(courseCode);
    if (existingJob) {
      return res.json({
        phase: 3,
        courseCode,
        hasActiveJob: true,
        jobStatus: existingJob.status,
        message: 'A Phase 3 job is already running for this course'
      });
    }

    // Get seed range (full course)
    const legoPairsPath = path.join(baseCourseDir, 'lego_pairs.json');
    if (!await fs.pathExists(legoPairsPath)) {
      return res.status(400).json({ error: 'lego_pairs.json not found - Phase 2 must complete first' });
    }

    const legoPairs = await fs.readJson(legoPairsPath);
    const allSeeds = legoPairs.seeds || [];
    const seedNumbers = allSeeds.map(s => parseInt(s.seed_id.replace('S', '')));
    const startSeed = Math.min(...seedNumbers);
    const endSeed = Math.max(...seedNumbers);

    // Identify missing LEGOs
    const missingLegos = await identifyMissingLegos(baseCourseDir, startSeed, endSeed);
    const legosToProcess = missingLegos.length;

    if (legosToProcess === 0) {
      return res.json({
        phase: 3,
        courseCode,
        alreadyComplete: true,
        legosToProcess: 0,
        message: 'Phase 3 is already complete - all baskets exist'
      });
    }

    // Calculate job shape using same logic as generate endpoint
    const config = loadConfig();
    const phase3Config = config.phase_overrides?.phase3_basket_generation || {};
    const AGENTS_PER_BROWSER = phase3Config.agents_per_browser || 13;

    // Determine LEGOs per agent: 10 for fresh runs, 5 for resume
    const totalNewLegosInCourse = await getTotalNewLegosForCourse(courseCode);
    const isResumeMode = totalNewLegosInCourse > 0 && legosToProcess < totalNewLegosInCourse;
    const LEGOS_PER_AGENT = isResumeMode
      ? (phase3Config.legos_per_agent_resume || 5)
      : (phase3Config.legos_per_agent || 10);

    // Calculate workers and browsers needed
    const totalWorkersNeeded = Math.ceil(legosToProcess / LEGOS_PER_AGENT);
    const masterCount = Math.max(1, Math.ceil(totalWorkersNeeded / AGENTS_PER_BROWSER));
    const totalWorkers = masterCount * AGENTS_PER_BROWSER;
    const legosPerWorker = Math.ceil(legosToProcess / totalWorkers);

    // Estimate time based on parallel processing
    // Each agent processes ~1 LEGO/minute, all agents work in parallel
    // So total time ≈ LEGOs per agent (the work each agent does)
    const legosPerMinutePerAgent = 1; // Conservative: 1 LEGO/min per agent
    const estimatedMinutes = Math.ceil(legosPerWorker / legosPerMinutePerAgent);
    // Total throughput for display (all agents combined)
    const estimatedRate = totalWorkers * legosPerMinutePerAgent;

    // Get breakdown by LEGO type
    const typeBreakdown = {};
    for (const lego of missingLegos) {
      const type = lego.type || 'M';
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
    }

    console.log(`[Phase 3] Preview: ${legosToProcess} LEGOs, ${masterCount} browsers × ${AGENTS_PER_BROWSER} agents`);

    res.json({
      phase: 3,
      courseCode,
      hasActiveJob: false,

      // Job shape
      legosToProcess,
      totalNewLegosInCourse,
      isResumeMode,
      mode: isResumeMode ? 'resume' : 'fresh',

      // Worker configuration
      browserTabs: masterCount,
      agentsPerBrowser: AGENTS_PER_BROWSER,
      totalAgents: totalWorkers,
      legosPerAgent: LEGOS_PER_AGENT,
      legosPerWorker,

      // LEGO breakdown
      typeBreakdown,

      // Seed range
      seedRange: { start: startSeed, end: endSeed },

      // Time estimate
      estimatedMinutes,
      estimatedRate,

      // Summary message
      summary: `Will process ${legosToProcess} LEGOs using ${masterCount} browser tab${masterCount > 1 ? 's' : ''} × ${AGENTS_PER_BROWSER} agents (${isResumeMode ? 'resume' : 'fresh'} mode, ~${LEGOS_PER_AGENT} LEGOs/agent)`
    });

  } catch (error) {
    console.error(`[Phase 3] Preview error:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /status/:courseCode
 * Get Phase 3 progress for a course (Enhanced with realistic observables)
 */
app.get('/status/:courseCode', (req, res) => {
  const { courseCode } = req.params;
  const job = activeJobs.get(courseCode);

  if (!job) {
    return res.status(404).json({ error: `No Phase 3 job found for ${courseCode}` });
  }

  // Calculate timing metrics
  const startTime = new Date(job.startedAt).getTime();
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - startTime) / 1000);

  // Calculate velocity (if branches are appearing)
  let velocity = null;
  if (job.branches && job.branches.length > 0) {
    const firstBranchTime = new Date(job.branches[0].detectedAt).getTime();
    const elapsedSinceFirstBranch = (now - firstBranchTime) / 1000;
    const avgSecondsPerBranch = elapsedSinceFirstBranch / job.branches.length;
    const remainingBranches = job.milestones.branchesExpected - job.branches.length;
    const estimatedSecondsRemaining = remainingBranches * avgSecondsPerBranch;

    velocity = {
      branchesCompleted: job.branches.length,
      elapsedSinceFirstBranch: Math.floor(elapsedSinceFirstBranch),
      avgSecondsPerBranch: Math.floor(avgSecondsPerBranch),
      estimatedSecondsRemaining: Math.floor(estimatedSecondsRemaining),
      estimatedCompletionAt: new Date(now + estimatedSecondsRemaining * 1000).toISOString()
    };
  }

  // Calculate coverage
  const coverage = job.config ? {
    seedsAssigned: job.config.capacity || 0,
    seedsActual: job.totalSeeds,
    seedsUnassigned: Math.max(0, job.totalSeeds - (job.config.capacity || 0)),
    coveragePercent: job.config.capacity ?
      Math.round((Math.min(job.totalSeeds, job.config.capacity) / job.totalSeeds) * 1000) / 10 : 0
  } : null;

  // Determine sub-status
  let subStatus = null;
  if (job.status === 'spawning_windows') {
    if (job.milestones.windowsSpawned < job.milestones.windowsTotal) {
      subStatus = `spawning_window_${job.milestones.windowsSpawned + 1}_of_${job.milestones.windowsTotal}`;
    } else {
      subStatus = 'all_windows_spawned';
    }
  } else if (job.status === 'waiting_for_branches') {
    if (job.milestones.branchesDetected === 0) {
      subStatus = 'waiting_for_first_branch';
    } else {
      subStatus = `${job.milestones.branchesDetected}_of_${job.milestones.branchesExpected}_branches_detected`;
    }
  } else if (job.status === 'merging_branches') {
    subStatus = 'merge_in_progress';
  }

  res.json({
    courseCode,
    status: job.status,
    subStatus,

    milestones: job.milestones,

    branches: job.branches.map(b => ({
      branchName: b.branchName,
      detectedAt: b.detectedAt,
      seedRange: b.seedRange,
      expectedSeeds: b.expectedSeeds,
      merged: b.merged || false
    })),

    timing: {
      startedAt: job.startedAt,
      elapsedSeconds,
      velocity
    },

    coverage,

    config: job.config,

    error: job.error,
    warnings: job.warnings || [],

    // Master/Worker swimlane data (for agent monitoring dashboard)
    masters: (job.masters || []).map(m => ({
      masterNum: m.masterNum,
      seedRange: m.seedRange,
      status: m.status,
      spawnedAt: m.spawnedAt,
      lastActivityAt: m.lastActivityAt,
      legosExpected: m.legosExpected,
      legosReceived: m.legosReceived,
      error: m.error,
      workers: (m.workers || []).map(w => ({
        workerNum: w.workerNum,
        legoCount: w.legoCount,
        status: w.status,
        lastUpload: w.lastUpload
      }))
    })),

    // Upload tracking
    uploads: job.uploads ? {
      legosReceived: job.uploads.legosReceived,
      expectedLegos: job.uploads.expectedLegos,
      seedsUploaded: job.uploads.seedsUploaded ? job.uploads.seedsUploaded.size : 0,
      expectedSeeds: job.uploads.expectedSeeds,
      lastUploadAt: job.uploads.lastUploadAt,
      complete: job.uploads.complete
    } : null,

    // Legacy fields for backward compatibility
    windowsSpawned: job.windowsSpawned,
    branchesDetected: job.branchesDetected,
    merged: job.merged
  });
});

/**
 * POST /abort/:courseCode
 * Emergency stop for Phase 3
 */
app.post('/abort/:courseCode', (req, res) => {
  const { courseCode } = req.params;

  console.log(`\n[Phase 3] 🛑 Aborting for ${courseCode}...`);

  // Stop watcher
  const watcher = watchers.get(courseCode);
  if (watcher) {
    watcher.kill('SIGTERM');
    watchers.delete(courseCode);
  }

  // Remove job
  activeJobs.delete(courseCode);

  res.json({ success: true, message: `Aborted Phase 3 for ${courseCode}` });
});

/**
 * Start branch watcher for a course
 * Migrated from automation_server.cjs + watch_and_merge_branches.cjs
 */
async function startBranchWatcher(courseCode, expectedWindows, baseCourseDir, customPattern = null) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(baseCourseDir, 'lego_baskets.json');
    const scriptPath = path.join(__dirname, '../../scripts/watch_and_merge_branches.cjs');

    // Simple pattern: ANY claude/ branch created after job start
    // The watcher script filters by timestamp (isNew), not by name pattern
    const branchPattern = 'claude/';

    console.log(`\n[Phase 3] 👀 Starting branch watcher for ${courseCode}...`);
    console.log(`[Phase 3]    Pattern: ${branchPattern}`);
    console.log(`[Phase 3]    Waiting for ${expectedWindows} branches`);
    console.log(`[Phase 3]    Output: ${outputPath}`);

    const watcher = spawn('node', [
      scriptPath,
      '--watch',
      '--pattern', branchPattern,
      '--output', outputPath,
      '--min-branches', expectedWindows.toString(),
      '--auto-delete'
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    watcher.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => {
        console.log(`  [Watcher] ${line}`);

        const job = activeJobs.get(courseCode);
        if (!job) return;

        // Detect new branch
        const newBranchMatch = line.match(/New branch detected: (claude\/[\w-]+)/);
        if (newBranchMatch) {
          const branchName = newBranchMatch[1];

          // Extract window number if possible
          const windowMatch = branchName.match(/window-(\d+)/i);
          const windowNum = windowMatch ? parseInt(windowMatch[1]) : null;

          // Calculate seed range based on window number and config
          let seedRange = 'unknown';
          let expectedSeeds = 0;
          if (windowNum && job.config) {
            const seedsPerWindow = job.config.agents * job.config.seedsPerAgent;
            const windowStartSeed = job.startSeed + ((windowNum - 1) * seedsPerWindow);
            const windowEndSeed = Math.min(windowStartSeed + seedsPerWindow - 1, job.endSeed);
            seedRange = `S${String(windowStartSeed).padStart(4, '0')}-S${String(windowEndSeed).padStart(4, '0')}`;
            expectedSeeds = windowEndSeed - windowStartSeed + 1;
          }

          // Add to branches array
          job.branches.push({
            branchName,
            detectedAt: new Date().toISOString(),
            seedRange,
            expectedSeeds,
            merged: false
          });

          // Update milestones
          job.milestones.branchesDetected = job.branches.length;
          job.milestones.lastBranchDetectedAt = new Date().toISOString();
          job.branchesDetected = job.branches.length; // Legacy

          console.log(`  [Watcher] Branch ${job.branches.length}/${job.milestones.branchesExpected}: ${branchName} (${seedRange})`);
        }

        // Detect merge start
        if (line.includes('Starting merge') || line.includes('Merging')) {
          job.milestones.mergeStartedAt = new Date().toISOString();
          job.status = 'merging_branches';
        }

        // Detect merge completion
        if (line.includes('Merged') || line.includes('✅ All branches merged')) {
          job.merged = true;
          job.milestones.branchesMerged = job.branches.length;
          job.milestones.mergeCompletedAt = new Date().toISOString();
          job.status = 'complete';

          // Mark all branches as merged
          job.branches.forEach(b => b.merged = true);

          // Auto-merge phase3_outputs into lego_baskets.json
          mergePhase3Outputs(baseCourseDir, courseCode);

          notifyOrchestrator(courseCode, 'complete');
        }

        // Detect branch count (fallback if new branch detection fails)
        const branchMatch = line.match(/(\d+) branches ready/);
        if (branchMatch) {
          const count = parseInt(branchMatch[1]);
          job.milestones.branchesDetected = count;
          job.branchesDetected = count; // Legacy
        }
      });
    });

    watcher.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => {
        console.error(`  [Watcher Error] ${line}`);
      });
    });

    watcher.on('error', (err) => {
      console.error(`[Phase 3] ❌ Watcher failed to start:`, err);
      reject(err);
    });

    watcher.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[Phase 3] ❌ Watcher exited with code ${code}`);
      }
      watchers.delete(courseCode);
    });

    watchers.set(courseCode, watcher);

    // Give watcher a moment to start
    setTimeout(() => resolve(), 1000);
  });
}

/**
 * Spawn Master browser tabs (THREE-TIER ARCHITECTURE - LEGO-BASED)
 * Each Master receives a chunk of LEGOs (sorted by ID) and spawns Worker agents via Task tool
 *
 * @param {string} courseCode - Course identifier
 * @param {object} params - Contains legoData, targetLegos, startSeed, endSeed, etc.
 * @param {string} baseCourseDir - Base course directory path
 * @param {number} masterCount - Number of Master tabs to spawn
 * @param {number} workersPerMaster - Workers each Master spawns via Task tool (13)
 * @param {number} legosPerWorker - LEGOs per worker agent (10 fresh, 5 resume)
 * @param {object} job - Job tracking object
 */
async function spawnBrowserWindows(courseCode, params, baseCourseDir, masterCount, workersPerMaster, legosPerWorker, job = null) {
  const { target, known, startSeed, endSeed, legoData, targetLegos, spawnerMode = 'cli' } = params;
  const modeLabel = spawnerMode === 'cli' ? 'CLI agents (iTerm2)' : 'Safari tabs';

  console.log(`\n[Phase 3] 🌐 Spawning ${masterCount} Master ${modeLabel}...`);
  console.log(`[Phase 3]    Spawner mode: ${spawnerMode}`);
  console.log(`[Phase 3]    Each Master spawns ${workersPerMaster} workers via Task tool`);
  console.log(`[Phase 3]    Each worker processes ~${legosPerWorker} LEGOs`);
  console.log(`[Phase 3]    Total LEGOs: ${targetLegos.length}`);

  const config = loadConfig();
  const spawnDelay = config.phase3_basket_generation.browser_spawn_delay_ms || 5000;

  // LEGO-BASED ASSIGNMENT: Sort LEGOs by ID (lowest to highest)
  const sortedLegos = [...targetLegos].sort((a, b) => {
    // Sort by legoId (e.g., S0001L01, S0001L02, S0002L01...)
    return a.legoId.localeCompare(b.legoId);
  });

  console.log(`[Phase 3]    LEGOs sorted: ${sortedLegos[0]?.legoId} to ${sortedLegos[sortedLegos.length - 1]?.legoId}`);

  // Calculate LEGOs per Master (divide total LEGOs evenly among masters)
  const legosPerMaster = Math.ceil(sortedLegos.length / masterCount);

  for (let masterNum = 1; masterNum <= masterCount; masterNum++) {
    console.log(`\n[Phase 3]   Master${masterNum}/${masterCount}:`);

    // Calculate this Master's LEGO chunk (direct slice, not grouped by seed)
    const masterStartIdx = (masterNum - 1) * legosPerMaster;
    const masterEndIdx = Math.min(masterNum * legosPerMaster, sortedLegos.length);
    const masterTargetLegos = sortedLegos.slice(masterStartIdx, masterEndIdx);

    // Skip if no LEGOs for this master
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

    const dataSize = Math.round(JSON.stringify(masterLegoData).length / 1024);
    const firstLegoId = masterTargetLegos[0]?.legoId || 'N/A';
    const lastLegoId = masterTargetLegos[masterTargetLegos.length - 1]?.legoId || 'N/A';
    console.log(`[Phase 3]    LEGOs: ${firstLegoId} to ${lastLegoId} (${masterTargetLegos.length} LEGOs)`);
    console.log(`[Phase 3]    Scaffold data: ${dataSize} KB`);
    console.log(`[Phase 3]    Will spawn ${workersPerMaster} workers via Task tool`);

    // Generate Master orchestrator prompt with LEGO-based assignments
    const masterPrompt = generatePhase3OrchestratorPrompt(
      courseCode,
      {
        target,
        known,
        legoData: masterLegoData,
        targetLegos: masterTargetLegos,
        agentsPerWindow: workersPerMaster,  // Workers this Master should spawn
        legosPerWorker,                      // LEGOs each worker should process
        stagingOnly: params.stagingOnly
      },
      baseCourseDir
    );

    try {
      // Use unified spawner based on spawnerMode
      if (spawnerMode === 'cli') {
        // CLI mode: use iTerm2 + Claude CLI
        await unifiedSpawner.spawnSingleAgent(masterPrompt, {
          mode: 'cli',
          model: 'sonnet',
          workingDir: baseCourseDir
        });
      } else {
        // Browser mode: use Safari + Claude Web (legacy)
        await spawnClaudeCodeSession(masterPrompt, `phase3-master-${masterNum}`);
      }

      // Update milestones
      if (job) {
        job.windowsSpawned++;
        job.milestones.windowsSpawned = job.windowsSpawned;
        job.milestones.lastWindowSpawnedAt = new Date().toISOString();
      }

      // Stagger Master spawns (default 5000ms for browser, 2000ms for CLI)
      const actualDelay = spawnerMode === 'cli' ? Math.min(spawnDelay, 2000) : spawnDelay;
      if (masterNum < masterCount) {
        console.log(`[Phase 3]    Waiting ${actualDelay}ms before next Master...`);
        await new Promise(resolve => setTimeout(resolve, actualDelay));
      }
    } catch (error) {
      console.error(`[Phase 3]     ❌ Failed to spawn Master ${masterNum}:`, error.message);
      if (job && !job.warnings) job.warnings = [];
      if (job) job.warnings.push(`Failed to spawn Master ${masterNum}: ${error.message}`);
    }
  }

  console.log(`\n[Phase 3] ✅ Spawned ${masterCount} Master ${modeLabel}`);
  console.log(`[Phase 3]    Masters will spawn ${masterCount * workersPerMaster} workers total`);
  console.log(`[Phase 3]    Workers upload baskets via ngrok`);

  if (job) {
    job.status = 'workers_generating';
  }
}

/**
 * Generate Phase 3 Master Prompt - Self-Managing Practice Basket Generation
 * Supports both regular mode (LEGO-based) and regeneration mode (specific LEGO_IDs)
 */
function generatePhase3OrchestratorPrompt(courseCode, params, courseDir) {
  const { target, known, legoIds, isRegeneration, agentsPerWindow, legosPerWorker } = params;

  const relativeDir = getRelativeCourseDir(courseDir);

  if (isRegeneration) {
    // REGENERATION MODE: Generate baskets for specific LEGO_IDs only
    const legosPerAgent = 50; // 50 LEGOs per agent (10 per LEGO × 5 LEGOs = manageable)
    const agentCount = Math.ceil(legoIds.length / legosPerAgent);

    return `# Phase 3 Orchestrator: Regenerate ${legoIds.length} Baskets

**Course**: ${courseCode}
**Mode**: BASKET REGENERATION
**Total LEGOs**: ${legoIds.length} specific LEGO_IDs
**Required Agents**: ${agentCount} parallel agents
**LEGOs per agent**: ~${legosPerAgent}

---

## 🎯 YOUR ONLY JOB: Spawn Agents for Regeneration

You are the orchestrator. **DO NOT** read files or generate content yourself.

**Your task:**
1. Spawn ${agentCount} agents in parallel
2. Pass each agent its specific LEGO_IDs to regenerate
3. Monitor progress and report when complete

**CRITICAL: Each agent should:**
- Read scaffolds ONLY for its assigned LEGO_IDs from \`${relativeDir}/phase3_scaffolds/\`
- Generate baskets using Phase 3 intelligence: https://ssi-dashboard-v7.vercel.app/docs/phase_intelligence/phase_3_lego_baskets.md
- Save outputs to \`${relativeDir}/phase3_outputs/\`
- Follow the EXACT same workflow as regular Phase 3

**LEGO_IDs to distribute among ${agentCount} agents:**
${legoIds.slice(0, 10).join(', ')}${legoIds.length > 10 ? ` ... and ${legoIds.length - 10} more` : ''}

**OUTPUT WORKFLOW** (each agent must follow):
1. Fetch LEGO details: \`GET ${ngrokUrl}/api/courses/${courseCode}/phase-outputs/2/lego_pairs.json\`
2. Fetch phase intelligence: \`GET ${ngrokUrl}/api/phase-intelligence/3\`
3. Generate practice baskets using Phase 3 intelligence guidelines
4. Submit baskets: \`POST ${BASKET_UPLOAD_URL}\`
   - Body: \`{ course: "${courseCode}", seed: "S0XXX", baskets: { "S0XXXL01": { "lego": {...}, "practice_phrases": [...] } } }\`
   - Expected: \`{ success: true, basketCount: N }\`
5. No manual file operations - all submission via REST API

---

## 🚀 SPAWN ALL ${agentCount} AGENTS NOW

Use the Task tool ${agentCount} times in a single message to spawn all agents in parallel.

Divide the ${legoIds.length} LEGO_IDs evenly among the ${agentCount} agents (~${legosPerAgent} LEGOs each).

**Worker prompt template:** Fetch from https://ssi-dashboard-v7.vercel.app/prompts/phase3_worker.md (includes full Phase 3 intelligence guidance)
`;
  }

  // MASTER MODE: Master spawns workers via Task tool (LEGO-BASED ASSIGNMENT)
  const legoData = params.legoData || {};
  const targetLegos = params.targetLegos || [];
  const legoCount = targetLegos.length;
  const requestedWorkers = agentsPerWindow || 13;
  const targetLegosPerWorker = legosPerWorker || 10;

  // LEGO-BASED ASSIGNMENT: Sort LEGOs by ID and chunk directly
  const sortedLegos = [...targetLegos].sort((a, b) => a.legoId.localeCompare(b.legoId));

  // Calculate workers needed and actual LEGOs per worker
  const MIN_WORKERS = 1;
  const workersNeeded = Math.ceil(legoCount / targetLegosPerWorker);
  const workersToSpawn = Math.max(MIN_WORKERS, Math.min(requestedWorkers, workersNeeded, legoCount));
  const actualLegosPerWorker = Math.ceil(legoCount / workersToSpawn);

  // Create LEGO assignments (distribute LEGOs directly, not by seed)
  const workerAssignments = [];
  for (let workerNum = 1; workerNum <= workersToSpawn; workerNum++) {
    const workerStartIdx = (workerNum - 1) * actualLegosPerWorker;
    const workerEndIdx = Math.min(workerNum * actualLegosPerWorker, sortedLegos.length);
    const workerLegos = sortedLegos.slice(workerStartIdx, workerEndIdx);

    // Skip workers that have no LEGOs assigned
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

  // Adjust actual workers to spawn based on assignments (don't spawn empty workers)
  const actualWorkersToSpawn = workerAssignments.length;

  // Format worker assignments for template (LEGO-centric display)
  const workerAssignmentsText = workerAssignments.map(w => {
    const legoRangeDisplay = w.legoCount === 1
      ? `LEGO ${w.firstLego}`
      : `LEGOs ${w.firstLego} to ${w.lastLego}`;
    const legoListDisplay = w.legoIds.length <= 8
      ? w.legoIds.join(', ')
      : `${w.legoIds.slice(0, 8).join(', ')}... +${w.legoIds.length - 8} more`;
    return `**Worker ${w.workerNum}:** ${legoRangeDisplay} (${w.legoCount} LEGOs): ${legoListDisplay}`;
  }).join('\n');

  // Use template with placeholders
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
    ORCHESTRATOR_URL: process.env.EXTERNAL_URL
  });
}


/**
 * Spawn Claude Code session via osascript
 * Opens browser with prompt
 */
async function spawnClaudeCodeSession(prompt, windowTitle) {
  const { spawn } = require('child_process');

  // Copy prompt to clipboard using pbcopy (avoids osascript length/escaping issues)
  await new Promise((resolve, reject) => {
    const pbcopy = spawn('pbcopy', [], { stdio: ['pipe', 'inherit', 'inherit'] });
    pbcopy.stdin.write(prompt);
    pbcopy.stdin.end();
    pbcopy.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pbcopy failed with code ${code}`));
    });
  });

  // Use Safari (supports AppleScript tab API properly)
  const browser = 'Safari';
  const appleScript = `
-- Open Claude Code on the Web
tell application "${browser}"
    activate

    -- Open new tab with claude.ai/code (has Task tool!)
    tell window 1
        set newTab to make new tab with properties {URL:"https://claude.ai/code"}
        set current tab to newTab
    end tell

    -- Wait for page to load (3 seconds)
    delay 3

    -- Cmd+A clears any synced draft, then paste and submit IMMEDIATELY
    tell application "System Events"
        keystroke "a" using command down
        keystroke "v" using command down
        keystroke return
    end tell

    -- Wait for session to start and draft sync to clear before next spawn
    delay 8
end tell

-- Return success
return "success"
  `.trim();

  return new Promise((resolve, reject) => {
    const child = spawn('osascript', ['-e', appleScript], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        reject(new Error(`osascript failed: ${stderr || stdout}`));
      }
    });
  });
}

/**
 * Notify orchestrator of phase completion
 */
async function notifyOrchestrator(courseCode, status) {
  try {
    const axios = require('axios');
    await axios.post(`${ngrokUrl}/phase-complete`, {
      phase: 3,
      courseCode,
      status,
      timestamp: new Date().toISOString()
    });
    console.log(`[Phase 3] ✅ Notified orchestrator: Phase 3 ${status} for ${courseCode}`);
  } catch (error) {
    console.error(`[Phase 3] ⚠️  Failed to notify orchestrator:`, error.message);
  }
}

/**
 * Report progress to orchestrator (for live progress monitoring)
 */
async function reportProgressToOrchestrator(courseCode, progressData) {
  try {
    const axios = require('axios');
    await axios.post(`${ngrokUrl}/api/courses/${courseCode}/progress`, progressData, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // Silent fail - don't block basket uploads if orchestrator is unreachable
    console.error(`[Phase 3] ⚠️  Progress report failed:`, error.message);
  }
}

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    port: PORT,
    timestamp: new Date().toISOString(),
    vfsRoot: VFS_ROOT,
    activeJobs: activeJobs.size,
    watchers: watchers.size
  });
});

/**
 * GET /scaffold/:courseCode/:legoId
 * Serve pre-generated scaffold for a specific LEGO (JSON format)
 * Scaffolds must be pre-generated via: node generate-all-scaffolds.cjs <courseDir>
 */
app.get('/scaffold/:courseCode/:legoId', async (req, res) => {
  try {
    const { courseCode, legoId } = req.params;

    // Validate LEGO ID format
    if (!/^S\d{4}L\d{2}$/.test(legoId)) {
      return res.status(400).json({ error: 'Invalid LEGO ID format. Expected: S0117L01' });
    }

    // Extract seed from LEGO ID (e.g., S0117L01 → S0117)
    const seedId = legoId.substring(0, 5); // "S0117"

    const baseCourseDir = path.join(VFS_ROOT, courseCode);
    const scaffoldPath = path.join(baseCourseDir, 'phase3_scaffolds', `${seedId}.json`);

    // Check if scaffold file exists
    if (!await fs.pathExists(scaffoldPath)) {
      return res.status(404).json({
        error: 'Scaffold not found - run generate-all-scaffolds.cjs first',
        legoId,
        seedId,
        expectedPath: scaffoldPath
      });
    }

    // Load pre-generated scaffold
    const seedScaffold = await fs.readJson(scaffoldPath);
    const legoScaffold = seedScaffold.legos?.[legoId];

    if (!legoScaffold) {
      return res.status(404).json({
        error: 'LEGO not found in scaffold (may not be a new LEGO)',
        legoId,
        availableLegos: Object.keys(seedScaffold.legos || {})
      });
    }

    // Return JSON scaffold directly (pre-computed, no generation needed)
    res.json(legoScaffold);

  } catch (error) {
    console.error('[Phase 3] Error serving scaffold:', error);
    res.status(500).json({
      error: 'Failed to load scaffold',
      message: error.message
    });
  }
});

/**
 * GET /scaffolds/:courseCode/seed/:seedId
 * Serve all scaffolds for a specific seed (batch fetch for efficiency)
 */
app.get('/scaffolds/:courseCode/seed/:seedId', async (req, res) => {
  try {
    const { courseCode, seedId } = req.params;

    // Validate seed ID format
    if (!/^S\d{4}$/.test(seedId)) {
      return res.status(400).json({ error: 'Invalid seed ID format. Expected: S0117' });
    }

    const baseCourseDir = path.join(VFS_ROOT, courseCode);
    const scaffoldPath = path.join(baseCourseDir, 'phase3_scaffolds', `${seedId}.json`);

    if (!await fs.pathExists(scaffoldPath)) {
      return res.status(404).json({
        error: 'Scaffold not found - run generate-all-scaffolds.cjs first',
        seedId,
        expectedPath: scaffoldPath
      });
    }

    const seedScaffold = await fs.readJson(scaffoldPath);
    res.json(seedScaffold);

  } catch (error) {
    console.error('[Phase 3] Error serving seed scaffolds:', error);
    res.status(500).json({
      error: 'Failed to load scaffolds',
      message: error.message
    });
  }
});

/**
 * GET /scaffolds/:courseCode/batch?seeds=S0001,S0002,S0003
 * Batch fetch scaffolds for multiple seeds (efficient for workers)
 */
app.get('/scaffolds/:courseCode/batch', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const seedsParam = req.query.seeds;

    if (!seedsParam) {
      return res.status(400).json({ error: 'seeds query parameter required. Example: ?seeds=S0001,S0002,S0003' });
    }

    const seedIds = seedsParam.split(',').map(s => s.trim());

    // Validate all seed IDs
    for (const seedId of seedIds) {
      if (!/^S\d{4}$/.test(seedId)) {
        return res.status(400).json({ error: `Invalid seed ID format: ${seedId}. Expected: S0117` });
      }
    }

    const baseCourseDir = path.join(VFS_ROOT, courseCode);
    const result = {
      course: courseCode,
      seeds_requested: seedIds.length,
      seeds: {}
    };

    let totalLegos = 0;

    for (const seedId of seedIds) {
      const scaffoldPath = path.join(baseCourseDir, 'phase3_scaffolds', `${seedId}.json`);

      if (await fs.pathExists(scaffoldPath)) {
        const seedScaffold = await fs.readJson(scaffoldPath);
        result.seeds[seedId] = seedScaffold;
        totalLegos += Object.keys(seedScaffold.legos || {}).length;
      } else {
        result.seeds[seedId] = { error: 'not found' };
      }
    }

    result.total_legos = totalLegos;
    res.json(result);

  } catch (error) {
    console.error('[Phase 3] Error serving batch scaffolds:', error);
    res.status(500).json({
      error: 'Failed to load batch scaffolds',
      message: error.message
    });
  }
});

/**
 * GET /scaffolds/:courseCode/index
 * Get scaffold index (which seeds have scaffolds, how many LEGOs)
 */
app.get('/scaffolds/:courseCode/index', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const baseCourseDir = path.join(VFS_ROOT, courseCode);
    const indexPath = path.join(baseCourseDir, 'phase3_scaffolds', 'index.json');

    if (!await fs.pathExists(indexPath)) {
      return res.status(404).json({
        error: 'Scaffold index not found - run generate-all-scaffolds.cjs first',
        expectedPath: indexPath
      });
    }

    const index = await fs.readJson(indexPath);
    res.json(index);

  } catch (error) {
    console.error('[Phase 3] Error serving scaffold index:', error);
    res.status(500).json({
      error: 'Failed to load scaffold index',
      message: error.message
    });
  }
});

/**
 * POST /regenerate
 * Regenerate specific baskets for given LEGO_IDs
 *
 * Body: {
 *   courseCode: string,
 *   legoIds: string[],        // e.g., ["S0003L02", "S0068L01", ...]
 *   target: string,
 *   known: string
 * }
 *
 * Segmentation Strategy for Regeneration:
 * - 5 baskets per agent (faster, less context)
 * - 10 agents per browser (max parallel)
 * - 50 baskets per browser = 1 work unit
 * - Spawn browsers as needed: Math.ceil(totalBaskets / 50)
 */
app.post('/regenerate', async (req, res) => {
  const { courseCode, legoIds, target, known } = req.body;

  if (!courseCode || !legoIds || !Array.isArray(legoIds) || legoIds.length === 0) {
    return res.status(400).json({ error: 'courseCode and legoIds (array) required' });
  }

  if (!target || !known) {
    return res.status(400).json({ error: 'target and known language names required' });
  }

  // Check if already running
  const jobKey = `${courseCode}_regen`;
  if (activeJobs.has(jobKey)) {
    return res.status(409).json({ error: `Basket regeneration already running for ${courseCode}` });
  }

  console.log(`\n[Phase 3] ====================================`);
  console.log(`[Phase 3] BASKET REGENERATION`);
  console.log(`[Phase 3] ====================================`);
  console.log(`[Phase 3] Course: ${courseCode}`);
  console.log(`[Phase 3] LEGO_IDs to regenerate: ${legoIds.length}`);
  console.log(`[Phase 3] Target: ${target}, Known: ${known}`);

  const baseCourseDir = path.join(VFS_ROOT, courseCode);

  // Check prerequisites
  const seedPairsPath = path.join(baseCourseDir, 'seed_pairs.json');
  const legoPairsPath = path.join(baseCourseDir, 'lego_pairs.json');

  if (!await fs.pathExists(seedPairsPath) || !await fs.pathExists(legoPairsPath)) {
    return res.status(400).json({ error: 'Prerequisites missing - need seed_pairs.json and lego_pairs.json' });
  }

  // STEP 1: Clean up old baskets for these LEGO_IDs (if lego_baskets.json exists)
  const basketsPath = path.join(baseCourseDir, 'lego_baskets.json');
  let cleanupResult = null;

  if (await fs.pathExists(basketsPath)) {
    console.log(`\n[Phase 3] Step 1: Cleaning up baskets for ${legoIds.length} LEGOs...`);

    try {
      const basketsData = await fs.readJson(basketsPath);

      if (basketsData.baskets && typeof basketsData.baskets === 'object') {
        // Backup deleted baskets
        const deletedBaskets = {};
        let deletedCount = 0;

        legoIds.forEach(legoId => {
          if (basketsData.baskets[legoId]) {
            deletedBaskets[legoId] = basketsData.baskets[legoId];
            delete basketsData.baskets[legoId];
            deletedCount++;
          }
        });

        if (deletedCount > 0) {
          // Save backup
          const backupPath = path.join(baseCourseDir, 'deleted_baskets_backup.json');
          let existingBackup = {};

          if (await fs.pathExists(backupPath)) {
            existingBackup = await fs.readJson(backupPath);
          }

          const backup = {
            ...existingBackup,
            [new Date().toISOString()]: {
              reason: 'regeneration',
              deleted_count: deletedCount,
              basket_ids: legoIds.filter(id => deletedBaskets[id]),
              baskets: deletedBaskets
            }
          };

          await fs.writeJson(backupPath, backup, { spaces: 2 });

          // Save updated baskets file
          await fs.writeJson(basketsPath, basketsData, { spaces: 2 });

          console.log(`[Phase 3]   ✅ Deleted ${deletedCount} old baskets`);
          console.log(`[Phase 3]   💾 Backup saved: deleted_baskets_backup.json`);

          cleanupResult = {
            deletedCount,
            backupPath
          };
        } else {
          console.log(`[Phase 3]   ℹ️  No existing baskets found for these LEGO_IDs (first-time generation)`);
        }
      }
    } catch (error) {
      console.error(`[Phase 3]   ⚠️  Cleanup failed:`, error.message);
      console.error(`[Phase 3]   Continuing with regeneration anyway...`);
    }
  } else {
    console.log(`\n[Phase 3] ℹ️  No existing lego_baskets.json - first-time generation`);
  }

  // Initialize job state (using same structure as regular Phase 3)
  const totalSeeds = legoIds.length; // For regeneration, treat each LEGO_ID as a "seed"
  const job = {
    courseCode: jobKey,
    totalSeeds,
    baseCourseCode: courseCode,
    baseCourseDir,
    target,
    known,
    legoIds, // Regeneration-specific: list of LEGO_IDs to regenerate
    status: 'preparing_scaffolds',
    startedAt: new Date().toISOString(),
    milestones: {
      scaffoldsReady: false,
      scaffoldsReadyAt: null,
      watcherStarted: false,
      watcherStartedAt: null,
      windowsSpawned: 0,
      windowsTotal: 0,
      lastWindowSpawnedAt: null,
      branchesDetected: 0,
      branchesExpected: 0,
      lastBranchDetectedAt: null,
      branchesMerged: 0,
      mergeStartedAt: null,
      mergeCompletedAt: null
    },
    branches: [],
    config: null,
    windowsSpawned: 0,
    branchesDetected: 0,
    merged: false,
    error: null,
    warnings: []
  };

  activeJobs.set(jobKey, job);

  // ========================================
  // NOW USE EXACT SAME FLOW AS REGULAR PHASE 3
  // ========================================

  try {
    // STEP 2: Prep Phase 3 scaffolds (mechanical work)
    // Only prep scaffolds for the missing LEGO_IDs
    console.log(`\n[Phase 3] STEP 2: Running scaffold prep script for ${legoIds.length} LEGO_IDs...`);
    const { preparePhase3Scaffolds } = require('./prep-scaffolds.cjs');
    const scaffoldResult = await preparePhase3Scaffolds(baseCourseDir, { legoIds }); // Filter to only these LEGO_IDs

    console.log(`[Phase 3] ✅ Phase 3 scaffolds ready`);
    console.log(`[Phase 3]    Total LEGOs: ${scaffoldResult.totalNewLegos || legoIds.length}`);

    // STEP 3: Load configuration for parallelization (use same config as regular Phase 3)
    const config = loadConfig();
    const phase3Config = config.phase3_basket_generation;

    const browsersConfig = phase3Config.browsers;
    const agentsPerBrowser = phase3Config.agents_per_browser;
    const seedsPerAgent = phase3Config.seeds_per_agent || 10;

    console.log(`\n[Phase 3] STEP 3: Parallelization Strategy (using regular Phase 3 config):`);
    console.log(`[Phase 3]    Browser windows: ${browsersConfig}`);
    console.log(`[Phase 3]    Agents per window: ${agentsPerBrowser}`);
    console.log(`[Phase 3]    Seeds per agent: ${seedsPerAgent}`);

    // STEP 4: Start branch watcher (same as regular Phase 3)
    console.log(`\n[Phase 3] STEP 4: Starting branch watcher...`);
    await startBranchWatcher(jobKey, browsersConfig, baseCourseDir);

    // STEP 5: Spawn browser windows (REGENERATION MODE - pass legoIds instead of seed range)
    console.log(`\n[Phase 3] STEP 5: Spawning ${browsersConfig} browser windows...`);
    console.log(`[Phase 3]    Regeneration mode: ${legoIds.length} specific LEGO_IDs`);

    await spawnBrowserWindows(jobKey, {
      target,
      known,
      legoIds, // Pass legoIds for regeneration
      isRegeneration: true
    }, baseCourseDir, browsersConfig, agentsPerBrowser, seedsPerAgent);

    // Send success response
    res.json({
      success: true,
      message: `Basket regeneration started for ${courseCode}`,
      cleanup: cleanupResult ? {
        deletedOldBaskets: cleanupResult.deletedCount,
        backupSaved: true
      } : {
        deletedOldBaskets: 0,
        note: 'No existing baskets to clean up'
      },
      job: {
        courseCode: jobKey,
        totalBaskets: legoIds.length,
        config: { browsers: browsersConfig, agents: agentsPerBrowser, seedsPerAgent },
        status: 'running',
        scaffolds: scaffoldResult
      }
    });
  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    activeJobs.delete(jobKey);
    console.error(`[Phase 3] ❌ Failed to start regeneration:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /launch-12-masters
 * Launch the 12-master orchestration system for Phase 3
 *
 * This endpoint:
 * 1. Runs detection to find missing baskets
 * 2. Generates patch manifest dividing work across 12 masters
 * 3. Generates 12 master prompts
 * 4. Launches 12 Safari windows with Claude Code
 *
 * Body: {
 *   courseCode: string,
 *   target: string,
 *   known: string
 * }
 */
app.post('/launch-12-masters', async (req, res) => {
  const { courseCode, target, known } = req.body;

  if (!courseCode || !target || !known) {
    return res.status(400).json({ error: 'courseCode, target, known required' });
  }

  // Check if already running - auto-abort stale jobs
  if (activeJobs.has(courseCode)) {
    const existingJob = activeJobs.get(courseCode);

    // Handle jobs with missing timing field (legacy or corrupted state)
    if (!existingJob.timing || !existingJob.timing.startedAt) {
      console.log(`[Phase 3] ⚠️  Found job with missing timing data, auto-aborting`);
      activeJobs.delete(courseCode);
    } else {
      const jobAge = Date.now() - new Date(existingJob.timing.startedAt).getTime();
      const thirtyMinutes = 30 * 60 * 1000;

      if (jobAge > thirtyMinutes) {
        console.log(`[Phase 3] ⚠️  Auto-aborting stale job (${Math.round(jobAge / 60000)} minutes old)`);
        activeJobs.delete(courseCode);
      } else {
        return res.status(409).json({
          error: `Phase 3 already running for ${courseCode}`,
          elapsedMinutes: Math.round(jobAge / 60000),
          tip: 'Use /abort endpoint or wait for auto-timeout (30min)'
        });
      }
    }
  }

  console.log(`\n[Phase 3] ====================================`);
  console.log(`[Phase 3] SMART LEGO-BASED GENERATION`);
  console.log(`[Phase 3] ====================================`);
  console.log(`[Phase 3] Course: ${courseCode}`);
  console.log(`[Phase 3] Target: ${target}, Known: ${known}`);

  const baseCourseDir = path.join(VFS_ROOT, courseCode);

  try {
    // STEP 1: Run detection to find missing baskets
    console.log(`\n[Phase 3] Step 1: Running detection...`);
    const { execSync } = require('child_process');

    const detectionOutput = execSync(
      `node scripts/detect_missing_baskets_new_only.cjs ${courseCode}`,
      { cwd: path.join(__dirname, '../..'), encoding: 'utf8' }
    );

    console.log(detectionOutput);

    // Read the detection results
    const missingBasketsPath = path.join(baseCourseDir, 'phase3_missing_baskets_new_only.json');
    if (!await fs.pathExists(missingBasketsPath)) {
      return res.status(500).json({ error: 'Detection script did not generate output file' });
    }

    const missingData = await fs.readJson(missingBasketsPath);
    const totalMissing = missingData.missing_baskets.length;

    console.log(`[Phase 3] ✅ Detection complete: ${totalMissing} missing baskets`);

    if (totalMissing === 0) {
      return res.json({
        success: true,
        message: 'No missing baskets - Phase 3 already complete!',
        totalMissing: 0
      });
    }

    // STEP 2: Read existing baskets to get complete picture
    console.log(`\n[Phase 3] Step 2: Analyzing course state...`);

    const legoBasketsPath = path.join(baseCourseDir, 'lego_baskets.json');
    const introductionsPath = path.join(baseCourseDir, 'introductions.json');

    let existingBaskets = {};
    let totalIntroductions = 0;

    if (await fs.pathExists(legoBasketsPath)) {
      const basketsData = await fs.readJson(legoBasketsPath);
      existingBaskets = basketsData.baskets || {};
    }

    if (await fs.pathExists(introductionsPath)) {
      const introsData = await fs.readJson(introductionsPath);
      totalIntroductions = Object.keys(introsData.presentations || {}).length;
    }

    // Calculate seed-level statistics
    const seedStats = {};
    for (let i = 1; i <= SEED_COUNTS.FULL_COURSE; i++) {
      const seedId = `S${String(i).padStart(4, '0')}`;
      seedStats[seedId] = { total: 0, complete: 0, missing: 0 };
    }

    // Count introductions per seed
    if (await fs.pathExists(introductionsPath)) {
      const introsData = await fs.readJson(introductionsPath);
      Object.keys(introsData.presentations || {}).forEach(legoId => {
        const seedId = legoId.substring(0, 5);
        if (seedStats[seedId]) {
          seedStats[seedId].total++;
          if (existingBaskets[legoId]) {
            seedStats[seedId].complete++;
          } else {
            seedStats[seedId].missing++;
          }
        }
      });
    }

    // Identify complete and incomplete seeds
    const completeSeeds = [];
    const incompleteSeeds = [];
    const emptySeeds = [];

    Object.keys(seedStats).forEach(seedId => {
      const stats = seedStats[seedId];
      if (stats.total === 0) {
        emptySeeds.push(seedId);
      } else if (stats.missing === 0) {
        completeSeeds.push(seedId);
      } else {
        incompleteSeeds.push(seedId);
      }
    });

    console.log(`[Phase 3]   Total introductions: ${totalIntroductions}`);
    console.log(`[Phase 3]   Existing baskets: ${Object.keys(existingBaskets).length}`);
    console.log(`[Phase 3]   Complete seeds: ${completeSeeds.length}/${SEED_COUNTS.FULL_COURSE}`);
    console.log(`[Phase 3]   Incomplete seeds: ${incompleteSeeds.length}`);
    console.log(`[Phase 3]   Empty seeds: ${emptySeeds.length}`);

    // STEP 3: Calculate optimal LEGO-based distribution
    console.log(`\n[Phase 3] Step 3: Calculating optimal distribution...`);

    // Sort LEGOs numerically by seed, then by LEGO number (ensures contiguous ranges)
    const allMissingLegos = missingData.missing_baskets
      .map(b => b.legoId)
      .sort((a, b) => {
        const seedA = parseInt(a.substring(1, 5)); // Extract seed number (e.g., "S0392L01" → 392)
        const seedB = parseInt(b.substring(1, 5));
        if (seedA !== seedB) return seedA - seedB;

        const legoA = parseInt(a.substring(6)); // Extract LEGO number (e.g., "S0392L01" → 1)
        const legoB = parseInt(b.substring(6));
        return legoA - legoB;
      });

    // Distribution parameters
    const legosPerWorker = 5; // Target <5 LEGOs per worker
    const workersPerBrowser = 15; // Mid-range of 10-20
    const legosPerBrowser = legosPerWorker * workersPerBrowser; // 75 LEGOs per browser

    const browsersNeeded = Math.ceil(totalMissing / legosPerBrowser);
    const actualBrowsers = Math.min(browsersNeeded, 15); // Cap at 15

    console.log(`[Phase 3]   Total missing LEGOs: ${totalMissing}`);
    console.log(`[Phase 3]   Distribution: ${actualBrowsers} browsers × ~${workersPerBrowser} workers × ~${legosPerWorker} LEGOs`);
    console.log(`[Phase 3]   Expected workers: ${Math.ceil(totalMissing / legosPerWorker)}`);

    // STEP 4: Distribute LEGOs across browsers
    console.log(`\n[Phase 3] Step 4: Distributing LEGOs across ${actualBrowsers} browsers...`);

    const browsers = [];
    const legosPerActualBrowser = Math.ceil(totalMissing / actualBrowsers);

    for (let i = 0; i < actualBrowsers; i++) {
      const startIdx = i * legosPerActualBrowser;
      const endIdx = Math.min(startIdx + legosPerActualBrowser, totalMissing);
      const browserLegos = allMissingLegos.slice(startIdx, endIdx);

      // Distribute LEGOs across workers within this browser
      const workers = [];
      const workersInBrowser = Math.ceil(browserLegos.length / legosPerWorker);

      for (let w = 0; w < workersInBrowser; w++) {
        const workerStartIdx = w * legosPerWorker;
        const workerEndIdx = Math.min(workerStartIdx + legosPerWorker, browserLegos.length);
        const workerLegos = browserLegos.slice(workerStartIdx, workerEndIdx);

        workers.push({
          workerNum: w + 1,
          legoIds: workerLegos,
          legoCount: workerLegos.length
        });
      }

      browsers.push({
        browserNum: i + 1,
        name: `browser_${String(i + 1).padStart(2, '0')}`,
        workers,
        totalLegos: browserLegos.length,
        legoIds: browserLegos
      });

      console.log(`[Phase 3]   Browser ${i + 1}: ${browserLegos.length} LEGOs → ${workers.length} workers`);
    }

    // Save manifest with complete course state
    const manifest = {
      course: courseCode,
      generated: new Date().toISOString(),
      course_state: {
        total_introductions: totalIntroductions,
        total_baskets: Object.keys(existingBaskets).length,
        total_missing: totalMissing,
        completion_percentage: totalIntroductions > 0 ? Math.round((Object.keys(existingBaskets).length / totalIntroductions) * 100) : 0,
        seeds: {
          total: SEED_COUNTS.FULL_COURSE,
          complete: completeSeeds.length,
          incomplete: incompleteSeeds.length,
          empty: emptySeeds.length
        }
      },
      distribution: {
        browsers: actualBrowsers,
        workers_per_browser: workersPerBrowser,
        legos_per_worker: legosPerWorker
      },
      browsers: browsers.map(b => ({
        name: b.name,
        workers: b.workers.length,
        legos: b.totalLegos,
        lego_ids: b.legoIds
      })),
      seed_details: {
        complete_seeds: completeSeeds,
        incomplete_seeds: incompleteSeeds.map(seedId => ({
          seed: seedId,
          total: seedStats[seedId].total,
          complete: seedStats[seedId].complete,
          missing: seedStats[seedId].missing
        }))
      }
    };

    const manifestPath = path.join(baseCourseDir, 'phase3_lego_distribution_manifest.json');
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });
    console.log(`[Phase 3] ✅ Manifest saved: ${totalMissing} LEGOs across ${actualBrowsers} browsers`);
    console.log(`[Phase 3]   Course completion: ${manifest.course_state.completion_percentage}% (${completeSeeds.length}/${SEED_COUNTS.FULL_COURSE} seeds complete)`);

    // STEP 5: Generate browser prompts
    console.log(`\n[Phase 3] Step 5: Generating ${actualBrowsers} browser prompts...`);

    const promptsDir = path.join(__dirname, '../../scripts/phase3_browser_prompts');
    await fs.ensureDir(promptsDir);

    // Get ngrok URL for scaffolds

    for (const browser of browsers) {
      const promptContent = `# Phase 3 Browser Coordinator: ${browser.name}

**Course:** \`${courseCode}\`
**Your LEGOs:** ${browser.totalLegos} LEGOs
**Workers to spawn:** ${browser.workers.length} (via Task tool)

---

## 🎯 YOUR MISSION: SPAWN ${browser.workers.length} LANGUAGE EXPERT WORKERS

You are a **Browser Coordinator**. You DON'T generate baskets yourself.

**Your workflow:**

1. ✅ **Review worker assignments** below
2. ✅ **Spawn ${browser.workers.length} workers** - Use Task tool ${browser.workers.length} times in ONE message (parallel!)
3. ✅ **Work SILENTLY** - No verbose progress logs
4. ✅ **Monitor completion** - Workers will submit via REST API
5. ✅ **Report brief summary** - "✅ ${browser.name} complete: ${browser.workers.length} workers spawned for ${browser.totalLegos} LEGOs"

---

## 📋 WORKER ASSIGNMENTS

${browser.workers.map(w => `**Worker ${w.workerNum}:** ${w.legoCount} LEGOs (${w.legoIds.join(', ')})`).join('\n')}

---

## 🚀 SPAWN WORKERS

Use Task tool ${browser.workers.length} times in a SINGLE message (parallel spawn).

**Worker prompt template:**

For each worker, use this exact format with the LEGO IDs from assignments above:

\`\`\`json
{
  "subagent_type": "general-purpose",
  "description": "Phase 3 Worker [N] - ${browser.name}",
  "prompt": "# 🎭 YOUR ROLE

You are a **world-leading creator of practice phrases** in the target language that help learners internalize language patterns naturally and quickly.

Your phrases must:
- ✅ Sound **natural in BOTH languages** (${known} and ${target})
- ✅ Use **realistic communication scenarios** learners would encounter
- ✅ Follow **vocabulary constraints** (GATE compliance - only use available vocabulary)
- ✅ Help learners **internalize target language grammar patterns** through practice
- ✅ **EVERY phrase MUST contain the complete LEGO** - this is practice, not random conversation

**CRITICAL PRINCIPLE**: Practice phrases are opportunities for learners to **PRACTICE SAYING THE LEGO**.

Not random vocabulary. Not building up TO the lego. Building FROM the lego by adding context.

---

## 📖 UNDERSTAND THE METHODOLOGY

**Read for context**: https://ssi-dashboard-v7.vercel.app/docs/phase_intelligence/phase_3_lego_baskets.md

This explains WHY we generate baskets and the pedagogical principles behind LEGO-based learning.

**Key takeaways:**
- LEGOs are linguistic building blocks for recombination
- GATE compliance ensures learners only practice known vocabulary
- Quality over quantity (better 8 perfect phrases than 10 with 2 bad ones)
- Grammar must ALWAYS be correct in both languages
- Extended linguistic thinking required (not mechanical templates)

---

## 🎯 YOUR ASSIGNMENT

**LEGOs to generate:** [Worker will receive specific LEGO ID list from assignment above]

Replace [Worker N] with the actual worker number (1, 2, 3, etc.) and paste the LEGO IDs from the worker assignments above.

---

## 🔧 GENERATION WORKFLOW

For EACH LEGO in your assignment, follow this exact process:

### Step 1: Fetch Required Data

**Get LEGO details from Phase 2 outputs:**
- GET: \`${ngrokUrl}/api/courses/${courseCode}/phase-outputs/2/lego_pairs.json\`
- Look up your assigned LEGO IDs in the \`lego_pairs.json\` response

**Get phase intelligence:**
- GET: \`${ngrokUrl}/api/phase-intelligence/3\`
- Review generation methodology and best practices

**Example API calls:**
\`\`\`bash
# Get LEGO pairs
curl ${ngrokUrl}/api/courses/${courseCode}/phase-outputs/2/lego_pairs.json

# Get phase intelligence
curl ${ngrokUrl}/api/phase-intelligence/3
\`\`\`

The lego_pairs.json provides:
- The LEGO you're teaching (known → target)
- Complete available vocabulary (from previous seeds and LEGOs)
- LEGO type (M/FD/LUT)
- Seed context

### Step 2: Think Linguistically

**Extended thinking required** - Ask yourself:
- What is this LEGO? (verb/noun/phrase/etc.)
- How would learners naturally use it?
- What realistic scenarios would include this LEGO?
- What relates to the seed theme?

**Start with ${known} thoughts**, then express in ${target} using only available vocabulary.

### Step 3: Generate 10 Practice Phrases

**CRITICAL RULE**: Phrase 1 must ALREADY contain the COMPLETE LEGO.

Build FROM the LEGO, not TO it:
- ✅ CORRECT: \\"I don't know why\\" → \\"I don't know why that is\\" → \\"I don't know why you think so\\"
- ❌ WRONG: \\"I don't know\\" → \\"I don't\\" → \\"I don't know why\\" (building TO it!)

**Progressive complexity** (2-2-2-4 distribution):
- Phrases 1-2: SHORT (LEGO alone or +1 word)
- Phrases 3-4: MEDIUM (LEGO +2-3 words)
- Phrases 5-6: LONGER (LEGO +4-6 words)
- Phrases 7-10: LONGEST (LEGO +6+ words, aim for natural sentences)

### Step 4: Validate EVERY Phrase

**For EACH phrase, check all 3:**

1. ✅ **Contains COMPLETE LEGO?**
   - If LEGO is \\"it's unusual that\\", the phrase must contain \\"it's unusual that\\"
   - NOT \\"it's unusual\\" (incomplete)
   - NOT \\"unusual that\\" (incomplete)
   - The COMPLETE LEGO must be present

2. ✅ **GATE Compliant?**
   - Every ${target} word must exist in the scaffold's vocabulary list
   - Check EVERY word - if ANY word is missing, the phrase FAILS
   - No guessing or introducing new vocabulary

3. ✅ **Grammatically correct in BOTH languages?**
   - Natural ${known} grammar
   - Natural ${target} grammar (verb conjugations, gender agreement, word order)
   - Would a native speaker understand this naturally?

### Step 5: Fix Failures

**If ANY phrase fails ANY check:**
- DELETE that phrase immediately
- Think of a NEW ${known} thought that uses the LEGO
- Express it in ${target} using only available vocabulary
- Re-validate the new phrase

**Keep iterating until ALL 10 phrases pass ALL 3 checks.**

### Step 6: Submit Your Work

**POST submission to Supabase (direct database endpoint):**
- Endpoint: \`${BASKET_UPLOAD_URL}\`
- Method: POST
- Content-Type: application/json

**Payload format (submit one seed at a time):**
\`\`\`json
{
  "course": "${courseCode}",
  "seed": "S0047",
  "baskets": {
    "S0047L01": {
      "lego": { "known": "...", "target": "..." },
      "practice_phrases": [
        { "known": "...", "target": "..." }
      ]
    },
    "S0047L02": { ... }
  }
}
\`\`\`

**Expected response:**
\`\`\`json
{
  "success": true,
  "basketCount": 5
}
\`\`\`

**Example API call:**
\`\`\`bash
curl -X POST ${BASKET_UPLOAD_URL} \\
  -H "Content-Type: application/json" \\
  -d '{
    "course": "${courseCode}",
    "seed": "S0047",
    "baskets": { "S0047L01": { "lego": {...}, "practice_phrases": [...] }, "S0047L02": { ... } }
  }'
\`\`\`

---

## ⚠️ COMMON MISTAKES TO AVOID

❌ Building up TO the LEGO instead of FROM it
❌ Using vocabulary not in the scaffold's available list
❌ Mechanical/template generation without thinking
❌ Unnatural grammar in either language
❌ Uploading without validating every phrase

✅ Natural, meaningful utterances
✅ Every phrase contains the complete LEGO
✅ Strict GATE compliance
✅ Grammatically perfect in both languages
✅ Evidence of linguistic thinking

---

## 🎯 SUCCESS CRITERIA

Your work is successful when:
- All 10 phrases contain the COMPLETE LEGO
- 100% GATE compliance (every ${target} word from scaffold vocabulary)
- Natural, grammatically correct in both languages
- Progressive complexity from simple to rich contexts
- Quality over speed - better 8 perfect than 10 with failures

**Remember**: You're a linguistic expert creating learning materials, not a mechanical processor. Think, create, validate.

Work silently. Report brief summary when complete."
}
\`\`\`

---

## 🎯 START NOW

**Spawn all ${browser.workers.length} workers in parallel!**

Each worker:
1. Gets its LEGO ID list from assignments above
2. Fetches LEGO data via REST API: \`GET ${ngrokUrl}/api/courses/${courseCode}/phase-outputs/2/lego_pairs.json\`
3. Fetches phase intelligence: \`GET ${ngrokUrl}/api/phase-intelligence/3\`
4. Generates baskets for each LEGO
5. Submits directly to Supabase: \`POST ${BASKET_UPLOAD_URL}\`

Report: "✅ ${browser.name} complete: ${browser.workers.length} workers spawned for ${browser.totalLegos} LEGOs"
`;

      const promptPath = path.join(promptsDir, `${browser.name}.md`);
      await fs.writeFile(promptPath, promptContent);
    }

    console.log(`[Phase 3] ✅ Generated ${actualBrowsers} browser prompts in scripts/phase3_browser_prompts/`);

    // STEP 6: Launch browser windows
    console.log(`\n[Phase 3] Step 6: Launching ${actualBrowsers} browser windows...`);

    for (let i = 0; i < actualBrowsers; i++) {
      const browser = browsers[i];
      const promptPath = path.join(promptsDir, `${browser.name}.md`);
      const promptContent = await fs.readFile(promptPath, 'utf8');

      console.log(`[Phase 3]   Launching ${browser.name}: ${browser.totalLegos} LEGOs → ${browser.workers.length} workers...`);

      try {
        await spawnClaudeCodeSession(promptContent, browser.name);
      } catch (error) {
        console.error(`[Phase 3]   ⚠️  Failed to launch ${browser.name}:`, error.message);
      }

      // 5 second delay between launches (allows page to fully load)
      if (i < actualBrowsers - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log(`\n[Phase 3] ✅ Launched ${actualBrowsers} browsers (${Math.ceil(totalMissing / legosPerWorker)} total workers)`);
    console.log(`[Phase 3] Monitor progress in browser tabs`);

    res.json({
      success: true,
      message: `Launched ${actualBrowsers} browsers for ${totalMissing} missing baskets`,
      totalMissing,
      distribution: {
        browsers: actualBrowsers,
        total_workers: Math.ceil(totalMissing / legosPerWorker),
        legos_per_worker: legosPerWorker
      },
      browsers: browsers.map(b => ({
        name: b.name,
        workers: b.workers.length,
        legos: b.totalLegos
      }))
    });

  } catch (error) {
    console.error(`[Phase 3] ❌ LEGO-based launch failed:`, error);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * POST /launch-15-masters
 * DEPRECATED: Use /start with mode parameter instead
 * Legacy endpoint - defaults now come from centralized config
 */
app.post('/launch-15-masters', async (req, res) => {
  // Get defaults from centralized config (full_course mode)
  const fullCourseConfig = getModeConfig(MODES.FULL_COURSE);
  const defaultPattern = fullCourseConfig.pattern;

  const {
    courseCode,
    target = 'spa',
    known = 'eng',
    mastersCount = defaultPattern.browsers,
    workersPerMaster = defaultPattern.agents_per_browser,
    legosPerWorker = defaultPattern.seeds_per_agent,
    spawnerMode = 'cli'  // 'cli' (iTerm2 + Claude CLI) or 'browser' (Safari)
  } = req.body;

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode required' });
  }

  const legosPerMaster = workersPerMaster * legosPerWorker;
  const totalCapacity = mastersCount * legosPerMaster;

  console.log(`\n[Phase 3] ====================================`);
  console.log(`[Phase 3] LAUNCH 15 MASTERS (15×15×3 pattern)`);
  console.log(`[Phase 3] ====================================`);
  console.log(`[Phase 3] Course: ${courseCode}`);
  console.log(`[Phase 3] Config: ${mastersCount} masters × ${workersPerMaster} workers × ${legosPerWorker} LEGOs`);
  console.log(`[Phase 3] Capacity: ${totalCapacity} LEGOs per wave`);

  const baseCourseDir = path.join(VFS_ROOT, courseCode);

  try {
    // STEP 1: Find missing baskets from DATABASE (not JSON files)
    console.log(`\n[Phase 3] Step 1: Detecting missing baskets from database...`);

    // Get missing LEGOs from database via courseDataService
    const missingLegos = await courseDataService.getMissingNewLegos(courseCode);

    if (!missingLegos) {
      // Fallback: courseDataService not available or DB reads disabled
      console.log(`[Phase 3] ⚠️  Database query failed, falling back to lego_pairs.json`);
      const legoPairsPath = path.join(baseCourseDir, 'lego_pairs.json');
      if (!await fs.pathExists(legoPairsPath)) {
        return res.status(400).json({
          error: 'lego_pairs.json not found and database unavailable',
          hint: 'Ensure Phase 2 is complete and database is accessible'
        });
      }
      // Original fallback logic would go here, but we want DB-first
      return res.status(500).json({
        error: 'Database reads not available - cannot determine missing LEGOs accurately',
        hint: 'Check SUPABASE_URL and SUPABASE_SERVICE_KEY in .env'
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
        completeLegos: completeLegos
      });
    }

    // STEP 2: Calculate actual masters needed
    const actualMasters = Math.min(mastersCount, Math.ceil(totalMissing / legosPerMaster));
    console.log(`\n[Phase 3] Step 2: Distribution planning...`);
    console.log(`[Phase 3] Launching ${actualMasters} masters for ${totalMissing} LEGOs`);

    // STEP 3: Distribute LEGOs across masters and workers
    const masters = [];
    for (let m = 0; m < actualMasters; m++) {
      const masterStartIdx = m * legosPerMaster;
      if (masterStartIdx >= totalMissing) break;

      const masterLegos = missingLegos.slice(masterStartIdx, masterStartIdx + legosPerMaster);

      // Generate workers for this master
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

      // Calculate seed range for logging
      const seedIds = [...new Set(masterLegos.map(l => l.seed))].sort();
      const seedRange = seedIds.length > 0 ? `${seedIds[0]}-${seedIds[seedIds.length - 1]}` : 'N/A';

      masters.push({
        masterNum: m + 1,
        workers,
        legoCount: masterLegos.length,
        seedRange,
        legos: masterLegos
      });
    }

    // STEP 4: Generate and save prompts
    console.log(`\n[Phase 3] Step 3: Generating ${actualMasters} master prompts...`);

    const promptsDir = path.join(baseCourseDir, 'phase3_master_prompts');
    await fs.ensureDir(promptsDir);
    await fs.remove(promptsDir);
    await fs.ensureDir(promptsDir);

    for (const master of masters) {
      const prompt = generatePhase3MasterPrompt({
        courseCode,
        target,
        known,
        masterNum: master.masterNum,
        workers: master.workers,
        totalLegos: master.legoCount,
        seedRange: master.seedRange
      });

      await fs.writeFile(
        path.join(promptsDir, `phase3_master_${master.masterNum}.md`),
        prompt
      );
    }

    // STEP 5: Create/update job for tracking
    const jobKey = courseCode;
    let job = activeJobs.get(jobKey);
    if (!job) {
      job = {
        courseCode,
        status: 'spawning_masters',
        startedAt: new Date().toISOString(),
        uploads: {
          seedsUploaded: new Set(),
          legosReceived: 0,
          expectedLegos: totalMissing,
          expectedSeeds: [...new Set(missingLegos.map(l => l.seedId))].length,
          lastUploadAt: null,
          complete: false
        },
        milestones: {
          scaffoldsReady: true,
          scaffoldsReadyAt: new Date().toISOString()
        },
        masters: [],
        branches: [],
        config: { mastersCount, workersPerMaster, legosPerWorker },
        warnings: [],
        error: null
      };
    }

    // Store masters with tracking metadata
    job.masters = masters.map(m => ({
      masterNum: m.masterNum,
      seedRange: m.seedRange,
      legosExpected: m.legoCount,
      legosReceived: 0,
      status: 'pending',
      spawnedAt: null,
      lastActivityAt: null,
      workers: m.workers.map(w => ({
        workerNum: w.workerNum,
        legoIds: w.legoIds,
        legoCount: w.legoCount,
        status: 'pending',
        lastUpload: null
      }))
    }));
    job.status = 'spawning_masters';
    activeJobs.set(jobKey, job);

    // STEP 6: Launch masters with delay between spawns
    const modeLabel = spawnerMode === 'cli' ? 'CLI agents' : 'Safari tabs';
    console.log(`\n[Phase 3] Step 4: Launching ${actualMasters} ${modeLabel}...`);
    console.log(`[Phase 3]    Spawner mode: ${spawnerMode}`);

    for (const master of masters) {
      const promptPath = path.join(promptsDir, `phase3_master_${master.masterNum}.md`);
      const promptContent = await fs.readFile(promptPath, 'utf8');

      console.log(`[Phase 3] Launching Master ${master.masterNum}: ${master.seedRange} (${master.legoCount} LEGOs, ${master.workers.length} workers)`);

      // Update master status to spawning
      const jobMaster = job.masters.find(m => m.masterNum === master.masterNum);
      if (jobMaster) {
        jobMaster.status = 'spawning';
        jobMaster.spawnedAt = new Date().toISOString();
      }

      try {
        // Use unified spawner based on spawnerMode
        if (spawnerMode === 'cli') {
          await unifiedSpawner.spawnSingleAgent(promptContent, {
            mode: 'cli',
            model: 'sonnet',
            workingDir: baseCourseDir
          });
        } else {
          await spawnClaudeCodeSession(promptContent, `phase3-master-${master.masterNum}`);
        }
        // Update master status to running after successful spawn
        if (jobMaster) {
          jobMaster.status = 'running';
        }
      } catch (error) {
        console.error(`[Phase 3] ❌ Master ${master.masterNum} launch failed:`, error.message);
        // Update master status to failed on error
        if (jobMaster) {
          jobMaster.status = 'failed';
          jobMaster.error = error.message;
        }
      }

      // Delay between spawns (5s for browser, 2s for CLI)
      const spawnDelay = spawnerMode === 'cli' ? 2000 : 5000;
      if (master.masterNum < actualMasters) {
        await new Promise(r => setTimeout(r, spawnDelay));
      }
    }

    // Update job status after all masters launched
    job.status = 'workers_generating';

    console.log(`\n[Phase 3] ✅ Launched ${actualMasters} masters`);
    console.log(`[Phase 3] Total workers: ${masters.reduce((sum, m) => sum + m.workers.length, 0)}`);
    console.log(`[Phase 3] Total LEGOs: ${totalMissing}`);

    res.json({
      success: true,
      message: `Launched ${actualMasters} Phase 3 masters`,
      totalMissing,
      completeLegos,
      masters: masters.map(m => ({
        masterNum: m.masterNum,
        seedRange: m.seedRange,
        workers: m.workers.length,
        legos: m.legoCount
      })),
      promptsDir
    });

  } catch (error) {
    console.error(`[Phase 3] ❌ Launch failed:`, error);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * Generate Phase 3 Master prompt with explicit worker assignments
 * Uses minimal upload format (/upload-basket) for token efficiency
 */
function generatePhase3MasterPrompt({ courseCode, target, known, masterNum, workers, totalLegos, seedRange }) {
  const workerPrompts = workers.map(w => {
    const legoList = w.legoIds.join(', ');
    // Build LEGO data inline for each worker
    const legoData = w.legos.map(l => `    "${l.legoId}": { "known": "${l.known}", "target": "${l.target}" }`).join(',\n');

    return `
## WORKER ${w.workerNum} PROMPT:

\`\`\`
# Phase 3 Worker ${w.workerNum}

Course: ${courseCode}
LEGOs: ${legoList}
Upload: ${BASKET_UPLOAD_URL}

## YOUR LEGO DATA (embedded - no fetch needed):
{
${legoData}
}

## TASK: For each LEGO, generate ~10 practice phrases

Rules:
1. EVERY phrase contains the COMPLETE LEGO
2. Progressive complexity: 2 short, 2 medium, 2 longer, 4 longest
3. Natural grammar in BOTH languages
4. Work silently - no verbose output

## UPLOAD FORMAT (minimal - server enriches):

For each LEGO, POST to ${BASKET_UPLOAD_URL}:
\`\`\`json
{
  "course": "${courseCode}",
  "legoId": "S0001L01",
  "phrases": [
    { "known": "I want", "target": "我想" },
    { "known": "I want that", "target": "我想要那个" }
  ]
}
\`\`\`

Upload each LEGO as you complete it. Report: "Worker ${w.workerNum}: ${w.legoCount} LEGOs done"
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
 * Alias for /launch-15-masters - both do intelligent resume (only missing LEGOs)
 */
app.post('/resume', async (req, res) => {
  console.log(`[Phase 3] /resume called - forwarding to /launch-15-masters`);
  // Forward to launch-15-masters which already does intelligent resume
  req.url = '/launch-15-masters';
  app._router.handle(req, res, () => {});
});

/**
 * POST /upload-basket-legacy - DEPRECATED: Old quad-write endpoint
 *
 * Use POST /upload-basket for new DB-only uploads with minimal payload.
 *
 * Body: {
 *   course: 'cmn_for_eng',
 *   seed: 'S0532',
 *   baskets: { S0532L01: {...}, S0532L02: {...} }
 * }
 */
app.post('/upload-basket-legacy', async (req, res) => {
  try {
    const { course, seed, baskets, agentId, stagingOnly = false } = req.body;

    if (!course || !seed || !baskets) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: course, seed, baskets'
      });
    }

    console.log(`📥 Receiving basket upload: ${course} / ${seed} (${Object.keys(baskets).length} LEGOs)${agentId ? ` from ${agentId}` : ''}`);

    // Load course data (used for enrichment and validation)
    const legoPairsPath = path.join(VFS_ROOT, course, 'lego_pairs.json');
    const seedPairsPath = path.join(VFS_ROOT, course, 'seed_pairs.json');
    const legoPairs = await fs.readJson(legoPairsPath);

    // Load seed_pairs if it exists, otherwise extract from lego_pairs
    let seedPairs = null;
    if (await fs.pathExists(seedPairsPath)) {
      seedPairs = await fs.readJson(seedPairsPath);
    }

    // Enrich baskets with server-added fields before validation
    try {

      // Find the seed entry in lego_pairs
      const seedEntry = legoPairs.seeds.find(s => s.seed_id === seed);
      if (!seedEntry) {
        return res.status(400).json({
          success: false,
          error: `Seed ${seed} not found in lego_pairs.json`
        });
      }

      // Get the seed sentence - prefer seed_pairs.json, fallback to lego_pairs.json
      let seedSentence;
      if (seedPairs && seedPairs.translations && seedPairs.translations[seed]) {
        seedSentence = seedPairs.translations[seed];
      } else if (seedEntry.seed_pair) {
        // Use seed_pair from lego_pairs.json (v2 format)
        seedSentence = seedEntry.seed_pair;
      }

      if (!seedSentence) {
        return res.status(400).json({
          success: false,
          error: `Seed ${seed} not found in seed_pairs.json`
        });
      }

      // Determine which LEGO is final in this seed
      const legosInSeed = seedEntry.legos || [];
      const finalLegoId = legosInSeed.length > 0 ? legosInSeed[legosInSeed.length - 1].id : null;

      // Enrich each basket
      for (const [legoId, basket] of Object.entries(baskets)) {
        // 1. Derive is_final_lego
        basket.is_final_lego = (legoId === finalLegoId);

        // 2. If final LEGO, append complete seed sentence (if not already present)
        if (basket.is_final_lego && basket.practice_phrases) {
          const hasSeedSentence = basket.practice_phrases.some(p =>
            p.known === seedSentence.known && p.target === seedSentence.target
          );

          if (!hasSeedSentence) {
            basket.practice_phrases.push({
              known: seedSentence.known,
              target: seedSentence.target
            });
          }
        }

        // 2.5 NEW: Enrich practice phrases with syllable_count, lego_count, and position
        // syllable_count is language-agnostic (CJK: characters, alphabetic: vowel clusters)
        if (basket.practice_phrases && Array.isArray(basket.practice_phrases)) {
          // Collect all LEGO target texts from this seed (for lego_count calculation)
          // Handle both nested format { lego: { target: "..." } } and flat format { target: "..." }
          const legoTargetsInSeed = legosInSeed
            .map(lego => lego.lego?.target || lego.target)
            .filter(Boolean);

          // Enrich each phrase
          basket.practice_phrases = basket.practice_phrases.map((phrase, index) => ({
            ...phrase,
            syllable_count: countSyllables(phrase.target),
            word_count: countSyllables(phrase.target),  // Legacy alias for backwards compatibility
            lego_count: countLegosInPhrase(phrase.target, legoTargetsInSeed),
            position: index + 1  // 1-based position
          }));
        }

        // 3. Add phrase_count
        basket.phrase_count = basket.practice_phrases ? basket.practice_phrases.length : 0;
      }

      console.log(`✅ Enriched ${Object.keys(baskets).length} baskets (final LEGO: ${finalLegoId || 'none'})`);
    } catch (enrichError) {
      console.error(`⚠️  Enrichment failed:`, enrichError.message);
      return res.status(500).json({
        success: false,
        error: `Failed to enrich baskets: ${enrichError.message}`
      });
    }

    // Validate basket format
    for (const [legoId, basket] of Object.entries(baskets)) {
      // Check required fields - NEW: lego is object with labels
      if (!basket.lego || typeof basket.lego !== 'object' || Array.isArray(basket.lego)) {
        return res.status(400).json({
          success: false,
          error: `Invalid basket format for ${legoId}: "lego" must be object { "known": "...", "target": "..." }`,
          received: basket.lego,
          expectedFormat: '{ "known": "English phrase", "target": "Spanish phrase" }'
        });
      }

      if (!basket.lego.known || !basket.lego.target) {
        return res.status(400).json({
          success: false,
          error: `Invalid basket format for ${legoId}: "lego" must have "known" and "target" fields`,
          received: basket.lego,
          expectedFormat: '{ "known": "English phrase", "target": "Spanish phrase" }'
        });
      }

      // Note: "type" field is optional in simplified format (server can derive from lego_pairs.json if needed)
      // Legacy baskets may include it, but it's not required for new submissions

      if (!basket.practice_phrases || !Array.isArray(basket.practice_phrases)) {
        return res.status(400).json({
          success: false,
          error: `Invalid basket format for ${legoId}: "practice_phrases" must be array`,
          received: basket.practice_phrases
        });
      }

      // Validate each practice phrase
      for (let i = 0; i < basket.practice_phrases.length; i++) {
        const phrase = basket.practice_phrases[i];

        // Reject old array format
        if (Array.isArray(phrase)) {
          return res.status(400).json({
            success: false,
            error: `Invalid phrase format for ${legoId} phrase ${i + 1}: array format no longer supported`,
            received: phrase,
            rejectedFormat: '["English phrase", "Spanish phrase", null, 1]',
            expectedFormat: '{ "known": "English phrase", "target": "Spanish phrase" }'
          });
        }

        // Reject language code format (es/en)
        if (phrase.es || phrase.en) {
          return res.status(400).json({
            success: false,
            error: `Invalid phrase format for ${legoId} phrase ${i + 1}: use "known"/"target" not language codes`,
            received: phrase,
            rejectedFormat: '{ "es": "...", "en": "..." }',
            expectedFormat: '{ "known": "English phrase", "target": "Spanish phrase" }'
          });
        }

        // Require object with known/target fields
        if (typeof phrase !== 'object' || !phrase.known || !phrase.target) {
          return res.status(400).json({
            success: false,
            error: `Invalid phrase format for ${legoId} phrase ${i + 1}: must have "known" and "target" fields`,
            received: phrase,
            expectedFormat: '{ "known": "English phrase", "target": "Spanish phrase" }'
          });
        }

        // Validate types
        if (typeof phrase.known !== 'string' || typeof phrase.target !== 'string') {
          return res.status(400).json({
            success: false,
            error: `Invalid phrase format for ${legoId} phrase ${i + 1}: "known" and "target" must be strings`,
            received: phrase
          });
        }
      }

      // Warn if wrong key name used
      if (basket.phrases && !basket.practice_phrases) {
        console.warn(`⚠️  Warning: ${legoId} uses "phrases" instead of "practice_phrases" - this will be rejected`);
      }
    }

    // ==============================================================================
    // CONTENT VALIDATION: GATE compliance + LEGO presence
    // ==============================================================================
    const allValidationErrors = [];

    for (const [legoId, basket] of Object.entries(baskets)) {
      const validation = validateBasketPhrases(basket, legoId, legoPairs);

      if (!validation.valid) {
        allValidationErrors.push({
          legoId,
          errors: validation.errors
        });
      }
    }

    // If validation errors, reject with detailed feedback
    if (allValidationErrors.length > 0) {
      const errorCount = allValidationErrors.reduce((sum, v) => sum + v.errors.length, 0);
      console.log(`❌ Validation failed: ${errorCount} errors across ${allValidationErrors.length} LEGOs`);

      // Log first few errors for debugging
      for (const v of allValidationErrors.slice(0, 3)) {
        console.log(`   ${v.legoId}:`);
        for (const e of v.errors.slice(0, 2)) {
          console.log(`     - ${e.error}`);
        }
      }

      return res.status(400).json({
        success: false,
        error: 'Validation failed: phrases have GATE violations or missing LEGO',
        validationErrors: allValidationErrors,
        tip: 'Fix the failing phrases and resubmit. Each phrase must contain the LEGO and use only available vocabulary in BOTH languages.',
        summary: {
          totalErrors: errorCount,
          legosAffected: allValidationErrors.length,
          gateViolationsTarget: allValidationErrors.reduce((sum, v) =>
            sum + v.errors.filter(e => e.type === 'gate_violation_target').length, 0),
          gateViolationsKnown: allValidationErrors.reduce((sum, v) =>
            sum + v.errors.filter(e => e.type === 'gate_violation_known').length, 0),
          missingLego: allValidationErrors.reduce((sum, v) =>
            sum + v.errors.filter(e => e.type === 'missing_lego').length, 0)
        }
      });
    }

    console.log(`✅ Content validation passed: all phrases GATE-compliant with LEGO present`);

    // Course directory (VFS_ROOT already points to public/vfs/courses)
    const courseDir = path.join(VFS_ROOT, course);
    const legoBasketsPath = path.join(courseDir, 'lego_baskets.json');
    const phase3OutputsDir = path.join(courseDir, 'phase3_outputs');
    const phase3StagingDir = path.join(courseDir, 'phase3_baskets_staging');

    // Ensure directories exist
    await fs.ensureDir(phase3OutputsDir);
    await fs.ensureDir(phase3StagingDir);

    // Save individual basket file to phase3_outputs
    // MERGE with existing baskets (multiple workers may upload LEGOs from same seed)
    const basketFilePath = path.join(phase3OutputsDir, `seed_${seed}_baskets.json`);
    let existingOutputBaskets = {};
    if (await fs.pathExists(basketFilePath)) {
      existingOutputBaskets = await fs.readJson(basketFilePath);
    }
    const mergedOutputBaskets = { ...existingOutputBaskets, ...baskets };
    await fs.writeJson(basketFilePath, mergedOutputBaskets, { spaces: 2 });
    console.log(`   💾 Saved to ${basketFilePath} (${Object.keys(mergedOutputBaskets).length} LEGOs)`);

    // Save to staging for review (git-ignored, safe)
    // MERGE with existing baskets (multiple workers may upload LEGOs from same seed)
    const stagingFilePath = path.join(phase3StagingDir, `seed_${seed}_baskets.json`);
    let existingBaskets = {};
    if (await fs.pathExists(stagingFilePath)) {
      existingBaskets = await fs.readJson(stagingFilePath);
    }
    const mergedBaskets = { ...existingBaskets, ...baskets };
    await fs.writeJson(stagingFilePath, mergedBaskets, { spaces: 2 });
    console.log(`   📦 Staged to ${stagingFilePath} (${Object.keys(mergedBaskets).length} LEGOs total)`);

    // AUTO-MERGE into lego_baskets.json
    let legoBaskets = {};
    if (await fs.pathExists(legoBasketsPath)) {
      legoBaskets = await fs.readJson(legoBasketsPath);
    }
    let mergedCount = 0;
    for (const [legoId, basket] of Object.entries(baskets)) {
      if (!legoBaskets[legoId]) {
        legoBaskets[legoId] = basket;
        mergedCount++;
      }
    }
    await fs.writeJson(legoBasketsPath, legoBaskets, { spaces: 2 });
    console.log(`   ✅ Auto-merged ${mergedCount} new LEGOs into lego_baskets.json (total: ${Object.keys(legoBaskets).length})`);

    // DATABASE-FIRST: Write directly to course_practice_phrases
    let dbPhrases = 0;
    if (courseDataService.USE_DATABASE_WRITES) {
      try {
        for (const [legoId, basket] of Object.entries(baskets)) {
          const result = await courseDataService.importBasket(course, legoId, basket);
          if (result) {
            dbPhrases += result.phraseCount || 0;
          }
        }
        console.log(`   💾 Database: Saved ${dbPhrases} phrases to course_practice_phrases`);
      } catch (dbError) {
        console.error(`   ⚠️  Database write failed (JSON saved as fallback):`, dbError.message);
      }
    }

    // Track upload in job state (if job exists)
    const job = activeJobs.get(course);
    if (job && job.uploads) {
      job.uploads.seedsUploaded.add(seed);
      job.uploads.legosReceived += Object.keys(baskets).length;
      job.uploads.lastUploadAt = new Date().toISOString();

      const progress = `${job.uploads.legosReceived}/${job.uploads.expectedLegos} LEGOs`;
      console.log(`   📊 Progress: ${progress} (${job.uploads.seedsUploaded.size}/${job.uploads.expectedSeeds} seeds)`);

      // Update master/worker tracking based on LEGOs uploaded
      const uploadedLegoIds = Object.keys(baskets);
      if (job.masters && job.masters.length > 0) {
        for (const master of job.masters) {
          let masterLegosReceived = 0;
          for (const worker of master.workers) {
            // Check if any of this worker's LEGOs were in this upload
            const workerUploadedLegos = uploadedLegoIds.filter(id => worker.legoIds?.includes(id));
            if (workerUploadedLegos.length > 0) {
              worker.status = 'complete';
              worker.lastUpload = new Date().toISOString();
              masterLegosReceived += workerUploadedLegos.length;
            }
            // Count total received for this master
            if (worker.status === 'complete') {
              // Worker already marked complete - add its full count
            }
          }
          // Update master's total received (recalculate from all workers)
          master.legosReceived = master.workers.filter(w => w.status === 'complete').reduce((sum, w) => sum + w.legoCount, 0);
          master.lastActivityAt = new Date().toISOString();

          // Check if master is complete (all workers done)
          const allWorkersComplete = master.workers.every(w => w.status === 'complete');
          if (allWorkersComplete && master.status !== 'complete') {
            master.status = 'complete';
            console.log(`   🎉 Master ${master.masterNum} complete: all ${master.workers.length} workers done`);
          }
        }
      }

      // Report progress to orchestrator
      reportProgressToOrchestrator(course, {
        phase: 3,
        updates: {
          status: 'running',
          legosCompleted: job.uploads.legosReceived,
          legosTotal: job.uploads.expectedLegos,
          seedsCompleted: job.uploads.seedsUploaded.size,
          seedsTotal: job.uploads.expectedSeeds,
          currentSeed: seed,
          startTime: job.startedAt
        },
        logMessage: `Received ${seed}: ${Object.keys(baskets).length} LEGOs (${job.uploads.legosReceived}/${job.uploads.expectedLegos} total)`
      }).catch(err => {
        console.error(`⚠️  Failed to report progress:`, err.message);
      });

      // Check if all uploads complete
      if (!job.uploads.complete && job.uploads.legosReceived >= job.uploads.expectedLegos) {
        job.uploads.complete = true;
        job.status = 'uploads_complete';
        console.log(`\n🎉 ALL UPLOADS COMPLETE! Received ${job.uploads.legosReceived} LEGOs from ${job.uploads.seedsUploaded.size} seeds`);

        // Report completion to orchestrator
        reportProgressToOrchestrator(course, {
          phase: 3,
          updates: {
            status: 'complete',
            legosCompleted: job.uploads.legosReceived,
            legosTotal: job.uploads.expectedLegos,
            seedsCompleted: job.uploads.seedsUploaded.size,
            seedsTotal: job.uploads.expectedSeeds
          },
          logMessage: `✅ Phase 3 complete: ${job.uploads.legosReceived} LEGOs across ${job.uploads.seedsUploaded.size} seeds`
        }).catch(err => {
          console.error(`⚠️  Failed to report completion:`, err.message);
        });

        // Trigger Phase 3 completion workflow
        triggerPhase3Completion(course, job).catch(err => {
          console.error(`❌ Phase 3 completion workflow failed:`, err);
          job.error = err.message;
          job.status = 'completion_failed';
        });
      }
    }

    return res.json({
      success: true,
      message: job && job.uploads?.complete
        ? '✅ All baskets received! Phase 3 completion workflow started.'
        : 'Baskets saved to staging',
      stagingPath: stagingFilePath,
      basketCount: Object.keys(baskets).length,
      reviewCommand: `node tools/phase3/preview-merge.cjs ${course}`,
      mergeCommand: `node tools/phase3/extract-and-normalize.cjs ${course}`
    });

  } catch (error) {
    console.error('❌ Upload basket error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==============================================================================
// MINIMAL UPLOAD ENDPOINT (TOKEN-EFFICIENT)
// ==============================================================================

/**
 * POST /upload-basket - Minimal per-basket upload endpoint
 *
 * TOKEN-EFFICIENT: Workers send only essential data, server enriches.
 * DATABASE-FIRST: Writes directly to Supabase, no JSON files.
 * PER-BASKET MONITORING: Emits events as each basket completes.
 *
 * A "basket" is the collection of practice phrases for a single LEGO.
 *
 * Payload (minimal):
 * {
 *   course: "zho_for_eng",
 *   legoId: "S0007L07",
 *   phrases: [
 *     { known: "I want to try", target: "我想试试" },
 *     { known: "I want to try now", target: "我现在想试试" }
 *   ]
 * }
 *
 * Server enriches:
 * - position (1-based index)
 * - syllable_count (calculated from target)
 * - lego_count (calculated from target, requires lego_pairs context)
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

    console.log(`📥 [upload-basket] ${course}/${legoId}: ${phrases.length} phrases${agentId ? ` from ${agentId}` : ''}`);

    // Parse legoId for database write
    const seedMatch = legoId.match(/S(\d+)L(\d+)/i);
    if (!seedMatch) {
      return res.status(400).json({
        success: false,
        error: `Invalid legoId format: ${legoId} (expected S0001L01)`
      });
    }
    const seedNumber = parseInt(seedMatch[1], 10);
    const legoIndex = parseInt(seedMatch[2], 10);

    // Load lego_pairs.json for enrichment (needed for lego_count calculation)
    const legoPairsPath = path.join(VFS_ROOT, course, 'lego_pairs.json');
    let legoTargets = [];
    try {
      if (await fs.pathExists(legoPairsPath)) {
        const legoPairs = await fs.readJson(legoPairsPath);
        const seedEntry = legoPairs.seeds?.find(s => s.seed_id === `S${String(seedNumber).padStart(4, '0')}`);
        if (seedEntry?.legos) {
          legoTargets = seedEntry.legos
            .map(l => l.lego?.target || l.target)
            .filter(Boolean);
        }
      }
    } catch (lpErr) {
      console.warn(`   ⚠️  Could not load lego_pairs for enrichment: ${lpErr.message}`);
    }

    // Enrich phrases with position, syllable_count, lego_count
    const enrichedPhrases = phrases.map((p, idx) => ({
      known: p.known,
      target: p.target,
      position: idx + 1,
      syllable_count: countSyllables(p.target),
      lego_count: legoTargets.length > 0 ? countLegosInPhrase(p.target, legoTargets) : 1
    }));

    // DATABASE-FIRST WRITE (no JSON files)
    let dbWriteSuccess = false;
    let phraseCount = 0;

    if (courseDataService.USE_DATABASE_WRITES) {
      try {
        // Clear existing phrases for this LEGO
        await courseDataService.clearPracticePhrases(course, seedNumber, legoIndex);

        // Save enriched phrases
        for (const phrase of enrichedPhrases) {
          await courseDataService.savePracticePhrase(course, seedNumber, legoIndex, {
            knownText: phrase.known,
            targetText: phrase.target,
            position: phrase.position,
            wordCount: phrase.syllable_count,  // word_count column stores syllable count
            legoCount: phrase.lego_count,
            status: 'draft'
          });
          phraseCount++;
        }

        dbWriteSuccess = true;
        console.log(`   ✅ Database: ${phraseCount} phrases saved to course_practice_phrases`);
      } catch (dbErr) {
        console.error(`   ❌ Database write failed: ${dbErr.message}`);
        return res.status(500).json({
          success: false,
          error: `Database write failed: ${dbErr.message}`
        });
      }
    } else {
      return res.status(503).json({
        success: false,
        error: 'Database writes not enabled (USE_DATABASE_WRITES=false)'
      });
    }

    // Track in job state (if job exists)
    const job = activeJobs.get(course);
    if (job) {
      job.uploads = job.uploads || { legosReceived: 0, lastUploadAt: null };
      job.uploads.legosReceived++;
      job.uploads.lastUploadAt = new Date().toISOString();

      // Report per-LEGO progress to orchestrator
      reportProgressToOrchestrator(course, {
        phase: 3,
        updates: {
          status: 'running',
          legosCompleted: job.uploads.legosReceived,
          legosTotal: job.uploads.expectedLegos || 0,
          currentLego: legoId
        },
        logMessage: `LEGO complete: ${legoId} (${phraseCount} phrases)`
      }).catch(err => {
        // Non-fatal - log and continue
        console.error(`   ⚠️  Progress report failed: ${err.message}`);
      });
    }

    // Success response (minimal)
    return res.json({
      success: true,
      legoId,
      phraseCount,
      enriched: true
    });

  } catch (error) {
    console.error('❌ upload-basket error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /basket-status/:course - Get current basket counts
 */
app.get('/basket-status/:course', async (req, res) => {
  try {
    const { course } = req.params;
    const courseDir = path.join(VFS_ROOT, course);
    const legoBasketsPath = path.join(courseDir, 'lego_baskets.json');
    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');

    if (!await fs.pathExists(legoBasketsPath)) {
      return res.json({
        success: true,
        totalBaskets: 0,
        totalNeeded: 0,
        missing: 0,
        progress: 0
      });
    }

    const legoBaskets = await fs.readJson(legoBasketsPath);
    const totalBaskets = Object.keys(legoBaskets.baskets || {}).length;

    let totalNeeded = 0;
    if (await fs.pathExists(legoPairsPath)) {
      const legoPairs = await fs.readJson(legoPairsPath);
      legoPairs.seeds.forEach(seed => {
        seed.legos.forEach(lego => {
          if (lego.new === true) totalNeeded++;
        });
      });
    }

    const missing = Math.max(0, totalNeeded - totalBaskets);
    const progress = totalNeeded > 0 ? Math.round((totalBaskets / totalNeeded) * 10000) / 100 : 0;

    // Recent activity (last 10 uploads)
    const recentUploads = (legoBaskets.metadata?.uploads || []).slice(-10).reverse();

    // Active agents (agents who uploaded in last 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const activeAgents = new Set();
    (legoBaskets.metadata?.uploads || []).forEach(upload => {
      if (new Date(upload.timestamp).getTime() > fiveMinutesAgo) {
        activeAgents.add(upload.agentId);
      }
    });

    res.json({
      success: true,
      totalBaskets,
      totalNeeded,
      missing,
      progress,
      lastUpload: legoBaskets.metadata?.last_upload,
      lastSeed: legoBaskets.metadata?.last_seed,
      lastAgent: legoBaskets.metadata?.last_agent,
      activeAgents: Array.from(activeAgents),
      recentUploads
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Trigger Phase 3 completion workflow
 * Runs after all uploads complete
 */
async function triggerPhase3Completion(courseCode, job) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PHASE 3 COMPLETION WORKFLOW`);
  console.log('='.repeat(60));
  console.log(`Course: ${courseCode}`);
  console.log(`LEGOs received: ${job.uploads.legosReceived}`);
  console.log(`Seeds received: ${job.uploads.seedsUploaded.size}\n`);

  const courseDir = path.join(VFS_ROOT, courseCode);

  try {
    // Step 1: Merge staging baskets
    console.log('📦 Step 1: Merging staging baskets...');
    job.status = 'merging_baskets';
    await execScript(path.join(__dirname, '../../scripts/merge-phase3-staging.cjs'), courseCode);
    console.log('✅ Merge complete\n');

    // Step 2: Clean GATE violations
    console.log('🧹 Step 2: Cleaning GATE violations...');
    job.status = 'cleaning_gate';
    await execScript(path.join(__dirname, '../../scripts/clean-baskets-gate.cjs'), courseCode);
    console.log('✅ GATE cleaning complete\n');

    // Step 3: Ensure minimum phrase
    console.log('🛡️  Step 3: Ensuring minimum phrase...');
    job.status = 'ensuring_minimum';
    await execScript(path.join(__dirname, '../../scripts/ensure-minimum-phrase.cjs'), courseCode);
    console.log('✅ Minimum phrase ensured\n');

    // Step 4: Trigger Grammar Validation (OPTIONAL - may not be running)
    console.log('📝 Step 4: Triggering grammar validation...');
    job.status = 'triggering_grammar';

    try {
      const grammarResponse = await fetch(`${process.env.GRAMMAR_SERVICE_URL || 'http://localhost:3460'}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseCode })
      });

      if (grammarResponse.ok) {
        const grammarResult = await grammarResponse.json();
        console.log('✅ Grammar validation started\n');

        // Step 5: Wait for grammar validation completion
        console.log('⏳ Step 5: Waiting for grammar validation to complete...');
        job.status = 'waiting_grammar';
        await waitForGrammarValidation(courseCode);
        console.log('✅ Grammar validation complete\n');
      } else {
        console.warn('⚠️  Grammar validation service returned error, skipping...\n');
      }
    } catch (grammarError) {
      console.warn(`⚠️  Grammar validation service unavailable (port 3460), skipping...`);
      console.warn(`   Error: ${grammarError.message}\n`);
    }

    // Mark Phase 3 complete
    job.status = 'phase3_complete';
    job.completedAt = new Date().toISOString();

    console.log('='.repeat(60));
    console.log('✅ PHASE 3 COMPLETE!');
    console.log('='.repeat(60));
    console.log(`\nNext: Manifest Compilation ready to start`);
    console.log(`Run: POST http://localhost:3461/start {"courseCode": "${courseCode}"}\n`);

    // Notify orchestrator
    if (ORCHESTRATOR_URL) {
      try {
        await fetch(`${ngrokUrl}/phase-complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phase: 'phase3',
            courseCode,
            success: true,
            stats: {
              legosGenerated: job.uploads.legosReceived,
              seedsProcessed: job.uploads.seedsUploaded.size
            }
          })
        });
      } catch (err) {
        console.error('⚠️  Failed to notify orchestrator:', err.message);
      }
    }

  } catch (error) {
    console.error(`\n❌ Phase 3 completion failed:`, error.message);
    job.status = 'completion_failed';
    job.error = error.message;
    throw error;
  }
}

/**
 * Execute a script and wait for completion
 */
function execScript(scriptPath, ...args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [scriptPath, ...args], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', data => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output);
    });

    proc.stderr.on('data', data => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(output);
    });

    proc.on('close', code => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Script failed with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', err => {
      reject(err);
    });
  });
}

/**
 * Wait for grammar validation to complete
 */
async function waitForGrammarValidation(courseCode) {
  const maxWaitTime = 30 * 60 * 1000; // 30 minutes
  const pollInterval = 5000; // 5 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await fetch(`${process.env.GRAMMAR_SERVICE_URL || 'http://localhost:3460'}/status/${courseCode}`);
      if (!response.ok) {
        throw new Error(`Grammar validation status check failed: ${response.statusText}`);
      }

      const status = await response.json();

      if (status.status === 'complete') {
        const deletionRate = status.stats.phrasesDeleted / (status.stats.phrasesDeleted + status.stats.phrasesKept);

        console.log(`   Grammar validation results:`);
        console.log(`     Phrases deleted: ${status.stats.phrasesDeleted}`);
        console.log(`     Phrases kept: ${status.stats.phrasesKept}`);
        console.log(`     Deletion rate: ${(deletionRate * 100).toFixed(2)}%`);

        if (deletionRate > 0.20) {
          throw new Error(`Grammar validation failed: ${(deletionRate * 100).toFixed(1)}% deletion rate (>20% threshold)`);
        }

        return status;
      }

      if (status.status === 'failed') {
        throw new Error(`Grammar validation failed: ${status.error}`);
      }

      // Still running, wait and poll again
      await new Promise(resolve => setTimeout(resolve, pollInterval));

    } catch (error) {
      if (error.message.includes('No job found')) {
        // Grammar validation might not have started yet, wait a bit
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } else {
        throw error;
      }
    }
  }

  throw new Error('Grammar validation timeout: took longer than 30 minutes');
}

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log('');
  console.log(`${SERVICE_NAME} listening on port ${PORT}`);
  console.log(`   VFS Root: ${VFS_ROOT}`);
  console.log(`   Data fetch URL: ${ngrokUrl}`);
  console.log(`   Basket upload URL: ${BASKET_UPLOAD_URL}`);
  console.log('');
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('\n[Phase 3] 🛑 Shutting down...');

  // Stop all watchers
  for (const [courseCode, watcher] of watchers.entries()) {
    console.log(`[Phase 3]   Stopping watcher for ${courseCode}...`);
    watcher.kill('SIGTERM');
  }

  process.exit(0);
});
