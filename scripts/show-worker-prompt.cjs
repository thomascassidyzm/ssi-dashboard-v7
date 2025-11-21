#!/usr/bin/env node

/**
 * Show what an actual worker prompt looks like
 */

const fs = require('fs');
const path = require('path');

// Simulate the current worker prompt structure
const ngrokUrl = 'https://your-ngrok-url.ngrok.app';
const courseCode = 'spa_for_eng';

const workerPrompt = `You are Phase 5 Worker 1. Generate practice baskets for your assigned LEGOs.

## STEP 1: READ THE METHODOLOGY

**MANDATORY:** Use WebFetch to fetch and READ the Phase 5 methodology document:

**WebFetch URL:** https://ssi-dashboard-v7.vercel.app/docs/phase_intelligence/phase_5_lego_baskets.md
**WebFetch Prompt:** Extract the complete Phase 5 basket generation methodology, including all generation rules, quality criteria, GATE compliance requirements, and validation checklist.

This document is your PRIMARY reference. All generation must follow this methodology exactly.

## STEP 2: YOUR ASSIGNMENT

**LEGOs:** S0121L01, S0121L02, S0121L03, S0121L04, S0121L05

## STEP 3: GENERATION WORKFLOW (FOR EACH LEGO)

For each LEGO, follow this exact workflow:

### 3.1 Fetch Scaffold
**WebFetch URL:** ${ngrokUrl}/phase5/scaffold/${courseCode}/[LEGO_ID]
**WebFetch Prompt:** Extract the LEGO, available vocabulary, and generation context

### 3.2 Generate 10 Practice Phrases
Follow the methodology doc you just read. Each phrase must:
- **CONTAIN THE COMPLETE LEGO** (not building toward it, building FROM it)
- Use only vocabulary from the scaffold's available vocabulary
- Be natural and grammatically correct in both languages
- Follow progressive complexity (2-2-2-4 distribution)

### 3.3 VALIDATE EACH PHRASE
**For each of the 10 phrases, check:**

1. ✅ **Does it contain the COMPLETE LEGO?**
   - Phrase 1 must already have the full LEGO
   - All other phrases must also contain the full LEGO
   - NOT building up TO the LEGO (e.g., "we need" → "we don't need" → "we don't need to feel")
   - YES building FROM the LEGO (e.g., "we don't need to feel" → "we don't need to feel bad")

2. ✅ **GATE Compliance: Does it only use available vocabulary?**
   - Check every word against the scaffold's available vocabulary list
   - If ANY word is not in the list, the phrase FAILS

3. ✅ **Is it grammatically correct in BOTH languages?**
   - Check English grammar
   - Check target language grammar (conjugations, gender, etc.)

### 3.4 REGENERATE FAILURES
**If ANY phrase fails ANY check:**
- DELETE that phrase
- Generate a NEW phrase that passes all checks
- Re-validate the new phrase

**Repeat until ALL 10 phrases pass ALL checks.**

## STEP 4: OUTPUT FORMAT

\`\`\`json
{
  "courseCode": "${courseCode}",
  "seed": "S0121",
  "baskets": {
    "S0121L01": {
      "lego": {
        "known": "it's unusual that",
        "target": "es inusual que"
      },
      "practice_phrases": [
        { "known": "...", "target": "..." },
        ...
      ]
    }
  },
  "stagingOnly": true
}
\`\`\`

## STEP 5: UPLOAD

**POST:** ${ngrokUrl}/phase5/upload-basket

Only upload when ALL baskets have passed validation.

## WORK SILENTLY

No verbose logs. Brief summary only when complete.`;

console.log('═'.repeat(80));
console.log('WORKER PROMPT (what the agent receives)');
console.log('═'.repeat(80));
console.log(workerPrompt);
console.log('\n\n');

// Now generate what the scaffold looks like
const { generateTextScaffold } = require('../services/phases/generate-text-scaffold.cjs');

// Load lego_pairs
const legoPairsPath = path.join(__dirname, '../public/vfs/courses/spa_for_eng/lego_pairs.json');
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// Load scaffold
const scaffoldPath = path.join(__dirname, '../public/vfs/courses/spa_for_eng/phase5_scaffolds/seed_s0121.json');
const scaffold = JSON.parse(fs.readFileSync(scaffoldPath, 'utf8'));

// Generate text scaffold for S0121L01
const legoData = scaffold.legos['S0121L01'];
const textScaffold = generateTextScaffold(
  {
    legoId: 'S0121L01',
    seed: 'S0121',
    known: legoData.lego[0],
    target: legoData.lego[1],
    type: legoData.type
  },
  legoPairs,
  scaffold
);

console.log('═'.repeat(80));
console.log('SCAFFOLD (what WebFetch returns for S0121L01)');
console.log('═'.repeat(80));
console.log(textScaffold);
console.log('\n\n');

console.log('═'.repeat(80));
console.log('METHODOLOGY DOC EXCERPT (what WebFetch returns from docs)');
console.log('═'.repeat(80));
console.log(`
## 📋 INPUT: SCAFFOLD STRUCTURE

\`\`\`json
{
  "version": "curated_v7_generic",
  "seed_id": "S0362",
  "generation_stage": "SCAFFOLD_READY_FOR_PHRASE_GENERATION",
  "seed_pair": {
    "known": "No he was rather quiet after you left.",
    "target": "No él estaba bastante callado después de que te fuiste."
  },
  "recent_context": {
    "S0357": {
      "sentence": [
        "no | ella solo quería | solo quería | quería enviarle | enviarle un mensaje | un mensaje",
        "No | she just wanted | just wanted | wanted to send her | send her a message | a message"
      ],
      "new_legos": [
        ["S0357L01", "she", "ella"],
        ["S0357L02", "just wanted", "solo quería"],
        ["S0357L03", "wanted to send her", "quería enviarle"],
        ["S0357L04", "send her a message", "enviarle un mensaje"]
      ]
    },
    // ... more seeds
  },
  "legos": {
    "S0362L01": {
      "lego": {"known": "No", "target": "No"},
      "practice_phrases": []             // ← YOU FILL THIS (up to 10 phrases)
    }
  }
}
\`\`\`

## 🔑 KEY PRINCIPLE: MEANINGFUL UTTERANCES FIRST

Practice phrases are opportunities for learners to PRACTICE SAYING THE LEGO.

Each practice phrase MUST contain the complete LEGO you're teaching.

[...rest of methodology doc...]
`);

console.log('\n\n');
console.log('═'.repeat(80));
console.log('THE PROBLEM:');
console.log('═'.repeat(80));
console.log(`
1. Worker reads methodology doc expecting scaffold structure like:
   {
     "recent_context": {
       "S0357": {
         "sentence": ["piped | format", "Piped | Format"],
         "new_legos": [["S0357L01", "she", "ella"]]
       }
     }
   }

2. Worker fetches scaffold and gets simple list format:
   10 Most Recent Seed Sentences:
     - S0120: "It's interesting..." → "Es interesante..."

   30 Most Recent LEGOs:
     - S0120L06: "it's interesting that you like" → "es interesante que te guste"

3. Worker gets CONFUSED by the mismatch and either:
   - Ignores the scaffold vocabulary completely
   - Treats it as irrelevant context
   - Generates random phrases without checking GATE compliance

4. Result: 66% of LEGOs fail to have phrases containing the LEGO
`);
