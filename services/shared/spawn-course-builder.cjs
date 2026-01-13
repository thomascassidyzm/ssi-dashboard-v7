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

## API Endpoint
Insert LEGOs and phrases via POST to: \`${builderApiUrl}/api/lego\`

\`\`\`javascript
// Example request
fetch('${builderApiUrl}/api/lego', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    course_code: '${courseCode}',
    seed: 1,           // Seed number
    idx: 1,            // LEGO index within seed
    type: 'M',         // A (atomic) or M (molecular)
    known: 'I want',   // Known language text
    target: '我想',    // Target language text
    components: [      // Required for M-type LEGOs
      { known: 'I', target: '我' },
      { known: 'want', target: '想' }
    ],
    phrases: [         // Practice phrases (10 per LEGO)
      { known: 'I want', target: '我想' },
      { known: 'I want to speak', target: '我想说' },
      // ... 10 total phrases
    ]
  })
});
\`\`\`

## CRITICAL RULES

### 1. Vocabulary Discipline (Zero Uncertainty)
- **Every phrase must ONLY use vocabulary already introduced**
- Characters/words in phrases must come from:
  - Previously introduced LEGOs
  - Components of the current M-type LEGO
- This is NON-NEGOTIABLE - learners must never see unknown vocabulary

### 2. M-type Components
- For languages with grammar particles (Chinese 着/得/的, etc.), use M-type LEGOs
- Components introduce new characters through exposure, not explanation
- Example: "trying to" → "试着" with components: ["try" → "试", "trying to" → "试着"]

### 3. Phrase Requirements
- Minimum 7 phrases per LEGO (after position 10)
- Target 10 phrases per LEGO
- Maximum 13 phrases per LEGO
- Early LEGOs (positions 1-10) can have fewer as vocabulary builds

### 4. Phrase Variety & DEBUT/ETERNAL Pattern
- Combine current LEGO with previously introduced LEGOs
- Include both short (3-5 syllables) and long (10+ syllables) phrases
- Build progressively longer combinations as vocabulary grows

**Why long phrases matter (DEBUT vs ETERNAL):**
- **DEBUT phase**: When a LEGO is first introduced, learner practices with SHORT phrases (building up)
- **ETERNAL phase**: Once mastered, LEGO enters spaced repetition using ONLY 10+ syllable phrases
- Long phrases prove fluency and prevent rote memorization
- Each LEGO needs at least 2-3 phrases with 10+ syllables for ETERNAL rotation

${languageBrief ? `## Language Brief\n\n${languageBrief}` : ''}

## Seed Source

**Seeds are in the database.** Query them from \`course_seeds\` table:

\`\`\`javascript
// Get seeds for this course (or use spa_for_eng as canonical English source)
const { data: seeds } = await supabase
  .from('course_seeds')
  .select('seed_number, known_text')
  .eq('course_code', 'spa_for_eng')  // Canonical English seeds
  .order('seed_number')
  .limit(${seedCount});

// Each seed has:
// - seed_number: 1, 2, 3...
// - known_text: "I want to speak Spanish with you now"
// Replace language name and translate to ${targetLang || targetCode}
\`\`\`

**Or fetch via API:** \`${builderApiUrl}/api/seeds/spa_for_eng?limit=${seedCount}\`

The English \`known_text\` is your source - translate it to ${targetLang || targetCode} and break into LEGOs.

## Process

1. **Check existing progress first**: \`GET /api/stats/${courseCode}\`
2. **Continue from last completed seed** (don't restart from 1 if work exists)
3. **Work in batches of 20-30 seeds** - don't try to load entire course into context
4. **For each seed**:
   - Break into LEGOs that tile in both languages
   - Use M-type for multi-word phrases or grammar patterns
   - Generate 10 practice phrases per LEGO (include 2-3 with 10+ syllables)
   - POST each LEGO to the API
5. **After each batch**: Check stats, verify ratio ≥7.0, then continue

## Recovery (If Interrupted)

If you get interrupted or need to resume:
1. \`GET /api/stats/${courseCode}\` - see current progress
2. \`GET /api/vocab/${courseCode}\` - see available vocabulary
3. Continue from the next seed after the last completed one
4. The API has full course state - you just need to continue building

## Quality Gates

The API **automatically validates** each LEGO and will REJECT submissions with:
- **Vocabulary violations**: Using characters/words not yet introduced
- **Insufficient phrases**: Fewer than required (position-dependent: 1-3 early, 7+ later)

**The API tracks vocabulary per-course.** Before each phrase is accepted, it checks:
1. Load all previously inserted LEGOs + their M-type components
2. Build vocab set from those
3. Add current LEGO's vocab (so phrases CAN use the new vocab)
4. Check each phrase only uses vocab in the set
5. REJECT with specific error if violation found

This enforces **Zero Uncertainty Test (ZUT)** - learners never see unknown vocabulary.

## Useful Endpoints

| Endpoint | Purpose |
|----------|---------|
| \`GET /api/stats/${courseCode}\` | Progress: LEGOs, phrases, ratio, vocab size |
| \`GET /api/vocab/${courseCode}\` | Current vocabulary set (for debugging) |
| \`POST /api/lego\` | Insert LEGO (validates vocab + phrase count) |

## Current Progress

Check progress at: \`${builderApiUrl}/api/stats/${courseCode}\`

---

**BEGIN**: Start building the course now. Process seeds sequentially, inserting LEGOs via the API.
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
