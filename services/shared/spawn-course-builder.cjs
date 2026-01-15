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

## Full Documentation
Read the complete API spec: \`apml/services/course-builder-api.apml\`

## Golden Path: POST /api/seed/complete

Submit complete seeds atomically - translate, decompose into LEGOs, generate phrases, submit in ONE request.

\`\`\`javascript
// GOLDEN PATH: Submit entire seed at once
fetch('${builderApiUrl}/api/seed/complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    course_code: '${courseCode}',
    seed_number: 42,
    known_text: 'I want to learn Chinese',
    target_text: '我想学中文',
    legos: [
      {
        idx: 1,
        type: 'A',
        known: 'I',
        target: '我',
        phrases: [
          { known: 'I speak', target: '我说' },
          { known: 'I understand', target: '我明白' }
          // ... 10 total phrases
        ]
      },
      {
        idx: 2,
        type: 'M',
        known: 'want to learn',
        target: '想学',
        components: [
          { known: 'want', target: '想' },
          { known: 'learn', target: '学' }
        ],
        phrases: [
          { known: 'I want to learn', target: '我想学' },
          { known: 'want to learn Chinese', target: '想学中文' }
          // ... 10 total phrases
        ]
      },
      {
        idx: 3,
        type: 'A',
        known: 'Chinese',
        target: '中文',
        phrases: [
          { known: 'speak Chinese', target: '说中文' },
          { known: 'learn Chinese', target: '学中文' }
          // ... 10 total phrases
        ]
      }
    ]
  })
});
\`\`\`

**All-or-nothing**: If any validation fails, nothing is inserted. Fix and resubmit.

## HOW TO WORK - THIS IS CRITICAL

**You are an LLM. This is a LANGUAGE task, not a programming task.**

Your superpower is linguistics - translation, decomposition, generating natural phrases.
Use that. Don't write code. Don't automate. Do the language work directly.

For each seed:
1. Think through the translation and LEGO decomposition
2. Use Bash with \`curl\` to call the API directly
3. Move to the next seed

Example:
\`\`\`bash
curl -X POST ${builderApiUrl}/api/seed/complete \\
  -H "Content-Type: application/json" \\
  -d '{"course_code":"${courseCode}","seed_number":1,...}'
\`\`\`

**NEVER:**
- Write .js/.cjs/.py files
- Create "batch processors"
- Automate with scripts

**ALWAYS:**
- Call the API directly via curl
- Do the linguistic work yourself
- Process seeds one at a time

## QUALITY BAR - THIS IS CRITICAL

### No Lazy Shortcuts
- **DO NOT** make the whole sentence one giant LEGO
- **DO NOT** use meaningless components like "that" → "..."
- **DO** break sentences into proper granular, reusable units
- **DO** ensure each LEGO combines meaningfully with others

### Proper Decomposition
- A-type LEGOs: Single meaningful words
- M-type LEGOs: Multi-word phrases with meaningful components
- Components must be real vocabulary, not placeholders

### Phrase Quality
- Target 10 natural, useful phrases per LEGO
- Include variety: short (3-5 syllables) AND long (10+ syllables)
- Long phrases (10+ syllables) are essential for ETERNAL spaced repetition
- Each LEGO needs 2-3 long phrases minimum

## What the API Does Automatically

- **M-LEGO Build-up**: Auto-generates component→LEGO→phrases structure
- **Duplicate Detection**: Same known+target = is_new:false (no redundant baskets)
- **ZUT Conflict Detection**: Same known→different target = REJECTED with suggestions
- **Vocabulary Validation**: Phrases using unknown vocab = REJECTED
- **Particle Handling**: Chinese particles (了,着,过,etc.) skipped in build-up

## PARTICLES ARE LEARNED IN CONTEXT

Particles like 吗, 呢, 了, 着, 的 are learned through M-LEGO build-up, not as explicit vocabulary.

**How particles get introduced:**
\`\`\`json
{
  "type": "M",
  "known": "Is it good?",
  "target": "好吗",
  "components": [
    {"known": "good", "target": "好"}
  ]
}
\`\`\`

Build-up teaches: "good" → "好", then "Is it good?" → "好吗"
The learner infers the particle 吗 from context (it makes questions).

**Don't avoid particles** - use them naturally in M-LEGOs. The build-up teaches them.

**You provide**: translation, decomposition, practice phrases
**API handles**: build-up generation, validation, deduplication

${languageBrief ? `## Language Brief\n\n${languageBrief}` : ''}

## Seed Source

Fetch canonical seeds: \`GET ${builderApiUrl}/api/seeds?limit=${seedCount}\`

Each seed has \`source_text\` with \`{target}\` placeholder. Replace with "${targetLang || targetCode}".

## Workflow

1. \`GET /api/stats/${courseCode}\` - check existing progress
2. Continue from next incomplete seed (don't restart from 1)
3. Work in batches of 30 seeds
4. For each seed:
   - Translate to ${targetLang || targetCode}
   - Decompose into proper granular LEGOs (NOT one big chunk)
   - Generate 10 practice phrases per LEGO
   - Submit via \`POST /api/seed/complete\`
5. On error: fix based on error message, resubmit
6. After batch: continue to next batch until all ${seedCount} seeds done

## Recovery (Context Compaction)

If interrupted or context compacts:
1. Read \`apml/services/course-builder-api.apml\` for full docs
2. \`GET /api/stats/${courseCode}\` - see current progress
3. Continue from next incomplete seed
4. **Database is the state** - no external tracking needed

## Endpoints

| Endpoint | Purpose |
|----------|---------|
| \`POST /api/seed/complete\` | **GOLDEN PATH** - atomic seed submission |
| \`GET /api/stats/${courseCode}\` | Progress: seeds, LEGOs, phrases, ratio |
| \`GET /api/seeds?limit=N\` | Fetch canonical English seeds |
| \`GET /api/vocab/${courseCode}\` | Current vocabulary (debugging) |

---

**BEGIN**: Build the course now. Process all ${seedCount} seeds. Don't stop until done.
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
