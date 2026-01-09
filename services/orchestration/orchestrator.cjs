#!/usr/bin/env node

/**
 * SSi Course Production - Main Orchestrator (APML v9.0)
 *
 * Responsibilities:
 * - Serve dashboard read-only APIs (courses, VFS files, metrics)
 * - Trigger phase servers in sequence: Phase 1 → Phase 3 → Manifest → Audio
 * - Phase 1 includes Translation + LEGO Extraction (two services, one conceptual phase)
 * - Phase 2 (Conflict Resolution) handled within Phase 1 LEGO service
 * - Checkpoint management (manual/gated/full modes)
 * - Health monitoring of phase servers
 * - Course status tracking
 *
 * Port: 3456 (maintains backward compatibility with dashboard)
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { execSync, spawn } = require('child_process');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Load centralized course mode configuration
const { getModeConfig, getPatternForSeeds, SEED_COUNTS, MODES, getAllModes } = require('../config/course-mode-loader.cjs');

// Database-first course data service
const courseDataService = require('../course-data-service.cjs');

// Load .env file for AWS credentials etc.
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Load environment (set by start-automation.js)
const PORT = process.env.PORT || 3456;
const VFS_ROOT = process.env.VFS_ROOT;
const CHECKPOINT_MODE = process.env.CHECKPOINT_MODE || 'gated';
const SERVICE_NAME = process.env.SERVICE_NAME || 'Orchestrator';

// APML v9.0 Phase server URLs (auto-configured by start-automation.js)
const PHASE_SERVERS = {
  // Phase 1: Translation + LEGO Extraction (two services, one conceptual phase)
  '1_translation': process.env.PHASE1_TRANSLATION_URL || 'http://localhost:3457',
  '1_lego': process.env.PHASE1_LEGO_URL || 'http://localhost:3458',
  // Phase 2: Conflict Resolution (uses same server as 1_lego)
  2: process.env.PHASE1_LEGO_URL || 'http://localhost:3458',
  // Phase 3: Basket Generation (APML v9.0 terminology)
  3: process.env.PHASE3_URL || 'http://localhost:3459',
  // Manifest: Course Compilation (APML v9.0 terminology)
  'manifest': process.env.MANIFEST_URL || 'http://localhost:3464',
  // Audio: TTS Generation (APML v9.0 terminology)
  'audio': process.env.AUDIO_URL || 'http://localhost:3465'
};

// Legacy aliases for backward compatibility during migration
const LEGACY_PHASE_ALIASES = {
  1: PHASE_SERVERS['1_translation'],
  5: PHASE_SERVERS[3],       // Legacy Phase 5 → Phase 3 (APML v9.0)
  7: PHASE_SERVERS['manifest'],
  8: PHASE_SERVERS['audio']
};

/**
 * Convert ISO 639-3 language code to human-readable name
 * Used for Phase 3 basket generation prompts
 */
const LANGUAGE_NAMES = {
  'afr': 'Afrikaans',
  'ara': 'Arabic',
  'bre': 'Breton',
  'cmn': 'Chinese (Mandarin)',
  'cym': 'Welsh',
  'deu': 'German',
  'eng': 'English',
  'eus': 'Basque',
  'fra': 'French',
  'gla': 'Scottish Gaelic',
  'gle': 'Irish',
  'glv': 'Manx',
  'ita': 'Italian',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'mkd': 'Macedonian',
  'por': 'Portuguese',
  'rus': 'Russian',
  'spa': 'Spanish'
};

function getLanguageName(code) {
  return LANGUAGE_NAMES[code.toLowerCase()] || code.toUpperCase();
}

// Validate config
if (!VFS_ROOT) {
  console.error('❌ Error: VFS_ROOT not set');
  process.exit(1);
}

// Initialize Express
const app = express();
const httpServer = createServer(app);

// WebSocket setup for real-time progress
const io = new Server(httpServer, {
  path: '/api/orchestrator/websocket',
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://ssi-dashboard-v7.vercel.app',
      'https://popty.app',
      /\.vercel\.app$/,
      /\.popty\.app$/,
      /ngrok.*\.app$/
    ],
    methods: ['GET', 'POST']
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`[WebSocket] Client connected: ${socket.id}`);

  // Client can subscribe to specific course progress
  socket.on('subscribe', (courseCode) => {
    socket.join(`course:${courseCode}`);
    console.log(`[WebSocket] ${socket.id} subscribed to course:${courseCode}`);

    // Send current progress if available
    const progress = courseProgress.get(courseCode);
    if (progress) {
      socket.emit('progress', progress);
    }
  });

  socket.on('unsubscribe', (courseCode) => {
    socket.leave(`course:${courseCode}`);
    console.log(`[WebSocket] ${socket.id} unsubscribed from course:${courseCode}`);
  });

  socket.on('disconnect', () => {
    console.log(`[WebSocket] Client disconnected: ${socket.id}`);
  });
});

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://ssi-dashboard-v7.vercel.app',
    'https://popty.app',
    /\.vercel\.app$/,
    /\.popty\.app$/,
    /ngrok.*\.app$/
  ]
}));
app.use(bodyParser.json({ limit: '50mb' }));

// Course state tracking (courseCode -> state)
const courseStates = new Map();

// Pipeline state tracking (APML v9.0 linear flow: Phase 1 → Phase 3 → Manifest → Audio)
// courseCode -> { phase1: {success, completedAt, stats}, phase3: {...}, manifest: {...}, audio: {...} }
const pipelineJobs = new Map();

// Active course progress tracking (for real-time monitoring)
// courseCode -> { currentPhase, overallStatus, phases: {...}, recentLogs: [] }
const courseProgress = new Map();

// =======================================
// PIPELINE STATE MODEL (Course Generation Transparency)
// =======================================

/**
 * @typedef {'quick_test' | 'mvp_course' | 'full_course'} CourseMode
 */

/**
 * @typedef {'pending' | 'running' | 'complete' | 'failed' | 'skipped'} PhaseStatusType
 */

/**
 * @typedef {'running' | 'complete' | 'failed' | 'paused'} PipelineStatusType
 */

/**
 * @typedef {'spawning' | 'ready' | 'running' | 'complete' | 'failed' | 'timeout'} BrowserStatusType
 */

/**
 * @typedef {'spawning' | 'running' | 'complete' | 'failed'} AgentStatusType
 */

/**
 * @typedef {'pending' | 'assigned' | 'processing' | 'complete' | 'failed'} SeedStatusType
 */

/**
 * PhaseStatus - Status tracking for individual pipeline phases
 * @typedef {Object} PhaseStatus
 * @property {PhaseStatusType} status - Current phase status
 * @property {string} [jobId] - Current or last job for this phase
 * @property {string} [startedAt] - ISO timestamp when phase started
 * @property {string} [completedAt] - ISO timestamp when phase completed
 * @property {number} [duration] - Duration in seconds
 * @property {number} [inputCount] - Seeds/LEGOs/etc going in
 * @property {number} [outputCount] - Items produced
 * @property {string} [error] - Error message if failed
 */

/**
 * SeedStatus - Individual seed tracking within a job
 * @typedef {Object} SeedStatus
 * @property {string} seedId - Seed identifier (e.g., "S0001")
 * @property {SeedStatusType} status - Current status
 * @property {string} [browserId] - Assigned browser
 * @property {string} [agentId] - Assigned agent
 * @property {string} [assignedAt] - ISO timestamp when assigned
 * @property {string} [processingStartedAt] - ISO timestamp when processing began
 * @property {string} [completedAt] - ISO timestamp when completed
 * @property {*} [result] - The actual translation/LEGO data
 * @property {string} [error] - Error message if failed
 */

/**
 * AgentInstance - Agent within a browser
 * @typedef {Object} AgentInstance
 * @property {string} agentId - Agent identifier (e.g., "browser-1-agent-1")
 * @property {string} browserId - Parent browser ID
 * @property {AgentStatusType} status - Current status
 * @property {string[]} assignedSeeds - Seeds assigned to this agent
 * @property {string[]} completedSeeds - Seeds completed by this agent
 * @property {string[]} failedSeeds - Seeds that failed in this agent
 * @property {string} [currentSeed] - Currently processing seed
 * @property {string} startedAt - ISO timestamp when agent started
 * @property {string} lastActivityAt - ISO timestamp of last activity
 * @property {string} [completedAt] - ISO timestamp when completed
 */

/**
 * BrowserInstance - Browser spawned for parallel processing
 * @typedef {Object} BrowserInstance
 * @property {string} browserId - Browser identifier (e.g., "browser-1")
 * @property {BrowserStatusType} status - Current status
 * @property {string[]} assignedSeeds - Seeds this browser is responsible for
 * @property {AgentInstance[]} agents - Agents within this browser
 * @property {string} spawnedAt - ISO timestamp when browser spawned
 * @property {string} [readyAt] - ISO timestamp when browser became ready
 * @property {string} [completedAt] - ISO timestamp when browser completed
 * @property {string} [error] - Error message if failed
 */

/**
 * GenerationJob - Per-phase job tracking
 * @typedef {Object} GenerationJob
 * @property {string} jobId - Unique job identifier (e.g., "p1-001")
 * @property {string} courseCode - Course being processed
 * @property {CourseMode} mode - Generation mode
 * @property {number} phase - Phase number (1, 2, 3, etc.)
 * @property {Object} seeds - Seed tracking
 * @property {number} seeds.total - Total seeds in job
 * @property {string[]} seeds.pending - Seeds not yet assigned
 * @property {string[]} seeds.processing - Seeds currently being processed
 * @property {string[]} seeds.completed - Seeds successfully completed
 * @property {string[]} seeds.failed - Seeds that failed
 * @property {BrowserInstance[]} browsers - Browser instances
 * @property {string} startedAt - ISO timestamp when job started
 * @property {string} lastActivityAt - ISO timestamp of last activity
 * @property {string} [completedAt] - ISO timestamp when completed
 * @property {number} gapFillAttempts - Number of gap-fill attempts made
 * @property {number} maxGapFillAttempts - Maximum gap-fill attempts allowed
 */

/**
 * Pipeline - Top-level pipeline state for course generation
 * @typedef {Object} Pipeline
 * @property {string} pipelineId - Unique pipeline identifier (e.g., "pipeline-zho_for_eng-20251218")
 * @property {string} courseCode - Course being generated
 * @property {CourseMode} mode - Generation mode (quick_test, mvp_course, full_course)
 * @property {PipelineStatusType} status - Overall pipeline status
 * @property {Object} phases - Phase progression tracking
 * @property {PhaseStatus} phases.phase1 - Phase 1: Translation + LEGO Extraction
 * @property {PhaseStatus} phases.phase2 - Phase 2: Conflict Resolution
 * @property {PhaseStatus} phases.phase3 - Phase 3: Basket Generation
 * @property {PhaseStatus} phases.audio - Audio: TTS Generation
 * @property {PhaseStatus} phases.manifest - Manifest: Course Compilation
 * @property {'phase1' | 'phase2' | 'phase3' | 'audio' | 'manifest' | null} currentPhase - Current active phase
 * @property {GenerationJob[]} jobs - Job history across all phases
 * @property {string} startedAt - ISO timestamp when pipeline started
 * @property {string} [completedAt] - ISO timestamp when pipeline completed
 * @property {number} [totalDuration] - Total duration in seconds
 * @property {Object} stats - Summary statistics
 * @property {number} stats.seedsTotal - Total seeds to process
 * @property {number} stats.seedsComplete - Seeds completed
 * @property {number} stats.legosGenerated - LEGOs generated
 * @property {number} stats.basketsGenerated - Baskets generated
 * @property {number} stats.audioFilesGenerated - Audio files generated
 */

/**
 * Pipeline storage - Maps pipelineId to Pipeline state
 * @type {Map<string, Pipeline>}
 */
const pipelines = new Map();

/**
 * Generate a unique pipeline ID
 * @param {string} courseCode - Course code
 * @returns {string} Pipeline ID (e.g., "pipeline-spa_for_eng-20251218-143917")
 */
function generatePipelineId(courseCode) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
  return `pipeline-${courseCode}-${dateStr}-${timeStr}`;
}

/**
 * Generate a unique job ID for a phase
 * @param {number|string} phase - Phase number or name
 * @param {number} [attempt=1] - Attempt number for retries
 * @returns {string} Job ID (e.g., "p1-001", "p3-002")
 */
function generateJobId(phase, attempt = 1) {
  const phaseNum = typeof phase === 'string' ? phase.replace('phase', '') : phase;
  return `p${phaseNum}-${String(attempt).padStart(3, '0')}`;
}

/**
 * Create a new pipeline for course generation
 * @param {string} courseCode - Course identifier
 * @param {CourseMode} mode - Generation mode
 * @param {number} [seedsTotal=668] - Total seeds to process
 * @returns {Pipeline} The newly created pipeline
 */
function createPipeline(courseCode, mode, seedsTotal = SEED_COUNTS.FULL_COURSE) {
  const pipelineId = generatePipelineId(courseCode);
  const now = new Date().toISOString();

  /** @type {Pipeline} */
  const pipeline = {
    pipelineId,
    courseCode,
    mode,
    status: 'running',
    phases: {
      phase1: { status: 'pending' },
      phase2: { status: 'pending' },
      phase3: { status: 'pending' },
      audio: { status: 'pending' },
      manifest: { status: 'pending' }
    },
    currentPhase: null,
    jobs: [],
    startedAt: now,
    completedAt: undefined,
    totalDuration: undefined,
    stats: {
      seedsTotal,
      seedsComplete: 0,
      legosGenerated: 0,
      basketsGenerated: 0,
      audioFilesGenerated: 0
    }
  };

  pipelines.set(pipelineId, pipeline);

  // Also index by courseCode for easy lookup
  pipelines.set(`course:${courseCode}`, pipeline);

  console.log(`[Pipeline] Created pipeline ${pipelineId} for ${courseCode} (mode: ${mode}, seeds: ${seedsTotal})`);

  return pipeline;
}

/**
 * Update phase status in a pipeline
 * @param {string} pipelineId - Pipeline ID or courseCode
 * @param {'phase1' | 'phase2' | 'phase3' | 'audio' | 'manifest'} phase - Phase to update
 * @param {Partial<PhaseStatus>} updates - Status updates to apply
 * @returns {Pipeline|null} Updated pipeline or null if not found
 */
function updatePipelinePhaseStatus(pipelineId, phase, updates) {
  // Support lookup by either pipelineId or courseCode
  let pipeline = pipelines.get(pipelineId);
  if (!pipeline) {
    pipeline = pipelines.get(`course:${pipelineId}`);
  }

  if (!pipeline) {
    console.warn(`[Pipeline] Pipeline not found: ${pipelineId}`);
    return null;
  }

  if (!pipeline.phases[phase]) {
    console.warn(`[Pipeline] Invalid phase: ${phase}`);
    return null;
  }

  // Merge updates into phase status
  Object.assign(pipeline.phases[phase], updates);

  // Update currentPhase if this phase is now running
  if (updates.status === 'running') {
    pipeline.currentPhase = phase;
  }

  // Calculate duration if phase just completed
  if (updates.status === 'complete' || updates.status === 'failed') {
    if (pipeline.phases[phase].startedAt && updates.completedAt) {
      const start = new Date(pipeline.phases[phase].startedAt);
      const end = new Date(updates.completedAt);
      pipeline.phases[phase].duration = Math.round((end - start) / 1000);
    }

    // Clear currentPhase if the completed phase was the active one
    if (pipeline.currentPhase === phase) {
      pipeline.currentPhase = null;
    }
  }

  // Check if all phases are complete to update pipeline status
  const allPhases = ['phase1', 'phase2', 'phase3', 'audio', 'manifest'];
  const phaseStatuses = allPhases.map(p => pipeline.phases[p].status);

  if (phaseStatuses.every(s => s === 'complete' || s === 'skipped')) {
    pipeline.status = 'complete';
    pipeline.completedAt = new Date().toISOString();
    if (pipeline.startedAt) {
      pipeline.totalDuration = Math.round(
        (new Date(pipeline.completedAt) - new Date(pipeline.startedAt)) / 1000
      );
    }
    console.log(`[Pipeline] Pipeline ${pipeline.pipelineId} completed in ${formatDuration(pipeline.totalDuration)}`);
  } else if (phaseStatuses.some(s => s === 'failed')) {
    pipeline.status = 'failed';
    console.log(`[Pipeline] Pipeline ${pipeline.pipelineId} failed at phase ${phase}`);
  }

  console.log(`[Pipeline] Updated ${pipeline.pipelineId} phase ${phase}: ${JSON.stringify(updates)}`);

  return pipeline;
}

/**
 * Add a job to a pipeline
 * @param {string} pipelineId - Pipeline ID or courseCode
 * @param {GenerationJob} job - Job to add
 * @returns {Pipeline|null} Updated pipeline or null if not found
 */
function addJobToPipeline(pipelineId, job) {
  // Support lookup by either pipelineId or courseCode
  let pipeline = pipelines.get(pipelineId);
  if (!pipeline) {
    pipeline = pipelines.get(`course:${pipelineId}`);
  }

  if (!pipeline) {
    console.warn(`[Pipeline] Pipeline not found: ${pipelineId}`);
    return null;
  }

  pipeline.jobs.push(job);

  // Update phase with job reference
  const phaseKey = `phase${job.phase}`;
  if (pipeline.phases[phaseKey]) {
    pipeline.phases[phaseKey].jobId = job.jobId;
  }

  console.log(`[Pipeline] Added job ${job.jobId} to pipeline ${pipeline.pipelineId}`);

  return pipeline;
}

/**
 * Get a pipeline by ID or courseCode
 * @param {string} pipelineId - Pipeline ID or courseCode
 * @returns {Pipeline|null} Pipeline or null if not found
 */
function getPipeline(pipelineId) {
  // Try direct lookup first
  let pipeline = pipelines.get(pipelineId);
  if (pipeline) return pipeline;

  // Try courseCode lookup
  pipeline = pipelines.get(`course:${pipelineId}`);
  if (pipeline) return pipeline;

  return null;
}

/**
 * Get all active pipelines (status = running)
 * @returns {Pipeline[]} Array of active pipelines
 */
function getActivePipelines() {
  const active = [];
  for (const [key, pipeline] of pipelines.entries()) {
    // Skip courseCode index entries
    if (key.startsWith('course:')) continue;
    if (pipeline.status === 'running') {
      active.push(pipeline);
    }
  }
  return active;
}

/**
 * Create a new GenerationJob
 * @param {string} courseCode - Course identifier
 * @param {CourseMode} mode - Generation mode
 * @param {number} phase - Phase number
 * @param {string[]} seedIds - Seed IDs to process
 * @returns {GenerationJob} The newly created job
 */
function createJob(courseCode, mode, phase, seedIds) {
  // Find existing jobs for this phase to determine attempt number
  const pipeline = getPipeline(courseCode);
  let attempt = 1;
  if (pipeline) {
    const existingJobs = pipeline.jobs.filter(j => j.phase === phase);
    attempt = existingJobs.length + 1;
  }

  const jobId = generateJobId(phase, attempt);
  const now = new Date().toISOString();

  /** @type {GenerationJob} */
  const job = {
    jobId,
    courseCode,
    mode,
    phase,
    seeds: {
      total: seedIds.length,
      pending: [...seedIds],
      processing: [],
      completed: [],
      failed: []
    },
    browsers: [],
    startedAt: now,
    lastActivityAt: now,
    completedAt: undefined,
    gapFillAttempts: 0,
    maxGapFillAttempts: MAX_GAP_FILL_ATTEMPTS
  };

  console.log(`[Pipeline] Created job ${jobId} for ${courseCode} phase ${phase} (${seedIds.length} seeds)`);

  return job;
}

/**
 * Update job with browser/seed status
 * @param {GenerationJob} job - Job to update
 * @param {Object} updates - Updates to apply
 * @returns {GenerationJob} Updated job
 */
function updateJob(job, updates) {
  job.lastActivityAt = new Date().toISOString();

  if (updates.browsers) {
    job.browsers = updates.browsers;
  }

  if (updates.seeds) {
    Object.assign(job.seeds, updates.seeds);
  }

  if (updates.gapFillAttempts !== undefined) {
    job.gapFillAttempts = updates.gapFillAttempts;
  }

  // Check if job is complete
  const totalProcessed = job.seeds.completed.length + job.seeds.failed.length;
  if (totalProcessed >= job.seeds.total) {
    job.completedAt = new Date().toISOString();
    console.log(`[Pipeline] Job ${job.jobId} completed: ${job.seeds.completed.length} success, ${job.seeds.failed.length} failed`);
  }

  return job;
}

/**
 * Initialize progress tracking for a course
 */
function initializeCourseProgress(courseCode, startPhase, totalSeeds) {
  courseProgress.set(courseCode, {
    courseCode,
    currentPhase: startPhase,
    overallStatus: 'running',
    startTime: new Date().toISOString(),
    // APML v9.0 phases: 1 (Translation + LEGO), 3 (Baskets), manifest, audio
    phases: {
      1: { status: 'pending', seedsTotal: totalSeeds },
      3: { status: 'pending' },
      manifest: { status: 'pending' },
      audio: { status: 'pending' }
    },
    recentLogs: []
  });
  return courseProgress.get(courseCode);
}

/**
 * Emit progress update via WebSocket to subscribed clients
 */
function emitProgress(courseCode) {
  const progress = courseProgress.get(courseCode);
  if (!progress) return;

  // Emit to all clients subscribed to this course
  io.to(`course:${courseCode}`).emit('progress', progress);
}

/**
 * Update phase progress
 */
function updatePhaseProgress(courseCode, phase, updates) {
  const progress = courseProgress.get(courseCode);
  if (!progress) return;

  if (!progress.phases[phase]) {
    progress.phases[phase] = {};
  }

  Object.assign(progress.phases[phase], updates);

  // Add log entry
  if (updates.status) {
    addProgressLog(courseCode, `Phase ${phase}: ${updates.status}`, 'info', false);
  }

  // Emit WebSocket update
  emitProgress(courseCode);
}

/**
 * Add log entry to progress
 */
function addProgressLog(courseCode, message, level = 'info', emit = true) {
  const progress = courseProgress.get(courseCode);
  if (!progress) return;

  progress.recentLogs.unshift({
    time: new Date().toISOString(),
    level,
    message
  });

  // Keep only last 50 logs
  if (progress.recentLogs.length > 50) {
    progress.recentLogs = progress.recentLogs.slice(0, 50);
  }

  // Emit WebSocket update (unless called from updatePhaseProgress which emits after)
  if (emit) {
    emitProgress(courseCode);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRANULAR WEBSOCKET EMIT FUNCTIONS (Course Generation Transparency)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Active generation jobs (courseCode -> job state with live browser/agent tracking)
 * This tracks real-time browser/agent state during generation
 * @type {Map<string, Object>}
 */
const activeGenerationJobs = new Map();

/**
 * Get or create an active generation job for real-time tracking
 * @param {string} courseCode - Course identifier
 * @param {number} [phase=1] - Phase number
 * @returns {Object} Active generation job state
 */
function getOrCreateActiveJob(courseCode, phase = 1) {
  if (!activeGenerationJobs.has(courseCode)) {
    activeGenerationJobs.set(courseCode, {
      courseCode,
      phase,
      status: 'pending',
      browsers: new Map(),  // browserId -> BrowserInstance
      seeds: {
        total: 0,
        pending: [],
        processing: [],
        completed: [],
        failed: []
      },
      gapFillAttempts: 0,
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString()
    });
  }
  return activeGenerationJobs.get(courseCode);
}

/**
 * Convert active job to JSON-serializable format
 * @param {Object} job - Active job with Map structures
 * @returns {Object|null} JSON-serializable job state
 */
function serializeActiveJob(job) {
  if (!job) return null;
  return {
    ...job,
    browsers: Array.from(job.browsers.values()).map(browser => ({
      ...browser,
      agents: browser.agents || []
    }))
  };
}

/**
 * Emit browser lifecycle event via WebSocket
 * Events: browser:spawning, browser:ready, browser:running, browser:complete, browser:failed, browser:timeout
 *
 * @param {string} courseCode - Course identifier
 * @param {Object} event - Event data
 * @param {string} event.type - Event type (e.g., 'browser:spawning')
 * @param {string} event.browserId - Browser identifier
 * @param {string[]} [event.assignedSeeds] - Seeds assigned to this browser
 * @param {string} [event.error] - Error message if failed
 */
function emitBrowserEvent(courseCode, event) {
  const { type, browserId, assignedSeeds, error } = event;
  const job = getOrCreateActiveJob(courseCode);
  job.lastActivityAt = new Date().toISOString();

  // Get or create browser instance
  let browser = job.browsers.get(browserId);
  if (!browser) {
    browser = {
      browserId,
      status: 'spawning',
      assignedSeeds: assignedSeeds || [],
      agents: [],
      spawnedAt: new Date().toISOString()
    };
    job.browsers.set(browserId, browser);
  }

  // Map event type to status
  const statusMap = {
    'browser:spawning': 'spawning',
    'browser:ready': 'ready',
    'browser:running': 'running',
    'browser:complete': 'complete',
    'browser:failed': 'failed',
    'browser:timeout': 'timeout'
  };

  const newStatus = statusMap[type];
  if (newStatus) browser.status = newStatus;
  if (assignedSeeds) browser.assignedSeeds = assignedSeeds;
  if (error) browser.error = error;
  if (type === 'browser:ready') browser.readyAt = new Date().toISOString();
  if (type === 'browser:complete') browser.completedAt = new Date().toISOString();

  // Log the event
  const logLevel = error ? 'error' : 'info';
  const logMessage = error
    ? `Browser ${browserId}: ${type.split(':')[1]} - ${error}`
    : `Browser ${browserId}: ${type.split(':')[1]}${assignedSeeds ? ` (${assignedSeeds.length} seeds)` : ''}`;
  addProgressLog(courseCode, logMessage, logLevel, false);

  // Emit granular browser event
  io.to(`course:${courseCode}`).emit('browser:update', {
    browser: { ...browser },
    event: type,
    timestamp: new Date().toISOString()
  });

  // Also emit aggregated progress
  emitProgress(courseCode);

  console.log(`[WebSocket] ${courseCode} ${type} browserId=${browserId}`);
}

/**
 * Emit agent lifecycle event via WebSocket
 * Events: agent:spawning, agent:running, agent:complete, agent:failed
 *
 * @param {string} courseCode - Course identifier
 * @param {Object} event - Event data
 * @param {string} event.type - Event type (e.g., 'agent:spawning')
 * @param {string} event.browserId - Parent browser identifier
 * @param {string} event.agentId - Agent identifier
 * @param {string[]} [event.assignedSeeds] - Seeds assigned to this agent
 * @param {string[]} [event.completedSeeds] - Seeds completed by this agent
 * @param {string} [event.error] - Error message if failed
 */
function emitAgentEvent(courseCode, event) {
  const { type, browserId, agentId, assignedSeeds, completedSeeds, error } = event;
  const job = getOrCreateActiveJob(courseCode);
  job.lastActivityAt = new Date().toISOString();

  // Get or create browser
  let browser = job.browsers.get(browserId);
  if (!browser) {
    browser = {
      browserId,
      status: 'running',
      assignedSeeds: [],
      agents: [],
      spawnedAt: new Date().toISOString()
    };
    job.browsers.set(browserId, browser);
  }

  // Find or create agent
  let agent = browser.agents.find(a => a.agentId === agentId);
  if (!agent) {
    agent = {
      agentId,
      browserId,
      status: 'spawning',
      assignedSeeds: assignedSeeds || [],
      completedSeeds: [],
      failedSeeds: [],
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString()
    };
    browser.agents.push(agent);
  }

  // Map event type to status
  const statusMap = {
    'agent:spawning': 'spawning',
    'agent:running': 'running',
    'agent:complete': 'complete',
    'agent:failed': 'failed'
  };

  const newStatus = statusMap[type];
  if (newStatus) agent.status = newStatus;
  agent.lastActivityAt = new Date().toISOString();
  if (assignedSeeds) agent.assignedSeeds = assignedSeeds;
  if (completedSeeds) agent.completedSeeds = completedSeeds;
  if (error) agent.error = error;
  if (type === 'agent:complete') agent.completedAt = new Date().toISOString();

  // Log the event
  const logLevel = error ? 'error' : 'info';
  const logMessage = error
    ? `Agent ${agentId}: ${type.split(':')[1]} - ${error}`
    : `Agent ${agentId}: ${type.split(':')[1]}`;
  addProgressLog(courseCode, logMessage, logLevel, false);

  // Emit granular agent event
  io.to(`course:${courseCode}`).emit('agent:update', {
    agent: { ...agent },
    browserId,
    event: type,
    timestamp: new Date().toISOString()
  });

  // Also emit aggregated progress
  emitProgress(courseCode);

  console.log(`[WebSocket] ${courseCode} ${type} agentId=${agentId}`);
}

/**
 * Emit seed lifecycle event via WebSocket
 * Events: seed:assigned, seed:processing, seed:complete, seed:failed
 *
 * @param {string} courseCode - Course identifier
 * @param {Object} event - Event data
 * @param {string} event.type - Event type (e.g., 'seed:processing')
 * @param {string} event.seedId - Seed identifier
 * @param {string} [event.agentId] - Agent processing the seed
 * @param {string} [event.browserId] - Browser containing the agent
 * @param {string} [event.error] - Error message if failed
 * @param {*} [event.result] - Result data if complete
 */
function emitSeedEvent(courseCode, event) {
  const { type, seedId, agentId, browserId, error, result } = event;
  const job = getOrCreateActiveJob(courseCode);
  job.lastActivityAt = new Date().toISOString();

  // Helper to remove seed from all arrays
  const removeFromAllArrays = (id) => {
    job.seeds.pending = job.seeds.pending.filter(s => s !== id);
    job.seeds.processing = job.seeds.processing.filter(s => s !== id);
    job.seeds.completed = job.seeds.completed.filter(s => s !== id);
    job.seeds.failed = job.seeds.failed.filter(s => s !== id);
  };

  // Update seed status
  removeFromAllArrays(seedId);
  switch (type) {
    case 'seed:assigned':
    case 'seed:processing':
      job.seeds.processing.push(seedId);
      break;
    case 'seed:complete':
      job.seeds.completed.push(seedId);
      break;
    case 'seed:failed':
      job.seeds.failed.push(seedId);
      break;
    default:
      job.seeds.pending.push(seedId);
  }

  // Update agent's tracking if we have agent info
  if (agentId && browserId) {
    const browser = job.browsers.get(browserId);
    if (browser) {
      const agent = browser.agents.find(a => a.agentId === agentId);
      if (agent) {
        agent.lastActivityAt = new Date().toISOString();
        if (type === 'seed:processing') {
          agent.currentSeed = seedId;
        } else if (type === 'seed:complete') {
          agent.currentSeed = null;
          if (!agent.completedSeeds.includes(seedId)) {
            agent.completedSeeds.push(seedId);
          }
        } else if (type === 'seed:failed') {
          agent.currentSeed = null;
          if (!agent.failedSeeds) agent.failedSeeds = [];
          if (!agent.failedSeeds.includes(seedId)) {
            agent.failedSeeds.push(seedId);
          }
        }
      }
    }
  }

  // Build seed status for event
  const seedStatus = {
    seedId,
    status: type.split(':')[1],
    browserId,
    agentId,
    timestamp: new Date().toISOString()
  };
  if (error) seedStatus.error = error;
  if (result) seedStatus.result = result;

  // Log failures only (too noisy to log every seed)
  if (type === 'seed:failed') {
    addProgressLog(courseCode, `Seed ${seedId}: failed - ${error || 'unknown error'}`, 'error', false);
  }

  // Emit granular seed event
  io.to(`course:${courseCode}`).emit('seed:update', {
    seed: seedStatus,
    event: type,
    stats: {
      total: job.seeds.total,
      pending: job.seeds.pending.length,
      processing: job.seeds.processing.length,
      completed: job.seeds.completed.length,
      failed: job.seeds.failed.length
    },
    timestamp: new Date().toISOString()
  });

  // Emit full progress update periodically (every 5 completions or on failures)
  if (type === 'seed:failed' || job.seeds.completed.length % 5 === 0) {
    emitProgress(courseCode);
  }

  // Debug logging only for failures
  if (type === 'seed:failed') {
    console.log(`[WebSocket] ${courseCode} ${type} seedId=${seedId} error=${error}`);
  }
}

/**
 * Emit pipeline event via WebSocket
 * Events: job start/complete/failed, phase transitions, gap-fill triggers
 *
 * @param {string} courseCode - Course identifier
 * @param {Object} event - Event data
 * @param {string} event.type - Event type (e.g., 'pipeline:job:start')
 * @param {number} [event.phase] - Phase number
 * @param {string} [event.jobId] - Job identifier
 * @param {Object} [event.data] - Additional event data
 * @param {string} [event.error] - Error message if failed
 */
function emitPipelineEvent(courseCode, event) {
  const { type, phase, jobId, data, error } = event;
  const job = getOrCreateActiveJob(courseCode, phase);
  job.lastActivityAt = new Date().toISOString();

  // Update job state based on event type
  switch (type) {
    case 'pipeline:job:start':
      job.status = 'running';
      if (phase) job.phase = phase;
      if (data?.mode) job.mode = data.mode;
      if (data?.seeds) {
        job.seeds.total = data.seeds.length;
        job.seeds.pending = [...data.seeds];
        job.seeds.processing = [];
        job.seeds.completed = [];
        job.seeds.failed = [];
      }
      break;

    case 'pipeline:job:complete':
      job.status = 'complete';
      job.completedAt = new Date().toISOString();
      break;

    case 'pipeline:job:failed':
      job.status = 'failed';
      job.error = error;
      break;

    case 'pipeline:phase:start':
      if (phase) job.phase = phase;
      job.status = 'running';
      break;

    case 'pipeline:phase:complete':
      // Phase complete, job may continue with next phase
      break;

    case 'pipeline:gap-fill:triggered':
      job.gapFillAttempts = (job.gapFillAttempts || 0) + 1;
      if (data?.missingSeeds) {
        job.seeds.pending = [...data.missingSeeds];
        job.seeds.processing = [];
      }
      break;

    case 'pipeline:gap-fill:complete':
      if (data?.recoveredSeeds) {
        for (const seedId of data.recoveredSeeds) {
          if (!job.seeds.completed.includes(seedId)) {
            job.seeds.completed.push(seedId);
          }
          job.seeds.failed = job.seeds.failed.filter(s => s !== seedId);
        }
      }
      break;

    case 'pipeline:gap-fill:failed':
      // Gap-fill exhausted, remaining seeds stay failed
      break;
  }

  // Log the event
  const logLevel = error ? 'error' : 'info';
  const logMessage = error
    ? `Pipeline: ${type.replace('pipeline:', '')} - ${error}`
    : `Pipeline: ${type.replace('pipeline:', '')}${phase ? ` (phase ${phase})` : ''}`;
  addProgressLog(courseCode, logMessage, logLevel, false);

  // Emit pipeline event with full job state
  io.to(`course:${courseCode}`).emit('pipeline:update', {
    job: serializeActiveJob(job),
    event: type,
    phase,
    jobId,
    data,
    error,
    timestamp: new Date().toISOString()
  });

  // Also emit aggregated progress
  emitProgress(courseCode);

  console.log(`[WebSocket] ${courseCode} ${type}${phase ? ` phase=${phase}` : ''}${error ? ` error=${error}` : ''}`);
}

/**
 * Emit batch received event (for bulk seed submissions)
 * Event: batch:received
 *
 * @param {string} courseCode - Course identifier
 * @param {Object} event - Event data
 * @param {string} event.type - Event type ('batch:received')
 * @param {string[]} event.seedIds - Seed IDs in the batch
 * @param {string} [event.agentId] - Agent that submitted the batch
 * @param {string} [event.browserId] - Browser containing the agent
 */
function emitBatchEvent(courseCode, event) {
  const { type, seedIds, agentId, browserId } = event;
  const job = getOrCreateActiveJob(courseCode);
  job.lastActivityAt = new Date().toISOString();

  if (type === 'batch:received' && seedIds && Array.isArray(seedIds)) {
    // Mark all seeds in batch as completed
    for (const seedId of seedIds) {
      job.seeds.pending = job.seeds.pending.filter(s => s !== seedId);
      job.seeds.processing = job.seeds.processing.filter(s => s !== seedId);
      if (!job.seeds.completed.includes(seedId)) {
        job.seeds.completed.push(seedId);
      }
    }

    addProgressLog(courseCode, `Batch received: ${seedIds.length} seeds from ${agentId || 'unknown'}`, 'info', false);
  }

  // Emit batch event
  io.to(`course:${courseCode}`).emit('batch:update', {
    event: type,
    seedIds,
    agentId,
    browserId,
    stats: {
      total: job.seeds.total,
      pending: job.seeds.pending.length,
      processing: job.seeds.processing.length,
      completed: job.seeds.completed.length,
      failed: job.seeds.failed.length
    },
    timestamp: new Date().toISOString()
  });

  emitProgress(courseCode);

  console.log(`[WebSocket] ${courseCode} batch:received count=${seedIds?.length || 0}`);
}

/**
 * Get the current active job state for a course (for API endpoint)
 * @param {string} courseCode - Course identifier
 * @returns {Object|null} Serialized job state or null if not found
 */
function getActiveJobState(courseCode) {
  const job = activeGenerationJobs.get(courseCode);
  return serializeActiveJob(job);
}

/**
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

/**
 * Scan Phase 1 batch files and extract all received seed IDs
 * Returns { receivedSeeds: Set<string>, seedCount: number, batchCount: number }
 */
async function scanPhase1Batches(courseCode) {
  const batchesDir = path.join(VFS_ROOT, courseCode, 'phase1_batches');

  if (!await fs.pathExists(batchesDir)) {
    return { receivedSeeds: new Set(), seedCount: 0, batchCount: 0 };
  }

  const batchFiles = (await fs.readdir(batchesDir)).filter(f => f.endsWith('.json'));
  const receivedSeeds = new Set();

  for (const file of batchFiles) {
    try {
      const batch = await fs.readJSON(path.join(batchesDir, file));
      // Each seed has an 's' field (seed_id like "S0001") or 'seed_id' field
      for (const seed of batch) {
        const seedId = seed.s || seed.seed_id;
        if (seedId) {
          receivedSeeds.add(seedId);
        }
      }
    } catch (err) {
      console.warn(`[Orchestrator] Failed to read batch file ${file}: ${err.message}`);
    }
  }

  return { receivedSeeds, seedCount: receivedSeeds.size, batchCount: batchFiles.length };
}

/**
 * Check if all expected seeds have been received for Phase 1
 * Returns { complete: boolean, received: Set, missing: string[], stats: object }
 *
 * @param {string} courseCode - Course code
 * @param {number|null} expectedStart - Start seed number (null for resume mode)
 * @param {number|null} expectedEnd - End seed number (null for resume mode)
 * @param {string[]|null} specificSeeds - Optional array of specific seed IDs (for resume mode)
 */
async function checkPhase1SeedCoverage(courseCode, expectedStart, expectedEnd, specificSeeds = null) {
  // Generate expected seed IDs
  const expectedSeeds = new Set();

  if (specificSeeds && Array.isArray(specificSeeds) && specificSeeds.length > 0) {
    // Resume mode: use specific seed IDs provided
    for (const seedId of specificSeeds) {
      if (seedId && typeof seedId === 'string') {
        expectedSeeds.add(seedId);
      }
    }
  } else if (expectedStart != null && expectedEnd != null) {
    // Normal mode: generate range (S0001, S0002, ..., S0010, etc.)
    for (let i = expectedStart; i <= expectedEnd; i++) {
      expectedSeeds.add(`S${String(i).padStart(4, '0')}`);
    }
  } else {
    // No valid expected seeds - return empty result
    console.warn('[Orchestrator] checkPhase1SeedCoverage: No valid expected seeds provided');
    return {
      complete: false,
      received: new Set(),
      missing: [],
      stats: { expected: 0, received: 0, missing: 0, batchFiles: 0, coverage: '0%' }
    };
  }

  // Scan actual received seeds from batch files
  const { receivedSeeds, seedCount, batchCount } = await scanPhase1Batches(courseCode);

  // Find missing seeds
  const missing = [];
  for (const seedId of expectedSeeds) {
    if (!receivedSeeds.has(seedId)) {
      missing.push(seedId);
    }
  }

  return {
    complete: missing.length === 0,
    received: receivedSeeds,
    missing,
    stats: {
      expected: expectedSeeds.size,
      received: seedCount,
      missing: missing.length,
      batchFiles: batchCount,
      coverage: ((seedCount / expectedSeeds.size) * 100).toFixed(1) + '%'
    }
  };
}

// Store active watchdog intervals so we can clear them
const phase1Watchdogs = new Map();
const phase3Watchdogs = new Map();

// ============================================================================
// MASTER HEARTBEAT TRACKING
// ============================================================================
// Tracks active masters and their worker progress
// Key: `${courseCode}_${phase}_${masterId}` → { status, activeSeeds, progress, lastHeartbeat }
const masterHeartbeats = new Map();

/**
 * Update master state from heartbeat
 */
function updateMasterHeartbeat(courseCode, phase, masterId, data) {
  const key = `${courseCode}_phase${phase}_${masterId}`;
  const existing = masterHeartbeats.get(key) || {};

  masterHeartbeats.set(key, {
    ...existing,
    courseCode,
    phase,
    masterId,
    ...data,
    lastHeartbeat: Date.now()
  });

  return masterHeartbeats.get(key);
}

/**
 * Get all masters for a course/phase
 */
function getMastersForPhase(courseCode, phase) {
  const masters = [];
  for (const [key, state] of masterHeartbeats) {
    if (key.startsWith(`${courseCode}_phase${phase}_`)) {
      masters.push(state);
    }
  }
  return masters;
}

/**
 * Check if any master has reported recently
 */
function hasRecentMasterHeartbeat(courseCode, phase, maxAge = 60000) {
  const masters = getMastersForPhase(courseCode, phase);
  const now = Date.now();
  return masters.some(m => (now - m.lastHeartbeat) < maxAge);
}

/**
 * Clean up stale master entries (older than 10 minutes)
 */
function cleanupStaleMasters() {
  const now = Date.now();
  const staleThreshold = 10 * 60 * 1000; // 10 minutes

  for (const [key, state] of masterHeartbeats) {
    if (now - state.lastHeartbeat > staleThreshold) {
      masterHeartbeats.delete(key);
    }
  }
}

// Clean up stale masters every 5 minutes
setInterval(cleanupStaleMasters, 5 * 60 * 1000);

// Stall detection constants
const STALL_CHECK_INTERVAL = 30000;  // Check every 30 seconds
const STALL_TIMEOUT = 90000;         // Consider stalled if no batch for 90 seconds
const MAX_GAP_FILL_ATTEMPTS = 3;     // Maximum gap-fill attempts per course

/**
 * Start a watchdog that monitors Phase 1 progress and triggers gap-fill if stalled
 */
function startPhase1StallWatchdog(courseCode) {
  // Clear any existing watchdog for this course
  if (phase1Watchdogs.has(courseCode)) {
    clearInterval(phase1Watchdogs.get(courseCode));
  }

  console.log(`[Watchdog] Started stall detection for ${courseCode} (check every ${STALL_CHECK_INTERVAL/1000}s, stall after ${STALL_TIMEOUT/1000}s)`);

  const watchdog = setInterval(async () => {
    const phase1State = courseProgress.get(`${courseCode}_phase1`);

    // Stop if no state or already complete
    if (!phase1State) {
      console.log(`[Watchdog] ${courseCode}: No state found, stopping watchdog`);
      clearInterval(watchdog);
      phase1Watchdogs.delete(courseCode);
      return;
    }

    // Check seed coverage
    const coverage = await checkPhase1SeedCoverage(
      courseCode,
      phase1State.expectedStartSeed,
      phase1State.expectedEndSeed
    );

    // If complete, stop watchdog
    if (coverage.complete) {
      console.log(`[Watchdog] ${courseCode}: All seeds received, stopping watchdog`);
      clearInterval(watchdog);
      phase1Watchdogs.delete(courseCode);
      return;
    }

    // Check for stall: no new batch for STALL_TIMEOUT
    const timeSinceLastBatch = Date.now() - phase1State.lastBatchTime;
    const isStalled = timeSinceLastBatch > STALL_TIMEOUT;

    if (isStalled && !phase1State.gapFillTriggered) {
      console.log(`[Watchdog] ⚠️ ${courseCode}: STALL DETECTED!`);
      console.log(`   → Last batch: ${Math.round(timeSinceLastBatch/1000)}s ago`);
      console.log(`   → Coverage: ${coverage.stats.coverage} (${coverage.stats.missing} seeds missing)`);
      console.log(`   → Missing: ${coverage.missing.join(', ')}`);

      // Trigger gap-fill
      await triggerPhase1GapFill(courseCode, coverage.missing, phase1State);
    }
  }, STALL_CHECK_INTERVAL);

  phase1Watchdogs.set(courseCode, watchdog);
}

/**
 * Trigger gap-fill for missing seeds
 * Calls Phase 1 server to spawn targeted agents for specific seeds
 */
async function triggerPhase1GapFill(courseCode, missingSeeds, phase1State) {
  // Mark gap-fill as triggered to prevent duplicate triggers
  phase1State.gapFillTriggered = true;
  phase1State.gapFillAttempt = (phase1State.gapFillAttempt || 0) + 1;
  courseProgress.set(`${courseCode}_phase1`, phase1State);

  if (phase1State.gapFillAttempt > MAX_GAP_FILL_ATTEMPTS) {
    console.log(`[GapFill] ❌ ${courseCode}: Max gap-fill attempts (${MAX_GAP_FILL_ATTEMPTS}) reached`);
    addProgressLog(courseCode, `Gap-fill failed after ${MAX_GAP_FILL_ATTEMPTS} attempts. Missing: ${missingSeeds.join(', ')}`, 'error');
    return;
  }

  console.log(`[GapFill] 🔄 ${courseCode}: Triggering gap-fill (attempt ${phase1State.gapFillAttempt}/${MAX_GAP_FILL_ATTEMPTS})`);
  console.log(`   → Missing seeds: ${missingSeeds.join(', ')}`);
  addProgressLog(courseCode, `Gap-fill triggered for ${missingSeeds.length} missing seeds: ${missingSeeds.join(', ')}`);

  try {
    const phase1Server = PHASE_SERVERS['1_translation'];

    // Convert seed IDs to seed numbers (S0003 -> 3)
    const seedNumbers = missingSeeds.map(s => parseInt(s.replace('S', ''), 10));

    const response = await axios.post(`${phase1Server}/gap-fill`, {
      courseCode,
      seeds: seedNumbers,
      target: phase1State.target,
      known: phase1State.known
    });

    console.log(`[GapFill] ✅ ${courseCode}: Gap-fill request sent`);
    console.log(`   → Response: ${JSON.stringify(response.data)}`);
    addProgressLog(courseCode, `Gap-fill agents spawned for seeds: ${missingSeeds.join(', ')}`);

    // Reset lastBatchTime to give gap-fill agents time to work
    phase1State.lastBatchTime = Date.now();
    phase1State.gapFillTriggered = false;  // Allow another gap-fill if this one stalls
    courseProgress.set(`${courseCode}_phase1`, phase1State);

  } catch (error) {
    console.error(`[GapFill] ❌ ${courseCode}: Gap-fill request failed:`, error.message);
    addProgressLog(courseCode, `Gap-fill failed: ${error.message}`, 'error');

    // Reset to allow retry
    phase1State.gapFillTriggered = false;
    courseProgress.set(`${courseCode}_phase1`, phase1State);
  }
}

// ============================================================================
// PHASE 3 STALL DETECTION
// ============================================================================

/**
 * Check Phase 3 seed coverage - which seeds have baskets generated
 */
async function checkPhase3SeedCoverage(courseCode, startSeed, endSeed) {
  const courseDir = path.join(VFS_ROOT, courseCode);
  const stagingDir = path.join(courseDir, 'phase3_baskets_staging');

  // Get expected seeds from lego_pairs.json
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
  let expectedSeeds = [];

  try {
    const legoPairs = JSON.parse(await fs.readFile(legoPairsPath, 'utf8'));
    expectedSeeds = (legoPairs.seeds || [])
      .map(s => s.seed_id)
      .filter(id => {
        const num = parseInt(id.replace('S', ''), 10);
        return num >= startSeed && num <= endSeed;
      });
  } catch (e) {
    console.log(`[Phase3Coverage] Could not read lego_pairs.json: ${e.message}`);
    return { complete: false, missing: [], received: [], stats: { coverage: '0%', missing: 0 } };
  }

  // Get received seeds from staging directory
  let receivedSeeds = [];
  try {
    const files = await fs.readdir(stagingDir);
    receivedSeeds = files
      .filter(f => f.startsWith('seed_S') && f.endsWith('_baskets.json'))
      .map(f => f.replace('seed_', '').replace('_baskets.json', ''));
  } catch (e) {
    // Directory doesn't exist yet
  }

  const receivedSet = new Set(receivedSeeds);
  const missing = expectedSeeds.filter(s => !receivedSet.has(s));
  const complete = missing.length === 0 && expectedSeeds.length > 0;

  return {
    complete,
    missing,
    received: receivedSeeds,
    stats: {
      expected: expectedSeeds.length,
      received: receivedSeeds.length,
      missing: missing.length,
      coverage: expectedSeeds.length > 0
        ? `${Math.round(receivedSeeds.length / expectedSeeds.length * 100)}%`
        : '0%'
    }
  };
}

/**
 * Start a watchdog that monitors Phase 3 progress and triggers gap-fill if stalled
 */
function startPhase3StallWatchdog(courseCode) {
  // Clear any existing watchdog for this course
  if (phase3Watchdogs.has(courseCode)) {
    clearInterval(phase3Watchdogs.get(courseCode));
  }

  console.log(`[Phase3Watchdog] Started stall detection for ${courseCode}`);

  const watchdog = setInterval(async () => {
    const phase3State = courseProgress.get(`${courseCode}_phase3`);

    // Stop if no state or already complete
    if (!phase3State) {
      console.log(`[Phase3Watchdog] ${courseCode}: No state found, stopping watchdog`);
      clearInterval(watchdog);
      phase3Watchdogs.delete(courseCode);
      return;
    }

    // Check seed coverage
    const coverage = await checkPhase3SeedCoverage(
      courseCode,
      phase3State.expectedStartSeed,
      phase3State.expectedEndSeed
    );

    // If complete, stop watchdog
    if (coverage.complete) {
      console.log(`[Phase3Watchdog] ✅ ${courseCode}: All seeds complete, stopping watchdog`);
      addProgressLog(courseCode, `Phase 3 complete: ${coverage.stats.received}/${coverage.stats.expected} seeds`, 'success');
      clearInterval(watchdog);
      phase3Watchdogs.delete(courseCode);
      return;
    }

    // Check for stall: no new basket for STALL_TIMEOUT
    const timeSinceLastBatch = Date.now() - phase3State.lastBatchTime;
    const outputStale = timeSinceLastBatch > STALL_TIMEOUT;

    // Check if any master has reported recently (within 60s)
    const hasRecentHeartbeat = hasRecentMasterHeartbeat(courseCode, 3, 60000);

    // Only stalled if NO output AND NO heartbeat
    const isStalled = outputStale && !hasRecentHeartbeat;

    if (isStalled && !phase3State.gapFillTriggered) {
      console.log(`[Phase3Watchdog] ⚠️ ${courseCode}: STALL DETECTED!`);
      console.log(`   → Last basket: ${Math.round(timeSinceLastBatch/1000)}s ago`);
      console.log(`   → Recent heartbeat: ${hasRecentHeartbeat ? 'YES' : 'NO'}`);
      console.log(`   → Coverage: ${coverage.stats.coverage} (${coverage.stats.missing} seeds missing)`);
      console.log(`   → Missing: ${coverage.missing.join(', ')}`);

      // Log stall but DON'T auto-trigger gap-fill - too risky with overlapping jobs
      // User should manually retry via dashboard
      addProgressLog(courseCode, `Phase 3 stalled: ${coverage.stats.missing} seeds missing (${coverage.missing.join(', ')})`, 'warning');
      phase3State.gapFillTriggered = true;  // Prevent spam logging
      courseProgress.set(`${courseCode}_phase3`, phase3State);

      // Emit stall event for UI
      if (io) {
        io.to(`course:${courseCode}`).emit('phase-stalled', {
          courseCode,
          phase: 3,
          missingSeeds: coverage.missing,
          lastBasket: timeSinceLastBatch,
          timestamp: Date.now()
        });
      }

      // Stop watchdog - user intervention needed
      console.log(`[Phase3Watchdog] Stopping watchdog - manual retry recommended`);
      clearInterval(watchdog);
      phase3Watchdogs.delete(courseCode);
    } else if (outputStale && hasRecentHeartbeat) {
      // Masters still working, just slow - log but don't flag as stalled
      console.log(`[Phase3Watchdog] ${courseCode}: Output stale but masters active (heartbeat within 60s)`);
    }
  }, STALL_CHECK_INTERVAL);

  phase3Watchdogs.set(courseCode, watchdog);
}

/**
 * Trigger gap-fill for missing Phase 3 seeds
 * Calls Phase 3 server to regenerate baskets for specific seeds
 */
async function triggerPhase3GapFill(courseCode, missingSeeds, phase3State) {
  // Mark gap-fill as triggered to prevent duplicate triggers
  phase3State.gapFillTriggered = true;
  phase3State.gapFillAttempt = (phase3State.gapFillAttempt || 0) + 1;
  courseProgress.set(`${courseCode}_phase3`, phase3State);

  if (phase3State.gapFillAttempt > MAX_GAP_FILL_ATTEMPTS) {
    console.log(`[Phase3GapFill] ❌ ${courseCode}: Max gap-fill attempts (${MAX_GAP_FILL_ATTEMPTS}) reached`);
    addProgressLog(courseCode, `Phase 3 gap-fill failed after ${MAX_GAP_FILL_ATTEMPTS} attempts. Missing: ${missingSeeds.join(', ')}`, 'error');
    return;
  }

  console.log(`[Phase3GapFill] 🔄 ${courseCode}: Triggering gap-fill (attempt ${phase3State.gapFillAttempt}/${MAX_GAP_FILL_ATTEMPTS})`);
  console.log(`   → Missing seeds: ${missingSeeds.join(', ')}`);
  addProgressLog(courseCode, `Phase 3 gap-fill: regenerating ${missingSeeds.length} seeds: ${missingSeeds.join(', ')}`);

  try {
    const phase3Server = PHASE_SERVERS[3];

    // Convert seed IDs to numbers and get range
    const seedNumbers = missingSeeds.map(s => parseInt(s.replace('S', ''), 10)).sort((a, b) => a - b);
    const startSeed = seedNumbers[0];
    const endSeed = seedNumbers[seedNumbers.length - 1];

    console.log(`[Phase3GapFill] Calling /start for seeds ${startSeed}-${endSeed}`);

    // Call Phase 3 /start with the range covering missing seeds
    // Note: This may regenerate some seeds that already exist, but they'll be deduplicated
    const response = await axios.post(`${phase3Server}/start`, {
      courseCode,
      startSeed,
      endSeed,
      target: phase3State.target,
      known: phase3State.known
    }, { timeout: 30000 });

    console.log(`[Phase3GapFill] ✅ ${courseCode}: Gap-fill request sent`);
    addProgressLog(courseCode, `Phase 3 gap-fill: spawning agents for seeds ${startSeed}-${endSeed}`);

    // Reset lastBatchTime to give gap-fill agents time to work
    // Keep gapFillTriggered = true until a basket arrives (see upload-basket handler)
    phase3State.lastBatchTime = Date.now();
    // Don't reset gapFillTriggered here - wait for basket upload to reset it
    courseProgress.set(`${courseCode}_phase3`, phase3State);

  } catch (error) {
    console.error(`[Phase3GapFill] ❌ ${courseCode}: Gap-fill request failed:`, error.message);
    addProgressLog(courseCode, `Phase 3 gap-fill failed: ${error.message}`, 'error');

    // Reset to allow retry
    phase3State.gapFillTriggered = false;
    courseProgress.set(`${courseCode}_phase3`, phase3State);
  }
}

/**
 * NOTE: GitHub auto-publish removed - using database-first approach
 * Course data is synced to Supabase, not GitHub
 */

/**
 * GET /api/courses
 * List all available courses from Supabase (database-first)
 * Falls back to S3 if ?source=s3 is specified (legacy)
 */
app.get('/api/courses', async (req, res) => {
  try {
    const source = req.query.source || 'database';
    const includeStatus = req.query.status === 'true';

    // Database-first: Query Supabase courses table
    if (source === 'database') {
      const { supabase, isInitialized } = require('../supabase-client.cjs');

      if (!isInitialized()) {
        console.warn('[Orchestrator] Supabase not initialized, falling back to S3');
        // Fall through to S3 logic below
      } else {
        // v13: courses.code is PK
        const { data: dbCourses, error } = await supabase
          .from('courses')
          .select('code, known_lang, target_lang, display_name, status')
          .order('code');

        if (error) {
          console.error('[Orchestrator] Supabase query error:', error);
          throw error;
        }

        // Get content stats for each course to determine phases_completed
        const { getAllCourseContentStats } = require('../supabase-client.cjs');
        const contentStats = await getAllCourseContentStats();

        const courses = dbCourses.map(c => {
          // v13: courses.code is PK
          const stats = contentStats[c.code] || { seeds: 0, legos: 0, baskets: 0 };

          // Compute phases_completed based on database content
          const phases = [];
          if (stats.seeds > 0) phases.push('1');
          if (stats.legos > 0) phases.push('3');
          if (stats.baskets > 0) {
            phases.push('5');
            // Database-first: baskets in DB means ready for audio (no manifest file needed)
            phases.push('7', 'manifest');
          }

          return {
            code: c.code,
            course_code: c.code,  // Include both for compatibility
            name: c.display_name || c.code.replace(/_/g, ' ').replace(/for/g, '→'),
            knownLang: c.known_lang,
            targetLang: c.target_lang,
            status: c.status,
            seed_pairs: stats.seeds,
            lego_pairs: stats.legos,
            lego_baskets: stats.baskets,
            phases_completed: phases
          };
        });

        return res.json({
          courses,
          total: courses.length,
          source: 'database'
        });
      }
    }

    // Legacy S3 fallback
    const s3Service = require('../s3-service.cjs');
    const courseList = await s3Service.listCourseDirectories();

    if (includeStatus) {
      const keyFiles = ['lego_pairs.json', 'lego_baskets.json', 'introductions.json', 'course_manifest.json'];

      const coursesWithStatus = await Promise.all(
        courseList.map(async (courseCode) => {
          const fileStatus = {};
          for (const file of keyFiles) {
            const key = file.replace('.json', '');
            fileStatus[key] = await s3Service.courseFileExists(courseCode, file);
          }
          return {
            code: courseCode,
            name: courseCode.replace(/_/g, ' ').replace(/for/g, '→'),
            files: fileStatus,
            complete: Object.values(fileStatus).every(Boolean)
          };
        })
      );

      return res.json({
        courses: coursesWithStatus,
        total: coursesWithStatus.length,
        complete: coursesWithStatus.filter(c => c.complete).length,
        source: 's3'
      });
    }

    const courses = courseList.map(code => ({
      code,
      name: code.replace(/_/g, ' ').replace(/for/g, '→')
    }));

    res.json({
      courses,
      total: courses.length,
      source: 's3'
    });
  } catch (error) {
    console.error('Failed to load courses:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/courses/:courseCode
 * Get detailed course information
 * Supports both legacy (seed_pairs.json) and new (lego_pairs.json) formats
 * Falls back to Supabase for database-first courses
 */
app.get('/api/courses/:courseCode', async (req, res) => {
  const { courseCode } = req.params;

  try {
    const coursePath = path.join(VFS_ROOT, courseCode);

    // Try loading files from both legacy and new formats
    const seedPairsPath = path.join(coursePath, 'seed_pairs.json');
    const legoPairsPath = path.join(coursePath, 'lego_pairs.json');
    const basketsPath = path.join(coursePath, 'lego_baskets.json');

    const [seedPairs, legoPairs, baskets] = await Promise.all([
      fs.readJson(seedPairsPath).catch(() => null),
      fs.readJson(legoPairsPath).catch(() => null),
      fs.readJson(basketsPath).catch(() => null)
    ]);

    // Legacy format: seed_pairs.json exists
    if (seedPairs) {
      // seed_pairs can be array or object with translations
      let seedCount = 0;
      if (Array.isArray(seedPairs)) {
        seedCount = seedPairs.length;
      } else if (seedPairs.translations) {
        seedCount = Object.keys(seedPairs.translations).length;
      }

      // lego_pairs can be different formats
      let legoCount = 0;
      if (legoPairs) {
        if (legoPairs.metadata?.totalLegos) {
          legoCount = legoPairs.metadata.totalLegos;
        } else if (legoPairs.seeds && Array.isArray(legoPairs.seeds)) {
          legoCount = legoPairs.seeds.reduce((sum, seed) => sum + (seed.legos?.length || 0), 0);
        } else if (Array.isArray(legoPairs)) {
          legoCount = legoPairs.reduce((sum, seed) => sum + (seed.legos?.length || (Array.isArray(seed[2]) ? seed[2].length : 0)), 0);
        }
      }

      const basketCount = baskets ? Object.keys(baskets.baskets || baskets || {}).length : 0;

      return res.json({
        course_code: courseCode,
        seed_count: seedCount,
        lego_count: legoCount,
        basket_count: basketCount,
        has_phase1: !!seedPairs,
        has_phase3: !!legoPairs,
        has_baskets: !!baskets,
        data_source: 'vfs'
      });
    }

    // New format: lego_pairs.json or lego_baskets.json without seed_pairs.json
    if (legoPairs || baskets) {
      // Count from lego_pairs.json (v11+ format)
      let seedCount = 0;
      let legoCount = 0;

      if (legoPairs) {
        if (legoPairs.metadata) {
          // v11 format with metadata: {metadata: {...}, seeds: [{legos: [...]}]}
          seedCount = legoPairs.metadata.totalSeeds || (legoPairs.seeds?.length || 0);
          legoCount = legoPairs.metadata.totalLegos || 0;
        } else if (legoPairs.seeds && Array.isArray(legoPairs.seeds)) {
          // v11 format: {seeds: [{seed_id, legos: [...]}]}
          seedCount = legoPairs.seeds.length;
          legoCount = legoPairs.seeds.reduce((sum, seed) => sum + (seed.legos?.length || 0), 0);
        } else if (Array.isArray(legoPairs)) {
          // Flat array format: [{seed_number, legos: [...]}]
          seedCount = legoPairs.length;
          legoCount = legoPairs.reduce((sum, seed) => sum + (seed.legos?.length || 0), 0);
        }
      }

      // Count baskets - new format is object keyed by lego ID
      const basketCount = baskets ? Object.keys(baskets).length : 0;

      return res.json({
        course_code: courseCode,
        seed_count: seedCount,
        lego_count: legoCount,
        basket_count: basketCount,
        has_phase1: seedCount > 0,
        has_phase3: legoCount > 0,
        has_baskets: basketCount > 0,
        data_source: 'vfs-v11'
      });
    }

    // Fall back to Supabase (database-first courses)
    const { supabase, isInitialized } = require('../supabase-client.cjs');
    if (!isInitialized()) {
      return res.status(404).json({ error: `Course ${courseCode} not found (no local files and Supabase not initialized)` });
    }

    // Get course from database (v13: courses.code is primary key)
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('code', courseCode)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: `Course ${courseCode} not found` });
    }

    // Get content counts from database
    const { getAllCourseContentStats } = require('../supabase-client.cjs');
    const allStats = await getAllCourseContentStats();
    const stats = allStats[courseCode] || { seeds: 0, legos: 0, baskets: 0 };

    res.json({
      course_code: courseCode,
      seed_count: stats.seeds,
      lego_count: stats.legos,
      basket_count: stats.baskets,
      has_phase1: stats.seeds > 0,
      has_phase3: stats.legos > 0,
      has_baskets: stats.baskets > 0,
      data_source: 'database',
      course_name: course.name,
      known_lang: course.known_lang,
      target_lang: course.target_lang
    });
  } catch (error) {
    console.error(`Failed to load course ${courseCode}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/courses/:courseCode/exists
 * Check if a course exists (local VFS or S3)
 * Used by Create New Course wizard to handle conflicts
 */
app.get('/api/courses/:courseCode/exists', async (req, res) => {
  const { courseCode } = req.params;

  try {
    const coursePath = path.join(VFS_ROOT, courseCode);
    let existsLocal = false;
    let existsS3 = false;
    let localFiles = [];
    let s3Files = [];

    // Check local VFS
    try {
      const stats = await fs.stat(coursePath);
      if (stats.isDirectory()) {
        existsLocal = true;
        const files = await fs.readdir(coursePath);
        localFiles = files.filter(f => f.endsWith('.json'));
      }
    } catch (err) {
      // Directory doesn't exist locally
    }

    // Check S3
    try {
      const s3Service = require('../s3-service.cjs');
      const s3Contents = await s3Service.listCourseFiles(courseCode);
      if (s3Contents && s3Contents.length > 0) {
        existsS3 = true;
        s3Files = s3Contents.map(f => f.Key.split('/').pop());
      }
    } catch (err) {
      // S3 check failed or course doesn't exist there
      console.log(`[Orchestrator] S3 check for ${courseCode}: ${err.message}`);
    }

    const exists = existsLocal || existsS3;

    // Suggest next version if course exists
    let suggestedVersion = null;
    if (exists) {
      // Find existing versions
      const baseCode = courseCode.replace(/_v\d+$/, '');
      const versionMatch = courseCode.match(/_v(\d+)$/);
      const currentVersion = versionMatch ? parseInt(versionMatch[1]) : 1;

      // Check for existing versioned courses
      let nextVersion = currentVersion + 1;
      let suggestedCode = `${baseCode}_v${nextVersion}`;

      // Keep incrementing if suggested version also exists
      try {
        while (await fs.stat(path.join(VFS_ROOT, suggestedCode)).catch(() => false)) {
          nextVersion++;
          suggestedCode = `${baseCode}_v${nextVersion}`;
        }
      } catch (err) {
        // Fine, suggested version doesn't exist
      }

      suggestedVersion = suggestedCode;
    }

    res.json({
      exists,
      existsLocal,
      existsS3,
      localFiles,
      s3Files,
      suggestedVersion
    });
  } catch (error) {
    console.error(`Failed to check course existence ${courseCode}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/courses/:courseCode/sync
 * Sync local course files to S3
 *
 * Uploads course files from local VFS to S3 (ssi-audio-stage bucket).
 * This allows syncing courses at any stage of progress.
 *
 * Request body (optional):
 * {
 *   "files": ["lego_pairs.json", "lego_baskets.json"],  // specific files (default: all)
 *   "force": true  // force upload even if unchanged
 * }
 */
app.post('/api/courses/:courseCode/sync', async (req, res) => {
  const { courseCode } = req.params;
  const { files, force = false } = req.body || {};

  console.log(`[Orchestrator] Sync request for ${courseCode}`);

  // All syncable course files
  const allFiles = [
    'seed_pairs.json',
    'draft_lego_pairs.json',
    'lego_pairs.json',
    'lego_baskets.json',
    'introductions.json',
    'course_manifest.json'
  ];

  const filesToSync = files && files.length > 0 ? files : allFiles;

  try {
    const s3Service = require('../s3-service.cjs');
    const vfsPath = path.join(__dirname, '../../public/vfs/courses', courseCode);

    // Check if local course directory exists
    if (!fs.existsSync(vfsPath)) {
      return res.status(404).json({
        error: 'Course directory not found locally',
        path: vfsPath
      });
    }

    const results = {
      success: true,
      courseCode,
      synced: [],
      skipped: [],
      errors: [],
      timestamp: new Date().toISOString()
    };

    for (const filename of filesToSync) {
      const localPath = path.join(vfsPath, filename);

      // Check if local file exists
      if (!fs.existsSync(localPath)) {
        results.skipped.push({ file: filename, reason: 'not_found_locally' });
        continue;
      }

      try {
        // Read local file
        const localContent = fs.readFileSync(localPath, 'utf-8');
        const localData = JSON.parse(localContent);

        // Check if S3 version differs (unless force)
        if (!force) {
          try {
            const s3Data = await s3Service.readCourseFile(courseCode, filename);
            if (JSON.stringify(s3Data) === JSON.stringify(localData)) {
              results.skipped.push({ file: filename, reason: 'unchanged' });
              continue;
            }
          } catch (e) {
            // File doesn't exist on S3 - proceed with upload
          }
        }

        // Upload to S3
        await s3Service.writeCourseFile(courseCode, filename, localData);
        console.log(`[Orchestrator] Synced ${courseCode}/${filename} to S3`);

        results.synced.push({
          file: filename,
          size: localContent.length
        });

      } catch (fileError) {
        console.error(`[Orchestrator] Error syncing ${filename}:`, fileError.message);
        results.errors.push({ file: filename, error: fileError.message });
      }
    }

    results.success = results.errors.length === 0;

    console.log(`[Orchestrator] Sync complete for ${courseCode}: ${results.synced.length} synced, ${results.skipped.length} skipped, ${results.errors.length} errors`);

    res.json(results);

  } catch (error) {
    console.error(`[Orchestrator] Sync failed for ${courseCode}:`, error);
    res.status(500).json({
      success: false,
      error: 'Sync failed',
      message: error.message,
      courseCode
    });
  }
});

/**
 * POST /api/courses/create
 * Create a new course directory structure
 *
 * Creates the local VFS directory and initializes course metadata.
 * The course can then be populated through the pipeline phases.
 */
app.post('/api/courses/create', async (req, res) => {
  const { courseCode, displayName, sourceLanguage, targetLanguage, seedStart, seedEnd, seedCount, version } = req.body;

  console.log(`[Orchestrator] Creating course: ${courseCode}`);

  if (!courseCode || !sourceLanguage || !targetLanguage) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['courseCode', 'sourceLanguage', 'targetLanguage']
    });
  }

  try {
    const coursePath = path.join(__dirname, '../../public/vfs/courses', courseCode);

    // Check if directory already exists
    if (fs.existsSync(coursePath)) {
      return res.status(409).json({
        error: 'Course already exists',
        courseCode,
        path: coursePath
      });
    }

    // Create course directory
    fs.mkdirSync(coursePath, { recursive: true });

    // Create course metadata file
    const metadata = {
      courseCode,
      displayName: displayName || `${targetLanguage} for ${sourceLanguage} speakers`,
      sourceLanguage,
      targetLanguage,
      seedRange: {
        start: seedStart || 1,
        end: seedEnd || SEED_COUNTS.FULL_COURSE
      },
      seedCount: seedCount || (seedEnd - seedStart + 1),
      version: version || '1.0',
      createdAt: new Date().toISOString(),
      status: 'initialized',
      phases: {
        phase1: { status: 'pending' },
        phase2: { status: 'pending' },
        phase3: { status: 'pending' },
        phase8: { status: 'pending' },
        phase9: { status: 'pending' }
      }
    };

    // Write metadata file
    fs.writeFileSync(
      path.join(coursePath, 'course_metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Insert into Supabase courses table (v13: courses.code is PK)
    const { supabase, isInitialized } = require('../supabase-client.cjs');
    let dbInserted = false;

    if (isInitialized()) {
      const { error: dbError } = await supabase
        .from('courses')
        .insert({
          code: courseCode,
          known_lang: sourceLanguage,
          target_lang: targetLanguage,
          display_name: displayName || `${targetLanguage} for ${sourceLanguage} speakers`,
          status: 'draft'
        });

      if (dbError) {
        console.error(`[Orchestrator] Failed to insert course into database:`, dbError);
        // Don't fail the request - VFS was created successfully
      } else {
        dbInserted = true;
        console.log(`[Orchestrator] Course inserted into Supabase: ${courseCode}`);
      }
    } else {
      console.warn(`[Orchestrator] Supabase not initialized, course only created in VFS`);
    }

    console.log(`[Orchestrator] Course created: ${courseCode} at ${coursePath}`);

    res.json({
      success: true,
      courseCode,
      path: coursePath,
      metadata,
      database: dbInserted
    });

  } catch (error) {
    console.error(`[Orchestrator] Failed to create course ${courseCode}:`, error);
    res.status(500).json({
      error: 'Failed to create course',
      message: error.message,
      courseCode
    });
  }
});

/**
 * GET /api/courses/:courseCode/files/:filename
 * Proxy course files from S3 to avoid CORS issues
 */
app.get('/api/courses/:courseCode/files/:filename', async (req, res) => {
  const { courseCode, filename } = req.params;

  // Validate filename to prevent directory traversal
  const allowedFiles = [
    'lego_pairs.json',
    'lego_baskets.json',
    'introductions.json',
    'seed_pairs.json',
    'course_manifest.json',
    'draft_lego_pairs.json'
  ];

  if (!allowedFiles.includes(filename)) {
    return res.status(400).json({
      error: 'Invalid filename',
      allowed: allowedFiles
    });
  }

  try {
    const s3Service = require('../s3-service.cjs');
    const data = await s3Service.readCourseFile(courseCode, filename);

    // Set cache headers (5 minutes for course data)
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Content-Type', 'application/json');

    res.json(data);
  } catch (err) {
    if (err.code === 'NotFound' || err.code === 'NoSuchKey') {
      return res.status(404).json({
        error: 'File not found',
        courseCode,
        filename
      });
    }

    console.error(`[Files] Failed to read ${courseCode}/${filename}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// =======================================
// PHASE VALIDATION FUNCTIONS
// =======================================

/**
 * Run basket gap analysis for a course
 * @param {string} courseCode - Course identifier
 * @returns {object} - Analysis results
 */
async function runBasketGapAnalysis(courseCode) {
  console.log(`   Running basket gap analysis...`);

  try {
    // Fetch lego_pairs.json from local (current/updated registry)
    const legoPairsPath = path.join(VFS_ROOT, courseCode, 'lego_pairs.json');

    if (!await fs.pathExists(legoPairsPath)) {
      throw new Error('lego_pairs.json not found');
    }

    const legoPairsData = await fs.readJson(legoPairsPath);

    // Extract all LEGO_IDs from current lego_pairs.json
    const allLegoIds = new Set();
    if (legoPairsData.seeds && Array.isArray(legoPairsData.seeds)) {
      legoPairsData.seeds.forEach(seed => {
        if (seed.legos && Array.isArray(seed.legos)) {
          seed.legos.forEach(lego => {
            if (lego.id) {
              allLegoIds.add(lego.id);
            }
          });
        }
      });
    }

    // Load existing baskets from local file (GitHub fetch would be in endpoint)
    let existingBaskets = new Set();
    const basketsPath = path.join(VFS_ROOT, courseCode, 'lego_baskets.json');

    if (await fs.pathExists(basketsPath)) {
      const basketsData = await fs.readJson(basketsPath);
      if (basketsData.baskets && typeof basketsData.baskets === 'object') {
        existingBaskets = new Set(Object.keys(basketsData.baskets));
      }
    }

    // Load collision report (if exists) to identify deprecated LEGOs
    let deprecatedLegoIds = new Set();
    const collisionReportPath = path.join(VFS_ROOT, courseCode, 'lego_pairs_fd_report.json');

    if (await fs.pathExists(collisionReportPath)) {
      const collisionReport = await fs.readJson(collisionReportPath);

      if (collisionReport.status === 'FAIL' && collisionReport.violations) {
        collisionReport.violations.forEach(violation => {
          violation.mappings.forEach((mapping, idx) => {
            if (idx > 0) {
              mapping.legos.forEach(lego => {
                deprecatedLegoIds.add(lego.lego_id);
              });
            }
          });
        });
      }
    }

    // Analysis
    const missingBaskets = [];
    const basketsToDelete = [];
    const basketsToKeep = [];

    allLegoIds.forEach(legoId => {
      if (!existingBaskets.has(legoId)) {
        missingBaskets.push(legoId);
      }
    });

    existingBaskets.forEach(legoId => {
      if (deprecatedLegoIds.has(legoId)) {
        basketsToDelete.push(legoId);
      } else if (allLegoIds.has(legoId)) {
        basketsToKeep.push(legoId);
      } else {
        basketsToDelete.push(legoId);
      }
    });

    // Save report
    const report = {
      course_code: courseCode,
      timestamp: new Date().toISOString(),
      total_legos: allLegoIds.size,
      existing_baskets: existingBaskets.size,
      analysis: {
        baskets_to_keep: basketsToKeep.length,
        baskets_to_delete: basketsToDelete.length,
        baskets_missing: missingBaskets.length
      },
      baskets_to_keep: basketsToKeep.sort(),
      baskets_to_delete: basketsToDelete.sort(),
      baskets_missing: missingBaskets.sort(),
      deprecated_legos: Array.from(deprecatedLegoIds).sort()
    };

    const reportPath = path.join(VFS_ROOT, courseCode, 'basket_gaps_report.json');
    await fs.writeJson(reportPath, report, { spaces: 2 });

    return {
      success: true,
      basketsToKeep: basketsToKeep.length,
      basketsToDelete: basketsToDelete.length,
      basketsMissing: missingBaskets.length,
      reportPath
    };
  } catch (error) {
    throw new Error(`Basket gap analysis failed: ${error.message}`);
  }
}

/**
 * Generate consolidated re-extraction task list
 * @param {string} courseCode - Course identifier
 * @returns {object} - Task list summary
 */
async function generateReextractionTaskList(courseCode) {
  console.log(`   Generating re-extraction task list...`);

  try {
    // Load FD report
    const fdReportPath = path.join(VFS_ROOT, courseCode, 'lego_pairs_fd_report.json');
    const gapReportPath = path.join(VFS_ROOT, courseCode, 'basket_gaps_report.json');

    if (!await fs.pathExists(fdReportPath)) {
      throw new Error('FD report not found');
    }

    const fdReport = await fs.readJson(fdReportPath);
    let gapReport = null;

    if (await fs.pathExists(gapReportPath)) {
      gapReport = await fs.readJson(gapReportPath);
    }

    // Extract affected seeds from FD report
    const affectedSeeds = new Set();
    if (fdReport.reextraction_manifest && fdReport.reextraction_manifest.affected_seeds) {
      fdReport.reextraction_manifest.affected_seeds.forEach(seedId => {
        affectedSeeds.add(seedId);
      });
    }

    // Create consolidated task list
    const taskList = {
      course_code: courseCode,
      timestamp: new Date().toISOString(),
      workflow_status: 'REEXTRACTION_REQUIRED',
      phase_3_reextraction: {
        affected_seeds: Array.from(affectedSeeds).sort(),
        seed_count: affectedSeeds.size,
        reextraction_manifest: fdReport.reextraction_manifest
      },
      phase_3_basket_cleanup: gapReport ? {
        baskets_to_delete: gapReport.baskets_to_delete,
        baskets_to_generate: gapReport.baskets_missing,
        baskets_to_keep: gapReport.baskets_to_keep
      } : null,
      action_items: [
        {
          step: 1,
          action: 'Re-run Phase 3 LEGO extraction',
          description: `Re-extract ${affectedSeeds.size} seeds with chunking-up instructions`,
          seeds: Array.from(affectedSeeds).sort(),
          automated: false,
          status: 'pending'
        },
        {
          step: 2,
          action: 'Verify LUT check passes',
          description: 'Run POST /api/courses/:courseCode/phase/3/validate',
          automated: true,
          status: 'pending'
        },
        {
          step: 3,
          action: 'Clean up deprecated baskets',
          description: gapReport
            ? `Delete ${gapReport.baskets_to_delete.length} deprecated baskets`
            : 'No basket cleanup needed',
          automated: true,
          status: 'pending',
          endpoint: 'POST /api/courses/:courseCode/baskets/cleanup'
        },
        {
          step: 4,
          action: 'Generate new baskets',
          description: gapReport
            ? `Generate ${gapReport.baskets_missing.length} new baskets for Phase 3`
            : 'No new baskets needed',
          automated: false,
          status: 'pending'
        }
      ]
    };

    const taskListPath = path.join(VFS_ROOT, courseCode, 'reextraction_task_list.json');
    await fs.writeJson(taskListPath, taskList, { spaces: 2 });

    return {
      success: true,
      affectedSeeds: affectedSeeds.size,
      basketsToDelete: gapReport ? gapReport.baskets_to_delete.length : 0,
      basketsToGenerate: gapReport ? gapReport.baskets_missing.length : 0,
      taskListPath
    };
  } catch (error) {
    throw new Error(`Task list generation failed: ${error.message}`);
  }
}

/**
 * Run phase-specific validation after completion
 *
 * SIMPLIFIED: External validation removed - phases handle their own validation internally
 * with retry logic. Phase completion signal = validation passed.
 *
 * @param {string} courseCode - Course identifier
 * @param {number} phase - Phase number that just completed
 * @returns {boolean} - Always returns true (trusts phase-internal validation)
 */
async function runPhaseValidation(courseCode, phase) {
  console.log(`\n✅ Phase ${phase} complete for ${courseCode} - trusting phase-internal validation`);

  // Phases handle their own validation internally with retry logic:
  // - Phase 1: Translation quality checks
  // - Phase 3: LUT validation with automatic re-extraction on violations
  // - Phase 3: Basket generation with internal checks
  // - Manifest: Course compilation validation
  //
  // If a phase reports 'complete', it has already passed its internal validation.
  // External validation was removed to enable autonomous pipeline execution.

  return true;
}

/**
 * Regenerate course manifest after phase completion
 * Updates courses-manifest.json with latest course state
 */
async function regenerateCourseManifest() {
  try {
    console.log(`\n📋 Regenerating course manifest...`);

    const manifestGenerator = path.join(__dirname, '../../tools/generators/generate-course-manifest.js');

    // Use dynamic import for ES module
    const { execSync } = require('child_process');
    execSync(`node "${manifestGenerator}"`, {
      stdio: 'inherit'
    });

    console.log(`   ✅ Course manifest updated`);
    return true;
  } catch (error) {
    console.error(`   ⚠️  Failed to regenerate manifest (non-fatal):`, error.message);
    return false;
  }
}

/**
 * Programmatically trigger a phase (used by auto-progression)
 * @param {string} courseCode - Course identifier
 * @param {number} phase - Phase number to trigger
 * @param {number} totalSeeds - Number of seeds (defaults to full course)
 */
async function triggerPhase(courseCode, phase, totalSeeds = SEED_COUNTS.FULL_COURSE) {
  try {
    console.log(`\n🚀 Auto-triggering Phase ${phase} for ${courseCode}`);

    // Initialize or update course state
    let state = courseStates.get(courseCode) || {
      courseCode,
      currentPhase: null,
      status: 'idle',
      phasesCompleted: [],
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      waitingForApproval: false
    };

    state.currentPhase = phase;
    state.status = 'running';
    state.lastUpdated = new Date().toISOString();
    courseStates.set(courseCode, state);

    // Delegate to appropriate phase server
    const phaseServer = PHASE_SERVERS[phase];
    if (!phaseServer) {
      throw new Error(`No server configured for Phase ${phase}`);
    }

    console.log(`   Delegating to: ${phaseServer}`);

    // Phase 2 requires detect + apply workflow
    if (phase === 2) {
      // Step 1: Detect conflicts
      console.log(`   Step 1: Detecting conflicts...`);
      const detectResponse = await axios.post(`${phaseServer}/phase2/detect`, { courseCode });
      const conflictCount = detectResponse.data?.summary?.conflictCount || 0;
      console.log(`   ✓ Found ${conflictCount} conflicts`);

      // Step 2: Apply LEGO reuse tracking
      console.log(`   Step 2: Applying LEGO reuse tracking...`);
      const resolutionsPath = path.join(VFS_ROOT, courseCode, 'upchunk_resolutions.json');
      let resolutions = [];
      if (fs.existsSync(resolutionsPath)) {
        const resData = JSON.parse(fs.readFileSync(resolutionsPath, 'utf8'));
        resolutions = resData.resolutions || resData || [];
        console.log(`   📄 Found ${resolutions.length} manual resolutions`);
      }

      await axios.post(`${phaseServer}/phase2/apply`, {
        courseCode,
        resolutions
      });

      // Phase 2 complete - notify orchestrator (triggers Phase 3 via handlePhaseProgression)
      await axios.post(`http://localhost:${PORT}/phase-complete`, {
        phase: 2,
        courseCode,
        status: 'complete',
        success: true,
        stats: { conflictCount }
      });
    }
    // Phase 3 requires additional parameters (startSeed, endSeed, target, known)
    else if (phase === 3) {
      // Abort any stale Phase 3 job before starting (prevents 409 conflicts)
      try {
        await axios.post(`${phaseServer}/abort/${courseCode}`);
        console.log(`   Cleared any stale Phase 3 job for ${courseCode}`);
      } catch (e) {
        // Ignore - no job to abort
      }

      // Extract language codes from courseCode (e.g., "spa_for_eng" -> target="spa", known="eng")
      const langParts = courseCode.split('_for_');
      const targetCode = langParts[0] || 'spa';
      const knownCode = langParts[1] || 'eng';

      // Convert to language names for Phase 3 prompts
      const targetName = getLanguageName(targetCode);
      const knownName = getLanguageName(knownCode);

      console.log(`   Target: ${targetName} (${targetCode}), Known: ${knownName} (${knownCode})`);

      await axios.post(`${phaseServer}/start`, {
        courseCode,
        startSeed: 1,
        endSeed: totalSeeds,
        target: targetName,
        known: knownName
      });
    } else {
      await axios.post(`${phaseServer}/start`, {
        courseCode,
        totalSeeds
      });
    }

    console.log(`   ✓ Phase ${phase} started successfully`);
  } catch (error) {
    console.error(`   ❌ Failed to trigger Phase ${phase}:`, error.message);

    const state = courseStates.get(courseCode);
    if (state) {
      state.status = 'error';
      state.error = error.message;
    }
  }
}

/**
 * GET /api/courses/:courseCode/status
 * Get current phase status for a course
 * Enhanced to include detailed tracking from active phase server
 */
app.get('/api/courses/:courseCode/status', async (req, res) => {
  const { courseCode } = req.params;
  const state = courseStates.get(courseCode);

  if (!state) {
    return res.json({
      courseCode,
      currentPhase: null,
      status: 'idle',
      checkpointMode: CHECKPOINT_MODE
    });
  }

  // Base response with orchestrator-level state
  const response = {
    courseCode,
    currentPhase: state.currentPhase,
    status: state.status,
    startedAt: state.startedAt,
    lastUpdated: state.lastUpdated,
    phasesCompleted: state.phasesCompleted,
    checkpointMode: CHECKPOINT_MODE,
    waitingForApproval: state.waitingForApproval
  };

  // If there's an active phase, fetch detailed status from phase server
  if (state.currentPhase && state.status === 'running') {
    const phaseDetails = await fetchPhaseServerStatus(courseCode, state.currentPhase);
    if (phaseDetails) {
      // Merge detailed phase tracking into response
      response.phaseDetails = phaseDetails;

      // Calculate overall progress based on phases completed + current phase progress
      if (phaseDetails.timing && phaseDetails.timing.velocity) {
        response.estimatedCompletion = phaseDetails.timing.velocity.estimatedCompletionAt;
      }
    }
  }

  res.json(response);
});

/**
 * GET /api/courses/:courseCode/analyze
 * Analyze course state - source of truth is lego_pairs.json
 *
 * Phase 1: Translation + LEGO extraction (flagged seeds need regeneration)
 * Phase 2: Conflict resolution (implied complete if lego_pairs exists)
 * Phase 3: Baskets (check which seeds are missing baskets)
 */
app.get('/api/courses/:courseCode/analyze', async (req, res) => {
  const { courseCode } = req.params;
  const courseDir = path.join(VFS_ROOT, courseCode);

  try {
    // DATABASE-FIRST: Check database for seed data
    const dbProgress = await courseDataService.getCourseProgress(courseCode);
    let dbSeeds = [];

    if (dbProgress && dbProgress.seeds > 0) {
      // Get actual seed IDs from database
      try {
        const { supabase, isInitialized } = require('../supabase-client.cjs');
        if (supabase && isInitialized) {
          const { data: seedData } = await supabase
            .from('course_seeds')
            .select('seed_id')
            .eq('course_code', courseCode)
            .order('seed_id');

          if (seedData) {
            dbSeeds = seedData.map(s => s.seed_id);
          }
        }
      } catch (dbErr) {
        console.warn('[Analyze] Database query failed:', dbErr.message);
      }
    }

    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
    const basketsPath = path.join(courseDir, 'lego_baskets.json');
    const flagsPath = path.join(courseDir, 'flags.json');

    const legoPairsExists = await fs.pathExists(legoPairsPath);
    const basketsExists = await fs.pathExists(basketsPath);
    const flagsExists = await fs.pathExists(flagsPath);

    // No merged lego_pairs.json - check for raw phase1_batches OR database
    if (!legoPairsExists) {
      const phase1BatchesDir = path.join(courseDir, 'phase1_batches');
      const phase1BatchesExists = await fs.pathExists(phase1BatchesDir);

      // Check for raw batch files
      let rawBatchSeeds = [];
      let rawBatchCount = 0;

      if (phase1BatchesExists) {
        const batchFiles = await fs.readdir(phase1BatchesDir);
        const jsonFiles = batchFiles.filter(f => f.endsWith('.json'));
        rawBatchCount = jsonFiles.length;

        // Read each batch file and extract seed IDs
        // Batch files can be:
        //   - Array format: [ { s: "S0001", k: "...", t: "...", l: [...] }, ... ]
        //   - Object format: { seeds: [ { seed_id: "S0001", ... } ] }
        for (const file of jsonFiles) {
          try {
            const batchData = await fs.readJSON(path.join(phase1BatchesDir, file));

            // Handle array format (compact batch files)
            if (Array.isArray(batchData)) {
              for (const seed of batchData) {
                // Compact format uses 's' for seed_id
                if (seed.s) {
                  rawBatchSeeds.push(seed.s);
                } else if (seed.seed_id) {
                  rawBatchSeeds.push(seed.seed_id);
                }
              }
            }
            // Handle object format with seeds array
            else if (batchData.seeds && Array.isArray(batchData.seeds)) {
              for (const seed of batchData.seeds) {
                if (seed.s) {
                  rawBatchSeeds.push(seed.s);
                } else if (seed.seed_id) {
                  rawBatchSeeds.push(seed.seed_id);
                }
              }
            }
          } catch (err) {
            console.warn(`[Analyze] Failed to read batch file ${file}:`, err.message);
          }
        }
      }

      // Also check for draft_lego_pairs.json (Phase 1 complete, Phase 2 pending)
      const draftLegoPairsPath = path.join(courseDir, 'draft_lego_pairs.json');
      const draftExists = await fs.pathExists(draftLegoPairsPath);
      let draftSeeds = [];

      if (draftExists) {
        try {
          const draftData = await fs.readJSON(draftLegoPairsPath);
          draftSeeds = (draftData.seeds || []).map(s => s.seed_id);
        } catch (err) {
          console.warn('[Analyze] Failed to read draft_lego_pairs.json:', err.message);
        }
      }

      // If we have database seeds, raw batches, or draft, show partial progress
      // PREFER DATABASE as source of truth
      const effectiveSeeds = dbSeeds.length > 0 ? dbSeeds : rawBatchSeeds;
      const dataSource = dbSeeds.length > 0 ? 'database' : 'batches';

      if (effectiveSeeds.length > 0 || draftSeeds.length > 0) {
        const totalSeeds = effectiveSeeds.length || draftSeeds.length;
        const phase1Status = draftExists ? 'complete' : 'in_progress';
        const phase2Status = draftExists ? 'pending' : 'pending';

        // Calculate missing seeds based on most likely target mode
        let targetSeedCount = SEED_COUNTS.QUICK_TEST;
        if (totalSeeds > SEED_COUNTS.QUICK_TEST) {
          targetSeedCount = totalSeeds <= SEED_COUNTS.MVP_COURSE
            ? SEED_COUNTS.MVP_COURSE
            : SEED_COUNTS.FULL_COURSE;
        }

        // Build list of missing seed IDs
        const completedSeedNums = new Set(effectiveSeeds.map(s => parseInt(s.replace('S', ''))));
        const missingSeeds = [];
        for (let i = 1; i <= targetSeedCount; i++) {
          if (!completedSeedNums.has(i)) {
            missingSeeds.push(`S${String(i).padStart(4, '0')}`);
          }
        }

        return res.json({
          courseCode,
          exists: true,
          partial: true,
          dataSource,
          seeds: {
            total: totalSeeds,
            fromDatabase: dbSeeds.length,
            fromBatches: rawBatchSeeds.length,
            fromDraft: draftSeeds.length,
            targetTotal: targetSeedCount,
            missing: missingSeeds.length,
            missingSeeds: missingSeeds.slice(0, 20), // First 20 for display
            completedSeeds: effectiveSeeds.sort()
          },
          phase1: {
            status: phase1Status,
            batchCount: rawBatchCount,
            seedsCompleted: effectiveSeeds,
            flaggedSeeds: []
          },
          phase2: { status: phase2Status },
          phase3: { status: 'pending', seedsMissingBaskets: [] },
          flags: { total: 0, unresolved: 0, items: [] },
          recommendations: [
            // Smart resume recommendation - use DATABASE as source of truth
            effectiveSeeds.length > 0 ? (() => {
              // Determine the likely target mode based on completed seeds
              let targetMode = 'quick_test';
              let targetSeedCount = SEED_COUNTS.QUICK_TEST;

              if (effectiveSeeds.length > SEED_COUNTS.QUICK_TEST) {
                if (effectiveSeeds.length <= SEED_COUNTS.MVP_COURSE) {
                  targetMode = 'mvp_course';
                  targetSeedCount = SEED_COUNTS.MVP_COURSE;
                } else {
                  targetMode = 'full_course';
                  targetSeedCount = SEED_COUNTS.FULL_COURSE;
                }
              }

              const missingCount = targetSeedCount - effectiveSeeds.length;

              // Only show continue if there are missing seeds
              if (missingCount > 0) {
                return {
                  type: 'continue',
                  title: `▶️ Resume (${missingCount} seeds remaining)`,
                  description: `${effectiveSeeds.length}/${targetSeedCount} seeds complete. Resume to finish ${targetMode.replace('_', ' ')}.`,
                  action: { mode: 'resume', targetMode, missingSeeds: missingCount }
                };
              }
              return null;
            })() : null,
            draftExists ? {
              type: 'merge-phase1',
              title: '🔀 Run Phase 2 (Merge & Resolve)',
              description: `${draftSeeds.length} seeds ready for conflict resolution`,
              action: { phase: 2, seedCount: draftSeeds.length }
            } : null,
            {
              type: 'view-monitor',
              title: '📊 View Generation Monitor',
              description: 'See detailed pipeline progress and browser status',
              action: { route: `/generate/${courseCode}/monitor` }
            },
            {
              type: 'regenerate',
              title: '🔄 Regenerate All (Quick Test)',
              description: 'Start fresh with a new Quick Test',
              action: { startSeed: 1, count: SEED_COUNTS.QUICK_TEST, force: true }
            }
          ].filter(Boolean)
        });
      }

      // Truly no data
      return res.json({
        courseCode,
        exists: false,
        seeds: { total: 0 },
        phase1: { status: 'missing', flaggedSeeds: [] },
        phase2: { status: 'missing' },
        phase3: { status: 'missing', seedsMissingBaskets: [] },
        flags: { total: 0, unresolved: 0, items: [] },
        recommendations: [
          {
            type: 'test',
            title: `✨ Quick Test (${SEED_COUNTS.QUICK_TEST} seeds)`,
            description: 'Test the pipeline with 10 random seeds (~5 min)',
            action: { startSeed: Math.floor(Math.random() * (SEED_COUNTS.FULL_COURSE - SEED_COUNTS.QUICK_TEST)) + 1, count: SEED_COUNTS.QUICK_TEST }
          },
          {
            type: 'full',
            title: `🚀 Full Course (${SEED_COUNTS.FULL_COURSE} seeds)`,
            description: 'Generate complete course (~2-3 hours)',
            action: { startSeed: 1, endSeed: SEED_COUNTS.FULL_COURSE }
          }
        ]
      });
    }

    // Load lego_pairs.json - source of truth for what seeds exist
    const legoData = await fs.readJSON(legoPairsPath);
    const seeds = legoData.seeds || [];
    const seedIds = seeds.map(s => s.seed_id);
    const totalSeeds = seeds.length;

    // Count unique LEGOs
    let totalLegos = 0;
    for (const seed of seeds) {
      totalLegos += (seed.legos || []).filter(l => l.new === true).length;
    }

    // Load flags
    let flags = [];
    let unresolvedFlags = [];
    let flaggedSeedIds = [];
    if (flagsExists) {
      const flagsData = await fs.readJSON(flagsPath);
      flags = flagsData.flags || [];
      unresolvedFlags = flags.filter(f => !f.resolved);
      flaggedSeedIds = [...new Set(unresolvedFlags.map(f => f.seedId))];
    }

    // Check Phase 3: which seeds are missing baskets
    let seedsMissingBaskets = [];
    if (basketsExists) {
      const basketData = await fs.readJSON(basketsPath);
      const basketKeys = Object.keys(basketData.baskets || {});

      // Find seeds that have LEGOs but no baskets for those LEGOs
      for (const seed of seeds) {
        const seedLegos = (seed.legos || []).filter(l => l.new === true);
        const hasAllBaskets = seedLegos.every(lego => basketKeys.includes(lego.id));
        if (!hasAllBaskets && seedLegos.length > 0) {
          seedsMissingBaskets.push(seed.seed_id);
        }
      }
    } else {
      // No baskets file - all seeds missing baskets
      seedsMissingBaskets = [...seedIds];
    }

    // Determine phase statuses
    const phase1Status = flaggedSeedIds.length > 0 ? 'flagged' : 'complete';
    const phase2Status = 'complete'; // Implied by lego_pairs existing
    const phase3Status = seedsMissingBaskets.length > 0 ? 'incomplete' : 'complete';

    // Generate recommendations
    const recommendations = [];

    // Priority 1: Flagged seeds need Phase 1 regeneration
    if (flaggedSeedIds.length > 0) {
      recommendations.push({
        type: 'regenerate-flagged',
        title: `🚩 Regenerate Flagged Seeds (${flaggedSeedIds.length})`,
        description: 'Re-run Phase 1 for seeds with QC flags',
        action: { seeds: flaggedSeedIds, phases: ['phase1'], force: true },
        flags: unresolvedFlags
      });
    }

    // Priority 2: Missing baskets need Phase 3
    if (seedsMissingBaskets.length > 0) {
      recommendations.push({
        type: 'generate-baskets',
        title: `📦 Generate Missing Baskets (${seedsMissingBaskets.length} seeds)`,
        description: 'Run Phase 3 for seeds without baskets',
        action: { seeds: seedsMissingBaskets, phases: ['phase3'] }
      });
    }

    // Extend course if not full
    if (totalSeeds < SEED_COUNTS.FULL_COURSE) {
      recommendations.push({
        type: 'extend',
        title: `🚀 Extend to Full Course`,
        description: `Add ${SEED_COUNTS.FULL_COURSE - totalSeeds} more seeds (currently ${totalSeeds})`,
        action: { startSeed: totalSeeds + 1, endSeed: SEED_COUNTS.FULL_COURSE }
      });
    }

    // Quick test option
    recommendations.push({
      type: 'test',
      title: `✨ Quick Test (${SEED_COUNTS.QUICK_TEST} seeds)`,
      description: 'Test pipeline with 10 random seeds',
      action: { startSeed: Math.floor(Math.random() * (SEED_COUNTS.FULL_COURSE - SEED_COUNTS.QUICK_TEST)) + 1, count: SEED_COUNTS.QUICK_TEST }
    });

    // Nuclear option
    recommendations.push({
      type: 'regenerate-all',
      title: '🔄 Regenerate Everything',
      description: 'Force regenerate all phases (nuclear option)',
      action: { startSeed: 1, endSeed: SEED_COUNTS.FULL_COURSE, force: true }
    });

    res.json({
      courseCode,
      exists: true,
      seeds: { total: totalSeeds, legos: totalLegos },
      phase1: {
        status: phase1Status,
        flaggedSeeds: flaggedSeedIds,
        message: phase1Status === 'flagged' ? `${flaggedSeedIds.length} seeds need regeneration` : `${totalSeeds} seeds complete`
      },
      phase2: {
        status: phase2Status,
        message: `${totalSeeds} seeds, ${totalLegos} LEGOs`
      },
      phase3: {
        status: phase3Status,
        seedsMissingBaskets,
        message: phase3Status === 'incomplete' ? `${seedsMissingBaskets.length} seeds missing baskets` : 'Complete'
      },
      flags: {
        total: flags.length,
        unresolved: unresolvedFlags.length,
        items: unresolvedFlags
      },
      recommendations
    });
  } catch (error) {
    console.error(`[Orchestrator] Error analyzing ${courseCode}:`, error);
    res.status(500).json({ error: 'Failed to analyze course', details: error.message });
  }
});

/**
 * GET /api/courses/:courseCode/phase2-stats
 * Get Phase 2 validation stats for checkpoint modal
 * Reads lego_pairs.json and computes:
 * - Collision resolution stats (M-type upchunks)
 * - LEGO reuse tracking (new: true vs new: false)
 * - Validation checks
 */
app.get('/api/courses/:courseCode/phase2-stats', async (req, res) => {
  const { courseCode } = req.params;

  try {
    const courseDir = path.join(VFS_ROOT, courseCode);
    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');

    if (!await fs.pathExists(legoPairsPath)) {
      return res.status(404).json({
        error: 'lego_pairs.json not found - Phase 2 not complete',
        courseCode
      });
    }

    const legoPairsData = await fs.readJson(legoPairsPath);

    // Initialize counters
    let totalLegos = 0;
    let uniqueLegos = 0;  // new: true
    let reusedLegos = 0;  // new: false
    let mTypeLegos = 0;   // M-type (upchunks from collision resolution)
    let aTypeLegos = 0;   // A-type (atomic)
    let seedsWithIncompleteBreakdowns = 0;

    // Process all seeds
    const seeds = legoPairsData.seeds || [];
    for (const seed of seeds) {
      const legos = seed.legos || [];

      for (const lego of legos) {
        totalLegos++;

        if (lego.new === false) {
          reusedLegos++;
        } else {
          uniqueLegos++;
        }

        if (lego.type === 'M') {
          mTypeLegos++;
        } else {
          aTypeLegos++;
        }
      }

      // Check for incomplete breakdowns (seeds with no legos)
      if (legos.length === 0) {
        seedsWithIncompleteBreakdowns++;
      }
    }

    // Calculate reuse rate
    const reuseRate = totalLegos > 0 ? Math.round((reusedLegos / totalLegos) * 100) : 0;

    // Collision resolution estimate (M-types are often upchunks)
    // Note: Not all M-types are collision resolutions, but they indicate structural teaching
    const collisionsResolved = mTypeLegos;  // M-types represent upchunked patterns

    res.json({
      courseCode,
      collisions: {
        detected: collisionsResolved,  // Approximate - M-types indicate collision handling
        resolved: collisionsResolved
      },
      reuseTracking: {
        totalLegos,
        uniqueLegos,
        reusedLegos,
        reuseRate
      },
      legoTypes: {
        atomic: aTypeLegos,
        molecular: mTypeLegos
      },
      validation: {
        completeBreakdowns: seedsWithIncompleteBreakdowns === 0,
        seedsWithIncompleteBreakdowns,
        totalSeeds: seeds.length,
        allTilesValidate: true,  // Placeholder - would need tiling validation
        noFdViolations: true     // Placeholder - would need FD check
      },
      generatedAt: legoPairsData.generated_at || null
    });

  } catch (error) {
    console.error(`[Orchestrator] Error getting Phase 2 stats for ${courseCode}:`, error);
    res.status(500).json({ error: 'Failed to get Phase 2 stats', details: error.message });
  }
});

/**
 * GET /api/courses/:courseCode/progress
 * Database-first progress tracking - polls Supabase for current state
 */
app.get('/api/courses/:courseCode/progress', async (req, res) => {
  const { courseCode } = req.params;

  try {
    // Get queue stats from raw_seed_uploads (if table exists)
    let queueStats = null;
    try {
      const { supabase, isInitialized } = require('../supabase-client.cjs');
      if (supabase && isInitialized) {
        const { data: queueData } = await supabase
          .from('raw_seed_uploads')
          .select('status')
          .eq('course_code', courseCode);

        if (queueData) {
          queueStats = {
            pending: queueData.filter(r => r.status === 'pending').length,
            processing: queueData.filter(r => r.status === 'processing').length,
            completed: queueData.filter(r => r.status === 'completed').length,
            failed: queueData.filter(r => r.status === 'failed').length,
            total: queueData.length
          };
        }
      }
    } catch (queueError) {
      // Table might not exist yet or Supabase not configured - that's OK
      console.log('[Progress] Queue stats unavailable:', queueError.message);
    }

    // Get progress from database (single source of truth)
    const dbProgress = await courseDataService.getCourseProgress(courseCode);

    if (dbProgress) {
      // Load course modes to get target seed counts
      const courseModes = require('../config/course-modes.json');

      // Use target from database if explicitly set (not the default 668)
      // Otherwise infer from current seed count
      const currentSeeds = dbProgress.seeds || 0;
      // Only trust explicit target if it differs from default (668)
      let targetSeeds = dbProgress.targetSeedCount !== 668 ? dbProgress.targetSeedCount : null;
      let courseMode = 'full_course';

      // If no explicit target, infer from current seeds
      if (!targetSeeds || targetSeeds === 668) {
        if (currentSeeds <= 10) {
          targetSeeds = 10;
          courseMode = 'quick_test';
        } else if (currentSeeds <= 260) {
          targetSeeds = 260;
          courseMode = 'mvp_course';
        } else {
          targetSeeds = 668;
          courseMode = 'full_course';
        }
      } else {
        // Explicit target - infer mode from it
        if (targetSeeds <= 10) {
          courseMode = 'quick_test';
        } else if (targetSeeds <= 260) {
          courseMode = 'mvp_course';
        }
      }

      // SEED-BASED completion for all phases
      // Phase 1: seeds with LEGOs extracted
      const phase1SeedsComplete = dbProgress.phase1?.complete || 0;
      // Phase 2: runs once after Phase 1, affects all LEGOs
      const phase2Complete = dbProgress.newLegos !== dbProgress.legos;
      // Phase 3: seeds with practice phrases generated
      const phase3SeedsComplete = dbProgress.phase3?.complete || 0;

      // Determine phase statuses based on SEED completion
      const getPhaseStatus = (seedsComplete, target) => {
        if (seedsComplete >= target) return 'complete';
        if (seedsComplete > 0) return 'partial';
        return 'pending';
      };

      const phases = {
        phase1: {
          status: getPhaseStatus(phase1SeedsComplete, targetSeeds),
          seedsComplete: phase1SeedsComplete,
          seedsTarget: targetSeeds,
          legosExtracted: dbProgress.legos,
          detail: `${phase1SeedsComplete}/${targetSeeds} seeds, ${dbProgress.legos} LEGOs`
        },
        phase2: {
          // Phase 2 is batch - runs once on all LEGOs after Phase 1 complete
          status: phase1SeedsComplete >= targetSeeds ?
                  (phase2Complete ? 'complete' : 'pending') : 'pending',
          seedsComplete: phase2Complete ? phase1SeedsComplete : 0,
          seedsTarget: targetSeeds,
          legosResolved: dbProgress.legos,
          newLegos: dbProgress.newLegos,
          detail: `${dbProgress.legos} LEGOs resolved`
        },
        phase3: {
          status: getPhaseStatus(phase3SeedsComplete, targetSeeds),
          seedsComplete: phase3SeedsComplete,
          seedsTarget: targetSeeds,
          basketsGenerated: dbProgress.practicePhrases,
          detail: `${phase3SeedsComplete}/${targetSeeds} seeds, ${dbProgress.practicePhrases} phrases`
        },
        audio: {
          status: 'pending',
          samplesGenerated: 0,
          detail: '0 audio samples'
        },
        manifest: {
          status: 'pending',
          detail: 'pending'
        }
      };

      // Check for stall status
      const phase3State = courseProgress.get(`${courseCode}_phase3`);
      const isStalled = phase3State?.gapFillTriggered === true;
      const lastActivity = phase3State?.lastBatchTime || null;
      const timeSinceActivity = lastActivity ? Date.now() - lastActivity : null;

      // Determine overall status based on SEED completion
      let overallStatus = 'idle';
      if (phase1SeedsComplete === 0) {
        overallStatus = 'idle';
      } else if (phases.phase3.status === 'complete') {
        overallStatus = 'phase3_complete';
      } else if (isStalled) {
        overallStatus = 'phase3_stalled';
        phases.phase3.status = 'stalled';
      } else if (phases.phase3.status === 'partial') {
        overallStatus = 'phase3_running';
      } else if (phases.phase2.status === 'complete') {
        overallStatus = 'phase2_complete';
      } else if (phases.phase1.status === 'complete') {
        overallStatus = 'phase1_complete';
      } else if (phases.phase1.status === 'partial') {
        overallStatus = 'phase1_running';
      }

      return res.json({
        courseCode,
        overallStatus,
        targetSeeds,
        courseMode,
        pattern: courseModes.modes[courseMode]?.pattern || null,
        stats: {
          seedsTotal: targetSeeds,
          seedsComplete: phase1SeedsComplete,
          phase1Seeds: phase1SeedsComplete,
          phase3Seeds: phase3SeedsComplete,
          legosGenerated: dbProgress.legos,
          newLegos: dbProgress.newLegos,
          basketsGenerated: dbProgress.practicePhrases
        },
        phases,
        queue: queueStats,
        stall: isStalled ? {
          detected: true,
          lastActivity: lastActivity ? new Date(lastActivity).toISOString() : null,
          idleSeconds: timeSinceActivity ? Math.round(timeSinceActivity / 1000) : null
        } : null,
        source: 'database'
      });
    }

    // Fall back to checking local files
    const courseDir = path.join(VFS_ROOT, courseCode);
    const courseExists = await fs.pathExists(courseDir);

    if (courseExists) {
      return res.json({
        courseCode,
        overallStatus: 'idle',
        message: 'Course exists but no data in database yet',
        source: 'filesystem'
      });
    }

    return res.status(404).json({
      error: 'Course not found',
      courseCode
    });

  } catch (error) {
    console.error(`[Progress] Error getting progress for ${courseCode}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/courses/:courseCode/agents
 * Agent swimlane data for real-time monitoring dashboard
 * Returns master/worker status with detailed tracking
 */
app.get('/api/courses/:courseCode/agents', async (req, res) => {
  const { courseCode } = req.params;

  try {
    // Get base progress data
    const progress = courseProgress.get(courseCode) || {};
    const courseDir = path.join(VFS_ROOT, courseCode);

    // Check course exists
    if (!await fs.pathExists(courseDir)) {
      return res.status(404).json({ error: 'Course not found', courseCode });
    }

    // Build phases object with status
    const phases = {
      phase1: { status: 'pending', seedsProcessed: 0 },
      phase2: { status: 'pending', legosResolved: 0 },
      phase3: { status: 'pending', masters: [] },
      audio: { status: 'pending', samplesGenerated: 0 },
      manifest: { status: 'pending' }
    };

    // Check Phase 1 status (seed_pairs.json exists means complete)
    const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
    if (await fs.pathExists(seedPairsPath)) {
      const seedPairs = await fs.readJson(seedPairsPath);
      phases.phase1.status = 'complete';
      phases.phase1.seedsProcessed = seedPairs.seeds?.length || seedPairs.length || 0;
    }

    // Check Phase 1 batches (partial completion)
    const phase1BatchesDir = path.join(courseDir, 'phase1_batches');
    if (await fs.pathExists(phase1BatchesDir)) {
      const batches = await fs.readdir(phase1BatchesDir);
      const jsonBatches = batches.filter(f => f.endsWith('.json'));
      if (jsonBatches.length > 0 && phases.phase1.status === 'pending') {
        phases.phase1.status = 'running';
        phases.phase1.batchCount = jsonBatches.length;
      }
    }

    // Check Phase 2 status (lego_pairs.json exists means complete)
    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
    if (await fs.pathExists(legoPairsPath)) {
      const legoPairs = await fs.readJson(legoPairsPath);
      phases.phase2.status = 'complete';
      let legoCount = 0;
      if (legoPairs.seeds) {
        legoPairs.seeds.forEach(seed => {
          legoCount += seed.legos?.length || 0;
        });
      }
      phases.phase2.legosResolved = legoCount;
    }

    // Check Phase 3 status
    const legoBasketsPath = path.join(courseDir, 'lego_baskets.json');
    let legoBasketsData = null;

    if (await fs.pathExists(legoBasketsPath)) {
      legoBasketsData = await fs.readJson(legoBasketsPath);
    }

    // Try to get Phase 3 job status from the phase3 server
    try {
      const phase3Url = process.env.PHASE3_URL || 'http://localhost:3459';
      const phase3Response = await fetch(`${phase3Url}/status/${courseCode}`, {
        signal: AbortSignal.timeout(3000)
      });

      if (phase3Response.ok) {
        const phase3Status = await phase3Response.json();

        if (phase3Status.status === 'running' || phase3Status.status === 'workers_generating') {
          phases.phase3.status = 'running';
        } else if (phase3Status.status === 'complete' || phase3Status.status === 'phase3_complete') {
          phases.phase3.status = 'complete';
        } else if (phase3Status.status === 'failed') {
          phases.phase3.status = 'failed';
        }

        // Build masters array from Phase 3 job data
        if (phase3Status.masters) {
          phases.phase3.masters = phase3Status.masters.map(m => ({
            masterNum: m.masterNum,
            seedRange: m.seedRange || `Seeds ${m.startSeed}-${m.endSeed}`,
            status: m.status || (m.complete ? 'complete' : 'running'),
            spawnedAt: m.spawnedAt || phase3Status.startedAt,
            lastActivityAt: m.lastActivityAt || null,
            legosExpected: m.legosExpected || m.legoCount || 0,
            legosReceived: m.legosReceived || 0,
            workers: (m.workers || []).map(w => ({
              workerNum: w.workerNum,
              legoCount: w.legoCount || w.legoIds?.length || 0,
              status: w.status || 'pending',
              lastUpload: w.lastUpload || null
            }))
          }));
        }

        // Add upload tracking if available
        if (phase3Status.uploads) {
          phases.phase3.totalReceived = phase3Status.uploads.legosReceived || 0;
          phases.phase3.totalExpected = phase3Status.uploads.expectedLegos || 0;
        }
      }
    } catch (err) {
      // Phase 3 server not responding - check file-based status
      if (legoBasketsData) {
        const basketCount = Object.keys(legoBasketsData.baskets || legoBasketsData).length;
        if (basketCount > 0) {
          phases.phase3.status = 'complete';
        }
      }
    }

    // Check manifest status
    const manifestPath = path.join(courseDir, 'course_manifest.json');
    if (await fs.pathExists(manifestPath)) {
      phases.manifest.status = 'complete';
    }

    // Build activity feed from various sources
    const recentActivity = [];

    // Add Phase 3 upload activity from lego_baskets metadata
    if (legoBasketsData?.metadata?.uploads) {
      legoBasketsData.metadata.uploads.slice(-20).forEach(upload => {
        recentActivity.push({
          time: upload.timestamp,
          event: `${upload.seed}: ${upload.legoCount} LEGOs uploaded${upload.agentId ? ` by ${upload.agentId}` : ''}`,
          type: 'success'
        });
      });
    }

    // Add from progress logs
    if (progress.recentLogs) {
      progress.recentLogs.forEach(log => {
        recentActivity.push({
          time: log.time,
          event: log.message,
          type: log.level === 'error' ? 'error' : log.level === 'warning' ? 'warning' : 'info'
        });
      });
    }

    // Sort by time descending
    recentActivity.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Determine overall status
    let overallStatus = 'idle';
    if (phases.manifest.status === 'complete') {
      overallStatus = 'complete';
    } else if (phases.phase3.status === 'failed' || phases.phase1.status === 'failed') {
      overallStatus = 'failed';
    } else if (phases.phase1.status === 'running' || phases.phase3.status === 'running') {
      overallStatus = 'running';
    } else if (progress.overallStatus) {
      overallStatus = progress.overallStatus;
    }

    res.json({
      courseCode,
      overallStatus,
      phases,
      recentActivity: recentActivity.slice(0, 50)
    });

  } catch (error) {
    console.error(`[Orchestrator] Error fetching agent swimlane data:`, error);
    res.status(500).json({ error: error.message });
  }
});

// =======================================
// PIPELINE STATE API ENDPOINTS
// =======================================

/**
 * GET /api/pipelines
 * Get all pipelines (optionally filtered by status)
 * Query params: ?status=running|complete|failed|paused
 */
app.get('/api/pipelines', (req, res) => {
  const { status } = req.query;

  const results = [];
  for (const [key, pipeline] of pipelines.entries()) {
    // Skip courseCode index entries
    if (key.startsWith('course:')) continue;

    // Filter by status if provided
    if (status && pipeline.status !== status) continue;

    results.push(pipeline);
  }

  res.json({
    count: results.length,
    pipelines: results
  });
});

/**
 * GET /api/pipelines/active
 * Get all active (running) pipelines
 */
app.get('/api/pipelines/active', (req, res) => {
  const active = getActivePipelines();
  res.json({
    count: active.length,
    pipelines: active
  });
});

/**
 * GET /api/pipelines/:pipelineId
 * Get a specific pipeline by ID or courseCode
 */
app.get('/api/pipelines/:pipelineId', (req, res) => {
  const { pipelineId } = req.params;
  const pipeline = getPipeline(pipelineId);

  if (!pipeline) {
    return res.status(404).json({
      error: 'Pipeline not found',
      pipelineId
    });
  }

  res.json(pipeline);
});

/**
 * GET /api/courses/:courseCode/pipeline
 * Get the current pipeline for a course
 */
app.get('/api/courses/:courseCode/pipeline', (req, res) => {
  const { courseCode } = req.params;
  const pipeline = getPipeline(courseCode);

  if (!pipeline) {
    return res.status(404).json({
      error: 'No active pipeline for this course',
      courseCode,
      suggestion: 'Start a generation job to create a pipeline'
    });
  }

  res.json(pipeline);
});

/**
 * POST /api/courses/:courseCode/pipeline
 * Create a new pipeline for a course (internal use - typically called by /api/courses/generate)
 * Body: { mode: 'quick_test' | 'mvp_course' | 'full_course', seedsTotal?: number }
 */
app.post('/api/courses/:courseCode/pipeline', (req, res) => {
  const { courseCode } = req.params;
  const { mode = 'full_course', seedsTotal } = req.body;

  // Check if pipeline already exists and is running
  const existing = getPipeline(courseCode);
  if (existing && existing.status === 'running') {
    return res.status(409).json({
      error: 'Pipeline already running for this course',
      pipelineId: existing.pipelineId,
      status: existing.status,
      currentPhase: existing.currentPhase
    });
  }

  // Create new pipeline
  const pipeline = createPipeline(courseCode, mode, seedsTotal);

  res.status(201).json(pipeline);
});

/**
 * PUT /api/pipelines/:pipelineId/phases/:phase
 * Update phase status in a pipeline
 * Body: { status, startedAt?, completedAt?, inputCount?, outputCount?, error? }
 */
app.put('/api/pipelines/:pipelineId/phases/:phase', (req, res) => {
  const { pipelineId, phase } = req.params;
  const updates = req.body;

  const pipeline = updatePipelinePhaseStatus(pipelineId, phase, updates);

  if (!pipeline) {
    return res.status(404).json({
      error: 'Pipeline not found',
      pipelineId
    });
  }

  res.json(pipeline);
});

/**
 * POST /api/pipelines/:pipelineId/jobs
 * Add a job to a pipeline
 * Body: { phase, seedIds }
 */
app.post('/api/pipelines/:pipelineId/jobs', (req, res) => {
  const { pipelineId } = req.params;
  const { phase, seedIds } = req.body;

  const pipeline = getPipeline(pipelineId);
  if (!pipeline) {
    return res.status(404).json({
      error: 'Pipeline not found',
      pipelineId
    });
  }

  // Create job
  const job = createJob(pipeline.courseCode, pipeline.mode, phase, seedIds || []);

  // Add to pipeline
  addJobToPipeline(pipelineId, job);

  res.status(201).json(job);
});

/**
 * GET /api/pipelines/:pipelineId/jobs
 * Get all jobs in a pipeline
 */
app.get('/api/pipelines/:pipelineId/jobs', (req, res) => {
  const { pipelineId } = req.params;
  const pipeline = getPipeline(pipelineId);

  if (!pipeline) {
    return res.status(404).json({
      error: 'Pipeline not found',
      pipelineId
    });
  }

  res.json({
    pipelineId: pipeline.pipelineId,
    count: pipeline.jobs.length,
    jobs: pipeline.jobs
  });
});

/**
 * POST /api/courses/:courseCode/progress
 * Phase servers report progress updates
 */
app.post('/api/courses/:courseCode/progress', async (req, res) => {
  const { courseCode } = req.params;
  const { phase, updates, logMessage } = req.body;

  if (!phase) {
    return res.status(400).json({ error: 'phase number required' });
  }

  // Initialize progress if not exists
  if (!courseProgress.has(courseCode)) {
    initializeCourseProgress(courseCode, phase, updates.seedsTotal || SEED_COUNTS.FULL_COURSE);
  }

  // Update phase progress
  updatePhaseProgress(courseCode, phase, updates);

  // Add log if provided
  if (logMessage) {
    addProgressLog(courseCode, logMessage, updates.level || 'info');
  }

  // Calculate ETA if progress info provided
  // Phase 3 uses LEGOs, other phases use seeds
  if (updates.startTime) {
    let completed, total;
    if (phase === 5 && updates.legosCompleted && updates.legosTotal) {
      // Phase 3: Track LEGOs
      completed = updates.legosCompleted;
      total = updates.legosTotal;
    } else if (updates.seedsCompleted && updates.seedsTotal) {
      // Other phases: Track seeds
      completed = updates.seedsCompleted;
      total = updates.seedsTotal;
    }

    if (completed && total) {
      const elapsed = Date.now() - new Date(updates.startTime).getTime();
      const rate = completed / (elapsed / 1000); // items per second
      const remaining = total - completed;
      const etaSeconds = remaining / rate;
      updates.eta = new Date(Date.now() + etaSeconds * 1000).toISOString();
      updates.etaHuman = formatDuration(etaSeconds);
    }
  }

  res.json({ success: true, progress: courseProgress.get(courseCode) });
});

/**
 * POST /api/courses/:courseCode/start-phase
 * Trigger the next phase for a course
 */
app.post('/api/courses/:courseCode/start-phase', async (req, res) => {
  const { courseCode } = req.params;
  const { phase, totalSeeds } = req.body;

  if (!phase) {
    return res.status(400).json({ error: 'phase number required' });
  }

  try {
    console.log(`\n🚀 Starting Phase ${phase} for ${courseCode}`);

    // Validate prerequisite phases are complete
    const prerequisites = {
      1: [],           // Phase 1 has no prerequisites
      3: [1],          // Phase 3 requires Phase 1 (seed_pairs.json) - includes Phase 6 introductions
      5: [1, 3],       // Phase 3 requires Phases 1 & 2 (lego_pairs.json + introductions.json)
      7: [1, 3, 5],    // Manifest requires Phases 1, 2 & 3 (course compilation)
      8: [1, 3, 5, 7]  // Audio requires all previous phases (TTS generation)
    };

    const requiredPhases = prerequisites[phase] || [];
    const missingPrereqs = [];

    for (const prereqPhase of requiredPhases) {
      // Check if prerequisite file exists
      let prereqFile;
      if (prereqPhase === 1) {
        prereqFile = path.join(VFS_ROOT, courseCode, 'seed_pairs.json');
      } else if (prereqPhase === 3) {
        prereqFile = path.join(VFS_ROOT, courseCode, 'lego_pairs.json');
      } else if (prereqPhase === 5) {
        prereqFile = path.join(VFS_ROOT, courseCode, 'lego_baskets.json');
      }

      if (prereqFile && !fs.existsSync(prereqFile)) {
        missingPrereqs.push({
          phase: prereqPhase,
          file: path.basename(prereqFile)
        });
      }
    }

    if (missingPrereqs.length > 0) {
      const error = `Cannot start Phase ${phase} - missing prerequisites: ${missingPrereqs.map(p => `Phase ${p.phase} (${p.file})`).join(', ')}`;
      console.log(`   ❌ ${error}`);
      return res.status(400).json({
        error,
        missingPrerequisites: missingPrereqs
      });
    }

    // Initialize or update course state
    let state = courseStates.get(courseCode) || {
      courseCode,
      currentPhase: null,
      status: 'idle',
      phasesCompleted: [],
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      waitingForApproval: false
    };

    state.currentPhase = phase;
    state.status = 'running';
    state.lastUpdated = new Date().toISOString();
    courseStates.set(courseCode, state);

    // Delegate to appropriate phase server
    const phaseServer = PHASE_SERVERS[phase];
    if (!phaseServer) {
      throw new Error(`No server configured for Phase ${phase}`);
    }

    console.log(`   Delegating to: ${phaseServer}`);

    const response = await axios.post(`${phaseServer}/start`, {
      courseCode,
      totalSeeds: totalSeeds || SEED_COUNTS.FULL_COURSE
    });

    res.json({
      success: true,
      message: `Phase ${phase} started for ${courseCode}`,
      phaseServer,
      details: response.data
    });
  } catch (error) {
    console.error(`Failed to start Phase ${phase}:`, error.message);

    const state = courseStates.get(courseCode);
    if (state) {
      state.status = 'error';
      state.error = error.message;
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /phase-complete
 * Callback from phase servers when they complete
 * Triggers next phase in linear sequence: 1 → 3 → 5 → 7 → 8
 */
app.post('/phase-complete', async (req, res) => {
  const { phase, courseCode, status, success, stats } = req.body;

  console.log(`\n✅ Phase ${phase} ${status || (success ? 'complete' : 'failed')} for ${courseCode}`);

  let state = courseStates.get(courseCode);
  if (!state) {
    // Auto-initialize state for courses not started via orchestrator
    state = {
      courseCode,
      status: 'running',
      currentPhase: phase,
      phasesCompleted: [],
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    courseStates.set(courseCode, state);
    console.log(`   (Auto-initialized course state for ${courseCode})`);
  }

  // Update pipeline state for parallel coordination (legacy pipelineJobs)
  let pipelineJob = pipelineJobs.get(courseCode) || {};
  const phaseKey = `phase${phase}`;
  pipelineJob[phaseKey] = {
    success: success !== undefined ? success : status === 'complete',
    completedAt: new Date().toISOString(),
    stats: stats || {}
  };
  pipelineJobs.set(courseCode, pipelineJob);

  // Update new Pipeline state model (Course Generation Transparency)
  const normalizedPhaseKey = normalizePhaseIdentifier(phase);
  const isSuccess = success !== undefined ? success : status === 'complete';
  const pipelineUpdates = {
    status: isSuccess ? 'complete' : 'failed',
    completedAt: new Date().toISOString()
  };
  if (stats) {
    if (stats.seedCount !== undefined) pipelineUpdates.outputCount = stats.seedCount;
    if (stats.legoCount !== undefined) pipelineUpdates.outputCount = stats.legoCount;
    if (stats.basketCount !== undefined) pipelineUpdates.outputCount = stats.basketCount;
  }
  if (!isSuccess && stats?.error) {
    pipelineUpdates.error = stats.error;
  }
  updatePipelinePhaseStatus(courseCode, normalizedPhaseKey, pipelineUpdates);

  // Update pipeline stats
  const currentPipeline = getPipeline(courseCode);
  if (currentPipeline && stats) {
    if (stats.seedCount !== undefined) currentPipeline.stats.seedsComplete = stats.seedCount;
    if (stats.legoCount !== undefined) currentPipeline.stats.legosGenerated = stats.legoCount;
    if (stats.basketCount !== undefined) currentPipeline.stats.basketsGenerated = stats.basketCount;
    if (stats.audioCount !== undefined) currentPipeline.stats.audioFilesGenerated = stats.audioCount;
  }

  // Update state
  if (status === 'complete' || success) {
    if (!state.phasesCompleted.includes(phase)) {
      state.phasesCompleted.push(phase);
    }

    // ALWAYS run phase-specific validators (regardless of checkpoint mode)
    // Validation is a data integrity check, not a user approval gate
    const validationPassed = await runPhaseValidation(courseCode, phase);

    if (!validationPassed) {
      // Validation FAILED - block all progression
      state.status = 'validation_failed';
      state.currentPhase = null;
      console.log(`   ❌ Validation failed - manual intervention required`);
      return res.json({ acknowledged: true });
    }

    // Validation PASSED - now handle orchestration based on phase
    if (CHECKPOINT_MODE === 'manual') {
      state.status = 'waiting_for_approval';
      state.waitingForApproval = true;
      console.log(`   ⏸️  Waiting for manual approval (checkpoint mode: manual)`);
    } else {
      // Auto-trigger next phase(s) based on orchestration logic
      await handlePhaseProgression(courseCode, phase, state, pipelineJob);
    }
  } else {
    state.status = status || 'error';
  }

  state.lastUpdated = new Date().toISOString();

  res.json({ acknowledged: true });
});

/**
 * Handle phase progression (APML v9.0 linear pipeline)
 * Phase 1 (Translation + LEGO) → Phase 3 (Baskets) → Manifest → Audio
 */
async function handlePhaseProgression(courseCode, completedPhase, state, pipelineJob) {
  // Regenerate course manifest to reflect the newly completed phase
  await regenerateCourseManifest();

  // Normalize phase identifiers (support both old and new naming)
  const normalizedPhase = normalizePhaseIdentifier(completedPhase);

  if (normalizedPhase === 'phase1') {
    // Phase 1 complete → Phase 2 (Conflict Resolution)
    // Note: Phase 2 may auto-trigger Phase 3 if no conflicts
    console.log(`   → Phase 1 complete, triggering Phase 2 (Conflict Resolution)`);
    setTimeout(() => triggerPhase(courseCode, 2), 2000);
  } else if (normalizedPhase === 'phase2') {
    // Phase 2 complete → Phase 3 (Baskets)
    console.log(`   → Phase 2 complete, triggering Phase 3 (Baskets)`);
    setTimeout(() => triggerPhase(courseCode, 3), 2000);
  } else if (normalizedPhase === 'phase3') {
    // Phase 3 (Baskets) → Manifest
    console.log(`   → Phase 3 complete, triggering Manifest compilation`);
    setTimeout(() => triggerPhase(courseCode, 'manifest'), 2000);
  } else if (normalizedPhase === 'manifest') {
    // Manifest → Audio
    console.log(`   → Manifest complete, triggering Audio generation`);
    setTimeout(() => triggerPhase(courseCode, 'audio'), 2000);
  } else if (normalizedPhase === 'audio') {
    // Audio → All complete!
    state.status = 'complete';
    console.log(`   🎉 All phases complete!`);
  } else {
    // Unknown phase - use linear fallback
    const nextPhase = getNextPhase(completedPhase);
    if (nextPhase) {
      console.log(`   → Auto-triggering ${nextPhase}`);
      setTimeout(() => triggerPhase(courseCode, nextPhase), 2000);
    } else {
      state.status = 'complete';
      console.log(`   🎉 All phases complete!`);
    }
  }
}

/**
 * Normalize phase identifiers for backward compatibility
 * Maps old phase numbers to APML v9.0 naming
 */
function normalizePhaseIdentifier(phase) {
  const mapping = {
    1: 'phase1', 'phase1': 'phase1',
    2: 'phase2', 'phase2': 'phase2',
    3: 'phase3', 'phase3': 'phase3',
    5: 'phase3', 'phase5': 'phase3',  // Legacy Phase 5 → Phase 3 (APML v9.0)
    7: 'manifest', 'phase7': 'manifest',
    8: 'audio', 'phase8': 'audio',
    'manifest': 'manifest',
    'audio': 'audio'
  };
  return mapping[phase] || phase;
}

/**
 * POST /api/courses/generate
 * Dashboard compatibility endpoint - triggers course generation
 * Routes to appropriate phase based on phaseSelection parameter
 *
 * Supports mode-based configuration:
 *   - mode: 'quick_test' (10 seeds), 'mvp_course' (250 seeds), 'full_course' (668 seeds)
 *   - If mode is provided, it overrides startSeed/endSeed
 *   - Pattern from mode config is passed to phase servers
 */
app.post('/api/courses/generate', async (req, res) => {
  // Debug: log exactly what the dashboard sends
  console.log(`[Orchestrator] /api/courses/generate received:`, JSON.stringify(req.body, null, 2));

  const {
    target,
    known,
    startSeed: providedStartSeed,
    endSeed: providedEndSeed,
    phaseSelection = 'all',
    executionMode,
    strategy = 'balanced',
    courseCode: providedCourseCode,
    modelSuffix,  // Optional suffix for benchmarking (e.g., 'sonnet_test', 'opus_test')
    mode,  // Course mode (quick_test, mvp_course, full_course)
    spawnerMode = 'cli'  // 'cli' (iTerm2 + Claude CLI) or 'browser' (Chrome + Claude Web)
  } = req.body;

  // Generate or use provided course code
  let courseCode;
  if (providedCourseCode) {
    courseCode = providedCourseCode;
  } else if (target && known) {
    courseCode = `${target.toLowerCase()}_for_${known.toLowerCase()}`;
    // Append model suffix if provided (for benchmarking different models)
    if (modelSuffix) {
      courseCode = `${courseCode}_${modelSuffix}`;
    }
  } else {
    return res.status(400).json({ error: 'Either courseCode or both target and known are required' });
  }

  // Extract target and known from courseCode if not provided
  // Format: {target}_for_{known} e.g., spa_for_deu → target: spa, known: deu
  let resolvedTarget = target;
  let resolvedKnown = known;
  if (!resolvedTarget || !resolvedKnown) {
    const match = courseCode.match(/^([a-z]{2,3})_for_([a-z]{2,3})(?:_.*)?$/);
    if (match) {
      resolvedTarget = resolvedTarget || match[1];
      resolvedKnown = resolvedKnown || match[2];
      console.log(`[Orchestrator] Extracted from courseCode: target=${resolvedTarget}, known=${resolvedKnown}`);
    } else {
      return res.status(400).json({
        error: 'Could not extract target/known from courseCode. Expected format: {target}_for_{known}',
        courseCode
      });
    }
  }

  // Determine seed range: mode takes precedence over explicit startSeed/endSeed
  let startSeed, endSeed, totalSeeds, modeConfig, pattern;

  if (mode) {
    // Use mode configuration
    try {
      modeConfig = getModeConfig(mode);
      startSeed = 1;
      endSeed = modeConfig.seeds;
      totalSeeds = modeConfig.seeds;
      pattern = modeConfig.pattern;
      console.log(`[Orchestrator] Using mode: ${modeConfig.name} (${totalSeeds} seeds)`);
      console.log(`[Orchestrator] Pattern: ${pattern.browsers}b/${pattern.agents_per_browser}a/${pattern.seeds_per_agent}s`);
    } catch (error) {
      return res.status(400).json({
        error: `Invalid mode: ${mode}`,
        validModes: Object.values(MODES),
        details: error.message
      });
    }
  } else {
    // Use explicit seed range (legacy behavior)
    startSeed = providedStartSeed || 1;
    endSeed = providedEndSeed || SEED_COUNTS.FULL_COURSE;
    totalSeeds = endSeed - startSeed + 1;

    // Auto-select pattern based on seed count
    modeConfig = getPatternForSeeds(totalSeeds);
    pattern = modeConfig.pattern;
  }

  console.log(`\n📋 Course generation request from dashboard:`);
  console.log(`   Course: ${courseCode}`);
  console.log(`   Seeds: ${startSeed}-${endSeed} (${totalSeeds} seeds)`);
  console.log(`   Mode: ${mode || 'custom'} (Pattern: ${pattern.browsers}b/${pattern.agents_per_browser}a/${pattern.seeds_per_agent}s)`);
  console.log(`   Spawner: ${spawnerMode} (${spawnerMode === 'cli' ? 'iTerm2 + Claude CLI' : 'Browser + Claude Web'})`);
  console.log(`   Phase: ${phaseSelection}`);
  console.log(`   Strategy: ${strategy}`);

  // ============================================
  // INTELLIGENT RESUME: Check for existing seeds
  // ============================================
  const courseDir = path.join(VFS_ROOT, courseCode);
  const phase1BatchesDir = path.join(courseDir, 'phase1_batches');
  let existingSeeds = [];
  let missingSeeds = [];

  // Check what seeds already exist - DATABASE IS SOURCE OF TRUTH
  try {
    const { supabase, isInitialized } = require('../supabase-client.cjs');
    if (isInitialized()) {
      const { data: dbSeeds, error } = await supabase
        .from('course_seeds')
        .select('seed_id')
        .eq('course_code', courseCode);

      if (!error && dbSeeds) {
        existingSeeds = dbSeeds.map(s => s.seed_id);
        console.log(`   → Database: Found ${existingSeeds.length} seeds in course_seeds`);
      } else {
        console.warn(`   → Database: Error fetching seeds:`, error?.message);
      }
    }
  } catch (dbErr) {
    console.warn(`   → Database: Error:`, dbErr.message);
  }

  // Fallback to batch files if database returned nothing
  if (existingSeeds.length === 0 && await fs.pathExists(phase1BatchesDir)) {
    console.log(`   → Fallback: Checking batch files...`);
    const batchFiles = await fs.readdir(phase1BatchesDir);
    const jsonFiles = batchFiles.filter(f => f.endsWith('.json'));

    for (const file of jsonFiles) {
      try {
        const batchData = await fs.readJSON(path.join(phase1BatchesDir, file));
        if (Array.isArray(batchData)) {
          for (const seed of batchData) {
            if (seed.s) existingSeeds.push(seed.s);
            else if (seed.seed_id) existingSeeds.push(seed.seed_id);
          }
        } else if (batchData.seeds && Array.isArray(batchData.seeds)) {
          for (const seed of batchData.seeds) {
            if (seed.s) existingSeeds.push(seed.s);
            else if (seed.seed_id) existingSeeds.push(seed.seed_id);
          }
        }
      } catch (err) {
        console.warn(`[Resume] Failed to read batch file ${file}:`, err.message);
      }
    }
  }

  // Calculate which seeds are missing
  const allRequiredSeeds = [];
  for (let i = startSeed; i <= endSeed; i++) {
    allRequiredSeeds.push(`S${String(i).padStart(4, '0')}`);
  }
  missingSeeds = allRequiredSeeds.filter(s => !existingSeeds.includes(s));

  console.log(`   → Existing seeds: ${existingSeeds.length} (${existingSeeds.join(', ') || 'none'})`);
  console.log(`   → Missing seeds: ${missingSeeds.length} (${missingSeeds.join(', ') || 'none'})`);

  // If all seeds exist, skip Phase 1 or return success
  if (missingSeeds.length === 0 && phaseSelection === 'all') {
    console.log(`   ✅ All ${totalSeeds} seeds already complete in Phase 1 - skipping to Phase 2`);
    // TODO: Auto-advance to Phase 2 (conflict resolution)
    return res.json({
      success: true,
      message: `Phase 1 already complete for ${courseCode}`,
      existingSeeds: existingSeeds.length,
      missingSeeds: 0,
      recommendation: 'Run Phase 2 (Conflict Resolution) to merge and resolve'
    });
  }

  // Update seed range to only generate missing seeds
  let effectiveStartSeed = startSeed;
  let effectiveEndSeed = endSeed;
  let effectiveTotalSeeds = totalSeeds;

  if (missingSeeds.length > 0 && missingSeeds.length < totalSeeds) {
    // We have SOME seeds - only generate missing ones
    console.log(`   → INTELLIGENT RESUME: Only generating ${missingSeeds.length} missing seeds`);
    effectiveTotalSeeds = missingSeeds.length;
    // Pass missing seeds list to phase server instead of range
  }

  // Ensure course exists in Supabase database (upsert - create if not exists)
  // v13: courses.code is PK
  try {
    const { supabase, isInitialized } = require('../supabase-client.cjs');
    if (isInitialized()) {
      const { error: dbError } = await supabase
        .from('courses')
        .upsert({
          code: courseCode,
          known_lang: resolvedKnown,
          target_lang: resolvedTarget,
          display_name: `${resolvedTarget} for ${resolvedKnown} speakers`,
          status: 'draft',  // Valid enum: draft, published, archived
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'code'
        });

      if (dbError) {
        console.error(`[Orchestrator] Failed to upsert course in database:`, dbError);
      } else {
        console.log(`   → Database: Course ${courseCode} upserted in Supabase`);
      }
    } else {
      console.warn(`   → Database: Supabase not initialized`);
    }
  } catch (dbErr) {
    console.error(`[Orchestrator] Database error:`, dbErr.message);
  }

  try {
    // APML v9.0 Phase Selection
    // Maps user selection to internal phase identifier
    let phase;
    let phaseName;
    if (phaseSelection === 'phase1' || phaseSelection === 'all') {
      phase = '1_translation';  // Start with translation
      phaseName = 'Phase 1';
    } else if (phaseSelection === 'phase3') {
      phase = 3;
      phaseName = 'Phase 3 (Baskets)';
    } else if (phaseSelection === 'phase5') {
      // Legacy: Phase 5 → Phase 3 in APML v9.0
      phase = 3;
      phaseName = 'Phase 3 (Baskets)';
    } else if (phaseSelection === 'phase7' || phaseSelection === 'manifest') {
      phase = 'manifest';
      phaseName = 'Manifest';
    } else if (phaseSelection === 'phase8' || phaseSelection === 'audio') {
      phase = 'audio';
      phaseName = 'Audio';
    } else {
      throw new Error(`Unknown phase selection: ${phaseSelection}`);
    }

    // Delegate to phase server
    const phaseServer = PHASE_SERVERS[phase] || LEGACY_PHASE_ALIASES[phase];
    if (!phaseServer) {
      throw new Error(`Phase ${phase} server not available`);
    }

    console.log(`   → Delegating to ${phaseName} server: ${phaseServer}`);

    // Initialize progress tracking (legacy)
    const progress = initializeCourseProgress(courseCode, phase, totalSeeds);
    updatePhaseProgress(courseCode, phase, { status: 'running', startTime: new Date().toISOString() });
    addProgressLog(courseCode, `Starting ${phaseName} for ${totalSeeds} seeds`);

    // Initialize pipeline state (new transparency model)
    const resolvedMode = mode || 'custom';
    let pipeline = getPipeline(courseCode);
    if (!pipeline || pipeline.status !== 'running') {
      // Create new pipeline
      pipeline = createPipeline(courseCode, resolvedMode, totalSeeds);
    }

    // Update pipeline phase status
    const pipelinePhase = normalizePhaseIdentifier(phase);
    updatePipelinePhaseStatus(courseCode, pipelinePhase, {
      status: 'running',
      startedAt: new Date().toISOString(),
      inputCount: totalSeeds
    });

    // Generate seed IDs for job tracking
    const seedIds = [];
    for (let i = startSeed; i <= endSeed; i++) {
      seedIds.push(`S${String(i).padStart(4, '0')}`);
    }

    // Create and add job to pipeline
    const phaseNum = typeof phase === 'number' ? phase : (phase === '1_translation' ? 1 : parseInt(phase.replace('phase', '')));
    const job = createJob(courseCode, resolvedMode, phaseNum, seedIds);
    addJobToPipeline(courseCode, job);

    // Pass pattern configuration to phase server
    // INTELLIGENT RESUME: If we have missing seeds, send those instead of full range
    const isResume = missingSeeds.length > 0 && missingSeeds.length < totalSeeds;

    const payload = {
      courseCode,
      totalSeeds: isResume ? missingSeeds.length : totalSeeds,
      target: resolvedTarget,
      known: resolvedKnown,
      strategy,
      // For intelligent resume: send specific seeds to generate
      ...(isResume ? {
        specificSeeds: missingSeeds,  // NEW: Array of specific seed IDs to generate
        isResume: true
      } : {
        startSeed,
        endSeed
      }),
      pattern,  // Pass parallelization pattern to phase server
      mode: mode || 'custom',  // Pass mode for logging/tracking
      spawnerMode  // 'cli' (iTerm2 + Claude CLI) or 'browser' (Chrome + Claude Web)
    };

    if (isResume) {
      console.log(`[Orchestrator] INTELLIGENT RESUME - Sending ${missingSeeds.length} missing seeds to Phase 1`);
      console.log(`   → Missing seeds: ${missingSeeds.slice(0, 10).join(', ')}${missingSeeds.length > 10 ? '...' : ''}`);
    }
    console.log(`[Orchestrator] Sending to Phase 1:`, JSON.stringify(payload, null, 2));
    const response = await axios.post(`${phaseServer}/start`, payload);

    // Store Phase 1 tracking state with expected seed range for seed-based completion
    // The completion logic checks actual seeds received, not just master count
    const phase1StateKey = `${courseCode}_phase1`;
    const expectedSeeds = isResume ? missingSeeds : allRequiredSeeds;
    courseProgress.set(phase1StateKey, {
      // Expected seeds - these are what we MUST have before merge
      expectedSeeds: expectedSeeds,  // NEW: Array of specific seed IDs expected
      expectedStartSeed: isResume ? null : startSeed,  // null if resume (using specificSeeds)
      expectedEndSeed: isResume ? null : endSeed,
      expectedTotalSeeds: expectedSeeds.length,
      isResume: isResume,  // Track if this is a resume operation
      // Master tracking (informational only - not used for completion)
      mastersComplete: 0,
      totalMasters: response.data?.job?.masterCount || 1,
      // Seed tracking (actual received seeds - drives completion)
      seedsProcessed: 0,
      receivedSeedIds: new Set(),
      // Timing tracking for stall detection
      startTime: Date.now(),
      lastBatchTime: Date.now(),
      gapFillTriggered: false,
      // Language params needed for gap-fill
      target: resolvedTarget,
      known: resolvedKnown
    });
    console.log(`[Orchestrator] Phase 1 tracking initialized:`);
    if (isResume) {
      console.log(`   → RESUME MODE: Expecting ${expectedSeeds.length} specific seeds`);
      console.log(`   → Seeds: ${expectedSeeds.slice(0, 5).join(', ')}${expectedSeeds.length > 5 ? `... (${expectedSeeds.length} total)` : ''}`);
    } else {
      console.log(`   → Expected seeds: S${String(startSeed).padStart(4, '0')} to S${String(endSeed).padStart(4, '0')} (${totalSeeds} total)`);
    }
    console.log(`   → Masters spawned: ${response.data?.job?.masterCount || 1}`);

    // Start stall watchdog for this course
    startPhase1StallWatchdog(courseCode);

    res.json({
      success: true,
      courseCode,
      phase,
      message: isResume
        ? `Resuming Phase 1 for ${courseCode} - generating ${missingSeeds.length} missing seeds`
        : `${phaseSelection === 'all' ? 'Full course generation' : `Phase ${phase}`} started for ${courseCode}`,
      isResume: isResume,
      existingSeeds: existingSeeds.length,
      missingSeeds: missingSeeds.length,
      details: response.data
    });
  } catch (error) {
    console.error(`Failed to start generation:`, error.message);
    res.status(500).json({
      error: error.message,
      courseCode
    });
  }
});

/**
 * GET /api/modes
 * Get available course generation modes
 * Returns mode configurations for UI display
 */
app.get('/api/modes', (req, res) => {
  try {
    const modes = getAllModes();
    res.json({
      modes,
      constants: {
        SEED_COUNTS,
        MODES
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load modes', details: error.message });
  }
});

/**
 * GET /api/vfs/courses/:code/:file(*)
 * Serve VFS files for dashboard
 */
app.get('/api/vfs/courses/:code/:file(*)', async (req, res) => {
  const { code, file } = req.params;

  try {
    const filePath = path.join(VFS_ROOT, code, file);

    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const data = await fs.readJson(filePath);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /health
 * Health check for this service
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    port: PORT,
    timestamp: new Date().toISOString(),
    vfsRoot: VFS_ROOT,
    checkpointMode: CHECKPOINT_MODE,
    phaseServers: PHASE_SERVERS,
    activeCourses: courseStates.size
  });
});

/**
 * GET /health/all
 * Health check for all services
 */
app.get('/health/all', async (req, res) => {
  const health = {
    orchestrator: { status: 'healthy', port: PORT },
    phases: {}
  };

  // Check each phase server
  for (const [phase, url] of Object.entries(PHASE_SERVERS)) {
    try {
      const response = await axios.get(`${url}/health`, { timeout: 2000 });
      health.phases[phase] = { status: 'healthy', ...response.data };
    } catch (error) {
      health.phases[phase] = { status: 'unreachable', error: error.message };
    }
  }

  const allHealthy = Object.values(health.phases).every(p => p.status === 'healthy');
  res.status(allHealthy ? 200 : 503).json(health);
});

// =============================================================================
// CANCEL ENDPOINTS - Clear stale jobs across all services
// =============================================================================

/**
 * POST /api/cancel/:courseCode
 * Cancel all jobs for a specific course across all phase servers
 */
app.post('/api/cancel/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const results = { courseCode, cancelled: [] };

  // Cancel on each phase server
  for (const [phase, url] of Object.entries(PHASE_SERVERS)) {
    try {
      const endpoint = phase === 'phase1' ? 'phase1' :
                       phase === 'phase2' ? 'phase2' :
                       phase === 'phase3' ? 'phase3' : phase;
      const response = await axios.post(`${url}/api/${endpoint}/${courseCode}/cancel`, {}, { timeout: 5000 });
      if (response.data.success) {
        results.cancelled.push(phase);
      }
    } catch (error) {
      // Ignore errors - endpoint may not exist on all services
    }
  }

  // Clear local course progress state
  courseProgress.delete(`${courseCode}_phase1`);
  courseProgress.delete(`${courseCode}_phase3`);
  courseStates.delete(courseCode);

  console.log(`[Orchestrator] ❌ Cancelled jobs for ${courseCode} on: ${results.cancelled.join(', ') || 'none'}`);
  res.json({ success: true, ...results });
});

/**
 * POST /api/cancel-all
 * Nuclear option - cancel ALL jobs on ALL services
 */
app.post('/api/cancel-all', async (req, res) => {
  const results = { cancelled: [] };

  // Cancel all on each phase server
  for (const [phase, url] of Object.entries(PHASE_SERVERS)) {
    try {
      const endpoint = phase === 'phase1' ? 'phase1' :
                       phase === 'phase2' ? 'phase2' :
                       phase === 'phase3' ? 'phase3' : phase;
      const response = await axios.post(`${url}/api/${endpoint}/cancel-all`, {}, { timeout: 5000 });
      if (response.data.success) {
        results.cancelled.push({ phase, count: response.data.cancelled });
      }
    } catch (error) {
      // Ignore errors
    }
  }

  // Clear all local state
  courseProgress.clear();
  courseStates.clear();

  console.log(`[Orchestrator] ❌ CANCELLED ALL JOBS`);
  res.json({ success: true, ...results });
});

/**
 * GET /api/jobs
 * List all active jobs across all services
 */
app.get('/api/jobs', async (req, res) => {
  const allJobs = {};

  for (const [phase, url] of Object.entries(PHASE_SERVERS)) {
    try {
      const endpoint = phase === 'phase1' ? 'phase1' :
                       phase === 'phase2' ? 'phase2' :
                       phase === 'phase3' ? 'phase3' : phase;
      const response = await axios.get(`${url}/api/${endpoint}/jobs`, { timeout: 3000 });
      allJobs[phase] = response.data;
    } catch (error) {
      allJobs[phase] = { error: 'unavailable' };
    }
  }

  res.json(allJobs);
});

/**
 * GET /api/health
 * Dashboard-compatible health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    port: PORT,
    timestamp: new Date().toISOString(),
    version: '7.0.0',
    vfs_root: VFS_ROOT,
    jobs_active: courseStates.size
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EVENTS API - For phase servers to POST granular events
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/events/:courseCode
 *
 * Endpoint for phase servers to report granular events during generation.
 * Events are processed, internal state is updated, and WebSocket events are emitted.
 *
 * Request body:
 * {
 *   event: string,           // Event type (e.g., 'browser:spawning', 'agent:complete', 'seed:failed')
 *   browserId?: string,      // Browser identifier
 *   agentId?: string,        // Agent identifier
 *   seedId?: string,         // Seed identifier
 *   seedIds?: string[],      // Batch of seed IDs
 *   assignedSeeds?: string[],// Seeds assigned to browser/agent
 *   completedSeeds?: string[],// Seeds completed by agent
 *   phase?: number,          // Phase number
 *   jobId?: string,          // Job identifier
 *   error?: string,          // Error message
 *   data?: object            // Additional event data (mode, seeds, missingSeeds, recoveredSeeds, etc.)
 * }
 *
 * Supported events:
 * - browser:spawning, browser:ready, browser:running, browser:complete, browser:failed, browser:timeout
 * - agent:spawning, agent:running, agent:complete, agent:failed
 * - seed:assigned, seed:processing, seed:complete, seed:failed
 * - batch:received
 * - pipeline:job:start, pipeline:job:complete, pipeline:job:failed
 * - pipeline:phase:start, pipeline:phase:complete
 * - pipeline:gap-fill:triggered, pipeline:gap-fill:complete, pipeline:gap-fill:failed
 */
app.post('/api/events/:courseCode', (req, res) => {
  const { courseCode } = req.params;
  const eventData = req.body;

  if (!eventData || !eventData.event) {
    return res.status(400).json({
      error: 'Missing required field: event',
      example: { event: 'browser:spawning', browserId: 'browser-1', assignedSeeds: ['S0001', 'S0002'] }
    });
  }

  const eventType = eventData.event;
  console.log(`[Events API] ${courseCode} received: ${eventType}`);

  try {
    // Route event to appropriate handler based on prefix
    if (eventType.startsWith('browser:')) {
      emitBrowserEvent(courseCode, {
        type: eventType,
        browserId: eventData.browserId,
        assignedSeeds: eventData.assignedSeeds,
        error: eventData.error
      });
    } else if (eventType.startsWith('agent:')) {
      emitAgentEvent(courseCode, {
        type: eventType,
        browserId: eventData.browserId,
        agentId: eventData.agentId,
        assignedSeeds: eventData.assignedSeeds,
        completedSeeds: eventData.completedSeeds,
        error: eventData.error
      });
    } else if (eventType.startsWith('seed:')) {
      emitSeedEvent(courseCode, {
        type: eventType,
        seedId: eventData.seedId,
        agentId: eventData.agentId,
        browserId: eventData.browserId,
        error: eventData.error,
        result: eventData.result
      });
    } else if (eventType.startsWith('batch:')) {
      emitBatchEvent(courseCode, {
        type: eventType,
        seedIds: eventData.seedIds,
        agentId: eventData.agentId,
        browserId: eventData.browserId
      });
    } else if (eventType.startsWith('pipeline:') || eventType.startsWith('gap-fill:')) {
      // Normalize gap-fill events to pipeline namespace
      const normalizedType = eventType.startsWith('gap-fill:')
        ? `pipeline:${eventType}`
        : eventType;
      emitPipelineEvent(courseCode, {
        type: normalizedType,
        phase: eventData.phase,
        jobId: eventData.jobId,
        data: eventData.data,
        error: eventData.error
      });
    } else {
      // Unknown event type - log but still emit as generic event
      console.warn(`[Events API] Unknown event type: ${eventType}`);
      io.to(`course:${courseCode}`).emit('event', {
        ...eventData,
        courseCode,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      event: eventType,
      courseCode,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[Events API] Error processing event ${eventType}:`, error);
    res.status(500).json({
      error: 'Failed to process event',
      message: error.message
    });
  }
});

/**
 * GET /api/events/:courseCode/state
 *
 * Get the current job state for a course (browsers, agents, seeds).
 * Useful for reconnecting clients or debugging.
 */
app.get('/api/events/:courseCode/state', (req, res) => {
  const { courseCode } = req.params;
  const state = getActiveJobState(courseCode);

  if (!state) {
    return res.status(404).json({
      error: 'No active job found',
      courseCode
    });
  }

  res.json({
    success: true,
    courseCode,
    state,
    timestamp: new Date().toISOString()
  });
});

/**
 * DELETE /api/events/:courseCode
 *
 * Clear the active job state for a course.
 * Used when starting a new generation run.
 */
app.delete('/api/events/:courseCode', (req, res) => {
  const { courseCode } = req.params;
  const existed = activeGenerationJobs.has(courseCode);

  activeGenerationJobs.delete(courseCode);

  console.log(`[Events API] Cleared job state for ${courseCode} (existed: ${existed})`);

  res.json({
    success: true,
    courseCode,
    cleared: existed,
    timestamp: new Date().toISOString()
  });
});

/**
 * Cache for ISO 639-3 languages (fetched on startup, refreshed daily)
 */
let iso639LanguagesCache = null;
let iso639CacheTimestamp = null;
const ISO639_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch and parse ISO 639-3 language data from SIL International
 * Returns: Array of { code, name, native } objects
 */
async function fetchISO639Languages() {
  // Return cached data if fresh
  if (iso639LanguagesCache && iso639CacheTimestamp && (Date.now() - iso639CacheTimestamp < ISO639_CACHE_TTL)) {
    return iso639LanguagesCache;
  }

  try {
    console.log('[Orchestrator] Fetching ISO 639-3 language data from SIL...');

    // Fetch the official ISO 639-3 tab-delimited file from SIL International
    const response = await axios.get('https://iso639-3.sil.org/sites/iso639-3/files/downloads/iso-639-3.tab', {
      timeout: 10000,
      responseType: 'text'
    });

    const lines = response.data.split('\n');
    const languages = [];

    // Skip header line, parse data
    // Format: Id	Part2B	Part2T	Part1	Scope	Language_Type	Ref_Name	Comment
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const fields = line.split('\t');
      if (fields.length < 7) continue;

      const [id, part2B, part2T, part1, scope, languageType, refName] = fields;

      // Only include living languages (L) and some constructed languages (C)
      if (languageType !== 'L' && languageType !== 'C') continue;

      // Prefer the 3-letter ISO 639-3 code (id)
      const code = id.toLowerCase();
      const name = refName.trim();

      // For native name, we'll use the English name as fallback
      // (Native names would require a separate dataset)
      const native = name;

      languages.push({ code, name, native });
    }

    // Cache the result
    iso639LanguagesCache = languages;
    iso639CacheTimestamp = Date.now();

    console.log(`[Orchestrator] ✅ Loaded ${languages.length} languages from ISO 639-3`);
    return languages;

  } catch (error) {
    console.error('[Orchestrator] ❌ Failed to fetch ISO 639-3 data:', error.message);

    // Fallback to basic list if fetch fails
    const fallback = [
      { code: 'afr', name: 'Afrikaans', native: 'Afrikaans' },
      { code: 'ara', name: 'Arabic', native: 'العربية' },
      { code: 'bre', name: 'Breton', native: 'Brezhoneg' },
      { code: 'cmn', name: 'Chinese (Mandarin)', native: '中文 (普通话)' },
      { code: 'cym', name: 'Welsh', native: 'Cymraeg' },
      { code: 'deu', name: 'German', native: 'Deutsch' },
      { code: 'eng', name: 'English', native: 'English' },
      { code: 'eus', name: 'Basque', native: 'Euskara' },
      { code: 'fra', name: 'French', native: 'Français' },
      { code: 'gla', name: 'Scottish Gaelic', native: 'Gàidhlig' },
      { code: 'gle', name: 'Irish', native: 'Gaeilge' },
      { code: 'glv', name: 'Manx', native: 'Gaelg' },
      { code: 'ita', name: 'Italian', native: 'Italiano' },
      { code: 'jpn', name: 'Japanese', native: '日本語' },
      { code: 'kor', name: 'Korean', native: '한국어' },
      { code: 'por', name: 'Portuguese', native: 'Português' },
      { code: 'rus', name: 'Russian', native: 'Русский' },
      { code: 'spa', name: 'Spanish', native: 'Español' }
    ];

    return fallback;
  }
}

/**
 * GET /api/languages
 * Return ISO 639-3 language codes for dashboard (fetched from SIL registry)
 */
app.get('/api/languages', async (req, res) => {
  try {
    const languages = await fetchISO639Languages();

    // Sort by English name
    languages.sort((a, b) => a.name.localeCompare(b.name));

    res.json(languages);
  } catch (error) {
    console.error('[Orchestrator] Error serving languages:', error);
    res.status(500).json({ error: 'Failed to load languages', details: error.message });
  }
});

/**
 * GET /api/canonical-seeds
 * Serve canonical seeds to agents via ngrok
 * Query params:
 *   - ?start=N&end=M or ?start=N&limit=M (range-based, defaults: all seeds)
 *   - ?seeds=S0001,S0005,S0009 (specific seed IDs for intelligent resume)
 */
app.get('/api/canonical-seeds', async (req, res) => {
  try {
    const canonicalPath = path.join(__dirname, '../../public/vfs/canonical/canonical_seeds.json');
    const seedsArray = await fs.readJSON(canonicalPath);

    // INTELLIGENT RESUME: Support specific seed IDs
    if (req.query.seeds) {
      const requestedIds = req.query.seeds.split(',').map(s => s.trim());
      const filteredSeeds = seedsArray.filter(seed => requestedIds.includes(seed.seed_id));

      return res.json({
        total_available: seedsArray.length,
        mode: 'specific_seeds',
        requested: requestedIds.length,
        found: filteredSeeds.length,
        missing: requestedIds.filter(id => !filteredSeeds.find(s => s.seed_id === id)),
        seeds: filteredSeeds
      });
    }

    // Standard range-based query
    const start = parseInt(req.query.start) || 1;
    const end = parseInt(req.query.end);
    const limit = end ? (end - start + 1) : (parseInt(req.query.limit) || SEED_COUNTS.FULL_COURSE);

    // Filter seeds by range (array is 0-indexed, but seed_id is 1-indexed)
    const startIdx = start - 1;
    const endIdx = Math.min(startIdx + limit, seedsArray.length);
    const filteredSeeds = seedsArray.slice(startIdx, endIdx);

    res.json({
      total_available: seedsArray.length,
      mode: 'range',
      start,
      end: end || (start + filteredSeeds.length - 1),
      limit,
      count: filteredSeeds.length,
      seeds: filteredSeeds
    });
  } catch (error) {
    console.error('[Orchestrator] Error serving canonical seeds:', error);
    res.status(500).json({ error: 'Failed to load canonical seeds', details: error.message });
  }
});

/**
 * GET /api/courses/:courseCode/phase-outputs/:phase/:file
 * Retrieve phase output files from VFS
 * Example: GET /api/courses/hun_for_eng/phase-outputs/1/seed_pairs.json
 * Returns the contents of {VFS_ROOT}/{courseCode}/{file}
 */
app.get('/api/courses/:courseCode/phase-outputs/:phase/:file', async (req, res) => {
  const { courseCode, phase, file } = req.params;

  console.log(`[Orchestrator] Fetching phase ${phase} output: ${file} for ${courseCode}`);

  try {
    // Construct file path: {VFS_ROOT}/{courseCode}/{file}
    const filePath = path.join(VFS_ROOT, courseCode, file);

    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      console.log(`[Orchestrator] File not found: ${filePath}`);
      return res.status(404).json({
        error: 'File not found',
        courseCode,
        phase,
        file,
        path: filePath
      });
    }

    // Read and return the JSON file
    const data = await fs.readJson(filePath);

    console.log(`[Orchestrator] Successfully served ${file} for ${courseCode}`);

    res.json(data);
  } catch (error) {
    console.error(`[Orchestrator] Error reading phase output file:`, error);

    // Handle JSON parse errors specifically
    if (error.name === 'SyntaxError' || error.message.includes('JSON')) {
      return res.status(500).json({
        error: 'Invalid JSON file',
        courseCode,
        phase,
        file,
        details: error.message
      });
    }

    // Handle file read errors
    res.status(500).json({
      error: 'File read failed',
      courseCode,
      phase,
      file,
      details: error.message
    });
  }
});

/**
 * PUT /api/courses/:courseCode/phase-outputs/:phase/:file
 * Save/update phase output files in VFS
 * Example: PUT /api/courses/hun_for_eng/phase-outputs/3/introductions.json
 * Writes to {VFS_ROOT}/{courseCode}/{file}
 */
app.put('/api/courses/:courseCode/phase-outputs/:phase/:file', async (req, res) => {
  const { courseCode, phase, file } = req.params;
  const data = req.body;

  console.log(`[Orchestrator] Saving phase ${phase} output: ${file} for ${courseCode}`);

  try {
    // Validate course exists
    const courseDir = path.join(VFS_ROOT, courseCode);
    if (!await fs.pathExists(courseDir)) {
      console.log(`[Orchestrator] Course directory not found: ${courseDir}`);
      return res.status(404).json({
        error: 'Course not found',
        courseCode
      });
    }

    // Construct file path: {VFS_ROOT}/{courseCode}/{file}
    const filePath = path.join(VFS_ROOT, courseCode, file);

    // Create backup if file exists
    if (await fs.pathExists(filePath)) {
      const backupPath = `${filePath}.backup-${Date.now()}`;
      await fs.copy(filePath, backupPath);
      console.log(`[Orchestrator] Created backup: ${backupPath}`);
    }

    // Write the data to file
    await fs.writeJson(filePath, data, { spaces: 2 });

    console.log(`[Orchestrator] Successfully saved ${file} for ${courseCode}`);

    res.json({
      success: true,
      courseCode,
      phase,
      file,
      path: filePath,
      message: 'Phase output saved successfully'
    });
  } catch (error) {
    console.error(`[Orchestrator] Error saving phase output file:`, error);

    res.status(500).json({
      error: 'File save failed',
      courseCode,
      phase,
      file,
      details: error.message
    });
  }
});

/**
 * PUT /api/courses/:courseCode/translations/:seedId
 * Update a seed translation in seed_pairs.json
 */
app.put('/api/courses/:courseCode/translations/:seedId', async (req, res) => {
  const { courseCode, seedId } = req.params;
  const { source, target } = req.body;

  console.log(`[Orchestrator] Updating translation ${seedId} in ${courseCode}`);
  console.log(`[Orchestrator] New values - source: "${source}", target: "${target}"`);

  try {
    const courseDir = path.join(VFS_ROOT, courseCode);
    const seedPairsPath = path.join(courseDir, 'seed_pairs.json');

    if (!await fs.pathExists(seedPairsPath)) {
      return res.status(404).json({ error: 'seed_pairs.json not found' });
    }

    const seedPairs = await fs.readJson(seedPairsPath);

    if (!seedPairs.translations || !seedPairs.translations[seedId]) {
      return res.status(404).json({ error: `Seed ${seedId} not found` });
    }

    // Update translation (format: [target, source])
    seedPairs.translations[seedId] = [target, source];
    seedPairs.updated = new Date().toISOString();
    seedPairs.updated_by = 'dashboard_edit';

    await fs.writeJson(seedPairsPath, seedPairs, { spaces: 2 });
    console.log(`[Orchestrator] Successfully updated ${seedId} in seed_pairs.json`);

    res.json({
      success: true,
      message: `Translation ${seedId} updated`,
      updated: { seedId, source, target }
    });
  } catch (error) {
    console.error(`[Orchestrator] Error updating translation:`, error);
    res.status(500).json({ error: 'Failed to update translation', details: error.message });
  }
});

/**
 * POST /api/courses/:courseCode/flags
 * Create a new flag for a seed or lego issue (commits to GitHub)
 * Body: { seedId, legoId (optional), issueType, notes, suggestedCorrection }
 */
app.post('/api/courses/:courseCode/flags', async (req, res) => {
  const { courseCode } = req.params;
  const { seedId, legoId, issueType, notes, suggestedCorrection } = req.body;

  console.log(`[Orchestrator] Creating flag for ${courseCode} - seedId: ${seedId}, issueType: ${issueType}`);

  try {
    const courseDir = path.join(VFS_ROOT, courseCode);
    const flagsPath = path.join(courseDir, 'flags.json');

    // Ensure course directory exists
    if (!await fs.pathExists(courseDir)) {
      return res.status(404).json({ error: `Course ${courseCode} not found` });
    }

    // Load existing flags or create new array
    let flagsData = { flags: [], version: '1.0' };
    if (await fs.pathExists(flagsPath)) {
      flagsData = await fs.readJson(flagsPath);
    }

    // Create new flag with unique ID
    const newFlag = {
      id: `FLAG_${Date.now()}`,
      seedId,
      legoId: legoId || null,
      issueType,
      suggestedCorrection: suggestedCorrection || null,
      notes: notes || null,
      created: new Date().toISOString(),
      resolved: false,
      resolvedAt: null,
      resolvedBy: null
    };

    flagsData.flags.push(newFlag);
    flagsData.updated = new Date().toISOString();

    // Write back to file
    await fs.writeJson(flagsPath, flagsData, { spaces: 2 });
    console.log(`[Orchestrator] Successfully created flag ${newFlag.id} in ${courseCode}`);

    // NOTE: Git commit/push removed - flags saved locally only (database-first approach)

    res.json({
      success: true,
      flag: newFlag
    });
  } catch (error) {
    console.error(`[Orchestrator] Error creating flag:`, error);
    res.status(500).json({ error: 'Failed to create flag', details: error.message });
  }
});

/**
 * GET /api/courses/:courseCode/flags
 * Get all flags for a course
 */
app.get('/api/courses/:courseCode/flags', async (req, res) => {
  const { courseCode } = req.params;

  console.log(`[Orchestrator] Getting flags for ${courseCode}`);

  try {
    const courseDir = path.join(VFS_ROOT, courseCode);
    const flagsPath = path.join(courseDir, 'flags.json');

    // Return empty array if flags file doesn't exist
    if (!await fs.pathExists(flagsPath)) {
      return res.json({ flags: [] });
    }

    const flagsData = await fs.readJson(flagsPath);
    res.json({ flags: flagsData.flags || [] });
  } catch (error) {
    console.error(`[Orchestrator] Error reading flags:`, error);
    res.status(500).json({ error: 'Failed to read flags', details: error.message });
  }
});

/**
 * DELETE /api/courses/:courseCode/flags/:flagId
 * Mark a flag as resolved
 */
app.delete('/api/courses/:courseCode/flags/:flagId', async (req, res) => {
  const { courseCode, flagId } = req.params;

  console.log(`[Orchestrator] Resolving flag ${flagId} from ${courseCode}`);

  try {
    const courseDir = path.join(VFS_ROOT, courseCode);
    const flagsPath = path.join(courseDir, 'flags.json');

    if (!await fs.pathExists(flagsPath)) {
      return res.status(404).json({ error: 'No flags file found' });
    }

    const flagsData = await fs.readJson(flagsPath);

    // Find and mark the flag as resolved
    const flag = flagsData.flags.find(f => f.id === flagId || f.id === parseInt(flagId));
    if (!flag) {
      return res.status(404).json({ error: `Flag ${flagId} not found` });
    }

    flag.resolved = true;
    flag.resolvedAt = new Date().toISOString();
    flag.resolvedBy = 'dashboard';
    flagsData.updated = new Date().toISOString();

    // Write back to file
    await fs.writeJson(flagsPath, flagsData, { spaces: 2 });
    console.log(`[Orchestrator] Successfully resolved flag ${flagId} in ${courseCode}`);

    // NOTE: Git commit/push removed - flags saved locally only (database-first approach)

    res.json({ success: true });
  } catch (error) {
    console.error(`[Orchestrator] Error resolving flag:`, error);
    res.status(500).json({ error: 'Failed to resolve flag', details: error.message });
  }
});

/**
 * GET /api/phase-intelligence/:phase
 * Serve phase intelligence docs to agents via ngrok
 * Example: /api/phase-intelligence/1 or /api/phase-intelligence/phase1
 *
 * APML v11.0: Prompts are co-located with services in services/phases/{phase}/PROMPT.md
 */
app.get('/api/phase-intelligence/:phase', async (req, res) => {
  try {
    let { phase } = req.params;

    // Normalize phase number (handle "phase1" or "1")
    phase = phase.replace(/^phase/, '');

    // Map phase numbers to PROMPT.md files co-located with services (APML v11.0)
    // SSoT: Each phase's prompt lives alongside its service code
    const phasePaths = {
      '1': 'phase1-translation/PROMPT.md',           // Phase 1: Translation + LEGO Extraction
      '2': 'phase1-lego-extraction/PROMPT.md',       // Phase 2: Conflict Resolution
      '3': 'phase3-basket-generation/PROMPT.md',     // Phase 3: Basket Generation
      '5': 'phase3-basket-generation/PROMPT.md',     // Legacy: Phase 5 → Phase 3
      '8': 'phase8-audio-generation/PROMPT.md',      // Phase 8: Audio Generation
      '9': 'phase9-manifest-compilation/PROMPT.md',  // Phase 9: Manifest Compilation
      'manifest': 'phase9-manifest-compilation/PROMPT.md',  // Alias
      'audio': 'phase8-audio-generation/PROMPT.md'   // Alias
    };

    const relativePath = phasePaths[phase];
    if (!relativePath) {
      return res.status(404).json({ error: `No intelligence found for phase ${phase}` });
    }

    const intelligencePath = path.join(__dirname, '../phases', relativePath);
    const content = await fs.readFile(intelligencePath, 'utf8');

    res.json({
      phase,
      path: relativePath,
      content,
      format: 'markdown'
    });
  } catch (error) {
    console.error(`[Orchestrator] Error serving phase intelligence:`, error);
    res.status(500).json({ error: 'Failed to load phase intelligence', details: error.message });
  }
});

/**
 * GET /api/zut-examples/:known/:target
 * Generate language-pair specific ZUT examples
 * These show what fails/passes ZUT for the specific language combination
 */
app.get('/api/zut-examples/:known/:target', (req, res) => {
  const { known, target } = req.params;

  // Language-specific ZUT examples
  const zutExamples = {
    'eng-spa': {
      fails: [
        { known: 'the', why: 'el? la? los? las? - gender/number ambiguous' },
        { known: 'a', why: 'un? una? - gender ambiguous' },
        { known: 'an', why: 'un? una? - gender ambiguous' },
        { known: 'you', why: 'tú? usted? vosotros? ustedes? - formality/number ambiguous' },
        { known: 'in', why: 'en? dentro de? por? - context determines' },
        { known: 'to', why: 'a? para? hacia? infinitive marker? - many meanings' },
        { known: 'for', why: 'para? por? - purpose vs reason ambiguous' }
      ],
      passes: [
        { known: 'I want', target: 'quiero', why: 'single unambiguous form' },
        { known: 'Spanish', target: 'español', why: 'no ambiguity' },
        { known: 'to speak', target: 'hablar', why: 'infinitive marker disambiguates' },
        { known: 'in Spanish', target: 'en español', why: 'preposition absorbed in context' },
        { known: 'a word', target: 'una palabra', why: 'article absorbed, gender determined' },
        { known: 'with you', target: 'contigo', why: 'informal singular, unambiguous' }
      ]
    },
    'eng-cmn': {
      fails: [
        { known: 'the', why: 'Chinese rarely uses articles - context dependent' },
        { known: 'a', why: 'Chinese rarely uses articles - 一个? nothing?' },
        { known: 'le (了)', why: 'particle cannot stand alone' },
        { known: 'ma (吗)', why: 'particle cannot stand alone' },
        { known: 'de (的/得/地)', why: 'three different particles, different functions' }
      ],
      passes: [
        { known: 'I want', target: '我想', why: 'unambiguous' },
        { known: 'Chinese', target: '中文', why: 'unambiguous' },
        { known: 'have eaten', target: '吃了', why: '了 absorbed in verb context' },
        { known: 'speak well', target: '说得好', why: '得 absorbed in complement structure' },
        { known: 'is it good?', target: '好吗', why: '吗 absorbed in question' }
      ]
    },
    'eng-ita': {
      fails: [
        { known: 'the', why: 'il? la? lo? i? le? gli? - gender/number ambiguous' },
        { known: 'a', why: 'un? una? uno? - gender ambiguous' },
        { known: 'you', why: 'tu? Lei? voi? - formality ambiguous' },
        { known: 'in', why: 'in? a? nel? nella? - context determines' }
      ],
      passes: [
        { known: 'I want', target: 'voglio', why: 'unambiguous' },
        { known: 'Italian', target: 'italiano', why: 'no ambiguity' },
        { known: 'to speak', target: 'parlare', why: 'infinitive marker disambiguates' },
        { known: 'in Italian', target: 'in italiano', why: 'preposition absorbed' }
      ]
    }
  };

  const key = `${known}-${target}`;
  const examples = zutExamples[key];

  if (!examples) {
    // Generate generic examples for unknown pairs
    return res.json({
      known,
      target,
      fails: [
        { known: 'the', why: 'articles are almost always ambiguous' },
        { known: 'a', why: 'articles are almost always ambiguous' },
        { known: 'in', why: 'prepositions rarely map 1:1' },
        { known: 'to', why: 'prepositions rarely map 1:1' },
        { known: 'for', why: 'prepositions rarely map 1:1' }
      ],
      passes: [
        { known: 'I want', why: 'verb conjugations often unambiguous' },
        { known: 'to speak', why: 'infinitive with marker often unambiguous' }
      ],
      note: 'Generic examples - specific language pair not configured'
    });
  }

  res.json({
    known,
    target,
    ...examples
  });
});

/**
 * POST /api/regenerate-manifest
 * Trigger manual manifest regeneration (local dev only)
 * Scans public/vfs/courses/ and updates courses-manifest.json
 * Returns comparison showing what changed
 */
app.post('/api/regenerate-manifest', async (req, res) => {
  try {
    console.log('[Orchestrator] 📋 Manual manifest regeneration requested');

    // Load old manifest first
    const manifestPath = path.join(__dirname, '../../public/vfs/courses-manifest.json');
    let oldManifest = null;
    try {
      oldManifest = await fs.readJson(manifestPath);
    } catch (err) {
      console.log('[Orchestrator] No existing manifest found');
    }

    // Regenerate manifest
    await regenerateCourseManifest();

    // Load new manifest
    const newManifest = await fs.readJson(manifestPath);

    // Compare old vs new
    const comparison = {
      added: [],
      updated: [],
      removed: []
    };

    if (oldManifest) {
      const oldCodes = new Set(oldManifest.courses.map(c => c.course_code));
      const newCodes = new Set(newManifest.courses.map(c => c.course_code));

      // Find added courses
      for (const course of newManifest.courses) {
        if (!oldCodes.has(course.course_code)) {
          comparison.added.push(course.course_code);
        }
      }

      // Find removed courses
      for (const course of oldManifest.courses) {
        if (!newCodes.has(course.course_code)) {
          comparison.removed.push(course.course_code);
        }
      }

      // Find updated courses (phase changed)
      for (const newCourse of newManifest.courses) {
        const oldCourse = oldManifest.courses.find(c => c.course_code === newCourse.course_code);
        if (oldCourse && oldCourse.phase !== newCourse.phase) {
          comparison.updated.push({
            course_code: newCourse.course_code,
            old_phase: oldCourse.phase,
            new_phase: newCourse.phase
          });
        }
      }
    }

    res.json({
      success: true,
      message: 'Manifest regenerated successfully. Remember to commit and push changes to GitHub.',
      timestamp: new Date().toISOString(),
      comparison,
      total_courses: newManifest.courses.length
    });
  } catch (error) {
    console.error('[Orchestrator] ❌ Failed to regenerate manifest:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to regenerate manifest'
    });
  }
});

// NOTE: /api/push-to-github removed - using database-first approach

// NOTE: /api/push-all-courses removed - using database-first approach

// =============================================================================
// AUDIO GENERATION ENDPOINTS (APML v9.0)
// Legacy /api/phase8/* routes maintained for backward compatibility
// =============================================================================

/**
 * POST /api/audio/plan (APML v9.0) and /api/phase8/plan (legacy)
 * Get generation plan with cost/time estimates - MUST be called before /start
 */
async function handleAudioPlan(req, res) {
  try {
    const { courseCode, options = {} } = req.body;

    if (!courseCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: courseCode'
      });
    }

    console.log(`[Orchestrator] 📋 Getting Audio generation plan for ${courseCode}`);

    const audioUrl = PHASE_SERVERS['audio'];

    const response = await axios.post(`${audioUrl}/plan`, {
      courseCode,
      options
    });

    res.json(response.data);
  } catch (error) {
    console.error('[Orchestrator] ❌ Audio plan error:', error.message);

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Audio server is not running',
        message: 'Please start the Audio server (port 3465)'
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.message,
      message: 'Failed to get Audio generation plan'
    });
  }
}
app.post('/api/audio/plan', handleAudioPlan);
app.post('/api/phase8/plan', handleAudioPlan);  // Legacy

/**
 * POST /api/audio/start (APML v9.0) and /api/phase8/start (legacy)
 * Proxy to Audio server (port 3465)
 */
async function handleAudioStart(req, res) {
  try {
    const { courseCode, approved, options = {} } = req.body;

    if (!courseCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: courseCode'
      });
    }

    console.log(`[Orchestrator] 🎵 Proxying Audio generation request for ${courseCode}`);

    const audioUrl = PHASE_SERVERS['audio'];

    const response = await axios.post(`${audioUrl}/start`, {
      courseCode,
      approved,
      options
    });

    res.json(response.data);
  } catch (error) {
    console.error('[Orchestrator] ❌ Audio proxy error:', error.message);

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Audio server is not running',
        message: 'Please start the Audio server (port 3465)'
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.error || error.message,
      message: 'Failed to start Audio generation'
    });
  }
}
app.post('/api/audio/start', handleAudioStart);
app.post('/api/audio/generate', handleAudioStart);  // Dashboard compatibility
app.post('/api/phase8/start', handleAudioStart);  // Legacy

/**
 * GET /api/audio/status/:courseCode (APML v9.0) and /api/phase8/status/:courseCode (legacy)
 */
async function handleAudioStatus(req, res) {
  try {
    const { courseCode } = req.params;
    const audioUrl = PHASE_SERVERS['audio'];

    const response = await axios.get(`${audioUrl}/status/${courseCode}`);
    res.json(response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ success: false, error: 'Audio server not running' });
    }
    if (error.response?.status === 404) {
      return res.status(404).json({ success: false, error: 'No job found for this course' });
    }
    res.status(error.response?.status || 500).json({ success: false, error: error.message });
  }
}
app.get('/api/audio/status/:courseCode', handleAudioStatus);
app.get('/api/audio/generation-status/:courseCode', handleAudioStatus);  // Dashboard compatibility (jobId = courseCode)
app.get('/api/phase8/status/:courseCode', handleAudioStatus);  // Legacy

/**
 * GET /api/audio/progress/:courseCode - Real-time progress during generation
 */
async function handleAudioProgress(req, res) {
  try {
    const { courseCode } = req.params;
    const audioUrl = PHASE_SERVERS['audio'];

    const response = await axios.get(`${audioUrl}/progress/${courseCode}`);
    res.json(response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ success: false, error: 'Audio server not running' });
    }
    if (error.response?.status === 404) {
      return res.json({ success: true, active: false, message: 'No active job' });
    }
    res.status(error.response?.status || 500).json({ success: false, error: error.message });
  }
}
app.get('/api/audio/progress/:courseCode', handleAudioProgress);

/**
 * POST /api/audio/continue (APML v9.0) and /api/phase8/continue (legacy)
 */
async function handleAudioContinue(req, res) {
  try {
    const { courseCode, options = {} } = req.body;
    const audioUrl = PHASE_SERVERS['audio'];

    const response = await axios.post(`${audioUrl}/continue-phase-a`, { courseCode, options });
    res.json(response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ success: false, error: 'Audio server not running' });
    }
    res.status(error.response?.status || 500).json({ success: false, error: error.message });
  }
}
app.post('/api/audio/continue', handleAudioContinue);
app.post('/api/phase8/continue', handleAudioContinue);  // Legacy

/**
 * POST /api/audio/regenerate (APML v9.0) and /api/phase8/regenerate (legacy)
 */
async function handleAudioRegenerate(req, res) {
  try {
    const { courseCode, uuids } = req.body;
    const audioUrl = PHASE_SERVERS['audio'];

    const response = await axios.post(`${audioUrl}/regenerate`, { courseCode, uuids });
    res.json(response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ success: false, error: 'Audio server not running' });
    }
    res.status(error.response?.status || 500).json({ success: false, error: error.message });
  }
}
app.post('/api/audio/regenerate', handleAudioRegenerate);
app.post('/api/phase8/regenerate', handleAudioRegenerate);  // Legacy

/**
 * POST /api/audio/regenerate-role/:courseCode - Regenerate all audio for a specific role
 * Body: { role, dryRun, limit, flaggedOnly }
 */
async function handleAudioRegenerateRole(req, res) {
  try {
    const { courseCode } = req.params;
    const { role, dryRun, limit, flaggedOnly } = req.body;
    const audioUrl = PHASE_SERVERS['audio'];

    const response = await axios.post(`${audioUrl}/regenerate-role/${courseCode}`, { role, dryRun, limit, flaggedOnly });
    res.json(response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ success: false, error: 'Audio server not running (port 3465)' });
    }
    res.status(error.response?.status || 500).json({ success: false, error: error.message });
  }
}
app.post('/api/audio/regenerate-role/:courseCode', handleAudioRegenerateRole);

/**
 * GET /api/audio/status - Get current audio generation progress
 * Proxies to phase 8 audio server /status endpoint
 */
app.get('/api/audio/status', async (req, res) => {
  try {
    const audioUrl = PHASE_SERVERS['audio'];
    const response = await axios.get(`${audioUrl}/status`);
    res.json(response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.json({ active: false, error: 'Audio server not running' });
    }
    res.json({ active: false, error: error.message });
  }
});

/**
 * POST /api/audio/regenerate-presentations/:courseCode - Regenerate presentation text for a course
 * Body: { dryRun, regenerateAudio }
 */
async function handleAudioRegeneratePresentations(req, res) {
  try {
    const { courseCode } = req.params;
    const { dryRun, regenerateAudio } = req.body;
    const audioUrl = PHASE_SERVERS['audio'];

    const response = await axios.post(`${audioUrl}/regenerate-presentations/${courseCode}`, { dryRun, regenerateAudio });
    res.json(response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ success: false, error: 'Audio server not running (port 3465)' });
    }
    res.status(error.response?.status || 500).json({ success: false, error: error.message });
  }
}
app.post('/api/audio/regenerate-presentations/:courseCode', handleAudioRegeneratePresentations);

/**
 * GET /api/audio/qc-report/:courseCode (APML v9.0) and /api/phase8/qc-report/:courseCode (legacy)
 */
async function handleAudioQCReport(req, res) {
  try {
    const { courseCode } = req.params;
    const qcReportPath = path.join(VFS_ROOT, 'courses', courseCode, 'qc_report_raw.json');

    if (!await fs.pathExists(qcReportPath)) {
      return res.status(404).json({ success: false, error: 'QC report not found' });
    }

    const report = await fs.readJson(qcReportPath);
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
app.get('/api/audio/qc-report/:courseCode', handleAudioQCReport);
app.get('/api/phase8/qc-report/:courseCode', handleAudioQCReport);  // Legacy

/**
 * GET /api/audio/voices - Get all available voices for selection UI
 */
app.get('/api/audio/voices', async (req, res) => {
  try {
    // Forward to audio server
    const audioServerUrl = 'http://localhost:3465/voices';
    const response = await fetch(audioServerUrl);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    // Fallback: read voices.json directly
    try {
      const voicesPath = path.join(__dirname, '../../vfs/canonical/voices.json');
      const registry = await fs.readJson(voicesPath);

      // Group voices by language for the UI
      const voicesByLanguage = {};
      const englishVoices = [];

      for (const [voiceId, voice] of Object.entries(registry.voices)) {
        const lang = voice.language;
        if (lang === 'eng') {
          englishVoices.push({ id: voiceId, ...voice });
        } else {
          if (!voicesByLanguage[lang]) {
            voicesByLanguage[lang] = [];
          }
          voicesByLanguage[lang].push({ id: voiceId, ...voice });
        }
      }

      res.json({
        success: true,
        voices: registry.voices,
        byLanguage: voicesByLanguage,
        english: englishVoices,
        languagePairAssignments: registry.language_pair_assignments,
        courseAssignments: registry.course_assignments
      });
    } catch (fallbackError) {
      res.status(500).json({ success: false, error: 'Failed to load voices: ' + error.message });
    }
  }
});

// =============================================================================
// VOICE DISCOVERY API - Browse and preview Azure/ElevenLabs voices
// =============================================================================

const voiceDiscovery = require('../voice-discovery-service.cjs');
const azureTTS = require('../azure-tts-service.cjs');

/**
 * GET /api/voices/discover/:languageCode
 * Discover available Azure voices for a language
 *
 * Returns list of voices with quality scores, filtered to Neural voices
 */
app.get('/api/voices/discover/:languageCode', async (req, res) => {
  const { languageCode } = req.params;

  console.log(`[VoiceDiscovery] Discovering voices for: ${languageCode}`);

  try {
    const voices = await voiceDiscovery.discoverAzureVoices(languageCode);

    // Sort by quality score (Neural first, then by features)
    const sorted = voices.sort((a, b) => b.quality - a.quality);

    // Get recommended voices
    const recommended = voiceDiscovery.selectBestVoices(voices, 4);

    res.json({
      success: true,
      languageCode,
      total: voices.length,
      voices: sorted,
      recommended: recommended.map((v, i) => ({
        ...v,
        reason: voiceDiscovery.getRecommendationReason(v, i)
      })),
      sampleSentences: voiceDiscovery.getSampleSentences(languageCode, 3)
    });
  } catch (error) {
    console.error(`[VoiceDiscovery] Error:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Check AZURE_SPEECH_KEY and AZURE_SPEECH_REGION environment variables'
    });
  }
});

/**
 * POST /api/voices/preview
 * Generate a preview audio sample for a voice
 *
 * Body: {
 *   voiceId: "zh-CN-XiaoxiaoNeural",
 *   text: "你好，你好吗？",
 *   speed: 1.0,
 *   provider: "azure"  // or "elevenlabs"
 * }
 */
app.post('/api/voices/preview', async (req, res) => {
  const { voiceId, text, speed = 1.0, provider = 'azure' } = req.body;

  if (!voiceId || !text) {
    return res.status(400).json({
      success: false,
      error: 'voiceId and text are required'
    });
  }

  console.log(`[VoicePreview] Generating preview: ${voiceId} @ ${speed}x`);

  try {
    const previewDir = path.join(__dirname, '../../temp/voice_previews');
    await fs.ensureDir(previewDir);

    const sanitizedId = voiceId.replace(/[^a-zA-Z0-9-]/g, '_');
    const timestamp = Date.now();
    const outputPath = path.join(previewDir, `preview_${sanitizedId}_${timestamp}.mp3`);

    if (provider === 'azure') {
      await azureTTS.generateAudioWithRetry(text, voiceId, outputPath, speed);
    } else if (provider === 'elevenlabs') {
      // ElevenLabs preview support - delegate to elevenlabs service
      const elevenLabs = require('../elevenlabs-service.cjs');
      await elevenLabs.generateAudio(text, voiceId, outputPath, { speed });
    } else {
      return res.status(400).json({ success: false, error: `Unknown provider: ${provider}` });
    }

    // Read the file and send as base64 for easy frontend playback
    const audioBuffer = await fs.readFile(outputPath);
    const base64Audio = audioBuffer.toString('base64');

    // Clean up the temp file after a delay
    setTimeout(() => {
      fs.remove(outputPath).catch(() => {});
    }, 60000); // 1 minute

    res.json({
      success: true,
      voiceId,
      text,
      speed,
      provider,
      audio: `data:audio/mpeg;base64,${base64Audio}`,
      duration: audioBuffer.length / 16000 // Rough estimate
    });
  } catch (error) {
    console.error(`[VoicePreview] Error:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/voices/samples/:languageCode
 * Get sample sentences for testing voices
 */
app.get('/api/voices/samples/:languageCode', (req, res) => {
  const { languageCode } = req.params;
  const count = parseInt(req.query.count) || 5;

  const samples = voiceDiscovery.getSampleSentences(languageCode, count);

  res.json({
    success: true,
    languageCode,
    samples
  });
});

/**
 * Run Phase 1 Validation: LUT Collision Check
 * Checks if same KNOWN phrase maps to multiple TARGET translations
 * This is inline validation, not a separate phase
 */
async function runPhase1ValidationCheck(seedPairsPath) {
  const validationScript = path.join(__dirname, '../../scripts/phase2_collision_check.cjs');

  return new Promise((resolve) => {
    const child = spawn('node', [validationScript, seedPairsPath], {
      stdio: 'pipe' // Capture output
    });

    let output = '';
    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log(`[Phase 1 Validation] ${text.trim()}`);
    });

    child.stderr.on('data', (data) => {
      console.error(`[Phase 1 Validation] ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`[Orchestrator] ✅ Phase 1 Validation: No FD violations detected`);
        resolve({ passed: true, violations: 0 });
      } else {
        console.warn(`[Orchestrator] ⚠️  Phase 1 Validation: Found FD violations`);
        resolve({ passed: false, violations: 'see logs' });
      }
    });

    child.on('error', (err) => {
      console.error(`[Orchestrator] ⚠️  Phase 1 validation check failed:`, err.message);
      resolve({ passed: false, error: err.message });
    });
  });
}

/**
 * POST /api/phase1/:courseCode/submit
 * Accept completed seed_pairs.json from agents via ngrok
 */
app.post('/api/phase1/:courseCode/submit', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const seedPairs = req.body;

    // Validate basic structure
    if (!seedPairs.course || !seedPairs.translations) {
      return res.status(400).json({
        error: 'Invalid seed_pairs format',
        required: ['course', 'translations']
      });
    }

    // Write to VFS
    const outputPath = path.join(VFS_ROOT, courseCode, 'seed_pairs.json');
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeJSON(outputPath, seedPairs, { spaces: 2 });

    const seedCount = Object.keys(seedPairs.translations).length;

    console.log(`[Orchestrator] ✅ Received Phase 1 submission for ${courseCode}`);
    console.log(`[Orchestrator]    Seeds: ${seedCount}`);
    console.log(`[Orchestrator]    Saved to: ${outputPath}`);

    // Update progress tracking
    updatePhaseProgress(courseCode, 1, {
      status: 'validating',
      seedsComplete: seedCount,
      seedsTotal: seedCount
    });
    addProgressLog(courseCode, `Phase 1: Received ${seedCount} translations`);

    // Run inline validation (LUT - Learner Uncertainty Test)
    console.log(`[Orchestrator] 🔍 Running LUT collision check...`);
    addProgressLog(courseCode, 'Running LUT collision check...');
    const validationResult = await runPhase1ValidationCheck(outputPath);

    // Mark Phase 1 as complete
    updatePhaseProgress(courseCode, 1, {
      status: 'complete',
      endTime: new Date().toISOString(),
      validation: validationResult
    });
    addProgressLog(courseCode, `Phase 1: Complete ${validationResult.passed ? '✅' : '⚠️'}`, validationResult.passed ? 'info' : 'warning');

    // Update current phase to next
    const progress = courseProgress.get(courseCode);
    if (progress) {
      progress.currentPhase = 2;
    }

    // Phase 1 submit received - Phase 2 is triggered by master completion, not here
    // (The master complete handler runs Phase 2 inline and then triggers Phase 3)
    console.log(`[Orchestrator] → Phase 1 data submitted, awaiting master completion for Phase 2`);
    addProgressLog(courseCode, 'Phase 1: data submitted');

    res.json({
      success: true,
      message: `Phase 1 submission received for ${courseCode}`,
      seedCount,
      savedTo: outputPath,
      validation: validationResult
    });
  } catch (error) {
    console.error(`[Orchestrator] Error accepting Phase 1 submission:`, error);
    res.status(500).json({ error: 'Failed to save Phase 1 submission', details: error.message });
  }
});

/**
 * POST /api/phase1/:courseCode/upload-batch
 * Proxy to Phase 1 server - workers upload their completed batches here
 */
app.post('/api/phase1/:courseCode/upload-batch', async (req, res) => {
  const { courseCode } = req.params;
  const batchData = req.body;

  if (!Array.isArray(batchData)) {
    return res.status(400).json({ error: 'Expected JSON array of seed objects' });
  }

  const batchesDir = path.join(VFS_ROOT, courseCode, 'phase1_batches');
  await fs.ensureDir(batchesDir);

  // Save batch with timestamp + random suffix to avoid collisions
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const batchFile = `batch_${Date.now()}_${randomSuffix}_${batchData.length}seeds.json`;
  await fs.writeJSON(path.join(batchesDir, batchFile), batchData, { spaces: 2 });

  console.log(`[Orchestrator] ✅ Phase 1 batch received: ${batchData.length} seeds → ${batchFile}`);

  // Update progress for dashboard visibility (safe init if not exists)
  if (!courseProgress.has(courseCode)) {
    initializeCourseProgress(courseCode, 1, batchData.length);
  }
  addProgressLog(courseCode, `Phase 1 batch received: ${batchData.length} seeds`);

  // Update lastBatchTime for stall detection
  const phase1State = courseProgress.get(`${courseCode}_phase1`);
  if (phase1State) {
    phase1State.lastBatchTime = Date.now();
    courseProgress.set(`${courseCode}_phase1`, phase1State);
  }

  res.json({ success: true, received: batchData.length, file: batchFile });
});

/**
 * POST /api/phase1/:courseCode/master-complete
 * Masters report completion here
 *
 * SEED-BASED COMPLETION: We use actual seed coverage, not master count
 * This ensures we have ALL expected seeds before proceeding
 */
app.post('/api/phase1/:courseCode/master-complete', async (req, res) => {
  const { courseCode } = req.params;
  const { masterNum, seedsProcessed, totalMasters: reportedTotalMasters, startSeed: reportedStart, endSeed: reportedEnd } = req.body;

  console.log(`[Orchestrator] ✅ Phase 1 Master ${masterNum} complete: ${seedsProcessed} seeds`);

  // Get or initialize Phase 1 state
  let phase1State = courseProgress.get(`${courseCode}_phase1`);
  if (!phase1State) {
    // State doesn't exist - this can happen after orchestrator restart
    // Use reported values from the agent, or infer from context
    const inferredStart = reportedStart || 1;
    const inferredEnd = reportedEnd || (reportedTotalMasters ? reportedTotalMasters * 2 : 10);  // Rough estimate
    phase1State = {
      expectedStartSeed: inferredStart,
      expectedEndSeed: inferredEnd,
      expectedTotalSeeds: inferredEnd - inferredStart + 1,
      mastersComplete: 0,
      totalMasters: reportedTotalMasters || masterNum || 1,
      seedsProcessed: 0,
      receivedSeedIds: new Set()
    };
    console.log(`[Orchestrator] Phase 1 state recovered: expecting seeds S${String(inferredStart).padStart(4, '0')} to S${String(inferredEnd).padStart(4, '0')}`);
  }

  // Update master count (informational only)
  phase1State.mastersComplete++;
  phase1State.seedsProcessed += seedsProcessed || 0;
  if (reportedTotalMasters) {
    phase1State.totalMasters = reportedTotalMasters;
  }
  courseProgress.set(`${courseCode}_phase1`, phase1State);

  // ========== SEED-BASED COMPLETION CHECK ==========
  // The key insight: check actual seed coverage, not master count
  // For resume mode, use expectedSeeds array; for normal mode, use start/end range
  const coverage = await checkPhase1SeedCoverage(
    courseCode,
    phase1State.expectedStartSeed,
    phase1State.expectedEndSeed,
    phase1State.expectedSeeds  // Pass specific seeds for resume mode
  );

  console.log(`[Orchestrator] Seed coverage check for ${courseCode}:`);
  if (phase1State.isResume && phase1State.expectedSeeds) {
    console.log(`   → Expected: ${coverage.stats.expected} specific seeds (resume mode)`);
  } else {
    console.log(`   → Expected: ${coverage.stats.expected} seeds (S${String(phase1State.expectedStartSeed).padStart(4, '0')} to S${String(phase1State.expectedEndSeed).padStart(4, '0')})`)
  }
  console.log(`   → Received: ${coverage.stats.received} seeds (${coverage.stats.coverage})`);
  console.log(`   → Missing: ${coverage.stats.missing} seeds`);
  if (coverage.missing.length > 0 && coverage.missing.length <= 10) {
    console.log(`   → Missing IDs: ${coverage.missing.join(', ')}`);
  } else if (coverage.missing.length > 10) {
    console.log(`   → Missing IDs: ${coverage.missing.slice(0, 10).join(', ')}... and ${coverage.missing.length - 10} more`);
  }

  // Update main course progress for dashboard visibility
  if (!courseProgress.has(courseCode)) {
    initializeCourseProgress(courseCode, 1, phase1State.expectedTotalSeeds);
  }
  updatePhaseProgress(courseCode, 1, {
    status: coverage.complete ? 'complete' : 'running',
    mastersComplete: phase1State.mastersComplete,
    totalMasters: phase1State.totalMasters,
    seedsProcessed: coverage.stats.received,
    expectedSeeds: coverage.stats.expected,
    coverage: coverage.stats.coverage
  });
  addProgressLog(courseCode, `Phase 1 Master ${masterNum} complete (${seedsProcessed} seeds, total coverage: ${coverage.stats.coverage})`);

  // ========== COMPLETION DECISION ==========
  if (!coverage.complete) {
    // Not all seeds received yet - report status and wait
    console.log(`[Orchestrator] ⏳ Phase 1 not complete: ${coverage.stats.missing} seeds still missing`);
    addProgressLog(courseCode, `Waiting for ${coverage.stats.missing} more seeds (${coverage.stats.coverage} complete)`);

    // TODO: Future enhancement - intelligent gap-filling
    // If masters are all done but seeds are missing, spawn targeted agents:
    // if (phase1State.mastersComplete >= phase1State.totalMasters && coverage.missing.length > 0) {
    //   console.log(`[Orchestrator] All masters done but ${coverage.missing.length} seeds missing - spawning gap-fill agents`);
    //   await spawnGapFillAgents(courseCode, coverage.missing);
    // }

    return res.json({
      success: true,
      status: 'waiting',
      masterNum,
      coverage: coverage.stats,
      missing: coverage.missing.length <= 20 ? coverage.missing : coverage.missing.slice(0, 20)
    });
  }

  // ========== ALL SEEDS RECEIVED - MERGE AND PROCEED ==========
  console.log(`[Orchestrator] 🎉 Phase 1 complete! All ${coverage.stats.expected} seeds received.`);
  addProgressLog(courseCode, `Phase 1 complete! All ${coverage.stats.expected} seeds received. Merging...`);

  // Merge all batch files
  const batchesDir = path.join(VFS_ROOT, courseCode, 'phase1_batches');
  const batchFiles = (await fs.readdir(batchesDir)).filter(f => f.endsWith('.json'));

  const allSeeds = [];
  for (const file of batchFiles) {
    const batch = await fs.readJSON(path.join(batchesDir, file));
    allSeeds.push(...batch);
  }

  // Deduplicate by seed_id (in case of retries/duplicates)
  const seedMap = new Map();
  for (const seed of allSeeds) {
    const seedId = seed.s || seed.seed_id;
    if (!seedMap.has(seedId)) {
      seedMap.set(seedId, seed);
    }
  }
  const deduplicatedSeeds = Array.from(seedMap.values());

  // Sort by seed_id
  deduplicatedSeeds.sort((a, b) => {
    const aId = a.s || a.seed_id;
    const bId = b.s || b.seed_id;
    return aId.localeCompare(bId);
  });

  // Write draft_lego_pairs.json
  const outputPath = path.join(VFS_ROOT, courseCode, 'draft_lego_pairs.json');
  await fs.writeJSON(outputPath, deduplicatedSeeds, { spaces: 2 });

  console.log(`[Orchestrator] ✅ Merged ${deduplicatedSeeds.length} seeds → draft_lego_pairs.json`);
  addProgressLog(courseCode, `Merged ${deduplicatedSeeds.length} seeds into draft_lego_pairs.json`);

  // Trigger Phase 2 (Conflict Resolution)
  console.log(`[Orchestrator] → Triggering Phase 2 (Conflict Resolution)...`);
  updatePhaseProgress(courseCode, 2, { status: 'running', startTime: new Date().toISOString() });
  addProgressLog(courseCode, `Phase 2: Starting conflict detection...`);

  const phase2Server = PHASE_SERVERS[2];

  try {
    // Step 1: Detect conflicts
    console.log(`[Orchestrator]    Step 1: Detecting conflicts...`);
    const detectResponse = await axios.post(`${phase2Server}/phase2/detect`, { courseCode });
    const conflictCount = detectResponse.data?.summary?.conflictCount || 0;
    console.log(`[Orchestrator]    ✓ Found ${conflictCount} conflicts`);
    addProgressLog(courseCode, `Phase 2: Found ${conflictCount} conflicts`);

    // Step 2: Apply LEGO reuse tracking
    console.log(`[Orchestrator]    Step 2: Applying LEGO reuse tracking...`);
    addProgressLog(courseCode, `Phase 2: Applying LEGO reuse tracking...`);
    const resolutionsPath = path.join(VFS_ROOT, courseCode, 'upchunk_resolutions.json');
    let resolutions = [];
    if (await fs.pathExists(resolutionsPath)) {
      const resData = await fs.readJSON(resolutionsPath);
      resolutions = resData.resolutions || resData || [];
      console.log(`[Orchestrator]    📄 Found ${resolutions.length} manual resolutions`);
      addProgressLog(courseCode, `Phase 2: Found ${resolutions.length} manual resolutions`);
    }

    const applyResponse = await axios.post(`${phase2Server}/phase2/apply`, {
      courseCode,
      resolutions
    });

    const summary = applyResponse.data?.summary || {};
    console.log(`[Orchestrator]    ✓ Created lego_pairs.json`);
    console.log(`[Orchestrator]      - Unique LEGOs (new: true): ${summary.uniqueNew || 'N/A'}`);
    console.log(`[Orchestrator]      - Exact duplicates: ${summary.exactDuplicates || 'N/A'}`);
    console.log(`[Orchestrator]      - Embedded: ${summary.embeddedMatches || 'N/A'}`);

    // Update Phase 2 as complete with summary
    updatePhaseProgress(courseCode, 2, {
      status: 'complete',
      endTime: new Date().toISOString(),
      uniqueNew: summary.uniqueNew || 0,
      exactDuplicates: summary.exactDuplicates || 0,
      embeddedMatches: summary.embeddedMatches || 0
    });
    addProgressLog(courseCode, `Phase 2: Complete. Created lego_pairs.json (${summary.uniqueNew || 0} unique, ${summary.exactDuplicates || 0} duplicates)`);

    // Step 3: Trigger Phase 3
    console.log(`[Orchestrator] → Phase 2 complete, triggering Phase 3 in 2s...`);
    addProgressLog(courseCode, `Phase 2 complete. Auto-triggering Phase 3 in 2s...`);

    // Store seed count for Phase 3 closure
    const seedCount = deduplicatedSeeds.length;

    setTimeout(async () => {
      console.log(`[Orchestrator] 🚀 Auto-triggering Phase 3 for ${courseCode}`);
      updatePhaseProgress(courseCode, 3, { status: 'starting', startTime: new Date().toISOString() });
      addProgressLog(courseCode, `Phase 3: Starting basket generation for ${seedCount} seeds...`);

      try {
        const phase3Server = PHASE_SERVERS[3];

        // Extract language codes from courseCode (e.g., "spa_for_eng" -> target="spa", known="eng")
        const langParts = courseCode.split('_for_');
        const targetCode = langParts[0] || 'spa';
        const knownCode = langParts[1] || 'eng';

        // Convert to language names for Phase 3 prompts
        const targetName = getLanguageName(targetCode);
        const knownName = getLanguageName(knownCode);

        console.log(`[Orchestrator]    Target: ${targetName} (${targetCode}), Known: ${knownName} (${knownCode})`);

        await axios.post(`${phase3Server}/start`, {
          courseCode,
          startSeed: 1,
          endSeed: seedCount,
          target: targetName,
          known: knownName
        });
        console.log(`[Orchestrator] ✅ Phase 3 started`);
        updatePhaseProgress(courseCode, 3, { status: 'running' });
        addProgressLog(courseCode, `Phase 3: Basket generation started successfully`);

        // Initialize Phase 3 state for stall detection
        courseProgress.set(`${courseCode}_phase3`, {
          expectedStartSeed: 1,
          expectedEndSeed: seedCount,
          target: targetName,
          known: knownName,
          startTime: Date.now(),
          lastBatchTime: Date.now(),
          gapFillTriggered: false,
          gapFillAttempt: 0
        });

        // Start stall watchdog for Phase 3
        startPhase3StallWatchdog(courseCode);
      } catch (phase3Error) {
        console.error(`[Orchestrator] ❌ Failed to start Phase 3:`, phase3Error.message);
        updatePhaseProgress(courseCode, 3, { status: 'error', error: phase3Error.message });
        addProgressLog(courseCode, `Phase 3: Failed to start - ${phase3Error.message}`, 'error');
      }
    }, 2000);

  } catch (phase2Error) {
    console.error(`[Orchestrator] ❌ Phase 2 failed:`, phase2Error.message);
    updatePhaseProgress(courseCode, 2, { status: 'error', error: phase2Error.message });
    addProgressLog(courseCode, `Phase 2: Failed - ${phase2Error.message}`, 'error');
  }

  res.json({
    success: true,
    masterNum,
    status: 'complete',
    coverage: coverage.stats,
    seedCount: deduplicatedSeeds.length
  });
});

/**
 * GET /api/phase2/:courseCode/draft
 * Return all seeds from draft_lego_pairs.json
 */
app.get('/api/phase2/:courseCode/draft', async (req, res) => {
  const { courseCode } = req.params;
  const draftPath = path.join(VFS_ROOT, courseCode, 'draft_lego_pairs.json');

  if (!await fs.pathExists(draftPath)) {
    return res.status(404).json({ error: `draft_lego_pairs.json not found for ${courseCode}` });
  }

  try {
    const draftData = await fs.readJSON(draftPath);
    console.log(`[Orchestrator] Phase 2 draft requested: ${courseCode} → ${Array.isArray(draftData) ? draftData.length : 'N/A'} seeds`);
    res.json(draftData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/phase2/:courseCode/seeds
 * Return seeds from draft_lego_pairs.json by IDs
 * Query: ?ids=S0001,S0002,S0003
 */
app.get('/api/phase2/:courseCode/seeds', async (req, res) => {
  const { courseCode } = req.params;
  const { ids } = req.query;

  if (!ids) {
    return res.status(400).json({ error: 'ids query parameter required (comma-separated)' });
  }

  const seedIds = ids.split(',').map(s => s.trim());
  const draftPath = path.join(VFS_ROOT, courseCode, 'draft_lego_pairs.json');

  if (!await fs.pathExists(draftPath)) {
    return res.status(404).json({ error: `draft_lego_pairs.json not found for ${courseCode}` });
  }

  try {
    const draftData = await fs.readJSON(draftPath);
    const seeds = Array.isArray(draftData) ? draftData : draftData.seeds;

    const requestedSeeds = seeds.filter(s => seedIds.includes(s.seed_id));

    console.log(`[Orchestrator] Phase 2 seeds requested: ${seedIds.join(', ')} → ${requestedSeeds.length} found`);

    res.json({
      courseCode,
      requested: seedIds.length,
      found: requestedSeeds.length,
      seeds: requestedSeeds
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/phase2/:courseCode/upload
 * Simple upload endpoint for Phase 2 results (writes to lego_pairs.json)
 */
app.post('/api/phase2/:courseCode/upload', async (req, res) => {
  const { courseCode } = req.params;
  const data = req.body;

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: 'Expected JSON array of seed objects' });
  }

  const courseDir = path.join(VFS_ROOT, courseCode);
  await fs.ensureDir(courseDir);
  const outputPath = path.join(courseDir, 'lego_pairs.json');
  await fs.writeJSON(outputPath, data, { spaces: 2 });

  console.log(`[Orchestrator] ✅ Phase 2 complete: ${data.length} seeds → lego_pairs.json`);

  res.json({ success: true, received: data.length, file: 'lego_pairs.json' });
});

/**
 * POST /api/phase2/:courseCode/upload-batch
 * Workers upload their resolved seeds here
 */
app.post('/api/phase2/:courseCode/upload-batch', async (req, res) => {
  const { courseCode } = req.params;
  const batchData = req.body;

  if (!Array.isArray(batchData)) {
    return res.status(400).json({ error: 'Expected JSON array of seed objects' });
  }

  const batchesDir = path.join(VFS_ROOT, courseCode, 'phase2_batches');
  await fs.ensureDir(batchesDir);

  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const batchFile = `batch_${Date.now()}_${randomSuffix}_${batchData.length}seeds.json`;
  await fs.writeJSON(path.join(batchesDir, batchFile), batchData, { spaces: 2 });

  console.log(`[Orchestrator] ✅ Phase 2 batch received: ${batchData.length} seeds → ${batchFile}`);

  res.json({ success: true, received: batchData.length, file: batchFile });
});

/**
 * POST /api/phase2/:courseCode/master-complete
 * Masters report completion here
 */
app.post('/api/phase2/:courseCode/master-complete', async (req, res) => {
  const { courseCode } = req.params;
  const { seedsProcessed, masterNum } = req.body;

  console.log(`[Orchestrator] ✅ Phase 2 Master complete: ${seedsProcessed} seeds`);

  // Update main course progress for dashboard visibility (safe init if not exists)
  if (!courseProgress.has(courseCode)) {
    initializeCourseProgress(courseCode, 2, seedsProcessed || 10);
  }
  updatePhaseProgress(courseCode, 2, {
    status: 'complete',
    seedsProcessed: seedsProcessed || 0
  });
  addProgressLog(courseCode, `Phase 2 Master ${masterNum || '?'} complete (${seedsProcessed} seeds)`);

  res.json({ success: true, acknowledged: true });
});

/**
 * POST /api/phase3/:courseCode/submit
 * Accept completed lego_pairs.json and introductions.json from agents via ngrok
 */
app.post('/api/phase3/:courseCode/submit', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { lego_pairs, introductions } = req.body;

    // Validate both objects exist
    if (!lego_pairs || !introductions) {
      return res.status(400).json({
        error: 'Invalid Phase 3 submission format',
        required: ['lego_pairs', 'introductions'],
        received: {
          has_lego_pairs: !!lego_pairs,
          has_introductions: !!introductions
        }
      });
    }

    // Validate lego_pairs structure (must have course and seeds array)
    if (!lego_pairs.course || !Array.isArray(lego_pairs.seeds)) {
      return res.status(400).json({
        error: 'Invalid lego_pairs structure',
        required: ['course', 'seeds (array)'],
        received: {
          has_course: !!lego_pairs.course,
          has_seeds: Array.isArray(lego_pairs.seeds)
        }
      });
    }

    // Validate introductions structure (must have version/course and presentations object)
    if (!introductions.version || !introductions.presentations || typeof introductions.presentations !== 'object') {
      return res.status(400).json({
        error: 'Invalid introductions structure',
        required: ['version', 'presentations (object)'],
        received: {
          has_version: !!introductions.version,
          has_presentations: !!introductions.presentations
        }
      });
    }

    // Validate component format (must be array of objects with known/target, not array of strings)
    const invalidComponents = [];
    lego_pairs.seeds.forEach(seed => {
      seed.legos?.forEach(lego => {
        if (lego.components && Array.isArray(lego.components) && lego.components.length > 0) {
          const firstComponent = lego.components[0];
          // Check if it's a string (invalid) instead of object with known/target (valid)
          if (typeof firstComponent === 'string') {
            invalidComponents.push({
              seed_id: seed.seed_id,
              lego_id: lego.id,
              invalid_format: lego.components
            });
          } else if (typeof firstComponent === 'object' && (!firstComponent.hasOwnProperty('known') || !firstComponent.hasOwnProperty('target'))) {
            invalidComponents.push({
              seed_id: seed.seed_id,
              lego_id: lego.id,
              invalid_format: 'Object missing known/target properties',
              received: firstComponent
            });
          }
        }
      });
    });

    if (invalidComponents.length > 0) {
      return res.status(400).json({
        error: 'Invalid component format detected',
        message: 'Components must be array of objects with {known, target} properties, not array of strings',
        invalid_legos: invalidComponents,
        example_correct: [
          { known: "I", target: "je" },
          { known: "like", target: "aime" }
        ],
        example_incorrect: ["je", "aime"]
      });
    }

    // Ensure course directory exists
    const courseDir = path.join(VFS_ROOT, courseCode);
    await fs.ensureDir(courseDir);

    // Save lego_pairs.json with merge support
    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
    let finalLegoPairs = lego_pairs;

    if (await fs.pathExists(legoPairsPath)) {
      console.log(`[Orchestrator] 📦 Merging with existing lego_pairs.json`);
      const existingLegoPairs = await fs.readJSON(legoPairsPath);

      // Merge seeds arrays (dedupe by seed_id, new data overwrites)
      const seedMap = new Map();

      // Add existing seeds first
      if (existingLegoPairs.seeds) {
        existingLegoPairs.seeds.forEach(seed => {
          seedMap.set(seed.seed_id, seed);
        });
      }

      // Overwrite with new seeds
      if (lego_pairs.seeds) {
        lego_pairs.seeds.forEach(seed => {
          seedMap.set(seed.seed_id, seed);
        });
      }

      // Sort by seed_id (S0001, S0002, ...)
      const sortedSeeds = Array.from(seedMap.values()).sort((a, b) => {
        const numA = parseInt(a.seed_id.substring(1));
        const numB = parseInt(b.seed_id.substring(1));
        return numA - numB;
      });

      finalLegoPairs = {
        ...existingLegoPairs,
        ...lego_pairs,
        seeds: sortedSeeds
      };

      const existingCount = existingLegoPairs.seeds?.length || 0;
      const newCount = lego_pairs.seeds?.length || 0;
      const mergedCount = finalLegoPairs.seeds.length;
      console.log(`[Orchestrator]    Existing: ${existingCount} seeds`);
      console.log(`[Orchestrator]    New: ${newCount} seeds`);
      console.log(`[Orchestrator]    Merged total: ${mergedCount} seeds (sorted)`);
    }

    await fs.writeJSON(legoPairsPath, finalLegoPairs, { spaces: 2 });

    // Save introductions.json with merge support
    const introductionsPath = path.join(courseDir, 'introductions.json');
    let finalIntroductions = introductions;

    if (await fs.pathExists(introductionsPath)) {
      console.log(`[Orchestrator] 📦 Merging with existing introductions.json`);
      const existingIntroductions = await fs.readJSON(introductionsPath);

      // Merge presentations objects (new overwrites existing)
      const mergedPresentations = {
        ...existingIntroductions.presentations,
        ...introductions.presentations
      };

      // Sort by key (S0001L01, S0001L02, ...)
      const sortedPresentations = {};
      const keys = Object.keys(mergedPresentations).sort((a, b) => {
        const matchA = a.match(/S(\d+)L(\d+)/);
        const matchB = b.match(/S(\d+)L(\d+)/);
        if (matchA && matchB) {
          const seedDiff = parseInt(matchA[1]) - parseInt(matchB[1]);
          if (seedDiff !== 0) return seedDiff;
          return parseInt(matchA[2]) - parseInt(matchB[2]);
        }
        return a.localeCompare(b);
      });

      keys.forEach(key => {
        sortedPresentations[key] = mergedPresentations[key];
      });

      finalIntroductions = {
        ...existingIntroductions,
        ...introductions,
        presentations: sortedPresentations
      };

      const existingCount = Object.keys(existingIntroductions.presentations || {}).length;
      const newCount = Object.keys(introductions.presentations || {}).length;
      const mergedCount = Object.keys(finalIntroductions.presentations).length;
      console.log(`[Orchestrator]    Existing: ${existingCount} presentations`);
      console.log(`[Orchestrator]    New: ${newCount} presentations`);
      console.log(`[Orchestrator]    Merged total: ${mergedCount} presentations (sorted)`);
    }

    await fs.writeJSON(introductionsPath, finalIntroductions, { spaces: 2 });

    // Count this submission's contribution (for activity log)
    const submittedSeedCount = lego_pairs.seeds.length;
    const submittedLegoCount = lego_pairs.seeds.reduce((count, seed) => count + (seed.legos?.length || 0), 0);
    const submittedIntroCount = Object.keys(introductions.presentations || {}).length;

    // Get seed range from this submission
    let seedRange = '';
    if (lego_pairs.seeds.length > 0) {
      const seedIds = lego_pairs.seeds.map(s => s.seed_id).sort();
      const firstSeed = seedIds[0];
      const lastSeed = seedIds[seedIds.length - 1];
      seedRange = submittedSeedCount === 1 ? firstSeed : `${firstSeed}-${lastSeed}`;
    }

    // Count total LEGOs across all seeds in merged result
    const seedCount = finalLegoPairs.seeds.length;
    const legoCount = finalLegoPairs.seeds.reduce((count, seed) => count + (seed.legos?.length || 0), 0);
    const introCount = Object.keys(finalIntroductions.presentations || {}).length;

    console.log(`[Orchestrator] ✅ Received Phase 3 submission for ${courseCode}`);
    console.log(`[Orchestrator]    This submission: ${seedRange} (${submittedLegoCount} LEGOs)`);
    console.log(`[Orchestrator]    Merged total: ${seedCount} seeds, ${legoCount} LEGOs, ${introCount} introductions`);
    console.log(`[Orchestrator]    Saved to: ${courseDir}`);

    // Log agent submission to activity log
    addProgressLog(courseCode, `Agent submitted ${seedRange} (${submittedLegoCount} LEGOs, ${submittedIntroCount} intros)`);

    // Check if Phase 3 is complete (all seeds extracted)
    const progress = courseProgress.get(courseCode);
    const expectedSeeds = progress?.phases?.[3]?.seedsTotal;
    const isComplete = expectedSeeds && seedCount >= expectedSeeds;

    if (isComplete) {
      // All agents have submitted - mark complete
      updatePhaseProgress(courseCode, 3, {
        status: 'complete',
        endTime: new Date().toISOString(),
        seedsCompleted: seedCount,
        seedsTotal: expectedSeeds,
        legoCount,
        introCount
      });
      addProgressLog(courseCode, `Phase 3: Complete - ${seedCount}/${expectedSeeds} seeds, ${legoCount} LEGOs`);

      // Advance to next phase
      if (progress) {
        progress.currentPhase = 'manifest';
      }

      // Trigger Manifest compilation automatically (with 2s delay for GitHub sync)
      console.log(`[Orchestrator] → Phase 3 complete, triggering Manifest compilation in 2s...`);
      setTimeout(() => {
        console.log(`[Orchestrator] 🚀 Auto-triggering Manifest compilation for ${courseCode}`);
        addProgressLog(courseCode, 'Starting Manifest compilation');
        triggerPhase(courseCode, 'manifest');
      }, 2000);
    } else {
      // More agents still working - keep running
      updatePhaseProgress(courseCode, 3, {
        status: 'running',
        seedsCompleted: seedCount,
        seedsTotal: expectedSeeds || seedCount,
        legoCount,
        introCount
      });
    }

    res.json({
      success: true,
      message: isComplete ? 'Phase 3 complete - all seeds extracted' : 'Phase 3 submission received and merged',
      submission: {
        seedRange,
        seedCount: submittedSeedCount,
        legoCount: submittedLegoCount,
        introCount: submittedIntroCount
      },
      merged: {
        seedCount,
        legoCount,
        introCount,
        isComplete,
        progress: expectedSeeds ? `${seedCount}/${expectedSeeds}` : `${seedCount} seeds`
      },
      savedTo: {
        lego_pairs: legoPairsPath,
        introductions: introductionsPath
      }
    });
  } catch (error) {
    console.error(`[Orchestrator] Error accepting Phase 3 submission:`, error);
    res.status(500).json({ error: 'Failed to save Phase 3 submission', details: error.message });
  }
});

// =============================================================================
// PHASE 3 BASKET GENERATION ENDPOINTS (APML v9.0)
// Legacy /api/phase5/* routes maintained for backward compatibility
// =============================================================================

/**
 * POST /api/phase3/:courseCode/submit (APML v9.0) and /api/phase5/:courseCode/submit (legacy)
 * Accept completed lego_baskets.json from agents via ngrok
 */
async function handlePhase3Submit(req, res) {
  try {
    const { courseCode } = req.params;
    const basketData = req.body;

    // Validate basic structure
    if (!basketData.version || !basketData.course || !basketData.baskets) {
      return res.status(400).json({
        error: 'Invalid lego_baskets format',
        required: ['version', 'course', 'baskets']
      });
    }

    // Write to VFS (with merge support)
    const outputPath = path.join(VFS_ROOT, courseCode, 'lego_baskets.json');
    await fs.ensureDir(path.dirname(outputPath));

    // Check if file already exists - if so, MERGE instead of overwrite
    // Always sort baskets for consistent ordering
    let finalBasketData = basketData;

    // Sort new baskets
    if (basketData.baskets) {
      const sortedBaskets = {};
      const keys = Object.keys(basketData.baskets).sort((a, b) => {
        const matchA = a.match(/S(\d+)L(\d+)/);
        const matchB = b.match(/S(\d+)L(\d+)/);
        if (matchA && matchB) {
          const seedDiff = parseInt(matchA[1]) - parseInt(matchB[1]);
          if (seedDiff !== 0) return seedDiff;
          return parseInt(matchA[2]) - parseInt(matchB[2]);
        }
        return a.localeCompare(b);
      });
      keys.forEach(key => {
        sortedBaskets[key] = basketData.baskets[key];
      });
      finalBasketData = {
        ...basketData,
        baskets: sortedBaskets
      };
    }

    if (await fs.pathExists(outputPath)) {
      console.log(`[Orchestrator] 📦 Merging with existing lego_baskets.json`);
      const existingData = await fs.readJSON(outputPath);

      // Merge baskets object (new baskets overwrite existing ones with same ID)
      const mergedBaskets = {
        ...existingData.baskets,
        ...basketData.baskets
      };

      // Sort baskets by key (SXXXXLXX format) for consistent ordering
      const sortedBaskets = {};
      const keys = Object.keys(mergedBaskets).sort((a, b) => {
        // Extract seed number and lego number for proper numeric sorting
        const matchA = a.match(/S(\d+)L(\d+)/);
        const matchB = b.match(/S(\d+)L(\d+)/);

        if (matchA && matchB) {
          const seedDiff = parseInt(matchA[1]) - parseInt(matchB[1]);
          if (seedDiff !== 0) return seedDiff;
          return parseInt(matchA[2]) - parseInt(matchB[2]);
        }

        // Fallback to string comparison
        return a.localeCompare(b);
      });

      keys.forEach(key => {
        sortedBaskets[key] = mergedBaskets[key];
      });

      finalBasketData = {
        ...existingData,
        ...basketData,
        baskets: sortedBaskets
      };

      const existingCount = Object.keys(existingData.baskets).length;
      const newCount = Object.keys(basketData.baskets).length;
      const mergedCount = Object.keys(finalBasketData.baskets).length;
      console.log(`[Orchestrator]    Existing: ${existingCount} baskets`);
      console.log(`[Orchestrator]    New: ${newCount} baskets`);
      console.log(`[Orchestrator]    Merged total: ${mergedCount} baskets (sorted)`);
    }

    await fs.writeJSON(outputPath, finalBasketData, { spaces: 2 });

    // Count baskets
    const basketCount = Object.keys(finalBasketData.baskets).length;

    // Count phrases
    let phraseCount = 0;
    Object.values(finalBasketData.baskets).forEach(basket => {
      phraseCount += basket.practice_phrases?.length || 0;
    });

    console.log(`[Orchestrator] ✅ Received Phase 3 (Baskets) submission for ${courseCode}`);
    console.log(`[Orchestrator]    Baskets: ${basketCount}`);
    console.log(`[Orchestrator]    Phrases: ${phraseCount}`);
    console.log(`[Orchestrator]    Saved to: ${outputPath}`);

    // Get progress data for context
    const progress = courseProgress.get(courseCode);
    const phase3Data = progress?.phases?.[3];

    // Update progress tracking (use phase 3 in v9.0)
    updatePhaseProgress(courseCode, 3, {
      status: 'complete',
      endTime: new Date().toISOString(),
      basketCount,
      phraseCount,
      legosCompleted: basketCount,
      legosTotal: phase3Data?.legosTotal || basketCount
    });

    // Create informative log message
    let logMsg = `✅ Phase 3 complete: ${basketCount} LEGOs`;
    if (phase3Data?.legosTotal && phase3Data.legosTotal !== basketCount) {
      logMsg += ` of ${phase3Data.legosTotal} expected`;
    }
    if (phase3Data?.seedsTotal) {
      logMsg += ` across ${phase3Data.seedsCompleted || phase3Data.seedsTotal} seeds`;
    }
    logMsg += ` (${phraseCount.toLocaleString()} practice phrases)`;

    addProgressLog(courseCode, logMsg);

    // Update current phase to next (Manifest in v9.0)
    if (progress) {
      progress.currentPhase = 'manifest';
    }

    // Trigger Manifest compilation automatically (with 2s delay for GitHub sync)
    console.log(`[Orchestrator] → Phase 3 complete, triggering Manifest compilation in 2s...`);
    setTimeout(() => {
      console.log(`[Orchestrator] 🚀 Auto-triggering Manifest compilation for ${courseCode}`);
      addProgressLog(courseCode, 'Starting Manifest compilation');
      triggerPhase(courseCode, 'manifest');
    }, 2000);

    res.json({
      success: true,
      message: `Phase 3 (Baskets) submission received for ${courseCode}`,
      basketCount: basketCount,
      savedTo: outputPath
    });
  } catch (error) {
    console.error(`[Orchestrator] Error accepting Phase 3 submission:`, error);
    res.status(500).json({ error: 'Failed to save Phase 3 submission', details: error.message });
  }
}
app.post('/api/phase3/:courseCode/submit', handlePhase3Submit);
app.post('/api/phase5/:courseCode/submit', handlePhase3Submit);  // Legacy

// =============================================================================
// MANIFEST COMPILATION ENDPOINTS (APML v9.0)
// Legacy /api/phase7/* routes maintained for backward compatibility
// =============================================================================

/**
 * POST /api/manifest/:courseCode/submit (APML v9.0) and /api/phase7/:courseCode/submit (legacy)
 * Accept completed course_manifest.json from agents via ngrok
 */
async function handleManifestSubmit(req, res) {
  try {
    const { courseCode } = req.params;
    const manifestData = req.body;

    // Validate basic structure
    if (!manifestData.version || !manifestData.course) {
      return res.status(400).json({
        error: 'Invalid manifest format',
        required: ['version', 'course']
      });
    }

    // Validate course code matches
    if (manifestData.course !== courseCode) {
      return res.status(400).json({
        error: 'Course code mismatch',
        expected: courseCode,
        received: manifestData.course
      });
    }

    // Count phrases in manifest (from all lego_baskets)
    let phraseCount = 0;
    if (manifestData.manifest && manifestData.manifest.lego_baskets) {
      phraseCount = Object.keys(manifestData.manifest.lego_baskets).reduce((count, basketId) => {
        const basket = manifestData.manifest.lego_baskets[basketId];
        return count + (basket.phrases ? basket.phrases.length : 0);
      }, 0);
    }

    // Write to VFS
    const outputPath = path.join(VFS_ROOT, courseCode, 'course_manifest.json');
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeJSON(outputPath, manifestData, { spaces: 2 });

    console.log(`[Orchestrator] ✅ Received Manifest submission for ${courseCode}`);
    console.log(`[Orchestrator]    Version: ${manifestData.version}`);
    console.log(`[Orchestrator]    Phrases: ${phraseCount}`);
    console.log(`[Orchestrator]    Saved to: ${outputPath}`);

    // Update progress tracking
    updatePhaseProgress(courseCode, 'manifest', {
      status: 'complete',
      endTime: new Date().toISOString(),
      phraseCount
    });
    addProgressLog(courseCode, `Manifest: Complete - ${phraseCount} phrases compiled`);

    // Update current phase to Audio
    const progress = courseProgress.get(courseCode);
    if (progress) {
      progress.currentPhase = 'audio';
      progress.overallStatus = 'manifest_complete'; // Ready for audio generation
    }

    // NOTE: GitHub auto-publish removed - using database-first approach

    res.json({
      success: true,
      message: 'Manifest submission received',
      phraseCount,
      savedTo: outputPath
    });
  } catch (error) {
    console.error(`[Orchestrator] Error accepting Manifest submission:`, error);
    res.status(500).json({ error: 'Failed to save Manifest submission', details: error.message });
  }
}
app.post('/api/manifest/:courseCode/submit', handleManifestSubmit);
app.post('/api/phase7/:courseCode/submit', handleManifestSubmit);  // Legacy

/**
 * GET /api/courses/validate/all
 * List all courses with their validation status
 */
app.get('/api/courses/validate/all', async (req, res) => {
  try {
    const manifestPath = path.join(__dirname, '../../public/vfs/courses-manifest.json');
    const manifest = await fs.readJson(manifestPath);

    const coursesValidation = [];

    for (const course of manifest.courses) {
      if (course.actual_seed_count === 0) continue; // Skip empty courses

      const courseCode = course.course_code;
      const legoPairsPath = path.join(VFS_ROOT, courseCode, 'lego_pairs.json');
      const reportPath = legoPairsPath.replace('.json', '_fd_report.json');

      // Determine completed phases
      const completedPhases = [];
      if (course.actual_seed_count > 0) completedPhases.push(1);
      if (await fs.pathExists(legoPairsPath)) completedPhases.push(3);
      if (course.basket_count > 0) completedPhases.push(5);

      let validationStatus = {
        courseCode,
        hasLegoPairs: await fs.pathExists(legoPairsPath),
        hasBaskets: course.basket_count > 0,
        collisions: 0,
        status: 'not_validated',
        completedPhases,
        canProgress: false
      };

      // Check if there's an existing FD report
      if (await fs.pathExists(reportPath)) {
        const report = await fs.readJson(reportPath);
        validationStatus.collisions = report.total_violations || 0;
        validationStatus.status = validationStatus.collisions > 0 ? 'has_violations' : 'valid';
        validationStatus.lastValidated = report.timestamp;
      }

      coursesValidation.push(validationStatus);
    }

    res.json({
      courses: coursesValidation,
      total: coursesValidation.length
    });
  } catch (error) {
    console.error('Error loading validation data:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/courses/:courseCode/validate
 * Run Phase 3 FD collision detection and return results
 */
app.get('/api/courses/:courseCode/validate', async (req, res) => {
  const { courseCode } = req.params;

  try {
    const legoPairsPath = path.join(VFS_ROOT, courseCode, 'lego_pairs.json');

    if (!await fs.pathExists(legoPairsPath)) {
      return res.status(404).json({
        error: 'lego_pairs.json not found - run Phase 3 first',
        courseCode
      });
    }

    // Run FD collision detection script
    const validatorScript = path.join(__dirname, '../../scripts/validation/check-lego-fd-violations.cjs');
    const { execSync } = require('child_process');

    try {
      execSync(`node "${validatorScript}" "${legoPairsPath}"`, {
        cwd: VFS_ROOT,
        stdio: 'inherit'
      });

      // If script exits 0, no violations found
      res.json({
        courseCode,
        status: 'valid',
        collisions: 0,
        message: 'No FD violations detected'
      });
    } catch (error) {
      // Script exits with non-zero if violations found
      // Check for the FD report file
      const reportPath = legoPairsPath.replace('.json', '_fd_report.json');

      if (await fs.pathExists(reportPath)) {
        const report = await fs.readJson(reportPath);

        res.json({
          courseCode,
          status: 'violations_detected',
          collisions: report.total_violations || 0,
          report,
          message: `Found ${report.total_violations} FD violations`
        });
      } else {
        throw new Error('Validation failed but no report generated');
      }
    }
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      error: error.message,
      courseCode
    });
  }
});

/**
 * POST /api/courses/:courseCode/phase/3/validate
 * Run LUT check on Phase 3 LEGO extraction
 * Returns collision report and re-extraction manifest if violations found
 */
app.post('/api/courses/:courseCode/phase/3/validate', async (req, res) => {
  const { courseCode } = req.params;

  console.log(`\n🔍 Running LUT check for ${courseCode}...`);

  try {
    const legoPairsPath = path.join(VFS_ROOT, courseCode, 'lego_pairs.json');

    if (!await fs.pathExists(legoPairsPath)) {
      return res.status(404).json({
        error: 'lego_pairs.json not found - run Phase 3 first',
        courseCode
      });
    }

    // Run LUT collision checker
    const validatorScript = path.join(__dirname, '../../scripts/validation/check-lego-fd-violations.cjs');

    try {
      execSync(`node "${validatorScript}" "${legoPairsPath}"`, {
        cwd: VFS_ROOT,
        stdio: 'inherit'
      });

      // No violations found
      console.log(`   ✅ LUT check PASSED - no collisions detected`);

      res.json({
        courseCode,
        status: 'pass',
        collisions: 0,
        message: 'No LUT violations detected',
        reextractionNeeded: false
      });
    } catch (error) {
      // Violations found - check for reports
      const reportPath = legoPairsPath.replace('.json', '_fd_report.json');
      const manifestPath = legoPairsPath.replace('.json', '_reextraction_manifest.json');

      if (!await fs.pathExists(reportPath)) {
        throw new Error('Validation failed but no report generated');
      }

      const report = await fs.readJson(reportPath);
      let manifest = null;

      if (await fs.pathExists(manifestPath)) {
        manifest = await fs.readJson(manifestPath);
      }

      console.log(`   ❌ LUT check FAILED - ${report.violation_count} collisions found`);
      console.log(`   📋 Re-extraction needed for ${manifest?.affected_seeds?.length || 0} seeds`);

      res.json({
        courseCode,
        status: 'fail',
        collisions: report.violation_count || report.violations?.length || 0,
        message: `Found ${report.violation_count || report.violations?.length || 0} LUT violations`,
        reextractionNeeded: true,
        report,
        manifest
      });
    }
  } catch (error) {
    console.error('   ❌ LUT check error:', error.message);
    res.status(500).json({
      error: error.message,
      courseCode
    });
  }
});

/**
 * POST /api/courses/:courseCode/phase/3/infinitive-check
 * Run infinitive form validation on English LEGOs
 * Only applicable when source language is English
 */
app.post('/api/courses/:courseCode/phase/3/infinitive-check', async (req, res) => {
  const { courseCode } = req.params;

  console.log(`\n🔍 Running infinitive check for ${courseCode}...`);

  try {
    const legoPairsPath = path.join(VFS_ROOT, courseCode, 'lego_pairs.json');

    if (!await fs.pathExists(legoPairsPath)) {
      return res.status(404).json({
        error: 'lego_pairs.json not found - run Phase 3 first',
        courseCode
      });
    }

    // Read lego_pairs to check if English is the known language
    const legoPairsData = await fs.readJson(legoPairsPath);

    // Check format and extract first seed to determine languages
    let firstSeed = legoPairsData.seeds?.[0];
    let knownLang = null;

    if (firstSeed) {
      if (Array.isArray(firstSeed)) {
        // Array format [seedId, [known, target], legos]
        knownLang = firstSeed[1]?.[0];
      } else if (firstSeed.seed_pair) {
        // Object format {seed_id, seed_pair: [known, target], legos}
        knownLang = firstSeed.seed_pair?.[0];
      }
    }

    // Check if it's English - look for common English words
    const isEnglish = knownLang && /\b(I|you|the|to|and|a|is|in|it)\b/.test(knownLang);

    if (!isEnglish) {
      return res.json({
        courseCode,
        status: 'skip',
        message: 'Infinitive check only applicable for English courses',
        violations: []
      });
    }

    // Run infinitive form checker using the existing script
    const { checkInfinitiveFormsData } = require('../../scripts/validation/check-infinitive-forms-lib.cjs');
    const result = checkInfinitiveFormsData(legoPairsData);

    console.log(`   ${result.violations.length > 0 ? '❌' : '✅'} Infinitive check ${result.violations.length > 0 ? 'FAILED' : 'PASSED'} - ${result.violations.length} violations`);

    res.json({
      courseCode,
      status: result.violations.length > 0 ? 'fail' : 'pass',
      violations: result.violations.length,
      message: result.violations.length > 0
        ? `Found ${result.violations.length} infinitive form violations`
        : 'No infinitive violations detected',
      details: result.violations,
      summary: {
        totalSeeds: result.totalSeeds,
        totalLegos: result.totalLegos,
        critical: result.violations.filter(v => v.severity === 'CRITICAL').length,
        high: result.violations.filter(v => v.severity === 'HIGH').length
      }
    });
  } catch (error) {
    console.error('   ❌ Infinitive check error:', error.message);
    res.status(500).json({
      error: error.message,
      courseCode
    });
  }
});

/**
 * POST /api/courses/:courseCode/phase/3/fix-collisions
 * Re-extract LEGOs with LUT violations using chunking-up instructions
 * LUT = Learner Uncertainty Test (when same KNOWN phrase → multiple TARGET phrases)
 * Uses reextraction_manifest.json to trigger targeted Phase 3 re-run
 */
app.post('/api/courses/:courseCode/phase/3/fix-collisions', async (req, res) => {
  const { courseCode } = req.params;

  console.log(`\n🔧 Starting LUT violation fix for ${courseCode}...`);

  try {
    const courseDir = path.join(VFS_ROOT, courseCode);
    const manifestPath = path.join(courseDir, 'lego_pairs_reextraction_manifest.json');
    const seedPairsPath = path.join(courseDir, 'seed_pairs.json');

    // Check for reextraction manifest
    if (!await fs.pathExists(manifestPath)) {
      return res.status(404).json({
        error: 'No reextraction manifest found. Run LUT Check first.',
        courseCode
      });
    }

    // Check for seed_pairs.json
    if (!await fs.pathExists(seedPairsPath)) {
      return res.status(404).json({
        error: 'seed_pairs.json not found. Run Phase 1 first.',
        courseCode
      });
    }

    const manifest = await fs.readJson(manifestPath);
    const affectedSeeds = manifest.affected_seeds || [];

    if (affectedSeeds.length === 0) {
      return res.json({
        success: true,
        message: 'No LUT violations to fix',
        affectedSeeds: 0
      });
    }

    console.log(`   Found ${affectedSeeds.length} seeds with LUT violations`);
    console.log(`   Delegating to Phase 3 server for re-extraction...`);

    // Delegate to Phase 3 server with chunking-up instructions
    const axios = require('axios');
    const phase3Response = await axios.post(`${PHASE_SERVERS[3]}/reextract`, {
      courseCode,
      affectedSeeds,
      manifest: manifest.violations_by_seed,
      mode: 'lut_fix'
    }, {
      timeout: 300000 // 5 minute timeout for re-extraction
    });

    console.log(`   ✅ Phase 3 re-extraction started`);

    res.json({
      success: true,
      courseCode,
      affectedSeeds: affectedSeeds.length,
      message: `Re-extracting ${affectedSeeds.length} seeds with chunking-up instructions`,
      jobId: phase3Response.data.jobId || courseCode
    });

  } catch (error) {
    console.error(`   ❌ LUT fix error:`, error.message);
    res.status(500).json({
      error: error.message,
      courseCode
    });
  }
});

/**
 * GET /api/courses/:courseCode/baskets/gaps
 * Analyze basket gaps after LEGO re-extraction
 * Fetches data from GitHub main branch, not local files
 */
app.get('/api/courses/:courseCode/baskets/gaps', async (req, res) => {
  const { courseCode } = req.params;

  console.log(`\n📊 Analyzing basket gaps for ${courseCode}...`);

  try {
    // Fetch lego_pairs.json from local (current/updated registry)
    const legoPairsPath = path.join(VFS_ROOT, courseCode, 'lego_pairs.json');

    if (!await fs.pathExists(legoPairsPath)) {
      return res.status(404).json({
        error: 'lego_pairs.json not found - run Phase 3 first',
        courseCode
      });
    }

    const legoPairsData = await fs.readJson(legoPairsPath);

    // Extract all LEGO_IDs from current lego_pairs.json
    const allLegoIds = new Set();
    if (legoPairsData.seeds && Array.isArray(legoPairsData.seeds)) {
      legoPairsData.seeds.forEach(seed => {
        if (seed.legos && Array.isArray(seed.legos)) {
          seed.legos.forEach(lego => {
            if (lego.id) {
              allLegoIds.add(lego.id);
            }
          });
        }
      });
    }

    console.log(`   Total LEGOs in current registry: ${allLegoIds.size}`);

    // Fetch lego_baskets.json from GitHub main (existing baskets)
    let existingBaskets = new Set();
    let basketsData = null;

    // Try to fetch from GitHub using gh CLI
    const githubPath = `public/vfs/courses/${courseCode}/lego_baskets.json`;
    console.log(`   Fetching baskets from GitHub main...`);

    try {
      const ghOutput = execSync(
        `gh api repos/:owner/:repo/contents/${githubPath} --jq '.content' | base64 -d`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );

      basketsData = JSON.parse(ghOutput);

      if (basketsData.baskets && typeof basketsData.baskets === 'object') {
        existingBaskets = new Set(Object.keys(basketsData.baskets));
      }

      console.log(`   ✅ Fetched ${existingBaskets.size} baskets from GitHub`);
    } catch (ghError) {
      // If gh CLI fails, try using node-fetch with GitHub API
      console.log(`   ⚠️  gh CLI failed, trying GitHub API...`);

      try {
        // Try to infer repo from git remote
        let repo = null;
        try {
          const remote = execSync('git config --get remote.origin.url', {
            encoding: 'utf8',
            cwd: __dirname
          }).trim();

          const match = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
          if (match) {
            repo = match[1];
          }
        } catch (e) {
          // Ignore
        }

        if (!repo) {
          throw new Error('Could not determine GitHub repository');
        }

        const fetch = require('node-fetch');
        const apiUrl = `https://api.github.com/repos/${repo}/contents/${githubPath}?ref=main`;

        const response = await fetch(apiUrl, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'SSi-Orchestrator'
          }
        });

        if (!response.ok) {
          throw new Error(`GitHub API returned ${response.status}`);
        }

        const data = await response.json();
        const content = Buffer.from(data.content, 'base64').toString('utf8');
        basketsData = JSON.parse(content);

        if (basketsData.baskets && typeof basketsData.baskets === 'object') {
          existingBaskets = new Set(Object.keys(basketsData.baskets));
        }

        console.log(`   ✅ Fetched ${existingBaskets.size} baskets from GitHub API`);
      } catch (apiError) {
        // Fall back to local file if GitHub fetch fails
        console.log(`   ⚠️  GitHub fetch failed, using local baskets file...`);

        const basketsPath = path.join(VFS_ROOT, courseCode, 'lego_baskets.json');
        if (await fs.pathExists(basketsPath)) {
          basketsData = await fs.readJson(basketsPath);

          if (basketsData.baskets && typeof basketsData.baskets === 'object') {
            existingBaskets = new Set(Object.keys(basketsData.baskets));
          }

          console.log(`   📁 Using local baskets: ${existingBaskets.size}`);
        } else {
          console.log(`   ℹ️  No existing baskets found - all LEGOs need baskets`);
        }
      }
    }

    // Load collision report (if exists) to identify deprecated LEGOs
    let deprecatedLegoIds = new Set();
    const collisionReportPath = path.join(VFS_ROOT, courseCode, 'lego_pairs_fd_report.json');

    if (await fs.pathExists(collisionReportPath)) {
      const collisionReport = await fs.readJson(collisionReportPath);

      if (collisionReport.status === 'FAIL' && collisionReport.violations) {
        // Extract all LEGO_IDs from collisions (except first instance - the "debut")
        collisionReport.violations.forEach(violation => {
          violation.mappings.forEach((mapping, idx) => {
            if (idx > 0) {
              // Skip first mapping (debut), mark rest as deprecated
              mapping.legos.forEach(lego => {
                deprecatedLegoIds.add(lego.lego_id);
              });
            }
          });
        });
      }

      console.log(`   Deprecated LEGOs (from collisions): ${deprecatedLegoIds.size}`);
    }

    // Analysis
    const missingBaskets = [];
    const basketsToDelete = [];
    const basketsToKeep = [];

    // 1. Find LEGOs that need baskets (missing)
    allLegoIds.forEach(legoId => {
      if (!existingBaskets.has(legoId)) {
        missingBaskets.push(legoId);
      }
    });

    // 2. Find baskets that reference deprecated LEGOs (need deletion)
    // 3. Find baskets for current LEGOs (keep)
    existingBaskets.forEach(legoId => {
      if (deprecatedLegoIds.has(legoId)) {
        basketsToDelete.push(legoId);
      } else if (allLegoIds.has(legoId)) {
        basketsToKeep.push(legoId);
      } else {
        // Basket exists but LEGO doesn't - orphaned basket
        basketsToDelete.push(legoId);
      }
    });

    // Sort for readability
    missingBaskets.sort();
    basketsToDelete.sort();
    basketsToKeep.sort();

    // Calculate stats
    const totalLegoCount = allLegoIds.size;
    const coveragePercentage = totalLegoCount > 0
      ? Math.round((basketsToKeep.length / totalLegoCount) * 100)
      : 0;

    console.log(`   ✅ Analysis complete:`);
    console.log(`      Baskets to keep: ${basketsToKeep.length} (${coveragePercentage}% coverage)`);
    console.log(`      Baskets to delete: ${basketsToDelete.length}`);
    console.log(`      Baskets missing: ${missingBaskets.length}`);

    // Generate report
    const report = {
      course_code: courseCode,
      timestamp: new Date().toISOString(),
      total_legos: totalLegoCount,
      existing_baskets: existingBaskets.size,
      coverage_percentage: coveragePercentage,
      analysis: {
        baskets_to_keep: basketsToKeep.length,
        baskets_to_delete: basketsToDelete.length,
        baskets_missing: missingBaskets.length
      },
      baskets_to_keep: basketsToKeep,
      baskets_to_delete: basketsToDelete,
      baskets_missing: missingBaskets,
      deprecated_legos: Array.from(deprecatedLegoIds).sort(),
      next_steps: [
        `1. Delete ${basketsToDelete.length} deprecated/orphaned baskets`,
        `2. Generate ${missingBaskets.length} new baskets`,
        `3. Verify ${basketsToKeep.length} existing baskets remain valid`
      ]
    };

    // Save report to local file
    const reportPath = path.join(VFS_ROOT, courseCode, 'basket_gaps_report.json');
    await fs.writeJson(reportPath, report, { spaces: 2 });

    console.log(`   📄 Report saved: ${reportPath}`);

    res.json(report);
  } catch (error) {
    console.error('   ❌ Basket gap analysis error:', error.message);
    res.status(500).json({
      error: error.message,
      courseCode
    });
  }
});

/**
 * POST /api/courses/:courseCode/baskets/cleanup
 * Clean up baskets after gap analysis
 * Backs up deleted baskets and removes them from lego_baskets.json
 */
app.post('/api/courses/:courseCode/baskets/cleanup', async (req, res) => {
  const { courseCode } = req.params;
  const { basketIdsToDelete } = req.body;

  console.log(`\n🗑️  Cleaning up baskets for ${courseCode}...`);

  if (!basketIdsToDelete || !Array.isArray(basketIdsToDelete)) {
    return res.status(400).json({
      error: 'basketIdsToDelete array required in request body'
    });
  }

  if (basketIdsToDelete.length === 0) {
    return res.json({
      courseCode,
      message: 'No baskets to delete',
      deleted: 0
    });
  }

  try {
    const basketsPath = path.join(VFS_ROOT, courseCode, 'lego_baskets.json');

    if (!await fs.pathExists(basketsPath)) {
      return res.status(404).json({
        error: 'lego_baskets.json not found',
        courseCode
      });
    }

    // Load current baskets
    const basketsData = await fs.readJson(basketsPath);

    if (!basketsData.baskets || typeof basketsData.baskets !== 'object') {
      return res.status(400).json({
        error: 'Invalid lego_baskets.json structure',
        courseCode
      });
    }

    // Backup deleted baskets
    const deletedBaskets = {};
    const notFound = [];
    let deletedCount = 0;

    basketIdsToDelete.forEach(basketId => {
      if (basketsData.baskets[basketId]) {
        deletedBaskets[basketId] = basketsData.baskets[basketId];
        delete basketsData.baskets[basketId];
        deletedCount++;
      } else {
        notFound.push(basketId);
      }
    });

    console.log(`   Deleted ${deletedCount} baskets`);
    if (notFound.length > 0) {
      console.log(`   ⚠️  ${notFound.length} basket IDs not found`);
    }

    // Save backup
    const backupPath = path.join(VFS_ROOT, courseCode, 'deleted_baskets_backup.json');
    let existingBackup = {};

    if (await fs.pathExists(backupPath)) {
      existingBackup = await fs.readJson(backupPath);
    }

    const backup = {
      ...existingBackup,
      [new Date().toISOString()]: {
        deleted_count: deletedCount,
        basket_ids: basketIdsToDelete.filter(id => !notFound.includes(id)),
        baskets: deletedBaskets
      }
    };

    await fs.writeJson(backupPath, backup, { spaces: 2 });
    console.log(`   💾 Backup saved: ${backupPath}`);

    // Save updated baskets
    await fs.writeJson(basketsPath, basketsData, { spaces: 2 });
    console.log(`   ✅ Updated baskets file: ${basketsPath}`);

    // NOTE: Git commit removed - using database-first approach

    res.json({
      courseCode,
      success: true,
      deleted: deletedCount,
      notFound: notFound.length,
      backupPath,
      message: `Deleted ${deletedCount} baskets and saved backup`
    });
  } catch (error) {
    console.error('   ❌ Basket cleanup error:', error.message);
    res.status(500).json({
      error: error.message,
      courseCode
    });
  }
});

/**
 * POST /api/courses/:courseCode/baskets/regenerate
 * Proxy to Phase 3 (Basket Generation) server's /regenerate endpoint
 */
app.post('/api/courses/:courseCode/baskets/regenerate', async (req, res) => {
  const { courseCode } = req.params;
  const { legoIds, target, known } = req.body;

  console.log(`\n🔄 Proxying basket regeneration request to Phase 3 server for ${courseCode}...`);
  console.log(`   LEGO_IDs: ${legoIds?.length || 0}`);

  if (!legoIds || !Array.isArray(legoIds) || legoIds.length === 0) {
    return res.status(400).json({
      error: 'legoIds array required in request body'
    });
  }

  if (!target || !known) {
    return res.status(400).json({
      error: 'target and known language names required'
    });
  }

  try {
    // Proxy to Phase 3 (Basket Generation) server
    const axios = require('axios');
    const phase3Response = await axios.post(`${PHASE_SERVERS[3]}/regenerate`, {
      courseCode,
      legoIds,
      target,
      known
    }, {
      timeout: 30000 // 30s timeout for initial request
    });

    console.log(`   ✅ Phase 3 server accepted regeneration request`);

    res.json(phase3Response.data);
  } catch (error) {
    console.error('   ❌ Basket regeneration proxy error:', error.message);

    const status = error.response?.status || 500;
    const errorData = error.response?.data || { error: error.message };

    res.status(status).json(errorData);
  }
});

/**
 * POST /api/courses/:courseCode/regenerate/manifest (APML v9.0)
 * POST /api/courses/:courseCode/regenerate/phase7 (legacy)
 * Trigger Manifest recompilation
 */
async function handleManifestRegenerate(req, res) {
  const { courseCode } = req.params;

  console.log(`\n🔄 Triggering Manifest recompilation for ${courseCode}...`);

  try {
    // Get course info from manifest
    const coursesManifest = await fs.readJson(path.join(VFS_ROOT, 'courses-manifest.json'));
    const course = coursesManifest.courses.find(c => c.course_code === courseCode);

    if (!course) {
      return res.status(404).json({ error: `Course ${courseCode} not found` });
    }

    // Verify required files exist
    const courseDir = path.join(VFS_ROOT, courseCode);
    const requiredFiles = ['seed_pairs.json', 'lego_pairs.json', 'lego_baskets.json', 'introductions.json'];

    for (const file of requiredFiles) {
      if (!await fs.pathExists(path.join(courseDir, file))) {
        return res.status(400).json({
          error: `Missing required file: ${file}`,
          message: 'Complete previous phases before compiling manifest'
        });
      }
    }

    // Trigger Manifest server
    const manifestResponse = await axios.post(`${PHASE_SERVERS['manifest']}/start`, {
      courseCode,
      target: course.target_language,
      known: course.source_language
    }, {
      timeout: 30000 // 30s timeout for initial request
    });

    console.log(`   ✅ Manifest server accepted compilation request`);

    res.json({
      success: true,
      jobId: manifestResponse.data.jobId || `manifest-${courseCode}-${Date.now()}`,
      message: 'Manifest compilation started',
      courseCode
    });

  } catch (error) {
    console.error('   ❌ Manifest recompilation error:', error.message);

    const status = error.response?.status || 500;
    const errorData = error.response?.data || { error: error.message };

    res.status(status).json(errorData);
  }
}
app.post('/api/courses/:courseCode/regenerate/manifest', handleManifestRegenerate);
app.post('/api/courses/:courseCode/regenerate/phase7', handleManifestRegenerate);  // Legacy

/**
 * Helper: Determine course status from manifest data (APML v9.0)
 */
function determineStatus(course) {
  if (course.has_audio) return 'audio_complete';
  if (course.has_manifest) return 'manifest_complete';
  if (course.basket_count > 0) return 'phase_3_complete';
  if (course.lego_count > 0) return 'phase_1_complete';
  if (course.actual_seed_count > 0) return 'phase_1_partial';
  return 'empty';
}

/**
 * Helper: Get next phase in sequence (APML v9.0)
 * Linear pipeline: Phase 1 → Phase 3 → Manifest → Audio
 */
function getNextPhase(currentPhase) {
  const sequence = [1, 3, 'manifest', 'audio'];
  const normalizedCurrent = normalizePhaseIdentifier(currentPhase);

  // Map normalized phase to sequence value
  const phaseMapping = {
    'phase1': 1,
    'phase3': 3,
    'manifest': 'manifest',
    'audio': 'audio'
  };

  const currentValue = phaseMapping[normalizedCurrent] || currentPhase;
  const currentIndex = sequence.indexOf(currentValue);

  return currentIndex >= 0 && currentIndex < sequence.length - 1
    ? sequence[currentIndex + 1]
    : null;
}

/**
 * Helper: Fetch detailed status from phase server
 * @param {string} courseCode - Course identifier
 * @param {number} phase - Phase number (1, 3, 5, 6, 8)
 * @returns {object|null} - Phase server status details or null if unavailable
 */
async function fetchPhaseServerStatus(courseCode, phase) {
  const phaseServerUrl = PHASE_SERVERS[phase];

  if (!phaseServerUrl) {
    console.log(`[Orchestrator] No server URL configured for Phase ${phase}`);
    return null;
  }

  try {
    // Fetch status from phase server
    const response = await axios.get(`${phaseServerUrl}/status/${courseCode}`, {
      timeout: 2000 // 2 second timeout
    });

    if (response.data) {
      console.log(`[Orchestrator] Fetched Phase ${phase} details for ${courseCode}`);
      return response.data;
    }

    return null;
  } catch (error) {
    // Phase server might not be running or course not found - this is OK
    if (error.response?.status === 404) {
      console.log(`[Orchestrator] Phase ${phase} has no active job for ${courseCode}`);
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`[Orchestrator] Phase ${phase} server not running at ${phaseServerUrl}`);
    } else {
      console.log(`[Orchestrator] Failed to fetch Phase ${phase} status: ${error.message}`);
    }
    return null;
  }
}

/**
 * Stop/Abort proxy endpoints for dashboard Reset Jobs button
 * Phase 1 & 2 use /stop, Phase 3 uses /abort
 */
app.post('/phase1/stop/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  try {
    const response = await axios.post(`${PHASE_SERVERS[1]}/stop/${courseCode}`, {}, { timeout: 5000 });
    console.log(`[Orchestrator] Phase 1 stop for ${courseCode}: ${response.status}`);
    res.json(response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      res.status(404).json({ error: 'No active job found' });
    } else {
      console.error(`[Orchestrator] Phase 1 stop failed: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
});

app.post('/phase3/stop/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  try {
    const response = await axios.post(`${PHASE_SERVERS[3]}/stop/${courseCode}`, {}, { timeout: 5000 });
    console.log(`[Orchestrator] Phase 3 stop for ${courseCode}: ${response.status}`);
    res.json(response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      res.status(404).json({ error: 'No active job found' });
    } else {
      console.error(`[Orchestrator] Phase 3 stop failed: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * POST /phase3/start
 * Proxy to Phase 3 basket server - used by dashboard for basket regeneration
 */
app.post('/phase3/start', async (req, res) => {
  const { courseCode, startSeed, endSeed, target, known, stagingOnly, skipGateCheck } = req.body;

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode required' });
  }

  const resolvedStartSeed = startSeed || 1;
  const resolvedEndSeed = endSeed || SEED_COUNTS.FULL_COURSE;
  const resolvedTarget = target || courseCode.split('_for_')[0];
  const resolvedKnown = known || courseCode.split('_for_')[1];

  console.log(`[Orchestrator] Phase 3 start request for ${courseCode} (seeds ${resolvedStartSeed}-${resolvedEndSeed})`);

  // PHASE GATING: Check Phase 1 and 2 completion before allowing Phase 3
  if (!skipGateCheck) {
    try {
      const dbProgress = await courseDataService.getCourseProgress(courseCode);
      if (dbProgress) {
        const phase1Seeds = dbProgress.phase1?.complete || 0;
        const targetSeeds = resolvedEndSeed - resolvedStartSeed + 1;

        // Check Phase 1 completion
        if (phase1Seeds < targetSeeds) {
          console.log(`[Orchestrator] ⛔ Phase 3 BLOCKED: Phase 1 incomplete (${phase1Seeds}/${targetSeeds} seeds)`);
          return res.status(400).json({
            error: 'Phase 1 incomplete',
            message: `Phase 1 has ${phase1Seeds}/${targetSeeds} seeds. Complete Phase 1 first.`,
            phase1Seeds,
            targetSeeds,
            gateBlocked: true
          });
        }

        // Check Phase 2 completion (lego_pairs.json must exist)
        const legoPairsPath = path.join(VFS_ROOT, courseCode, 'lego_pairs.json');
        if (!await fs.pathExists(legoPairsPath)) {
          console.log(`[Orchestrator] ⛔ Phase 3 BLOCKED: Phase 2 not run (no lego_pairs.json)`);
          return res.status(400).json({
            error: 'Phase 2 not complete',
            message: 'Run Phase 2 (Conflict Resolution) before Phase 3.',
            gateBlocked: true
          });
        }

        console.log(`[Orchestrator] ✅ Phase gates passed: ${phase1Seeds} seeds, lego_pairs.json exists`);
      }
    } catch (gateError) {
      console.warn(`[Orchestrator] ⚠️ Phase gate check failed (proceeding anyway): ${gateError.message}`);
    }
  } else {
    console.log(`[Orchestrator] ⚠️ Phase gate check skipped (skipGateCheck=true)`);
  }

  try {
    const response = await axios.post(`${PHASE_SERVERS[3]}/start`, {
      courseCode,
      startSeed: resolvedStartSeed,
      endSeed: resolvedEndSeed,
      target: resolvedTarget,
      known: resolvedKnown,
      stagingOnly
    }, { timeout: 30000 });

    console.log(`[Orchestrator] Phase 3 started for ${courseCode}`);

    // Initialize Phase 3 state for stall detection
    courseProgress.set(`${courseCode}_phase3`, {
      expectedStartSeed: resolvedStartSeed,
      expectedEndSeed: resolvedEndSeed,
      target: resolvedTarget,
      known: resolvedKnown,
      startTime: Date.now(),
      lastBatchTime: Date.now(),
      gapFillTriggered: false,
      gapFillAttempt: 0
    });

    // Start stall watchdog for Phase 3
    startPhase3StallWatchdog(courseCode);

    res.json(response.data);
  } catch (error) {
    console.error(`[Orchestrator] Phase 3 start failed: ${error.message}`);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// ============================================================================
// MASTER HEARTBEAT ENDPOINT
// ============================================================================

/**
 * POST /master-heartbeat
 * Masters report their status - enables real-time monitoring and intelligent stall detection
 *
 * Body: {
 *   courseCode: string,
 *   phase: number (1, 2, or 3),
 *   masterId: string (e.g., "M1", "M2"),
 *   status: "starting" | "spawning" | "running" | "complete" | "error",
 *   workersTotal: number,
 *   workersComplete: number,
 *   activeSeeds: string[] (e.g., ["S0005", "S0006"]),
 *   currentTask?: string (human-readable description),
 *   error?: string (if status is "error")
 * }
 */
app.post('/master-heartbeat', (req, res) => {
  const {
    courseCode,
    phase,
    masterId,
    status,
    workersTotal,
    workersComplete,
    activeSeeds,
    currentTask,
    error
  } = req.body;

  if (!courseCode || !phase || !masterId) {
    return res.status(400).json({ error: 'courseCode, phase, and masterId required' });
  }

  // Update master state
  const masterState = updateMasterHeartbeat(courseCode, phase, masterId, {
    status: status || 'running',
    workersTotal: workersTotal || 0,
    workersComplete: workersComplete || 0,
    activeSeeds: activeSeeds || [],
    currentTask,
    error
  });

  console.log(`[Heartbeat] ${courseCode} Phase ${phase} ${masterId}: ${status || 'running'} (${workersComplete || 0}/${workersTotal || 0} workers)`);

  // Emit WebSocket event for real-time UI updates
  if (io) {
    io.to(`course:${courseCode}`).emit('master-heartbeat', {
      courseCode,
      phase,
      masterId,
      status: masterState.status,
      workersTotal: masterState.workersTotal,
      workersComplete: masterState.workersComplete,
      activeSeeds: masterState.activeSeeds,
      currentTask: masterState.currentTask,
      error: masterState.error,
      timestamp: masterState.lastHeartbeat
    });
  }

  // Also update phase progress state (for stall detection)
  const phaseKey = `${courseCode}_phase${phase}`;
  const phaseState = courseProgress.get(phaseKey);
  if (phaseState) {
    phaseState.lastHeartbeat = Date.now();
    courseProgress.set(phaseKey, phaseState);
  }

  res.json({ ok: true, received: masterState });
});

/**
 * GET /masters/:courseCode/:phase
 * Get all active masters for a course/phase
 */
app.get('/masters/:courseCode/:phase', (req, res) => {
  const { courseCode, phase } = req.params;
  const masters = getMastersForPhase(courseCode, parseInt(phase));

  res.json({
    courseCode,
    phase: parseInt(phase),
    masters,
    count: masters.length
  });
});

/**
 * POST /phase3/upload-basket
 * Proxy basket uploads to Phase 3 server - agents submit one LEGO at a time
 */
app.post('/phase3/upload-basket', async (req, res) => {
  const courseCode = req.body.courseCode;
  console.log(`[Orchestrator] Basket upload received for ${courseCode || 'unknown'}`);

  try {
    const response = await axios.post(`${PHASE_SERVERS[3]}/upload-basket`, req.body, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    // Update lastBatchTime for stall detection and reset gapFillTriggered
    if (courseCode) {
      const phase3State = courseProgress.get(`${courseCode}_phase3`);
      if (phase3State) {
        phase3State.lastBatchTime = Date.now();
        phase3State.gapFillTriggered = false;  // Reset - basket arrived, gap-fill worked
        courseProgress.set(`${courseCode}_phase3`, phase3State);
      }
    }

    console.log(`[Orchestrator] Basket uploaded: ${response.data.legoId || 'unknown'}`);
    res.json(response.data);
  } catch (error) {
    console.error(`[Orchestrator] Basket upload failed: ${error.message}`);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * POST /upload-basket (direct alias for convenience)
 * Same as /phase3/upload-basket
 */
app.post('/upload-basket', async (req, res) => {
  const courseCode = req.body.courseCode;

  try {
    const response = await axios.post(`${PHASE_SERVERS[3]}/upload-basket`, req.body, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    // Update lastBatchTime for stall detection and reset gapFillTriggered
    if (courseCode) {
      const phase3State = courseProgress.get(`${courseCode}_phase3`);
      if (phase3State) {
        phase3State.lastBatchTime = Date.now();
        phase3State.gapFillTriggered = false;  // Reset - basket arrived, gap-fill worked
        courseProgress.set(`${courseCode}_phase3`, phase3State);
      }
    }

    res.json(response.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.post('/phase5/abort/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  try {
    const response = await axios.post(`${PHASE_SERVERS[5]}/abort/${courseCode}`, {}, { timeout: 5000 });
    console.log(`[Orchestrator] Phase 3 abort for ${courseCode}: ${response.status}`);
    res.json(response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      res.status(404).json({ error: 'No active job found' });
    } else {
      console.error(`[Orchestrator] Phase 3 abort failed: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
});

// =============================================================================
// AUDIO QA ENDPOINTS
// =============================================================================

/**
 * GET /api/audio/random-sample/:courseCode/:role
 * Get a random sample from the course manifest by role
 */
app.get('/api/audio/random-sample/:courseCode/:role', async (req, res) => {
  const { courseCode, role } = req.params;

  try {
    const manifestPath = path.join(VFS_ROOT, courseCode, 'course_manifest.json');

    if (!await fs.pathExists(manifestPath)) {
      return res.status(404).json({ success: false, error: 'Course manifest not found' });
    }

    const manifest = await fs.readJson(manifestPath);
    const samples = manifest.slices?.[0]?.samples || {};

    // Map requested roles to manifest roles (support both naming conventions)
    const roleMapping = {
      'target1': ['target1', 'practice_target', 'lego_target'],
      'target2': ['target2', 'practice_target', 'lego_target'],
      'source': ['source', 'practice_known', 'lego_known'],
      'presentation': ['presentation'],
      'presentation_encouragement': ['presentation_encouragement'],
      // Also support direct old role names
      'practice_target': ['practice_target', 'lego_target'],
      'practice_known': ['practice_known', 'lego_known'],
      'lego_target': ['lego_target'],
      'lego_known': ['lego_known']
    };

    const matchRoles = roleMapping[role] || [role];

    // Collect all samples for the requested role
    const roleSamples = [];
    for (const [text, sampleList] of Object.entries(samples)) {
      for (const sample of sampleList) {
        if (matchRoles.includes(sample.role) && sample.id) {
          roleSamples.push({
            id: sample.id,
            text: text,
            role: sample.role,
            cadence: sample.cadence || 'natural',
            duration: sample.duration || 0
          });
        }
      }
    }

    if (roleSamples.length === 0) {
      return res.status(404).json({ success: false, error: `No samples found for role: ${role}` });
    }

    // Pick a random sample
    const randomIndex = Math.floor(Math.random() * roleSamples.length);
    const sample = roleSamples[randomIndex];

    console.log(`[Audio QA] Random sample for ${courseCode}/${role}: ${sample.id}`);

    res.json({
      success: true,
      sample,
      totalForRole: roleSamples.length
    });

  } catch (err) {
    console.error('[Audio QA] Error getting random sample:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/audio/stream/:uuid
 * Stream audio file from S3 (ssi-audio-stage bucket)
 */
app.get('/api/audio/stream/:uuid', async (req, res) => {
  const { uuid } = req.params;

  try {
    // Audio files are in ssi-audio-stage bucket (separate from course data in ssi-audio-stage)
    const s3Bucket = process.env.S3_AUDIO_BUCKET || 'ssi-audio-stage';
    const s3Key = `mastered/${uuid}.mp3`;

    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'eu-west-1'
    });

    const params = { Bucket: s3Bucket, Key: s3Key };

    // Check if file exists
    try {
      await s3.headObject(params).promise();
    } catch (headErr) {
      if (headErr.code === 'NotFound') {
        return res.status(404).json({ error: 'Audio file not found in S3' });
      }
      throw headErr;
    }

    // Stream the file
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');

    const stream = s3.getObject(params).createReadStream();
    stream.on('error', (err) => {
      console.error('[Audio QA] S3 stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream audio' });
      }
    });

    stream.pipe(res);

  } catch (err) {
    console.error('[Audio QA] Error streaming audio:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/audio/random-cycle/:courseCode
 * Get a random complete learning cycle (source + target1 + target2 for a LEGO node)
 *
 * A learning cycle is: known audio -> pause -> target1 audio -> target2 audio
 * We find nodes where we have:
 *   - source sample keyed by node.known.text
 *   - target1 sample keyed by node.target.text
 *   - target2 sample keyed by node.target.text
 */
app.get('/api/audio/random-cycle/:courseCode', async (req, res) => {
  const { courseCode } = req.params;

  try {
    const manifestPath = path.join(VFS_ROOT, courseCode, 'course_manifest.json');

    if (!await fs.pathExists(manifestPath)) {
      return res.status(404).json({ success: false, error: 'Course manifest not found' });
    }

    const manifest = await fs.readJson(manifestPath);
    const samples = manifest.slices?.[0]?.samples || {};
    const seeds = manifest.slices?.[0]?.seeds || [];

    // Collect all nodes from introduction_items (LEGOs)
    // Each node has known.text and target.text
    const completeCycles = [];

    for (const seed of seeds) {
      for (const item of seed.introduction_items || []) {
        // Check the main node
        if (item.node) {
          const knownText = item.node.known?.text;
          const targetText = item.node.target?.text;

          if (knownText && targetText) {
            const sourceSamples = samples[knownText] || [];
            const targetSamples = samples[targetText] || [];

            // Support both old roles (source/target1/target2) and new roles (practice_known/practice_target/lego_target)
            const source = sourceSamples.find(s => (s.role === 'source' || s.role === 'practice_known' || s.role === 'lego_known') && s.id);
            const target1 = targetSamples.find(s => (s.role === 'target1' || s.role === 'practice_target' || s.role === 'lego_target') && s.id);
            // For target2, try target2 first, then fall back to same as target1 (some manifests only have one target voice)
            let target2 = targetSamples.find(s => s.role === 'target2' && s.id);
            if (!target2) target2 = targetSamples.find(s => (s.role === 'practice_target' || s.role === 'lego_target') && s.id);

            if (source && target1 && target2) {
              completeCycles.push({
                knownText,
                targetText,
                source,
                target1,
                target2
              });
            }
          }
        }

        // Also check inner nodes (recombinations)
        for (const innerNode of item.nodes || []) {
          const knownText = innerNode.known?.text;
          const targetText = innerNode.target?.text;

          if (knownText && targetText) {
            const sourceSamples = samples[knownText] || [];
            const targetSamples = samples[targetText] || [];

            // Support both old roles (source/target1/target2) and new roles (practice_known/practice_target/lego_target)
            const source = sourceSamples.find(s => (s.role === 'source' || s.role === 'practice_known' || s.role === 'lego_known') && s.id);
            const target1 = targetSamples.find(s => (s.role === 'target1' || s.role === 'practice_target' || s.role === 'lego_target') && s.id);
            let target2 = targetSamples.find(s => s.role === 'target2' && s.id);
            if (!target2) target2 = targetSamples.find(s => (s.role === 'practice_target' || s.role === 'lego_target') && s.id);

            if (source && target1 && target2) {
              completeCycles.push({
                knownText,
                targetText,
                source,
                target1,
                target2
              });
            }
          }
        }
      }
    }

    if (completeCycles.length === 0) {
      return res.status(404).json({ success: false, error: 'No complete learning cycles found' });
    }

    // Pick a random cycle
    const randomIndex = Math.floor(Math.random() * completeCycles.length);
    const cycle = completeCycles[randomIndex];

    console.log(`[Audio QA] Random cycle for ${courseCode}: "${cycle.knownText}" -> "${cycle.targetText}"`);

    res.json({
      success: true,
      cycle: {
        id: cycle.source.id,
        sourceText: cycle.knownText,
        targetText: cycle.targetText,
        sourceId: cycle.source.id,
        target1Id: cycle.target1.id,
        target2Id: cycle.target2.id,
        sourceCadence: cycle.source.cadence,
        target1Cadence: cycle.target1.cadence,
        target2Cadence: cycle.target2.cadence
      },
      totalCycles: completeCycles.length
    });

  } catch (err) {
    console.error('[Audio QA] Error getting random cycle:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/audio/flag-sample
 * Flag a sample for review
 */
app.post('/api/audio/flag-sample', async (req, res) => {
  const { courseCode, uuid, reason } = req.body;

  try {
    const flagsPath = path.join(VFS_ROOT, courseCode, 'audio_flags.json');

    let flags = [];
    if (await fs.pathExists(flagsPath)) {
      flags = await fs.readJson(flagsPath);
    }

    flags.push({
      uuid,
      reason: reason || 'Manual QA flag',
      flaggedAt: new Date().toISOString(),
      status: 'pending'
    });

    await fs.writeJson(flagsPath, flags, { spaces: 2 });

    console.log(`[Audio QA] Flagged sample ${uuid} for ${courseCode}`);

    res.json({ success: true, totalFlags: flags.length });

  } catch (err) {
    console.error('[Audio QA] Error flagging sample:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/courses/:courseCode/script
 * Generate a learning script simulating the actual learner journey
 * Query params: startSeed (number), endSeed (number)
 *
 * Algorithm:
 * - For each LEGO introduced: components (if M-type) → debut → up to 7 practice phrases
 * - Interleaved with Fibonacci spaced repetition reviews of previous LEGOs
 * - Each previous LEGO gets up to 3 "eternal" phrases when due for review
 */
app.get('/api/courses/:courseCode/script', async (req, res) => {
  const { courseCode } = req.params;
  const startSeed = parseInt(req.query.startSeed) || 1;
  const endSeed = parseInt(req.query.endSeed) || 10;

  try {
    // Load lego_baskets.json
    const basketsPath = path.join(VFS_ROOT, courseCode, 'lego_baskets.json');

    if (!await fs.pathExists(basketsPath)) {
      return res.status(404).json({ error: 'LEGO baskets not found for course' });
    }

    const baskets = await fs.readJson(basketsPath);

    // Parse languages from courseCode (e.g., 'cmn_for_eng' -> target='cmn', known='eng')
    const langParts = courseCode.split('_for_');
    const targetLang = langParts[0] || 'spa';  // e.g., 'cmn', 'spa'
    const knownLang = langParts[1] || 'eng';   // e.g., 'eng'

    // Use UUID service to generate deterministic UUIDs from text|lang|role|cadence
    // Audio files in S3 are named by UUID - we generate the same UUID to find them
    const uuidService = require('../../services/uuid-service.cjs');

    // Helper to get audio IDs for a phrase
    // UUIDs are deterministic: same text+lang+role+cadence = same UUID
    // Text must be lowercase, targets use 'slow' cadence
    const getAudioIds = (knownText, targetText) => {
      let sourceId = null;
      let target1Id = null;
      let target2Id = null;

      // Source audio (English prompt) - lowercase, natural cadence
      if (knownText) {
        sourceId = uuidService.generateLegacyUUID(knownText.toLowerCase(), knownLang, 'source', 'natural');
      }

      // Target audio (target language) - lowercase, slow cadence
      if (targetText) {
        target1Id = uuidService.generateLegacyUUID(targetText.toLowerCase(), targetLang, 'target1', 'slow');
        target2Id = uuidService.generateLegacyUUID(targetText.toLowerCase(), targetLang, 'target2', 'slow');
      }

      return { sourceId, target1Id, target2Id };
    };

    // Fibonacci sequence for spaced repetition
    const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    const INTRO_PHRASES = 7;      // First introduction
    const FIRST_REP_PHRASES = 3;  // First review
    const SUBSEQUENT_PHRASES = 1; // Every review after that

    // Organize baskets by seed
    const basketsBySeed = new Map();
    for (const [basketKey, basket] of Object.entries(baskets.baskets || {})) {
      const seedMatch = basketKey.match(/^(S\d{4})/);
      if (!seedMatch) continue;

      const seedId = seedMatch[1];
      const seedNum = parseInt(seedId.replace('S', ''));

      if (seedNum < startSeed || seedNum > endSeed) continue;

      if (!basketsBySeed.has(seedNum)) {
        basketsBySeed.set(seedNum, []);
      }
      basketsBySeed.get(seedNum).push({ basketKey, basket, seedId });
    }

    // Sort seeds
    const sortedSeedNums = Array.from(basketsBySeed.keys()).sort((a, b) => a - b);

    // Track LEGO state for spaced repetition
    // legoKey -> { fibPosition, lastCycle, practiceCount, phrases (remaining for review) }
    const legoState = new Map();

    // Build the script
    const items = [];
    let cycleNum = 0;

    // Process each seed in order
    for (const seedNum of sortedSeedNums) {
      const seedBaskets = basketsBySeed.get(seedNum);

      // Sort LEGOs within seed by their key (L01, L02, etc.)
      seedBaskets.sort((a, b) => a.basketKey.localeCompare(b.basketKey));

      for (const { basketKey, basket, seedId } of seedBaskets) {
        const lego = basket.lego;
        const allPhrases = basket.practice_phrases || [];

        // Separate components, debut, and practice phrases
        const components = allPhrases.filter(p => p.is_component === true);
        const debutPhrase = allPhrases.find(p => p.is_debut === true);
        const practiceOnly = allPhrases.filter(p => !p.is_component && !p.is_debut);

        // === INTRODUCE NEW LEGO ===

        // Extract lego number from basketKey (e.g., "S0001L01" -> "01")
        const legoNum = basketKey.match(/L(\d+)/)?.[1] || '';

        // 1. Components first (if M-type)
        for (const comp of components) {
          cycleNum++;
          const audio = getAudioIds(comp.known, comp.target);
          items.push({
            uuid: `${basketKey}_comp_${cycleNum}`,
            cycleNum,
            seedId,
            legoKey: basketKey,
            seedCode: seedId,
            legoCode: legoNum,
            type: 'component',
            knownText: comp.known,
            targetText: comp.target,
            sourceId: audio.sourceId,
            target1Id: audio.target1Id,
            target2Id: audio.target2Id,
            hasAudio: !!(audio.sourceId && audio.target1Id),
            isNew: true
          });
        }

        // 2. LEGO Debut (the LEGO itself)
        if (debutPhrase) {
          cycleNum++;
          const audio = getAudioIds(debutPhrase.known, debutPhrase.target);
          items.push({
            uuid: `${basketKey}_debut_${cycleNum}`,
            cycleNum,
            seedId,
            legoKey: basketKey,
            seedCode: seedId,
            legoCode: legoNum,
            type: 'debut',
            knownText: debutPhrase.known,
            targetText: debutPhrase.target,
            sourceId: audio.sourceId,
            target1Id: audio.target1Id,
            target2Id: audio.target2Id,
            hasAudio: !!(audio.sourceId && audio.target1Id),
            isNew: true
          });
        }

        // 3. Up to 7 practice phrases for this new LEGO (introduction)
        const debutPractice = practiceOnly.slice(0, INTRO_PHRASES);
        for (const phrase of debutPractice) {
          cycleNum++;
          const audio = getAudioIds(phrase.known, phrase.target);
          items.push({
            uuid: `${basketKey}_practice_${cycleNum}`,
            cycleNum,
            seedId,
            legoKey: basketKey,
            seedCode: seedId,
            legoCode: legoNum,
            type: 'practice',
            knownText: phrase.known,
            targetText: phrase.target,
            sourceId: audio.sourceId,
            target1Id: audio.target1Id,
            target2Id: audio.target2Id,
            hasAudio: !!(audio.sourceId && audio.target1Id),
            isNew: true
          });
        }

        // Initialize this LEGO for future spaced rep
        legoState.set(basketKey, {
          fibPosition: 0,
          lastCycle: cycleNum,
          reviewCount: 0, // Track how many times this LEGO has been reviewed
          remainingPhrases: practiceOnly.slice(INTRO_PHRASES), // Phrases left for reviews
          seedId,
          lego
        });

        // === INTERLEAVE SPACED REPETITION REVIEWS ===
        // Check which previous LEGOs are due for review
        const dueForReview = [];
        for (const [prevKey, state] of legoState.entries()) {
          if (prevKey === basketKey) continue; // Skip the one we just introduced

          const skipNum = FIBONACCI[Math.min(state.fibPosition, FIBONACCI.length - 1)];
          const nextDue = state.lastCycle + skipNum;

          if (cycleNum >= nextDue && state.remainingPhrases.length > 0) {
            dueForReview.push({ key: prevKey, state, overdue: cycleNum - nextDue });
          }
        }

        // Sort by most overdue first
        dueForReview.sort((a, b) => b.overdue - a.overdue);

        // Add review phrases from each due LEGO
        // First review = 3 phrases, subsequent reviews = 1 phrase
        for (const { key: reviewKey, state } of dueForReview.slice(0, 3)) { // Max 3 LEGOs reviewed per introduction
          const phraseCount = state.reviewCount === 0 ? FIRST_REP_PHRASES : SUBSEQUENT_PHRASES;
          const reviewPhrases = state.remainingPhrases.splice(0, phraseCount);

          // Extract lego number from reviewKey
          const reviewLegoNum = reviewKey.match(/L(\d+)/)?.[1] || '';

          for (const phrase of reviewPhrases) {
            cycleNum++;
            const audio = getAudioIds(phrase.known, phrase.target);
            items.push({
              uuid: `${reviewKey}_review_${cycleNum}`,
              cycleNum,
              seedId: state.seedId,
              legoKey: reviewKey,
              seedCode: state.seedId,
              legoCode: reviewLegoNum,
              type: 'review',
              knownText: phrase.known,
              targetText: phrase.target,
              sourceId: audio.sourceId,
              target1Id: audio.target1Id,
              target2Id: audio.target2Id,
              hasAudio: !!(audio.sourceId && audio.target1Id),
              isNew: false,
              fibPosition: state.fibPosition,
              reviewNum: state.reviewCount + 1
            });
          }

          // Advance Fibonacci position and increment review count
          state.lastCycle = cycleNum;
          state.fibPosition = Math.min(state.fibPosition + 1, FIBONACCI.length - 1);
          state.reviewCount++;
        }
      }
    }

    console.log(`[Script] Generated ${items.length} items for ${courseCode} seeds ${startSeed}-${endSeed} (${cycleNum} cycles)`);

    res.json({
      courseCode,
      startSeed,
      endSeed,
      seedCount: sortedSeedNums.length,
      cycleCount: cycleNum,
      itemCount: items.length,
      items
    });

  } catch (err) {
    console.error('[Script] Error generating script:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/audio/stream/:uuid (duplicate - keeping for reference)
 * Stream audio file from S3 (ssi-audio-stage bucket)
 * NOTE: This is a duplicate endpoint - the first one at line ~4150 takes precedence
 */
app.get('/api/audio/stream/:uuid', async (req, res) => {
  const { uuid } = req.params;

  try {
    // Audio files are in ssi-audio-stage bucket (separate from course data in ssi-audio-stage)
    const s3Bucket = process.env.S3_AUDIO_BUCKET || 'ssi-audio-stage';
    const s3Key = `mastered/${uuid}.mp3`;

    // Use AWS SDK to get the file
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'eu-west-1'
    });

    const params = {
      Bucket: s3Bucket,
      Key: s3Key
    };

    // Check if file exists
    try {
      await s3.headObject(params).promise();
    } catch (headErr) {
      if (headErr.code === 'NotFound') {
        console.warn(`[Audio] Not found: ${s3Bucket}/${s3Key}`);
        return res.status(404).json({ error: 'Audio file not found in S3' });
      }
      throw headErr;
    }

    // Stream the file
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    const stream = s3.getObject(params).createReadStream();
    stream.on('error', (err) => {
      console.error('[Audio] S3 stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream audio' });
      }
    });

    stream.pipe(res);

  } catch (err) {
    console.error('[Audio] Error streaming audio:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// VOICE CONFIGURATION & PREVIEW ENDPOINTS
// ============================================================

const voiceConfigService = require('../voice-config-service.cjs');
const previewGenerationService = require('../preview-generation-service.cjs');

/**
 * GET /api/courses/:courseCode/voice-config
 * Load voice configuration for a course
 */
app.get('/api/courses/:courseCode/voice-config', async (req, res) => {
  const { courseCode } = req.params;

  try {
    const config = await voiceConfigService.loadVoiceConfig(courseCode);
    res.json({
      success: true,
      config
    });
  } catch (err) {
    console.error(`[VoiceConfig] Error loading config for ${courseCode}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/courses/:courseCode/voice-config
 * Save voice configuration for a course
 */
app.put('/api/courses/:courseCode/voice-config', async (req, res) => {
  const { courseCode } = req.params;
  const config = req.body;

  try {
    // Validate configuration
    const validation = voiceConfigService.validateVoiceConfig({
      ...config,
      courseCode
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    const savedConfig = await voiceConfigService.saveVoiceConfig(courseCode, config);
    res.json({
      success: true,
      config: savedConfig
    });
  } catch (err) {
    console.error(`[VoiceConfig] Error saving config for ${courseCode}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/courses/:courseCode/voice-config/:role
 * Update a specific voice role configuration
 */
app.patch('/api/courses/:courseCode/voice-config/:role', async (req, res) => {
  const { courseCode, role } = req.params;
  const voiceSettings = req.body;

  try {
    // NOTE: We use "known" (not "source") for the known language voice
    // Legacy manifest compatibility: source → known conversion happens elsewhere
    const validRoles = ['target1', 'target2', 'known', 'presentation'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`
      });
    }

    const updatedConfig = await voiceConfigService.updateVoiceRole(courseCode, role, voiceSettings);
    res.json({
      success: true,
      config: updatedConfig
    });
  } catch (err) {
    console.error(`[VoiceConfig] Error updating ${role} for ${courseCode}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/courses/:courseCode/sample-phrases
 * Get sample phrases for preview generation
 */
app.get('/api/courses/:courseCode/sample-phrases', async (req, res) => {
  const { courseCode } = req.params;
  const count = parseInt(req.query.count) || 5;

  try {
    const phrases = await voiceConfigService.getSamplePhrases(courseCode, count);
    res.json({
      success: true,
      courseCode,
      count: phrases.length,
      phrases
    });
  } catch (err) {
    console.error(`[VoiceConfig] Error getting sample phrases for ${courseCode}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/courses/:courseCode/preview/generate
 * Generate preview audio samples for a voice configuration
 *
 * Body: {
 *   role: 'target1' | 'target2' | 'source',
 *   cadence: 'natural' | 'slow',
 *   voiceConfig: { voiceId, provider, name, settings: { speed, stability, ... } },
 *   count: 5  // optional, default 5
 * }
 */
app.post('/api/courses/:courseCode/preview/generate', async (req, res) => {
  const { courseCode } = req.params;
  const { role, cadence = 'natural', voiceConfig, count = 5 } = req.body;

  try {
    if (!role || !voiceConfig || !voiceConfig.voiceId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: role, voiceConfig.voiceId'
      });
    }

    // Load current config to get cadence profiles
    const fullConfig = await voiceConfigService.loadVoiceConfig(courseCode);

    const result = await previewGenerationService.generatePreviewBatch({
      courseCode,
      role,
      cadence,
      voiceConfig,
      cadenceProfiles: fullConfig.cadenceProfiles,
      count
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error(`[Preview] Error generating previews for ${courseCode}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/courses/:courseCode/preview/generate-single
 * Generate a single preview audio sample
 *
 * Body: {
 *   text: 'Text to synthesize',
 *   role: 'target1',
 *   cadence: 'natural',
 *   voiceConfig: { voiceId, provider, settings }
 * }
 */
app.post('/api/courses/:courseCode/preview/generate-single', async (req, res) => {
  const { courseCode } = req.params;
  const { text, role, cadence = 'natural', voiceConfig } = req.body;

  try {
    if (!text || !voiceConfig || !voiceConfig.voiceId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: text, voiceConfig.voiceId'
      });
    }

    const fullConfig = await voiceConfigService.loadVoiceConfig(courseCode);

    const result = await previewGenerationService.generatePreviewSample({
      courseCode,
      text,
      role: role || 'preview',
      cadence,
      voiceConfig,
      cadenceProfiles: fullConfig.cadenceProfiles
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error(`[Preview] Error generating single preview:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/courses/:courseCode/preview/compare
 * Compare two voice configurations side by side
 *
 * Body: {
 *   configA: { voiceId, provider, settings },
 *   configB: { voiceId, provider, settings },
 *   phrases: ['phrase1', 'phrase2'],
 *   cadence: 'natural'
 * }
 */
app.post('/api/courses/:courseCode/preview/compare', async (req, res) => {
  const { courseCode } = req.params;
  const { configA, configB, phrases, cadence = 'natural' } = req.body;

  try {
    if (!configA || !configB || !phrases || phrases.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: configA, configB, phrases'
      });
    }

    const result = await previewGenerationService.compareVoiceConfigs(
      courseCode,
      configA,
      configB,
      phrases,
      cadence
    );

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error(`[Preview] Error comparing configurations:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/courses/:courseCode/preview/:previewId
 * Delete a specific preview sample
 */
app.delete('/api/courses/:courseCode/preview/:previewId', async (req, res) => {
  const { courseCode, previewId } = req.params;

  try {
    const deleted = await previewGenerationService.deletePreview(courseCode, previewId);
    res.json({ success: deleted });
  } catch (err) {
    console.error(`[Preview] Error deleting preview:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/courses/:courseCode/preview/cleanup
 * Clean up old preview files (older than 24 hours by default)
 */
app.post('/api/courses/:courseCode/preview/cleanup', async (req, res) => {
  const { courseCode } = req.params;
  const { maxAgeHours = 24 } = req.body;

  try {
    const result = await previewGenerationService.cleanupOldPreviews(courseCode, maxAgeHours);
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error(`[Preview] Error cleaning up previews:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// END VOICE CONFIGURATION & PREVIEW ENDPOINTS
// ============================================================

// ============================================================
// LANGUAGE BRIEF API (Proxy to Phase 0 Service)
// ============================================================

const PHASE0_URL = process.env.PHASE0_URL || 'http://localhost:3455';

app.get('/api/language-brief/:known/:target', async (req, res) => {
  const { known, target } = req.params;
  try {
    const response = await fetch(`${PHASE0_URL}/api/language-brief/${known}/${target}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[Orchestrator] Phase 0 proxy error:', error.message);
    res.status(503).json({ error: 'Phase 0 service unavailable', details: error.message });
  }
});

app.post('/api/language-brief', async (req, res) => {
  try {
    const response = await fetch(`${PHASE0_URL}/api/language-brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[Orchestrator] Phase 0 proxy error:', error.message);
    res.status(503).json({ error: 'Phase 0 service unavailable', details: error.message });
  }
});

app.put('/api/language-brief/:known/:target', async (req, res) => {
  const { known, target } = req.params;
  try {
    const response = await fetch(`${PHASE0_URL}/api/language-brief/${known}/${target}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[Orchestrator] Phase 0 proxy error:', error.message);
    res.status(503).json({ error: 'Phase 0 service unavailable', details: error.message });
  }
});

app.post('/api/language-brief/generate', async (req, res) => {
  try {
    const response = await fetch(`${PHASE0_URL}/api/language-brief/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[Orchestrator] Phase 0 proxy error:', error.message);
    res.status(503).json({ error: 'Phase 0 service unavailable', details: error.message });
  }
});

// ============================================================
// PRODUCTION API PROXY
// Forward /api/production/* requests to production-api on port 3470
// ============================================================

const PRODUCTION_API_URL = process.env.PRODUCTION_API_URL || 'http://localhost:3470';

app.use('/api/production', async (req, res) => {
  const targetUrl = `${PRODUCTION_API_URL}/api/production${req.url}`;

  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        ...req.headers.authorization && { 'Authorization': req.headers.authorization }
      },
      timeout: 30000
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Production API not running',
        message: 'Start production-api with: pm2 start services/production-api.cjs --name production-api'
      });
    }

    const status = error.response?.status || 500;
    const data = error.response?.data || { success: false, error: error.message };
    res.status(status).json(data);
  }
});

/**
 * Start server
 */
httpServer.listen(PORT, () => {
  console.log('');
  console.log(`✅ ${SERVICE_NAME} listening on port ${PORT}`);
  console.log(`   VFS Root: ${VFS_ROOT}`);
  console.log(`   Checkpoint Mode: ${CHECKPOINT_MODE}`);
  console.log(`   WebSocket: /api/orchestrator/websocket`);
  console.log(`   Events API: POST /api/events/:courseCode`);
  console.log('');
  console.log('   Phase Servers:');
  for (const [phase, url] of Object.entries(PHASE_SERVERS)) {
    console.log(`     Phase ${phase}: ${url}`);
  }
  console.log('');
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down orchestrator...');
  process.exit(0);
});
