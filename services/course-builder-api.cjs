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
const os = require('os');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const MACHINE_NAME = process.env.MACHINE_NAME || os.hostname();
const SPAWN_MODE = process.env.SPAWN_MODE || 'iTerm2';  // 'headless' for remote servers, 'iTerm2'/'Terminal' for interactive

const app = express();

// CORS - allow dashboard from any origin (popty.app, localhost, etc.)
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb', type: ['text/plain', 'text/markdown'] }));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const PORT = process.env.COURSE_BUILDER_PORT || 3471;

// =============================================================================
// RALPH LOOP: AUTO-LEARN FROM VALIDATION FAILURES
// When agents make mistakes, record them as lessons for future builds
// =============================================================================

/**
 * Record a validation failure as a lesson in build_lessons table
 * This completes the Ralph loop - agents learn from their mistakes
 */
async function recordLessonFromError(courseCode, errorType, errorDetails) {
  try {
    // Map course to language family
    const langCode = courseCode.split('_')[0];
    const langFamilyMap = {
      jpn: 'japanese', kor: 'korean', zho: 'cjk', cmn: 'cjk',
      deu: 'germanic', nld: 'germanic', swe: 'germanic',
      spa: 'romance', fra: 'romance', ita: 'romance', por: 'romance',
      ara: 'semitic', heb: 'semitic',
      cym: 'celtic', gle: 'celtic', gla: 'celtic'
    };
    const langFamily = langFamilyMap[langCode] || '*';  // Default to universal lesson

    // Generate lesson content based on error type
    let lesson = '';
    let exampleWrong = '';
    let exampleRight = '';

    switch (errorType) {
      case 'zut':
        lesson = `ZUT conflict: Same known text "${errorDetails.known}" already maps to "${errorDetails.existing}". Use consistent translations.`;
        exampleWrong = `known: "${errorDetails.known}" → target: "${errorDetails.new_target}"`;
        exampleRight = `known: "${errorDetails.known}" → target: "${errorDetails.existing}" (existing)`;
        break;

      case 'tiling':
        lesson = `Tiling error: Seed target must be constructable from LEGO targets. Missing: [${errorDetails.untiled}]`;
        exampleWrong = `seed_target not covered by LEGO targets`;
        exampleRight = `Every character in seed target appears in at least one LEGO target`;
        break;

      case 'vocab':
        lesson = `Vocabulary violation: Phrases used unknown words. Only use vocabulary from prior seeds and current LEGOs.`;
        exampleWrong = errorDetails.violations?.[0]?.phrase?.substring(0, 50) || 'phrase with unknown vocab';
        exampleRight = `Use only introduced vocabulary in phrases`;
        break;

      case 'phrases':
      case 'no_phrases':
        lesson = `Phrase count error: Each LEGO needs sufficient phrases. Use build[] (flexible) + use[] (min 5 phrases with scores).`;
        exampleWrong = `phrases: [] or missing build/use arrays`;
        exampleRight = `build: [{known, target}, ...], use: [{known, target, score}, ...]`;
        break;

      case 'build_use':
        lesson = `BUILD/USE format error: ${errorDetails.error || 'Invalid structure'}`;
        exampleWrong = errorDetails.details || 'malformed build/use arrays';
        exampleRight = `build: [flexible], use: [min 5 phrases with score 5-9]`;
        break;

      case 'overlap':
        lesson = `Use overlapping LEGOs when word order differs between languages.`;
        exampleWrong = `Single M-LEGO without atomic components`;
        exampleRight = `Both A-LEGOs for atoms AND M-LEGO for the combined chunk`;
        break;

      case 'balance':
        lesson = `Balance violation: Phrases over-rely on common vocabulary. Include underused LEGOs in practice phrases.`;
        exampleWrong = `Overused: ${errorDetails.overused_in_phrases?.join(', ') || 'common words'}`;
        exampleRight = `Include underused LEGOs: ${errorDetails.underused_available?.slice(0, 3).join(', ') || 'varied vocabulary'}`;
        break;

      default:
        // Unknown error type - still record it
        lesson = `Validation error (${errorType}): ${errorDetails.message || JSON.stringify(errorDetails).substring(0, 100)}`;
        exampleWrong = errorDetails.message || 'See error details';
        exampleRight = 'Fix the validation error and resubmit';
    }

    // Check if similar lesson already exists (avoid duplicates)
    const { data: existing } = await supabase
      .from('build_lessons')
      .select('id')
      .eq('lesson_type', errorType)
      .eq('language_family', langFamily)
      .ilike('lesson', `%${errorDetails.known || errorDetails.untiled || errorType}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`[RALPH] Lesson already exists for ${errorType} in ${langFamily}`);
      return;
    }

    // Insert new lesson
    const { error: insertError } = await supabase
      .from('build_lessons')
      .insert({
        lesson_type: errorType,
        lesson,
        example_wrong: exampleWrong.substring(0, 500),
        example_right: exampleRight.substring(0, 500),
        language_family: langFamily,
        active: true,
        created_at: new Date().toISOString(),
        source_course: courseCode
      });

    if (insertError) {
      console.log(`[RALPH] Failed to record lesson: ${insertError.message}`);
    } else {
      console.log(`[RALPH] ✓ Recorded lesson: ${errorType} for ${langFamily}`);
    }
  } catch (e) {
    console.log(`[RALPH] Error recording lesson: ${e.message}`);
  }
}

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
const BATCH_SIZE = 300;  // Full course in one window (1M context on Pro Max)
const MAX_PARALLEL_AGENTS = parseInt(process.env.MAX_PARALLEL_AGENTS) || 29;  // Max sub-agents for parallel build/QA
const SEEDS_PER_AGENT = parseInt(process.env.SEEDS_PER_AGENT) || 10;  // Target seeds per sub-agent
const courseActivity = new Map();  // course_code -> { lastSubmission: timestamp, lastSeed: number, seedsThisSession: number, sessionStartSeed: number }
const agentHeartbeats = new Map();  // course_code -> { lastHeartbeat: timestamp, agentId: string, status: string }
const HEARTBEAT_TIMEOUT_MS = 3 * 60 * 1000;  // 3 minutes - agent considered dead if no heartbeat

/**
 * Get the golden seed count for a course (how many seeds are manually calibrated).
 * Stored in courses.quality_rules.golden_seed_count, defaults to 10.
 */
function getGoldenSeedCount(courseInfo) {
  return courseInfo?.quality_rules?.golden_seed_count || 10;
}

// =============================================================================
// AGENT TRACKING - Track spawned agents and their submissions
// =============================================================================
const activeAgents = new Map();  // pid -> { courseCode, spawnedAt, submissions: [{seed, timestamp}], status }

function registerAgent(pid, courseCode) {
  activeAgents.set(pid, {
    pid,
    courseCode,
    spawnedAt: Date.now(),
    submissions: [],
    status: 'running'
  });
}

function recordAgentSubmission(pid, seedNumber) {
  const agent = activeAgents.get(pid);
  if (agent) {
    agent.submissions.push({ seed: seedNumber, timestamp: Date.now() });
    agent.lastActivity = Date.now();
  }
}

function markAgentComplete(pid) {
  const agent = activeAgents.get(pid);
  if (agent) {
    agent.status = 'completed';
    agent.completedAt = Date.now();
  }
}

function getActiveAgents() {
  const result = [];
  for (const [pid, agent] of activeAgents.entries()) {
    result.push({
      ...agent,
      seedCount: agent.submissions.length,
      runningMinutes: ((Date.now() - agent.spawnedAt) / 60000).toFixed(1)
    });
  }
  return result.sort((a, b) => b.spawnedAt - a.spawnedAt);  // Most recent first
}

/**
 * Normalize phrase text for deduplication comparison
 * Strips trailing punctuation and lowercases for pedagogically-equivalent matching
 * e.g., "I want" == "I want." == "i want" == "I want,"
 */
function normalizePhrase(text) {
  if (!text) return '';
  return text.replace(/[.,!?;:]+$/, '').toLowerCase().trim();
}

/**
 * Normalize text for LEGO containment checks (phonetic matching for TTS)
 *
 * KEEPS (phonetically significant):
 * - Accents: sì ≠ si, è ≠ e (different words!)
 * - Contractive punctuation: it's ≠ its, l'homme ≠ le homme (apostrophes mark contractions/elisions)
 *
 * REMOVES (cosmetic only):
 * - Capitalization: Sì = sì (same pronunciation)
 * - Non-contractive punctuation: sì, è = sì è (comma is just a pause)
 *
 * Examples:
 * - "Sì, è italiano" → "sì è italiano"
 * - "sì, è" → "sì è"
 * - "it's good" → "it's good" (apostrophe preserved)
 */
function normalizeForContainment(text) {
  if (!text) return '';
  return text
    .toLowerCase()                                      // Remove case differences (Sì → sì)
    .replace(/[.,!?;:¿¡«»""''。，！？、：；]/g, '')       // Remove non-contractive punctuation
    // KEEP apostrophes (') for contractions: it's, l'homme, c'est
    // KEEP accents (è, à, ñ, etc.) - phonetically significant
    .replace(/\s+/g, ' ')                               // Normalize whitespace
    .trim();
}

/**
 * Word-based containment check for languages with bracket structures (e.g. German).
 * Instead of requiring LEGO target as a contiguous substring, checks that ALL words
 * from the LEGO target appear in the phrase (in any position).
 *
 * Example: LEGO "versuche mich an ein Wort zu erinnern"
 *   "Ich versuche jetzt, mich an ein Wort zu erinnern." → PASS (all words present)
 *   "Ich versuche Deutsch zu lernen." → FAIL (missing mich, an, ein, Wort, erinnern)
 */
function checkWordContainment(legoTarget, phraseTarget) {
  const legoWords = normalizeForContainment(legoTarget).split(/\s+/);
  const phraseWords = normalizeForContainment(phraseTarget).split(/\s+/);
  // Every word in the LEGO must appear at least once in the phrase
  const phraseWordCounts = {};
  for (const w of phraseWords) {
    phraseWordCounts[w] = (phraseWordCounts[w] || 0) + 1;
  }
  const legoWordCounts = {};
  for (const w of legoWords) {
    legoWordCounts[w] = (legoWordCounts[w] || 0) + 1;
  }
  for (const [word, count] of Object.entries(legoWordCounts)) {
    if ((phraseWordCounts[word] || 0) < count) return false;
  }
  return true;
}

// =============================================================================
// MARKDOWN PARSER FOR SEED SUBMISSIONS
// Agents can submit in markdown format instead of JSON - fewer tokens, more natural
// =============================================================================

/**
 * Detect if request body is markdown format
 * Markdown submissions start with "# Seed" or have Content-Type text/markdown
 */
function isMarkdownSubmission(req) {
  const contentType = req.get('Content-Type') || '';
  if (contentType.includes('text/markdown') || contentType.includes('text/plain')) {
    return true;
  }
  // Check if body looks like markdown (string starting with # Seed or ## L)
  if (typeof req.body === 'string') {
    const trimmed = req.body.trim();
    return trimmed.startsWith('# Seed') || trimmed.startsWith('## L');
  }
  // Check if body.markdown field exists (for JSON wrapper with markdown content)
  if (req.body?.markdown && typeof req.body.markdown === 'string') {
    return true;
  }
  return false;
}

/**
 * Parse markdown seed submission into structured format
 *
 * Expected format:
 * ```
 * # Seed 42
 * Known: I want to speak German with you now.
 * Target: Ich will jetzt Deutsch mit dir sprechen.
 *
 * ## L1 [M] "I want" → "ich will"
 * Components: I → ich, want → will
 *
 * BUILD:
 * - I want → ich will
 * - I want to speak → ich will sprechen
 *
 * USE:
 * - I want to speak German → Ich will Deutsch sprechen [7]
 * - Do you want to speak? → Willst du sprechen? [8]
 *
 * ## L2 [A] "to speak" → "sprechen"
 * ...
 * ```
 */
function parseMarkdownSeed(markdown, courseCode) {
  const result = {
    course_code: courseCode,
    seed_number: null,
    known_text: null,
    target_text: null,
    legos: [],
    attestation: { semantic_match_verified: true }  // Implicit in markdown format
  };

  const lines = markdown.split('\n').map(l => l.trim());

  // Parse seed header: # Seed 42 or # Seed 42: "I want..."
  const seedHeaderMatch = lines.find(l => l.match(/^#\s*Seed\s+(\d+)/i));
  if (seedHeaderMatch) {
    const match = seedHeaderMatch.match(/^#\s*Seed\s+(\d+)/i);
    result.seed_number = parseInt(match[1]);
  }

  // Parse Known/Target lines
  for (const line of lines) {
    const knownMatch = line.match(/^Known:\s*(.+)$/i);
    if (knownMatch) {
      result.known_text = knownMatch[1].trim();
    }
    const targetMatch = line.match(/^Target:\s*(.+)$/i);
    if (targetMatch) {
      result.target_text = targetMatch[1].trim();
    }
  }

  // Split into LEGO sections by ## L headers
  const legoSections = markdown.split(/(?=##\s*L\d+)/);

  let legoIndex = 0;
  for (const section of legoSections) {
    // Match LEGO header: ## L1 [M] "I want" → "ich will" or ## L2 [A] "to speak" -> "sprechen"
    const headerMatch = section.match(/^##\s*L(\d+)\s*\[([AM])\]\s*"([^"]+)"\s*(?:→|->|:)\s*"([^"]+)"/m);
    if (!headerMatch) continue;

    legoIndex++;
    const lego = {
      idx: parseInt(headerMatch[1]) || legoIndex,
      type: headerMatch[2].toUpperCase(),
      known: headerMatch[3].trim(),
      target: headerMatch[4].trim(),
      components: [],
      phrases: []
    };

    // Parse components for M-type: Components: I → ich, want → will
    if (lego.type === 'M') {
      const componentsMatch = section.match(/Components?:\s*(.+)/i);
      if (componentsMatch) {
        const componentsStr = componentsMatch[1];
        // Split by comma, then parse each "known → target" pair
        const pairs = componentsStr.split(/,\s*/);
        for (const pair of pairs) {
          const pairMatch = pair.match(/([^→\->:]+)\s*(?:→|->|:)\s*(.+)/);
          if (pairMatch) {
            lego.components.push({
              known: pairMatch[1].trim(),
              target: pairMatch[2].trim()
            });
          }
        }
      }
    }

    // Parse BUILD and USE sections
    const buildMatch = section.match(/BUILD:\s*([\s\S]*?)(?=USE:|##|$)/i);
    const useMatch = section.match(/USE:\s*([\s\S]*?)(?=##|$)/i);

    const buildPhrases = [];
    const usePhrases = [];

    // Parse BUILD phrases
    if (buildMatch) {
      const buildLines = buildMatch[1].split('\n');
      for (const line of buildLines) {
        const phraseMatch = line.match(/^[-*]\s*(.+?)\s*(?:→|->|:)\s*(.+?)(?:\s*\[(\d+)\])?\s*$/);
        if (phraseMatch) {
          buildPhrases.push({
            known: phraseMatch[1].trim(),
            target: phraseMatch[2].trim()
          });
        }
      }
    }

    // Parse USE phrases (with optional score - supports [score] or [known/target] format)
    if (useMatch) {
      const useLines = useMatch[1].split('\n');
      for (const line of useLines) {
        const phraseMatch = line.match(/^[-*]\s*(.+?)\s*(?:→|->|:)\s*(.+?)(?:\s*\[(\d+)(?:\/(\d+))?\])?\s*$/);
        if (phraseMatch) {
          const phrase = {
            known: phraseMatch[1].trim(),
            target: phraseMatch[2].trim()
          };
          if (phraseMatch[3]) {
            if (phraseMatch[4]) {
              // Dual score format: [known/target]
              phrase.known_score = parseInt(phraseMatch[3]);
              phrase.target_score = parseInt(phraseMatch[4]);
              phrase.score = Math.round((phrase.known_score + phrase.target_score) / 2);
            } else {
              // Legacy single score format: [score]
              phrase.score = parseInt(phraseMatch[3]);
              phrase.known_score = phrase.score;
              phrase.target_score = phrase.score;
            }
          }
          usePhrases.push(phrase);
        }
      }
    }

    // Put build/use at top level of lego (expected by usesBuildUseFormat)
    lego.build = buildPhrases;
    lego.use = usePhrases;

    // Alternative: if no BUILD/USE structure, look for flat phrases list
    if (buildPhrases.length === 0 && usePhrases.length === 0) {
      const phrasesMatch = section.match(/(?:PHRASES?|Practice):\s*([\s\S]*?)(?=##|$)/i);
      if (phrasesMatch) {
        const phraseLines = phrasesMatch[1].split('\n');
        const flatPhrases = [];
        for (const line of phraseLines) {
          const phraseMatch = line.match(/^[-*]\s*(.+?)\s*(?:→|->|:)\s*(.+?)(?:\s*\[(\d+)(?:\/(\d+))?\])?\s*$/);
          if (phraseMatch) {
            const phrase = {
              known: phraseMatch[1].trim(),
              target: phraseMatch[2].trim()
            };
            if (phraseMatch[3]) {
              if (phraseMatch[4]) {
                phrase.known_score = parseInt(phraseMatch[3]);
                phrase.target_score = parseInt(phraseMatch[4]);
                phrase.score = Math.round((phrase.known_score + phrase.target_score) / 2);
              } else {
                phrase.score = parseInt(phraseMatch[3]);
                phrase.known_score = phrase.score;
                phrase.target_score = phrase.score;
              }
            }
            flatPhrases.push(phrase);
          }
        }
        lego.phrases = flatPhrases;
      }
    }

    result.legos.push(lego);
  }

  return result;
}

/**
 * Extract markdown from request body (handles various formats)
 */
function extractMarkdown(req) {
  // Direct string body
  if (typeof req.body === 'string') {
    return req.body;
  }
  // JSON wrapper with markdown field
  if (req.body?.markdown) {
    return req.body.markdown;
  }
  // JSON wrapper with content field
  if (req.body?.content) {
    return req.body.content;
  }
  return null;
}

/**
 * Record activity for a course (called after successful seed submission)
 * Tracks seeds_this_session for batch limiting
 */
function recordActivity(courseCode, seedNumber) {
  const existing = courseActivity.get(courseCode);
  const seedsThisSession = existing ? existing.seedsThisSession + 1 : 1;
  const sessionStartSeed = existing?.sessionStartSeed ?? seedNumber;

  courseActivity.set(courseCode, {
    lastSubmission: Date.now(),
    lastSeed: seedNumber,
    seedsThisSession,
    sessionStartSeed,
    status: 'active'
  });
}

/**
 * Reset session counter (called when new agent spawns)
 */
function resetSession(courseCode) {
  const existing = courseActivity.get(courseCode);
  if (existing) {
    existing.seedsThisSession = 0;
    existing.sessionStartSeed = existing.lastSeed;
  }
}

/**
 * Check if agent should exit for fresh context
 */
function shouldExitForFreshContext(courseCode) {
  const activity = courseActivity.get(courseCode);
  if (!activity) return false;
  return activity.seedsThisSession >= BATCH_SIZE;
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
    const shouldExit = activity.seedsThisSession >= BATCH_SIZE;

    result[courseCode] = {
      lastSubmission: new Date(activity.lastSubmission).toISOString(),
      lastSeed: activity.lastSeed,
      seedsThisSession: activity.seedsThisSession || 0,
      sessionStartSeed: activity.sessionStartSeed,
      elapsedMs: elapsed,
      elapsedMinutes: (elapsed / 60000).toFixed(1),
      stalled,
      shouldExit,
      status: stalled ? 'STALLED' : (shouldExit ? 'BATCH_COMPLETE' : 'active')
    };
  }

  return result;
}

// =============================================================================
// STALL WATCHER - Auto-respawn agents for stalled courses
// =============================================================================
let stallWatcherInterval = null;
const STALL_WATCHER_INTERVAL_MS = 60000;  // Check every 60 seconds
const MAX_AUTO_RESPAWNS = 5;  // Maximum respawns per course before giving up
const courseRespawnCounts = new Map();  // courseCode -> { count, lastRespawn }

/**
 * Start the stall watcher (called on server start)
 */
function startStallWatcher() {
  if (stallWatcherInterval) return;  // Already running

  console.log('[STALL-WATCHER] Starting stall watcher (checks every 60s for stalled courses)');
  stallWatcherInterval = setInterval(checkForStalledCourses, STALL_WATCHER_INTERVAL_MS);
}

/**
 * Stop the stall watcher
 */
function stopStallWatcher() {
  if (stallWatcherInterval) {
    clearInterval(stallWatcherInterval);
    stallWatcherInterval = null;
    console.log('[STALL-WATCHER] Stopped');
  }
}

/**
 * Check for stalled courses and auto-respawn agents
 * DATABASE-ONLY: All state comes from build_jobs table, not memory
 */
async function checkForStalledCourses() {
  const now = Date.now();
  const RESPAWN_COOLDOWN_MS = 15 * 60 * 1000;  // 15 minutes

  // Query DB for all running jobs - this is the ONLY source of truth
  let runningJobs = [];
  try {
    const { data, error } = await supabase
      .from('build_jobs')
      .select('*')
      .eq('status', 'running');

    if (error) {
      console.error('[STALL-WATCHER] DB query failed:', error.message);
      return;
    }
    runningJobs = data || [];
  } catch (err) {
    console.error('[STALL-WATCHER] DB error:', err.message);
    return;
  }

  if (runningJobs.length === 0) {
    return;  // No running jobs, nothing to check
  }

  console.log(`[STALL-WATCHER] Checking ${runningJobs.length} running job(s) from DB`);

  for (const job of runningJobs) {
    const courseCode = job.course_code;
    const lastHeartbeat = job.last_heartbeat ? new Date(job.last_heartbeat).getTime() : 0;
    const heartbeatAge = now - lastHeartbeat;
    const respawnCount = job.respawn_count || 0;
    const lastRespawnAt = job.last_respawn_at ? new Date(job.last_respawn_at).getTime() : 0;

    // Agent alive? Check heartbeat from DB
    if (heartbeatAge < HEARTBEAT_TIMEOUT_MS) {
      console.log(`[STALL-WATCHER] ${courseCode}: Agent alive (heartbeat ${(heartbeatAge/1000).toFixed(0)}s ago), skipping`);
      continue;
    }

    // Heartbeat stale - agent may be dead
    console.log(`[STALL-WATCHER] ${courseCode}: Heartbeat stale (${(heartbeatAge/1000).toFixed(0)}s ago)`);

    // Check respawn limit (from DB)
    if (respawnCount >= MAX_AUTO_RESPAWNS) {
      console.log(`[STALL-WATCHER] ${courseCode}: Respawn limit reached (${respawnCount}/${MAX_AUTO_RESPAWNS}), requires manual intervention`);
      // Mark job as stalled in DB
      await supabase.from('build_jobs').update({ status: 'stalled' }).eq('id', job.id);
      continue;
    }

    // Check cooldown (from DB)
    const timeSinceLastRespawn = now - lastRespawnAt;
    if (lastRespawnAt > 0 && timeSinceLastRespawn < RESPAWN_COOLDOWN_MS) {
      console.log(`[STALL-WATCHER] ${courseCode}: Cooldown active (${((RESPAWN_COOLDOWN_MS - timeSinceLastRespawn) / 60000).toFixed(1)} min remaining)`);
      continue;
    }

    // Check if course is complete
    try {
      const progress = await getBuildProgress(courseCode);
      const targetSeeds = job.total_seeds || 300;

      if (progress.completed >= targetSeeds) {
        console.log(`[STALL-WATCHER] ${courseCode}: Course complete (${progress.completed}/${targetSeeds}), marking job complete`);
        await supabase.from('build_jobs').update({
          status: 'complete',
          completed_at: new Date().toISOString()
        }).eq('id', job.id);
        continue;
      }

      // Course is stalled and incomplete - mark as stalled
      // NO AUTO-SPAWN: User controls spawning from dashboard
      console.log(`[STALL-WATCHER] ${courseCode}: STALLED at seed ${job.current_seed || progress.completed} - marking as stalled`);
      await supabase.from('build_jobs').update({ status: 'stalled' }).eq('id', job.id);

    } catch (err) {
      console.error(`[STALL-WATCHER] ${courseCode}: Error:`, err.message);
    }
  }
}

/**
 * DISABLED: Spawn a respawn agent for a stalled course
 * NO AUTO-SPAWN: Dashboard controls all agent spawning
 */
async function spawnRespawnAgent(courseCode, lastSeed) {
  console.log(`[SPAWN-DISABLED] spawnRespawnAgent called for ${courseCode} - NO ACTION (dashboard controls spawning)`);
  return Promise.resolve();
}

/**
 * Reset respawn counter for a course (call when manually starting a build)
 */
function resetRespawnCount(courseCode) {
  courseRespawnCounts.delete(courseCode);
}

// =============================================================================
// BUILD MANAGER - Sequential 30-seed batch agent spawning
// =============================================================================
const { spawn, execSync } = require('child_process');

const PROJECT_DIR = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean';

/**
 * Check how many Claude agents are running in the project directory.
 * Counts ALL agents - both terminal-attached and headless.
 */
function getRunningAgentCount() {
  try {
    // Get all claude PIDs (exclude chrome helper)
    const psOutput = execSync('ps aux | grep -i "claude" | grep -v grep | grep -v chrome-native', { encoding: 'utf8' });
    const lines = psOutput.trim().split('\n').filter(Boolean);

    let agentCount = 0;
    for (const line of lines) {
      const parts = line.split(/\s+/);
      const pid = parts[1];

      // Check if this process is working in our project directory
      try {
        const lsofOutput = execSync(`lsof -p ${pid} 2>/dev/null | grep cwd`, { encoding: 'utf8' });
        if (lsofOutput.includes(PROJECT_DIR)) {
          agentCount++;
        }
      } catch (e) {
        // Process may have exited, skip it
      }
    }

    return agentCount;
  } catch (e) {
    // No claude processes found
    return 0;
  }
}

// BATCH_SIZE defined at top of file (line ~51) - currently 30 seeds per agent
const BUILD_CHECK_INTERVAL_MS = 30000;  // Check progress every 30s
const MAX_RESPAWNS = 3;  // Maximum auto-respawns before requiring manual intervention
const STALL_THRESHOLD_MS_EXTENDED = 10 * 60 * 1000;  // 10 minutes for auto-respawn consideration

// =============================================================================
// RECENCY TRACKING - Pattern fatigue & vocabulary reinforcement
// =============================================================================
const RECENCY_WINDOW = 50;  // Look at last 50 seeds for pattern analysis
const PATTERN_FATIGUE_THRESHOLD = 5;  // Max times a 3-gram can appear in window
const REINFORCEMENT_ZONE = { min: 20, max: 60 };  // Seeds ago when vocab needs practice

// =============================================================================
// CHECKPOINT SYSTEM - Multiple QA gates during build with drift tracking
// Config-driven: reads review_mode from course_checkpoint_config table
// =============================================================================
const CHECKPOINT_SEEDS = [10, 50, 150, 300];  // QA checkpoints at these seeds (300 = final before audio)
const QA_DRIFT_THRESHOLD = 0.7;  // Auto-approve if |QA_avg - agent_avg| <= 0.7

// Track pending QA jobs: courseCode -> { checkpoint_seed, started_at, pid }
const pendingQAJobs = new Map();

/**
 * DISABLED: Spawn a Checkpoint QA Agent in a new terminal window
 * NO AUTO-SPAWN: Dashboard controls all agent spawning
 */
async function spawnCheckpointQAAgent(courseCode, checkpointSeed) {
  console.log(`[SPAWN-DISABLED] spawnCheckpointQAAgent called for ${courseCode} checkpoint ${checkpointSeed} - NO ACTION (dashboard controls spawning)`);
  return Promise.resolve({ spawned: false, checkpoint_seed: checkpointSeed, reason: 'auto-spawn disabled' });
}

/**
 * Check if a QA job is pending for this course
 */
function isQAPending(courseCode) {
  const job = pendingQAJobs.get(courseCode);
  return job && job.status === 'running';
}

/**
 * Get checkpoint config from database (course-specific or _default fallback)
 * Returns: { review_mode: 'human'|'auto'|'auto_with_flag', min_quality_score, max_drift_rate }
 */
async function getCheckpointConfig(courseCode, checkpointSeed) {
  // Try course-specific config first
  const { data: specific } = await supabase
    .from('course_checkpoint_config')
    .select('review_mode, min_quality_score, max_drift_rate')
    .eq('course_code', courseCode)
    .eq('checkpoint_seed', checkpointSeed)
    .single();

  if (specific) return specific;

  // Fall back to _default config
  const { data: defaultConfig } = await supabase
    .from('course_checkpoint_config')
    .select('review_mode, min_quality_score, max_drift_rate')
    .eq('course_code', '_default')
    .eq('checkpoint_seed', checkpointSeed)
    .single();

  if (defaultConfig) return defaultConfig;

  // Ultimate fallback if no config exists
  return { review_mode: 'human', min_quality_score: 7.0, max_drift_rate: 0.20 };
}

// courseCode -> {
//   checkpoints: { seed -> { approved, approvedAt, approvedBy, qa_report } },
//   drift_history: [{ checkpoint, seed, agent_avg, qa_avg, drift }],
//   calibration_feedback: { last_checkpoint, your_avg, qa_avg, drift, drift_trend, message }
// }
const checkpointState = new Map();

/**
 * Initialize checkpoint state for a course if not exists
 */
function initCheckpointState(courseCode) {
  if (!checkpointState.has(courseCode)) {
    checkpointState.set(courseCode, {
      checkpoints: {},  // seed -> checkpoint data
      drift_history: [],
      calibration_feedback: null
    });
  }
  return checkpointState.get(courseCode);
}

/**
 * Get the next unapproved checkpoint seed (if any) that blocks this seed
 * Now async - checks config for auto-approve mode
 */
async function getBlockingCheckpoint(courseCode, requestedSeed) {
  const state = initCheckpointState(courseCode);

  for (const checkpointSeed of CHECKPOINT_SEEDS) {
    if (requestedSeed > checkpointSeed) {
      // We're past this checkpoint - is it approved?
      const cp = state.checkpoints[checkpointSeed];
      if (!cp || !cp.approved) {
        // Check if this checkpoint is configured for auto-approve
        const config = await getCheckpointConfig(courseCode, checkpointSeed);
        if (config.review_mode === 'auto' || config.review_mode === 'auto_with_flag') {
          // Auto-approve mode - don't block, just auto-approve it now
          console.log(`[CHECKPOINT] Auto-approving checkpoint ${checkpointSeed} for ${courseCode} (review_mode: ${config.review_mode})`);
          await approveCheckpoint(courseCode, checkpointSeed, 'auto', {
            review_mode_used: config.review_mode,
            auto_approved_reason: 'Checkpoint configured for auto-approve'
          }, 'approved');
          continue;  // Don't block on this checkpoint
        }
        return checkpointSeed;  // This checkpoint blocks us (human review required)
      }
    }
  }
  return null;  // No blocking checkpoint
}

/**
 * Check if checkpoint is required (just completed a checkpoint seed, not yet approved)
 * Now async - loads from database to ensure pre-approved checkpoints are respected
 */
async function isCheckpointRequired(courseCode, completedSeed) {
  if (!CHECKPOINT_SEEDS.includes(completedSeed)) return false;  // Not a checkpoint seed

  // Load latest state from database (ensures pre-approved checkpoints are seen)
  await getCheckpointStatus(courseCode);

  const state = initCheckpointState(courseCode);
  const cp = state.checkpoints[completedSeed];
  if (cp && cp.approved) return false;  // Already approved

  return true;
}

/**
 * Check if course is blocked by checkpoint (past a checkpoint seed, not approved)
 * Now async - loads from database first to ensure pre-approved checkpoints are respected
 * Also checks auto-approve config and auto-approves if configured
 */
async function isBlockedByCheckpoint(courseCode, requestedSeed) {
  // Load latest state from database first (ensures pre-approved checkpoints are seen)
  await getCheckpointStatus(courseCode);
  const blockingCheckpoint = await getBlockingCheckpoint(courseCode, requestedSeed);
  return blockingCheckpoint !== null;
}

/**
 * Approve checkpoint for course with QA report (persists to database)
 */
async function approveCheckpoint(courseCode, checkpointSeed, approvedBy = 'human', qaReport = null, status = 'approved') {
  // Extract gate data from QA report if present
  const gateData = qaReport?.quality_gates || {};

  // Persist to course_checkpoint_results table
  const { error } = await supabase
    .from('course_checkpoint_results')
    .upsert({
      course_code: courseCode,
      checkpoint_seed: checkpointSeed,
      status: status,
      approved_by: approvedBy,
      review_mode_used: qaReport?.review_mode_used || (approvedBy === 'auto' ? 'auto' : 'human'),
      gate_1_quality_avg: gateData.gate_1_absolute_quality?.qa_avg_score || null,
      gate_2_use_avg: gateData.gate_2_use_exceeds_build?.use_avg || null,
      gate_2_build_avg: gateData.gate_2_use_exceeds_build?.build_avg || null,
      gate_3_vocab_violations: gateData.gate_3_vocabulary?.violations_found || 0,
      gate_4_drift_rate: gateData.gate_4_drift?.drift_rate ? parseFloat(gateData.gate_4_drift.drift_rate) : null,
      qa_report: qaReport,
      created_at: new Date().toISOString()
    }, { onConflict: 'course_code,checkpoint_seed' });

  if (error) {
    console.error(`[CHECKPOINT] DB error writing to course_checkpoint_results: ${error.message}`);
  }

  // Also update in-memory cache
  const state = initCheckpointState(courseCode);
  const isApproved = status === 'approved' || status === 'flagged';
  state.checkpoints[checkpointSeed] = {
    approved: isApproved,
    approvedAt: isApproved ? new Date().toISOString() : null,
    approvedBy: isApproved ? approvedBy : null,
    status: status,
    qa_report: qaReport
  };

  // If QA report includes drift data, add to drift history
  if (qaReport && qaReport.quality_gates?.gate_4_drift) {
    const driftData = qaReport.quality_gates.gate_4_drift;
    const checkpointNumber = CHECKPOINT_SEEDS.indexOf(checkpointSeed) + 1;

    state.drift_history.push({
      checkpoint: checkpointNumber,
      seed: checkpointSeed,
      agent_avg: driftData.avg_agent_score,
      qa_avg: driftData.avg_qa_score,
      drift: Math.abs((driftData.avg_agent_score || 0) - (driftData.avg_qa_score || 0)),
      timestamp: new Date().toISOString()
    });

    // Update calibration feedback for build agent
    state.calibration_feedback = generateCalibrationFeedback(state.drift_history);
  }

  console.log(`✓ Checkpoint ${checkpointSeed} approved for ${courseCode} by ${approvedBy} (persisted to DB)`);
}

/**
 * Generate calibration feedback message based on drift history
 */
function generateCalibrationFeedback(driftHistory) {
  if (!driftHistory || driftHistory.length === 0) return null;

  const latest = driftHistory[driftHistory.length - 1];

  // Determine drift trend
  let driftTrend = 'stable';
  if (driftHistory.length >= 2) {
    const prev = driftHistory[driftHistory.length - 2];
    if (latest.drift > prev.drift + 0.2) {
      driftTrend = 'increasing';
    } else if (latest.drift < prev.drift - 0.2) {
      driftTrend = 'decreasing';
    }
  }

  // Generate message
  let message = '';
  if (latest.drift < 0.3) {
    message = 'Excellent calibration - your scores align well with QA.';
  } else if (latest.drift < 0.7) {
    message = `Your scores are ${latest.drift.toFixed(1)} higher than QA. Minor adjustment may help.`;
  } else if (latest.drift < 1.2) {
    message = `Your scores are ${latest.drift.toFixed(1)} higher than QA. Be more critical of USE phrases.`;
  } else {
    message = `WARNING: Drift of ${latest.drift.toFixed(1)} is high. Review QA feedback carefully.`;
  }

  if (driftTrend === 'increasing') {
    message += ' Drift is INCREASING - quality may be declining.';
  }

  return {
    last_checkpoint: latest.seed,
    checkpoint_number: latest.checkpoint,
    your_avg_score: latest.agent_avg,
    qa_avg_score: latest.qa_avg,
    drift: latest.drift,
    drift_trend: driftTrend,
    message
  };
}

/**
 * Get checkpoint status for course (all checkpoints) - reads from database
 */
async function getCheckpointStatus(courseCode) {
  const state = initCheckpointState(courseCode);

  // Load results from database (persisted state)
  try {
    const { data: results } = await supabase
      .from('course_checkpoint_results')
      .select('checkpoint_seed, status, created_at, approved_by, review_mode_used, qa_report, gate_1_quality_avg, gate_4_drift_rate')
      .eq('course_code', courseCode);

    // Merge DB state into in-memory cache
    if (results) {
      for (const result of results) {
        state.checkpoints[result.checkpoint_seed] = {
          approved: result.status === 'approved',
          status: result.status,
          approvedAt: result.created_at,
          approvedBy: result.approved_by,
          review_mode_used: result.review_mode_used,
          qa_report: result.qa_report,
          quality_avg: result.gate_1_quality_avg,
          drift_rate: result.gate_4_drift_rate
        };
      }
    }
  } catch (e) {
    console.error(`[CHECKPOINT] DB read error: ${e.message}`);
  }

  // Find next required checkpoint
  let nextCheckpoint = null;
  for (const seed of CHECKPOINT_SEEDS) {
    const cp = state.checkpoints[seed];
    if (!cp || !cp.approved) {
      nextCheckpoint = seed;
      break;
    }
  }

  // Build per-checkpoint status
  const checkpointDetails = {};
  for (const seed of CHECKPOINT_SEEDS) {
    const cp = state.checkpoints[seed];
    checkpointDetails[seed] = {
      approved: cp?.approved || false,
      approvedAt: cp?.approvedAt || null,
      approvedBy: cp?.approvedBy || null
    };
  }

  return {
    checkpoint_seeds: CHECKPOINT_SEEDS,
    next_checkpoint: nextCheckpoint,
    checkpoints: checkpointDetails,
    drift_history: state.drift_history,
    calibration_feedback: state.calibration_feedback
  };
}

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

// =============================================================================
// PHRASE COVERAGE HELPERS (January 2026 migration)
// Compute phrase_role, connected_lego_ids, lego_position for new schema
// =============================================================================

/**
 * Compute phrase_role from position value
 * @param {number} position - The phrase position (0 = component, 1-7 = build, 8+ = use)
 * @returns {'component' | 'build' | 'use'}
 * BUILD = component + build (heard once during build-up)
 * USE = position 8+ (spaced repetition, consolidation)
 */
function computePhraseRole(position) {
  if (position === 0) return 'component';
  if (position >= 8) return 'use';
  return 'build';
}

/**
 * Deterministic phrase ID: {course_code}:S{NNNN}L{NN}{R}{NN}
 * R = C (component), B (build), U (use)
 * rolePosition = 1-based index within that role for this LEGO
 */
const ROLE_PREFIX = { component: 'C', build: 'B', use: 'U' };

function makePhraseId(course_code, seed_number, lego_index, phrase_role, rolePosition) {
  const s = String(seed_number).padStart(4, '0');
  const l = String(lego_index).padStart(2, '0');
  const r = ROLE_PREFIX[phrase_role] || 'X';
  const p = String(rolePosition).padStart(2, '0');
  return `${course_code}:S${s}L${l}${r}${p}`;
}

/**
 * Validate BUILD/USE phrase structure per ralph-methodology.md
 *
 * BUILD (flexible): Lock in the pattern, fragments OK
 *   - Quantity depends on LEGO complexity (LEGO + 1-5 syllables)
 *   - Debut only, NOT eternal-eligible
 *
 * USE (minimum 5): Natural production, complete sentences
 *   - Scores must be 5-9 (reject low quality - don't submit score <5)
 *   - LEGO + 5-10 syllables
 *   - Reused in consolidate/review phases
 *   - ALL are eternal-eligible
 *
 * @param {Object} lego - LEGO with build/use arrays
 * @param {string} courseCode - Course code for language-specific thresholds
 * @param {number} seedNumber - For relaxed requirements on early seeds
 * @returns {{ valid: boolean, error?: string, details?: Object }}
 */
function checkBuildUsePhrases(lego, courseCode, seedNumber) {
  const targetLang = getTargetLang(courseCode);
  const charsPerSyllable = getCharsPerSyllable(courseCode);

  // Graduated requirements - vocabulary grows with each seed
  // First 5 seeds have very limited vocab, so counts are relaxed.
  // Target: 3+ BUILD, 8+ USE — but settle for less early on.
  //
  // S1 L1:  0 BUILD, 0 USE  (nothing to combine yet — first LEGO ever)
  // S1 L2+: 1 BUILD, 1 USE  (limited vocab, sparse is honest)
  // S2-3:   1 BUILD, 1 USE  (small vocab pool)
  // S4-5:   2 BUILD, 2 USE  (growing vocab)
  // S6-10:  2 BUILD, 2 USE  (moderate vocab, quality over quantity)
  // S11+:   3 BUILD, 8 USE  (full requirements)

  let minBuild = 3;  // Minimum 3 BUILD phrases
  let minUse = 8;    // Minimum 8 USE phrases
  let minAvgSyllables = 12;  // Average syllables for USE phrases

  if (seedNumber === 1 && lego.idx === 1) {
    minBuild = 0;
    minUse = 0;
    minAvgSyllables = 0;
  } else if (seedNumber === 1) {
    minBuild = 1;
    minUse = 1;
    minAvgSyllables = 0;
  } else if (seedNumber <= 3) {
    minBuild = 1;
    minUse = 1;
    minAvgSyllables = 0;
  } else if (seedNumber <= 5) {
    minBuild = 2;
    minUse = 2;
    minAvgSyllables = 0;
  } else if (seedNumber <= 10) {
    minBuild = 2;
    minUse = 2;
    minAvgSyllables = 0;
  }

  const buildRaw = lego.build || [];
  const useRaw = lego.use || [];
  const legoTarget = (lego.target || '').trim();
  const legoTargetNorm = normalizeForContainment(legoTarget);

  // Filter out component phrases — real BUILD/USE phrases must contain the entire LEGO target
  // Use phonetic normalization: ignore case & non-contractive punctuation, keep accents & apostrophes
  const build = buildRaw.filter(p => normalizeForContainment(p.target || '').includes(legoTargetNorm));
  const use = useRaw.filter(p => normalizeForContainment(p.target || '').includes(legoTargetNorm));
  const buildComponents = buildRaw.length - build.length;
  const useComponents = useRaw.length - use.length;
  const componentCount = buildComponents + useComponents;
  if (componentCount > 0) {
    console.log(`  ⚠ ${componentCount} component phrase(s) excluded (don't contain full LEGO target): ${buildComponents} from build[], ${useComponents} from use[]`);
  }

  // Count validation
  if (build.length < minBuild) {
    return {
      valid: false,
      error: `BUILD: need ${minBuild}+, got ${build.length}${componentCount > 0 ? ` (${componentCount} component phrases excluded)` : ''}`,
      details: { build: build.length, use: use.length, components: componentCount, minBuild, minUse }
    };
  }

  if (use.length < minUse) {
    return {
      valid: false,
      error: `USE: need ${minUse}+, got ${use.length}${useComponents > 0 ? ` (${useComponents} component phrases excluded)` : ''}`,
      details: { build: build.length, use: use.length, components: componentCount, minBuild, minUse }
    };
  }

  // Reject USE phrases with known_score < 5 (broken English protection)
  const lowKnownScores = use.filter(p => p.known_score && p.known_score < 5);
  if (lowKnownScores.length > 0) {
    return {
      valid: false,
      error: `${lowKnownScores.length} USE phrase(s) have known_score < 5 (broken English). Remove or rewrite them.`,
      details: {
        build: build.length, use: use.length,
        low_known_score_phrases: lowKnownScores.map(p => p.known)
      }
    };
  }

  // Reject USE phrases with target_score < 5
  const lowTargetScores = use.filter(p => p.target_score && p.target_score < 5);
  if (lowTargetScores.length > 0) {
    return {
      valid: false,
      error: `${lowTargetScores.length} USE phrase(s) have target_score < 5. Remove or rewrite them.`,
      details: {
        build: build.length, use: use.length,
        low_target_score_phrases: lowTargetScores.map(p => p.target)
      }
    };
  }

  // USE phrases: estimate syllable count for reporting (no hard gate — Haiku QA pass handles quality)
  let avgSyllables = 0;
  if (use.length > 0) {
    const totalSyllables = use.reduce((sum, p) => {
      const chars = (p.target || '').length;
      return sum + Math.round(chars / charsPerSyllable);
    }, 0);
    avgSyllables = totalSyllables / use.length;
  }

  return {
    valid: true,
    details: {
      build: build.length,
      use: use.length,
      components: componentCount,
      avgSyllables: use.length > 0 ? (use.reduce((sum, p) => sum + Math.round((p.target || '').length / charsPerSyllable), 0) / use.length).toFixed(1) : 0
    }
  };
}

/**
 * Get chars-per-syllable ratio for a language (for syllable estimation)
 */
function getCharsPerSyllable(courseCode) {
  const targetLang = getTargetLang(courseCode);
  // Approximate chars per syllable by language
  const ratios = {
    zho: 1.0,   // Chinese: 1 char ≈ 1 syllable
    cmn: 1.0,
    jpn: 1.5,   // Japanese: hiragana ~1, kanji ~1-2
    kor: 1.0,   // Korean: 1 syllable block = 1 syllable
    eng: 3.0,   // English: ~3 chars per syllable
    spa: 2.5,   // Spanish: slightly more compact
    deu: 3.2,   // German: longer words
    fra: 2.8,   // French
    ita: 2.3,   // Italian
    por: 2.5,   // Portuguese
    nld: 3.0,   // Dutch
    swe: 3.0,   // Swedish
    cym: 2.8,   // Welsh
  };
  return ratios[targetLang] || 3.0;  // Default to English-like
}

/**
 * Check if LEGO uses new BUILD/USE format (ralph-methodology.md)
 */
function usesBuildUseFormat(lego) {
  return Array.isArray(lego.build) || Array.isArray(lego.use);
}

/**
 * Compute which other LEGOs appear in a phrase (for coverage-based selection)
 * @param {string} phraseTargetText - The phrase's target text
 * @param {string} primaryLegoTarget - The primary LEGO's target text
 * @param {Array} introducedLegos - LEGOs introduced before this phrase
 * @returns {string[]} Array of connected LEGO IDs
 */
function computeConnectedLegoIds(phraseTargetText, primaryLegoTarget, introducedLegos) {
  if (!introducedLegos || !Array.isArray(introducedLegos)) return [];

  const connectedIds = [];
  const normalizedPhrase = phraseTargetText.toLowerCase().trim();
  const normalizedPrimary = primaryLegoTarget.toLowerCase().trim();

  for (const lego of introducedLegos) {
    const legoTarget = (lego.target_text || lego.target || '').toLowerCase().trim();
    // Skip the primary LEGO itself
    if (legoTarget === normalizedPrimary) continue;
    // Skip very short targets (likely particles/noise)
    if (legoTarget.length < 2) continue;
    // Check if this LEGO appears in the phrase
    if (normalizedPhrase.includes(legoTarget)) {
      connectedIds.push(lego.lego_id || `S${String(lego.seed_number).padStart(4,'0')}L${String(lego.lego_index).padStart(2,'0')}`);
    }
  }

  return connectedIds;
}

/**
 * Compute where the LEGO appears in the phrase (start/middle/end)
 * @param {string} phraseTargetText - The phrase's target text
 * @param {string} legoTargetText - The LEGO's target text
 * @returns {'start' | 'middle' | 'end' | null}
 */
function computeLegoPosition(phraseTargetText, legoTargetText) {
  if (!phraseTargetText || !legoTargetText) return null;

  const phrase = phraseTargetText.trim();
  const lego = legoTargetText.trim();
  const index = phrase.indexOf(lego);
  if (index === -1) return null;

  const phraseLength = phrase.length;
  const legoLength = lego.length;
  const legoEndIndex = index + legoLength;
  const startPercent = index / phraseLength;
  const endPercent = legoEndIndex / phraseLength;
  const centerPercent = (startPercent + endPercent) / 2;

  if (centerPercent < 0.33) return 'start';
  if (centerPercent > 0.67) return 'end';
  return 'middle';
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
  // Get seed_count from courses table (the release target)
  const { data: courseData } = await supabase
    .from('courses')
    .select('seed_count')
    .eq('course_code', courseCode)
    .single();

  const totalSeeds = courseData?.seed_count || 300;  // Default to 300 if not set

  const { count: completedSeeds } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .not('decomposed_at', 'is', null);

  return {
    completed: completedSeeds || 0,
    total: totalSeeds,
    isComplete: (completedSeeds || 0) >= totalSeeds
  };
}

/**
 * Spawn a new Claude agent for a course.
 * In headless mode (SPAWN_MODE=headless): background process with log output.
 * In terminal mode: opens iTerm2/Terminal window via osascript.
 * Called by dashboard when user clicks Start/Resume - NOT auto-triggered.
 */
async function spawnBuildAgent(courseCode, agentNumber, terminal = 'iTerm2') {
  // Fetch checkpoint configs to generate dynamic instructions
  const checkpointConfigs = {};
  for (const seed of CHECKPOINT_SEEDS) {
    checkpointConfigs[seed] = await getCheckpointConfig(courseCode, seed);
  }

  // Generate dynamic checkpoint instructions based on actual review_mode
  const humanCheckpoints = [];
  const autoCheckpoints = [];
  for (const seed of CHECKPOINT_SEEDS) {
    const config = checkpointConfigs[seed];
    if (config.review_mode === 'human') {
      humanCheckpoints.push(seed);
    } else {
      autoCheckpoints.push(seed);  // 'auto' or 'auto_with_flag'
    }
  }

  let checkpointInstructions = '';
  if (humanCheckpoints.length > 0) {
    checkpointInstructions += `- **HUMAN REVIEW REQUIRED** at seeds ${humanCheckpoints.join(', ')}: STOP and output "CHECKPOINT REACHED - WAITING FOR HUMAN REVIEW". The API will block further submissions until approved.\n`;
  }
  if (autoCheckpoints.length > 0) {
    checkpointInstructions += `- Seeds ${autoCheckpoints.join(', ')}: AUTO-APPROVED. Continue building without stopping.\n`;
  }
  if (humanCheckpoints.length === 0) {
    checkpointInstructions = 'All checkpoints are AUTO-APPROVED. Just continue building - do NOT stop.';
  }

  console.log(`[BUILD] Checkpoint config for ${courseCode}: Human=${humanCheckpoints.join(',')}, Auto=${autoCheckpoints.join(',')}`);

  // Query build_lessons for this language family (Ralph loop methodology improvement)
  const langCode = courseCode.split('_')[0]; // e.g., 'jpn' from 'jpn_for_eng'
  const langFamilyMap = {
    jpn: 'japanese', kor: 'korean', zho: 'cjk', cmn: 'cjk',
    deu: 'germanic', nld: 'germanic', swe: 'germanic',
    spa: 'romance', fra: 'romance', ita: 'romance', por: 'romance'
  };
  const langFamily = langFamilyMap[langCode] || 'other';

  let lessonsSection = '';
  try {
    const { data: lessons } = await supabase
      .from('build_lessons')
      .select('lesson_type, lesson, example_wrong, example_right')
      .or(`language_family.eq.${langFamily},language_family.eq.*`)
      .eq('active', true);

    if (lessons && lessons.length > 0) {
      lessonsSection = `\n\n# LESSONS LEARNED (from previous builds)\n\n` +
        lessons.map(l =>
          `**${l.lesson_type.toUpperCase()}**: ${l.lesson}` +
          (l.example_wrong ? `\n  ✗ Wrong: ${l.example_wrong}` : '') +
          (l.example_right ? `\n  ✓ Right: ${l.example_right}` : '')
        ).join('\n\n');
      console.log(`[BUILD] Loaded ${lessons.length} lessons for ${langFamily}/${courseCode}`);
    }
  } catch (e) {
    console.log(`[BUILD] Could not load lessons: ${e.message}`);
  }

  // Close any previous agent windows for this course (cleanup for RAM)
  // Skip in headless mode - no windows to close
  if (agentNumber > 1 && SPAWN_MODE !== 'headless') {
    const closeScript = terminal === 'iTerm2'
      ? `tell application "iTerm" to close (every window whose name contains "${courseCode}")`
      : `tell application "Terminal" to close (every window whose name contains "${courseCode}")`;

    try {
      require('child_process').execSync(`osascript -e '${closeScript}'`, { stdio: 'ignore' });
      console.log(`[BUILD] Closed previous windows for ${courseCode}`);
    } catch (e) {
      // Ignore errors - window might already be closed
    }
  }

  // Ralph methodology prompt v8 - LANGUAGE TEACHING framing, not API framing
  // Full methodology inline with real course examples
  const prompt = `You are a world-class language teacher applying the SaySomethingin (SSi) methodology to build a ${courseCode} course.

# THE SSi METHODOLOGY

You are an exponent of the most effective methodology in the world for learning to speak a new language confidently and fast.

**Why SSi works:**
- It's fast because it's HARD - all work happens in the learner's brain
- NO grammar rules - everything is INFERRED through huge variety of examples
- All production is generated WITHOUT first hearing the target phrase
- The learner BUILDS phrases by combining LEGOs they've learned into novel combinations
- This is "learning by creating" - extremely powerful

**What are LEGOs?**
LEGO = Language Elements that Glue Operationally
Small, reusable chunks that combine to create infinite phrases.

**The SSi methodology is proven over 18 years** with TV celebrities, adult learners, and school children across dozens of languages.

Your job: Apply your natural language expertise to build course content following this methodology.

---

# WHAT THE LEARNER EXPERIENCES

Here's exactly what happens in the first rounds of a Welsh course (the original SSi language):

\`\`\`
ROUND 1 - LEGO: "I want" → "dw i isio"
  INTRO: I want → dw i isio
  LEGO:  I want → dw i isio
  (Nothing to combine with yet - this is the foundation)

ROUND 2 - LEGO: "to speak" → "siarad"
  INTRO: to speak → siarad
  LEGO:  to speak → siarad
  BUILD: I want to speak → dw i isio siarad  ← COMBINING L1 + L2!

ROUND 3 - LEGO: "Welsh" → "cymraeg"
  INTRO: Welsh → cymraeg
  LEGO:  Welsh → cymraeg
  BUILD: to speak Welsh → siarad cymraeg
  BUILD: I want to speak Welsh → dw i isio siarad cymraeg  ← L1 + L2 + L3!

ROUND 4 - LEGO: "to learn" → "dysgu"
  INTRO: to learn → dysgu
  LEGO:  to learn → dysgu
  BUILD: to learn Welsh → dysgu cymraeg
  BUILD: I want to learn → dw i isio dysgu
  BUILD: I want to learn Welsh → dw i isio dysgu cymraeg
  BUILD: I want to learn to speak Welsh → dw i isio dysgu siarad cymraeg  ← L1+L2+L3+L4!

ROUND 5 - LEGO: "I'm trying" → "dw i'n trio"
  INTRO: I'm trying → dw i'n trio
  LEGO:  I'm trying → dw i'n trio
  BUILD: I'm trying to learn → dw i'n trio dysgu
  BUILD: I'm trying to speak → dw i'n trio siarad
  BUILD: I'm trying to speak Welsh → dw i'n trio siarad cymraeg
  BUILD: I'm trying to learn to speak Welsh → dw i'n trio dysgu siarad cymraeg
\`\`\`

**THE KEY INSIGHT:** Each new LEGO combines with ALL previous LEGOs to create exponentially more phrases. By Round 5, the learner can create dozens of combinations from just 5 LEGOs.

---

# THE PATTERN WORKS IN ANY LANGUAGE

**CHINESE for English speakers:**
\`\`\`
Round 1: "I want" → 我想           (foundation)
Round 2: "to speak" → 说           → 我想说
Round 3: "Chinese" → 中文          → 说中文, 我想说中文
Round 4: "with you" → 和你         → 和你说, 和你说中文, 我想和你说中文
Round 5: "now" → 现在              → 现在说, 我现在想和你说中文
\`\`\`

**SPANISH for English speakers:**
\`\`\`
Round 1: "I want" → quiero         (foundation)
Round 2: "to speak" → hablar       → quiero hablar
Round 3: "Spanish" → español       → hablar español, quiero hablar español
Round 4: "with you" → contigo      → hablar contigo, quiero hablar español contigo
Round 5: "to learn" → aprender     → aprender español, quiero aprender a hablar español contigo
\`\`\`

**JAPANESE for French speakers:**
\`\`\`
Round 1: "je veux" → 話したい        (foundation)
Round 2: "japonais" → 日本語         → 日本語を話したい
Round 3: "avec toi" → あなたと       → あなたと話したい, あなたと日本語を話したい
Round 4: "maintenant" → 今          → 今話したい, 今あなたと日本語を話したい
\`\`\`

The methodology is UNIVERSAL. The language direction doesn't matter - the combinatorial build-up is always the same.

---

# LEGO TYPES

**A-type (Atomic):** Single meaningful words
\`\`\`
"Chinese" → 中文
"Spanish" → español
"now" → 现在 / ahora / maintenant
\`\`\`

**M-type (Molecular):** Multi-word phrases with COMPONENTS
Components are taught BEFORE the full phrase - the learner builds up:

\`\`\`
CHINESE M-LEGO: "I want" → 我想
  Components: I → 我, want → 想
  Learner sees: I→我, want→想, THEN: I want→我想

SPANISH M-LEGO: "I have been learning" → he estado aprendiendo
  Components: I have → he, been → estado, learning → aprendiendo
  Learner sees each component, THEN the full phrase

JAPANESE M-LEGO: "I want to speak" → 話したいです
  Components: speak → 話す, want to → たい
  Learner sees components, THEN full phrase
\`\`\`

**Components are REAL WORDS only - never grammar explanations!**
WRONG: {"known": "past tense marker", "target": "た"}
RIGHT: {"known": "spoke", "target": "話した"} — learner INFERS た = past from contrast!

---

# BUILD vs USE PHRASES

**BUILD phrases (4 per LEGO):** Lock in the pattern
- Fragments OK - "speak Chinese", "with you"
- Length varies naturally based on LEGO size
- Pattern drilling - not for long-term retention

**USE phrases (6 per LEGO):** Natural production
- COMPLETE SENTENCES ONLY - "I want to speak Chinese with you"
- Average syllables must be > 12 (substantial sentences)
- ALL go into spaced repetition - learners hear these HUNDREDS of times
- Each needs a quality SCORE (5-9) - scores <5 should be REWRITTEN not submitted

---

# COMPLETE EXAMPLE: Full seed in markdown format

\`\`\`markdown
# Seed 1
Known: I want to speak Chinese with you now.
Target: 我现在想和你说中文。

## L1 [M] "I want" → "我想"
Components: I → 我, want → 想

BUILD:
- I want → 我想

USE:
- I want to learn → 我想学 [6]
- I want to speak → 我想说 [6]

## L2 [A] "to speak" → "说"

BUILD:
- I want to speak → 我想说
- speak Chinese → 说中文

USE:
- I want to speak Chinese → 我想说中文 [7/7]
- I want to learn to speak Chinese → 我想学说中文 [8/8]

## L3 [A] "Chinese" → "中文"

BUILD:
- speak Chinese → 说中文
- learn Chinese → 学中文

USE:
- I want to speak Chinese → 我想说中文 [7/7]
- I want to learn Chinese → 我想学中文 [7/7]

## L4 [M] "with you" → "和你"
Components: with → 和, you → 你

BUILD:
- with you → 和你
- speak with you → 和你说
- speak Chinese with you → 和你说中文

USE:
- I want to speak with you → 我想和你说 [7/7]
- I want to speak Chinese with you → 我想和你说中文 [8/8]
- I want to learn Chinese with you → 我想和你学中文 [8/8]
- Do you want to speak Chinese with me? → 你想和我说中文吗? [9/9]

## L5 [A] "now" → "现在"

BUILD:
- now speak → 现在说
- now with you → 现在和你

USE:
- I want to speak Chinese with you now → 我现在想和你说中文 [8/8]
- I want to learn Chinese now → 我现在想学中文 [7/7]
\`\`\`

**Notice:** Each LEGO's phrases combine it with ALL previous LEGOs. L4's USE phrases use L1 (我想), L2 (说), L3 (中文).

---

# SCORING USE PHRASES (5-9 ONLY)

USE phrases go into eternal spaced repetition. Quality matters enormously.
**Score EACH phrase in TWO dimensions: known language [K] and target language [T].**
**Submit format: [K/T] where K = known quality, T = target quality. Both must be 5-9.**

- **9**: Native-natural, idiomatic, something a real person would actually say
- **7-8**: Strong, natural phrase — minor stylistic preferences possible
- **5-6**: Correct and natural, but unremarkable — MINIMUM for submission
- **<5**: DO NOT SUBMIT. Rewrite or skip entirely.

## KNOWN LANGUAGE (English) — THE LEARNER SEES THIS

The known language is what learners read. It must be **flawless, natural English** that any native speaker would say without hesitation. This is NOT negotiable.

**AUTOMATIC FAILURE (score 0, never submit):**
- "I want going" / "I'd like going" / "she wants going" — WRONG. Use infinitive: "I want to go"
- "I feel tomorrow" / "I feel next week" — MISSING ADJECTIVE. "I feel good about tomorrow"
- "try how do you feel" / "learn how is the weather" — EMBEDDED QUESTION in statement frame
- "I speak with me" / "she helps with her" — SUBJECT-OBJECT conflict
- "today or yesterday" / "now or at the moment" — MECHANICAL time-swaps that make no sense
- ANY sentence that would make a native English speaker pause or wince

**The API validates target language quality. YOU validate known language quality.**
If you cannot write natural English with the available vocabulary, SKIP that phrase and write a different one. Never submit broken English to meet phrase count minimums.

## TARGET LANGUAGE — scored normally per rubric above

---

# API SUBMISSION (Markdown format)

## Check your status:
\`\`\`
curl http://localhost:3471/api/resume/${courseCode}
\`\`\`

## Submit each seed as markdown:
\`\`\`
curl -X POST 'http://localhost:3471/api/seed/complete?course=${courseCode}' \\
  -H 'Content-Type: text/markdown' \\
  --data-binary @- <<'SEED'
# Seed N
Known: English sentence here
Target: Target language sentence here

## L1 [M] "known phrase" → "target phrase"
Components: word1 → target1, word2 → target2

BUILD:
- known fragment → target fragment

USE:
- known sentence → target sentence [K/T]

## L2 [A] "known word" → "target word"

BUILD:
- known fragment → target fragment

USE:
- known sentence → target sentence [K/T]
(K = known language score, T = target language score, both 5-9)
SEED
\`\`\`

## Error messages tell you exactly what's wrong:
- **VOCAB VIOLATION**: You used a word not yet introduced - remove that phrase
- **NO PHRASES**: You submitted a LEGO without build/use - add them!
- **TILING FAILED**: Seed can't be reconstructed from LEGOs - add missing LEGO

## Checkpoints
${checkpointInstructions}

## AUTONOMY - ABSOLUTELY CRITICAL - READ THIS CAREFULLY

**YOU ARE RUNNING OVERNIGHT. THE HUMAN IS ASLEEP. NOBODY WILL RESPOND.**

⚠️ **FORBIDDEN BEHAVIORS** (doing ANY of these = FAILURE):
- ❌ Asking "Should I continue?"
- ❌ Asking "Is this correct?"
- ❌ Asking "Do you want me to..."
- ❌ Waiting for confirmation
- ❌ Stopping to check in
- ❌ ANY question directed at the user

**REQUIRED BEHAVIOR:**
- ✅ Make decisions yourself
- ✅ Fix errors yourself and continue
- ✅ If unsure, pick the best option and proceed
- ✅ Build seeds continuously until done or blocked by checkpoint

**IF YOU FEEL THE URGE TO ASK A QUESTION:**
→ Don't. Make a decision and proceed.
→ The human will review at checkpoints.
→ Asking questions causes the build to stall for hours.

**YOUR ONLY JOB:** Submit seeds via the API. Nothing else.

**QUALITY OVER QUANTITY:**
→ If you cannot make natural English with available vocabulary, submit FEWER phrases.
→ 6 excellent phrases beats 10 phrases where 4 are garbage.
→ The human will delete bad English. Don't make them.

---

# WORKFLOW: ONE SEED AT A TIME, CONTINUOUSLY

**How you work:**
1. Check /api/resume/${courseCode} to see your next seed
2. Build that ONE seed (translate, decompose into LEGOs, create BUILD/USE phrases)
3. Submit via POST /api/seed/complete
4. Immediately move to the next seed
5. Repeat until course complete or checkpoint blocks you

**There are NO batches. There is NO "batch complete".**
You work on ONE seed, submit it, then immediately start the next.
Keep going until you finish or get blocked.

---

# CRITICAL RULES

1. LEGOs are SMALL (2-4 words) - never whole sentences
2. Each LEGO's phrases use ONLY that LEGO + ALL PREVIOUS vocabulary
3. BUILD = flexible quantity (LEGO + 1-5 syllables), fragments OK, debut only
4. USE = minimum 5 phrases (LEGO + 5-10 syllables), complete sentences, scored [K/T] both 5-9
5. **ENGLISH QUALITY IS SACRED**: The known (English) text must be flawless. If a LEGO chunk doesn't fit naturally into English (e.g., a gerund-form chunk where English needs infinitive), restructure the sentence or skip it. NEVER submit unnatural English.
6. Learners will hear USE phrases HUNDREDS of times - quality matters!
7. **TILING**: EVERY character/word in the seed target MUST appear in at least one LEGO target!
   - If tiling fails, you're missing a word/particle - add it to a LEGO!
8. **OVERLAPPING LEGOs**: When word order differs, use BOTH atomic AND chunk LEGOs!
   - Example: "blue thing" → "cosa azul" (Spanish reverses order)
   - Create: "blue"→"azul", "thing"→"cosa", AND "blue thing"→"cosa azul"
   - The chunk M-LEGO handles the transformation when words combine
9. See ralph-methodology.md for the complete methodology reference
${lessonsSection}`;

  // Write prompt to temp file to avoid escaping nightmares
  const tmpFile = `/tmp/claude_build_${courseCode}_${agentNumber}_${Date.now()}.txt`;
  require('fs').writeFileSync(tmpFile, prompt);

  // cd to project dir so skills work, then run claude
  const projectDir = __dirname.replace('/services', '');
  const claudeCmd = `cd "${projectDir}" && claude --dangerously-skip-permissions "$(cat ${tmpFile})"`;

  // SPAWN_MODE env var overrides terminal param (set 'headless' on remote servers)
  const effectiveTerminal = SPAWN_MODE === 'headless' ? 'headless' : terminal;

  console.log(`[BUILD] Spawning Agent #${agentNumber} for ${courseCode} in ${effectiveTerminal}`);

  let agent;

  if (effectiveTerminal === 'headless') {
    // ── Headless mode: background process with log files (no GUI) ──
    // Ideal for remote servers where nobody watches terminal windows.
    // Stall watcher handles stuck agents via respawn.
    const fs = require('fs');
    const logsDir = require('path').join(projectDir, 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

    const logFile = `${logsDir}/agent-${courseCode}-${agentNumber}.log`;
    const out = fs.openSync(logFile, 'a');
    const err = fs.openSync(logFile, 'a');

    agent = spawn('bash', ['-c', claudeCmd], {
      stdio: ['ignore', out, err],
      detached: true
    });

    // Let the agent run independently of this process
    agent.unref();

    console.log(`[BUILD] Agent #${agentNumber} launched headless (pid: ${agent.pid}, log: ${logFile})`);

    agent.on('error', (spawnErr) => {
      console.error(`[BUILD] Agent #${agentNumber} headless spawn error:`, spawnErr.message);
      const build = activeBuilds.get(courseCode);
      if (build) {
        build.agent = null;
        build.status = 'agent_error';
      }
    });

    agent.on('exit', (code) => {
      console.log(`[BUILD] Agent #${agentNumber} headless process exited (code: ${code})`);
      const build = activeBuilds.get(courseCode);
      if (build) {
        build.status = code === 0 ? 'agent_exited' : 'agent_error';
      }
    });
  } else {
    // ── Terminal mode: open iTerm2/Terminal window (interactive) ──
    const escapedCmd = claudeCmd.replace(/"/g, '\\"');

    let osascript;
    if (effectiveTerminal === 'iTerm2') {
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

    agent = spawn('osascript', ['-e', osascript], {
      stdio: 'pipe',
      detached: true
    });

    agent.on('error', (spawnErr) => {
      console.error(`[BUILD] Agent #${agentNumber} osascript error:`, spawnErr.message);
      const build = activeBuilds.get(courseCode);
      if (build) {
        console.log(`[BUILD-DEBUG] >>> AGENT SET TO NULL - REASON: osascript error (${spawnErr.message})`);
        console.log(`[BUILD-DEBUG]     Previous status: ${build.status}, agentCount: ${build.agentCount}`);
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
  }

  return agent;
}

/**
 * Generate the coordinator brief for parallel builds.
 * The coordinator is a lightweight haiku agent that uses Claude Code's Task tool
 * to spawn ~10 background sub-agents, each decomposing a batch of seeds as drafts.
 */
function generateParallelBrief({ courseCode, batches, goldenExamples, goldenSeedMarkdown, lessons, courseInfo, targetSeeds, seedsNeededCount }) {
  // Generate decomposition pattern examples from golden seeds
  const patternsSection = formatDecompositionPatterns(goldenSeedMarkdown || []);

  // Compact JSON example: one M-LEGO + one A-LEGO, 2 BUILD + 2 USE each (format reference only)
  const jsonExample = (() => {
    if (!goldenSeedMarkdown || goldenSeedMarkdown.length === 0) return '';
    const seed = goldenSeedMarkdown[goldenSeedMarkdown.length - 1];
    const mLego = seed.legos.find(l => l.type === 'M');
    const aLego = seed.legos.find(l => l.type === 'A');
    const sampleLegos = [mLego, aLego].filter(Boolean).slice(0, 2);
    const compact = {
      course_code: seed.course_code, seed_number: seed.seed_number, target_text: seed.target_text,
      legos: sampleLegos.map(l => {
        const entry = { idx: l.idx, type: l.type, known: l.known, target: l.target,
          build: (l.build || []).slice(0, 2).map(p => ({ known: p.known, target: p.target })),
          use: (l.use || []).slice(0, 2).map(p => ({ known: p.known, target: p.target, score: p.score || 7 }))
        };
        // Components: strip the redundant final entry (full LEGO target) — keep only meaningful chunks
        if (l.components) {
          entry.components = l.components.filter(c => c.target !== l.target);
        }
        return entry;
      })
    };
    return '\n```json\n' + JSON.stringify(compact, null, 2) + '\n```\nThis shows 2 of ' + seed.legos.length + ' LEGOs, 2 BUILD + 2 USE each. Submit ALL LEGOs with 3+ BUILD and 8+ USE per LEGO.\nComponents = meaningful chunks that hint at internal structure (visual only, never spoken). Don\'t over-decompose.';
  })();

  const lessonsSection = lessons && lessons.length > 0
    ? `\n## Lessons from QA\n${lessons.map(l =>
        `- ${l.lesson}${l.example_wrong ? ` (wrong: ${l.example_wrong})` : ''}${l.example_right ? ` (right: ${l.example_right})` : ''}`
      ).join('\n')}`
    : '';

  const goldenCount = getGoldenSeedCount(courseInfo);
  const seedList = batches.flatMap(b => b.seeds || []);
  const firstSeed = seedList.length > 0 ? seedList[0] : goldenCount + 1;
  const lastSeed = seedList.length > 0 ? seedList[seedList.length - 1] : targetSeeds;

  return `# Parallel Course Builder — ${courseCode}

You are the coordinator. Build seeds ${firstSeed}-${lastSeed} (${seedsNeededCount} seeds needed).

## Architecture
- Spawn sub-agents (~10 seeds each) via Task tool. ALL in a SINGLE message for parallel execution.
- Sub-agents submit as DRAFTS: POST /api/seed/complete?draft=true (?draft=true is CRITICAL — always)
- Monitor: GET http://localhost:3471/api/course/${courseCode}/drafts (poll every 60s)
- When all ${seedsNeededCount} drafts are in: POST http://localhost:3471/api/course/${courseCode}/finalize
- If finalize returns 409 with collisions: fix them yourself (do NOT spawn separate agents). Details below.
- If stalled: check which seeds are missing, respawn agents for gaps. Never give up.

## Fixing Collisions Inline

**STOP. READ THIS.** When finalize returns 409, the response body ALREADY CONTAINS the full draft JSON, collision details, AND available vocab for every colliding seed. You have EVERYTHING. Do NOT query Supabase. Do NOT call any other API endpoints. Do NOT search the codebase. Just parse the 409 response JSON you already have.

Save the 409 response to a file, then work through it:

\`\`\`bash
# Step 1: Call finalize, save full response
curl -s -X POST "http://localhost:3471/api/course/${courseCode}/finalize" -o /tmp/finalize_response.json

# Step 2: Check if collisions (status 409 means collisions)
# The response contains fix_instructions[].prompt with EVERYTHING per seed:
#   - Collision notes (which LEGO collides with what)
#   - Available vocab (all words the learner knows)
#   - Full draft JSON (your starting point)
\`\`\`

For EACH colliding seed (all info is in fix_instructions[].prompt):
1. Find the colliding LEGO (marked in collision notes)
2. Pick an adjacent LEGO to merge with — whichever makes a more natural combined phrase
3. Replace those two LEGOs with one M-LEGO: known = combined English, target = combined target, components = the two originals
4. Write BUILD phrases (min 3) and USE phrases (min 8) using ONLY words from the "Available vocab" listed for that seed
5. Drop all phrases from the merged-away LEGO. Keep all other LEGOs untouched.
6. Re-index remaining LEGOs so idx values are sequential (1, 2, 3...)
7. Write to /tmp/seed{N}.json and submit: curl -s -X POST "http://localhost:3471/api/seed/complete?draft=true" -H "Content-Type: application/json" --data-binary @/tmp/seed{N}.json

After ALL collisions are fixed, call finalize again. If new collisions emerge, repeat.
- subagent_type: "general-purpose", model: "sonnet", run_in_background: true

## Sub-Agent Prompt Template

Give each sub-agent this prompt (replace {SEED_LIST} with their seed numbers):

---BEGIN SUB-AGENT PROMPT---
You are building course content for ${courseCode}. Your seeds: {SEED_LIST}

## API
- Seeds: GET http://localhost:3471/api/seeds/${courseCode}
- Vocab: GET http://localhost:3471/api/vocab/${courseCode}?seed=N (comma-separated — split on commas, NOT substring match)
- Submit: POST http://localhost:3471/api/seed/complete?draft=true (JSON)

## Your Job

Break each seed into LEGOs (teaching chunks) + BUILD/USE phrases. The API validates tiling, vocabulary, containment, phrase counts. If rejected, read the error and fix.

**A-LEGO** = single word, zero ambiguity. Learner hears English → produces target with no hesitation.
**M-LEGO** = multi-word bundle. Groups words that would be ambiguous alone. If there's ANY doubt → M-LEGO.
**BUILD** (3+): new LEGO + prior vocabulary. Fragments OK. Use phrase_role: "build".
**USE** (8+): natural complete sentences a real person would say. Scored 5-9. Use phrase_role: "use".

LEGO target = exact form from the seed (never dictionary form). All lowercase, no punctuation (keep apostrophes and accents).
The API auto-assigns deterministic phrase IDs — never set phrase IDs yourself. Never use phrase_role "practice" (renamed to "build").

## LEGO Decomposition Patterns — Study These

${patternsSection}
${lessonsSection}

## JSON Format

Write to /tmp/seed{N}.json, submit with:
curl -s -X POST "http://localhost:3471/api/seed/complete?draft=true" -H "Content-Type: application/json" --data-binary @/tmp/seed{N}.json
${jsonExample}

## Workflow
For each seed: fetch vocab (seed=N) → decompose into LEGOs → write BUILD/USE phrases → submit.
If rejected, read the error, fix, retry. No limit. Never ask questions. Never give up.
---END SUB-AGENT PROMPT---

## AUTONOMY
You are running overnight. The human is asleep. NEVER ask questions. Fix errors. Respawn failed agents. Keep going until finalize succeeds.
`;
}

/**
 * Generate the coordinator brief for parallel QA pass.
 * The coordinator spawns ~10 sub-agents, each checking a batch of seeds for grammar/naturalness.
 */
function generateQABrief({ courseCode, batches, courseInfo }) {
  const batchList = batches.map((b, i) =>
    `Batch ${i + 1}: seeds ${b.start}-${b.end} (${b.end - b.start + 1} seeds)`
  ).join('\n');

  const langCode = courseCode.split('_')[0];
  const langName = courseInfo?.display_name || courseCode;

  return `# Parallel QA Pass — Coordinator Agent

You are coordinating a parallel naturalness & grammar QA pass for course **${courseCode}** (${langName}).

## CRITICAL: You are an ORCHESTRATOR, not a checker
- You do NOT check phrases yourself
- You spawn sub-agents using the Task tool and monitor their progress
- You report completion when all batches are checked

## Batch Assignments
Seeds 1-${getGoldenSeedCount(courseInfo)} are golden (skip). Remaining seeds split into batches:

${batchList}

## Step 1: Spawn ALL Sub-Agents In One Message

**CRITICAL: You MUST send ALL Task tool calls in a SINGLE message.** Do NOT spawn one, wait, then spawn the next. Send one message containing one Task tool call per batch — all at once. This is how parallel execution works. If you spawn them sequentially the QA will take 10x longer.

For each batch, use this prompt template (customize start/end for each):

---BEGIN SUB-AGENT PROMPT---
You are a naturalness QA checker for course ${courseCode} (${langName}). You are checking USE phrases only for seeds {START} to {END}.

## Your Job

For each USE phrase pair (known_text + target_text), check BOTH sides independently:

**Known text (English):** Is this grammatically correct, natural English that a real person would say?
**Target text (${langName}):** Is this grammatically correct, natural ${langName} that a native speaker would say?

Flag the phrase if EITHER side fails ANY of these checks:

### Grammar Errors (EITHER language) — flag ALL of these:
- Wrong verb form: "I want going" (should be "I want to go"), "de comprends" (should be "de comprendre")
- Wrong reflexive pronoun: "je veux s'occuper" (should be "m'occuper"), "I speak with me" (should be "with you")
- Missing elision: "de essayer" (should be "d'essayer"), "je ai" (should be "j'ai")
- Wrong mood: "je veux que tu comprends" (should be subjunctive "comprennes")
- Missing negation word: "je ne sais" without "pas" when "pas" is needed
- Wrong preposition: "j'essaie à comprendre" (should be "de comprendre")
- Wrong pronoun placement: "comprendre toi" (should be "te comprendre")
- Gender/number agreement errors: "des choses différents" (should be "différentes")
- ANY other grammar error in either language — if a native speaker would notice it, flag it

### Naturalness — flag if:
- Nobody would actually say this in conversation (stilted, textbook, contrived)
- Semantic nonsense: "I'm starting to finish", "today or yesterday", "I want to feel tired"
- Subject-object conflict: "I like speaking French with me"
- Time contradictions: "I don't worry yesterday" (present + past)
- Incomplete thoughts that trail off without meaning

### Meaning Match — flag if:
- The two sides don't match in meaning
- One side says something significantly different from the other

**IGNORE ALL FORMATTING:**
- Do NOT flag missing capitalization (e.g. "i want to speak italian" is perfectly fine)
- Do NOT flag missing punctuation (no periods, question marks, or commas needed — these are SPOKEN phrases, not written text)
- Do NOT flag missing accents/diacritics — these are a known normalization issue, not content errors
- Punctuation, capitalisation, and diacritics are IRRELEVANT. Only the spoken content matters.

You do NOT fix phrases. You FLAG every phrase that has a problem for deletion.
**Do NOT be conservative.** If a phrase has a grammar error, flag it. If a native speaker would wince, flag it. The cost of missing a bad phrase is far higher than the cost of flagging one that's borderline.

## Workflow

### Step 1: Fetch USE phrases for your seed range
Use the Bash tool with curl to paginate through USE phrases:

\`\`\`
OFFSET=0
while true; do
  RESULT=$(curl -s "http://localhost:3471/api/phrases/${courseCode}?seed_min={START}&seed_max={END}&role=use&limit=500&offset=$OFFSET")
  COUNT=$(echo "$RESULT" | jq '.count')
  echo "$RESULT"
  if [ "$COUNT" -lt 500 ]; then break; fi
  OFFSET=$((OFFSET + 500))
done
\`\`\`

Each phrase has: id, known_text, target_text, seed_number, lego_index, phrase_role.

### Step 2: Evaluate each phrase
For each phrase, check both the known (English) and target (${langName}) text:

- If BOTH sides are grammatically correct, natural, and match in meaning → move on
- If EITHER side has a grammar error, is unnatural, or the meanings don't match → add to your flags list

### Step 3: Submit flags (if any)
Collect all flags and submit in one bulk call:

\`\`\`
curl -s -X POST "http://localhost:3471/api/qa/bulk-flag" \\
  -H "Content-Type: application/json" \\
  -d '{"flags": [
    {"course_code": "${courseCode}", "phrase_id": "<the phrase uuid>", "seed_number": <N>, "check_type": "<grammar|naturalness|meaning_mismatch>", "severity": "error", "issue": "<brief reason — say which language and what's wrong>", "details": {"known": "<known_text>", "target": "<target_text>", "phrase_role": "<build/use>"}},
    ...
  ]}'
\`\`\`

### Step 4: Mark range as checked
After checking ALL phrases (whether or not you found flags), mark the entire range:

\`\`\`
curl -s -X POST "http://localhost:3471/api/qa/bulk-mark-checked" \\
  -H "Content-Type: application/json" \\
  -d '{"course_code": "${courseCode}", "seed_min": {START}, "seed_max": {END}}'
\`\`\`

## IMPORTANT
- Check EVERY phrase. Do not skip any.
- Check BOTH languages independently. A phrase with perfect English but broken ${langName} grammar MUST be flagged. A phrase with perfect ${langName} but broken English MUST be flagged.
- Do NOT be lenient. If a native speaker of either language would notice an error, flag it. The cost of a bad phrase reaching learners is far higher than the cost of over-flagging.
- You are running unattended. NEVER ask questions. Process all phrases and submit results.
---END SUB-AGENT PROMPT---

IMPORTANT: When spawning sub-agents via the Task tool:
- Use subagent_type: "general-purpose"
- Set run_in_background: true for each
- Use model: "sonnet" (Sonnet for language evaluation)
- Keep the description short: "QA seeds {start}-{end} for ${courseCode}"

## Step 2: Monitor Progress

After spawning all sub-agents, poll progress every 60 seconds:

\`\`\`
curl -s http://localhost:3471/api/qa/summary/${courseCode}
\`\`\`

This returns { phrases: { total, checked, unchecked, progress_percent }, flags: { total, open, errors, warnings } }.

Use the Bash tool with curl to poll. Wait 60 seconds between polls (use sleep 60).

When progress_percent reaches 100 (or unchecked reaches 0), the QA pass is complete.

If progress stalls (no change for 5 minutes), check sub-agent output files and report the issue. If a sub-agent failed, spawn a replacement for its seed range.

## Step 3: Report

When all batches are checked, summarise:
- Total phrases checked
- Flags raised (count)
- Any batches that failed

## AUTONOMY
You are running unattended. NEVER ask questions.
- Make decisions yourself
- If a sub-agent fails, spawn a replacement
- Keep going until all batches are checked
`;
}

/**
 * Generate a STRICT QA brief for seeds 1-50.
 * Golden seeds are known-good calibration — if the agent flags them, it's miscalibrated.
 * Seeds after golden range get the higher bar: naturalness, variety, BUILD phrase quality.
 */
function generateStrictQABrief({ courseCode, courseInfo }) {
  const langName = courseInfo?.display_name || courseCode;
  const goldenCount = getGoldenSeedCount(courseInfo);

  return `# Strict QA Pass — Seeds 1-50 (${courseCode})

You are running a HIGH-STANDARD quality review of the first 50 seeds of course **${courseCode}** (${langName}).

## Calibration: Seeds 1-${goldenCount}

Seeds 1-${goldenCount} were hand-crafted by expert course designers. They are intentionally perfect examples of the SSi methodology. You MUST review them first.

**If you flag ANY phrase from seeds 1-${goldenCount}, your calibration is wrong.** Seeds 1-${goldenCount} set the quality bar — study them to understand what GOOD looks like before reviewing ${goldenCount + 1}-50.

Characteristics of good phrases (learn from seeds 1-${goldenCount}):
- BUILD phrases show genuine recombination: the new LEGO combined with previously introduced LEGOs in a way that demonstrates how pieces "plug in"
- USE phrases are complete sentences a real learner would actually say out loud in conversation
- Each USE phrase for a LEGO shows a genuinely DIFFERENT context — not slight rewordings
- Fragments and partial sentences are fine for BUILD (they're building blocks), but they should still show an interesting combination

## Your Four Checks (seeds ${goldenCount + 1}-50 only)

After calibrating on 1-${goldenCount}, review ALL phrases (BUILD and USE) for seeds ${goldenCount + 1}-50. Flag for DELETION if:

### 1. GRAMMAR (BOTH LANGUAGES)
Is the phrase grammatically correct in BOTH the known language (English) and the target language (${langName})?
- Flag: ANY grammar error in either language — wrong verb form, wrong pronoun, missing elision, wrong mood, agreement errors, etc.
- Flag: "I want going" (should be "I want to go"), "je veux s'occuper" (should be "m'occuper")
- Flag: wrong preposition, missing negation word, wrong pronoun placement
- This is the MOST IMPORTANT check. Grammar errors teach learners wrong patterns.

### 2. NATURALNESS
Would a real person say this in conversation? Not just "is it grammatical" but "would someone actually say this?"
- Flag: stilted, textbook-sounding, or contrived phrases
- Flag: semantic nonsense ("I'm starting to finish", "I want to feel tired", "today or yesterday")
- Flag: subject-object conflicts ("I like speaking with me"), time contradictions ("I don't worry yesterday")
- Keep: everyday speech, things learners are dying to say, natural conversation

### 3. VARIETY
Are the phrases for each LEGO showing genuinely different contexts?
- Flag: near-duplicates (same sentence with one word swapped, e.g. "I want to speak now" / "I want to speak today")
- Flag: phrases that all follow the exact same pattern (e.g. all "I want to X" with different X)
- Keep: phrases that show the LEGO in surprising or varied contexts

### 4. BUILD PHRASE QUALITY
Do BUILD phrases demonstrate meaningful recombination?
- Flag: BUILD phrases that are just the LEGO by itself with no combination
- Flag: BUILD phrases that add meaningless filler (e.g. LEGO + "here" or LEGO + "please")
- Keep: BUILD phrases that combine the new LEGO with previously introduced LEGOs in a way that clicks

## CRITICAL RULES
- **IGNORE punctuation and capitalisation entirely** — these are spoken phrases
- **IGNORE missing accents/diacritics** — these are a known normalization issue, not content errors
- **Grammar errors in EITHER language MUST be flagged** — this is the primary quality gate
- **Seeds 1-${goldenCount}: review but DO NOT flag** — they calibrate your judgment
- **Seeds ${goldenCount + 1}-50: flag for deletion** anything that fails grammar, naturalness, variety, or BUILD quality
- If a phrase has a grammar error, it MUST be flagged regardless of how natural it sounds otherwise

## Workflow

### Step 1: Fetch ALL phrases for seeds 1-50
\`\`\`
curl -s "http://localhost:3471/api/phrases/${courseCode}?seed_min=1&seed_max=50&limit=2000"
\`\`\`

### Step 2: Study seeds 1-${goldenCount} carefully
Read every phrase. Understand what good BUILD and USE phrases look like. Note patterns.

### Step 3: Review seeds ${goldenCount + 1}-50
For each phrase, apply the four checks. Collect flags.

### Step 4: Submit flags
\`\`\`
curl -s -X POST "http://localhost:3471/api/qa/bulk-flag" \\
  -H "Content-Type: application/json" \\
  -d '{"flags": [
    {"course_code": "${courseCode}", "phrase_id": "<uuid>", "seed_number": <N>, "check_type": "<grammar|naturalness|variety|build_quality>", "severity": "<error for grammar, warning for others>", "issue": "<brief reason — say which language and what's wrong>", "details": {"known": "<known_text>", "target": "<target_text>", "phrase_role": "<build/use>"}},
    ...
  ]}'
\`\`\`

### Step 5: Mark seeds 1-50 as checked
\`\`\`
curl -s -X POST "http://localhost:3471/api/qa/bulk-mark-checked" \\
  -H "Content-Type: application/json" \\
  -d '{"course_code": "${courseCode}", "seed_min": 1, "seed_max": 50}'
\`\`\`

### Step 6: Report
Summarise:
- How many phrases you reviewed
- How golden seeds calibrated your judgment (what you learned about the quality bar)
- Flags raised for non-golden seeds by category (grammar / naturalness / variety / build quality)
- Grammar flags broken down by language (English errors vs ${langName} errors)
- Any seeds that are particularly weak overall

## AUTONOMY
You are running unattended. NEVER ask questions. Process everything and submit results.
Do NOT spawn sub-agents — this is a single focused review of ~500-700 phrases. Do it yourself.
`;
}

/**
 * Generate the Creator agent brief for golden seed building.
 * The Creator builds decompositions for seeds 1-N, submits them, and handles revision cycles.
 */
function generateGoldenCreatorBrief({ courseCode, courseInfo, targetSeeds, crossCourseSummaries, translationDoctrine }) {
  const langName = courseInfo?.display_name || courseCode;
  const targetLang = courseCode.split('_')[0];

  return `# Golden Seed Creator — ${courseCode} (${langName})

You are building the first ${targetSeeds} golden seed decompositions for **${courseCode}** (${langName}).
These golden seeds will calibrate all future autonomous agents for this course. Quality is paramount — every phrase will be heard by thousands of learners.

## Your Role

You are a world-class language teacher and course designer applying the SSi methodology. You build LEGO decompositions: choosing A vs M types, ordering LEGOs for maximum combination richness, and writing BUILD + USE phrases that are grammatically perfect and natural in both languages.

## SSi Methodology — Key Rules

### LEGO Types
- **A-LEGO (Atomic)**: Single meaningful word. Often appears inside M-LEGOs to create overlaps.
- **M-LEGO (Molecular)**: Multi-word phrase. Has \`components\` array showing its building blocks.
- **Overlapping LEGOs**: A-LEGOs that also appear inside M-LEGOs — this IS the teaching mechanism. The learner sees a word alone, then sees it inside a phrase, inferring the pattern without explanation.

### BUILD Phrases
- Combine the **new LEGO** with **previously introduced LEGOs**
- Show how the new piece "plugs in" to what the learner already knows
- Fragments OK — don't need to be complete sentences
- Must contain the **exact LEGO target** (case-insensitive match)
- NOT the LEGO by itself, NOT component build-up
- Flexible quantity based on LEGO length (cognitive load)

### USE Phrases
- **Complete, natural sentences** a real learner would say — NEVER fragments
- Minimum 5 per LEGO, scored 5-9
- Mix of MEDIUM (LEGO + 4-6 syllables) and LONG (LEGO + 7-10 syllables)
- Go into eternal spaced repetition — quality matters enormously
- Must contain the **exact LEGO target** (case-insensitive match)
- Score 4 or below = rewrite, don't submit

### LEGO Form Is Fixed
LEGOs must be used **exactly as-is** in all phrases — never conjugated or inflected.
If a LEGO is "ga" (ik ga), only write phrases where "ga" is the correct form.
Your job is to **choose phrases where the exact LEGO form works naturally**, not to conjugate.

### Decomposition Strategy
- Order LEGOs by combination richness — high-utility items that combine well come first
- Non-greedy: introduce A-LEGOs before their containing M-LEGOs when possible
- Structural mismatches between languages get absorbed into M-LEGOs
- Tiling: the seed CAN be recomposed from its LEGO targets (sanity check, overlaps allowed)

### Word Order Differences → M-LEGOs Are Required
When the target language orders words differently from the known language, you MUST use M-LEGOs to show the correct order. A-LEGOs alone would leave the learner guessing (and they'd guess English order, which is wrong).

**Example (Spanish adjective placement):**
\`\`\`
A-LEGO: "blue" → "azul"
A-LEGO: "thing" → "cosa"
M-LEGO: "blue thing" → "cosa azul"  ← REQUIRED — shows reversed order
\`\`\`
Without the M-LEGO, a learner with "azul" and "cosa" would say "azul cosa" (English order = wrong).
With the M-LEGO, the learner hears "cosa azul" and infers the pattern without explanation.

This applies to any word-order difference: verb position, adjective placement, particle order, prepositional phrases. **Especially early in the course**, front-load M-LEGOs that demonstrate the target language's ordering patterns. The learner needs to hear the correct assembly before they can produce it.

**Example (German subordinate clause verb-final):**
German subordinate clauses (\`weil\`, \`ob\`, \`bevor\`, \`dass\`, \`wenn\`) push the verb to the END. English keeps the verb near the subject. This is a major word-order difference that REQUIRES M-LEGOs:
\`\`\`
Already known: A "because" → "weil", M "I want" → "ich will", A "to speak" → "sprechen"
M-LEGO: "because I want to speak" → "weil ich sprechen will"  ← REQUIRED
\`\`\`
Without the M-LEGO, the learner would say "weil ich will sprechen" (English order = wrong).
The M-LEGO teaches NO new vocabulary — all parts are already known. It teaches the **reordering pattern**.
Introduce the component A-LEGOs and smaller M-LEGOs FIRST, then use the larger M-LEGO to show how they reassemble. This keeps cognitive load manageable.

### ZUT (Zero Uncertainty Test)
Same KNOWN text → same TARGET text. Always. Use different natural phrases to disambiguate.

${translationDoctrine ? `## Translation Doctrine for ${langName}\n\n${translationDoctrine}\n` : ''}
## Cross-Course Reference (How Other Languages Decomposed These Seeds)

Study these summaries to understand decomposition patterns. For full detail on any seed, fetch from the API.

${crossCourseSummaries || '(No cross-course calibrations available yet — you are pioneering!)'}

## Protocol — For Each Seed N (1 → ${targetSeeds})

### Step 1: Fetch cross-course examples
\`\`\`bash
curl -s "http://localhost:3471/api/calibrations/seed/$N"
\`\`\`
Study how other languages decomposed this seed. Look for patterns in A vs M decisions, LEGO ordering, and key insights.

### Step 2: Fetch current vocabulary
\`\`\`bash
curl -s "http://localhost:3471/api/vocab/${courseCode}?seed=$N"
\`\`\`
This shows all LEGOs introduced in seeds before N. Your BUILD/USE phrases can ONLY use this vocabulary plus the new LEGOs you introduce.

### Step 3: Fetch the seed translation
\`\`\`bash
curl -s "http://localhost:3471/api/seeds/${courseCode}" | jq '.seeds[] | select(.seed_number == '$N')'
\`\`\`

### Step 4: Build the decomposition
Design LEGOs (A/M types, ordering) and write BUILD + USE phrases. Consider:
- What LEGOs maximize combination richness with existing vocabulary?
- Would overlapping LEGOs help teach a pattern?
- Are BUILD phrases showing genuine "plug-in" value?
- Are USE phrases things a real learner would say?

### Step 5: Submit
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/seed/complete?course=${courseCode}&skip_validation=true" \\
  -H "Content-Type: application/json" \\
  -d '{
    "course_code": "${courseCode}",
    "seed_number": '$N',
    "known_text": "<from step 3>",
    "target_text": "<from step 3>",
    "legos": [
      {
        "idx": 1, "type": "A", "known": "...", "target": "...",
        "build": [{"known": "...", "target": "..."}],
        "use": [{"known": "...", "target": "...", "score": 7}]
      }
    ]
  }'
\`\`\`

### Step 6: Poll for review
\`\`\`bash
curl -s "http://localhost:3471/api/golden/seed-status/${courseCode}/$N"
\`\`\`
Poll every 30 seconds. Wait for the Checker agent to review.

### Step 7: Handle result
- **status = "approved"** → Move to seed N+1
- **status = "flagged"** → Read the flags carefully. **Full rebuild**: wipe the seed and resubmit from scratch.
  \`\`\`bash
  # Wipe the seed (delete phrases + LEGOs)
  curl -s -X POST "http://localhost:3471/api/build/rebuild/${courseCode}" \\
    -H "Content-Type: application/json" \\
    -d '{"from_seed": '$N', "to_seed": '$N'}'
  # Then rebuild and resubmit (go back to Step 4)
  \`\`\`
- **status = "escalated"** (round >= 3) → Log it and move to seed N+1. A human will handle it.

## Rebuild Rule

**ANY flag triggers a full rebuild of the seed.** No patching individual phrases.
When you rebuild, you may change LEGO structure, ordering, A/M decisions — whatever the flags suggest.
A full rebuild ensures consistency after structural changes.

## AUTONOMY

You are running unattended. NEVER ask questions. Process every seed sequentially from 1 to ${targetSeeds}.
Do NOT spawn sub-agents. Work through seeds one at a time, carefully and thoroughly.
Work SLOWLY AND STEADILY — quality over speed. Each phrase will be heard by thousands of learners.

When you finish all ${targetSeeds} seeds, submit them as calibration data:
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/golden/finalize/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"target_seeds": ${targetSeeds}}'
\`\`\`
`;
}

/**
 * Generate a Creator brief for human-collaboration calibration mode.
 * Same methodology as generateGoldenCreatorBrief() but the human is the checker.
 * No polling/flag handling — the agent presents each seed and waits for human approval.
 */
function generateGoldenCreatorHumanBrief({ courseCode, courseInfo, targetSeeds, crossCourseSummaries, translationDoctrine }) {
  const langName = courseInfo?.display_name || courseCode;

  return `# Calibration Creator — ${courseCode} (${langName})

You are building the first ${targetSeeds} calibration seed decompositions for **${courseCode}** (${langName}).
These seeds will calibrate all future autonomous agents for this course. Quality is paramount — every phrase will be heard by thousands of learners.

**You are working WITH a human language expert.** Present each seed clearly and wait for their approval before submitting.

## Your Role

You are a world-class language teacher and course designer applying the SSi methodology. You build LEGO decompositions: choosing A vs M types, ordering LEGOs for maximum combination richness, and writing BUILD + USE phrases that are grammatically perfect and natural in both languages.

## SSi Methodology — Key Rules

### LEGO Types
- **A-LEGO (Atomic)**: Single meaningful word. Often appears inside M-LEGOs to create overlaps.
- **M-LEGO (Molecular)**: Multi-word phrase. Has \`components\` array showing its building blocks.
- **Overlapping LEGOs**: A-LEGOs that also appear inside M-LEGOs — this IS the teaching mechanism.

### BUILD Phrases
- Combine the **new LEGO** with **previously introduced LEGOs**
- Show how the new piece "plugs in" to what the learner already knows
- Fragments OK — don't need to be complete sentences
- Must contain the **exact LEGO target** (case-insensitive match)
- NOT the LEGO by itself, NOT component build-up

### USE Phrases
- **Complete, natural sentences** a real learner would say — NEVER fragments
- Minimum 5 per LEGO, scored 5-9
- Mix of MEDIUM (LEGO + 4-6 syllables) and LONG (LEGO + 7-10 syllables)
- Must contain the **exact LEGO target** (case-insensitive match)

### LEGO Form Is Fixed
LEGOs must be used **exactly as-is** in all phrases — never conjugated or inflected.
Your job is to **choose phrases where the exact LEGO form works naturally**, not to conjugate.

### Decomposition Strategy
- Order LEGOs by combination richness — high-utility items that combine well come first
- Non-greedy: introduce A-LEGOs before their containing M-LEGOs when possible
- Structural mismatches between languages get absorbed into M-LEGOs
- Tiling: the seed CAN be recomposed from its LEGO targets (overlaps allowed)

### Word Order Differences → M-LEGOs Are Required
When the target language orders words differently from the known language, you MUST use M-LEGOs to show the correct order.

### ZUT (Zero Uncertainty Test)
Same KNOWN text → same TARGET text. Always.

${translationDoctrine ? `## Translation Doctrine for ${langName}\n\n${translationDoctrine}\n` : ''}
## Cross-Course Reference

${crossCourseSummaries || '(No cross-course calibrations available yet — you are pioneering!)'}

## Protocol — For Each Seed N (1 → ${targetSeeds})

### Step 1: Fetch cross-course examples
\`\`\`bash
curl -s "http://localhost:3471/api/calibrations/seed/$N"
\`\`\`

### Step 2: Fetch current vocabulary
\`\`\`bash
curl -s "http://localhost:3471/api/vocab/${courseCode}?seed=$N"
\`\`\`

### Step 3: Fetch the seed translation
\`\`\`bash
curl -s "http://localhost:3471/api/seeds/${courseCode}" | jq '.seeds[] | select(.seed_number == '$N')'
\`\`\`

### Step 4: Build the decomposition
Design LEGOs (A/M types, ordering) and write BUILD + USE phrases.

### Step 5: Present to human for review
**BEFORE submitting**, present your decomposition clearly:

\`\`\`
=== SEED $N ===
Known: "..."
Target: "..."

L1 [A] "known" → "target"
  BUILD: ...
  USE: ...

L2 [M] "known" → "target"
  Components: ...
  BUILD: ...
  USE: ...

Ready to submit? (waiting for approval)
\`\`\`

**Wait for the human to say "approved", "yes", "go", or similar** before submitting.
If they give feedback, revise and present again.

### Step 6: Submit (only after human approval)
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/seed/complete?course=${courseCode}&skip_validation=true" \\
  -H "Content-Type: application/json" \\
  -d '{...}'
\`\`\`

### Step 7: Move to next seed
No polling needed — the human is your checker. After submission, move to seed N+1.

## AUTONOMY

You are working WITH a human. Present each seed clearly. Wait for approval before submitting.
Do NOT spawn sub-agents. Work through seeds one at a time, carefully and thoroughly.
Work SLOWLY AND STEADILY — quality over speed. Each phrase will be heard by thousands of learners.

When you finish all ${targetSeeds} seeds, submit them as calibration data:
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/golden/finalize/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"target_seeds": ${targetSeeds}}'
\`\`\`
`;
}

/**
 * Generate the Checker agent brief for golden seed quality review.
 * The Checker reviews each seed for grammar, naturalness, and pedagogical quality.
 */
function generateGoldenCheckerBrief({ courseCode, courseInfo, targetSeeds, crossCourseSummaries, translationDoctrine }) {
  const langName = courseInfo?.display_name || courseCode;

  return `# Golden Seed Checker — ${courseCode} (${langName})

You are the quality reviewer AND fixer for golden seed decompositions of **${courseCode}** (${langName}).
Your job is to ensure every seed is grammatically correct, natural in both languages, and pedagogically powerful.
These ${targetSeeds} golden seeds will calibrate ALL future autonomous agents — your review determines the quality bar.

## Your Role

You are a meticulous linguist and pedagogy expert. You review each seed's LEGO decomposition and every BUILD/USE phrase against strict criteria.

**When you find issues, YOU fix them directly** — do not flag and wait. You wipe the seed, rebuild it with corrections, and resubmit. You are both reviewer and editor.
The Creator agent does the first draft. You polish it to perfection.

## SSi Methodology — Key Rules

### BUILD Phrases
- Combine the **new LEGO** with **previously introduced LEGOs**
- Show how the new piece "plugs in" — NOT the LEGO by itself, NOT component build-up
- Fragments OK, must contain exact LEGO target

### USE Phrases
- Complete, natural sentences for eternal spaced repetition
- Must be things a real learner would say
- Scored 5-9 (4 or below = reject)
- Must contain exact LEGO target

### LEGO Form Is Fixed
LEGOs are used exactly as-is — never conjugated or inflected.
If a phrase forces wrong conjugation, it's an error.

### Word Order Differences → M-LEGOs Are Required
When the target language orders words differently from English, the decomposition MUST include M-LEGOs that show the correct order. A-LEGOs alone would leave the learner assembling words in English order (wrong).

Example: Spanish "blue thing" = "cosa azul" (reversed). Needs 3 LEGOs: A "blue"→"azul", A "thing"→"cosa", M "blue thing"→"cosa azul". Without the M-LEGO, the learner would say "azul cosa".

Flag decompositions that rely on A-LEGOs alone when word order differs between English and ${langName}. Especially critical in early seeds.

**German subordinate clause example:** \`weil\`/\`ob\`/\`bevor\`/\`dass\`/\`wenn\` push verbs to the END. If the learner knows "weil", "ich will", "sprechen" as separate LEGOs, they need an M-LEGO "because I want to speak" → "weil ich sprechen will" to see the reordering. Without it, they'd say "weil ich will sprechen" (English order = wrong). The M-LEGO teaches no new vocab — just the assembly pattern. Components should be introduced as A-LEGOs first to keep cognitive load manageable.

${translationDoctrine ? `## Translation Doctrine for ${langName}\n\n${translationDoctrine}\n` : ''}
## Cross-Course Reference

${crossCourseSummaries || '(No cross-course calibrations available yet)'}

## QA Criteria (Priority Order)

### 1. GRAMMAR (BOTH LANGUAGES) — Most Critical
- Is every phrase grammatically correct in BOTH English AND ${langName}?
- Check: verb conjugation, agreement, case, word order, prepositions, pronouns, articles
- Grammar errors teach learners wrong patterns — this is the primary quality gate

### 2. NATURALNESS
- "Would a real speaker say this?" in both languages
- Flag: stilted, textbook-sounding, contrived, semantically nonsensical
- Keep: everyday speech, things learners want to say

### 3. LEGO FORM CHECK
- Does every BUILD/USE phrase contain the **exact** LEGO target text? (case-insensitive)
- Is the LEGO form used in a context where it's grammatically correct?

### 4. PEDAGOGY — BUILD Phrase Quality
- Do BUILD phrases show genuine recombination (new LEGO + known vocabulary)?
- Are they NOT just the LEGO by itself or with meaningless filler?
- Do they demonstrate how pieces "plug in"?

### 5. PEDAGOGY — USE Phrase Quality
- Are USE phrases complete sentences (not fragments)?
- Do they show genuinely different contexts (not near-duplicates)?
- Are they things a learner would actually want to say?

### 6. DECOMPOSITION STRATEGY
- Are A vs M decisions optimal? Would different choices produce richer phrases?
- Does LEGO ordering maximize combination richness?
- Is tiling valid (seed reconstructable from LEGOs)?
- **Word order**: Where ${langName} orders words differently from English (verb position, adjective placement, subordinate clause verb-final, etc.), are there M-LEGOs showing the correct order? A-LEGOs alone for reordered elements is a flag — the learner would assemble them in English order. Check that component A-LEGOs are introduced BEFORE the larger M-LEGO to keep cognitive load manageable.

### 7. REGISTER/DIALECT
- If translation doctrine exists, check compliance (formal vs casual, regional variants)

## Protocol

### Monitor for submitted seeds
Poll every 20 seconds starting from seed 1:
\`\`\`bash
curl -s "http://localhost:3471/api/golden/seed-status/${courseCode}/$N"
\`\`\`

### When status = "submitted" with unchecked phrases:

#### Step 1: Fetch the seed's phrases
\`\`\`bash
curl -s "http://localhost:3471/api/phrases/${courseCode}?seed_min=$N&seed_max=$N&limit=500"
\`\`\`

#### Step 2: Fetch cross-course comparison
\`\`\`bash
curl -s "http://localhost:3471/api/calibrations/seed/$N"
\`\`\`

#### Step 3: Fetch the seed translation
\`\`\`bash
curl -s "http://localhost:3471/api/seeds/${courseCode}" | node -e "const d=[];process.stdin.on('data',c=>d.push(c));process.stdin.on('end',()=>{const j=JSON.parse(Buffer.concat(d));const s=j.seeds.find(x=>x.seed_number===$N);console.log(JSON.stringify(s,null,2))})"
\`\`\`

#### Step 4: Review every phrase against criteria
Go through each BUILD and USE phrase. Check grammar in both languages, naturalness, LEGO form containment, pedagogical value, decomposition strategy.

#### Step 5a: If ALL clean → Approve
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/qa/bulk-mark-checked" \\
  -H "Content-Type: application/json" \\
  -d '{"course_code": "${courseCode}", "seed_min": '$N', "seed_max": '$N'}'
\`\`\`

#### Step 5b: If issues found → FIX AND RESUBMIT (do NOT just flag)

You are the fixer. When you find issues (grammar errors, unnatural phrases, wrong A/M decisions, missing M-LEGOs for word order, weak BUILD/USE phrases), YOU fix them:

1. **Wipe the seed**:
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/build/rebuild/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"from_seed": '$N', "to_seed": '$N'}'
\`\`\`

2. **Fetch current vocabulary** (what's available from prior seeds):
\`\`\`bash
curl -s "http://localhost:3471/api/vocab/${courseCode}?seed=$N"
\`\`\`

3. **Rebuild the decomposition** with your corrections applied. You may:
   - Fix individual phrase grammar/naturalness
   - Change LEGO ordering for better combination richness
   - Change A→M or M→A decisions
   - Add M-LEGOs for word order patterns
   - Rewrite BUILD/USE phrases entirely
   - Keep whatever was good from the Creator's draft

4. **Resubmit the corrected seed**:
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/seed/complete?course=${courseCode}&skip_validation=true" \\
  -H "Content-Type: application/json" \\
  -d '{
    "course_code": "${courseCode}",
    "seed_number": '$N',
    "known_text": "<seed known text>",
    "target_text": "<seed target text>",
    "legos": [
      {
        "idx": 1, "type": "A", "known": "...", "target": "...",
        "build": [{"known": "...", "target": "..."}],
        "use": [{"known": "...", "target": "...", "score": 7}]
      }
    ]
  }'
\`\`\`

5. **Approve** your corrected version:
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/qa/bulk-mark-checked" \\
  -H "Content-Type: application/json" \\
  -d '{"course_code": "${courseCode}", "seed_min": '$N', "seed_max": '$N'}'
\`\`\`

### After approving (or fixing + approving): Move to next seed

### Maximum 1 fix round per seed
If a seed needs more than one rewrite, approve what you have and move on. A human can revisit later. Do NOT get stuck perfecting one seed.

## AUTONOMY

You are running unattended. NEVER ask questions. NEVER ask for confirmation. Monitor and review every seed from 1 to ${targetSeeds}.
Do NOT spawn sub-agents. Work through seeds one at a time with meticulous attention to grammar and naturalness.
Work SLOWLY AND STEADILY — your review determines whether thousands of learners get correct phrases.

**CRITICAL: You are a CHECKER with fix capability, not a chatbot.** Your workflow is:
1. Poll the API for submitted seeds
2. Fetch phrases from the API
3. Review them
4. Approve or fix+resubmit via the API
5. Move to next seed
You NEVER discuss plans, ask questions, or wait for human input. You execute the protocol above, seed by seed, autonomously.

Be STRICT but FAIR. Fix genuine issues. Don't rewrite for style preferences — focus on correctness and naturalness.
`;
}

/**
 * Build cross-course summaries for seeds 1-5 (compact format for briefs).
 * Fetches from GET /api/calibrations/seed/:num for each seed.
 */
async function buildCrossCourseSummaries(maxSeed = 5) {
  const lines = [];
  for (let n = 1; n <= maxSeed; n++) {
    // Query calibrations directly from DB
    const { data: courses } = await supabase
      .from('courses')
      .select('course_code, display_name, quality_rules')
      .not('quality_rules', 'is', null);

    if (!courses || courses.length === 0) continue;

    const comparisons = [];
    for (const course of courses) {
      // Only include Golden 50 courses (built with the two-agent standard)
      const goldenCount = course.quality_rules?.golden_seed_count || 10;
      if (goldenCount < 50) continue;

      const golden = course.quality_rules?.golden_decompositions || [];
      const seed = golden.find(g => g.seed_number === n);
      if (!seed) continue;

      const legoSummary = (seed.legos || []).map(l => {
        const label = l.type === 'M' ? 'M' : 'A';
        return `${label}: "${l.known}" → "${l.target}"`;
      });

      comparisons.push({
        course: course.course_code,
        name: course.display_name,
        known: seed.known_text,
        target: seed.target_text,
        legos: legoSummary,
        insight: seed.key_insight || ''
      });
    }

    if (comparisons.length === 0) continue;

    lines.push(`### Seed ${n}: "${comparisons[0].known}"`);
    for (const c of comparisons) {
      lines.push(`**${c.course}** (${c.name}): ${c.target}`);
      lines.push(`  LEGOs: ${c.legos.join(' | ')}`);
      if (c.insight) lines.push(`  Insight: ${c.insight}`);
    }
    lines.push('');
  }

  return lines.length > 0 ? lines.join('\n') : null;
}

/**
 * Generate the translation agent brief for a course.
 * Embeds the SEED Translation Doctrine and Agent Prompt inline with API workflow instructions.
 */
function generateTranslationBrief(courseCode, courseInfo, seedCount) {
  const targetLanguageName = getLanguageName(courseCode);
  const knownLangCode = courseCode.split('_for_')[1] || 'eng';
  const knownLanguageName = getLanguageName(knownLangCode + '_placeholder') || 'English';
  // getLanguageName extracts first 3 chars, so we need a direct lookup for known language
  const knownLangMap = {
    'eng': 'English', 'fra': 'French', 'spa': 'Spanish', 'deu': 'German',
    'ita': 'Italian', 'por': 'Portuguese', 'nld': 'Dutch', 'jpn': 'Japanese',
    'kor': 'Korean', 'ara': 'Arabic', 'rus': 'Russian', 'cym': 'Welsh', 'zho': 'Chinese'
  };
  const knownName = knownLangMap[knownLangCode] || knownLangCode;
  const displayName = courseInfo?.display_name || courseCode;

  return `# Seed Translation Agent — ${courseCode}

You are translating ${seedCount} seed sentences into ${targetLanguageName}.
Your goal is learner confidence, not native perfection.

## Translation Doctrine

# SEED Translation Doctrine v1.0
## Confidence-First, Hardest-Working Vocabulary Method

### Purpose
This document defines the canonical method for translating the **668 SEED sentences**
into any target language in a way that:

- maximises learner confidence
- minimises decision paralysis
- enables early spoken production
- stays portable across unrelated language families
- supports audio-first, grammar-implicit learning

This doctrine is language-agnostic and has been validated across:
- Italian
- Spanish
- French (full 668)
- Arabic (MSA)
- Mandarin Chinese

---

## Core Principle
At any given stage, each English intention should map to the fewest possible
target-language forms that remain natural and understandable.

**Clarity beats nuance.**
**Predictability beats elegance.**
**Confidence beats completeness.**

---

## Structural Phases

### Phase 1 — Stabilisation (SEEDs 1–150)
**Goal:** Enable learners to *say things* without hesitation.

Rules:
- Aggressively minimise variation.
- Prefer a single "hardest-working" verb/structure per function.
- Avoid synonym drift.
- Prefer transparent, spoken constructions over idioms.
- Grammar appears only when structurally unavoidable, never explained.

Avoid:
- register switching
- stylistic upgrades
- native-speaker optimisation

---

### Phase 2 — Controlled Flexibility (SEEDs 151–300)
**Goal:** Expand expressive range *without introducing uncertainty*.

Rules:
- Phase 1 mappings remain valid.
- Limited variation is allowed **only when it does not create choice anxiety**.
- New forms may appear if high-frequency and non-competing.
- Variation is additive, not substitutive.

---

### Phase 3 — Natural Range (SEEDs 301–668)
**Goal:** Support real-world conversational range.

Rules:
- Natural variation and idioms may appear.
- Earlier mappings are never contradicted or invalidated.
- The learner's mental model **expands**, not fragments.

---

## Language-Agnostic Design Rules
- Choose **hardest-working vocabulary** (broad, reusable, forgiving).
- Prefer predictable syntax over clever idiomatic choices.
- Avoid early register/politeness/stylistic decisions.
- Grammar remains implicit and experiential.
- Output must work spoken, even when imperfectly produced.

---

## Success Criteria
A translation is correct **if and only if** it:
- enables productive reuse by a beginner
- reduces hesitation
- avoids forcing early "which one should I use?" decisions

Native-speaker perfection is not the metric.
Learner momentum is.

---

## Agent Prompt

SEED TRANSLATION AGENT PROMPT v1.0

You are translating a fixed set of ${seedCount} SEED sentences for language learning.
Your goal is learner confidence, not native perfection.

CORE RULE
At any given stage, each English intention must map to the fewest possible
target-language forms that remain natural and understandable.

Clarity > nuance
Predictability > elegance
Confidence > completeness

PHASES

Phase 1 (1–150): Stabilisation
- Aggressively minimise variation
- One "hardest-working" form per function
- No synonym drift
- Spoken, transparent constructions
- Grammar only when unavoidable (never explained)

Phase 2 (151–300): Controlled Flexibility
- Phase-1 mappings remain valid
- Limited variation only if it does not create choice anxiety
- Variation is additive, never substitutive

Phase 3 (301–668): Natural Range
- Natural variation/idioms allowed
- Earlier forms never invalidated

GLOBAL RULES
- Hardest-working vocabulary
- Predictable syntax
- Avoid early register/politeness decisions
- Audio-first robustness

SUCCESS TEST
A translation is correct if it reduces hesitation and enables reuse.

## API Workflow

1. Fetch seeds needing translation:
   curl -s "http://localhost:3471/api/course/${courseCode}/translate"

2. Translate in batches of 50. Submit each batch:
   curl -X POST "http://localhost:3471/api/course/${courseCode}/translate" \\
     -H "Content-Type: application/json" \\
     -d '{ "translations": [{ "seed_number": 1, "target_text": "..." }, ...] }'

3. Repeat until all ${seedCount} seeds have target translations.

4. Write a translation analysis and submit:
   curl -X POST "http://localhost:3471/api/course/${courseCode}/analysis" \\
     -H "Content-Type: application/json" \\
     -d '{ "analysis": {
       "generated_at": "<ISO timestamp>",
       "seeds_analyzed": ${seedCount},
       "register": { "choice": "...", "markers": ["..."] },
       "problem_verbs": ["..."],
       "golden_keys": ["..."],
       "zut_concerns": ["..."]
     }}'

## Key Context
- Course: ${courseCode} (${displayName})
- Known language: ${knownName} (already populated in course_seeds)
- Target language: ${targetLanguageName} (you provide these translations)
- Work through ALL phases: 1-150 (Stabilisation), 151-300 (Controlled Flexibility), 301-${seedCount} (Natural Range)
- Same concept = same word throughout. Build a glossary as you go.
- The analysis at the end captures register decisions, tricky verbs, and ZUT concerns for Pass 2 agents.

## IMPORTANT
You are running unattended. NEVER ask questions. Process everything and submit results.
Do NOT spawn sub-agents — translate all seeds yourself sequentially.
Work SLOWLY AND STEADILY — quality over speed.
`;
}

/**
 * Spawn two golden seed builder agents (Creator + Checker) for a course.
 * Returns job info. Supports dry_run mode to preview briefs without spawning.
 */
async function spawnGoldenBuildAgents(courseCode, targetSeeds = 50, terminal = 'iTerm2', dryRun = false, phase = 'golden') {
  // Fetch course info
  const { data: courseInfo, error: courseErr } = await supabase
    .from('courses')
    .select('display_name, seed_count, quality_rules, translation_analysis')
    .eq('course_code', courseCode)
    .single();
  if (courseErr) throw new Error(`Course not found: ${courseCode}`);

  // Build cross-course summaries for seeds 1-5
  const crossCourseSummaries = await buildCrossCourseSummaries(5);

  // Extract translation doctrine if available
  const translationDoctrine = courseInfo.quality_rules?.target_language_guidance
    ? JSON.stringify(courseInfo.quality_rules.target_language_guidance, null, 2)
    : null;

  const briefParams = { courseCode, courseInfo, targetSeeds, crossCourseSummaries, translationDoctrine };

  const isCalibration = phase === 'calibration';
  const creatorBrief = isCalibration
    ? generateGoldenCreatorHumanBrief(briefParams)
    : generateGoldenCreatorBrief(briefParams);
  const checkerBrief = isCalibration ? null : generateGoldenCheckerBrief(briefParams);
  const buildMode = isCalibration ? 'calibration' : 'golden';

  if (dryRun) {
    return {
      dry_run: true,
      phase,
      creator_brief: creatorBrief,
      checker_brief: checkerBrief,
      target_seeds: targetSeeds
    };
  }

  // Write briefs to temp files
  const fs = require('fs');
  const ts = Date.now();
  const creatorFile = `/tmp/golden_creator_${courseCode}_${ts}.md`;
  fs.writeFileSync(creatorFile, creatorBrief);

  let checkerFile = null;
  if (checkerBrief) {
    checkerFile = `/tmp/golden_checker_${courseCode}_${ts}.md`;
    fs.writeFileSync(checkerFile, checkerBrief);
  }

  const projectDir = __dirname.replace('/services', '');
  const effectiveTerminal = SPAWN_MODE === 'headless' ? 'headless' : terminal;

  // Create build_jobs record
  let jobId = null;
  try {
    const { data: jobData, error: jobError } = await supabase
      .from('build_jobs')
      .insert({
        course_code: courseCode,
        pass: 'golden',
        status: 'running',
        current_seed: 0,
        seeds_completed: 0,
        total_seeds: targetSeeds,
        started_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
        requested_by: 'dashboard',
        terminal: effectiveTerminal,
        agent_count: isCalibration ? 1 : 2,
        respawn_count: 0,
        machine_name: MACHINE_NAME,
        build_mode: buildMode
      })
      .select('id')
      .single();
    if (!jobError && jobData) jobId = jobData.id;
  } catch (e) {
    console.error('[GOLDEN] Failed to create build_jobs record:', e.message);
  }

  // Spawn Creator agent
  const creatorCmd = `cd "${projectDir}" && claude --model opus --dangerously-skip-permissions "$(cat ${creatorFile})"`;
  const creatorLabel = isCalibration ? 'Calibration Creator' : 'Golden Creator';

  console.log(`[GOLDEN] Spawning ${creatorLabel} for ${courseCode} in ${effectiveTerminal} (phase: ${phase})`);

  if (effectiveTerminal === 'headless') {
    const logsDir = require('path').join(projectDir, 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

    const logFile = `${logsDir}/golden-creator-${courseCode}.log`;
    const out = fs.openSync(logFile, 'a');
    const err = fs.openSync(logFile, 'a');

    const agent = spawn('bash', ['-c', creatorCmd], { stdio: ['ignore', out, err], detached: true });
    agent.unref();
    console.log(`[GOLDEN] Creator launched headless (pid: ${agent.pid}, log: ${logFile})`);
  } else {
    const escapedCreatorCmd = creatorCmd.replace(/"/g, '\\"');
    const osascriptCreator = effectiveTerminal === 'iTerm2'
      ? `tell application "iTerm"
  activate
  set newWindow to (create window with default profile)
  tell current session of newWindow
    set name to "${creatorLabel}: ${courseCode}"
    write text "${escapedCreatorCmd}"
  end tell
end tell`
      : `tell application "Terminal"
  activate
  do script "${escapedCreatorCmd}"
end tell`;

    const creatorAgent = spawn('osascript', ['-e', osascriptCreator], { stdio: 'pipe', detached: true });
    creatorAgent.on('error', (e) => console.error('[GOLDEN] Creator osascript error:', e.message));
    creatorAgent.on('exit', (code) => console.log(`[GOLDEN] Creator terminal launched (osascript exit: ${code})`));
  }

  // Only spawn Checker for golden phase (not calibration — human is the checker)
  if (!isCalibration) {
    // Wait 5 seconds before spawning Checker
    await new Promise(resolve => setTimeout(resolve, 5000));

    const checkerCmd = `cd "${projectDir}" && claude --model opus --dangerously-skip-permissions "$(cat ${checkerFile})"`;

    console.log(`[GOLDEN] Spawning Checker for ${courseCode} in ${effectiveTerminal}`);

    if (effectiveTerminal === 'headless') {
      const logsDir = require('path').join(projectDir, 'logs');

      const logFile = `${logsDir}/golden-checker-${courseCode}.log`;
      const out = fs.openSync(logFile, 'a');
      const err = fs.openSync(logFile, 'a');

      const agent = spawn('bash', ['-c', checkerCmd], { stdio: ['ignore', out, err], detached: true });
      agent.unref();
      console.log(`[GOLDEN] Checker launched headless (pid: ${agent.pid}, log: ${logFile})`);
    } else {
      const escapedCheckerCmd = checkerCmd.replace(/"/g, '\\"');
      const osascriptChecker = effectiveTerminal === 'iTerm2'
        ? `tell application "iTerm"
  activate
  set newWindow to (create window with default profile)
  tell current session of newWindow
    set name to "Golden Checker: ${courseCode}"
    write text "${escapedCheckerCmd}"
  end tell
end tell`
        : `tell application "Terminal"
  activate
  do script "${escapedCheckerCmd}"
end tell`;

      const checkerAgent = spawn('osascript', ['-e', osascriptChecker], { stdio: 'pipe', detached: true });
      checkerAgent.on('error', (e) => console.error('[GOLDEN] Checker osascript error:', e.message));
      checkerAgent.on('exit', (code) => console.log(`[GOLDEN] Checker terminal launched (osascript exit: ${code})`));
    }
  }

  const agentDesc = isCalibration ? 'Creator agent (human-collaboration)' : 'Creator + Checker agents';
  return {
    ok: true,
    course_code: courseCode,
    job_id: jobId,
    phase,
    target_seeds: targetSeeds,
    creator_brief_file: creatorFile,
    checker_brief_file: checkerFile,
    message: `${isCalibration ? 'Calibration' : 'Golden'} build started — ${agentDesc} spawned for seeds 1-${targetSeeds}`
  };
}

/**
 * Spawn a translation agent for a course.
 * Spawns a single Opus agent to translate all seeds using the confidence-first methodology.
 */
async function spawnTranslationAgent(courseCode, terminal = 'iTerm2', dryRun = false) {
  // Fetch course info
  const { data: courseInfo, error: courseErr } = await supabase
    .from('courses')
    .select('display_name, seed_count, quality_rules')
    .eq('course_code', courseCode)
    .single();
  if (courseErr) throw new Error(`Course not found: ${courseCode}`);

  const seedCountVal = courseInfo.seed_count || 668;
  const brief = generateTranslationBrief(courseCode, courseInfo, seedCountVal);

  if (dryRun) {
    return {
      dry_run: true,
      brief,
      seed_count: seedCountVal
    };
  }

  // Write brief to temp file
  const fs = require('fs');
  const ts = Date.now();
  const briefFile = `/tmp/translate_${courseCode}_${ts}.md`;
  fs.writeFileSync(briefFile, brief);

  const projectDir = __dirname.replace('/services', '');
  const effectiveTerminal = SPAWN_MODE === 'headless' ? 'headless' : terminal;

  // Create build_jobs record
  let jobId = null;
  try {
    const { data: jobData, error: jobError } = await supabase
      .from('build_jobs')
      .insert({
        course_code: courseCode,
        pass: 'translate',
        status: 'running',
        current_seed: 0,
        seeds_completed: 0,
        total_seeds: seedCountVal,
        started_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
        requested_by: 'dashboard',
        terminal: effectiveTerminal,
        agent_count: 1,
        respawn_count: 0,
        machine_name: MACHINE_NAME,
        build_mode: 'translate'
      })
      .select('id')
      .single();
    if (!jobError && jobData) jobId = jobData.id;
  } catch (e) {
    console.error('[TRANSLATE] Failed to create build_jobs record:', e.message);
  }

  // Spawn translation agent
  const claudeCmd = `cd "${projectDir}" && claude --model opus --dangerously-skip-permissions "$(cat ${briefFile})"`;

  console.log(`[TRANSLATE] Spawning translation agent for ${courseCode} in ${effectiveTerminal}`);

  if (effectiveTerminal === 'headless') {
    const logsDir = require('path').join(projectDir, 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

    const logFile = `${logsDir}/translate-${courseCode}.log`;
    const out = fs.openSync(logFile, 'a');
    const err = fs.openSync(logFile, 'a');

    const agent = spawn('bash', ['-c', claudeCmd], { stdio: ['ignore', out, err], detached: true });
    agent.unref();
    console.log(`[TRANSLATE] Agent launched headless (pid: ${agent.pid}, log: ${logFile})`);
  } else {
    const escapedCmd = claudeCmd.replace(/"/g, '\\"');
    const osascriptCmd = effectiveTerminal === 'iTerm2'
      ? `tell application "iTerm"
  activate
  set newWindow to (create window with default profile)
  tell current session of newWindow
    set name to "Translate: ${courseCode}"
    write text "${escapedCmd}"
  end tell
end tell`
      : `tell application "Terminal"
  activate
  do script "${escapedCmd}"
end tell`;

    const agentProc = spawn('osascript', ['-e', osascriptCmd], { stdio: 'pipe', detached: true });
    agentProc.on('error', (e) => console.error('[TRANSLATE] osascript error:', e.message));
    agentProc.on('exit', (code) => console.log(`[TRANSLATE] Terminal launched (osascript exit: ${code})`));
  }

  return {
    ok: true,
    course_code: courseCode,
    job_id: jobId,
    brief_file: briefFile,
    seed_count: seedCountVal,
    message: `Translation agent spawned for ${courseCode} — translating ${seedCountVal} seeds`
  };
}

/**
 * Spawn the parallel QA coordinator agent.
 * Mirrors spawnParallelBuildAgent() — spawns a coordinator that orchestrates sub-agents.
 */
async function spawnParallelQAAgent(courseCode, terminal = 'iTerm2') {
  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, seed_count, quality_rules')
    .eq('course_code', courseCode)
    .single();

  const targetSeeds = courseInfo?.seed_count || 300;
  const goldenCount = getGoldenSeedCount(courseInfo);

  // Calculate batch ranges: seeds after golden range split into batches
  const firstSeed = goldenCount + 1;
  const totalToCheck = targetSeeds - firstSeed + 1;
  const NUM_BATCHES = Math.min(MAX_PARALLEL_AGENTS, Math.ceil(totalToCheck / SEEDS_PER_AGENT));
  const batchSize = Math.ceil(totalToCheck / NUM_BATCHES);

  const batches = [];
  for (let i = 0; i < NUM_BATCHES; i++) {
    const start = firstSeed + (i * batchSize);
    const end = Math.min(start + batchSize - 1, targetSeeds);
    if (start <= targetSeeds) {
      batches.push({ start, end });
    }
  }

  console.log(`[QA] Parallel QA for ${courseCode}: ${batches.length} batches, ${totalToCheck} seeds`);

  const prompt = generateQABrief({ courseCode, batches, courseInfo });

  const tmpFile = `/tmp/claude_qa_${courseCode}_${Date.now()}.txt`;
  require('fs').writeFileSync(tmpFile, prompt);

  const projectDir = __dirname.replace('/services', '');
  const claudeCmd = `cd "${projectDir}" && claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`;

  const effectiveTerminal = SPAWN_MODE === 'headless' ? 'headless' : terminal;

  console.log(`[QA] Spawning QA Coordinator for ${courseCode} in ${effectiveTerminal}`);

  let agent;

  if (effectiveTerminal === 'headless') {
    const fs = require('fs');
    const logsDir = require('path').join(projectDir, 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

    const logFile = `${logsDir}/qa-coordinator-${courseCode}.log`;
    const out = fs.openSync(logFile, 'a');
    const err = fs.openSync(logFile, 'a');

    agent = spawn('bash', ['-c', claudeCmd], {
      stdio: ['ignore', out, err],
      detached: true
    });
    agent.unref();

    console.log(`[QA] QA coordinator launched headless (pid: ${agent.pid}, log: ${logFile})`);

    agent.on('error', (spawnErr) => {
      console.error(`[QA] QA coordinator error:`, spawnErr.message);
    });

    agent.on('exit', (code) => {
      console.log(`[QA] QA coordinator exited (code: ${code})`);
    });
  } else {
    const escapedCmd = claudeCmd.replace(/"/g, '\\"');

    let osascript;
    if (effectiveTerminal === 'iTerm2') {
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

    agent = spawn('osascript', ['-e', osascript], {
      stdio: 'pipe',
      detached: true
    });

    agent.on('error', (spawnErr) => {
      console.error(`[QA] QA coordinator osascript error:`, spawnErr.message);
    });

    agent.on('exit', (code) => {
      console.log(`[QA] QA coordinator terminal launched (osascript exit: ${code})`);
    });
  }

  return { agent, batches: batches.length };
}

/**
 * Fetch 2-3 complete golden seed examples from the DB (LEGOs + BUILD/USE phrases)
 * formatted as the exact JSON agents should submit.
 */
async function fetchGoldenSeedExamples(courseCode, seedNumbers = [2, 5, 8]) {
  const examples = [];
  for (const seedNum of seedNumbers) {
    const { data: seed } = await supabase
      .from('course_seeds')
      .select('seed_number, known_text, target_text')
      .eq('course_code', courseCode)
      .eq('seed_number', seedNum)
      .single();
    if (!seed) continue;

    const { data: legos } = await supabase
      .from('course_legos')
      .select('lego_index, type, known_text, target_text, components')
      .eq('course_code', courseCode)
      .eq('seed_number', seedNum)
      .order('lego_index');

    const { data: phrases } = await supabase
      .from('course_practice_phrases')
      .select('lego_index, known_text, target_text, phrase_role, metadata')
      .eq('course_code', courseCode)
      .eq('seed_number', seedNum)
      .order('lego_index')
      .order('position');

    if (!legos || legos.length === 0) continue;

    // Format as JSON — the exact structure agents should POST
    const legoArray = legos.map(lego => {
      const legoPhrases = (phrases || []).filter(p => p.lego_index === lego.lego_index);
      const buildPhrases = legoPhrases
        .filter(p => p.phrase_role === 'build' || p.phrase_role === 'practice')
        .map(p => ({ known: p.known_text, target: p.target_text }));
      const usePhrases = legoPhrases
        .filter(p => p.phrase_role === 'use')
        .map(p => ({ known: p.known_text, target: p.target_text, score: p.metadata?.score || 7 }));

      const entry = {
        idx: lego.lego_index,
        type: lego.type,
        known: lego.known_text,
        target: lego.target_text,
        build: buildPhrases,
        use: usePhrases
      };
      if (lego.components && lego.components.length > 0) {
        entry.components = lego.components;
      }
      return entry;
    });

    examples.push({
      course_code: courseCode,
      seed_number: seedNum,
      known_text: seed.known_text,
      target_text: seed.target_text,
      legos: legoArray
    });
  }
  return examples;
}

/**
 * Generate a readable "good example + bad example" teaching pair from a golden seed.
 * Used in the lean sub-agent brief to teach by showing, not by rules.
 */
/**
 * Format 5 golden seed decompositions as compact pattern examples.
 * Each seed shows the LEGO choices (not phrases) — that's where agents need guidance.
 * Detects which pattern each seed best demonstrates and annotates it.
 */
const PREPOSITIONS = ['à', 'de', 'du', 'des', 'en', 'au', 'aux', 'avec', 'pour', 'dans', 'sur', 'von', 'mit', 'zu', 'für', 'auf', 'の', 'に', 'で', 'を', 'と', 'com', 'em', 'por', 'para', 'con', 'di', 'da', 'del'];

function classifySeedPattern(seed) {
  if (!seed.legos || seed.legos.length === 0) return 'unknown';
  const mLegos = seed.legos.filter(l => l.type === 'M');
  const aLegos = seed.legos.filter(l => l.type === 'A');
  const hasOverlap = seed.legos.some(l =>
    seed.legos.some(other => other.target !== l.target && other.target.includes(l.target))
  );
  const hasWrappedPrep = mLegos.some(m => {
    const words = m.target.split(/[\s']/);
    return words.length >= 3 && words.slice(1, -1).some(w => PREPOSITIONS.includes(w));
  });
  if (hasOverlap) return 'overlapping';
  if (hasWrappedPrep) return 'preposition_wrapping';
  if (mLegos.length === 0) return 'simple_tiling';
  if (aLegos.length > 0 && mLegos.length > 0) return 'mixed';
  return 'all_bundled';
}

function formatDecompositionPatterns(goldenSeeds) {
  if (!goldenSeeds || goldenSeeds.length === 0) return '';

  const lines = [];

  for (const seed of goldenSeeds) {
    if (!seed.legos || seed.legos.length === 0) continue;

    const patternType = classifySeedPattern(seed);
    const hasOverlap = patternType === 'overlapping';

    const patternLabels = {
      overlapping: 'Overlapping — smaller LEGO introduced before its containing molecule',
      preposition_wrapping: 'Preposition wrapping — preposition absorbed inside M-LEGO, not at edge',
      simple_tiling: 'Simple tiling — all clear atoms',
      mixed: 'Mixed — some atoms, some bundles',
      all_bundled: 'All bundled — every piece needs context'
    };
    const pattern = patternLabels[patternType] || patternType;

    lines.push(`**${pattern}**`);
    lines.push(`${seed.known_text}`);

    if (hasOverlap) {
      // Show as ordered list to reveal the layering
      for (const lego of seed.legos) {
        const label = lego.type === 'M' ? 'M' : 'A';
        lines.push(`  ${label}: ${lego.target}`);
      }
    } else {
      // Show as pipe-separated targets
      lines.push(seed.legos.map(l => l.target).join(' | '));
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Spawn the parallel build coordinator agent.
 * This is a lightweight haiku agent that orchestrates ~10 sub-agents via Task tool.
 */
async function spawnParallelBuildAgent(courseCode, agentNumber, terminal = 'iTerm2') {
  // Fetch golden decompositions from courses.quality_rules
  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, quality_rules, seed_count')
    .eq('course_code', courseCode)
    .single();

  const goldenExamples = courseInfo?.quality_rules?.golden_decompositions || [];
  const targetSeeds = courseInfo?.seed_count || 300;
  const goldenCount = getGoldenSeedCount(courseInfo);

  // Fetch golden seeds that maximize pattern diversity (not evenly-spaced)
  // First fetch ALL golden seeds, classify each, pick one per pattern type
  const allGoldenNums = [];
  for (let i = 1; i <= goldenCount; i++) allGoldenNums.push(i);
  const allGoldenSeeds = await fetchGoldenSeedExamples(courseCode, allGoldenNums);

  const patternBuckets = {};
  for (const seed of allGoldenSeeds) {
    const pat = classifySeedPattern(seed);
    if (!patternBuckets[pat]) patternBuckets[pat] = [];
    patternBuckets[pat].push(seed);
  }

  // Pick one seed per pattern, preferring higher seed numbers (richer vocab)
  const desiredPatterns = ['overlapping', 'preposition_wrapping', 'all_bundled', 'mixed', 'simple_tiling'];
  const goldenSeedMarkdown = [];
  const usedSeeds = new Set();
  for (const pat of desiredPatterns) {
    if (patternBuckets[pat] && patternBuckets[pat].length > 0) {
      // Pick the highest-numbered seed in this bucket (richest vocab context)
      const best = patternBuckets[pat][patternBuckets[pat].length - 1];
      goldenSeedMarkdown.push(best);
      usedSeeds.add(best.seed_number);
    }
  }
  // Fill remaining slots up to 5 from unused seeds (prefer high seed numbers)
  for (let i = allGoldenSeeds.length - 1; i >= 0 && goldenSeedMarkdown.length < 5; i--) {
    if (!usedSeeds.has(allGoldenSeeds[i].seed_number)) {
      goldenSeedMarkdown.push(allGoldenSeeds[i]);
      usedSeeds.add(allGoldenSeeds[i].seed_number);
    }
  }
  // Sort by seed number for consistent ordering
  goldenSeedMarkdown.sort((a, b) => a.seed_number - b.seed_number);

  console.log(`[BUILD] Selected ${goldenSeedMarkdown.length} pattern-diverse golden seeds: ${goldenSeedMarkdown.map(s => `S${s.seed_number}(${classifySeedPattern(s)})`).join(', ')}`);

  // Fetch build lessons
  const langCode = courseCode.split('_')[0];
  const langFamilyMap = {
    jpn: 'japanese', kor: 'korean', zho: 'cjk', cmn: 'cjk',
    deu: 'germanic', nld: 'germanic', swe: 'germanic',
    spa: 'romance', fra: 'romance', ita: 'romance', por: 'romance'
  };
  const langFamily = langFamilyMap[langCode] || 'other';

  let lessons = [];
  try {
    const { data } = await supabase
      .from('build_lessons')
      .select('lesson_type, lesson, example_wrong, example_right')
      .or(`language_family.eq.${langFamily},language_family.eq.*`)
      .eq('active', true);
    lessons = data || [];
  } catch (e) {
    console.log(`[BUILD] Could not load lessons for parallel brief: ${e.message}`);
  }

  // Query existing valid drafts + finalized seeds to skip
  const firstSeed = goldenCount + 1; // Seeds 1-goldenCount are golden
  const draftedSet = new Set();
  const finalizedSet = new Set();

  const { data: existingDrafts } = await supabase
    .from('course_seed_drafts')
    .select('seed_number')
    .eq('course_code', courseCode)
    .eq('validation_status', 'valid');
  for (const d of existingDrafts || []) draftedSet.add(d.seed_number);

  const { data: finalizedSeeds } = await supabase
    .from('course_seeds')
    .select('seed_number')
    .eq('course_code', courseCode)
    .not('decomposed_at', 'is', null)
    .gte('seed_number', firstSeed);
  for (const s of finalizedSeeds || []) finalizedSet.add(s.seed_number);

  // Build list of seeds that still need work
  const seedsNeeded = [];
  for (let i = firstSeed; i <= targetSeeds; i++) {
    if (!draftedSet.has(i) && !finalizedSet.has(i)) {
      seedsNeeded.push(i);
    }
  }

  // Distribute evenly across agents
  const NUM_BATCHES = Math.min(MAX_PARALLEL_AGENTS, Math.max(1, Math.ceil(seedsNeeded.length / SEEDS_PER_AGENT)));
  const batchSize = Math.ceil(seedsNeeded.length / NUM_BATCHES);

  const batches = [];
  for (let i = 0; i < NUM_BATCHES; i++) {
    const batchSeeds = seedsNeeded.slice(i * batchSize, (i + 1) * batchSize);
    if (batchSeeds.length > 0) {
      batches.push({ start: batchSeeds[0], end: batchSeeds[batchSeeds.length - 1], seeds: batchSeeds });
    }
  }

  console.log(`[BUILD] Parallel build for ${courseCode}: ${seedsNeeded.length} seeds needed (${draftedSet.size} drafted, ${finalizedSet.size} finalized already), ${batches.length} batches`);

  const prompt = generateParallelBrief({
    courseCode, batches, goldenExamples, goldenSeedMarkdown, lessons, courseInfo, targetSeeds, seedsNeededCount: seedsNeeded.length
  });

  // Write prompt to temp file
  const tmpFile = `/tmp/claude_parallel_${courseCode}_${Date.now()}.txt`;
  require('fs').writeFileSync(tmpFile, prompt);

  const projectDir = __dirname.replace('/services', '');
  const claudeCmd = `cd "${projectDir}" && claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`;

  const effectiveTerminal = SPAWN_MODE === 'headless' ? 'headless' : terminal;

  console.log(`[BUILD] Spawning Parallel Coordinator for ${courseCode} in ${effectiveTerminal}`);

  let agent;

  if (effectiveTerminal === 'headless') {
    const fs = require('fs');
    const logsDir = require('path').join(projectDir, 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

    const logFile = `${logsDir}/parallel-coordinator-${courseCode}.log`;
    const out = fs.openSync(logFile, 'a');
    const err = fs.openSync(logFile, 'a');

    agent = spawn('bash', ['-c', claudeCmd], {
      stdio: ['ignore', out, err],
      detached: true
    });
    agent.unref();

    console.log(`[BUILD] Parallel coordinator launched headless (pid: ${agent.pid}, log: ${logFile})`);

    agent.on('error', (spawnErr) => {
      console.error(`[BUILD] Parallel coordinator error:`, spawnErr.message);
    });

    agent.on('exit', (code) => {
      console.log(`[BUILD] Parallel coordinator exited (code: ${code})`);
    });
  } else {
    const escapedCmd = claudeCmd.replace(/"/g, '\\"');

    let osascript;
    if (effectiveTerminal === 'iTerm2') {
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

    agent = spawn('osascript', ['-e', osascript], {
      stdio: 'pipe',
      detached: true
    });

    agent.on('error', (spawnErr) => {
      console.error(`[BUILD] Parallel coordinator osascript error:`, spawnErr.message);
    });

    agent.on('exit', (code) => {
      console.log(`[BUILD] Parallel coordinator terminal launched (osascript exit: ${code})`);
      const build = activeBuilds.get(courseCode);
      if (build) {
        build.status = 'agent_running';
      }
    });
  }

  return agent;
}

/**
 * Check build progress and spawn new agents as needed
 */
// Helper to update build_jobs table (fire-and-forget, never crashes)
async function updateBuildJobDb(buildJobId, updates) {
  if (!buildJobId) return;
  try {
    const { error } = await supabase
      .from('build_jobs')
      .update(updates)
      .eq('id', buildJobId);
    if (error) {
      console.error(`[BUILD] DB update failed for job ${buildJobId}:`, error.message);
    }
  } catch (err) {
    console.error(`[BUILD] Unexpected DB error for job ${buildJobId}:`, err.message);
  }
}

// Heartbeat interval for DB updates (30 seconds)
const DB_HEARTBEAT_INTERVAL_MS = 30 * 1000;

async function checkBuilds() {
  // DATABASE-ONLY: Query running jobs from DB, not memory
  let runningJobs = [];
  try {
    const { data, error } = await supabase
      .from('build_jobs')
      .select('*')
      .eq('status', 'running');

    if (error) {
      console.error('[BUILD] DB query failed:', error.message);
      return;
    }
    runningJobs = data || [];
  } catch (err) {
    console.error('[BUILD] DB error:', err.message);
    return;
  }

  if (runningJobs.length === 0) {
    return;  // No running jobs
  }

  const now = Date.now();

  for (const job of runningJobs) {
    const courseCode = job.course_code;

    try {
      const progress = await getBuildProgress(courseCode);
      const targetSeeds = job.total_seeds || 300;
      const lastHeartbeat = job.last_heartbeat ? new Date(job.last_heartbeat).getTime() : 0;
      const heartbeatAge = now - lastHeartbeat;
      const respawnCount = job.respawn_count || 0;
      const agentCount = job.agent_count || 1;
      const batchStartSeed = job.batch_start_seed || 0;

      // [BUILD-DEBUG] Log state from DB
      console.log(`[BUILD-DEBUG] === CHECK ${courseCode} ===`);
      console.log(`[BUILD-DEBUG] DB job: id=${job.id}, agentCount=${agentCount}, respawnCount=${respawnCount}`);
      console.log(`[BUILD-DEBUG] Progress: completed=${progress.completed}, target=${targetSeeds}`);
      console.log(`[BUILD-DEBUG] Heartbeat age: ${(heartbeatAge/1000).toFixed(0)}s`);

      // Track draft progress — coordinator agent manages sub-agents itself
      try {
        const { count: draftCount } = await supabase
          .from('course_seed_drafts')
          .select('*', { count: 'exact', head: true })
          .eq('course_code', courseCode);

        console.log(`[BUILD-DEBUG] Parallel drafts: ${draftCount || 0}`);

        // Update progress in build_jobs based on draft count
        await supabase.from('build_jobs').update({
          current_seed: draftCount || 0,
          last_heartbeat: new Date().toISOString()
        }).eq('id', job.id);
      } catch (e) {
        console.log(`[BUILD] Could not check parallel drafts: ${e.message}`);
      }

      // Check if course is complete (finalized seeds, not just drafts)
      if (progress.completed >= targetSeeds) {
        console.log(`[BUILD] ✓ COMPLETE: ${courseCode} (${progress.completed}/${targetSeeds} seeds)`);
        await supabase.from('build_jobs').update({
          status: 'complete',
          current_seed: progress.completed,
          seeds_completed: progress.completed,
          completed_at: new Date().toISOString()
        }).eq('id', job.id);
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
async function startBuild(courseCode, terminal = 'iTerm2', targetSeeds = 668) {
  const progress = await getBuildProgress(courseCode);
  const effectiveTarget = Math.min(targetSeeds, progress.total);

  if (progress.completed >= effectiveTarget) {
    return { ok: false, error: `Target reached (${progress.completed}/${effectiveTarget} seeds)` };
  }

  // DB-ONLY: Check for existing job for this course
  let jobId = null;
  let agentCount = 0;

  try {
    const { data: existingJob, error: findError } = await supabase
      .from('build_jobs')
      .select('id, status, agent_count, respawn_count')
      .eq('course_code', courseCode)
      .in('status', ['running', 'stalled'])
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (!findError && existingJob) {
      if (existingJob.status === 'running') {
        return { ok: false, error: 'Build already running - wait or stop it first' };
      }

      // REUSE existing stalled/pending job - just update it to running
      console.log(`[BUILD] Resuming existing job ${existingJob.id} for ${courseCode} with target ${effectiveTarget}`);
      jobId = existingJob.id;
      agentCount = existingJob.agent_count || 0;

      await supabase.from('build_jobs').update({
        status: 'running',
        terminal: terminal,
        current_seed: progress.completed,
        total_seeds: effectiveTarget,  // Update target on resume
        last_heartbeat: new Date().toISOString(),
        machine_name: MACHINE_NAME
      }).eq('id', existingJob.id);
    }
  } catch (dbErr) {
    // No existing job - will create new one
  }

  // No existing job - create new one
  if (!jobId) {
    try {
      const { data: jobData, error: jobError } = await supabase
        .from('build_jobs')
        .insert({
          course_code: courseCode,
          pass: 'pass_2',
          status: 'running',
          current_seed: progress.completed,
          seeds_completed: progress.completed,
          total_seeds: effectiveTarget,
          started_at: new Date().toISOString(),
          last_heartbeat: new Date().toISOString(),
          requested_by: 'dashboard',
          terminal: terminal,
          agent_count: 0,
          respawn_count: 0,
          machine_name: MACHINE_NAME,
          build_mode: 'parallel'
        })
        .select('id')
        .single();

      if (jobError) {
        console.error('[BUILD] Failed to insert build_jobs record:', jobError.message);
        return { ok: false, error: 'Failed to create build job: ' + jobError.message };
      }
      jobId = jobData.id;
      console.log(`[BUILD] Created new build_jobs record: ${jobId} for ${courseCode}`);
    } catch (dbErr) {
      console.error('[BUILD] Unexpected error inserting build_jobs:', dbErr.message);
      return { ok: false, error: 'Database error: ' + dbErr.message };
    }
  }

  // Ensure build manager is running
  startBuildManager();

  // Spawn agent immediately
  const newAgentCount = agentCount + 1;
  try {
    // Spawn parallel coordinator agent which orchestrates sub-agents
    console.log(`[BUILD] Spawning parallel coordinator for ${courseCode}...`);
    await spawnParallelBuildAgent(courseCode, newAgentCount, terminal);
    console.log(`[BUILD] ✓ Parallel coordinator spawned for ${courseCode}`);

    // Update DB with agent count
    await supabase.from('build_jobs').update({
      agent_count: newAgentCount,
      last_heartbeat: new Date().toISOString()
    }).eq('id', jobId);
  } catch (spawnErr) {
    console.error(`[BUILD] ✗ Spawn failed: ${spawnErr.message}`);
    // Mark job as stalled
    await supabase.from('build_jobs').update({ status: 'stalled' }).eq('id', jobId);
    return { ok: false, error: `Failed to spawn agent: ${spawnErr.message}` };
  }

  return {
    ok: true,
    course_code: courseCode,
    job_id: jobId,
    progress: progress,
    build_mode: 'parallel',
    message: `Parallel build started - coordinator agent spawned`
  };
}

/**
 * Stop a build for a course
 */
async function stopBuild(courseCode) {
  // Database is source of truth - update build_jobs directly
  try {
    const { data: job, error: findError } = await supabase
      .from('build_jobs')
      .select('id, status')
      .eq('course_code', courseCode)
      .in('status', ['running', 'stalled'])
      .single();

    if (findError || !job) {
      return { ok: false, error: 'No active build for this course' };
    }

    const { error: updateError } = await supabase
      .from('build_jobs')
      .update({
        status: 'stopped',
        stop_requested: true,
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id);

    if (updateError) {
      console.error(`[BUILD] Failed to stop job ${job.id}:`, updateError.message);
      return { ok: false, error: updateError.message };
    }

    console.log(`[BUILD] Stopped job ${job.id} for ${courseCode}`);

    // Clear ALL in-memory state for this course
    const build = activeBuilds.get(courseCode);
    if (build) {
      if (build.agent && build.agent.pid) {
        try { process.kill(build.agent.pid, 'SIGTERM'); } catch (e) {}
      }
      activeBuilds.delete(courseCode);
    }

    // Clear activity tracking (prevents stall detector from seeing this course)
    courseActivity.delete(courseCode);
    agentHeartbeats.delete(courseCode);
    console.log(`[BUILD] Cleared in-memory state for ${courseCode}`);

    // Stop manager if no more in-memory builds
    if (activeBuilds.size === 0) {
      stopBuildManager();
    }

    return {
      ok: true,
      success: true,
      course_code: courseCode,
      job_id: job.id,
      message: 'Build stopped'
    };

  } catch (err) {
    console.error(`[BUILD] Error stopping build for ${courseCode}:`, err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Get build status for a course
 * DATABASE IS SINGLE SOURCE OF TRUTH for job status.
 * Heartbeat and in-memory are only for additional info, not for determining active state.
 */
async function getBuildStatus(courseCode) {
  const build = activeBuilds.get(courseCode);
  const progress = await getBuildProgress(courseCode);

  // Check DB for active job (SSoT) - includes pending, running, stalled
  let dbJob = null;
  let lastJobTarget = null;
  try {
    const { data } = await supabase
      .from('build_jobs')
      .select('*')
      .eq('course_code', courseCode)
      .in('status', ['running', 'stalled'])
      .order('started_at', { ascending: false })
      .limit(1)
      .single();
    dbJob = data;
  } catch (e) { /* no active job */ }

  // Also fetch last job's target (for UI when no active job)
  if (!dbJob) {
    try {
      const { data } = await supabase
        .from('build_jobs')
        .select('total_seeds')
        .eq('course_code', courseCode)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();
      lastJobTarget = data?.total_seeds;
    } catch (e) { /* no previous job */ }
  }

  // DATABASE is the single source of truth for whether a build is active
  // If database doesn't have an active job, the build is NOT active
  const isActive = !!dbJob;

  // Clean up stale in-memory state if DB says job is not active
  if (!isActive && (build || courseActivity.has(courseCode) || agentHeartbeats.has(courseCode))) {
    activeBuilds.delete(courseCode);
    courseActivity.delete(courseCode);
    agentHeartbeats.delete(courseCode);
    console.log(`[BUILD] Cleaned up stale in-memory state for ${courseCode} (no active DB job)`);
  }

  // Check heartbeat for additional info (but doesn't affect isActive)
  const heartbeat = agentHeartbeats.get(courseCode);
  const heartbeatAlive = heartbeat && (Date.now() - heartbeat.lastHeartbeat) < HEARTBEAT_TIMEOUT_MS;

  // For parallel builds, fetch draft progress
  let parallelInfo = null;
  const buildMode = 'parallel';
  if (isActive) {
    try {
      const { count: draftCount } = await supabase
        .from('course_seed_drafts')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode);

      const targetSeeds = dbJob?.total_seeds || progress.total;

      // Look up golden seed count for this course
      let goldenCount = 10;
      try {
        const { data: courseData } = await supabase
          .from('courses')
          .select('quality_rules')
          .eq('course_code', courseCode)
          .single();
        goldenCount = getGoldenSeedCount(courseData);
      } catch (e) { /* default to 10 */ }

      const draftsExpected = Math.max(0, targetSeeds - goldenCount); // Seeds after golden range

      parallelInfo = {
        phase: (draftCount || 0) < draftsExpected ? 'drafting' : 'finalizing',
        drafts_submitted: draftCount || 0,
        drafts_expected: draftsExpected
      };
    } catch (e) {
      // Draft table may not exist yet
    }
  }

  return {
    course_code: courseCode,
    active: isActive,
    progress: progress,
    source: isActive ? 'database' : null,
    heartbeat_alive: heartbeatAlive,
    last_job_target: lastJobTarget || progress.total,  // For UI when no active job
    build_mode: buildMode,
    build: isActive ? {
      status: dbJob?.status || 'running',
      build_mode: buildMode,
      agent_count: build?.agentCount || 1,
      current_batch_seeds: progress.completed - (build?.batchStartSeed || 0),
      batch_size: BATCH_SIZE,
      job_id: dbJob?.id || null,
      total_seeds: dbJob?.total_seeds || progress.total  // Job target for UI sync
    } : null,
    parallel: parallelInfo
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
 *
 * IMPORTANT: This checks the TARGET language (what learner produces), not the known language.
 * For eng_for_zho (English for Chinese speakers), target=eng, so vocab is word-based.
 * For zho_for_eng (Chinese for English speakers), target=zho, so vocab is character-based.
 */
function isChinese(courseCode) {
  // Check if TARGET language is CJK (character-based vocab)
  // Course code format: {target}_for_{known} (e.g., zho_for_eng, eng_for_zho)
  const parts = courseCode.split('_for_');
  const targetLang = parts[0] || '';  // Target language is the first part
  const characterBasedLangs = ['zho', 'jpn', 'kor'];
  return characterBasedLangs.includes(targetLang);
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
    'cym': 'Welsh',
    'nld': 'Dutch'
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
 * - X_for_Y (neither eng): check canonical_seed_translations for known language
 *   - If translations exist: known_text = translation, target_text = agent provides
 *   - If no translations: both = agent provides (will translate from English first)
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

  // For non-English known languages, check for canonical translations
  // This applies to BOTH eng_for_X (type 2) AND X_for_Y (type 3) courses
  let knownTranslations = new Map();
  if (!knownIsEng) {
    const { data: translations } = await supabase
      .from('canonical_seed_translations')
      .select('seed_number, translated_text')
      .eq('language_code', knownLang);

    if (translations && translations.length > 0) {
      translations.forEach(t => knownTranslations.set(t.seed_number, t.translated_text));
      console.log(`Found ${translations.length} canonical translations for ${knownLang}`);
    }
  }

  // For non-English target languages, check for canonical translations
  // If e.g. por_for_eng already built, por translations exist — reuse them for por_for_fra
  let targetTranslations = new Map();
  if (!targetIsEng) {
    const { data: translations } = await supabase
      .from('canonical_seed_translations')
      .select('seed_number, translated_text')
      .eq('language_code', targetLang);

    if (translations && translations.length > 0) {
      translations.forEach(t => targetTranslations.set(t.seed_number, t.translated_text));
      console.log(`Found ${translations.length} canonical translations for ${targetLang}`);
    }
  }

  // Create course seeds based on which language is English
  // These are NOT mutually exclusive - eng_for_zho needs BOTH target from canonical AND known from translations
  const courseSeeds = canonical.map(c => {
    const canonicalText = c.source_text.replace(/\{target\}/g, targetLangName);
    let knownText = '';
    let targetText = '';

    // If known language is English, use canonical for known_text
    if (knownIsEng) {
      knownText = canonicalText;
    }

    // If target language is English, use canonical for target_text
    if (targetIsEng) {
      targetText = canonicalText;
    }

    // If known language is NOT English, check for pre-existing translations
    // This applies to BOTH eng_for_X and X_for_Y courses
    if (!knownIsEng && knownTranslations.has(c.seed_number)) {
      knownText = knownTranslations.get(c.seed_number).replace(/\{target\}/g, targetLangName);
    }

    // If target language is NOT English, check for pre-existing translations
    if (!targetIsEng && targetTranslations.has(c.seed_number)) {
      targetText = targetTranslations.get(c.seed_number).replace(/\{target\}/g, targetLangName);
    }

    return {
      course_code: courseCode,
      seed_number: c.seed_number,
      known_text: knownText,
      target_text: targetText
    };
  });

  // Insert
  const { error: insertError } = await supabase
    .from('course_seeds')
    .insert(courseSeeds);

  if (insertError) {
    throw new Error('Failed to initialize course seeds: ' + insertError.message);
  }

  // Build mode description for logging
  const modeParts = [];
  if (knownIsEng) modeParts.push('known=eng (instant)');
  if (targetIsEng) modeParts.push('target=eng (instant)');
  if (!knownIsEng && knownTranslations.size > 0) modeParts.push(`known=${knownLang} (${knownTranslations.size} from translations)`);
  if (!knownIsEng && knownTranslations.size === 0) modeParts.push(`known=${knownLang} (agent translates)`);
  if (!targetIsEng && targetTranslations.size > 0) modeParts.push(`target=${targetLang} (${targetTranslations.size} from translations)`);
  if (!targetIsEng && targetTranslations.size === 0) modeParts.push(`target=${targetLang} (agent translates)`);
  const mode = modeParts.join(', ');
  console.log(`Initialized ${courseCode} with ${courseSeeds.length} seeds [${mode}]`);
  return { initialized: true, count: courseSeeds.length, mode, targetLangName, knownTranslations: knownTranslations.size, targetTranslations: targetTranslations.size };
}

/**
 * Normalize text for ZUT comparison (strips diacritics for collision detection)
 * Used ONLY for comparing whether two words are "the same" for ZUT purposes.
 * Example: "José" and "Jose" should be treated as the same word.
 */
function normalizeForZUT(text, chinese = false) {
  if (!text) return '';
  let normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics for comparison
    .replace(/[¿¡.,;:!?«»""。，！？、：；""]/g, '')  // Remove punctuation
    .trim();
  if (!chinese) {
    normalized = normalized.replace(/\s+/g, ' ');
  }
  return normalized;
}

/**
 * Normalize text for vocab storage (PRESERVES diacritics)
 * Used for extracting and storing vocabulary.
 * CRITICAL: Diacritics are essential orthography in Romance languages.
 * Example: Italian "può" (can) ≠ "puo" (not a word)
 */
function normalizeForStorage(text, chinese = false) {
  if (!text) return '';
  let normalized = text
    .toLowerCase()
    // NOTE: NO diacritic stripping - preserve accents/apostrophes!
    .replace(/[¿¡.,;:!?«»""。，！？、：；""]/g, '')  // Remove punctuation only
    .trim();
  if (!chinese) {
    normalized = normalized.replace(/\s+/g, ' ');
  }
  return normalized;
}

/**
 * Legacy function - now delegates to normalizeForZUT
 * @deprecated Use normalizeForZUT or normalizeForStorage explicitly
 */
function normalizeText(text, chinese = false) {
  return normalizeForZUT(text, chinese);
}

/**
 * Extract vocab units from text (characters for Chinese, words for European)
 * FIXED (2026-02-09): Now preserves diacritics when storing vocabulary
 */
function extractVocab(text, chinese = false) {
  const normalized = normalizeForStorage(text, chinese);  // Changed from normalizeText
  if (chinese) {
    return [...normalized].filter(c => c.trim() && !c.match(/\s/));
  } else {
    // Split on whitespace AND apostrophes so reflexive/elided forms decompose:
    // "s'entrainer" → ["s", "entrainer"], "m'entrainer" → ["m", "entrainer"]
    // "l'homme" → ["l", "homme"], "j'essaie" → ["j", "essaie"]
    // This lets "entrainer" match regardless of which pronoun precedes it
    return normalized.split(/[\s']+/).filter(w => w);
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

  // French/European elision particles — these single-letter forms appear before
  // apostrophes (j', l', m', t', s', d', n', qu') and are structural, not vocab.
  // Like Chinese particles, they shouldn't need explicit LEGOs.
  // e.g., "s'entraîner" is a LEGO but "m'entraîner" uses "m" which is just
  // the first-person form of the same reflexive pronoun.
  if (!chinese) {
    for (const p of ['j', 'l', 'm', 't', 's', 'd', 'n', 'qu', 'c']) {
      vocabSet.add(p);
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
 * Load vocabulary from seed translations (for parallel draft validation).
 * Instead of reading LEGOs (which don't exist yet for parallel seeds),
 * derives vocab from the target_text of all prior seeds.
 * Word-level vocab from translations === word-level vocab from LEGOs
 * because LEGOs must tile their seed translation.
 *
 * Also includes vocab from existing LEGOs in live tables (golden seeds).
 */
async function loadTranslationVocab(courseCode, upToSeedNumber) {
  const chinese = isChinese(courseCode);
  const vocabSet = new Set();

  // 1. Load vocab from all prior seed translations
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('target_text')
    .eq('course_code', courseCode)
    .lt('seed_number', upToSeedNumber)
    .not('target_text', 'is', null);

  for (const seed of seeds || []) {
    extractVocab(seed.target_text, chinese).forEach(v => vocabSet.add(v));
  }

  // 2. Also load vocab from existing LEGOs for seeds BEFORE this one
  // (limited to prior seeds so parallel agents don't depend on each other)
  const { data: legos } = await supabase
    .from('course_legos')
    .select('target_text, type, components')
    .eq('course_code', courseCode)
    .lt('seed_number', upToSeedNumber)
    .order('seed_number')
    .order('lego_index');

  for (const lego of legos || []) {
    extractVocab(lego.target_text, chinese).forEach(v => vocabSet.add(v));
    if (lego.type === 'M' && lego.components) {
      for (const comp of lego.components) {
        extractVocab(comp.target, chinese).forEach(v => vocabSet.add(v));
      }
    }
  }

  // 3. Add elision particles (same as loadCourseVocab)
  if (!chinese) {
    for (const p of ['j', 'l', 'm', 't', 's', 'd', 'n', 'qu', 'c']) {
      vocabSet.add(p);
    }
  }

  return vocabSet;
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
  const roleCounts = { component: 0, build: 0, use: 0 };

  // Add component build-up phrases (P1, P2, ... PN)
  for (let i = 0; i < meaningful.length; i++) {
    const comp = meaningful[i];
    roleCounts.component++;
    buildupPhrases.push({
      id: makePhraseId(courseCode, seed, idx, 'component', roleCounts.component),
      course_code: courseCode,
      seed_number: seed,
      lego_index: idx,
      position: i + 1,
      known_text: comp.known,
      target_text: comp.target,
      word_count: comp.target.length,
      lego_count: 1,
      phrase_role: 'component',
      connected_lego_ids: [],
      lego_position: computeLegoPosition(comp.target, comp.target),
      metadata: { buildup: 'component', component_index: i },
      status: 'draft',
      version: 1
    });
  }

  // Add LEGO itself at P(N+1) — role is 'build' (LEGO debut)
  const legoPosition = meaningful.length + 1;
  roleCounts.build++;
  buildupPhrases.push({
    id: makePhraseId(courseCode, seed, idx, 'build', roleCounts.build),
    course_code: courseCode,
    seed_number: seed,
    lego_index: idx,
    position: legoPosition,
    known_text: known,
    target_text: target,
    word_count: target.length,
    lego_count: 1,
    phrase_role: 'build',
    connected_lego_ids: [],
    lego_position: computeLegoPosition(target, target),
    metadata: { buildup: 'lego' },
    status: 'draft',
    version: 1
  });

  return { buildupPhrases, startPosition: legoPosition + 1, roleCounts };
}

// =============================================================================
// LEGO CONFLICT DETECTION (ZUT Violations) + OVERLAP DETECTION
// =============================================================================

/**
 * Check for LEGO conflicts before insertion.
 *
 * Returns:
 * - { conflict: false } - No conflict, proceed with is_new: true
 * - { conflict: 'duplicate', existing } - Same known+target exists, use is_new: false
 * - { conflict: 'zut', existing, error } - Same known, different target = ZUT violation
 *
 * OVERLAP SUPPORT (January 2026):
 * When word order differs between languages, you need BOTH atomic LEGOs AND chunk M-LEGOs.
 * Example: "blue thing" = "cosa azul" in Spanish (reversed order)
 *   - A-LEGO: "blue" → "azul"
 *   - A-LEGO: "thing" → "cosa"
 *   - M-LEGO: "blue thing" → "cosa azul" (chunk for the word-order difference)
 *
 * This is NOT a ZUT conflict because the known_texts are different ("blue" ≠ "blue thing").
 * The ZUT check only triggers for EXACT known_text matches.
 */
async function checkLegoConflict(courseCode, knownText, targetText, currentSeedNumber = null) {
  // Find any existing LEGOs with the same known_text
  // IMPORTANT: Only check against LEGOs from EARLIER seeds (seed_number < current)
  // This allows rebuilding seeds without false-positive duplicates from later seeds
  let query = supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, type')
    .eq('course_code', courseCode)
    .eq('known_text', knownText);

  // If currentSeedNumber provided, only check against earlier seeds
  if (currentSeedNumber !== null) {
    query = query.lt('seed_number', currentSeedNumber);
  }

  const { data: existing, error } = await query;

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
      `  - Find a synonym or variant for "${knownText}"`,
      `OVERLAP: If word order differs in target language, you may need BOTH atomic and chunk LEGOs`,
      `  - Example: "blue" + "thing" (atoms) AND "blue thing" (chunk) when order reverses`
    ]
  };
}

/**
 * Check if a LEGO represents an "overlapping" chunk - where an M-LEGO contains A-LEGOs.
 * This is VALID and ENCOURAGED when word order differs between languages.
 *
 * Example: Spanish "blue thing" = "cosa azul" (reversed order)
 *   - Having "blue" → "azul" AND "thing" → "cosa" AND "blue thing" → "cosa azul" is CORRECT
 *   - The M-LEGO "blue thing" handles the word-order transformation
 *
 * Returns: { isOverlap: boolean, containedLegos: [...] }
 */
async function checkLegoOverlap(courseCode, knownText, targetText) {
  // Find existing LEGOs whose known_text is contained within the new LEGO's known_text
  const { data: allLegos, error } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, type')
    .eq('course_code', courseCode);

  if (error || !allLegos) {
    return { isOverlap: false, containedLegos: [] };
  }

  const knownLower = knownText.toLowerCase();
  const targetLower = targetText.toLowerCase();

  // Find A-LEGOs whose known_text is a word in the new LEGO's known_text
  const knownWords = knownLower.split(/\s+/);
  const containedLegos = [];

  for (const lego of allLegos) {
    const legoKnown = lego.known_text.toLowerCase();
    const legoTarget = lego.target_text.toLowerCase();

    // Check if this LEGO's known is a word in our known
    if (knownWords.includes(legoKnown)) {
      // And if its target appears somewhere in our target (possibly reordered)
      const targetWords = targetLower.split(/\s+/).concat([...targetLower]); // words + chars for CJK
      if (targetWords.some(w => w.includes(legoTarget) || legoTarget.includes(w))) {
        containedLegos.push({
          legoId: `S${String(lego.seed_number).padStart(4,'0')}L${String(lego.lego_index).padStart(2,'0')}`,
          known: lego.known_text,
          target: lego.target_text,
          type: lego.type
        });
      }
    }
  }

  return {
    isOverlap: containedLegos.length > 0,
    containedLegos,
    note: containedLegos.length > 0
      ? `This M-LEGO contains ${containedLegos.length} existing A-LEGO(s). This is VALID for word-order differences.`
      : null
  };
}

// =============================================================================
// VALIDATION GATES - Enforce quality, prevent lazy agents
// =============================================================================
const MIN_PHRASES_PER_LEGO = 7;       // Each LEGO must have at least 7 phrases
const MAX_PHRASES_PER_LEGO = 13;      // Cap at 13 (diminishing returns)
const TARGET_PHRASES_PER_LEGO = 10;   // Ideal target
const MIN_BATCH_PHRASE_RATIO = 7.0;   // Batch must have ≥7.0 phrases per LEGO

// SYLLABLES = cognitive load. Characters are a proxy based on target language orthography.
// Max ~20 syllables is the cognitive ceiling for a single phrase.
const SYLLABLE_TIERS = {
  SHORT: { min: 3, max: 5 },     // 3-5 syllables: quick recall, pattern lock-in
  MEDIUM: { min: 6, max: 11 },   // 6-11 syllables: building complexity
  LONG: { min: 12, max: 20 }     // 12-20 syllables: full sentences (eternal rotation)
};

// Average characters per syllable by target language
// Used to convert syllable tiers to character thresholds
const CHARS_PER_SYLLABLE = {
  zho: 1.0,   // Chinese: 1 character ≈ 1 syllable
  jpn: 1.5,   // Japanese: hiragana/katakana ~1.5 chars per syllable
  kor: 1.0,   // Korean: 1 syllable block = 1 "character"
  fra: 3.5,   // French: ~3.5 chars per syllable (e.g., "parler" = 6 chars, 2 syllables)
  spa: 3.2,   // Spanish: ~3.2 chars per syllable (e.g., "hablar" = 6 chars, 2 syllables)
  deu: 3.0,   // German: ~3 chars per syllable (compound words!)
  eng: 3.8,   // English: ~3.8 chars per syllable
  ita: 3.0,   // Italian: ~3 chars per syllable
  por: 3.3,   // Portuguese: ~3.3 chars per syllable
  DEFAULT: 3.5 // Default for unknown languages
};

// Extract target language from course_code (e.g., "fra_for_eng" → "fra")
function getTargetLang(courseCode) {
  const match = courseCode.match(/^([a-z]{3})_for_/);
  return match ? match[1] : 'DEFAULT';
}

// Get character thresholds for a language
function getCharThresholds(courseCode) {
  const targetLang = getTargetLang(courseCode);
  const charsPerSyl = CHARS_PER_SYLLABLE[targetLang] || CHARS_PER_SYLLABLE.DEFAULT;

  return {
    SHORT: {
      min: Math.round(SYLLABLE_TIERS.SHORT.min * charsPerSyl),
      max: Math.round(SYLLABLE_TIERS.SHORT.max * charsPerSyl)
    },
    MEDIUM: {
      min: Math.round(SYLLABLE_TIERS.MEDIUM.min * charsPerSyl),
      max: Math.round(SYLLABLE_TIERS.MEDIUM.max * charsPerSyl)
    },
    LONG: {
      min: Math.round(SYLLABLE_TIERS.LONG.min * charsPerSyl),
      max: 999
    }
  };
}

// Minimum phrases per tier (ensures balanced progression)
const MIN_SHORT_PHRASES = 2;    // 2-3 short phrases
const MIN_MEDIUM_PHRASES = 2;   // 2-3 medium phrases
const MIN_LONG_PHRASES = 3;     // 3-4 long phrases (critical for retention, reduced from 4 for Chinese)
const MIN_MIDDLE_RANGE = 2;     // At least 2 phrases in 5-10 char range (prevents short→long jump)

// LEGO balance thresholds (practice_score = phrase_count / seeds_since_introduction)
const BALANCE_UNDERUSED_THRESHOLD = 0.3;  // < 0.3 = needs more practice
const BALANCE_OVERUSED_THRESHOLD = 1.5;   // > 1.5 = used too much
const BALANCE_MAX_STRIKES = 3;            // Hard reject after 3 consecutive violations

// In-memory tracking for balance violations (resets on service restart)
const balanceViolations = {};  // { course_code: consecutive_strike_count }

// SKIP_VALIDATION now only skips phrase COUNT requirements (BUILD/USE minimums).
// ZUT, tiling, vocab, containment, and length checks ALWAYS run — they catch real errors.
// Use skip_validation=true for golden seeds with limited vocab that can't hit count targets.
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
function checkTiling(seedTarget, legos, courseCode, existingVocab) {
  const chinese = isChinese(courseCode);

  // Extract all vocabulary units from LEGOs (including M-LEGO components)
  // Also include existing vocabulary from prior seeds if provided
  const availableVocab = existingVocab ? new Set(existingVocab) : new Set();

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
 * Categorize phrases by length tier and check for minimum counts.
 * Uses CHARACTER COUNT with language-specific thresholds (based on chars/syllable ratio).
 *
 * Returns: { valid: true, tiers: {...} } or { valid: false, error, tiers: {...} }
 */
function checkPhraseComplexity(phrases, courseCode, seedNumber = 999) {
  // Get language-specific character thresholds (converts syllables → chars)
  const thresholds = getCharThresholds(courseCode);
  const targetLang = getTargetLang(courseCode);
  const charsPerSyl = CHARS_PER_SYLLABLE[targetLang] || CHARS_PER_SYLLABLE.DEFAULT;

  const tiers = {
    SHORT: [],
    MEDIUM: [],
    LONG: []
  };

  // Track middle range separately to ensure smooth progression
  const middleMin = Math.round(5 * charsPerSyl);
  const middleMax = Math.round(10 * charsPerSyl);
  const middleRange = [];

  for (const phrase of phrases) {
    // Always use character count (excluding punctuation and spaces)
    const length = phrase.target
      .replace(/[\s\u3000。，！？、：；""''.,!?;:'"()-]/g, '')
      .length;

    // Categorize into tiers based on language-specific thresholds
    if (length >= thresholds.LONG.min) {
      tiers.LONG.push({ target: phrase.target, length });
    } else if (length >= thresholds.MEDIUM.min) {
      tiers.MEDIUM.push({ target: phrase.target, length });
    } else if (length >= thresholds.SHORT.min) {
      tiers.SHORT.push({ target: phrase.target, length });
    }
    // Phrases below SHORT.min are ignored (too short to be useful)

    // Also track middle range for progression check
    if (length >= middleMin && length <= middleMax) {
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
    errors.push(`SHORT: need ${minShort}+, got ${tiers.SHORT.length} (${thresholds.SHORT.min}-${thresholds.SHORT.max} chars ≈ 3-5 syllables)`);
  }
  if (tiers.MEDIUM.length < minMedium) {
    errors.push(`MEDIUM: need ${minMedium}+, got ${tiers.MEDIUM.length} (${thresholds.MEDIUM.min}-${thresholds.MEDIUM.max} chars ≈ 6-9 syllables)`);
  }
  if (tiers.LONG.length < minLong) {
    errors.push(`LONG: need ${minLong}+, got ${tiers.LONG.length} (${thresholds.LONG.min}+ chars ≈ 10+ syllables)`);
  }
  if (middleRange.length < minMiddle) {
    errors.push(`MIDDLE: need ${minMiddle}+, got ${middleRange.length} (${middleMin}-${middleMax} chars ≈ 5-10 syllables)`);
  }

  if (errors.length > 0) {
    const mode = seedNumber <= 20 ? 'softened (seed 6-20)' : 'hard (seed 21+)';
    return {
      valid: false,
      tiers: tierCounts,
      thresholds,  // Include thresholds in response for debugging
      mode,
      error: `Phrase balance failed: ${errors.join('; ')}`,
      hint: seedNumber <= 20
        ? `Softened mode: 1+ SHORT (${thresholds.SHORT.min}+ chars), 1+ MEDIUM (${thresholds.MEDIUM.min}+ chars), 2+ LONG (${thresholds.LONG.min}+ chars)`
        : `Hard mode: 2+ SHORT, 2+ MEDIUM, 3+ LONG (${thresholds.LONG.min}+ chars for ${targetLang})`
    };
  }

  return { valid: true, tiers: tierCounts, thresholds, mode: seedNumber <= 20 ? 'softened' : 'hard' };
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
📚 See ralph-methodology.md for how to break seeds into LEGOs:
   - Every word/character in seed must appear in a LEGO target
   - Order LEGOs SHORT→LONG (by target length)
   - Use M-LEGOs for multi-word chunks`,

  phrases: `
📚 See ralph-methodology.md for phrase requirements:
   BUILD: flexible quantity based on LEGO length (LEGO + 1-5 syllables)
   - Fragments OK, debut only
   - Quantity depends on LEGO complexity

   USE: minimum 5 per LEGO (LEGO + 5-10 syllables)
   - Complete sentences ONLY
   - Reused in consolidate/review phases
   - ALL are eternal-eligible (go into spaced repetition)

   Graduated: relaxed (seeds 1-5), softened (6-20), hard (21+)`,

  build_use: `
📚 See ralph-methodology.md for BUILD/USE phrase structure:
   BUILD phrases (flexible quantity):
   - Lock in the pattern, get the LEGO "in"
   - Fragments OK (don't need complete sentences)
   - LEGO + 1-5 syllables
   - Debut only, NOT eternal-eligible

   USE phrases (minimum 5):
   - Natural production, put the LEGO "out"
   - MUST be complete sentences (subject + verb)
   - LEGO + 5-10 syllables
   - ALL eternal-eligible (go into spaced repetition)
   - Reused in consolidate/review phases
   - Each USE phrase MUST have a score (5-9)

   SCORING (5-9) - self-assess each USE phrase:
   9 = grammatically perfect, semantically excellent, high value in both languages
   7-8 = strong phrase, minor stylistic preferences possible
   5-6 = solid, functional, no issues but not remarkable
   4 or below = hard reject, REWRITE before submitting`,

  vocab: `
📚 See ralph-methodology.md for how vocabulary builds:
   - Phrases can only use vocabulary from prior LEGOs
   - LEGO N can use: (all prior seeds) + (LEGOs 1..N of current seed)`,

  zut: `
📚 See ralph-methodology.md for handling ZUT conflicts:
   - Same known text cannot map to different targets
   - UPCHUNK: Add context to disambiguate
   - Or use a synonym for the known text`,

  overlap: `
📚 See ralph-methodology.md for overlapping LEGOs guidance:
   When word order differs between languages, use BOTH atomic LEGOs AND a chunk M-LEGO.

   Example: "blue thing" = "cosa azul" in Spanish (reversed order)
   - A-LEGO: "blue" → "azul"
   - A-LEGO: "thing" → "cosa"
   - M-LEGO: "blue thing" → "cosa azul" (chunk handles the transformation)

   This is NOT a ZUT conflict because the known_texts are different.
   The methodology no longer requires component breakdown - use overlapping LEGOs instead.

   When to use overlapping LEGOs:
   - Adjective/noun order reversal (English→Spanish, English→French)
   - Verb position differences (English→German, English→Japanese)
   - Particle placement differences (many Asian languages)`,

  balance: `
📚 See ralph-methodology.md for balance requirements:
   - Prioritize recent, underused LEGOs in new phrases
   - Avoid over-relying on common vocabulary (>1.5x avg usage)
   - Include underused LEGOs (<0.3x avg usage) in your phrases
   - Each LEGO needs balanced practice exposure`,

  length_mismatch: `
📚 PHRASE LENGTH MISMATCH - Translation Fidelity Issue:
   - known_text and target_text must express the SAME meaning
   - If one is much longer, you likely added extra content
   - DO NOT pad phrases with available vocabulary to hit length targets
   - If you need longer phrases, make BOTH languages longer together

   Example of WRONG:
     known:  "明日会いたい" (7 chars)
     target: "I want to meet at six o'clock this evening" (42 chars)
     → "at six o'clock this evening" was ADDED, not translated!

   Example of RIGHT:
     known:  "明日6時に会いたい" (9 chars)
     target: "I want to meet at six o'clock tomorrow" (38 chars)
     → Both express the same meaning`
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

    // Graduated minimum based on seed number (vocabulary grows with each seed)
    // S1: 0-1, S2-3: 3, S4-5: 4, S6-10: 5, S11+: 6 (BUILD flexible + min 5 USE)
    let minRequired = MIN_PHRASES_PER_LEGO;
    if (seed === 1 && idx === 1) minRequired = 0;      // Very first LEGO
    else if (seed === 1) minRequired = 1;              // S1 L2+: flexible BUILD
    else if (seed <= 3) minRequired = 3;               // S2-3: 1 BUILD + 2 USE
    else if (seed <= 5) minRequired = 4;               // S4-5: 1 BUILD + 3 USE
    else if (seed <= 10) minRequired = 5;              // S6-10: 1 BUILD + 4 USE
    // S11+: uses MIN_PHRASES_PER_LEGO (1 BUILD + 5 USE = 6)

    if (phraseCount < minRequired && !allowValidationBypass(req.body)) {
      console.log(`✗ ${legoId}: REJECTED - Only ${phraseCount} phrases (need ${minRequired}+ at position ~${globalPosition})`);
      return res.status(400).json({
        error: 'Insufficient phrases',
        lego_id: legoId,
        got: phraseCount,
        required: minRequired,
        global_position: globalPosition,
        skills: ['ralph-methodology.md'],
        hint: `LEGO at position ~${globalPosition} needs at least ${minRequired} phrases. Review ralph-methodology.md for phrase generation guidance.`
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
      const conflictResult = await checkLegoConflict(course_code, known, target, seed);

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
          skills: ['ralph-methodology.md'],
          hint: 'Same known text cannot map to different targets. Upchunk with context or use synonym. See ralph-methodology.md for overlap patterns.'
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
      // LEGO CONTAINMENT: Every phrase target MUST contain the LEGO target (phonetic matching)
      const legoTargetNorm = normalizeForContainment(target);
      const containmentFails = phrases.filter(p =>
        !normalizeForContainment(p.target).includes(legoTargetNorm)
      );
      if (containmentFails.length > 0) {
        console.log(`✗ ${legoId}: REJECTED - ${containmentFails.length} phrases missing LEGO target "${target}"`);
        return res.status(400).json({
          error: 'LEGO containment violation',
          lego_id: legoId,
          lego_target: target,
          failing_phrases: containmentFails.slice(0, 5).map(p => p.target),
          total_failures: containmentFails.length,
          hint: 'Every phrase MUST contain the exact LEGO target text as a substring. No conjugation changes, no substitutions, no omissions.'
        });
      }

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
          skills: ['ralph-methodology.md'],
          hint: `Phrases must only use vocabulary already introduced. Unknown: ${violations[0].unknown}. Review ralph-methodology.md for vocabulary rules.`
        });
      }
    }

    // Score validation removed - not needed for course building

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
      // Role counters for deterministic phrase IDs
      let roleCounts = { component: 0, build: 0, use: 0 };

      // M-TYPE BUILD-UP: Auto-generate build-up phrases for M-type LEGOs
      // NEVER trust agent to provide build-up - always generate it ourselves
      if (type === 'M' && components && components.length > 0) {
        const buildupResult = generateBuildupPhrases(
          { seed, idx, known, target, components },
          course_code
        );
        allPhraseRows = [...buildupResult.buildupPhrases];
        buildupCount = buildupResult.buildupPhrases.length;
        practiceStartPosition = buildupResult.startPosition;
        roleCounts = { ...buildupResult.roleCounts };

        console.log(`  M-LEGO build-up: ${buildupCount} phrases (${buildupResult.buildupPhrases.length - 1} components + LEGO)`);
      }

      // Add agent's practice phrases after build-up
      if (phrases && phrases.length > 0) {
        // DEDUPLICATION: Filter out phrases that duplicate build-up (normalized comparison)
        // "I want" == "I want." == "i want" pedagogically
        const buildupNormalized = new Set(allPhraseRows.map(p => normalizePhrase(p.target_text)));
        const seenNormalized = new Set();  // Track within this batch too
        const dedupedPhrases = phrases.filter(p => {
          const norm = normalizePhrase(p.target);
          if (buildupNormalized.has(norm) || seenNormalized.has(norm)) {
            return false;
          }
          seenNormalized.add(norm);
          return true;
        });
        const dedupedCount = phrases.length - dedupedPhrases.length;
        if (dedupedCount > 0) {
          console.log(`    Deduped ${dedupedCount} phrases (normalized: case/punctuation insensitive)`);
        }

        // Sort by target syllable count (Chinese characters = syllables roughly)
        const sorted = [...dedupedPhrases].sort((a, b) => a.target.length - b.target.length);

        const practicePhrases = sorted.map((p, i) => {
          const position = practiceStartPosition + i;  // Start after build-up
          const role = computePhraseRole(position);
          roleCounts[role] = (roleCounts[role] || 0) + 1;
          return {
            id: makePhraseId(course_code, seed, idx, role, roleCounts[role]),
            course_code,
            seed_number: seed,
            lego_index: idx,
            position,
            known_text: p.known,
            target_text: p.target,
            word_count: p.target.length,
            lego_count: (p.known.match(/\s+/g) || []).length + 1,
            phrase_role: role,
            connected_lego_ids: [],
            lego_position: computeLegoPosition(p.target, target),
            metadata: p.score ? { score: p.score } : {},
            status: 'draft',
            version: 1
          };
        });

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
        const conflictResult = await checkLegoConflict(course_code, lego.known, lego.target, lego.seed);

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
        // Role counters for deterministic phrase IDs
        let roleCounts = { component: 0, build: 0, use: 0 };

        // M-TYPE BUILD-UP: Auto-generate build-up phrases for M-type LEGOs
        if (lego.type === 'M' && lego.components && lego.components.length > 0) {
          const buildupResult = generateBuildupPhrases(
            { seed: lego.seed, idx: lego.idx, known: lego.known, target: lego.target, components: lego.components },
            course_code
          );
          allPhraseRows = [...buildupResult.buildupPhrases];
          buildupCount = buildupResult.buildupPhrases.length;
          practiceStartPosition = buildupResult.startPosition;
          roleCounts = { ...buildupResult.roleCounts };
          totalBuildupPhrases += buildupCount;
        }

        // Add agent's practice phrases after build-up
        if (lego.phrases && lego.phrases.length > 0) {
          const sorted = [...lego.phrases].sort((a, b) => a.target.length - b.target.length);

          const practicePhrases = sorted.map((p, i) => {
            const position = practiceStartPosition + i;
            const role = computePhraseRole(position);
            roleCounts[role] = (roleCounts[role] || 0) + 1;
            return {
              id: makePhraseId(course_code, lego.seed, lego.idx, role, roleCounts[role]),
              course_code,
              seed_number: lego.seed,
              lego_index: lego.idx,
              position,
              known_text: p.known,
              target_text: p.target,
              word_count: p.target.length,
              lego_count: (p.known.match(/\s+/g) || []).length + 1,
              phrase_role: role,
              connected_lego_ids: [],
              lego_position: computeLegoPosition(p.target, lego.target),
              metadata: p.score ? { score: p.score } : {},
              status: 'draft',
              version: 1
            };
          });

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
        skills: ['ralph-methodology.md'],
        hint: 'Some LEGOs have same known text mapping to different targets. Upchunk or use synonyms. See ralph-methodology.md for overlap patterns.'
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
 * SUPPORTS TWO FORMATS:
 *
 * 1. MARKDOWN (recommended - fewer tokens):
 *    Content-Type: text/markdown or text/plain
 *    ```
 *    # Seed 42
 *    Known: I want to speak German with you now.
 *    Target: Ich will jetzt Deutsch mit dir sprechen.
 *
 *    ## L1 [M] "I want" → "ich will"
 *    Components: I → ich, want → will
 *
 *    BUILD:
 *    - I want → ich will
 *    - I want to speak → ich will sprechen
 *
 *    USE:
 *    - I want to speak German → Ich will Deutsch sprechen [7]
 *    - Do you want to speak? → Willst du sprechen? [8]
 *    ```
 *
 * 2. JSON (legacy):
 *    Content-Type: application/json
 *    {
 *      "course_code": "deu_for_eng",
 *      "seed_number": 42,
 *      "target_text": "Ich will jetzt Deutsch mit dir sprechen",
 *      "legos": [...]
 *    }
 *
 * IMPORTANT: known_text comes from the CANONICAL SEEDS already in the database.
 * Agent only provides the target language translation and LEGOs.
 *
 * Semantic attestation is IMPLICIT in markdown format (no extra field needed).
 */
app.post('/api/seed/complete', async (req, res) => {
  try {
    // =========================================================================
    // MARKDOWN DETECTION & PARSING
    // Agents can submit in markdown format for fewer tokens
    // =========================================================================
    let parsedData;
    const isMarkdown = isMarkdownSubmission(req);

    if (isMarkdown) {
      const markdown = extractMarkdown(req);
      if (!markdown) {
        return res.status(400).json({
          error: 'Could not extract markdown content',
          hint: 'Send markdown as request body with Content-Type: text/markdown or text/plain'
        });
      }

      // Extract course_code from query param or JSON wrapper
      const courseCodeFromQuery = req.query.course || req.query.course_code;
      const courseCodeFromBody = req.body?.course_code;
      const courseCode = courseCodeFromQuery || courseCodeFromBody;

      if (!courseCode) {
        return res.status(400).json({
          error: 'course_code required for markdown submissions',
          hint: 'Add ?course=xxx query param or wrap: {"course_code": "xxx", "markdown": "..."}'
        });
      }

      parsedData = parseMarkdownSeed(markdown, courseCode);
      // Carry over SKIP_VALIDATION from JSON wrapper or query param
      if (req.body?.SKIP_VALIDATION || req.query.skip_validation) {
        parsedData.SKIP_VALIDATION = true;
      }
      console.log(`[MARKDOWN] Parsed seed ${parsedData.seed_number} with ${parsedData.legos.length} LEGOs`);
    } else {
      // Traditional JSON format
      parsedData = req.body;
      // Carry over skip_validation from query param for JSON too
      if (req.query.skip_validation) {
        parsedData.SKIP_VALIDATION = true;
      }
    }

    const { course_code, seed_number, known_text: agent_known_text, target_text: agent_target_text, legos, SKIP_VALIDATION } = parsedData;
    const seedId = `S${String(seed_number).padStart(4, '0')}`;
    let isDraft = req.query.draft === 'true';

    // Auto-convert legacy phrases[] format to build/use format
    if (legos) {
      for (const lego of legos) {
        if (lego.phrases && !lego.build && !lego.use) {
          const phrases = lego.phrases;
          console.log(`[FORMAT] ${seedId}L${String(lego.idx).padStart(2, '0')}: Auto-converting legacy phrases[] → build/use (${phrases.length} phrases)`);
          // Split: shortest 3 phrases become build, rest become use
          const sorted = [...phrases].sort((a, b) => (a.target || '').length - (b.target || '').length);
          lego.build = sorted.slice(0, Math.min(3, sorted.length));
          lego.use = sorted.slice(Math.min(3, sorted.length));
          delete lego.phrases;
        }
      }
    }

    // Force draft mode if there are existing drafts for this course (parallel build in progress)
    if (!isDraft && course_code) {
      const { count: draftCount } = await supabase
        .from('course_seed_drafts')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', course_code);
      if (draftCount > 0) {
        console.log(`[SAFETY] Forcing draft mode for ${seedId} — ${draftCount} drafts exist for ${course_code}`);
        isDraft = true;
      }
    }

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

    if (!Array.isArray(legos) || legos.length === 0) {
      return res.status(400).json({
        error: 'legos must be a non-empty array',
        seed: seedId
      });
    }

    // SEMANTIC ATTESTATION: removed (February 2026)
    // QA pass handles quality checking instead of self-attestation

    // AUTO-HEARTBEAT: Update heartbeat on every submission (agents may not send manual heartbeats)
    const now = Date.now();
    agentHeartbeats.set(course_code, {
      lastHeartbeat: now,
      agentId: 'submission',
      status: 'submitting',
      currentSeed: seed_number,
      startedAt: agentHeartbeats.get(course_code)?.startedAt || now
    });

    // CHECKPOINT GATE: Block seeds past checkpoint until approved (skip for drafts)
    if (!isDraft && await isBlockedByCheckpoint(course_code, seed_number)) {
      const checkpoint = await getCheckpointStatus(course_code);
      return res.status(403).json({
        error: 'CHECKPOINT_REQUIRED',
        message: `Seed ${seed_number} blocked - checkpoint at seed ${checkpoint.checkpointSeed} requires approval`,
        seed: seedId,
        checkpoint: {
          checkpoint_seed: checkpoint.checkpointSeed,
          approved: false,
          action: 'Run QA agent, then POST /api/checkpoint/approve/' + course_code
        }
      });
    }

    // CANONICAL SEED LOOKUP: Get known_text/target_text from pre-populated database seeds
    // Do this BEFORE translation validation - seeds may already have translations (target-first workflow)
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

    // Validate translations - only require from agent if not already in database
    // This supports target-first workflow where translations are done before LEGOs
    const needsKnownFromAgent = !knownIsEng && !canonicalSeed.known_text;
    const needsTargetFromAgent = !targetIsEng && !canonicalSeed.target_text;

    if (needsKnownFromAgent && !agent_known_text) {
      return res.status(400).json({
        error: 'known_text required',
        seed: seedId,
        course_code,
        hint: `For ${course_code} (known=${knownLang}), agent must provide known_text translation from English canonical.`
      });
    }
    if (needsTargetFromAgent && !agent_target_text) {
      return res.status(400).json({
        error: 'target_text required',
        seed: seedId,
        course_code,
        hint: `For ${course_code} (target=${targetLang}), agent must provide target_text translation.`
      });
    }

    // Check if seed already fully built (translation + LEGOs) — skip for drafts
    const hasTranslation = canonicalSeed.known_text && canonicalSeed.known_text.length > 0 &&
                           canonicalSeed.target_text && canonicalSeed.target_text.length > 0;

    if (!isDraft && hasTranslation) {
      // Check if LEGOs already exist for this seed
      const { data: existingLegos, error: legoCheckError } = await supabase
        .from('course_legos')
        .select('id')
        .eq('course_code', course_code)
        .eq('seed_number', seed_number)
        .limit(1);

      if (!legoCheckError && existingLegos && existingLegos.length > 0) {
        // Seed has BOTH translation AND LEGOs - fully built
        return res.status(400).json({
          error: 'Seed already fully built',
          seed: seedId,
          existing_known: canonicalSeed.known_text,
          existing_target: canonicalSeed.target_text,
          has_legos: true,
          hint: 'This seed has translation and LEGOs. Use a different seed number.'
        });
      }

      // Has translation but no LEGOs - allow adding LEGOs (target-first workflow)
      console.log(`  Seed has translation but no LEGOs - proceeding with LEGO addition`);
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
          skills: ['/course-resume'],
          hint: 'After context compaction, ALWAYS call /api/resume first. Do NOT guess seed text. Review /course-resume for recovery guidance.'
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

    // 1. ZUT VALIDATION + DUPLICATE DETECTION
    //    SKIP for drafts — can't know what other parallel agents created
    //    For non-drafts: ALWAYS detect duplicates (even with skip_validation)
    //    but only reject ZUT violations when validation is enabled
    const zutViolations = [];
    const duplicateLegos = [];

    if (!isDraft) {
      for (const lego of legos) {
        const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;

        const conflictResult = await checkLegoConflict(course_code, lego.known, lego.target, seed_number);

        if (conflictResult.conflict === 'zut') {
          // ZUT violation — always enforce (catches real mapping errors)
          zutViolations.push({
            lego_id: legoId,
            known: lego.known,
            new_target: lego.target,
            existing: conflictResult.existing,
            suggestions: conflictResult.suggestions
          });
        } else if (conflictResult.conflict === 'duplicate') {
          // Duplicate detection — always active (even with skip_validation)
          // Golden seeds should correctly mark reused LEGOs as is_new=false
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

    // Load existing vocabulary from prior seed translations (enables parallel builds)
    // Translation vocab is deterministic: seed N only needs translations 1..N-1
    const vocabSet = await loadTranslationVocab(course_code, seed_number);

    // 2. TILING VALIDATION: Seed target must be constructable from submitted LEGOs + prior vocabulary
    //    Always runs — catches real decomposition errors
    {
      const tilingResult = checkTiling(target_text, legos, course_code, vocabSet);
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

    const vocabViolations = [];
    const chinese = isChinese(course_code);
    for (const lego of legos) {
      const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
      const isDuplicate = duplicateLegos.some(d => d.lego_id === legoId);

      // Add THIS LEGO's vocab first (so its phrases can use it)
      // For drafts: add directly to local vocabSet (don't pollute global cache)
      if (isDraft) {
        extractVocab(lego.target, chinese).forEach(v => vocabSet.add(v));
        if (lego.type === 'M' && lego.components) {
          for (const comp of lego.components) {
            extractVocab(comp.target, chinese).forEach(v => vocabSet.add(v));
          }
        }
      } else {
        // Update both local vocabSet (for validation) and global cache (for future seeds)
        extractVocab(lego.target, chinese).forEach(v => vocabSet.add(v));
        if (lego.type === 'M' && lego.components) {
          for (const comp of lego.components) {
            extractVocab(comp.target, chinese).forEach(v => vocabSet.add(v));
          }
        }
        addToCourseVocab(course_code, { target: lego.target, type: lego.type, components: lego.components });
      }

      // THEN check phrases (can use this LEGO + all prior vocab)
      if (!isDuplicate) {
        // Get all phrases (supports both BUILD/USE and legacy format)
        let allPhrases = [];
        if (usesBuildUseFormat(lego)) {
          allPhrases = [...(lego.build || []), ...(lego.use || [])];
        } else if (lego.phrases) {
          allPhrases = lego.phrases;
        }

        if (allPhrases.length > 0) {
          const violations = checkVocabViolations(allPhrases, vocabSet, course_code);
          if (violations.length > 0) {
            vocabViolations.push({
              lego_id: legoId,
              violations: violations.slice(0, 3)  // First 3
            });
          }

          // LEGO CONTAINMENT: Every phrase target MUST contain the LEGO target
          // german_validation=true: word-based (all LEGO words must appear in phrase)
          // default: substring-based (LEGO target as contiguous substring)
          // Always runs — catches conjugation/clitic form violations
          {
            const useWordContainment = req.query.german_validation === 'true';
            const legoTargetNorm = normalizeForContainment(lego.target);
            const containmentFails = allPhrases.filter(p => {
              if (useWordContainment) {
                return !checkWordContainment(lego.target, p.target);
              }
              return !normalizeForContainment(p.target).includes(legoTargetNorm);
            });
            if (containmentFails.length > 0) {
              const mode = useWordContainment ? 'word-based' : 'substring';
              errors.push({
                type: 'lego_containment',
                message: `${legoId}: ${containmentFails.length} phrase(s) fail ${mode} containment for LEGO target "${lego.target}"`,
                lego_id: legoId,
                lego_target: lego.target,
                failing_phrases: containmentFails.slice(0, 3).map(p => p.target),
                hint: useWordContainment
                  ? 'Every BUILD and USE phrase must contain ALL words from the LEGO target (German word-order mode).'
                  : 'Every BUILD and USE phrase MUST contain the exact LEGO target text. No conjugation changes, no substitutions, no omissions.'
              });
              console.log(`✗ ${legoId}: CONTAINMENT (${mode}) - ${containmentFails.length} phrases missing LEGO target "${lego.target}"`);
            }
          }
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

    // 3b. PHRASE LENGTH RATIO VALIDATION (January 2026)
    // Catches asymmetric padding: if known_text and target_text have very different lengths,
    // it suggests one side was "padded" with extra content not in the other language.
    // Ratio tolerance: 2.5x allows for natural language length differences, catches obvious padding.
    // SKIP for logographic languages (Chinese, Japanese, Korean) - character count comparison is meaningless
    const LOGOGRAPHIC_LANGS = ['zho', 'cmn', 'jpn', 'kor'];
    const isLogographic = LOGOGRAPHIC_LANGS.includes(targetLang) || LOGOGRAPHIC_LANGS.includes(knownLang);
    const LENGTH_RATIO_THRESHOLD = 2.5;
    const lengthMismatches = [];

    for (const lego of legos) {
      const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
      const isDuplicate = duplicateLegos.some(d => d.lego_id === legoId);
      if (isDuplicate) continue;

      let allPhrases = [];
      if (usesBuildUseFormat(lego)) {
        allPhrases = [...(lego.build || []), ...(lego.use || [])];
      } else if (lego.phrases) {
        allPhrases = lego.phrases;
      }

      for (const phrase of allPhrases) {
        if (!phrase.known || !phrase.target) continue;
        const knownLen = phrase.known.length;
        const targetLen = phrase.target.length;
        if (knownLen === 0 || targetLen === 0) continue;

        const ratio = Math.max(knownLen, targetLen) / Math.min(knownLen, targetLen);
        if (ratio > LENGTH_RATIO_THRESHOLD) {
          lengthMismatches.push({
            lego_id: legoId,
            known: phrase.known.substring(0, 50),
            target: phrase.target.substring(0, 50),
            known_len: knownLen,
            target_len: targetLen,
            ratio: Math.round(ratio * 10) / 10
          });
        }
      }
    }

    if (lengthMismatches.length > 0 && !isLogographic) {
      errors.push({
        type: 'length_mismatch',
        message: `Phrase length mismatch - known and target should express same content (ratio > ${LENGTH_RATIO_THRESHOLD}x)`,
        mismatches: lengthMismatches.slice(0, 5),  // First 5
        total_mismatches: lengthMismatches.length,
        hint: 'If target is much longer than known (or vice versa), you may have added extra content. Both languages must express the SAME meaning.',
        methodology: 'Each phrase pair is a translation. known_text and target_text must be semantically equivalent - no additions, no omissions.'
      });
      console.log(`✗ ${seedId}: LENGTH MISMATCH - ${lengthMismatches.length} phrases with ratio > ${LENGTH_RATIO_THRESHOLD}x`);
    } else if (isLogographic && lengthMismatches.length > 0) {
      console.log(`ℹ ${seedId}: Skipping length check for logographic language (${lengthMismatches.length} would have flagged)`);
    }

    // 4. PHRASE VALIDATION (supports both BUILD/USE and legacy format)
    const globalPosition = (seed_number - 1) * 3;  // Rough estimate

    for (const lego of legos) {
      const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
      const isDuplicate = duplicateLegos.some(d => d.lego_id === legoId);
      if (isDuplicate) continue;

      // Check if using new BUILD/USE format (ralph-methodology.md)
      if (usesBuildUseFormat(lego)) {
        // NEW FORMAT: Validate BUILD/USE structure
        const buildUseResult = checkBuildUsePhrases(lego, course_code, seed_number);
        if (!buildUseResult.valid && !SKIP_VALIDATION) {
          errors.push({
            type: 'build_use',
            message: `${legoId}: ${buildUseResult.error}`,
            lego_id: legoId,
            details: buildUseResult.details,
            methodology: METHODOLOGY_HINTS.build_use
          });
          console.log(`✗ ${legoId}: BUILD/USE - ${buildUseResult.error}`);
        }
      } else if (lego.phrases) {
        // LEGACY FORMAT: Validate flat phrases array
        const phraseCount = lego.phrases.length;

        // Graduated minimum based on seed (vocabulary grows with each seed)
        // BUILD is flexible (1+), USE minimum 5 at full requirements
        let minRequired = MIN_PHRASES_PER_LEGO;
        if (seed_number === 1 && lego.idx === 1) minRequired = 0;
        else if (seed_number === 1) minRequired = 1;     // S1 L2+: flexible BUILD
        else if (seed_number <= 3) minRequired = 3;      // S2-3: 1 BUILD + 2 USE
        else if (seed_number <= 5) minRequired = 4;      // S4-5: 1 BUILD + 3 USE
        else if (seed_number <= 10) minRequired = 5;     // S6-10: 1 BUILD + 4 USE
        // S11+: uses MIN_PHRASES_PER_LEGO (1 BUILD + 5 USE = 6)

        if (phraseCount < minRequired && !SKIP_VALIDATION) {
          errors.push({
            type: 'phrases',
            message: `${legoId}: Only ${phraseCount} phrases (need ${minRequired}+ for seed ${seed_number})`,
            lego_id: legoId,
            methodology: METHODOLOGY_HINTS.phrases
          });
        }

        // Score validation removed - not needed for course building
      } else {
        // NO PHRASES AT ALL - HARD REJECT (always enforced)
        // Agent submitted LEGO with no build[], no use[], and no phrases[]
        errors.push({
          type: 'no_phrases',
          message: `${legoId}: LEGO has NO PHRASES! Must include build[] + use[] arrays (see ralph-methodology.md)`,
          lego_id: legoId,
          hint: 'Each LEGO needs: build (flexible) + use (min 5 phrases with scores 5-9)',
          methodology: METHODOLOGY_HINTS.build_use
        });
        console.log(`✗ ${legoId}: NO PHRASES - LEGO submitted without build/use/phrases arrays`);
      }
    }

    // 5. PHRASE COMPLEXITY VALIDATION — DISABLED (warning only)
    // Tier distribution is no longer a hard gate. Agents naturally produce good distributions.
    // Keeping as a log warning for monitoring only.
    {
      for (const lego of legos) {
        const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
        const isDuplicate = duplicateLegos.some(d => d.lego_id === legoId);
        if (isDuplicate) continue;
        if (usesBuildUseFormat(lego)) continue;

        if (lego.phrases && lego.phrases.length > 0) {
          const complexityResult = checkPhraseComplexity(lego.phrases, course_code, seed_number);
          if (!complexityResult.valid) {
            // Warning only — do NOT add to errors
            console.log(`⚠ ${legoId}: PHRASE TIERS (warning, not blocking) - ${complexityResult.error}`);
          }
        }
      }
    }

    // 6. LEGO BALANCE VALIDATION (three-strike escalation)
    // NOTE: M-LEGO component validation removed - methodology now uses overlapping LEGOs instead
    // Ensure phrases don't over-rely on common vocabulary while neglecting underused LEGOs
    // SKIP for drafts — depends on cross-seed LEGO usage
    if (!isDraft && seed_number > 20) {  // Only check after enough vocabulary exists
      // Gather all phrases from this submission (supports both BUILD/USE and legacy format)
      const allNewPhrases = [];
      for (const lego of legos) {
        const isDuplicate = duplicateLegos.some(d => d.lego_id === `${seedId}L${String(lego.idx).padStart(2, '0')}`);
        if (!isDuplicate) {
          if (usesBuildUseFormat(lego)) {
            allNewPhrases.push(...(lego.build || []), ...(lego.use || []));
          } else if (lego.phrases) {
            allNewPhrases.push(...lego.phrases);
          }
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

      // RALPH LOOP: Record lessons from each error type (async, don't block response)
      for (const err of errors) {
        recordLessonFromError(course_code, err.type, err).catch(() => {});
      }

      return res.status(400).json({
        error: 'Validation failed',
        seed: seedId,
        errors,
        warnings,
        skills: ['ralph-methodology.md'],
        hint: 'Fix all errors and resubmit. Nothing was inserted. Review ralph-methodology.md for methodology guidance.'
      });
    }

    // =========================================================================
    // DRAFT PATH: Upsert into course_seed_drafts and return early
    // =========================================================================
    if (isDraft) {
      const { error: draftError } = await supabase
        .from('course_seed_drafts')
        .upsert({
          course_code,
          seed_number,
          known_text,
          target_text,
          submission_data: { legos: legos },
          validation_status: 'valid',
          validation_notes: {
            validated_at: new Date().toISOString(),
            validations_passed: ['tiling', 'vocab', 'build_use', 'phrase_counts', 'complexity', 'length_ratio'],
            validations_skipped: ['zut', 'balance']
          },
          updated_at: new Date().toISOString()
        }, { onConflict: 'course_code,seed_number' });

      if (draftError) throw new Error(`Draft upsert failed: ${draftError.message}`);

      console.log(`✓ ${seedId} DRAFTED (parallel mode)`);
      console.log(`  LEGOs: ${legos.length}`);
      console.log(`${'='.repeat(60)}\n`);

      return res.json({
        ok: true,
        seed: seedId,
        status: 'DRAFTED',
        action: 'PROCEED TO NEXT SEED',
        known_text,
        target_text,
        legos: legos.length,
        phrases: legos.reduce((sum, l) => sum + (l.build?.length || 0) + (l.use?.length || 0) + (l.phrases?.length || 0), 0),
        warnings: warnings.length > 0 ? { note: 'Warnings for next seed', items: warnings } : undefined,
        hint: 'Draft saved. Run POST /api/course/:code/finalize when all seeds are drafted.'
      });
    }

    // =========================================================================
    // INSERT PHASE (all validations passed — non-draft path)
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
        decomposed_at: new Date().toISOString(),
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

      // Generate phrases (with M-LEGO build-up for components)
      let allPhraseRows = [];
      let buildupCount = 0;
      let practiceStartPosition = 1;

      // Role counters for deterministic phrase IDs
      let roleCounts = { component: 0, build: 0, use: 0 };

      // M-TYPE BUILD-UP (components for display)
      // Components are ALWAYS generated for M-LEGOs, regardless of format
      if (lego.type === 'M' && lego.components && lego.components.length > 0) {
        const buildupResult = generateBuildupPhrases(
          { seed: seed_number, idx: lego.idx, known: lego.known, target: lego.target, components: lego.components },
          course_code
        );
        allPhraseRows = [...buildupResult.buildupPhrases];
        buildupCount = buildupResult.buildupPhrases.length;
        practiceStartPosition = buildupResult.startPosition;
        roleCounts = { ...buildupResult.roleCounts };
        totalBuildupPhrases += buildupCount;
      }

      // Check if using new BUILD/USE format (ralph-methodology.md)
      if (usesBuildUseFormat(lego)) {
        // NEW FORMAT: Process BUILD and USE arrays with explicit roles
        const buildPhrases = lego.build || [];
        const usePhrases = lego.use || [];

        // BUILD phrases (role='build', NOT eternal-eligible)
        const buildRows = buildPhrases.map((p, i) => {
          roleCounts.build++;
          return {
            id: makePhraseId(course_code, seed_number, lego.idx, 'build', roleCounts.build),
            course_code,
            seed_number,
            lego_index: lego.idx,
            position: practiceStartPosition + i,
            known_text: p.known,
            target_text: p.target,
            word_count: p.target.length,
            lego_count: (p.known.match(/\s+/g) || []).length + 1,
            phrase_role: 'build',
            connected_lego_ids: [],
            lego_position: computeLegoPosition(p.target, lego.target),
            metadata: { format: 'build_use' },
            status: 'draft',
            version: 1
          };
        });

        // USE phrases (role='use', ALL eternal-eligible, with quality score)
        const useRows = usePhrases.map((p, i) => {
          roleCounts.use++;
          return {
            id: makePhraseId(course_code, seed_number, lego.idx, 'use', roleCounts.use),
            course_code,
            seed_number,
            lego_index: lego.idx,
            position: practiceStartPosition + buildPhrases.length + i,
            known_text: p.known,
            target_text: p.target,
            word_count: p.target.length,
            lego_count: (p.known.match(/\s+/g) || []).length + 1,
            phrase_role: 'use',
            connected_lego_ids: [],
            lego_position: computeLegoPosition(p.target, lego.target),
            metadata: {
              format: 'build_use',
              score: p.score,
              scored_at: new Date().toISOString()
            },
            status: 'draft',
            version: 1
          };
        });

        // Calculate average score for logging
        const avgScore = usePhrases.length > 0
          ? (usePhrases.reduce((sum, p) => sum + p.score, 0) / usePhrases.length).toFixed(1)
          : 0;

        allPhraseRows = [...allPhraseRows, ...buildRows, ...useRows];
        console.log(`    BUILD/USE format: ${buildRows.length} build + ${useRows.length} use phrases (avg score: ${avgScore})`);

      } else if (lego.phrases && lego.phrases.length > 0) {
        // LEGACY FORMAT: Process flat phrases array
        // DEDUPLICATION: Filter out phrases that duplicate build-up (normalized comparison)
        // "I want" == "I want." == "i want" pedagogically
        const buildupNormalized = new Set(allPhraseRows.map(p => normalizePhrase(p.target_text)));
        const seenNormalized = new Set();  // Track within this batch too
        const dedupedPhrases = lego.phrases.filter(p => {
          const norm = normalizePhrase(p.target);
          if (buildupNormalized.has(norm) || seenNormalized.has(norm)) {
            return false;
          }
          seenNormalized.add(norm);
          return true;
        });
        const dedupedCount = lego.phrases.length - dedupedPhrases.length;
        if (dedupedCount > 0) {
          console.log(`    Deduped ${dedupedCount} phrases (normalized: case/punctuation insensitive)`);
        }

        const sorted = [...dedupedPhrases].sort((a, b) => a.target.length - b.target.length);

        const practicePhrases = sorted.map((p, i) => {
          const position = practiceStartPosition + i;
          const role = computePhraseRole(position);
          roleCounts[role] = (roleCounts[role] || 0) + 1;
          return {
            id: makePhraseId(course_code, seed_number, lego.idx, role, roleCounts[role]),
            course_code,
            seed_number,
            lego_index: lego.idx,
            position,
            known_text: p.known,
            target_text: p.target,
            word_count: p.target.length,
            lego_count: (p.known.match(/\s+/g) || []).length + 1,
            phrase_role: role,
            connected_lego_ids: [],
            lego_position: computeLegoPosition(p.target, lego.target),
            metadata: p.score ? { score: p.score } : {},
            status: 'draft',
            version: 1
          };
        });

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

    // EMPTY SEED HANDLING: When ALL words in the seed target are already in vocab,
    // no new LEGOs are needed. Instead, add the seed sentence as a USE phrase to
    // the LEGO that introduced the "newest" word in the seed (highest-indexed).
    if (skippedDuplicates === legos.length && skippedDuplicates > 0) {
      // Get all is_new=true LEGOs from earlier seeds to build word→LEGO map
      const { data: allNewLegos } = await supabase
        .from('course_legos')
        .select('seed_number, lego_index, target_text')
        .eq('course_code', course_code)
        .eq('is_new', true)
        .lt('seed_number', seed_number)
        .order('seed_number');

      // Build word→introducing LEGO map (first LEGO to contain the word wins)
      const wordIntroducedBy = {};
      for (const l of (allNewLegos || [])) {
        const words = extractVocab(l.target_text, chinese);
        for (const w of words) {
          if (!wordIntroducedBy[w]) {
            wordIntroducedBy[w] = { seed_number: l.seed_number, lego_index: l.lego_index, target_text: l.target_text };
          }
        }
      }

      // For each word in the seed target, find its introducing LEGO, pick the highest
      const seedWords = extractVocab(target_text, chinese);
      let bestSeedNum = -1;
      let bestLegoIdx = -1;
      let bestLegoTarget = null;

      for (const w of seedWords) {
        const intro = wordIntroducedBy[w];
        if (!intro) continue;
        if (intro.seed_number > bestSeedNum ||
            (intro.seed_number === bestSeedNum && intro.lego_index > bestLegoIdx)) {
          bestSeedNum = intro.seed_number;
          bestLegoIdx = intro.lego_index;
          bestLegoTarget = intro.target_text;
        }
      }

      if (bestSeedNum >= 0) {
        const bestLegoId = `S${String(bestSeedNum).padStart(4,'0')}L${String(bestLegoIdx).padStart(2,'0')}`;

        // Find max position and existing USE count for deterministic ID
        const { data: existingPhrases } = await supabase
          .from('course_practice_phrases')
          .select('position, phrase_role')
          .eq('course_code', course_code)
          .eq('seed_number', bestSeedNum)
          .eq('lego_index', bestLegoIdx);

        const maxPos = existingPhrases?.reduce((max, p) => Math.max(max, p.position), 0) || 0;
        const existingUseCount = existingPhrases?.filter(p => p.phrase_role === 'use').length || 0;

        const { error: seedPhraseError } = await supabase
          .from('course_practice_phrases')
          .insert({
            id: makePhraseId(course_code, bestSeedNum, bestLegoIdx, 'use', existingUseCount + 1),
            course_code,
            seed_number: bestSeedNum,
            lego_index: bestLegoIdx,
            position: maxPos + 1,
            known_text: known_text,
            target_text: target_text,
            word_count: target_text.length,
            lego_count: (known_text.match(/\s+/g) || []).length + 1,
            phrase_role: 'use',
            connected_lego_ids: [],
            lego_position: computeLegoPosition(target_text, bestLegoTarget),
            metadata: {
              format: 'build_use',
              source: 'seed_sentence',
              source_seed: seed_number,
              score: 8
            },
            status: 'draft',
            version: 1
          });

        if (seedPhraseError) {
          console.warn(`  ⚠ Could not add seed as USE phrase: ${seedPhraseError.message}`);
        } else {
          totalPhrases++;
          console.log(`  ✓ Empty seed → USE phrase for ${bestLegoId} (${bestLegoTarget})`);
        }
      } else {
        console.log(`  ⚠ Empty seed but no introducing LEGO found for any word`);
      }
    }

    console.log(`\n✓ ${seedId} COMPLETE`);
    console.log(`  LEGOs: ${legos.length} (${skippedDuplicates} duplicates)`);
    console.log(`  Phrases: ${totalPhrases} (${totalBuildupPhrases} buildup)`);
    console.log(`${'='.repeat(60)}\n`);

    // Find next incomplete seed to guide agent
    const { data: allSeeds } = await supabase
      .from('course_seeds')
      .select('seed_number, known_text, decomposed_at')
      .eq('course_code', course_code)
      .gt('seed_number', seed_number)
      .order('seed_number')
      .limit(50);

    const nextSeed = allSeeds?.find(s => !s.decomposed_at && s.known_text);

    // Record activity for stall detection
    recordActivity(course_code, seed_number);

    // CHECK FOR CHECKPOINT - if seed 10/50/150/260 just completed
    if (await isCheckpointRequired(course_code, seed_number)) {
      const checkpointNum = CHECKPOINT_SEEDS.indexOf(seed_number) + 1;
      const checkpointConfig = await getCheckpointConfig(course_code, seed_number);

      console.log(`\n${'='.repeat(60)}`);
      console.log(`CHECKPOINT ${checkpointNum} REACHED: Seed ${seed_number} complete`);
      console.log(`Review mode: ${checkpointConfig.review_mode} (from database config)`);
      console.log(`${'='.repeat(60)}\n`);

      if (checkpointConfig.review_mode === 'auto' || checkpointConfig.review_mode === 'auto_with_flag') {
        // AUTOMATED QA: Spawn QA agent to verify quality before continuing
        console.log(`Spawning automated QA agent for checkpoint ${seed_number}...`);

        // Mark as pending QA
        await approveCheckpoint(course_code, seed_number, null, {
          review_mode_used: checkpointConfig.review_mode,
          awaiting_qa: true
        }, 'pending_qa');

        // NO AUTO-SPAWN: Dashboard controls agent spawning
        // Just log that checkpoint needs QA - dashboard will spawn agent
        console.log(`[CHECKPOINT] ${course_code}: Checkpoint ${seed_number} awaiting QA (spawn from dashboard)`);
        res.locals.checkpointAwaitingQA = {
          checkpoint_seed: seed_number,
          checkpoint_number: checkpointNum,
          status: 'AWAITING_QA',
          message: 'Checkpoint reached. Dashboard will spawn QA agent when ready.'
        };
        // Fall through to normal response - don't block the build agent

        // Check if QA is pending (will be false since we don't auto-spawn anymore)
        if (isQAPending(course_code)) {
          return res.json({
            ok: true,
            seed: seedId,
            status: 'CHECKPOINT_QA_PENDING',
            action: 'WAIT_FOR_QA',
            known_text,
            target_text,
            legos: legos.length,
            phrases: totalPhrases,

            checkpoint: {
              checkpoint_seed: seed_number,
              checkpoint_number: checkpointNum,
              review_mode: checkpointConfig.review_mode,
              message: 'QA agent spawned in separate terminal. WAIT for QA to complete.',
              qa_status_url: `/api/checkpoint/qa-status/${course_code}`,
              expected_duration: '1-2 minutes',
              instructions: [
                'QA agent is independently scoring sample phrases',
                `Will auto-approve if drift <= ${QA_DRIFT_THRESHOLD} points`,
                'Check QA status, then continue when approved',
                'DO NOT resubmit this seed - it is saved'
              ]
            },

            next_action: {
              wait: 'Poll /api/checkpoint/qa-status/' + course_code + ' until qa_pending=false',
              then: 'Check /api/checkpoint/status/' + course_code + ' for approval',
              continue_url: `/api/resume/${course_code}`
            }
          });
        }
        // If we get here, QA was auto-approved via fallback - continue normally
      } else {
        // HUMAN REVIEW REQUIRED: Stop and wait for human approval
        console.log(`Human review required - agent must wait for approval`);

        // Get summary stats for QA
        const { count: legoCount } = await supabase
          .from('course_legos')
          .select('*', { count: 'exact', head: true })
          .eq('course_code', course_code);

        const { count: phraseCount } = await supabase
          .from('course_practice_phrases')
          .select('*', { count: 'exact', head: true })
          .eq('course_code', course_code);

        // Get USE phrase scores for summary
        const { data: usePhrases } = await supabase
          .from('course_practice_phrases')
          .select('metadata')
          .eq('course_code', course_code)
          .eq('phrase_role', 'use');

        const scores = (usePhrases || [])
          .map(p => p.metadata?.score)
          .filter(s => typeof s === 'number');
        const avgScore = scores.length > 0
          ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
          : 'N/A';

        // Record pending status in database
        await approveCheckpoint(course_code, seed_number, null, {
          review_mode_used: 'human',
          awaiting_approval: true
        }, 'pending_human');

        return res.json({
          ok: true,
          seed: seedId,
          status: 'CHECKPOINT_REACHED',
          action: 'AWAIT_QA_APPROVAL',
          known_text,
          target_text,
          legos: legos.length,
          phrases: totalPhrases,

          checkpoint: {
            checkpoint_seed: seed_number,
            checkpoint_number: checkpointNum,
            all_checkpoints: CHECKPOINT_SEEDS,
            review_mode: checkpointConfig.review_mode,
            message: 'Human QA review required before continuing',
            summary: {
              seeds_complete: seed_number,
              total_legos: legoCount,
              total_phrases: phraseCount,
              use_phrase_avg_score: avgScore,
              scores_distribution: scores.length > 0 ? {
                count: scores.length,
                high_9: scores.filter(s => s === 9).length,
                good_7_8: scores.filter(s => s >= 7 && s < 9).length,
                ok_5_6: scores.filter(s => s >= 5 && s < 7).length,
                low_1_4: scores.filter(s => s < 5).length
              } : null
            },
            next_steps: [
              '1. Run QA agent: GET /api/checkpoint/summary/' + course_code,
              '2. QA agent samples and re-scores USE phrases',
              '3. If alignment good: POST /api/checkpoint/approve/' + course_code,
              '4. Build agent resumes with seed ' + (seed_number + 1)
            ]
          }
        });
      }
    }

    // Get recency hints for next iteration (avoid pattern fatigue)
    // Skip for golden seeds (hand-crafted, don't need recency analysis)
    let recencyHints = null;
    let goldenCountForRecency = 10;
    try {
      const { data: courseForRecency } = await supabase
        .from('courses').select('quality_rules').eq('course_code', course_code).single();
      goldenCountForRecency = getGoldenSeedCount(courseForRecency);
    } catch (e) { /* default to 10 */ }
    if (nextSeed && seed_number > goldenCountForRecency) {
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

    // Check if a checkpoint was auto-approved
    const checkpointAutoApproved = res.locals.checkpointAutoApproved;

    // Update build_jobs with progress (fire-and-forget, don't block response)
    // STUCK DETECTION: Track last_progress_at separately from heartbeat
    // - last_heartbeat = agent is alive (updated by any activity)
    // - last_progress_at = agent is making progress (updated only when seed submitted)
    // If heartbeat fresh but progress stale = agent stuck waiting for input → respawn
    const progressTimestamp = new Date().toISOString();
    supabase.from('build_jobs')
      .update({
        current_seed: seed_number,
        seeds_completed: seed_number,
        last_heartbeat: progressTimestamp,
        last_progress_at: progressTimestamp,  // Track actual progress for stuck detection
        machine_name: MACHINE_NAME
      })
      .eq('course_code', course_code)
      .eq('status', 'running')
      .then(({ error }) => {
        if (error) console.error(`[BUILD] build_jobs update failed:`, error.message);
      });

    res.json({
      ok: true,
      seed: seedId,
      status: 'INSERTED',  // Explicit: this seed is DONE
      action: 'PROCEED TO NEXT SEED',  // Clear instruction
      known_text,
      target_text,
      legos: legos.length,
      duplicates_skipped: skippedDuplicates,
      phrases: totalPhrases,
      buildup_phrases: totalBuildupPhrases,

      // CHECKPOINT AUTO-APPROVED - explicit signal to NOT STOP
      checkpoint_auto_approved: checkpointAutoApproved || undefined,

      // Warnings are for FUTURE improvement, NOT for resubmission
      warnings: warnings.length > 0 ? {
        note: 'THESE ARE FOR YOUR NEXT SEED - this seed is already saved. Do NOT resubmit.',
        items: warnings
      } : undefined,

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

      // SESSION TRACKING
      session: (() => {
        const activity = courseActivity.get(course_code);
        const seedsThisSession = activity?.seedsThisSession || 1;
        return {
          seeds_this_session: seedsThisSession,
          suggestion: 'CONTINUE',
          message: 'Keep building. Full course in one context window.'
        };
      })(),

      // YOUR NEXT TASK - proceed immediately (unless session suggests exit)
      next_seed: nextSeed ? {
        instruction: 'BUILD THIS SEED NOW - do not resubmit the previous one',
        seed_number: nextSeed.seed_number,
        known_text: nextSeed.known_text,
        recency_hints: recencyHints
      } : {
        instruction: 'ALL SEEDS COMPLETE - say BATCH COMPLETE and exit'
      }
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

  // Count only NEW legos (unique introductions, not duplicates)
  const { count: newLegos } = await supabase
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .eq('is_new', true);

  const { count: phrases } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode);

  // Get seed_count from courses table (the release target)
  const { data: courseData } = await supabase
    .from('courses')
    .select('seed_count')
    .eq('course_code', courseCode)
    .single();
  const totalSeeds = courseData?.seed_count || 300;

  // Count completed seeds (those with non-empty target_text)
  const { count: completedSeeds } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .neq('target_text', '');

  // Count seeds with decomposition done (includes empty seeds where all LEGOs were duplicates)
  const { count: seedsWithLegos } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .not('decomposed_at', 'is', null);

  // Ratio based on total legos (phrases per LEGO)
  const totalLegos = legos || 0;
  const ratio = totalLegos > 0 ? (phrases/totalLegos) : 0;
  const quality = ratio >= MIN_BATCH_PHRASE_RATIO ? 'PASS' : 'FAIL';

  // Get vocab size
  const vocabSet = await loadCourseVocab(courseCode);
  const chinese = isChinese(courseCode);

  // Draft counts (for parallel builds)
  let draftCount = 0;
  let validDrafts = 0;
  try {
    const { count: dc } = await supabase
      .from('course_seed_drafts')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode);
    draftCount = dc || 0;

    const { count: vd } = await supabase
      .from('course_seed_drafts')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .eq('validation_status', 'valid');
    validDrafts = vd || 0;
  } catch (e) {
    // Draft table may not exist yet — ignore
  }

  res.json({
    course_code: courseCode,
    total_seeds: totalSeeds,
    completed_seeds: completedSeeds || 0,
    seeds_with_legos: seedsWithLegos || 0,
    seeds: seedsWithLegos || 0,  // Legacy field, same as seeds_with_legos
    legos: totalLegos,           // Total LEGOs (all records)
    legos_new: newLegos || 0,    // Unique introductions (is_new=true)
    phrases: phrases || 0,
    ratio: ratio.toFixed(1),
    vocab_size: vocabSet.size,
    vocab_mode: chinese ? 'characters' : 'words',
    quality,
    drafts_total: draftCount,
    drafts_valid: validDrafts,
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
app.get('/api/activity', async (req, res) => {
  const activity = getActivityStatus();

  // Cross-check with database: only include courses with active jobs
  // This prevents showing stalled courses that have been intentionally stopped
  let activeCourseCodes = new Set();
  try {
    const { data: activeJobs } = await supabase
      .from('build_jobs')
      .select('course_code')
      .in('status', ['running', 'stalled']);
    if (activeJobs) {
      activeCourseCodes = new Set(activeJobs.map(j => j.course_code));
    }
  } catch (err) {
    console.error('[ACTIVITY] Failed to check active jobs in DB:', err.message);
    // If DB check fails, fall back to in-memory only
    activeCourseCodes = new Set(Object.keys(activity));
  }

  // Filter activity to only include courses with active jobs in database
  const filteredActivity = {};
  for (const [code, status] of Object.entries(activity)) {
    if (activeCourseCodes.has(code)) {
      filteredActivity[code] = status;
    } else {
      // Clean up stale in-memory entry
      courseActivity.delete(code);
      agentHeartbeats.delete(code);
    }
  }

  const stalledCourses = Object.entries(filteredActivity)
    .filter(([_, status]) => status.stalled)
    .map(([code, _]) => code);

  const agents = getActiveAgents();
  const runningAgents = agents.filter(a => a.status === 'running');

  res.json({
    courses: filteredActivity,
    stalled: stalledCourses,
    stalled_count: stalledCourses.length,
    threshold_minutes: STALL_THRESHOLD_MS / 60000,
    agents: {
      running: runningAgents,
      running_count: runningAgents.length,
      total_tracked: agents.length
    },
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

/**
 * POST /api/activity/:courseCode/reset-session - Reset session counter for new agent
 *
 * Call this when spawning a new agent to reset the seeds_this_session counter.
 * This allows the new agent to work for another BATCH_SIZE seeds before exiting.
 */
app.post('/api/activity/:courseCode/reset-session', (req, res) => {
  const { courseCode } = req.params;

  resetSession(courseCode);

  const activity = courseActivity.get(courseCode);
  res.json({
    ok: true,
    course_code: courseCode,
    seeds_this_session: activity?.seedsThisSession || 0,
    batch_size: BATCH_SIZE,
    message: 'Session counter reset - new agent can work for ' + BATCH_SIZE + ' seeds'
  });
});

// =============================================================================
// HEARTBEAT ENDPOINT - Agent liveness tracking
// =============================================================================

/**
 * POST /api/heartbeat/:courseCode - Agent heartbeat
 *
 * Agents should call this every 60 seconds while working.
 * This tracks agent liveness separate from seed submissions.
 * Used by stall watcher and /api/build/active to detect live agents.
 */
app.post('/api/heartbeat/:courseCode', (req, res) => {
  const { courseCode } = req.params;
  const { agent_id, status, current_seed } = req.body;

  const now = Date.now();
  const existing = agentHeartbeats.get(courseCode);

  agentHeartbeats.set(courseCode, {
    lastHeartbeat: now,
    agentId: agent_id || existing?.agentId || 'unknown',
    status: status || 'working',
    currentSeed: current_seed || existing?.currentSeed || null,
    startedAt: existing?.startedAt || now
  });

  console.log(`[HEARTBEAT] ${courseCode}: agent=${agent_id || 'unknown'} status=${status || 'working'} seed=${current_seed || '?'}`);

  res.json({
    ok: true,
    course_code: courseCode,
    heartbeat_interval_ms: 60000,
    timeout_ms: HEARTBEAT_TIMEOUT_MS,
    message: 'Heartbeat received'
  });
});

/**
 * GET /api/heartbeats - Get all active heartbeats
 */
app.get('/api/heartbeats', (req, res) => {
  const now = Date.now();
  const heartbeats = [];

  for (const [courseCode, hb] of agentHeartbeats.entries()) {
    const elapsed = now - hb.lastHeartbeat;
    const isAlive = elapsed < HEARTBEAT_TIMEOUT_MS;

    heartbeats.push({
      course_code: courseCode,
      agent_id: hb.agentId,
      status: hb.status,
      current_seed: hb.currentSeed,
      last_heartbeat: new Date(hb.lastHeartbeat).toISOString(),
      elapsed_ms: elapsed,
      is_alive: isAlive,
      started_at: new Date(hb.startedAt).toISOString()
    });
  }

  res.json({
    active_agents: heartbeats.filter(h => h.is_alive).length,
    heartbeats
  });
});

// =============================================================================
// AGENT MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * POST /api/agents/register - Register a new agent (called by monitor when spawning)
 */
app.post('/api/agents/register', (req, res) => {
  const { pid, course_code } = req.body;
  if (!pid || !course_code) {
    return res.status(400).json({ ok: false, error: 'pid and course_code required' });
  }
  registerAgent(Number(pid), course_code);
  res.json({ ok: true, message: `Agent ${pid} registered for ${course_code}` });
});

/**
 * POST /api/agents/:pid/submission - Record a submission from an agent
 */
app.post('/api/agents/:pid/submission', (req, res) => {
  const pid = Number(req.params.pid);
  const { seed_number } = req.body;
  recordAgentSubmission(pid, seed_number);
  res.json({ ok: true });
});

/**
 * POST /api/agents/:pid/complete - Mark an agent as completed
 */
app.post('/api/agents/:pid/complete', (req, res) => {
  const pid = Number(req.params.pid);
  markAgentComplete(pid);
  res.json({ ok: true, message: `Agent ${pid} marked complete` });
});

/**
 * GET /api/agents - List all tracked agents
 */
app.get('/api/agents', (req, res) => {
  res.json({
    agents: getActiveAgents(),
    total: activeAgents.size
  });
});

/**
 * DELETE /api/agents/:pid - Kill an agent by PID
 */
app.delete('/api/agents/:pid', (req, res) => {
  const pid = Number(req.params.pid);
  try {
    process.kill(pid, 'SIGTERM');
    markAgentComplete(pid);
    res.json({ ok: true, message: `Sent SIGTERM to agent ${pid}` });
  } catch (err) {
    res.status(400).json({ ok: false, error: `Failed to kill ${pid}: ${err.message}` });
  }
});

// =============================================================================
// BUILD MANAGER ENDPOINTS
// =============================================================================

/**
 * POST /api/build/start/:courseCode - Start a parallel build with agent spawning
 *
 * Spawns a coordinator agent which orchestrates ~10 sub-agents via Task tool.
 */
app.post('/api/build/start/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const { terminal = 'iTerm2', targetSeeds = 668 } = req.body || {};

  try {
    const result = await startBuild(courseCode, terminal, targetSeeds);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/build/stop/:courseCode - Stop an active build
 */
app.post('/api/build/stop/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const result = await stopBuild(courseCode);
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
 * POST /api/qa/start/:courseCode - Start a parallel QA pass
 *
 * Spawns a coordinator agent which orchestrates ~10 sub-agents to check grammar/naturalness.
 */
app.post('/api/qa/strict/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const { terminal = 'iTerm2' } = req.body || {};

  try {
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('course_code, display_name, seed_count')
      .eq('course_code', courseCode)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ ok: false, error: `Course ${courseCode} not found` });
    }

    const prompt = generateStrictQABrief({ courseCode, courseInfo: course });
    const tmpFile = `/tmp/claude_qa_strict_${courseCode}_${Date.now()}.txt`;
    require('fs').writeFileSync(tmpFile, prompt);

    const projectDir = __dirname.replace('/services', '');
    const claudeCmd = `cd "${projectDir}" && claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`;
    const effectiveTerminal = SPAWN_MODE === 'headless' ? 'headless' : terminal;

    console.log(`[QA-STRICT] Spawning strict QA for ${courseCode} seeds 1-50 in ${effectiveTerminal}`);

    let agent;
    if (effectiveTerminal === 'headless') {
      const fs = require('fs');
      const logsDir = require('path').join(projectDir, 'logs');
      if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
      const logFile = `${logsDir}/qa-strict-${courseCode}.log`;
      const out = fs.openSync(logFile, 'a');
      const err = fs.openSync(logFile, 'a');
      agent = spawn('bash', ['-c', claudeCmd], { detached: true, stdio: ['ignore', out, err] });
      agent.unref();
    } else {
      const osascript = `
tell application "iTerm"
    activate
    set newWindow to (create window with default profile)
    set targetSession to current session of newWindow
    tell targetSession
        set name to "QA Strict: ${courseCode}"
        write text "${claudeCmd.replace(/"/g, '\\"')}"
    end tell
end tell
return "spawned"`;
      const { execSync } = require('child_process');
      execSync(`osascript -e '${osascript.replace(/'/g, "'\\''")}'`);
    }

    res.json({
      ok: true,
      mode: 'strict_qa',
      course_code: courseCode,
      seed_range: '1-50',
      message: `Strict QA agent spawned for seeds 1-50 (single Opus agent, no sub-agents)`
    });
  } catch (err) {
    console.error(`[QA-STRICT] Error:`, err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/qa/start/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const { terminal = 'iTerm2' } = req.body || {};

  try {
    // Verify course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('course_code, display_name, seed_count')
      .eq('course_code', courseCode)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ ok: false, error: `Course ${courseCode} not found` });
    }

    // Check current QA progress
    const { count: totalPhrases } = await supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode);

    if (!totalPhrases || totalPhrases === 0) {
      return res.status(400).json({ ok: false, error: `No phrases found for ${courseCode} — build course first` });
    }

    const { count: uncheckedPhrases } = await supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .is('qa_checked', null);

    if (uncheckedPhrases === 0) {
      return res.json({ ok: false, error: `All ${totalPhrases} phrases already QA checked` });
    }

    console.log(`[QA] Starting parallel QA for ${courseCode}: ${uncheckedPhrases}/${totalPhrases} unchecked phrases`);

    const { agent, batches } = await spawnParallelQAAgent(courseCode, terminal);

    res.json({
      ok: true,
      mode: 'parallel_qa',
      course_code: courseCode,
      batches,
      phrases: {
        total: totalPhrases,
        unchecked: uncheckedPhrases
      },
      message: `Parallel QA started — coordinator agent spawned with ${batches} batches`
    });
  } catch (err) {
    console.error(`[QA] Error starting QA for ${courseCode}:`, err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/build/active - List all active builds
 *
 * Returns builds from two sources:
 * 1. Formally registered builds (activeBuilds Map)
 * 2. Courses with recent activity (courseActivity Map) - detected from API submissions
 */
app.get('/api/build/active', async (req, res) => {
  const builds = [];
  const seenCourses = new Set();

  // 1. Formally registered builds
  for (const [courseCode, build] of activeBuilds.entries()) {
    seenCourses.add(courseCode);
    const progress = await getBuildProgress(courseCode);
    builds.push({
      course_code: courseCode,
      status: build.status,
      agent_count: build.agentCount,
      progress: progress,
      source: 'registered'
    });
  }

  // 2. Courses with recent activity (not stalled, not already in activeBuilds)
  const now = Date.now();
  for (const [courseCode, activity] of courseActivity.entries()) {
    if (seenCourses.has(courseCode)) continue;

    const elapsed = now - activity.lastSubmission;
    const isActive = elapsed < STALL_THRESHOLD_MS;  // Active if submission within 5 min

    if (isActive) {
      const progress = await getBuildProgress(courseCode);
      builds.push({
        course_code: courseCode,
        status: activity.status === 'BATCH_COMPLETE' ? 'batch_complete' : 'agent_running',
        agent_count: 1,  // Assume 1 agent if detected from activity
        progress: progress,
        source: 'activity',
        last_seed: activity.lastSeed,
        seeds_this_session: activity.seedsThisSession,
        last_submission: new Date(activity.lastSubmission).toISOString()
      });
      seenCourses.add(courseCode);
    }
  }

  // 3. Courses with active heartbeats (agent alive but may not have submitted yet)
  for (const [courseCode, hb] of agentHeartbeats.entries()) {
    if (seenCourses.has(courseCode)) continue;

    const elapsed = now - hb.lastHeartbeat;
    const isAlive = elapsed < HEARTBEAT_TIMEOUT_MS;  // Alive if heartbeat within 3 min

    if (isAlive) {
      const progress = await getBuildProgress(courseCode);
      builds.push({
        course_code: courseCode,
        status: 'agent_running',
        agent_count: 1,
        progress: progress,
        source: 'heartbeat',
        agent_id: hb.agentId,
        current_seed: hb.currentSeed,
        last_heartbeat: new Date(hb.lastHeartbeat).toISOString()
      });
      seenCourses.add(courseCode);
    }
  }

  res.json({
    active_builds: builds.length,
    builds
  });
});

/**
 * POST /api/build/rebuild/:courseCode - Wipe and rebuild a seed range
 *
 * Deletes phrases + LEGOs in range, NULLs decomposed_at, creates build_jobs record.
 * Used for pass-2 rebuilds where seed translations already exist.
 */
app.post('/api/build/rebuild/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const { from_seed = 11, to_seed = 300 } = req.body || {};

  try {
    // Validate range
    if (from_seed < 1 || to_seed < from_seed) {
      return res.status(400).json({ ok: false, error: `Invalid range: ${from_seed}-${to_seed}` });
    }

    // Check for active build
    const { data: activeJob } = await supabase
      .from('build_jobs')
      .select('id, status')
      .eq('course_code', courseCode)
      .in('status', ['running'])
      .limit(1)
      .maybeSingle();

    if (activeJob) {
      return res.status(409).json({ ok: false, error: 'Build already running - stop it first' });
    }

    console.log(`[REBUILD] Starting rebuild of ${courseCode} seeds ${from_seed}-${to_seed}...`);

    // 1. Delete phrases in range
    const { count: phrasesDeleted } = await supabase
      .from('course_practice_phrases')
      .delete({ count: 'exact' })
      .eq('course_code', courseCode)
      .gte('seed_number', from_seed)
      .lte('seed_number', to_seed);

    console.log(`[REBUILD] Deleted ${phrasesDeleted || 0} phrases`);

    // 2. Delete LEGOs in range
    const { count: legosDeleted } = await supabase
      .from('course_legos')
      .delete({ count: 'exact' })
      .eq('course_code', courseCode)
      .gte('seed_number', from_seed)
      .lte('seed_number', to_seed);

    console.log(`[REBUILD] Deleted ${legosDeleted || 0} LEGOs`);

    // 3. NULL decomposed_at in range
    const { count: seedsReset } = await supabase
      .from('course_seeds')
      .update({ decomposed_at: null }, { count: 'exact' })
      .eq('course_code', courseCode)
      .gte('seed_number', from_seed)
      .lte('seed_number', to_seed);

    console.log(`[REBUILD] Reset ${seedsReset || 0} seeds (decomposed_at → null)`);

    // 4. Clear vocab cache
    courseVocabCache.delete(courseCode);

    console.log(`[REBUILD] Wiped ${courseCode} seeds ${from_seed}-${to_seed} — use Start Course Builder to launch agents`);

    res.json({
      ok: true,
      seeds_to_build: to_seed - from_seed + 1,
      phrases_deleted: phrasesDeleted || 0,
      legos_deleted: legosDeleted || 0,
      seeds_reset: seedsReset || 0
    });

  } catch (err) {
    console.error('[REBUILD] Error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/build/seed-grid/:courseCode - Seed status grid for visualization
 *
 * Returns status of every seed: complete, building, or empty.
 * Polled by dashboard to show real-time build progress.
 */
app.get('/api/build/seed-grid/:courseCode', async (req, res) => {
  const { courseCode } = req.params;

  try {
    // Get course seed_count to limit grid
    const { data: courseData } = await supabase
      .from('courses')
      .select('seed_count')
      .eq('course_code', courseCode)
      .single();
    const maxSeed = courseData?.seed_count || 300;

    // Get seeds up to seed_count with their decomposed_at status
    const { data: seeds, error: seedError } = await supabase
      .from('course_seeds')
      .select('seed_number, decomposed_at')
      .eq('course_code', courseCode)
      .lte('seed_number', maxSeed)
      .order('seed_number');

    if (seedError) {
      return res.status(500).json({ ok: false, error: seedError.message });
    }

    // Get LEGO counts per seed (within range)
    const { data: legoCounts, error: legoError } = await supabase
      .from('course_legos')
      .select('seed_number')
      .eq('course_code', courseCode)
      .lte('seed_number', maxSeed);

    // Get phrase counts per seed (within range)
    const { data: phraseCounts, error: phraseError } = await supabase
      .from('course_practice_phrases')
      .select('seed_number')
      .eq('course_code', courseCode)
      .lte('seed_number', maxSeed);

    // Get draft seeds with validation status (parallel builds stage here before finalization)
    const { data: draftSeeds } = await supabase
      .from('course_seed_drafts')
      .select('seed_number, validation_status')
      .eq('course_code', courseCode)
      .lte('seed_number', maxSeed);

    const draftStatusMap = {};
    for (const d of draftSeeds || []) {
      draftStatusMap[d.seed_number] = d.validation_status || 'valid';
    }

    // Aggregate counts
    const legosBySeed = {};
    for (const l of legoCounts || []) {
      legosBySeed[l.seed_number] = (legosBySeed[l.seed_number] || 0) + 1;
    }

    const phrasesBySeed = {};
    for (const p of phraseCounts || []) {
      phrasesBySeed[p.seed_number] = (phrasesBySeed[p.seed_number] || 0) + 1;
    }

    // Build grid — statuses: complete, drafted, collision, rework, building, empty
    let complete = 0, building = 0, empty = 0, drafted = 0, collision = 0;
    const grid = (seeds || []).map(s => {
      const legos = legosBySeed[s.seed_number] || 0;
      const phrases = phrasesBySeed[s.seed_number] || 0;
      const draftStatus = draftStatusMap[s.seed_number];
      let status;
      if (s.decomposed_at) {
        status = 'complete';
        complete++;
      } else if (draftStatus === 'collision' || draftStatus === 'rework') {
        status = draftStatus;
        collision++;
      } else if (draftStatus === 'valid') {
        status = 'drafted';
        drafted++;
      } else if (legos > 0) {
        status = 'building';
        building++;
      } else {
        status = 'empty';
        empty++;
      }
      return { seed: s.seed_number, status, legos, phrases };
    });

    res.json({
      seeds: grid,
      total: grid.length,
      complete,
      drafted,
      collision,
      building,
      empty
    });

  } catch (err) {
    console.error('[SEED-GRID] Error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
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

  // AUTO-HEARTBEAT: Agent is alive and checking for work
  const now = Date.now();
  agentHeartbeats.set(courseCode, {
    lastHeartbeat: now,
    agentId: 'resume',
    status: 'checking',
    currentSeed: null,
    startedAt: agentHeartbeats.get(courseCode)?.startedAt || now
  });

  // Get course info including translation_analysis, quality_rules, and seed_count (Two-Pass workflow)
  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, translation_analysis, quality_rules, seed_count')
    .eq('course_code', courseCode)
    .single();

  // Get target seed count (defaults to 260 if not set)
  const targetSeedCount = courseInfo?.seed_count || 300;

  // Get all seeds with their completion status - FILTERED to target range
  const { data: allSeedsRaw } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', courseCode)
    .order('seed_number');

  // Filter to only seeds within target range (1 to seed_count)
  const allSeeds = allSeedsRaw?.filter(s => s.seed_number <= targetSeedCount) || [];

  // Get seeds that have been decomposed (completed) - also filtered to range
  const { data: completedData } = await supabase
    .from('course_seeds')
    .select('seed_number, decomposed_at')
    .eq('course_code', courseCode)
    .not('decomposed_at', 'is', null);

  const completedSeeds = new Set(
    (completedData || [])
      .filter(s => s.seed_number <= targetSeedCount)
      .map(s => s.seed_number)
  );

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

  // Get ALL LEGOs for full vocabulary access (essential for phrase generation)
  // RECENT FIRST: Nudges agent attention toward recently introduced LEGOs
  const { data: allLegos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, type, components')
    .eq('course_code', courseCode)
    .eq('is_new', true)  // Only canonical LEGOs, not re-uses
    .order('seed_number', { ascending: false })  // Recent first - subtle attention nudge
    .order('lego_index', { ascending: false });

  // Get vocab stats
  const vocabSet = await loadCourseVocab(courseCode);

  // Calculate progress
  const totalSeeds = allSeeds?.length || 0;
  const completedCount = completedSeeds.size;
  const progress = totalSeeds > 0 ? ((completedCount / totalSeeds) * 100).toFixed(1) : 0;

  // Two-Pass workflow: Calculate pass status
  // Pass 1: Translate all seeds in range (1 to seed_count) + save analysis
  // Pass 2: Decompose all seeds in range into LEGOs
  // targetSeedCount is defined above from courseInfo?.seed_count || 300
  const seedsInRange = allSeeds.length;  // Seeds 1 to targetSeedCount
  const seedsTranslated = allSeeds.filter(s => s.target_text && s.target_text.trim() !== '').length;
  const seedsDecomposed = completedSeeds.size;
  const analysisSaved = !!courseInfo?.translation_analysis;

  // Pass 1 complete when ALL seeds in range are translated AND analysis saved
  const pass1Complete = seedsTranslated >= seedsInRange && seedsInRange > 0 && analysisSaved;
  // Pass 2 complete when ALL seeds in range have LEGOs (no gaps!)
  const pass2Complete = seedsDecomposed >= seedsInRange;
  const currentPass = pass1Complete ? 2 : 1;

  // Get recency analysis for pattern/vocab distribution guidance
  const [patternAnalysis, vocabAnalysis] = await Promise.all([
    analyzePatternRecency(courseCode),
    analyzeVocabRecency(courseCode)
  ]);

  // Find next seed based on current pass
  // Pass 1: First seed without target_text
  const nextToTranslate = allSeeds?.find(s => !s.target_text || s.target_text.trim() === '');
  // Pass 2: First seed with translation but no LEGOs
  const nextToDecompose = allSeeds?.find(s =>
    s.target_text && s.target_text.trim() !== '' && !completedSeeds.has(s.seed_number)
  );

  // Build action instruction based on pass status
  let actionInstruction;
  if (!pass1Complete) {
    actionInstruction = {
      current_pass: 1,
      action: 'TRANSLATE ONLY - DO NOT CREATE LEGOs',
      description: `Translate all seeds to ${targetLangName}. ${seedsTranslated}/${totalSeeds} done.`,
      next_seed: nextToTranslate?.seed_number || null,
      endpoint: `PATCH /api/seed/${courseCode}/{seed_number}`,
      body: '{"target_text": "your translation"}',
      when_done: `POST /api/course/${courseCode}/analysis`
    };
    // Only show FIRST if just starting pass 1
    if (seedsTranslated === 0) {
      actionInstruction.FIRST = 'Read ralph-methodology.md - covers ZERO VARIATION, cognates, register consistency';
    }
  } else if (!pass2Complete) {
    actionInstruction = {
      current_pass: 2,
      action: 'DECOMPOSE INTO LEGOs',
      description: `Break seeds into LEGOs. ${seedsDecomposed}/${seedsInRange} done (target: seeds 1-${targetSeedCount}).`,
      next_seed: nextToDecompose ? {
        seed_number: nextToDecompose.seed_number,
        known_text: nextToDecompose.known_text,
        target_text: nextToDecompose.target_text
      } : null,
      endpoint: `POST /api/seed/complete`
    };
    // Only show FIRST if just starting pass 2
    if (seedsDecomposed === 0) {
      actionInstruction.FIRST = 'Read ralph-methodology.md for methodology guidance';
    }
  } else {
    actionInstruction = {
      current_pass: 'COMPLETE',
      action: 'COURSE COMPLETE',
      description: `All ${seedsInRange} seeds (1-${targetSeedCount}) translated and decomposed.`
    };
  }

  res.json({
    ACTION: actionInstruction,
    course_code: courseCode,
    target_language: targetLangName,
    translation_analysis: courseInfo?.translation_analysis || null,
    // Strip golden_decompositions from quality_rules (sent separately as GOLDEN_DECOMPOSITIONS in curated form)
    quality_rules: (() => {
      const rules = { ...(courseInfo?.quality_rules || {}) };
      delete rules.golden_decompositions;
      return Object.keys(rules).length > 0 ? rules : null;
    })(),

    // LEARNINGS - Language-pair specific insights from previous builds (APPLY THESE!)
    LEARNINGS: (() => {
      const learnings = courseInfo?.quality_rules?.learnings || [];
      if (learnings.length === 0) return null;

      // Group by category for easy scanning
      const byCategory = {};
      learnings.forEach(l => {
        if (!byCategory[l.category]) byCategory[l.category] = [];
        byCategory[l.category].push(l.learning);
      });

      return {
        _WARNING: `APPLY THESE ${learnings.length} LEARNINGS - they were discovered from previous QA`,
        ...byCategory
      };
    })(),

    // GOLDEN DECOMPOSITIONS - Human-verified examples from calibration (FOLLOW THESE PATTERNS!)
    // Cap at ~5 evenly-spaced examples to keep prompt size manageable (50 golden seeds = ~35KB otherwise)
    GOLDEN_DECOMPOSITIONS: (() => {
      const golden = courseInfo?.quality_rules?.golden_decompositions;
      if (!golden || golden.length === 0) return null;

      const MAX_EXAMPLES = 5;
      let sampled;
      if (golden.length <= MAX_EXAMPLES) {
        sampled = golden;
      } else {
        // Pick evenly-spaced examples: first, last, and evenly distributed between
        const indices = [];
        for (let i = 0; i < MAX_EXAMPLES; i++) {
          indices.push(Math.round(i * (golden.length - 1) / (MAX_EXAMPLES - 1)));
        }
        sampled = indices.map(i => golden[i]);
      }

      return {
        _INSTRUCTION: `FOLLOW THESE ${sampled.length} CALIBRATED EXAMPLES (sampled from ${golden.length} total) - they show the correct M vs A LEGO decisions for this language pair`,
        calibrated_at: courseInfo?.quality_rules?.calibrated_at,
        total_golden_count: golden.length,
        examples: sampled.map(g => ({
          seed: g.seed_number,
          known: g.known_text,
          target: g.target_text,
          legos: g.legos.map(l => ({
            type: l.type,
            known: l.known,
            target: l.target,
            reasoning: l.reasoning || null,
            components: l.components || null,
            build_phrases: l.build_phrases || [],
            use_phrases: l.use_phrases || []
          })),
          key_insight: g.key_insight || null,
          dont_do: g.contrastive_notes?.filter(n => n.includes("DON'T") || n.includes("DON'T")) || [],
          do_this: g.contrastive_notes?.filter(n => n.includes("DO:") || n.includes("DO:")) || []
        }))
      };
    })(),

    checkpoint: await getCheckpointStatus(courseCode),

    // Context from recent work
    recent_seeds: recentCompleted || [],
    recent_legos: recentLegos?.reverse() || [],

    // Seed Range - only work on seeds within this range
    seed_range: {
      target: targetSeedCount,
      seeds_in_range: allSeeds.length,
      completed_in_range: completedCount,
      remaining: allSeeds.length - completedCount,
      note: `Only working on seeds 1-${targetSeedCount}. Seeds ${targetSeedCount + 1}+ are ignored until seed_count is increased.`
    },

    // Stats
    progress: `${progress}%`,
    completed_seeds: completedCount,
    total_seeds: allSeeds.length,  // Now reflects filtered range, not all seeds in DB
    vocab_size: vocabSet.size,
    vocab_mode: chinese ? 'characters' : 'words',

    // Vocabulary summary (full list available via GET /api/vocab/:courseCode if needed)
    vocabulary_summary: {
      total: (allLegos || []).length,
      hint: 'Trust your instincts as a language teacher. Create meaningful M-type chunks for multi-character concepts. The API validates ZUT - it will tell you if you conflict with existing vocabulary.'
    },

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

    // Full methodology for self-recovery after compaction - INLINE EXAMPLES, no external refs
    methodology: {
      critical_concept: 'You are building a LEARNING EXPERIENCE. Each LEGO combines with PREVIOUS vocabulary to form phrases. LEGOs are SMALL pieces (2-4 words), not whole sentences.',
      seed_decomposition_example: {
        seed: 'I want to speak Chinese with you now',
        legos: [
          'L1 [M]: "I want" → "我想" (components: I→我, want→想)',
          'L2 [A]: "to speak" → "说"',
          'L3 [A]: "Chinese" → "中文"',
          'L4 [M]: "with you" → "和你" (components: with→和, you→你)',
          'L5 [A]: "now" → "现在"'
        ],
        note: 'Each LEGO generates BUILD + USE phrases using ONLY vocabulary from previous LEGOs'
      },
      complete_lego_example_markdown: `## L4 [M] "with you" → "和你"
Components: with → 和, you → 你

BUILD:
- with you → 和你
- speak with you → 和你说
- speak Chinese with you → 和你说中文

USE:
- I want to speak with you → 我想和你说 [7]
- I want to speak Chinese with you → 我想和你说中文 [8]
- I want to learn Chinese with you → 我想和你学中文 [8]
- Do you want to speak Chinese with me? → 你想和我说中文吗? [9]`,
      workflow: [
        '1. Decompose next_seed into 3-6 SMALL LEGOs (not whole sentences!)',
        '2. For EACH LEGO: generate BUILD (flexible) + USE (min 5) phrases',
        '3. USE phrases must be complete sentences with scores 5-9',
        '4. Phrases can only use THIS LEGO + vocabulary from PREVIOUS LEGOs',
        `5. Submit as markdown: POST /api/seed/complete?course=${courseCode} with Content-Type: text/markdown`,
        `6. CHECKPOINTS at seeds ${CHECKPOINT_SEEDS.join(', ')} - stop and await QA`,
        '7. Continue autonomously until done'
      ],
      phrase_requirements: {
        build: 'Flexible: LEGO + 1-5 syllables, fragments OK, debut only',
        use: 'Minimum 5: LEGO + 5-10 syllables, COMPLETE SENTENCES, scored 5-9, reused in consolidate/review'
      },
      scoring: {
        '9': 'Native-natural both languages, high pedagogical value',
        '7-8': 'Strong, minor stylistic preferences',
        '5-6': 'Functional, correct but unremarkable',
        '4 or below': 'Hard reject - REWRITE before submitting'
      },
      rules: [
        'LEGOs are SMALL pieces (2-4 words) - never whole sentences',
        'Phrases use ONLY this LEGO + previous vocabulary',
        'Use overlapping LEGOs when word order differs between languages',
        'Trust API validation errors - they tell you exactly what to fix'
      ]
    }
  });
});

/**
 * GET /api/next/:courseCode - API-guided builder endpoint
 * Returns everything an LLM agent needs to build the next seed:
 * - The seed to build (known + target text)
 * - Available vocabulary with recency bias
 * - 3 completed example seeds from the DB (seed 1, seed 10, and N-1)
 * - A JSON template to fill in
 *
 * Designed for fast/cheap models (Haiku) that learn from examples.
 */

// Helper: fetch a completed seed from DB as JSON (LEGOs + phrases)
async function fetchCompletedSeed(courseCode, seedNumber) {
  const { data: seed } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', courseCode)
    .eq('seed_number', seedNumber)
    .single();

  if (!seed) return null;

  const { data: legos } = await supabase
    .from('course_legos')
    .select('lego_index, known_text, target_text, type, components')
    .eq('course_code', courseCode)
    .eq('seed_number', seedNumber)
    .order('lego_index');

  if (!legos || legos.length === 0) return null;

  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('lego_index, known_text, target_text, phrase_role, position')
    .eq('course_code', courseCode)
    .eq('seed_number', seedNumber)
    .order('lego_index')
    .order('position');

  return {
    course_code: courseCode,
    seed_number: seed.seed_number,
    known_text: seed.known_text,
    target_text: seed.target_text,
    legos: legos.map(l => {
      const obj = {
        idx: l.lego_index,
        type: l.type,
        known: l.known_text,
        target: l.target_text
      };
      if (l.type === 'M' && l.components) {
        obj.components = l.components;
      }
      const legoPhrases = (phrases || []).filter(p => p.lego_index === l.lego_index);
      obj.build = legoPhrases
        .filter(p => p.phrase_role === 'build')
        .map(p => ({ known: p.known_text, target: p.target_text }));
      obj.use = legoPhrases
        .filter(p => p.phrase_role === 'use')
        .map(p => ({ known: p.known_text, target: p.target_text }));
      return obj;
    })
  };
}

app.get('/api/next/:courseCode', async (req, res) => {
  const { courseCode } = req.params;

  // Get course info
  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, seed_count')
    .eq('course_code', courseCode)
    .single();

  if (!courseInfo) {
    return res.status(404).json({ error: `Course ${courseCode} not found` });
  }

  const targetSeedCount = courseInfo?.seed_count || 300;

  // Find next incomplete seed
  const { data: allSeeds } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text, decomposed_at')
    .eq('course_code', courseCode)
    .lte('seed_number', targetSeedCount)
    .order('seed_number');

  const nextSeed = allSeeds?.find(s =>
    s.target_text && s.target_text.trim() !== '' && !s.decomposed_at
  );

  if (!nextSeed) {
    return res.json({
      done: true,
      message: `All ${targetSeedCount} seeds are complete!`,
      seeds_completed: allSeeds?.filter(s => s.decomposed_at).length || 0
    });
  }

  // Get all existing LEGOs for vocabulary display (with recency)
  const { data: allLegos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, type, is_new')
    .eq('course_code', courseCode)
    .eq('is_new', true)
    .order('seed_number', { ascending: false })
    .order('lego_index', { ascending: false });

  // Format vocabulary with recency: group by seed, newest first, / separated
  const vocabBySeed = {};
  for (const l of (allLegos || [])) {
    if (!vocabBySeed[l.seed_number]) vocabBySeed[l.seed_number] = [];
    vocabBySeed[l.seed_number].push(`${l.known_text} → ${l.target_text}`);
  }
  const seedNums = Object.keys(vocabBySeed).map(Number).sort((a, b) => b - a);
  const vocabLines = seedNums.map(sn => {
    const items = vocabBySeed[sn].reverse(); // restore lego_index order within seed
    const marker = sn >= nextSeed.seed_number - 3 ? '★' : ' ';
    return `${marker} ${items.join(' / ')}`;
  });

  // Fetch 3 example seeds: seed 1, seed 10, and N-1
  const prevSeedNum = nextSeed.seed_number - 1;
  const exampleNums = [1, 10, prevSeedNum].filter((n, i, a) => n > 0 && n < nextSeed.seed_number && a.indexOf(n) === i);
  const examples = [];
  for (const sn of exampleNums) {
    const ex = await fetchCompletedSeed(courseCode, sn);
    if (ex) examples.push(ex);
  }

  // Count completed seeds for progress
  const completedCount = allSeeds?.filter(s => s.decomposed_at).length || 0;

  res.json({
    seed: {
      number: nextSeed.seed_number,
      known: nextSeed.known_text,
      target: nextSeed.target_text
    },
    progress: `${completedCount}/${targetSeedCount} seeds done`,
    vocabulary: vocabLines,
    vocab_count: (allLegos || []).length,
    rules: {
      legos: 'Break seed into LEGOs. A-type = single word. M-type = multi-word chunk (MUST have components array). Use overlapping LEGOs when target language does something the learner can\'t infer from the known language (e.g. essayer d\'expliquer shows the d\' connector). LEGOs can overlap but must cover the full seed with no gaps.',
      build: '3-4 per LEGO. Short fragments. LEGO + prior vocabulary.',
      use: '8-12 per LEGO. Complete natural sentences a real person would say. Variety of vocab, patterns, LEGO position.',
      constraints: 'Every phrase MUST contain its LEGO. Phrases can ONLY use vocabulary listed above + current seed LEGOs. Never conjugate or inflect a LEGO — use exact forms only.'
    },
    examples: examples,
    template: {
      _note: 'Each LEGO follows this shape. See examples above for real data.',
      lego: {
        idx: '1, 2, 3...',
        type: 'A (single word) or M (multi-word, MUST have components)',
        known: 'English LEGO text',
        target: 'Target language LEGO text',
        components: [{ known: '...', target: '...' }],
        build: '3-4 fragments: LEGO + prior vocab. Fragments OK.',
        use: '8-12 complete sentences a real person would say.'
      }
    },
    submit: {
      method: 'POST',
      url: `http://localhost:3471/api/seed/complete`,
      content_type: 'application/json',
      body: {
        course_code: courseCode,
        seed_number: nextSeed.seed_number,
        known_text: nextSeed.known_text,
        target_text: nextSeed.target_text,
        legos: '[ ... your LEGOs here, same shape as template ... ]'
      }
    },
    next_action: `After submitting, call GET /api/next/${courseCode} for the next seed.`
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
  const limit = parseInt(req.query.limit) || 300;
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
  const seedNumber = parseInt(req.query.seed);
  const chinese = isChinese(courseCode);

  // If ?seed=N provided, use translation-based vocab (all seed translations up to N)
  // Otherwise fall back to live LEGO vocab only
  const vocabSet = seedNumber
    ? await loadTranslationVocab(courseCode, seedNumber)
    : await loadCourseVocab(courseCode);

  res.json({
    course_code: courseCode,
    mode: chinese ? 'character' : 'word',
    source: seedNumber ? 'translations' : 'legos',
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
  const { target_text, known_text } = req.body;
  const seedNum = parseInt(seedNumber);

  if (!target_text && !known_text) {
    return res.status(400).json({ error: 'target_text or known_text is required' });
  }

  const updateFields = { status: 'released' };
  if (target_text) updateFields.target_text = target_text;
  if (known_text) updateFields.known_text = known_text;

  const { error } = await supabase
    .from('course_seeds')
    .update(updateFields)
    .eq('course_code', courseCode)
    .eq('seed_number', seedNum);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Record activity for stall detection (Pass 1 translations count as progress)
  recordActivity(courseCode, seedNum);

  console.log(`✓ S${String(seedNum).padStart(4,'0')} translation: ${target_text || known_text}`);
  res.json({ ok: true, seed: seedNum, target_text, known_text });
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
  const limit = parseInt(req.query.limit) || 300;  // Default course size
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

// =============================================================================
// TWO-PASS WORKFLOW: TRANSLATION ANALYSIS ENDPOINTS
// Pass 1: Translate all seeds, discover language-specific issues
// Pass 2: Build LEGOs and phrases with full knowledge of pitfalls
// =============================================================================

/**
 * POST /api/course/:courseCode/analysis - Save translation analysis after Pass 1
 *
 * Body: {
 *   analysis: {
 *     generated_at: "ISO timestamp",
 *     seeds_analyzed: 260,
 *     register: { choice: "casual-polite", markers: ["です", "ます"] },
 *     problem_verbs: [...],
 *     golden_keys: [...],
 *     zut_concerns: [...]
 *   }
 * }
 */
app.post('/api/course/:courseCode/analysis', async (req, res) => {
  const { courseCode } = req.params;
  const { analysis } = req.body;

  if (!analysis || typeof analysis !== 'object') {
    return res.status(400).json({
      error: 'Required: analysis object with translation analysis data'
    });
  }

  // Validate required fields
  const requiredFields = ['generated_at', 'seeds_analyzed'];
  const missingFields = requiredFields.filter(f => !analysis[f]);
  if (missingFields.length > 0) {
    return res.status(400).json({
      error: `Missing required fields in analysis: ${missingFields.join(', ')}`
    });
  }

  // Check course exists
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('course_code, display_name')
    .eq('course_code', courseCode)
    .single();

  if (courseErr || !course) {
    return res.status(404).json({ error: `Course not found: ${courseCode}` });
  }

  // Save analysis to course record
  const { error: updateErr } = await supabase
    .from('courses')
    .update({
      translation_analysis: analysis,
      updated_at: new Date().toISOString()
    })
    .eq('course_code', courseCode);

  if (updateErr) {
    console.error(`Error saving analysis for ${courseCode}:`, updateErr);
    return res.status(500).json({ error: updateErr.message });
  }

  console.log(`[ANALYSIS] Saved translation analysis for ${courseCode}: ${analysis.seeds_analyzed} seeds analyzed`);

  res.json({
    success: true,
    course_code: courseCode,
    message: `Translation analysis saved for ${analysis.seeds_analyzed} seeds`,
    summary: {
      problem_verbs: (analysis.problem_verbs || []).length,
      golden_keys: (analysis.golden_keys || []).length,
      zut_concerns: (analysis.zut_concerns || []).length,
      register: analysis.register?.choice || 'not specified'
    }
  });
});

/**
 * GET /api/course/:courseCode/analysis - Retrieve translation analysis
 */
app.get('/api/course/:courseCode/analysis', async (req, res) => {
  const { courseCode } = req.params;

  const { data: course, error } = await supabase
    .from('courses')
    .select('course_code, display_name, translation_analysis')
    .eq('course_code', courseCode)
    .single();

  if (error || !course) {
    return res.status(404).json({ error: `Course not found: ${courseCode}` });
  }

  if (!course.translation_analysis) {
    return res.status(404).json({
      error: 'No translation analysis found',
      hint: 'Complete Pass 1 (translate all seeds) and POST analysis to /api/course/:code/analysis',
      course_code: courseCode
    });
  }

  res.json({
    course_code: courseCode,
    display_name: course.display_name,
    analysis: course.translation_analysis
  });
});

/**
 * POST /api/course/:courseCode/quality-rules - Save methodology guidance after Pass 1
 *
 * Body: {
 *   quality_rules: {
 *     course_code: "ara_for_eng",
 *     known_language: "eng",
 *     target_language: "ara",
 *     analysis_date: "2026-01-29",
 *     known_language_guidance: { quality_bar, avoid_patterns, trust_test },
 *     target_language_guidance: { quality_bar, structural_notes },
 *     zut_direction: "eng → ara",
 *     early_seed_guidance: { applies_to_seeds, phrase_tips },
 *     methodology_insights: [...]
 *   }
 * }
 */
app.post('/api/course/:courseCode/quality-rules', async (req, res) => {
  const { courseCode } = req.params;
  const { quality_rules } = req.body;

  if (!quality_rules || typeof quality_rules !== 'object') {
    return res.status(400).json({
      error: 'Required: quality_rules object with methodology guidance'
    });
  }

  // Validate required fields
  const requiredFields = ['analysis_date', 'known_language', 'target_language'];
  const missingFields = requiredFields.filter(f => !quality_rules[f]);
  if (missingFields.length > 0) {
    return res.status(400).json({
      error: `Missing required fields in quality_rules: ${missingFields.join(', ')}`
    });
  }

  // Check course exists
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('course_code, display_name')
    .eq('course_code', courseCode)
    .single();

  if (courseErr || !course) {
    return res.status(404).json({ error: `Course not found: ${courseCode}` });
  }

  // Save quality_rules to course record
  const { error: updateErr } = await supabase
    .from('courses')
    .update({
      quality_rules: quality_rules,
      updated_at: new Date().toISOString()
    })
    .eq('course_code', courseCode);

  if (updateErr) {
    console.error(`Error saving quality_rules for ${courseCode}:`, updateErr);
    return res.status(500).json({ error: updateErr.message });
  }

  console.log(`[QUALITY_RULES] Saved methodology guidance for ${courseCode}`);

  res.json({
    success: true,
    course_code: courseCode,
    message: 'Quality rules saved - methodology guidance now available for future agents',
    summary: {
      known_language: quality_rules.known_language,
      target_language: quality_rules.target_language,
      avoid_patterns_count: (quality_rules.known_language_guidance?.avoid_patterns || []).length,
      methodology_insights_count: (quality_rules.methodology_insights || []).length,
      zut_direction: quality_rules.zut_direction || 'not specified'
    }
  });
});

/**
 * GET /api/course/:courseCode/quality-rules - Retrieve methodology guidance
 */
app.get('/api/course/:courseCode/quality-rules', async (req, res) => {
  const { courseCode } = req.params;

  const { data: course, error } = await supabase
    .from('courses')
    .select('course_code, display_name, quality_rules')
    .eq('course_code', courseCode)
    .single();

  if (error || !course) {
    return res.status(404).json({ error: `Course not found: ${courseCode}` });
  }

  if (!course.quality_rules) {
    return res.status(404).json({
      error: 'No quality rules found',
      hint: 'Run /course-methodology-analysis after Pass 1 to generate guidance',
      course_code: courseCode
    });
  }

  res.json({
    course_code: courseCode,
    display_name: course.display_name,
    quality_rules: course.quality_rules
  });
});

/**
 * Parse calibration markdown into golden_decompositions JSON structure.
 *
 * Recognizes:
 *   ## Seed N           → new seed entry
 *   Known: / Target:    → seed text
 *   ### LN [M/A] "k" → "t" → LEGO with type, known, target
 *   Components:         → components array (M-type)
 *   Reasoning:          → reasoning string
 *   BUILD: section      → build_phrases array
 *   USE: section        → use_phrases array with scores
 *   Contrastive:        → contrastive_notes array
 *   Key insight:        → key_insight string
 */
function parseCalibrationMarkdown(text) {
  const seeds = [];
  let current = null;   // current seed object
  let currentLego = null;
  let section = null;   // 'build' | 'use' | 'contrastive' | null

  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // ## Seed N
    const seedMatch = trimmed.match(/^## Seed (\d+)/);
    if (seedMatch) {
      if (currentLego && current) { current.legos.push(currentLego); currentLego = null; }
      if (current) seeds.push(current);
      current = {
        seed_number: parseInt(seedMatch[1]),
        known_text: '',
        target_text: '',
        legos: [],
        contrastive_notes: [],
        key_insight: ''
      };
      section = null;
      continue;
    }

    if (!current) continue;

    // Known: / Target:
    const knownMatch = trimmed.match(/^Known:\s*(.+)/);
    if (knownMatch) { current.known_text = knownMatch[1].trim(); section = null; continue; }

    const targetMatch = trimmed.match(/^Target:\s*(.+)/);
    if (targetMatch) { current.target_text = targetMatch[1].trim(); section = null; continue; }

    // ### LN [M/A] "known" → "target"
    const legoMatch = trimmed.match(/^### L(\d+)\s+\[([MA])]\s+"([^"]+)"\s*→\s*"([^"]+)"/);
    if (legoMatch) {
      if (currentLego) current.legos.push(currentLego);
      currentLego = {
        type: legoMatch[2],
        known: legoMatch[3],
        target: legoMatch[4],
        reasoning: '',
        build_phrases: [],
        use_phrases: []
      };
      if (legoMatch[2] === 'M') currentLego.components = [];
      section = null;
      continue;
    }

    if (!currentLego && !section && !trimmed.startsWith('Contrastive:') && !trimmed.startsWith('Key insight:')) continue;

    // Components: x → y, a → b
    const compMatch = trimmed.match(/^Components:\s*(.+)/);
    if (compMatch && currentLego) {
      currentLego.components = compMatch[1].split(',').map(pair => {
        const parts = pair.trim().split(/\s*→\s*/);
        return { known: parts[0].trim(), target: (parts[1] || '').trim() };
      });
      section = null;
      continue;
    }

    // Reasoning:
    const reasonMatch = trimmed.match(/^Reasoning:\s*(.+)/);
    if (reasonMatch && currentLego) { currentLego.reasoning = reasonMatch[1].trim(); section = null; continue; }

    // Section headers
    if (trimmed === 'BUILD:') { section = 'build'; continue; }
    if (trimmed === 'USE:') { section = 'use'; continue; }
    if (trimmed === 'Contrastive:') {
      if (currentLego) { current.legos.push(currentLego); currentLego = null; }
      section = 'contrastive';
      continue;
    }

    // Key insight:
    const insightMatch = trimmed.match(/^Key insight:\s*(.+)/);
    if (insightMatch) {
      if (currentLego) { current.legos.push(currentLego); currentLego = null; }
      current.key_insight = insightMatch[1].trim();
      section = null;
      continue;
    }

    // List items within sections
    if (trimmed.startsWith('- ') && section) {
      const item = trimmed.slice(2).trim();

      if (section === 'build') {
        const parts = item.split(/\s*→\s*/);
        if (parts.length === 2 && currentLego) {
          currentLego.build_phrases.push({ known: parts[0].trim(), target: parts[1].trim() });
        }
      } else if (section === 'use') {
        // "known → target [score]"
        const useMatch = item.match(/^(.+?)\s*→\s*(.+?)\s*\[(\d+)]/);
        if (useMatch && currentLego) {
          currentLego.use_phrases.push({ known: useMatch[1].trim(), target: useMatch[2].trim(), score: parseInt(useMatch[3]) });
        }
      } else if (section === 'contrastive') {
        current.contrastive_notes.push(item);
      }
      continue;
    }
  }

  // Flush remaining
  if (currentLego && current) current.legos.push(currentLego);
  if (current) seeds.push(current);

  if (seeds.length === 0) {
    return { error: 'No seeds found in markdown. Expected "## Seed N" headings.' };
  }

  // Validate each seed has minimum required fields
  for (const seed of seeds) {
    if (!seed.known_text || !seed.target_text) {
      return { error: `Seed ${seed.seed_number} missing Known: or Target: line` };
    }
    if (seed.legos.length === 0) {
      return { error: `Seed ${seed.seed_number} has no LEGOs. Expected "### LN [M/A] ..." headings.` };
    }
  }

  return { golden_decompositions: seeds };
}

/**
 * POST /api/course/:courseCode/calibration - Save golden decompositions from calibration session
 *
 * Golden decompositions are human-verified LEGO decompositions for golden seeds that serve as
 * canonical examples for future build agents. They include reasoning and contrastive notes
 * explaining WHY each decomposition choice was made.
 *
 * Accepts two formats:
 *
 * 1. JSON (Content-Type: application/json):
 * Body: {
 *   golden_decompositions: [
 *     {
 *       seed_number: 1,
 *       known_text: "I want to speak Dutch with you now.",
 *       target_text: "Ik wil nu Nederlands met je spreken.",
 *       legos: [
 *         {
 *           type: "M",
 *           known: "I want",
 *           target: "ik wil",
 *           components: [{known: "I", target: "ik"}, {known: "want", target: "wil"}],
 *           reasoning: "M-LEGO: pronouns need verb context"
 *         }
 *       ],
 *       contrastive_notes: ["DON'T: with → met as A-LEGO (preposition fails ZUT)"],
 *       key_insight: "Function words absorbed into M-LEGOs"
 *     }
 *   ]
 * }
 *
 * 2. Markdown (Content-Type: text/markdown or text/plain):
 * ## Seed 1
 * Known: I want to speak Dutch with you now.
 * Target: Ik wil nu Nederlands met je spreken.
 *
 * ### L1 [M] "I want" → "ik wil"
 * Components: I → ik, want → wil
 * Reasoning: Subject+verb bundled.
 *
 * BUILD:
 * - I want to speak → ik wil spreken
 *
 * USE:
 * - I want to speak → ik wil spreken [6]
 *
 * Contrastive:
 * - DON'T: 'I' as A-LEGO
 *
 * Key insight: Dutch pronouns change form by context.
 *
 * Markdown submissions are merged by seed_number (existing seeds updated, new seeds added).
 */
app.post('/api/course/:courseCode/calibration', async (req, res) => {
  const { courseCode } = req.params;

  // Detect markdown (string body) vs JSON (object body)
  let golden_decompositions;
  if (typeof req.body === 'string') {
    const parsed = parseCalibrationMarkdown(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    golden_decompositions = parsed.golden_decompositions;
  } else {
    golden_decompositions = req.body.golden_decompositions;
  }

  // Validation: Must have golden_decompositions array
  if (!golden_decompositions || !Array.isArray(golden_decompositions)) {
    return res.status(400).json({
      error: 'Required: golden_decompositions array with seed decompositions',
      hint: 'Use /calibrate skill to create golden decompositions interactively, or POST markdown with Content-Type: text/markdown'
    });
  }

  // Validation: Must have at least one seed (unless just setting golden_seed_count)
  const justSettingCount = golden_decompositions.length === 0 && typeof req.body === 'object' && req.body.golden_seed_count != null;
  if (golden_decompositions.length < 1 && !justSettingCount) {
    return res.status(400).json({
      error: 'golden_decompositions array is empty',
      hint: 'Include at least one seed for effective calibration, or set golden_seed_count to update just the count'
    });
  }

  // Validate each decomposition has required fields
  const requiredFields = ['seed_number', 'known_text', 'target_text', 'legos'];
  for (const decomp of golden_decompositions) {
    const missing = requiredFields.filter(f => !decomp[f]);
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Seed ${decomp.seed_number || '?'} missing required fields: ${missing.join(', ')}`,
        required: requiredFields
      });
    }

    // Validate LEGOs have required fields
    if (!Array.isArray(decomp.legos) || decomp.legos.length === 0) {
      return res.status(400).json({
        error: `Seed ${decomp.seed_number} has no LEGOs`,
        hint: 'Each seed must have at least one LEGO decomposition'
      });
    }

    for (const lego of decomp.legos) {
      if (!lego.type || !lego.known || !lego.target) {
        return res.status(400).json({
          error: `Seed ${decomp.seed_number} has invalid LEGO - missing type, known, or target`,
          lego
        });
      }
      if (!['A', 'M'].includes(lego.type)) {
        return res.status(400).json({
          error: `Seed ${decomp.seed_number} has invalid LEGO type: ${lego.type}`,
          allowed: ['A', 'M']
        });
      }
      if (lego.type === 'M' && (!lego.components || !Array.isArray(lego.components))) {
        return res.status(400).json({
          error: `Seed ${decomp.seed_number} M-LEGO "${lego.known}" missing components array`,
          hint: 'M-LEGOs must have components showing their building blocks'
        });
      }
    }
  }

  // Check course exists
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('course_code, display_name, quality_rules')
    .eq('course_code', courseCode)
    .single();

  if (courseErr || !course) {
    return res.status(404).json({ error: `Course not found: ${courseCode}` });
  }

  // Merge golden_decompositions by seed_number (update existing, add new)
  const existingRules = course.quality_rules || {};
  const existing = existingRules.golden_decompositions || [];
  const merged = [...existing];
  for (const newSeed of golden_decompositions) {
    const idx = merged.findIndex(s => s.seed_number === newSeed.seed_number);
    if (idx >= 0) merged[idx] = newSeed;  // replace existing seed
    else merged.push(newSeed);            // add new seed
  }
  merged.sort((a, b) => a.seed_number - b.seed_number);

  // Accept optional golden_seed_count from JSON body
  if (typeof req.body === 'object' && req.body.golden_seed_count != null) {
    const count = parseInt(req.body.golden_seed_count);
    if (isNaN(count) || count < 1 || count > 50) {
      return res.status(400).json({ error: 'golden_seed_count must be between 1 and 50' });
    }
    existingRules.golden_seed_count = count;
  }

  const updatedRules = {
    ...existingRules,
    golden_decompositions: merged,
    calibrated_at: new Date().toISOString(),
    calibrated_by: 'human+agent'
  };

  // Save to database
  const { error: updateErr } = await supabase
    .from('courses')
    .update({
      quality_rules: updatedRules,
      updated_at: new Date().toISOString()
    })
    .eq('course_code', courseCode);

  if (updateErr) {
    console.error(`Error saving calibration for ${courseCode}:`, updateErr);
    return res.status(500).json({ error: updateErr.message });
  }

  console.log(`[CALIBRATION] Merged ${golden_decompositions.length} seed(s) for ${courseCode} (${merged.length} total)`);

  // Summarize the calibration (report on merged totals)
  const summary = {
    seeds_submitted: golden_decompositions.map(d => d.seed_number).sort((a, b) => a - b),
    seeds_total: merged.map(d => d.seed_number).sort((a, b) => a - b),
    total_legos: merged.reduce((sum, d) => sum + d.legos.length, 0),
    m_legos: merged.reduce((sum, d) => sum + d.legos.filter(l => l.type === 'M').length, 0),
    a_legos: merged.reduce((sum, d) => sum + d.legos.filter(l => l.type === 'A').length, 0),
    with_reasoning: merged.reduce((sum, d) => sum + d.legos.filter(l => l.reasoning).length, 0),
    with_contrastive_notes: merged.filter(d => d.contrastive_notes && d.contrastive_notes.length > 0).length
  };

  res.json({
    success: true,
    course_code: courseCode,
    message: 'Golden decompositions saved - future agents will receive these as canonical examples',
    calibrated_at: updatedRules.calibrated_at,
    summary,
    next_steps: [
      'Build agents spawned via /api/spawn will receive golden examples in initial brief',
      'GET /api/resume will include golden_decompositions for context recovery',
      `Seeds ${(updatedRules.golden_seed_count || 10) + 1}+ should follow the patterns established in seeds 1-${updatedRules.golden_seed_count || 10}`
    ]
  });
});

/**
 * GET /api/course/:courseCode/calibration - Get golden decompositions
 */
app.get('/api/course/:courseCode/calibration', async (req, res) => {
  const { courseCode } = req.params;

  const { data: course, error } = await supabase
    .from('courses')
    .select('course_code, display_name, quality_rules')
    .eq('course_code', courseCode)
    .single();

  if (error || !course) {
    return res.status(404).json({ error: `Course not found: ${courseCode}` });
  }

  const goldenDecompositions = course.quality_rules?.golden_decompositions;
  const calibratedAt = course.quality_rules?.calibrated_at;

  if (!goldenDecompositions) {
    return res.status(404).json({
      error: 'Course not calibrated',
      hint: 'Run /calibrate to create golden decompositions with human guidance',
      course_code: courseCode
    });
  }

  res.json({
    course_code: courseCode,
    display_name: course.display_name,
    golden_seed_count: getGoldenSeedCount(course),
    calibrated_at: calibratedAt,
    calibrated_by: course.quality_rules?.calibrated_by || 'unknown',
    golden_decompositions: goldenDecompositions,
    summary: {
      seeds_calibrated: goldenDecompositions.length,
      total_legos: goldenDecompositions.reduce((sum, d) => sum + d.legos.length, 0)
    }
  });
});

/**
 * GET /api/calibrations/patterns - Get cross-language calibration patterns for reference
 *
 * Returns all existing calibrations grouped by:
 * - Target language (how to chunk that language)
 * - Known language (phrasing patterns)
 * - Seed number (side-by-side comparison)
 *
 * Use when calibrating a new language pair to see how similar pairs were handled.
 */
app.get('/api/calibrations/patterns', async (req, res) => {
  const { target, known, seed } = req.query;

  // Fetch all courses with calibrations
  const { data: courses, error } = await supabase
    .from('courses')
    .select('course_code, display_name, quality_rules')
    .not('quality_rules->golden_decompositions', 'is', null);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Filter to only calibrated courses
  const calibrated = (courses || []).filter(c =>
    c.quality_rules?.golden_decompositions?.length > 0
  );

  if (calibrated.length === 0) {
    return res.json({
      message: 'No calibrated courses found yet',
      hint: 'Run /calibrate on a course to create the first calibration',
      calibrated_courses: []
    });
  }

  // Parse course codes into target/known languages
  const parsed = calibrated.map(c => {
    const parts = c.course_code.split('_for_');
    return {
      course_code: c.course_code,
      target_lang: parts[0],
      known_lang: parts[1],
      calibrated_at: c.quality_rules.calibrated_at,
      seeds: c.quality_rules.golden_decompositions.length,
      golden: c.quality_rules.golden_decompositions
    };
  });

  // Apply filters if specified
  let filtered = parsed;
  if (target) {
    filtered = filtered.filter(c => c.target_lang === target);
  }
  if (known) {
    filtered = filtered.filter(c => c.known_lang === known);
  }

  // Group by target language
  const byTarget = {};
  for (const course of filtered) {
    if (!byTarget[course.target_lang]) {
      byTarget[course.target_lang] = [];
    }
    byTarget[course.target_lang].push({
      course_code: course.course_code,
      known_lang: course.known_lang,
      seeds: course.seeds
    });
  }

  // Group by known language
  const byKnown = {};
  for (const course of filtered) {
    if (!byKnown[course.known_lang]) {
      byKnown[course.known_lang] = [];
    }
    byKnown[course.known_lang].push({
      course_code: course.course_code,
      target_lang: course.target_lang,
      seeds: course.seeds
    });
  }

  // If specific seed requested, show side-by-side comparison
  let seedComparison = null;
  if (seed) {
    const seedNum = parseInt(seed);
    seedComparison = {};
    for (const course of filtered) {
      const seedData = course.golden.find(g => g.seed_number === seedNum);
      if (seedData) {
        seedComparison[course.course_code] = {
          known_text: seedData.known_text,
          target_text: seedData.target_text,
          legos: seedData.legos.map(l => ({
            type: l.type,
            known: l.known,
            target: l.target,
            reasoning: l.reasoning
          })),
          key_insight: seedData.key_insight
        };
      }
    }
  }

  res.json({
    calibrated_courses: filtered.length,
    by_target_language: byTarget,
    by_known_language: byKnown,
    seed_comparison: seedComparison,
    hint: seedComparison
      ? `Showing seed ${seed} across ${Object.keys(seedComparison).length} calibrated courses`
      : 'Add ?seed=1 to see side-by-side comparison of how seed 1 was chunked across languages'
  });
});

/**
 * GET /api/calibrations/seed/:seedNumber - Get all calibrations for a specific seed
 *
 * Shows how different language pairs chunked the same seed number.
 * Useful for seeing patterns before calibrating a new pair.
 */
app.get('/api/calibrations/seed/:seedNumber', async (req, res) => {
  const seedNum = parseInt(req.params.seedNumber);

  if (isNaN(seedNum) || seedNum < 1 || seedNum > 50) {
    return res.status(400).json({
      error: 'Seed number must be 1-50 (calibration range)',
      provided: req.params.seedNumber
    });
  }

  // Fetch all courses with calibrations
  const { data: courses, error } = await supabase
    .from('courses')
    .select('course_code, quality_rules')
    .not('quality_rules->golden_decompositions', 'is', null);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const comparisons = [];

  for (const course of courses || []) {
    const golden = course.quality_rules?.golden_decompositions || [];
    const seedData = golden.find(g => g.seed_number === seedNum);

    if (seedData) {
      const parts = course.course_code.split('_for_');
      comparisons.push({
        course_code: course.course_code,
        target_lang: parts[0],
        known_lang: parts[1],
        known_text: seedData.known_text,
        target_text: seedData.target_text,
        lego_summary: seedData.legos.map(l =>
          `${l.type}: "${l.known}" → "${l.target}"`
        ),
        m_count: seedData.legos.filter(l => l.type === 'M').length,
        a_count: seedData.legos.filter(l => l.type === 'A').length,
        key_insight: seedData.key_insight,
        contrastive_notes: seedData.contrastive_notes
      });
    }
  }

  if (comparisons.length === 0) {
    return res.json({
      seed_number: seedNum,
      message: 'No calibrations found for this seed yet',
      hint: 'Run /calibrate on a course to create calibrations'
    });
  }

  // Group by target language for pattern discovery
  const byTarget = {};
  for (const comp of comparisons) {
    if (!byTarget[comp.target_lang]) {
      byTarget[comp.target_lang] = [];
    }
    byTarget[comp.target_lang].push(comp);
  }

  res.json({
    seed_number: seedNum,
    calibrations_found: comparisons.length,
    comparisons,
    by_target_language: byTarget,
    patterns: {
      hint: 'Look for common M-LEGO patterns across languages',
      common_m_legos: extractCommonPatterns(comparisons, 'M'),
      common_a_legos: extractCommonPatterns(comparisons, 'A')
    }
  });
});

/**
 * Helper: Extract common LEGO patterns across calibrations
 */
function extractCommonPatterns(comparisons, legoType) {
  const knownTexts = {};

  for (const comp of comparisons) {
    const legos = comp.lego_summary
      .filter(l => l.startsWith(legoType + ':'))
      .map(l => {
        const match = l.match(/"([^"]+)"/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    for (const known of legos) {
      knownTexts[known] = (knownTexts[known] || 0) + 1;
    }
  }

  // Return patterns that appear in 2+ calibrations
  return Object.entries(knownTexts)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([text, count]) => ({ known_text: text, appears_in: count }));
}

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

  // Get current max position and role counts for deterministic IDs
  const { data: existing } = await supabase
    .from('course_practice_phrases')
    .select('position, phrase_role')
    .eq('course_code', course_code)
    .eq('seed_number', seed_number)
    .eq('lego_index', lego_index);

  let nextPosition = (existing?.reduce((max, p) => Math.max(max, p.position), 0) || 0) + 1;
  const roleCounts = { component: 0, build: 0, use: 0 };
  for (const p of (existing || [])) {
    const r = p.phrase_role === 'practice' ? 'build' : p.phrase_role;
    roleCounts[r] = (roleCounts[r] || 0) + 1;
  }

  // VOCABULARY VALIDATION
  const chinese = isChinese(course_code);
  const vocabSet = await loadCourseVocab(course_code);

  const violations = [];
  const validPhrases = [];

  const legoTargetNorm = normalizeForContainment(lego.target_text);

  for (const phrase of phrases) {
    const { known, target } = phrase;
    if (!known || !target) continue;

    // LEGO CONTAINMENT: phrase target MUST contain LEGO target (phonetic matching)
    if (!normalizeForContainment(target).includes(legoTargetNorm)) {
      violations.push({
        phrase: target,
        unknown: `LEGO target "${lego.target_text}" not found as substring`
      });
      continue;
    }

    // Check vocab - use extractVocab for consistent tokenization with loadCourseVocab
    const phraseChars = extractVocab(target, chinese);

    const unknown = phraseChars.filter(c => !vocabSet.has(c));

    if (unknown.length > 0) {
      violations.push({
        phrase: target,
        unknown: chinese ? unknown.join('') : unknown.join(', ')
      });
    } else {
      const position = nextPosition++;
      const role = phrase.role === 'practice' ? 'build' : (phrase.role || 'build');
      roleCounts[role] = (roleCounts[role] || 0) + 1;
      validPhrases.push({
        id: makePhraseId(course_code, seed_number, lego_index, role, roleCounts[role]),
        course_code,
        seed_number,
        lego_index,
        position,
        known_text: known,
        target_text: target,
        word_count: target.length,
        lego_count: (known.match(/\s+/g) || []).length + 1,
        phrase_role: role,
        connected_lego_ids: [],
        lego_position: null,
        metadata: phrase.score ? {
          score: phrase.score,
          ...(phrase.known_score !== undefined && { known_score: phrase.known_score }),
          ...(phrase.target_score !== undefined && { target_score: phrase.target_score })
        } : {}
      });
    }
  }

  // Score validation removed - not needed for course building

  if (violations.length > 0) {
    return res.status(400).json({
      error: 'Vocabulary violations detected',
      violations,
      message: 'These phrases use characters not yet introduced',
      skills: ['ralph-methodology.md'],
      hint: 'Review ralph-methodology.md for vocabulary rules.'
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

// =============================================================================
// CHECKPOINT ENDPOINTS - QA gate for build verification
// =============================================================================

/**
 * GET /api/checkpoint/summary/:courseCode - Get checkpoint summary for QA
 *
 * Returns:
 * - Completion stats (seeds, LEGOs, phrases)
 * - Sample of ~50 USE phrases with scores for QA re-scoring
 * - Score distribution
 * - Approval status
 */
app.get('/api/checkpoint/summary/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const checkpoint = await getCheckpointStatus(courseCode);

  // Get completed seeds count (decomposed, including empty seeds)
  const { count: completedSeeds } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .not('decomposed_at', 'is', null);

  // Get LEGO and phrase counts
  const { count: legoCount } = await supabase
    .from('course_legos')
    .select('id', { count: 'exact', head: true })
    .eq('course_code', courseCode);

  const { count: phraseCount } = await supabase
    .from('course_practice_phrases')
    .select('id', { count: 'exact', head: true })
    .eq('course_code', courseCode);

  // Get USE phrases with scores (sample ~50 for QA)
  // phrase_role: 'component'/'build' = BUILD, 'use' = USE (spaced repetition)
  const { data: usePhrases } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text, phrase_role, metadata')
    .eq('course_code', courseCode)
    .eq('phrase_role', 'use')
    .order('seed_number', { ascending: true })
    .limit(100);  // Get 100, then sample

  // Sample ~50 evenly distributed
  const sampleSize = Math.min(50, usePhrases?.length || 0);
  const step = Math.max(1, Math.floor((usePhrases?.length || 1) / sampleSize));
  const sampledPhrases = [];
  for (let i = 0; i < (usePhrases?.length || 0) && sampledPhrases.length < sampleSize; i += step) {
    const p = usePhrases[i];
    sampledPhrases.push({
      id: p.id,
      seed: p.seed_number,
      lego: p.lego_index,
      known: p.known_text,
      target: p.target_text,
      agent_score: p.metadata?.score || null,
      scored_at: p.metadata?.scored_at || null
    });
  }

  // Calculate score distribution
  const allScores = (usePhrases || [])
    .map(p => p.metadata?.score)
    .filter(s => typeof s === 'number');
  const scoreDistribution = {};
  for (let s = 1; s <= 9; s++) {
    scoreDistribution[s] = allScores.filter(score => score === s).length;
  }
  const avgScore = allScores.length > 0
    ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)
    : null;

  res.json({
    course_code: courseCode,
    checkpoint: {
      checkpoint_seeds: checkpoint.checkpoint_seeds,
      next_checkpoint: checkpoint.next_checkpoint,
      checkpoints: checkpoint.checkpoints,
      drift_history: checkpoint.drift_history,
      calibration_feedback: checkpoint.calibration_feedback
    },
    summary: {
      seeds_complete: completedSeeds || 0,
      total_legos: legoCount || 0,
      total_phrases: phraseCount || 0,
      use_phrases_count: usePhrases?.length || 0,
      avg_score: avgScore,
      score_distribution: scoreDistribution
    },
    sample_for_qa: {
      count: sampledPhrases.length,
      phrases: sampledPhrases,
      instructions: [
        'QA agent should independently re-score each phrase (5-9)',
        'Gate 1: QA avg must be >= 7.0 (absolute quality)',
        'Gate 2: USE phrases must outscore BUILD phrases',
        'Gate 3: Check for vocabulary violations (words not yet introduced)',
        'Gate 4: Compare QA scores vs agent scores for drift',
        'If any gate fails, REJECT - do not approve'
      ]
    },
    actions: checkpoint.next_checkpoint === null
      ? { status: 'ALL_APPROVED', message: 'All checkpoints approved, build can continue to completion' }
      : {
          status: 'AWAITING_APPROVAL',
          approve_url: `POST /api/checkpoint/approve/${courseCode}?seed=${checkpoint.next_checkpoint}`,
          message: `Run QA review, then approve checkpoint at seed ${checkpoint.next_checkpoint}`
        }
  });
});

/**
 * POST /api/checkpoint/approve/:courseCode - Approve checkpoint to unblock build
 *
 * Query params:
 * - seed: number (which checkpoint seed to approve, default: next unapproved)
 *
 * Body (optional):
 * - approved_by: string (default: 'human')
 * - qa_report: object (optional QA summary for audit trail)
 */
app.post('/api/checkpoint/approve/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const { approved_by = 'human', qa_report = null } = req.body || {};

  const currentStatus = await getCheckpointStatus(courseCode);

  // Determine which checkpoint to approve
  let checkpointSeed = req.query.seed ? parseInt(req.query.seed, 10) : currentStatus.next_checkpoint;

  if (!checkpointSeed || !CHECKPOINT_SEEDS.includes(checkpointSeed)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid checkpoint seed',
      valid_checkpoints: CHECKPOINT_SEEDS,
      next_checkpoint: currentStatus.next_checkpoint
    });
  }

  // Check if already approved
  if (currentStatus.checkpoints[checkpointSeed]?.approved) {
    return res.json({
      ok: true,
      status: 'ALREADY_APPROVED',
      course_code: courseCode,
      checkpoint_seed: checkpointSeed,
      approved_at: currentStatus.checkpoints[checkpointSeed].approvedAt,
      approved_by: currentStatus.checkpoints[checkpointSeed].approvedBy
    });
  }

  // Get checkpoint config for threshold comparison
  const config = await getCheckpointConfig(courseCode, checkpointSeed);

  // Extract QA metrics from report (if provided)
  const qaQuality = qa_report?.quality_gates?.gate_1_absolute_quality?.qa_avg_score
                 || qa_report?.qa_avg_score
                 || null;
  const qaDrift = qa_report?.quality_gates?.gate_4_drift?.drift
               || qa_report?.drift
               || null;

  // Determine approval status based on thresholds
  let finalStatus = 'approved';
  let rejectionReason = null;

  if (qa_report && qaQuality !== null && qaDrift !== null) {
    // QA report provided - check against thresholds
    const qualityPass = qaQuality >= config.min_quality_score;
    const driftPass = qaDrift <= config.max_drift_rate;

    if (!qualityPass || !driftPass) {
      finalStatus = 'pending_human';
      rejectionReason = [];
      if (!qualityPass) {
        rejectionReason.push(`Quality ${qaQuality.toFixed(2)} < threshold ${config.min_quality_score}`);
      }
      if (!driftPass) {
        rejectionReason.push(`Drift ${qaDrift.toFixed(2)} > threshold ${config.max_drift_rate}`);
      }
      rejectionReason = rejectionReason.join('; ');

      console.log(`[CHECKPOINT] QA FLAGGED for human review: ${rejectionReason}`);
    } else {
      console.log(`[CHECKPOINT] QA PASSED: quality=${qaQuality.toFixed(2)} (>=${config.min_quality_score}), drift=${qaDrift.toFixed(2)} (<=${config.max_drift_rate})`);
    }
  } else if (approved_by === 'human') {
    // Human override - always approve
    finalStatus = 'approved';
    console.log(`[CHECKPOINT] Human override - approving without QA check`);
  }

  // Record the checkpoint result
  await approveCheckpoint(courseCode, checkpointSeed, approved_by, qa_report, finalStatus);

  // If flagged for human review, return early without spawning agent
  if (finalStatus === 'pending_human') {
    return res.json({
      ok: true,
      status: 'FLAGGED_FOR_HUMAN',
      course_code: courseCode,
      checkpoint_seed: checkpointSeed,
      checkpoint_number: CHECKPOINT_SEEDS.indexOf(checkpointSeed) + 1,
      reason: rejectionReason,
      qa_metrics: { quality: qaQuality, drift: qaDrift },
      thresholds: { min_quality: config.min_quality_score, max_drift: config.max_drift_rate },
      message: 'QA check outside tolerance - flagged for human review',
      action: 'Human must review and manually approve via POST /api/checkpoint/approve with approved_by=human'
    });
  }

  // Log QA report if provided
  if (qa_report) {
    console.log(`[CHECKPOINT] QA report for ${courseCode} seed ${checkpointSeed}:`, JSON.stringify(qa_report, null, 2));
  }

  // AUTO-SPAWN FRESH AGENT after checkpoint approval (Ralph loop pattern)
  // Fresh spawn ensures: full methodology prompt + latest build_lessons + no context rot
  // CRITICAL: Only spawn if no agent is already running (prevents duplicate agents)
  const build = activeBuilds.get(courseCode);
  const runningAgents = getRunningAgentCount();
  let didSpawn = false;

  if (build) {
    if (runningAgents > 0) {
      console.log(`[CHECKPOINT] Skipping spawn - ${runningAgents} agent(s) already running for ${courseCode}`);
      build.status = 'checkpoint_approved';
      build.lastProgressTime = Date.now();
    } else {
      console.log(`[CHECKPOINT] Spawning fresh agent for ${courseCode} after checkpoint ${checkpointSeed} approval`);

      // Kill existing tracked agent if any (shouldn't happen since runningAgents is 0)
      if (build.agent) {
        try { process.kill(build.agent.pid, 'SIGTERM'); } catch (e) {}
        build.agent = null;
      }

      // NO AUTO-SPAWN: Dashboard controls agent spawning
      // Just update status - dashboard will spawn agent when ready
      build.status = 'checkpoint_approved';
      build.lastProgressTime = Date.now();
      console.log(`[CHECKPOINT] ${courseCode}: Checkpoint approved, ready for agent spawn from dashboard`);
    }
  }

  // Get updated status
  const newStatus = await getCheckpointStatus(courseCode);

  res.json({
    ok: true,
    status: 'APPROVED',
    course_code: courseCode,
    checkpoint_seed: checkpointSeed,
    checkpoint_number: CHECKPOINT_SEEDS.indexOf(checkpointSeed) + 1,
    message: `Checkpoint ${checkpointSeed} approved. ${newStatus.next_checkpoint ? 'Next checkpoint at seed ' + newStatus.next_checkpoint : 'All checkpoints complete!'}`,
    approved_by,
    approved_at: new Date().toISOString(),
    calibration_feedback: newStatus.calibration_feedback,
    next_checkpoint: newStatus.next_checkpoint,
    auto_spawn: didSpawn,
    agents_running: runningAgents,
    next_action: didSpawn ? 'Fresh agent spawned automatically' : (runningAgents > 0 ? `Agent already running (${runningAgents} active)` : `Start build with POST /api/build/start/${courseCode}`)
  });
});

/**
 * GET /api/checkpoint/status/:courseCode - Get checkpoint status
 */
app.get('/api/checkpoint/status/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const status = await getCheckpointStatus(courseCode);

  // Count approved checkpoints
  const approvedCount = Object.values(status.checkpoints).filter(cp => cp.approved).length;

  res.json({
    course_code: courseCode,
    checkpoint_enabled: CHECKPOINT_SEEDS.length > 0,
    checkpoint_seeds: CHECKPOINT_SEEDS,
    ...status,
    summary: {
      total_checkpoints: CHECKPOINT_SEEDS.length,
      approved_count: approvedCount,
      all_approved: status.next_checkpoint === null
    },
    message: status.next_checkpoint === null
      ? `All ${CHECKPOINT_SEEDS.length} checkpoints approved`
      : `Checkpoint ${status.next_checkpoint} awaiting approval (${approvedCount}/${CHECKPOINT_SEEDS.length} complete)`
  });
});

/**
 * GET /api/checkpoint/config/:courseCode - Get checkpoint config for course
 */
app.get('/api/checkpoint/config/:courseCode', async (req, res) => {
  const { courseCode } = req.params;

  // Get course-specific config
  const { data: courseConfig } = await supabase
    .from('course_checkpoint_config')
    .select('checkpoint_seed, review_mode, min_quality_score, max_drift_rate')
    .eq('course_code', courseCode)
    .order('checkpoint_seed');

  // Get default config
  const { data: defaultConfig } = await supabase
    .from('course_checkpoint_config')
    .select('checkpoint_seed, review_mode, min_quality_score, max_drift_rate')
    .eq('course_code', '_default')
    .order('checkpoint_seed');

  // Merge: course-specific overrides defaults
  const configMap = {};
  for (const cfg of (defaultConfig || [])) {
    configMap[cfg.checkpoint_seed] = { ...cfg, source: '_default' };
  }
  for (const cfg of (courseConfig || [])) {
    configMap[cfg.checkpoint_seed] = { ...cfg, source: courseCode };
  }

  res.json({
    course_code: courseCode,
    checkpoint_seeds: CHECKPOINT_SEEDS,
    config: CHECKPOINT_SEEDS.map(seed => configMap[seed] || {
      checkpoint_seed: seed,
      review_mode: 'human',
      min_quality_score: 7.0,
      max_drift_rate: 0.20,
      source: 'fallback'
    }),
    usage: {
      human: 'Build stops, waits for human approval',
      auto: 'QA agent auto-approves if gates pass',
      auto_with_flag: 'Auto-approve but flag for later human spot-check'
    }
  });
});

/**
 * PUT /api/checkpoint/config/:courseCode - Update checkpoint config
 * Body: { checkpoint_seed: number, review_mode: 'human'|'auto'|'auto_with_flag' }
 */
app.put('/api/checkpoint/config/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const { checkpoint_seed, review_mode, min_quality_score, max_drift_rate } = req.body;

  if (!checkpoint_seed || !CHECKPOINT_SEEDS.includes(checkpoint_seed)) {
    return res.status(400).json({
      error: 'Invalid checkpoint_seed',
      valid_seeds: CHECKPOINT_SEEDS
    });
  }

  if (!review_mode || !['human', 'auto', 'auto_with_flag'].includes(review_mode)) {
    return res.status(400).json({
      error: 'Invalid review_mode',
      valid_modes: ['human', 'auto', 'auto_with_flag']
    });
  }

  const { error } = await supabase
    .from('course_checkpoint_config')
    .upsert({
      course_code: courseCode,
      checkpoint_seed,
      review_mode,
      min_quality_score: min_quality_score || 7.0,
      max_drift_rate: max_drift_rate || 0.20,
      updated_at: new Date().toISOString()
    }, { onConflict: 'course_code,checkpoint_seed' });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  console.log(`[CONFIG] Updated ${courseCode} checkpoint ${checkpoint_seed} → ${review_mode}`);

  res.json({
    ok: true,
    course_code: courseCode,
    checkpoint_seed,
    review_mode,
    message: `Checkpoint ${checkpoint_seed} now uses '${review_mode}' review mode`
  });
});

// =============================================================================
// AUTOMATED CHECKPOINT QA ENDPOINTS
// =============================================================================

/**
 * GET /api/checkpoint/qa-sample/:courseCode - Get sample phrases for QA scoring
 * Returns ~20 USE phrases from the checkpoint range with agent scores hidden initially
 */
app.get('/api/checkpoint/qa-sample/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const { reveal_scores = 'false', checkpoint } = req.query;

  try {
    // Get pending QA job info or use query param
    const qaJob = pendingQAJobs.get(courseCode);
    const checkpointSeed = checkpoint ? parseInt(checkpoint, 10)
      : (qaJob?.checkpoint_seed || CHECKPOINT_SEEDS[0]);

    // Find the previous checkpoint seed (range start)
    const checkpointIndex = CHECKPOINT_SEEDS.indexOf(checkpointSeed);
    const rangeStart = checkpointIndex > 0 ? CHECKPOINT_SEEDS[checkpointIndex - 1] + 1 : 1;
    const rangeEnd = checkpointSeed;

    // Get USE phrases from this checkpoint range (seed_number is a direct column)
    const { data: phrases, error } = await supabase
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, known_text, target_text, metadata')
      .eq('course_code', courseCode)
      .eq('phrase_role', 'use')
      .gte('seed_number', rangeStart)
      .lte('seed_number', rangeEnd)
      .order('seed_number', { ascending: true })
      .limit(100);

    if (error) throw error;

    const inRangePhrases = phrases || [];

    // Randomly sample ~20 phrases
    const shuffled = inRangePhrases.sort(() => 0.5 - Math.random());
    const sample = shuffled.slice(0, 20);

    // Calculate agent's average score for comparison
    const agentScores = sample.map(p => p.metadata?.score).filter(s => typeof s === 'number');
    const agentAvg = agentScores.length > 0
      ? (agentScores.reduce((a, b) => a + b, 0) / agentScores.length).toFixed(2)
      : null;

    // Format response
    const formattedSample = sample.map(p => ({
      phrase_id: p.id,
      known: p.known_text,
      target: p.target_text,
      seed: p.seed_number,
      lego: p.lego_index,
      // Only reveal agent score if requested (QA should score first)
      agent_score: reveal_scores === 'true' ? p.metadata?.score : '[HIDDEN - score first]'
    }));

    res.json({
      ok: true,
      course_code: courseCode,
      checkpoint_seed: checkpointSeed,
      checkpoint_number: checkpointIndex + 1,
      range: { start: rangeStart, end: rangeEnd },
      sample_size: sample.length,
      agent_avg: reveal_scores === 'true' ? agentAvg : '[HIDDEN]',
      drift_threshold: QA_DRIFT_THRESHOLD,
      phrases: formattedSample,
      instructions: [
        'Score each phrase 5-9 based on quality (see ralph-methodology.md)',
        'Do NOT look at agent scores until after you score',
        `POST results to /api/checkpoint/qa-result/${courseCode}`,
        `Auto-approve if |your_avg - agent_avg| <= ${QA_DRIFT_THRESHOLD}`
      ]
    });
  } catch (err) {
    console.error(`[QA SAMPLE] Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/checkpoint/qa-result/:courseCode - Submit QA scoring results
 * Automatically approves if drift is within threshold, otherwise flags for human review
 */
app.post('/api/checkpoint/qa-result/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const { checkpoint_seed, scores, overall_assessment, recommendation } = req.body;

  try {
    if (!scores || !Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({ error: 'Missing scores array' });
    }

    // Get the QA job info
    const qaJob = pendingQAJobs.get(courseCode);
    const actualCheckpointSeed = checkpoint_seed || qaJob?.checkpoint_seed;

    if (!actualCheckpointSeed) {
      return res.status(400).json({ error: 'No checkpoint_seed provided and no pending QA job' });
    }

    // Calculate QA average
    const qaScores = scores.map(s => s.qa_score).filter(s => typeof s === 'number');
    const qaAvg = qaScores.reduce((a, b) => a + b, 0) / qaScores.length;

    // Get agent scores for the same phrases
    const phraseIds = scores.map(s => s.phrase_id);
    const { data: agentPhrases } = await supabase
      .from('course_practice_phrases')
      .select('id, metadata')
      .in('id', phraseIds);

    const agentScores = (agentPhrases || [])
      .map(p => p.metadata?.score)
      .filter(s => typeof s === 'number');
    const agentAvg = agentScores.length > 0
      ? agentScores.reduce((a, b) => a + b, 0) / agentScores.length
      : qaAvg; // Fallback if no agent scores

    // Calculate drift
    const drift = Math.abs(qaAvg - agentAvg);
    const driftOK = drift <= QA_DRIFT_THRESHOLD;

    console.log(`[QA RESULT] ${courseCode} checkpoint ${actualCheckpointSeed}:`);
    console.log(`  QA avg: ${qaAvg.toFixed(2)}, Agent avg: ${agentAvg.toFixed(2)}, Drift: ${drift.toFixed(2)}`);
    console.log(`  Drift ${driftOK ? '<=' : '>'} ${QA_DRIFT_THRESHOLD} → ${driftOK ? 'AUTO-APPROVE' : 'FLAG FOR HUMAN'}`);

    // Build QA report
    const qaReport = {
      qa_timestamp: new Date().toISOString(),
      checkpoint_seed: actualCheckpointSeed,
      sample_size: scores.length,
      quality_gates: {
        gate_1_absolute_quality: {
          qa_avg_score: qaAvg,
          threshold: 7.0,
          status: qaAvg >= 7.0 ? 'PASS' : 'FAIL'
        },
        gate_4_drift: {
          avg_agent_score: agentAvg,
          avg_qa_score: qaAvg,
          drift: drift,
          drift_rate: `${(drift * 100 / agentAvg).toFixed(1)}%`,
          threshold: QA_DRIFT_THRESHOLD,
          status: driftOK ? 'PASS' : 'FAIL'
        }
      },
      overall_assessment,
      recommendation: driftOK ? 'approve' : 'flag_human',
      scored_phrases: scores
    };

    // Clear pending QA job
    pendingQAJobs.delete(courseCode);

    // Determine final action
    if (driftOK && qaAvg >= 7.0) {
      // Auto-approve
      await approveCheckpoint(courseCode, actualCheckpointSeed, 'qa_agent', qaReport, 'approved');

      res.json({
        ok: true,
        status: 'AUTO_APPROVED',
        course_code: courseCode,
        checkpoint_seed: actualCheckpointSeed,
        qa_avg: qaAvg.toFixed(2),
        agent_avg: agentAvg.toFixed(2),
        drift: drift.toFixed(2),
        drift_threshold: QA_DRIFT_THRESHOLD,
        message: `Checkpoint ${actualCheckpointSeed} auto-approved. Drift ${drift.toFixed(2)} <= ${QA_DRIFT_THRESHOLD}. Build agent can continue.`,
        next_action: 'Build agent will automatically continue to next seed'
      });
    } else {
      // Flag for human review
      const reason = qaAvg < 7.0
        ? `Quality too low (${qaAvg.toFixed(2)} < 7.0)`
        : `Drift too high (${drift.toFixed(2)} > ${QA_DRIFT_THRESHOLD})`;

      await approveCheckpoint(courseCode, actualCheckpointSeed, 'qa_agent', qaReport, 'pending_human');

      res.json({
        ok: true,
        status: 'FLAGGED_FOR_HUMAN',
        course_code: courseCode,
        checkpoint_seed: actualCheckpointSeed,
        qa_avg: qaAvg.toFixed(2),
        agent_avg: agentAvg.toFixed(2),
        drift: drift.toFixed(2),
        drift_threshold: QA_DRIFT_THRESHOLD,
        reason,
        message: `Checkpoint ${actualCheckpointSeed} flagged for human review. ${reason}`,
        next_action: 'Human must approve at POST /api/checkpoint/approve/' + courseCode
      });
    }
  } catch (err) {
    console.error(`[QA RESULT] Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/checkpoint/qa-status/:courseCode - Check if QA is pending
 */
app.get('/api/checkpoint/qa-status/:courseCode', (req, res) => {
  const { courseCode } = req.params;
  const job = pendingQAJobs.get(courseCode);

  res.json({
    course_code: courseCode,
    qa_pending: !!job && job.status === 'running',
    job: job || null
  });
});

// =============================================================================
// PHRASE MONITOR QA ENDPOINTS
// Used by Sonnet monitor agent (USE phrases only) to check phrases and flag issues
// =============================================================================

/**
 * GET /api/qa/unchecked/:courseCode - Get phrases not yet QA checked
 * Query params:
 *   ?limit=50 - Max phrases to return
 *   ?role=use - Filter by phrase_role (use, practice, component)
 */
app.get('/api/qa/unchecked/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const role = req.query.role; // Optional: 'use', 'practice', 'component'

    let query = supabase
      .from('course_practice_phrases')
      .select('id, lego_index, known_text, target_text, phrase_role, seed_number, created_at')
      .eq('course_code', courseCode)
      .is('qa_checked', null);

    // Filter by role if specified (recommended: use 'use' for QA)
    if (role) {
      query = query.eq('phrase_role', role);
    }

    const { data, error } = await query
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    res.json({
      course_code: courseCode,
      role_filter: role || 'all',
      unchecked_count: data.length,
      phrases: data
    });
  } catch (err) {
    console.error('[QA] Error getting unchecked phrases:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/qa/sample/:courseCode - Get random sample of phrases for AUDIT mode
 * Unlike /unchecked, this returns ANY phrases regardless of qa_checked status
 */
app.get('/api/qa/sample/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const seedMin = parseInt(req.query.seed_min) || 1;
    const seedMax = parseInt(req.query.seed_max) || 999;

    // Get random sample using Supabase's built-in random ordering
    // Note: For true randomness on large tables, we fetch more and shuffle
    const { data, error } = await supabase
      .from('course_practice_phrases')
      .select('id, lego_index, known_text, target_text, phrase_role, seed_number, created_at, qa_checked')
      .eq('course_code', courseCode)
      .gte('seed_number', seedMin)
      .lte('seed_number', seedMax)
      .limit(limit * 2);  // Fetch extra for shuffling

    if (error) throw error;

    // Shuffle and take limit
    const shuffled = data.sort(() => Math.random() - 0.5).slice(0, limit);

    res.json({
      course_code: courseCode,
      sample_size: shuffled.length,
      seed_range: { min: seedMin, max: seedMax },
      phrases: shuffled
    });
  } catch (err) {
    console.error('[QA] Error getting phrase sample:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/phrases/:courseCode - Get phrases with filters (for QA audit)
 */
app.get('/api/phrases/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    const seedMin = parseInt(req.query.seed_min) || null;
    const seedMax = parseInt(req.query.seed_max) || null;
    const role = req.query.role || null;  // 'build', 'use', 'practice', 'component'

    let query = supabase
      .from('course_practice_phrases')
      .select('id, lego_index, known_text, target_text, phrase_role, seed_number, created_at, qa_checked')
      .eq('course_code', courseCode)
      .order('seed_number', { ascending: true })
      .order('lego_index', { ascending: true });

    if (seedMin) query = query.gte('seed_number', seedMin);
    if (seedMax) query = query.lte('seed_number', seedMax);
    if (role) query = query.eq('phrase_role', role);

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;

    res.json({
      course_code: courseCode,
      count: data.length,
      offset,
      limit,
      phrases: data
    });
  } catch (err) {
    console.error('[QA] Error getting phrases:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/qa/flag - Insert a QA flag for a phrase
 */
app.post('/api/qa/flag', async (req, res) => {
  try {
    const { course_code, phrase_id, seed_number, lego_id, check_type, severity, issue, details } = req.body;

    if (!course_code || !check_type || !issue) {
      return res.status(400).json({
        error: 'Missing required fields: course_code, check_type, issue'
      });
    }

    // Valid check types from migration
    const validTypes = ['grammar', 'semantic', 'naturalness', 'lego_frequency', 'lego_spread', 'variety', 'vocabulary', 'decomposition', 'pedagogy'];
    if (!validTypes.includes(check_type)) {
      return res.status(400).json({
        error: `Invalid check_type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const validSeverities = ['error', 'warning', 'info'];
    if (severity && !validSeverities.includes(severity)) {
      return res.status(400).json({
        error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`
      });
    }

    // Check if flag already exists for this phrase+check_type
    let existingFlag = null;
    if (phrase_id) {
      const { data: existing } = await supabase
        .from('course_qa_flags')
        .select('id')
        .eq('phrase_id', phrase_id)
        .eq('check_type', check_type)
        .eq('status', 'open')
        .maybeSingle();
      existingFlag = existing;
    }

    let data;
    if (existingFlag) {
      // Update existing flag
      const { data: updated, error } = await supabase
        .from('course_qa_flags')
        .update({
          severity: severity || 'warning',
          issue,
          details: details || {},
          flagged_at: new Date().toISOString()
        })
        .eq('id', existingFlag.id)
        .select()
        .single();
      if (error) throw error;
      data = updated;
    } else {
      // Insert new flag
      const { data: inserted, error } = await supabase
        .from('course_qa_flags')
        .insert({
          course_code,
          phrase_id: phrase_id || null,
          seed_number: seed_number || null,
          lego_id: lego_id || null,
          check_type,
          severity: severity || 'warning',
          issue,
          details: details || {},
          status: 'open',
          flagged_at: new Date().toISOString()
        })
        .select()
        .single();
      if (error) throw error;
      data = inserted;
    }

    console.log(`[QA] Flag created: ${check_type}/${severity} - ${issue.substring(0, 50)}...`);

    res.json({
      success: true,
      flag: data
    });
  } catch (err) {
    console.error('[QA] Error inserting flag:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/qa/bulk-flag - Insert/upsert multiple QA flags at once
 * Accepts { flags: [{ course_code, phrase_id, seed_number, lego_id, check_type, severity, issue, details }] }
 * Also marks flagged phrase_ids as qa_checked.
 */
app.post('/api/qa/bulk-flag', async (req, res) => {
  try {
    const { flags } = req.body;

    if (!flags || !Array.isArray(flags) || flags.length === 0) {
      return res.status(400).json({ error: 'flags must be a non-empty array' });
    }

    const validTypes = ['grammar', 'semantic', 'naturalness', 'lego_frequency', 'lego_spread', 'variety', 'vocabulary', 'decomposition', 'pedagogy'];
    const validSeverities = ['error', 'warning', 'info'];

    // Validate all flags first
    for (let i = 0; i < flags.length; i++) {
      const f = flags[i];
      if (!f.course_code || !f.check_type || !f.issue) {
        return res.status(400).json({ error: `Flag ${i}: missing required fields (course_code, check_type, issue)` });
      }
      if (!validTypes.includes(f.check_type)) {
        return res.status(400).json({ error: `Flag ${i}: invalid check_type '${f.check_type}'` });
      }
      if (f.severity && !validSeverities.includes(f.severity)) {
        return res.status(400).json({ error: `Flag ${i}: invalid severity '${f.severity}'` });
      }
    }

    let created = 0;
    let updated = 0;
    const phraseIdsToMark = new Set();

    for (const f of flags) {
      // Check for existing flag (dedup by phrase_id + check_type)
      let existingFlag = null;
      if (f.phrase_id) {
        const { data: existing } = await supabase
          .from('course_qa_flags')
          .select('id')
          .eq('phrase_id', f.phrase_id)
          .eq('check_type', f.check_type)
          .eq('status', 'open')
          .maybeSingle();
        existingFlag = existing;
      }

      if (existingFlag) {
        const { error } = await supabase
          .from('course_qa_flags')
          .update({
            severity: f.severity || 'warning',
            issue: f.issue,
            details: f.details || {},
            flagged_at: new Date().toISOString()
          })
          .eq('id', existingFlag.id);
        if (error) throw error;
        updated++;
      } else {
        const { error } = await supabase
          .from('course_qa_flags')
          .insert({
            course_code: f.course_code,
            phrase_id: f.phrase_id || null,
            seed_number: f.seed_number || null,
            lego_id: f.lego_id || null,
            check_type: f.check_type,
            severity: f.severity || 'warning',
            issue: f.issue,
            details: f.details || {},
            status: 'open',
            flagged_at: new Date().toISOString()
          });
        if (error) throw error;
        created++;
      }

      if (f.phrase_id) phraseIdsToMark.add(f.phrase_id);
    }

    // Mark all flagged phrases as qa_checked
    if (phraseIdsToMark.size > 0) {
      const { error: markError } = await supabase
        .from('course_practice_phrases')
        .update({ qa_checked: new Date().toISOString() })
        .in('id', [...phraseIdsToMark]);
      if (markError) console.error('[QA] Error marking flagged phrases as checked:', markError.message);
    }

    console.log(`[QA] Bulk flag: ${created} created, ${updated} updated, ${phraseIdsToMark.size} phrases marked checked`);

    res.json({
      success: true,
      created,
      updated,
      total: created + updated,
      phrases_marked_checked: phraseIdsToMark.size
    });
  } catch (err) {
    console.error('[QA] Error in bulk flag:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/qa/bulk-mark-checked - Mark all phrases in a seed range as QA checked
 * Accepts { course_code, seed_min, seed_max }
 * More efficient than sending individual phrase IDs when agent finishes a batch with no flags.
 */
app.post('/api/qa/bulk-mark-checked', async (req, res) => {
  try {
    const { course_code, seed_min, seed_max } = req.body;

    if (!course_code || !seed_min || !seed_max) {
      return res.status(400).json({ error: 'Missing required fields: course_code, seed_min, seed_max' });
    }
    if (seed_min > seed_max) {
      return res.status(400).json({ error: 'seed_min must be <= seed_max' });
    }

    const { data, error } = await supabase
      .from('course_practice_phrases')
      .update({ qa_checked: new Date().toISOString() })
      .eq('course_code', course_code)
      .gte('seed_number', seed_min)
      .lte('seed_number', seed_max)
      .is('qa_checked', null)
      .select('id', { count: 'exact', head: true });

    // Supabase update doesn't return count directly, so count separately
    const { count } = await supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', course_code)
      .gte('seed_number', seed_min)
      .lte('seed_number', seed_max)
      .not('qa_checked', 'is', null);

    if (error) throw error;

    console.log(`[QA] Bulk mark-checked: seeds ${seed_min}-${seed_max} for ${course_code} (${count} phrases)`);

    res.json({
      success: true,
      course_code,
      seed_min,
      seed_max,
      phrases_checked: count || 0
    });
  } catch (err) {
    console.error('[QA] Error in bulk mark-checked:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/qa/mark-checked - Mark phrases as QA checked
 */
app.post('/api/qa/mark-checked', async (req, res) => {
  try {
    const { phrase_ids } = req.body;

    if (!phrase_ids || !Array.isArray(phrase_ids) || phrase_ids.length === 0) {
      return res.status(400).json({
        error: 'phrase_ids must be a non-empty array'
      });
    }

    const { error } = await supabase
      .from('course_practice_phrases')
      .update({ qa_checked: new Date().toISOString() })
      .in('id', phrase_ids);

    if (error) throw error;

    console.log(`[QA] Marked ${phrase_ids.length} phrases as checked`);

    res.json({
      success: true,
      checked_count: phrase_ids.length
    });
  } catch (err) {
    console.error('[QA] Error marking phrases checked:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/qa/flags/:courseCode/pending - Get open flags needing review (for Fixer agent)
 */
app.get('/api/qa/flags/:courseCode/pending', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const severity = req.query.severity;

    let query = supabase
      .from('course_qa_flags')
      .select('*')
      .eq('course_code', courseCode)
      .eq('status', 'open')
      .order('severity', { ascending: true })  // errors first
      .order('flagged_at', { ascending: true })
      .limit(limit);

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data: flags, error } = await query;
    if (error) throw error;

    res.json({
      course_code: courseCode,
      pending_count: flags.length,
      flags
    });
  } catch (err) {
    console.error('[QA] Error getting pending flags:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/phrases/:id - Update a phrase (for Fixer agent)
 */
app.patch('/api/phrases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { known_text, target_text } = req.body;

    if (!known_text && !target_text) {
      return res.status(400).json({
        error: 'Must provide known_text and/or target_text to update'
      });
    }

    // Get current phrase for logging
    const { data: current } = await supabase
      .from('course_practice_phrases')
      .select('known_text, target_text, course_code, seed_number')
      .eq('id', id)
      .single();

    if (!current) {
      return res.status(404).json({ error: 'Phrase not found' });
    }

    // Build update object
    const updates = {};
    if (known_text && known_text !== current.known_text) {
      updates.known_text = known_text;
    }
    if (target_text && target_text !== current.target_text) {
      updates.target_text = target_text;
    }

    if (Object.keys(updates).length === 0) {
      return res.json({ success: true, message: 'No changes needed', phrase_id: id });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('course_practice_phrases')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log(`[QA-FIX] Updated phrase ${id} in ${current.course_code} S${current.seed_number}:`);
    if (updates.known_text) console.log(`  known: "${current.known_text}" → "${updates.known_text}"`);
    if (updates.target_text) console.log(`  target: "${current.target_text}" → "${updates.target_text}"`);

    res.json({
      success: true,
      phrase_id: id,
      changes: updates,
      phrase: data
    });
  } catch (err) {
    console.error('[QA] Error updating phrase:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/qa/flag/:id/resolve - Mark flag as resolved with fix applied
 */
app.post('/api/qa/flag/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, fix_applied, reasoning } = req.body;

    // Get current details first
    const { data: flag } = await supabase
      .from('course_qa_flags')
      .select('details')
      .eq('id', id)
      .single();

    const mergedDetails = {
      ...(flag?.details || {}),
      fix_applied,
      reasoning
    };

    const { data: updated, error: updateError } = await supabase
      .from('course_qa_flags')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolution_notes: resolution || 'fixed',
        details: mergedDetails
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log(`[QA-FIX] Resolved flag ${id}: ${resolution || 'fixed'}`);
    res.json({ success: true, flag: updated });
  } catch (err) {
    console.error('[QA] Error resolving flag:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/qa/flag/:id/dismiss - Dismiss flag as false positive
 */
app.post('/api/qa/flag/:id/dismiss', async (req, res) => {
  try {
    const { id } = req.params;
    const { reasoning } = req.body;

    // Get current details
    const { data: flag } = await supabase
      .from('course_qa_flags')
      .select('details')
      .eq('id', id)
      .single();

    const mergedDetails = {
      ...(flag?.details || {}),
      dismissal_reasoning: reasoning
    };

    const { data, error } = await supabase
      .from('course_qa_flags')
      .update({
        status: 'false_positive',
        resolved_at: new Date().toISOString(),
        details: mergedDetails
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log(`[QA-FIX] Dismissed flag ${id} as false positive`);
    res.json({ success: true, flag: data });
  } catch (err) {
    console.error('[QA] Error dismissing flag:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/qa/flags/:courseCode - Get all QA flags for a course
 */
app.get('/api/qa/flags/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const status = req.query.status || 'open';

    let query = supabase
      .from('course_qa_flags')
      .select('*')
      .eq('course_code', courseCode)
      .order('flagged_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Group by check_type for summary
    const bySeverity = { error: 0, warning: 0, info: 0 };
    const byType = {};
    data.forEach(f => {
      bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
      byType[f.check_type] = (byType[f.check_type] || 0) + 1;
    });

    res.json({
      course_code: courseCode,
      total: data.length,
      by_severity: bySeverity,
      by_type: byType,
      flags: data
    });
  } catch (err) {
    console.error('[QA] Error getting flags:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/qa/summary/:courseCode - QA summary for dashboard
 */
app.get('/api/qa/summary/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;

    // Get flag counts
    const { data: flags, error: flagError } = await supabase
      .from('course_qa_flags')
      .select('severity, status')
      .eq('course_code', courseCode);

    if (flagError) throw flagError;

    // Look up golden seed count for this course
    let goldenCount = 10;
    try {
      const { data: courseData } = await supabase
        .from('courses')
        .select('quality_rules')
        .eq('course_code', courseCode)
        .single();
      goldenCount = getGoldenSeedCount(courseData);
    } catch (e) { /* default to 10 */ }

    // Get phrase check progress (exclude golden seeds — they aren't QA-checked)
    const { count: totalPhrases } = await supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .gt('seed_number', goldenCount);

    const { count: checkedPhrases } = await supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .gt('seed_number', goldenCount)
      .not('qa_checked', 'is', null);

    const openFlags = flags.filter(f => f.status === 'open');
    const bySeverity = { error: 0, warning: 0, info: 0 };
    openFlags.forEach(f => {
      bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    });

    res.json({
      course_code: courseCode,
      phrases: {
        total: totalPhrases || 0,
        checked: checkedPhrases || 0,
        unchecked: (totalPhrases || 0) - (checkedPhrases || 0),
        progress_percent: totalPhrases ? Math.round((checkedPhrases / totalPhrases) * 100) : 0
      },
      flags: {
        total: flags.length,
        open: openFlags.length,
        errors: bySeverity.error,
        warnings: bySeverity.warning,
        info: bySeverity.info
      }
    });
  } catch (err) {
    console.error('[QA] Error getting summary:', err);
    res.status(500).json({ error: err.message });
  }
});

// QA spawn-monitor endpoint removed — phrase monitors were sequential-only

/**
 * POST /api/qa/spawn-fixer/:courseCode - Spawn Opus phrase fixer agent
 */
app.post('/api/qa/spawn-fixer/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { spawnPhraseFixer } = require('./shared/spawn-course-builder.cjs');

    console.log(`[QA] Spawning phrase fixer for ${courseCode}...`);

    // Spawn in background - don't wait for completion
    spawnPhraseFixer({ courseCode, terminal: 'iterm' }, 1)
      .then(() => console.log(`[QA] Fixer spawned for ${courseCode}`))
      .catch(err => console.error(`[QA] Fixer spawn failed: ${err.message}`));

    res.json({
      success: true,
      message: `Phrase fixer spawning for ${courseCode}`,
      course_code: courseCode
    });
  } catch (err) {
    console.error('[QA] Error spawning fixer:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/qa/spawn-polisher/:courseCode - Spawn Opus phrase polisher (high-quality pass on first 50 rounds)
 */
app.post('/api/qa/spawn-polisher/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const roundLimit = parseInt(req.body.round_limit) || 50;
    const { spawnPhrasePolisher } = require('./shared/spawn-course-builder.cjs');

    console.log(`[QA] Spawning phrase polisher for ${courseCode} (first ${roundLimit} rounds)...`);

    // Spawn in background - don't wait for completion
    spawnPhrasePolisher({ courseCode, roundLimit, terminal: 'iterm' }, 1)
      .then(() => console.log(`[QA] Polisher spawned for ${courseCode}`))
      .catch(err => console.error(`[QA] Polisher spawn failed: ${err.message}`));

    res.json({
      success: true,
      message: `Opus polisher spawning for ${courseCode} - first ${roundLimit} rounds`,
      course_code: courseCode,
      round_limit: roundLimit
    });
  } catch (err) {
    console.error('[QA] Error spawning polisher:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/qa/spawn-audit/:courseCode - Spawn Sonnet phrase auditor agent (random sample)
 */
app.post('/api/qa/spawn-audit/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const sampleSize = parseInt(req.body.sample_size) || 100;
    const { spawnPhraseAuditor } = require('./shared/spawn-course-builder.cjs');

    console.log(`[QA] Spawning phrase auditor for ${courseCode} (sample: ${sampleSize})...`);

    // Spawn in background - don't wait for completion
    spawnPhraseAuditor({ courseCode, sampleSize, terminal: 'iterm' }, 1)
      .then(() => console.log(`[QA] Auditor spawned for ${courseCode}`))
      .catch(err => console.error(`[QA] Auditor spawn failed: ${err.message}`));

    res.json({
      success: true,
      message: `Phrase auditor spawning for ${courseCode}`,
      course_code: courseCode,
      sample_size: sampleSize
    });
  } catch (err) {
    console.error('[QA] Error spawning auditor:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/qa/phrase/:phraseId - Delete a flagged phrase
 */
app.delete('/api/qa/phrase/:phraseId', async (req, res) => {
  try {
    const { phraseId } = req.params;

    // Remove flags first (FK constraint: flags reference phrases)
    await supabase
      .from('course_qa_flags')
      .delete()
      .eq('phrase_id', phraseId);

    // Then delete the phrase
    const { error: phraseError } = await supabase
      .from('course_practice_phrases')
      .delete()
      .eq('id', phraseId);

    if (phraseError) throw phraseError;

    console.log(`[QA] Deleted phrase ${phraseId}`);

    res.json({ success: true, deleted: phraseId });
  } catch (err) {
    console.error('[QA] Error deleting phrase:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/qa/flagged-phrases/:courseCode - Delete all phrases that have open QA flags
 * Query params:
 *   ?severity=error - Only delete phrases flagged at this severity (default: all open flags)
 *   ?seed_min=293&seed_max=300 - Restrict to seed range
 *   ?dry_run=true - Preview what would be deleted without actually deleting
 */
app.delete('/api/qa/flagged-phrases/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const severity = req.query.severity;
    const seedMin = parseInt(req.query.seed_min) || null;
    const seedMax = parseInt(req.query.seed_max) || null;
    const dryRun = req.query.dry_run === 'true';

    // Get all open flags for this course
    let flagQuery = supabase
      .from('course_qa_flags')
      .select('id, phrase_id, seed_number, check_type, severity, issue')
      .eq('course_code', courseCode)
      .eq('status', 'open')
      .not('phrase_id', 'is', null);

    if (severity) flagQuery = flagQuery.eq('severity', severity);
    if (seedMin) flagQuery = flagQuery.gte('seed_number', seedMin);
    if (seedMax) flagQuery = flagQuery.lte('seed_number', seedMax);

    const { data: flags, error: flagError } = await flagQuery;
    if (flagError) throw flagError;

    if (!flags || flags.length === 0) {
      return res.json({ success: true, deleted: 0, phrases: [], message: 'No flagged phrases found' });
    }

    // Deduplicate phrase IDs (multiple flags can reference same phrase)
    const phraseIds = [...new Set(flags.map(f => f.phrase_id))];

    if (dryRun) {
      return res.json({
        dry_run: true,
        would_delete: phraseIds.length,
        flags_count: flags.length,
        phrases: phraseIds,
        flags: flags
      });
    }

    // Delete flags first (FK constraint)
    const flagIds = flags.map(f => f.id);
    const { error: delFlagError } = await supabase
      .from('course_qa_flags')
      .delete()
      .in('id', flagIds);
    if (delFlagError) throw delFlagError;

    // Delete the phrases
    const { error: delPhraseError, count } = await supabase
      .from('course_practice_phrases')
      .delete()
      .in('id', phraseIds);
    if (delPhraseError) throw delPhraseError;

    console.log(`[QA] Bulk deleted ${phraseIds.length} flagged phrases (${flags.length} flags) for ${courseCode}`);

    res.json({
      success: true,
      deleted: phraseIds.length,
      flags_removed: flags.length,
      phrases: phraseIds
    });
  } catch (err) {
    console.error('[QA] Error bulk-deleting flagged phrases:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/qa/flag/:flagId - Update a flag (resolve, dismiss, etc.)
 */
app.patch('/api/qa/flag/:flagId', async (req, res) => {
  try {
    const { flagId } = req.params;
    const { status, resolution_notes } = req.body;

    const updates = { status };
    if (status === 'resolved' || status === 'ignored' || status === 'false_positive') {
      updates.resolved_at = new Date().toISOString();
    }
    if (resolution_notes) {
      updates.resolution_notes = resolution_notes;
    }

    const { data, error } = await supabase
      .from('course_qa_flags')
      .update(updates)
      .eq('id', flagId)
      .select()
      .single();

    if (error) throw error;

    console.log(`[QA] Flag ${flagId} updated to ${status}`);

    res.json({ success: true, flag: data });
  } catch (err) {
    console.error('[QA] Error updating flag:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/qa/flagged-phrases/:courseCode - Get phrases with their flags for UI
 * Supports pagination: ?limit=50&offset=0&severity=error
 */
app.get('/api/qa/flagged-phrases/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const severity = req.query.severity;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    // First get total count for pagination
    let countQuery = supabase
      .from('course_qa_flags')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .eq('status', 'open');

    if (severity) {
      countQuery = countQuery.eq('severity', severity);
    }

    const { count: total } = await countQuery;

    // Get flags with pagination
    let query = supabase
      .from('course_qa_flags')
      .select('*')
      .eq('course_code', courseCode)
      .eq('status', 'open')
      .order('flagged_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data: flags, error: flagError } = await query;
    if (flagError) {
      console.error('[QA] Flag query error:', flagError);
      throw flagError;
    }

    // Get unique phrase IDs from this page only
    const phraseIds = [...new Set(flags.filter(f => f.phrase_id).map(f => f.phrase_id))];
    const phraseMap = new Map();

    // Batch fetch phrases (max 100 at a time for Supabase)
    if (phraseIds.length > 0) {
      for (let i = 0; i < phraseIds.length; i += 100) {
        const batch = phraseIds.slice(i, i + 100);
        const { data: phrases } = await supabase
          .from('course_practice_phrases')
          .select('id, known_text, target_text, seed_number, phrase_role')
          .in('id', batch);
        if (phrases) {
          phrases.forEach(p => phraseMap.set(p.id, p));
        }
      }
    }

    // Merge flags with phrase data
    const result = flags.map(f => ({
      id: f.id,
      phrase_id: f.phrase_id,
      seed_number: f.seed_number || f.details?.seed_number,
      check_type: f.check_type,
      severity: f.severity,
      issue: f.issue,
      details: f.details,
      flagged_at: f.flagged_at,
      phrase: f.phrase_id ? (phraseMap.get(f.phrase_id) || {
        known_text: f.details?.known_text,
        target_text: f.details?.target_text,
        phrase_role: f.details?.phrase_role
      }) : null
    }));

    res.json({
      course_code: courseCode,
      total,
      limit,
      offset,
      has_more: offset + flags.length < total,
      flags: result
    });
  } catch (err) {
    console.error('[QA] Error getting flagged phrases:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// GOLDEN SEED BUILDER ENDPOINTS
// =============================================================================

/**
 * GET /api/golden/seed-status/:courseCode/:seedNumber - Coordination primitive for golden seed builder
 * Both Creator and Checker agents poll this to know the current state of a seed.
 * Returns status: "empty" | "submitted" | "checking" | "flagged" | "approved" | "escalated"
 */
app.get('/api/golden/seed-status/:courseCode/:seedNumber', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const seedNumber = parseInt(req.params.seedNumber);
    if (!seedNumber || seedNumber < 1) {
      return res.status(400).json({ error: 'Invalid seed number' });
    }

    // Count phrases for this seed
    const { count: phrasesCount, error: phrasesErr } = await supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .eq('seed_number', seedNumber);
    if (phrasesErr) throw phrasesErr;

    // Count checked phrases (qa_checked is TIMESTAMPTZ, not boolean)
    const { count: checkedCount, error: checkedErr } = await supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .eq('seed_number', seedNumber)
      .not('qa_checked', 'is', null);
    if (checkedErr) throw checkedErr;

    // Get open flags for this seed
    const { data: openFlags, error: flagErr } = await supabase
      .from('course_qa_flags')
      .select('id, check_type, severity, issue, details, phrase_id')
      .eq('course_code', courseCode)
      .eq('seed_number', seedNumber)
      .eq('status', 'open');
    if (flagErr) throw flagErr;

    // Count resolved flags to derive round number
    const { count: resolvedFlagCount, error: resolvedErr } = await supabase
      .from('course_qa_flags')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .eq('seed_number', seedNumber)
      .in('status', ['resolved', 'ignored', 'false_positive']);
    if (resolvedErr) throw resolvedErr;

    // Derive round: each revision cycle creates flags then resolves them
    // Round 1 = initial submission, round increments with each flag+rebuild cycle
    const totalFlagCycles = openFlags.length > 0
      ? Math.ceil((resolvedFlagCount + 1) / Math.max(1, openFlags.length))
      : (resolvedFlagCount > 0 ? Math.ceil(resolvedFlagCount / 3) + 1 : 1);
    const round = Math.max(1, totalFlagCycles);

    const uncheckedCount = (phrasesCount || 0) - (checkedCount || 0);

    // Derive status
    let status;
    if (!phrasesCount || phrasesCount === 0) {
      status = 'empty';
    } else if (openFlags && openFlags.length > 0) {
      status = round >= 3 ? 'escalated' : 'flagged';
    } else if (checkedCount === phrasesCount) {
      status = 'approved';
    } else if (checkedCount > 0) {
      status = 'checking';
    } else {
      status = 'submitted';
    }

    res.json({
      seed_number: seedNumber,
      status,
      round,
      phrases_count: phrasesCount || 0,
      flags: (openFlags || []).map(f => ({
        id: f.id,
        check_type: f.check_type,
        severity: f.severity,
        issue: f.issue,
        details: f.details,
        phrase_id: f.phrase_id
      })),
      checked_count: checkedCount || 0,
      unchecked_count: uncheckedCount
    });
  } catch (err) {
    console.error('[GOLDEN] Error getting seed status:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/golden/status/:courseCode - Batch status for all golden seeds
 * Returns status array for seeds 1-N (where N = golden_seed_count or targetSeeds param)
 */
app.get('/api/golden/status/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const targetSeeds = parseInt(req.query.target) || 50;

    // Fetch course info for golden seed count
    const { data: courseInfo } = await supabase
      .from('courses')
      .select('quality_rules')
      .eq('course_code', courseCode)
      .single();

    const goldenCount = getGoldenSeedCount(courseInfo);
    const effectiveTarget = Math.min(targetSeeds, goldenCount);

    // Batch fetch: all phrases counts grouped by seed
    const { data: phraseCounts, error: pcErr } = await supabase
      .from('course_practice_phrases')
      .select('seed_number, qa_checked')
      .eq('course_code', courseCode)
      .gte('seed_number', 1)
      .lte('seed_number', effectiveTarget);
    if (pcErr) throw pcErr;

    // Batch fetch: all open flags for these seeds
    const { data: allFlags, error: afErr } = await supabase
      .from('course_qa_flags')
      .select('seed_number, status')
      .eq('course_code', courseCode)
      .gte('seed_number', 1)
      .lte('seed_number', effectiveTarget);
    if (afErr) throw afErr;

    // Aggregate per seed
    const seedMap = {};
    for (let i = 1; i <= effectiveTarget; i++) {
      seedMap[i] = { total: 0, checked: 0, open_flags: 0, resolved_flags: 0 };
    }

    for (const p of (phraseCounts || [])) {
      if (!seedMap[p.seed_number]) seedMap[p.seed_number] = { total: 0, checked: 0, open_flags: 0, resolved_flags: 0 };
      seedMap[p.seed_number].total++;
      if (p.qa_checked) seedMap[p.seed_number].checked++;
    }

    for (const f of (allFlags || [])) {
      if (!seedMap[f.seed_number]) continue;
      if (f.status === 'open') seedMap[f.seed_number].open_flags++;
      else seedMap[f.seed_number].resolved_flags++;
    }

    const seeds = [];
    let approvedCount = 0;
    let flaggedCount = 0;
    let escalatedCount = 0;

    for (let i = 1; i <= effectiveTarget; i++) {
      const s = seedMap[i];
      const round = s.resolved_flags > 0 ? Math.ceil(s.resolved_flags / 3) + 1 : 1;

      let status;
      if (s.total === 0) status = 'empty';
      else if (s.open_flags > 0) status = round >= 3 ? 'escalated' : 'flagged';
      else if (s.checked === s.total) status = 'approved';
      else if (s.checked > 0) status = 'checking';
      else status = 'submitted';

      if (status === 'approved') approvedCount++;
      if (status === 'flagged') flaggedCount++;
      if (status === 'escalated') escalatedCount++;

      seeds.push({ seed_number: i, status, phrases: s.total, checked: s.checked, flags: s.open_flags, round });
    }

    res.json({
      course_code: courseCode,
      target_seeds: effectiveTarget,
      golden_seed_count: goldenCount,
      summary: { approved: approvedCount, flagged: flaggedCount, escalated: escalatedCount, total: effectiveTarget },
      seeds
    });
  } catch (err) {
    console.error('[GOLDEN] Error getting batch status:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/build/translate/:courseCode - Spawn a translation agent for a course
 * Query params:
 *   ?dry_run=true - Preview brief without spawning agent
 *   ?terminal=iTerm2 - Terminal to use (iTerm2 or Terminal)
 */
app.post('/api/build/translate/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const terminal = req.query.terminal || 'iTerm2';
    const dryRun = req.query.dry_run === 'true';

    // Check for active translate job
    const { data: activeJob } = await supabase
      .from('build_jobs')
      .select('id, status')
      .eq('course_code', courseCode)
      .eq('pass', 'translate')
      .in('status', ['running'])
      .maybeSingle();

    if (activeJob && !dryRun) {
      return res.status(409).json({ error: 'Translation already running', job_id: activeJob.id });
    }

    const result = await spawnTranslationAgent(courseCode, terminal, dryRun);
    res.json(result);
  } catch (err) {
    console.error('[TRANSLATE] Error starting translation:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/build/golden/:courseCode - Spawn Creator + Checker agents for golden seed building
 * Query params:
 *   ?target=50 - Number of golden seeds to build (default: 50)
 *   ?dry_run=true - Preview briefs without spawning agents
 *   ?terminal=iTerm2 - Terminal to use (iTerm2 or Terminal)
 */
app.post('/api/build/golden/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const targetSeeds = parseInt(req.query.target) || 50;
    const dryRun = req.query.dry_run === 'true';
    const terminal = req.query.terminal || 'iTerm2';
    const phase = req.query.phase || 'golden'; // 'calibration' or 'golden'

    if (!['calibration', 'golden'].includes(phase)) {
      return res.status(400).json({ error: 'phase must be "calibration" or "golden"' });
    }

    if (targetSeeds < 1 || targetSeeds > 50) {
      return res.status(400).json({ error: 'target must be between 1 and 50' });
    }

    // Check for active golden build
    const { data: activeJob } = await supabase
      .from('build_jobs')
      .select('id, status')
      .eq('course_code', courseCode)
      .eq('pass', 'golden')
      .in('status', ['running'])
      .maybeSingle();

    if (activeJob && !dryRun) {
      return res.status(409).json({ error: 'Golden build already running', job_id: activeJob.id });
    }

    const result = await spawnGoldenBuildAgents(courseCode, targetSeeds, terminal, dryRun, phase);
    res.json(result);
  } catch (err) {
    console.error('[GOLDEN] Error starting golden build:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/golden/finalize/:courseCode - Auto-submit approved golden seeds as calibration data
 * Called by Creator agent after all seeds approved, or by dashboard "Approve" button.
 * Query params:
 *   ?target_seeds=50 - Number of seeds to finalize (default: 50)
 */
app.post('/api/golden/finalize/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const targetSeeds = parseInt(req.body?.target_seeds || req.query.target_seeds) || 50;

    // Fetch all LEGOs and phrases for seeds 1-targetSeeds
    const { data: legos, error: legoErr } = await supabase
      .from('course_legos')
      .select('seed_number, lego_index, type, known_text, target_text, components')
      .eq('course_code', courseCode)
      .gte('seed_number', 1)
      .lte('seed_number', targetSeeds)
      .order('seed_number')
      .order('lego_index');
    if (legoErr) throw legoErr;

    const { data: seeds, error: seedErr } = await supabase
      .from('course_seeds')
      .select('seed_number, known_text, target_text')
      .eq('course_code', courseCode)
      .gte('seed_number', 1)
      .lte('seed_number', targetSeeds)
      .order('seed_number');
    if (seedErr) throw seedErr;

    if (!legos || legos.length === 0) {
      return res.status(400).json({ error: 'No LEGOs found for golden seeds' });
    }

    // Build calibration format
    const goldenDecompositions = [];
    const seedMap = new Map();
    for (const s of (seeds || [])) seedMap.set(s.seed_number, s);

    const legosBySeed = {};
    for (const l of legos) {
      if (!legosBySeed[l.seed_number]) legosBySeed[l.seed_number] = [];
      legosBySeed[l.seed_number].push(l);
    }

    for (let n = 1; n <= targetSeeds; n++) {
      const seed = seedMap.get(n);
      const seedLegos = legosBySeed[n];
      if (!seed || !seedLegos) continue;

      goldenDecompositions.push({
        seed_number: n,
        known_text: seed.known_text,
        target_text: seed.target_text,
        legos: seedLegos.map(l => {
          const entry = { type: l.type, known: l.known_text, target: l.target_text };
          if (l.components && l.components.length > 0) entry.components = l.components;
          return entry;
        })
      });
    }

    // Submit to calibration endpoint logic (inline to avoid circular HTTP call)
    const { data: courseData, error: courseErr } = await supabase
      .from('courses')
      .select('quality_rules')
      .eq('course_code', courseCode)
      .single();
    if (courseErr) throw courseErr;

    const existingRules = courseData.quality_rules || {};
    const existingGolden = existingRules.golden_decompositions || [];

    // Merge by seed_number
    const mergedMap = new Map();
    for (const g of existingGolden) mergedMap.set(g.seed_number, g);
    for (const g of goldenDecompositions) mergedMap.set(g.seed_number, g);
    const merged = [...mergedMap.values()].sort((a, b) => a.seed_number - b.seed_number);

    const updatedRules = {
      ...existingRules,
      golden_decompositions: merged,
      golden_seed_count: targetSeeds,
      calibrated_at: new Date().toISOString(),
      calibrated_by: 'golden_builder'
    };

    const { error: updateErr } = await supabase
      .from('courses')
      .update({ quality_rules: updatedRules })
      .eq('course_code', courseCode);
    if (updateErr) throw updateErr;

    // Mark golden build job as complete
    await supabase
      .from('build_jobs')
      .update({ status: 'complete', completed_at: new Date().toISOString() })
      .eq('course_code', courseCode)
      .eq('pass', 'golden')
      .eq('status', 'running');

    console.log(`[GOLDEN] Finalized ${goldenDecompositions.length} golden seeds as calibration for ${courseCode}`);

    res.json({
      success: true,
      course_code: courseCode,
      seeds_finalized: goldenDecompositions.length,
      golden_seed_count: targetSeeds,
      total_legos: legos.length,
      message: `${goldenDecompositions.length} golden seeds saved as calibration data. Course is ready for Pass 2.`
    });
  } catch (err) {
    console.error('[GOLDEN] Error finalizing golden seeds:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// PARALLEL DRAFT ENDPOINTS
// =============================================================================

/**
 * GET /api/course/:code/drafts - List draft status summary
 */
app.get('/api/course/:code/drafts', async (req, res) => {
  try {
    const courseCode = req.params.code;
    const statusFilter = req.query.status; // optional: 'valid', 'collision', 'rework'

    let query = supabase
      .from('course_seed_drafts')
      .select('seed_number, validation_status, validation_notes, created_at, updated_at')
      .eq('course_code', courseCode)
      .order('seed_number');

    if (statusFilter) {
      query = query.eq('validation_status', statusFilter);
    }

    const { data: drafts, error } = await query;
    if (error) throw error;

    const statusCounts = { valid: 0, collision: 0, rework: 0 };
    for (const d of drafts || []) {
      statusCounts[d.validation_status] = (statusCounts[d.validation_status] || 0) + 1;
    }

    res.json({
      course_code: courseCode,
      total_drafts: drafts?.length || 0,
      ...statusCounts,
      drafts: drafts || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/course/:code/finalize - Process all drafts into live tables
 *
 * Steps:
 * 1. Load all drafts in seed order
 * 2. Load baseline LEGOs ONLY from non-drafted seeds (avoids stale dedup matches)
 * 3. Process: dedup (same known+target), detect collisions (same known, diff target)
 * 4. If collisions → report, don't write
 * 5. Clean old LEGOs/phrases for drafted seeds, then write fresh + cleanup drafts
 */
app.post('/api/course/:code/finalize', async (req, res) => {
  try {
    const courseCode = req.params.code;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`FINALIZE: ${courseCode}`);
    console.log(`${'='.repeat(60)}`);

    // =========================================================================
    // STEP 1: Load all drafts in seed order
    // =========================================================================
    const { data: drafts, error: draftErr } = await supabase
      .from('course_seed_drafts')
      .select('*')
      .eq('course_code', courseCode)
      .order('seed_number');

    if (draftErr) throw new Error(`Failed to load drafts: ${draftErr.message}`);

    if (!drafts || drafts.length === 0) {
      return res.status(400).json({
        error: 'No drafts found',
        course_code: courseCode,
        hint: 'Submit seeds with ?draft=true first, then finalize.'
      });
    }
    console.log(`  Drafts loaded: ${drafts.length}`);

    // Build set of seed numbers that have drafts (these will be replaced)
    const draftedSeedNumbers = new Set(drafts.map(d => d.seed_number));

    // =========================================================================
    // STEP 2: Load baseline — existing LEGOs ONLY from seeds without drafts
    //         (Seeds with drafts will be overwritten, so their old LEGOs
    //          must not pollute the baseline or inflate dedup counts)
    // =========================================================================
    const { data: existingLegos, error: legoErr } = await supabase
      .from('course_legos')
      .select('known_text, target_text, seed_number, lego_index, is_new')
      .eq('course_code', courseCode)
      .order('seed_number')
      .order('lego_index');

    if (legoErr) throw new Error(`Failed to load existing LEGOs: ${legoErr.message}`);

    // Build known→target map from existing is_new LEGOs (normalized for ZUT comparison)
    // IMPORTANT: Skip LEGOs from seeds that have drafts — those are stale and will be replaced
    const knownLegoMap = new Map(); // normalizeForZUT(known_text) → { target_text, known_text, seed_number, lego_index }
    for (const lego of existingLegos || []) {
      if (draftedSeedNumbers.has(lego.seed_number)) continue; // Skip — draft will replace this
      const normKey = normalizeForZUT(lego.known_text);
      if (lego.is_new && !knownLegoMap.has(normKey)) {
        knownLegoMap.set(normKey, {
          target_text: lego.target_text,
          known_text: lego.known_text,
          seed_number: lego.seed_number,
          lego_index: lego.lego_index
        });
      }
    }
    console.log(`  Baseline: ${knownLegoMap.size} unique LEGOs from non-drafted seeds`);

    // =========================================================================
    // STEP 3: Process drafts in seed order — dedup + collision detection
    // =========================================================================
    const collisions = [];
    const dedupResults = new Map(); // seed_number → Map<lego_idx, 'new'|'duplicate'>
    const emptySeedNumbers = [];
    let totalDeduplicated = 0;

    for (const draft of drafts) {
      const draftLegos = draft.submission_data?.legos || [];
      const legoStatuses = new Map();
      let newCount = 0;

      for (const lego of draftLegos) {
        const normKey = normalizeForZUT(lego.known);
        const existing = knownLegoMap.get(normKey);

        if (existing) {
          // Same known text exists (ZUT-normalized match)
          // IMPORTANT: Compare targets with normalizeForStorage (preserves diacritics)
          // normalizeForZUT strips diacritics, which would merge genuinely different words:
          // e.g., French "à" (to) vs "a" (has), Italian "è" (is) vs "e" (and)
          const existingTarget = normalizeForStorage(existing.target_text);
          const newTarget = normalizeForStorage(lego.target);

          if (existingTarget === newTarget) {
            // DUPLICATE: Same known + same target → mark for dedup
            legoStatuses.set(lego.idx, 'duplicate');
            totalDeduplicated++;
          } else {
            // COLLISION: Same known + different target
            collisions.push({
              seed_number: draft.seed_number,
              lego_known: lego.known,
              lego_target: lego.target,
              lego_idx: lego.idx,
              conflicts_with: {
                target_text: existing.target_text,
                seed_number: existing.seed_number,
                lego_index: existing.lego_index
              }
            });
            legoStatuses.set(lego.idx, 'collision');
          }
        } else {
          // NEW LEGO: No match found
          legoStatuses.set(lego.idx, 'new');
          knownLegoMap.set(normKey, {
            target_text: lego.target,
            known_text: lego.known,
            seed_number: draft.seed_number,
            lego_index: lego.idx
          });
          newCount++;
        }
      }

      dedupResults.set(draft.seed_number, legoStatuses);

      // Empty seed: all LEGOs are duplicates
      if (newCount === 0 && draftLegos.length > 0 && collisions.filter(c => c.seed_number === draft.seed_number).length === 0) {
        emptySeedNumbers.push(draft.seed_number);
      }
    }

    console.log(`  Dedup: ${totalDeduplicated} duplicate LEGOs`);
    console.log(`  Collisions: ${collisions.length}`);
    console.log(`  Empty seeds: ${emptySeedNumbers.length}`);

    // =========================================================================
    // STEP 4: Collision check — abort if any
    // =========================================================================
    const chinese = isChinese(courseCode);

    if (collisions.length > 0) {
      // Update colliding drafts in DB
      const collidingSeeds = [...new Set(collisions.map(c => c.seed_number))];
      for (const seedNum of collidingSeeds) {
        const seedCollisions = collisions.filter(c => c.seed_number === seedNum);
        await supabase
          .from('course_seed_drafts')
          .update({
            validation_status: 'collision',
            validation_notes: {
              collisions: seedCollisions,
              detected_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('course_code', courseCode)
          .eq('seed_number', seedNum);
      }

      console.log(`✗ FINALIZE ABORTED: ${collisions.length} collision(s) in ${collidingSeeds.length} seed(s)`);

      // Build ready-to-use fix instructions, grouped into batches of ~5 seeds
      const draftMap = new Map(drafts.map(d => [d.seed_number, d]));
      const fixBatches = [];
      for (let i = 0; i < collidingSeeds.length; i += 5) {
        const batchSeeds = collidingSeeds.slice(i, i + 5);

        const seedSections = await Promise.all(batchSeeds.map(async seedNum => {
          const draft = draftMap.get(seedNum);
          const seedCollisions = collisions.filter(c => c.seed_number === seedNum);
          const draftJson = JSON.stringify(draft.submission_data, null, 2);

          // Fetch available vocab for this seed so the coordinator doesn't need to
          const vocabSet = await loadTranslationVocab(courseCode, seedNum);
          const vocabStr = [...vocabSet].sort().join(chinese ? '' : ', ');

          const collisionNotes = seedCollisions.map(c =>
            `- LEGO L${c.lego_idx} "${c.lego_known}" → "${c.lego_target}" COLLIDES with seed ${c.conflicts_with.seed_number} which already has "${c.lego_known}" → "${c.conflicts_with.target_text}"\n  FIX: Merge L${c.lego_idx} with an adjacent LEGO to create a bigger M-LEGO whose English known text is different.`
          ).join('\n');

          return `### Seed ${seedNum}

**Collisions:**
${collisionNotes}

**Available vocab (all words the learner knows by this seed):**
${vocabStr}

**Current draft (your starting point):**
\`\`\`json
${draftJson}
\`\`\``;
        }));

        fixBatches.push({
          seeds: batchSeeds,
          prompt: `You are fixing ZUT collisions for course ${courseCode}.

**IMPORTANT: Everything you need is below — the draft JSON, collision notes, and available vocab for each seed. Do NOT query Supabase, call other endpoints, or search for anything. Just read this data and fix the seeds.**

Each seed below has a LEGO whose English "known" text clashes with another seed's LEGO (same known, different target). The fix is mechanical: merge the colliding LEGO with an adjacent LEGO from the same seed to create a bigger M-LEGO with a different (longer) English known text. Leave all other LEGOs and their phrases exactly as they are.

## The fix in 4 steps
1. Find the colliding LEGO (marked below)
2. Pick an adjacent LEGO from the same seed to merge with — choose whichever makes a natural phrase
3. Replace the two LEGOs with one M-LEGO: known = combined English, target = combined target, components = the two original LEGOs
4. Write BUILD phrases (min 3: merged LEGO + prior vocab, fragments OK) and USE phrases (min 8: complete natural sentences containing the merged LEGO target as exact substring) for the new M-LEGO. The available vocab is listed per seed below — use ONLY these words in phrases.

Re-index the remaining LEGOs so idx values are sequential (1, 2, 3...). Do NOT touch other LEGOs or their phrases.

## Seeds to fix

${seedSections.join('\n\n')}

## Submitting
Submit each fixed seed: curl -s -X POST "http://localhost:3471/api/seed/complete?draft=true" -H "Content-Type: application/json" --data-binary @/tmp/seed{N}.json

## AUTONOMY: You are running unattended. NEVER ask questions. Fix every seed. If rejected, read the error, fix, retry.`
        });
      }

      return res.status(409).json({
        error: 'COLLISIONS_DETECTED',
        message: `${collisions.length} LEGO collision(s) found — cannot finalize until resolved`,
        collisions,
        colliding_seeds: collidingSeeds,
        fix_instructions: fixBatches
      });
    }

    // =========================================================================
    // STEP 5: Clean up old LEGOs/phrases for drafted seeds, then write fresh
    // =========================================================================
    // Delete old LEGOs and phrases for ALL drafted seeds before writing.
    // This prevents orphan LEGOs from prior builds with different decompositions.
    const draftSeedList = [...draftedSeedNumbers];
    if (draftSeedList.length > 0) {
      // Delete phrases first (FK dependency)
      const { error: delPhraseErr } = await supabase
        .from('course_practice_phrases')
        .delete()
        .eq('course_code', courseCode)
        .in('seed_number', draftSeedList);
      if (delPhraseErr) console.warn(`  Warning: phrase cleanup: ${delPhraseErr.message}`);

      const { error: delLegoErr } = await supabase
        .from('course_legos')
        .delete()
        .eq('course_code', courseCode)
        .in('seed_number', draftSeedList);
      if (delLegoErr) console.warn(`  Warning: LEGO cleanup: ${delLegoErr.message}`);

      console.log(`  Cleaned old LEGOs/phrases for ${draftSeedList.length} drafted seeds`);
    }

    let seedsWritten = 0;
    let legosIntroduced = 0;
    let phrasesWritten = 0;

    for (const draft of drafts) {
      const draftLegos = draft.submission_data?.legos || [];
      const legoStatuses = dedupResults.get(draft.seed_number);
      const isEmptySeed = emptySeedNumbers.includes(draft.seed_number);
      const seedId = `S${String(draft.seed_number).padStart(4, '0')}`;

      // 5a. Upsert course_seeds with decomposed_at
      const { error: seedError } = await supabase
        .from('course_seeds')
        .upsert({
          course_code: courseCode,
          seed_number: draft.seed_number,
          known_text: draft.known_text,
          target_text: draft.target_text,
          status: 'released',
          decomposed_at: new Date().toISOString(),
          version: 1
        }, { onConflict: 'course_code,seed_number' });

      if (seedError) throw new Error(`Seed ${draft.seed_number} insert failed: ${seedError.message}`);

      // 5b. Insert LEGOs and phrases
      let seedPhraseCount = 0;
      let skippedDuplicates = 0;

      for (const lego of draftLegos) {
        const legoStatus = legoStatuses?.get(lego.idx) || 'new';
        const isDuplicate = legoStatus === 'duplicate';

        // Upsert LEGO
        const { error: legoError } = await supabase
          .from('course_legos')
          .upsert({
            course_code: courseCode,
            seed_number: draft.seed_number,
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

        if (isDuplicate) {
          skippedDuplicates++;
          continue;
        }

        legosIntroduced++;

        // Generate phrases (same logic as INSERT PHASE in seed/complete)
        let allPhraseRows = [];
        let practiceStartPosition = 1;
        let roleCounts = { component: 0, build: 0, use: 0 };

        // M-TYPE BUILD-UP
        if (lego.type === 'M' && lego.components && lego.components.length > 0) {
          const buildupResult = generateBuildupPhrases(
            { seed: draft.seed_number, idx: lego.idx, known: lego.known, target: lego.target, components: lego.components },
            courseCode
          );
          allPhraseRows = [...buildupResult.buildupPhrases];
          practiceStartPosition = buildupResult.startPosition;
          roleCounts = { ...buildupResult.roleCounts };
        }

        // BUILD/USE format
        if (usesBuildUseFormat(lego)) {
          const buildPhrases = lego.build || [];
          const usePhrases = lego.use || [];

          const buildRows = buildPhrases.map((p, i) => {
            roleCounts.build++;
            return {
              id: makePhraseId(courseCode, draft.seed_number, lego.idx, 'build', roleCounts.build),
              course_code: courseCode,
              seed_number: draft.seed_number,
              lego_index: lego.idx,
              position: practiceStartPosition + i,
              known_text: p.known,
              target_text: p.target,
              word_count: p.target.length,
              lego_count: (p.known.match(/\s+/g) || []).length + 1,
              phrase_role: 'build',
              connected_lego_ids: [],
              lego_position: computeLegoPosition(p.target, lego.target),
              metadata: { format: 'build_use' },
              status: 'draft',
              version: 1
            };
          });

          const useRows = usePhrases.map((p, i) => {
            roleCounts.use++;
            return {
              id: makePhraseId(courseCode, draft.seed_number, lego.idx, 'use', roleCounts.use),
              course_code: courseCode,
              seed_number: draft.seed_number,
              lego_index: lego.idx,
              position: practiceStartPosition + buildPhrases.length + i,
              known_text: p.known,
              target_text: p.target,
              word_count: p.target.length,
              lego_count: (p.known.match(/\s+/g) || []).length + 1,
              phrase_role: 'use',
              connected_lego_ids: [],
              lego_position: computeLegoPosition(p.target, lego.target),
              metadata: {
                format: 'build_use',
                score: p.score,
                scored_at: new Date().toISOString()
              },
              status: 'draft',
              version: 1
            };
          });

          allPhraseRows = [...allPhraseRows, ...buildRows, ...useRows];

        } else if (lego.phrases && lego.phrases.length > 0) {
          // Legacy format
          const buildupNormalized = new Set(allPhraseRows.map(p => normalizePhrase(p.target_text)));
          const seenNormalized = new Set();
          const dedupedPhrases = lego.phrases.filter(p => {
            const norm = normalizePhrase(p.target);
            if (buildupNormalized.has(norm) || seenNormalized.has(norm)) return false;
            seenNormalized.add(norm);
            return true;
          });

          const sorted = [...dedupedPhrases].sort((a, b) => a.target.length - b.target.length);
          const practicePhrases = sorted.map((p, i) => {
            const position = practiceStartPosition + i;
            const role = computePhraseRole(position);
            roleCounts[role] = (roleCounts[role] || 0) + 1;
            return {
              id: makePhraseId(courseCode, draft.seed_number, lego.idx, role, roleCounts[role]),
              course_code: courseCode,
              seed_number: draft.seed_number,
              lego_index: lego.idx,
              position,
              known_text: p.known,
              target_text: p.target,
              word_count: p.target.length,
              lego_count: (p.known.match(/\s+/g) || []).length + 1,
              phrase_role: role,
              connected_lego_ids: [],
              lego_position: computeLegoPosition(p.target, lego.target),
              metadata: p.score ? { score: p.score } : {},
              status: 'draft',
              version: 1
            };
          });

          allPhraseRows = [...allPhraseRows, ...practicePhrases];
        }

        // Insert phrases
        if (allPhraseRows.length > 0) {
          const { error: phraseError } = await supabase
            .from('course_practice_phrases')
            .upsert(allPhraseRows, { onConflict: 'course_code,seed_number,lego_index,position' });

          if (phraseError) throw new Error(`Phrase insert failed: ${phraseError.message}`);
          seedPhraseCount += allPhraseRows.length;
        }
      }

      // 5c. Handle empty seeds (all LEGOs are duplicates)
      if (isEmptySeed) {
        // Get all is_new=true LEGOs from earlier seeds to build word→LEGO map
        const { data: allNewLegos } = await supabase
          .from('course_legos')
          .select('seed_number, lego_index, target_text')
          .eq('course_code', courseCode)
          .eq('is_new', true)
          .lt('seed_number', draft.seed_number)
          .order('seed_number');

        const wordIntroducedBy = {};
        for (const l of (allNewLegos || [])) {
          const words = extractVocab(l.target_text, chinese);
          for (const w of words) {
            if (!wordIntroducedBy[w]) {
              wordIntroducedBy[w] = { seed_number: l.seed_number, lego_index: l.lego_index, target_text: l.target_text };
            }
          }
        }

        const seedWords = extractVocab(draft.target_text, chinese);
        let bestSeedNum = -1;
        let bestLegoIdx = -1;
        let bestLegoTarget = null;

        for (const w of seedWords) {
          const intro = wordIntroducedBy[w];
          if (!intro) continue;
          if (intro.seed_number > bestSeedNum ||
              (intro.seed_number === bestSeedNum && intro.lego_index > bestLegoIdx)) {
            bestSeedNum = intro.seed_number;
            bestLegoIdx = intro.lego_index;
            bestLegoTarget = intro.target_text;
          }
        }

        if (bestSeedNum >= 0) {
          // Find max position and existing USE count for deterministic ID
          const { data: existingPhrases } = await supabase
            .from('course_practice_phrases')
            .select('position, phrase_role')
            .eq('course_code', courseCode)
            .eq('seed_number', bestSeedNum)
            .eq('lego_index', bestLegoIdx);

          const maxPos = existingPhrases?.reduce((max, p) => Math.max(max, p.position), 0) || 0;
          const existingUseCount = existingPhrases?.filter(p => p.phrase_role === 'use').length || 0;

          const { error: seedPhraseError } = await supabase
            .from('course_practice_phrases')
            .insert({
              id: makePhraseId(courseCode, bestSeedNum, bestLegoIdx, 'use', existingUseCount + 1),
              course_code: courseCode,
              seed_number: bestSeedNum,
              lego_index: bestLegoIdx,
              position: maxPos + 1,
              known_text: draft.known_text,
              target_text: draft.target_text,
              word_count: draft.target_text.length,
              lego_count: (draft.known_text.match(/\s+/g) || []).length + 1,
              phrase_role: 'use',
              connected_lego_ids: [],
              lego_position: computeLegoPosition(draft.target_text, bestLegoTarget),
              metadata: {
                format: 'build_use',
                source: 'seed_sentence',
                source_seed: draft.seed_number,
                score: 8
              },
              status: 'draft',
              version: 1
            });

          if (seedPhraseError) {
            console.warn(`  ⚠ Empty seed ${draft.seed_number}: Could not add USE phrase: ${seedPhraseError.message}`);
          } else {
            seedPhraseCount++;
            console.log(`  ✓ Empty seed ${draft.seed_number} → USE phrase for S${String(bestSeedNum).padStart(4,'0')}L${String(bestLegoIdx).padStart(2,'0')}`);
          }
        }
      }

      phrasesWritten += seedPhraseCount;
      seedsWritten++;

      if (seedsWritten % 50 === 0) {
        console.log(`  Progress: ${seedsWritten}/${drafts.length} seeds written`);
      }
    }

    // =========================================================================
    // STEP 6: Cleanup drafts + report
    // =========================================================================
    const { error: deleteError } = await supabase
      .from('course_seed_drafts')
      .delete()
      .eq('course_code', courseCode);

    if (deleteError) {
      console.warn(`  ⚠ Draft cleanup failed: ${deleteError.message}`);
    }

    // Invalidate vocab cache since we just wrote a bunch of LEGOs
    courseVocabCache.delete(courseCode);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✓ FINALIZE COMPLETE: ${courseCode}`);
    console.log(`  Seeds: ${seedsWritten}`);
    console.log(`  LEGOs introduced: ${legosIntroduced}`);
    console.log(`  LEGOs deduplicated: ${totalDeduplicated}`);
    console.log(`  Empty seeds: ${emptySeedNumbers.length}`);
    console.log(`  Phrases: ${phrasesWritten}`);
    console.log(`${'='.repeat(60)}\n`);

    res.json({
      ok: true,
      status: 'FINALIZED',
      course_code: courseCode,
      seeds_written: seedsWritten,
      legos_introduced: legosIntroduced,
      legos_deduplicated: totalDeduplicated,
      empty_seeds: emptySeedNumbers.length,
      empty_seed_numbers: emptySeedNumbers.length > 0 ? emptySeedNumbers : undefined,
      phrases_written: phrasesWritten,
      collisions: 0
    });

  } catch (err) {
    console.error('Finalize error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// V2 PIPELINE: STAGED BUILDING — Decompose → Finalize → Phrases → Validate → QA
// =============================================================================

/**
 * POST /api/v2/decompose — Submit LEGOs only (no phrases) as a draft.
 *
 * Accepts JSON with seed_number, known_text, target_text, and legos array.
 * Validates: canonical seed lookup, tiling, duplicate seed detection.
 * Skips: ZUT (checked globally at finalize), phrase counts, vocab violations.
 * Stores in course_seed_drafts with validation_status: 'decomposed'.
 */
app.post('/api/v2/decompose', async (req, res) => {
  try {
    const body = req.body;
    const courseCode = body.course_code;
    const seedNumber = body.seed_number;

    if (!courseCode || !seedNumber) {
      return res.status(400).json({ error: 'Missing course_code or seed_number' });
    }

    const legos = body.legos || [];
    if (legos.length === 0) {
      return res.status(400).json({ error: 'No LEGOs provided' });
    }

    // 1. Canonical seed lookup
    const { data: canonicalSeed, error: seedErr } = await supabase
      .from('course_seeds')
      .select('seed_number, known_text, target_text')
      .eq('course_code', courseCode)
      .eq('seed_number', seedNumber)
      .single();

    if (seedErr || !canonicalSeed) {
      return res.status(404).json({ error: `Seed ${seedNumber} not found for ${courseCode}` });
    }

    // 2. Translation mismatch protection
    const knownText = body.known_text || canonicalSeed.known_text;
    const targetText = body.target_text || canonicalSeed.target_text;

    if (body.known_text && normalizeForZUT(body.known_text) !== normalizeForZUT(canonicalSeed.known_text)) {
      return res.status(400).json({
        error: `known_text mismatch: submitted "${body.known_text}" but canonical is "${canonicalSeed.known_text}"`
      });
    }
    if (body.target_text && normalizeForZUT(body.target_text) !== normalizeForZUT(canonicalSeed.target_text)) {
      return res.status(400).json({
        error: `target_text mismatch: submitted "${body.target_text}" but canonical is "${canonicalSeed.target_text}"`
      });
    }

    // 3. Duplicate seed check — skip if already fully decomposed
    const { data: existingSeed } = await supabase
      .from('course_seeds')
      .select('decomposed_at')
      .eq('course_code', courseCode)
      .eq('seed_number', seedNumber)
      .single();

    if (existingSeed?.decomposed_at) {
      return res.status(409).json({
        error: `Seed ${seedNumber} already decomposed at ${existingSeed.decomposed_at}`,
        hint: 'Delete existing decomposition first if you want to rebuild.'
      });
    }

    // 4. Tiling check — seed target must be constructable from LEGO targets + prior vocab
    const vocabSet = await loadTranslationVocab(courseCode, seedNumber);
    const tilingLegos = legos.map(l => ({
      target: l.target_text || l.target,
      type: l.type,
      components: l.components
    }));
    const tilingResult = checkTiling(targetText, tilingLegos, courseCode, vocabSet);
    if (!tilingResult.valid) {
      return res.status(400).json({
        error: 'TILING_FAILED',
        message: tilingResult.message,
        untiled: tilingResult.untiled
      });
    }

    // 5. Validate LEGO structure
    for (let i = 0; i < legos.length; i++) {
      const l = legos[i];
      if (!l.type || !['A', 'M'].includes(l.type)) {
        return res.status(400).json({ error: `LEGO ${i + 1}: type must be 'A' or 'M'` });
      }
      const known = l.known_text || l.known;
      const target = l.target_text || l.target;
      if (!known || !target) {
        return res.status(400).json({ error: `LEGO ${i + 1}: missing known or target text` });
      }
      if (l.type === 'M' && (!l.components || l.components.length === 0)) {
        return res.status(400).json({ error: `LEGO ${i + 1}: M-type LEGOs must have components` });
      }
    }

    // 6. Store as draft with validation_status: 'decomposed'
    const submissionData = {
      legos: legos.map((l, i) => ({
        idx: l.idx || i + 1,
        type: l.type,
        known: l.known_text || l.known,
        target: l.target_text || l.target,
        components: l.components || null
      }))
    };

    const { error: draftErr } = await supabase
      .from('course_seed_drafts')
      .upsert({
        course_code: courseCode,
        seed_number: seedNumber,
        known_text: knownText,
        target_text: targetText,
        submission_data: submissionData,
        validation_status: 'decomposed',
        validation_notes: { submitted_at: new Date().toISOString(), lego_count: legos.length },
        updated_at: new Date().toISOString()
      }, { onConflict: 'course_code,seed_number' });

    if (draftErr) throw new Error(`Draft save failed: ${draftErr.message}`);

    console.log(`[V2] Decompose draft saved: ${courseCode} seed ${seedNumber} (${legos.length} LEGOs)`);

    res.json({
      ok: true,
      course_code: courseCode,
      seed_number: seedNumber,
      legos: legos.length,
      status: 'decomposed',
      message: `Draft saved with ${legos.length} LEGOs. Call /api/v2/decompose/finalize/${courseCode} when all drafts are ready.`
    });

  } catch (err) {
    console.error('[V2] Decompose error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v2/decompose/finalize/:courseCode — Finalize decompose drafts.
 *
 * Promotes LEGOs to course_legos WITHOUT generating phrases.
 * Runs global collision detection across all drafts + baseline.
 * On collision (409): returns collision map with fix instructions.
 * On success (200): LEGOs are live, collision-free, ready for phrase generation.
 */
app.post('/api/v2/decompose/finalize/:courseCode', async (req, res) => {
  try {
    const courseCode = req.params.courseCode;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`V2 DECOMPOSE FINALIZE: ${courseCode}`);
    console.log(`${'='.repeat(60)}`);

    // STEP 1: Load all decomposed drafts in seed order
    const { data: drafts, error: draftErr } = await supabase
      .from('course_seed_drafts')
      .select('*')
      .eq('course_code', courseCode)
      .in('validation_status', ['decomposed', 'valid'])
      .order('seed_number');

    if (draftErr) throw new Error(`Failed to load drafts: ${draftErr.message}`);

    if (!drafts || drafts.length === 0) {
      return res.status(400).json({
        error: 'No decompose drafts found',
        course_code: courseCode,
        hint: 'Submit LEGOs with POST /api/v2/decompose first.'
      });
    }
    console.log(`  Drafts loaded: ${drafts.length}`);

    const draftedSeedNumbers = new Set(drafts.map(d => d.seed_number));

    // STEP 2: Load baseline — existing LEGOs ONLY from seeds without drafts
    const { data: existingLegos, error: legoErr } = await supabase
      .from('course_legos')
      .select('known_text, target_text, seed_number, lego_index, is_new')
      .eq('course_code', courseCode)
      .order('seed_number')
      .order('lego_index');

    if (legoErr) throw new Error(`Failed to load existing LEGOs: ${legoErr.message}`);

    const knownLegoMap = new Map();
    for (const lego of existingLegos || []) {
      if (draftedSeedNumbers.has(lego.seed_number)) continue;
      const normKey = normalizeForZUT(lego.known_text);
      if (lego.is_new && !knownLegoMap.has(normKey)) {
        knownLegoMap.set(normKey, {
          target_text: lego.target_text,
          known_text: lego.known_text,
          seed_number: lego.seed_number,
          lego_index: lego.lego_index
        });
      }
    }
    console.log(`  Baseline: ${knownLegoMap.size} unique LEGOs from non-drafted seeds`);

    // STEP 3: Process drafts — dedup + collision detection (same logic as v1 finalize)
    const collisions = [];
    const dedupResults = new Map();
    const emptySeedNumbers = [];
    let totalDeduplicated = 0;

    for (const draft of drafts) {
      const draftLegos = draft.submission_data?.legos || [];
      const legoStatuses = new Map();
      let newCount = 0;

      for (const lego of draftLegos) {
        const normKey = normalizeForZUT(lego.known);
        const existing = knownLegoMap.get(normKey);

        if (existing) {
          const existingTarget = normalizeForStorage(existing.target_text);
          const newTarget = normalizeForStorage(lego.target);

          if (existingTarget === newTarget) {
            legoStatuses.set(lego.idx, 'duplicate');
            totalDeduplicated++;
          } else {
            collisions.push({
              seed_number: draft.seed_number,
              lego_known: lego.known,
              lego_target: lego.target,
              lego_idx: lego.idx,
              conflicts_with: {
                target_text: existing.target_text,
                seed_number: existing.seed_number,
                lego_index: existing.lego_index
              }
            });
            legoStatuses.set(lego.idx, 'collision');
          }
        } else {
          legoStatuses.set(lego.idx, 'new');
          knownLegoMap.set(normKey, {
            target_text: lego.target,
            known_text: lego.known,
            seed_number: draft.seed_number,
            lego_index: lego.idx
          });
          newCount++;
        }
      }

      dedupResults.set(draft.seed_number, legoStatuses);

      if (newCount === 0 && draftLegos.length > 0 && collisions.filter(c => c.seed_number === draft.seed_number).length === 0) {
        emptySeedNumbers.push(draft.seed_number);
      }
    }

    console.log(`  Dedup: ${totalDeduplicated} duplicate LEGOs`);
    console.log(`  Collisions: ${collisions.length}`);
    console.log(`  Empty seeds: ${emptySeedNumbers.length}`);

    // STEP 4: Collision check — abort if any (same 409 format as v1)
    const chinese = isChinese(courseCode);

    if (collisions.length > 0) {
      const collidingSeeds = [...new Set(collisions.map(c => c.seed_number))];
      for (const seedNum of collidingSeeds) {
        const seedCollisions = collisions.filter(c => c.seed_number === seedNum);
        await supabase
          .from('course_seed_drafts')
          .update({
            validation_status: 'collision',
            validation_notes: { collisions: seedCollisions, detected_at: new Date().toISOString() },
            updated_at: new Date().toISOString()
          })
          .eq('course_code', courseCode)
          .eq('seed_number', seedNum);
      }

      console.log(`✗ V2 FINALIZE ABORTED: ${collisions.length} collision(s) in ${collidingSeeds.length} seed(s)`);

      // Build fix instructions (same format as v1)
      const draftMap = new Map(drafts.map(d => [d.seed_number, d]));
      const fixBatches = [];
      for (let i = 0; i < collidingSeeds.length; i += 5) {
        const batchSeeds = collidingSeeds.slice(i, i + 5);

        const seedSections = await Promise.all(batchSeeds.map(async seedNum => {
          const draft = draftMap.get(seedNum);
          const seedCollisions = collisions.filter(c => c.seed_number === seedNum);
          const draftJson = JSON.stringify(draft.submission_data, null, 2);
          const vocabSet = await loadTranslationVocab(courseCode, seedNum);
          const vocabStr = [...vocabSet].sort().join(chinese ? '' : ', ');

          const collisionNotes = seedCollisions.map(c =>
            `- LEGO L${c.lego_idx} "${c.lego_known}" → "${c.lego_target}" COLLIDES with seed ${c.conflicts_with.seed_number} which already has "${c.lego_known}" → "${c.conflicts_with.target_text}"\n  FIX: Merge L${c.lego_idx} with an adjacent LEGO to create a bigger M-LEGO whose English known text is different.`
          ).join('\n');

          return `### Seed ${seedNum}\n\n**Collisions:**\n${collisionNotes}\n\n**Available vocab:**\n${vocabStr}\n\n**Current draft:**\n\`\`\`json\n${draftJson}\n\`\`\``;
        }));

        fixBatches.push({
          seeds: batchSeeds,
          prompt: `Fix ZUT collisions for course ${courseCode}. Merge the colliding LEGO with an adjacent LEGO to create a bigger M-LEGO. Resubmit via POST /api/v2/decompose.\n\n${seedSections.join('\n\n')}`
        });
      }

      return res.status(409).json({
        error: 'COLLISIONS_DETECTED',
        message: `${collisions.length} LEGO collision(s) found — cannot finalize until resolved`,
        collisions,
        colliding_seeds: collidingSeeds,
        fix_instructions: fixBatches
      });
    }

    // STEP 5: Clean up old LEGOs/phrases for drafted seeds, then write LEGOs only (NO phrases)
    const draftSeedList = [...draftedSeedNumbers];
    if (draftSeedList.length > 0) {
      const { error: delPhraseErr } = await supabase
        .from('course_practice_phrases')
        .delete()
        .eq('course_code', courseCode)
        .in('seed_number', draftSeedList);
      if (delPhraseErr) console.warn(`  Warning: phrase cleanup: ${delPhraseErr.message}`);

      const { error: delLegoErr } = await supabase
        .from('course_legos')
        .delete()
        .eq('course_code', courseCode)
        .in('seed_number', draftSeedList);
      if (delLegoErr) console.warn(`  Warning: LEGO cleanup: ${delLegoErr.message}`);

      console.log(`  Cleaned old LEGOs/phrases for ${draftSeedList.length} drafted seeds`);
    }

    let seedsWritten = 0;
    let legosIntroduced = 0;

    for (const draft of drafts) {
      const draftLegos = draft.submission_data?.legos || [];
      const legoStatuses = dedupResults.get(draft.seed_number);
      let skippedDuplicates = 0;

      // 5a. Upsert course_seeds with decomposed_at
      const { error: seedError } = await supabase
        .from('course_seeds')
        .upsert({
          course_code: courseCode,
          seed_number: draft.seed_number,
          known_text: draft.known_text,
          target_text: draft.target_text,
          status: 'released',
          decomposed_at: new Date().toISOString(),
          version: 1
        }, { onConflict: 'course_code,seed_number' });

      if (seedError) throw new Error(`Seed ${draft.seed_number} insert failed: ${seedError.message}`);

      // 5b. Insert LEGOs ONLY (no phrases — that's the v2 phrase stage)
      for (const lego of draftLegos) {
        const legoStatus = legoStatuses?.get(lego.idx) || 'new';
        const isDuplicate = legoStatus === 'duplicate';

        const { error: legoError } = await supabase
          .from('course_legos')
          .upsert({
            course_code: courseCode,
            seed_number: draft.seed_number,
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

        if (isDuplicate) {
          skippedDuplicates++;
        } else {
          legosIntroduced++;
        }
      }

      // 5c. Handle empty seeds — attach seed sentence as USE phrase to highest-indexed introducing LEGO
      if (emptySeedNumbers.includes(draft.seed_number)) {
        const { data: allNewLegos } = await supabase
          .from('course_legos')
          .select('seed_number, lego_index, target_text')
          .eq('course_code', courseCode)
          .eq('is_new', true)
          .lt('seed_number', draft.seed_number)
          .order('seed_number');

        const wordIntroducedBy = {};
        for (const l of (allNewLegos || [])) {
          const words = extractVocab(l.target_text, chinese);
          for (const w of words) {
            if (!wordIntroducedBy[w]) {
              wordIntroducedBy[w] = { seed_number: l.seed_number, lego_index: l.lego_index, target_text: l.target_text };
            }
          }
        }

        const seedWords = extractVocab(draft.target_text, chinese);
        let bestSeedNum = -1, bestLegoIdx = -1, bestLegoTarget = null;

        for (const w of seedWords) {
          const intro = wordIntroducedBy[w];
          if (!intro) continue;
          if (intro.seed_number > bestSeedNum || (intro.seed_number === bestSeedNum && intro.lego_index > bestLegoIdx)) {
            bestSeedNum = intro.seed_number;
            bestLegoIdx = intro.lego_index;
            bestLegoTarget = intro.target_text;
          }
        }

        if (bestSeedNum >= 0) {
          const { data: existingPhrases } = await supabase
            .from('course_practice_phrases')
            .select('position, phrase_role')
            .eq('course_code', courseCode)
            .eq('seed_number', bestSeedNum)
            .eq('lego_index', bestLegoIdx);

          const maxPos = existingPhrases?.reduce((max, p) => Math.max(max, p.position), 0) || 0;
          const existingUseCount = existingPhrases?.filter(p => p.phrase_role === 'use').length || 0;

          await supabase.from('course_practice_phrases').insert({
            id: makePhraseId(courseCode, bestSeedNum, bestLegoIdx, 'use', existingUseCount + 1),
            course_code: courseCode,
            seed_number: bestSeedNum,
            lego_index: bestLegoIdx,
            position: maxPos + 1,
            known_text: draft.known_text,
            target_text: draft.target_text,
            word_count: draft.target_text.length,
            lego_count: (draft.known_text.match(/\s+/g) || []).length + 1,
            phrase_role: 'use',
            connected_lego_ids: [],
            lego_position: computeLegoPosition(draft.target_text, bestLegoTarget),
            metadata: { format: 'build_use', source: 'seed_sentence', source_seed: draft.seed_number, score: 8 },
            status: 'draft',
            version: 1
          });
          console.log(`  ✓ Empty seed ${draft.seed_number} → USE phrase for S${String(bestSeedNum).padStart(4,'0')}L${String(bestLegoIdx).padStart(2,'0')}`);
        }
      }

      seedsWritten++;
      if (seedsWritten % 50 === 0) {
        console.log(`  Progress: ${seedsWritten}/${drafts.length} seeds written`);
      }
    }

    // STEP 6: Cleanup drafts
    const { error: deleteError } = await supabase
      .from('course_seed_drafts')
      .delete()
      .eq('course_code', courseCode);
    if (deleteError) console.warn(`  ⚠ Draft cleanup failed: ${deleteError.message}`);

    // Invalidate vocab cache
    courseVocabCache.delete(courseCode);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✓ V2 DECOMPOSE FINALIZE COMPLETE: ${courseCode}`);
    console.log(`  Seeds: ${seedsWritten}`);
    console.log(`  LEGOs introduced: ${legosIntroduced}`);
    console.log(`  LEGOs deduplicated: ${totalDeduplicated}`);
    console.log(`  Empty seeds: ${emptySeedNumbers.length}`);
    console.log(`  Phrases: 0 (v2 — phrases are a separate stage)`);
    console.log(`${'='.repeat(60)}\n`);

    res.json({
      ok: true,
      status: 'FINALIZED',
      pipeline: 'v2',
      course_code: courseCode,
      seeds_written: seedsWritten,
      legos_introduced: legosIntroduced,
      legos_deduplicated: totalDeduplicated,
      empty_seeds: emptySeedNumbers.length,
      empty_seed_numbers: emptySeedNumbers.length > 0 ? emptySeedNumbers : undefined,
      phrases_written: 0,
      collisions: 0,
      next_step: `POST /api/v2/phrases/${courseCode} — generate phrases for finalized LEGOs`
    });

  } catch (err) {
    console.error('V2 Decompose finalize error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v2/phrases/:courseCode — Submit phrases for LEGOs already in course_legos.
 *
 * Accepts JSON with phrases array. Each entry has seed_number, lego_index, build[], use[].
 * Validates: LEGO exists, phrase counts, vocab violations, containment.
 * Writes directly to course_practice_phrases (LEGOs already finalized, no staging needed).
 */
app.post('/api/v2/phrases/:courseCode', async (req, res) => {
  try {
    const courseCode = req.params.courseCode;
    const { phrases } = req.body;

    if (!phrases || !Array.isArray(phrases) || phrases.length === 0) {
      return res.status(400).json({ error: 'phrases must be a non-empty array' });
    }

    const chinese = isChinese(courseCode);
    const vocabSet = await loadCourseVocab(courseCode);
    const errors = [];
    let totalInserted = 0;

    for (const entry of phrases) {
      const { seed_number, lego_index, build = [], use = [] } = entry;
      const entryLabel = `S${String(seed_number).padStart(4, '0')}L${String(lego_index).padStart(2, '0')}`;

      // 1. Verify LEGO exists in course_legos
      const { data: lego, error: legoErr } = await supabase
        .from('course_legos')
        .select('known_text, target_text, type, components, is_new')
        .eq('course_code', courseCode)
        .eq('seed_number', seed_number)
        .eq('lego_index', lego_index)
        .single();

      if (legoErr || !lego) {
        errors.push({ entry: entryLabel, error: 'LEGO not found in course_legos' });
        continue;
      }

      // Skip duplicate LEGOs (is_new: false) — they don't get their own phrases
      if (!lego.is_new) {
        errors.push({ entry: entryLabel, error: 'LEGO is a duplicate (is_new: false) — skip phrase generation' });
        continue;
      }

      // 2. Check BUILD/USE phrase counts
      const legoForCheck = {
        idx: lego_index,
        type: lego.type,
        known: lego.known_text,
        target: lego.target_text,
        build: build.map(p => ({ known: p.known_text || p.known, target: p.target_text || p.target })),
        use: use.map(p => ({
          known: p.known_text || p.known,
          target: p.target_text || p.target,
          known_score: p.known_score,
          target_score: p.target_score
        }))
      };

      const countCheck = checkBuildUsePhrases(legoForCheck, courseCode, seed_number);
      if (!countCheck.valid) {
        errors.push({ entry: entryLabel, error: `Phrase count: ${countCheck.error}` });
        continue;
      }

      // 3. Check vocab violations
      const allPhrases = [
        ...build.map(p => ({ target: p.target_text || p.target })),
        ...use.map(p => ({ target: p.target_text || p.target }))
      ];
      const vocabViolations = checkVocabViolations(allPhrases, vocabSet, courseCode);
      if (vocabViolations.length > 0) {
        errors.push({
          entry: entryLabel,
          error: `Vocab violations: ${vocabViolations.map(v => `"${v.phrase}" uses unknown: ${v.unknown}`).join('; ')}`
        });
        continue;
      }

      // 4. Check LEGO containment — phrase target must contain LEGO target
      const legoTargetNorm = normalizeForContainment(lego.target_text);
      const containmentFails = allPhrases.filter(p =>
        !normalizeForContainment(p.target).includes(legoTargetNorm)
      );
      if (containmentFails.length > 0) {
        errors.push({
          entry: entryLabel,
          error: `Containment: ${containmentFails.length} phrase(s) don't contain LEGO target "${lego.target_text}"`
        });
        continue;
      }

      // 5. Generate phrase rows — M-LEGO build-up + build + use
      let allPhraseRows = [];
      let practiceStartPosition = 1;
      let roleCounts = { component: 0, build: 0, use: 0 };

      // M-TYPE BUILD-UP (auto-generated)
      if (lego.type === 'M' && lego.components && lego.components.length > 0) {
        const buildupResult = generateBuildupPhrases(
          { seed: seed_number, idx: lego_index, known: lego.known_text, target: lego.target_text, components: lego.components },
          courseCode
        );
        allPhraseRows = [...buildupResult.buildupPhrases];
        practiceStartPosition = buildupResult.startPosition;
        roleCounts = { ...buildupResult.roleCounts };
      }

      // BUILD phrases
      const buildRows = build.map((p, i) => {
        roleCounts.build++;
        return {
          id: makePhraseId(courseCode, seed_number, lego_index, 'build', roleCounts.build),
          course_code: courseCode,
          seed_number: seed_number,
          lego_index: lego_index,
          position: practiceStartPosition + i,
          known_text: p.known_text || p.known,
          target_text: p.target_text || p.target,
          word_count: (p.target_text || p.target).length,
          lego_count: ((p.known_text || p.known).match(/\s+/g) || []).length + 1,
          phrase_role: 'build',
          connected_lego_ids: [],
          lego_position: computeLegoPosition(p.target_text || p.target, lego.target_text),
          metadata: { format: 'build_use', pipeline: 'v2' },
          status: 'draft',
          version: 1
        };
      });

      // USE phrases
      const useRows = use.map((p, i) => {
        roleCounts.use++;
        return {
          id: makePhraseId(courseCode, seed_number, lego_index, 'use', roleCounts.use),
          course_code: courseCode,
          seed_number: seed_number,
          lego_index: lego_index,
          position: practiceStartPosition + build.length + i,
          known_text: p.known_text || p.known,
          target_text: p.target_text || p.target,
          word_count: (p.target_text || p.target).length,
          lego_count: ((p.known_text || p.known).match(/\s+/g) || []).length + 1,
          phrase_role: 'use',
          connected_lego_ids: [],
          lego_position: computeLegoPosition(p.target_text || p.target, lego.target_text),
          metadata: {
            format: 'build_use',
            pipeline: 'v2',
            score: p.score || p.target_score,
            known_score: p.known_score,
            target_score: p.target_score,
            scored_at: new Date().toISOString()
          },
          status: 'draft',
          version: 1
        };
      });

      allPhraseRows = [...allPhraseRows, ...buildRows, ...useRows];

      // 6. Insert phrases
      if (allPhraseRows.length > 0) {
        const { error: phraseError } = await supabase
          .from('course_practice_phrases')
          .upsert(allPhraseRows, { onConflict: 'course_code,seed_number,lego_index,position' });

        if (phraseError) {
          errors.push({ entry: entryLabel, error: `Insert failed: ${phraseError.message}` });
          continue;
        }
        totalInserted += allPhraseRows.length;
      }

      // Update vocab cache
      addToCourseVocab(courseCode, { target: lego.target_text, type: lego.type, components: lego.components });
    }

    console.log(`[V2] Phrases: ${courseCode} — ${totalInserted} phrases inserted, ${errors.length} errors`);

    res.json({
      ok: true,
      course_code: courseCode,
      phrases_inserted: totalInserted,
      entries_processed: phrases.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error('[V2] Phrases error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v2/phrases/progress/:courseCode — Phrase generation progress.
 *
 * Returns count of LEGOs with phrases vs total LEGOs needing phrases.
 */
app.get('/api/v2/phrases/progress/:courseCode', async (req, res) => {
  try {
    const courseCode = req.params.courseCode;

    // Count total is_new LEGOs (these need phrases)
    const { count: totalLegos, error: legoErr } = await supabase
      .from('course_legos')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .eq('is_new', true);

    if (legoErr) throw new Error(legoErr.message);

    // Count LEGOs that have at least one phrase
    const { data: legosWithPhrases, error: phraseErr } = await supabase
      .from('course_practice_phrases')
      .select('seed_number, lego_index')
      .eq('course_code', courseCode);

    if (phraseErr) throw new Error(phraseErr.message);

    const uniqueLegosWithPhrases = new Set(
      (legosWithPhrases || []).map(p => `${p.seed_number}:${p.lego_index}`)
    );

    // Also get is_new LEGOs for cross-reference
    const { data: newLegos } = await supabase
      .from('course_legos')
      .select('seed_number, lego_index')
      .eq('course_code', courseCode)
      .eq('is_new', true);

    const newLegoKeys = new Set((newLegos || []).map(l => `${l.seed_number}:${l.lego_index}`));
    const completedLegos = [...newLegoKeys].filter(k => uniqueLegosWithPhrases.has(k)).length;

    res.json({
      course_code: courseCode,
      total: totalLegos || 0,
      completed: completedLegos,
      remaining: (totalLegos || 0) - completedLegos,
      percent: totalLegos > 0 ? Math.round((completedLegos / totalLegos) * 100) : 0
    });

  } catch (err) {
    console.error('[V2] Phrase progress error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v2/validate/:courseCode — Deterministic validation sweep.
 *
 * No model calls. Checks tiling, containment, phrase counts, vocab violations.
 * Returns pass/fail per seed with details.
 */
app.post('/api/v2/validate/:courseCode', async (req, res) => {
  try {
    const courseCode = req.params.courseCode;
    const chinese = isChinese(courseCode);

    console.log(`[V2] Validate: ${courseCode}`);

    // Load all seeds with decomposed_at
    const { data: seeds, error: seedErr } = await supabase
      .from('course_seeds')
      .select('seed_number, known_text, target_text')
      .eq('course_code', courseCode)
      .not('decomposed_at', 'is', null)
      .order('seed_number');

    if (seedErr) throw new Error(seedErr.message);

    // Load all LEGOs
    const { data: allLegos, error: legoErr } = await supabase
      .from('course_legos')
      .select('seed_number, lego_index, known_text, target_text, type, components, is_new')
      .eq('course_code', courseCode)
      .order('seed_number')
      .order('lego_index');

    if (legoErr) throw new Error(legoErr.message);

    // Load all phrases
    const { data: allPhrases, error: phraseErr } = await supabase
      .from('course_practice_phrases')
      .select('seed_number, lego_index, known_text, target_text, phrase_role')
      .eq('course_code', courseCode);

    if (phraseErr) throw new Error(phraseErr.message);

    // Index LEGOs and phrases by seed
    const legosBySeed = {};
    for (const l of allLegos || []) {
      if (!legosBySeed[l.seed_number]) legosBySeed[l.seed_number] = [];
      legosBySeed[l.seed_number].push(l);
    }

    const phrasesByLegoKey = {};
    for (const p of allPhrases || []) {
      const key = `${p.seed_number}:${p.lego_index}`;
      if (!phrasesByLegoKey[key]) phrasesByLegoKey[key] = [];
      phrasesByLegoKey[key].push(p);
    }

    // Build cumulative vocab as we walk seeds in order
    const cumulativeVocab = new Set();
    // Add elision particles
    if (!chinese) {
      for (const p of ['j', 'l', 'm', 't', 's', 'd', 'n', 'qu', 'c']) {
        cumulativeVocab.add(p);
      }
    }

    const failures = [];
    let seedsPassed = 0;

    for (const seed of seeds || []) {
      const seedLegos = legosBySeed[seed.seed_number] || [];
      const issues = [];

      // 1. Tiling check
      const tilingLegos = seedLegos.map(l => ({ target: l.target_text, type: l.type, components: l.components }));
      const tilingResult = checkTiling(seed.target_text, tilingLegos, courseCode, cumulativeVocab);
      if (!tilingResult.valid) {
        issues.push(`Tiling: ${tilingResult.message}`);
      }

      // Add this seed's vocab to cumulative set
      for (const l of seedLegos) {
        extractVocab(l.target_text, chinese).forEach(v => cumulativeVocab.add(v));
        if (l.type === 'M' && l.components) {
          for (const c of l.components) {
            extractVocab(c.target, chinese).forEach(v => cumulativeVocab.add(v));
          }
        }
      }

      // 2. Per-LEGO checks
      for (const lego of seedLegos) {
        if (!lego.is_new) continue; // Skip duplicates

        const legoKey = `${lego.seed_number}:${lego.lego_index}`;
        const legoPhrases = phrasesByLegoKey[legoKey] || [];
        const legoLabel = `L${lego.lego_index}`;

        // Containment check
        const legoTargetNorm = normalizeForContainment(lego.target_text);
        const buildUsePhrases = legoPhrases.filter(p => p.phrase_role === 'build' || p.phrase_role === 'use');
        const containmentFails = buildUsePhrases.filter(p =>
          !normalizeForContainment(p.target_text).includes(legoTargetNorm)
        );
        if (containmentFails.length > 0) {
          issues.push(`${legoLabel}: ${containmentFails.length} phrase(s) fail containment`);
        }

        // Phrase count check
        const buildPhrases = legoPhrases.filter(p => p.phrase_role === 'build');
        const usePhrases = legoPhrases.filter(p => p.phrase_role === 'use');

        const legoForCheck = {
          idx: lego.lego_index,
          type: lego.type,
          known: lego.known_text,
          target: lego.target_text,
          build: buildPhrases.map(p => ({ known: p.known_text, target: p.target_text })),
          use: usePhrases.map(p => ({ known: p.known_text, target: p.target_text }))
        };
        const countCheck = checkBuildUsePhrases(legoForCheck, courseCode, lego.seed_number);
        if (!countCheck.valid) {
          issues.push(`${legoLabel}: ${countCheck.error}`);
        }

        // Vocab check on phrases
        const phraseTargets = buildUsePhrases.map(p => ({ target: p.target_text }));
        const vocabViolations = checkVocabViolations(phraseTargets, cumulativeVocab, courseCode);
        if (vocabViolations.length > 0) {
          issues.push(`${legoLabel}: vocab violations in ${vocabViolations.length} phrase(s)`);
        }
      }

      if (issues.length > 0) {
        failures.push({ seed: seed.seed_number, issues });
      } else {
        seedsPassed++;
      }
    }

    const valid = failures.length === 0;
    console.log(`[V2] Validate ${courseCode}: ${seedsPassed}/${(seeds || []).length} passed, ${failures.length} failed`);

    res.json({
      valid,
      course_code: courseCode,
      seeds_checked: (seeds || []).length,
      seeds_passed: seedsPassed,
      seeds_failed: failures.length,
      failures: failures.length > 0 ? failures : undefined
    });

  } catch (err) {
    console.error('[V2] Validate error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v2/qa/scan/:courseCode — Spawn Haiku agents to scan phrases.
 *
 * Uses the same QA infrastructure but flags only (no fixing).
 * Lightweight scan with Haiku for cheap volume.
 */
app.post('/api/v2/qa/scan/:courseCode', async (req, res) => {
  try {
    const courseCode = req.params.courseCode;
    const { terminal = 'iTerm2' } = req.body || {};

    const { data: course } = await supabase
      .from('courses')
      .select('course_code, display_name, seed_count, quality_rules')
      .eq('course_code', courseCode)
      .single();

    if (!course) return res.status(404).json({ error: `Course ${courseCode} not found` });

    const { count: uncheckedCount } = await supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .is('qa_checked', null);

    if (!uncheckedCount || uncheckedCount === 0) {
      return res.json({ ok: false, message: 'All phrases already QA checked' });
    }

    const goldenCount = getGoldenSeedCount(course);
    const totalSeeds = course.seed_count || 300;

    // Build batches for Haiku QA agents
    const seedRange = { from: goldenCount + 1, to: totalSeeds };
    const totalToCheck = seedRange.to - seedRange.from + 1;
    const NUM_BATCHES = Math.min(MAX_PARALLEL_AGENTS, Math.ceil(totalToCheck / SEEDS_PER_AGENT));
    const batchSize = Math.ceil(totalToCheck / NUM_BATCHES);

    const batches = [];
    for (let i = 0; i < NUM_BATCHES; i++) {
      const start = seedRange.from + i * batchSize;
      const end = Math.min(start + batchSize - 1, seedRange.to);
      if (start <= seedRange.to) {
        batches.push({ start, end });
      }
    }

    const brief = generateV2QAScanBrief({ courseCode, batches, courseInfo: course });
    const tmpFile = `/tmp/claude_v2_qa_scan_${courseCode}_${Date.now()}.txt`;
    require('fs').writeFileSync(tmpFile, brief);

    const projectDir = __dirname.replace('/services', '');
    const claudeCmd = `cd "${projectDir}" && claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`;
    const effectiveTerminal = SPAWN_MODE === 'headless' ? 'headless' : terminal;

    if (effectiveTerminal === 'headless') {
      const fs = require('fs');
      const logsDir = require('path').join(projectDir, 'logs');
      if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
      const logFile = `${logsDir}/v2-qa-scan-${courseCode}.log`;
      const out = fs.openSync(logFile, 'a');
      const err = fs.openSync(logFile, 'a');
      const agent = spawn('bash', ['-c', claudeCmd], { detached: true, stdio: ['ignore', out, err] });
      agent.unref();
    } else {
      const escapedCmd = claudeCmd.replace(/"/g, '\\"');
      const osascript = `tell application "iTerm"\n  activate\n  set newWindow to (create window with default profile)\n  tell current session of newWindow\n    write text "${escapedCmd}"\n  end tell\nend tell`;
      spawn('osascript', ['-e', osascript], { stdio: 'pipe', detached: true });
    }

    res.json({
      ok: true,
      mode: 'v2_qa_scan',
      course_code: courseCode,
      batches: batches.length,
      unchecked_phrases: uncheckedCount,
      message: `QA scan coordinator spawned — ${batches.length} Haiku sub-agents will scan ${uncheckedCount} phrases`
    });

  } catch (err) {
    console.error('[V2] QA scan error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v2/qa/fix/:courseCode — Spawn Opus agent to repair flagged phrases.
 */
app.post('/api/v2/qa/fix/:courseCode', async (req, res) => {
  try {
    const courseCode = req.params.courseCode;
    const { terminal = 'iTerm2' } = req.body || {};

    const { data: course } = await supabase
      .from('courses')
      .select('course_code, display_name, seed_count, quality_rules')
      .eq('course_code', courseCode)
      .single();

    if (!course) return res.status(404).json({ error: `Course ${courseCode} not found` });

    // Count open flags
    const { count: flagCount } = await supabase
      .from('course_qa_flags')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .eq('status', 'open');

    if (!flagCount || flagCount === 0) {
      return res.json({ ok: false, message: 'No open QA flags to fix' });
    }

    const brief = generateV2QAFixBrief({ courseCode, courseInfo: course });
    const tmpFile = `/tmp/claude_v2_qa_fix_${courseCode}_${Date.now()}.txt`;
    require('fs').writeFileSync(tmpFile, brief);

    const projectDir = __dirname.replace('/services', '');
    const claudeCmd = `cd "${projectDir}" && claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`;
    const effectiveTerminal = SPAWN_MODE === 'headless' ? 'headless' : terminal;

    if (effectiveTerminal === 'headless') {
      const fs = require('fs');
      const logsDir = require('path').join(projectDir, 'logs');
      if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
      const logFile = `${logsDir}/v2-qa-fix-${courseCode}.log`;
      const out = fs.openSync(logFile, 'a');
      const err = fs.openSync(logFile, 'a');
      const agent = spawn('bash', ['-c', claudeCmd], { detached: true, stdio: ['ignore', out, err] });
      agent.unref();
    } else {
      const escapedCmd = claudeCmd.replace(/"/g, '\\"');
      const osascript = `tell application "iTerm"\n  activate\n  set newWindow to (create window with default profile)\n  tell current session of newWindow\n    write text "${escapedCmd}"\n  end tell\nend tell`;
      spawn('osascript', ['-e', osascript], { stdio: 'pipe', detached: true });
    }

    res.json({
      ok: true,
      mode: 'v2_qa_fix',
      course_code: courseCode,
      open_flags: flagCount,
      message: `QA fix agent spawned — Opus will repair ${flagCount} flagged phrases`
    });

  } catch (err) {
    console.error('[V2] QA fix error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v2/build/start/:courseCode — Launch v2 pipeline coordinator.
 *
 * Spawns an Opus coordinator that orchestrates all v2 stages:
 * 1. Decompose (Sonnet sub-agents)
 * 2. Finalize (collision detection)
 * 3. Phrases (Haiku sub-agents)
 * 4. Validate (deterministic)
 * 5. QA (Haiku scan + Opus fix)
 */
app.post('/api/v2/build/start/:courseCode', async (req, res) => {
  try {
    const courseCode = req.params.courseCode;
    const { terminal = 'iTerm2', targetSeeds } = req.body || {};

    const { data: course } = await supabase
      .from('courses')
      .select('course_code, display_name, seed_count, quality_rules')
      .eq('course_code', courseCode)
      .single();

    if (!course) return res.status(404).json({ ok: false, error: `Course ${courseCode} not found` });

    const goldenCount = getGoldenSeedCount(course);
    const effectiveTarget = targetSeeds || course.seed_count || 300;

    // Check build progress
    const progress = await getBuildProgress(courseCode);
    if (progress.completed >= effectiveTarget) {
      return res.json({ ok: false, error: `Target reached (${progress.completed}/${effectiveTarget} seeds)` });
    }

    // Check for existing running build
    const { data: existingJob } = await supabase
      .from('build_jobs')
      .select('id, status')
      .eq('course_code', courseCode)
      .eq('status', 'running')
      .limit(1)
      .maybeSingle();

    if (existingJob) {
      return res.status(409).json({ ok: false, error: 'Build already running — wait or stop it first' });
    }

    // Create build job
    const { data: jobData, error: jobErr } = await supabase
      .from('build_jobs')
      .insert({
        course_code: courseCode,
        pass: 'v2_pipeline',
        status: 'running',
        current_seed: progress.completed,
        seeds_completed: progress.completed,
        total_seeds: effectiveTarget,
        started_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
        requested_by: 'dashboard_v2',
        terminal,
        agent_count: 0,
        respawn_count: 0,
        machine_name: MACHINE_NAME,
        build_mode: 'v2_pipeline'
      })
      .select('id')
      .single();

    if (jobErr) return res.status(500).json({ ok: false, error: `Failed to create build job: ${jobErr.message}` });

    // Generate and spawn v2 coordinator
    const goldenSeedMarkdown = await fetchGoldenSeedExamples(courseCode,
      Array.from({ length: Math.min(5, goldenCount) }, (_, i) => i + 1)
    );

    const brief = generateV2CoordinatorBrief({
      courseCode, course, goldenCount, effectiveTarget, goldenSeedMarkdown
    });

    const tmpFile = `/tmp/claude_v2_coordinator_${courseCode}_${Date.now()}.txt`;
    require('fs').writeFileSync(tmpFile, brief);

    const projectDir = __dirname.replace('/services', '');
    const claudeCmd = `cd "${projectDir}" && claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`;
    const effectiveTerminal = SPAWN_MODE === 'headless' ? 'headless' : terminal;

    if (effectiveTerminal === 'headless') {
      const fs = require('fs');
      const logsDir = require('path').join(projectDir, 'logs');
      if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
      const logFile = `${logsDir}/v2-coordinator-${courseCode}.log`;
      const out = fs.openSync(logFile, 'a');
      const err = fs.openSync(logFile, 'a');
      const agent = spawn('bash', ['-c', claudeCmd], { detached: true, stdio: ['ignore', out, err] });
      agent.unref();
    } else {
      const escapedCmd = claudeCmd.replace(/"/g, '\\"');
      const osascript = `tell application "iTerm"\n  activate\n  set newWindow to (create window with default profile)\n  tell current session of newWindow\n    set name to "V2 Coordinator: ${courseCode}"\n    write text "${escapedCmd}"\n  end tell\nend tell`;
      spawn('osascript', ['-e', osascript], { stdio: 'pipe', detached: true });
    }

    // Update job with agent count
    await supabase.from('build_jobs').update({ agent_count: 1 }).eq('id', jobData.id);

    startBuildManager();

    res.json({
      ok: true,
      course_code: courseCode,
      job_id: jobData.id,
      pipeline: 'v2',
      golden_count: goldenCount,
      target_seeds: effectiveTarget,
      progress,
      message: 'V2 pipeline coordinator spawned — Decompose → Finalize → Phrases → Validate → QA'
    });

  } catch (err) {
    console.error('[V2] Build start error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/v2/build/status/:courseCode — V2 pipeline status.
 *
 * Returns decompose progress, collision count, phrase progress, validation result.
 */
app.get('/api/v2/build/status/:courseCode', async (req, res) => {
  try {
    const courseCode = req.params.courseCode;
    const { data: course } = await supabase
      .from('courses')
      .select('seed_count, quality_rules')
      .eq('course_code', courseCode)
      .single();

    if (!course) return res.status(404).json({ error: `Course ${courseCode} not found` });

    const goldenCount = getGoldenSeedCount(course);
    const totalSeeds = course.seed_count || 300;
    const seedRange = { from: goldenCount + 1, to: totalSeeds };
    const totalInRange = seedRange.to - seedRange.from + 1;

    // Decompose progress: drafts with status 'decomposed' or 'valid'
    const { count: draftCount } = await supabase
      .from('course_seed_drafts')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .in('validation_status', ['decomposed', 'valid']);

    // Collision count
    const { count: collisionCount } = await supabase
      .from('course_seed_drafts')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .eq('validation_status', 'collision');

    // Finalized LEGOs (seeds with decomposed_at in range)
    const { count: finalizedSeeds } = await supabase
      .from('course_seeds')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .not('decomposed_at', 'is', null)
      .gte('seed_number', seedRange.from)
      .lte('seed_number', seedRange.to);

    // Phrase progress
    const { count: totalNewLegos } = await supabase
      .from('course_legos')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .eq('is_new', true)
      .gte('seed_number', seedRange.from);

    const { data: phraseLegos } = await supabase
      .from('course_practice_phrases')
      .select('seed_number, lego_index')
      .eq('course_code', courseCode)
      .gte('seed_number', seedRange.from);

    const uniquePhraseLegos = new Set((phraseLegos || []).map(p => `${p.seed_number}:${p.lego_index}`));

    // Build job status
    const { data: buildJob } = await supabase
      .from('build_jobs')
      .select('id, status, build_mode, started_at')
      .eq('course_code', courseCode)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Determine pipeline phase
    let phase = 'idle';
    if (buildJob?.status === 'running') {
      if ((draftCount || 0) < totalInRange && (finalizedSeeds || 0) < totalInRange) {
        phase = 'decompose';
      } else if ((collisionCount || 0) > 0) {
        phase = 'collisions';
      } else if ((finalizedSeeds || 0) >= totalInRange && uniquePhraseLegos.size < (totalNewLegos || 0)) {
        phase = 'phrases';
      } else if (uniquePhraseLegos.size >= (totalNewLegos || 0)) {
        phase = 'validate';
      }
    } else if ((finalizedSeeds || 0) >= totalInRange && uniquePhraseLegos.size >= (totalNewLegos || 0)) {
      phase = 'complete';
    }

    res.json({
      course_code: courseCode,
      pipeline: 'v2',
      phase,
      active: buildJob?.status === 'running',
      build_mode: buildJob?.build_mode,
      seed_range: seedRange,
      total_seeds_in_range: totalInRange,
      decompose: {
        drafts: draftCount || 0,
        collisions: collisionCount || 0,
        finalized: finalizedSeeds || 0,
        target: totalInRange
      },
      phrases: {
        legos_with_phrases: uniquePhraseLegos.size,
        total_legos: totalNewLegos || 0,
        percent: (totalNewLegos || 0) > 0 ? Math.round((uniquePhraseLegos.size / totalNewLegos) * 100) : 0
      }
    });

  } catch (err) {
    console.error('[V2] Build status error:', err);
    res.status(500).json({ error: err.message });
  }
});


// =============================================================================
// V2 BRIEF GENERATORS
// =============================================================================

/**
 * Generate the v2 decompose brief for Sonnet sub-agents.
 * LEGOs only — no phrase generation.
 */
function generateV2DecomposeBrief({ courseCode, batches, goldenSeedMarkdown, lessons, courseInfo }) {
  const patternsSection = formatDecompositionPatterns(goldenSeedMarkdown || []);
  const goldenCount = getGoldenSeedCount(courseInfo);

  const lessonsSection = lessons && lessons.length > 0
    ? `\n## Lessons from QA\n${lessons.map(l =>
        `- ${l.lesson}${l.example_wrong ? ` (wrong: ${l.example_wrong})` : ''}${l.example_right ? ` (right: ${l.example_right})` : ''}`
      ).join('\n')}`
    : '';

  const seedList = batches.flatMap(b => b.seeds || []);
  const firstSeed = seedList.length > 0 ? seedList[0] : goldenCount + 1;
  const lastSeed = seedList.length > 0 ? seedList[seedList.length - 1] : courseInfo?.seed_count || 300;

  return `# V2 Decompose Coordinator — ${courseCode}

You are the coordinator. Decompose seeds ${firstSeed}-${lastSeed} into LEGOs ONLY (no phrases).

## Architecture
- Spawn sub-agents (~10 seeds each) via Task tool. ALL in a SINGLE message for parallel execution.
- Sub-agents submit LEGOs as drafts: POST http://localhost:3471/api/v2/decompose (JSON)
- Monitor: GET http://localhost:3471/api/course/${courseCode}/drafts (poll every 60s)
- When all drafts in: POST http://localhost:3471/api/v2/decompose/finalize/${courseCode}
- If finalize returns 409 with collisions: fix them yourself (merge colliding LEGOs into bigger M-LEGOs). Resubmit via POST /api/v2/decompose.
- If clean: report success. Phrases are a SEPARATE stage.

## CRITICAL: LEGOs ONLY — No Phrases
You are decomposing seeds into LEGOs ONLY. Do NOT generate BUILD or USE phrases.
Focus entirely on structural decomposition: which words become A-LEGOs, which chunks become M-LEGOs, what order maximises combination richness.

## Sub-Agent Prompt Template

Give each sub-agent this prompt (replace {SEED_LIST} with their seed numbers):

---BEGIN SUB-AGENT PROMPT---
You are decomposing course content for ${courseCode}. Your seeds: {SEED_LIST}

## API
- Seeds: GET http://localhost:3471/api/seeds/${courseCode}
- Vocab: GET http://localhost:3471/api/vocab/${courseCode}?seed=N
- Submit: POST http://localhost:3471/api/v2/decompose (JSON)

## Your Job
Break each seed into LEGOs (teaching chunks). NO PHRASES — just LEGOs.

**A-LEGO** = single word, zero ambiguity.
**M-LEGO** = multi-word bundle. Groups words that would be ambiguous alone. Must have components array.

Submit JSON:
\`\`\`json
{
  "course_code": "${courseCode}",
  "seed_number": N,
  "legos": [
    { "idx": 1, "type": "A", "known_text": "...", "target_text": "..." },
    { "idx": 2, "type": "M", "known_text": "...", "target_text": "...",
      "components": [{ "known": "...", "target": "..." }] }
  ]
}
\`\`\`

## LEGO Decomposition Patterns — Study These
${patternsSection}
${lessonsSection}

If rejected, read the error, fix, retry. Never ask questions.
---END SUB-AGENT PROMPT---

- subagent_type: "general-purpose", model: "sonnet", run_in_background: true

## AUTONOMY
You are running unattended. NEVER ask questions. Fix errors. Respawn failed agents. Keep going until finalize succeeds.
`;
}

/**
 * Generate the v2 collision fix brief for Sonnet agents.
 */
function generateV2CollisionFixBrief({ courseCode, fixInstructions }) {
  return `# V2 Collision Fix — ${courseCode}

Fix ZUT collisions. The finalize response contains the affected seeds, current drafts, and available vocab.

## The fix in 4 steps
1. Find the colliding LEGO (marked in collision notes)
2. Pick an adjacent LEGO to merge with — whichever makes a natural combined phrase
3. Replace the two LEGOs with one M-LEGO: known = combined English, target = combined target, components = the two originals
4. Re-index remaining LEGOs sequentially (1, 2, 3...)
5. Resubmit: POST http://localhost:3471/api/v2/decompose

## Seeds to fix

${fixInstructions.map(batch => batch.prompt).join('\n\n')}

## AUTONOMY: Fix every seed. If rejected, read the error, fix, retry. Never ask questions.`;
}

/**
 * Generate the v2 phrase brief for Haiku sub-agents.
 */
function generateV2PhraseBrief({ courseCode, legoBatches, goldenSeedMarkdown, courseInfo }) {
  const goldenCount = getGoldenSeedCount(courseInfo);

  // Extract golden phrase examples
  const phraseExamples = (goldenSeedMarkdown || []).slice(0, 3).map(seed => {
    const legoExample = seed.legos?.[0];
    if (!legoExample) return '';
    return `Seed ${seed.seed_number}, "${seed.target_text}":
  LEGO: "${legoExample.known}" → "${legoExample.target}"
  BUILD: ${(legoExample.build || []).slice(0, 2).map(p => `"${p.known}" → "${p.target}"`).join(', ')}
  USE: ${(legoExample.use || []).slice(0, 3).map(p => `"${p.known}" → "${p.target}" (score: ${p.score || 7})`).join(', ')}`;
  }).filter(Boolean).join('\n\n');

  return `# V2 Phrase Generator Coordinator — ${courseCode}

You are the coordinator. Generate BUILD and USE phrases for all finalized LEGOs.

## Architecture
- Spawn sub-agents (~10 LEGOs each) via Task tool. ALL in a SINGLE message.
- Sub-agents submit phrases: POST http://localhost:3471/api/v2/phrases/${courseCode}
- Monitor: GET http://localhost:3471/api/v2/phrases/progress/${courseCode} (poll every 60s)
- When all done: POST http://localhost:3471/api/v2/validate/${courseCode}

## Sub-Agent Prompt Template

---BEGIN SUB-AGENT PROMPT---
You are generating phrases for ${courseCode}. Your LEGOs: {LEGO_LIST}

## API
- Vocab: GET http://localhost:3471/api/vocab/${courseCode}?seed=N
- Submit: POST http://localhost:3471/api/v2/phrases/${courseCode} (JSON)

## Your Job
Generate BUILD and USE phrases for each LEGO.

**BUILD** (3+): new LEGO + prior vocabulary. Fragments OK.
**USE** (8+): natural complete sentences. Scored 5-9.

Submit JSON:
\`\`\`json
{
  "phrases": [
    {
      "seed_number": N,
      "lego_index": L,
      "build": [
        { "known": "speak German", "target": "Deutsch sprechen" }
      ],
      "use": [
        { "known": "I want to speak German", "target": "Ich möchte Deutsch sprechen", "known_score": 7, "target_score": 8 }
      ]
    }
  ]
}
\`\`\`

## Golden Phrase Examples
${phraseExamples}

Overgenerate — aim for 5 BUILD and 12 USE per LEGO. The server validates vocabulary, containment, and counts.
If rejected, read the error, fix, retry. Never ask questions.
---END SUB-AGENT PROMPT---

- subagent_type: "general-purpose", model: "haiku", run_in_background: true

## AUTONOMY
You are running unattended. Fix errors. Respawn failed agents. Keep going until validate passes.
`;
}

/**
 * Generate v2 QA scan brief — Haiku agents flag issues.
 */
function generateV2QAScanBrief({ courseCode, batches, courseInfo }) {
  const batchList = batches.map((b, i) =>
    `Batch ${i + 1}: seeds ${b.start}-${b.end}`
  ).join('\n');

  return `# V2 QA Scan Coordinator — ${courseCode}

Spawn sub-agents to scan all phrases for grammar, naturalness, and speakability.
Flag issues — do NOT fix them.

## Batch Assignments
${batchList}

## Sub-Agent Prompt Template

---BEGIN SUB-AGENT PROMPT---
You are scanning phrases for quality issues in ${courseCode}. Your seeds: {SEED_RANGE}

## API
- Fetch phrases: GET http://localhost:3471/api/qa/unchecked/${courseCode}?seed_min={MIN}&seed_max={MAX}&limit=1000
- Flag issues: POST http://localhost:3471/api/qa/bulk-flag
- Mark checked: POST http://localhost:3471/api/qa/mark-checked

## Check each phrase for:
1. **Grammar**: Is the target grammatically correct?
2. **Naturalness**: Would a native speaker actually say this?
3. **LEGO form**: Is the LEGO used in its exact form (no conjugation)?
4. **Speakability**: Can a learner produce this without reading?
5. **Score accuracy**: Does the score match the quality?

Flag format:
\`\`\`json
{
  "flags": [
    {
      "course_code": "${courseCode}",
      "phrase_id": "...",
      "seed_number": N,
      "check_type": "grammar|naturalness|vocabulary",
      "severity": "error|warning",
      "issue": "Description of the problem"
    }
  ]
}
\`\`\`

After checking all phrases, mark them as checked.
---END SUB-AGENT PROMPT---

- subagent_type: "general-purpose", model: "haiku", run_in_background: true

## AUTONOMY
You are running unattended. Fix errors. Respawn failed agents.
`;
}

/**
 * Generate v2 QA fix brief — Opus agent repairs flagged phrases.
 */
function generateV2QAFixBrief({ courseCode, courseInfo }) {
  return `# V2 QA Fix — ${courseCode}

Repair flagged phrases. You are an Opus agent — use your methodology awareness to fix issues properly.

## API
- Get flags: GET http://localhost:3471/api/qa/flags/${courseCode}?status=open
- Get phrase context: GET http://localhost:3471/api/vocab/${courseCode}?seed=N
- Replace phrase: DELETE the old phrase + submit replacement via POST /api/v2/phrases/${courseCode}
- Resolve flag: POST http://localhost:3471/api/qa/flag/{flagId}/resolve

## Strategy
After deleting flagged phrases, if any LEGO has < 4 USE phrases, rebuild the whole seed's phrases.
>= 4 USE is fine — LEGOs get reused in later seeds' phrases (recombination = real spaced repetition).

For each flag:
1. Read the issue description
2. Fetch the LEGO context (seed, vocab)
3. Generate a corrected phrase that preserves LEGO containment and vocabulary constraints
4. Submit the replacement
5. Resolve the flag

## AUTONOMY
You are running unattended. Never ask questions. Fix every flag.
`;
}

/**
 * Generate v2 coordinator brief — orchestrates the full pipeline.
 */
function generateV2CoordinatorBrief({ courseCode, course, goldenCount, effectiveTarget, goldenSeedMarkdown }) {
  const seedRange = `${goldenCount + 1}-${effectiveTarget}`;
  const seedsNeeded = effectiveTarget - goldenCount;

  // Get pattern-diverse golden seed examples for brief
  const patternsSection = formatDecompositionPatterns(goldenSeedMarkdown || []);

  return `# V2 Pipeline Coordinator — ${courseCode}

You orchestrate the full v2 staged pipeline for seeds ${seedRange} (${seedsNeeded} seeds).

## Pipeline Stages

### Stage 1: DECOMPOSE (Sonnet sub-agents)
Spawn ~${Math.ceil(seedsNeeded / SEEDS_PER_AGENT)} Sonnet sub-agents, ~${SEEDS_PER_AGENT} seeds each.
Each submits LEGOs only: POST http://localhost:3471/api/v2/decompose
Monitor: GET http://localhost:3471/api/course/${courseCode}/drafts

### Stage 2: FINALIZE
When all drafts in: POST http://localhost:3471/api/v2/decompose/finalize/${courseCode}
If 409 (collisions): fix them (merge colliding LEGOs into bigger M-LEGOs), resubmit, re-finalize.
Loop until clean (200).

### Stage 3: GENERATE PHRASES (Haiku sub-agents)
Fetch finalized LEGOs: query course_legos where is_new=true and seed_number >= ${goldenCount + 1}
Spawn ~${Math.ceil(seedsNeeded / 5)} Haiku sub-agents, ~10 LEGOs each.
Each submits phrases: POST http://localhost:3471/api/v2/phrases/${courseCode}
Monitor: GET http://localhost:3471/api/v2/phrases/progress/${courseCode}

### Stage 4: VALIDATE
POST http://localhost:3471/api/v2/validate/${courseCode}
If failures: spawn targeted fix agents to repair, then re-validate.

### Stage 5: QA
POST http://localhost:3471/api/v2/qa/scan/${courseCode} — Haiku flags
Wait for scan to complete (poll /api/qa/summary/${courseCode})
If flags > 0: POST http://localhost:3471/api/v2/qa/fix/${courseCode} — Opus repairs

## LEGO Decomposition Patterns
${patternsSection}

## Sub-Agent Instructions

### For DECOMPOSE sub-agents (Sonnet):
\`\`\`
subagent_type: "general-purpose", model: "sonnet", run_in_background: true
\`\`\`
Prompt: Decompose seeds {SEED_LIST} into LEGOs only. POST /api/v2/decompose.
Seeds: GET http://localhost:3471/api/seeds/${courseCode}
Vocab: GET http://localhost:3471/api/vocab/${courseCode}?seed=N

### For PHRASE sub-agents (Haiku):
\`\`\`
subagent_type: "general-purpose", model: "haiku", run_in_background: true
\`\`\`
Prompt: Generate BUILD (3+) and USE (8+) phrases for LEGOs {LEGO_LIST}. POST /api/v2/phrases/${courseCode}.
Vocab: GET http://localhost:3471/api/vocab/${courseCode}?seed=N

## Heartbeat
Ping the build job: POST http://localhost:3471/api/activity/${courseCode}/ping every 5 minutes.

## AUTONOMY
You are running overnight. The human is asleep. NEVER ask questions. Fix errors. Respawn failed agents. Keep going through ALL 5 stages until the course is fully built and QA-clean.
`;
}

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  Course Builder API - Port ${PORT}                            ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  VALIDATION GATES:                                           ║`);
  console.log(`║  1. TILING: Seed target must be tileable from LEGO targets   ║`);
  console.log(`║  2. ZUT: Same known → same target (or reject)                ║`);
  console.log(`║  3. VOCAB: Phrases only use introduced vocabulary            ║`);
  console.log(`║  4. COUNT: Graduated USE: S1=0, S2-3=2, S4-5=3, S6-10=4, S11+=6 ║`);
  console.log(`║  5. TIERS: ${MIN_SHORT_PHRASES}+ SHORT(3-5), ${MIN_MEDIUM_PHRASES}+ MEDIUM(6-9), ${MIN_LONG_PHRASES}+ LONG(10+)   ║`);
  console.log(`║  6. COMPONENTS: M-LEGOs MUST have component breakdown        ║`);
  console.log(`║  7. BALANCE: 3-strike vocab variety (soft→soft→hard reject) ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  AUTO-FEATURES:                                              ║`);
  console.log(`║  • M-LEGO build-up: auto-generates component→LEGO phrases    ║`);
  console.log(`║  • Deduplication: normalized (case/punctuation insensitive)  ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  METHODOLOGY REFERENCE (shown on rejection):                 ║`);
  console.log(`║  • ralph-methodology.md - Complete methodology guide         ║`);
  console.log(`║    - LEGO decomposition, tiling, overlapping LEGOs           ║`);
  console.log(`║    - BUILD (flexible) + USE (min 5) phrase structure         ║`);
  console.log(`║    - Scoring: 5-9 scale, 4 or below = hard reject            ║`);
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
  console.log(`║  CHECKPOINT SYSTEM (QA gates at seeds ${CHECKPOINT_SEEDS.join(', ')}):          ║`);
  console.log(`║  GET  /api/checkpoint/summary/:code - Sample phrases for QA  ║`);
  console.log(`║  POST /api/checkpoint/approve/:code - Approve to continue    ║`);
  console.log(`║  GET  /api/checkpoint/status/:code - Check approval status   ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  PHRASE MONITOR QA (Sonnet QA agent):                         ║`);
  console.log(`║  GET  /api/qa/unchecked/:code - Phrases pending QA check     ║`);
  console.log(`║  POST /api/qa/flag - Insert a QA flag                        ║`);
  console.log(`║  POST /api/qa/mark-checked - Mark phrases as checked         ║`);
  console.log(`║  GET  /api/qa/flags/:code - List all flags                   ║`);
  console.log(`║  GET  /api/qa/summary/:code - QA progress summary            ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  STALL DETECTION: Dashboard polls /api/activity every 60s    ║`);
  console.log(`║  Threshold: ${STALL_THRESHOLD_MS/60000} minutes without submission = STALLED           ║`);
  console.log(`║  On stall: Spawn new agent with /course-resume skill         ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  AUTO-RESPAWN: Enabled - checks every 60s, max ${MAX_AUTO_RESPAWNS} respawns     ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

  // DISABLED: Stall watcher - BUILD MANAGER now handles stall detection from DB
  // startStallWatcher();

  // Start build manager on startup to monitor running jobs from DB
  startBuildManager();
  console.log('[BUILD] Build manager started - monitoring running jobs from DB');
});
