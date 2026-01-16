/**
 * Course Builder API - Simple endpoint for LLM agents to insert LEGOs and phrases
 *
 * IMPORTANT: DATABASE-ONLY ARCHITECTURE (January 2026)
 * =====================================================
 * Course data is stored EXCLUSIVELY in Supabase, NOT in JSON files.
 * This service writes directly to Supabase tables:
 * - course_legos: LEGO definitions
 * - course_practice_phrases: Practice phrases for each LEGO
 *
 * JSON files (lego_pairs.json, lego_baskets.json) are DEPRECATED.
 * Do NOT read course data from JSON files - always query Supabase.
 *
 * POST /api/lego - Insert a LEGO with its phrases
 */

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// CORS - allow dashboard from any origin (popty.app, localhost, etc.)
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const PORT = process.env.COURSE_BUILDER_PORT || 3471;

// =============================================================================
// PER-COURSE VOCABULARY TRACKING
// Each course has its own vocab set built from LEGOs in insertion order
// =============================================================================

// LRU Cache with TTL for course vocabulary
// Stores: course_code -> { vocab: Set, lastAccess: timestamp }
const MAX_CACHE_SIZE = 10;
const CACHE_TTL_MS = 30 * 60 * 1000;  // 30 minutes
const courseVocabCache = new Map();  // course_code -> { vocab: Set, lastAccess: number }

// =============================================================================
// ACTIVITY TRACKING FOR STALL DETECTION
// Dashboard can poll /api/activity to detect stalled courses and respawn agents
// =============================================================================
const STALL_THRESHOLD_MS = 5 * 60 * 1000;  // 5 minutes without submission = stalled
const courseActivity = new Map();  // course_code -> { lastSubmission: timestamp, lastSeed: number, status: 'active'|'stalled' }

/**
 * Record activity for a course (called after successful seed submission)
 */
function recordActivity(courseCode, seedNumber) {
  courseActivity.set(courseCode, {
    lastSubmission: Date.now(),
    lastSeed: seedNumber,
    status: 'active'
  });
}

/**
 * Get stall status for all tracked courses
 */
function getActivityStatus() {
  const now = Date.now();
  const result = {};

  for (const [courseCode, activity] of courseActivity.entries()) {
    const elapsed = now - activity.lastSubmission;
    const stalled = elapsed > STALL_THRESHOLD_MS;

    result[courseCode] = {
      lastSubmission: new Date(activity.lastSubmission).toISOString(),
      lastSeed: activity.lastSeed,
      elapsedMs: elapsed,
      elapsedMinutes: (elapsed / 60000).toFixed(1),
      stalled,
      status: stalled ? 'STALLED' : 'active'
    };
  }

  return result;
}

// =============================================================================
// BUILD MANAGER - Sequential 30-seed batch agent spawning
// =============================================================================
const { spawn } = require('child_process');

const BATCH_SIZE = 30;  // Seeds per agent
const BUILD_CHECK_INTERVAL_MS = 30000;  // Check progress every 30s

// =============================================================================
// RECENCY TRACKING - Pattern fatigue & vocabulary reinforcement
// =============================================================================
const RECENCY_WINDOW = 50;  // Look at last 50 seeds for pattern analysis
const PATTERN_FATIGUE_THRESHOLD = 5;  // Max times a 3-gram can appear in window
const REINFORCEMENT_ZONE = { min: 20, max: 60 };  // Seeds ago when vocab needs practice

/**
 * Extract n-grams from text (for pattern detection)
 */
function extractNgrams(text, n = 3) {
  const words = text.toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')  // Keep letters/numbers/spaces (Unicode-aware)
    .split(/\s+/)
    .filter(w => w.length > 0);

  const ngrams = [];
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '));
  }
  return ngrams;
}

/**
 * Analyze pattern recency for a course
 * Returns over-used patterns that should be avoided
 */
async function analyzePatternRecency(courseCode, windowSize = RECENCY_WINDOW) {
  // Get phrases from recent seeds
  const { data: recentPhrases } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, known_text, target_text')
    .eq('course_code', courseCode)
    .order('seed_number', { ascending: false })
    .limit(windowSize * 50);  // Estimate ~50 phrases per seed

  if (!recentPhrases || recentPhrases.length === 0) {
    return { overusedPatterns: [], patternCounts: {} };
  }

  // Get the seed numbers in the window
  const seedNumbers = [...new Set(recentPhrases.map(p => p.seed_number))].sort((a, b) => b - a);
  const windowSeeds = new Set(seedNumbers.slice(0, windowSize));

  // Count n-grams in the window (KNOWN LANGUAGE ONLY)
  // Target language repetition is pedagogically useful; known language repetition is boring
  const patternCounts = {};  // pattern -> { count, seeds: Set }

  for (const phrase of recentPhrases) {
    if (!windowSeeds.has(phrase.seed_number)) continue;

    // Only analyze known language text - that's where repetition feels stale
    const knownNgrams = extractNgrams(phrase.known_text, 3);

    for (const ngram of knownNgrams) {
      if (!patternCounts[ngram]) {
        patternCounts[ngram] = { count: 0, seeds: new Set() };
      }
      patternCounts[ngram].count++;
      patternCounts[ngram].seeds.add(phrase.seed_number);
    }
  }

  // Find over-used patterns (appear in too many seeds)
  const overusedPatterns = Object.entries(patternCounts)
    .filter(([_, data]) => data.seeds.size >= PATTERN_FATIGUE_THRESHOLD)
    .map(([pattern, data]) => ({
      pattern,
      seedCount: data.seeds.size,
      totalCount: data.count
    }))
    .sort((a, b) => b.seedCount - a.seedCount)
    .slice(0, 20);  // Top 20 most overused

  return { overusedPatterns, patternCounts };
}

/**
 * Analyze vocabulary recency for reinforcement recommendations
 * Returns vocabulary that was introduced a while ago but hasn't been practiced recently
 */
async function analyzeVocabRecency(courseCode) {
  // Get all LEGOs with their introduction seed
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number, known_text, target_text, is_new')
    .eq('course_code', courseCode)
    .eq('is_new', true)
    .order('seed_number');

  if (!legos || legos.length === 0) {
    return { needsReinforcement: [], recentlyOverused: [] };
  }

  // Get current max seed number
  const { data: maxSeedData } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', courseCode)
    .order('seed_number', { ascending: false })
    .limit(1);

  const currentSeed = maxSeedData?.[0]?.seed_number || 0;

  // Get recent phrase usage to see what vocabulary is being used
  const { data: recentPhrases } = await supabase
    .from('course_practice_phrases')
    .select('known_text, target_text, seed_number')
    .eq('course_code', courseCode)
    .gte('seed_number', currentSeed - RECENCY_WINDOW)
    .order('seed_number', { ascending: false });

  // Build vocab usage map from recent phrases
  const recentVocabUsage = new Map();  // word -> lastUsedSeed
  for (const phrase of (recentPhrases || [])) {
    const words = `${phrase.known_text} ${phrase.target_text}`.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 1) {
        const current = recentVocabUsage.get(word) || 0;
        recentVocabUsage.set(word, Math.max(current, phrase.seed_number));
      }
    }
  }

  // Categorize LEGOs by recency
  const needsReinforcement = [];  // Introduced in reinforcement zone, not used recently
  const recentlyOverused = [];    // Introduced recently and used a LOT

  for (const lego of legos) {
    const seedsAgo = currentSeed - lego.seed_number;
    const knownWords = lego.known_text.toLowerCase().split(/\s+/);

    // Check if in reinforcement zone (20-60 seeds ago)
    if (seedsAgo >= REINFORCEMENT_ZONE.min && seedsAgo <= REINFORCEMENT_ZONE.max) {
      // Check if used recently
      const lastUsed = Math.max(...knownWords.map(w => recentVocabUsage.get(w) || 0));
      const seedsSinceUse = currentSeed - lastUsed;

      if (seedsSinceUse > 10) {  // Not used in last 10 seeds
        needsReinforcement.push({
          known: lego.known_text,
          target: lego.target_text,
          introduced_seed: lego.seed_number,
          seeds_ago: seedsAgo,
          last_used_seed: lastUsed || null
        });
      }
    }
  }

  return {
    needsReinforcement: needsReinforcement.slice(0, 15),  // Top 15 needing reinforcement
    currentSeed,
    reinforcementZone: REINFORCEMENT_ZONE
  };
}

/**
 * Check if a phrase would cause pattern fatigue (known language only)
 * Returns { ok: true } or { ok: false, reason, suggestions }
 */
async function checkPatternFatigue(courseCode, knownText) {
  const { overusedPatterns } = await analyzePatternRecency(courseCode);

  if (overusedPatterns.length === 0) {
    return { ok: true };
  }

  // Build lookup set of over-used patterns
  const overusedSet = new Set(overusedPatterns.map(p => p.pattern));

  // Check if phrase contains any over-used patterns (known language only)
  const knownNgrams = extractNgrams(knownText, 3);
  const violations = [];

  for (const ngram of knownNgrams) {
    if (overusedSet.has(ngram)) {
      violations.push(ngram);
    }
  }

  if (violations.length > 0) {
    return {
      ok: false,
      reason: 'Pattern fatigue detected',
      violations: violations.slice(0, 5),
      suggestion: 'Use different sentence structures. These known-language patterns have been overused in recent seeds.'
    };
  }

  return { ok: true };
}

// Active builds: course_code -> { agent, batchStartSeed, batchStartTime, agentCount, status }
const activeBuilds = new Map();

/**
 * Get current progress for a course (seeds with LEGOs = fully processed)
 */
async function getBuildProgress(courseCode) {
  const { count: totalSeeds } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode);

  const { data: legoData } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', courseCode);

  const completedSeeds = new Set(legoData?.map(r => r.seed_number)).size;

  return {
    completed: completedSeeds,
    total: totalSeeds || 668,
    isComplete: completedSeeds >= (totalSeeds || 668)
  };
}

/**
 * Spawn a new Claude agent for a course using osascript
 * Opens a new terminal window (iTerm or Terminal) and runs claude there
 */
function spawnBuildAgent(courseCode, agentNumber, terminal = 'iTerm2') {
  const prompt = `You are Agent #${agentNumber} for ${courseCode}. Run /course-resume first, then build ${BATCH_SIZE} seeds autonomously. Fix validation errors (max 3 retries per seed). Say BATCH COMPLETE and exit when done.`;

  // Write prompt to temp file to avoid escaping nightmares
  const tmpFile = `/tmp/claude_build_${courseCode}_${agentNumber}_${Date.now()}.txt`;
  require('fs').writeFileSync(tmpFile, prompt);

  const claudeCmd = `claude --dangerously-skip-permissions "$(cat ${tmpFile})"`;
  // Escape for AppleScript string
  const escapedCmd = claudeCmd.replace(/"/g, '\\"');

  console.log(`[BUILD] Spawning Agent #${agentNumber} for ${courseCode} in ${terminal}`);

  let osascript;
  if (terminal === 'iTerm2') {
    // Note: "iTerm" not "iTerm2" in AppleScript
    osascript = `tell application "iTerm"
  activate
  set newWindow to (create window with default profile)
  tell current session of newWindow
    write text "${escapedCmd}"
  end tell
end tell`;
  } else {
    osascript = `tell application "Terminal"
  activate
  do script "${escapedCmd}"
end tell`;
  }

  const agent = spawn('osascript', ['-e', osascript], {
    stdio: 'pipe',
    detached: true
  });

  agent.on('error', (err) => {
    console.error(`[BUILD] Agent #${agentNumber} osascript error:`, err.message);
    const build = activeBuilds.get(courseCode);
    if (build) {
      build.agent = null;
      build.status = 'agent_error';
    }
  });

  agent.on('exit', (code) => {
    // osascript exits immediately after launching the terminal window
    // The actual claude process runs independently in the terminal
    console.log(`[BUILD] Agent #${agentNumber} terminal launched (osascript exit code: ${code})`);
    const build = activeBuilds.get(courseCode);
    if (build) {
      // Don't set agent to null - we track via progress, not process
      build.status = 'agent_running';
    }
  });

  return agent;
}

/**
 * Check build progress and spawn new agents as needed
 */
async function checkBuilds() {
  for (const [courseCode, build] of activeBuilds.entries()) {
    try {
      const progress = await getBuildProgress(courseCode);
      const now = Date.now();

      // Course complete?
      if (progress.isComplete) {
        console.log(`[BUILD] ✓ COMPLETE: ${courseCode} (${progress.completed}/${progress.total} seeds)`);
        console.log(`[BUILD]   Total agents used: ${build.agentCount}`);
        if (build.agent && build.agent.pid) {
          try { process.kill(build.agent.pid, 'SIGTERM'); } catch (e) {}
        }
        activeBuilds.delete(courseCode);
        continue;
      }

      // No agent running - spawn one
      if (!build.agent) {
        console.log(`[BUILD] No agent for ${courseCode}, spawning...`);
        console.log(`[BUILD]   Progress: ${progress.completed}/${progress.total}`);

        build.agentCount++;
        build.batchStartSeed = progress.completed;
        build.batchStartTime = now;
        build.lastSeenSeed = progress.completed;
        build.lastProgressTime = now;
        build.status = 'running';
        build.agent = spawnBuildAgent(courseCode, build.agentCount, build.terminal);

        // Ping activity to reset stall timer
        recordActivity(courseCode, progress.completed);
        continue;
      }

      // Agent running - check progress
      const seedsThisBatch = progress.completed - build.batchStartSeed;
      const timeSinceProgress = now - build.lastProgressTime;

      // Progress made?
      if (progress.completed > build.lastSeenSeed) {
        console.log(`[BUILD] ${courseCode}: ${progress.completed}/${progress.total} (+${progress.completed - build.lastSeenSeed})`);
        build.lastSeenSeed = progress.completed;
        build.lastProgressTime = now;
      }

      // Batch complete?
      if (seedsThisBatch >= BATCH_SIZE) {
        console.log(`[BUILD] Batch complete for ${courseCode} (${seedsThisBatch} seeds)`);
        // Agent should exit naturally, we'll spawn new one next check
        build.status = 'batch_complete';
        continue;
      }

      // Stalled?
      if (timeSinceProgress > STALL_THRESHOLD_MS) {
        console.log(`[BUILD] STALL: ${courseCode} - no progress for ${Math.round(timeSinceProgress / 1000)}s`);
        console.log(`[BUILD]   Killing agent and spawning fresh one...`);

        if (build.agent && build.agent.pid) {
          try { process.kill(build.agent.pid, 'SIGTERM'); } catch (e) {}
        }
        build.agent = null;
        build.status = 'stalled';
        // Will spawn new agent on next check
      }

    } catch (err) {
      console.error(`[BUILD] Error checking ${courseCode}:`, err.message);
    }
  }
}

/**
 * Start the build manager loop
 */
let buildManagerInterval = null;

function startBuildManager() {
  if (buildManagerInterval) return;  // Already running

  console.log('[BUILD] Starting build manager loop...');
  buildManagerInterval = setInterval(checkBuilds, BUILD_CHECK_INTERVAL_MS);
}

function stopBuildManager() {
  if (buildManagerInterval) {
    clearInterval(buildManagerInterval);
    buildManagerInterval = null;
    console.log('[BUILD] Build manager stopped');
  }
}

/**
 * Start a build for a course
 * @param {string} courseCode
 * @param {string} terminal - 'iTerm2' or 'Terminal'
 */
async function startBuild(courseCode, terminal = 'iTerm2') {
  if (activeBuilds.has(courseCode)) {
    return { ok: false, error: 'Build already active for this course' };
  }

  const progress = await getBuildProgress(courseCode);

  if (progress.isComplete) {
    return { ok: false, error: 'Course already complete' };
  }

  activeBuilds.set(courseCode, {
    agent: null,
    agentCount: 0,
    batchStartSeed: progress.completed,
    batchStartTime: Date.now(),
    lastSeenSeed: progress.completed,
    lastProgressTime: Date.now(),
    status: 'starting',
    terminal: terminal  // Store terminal preference
  });

  // Ensure build manager is running
  startBuildManager();

  // Trigger immediate check to spawn first agent
  setTimeout(() => checkBuilds(), 100);

  return {
    ok: true,
    course_code: courseCode,
    progress: progress,
    message: `Build started - will spawn agents in ${BATCH_SIZE}-seed batches`
  };
}

/**
 * Stop a build for a course
 */
function stopBuild(courseCode) {
  const build = activeBuilds.get(courseCode);

  if (!build) {
    return { ok: false, error: 'No active build for this course' };
  }

  // Kill agent if running
  if (build.agent && build.agent.pid) {
    try { process.kill(build.agent.pid, 'SIGTERM'); } catch (e) {}
  }

  activeBuilds.delete(courseCode);

  // Stop manager if no more builds
  if (activeBuilds.size === 0) {
    stopBuildManager();
  }

  return {
    ok: true,
    course_code: courseCode,
    agents_used: build.agentCount,
    message: 'Build stopped'
  };
}

/**
 * Get build status for a course
 */
async function getBuildStatus(courseCode) {
  const build = activeBuilds.get(courseCode);
  const progress = await getBuildProgress(courseCode);

  return {
    course_code: courseCode,
    active: !!build,
    progress: progress,
    build: build ? {
      status: build.status,
      agent_count: build.agentCount,
      current_batch_seeds: progress.completed - build.batchStartSeed,
      batch_size: BATCH_SIZE
    } : null
  };
}

/**
 * Get cache entry, updating access time. Returns null if expired or missing.
 */
function getCacheEntry(courseCode) {
  const entry = courseVocabCache.get(courseCode);
  if (!entry) return null;

  // Check TTL expiration
  if (Date.now() - entry.lastAccess > CACHE_TTL_MS) {
    courseVocabCache.delete(courseCode);
    return null;
  }

  // Update access time (LRU touch)
  entry.lastAccess = Date.now();
  // Move to end of Map (most recently used)
  courseVocabCache.delete(courseCode);
  courseVocabCache.set(courseCode, entry);

  return entry.vocab;
}

/**
 * Set cache entry, evicting oldest if at capacity.
 */
function setCacheEntry(courseCode, vocabSet) {
  // If already exists, delete first (to update position)
  if (courseVocabCache.has(courseCode)) {
    courseVocabCache.delete(courseCode);
  }

  // Evict oldest entries if at capacity
  while (courseVocabCache.size >= MAX_CACHE_SIZE) {
    // Map iterates in insertion order, so first key is oldest
    const oldestKey = courseVocabCache.keys().next().value;
    courseVocabCache.delete(oldestKey);
  }

  courseVocabCache.set(courseCode, {
    vocab: vocabSet,
    lastAccess: Date.now()
  });
}

/**
 * Detect if course uses character-level vocab (Chinese, Japanese, Korean)
 * These languages don't use spaces between words, so vocabulary is character-based
 */
function isChinese(courseCode) {
  // Check for Chinese, Japanese, or Korean (all use character-based vocab)
  const characterBasedLangs = ['zho', 'jpn', 'kor'];
  for (const lang of characterBasedLangs) {
    if (courseCode.startsWith(lang) || courseCode.includes(`_${lang}`)) {
      return true;
    }
  }
  return false;
}

/**
 * Get language name from course code for {target} substitution
 */
function getLanguageName(courseCode) {
  const langMap = {
    'zho': 'Chinese',
    'ita': 'Italian',
    'spa': 'Spanish',
    'fra': 'French',
    'deu': 'German',
    'por': 'Portuguese',
    'jpn': 'Japanese',
    'kor': 'Korean',
    'ara': 'Arabic',
    'rus': 'Russian',
    'cym': 'Welsh'
  };
  // Extract target language code (first 3 chars before _for_)
  const targetLang = courseCode.split('_')[0];
  return langMap[targetLang] || targetLang;
}

/**
 * Initialize course seeds from canonical_seeds table.
 * Called automatically when a course has no seeds yet.
 *
 * Canonical seeds are in English. Depending on the course:
 * - X_for_eng (known=eng): known_text = canonical (instant), target_text = agent provides
 * - eng_for_X (target=eng): target_text = canonical (instant), known_text = agent provides
 * - X_for_Y (neither eng): both known_text and target_text = agent provides
 *
 * For instant cases, the text is pre-populated. For agent cases, left empty.
 */
async function initializeCourseSeeds(courseCode) {
  // Parse course code: target_for_known (e.g., zho_for_eng)
  const parts = courseCode.split('_for_');
  const targetLang = parts[0] || '';
  const knownLang = parts[1] || '';

  const knownIsEng = knownLang === 'eng';
  const targetIsEng = targetLang === 'eng';

  // Check if course already has seeds
  const { count: existingCount } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode);

  if (existingCount > 0) {
    console.log(`Course ${courseCode} already has ${existingCount} seeds`);
    return { initialized: false, count: existingCount };
  }

  // Get canonical seeds (English)
  const { data: canonical, error: canonicalError } = await supabase
    .from('canonical_seeds')
    .select('seed_number, source_text')
    .order('seed_number');

  if (canonicalError || !canonical || canonical.length === 0) {
    throw new Error('Failed to fetch canonical seeds: ' + (canonicalError?.message || 'no data'));
  }

  // Get target language name for {target} substitution
  const targetLangName = getLanguageName(courseCode);

  // Create course seeds based on which language is English
  const courseSeeds = canonical.map(c => {
    const canonicalText = c.source_text.replace(/\{target\}/g, targetLangName);
    return {
      course_code: courseCode,
      seed_number: c.seed_number,
      // known_text: instant if known=eng, otherwise agent provides
      known_text: knownIsEng ? canonicalText : '',
      // target_text: instant if target=eng, otherwise agent provides
      target_text: targetIsEng ? canonicalText : ''
    };
  });

  // Insert
  const { error: insertError } = await supabase
    .from('course_seeds')
    .insert(courseSeeds);

  if (insertError) {
    throw new Error('Failed to initialize course seeds: ' + insertError.message);
  }

  const mode = knownIsEng ? 'known=eng (instant known_text)' :
               targetIsEng ? 'target=eng (instant target_text)' :
               'neither eng (agent provides both)';
  console.log(`Initialized ${courseCode} with ${courseSeeds.length} seeds [${mode}]`);
  return { initialized: true, count: courseSeeds.length, mode, targetLangName };
}

/**
 * Normalize text for vocab comparison
 */
function normalizeText(text, chinese = false) {
  if (!text) return '';
  let normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
    .replace(/[¿¡.,;:!?'"«»""''。，！？、：；""'']/g, '')  // Punctuation
    .trim();
  if (!chinese) {
    normalized = normalized.replace(/\s+/g, ' ');
  }
  return normalized;
}

/**
 * Extract vocab units from text (characters for Chinese, words for European)
 */
function extractVocab(text, chinese = false) {
  const normalized = normalizeText(text, chinese);
  if (chinese) {
    return [...normalized].filter(c => c.trim() && !c.match(/\s/));
  } else {
    return normalized.split(/\s+/).filter(w => w);
  }
}

/**
 * Load existing vocabulary for a course from database
 */
async function loadCourseVocab(courseCode) {
  // Check cache first (handles TTL and LRU ordering)
  const cached = getCacheEntry(courseCode);
  if (cached) {
    return cached;
  }

  const chinese = isChinese(courseCode);
  const vocabSet = new Set();

  // Load all LEGOs in order
  const { data: legos } = await supabase
    .from('course_legos')
    .select('target_text, type, components')
    .eq('course_code', courseCode)
    .order('seed_number')
    .order('lego_index');

  for (const lego of legos || []) {
    // Add LEGO vocab
    extractVocab(lego.target_text, chinese).forEach(v => vocabSet.add(v));

    // Add M-type components
    if (lego.type === 'M' && lego.components) {
      for (const comp of lego.components) {
        extractVocab(comp.target, chinese).forEach(v => vocabSet.add(v));
      }
    }
  }

  // Store in cache (handles LRU eviction)
  setCacheEntry(courseCode, vocabSet);
  return vocabSet;
}

/**
 * Add new vocab to course cache (called after successful LEGO insert)
 */
function addToCourseVocab(courseCode, lego) {
  const chinese = isChinese(courseCode);

  // Get existing vocab set or create new one
  let vocabSet = getCacheEntry(courseCode);
  if (!vocabSet) {
    vocabSet = new Set();
  }

  // Add LEGO vocab
  extractVocab(lego.target, chinese).forEach(v => vocabSet.add(v));

  // Add M-type components
  if (lego.type === 'M' && lego.components) {
    for (const comp of lego.components) {
      extractVocab(comp.target, chinese).forEach(v => vocabSet.add(v));
    }
  }

  // Update cache (this refreshes the access time and handles LRU)
  setCacheEntry(courseCode, vocabSet);
}

/**
 * Check phrases for vocabulary violations
 * Returns array of violations: [{ phrase, unknown: [...] }]
 */
function checkVocabViolations(phrases, vocabSet, courseCode) {
  const chinese = isChinese(courseCode);
  const violations = [];

  for (const phrase of phrases) {
    const phraseVocab = extractVocab(phrase.target, chinese);
    const unknown = phraseVocab.filter(v => !vocabSet.has(v));
    if (unknown.length > 0) {
      violations.push({
        phrase: phrase.target,
        unknown: chinese ? unknown.join('') : unknown.join(', ')
      });
    }
  }

  return violations;
}

// =============================================================================
// M-LEGO BUILD-UP: Particles and Component Filtering
// =============================================================================

// Chinese particles that don't get their own build-up phrase (they appear in the
// full LEGO but don't need separate practice)
const PARTICLES = ['了', '着', '过', '的', '地', '得', '吗', '呢', '吧', '啊', '把', '被'];

/**
 * Check if a target text is a particle (should skip in build-up)
 */
function isParticle(target) {
  if (!target) return false;
  return PARTICLES.includes(target.trim());
}

/**
 * Get meaningful components for M-LEGO build-up.
 * Filters out:
 * 1. Particles (了, 着, etc.)
 * 2. Components where target === the LEGO's target_text itself
 */
function getMeaningfulComponents(components, legoTarget) {
  if (!components || !Array.isArray(components)) return [];
  return components.filter(c =>
    c && c.target && !isParticle(c.target) && c.target !== legoTarget
  );
}

/**
 * Generate build-up phrases for M-type LEGO.
 * Returns array of phrase objects ready for insertion.
 *
 * Build-up structure:
 * - P1..PN: Each meaningful component {known, target}
 * - P(N+1): LEGO itself {known, target}
 * - P(N+2)+: Agent's practice phrases
 */
function generateBuildupPhrases(lego, courseCode) {
  const { seed, idx, known, target, components } = lego;
  const meaningful = getMeaningfulComponents(components, target);

  const buildupPhrases = [];

  // Add component build-up phrases (P1, P2, ... PN)
  for (let i = 0; i < meaningful.length; i++) {
    const comp = meaningful[i];
    buildupPhrases.push({
      course_code: courseCode,
      seed_number: seed,
      lego_index: idx,
      position: i + 1,
      known_text: comp.known,
      target_text: comp.target,
      word_count: comp.target.length,
      lego_count: 1,
      metadata: { buildup: 'component', component_index: i },
      status: 'draft',
      version: 1
    });
  }

  // Add LEGO itself at P(N+1)
  const legoPosition = meaningful.length + 1;
  buildupPhrases.push({
    course_code: courseCode,
    seed_number: seed,
    lego_index: idx,
    position: legoPosition,
    known_text: known,
    target_text: target,
    word_count: target.length,
    lego_count: 1,
    metadata: { buildup: 'lego' },
    status: 'draft',
    version: 1
  });

  return { buildupPhrases, startPosition: legoPosition + 1 };
}

// =============================================================================
// LEGO CONFLICT DETECTION (ZUT Violations)
// =============================================================================

/**
 * Check for LEGO conflicts before insertion.
 *
 * Returns:
 * - { conflict: false } - No conflict, proceed with is_new: true
 * - { conflict: 'duplicate', existing } - Same known+target exists, use is_new: false
 * - { conflict: 'zut', existing, error } - Same known, different target = ZUT violation
 */
async function checkLegoConflict(courseCode, knownText, targetText) {
  // Find any existing LEGOs with the same known_text
  const { data: existing, error } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text')
    .eq('course_code', courseCode)
    .eq('known_text', knownText);

  if (error) {
    throw new Error(`Conflict check failed: ${error.message}`);
  }

  if (!existing || existing.length === 0) {
    return { conflict: false };
  }

  // Check if any have the same target (duplicate) or different target (ZUT)
  const sameTarget = existing.find(e => e.target_text === targetText);

  if (sameTarget) {
    // Duplicate - same known + same target
    return {
      conflict: 'duplicate',
      existing: sameTarget,
      legoId: `S${String(sameTarget.seed_number).padStart(4,'0')}L${String(sameTarget.lego_index).padStart(2,'0')}`
    };
  }

  // ZUT violation - same known + different target
  const existingTargets = existing.map(e => ({
    target: e.target_text,
    legoId: `S${String(e.seed_number).padStart(4,'0')}L${String(e.lego_index).padStart(2,'0')}`
  }));

  return {
    conflict: 'zut',
    existing: existingTargets,
    error: `ZUT violation: "${knownText}" already maps to "${existing[0].target_text}"`,
    suggestions: [
      `UPCHUNK: Add context to disambiguate (recommended)`,
      `  - "${knownText}" → "${existing[0].target_text}" (existing)`,
      `  - "[more specific phrase]" → "${targetText}" (new)`,
      `SYNONYM: Use different known text`,
      `  - Find a synonym or variant for "${knownText}"`
    ]
  };
}

// =============================================================================
// VALIDATION GATES - Enforce quality, prevent lazy agents
// =============================================================================
const MIN_PHRASES_PER_LEGO = 7;       // Each LEGO must have at least 7 phrases
const MAX_PHRASES_PER_LEGO = 13;      // Cap at 13 (diminishing returns)
const TARGET_PHRASES_PER_LEGO = 10;   // Ideal target
const MIN_BATCH_PHRASE_RATIO = 7.0;   // Batch must have ≥7.0 phrases per LEGO

// Phrase length tiers (by target character/word count)
// Balanced distribution: SHORT → MEDIUM → LONG progression
const PHRASE_TIERS = {
  SHORT: { min: 3, max: 5 },     // 3-5 chars: quick recall
  MEDIUM: { min: 6, max: 9 },    // 6-9 chars: building complexity
  LONG: { min: 10, max: 999 }    // 10+ chars: full sentences (spaced repetition)
};

// Minimum phrases per tier (ensures balanced progression)
const MIN_SHORT_PHRASES = 2;    // 2-3 short phrases
const MIN_MEDIUM_PHRASES = 2;   // 2-3 medium phrases
const MIN_LONG_PHRASES = 4;     // 4-5 long phrases (critical for retention)
const MIN_MIDDLE_RANGE = 2;     // At least 2 phrases in 5-10 char range (prevents short→long jump)

// LEGO balance thresholds (practice_score = phrase_count / seeds_since_introduction)
const BALANCE_UNDERUSED_THRESHOLD = 0.3;  // < 0.3 = needs more practice
const BALANCE_OVERUSED_THRESHOLD = 1.5;   // > 1.5 = used too much
const BALANCE_MAX_STRIKES = 3;            // Hard reject after 3 consecutive violations

// In-memory tracking for balance violations (resets on service restart)
const balanceViolations = {};  // { course_code: consecutive_strike_count }

// Allow bypass for testing (set SKIP_VALIDATION=true in request body)
const allowValidationBypass = (body) => body.SKIP_VALIDATION === true;

// =============================================================================
// TILING VALIDATION - Seed must be constructable from LEGO targets
// =============================================================================

/**
 * Check if seed target_text can be "tiled" (fully constructed) from LEGO targets.
 *
 * For Chinese: Characters in seed must be subset of characters in all LEGO targets
 * For European: Words in seed must be subset of words in all LEGO targets
 *
 * Returns: { valid: true } or { valid: false, untiled: [...], message }
 */
function checkTiling(seedTarget, legos, courseCode) {
  const chinese = isChinese(courseCode);

  // Extract all vocabulary units from LEGOs (including M-LEGO components)
  const availableVocab = new Set();

  for (const lego of legos) {
    // Add LEGO target vocab
    extractVocab(lego.target, chinese).forEach(v => availableVocab.add(v));

    // Add M-type component vocab
    if (lego.type === 'M' && lego.components) {
      for (const comp of lego.components) {
        extractVocab(comp.target, chinese).forEach(v => availableVocab.add(v));
      }
    }
  }

  // Check seed target can be built from available vocab
  const seedVocab = extractVocab(seedTarget, chinese);
  const untiled = seedVocab.filter(v => !availableVocab.has(v));

  if (untiled.length > 0) {
    return {
      valid: false,
      untiled: chinese ? untiled.join('') : untiled.join(', '),
      seed_vocab: seedVocab.length,
      lego_vocab: availableVocab.size,
      message: `Seed target contains vocabulary not covered by LEGOs: [${chinese ? untiled.join('') : untiled.join(', ')}]`
    };
  }

  return { valid: true };
}

// =============================================================================
// PHRASE COMPLEXITY VALIDATION - Ensure SHORT→MEDIUM→LONG→ETERNAL progression
// =============================================================================

/**
 * Categorize phrases by length tier and check for minimum ETERNAL count.
 *
 * Returns: { valid: true, tiers: {...} } or { valid: false, error, tiers: {...} }
 */
function checkPhraseComplexity(phrases, courseCode, seedNumber = 999) {
  const chinese = isChinese(courseCode);
  const unit = chinese ? 'characters' : 'words';

  const tiers = {
    SHORT: [],   // 3-5 chars
    MEDIUM: [],  // 6-9 chars
    LONG: []     // 10+ chars
  };

  // Track middle range (5-10) separately to ensure smooth progression
  const middleRange = [];  // 5-10 chars

  for (const phrase of phrases) {
    const length = chinese
      ? phrase.target.replace(/[\s\u3000。，！？、：；""'']/g, '').length
      : phrase.target.split(/\s+/).length;

    // Categorize into tiers
    if (length >= PHRASE_TIERS.LONG.min) {
      tiers.LONG.push({ target: phrase.target, length });
    } else if (length >= PHRASE_TIERS.MEDIUM.min) {
      tiers.MEDIUM.push({ target: phrase.target, length });
    } else if (length >= PHRASE_TIERS.SHORT.min) {
      tiers.SHORT.push({ target: phrase.target, length });
    }
    // Phrases < 3 chars are ignored (too short to be useful)

    // Also track middle range (5-10) for progression check
    if (length >= 5 && length <= 10) {
      middleRange.push({ target: phrase.target, length });
    }
  }

  const tierCounts = {
    SHORT: tiers.SHORT.length,
    MEDIUM: tiers.MEDIUM.length,
    LONG: tiers.LONG.length,
    middleRange: middleRange.length
  };

  // Graduated tier requirements based on seed number
  // Seeds 1-5: relaxed (skip tier checks)
  // Seeds 6-20: softened (1 each, 2 long, 1 middle)
  // Seeds 21+: hard (full requirements)
  let minShort, minMedium, minLong, minMiddle;

  if (seedNumber <= 5) {
    // Relaxed: no tier requirements for first 5 seeds
    return { valid: true, tiers: tierCounts, mode: 'relaxed (seed 1-5)' };
  } else if (seedNumber <= 20) {
    // Softened: reduced requirements
    minShort = 1;
    minMedium = 1;
    minLong = 2;
    minMiddle = 1;
  } else {
    // Hard: full requirements from seed 21+
    minShort = MIN_SHORT_PHRASES;
    minMedium = MIN_MEDIUM_PHRASES;
    minLong = MIN_LONG_PHRASES;
    minMiddle = MIN_MIDDLE_RANGE;
  }

  // Check tier minimums
  const errors = [];

  if (tiers.SHORT.length < minShort) {
    errors.push(`SHORT: need ${minShort}+, got ${tiers.SHORT.length} (3-5 ${unit})`);
  }
  if (tiers.MEDIUM.length < minMedium) {
    errors.push(`MEDIUM: need ${minMedium}+, got ${tiers.MEDIUM.length} (6-9 ${unit})`);
  }
  if (tiers.LONG.length < minLong) {
    errors.push(`LONG: need ${minLong}+, got ${tiers.LONG.length} (10+ ${unit})`);
  }
  if (middleRange.length < minMiddle) {
    errors.push(`MIDDLE: need ${minMiddle}+, got ${middleRange.length} (5-10 ${unit})`);
  }

  if (errors.length > 0) {
    const mode = seedNumber <= 20 ? 'softened (seed 6-20)' : 'hard (seed 21+)';
    return {
      valid: false,
      tiers: tierCounts,
      mode,
      error: `Phrase balance failed: ${errors.join('; ')}`,
      hint: seedNumber <= 20
        ? `Softened mode: 1+ SHORT, 1+ MEDIUM, 2+ LONG, 1+ middle range`
        : `Hard mode: 2+ SHORT (3-5), 2+ MEDIUM (6-9), 4+ LONG (10+), 2+ in 5-10 range`
    };
  }

  return { valid: true, tiers: tierCounts, mode: seedNumber <= 20 ? 'softened' : 'hard' };
}

// =============================================================================
// LEGO BALANCE VALIDATION - Ensure vocabulary gets balanced practice
// =============================================================================

/**
 * Calculate practice scores for all LEGOs in a course.
 * practice_score = phrase_count / seeds_since_introduction
 *
 * Returns: { legoScores: Map, underused: [], overused: [], avgScore }
 */
async function calculateLegoBalanceScores(courseCode, currentSeedNumber) {
  // Get all LEGOs with their introduction seed
  const { data: legos, error: legoError } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, is_new')
    .eq('course_code', courseCode)
    .eq('is_new', true);  // Only track new (non-duplicate) LEGOs

  if (legoError) throw new Error(`Balance check failed: ${legoError.message}`);
  if (!legos || legos.length === 0) return { legoScores: new Map(), underused: [], overused: [], avgScore: 0 };

  // Get phrase counts per LEGO
  const { data: phraseCounts, error: phraseError } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index')
    .eq('course_code', courseCode);

  if (phraseError) throw new Error(`Balance check failed: ${phraseError.message}`);

  // Count phrases per LEGO
  const phrasesByLego = {};
  (phraseCounts || []).forEach(p => {
    const key = `${p.seed_number}-${p.lego_index}`;
    phrasesByLego[key] = (phrasesByLego[key] || 0) + 1;
  });

  // Calculate practice score for each LEGO
  const legoScores = new Map();
  const underused = [];
  const overused = [];
  let totalScore = 0;

  for (const lego of legos) {
    const key = `${lego.seed_number}-${lego.lego_index}`;
    const phraseCount = phrasesByLego[key] || 0;
    const seedsSince = Math.max(1, currentSeedNumber - lego.seed_number + 1);
    const score = phraseCount / seedsSince;

    legoScores.set(lego.target_text, {
      known: lego.known_text,
      target: lego.target_text,
      phraseCount,
      seedsSince,
      score: Math.round(score * 100) / 100
    });

    totalScore += score;

    if (score < BALANCE_UNDERUSED_THRESHOLD) {
      underused.push({ known: lego.known_text, target: lego.target_text, score: Math.round(score * 100) / 100 });
    } else if (score > BALANCE_OVERUSED_THRESHOLD) {
      overused.push({ known: lego.known_text, target: lego.target_text, score: Math.round(score * 100) / 100 });
    }
  }

  const avgScore = legos.length > 0 ? totalScore / legos.length : 0;

  return {
    legoScores,
    underused: underused.sort((a, b) => a.score - b.score).slice(0, 10),  // Top 10 most underused
    overused: overused.sort((a, b) => b.score - a.score).slice(0, 10),    // Top 10 most overused
    avgScore: Math.round(avgScore * 100) / 100
  };
}

/**
 * Check if new phrases have balanced vocabulary usage.
 * Checks if phrases over-rely on overused LEGOs without using underused ones.
 *
 * Returns: { balanced: true } or { balanced: false, overusedInPhrases, underusedAvailable, ... }
 */
function checkPhraseBalance(phrases, balanceData, courseCode) {
  const { legoScores, underused, overused } = balanceData;

  if (legoScores.size === 0 || underused.length === 0) {
    // Not enough data to check balance yet, or no underused LEGOs
    return { balanced: true, reason: 'insufficient_data' };
  }

  // Extract vocabulary from new phrases (Chinese = characters, European = words)
  const chinese = isChinese(courseCode);
  const overusedTargets = new Set(overused.map(l => l.target));
  const underusedTargets = new Set(underused.map(l => l.target));

  let overusedCount = 0;
  let underusedCount = 0;
  let totalVocabRefs = 0;

  for (const phrase of phrases) {
    const target = phrase.target;

    // Check each known LEGO target against this phrase
    for (const [legoTarget, data] of legoScores) {
      if (target.includes(legoTarget)) {
        totalVocabRefs++;
        if (overusedTargets.has(legoTarget)) overusedCount++;
        if (underusedTargets.has(legoTarget)) underusedCount++;
      }
    }
  }

  // Balance check: fail if >50% overused refs AND 0 underused refs
  const overusedRatio = totalVocabRefs > 0 ? overusedCount / totalVocabRefs : 0;
  const hasUnderusedUsage = underusedCount > 0;

  if (overusedRatio > 0.5 && !hasUnderusedUsage && underused.length > 0) {
    return {
      balanced: false,
      overusedRatio: Math.round(overusedRatio * 100),
      overusedInPhrases: overused.filter(l =>
        phrases.some(p => p.target.includes(l.target))
      ).slice(0, 5),
      underusedAvailable: underused.slice(0, 5),
      message: `${Math.round(overusedRatio * 100)}% of vocabulary refs are overused LEGOs, with 0 underused LEGOs included`
    };
  }

  return { balanced: true };
}

// =============================================================================
// METHODOLOGY COMMAND HINTS - Guide agents to methodology on rejection
// =============================================================================

const METHODOLOGY_HINTS = {
  tiling: `
📚 See /ssi-decompose-seed for how to break seeds into LEGOs:
   - Every word/character in seed must appear in a LEGO target
   - Order LEGOs SHORT→LONG (by target length)
   - Use M-LEGOs for multi-word chunks`,

  phrases: `
📚 See /ssi-build-phrases for phrase tier requirements:
   - SHORT (3-5 chars): quick recall
   - MEDIUM (6-9 chars): building complexity
   - LONG (10+ chars): full sentences for retention
   - Must have 2+ phrases in 5-10 char range (smooth progression)
   Graduated: relaxed (seeds 1-5), softened (6-20), hard (21+)`,

  vocab: `
📚 See /ssi-learner-pattern for how vocabulary builds:
   - Phrases can only use vocabulary from prior LEGOs
   - LEGO N can use: (all prior seeds) + (LEGOs 1..N of current seed)`,

  zut: `
📚 See /ssi-decompose-seed for handling ZUT conflicts:
   - Same known text cannot map to different targets
   - UPCHUNK: Add context to disambiguate
   - Or use a synonym for the known text`,

  components: `
📚 See /ssi-decompose-seed for M-LEGO component requirements:
   - ALL M-type LEGOs MUST have component breakdown
   - Components teach the building blocks BEFORE the assembled phrase
   - Long M-LEGOs (4+ chars) need 2+ meaningful components
   - Components enable the learner to construct the M-LEGO mentally`,

  balance: `
📚 See /ssi-phrase-variety for balance requirements:
   - Prioritize recent, underused LEGOs in new phrases
   - Avoid over-relying on common vocabulary (>1.5x avg usage)
   - Include underused LEGOs (<0.3x avg usage) in your phrases
   - Each LEGO needs balanced practice exposure`
};

/**
 * POST /api/lego
 *
 * Body:
 * {
 *   "course_code": "zho_for_eng",
 *   "seed": 1,
 *   "idx": 1,
 *   "type": "M",
 *   "known": "I want to",
 *   "target": "我想",
 *   "components": [{"known": "I", "target": "我"}, {"known": "want to", "target": "想"}],
 *   "phrases": [
 *     {"known": "I want to", "target": "我想"},
 *     {"known": "I want to speak", "target": "我想说"},
 *     {"known": "I want to speak Chinese", "target": "我想说中文"}
 *   ]
 * }
 */
app.post('/api/lego', async (req, res) => {
  try {
    const { course_code, seed, idx, type, known, target, components, phrases } = req.body;

    if (!course_code || !seed || !idx || !known || !target) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // VALIDATION GATE: Minimum phrases per LEGO (position-aware)
    // Early LEGOs have fewer combinations available - be lenient
    const phraseCount = phrases?.length || 0;
    const legoId = `S${String(seed).padStart(4,'0')}L${String(idx).padStart(2,'0')}`;

    // Calculate global position (approximate) - seed 1 LEGOs are first ~5, etc.
    const globalPosition = (seed - 1) * 3 + idx; // Rough estimate

    // Graduated minimum: early LEGOs can have fewer phrases
    let minRequired = MIN_PHRASES_PER_LEGO;
    if (globalPosition === 1) minRequired = 0;      // Very first LEGO - nothing to combine with!
    else if (globalPosition <= 3) minRequired = 1;  // First 3 LEGOs
    else if (globalPosition <= 6) minRequired = 2;  // LEGOs 4-6
    else if (globalPosition <= 10) minRequired = 3; // LEGOs 7-10

    if (phraseCount < minRequired && !allowValidationBypass(req.body)) {
      console.log(`✗ ${legoId}: REJECTED - Only ${phraseCount} phrases (need ${minRequired}+ at position ~${globalPosition})`);
      return res.status(400).json({
        error: 'Insufficient phrases',
        lego_id: legoId,
        got: phraseCount,
        required: minRequired,
        global_position: globalPosition,
        hint: `LEGO at position ~${globalPosition} needs at least ${minRequired} phrases.`
      });
    }

    // Warn if over max (but don't reject - just truncate later if needed)
    if (phraseCount > MAX_PHRASES_PER_LEGO) {
      console.log(`⚠ ${legoId}: ${phraseCount} phrases exceeds max ${MAX_PHRASES_PER_LEGO} (will use first ${MAX_PHRASES_PER_LEGO})`);
    }

    // CONFLICT DETECTION: Check for duplicate or ZUT violation
    let isNew = true;
    let skipBaskets = false;

    if (!allowValidationBypass(req.body)) {
      const conflictResult = await checkLegoConflict(course_code, known, target);

      if (conflictResult.conflict === 'zut') {
        // ZUT violation - same known, different target = REJECT
        console.log(`✗ ${legoId}: REJECTED - ${conflictResult.error}`);
        return res.status(400).json({
          error: 'ZUT violation: ambiguous prompt',
          lego_id: legoId,
          known_text: known,
          new_target: target,
          existing: conflictResult.existing,
          suggestions: conflictResult.suggestions,
          hint: 'Same known text cannot map to different targets. Upchunk with context or use synonym.'
        });
      }

      if (conflictResult.conflict === 'duplicate') {
        // Duplicate - same known + same target = mark as re-introduction, skip baskets
        isNew = false;
        skipBaskets = true;
        console.log(`  ${legoId}: Duplicate of ${conflictResult.legoId} - marking is_new=false, skipping baskets`);
      }
    }

    // VOCABULARY VALIDATION: Load course vocab and check phrases
    const vocabSet = await loadCourseVocab(course_code);

    // Add THIS LEGO's vocab first (so its phrases can use it)
    const newLego = { target, type, components };
    addToCourseVocab(course_code, newLego);

    // Check phrases for vocab violations (only if not skipping baskets)
    if (phrases && phrases.length > 0 && !skipBaskets && !allowValidationBypass(req.body)) {
      const violations = checkVocabViolations(phrases, vocabSet, course_code);
      if (violations.length > 0) {
        // Remove the vocab we just added since we're rejecting
        courseVocabCache.delete(course_code);  // Force reload on next request

        console.log(`✗ ${legoId}: REJECTED - Vocabulary violations:`);
        violations.forEach(v => console.log(`   "${v.phrase}" uses unknown: [${v.unknown}]`));

        return res.status(400).json({
          error: 'Vocabulary violation',
          lego_id: legoId,
          violations: violations.slice(0, 5),  // Show first 5
          total_violations: violations.length,
          vocab_size: vocabSet.size,
          hint: `Phrases must only use vocabulary already introduced. Unknown: ${violations[0].unknown}`
        });
      }
    }

    // Insert LEGO
    const { error: legoError } = await supabase
      .from('course_legos')
      .upsert({
        course_code,
        seed_number: seed,
        lego_index: idx,
        type: type || 'A',
        is_new: isNew,
        known_text: known,
        target_text: target,
        components: components || null,
        status: 'draft',
        version: 1
      }, { onConflict: 'course_code,seed_number,lego_index' });

    if (legoError) throw legoError;

    // Insert phrases (with M-LEGO build-up auto-generation)
    // Skip if this is a duplicate LEGO (already has baskets from first introduction)
    let allPhraseRows = [];
    let buildupCount = 0;
    let practiceStartPosition = 1;
    const practiceCount = phrases?.length || 0;

    if (!skipBaskets) {
      // M-TYPE BUILD-UP: Auto-generate build-up phrases for M-type LEGOs
      // NEVER trust agent to provide build-up - always generate it ourselves
      if (type === 'M' && components && components.length > 0) {
        const { buildupPhrases, startPosition } = generateBuildupPhrases(
          { seed, idx, known, target, components },
          course_code
        );
        allPhraseRows = [...buildupPhrases];
        buildupCount = buildupPhrases.length;
        practiceStartPosition = startPosition;

        console.log(`  M-LEGO build-up: ${buildupCount} phrases (${buildupPhrases.length - 1} components + LEGO)`);
      }

      // Add agent's practice phrases after build-up
      if (phrases && phrases.length > 0) {
        // DEDUPLICATION: Filter out agent phrases that duplicate build-up phrases
        const buildupTargets = new Set(allPhraseRows.map(p => p.target_text));
        const dedupedPhrases = phrases.filter(p => !buildupTargets.has(p.target));
        const dedupedCount = phrases.length - dedupedPhrases.length;
        if (dedupedCount > 0) {
          console.log(`    Deduped ${dedupedCount} phrases that duplicated build-up`);
        }

        // Sort by target syllable count (Chinese characters = syllables roughly)
        const sorted = [...dedupedPhrases].sort((a, b) => a.target.length - b.target.length);

        const practicePhrases = sorted.map((p, i) => ({
          course_code,
          seed_number: seed,
          lego_index: idx,
          position: practiceStartPosition + i,  // Start after build-up
          known_text: p.known,
          target_text: p.target,
          word_count: p.target.length,
          lego_count: (p.known.match(/\s+/g) || []).length + 1,
          metadata: {},
          status: 'draft',
          version: 1
        }));

        allPhraseRows = [...allPhraseRows, ...practicePhrases];
      }

      // Insert all phrases (build-up + practice)
      if (allPhraseRows.length > 0) {
        const { error: phraseError } = await supabase
          .from('course_practice_phrases')
          .upsert(allPhraseRows, { onConflict: 'course_code,seed_number,lego_index,position' });

        if (phraseError) throw phraseError;
      }
    }

    const totalPhrases = allPhraseRows.length;
    const buildupInfo = buildupCount > 0 ? ` [${buildupCount} buildup + ${practiceCount} practice]` : '';
    const dupInfo = skipBaskets ? ' (duplicate, no baskets)' : '';
    console.log(`✓ S${String(seed).padStart(4,'0')}L${String(idx).padStart(2,'0')}: ${known} → ${target} (${totalPhrases} phrases${buildupInfo})${dupInfo}`);

    res.json({
      ok: true,
      lego_id: `S${String(seed).padStart(4,'0')}L${String(idx).padStart(2,'0')}`,
      is_new: isNew,
      skipped_baskets: skipBaskets,
      phrases: totalPhrases,
      buildup_phrases: buildupCount,
      practice_phrases: practiceCount
    });

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/batch - Insert multiple LEGOs at once
 */
app.post('/api/batch', async (req, res) => {
  try {
    const { course_code, legos } = req.body;

    // VALIDATION GATE: Check phrase ratio before processing
    let totalPhrases = 0;
    const underperformers = [];

    for (const lego of legos) {
      const phraseCount = lego.phrases?.length || 0;
      totalPhrases += phraseCount;

      if (phraseCount < MIN_PHRASES_PER_LEGO) {
        underperformers.push({
          lego_id: `S${String(lego.seed).padStart(4,'0')}L${String(lego.idx).padStart(2,'0')}`,
          known: lego.known,
          phrases: phraseCount
        });
      }
    }

    const ratio = legos.length > 0 ? totalPhrases / legos.length : 0;

    // Reject if ratio is too low (unless bypassed)
    if (ratio < MIN_BATCH_PHRASE_RATIO && !allowValidationBypass(req.body)) {
      console.log(`✗ Batch REJECTED - Ratio ${ratio.toFixed(1)} < ${MIN_BATCH_PHRASE_RATIO} required`);
      return res.status(400).json({
        error: 'Insufficient phrase coverage',
        got_ratio: ratio.toFixed(1),
        required_ratio: MIN_BATCH_PHRASE_RATIO,
        legos: legos.length,
        total_phrases: totalPhrases,
        underperformers: underperformers.slice(0, 10), // Show first 10 offenders
        hint: `Batch rejected. Each LEGO should have ~10 practice phrases combining it with previous LEGOs. Current ratio: ${ratio.toFixed(1)}, need: ${MIN_BATCH_PHRASE_RATIO}+`
      });
    }

    // Warn about individual underperformers (but don't reject if batch ratio is OK)
    if (underperformers.length > 0) {
      console.log(`⚠ Batch has ${underperformers.length} LEGOs with <${MIN_PHRASES_PER_LEGO} phrases (ratio ${ratio.toFixed(1)} OK)`);
    }

    // Reset for actual insertion count
    totalPhrases = 0;
    let totalBuildupPhrases = 0;
    let totalPracticePhrases = 0;

    let zutViolations = [];
    let duplicates = 0;

    for (const lego of legos) {
      const legoId = `S${String(lego.seed).padStart(4,'0')}L${String(lego.idx).padStart(2,'0')}`;

      // CONFLICT DETECTION: Check for duplicate or ZUT violation
      let isNew = true;
      let skipBaskets = false;

      if (!allowValidationBypass(req.body)) {
        const conflictResult = await checkLegoConflict(course_code, lego.known, lego.target);

        if (conflictResult.conflict === 'zut') {
          // Collect ZUT violations but continue processing (report all at end)
          zutViolations.push({
            lego_id: legoId,
            known: lego.known,
            new_target: lego.target,
            existing: conflictResult.existing
          });
          continue;  // Skip this LEGO entirely
        }

        if (conflictResult.conflict === 'duplicate') {
          isNew = false;
          skipBaskets = true;
          duplicates++;
          console.log(`  ${legoId}: Duplicate of ${conflictResult.legoId} - is_new=false, skipping baskets`);
        }
      }

      // Insert LEGO
      const { error: legoError } = await supabase
        .from('course_legos')
        .upsert({
          course_code,
          seed_number: lego.seed,
          lego_index: lego.idx,
          type: lego.type || 'A',
          is_new: isNew,
          known_text: lego.known,
          target_text: lego.target,
          components: lego.components || null,
          status: 'draft',
          version: 1
        }, { onConflict: 'course_code,seed_number,lego_index' });

      if (legoError) throw legoError;

      // Insert phrases (with M-LEGO build-up auto-generation)
      // Skip if duplicate LEGO
      let allPhraseRows = [];
      let buildupCount = 0;
      let practiceStartPosition = 1;

      if (!skipBaskets) {
        // M-TYPE BUILD-UP: Auto-generate build-up phrases for M-type LEGOs
        if (lego.type === 'M' && lego.components && lego.components.length > 0) {
          const { buildupPhrases, startPosition } = generateBuildupPhrases(
            { seed: lego.seed, idx: lego.idx, known: lego.known, target: lego.target, components: lego.components },
            course_code
          );
          allPhraseRows = [...buildupPhrases];
          buildupCount = buildupPhrases.length;
          practiceStartPosition = startPosition;
          totalBuildupPhrases += buildupCount;
        }

        // Add agent's practice phrases after build-up
        if (lego.phrases && lego.phrases.length > 0) {
          const sorted = [...lego.phrases].sort((a, b) => a.target.length - b.target.length);

          const practicePhrases = sorted.map((p, i) => ({
            course_code,
            seed_number: lego.seed,
            lego_index: lego.idx,
            position: practiceStartPosition + i,
            known_text: p.known,
            target_text: p.target,
            word_count: p.target.length,
            lego_count: (p.known.match(/\s+/g) || []).length + 1,
            metadata: {},
            status: 'draft',
            version: 1
          }));

          allPhraseRows = [...allPhraseRows, ...practicePhrases];
          totalPracticePhrases += lego.phrases.length;
        }

        // Insert all phrases (build-up + practice)
        if (allPhraseRows.length > 0) {
          const { error: phraseError } = await supabase
            .from('course_practice_phrases')
            .upsert(allPhraseRows, { onConflict: 'course_code,seed_number,lego_index,position' });

          if (phraseError) throw phraseError;
          totalPhrases += allPhraseRows.length;
        }
      }

      const buildupInfo = buildupCount > 0 ? ` [${buildupCount} buildup]` : '';
      const dupInfo = skipBaskets ? ' (dup)' : '';
      console.log(`✓ ${legoId}: ${lego.known} → ${lego.target}${buildupInfo}${dupInfo}`);
    }

    // If any ZUT violations, report them
    if (zutViolations.length > 0) {
      console.log(`✗ Batch had ${zutViolations.length} ZUT violations (skipped)`);
      return res.status(400).json({
        error: 'ZUT violations detected',
        zut_violations: zutViolations,
        processed_before_error: totalPhrases,
        hint: 'Some LEGOs have same known text mapping to different targets. Upchunk or use synonyms.'
      });
    }

    res.json({
      ok: true,
      legos: legos.length,
      duplicates_skipped: duplicates,
      phrases: totalPhrases,
      buildup_phrases: totalBuildupPhrases,
      practice_phrases: totalPracticePhrases
    });

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/seed/complete - Submit a complete seed with translation and all LEGOs
 *
 * THE GOLDEN PATH: Agent submits everything for one seed atomically.
 * Validates everything upfront, inserts all or nothing.
 *
 * IMPORTANT: known_text comes from the CANONICAL SEEDS already in the database.
 * Agent only provides the target language translation and LEGOs.
 *
 * Body:
 * {
 *   "course_code": "zho_for_eng",
 *   "seed_number": 42,
 *   "target_text": "我想学中文",
 *   "legos": [
 *     {
 *       "idx": 1,
 *       "type": "A",
 *       "known": "I",
 *       "target": "我",
 *       "phrases": [{"known": "I", "target": "我"}, ...]
 *     },
 *     {
 *       "idx": 2,
 *       "type": "M",
 *       "known": "want to learn",
 *       "target": "想学",
 *       "components": [{"known": "want", "target": "想"}, {"known": "learn", "target": "学"}],
 *       "phrases": [...]
 *     }
 *   ]
 * }
 */
app.post('/api/seed/complete', async (req, res) => {
  try {
    const { course_code, seed_number, known_text: agent_known_text, target_text: agent_target_text, legos, SKIP_VALIDATION } = req.body;
    const seedId = `S${String(seed_number).padStart(4, '0')}`;

    // Parse course to determine which texts agent must provide
    const courseParts = course_code?.split('_for_') || [];
    const targetLang = courseParts[0] || '';
    const knownLang = courseParts[1] || '';
    const knownIsEng = knownLang === 'eng';
    const targetIsEng = targetLang === 'eng';

    // Basic validation - what's required depends on course type
    if (!course_code || !seed_number || !legos) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['course_code', 'seed_number', 'legos'],
        note: 'known_text/target_text requirements depend on course: X_for_eng needs target_text, eng_for_X needs known_text, X_for_Y needs both'
      });
    }

    // Validate agent provided required translations
    if (!knownIsEng && !agent_known_text) {
      return res.status(400).json({
        error: 'known_text required',
        seed: seedId,
        course_code,
        hint: `For ${course_code} (known=${knownLang}), agent must provide known_text translation from English canonical.`
      });
    }
    if (!targetIsEng && !agent_target_text) {
      return res.status(400).json({
        error: 'target_text required',
        seed: seedId,
        course_code,
        hint: `For ${course_code} (target=${targetLang}), agent must provide target_text translation.`
      });
    }

    if (!Array.isArray(legos) || legos.length === 0) {
      return res.status(400).json({
        error: 'legos must be a non-empty array',
        seed: seedId
      });
    }

    // CANONICAL SEED LOOKUP: Get known_text from pre-populated database seeds
    // If course has no seeds yet, auto-initialize from canonical_seeds table
    let { data: canonicalSeed, error: seedLookupError } = await supabase
      .from('course_seeds')
      .select('known_text, target_text')
      .eq('course_code', course_code)
      .eq('seed_number', seed_number)
      .single();

    if (seedLookupError || !canonicalSeed) {
      // Try to initialize course seeds from canonical_seeds
      console.log(`Seed ${seedId} not found for ${course_code}, attempting auto-initialization...`);
      try {
        const initResult = await initializeCourseSeeds(course_code);
        if (initResult.initialized) {
          console.log(`Auto-initialized ${course_code}: ${initResult.count} seeds (${initResult.language})`);
          // Retry the lookup
          const retry = await supabase
            .from('course_seeds')
            .select('known_text, target_text')
            .eq('course_code', course_code)
            .eq('seed_number', seed_number)
            .single();
          canonicalSeed = retry.data;
          seedLookupError = retry.error;
        }
      } catch (initError) {
        console.error('Auto-initialization failed:', initError.message);
      }
    }

    if (seedLookupError || !canonicalSeed) {
      return res.status(400).json({
        error: 'Canonical seed not found',
        seed: seedId,
        course_code,
        hint: 'Seeds must be pre-populated in the database. Check /api/seeds/:courseCode for available seeds.'
      });
    }

    // Check if seed already built (both known and target populated)
    const seedAlreadyBuilt = canonicalSeed.known_text && canonicalSeed.known_text.length > 0 &&
                             canonicalSeed.target_text && canonicalSeed.target_text.length > 0;
    if (seedAlreadyBuilt) {
      return res.status(400).json({
        error: 'Seed already has translation',
        seed: seedId,
        existing_known: canonicalSeed.known_text,
        existing_target: canonicalSeed.target_text,
        hint: 'This seed has already been built. Use a different seed number.'
      });
    }

    // CANONICAL VALIDATION: If agent provides known_text, it MUST match canonical
    // This catches hallucinated seeds after context compaction
    if (agent_known_text && canonicalSeed.known_text) {
      // Normalize both strings for comparison (trim, collapse whitespace)
      const normalize = (s) => s.trim().replace(/\s+/g, ' ').toLowerCase();
      const agentNorm = normalize(agent_known_text);
      const canonicalNorm = normalize(canonicalSeed.known_text);

      if (agentNorm !== canonicalNorm) {
        return res.status(400).json({
          error: 'CANONICAL MISMATCH: Your known_text does not match the canonical seed',
          seed: seedId,
          you_sent: agent_known_text,
          canonical: canonicalSeed.known_text,
          action_required: `GET /api/resume/${course_code} to get the correct next seed and context`,
          hint: 'After context compaction, ALWAYS call /api/resume first. Do NOT guess seed text.'
        });
      }
    }

    // Determine final known_text and target_text
    // Use canonical if pre-populated (English case), otherwise use agent-provided
    const known_text = canonicalSeed.known_text || agent_known_text;
    const target_text = canonicalSeed.target_text || agent_target_text;

    const knownSource = canonicalSeed.known_text ? 'canonical (eng)' : 'agent';
    const targetSource = canonicalSeed.target_text ? 'canonical (eng)' : 'agent';

    console.log(`\n${'='.repeat(60)}`);
    console.log(`SEED COMPLETE: ${seedId}`);
    console.log(`  known:  "${known_text}" [${knownSource}]`);
    console.log(`  target: "${target_text}" [${targetSource}]`);
    console.log(`${'='.repeat(60)}`);

    // =========================================================================
    // VALIDATION PHASE (all checks before any inserts)
    // =========================================================================

    const errors = [];
    const warnings = [];

    // 1. ZUT VALIDATION: Check for conflicts with existing LEGOs
    const zutViolations = [];
    const duplicateLegos = [];

    for (const lego of legos) {
      const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;

      if (!SKIP_VALIDATION) {
        const conflictResult = await checkLegoConflict(course_code, lego.known, lego.target);

        if (conflictResult.conflict === 'zut') {
          zutViolations.push({
            lego_id: legoId,
            known: lego.known,
            new_target: lego.target,
            existing: conflictResult.existing,
            suggestions: conflictResult.suggestions
          });
        } else if (conflictResult.conflict === 'duplicate') {
          duplicateLegos.push({
            lego_id: legoId,
            known: lego.known,
            target: lego.target,
            original: conflictResult.legoId
          });
          console.log(`  ${legoId}: Duplicate of ${conflictResult.legoId} (will skip baskets)`);
        }
      }
    }

    if (zutViolations.length > 0) {
      errors.push({
        type: 'zut',
        message: `${zutViolations.length} ZUT violation(s) - same known text maps to different targets`,
        violations: zutViolations,
        methodology: METHODOLOGY_HINTS.zut
      });
    }

    // 2. TILING VALIDATION: Seed target must be constructable from LEGO targets
    if (!SKIP_VALIDATION) {
      const tilingResult = checkTiling(target_text, legos, course_code);
      if (!tilingResult.valid) {
        errors.push({
          type: 'tiling',
          message: tilingResult.message,
          untiled: tilingResult.untiled,
          seed_target: target_text,
          legos_provided: legos.map(l => ({ idx: l.idx, target: l.target })),
          methodology: METHODOLOGY_HINTS.tiling
        });
        console.log(`✗ ${seedId}: TILING FAILED - untiled: [${tilingResult.untiled}]`);
      } else {
        console.log(`✓ ${seedId}: Tiling valid (${tilingResult.seed_vocab || 'ok'} → ${legos.length} LEGOs)`);
      }
    }

    // 3. VOCAB VALIDATION: For each LEGO, add its vocab THEN check phrases
    // Rule: LEGO N can use vocab from seeds 1..S-1 plus LEGOs 1..N of current seed (including itself)
    const vocabSet = await loadCourseVocab(course_code);

    const vocabViolations = [];
    for (const lego of legos) {
      const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
      const isDuplicate = duplicateLegos.some(d => d.lego_id === legoId);

      // Add THIS LEGO's vocab first (so its phrases can use it)
      addToCourseVocab(course_code, { target: lego.target, type: lego.type, components: lego.components });

      // THEN check phrases (can use this LEGO + all prior vocab)
      if (!isDuplicate && lego.phrases && lego.phrases.length > 0) {
        const violations = checkVocabViolations(lego.phrases, vocabSet, course_code);
        if (violations.length > 0 && !SKIP_VALIDATION) {
          vocabViolations.push({
            lego_id: legoId,
            violations: violations.slice(0, 3)  // First 3
          });
        }
      }
    }

    if (vocabViolations.length > 0) {
      // Clear vocab cache since we're rejecting
      courseVocabCache.delete(course_code);
      errors.push({
        type: 'vocab',
        message: 'Vocabulary violations - phrases use unknown vocabulary',
        legos_with_violations: vocabViolations,
        methodology: METHODOLOGY_HINTS.vocab
      });
    }

    // 4. PHRASE COUNT VALIDATION
    const globalPosition = (seed_number - 1) * 3;  // Rough estimate
    for (const lego of legos) {
      const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
      const isDuplicate = duplicateLegos.some(d => d.lego_id === legoId);
      if (isDuplicate) continue;

      const phraseCount = lego.phrases?.length || 0;
      const legoPosition = globalPosition + lego.idx;

      let minRequired = MIN_PHRASES_PER_LEGO;
      if (legoPosition === 1) minRequired = 0;        // Very first LEGO - nothing to combine with!
      else if (legoPosition <= 3) minRequired = 1;
      else if (legoPosition <= 6) minRequired = 2;
      else if (legoPosition <= 10) minRequired = 3;

      if (phraseCount < minRequired && !SKIP_VALIDATION) {
        errors.push({
          type: 'phrases',
          message: `${legoId}: Only ${phraseCount} phrases (need ${minRequired}+ at position ~${legoPosition})`,
          lego_id: legoId,
          methodology: METHODOLOGY_HINTS.phrases
        });
      }
    }

    // 5. PHRASE COMPLEXITY VALIDATION (tier balance for progression)
    // Graduated: relaxed (seeds 1-5), softened (6-20), hard (21+)
    if (!SKIP_VALIDATION) {
      for (const lego of legos) {
        const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
        const isDuplicate = duplicateLegos.some(d => d.lego_id === legoId);
        if (isDuplicate) continue;

        if (lego.phrases && lego.phrases.length > 0) {
          const complexityResult = checkPhraseComplexity(lego.phrases, course_code, seed_number);
          if (!complexityResult.valid) {
            errors.push({
              type: 'phrase_complexity',
              message: complexityResult.error,
              lego_id: legoId,
              tiers: complexityResult.tiers,
              mode: complexityResult.mode,
              methodology: METHODOLOGY_HINTS.phrases
            });
            console.log(`✗ ${legoId}: PHRASE TIERS (${complexityResult.mode}) - ${complexityResult.error}`);
          }
        }
      }
    }

    // 6. M-LEGO COMPONENT ADEQUACY VALIDATION
    // All M-type LEGOs MUST have component breakdown - this is fundamental to the methodology
    if (!SKIP_VALIDATION) {
      for (const lego of legos) {
        if (lego.type !== 'M') continue;

        const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
        const targetLen = lego.target.length;
        const meaningfulComps = getMeaningfulComponents(lego.components, lego.target);
        const compCount = meaningfulComps.length;

        // ALL M-LEGOs must have at least 1 component
        if (compCount === 0) {
          errors.push({
            type: 'components',
            message: `${legoId}: M-LEGO "${lego.known}" has NO components - M-LEGOs MUST have component breakdown`,
            lego_id: legoId,
            target: lego.target,
            target_length: targetLen,
            components_provided: lego.components?.length || 0,
            meaningful_components: compCount,
            methodology: METHODOLOGY_HINTS.components
          });
          console.log(`✗ ${legoId}: M-LEGO MISSING COMPONENTS - "${lego.known}" → "${lego.target}"`);
        }
        // Long M-LEGOs (4+ chars) need 2+ meaningful components
        else if (targetLen >= 4 && compCount < 2) {
          errors.push({
            type: 'components',
            message: `${legoId}: Long M-LEGO "${lego.known}" (${targetLen} chars) needs 2+ components, got ${compCount}`,
            lego_id: legoId,
            target: lego.target,
            target_length: targetLen,
            components_provided: lego.components?.length || 0,
            meaningful_components: compCount,
            methodology: METHODOLOGY_HINTS.components
          });
          console.log(`✗ ${legoId}: M-LEGO TOO CHUNKY - "${lego.known}" → "${lego.target}" (${compCount} comps for ${targetLen} chars)`);
        }
      }
    }

    // 7. LEGO BALANCE VALIDATION (three-strike escalation)
    // Ensure phrases don't over-rely on common vocabulary while neglecting underused LEGOs
    if (!SKIP_VALIDATION && seed_number > 20) {  // Only check after enough vocabulary exists
      // Gather all phrases from this submission
      const allNewPhrases = [];
      for (const lego of legos) {
        const isDuplicate = duplicateLegos.some(d => d.lego_id === `${seedId}L${String(lego.idx).padStart(2, '0')}`);
        if (!isDuplicate && lego.phrases) {
          allNewPhrases.push(...lego.phrases);
        }
      }

      if (allNewPhrases.length > 0) {
        const balanceData = await calculateLegoBalanceScores(course_code, seed_number);
        const balanceResult = checkPhraseBalance(allNewPhrases, balanceData, course_code);

        if (!balanceResult.balanced) {
          // Increment strike counter
          balanceViolations[course_code] = (balanceViolations[course_code] || 0) + 1;
          const strikes = balanceViolations[course_code];

          if (strikes >= BALANCE_MAX_STRIKES) {
            // HARD REJECT on third strike
            errors.push({
              type: 'balance',
              message: `Balance violation #${strikes} - REJECTED. Phrases over-rely on overused vocabulary.`,
              strikes,
              overused_in_phrases: balanceResult.overusedInPhrases,
              underused_available: balanceResult.underusedAvailable,
              hint: `Include underused LEGOs in your phrases. Strike counter resets on compliant submission.`,
              methodology: METHODOLOGY_HINTS.balance
            });
            console.log(`✗ ${seedId}: BALANCE STRIKE ${strikes}/${BALANCE_MAX_STRIKES} - REJECTED`);
          } else {
            // SOFT WARNING on strikes 1-2
            warnings.push({
              type: 'balance',
              message: `Balance warning ${strikes}/${BALANCE_MAX_STRIKES} - next violation will reject`,
              strikes,
              overused_ratio: balanceResult.overusedRatio + '%',
              overused_in_phrases: balanceResult.overusedInPhrases,
              underused_available: balanceResult.underusedAvailable,
              methodology: METHODOLOGY_HINTS.balance
            });
            console.log(`⚠️ ${seedId}: BALANCE STRIKE ${strikes}/${BALANCE_MAX_STRIKES} - warned`);
          }
        } else {
          // Compliant submission - reset strike counter
          if (balanceViolations[course_code] > 0) {
            console.log(`✓ ${seedId}: Balance OK - strike counter reset`);
          }
          balanceViolations[course_code] = 0;
        }
      }
    }

    // If any errors, reject everything
    if (errors.length > 0) {
      console.log(`✗ ${seedId}: REJECTED - ${errors.length} validation error(s)`);
      return res.status(400).json({
        error: 'Validation failed',
        seed: seedId,
        errors,
        warnings,
        hint: 'Fix all errors and resubmit. Nothing was inserted.'
      });
    }

    // =========================================================================
    // INSERT PHASE (all validations passed)
    // =========================================================================

    console.log(`\nInserting ${seedId}...`);

    // 1. Insert/update seed
    const { error: seedError } = await supabase
      .from('course_seeds')
      .upsert({
        course_code,
        seed_number,
        known_text,
        target_text,
        status: 'released',
        version: 1
      }, { onConflict: 'course_code,seed_number' });

    if (seedError) throw new Error(`Seed insert failed: ${seedError.message}`);
    console.log(`✓ Seed: "${known_text}" → "${target_text}"`);

    // 2. Insert LEGOs and phrases
    let totalPhrases = 0;
    let totalBuildupPhrases = 0;
    let skippedDuplicates = 0;

    for (const lego of legos) {
      const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
      const isDuplicate = duplicateLegos.some(d => d.lego_id === legoId);

      // Insert LEGO
      const { error: legoError } = await supabase
        .from('course_legos')
        .upsert({
          course_code,
          seed_number,
          lego_index: lego.idx,
          type: lego.type || 'A',
          is_new: !isDuplicate,
          known_text: lego.known,
          target_text: lego.target,
          components: lego.components || null,
          status: 'draft',
          version: 1
        }, { onConflict: 'course_code,seed_number,lego_index' });

      if (legoError) throw new Error(`LEGO insert failed: ${legoError.message}`);

      // Skip baskets for duplicates
      if (isDuplicate) {
        skippedDuplicates++;
        console.log(`  ${legoId}: ${lego.known} → ${lego.target} (duplicate, no baskets)`);
        continue;
      }

      // Generate phrases (with M-LEGO build-up)
      let allPhraseRows = [];
      let buildupCount = 0;
      let practiceStartPosition = 1;

      // M-TYPE BUILD-UP
      if (lego.type === 'M' && lego.components && lego.components.length > 0) {
        const { buildupPhrases, startPosition } = generateBuildupPhrases(
          { seed: seed_number, idx: lego.idx, known: lego.known, target: lego.target, components: lego.components },
          course_code
        );
        allPhraseRows = [...buildupPhrases];
        buildupCount = buildupPhrases.length;
        practiceStartPosition = startPosition;
        totalBuildupPhrases += buildupCount;
      }

      // Practice phrases
      if (lego.phrases && lego.phrases.length > 0) {
        // DEDUPLICATION: Filter out agent phrases that duplicate build-up phrases
        const buildupTargets = new Set(allPhraseRows.map(p => p.target_text));
        const dedupedPhrases = lego.phrases.filter(p => !buildupTargets.has(p.target));
        const dedupedCount = lego.phrases.length - dedupedPhrases.length;
        if (dedupedCount > 0) {
          console.log(`    Deduped ${dedupedCount} phrases that duplicated build-up`);
        }

        const sorted = [...dedupedPhrases].sort((a, b) => a.target.length - b.target.length);

        const practicePhrases = sorted.map((p, i) => ({
          course_code,
          seed_number,
          lego_index: lego.idx,
          position: practiceStartPosition + i,
          known_text: p.known,
          target_text: p.target,
          word_count: p.target.length,
          lego_count: (p.known.match(/\s+/g) || []).length + 1,
          metadata: {},
          status: 'draft',
          version: 1
        }));

        allPhraseRows = [...allPhraseRows, ...practicePhrases];
      }

      // Insert all phrases
      if (allPhraseRows.length > 0) {
        const { error: phraseError } = await supabase
          .from('course_practice_phrases')
          .upsert(allPhraseRows, { onConflict: 'course_code,seed_number,lego_index,position' });

        if (phraseError) throw new Error(`Phrase insert failed: ${phraseError.message}`);
        totalPhrases += allPhraseRows.length;
      }

      const buildupInfo = buildupCount > 0 ? ` [${buildupCount} buildup + ${lego.phrases?.length || 0} practice]` : '';
      console.log(`  ${legoId}: ${lego.known} → ${lego.target} (${allPhraseRows.length} phrases${buildupInfo})`);
    }

    console.log(`\n✓ ${seedId} COMPLETE`);
    console.log(`  LEGOs: ${legos.length} (${skippedDuplicates} duplicates)`);
    console.log(`  Phrases: ${totalPhrases} (${totalBuildupPhrases} buildup)`);
    console.log(`${'='.repeat(60)}\n`);

    // Find next incomplete seed to guide agent
    const { data: completedSeeds } = await supabase
      .from('course_legos')
      .select('seed_number')
      .eq('course_code', course_code);
    const completedSet = new Set(completedSeeds?.map(s => s.seed_number) || []);

    const { data: allSeeds } = await supabase
      .from('course_seeds')
      .select('seed_number, known_text')
      .eq('course_code', course_code)
      .gt('seed_number', seed_number)
      .order('seed_number')
      .limit(50);

    const nextSeed = allSeeds?.find(s => !completedSet.has(s.seed_number) && s.known_text);

    // Record activity for stall detection
    recordActivity(course_code, seed_number);

    // Get recency hints for next iteration (avoid pattern fatigue)
    let recencyHints = null;
    if (nextSeed && seed_number > 10) {
      try {
        const { overusedPatterns } = await analyzePatternRecency(course_code, 30);  // Smaller window for quick check
        if (overusedPatterns.length > 0) {
          recencyHints = {
            patterns_to_avoid: overusedPatterns.slice(0, 5).map(p => p.pattern),
            warning: `These ${overusedPatterns.length} patterns are overused - use different sentence structures`
          };
        }
      } catch (e) {
        // Non-critical, continue without hints
      }
    }

    res.json({
      ok: true,
      seed: seedId,
      known_text,
      target_text,
      legos: legos.length,
      duplicates_skipped: skippedDuplicates,
      phrases: totalPhrases,
      buildup_phrases: totalBuildupPhrases,
      warnings: warnings.length > 0 ? warnings : undefined,

      // QUALITY REMINDER - reinforced on every successful submission
      quality_reminder: {
        role: 'You are a world-class language teacher creating speakable phrases.',
        goal: 'Maximum VARIETY in sentence structures, within vocabulary constraints.',
        anti_pattern: 'Never use the same sentence formula twice in a row. Each phrase should feel fresh and natural.',
        examples: [
          'GOOD: "I think we should go tomorrow" → "Maybe she wants to come too" → "The weather looks nice today"',
          'BAD: "I don\'t know if..." → "I\'m not sure if..." → "I don\'t know if..." (formulaic, lazy)'
        ],
        mantra: 'If you catch yourself repeating a pattern, STOP and create something different.'
      },

      // Always tell agent what's next
      next_seed: nextSeed ? {
        seed_number: nextSeed.seed_number,
        known_text: nextSeed.known_text,
        recency_hints: recencyHints
      } : null
    });

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/stats/:courseCode - Get course stats with quality metrics
 */
app.get('/api/stats/:courseCode', async (req, res) => {
  const { courseCode } = req.params;

  const { count: legos } = await supabase
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode);

  const { count: phrases } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode);

  // Count total seeds in course_seeds table
  const { count: totalSeeds } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode);

  // Count completed seeds (those with non-empty target_text)
  const { count: completedSeeds } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .neq('target_text', '');

  // Count DISTINCT seed numbers from LEGOs (seeds with decomposition done)
  const { data: seedData } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', courseCode);
  const seedsWithLegos = new Set(seedData?.map(r => r.seed_number)).size;

  const ratio = legos > 0 ? (phrases/legos) : 0;
  const quality = ratio >= MIN_BATCH_PHRASE_RATIO ? 'PASS' : 'FAIL';

  // Get vocab size
  const vocabSet = await loadCourseVocab(courseCode);
  const chinese = isChinese(courseCode);

  res.json({
    course_code: courseCode,
    total_seeds: totalSeeds || 668,
    completed_seeds: completedSeeds || 0,
    seeds_with_legos: seedsWithLegos || 0,
    seeds: seedsWithLegos || 0,  // Legacy field, same as seeds_with_legos
    legos: legos || 0,
    phrases: phrases || 0,
    ratio: ratio.toFixed(1),
    vocab_size: vocabSet.size,
    vocab_mode: chinese ? 'characters' : 'words',
    quality,
    thresholds: {
      min: MIN_PHRASES_PER_LEGO,
      target: TARGET_PHRASES_PER_LEGO,
      max: MAX_PHRASES_PER_LEGO,
      min_batch_ratio: MIN_BATCH_PHRASE_RATIO
    }
  });
});

/**
 * GET /api/activity - Get activity status for all courses (for stall detection)
 *
 * Dashboard can poll this endpoint to detect stalled agents and respawn them.
 * A course is considered "stalled" if no seed was submitted in the last 5 minutes.
 *
 * Returns:
 * - courses: Object with activity status per course
 * - stalled: Array of course codes that need respawning
 * - threshold_minutes: Current stall threshold
 */
app.get('/api/activity', (req, res) => {
  const activity = getActivityStatus();
  const stalledCourses = Object.entries(activity)
    .filter(([_, status]) => status.stalled)
    .map(([code, _]) => code);

  res.json({
    courses: activity,
    stalled: stalledCourses,
    stalled_count: stalledCourses.length,
    threshold_minutes: STALL_THRESHOLD_MS / 60000,
    message: stalledCourses.length > 0
      ? `${stalledCourses.length} course(s) stalled - spawn new agents with /course-resume`
      : 'All active courses are progressing normally'
  });
});

/**
 * POST /api/activity/:courseCode/ping - Mark a course as active (for agents starting up)
 *
 * Call this when spawning a new agent to reset the stall timer.
 */
app.post('/api/activity/:courseCode/ping', (req, res) => {
  const { courseCode } = req.params;
  const seedNumber = req.body?.seed_number || 0;

  recordActivity(courseCode, seedNumber);

  res.json({
    ok: true,
    course_code: courseCode,
    message: 'Activity recorded - stall timer reset'
  });
});

// =============================================================================
// BUILD MANAGER ENDPOINTS
// =============================================================================

/**
 * POST /api/build/start/:courseCode - Start a build with batch agent spawning
 *
 * This spawns Claude agents in sequential 30-seed batches.
 * Each agent exits after its batch, and a fresh agent picks up from there.
 */
app.post('/api/build/start/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const { terminal = 'iTerm2' } = req.body || {};

  try {
    const result = await startBuild(courseCode, terminal);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/build/stop/:courseCode - Stop an active build
 */
app.post('/api/build/stop/:courseCode', (req, res) => {
  const { courseCode } = req.params;
  const result = stopBuild(courseCode);
  res.json(result);
});

/**
 * GET /api/build/status/:courseCode - Get build status for a course
 */
app.get('/api/build/status/:courseCode', async (req, res) => {
  const { courseCode } = req.params;

  try {
    const status = await getBuildStatus(courseCode);
    res.json(status);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/build/active - List all active builds
 */
app.get('/api/build/active', async (req, res) => {
  const builds = [];

  for (const [courseCode, build] of activeBuilds.entries()) {
    const progress = await getBuildProgress(courseCode);
    builds.push({
      course_code: courseCode,
      status: build.status,
      agent_count: build.agentCount,
      progress: progress
    });
  }

  res.json({
    active_builds: builds.length,
    builds
  });
});

/**
 * GET /api/recency/:courseCode - Analyze pattern and vocabulary recency
 *
 * Returns detailed analysis of pattern fatigue and vocab reinforcement needs.
 * Useful for debugging distribution issues.
 */
app.get('/api/recency/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const windowSize = parseInt(req.query.window) || RECENCY_WINDOW;

  try {
    const [patternAnalysis, vocabAnalysis] = await Promise.all([
      analyzePatternRecency(courseCode, windowSize),
      analyzeVocabRecency(courseCode)
    ]);

    res.json({
      course_code: courseCode,
      window_size: windowSize,
      pattern_fatigue_threshold: PATTERN_FATIGUE_THRESHOLD,
      reinforcement_zone: REINFORCEMENT_ZONE,

      // Patterns that are overused
      overused_patterns: patternAnalysis.overusedPatterns,
      overused_count: patternAnalysis.overusedPatterns.length,

      // Vocabulary needing reinforcement
      needs_reinforcement: vocabAnalysis.needsReinforcement,
      reinforcement_count: vocabAnalysis.needsReinforcement.length,

      // Summary
      health: patternAnalysis.overusedPatterns.length === 0
        ? 'HEALTHY - Good pattern distribution'
        : patternAnalysis.overusedPatterns.length < 5
        ? 'FAIR - Some patterns overused, watch variety'
        : 'POOR - Many patterns overused, need more variety'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/resume/:courseCode - Get everything needed to resume after context compaction
 *
 * Returns:
 * - next_seed: The next incomplete seed number
 * - recent_seeds: Last 5 completed seeds with translations
 * - recent_legos: Last 20 LEGOs introduced (for phrase generation context)
 * - vocab_stats: Current vocabulary size and mode
 * - progress: Percentage complete
 */
app.get('/api/resume/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const targetLangName = getLanguageName(courseCode);
  const chinese = isChinese(courseCode);

  // Get all seeds with their completion status
  const { data: allSeeds } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', courseCode)
    .order('seed_number');

  // Get seeds that have LEGOs (completed)
  const { data: completedData } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', courseCode);

  const completedSeeds = new Set(completedData?.map(l => l.seed_number) || []);

  // Find next incomplete seed
  const incompleteSeed = allSeeds?.find(s =>
    !completedSeeds.has(s.seed_number) && s.known_text && s.known_text !== ''
  );

  // Get recent completed seeds (last 5)
  const recentCompleted = allSeeds
    ?.filter(s => completedSeeds.has(s.seed_number))
    .slice(-5)
    .map(s => ({
      seed_number: s.seed_number,
      known_text: s.known_text,
      target_text: s.target_text
    }));

  // Get recent LEGOs (last 20 new ones for context)
  const { data: recentLegos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, type, known_text, target_text, is_new')
    .eq('course_code', courseCode)
    .eq('is_new', true)
    .order('seed_number', { ascending: false })
    .order('lego_index', { ascending: false })
    .limit(20);

  // Get vocab stats
  const vocabSet = await loadCourseVocab(courseCode);

  // Calculate progress
  const totalSeeds = allSeeds?.length || 0;
  const completedCount = completedSeeds.size;
  const progress = totalSeeds > 0 ? ((completedCount / totalSeeds) * 100).toFixed(1) : 0;

  // Get recency analysis for pattern/vocab distribution guidance
  const [patternAnalysis, vocabAnalysis] = await Promise.all([
    analyzePatternRecency(courseCode),
    analyzeVocabRecency(courseCode)
  ]);

  res.json({
    course_code: courseCode,
    target_language: targetLangName,

    // Resume point
    next_seed: incompleteSeed ? {
      seed_number: incompleteSeed.seed_number,
      known_text: incompleteSeed.known_text,
      hint: `Translate to ${targetLangName}, decompose into LEGOs, generate phrases`
    } : null,

    // Context from recent work
    recent_seeds: recentCompleted || [],
    recent_legos: recentLegos?.reverse() || [],

    // Stats
    progress: `${progress}%`,
    completed_seeds: completedCount,
    total_seeds: totalSeeds,
    vocab_size: vocabSet.size,
    vocab_mode: chinese ? 'characters' : 'words',

    // RECENCY GUIDANCE - Critical for avoiding repetitive patterns
    recency: {
      // Patterns to AVOID - these have been overused in recent seeds
      patterns_to_avoid: patternAnalysis.overusedPatterns.map(p => ({
        pattern: p.pattern,
        used_in_seeds: p.seedCount,
        warning: `Appears in ${p.seedCount} of last ${RECENCY_WINDOW} seeds - use different structures`
      })),

      // Vocabulary needing REINFORCEMENT - introduced a while ago, not practiced recently
      vocab_to_reinforce: vocabAnalysis.needsReinforcement.map(v => ({
        known: v.known,
        target: v.target,
        introduced: `Seed ${v.introduced_seed} (${v.seeds_ago} seeds ago)`,
        action: 'Include in your practice phrases to reinforce this vocabulary'
      })),

      // Guidance summary
      guidance: patternAnalysis.overusedPatterns.length > 0 || vocabAnalysis.needsReinforcement.length > 0
        ? `IMPORTANT: Avoid the ${patternAnalysis.overusedPatterns.length} overused patterns listed above. ` +
          `Try to reinforce the ${vocabAnalysis.needsReinforcement.length} vocabulary items that need practice.`
        : 'Pattern distribution looks healthy. Continue with varied sentence structures.'
    },

    // Full methodology for self-recovery after compaction
    methodology: {
      workflow: [
        '1. Use next_seed.known_text exactly (do NOT invent or guess seeds)',
        `2. Translate naturally to ${targetLangName}`,
        '3. Decompose into LEGOs: A-type (single words), M-type (phrases with components)',
        '4. Generate 10+ practice phrases per LEGO',
        '5. POST to /api/seed/complete with {course_code, seed_number, target_text, legos}',
        '6. Use next_seed from response for next iteration',
        '7. Continue autonomously until all seeds complete - do NOT stop to ask',
        '8. CHECK recency.patterns_to_avoid - do NOT use overused patterns!',
        '9. TRY TO USE recency.vocab_to_reinforce items in your phrases'
      ],
      lego_types: {
        'A-type': 'Single meaningful word: {"type":"A","known":"speak","target":"说"}',
        'M-type': 'Multi-word phrase with components: {"type":"M","known":"I want","target":"我想","components":[{"known":"I","target":"我"},{"known":"want","target":"想"}]}'
      },
      phrase_requirements: {
        minimum: '7 phrases per LEGO (for seeds 21+)',
        target: '10-13 phrases per LEGO',
        tiers: 'Mix of SHORT (3-5 words), MEDIUM (6-9 words), LONG (10+ words)',
        variety: 'CRITICAL: Avoid repetitive patterns. Each phrase should have unique structure.'
      },
      rules: [
        'ZUT: Phrases can only use vocabulary already introduced',
        'Tiling: Seed must be reconstructable from LEGO targets',
        'M-LEGOs MUST have components array',
        'Trust API validation errors - they tell you exactly what to fix',
        'PATTERN VARIETY: Do NOT repeat same sentence structures across phrases',
        'REINFORCEMENT: Include vocabulary from recency.vocab_to_reinforce when possible'
      ]
    }
  });
});

/**
 * GET /api/seeds - Get canonical seeds (668 master English seeds)
 * These have {target} placeholder for the target language name
 */
app.get('/api/seeds', async (req, res) => {
  const limit = parseInt(req.query.limit) || 668;
  const offset = parseInt(req.query.offset) || 0;

  const { data: seeds, error } = await supabase
    .from('canonical_seeds')
    .select('seed_number, seed_id, source_text')
    .order('seed_number')
    .range(offset, offset + limit - 1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({
    source: 'canonical_seeds',
    total: 668,
    count: seeds?.length || 0,
    offset,
    seeds: seeds || []
  });
});

/**
 * GET /api/seeds/:courseCode - Get course-specific seeds (legacy)
 * Use canonical_seeds endpoint instead for new courses
 */
app.get('/api/seeds/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const limit = parseInt(req.query.limit) || 260;
  const offset = parseInt(req.query.offset) || 0;

  const { data: seeds, error } = await supabase
    .from('course_seeds')
    .select('seed_number, seed_id, known_text, target_text')
    .eq('course_code', courseCode)
    .order('seed_number')
    .range(offset, offset + limit - 1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({
    course_code: courseCode,
    count: seeds?.length || 0,
    offset,
    seeds: seeds || []
  });
});

/**
 * GET /api/vocab/:courseCode - Get current vocabulary for a course
 * Useful for agents to check what's available before submitting
 */
app.get('/api/vocab/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const vocabSet = await loadCourseVocab(courseCode);
  const chinese = isChinese(courseCode);

  res.json({
    course_code: courseCode,
    mode: chinese ? 'character' : 'word',
    vocab_size: vocabSet.size,
    vocab: [...vocabSet].sort().join(chinese ? '' : ', ')
  });
});

/**
 * GET /api/balance/:courseCode - Get LEGO balance info (underused/overused)
 * Helps agents know which vocabulary needs more practice
 */
app.get('/api/balance/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const seedNumber = parseInt(req.query.seed || '999');

  try {
    const balanceData = await calculateLegoBalanceScores(courseCode, seedNumber);

    res.json({
      course_code: courseCode,
      current_seed: seedNumber,
      avg_practice_score: balanceData.avgScore,
      thresholds: {
        underused: `< ${BALANCE_UNDERUSED_THRESHOLD}`,
        overused: `> ${BALANCE_OVERUSED_THRESHOLD}`
      },
      underused_legos: balanceData.underused,
      overused_legos: balanceData.overused,
      strikes: balanceViolations[courseCode] || 0,
      hint: 'Include underused LEGOs in your phrases to maintain balance'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/seed/:courseCode/:seedNumber - Update seed's target translation
 * Call this after completing all LEGOs for a seed to set the full translation
 */
app.patch('/api/seed/:courseCode/:seedNumber', async (req, res) => {
  const { courseCode, seedNumber } = req.params;
  const { target_text } = req.body;
  const seedNum = parseInt(seedNumber);

  if (!target_text) {
    return res.status(400).json({ error: 'target_text is required' });
  }

  const { error } = await supabase
    .from('course_seeds')
    .update({ target_text, status: 'released' })
    .eq('course_code', courseCode)
    .eq('seed_number', seedNum);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  console.log(`✓ S${String(seedNum).padStart(4,'0')} translation: ${target_text}`);
  res.json({ ok: true, seed: seedNum, target_text });
});

/**
 * GET /api/course/:courseCode/translate - Get seeds needing translation with guidance
 *
 * Returns canonical seeds that need translation, along with SSi method guidance.
 * For X_for_eng: known is instant, needs target translations
 * For eng_for_X: target is instant, needs known translations
 * For X_for_Y: needs both translations
 */
app.get('/api/course/:courseCode/translate', async (req, res) => {
  const { courseCode } = req.params;
  const limit = parseInt(req.query.limit) || 260;  // Default course size
  const offset = parseInt(req.query.offset) || 0;

  // Parse course type
  const parts = courseCode.split('_for_');
  const targetLang = parts[0] || '';
  const knownLang = parts[1] || '';
  const knownIsEng = knownLang === 'eng';
  const targetIsEng = targetLang === 'eng';
  const targetLangName = getLanguageName(courseCode);

  // Initialize course if needed
  try {
    await initializeCourseSeeds(courseCode);
  } catch (err) {
    console.error('Init error:', err.message);
  }

  // Get seeds that need translation
  const { data: seeds, error } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', courseCode)
    .order('seed_number')
    .range(offset, offset + limit - 1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Filter to seeds needing translation
  const needsTranslation = seeds.filter(s => {
    const needsKnown = !knownIsEng && (!s.known_text || s.known_text === '');
    const needsTarget = !targetIsEng && (!s.target_text || s.target_text === '');
    return needsKnown || needsTarget;
  });

  // Get canonical text for reference
  const { data: canonical } = await supabase
    .from('canonical_seeds')
    .select('seed_number, source_text')
    .in('seed_number', needsTranslation.map(s => s.seed_number));

  const canonicalMap = {};
  (canonical || []).forEach(c => {
    canonicalMap[c.seed_number] = c.source_text.replace(/\{target\}/g, targetLangName);
  });

  // Build response with guidance
  const seedsToTranslate = needsTranslation.map(s => ({
    seed_number: s.seed_number,
    canonical_english: canonicalMap[s.seed_number] || '',
    current_known: s.known_text || null,
    current_target: s.target_text || null,
    needs_known: !knownIsEng && (!s.known_text || s.known_text === ''),
    needs_target: !targetIsEng && (!s.target_text || s.target_text === '')
  }));

  res.json({
    course_code: courseCode,
    target_language: targetLangName,
    known_language: knownLang,
    mode: knownIsEng ? 'translate_targets' : targetIsEng ? 'translate_knowns' : 'translate_both',
    total_seeds: seeds.length,
    needs_translation: seedsToTranslate.length,
    seeds: seedsToTranslate,
    guidance: {
      principles: [
        'CONSISTENCY: Same concept = same translation throughout all seeds',
        'COGNATES: Use cognates where they sound natural (especially for related languages)',
        'PATTERNS: Maintain consistent grammatical structures across seeds',
        'SIMPLICITY: Prefer simpler constructions that work for teaching',
        'ZUT: Translations must pass Zero Uncertainty Test (unambiguous meaning)'
      ],
      tips: [
        `Translate all seeds together to ensure vocabulary consistency`,
        `Create a mental glossary of key terms before starting`,
        `For ${targetLangName}: prefer common/standard forms over regional variants`,
        `Match formality level consistently (tu vs vous, tú vs usted, etc.)`
      ]
    }
  });
});

/**
 * POST /api/course/:courseCode/translate - Submit batch translations
 *
 * Accepts translations for multiple seeds at once.
 * Body: { translations: [{ seed_number, known_text?, target_text? }, ...] }
 */
app.post('/api/course/:courseCode/translate', async (req, res) => {
  const { courseCode } = req.params;
  const { translations } = req.body;

  if (!translations || !Array.isArray(translations)) {
    return res.status(400).json({
      error: 'translations array required',
      example: { translations: [{ seed_number: 1, target_text: '...' }] }
    });
  }

  // Parse course type
  const parts = courseCode.split('_for_');
  const knownLang = parts[1] || '';
  const knownIsEng = knownLang === 'eng';

  let updated = 0;
  let errors = [];

  for (const t of translations) {
    if (!t.seed_number) {
      errors.push({ error: 'missing seed_number', item: t });
      continue;
    }

    const updateData = {};
    if (t.known_text) updateData.known_text = t.known_text;
    if (t.target_text) updateData.target_text = t.target_text;

    if (Object.keys(updateData).length === 0) {
      errors.push({ error: 'no translation provided', seed_number: t.seed_number });
      continue;
    }

    const { error } = await supabase
      .from('course_seeds')
      .update(updateData)
      .eq('course_code', courseCode)
      .eq('seed_number', t.seed_number);

    if (error) {
      errors.push({ error: error.message, seed_number: t.seed_number });
    } else {
      updated++;
    }
  }

  console.log(`Batch translation for ${courseCode}: ${updated}/${translations.length} updated`);

  res.json({
    course_code: courseCode,
    submitted: translations.length,
    updated,
    errors: errors.length > 0 ? errors : undefined,
    message: `${updated} seeds translated successfully`
  });
});

/**
 * POST /api/phrases - Add phrases to an existing LEGO basket
 * Used for topping up baskets that need more phrases
 */
app.post('/api/phrases', async (req, res) => {
  const { course_code, seed_number, lego_index, phrases } = req.body;

  if (!course_code || !seed_number || !lego_index || !phrases || !Array.isArray(phrases)) {
    return res.status(400).json({
      error: 'Required: course_code, seed_number, lego_index, phrases (array)'
    });
  }

  // Verify LEGO exists
  const { data: lego, error: legoErr } = await supabase
    .from('course_legos')
    .select('id, known_text, target_text')
    .eq('course_code', course_code)
    .eq('seed_number', seed_number)
    .eq('lego_index', lego_index)
    .single();

  if (legoErr || !lego) {
    return res.status(404).json({
      error: `LEGO not found: ${course_code} S${seed_number}L${lego_index}`
    });
  }

  // Get current max position
  const { data: existing } = await supabase
    .from('course_practice_phrases')
    .select('position')
    .eq('course_code', course_code)
    .eq('seed_number', seed_number)
    .eq('lego_index', lego_index)
    .order('position', { ascending: false })
    .limit(1);

  let nextPosition = (existing?.[0]?.position || 0) + 1;

  // VOCABULARY VALIDATION
  const chinese = isChinese(course_code);
  const vocabSet = await loadCourseVocab(course_code);

  const violations = [];
  const validPhrases = [];

  for (const phrase of phrases) {
    const { known, target } = phrase;
    if (!known || !target) continue;

    // Check vocab
    const phraseChars = chinese
      ? [...target].filter(c => c.trim() && !/[\s\u3000。，！？、：；""'']/.test(c))
      : target.toLowerCase().split(/\s+/);

    const unknown = phraseChars.filter(c => !vocabSet.has(c));

    if (unknown.length > 0) {
      violations.push({
        phrase: target,
        unknown: chinese ? unknown.join('') : unknown.join(', ')
      });
    } else {
      validPhrases.push({
        course_code,
        seed_number,
        lego_index,
        position: nextPosition++,
        known_text: known,
        target_text: target
      });
    }
  }

  if (violations.length > 0) {
    return res.status(400).json({
      error: 'Vocabulary violations detected',
      violations,
      message: 'These phrases use characters not yet introduced'
    });
  }

  if (validPhrases.length === 0) {
    return res.status(400).json({ error: 'No valid phrases to insert' });
  }

  // Insert phrases
  const { error: insertErr } = await supabase
    .from('course_practice_phrases')
    .insert(validPhrases);

  if (insertErr) {
    return res.status(500).json({ error: insertErr.message });
  }

  const legoId = `S${String(seed_number).padStart(4,'0')}L${String(lego_index).padStart(2,'0')}`;
  console.log(`✓ Added ${validPhrases.length} phrases to ${legoId}`);

  res.json({
    ok: true,
    lego: legoId,
    added: validPhrases.length,
    phrases: validPhrases.map(p => ({ position: p.position, target: p.target_text }))
  });
});

/**
 * DELETE /api/course/:courseCode - Clear a course
 */
app.delete('/api/course/:courseCode', async (req, res) => {
  const { courseCode } = req.params;

  await supabase.from('course_practice_phrases').delete().eq('course_code', courseCode);
  await supabase.from('course_legos').delete().eq('course_code', courseCode);

  // Clear vocab cache
  courseVocabCache.delete(courseCode);

  console.log(`Cleared course: ${courseCode}`);
  res.json({ ok: true, cleared: courseCode });
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  Course Builder API - Port ${PORT}                            ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  VALIDATION GATES:                                           ║`);
  console.log(`║  1. TILING: Seed target must be tileable from LEGO targets   ║`);
  console.log(`║  2. ZUT: Same known → same target (or reject)                ║`);
  console.log(`║  3. VOCAB: Phrases only use introduced vocabulary            ║`);
  console.log(`║  4. COUNT: min ${MIN_PHRASES_PER_LEGO}, target ${TARGET_PHRASES_PER_LEGO}, max ${MAX_PHRASES_PER_LEGO} phrases/LEGO           ║`);
  console.log(`║  5. TIERS: ${MIN_SHORT_PHRASES}+ SHORT(3-5), ${MIN_MEDIUM_PHRASES}+ MEDIUM(6-9), ${MIN_LONG_PHRASES}+ LONG(10+)   ║`);
  console.log(`║  6. COMPONENTS: M-LEGOs MUST have component breakdown        ║`);
  console.log(`║  7. BALANCE: 3-strike vocab variety (soft→soft→hard reject) ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  AUTO-FEATURES:                                              ║`);
  console.log(`║  • M-LEGO build-up: auto-generates component→LEGO phrases    ║`);
  console.log(`║  • Deduplication: removes agent phrases that match build-up  ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  METHODOLOGY COMMANDS (shown on rejection):                  ║`);
  console.log(`║  • /ssi-decompose-seed - LEGO decomposition, tiling, comps   ║`);
  console.log(`║  • /ssi-build-phrases  - Phrase requirements & progression   ║`);
  console.log(`║  • /ssi-learner-pattern - What the learner experiences       ║`);
  console.log(`║  • /ssi-phrase-variety - Vocabulary balance requirements     ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  GOLDEN PATH:                                                ║`);
  console.log(`║  POST /api/seed/complete - Atomic seed+LEGOs+phrases         ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Other Endpoints:                                            ║`);
  console.log(`║  GET  /api/resume/:code - Resume context after compaction    ║`);
  console.log(`║  GET  /api/activity - Stall detection (dashboard polling)    ║`);
  console.log(`║  POST /api/activity/:code/ping - Reset stall timer           ║`);
  console.log(`║  GET  /api/seeds/:code - Canonical seeds from database       ║`);
  console.log(`║  GET  /api/stats/:code - Quality metrics + vocab size        ║`);
  console.log(`║  GET  /api/vocab/:code - Current vocabulary set              ║`);
  console.log(`║  DELETE /api/course/:code - Clear course + vocab cache       ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  STALL DETECTION: Dashboard polls /api/activity every 60s    ║`);
  console.log(`║  Threshold: ${STALL_THRESHOLD_MS/60000} minutes without submission = STALLED           ║`);
  console.log(`║  On stall: Spawn new agent with /course-resume skill         ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);
});
