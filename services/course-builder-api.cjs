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
const BATCH_SIZE = 30;  // Suggest agent exit after this many seeds for fresh context
const courseActivity = new Map();  // course_code -> { lastSubmission: timestamp, lastSeed: number, seedsThisSession: number, sessionStartSeed: number }
const agentHeartbeats = new Map();  // course_code -> { lastHeartbeat: timestamp, agentId: string, status: string }
const HEARTBEAT_TIMEOUT_MS = 3 * 60 * 1000;  // 3 minutes - agent considered dead if no heartbeat

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
      const targetSeeds = job.total_seeds || 260;

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
const CHECKPOINT_SEEDS = [10, 50, 150, 260];  // QA checkpoints at these seeds (260 = final before audio)
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
 * @param {number} position - The phrase position (0 = component, 1-7 = practice, 8+ = use)
 * @returns {'component' | 'practice' | 'use'}
 * BUILD = component + practice (heard once during build-up)
 * USE = position 8+ (spaced repetition, consolidation)
 */
function computePhraseRole(position) {
  if (position === 0) return 'component';
  if (position >= 8) return 'use';
  return 'practice';
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
  // BUILD is flexible (based on LEGO complexity)
  // USE has minimum 5 (full requirements)
  //
  // S1 L1:  0 BUILD, 0 USE  (nothing to combine yet)
  // S1 L2+: 1 BUILD, 0 USE  (limited vocab)
  // S2-3:   1 BUILD, 2 USE  (small vocab pool)
  // S4-5:   1 BUILD, 3 USE  (growing vocab)
  // S6-10:  1 BUILD, 4 USE  (moderate vocab)
  // S11+:   1 BUILD, 5 USE  (full requirements - min 5 USE)

  let minBuild = 1;  // Flexible - just need at least 1
  let minUse = 5;    // Minimum 5 USE phrases
  let minAvgSyllables = 12;  // Average syllables for USE phrases

  if (seedNumber === 1 && lego.idx === 1) {
    minBuild = 0;
    minUse = 0;
    minAvgSyllables = 0;
  } else if (seedNumber === 1) {
    minBuild = 1;
    minUse = 0;  // No USE required - limited vocab
    minAvgSyllables = 0;
  } else if (seedNumber <= 3) {
    minBuild = 1;
    minUse = 2;
    minAvgSyllables = 6;
  } else if (seedNumber <= 5) {
    minBuild = 1;
    minUse = 3;
    minAvgSyllables = 8;
  } else if (seedNumber <= 10) {
    minBuild = 1;
    minUse = 4;
    minAvgSyllables = 10;
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

  // USE phrase score validation - must be 5-9 (quality floor)
  // Scores <5 should be rewritten, not submitted
  const missingScores = use.filter(p => typeof p.score !== 'number');
  if (missingScores.length > 0) {
    return {
      valid: false,
      error: `USE phrases must have scores (5-9). Missing scores on ${missingScores.length} phrase(s)`,
      details: { missingScores: missingScores.map(p => p.known?.substring(0, 30)) }
    };
  }

  const lowScores = use.filter(p => p.score < 5);
  if (lowScores.length > 0) {
    return {
      valid: false,
      error: `USE phrases must score 5-9. Scores <5 should be REWRITTEN, not submitted. Low: ${lowScores.map(p => `"${p.target?.substring(0, 20)}..." (${p.score})`).join(', ')}`,
      hint: 'USE phrases are eternal-eligible. Learners hear them hundreds of times. Only submit quality phrases.',
      details: { lowScores: lowScores.map(p => ({ known: p.known?.substring(0, 30), score: p.score })) }
    };
  }

  const invalidScores = use.filter(p => p.score > 9);
  if (invalidScores.length > 0) {
    return {
      valid: false,
      error: `USE phrase scores must be 5-9. Invalid: ${invalidScores.map(p => p.score).join(', ')}`,
      details: { invalidScores: invalidScores.map(p => ({ known: p.known?.substring(0, 30), score: p.score })) }
    };
  }

  // Calculate average score for reporting
  const avgScore = use.length > 0 ? (use.reduce((sum, p) => sum + p.score, 0) / use.length).toFixed(1) : 0;

  // USE phrases: check average syllable count (ensures substantial sentences)
  // Estimate syllables from character count using language-specific ratio
  if (use.length > 0 && seedNumber >= 2) {
    const totalSyllables = use.reduce((sum, p) => {
      const chars = (p.target || '').length;
      return sum + Math.round(chars / charsPerSyllable);
    }, 0);
    const avgSyllables = totalSyllables / use.length;

    if (avgSyllables < minAvgSyllables) {
      return {
        valid: false,
        error: `USE phrases avg ${avgSyllables.toFixed(1)} syllables, need ${minAvgSyllables}+. Add more substantial sentences.`,
        hint: 'USE phrases should be complete, natural sentences. Short fragments belong in BUILD.',
        details: { avgSyllables: avgSyllables.toFixed(1), minRequired: minAvgSyllables, charsPerSyllable }
      };
    }
  }

  return {
    valid: true,
    details: {
      build: build.length,
      use: use.length,
      avgScore: parseFloat(avgScore),
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

  const totalSeeds = courseData?.seed_count || 260;  // Default to 260 if not set

  const { data: legoData } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', courseCode);

  const completedSeeds = new Set(legoData?.map(r => r.seed_number)).size;

  return {
    completed: completedSeeds,
    total: totalSeeds,
    isComplete: completedSeeds >= totalSeeds
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

# SCORING USE PHRASES (5-9 ONLY)

USE phrases go into eternal spaced repetition. Quality matters enormously.
**Only submit phrases scoring 5-9. Scores <5 = REWRITE, don't submit.**

- **9**: Native-natural in BOTH languages, high pedagogical value, flows beautifully
- **7-8**: Strong phrase, minor stylistic preferences possible
- **5-6**: Functional, correct but unremarkable - MINIMUM for submission
- **<5**: REWRITE THIS. Do NOT submit. Awkward, textbook-ish, or low value phrases hurt learners.

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
4. USE = minimum 5 phrases (LEGO + 5-10 syllables), complete sentences, scored 5-9
5. Learners will hear USE phrases HUNDREDS of times - quality matters!
6. **TILING**: EVERY character/word in the seed target MUST appear in at least one LEGO target!
   - If tiling fails, you're missing a word/particle - add it to a LEGO!
7. **OVERLAPPING LEGOs**: When word order differs, use BOTH atomic AND chunk LEGOs!
   - Example: "blue thing" → "cosa azul" (Spanish reverses order)
   - Create: "blue"→"azul", "thing"→"cosa", AND "blue thing"→"cosa azul"
   - The chunk M-LEGO handles the transformation when words combine
8. See ralph-methodology.md for the complete methodology reference
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
      const targetSeeds = job.total_seeds || 260;
      const lastHeartbeat = job.last_heartbeat ? new Date(job.last_heartbeat).getTime() : 0;
      const heartbeatAge = now - lastHeartbeat;
      const respawnCount = job.respawn_count || 0;
      const agentCount = job.agent_count || 1;
      const batchStartSeed = job.batch_start_seed || 0;

      // [BUILD-DEBUG] Log state from DB
      console.log(`[BUILD-DEBUG] === CHECK ${courseCode} (from DB) ===`);
      console.log(`[BUILD-DEBUG] DB job: id=${job.id}, agentCount=${agentCount}, respawnCount=${respawnCount}`);
      console.log(`[BUILD-DEBUG] Progress: completed=${progress.completed}, target=${targetSeeds}`);
      console.log(`[BUILD-DEBUG] Heartbeat age: ${(heartbeatAge/1000).toFixed(0)}s`);

      // Course complete?
      if (progress.completed >= targetSeeds) {
        console.log(`[BUILD] ✓ COMPLETE: ${courseCode} (${progress.completed}/${targetSeeds} seeds)`);
        await supabase.from('build_jobs').update({
          status: 'complete',
          current_seed: progress.completed,
          seeds_completed: progress.completed,
          completed_at: new Date().toISOString()
        }).eq('id', job.id);
        continue;
      }

      // STUCK DETECTION: Check both heartbeat AND last_progress_at
      // - Heartbeat fresh + progress fresh = agent is working normally
      // - Heartbeat stale = agent is dead
      // - Heartbeat fresh + progress stale = agent is STUCK waiting for input (asking questions)
      const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes without progress = stuck
      const FIRST_SEED_GRACE_MS = 10 * 60 * 1000; // 10 minutes grace for first seed

      // If last_progress_at is null (no seeds submitted yet), use started_at/last_spawn_at as baseline
      // with a longer grace period for the first seed (agent needs time to load context, read instructions)
      let progressAge;
      if (job.last_progress_at) {
        progressAge = now - new Date(job.last_progress_at).getTime();
      } else {
        // No progress yet - use job start time with extended grace period
        const baseline = job.last_spawn_at || job.started_at || job.last_heartbeat;
        const baselineTime = baseline ? new Date(baseline).getTime() : now;
        progressAge = now - baselineTime;
        // For first seed, use longer threshold (agent needs to warm up)
        if (progressAge < FIRST_SEED_GRACE_MS) {
          progressAge = 0; // Not stuck yet, still in grace period
        }
      }

      // Agent alive AND making progress?
      if (heartbeatAge < HEARTBEAT_TIMEOUT_MS && progressAge < STUCK_THRESHOLD_MS) {
        // Agent is alive and working - just update progress if changed
        if (progress.completed > (job.current_seed || 0)) {
          console.log(`[BUILD] ${courseCode}: ${progress.completed}/${targetSeeds} (+${progress.completed - (job.current_seed || 0)})`);
          await supabase.from('build_jobs').update({
            current_seed: progress.completed,
            seeds_completed: progress.completed,
            respawn_count: 0  // Reset respawn count on progress
          }).eq('id', job.id);
        }
        continue;  // Agent alive and working, no spawn needed
      }

      // Determine why we need to respawn
      let respawnReason = '';
      if (heartbeatAge >= HEARTBEAT_TIMEOUT_MS) {
        respawnReason = `Heartbeat stale (${(heartbeatAge/1000).toFixed(0)}s) - agent may be dead`;
      } else if (progressAge >= STUCK_THRESHOLD_MS) {
        respawnReason = `Progress stale (${(progressAge/1000).toFixed(0)}s) but heartbeat alive - agent stuck waiting for input`;
      }

      console.log(`[BUILD] ${courseCode}: ${respawnReason}`);

      // Check respawn limit
      if (respawnCount >= MAX_RESPAWNS) {
        console.log(`[BUILD]   ⚠️ MAX RESPAWNS (${MAX_RESPAWNS}) reached - marking stalled`);
        await supabase.from('build_jobs').update({
          status: 'stalled',
          current_seed: progress.completed
        }).eq('id', job.id);
        continue;
      }

      // SPAWN LOCK: Check last_spawn_at to prevent double-spawn
      // Don't spawn if we spawned within the last 2 minutes
      const lastSpawn = job.last_spawn_at ? new Date(job.last_spawn_at).getTime() : 0;
      const spawnAge = now - lastSpawn;
      const SPAWN_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

      if (spawnAge < SPAWN_COOLDOWN_MS) {
        console.log(`[BUILD]   Spawn cooldown active (${(spawnAge/1000).toFixed(0)}s ago) - waiting`);
        continue;
      }

      // Claim the spawn by updating last_spawn_at FIRST (atomic lock)
      const newAgentCount = agentCount + 1;
      const newRespawnCount = respawnCount + 1;

      const { error: lockError } = await supabase.from('build_jobs').update({
        last_spawn_at: new Date().toISOString(),
        agent_count: newAgentCount,
        respawn_count: newRespawnCount
      }).eq('id', job.id).eq('agent_count', agentCount); // Only update if agent_count hasn't changed

      if (lockError) {
        console.log(`[BUILD]   Could not acquire spawn lock - another spawn in progress`);
        continue;
      }

      console.log(`[BUILD]   🔄 Auto-respawning (attempt ${newRespawnCount}/${MAX_RESPAWNS})...`);

      try {
        const terminal = job.terminal || 'iTerm2';
        await spawnBuildAgent(courseCode, newAgentCount, terminal);
        console.log(`[BUILD]   ✓ Agent #${newAgentCount} spawned for ${courseCode}`);

        // Update heartbeat after successful spawn
        await supabase.from('build_jobs').update({
          last_heartbeat: new Date().toISOString()
        }).eq('id', job.id);
      } catch (spawnErr) {
        console.error(`[BUILD]   ✗ Spawn failed: ${spawnErr.message}`);
        await supabase.from('build_jobs').update({ status: 'stalled' }).eq('id', job.id);
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
          machine_name: MACHINE_NAME
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
    console.log(`[BUILD] Spawning agent #${newAgentCount} for ${courseCode}...`);
    await spawnBuildAgent(courseCode, newAgentCount, terminal);
    console.log(`[BUILD] ✓ Agent #${newAgentCount} spawned for ${courseCode}`);

    // Also spawn Sonnet phrase monitor in second tab (USE phrases only)
    console.log(`[BUILD] Spawning Phrase Monitor (Sonnet) for ${courseCode}...`);
    try {
      const { spawnPhraseMonitor } = require('./shared/spawn-course-builder.cjs');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for builder window
      await spawnPhraseMonitor({ courseCode, terminal: terminal.toLowerCase().includes('iterm') ? 'iterm' : 'terminal' }, 2);
      console.log(`[BUILD] ✓ Phrase Monitor spawned for ${courseCode}`);
    } catch (monitorErr) {
      console.warn(`[BUILD] ⚠ Phrase Monitor spawn failed: ${monitorErr.message}`);
      // Don't fail the whole build - builder is more important
    }

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
    message: `Build started - agent #${newAgentCount} spawned`
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

  return {
    course_code: courseCode,
    active: isActive,
    progress: progress,
    source: isActive ? 'database' : null,
    heartbeat_alive: heartbeatAlive,
    build: isActive ? {
      status: dbJob?.status || 'running',
      agent_count: build?.agentCount || 1,
      current_batch_seeds: progress.completed - (build?.batchStartSeed || 0),
      batch_size: BATCH_SIZE,
      job_id: dbJob?.id || null,
      total_seeds: dbJob?.total_seeds || progress.total  // Job target for UI sync
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
 * Normalize text for vocab comparison
 */
function normalizeText(text, chinese = false) {
  if (!text) return '';
  let normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
    .replace(/[¿¡.,;:!?«»""。，！？、：；""]/g, '')  // Punctuation (preserves apostrophes)
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

    // SCORE VALIDATION: USE phrases (position 8+) must have scores 5-9
    if (phrases && phrases.length > 0 && seed >= 6 && !allowValidationBypass(req.body)) {
      const usePhrases = phrases.filter((p, idx) => idx >= 7);  // position 8+ (0-indexed: 7+)
      const missingScores = usePhrases.filter(p => typeof p.score !== 'number');
      if (missingScores.length > 0) {
        console.log(`✗ ${legoId}: REJECTED - ${missingScores.length} USE phrases missing scores`);
        return res.status(400).json({
          error: 'USE phrases must have scores',
          lego_id: legoId,
          missing_count: missingScores.length,
          hint: 'Add "score": 7 (or 5-9) to each USE phrase (position 8+) for QA tracking'
        });
      }
      const lowScores = usePhrases.filter(p => typeof p.score === 'number' && p.score < 5);
      if (lowScores.length > 0) {
        console.log(`✗ ${legoId}: REJECTED - ${lowScores.length} USE phrases with score < 5`);
        return res.status(400).json({
          error: 'USE phrases scored < 5 should be rewritten',
          lego_id: legoId,
          low_count: lowScores.length,
          hint: 'Rewrite low-scoring phrases. Only submit USE phrases you would score 5+'
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
 * IMPORTANT: known_text comes from the CANONICAL SEEDS already in the database.
 * Agent only provides the target language translation and LEGOs.
 *
 * REQUIRED: Semantic Attestation (January 2026)
 * Agent MUST include attestation.semantic_match_verified: true to confirm
 * that ALL phrase pairs (known_text ↔ target_text) express the SAME meaning.
 * This catches the failure mode where one language gets "padded" with extra content.
 *
 * Body:
 * {
 *   "course_code": "zho_for_eng",
 *   "seed_number": 42,
 *   "target_text": "我想学中文",
 *   "attestation": {
 *     "semantic_match_verified": true
 *   },
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

    // =========================================================================
    // SEMANTIC ATTESTATION GATE (January 2026)
    // Agent must explicitly confirm that all phrase pairs are semantically equivalent.
    // This catches the failure mode where English phrases get "padded" with extra
    // vocabulary that doesn't exist in the known language text.
    // =========================================================================
    const { attestation } = req.body;
    if (!attestation?.semantic_match_verified) {
      return res.status(400).json({
        error: 'SEMANTIC_ATTESTATION_REQUIRED',
        message: 'You must confirm that all phrase pairs are semantically equivalent',
        required: {
          attestation: {
            semantic_match_verified: true
          }
        },
        hint: 'Before submitting, verify that EVERY phrase known_text means EXACTLY the same as its target_text. No additions, no omissions. Add attestation.semantic_match_verified: true to confirm.',
        example: {
          course_code: 'eng_for_jpn',
          seed_number: 42,
          attestation: {
            semantic_match_verified: true
          },
          legos: ['...']
        }
      });
    }

    // AUTO-HEARTBEAT: Update heartbeat on every submission (agents may not send manual heartbeats)
    const now = Date.now();
    agentHeartbeats.set(course_code, {
      lastHeartbeat: now,
      agentId: 'submission',
      status: 'submitting',
      currentSeed: seed_number,
      startedAt: agentHeartbeats.get(course_code)?.startedAt || now
    });

    // CHECKPOINT GATE: Block seeds past checkpoint until approved
    if (await isBlockedByCheckpoint(course_code, seed_number)) {
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

    if (lengthMismatches.length > 0 && !SKIP_VALIDATION && !isLogographic) {
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

        // Validate scores on USE phrases (position 8+ = 'use' role)
        // USE phrases need scores 5-9 for QA drift calculation
        if (!SKIP_VALIDATION && seed_number >= 6) {
          const usePhrases = lego.phrases.filter((p, idx) => idx >= 7);  // position 8+ (0-indexed: 7+)
          const missingScores = usePhrases.filter(p => typeof p.score !== 'number');
          if (missingScores.length > 0) {
            errors.push({
              type: 'missing_scores',
              message: `${legoId}: USE phrases (position 8+) must have scores 5-9. Missing: ${missingScores.length}`,
              lego_id: legoId,
              hint: 'Add "score": 7 (or 5-9) to each USE phrase for QA tracking',
              methodology: 'USE phrases are eternal-eligible and need quality scores for drift analysis'
            });
            console.log(`✗ ${legoId}: MISSING SCORES - ${missingScores.length} USE phrases without scores`);
          }

          // Reject low-quality USE phrases - if agent scores <5, rewrite don't submit
          const lowScores = usePhrases.filter(p => typeof p.score === 'number' && p.score < 5);
          if (lowScores.length > 0) {
            errors.push({
              type: 'low_scores',
              message: `${legoId}: USE phrases scored <5 should be rewritten, not submitted. Found: ${lowScores.length}`,
              lego_id: legoId,
              hint: 'Rewrite low-scoring phrases to improve quality. Only submit USE phrases you\'d score 5+',
              details: lowScores.map(p => ({ known: p.known?.substring(0, 30), score: p.score }))
            });
            console.log(`✗ ${legoId}: LOW SCORES - ${lowScores.length} USE phrases scored <5`);
          }
        }
      } else if (!SKIP_VALIDATION) {
        // NO PHRASES AT ALL - HARD REJECT
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

    // 6. LEGO BALANCE VALIDATION (three-strike escalation)
    // NOTE: M-LEGO component validation removed - methodology now uses overlapping LEGOs instead
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
            score: p.score,  // Agent self-assessed quality (5-9)
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

      // SESSION TRACKING - for batch efficiency
      // In headless mode, never suggest exiting - agent should keep going until done.
      // Stall watcher handles stuck agents; no need for voluntary batch exits.
      session: (() => {
        const activity = courseActivity.get(course_code);
        const seedsThisSession = activity?.seedsThisSession || 1;
        const shouldExit = SPAWN_MODE !== 'headless' && seedsThisSession >= BATCH_SIZE;
        return {
          seeds_this_session: seedsThisSession,
          batch_size: SPAWN_MODE === 'headless' ? null : BATCH_SIZE,
          suggestion: shouldExit ? 'EXIT_FOR_FRESH_CONTEXT' : 'CONTINUE',
          message: shouldExit
            ? `You have completed ${seedsThisSession} seeds. Exit gracefully for fresh context - orchestrator will spawn a new agent.`
            : `${BATCH_SIZE - seedsThisSession} seeds remaining in this batch.`
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
  const totalSeeds = courseData?.seed_count || 260;

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
    total_seeds: totalSeeds,
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
      description: `Break seeds into LEGOs. ${seedsDecomposed}/${seedCount} done.`,
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
      description: `All ${seedCount} seeds translated and decomposed.`
    };
  }

  res.json({
    ACTION: actionInstruction,
    course_code: courseCode,
    target_language: targetLangName,
    translation_analysis: courseInfo?.translation_analysis || null,
    quality_rules: courseInfo?.quality_rules || null,
    checkpoint: await getCheckpointStatus(courseCode),

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
        '2. For EACH LEGO: generate BUILD (flexible) + USE (min 5) phrases',
        '3. USE phrases must be complete sentences with scores 5-9',
        '4. Phrases can only use THIS LEGO + vocabulary from PREVIOUS LEGOs',
        '5. POST to /api/seed/complete with all legos',
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

  // Record activity for stall detection (Pass 1 translations count as progress)
  recordActivity(courseCode, seedNum);

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
      const position = nextPosition++;
      validPhrases.push({
        course_code,
        seed_number,
        lego_index,
        position,
        known_text: known,
        target_text: target,
        word_count: target.length,
        lego_count: (known.match(/\s+/g) || []).length + 1,
        phrase_role: phrase.role || 'practice',  // Allow specifying role, default to practice
        connected_lego_ids: [],
        lego_position: null,  // Will be computed if needed
        metadata: phrase.score ? { score: phrase.score } : {}
      });
    }
  }

  // SCORE VALIDATION: Phrases at position 8+ must have scores
  if (seed_number >= 6) {
    const usePhrases = phrases.filter((p, idx) => (nextPosition - phrases.length + idx) >= 8);
    const missingScores = usePhrases.filter(p => typeof p.score !== 'number');
    if (missingScores.length > 0) {
      return res.status(400).json({
        error: 'USE phrases (position 8+) must have scores 5-9',
        missing_count: missingScores.length,
        hint: 'Add "score": 7 (or 5-9) to each phrase that will be at position 8+'
      });
    }
  }

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
  // phrase_role: 'component'/'practice' = BUILD, 'use' = USE (spaced repetition)
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
    const validTypes = ['grammar', 'semantic', 'naturalness', 'lego_frequency', 'lego_spread', 'variety', 'vocabulary'];
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

    // Get phrase check progress
    const { count: totalPhrases } = await supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode);

    const { count: checkedPhrases } = await supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
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

/**
 * POST /api/qa/spawn-monitor/:courseCode - Spawn Sonnet phrase monitor agent
 */
app.post('/api/qa/spawn-monitor/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { spawnPhraseMonitor } = require('./shared/spawn-course-builder.cjs');

    console.log(`[QA] Spawning phrase monitor for ${courseCode}...`);

    // Spawn in background - don't wait for completion
    spawnPhraseMonitor({ courseCode, terminal: 'iterm' }, 1)
      .then(() => console.log(`[QA] Monitor spawned for ${courseCode}`))
      .catch(err => console.error(`[QA] Monitor spawn failed: ${err.message}`));

    res.json({
      success: true,
      message: `Phrase monitor spawning for ${courseCode}`,
      course_code: courseCode
    });
  } catch (err) {
    console.error('[QA] Error spawning monitor:', err);
    res.status(500).json({ error: err.message });
  }
});

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

    // Delete the phrase
    const { error: phraseError } = await supabase
      .from('course_practice_phrases')
      .delete()
      .eq('id', phraseId);

    if (phraseError) throw phraseError;

    // Also resolve any flags for this phrase
    await supabase
      .from('course_qa_flags')
      .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolution_notes: 'Phrase deleted' })
      .eq('phrase_id', phraseId);

    console.log(`[QA] Deleted phrase ${phraseId}`);

    res.json({ success: true, deleted: phraseId });
  } catch (err) {
    console.error('[QA] Error deleting phrase:', err);
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
