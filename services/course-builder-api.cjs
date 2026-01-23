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
const STALL_THRESHOLD_MS = 3 * 60 * 1000;  // 3 minutes without submission = stalled
const courseActivity = new Map();  // course_code -> { lastSubmission: timestamp, lastSeed: number, status: 'active'|'stalled' }

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

const BATCH_SIZE = 20;  // Seeds per agent (20 for Chinese, safer context margin)
const BUILD_CHECK_INTERVAL_MS = 30000;  // Check progress every 30s

// =============================================================================
// RECENCY TRACKING - Pattern fatigue & vocabulary reinforcement
// =============================================================================
const RECENCY_WINDOW = 50;  // Look at last 50 seeds for pattern analysis
const PATTERN_FATIGUE_THRESHOLD = 5;  // Max times a 3-gram can appear in window
const REINFORCEMENT_ZONE = { min: 20, max: 60 };  // Seeds ago when vocab needs practice

// =============================================================================
// CHECKPOINT SYSTEM - Multiple QA gates during build with drift tracking
// =============================================================================
const CHECKPOINT_SEEDS = [10, 50, 150];  // QA checkpoints at these seeds

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
 */
function getBlockingCheckpoint(courseCode, requestedSeed) {
  const state = initCheckpointState(courseCode);

  for (const checkpointSeed of CHECKPOINT_SEEDS) {
    if (requestedSeed > checkpointSeed) {
      // We're past this checkpoint - is it approved?
      const cp = state.checkpoints[checkpointSeed];
      if (!cp || !cp.approved) {
        return checkpointSeed;  // This checkpoint blocks us
      }
    }
  }
  return null;  // No blocking checkpoint
}

/**
 * Check if checkpoint is required (just completed a checkpoint seed, not yet approved)
 */
function isCheckpointRequired(courseCode, completedSeed) {
  if (!CHECKPOINT_SEEDS.includes(completedSeed)) return false;  // Not a checkpoint seed

  const state = initCheckpointState(courseCode);
  const cp = state.checkpoints[completedSeed];
  if (cp && cp.approved) return false;  // Already approved

  return true;
}

/**
 * Check if course is blocked by checkpoint (past a checkpoint seed, not approved)
 */
function isBlockedByCheckpoint(courseCode, requestedSeed) {
  const blockingCheckpoint = getBlockingCheckpoint(courseCode, requestedSeed);
  return blockingCheckpoint !== null;
}

/**
 * Approve checkpoint for course with QA report (persists to database)
 */
async function approveCheckpoint(courseCode, checkpointSeed, approvedBy = 'human', qaReport = null) {
  // Persist to database (survives restarts)
  const { error } = await supabase
    .from('checkpoint_approvals')
    .upsert({
      course_code: courseCode,
      checkpoint_seed: checkpointSeed,
      approved_by: approvedBy,
      qa_report: qaReport,
      approved_at: new Date().toISOString()
    }, { onConflict: 'course_code,checkpoint_seed' });

  if (error) {
    console.error(`[CHECKPOINT] DB error: ${error.message}`);
  }

  // Also update in-memory cache
  const state = initCheckpointState(courseCode);
  state.checkpoints[checkpointSeed] = {
    approved: true,
    approvedAt: new Date().toISOString(),
    approvedBy,
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

  // Load approvals from database (persisted state)
  try {
    const { data: approvals } = await supabase
      .from('checkpoint_approvals')
      .select('checkpoint_seed, approved_at, approved_by, qa_report')
      .eq('course_code', courseCode);

    // Merge DB state into in-memory cache
    if (approvals) {
      for (const approval of approvals) {
        state.checkpoints[approval.checkpoint_seed] = {
          approved: true,
          approvedAt: approval.approved_at,
          approvedBy: approval.approved_by,
          qa_report: approval.qa_report
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
 * Compute phrase_role from position value (LEGACY - for backward compatibility)
 * @param {number} position - The phrase position (0 = component, 1-7 = practice, 8+ = eternal)
 * @returns {'component' | 'practice' | 'eternal_eligible'}
 * @deprecated Use explicit 'build'/'use' roles from ralph-methodology.md
 */
function computePhraseRole(position) {
  if (position === 0) return 'component';
  if (position >= 8) return 'eternal_eligible';
  return 'practice';
}

/**
 * Validate BUILD/USE phrase structure per ralph-methodology.md
 *
 * BUILD (4 required): Lock in the pattern, fragments OK
 *   - 2 SHORT (3-5 syllables)
 *   - 2 MEDIUM (6-9 syllables)
 *
 * USE (6 required): Natural production, complete sentences
 *   - 3 MEDIUM (6-9 syllables)
 *   - 3 LONG (10+ syllables)
 *   - ALL are eternal-eligible
 *   - Each must have a score (1-9) for quality tracking
 *
 * @param {Object} lego - LEGO with build/use arrays
 * @param {string} courseCode - Course code for language-specific thresholds
 * @param {number} seedNumber - For relaxed requirements on early seeds
 * @returns {{ valid: boolean, error?: string, details?: Object }}
 */
function checkBuildUsePhrases(lego, courseCode, seedNumber) {
  const thresholds = getCharThresholds(courseCode);

  // Relaxed requirements for early seeds (per methodology)
  // Seed 1, LEGO 1: 0-2 BUILD, 0-2 USE
  // Seed 1, LEGO 2+: 2 BUILD, 2 USE
  // Seeds 2-5: 3 BUILD, 4 USE
  // Seeds 6+: Full requirements (4 BUILD, 6 USE)

  const globalPosition = (seedNumber - 1) * 3 + (lego.idx || 1);

  let minBuild = 4;
  let minUse = 6;

  if (seedNumber === 1 && lego.idx === 1) {
    minBuild = 0;
    minUse = 0;
  } else if (seedNumber === 1) {
    minBuild = 2;
    minUse = 2;
  } else if (seedNumber <= 5) {
    minBuild = 3;
    minUse = 4;
  }

  const build = lego.build || [];
  const use = lego.use || [];

  // Count validation
  if (build.length < minBuild) {
    return {
      valid: false,
      error: `BUILD: need ${minBuild}+, got ${build.length}`,
      details: { build: build.length, use: use.length, minBuild, minUse }
    };
  }

  if (use.length < minUse) {
    return {
      valid: false,
      error: `USE: need ${minUse}+, got ${use.length}`,
      details: { build: build.length, use: use.length, minBuild, minUse }
    };
  }

  // USE phrase score validation (1-9 required for each)
  // Score 0 = grammatical error, agent should rewrite not submit
  const missingScores = use.filter(p => typeof p.score !== 'number');
  if (missingScores.length > 0) {
    return {
      valid: false,
      error: `USE phrases must have scores (1-9). Missing scores on ${missingScores.length} phrase(s)`,
      details: { missingScores: missingScores.map(p => p.known?.substring(0, 30)) }
    };
  }

  const invalidScores = use.filter(p => p.score < 1 || p.score > 9);
  if (invalidScores.length > 0) {
    return {
      valid: false,
      error: `USE phrase scores must be 1-9. Score 0 = rewrite, don't submit. Invalid: ${invalidScores.map(p => p.score).join(', ')}`,
      details: { invalidScores: invalidScores.map(p => ({ known: p.known?.substring(0, 30), score: p.score })) }
    };
  }

  // Calculate average score for reporting
  const avgScore = use.length > 0 ? (use.reduce((sum, p) => sum + p.score, 0) / use.length).toFixed(1) : 0;

  // If full requirements, check length tiers
  if (seedNumber >= 6) {
    // BUILD should have SHORT→MEDIUM mix (2 SHORT, 2 MEDIUM)
    const buildShort = build.filter(p => p.target.length <= thresholds.SHORT.max);
    const buildMedium = build.filter(p =>
      p.target.length > thresholds.SHORT.max && p.target.length <= thresholds.MEDIUM.max
    );

    if (buildShort.length < 2) {
      return {
        valid: false,
        error: `BUILD needs 2+ SHORT phrases (≤${thresholds.SHORT.max} chars), got ${buildShort.length}`,
        details: { buildShort: buildShort.length, buildMedium: buildMedium.length }
      };
    }

    if (buildMedium.length < 2) {
      return {
        valid: false,
        error: `BUILD needs 2+ MEDIUM phrases (${thresholds.MEDIUM.min}-${thresholds.MEDIUM.max} chars), got ${buildMedium.length}`,
        details: { buildShort: buildShort.length, buildMedium: buildMedium.length }
      };
    }

    // USE should have MEDIUM→LONG mix (3 MEDIUM, 3 LONG)
    const useMedium = use.filter(p =>
      p.target.length >= thresholds.MEDIUM.min && p.target.length <= thresholds.MEDIUM.max
    );
    const useLong = use.filter(p => p.target.length >= thresholds.LONG.min);

    if (useMedium.length < 3) {
      return {
        valid: false,
        error: `USE needs 3+ MEDIUM phrases (${thresholds.MEDIUM.min}-${thresholds.MEDIUM.max} chars), got ${useMedium.length}`,
        details: { useMedium: useMedium.length, useLong: useLong.length }
      };
    }

    if (useLong.length < 3) {
      return {
        valid: false,
        error: `USE needs 3+ LONG phrases (${thresholds.LONG.min}+ chars), got ${useLong.length}`,
        details: { useMedium: useMedium.length, useLong: useLong.length }
      };
    }
  }

  return { valid: true, details: { build: build.length, use: use.length, avgScore: parseFloat(avgScore) } };
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
async function spawnBuildAgent(courseCode, agentNumber, terminal = 'iTerm2') {
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
  if (agentNumber > 1) {
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
- SHORT to MEDIUM length (3-9 syllables)
- Pattern drilling - not for long-term retention

**USE phrases (6 per LEGO):** Natural production
- COMPLETE SENTENCES ONLY - "I want to speak Chinese with you"
- MEDIUM to LONG (6-15+ syllables)
- ALL go into spaced repetition - learners hear these HUNDREDS of times
- Each needs a quality SCORE (1-9)

---

# COMPLETE EXAMPLE: One LEGO with BUILD + USE

\`\`\`json
{
  "idx": 4,
  "type": "M",
  "known": "with you",
  "target": "和你",
  "components": [
    {"known": "with", "target": "和"},
    {"known": "you", "target": "你"}
  ],
  "build": [
    {"known": "with you", "target": "和你"},
    {"known": "speak with you", "target": "和你说"},
    {"known": "speak Chinese with you", "target": "和你说中文"},
    {"known": "learn Chinese with you", "target": "和你学中文"}
  ],
  "use": [
    {"known": "I want to speak with you", "target": "我想和你说", "score": 7},
    {"known": "I want to speak Chinese with you", "target": "我想和你说中文", "score": 8},
    {"known": "I want to learn Chinese with you", "target": "我想和你学中文", "score": 8},
    {"known": "I want to learn to speak Chinese with you", "target": "我想和你学说中文", "score": 8},
    {"known": "Do you want to speak Chinese with me?", "target": "你想和我说中文吗?", "score": 9},
    {"known": "I want to practice speaking Chinese with you every day", "target": "我想每天和你练习说中文", "score": 8}
  ]
}
\`\`\`

**Notice:** USE phrases combine this LEGO (L4: 和你) with previous LEGOs (L1: 我想, L2: 说, L3: 中文).

---

# SCORING USE PHRASES (1-9)

USE phrases go into eternal spaced repetition. Quality matters enormously.

- **9**: Native-natural in BOTH languages, high pedagogical value, flows beautifully
- **7-8**: Strong phrase, minor stylistic preferences possible
- **5-6**: Functional, correct but unremarkable
- **3-4**: Grammatically OK but awkward/textbook-ish
- **1-2**: Technically correct but low value - no one would say this
- **0**: Grammar error → REWRITE, never submit

---

# API SUBMISSION

## Check your status:
\`\`\`
curl http://localhost:3471/api/resume/${courseCode}
\`\`\`

## Submit each seed:
\`\`\`
POST http://localhost:3471/api/seed/complete
{
  "course_code": "${courseCode}",
  "seed_number": 1,
  "target_text": "你的翻译",
  "legos": [
    {LEGO with idx, type, known, target, components (if M-type), build[], use[]},
    {LEGO 2...},
    ...
  ]
}
\`\`\`

## Error messages tell you exactly what's wrong:
- **VOCAB VIOLATION**: You used a word not yet introduced - remove that phrase
- **NO PHRASES**: You submitted a LEGO without build/use - add them!
- **TILING FAILED**: Seed can't be reconstructed from LEGOs - add missing LEGO

## Checkpoints
After seed 10: STOP and await QA approval before continuing.
After ${BATCH_SIZE} seeds: Output "BATCH COMPLETE"

---

# CRITICAL RULES

1. LEGOs are SMALL (2-4 words) - never whole sentences
2. Each LEGO's phrases use ONLY that LEGO + ALL PREVIOUS vocabulary
3. M-LEGOs MUST have components (real words only, never grammar explanations)
4. BUILD = 4 phrases (fragments OK)
5. USE = 6 phrases (complete sentences, each with score 1-9)
6. Learners will hear USE phrases HUNDREDS of times - quality matters!
7. **TILING**: EVERY character/word in the seed target MUST appear in at least one LEGO target!
   - If tiling fails, you're missing a word/particle - add it to a LEGO!
${lessonsSection}`;

  // Write prompt to temp file to avoid escaping nightmares
  const tmpFile = `/tmp/claude_build_${courseCode}_${agentNumber}_${Date.now()}.txt`;
  require('fs').writeFileSync(tmpFile, prompt);

  // cd to project dir so skills work, then run claude
  const projectDir = __dirname.replace('/services', '');
  const claudeCmd = `cd "${projectDir}" && claude --dangerously-skip-permissions "$(cat ${tmpFile})"`;
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
      console.log(`[BUILD-DEBUG] >>> AGENT SET TO NULL - REASON: osascript error (${err.message})`);
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

      // [BUILD-DEBUG] Log full build state at start of each check
      console.log(`[BUILD-DEBUG] === CHECK ${courseCode} ===`);
      console.log(`[BUILD-DEBUG] Build state: status=${build.status}, agentCount=${build.agentCount}, agent=${build.agent ? 'EXISTS' : 'NULL'}`);
      console.log(`[BUILD-DEBUG] Progress: completed=${progress.completed}, total=${progress.total}, targetSeeds=${build.targetSeeds || progress.total}`);
      console.log(`[BUILD-DEBUG] Batch tracking: batchStartSeed=${build.batchStartSeed}, lastSeenSeed=${build.lastSeenSeed}`);
      console.log(`[BUILD-DEBUG] Timing: lastProgressTime=${new Date(build.lastProgressTime).toISOString()}, elapsed=${Math.round((now - build.lastProgressTime) / 1000)}s`);

      // Course complete? Use build.targetSeeds if set, otherwise progress.total
      const targetSeeds = build.targetSeeds || progress.total;
      const isComplete = progress.completed >= targetSeeds;

      if (isComplete) {
        console.log(`[BUILD] ✓ COMPLETE: ${courseCode} (${progress.completed}/${targetSeeds} seeds)`);
        console.log(`[BUILD]   Total agents used: ${build.agentCount}`);
        if (build.agent && build.agent.pid) {
          try { process.kill(build.agent.pid, 'SIGTERM'); } catch (e) {}
        }
        activeBuilds.delete(courseCode);
        continue;
      }

      // No agent running - spawn one
      if (!build.agent) {
        console.log(`[BUILD] No agent for ${courseCode}, spawning... (previous status: ${build.status})`);
        console.log(`[BUILD]   Progress: ${progress.completed}/${progress.total}, batchStartSeed: ${build.batchStartSeed}, agentCount: ${build.agentCount}`);
        console.log(`[BUILD-DEBUG] >>> SPAWNING NEW AGENT - REASON: build.agent is NULL`);
        console.log(`[BUILD-DEBUG]     Previous status that caused NULL: ${build.status}`);
        console.log(`[BUILD-DEBUG]     Will be agent #${build.agentCount + 1}, resetting batchStartSeed from ${build.batchStartSeed} to ${progress.completed}`);

        build.agentCount++;
        build.batchStartSeed = progress.completed;
        build.batchStartTime = now;
        build.lastSeenSeed = progress.completed;
        build.lastProgressTime = now;
        build.status = 'running';
        build.agent = await spawnBuildAgent(courseCode, build.agentCount, build.terminal);

        // Ping activity to reset stall timer
        recordActivity(courseCode, progress.completed);
        continue;
      }

      // Agent running - check progress
      const seedsThisBatch = progress.completed - build.batchStartSeed;
      const timeSinceProgress = now - build.lastProgressTime;

      // [BUILD-DEBUG] Log batch and stall calculation values
      console.log(`[BUILD-DEBUG] Batch check: seedsThisBatch=${seedsThisBatch} (completed ${progress.completed} - batchStart ${build.batchStartSeed}), BATCH_SIZE=${BATCH_SIZE}, needsNewAgent=${seedsThisBatch >= BATCH_SIZE}`);
      console.log(`[BUILD-DEBUG] Stall check: timeSinceProgress=${Math.round(timeSinceProgress / 1000)}s, STALL_THRESHOLD=${Math.round(STALL_THRESHOLD_MS / 1000)}s, isStalled=${timeSinceProgress > STALL_THRESHOLD_MS}`);

      // Progress made?
      if (progress.completed > build.lastSeenSeed) {
        console.log(`[BUILD] ${courseCode}: ${progress.completed}/${progress.total} (+${progress.completed - build.lastSeenSeed})`);
        build.lastSeenSeed = progress.completed;
        build.lastProgressTime = now;
      }

      // Batch complete? Just log milestone - DON'T spawn new agent yet
      // The current agent will stop itself, then stall detection will spawn the next one
      if (seedsThisBatch >= BATCH_SIZE) {
        console.log(`[BUILD] Batch milestone: ${courseCode} (${seedsThisBatch} seeds this batch)`);
        // Reset batch counter but keep agent reference - wait for stall to confirm agent stopped
        build.batchStartSeed = progress.completed;
        // Don't touch build.agent - let stall detection handle the spawn
      }

      // Stalled? Agent has stopped - DO NOT auto-respawn (burns tokens on clueless agents)
      // Mark as stalled and require manual intervention
      if (timeSinceProgress > STALL_THRESHOLD_MS && build.status !== 'stalled') {
        console.log(`[BUILD] Agent STALLED: ${courseCode} - no progress for ${Math.round(timeSinceProgress / 1000)}s`);
        console.log(`[BUILD]   ⚠️ NOT auto-respawning - manual restart required`);
        console.log(`[BUILD]   Use dashboard or POST /api/build/start/${courseCode} to restart`);

        // Mark as stalled but don't spawn
        build.status = 'stalled';
        build.stalledAt = Date.now();
        // Keep build.agent reference for debugging
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
  if (activeBuilds.has(courseCode)) {
    return { ok: false, error: 'Build already active for this course' };
  }

  const progress = await getBuildProgress(courseCode);

  // Use user-specified target, not total seeds in database
  const effectiveTarget = Math.min(targetSeeds, progress.total);
  if (progress.completed >= effectiveTarget) {
    return { ok: false, error: `Target reached (${progress.completed}/${effectiveTarget} seeds)` };
  }

  activeBuilds.set(courseCode, {
    agent: null,
    agentCount: 0,
    batchStartSeed: progress.completed,
    batchStartTime: Date.now(),
    lastSeenSeed: progress.completed,
    lastProgressTime: Date.now(),
    status: 'starting',
    terminal: terminal,  // Store terminal preference
    targetSeeds: effectiveTarget  // Store target for completion check
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
  let knownTranslations = new Map();
  if (!knownIsEng && !targetIsEng) {
    const { data: translations } = await supabase
      .from('canonical_seed_translations')
      .select('seed_number, translated_text')
      .eq('language_code', knownLang);

    if (translations && translations.length > 0) {
      translations.forEach(t => knownTranslations.set(t.seed_number, t.translated_text));
      console.log(`Found ${translations.length} canonical translations for ${knownLang}`);
    }
  }

  // Create course seeds based on which language is English
  const courseSeeds = canonical.map(c => {
    const canonicalText = c.source_text.replace(/\{target\}/g, targetLangName);
    let knownText = '';
    let targetText = '';

    if (knownIsEng) {
      knownText = canonicalText;
    } else if (targetIsEng) {
      targetText = canonicalText;
    } else if (knownTranslations.has(c.seed_number)) {
      // Use canonical translation for known language
      knownText = knownTranslations.get(c.seed_number).replace(/\{target\}/g, targetLangName);
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

  const mode = knownIsEng ? 'known=eng (instant known_text)' :
               targetIsEng ? 'target=eng (instant target_text)' :
               knownTranslations.size > 0 ? `known=${knownLang} (${knownTranslations.size} from canonical translations)` :
               'neither eng (agent provides both)';
  console.log(`Initialized ${courseCode} with ${courseSeeds.length} seeds [${mode}]`);
  return { initialized: true, count: courseSeeds.length, mode, targetLangName, knownTranslations: knownTranslations.size };
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
      // New coverage columns (January 2026)
      phrase_role: 'component',
      connected_lego_ids: [],  // Components don't connect to other LEGOs
      lego_position: computeLegoPosition(comp.target, comp.target),  // Component is the whole phrase
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
    // New coverage columns (January 2026)
    phrase_role: 'practice',  // LEGO debut is a practice phrase
    connected_lego_ids: [],   // LEGO debut doesn't connect to others
    lego_position: computeLegoPosition(target, target),  // LEGO is the whole phrase
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

// Phrase length tiers in SYLLABLES (language-agnostic target)
// We convert to characters using language-specific ratios
const SYLLABLE_TIERS = {
  SHORT: { min: 3, max: 5 },     // 3-5 syllables: quick recall
  MEDIUM: { min: 6, max: 9 },    // 6-9 syllables: building complexity
  LONG: { min: 10, max: 999 }    // 10+ syllables: full sentences (spaced repetition)
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
📚 See /ssi-decompose-seed for how to break seeds into LEGOs:
   - Every word/character in seed must appear in a LEGO target
   - Order LEGOs SHORT→LONG (by target length)
   - Use M-LEGOs for multi-word chunks`,

  phrases: `
📚 See ralph-methodology.md for phrase requirements:
   BUILD (4 phrases): Lock in the pattern, fragments OK
   - 2 SHORT (3-5 syllables)
   - 2 MEDIUM (6-9 syllables)

   USE (6 phrases): Natural production, complete sentences ONLY
   - 3 MEDIUM (6-9 syllables)
   - 3 LONG (10+ syllables)
   - ALL are eternal-eligible (go into spaced repetition)

   Graduated: relaxed (seeds 1-5), softened (6-20), hard (21+)`,

  build_use: `
📚 See ralph-methodology.md for BUILD/USE phrase structure:
   BUILD phrases (4 required):
   - Lock in the pattern, get the LEGO "in"
   - Fragments OK (don't need complete sentences)
   - 2 SHORT (3-5 syllables) + 2 MEDIUM (6-9 syllables)
   - NOT eternal-eligible

   USE phrases (6 required):
   - Natural production, put the LEGO "out"
   - MUST be complete sentences (subject + verb)
   - 3 MEDIUM (6-9 syllables) + 3 LONG (10+ syllables)
   - ALL eternal-eligible (go into spaced repetition)
   - Each USE phrase MUST have a score (1-9)

   SCORING (1-9) - self-assess each USE phrase:
   9 = grammatically perfect, semantically excellent, high value in both languages
   7-8 = strong phrase, minor stylistic preferences possible
   5-6 = solid, functional, no issues but not remarkable
   3-4 = grammatically OK, but awkward/textbook-ish
   1-2 = grammatically OK, semantically questionable, low value
   0 = grammatical error → REWRITE, don't submit`,

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
   - Components are for DISPLAY only (never practiced as audio)
   - Components help learner see internal structure
   - Long M-LEGOs (4+ chars) need 2+ meaningful components`,

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

        const practicePhrases = sorted.map((p, i) => {
          const position = practiceStartPosition + i;  // Start after build-up
          return {
            course_code,
            seed_number: seed,
            lego_index: idx,
            position,
            known_text: p.known,
            target_text: p.target,
            word_count: p.target.length,
            lego_count: (p.known.match(/\s+/g) || []).length + 1,
            // New coverage columns (January 2026)
            phrase_role: computePhraseRole(position),
            connected_lego_ids: [],  // Populated by backfill for single-LEGO endpoint
            lego_position: computeLegoPosition(p.target, target),
            metadata: {},
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

          const practicePhrases = sorted.map((p, i) => {
            const position = practiceStartPosition + i;
            return {
              course_code,
              seed_number: lego.seed,
              lego_index: lego.idx,
              position,
              known_text: p.known,
              target_text: p.target,
              word_count: p.target.length,
              lego_count: (p.known.match(/\s+/g) || []).length + 1,
              // New coverage columns (January 2026)
              phrase_role: computePhraseRole(position),
              connected_lego_ids: [],  // Populated by backfill for batch endpoint
              lego_position: computeLegoPosition(p.target, lego.target),
              metadata: {},
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

    if (!Array.isArray(legos) || legos.length === 0) {
      return res.status(400).json({
        error: 'legos must be a non-empty array',
        seed: seedId
      });
    }

    // CHECKPOINT GATE: Block seeds past checkpoint until approved
    if (isBlockedByCheckpoint(course_code, seed_number)) {
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

    // Check if seed already fully built (translation + LEGOs)
    // For target-first courses, seeds may have translations but no LEGOs yet
    const hasTranslation = canonicalSeed.known_text && canonicalSeed.known_text.length > 0 &&
                           canonicalSeed.target_text && canonicalSeed.target_text.length > 0;

    if (hasTranslation) {
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
          if (violations.length > 0 && !SKIP_VALIDATION) {
            vocabViolations.push({
              lego_id: legoId,
              violations: violations.slice(0, 3)  // First 3
            });
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
        const legoPosition = globalPosition + lego.idx;

        let minRequired = MIN_PHRASES_PER_LEGO;
        if (legoPosition === 1) minRequired = 0;
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
      } else if (!SKIP_VALIDATION) {
        // NO PHRASES AT ALL - HARD REJECT
        // Agent submitted LEGO with no build[], no use[], and no phrases[]
        errors.push({
          type: 'no_phrases',
          message: `${legoId}: LEGO has NO PHRASES! Must include build[] + use[] arrays (see ralph-methodology.md)`,
          lego_id: legoId,
          hint: 'Each LEGO needs: build (4 phrases) + use (6 phrases with scores 1-9)',
          methodology: METHODOLOGY_HINTS.build_use
        });
        console.log(`✗ ${legoId}: NO PHRASES - LEGO submitted without build/use/phrases arrays`);
      }
    }

    // 5. PHRASE COMPLEXITY VALIDATION (only for legacy format)
    // BUILD/USE format already validates tiers in step 4
    if (!SKIP_VALIDATION) {
      for (const lego of legos) {
        const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
        const isDuplicate = duplicateLegos.some(d => d.lego_id === legoId);
        if (isDuplicate) continue;

        // Skip if using BUILD/USE format (already validated)
        if (usesBuildUseFormat(lego)) continue;

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

      // Generate phrases (with M-LEGO build-up for components)
      let allPhraseRows = [];
      let buildupCount = 0;
      let practiceStartPosition = 1;

      // M-TYPE BUILD-UP (components for display)
      // Components are ALWAYS generated for M-LEGOs, regardless of format
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

      // Check if using new BUILD/USE format (ralph-methodology.md)
      if (usesBuildUseFormat(lego)) {
        // NEW FORMAT: Process BUILD and USE arrays with explicit roles
        const buildPhrases = lego.build || [];
        const usePhrases = lego.use || [];

        // BUILD phrases (role='build', NOT eternal-eligible)
        const buildRows = buildPhrases.map((p, i) => ({
          course_code,
          seed_number,
          lego_index: lego.idx,
          position: practiceStartPosition + i,
          known_text: p.known,
          target_text: p.target,
          word_count: p.target.length,
          lego_count: (p.known.match(/\s+/g) || []).length + 1,
          phrase_role: 'build',  // BUILD phrases - pattern drilling, not eternal
          connected_lego_ids: [],
          lego_position: computeLegoPosition(p.target, lego.target),
          metadata: { format: 'build_use' },
          status: 'draft',
          version: 1
        }));

        // USE phrases (role='use', ALL eternal-eligible, with quality score)
        const useRows = usePhrases.map((p, i) => ({
          course_code,
          seed_number,
          lego_index: lego.idx,
          position: practiceStartPosition + buildPhrases.length + i,
          known_text: p.known,
          target_text: p.target,
          word_count: p.target.length,
          lego_count: (p.known.match(/\s+/g) || []).length + 1,
          phrase_role: 'use',  // USE phrases - eternal eligible, spaced repetition
          connected_lego_ids: [],
          lego_position: computeLegoPosition(p.target, lego.target),
          metadata: {
            format: 'build_use',
            score: p.score,  // Agent self-assessed quality (1-9)
            scored_at: new Date().toISOString()
          },
          status: 'draft',
          version: 1
        }));

        // Calculate average score for logging
        const avgScore = usePhrases.length > 0
          ? (usePhrases.reduce((sum, p) => sum + p.score, 0) / usePhrases.length).toFixed(1)
          : 0;

        allPhraseRows = [...allPhraseRows, ...buildRows, ...useRows];
        console.log(`    BUILD/USE format: ${buildRows.length} build + ${useRows.length} use phrases (avg score: ${avgScore})`);

      } else if (lego.phrases && lego.phrases.length > 0) {
        // LEGACY FORMAT: Process flat phrases array
        // DEDUPLICATION: Filter out agent phrases that duplicate build-up phrases
        const buildupTargets = new Set(allPhraseRows.map(p => p.target_text));
        const dedupedPhrases = lego.phrases.filter(p => !buildupTargets.has(p.target));
        const dedupedCount = lego.phrases.length - dedupedPhrases.length;
        if (dedupedCount > 0) {
          console.log(`    Deduped ${dedupedCount} phrases that duplicated build-up`);
        }

        const sorted = [...dedupedPhrases].sort((a, b) => a.target.length - b.target.length);

        const practicePhrases = sorted.map((p, i) => {
          const position = practiceStartPosition + i;
          return {
            course_code,
            seed_number,
            lego_index: lego.idx,
            position,
            known_text: p.known,
            target_text: p.target,
            word_count: p.target.length,
            lego_count: (p.known.match(/\s+/g) || []).length + 1,
            // Legacy: compute role from position
            phrase_role: computePhraseRole(position),
            connected_lego_ids: [],
            lego_position: computeLegoPosition(p.target, lego.target),
            metadata: {},
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

    // CHECK FOR CHECKPOINT - if seed 10 just completed, require QA review
    if (isCheckpointRequired(course_code, seed_number)) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`CHECKPOINT REACHED: Seed ${seed_number} complete`);
      console.log(`Run QA agent to verify quality before continuing`);
      console.log(`${'='.repeat(60)}\n`);

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
          checkpoint_seed: seed_number,  // The checkpoint we just reached
          checkpoint_number: CHECKPOINT_SEEDS.indexOf(seed_number) + 1,
          all_checkpoints: CHECKPOINT_SEEDS,
          message: 'QA review required before continuing',
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
      status: 'INSERTED',  // Explicit: this seed is DONE
      action: 'PROCEED TO NEXT SEED',  // Clear instruction
      known_text,
      target_text,
      legos: legos.length,
      duplicates_skipped: skippedDuplicates,
      phrases: totalPhrases,
      buildup_phrases: totalBuildupPhrases,

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

      // YOUR NEXT TASK - proceed immediately
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

  // Ratio based on NEW legos only (the meaningful metric)
  const effectiveLegos = newLegos || 0;
  const ratio = effectiveLegos > 0 ? (phrases/effectiveLegos) : 0;
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
    legos: effectiveLegos,       // Now shows NEW legos only (the useful metric)
    legos_total: legos || 0,     // Total including duplicates (for reference)
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

  const agents = getActiveAgents();
  const runningAgents = agents.filter(a => a.status === 'running');

  res.json({
    courses: activity,
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
 * POST /api/build/start/:courseCode - Start a build with batch agent spawning
 *
 * This spawns Claude agents in sequential 30-seed batches.
 * Each agent exits after its batch, and a fresh agent picks up from there.
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

  // Get course info including translation_analysis and seed_count (Two-Pass workflow)
  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, translation_analysis, seed_count')
    .eq('course_code', courseCode)
    .single();

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

  // Get ALL LEGOs for full vocabulary access (essential for phrase generation)
  const { data: allLegos } = await supabase
    .from('course_legos')
    .select('known_text, target_text, type, components')
    .eq('course_code', courseCode)
    .eq('is_new', true)  // Only canonical LEGOs, not re-uses
    .order('seed_number')
    .order('lego_index');

  // Get vocab stats
  const vocabSet = await loadCourseVocab(courseCode);

  // Calculate progress
  const totalSeeds = allSeeds?.length || 0;
  const completedCount = completedSeeds.size;
  const progress = totalSeeds > 0 ? ((completedCount / totalSeeds) * 100).toFixed(1) : 0;

  // Two-Pass workflow: Calculate pass status
  // Pass 1: Translate ALL seeds (regardless of seed_count) + save analysis
  // Pass 2: Decompose up to seed_count (release target)
  const seedCount = courseInfo?.seed_count || 260;  // Release target for decomposition
  const seedsTranslated = allSeeds?.filter(s => s.target_text && s.target_text.trim() !== '').length || 0;
  const seedsDecomposed = completedSeeds.size;
  const analysisSaved = !!courseInfo?.translation_analysis;
  const pass1Complete = seedsTranslated >= totalSeeds && totalSeeds > 0 && analysisSaved;
  const pass2Complete = seedsDecomposed >= seedCount;
  const currentPass = pass1Complete ? 2 : 1;

  // Get recency analysis for pattern/vocab distribution guidance
  const [patternAnalysis, vocabAnalysis] = await Promise.all([
    analyzePatternRecency(courseCode),
    analyzeVocabRecency(courseCode)
  ]);

  res.json({
    course_code: courseCode,
    target_language: targetLangName,

    // Two-Pass Workflow: Translation analysis from Pass 1 (if completed)
    translation_analysis: courseInfo?.translation_analysis || null,

    // Two-Pass Workflow: Pass status for agent to determine current phase
    // Pass 1: Translate ALL seeds + save analysis
    // Pass 2: Decompose up to seed_count (release target)
    pass_status: {
      current_pass: currentPass,
      total_seeds: totalSeeds,           // All seeds available (translate all in Pass 1)
      seed_count: seedCount,             // Release target (decompose up to this in Pass 2)
      seeds_translated: seedsTranslated,
      seeds_decomposed: seedsDecomposed,
      pass1_complete: pass1Complete,
      pass2_complete: pass2Complete,
      analysis_saved: analysisSaved
    },

    // Checkpoint status (QA gate at seed 10)
    checkpoint: await getCheckpointStatus(courseCode),

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
      complete_lego_example: {
        idx: 4,
        type: 'M',
        known: 'with you',
        target: '和你',
        components: [
          { known: 'with', target: '和' },
          { known: 'you', target: '你' }
        ],
        build: [
          { known: 'with you', target: '和你' },
          { known: 'speak with you', target: '和你说' },
          { known: 'learn with you', target: '和你学' },
          { known: 'speak Chinese with you', target: '和你说中文' }
        ],
        use: [
          { known: 'I want to speak with you', target: '我想和你说', score: 7 },
          { known: 'I want to learn Chinese with you', target: '我想和你学中文', score: 8 },
          { known: 'I want to speak Chinese with you', target: '我想和你说中文', score: 8 },
          { known: 'I want to speak Chinese with you now', target: '我现在想和你说中文', score: 8 },
          { known: 'Do you want to speak Chinese with me?', target: '你想和我说中文吗?', score: 9 },
          { known: 'I want to learn to speak Chinese with you', target: '我想和你学说中文', score: 8 }
        ]
      },
      workflow: [
        '1. Decompose next_seed into 3-6 SMALL LEGOs (not whole sentences!)',
        '2. For EACH LEGO: generate BUILD (4) + USE (6) phrases',
        '3. USE phrases must be complete sentences with scores 1-9',
        '4. Phrases can only use THIS LEGO + vocabulary from PREVIOUS LEGOs',
        '5. POST to /api/seed/complete with all legos',
        `6. CHECKPOINTS at seeds ${CHECKPOINT_SEEDS.join(', ')} - stop and await QA`,
        '7. Continue autonomously until done'
      ],
      phrase_requirements: {
        build: '4 phrases: 2 SHORT (3-5 syl) + 2 MEDIUM (6-9 syl), fragments OK',
        use: '6 phrases: 3 MEDIUM + 3 LONG (10+ syl), COMPLETE SENTENCES, scored 1-9'
      },
      scoring: {
        '9': 'Native-natural both languages, high pedagogical value',
        '7-8': 'Strong, minor stylistic preferences',
        '5-6': 'Functional, correct but unremarkable',
        '3-4': 'Awkward/textbook-ish',
        '1-2': 'Low value',
        '0': 'Grammar error - REWRITE'
      },
      rules: [
        'LEGOs are SMALL pieces (2-4 words) - never whole sentences',
        'Phrases use ONLY this LEGO + previous vocabulary',
        'M-LEGOs MUST have components array',
        'Trust API validation errors - they tell you exactly what to fix'
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

  // Get completed seeds count
  const { data: seedData } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', courseCode);

  const completedSeeds = new Set(seedData?.map(r => r.seed_number) || []).size;

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
      seeds_complete: completedSeeds,
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
        'QA agent should independently re-score each phrase (1-9)',
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

  // Approve the checkpoint
  await approveCheckpoint(courseCode, checkpointSeed, approved_by, qa_report);

  // Log QA report if provided
  if (qa_report) {
    console.log(`[CHECKPOINT] QA report for ${courseCode} seed ${checkpointSeed}:`, JSON.stringify(qa_report, null, 2));
  }

  // AUTO-SPAWN FRESH AGENT after checkpoint approval (Ralph loop pattern)
  // Fresh spawn ensures: full methodology prompt + latest build_lessons + no context rot
  const build = activeBuilds.get(courseCode);
  if (build) {
    console.log(`[CHECKPOINT] Spawning fresh agent for ${courseCode} after checkpoint ${checkpointSeed} approval`);

    // Kill existing agent if any
    if (build.agent) {
      try { process.kill(build.agent.pid, 'SIGTERM'); } catch (e) {}
      build.agent = null;
    }

    // Reset for fresh spawn
    build.agentCount++;
    build.status = 'checkpoint_approved';
    build.lastProgressTime = Date.now();

    // Spawn fresh agent with full methodology + lessons
    spawnBuildAgent(courseCode, build.agentCount, build.terminal || 'iTerm2')
      .then(agent => {
        build.agent = agent;
        build.status = 'agent_running';
        console.log(`[CHECKPOINT] Fresh agent #${build.agentCount} spawned for ${courseCode}`);
      })
      .catch(err => {
        console.error(`[CHECKPOINT] Failed to spawn agent: ${err.message}`);
        build.status = 'spawn_failed';
      });
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
    auto_spawn: build ? true : false,
    next_action: build ? 'Fresh agent spawned automatically' : `Start build with POST /api/build/start/${courseCode}`
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
  console.log(`║  CHECKPOINT SYSTEM (QA gates at seeds ${CHECKPOINT_SEEDS.join(', ')}):          ║`);
  console.log(`║  GET  /api/checkpoint/summary/:code - Sample phrases for QA  ║`);
  console.log(`║  POST /api/checkpoint/approve/:code - Approve to continue    ║`);
  console.log(`║  GET  /api/checkpoint/status/:code - Check approval status   ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  STALL DETECTION: Dashboard polls /api/activity every 60s    ║`);
  console.log(`║  Threshold: ${STALL_THRESHOLD_MS/60000} minutes without submission = STALLED           ║`);
  console.log(`║  On stall: Spawn new agent with /course-resume skill         ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);
});
