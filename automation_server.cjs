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
  VFS_ROOT: path.join(__dirname, 'public', 'vfs', 'courses'),
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
  '1': 'docs/phase_intelligence/phase_1_orchestrator.md',  // Use lightweight orchestrator (points to skills/)
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
 * Generates course code with optional seed range suffix
 *
 * Examples:
 *   spa_for_eng (full 1-668)
 *   spa_for_eng_s0001-0030 (test range)
 *   spa_for_eng_s0100-0200 (custom range)
 */
function generateCourseCode(target, known, startSeed, endSeed) {
  const baseCode = `${target}_for_${known}`;

  // Full range (1-668): no suffix
  if (startSeed === 1 && endSeed === 668) {
    return baseCode;
  }

  // Custom range: add suffix with 4-digit zero-padding (matches seed ID format S0001-S0668)
  const start = String(startSeed).padStart(4, '0');
  const end = String(endSeed).padStart(4, '0');
  return `${baseCode}_s${start}-${end}`;
}

/**
 * Ensures a course directory exists in VFS
 */
async function ensureCourseDirectory(courseCode) {
  const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);

  // Simplified structure (APML v7.7+):
  // - seed_pairs.json (all seed translations)
  // - lego_pairs.json (all LEGO breakdowns)
  // - lego_baskets.json (all practice baskets)

  await fs.ensureDir(courseDir);

  return courseDir;
}

/**
 * Phase 1 Master Prompt: Parallel translation using 10 agents
 * For Web + API modes (deprecating Local mode)
 */
function generatePhase1MasterPrompt(courseCode, params, courseDir) {
  const { target, known, startSeed, endSeed } = params;
  const totalSeeds = endSeed - startSeed + 1;
  const seedsPerAgent = 70;
  const agentCount = Math.ceil(totalSeeds / seedsPerAgent);

  // Calculate agent assignments
  const agentAssignments = [];
  for (let i = 0; i < agentCount; i++) {
    const agentStart = startSeed + (i * seedsPerAgent);
    const agentEnd = Math.min(agentStart + seedsPerAgent - 1, endSeed);
    agentAssignments.push({
      agentNum: i + 1,
      startSeed: agentStart,
      endSeed: agentEnd,
      totalSeeds: agentEnd - agentStart + 1
    });
  }

  return `# Phase 1 Master Prompt: Pedagogical Translation

**Course**: ${courseCode}
**Target Language**: ${target} (${getLanguageName(target)})
**Known Language**: ${known} (${getLanguageName(known)})
**Total Seeds**: ${totalSeeds} (S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')})
**Parallel Agents**: ${agentCount}
**Seeds per agent**: ~${seedsPerAgent}

---

## Your Mission

Translate all ${totalSeeds} canonical seeds into ${getLanguageName(target)} and ${getLanguageName(known)} using ${agentCount} parallel agents.

**Phase Intelligence**: GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/phase-intelligence/1

**Canonical Seeds**: GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/seeds?limit=${endSeed}

---

## Execute: Spawn ${agentCount} Parallel Agents

Use the Task tool to spawn all ${agentCount} agents **in a single message** for parallel execution:

${agentAssignments.map(agent => `
**Task ${agent.agentNum}**: Translate seeds S${String(agent.startSeed).padStart(4, '0')}-S${String(agent.endSeed).padStart(4, '0')} (${agent.totalSeeds} seeds)

\`\`\`markdown
You are Translation Agent ${agent.agentNum}.

## Your Task
Translate seeds ${agent.startSeed} through ${agent.endSeed} (${agent.totalSeeds} seeds total).

## Instructions
1. Fetch Phase 1 intelligence: GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/phase-intelligence/1
2. Fetch canonical seeds: GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/seeds?limit=${endSeed}
3. Filter to seeds ${agent.startSeed}-${agent.endSeed}
4. For each canonical seed:
   - Replace {target} placeholder with "${getLanguageName(target)}"
   - Translate to ${getLanguageName(target)} (target language)
   - Translate to ${getLanguageName(known)} (known language - usually English)
   - Follow Phase 1 intelligence rules (cognate preference, zero variation, etc.)

## CRITICAL: {target} Placeholder
- Canonical: "I want to speak {target}"
- Replace with: "I want to speak ${getLanguageName(target)}"

## Output
Write to: \`${courseDir}/translations/agent_${String(agent.agentNum).padStart(2, '0')}_translations.json\`

Format:
\`\`\`json
{
  "agent_id": ${agent.agentNum},
  "seed_range": {
    "start": ${agent.startSeed},
    "end": ${agent.endSeed}
  },
  "translations": {
    "S${String(agent.startSeed).padStart(4, '0')}": ["${target} translation", "${known} translation"],
    "S${String(agent.startSeed + 1).padStart(4, '0')}": ["${target} translation", "${known} translation"]
  }
}
\`\`\`

IMPORTANT: Use compact JSON formatting (no unnecessary whitespace).
\`\`\`
`).join('\n---\n')}

---

## After All ${agentCount} Agents Complete

1. Merge all agent outputs into final seed_pairs.json:

\`\`\`bash
node scripts/merge_phase1_translations.cjs ${courseDir}
\`\`\`

Expected output: \`${courseDir}/seed_pairs.json\` with all ${totalSeeds} translations.

2. **PUSH TO GITHUB IMMEDIATELY** (critical for automation):

\`\`\`bash
git add .
git commit -m "Phase 1: Translations complete for ${courseCode}

- Translated ${totalSeeds} seeds
- ${agentCount} parallel agents
- Ready for Phase 3"

git push origin HEAD:claude/phase1-${courseCode}-$(date +%s)
\`\`\`

3. Report completion with the branch name

The automation server will automatically:
- Detect your pushed branch
- Pull and merge your changes
- Continue to Phase 3

**DO NOT wait for user confirmation - push immediately when merge completes!**

---

**Target completion time**: ~10-15 minutes with ${agentCount} parallel agents
`;
}

/**
 * Phase 3 Master Prompt: Parallel LEGO extraction using 34 agents
 * For Web + API modes - AI manages parallelization and rate limiting
 */
function generatePhase3MasterPrompt(courseCode, params, courseDir) {
  const { target, known, startSeed, endSeed } = params;
  const totalSeeds = endSeed - startSeed + 1;
  const seedsPerAgent = 20;
  const agentCount = Math.ceil(totalSeeds / seedsPerAgent);

  return `# Phase 3 Master Prompt: LEGO Extraction with Self-Managing Parallelization

**Course**: ${courseCode}
**Total Seeds**: ${totalSeeds} (S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')})
**Target Agents**: ${agentCount} parallel agents
**Seeds per agent**: ~${seedsPerAgent}

---

## 🎯 YOUR MISSION

You are the **LEGO Extraction Orchestrator**. Your job is to:

1. **Spawn ${agentCount} parallel agents** to extract LEGOs from all ${totalSeeds} seeds
2. **Monitor rate limits and adjust pacing** if needed
3. **Handle errors gracefully** and retry failed agents
4. **Report progress** as agents complete

You have full autonomy to manage the parallelization strategy based on your rate limit observations.

---

## 📚 PHASE 3 INTELLIGENCE (Single Source of Truth)

**READ**: \`docs/phase_intelligence/phase_3_lego_pairs.md\` (v5.0)

This is the **ONLY authoritative source** for Phase 3 extraction methodology.

**Key sections to review**:
- THE THREE ABSOLUTES (Start from Known, Provide Both Levels, Verify Tiling)
- THE EXTRACTION PROCESS (7-step protocol)
- FD TEST (3 questions to check determinism)
- FCFS REGISTRY (collision detection)
- EXAMPLES FROM PRODUCTION (S0101-S0200 learnings)
- EXTENDED THINKING PROTOCOL

**Critical principles** (from SSoT):
- START FROM KNOWN semantics first
- FD test: IF IN DOUBT → CHUNK UP
- Provide BOTH atomic AND molecular LEGOs
- Complete tiling mandatory
- Componentize ALL M-types (ALL WORDS!)
- Check FCFS registry for collisions

---

## 📂 PREPARED SCAFFOLDS

Mechanical prep has been done! Each agent has a scaffold ready:

\`${courseDir}/phase3_scaffolds/agent_01.json\` through \`agent_${String(agentCount).padStart(2, '0')}.json\`

Each scaffold contains:
- **seeds**: The 20 seed pairs to process
- **fcfs_registry**: LEGOs from prior seeds (for collision detection)
- **legos**: Empty array (agent fills this)

---

## 🚀 EXECUTION STRATEGY

${agentCount <= 10 ? `
### Strategy: FULL PARALLELIZATION (Small Job - ${totalSeeds} seeds, ${agentCount} agents)

Spawn all ${agentCount} agents in parallel - no need for waves with small job size.

**After EACH agent completes → PUSH IMMEDIATELY:**

\`\`\`bash
git add public/vfs/courses/${courseCode}/phase3_outputs/agent_XX_provisional.json
git commit -m "Phase 3: Agent XX complete (seeds S0XXX-S0YYY)"
git push origin main
\`\`\`

**Critical**: Push each file immediately (don't wait for all agents) so automation can track progress in real-time!
` : `
### Strategy: WAVE-BASED EXECUTION (Large Job - ${totalSeeds} seeds, ${agentCount} agents)

With ${agentCount} agents, use **3 waves** to prevent Claude Code on Web timeouts:

- **Wave 1**: Agents 1-${Math.ceil(agentCount / 3)} (${Math.ceil(agentCount / 3)} agents)
- **Wave 2**: Agents ${Math.ceil(agentCount / 3) + 1}-${Math.ceil(2 * agentCount / 3)} (${Math.ceil(agentCount / 3)} agents)
- **Wave 3**: Agents ${Math.ceil(2 * agentCount / 3) + 1}-${agentCount} (${agentCount - Math.ceil(2 * agentCount / 3)} agents)

**After EACH agent completes → PUSH IMMEDIATELY:**

\`\`\`bash
git add public/vfs/courses/${courseCode}/phase3_outputs/agent_XX_provisional.json
git commit -m "Phase 3: Agent XX complete (seeds S0XXX-S0YYY)"
git push origin main
\`\`\`

**Why waves + immediate push:**
- Prevents Claude Code on Web from getting stuck (20+ min timeout)
- If connection drops mid-wave, completed files are already pushed
- Automation sees files appearing and updates dashboard in real-time
- Smart resume: Only redo missing agents, not entire wave
`}

---

## 📋 AGENT TASK TEMPLATE

For each agent, the task is:

\`\`\`markdown
You are LEGO Extraction Agent ${agentCount}.

## Your Data
**Scaffold**: Read \`${courseDir}/phase3_scaffolds/agent_XX.json\`

This contains:
- Your 20 seeds to process
- FCFS registry (check for collisions!)
- Empty legos arrays (you fill these)

## Your Process
1. For each seed, use extended thinking:
   - STEP 1: Chunk KNOWN semantically
   - STEP 2: Map to TARGET
   - STEP 3: Apply FD test (3 questions)
   - STEP 4: Fix failures (chunk up)
   - STEP 5: Check FCFS registry for collisions
   - STEP 6: Add both atomic AND molecular LEGOs
   - STEP 7: Componentize all M-types (ALL WORDS!)

2. Extract LEGOs following Phase 3 Ultimate Intelligence
3. Use extended thinking for EVERY seed (1-2 min per seed)
4. Verify complete tiling (seed reconstructs from LEGOs)

## Output
Write to: \`${courseDir}/phase3_outputs/agent_XX_provisional.json\`

Format:
\`\`\`json
{
  "agent_id": XX,
  "seed_range": "S0XXX-S0YYY",
  "extracted_at": "ISO timestamp",
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": {"target": "...", "known": "..."},
      "legos": [
        {
          "provisional_id": "PROV_S0001_01" or "id": "S0023L02" if reference,
          "type": "A" or "M",
          "target": "Spanish text",
          "known": "English text",
          "new": true or false,
          "ref": "S0023" (if reference),
          "components": [[...]] (if M-type - ALL WORDS!)
        }
      ]
    }
  ]
}
\`\`\`

**Quality over speed!** Take time to think through each seed.
\`\`\`

---

## 🎬 EXECUTE NOW

Spawn your agents using whichever strategy you choose (full parallel, waves, or adaptive).

**Monitor and adjust** based on what you observe.

**Report progress** as agents complete - and **WRITE STATUS UPDATES** so the dashboard can track progress:

\`\`\`bash
# After each agent completes, update status file
cat > public/vfs/courses/${courseCode}/phase3_outputs/.progress.json << 'EOF'
{
  "phase": "phase3",
  "status": "in_progress",
  "completed_agents": 1,
  "total_agents": ${agentCount},
  "updated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

git add public/vfs/courses/${courseCode}/phase3_outputs/.progress.json
git commit -m "Phase 3 progress: 1/${agentCount} agents complete"
git push origin main
\`\`\`

**Update this file each time an agent completes** so users can see real-time progress!

When all ${agentCount} agents finish:

1. **PUSH TO GITHUB IMMEDIATELY** (critical for automation):

\`\`\`bash
git add .
git commit -m "Phase 3: LEGO extraction complete for ${courseCode}

- Extracted LEGOs for ${totalSeeds} seeds
- ${agentCount} parallel agents
- Ready for merge and validation"

git push origin HEAD:claude/phase3-${courseCode}-$(date +%s)
\`\`\`

2. Report completion with the branch name

The automation server will automatically:
- Detect your pushed branch
- Pull and merge your changes
- Run the merge script: \`node scripts/phase3_merge_legos.cjs ${courseDir}\`
- Continue to Phase 5

**DO NOT wait for user confirmation - push immediately when agents complete!**

---

## ✅ SUCCESS CRITERIA

- All ${totalSeeds} seeds processed
- 100% complete tiling (all seeds reconstruct)
- FD compliance (no ambiguous chunks)
- Complete componentization (ALL WORDS in M-types)
- FCFS registry checked (no collisions)
- ~40-60% atomic, ~40-60% molecular

**Target time**: 15-25 minutes with adaptive parallelization

**You've got this!** Manage it however you think best given rate limits and system load.
`;
}

/**
 * Generate Phase 5 Master Prompt - Self-Managing Practice Basket Generation
 */
function generatePhase5MasterPrompt(courseCode, params, courseDir) {
  const { target, known, startSeed, endSeed } = params;
  const totalSeeds = endSeed - startSeed + 1;
  const seedsPerAgent = 20;
  const agentCount = Math.ceil(totalSeeds / seedsPerAgent);

  return `# Phase 5 Master Prompt: Practice Basket Generation with Self-Managing Parallelization

**Course**: ${courseCode}
**Total Seeds**: ${totalSeeds} (S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')})
**Target Agents**: ${agentCount} parallel agents
**Seeds per agent**: ~${seedsPerAgent}

---

## 🎯 YOUR MISSION

You are the **Practice Basket Orchestrator**. Your job is to:

1. **Spawn ${agentCount} parallel agents** to generate practice baskets for all ${totalSeeds} seeds
2. **Monitor rate limits and adjust pacing** if needed
3. **Handle errors gracefully** and retry failed agents
4. **Report progress** as agents complete

You have full autonomy to manage the parallelization strategy based on your rate limit observations.

---

## 📚 PHASE 5 INTELLIGENCE (Single Source of Truth)

**READ**: \`docs/phase_intelligence/phase_5_lego_baskets.md\` (v5.0)

This is the **ONLY authoritative source** for Phase 5 basket generation methodology.

**Key sections to review**:
- 🚨 CRITICAL: THIS IS A LINGUISTIC TASK, NOT A CODING TASK
- 🔑 UNDERSTANDING THE WHITELIST (3-Category Rule)
- 🎨 PHRASE GENERATION PROCESS (Per LEGO)
- WORD CLASS RECOGNITION (verb/noun/adjective/phrase)
- 🛡️ GATE COMPLIANCE (Zero Tolerance)
- EXTENDED THINKING PROTOCOL

**Critical principles** (from SSoT):
- NO scripts, NO templates, NO automation
- Use extended thinking for EVERY LEGO
- Understand word class before generating
- GATE compliance: Every Spanish word in whitelist
- 2-2-2-4 distribution mandatory
- Final LEGO phrase #10 = complete seed sentence

---

## 📂 PREPARED SCAFFOLDS

Mechanical prep has been done! Each agent has a scaffold ready:

\`${courseDir}/phase5_scaffolds/agent_01.json\` through \`agent_${String(agentCount).padStart(2, '0')}.json\`

Each scaffold contains:
- **whitelist**: Available Spanish vocabulary (3-category rule applied)
- **seeds**: The seed pairs with LEGOs
- **legos**: Empty practice_phrases arrays (agent fills these)
- **is_final_lego**: Flag marking final LEGO in each seed

**Whitelist was built using 3-category rule:**
1. Atomic LEGOs (A-type) - complete words
2. Molecular LEGOs (M-type) - complete phrases split into words
3. Component words from M-types - literal translations

This lets learners **reconstruct and recombine** - seeing grammar without explanation!

---

## 🚀 EXECUTION STRATEGY

${agentCount <= 10 ? `
### Strategy: FULL PARALLELIZATION (Small Job - ${totalSeeds} seeds, ${agentCount} agents)

Spawn all ${agentCount} agents in parallel - no need for waves with small job size.

**After EACH agent completes → PUSH IMMEDIATELY:**

\`\`\`bash
git add public/vfs/courses/${courseCode}/phase3_outputs/agent_XX_provisional.json
git commit -m "Phase 3: Agent XX complete (seeds S0XXX-S0YYY)"
git push origin main
\`\`\`

**Critical**: Push each file immediately (don't wait for all agents) so automation can track progress in real-time!
` : `
### Strategy: WAVE-BASED EXECUTION (Large Job - ${totalSeeds} seeds, ${agentCount} agents)

With ${agentCount} agents, use **3 waves** to prevent Claude Code on Web timeouts:

- **Wave 1**: Agents 1-${Math.ceil(agentCount / 3)} (${Math.ceil(agentCount / 3)} agents)
- **Wave 2**: Agents ${Math.ceil(agentCount / 3) + 1}-${Math.ceil(2 * agentCount / 3)} (${Math.ceil(agentCount / 3)} agents)
- **Wave 3**: Agents ${Math.ceil(2 * agentCount / 3) + 1}-${agentCount} (${agentCount - Math.ceil(2 * agentCount / 3)} agents)

**After EACH agent completes → PUSH IMMEDIATELY:**

\`\`\`bash
git add public/vfs/courses/${courseCode}/phase3_outputs/agent_XX_provisional.json
git commit -m "Phase 3: Agent XX complete (seeds S0XXX-S0YYY)"
git push origin main
\`\`\`

**Why waves + immediate push:**
- Prevents Claude Code on Web from getting stuck (20+ min timeout)
- If connection drops mid-wave, completed files are already pushed
- Automation sees files appearing and updates dashboard in real-time
- Smart resume: Only redo missing agents, not entire wave
`}

---

## 📋 AGENT TASK TEMPLATE

For each agent, the task is:

\`\`\`markdown
You are Practice Basket Generation Agent XX.

## Your Data
**Scaffold**: Read \`${courseDir}/phase5_scaffolds/agent_XX.json\`

This contains:
- Seeds with empty practice_phrases arrays (you fill these)
- Whitelist (3-category rule applied)
- is_final_lego flags (phrase #10 must be seed sentence)

## Your Process
1. Read Phase 5 Ultimate Intelligence v5.0
2. For each NEW LEGO, use extended thinking:
   - STEP 1: Understand the LEGO (word class, natural usage, seed theme)
   - STEP 2: Identify grammatical role (verb/noun/adjective/phrase)
   - STEP 3: Generate 10 natural phrases (2-2-2-4 distribution)
   - STEP 4: Validate EVERY Spanish word against whitelist
   - STEP 5: If is_final_lego: true, phrase #10 = complete seed sentence
   - STEP 6: Check phrases sound natural in BOTH languages

3. Fill practice_phrases arrays following Phase 5 v5.0
4. Use extended thinking for EVERY LEGO (quality over speed!)
5. Update phrase_distribution to match actual counts

## Output
Write to: \`${courseDir}/phase5_outputs/agent_XX_provisional.json\`

Format: Same scaffold structure with practice_phrases filled:

\`\`\`json
{
  "version": "curated_v7_spanish",
  "agent_id": XX,
  "seed_range": "S0XXX-S0YYY",
  "generation_stage": "PHRASES_GENERATED",
  "seeds": {
    "S0001": {
      "seed": "S0001",
      "legos": {
        "S0001L01": {
          "lego": ["I want", "quiero"],
          "practice_phrases": [
            ["I want", "quiero", null, 1],
            ["I want coffee", "quiero café", null, 2],
            ...
            ["I want to speak Spanish with you now", "quiero hablar español contigo ahora", null, 7]
          ],
          "phrase_distribution": {
            "really_short_1_2": 2,
            "quite_short_3": 2,
            "longer_4_5": 2,
            "long_6_plus": 4
          }
        }
      }
    }
  }
}
\`\`\`

**Quality over speed!** Think linguistically, not mechanically.
\`\`\`

---

## 🎬 EXECUTE NOW

Spawn your agents using whichever strategy you choose (full parallel, waves, or adaptive).

**Monitor and adjust** based on what you observe.

**Report progress** as agents complete.

When all ${agentCount} agents finish, instruct the user to run the validation/merge script:

\`\`\`bash
node scripts/phase5_merge_baskets.cjs ${courseDir}
\`\`\`

---

## ✅ SUCCESS CRITERIA

**Per Agent:**
- All LEGOs have exactly 10 practice_phrases
- 2-2-2-4 distribution maintained
- 100% GATE compliance (all Spanish words in whitelist)
- Natural language in both English and Spanish
- Final LEGO phrase #10 = complete seed sentence
- No template patterns detected

**Overall:**
- All ${totalSeeds} seeds processed
- All baskets validated and formatted
- Zero GATE violations
- "Top dollar content" quality achieved

**Target time**: 20-30 minutes with adaptive parallelization

**You've got this!** Manage it however you think best given rate limits and system load.
`;
}

/**
 * Phase 1 Brief: Translation batch (DEPRECATED - for Local mode only)
 * Use generatePhase1MasterPrompt() for Web/API modes instead
 */
function generatePhase1Brief(courseCode, params, courseDir) {
  const { target, known, startSeed, endSeed, batchNum, totalBatches } = params;
  const seedRange = `S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')}`;

  return `# Phase 1: Pedagogical Translation (Batch ${batchNum}/${totalBatches}) [LOCAL MODE - DEPRECATED]

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
  "version": "7.7.0",
  "course": "${courseCode}",
  "target_language": "${target}",
  "known_language": "${known}",
  "seed_range": {
    "start": ${startSeed},
    "end": ${endSeed}
  },
  "generated": "2025-11-09T19:15:55.094Z",
  "total_seeds": ${endSeed - startSeed + 1},
  "actual_seeds": ${endSeed - startSeed + 1},
  "translations": {
    "S${String(startSeed).padStart(4, '0')}": ["target phrase", "known phrase"],
    "S${String(startSeed + 1).padStart(4, '0')}": ["target phrase", "known phrase"],
    ...
  }
}
\`\`\`

**CRITICAL**: If this is batch ${batchNum} > 1, READ existing seed_pairs.json and MERGE your translations (don't overwrite!)

**FORMATTING**: After writing JSON, run compact formatter for better readability:
\`\`\`bash
node compact-json-formatter.cjs ${path.join(courseDir, 'seed_pairs.json')}
\`\`\`

---

## CRITICAL: Git Workflow (Web Mode Only)

**IMPORTANT**: Push directly to main branch (DO NOT use session branches):

\`\`\`bash
git add public/vfs/courses/${courseCode}/seed_pairs.json
git commit -m "Phase 1: Translations for ${courseCode} (${seedRange})"
git push origin HEAD:main --force
\`\`\`

**Why force push**: Ensures your changes reach main even if on a session branch

---

## Success Criteria

✅ ${endSeed - startSeed + 1} translations completed
✅ Merged with existing seed_pairs.json (if not batch 1)
✅ Natural translations with cognate preference (seeds 1-100)
✅ Zero variation ("First Word Wins")
✅ JSON formatted with compact-json-formatter.cjs
✅ **Committed and pushed to main branch**

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

**FORMATTING**: After writing JSON, run compact formatter for better readability:
\`\`\`bash
node compact-json-formatter.cjs ${path.join(courseDir, 'lego_pairs.tmp.json')}
\`\`\`

---

## CRITICAL: Git Workflow (Web Mode Only)

**IMPORTANT**: Push directly to main branch (DO NOT use session branches):

\`\`\`bash
git add public/vfs/courses/${courseCode}/lego_pairs.tmp.json
git commit -m "Phase 3: LEGO extraction for ${courseCode} (${seedRange})"
git push origin HEAD:main --force
\`\`\`

**Why force push**: Ensures your changes reach main even if on a session branch

---

## Success Criteria

✅ LEGOs extracted for all ${endSeed - startSeed + 1} seeds
✅ Appended to existing lego_pairs.tmp.json (if not batch 1)
✅ COMPOSITE LEGOs with 2-element componentization arrays
✅ FD-compliant, TILING verified
✅ JSON formatted with compact-json-formatter.cjs
✅ **Committed and pushed to main branch**

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

**FORMATTING**: After writing JSON, run compact formatter for better readability:
\`\`\`bash
node compact-json-formatter.cjs ${path.join(courseDir, 'lego_baskets.json')}
\`\`\`

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

## CRITICAL: Git Workflow (Web Mode Only)

**IMPORTANT**: Push directly to main branch (DO NOT use session branches):

\`\`\`bash
git add public/vfs/courses/${courseCode}/lego_baskets.json
git commit -m "Phase 5: Practice baskets for ${courseCode} (${seedRange})"
git push origin HEAD:main --force
\`\`\`

**Why force push**: Ensures your changes reach main even if on a session branch

---

## Success Criteria

✅ Baskets for ~${(endSeed - startSeed + 1) * 3} LEGOs
✅ Merged with existing lego_baskets.json (if not batch 1)
✅ Perfect grammar in BOTH languages
✅ **ABSOLUTE GATE: 0 violations** (validate-gate-compliance.cjs MUST pass)
✅ Pattern coverage validators run, reports generated
✅ JSON formatted with compact-json-formatter.cjs
✅ **Committed and pushed to main branch**
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

  return `# Course Generation Orchestrator Brief (v8.0.0)

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

**Output Files** (v8.0.0 naming):
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
 * Closes iTerm2 windows and kills specific agent processes to free RAM
 */
async function closeAgentWindows(windowIds, processIds = []) {
  if ((!windowIds || windowIds.length === 0) && (!processIds || processIds.length === 0)) {
    return;
  }

  console.log(`[Cleanup] Closing ${windowIds?.length || 0} iTerm2 window(s) and killing ${processIds?.length || 0} process(es) to free RAM...`);

  // First, kill the specific Claude processes to free RAM immediately
  if (processIds && processIds.length > 0) {
    for (const pid of processIds) {
      try {
        const { exec } = require('child_process');
        await new Promise((resolve) => {
          exec(`kill -9 ${pid}`, (error) => {
            if (error) {
              console.warn(`[Cleanup] PID ${pid} already dead or not found`);
            } else {
              console.log(`[Cleanup] Killed Claude process ${pid}`);
            }
            resolve();
          });
        });
      } catch (error) {
        console.warn(`[Cleanup] Failed to kill PID ${pid}:`, error.message);
      }
    }

    // Give processes time to die
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Then close the iTerm2 windows
  if (windowIds && windowIds.length > 0) {
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

        // Wait up to 10 seconds for window to close
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            child.kill();
            resolve(); // Still resolve to continue cleanup
          }, 10000);

          child.on('close', (code) => {
            clearTimeout(timeout);
            resolve();
          });

          child.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });

        console.log(`[Cleanup] Closed iTerm2 window ${windowId}`);

      } catch (error) {
        console.warn(`[Cleanup] Failed to close window ${windowId}:`, error.message);
      }
    }
  }

  console.log(`[Cleanup] ✅ All agent windows closed and processes killed, RAM freed`);
}

/**
 * Finds the PID of a Claude process in a specific directory
 */
async function findClaudePid(courseDir, maxAttempts = 10) {
  const { exec } = require('child_process');

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await new Promise((resolve, reject) => {
        // Find claude processes and check their working directory
        exec(`lsof -c claude -a -d cwd -Fn | grep -A1 "${courseDir}" | grep ^p | cut -c2-`,
          (error, stdout, stderr) => {
            if (error && !stdout) {
              resolve(null);
            } else {
              resolve(stdout.trim());
            }
          }
        );
      });

      if (result) {
        const pid = parseInt(result.split('\n')[0]); // Take first PID if multiple
        if (pid) {
          console.log(`[Agent] Found Claude PID: ${pid} in ${courseDir}`);
          return pid;
        }
      }
    } catch (error) {
      console.warn(`[Agent] Attempt ${i + 1} to find PID failed:`, error.message);
    }

    // Wait 2 seconds before next attempt
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.warn(`[Agent] Could not find Claude PID after ${maxAttempts} attempts`);
  return null;
}

/**
 * Spawns a Claude Code agent via iTerm2 terminal
 * Returns both window ID and process ID for cleanup
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

    // Wait a bit for claude to start, then find its PID
    console.log(`[Agent] Waiting for Claude process to start in ${courseDir}...`);
    const pid = await findClaudePid(courseDir);

    // Track window ID and PID in job state
    const job = STATE.jobs.get(courseCode);
    if (job) {
      if (!job.windowIds) {
        job.windowIds = [];
      }
      if (!job.processIds) {
        job.processIds = [];
      }
      if (windowId) {
        job.windowIds.push(windowId);
      }
      if (pid) {
        job.processIds.push(pid);
      }
    }

    // Clean up temp file after delay (give iTerm2 time to execute)
    setTimeout(() => {
      fs.unlink(promptFile).catch(err => {
        console.warn(`[Agent] Failed to clean up temp prompt file: ${err.message}`);
      });
    }, 20000);

    return { windowId, pid };
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
  const job = STATE.jobs.get(courseCode);
  const courseDir = await ensureCourseDirectory(courseCode);

  // Check for orchestrator v2 feature flag
  const useOrchestratorV2 = process.env.USE_ORCHESTRATOR_V2 === 'true';

  if (useOrchestratorV2) {
    console.log(`[Orchestrator] Using MASTER ORCHESTRATOR AGENT (v2)`);
    console.log(`[Orchestrator] Architecture: Master agent → 3 orchestrators × 10 agents = 30 concurrent per phase`);

    try {
      // Load the master orchestrator prompt generator
      const { generateMasterOrchestratorPrompt } = require('./orchestrator-prompt-helpers.cjs');

      // Extract language names from params
      const targetLanguage = params.target || 'target language';
      const knownLanguage = params.known || 'known language';
      const totalSeeds = params.seeds || params.endSeed - params.startSeed + 1;

      // Generate the master orchestrator prompt
      const masterPrompt = generateMasterOrchestratorPrompt(
        courseCode,
        targetLanguage,
        knownLanguage,
        totalSeeds
      );

      console.log(`[Orchestrator] Spawning master orchestrator agent...`);
      console.log(`[Orchestrator] Course: ${courseCode}`);
      console.log(`[Orchestrator] Target: ${targetLanguage}`);
      console.log(`[Orchestrator] Known: ${knownLanguage}`);
      console.log(`[Orchestrator] Seeds: ${totalSeeds}`);

      // Spawn the master orchestrator agent
      const windowId = await spawnPhaseAgent('master', masterPrompt, courseDir, courseCode);

      // Update job status
      job.status = 'in_progress';
      job.currentPhase = 'Master Orchestrator Coordinating';
      job.message = 'Master orchestrator agent is coordinating all phases';
      job.masterOrchestratorWindowId = windowId;

      console.log(`[Orchestrator] Master orchestrator spawned in iTerm2 window ${windowId}`);
      console.log(`[Orchestrator] Master orchestrator will coordinate all phases autonomously`);
      console.log(`[Orchestrator] Estimated completion: 75-85 minutes`);

    } catch (error) {
      console.error(`[Orchestrator] Error spawning master orchestrator:`, error);
      job.status = 'failed';
      job.error = error.message;
    }

    return; // Exit early - master orchestrator handles everything
  }

  // Otherwise, use the original batch orchestrator (v1)
  console.log(`[Orchestrator] Using ORIGINAL BATCH orchestration (v1): ${courseCode}`);
  console.log(`[Orchestrator] Seed range: S${String(params.startSeed).padStart(4, '0')}-S${String(params.endSeed).padStart(4, '0')} (${params.seeds} seeds)`);

  const { target, known, seeds, startSeed, endSeed } = params;

  try {
    // Calculate batch counts
    const phase1Batches = 1; // Single batch for all seeds (maintains vocabulary registry)
    const phase3Batches = Math.ceil(seeds / 70); // 70 seeds = ~10 windows (manageable for iTerm2)
    const phase5Batches = Math.ceil(seeds / 20);

    console.log(`[Orchestrator] Phase 1: Single batch (all ${seeds} seeds - vocabulary registry consistency)`);
    console.log(`[Orchestrator] Phase 3: ${phase3Batches} batches (70 seeds each, parallel)`);
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
 * Poll for file existence with timeout between checks
 * Polls indefinitely until file appears
 * In Web mode, pulls from git before checking (Claude Code on Web pushes to GitHub)
 */
async function pollForFile(filePath, pollInterval = 10000, pullFromGit = false) {
  while (true) {
    // In Web mode, pull from git to get files pushed by Claude Code on the Web
    if (pullFromGit) {
      try {
        console.log(`[Poll] Fetching all remote branches...`);
        await execCommand('git fetch --all', { cwd: VFS_ROOT });

        // Find Claude feature branches (claude/*)
        const branches = await execCommand('git branch -r | grep "origin/claude/"', { cwd: VFS_ROOT });
        if (branches.stdout.trim()) {
          const latestBranch = branches.stdout.trim().split('\n')[0].trim().replace('origin/', '');
          console.log(`[Poll] Found Claude branch: ${latestBranch}, merging...`);
          await execCommand(`git merge origin/${latestBranch} --no-edit`, { cwd: VFS_ROOT });
          console.log(`[Poll] ✅ Merged ${latestBranch}`);
        } else {
          // Fallback to main branch pull
          await execCommand('git pull origin main', { cwd: VFS_ROOT });
          console.log(`[Poll] ✅ Pulled from main`);
        }
      } catch (err) {
        console.log(`[Poll] ⚠️  Git sync failed (may be normal if no changes):`, err.message);
      }
    }

    if (await fs.pathExists(filePath)) {
      return true;
    }
    console.log(`[Poll] File not found yet: ${filePath}, checking again in ${pollInterval/1000}s...`);
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
}

/**
 * Web Mode Orchestrator - Uses browser automation to claude.ai/code
 * Opens browser tabs with phase prompts, user manually pastes and runs
 */
async function spawnCourseOrchestratorWeb(courseCode, params) {
  const job = STATE.jobs.get(courseCode);
  const courseDir = await ensureCourseDirectory(courseCode);

  console.log(`[Web Orchestrator] Starting browser-based course generation: ${courseCode}`);
  console.log(`[Web Orchestrator] Mode: Claude Code on the Web (manual prompt execution)`);

  const { target, known, seeds, startSeed, endSeed } = params;

  try {
    // Import the browser automation module
    const { spawnClaudeWebAgent } = require('./spawn_claude_web_agent.cjs');

    job.status = 'web_mode_automated';
    job.phase = 'web_mode_spawning';
    job.progress = 0;
    job.message = 'Opening browser tabs and pasting prompts automatically';

    console.log(`[Web Orchestrator] ============================================`);
    console.log(`[Web Orchestrator] WEB MODE - SEQUENTIAL PHASE EXECUTION`);
    console.log(`[Web Orchestrator] ============================================`);
    console.log(`[Web Orchestrator] `);
    console.log(`[Web Orchestrator] Phases will open ONE AT A TIME as previous`);
    console.log(`[Web Orchestrator] phases complete (Phase 3 needs Phase 1 output,`);
    console.log(`[Web Orchestrator] Phase 5 needs Phase 3 output).`);
    console.log(`[Web Orchestrator] `);
    console.log(`[Web Orchestrator] WORKFLOW:`);
    console.log(`[Web Orchestrator]   1. Phase 1 tab opens → Execute → Wait for output`);
    console.log(`[Web Orchestrator]   2. Phase 3 tab opens → Execute → Wait for output`);
    console.log(`[Web Orchestrator]   3. Phase 5 tab opens → Execute → Complete!`);
    console.log(`[Web Orchestrator] `);
    console.log(`[Web Orchestrator] ============================================`);

    // PHASE 1: Pedagogical Translation (with intelligent resume)
    job.phase = 'phase_1_web';
    job.progress = 0;
    job.message = 'Phase 1: Checking for existing translations';

    console.log(`\n[Web Orchestrator] ====================================`);
    console.log(`[Web Orchestrator] PHASE 1: PEDAGOGICAL TRANSLATION`);
    console.log(`[Web Orchestrator] ====================================`);

    const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
    let phase1AlreadyComplete = false;
    let phase1NeedsExtension = false;
    let actualStartSeed = startSeed;

    // Check if seed_pairs.json exists with translations
    if (await fs.pathExists(seedPairsPath)) {
      try {
        const seedPairsData = await fs.readJson(seedPairsPath);
        const translations = seedPairsData.translations || {};
        const existingSeedIds = Object.keys(translations).map(id => parseInt(id.substring(1))).sort((a, b) => a - b);
        const maxExistingSeed = existingSeedIds.length > 0 ? Math.max(...existingSeedIds) : 0;

        console.log(`[Resume] Found existing seed_pairs.json with ${existingSeedIds.length} translations (S0001-S${String(maxExistingSeed).padStart(4, '0')})`);

        if (maxExistingSeed >= endSeed) {
          // Already have all requested seeds
          phase1AlreadyComplete = true;
          console.log(`[Resume] ✅ Phase 1 already complete! Found ${maxExistingSeed}/${endSeed} translations`);
          console.log(`[Resume] Skipping Phase 1, proceeding to Phase 3...`);
          console.log(`[Resume] (To regenerate: delete ${seedPairsPath})\n`);
          job.phase = 'phase_1_complete';
          job.progress = 30;
        } else if (maxExistingSeed >= startSeed) {
          // Need to extend from where we left off
          phase1NeedsExtension = true;
          actualStartSeed = maxExistingSeed + 1;
          console.log(`[Resume] 🔄 Phase 1 needs extension! Existing: S${String(maxExistingSeed).padStart(4, '0')}, will generate S${String(actualStartSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')}`);
          console.log(`[Resume] New translations will be merged with existing seed_pairs.json\n`);
        }
      } catch (err) {
        console.log(`[Resume] seed_pairs.json exists but invalid, will regenerate`);
      }
    }

    if (!phase1AlreadyComplete) {
      const phase1MasterPrompt = generatePhase1MasterPrompt(courseCode, { target, known, startSeed: actualStartSeed, endSeed }, courseDir);
      await fs.ensureDir(path.join(courseDir, 'prompts'));
      await fs.writeFile(path.join(courseDir, 'prompts', 'phase_1_master_prompt.md'), phase1MasterPrompt, 'utf8');

      console.log(`[Web Orchestrator] Opening Phase 1 tab and pasting master prompt...`);
      console.log(`[Web Orchestrator] Master prompt will spawn ${Math.ceil((endSeed - startSeed + 1) / 70)} parallel agents`);

      try {
        await spawnClaudeWebAgent(phase1MasterPrompt, 1, 'safari');
        console.log(`[Web Orchestrator] ✅ Phase 1 master prompt pasted and auto-submitted!`);
      } catch (spawnError) {
        console.error(`[Web Orchestrator] ❌ Failed to spawn Phase 1 agent:`, spawnError);
        throw spawnError;
      }

      job.progress = 5;
      job.message = 'Phase 1 tab opened - waiting for execution';

      // Poll for seed_pairs.json (pull from git in Web mode)
      console.log(`[Web Orchestrator] Waiting for seed_pairs.json...`);
      await pollForFile(seedPairsPath, 60000, true); // Pull from git before each check

      console.log(`[Web Orchestrator] ✅ Phase 1 complete! Found seed_pairs.json`);
      job.phase = 'phase_1_complete';
      job.progress = 30;
    }

    // PHASE 3: LEGO Extraction (with intelligent resume)
    job.phase = 'phase_3_web';
    job.progress = 35;
    job.message = 'Phase 3: Checking for existing LEGO pairs';

    console.log(`\n[Web Orchestrator] ====================================`);
    console.log(`[Web Orchestrator] PHASE 3: LEGO EXTRACTION`);
    console.log(`[Web Orchestrator] ====================================`);

    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
    let phase3AlreadyComplete = false;

    // Check if lego_pairs.json exists
    if (await fs.pathExists(legoPairsPath)) {
      try {
        const legoPairsData = await fs.readJson(legoPairsPath);
        // Handle both array format {seeds: [...]} and object format {seeds: {S0001: {...}, ...}}
        let actualSeeds = 0;
        if (legoPairsData.seeds) {
          actualSeeds = Array.isArray(legoPairsData.seeds)
            ? legoPairsData.seeds.length
            : Object.keys(legoPairsData.seeds).length;
        } else {
          actualSeeds = legoPairsData.total_seeds || 0;
        }

        console.log(`[Resume] Found existing lego_pairs.json with ${actualSeeds} seeds`);

        if (actualSeeds >= seeds) {
          phase3AlreadyComplete = true;
          console.log(`[Resume] ✅ Phase 3 already complete! Found ${actualSeeds}/${seeds} seeds with LEGOs`);
          console.log(`[Resume] Skipping Phase 3, proceeding to Phase 5...`);
          console.log(`[Resume] (To regenerate: delete ${legoPairsPath})\n`);
          job.phase = 'phase_3_complete';
          job.progress = 60;
        } else {
          console.log(`[Resume] 🔄 Phase 3 needs extension! Existing: ${actualSeeds} seeds, will process seed_pairs.json to extract LEGOs for all ${seeds} seeds`);
          console.log(`[Resume] New LEGOs will be merged with existing lego_pairs.json\n`);
        }
      } catch (err) {
        console.log(`[Resume] lego_pairs.json exists but invalid, will regenerate`);
      }
    }

    if (!phase3AlreadyComplete) {
      // Prep Phase 3 scaffolds (mechanical work)
      console.log(`[Web Orchestrator] Running Phase 3 scaffold prep script...`);
      const { preparePhase3Scaffolds } = require('./scripts/phase3_prep_scaffolds.cjs');
      await preparePhase3Scaffolds(courseDir);
      console.log(`[Web Orchestrator] ✅ Phase 3 scaffolds ready`);

      const phase3MasterPrompt = generatePhase3MasterPrompt(courseCode, { target, known, startSeed, endSeed }, courseDir);
      await fs.writeFile(path.join(courseDir, 'prompts', 'phase_3_master_prompt.md'), phase3MasterPrompt, 'utf8');

      console.log(`[Web Orchestrator] Opening Phase 3 tab and pasting master prompt...`);
      console.log(`[Web Orchestrator] Master prompt will spawn ${Math.ceil((endSeed - startSeed + 1) / 20)} parallel agents`);
      await spawnClaudeWebAgent(phase3MasterPrompt, 2, 'safari');
      console.log(`[Web Orchestrator] ✅ Phase 3 master prompt pasted - HIT ENTER to spawn agents!`);

      job.progress = 40;
      job.message = 'Phase 3 tab opened - waiting for execution';

      // Poll for all agent provisional outputs
      console.log(`[Web Orchestrator] Waiting for all Phase 3 agent outputs...`);
      const expectedAgents = Math.ceil((endSeed - startSeed + 1) / 20);
      const outputsDir = path.join(courseDir, 'phase3_outputs');

      // Wait for all provisional files
      let agentsComplete = 0;
      while (agentsComplete < expectedAgents) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Check every 10 seconds

        if (await fs.pathExists(outputsDir)) {
          const files = await fs.readdir(outputsDir);
          agentsComplete = files.filter(f => f.match(/^agent_\d+_provisional\.json$/)).length;

          // Update job with detailed progress
          job.message = `Phase 3: ${agentsComplete}/${expectedAgents} agents complete`;
          job.subProgress = {
            phase: 'phase_3',
            completed: agentsComplete,
            total: expectedAgents,
            percentage: Math.round((agentsComplete / expectedAgents) * 100)
          };

          console.log(`[Web Orchestrator] Phase 3 agents complete: ${agentsComplete}/${expectedAgents}`);
        }
      }

      console.log(`[Web Orchestrator] ✅ All Phase 3 agents complete! Running merge script...`);

      // Run Phase 3 merge script
      const { mergePhase3Legos } = require('./scripts/phase3_merge_legos.cjs');
      await mergePhase3Legos(courseDir);

      console.log(`[Web Orchestrator] ✅ Phase 3 merge complete! Created lego_pairs.json`);
      job.phase = 'phase_3_complete';
      job.progress = 60;
    }

    // PHASE 5: Practice Baskets (with intelligent resume)
    job.phase = 'phase_5_web';
    job.progress = 65;
    job.message = 'Phase 5: Checking for existing baskets';

    console.log(`\n[Web Orchestrator] ====================================`);
    console.log(`[Web Orchestrator] PHASE 5: PRACTICE BASKETS`);
    console.log(`[Web Orchestrator] ====================================`);

    const basketsDir = path.join(courseDir, 'baskets');
    let phase5AlreadyComplete = false;

    // Check if baskets directory exists with correct number of basket files
    if (await fs.pathExists(basketsDir)) {
      try {
        const basketFiles = await fs.readdir(basketsDir);
        const basketCount = basketFiles.filter(f => f.match(/^lego_baskets_s\d+\.json$/)).length;

        console.log(`\n[Resume] Found existing baskets directory with ${basketCount} basket files`);

        if (basketCount >= seeds) {
          phase5AlreadyComplete = true;
          console.log(`[Resume] ✅ Phase 5 already complete! Found ${basketCount}/${seeds} basket files`);
          console.log(`[Resume] Skipping Phase 5, all phases complete!`);
          console.log(`[Resume] (To regenerate: delete ${basketsDir})\n`);
          job.phase = 'phase_5_complete';
          job.progress = 100;
          job.status = 'completed';
          job.message = 'All phases completed successfully';
        } else {
          console.log(`[Resume] 🔄 Phase 5 needs extension! Existing: ${basketCount} baskets, will process lego_pairs.json for all ${seeds} seeds\n`);
        }
      } catch (err) {
        console.log(`[Resume] baskets directory exists but invalid, will regenerate`);
      }
    }

    if (!phase5AlreadyComplete) {
      // Prep Phase 5 scaffolds (mechanical work)
      console.log(`[Web Orchestrator] Running Phase 5 scaffold prep script...`);
      const { preparePhase5Scaffolds } = require('./scripts/phase5_prep_scaffolds.cjs');
      await preparePhase5Scaffolds(courseDir);
      console.log(`[Web Orchestrator] ✅ Phase 5 scaffolds ready`);

      const phase5MasterPrompt = generatePhase5MasterPrompt(courseCode, { target, known, startSeed, endSeed }, courseDir);
      await fs.writeFile(path.join(courseDir, 'prompts', 'phase_5_master_prompt.md'), phase5MasterPrompt, 'utf8');

      console.log(`[Web Orchestrator] Opening Phase 5 tab and pasting master prompt...`);
      console.log(`[Web Orchestrator] Master prompt will spawn ${Math.ceil((endSeed - startSeed + 1) / 20)} parallel agents`);
      await spawnClaudeWebAgent(phase5MasterPrompt, 3, 'safari');
      console.log(`[Web Orchestrator] ✅ Phase 5 master prompt pasted - HIT ENTER to spawn agents!`);

      job.progress = 70;
      job.message = 'Phase 5 tab opened - waiting for execution';

      // Poll for all agent provisional outputs
      console.log(`[Web Orchestrator] Waiting for all Phase 5 agent outputs...`);
      const expectedAgents = Math.ceil((endSeed - startSeed + 1) / 20);
      const phase5OutputsDir = path.join(courseDir, 'phase5_outputs');

      // Wait for all provisional files
      let agentsComplete = 0;
      while (agentsComplete < expectedAgents) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Check every 10 seconds

        if (await fs.pathExists(phase5OutputsDir)) {
          const files = await fs.readdir(phase5OutputsDir);
          agentsComplete = files.filter(f => f.match(/^agent_\d+_provisional\.json$/)).length;

          // Update job with detailed progress
          job.message = `Phase 5: ${agentsComplete}/${expectedAgents} agents complete`;
          job.subProgress = {
            phase: 'phase_5',
            completed: agentsComplete,
            total: expectedAgents,
            percentage: Math.round((agentsComplete / expectedAgents) * 100)
          };

          console.log(`[Web Orchestrator] Phase 5 agents complete: ${agentsComplete}/${expectedAgents}`);
        }
      }

      console.log(`[Web Orchestrator] ✅ All Phase 5 agents complete! Running merge script...`);

      // Run Phase 5 merge script
      const { mergePhase5Baskets } = require('./scripts/phase5_merge_baskets.cjs');
      await mergePhase5Baskets(courseDir);

      console.log(`[Web Orchestrator] ✅ Phase 5 merge complete! Created basket files`);
      job.phase = 'phase_5_complete';
      job.progress = 90;
    }

    // PHASE 6: Introduction Generation
    job.phase = 'phase_6';
    job.progress = 92;
    job.message = 'Phase 6: Generating introductions';

    console.log(`\n[Web Orchestrator] ====================================`);
    console.log(`[Web Orchestrator] PHASE 6: INTRODUCTION GENERATION`);
    console.log(`[Web Orchestrator] ====================================`);

    const introductionsPath = path.join(courseDir, 'introductions.json');
    let phase6AlreadyComplete = false;

    if (await fs.pathExists(introductionsPath)) {
      phase6AlreadyComplete = true;
      console.log(`\n[Resume] ✅ Phase 6 already complete! Found introductions.json`);
      console.log(`[Resume] Skipping Phase 6, proceeding to Phase 7...`);
      console.log(`[Resume] (To regenerate: delete ${introductionsPath})\n`);
      job.progress = 94;
    }

    if (!phase6AlreadyComplete) {
      console.log(`[Web Orchestrator] Running Phase 6 introduction generation script...`);
      const { generateIntroductions } = require('./scripts/phase6-generate-introductions.cjs');
      await generateIntroductions(courseDir);
      console.log(`[Web Orchestrator] ✅ Phase 6 complete! Generated introductions`);
      job.progress = 94;
    }

    // PHASE 7: Course Manifest Compilation
    job.phase = 'phase_7';
    job.progress = 96;
    job.message = 'Phase 7: Compiling course manifest';

    console.log(`\n[Web Orchestrator] ====================================`);
    console.log(`[Web Orchestrator] PHASE 7: COURSE MANIFEST COMPILATION`);
    console.log(`[Web Orchestrator] ====================================`);

    const manifestPath = path.join(courseDir, 'course_manifest.json');
    let phase7AlreadyComplete = false;

    if (await fs.pathExists(manifestPath)) {
      phase7AlreadyComplete = true;
      console.log(`\n[Resume] ✅ Phase 7 already complete! Found course_manifest.json`);
      console.log(`[Resume] Skipping Phase 7, all phases complete!`);
      console.log(`[Resume] (To regenerate: delete ${manifestPath})\n`);
      job.progress = 100;
      job.status = 'completed';
      job.message = 'All phases completed successfully';
    }

    if (!phase7AlreadyComplete) {
      console.log(`[Web Orchestrator] Running Phase 7 manifest compilation script...`);
      const { compileManifest } = require('./scripts/phase7_compile_manifest.cjs');
      await compileManifest(courseDir);
      console.log(`[Web Orchestrator] ✅ Phase 7 complete! Generated course_manifest.json`);
      job.progress = 100;
      job.status = 'completed';
      job.message = 'All phases completed successfully';
    }

    console.log(`\n[Web Orchestrator] ====================================`);
    console.log(`[Web Orchestrator] ✅ COMPLETE COURSE GENERATION FINISHED`);
    console.log(`[Web Orchestrator] ====================================`);
    console.log(`[Web Orchestrator] Course: ${courseCode}`);
    console.log(`[Web Orchestrator] Output: ${courseDir}`);
    console.log(`[Web Orchestrator] Final manifest: ${manifestPath}`);
    console.log(`[Web Orchestrator] ====================================`);

  } catch (error) {
    console.error(`[Web Orchestrator] Error:`, error);
    job.status = 'failed';
    job.error = error.message;
  }
}

/**
 * API Mode Orchestrator - Direct Anthropic API calls (server-side execution)
 * Uses existing Anthropic SDK integration for fully automated course generation
 */
async function spawnCourseOrchestratorAPI(courseCode, params) {
  const job = STATE.jobs.get(courseCode);
  const courseDir = await ensureCourseDirectory(courseCode);

  console.log(`[API Orchestrator] Starting server-side course generation: ${courseCode}`);
  console.log(`[API Orchestrator] Mode: Direct Anthropic API (fully automated)`);

  const { target, known, seeds, startSeed, endSeed } = params;

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(`[API Orchestrator] ❌ ANTHROPIC_API_KEY not found in environment`);
    job.status = 'failed';
    job.error = 'ANTHROPIC_API_KEY not configured. Please set API key in .env file.';
    return;
  }

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    console.log(`[API Orchestrator] ✅ Anthropic client initialized`);
    console.log(`[API Orchestrator] Processing ${seeds} seeds (${startSeed}-${endSeed})`);

    // Phase 1: Pedagogical Translation
    job.phase = 'phase_1_api';
    job.progress = 0;
    job.message = 'Phase 1: Translating seeds via API';

    console.log(`\n[API Orchestrator] ====================================`);
    console.log(`[API Orchestrator] PHASE 1: PEDAGOGICAL TRANSLATION`);
    console.log(`[API Orchestrator] ====================================`);

    const phase1Brief = generatePhase1Brief(courseCode, { target, known, startSeed, endSeed, batchNum: 1, totalBatches: 1 }, courseDir);

    const phase1Response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: phase1Brief
      }]
    });

    console.log(`[API Orchestrator] ✅ Phase 1 API call complete`);
    console.log(`[API Orchestrator] Processing response...`);

    // Extract seed_pairs.json from response
    const phase1Content = phase1Response.content[0].text;
    const phase1JsonMatch = phase1Content.match(/```json\n([\s\S]+?)\n```/);

    if (!phase1JsonMatch) {
      throw new Error('Failed to extract seed_pairs.json from Phase 1 response');
    }

    const seedPairs = JSON.parse(phase1JsonMatch[1]);
    const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
    await fs.writeJson(seedPairsPath, seedPairs, { spaces: 2 });

    console.log(`[API Orchestrator] ✅ Saved seed_pairs.json (${Object.keys(seedPairs.translations || {}).length} seeds)`);

    job.phase = 'phase_1_complete';
    job.progress = 30;

    // Phase 3: LEGO Extraction
    job.phase = 'phase_3_api';
    job.progress = 35;
    job.message = 'Phase 3: Extracting LEGOs via API';

    console.log(`\n[API Orchestrator] ====================================`);
    console.log(`[API Orchestrator] PHASE 3: LEGO EXTRACTION`);
    console.log(`[API Orchestrator] ====================================`);

    const phase3Brief = generatePhase3Brief(courseCode, { target, known, startSeed, endSeed, batchNum: 1, totalBatches: 1 }, courseDir);

    const phase3Response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 32000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: phase3Brief
      }]
    });

    console.log(`[API Orchestrator] ✅ Phase 3 API call complete`);
    console.log(`[API Orchestrator] Processing response...`);

    // Extract lego_pairs.json from response
    const phase3Content = phase3Response.content[0].text;
    const phase3JsonMatch = phase3Content.match(/```json\n([\s\S]+?)\n```/);

    if (!phase3JsonMatch) {
      throw new Error('Failed to extract lego_pairs.json from Phase 3 response');
    }

    const legoPairs = JSON.parse(phase3JsonMatch[1]);
    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
    await fs.writeJson(legoPairsPath, legoPairs, { spaces: 2 });

    console.log(`[API Orchestrator] ✅ Saved lego_pairs.json (${legoPairs.seeds?.length || 0} seeds)`);

    job.phase = 'phase_3_complete';
    job.progress = 60;

    // Phase 5: Practice Baskets
    job.phase = 'phase_5_api';
    job.progress = 65;
    job.message = 'Phase 5: Generating practice baskets via API';

    console.log(`\n[API Orchestrator] ====================================`);
    console.log(`[API Orchestrator] PHASE 5: PRACTICE BASKETS`);
    console.log(`[API Orchestrator] ====================================`);

    const phase5Brief = generatePhase5Brief(courseCode, { target, known, startSeed, endSeed, batchNum: 1, totalBatches: 1 }, courseDir);

    const phase5Response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 64000,
      temperature: 0.5,
      messages: [{
        role: 'user',
        content: phase5Brief
      }]
    });

    console.log(`[API Orchestrator] ✅ Phase 5 API call complete`);
    console.log(`[API Orchestrator] Processing response...`);

    // Extract lego_baskets.json from response
    const phase5Content = phase5Response.content[0].text;
    const phase5JsonMatch = phase5Content.match(/```json\n([\s\S]+?)\n```/);

    if (!phase5JsonMatch) {
      throw new Error('Failed to extract lego_baskets.json from Phase 5 response');
    }

    const baskets = JSON.parse(phase5JsonMatch[1]);
    const basketsPath = path.join(courseDir, 'lego_baskets.json');
    await fs.writeJson(basketsPath, baskets, { spaces: 2 });

    console.log(`[API Orchestrator] ✅ Saved lego_baskets.json`);

    job.phase = 'phase_5_complete';
    job.progress = 100;
    job.status = 'completed';
    job.message = 'All phases completed successfully via API';

    console.log(`\n[API Orchestrator] ====================================`);
    console.log(`[API Orchestrator] ✅ COURSE GENERATION COMPLETE`);
    console.log(`[API Orchestrator] ====================================`);
    console.log(`[API Orchestrator] Course: ${courseCode}`);
    console.log(`[API Orchestrator] Seeds: ${seeds} (${startSeed}-${endSeed})`);
    console.log(`[API Orchestrator] Output: ${courseDir}`);
    console.log(`[API Orchestrator] ====================================`);

  } catch (error) {
    console.error(`[API Orchestrator] Error:`, error);
    job.status = 'failed';
    job.error = error.message;
    job.message = `API orchestration failed: ${error.message}`;
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
 * Run Phase 5.5: LEGO and Basket Deduplication
 */
async function runPhase5_5Deduplication(courseCode, courseDir) {
  const script = path.join(__dirname, 'scripts', 'phase5.5-deduplicate-baskets.cjs');

  console.log(`[Phase 5.5] Running deduplication script...`);

  return new Promise((resolve, reject) => {
    const child = exec(`node "${script}" "${courseCode}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Phase 5.5] Script error:`, stderr);
        reject(new Error(stderr || error.message));
        return;
      }

      console.log(stdout);
      resolve();
    });
  });
}

/**
 * Run Phase 6: Introduction Generation
 */
async function runPhase6Introductions(courseCode, courseDir) {
  const script = path.join(__dirname, 'scripts', 'phase6-generate-introductions.cjs');

  console.log(`[Phase 6] Running introduction generation script...`);

  return new Promise((resolve, reject) => {
    const child = exec(`node "${script}" "${courseCode}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Phase 6] Script error:`, stderr);
        reject(new Error(stderr || error.message));
        return;
      }

      console.log(stdout);
      resolve();
    });
  });
}

/**
 * Run Phase 7: Course Manifest Compilation
 */
async function runPhase7Compilation(courseCode, courseDir) {
  const script = path.join(__dirname, 'scripts', 'phase7-compile-manifest.cjs');

  console.log(`[Phase 7] Running compilation script...`);

  return new Promise((resolve, reject) => {
    const child = exec(`node "${script}" "${courseCode}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Phase 7] Script error:`, stderr);
        reject(new Error(stderr || error.message));
        return;
      }

      console.log(stdout);
      resolve();
    });
  });
}

/**
 * Poll for phase completion and auto-progress through pipeline
 */
async function pollAndContinue(courseCode, params, courseDir, phase1Batches, phase3Batches, phase5Batches) {
  const job = STATE.jobs.get(courseCode);
  const { target, known, seeds, startSeed, endSeed } = params;

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
      await closeAgentWindows(job.windowIds, job.processIds || []);
      job.windowIds = []; // Reset for Phase 3
      job.processIds = []; // Reset for Phase 3
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
        const batchStartSeed = startSeed + (i * 70);
        const batchEndSeed = Math.min(startSeed + ((i + 1) * 70) - 1, endSeed);
        const batchNum = i + 1;

        console.log(`[Phase 3] Spawning batch ${batchNum}/${phase3Batches}: S${String(batchStartSeed).padStart(4, '0')}-S${String(batchEndSeed).padStart(4, '0')}`);

        const brief = generatePhase3Brief(courseCode, { target, known, startSeed: batchStartSeed, endSeed: batchEndSeed, batchNum, totalBatches: phase3Batches }, courseDir);
        await spawnPhaseAgent(`3-batch${batchNum}`, brief, courseDir, courseCode);

        // 60-second stagger for stable spawning and RAM breathing room
        if (i < phase3Batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 60000));
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

    // Close Phase 3 windows to free RAM before validation
    if (job.windowIds && job.windowIds.length > 0) {
      console.log(`[Cleanup] Closing ${job.windowIds.length} Phase 3 windows to free RAM...`);
      await closeAgentWindows(job.windowIds, job.processIds || []);
      job.windowIds = []; // Reset for Phase 5
      job.processIds = []; // Reset for Phase 5
    }

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
      await closeAgentWindows(job.windowIds, job.processIds || []);
      job.windowIds = []; // Reset for Phase 5
      job.processIds = []; // Reset for Phase 5
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
    job.progress = 95;

    // Close Phase 5 windows to free RAM before Phase 5.5
    if (job.windowIds && job.windowIds.length > 0) {
      console.log(`[Cleanup] Closing ${job.windowIds.length} Phase 5 windows to free RAM...`);
      await closeAgentWindows(job.windowIds, job.processIds || []);
      job.windowIds = [];
      job.processIds = [];
    }

    // PHASE 5.5: DEDUPLICATION
    console.log(`\n[Phase 5.5] Starting LEGO and basket deduplication...\n`);
    job.phase = 'phase_5.5';

    try {
      await runPhase5_5Deduplication(courseCode, courseDir);
      console.log(`[Phase 5.5] ✅ Deduplication complete\n`);
    } catch (error) {
      console.error(`[Phase 5.5] ❌ Deduplication failed:`, error.message);
      job.status = 'failed';
      job.error = `Phase 5.5 deduplication failed: ${error.message}`;
      return;
    }

    job.progress = 96;

    // PHASE 6: INTRODUCTION GENERATION
    console.log(`\n[Phase 6] Starting introduction generation...\n`);
    job.phase = 'phase_6';

    try {
      await runPhase6Introductions(courseCode, courseDir);
      console.log(`[Phase 6] ✅ Introductions generated\n`);
    } catch (error) {
      console.error(`[Phase 6] ❌ Introduction generation failed:`, error.message);
      job.status = 'failed';
      job.error = `Phase 6 introduction generation failed: ${error.message}`;
      return;
    }

    job.progress = 98;

    // PHASE 7: COURSE MANIFEST COMPILATION
    console.log(`\n[Phase 7] Starting course manifest compilation...\n`);
    job.phase = 'phase_7';

    try {
      await runPhase7Compilation(courseCode, courseDir);
      console.log(`[Phase 7] ✅ Course manifest compiled\n`);
    } catch (error) {
      console.error(`[Phase 7] ❌ Compilation failed:`, error.message);
      job.status = 'failed';
      job.error = `Phase 7 compilation failed: ${error.message}`;
      return;
    }

    job.progress = 100;
    job.phase = 'completed';
    job.status = 'completed';
    job.endTime = new Date();

    console.log(`✅ COURSE GENERATION COMPLETE: ${courseCode}`);
    console.log(`📊 Check validator reports for final stats\n`);

    // Close all agent windows to free RAM
    if (job.windowIds && job.windowIds.length > 0) {
      await closeAgentWindows(job.windowIds, job.processIds || []);
      job.windowIds = []; // Clear tracked windows
      job.processIds = []; // Clear tracked processes
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
      await closeAgentWindows(job.windowIds, job.processIds || []);
      job.windowIds = []; // Clear tracked windows
      job.processIds = []; // Clear tracked processes
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
// BASKET GENERATION ORCHESTRATION
// --------------------------------------------------------------------------

/**
 * Spawn basket generation agent for a course
 */
async function spawnBasketGenerationAgent(courseCode, params) {
  const jobId = `${courseCode}_baskets`;
  const job = STATE.jobs.get(jobId);
  const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);

  console.log(`[Baskets] Starting basket generation for ${courseCode}`);
  if (params.startSeed && params.endSeed) {
    console.log(`[Baskets] Seed range: ${params.startSeed}-${params.endSeed}`);
  }

  try {
    // Build the agent prompt
    const prompt = `You are generating practice baskets for the SSi course: ${courseCode}

TASK: Run the universal basket generation system

The orchestrator is ready at: ${courseDir}/orchestrate_basket_generation.cjs

Run this command to start basket generation:
node orchestrate_basket_generation.cjs

The orchestrator will:
- Process all LEGOs in the course
- Generate vocalization-optimized prompts
- Display prompts for you to generate 8-12 conversational Spanish phrases
- Resume intelligently (skips LEGOs with existing baskets)
- Validate baskets (vocabulary + quality)
- Save to lego_baskets.json

For each LEGO prompt:
1. Generate 8-12 speakable phrases combining the target LEGO with available vocabulary
2. Follow the quality rules (no single words, complete thoughts, natural word order)
3. Output format: Spanish phrase | English prompt (one per line)

Continue processing all remaining LEGOs until complete.`;

    // Spawn the agent using the standard spawnPhaseAgent (includes --permission-mode bypassPermissions)
    const result = await spawnPhaseAgent('baskets', prompt, courseDir, courseCode);

    // Update job status
    job.status = 'in_progress';
    job.phase = 'generating';
    job.progress = 0;
    job.windowId = result.windowId;
    job.processId = result.pid;

    console.log(`[Baskets] Agent spawned in iTerm2 window ${result.windowId}`);

  } catch (error) {
    console.error(`[Baskets] Error spawning agent:`, error);
    job.status = 'error';
    job.error = error.message;
    throw error;
  }
}

// --------------------------------------------------------------------------
// PHASE 5 WEB-BASED AGENTS (Claude Code on the Web via Browser)
// --------------------------------------------------------------------------

/**
 * Build Phase 5 agent prompt with scaffold data
 */
function buildPhase5AgentPrompt(agentNum, scaffold, batchName) {
  return `# Phase 5 Basket Generation - Agent ${agentNum}

## Your Task

You are Agent ${agentNum}. Generate practice phrases for ${scaffold.length} LEGOs using the Phase 5 v4.1 protocol.

## Batch Information

- **Batch**: ${batchName}
- **Agent**: ${agentNum}
- **LEGOs**: ${scaffold.length}

## Scaffold Data

The scaffold below contains:
- Pre-built whitelist of allowed Spanish words (from previously taught LEGOs)
- Empty practice_phrases arrays (you will fill these)
- Metadata for each LEGO

<scaffold>
${JSON.stringify(scaffold, null, 2)}
</scaffold>

## Instructions

For each LEGO in the scaffold:

1. **Generate 10 natural English phrases** using this LEGO
   - Vary length: 1-2 words, 3-5 words, 6+ words
   - Natural, speakable phrases (not templates)
   - Complete thoughts (avoid single words)

2. **Translate to Spanish** using ONLY words from the whitelist
   - CRITICAL: Only use words in the whitelist array
   - Do not invent new words
   - Ensure natural Spanish word order

3. **Format**: Each phrase as:
   \`\`\`json
   ["English phrase", "Spanish phrase", null, word_count]
   \`\`\`

4. **Validate**:
   - All Spanish words are in whitelist ✅
   - Phrases are natural and speakable ✅
   - Variety in length and structure ✅

## Quality Standards

✅ **DO**:
- Use natural, conversational phrases
- Vary sentence structure
- Combine multiple LEGOs creatively
- Ensure phrases are speakable aloud

❌ **DON'T**:
- Use template patterns like "I think that {lego} is good"
- Create single-word phrases
- Invent Spanish words not in whitelist
- Use awkward or unnatural constructions

## Output Format

Complete basket JSON with practice_phrases filled in:

\`\`\`json
[
  {
    "lego": ["to show you", "mostrarte"],
    "practice_phrases": [
      ["to show you", "mostrarte", null, 1],
      ["he wants to show you", "él quiere mostrarte", null, 3],
      ...10 total phrases
    ],
    "whitelist": [...],
    ...metadata
  },
  ...all LEGOs
]
\`\`\`

## How to Save

Use Claude Code's commit feature to save directly to GitHub:

**File path**: \`${batchName}/batch_output/agent_${agentNum}_baskets.json\`

**Commit message**: \`Phase 5: Agent ${agentNum} baskets complete (${scaffold.length} LEGOs)\`

---

**Start with the first LEGO and work through all ${scaffold.length} systematically. Good luck!**
`;
}

/**
 * POST /api/phase5/spawn-web-agents
 * Spawn Phase 5 agents in browser (Claude Code on the Web)
 */
app.post('/api/phase5/spawn-web-agents', async (req, res) => {
  try {
    const { batchName, agentCount = 34, browser = 'chrome' } = req.body;

    console.log(`[Phase 5 Web] Spawning ${agentCount} web agents for ${batchName}...`);

    // 1. Load scaffolds
    const scaffoldsDir = path.join(__dirname, batchName, 'scaffolds');

    if (!await fs.pathExists(scaffoldsDir)) {
      throw new Error(`Scaffolds directory not found: ${scaffoldsDir}`);
    }

    const scaffoldFiles = await fs.readdir(scaffoldsDir);
    const agentScaffolds = scaffoldFiles
      .filter(f => f.startsWith('agent_') && f.endsWith('_scaffold.json'))
      .sort();

    if (agentScaffolds.length === 0) {
      throw new Error(`No scaffold files found in ${scaffoldsDir}`);
    }

    console.log(`[Phase 5 Web] Found ${agentScaffolds.length} scaffold files`);

    // 2. Build prompts for each agent
    const prompts = await Promise.all(
      agentScaffolds.map(async (file, idx) => {
        const agentNum = String(idx + 1).padStart(2, '0');
        const scaffoldPath = path.join(scaffoldsDir, file);
        const scaffold = await fs.readJson(scaffoldPath);

        return {
          agentNum,
          prompt: buildPhase5AgentPrompt(agentNum, scaffold, batchName),
          scaffoldFile: file,
          legoCount: scaffold.length
        };
      })
    );

    // 3. Save prompts to files
    const promptsDir = path.join(__dirname, batchName, 'prompts');
    await fs.ensureDir(promptsDir);

    await Promise.all(
      prompts.map(async ({ agentNum, prompt }) => {
        const promptPath = path.join(promptsDir, `agent_${agentNum}_prompt.md`);
        await fs.writeFile(promptPath, prompt, 'utf8');
      })
    );

    console.log(`[Phase 5 Web] Created ${prompts.length} prompt files in ${promptsDir}`);

    // 4. Open browser tabs using spawn_claude_web_agent.cjs
    const { spawnAgentsWithPromptFiles } = require('./spawn_claude_web_agent.cjs');

    const result = await spawnAgentsWithPromptFiles(
      prompts.map(p => p.prompt),
      promptsDir
    );

    console.log(`[Phase 5 Web] ✅ Spawned ${result.tabCount} browser tabs`);

    // 5. Return success with instructions
    res.json({
      success: true,
      message: `Opened ${result.tabCount} Claude Code tabs`,
      batchName,
      promptsDir,
      agentCount: prompts.length,
      agents: prompts.map(p => ({
        agentNum: p.agentNum,
        legoCount: p.legoCount,
        promptFile: `agent_${p.agentNum}_prompt.md`
      })),
      instructions: [
        '1. Switch to each browser tab (claude.ai/code should be loaded)',
        '2. Open the corresponding prompt file from prompts directory',
        '3. Copy the entire prompt',
        '4. Paste into Claude Code',
        '5. Hit Enter to run',
        '6. Once complete, use Claude\'s commit feature to save output',
        '7. Dashboard will monitor GitHub for completed baskets'
      ],
      nextSteps: {
        monitorUrl: `/api/phase5/progress/${encodeURIComponent(batchName)}`,
        outputDir: `${batchName}/batch_output/`
      }
    });

  } catch (error) {
    console.error('[Phase 5 Web] Error spawning agents:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/phase5/progress/:batchName
 * Monitor completion progress of web agents
 */
app.get('/api/phase5/progress/:batchName', async (req, res) => {
  try {
    const { batchName } = req.params;
    const { agentCount = 34 } = req.query;

    console.log(`[Phase 5 Web] Checking progress for ${batchName}...`);

    const outputDir = path.join(__dirname, batchName, 'batch_output');

    // Check if output directory exists
    if (!await fs.pathExists(outputDir)) {
      return res.json({
        batchName,
        progress: {
          completed: 0,
          total: parseInt(agentCount),
          percentage: 0
        },
        agents: Array.from({ length: parseInt(agentCount) }, (_, i) => ({
          agentId: i + 1,
          agentNum: String(i + 1).padStart(2, '0'),
          status: 'pending',
          outputPath: `${batchName}/batch_output/agent_${String(i + 1).padStart(2, '0')}_baskets.json`
        }))
      });
    }

    // Check each agent's output file
    const agentStatuses = await Promise.all(
      Array.from({ length: parseInt(agentCount) }, async (_, i) => {
        const agentId = i + 1;
        const agentNum = String(agentId).padStart(2, '0');
        const outputPath = path.join(outputDir, `agent_${agentNum}_baskets.json`);

        if (!await fs.pathExists(outputPath)) {
          return {
            agentId,
            agentNum,
            status: 'pending',
            outputPath: `${batchName}/batch_output/agent_${agentNum}_baskets.json`
          };
        }

        // File exists - check if valid
        try {
          const basket = await fs.readJson(outputPath);

          if (!Array.isArray(basket)) {
            return {
              agentId,
              agentNum,
              status: 'invalid',
              error: 'Output is not an array',
              outputPath: `${batchName}/batch_output/agent_${agentNum}_baskets.json`
            };
          }

          // Quick validation: all LEGOs should have practice_phrases
          const hasAllPhrases = basket.every(lego =>
            lego.practice_phrases &&
            Array.isArray(lego.practice_phrases) &&
            lego.practice_phrases.length === 10
          );

          const stats = await fs.stat(outputPath);

          return {
            agentId,
            agentNum,
            status: hasAllPhrases ? 'completed' : 'incomplete',
            legoCount: basket.length,
            totalPhrases: basket.reduce((sum, lego) =>
              sum + (lego.practice_phrases?.length || 0), 0
            ),
            fileSize: stats.size,
            lastModified: stats.mtime,
            outputPath: `${batchName}/batch_output/agent_${agentNum}_baskets.json`,
            issues: hasAllPhrases ? [] : ['Some LEGOs missing practice_phrases']
          };

        } catch (error) {
          return {
            agentId,
            agentNum,
            status: 'error',
            error: error.message,
            outputPath: `${batchName}/batch_output/agent_${agentNum}_baskets.json`
          };
        }
      })
    );

    const completed = agentStatuses.filter(a => a.status === 'completed').length;
    const total = parseInt(agentCount);

    res.json({
      batchName,
      progress: {
        completed,
        total,
        percentage: Math.round((completed / total) * 100),
        pending: agentStatuses.filter(a => a.status === 'pending').length,
        incomplete: agentStatuses.filter(a => a.status === 'incomplete').length,
        errors: agentStatuses.filter(a => a.status === 'error').length,
        invalid: agentStatuses.filter(a => a.status === 'invalid').length
      },
      agents: agentStatuses,
      summary: {
        totalLegos: agentStatuses.reduce((sum, a) => sum + (a.legoCount || 0), 0),
        totalPhrases: agentStatuses.reduce((sum, a) => sum + (a.totalPhrases || 0), 0)
      }
    });

  } catch (error) {
    console.error('[Phase 5 Web] Error checking progress:', error);
    res.status(500).json({
      success: false,
      error: error.message
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

  // Extract execution mode (default to 'web' - recommended mode)
  const executionMode = req.body.executionMode || 'web';

  // Calculate total seeds
  const seeds = endSeed - startSeed + 1;

  // Generate course code with seed range suffix (follows COURSE_FILE_PROTOCOLS.md)
  const courseCode = generateCourseCode(target, known, startSeed, endSeed);

  console.log(`[API] Course generation requested: ${courseCode} (mode: ${executionMode}, seeds: ${startSeed}-${endSeed})`);

  // Safety check: Warn if course directory already exists with data
  const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);
  if (await fs.pathExists(courseDir)) {
    const existingFiles = [];

    // Check for existing phase outputs
    if (await fs.pathExists(path.join(courseDir, 'seed_pairs.json'))) existingFiles.push('seed_pairs.json');
    if (await fs.pathExists(path.join(courseDir, 'lego_pairs.json'))) existingFiles.push('lego_pairs.json');
    if (await fs.pathExists(path.join(courseDir, 'lego_baskets.json'))) existingFiles.push('lego_baskets.json');
    if (await fs.pathExists(path.join(courseDir, 'introductions.json'))) existingFiles.push('introductions.json');
    if (await fs.pathExists(path.join(courseDir, 'compilation.json'))) existingFiles.push('compilation.json');

    if (existingFiles.length > 0) {
      console.log(`[API] ⚠️  WARNING: Course ${courseCode} already exists with data`);
      console.log(`[API] Existing files: ${existingFiles.join(', ')}`);

      // Check if client sent force=true flag
      if (!req.body.force) {
        return res.status(409).json({
          error: 'Course already exists with data',
          courseCode,
          existingFiles,
          message: 'This will overwrite existing course data. Send force=true to proceed.',
          suggestion: 'Use a different seed range or delete the existing course first.'
        });
      } else {
        console.log(`[API] ✓ force=true provided, proceeding with overwrite`);
      }
    }
  }

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
    executionMode,
    params: { target, known, seeds, startSeed, endSeed },
    windowIds: [] // Track iTerm2 windows for cleanup
  };

  STATE.jobs.set(courseCode, job);

  // Route to appropriate orchestrator based on execution mode
  try {
    if (executionMode === 'web') {
      console.log(`[API] Using Web Mode - Browser automation`);
      spawnCourseOrchestratorWeb(courseCode, { target, known, seeds, startSeed, endSeed }).catch(err => {
        console.error(`[API] Web orchestrator error:`, err);
        job.status = 'failed';
        job.error = err.message;
      });
    } else if (executionMode === 'api') {
      console.log(`[API] Using API Mode - Direct Anthropic API`);
      spawnCourseOrchestratorAPI(courseCode, { target, known, seeds, startSeed, endSeed }).catch(err => {
        console.error(`[API] API orchestrator error:`, err);
        job.status = 'failed';
        job.error = err.message;
      });
    } else {
      // Default to local mode (iTerm2 + Claude CLI)
      console.log(`[API] Using Local Mode - iTerm2 + Claude CLI`);
      spawnCourseOrchestrator(courseCode, { target, known, seeds, startSeed, endSeed }).catch(err => {
        console.error(`[API] Local orchestrator error:`, err);
        job.status = 'failed';
        job.error = err.message;
      });
    }

    res.json({
      success: true,
      courseCode,
      executionMode,
      message: `Course generation started with ${executionMode} execution mode`,
      status: job
    });
  } catch (err) {
    console.error(`[API] Error starting orchestrator:`, err);
    job.status = 'failed';
    job.error = err.message;
    res.status(500).json({
      error: 'Failed to start course generation',
      details: err.message
    });
  }
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
 * DELETE /api/courses/:courseCode/status
 * Clear/cancel a course generation job (useful for stuck jobs)
 */
app.delete('/api/courses/:courseCode/status', (req, res) => {
  const { courseCode } = req.params;
  const job = STATE.jobs.get(courseCode);

  if (!job) {
    return res.status(404).json({
      error: 'No job found for this course',
      courseCode
    });
  }

  // Delete the job from state
  STATE.jobs.delete(courseCode);

  console.log(`[API] Cleared job for course: ${courseCode}`);

  res.json({
    success: true,
    message: 'Job cleared successfully',
    courseCode,
    previousStatus: job.status
  });
});

/**
 * POST /api/courses/:code/baskets/generate
 * Generate practice baskets for a course
 */
app.post('/api/courses/:code/baskets/generate', async (req, res) => {
  const { code: courseCode } = req.params;
  const { startSeed, endSeed } = req.body;

  // Check if course exists
  const coursePath = path.join(CONFIG.VFS_ROOT, courseCode);
  if (!await fs.pathExists(coursePath)) {
    return res.status(404).json({ error: 'Course not found', courseCode });
  }

  // Check if job already exists
  const jobId = `${courseCode}_baskets`;
  if (STATE.jobs.has(jobId)) {
    const job = STATE.jobs.get(jobId);
    if (job.status === 'in_progress') {
      return res.status(409).json({
        error: 'Basket generation already in progress',
        courseCode,
        status: job
      });
    }
  }

  // Create new job
  const job = {
    courseCode,
    type: 'basket_generation',
    status: 'in_progress',
    phase: 'initializing',
    progress: 0,
    startTime: new Date(),
    params: { startSeed, endSeed },
    windowIds: []
  };

  STATE.jobs.set(jobId, job);

  // Spawn basket generation agent
  spawnBasketGenerationAgent(courseCode, { startSeed, endSeed }).catch(err => {
    console.error(`[API] Basket generation error:`, err);
    job.status = 'error';
    job.error = err.message;
  });

  res.json({
    success: true,
    courseCode,
    jobId,
    message: 'Basket generation started',
    status: job
  });
});

/**
 * GET /api/courses/:courseCode/baskets
 * Returns all baskets for a course
 */
app.get('/api/courses/:courseCode/baskets', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const basketsPath = path.join(CONFIG.VFS_ROOT, courseCode, 'lego_baskets.json');

    // Check if baskets file exists
    if (!await fs.pathExists(basketsPath)) {
      return res.status(404).json({
        error: 'Baskets not found for this course',
        courseCode
      });
    }

    // Load baskets
    const baskets = await fs.readJson(basketsPath);

    // Validate JSON structure
    if (typeof baskets !== 'object' || baskets === null) {
      return res.status(500).json({
        error: 'Invalid baskets file format',
        courseCode
      });
    }

    // Calculate statistics
    const seedIds = Object.keys(baskets);
    const totalBaskets = seedIds.length;
    let totalEPhrases = 0;
    let totalDPhrases = 0;

    seedIds.forEach(seedId => {
      const basket = baskets[seedId];
      if (basket.e && Array.isArray(basket.e)) {
        totalEPhrases += basket.e.length;
      }
      if (basket.d && typeof basket.d === 'object') {
        Object.values(basket.d).forEach(phrases => {
          if (Array.isArray(phrases)) {
            totalDPhrases += phrases.length;
          }
        });
      }
    });

    res.json({
      courseCode,
      baskets,
      stats: {
        totalBaskets,
        totalEPhrases,
        totalDPhrases,
        totalPhrases: totalEPhrases + totalDPhrases
      }
    });
  } catch (err) {
    console.error('[API] Error loading baskets:', err);
    res.status(500).json({
      error: 'Failed to load baskets',
      details: err.message
    });
  }
});

/**
 * GET /api/courses/:courseCode/baskets/:seedId
 * Returns specific basket
 */
app.get('/api/courses/:courseCode/baskets/:seedId', async (req, res) => {
  try {
    const { courseCode, seedId } = req.params;
    // New structure: individual basket files in baskets/ directory
    const basketPath = path.join(CONFIG.VFS_ROOT, courseCode, 'baskets', `lego_baskets_${seedId.toLowerCase()}.json`);

    // Check if basket file exists
    if (!await fs.pathExists(basketPath)) {
      return res.status(404).json({
        error: `Basket not found for seed ${seedId}`,
        courseCode,
        seedId,
        path: basketPath
      });
    }

    // Load individual basket file
    const basket = await fs.readJson(basketPath);

    // Calculate statistics from new basket format
    // Count all LEGO entries (keys like S0001L01, S0001L02, etc.)
    let totalPhrases = 0;
    let totalLegos = 0;
    const legoKeys = Object.keys(basket).filter(k => k.match(/^S\d{4}L\d{2}$/));

    legoKeys.forEach(legoKey => {
      const legoData = basket[legoKey];
      if (legoData.practice_phrases && Array.isArray(legoData.practice_phrases)) {
        totalPhrases += legoData.practice_phrases.length;
      }
    });

    totalLegos = legoKeys.length;

    res.json({
      courseCode,
      seedId,
      basket,
      stats: {
        totalLegos,
        totalPhrases,
        legoKeys
      }
    });
  } catch (err) {
    console.error('[API] Error loading basket:', err);
    res.status(500).json({
      error: 'Failed to load basket',
      details: err.message
    });
  }
});

/**
 * PUT /api/courses/:courseCode/baskets/:seedId
 * Update specific basket (new format: individual files)
 */
app.put('/api/courses/:courseCode/baskets/:seedId', async (req, res) => {
  try {
    const { courseCode, seedId } = req.params;
    const basketData = req.body;

    // New structure: individual basket files in baskets/ directory
    const basketPath = path.join(CONFIG.VFS_ROOT, courseCode, 'baskets', `lego_baskets_${seedId.toLowerCase()}.json`);

    console.log(`[API] Updating basket ${seedId} in ${courseCode}`);

    // Check if basket file exists
    if (!await fs.pathExists(basketPath)) {
      return res.status(404).json({
        error: `Basket not found for seed ${seedId}`,
        courseCode,
        seedId
      });
    }

    // Basic validation - ensure it's an object with required fields
    if (!basketData || typeof basketData !== 'object') {
      return res.status(400).json({
        error: 'Invalid basket data - must be object'
      });
    }

    if (!basketData.seed || !basketData.seed_pair) {
      return res.status(400).json({
        error: 'Invalid basket data - missing required fields (seed, seed_pair)'
      });
    }

    // Write updated basket back to individual file
    await fs.writeJson(basketPath, basketData, { spaces: 2 });

    console.log(`[API] Successfully updated basket ${seedId}`);

    res.json({
      success: true,
      message: 'Basket updated successfully',
      courseCode,
      seedId,
      basket: basketData
    });
  } catch (err) {
    console.error('[API] Error updating basket:', err);
    res.status(500).json({
      error: 'Failed to update basket',
      details: err.message
    });
  }
});

/**
 * POST /api/courses/:courseCode/baskets/:seedId/flag
 * Flag basket for review
 */
app.post('/api/courses/:courseCode/baskets/:seedId/flag', async (req, res) => {
  try {
    const { courseCode, seedId } = req.params;
    const { reason, flaggedBy } = req.body;
    const basketsPath = path.join(CONFIG.VFS_ROOT, courseCode, 'lego_baskets.json');
    const flagsPath = path.join(CONFIG.VFS_ROOT, courseCode, 'basket_flags.json');

    console.log(`[API] Flagging basket ${seedId} in ${courseCode}`);

    // Check if baskets file exists
    if (!await fs.pathExists(basketsPath)) {
      return res.status(404).json({
        error: 'Baskets not found for this course',
        courseCode
      });
    }

    // Load baskets to verify seed exists
    const baskets = await fs.readJson(basketsPath);
    if (!baskets[seedId]) {
      return res.status(404).json({
        error: `Basket not found for seed ${seedId}`,
        courseCode,
        seedId
      });
    }

    // Load or create flags file
    let flags = {};
    if (await fs.pathExists(flagsPath)) {
      flags = await fs.readJson(flagsPath);
    }

    // Add flag
    flags[seedId] = {
      reason: reason || 'No reason provided',
      flaggedBy: flaggedBy || 'unknown',
      flaggedAt: new Date().toISOString(),
      status: 'flagged'
    };

    // Write flags file
    await fs.writeJson(flagsPath, flags, { spaces: 2 });

    console.log(`[API] Successfully flagged basket ${seedId}`);

    res.json({
      success: true,
      message: 'Basket flagged for review',
      courseCode,
      seedId,
      flag: flags[seedId]
    });
  } catch (err) {
    console.error('[API] Error flagging basket:', err);
    res.status(500).json({
      error: 'Failed to flag basket',
      details: err.message
    });
  }
});

/**
 * POST /api/courses/:courseCode/baskets/:seedId/regenerate
 * Trigger basket regeneration
 */
app.post('/api/courses/:courseCode/baskets/:seedId/regenerate', async (req, res) => {
  try {
    const { courseCode, seedId } = req.params;
    const basketsPath = path.join(CONFIG.VFS_ROOT, courseCode, 'lego_baskets.json');

    console.log(`[API] Regeneration requested for basket ${seedId} in ${courseCode}`);

    // Check if baskets file exists
    if (!await fs.pathExists(basketsPath)) {
      return res.status(404).json({
        error: 'Baskets not found for this course',
        courseCode
      });
    }

    // Load baskets to verify seed exists
    const baskets = await fs.readJson(basketsPath);
    if (!baskets[seedId]) {
      return res.status(404).json({
        error: `Basket not found for seed ${seedId}`,
        courseCode,
        seedId
      });
    }

    // Create regeneration job
    const jobId = `regen_${courseCode}_${seedId}_${Date.now()}`;
    const job = {
      jobId,
      courseCode,
      seedId,
      type: 'basket_regeneration',
      status: 'queued',
      createdAt: new Date().toISOString()
    };

    // Store in regeneration jobs
    if (!STATE.regenerationJobs) {
      STATE.regenerationJobs = new Map();
    }
    STATE.regenerationJobs.set(jobId, job);

    console.log(`[API] Created regeneration job ${jobId} for basket ${seedId}`);

    res.json({
      success: true,
      message: 'Basket regeneration queued',
      courseCode,
      seedId,
      jobId,
      status: 'queued',
      note: 'Regeneration will be processed by the basket generation agent'
    });
  } catch (err) {
    console.error('[API] Error creating regeneration job:', err);
    res.status(500).json({
      error: 'Failed to queue basket regeneration',
      details: err.message
    });
  }
});

/**
 * POST /api/courses/:courseCode/baskets/validate
 * Validate basket without saving
 */
app.post('/api/courses/:courseCode/baskets/validate', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { seedId, lego, e, d } = req.body;

    console.log(`[API] Validating basket data for ${seedId || 'unknown'} in ${courseCode}`);

    const errors = [];
    const warnings = [];

    // Validate seedId
    if (!seedId) {
      errors.push('Missing seedId');
    } else if (!/^S\d{4}L\d{2}$/.test(seedId)) {
      warnings.push('SeedId does not match expected format S####L##');
    }

    // Validate lego
    if (!lego) {
      errors.push('Missing lego field');
    } else if (!Array.isArray(lego)) {
      errors.push('lego must be an array');
    } else if (lego.length !== 2) {
      errors.push('lego must have exactly 2 elements [target, known]');
    } else {
      if (!lego[0] || typeof lego[0] !== 'string') {
        errors.push('lego[0] (target) must be a non-empty string');
      }
      if (!lego[1] || typeof lego[1] !== 'string') {
        errors.push('lego[1] (known) must be a non-empty string');
      }
    }

    // Validate e phrases
    if (e !== undefined) {
      if (!Array.isArray(e)) {
        errors.push('e_phrases must be an array');
      } else {
        e.forEach((phrase, index) => {
          if (!Array.isArray(phrase)) {
            errors.push(`e_phrase at index ${index} must be an array`);
          } else if (phrase.length !== 2) {
            errors.push(`e_phrase at index ${index} must have exactly 2 elements [target, known]`);
          } else {
            if (!phrase[0] || typeof phrase[0] !== 'string') {
              errors.push(`e_phrase at index ${index}[0] (target) must be a non-empty string`);
            }
            if (!phrase[1] || typeof phrase[1] !== 'string') {
              errors.push(`e_phrase at index ${index}[1] (known) must be a non-empty string`);
            }
          }
        });
      }
    }

    // Validate d phrases
    if (d !== undefined) {
      if (typeof d !== 'object' || d === null) {
        errors.push('d_phrases must be an object');
      } else {
        Object.entries(d).forEach(([level, phrases]) => {
          if (!/^\d+$/.test(level)) {
            warnings.push(`d_phrases level "${level}" is not a number`);
          }
          if (!Array.isArray(phrases)) {
            errors.push(`d_phrases at level ${level} must be an array`);
          } else {
            phrases.forEach((phrase, index) => {
              if (!Array.isArray(phrase)) {
                errors.push(`d_phrase at level ${level}, index ${index} must be an array`);
              } else if (phrase.length !== 2) {
                errors.push(`d_phrase at level ${level}, index ${index} must have exactly 2 elements [target, known]`);
              } else {
                if (!phrase[0] || typeof phrase[0] !== 'string') {
                  errors.push(`d_phrase at level ${level}, index ${index}[0] (target) must be a non-empty string`);
                }
                if (!phrase[1] || typeof phrase[1] !== 'string') {
                  errors.push(`d_phrase at level ${level}, index ${index}[1] (known) must be a non-empty string`);
                }
              }
            });
          }
        });
      }
    }

    const isValid = errors.length === 0;

    res.json({
      valid: isValid,
      errors,
      warnings,
      courseCode,
      seedId: seedId || null,
      message: isValid
        ? 'Basket structure is valid'
        : `Basket validation failed with ${errors.length} error(s)`
    });
  } catch (err) {
    console.error('[API] Error validating basket:', err);
    res.status(500).json({
      error: 'Failed to validate basket',
      details: err.message
    });
  }
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

        // Support both old and new formats:
        // - Old: seed_pairs.json + lego_pairs.json
        // - New: translations.json + LEGO_BREAKDOWNS_COMPLETE.json
        const seedPairsPath = path.join(coursePath, 'seed_pairs.json');
        const legoPairsPath = path.join(coursePath, 'lego_pairs.json');
        const translationsPath = path.join(coursePath, 'translations.json');
        const legoBreakdownsPath = path.join(coursePath, 'LEGO_BREAKDOWNS_COMPLETE.json');

        const hasOldFormat = await fs.pathExists(seedPairsPath) && await fs.pathExists(legoPairsPath);
        const hasNewFormat = await fs.pathExists(translationsPath);

        // Check if this is a valid course (has either format)
        if (hasOldFormat || hasNewFormat) {
          // Parse course code - support both patterns:
          // - xxx_for_yyy (intelligent, no suffix)
          // - xxx_for_yyy_NNseeds (legacy with suffix)
          const matchWithSeeds = dir.match(/^([a-z]{3})_for_([a-z]{3})_(\d+)seeds$/);
          const matchWithoutSeeds = dir.match(/^([a-z]{3})_for_([a-z]{3})$/);

          if (!matchWithSeeds && !matchWithoutSeeds) {
            console.log(`[API] Skipping directory ${dir} - doesn't match course code pattern`);
            continue;
          }

          const targetLang = matchWithSeeds ? matchWithSeeds[1] : matchWithoutSeeds[1];
          const knownLang = matchWithSeeds ? matchWithSeeds[2] : matchWithoutSeeds[2];
          // Seed count will be read from actual file, not directory name

          let translationCount = 0;
          let legoCount = 0;

          // Load translations from appropriate format
          if (hasNewFormat) {
            // New format: translations.json
            const translationsData = await fs.readJson(translationsPath);
            translationCount = Object.keys(translationsData).length;

            // LEGO count from LEGO_BREAKDOWNS_COMPLETE.json
            if (await fs.pathExists(legoBreakdownsPath)) {
              const legoData = await fs.readJson(legoBreakdownsPath);
              const breakdowns = legoData.lego_breakdowns || [];
              for (const breakdown of breakdowns) {
                legoCount += (breakdown.lego_pairs || []).length;
              }
            }
          } else {
            // Old format: seed_pairs.json + lego_pairs.json
            const seedPairsData = await fs.readJson(seedPairsPath);
            translationCount = Object.keys(seedPairsData.translations || {}).length;

            const legoPairsData = await fs.readJson(legoPairsPath);
            const seedsArray = legoPairsData.seeds || [];

            // Count total LEGOs across all seeds
            // Handle both v7.7 format (array) and v5.0.1 format (object)
            for (const seed of seedsArray) {
              if (Array.isArray(seed)) {
                // v7.7 format: [seedId, seedPair, legos]
                const legos = seed[2] || [];
                legoCount += legos.length;
              } else if (seed && typeof seed === 'object' && seed.legos) {
                // v5.0.1 format: {seed_id, seed_pair, legos: [{new: true/false}]}
                // Only count new LEGOs
                const newLegos = seed.legos.filter(l => l.new === true);
                legoCount += newLegos.length;
              }
            }
          }

          // Determine which phases are complete based on file existence
          const phases_completed = [];
          let status = 'in_progress';

          // Phase 1: seed_pairs.json exists
          if (await fs.pathExists(seedPairsPath)) {
            phases_completed.push('1');
          }

          // Phase 3: lego_pairs.json exists
          if (await fs.pathExists(legoPairsPath)) {
            phases_completed.push('3');
            status = 'phase_3_complete';
          }

          // Phase 4: batches/ directory exists (batch preparation)
          const batchesPath = path.join(coursePath, 'batches');
          if (await fs.pathExists(batchesPath)) {
            phases_completed.push('4');
          }

          // Phase 5: baskets/ directory exists (individual basket files)
          const basketsDir = path.join(coursePath, 'baskets');
          let basketCount = 0;
          if (await fs.pathExists(basketsDir)) {
            phases_completed.push('5');
            // Count basket files in baskets/ directory
            const basketFiles = await fs.readdir(basketsDir);
            basketCount = basketFiles.filter(f => f.startsWith('lego_baskets_') && f.endsWith('.json')).length;
            status = 'phase_5_complete';
          }

          // Phase 6: introductions.json exists
          const introsPath = path.join(coursePath, 'introductions.json');
          let introCount = 0;
          if (await fs.pathExists(introsPath)) {
            phases_completed.push('6');
            const introsData = await fs.readJson(introsPath);
            introCount = introsData.introductions?.length || 0;
            status = 'phase_6_complete';
          }

          // Phase 7: course_manifest.json exists (compilation)
          const manifestPath = path.join(coursePath, 'course_manifest.json');
          if (await fs.pathExists(manifestPath)) {
            phases_completed.push('7');
            status = 'phase_7_complete';
          }

          // Phase 8: Check if audio exists (placeholder - actual check would be S3)
          const audioPath = path.join(coursePath, 'audio');
          if (await fs.pathExists(audioPath)) {
            phases_completed.push('8');
            status = 'complete';
          }

          courses.push({
            course_code: dir,
            source_language: knownLang.toUpperCase(),
            target_language: targetLang.toUpperCase(),
            total_seeds: translationCount, // Always use actual count from file
            version: '1.0',
            created_at: stats.birthtime.toISOString(),
            status: status,

            // New terminology (dashboard displays these)
            seed_pairs: translationCount,
            lego_pairs: legoCount,
            lego_baskets: basketCount,

            phases_completed: phases_completed,

            // Backward compatibility (if needed by older components)
            amino_acids: {
              translations: translationCount,
              legos: 0,
              legos_deduplicated: legoCount,
              baskets: basketCount,
              introductions: introCount
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

    // Check for required files
    const seedPairsPath = path.join(coursePath, 'seed_pairs.json');
    const legoBreakdownsPath = path.join(coursePath, 'LEGO_BREAKDOWNS_COMPLETE.json');

    if (!await fs.pathExists(seedPairsPath)) {
      return res.status(404).json({ error: 'seed_pairs.json not found' });
    }

    if (!await fs.pathExists(legoBreakdownsPath)) {
      return res.status(404).json({ error: 'LEGO_BREAKDOWNS_COMPLETE.json not found' });
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

    // Load LEGO_BREAKDOWNS_COMPLETE.json
    const legoBreakdownsData = await fs.readJson(legoBreakdownsPath);
    const breakdowns = legoBreakdownsData.lego_breakdowns || [];

    // Flatten breakdowns into individual LEGO pairs for frontend
    const legos = [];
    for (const breakdown of breakdowns) {
      const seed_id = breakdown.seed_id;
      for (const lego of breakdown.lego_pairs) {
        legos.push({
          uuid: lego.lego_id,
          seed_id: seed_id,
          text: `${lego.known_chunk} = ${lego.target_chunk}`,
          lego_type: lego.lego_type,
          target_chunk: lego.target_chunk,
          known_chunk: lego.known_chunk,
          fd_validated: lego.fd_validated || false,
          componentization: lego.componentization || null,
          provenance: seed_id,
          fcfs_score: null,
          utility_score: null
        });
      }
    }

    // Generate course metadata - support both patterns
    const matchWithSeeds = courseCode.match(/^([a-z]{3})_for_([a-z]{3})_(\d+)seeds$/);
    const matchWithoutSeeds = courseCode.match(/^([a-z]{3})_for_([a-z]{3})$/);
    const match = matchWithSeeds || matchWithoutSeeds;

    const stats = await fs.stat(coursePath);

    const course = {
      course_code: courseCode,
      source_language: match ? match[2].toUpperCase() : 'UNK',
      target_language: match ? match[1].toUpperCase() : 'UNK',
      total_seeds: translations.length, // Always use actual count from file
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

    // Transform LEGO_BREAKDOWNS_COMPLETE.json to CourseEditor format
    // Map to add original_target and original_known for compatibility
    const legoBreakdowns = breakdowns.map(breakdown => ({
      seed_id: breakdown.seed_id,
      original_target: breakdown.target_sentence,
      original_known: breakdown.known_sentence,
      lego_pairs: breakdown.lego_pairs,
      feeder_pairs: breakdown.feeder_pairs || []
    }));

    console.log(`[API] Loaded course ${courseCode}: ${translations.length} translations, ${legos.length} LEGO pairs, ${legoBreakdowns.length} breakdowns`);

    res.json({
      course,
      translations,
      legos,
      lego_breakdowns: legoBreakdowns,
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
 * GET /api/courses/:courseCode/analyze
 * Analyze course progress and suggest next actions
 *
 * Returns:
 * - What seeds exist vs missing
 * - What phases are complete
 * - Smart options for resuming/testing
 */
app.get('/api/courses/:courseCode/analyze', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const coursePath = path.join(CONFIG.VFS_ROOT, courseCode);

    // Check if course directory exists
    if (!await fs.pathExists(coursePath)) {
      return res.status(404).json({
        error: 'Course not found',
        courseCode,
        exists: false
      });
    }

    const analysis = {
      courseCode,
      exists: true,
      seed_pairs: { exists: false, count: 0, range: null },
      lego_pairs: { exists: false, count: 0, range: null, missing: [] },
      phase_5: { exists: false, count: 0 },
      phase_6: { exists: false, count: 0 },
      recommendations: []
    };

    // Check Phase 1: seed_pairs.json
    const seedPairsPath = path.join(coursePath, 'seed_pairs.json');
    if (await fs.pathExists(seedPairsPath)) {
      const seedPairsData = await fs.readJson(seedPairsPath);
      const seedIds = Object.keys(seedPairsData.translations || {});

      analysis.seed_pairs.exists = true;
      analysis.seed_pairs.count = seedIds.length;

      if (seedIds.length > 0) {
        seedIds.sort();
        analysis.seed_pairs.range = {
          first: seedIds[0],
          last: seedIds[seedIds.length - 1]
        };
      }
    }

    // Check Phase 3: lego_pairs.json
    const legoPairsPath = path.join(coursePath, 'lego_pairs.json');
    if (await fs.pathExists(legoPairsPath)) {
      const legoPairsData = await fs.readJson(legoPairsPath);
      const seedsWithLegos = legoPairsData.seeds || [];

      analysis.lego_pairs.exists = true;
      analysis.lego_pairs.count = seedsWithLegos.length;

      if (seedsWithLegos.length > 0) {
        // Extract seed_id from objects (v5.0.1+ format: { seed_id: "S0001", ... })
        const legoSeedIds = seedsWithLegos.map(s => s.seed_id).sort();
        analysis.lego_pairs.range = {
          first: legoSeedIds[0],
          last: legoSeedIds[legoSeedIds.length - 1]
        };

        // Find missing seeds (if we have seed_pairs)
        if (analysis.seed_pairs.exists) {
          const allSeedIds = Object.keys((await fs.readJson(seedPairsPath)).translations);
          const legoSeedSet = new Set(legoSeedIds);
          analysis.lego_pairs.missing = allSeedIds.filter(id => !legoSeedSet.has(id)).sort();
        }
      }
    }

    // Generate recommendations
    if (!analysis.seed_pairs.exists) {
      analysis.recommendations.push({
        type: 'create',
        phase: 1,
        title: 'Generate Phase 1: Seed Pairs',
        description: 'Start by creating seed_pairs.json (668 translations)',
        action: { startSeed: 1, endSeed: 668 }
      });
    } else if (!analysis.lego_pairs.exists) {
      // No LEGOs at all
      analysis.recommendations.push({
        type: 'test',
        phase: 3,
        title: 'Test Run: First 50 Seeds',
        description: `Test Phase 3 LEGO extraction on first 50 seeds`,
        action: { startSeed: 1, endSeed: 50 }
      });
      analysis.recommendations.push({
        type: 'full',
        phase: 3,
        title: 'Full Run: All Seeds',
        description: `Extract LEGOs for all ${analysis.seed_pairs.count} seeds`,
        action: { startSeed: 1, endSeed: analysis.seed_pairs.count }
      });
    } else if (analysis.lego_pairs.missing.length > 0) {
      // Some LEGOs missing
      const missing = analysis.lego_pairs.missing;

      // Find contiguous ranges of missing seeds
      const ranges = [];
      let rangeStart = null;
      let rangeEnd = null;

      for (let i = 0; i < missing.length; i++) {
        const seedNum = parseInt(missing[i].substring(1));

        if (rangeStart === null) {
          rangeStart = seedNum;
          rangeEnd = seedNum;
        } else if (seedNum === rangeEnd + 1) {
          rangeEnd = seedNum;
        } else {
          ranges.push({ start: rangeStart, end: rangeEnd, count: rangeEnd - rangeStart + 1 });
          rangeStart = seedNum;
          rangeEnd = seedNum;
        }
      }

      if (rangeStart !== null) {
        ranges.push({ start: rangeStart, end: rangeEnd, count: rangeEnd - rangeStart + 1 });
      }

      // Suggest processing missing ranges
      for (const range of ranges.slice(0, 3)) { // Show max 3 ranges
        analysis.recommendations.push({
          type: 'resume',
          phase: 3,
          title: `Resume: Seeds ${range.start}-${range.end}`,
          description: `Process ${range.count} missing seeds`,
          action: { startSeed: range.start, endSeed: range.end }
        });
      }

      if (missing.length > 0) {
        analysis.recommendations.push({
          type: 'full',
          phase: 3,
          title: 'Process All Missing',
          description: `Process all ${missing.length} missing seeds`,
          action: { startSeed: 1, endSeed: analysis.seed_pairs.count }
        });
      }
    } else {
      // Phase 3 complete!
      analysis.recommendations.push({
        type: 'next',
        phase: 4,
        title: 'Continue: Phase 4',
        description: 'Phase 3 complete! Continue to Phase 4: Deduplication',
        action: { startSeed: 1, endSeed: analysis.seed_pairs.count }
      });
    }

    res.json(analysis);
  } catch (error) {
    console.error(`[API] Error analyzing course:`, error);
    res.status(500).json({
      error: 'Failed to analyze course',
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

    // Load translations - support both new and old formats
    let translationsData;
    const translationsPath = path.join(coursePath, 'translations.json');
    const seedPairsPath = path.join(coursePath, 'seed_pairs.json');

    if (await fs.pathExists(translationsPath)) {
      translationsData = await fs.readJson(translationsPath);
    } else if (await fs.pathExists(seedPairsPath)) {
      const seedPairsData = await fs.readJson(seedPairsPath);
      translationsData = seedPairsData.translations;
    } else {
      return res.status(404).json({ error: 'No translation data found' });
    }

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
 * Regenerate LEGO breakdown for a single seed (lightweight Phase 3)
 * @param {string} courseCode - Course identifier
 * @param {string} seedId - Seed ID (e.g., 'S0003')
 * @param {string} targetPhrase - New target language phrase
 * @param {string} knownPhrase - New known language phrase
 * @returns {Promise<Object>} - New LEGO breakdown
 */
async function regenerateSingleSeedLego(courseCode, seedId, targetPhrase, knownPhrase) {
  // Check if API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured - cannot auto-regenerate');
  }

  const coursePath = path.join(CONFIG.VFS_ROOT, courseCode);

  // Get language pair from course code
  const [target, known] = courseCode.split('_for_');

  // Build Phase 3 prompt for single seed
  const prompt = `
# Phase 3: LEGO Extraction (Single Seed)

You are regenerating the LEGO breakdown for ONE seed that was just edited.

## Seed Translation
**Seed ID**: ${seedId}
**Target phrase (${target})**: ${targetPhrase}
**Known phrase (${known})**: ${knownPhrase}

## Your Task
Break this sentence into LEGO blocks following SSI methodology:

1. **BASE LEGOs**: Single atomic meaning units
2. **COMPOSITE LEGOs**: Multi-word chunks that work as units
   - MUST include componentization showing internal structure
   - Format: "word1 ⟷ meaning1\\nword2 ⟷ meaning2"

## Output Format (JSON)
\`\`\`json
{
  "seed_id": "${seedId}",
  "target_sentence": "${targetPhrase}",
  "known_sentence": "${knownPhrase}",
  "lego_pairs": [
    {
      "lego_id": "${seedId}L01",
      "lego_type": "BASE",
      "target_chunk": "word",
      "known_chunk": "word",
      "fd_validated": false
    },
    {
      "lego_id": "${seedId}L02",
      "lego_type": "COMPOSITE",
      "target_chunk": "multi word phrase",
      "known_chunk": "multi word phrase",
      "fd_validated": false,
      "componentization": "word1 ⟷ meaning1\\nword2 ⟷ meaning2"
    }
  ],
  "feeder_pairs": [
    {
      "feeder_id": "${seedId}L02F01",
      "parent_lego_id": "${seedId}L02",
      "target_chunk": "word1",
      "known_chunk": "meaning1"
    }
  ]
}
\`\`\`

Generate the breakdown now.
`;

  console.log(`[Regen] Calling Claude for ${seedId} LEGO breakdown...`);

  // Call Claude API (using Anthropic SDK)
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    temperature: 0.3,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  // Extract JSON from response
  const content = response.content[0].text;
  const jsonMatch = content.match(/```json\n([\s\S]+?)\n```/);

  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Claude response');
  }

  const breakdown = JSON.parse(jsonMatch[1]);

  // Update LEGO_BREAKDOWNS_COMPLETE.json
  const legosPath = path.join(coursePath, 'LEGO_BREAKDOWNS_COMPLETE.json');
  let legoData = { lego_breakdowns: [] };

  if (await fs.pathExists(legosPath)) {
    legoData = await fs.readJson(legosPath);
  }

  // Remove old breakdown for this seed
  legoData.lego_breakdowns = legoData.lego_breakdowns.filter(
    l => l.seed_id !== seedId
  );

  // Add new breakdown
  legoData.lego_breakdowns.push(breakdown);

  // Sort by seed_id for consistency
  legoData.lego_breakdowns.sort((a, b) => a.seed_id.localeCompare(b.seed_id));

  // Write back
  await fs.writeJson(legosPath, legoData, { spaces: 2 });

  console.log(`✅ [Regen] Updated LEGO breakdown for ${seedId}`);

  return breakdown;
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

    const seedId = uuid;
    const translationsPath = path.join(coursePath, 'translations.json');
    const seedPairsPath = path.join(coursePath, 'seed_pairs.json');

    // Support both new format (translations.json) and old format (seed_pairs.json)
    let useOldFormat = false;
    let translationsData;
    let fullData;

    if (await fs.pathExists(translationsPath)) {
      // New format: standalone translations.json
      translationsData = await fs.readJson(translationsPath);
    } else if (await fs.pathExists(seedPairsPath)) {
      // Old format: seed_pairs.json with translations key
      useOldFormat = true;
      fullData = await fs.readJson(seedPairsPath);
      translationsData = fullData.translations;
    } else {
      return res.status(404).json({ error: 'No translation data found' });
    }

    if (!translationsData[seedId]) {
      return res.status(404).json({ error: `Seed ${seedId} not found` });
    }

    // Update the translation
    // Format: { "S0001": [target_phrase, known_phrase] }
    translationsData[seedId] = [target, source];

    // Write back to appropriate file
    if (useOldFormat) {
      fullData.translations = translationsData;
      await fs.writeJson(seedPairsPath, fullData, { spaces: 2 });
      console.log(`[API] Successfully updated ${seedId} in seed_pairs.json`);
    } else {
      await fs.writeJson(translationsPath, translationsData, { spaces: 2 });
      console.log(`[API] Successfully updated ${seedId} in translations.json`);
    }

    // Trigger lightweight LEGO regeneration for this seed
    console.log(`[API] Triggering LEGO regeneration for ${seedId}...`);

    try {
      const newBreakdown = await regenerateSingleSeedLego(courseCode, seedId, target, source);

      res.json({
        success: true,
        message: 'Translation updated and LEGO breakdown regenerated',
        seed_id: seedId,
        updated: {
          target_phrase: target,
          known_phrase: source
        },
        lego_breakdown: newBreakdown
      });
    } catch (regenError) {
      console.warn(`[API] LEGO regeneration failed, but translation saved:`, regenError.message);

      res.json({
        success: true,
        message: 'Translation updated (LEGO regeneration pending)',
        seed_id: seedId,
        updated: {
          target_phrase: target,
          known_phrase: source
        },
        warning: 'LEGO breakdown not regenerated yet'
      });
    }
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
// SKILLS API - SKILL LIBRARY & DISCOVERY
// =============================================================================

/**
 * GET /api/skills
 * List all available skills
 */
app.get('/api/skills', async (req, res) => {
  try {
    const skillsDir = path.join(__dirname, 'skills');
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });

    const skills = [];

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const skillPath = path.join(skillsDir, entry.name);
        const skillMdPath = path.join(skillPath, 'SKILL.md');

        try {
          const skillContent = await fs.readFile(skillMdPath, 'utf-8');

          // Parse frontmatter
          const frontmatterMatch = skillContent.match(/^---\n([\s\S]*?)\n---/);
          const metadata = {};

          if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            frontmatter.split('\n').forEach(line => {
              const [key, ...valueParts] = line.split(':');
              if (key && valueParts.length) {
                metadata[key.trim()] = valueParts.join(':').trim();
              }
            });
          }

          skills.push({
            id: entry.name,
            name: metadata.name || entry.name,
            description: metadata.description || '',
            version: metadata.version || '1.0.0',
            path: `skills/${entry.name}`,
            hasSkillMd: true
          });
        } catch (err) {
          // Skill directory without SKILL.md
          skills.push({
            id: entry.name,
            name: entry.name,
            description: 'No description available',
            version: 'unknown',
            path: `skills/${entry.name}`,
            hasSkillMd: false
          });
        }
      }
    }

    res.json({ skills });
  } catch (error) {
    console.error('Error listing skills:', error);
    res.status(500).json({ error: 'Failed to list skills' });
  }
});

/**
 * GET /api/skills/:skillId
 * Get skill details and structure
 */
app.get('/api/skills/:skillId', async (req, res) => {
  try {
    const { skillId } = req.params;
    const skillPath = path.join(__dirname, 'skills', skillId);

    // Check if skill exists
    const exists = await fs.access(skillPath).then(() => true).catch(() => false);
    if (!exists) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Read SKILL.md
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    let skillContent = '';
    let metadata = {};

    try {
      skillContent = await fs.readFile(skillMdPath, 'utf-8');

      // Parse frontmatter
      const frontmatterMatch = skillContent.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        frontmatter.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length) {
            metadata[key.trim()] = valueParts.join(':').trim();
          }
        });
      }
    } catch (err) {
      // SKILL.md not found
    }

    // Get directory structure
    async function getStructure(dir, relativePath = '') {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const structure = [];

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;

        const fullPath = path.join(dir, entry.name);
        const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          structure.push({
            name: entry.name,
            type: 'directory',
            path: relPath,
            children: await getStructure(fullPath, relPath)
          });
        } else {
          structure.push({
            name: entry.name,
            type: 'file',
            path: relPath
          });
        }
      }

      return structure;
    }

    const structure = await getStructure(skillPath);

    res.json({
      id: skillId,
      name: metadata.name || skillId,
      description: metadata.description || '',
      version: metadata.version || '1.0.0',
      content: skillContent,
      structure
    });
  } catch (error) {
    console.error('Error fetching skill:', error);
    res.status(500).json({ error: 'Failed to fetch skill' });
  }
});

/**
 * GET /api/skills/:skillId/file/*
 * Get content of a file within a skill
 */
app.get('/api/skills/:skillId/file/*', async (req, res) => {
  try {
    const { skillId } = req.params;
    const filePath = req.params[0]; // Everything after /file/

    const fullPath = path.join(__dirname, 'skills', skillId, filePath);

    // Security: Ensure path is within skills directory
    const normalizedPath = path.normalize(fullPath);
    const skillsDir = path.normalize(path.join(__dirname, 'skills'));
    if (!normalizedPath.startsWith(skillsDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const content = await fs.readFile(fullPath, 'utf-8');

    res.json({
      path: filePath,
      content
    });
  } catch (error) {
    console.error('Error reading skill file:', error);
    res.status(404).json({ error: 'File not found' });
  }
});

/**
 * GET /api/skills/used-by/:phase
 * Get skills used by a specific phase
 */
app.get('/api/skills/used-by/:phase', async (req, res) => {
  try {
    const { phase } = req.params;

    // Check orchestrator intelligence
    const orchestratorPath = path.join(__dirname, 'docs', 'phase_intelligence', `phase_${phase}_orchestrator.md`);

    let orchestratorContent = '';
    try {
      orchestratorContent = await fs.readFile(orchestratorPath, 'utf-8');
    } catch (err) {
      // No orchestrator file
    }

    // Check phase intelligence
    const phaseFiles = {
      '1': 'phase_1_seed_pairs.md',
      '3': 'phase_3_lego_pairs.md',
      '5': 'phase_5_lego_baskets.md',
      '6': 'phase_6_introductions.md'
    };

    let phaseContent = '';
    if (phaseFiles[phase]) {
      try {
        const phasePath = path.join(__dirname, 'docs', 'phase_intelligence', phaseFiles[phase]);
        phaseContent = await fs.readFile(phasePath, 'utf-8');
      } catch (err) {
        // No phase file
      }
    }

    const combinedContent = orchestratorContent + '\n' + phaseContent;

    // Detect skill references
    const skillMatches = combinedContent.matchAll(/SKILL LOCATION:\s*([^\n]+)/g);
    const requiredReadingMatches = combinedContent.matchAll(/REQUIRED READING.*?:\s*\n((?:.*?\.md.*?\n)+)/g);

    const skills = [];

    for (const match of skillMatches) {
      const skillPath = match[1].trim();
      const skillName = skillPath.split('/').pop();

      // Find required reading for this skill
      const requiredReading = [];
      for (const readingMatch of requiredReadingMatches) {
        const lines = readingMatch[1].split('\n').filter(l => l.trim());
        for (const line of lines) {
          const fileMatch = line.match(/([^\s]+\.md)/);
          if (fileMatch) {
            requiredReading.push(fileMatch[1]);
          }
        }
      }

      skills.push({
        name: skillName,
        path: skillPath,
        requiredReading
      });
    }

    res.json({
      phase,
      skills
    });
  } catch (error) {
    console.error('Error detecting skills for phase:', error);
    res.status(500).json({ error: 'Failed to detect skills' });
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
// STORAGE MANAGEMENT API - S3 Sync Operations
// =============================================================================

/**
 * GET /api/storage/test-s3
 * Test S3 connection and return bucket info
 */
app.get('/api/storage/test-s3', async (req, res) => {
  try {
    await s3.listObjectsV2({ Bucket: S3_BUCKET, MaxKeys: 1 }).promise();
    res.json({
      connected: true,
      bucket: S3_BUCKET,
      region: process.env.AWS_REGION || 'eu-west-1'
    });
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error.message
    });
  }
});

/**
 * GET /api/storage/courses
 * List all courses with sync status (local VFS vs S3)
 */
app.get('/api/storage/courses', async (req, res) => {
  try {
    // Get courses from local VFS
    const localDirs = await fs.readdir(CONFIG.VFS_ROOT);
    const localCourses = [];

    for (const dir of localDirs) {
      const coursePath = path.join(CONFIG.VFS_ROOT, dir);
      const stats = await fs.stat(coursePath);

      if (!stats.isDirectory() || dir === '.DS_Store') continue;

      const seedPairsPath = path.join(coursePath, 'seed_pairs.json');
      const legoPairsPath = path.join(coursePath, 'lego_pairs.json');
      const hasRequiredFiles = await fs.pathExists(seedPairsPath) && await fs.pathExists(legoPairsPath);

      // Calculate directory size (count ALL JSON files, even for WIP courses)
      let size = 0;
      let fileCount = 0;
      const files = await fs.readdir(coursePath, { recursive: true });
      for (const file of files) {
        try {
          const filePath = path.join(coursePath, file);
          const fileStat = await fs.stat(filePath);
          if (fileStat.isFile() && file.endsWith('.json')) {
            size += fileStat.size;
            fileCount++;
          }
        } catch (err) {
          // Skip files that can't be accessed
        }
      }

      localCourses.push({
        code: dir,
        hasRequiredFiles,
        fileCount,
        size,
        syncStatus: 'unknown'
      });
    }

    // Check S3 for each course
    const s3Result = await s3.listObjectsV2({
      Bucket: S3_BUCKET,
      Prefix: 'courses/',
      Delimiter: '/'
    }).promise();

    const s3Courses = s3Result.CommonPrefixes
      ? s3Result.CommonPrefixes.map(p => p.Prefix.replace('courses/', '').replace('/', ''))
      : [];

    // Update sync status
    for (const course of localCourses) {
      if (s3Courses.includes(course.code)) {
        course.syncStatus = course.hasRequiredFiles ? 'in_s3' : 'in_s3_wip';
      } else if (course.fileCount > 0) {
        course.syncStatus = course.hasRequiredFiles ? 'not_synced' : 'not_synced_wip';
      } else {
        course.syncStatus = 'empty';
      }
    }

    res.json({ courses: localCourses });
  } catch (error) {
    console.error('❌ Error listing courses:', error.message);
    res.status(500).json({ error: 'Failed to list courses', detail: error.message });
  }
});

/**
 * POST /api/storage/sync/:courseCode
 * Upload a course to S3
 */
app.post('/api/storage/sync/:courseCode', async (req, res) => {
  const { courseCode } = req.params;

  try {
    const coursePath = path.join(CONFIG.VFS_ROOT, courseCode);

    if (!await fs.pathExists(coursePath)) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Find all JSON files (no required files check - sync any course, even WIP)
    const pattern = path.join(coursePath, '**', '*.json');
    const glob = require('glob');
    let files = glob.sync(pattern);

    // If empty directory, create placeholder file
    if (files.length === 0) {
      const placeholderPath = path.join(coursePath, '_course_placeholder.json');
      const placeholderContent = {
        course_code: courseCode,
        created: new Date().toISOString(),
        status: 'placeholder',
        note: 'This is a placeholder file for an empty course directory. Delete when adding real content.'
      };
      await fs.writeJson(placeholderPath, placeholderContent, { spaces: 2 });
      files = [placeholderPath];
      console.log(`📝 Created placeholder for empty course: ${courseCode}`);
    }

    let uploaded = 0;
    const errors = [];

    for (const filePath of files) {
      const relativePath = path.relative(CONFIG.VFS_ROOT, filePath);
      const s3Key = `courses/${relativePath.replace(/\\/g, '/')}`;

      try {
        const content = await fs.readFile(filePath, 'utf8');

        await s3.putObject({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: content,
          ContentType: 'application/json'
        }).promise();

        uploaded++;
      } catch (error) {
        errors.push({ file: relativePath, error: error.message });
      }
    }

    console.log(`✅ Synced ${courseCode} to S3: ${uploaded} files`);

    res.json({
      success: true,
      courseCode,
      filesUploaded: uploaded,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error(`❌ Sync error for ${courseCode}:`, error.message);
    res.status(500).json({ error: 'Sync failed', detail: error.message });
  }
});

/**
 * POST /api/storage/download/:courseCode
 * Download a course from S3 to local VFS
 */
app.post('/api/storage/download/:courseCode', async (req, res) => {
  const { courseCode } = req.params;

  try {
    const coursePath = path.join(CONFIG.VFS_ROOT, courseCode);

    // List all files for this course in S3
    const s3Objects = await s3.listObjectsV2({
      Bucket: S3_BUCKET,
      Prefix: `courses/${courseCode}/`
    }).promise();

    if (!s3Objects.Contents || s3Objects.Contents.length === 0) {
      return res.status(404).json({ error: 'Course not found in S3' });
    }

    await fs.ensureDir(coursePath);

    let downloaded = 0;
    const errors = [];

    for (const obj of s3Objects.Contents) {
      const key = obj.Key;
      const relativePath = key.replace(`courses/${courseCode}/`, '');
      const localPath = path.join(coursePath, relativePath);

      try {
        // Ensure directory exists
        await fs.ensureDir(path.dirname(localPath));

        // Download file
        const s3Object = await s3.getObject({ Bucket: S3_BUCKET, Key: key }).promise();
        await fs.writeFile(localPath, s3Object.Body);

        downloaded++;
      } catch (error) {
        errors.push({ file: key, error: error.message });
      }
    }

    console.log(`✅ Downloaded ${courseCode} from S3: ${downloaded} files`);

    res.json({
      success: true,
      courseCode,
      filesDownloaded: downloaded,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error(`❌ Download error for ${courseCode}:`, error.message);
    res.status(500).json({ error: 'Download failed', detail: error.message });
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
 * Examples:
 *   GET /phase-intelligence/3              → phase_3_lego_pairs.md
 *   GET /phase-intelligence/1-orchestrator → phase_1_orchestrator.md
 *   GET /phase-intelligence/1-validator    → phase_1_validator.md
 */
app.get('/phase-intelligence/:phase', async (req, res) => {
  const { phase } = req.params;

  try {
    const intelligenceDir = path.join(__dirname, 'docs', 'phase_intelligence');

    // Handle orchestrator/validator routes (e.g., "1-orchestrator" → "phase_1_orchestrator.md")
    let matchingFile;
    if (phase.includes('-')) {
      const exactFile = `phase_${phase.replace('-', '_')}.md`;
      const files = await fs.readdir(intelligenceDir);
      matchingFile = files.find(f => f === exactFile);
    } else {
      // Find matching file: phase_3_*.md
      const files = await fs.readdir(intelligenceDir);
      matchingFile = files.find(f =>
        f.startsWith(`phase_${phase}_`) && f.endsWith('.md')
      );
    }

    if (!matchingFile) {
      // Fallback to legacy APML prompts
      const promptKey = `PHASE_${phase.replace(/[.-]/g, '_')}`;
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
// PHASE 1 ORCHESTRATION ENDPOINTS (v7.9 - Parallel Orchestration Architecture)
// =============================================================================

/**
 * POST /api/courses/:courseCode/phase/1/prepare
 * Prepare orchestrator batches for Phase 1 parallel execution
 *
 * Runs phase1-prepare-orchestrator-batches.cjs to divide 668 seeds into 5 chunks
 * Each chunk will be processed by one orchestrator spawning 10 sub-agents
 */
app.post('/api/courses/:courseCode/phase/1/prepare', async (req, res) => {
  const { courseCode } = req.params;
  const { numOrchestrators = 5 } = req.body;

  try {
    console.log(`[Phase 1 Prepare] Creating orchestrator batches for ${courseCode}...`);

    const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);

    // Check if course exists and has translations.json
    if (!await fs.pathExists(courseDir)) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const translationsFile = path.join(courseDir, 'translations.json');
    if (!await fs.pathExists(translationsFile)) {
      return res.status(404).json({ error: 'translations.json not found. Run translation fetch first.' });
    }

    // Run preparation script
    const scriptPath = path.join(__dirname, 'scripts', 'phase1-prepare-orchestrator-batches.cjs');
    const { stdout, stderr } = await execAsync(`node "${scriptPath}" ${courseCode} ${numOrchestrators}`);

    console.log(stdout);
    if (stderr) console.error(stderr);

    // Read manifest to return info
    const manifestPath = path.join(courseDir, 'orchestrator_batches', 'phase1', 'manifest.json');
    const manifest = await fs.readJSON(manifestPath);

    res.json({
      success: true,
      message: `Phase 1 orchestrator batches prepared successfully`,
      courseCode,
      manifest: {
        orchestrator_count: manifest.orchestrator_count,
        total_seeds: manifest.total_seeds,
        seeds_per_orchestrator: manifest.seeds_per_orchestrator,
        agents_per_orchestrator: manifest.agents_per_orchestrator,
        total_concurrent_agents: manifest.total_concurrent_agents,
        batches: manifest.batches
      }
    });
  } catch (err) {
    console.error('[Phase 1 Prepare] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/courses/:courseCode/phase/1/orchestrate
 * Spawn orchestrator agents for parallel Phase 1 execution
 *
 * Spawns N orchestrators (default 5) with 30-second delays
 * Each orchestrator spawns 10 sub-agents for translation work
 */
app.post('/api/courses/:courseCode/phase/1/orchestrate', async (req, res) => {
  const { courseCode } = req.params;
  const { numOrchestrators = 5, delayBetweenSpawns = 30000 } = req.body;

  try {
    console.log(`[Phase 1 Orchestrate] Spawning ${numOrchestrators} orchestrators for ${courseCode}...`);

    const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);
    const orchestratorDir = path.join(courseDir, 'orchestrator_batches', 'phase1');

    // Check if batches are prepared
    const manifestPath = path.join(orchestratorDir, 'manifest.json');
    if (!await fs.pathExists(manifestPath)) {
      return res.status(400).json({
        error: 'Orchestrator batches not prepared. Run /phase/1/prepare first.'
      });
    }

    const manifest = await fs.readJSON(manifestPath);

    // Get or create job
    let job = STATE.jobs.get(courseCode);
    if (!job) {
      job = {
        courseCode,
        status: 'in_progress',
        phase: 'phase_1_orchestration',
        progress: 0,
        startTime: new Date(),
        orchestrators: {
          total: numOrchestrators,
          spawned: 0,
          completed: 0
        }
      };
      STATE.jobs.set(courseCode, job);
    }

    // Load orchestrator intelligence
    const orchestratorIntelligencePath = path.join(__dirname, 'docs', 'phase_intelligence', 'phase_1_orchestrator.md');
    const orchestratorIntelligence = await fs.readFile(orchestratorIntelligencePath, 'utf8');

    // Spawn orchestrators with delays
    res.json({
      success: true,
      message: `Starting to spawn ${numOrchestrators} orchestrators`,
      courseCode,
      orchestrators_spawned: numOrchestrators,
      eta_minutes: Math.ceil((numOrchestrators * 13) / numOrchestrators), // ~13 min per orchestrator
      status: job
    });

    // Spawn orchestrators asynchronously (don't block response)
    (async () => {
      for (let i = 0; i < numOrchestrators; i++) {
        const orchestratorNum = String(i + 1).padStart(2, '0');
        const batchFile = path.join(orchestratorDir, `orchestrator_batch_${orchestratorNum}.json`);

        console.log(`[Phase 1 Orchestrate] Spawning orchestrator ${i + 1}/${numOrchestrators}...`);

        // Read batch file to get metadata
        const batch = await fs.readJSON(batchFile);

        // Create prompt for orchestrator
        const orchestratorPrompt = `# Phase 1 Orchestrator ${orchestratorNum}

**Course**: ${courseCode}
**Your Batch**: orchestrator_batch_${orchestratorNum}.json
**Seeds to Translate**: ${batch.metadata.total_seeds} seeds (${batch.metadata.seed_range})
**Sub-Agents to Spawn**: ${batch.metadata.agents_to_spawn}
**Seeds per Sub-Agent**: ~${batch.metadata.seeds_per_agent}

---

## Your Task

You are Orchestrator ${orchestratorNum} of ${numOrchestrators}. Follow the Phase 1 Orchestrator Intelligence to:

1. Read your batch file from: ${batchFile}
2. Spawn ${batch.metadata.agents_to_spawn} sub-agents in parallel (use Task tool in single message)
3. Each sub-agent translates ~${batch.metadata.seeds_per_agent} seeds
4. Validate all outputs
5. Merge into chunk_${orchestratorNum}.json
6. Report completion

---

## Phase 1 Orchestrator Intelligence

${orchestratorIntelligence}

---

## Output Location

Write your chunk to: ${path.join(orchestratorDir, `chunk_${orchestratorNum}.json`)}

---

Begin orchestration now!`;

        // Spawn orchestrator agent
        await spawnPhaseAgent(`1-orch${orchestratorNum}`, orchestratorPrompt, courseDir, courseCode);

        job.orchestrators.spawned++;
        console.log(`[Phase 1 Orchestrate] Orchestrator ${i + 1} spawned (${job.orchestrators.spawned}/${numOrchestrators})`);

        // Delay before next spawn (except for last one)
        if (i < numOrchestrators - 1) {
          console.log(`[Phase 1 Orchestrate] Waiting ${delayBetweenSpawns/1000}s before next spawn...`);
          await new Promise(resolve => setTimeout(resolve, delayBetweenSpawns));
        }
      }

      console.log(`[Phase 1 Orchestrate] All ${numOrchestrators} orchestrators spawned!`);
      job.phase = 'phase_1_orchestration_running';
      job.progress = 50;
    })().catch(err => {
      console.error('[Phase 1 Orchestrate] Error during spawning:', err);
      if (job) {
        job.status = 'failed';
        job.error = err.message;
      }
    });

  } catch (err) {
    console.error('[Phase 1 Orchestrate] Error:', err);
    if (STATE.jobs.has(courseCode)) {
      const job = STATE.jobs.get(courseCode);
      job.status = 'failed';
      job.error = err.message;
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/courses/:courseCode/phase/1/orchestrators/status
 * Check which orchestrators have completed their chunks
 */
app.get('/api/courses/:courseCode/phase/1/orchestrators/status', async (req, res) => {
  const { courseCode } = req.params;

  try {
    const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);
    const orchestratorDir = path.join(courseDir, 'orchestrator_batches', 'phase1');

    // Check if orchestrator directory exists
    if (!await fs.pathExists(orchestratorDir)) {
      return res.status(404).json({
        error: 'Orchestrator batches not found. Run /phase/1/prepare first.'
      });
    }

    // Read manifest
    const manifestPath = path.join(orchestratorDir, 'manifest.json');
    const manifest = await fs.readJSON(manifestPath);

    // Check which chunks exist
    const completed = [];
    const pending = [];

    for (let i = 1; i <= manifest.orchestrator_count; i++) {
      const chunkNum = String(i).padStart(2, '0');
      const chunkPath = path.join(orchestratorDir, `chunk_${chunkNum}.json`);

      if (await fs.pathExists(chunkPath)) {
        // Validate chunk has content
        try {
          const chunk = await fs.readJSON(chunkPath);
          if (chunk.translations && Object.keys(chunk.translations).length > 0) {
            completed.push(i);
          } else {
            pending.push(i);
          }
        } catch {
          pending.push(i);
        }
      } else {
        pending.push(i);
      }
    }

    const allComplete = pending.length === 0;
    const chunksReady = completed.length;

    res.json({
      success: true,
      courseCode,
      total_orchestrators: manifest.orchestrator_count,
      completed,
      pending,
      chunks_ready: chunksReady,
      all_complete: allComplete,
      ready_for_validation: allComplete
    });
  } catch (err) {
    console.error('[Phase 1 Orchestrators Status] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/courses/:courseCode/phase/1/validate
 * Spawn validator agent to check consistency and merge all chunks
 *
 * Reads all 5 chunks, detects conflicts, auto-fixes using Phase 1 rules
 * Outputs final seed_pairs.json
 */
app.post('/api/courses/:courseCode/phase/1/validate', async (req, res) => {
  const { courseCode } = req.params;

  try {
    console.log(`[Phase 1 Validate] Starting validation for ${courseCode}...`);

    const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);
    const orchestratorDir = path.join(courseDir, 'orchestrator_batches', 'phase1');

    // Check if all chunks are ready
    const manifestPath = path.join(orchestratorDir, 'manifest.json');
    if (!await fs.pathExists(manifestPath)) {
      return res.status(400).json({
        error: 'Orchestrator batches not found. Run /phase/1/prepare first.'
      });
    }

    const manifest = await fs.readJSON(manifestPath);

    // Verify all chunks exist
    const missingChunks = [];
    for (let i = 1; i <= manifest.orchestrator_count; i++) {
      const chunkNum = String(i).padStart(2, '0');
      const chunkPath = path.join(orchestratorDir, `chunk_${chunkNum}.json`);
      if (!await fs.pathExists(chunkPath)) {
        missingChunks.push(i);
      }
    }

    if (missingChunks.length > 0) {
      return res.status(400).json({
        error: `Missing chunks: ${missingChunks.join(', ')}. Wait for all orchestrators to complete.`
      });
    }

    // Load validator intelligence
    const validatorIntelligencePath = path.join(__dirname, 'docs', 'phase_intelligence', 'phase_1_validator.md');
    const validatorIntelligence = await fs.readFile(validatorIntelligencePath, 'utf8');

    // Create validator prompt
    const validatorPrompt = `# Phase 1 Validator

**Course**: ${courseCode}
**Chunks to Validate**: ${manifest.orchestrator_count} chunks
**Total Seeds**: ${manifest.total_seeds}
**Chunks Location**: ${orchestratorDir}

---

## Your Task

All ${manifest.orchestrator_count} orchestrators have completed. You are the validator. Your job is to:

1. Read all ${manifest.orchestrator_count} chunk files from: ${orchestratorDir}
2. Detect vocabulary conflicts across chunks
3. Auto-fix conflicts using Phase 1 rules (First Word Wins, Prefer Cognate, Zero Variation)
4. Flag subjective conflicts (if any)
5. Output final validated seed_pairs.json

---

## Phase 1 Validator Intelligence

${validatorIntelligence}

---

## Chunk Files to Read

${manifest.batches.map(b => `- ${b.output_file}`).join('\n')}

---

## Output Location

Write final seed_pairs.json to: ${path.join(courseDir, 'seed_pairs.json')}

---

## Success Criteria

- All ${manifest.total_seeds} seeds validated
- >90% conflicts auto-fixed
- Zero variation enforced (seeds 1-100)
- Cognate preference applied
- Final seed_pairs.json in v7.7 format

Begin validation now!`;

    // Get or update job
    let job = STATE.jobs.get(courseCode);
    if (!job) {
      job = {
        courseCode,
        status: 'in_progress',
        phase: 'phase_1_validation',
        progress: 90,
        startTime: new Date()
      };
      STATE.jobs.set(courseCode, job);
    } else {
      job.phase = 'phase_1_validation';
      job.progress = 90;
    }

    // Spawn validator agent
    console.log(`[Phase 1 Validate] Spawning validator agent...`);
    await spawnPhaseAgent('1-validator', validatorPrompt, courseDir, courseCode);

    res.json({
      success: true,
      message: 'Phase 1 validator spawned successfully',
      courseCode,
      phase: 'phase_1_validation',
      chunks_to_validate: manifest.orchestrator_count,
      status: job
    });
  } catch (err) {
    console.error('[Phase 1 Validate] Error:', err);
    if (STATE.jobs.has(courseCode)) {
      const job = STATE.jobs.get(courseCode);
      job.status = 'failed';
      job.error = err.message;
    }
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// PHASE EXECUTION ENDPOINTS (Phase 2, 4, 5, 6, 7, 8 - APML v7.8.4)
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
 * POST /api/courses/:courseCode/phase/4
 * Execute Phase 4: Batch Preparation with Smart Deduplication
 *
 * Reads lego_pairs.json, identifies duplicates, creates batches for parallel Phase 5
 */
app.post('/api/courses/:courseCode/phase/4', async (req, res) => {
  const { courseCode } = req.params;
  const { parallelism = 8 } = req.body;

  try {
    console.log(`[Phase 4] Starting batch preparation for ${courseCode}...`);

    const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);

    // Check if course exists
    if (!await fs.pathExists(courseDir)) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if Phase 3 is complete (lego_pairs.json exists)
    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
    if (!await fs.pathExists(legoPairsPath)) {
      return res.status(400).json({ error: 'Phase 3 not complete - lego_pairs.json not found' });
    }

    // Get or create job
    let job = STATE.jobs.get(courseCode);
    if (!job) {
      job = {
        courseCode,
        status: 'in_progress',
        phase: 'phase_4',
        progress: 0,
        startTime: new Date()
      };
      STATE.jobs.set(courseCode, job);
    }

    // Update job status
    job.phase = 'phase_4';
    job.progress = 70;

    // Run phase4-prepare-batches.cjs script
    console.log(`[Phase 4] Running batch preparation script with parallelism=${parallelism}...`);

    const scriptPath = path.join(__dirname, 'scripts', 'phase4-prepare-batches.cjs');
    const { spawn } = require('child_process');

    const batchProcess = spawn('node', [scriptPath, courseCode, String(parallelism)], {
      cwd: __dirname,
      stdio: 'inherit'
    });

    batchProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`[Phase 4] ✅ Batch preparation complete for ${courseCode}`);
        job.progress = 75;
        job.status = 'phase_4_complete';
      } else {
        console.error(`[Phase 4] ❌ Batch preparation failed with code ${code}`);
        job.status = 'failed';
        job.error = `Batch preparation script exited with code ${code}`;
      }
    });

    res.json({
      success: true,
      message: 'Phase 4 (Batch Preparation) started successfully',
      courseCode,
      phase: 'phase_4',
      parallelism,
      status: job
    });
  } catch (err) {
    console.error('[Phase 4] Error:', err);
    if (STATE.jobs.has(courseCode)) {
      const job = STATE.jobs.get(courseCode);
      job.status = 'failed';
      job.error = err.message;
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/courses/:courseCode/phase/4/status
 * Check Phase 4 batch preparation status
 */
app.get('/api/courses/:courseCode/phase/4/status', async (req, res) => {
  const { courseCode } = req.params;
  const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);
  const batchesDir = path.join(courseDir, 'batches');

  try {
    // Check if batches directory exists
    const batchesExist = await fs.pathExists(batchesDir);

    if (!batchesExist) {
      return res.json({
        complete: false,
        status: 'not_started',
        message: 'Phase 4 not started - batches/ directory does not exist'
      });
    }

    // Count batch files
    const files = await fs.readdir(batchesDir);
    const batchFiles = files.filter(f => f.startsWith('batch_') && f.endsWith('.json'));

    // Check if metadata exists
    const metadataPath = path.join(batchesDir, 'batch_metadata.json');
    const metadataExists = await fs.pathExists(metadataPath);

    if (metadataExists) {
      const metadata = await fs.readJson(metadataPath);
      return res.json({
        complete: true,
        status: 'complete',
        batches: batchFiles.length,
        totalLegos: metadata.totalLegos || 0,
        uniqueLegos: metadata.uniqueLegos || 0,
        duplicates: metadata.duplicates || 0,
        deduplicationRate: metadata.deduplicationRate || '0%',
        metadata
      });
    }

    res.json({
      complete: false,
      status: 'in_progress',
      batches: batchFiles.length
    });
  } catch (err) {
    console.error('[Phase 4] Status check error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/courses/:courseCode/phase/5
 * Execute Phase 5: Basket Generation (Parallel, reads Phase 4 batches)
 *
 * NEW in v3.0: Reads batches from Phase 4, generates only unique baskets
 */
app.post('/api/courses/:courseCode/phase/5', async (req, res) => {
  const { courseCode } = req.params;
  const { batchNumber } = req.body; // Optional: specific batch to run

  try {
    console.log(`[Phase 5] Starting basket generation for ${courseCode}...`);

    const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);
    const batchesDir = path.join(courseDir, 'batches');

    // Check if course exists
    if (!await fs.pathExists(courseDir)) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if Phase 4 is complete (batches/ exists)
    if (!await fs.pathExists(batchesDir)) {
      return res.status(400).json({ error: 'Phase 4 not complete - run batch preparation first' });
    }

    // Get or create job
    let job = STATE.jobs.get(courseCode);
    if (!job) {
      job = {
        courseCode,
        status: 'in_progress',
        phase: 'phase_5',
        progress: 0,
        startTime: new Date()
      };
      STATE.jobs.set(courseCode, job);
    }

    // Update job status
    job.phase = 'phase_5';
    job.progress = 80;

    // Construct prompt for Claude agent (Phase 5 v3.0)
    const batchInfo = batchNumber ? `batch ${batchNumber}` : 'all batches';
    const prompt = `# Phase 5 v3.0: Basket Generation for ${courseCode}

## Instructions
Please visit ${CONFIG.TRAINING_URL}/phase/5 for complete phase instructions.

## Task Summary (NEW in v3.0)
1. Read batch files from ${batchesDir}${batchNumber ? `/batch_${batchNumber}.json` : '/*.json'}
2. For each LEGO marked "generate": true, create basket with:
   - Eternal phrase (known = target, decontextualized)
   - Debut phrase (seed context where LEGO first appeared)
3. Skip LEGOs marked "generate": false (duplicates already handled by Phase 4)
4. Output lego_baskets.json

## Working Directory
${courseDir}

## Output File
lego_baskets.json

## Key Rules (v3.0)
- Only generate baskets for LEGOs with "generate": true
- Phase 4 already handled deduplication
- Each basket: { lego_id, eternal_phrase, debut_phrase, seed_context }
- Parallel-safe: Each batch can run independently

Begin Phase 5 now.`;

    // Spawn agent
    console.log(`[Phase 5] Spawning Claude Code agent for ${courseCode} (${batchInfo})...`);
    await spawnPhaseAgent('5', prompt, courseDir, courseCode);

    res.json({
      success: true,
      message: `Phase 5 v3.0 (Basket Generation) agent spawned successfully for ${batchInfo}`,
      courseCode,
      phase: 'phase_5',
      batchNumber: batchNumber || 'all',
      status: job
    });
  } catch (err) {
    console.error('[Phase 5] Error:', err);
    if (STATE.jobs.has(courseCode)) {
      const job = STATE.jobs.get(courseCode);
      job.status = 'failed';
      job.error = err.message;
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/courses/:courseCode/phase/5/status
 * Check Phase 5 basket generation status
 */
app.get('/api/courses/:courseCode/phase/5/status', async (req, res) => {
  const { courseCode } = req.params;
  const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);
  const basketsPath = path.join(courseDir, 'lego_baskets.json');

  try {
    // Check if lego_baskets.json exists
    const basketsExist = await fs.pathExists(basketsPath);

    if (!basketsExist) {
      return res.json({
        complete: false,
        status: 'not_started',
        message: 'Phase 5 not started - lego_baskets.json does not exist'
      });
    }

    // Load and analyze baskets
    const basketsData = await fs.readJson(basketsPath);
    const baskets = basketsData.baskets || [];

    res.json({
      complete: true,
      status: 'complete',
      totalBaskets: baskets.length,
      basketsData
    });
  } catch (err) {
    console.error('[Phase 5] Status check error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/courses/:courseCode/phase/5/merge
 * Merge Phase 5 batch outputs into single lego_baskets.json
 */
app.post('/api/courses/:courseCode/phase/5/merge', async (req, res) => {
  const { courseCode } = req.params;

  try {
    console.log(`[Phase 5] Merging basket batch outputs for ${courseCode}...`);

    const courseDir = path.join(CONFIG.VFS_ROOT, courseCode);

    // Check if course exists
    if (!await fs.pathExists(courseDir)) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Run phase5-merge-batches.cjs script
    const scriptPath = path.join(__dirname, 'scripts', 'phase5-merge-batches.cjs');
    const { spawn } = require('child_process');

    const mergeProcess = spawn('node', [scriptPath, courseCode], {
      cwd: __dirname,
      stdio: 'inherit'
    });

    mergeProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`[Phase 5] ✅ Batch merge complete for ${courseCode}`);
      } else {
        console.error(`[Phase 5] ❌ Batch merge failed with code ${code}`);
      }
    });

    res.json({
      success: true,
      message: 'Phase 5 batch merge started successfully',
      courseCode
    });
  } catch (err) {
    console.error('[Phase 5] Merge error:', err);
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
// TEST/UTILITY ENDPOINTS
// =============================================================================

/**
 * GET /api/health
 * Health check endpoint for tests
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '8.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/courses/generate-code
 * Generate course code from parameters (utility for tests)
 */
app.post('/api/courses/generate-code', (req, res) => {
  const { target, known, startSeed, endSeed } = req.body;
  const courseCode = generateCourseCode(target, known, startSeed, endSeed);

  res.json({
    courseCode,
    target,
    known,
    startSeed,
    endSeed
  });
});

/**
 * GET /api/phase-prompts/status
 * Check if all phase prompts loaded successfully (for tests)
 */
app.get('/api/phase-prompts/status', (req, res) => {
  const loadedPhases = Object.keys(PHASE_PROMPTS);
  const allLoaded = loadedPhases.length === 7; // Expect 7 phases

  res.json({
    loaded: allLoaded,
    count: loadedPhases.length,
    expected: 7,
    phases: PHASE_PROMPTS // Include full prompts for validation
  });
});

/**
 * DELETE /api/courses/:courseCode/job
 * Clear job state (for test cleanup)
 */
app.delete('/api/courses/:courseCode/job', (req, res) => {
  const { courseCode } = req.params;

  if (STATE.jobs.has(courseCode)) {
    const job = STATE.jobs.get(courseCode);
    STATE.jobs.delete(courseCode);

    res.json({
      success: true,
      message: 'Job cleared successfully',
      courseCode,
      previousStatus: job.status
    });
  } else {
    res.status(404).json({
      error: 'Job not found',
      courseCode
    });
  }
});

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
