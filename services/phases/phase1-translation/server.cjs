#!/usr/bin/env node

/**
 * Phase 1: Translation Server
 *
 * Responsibilities:
 * - Spawn parallel Claude Code browser sessions for translation
 * - Coordinate multiple translation agents (parallelization from centralized config)
 * - Watch for phase1-* branches
 * - Merge translation outputs into seed_pairs.json
 * - Validate translation quality
 * - Write seed_pairs.json to VFS
 * - Report completion to orchestrator
 *
 * Port: 3457 (auto-configured by start-automation.js)
 *
 * Uses centralized config from services/config/course-modes.json
 * Supports modes: quick_test (10 seeds), mvp_course (250 seeds), full_course (668 seeds)
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { spawn, execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(require('child_process').exec);

// Import centralized config - SINGLE SOURCE OF TRUTH
const { getModeConfig, getPatternForSeeds, getParallelizationPattern, getResumeConfig, SEED_COUNTS, MODES } = require('../../config/course-mode-loader.cjs');

// Load environment (set by start-automation.js)
const PORT = process.env.PORT || 3457;
const VFS_ROOT = process.env.VFS_ROOT;
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
const SERVICE_NAME = process.env.SERVICE_NAME || 'Phase 1 (Translation)';
const AGENT_SPAWN_DELAY = process.env.AGENT_SPAWN_DELAY || 6000; // 6s to avoid clipboard race

// Supabase config for direct browser agent uploads
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Axios for HTTP requests (fire-and-forget event reporting)
const axios = require('axios');

/**
 * Report event to orchestrator (fire and forget - don't block on response)
 * Events follow the schema from COURSE_GENERATION_TRANSPARENCY.md
 *
 * @param {string} courseCode - Course code for event routing
 * @param {object} eventData - Event payload (event, browserId, agentId, etc.)
 */
function reportEvent(courseCode, eventData) {
  const url = `${ORCHESTRATOR_URL}/api/events/${courseCode}`;
  axios.post(url, eventData)
    .then(() => {
      console.log(`[Phase 1] 📡 Event reported: ${eventData.event}${eventData.browserId ? ` (${eventData.browserId})` : ''}`);
    })
    .catch((err) => {
      // Don't fail the main operation - just log the error
      console.warn(`[Phase 1] ⚠️  Failed to report event ${eventData.event}: ${err.message}`);
    });
}

// Database service for database-first writes
const courseDataService = require('../../course-data-service.cjs');

// Supabase client for queue polling
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Queue polling configuration
const QUEUE_POLL_INTERVAL = parseInt(process.env.QUEUE_POLL_INTERVAL) || 3000; // 3 seconds
let queuePollerActive = false;

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

// Branch watcher processes (courseCode -> child process)
const watchers = new Map();

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
  return names[code.toLowerCase()] || code.toUpperCase();
}

/**
 * Generate Phase 1 Master Prompt
 * Uses Master/Worker pattern where workers fetch prompts from URLs and POST results to endpoints
 * DO NOT write files - all output goes through /upload-batch endpoint
 *
 * @param {string} courseCode - Course code
 * @param {object} params - { target, known, startSeed, endSeed, workersPerMaster, seedsPerWorker, masterNum }
 * @param {string} courseDir - Course directory path
 */
function generatePhase1MasterPrompt(courseCode, params, courseDir) {
  const { target, known, startSeed, endSeed, workersPerMaster, seedsPerWorker, masterNum, totalMasters } = params;
  const totalSeeds = endSeed - startSeed + 1;
  const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
  const phase1Url = `http://localhost:${PORT}`;

  // Generate worker assignments for THIS master
  const workers = [];
  for (let w = 0; w < workersPerMaster; w++) {
    const workerStart = startSeed + (w * seedsPerWorker);
    const workerEnd = Math.min(workerStart + seedsPerWorker - 1, endSeed);
    if (workerStart <= endSeed) {
      workers.push({ num: w + 1, startSeed: workerStart, endSeed: workerEnd });
    }
  }

  const workerInstructions = workers.map(w =>
    `  - Worker ${w.num}: Seeds S${String(w.startSeed).padStart(4, '0')}-S${String(w.endSeed).padStart(4, '0')} (${w.endSeed - w.startSeed + 1} seeds)`
  ).join('\n');

  return `# Phase 1 Master ${masterNum}: Translation + LEGO Extraction

**Course**: ${courseCode}
**Target**: ${getLanguageName(target)} (${target})
**Known**: ${getLanguageName(known)} (${known})
**Your Seeds**: ${totalSeeds} (S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')})

---

## YOUR ROLE: MASTER ORCHESTRATOR

You spawn ${workers.length} worker agents via Task tool. Each worker processes a batch of seeds.

**Worker assignments:**
${workerInstructions}

---

## STEP 1: SPAWN ALL WORKERS IN PARALLEL

Use the Task tool ${workers.length} times in a SINGLE message to spawn all workers in parallel.

Each worker prompt should include:
1. The seed range they process
2. Instructions to FETCH methodology from the API
3. The upload endpoint

**CRITICAL**: Workers fetch their own methodology - do NOT summarize or paraphrase it!

---

## WORKER PROMPT TEMPLATE

For each worker, use this prompt (fill in START and END seed numbers):

\`\`\`
# Phase 1 Worker: Seeds S[START]-S[END]

Course: ${courseCode}
Target: ${getLanguageName(target)}
Known: ${getLanguageName(known)}

## STEP 1: FETCH ZUT EXAMPLES (language-specific)

curl -s "${orchestratorUrl}/api/zut-examples/${known}/${target}"

This shows what FAILS and PASSES ZUT for ${getLanguageName(known)} → ${getLanguageName(target)}.

## STEP 2: FETCH METHODOLOGY

curl -s "${orchestratorUrl}/api/phase-intelligence/1"

## STEP 3: FETCH LANGUAGE BRIEF (critical for ${getLanguageName(target)}!)

curl -s "${orchestratorUrl}/api/language-brief/${known}/${target}"

This contains language-specific intelligence: tonal systems, script considerations,
common translation pitfalls, and chunking guidance for ${getLanguageName(target)}.

Read ALL THREE responses before proceeding.

## STEP 4: FETCH YOUR SEEDS

curl -s "${orchestratorUrl}/api/canonical-seeds?start=[START]&end=[END]"

## STEP 5: PROCESS EACH SEED

${known === 'eng'
  ? `Since Known = English: The English canonical text IS your "known" text.
Only translate to ${getLanguageName(target)} for the "target" field.`
  : `IMPORTANT - Bidirectional Translation Required:
- Canonical seeds are in English
- Translate English → ${getLanguageName(known)} for "known" field
- Translate English → ${getLanguageName(target)} for "target" field
- LEGOs map ${getLanguageName(known)} ↔ ${getLanguageName(target)} (NOT English)`}

Apply ZUT to every potential LEGO:
1. Translate seed
2. For each chunk: does learner ALWAYS know what to produce?
3. If uncertain → chunk UP until zero ambiguity
4. Mark embedded chunks as new: false

## STEP 6: UPLOAD TO SUPABASE - MANDATORY FINAL STEP

YOUR WORK IS NOT COMPLETE UNTIL YOU RUN THIS CURL COMMAND!

You MUST execute this curl command using the Bash tool - do NOT just display it:

curl -X POST "${supabaseUrl}/rest/v1/raw_seed_uploads" \\
  -H "apikey: ${SUPABASE_ANON_KEY}" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: return=minimal" \\
  -d '{"course_code":"${courseCode}","agent_id":"worker-[YOUR_NUM]","payload":[YOUR_SEEDS_ARRAY]}'

**COMPACT FORMAT** for the payload array:
\`\`\`json
[
  {"s":"S0001","k":"known text","t":"target text","l":[
    {"y":"A","n":1,"k":"I want","t":"quiero"},
    {"y":"M","n":1,"k":"in Spanish","t":"en español","c":[{"k":"Spanish","t":"español"}]}
  ]}
]
\`\`\`
Keys: s=seed_id, k=known, t=target, l=legos, y=type, n=new(1/0), c=components

**CRITICAL REQUIREMENTS:**
- RUN the curl command using Bash tool - this is NOT optional!
- Use curl for uploads, NOT WebFetch!
- One POST per worker with ALL your seeds in the payload array
- If curl fails, RETRY once before giving up
- Confirm "201 Created" or empty response = success
\`\`\`

---

## STEP 2: WAIT FOR COMPLETION

After spawning all workers, wait for their Task tool results.

## STEP 3: REPORT COMPLETION

When all workers complete, use curl to POST:

curl -X POST "${orchestratorUrl}/api/phase1/${courseCode}/master-complete" \\
  -H "Content-Type: application/json" \\
  -d '{"masterNum": ${masterNum}, "seedsProcessed": ${totalSeeds}, "totalMasters": ${totalMasters}}'

---

**DO NOT process seeds yourself - spawn workers and coordinate!**
**IMPORTANT: Use curl for all HTTP requests, NOT WebFetch!**
**DO NOT write files - all output goes through /upload-batch endpoint!**
`;
}

/**
 * Generate Phase 1 Master Prompt for SPECIFIC SEEDS (intelligent resume)
 * Used when resuming a partially completed course - processes only missing seeds
 *
 * @param {string} courseCode - Course code
 * @param {object} params - { target, known, specificSeeds, workersPerMaster, seedsPerWorker, masterNum }
 * @param {string} courseDir - Course directory path
 */
function generatePhase1MasterPromptForSpecificSeeds(courseCode, params, courseDir) {
  const { target, known, specificSeeds, workersPerMaster, seedsPerWorker, masterNum, totalMasters } = params;
  const totalSeeds = specificSeeds.length;
  const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
  const phase1Url = `http://localhost:${PORT}`;

  // Generate worker assignments for THIS master - distribute specific seeds among workers
  const workers = [];
  for (let w = 0; w < workersPerMaster; w++) {
    const seedStart = w * seedsPerWorker;
    const seedEnd = Math.min(seedStart + seedsPerWorker, specificSeeds.length);
    const workerSeeds = specificSeeds.slice(seedStart, seedEnd);

    if (workerSeeds.length > 0) {
      workers.push({ num: w + 1, seeds: workerSeeds });
    }
  }

  const workerInstructions = workers.map(w =>
    `  - Worker ${w.num}: ${w.seeds.length} seeds: ${w.seeds.join(', ')}`
  ).join('\n');

  // Create seed list for the prompt (workers will use exact IDs)
  const seedListForWorkers = specificSeeds.join(', ');

  return `# Phase 1 Master ${masterNum}: Translation + LEGO Extraction (RESUME)

**Course**: ${courseCode}
**Target**: ${getLanguageName(target)} (${target})
**Known**: ${getLanguageName(known)} (${known})
**Your Seeds**: ${totalSeeds} SPECIFIC seeds (resume mode)
**Seeds**: ${seedListForWorkers}

---

## RESUME MODE - SPECIFIC SEEDS ONLY

This is a RESUME operation. Process ONLY the specific seeds listed above.
These seeds were missing from a previous generation run.

---

## YOUR ROLE: MASTER ORCHESTRATOR

You spawn ${workers.length} worker agents via Task tool. Each worker processes their assigned seeds.

**Worker assignments:**
${workerInstructions}

---

## STEP 1: SPAWN ALL WORKERS IN PARALLEL

Use the Task tool ${workers.length} times in a SINGLE message to spawn all workers in parallel.

Each worker prompt should include:
1. The EXACT seed IDs they process (not a range!)
2. Instructions to FETCH methodology from the API
3. The upload endpoint

**CRITICAL**: Workers fetch their own methodology - do NOT summarize or paraphrase it!

---

## WORKER PROMPT TEMPLATE

For each worker, use this prompt (fill in the SEED_IDS list):

\`\`\`
# Phase 1 Worker: Specific Seeds [SEED_IDS]

Course: ${courseCode}
Target: ${getLanguageName(target)}
Known: ${getLanguageName(known)}

## IMPORTANT: SPECIFIC SEEDS ONLY
Process ONLY these seeds (not a range): [SEED_IDS]

## STEP 1: FETCH ZUT EXAMPLES (language-specific)

curl -s "${orchestratorUrl}/api/zut-examples/${known}/${target}"

This shows what FAILS and PASSES ZUT for ${getLanguageName(known)} → ${getLanguageName(target)}.

## STEP 2: FETCH METHODOLOGY

curl -s "${orchestratorUrl}/api/phase-intelligence/1"

## STEP 3: FETCH LANGUAGE BRIEF (critical for ${getLanguageName(target)}!)

curl -s "${orchestratorUrl}/api/language-brief/${known}/${target}"

This contains language-specific intelligence: tonal systems, script considerations,
common translation pitfalls, and chunking guidance for ${getLanguageName(target)}.

Read ALL THREE responses before proceeding.

## STEP 4: FETCH YOUR SPECIFIC SEEDS

For each seed ID in your list, fetch it individually:
curl -s "${orchestratorUrl}/api/canonical-seeds?seeds=[COMMA_SEPARATED_IDS]"

Or use the seeds parameter: ?seeds=S0005,S0007,S0009

## STEP 5: PROCESS EACH SEED

${known === 'eng'
  ? `Since Known = English: The English canonical text IS your "known" text.
Only translate to ${getLanguageName(target)} for the "target" field.`
  : `IMPORTANT - Bidirectional Translation Required:
- Canonical seeds are in English
- Translate English → ${getLanguageName(known)} for "known" field
- Translate English → ${getLanguageName(target)} for "target" field
- LEGOs map ${getLanguageName(known)} ↔ ${getLanguageName(target)} (NOT English)`}

Apply ZUT to every potential LEGO:
1. Translate seed
2. For each chunk: does learner ALWAYS know what to produce?
3. If uncertain → chunk UP until zero ambiguity
4. Mark embedded chunks as new: false

## STEP 6: UPLOAD TO SUPABASE - MANDATORY FINAL STEP

YOUR WORK IS NOT COMPLETE UNTIL YOU RUN THIS CURL COMMAND!

You MUST execute this curl command using the Bash tool - do NOT just display it:

curl -X POST "${supabaseUrl}/rest/v1/raw_seed_uploads" \\
  -H "apikey: ${SUPABASE_ANON_KEY}" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: return=minimal" \\
  -d '{"course_code":"${courseCode}","agent_id":"worker-[YOUR_NUM]","payload":[YOUR_SEEDS_ARRAY]}'

**COMPACT FORMAT** for the payload array:
\`\`\`json
[
  {"s":"S0001","k":"known text","t":"target text","l":[
    {"y":"A","n":1,"k":"I want","t":"quiero"},
    {"y":"M","n":1,"k":"in Spanish","t":"en español","c":[{"k":"Spanish","t":"español"}]}
  ]}
]
\`\`\`
Keys: s=seed_id, k=known, t=target, l=legos, y=type, n=new(1/0), c=components

**CRITICAL REQUIREMENTS:**
- RUN the curl command using Bash tool - this is NOT optional!
- Use curl for uploads, NOT WebFetch!
- One POST per worker with ALL your seeds in the payload array
- If curl fails, RETRY once before giving up
- Confirm "201 Created" or empty response = success
\`\`\`

---

## STEP 2: WAIT FOR COMPLETION

After spawning all workers, wait for their Task tool results.

## STEP 3: REPORT COMPLETION

When all workers complete, use curl to POST:

curl -X POST "${orchestratorUrl}/api/phase1/${courseCode}/master-complete" \\
  -H "Content-Type: application/json" \\
  -d '{"masterNum": ${masterNum}, "seedsProcessed": ${totalSeeds}, "totalMasters": ${totalMasters}, "isResume": true}'

---

**DO NOT process seeds yourself - spawn workers and coordinate!**
**IMPORTANT: Use curl for all HTTP requests, NOT WebFetch!**
**DO NOT write files - all output goes through /upload-batch endpoint!**
`;
}

/**
 * POST /start
 * Start Phase 1 translation for a course
 *
 * Body: {
 *   courseCode: string,
 *   mode?: string,        // 'quick_test', 'mvp_course', 'full_course' (optional)
 *   totalSeeds?: number,  // Alternative to mode (for custom seed counts)
 *   target: string,       // e.g., 'spa', 'cmn'
 *   known: string,        // e.g., 'eng'
 *   startSeed?: number,
 *   endSeed?: number
 * }
 */
app.post('/start', async (req, res) => {
  // Debug: log exactly what we receive
  console.log(`[Phase 1] /start received:`, JSON.stringify(req.body, null, 2));

  const {
    courseCode,
    mode,
    totalSeeds: customSeedCount,
    target,
    known,
    startSeed = 1,
    endSeed,
    specificSeeds,  // NEW: Array of specific seed IDs for intelligent resume
    isResume = false,  // NEW: Flag indicating this is a resume operation
    pattern: providedPattern  // NEW: Original pattern from orchestrator (for resume)
  } = req.body;

  if (!courseCode || !target || !known) {
    console.log(`[Phase 1] ❌ Missing required fields: courseCode=${courseCode}, target=${target}, known=${known}`);
    return res.status(400).json({
      error: 'courseCode, target, and known are required',
      received: { courseCode, target, known }
    });
  }

  // Determine seed count and mode
  let totalSeeds;
  let modeConfig;
  let modeName;

  // INTELLIGENT RESUME: If specificSeeds provided, use that count
  // For resume mode, use resume config (1 seed per agent for max granularity)
  if (specificSeeds && Array.isArray(specificSeeds) && specificSeeds.length > 0) {
    totalSeeds = specificSeeds.length;

    // For RESUME mode, always use resume config (1 seed per agent)
    // For non-resume specific seeds, use provided pattern or default
    if (isResume) {
      const resumeConfig = getResumeConfig();
      const { seeds_per_agent, agents_per_browser } = resumeConfig;

      // Calculate how many agents/browsers we need
      const agentsNeeded = Math.ceil(totalSeeds / seeds_per_agent);
      const browsersNeeded = Math.ceil(agentsNeeded / agents_per_browser);

      modeConfig = {
        name: `Resume`,
        pattern: {
          browsers: browsersNeeded,
          agents_per_browser: Math.min(agentsNeeded, agents_per_browser),
          seeds_per_agent: seeds_per_agent  // From resume config = 1
        }
      };

      console.log(`[Phase 1] 🔄 RESUME MODE: Using resume config (seeds_per_agent=${seeds_per_agent})`);
      console.log(`[Phase 1]    Agents needed: ${agentsNeeded}, Browsers: ${browsersNeeded}`);
    } else if (providedPattern) {
      const { seeds_per_agent, agents_per_browser } = providedPattern;
      const agentsNeeded = Math.ceil(totalSeeds / seeds_per_agent);
      const browsersNeeded = Math.ceil(agentsNeeded / agents_per_browser);

      modeConfig = {
        name: `Specific`,
        pattern: {
          browsers: browsersNeeded,
          agents_per_browser: Math.min(agentsNeeded, agents_per_browser),
          seeds_per_agent: seeds_per_agent
        }
      };

      console.log(`[Phase 1] Specific seeds: Using provided pattern (seeds_per_agent=${seeds_per_agent})`);
    } else {
      // Fallback: use default pattern
      modeConfig = getPatternForSeeds(totalSeeds);
      console.log(`[Phase 1] ⚠️  No pattern provided, using default`);
    }

    modeName = isResume ? `Resume (${totalSeeds} missing seeds)` : `Specific (${totalSeeds} seeds)`;
    console.log(`[Phase 1] Processing ${totalSeeds} specific seeds`);
    console.log(`[Phase 1]    Seeds: ${specificSeeds.slice(0, 5).join(', ')}${specificSeeds.length > 5 ? '...' : ''}`);
  } else if (mode) {
    // Mode explicitly provided (quick_test, mvp_course, full_course)
    try {
      modeConfig = getModeConfig(mode);
      totalSeeds = modeConfig.seeds;
      modeName = modeConfig.name;
    } catch (err) {
      return res.status(400).json({
        error: err.message,
        validModes: Object.values(MODES)
      });
    }
  } else if (customSeedCount) {
    // Custom seed count provided
    totalSeeds = customSeedCount;
    modeConfig = getPatternForSeeds(totalSeeds);
    modeName = `${modeConfig.name} (${totalSeeds} seeds)`;
  } else {
    return res.status(400).json({
      error: 'Either mode, totalSeeds, or specificSeeds must be provided'
    });
  }

  const finalEndSeed = endSeed || totalSeeds;

  // Check if already running
  if (activeJobs.has(courseCode)) {
    return res.status(409).json({
      error: `Phase 1 already running for ${courseCode}`
    });
  }

  // Get parallelization pattern from config
  const pattern = modeConfig.pattern;
  const { browsers, agents_per_browser, seeds_per_agent } = pattern;

  console.log(`\n🚀 Starting Phase 1 for ${courseCode}`);
  console.log(`   Mode: ${modeName}`);
  console.log(`   Target: ${getLanguageName(target)}`);
  console.log(`   Known: ${getLanguageName(known)}`);
  console.log(`   Total seeds: ${totalSeeds}`);
  console.log(`   Range: S${String(startSeed).padStart(4, '0')}-S${String(finalEndSeed).padStart(4, '0')}`);
  console.log(`   Pattern: ${browsers} browsers × ${agents_per_browser} agents × ${seeds_per_agent} seeds = ${browsers * agents_per_browser * seeds_per_agent} capacity`);

  // MASTER/WORKER ARCHITECTURE:
  // - Spawn `browsers` MASTERS (browser tabs)
  // - Each master spawns `agents_per_browser` WORKERS via Task tool
  // - Each worker processes `seeds_per_agent` seeds
  const masterCount = browsers;
  const workersPerMaster = agents_per_browser;
  const seedsPerWorker = seeds_per_agent;
  const seedsPerMaster = workersPerMaster * seedsPerWorker;

  console.log(`   Architecture: ${masterCount} masters × ${workersPerMaster} workers × ${seedsPerWorker} seeds`);
  console.log(`   Seeds per master: ${seedsPerMaster}`);

  // Initialize job state
  const job = {
    courseCode,
    mode: modeName,
    totalSeeds,
    target,
    known,
    startSeed,
    endSeed: finalEndSeed,
    specificSeeds: specificSeeds || null,  // NEW: Store specific seeds for resume
    isResume: isResume,  // NEW: Track if this is a resume operation
    masterCount,
    workersPerMaster,
    seedsPerWorker,
    seedsPerMaster,
    pattern: {
      browsers,
      agents_per_browser,
      seeds_per_agent,
      capacity: browsers * agents_per_browser * seeds_per_agent
    },
    status: 'spawning_masters',
    startedAt: new Date().toISOString(),
    orchestratorSpawned: false,
    mastersSpawned: 0,
    branchesDetected: 0,
    merged: false,
    error: null
  };

  activeJobs.set(courseCode, job);

  try {
    // Ensure course directory exists
    const courseDir = path.join(VFS_ROOT, courseCode);
    await fs.ensureDir(courseDir);
    await fs.ensureDir(path.join(courseDir, 'phase1_batches'));

    // Spawn MASTERS (browser tabs) - each master spawns workers via Task tool
    await spawnMasters(courseCode, {
      target,
      known,
      startSeed,
      endSeed: finalEndSeed,
      workersPerMaster,
      seedsPerWorker,
      specificSeeds: specificSeeds || null,  // NEW: Pass specific seeds for resume
      isResume: isResume
    }, courseDir, masterCount, seedsPerMaster);

    res.json({
      success: true,
      message: `Phase 1 started for ${courseCode}`,
      job: {
        courseCode,
        totalSeeds,
        target: getLanguageName(target),
        known: getLanguageName(known),
        masterCount,
        workersPerMaster,
        seedsPerWorker,
        status: 'running'
      }
    });
  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    activeJobs.delete(courseCode);

    console.error(`❌ Failed to start Phase 1 for ${courseCode}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start branch watcher for phase1-* branches
 */
async function startBranchWatcher(courseCode, expectedAgents) {
  console.log(`\n👁️  Starting branch watcher for ${courseCode}`);
  console.log(`   Expected agents: ${expectedAgents}`);
  console.log(`   Branch pattern: claude/phase1-*${courseCode}*`);

  const job = activeJobs.get(courseCode);
  if (!job) return;

  // Poll for branches every 10 seconds
  const watchInterval = setInterval(async () => {
    try {
      // Fetch latest from remote
      await execAsync('git fetch --all', { cwd: VFS_ROOT });

      // Look for ANY recent claude/* branches (Claude Code auto-generates names)
      const result = await execAsync(
        `git branch -r --sort=-committerdate | grep "origin/claude/" | head -5 || true`,
        { cwd: VFS_ROOT }
      );

      const recentBranches = result.stdout
        .split('\n')
        .filter(b => b.trim())
        .map(b => b.trim().replace('origin/', ''));

      // Check each recent branch for seed_pairs.json in the course directory
      for (const branchName of recentBranches) {
        try {
          const checkFile = await execAsync(
            `git ls-tree -r origin/${branchName} --name-only | grep "courses/${courseCode}/seed_pairs.json" || true`,
            { cwd: VFS_ROOT }
          );

          if (checkFile.stdout.trim()) {
            console.log(`\n📦 Found Phase 1 output in branch: ${branchName}`);
            console.log(`   File: courses/${courseCode}/seed_pairs.json`);
            console.log(`   Merging branch...`);

            try {
              // Switch to main and merge
              await execAsync('git checkout main', { cwd: VFS_ROOT });
              await execAsync(`git merge origin/${branchName} --no-edit -m "Auto-merge Phase 1: ${courseCode}"`, { cwd: VFS_ROOT });
              console.log(`   ✅ Merged ${branchName} to main`);

              // Verify seed_pairs.json was created
              await mergeTranslations(courseCode);

              // Update job status
              if (job) {
                job.status = 'complete';
                job.merged = true;
                job.branchesDetected = 1;
              }

              // Notify orchestrator
              await notifyOrchestrator(courseCode, 'complete');

              // Stop watching
              clearInterval(watchInterval);
              watchers.delete(courseCode);
              return; // Exit the loop once merged
            } catch (mergeError) {
              console.error(`   ❌ Failed to merge ${branchName}:`, mergeError.message);
            }
          }
        } catch (checkError) {
          // Branch doesn't have our file, skip it
        }
      }
    } catch (error) {
      console.error(`⚠️  Branch watcher error:`, error.message);
    }
  }, 10000); // Check every 10 seconds

  watchers.set(courseCode, { interval: watchInterval });
  console.log(`   Watching for branches... (checking every 10s)`);
}

/**
 * Spawn MASTERS for translation (browser tabs)
 * Each master spawns workers via Task tool
 *
 * Architecture: N masters × M workers × S seeds
 * - Masters = browser tabs (spawned here)
 * - Workers = sub-agents spawned by masters via Task tool
 * - Seeds = work units processed by workers
 *
 * Reports granular events to orchestrator:
 * - browser:spawning when starting to spawn each browser
 * - browser:ready when spawn succeeds
 * - browser:failed when spawn fails
 */
async function spawnMasters(courseCode, params, courseDir, masterCount, seedsPerMaster) {
  console.log(`\n🌐 Spawning ${masterCount} Phase 1 MASTERS...`);
  console.log(`   Seeds per master: ${seedsPerMaster}`);
  console.log(`   Workers per master: ${params.workersPerMaster}`);
  console.log(`   Seeds per worker: ${params.seedsPerWorker}`);

  const { target, known, startSeed, endSeed, workersPerMaster, seedsPerWorker, specificSeeds, isResume } = params;

  // Import browser spawning utility
  const spawner = await loadWebAgentSpawner();
  if (!spawner) {
    console.error(`⚠️  Web agent spawner not available - cannot spawn masters`);
    const job = activeJobs.get(courseCode);
    if (job) {
      job.status = 'spawner_unavailable';
    }
    return;
  }

  const { spawnClaudeWebAgent } = spawner;

  // Build master assignments with their seed ranges
  const masterAssignments = [];

  // INTELLIGENT RESUME: If specificSeeds provided, distribute them among masters
  if (specificSeeds && Array.isArray(specificSeeds) && specificSeeds.length > 0) {
    console.log(`   🔄 RESUME MODE: Distributing ${specificSeeds.length} specific seeds among ${masterCount} masters`);

    // Calculate how many masters we actually need
    const actualMasterCount = Math.min(masterCount, Math.ceil(specificSeeds.length / seedsPerMaster));

    for (let m = 0; m < actualMasterCount; m++) {
      const seedStart = m * seedsPerMaster;
      const seedEnd = Math.min(seedStart + seedsPerMaster, specificSeeds.length);
      const assignedSeeds = specificSeeds.slice(seedStart, seedEnd);

      // Skip if no seeds for this master
      if (assignedSeeds.length === 0) break;

      const browserId = `browser-${m + 1}`;

      // Extract numeric seed range for prompt generation
      const firstSeedNum = parseInt(assignedSeeds[0].replace('S', ''));
      const lastSeedNum = parseInt(assignedSeeds[assignedSeeds.length - 1].replace('S', ''));

      const masterPrompt = generatePhase1MasterPromptForSpecificSeeds(courseCode, {
        target,
        known,
        specificSeeds: assignedSeeds,
        workersPerMaster,
        seedsPerWorker,
        masterNum: m + 1,
        totalMasters: actualMasterCount
      }, courseDir);

      masterAssignments.push({
        browserId,
        masterNum: m + 1,
        assignedSeeds,
        prompt: masterPrompt
      });
    }
  } else {
    // Standard range-based assignment
    for (let m = 0; m < masterCount; m++) {
      const masterStartSeed = startSeed + (m * seedsPerMaster);
      const masterEndSeed = Math.min(masterStartSeed + seedsPerMaster - 1, endSeed);

      // Skip if master has no seeds to process
      if (masterStartSeed > endSeed) {
        break;
      }

      const browserId = `browser-${m + 1}`;
      const assignedSeeds = [];
      for (let s = masterStartSeed; s <= masterEndSeed; s++) {
        assignedSeeds.push(`S${String(s).padStart(4, '0')}`);
      }

      const masterPrompt = generatePhase1MasterPrompt(courseCode, {
        target,
        known,
        startSeed: masterStartSeed,
        endSeed: masterEndSeed,
        workersPerMaster,
        seedsPerWorker,
        masterNum: m + 1,
        totalMasters: masterCount
      }, courseDir);

      masterAssignments.push({
        browserId,
        masterNum: m + 1,
        assignedSeeds,
        prompt: masterPrompt
      });
    }
  }

  console.log(`   Generated ${masterAssignments.length} master prompts`);

  // Spawn masters sequentially with granular event reporting
  const results = [];
  const delayBetweenAgents = parseInt(AGENT_SPAWN_DELAY) || 6000;

  for (let i = 0; i < masterAssignments.length; i++) {
    const { browserId, masterNum, assignedSeeds, prompt } = masterAssignments[i];

    // Report browser:spawning event
    reportEvent(courseCode, {
      event: 'browser:spawning',
      browserId,
      assignedSeeds,
      masterNum,
      workersPerMaster,
      seedsPerWorker
    });

    try {
      const result = await spawnClaudeWebAgent(prompt, masterNum, 'safari');
      results.push({ ...result, browserId, masterNum });

      // Report browser:ready event
      reportEvent(courseCode, {
        event: 'browser:ready',
        browserId,
        masterNum
      });

    } catch (err) {
      console.error(`[Phase 1] ❌ Master ${masterNum} (${browserId}) failed: ${err.message}`);
      results.push({
        success: false,
        browserId,
        masterNum,
        error: err.message
      });

      // Report browser:failed event
      reportEvent(courseCode, {
        event: 'browser:failed',
        browserId,
        masterNum,
        error: err.message
      });
    }

    // Delay between agents (except after the last one)
    if (i < masterAssignments.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenAgents));
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`✅ ${successCount}/${masterAssignments.length} masters spawned successfully`);

  const job = activeJobs.get(courseCode);
  if (job) {
    job.orchestratorSpawned = true;
    job.mastersSpawned = successCount;
    job.status = 'waiting_for_completion';
  }
}

/**
 * Load web agent spawner (if available)
 */
async function loadWebAgentSpawner() {
  try {
    const spawnerPath = path.join(__dirname, '../../shared/spawn-agent.cjs');
    if (await fs.pathExists(spawnerPath)) {
      const module = require(spawnerPath);
      return module;  // Return full module (has spawnClaudeWebAgent, spawnParallelAgents, etc.)
    }
  } catch (error) {
    console.warn(`⚠️  Web agent spawner not available: ${error.message}`);
  }
  return null;
}

/**
 * GET /status/:courseCode
 * Get current Phase 1 status
 */
app.get('/status/:courseCode', (req, res) => {
  const { courseCode } = req.params;
  const job = activeJobs.get(courseCode);

  if (!job) {
    return res.status(404).json({
      error: `No Phase 1 job found for ${courseCode}`
    });
  }

  res.json(job);
});

/**
 * POST /stop/:courseCode
 * Stop Phase 1 for a course
 */
app.post('/stop/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const job = activeJobs.get(courseCode);

  if (!job) {
    return res.status(404).json({
      error: `No Phase 1 job found for ${courseCode}`
    });
  }

  console.log(`\n🛑 Stopping Phase 1 for ${courseCode}...`);

  // Kill branch watcher
  const watcher = watchers.get(courseCode);
  if (watcher && watcher.interval) {
    clearInterval(watcher.interval);
    watchers.delete(courseCode);
  }

  activeJobs.delete(courseCode);

  res.json({
    success: true,
    message: `Phase 1 stopped for ${courseCode}`
  });
});

/**
 * POST /upload-translations - Receive translations directly from Claude Code agents
 *
 * Body: {
 *   course: 'cmn_for_eng',
 *   seedId: 'S0532',
 *   agentId: 'agent-01',
 *   translation: ['English sentence', '中文翻译']
 * }
 */
app.post('/upload-translations', async (req, res) => {
  try {
    const { course, seedId, translation, agentId } = req.body;

    if (!course || !seedId || !translation) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: course, seedId, translation'
      });
    }

    if (!Array.isArray(translation) || translation.length !== 2) {
      return res.status(400).json({
        success: false,
        error: 'translation must be an array of [known, target] strings'
      });
    }

    console.log(`📥 Receiving translation: ${course} / ${seedId} (${translation[0]})${agentId ? ` from ${agentId}` : ''}`);

    // Course directory
    const courseDir = path.join(VFS_ROOT || process.cwd(), 'public/vfs/courses', course);
    const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
    const phase1OutputsDir = path.join(courseDir, 'phase1_outputs');

    // Ensure directories exist
    await fs.ensureDir(phase1OutputsDir);

    // Save individual translation file
    const translationFilePath = path.join(phase1OutputsDir, `seed_${seedId}_translation.json`);
    await fs.writeJson(translationFilePath, { seedId, translation, agentId, timestamp: new Date().toISOString() }, { spaces: 2 });
    console.log(`   💾 Saved to ${translationFilePath}`);

    // Load or create seed_pairs.json
    let seedPairs = {
      version: '7.7.1',
      course,
      target_language: course.split('_')[0], // e.g., 'cmn' from 'cmn_for_eng'
      known_language: course.split('_')[2] || 'eng', // e.g., 'eng' from 'cmn_for_eng'
      seed_range: { start: 1, end: 0 },
      generated: new Date().toISOString(),
      total_seeds: 0,
      actual_seeds: 0,
      translations: {},
      metadata: {}
    };

    if (await fs.pathExists(seedPairsPath)) {
      seedPairs = await fs.readJson(seedPairsPath);
    }

    // Add or update translation
    const isNew = !seedPairs.translations[seedId];
    seedPairs.translations[seedId] = translation;

    // Update counts
    const totalTranslations = Object.keys(seedPairs.translations).length;
    seedPairs.total_seeds = totalTranslations;
    seedPairs.actual_seeds = totalTranslations;

    // Update seed range
    const seedNumbers = Object.keys(seedPairs.translations)
      .map(id => parseInt(id.replace('S', '')))
      .filter(n => !isNaN(n));

    if (seedNumbers.length > 0) {
      seedPairs.seed_range.start = Math.min(...seedNumbers);
      seedPairs.seed_range.end = Math.max(...seedNumbers);
    }

    // Update metadata with enhanced tracking
    if (!seedPairs.metadata.uploads) {
      seedPairs.metadata.uploads = [];
    }

    seedPairs.metadata = {
      ...seedPairs.metadata,
      last_upload: new Date().toISOString(),
      last_seed: seedId,
      last_agent: agentId || 'unknown',
      total_translations: totalTranslations
    };

    // Record upload event (keep last 50)
    seedPairs.metadata.uploads.push({
      timestamp: new Date().toISOString(),
      seedId,
      agentId: agentId || 'unknown',
      isNew,
      totalAfter: totalTranslations
    });

    if (seedPairs.metadata.uploads.length > 50) {
      seedPairs.metadata.uploads = seedPairs.metadata.uploads.slice(-50);
    }

    // Save merged file
    await fs.writeJson(seedPairsPath, seedPairs, { spaces: 2 });

    console.log(`   ✅ Merged into seed_pairs.json (${isNew ? 'new' : 'updated'})`);
    console.log(`   📊 Total translations: ${totalTranslations}`);

    res.json({
      success: true,
      seedId,
      agentId: agentId || 'unknown',
      timestamp: new Date().toISOString(),
      isNew,
      totalTranslations
    });

  } catch (error) {
    console.error('❌ Upload translation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /phase-complete
 * Webhook for agents reporting completion
 */
app.post('/phase-complete', async (req, res) => {
  const { courseCode, agentId, status } = req.body;

  console.log(`\n✅ Agent ${agentId} ${status} for ${courseCode}`);

  const job = activeJobs.get(courseCode);
  if (!job) {
    return res.json({ acknowledged: true });
  }

  job.branchesDetected = (job.branchesDetected || 0) + 1;

  // Check if all agents complete
  if (job.branchesDetected >= job.agentCount) {
    console.log(`\n🎉 All agents complete for ${courseCode}!`);
    job.status = 'merging';

    // Merge all translation files
    await mergeTranslations(courseCode);

    job.status = 'complete';
    job.merged = true;

    // Notify orchestrator
    await notifyOrchestrator(courseCode, 'complete');
  }

  res.json({ acknowledged: true });
});

/**
 * Verify seed_pairs.json was created and run Phase 2 collision check
 * (LUT - Learner Uncertainty Test)
 */
async function mergeTranslations(courseCode) {
  console.log(`\n✅ Verifying translations for ${courseCode}...`);

  const courseDir = path.join(VFS_ROOT, courseCode);
  const seedPairsPath = path.join(courseDir, 'seed_pairs.json');

  // In sequential mode, the agent writes seed_pairs.json directly
  // We just need to verify it exists and is valid
  if (await fs.pathExists(seedPairsPath)) {
    try {
      const data = await fs.readJson(seedPairsPath);
      const translationCount = Object.keys(data.translations || {}).length;
      console.log(`✅ Found seed_pairs.json with ${translationCount} translations`);

      // Run Phase 2: Collision Check (LUT - Learner Uncertainty Test)
      console.log(`\n🔍 Running Phase 2: LUT Collision Check...`);
      await runPhase2CollisionCheck(courseDir, seedPairsPath);

    } catch (error) {
      console.error(`⚠️  Error reading seed_pairs.json:`, error.message);
    }
  } else {
    console.log(`⚠️  Warning: seed_pairs.json not found yet`);
  }
}

/**
 * Run Phase 2: LUT Collision Check
 * Checks if same KNOWN phrase maps to multiple TARGET translations
 */
async function runPhase2CollisionCheck(courseDir, seedPairsPath) {
  const phase2Script = path.join(__dirname, '../../scripts/phase2_collision_check.cjs');

  return new Promise((resolve, reject) => {
    const child = spawn('node', [phase2Script, seedPairsPath], {
      cwd: courseDir,
      stdio: 'inherit' // Show output directly
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Phase 2: No FD violations detected\n`);
        resolve();
      } else {
        console.warn(`⚠️  Phase 2: Found FD violations (see report above)\n`);
        // Don't fail the whole phase - just warn
        resolve();
      }
    });

    child.on('error', (err) => {
      console.error(`⚠️  Phase 2 check failed:`, err.message);
      resolve(); // Continue anyway
    });
  });
}

/**
 * Notify orchestrator of phase completion
 */
async function notifyOrchestrator(courseCode, status) {
  try {
    await axios.post(`${ORCHESTRATOR_URL}/phase-complete`, {
      phase: 1,
      courseCode,
      status,
      timestamp: new Date().toISOString()
    });
    console.log(`✅ Notified orchestrator: Phase 1 ${status} for ${courseCode}`);
  } catch (error) {
    console.error(`⚠️  Failed to notify orchestrator:`, error.message);
  }
}

/**
 * POST /launch-15-masters
 * Launch multi-master orchestration for Phase 1 (Translation + LEGO Extraction)
 * Uses centralized config to determine parallelization pattern
 *
 * DEPRECATED: Use POST /start with mode='full_course' instead
 */
app.post('/launch-15-masters', async (req, res) => {
  const { courseCode, target, known, mode = 'full_course', totalSeeds: customSeedCount } = req.body;

  if (!courseCode || !target || !known) {
    return res.status(400).json({ error: 'courseCode, target, known required' });
  }

  // Determine seed count and pattern from config
  let totalSeeds;
  let modeConfig;
  let modeName;

  if (mode) {
    try {
      modeConfig = getModeConfig(mode);
      totalSeeds = customSeedCount || modeConfig.seeds;
      modeName = modeConfig.name;
    } catch (err) {
      return res.status(400).json({
        error: err.message,
        validModes: Object.values(MODES)
      });
    }
  } else {
    totalSeeds = customSeedCount || SEED_COUNTS.FULL_COURSE;
    modeConfig = getPatternForSeeds(totalSeeds);
    modeName = modeConfig.name;
  }

  const pattern = modeConfig.pattern;
  const { browsers: mastersCount, agents_per_browser: workersPerMaster, seeds_per_agent: seedsPerWorker } = pattern;
  const seedsPerMaster = workersPerMaster * seedsPerWorker;

  console.log(`\n[Phase 1] ====================================`);
  console.log(`[Phase 1] MULTI-MASTER PARALLEL LAUNCH`);
  console.log(`[Phase 1] ====================================`);
  console.log(`[Phase 1] Course: ${courseCode}`);
  console.log(`[Phase 1] Mode: ${modeName}`);
  console.log(`[Phase 1] Target: ${target}, Known: ${known}`);
  console.log(`[Phase 1] Total Seeds: ${totalSeeds}`);
  console.log(`[Phase 1] Pattern: ${mastersCount} masters × ${workersPerMaster} workers × ${seedsPerWorker} seeds = ${mastersCount * workersPerMaster * seedsPerWorker} capacity`);

  const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
  const courseDir = path.join(VFS_ROOT, courseCode);

  // Read the v4.4 unified prompt
  const promptPath = path.join(__dirname, 'PROMPT.md');
  let unifiedPrompt = '';
  try {
    unifiedPrompt = require('fs').readFileSync(promptPath, 'utf8');
  } catch (err) {
    return res.status(500).json({ error: `Failed to read PROMPT.md: ${err.message}` });
  }

  console.log(`[Phase 1] Distribution from config: ${mastersCount} masters × ${workersPerMaster} workers × ${seedsPerWorker} seeds`);

  // Generate master assignments
  const masters = [];
  for (let m = 0; m < mastersCount; m++) {
    const startSeed = m * seedsPerMaster + 1;
    const endSeed = Math.min(startSeed + seedsPerMaster - 1, totalSeeds);

    if (startSeed > totalSeeds) break;

    // Divide into worker batches
    const workers = [];
    for (let w = 0; w < workersPerMaster; w++) {
      const workerStart = startSeed + w * seedsPerWorker;
      const workerEnd = Math.min(workerStart + seedsPerWorker - 1, endSeed);

      if (workerStart > endSeed) break;

      workers.push({
        workerNum: w + 1,
        startSeed: workerStart,
        endSeed: workerEnd,
        seedCount: workerEnd - workerStart + 1
      });
    }

    masters.push({
      masterNum: m + 1,
      name: `phase1_master_${String(m + 1).padStart(2, '0')}`,
      startSeed,
      endSeed,
      seedCount: endSeed - startSeed + 1,
      workers
    });
  }

  console.log(`[Phase 1] Created ${masters.length} master assignments`);

  // Generate master prompts
  const generateMasterPrompt = (master) => {
    const workerInstructions = master.workers.map(w =>
      `  - Worker ${w.workerNum}: Seeds S${String(w.startSeed).padStart(4, '0')}-S${String(w.endSeed).padStart(4, '0')} (${w.seedCount} seeds)`
    ).join('\n');

    return `# Phase 1 Master ${master.masterNum}: Translation + LEGO Extraction

**Course**: ${courseCode}
**Target**: ${getLanguageName(target)} (${target})
**Known**: ${getLanguageName(known)} (${known})
**Your Seeds**: S${String(master.startSeed).padStart(4, '0')}-S${String(master.endSeed).padStart(4, '0')} (${master.seedCount} seeds)

---

## YOUR ROLE: MASTER ORCHESTRATOR

You spawn ${master.workers.length} worker agents via Task tool. Each worker processes a batch of seeds.

**Worker assignments:**
${workerInstructions}

---

## STEP 1: SPAWN ALL WORKERS IN PARALLEL

Use the Task tool ${master.workers.length} times in a SINGLE message to spawn all workers in parallel.

Each worker prompt should include:
1. The seed range they process
2. Instructions to FETCH methodology from the API
3. The upload endpoint

**CRITICAL**: Workers fetch their own methodology - do NOT summarize or paraphrase it!

---

## WORKER PROMPT TEMPLATE

For each worker, use this prompt (fill in START and END seed numbers):

\`\`\`
# Phase 1 Worker: Seeds S[START]-S[END]

Course: ${courseCode}
Target: ${getLanguageName(target)}
Known: ${getLanguageName(known)}

## STEP 1: FETCH ZUT EXAMPLES (language-specific)

curl -s "${orchestratorUrl}/api/zut-examples/${known}/${target}"

This shows what FAILS and PASSES ZUT for ${getLanguageName(known)} → ${getLanguageName(target)}.

## STEP 2: FETCH METHODOLOGY

curl -s "${orchestratorUrl}/api/phase-intelligence/1"

## STEP 3: FETCH LANGUAGE BRIEF (critical for ${getLanguageName(target)}!)

curl -s "${orchestratorUrl}/api/language-brief/${known}/${target}"

This contains language-specific intelligence: tonal systems, script considerations,
common translation pitfalls, and chunking guidance for ${getLanguageName(target)}.

Read ALL THREE responses before proceeding.

## STEP 4: FETCH YOUR SEEDS

curl -s "${orchestratorUrl}/api/canonical-seeds?start=[START]&end=[END]"

## STEP 5: PROCESS EACH SEED

Apply ZUT to every potential LEGO:
1. Translate seed to ${getLanguageName(target)}
2. For each chunk: does learner ALWAYS know what to produce?
3. If uncertain → chunk UP until zero ambiguity
4. Mark embedded chunks as new: 0

## STEP 6: UPLOAD (COMPACT FORMAT)

curl -X POST "https://popty.app/api/seeds/upload" \\
  -H "Content-Type: application/json" \\
  -d '{"course":"${courseCode}","seeds":[YOUR_COMPACT_JSON]}'

**COMPACT FORMAT** (saves tokens):
\`\`\`json
{"course":"${courseCode}","seeds":[
  {"s":"S0001","k":"known text","t":"target text","l":[
    {"y":"A","n":1,"k":"I want","t":"quiero"},
    {"y":"M","n":1,"k":"in Spanish","t":"en español","c":[{"k":"Spanish","t":"español"}]}
  ]}
]}
\`\`\`
Keys: s=seed_id, k=known, t=target, l=legos, y=type, n=new(1/0), c=components
\`\`\`

---

## STEP 2: WAIT FOR COMPLETION

After spawning all workers, wait for their Task tool results.

## STEP 3: REPORT COMPLETION

When all workers complete, use curl to POST:

curl -X POST "${orchestratorUrl}/api/phase1/${courseCode}/master-complete" \\
  -H "Content-Type: application/json" \\
  -d '{"masterNum": ${master.masterNum}, "seedsProcessed": ${master.seedCount}, "totalMasters": ${masters.length}}'

---

**DO NOT process seeds yourself - spawn workers and coordinate!**
**IMPORTANT: Use curl for all HTTP requests, NOT WebFetch!**
`;
  };

  // Save prompts and launch browsers
  const promptsDir = path.join(courseDir, 'phase1_master_prompts');
  await fs.ensureDir(promptsDir);

  for (const master of masters) {
    const prompt = generateMasterPrompt(master);
    await fs.writeFile(path.join(promptsDir, `${master.name}.md`), prompt);
  }

  console.log(`[Phase 1] ✅ Generated ${masters.length} master prompts in ${promptsDir}`);

  // Load web agent spawner
  const spawnClaudeWebAgent = await loadWebAgentSpawner();
  if (!spawnClaudeWebAgent) {
    return res.status(500).json({ error: 'Web agent spawner not available' });
  }

  // Launch all masters in Safari with event reporting
  console.log(`[Phase 1] Launching ${masters.length} Safari windows...`);

  const launchResults = [];
  for (const master of masters) {
    const browserId = `browser-${master.masterNum}`;

    // Build assigned seeds list for this master
    const assignedSeeds = [];
    for (let s = master.startSeed; s <= master.endSeed; s++) {
      assignedSeeds.push(`S${String(s).padStart(4, '0')}`);
    }

    // Report browser:spawning event
    reportEvent(courseCode, {
      event: 'browser:spawning',
      browserId,
      assignedSeeds,
      masterNum: master.masterNum,
      workersPerMaster,
      seedsPerWorker
    });

    try {
      const prompt = generateMasterPrompt(master);
      await spawnClaudeWebAgent(prompt, master.masterNum, 'safari');
      launchResults.push({ master: master.masterNum, status: 'launched' });
      console.log(`[Phase 1]   ✅ Master ${master.masterNum} launched`);

      // Report browser:ready event
      reportEvent(courseCode, {
        event: 'browser:ready',
        browserId,
        masterNum: master.masterNum
      });

      // Delay between launches - needs to be long enough for Safari to load page and paste before next clipboard write
      // 8 seconds: 3s page load + 0.5s paste + 4.5s buffer to prevent clipboard race
      await new Promise(r => setTimeout(r, 8000));
    } catch (err) {
      launchResults.push({ master: master.masterNum, status: 'failed', error: err.message });
      console.error(`[Phase 1]   ❌ Master ${master.masterNum} failed: ${err.message}`);

      // Report browser:failed event
      reportEvent(courseCode, {
        event: 'browser:failed',
        browserId,
        masterNum: master.masterNum,
        error: err.message
      });
    }
  }

  // Track the job
  activeJobs.set(courseCode, {
    status: 'running',
    masters: masters.length,
    totalSeeds,
    startedAt: new Date().toISOString(),
    launchResults
  });

  res.json({
    success: true,
    message: `Launched ${masters.length} masters for Phase 1`,
    courseCode,
    masters: masters.length,
    workersPerMaster,
    seedsPerWorker,
    totalSeeds,
    launchResults
  });
});

/**
 * Expand compact format to full format
 *
 * v6 Compact: {s, k, t, l: [{y, n, k, t, c?}]}
 * v7 Hybrid:  ["S0001", {k,t}, [[type, new, {k,t}, ?[{k,t}...]]]]
 * Full: {seed_id, seed_pair: {known, target}, legos: [{id, type, new, lego: {known, target}, components?}]}
 */
function expandCompactFormat(compactData) {
  return compactData.map(seed => {
    // Check if already in full format
    if (seed.seed_id) return seed;

    // v7 Hybrid format: array-based
    // ["S0001", {k:"known",t:"target"}, [[type, new, {k,t}, ?components]]]
    if (Array.isArray(seed)) {
      const [seedId, seedPair, legos] = seed;
      return {
        seed_id: seedId,
        seed_pair: {
          known: seedPair.k,
          target: seedPair.t
        },
        legos: (legos || []).map((lego, idx) => {
          // lego = [type, new, {k,t}, ?[{k,t}...]]
          const [type, isNew, legoPair, components] = lego;
          const expanded = {
            id: `${seedId}L${String(idx + 1).padStart(2, '0')}`,
            type: type,
            new: isNew === 1 || isNew === true,
            lego: {
              known: legoPair.k,
              target: legoPair.t
            }
          };
          if (components && components.length > 0) {
            expanded.components = components.map(c => ({
              known: c.k,
              target: c.t
            }));
          }
          return expanded;
        })
      };
    }

    // v6 Compact format: object-based {s, k, t, l}
    const seedId = seed.s;
    return {
      seed_id: seedId,
      seed_pair: {
        known: seed.k,
        target: seed.t
      },
      legos: (seed.l || []).map((lego, idx) => {
        const expanded = {
          id: `${seedId}L${String(idx + 1).padStart(2, '0')}`,
          type: lego.y,
          new: lego.n === 1 || lego.n === true,
          lego: {
            known: lego.k,
            target: lego.t
          }
        };
        if (lego.c) {
          expanded.components = lego.c.map(c => ({
            known: c.k,
            target: c.t
          }));
        }
        return expanded;
      })
    };
  });
}

/**
 * POST /api/phase1/:courseCode/upload-batch
 * Workers upload their completed batches here
 * Accepts both compact and full format
 * Now also writes to database (dual-write for backwards compatibility)
 */
app.post('/api/phase1/:courseCode/upload-batch', async (req, res) => {
  const { courseCode } = req.params;
  let batchData = req.body;

  if (!Array.isArray(batchData)) {
    return res.status(400).json({ error: 'Expected JSON array of seed objects' });
  }

  // Detect and expand compact formats (v6 object-based or v7 array-based)
  const isV7Hybrid = batchData.length > 0 && Array.isArray(batchData[0]);
  const isV6Compact = batchData.length > 0 && batchData[0].s && !batchData[0].seed_id;
  const isCompact = isV7Hybrid || isV6Compact;

  if (isV7Hybrid) {
    console.log(`[Phase 1] 📦 Expanding v7 hybrid format (${batchData.length} seeds)`);
    batchData = expandCompactFormat(batchData);
  } else if (isV6Compact) {
    console.log(`[Phase 1] 📦 Expanding v6 compact format (${batchData.length} seeds)`);
    batchData = expandCompactFormat(batchData);
  }

  const courseDir = path.join(VFS_ROOT, courseCode);
  const batchesDir = path.join(courseDir, 'phase1_batches');
  await fs.ensureDir(batchesDir);

  // Save batch with timestamp + random suffix to avoid collisions (JSON fallback)
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const batchFile = `batch_${Date.now()}_${randomSuffix}_${batchData.length}seeds.json`;
  await fs.writeJson(path.join(batchesDir, batchFile), batchData, { spaces: 2 });

  console.log(`[Phase 1] ✅ Received batch: ${batchData.length} seeds → ${batchFile}`);

  // Extract seed IDs and report batch:received event
  const seedIds = batchData.map(seed => seed.seed_id).filter(Boolean);
  const agentId = req.body.agentId || req.headers['x-agent-id'] || 'unknown';

  // Report batch:received event
  reportEvent(courseCode, {
    event: 'batch:received',
    seedIds,
    agentId,
    batchFile,
    seedCount: batchData.length
  });

  // Report seed:complete events for each seed in the batch
  for (const seedId of seedIds) {
    reportEvent(courseCode, {
      event: 'seed:complete',
      seedId,
      agentId
    });
  }

  // DATABASE-FIRST: Write to Supabase
  let dbStats = { seeds: 0, legos: 0, components: 0 };
  if (courseDataService.USE_DATABASE_WRITES) {
    try {
      // Ensure course exists in database
      await courseDataService.ensureCourse(courseCode);

      // Import each seed to database
      for (const seedData of batchData) {
        const result = await courseDataService.importSeedWithLegos(courseCode, seedData);
        if (result) {
          dbStats.seeds++;
          dbStats.legos += result.legoCount || 0;
          dbStats.components += result.componentCount || 0;
        }
      }
      console.log(`[Phase 1] 💾 Database write: ${dbStats.seeds} seeds, ${dbStats.legos} legos, ${dbStats.components} components`);
    } catch (dbError) {
      console.error(`[Phase 1] ⚠️  Database write failed (JSON saved as fallback):`, dbError.message);
    }
  }

  res.json({
    success: true,
    received: batchData.length,
    file: batchFile,
    expanded: isCompact,
    database: dbStats
  });
});

/**
 * POST /api/phase1/:courseCode/master-complete
 * Masters report completion here
 */
app.post('/api/phase1/:courseCode/master-complete', async (req, res) => {
  const { courseCode } = req.params;
  const { masterNum, seedsProcessed, totalMasters } = req.body;

  console.log(`[Phase 1] ✅ Master ${masterNum} complete: ${seedsProcessed} seeds`);

  const browserId = `browser-${masterNum}`;

  // Report browser:complete event
  reportEvent(courseCode, {
    event: 'browser:complete',
    browserId,
    masterNum,
    seedsProcessed
  });

  const job = activeJobs.get(courseCode);
  if (job) {
    job.mastersComplete = (job.mastersComplete || 0) + 1;
    job.seedsProcessed = (job.seedsProcessed || 0) + seedsProcessed;

    // Check if all masters complete
    if (job.mastersComplete >= job.masters) {
      console.log(`[Phase 1] 🎉 All masters complete! Merging batches...`);
      await mergeBatches(courseCode);
      job.status = 'complete';
    }
  }

  res.json({ success: true, masterNum, acknowledged: true });
});

/**
 * Merge all batch files into draft_lego_pairs.json
 */
async function mergeBatches(courseCode) {
  const courseDir = path.join(VFS_ROOT, courseCode);
  const batchesDir = path.join(courseDir, 'phase1_batches');

  if (!await fs.pathExists(batchesDir)) {
    console.log(`[Phase 1] No batches directory found`);
    return;
  }

  const batchFiles = (await fs.readdir(batchesDir)).filter(f => f.endsWith('.json'));
  console.log(`[Phase 1] Merging ${batchFiles.length} batch files...`);

  const allSeeds = [];
  for (const file of batchFiles) {
    const batch = await fs.readJson(path.join(batchesDir, file));
    allSeeds.push(...batch);
  }

  // Sort by seed_id
  allSeeds.sort((a, b) => a.seed_id.localeCompare(b.seed_id));

  // Write draft_lego_pairs.json
  const outputPath = path.join(courseDir, 'draft_lego_pairs.json');
  await fs.writeJson(outputPath, allSeeds, { spaces: 2 });

  console.log(`[Phase 1] ✅ Merged ${allSeeds.length} seeds → draft_lego_pairs.json`);

  // Notify orchestrator
  await notifyOrchestrator(courseCode, 'complete');
}

/**
 * POST /resume
 * Intelligent gap-fill: scan for missing seeds and launch targeted masters
 *
 * 1. Scans batch files to find processed seeds
 * 2. Compares against totalSeeds to find gaps
 * 3. Groups missing seeds into masters using centralized config pattern
 * 4. Generates prompts with EXACT seed IDs (not ranges)
 * 5. Launches Safari windows
 */
app.post('/resume', async (req, res) => {
  const { courseCode, target, known, mode = 'mvp_course', totalSeeds: customSeedCount } = req.body;

  if (!courseCode || !target || !known) {
    return res.status(400).json({ error: 'courseCode, target, known required' });
  }

  // Determine seed count and pattern from config
  let totalSeeds;
  let modeConfig;
  let modeName;

  if (mode) {
    try {
      modeConfig = getModeConfig(mode);
      totalSeeds = customSeedCount || modeConfig.seeds;
      modeName = modeConfig.name;
    } catch (err) {
      return res.status(400).json({
        error: err.message,
        validModes: Object.values(MODES)
      });
    }
  } else {
    totalSeeds = customSeedCount || SEED_COUNTS.MVP_COURSE;
    modeConfig = getPatternForSeeds(totalSeeds);
    modeName = modeConfig.name;
  }

  // Resume mode uses special config for maximum granularity (1 seed per agent)
  const resumeConfig = getResumeConfig();
  const workersPerMaster = resumeConfig.agents_per_browser;
  const seedsPerWorker = resumeConfig.seeds_per_agent;

  console.log(`\n[Phase 1] ====================================`);
  console.log(`[Phase 1] RESUME / GAP-FILL MODE`);
  console.log(`[Phase 1] ====================================`);
  console.log(`[Phase 1] Course: ${courseCode}`);
  console.log(`[Phase 1] Mode: ${modeName}`);
  console.log(`[Phase 1] Total Seeds Expected: ${totalSeeds}`);
  console.log(`[Phase 1] Pattern: ${workersPerMaster} workers × ${seedsPerWorker} seed (RESUME CONFIG - max granularity)`);

  const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
  const courseDir = path.join(VFS_ROOT, courseCode);
  const batchesDir = path.join(courseDir, 'phase1_batches');

  // Step 1: Scan draft_lego_pairs.json (the actual output file) for processed seeds
  // Fall back to batch files if draft doesn't exist yet
  const processedSeeds = new Set();
  const draftPath = path.join(courseDir, 'draft_lego_pairs.json');

  if (await fs.pathExists(draftPath)) {
    // Primary: scan the merged output file
    try {
      const draft = await fs.readJson(draftPath);
      for (const seed of draft) {
        if (seed.seed_id) {
          processedSeeds.add(seed.seed_id);
        }
      }
      console.log(`[Phase 1] Scanned draft_lego_pairs.json: ${processedSeeds.size} seeds`);
    } catch (err) {
      console.error(`[Phase 1] Error reading draft_lego_pairs.json: ${err.message}`);
    }
  } else if (await fs.pathExists(batchesDir)) {
    // Fallback: scan batch files if draft doesn't exist
    console.log(`[Phase 1] No draft_lego_pairs.json found, scanning batch files...`);
    const batchFiles = (await fs.readdir(batchesDir)).filter(f => f.endsWith('.json'));
    for (const file of batchFiles) {
      try {
        const batch = await fs.readJson(path.join(batchesDir, file));
        for (const seed of batch) {
          if (seed.seed_id) {
            processedSeeds.add(seed.seed_id);
          }
        }
      } catch (err) {
        console.error(`[Phase 1] Error reading ${file}: ${err.message}`);
      }
    }
    console.log(`[Phase 1] Scanned ${batchFiles.length} batch files: ${processedSeeds.size} seeds`);
  }

  console.log(`[Phase 1] Processed seeds found: ${processedSeeds.size}`);

  // Step 2: Find missing seeds
  const missingSeeds = [];
  for (let i = 1; i <= totalSeeds; i++) {
    const seedId = 'S' + String(i).padStart(4, '0');
    if (!processedSeeds.has(seedId)) {
      missingSeeds.push(seedId);
    }
  }

  console.log(`[Phase 1] Missing seeds: ${missingSeeds.length}`);

  if (missingSeeds.length === 0) {
    return res.json({
      success: true,
      message: 'No missing seeds - Phase 1 is complete!',
      processedSeeds: processedSeeds.size,
      missingSeeds: 0
    });
  }

  // Step 3: Group into batches of seedsPerWorker
  const workerBatches = [];
  for (let i = 0; i < missingSeeds.length; i += seedsPerWorker) {
    workerBatches.push(missingSeeds.slice(i, i + seedsPerWorker));
  }

  // Step 4: Group into masters of workersPerMaster each
  const masters = [];
  for (let m = 0; m * workersPerMaster < workerBatches.length; m++) {
    const masterWorkers = workerBatches.slice(m * workersPerMaster, (m + 1) * workersPerMaster);
    masters.push({
      masterNum: m + 1,
      workers: masterWorkers.map((seeds, idx) => ({
        workerNum: idx + 1,
        seeds: seeds  // EXACT seed IDs, not ranges
      }))
    });
  }

  console.log(`[Phase 1] Gap-fill plan: ${masters.length} masters × ${workersPerMaster} workers × ${seedsPerWorker} seeds`);

  // Read the v4.4 unified prompt
  const promptPath = path.join(__dirname, 'PROMPT.md');
  let unifiedPrompt = '';
  try {
    unifiedPrompt = require('fs').readFileSync(promptPath, 'utf8');
  } catch (err) {
    return res.status(500).json({ error: `Failed to read PROMPT.md: ${err.message}` });
  }

  // Generate master prompts with EXACT seed IDs
  const generateGapFillMasterPrompt = (master) => {
    const workerInstructions = master.workers.map(w =>
      `  - Worker ${w.workerNum}: Seeds ${w.seeds.join(', ')} (${w.seeds.length} seeds)`
    ).join('\n');

    const totalMasterSeeds = master.workers.reduce((sum, w) => sum + w.seeds.length, 0);

    return `# Phase 1 Gap-Fill Master ${master.masterNum}: Translation + LEGO Extraction

**Course**: ${courseCode}
**Target**: ${getLanguageName(target)} (${target})
**Known**: ${getLanguageName(known)} (${known})
**Your Seeds**: ${totalMasterSeeds} specific seeds (gap-fill mode)

---

## YOUR ROLE: MASTER ORCHESTRATOR

You spawn ${master.workers.length} worker agents via Task tool. Each worker processes SPECIFIC seeds (not ranges).

**Worker assignments:**
${workerInstructions}

---

## STEP 1: SPAWN ALL WORKERS IN PARALLEL

Use the Task tool ${master.workers.length} times in a SINGLE message to spawn all workers in parallel.

Each worker prompt should include:
1. The EXACT seed IDs they process
2. The methodology below
3. The output format
4. The upload endpoint

---

## WORKER PROMPT TEMPLATE

For each worker, use this prompt (fill in the EXACT SEED_IDS):

\`\`\`
# Phase 1 Worker: Seeds [SEED_IDS]

Course: ${courseCode}
Target: ${getLanguageName(target)}
Known: ${getLanguageName(known)}

## STEP 1: FETCH SEEDS
GET: ${orchestratorUrl}/api/canonical-seeds?ids=[SEED_IDS_COMMA_SEPARATED]

Example: ${orchestratorUrl}/api/canonical-seeds?ids=S0049,S0050,S0051

## STEP 2: METHODOLOGY
${unifiedPrompt}

## STEP 3: PROCESS EACH SEED
For each seed in your list:
1. Translate to ${getLanguageName(target)}
2. Extract LEGOs (A-type and M-type)
3. Mark embedded LEGOs as new: false (same-seed only)

## STEP 4: UPLOAD RESULTS
Use curl (NOT WebFetch) to POST to database:

curl -X POST "https://popty.app/api/seeds/upload" \\
  -H "Content-Type: application/json" \\
  -d '{"course":"${courseCode}","seeds":[YOUR_JSON_ARRAY]}'

Output format: JSON array of seed objects (see methodology above)
\`\`\`

---

## STEP 2: WAIT FOR COMPLETION

After spawning all workers, wait for their Task tool results.

## STEP 3: REPORT COMPLETION

When all workers complete, use curl to POST:

curl -X POST "${orchestratorUrl}/api/phase1/${courseCode}/master-complete" \\
  -H "Content-Type: application/json" \\
  -d '{"masterNum": ${master.masterNum}, "seedsProcessed": ${totalMasterSeeds}, "totalMasters": ${masters.length}}'

---

**DO NOT process seeds yourself - spawn workers and coordinate!**
**IMPORTANT: Tell workers to use curl for uploads, NOT WebFetch!**
`;
  };

  // Save prompts
  const promptsDir = path.join(courseDir, 'phase1_gapfill_prompts');
  await fs.ensureDir(promptsDir);

  for (const master of masters) {
    const prompt = generateGapFillMasterPrompt(master);
    const filename = `gapfill_master_${String(master.masterNum).padStart(2, '0')}.md`;
    await fs.writeFile(path.join(promptsDir, filename), prompt);
  }

  console.log(`[Phase 1] ✅ Generated ${masters.length} gap-fill prompts in ${promptsDir}`);

  // Load web agent spawner
  const spawnClaudeWebAgent = await loadWebAgentSpawner();
  if (!spawnClaudeWebAgent) {
    return res.status(500).json({ error: 'Web agent spawner not available' });
  }

  // Launch all masters in Safari with event reporting
  console.log(`[Phase 1] Launching ${masters.length} Safari windows...`);

  const launchResults = [];
  for (const master of masters) {
    const browserId = `browser-gapfill-${master.masterNum}`;

    // Collect all seeds assigned to this master
    const assignedSeeds = master.workers.flatMap(w => w.seeds);

    // Report browser:spawning event
    reportEvent(courseCode, {
      event: 'browser:spawning',
      browserId,
      assignedSeeds,
      masterNum: master.masterNum,
      mode: 'gap-fill'
    });

    try {
      const prompt = generateGapFillMasterPrompt(master);
      await spawnClaudeWebAgent(prompt, master.masterNum, 'safari');
      launchResults.push({ master: master.masterNum, status: 'launched' });
      console.log(`[Phase 1]   ✅ Gap-fill Master ${master.masterNum} launched`);

      // Report browser:ready event
      reportEvent(courseCode, {
        event: 'browser:ready',
        browserId,
        masterNum: master.masterNum,
        mode: 'gap-fill'
      });

      // Delay between launches
      await new Promise(r => setTimeout(r, 8000));
    } catch (err) {
      launchResults.push({ master: master.masterNum, status: 'failed', error: err.message });
      console.error(`[Phase 1]   ❌ Gap-fill Master ${master.masterNum} failed: ${err.message}`);

      // Report browser:failed event
      reportEvent(courseCode, {
        event: 'browser:failed',
        browserId,
        masterNum: master.masterNum,
        mode: 'gap-fill',
        error: err.message
      });
    }
  }

  // Track the job
  activeJobs.set(courseCode + '_gapfill', {
    status: 'running',
    mode: 'gap-fill',
    masters: masters.length,
    missingSeeds: missingSeeds.length,
    startedAt: new Date().toISOString(),
    launchResults
  });

  res.json({
    success: true,
    message: `Launched ${masters.length} gap-fill masters for ${missingSeeds.length} missing seeds`,
    courseCode,
    processedSeeds: processedSeeds.size,
    missingSeeds: missingSeeds.length,
    masters: masters.length,
    workersPerMaster,
    seedsPerWorker,
    missingSeedsList: missingSeeds,
    launchResults
  });
});

/**
 * POST /gap-fill
 * Orchestrator calls this when stall is detected with missing seeds
 * Accepts explicit seed numbers and spawns targeted agents
 */
app.post('/gap-fill', async (req, res) => {
  const { courseCode, seeds, target, known } = req.body;

  if (!courseCode || !seeds || !Array.isArray(seeds) || seeds.length === 0) {
    return res.status(400).json({ error: 'courseCode and seeds array required' });
  }

  if (!target || !known) {
    return res.status(400).json({ error: 'target and known language required' });
  }

  console.log(`\n[Phase 1] ====================================`);
  console.log(`[Phase 1] GAP-FILL REQUEST FROM ORCHESTRATOR`);
  console.log(`[Phase 1] ====================================`);
  console.log(`[Phase 1] Course: ${courseCode}`);
  console.log(`[Phase 1] Missing seeds: ${seeds.length} → ${seeds.map(s => 'S' + String(s).padStart(4, '0')).join(', ')}`);

  const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';

  // Convert seed numbers to seed IDs
  const missingSeedIds = seeds.map(s => 'S' + String(s).padStart(4, '0'));

  // For gap-fill, spawn ONE master per missing seed (simpler and more reliable)
  // This avoids the complexity of master/worker coordination for small gaps
  const spawnClaudeWebAgent = await loadWebAgentSpawner();
  if (!spawnClaudeWebAgent) {
    return res.status(500).json({ error: 'Web agent spawner not available' });
  }

  // Generate direct worker prompts (no master/worker split for gap-fill)
  const launchResults = [];

  for (let i = 0; i < missingSeedIds.length; i++) {
    const seedId = missingSeedIds[i];
    const seedNum = seeds[i];

    const workerPrompt = `# Phase 1 Gap-Fill Worker: ${seedId}

Course: ${courseCode}
Target: ${getLanguageName(target)} (${target})
Known: ${getLanguageName(known)} (${known})

---

## YOUR TASK: Process ONE seed (${seedId})

## STEP 1: FETCH ZUT EXAMPLES (language-specific)

curl -s "${orchestratorUrl}/api/zut-examples/${known}/${target}"

This shows what FAILS and PASSES ZUT for ${getLanguageName(known)} → ${getLanguageName(target)}.

## STEP 2: FETCH METHODOLOGY

curl -s "${orchestratorUrl}/api/phase-intelligence/1"

## STEP 3: FETCH LANGUAGE BRIEF (critical for ${getLanguageName(target)}!)

curl -s "${orchestratorUrl}/api/language-brief/${known}/${target}"

This contains language-specific intelligence: tonal systems, script considerations,
common translation pitfalls, and chunking guidance for ${getLanguageName(target)}.

Read ALL THREE responses before proceeding.

## STEP 4: FETCH YOUR SEED

curl -s "${orchestratorUrl}/api/canonical-seeds?start=${seedNum}&end=${seedNum}"

## STEP 5: PROCESS THE SEED

${known === 'eng'
  ? `Since Known = English: The English canonical text IS your "known" text.
Translate to ${getLanguageName(target)} (target).`
  : `Since Known = ${getLanguageName(known)}: First translate the English canonical to ${getLanguageName(known)}.
Then translate that ${getLanguageName(known)} text to ${getLanguageName(target)} (target).`}

Apply methodology from Step 2. Extract LEGOs.

## STEP 6: UPLOAD YOUR RESULT

POST your completed seed to database:

curl -X POST "https://popty.app/api/seeds/upload" \\
  -H "Content-Type: application/json" \\
  -d '{"course":"${courseCode}","seeds":[YOUR_SEED_JSON]}'

**OUTPUT FORMAT (v6 Compact):**
\`\`\`json
{"course":"${courseCode}","seeds":[{
  "s": "${seedId}",
  "k": "known text",
  "t": "target text",
  "l": [
    {"y": "A", "n": 1, "k": "word", "t": "palabra"},
    {"y": "M", "n": 1, "k": "phrase", "t": "frase", "c": [{"k": "sub", "t": "sub"}]}
  ]
}]}
\`\`\`
Keys: s=seed_id, k=known, t=target, l=legos, y=type(A/M), n=new(1/0), c=components

---

**IMPORTANT: Use curl for all HTTP requests, NOT WebFetch!**
`;

    const browserId = `browser-gapfill-single-${i + 1}`;

    // Report browser:spawning event (single-seed gap-fill uses one browser per seed)
    reportEvent(courseCode, {
      event: 'browser:spawning',
      browserId,
      assignedSeeds: [seedId],
      mode: 'gap-fill-single'
    });

    try {
      await spawnClaudeWebAgent(workerPrompt, i + 1, 'safari');
      launchResults.push({ seed: seedId, status: 'launched' });
      console.log(`[Phase 1]   ✅ Gap-fill worker for ${seedId} launched`);

      // Report browser:ready event
      reportEvent(courseCode, {
        event: 'browser:ready',
        browserId,
        seedId,
        mode: 'gap-fill-single'
      });

      // Delay between launches to avoid clipboard race
      if (i < missingSeedIds.length - 1) {
        await new Promise(r => setTimeout(r, 8000));
      }
    } catch (err) {
      launchResults.push({ seed: seedId, status: 'failed', error: err.message });
      console.error(`[Phase 1]   ❌ Gap-fill worker for ${seedId} failed: ${err.message}`);

      // Report browser:failed event
      reportEvent(courseCode, {
        event: 'browser:failed',
        browserId,
        seedId,
        mode: 'gap-fill-single',
        error: err.message
      });
    }
  }

  console.log(`[Phase 1] Gap-fill complete: ${launchResults.filter(r => r.status === 'launched').length}/${missingSeedIds.length} workers launched`);

  res.json({
    success: true,
    message: `Gap-fill launched for ${missingSeedIds.length} missing seeds`,
    courseCode,
    seeds: missingSeedIds,
    launchResults
  });
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
    vfsRoot: VFS_ROOT,
    activeJobs: activeJobs.size,
    watchers: watchers.size
  });
});

// =============================================================================
// CANCEL ENDPOINTS - Clear stale jobs
// =============================================================================

/**
 * POST /api/phase1/:courseCode/cancel
 * Cancel active job for a specific course
 */
app.post('/api/phase1/:courseCode/cancel', (req, res) => {
  const { courseCode } = req.params;

  if (activeJobs.has(courseCode)) {
    activeJobs.delete(courseCode);
    console.log(`[Phase 1] ❌ Cancelled job for ${courseCode}`);
    res.json({ success: true, message: `Cancelled job for ${courseCode}` });
  } else if (activeJobs.has(courseCode + '_gapfill')) {
    activeJobs.delete(courseCode + '_gapfill');
    console.log(`[Phase 1] ❌ Cancelled gap-fill job for ${courseCode}`);
    res.json({ success: true, message: `Cancelled gap-fill job for ${courseCode}` });
  } else {
    res.json({ success: false, message: `No active job for ${courseCode}` });
  }
});

/**
 * POST /api/phase1/cancel-all
 * Cancel ALL active jobs (nuclear option)
 */
app.post('/api/phase1/cancel-all', (req, res) => {
  const count = activeJobs.size;
  const jobs = [...activeJobs.keys()];
  activeJobs.clear();
  console.log(`[Phase 1] ❌ Cancelled ALL ${count} jobs: ${jobs.join(', ')}`);
  res.json({ success: true, cancelled: count, jobs });
});

/**
 * GET /api/phase1/jobs
 * List all active jobs
 */
app.get('/api/phase1/jobs', (req, res) => {
  const jobs = [...activeJobs.entries()].map(([key, job]) => ({
    courseCode: key,
    status: job.status,
    startTime: job.startTime,
    masters: job.masters,
    mastersComplete: job.mastersComplete
  }));
  res.json({ activeJobs: jobs.length, jobs });
});

// =============================================================================
// QUEUE POLLER - Process uploads from raw_seed_uploads table
// =============================================================================

/**
 * Process a single pending upload from the queue
 * Uses the same logic as upload-batch endpoint
 */
async function processQueueItem(item) {
  const { id, course_code: courseCode, payload, agent_id: agentId } = item;

  // Mark as processing
  await supabase
    .from('raw_seed_uploads')
    .update({ status: 'processing', processed_by: `phase1-${PORT}` })
    .eq('id', id);

  try {
    // Payload can be a single seed or array of seeds
    let batchData = Array.isArray(payload) ? payload : [payload];

    // Detect and expand compact formats
    const isV7Hybrid = batchData.length > 0 && Array.isArray(batchData[0]);
    const isV6Compact = batchData.length > 0 && batchData[0].s && !batchData[0].seed_id;

    if (isV7Hybrid || isV6Compact) {
      console.log(`[Queue] 📦 Expanding compact format (${batchData.length} seeds)`);
      batchData = expandCompactFormat(batchData);
    }

    // Save to local JSON (dual-write for backwards compatibility)
    const courseDir = path.join(VFS_ROOT, courseCode);
    const batchesDir = path.join(courseDir, 'phase1_batches');
    await fs.ensureDir(batchesDir);

    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const batchFile = `batch_${Date.now()}_${randomSuffix}_${batchData.length}seeds.json`;
    await fs.writeJson(path.join(batchesDir, batchFile), batchData, { spaces: 2 });

    console.log(`[Queue] ✅ Saved batch: ${batchData.length} seeds → ${batchFile}`);

    // Extract seed IDs
    const seedIds = batchData.map(seed => seed.seed_id).filter(Boolean);

    // Report batch:received event
    reportEvent(courseCode, {
      event: 'batch:received',
      seedIds,
      agentId: agentId || 'queue',
      batchFile,
      seedCount: batchData.length,
      source: 'queue'
    });

    // Report seed:complete events
    for (const seedId of seedIds) {
      reportEvent(courseCode, {
        event: 'seed:complete',
        seedId,
        agentId: agentId || 'queue',
        source: 'queue'
      });
    }

    // DATABASE-FIRST: Write to Supabase
    let dbStats = { seeds: 0, legos: 0, components: 0 };
    if (courseDataService.USE_DATABASE_WRITES) {
      await courseDataService.ensureCourse(courseCode);

      for (const seedData of batchData) {
        const result = await courseDataService.importSeedWithLegos(courseCode, seedData);
        if (result) {
          dbStats.seeds++;
          dbStats.legos += result.legoCount || 0;
          dbStats.components += result.componentCount || 0;
        }
      }
      console.log(`[Queue] 💾 Database write: ${dbStats.seeds} seeds, ${dbStats.legos} legos`);
    }

    // Mark as completed
    await supabase
      .from('raw_seed_uploads')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', id);

    return { success: true, seedIds, dbStats };

  } catch (error) {
    console.error(`[Queue] ❌ Error processing item ${id}:`, error.message);

    // Mark as failed
    await supabase
      .from('raw_seed_uploads')
      .update({
        status: 'failed',
        error: error.message,
        processed_at: new Date().toISOString()
      })
      .eq('id', id);

    return { success: false, error: error.message };
  }
}

/**
 * Poll the queue for pending uploads
 */
async function pollQueue() {
  if (!supabase) {
    console.warn('[Queue] ⚠️  Supabase not configured, queue polling disabled');
    return;
  }

  if (queuePollerActive) return; // Prevent concurrent polling
  queuePollerActive = true;

  try {
    // Fetch pending items (oldest first)
    const { data: pending, error } = await supabase
      .from('raw_seed_uploads')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10); // Process up to 10 at a time

    if (error) {
      console.error('[Queue] ❌ Error fetching pending items:', error.message);
      return;
    }

    if (pending && pending.length > 0) {
      console.log(`[Queue] 📬 Found ${pending.length} pending uploads`);

      for (const item of pending) {
        await processQueueItem(item);
      }
    }

  } catch (error) {
    console.error('[Queue] ❌ Poll error:', error.message);
  } finally {
    queuePollerActive = false;
  }
}

/**
 * Start the queue poller
 */
function startQueuePoller() {
  if (!supabase) {
    console.log('[Queue] ⚠️  Supabase not configured, queue polling disabled');
    return null;
  }

  console.log(`[Queue] 🔄 Starting queue poller (interval: ${QUEUE_POLL_INTERVAL}ms)`);

  // Initial poll
  pollQueue();

  // Set up interval
  return setInterval(pollQueue, QUEUE_POLL_INTERVAL);
}

// Queue poller interval reference
let queuePollerInterval = null;

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log('');
  console.log(`✅ ${SERVICE_NAME} listening on port ${PORT}`);
  console.log(`   VFS Root: ${VFS_ROOT}`);
  console.log(`   Orchestrator: ${ORCHESTRATOR_URL}`);

  // Start queue poller
  queuePollerInterval = startQueuePoller();

  console.log('');
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Phase 1 server...');

  // Stop queue poller
  if (queuePollerInterval) {
    console.log('  Stopping queue poller...');
    clearInterval(queuePollerInterval);
  }

  // Stop all watchers
  for (const [courseCode, watcher] of watchers.entries()) {
    console.log(`  Stopping watcher for ${courseCode}...`);
    if (watcher.interval) {
      clearInterval(watcher.interval);
    }
  }

  process.exit(0);
});
