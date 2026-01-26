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

## Workflow

1. \`GET ${builderApiUrl}/api/stats/${courseCode}\` - check progress
2. \`GET ${builderApiUrl}/api/course/${courseCode}/translate?limit=${seedCount}\` - get seeds with English text
3. For each seed in the response: translate, decompose, generate phrases, submit via curl
4. On error: read the message, fix, resubmit

**The /translate endpoint returns:**
- \`canonical_english\`: The English seed text (with language name substituted)
- \`needs_target\`: true if you need to provide target language translation
- Seeds are pre-initialized in the database

**NEVER write scripts or batch processors. Do the linguistic work directly via curl.**

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
1. Invoke \`/ssi-learner-pattern\` to refresh the methodology
2. \`GET ${builderApiUrl}/api/stats/${courseCode}\` - see current progress
3. Continue from next incomplete seed
4. **Database is the state** - no external tracking needed

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
- All ${seedCount} seeds are complete
- Unrecoverable error after 3 retries on same seed (skip and continue)

---

**BEGIN**: Build the course now. Process all ${seedCount} seeds. DO NOT STOP UNTIL DONE.
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
  --model <name>        Claude model (default: opus)
  --known <lang>        Known language name (e.g., English)
  --target <lang>       Target language name (e.g., Chinese)

Examples:
  # Build Chinese course in iTerm2
  node spawn-course-builder.cjs --course zho_for_eng --seeds 30 --terminal iterm

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

  if (!courseCode) {
    console.error('Error: --course required');
    process.exit(1);
  }

  spawnCourseBuilder({
    courseCode,
    seedCount,
    terminal,
    model,
    knownLang,
    targetLang
  })
    .then(() => console.log('\n✓ Course Builder agent spawned'))
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}

module.exports = {
  spawnCourseBuilder,
  generateCourseBuilderBrief
};
