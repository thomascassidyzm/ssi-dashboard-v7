/**
 * Shared context factory for Course Builder modules.
 * All shared state lives here — no module-level globals elsewhere.
 *
 * Usage:
 *   const ctx = createContext(supabase);
 *   // Pass ctx to every module
 */

const os = require('os');

module.exports = function createContext(supabase) {
  return {
    supabase,

    // LRU vocabulary cache: courseCode -> { vocab: Set, lastAccess: number }
    courseVocabCache: new Map(),
    MAX_CACHE_SIZE: 10,
    CACHE_TTL_MS: 30 * 60 * 1000,  // 30 minutes

    // Activity tracking for stall detection
    courseActivity: new Map(),       // courseCode -> { lastSubmission, lastSeed, seedsThisSession, sessionStartSeed, status }
    agentHeartbeats: new Map(),      // courseCode -> { lastHeartbeat, agentId, status }
    activeAgents: new Map(),         // pid -> { courseCode, spawnedAt, submissions, status }

    // Build management
    activeBuilds: new Map(),         // courseCode -> { agent, batchStartSeed, batchStartTime, agentCount, status }

    // Checkpoint system
    checkpointState: new Map(),      // courseCode -> { checkpoints, drift_history, calibration_feedback }
    pendingQAJobs: new Map(),        // courseCode -> { checkpoint_seed, started_at, pid }

    // Stall watcher / respawn
    courseRespawnCounts: new Map(),   // courseCode -> { count, lastRespawn }
    stallWatcherInterval: null,

    // Balance violation tracking (resets on restart)
    balanceViolations: {},           // courseCode -> consecutive_strike_count

    // Fire-and-forget WebSocket event via production-api
    emitPipelineEvent(courseCode, event, data) {
      fetch('http://localhost:3470/api/production/internal/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseCode, event, data })
      }).catch(() => {});
    },

    // Machine identity
    MACHINE_NAME: process.env.MACHINE_NAME || os.hostname(),
    SPAWN_MODE: process.env.SPAWN_MODE || 'iTerm2',
    PROJECT_DIR: process.env.PROJECT_DIR || __dirname.replace('/services/course-builder', ''),

    // Configuration constants
    config: {
      STALL_THRESHOLD_MS: 5 * 60 * 1000,              // 5 minutes = stalled
      BATCH_SIZE: 300,                                  // Full course in one window
      MAX_PARALLEL_AGENTS: parseInt(process.env.MAX_PARALLEL_AGENTS) || 29,
      MAX_CONCURRENT_AGENTS: parseInt(process.env.MAX_CONCURRENT_AGENTS) || 12,
      SEEDS_PER_AGENT: parseInt(process.env.SEEDS_PER_AGENT) || 10,
      HEARTBEAT_TIMEOUT_MS: 3 * 60 * 1000,            // 3 minutes = agent dead
      STALL_WATCHER_INTERVAL_MS: 60000,                // Check every 60 seconds
      MAX_AUTO_RESPAWNS: 5,                            // Max respawns before giving up
      BUILD_CHECK_INTERVAL_MS: 30000,                  // Check progress every 30s
      MAX_RESPAWNS: 3,                                 // Max auto-respawns (build)
      STALL_THRESHOLD_MS_EXTENDED: 10 * 60 * 1000,    // 10 minutes for auto-respawn
      DB_HEARTBEAT_INTERVAL_MS: 30 * 1000,             // DB heartbeat interval

      // Recency tracking
      RECENCY_WINDOW: 50,
      PATTERN_FATIGUE_THRESHOLD: 5,
      REINFORCEMENT_ZONE: { min: 20, max: 60 },

      // Checkpoint system
      CHECKPOINT_SEEDS: [10, 50, 150, 300],
      QA_DRIFT_THRESHOLD: 0.7,

      // Validation gates
      MIN_PHRASES_PER_LEGO: 7,
      MAX_PHRASES_PER_LEGO: 13,
      TARGET_PHRASES_PER_LEGO: 10,
      MIN_BATCH_PHRASE_RATIO: 7.0,
      MIN_SHORT_PHRASES: 2,
      MIN_MEDIUM_PHRASES: 2,
      MIN_LONG_PHRASES: 3,
      MIN_MIDDLE_RANGE: 2,
      BALANCE_UNDERUSED_THRESHOLD: 0.3,
      BALANCE_OVERUSED_THRESHOLD: 1.5,
      BALANCE_MAX_STRIKES: 3,
    },
  };
};
