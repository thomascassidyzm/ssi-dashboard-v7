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
  regenerationJobs: new Map(), // jobId -> { status, courseCode, seedIds, startTime, results }
  promptVersions: new Map(), // courseCode -> version history
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
// QUALITY & REGENERATION HELPERS
// =============================================================================

/**
 * Calculate quality score for a translation based on various factors
 */
function calculateQualityScore(translation, legos = []) {
  const scores = {
    iron_rule_compliance: 100,
    lego_count: 0,
    avg_lego_quality: 0,
    issues: []
  };

  // Check LEGOs for IRON RULE violations
  const prepositions = ['to', 'from', 'with', 'at', 'in', 'on', 'by', 'for', 'of', 'about'];
  let violationCount = 0;

  for (const lego of legos) {
    const words = lego.text.toLowerCase().split(/\s+/);
    const firstWord = words[0];
    const lastWord = words[words.length - 1];

    if (prepositions.includes(firstWord) || prepositions.includes(lastWord)) {
      violationCount++;
      scores.issues.push({
        type: 'iron_rule_violation',
        lego: lego.text,
        position: lego.provenance
      });
    }
  }

  if (violationCount > 0) {
    scores.iron_rule_compliance = Math.max(0, 100 - (violationCount * 20));
  }

  // Calculate LEGO quality metrics
  scores.lego_count = legos.length;
  if (legos.length > 0) {
    const avgPedScore = legos.reduce((sum, l) => sum + (l.pedagogical_score || 0), 0) / legos.length;
    scores.avg_lego_quality = Math.round(avgPedScore);
  }

  // Check for common issues
  if (legos.length < 2) {
    scores.issues.push({
      type: 'low_lego_count',
      message: 'Translation produced fewer than 2 LEGOs'
    });
  }

  // Calculate composite score
  const composite = Math.round(
    scores.iron_rule_compliance * 0.6 +
    Math.min(100, scores.lego_count * 10) * 0.2 +
    scores.avg_lego_quality * 0.2
  );

  return {
    composite_score: composite,
    details: scores,
    flagged: composite < 70 || scores.issues.length > 0
  };
}

/**
 * Get quality report for entire course
 */
async function getCourseQualityReport(courseCode) {
  const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);
  const translationsDir = path.join(courseDir, 'amino_acids', 'translations');
  const legosDir = path.join(courseDir, 'amino_acids', 'legos');

  if (!await fs.pathExists(translationsDir)) {
    throw new Error('Course not found or no translations available');
  }

  const report = {
    course_code: courseCode,
    generated_at: new Date().toISOString(),
    total_seeds: 0,
    flagged_seeds: [],
    quality_distribution: {
      excellent: 0,  // 90-100
      good: 0,       // 70-89
      poor: 0,       // 50-69
      critical: 0    // 0-49
    },
    avg_quality: 0,
    attempt_summary: {
      total_attempts: 0,
      avg_attempts_per_seed: 0,
      seeds_with_multiple_attempts: 0
    }
  };

  // Load all LEGOs for reference
  const allLegos = new Map();
  if (await fs.pathExists(legosDir)) {
    const legoFiles = await fs.readdir(legosDir);
    for (const file of legoFiles.filter(f => f.endsWith('.json'))) {
      const lego = await fs.readJson(path.join(legosDir, file));
      if (!allLegos.has(lego.source_translation_uuid)) {
        allLegos.set(lego.source_translation_uuid, []);
      }
      allLegos.get(lego.source_translation_uuid).push(lego);
    }
  }

  // Analyze each translation
  const translationFiles = await fs.readdir(translationsDir);
  let totalQuality = 0;

  for (const file of translationFiles.filter(f => f.endsWith('.json'))) {
    const translation = await fs.readJson(path.join(translationsDir, file));
    const legos = allLegos.get(translation.uuid) || [];

    const quality = calculateQualityScore(translation, legos);
    totalQuality += quality.composite_score;
    report.total_seeds++;

    // Track attempt history
    const attempts = translation.metadata?.attempt_history || [];
    report.attempt_summary.total_attempts += attempts.length + 1; // +1 for current
    if (attempts.length > 0) {
      report.attempt_summary.seeds_with_multiple_attempts++;
    }

    // Categorize by quality
    if (quality.composite_score >= 90) {
      report.quality_distribution.excellent++;
    } else if (quality.composite_score >= 70) {
      report.quality_distribution.good++;
    } else if (quality.composite_score >= 50) {
      report.quality_distribution.poor++;
    } else {
      report.quality_distribution.critical++;
    }

    // Flag problematic seeds
    if (quality.flagged) {
      report.flagged_seeds.push({
        seed_id: translation.seed_id,
        uuid: translation.uuid,
        quality_score: quality.composite_score,
        issues: quality.details.issues,
        attempts: attempts.length + 1,
        last_modified: translation.metadata?.updated_at || translation.metadata?.created_at
      });
    }
  }

  report.avg_quality = report.total_seeds > 0
    ? Math.round(totalQuality / report.total_seeds)
    : 0;

  report.attempt_summary.avg_attempts_per_seed = report.total_seeds > 0
    ? (report.attempt_summary.total_attempts / report.total_seeds).toFixed(2)
    : 0;

  // Sort flagged seeds by quality (worst first)
  report.flagged_seeds.sort((a, b) => a.quality_score - b.quality_score);

  return report;
}

/**
 * Get detailed review for specific SEED
 */
async function getSeedDetailedReview(courseCode, seedId) {
  const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);
  const translationsDir = path.join(courseDir, 'amino_acids', 'translations');
  const legosDir = path.join(courseDir, 'amino_acids', 'legos');

  // Find translation for this seed
  const translationFiles = await fs.readdir(translationsDir);
  let translation = null;

  for (const file of translationFiles.filter(f => f.endsWith('.json'))) {
    const data = await fs.readJson(path.join(translationsDir, file));
    if (data.seed_id === seedId) {
      translation = data;
      break;
    }
  }

  if (!translation) {
    throw new Error(`Seed ${seedId} not found`);
  }

  // Load associated LEGOs
  const legos = [];
  if (await fs.pathExists(legosDir)) {
    const legoFiles = await fs.readdir(legosDir);
    for (const file of legoFiles.filter(f => f.endsWith('.json'))) {
      const lego = await fs.readJson(path.join(legosDir, file));
      if (lego.source_translation_uuid === translation.uuid) {
        legos.push(lego);
      }
    }
  }

  // Calculate quality
  const quality = calculateQualityScore(translation, legos);

  // Get attempt history
  const attemptHistory = translation.metadata?.attempt_history || [];
  const allAttempts = [
    ...attemptHistory,
    {
      attempt_number: attemptHistory.length + 1,
      timestamp: translation.metadata?.updated_at || translation.metadata?.created_at,
      source: translation.source,
      target: translation.target,
      quality_score: quality.composite_score,
      lego_count: legos.length,
      status: 'current'
    }
  ];

  return {
    seed_id: seedId,
    translation,
    legos,
    quality,
    attempts: allAttempts,
    total_attempts: allAttempts.length,
    status: translation.metadata?.status || 'active'
  };
}

/**
 * Add attempt to translation history
 */
async function recordAttempt(courseCode, seedId, attemptData) {
  const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);
  const translationsDir = path.join(courseDir, 'amino_acids', 'translations');

  // Find translation
  const translationFiles = await fs.readdir(translationsDir);
  let translationPath = null;
  let translation = null;

  for (const file of translationFiles.filter(f => f.endsWith('.json'))) {
    const filePath = path.join(translationsDir, file);
    const data = await fs.readJson(filePath);
    if (data.seed_id === seedId) {
      translation = data;
      translationPath = filePath;
      break;
    }
  }

  if (!translation) {
    throw new Error(`Seed ${seedId} not found`);
  }

  // Initialize attempt history if needed
  if (!translation.metadata.attempt_history) {
    translation.metadata.attempt_history = [];
  }

  // Archive current state as previous attempt
  const currentAttempt = {
    attempt_number: translation.metadata.attempt_history.length + 1,
    timestamp: translation.metadata?.updated_at || translation.metadata?.created_at,
    source: translation.source,
    target: translation.target,
    quality_score: attemptData.previous_quality_score,
    lego_count: attemptData.previous_lego_count,
    issues: attemptData.issues || [],
    prompt_version: translation.metadata.prompt_version || 'v1.0'
  };

  translation.metadata.attempt_history.push(currentAttempt);

  // Update with new attempt
  translation.source = attemptData.source;
  translation.target = attemptData.target;
  translation.metadata.updated_at = new Date().toISOString();
  translation.metadata.prompt_version = attemptData.prompt_version || 'v1.0';
  translation.metadata.regeneration_reason = attemptData.reason;

  // Save updated translation
  await fs.writeJson(translationPath, translation, { spaces: 2 });

  return translation;
}

/**
 * Spawn regeneration agent for specific SEEDs
 */
async function spawnRegenerationAgent(courseCode, seedIds, options = {}) {
  const jobId = `regen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);

  console.log(`[Regen] Starting regeneration job ${jobId} for ${seedIds.length} seeds`);

  // Load current prompt version
  const promptVersion = options.prompt_version || 'v1.0';
  const reason = options.reason || 'manual_regeneration';

  // Create regeneration job
  const job = {
    jobId,
    courseCode,
    seedIds,
    status: 'in_progress',
    startTime: new Date(),
    reason,
    promptVersion,
    results: []
  };

  STATE.regenerationJobs.set(jobId, job);

  // Build regeneration prompt
  const seedList = seedIds.join(', ');
  const regenerationPrompt = `# Phase 1 Regeneration: Targeted Translation Re-extraction

## Task
Re-extract and improve translations for specific SEEDs that have been flagged for quality issues.

## Context
Course: ${courseCode}
Seeds to regenerate: ${seedList}
Reason: ${reason}
Prompt version: ${promptVersion}

## Your Mission
1. Load the specified seeds from the canonical seed corpus
2. Review the current translations and identify quality issues
3. Apply all 6 pedagogical heuristics with extra attention to:
   - IRON RULE compliance (no LEGOs starting/ending with prepositions)
   - Natural phrasing in the target language
   - Optimal LEGO extraction potential
4. Generate improved translations
5. Self-assess the quality of each new translation
6. Save attempt history in the translation amino acid metadata

## Quality Self-Assessment
For each translation, evaluate:
- IRON RULE compliance: Will this produce valid LEGOs?
- LEGO potential: Can this be split into 3+ useful teaching phrases?
- Naturalness: Does this sound like a native speaker?
- Issues: Any concerns or trade-offs made?

## Output Format
Update translation amino acids with:
- New source/target text
- Attempt history preserved in metadata.attempt_history
- Quality self-assessment in metadata.quality_notes
- Prompt version: ${promptVersion}

## Critical Rules
- NEVER lose attempt history - append to metadata.attempt_history
- Each attempt must include timestamp, quality score, and issues found
- Mark regeneration_reason in metadata
- Preserve original UUID (immutable identifier)

## Success Criteria
✓ All specified seeds regenerated
✓ Quality improvements documented
✓ Attempt history complete
✓ Ready for Phase 3 re-extraction (if needed)

Start with: ${courseDir}
`;

  // Spawn agent
  await spawnPhaseAgent('1-regen', regenerationPrompt, courseDir, courseCode);

  return job;
}

/**
 * Load or initialize prompt evolution log
 */
async function getPromptEvolution(courseCode) {
  const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);
  const evolutionFile = path.join(courseDir, 'prompt_evolution', 'evolution_log.json');

  await fs.ensureDir(path.join(courseDir, 'prompt_evolution'));

  if (await fs.pathExists(evolutionFile)) {
    return await fs.readJson(evolutionFile);
  }

  // Initialize new evolution log
  const evolution = {
    course_code: courseCode,
    created_at: new Date().toISOString(),
    versions: [
      {
        version: 'v1.0',
        created_at: new Date().toISOString(),
        rules: [
          'Apply 6 pedagogical heuristics',
          'IRON RULE: No LEGOs with preposition boundaries',
          'Prioritize naturalness over literal translation'
        ],
        success_rate: null,
        status: 'active'
      }
    ],
    learned_rules: [],
    experimental_rules: []
  };

  await fs.writeJson(evolutionFile, evolution, { spaces: 2 });
  return evolution;
}

/**
 * Add learned rule to prompt evolution
 */
async function addLearnedRule(courseCode, rule, testResults) {
  const evolution = await getPromptEvolution(courseCode);

  const learnedRule = {
    rule,
    discovered_at: new Date().toISOString(),
    test_results: testResults,
    success_rate: testResults.success_rate,
    status: testResults.success_rate >= 0.8 ? 'committed' : 'experimental',
    examples: testResults.examples || []
  };

  if (learnedRule.status === 'committed') {
    evolution.learned_rules.push(learnedRule);

    // Create new version with this rule
    const newVersion = {
      version: `v${evolution.versions.length + 1}.0`,
      created_at: new Date().toISOString(),
      rules: [
        ...evolution.versions[evolution.versions.length - 1].rules,
        rule
      ],
      parent_version: evolution.versions[evolution.versions.length - 1].version,
      success_rate: null,
      status: 'active'
    };
    evolution.versions.push(newVersion);
  } else {
    evolution.experimental_rules.push(learnedRule);
  }

  const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);
  const evolutionFile = path.join(courseDir, 'prompt_evolution', 'evolution_log.json');
  await fs.writeJson(evolutionFile, evolution, { spaces: 2 });

  return evolution;
}

// =============================================================================
// API ENDPOINTS
// =============================================================================

// --------------------------------------------------------------------------
// REGENERATION & QUALITY ENDPOINTS
// --------------------------------------------------------------------------

/**
 * GET /api/courses/:code/quality
 * Get quality report for course with flagged SEEDs and attempt history
 */
app.get('/api/courses/:code/quality', async (req, res) => {
  try {
    const { code } = req.params;
    const report = await getCourseQualityReport(code);
    res.json(report);
  } catch (error) {
    console.error('[API] Error generating quality report:', error);
    res.status(500).json({
      error: 'Failed to generate quality report',
      message: error.message
    });
  }
});

/**
 * GET /api/courses/:code/seeds/:seedId/review
 * Get detailed review for specific SEED with all attempts and quality scores
 */
app.get('/api/courses/:code/seeds/:seedId/review', async (req, res) => {
  try {
    const { code, seedId } = req.params;
    const review = await getSeedDetailedReview(code, seedId);
    res.json(review);
  } catch (error) {
    console.error('[API] Error getting seed review:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      error: 'Failed to get seed review',
      message: error.message
    });
  }
});

/**
 * POST /api/courses/:code/seeds/regenerate
 * Trigger re-run for specific SEED(s)
 * Body: { seed_ids: ["C0001", "C0012"], reason: "low_quality", prompt_version: "v1.0" }
 */
app.post('/api/courses/:code/seeds/regenerate', async (req, res) => {
  try {
    const { code } = req.params;
    const { seed_ids, reason, prompt_version } = req.body;

    if (!seed_ids || !Array.isArray(seed_ids) || seed_ids.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid seed_ids array'
      });
    }

    const job = await spawnRegenerationAgent(code, seed_ids, {
      reason: reason || 'manual_regeneration',
      prompt_version: prompt_version || 'v1.0'
    });

    res.json({
      success: true,
      message: `Regeneration job started for ${seed_ids.length} seeds`,
      job: {
        jobId: job.jobId,
        courseCode: job.courseCode,
        seedIds: job.seedIds,
        status: job.status,
        reason: job.reason,
        promptVersion: job.promptVersion
      }
    });
  } catch (error) {
    console.error('[API] Error starting regeneration:', error);
    res.status(500).json({
      error: 'Failed to start regeneration',
      message: error.message
    });
  }
});

/**
 * GET /api/courses/:code/regeneration/:jobId
 * Get status of regeneration job
 */
app.get('/api/courses/:code/regeneration/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const job = STATE.regenerationJobs.get(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Regeneration job not found',
        jobId
      });
    }

    res.json({
      job,
      elapsed: job.startTime ? Date.now() - job.startTime.getTime() : 0
    });
  } catch (error) {
    console.error('[API] Error getting regeneration status:', error);
    res.status(500).json({
      error: 'Failed to get regeneration status',
      message: error.message
    });
  }
});

/**
 * POST /api/courses/:code/seeds/:seedId/accept
 * Accept current extraction attempt and mark as reviewed
 */
app.post('/api/courses/:code/seeds/:seedId/accept', async (req, res) => {
  try {
    const { code, seedId } = req.params;
    const courseDir = path.join(CONFIG.VFS_ROOT, code);
    const translationsDir = path.join(courseDir, 'amino_acids', 'translations');

    // Find and update translation
    const translationFiles = await fs.readdir(translationsDir);
    let updated = false;

    for (const file of translationFiles.filter(f => f.endsWith('.json'))) {
      const filePath = path.join(translationsDir, file);
      const translation = await fs.readJson(filePath);

      if (translation.seed_id === seedId) {
        translation.metadata.status = 'accepted';
        translation.metadata.accepted_at = new Date().toISOString();
        translation.metadata.reviewed = true;
        await fs.writeJson(filePath, translation, { spaces: 2 });
        updated = true;

        res.json({
          success: true,
          message: `Seed ${seedId} marked as accepted`,
          translation
        });
        break;
      }
    }

    if (!updated) {
      res.status(404).json({
        error: 'Seed not found',
        seedId
      });
    }
  } catch (error) {
    console.error('[API] Error accepting seed:', error);
    res.status(500).json({
      error: 'Failed to accept seed',
      message: error.message
    });
  }
});

/**
 * DELETE /api/courses/:code/seeds/:seedId
 * Remove SEED from corpus (mark as excluded)
 */
app.delete('/api/courses/:code/seeds/:seedId', async (req, res) => {
  try {
    const { code, seedId } = req.params;
    const { reason } = req.body;
    const courseDir = path.join(CONFIG.VFS_ROOT, code);
    const translationsDir = path.join(courseDir, 'amino_acids', 'translations');

    // Find and update translation
    const translationFiles = await fs.readdir(translationsDir);
    let updated = false;

    for (const file of translationFiles.filter(f => f.endsWith('.json'))) {
      const filePath = path.join(translationsDir, file);
      const translation = await fs.readJson(filePath);

      if (translation.seed_id === seedId) {
        translation.metadata.status = 'excluded';
        translation.metadata.excluded_at = new Date().toISOString();
        translation.metadata.exclusion_reason = reason || 'manual_removal';
        await fs.writeJson(filePath, translation, { spaces: 2 });
        updated = true;

        // Update course metadata
        const metadataPath = path.join(courseDir, 'course_metadata.json');
        if (await fs.pathExists(metadataPath)) {
          const courseMetadata = await fs.readJson(metadataPath);
          if (!courseMetadata.excluded_seeds) {
            courseMetadata.excluded_seeds = [];
          }
          courseMetadata.excluded_seeds.push({
            seed_id: seedId,
            excluded_at: new Date().toISOString(),
            reason: reason || 'manual_removal'
          });
          await fs.writeJson(metadataPath, courseMetadata, { spaces: 2 });
        }

        res.json({
          success: true,
          message: `Seed ${seedId} marked as excluded`,
          translation
        });
        break;
      }
    }

    if (!updated) {
      res.status(404).json({
        error: 'Seed not found',
        seedId
      });
    }
  } catch (error) {
    console.error('[API] Error excluding seed:', error);
    res.status(500).json({
      error: 'Failed to exclude seed',
      message: error.message
    });
  }
});

/**
 * GET /api/courses/:code/prompt-evolution
 * Get prompt evolution data including learned rules and success rates
 */
app.get('/api/courses/:code/prompt-evolution', async (req, res) => {
  try {
    const { code } = req.params;
    const evolution = await getPromptEvolution(code);
    res.json(evolution);
  } catch (error) {
    console.error('[API] Error getting prompt evolution:', error);
    res.status(500).json({
      error: 'Failed to get prompt evolution',
      message: error.message
    });
  }
});

/**
 * POST /api/courses/:code/experimental-rules
 * Test experimental rule on subset of seeds
 * Body: { rule: "...", test_seed_ids: ["C0001", "C0002"], description: "..." }
 */
app.post('/api/courses/:code/experimental-rules', async (req, res) => {
  try {
    const { code } = req.params;
    const { rule, test_seed_ids, description } = req.body;

    if (!rule || !test_seed_ids || !Array.isArray(test_seed_ids)) {
      return res.status(400).json({
        error: 'Missing required fields: rule, test_seed_ids'
      });
    }

    // Get current evolution state
    const evolution = await getPromptEvolution(code);
    const currentVersion = evolution.versions[evolution.versions.length - 1];

    // Create experimental version
    const experimentalVersion = `v${evolution.versions.length + 1}.0-exp`;

    // Trigger test run with new rule
    const job = await spawnRegenerationAgent(code, test_seed_ids, {
      reason: `experimental_rule_test: ${description || rule}`,
      prompt_version: experimentalVersion,
      experimental_rule: rule
    });

    res.json({
      success: true,
      message: `Experimental rule test started on ${test_seed_ids.length} seeds`,
      experiment: {
        version: experimentalVersion,
        rule,
        description,
        test_seed_ids,
        jobId: job.jobId,
        base_version: currentVersion.version
      }
    });
  } catch (error) {
    console.error('[API] Error testing experimental rule:', error);
    res.status(500).json({
      error: 'Failed to test experimental rule',
      message: error.message
    });
  }
});

/**
 * POST /api/courses/:code/prompt-evolution/commit
 * Commit experimental rule to active prompt
 * Body: { rule: "...", test_results: { success_rate: 0.85, examples: [...] } }
 */
app.post('/api/courses/:code/prompt-evolution/commit', async (req, res) => {
  try {
    const { code } = req.params;
    const { rule, test_results } = req.body;

    if (!rule || !test_results || typeof test_results.success_rate !== 'number') {
      return res.status(400).json({
        error: 'Missing required fields: rule, test_results.success_rate'
      });
    }

    const evolution = await addLearnedRule(code, rule, test_results);

    res.json({
      success: true,
      message: test_results.success_rate >= 0.8
        ? 'Rule committed to active prompt'
        : 'Rule added as experimental (success rate < 80%)',
      evolution,
      new_version: evolution.versions[evolution.versions.length - 1]
    });
  } catch (error) {
    console.error('[API] Error committing rule:', error);
    res.status(500).json({
      error: 'Failed to commit rule',
      message: error.message
    });
  }
});

// --------------------------------------------------------------------------
// EXISTING ENDPOINTS
// --------------------------------------------------------------------------

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

/**
 * GET /api/courses
 * List all available courses
 */
app.get('/api/courses', async (req, res) => {
  try {
    const courseDirs = await fs.readdir(CONFIG.VFS_ROOT);
    const courses = [];

    for (const dir of courseDirs) {
      const coursePath = path.join(CONFIG.VFS_ROOT, dir);
      const stats = await fs.stat(coursePath);

      if (stats.isDirectory()) {
        const metadataPath = path.join(coursePath, 'course_metadata.json');

        if (await fs.pathExists(metadataPath)) {
          const metadata = await fs.readJson(metadataPath);
          courses.push(metadata);
        }
      }
    }

    res.json({ courses });
  } catch (error) {
    console.error('Error listing courses:', error);
    res.status(500).json({ error: 'Failed to list courses' });
  }
});

/**
 * GET /api/courses/:courseCode
 * Get detailed course information including amino acids
 */
app.get('/api/courses/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const coursePath = path.join(CONFIG.VFS_ROOT, courseCode);

    // Check if course exists
    if (!await fs.pathExists(coursePath)) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Load metadata
    const metadataPath = path.join(coursePath, 'course_metadata.json');
    const course = await fs.readJson(metadataPath);

    // Load translations
    const translationsDir = path.join(coursePath, 'amino_acids', 'translations');
    const translations = [];

    if (await fs.pathExists(translationsDir)) {
      const files = await fs.readdir(translationsDir);
      for (const file of files.slice(0, 100)) { // Limit to first 100 for performance
        if (file.endsWith('.json')) {
          const data = await fs.readJson(path.join(translationsDir, file));
          translations.push(data);
        }
      }
    }

    // Sort translations by seed_id
    translations.sort((a, b) => a.seed_id.localeCompare(b.seed_id));

    // Load deduplicated LEGOs
    const legosDir = path.join(coursePath, 'amino_acids', 'legos_deduplicated');
    const legos = [];

    if (await fs.pathExists(legosDir)) {
      const files = await fs.readdir(legosDir);
      for (const file of files.slice(0, 50)) { // Limit to first 50
        if (file.endsWith('.json')) {
          const data = await fs.readJson(path.join(legosDir, file));
          legos.push(data);
        }
      }
    }

    // Load baskets
    const basketsDir = path.join(coursePath, 'amino_acids', 'baskets');
    const baskets = [];

    if (await fs.pathExists(basketsDir)) {
      const files = await fs.readdir(basketsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await fs.readJson(path.join(basketsDir, file));
          baskets.push(data);
        }
      }
      baskets.sort((a, b) => a.basket_id - b.basket_id);
    }

    res.json({
      course,
      translations,
      legos,
      baskets
    });
  } catch (error) {
    console.error('Error loading course:', error);
    res.status(500).json({ error: 'Failed to load course' });
  }
});

/**
 * GET /api/courses/:courseCode/provenance/:seedId
 * Trace provenance for a specific seed
 */
app.get('/api/courses/:courseCode/provenance/:seedId', async (req, res) => {
  try {
    const { courseCode, seedId } = req.params;
    const coursePath = path.join(CONFIG.VFS_ROOT, courseCode);

    // Find translation for this seed
    const translationsDir = path.join(coursePath, 'amino_acids', 'translations');
    const translationFiles = await fs.readdir(translationsDir);

    let translation = null;
    for (const file of translationFiles) {
      const data = await fs.readJson(path.join(translationsDir, file));
      if (data.seed_id === seedId) {
        translation = data;
        break;
      }
    }

    if (!translation) {
      return res.status(404).json({ error: 'Seed not found' });
    }

    // Find all LEGOs from this translation
    const legosDir = path.join(coursePath, 'amino_acids', 'legos');
    const legoFiles = await fs.readdir(legosDir);
    const legos = [];

    for (const file of legoFiles) {
      const data = await fs.readJson(path.join(legosDir, file));
      if (data.source_translation_uuid === translation.uuid) {
        legos.push(data);
      }
    }

    // Find deduplicated LEGOs containing this seed
    const dedupeDir = path.join(coursePath, 'amino_acids', 'legos_deduplicated');
    const dedupeFiles = await fs.readdir(dedupeDir);
    const deduplicatedLEGOs = [];

    for (const file of dedupeFiles) {
      const data = await fs.readJson(path.join(dedupeDir, file));
      const hasOurSeed = data.provenance.some(p => p.source_seed_id === seedId);
      if (hasOurSeed) {
        deduplicatedLEGOs.push(data);
      }
    }

    // Find baskets containing these LEGOs
    const basketsDir = path.join(coursePath, 'amino_acids', 'baskets');
    const basketFiles = await fs.readdir(basketsDir);
    const affectedBaskets = [];

    const legoUUIDs = new Set(deduplicatedLEGOs.map(l => l.uuid));

    for (const file of basketFiles) {
      const basket = await fs.readJson(path.join(basketsDir, file));
      const containsOurLEGOs = basket.legos.some(l => legoUUIDs.has(l.uuid));
      if (containsOurLEGOs) {
        affectedBaskets.push(basket);
      }
    }

    res.json({
      legos: legos.length,
      deduplicated: deduplicatedLEGOs.length,
      baskets: affectedBaskets.length,
      details: {
        translation,
        legos,
        deduplicatedLEGOs,
        affectedBaskets
      }
    });
  } catch (error) {
    console.error('Error tracing provenance:', error);
    res.status(500).json({ error: 'Failed to trace provenance' });
  }
});

/**
 * PUT /api/courses/:courseCode/translations/:uuid
 * Update a translation and trigger regeneration
 */
app.put('/api/courses/:courseCode/translations/:uuid', async (req, res) => {
  try {
    const { courseCode, uuid } = req.params;
    const { source, target } = req.body;
    const coursePath = path.join(CONFIG.VFS_ROOT, courseCode);

    // Find translation file
    const translationPath = path.join(coursePath, 'amino_acids', 'translations', `${uuid}.json`);

    if (!await fs.pathExists(translationPath)) {
      return res.status(404).json({ error: 'Translation not found' });
    }

    // Load existing translation
    const translation = await fs.readJson(translationPath);

    // Update fields
    translation.source = source;
    translation.target = target;
    translation.metadata.updated_at = new Date().toISOString();
    translation.metadata.edited = true;

    // Save updated translation
    await fs.writeJson(translationPath, translation, { spaces: 2 });

    // Update course metadata to mark for regeneration
    const metadataPath = path.join(coursePath, 'course_metadata.json');
    const metadata = await fs.readJson(metadataPath);
    metadata.needs_regeneration = true;
    metadata.last_edit = {
      seed_id: translation.seed_id,
      timestamp: new Date().toISOString()
    };
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });

    res.json({
      success: true,
      message: 'Translation updated. Course marked for regeneration.',
      translation
    });
  } catch (error) {
    console.error('Error updating translation:', error);
    res.status(500).json({ error: 'Failed to update translation' });
  }
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
    console.log(`\nCore API Endpoints:`);
    console.log(`  POST http://localhost:${CONFIG.PORT}/api/courses/generate`);
    console.log(`  GET  http://localhost:${CONFIG.PORT}/api/courses`);
    console.log(`  GET  http://localhost:${CONFIG.PORT}/api/courses/:courseCode`);
    console.log(`  GET  http://localhost:${CONFIG.PORT}/api/courses/:courseCode/status`);
    console.log(`  GET  http://localhost:${CONFIG.PORT}/api/courses/:courseCode/provenance/:seedId`);
    console.log(`  GET  http://localhost:${CONFIG.PORT}/api/health`);
    console.log(`\nRegeneration & Quality Endpoints:`);
    console.log(`  GET    http://localhost:${CONFIG.PORT}/api/courses/:code/quality`);
    console.log(`  GET    http://localhost:${CONFIG.PORT}/api/courses/:code/seeds/:seedId/review`);
    console.log(`  POST   http://localhost:${CONFIG.PORT}/api/courses/:code/seeds/regenerate`);
    console.log(`  GET    http://localhost:${CONFIG.PORT}/api/courses/:code/regeneration/:jobId`);
    console.log(`  POST   http://localhost:${CONFIG.PORT}/api/courses/:code/seeds/:seedId/accept`);
    console.log(`  DELETE http://localhost:${CONFIG.PORT}/api/courses/:code/seeds/:seedId`);
    console.log(`\nPrompt Evolution Endpoints:`);
    console.log(`  GET  http://localhost:${CONFIG.PORT}/api/courses/:code/prompt-evolution`);
    console.log(`  POST http://localhost:${CONFIG.PORT}/api/courses/:code/experimental-rules`);
    console.log(`  POST http://localhost:${CONFIG.PORT}/api/courses/:code/prompt-evolution/commit`);
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
