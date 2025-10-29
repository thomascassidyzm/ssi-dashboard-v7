#!/usr/bin/env node

/**
 * GATE Violation Regeneration Script
 *
 * Reads gate_violations.json and generates targeted regeneration prompts
 * for baskets that violated ABSOLUTE GATE constraint.
 *
 * Strategy:
 * - Group violations by basket
 * - For each basket, generate a focused regeneration prompt
 * - Prompt includes specific violations and allowed vocabulary
 * - Can run in batch mode or per-basket mode
 *
 * Usage: node validators/regenerate-gate-violations.cjs <course_code> [--basket BASKET_ID]
 */

const fs = require('fs-extra');
const path = require('path');

const args = process.argv.slice(2);
const courseCode = args[0];
const targetBasket = args.includes('--basket') ? args[args.indexOf('--basket') + 1] : null;

if (!courseCode) {
  console.error('❌ Usage: node validators/regenerate-gate-violations.cjs <course_code> [--basket BASKET_ID]');
  console.error('   Example: node validators/regenerate-gate-violations.cjs spa_for_eng_60seeds');
  console.error('   Example: node validators/regenerate-gate-violations.cjs spa_for_eng_60seeds --basket S0027L01');
  process.exit(1);
}

const courseDir = path.join(__dirname, '..', 'vfs', 'courses', courseCode);
const violationsPath = path.join(courseDir, 'gate_violations.json');
const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
const basketsPath = path.join(courseDir, 'lego_baskets.json');

/**
 * Build allowed vocabulary list for a given LEGO index
 */
function buildAllowedVocabulary(legoPairs, maxIndex) {
  const allowedLegos = [];
  let currentIndex = 0;

  for (const seed of legoPairs.seeds) {
    const [seedId, seedPair, legos] = seed;

    for (const lego of legos) {
      if (currentIndex < maxIndex) {
        const [legoId, type, target, known] = lego;
        allowedLegos.push({ legoId, index: currentIndex, target, known });
      }
      currentIndex++;
    }
  }

  return allowedLegos;
}

/**
 * Generate regeneration prompt for a specific basket
 */
function generateRegenerationPrompt(basketId, basketIndex, violations, legoPairs, baskets) {
  const allowedLegos = buildAllowedVocabulary(legoPairs, basketIndex);

  // Get current basket data
  const basket = baskets[basketId];
  const currentLego = allowedLegos.find(l => l.legoId === basketId);

  // Group violations by phrase
  const violationsByPhrase = {};
  for (const v of violations) {
    const phraseKey = v.phrase[0];
    if (!violationsByPhrase[phraseKey]) {
      violationsByPhrase[phraseKey] = {
        phrase: v.phrase,
        type: v.phraseType,
        violations: []
      };
    }
    violationsByPhrase[phraseKey].violations.push(...v.allViolations);
  }

  const violatingPhrases = Object.values(violationsByPhrase);

  const prompt = `# GATE Violation Fix: ${basketId}

## Context

**Basket**: ${basketId} at LEGO index **${basketIndex}**
**Current LEGO**: ["${currentLego?.target || 'N/A'}", "${currentLego?.known || 'N/A'}"]

**Problem**: This basket contains ${violatingPhrases.length} phrase(s) that violate ABSOLUTE GATE by using vocabulary not yet introduced to learners.

---

## Violations Found

${violatingPhrases.map((vp, i) => `
### Violation ${i + 1} (${vp.type}-phrase):
**Phrase**: "${vp.phrase[0]}" | "${vp.phrase[1]}"

**Unauthorized words**:
${vp.violations.map(v => `- "${v.word}" from ${v.wordLegoId} [index ${v.wordIndex}] - ${v.gap} LEGOs ahead`).join('\n')}
`).join('\n')}

---

## Your Task

**Regenerate ONLY the ${violatingPhrases.length} violating phrase(s)** with GATE-compliant alternatives.

### Allowed Vocabulary (LEGOs 0-${basketIndex - 1}):

Total allowed LEGOs: ${allowedLegos.length}

**All allowed target words**:
${[...new Set(allowedLegos.map(l => l.target))].slice(0, 100).join(', ')}${allowedLegos.length > 100 ? ', ...' : ''}

### Verification Steps (MANDATORY):

For EACH replacement phrase:
1. Split target phrase into words
2. Check EVERY word exists in allowed vocabulary above
3. Verify index of each word's LEGO < ${basketIndex}
4. If ANY word fails → try different phrase
5. Ensure perfect grammar in BOTH languages

### Replacement Requirements:

- Maintain phrase type (e-phrase stays e-phrase, d-phrase stays d-phrase)
- Keep similar semantic meaning if possible
- Perfect grammar in both languages
- Natural, pedagogically useful phrases
- **ZERO unauthorized vocabulary**

---

## Current Basket Structure

\`\`\`json
${JSON.stringify(basket, null, 2)}
\`\`\`

---

## Output Format

Provide the complete regenerated basket in v7.7 format:

\`\`\`json
{
  "${basketId}": {
    "lego": ["${currentLego?.target || ''}", "${currentLego?.known || ''}"],
    "e": [
      // Regenerated e-phrases (replace violating ones, keep valid ones)
    ],
    "d": {
      // Regenerated d-phrases (replace violating ones, keep valid ones)
    }
  }
}
\`\`\`

**Verify**: Run validate-gate-compliance.cjs on regenerated basket before submitting!
`;

  return prompt;
}

/**
 * Main regeneration function
 */
async function regenerateViolations() {
  console.log(`\n🔧 GATE Violation Regeneration`);
  console.log(`Course: ${courseCode}\n`);

  // Load violations
  if (!await fs.pathExists(violationsPath)) {
    console.error(`❌ Violations file not found: ${violationsPath}`);
    console.error(`   Run validate-gate-compliance.cjs first to generate violations report`);
    process.exit(1);
  }

  const violationsData = await fs.readJson(violationsPath);
  console.log(`📂 Loaded violations from: gate_violations.json`);
  console.log(`   Total violations: ${violationsData.summary.violations}`);
  console.log(`   Affected baskets: ${violationsData.summary.affectedBaskets}\n`);

  // Load LEGO pairs
  const legoPairsData = await fs.readJson(legoPairsPath);

  // Load baskets
  const basketsData = await fs.readJson(basketsPath);
  const baskets = basketsData.baskets || basketsData;

  // Group violations by basket
  const violationsByBasket = {};
  for (const v of violationsData.violations) {
    if (!violationsByBasket[v.basketId]) {
      violationsByBasket[v.basketId] = [];
    }
    violationsByBasket[v.basketId].push(v);
  }

  // Filter to target basket if specified
  const basketsToProcess = targetBasket
    ? (violationsByBasket[targetBasket] ? [targetBasket] : [])
    : Object.keys(violationsByBasket).sort();

  if (basketsToProcess.length === 0) {
    if (targetBasket) {
      console.log(`✅ Basket ${targetBasket} has no violations!`);
    } else {
      console.log(`✅ No violations to regenerate!`);
    }
    process.exit(0);
  }

  console.log(`📝 Generating regeneration prompts for ${basketsToProcess.length} basket(s)...\n`);

  // Create output directory for prompts
  const promptsDir = path.join(courseDir, 'regeneration_prompts');
  await fs.ensureDir(promptsDir);

  // Generate prompts for each basket
  for (const basketId of basketsToProcess) {
    const violations = violationsByBasket[basketId];
    const basketIndex = violations[0].basketIndex;

    const prompt = generateRegenerationPrompt(
      basketId,
      basketIndex,
      violations,
      legoPairsData,
      baskets
    );

    const promptFile = path.join(promptsDir, `${basketId}_regenerate.md`);
    await fs.writeFile(promptFile, prompt, 'utf8');

    console.log(`✅ ${basketId}: ${violations.length} violation(s) → ${promptFile}`);
  }

  console.log(`\n📁 Regeneration prompts written to: ${promptsDir}/`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Review prompts in regeneration_prompts/`);
  console.log(`   2. Use prompts with Claude to regenerate baskets`);
  console.log(`   3. Update lego_baskets.json with regenerated baskets`);
  console.log(`   4. Re-run validate-gate-compliance.cjs to verify fixes\n`);
}

// Run regeneration
regenerateViolations().catch(err => {
  console.error('❌ Regeneration error:', err);
  process.exit(1);
});
