#!/usr/bin/env node

/**
 * Spawn Course Builder Agent
 *
 * Spawns a Claude Code agent (Opus) to build a course sequentially.
 * Supports both iTerm2 and Terminal.app for dual Pro Max accounts.
 *
 * Usage:
 *   node spawn-course-builder.cjs --course zho_for_eng --seeds 30 --terminal iterm
 *   node spawn-course-builder.cjs --course fra_for_eng --seeds 260 --terminal terminal
 */

const fs = require('fs-extra');
const path = require('path');
const { spawnClaudeCliAgent } = require('./spawn-agent-cli.cjs');
const { spawnClaudeTerminalAgent } = require('./spawn-agent-terminal.cjs');

const COURSE_BUILDER_API = process.env.COURSE_BUILDER_API_URL || 'http://localhost:3471';
const DASHBOARD_ROOT = path.resolve(__dirname, '../..');

/**
 * Generate the Course Builder prompt/brief
 */
function generateCourseBuilderBrief(options) {
  const {
    courseCode,
    seedCount = 30,
    knownLang = 'English',
    targetLang,
    languageBrief = null,
    builderApiUrl = COURSE_BUILDER_API
  } = options;

  // Extract language codes from course code (e.g., zho_for_eng -> zho, eng)
  const [targetCode, , knownCode] = courseCode.split('_');

  const brief = `# Course Builder Task

You are building a language course: **${courseCode}**

## Target
- **Known language**: ${knownLang} (${knownCode})
- **Target language**: ${targetLang || targetCode}
- **Seeds to build**: ${seedCount}

## LEARN BY EXAMPLE - THIS IS HOW SSi COURSES WORK

Study this Welsh course excerpt carefully. This is EXACTLY the pedagogical pattern you must follow:

\`\`\`
ROUND 1 - S0001L01: "I want" → "dw i isio"
  INTRO: I want → dw i isio
  LEGO: I want → dw i isio
  (No practice phrases yet - nothing to combine with!)

ROUND 2 - S0001L02: "to speak" → "siarad"
  INTRO: to speak → siarad
  LEGO: to speak → siarad
  DEBUT-1: I want to speak → dw i isio siarad  ← combines L01 + L02

ROUND 3 - S0001L03: "Welsh" → "cymraeg"
  INTRO: Welsh → cymraeg
  LEGO: Welsh → cymraeg
  DEBUT-1: to speak Welsh → siarad cymraeg  ← L02 + L03
  REP: I want to speak → dw i isio siarad  ← review L02

ROUND 4 - S0002L01: "to learn" → "dysgu"
  INTRO: to learn → dysgu
  LEGO: to learn → dysgu
  DEBUT-1: to learn Welsh → dysgu cymraeg  ← uses L03
  DEBUT-2: I want to learn → dw i isio dysgu  ← uses L01
  DEBUT-3: I want to learn Welsh → dw i isio dysgu cymraeg  ← L01 + L03
  DEBUT-4: I want to learn to speak Welsh → dw i isio dysgu siarad cymraeg  ← LONG phrase!
  REP: to speak Welsh → siarad cymraeg

ROUND 5 - S0002L02: "I'm trying" → "dw i'n trio"
  INTRO: I'm trying → dw i'n trio
  LEGO: I'm trying → dw i'n trio
  DEBUT-1: I'm trying to learn → dw i'n trio dysgu
  DEBUT-2: I'm trying to speak → dw i'n trio siarad
  DEBUT-3: I'm trying to speak Welsh → dw i'n trio siarad cymraeg
  REP: I want to learn to speak Welsh → dw i isio dysgu siarad cymraeg  ← long review
  REP: to learn Welsh → dysgu cymraeg
  REP: I want to learn → dw i isio dysgu

ROUND 6 - S0003L01: "I'm going to" → "dw i'n mynd i"
  INTRO: I'm going to → dw i'n mynd i
  LEGO: I'm going to → dw i'n mynd i
  DEBUT-1: I want to try → dw i isio trio  ← "trio" was in L05!
  DEBUT-2: I'm going to try → dw i'n mynd i drio
  DEBUT-3: I'm going to speak → dw i'n mynd i siarad
  DEBUT-4: I'm going to learn → dw i'n mynd i ddysgu
  DEBUT-5: I'm going to try to speak → dw i'n mynd i drio siarad
  DEBUT-6: I want to try to speak Welsh → dw i isio trio siarad cymraeg
  DEBUT-7: I want to try to learn Welsh → dw i isio trio dysgu cymraeg
  ETERNAL-1: I'm going to speak Welsh → dw i'n mynd i siarad cymraeg  ← 10+ syllables
  ETERNAL-2: I'm going to try to learn Welsh → dw i'n mynd i drio dysgu cymraeg

ROUND 9 - S0006L01: "I can't" → "fedra i ddim"
  INTRO: I can't → fedra i ddim
  LEGO: I can't → fedra i ddim
  DEBUT-1: I can't try → fedra i ddim trio
  DEBUT-2: I can't speak → fedra i ddim siarad
  DEBUT-3: I can't practice → fedra i ddim ymarfer  ← from earlier seed
  DEBUT-4: I can't practice speaking → fedra i ddim ymarfer siarad
  DEBUT-5: I can't learn Welsh → fedra i ddim dysgu cymraeg
  DEBUT-6: I can't speak Welsh → fedra i ddim siarad cymraeg
  DEBUT-7: I can't practice speaking Welsh → fedra i ddim ymarfer siarad cymraeg
\`\`\`

**CRITICAL PATTERNS TO NOTICE:**

1. **PHRASES BUILD UP** - Start short (2 words), grow longer (5+ words), reach ETERNAL length (10+ syllables)

2. **ONLY USE AVAILABLE VOCAB** - L01 has NO phrases. L02 can only combine with L01. L06 can use L01-L05.

3. **PHRASES PROGRESS IN COMPLEXITY:**
   - First: simple 2-word combinations (I want to speak)
   - Then: 3-word (I want to learn Welsh)
   - Then: 4-word (I'm trying to speak Welsh)
   - Finally: 5+ word ETERNAL phrases (I'm going to try to learn Welsh)

4. **TEMPORAL/GRAMMAR MARKERS COME LATE** - "now", question particles, etc. introduced AFTER core verbs so learner sees WHERE they go through many examples.

## Spanish Example - Same Pattern

\`\`\`
R1 - S0001L01: "I want" → "quiero"
  Intro: I want → quiero
  Debut: I want → quiero
  (No practice yet!)

R2 - S0001L02: "to speak" → "hablar"
  Intro: to speak → hablar
  Debut: to speak → hablar
  Practice: I want to speak → Quiero hablar  ← L01+L02

R3 - S0001L03: "Spanish" → "español"
  Intro: Spanish → español
  Practice: I want to speak Spanish → Quiero hablar español
  Review: I want to speak → Quiero hablar

R4 - S0001L04: "with you" → "contigo"
  Practice: I want to speak with you → Quiero hablar contigo
  Practice: to speak Spanish with you → hablar español contigo
  Practice: I want to speak Spanish with you → Quiero hablar español contigo

R5 - S0001L05: "now" → "ahora"  ← temporal marker LAST!
  Practice: I want to speak now → Quiero hablar ahora
  Practice: I want to speak Spanish now → Quiero hablar español ahora
  Practice: I want to speak with you now → Quiero hablar contigo ahora
  Practice: I want to speak Spanish with you now → Quiero hablar español contigo ahora
  (See how "now" combines with EVERYTHING because it came last?)

R6 - S0002L01: "I'm trying" → "estoy intentando"
  Practice: I'm trying to speak → Estoy intentando hablar
  Practice: I'm trying to speak Spanish → Estoy intentando hablar español
  Practice: I'm trying to speak Spanish now → Estoy intentando hablar español ahora
  CONSOLIDATE: I'm trying to speak Spanish with you now → Estoy intentando hablar español contigo ahora
\`\`\`

## M-LEGOs WITH COMPONENT BUILD-UP

When a LEGO is multi-word (M-type), break it into components. The API auto-generates build-up:

\`\`\`
M-LEGO: "I want" → "我想"
Components: ["I" → "我"], ["want" → "想"]

AUTO-GENERATED BUILD-UP (learner sees):
  1. I → 我
  2. want → 想
  3. I want → 我想  ← the full M-LEGO
\`\`\`

\`\`\`
M-LEGO: "with you" → "和你"
Components: ["with" → "和"], ["you" → "你"]

BUILD-UP:
  1. with → 和
  2. you → 你
  3. with you → 和你
\`\`\`

\`\`\`
M-LEGO: "I'm going to try" → "我要试"
Components: ["I" → "我"], ["going to" → "要"], ["try" → "试"]

BUILD-UP:
  1. I → 我
  2. going to → 要
  3. try → 试
  4. I'm going to try → 我要试
\`\`\`

**KEY POINTS:**
- Components become vocabulary (can be used in later phrases)
- Build-up teaches the pieces THEN the whole
- Particles (吗, 了, etc.) are NOT listed as components - they're inferred from context

**CRITICAL: NO EXPLANATIONS IN CONTENT**

All text becomes audio via TTS. Annotations would be read aloud!

- NO parentheses like "(question)" or "(past tense)"
- NO annotations or comments
- NO grammar labels
- JUST the known text and target text - nothing else
- The learner infers meaning from CONTEXT, not from labels

\`\`\`
M-LEGO: "Is it good?" → "好吗"
Components: ["good" → "好"]

BUILD-UP:
  1. good → 好
  2. Is it good? → 好吗
\`\`\`

\`\`\`
M-LEGO: "I've eaten" → "我吃了"
Components: ["I" → "我"], ["eat" → "吃"]

BUILD-UP:
  1. I → 我
  2. eat → 吃
  3. I've eaten → 我吃了
\`\`\`

\`\`\`
M-LEGO: "What about you?" → "你呢"
Components: ["you" → "你"]

BUILD-UP:
  1. you → 你
  2. What about you? → 你呢
\`\`\`

\`\`\`
M-LEGO: "my book" → "我的书"
Components: ["I" → "我"], ["book" → "书"]

BUILD-UP:
  1. I → 我
  2. book → 书
  3. my book → 我的书
\`\`\`

\`\`\`
M-LEGO: "I'm eating" → "我在吃"
Components: ["I" → "我"], ["eat" → "吃"]

BUILD-UP:
  1. I → 我
  2. eat → 吃
  3. I'm eating → 我在吃
\`\`\`

The meaning of particles emerges from the contrast. Learner sees "eat" → "吃", then "I've eaten" → "我吃了" - they figure out 了 themselves. No explanation needed or wanted.

## YOUR TASK: Do This For ${targetLang || targetCode}

Use your linguistic expertise to:

1. **Translate** each seed naturally into ${targetLang || targetCode}
2. **Decompose** into LEGOs in PEDAGOGICAL order (not sentence order!)
3. **Generate phrases** that BUILD UP from short to long, using ONLY available vocabulary

**For LEGO N, phrases can ONLY use:**
- LEGO N itself
- All LEGOs from seeds 1 through S-1
- LEGOs 1 through N-1 from current seed

**Phrase progression for each LEGO:**
- Start with 2-3 word combinations
- Build to 4-5 word combinations
- Include 2-3 ETERNAL phrases (10+ syllables in target language)

## API: POST /api/seed/complete

Submit each seed via curl:

\`\`\`bash
curl -X POST ${builderApiUrl}/api/seed/complete \\
  -H "Content-Type: application/json" \\
  -d '{
    "course_code": "${courseCode}",
    "seed_number": 1,
    "known_text": "I want to speak Chinese with you now.",
    "target_text": "我现在想和你说中文。",
    "legos": [
      {
        "idx": 1,
        "type": "M",
        "known": "I want",
        "target": "我想",
        "components": [{"known": "I", "target": "我"}, {"known": "want", "target": "想"}],
        "phrases": []
      },
      {
        "idx": 2,
        "type": "A",
        "known": "to speak",
        "target": "说",
        "phrases": [
          {"known": "I want to speak", "target": "我想说"}
        ]
      },
      {
        "idx": 3,
        "type": "A",
        "known": "Chinese",
        "target": "中文",
        "phrases": [
          {"known": "speak Chinese", "target": "说中文"},
          {"known": "I want to speak Chinese", "target": "我想说中文"}
        ]
      },
      {
        "idx": 4,
        "type": "M",
        "known": "with you",
        "target": "和你",
        "components": [{"known": "with", "target": "和"}, {"known": "you", "target": "你"}],
        "phrases": [
          {"known": "speak with you", "target": "和你说"},
          {"known": "speak Chinese with you", "target": "和你说中文"},
          {"known": "I want to speak with you", "target": "我想和你说"},
          {"known": "I want to speak Chinese with you", "target": "我想和你说中文"}
        ]
      },
      {
        "idx": 5,
        "type": "A",
        "known": "now",
        "target": "现在",
        "phrases": [
          {"known": "speak now", "target": "现在说"},
          {"known": "I now want", "target": "我现在想"},
          {"known": "I now want to speak", "target": "我现在想说"},
          {"known": "now speak Chinese", "target": "现在说中文"},
          {"known": "I now want to speak Chinese", "target": "我现在想说中文"},
          {"known": "I now want to speak with you", "target": "我现在想和你说"},
          {"known": "I now want to speak Chinese with you", "target": "我现在想和你说中文"}
        ]
      }
    ]
  }'
\`\`\`

**Note how phrases build up and "now" (现在) comes LAST so learner sees it goes AFTER subject, BEFORE verb!**

## Particles Are Learned In Context

For Chinese particles (吗, 呢, 了, etc.), include them in M-LEGOs:

\`\`\`json
{
  "type": "M",
  "known": "Is it good?",
  "target": "好吗",
  "components": [{"known": "good", "target": "好"}]
}
\`\`\`

Build-up teaches: "good" → "好", then "Is it good?" → "好吗". Learner infers 吗 from context.

## ⚠️ TWO-PASS WORKFLOW ⚠️

**First, check which pass you're on:**
\`\`\`bash
curl -s "${builderApiUrl}/api/resume/${courseCode}" | jq '.pass_status'
\`\`\`

- \`pass1_complete: false\` → Do PASS 1
- \`pass1_complete: true, pass2_complete: false\` → Do PASS 2

---

## PASS 1: TRANSLATIONS ONLY

**You ONLY translate. No LEGOs. No phrases.**

1. Read \`/ssi-translation-methodology\` skill first
2. Get seeds: \`GET ${builderApiUrl}/api/course/${courseCode}/translate?limit=${seedCount}\`
3. For each seed, save translation: \`PATCH ${builderApiUrl}/api/seed/${courseCode}/{seed_number}\` with \`{"target_text": "..."}\`
4. After ALL translations, save analysis: \`POST ${builderApiUrl}/api/course/${courseCode}/analysis\`

**⛔ Do not proceed to Pass 2 until all ${seedCount} translations are saved.**

---

## PASS 2: DECOMPOSE INTO LEGOs

**Now create LEGOs and practice phrases.**

1. Get resume: \`GET ${builderApiUrl}/api/resume/${courseCode}\` (includes your analysis)
2. For each seed: \`POST ${builderApiUrl}/api/seed/complete\` with full seed + LEGOs
3. API validates - fix errors and retry

---

## Quality Validation

The API will REJECT submissions that:
- Use vocabulary not yet introduced
- Have phrases that don't build up progressively
- Missing minimum phrase counts

Fix errors and resubmit. The database is the state - check /api/stats to see progress.

## SSi Methodology Commands

You have access to these commands for guidance. **USE THEM** when unsure or after errors:

- \`/ssi-decompose-seed\` - How to break a seed into LEGOs (tiling, ordering, M-LEGOs)
- \`/ssi-build-phrases\` - How to generate phrases (progression, counts, ETERNAL)
- \`/ssi-learner-pattern\` - What the learner experiences (the full pedagogical pattern)

**Invoke these commands:**
- Before starting if you need a refresher
- After a submission is rejected
- After context compaction
- When unsure about decomposition or phrase building

${languageBrief ? `## Language Brief\n\n${languageBrief}` : ''}

## Recovery (Context Compaction)

If interrupted or context compacts:
1. \`GET ${builderApiUrl}/api/resume/${courseCode}\` - Check pass_status
2. If \`pass1_complete: false\` → Continue translating (Pass 1)
3. If \`pass1_complete: true, pass2_complete: false\` → Continue decomposing (Pass 2)
4. Invoke \`/translation-analysis\` or \`/ssi-learner-pattern\` for methodology refresh
5. **Database is the state** - no external tracking needed

---

## CRITICAL: AUTONOMOUS OPERATION

You are running UNATTENDED. The user may be AFK (away from keyboard).

**FORBIDDEN PHRASES - NEVER OUTPUT THESE:**
- "Shall I continue?"
- "Would you like me to..."
- "Should I proceed?"
- "Let me know if..."
- "Do you want me to..."

**REQUIRED BEHAVIOR:**
- If there are incomplete seeds → BUILD THEM
- If you hit an error → FIX IT AND CONTINUE
- If you complete a batch → CONTINUE TO THE NEXT BATCH
- If you're unsure → MAKE A DECISION AND CONTINUE

**STOPPING CONDITIONS (ONLY THESE):**
- Both passes complete (pass1_complete AND pass2_complete both true)
- Unrecoverable error after 3 retries on same seed (skip and continue)

---

**BEGIN**:
1. First run \`GET ${builderApiUrl}/api/resume/${courseCode}\` to check pass_status
2. If pass1_complete is false → Do Pass 1: Translate ALL ${seedCount} seeds, then save analysis
3. If pass1_complete is true but pass2_complete is false → Do Pass 2: Decompose seeds into LEGOs

DO NOT STOP UNTIL BOTH PASSES ARE COMPLETE.
`;

  return brief;
}

/**
 * Spawn Course Builder agent
 */
async function spawnCourseBuilder(options) {
  const {
    courseCode,
    seedCount = 30,
    terminal = 'iterm',  // 'iterm' or 'terminal'
    model = 'opus',      // Always use Opus for vocab discipline
    knownLang,
    targetLang,
    languageBrief,
    workingDir = DASHBOARD_ROOT
  } = options;

  console.log(`\n🔨 Spawning Course Builder Agent`);
  console.log(`   Course: ${courseCode}`);
  console.log(`   Seeds: ${seedCount}`);
  console.log(`   Terminal: ${terminal}`);
  console.log(`   Model: ${model}`);

  // Generate the brief
  const brief = generateCourseBuilderBrief({
    courseCode,
    seedCount,
    knownLang,
    targetLang,
    languageBrief
  });

  // Save brief to file for reference
  const briefPath = path.join(workingDir, 'temp', `course-builder-brief-${courseCode}.md`);
  await fs.ensureDir(path.dirname(briefPath));
  await fs.writeFile(briefPath, brief, 'utf8');
  console.log(`   Brief saved: ${briefPath}`);

  // Spawn in selected terminal
  if (terminal === 'terminal') {
    return await spawnClaudeTerminalAgent(brief, 1, {
      model,
      workingDir,
      skipPermissions: true
    });
  } else {
    return await spawnClaudeCliAgent(brief, 1, {
      model,
      workingDir,
      skipPermissions: true
    });
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node spawn-course-builder.cjs [options]

Options:
  --course <code>       Course code (e.g., zho_for_eng)
  --seeds <n>           Number of seeds to build (default: 30)
  --terminal <type>     Terminal to use: iterm or terminal (default: iterm)
  --model <name>        Claude model for builder (default: opus)
  --known <lang>        Known language name (e.g., English)
  --target <lang>       Target language name (e.g., Chinese)
  --with-monitor        Also spawn Sonnet phrase monitor (in second tab)

Examples:
  # Build Chinese course in iTerm2
  node spawn-course-builder.cjs --course zho_for_eng --seeds 30 --terminal iterm

  # Build with QA monitor (Opus in tab 1, Sonnet in tab 2)
  node spawn-course-builder.cjs --course zho_for_eng --seeds 30 --with-monitor

  # Build French course in Terminal.app (second Pro Max account)
  node spawn-course-builder.cjs --course fra_for_eng --seeds 260 --terminal terminal
    `);
    process.exit(0);
  }

  const getArg = (name) => args.find((_, i) => args[i - 1] === name);
  const courseCode = getArg('--course');
  const seedCount = parseInt(getArg('--seeds')) || 30;
  const terminal = getArg('--terminal') || 'iterm';
  const model = getArg('--model') || 'opus';
  const knownLang = getArg('--known');
  const targetLang = getArg('--target');
  const withMonitor = args.includes('--with-monitor');

  if (!courseCode) {
    console.error('Error: --course required');
    process.exit(1);
  }

  const options = {
    courseCode,
    seedCount,
    terminal,
    model,
    knownLang,
    targetLang
  };

  const spawnFn = withMonitor ? spawnBuildWithMonitor : spawnCourseBuilder;
  const successMsg = withMonitor
    ? '\n✓ Course Builder (Opus) + Phrase Monitor (Sonnet) spawned'
    : '\n✓ Course Builder agent spawned';

  spawnFn(options)
    .then(() => console.log(successMsg))
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}

/**
 * Generate the Phrase Monitor brief for Sonnet QA agent
 * Updated: Now uses Sonnet (not Haiku) and only flags USE phrases
 */
function generatePhraseMonitorBrief(options) {
  const {
    courseCode,
    builderApiUrl = COURSE_BUILDER_API
  } = options;

  return `# Phrase Monitor - Language Quality Watchdog

You are a QA monitor running alongside the Course Builder. Your job is to assess grammar quality for **USE phrases only**.

## Course: ${courseCode}

## Your Role

You do NOT block the build. You observe and flag issues. Humans review at checkpoints.

---

## CRITICAL: SSi LEGO Methodology

This is a LEGO-based language learning system where phrases are built from components:

- **component** phrases: Building blocks (e.g., "de" for "to", "essaie" for "am trying") - these combine with other LEGOs to form sentences. **DO NOT FLAG THESE** - they are intentionally partial.
- **practice** phrases: Intermediate build-up steps - may be fragments. **DO NOT FLAG THESE** unless there's a clear typo.
- **USE** phrases: Complete sentences learners will produce. **FLAG ISSUES IN THESE ONLY**.

Examples of VALID component mappings (DO NOT FLAG):
- "de" → "to" (used in "essayer de" = "try to")
- "que" → "as" (used in "aussi...que" = "as...as")
- "me" → "myself" (used in reflexive verbs like "je me souviens")

---

## PRIMARY TASK: Check USE Phrases Only

Poll for unchecked phrases:

\`\`\`bash
# Get unchecked phrases (filter to USE role)
curl -s "${builderApiUrl}/api/qa/unchecked/${courseCode}?limit=50&role=use"
\`\`\`

### For Each USE Phrase, Assess:

1. **Known Language Grammar** - Is the English correct and natural?
2. **Target Language Grammar** - Is the translation grammatically correct?
3. **Semantic Match** - Does the target actually mean what the known says?
4. **Naturalness** - Would a native speaker say this?

### SKIP if phrase_role is "component" or "practice"

### Flag Any Issues Found:

\`\`\`bash
curl -X POST "${builderApiUrl}/api/qa/flag" \\
  -H "Content-Type: application/json" \\
  -d '{
    "course_code": "${courseCode}",
    "phrase_id": "uuid-here",
    "check_type": "grammar",
    "severity": "warning",
    "issue": "Brief description of the problem",
    "details": {
      "known_text": "the phrase",
      "target_text": "the translation",
      "suggestion": "what it should be"
    }
  }'
\`\`\`

### Check Types:
- \`grammar\` - Grammar error in either language
- \`semantic\` - Translation meaning is wrong
- \`naturalness\` - Sounds weird even if grammatically ok
- \`vocabulary\` - Uses words not yet introduced

### Severity:
- \`error\` - Definitely wrong, must fix
- \`warning\` - Probably wrong, should review
- \`info\` - Noticed something, optional review

### After Checking, Mark as Checked:

\`\`\`bash
curl -X POST "${builderApiUrl}/api/qa/mark-checked" \\
  -H "Content-Type: application/json" \\
  -d '{"phrase_ids": ["uuid1", "uuid2", ...]}'
\`\`\`

---

## SECONDARY: Run Statistical Analysis

Periodically run the tally script:

\`\`\`bash
node services/phrase-monitor.cjs --course ${courseCode} --analyze
\`\`\`

This flags statistical patterns like workhorse LEGOs or repetitive structures.

---

## Monitoring Loop

\`\`\`
WHILE build is running:
  1. Poll for unchecked phrases (every 30s)
  2. For each phrase:
     - Assess grammar in BOTH languages
     - Assess semantic accuracy
     - Assess naturalness
     - Flag any issues
  3. Mark phrases as checked
  4. Every 5 minutes, run statistical analysis
\`\`\`

---

## CRITICAL: AUTONOMOUS OPERATION

You are running UNATTENDED alongside the build agent.

**FORBIDDEN:**
- "Shall I continue?"
- "Would you like me to..."
- Any question asking for permission

**REQUIRED:**
- Keep polling for new phrases
- Keep checking and flagging
- Run until no more unchecked phrases appear for 5 minutes after build completes

---

**BEGIN:** Start polling for unchecked phrases and assess each one.
`;
}

/**
 * Spawn Phrase Monitor agent (Sonnet)
 * Uses Sonnet for better understanding of SSi LEGO methodology - only flags USE phrases
 * @param {number} agentId - Agent ID for window/tab management (default: 2 since builder is 1)
 */
async function spawnPhraseMonitor(options, agentId = 2) {
  const {
    courseCode,
    terminal = 'iterm',
    workingDir = DASHBOARD_ROOT
  } = options;

  console.log(`\n👁️  Spawning Phrase Monitor Agent (Sonnet)`);
  console.log(`   Course: ${courseCode}`);
  console.log(`   Terminal: ${terminal}`);
  console.log(`   Model: sonnet`);

  const brief = generatePhraseMonitorBrief({ courseCode });

  // Save brief for reference
  const briefPath = path.join(workingDir, 'temp', `phrase-monitor-brief-${courseCode}.md`);
  await fs.ensureDir(path.dirname(briefPath));
  await fs.writeFile(briefPath, brief, 'utf8');
  console.log(`   Brief saved: ${briefPath}`);

  // Use same terminal as builder - agentId 2 creates a new tab
  if (terminal === 'terminal') {
    return await spawnClaudeTerminalAgent(brief, agentId, {
      model: 'sonnet',
      workingDir,
      skipPermissions: true
    });
  } else {
    return await spawnClaudeCliAgent(brief, agentId, {
      model: 'sonnet',
      workingDir,
      skipPermissions: true
    });
  }
}

/**
 * Spawn both Course Builder (Opus) and Phrase Monitor (Sonnet)
 * Builder opens in new window (agent 1), Monitor opens in new tab (agent 2)
 */
async function spawnBuildWithMonitor(options) {
  const { courseCode, terminal = 'iterm' } = options;

  console.log(`\n🚀 Spawning Course Builder + Phrase Monitor`);
  console.log(`   Terminal: ${terminal === 'iterm' ? 'iTerm2' : 'Terminal.app'}`);
  console.log(`   Builder (Opus): Window 1`);
  console.log(`   Monitor (Sonnet): Tab 2`);

  // Spawn builder first (creates window), then monitor (creates tab)
  const builderResult = await spawnCourseBuilder(options);

  // Small delay to let the window open
  await new Promise(resolve => setTimeout(resolve, 1500));

  const monitorResult = await spawnPhraseMonitor(options, 2);

  return { builder: builderResult, monitor: monitorResult };
}

/**
 * Generate the Phrase Auditor brief for Sonnet audit agent
 * Unlike Monitor (which checks unchecked phrases), Auditor samples ANY phrases for quality verification
 */
function generatePhraseAuditorBrief(options) {
  const {
    courseCode,
    sampleSize = 100,
    builderApiUrl = COURSE_BUILDER_API
  } = options;

  return `# Phrase Auditor - Quality Verification Agent

You are a QA auditor performing a **random quality check** on phrases that may have already passed initial review.

## Course: ${courseCode}

## Your Role

You verify quality by sampling phrases at random - including ones marked as "checked". This catches issues that slipped through initial review.

---

## CRITICAL: SSi LEGO Methodology

This is a LEGO-based language learning system where phrases are built from components:

- **component** phrases: Building blocks (e.g., "de" for "to") - these combine with other LEGOs. **DO NOT FLAG THESE** - they are intentionally partial.
- **practice** phrases: Intermediate build-up steps - may be fragments. **DO NOT FLAG THESE** unless there's a clear typo.
- **USE** phrases: Complete sentences learners will produce. **FLAG ISSUES IN THESE ONLY**.

---

## AUDIT TASK: Random Sample Check

Get a random sample of phrases:

\`\`\`bash
curl -s "${builderApiUrl}/api/qa/sample/${courseCode}?limit=${sampleSize}"
\`\`\`

### For Each USE Phrase, Assess:

1. **Known Language Grammar** - Is the English correct and natural?
2. **Target Language Grammar** - Is the translation grammatically correct?
3. **Semantic Match** - Does the target actually mean what the known says?
4. **Naturalness** - Would a native speaker say this?

### SKIP if phrase_role is "component" or "practice"

### Flag Any Issues Found:

\`\`\`bash
curl -X POST "${builderApiUrl}/api/qa/flag" \\
  -H "Content-Type: application/json" \\
  -d '{
    "course_code": "${courseCode}",
    "phrase_id": "uuid-here",
    "check_type": "grammar",
    "severity": "warning",
    "issue": "Brief description of the problem",
    "details": {
      "known_text": "the phrase",
      "target_text": "the translation",
      "suggestion": "what it should be"
    }
  }'
\`\`\`

### Check Types:
- \`grammar\` - Grammar error in either language
- \`semantic\` - Translation meaning is wrong
- \`naturalness\` - Sounds weird even if grammatically ok

### Severity:
- \`error\` - Definitely wrong, must fix
- \`warning\` - Probably wrong, should review
- \`info\` - Noticed something, optional review

---

## Audit Summary

After reviewing the sample, report:
- Total phrases sampled
- USE phrases reviewed (skip component/practice)
- Issues found by severity (error/warning/info)
- Common patterns (if any)

---

## CRITICAL: AUTONOMOUS OPERATION

You are running UNATTENDED.

**FORBIDDEN:**
- "Shall I continue?"
- "Would you like me to..."
- Any question asking for permission

**REQUIRED:**
- Fetch the sample
- Review all USE phrases
- Flag issues
- Report summary
- Exit when done

---

**BEGIN:** Fetch the random sample and audit each USE phrase.
`;
}

/**
 * Spawn Phrase Auditor agent (Sonnet)
 * Uses Sonnet for quality verification via random sampling
 */
async function spawnPhraseAuditor(options, agentId = 1) {
  const {
    courseCode,
    sampleSize = 100,
    terminal = 'iterm',
    workingDir = DASHBOARD_ROOT
  } = options;

  console.log(`\n🔍 Spawning Phrase Auditor Agent (Sonnet)`);
  console.log(`   Course: ${courseCode}`);
  console.log(`   Sample size: ${sampleSize}`);
  console.log(`   Terminal: ${terminal}`);
  console.log(`   Model: sonnet`);

  const brief = generatePhraseAuditorBrief({ courseCode, sampleSize });

  // Save brief for reference
  const briefPath = path.join(workingDir, 'temp', `phrase-auditor-brief-${courseCode}.md`);
  await fs.ensureDir(path.dirname(briefPath));
  await fs.writeFile(briefPath, brief, 'utf8');
  console.log(`   Brief saved: ${briefPath}`);

  if (terminal === 'terminal') {
    return await spawnClaudeTerminalAgent(brief, agentId, {
      model: 'sonnet',
      workingDir,
      skipPermissions: true
    });
  } else {
    return await spawnClaudeCliAgent(brief, agentId, {
      model: 'sonnet',
      workingDir,
      skipPermissions: true
    });
  }
}

/**
 * Generate the Phrase Fixer brief for Opus correction agent
 */
function generatePhraseFixerBrief(options) {
  const {
    courseCode,
    builderApiUrl = COURSE_BUILDER_API
  } = options;

  return `# Phrase Fixer - Opus Correction Agent

You review QA flags and fix phrase issues. You are the linguistic expert - humans trust your judgment.

## Course: ${courseCode}

---

## Your Task

1. Get pending flags
2. For each flag, decide: FIX, DISMISS, or SKIP
3. Apply fixes to the database
4. Mark flags as resolved

---

## Workflow

### 1. Get Pending Flags

\`\`\`bash
curl -s "${builderApiUrl}/api/qa/flags/${courseCode}/pending?limit=20"
\`\`\`

### 2. For Each Flag

Read the \`issue\`, \`details.known_text\`, \`details.target_text\`, and \`details.suggestion\`.

**Decision:**
- **Is Sonnet's assessment correct?**
  - NO → Dismiss as false positive
  - YES → Is there a clear fix?
    - YES (high confidence) → Auto-fix
    - NO (uncertain) → Skip for human

### 3. Apply Fix

\`\`\`bash
curl -X PATCH "${builderApiUrl}/api/phrases/{phrase_id}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "known_text": "corrected English",
    "target_text": "corrected target"
  }'
\`\`\`

### 4. Mark Resolved

\`\`\`bash
curl -X POST "${builderApiUrl}/api/qa/flag/{flag_id}/resolve" \\
  -H "Content-Type: application/json" \\
  -d '{
    "resolution": "fixed",
    "fix_applied": {
      "field": "target_text",
      "old_value": "wrong",
      "new_value": "correct"
    },
    "reasoning": "Why this fix is correct"
  }'
\`\`\`

### 5. Dismiss False Positive

\`\`\`bash
curl -X POST "${builderApiUrl}/api/qa/flag/{flag_id}/dismiss" \\
  -H "Content-Type: application/json" \\
  -d '{"reasoning": "Why the flag was incorrect"}'
\`\`\`

---

## Confidence Levels

**HIGH - Auto-fix:**
- Clear grammar errors (wrong conjugation, missing article)
- Obvious typos
- Wrong word form

**MEDIUM - Fix with note:**
- Naturalness improvements
- Minor semantic adjustments

**LOW - Skip:**
- Ambiguous translations
- Multiple valid options
- Needs human judgment

---

## Batch Processing

Process in batches of 20:
1. Fetch pending flags
2. Categorize by confidence
3. Auto-fix HIGH confidence
4. Fix MEDIUM if clear
5. Skip LOW (leave for human)
6. Report: "Fixed X, dismissed Y, skipped Z"

---

## CRITICAL: AUTONOMOUS OPERATION

**FORBIDDEN:**
- "Shall I continue?"
- "Would you like me to..."
- Any question asking for permission

**REQUIRED:**
- Process all pending flags
- Make decisions and act
- Report summary when done

---

**BEGIN:** Get pending flags and start fixing.
`;
}

/**
 * Spawn Phrase Fixer agent (Opus)
 */
async function spawnPhraseFixer(options, agentId = 1) {
  const {
    courseCode,
    terminal = 'iterm',
    workingDir = DASHBOARD_ROOT
  } = options;

  console.log(`\n🔧 Spawning Phrase Fixer Agent (Opus)`);
  console.log(`   Course: ${courseCode}`);
  console.log(`   Terminal: ${terminal}`);
  console.log(`   Model: opus`);

  const brief = generatePhraseFixerBrief({ courseCode });

  // Save brief for reference
  const briefPath = path.join(workingDir, 'temp', `phrase-fixer-brief-${courseCode}.md`);
  await fs.ensureDir(path.dirname(briefPath));
  await fs.writeFile(briefPath, brief, 'utf8');
  console.log(`   Brief saved: ${briefPath}`);

  if (terminal === 'terminal') {
    return await spawnClaudeTerminalAgent(brief, agentId, {
      model: 'opus',
      workingDir,
      skipPermissions: true
    });
  } else {
    return await spawnClaudeCliAgent(brief, agentId, {
      model: 'opus',
      workingDir,
      skipPermissions: true
    });
  }
}

/**
 * Generate the Phrase Polisher brief for Opus high-quality pass
 */
function generatePhrasePolisherBrief(options) {
  const {
    courseCode,
    roundLimit = 50,
    builderApiUrl = COURSE_BUILDER_API
  } = options;

  return `# Phrase Polisher - Opus Elegance Pass

You perform a high-quality polish of the first ${roundLimit} rounds. Your goal: make the content **smooth as a badger** - elegant, natural, error-free.

## Course: ${courseCode}

---

## Your Mission

The first ${roundLimit} LEGOs/rounds are the learner's first impression. They MUST be flawless:
- Perfect grammar in BOTH languages
- Natural, native-sounding phrases
- Smooth flow for audio playback
- Consistent vocabulary (no new words introduced)

---

## CRITICAL CONSTRAINTS

**CORRECTIONS ONLY:**
- Fix errors, don't add content
- No new vocabulary - use only words already introduced
- No elaboration or expansion
- If a fix requires new words, SKIP IT

**FOCUS ON:**
- BUILD phrases (practice drilling)
- USE phrases (complete sentences)
- LEGOs themselves (the canonical forms)
- Seeds (the source translations)

---

## Workflow

### 1. Get Phrases for First ${roundLimit} LEGOs

\`\`\`bash
# Get all BUILD and USE phrases from the first ~20 seeds (≈ ${roundLimit} LEGOs)
curl -s "${builderApiUrl}/api/phrases/${courseCode}?seed_min=1&seed_max=20&limit=2000" | jq '.phrases[] | select(.phrase_role == "use" or .phrase_role == "practice") | {id, seed: .seed_number, role: .phrase_role, en: .known_text, fr: .target_text}'
\`\`\`

### 2. Review Each Phrase

For each phrase, check:

**English:**
- Grammar correct?
- Natural phrasing?
- No awkward constructions?

**Target Language:**
- Conjugations correct?
- Word order natural?
- Prepositions/articles correct?
- Elisions applied? (parce que + vowel → parce qu')

**Translation:**
- Meaning preserved?
- Nothing lost or added?

### 3. Apply Fixes

\`\`\`bash
curl -X PATCH "${builderApiUrl}/api/phrases/{phrase_id}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "known_text": "corrected English",
    "target_text": "corrected target"
  }'
\`\`\`

### 4. Check LEGOs Too

If you find issues in a phrase, check the source LEGO:

\`\`\`javascript
// Use Node to check/fix LEGOs directly in Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Query LEGO
const { data } = await supabase
  .from('course_legos')
  .select('*')
  .eq('course_code', '${courseCode}')
  .eq('seed_number', SEED_NUM)
  .eq('lego_index', LEGO_IDX);

// Update if needed
await supabase
  .from('course_legos')
  .update({ target_text: 'corrected', components: [...] })
  .eq('lego_id', 'S0XXXLnn');
\`\`\`

### 5. Check Seeds if LEGO is Wrong

If a LEGO is wrong, the seed might be wrong too:

\`\`\`javascript
// Query and fix seed
await supabase
  .from('course_seeds')
  .update({ target_text: 'corrected' })
  .eq('course_code', '${courseCode}')
  .eq('seed_number', SEED_NUM);
\`\`\`

---

## Common Issues to Polish

1. **Elision errors**: "parce que il" → "parce qu'il"
2. **Preposition errors**: "expliquer avec toi" → "t'expliquer"
3. **Gender agreement**: "elle est silencieux" → "silencieuse"
4. **Verb conjugation**: "elle voulais" → "elle voulait"
5. **English awkwardness**: "be able remembering" → "be able to remember"
6. **Word order**: "parler mieux français" → "mieux parler français"
7. **Missing articles/prepositions**: "sûr ce qui" → "sûr de ce qui"

---

## AUTONOMOUS OPERATION

**FORBIDDEN:**
- Asking permission
- Waiting for approval
- "Shall I continue?"

**REQUIRED:**
- Process all ${roundLimit} rounds systematically
- Fix what you find
- Report summary when done

---

## Success Criteria

When done, the first ${roundLimit} rounds should be:
- ✅ Grammatically perfect in both languages
- ✅ Natural-sounding to native speakers
- ✅ Smooth for audio playback
- ✅ Consistent (no ZUT conflicts)

---

**BEGIN:** Fetch phrases from seeds 1-20, review systematically, fix issues.
`;
}

/**
 * Spawn Phrase Polisher agent (Opus) - high-quality pass on first 50 rounds
 */
async function spawnPhrasePolisher(options, agentId = 1) {
  const {
    courseCode,
    roundLimit = 50,
    terminal = 'iterm',
    workingDir = DASHBOARD_ROOT
  } = options;

  console.log(`\n✨ Spawning Phrase Polisher Agent (Opus)`);
  console.log(`   Course: ${courseCode}`);
  console.log(`   Rounds: First ${roundLimit}`);
  console.log(`   Terminal: ${terminal}`);
  console.log(`   Model: opus`);

  const brief = generatePhrasePolisherBrief({ courseCode, roundLimit });

  // Save brief for reference
  const briefPath = path.join(workingDir, 'temp', `phrase-polisher-brief-${courseCode}.md`);
  await fs.ensureDir(path.dirname(briefPath));
  await fs.writeFile(briefPath, brief, 'utf8');
  console.log(`   Brief saved: ${briefPath}`);

  if (terminal === 'terminal') {
    return await spawnClaudeTerminalAgent(brief, agentId, {
      model: 'opus',
      workingDir,
      skipPermissions: true
    });
  } else {
    return await spawnClaudeCliAgent(brief, agentId, {
      model: 'opus',
      workingDir,
      skipPermissions: true
    });
  }
}

module.exports = {
  spawnCourseBuilder,
  generateCourseBuilderBrief,
  spawnPhraseMonitor,
  generatePhraseMonitorBrief,
  spawnBuildWithMonitor,
  spawnPhraseAuditor,
  generatePhraseAuditorBrief,
  spawnPhraseFixer,
  generatePhraseFixerBrief,
  spawnPhrasePolisher,
  generatePhrasePolisherBrief
};
