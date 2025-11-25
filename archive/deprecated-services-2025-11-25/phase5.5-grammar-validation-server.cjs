#!/usr/bin/env node

/**
 * Phase 5.5: Grammar Validation Server
 *
 * Port: 3461
 *
 * Validates lego_baskets.json for grammar correctness.
 * Runs AFTER Phase 5 merge and GATE cleaning, BEFORE Phase 6.
 *
 * Architecture:
 * - Spawns 7 browser instances
 * - Each browser runs 20 parallel workers
 * - Total: 140 workers validating in parallel
 * - Each worker validates 5 seeds (~34 baskets)
 * - Workers DELETE phrases with grammar errors
 * - Tracks deletion statistics
 *
 * Why separate from Phase 5:
 * - Different objective (correctness vs generation)
 * - Works on cleaned data (after GATE violations removed)
 * - Re-runnable without regenerating baskets
 * - Fast validation on 3MB file (not 20MB manifest)
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');

const PORT = process.env.PORT || 3460;
const VFS_ROOT = process.env.VFS_ROOT;
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
const SERVICE_NAME = process.env.SERVICE_NAME || 'Phase 5.5 (Grammar Validation)';

if (!VFS_ROOT) {
  console.error('❌ Error: VFS_ROOT not set');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Active jobs tracking
const activeJobs = new Map();

/**
 * Load lego_baskets.json and chunk into batches for parallel validation
 */
async function prepareBatchesForValidation(courseDir) {
  const basketsPath = path.join(courseDir, 'lego_baskets.json');
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');

  if (!await fs.pathExists(basketsPath)) {
    throw new Error(`lego_baskets.json not found: ${basketsPath}`);
  }

  if (!await fs.pathExists(legoPairsPath)) {
    throw new Error(`lego_pairs.json not found: ${legoPairsPath}`);
  }

  const basketsData = await fs.readJson(basketsPath);
  const legoPairsData = await fs.readJson(legoPairsPath);

  const baskets = basketsData.baskets || {};
  const seeds = legoPairsData.seeds || [];

  console.log(`📊 Total baskets: ${Object.keys(baskets).length}`);
  console.log(`📊 Total seeds: ${seeds.length}`);

  // Group baskets by seed
  const basketsBySeed = {};
  for (const seed of seeds) {
    const seedId = seed.seed_id;
    basketsBySeed[seedId] = {
      seedId,
      seedText: seed.seed,
      legos: []
    };

    for (const lego of seed.legos || []) {
      const legoId = lego.id;
      if (baskets[legoId]) {
        basketsBySeed[seedId].legos.push({
          legoId,
          lego: lego.lego,
          basket: baskets[legoId]
        });
      }
    }
  }

  // Remove empty seeds
  const nonEmptySeeds = Object.values(basketsBySeed).filter(s => s.legos.length > 0);

  console.log(`📊 Seeds with baskets: ${nonEmptySeeds.length}`);

  // Chunk seeds into batches
  // 15 browsers × 15 workers = 225 workers
  // Each worker handles 3 seeds
  // Total capacity: 225 × 3 = 675 seeds
  const totalWorkers = 225;
  const seedsPerWorker = 3;
  const totalSeeds = nonEmptySeeds.length;

  const batches = [];
  for (let i = 0; i < totalSeeds; i += seedsPerWorker) {
    batches.push(nonEmptySeeds.slice(i, i + seedsPerWorker));
  }

  console.log(`📦 Created ${batches.length} batches (${seedsPerWorker} seeds each)`);
  console.log(`📦 Total capacity: ${totalWorkers} workers × ${seedsPerWorker} seeds = ${totalWorkers * seedsPerWorker} seeds`);

  return {
    batches,
    totalSeeds: nonEmptySeeds.length,
    totalBaskets: Object.keys(baskets).length
  };
}

/**
 * POST /start
 * Start grammar validation for a course
 */
app.post('/start', async (req, res) => {
  const { courseCode } = req.body;

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode is required' });
  }

  if (activeJobs.has(courseCode)) {
    return res.status(409).json({
      error: `Grammar validation already running for ${courseCode}`,
      status: activeJobs.get(courseCode)
    });
  }

  console.log(`[Phase 5.5] Starting grammar validation for ${courseCode}`);

  const courseDir = path.join(VFS_ROOT, courseCode);

  // Create job state
  const job = {
    courseCode,
    status: 'preparing',
    startedAt: new Date().toISOString(),
    error: null,
    stats: {
      totalSeeds: 0,
      totalBaskets: 0,
      totalPhrases: 0,
      phrasesDeleted: 0,
      phrasesKept: 0,
      workersCompleted: 0,
      workersTotal: 0
    }
  };

  activeJobs.set(courseCode, job);

  // Run validation asynchronously
  (async () => {
    try {
      // Prepare batches
      const { batches, totalSeeds, totalBaskets } = await prepareBatchesForValidation(courseDir);

      job.stats.totalSeeds = totalSeeds;
      job.stats.totalBaskets = totalBaskets;
      job.stats.workersTotal = batches.length;

      // Spawn browsers and workers
      job.status = 'spawning';

      const BROWSERS = 15;
      const WORKERS_PER_BROWSER = 15;
      const SEEDS_PER_WORKER = 3;
      const batchesPerBrowser = Math.ceil(batches.length / BROWSERS);

      console.log(`[Phase 5.5] Spawning ${BROWSERS} browsers × ${WORKERS_PER_BROWSER} workers × ${SEEDS_PER_WORKER} seeds`);
      console.log(`[Phase 5.5] Total capacity: ${BROWSERS * WORKERS_PER_BROWSER * SEEDS_PER_WORKER} seeds (${totalSeeds} actual)`);

      // Create browser groups
      const browserGroups = [];
      for (let i = 0; i < BROWSERS; i++) {
        const startIdx = i * batchesPerBrowser;
        const endIdx = Math.min((i + 1) * batchesPerBrowser, batches.length);
        const browserBatches = batches.slice(startIdx, endIdx);

        if (browserBatches.length > 0) {
          browserGroups.push({
            name: `Grammar-Browser-${String(i + 1).padStart(2, '0')}`,
            batches: browserBatches,
            workersToSpawn: Math.min(WORKERS_PER_BROWSER, browserBatches.length)
          });
        }
      }

      // Spawn each browser
      for (const browser of browserGroups) {
        const prompt = await generateGrammarValidationPrompt(courseCode, browser);

        console.log(`[Phase 5.5] Launching ${browser.name}: ${browser.batches.length} batches → ${browser.workersToSpawn} workers`);

        try {
          await spawnClaudeCodeSession(prompt, browser.name);
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3s delay between browsers
        } catch (error) {
          console.error(`[Phase 5.5] ⚠️  Failed to launch ${browser.name}:`, error.message);
        }
      }

      job.status = 'validating';
      console.log(`[Phase 5.5] ✅ All browsers launched, workers validating...`);

      console.log(`[Phase 5.5] ✅ Grammar validation completed for ${courseCode}`);

      // Notify orchestrator
      if (ORCHESTRATOR_URL) {
        try {
          await fetch(`${ORCHESTRATOR_URL}/phase-complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phase: 'phase5.5',
              courseCode,
              success: true,
              stats: job.stats
            })
          });
        } catch (err) {
          console.error(`[Phase 5.5] Failed to notify orchestrator:`, err.message);
        }
      }

      // Clean up after 5 minutes
      setTimeout(() => activeJobs.delete(courseCode), 5 * 60 * 1000);

    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date().toISOString();
      console.error(`[Phase 5.5] ❌ Grammar validation failed for ${courseCode}:`, error.message);

      // Clean up after 5 minutes
      setTimeout(() => activeJobs.delete(courseCode), 5 * 60 * 1000);
    }
  })();

  res.json({
    success: true,
    courseCode,
    message: `Grammar validation started for ${courseCode}`,
    status: job.status
  });
});

/**
 * POST /delete-phrase
 * Worker reports a phrase with grammar error to be deleted
 */
app.post('/delete-phrase', async (req, res) => {
  const { courseCode, legoId, phraseIndex } = req.body;

  if (!courseCode || !legoId || phraseIndex === undefined) {
    return res.status(400).json({ error: 'courseCode, legoId, and phraseIndex required' });
  }

  const job = activeJobs.get(courseCode);
  if (!job) {
    return res.status(404).json({ error: `No active job for ${courseCode}` });
  }

  try {
    const courseDir = path.join(VFS_ROOT, courseCode);
    const basketsPath = path.join(courseDir, 'lego_baskets.json');
    const basketsData = await fs.readJson(basketsPath);

    const basket = basketsData.baskets[legoId];
    if (!basket || !basket.practice_phrases) {
      return res.status(404).json({ error: `Basket ${legoId} not found` });
    }

    // Delete phrase
    if (phraseIndex >= 0 && phraseIndex < basket.practice_phrases.length) {
      basket.practice_phrases.splice(phraseIndex, 1);
      job.stats.phrasesDeleted++;

      // Write back
      await fs.writeJson(basketsPath, basketsData, { spaces: 2 });

      console.log(`[Phase 5.5] 🗑️  Deleted phrase ${phraseIndex} from ${legoId}`);

      res.json({ success: true, deleted: true });
    } else {
      res.status(400).json({ error: 'Invalid phraseIndex' });
    }

  } catch (error) {
    console.error(`[Phase 5.5] ❌ Error deleting phrase:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /worker-complete
 * Worker reports completion
 */
app.post('/worker-complete', async (req, res) => {
  const { courseCode, workerId, stats } = req.body;

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode required' });
  }

  const job = activeJobs.get(courseCode);
  if (!job) {
    return res.status(404).json({ error: `No active job for ${courseCode}` });
  }

  job.stats.workersCompleted++;
  job.stats.phrasesKept += stats?.phrasesKept || 0;

  console.log(`[Phase 5.5] ✅ Worker ${workerId} completed (${job.stats.workersCompleted}/${job.stats.workersTotal})`);

  // Check if all workers done
  if (job.stats.workersCompleted >= job.stats.workersTotal) {
    job.status = 'completed';
    job.completedAt = new Date().toISOString();

    const deletionRate = job.stats.phrasesDeleted / (job.stats.phrasesDeleted + job.stats.phrasesKept);

    console.log(`[Phase 5.5] ✅ All workers completed`);
    console.log(`[Phase 5.5] 📊 Deleted: ${job.stats.phrasesDeleted} phrases`);
    console.log(`[Phase 5.5] 📊 Kept: ${job.stats.phrasesKept} phrases`);
    console.log(`[Phase 5.5] 📊 Deletion rate: ${(deletionRate * 100).toFixed(2)}%`);

    // Notify orchestrator
    if (ORCHESTRATOR_URL) {
      try {
        await fetch(`${ORCHESTRATOR_URL}/phase-complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phase: 'phase5.5',
            courseCode,
            success: deletionRate <= 0.20, // Fail if >20% deleted
            stats: job.stats
          })
        });
      } catch (err) {
        console.error(`[Phase 5.5] Failed to notify orchestrator:`, err.message);
      }
    }
  }

  res.json({ success: true });
});

/**
 * GET /status/:courseCode
 * Check validation status
 */
app.get('/status/:courseCode', (req, res) => {
  const { courseCode } = req.params;
  const job = activeJobs.get(courseCode);

  if (!job) {
    return res.status(404).json({ error: `No job found for ${courseCode}` });
  }

  res.json(job);
});

/**
 * GET /health
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    status: 'healthy',
    port: PORT,
    activeJobs: activeJobs.size
  });
});

/**
 * Generate prompt for grammar validation worker
 */
async function generateGrammarValidationPrompt(courseCode, browser) {
  const serverUrl = `http://localhost:${PORT}`;

  const batchData = JSON.stringify(browser.batches, null, 2);

  return `# Grammar Validation Task

**Course:** \`${courseCode}\`
**Browser:** ${browser.name}
**Total seeds:** ${browser.batches.flatMap(b => b).length} seeds
**Workers to spawn:** ${browser.workersToSpawn} (15 workers)
**Seeds per worker:** 3 seeds

---

## Your Job

1. ✅ **Spawn ${browser.workersToSpawn} workers** - Use Task tool ${browser.workersToSpawn} times in ONE message (parallel!)
2. ✅ **Each worker validates 3 seeds** - Check all practice phrases for grammatical errors
3. ✅ **Delete incorrect phrases** - POST to server to remove grammatically wrong phrases
4. ✅ **Report completion** - Brief summary when done

**Architecture:** 15 browsers × 15 workers × 3 seeds = 675 seed capacity

---

## Worker Instructions

Each worker validates **3 seeds** (assigned from JSON below):

1. **Read your 3 assigned seeds** from the JSON data
2. **For each LEGO in each seed, validate all practice phrases**:
   - Check known language (English) grammar
   - Check target language (Spanish) grammar
   - Look for obvious errors (wrong verb forms, missing articles, agreement, etc.)
3. **DELETE phrases with errors** via:
   \`\`\`
   POST ${serverUrl}/delete-phrase
   { "courseCode": "${courseCode}", "legoId": "S0101L01", "phraseIndex": 3 }
   \`\`\`
4. **Report completion** via:
   \`\`\`
   POST ${serverUrl}/worker-complete
   { "courseCode": "${courseCode}", "workerId": "worker-X", "stats": { "phrasesKept": 245 } }
   \`\`\`

---

## Batch Data

\`\`\`json
${batchData}
\`\`\`

---

## Important Notes

- Work SILENTLY - no verbose logging
- Be strict on grammar - delete anything questionable
- Track how many phrases you keep (for stats)
- Report when done

---

**Report:** "✅ ${browser.name} complete: ${browser.workersToSpawn} workers validated grammar"
`;
}

/**
 * Spawn Claude Code session via osascript
 */
async function spawnClaudeCodeSession(prompt, windowTitle) {
  const { spawn } = require('child_process');

  // Copy prompt to clipboard using pbcopy
  await new Promise((resolve, reject) => {
    const pbcopy = spawn('pbcopy', [], { stdio: ['pipe', 'inherit', 'inherit'] });
    pbcopy.stdin.write(prompt);
    pbcopy.stdin.end();
    pbcopy.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pbcopy failed with code ${code}`));
    });
  });

  // Use Safari
  const browser = 'Safari';
  const appleScript = `
tell application "${browser}"
    activate

    -- Open new tab with claude.ai/code
    tell window 1
        set newTab to make new tab with properties {URL:"https://claude.ai/code"}
        set current tab to newTab
    end tell

    -- Wait for page to load
    delay 3

    -- Paste prompt and submit
    tell application "System Events"
        keystroke "v" using command down
        delay 0.5
        keystroke return
    end tell
end tell

return "success"
  `.trim();

  return new Promise((resolve, reject) => {
    const child = spawn('osascript', ['-e', appleScript], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => stdout += data.toString());
    child.stderr.on('data', (data) => stderr += data.toString());

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`osascript failed: ${stderr}`));
      }
    });
  });
}

app.listen(PORT, () => {
  console.log(`✅ ${SERVICE_NAME} listening on port ${PORT}`);
});
