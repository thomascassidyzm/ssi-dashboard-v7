#!/usr/bin/env node

/**
 * SSi Course Production - Automation Server v7.0
 *
 * Backend API server for the SSi Dashboard
 * - Receives requests from Vercel-hosted frontend via ngrok tunnel
 * - Orchestrates Claude Code agents via osascript
 * - Manages VFS (Virtual File System) for amino acid storage
 * - Handles background queues for audio and manifest generation
 *
 * Architecture: Dashboard → ngrok → automation_server → osascript → Claude Code
 *
 * Port: 3456
 * CORS: Enabled for Vercel domain
 * VFS: ./vfs/courses/
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  PORT: process.env.PORT || 3456,
  VFS_ROOT: path.join(__dirname, 'vfs', 'courses'),
  TRAINING_URL: 'https://ssi-dashboard-v7.vercel.app',

  // Background worker intervals
  VFS_MONITOR_INTERVAL: 2000,  // 2 seconds

  // Allowed CORS origins
  CORS_ORIGINS: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://ssi-dashboard-v7.vercel.app',
    /\.vercel\.app$/,  // Allow all Vercel preview deployments
  ]
};

// =============================================================================
// PHASE PROMPTS (from training pages)
// =============================================================================

const PHASE_PROMPTS = {
  '0': `# Phase 0: Corpus Pre-Analysis

## Task
Analyze the source corpus to generate intelligence data for pedagogical translation.

## Input
- Source corpus (574 canonical seed pairs)
- Located in: vfs/seeds/canonical_seeds.json

## Your Mission
1. Load and validate the canonical seed corpus
2. Perform linguistic analysis:
   - Calculate word frequency distributions
   - Identify high-frequency vocabulary and grammatical patterns
   - Assess translation complexity (cognates, false friends, structural challenges)
   - Map grammatical dependencies and prerequisite knowledge
3. Generate intelligence report with:
   - Frequency rankings for words and phrases
   - Complexity scores for each seed
   - Translation guidance notes (tricky structures, idioms, etc.)
   - Recommendations for Phase 1 heuristic application

## Output Format
Store results as JSON:
vfs/phase_outputs/phase_0_intelligence.json

Structure:
{
  "frequency_analysis": { ... },
  "complexity_scores": { ... },
  "translation_guidance": { ... },
  "recommendations": { ... }
}

## Important Notes
- DO NOT modify the source corpus - analysis only
- Focus on patterns that affect pedagogical decisions
- This intelligence informs Phase 1's 6 heuristics
- Consider learner perspective (what's easy/hard to learn)

## Success Criteria
✓ All 574 seeds analyzed
✓ Intelligence report generated
✓ Frequency rankings accurate
✓ Complexity assessments complete
✓ Ready for Phase 1 consumption`,

  '1': `# Phase 1: Pedagogical Translation

## Task
Apply 6 pedagogical heuristics to translate all 574 canonical seed pairs into optimized learning material.

## Input
- Canonical seeds: vfs/seeds/canonical_seeds.json
- Phase 0 intelligence: vfs/phase_outputs/phase_0_intelligence.json

## The 6 Pedagogical Heuristics
1. **Naturalness**: Target language should sound native, not transliterated
2. **Frequency**: Prefer high-frequency vocabulary and common structures
3. **Clarity**: Prioritize clear, unambiguous expressions over idiomatic complexity
4. **Brevity**: Shorter translations preferred when pedagogically equivalent
5. **Consistency**: Maintain consistent terminology across seeds
6. **Utility**: Maximize teaching value (versatile phrases, reusable structures)

## Your Mission
For each seed:
1. Apply all 6 heuristics to create pedagogically optimized translation
2. Generate deterministic UUID: hash(source + target + metadata)
3. Store as translation amino acid JSON:
   - UUID as filename
   - Content: { source, target, seed_id, heuristics_applied, metadata }
4. Save to: vfs/amino_acids/translations/{uuid}.json

## Critical Rules
- Translations are NOT literal - they are pedagogically optimized
- Each translation is an immutable amino acid component
- UUIDs are content-based (deterministic)
- Preserve seed_id for provenance tracking

## Example Translation
Seed S42: "I would like to go"
Literal: "Hoffwn i fynd"
Pedagogical: "Dw i eisiau mynd" (more natural, higher frequency, clearer for learners)

## Success Criteria
✓ All 574 seeds translated
✓ All 6 heuristics applied to each
✓ Deterministic UUIDs generated
✓ Amino acids stored in VFS
✓ Provenance preserved (seed_id in each amino acid)`,

  '2': `# Phase 2: Corpus Intelligence

## Task
Analyze translated corpus to determine FCFS (First-Can-First-Say) order and calculate utility scores.

## Input
- Translation amino acids: vfs/amino_acids/translations/*.json
- Phase 0 intelligence: vfs/phase_outputs/phase_0_intelligence.json

## Your Mission
1. **FCFS Mapping**: Determine chronological teaching order
   - Identify prerequisite knowledge (what must be learned first)
   - Map dependency chains (word A requires word B)
   - Establish natural learning progression

2. **Utility Scoring**: Calculate pedagogical value
   - Formula: Frequency × Versatility × Simplicity
   - Frequency: How often used in corpus
   - Versatility: How many contexts it appears in
   - Simplicity: How easy to learn/teach

3. **Generate Intelligence Report**:
   - FCFS rankings for all translations
   - Utility scores (0-100 scale)
   - Dependency maps
   - Teaching sequence recommendations

## Output Format
vfs/phase_outputs/phase_2_corpus_intelligence.json

{
  "fcfs_order": [ ... ],
  "utility_scores": { translation_uuid: score, ... },
  "dependencies": { ... },
  "recommendations": { ... }
}

## Critical Notes
- FCFS = "natural" chronological sequence
- Utility may override FCFS for high-value opportunities
- This data drives Phase 3 LEGO extraction algorithm

## Success Criteria
✓ FCFS order complete
✓ Utility scores calculated for all translations
✓ Dependency maps generated
✓ Ready for Phase 3 consumption`,

  '3': `# Phase 3: LEGO Extraction

## Task
Extract optimal teaching phrases (LEGOs) from translations, balancing FCFS vs Utility while enforcing the IRON RULE.

## Input
- Translation amino acids: vfs/amino_acids/translations/*.json
- Corpus intelligence: vfs/phase_outputs/phase_2_corpus_intelligence.json

## THE IRON RULE (ABSOLUTE)
**No LEGO begins or ends with a preposition.**
- Examples: ✗ "to the", ✗ "with me", ✗ "in"
- This is NON-NEGOTIABLE

## Your Mission
For each translation:
1. **Identify LEGO candidates** (potential teaching phrases)
2. **Apply IRON RULE filter** - reject any LEGO with preposition boundaries
3. **Balance FCFS vs Utility**:
   - FCFS: Chronological learning order (baseline)
   - Utility: Pedagogical value (may override FCFS for high-value LEGOs)
4. **Assign Provenance**: S{seed}L{position}
   - Example: S12L3 = Seed 12, LEGO position 3
5. **Generate deterministic UUID**: hash(lego_text + source_translation + position)
6. **Store as LEGO amino acid**: vfs/amino_acids/legos/{uuid}.json

## LEGO Amino Acid Structure
{
  "uuid": "...",
  "text": "the LEGO phrase",
  "provenance": "S12L3",
  "source_translation_uuid": "...",
  "fcfs_score": 85,
  "utility_score": 92,
  "metadata": { ... }
}

## Critical Rules
- IRON RULE is absolute
- Each LEGO is immutable (edits create NEW LEGOs)
- Provenance enables edit propagation
- Balance FCFS (chronological) vs Utility (pedagogical value)

## Success Criteria
✓ All translations processed
✓ IRON RULE enforced (zero preposition boundaries)
✓ Provenance assigned (S{seed}L{position})
✓ UUIDs deterministic
✓ LEGO amino acids stored in VFS`,

  '3.5': `# Phase 3.5: Graph Construction (NEW in v7.0)

## Task
Build directed graph of LEGO adjacency relationships to enable pattern-aware basket construction.

## Input
- LEGO amino acids: vfs/amino_acids/legos/*.json
- Translation amino acids: vfs/amino_acids/translations/*.json (for co-occurrence analysis)

## Your Mission
1. **Detect Adjacency Patterns**:
   - Scan source translations to find which LEGOs appear adjacent to each other
   - Example: In "Dw i eisiau mynd", LEGOs "Dw i" and "eisiau" are adjacent

2. **Build Directed Graph**:
   - Nodes: All LEGO amino acids
   - Edges: LEGO_A → LEGO_B (A precedes B in corpus)
   - Direction matters (A→B ≠ B→A)

3. **Calculate Edge Weights**:
   - Weight = co-occurrence frequency × pedagogical value
   - Higher weight = more important pattern to teach

4. **Validate Graph**:
   - Ensure graph is connected
   - Check for invalid cycles
   - Verify all LEGOs represented

5. **Export Graph Structure**:
   - Adjacency list format
   - Include edge weights
   - Store metadata (total nodes, edges, density)

## Output Format
vfs/phase_outputs/phase_3.5_lego_graph.json

{
  "nodes": [ ... ],
  "edges": [
    { "from": "uuid_A", "to": "uuid_B", "weight": 42 },
    ...
  ],
  "metadata": { ... }
}

## Critical Notes
- This is NEW in APML v7.0 - graph intelligence!
- Phase 5 uses this graph for pattern coverage optimization
- Edges represent legitimate LEGO sequence patterns
- Replaces old DEBUT/ETERNAL pattern logic

## Success Criteria
✓ All LEGO adjacencies mapped
✓ Directed edges created
✓ Edge weights calculated
✓ Graph validated (connected, no invalid cycles)
✓ Ready for Phase 5 consumption`,

  '4': `# Phase 4: Deduplication

## Task
Identify and merge duplicate LEGOs while preserving ALL provenance information.

## Input
- LEGO amino acids: vfs/amino_acids/legos/*.json

## Your Mission
1. **Detect Duplicates**:
   - Find LEGOs with identical text content
   - May have different UUIDs (different provenance)
   - Example: "Dw i" might appear from S1L1, S4L2, S12L3

2. **Merge Provenance**:
   - Combine all S{seed}L{position} labels
   - Example: Merge S1L1, S4L2, S12L3 → "S1L1, S4L2, S12L3"
   - NEVER lose any provenance information

3. **Recalculate UUID**:
   - Generate new deterministic UUID based on:
     - LEGO text
     - ALL merged provenance labels
     - Metadata

4. **Create Deduplicated Set**:
   - One LEGO per unique text
   - Complete provenance history preserved
   - Update graph references if needed

5. **Store Results**:
   - vfs/amino_acids/legos_deduplicated/*.json
   - Keep original LEGOs (immutable)
   - Deduplicated set is NEW amino acids

## Why This Matters
- Many LEGOs appear in multiple seeds
- Provenance enables edit propagation
- If seed S12 changes, we know which LEGOs to update
- Birth-parent history must NEVER be lost

## Output Structure
{
  "uuid": "new_deduplicated_uuid",
  "text": "the LEGO phrase",
  "provenance": ["S1L1", "S4L2", "S12L3"],
  "source_count": 3,
  "metadata": { ... }
}

## Success Criteria
✓ All duplicates identified
✓ Provenance fully merged (no data loss)
✓ New UUIDs generated
✓ Deduplicated set created
✓ Original LEGOs preserved (immutable)`,

  '5': `# Phase 5: Pattern-Aware Baskets

## Task
Construct learning baskets (lessons) optimized for graph edge coverage and pedagogical progression.

## Input
- Deduplicated LEGOs: vfs/amino_acids/legos_deduplicated/*.json
- LEGO graph: vfs/phase_outputs/phase_3.5_lego_graph.json
- Corpus intelligence: vfs/phase_outputs/phase_2_corpus_intelligence.json

## Your Mission
1. **Load Graph Intelligence**:
   - LEGO adjacency graph with edges and weights
   - This drives pattern coverage optimization

2. **Maximize Edge Coverage**:
   - Select LEGOs to expose DIVERSE patterns
   - Each basket should cover unique graph edges
   - Avoid redundant LEGO sequences across baskets
   - Goal: Learners experience maximum pattern variety

3. **Maintain Pedagogical Coherence**:
   - Follow FCFS chronological progression
   - Apply utility scoring for high-value sequences
   - Ensure smooth difficulty progression
   - Balance novelty with reinforcement

4. **Construct Basket Amino Acids**:
   - Each basket = collection of LEGO UUIDs (manifest)
   - Metadata: edge coverage stats, difficulty level, etc.
   - Deterministic UUID based on manifest content

5. **Store Results**:
   - vfs/amino_acids/baskets/{uuid}.json

## Basket Amino Acid Structure
{
  "uuid": "...",
  "lego_manifest": ["uuid1", "uuid2", ...],
  "edge_coverage": ["edge_A_B", "edge_C_D", ...],
  "fcfs_score": 78,
  "difficulty_level": "intermediate",
  "metadata": { ... }
}

## This Replaces OLD Logic
- OLD: DEBUT/ETERNAL pattern terminology
- NEW: Graph-driven edge coverage
- BETTER: Measurable pattern diversity

## Success Criteria
✓ All LEGOs assigned to baskets
✓ Maximum edge coverage per basket
✓ FCFS/utility balance maintained
✓ Basket amino acids created with manifests
✓ Ready for Phase 6 (introductions)`,

  '6': `# Phase 6: Introductions

## Task
Generate known-only introduction phrases for each basket to prime learners with zero unknowns.

## Input
- Basket amino acids: vfs/amino_acids/baskets/*.json
- Deduplicated LEGOs: vfs/amino_acids/legos_deduplicated/*.json

## Your Mission
For each basket:
1. **Identify Known LEGOs**:
   - Scan ALL previous baskets (baskets 1 to N-1)
   - Compile complete inventory of LEGOs learner has mastered
   - These are the ONLY LEGOs you can use

2. **Generate Introduction Phrases**:
   - Create warm-up phrases using ONLY known LEGOs
   - ZERO unknown vocabulary or structures
   - Goal: Activate prior knowledge, build confidence
   - Prepare learner for new basket content

3. **Validate Known-Only Rule**:
   - Double-check: NO new LEGOs in introductions
   - Every word/phrase must be from known set
   - Absolute rule - no exceptions

4. **Create Introduction Amino Acids**:
   - Deterministic UUID based on content + basket reference
   - Store: vfs/amino_acids/introductions/{uuid}.json

## Introduction Amino Acid Structure
{
  "uuid": "...",
  "basket_uuid": "...",
  "phrases": ["phrase1", "phrase2", ...],
  "known_legos_used": ["uuid1", "uuid2", ...],
  "validation": {
    "all_known": true,
    "unknown_count": 0
  }
}

## Why This Matters
- Reduces cognitive load before new learning
- Builds learner confidence (100% comprehension)
- Primes brain for new content
- Creates smooth entry point to each basket

## CRITICAL RULE
**ZERO unknown elements allowed in introductions.**
If you're unsure, DON'T use it.

## Success Criteria
✓ Introduction generated for each basket
✓ All LEGOs verified as "known" from previous baskets
✓ Zero unknown elements (validated)
✓ Introduction amino acids stored
✓ Course ready for final compilation`
};

// =============================================================================
// EXPRESS APP SETUP
// =============================================================================

const app = express();

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const isAllowed = CONFIG.CORS_ORIGINS.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// =============================================================================
// GLOBAL STATE
// =============================================================================

const STATE = {
  jobs: new Map(), // courseCode -> { status, phase, progress, startTime }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Ensures a course directory exists in VFS
 */
async function ensureCourseDirectory(courseCode) {
  const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);
  const aminoAcidsDir = path.join(courseDir, 'amino_acids');
  const proteinsDir = path.join(courseDir, 'proteins');
  const phaseOutputsDir = path.join(courseDir, 'phase_outputs');

  await fs.ensureDir(path.join(aminoAcidsDir, 'translations'));
  await fs.ensureDir(path.join(aminoAcidsDir, 'legos'));
  await fs.ensureDir(path.join(aminoAcidsDir, 'legos_deduplicated'));
  await fs.ensureDir(path.join(aminoAcidsDir, 'baskets'));
  await fs.ensureDir(path.join(aminoAcidsDir, 'introductions'));
  await fs.ensureDir(phaseOutputsDir);
  await fs.ensureDir(proteinsDir);

  return courseDir;
}

/**
 * Spawns a Claude Code agent via osascript
 */
async function spawnPhaseAgent(phase, prompt, courseDir, courseCode) {
  console.log(`[Agent] Spawning Phase ${phase} agent...`);

  const trainingURL = `${CONFIG.TRAINING_URL}/phase/${phase}`;

  // Create AppleScript to spawn new Terminal with Claude Code
  const appleScript = `
tell application "Terminal"
    activate
    set newTab to do script "cd ${courseDir} && echo '═══════════════════════════════════════════════════════' && echo 'SSi Course Production - Phase ${phase}' && echo '═══════════════════════════════════════════════════════' && echo 'Course: ${courseCode}' && echo 'Training: ${trainingURL}' && echo '' && echo 'PROMPT:' && cat <<'PROMPT_EOF'
${prompt}
PROMPT_EOF
"
end tell
  `.trim();

  try {
    await execAsync(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`);
    console.log(`[Agent] Phase ${phase} agent spawned successfully`);
  } catch (error) {
    console.error(`[Agent] Failed to spawn Phase ${phase} agent:`, error.message);
    throw error;
  }
}

/**
 * Orchestrates sequential phase execution
 */
async function cascadePhases(courseCode, params) {
  console.log(`[Cascade] Starting course generation: ${courseCode}`);

  const job = STATE.jobs.get(courseCode);
  const courseDir = await ensureCourseDirectory(courseCode);

  try {
    // Phase 0: Corpus Pre-Analysis
    job.phase = 'phase_0';
    job.progress = 0;
    await spawnPhaseAgent('0', PHASE_PROMPTS['0'], courseDir, courseCode);
    job.progress = 10;

    // Phase 1: Pedagogical Translation
    job.phase = 'phase_1';
    job.progress = 15;
    await spawnPhaseAgent('1', PHASE_PROMPTS['1'], courseDir, courseCode);
    job.progress = 30;

    // Phase 2: Corpus Intelligence
    job.phase = 'phase_2';
    job.progress = 35;
    await spawnPhaseAgent('2', PHASE_PROMPTS['2'], courseDir, courseCode);
    job.progress = 45;

    // Phase 3: LEGO Extraction
    job.phase = 'phase_3';
    job.progress = 50;
    await spawnPhaseAgent('3', PHASE_PROMPTS['3'], courseDir, courseCode);
    job.progress = 60;

    // Phase 3.5: Graph Construction
    job.phase = 'phase_3.5';
    job.progress = 65;
    await spawnPhaseAgent('3.5', PHASE_PROMPTS['3.5'], courseDir, courseCode);
    job.progress = 72;

    // Phase 4: Deduplication
    job.phase = 'phase_4';
    job.progress = 77;
    await spawnPhaseAgent('4', PHASE_PROMPTS['4'], courseDir, courseCode);
    job.progress = 83;

    // Phase 5: Pattern-Aware Baskets
    job.phase = 'phase_5';
    job.progress = 88;
    await spawnPhaseAgent('5', PHASE_PROMPTS['5'], courseDir, courseCode);
    job.progress = 93;

    // Phase 6: Introductions
    job.phase = 'phase_6';
    job.progress = 96;
    await spawnPhaseAgent('6', PHASE_PROMPTS['6'], courseDir, courseCode);
    job.progress = 99;

    // Compilation
    job.phase = 'compilation';
    job.progress = 100;
    await compileManifest(courseCode);

    // Complete
    job.status = 'completed';
    job.endTime = new Date();
    console.log(`[Cascade] Course generation complete: ${courseCode}`);

  } catch (error) {
    console.error(`[Cascade] Error generating course:`, error);
    job.status = 'failed';
    job.error = error.message;
  }
}

/**
 * Compiles amino acids into a course manifest
 */
async function compileManifest(courseCode) {
  console.log(`[Compile] Building manifest for ${courseCode}`);

  const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);
  const aminoAcidsDir = path.join(courseDir, 'amino_acids');
  const proteinsDir = path.join(courseDir, 'proteins');

  const manifest = {
    course_code: courseCode,
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    legos: [],
    baskets: [],
    graph: null
  };

  // Load deduplicated LEGOs (if exist)
  const legosDir = path.join(aminoAcidsDir, 'legos_deduplicated');
  if (await fs.pathExists(legosDir)) {
    const legoFiles = await fs.readdir(legosDir);
    for (const file of legoFiles.filter(f => f.endsWith('.json'))) {
      const lego = await fs.readJson(path.join(legosDir, file));
      manifest.legos.push(lego);
    }
  }

  // Load baskets (if exist)
  const basketsDir = path.join(aminoAcidsDir, 'baskets');
  if (await fs.pathExists(basketsDir)) {
    const basketFiles = await fs.readdir(basketsDir);
    for (const file of basketFiles.filter(f => f.endsWith('.json'))) {
      const basket = await fs.readJson(path.join(basketsDir, file));
      manifest.baskets.push(basket);
    }
  }

  // Load graph (if exists)
  const graphFile = path.join(courseDir, 'phase_outputs', 'phase_3.5_lego_graph.json');
  if (await fs.pathExists(graphFile)) {
    manifest.graph = await fs.readJson(graphFile);
  }

  // Save manifest
  await fs.writeJson(path.join(proteinsDir, 'manifest.json'), manifest, { spaces: 2 });
  console.log(`[Compile] Manifest saved`);
}

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '7.0.0',
    timestamp: new Date().toISOString(),
    vfs_root: CONFIG.VFS_ROOT,
    jobs_active: STATE.jobs.size
  });
});

/**
 * POST /api/courses/generate
 */
app.post('/api/courses/generate', async (req, res) => {
  const { target, known, seeds = 574 } = req.body;

  if (!target || !known) {
    return res.status(400).json({ error: 'Missing target or known language' });
  }

  const courseCode = `${target}_for_${known}_${seeds}seeds`;

  // Check if job already exists
  if (STATE.jobs.has(courseCode)) {
    const job = STATE.jobs.get(courseCode);
    if (job.status === 'in_progress') {
      return res.status(409).json({
        error: 'Course generation already in progress',
        courseCode,
        status: job
      });
    }
  }

  // Create new job
  const job = {
    courseCode,
    status: 'in_progress',
    phase: 'initializing',
    progress: 0,
    startTime: new Date(),
    params: { target, known, seeds }
  };

  STATE.jobs.set(courseCode, job);

  // Start cascade in background
  cascadePhases(courseCode, { target, known, seeds }).catch(err => {
    console.error(`[API] Cascade error:`, err);
  });

  res.json({
    success: true,
    courseCode,
    message: 'Course generation started',
    status: job
  });
});

/**
 * GET /api/courses/:courseCode/status
 */
app.get('/api/courses/:courseCode/status', (req, res) => {
  const { courseCode } = req.params;
  const job = STATE.jobs.get(courseCode);

  if (!job) {
    return res.status(404).json({
      error: 'Course not found',
      courseCode
    });
  }

  res.json({
    courseCode,
    ...job,
    elapsed: job.startTime ? Date.now() - job.startTime.getTime() : 0
  });
});

// =============================================================================
// SERVER START
// =============================================================================

async function startServer() {
  await fs.ensureDir(CONFIG.VFS_ROOT);

  app.listen(CONFIG.PORT, () => {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('SSi Course Production - Automation Server v7.0');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Status: RUNNING`);
    console.log(`Port: ${CONFIG.PORT}`);
    console.log(`VFS Root: ${CONFIG.VFS_ROOT}`);
    console.log(`Training Dashboard: ${CONFIG.TRAINING_URL}`);
    console.log(`\nAPI Endpoints:`);
    console.log(`  POST http://localhost:${CONFIG.PORT}/api/courses/generate`);
    console.log(`  GET  http://localhost:${CONFIG.PORT}/api/courses/:courseCode/status`);
    console.log(`  GET  http://localhost:${CONFIG.PORT}/api/health`);
    console.log(`\nNext Steps:`);
    console.log(`  1. Install ngrok: brew install ngrok`);
    console.log(`  2. Start tunnel: ngrok http ${CONFIG.PORT}`);
    console.log(`  3. Update dashboard API_BASE_URL with ngrok URL`);
    console.log('═══════════════════════════════════════════════════════════════\n');
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
