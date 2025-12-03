#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * LLM-based Grammar Validator for Phase 5 Practice Baskets
 *
 * Validates grammar quality in both English and Spanish for practice phrases
 * Focus: First 100 seeds with HIGH STANDARDS
 *
 * Usage: node validate_grammar_llm.cjs [start_seed] [end_seed]
 * Example: node validate_grammar_llm.cjs 1 100
 */

const PHASE5_DIR = path.join(__dirname, '../public/vfs/courses/spa_for_eng/phase5_outputs');
const OUTPUT_DIR = path.join(__dirname, '../public/vfs/courses/spa_for_eng');

const startSeed = parseInt(process.argv[2]) || 1;
const endSeed = parseInt(process.argv[3]) || 100;

console.log(`📝 Grammar Validation (LLM-based)`);
console.log(`   Range: S${String(startSeed).padStart(4, '0')} - S${String(endSeed).padStart(4, '0')}\n`);

// Collect all phrases from seeds
const phrasesToValidate = [];

for (let i = startSeed; i <= endSeed; i++) {
  const seedId = `S${String(i).padStart(4, '0')}`;
  const filePath = path.join(PHASE5_DIR, `seed_s${String(i).padStart(4, '0')}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`⊘ ${seedId}: No basket found (skipping)`);
    continue;
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!data.legos) continue;

    for (const [legoId, lego] of Object.entries(data.legos)) {
      if (!lego.practice_phrases || !Array.isArray(lego.practice_phrases)) continue;

      for (const phrase of lego.practice_phrases) {
        const [english, spanish] = phrase;
        if (english && spanish) {
          phrasesToValidate.push({
            seed_id: seedId,
            lego_id: legoId,
            english,
            spanish
          });
        }
      }
    }
  } catch (error) {
    console.error(`✗ Error reading ${seedId}:`, error.message);
  }
}

console.log(`Found ${phrasesToValidate.length} phrases to validate\n`);

if (phrasesToValidate.length === 0) {
  console.log('No phrases to validate');
  process.exit(0);
}

// Create validation prompt for Claude
const validationPrompt = `You are a bilingual grammar expert in English and Spanish. Your task is to validate the grammatical correctness of practice phrases for a language learning course.

CRITICAL STANDARDS (First 100 seeds require EXCELLENCE):
1. Perfect grammar in BOTH English and Spanish
2. Natural, native-speaker phrasing
3. Accurate translations (not word-for-word, but meaning-accurate)
4. Appropriate formality level (informal "you" = tú)
5. No awkward or unnatural constructions

For each phrase, identify:
- Grammar errors in English
- Grammar errors in Spanish
- Translation mismatches
- Unnatural phrasing

Review these ${phrasesToValidate.length} phrases and report ANY issues found:

${phrasesToValidate.slice(0, 50).map((p, i) =>
  `${i + 1}. [${p.seed_id}:${p.lego_id}]
   EN: "${p.english}"
   ES: "${p.spanish}"`
).join('\n\n')}

${phrasesToValidate.length > 50 ? `\n... (${phrasesToValidate.length - 50} more phrases - continuing in next batch)` : ''}

Format your response as JSON:
{
  "issues": [
    {
      "seed_id": "S0001",
      "lego_id": "S0001L03",
      "english": "phrase text",
      "spanish": "frase texto",
      "error_type": "grammar|translation|naturalness",
      "severity": "high|medium|low",
      "description": "Specific issue found",
      "suggestion": "Corrected version"
    }
  ],
  "summary": {
    "total_phrases": ${Math.min(phrasesToValidate.length, 50)},
    "issues_found": 0,
    "error_types": {},
    "overall_quality": "excellent|good|fair|poor"
  }
}`;

// Save prompt for manual review if needed
const promptPath = path.join(OUTPUT_DIR, 'grammar_validation_prompt.txt');
fs.writeFileSync(promptPath, validationPrompt, 'utf8');

console.log(`📄 Validation prompt saved to: ${promptPath}`);
console.log(`\n💡 Next steps:`);
console.log(`   1. Copy the prompt from the file above`);
console.log(`   2. Paste into Claude (claude.ai or API)`);
console.log(`   3. Review the JSON response for grammar issues`);
console.log(`\n🎯 High standards applied for first 100 seeds!`);

// Also create a batch file for all phrases
const batchData = {
  range: `S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')}`,
  total_phrases: phrasesToValidate.length,
  phrases: phrasesToValidate,
  validation_criteria: {
    grammar_accuracy: "perfect",
    translation_quality: "natural and accurate",
    formality_level: "informal (tú)",
    standards: "HIGHEST for seeds 1-100"
  }
};

const batchPath = path.join(OUTPUT_DIR, 'grammar_validation_batch.json');
fs.writeFileSync(batchPath, JSON.stringify(batchData, null, 2), 'utf8');

console.log(`\n📦 Full batch data saved to: ${batchPath}`);
console.log(`   (Contains all ${phrasesToValidate.length} phrases for programmatic validation)`);
