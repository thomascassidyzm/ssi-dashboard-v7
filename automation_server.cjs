#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv').config();

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
const Ajv = require('ajv');
const chokidar = require('chokidar');

const execAsync = promisify(exec);
const ajv = new Ajv({ allErrors: true });

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
// PHASE PROMPTS (loaded from docs/phase_intelligence/)
// =============================================================================

// Load phase intelligence from markdown files
const PHASE_PROMPTS = {};

// Phase intelligence files
const phaseIntelligenceFiles = {
  '1': 'docs/phase_intelligence/phase_1_seed_pairs.md',
  '3': 'docs/phase_intelligence/phase_3_lego_pairs.md',
  '5': 'docs/phase_intelligence/phase_5_lego_baskets.md',
  '5.5': 'docs/phase_intelligence/phase_5.5_basket_deduplication.md',
  '6': 'docs/phase_intelligence/phase_6_introductions.md',
  '7': 'docs/phase_intelligence/phase_7_compilation.md',
  '8': 'docs/phase_intelligence/phase_8_audio_generation.md'
};

// Load each phase intelligence file
for (const [phase, filePath] of Object.entries(phaseIntelligenceFiles)) {
  try {
    const fullPath = path.join(__dirname, filePath);
    const intelligence = fs.readFileSync(fullPath, 'utf-8');
    PHASE_PROMPTS[phase] = intelligence;
    console.log(`✅ Loaded Phase ${phase} intelligence from ${filePath}`);
  } catch (error) {
    console.error(`❌ Failed to load Phase ${phase} intelligence:`, error.message);
  }
}

console.log(`✅ Loaded ${Object.keys(PHASE_PROMPTS).length} phase prompts from docs/phase_intelligence/`);

// Note: Phase intelligence now loaded directly from markdown files
// To update: Edit the .md files in docs/phase_intelligence/ and restart automation server


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
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
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
 * Convert 3-letter language code to full language name
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
    'fin': 'Finnish'
  };
  return names[code.toLowerCase()] || code.toUpperCase();
}

/**
 * Ensures a course directory exists in VFS
 */
async function ensureCourseDirectory(courseCode) {
  const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);
  const phaseOutputsDir = path.join(courseDir, 'phase_outputs');

  // New simplified structure (APML v7.3+):
  // - translations.json (single file for all SEED_PAIRS)
  // - baskets.json (single file for all LEGO_BASKETS including LEGOs)
  // - phase_outputs/ (intermediate processing files)

  await fs.ensureDir(courseDir);
  await fs.ensureDir(phaseOutputsDir);

  return courseDir;
}

/**
 * Phase 1 Brief: Translation batch
 */
function generatePhase1Brief(courseCode, params, courseDir) {
  const { target, known, startSeed, endSeed, batchNum, totalBatches } = params;
  const seedRange = `S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')}`;

  return `# Phase 1: Pedagogical Translation (Batch ${batchNum}/${totalBatches})

**Course**: ${courseCode}
**Target Language**: ${target} (learning language)
**Known Language**: ${known} (learner's language)
**Seed Range**: ${seedRange} (${endSeed - startSeed + 1} seeds)
**Output**: ${courseDir}/seed_pairs.json

---

## Your Task

Translate seeds ${seedRange} following Phase 1 intelligence.

**Fetch Instructions**: GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/phase-intelligence/1

**Fetch Seeds**: GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/seeds?limit=${endSeed}
(Filter to seeds ${startSeed}-${endSeed})

---

## CRITICAL: {target} Placeholder Replacement

Canonical seeds use \`{target}\` as a placeholder. **ALWAYS replace it with the target language NAME:**

- Target language code: **${target}**
- Target language name: **${getLanguageName(target)}**

**Examples:**
- Canonical: "I want to speak {target} with you now."
- If target=spa: "I want to speak **Spanish** with you now."
- If target=ita: "I want to speak **Italian** with you now."
- If target=fra: "I want to speak **French** with you now."

**When known language is English:**
- Use canonical seed directly
- Replace \`{target}\` with **${getLanguageName(target)}**

**When target language is English:**
- Use canonical seed directly
- Replace \`{target}\` with **English**

---

## Output Format

Append to existing seed_pairs.json (or create if batch 1):

\`\`\`json
{
  "version": "7.7",
  "translations": {
    "S${String(startSeed).padStart(4, '0')}": ["target phrase", "known phrase"],
    "S${String(startSeed + 1).padStart(4, '0')}": ["target phrase", "known phrase"],
    ...
  }
}
\`\`\`

**CRITICAL**: If this is batch ${batchNum} > 1, READ existing seed_pairs.json and MERGE your translations (don't overwrite!)

---

## Success Criteria

✅ ${endSeed - startSeed + 1} translations completed
✅ Merged with existing seed_pairs.json (if not batch 1)
✅ Natural translations with cognate preference (seeds 1-100)
✅ Zero variation ("First Word Wins")

When done, report completion and stats.
`;
}

/**
 * Phase 3 Brief: LEGO Extraction batch
 */
function generatePhase3Brief(courseCode, params, courseDir) {
  const { target, known, startSeed, endSeed, batchNum, totalBatches } = params;
  const seedRange = `S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')}`;

  return `# Phase 3: LEGO Extraction (Batch ${batchNum}/${totalBatches})

**Course**: ${courseCode}
**Seed Range**: ${seedRange} (${endSeed - startSeed + 1} seeds)
**Input**: ${courseDir}/seed_pairs.json (filter to ${seedRange})
**Output**: ${courseDir}/lego_pairs.tmp.json (TEMPORARY - will be validated and renamed)

---

## Your Task

Extract LEGOs from seeds ${seedRange} following Phase 3 intelligence.

**Fetch Instructions**: GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/phase-intelligence/3

**Read seed_pairs.json** and filter to seeds ${startSeed}-${endSeed}.

---

## Output Format

Append to existing lego_pairs.tmp.json (or create if batch 1):

\`\`\`json
{
  "version": "7.7",
  "seeds": [
    ["S${String(startSeed).padStart(4, '0')}", ["target", "known"], [
      ["S${String(startSeed).padStart(4, '0')}L01", "B", "target", "known"],
      ["S${String(startSeed).padStart(4, '0')}L02", "C", "target", "known", [["part1", "literal"], ["part2", "literal"]]]
    ]],
    ...
  ]
}
\`\`\`

**CRITICAL**:
- If batch ${batchNum} > 1, READ existing lego_pairs.tmp.json and APPEND to seeds array
- Write to lego_pairs.tmp.json (TEMPORARY - Phase 3.5 validation will rename to final)
- Componentization: TWO elements [["targetPart", "literalKnown"], ...] - NO third element!
- Multi-word target phrases MUST be COMPOSITE with componentization

---

## Success Criteria

✅ LEGOs extracted for all ${endSeed - startSeed + 1} seeds
✅ Appended to existing lego_pairs.tmp.json (if not batch 1)
✅ COMPOSITE LEGOs with 2-element componentization arrays
✅ FD-compliant, TILING verified

When done, report completion and LEGO count.
NOTE: File will remain .tmp.json until Phase 3.5 validation passes.
`;
}

/**
 * Phase 5 Brief: Basket Generation batch (with validator feedback)
 */
function generatePhase5Brief(courseCode, params, courseDir, validatorOutput) {
  const { target, known, startSeed, endSeed, batchNum, totalBatches } = params;
  const seedRange = `S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')}`;

  let validatorSection = '';
  if (validatorOutput && batchNum > 1) {
    validatorSection = `
---

## VALIDATOR FEEDBACK FROM BATCH ${batchNum - 1}

**Pattern Coverage**: ${validatorOutput.patternDensity}%
**Missing Edges**: ${validatorOutput.missingEdges?.length || 0}
**Underused LEGOs**: ${validatorOutput.underusedLegos?.length || 0}

**CRITICAL**: Read completeness_report.json and pattern_coverage_report.json for full details.

**YOUR TASK**: 50% of eternal phrases MUST target identified gaps:
- Missing edges: Create phrases that combine underused LEGO pairs
- Underused LEGOs: Incorporate low-frequency LEGOs more often
- Pattern diversity: Maximize unique LEGO combinations

This is BATCH-AWARE SELF-HEALING - you're fixing previous batch's weaknesses!

`;
  }

  return `# Phase 5: Basket Generation (Batch ${batchNum}/${totalBatches}) 🧺

**Course**: ${courseCode}
**Seed Range**: ${seedRange} (generates ~${(endSeed - startSeed + 1) * 3} LEGOs)
**Input**: ${courseDir}/lego_pairs.json (filter to ${seedRange})
**Output**: ${courseDir}/lego_baskets.json
${validatorSection}
---

## Your Task

Generate practice baskets for LEGOs from seeds ${seedRange}.

**Fetch Instructions**: GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/phase-intelligence/5

**Read lego_pairs.json** and filter to LEGOs with IDs ${seedRange}Lxx.

---

## CRITICAL CONSTRAINTS

🚨 **USE LINGUISTIC JUDGMENT - DO NOT SCRIPT THIS!** 🚨

Phase 5 requires:
- Natural, grammatically perfect sentences in BOTH languages
- Pedagogical value (phrases learners would actually say)
- Creative variety (not random concatenation)

**NEVER**:
❌ Write a Python/JavaScript script to generate baskets
❌ Randomly concatenate LEGOs
❌ Generate phrases without checking grammar
❌ Create meaningless word salad like "con de no quiero"

**ALWAYS**:
✅ Think linguistically about each phrase
✅ Ensure perfect grammar in target AND known languages
✅ Create useful, natural sentences
✅ Verify ABSOLUTE GATE (LEGO N only uses LEGOs 1 to N-1)

---

## ABSOLUTE GATE: Verification Protocol (CRITICAL)

**The constraint**: A phrase at LEGO index N can ONLY use vocabulary from LEGOs 0 to N-1.

**Why this matters**: Learners at LEGO #50 have not yet learned LEGOs #51-275. Using unauthorized vocabulary breaks progressive revelation.

**How to verify EACH phrase**:

### STEP 1: Identify Current LEGO Index
- You are processing LEGOs sequentially from lego_pairs.json
- Track your position: "Currently at S0027L01 = global index 117"

### STEP 2: Build Allowed Vocabulary
- Read lego_pairs.json LEGOs with indices 0 to (current - 1)
- Extract all target words from these LEGOs
- Example at index 117: ["Quiero", "hablar", "español", "contigo", "ahora", "Estoy", "tratando", "de", "aprender", ...]

### STEP 3: Generate Candidate Phrase
- Write a natural, grammatical phrase in BOTH languages
- Example: ["Quiero hablar español", "I want to speak Spanish"]

### STEP 4: Verify Target Language Tiling
- Split target phrase into words: ["Quiero", "hablar", "español"]
- For EACH word, check if it exists in allowed vocabulary (LEGOs 0 to current-1)
- If ANY word is not in allowed vocabulary → DISCARD PHRASE, generate different one

### STEP 5: Verify Known Language Tiling (same process)
- Ensure known phrase also tiles with allowed LEGO translations

**Examples at S0027L01 (index 117)**:

✅ VALID:
- "Quiero hablar español contigo" | "I want to speak Spanish with you"
  - "Quiero" → S0001L01 [idx=0] ✅
  - "hablar" → S0001L02 [idx=1] ✅
  - "español" → S0001L03 [idx=2] ✅
  - "contigo" → S0001L04 [idx=3] ✅
  - All indices < 117 ✅

❌ INVALID:
- "No me gusta cuando estoy cansado" | "I don't like it when I'm tired"
  - "cansado" → S0039L04 [idx=175] ❌ (175 > 117)
  - VIOLATION: Uses LEGO not yet introduced
  - DISCARD and generate different phrase

❌ INVALID:
- "Quiero estar listo" | "I want to be ready"
  - "estar" → S0034L03 [idx=148] ❌ (148 > 117)
  - VIOLATION: Uses LEGO 31 positions ahead
  - DISCARD and generate different phrase

**Systematic checking**:
Before writing EACH phrase to lego_baskets.json:
1. Split into words
2. Lookup each word in lego_pairs.json
3. Check: word's LEGO index < current basket index?
4. If ANY word fails → discard phrase, try again

**This is non-negotiable**: A single unauthorized word makes the entire phrase invalid for learners.

---

## Output Format

${batchNum === 1 ? 'Create' : 'APPEND to existing'} lego_baskets.json:

\`\`\`json
{
  "version": "7.7",
  "baskets": {
    "S${String(startSeed).padStart(4, '0')}L01": {
      "lego": ["target", "known"],
      "e": [
        ["Natural target sentence", "Natural known sentence"],
        ...
      ],
      "d": {
        "2": [["2-word phrase", "translation"]],
        "3": [["3-word phrase", "translation"]],
        ...
      }
    },
    ...
  }
}
\`\`\`

**CRITICAL**: If batch ${batchNum} > 1, READ existing lego_baskets.json and MERGE baskets object (don't overwrite!)

---

## After Generation

Run validators (GATE compliance is MANDATORY):

\`\`\`bash
cd ${courseDir}

# GATE compliance (MUST PASS - no violations allowed)
node ../../../validators/validate-gate-compliance.cjs ${courseCode} --output ${courseDir}/gate_violations.json

# Pattern coverage metrics
node ../../../validators/analyze-pattern-coverage.cjs ${courseCode} --output ${courseDir}/pattern_coverage_report.json
node ../../../validators/analyze-completeness.cjs ${courseCode} --output ${courseDir}/completeness_report.json
\`\`\`

**CRITICAL**: If GATE validator fails, you MUST fix violations before continuing. Read gate_violations.json for specific phrases that violate GATE.

Report: GATE compliance status, pattern density, and completeness score!

---

## Success Criteria

✅ Baskets for ~${(endSeed - startSeed + 1) * 3} LEGOs
✅ Merged with existing lego_baskets.json (if not batch 1)
✅ Perfect grammar in BOTH languages
✅ **ABSOLUTE GATE: 0 violations** (validate-gate-compliance.cjs MUST pass)
✅ Pattern coverage validators run, reports generated
${batchNum > 1 ? '✅ Pattern gaps from batch ' + (batchNum - 1) + ' addressed' : ''}

**MANDATORY**: GATE compliance = 100%. Any violations = failed batch, must regenerate.

When done, report: GATE compliance (0 violations), LEGO count, and pattern density!
`;
}

/**
 * Generates comprehensive orchestrator brief for course generation (DEPRECATED - use batch-specific briefs)
 */
function generateOrchestratorBrief(courseCode, params, courseDir) {
  const { target, known, seeds } = params;

  return `# Course Generation Orchestrator Brief (v7.7.1)

## Mission
Generate complete SSi language course using cloud-native phase intelligence.

**Course**: ${courseCode}
**Target Language**: ${target} (learning language)
**Known Language**: ${known} (learner's language)
**Seeds**: ${seeds} (total canonical sentences to process)

---

## Your Role

You are the **course generation orchestrator**. Execute phases 1, 3, and 5 sequentially. Fetch latest methodology from phase intelligence endpoints, apply it, write outputs to VFS.

---

## Phase Intelligence (Single Source of Truth)

**NEW Architecture**: Phase intelligence served from modular markdown files

**Endpoint**: \`GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/phase-intelligence/:phase\`

Fetch instructions for each phase:
- **Phase 1**: \`/phase-intelligence/1\` → Returns phase_1_seed_pairs.md
- **Phase 3**: \`/phase-intelligence/3\` → Returns phase_3_lego_pairs.md
- **Phase 5**: \`/phase-intelligence/5\` → Returns phase_5_lego_baskets.md

Use WebFetch to get the latest methodology before executing each phase.

---

## File Locations

**Course Directory**: \`${courseDir}\`

**Output Files** (NEW v7.7.1 naming):
- Phase 1: \`${courseDir}/seed_pairs.json\`
- Phase 3: \`${courseDir}/lego_pairs.json\`
- Phase 5: \`${courseDir}/lego_baskets.json\`

**Canonical Seeds**: Fetch from \`GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/seeds?limit=${seeds}\`
- Pipe-delimited format: \`S0001|I want to speak {target} with you now.\`
- Token-efficient: ~3k tokens vs 30k for JSON

---

## Phase 1: Pedagogical Translation

**Fetch Instructions**: \`GET /phase-intelligence/1\`

**Output File**: \`seed_pairs.json\`

**Format**:
\`\`\`json
{
  "S0001": ["Quiero hablar español", "I want to speak Spanish"],
  "S0002": ["Estoy intentando aprender", "I'm trying to learn"]
}
\`\`\`

**Key Points**:
- Apply 6 pedagogical heuristics (cognate preference, variation reduction, etc.)
- Two-step process: canonical → target → known
- Maintain vocabulary registry (First Word Wins)
- Read FULL phase intelligence for all details

---

## Phase 3: LEGO Extraction

**Fetch Instructions**: \`GET /phase-intelligence/3\`

**Input**: \`seed_pairs.json\`
**Output File**: \`lego_pairs.json\`

**Format**:
\`\`\`json
[
  ["S0001", ["Quiero hablar español", "I want to speak Spanish"], [
    ["S0001L01", "B", "Quiero", "I want"],
    ["S0001L02", "B", "hablar", "to speak"],
    ["S0001L03", "B", "español", "Spanish"]
  ]],
  ["S0019", ["Pero no quiero parar de hablar", "But I don't want to stop talking"], [
    ["S0019L01", "B", "pero", "but"],
    ["S0019L02", "C", "no quiero", "I don't want", [["no", "not"], ["quiero", "I want"]]],
    ["S0019L03", "C", "parar de", "to stop", [["parar", "to stop"], ["de", "of"]]],
    ["S0019L04", "B", "hablar", "to talk"]
  ]]
]
\`\`\`

**COMPOSITE format**: \`["LEGO_ID", "C", "target", "known", [["part1_target", "part1_literal"], ["part2_target", "part2_literal"]]]\`
**Note**: Componentization is TWO elements per component (target + literal known), NO third element!

**Key Points**:
- Extract BASE and COMPOSITE LEGOs (v7.7 format)
- **COMPOSITE rule**: Multi-word target phrases that can be pedagogically broken down MUST be COMPOSITE with componentization
- **Componentization format**: \`[["targetPart", "literalKnown"], ...]\` (TWO elements, NO LEGO_IDs!)
- **Literal translations**: Components must show HOW target language constructs meaning
- FD compliance determines validity, pedagogical judgment determines granularity
- Read FULL phase intelligence for componentization examples and judgment criteria

---

## Phase 5: Basket Generation (BATCH-AWARE SELF-HEALING)

**CRITICAL**: Phase 5 MUST be executed in BATCHES by seed provenance.

**Fetch Instructions**: \`GET /phase-intelligence/5\`

**Input**: \`lego_pairs.json\`
**Output File**: \`lego_baskets.json\` (append each batch, don't overwrite!)

**Batch Size**: 20 seeds per batch

**Batch Strategy**:
1. **Batch 1** (Seeds S0001-S0020):
   - Filter LEGOs with IDs S0001Lxx through S0020Lxx from lego_pairs.json
   - Generate baskets for these LEGOs following phase intelligence
   - Write initial lego_baskets.json
   - Run validators: node validators/analyze-pattern-coverage.cjs
   - Run validators: node validators/analyze-completeness.cjs
   - Validator output → completeness_report.json, pattern_coverage_report.json

2. **Batch 2** (Seeds S0021-S0040):
   - Filter LEGOs S0021Lxx through S0040Lxx
   - **READ validator output from Batch 1** (completeness_report.json, pattern_coverage_report.json)
   - Identify missing edges and underused LEGOs
   - Generate baskets, targeting gaps (50% of eternal phrases should address identified weaknesses)
   - **APPEND** to existing lego_baskets.json (merge, don't replace!)
   - Run validators on ALL baskets (S0001-S0040 combined)
   - Update validator output files

3. **Batch 3** (Seeds S0041-S0060):
   - Filter LEGOs S0041Lxx through S0060Lxx
   - Read Batch 2 validator output
   - Target new gaps
   - APPEND to lego_baskets.json
   - Run validators on ALL baskets
   - Continue pattern...

4. **Continue** for remaining batches (up to S0${String(seeds).padStart(4, '0')})

**Running Validators** (after each batch):
\`\`\`bash
# Pattern coverage analysis
node validators/analyze-pattern-coverage.cjs ${courseCode} --output ${courseDir}/pattern_coverage_report.json

# Completeness score
node validators/analyze-completeness.cjs ${courseCode} --output ${courseDir}/completeness_report.json
\`\`\`

**Reading Validator Output** (for batch N+1):
- Read \`${courseDir}/pattern_coverage_report.json\` → identifies missing edges, underused LEGOs
- Read \`${courseDir}/completeness_report.json\` → overall quality score, vocabulary balance
- Use this data to target gaps in eternal phrase generation (see Phase 5 intelligence for details)

**Key Points**:
- E-phrases: 7-10 words, natural, conversational
- D-phrases: Expanding windows (2, 3, 4, 5 LEGOs)
- ABSOLUTE GATE: LEGO #N only uses LEGOs #1 to N-1 (guaranteed by seed ordering)
- Perfect grammar in BOTH languages
- **Batch-aware**: Each batch learns from previous batch's pattern gaps
- Read FULL phase intelligence for batch-aware edge targeting details

---

## Execution Steps

**For each phase:**

1. **Fetch Phase Intelligence**: Use WebFetch to get latest methodology
2. **Read Input**: Load required input file(s)
3. **Apply Methodology**: Follow phase intelligence exactly
4. **Write Output**: Save to correct filename in ${courseDir}
5. **Spot Check**: Verify quality (5-10 samples)
6. **Continue**: Move to next phase if successful

**No validation endpoints** - just follow the phase intelligence and use your judgment on quality.

---

## Quality Checkpoints

### After Phase 1
- Natural translations?
- High-frequency vocabulary?
- Cognates preferred for seeds 1-${Math.min(seeds, 100)}?

### After Phase 3
- All LEGOs FD-compliant?
- Component arrays correct format?
- No orphaned LEGOs?

### After Phase 5 (each batch)
- E-phrases 7-10 words?
- Perfect target grammar?
- D-phrases respect vocabulary constraints?
- Validator output shows improving pattern density across batches?

---

## Success Criteria

✅ Phase 1: \`seed_pairs.json\` created with ${seeds} seed pairs
✅ Phase 3: \`lego_pairs.json\` created with extracted LEGOs
✅ Phase 5: \`lego_baskets.json\` created with baskets for each LEGO (batch-aware, self-healing)
✅ Validators run after each Phase 5 batch
✅ Pattern density improves across batches
✅ Quality checks passed
✅ Files written to correct locations

---

## Final Report

After completion, report:

\`\`\`
✅ Course Generation Complete: ${courseCode}

Phase 1: ✅ ${seeds} seed pairs → seed_pairs.json
Phase 3: ✅ [X] LEGOs → lego_pairs.json
Phase 5: ✅ [X] baskets (${Math.ceil(seeds / 20)} batches, batch-aware) → lego_baskets.json

Pattern Coverage Evolution:
- Batch 1: [X]% pattern density
- Batch 2: [X]% pattern density (↑ from batch 1)
- Final: [X]% pattern density

Quality: [Summary of final validator output]
Location: ${courseDir}
Next: Review at ${CONFIG.TRAINING_URL}/courses/${courseCode}
\`\`\`

---

## Begin Execution

**Start with Phase 1** - fetch intelligence and execute!
`;
}

/**
 * Closes iTerm2 windows to free RAM after job completion
 */
async function closeAgentWindows(windowIds) {
  if (!windowIds || windowIds.length === 0) {
    return;
  }

  console.log(`[Cleanup] Closing ${windowIds.length} iTerm2 window(s) to free RAM...`);

  for (const windowId of windowIds) {
    try {
      const appleScript = `
tell application "iTerm2"
    repeat with w in windows
        if id of w is "${windowId}" then
            close w
            exit repeat
        end if
    end repeat
end tell
      `.trim();

      const { spawn } = require('child_process');
      const child = spawn('osascript', ['-e', appleScript], {
        stdio: 'ignore'
      });

      await new Promise((resolve) => {
        child.on('close', resolve);
        setTimeout(resolve, 2000); // Don't block on single window
      });

      console.log(`[Cleanup] Closed iTerm2 window ${windowId}`);
    } catch (error) {
      console.warn(`[Cleanup] Failed to close window ${windowId}:`, error.message);
    }
  }

  console.log(`[Cleanup] ✅ All agent windows closed, RAM freed`);
}

/**
 * Spawns a Claude Code agent via iTerm2 terminal
 * Uses direct command approach to avoid AppleScript escaping issues
 */
async function spawnPhaseAgent(phase, prompt, courseDir, courseCode) {
  console.log(`[Agent] Spawning Phase ${phase} agent in iTerm2...`);

  const trainingURL = `${CONFIG.TRAINING_URL}/phase/${phase}`;

  // Write prompt to temp file to avoid escaping issues
  const promptFile = path.join(__dirname, `.prompt-${phase}-${Date.now()}.txt`);
  await fs.writeFile(promptFile, prompt, 'utf8');

  try {
    const { spawn } = require('child_process');

    // Use AppleScript to control iTerm2 and invoke Claude Code
    // Returns window ID for later cleanup
    const appleScript = `
tell application "iTerm2"
    create window with default profile
    set newWindow to current window
    tell current session of newWindow
        write text "cd \\"${courseDir}\\""
        write text "claude --permission-mode bypassPermissions"
        delay 15
        -- Read prompt file and paste via clipboard
        set promptContent to read POSIX file "${promptFile}" as «class utf8»
        set the clipboard to promptContent
        tell application "System Events"
            keystroke "v" using command down
            delay 1
            keystroke return
        end tell
    end tell
    return id of newWindow
end tell
    `.trim();

    // Spawn osascript to execute AppleScript and capture window ID
    const child = spawn('osascript', ['-e', appleScript], {
      detached: false,
      stdio: ['ignore', 'pipe', 'ignore']
    });

    let windowId = null;
    child.stdout.on('data', (data) => {
      windowId = data.toString().trim();
    });

    await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`osascript exited with code ${code}`));
        }
      });
      child.on('error', reject);
    });

    console.log(`[Agent] Phase ${phase} agent spawned successfully in iTerm2 window ${windowId}`);

    // Track window ID in job state
    const job = STATE.jobs.get(courseCode);
    if (job) {
      if (!job.windowIds) {
        job.windowIds = [];
      }
      if (windowId) {
        job.windowIds.push(windowId);
      }
    }

    // Clean up temp file after delay (give iTerm2 time to execute)
    setTimeout(() => {
      fs.unlink(promptFile).catch(err => {
        console.warn(`[Agent] Failed to clean up temp prompt file: ${err.message}`);
      });
    }, 20000);

    return windowId;
  } catch (error) {
    console.error(`[Agent] Failed to spawn Phase ${phase} agent:`, error.message);
    // Clean up temp file on error
    await fs.unlink(promptFile).catch(() => {});
    throw error;
  }
}

/**
 * INTELLIGENT BATCH ORCHESTRATOR
 * Spawns phase-specific agents with appropriate batch sizes
 *
 * Phase 1: 100 seeds/batch (light, parallel)
 * Phase 3: 50 seeds/batch (medium, parallel)
 * Phase 5: 20 seeds/batch (heavy, SEQUENTIAL with validators)
 */
async function spawnCourseOrchestrator(courseCode, params) {
  console.log(`[Orchestrator] Starting INTELLIGENT BATCH orchestration: ${courseCode}`);
  console.log(`[Orchestrator] Seed range: S${String(params.startSeed).padStart(4, '0')}-S${String(params.endSeed).padStart(4, '0')} (${params.seeds} seeds)`);

  const job = STATE.jobs.get(courseCode);
  const courseDir = await ensureCourseDirectory(courseCode);
  const { target, known, seeds, startSeed, endSeed } = params;

  try {
    // Calculate batch counts
    const phase1Batches = 1; // Single batch for all seeds (maintains vocabulary registry)
    const phase3Batches = Math.ceil(seeds / 50);
    const phase5Batches = Math.ceil(seeds / 20);

    console.log(`[Orchestrator] Phase 1: Single batch (all ${seeds} seeds - vocabulary registry consistency)`);
    console.log(`[Orchestrator] Phase 3: ${phase3Batches} batches (50 seeds each, parallel)`);
    console.log(`[Orchestrator] Phase 5: ${phase5Batches} batches (20 seeds each, sequential)`);

    // PHASE 1: Translation (can spawn in parallel)
    // CHECK FOR INTELLIGENT RESUME
    const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
    let phase1AlreadyComplete = false;

    if (await fs.pathExists(seedPairsPath)) {
      try {
        const seedPairsData = await fs.readJson(seedPairsPath);
        const actualSeeds = Object.keys(seedPairsData.translations || {}).length;
        if (actualSeeds >= seeds) {
          phase1AlreadyComplete = true;
          console.log(`\n[Resume] ✅ Phase 1 already complete! Found ${actualSeeds}/${seeds} seed pairs`);
          console.log(`[Resume] Skipping Phase 1 generation, proceeding to Phase 3...\n`);
          job.phase = 'phase_1_complete';
          job.progress = 30;
        }
      } catch (err) {
        console.log(`[Resume] seed_pairs.json exists but invalid, will regenerate`);
      }
    }

    if (!phase1AlreadyComplete) {
      job.phase = 'phase_1';
      job.progress = 0;
      console.log(`\n[Phase 1] Spawning single agent for all ${seeds} seeds (S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')})...`);

      const brief = generatePhase1Brief(courseCode, { target, known, startSeed, endSeed, batchNum: 1, totalBatches: 1 }, courseDir);
      await spawnPhaseAgent(`1-complete`, brief, courseDir, courseCode);

      console.log(`[Phase 1] Agent spawned. Translating all ${seeds} seeds in single session for vocabulary registry consistency.`);
      console.log(`[Phase 1] ⏳ Waiting for Phase 1 completion before Phase 3...`);
      console.log(`[Phase 1] 📍 Polling seed_pairs.json for completion...`);

      job.phase = 'phase_1_waiting';
      job.progress = 10;
    }

    // Poll for Phase 1 completion, then auto-progress to Phase 3 and Phase 5
    pollAndContinue(courseCode, params, courseDir, phase1Batches, phase3Batches, phase5Batches);

  } catch (error) {
    console.error(`[Orchestrator] Error in batch orchestration:`, error);
    job.status = 'failed';
    job.error = error.message;
  }
}

/**
 * Run intelligent validator on Phase 3 output
 * Temporarily renames .tmp.json to .json for validation, then renames back if validation fails
 */
async function runIntelligentValidator(courseDir) {
  const tmpPath = path.join(courseDir, 'lego_pairs.tmp.json');
  const finalPath = path.join(courseDir, 'lego_pairs.json');

  try {
    // Temporarily rename .tmp.json → .json for validator
    if (await fs.pathExists(tmpPath)) {
      await fs.rename(tmpPath, finalPath);
    }

    const { IntelligentValidator } = require('./validators/validate-phase3-intelligent.cjs');
    const validator = new IntelligentValidator(courseDir);
    const result = await validator.validate();

    // If validation fails, rename back to .tmp.json
    if (!result.valid && await fs.pathExists(finalPath)) {
      await fs.rename(finalPath, tmpPath);
    }
    // If validation passes, leave as .json (final name)

    return result;
  } catch (error) {
    console.error(`[Validation] Error running intelligent validator:`, error.message);

    // On error, restore .tmp.json if needed
    if (await fs.pathExists(finalPath) && !await fs.pathExists(tmpPath)) {
      await fs.rename(finalPath, tmpPath);
    }

    return { valid: false, errors: [{ message: error.message }], stats: { totalSeeds: 0, passedSeeds: 0, failedSeeds: 0 }, failedSeeds: [] };
  }
}

/**
 * Regenerate failed Phase 3 seeds with explicit error feedback
 */
async function regeneratePhase3Seeds(courseCode, courseDir, validation, params) {
  const { target, known } = params;
  const { failedSeeds, errors } = validation;

  console.log(`\n[Phase 3 Retry] Regenerating ${failedSeeds.length} failed seeds`);
  console.log(`[Phase 3 Retry] Error breakdown:`);
  console.log(`  - Tiling: ${validation.stats.errorBreakdown.tiling}`);
  console.log(`  - Consistency (FD): ${validation.stats.errorBreakdown.consistency}`);
  console.log(`  - Co-occurrence: ${validation.stats.errorBreakdown.cooccurrence}`);
  console.log(`  - Hard rules: ${validation.stats.errorBreakdown.hardRules}`);

  // Build retry brief with explicit error feedback
  const retryBrief = generatePhase3RetryBrief(courseCode, {
    target,
    known,
    failedSeeds,
    errors,
    validation
  }, courseDir);

  // Spawn retry agent
  await spawnPhaseAgent('3-retry', retryBrief, courseDir, courseCode);

  console.log(`[Phase 3 Retry] Retry agent spawned for ${failedSeeds.length} seeds\n`);
}

/**
 * Generate Phase 3 retry brief with error feedback
 */
function generatePhase3RetryBrief(courseCode, retryParams, courseDir) {
  const { target, known, failedSeeds, errors, validation } = retryParams;

  // Group errors by seed
  const errorsBySeed = {};
  for (const error of errors) {
    if (!errorsBySeed[error.seedId]) {
      errorsBySeed[error.seedId] = [];
    }
    errorsBySeed[error.seedId].push(error);
  }

  // Build error feedback section
  let errorFeedback = '';
  for (const seedId of failedSeeds.slice(0, 20)) { // Limit to first 20 for brevity
    const seedErrors = errorsBySeed[seedId] || [];
    errorFeedback += `\n### ${seedId}\n`;
    for (const err of seedErrors) {
      errorFeedback += `**Error**: ${err.type}\n`;
      errorFeedback += `- Message: ${err.message}\n`;
      if (err.evidence) {
        errorFeedback += `- Evidence: ${err.evidence}\n`;
      }
      if (err.fix) {
        errorFeedback += `- Fix: ${err.fix}\n`;
      }
      errorFeedback += '\n';
    }
  }

  if (failedSeeds.length > 20) {
    errorFeedback += `\n... and ${failedSeeds.length - 20} more seeds with similar errors\n`;
  }

  const brief = `# Phase 3 RETRY: LEGO Extraction with Error Feedback

## Course: ${courseCode}
Target Language: ${target.toUpperCase()}
Known Language: ${known.toUpperCase()}

## Retry Context

You generated LEGO decompositions for ${validation.stats.totalSeeds} seeds.

✅ **PASSED**: ${validation.stats.passedSeeds} seeds
❌ **FAILED**: ${validation.stats.failedSeeds} seeds due to validation errors

## Validation Errors Found

${errorFeedback}

## Your Task

Regenerate **ONLY** the ${failedSeeds.length} failed seeds listed above, fixing the specific errors identified.

### Failed Seed IDs
${failedSeeds.join(', ')}

## Phase 3 Intelligence

${PHASE_PROMPTS['3']}

## Critical Rules (from validation)

1. **Tiling Integrity**: LEGOs must reconstruct seed EXACTLY (nothing missing, nothing extra)
2. **Functional Determinism (FD)**: One target word = ONE known translation across all seeds
   - Example: "hablar" should ALWAYS map to "to speak" (not "talking", "to speaking", etc.)
   - Use the MOST COMMON mapping shown in evidence
3. **Consistency**: Check existing mappings across all seeds and maintain consistency
4. **Constructions**: Multi-word constructions stay together (negations + verbs, auxiliaries + verbs)

## Output Format

Update the existing lego_pairs.tmp.json file with corrected decompositions for the failed seeds.
DO NOT regenerate seeds that passed validation - only fix the failed ones.

Read the current lego_pairs.tmp.json, update only the failed seed entries, and write back.

## Files

- Input: ${path.join(courseDir, 'seed_pairs.json')} (all seed translations)
- Input: ${path.join(courseDir, 'lego_pairs.tmp.json')} (current LEGO decompositions - UPDATE FAILED SEEDS)
- Input: ${path.join(courseDir, 'validation_phase3_intelligent.json')} (detailed validation report)
- Output: ${path.join(courseDir, 'lego_pairs.tmp.json')} (corrected - overwrite with fixes)

NOTE: File remains .tmp.json until all validation passes, then will be renamed to lego_pairs.json
`;

  return brief;
}

/**
 * Poll for phase completion and auto-progress through pipeline
 */
async function pollAndContinue(courseCode, params, courseDir, phase1Batches, phase3Batches, phase5Batches) {
  const job = STATE.jobs.get(courseCode);
  const { target, known, seeds } = params;

  try {
    // WAIT FOR PHASE 1 COMPLETION
    console.log(`[Polling] Checking Phase 1 completion every 30s...`);
    const phase1Complete = await pollPhaseCompletion(courseDir, 'seed_pairs.json', seeds, 30000);

    if (!phase1Complete) {
      console.error(`[Polling] ❌ Phase 1 timeout after 30 minutes`);
      job.status = 'failed';
      job.error = 'Phase 1 completion timeout';
      return;
    }

    console.log(`\n[Polling] ✅ Phase 1 COMPLETE! All ${seeds} seed pairs generated.\n`);
    job.progress = 30;

    // Close Phase 1 windows to free RAM before Phase 3
    if (job.windowIds && job.windowIds.length > 0) {
      await closeAgentWindows(job.windowIds);
      job.windowIds = []; // Reset for Phase 3
    }

    // START PHASE 3
    // CHECK FOR INTELLIGENT RESUME
    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
    let phase3AlreadyComplete = false;

    if (await fs.pathExists(legoPairsPath)) {
      try {
        const legoPairsData = await fs.readJson(legoPairsPath);
        const actualSeeds = (legoPairsData.seeds || []).length;
        if (actualSeeds >= seeds) {
          phase3AlreadyComplete = true;
          console.log(`[Resume] ✅ Phase 3 already complete! Found ${actualSeeds}/${seeds} LEGO breakdowns`);
          console.log(`[Resume] Skipping Phase 3 generation, proceeding to Phase 5...\n`);
          job.progress = 60;
        }
      } catch (err) {
        console.log(`[Resume] lego_pairs.json exists but invalid, will regenerate`);
      }
    }

    if (!phase3AlreadyComplete) {
      job.phase = 'phase_3';
      console.log(`[Phase 3] Starting ${phase3Batches} LEGO extraction batches...`);

      for (let i = 0; i < phase3Batches; i++) {
        const batchStartSeed = startSeed + (i * 50);
        const batchEndSeed = Math.min(startSeed + ((i + 1) * 50) - 1, endSeed);
        const batchNum = i + 1;

        console.log(`[Phase 3] Spawning batch ${batchNum}/${phase3Batches}: S${String(batchStartSeed).padStart(4, '0')}-S${String(batchEndSeed).padStart(4, '0')}`);

        const brief = generatePhase3Brief(courseCode, { target, known, startSeed: batchStartSeed, endSeed: batchEndSeed, batchNum, totalBatches: phase3Batches }, courseDir);
        await spawnPhaseAgent(`3-batch${batchNum}`, brief, courseDir, courseCode);

        // 30-second stagger to ensure Claude Code is ready before next window spawns
        if (i < phase3Batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
      }

      console.log(`[Phase 3] All ${phase3Batches} batches spawned. Running in parallel...`);
      job.progress = 40;
    }

    // WAIT FOR PHASE 3 GENERATION (temp file)
    console.log(`[Polling] Checking Phase 3 generation completion every 30s...`);
    const phase3GenerationComplete = await pollPhaseCompletion(courseDir, 'lego_pairs.tmp.json', seeds, 30000);

    if (!phase3GenerationComplete) {
      console.error(`[Polling] ❌ Phase 3 generation timeout after 30 minutes`);
      job.status = 'failed';
      job.error = 'Phase 3 generation timeout';
      return;
    }

    console.log(`\n[Polling] ✅ Phase 3 GENERATION COMPLETE! LEGOs extracted for all ${seeds} seeds.\n`);

    // PHASE 3.5: INTELLIGENT VALIDATION LOOP
    console.log(`\n[Phase 3.5] Starting intelligent validation loop...\n`);
    console.log(`[Phase 3.5] Validating lego_pairs.tmp.json → will rename to lego_pairs.json when validated\n`);
    let phase3Valid = false;
    let phase3Attempts = 0;
    const maxPhase3Attempts = 3;

    while (!phase3Valid && phase3Attempts < maxPhase3Attempts) {
      phase3Attempts++;
      console.log(`[Phase 3.5] Validation attempt ${phase3Attempts}/${maxPhase3Attempts}`);

      // Run intelligent validator (renames .tmp.json → .json, validates, renames back if fail)
      const validation = await runIntelligentValidator(courseDir);

      if (validation.valid) {
        phase3Valid = true;
        console.log(`[Phase 3.5] ✅ Validation passed! ${validation.stats.passedSeeds}/${validation.stats.totalSeeds} seeds valid`);
        console.log(`[Phase 3.5] ✅ Renamed lego_pairs.tmp.json → lego_pairs.json (FINAL)\n`);
      } else {
        console.log(`[Phase 3.5] ❌ Validation failed: ${validation.errors.length} errors in ${validation.failedSeeds.length} seeds`);
        console.log(`[Phase 3.5] Failed seeds: ${validation.failedSeeds.slice(0, 10).join(', ')}${validation.failedSeeds.length > 10 ? '...' : ''}`);
        console.log(`[Phase 3.5] File remains as lego_pairs.tmp.json (not validated yet)`);

        if (phase3Attempts < maxPhase3Attempts) {
          console.log(`[Phase 3.5] 🔄 Regenerating ${validation.failedSeeds.length} failed seeds with explicit error feedback...`);
          await regeneratePhase3Seeds(courseCode, courseDir, validation, params);

          // Wait for regeneration to complete
          console.log(`[Phase 3.5] ⏳ Waiting for regeneration...`);
          await new Promise(resolve => setTimeout(resolve, 60000)); // 1 min wait
        } else {
          console.error(`[Phase 3.5] ❌ Validation failed after ${maxPhase3Attempts} attempts`);
          console.error(`[Phase 3.5] File remains as lego_pairs.tmp.json - MANUAL FIX REQUIRED`);
          job.status = 'failed';
          job.error = `Phase 3 validation failed: ${validation.errors.length} errors persist`;
          return;
        }
      }
    }

    job.progress = 60;

    // Close Phase 3 windows to free RAM before Phase 5
    if (job.windowIds && job.windowIds.length > 0) {
      await closeAgentWindows(job.windowIds);
      job.windowIds = []; // Reset for Phase 5
    }

    // START PHASE 5 (SEQUENTIAL with validators)
    // CHECK FOR INTELLIGENT RESUME
    const legoBasketsPath = path.join(courseDir, 'lego_baskets.json');
    let phase5AlreadyComplete = false;

    if (await fs.pathExists(legoBasketsPath)) {
      try {
        const basketsData = await fs.readJson(legoBasketsPath);
        const baskets = basketsData.baskets || basketsData;
        const actualBaskets = Object.keys(baskets).length;
        const expectedBaskets = Math.ceil(seeds * 3); // Rough estimate: ~3 LEGOs per seed

        if (actualBaskets >= expectedBaskets * 0.8) { // 80% threshold (generous)
          phase5AlreadyComplete = true;
          console.log(`[Resume] ✅ Phase 5 already complete! Found ${actualBaskets} baskets (expected ~${expectedBaskets})`);
          console.log(`[Resume] Skipping Phase 5 generation. Course generation complete!\n`);
          job.phase = 'completed';
          job.status = 'completed';
          job.progress = 100;
          job.endTime = new Date();
          return; // Skip Phase 5 entirely
        }
      } catch (err) {
        console.log(`[Resume] lego_baskets.json exists but invalid, will regenerate`);
      }
    }

    job.phase = 'phase_5';
    console.log(`[Phase 5] Starting ${phase5Batches} basket batches (SEQUENTIAL)...\n`);

    let validatorOutput = null;

    for (let i = 0; i < phase5Batches; i++) {
      const batchStartSeed = startSeed + (i * 20);
      const batchEndSeed = Math.min(startSeed + ((i + 1) * 20) - 1, endSeed);
      const batchNum = i + 1;

      console.log(`[Phase 5] === BATCH ${batchNum}/${phase5Batches}: S${String(batchStartSeed).padStart(4, '0')}-S${String(batchEndSeed).padStart(4, '0')} ===`);

      const brief = generatePhase5Brief(courseCode, { target, known, startSeed: batchStartSeed, endSeed: batchEndSeed, batchNum, totalBatches: phase5Batches }, courseDir, validatorOutput);
      await spawnPhaseAgent(`5-batch${batchNum}`, brief, courseDir, courseCode);

      // Wait for batch to complete
      console.log(`[Phase 5] ⏳ Waiting for batch ${batchNum} to complete...`);
      await new Promise(resolve => setTimeout(resolve, 90000)); // 1.5 min initial delay

      const expectedLegoCount = Math.ceil(batchEndSeed * 3);
      const batchComplete = await pollPhase5BatchCompletion(courseDir, expectedLegoCount, 30000);

      if (batchComplete) {
        console.log(`[Phase 5] ✅ Batch ${batchNum} complete!\n`);

        // Read validator output for next batch
        if (i < phase5Batches - 1) {
          validatorOutput = await readValidatorOutput(courseDir);
          if (validatorOutput) {
            console.log(`[Phase 5] 📊 Validators: ${validatorOutput.patternDensity}% pattern density`);
          }
        }
      } else {
        console.warn(`[Phase 5] ⚠️  Batch ${batchNum} timeout - continuing anyway\n`);
      }

      job.progress = 60 + Math.floor((batchNum / phase5Batches) * 35);
    }

    console.log(`\n[Phase 5] ✅ ALL BATCHES COMPLETE!\n`);
    job.progress = 100;
    job.phase = 'completed';
    job.status = 'completed';
    job.endTime = new Date();

    console.log(`✅ COURSE GENERATION COMPLETE: ${courseCode}`);
    console.log(`📊 Check validator reports for final stats\n`);

    // Close all agent windows to free RAM
    if (job.windowIds && job.windowIds.length > 0) {
      await closeAgentWindows(job.windowIds);
      job.windowIds = []; // Clear tracked windows
    }

  } catch (error) {
    console.error(`[Polling] Error:`, error);
    job.status = 'failed';
    job.error = error.message;
  }
}

/**
 * Poll for phase completion by checking file and seed count
 */
async function pollPhaseCompletion(courseDir, filename, expectedSeeds, pollInterval) {
  const filePath = path.join(courseDir, filename);
  const maxAttempts = 60; // 30 minutes
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      if (await fs.pathExists(filePath)) {
        const data = await fs.readJson(filePath);
        let actualCount = 0;

        if (filename === 'seed_pairs.json') {
          actualCount = Object.keys(data.translations || {}).length;
        } else if (filename === 'lego_pairs.json' || filename === 'lego_pairs.tmp.json') {
          actualCount = (data.seeds || []).length;
        }

        if (actualCount > 0) {
          console.log(`[Polling] ${filename}: ${actualCount}/${expectedSeeds} seeds`);
        }

        if (actualCount >= expectedSeeds) {
          return true;
        }
      }
    } catch (err) {
      // File might be mid-write
    }

    attempts++;
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  return false;
}

/**
 * Poll for Phase 5 batch completion
 */
async function pollPhase5BatchCompletion(courseDir, expectedLegoCount, pollInterval) {
  const filePath = path.join(courseDir, 'lego_baskets.json');
  const maxAttempts = 40; // 20 minutes
  let attempts = 0;
  let lastCount = 0;

  while (attempts < maxAttempts) {
    try {
      if (await fs.pathExists(filePath)) {
        const data = await fs.readJson(filePath);
        const actualCount = Object.keys(data.baskets || data || {}).length;

        if (actualCount > lastCount) {
          console.log(`[Polling] Baskets: ${actualCount} (~${expectedLegoCount} target)`);
          lastCount = actualCount;
        }

        if (actualCount >= expectedLegoCount * 0.8) {
          return true;
        }
      }
    } catch (err) {
      // File might be mid-write
    }

    attempts++;
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  return false;
}

/**
 * Read validator output from previous batch
 */
async function readValidatorOutput(courseDir) {
  try {
    const patternPath = path.join(courseDir, 'pattern_coverage_report.json');

    if (await fs.pathExists(patternPath)) {
      const patternData = await fs.readJson(patternPath);

      return {
        patternDensity: patternData.summary?.pattern_density || 0,
        missingEdges: patternData.missing_edges || [],
        underusedLegos: patternData.lego_frequency?.filter(l => l.edge_count < 3) || []
      };
    }
  } catch (err) {
    console.warn(`[Validator] Could not read: ${err.message}`);
  }

  return null;
}

/**
 * Run validation on a completed phase
 */
async function validatePhase(phase, courseDir) {
  const { validatePhase3 } = require('./validators/validate-phase3-legos.cjs');
  const { validatePhase5 } = require('./validators/validate-phase5-baskets.cjs');

  console.log(`[Validation] Running Phase ${phase} validation...`);

  let result;
  if (phase === '3') {
    result = await validatePhase3(courseDir);
  } else if (phase === '5') {
    result = await validatePhase5(courseDir);
  } else {
    // No validator for this phase yet
    return { valid: true, errors: [] };
  }

  if (!result.valid) {
    console.error(`[Validation] ❌ Phase ${phase} validation FAILED`);
    console.error(`[Validation] Found ${result.errors.length} errors:`);
    result.errors.slice(0, 10).forEach(err => {
      console.error(`  - ${err.type}: ${err.message}`);
    });
    if (result.errors.length > 10) {
      console.error(`  ... and ${result.errors.length - 10} more errors`);
    }
  } else {
    console.log(`[Validation] ✅ Phase ${phase} validation passed`);
  }

  return result;
}

/**
 * Orchestrates sequential phase execution (LEGACY - replaced by spawnCourseOrchestrator)
 * Kept for backward compatibility and manual phase-by-phase execution if needed
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

    // Validate Phase 3
    const phase3Validation = await validatePhase('3', courseDir);
    if (!phase3Validation.valid) {
      throw new Error(`Phase 3 validation failed: ${phase3Validation.errors.length} errors found`);
    }
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

    // Validate Phase 5
    const phase5Validation = await validatePhase('5', courseDir);
    if (!phase5Validation.valid) {
      throw new Error(`Phase 5 validation failed: ${phase5Validation.errors.length} errors found`);
    }
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

    // Close all agent windows to free RAM
    if (job.windowIds && job.windowIds.length > 0) {
      await closeAgentWindows(job.windowIds);
      job.windowIds = []; // Clear tracked windows
    }

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
 * GET /api/courses/:code/regeneration/:jobId/status
 * Alias endpoint for regeneration job status (matches ITERATION_2_BRIEF spec)
 */
app.get('/api/courses/:code/regeneration/:jobId/status', (req, res) => {
  try {
    const { jobId } = req.params;
    const job = STATE.regenerationJobs.get(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Regeneration job not found',
        jobId
      });
    }

    // Return formatted status (matching frontend expectations)
    res.json({
      jobId: job.jobId,
      status: job.status,
      currentPhase: job.currentPhase,
      progress: job.progress,
      startTime: job.startTime,
      endTime: job.endTime,
      completedPhases: job.completedPhases,
      affectedPhases: job.phases,
      seedId: job.seedId,
      error: job.error,
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

/**
 * GET /api/courses/:code/learned-rules
 * View all learned rules from manual edits and their effectiveness
 */
app.get('/api/courses/:code/learned-rules', async (req, res) => {
  try {
    const { code } = req.params;
    const learningPath = path.join(CONFIG.VFS_ROOT, code, 'learned_rules.json');

    if (!await fs.pathExists(learningPath)) {
      return res.json({
        courseCode: code,
        rules: [],
        manual_edits: [],
        summary: {
          total_rules: 0,
          experimental: 0,
          validated: 0,
          committed: 0,
          total_edits: 0
        }
      });
    }

    const learnedRules = await fs.readJson(learningPath);

    // Calculate summary stats
    const summary = {
      total_rules: learnedRules.rules.length,
      experimental: learnedRules.rules.filter(r => r.status === 'experimental').length,
      validated: learnedRules.rules.filter(r => r.status === 'validated').length,
      committed: learnedRules.rules.filter(r => r.status === 'committed').length,
      total_edits: learnedRules.manual_edits.length
    };

    res.json({
      courseCode: code,
      rules: learnedRules.rules,
      manual_edits: learnedRules.manual_edits.slice(-10), // Last 10 edits only
      summary
    });

  } catch (error) {
    console.error('[API] Error loading learned rules:', error);
    res.status(500).json({
      error: 'Failed to load learned rules',
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
  const { target, known, startSeed = 1, endSeed = 668 } = req.body;

  if (!target || !known) {
    return res.status(400).json({ error: 'Missing target or known language' });
  }

  // Calculate total seeds
  const seeds = endSeed - startSeed + 1;

  // Generate course code with seed range
  const seedRangeStr = `S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')}`;
  const courseCode = `${target}_for_${known}_${seeds}seeds_${seedRangeStr}`;

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
    params: { target, known, seeds, startSeed, endSeed },
    windowIds: [] // Track iTerm2 windows for cleanup
  };

  STATE.jobs.set(courseCode, job);

  // Start orchestrator in background
  spawnCourseOrchestrator(courseCode, { target, known, seeds, startSeed, endSeed }).catch(err => {
    console.error(`[API] Orchestrator error:`, err);
  });

  res.json({
    success: true,
    courseCode,
    message: 'Course generation started with orchestrator pattern',
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
 *
 * NEW: Reads from translations.json + LEGO_BREAKDOWNS_COMPLETE.json directly
 */
app.get('/api/courses', async (req, res) => {
  try {
    const courseDirs = await fs.readdir(CONFIG.VFS_ROOT);
    const courses = [];

    for (const dir of courseDirs) {
      const coursePath = path.join(CONFIG.VFS_ROOT, dir);

      try {
        const stats = await fs.stat(coursePath);

        if (!stats.isDirectory() || dir === '.DS_Store') continue;

        // Look for v7.7 format: seed_pairs.json + lego_pairs.json (Oct 22, 2024)
        const seedPairsPath = path.join(coursePath, 'seed_pairs.json');
        const legoPairsPath = path.join(coursePath, 'lego_pairs.json');

        // Check if this is a valid course (has both required files)
        if (await fs.pathExists(seedPairsPath) && await fs.pathExists(legoPairsPath)) {
          // Parse course code (e.g., spa_for_eng_30seeds)
          const match = dir.match(/^([a-z]{3})_for_([a-z]{3})_(\d+)seeds$/);
          if (!match) {
            console.log(`[API] Skipping directory ${dir} - doesn't match course code pattern`);
            continue;
          }

          const targetLang = match[1];
          const knownLang = match[2];
          const seedCount = parseInt(match[3]);

          // Load seed_pairs.json to get actual count
          const seedPairsData = await fs.readJson(seedPairsPath);
          const translationCount = Object.keys(seedPairsData.translations || {}).length;

          // Load lego_pairs.json to get LEGO count
          const legoPairsData = await fs.readJson(legoPairsPath);
          const seedsArray = legoPairsData.seeds || [];

          // Count total LEGOs across all seeds
          let legoCount = 0;
          for (const [seedId, seedPair, legos] of seedsArray) {
            legoCount += legos.length;
          }

          // Determine status based on what exists
          let status = 'phase_3_complete'; // Has translations + LEGOs
          let phases_completed = ['1', '3'];

          courses.push({
            course_code: dir,
            source_language: knownLang.toUpperCase(),
            target_language: targetLang.toUpperCase(),
            total_seeds: seedCount,
            version: '1.0',
            created_at: stats.birthtime.toISOString(),
            status: status,

            // New terminology (dashboard displays these)
            seed_pairs: translationCount,
            lego_pairs: legoCount,
            lego_baskets: 0, // Phase 5 not implemented yet

            phases_completed: phases_completed,

            // Backward compatibility (if needed by older components)
            amino_acids: {
              translations: translationCount,
              legos: 0,
              legos_deduplicated: legoCount,
              baskets: 0,
              introductions: 0
            }
          });
        }
      } catch (error) {
        console.error(`[API] Error processing course directory ${dir}:`, error.message);
        // Skip this course and continue
      }
    }

    console.log(`[API] Found ${courses.length} courses`);
    res.json({ courses });
  } catch (error) {
    console.error('[API] Error listing courses:', error);
    res.status(500).json({ error: 'Failed to list courses' });
  }
});

/**
 * GET /api/courses/:courseCode
 * Get detailed course information including translations and LEGOs
 *
 * NEW: Reads from translations.json + LEGO_BREAKDOWNS_COMPLETE.json directly
 */
app.get('/api/courses/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const coursePath = path.join(CONFIG.VFS_ROOT, courseCode);

    // Check if course exists
    if (!await fs.pathExists(coursePath)) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check for required files (v7.7 format)
    const seedPairsPath = path.join(coursePath, 'seed_pairs.json');
    const legoPairsPath = path.join(coursePath, 'lego_pairs.json');

    if (!await fs.pathExists(seedPairsPath)) {
      return res.status(404).json({ error: 'seed_pairs.json not found' });
    }

    if (!await fs.pathExists(legoPairsPath)) {
      return res.status(404).json({ error: 'lego_pairs.json not found' });
    }

    // Load seed_pairs.json
    const seedPairsData = await fs.readJson(seedPairsPath);
    const translationsObj = seedPairsData.translations || {};

    // Convert to array format expected by frontend
    // Input: { "S0001": ["target", "known"], ... }
    // Output: [{ seed_id: "S0001", target_phrase: "...", known_phrase: "..." }, ...]
    const translations = Object.entries(translationsObj).map(([seed_id, [target_phrase, known_phrase]]) => ({
      seed_id,
      target_phrase,
      known_phrase,
      canonical_seed: null // We don't have canonical seeds yet
    }));

    // Sort by seed_id
    translations.sort((a, b) => a.seed_id.localeCompare(b.seed_id));

    // Load lego_pairs.json
    const legoPairsData = await fs.readJson(legoPairsPath);
    const seedsArray = legoPairsData.seeds || [];

    // Flatten seeds array into individual LEGO pairs for frontend
    // Input: v7.7 format [[seed_id, [target, known], [[lego_id, type, t, k], ...]]]
    // Output: flat array of individual LEGO pairs in frontend format
    const legos = [];
    for (const [seed_id, [seed_target, seed_known], legoArray] of seedsArray) {
      for (const legoEntry of legoArray) {
        const [lego_id, type, target_chunk, known_chunk, feeders] = legoEntry;

        // Convert single-letter type to full name for frontend compatibility
        const lego_type = type === "B" ? "BASE" : type === "C" ? "COMPOSITE" : type === "F" ? "FEEDER" : type;

        legos.push({
          uuid: lego_id,
          seed_id: seed_id,
          text: `${known_chunk} = ${target_chunk}`,
          lego_type: lego_type,
          target_chunk: target_chunk,
          known_chunk: known_chunk,
          fd_validated: true, // Assume validated in v7.0
          componentization: feeders ? `Has ${feeders.length} feeders` : null,
          provenance: seed_id, // Provenance is the seed that generated this LEGO
          fcfs_score: null, // Not calculated yet (Phase 4)
          utility_score: null // Not calculated yet (Phase 4)
        });
      }
    }

    // Generate course metadata
    const match = courseCode.match(/^([a-z]{3})_for_([a-z]{3})_(\d+)seeds$/);
    const stats = await fs.stat(coursePath);

    const course = {
      course_code: courseCode,
      source_language: match ? match[2].toUpperCase() : 'UNK',
      target_language: match ? match[1].toUpperCase() : 'UNK',
      total_seeds: match ? parseInt(match[3]) : 0,
      version: '1.0',
      created_at: stats.birthtime.toISOString(),
      status: 'phase_3_complete',

      // Dashboard-displayed fields
      seed_pairs: translations.length,
      lego_pairs: legos.length,
      lego_baskets: 0,

      phases_completed: ['1', '3'],

      // Metadata from LEGO file (v7.7 format doesn't include metadata, derive from course code)
      target_language_name: getLanguageName(match ? match[1] : 'unk'),
      known_language_name: getLanguageName(match ? match[2] : 'unk')
    };

    console.log(`[API] Loaded course ${courseCode}: ${translations.length} translations, ${legos.length} LEGO pairs`);

    res.json({
      course,
      translations,
      legos,
      lego_breakdowns: seedsArray || [], // Raw breakdown data for visualizer (v7.7 format)
      baskets: [] // Empty for now (Phase 5 not implemented)
    });
  } catch (error) {
    console.error(`[API] Error loading course ${req.params.courseCode}:`, error);
    res.status(500).json({
      error: 'Failed to load course',
      details: error.message
    });
  }
});

/**
 * GET /api/courses/:courseCode/vfs/:filename
 * Serve VFS files from course directory
 */
app.get('/api/courses/:courseCode/vfs/:filename', async (req, res) => {
  try {
    const { courseCode, filename } = req.params;
    const filePath = path.join(CONFIG.VFS_ROOT, courseCode, filename);

    // Security: Ensure the resolved path is within the course directory
    const coursePath = path.join(CONFIG.VFS_ROOT, courseCode);
    if (!filePath.startsWith(coursePath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Read and return the file as JSON
    const data = await fs.readJson(filePath);
    res.json(data);
  } catch (error) {
    console.error(`[API] Error serving VFS file:`, error);
    res.status(500).json({
      error: 'Failed to read file',
      details: error.message
    });
  }
});

/**
 * GET /api/courses/:courseCode/provenance/:seedId
 * Trace provenance for a specific seed
 *
 * NEW: Reads from translations.json + LEGO_BREAKDOWNS_COMPLETE.json
 */
app.get('/api/courses/:courseCode/provenance/:seedId', async (req, res) => {
  try {
    const { courseCode, seedId } = req.params;
    const coursePath = path.join(CONFIG.VFS_ROOT, courseCode);

    // Load translations
    const translationsPath = path.join(coursePath, 'translations.json');
    const translationsData = await fs.readJson(translationsPath);

    const translationPair = translationsData[seedId];
    if (!translationPair) {
      return res.status(404).json({ error: `Seed ${seedId} not found` });
    }

    const translation = {
      seed_id: seedId,
      target_phrase: translationPair[0],
      known_phrase: translationPair[1]
    };

    // Load LEGO breakdown for this seed
    const legosPath = path.join(coursePath, 'LEGO_BREAKDOWNS_COMPLETE.json');
    const legoData = await fs.readJson(legosPath);

    const legoBreakdown = legoData.lego_breakdowns?.find(l => l.seed_id === seedId);

    // Build provenance chain
    const provenance = {
      seed: translation,
      lego_breakdown: legoBreakdown || null,
      phase_history: [
        {
          phase: '1',
          name: 'Translation',
          completed: true,
          output: translation
        },
        {
          phase: '3',
          name: 'LEGO Extraction',
          completed: !!legoBreakdown,
          output: legoBreakdown
        }
      ]
    };

    res.json(provenance);
  } catch (error) {
    console.error(`[API] Error tracing provenance for ${req.params.seedId}:`, error);
    res.status(500).json({ error: 'Failed to trace provenance' });
  }
});

/**
 * Trigger automatic regeneration cascade for edited translation
 * Runs Phase 3 → 3.5 → 4 → 5 → 6 in sequence
 *
 * @param {string} courseCode - Course identifier
 * @param {string} seedId - Edited seed ID (e.g., 'S0042')
 * @param {string} translationUuid - UUID of the edited translation
 * @returns {Promise<string>} - Job ID for tracking
 */
async function triggerRegenerationCascade(courseCode, seedId, translationUuid) {
  const jobId = `regen_${Date.now()}_${seedId}`;
  const coursePath = path.join(CONFIG.VFS_ROOT, courseCode);

  console.log(`[Cascade] Starting Phase 3+ regeneration for ${seedId} (job: ${jobId})`);

  // Create regeneration job
  const job = {
    jobId,
    type: 'edit_cascade',
    courseCode,
    seedId,
    translationUuid,
    status: 'queued',
    startTime: new Date(),
    phases: ['3', '3.5', '4', '5', '6'],
    currentPhase: null,
    progress: 0,
    completedPhases: [],
    error: null
  };

  STATE.regenerationJobs.set(jobId, job);

  // Define phases to regenerate (3 → 3.5 → 4 → 5 → 6)
  const phasesToRun = [
    { id: '3', name: 'LEGO Extraction', weight: 20 },
    { id: '3.5', name: 'Graph Construction', weight: 15 },
    { id: '4', name: 'LEGO Deduplication', weight: 20 },
    { id: '5', name: 'Pattern-Aware Baskets', weight: 25 },
    { id: '6', name: 'Introductions', weight: 20 }
  ];

  // Execute cascade asynchronously (don't block response)
  (async () => {
    try {
      job.status = 'running';
      let cumulativeProgress = 0;

      for (const phase of phasesToRun) {
        job.currentPhase = phase.id;
        console.log(`[${jobId}] Running Phase ${phase.id}: ${phase.name}...`);

        // Get phase prompt from registry
        const prompt = PHASE_PROMPTS[phase.id];
        if (!prompt) {
          throw new Error(`Phase ${phase.id} prompt not found in registry`);
        }

        // Execute phase using existing infrastructure
        await spawnPhaseAgent(phase.id, prompt, coursePath, courseCode);

        // Update progress
        cumulativeProgress += phase.weight;
        job.progress = cumulativeProgress;
        job.completedPhases.push(phase.id);

        console.log(`[${jobId}] Phase ${phase.id} complete (${job.progress}% total)`);
      }

      // Mark job complete
      job.status = 'completed';
      job.progress = 100;
      job.endTime = new Date();
      job.duration = job.endTime - job.startTime;

      console.log(`✅ [${jobId}] Regeneration cascade complete for ${seedId} (${job.duration}ms)`);

    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.endTime = new Date();
      console.error(`❌ [${jobId}] Regeneration cascade failed:`, error);
    }
  })();

  return jobId;
}

/**
 * PUT /api/courses/:courseCode/translations/:uuid
 * Update a translation and automatically trigger Phase 3+ regeneration
 */
app.put('/api/courses/:courseCode/translations/:uuid', async (req, res) => {
  try {
    const { courseCode, uuid } = req.params;
    const { source, target } = req.body;
    const coursePath = path.join(CONFIG.VFS_ROOT, courseCode);

    console.log(`[API] Updating translation ${uuid} in ${courseCode}`);
    console.log(`[API] New values - source: "${source}", target: "${target}"`);

    // NEW FORMAT: Read from translations.json
    const translationsPath = path.join(coursePath, 'translations.json');

    if (!await fs.pathExists(translationsPath)) {
      return res.status(404).json({ error: 'translations.json not found' });
    }

    // Load all translations
    const translationsData = await fs.readJson(translationsPath);

    // Find the seed (uuid is actually seed_id in new format)
    const seedId = uuid;
    if (!translationsData[seedId]) {
      return res.status(404).json({ error: `Seed ${seedId} not found` });
    }

    // Update the translation
    // Format: { "S0001": [target_phrase, known_phrase] }
    translationsData[seedId] = [target, source];

    // Write back to translations.json
    await fs.writeJson(translationsPath, translationsData, { spaces: 2 });

    console.log(`[API] Successfully updated ${seedId} in translations.json`);

    // TODO: Optionally trigger LEGO regeneration here
    // For now, just mark that translation was edited

    res.json({
      success: true,
      message: 'Translation updated successfully',
      seed_id: seedId,
      updated: {
        target_phrase: target,
        known_phrase: source
      }
    });
  } catch (error) {
    console.error('[API] Error updating translation:', error);
    res.status(500).json({
      error: 'Failed to update translation',
      details: error.message
    });
  }
});

/**
 * PUT /api/courses/:courseCode/breakdowns/:seedId
 * Update LEGO breakdown for a specific seed
 */
app.put('/api/courses/:courseCode/breakdowns/:seedId', async (req, res) => {
  try {
    const { courseCode, seedId } = req.params;
    const { lego_pairs, feeder_pairs } = req.body;
    const coursePath = path.join(CONFIG.VFS_ROOT, courseCode);

    console.log(`[API] Updating LEGO breakdown for ${seedId} in ${courseCode}`);
    console.log(`[API] New LEGO pairs:`, lego_pairs);
    console.log(`[API] New FEEDER pairs:`, feeder_pairs);

    // Load LEGO_BREAKDOWNS_COMPLETE.json
    const legosPath = path.join(coursePath, 'LEGO_BREAKDOWNS_COMPLETE.json');

    if (!await fs.pathExists(legosPath)) {
      return res.status(404).json({ error: 'LEGO_BREAKDOWNS_COMPLETE.json not found' });
    }

    const legoData = await fs.readJson(legosPath);

    // Find the breakdown for this seed
    const breakdownIndex = legoData.lego_breakdowns.findIndex(b => b.seed_id === seedId);
    if (breakdownIndex === -1) {
      return res.status(404).json({ error: `Breakdown for ${seedId} not found` });
    }

    const breakdown = legoData.lego_breakdowns[breakdownIndex];

    // Update lego_pairs (preserving full structure from frontend)
    breakdown.lego_pairs = lego_pairs.map(pair => ({
      lego_id: pair.lego_id,
      lego_type: pair.lego_type || 'BASE',
      target_chunk: pair.target_chunk,
      known_chunk: pair.known_chunk,
      fd_validated: pair.fd_validated || false,
      componentization: pair.componentization || undefined
    }));

    // Update feeder_pairs if provided
    if (feeder_pairs && feeder_pairs.length > 0) {
      breakdown.feeder_pairs = feeder_pairs.map(feeder => ({
        feeder_id: feeder.feeder_id,
        parent_lego_id: feeder.parent_lego_id,
        target_chunk: feeder.target_chunk,
        known_chunk: feeder.known_chunk
      }));
    } else {
      // Remove feeder_pairs if none provided
      delete breakdown.feeder_pairs;
    }

    // Write back to LEGO_BREAKDOWNS_COMPLETE.json
    await fs.writeJson(legosPath, legoData, { spaces: 2 });

    console.log(`[API] Successfully updated LEGO breakdown for ${seedId}`);

    res.json({
      success: true,
      message: 'LEGO breakdown updated successfully',
      seed_id: seedId,
      lego_pairs: breakdown.lego_pairs,
      feeder_pairs: breakdown.feeder_pairs || []
    });
  } catch (error) {
    console.error('[API] Error updating LEGO breakdown:', error);
    res.status(500).json({
      error: 'Failed to update LEGO breakdown',
      details: error.message
    });
  }
});

// =============================================================================
// VISUALIZATION API ENDPOINTS
// =============================================================================

/**
 * GET /api/visualization/legos/:code
 * Load all deduplicated LEGOs for a course (for LEGO visualizer)
 */
app.get('/api/visualization/legos/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const legosDir = path.join(CONFIG.VFS_ROOT, code, 'amino_acids', 'legos');

    if (!await fs.pathExists(legosDir)) {
      return res.status(404).json({ error: 'LEGOs not found for this course' });
    }

    const files = await fs.readdir(legosDir);
    const legos = [];

    for (const file of files.filter(f => f.endsWith('.json'))) {
      const content = await fs.readJson(path.join(legosDir, file));
      legos.push({ file, ...content });
    }

    res.json({ courseCode: code, legos });
  } catch (err) {
    console.error('[API] Error loading LEGOs:', err);
    res.status(500).json({ error: 'Failed to load LEGOs', details: err.message });
  }
});

/**
 * GET /api/visualization/seed/:uuid
 * Load translation (seed) by UUID (for Seed visualizer)
 */
app.get('/api/visualization/seed/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;

    // Search all courses for this translation UUID
    const courses = await fs.readdir(CONFIG.VFS_ROOT);

    for (const course of courses) {
      const courseDir = path.join(CONFIG.VFS_ROOT, course);
      const stats = await fs.stat(courseDir);

      if (!stats.isDirectory()) continue;

      const translationFile = path.join(courseDir, 'amino_acids', 'translations', `${uuid}.json`);

      if (await fs.pathExists(translationFile)) {
        const translation = await fs.readJson(translationFile);
        return res.json({ courseCode: course, translation });
      }
    }

    res.status(404).json({ error: 'Translation not found' });
  } catch (err) {
    console.error('[API] Error loading seed:', err);
    res.status(500).json({ error: 'Failed to load seed', details: err.message });
  }
});

/**
 * GET /api/visualization/phrases/:code
 * Load all baskets for a course (for Phrase visualizer)
 */
app.get('/api/visualization/phrases/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const basketsDir = path.join(CONFIG.VFS_ROOT, code, 'amino_acids', 'baskets');

    if (!await fs.pathExists(basketsDir)) {
      return res.status(404).json({ error: 'Baskets not found for this course' });
    }

    const files = await fs.readdir(basketsDir);
    const baskets = [];

    for (const file of files.filter(f => f.endsWith('.json'))) {
      const content = await fs.readJson(path.join(basketsDir, file));
      baskets.push({ file, ...content });
    }

    // Sort by basket_id
    baskets.sort((a, b) => (a.basket_id || 0) - (b.basket_id || 0));

    res.json({ courseCode: code, baskets });
  } catch (err) {
    console.error('[API] Error loading phrases:', err);
    res.status(500).json({ error: 'Failed to load phrases', details: err.message });
  }
});

// =============================================================================
// SEED-LEGO BREAKDOWN API
// =============================================================================

/**
 * Helper: Calculate lego_complete status and known language alignment
 */
function calculateLegoAlignment(targetText, sourceText, targetLegos) {
  // Split texts into words
  const targetWords = targetText.split(/\s+/).filter(w => w.length > 0);
  const sourceWords = sourceText.split(/\s+/).filter(w => w.length > 0);

  // Calculate target word coverage
  let targetWordsCovered = 0;
  const legoPairs = [];

  for (const lego of targetLegos) {
    const legoWords = lego.text.split(/\s+/).filter(w => w.length > 0);
    targetWordsCovered += legoWords.length;

    // For now, we'll create a simple proportional alignment for known language
    // This is a placeholder - proper alignment would need linguistic analysis
    const startIdx = Math.floor((lego.position - 1) * sourceWords.length / targetLegos.length);
    const endIdx = Math.floor(lego.position * sourceWords.length / targetLegos.length);
    const knownWords = sourceWords.slice(startIdx, endIdx);

    legoPairs.push({
      uuid: lego.uuid,
      lego_id: lego.provenance,
      target: lego.text,
      known: knownWords.join(' '),
      target_words: legoWords,
      known_words: knownWords,
      position: lego.position,
      word_count: lego.word_count,
      pedagogical_score: lego.pedagogical_score
    });
  }

  // Check if all target words are covered
  const lego_complete = targetWordsCovered === targetWords.length;

  return { legoPairs, lego_complete };
}

/**
 * SELF-LEARNING: Extract patterns from manual edits
 * This is called whenever a human manually edits a LEGO breakdown
 * It analyzes the difference and generates learned rules for future extractions
 */
async function learnFromManualEdit(courseCode, translation, newLegos) {
  try {
    console.log(`[SELF-LEARNING] Analyzing manual edit for seed ${translation.seed_id}`);

    // Get original AI-generated LEGOs (if they exist)
    const originalLegos = translation.metadata?.lego_extraction?.original_legos ||
                         translation.metadata?.lego_extraction?.legos || [];

    if (originalLegos.length === 0) {
      console.log('[SELF-LEARNING] No original LEGOs found for comparison');
      return;
    }

    // Store original LEGOs before overwriting (for future comparison)
    if (!translation.metadata.lego_extraction.original_legos) {
      translation.metadata.lego_extraction.original_legos = [...originalLegos];
    }

    // Analyze the differences
    const analysis = {
      seed_id: translation.seed_id,
      timestamp: new Date().toISOString(),
      original_count: originalLegos.length,
      edited_count: newLegos.length,
      patterns: []
    };

    // Pattern 1: Different LEGO count (merged or split)
    if (newLegos.length !== originalLegos.length) {
      if (newLegos.length < originalLegos.length) {
        analysis.patterns.push({
          type: 'merge',
          description: `Human merged ${originalLegos.length} LEGOs into ${newLegos.length}`,
          context: translation.target_text,
          learned_rule: 'Consider larger LEGO chunks for this pattern'
        });
      } else {
        analysis.patterns.push({
          type: 'split',
          description: `Human split ${originalLegos.length} LEGOs into ${newLegos.length}`,
          context: translation.target_text,
          learned_rule: 'Consider smaller LEGO chunks for this pattern'
        });
      }
    }

    // Pattern 2: Boundary differences (where did splits happen?)
    const originalTexts = originalLegos.map(l => l.text);
    const newTexts = newLegos.map(l => l.text);

    if (JSON.stringify(originalTexts) !== JSON.stringify(newTexts)) {
      analysis.patterns.push({
        type: 'boundary_shift',
        description: 'Human adjusted LEGO boundaries',
        original_breakdown: originalTexts,
        edited_breakdown: newTexts,
        learned_rule: 'Review boundary heuristics for similar constructions'
      });
    }

    // Save learned patterns to course learning file
    const learningPath = path.join(CONFIG.VFS_ROOT, courseCode, 'learned_rules.json');
    let learnedRules = { rules: [], manual_edits: [] };

    if (await fs.pathExists(learningPath)) {
      learnedRules = await fs.readJson(learningPath);
    }

    learnedRules.manual_edits.push(analysis);

    // Extract generalizable rules
    for (const pattern of analysis.patterns) {
      const existingRule = learnedRules.rules.find(r => r.type === pattern.type);

      if (existingRule) {
        existingRule.occurrences += 1;
        existingRule.last_seen = new Date().toISOString();
      } else {
        learnedRules.rules.push({
          type: pattern.type,
          description: pattern.learned_rule,
          occurrences: 1,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          confidence: 0.5, // Start at 50% confidence
          status: 'experimental' // experimental -> validated -> committed
        });
      }
    }

    // Auto-promote rules with high occurrence counts
    for (const rule of learnedRules.rules) {
      if (rule.occurrences >= 5 && rule.status === 'experimental') {
        rule.status = 'validated';
        rule.confidence = 0.8;
        console.log(`[SELF-LEARNING] ✅ Rule promoted to validated: ${rule.description}`);
      }

      if (rule.occurrences >= 10 && rule.status === 'validated') {
        rule.status = 'committed';
        rule.confidence = 0.95;
        console.log(`[SELF-LEARNING] 🎯 Rule committed to prompt DNA: ${rule.description}`);

        // TODO: Actually update the Phase 3 prompt with this rule
        await commitRuleToPrompt(courseCode, rule);
      }
    }

    await fs.writeJson(learningPath, learnedRules, { spaces: 2 });

    console.log(`[SELF-LEARNING] ✅ Learned ${analysis.patterns.length} patterns from manual edit`);
    console.log(`[SELF-LEARNING] Total rules in database: ${learnedRules.rules.length}`);

  } catch (err) {
    console.error('[SELF-LEARNING] Error analyzing manual edit:', err);
    // Don't fail the request if learning fails
  }
}

/**
 * Commit a validated rule to the Phase 3 LEGO extraction prompt
 * This modifies the prompt DNA to include the learned rule
 */
async function commitRuleToPrompt(courseCode, rule) {
  try {
    console.log(`[SELF-LEARNING] Committing rule to prompt: ${rule.description}`);

    // Get current Phase 3 prompt
    const promptPath = path.join(CONFIG.VFS_ROOT, courseCode, 'prompts', 'phase_3_lego_extraction.json');

    if (!await fs.pathExists(promptPath)) {
      console.log('[SELF-LEARNING] Phase 3 prompt not found, cannot commit rule');
      return;
    }

    const promptData = await fs.readJson(promptPath);

    // Add learned rule to prompt instructions
    if (!promptData.learned_rules) {
      promptData.learned_rules = [];
    }

    promptData.learned_rules.push({
      rule: rule.description,
      added: new Date().toISOString(),
      confidence: rule.confidence,
      occurrences: rule.occurrences
    });

    // Update version
    promptData.version = (parseFloat(promptData.version || '1.0') + 0.1).toFixed(1);
    promptData.last_updated = new Date().toISOString();

    await fs.writeJson(promptPath, promptData, { spaces: 2 });

    console.log(`[SELF-LEARNING] 🎯 Rule committed to Phase 3 prompt v${promptData.version}`);

  } catch (err) {
    console.error('[SELF-LEARNING] Error committing rule to prompt:', err);
  }
}

/**
 * GET /api/courses/:code/seed-lego-breakdown?limit=30
 * Returns multiple seeds with their LEGO breakdowns for tiling visualization
 * Now includes known language alignment and lego_complete validation
 */
app.get('/api/courses/:code/seed-lego-breakdown', async (req, res) => {
  try {
    const { code } = req.params;
    const limit = parseInt(req.query.limit) || 30;
    const offset = parseInt(req.query.offset) || 0;

    const translationsDir = path.join(CONFIG.VFS_ROOT, code, 'amino_acids', 'translations');
    const legosDir = path.join(CONFIG.VFS_ROOT, code, 'amino_acids', 'legos');

    if (!await fs.pathExists(translationsDir) || !await fs.pathExists(legosDir)) {
      return res.status(404).json({ error: 'Course data not found' });
    }

    // Read translations
    const translationFiles = await fs.readdir(translationsDir);
    const limitedFiles = translationFiles
      .filter(f => f.endsWith('.json'))
      .slice(offset, offset + limit);

    const seeds = [];

    for (const file of limitedFiles) {
      const translation = await fs.readJson(path.join(translationsDir, file));

      // Find LEGOs for this seed
      const legoFiles = await fs.readdir(legosDir);
      const seedLegos = [];

      for (const legoFile of legoFiles.filter(f => f.endsWith('.json'))) {
        const lego = await fs.readJson(path.join(legosDir, legoFile));

        // Match LEGOs to this translation
        if (lego.source_translation_uuid === translation.uuid) {
          seedLegos.push({
            uuid: lego.uuid,
            text: lego.text,
            provenance: lego.provenance,
            position: lego.position,
            word_count: lego.word_count,
            pedagogical_score: lego.pedagogical_score || 0
          });
        }
      }

      // Sort LEGOs by position
      seedLegos.sort((a, b) => a.position - b.position);

      // Handle multiple field naming conventions
      const sourceText = translation.source || translation.english || translation.source_english;
      const targetText = translation.target || translation.translation || translation.target_italian || translation.target_spanish;

      // Calculate lego_complete and known language alignment
      const { legoPairs, lego_complete } = calculateLegoAlignment(targetText, sourceText, seedLegos);

      seeds.push({
        uuid: translation.uuid,
        seed_id: translation.seed_id || translation.uuid.substring(0, 4),
        source: sourceText,
        target: targetText,
        lego_pairs: legoPairs,
        lego_complete,
        quality_score: translation.metadata?.lego_extraction?.quality_score || translation.quality_score || 0
      });
    }

    res.json({
      courseCode: code,
      total: translationFiles.length,
      offset,
      limit,
      seeds
    });
  } catch (err) {
    console.error('[API] Error loading seed-lego breakdown:', err);
    res.status(500).json({ error: 'Failed to load seed-lego breakdown', details: err.message });
  }
});

/**
 * PUT /api/courses/:code/seeds/:seedId/lego-breakdown
 * Updates the LEGO breakdown for a specific seed
 * Body: { lego_pairs: [{ target: "...", known: "..." }, ...] }
 */
app.put('/api/courses/:code/seeds/:seedId/lego-breakdown', async (req, res) => {
  try {
    const { code, seedId } = req.params;
    const { lego_pairs } = req.body;

    if (!lego_pairs || !Array.isArray(lego_pairs)) {
      return res.status(400).json({ error: 'lego_pairs array is required' });
    }

    console.log(`[API] Updating LEGO breakdown for seed ${seedId} in course ${code}`);

    // Find the translation file
    const translationsPath = path.join(CONFIG.VFS_ROOT, code, 'phase_outputs', 'phase_1_translations');
    const files = await fs.readdir(translationsPath);
    const translationFile = files.find(f => f.includes(seedId));

    if (!translationFile) {
      return res.status(404).json({ error: `Seed ${seedId} not found` });
    }

    const filePath = path.join(translationsPath, translationFile);
    const translation = await fs.readJson(filePath);

    // Get seed_id for provenance labels
    const seedNum = translation.seed_id || translation.uuid.substring(0, 4);

    // Convert lego_pairs to LEGO extraction format with provenance
    const updatedLegos = lego_pairs.map((pair, index) => {
      const position = index + 1;
      const provenance = `S${String(seedNum).padStart(4, '0')}L${String(position).padStart(2, '0')}`;

      return {
        uuid: `${translation.uuid}-L${position}`,
        text: pair.target,
        known: pair.known,
        provenance,
        position,
        word_count: pair.target.split(/\s+/).filter(w => w.length > 0).length,
        pedagogical_score: 50 // Default score
      };
    });

    // Update translation metadata
    if (!translation.metadata) translation.metadata = {};
    if (!translation.metadata.lego_extraction) translation.metadata.lego_extraction = {};

    translation.metadata.lego_extraction.legos = updatedLegos;
    translation.metadata.lego_extraction.manually_edited = true;
    translation.metadata.lego_extraction.edited_at = new Date().toISOString();
    translation.metadata.lego_extraction.quality_score = 10; // Full score for manual edits

    // Save updated translation
    await fs.writeJson(filePath, translation, { spaces: 2 });

    console.log(`[API] Saved ${updatedLegos.length} LEGOs for seed ${seedNum}`);

    // SELF-LEARNING: Analyze manual edit and extract learned rules
    await learnFromManualEdit(code, translation, updatedLegos);

    // Return success with updated breakdown
    const { legoPairs, lego_complete } = calculateLegoAlignment(
      translation.target_text,
      translation.source_text,
      updatedLegos
    );

    res.json({
      success: true,
      seed_id: seedNum,
      lego_pairs: legoPairs,
      lego_complete,
      message: 'LEGO breakdown updated successfully'
    });

  } catch (err) {
    console.error('[API] Error updating LEGO breakdown:', err);
    res.status(500).json({ error: 'Failed to update LEGO breakdown', details: err.message });
  }
});

/**
 * GET /api/courses/:code/lego/:legoProvenance/basket
 * Returns e-phrases and d-phrases for one LEGO from Phase 5 baskets
 * legoProvenance example: S0005L01
 */
app.get('/api/courses/:code/lego/:legoProvenance/basket', async (req, res) => {
  try {
    const { code, legoProvenance } = req.params;
    const basketsFile = path.join(CONFIG.VFS_ROOT, code, 'phase_outputs', 'phase_5_baskets.json');

    if (!await fs.pathExists(basketsFile)) {
      return res.status(404).json({ error: 'Phase 5 baskets not found for this course' });
    }

    const basketsData = await fs.readJson(basketsFile);

    // Phase 5 baskets.json structure: { "baskets": { "S####L##": {...}, ... } }
    const baskets = basketsData.baskets || basketsData;
    let basket = baskets[legoProvenance];

    if (!basket) {
      return res.status(404).json({ error: `Basket not found for LEGO ${legoProvenance}` });
    }

    // Detect and normalize basket format (backward compatibility for Italian course)
    // Old format: has 'lego_uuid_list' property
    // New format: has 'lego_manifest' property
    const isLegacyFormat = basket.lego_uuid_list !== undefined;

    if (isLegacyFormat) {
      // Convert old format to new format for consistent frontend display
      basket = {
        ...basket,
        lego_manifest: basket.lego_uuid_list, // Map old field to new
        format: 'legacy'
      };
    } else {
      basket = { ...basket, format: 'v7' };
    }

    // Calculate stats
    const ePhraseCount = basket.e_phrases ? basket.e_phrases.length : 0;
    const dPhraseCount = basket.d_phrases ?
      Object.values(basket.d_phrases).reduce((sum, phrases) => sum + phrases.length, 0) : 0;

    res.json({
      courseCode: code,
      legoProvenance,
      target: basket.target,
      known: basket.known,
      seedOrigin: basket.seed_origin,
      ePhrases: basket.e_phrases || [],
      dPhrases: basket.d_phrases || {},
      format: basket.format, // Indicate which format was used
      stats: {
        ePhraseCount,
        dPhraseCount,
        totalPhrases: ePhraseCount + dPhraseCount
      }
    });
  } catch (err) {
    console.error('[API] Error loading LEGO basket:', err);
    res.status(500).json({ error: 'Failed to load LEGO basket', details: err.message });
  }
});

// =============================================================================
// LANGUAGES API
// =============================================================================

/**
 * GET /api/languages
 * Return list of supported languages with ISO 639-3 codes
 */
app.get('/api/languages', (req, res) => {
  const languages = [
    { code: 'afr', name: 'Afrikaans', native: 'Afrikaans' },
    { code: 'ara', name: 'Arabic', native: 'العربية' },
    { code: 'ben', name: 'Bengali', native: 'বাংলা' },
    { code: 'bre', name: 'Breton', native: 'Brezhoneg' },
    { code: 'bul', name: 'Bulgarian', native: 'Български' },
    { code: 'cat', name: 'Catalan', native: 'Català' },
    { code: 'cmn', name: 'Mandarin Chinese', native: '中文' },
    { code: 'cor', name: 'Cornish', native: 'Kernewek' },
    { code: 'ces', name: 'Czech', native: 'Čeština' },
    { code: 'cym', name: 'Welsh', native: 'Cymraeg' },
    { code: 'dan', name: 'Danish', native: 'Dansk' },
    { code: 'deu', name: 'German', native: 'Deutsch' },
    { code: 'ell', name: 'Greek', native: 'Ελληνικά' },
    { code: 'eng', name: 'English', native: 'English' },
    { code: 'eus', name: 'Basque', native: 'Euskara' },
    { code: 'fas', name: 'Persian', native: 'فارسی' },
    { code: 'fra', name: 'French', native: 'Français' },
    { code: 'gla', name: 'Scottish Gaelic', native: 'Gàidhlig' },
    { code: 'gle', name: 'Irish', native: 'Gaeilge' },
    { code: 'glv', name: 'Manx', native: 'Gaelg' },
    { code: 'heb', name: 'Hebrew', native: 'עברית' },
    { code: 'hin', name: 'Hindi', native: 'हिन्दी' },
    { code: 'hrv', name: 'Croatian', native: 'Hrvatski' },
    { code: 'hun', name: 'Hungarian', native: 'Magyar' },
    { code: 'ind', name: 'Indonesian', native: 'Bahasa Indonesia' },
    { code: 'isl', name: 'Icelandic', native: 'Íslenska' },
    { code: 'ita', name: 'Italian', native: 'Italiano' },
    { code: 'jpn', name: 'Japanese', native: '日本語' },
    { code: 'kor', name: 'Korean', native: '한국어' },
    { code: 'mkd', name: 'Macedonian', native: 'Македонски' },
    { code: 'msa', name: 'Malay', native: 'Bahasa Melayu' },
    { code: 'nld', name: 'Dutch', native: 'Nederlands' },
    { code: 'nor', name: 'Norwegian', native: 'Norsk' },
    { code: 'pol', name: 'Polish', native: 'Polski' },
    { code: 'por', name: 'Portuguese', native: 'Português' },
    { code: 'ron', name: 'Romanian', native: 'Română' },
    { code: 'rus', name: 'Russian', native: 'Русский' },
    { code: 'slk', name: 'Slovak', native: 'Slovenčina' },
    { code: 'slv', name: 'Slovenian', native: 'Slovenščina' },
    { code: 'spa', name: 'Spanish', native: 'Español' },
    { code: 'srp', name: 'Serbian', native: 'Српски' },
    { code: 'swa', name: 'Swahili', native: 'Kiswahili' },
    { code: 'swe', name: 'Swedish', native: 'Svenska' },
    { code: 'tgl', name: 'Tagalog', native: 'Tagalog' },
    { code: 'tha', name: 'Thai', native: 'ไทย' },
    { code: 'tur', name: 'Turkish', native: 'Türkçe' },
    { code: 'ukr', name: 'Ukrainian', native: 'Українська' },
    { code: 'urd', name: 'Urdu', native: 'اردو' },
    { code: 'vie', name: 'Vietnamese', native: 'Tiếng Việt' },
    { code: 'yue', name: 'Cantonese', native: '粵語' }
  ];

  // Sort by English name
  languages.sort((a, b) => a.name.localeCompare(b.name));

  res.json(languages);
});

// =============================================================================
// PROMPT MANAGEMENT API (Self-Improving DNA)
// =============================================================================

/**
 * GET /api/prompts/:phase
 * Fetch current prompt for a phase from docs/phase_intelligence/
 */
app.get('/api/prompts/:phase', (req, res) => {
  const { phase } = req.params;

  const promptContent = PHASE_PROMPTS[phase];

  if (!promptContent) {
    return res.status(404).json({ error: `Phase ${phase} not found` });
  }

  res.json({
    phase: phase,
    name: `Phase ${phase}`,
    prompt: promptContent,
    version: '7.0.1',
    lastModified: new Date().toISOString()
  });
});

/**
 * PUT /api/prompts/:phase
 * Update phase prompt in APML file and regenerate registry
 */
app.put('/api/prompts/:phase', async (req, res) => {
  const { phase } = req.params;
  const { prompt, changelog, improvedBy = 'human' } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt content required' });
  }

  try {
    const apmlPath = path.join(__dirname, 'ssi-course-production.apml');
    let apmlContent = await fs.readFile(apmlPath, 'utf8');

    // Find and replace the prompt section
    const phaseRegex = new RegExp(
      `(## Phase ${phase}:[\\s\\S]*?PROMPT: \\|)([\\s\\S]*?)((?=\\n## Phase|\\n# =====|$))`,
      'm'
    );

    const match = apmlContent.match(phaseRegex);
    if (!match) {
      return res.status(404).json({ error: `Phase ${phase} section not found in APML` });
    }

    // Replace the prompt
    apmlContent = apmlContent.replace(phaseRegex, `$1\n${prompt}\n$3`);

    // Write updated APML
    await fs.writeFile(apmlPath, apmlContent);

    // Git commit
    const commitMessage = changelog || `Update Phase ${phase} prompt (${improvedBy})`;
    await execAsync(`cd ${__dirname} && git add ssi-course-production.apml && git commit -m "${commitMessage}"`);

    // Regenerate registry
    await execAsync(`cd ${__dirname} && node scripts/compile-apml-registry.cjs`);

    // Reload registry
    delete require.cache[require.resolve('./.apml-registry.json')];
    const updatedRegistry = require('./.apml-registry.json');

    // Reload PHASE_PROMPTS in memory
    for (const [key, value] of Object.entries(updatedRegistry.variable_registry.PHASE_PROMPTS)) {
      PHASE_PROMPTS[value.phase] = value.prompt;
    }

    console.log(`✅ Updated Phase ${phase} prompt (${improvedBy})`);

    res.json({
      success: true,
      phase,
      message: 'Prompt updated and committed',
      version: updatedRegistry.version,
      improvedBy
    });
  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(500).json({ error: 'Failed to update prompt', details: error.message });
  }
});

/**
 * GET /api/prompts/:phase/history
 * Get Git history of prompt changes
 */
app.get('/api/prompts/:phase/history', async (req, res) => {
  const { phase } = req.params;

  try {
    // Git log for APML file, filtered to Phase changes
    const { stdout } = await execAsync(
      `cd ${__dirname} && git log --follow --pretty=format:"%H|%an|%ai|%s" -- ssi-course-production.apml | grep -i "phase ${phase}" || true`
    );

    const history = stdout.split('\n').filter(Boolean).map(line => {
      const [hash, author, date, message] = line.split('|');
      return { hash, author, date, message };
    });

    res.json({ phase, history });
  } catch (error) {
    console.error('Error fetching prompt history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// =============================================================================
// VFS API - CLOUD-NATIVE FILE OPERATIONS (S3)
// =============================================================================

const AWS = require('aws-sdk');

// Configure S3 client
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-west-1'
});

const S3_BUCKET = process.env.S3_BUCKET || 'popty-bach-lfs';

/**
 * GET /api/vfs/courses
 * List all courses in S3
 */
app.get('/api/vfs/courses', async (req, res) => {
  try {
    const result = await s3.listObjectsV2({
      Bucket: S3_BUCKET,
      Prefix: 'courses/',
      Delimiter: '/'
    }).promise();

    const courses = result.CommonPrefixes
      ? result.CommonPrefixes.map(p => p.Prefix.replace('courses/', '').replace('/', ''))
      : [];

    console.log(`✅ Listed ${courses.length} courses from S3`);
    res.json({ courses });
  } catch (error) {
    console.error('❌ S3 list error:', error.message);
    res.status(500).json({ error: 'Failed to list courses', detail: error.message });
  }
});

/**
 * GET /api/vfs/courses/:code/:file
 * Read a course file from S3 (JSON only, not audio)
 */
app.get('/api/vfs/courses/:code/:file(*)', async (req, res) => {
  const { code, file } = req.params;
  const key = `courses/${code}/${file}`;

  // Only allow JSON files (Phase 1-7), not audio (Phase 8 is Kai's)
  if (!file.endsWith('.json')) {
    return res.status(400).json({ error: 'Only JSON files supported in VFS API' });
  }

  try {
    const obj = await s3.getObject({ Bucket: S3_BUCKET, Key: key }).promise();

    const content = obj.Body.toString('utf8');
    console.log(`✅ Read ${key} from S3 (${content.length} bytes)`);

    res.type('application/json').send(content);
  } catch (error) {
    if (error.code === 'NoSuchKey') {
      console.log(`⚠️  File not found: ${key}`);
      res.status(404).json({ error: 'File not found', key });
    } else {
      console.error(`❌ S3 read error for ${key}:`, error.message);
      res.status(500).json({ error: 'Failed to read file', detail: error.message });
    }
  }
});

/**
 * PUT /api/vfs/courses/:code/:file
 * Write a course file to S3 (JSON only)
 */
app.put('/api/vfs/courses/:code/:file(*)', async (req, res) => {
  const { code, file } = req.params;
  const key = `courses/${code}/${file}`;

  // Only allow JSON files
  if (!file.endsWith('.json')) {
    return res.status(400).json({ error: 'Only JSON files supported in VFS API' });
  }

  try {
    // Get raw body content
    let content;
    if (typeof req.body === 'string') {
      content = req.body;
    } else if (typeof req.body === 'object') {
      content = JSON.stringify(req.body, null, 2);
    } else {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    await s3.putObject({
      Bucket: S3_BUCKET,
      Key: key,
      Body: content,
      ContentType: 'application/json',
      ACL: 'private' // Course data is private (not audio)
    }).promise();

    console.log(`✅ Wrote ${key} to S3 (${content.length} bytes)`);
    res.json({ success: true, key, size: content.length });
  } catch (error) {
    console.error(`❌ S3 write error for ${key}:`, error.message);
    res.status(500).json({ error: 'Failed to write file', detail: error.message });
  }
});

/**
 * DELETE /api/vfs/courses/:code/:file
 * Delete a course file from S3 (JSON only)
 */
app.delete('/api/vfs/courses/:code/:file(*)', async (req, res) => {
  const { code, file } = req.params;
  const key = `courses/${code}/${file}`;

  // Only allow JSON files
  if (!file.endsWith('.json')) {
    return res.status(400).json({ error: 'Only JSON files supported in VFS API' });
  }

  try {
    await s3.deleteObject({ Bucket: S3_BUCKET, Key: key }).promise();

    console.log(`✅ Deleted ${key} from S3`);
    res.json({ success: true, key });
  } catch (error) {
    console.error(`❌ S3 delete error for ${key}:`, error.message);
    res.status(500).json({ error: 'Failed to delete file', detail: error.message });
  }
});

// =============================================================================
// VALIDATION API
// =============================================================================

/**
 * POST /api/courses/:courseCode/validate/:phase
 * Run automated validation on a phase's output
 */
app.post('/api/courses/:courseCode/validate/:phase', async (req, res) => {
  const { courseCode, phase } = req.params;

  try {
    const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);

    if (!await fs.pathExists(courseDir)) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const result = await validatePhase(phase, courseDir);

    if (result.valid) {
      res.json({
        success: true,
        phase: phase,
        message: `Phase ${phase} validation passed`,
        stats: result.stats
      });
    } else {
      res.status(422).json({
        success: false,
        phase: phase,
        message: `Phase ${phase} validation failed`,
        errors: result.errors,
        stats: result.stats
      });
    }

  } catch (error) {
    console.error(`[Validation API] Error validating phase ${phase}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// PHASE INTELLIGENCE - STATIC FILE SERVING
// =============================================================================

/**
 * GET /phase-intelligence/:phase
 * Serve phase intelligence markdown files as static content
 *
 * Example: GET /phase-intelligence/3
 *          → Serves docs/phase_intelligence/phase_3_extraction.md
 */
app.get('/phase-intelligence/:phase', async (req, res) => {
  const { phase } = req.params;

  try {
    const intelligenceDir = path.join(__dirname, 'docs', 'phase_intelligence');

    // Find matching file: phase_3_*.md
    const files = await fs.readdir(intelligenceDir);
    const matchingFile = files.find(f =>
      f.startsWith(`phase_${phase}_`) && f.endsWith('.md')
    );

    if (!matchingFile) {
      // Fallback to legacy APML prompts
      const promptKey = `PHASE_${phase.replace('.', '_')}`;
      const promptData = apmlRegistry.variable_registry.PHASE_PROMPTS[promptKey];

      if (promptData) {
        console.log(`⚠️  Phase ${phase} module not found, falling back to APML prompt`);
        return res.type('text/markdown').send(promptData.prompt);
      }

      return res.status(404).type('text/plain').send(`Phase ${phase} intelligence not found`);
    }

    // Read and serve markdown file
    const filePath = path.join(intelligenceDir, matchingFile);
    const content = await fs.readFile(filePath, 'utf8');

    console.log(`✅ Served phase ${phase} intelligence: ${matchingFile}`);
    res.type('text/markdown').send(content);

  } catch (error) {
    console.error(`Error serving phase ${phase} intelligence:`, error);
    res.status(500).type('text/plain').send('Error loading phase intelligence');
  }
});

// =============================================================================
// SEEDS API - CANONICAL SEEDS
// =============================================================================

/**
 * GET /api/seeds
 * Serve canonical seeds as pipe-delimited text (much more token-efficient than JSON)
 *
 * Query params:
 *   ?limit=N    - Return first N seeds only
 *   ?offset=N   - Skip first N seeds
 *   ?format=json - Return as JSON array instead of text
 *
 * Examples:
 *   GET /api/seeds              → All 668 seeds as text
 *   GET /api/seeds?limit=30     → First 30 seeds
 *   GET /api/seeds?format=json  → JSON array format
 */
app.get('/api/seeds', async (req, res) => {
  try {
    const seedsPath = path.join(__dirname, 'seeds', 'canonical_seeds.txt');
    const content = await fs.readFile(seedsPath, 'utf8');
    const allSeeds = content.trim().split('\n');

    const { limit, offset, format } = req.query;

    // Apply offset/limit
    let seeds = allSeeds;
    if (offset) seeds = seeds.slice(parseInt(offset));
    if (limit) seeds = seeds.slice(0, parseInt(limit));

    // Return as JSON if requested
    if (format === 'json') {
      const jsonSeeds = seeds.map(line => {
        const [seed_id, source] = line.split('|');
        return { seed_id, source };
      });
      return res.json({
        total: allSeeds.length,
        returned: jsonSeeds.length,
        seeds: jsonSeeds
      });
    }

    // Default: return as pipe-delimited text
    res.type('text/plain').send(seeds.join('\n'));
    console.log(`✅ Served ${seeds.length}/${allSeeds.length} canonical seeds`);

  } catch (error) {
    console.error('Error serving seeds:', error);
    res.status(500).type('text/plain').send('Error loading canonical seeds');
  }
});

/**
 * GET /api/apml/full
 * Return complete APML document structure
 */
app.get('/api/apml/full', async (req, res) => {
  try {
    const apmlPath = path.join(__dirname, 'ssi-course-production.apml');
    const apmlContent = await fs.readFile(apmlPath, 'utf8');

    // Parse APML structure (basic parsing - can be enhanced later)
    const versionMatch = apmlContent.match(/VERSION:\s*([0-9.]+)/);
    const version = versionMatch ? versionMatch[1] : '7.0.0';

    const stats = await fs.stat(apmlPath);

    res.json({
      version,
      raw_content: apmlContent,
      file_path: apmlPath,
      size_bytes: apmlContent.length,
      last_modified: stats.mtime
    });
  } catch (error) {
    console.error('[API] Failed to read APML:', error);
    res.status(500).json({ error: 'Failed to read APML file' });
  }
});

// =============================================================================
// RECURSIVE UP-REGULATION / FINE-TUNING API
// =============================================================================

/**
 * GET /api/metrics/generations
 * Load all generation metrics for comparison
 */
app.get('/api/metrics/generations', async (req, res) => {
  try {
    const testingDir = path.join(__dirname, 'skills', 'lego-extraction-skill', 'testing');

    // Load Generation 0 baseline
    const gen0Path = path.join(testingDir, 'generation-0-baseline.json');
    let gen0 = null;
    if (await fs.pathExists(gen0Path)) {
      gen0 = await fs.readJson(gen0Path);
    }

    // Load Generation 1 results (if exists)
    const gen1Path = path.join(testingDir, 'generation-1-results.json');
    let gen1 = null;
    if (await fs.pathExists(gen1Path)) {
      gen1 = await fs.readJson(gen1Path);
    }

    // Load comparison results (if exists)
    const comparisonPath = path.join(testingDir, 'generation-comparison.json');
    let comparison = null;
    if (await fs.pathExists(comparisonPath)) {
      comparison = await fs.readJson(comparisonPath);
    }

    res.json({
      generation_0: gen0,
      generation_1: gen1,
      comparison: comparison,
      current_generation: gen1 ? 1 : 0
    });
  } catch (error) {
    console.error('[API] Failed to load generation metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/fine-tuning/ready
 * Check if system is ready to start fine-tuning
 */
app.get('/api/fine-tuning/ready', async (req, res) => {
  try {
    const trainingDir = path.join(__dirname, 'skills', 'lego-extraction-skill', 'training', 'anthropic-format');
    const testingDir = path.join(__dirname, 'skills', 'lego-extraction-skill', 'testing');

    // Check prerequisites (API key will be checked by Claude Code, not Node.js)
    const trainingDataExists = await fs.pathExists(path.join(trainingDir, 'training.jsonl'));
    const validationDataExists = await fs.pathExists(path.join(trainingDir, 'validation.jsonl'));
    const baselineExists = await fs.pathExists(path.join(testingDir, 'generation-0-baseline.json'));

    const ready = trainingDataExists && validationDataExists && baselineExists;

    res.json({
      ready,
      prerequisites: {
        training_data: trainingDataExists,
        validation_data: validationDataExists,
        baseline_metrics: baselineExists,
        claude_code_configured: true // Claude Code has API access
      }
    });
  } catch (error) {
    console.error('[API] Failed to check fine-tuning readiness:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/fine-tuning/start
 * Start fine-tuning job via Claude Code (osascript → Warp → Claude)
 */
app.post('/api/fine-tuning/start', async (req, res) => {
  try {
    const skillDir = path.join(__dirname, 'skills', 'lego-extraction-skill');

    // Create prompt for Claude Code to start fine-tuning
    const prompt = `Start the Anthropic fine-tuning job for Generation 1 LEGO extraction model.

**Training Data:**
- Training: skills/lego-extraction-skill/training/anthropic-format/training.jsonl (408 examples)
- Validation: skills/lego-extraction-skill/training/anthropic-format/validation.jsonl (45 examples)

**Task:**
1. Read the START_FINE_TUNING.md guide: skills/lego-extraction-skill/testing/START_FINE_TUNING.md
2. Use the Anthropic SDK to create a fine-tuning job:
   - Base model: claude-sonnet-4-5
   - Suffix: ssi-lego-v1
   - Upload the training.jsonl and validation.jsonl files
3. Save the job details to: skills/lego-extraction-skill/testing/fine-tuning-job.json

Format:
\`\`\`json
{
  "job_id": "the-job-id",
  "status": "pending",
  "model": "claude-sonnet-4-5",
  "started_at": "2025-10-18T...",
  "fine_tuned_model": null
}
\`\`\`

This starts Generation 1 training to prove recursive up-regulation works!`;

    // Write prompt to temp file
    const promptFile = path.join(__dirname, `.fine-tuning-start-${Date.now()}.txt`);
    await fs.writeFile(promptFile, prompt, 'utf8');

    console.log('[Fine-Tuning] Spawning Claude Code to start fine-tuning...');

    // Spawn Claude Code via osascript (same pattern as spawnPhaseAgent)
    const { spawn } = require('child_process');
    const appleScript = `
tell application "Warp"
    activate
    tell application "System Events"
        keystroke "t" using {command down}
    end tell
    delay 0.5
    do script "cd \\"${skillDir}\\" && echo '═══════════════════════════════════════════════════════' && echo 'Fine-Tuning: Generation 1' && echo '═══════════════════════════════════════════════════════' && echo '' && cat \\"${promptFile}\\" && echo '' && echo '═══════════════════════════════════════════════════════'"
end tell
    `.trim();

    const child = spawn('osascript', ['-e', appleScript], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    // Clean up temp file after delay
    setTimeout(() => {
      fs.unlink(promptFile).catch(() => {});
    }, 5000);

    res.json({
      success: true,
      message: 'Fine-tuning task sent to Claude Code. Check Warp terminal for progress.',
      note: 'Job details will be saved to: skills/lego-extraction-skill/testing/fine-tuning-job.json'
    });
  } catch (error) {
    console.error('[API] Failed to start fine-tuning:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/fine-tuning/status/:jobId
 * Poll fine-tuning job status (reads from file written by Claude Code)
 */
app.get('/api/fine-tuning/status/:jobId', async (req, res) => {
  try {
    const jobFile = path.join(__dirname, 'skills', 'lego-extraction-skill', 'testing', 'fine-tuning-job.json');

    if (!await fs.pathExists(jobFile)) {
      return res.status(404).json({
        error: 'Fine-tuning job file not found',
        note: 'Job may not have started yet, or Claude Code may still be processing'
      });
    }

    const jobData = await fs.readJson(jobFile);

    res.json({
      job_id: jobData.job_id,
      status: jobData.status,
      fine_tuned_model: jobData.fine_tuned_model || null,
      created_at: jobData.started_at,
      completed_at: jobData.completed_at || null,
      updated_at: jobData.updated_at || null
    });
  } catch (error) {
    console.error('[API] Failed to get fine-tuning status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/fine-tuning/compare
 * Run A/B comparison between Generation 0 and Generation 1
 */
app.post('/api/fine-tuning/compare', async (req, res) => {
  try {
    const scriptPath = path.join(__dirname, 'skills', 'lego-extraction-skill', 'testing', 'compare-generations.cjs');

    // Run comparison script
    const { stdout, stderr } = await execAsync(`node ${scriptPath}`);

    // Load comparison results
    const comparisonPath = path.join(__dirname, 'skills', 'lego-extraction-skill', 'testing', 'generation-comparison.json');
    const results = await fs.readJson(comparisonPath);

    res.json({
      success: true,
      results,
      console_output: stdout
    });
  } catch (error) {
    console.error('[API] Failed to run comparison:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// VALIDATION ENDPOINTS
// =============================================================================

// Load schemas
const SCHEMAS = {
  phase1: require('./schemas/phase1-seed_pairs.json'),
  phase3: require('./schemas/phase3-lego_pairs.json'),
  phase5: require('./schemas/phase5-lego_baskets.json')
};

// Compile validators
const validators = {
  phase1: ajv.compile(SCHEMAS.phase1),
  phase3: ajv.compile(SCHEMAS.phase3),
  phase5: ajv.compile(SCHEMAS.phase5)
};

/**
 * POST /api/validate/phase/:phase
 * Validate phase output against canonical schema
 */
app.post('/api/validate/phase/:phase', (req, res) => {
  const { phase } = req.params;
  const data = req.body;

  const validatorKey = `phase${phase}`;
  const validator = validators[validatorKey];

  if (!validator) {
    return res.status(400).json({ error: `No validator for phase ${phase}` });
  }

  const valid = validator(data);

  if (!valid) {
    return res.json({
      valid: false,
      errors: validator.errors
    });
  }

  res.json({ valid: true });
});

// =============================================================================
// PHASE EXECUTION ENDPOINTS (Phase 2, 6, 7, 8 - APML v7.6)
// =============================================================================

/**
 * POST /api/courses/:courseCode/phase/2
 * Execute Phase 2: Corpus Analysis
 */
app.post('/api/courses/:courseCode/phase/2', async (req, res) => {
  const { courseCode } = req.params;

  try {
    console.log(`[Phase 2] Starting corpus analysis for ${courseCode}...`);

    const courseDir = await ensureCourseDirectory(courseCode);

    // Check if course exists
    if (!await fs.pathExists(courseDir)) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Get or create job
    let job = STATE.jobs.get(courseCode);
    if (!job) {
      job = {
        courseCode,
        status: 'in_progress',
        phase: 'phase_2',
        progress: 0,
        startTime: new Date()
      };
      STATE.jobs.set(courseCode, job);
    }

    // Construct prompt for Claude agent
    const prompt = `# Phase 2: Corpus Analysis for ${courseCode}

## Instructions
Please visit ${CONFIG.TRAINING_URL}/phase/2 for complete phase instructions.

## Task Summary
1. Load translations.json from ${courseDir}
2. Analyze FCFS (First-Can-First-Say) chronological order
3. Calculate utility scores for each translation
4. Output phase_2_corpus_intelligence.json

## Working Directory
${courseDir}

## Output File
phase_outputs/phase_2_corpus_intelligence.json

Begin Phase 2 now.`;

    // Update job status
    job.phase = 'phase_2';
    job.progress = 35;

    // Spawn agent
    console.log(`[Phase 2] Spawning Claude Code agent for ${courseCode}...`);
    await spawnPhaseAgent('2', prompt, courseDir, courseCode);

    res.json({
      success: true,
      message: 'Phase 2 (Corpus Analysis) agent spawned successfully',
      courseCode,
      phase: 'phase_2',
      status: job
    });
  } catch (err) {
    console.error('[Phase 2] Error:', err);
    if (STATE.jobs.has(courseCode)) {
      const job = STATE.jobs.get(courseCode);
      job.status = 'failed';
      job.error = err.message;
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/courses/:courseCode/phase/6
 * Execute Phase 6: Introduction Generation
 */
app.post('/api/courses/:courseCode/phase/6', async (req, res) => {
  const { courseCode } = req.params;

  try {
    console.log(`[Phase 6] Starting introduction generation for ${courseCode}...`);

    const courseDir = await ensureCourseDirectory(courseCode);

    // Check if course exists
    if (!await fs.pathExists(courseDir)) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Get or create job
    let job = STATE.jobs.get(courseCode);
    if (!job) {
      job = {
        courseCode,
        status: 'in_progress',
        phase: 'phase_6',
        progress: 0,
        startTime: new Date()
      };
      STATE.jobs.set(courseCode, job);
    }

    // Construct prompt for Claude agent
    const prompt = `# Phase 6: Introduction Generation for ${courseCode}

## Instructions
Please visit ${CONFIG.TRAINING_URL}/phase/6 for complete phase instructions.

## Task Summary
1. Load baskets_deduplicated.json and lego_provenance_map.json from ${courseDir}
2. For each basket, identify known LEGOs from previous baskets
3. Generate known-only introduction phrases (zero unknown elements)
4. Include seed context for contextual introductions
5. Skip introductions for duplicate LEGOs (use provenance map)
6. Output phase_outputs/phase_6_introductions.json

## Working Directory
${courseDir}

## Output File
phase_outputs/phase_6_introductions.json

## Key Rules
- Introductions must contain ONLY known elements (already learned LEGOs)
- Use seed context for pedagogical value
- Skip duplicates automatically using provenance map
- Format: contextual natural language in known language only

Begin Phase 6 now.`;

    // Update job status
    job.phase = 'phase_6';
    job.progress = 96;

    // Spawn agent
    console.log(`[Phase 6] Spawning Claude Code agent for ${courseCode}...`);
    await spawnPhaseAgent('6', prompt, courseDir, courseCode);

    res.json({
      success: true,
      message: 'Phase 6 (Introductions) agent spawned successfully',
      courseCode,
      phase: 'phase_6',
      status: job
    });
  } catch (err) {
    console.error('[Phase 6] Error:', err);
    if (STATE.jobs.has(courseCode)) {
      const job = STATE.jobs.get(courseCode);
      job.status = 'failed';
      job.error = err.message;
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/courses/:courseCode/compile
 * Execute Phase 7: Course Compilation (VFS → App JSON)
 */
app.post('/api/courses/:courseCode/compile', async (req, res) => {
  const { courseCode } = req.params;

  try {
    console.log(`[Phase 7] Starting course compilation for ${courseCode}...`);

    const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);

    // Check if course exists
    if (!await fs.pathExists(courseDir)) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Get or create job
    let job = STATE.jobs.get(courseCode);
    if (!job) {
      job = {
        courseCode,
        status: 'in_progress',
        phase: 'compilation',
        progress: 0,
        startTime: new Date()
      };
      STATE.jobs.set(courseCode, job);
    }

    // Update job status
    job.phase = 'compilation';
    job.progress = 99;

    // Use existing compileManifest function
    await compileManifest(courseCode);

    // TODO: Enhance this to match Phase 7 spec from dashboard
    // Current compileManifest creates basic manifest with legos, baskets, graph
    // Phase 7 spec requires full app-ready JSON with:
    // - seeds[] with introductionItems
    // - samples{} object with roles and metadata
    // - slices structure
    // - Full course metadata (languages, version, ID)
    //
    // For now, the basic manifest is saved to proteins/manifest.json
    // Full Phase 7 implementation should write to compiled.json

    const manifestPath = path.join(courseDir, 'proteins', 'manifest.json');
    const manifest = await fs.readJson(manifestPath);

    job.status = 'completed';
    job.progress = 100;
    job.endTime = new Date();

    res.json({
      success: true,
      message: 'Phase 7 (Course Compilation) completed - basic manifest generated',
      courseCode,
      manifest: manifest,
      note: 'Full app-ready JSON compilation (slices, seeds, samples) requires enhancement'
    });
  } catch (err) {
    console.error('[Phase 7] Error:', err);
    if (STATE.jobs.has(courseCode)) {
      const job = STATE.jobs.get(courseCode);
      job.status = 'failed';
      job.error = err.message;
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/audio/check-s3
 * Check which audio files exist in AWS S3
 */
app.post('/api/audio/check-s3', async (req, res) => {
  const { sampleIds } = req.body;

  try {
    console.log(`[Audio] Checking S3 status for ${sampleIds?.length || 0} samples...`);

    // TODO: Implement S3 check logic tomorrow
    // - Query AWS S3 bucket for existing audio files
    // - Compare with requested sample IDs
    // - Return available/missing counts and ID lists

    res.status(501).json({
      error: 'Audio S3 check not yet implemented',
      message: 'Phase 8: Audio S3 check endpoint stub - implementation pending',
      sampleCount: sampleIds?.length || 0,
      nextSteps: [
        'Configure AWS S3 credentials',
        'Query S3 bucket for existing {uuid}.mp3 files',
        'Compare with requested sample IDs',
        'Return {available, missing, total, availableIds}'
      ]
    });
  } catch (err) {
    console.error('[Audio] S3 check error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/audio/generate-missing
 * Generate missing audio files using TTS
 */
app.post('/api/audio/generate-missing', async (req, res) => {
  const { courseCode, missingAudio } = req.body;

  try {
    console.log(`[Audio] Starting audio generation for ${missingAudio?.length || 0} samples...`);

    // TODO: Implement audio generation logic tomorrow
    // - Parse missing audio requirements (text, role, cadence)
    // - Use TTS service (ElevenLabs/AWS Polly) to synthesize audio
    // - Upload generated files to S3 with UUID-based naming
    // - Track progress for job status queries

    const jobId = `audio_gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    res.status(501).json({
      error: 'Audio generation not yet implemented',
      message: 'Phase 8: Audio generation endpoint stub - implementation pending',
      jobId,
      sampleCount: missingAudio?.length || 0,
      nextSteps: [
        'Configure TTS service (ElevenLabs/AWS Polly)',
        'Generate audio for each sample',
        'Upload to S3 as {uuid}.mp3',
        'Track job progress',
        'Support polling via /api/audio/generation-status/:jobId'
      ]
    });
  } catch (err) {
    console.error('[Audio] Generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/audio/generation-status/:jobId
 * Get audio generation job status
 */
app.get('/api/audio/generation-status/:jobId', async (req, res) => {
  const { jobId } = req.params;

  try {
    console.log(`[Audio] Checking status for job ${jobId}...`);

    // TODO: Implement job status tracking tomorrow
    // - Query job status from database or in-memory store
    // - Return progress, completed count, status

    res.status(501).json({
      error: 'Audio generation status not yet implemented',
      message: 'Phase 8: Audio status endpoint stub - implementation pending',
      jobId,
      nextSteps: [
        'Implement job tracking system',
        'Store job progress in database',
        'Return {status, completed, total, errors}'
      ]
    });
  } catch (err) {
    console.error('[Audio] Status check error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/courses/:courseCode/deploy
 * Deploy compiled course to production
 */
app.post('/api/courses/:courseCode/deploy', async (req, res) => {
  const { courseCode } = req.params;
  const { courseJSON } = req.body;

  try {
    console.log(`[Deploy] Starting deployment for ${courseCode}...`);

    // TODO: Implement deployment logic tomorrow
    // - Validate course JSON structure
    // - Verify all audio files are available in S3
    // - Deploy to production environment
    // - Update course status

    res.status(501).json({
      error: 'Deployment not yet implemented',
      message: 'Course deployment endpoint stub - implementation pending',
      courseCode,
      nextSteps: [
        'Validate course JSON',
        'Verify audio availability',
        'Deploy to production',
        'Update course status'
      ]
    });
  } catch (err) {
    console.error('[Deploy] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// VFS AUTO-SYNC TO S3
// =============================================================================

/**
 * Syncs a local VFS file to S3
 */
async function syncFileToS3(filePath) {
  try {
    // Extract course code and filename from path
    // Path format: vfs/courses/{courseCode}/{filename}
    const relativePath = path.relative(CONFIG.VFS_ROOT, filePath);
    const parts = relativePath.split(path.sep);

    if (parts.length < 2) {
      console.log(`[VFS Sync] Skipping file outside course structure: ${filePath}`);
      return;
    }

    const courseCode = parts[0];
    const fileName = parts.slice(1).join('/');

    // Only sync .json files (not .md, .log, etc.)
    if (!fileName.endsWith('.json')) {
      return;
    }

    // Read file content
    const content = await fs.readFile(filePath, 'utf8');
    const key = `courses/${courseCode}/${fileName}`;

    // Upload to S3
    await s3.putObject({
      Bucket: S3_BUCKET,
      Key: key,
      Body: content,
      ContentType: 'application/json',
      ACL: 'private'
    }).promise();

    console.log(`✅ [VFS Sync] ${courseCode}/${fileName} → S3`);
  } catch (error) {
    console.error(`❌ [VFS Sync] Failed to sync ${filePath}:`, error.message);
  }
}

/**
 * Initialize VFS file watcher for auto-sync to S3
 */
function initializeVFSWatcher() {
  const watchPath = path.join(CONFIG.VFS_ROOT, '**', '*.json');

  console.log(`\n[VFS Sync] Watching: ${watchPath}`);
  console.log(`[VFS Sync] Auto-syncing course files to S3 bucket: ${S3_BUCKET}\n`);

  const watcher = chokidar.watch(watchPath, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true, // Don't sync existing files on startup
    awaitWriteFinish: {
      stabilityThreshold: 500, // Wait for file to stop changing
      pollInterval: 100
    }
  });

  watcher
    .on('ready', () => {
      console.log(`[VFS Sync] Watcher ready and monitoring for changes`);
    })
    .on('add', filePath => {
      console.log(`[VFS Sync] New file detected: ${path.relative(CONFIG.VFS_ROOT, filePath)}`);
      syncFileToS3(filePath);
    })
    .on('change', filePath => {
      console.log(`[VFS Sync] File changed: ${path.relative(CONFIG.VFS_ROOT, filePath)}`);
      syncFileToS3(filePath);
    })
    .on('error', error => {
      console.error(`[VFS Sync] Watcher error:`, error);
    })
    .on('raw', (event, path, details) => {
      console.log(`[VFS Sync Debug] Raw event: ${event} on ${path}`);
    });

  return watcher;
}

// =============================================================================
// SERVER START
// =============================================================================

async function startServer() {
  await fs.ensureDir(CONFIG.VFS_ROOT);

  // Initialize VFS auto-sync to S3
  initializeVFSWatcher();

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
    console.log(`\nPrompt Evolution & Self-Learning:`);
    console.log(`  GET  http://localhost:${CONFIG.PORT}/api/courses/:code/prompt-evolution`);
    console.log(`  GET  http://localhost:${CONFIG.PORT}/api/courses/:code/learned-rules`);
    console.log(`  POST http://localhost:${CONFIG.PORT}/api/courses/:code/experimental-rules`);
    console.log(`  POST http://localhost:${CONFIG.PORT}/api/courses/:code/prompt-evolution/commit`);
    console.log(`\nVisualization Endpoints:`);
    console.log(`  GET  http://localhost:${CONFIG.PORT}/api/visualization/legos/:code`);
    console.log(`  GET  http://localhost:${CONFIG.PORT}/api/visualization/seed/:uuid`);
    console.log(`  GET  http://localhost:${CONFIG.PORT}/api/visualization/phrases/:code`);
    console.log(`\nLanguages API:`);
    console.log(`  GET  http://localhost:${CONFIG.PORT}/api/languages`);
    console.log(`\nPrompt Management API (Self-Improving DNA):`);
    console.log(`  GET  http://localhost:${CONFIG.PORT}/api/prompts/:phase`);
    console.log(`  PUT  http://localhost:${CONFIG.PORT}/api/prompts/:phase`);
    console.log(`  GET  http://localhost:${CONFIG.PORT}/api/prompts/:phase/history`);
    console.log(`\nOrchestrator Pattern:`);
    console.log(`  - Single Warp window for entire course generation`);
    console.log(`  - All 7 phases executed sequentially in one Claude session`);
    console.log(`  - Self-healing: Claude maintains context across phases`);
    console.log(`  - Progress tracking: Dashboard polls VFS for outputs`);
    console.log(`\nNext Steps:`);
    console.log(`  1. Generate course: POST /api/courses/generate`);
    console.log(`  2. Single orchestrator spawns in Warp`);
    console.log(`  3. Executes all 7 phases autonomously`);
    console.log(`  4. Check results in dashboard when complete`);
    console.log(`\nOptional (for remote access):`);
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
