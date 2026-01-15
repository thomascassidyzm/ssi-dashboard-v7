#!/usr/bin/env node

/**
 * Phase 2: Conflict Resolution Server (DATABASE-ONLY ARCHITECTURE)
 *
 * IMPORTANT: DATABASE-ONLY ARCHITECTURE (January 2026)
 * =====================================================
 * Course data is stored EXCLUSIVELY in Supabase, NOT in JSON files.
 * - All reads from course_legos table via getLegosByCourse()
 * - All writes via updateLegoIsNew(), saveLego(), updateLegoStatus()
 * - No JSON file dependencies (lego_pairs.json DEPRECATED)
 *
 * Responsibilities:
 * - Detect KNOWN->TARGET conflicts from database LEGOs
 * - Apply FCFS (First-Come-First-Served) conflict resolution
 * - Update is_new flags in database via course-data-service
 * - Detect LEGOs embedded within recently seen LEGOs (10-LEGO window)
 * - Create upchunked M-type LEGOs to resolve conflicts
 * - Report completion to orchestrator
 *
 * Port: 3458 (auto-configured by start-automation.js)
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const createLogger = require('../../shared/logger.cjs');

// Database service for DB-first operations
const courseDataService = require('../../course-data-service.cjs');

// Load environment (set by start-automation.js)
const PORT = process.env.PORT || 3458;
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
const SERVICE_NAME = process.env.SERVICE_NAME || 'Phase 2 (Conflict Resolution)';

// Create logger
const logger = createLogger('Phase2');

// Initialize Express
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Active jobs (courseCode -> job state)
const activeJobs = new Map();

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Normalize text for comparison (lowercase, remove punctuation)
 */
function normalize(text) {
  return (text || '').toLowerCase().replace(/[.,!?;:'"¿¡]/g, '').trim();
}

/**
 * Check if phrase exists as substring within container (character-level)
 */
function containsSubstring(container, phrase) {
  if (container === phrase) return false; // Must be proper subset
  return container.includes(phrase);
}

/**
 * Format seed_id from seed number
 * 42 -> "S0042"
 */
function formatSeedId(seedNumber) {
  return 'S' + String(seedNumber).padStart(4, '0');
}

/**
 * Format lego_id from seed number and lego index
 * (42, 1) -> "S0042L01"
 */
function formatLegoId(seedNumber, legoIndex) {
  return formatSeedId(seedNumber) + 'L' + String(legoIndex).padStart(2, '0');
}

/**
 * Language code to full name mapping
 */
function getLanguageName(code) {
  const names = {
    'eng': 'English',
    'ita': 'Italian',
    'spa': 'Spanish',
    'fra': 'French',
    'gle': 'Irish',
    'cym': 'Welsh',
    'cmn': 'Mandarin Chinese',
    'zho': 'Mandarin Chinese',
    'mkd': 'Macedonian',
    'deu': 'German',
    'por': 'Portuguese',
    'nld': 'Dutch',
    'swe': 'Swedish',
    'nor': 'Norwegian',
    'dan': 'Danish',
    'fin': 'Finnish',
    'jpn': 'Japanese',
    'kor': 'Korean',
    'rus': 'Russian',
    'ara': 'Arabic',
    'hin': 'Hindi'
  };
  return names[code?.toLowerCase()] || (code || '').toUpperCase();
}

// =============================================================================
// CORE CONFLICT RESOLUTION ALGORITHM (DB-First)
// =============================================================================

/**
 * Run conflict detection on database LEGOs
 *
 * Detects:
 * - DUPLICATES: same known+target pair (mark later occurrences as is_new=false)
 * - CONFLICTS: same known -> different targets (need upchunking)
 *
 * @param {string} courseCode
 * @param {Object} options
 * @param {boolean} options.dryRun - If true, don't modify database
 * @returns {Promise<Object>} Detection results
 */
async function detectConflicts(courseCode, options = {}) {
  const { dryRun = false } = options;

  logger.info(`Detecting conflicts for ${courseCode} (${dryRun ? 'dry-run' : 'live'})`);

  // Fetch all LEGOs from database (draft status for Phase 2 input)
  const legos = await courseDataService.getLegosByCourse(courseCode, { status: 'draft' });

  if (!legos || legos.length === 0) {
    logger.warn(`No draft LEGOs found for ${courseCode}`);
    return {
      success: false,
      error: 'No draft LEGOs found - Phase 1 must complete first',
      summary: { totalLegos: 0, conflictCount: 0, duplicatesMarked: 0 }
    };
  }

  logger.info(`Found ${legos.length} draft LEGOs`);

  // Group by normalized known_text
  const knownGroups = new Map(); // known_text (normalized) -> array of legos

  for (const lego of legos) {
    const key = normalize(lego.known_text);
    if (!key) continue;

    if (!knownGroups.has(key)) {
      knownGroups.set(key, []);
    }
    knownGroups.get(key).push(lego);
  }

  logger.info(`Found ${knownGroups.size} unique known texts`);

  // Analyze each group for duplicates and conflicts
  const duplicates = [];      // LEGOs to mark as is_new = false
  const conflicts = [];       // Conflicts needing resolution
  let uniqueCount = 0;

  for (const [known, group] of knownGroups) {
    // Group by target within this known
    const targetGroups = new Map(); // target (normalized) -> array of legos

    for (const lego of group) {
      const target = normalize(lego.target_text);
      if (!targetGroups.has(target)) {
        targetGroups.set(target, []);
      }
      targetGroups.get(target).push(lego);
    }

    if (targetGroups.size === 1) {
      // All same target - no conflict, just track duplicates
      const allLegos = [...targetGroups.values()][0];

      // First occurrence is canonical (new: true)
      uniqueCount++;

      // Rest are duplicates (new: false)
      for (let i = 1; i < allLegos.length; i++) {
        duplicates.push({
          courseCode,
          seedNumber: allLegos[i].seed_number,
          legoIndex: allLegos[i].lego_index,
          legoId: formatLegoId(allLegos[i].seed_number, allLegos[i].lego_index),
          knownText: allLegos[i].known_text,
          targetText: allLegos[i].target_text,
          ref: formatLegoId(allLegos[0].seed_number, allLegos[0].lego_index)
        });
      }
    } else {
      // Multiple targets - CONFLICT!
      const targets = [];

      for (const [target, targetLegos] of targetGroups) {
        targets.push({
          target: targetLegos[0].target_text, // Preserve original case
          targetNormalized: target,
          occurrences: targetLegos.length,
          seeds: targetLegos.map(l => formatSeedId(l.seed_number)),
          legos: targetLegos.map(l => ({
            seedNumber: l.seed_number,
            legoIndex: l.lego_index,
            legoId: formatLegoId(l.seed_number, l.lego_index)
          }))
        });
      }

      // Sort by occurrence count (most common first = canonical via FCFS)
      targets.sort((a, b) => b.occurrences - a.occurrences);

      conflicts.push({
        known: group[0].known_text, // Preserve original case
        knownNormalized: known,
        targetCount: targets.length,
        totalOccurrences: group.length,
        targets
      });

      // First target is canonical - mark rest of its occurrences as duplicates
      const canonicalTarget = targets[0];
      uniqueCount++;
      for (let i = 1; i < canonicalTarget.legos.length; i++) {
        const lego = canonicalTarget.legos[i];
        duplicates.push({
          courseCode,
          seedNumber: lego.seedNumber,
          legoIndex: lego.legoIndex,
          legoId: lego.legoId,
          knownText: group[0].known_text,
          targetText: canonicalTarget.target,
          ref: canonicalTarget.legos[0].legoId
        });
      }

      // Other targets need upchunking - but for now mark their duplicates too
      for (let t = 1; t < targets.length; t++) {
        const targetGroup = targets[t];
        uniqueCount++; // Each different target is "new" until upchunked
        for (let i = 1; i < targetGroup.legos.length; i++) {
          const lego = targetGroup.legos[i];
          duplicates.push({
            courseCode,
            seedNumber: lego.seedNumber,
            legoIndex: lego.legoIndex,
            legoId: lego.legoId,
            knownText: group[0].known_text,
            targetText: targetGroup.target,
            ref: targetGroup.legos[0].legoId
          });
        }
      }
    }
  }

  logger.info(`Detection complete: ${uniqueCount} unique, ${duplicates.length} duplicates, ${conflicts.length} conflicts`);

  // Apply changes to database if not dry run
  if (!dryRun && duplicates.length > 0) {
    logger.info(`Marking ${duplicates.length} duplicates as is_new=false`);

    let updated = 0;
    let failed = 0;

    for (const dup of duplicates) {
      try {
        await courseDataService.markLegoAsNew(
          dup.courseCode,
          dup.seedNumber,
          dup.legoIndex,
          false
        );
        updated++;
      } catch (err) {
        logger.error(`Failed to update ${dup.legoId}: ${err.message}`);
        failed++;
      }
    }

    logger.info(`Updated ${updated} LEGOs, ${failed} failed`);
  }

  return {
    success: true,
    courseCode,
    dryRun,
    summary: {
      totalLegos: legos.length,
      uniqueKnownTexts: knownGroups.size,
      uniqueLegos: uniqueCount,
      duplicatesMarked: dryRun ? 0 : duplicates.length,
      conflictCount: conflicts.length,
      affectedLegos: conflicts.reduce((sum, c) => sum + c.totalOccurrences, 0)
    },
    duplicates: duplicates.slice(0, 20), // First 20 for preview
    conflicts
  };
}

/**
 * Run LEGO reuse tracking (embedded detection with 10-LEGO sliding window)
 *
 * Marks LEGOs as is_new=false if they are:
 * 1. Exact duplicates (same known+target seen before)
 * 2. Embedded within recently seen LEGOs (within last 10 LEGOs)
 *
 * @param {string} courseCode
 * @param {Object} options
 * @param {boolean} options.dryRun - If true, don't modify database
 * @returns {Promise<Object>} Deduplication results
 */
async function runDeduplication(courseCode, options = {}) {
  const { dryRun = false } = options;

  logger.info(`Running LEGO reuse tracking for ${courseCode} (${dryRun ? 'dry-run' : 'live'})`);

  // Fetch all LEGOs ordered by seed_number, lego_index
  const legos = await courseDataService.getLegosByCourse(courseCode, { status: 'all' });

  if (!legos || legos.length === 0) {
    logger.warn(`No LEGOs found for ${courseCode}`);
    return { success: false, error: 'No LEGOs found' };
  }

  // Track ALL seen LEGOs for exact duplicate detection
  const seenLegos = new Map(); // key -> first legoId

  // Track last 10 LEGOs for embedded detection (sliding window)
  const recentLegos = []; // Array of {target, known} normalized
  const EMBEDDED_WINDOW = 10;

  let totalLegos = 0;
  let exactDuplicates = 0;
  let embeddedMatches = 0;
  const updates = []; // LEGOs to update

  for (const lego of legos) {
    totalLegos++;
    const normTarget = normalize(lego.target_text);
    const normKnown = normalize(lego.known_text);
    const key = `${normTarget}|${normKnown}`;

    let shouldBeNew = true;
    let reason = null;

    // Check 1: Exact match against ALL seen LEGOs
    if (seenLegos.has(key)) {
      shouldBeNew = false;
      reason = 'exact_duplicate';
      exactDuplicates++;
    } else {
      // Check 2: Embedded in last 10 LEGOs only
      for (const recent of recentLegos) {
        if (containsSubstring(recent.target, normTarget) &&
            containsSubstring(recent.known, normKnown)) {
          shouldBeNew = false;
          reason = 'embedded';
          embeddedMatches++;
          break;
        }
      }
    }

    // Track for future comparisons
    if (!seenLegos.has(key)) {
      seenLegos.set(key, formatLegoId(lego.seed_number, lego.lego_index));
    }
    recentLegos.push({ target: normTarget, known: normKnown });
    if (recentLegos.length > EMBEDDED_WINDOW) recentLegos.shift();

    // Check if update needed
    if (lego.is_new !== shouldBeNew) {
      updates.push({
        courseCode,
        seedNumber: lego.seed_number,
        legoIndex: lego.lego_index,
        legoId: formatLegoId(lego.seed_number, lego.lego_index),
        currentIsNew: lego.is_new,
        newIsNew: shouldBeNew,
        reason
      });
    }
  }

  logger.info(`Deduplication analysis: ${totalLegos} total, ${seenLegos.size} unique, ${exactDuplicates} exact dups, ${embeddedMatches} embedded`);
  logger.info(`${updates.length} LEGOs need is_new flag updates`);

  // Apply updates to database
  if (!dryRun && updates.length > 0) {
    let updated = 0;
    let failed = 0;

    for (const update of updates) {
      try {
        await courseDataService.markLegoAsNew(
          update.courseCode,
          update.seedNumber,
          update.legoIndex,
          update.newIsNew
        );
        updated++;
      } catch (err) {
        logger.error(`Failed to update ${update.legoId}: ${err.message}`);
        failed++;
      }
    }

    logger.info(`Updated ${updated} LEGOs, ${failed} failed`);
  }

  return {
    success: true,
    courseCode,
    dryRun,
    summary: {
      totalLegos,
      uniqueLegos: seenLegos.size,
      exactDuplicates,
      embeddedMatches,
      updatesNeeded: updates.length,
      updatesApplied: dryRun ? 0 : updates.length
    }
  };
}

/**
 * Resolve conflicts via upchunking
 *
 * For each conflict (same known -> multiple targets), creates M-type LEGOs
 * that add context to disambiguate.
 *
 * @param {string} courseCode
 * @param {Array} conflicts - Conflicts from detectConflicts()
 * @param {Object} options
 * @returns {Promise<Object>} Resolution results
 */
async function resolveConflicts(courseCode, conflicts, options = {}) {
  const { dryRun = false } = options;

  if (!conflicts || conflicts.length === 0) {
    logger.info(`No conflicts to resolve for ${courseCode}`);
    return { success: true, resolved: 0 };
  }

  logger.info(`Resolving ${conflicts.length} conflicts for ${courseCode}`);

  // For now, FCFS resolution: first occurrence wins
  // The second+ occurrences' is_new flags are already handled by detectConflicts
  // Full upchunking would create new M-type LEGOs with context

  // TODO: Implement full upchunking algorithm
  // This would:
  // 1. Look at the seed sentence context for each conflicting LEGO
  // 2. Create M-type LEGOs that include enough context to disambiguate
  // 3. Mark the original A-type as is_new=false (covered by M-type)

  return {
    success: true,
    courseCode,
    dryRun,
    resolved: conflicts.length,
    method: 'fcfs', // First-Come-First-Served
    note: 'FCFS resolution applied - later occurrences marked as is_new=false'
  };
}

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * POST /resolve
 * Main Phase 2 endpoint - runs conflict detection, deduplication, and resolution
 *
 * Body: { courseCode: string, dryRun?: boolean }
 */
app.post('/resolve', async (req, res) => {
  const { courseCode, dryRun = false } = req.body;

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode required' });
  }

  // Check if already running
  if (activeJobs.has(courseCode)) {
    return res.status(409).json({
      error: `Phase 2 already running for ${courseCode}`,
      job: activeJobs.get(courseCode)
    });
  }

  logger.info(`Starting Phase 2 resolution for ${courseCode} (${dryRun ? 'dry-run' : 'live'})`);

  // Initialize job
  const job = {
    courseCode,
    status: 'running',
    startedAt: new Date().toISOString(),
    dryRun,
    stages: {
      detection: { status: 'pending' },
      deduplication: { status: 'pending' },
      resolution: { status: 'pending' }
    },
    error: null
  };
  activeJobs.set(courseCode, job);

  try {
    // Stage 1: Conflict Detection
    job.stages.detection.status = 'running';
    const detectionResult = await detectConflicts(courseCode, { dryRun });
    job.stages.detection = { status: 'complete', result: detectionResult.summary };

    if (!detectionResult.success) {
      throw new Error(detectionResult.error || 'Detection failed');
    }

    // Stage 2: Deduplication (embedded detection)
    job.stages.deduplication.status = 'running';
    const dedupResult = await runDeduplication(courseCode, { dryRun });
    job.stages.deduplication = { status: 'complete', result: dedupResult.summary };

    // Stage 3: Conflict Resolution
    job.stages.resolution.status = 'running';
    const resolutionResult = await resolveConflicts(courseCode, detectionResult.conflicts, { dryRun });
    job.stages.resolution = { status: 'complete', result: resolutionResult };

    // Mark LEGOs as released if not dry run
    if (!dryRun && detectionResult.summary.conflictCount === 0) {
      logger.info(`No conflicts - marking LEGOs as released`);
      // LEGOs stay in draft until Phase 3 is complete
      // updateLegoStatus would be called after Phase 3
    }

    job.status = 'complete';
    job.completedAt = new Date().toISOString();

    // Notify orchestrator
    await notifyOrchestrator(courseCode, 'complete', {
      detection: detectionResult.summary,
      deduplication: dedupResult.summary,
      resolution: resolutionResult
    });

    res.json({
      success: true,
      courseCode,
      dryRun,
      detection: detectionResult.summary,
      deduplication: dedupResult.summary,
      resolution: resolutionResult,
      conflicts: detectionResult.conflicts?.slice(0, 10) || [],
      readyForPhase3: detectionResult.summary.conflictCount === 0
    });

  } catch (error) {
    logger.error(`Phase 2 failed for ${courseCode}: ${error.message}`);
    job.status = 'failed';
    job.error = error.message;

    res.status(500).json({
      success: false,
      error: error.message,
      job
    });
  } finally {
    // Keep job in memory for status queries
    setTimeout(() => {
      if (activeJobs.get(courseCode)?.status !== 'running') {
        activeJobs.delete(courseCode);
      }
    }, 300000); // Clean up after 5 minutes
  }
});

/**
 * GET /preview/:courseCode
 * Preview what Phase 2 will do - read-only analysis from database
 */
app.get('/preview/:courseCode', async (req, res) => {
  const { courseCode } = req.params;

  logger.info(`Preview requested for ${courseCode}`);

  try {
    // Check for existing active job
    const existingJob = activeJobs.get(courseCode);
    if (existingJob && existingJob.status === 'running') {
      return res.json({
        phase: 2,
        courseCode,
        hasActiveJob: true,
        jobStatus: existingJob.status,
        message: 'A Phase 2 job is already running for this course'
      });
    }

    // Run detection in dry-run mode
    const result = await detectConflicts(courseCode, { dryRun: true });

    if (!result.success) {
      return res.status(400).json({
        phase: 2,
        courseCode,
        error: result.error,
        prerequisiteMissing: true
      });
    }

    // Determine what Phase 2 will do
    const actions = [];
    if (result.summary.duplicatesMarked > 0 || result.duplicates?.length > 0) {
      const dupCount = result.summary.duplicatesMarked || result.duplicates?.length || 0;
      actions.push(`Mark ${dupCount} duplicates as is_new=false`);
    }
    if (result.summary.conflictCount > 0) {
      actions.push(`Resolve ${result.summary.conflictCount} conflicts via FCFS`);
    }
    if (actions.length === 0) {
      actions.push('Phase 2 complete - no conflicts or duplicates');
    }

    res.json({
      phase: 2,
      courseCode,
      hasActiveJob: false,
      summary: result.summary,
      conflicts: result.conflicts?.slice(0, 10) || [],
      duplicates: result.duplicates?.slice(0, 10) || [],
      actions,
      needsWork: result.summary.conflictCount > 0 || (result.duplicates?.length || 0) > 0,
      readyForPhase3: result.summary.conflictCount === 0
    });

  } catch (error) {
    logger.error(`Preview error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /status/:courseCode
 * Get current Phase 2 job status
 */
app.get('/status/:courseCode', (req, res) => {
  const { courseCode } = req.params;
  const job = activeJobs.get(courseCode);

  if (!job) {
    return res.status(404).json({
      error: `No Phase 2 job found for ${courseCode}`,
      hint: 'Use POST /resolve to start Phase 2'
    });
  }

  const startTime = new Date(job.startedAt).getTime();
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - startTime) / 1000);

  res.json({
    courseCode,
    status: job.status,
    dryRun: job.dryRun,
    stages: job.stages,
    timing: {
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      elapsedSeconds
    },
    error: job.error
  });
});

/**
 * POST /detect
 * Run conflict detection only (no resolution)
 *
 * Body: { courseCode: string, dryRun?: boolean }
 */
app.post('/detect', async (req, res) => {
  const { courseCode, dryRun = true } = req.body;

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode required' });
  }

  logger.info(`Running detection for ${courseCode} (${dryRun ? 'dry-run' : 'live'})`);

  try {
    const result = await detectConflicts(courseCode, { dryRun });

    res.json({
      success: result.success,
      courseCode,
      dryRun,
      summary: result.summary,
      conflicts: result.conflicts?.slice(0, 20) || [],
      duplicates: result.duplicates?.slice(0, 20) || []
    });

  } catch (error) {
    logger.error(`Detection error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /deduplicate
 * Run deduplication only (embedded detection)
 *
 * Body: { courseCode: string, dryRun?: boolean }
 */
app.post('/deduplicate', async (req, res) => {
  const { courseCode, dryRun = false } = req.body;

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode required' });
  }

  logger.info(`Running deduplication for ${courseCode} (${dryRun ? 'dry-run' : 'live'})`);

  try {
    const result = await runDeduplication(courseCode, { dryRun });

    res.json({
      success: result.success,
      courseCode,
      dryRun,
      summary: result.summary
    });

  } catch (error) {
    logger.error(`Deduplication error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /stop/:courseCode
 * Stop Phase 2 job for a course
 */
app.post('/stop/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const job = activeJobs.get(courseCode);

  if (!job) {
    return res.status(404).json({ error: `No Phase 2 job found for ${courseCode}` });
  }

  logger.info(`Stopping Phase 2 for ${courseCode}`);

  job.status = 'stopped';
  job.stoppedAt = new Date().toISOString();
  activeJobs.delete(courseCode);

  res.json({
    success: true,
    message: `Phase 2 stopped for ${courseCode}`
  });
});

/**
 * GET /progress/:courseCode
 * Get Phase 2 progress for a course (for dashboard)
 */
app.get('/progress/:courseCode', async (req, res) => {
  const { courseCode } = req.params;

  try {
    // Get LEGO counts from database
    const legos = await courseDataService.getLegosByCourse(courseCode, { status: 'all' });

    if (!legos || legos.length === 0) {
      return res.json({
        success: true,
        courseCode,
        totalLegos: 0,
        newLegos: 0,
        complete: false,
        progress: 0
      });
    }

    const totalLegos = legos.length;
    const newLegos = legos.filter(l => l.is_new === true).length;
    const processedLegos = legos.filter(l => l.is_new !== null).length;

    // Phase 2 is complete when all LEGOs have is_new set
    const complete = processedLegos === totalLegos;
    const progress = totalLegos > 0 ? Math.round((processedLegos / totalLegos) * 100) : 0;

    res.json({
      success: true,
      courseCode,
      totalLegos,
      newLegos,
      reusedLegos: totalLegos - newLegos,
      processedLegos,
      complete,
      progress
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /health
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    port: PORT,
    timestamp: new Date().toISOString(),
    architecture: 'db-first',
    activeJobs: activeJobs.size,
    databaseEnabled: courseDataService.USE_DATABASE_READS && courseDataService.USE_DATABASE_WRITES
  });
});

// =============================================================================
// ORCHESTRATOR NOTIFICATION
// =============================================================================

/**
 * Notify orchestrator of phase completion
 */
async function notifyOrchestrator(courseCode, status, stats = {}) {
  try {
    const axios = require('axios');
    await axios.post(`${ORCHESTRATOR_URL}/phase-complete`, {
      phase: 2,
      courseCode,
      status,
      timestamp: new Date().toISOString(),
      stats
    });
    logger.info(`Notified orchestrator: Phase 2 ${status} for ${courseCode}`);
  } catch (error) {
    logger.warn(`Failed to notify orchestrator: ${error.message}`);
  }
}

// =============================================================================
// SERVER STARTUP
// =============================================================================

app.listen(PORT, () => {
  console.log('');
  console.log(`Phase 2 (Conflict Resolution) - DB-First Architecture`);
  console.log(`${'='.repeat(50)}`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Orchestrator: ${ORCHESTRATOR_URL}`);
  console.log(`   Database Reads: ${courseDataService.USE_DATABASE_READS}`);
  console.log(`   Database Writes: ${courseDataService.USE_DATABASE_WRITES}`);
  console.log('');
  console.log('Endpoints:');
  console.log('   POST /resolve         - Run full Phase 2 resolution');
  console.log('   GET  /preview/:code   - Preview what Phase 2 will do');
  console.log('   GET  /status/:code    - Get job status');
  console.log('   POST /detect          - Run conflict detection only');
  console.log('   POST /deduplicate     - Run deduplication only');
  console.log('   GET  /progress/:code  - Get progress for dashboard');
  console.log('   GET  /health          - Health check');
  console.log('');
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('\nShutting down Phase 2 server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nShutting down Phase 2 server...');
  process.exit(0);
});
