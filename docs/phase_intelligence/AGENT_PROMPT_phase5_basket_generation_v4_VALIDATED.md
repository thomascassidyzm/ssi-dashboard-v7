# AGENT PROMPT: Phase 5 Basket Generation v4.0 (VALIDATED)

**Version**: 4.0 (Self-Validating Agent)
**Status**: Production Ready with Quality Gates
**Purpose**: Generate high-quality practice phrase baskets with strict GATE compliance AND mandatory self-validation

---

## YOUR MISSION

You are a Spanish language learning content creator. Generate 10 EXCELLENT practice phrases per LEGO for your assigned seeds, following strict quality requirements and validating your own output before submission.

**CRITICAL**: You will validate your output against format and quality gates. DO NOT submit unvalidated output.

---

## MANDATORY OUTPUT FORMAT

**File Location**: `batch_output/agent_XX_baskets.json`

**Structure** (DO NOT DEVIATE):

```json
{
  "version": "curated_v6_molecular_lego",
  "agent_id": XX,
  "seed_range": "S0XXX-S0YYY",
  "total_seeds": 20,
  "validation_status": "PASSED",
  "validated_at": "2025-11-07T12:00:00.000Z",
  "seeds": {
    "S0XXX": {
      "seed": "S0XXX",
      "seed_pair": {
        "known": "English sentence here",
        "target": "Spanish sentence here"
      },
      "cumulative_legos": 123,
      "legos": {
        "S0XXXL01": {
          "lego": ["English", "Spanish"],
          "type": "M",
          "available_legos": 122,
          "practice_phrases": [
            ["English phrase", "Spanish phrase", null, 1],
            ["English phrase", "Spanish phrase", null, 2],
            ["English phrase", "Spanish phrase", null, 3],
            ["English phrase", "Spanish phrase", null, 3],
            ["English phrase", "Spanish phrase", null, 4],
            ["English phrase", "Spanish phrase", null, 5],
            ["English phrase", "Spanish phrase", null, 6],
            ["English phrase", "Spanish phrase", null, 7],
            ["English phrase", "Spanish phrase", null, 8],
            ["Complete seed sentence", "Complete seed in Spanish", null, 6]
          ],
          "phrase_distribution": {
            "really_short_1_2": 2,
            "quite_short_3": 2,
            "longer_4_5": 2,
            "long_6_plus": 4
          },
          "gate_compliance": "STRICT - All words from taught LEGOs only"
        }
      }
    }
  }
}
```

---

## THE THREE SACRED RULES

### 1. GATE COMPLIANCE (Zero Tolerance)

**CRITICAL**: Every Spanish word must be the EXACT form taught in LEGOs.

**❌ NO conjugations allowed**:
- If "hablar" was taught, only use "hablar"
- If "estoy" was taught, you CANNOT use "está" or "están"
- If "quiero" was taught, you CANNOT use "quiere" or "quieres"

**How to build your whitelist**:
1. Load the LEGO registry for your seed range
2. Extract exact Spanish text from ALL taught LEGOs (S0001 through current SEED)
3. Split multi-word LEGOs into individual words
4. Include ONLY those exact forms

**Example**:
```
Taught LEGOs through S0002:
- "quiero" (I want)
- "hablar" (to speak)
- "español" (Spanish)
- "contigo" (with you)

Whitelist: [quiero, hablar, español, contigo]

✓ "Quiero hablar español contigo" (all exact forms)
❌ "Quieres hablar español" (quieres not taught)
```

**Zero tolerance**: One untaught form = reject phrase immediately and generate replacement.

---

### 2. COMPLETENESS (Context Dependent)

**First 2 phrases (short, 1-2 LEGOs)**: Fragments OK
- Purpose: Show learner how new LEGO fits in
- Examples: "to speak", "Spanish", "with you"

**Remaining 8 phrases**: Must be complete standalone thoughts
- Must make sense without additional context
- No incomplete constructions

**Examples**:
```
❌ "to be able to" (incomplete - to be able to WHAT?)
✓ "I want to be able to speak" (complete thought)

❌ "después de que" (incomplete - requires verb clause)
✓ "después de que termines" (complete construction)
```

---

### 3. NATURALNESS (Would-Say Test)

**Would a real person actually say this in both English AND Spanish?**

- Natural grammar and word order in BOTH languages
- Not clunky or forced
- Something useful in conversation
- Quality over quantity - better 8 great phrases than 10 with 2 weak ones

**CRITICAL for English**:
- Gerund-only verbs: "enjoy speaking" NOT "enjoy to speak"
- "finish speaking" NOT "finish to speak"
- "keep speaking" NOT "keep to speak"

**Examples**:
```
❌ "I want Spanish" (unnatural, low value)
✓ "I want to learn Spanish" (natural, useful)

❌ "I enjoy to speak Spanish" (wrong grammar)
✓ "I enjoy speaking Spanish" (correct gerund)
```

---

## PHRASE DISTRIBUTION (per 10 phrases)

**MANDATORY**: Each LEGO must have exactly this distribution:

- **2 short** (1-2 LEGOs) - building blocks, **fragments OK**
- **2 quite short** (3 LEGOs) - simple patterns, complete thoughts
- **2 longer** (4-5 LEGOs) - pattern combinations, complete thoughts
- **4 long** (6+ LEGOs, avg 7-10 words) - conversational gold ⭐

---

## SPECIAL REQUIREMENTS

### Conjunctions
**CRITICAL**: Conjunctions are only available WHEN they've been taught as LEGOs.

- Check registry for each conjunction (si, y, pero, porque, cuando)
- Only use if taught before current LEGO
- Once available: 2-4 phrases per 10 (20-40% usage)

### Final LEGO Rule
**Last phrase of final LEGO MUST be the complete seed sentence**

This confirms the full seed is achievable with taught LEGOs only.

### Recency Priority
- Prioritize vocabulary from 5 previous seeds
- Prioritize patterns from 5 previous seeds
- Makes content feel fresh as course progresses

---

## MANDATORY SELF-VALIDATION

**Before saving your output, you MUST run these validation gates:**

### GATE 1: Format Validation ✅

```javascript
// Check 1: File structure
if (!data.seeds) throw new Error("Missing 'seeds' key at root");
if (!data.agent_id) throw new Error("Missing 'agent_id'");
if (!data.validation_status) throw new Error("Missing 'validation_status'");

// Check 2: Seed count
const seedIds = Object.keys(data.seeds);
if (seedIds.length !== 20) {
  throw new Error(`Expected 20 seeds, got ${seedIds.length}`);
}

// Check 3: Each seed structure
for (const seedId of seedIds) {
  const seed = data.seeds[seedId];
  if (!seed.seed_pair) throw new Error(`${seedId}: Missing seed_pair`);
  if (!seed.legos) throw new Error(`${seedId}: Missing legos`);

  // Check 4: Each LEGO structure
  for (const legoId in seed.legos) {
    const lego = seed.legos[legoId];
    if (!lego.practice_phrases) {
      throw new Error(`${legoId}: Missing practice_phrases`);
    }
    if (lego.practice_phrases.length !== 10) {
      throw new Error(`${legoId}: Expected 10 phrases, got ${lego.practice_phrases.length}`);
    }
    if (!lego.phrase_distribution) {
      throw new Error(`${legoId}: Missing phrase_distribution`);
    }
  }
}

console.log("✅ GATE 1: Format validation PASSED");
```

### GATE 2: Quality Validation 🎯

```javascript
// Load registry and build whitelist
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

let gateViolations = [];
let distributionErrors = [];
let completenessWarnings = [];

for (const seedId of seedIds) {
  const seed = data.seeds[seedId];

  // Build whitelist for this seed (all LEGOs up to here)
  const whitelist = buildWhitelistUpTo(registry, seedId);

  for (const legoId in seed.legos) {
    const lego = seed.legos[legoId];

    // Check GATE compliance for each phrase
    for (let i = 0; i < lego.practice_phrases.length; i++) {
      const [english, spanish, pattern, count] = lego.practice_phrases[i];

      // Tokenize Spanish phrase
      const words = spanish.toLowerCase()
        .replace(/[¿?¡!,;:.()[\]{}]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 0);

      // Check every word against whitelist
      for (const word of words) {
        if (!whitelist.includes(word)) {
          gateViolations.push({
            lego: legoId,
            phrase: i + 1,
            word: word,
            spanish: spanish
          });
        }
      }

      // Check completeness (phrases 3-10 must be complete)
      if (i >= 2) {
        if (english.length < 15 || !english.match(/[.!?]?\s*$/)) {
          completenessWarnings.push({
            lego: legoId,
            phrase: i + 1,
            english: english
          });
        }
      }
    }

    // Check distribution (2-2-2-4)
    const dist = lego.phrase_distribution;
    if (dist.really_short_1_2 !== 2) {
      distributionErrors.push(`${legoId}: Short = ${dist.really_short_1_2}, expected 2`);
    }
    if (dist.quite_short_3 !== 2) {
      distributionErrors.push(`${legoId}: Quite short = ${dist.quite_short_3}, expected 2`);
    }
    if (dist.longer_4_5 !== 2) {
      distributionErrors.push(`${legoId}: Longer = ${dist.longer_4_5}, expected 2`);
    }
    if (dist.long_6_plus !== 4) {
      distributionErrors.push(`${legoId}: Long = ${dist.long_6_plus}, expected 4`);
    }
  }

  // Check final seed sentence
  const legoIds = Object.keys(seed.legos).sort();
  const finalLego = seed.legos[legoIds[legoIds.length - 1]];
  const finalPhrase = finalLego.practice_phrases[9];
  const expectedSeed = seed.seed_pair.known;

  // Final phrase should match seed (allowing for punctuation differences)
  const finalText = finalPhrase[0].replace(/[.!?]/g, '').trim().toLowerCase();
  const seedText = expectedSeed.replace(/[.!?]/g, '').trim().toLowerCase();

  if (finalText !== seedText) {
    gateViolations.push({
      lego: legoIds[legoIds.length - 1],
      phrase: 10,
      error: "Final phrase must be complete seed sentence",
      expected: expectedSeed,
      got: finalPhrase[0]
    });
  }
}

// Report validation results
console.log('\n=== GATE 2: Quality Validation ===');
console.log(`GATE Violations: ${gateViolations.length}`);
console.log(`Distribution Errors: ${distributionErrors.length}`);
console.log(`Completeness Warnings: ${completenessWarnings.length}`);

if (gateViolations.length > 0) {
  console.log('\n❌ GATE VIOLATIONS (MUST FIX):');
  gateViolations.slice(0, 10).forEach(v => {
    console.log(`  ${v.lego} phrase ${v.phrase}: "${v.word}" not in whitelist`);
    console.log(`    Full phrase: "${v.spanish}"`);
  });
  if (gateViolations.length > 10) {
    console.log(`  ... and ${gateViolations.length - 10} more violations`);
  }
}

if (distributionErrors.length > 0) {
  console.log('\n⚠️  DISTRIBUTION ERRORS:');
  distributionErrors.slice(0, 5).forEach(e => console.log(`  ${e}`));
}

// PASS/FAIL decision
const validationPassed = (gateViolations.length === 0 && distributionErrors.length === 0);

if (validationPassed) {
  console.log('\n✅ GATE 2: Quality validation PASSED');
  return true;
} else {
  console.log('\n❌ GATE 2: Quality validation FAILED');
  console.log('\nACTION REQUIRED:');
  console.log('1. Fix all GATE violations (remove untaught words)');
  console.log('2. Fix distribution errors (adjust phrase counts)');
  console.log('3. Re-run validation');
  console.log('4. Repeat until ✅ PASSED');
  return false;
}
```

---

## WORKFLOW

### Phase 1: Generation (30-40 minutes)
1. Read your agent input file (contains 20 seeds with LEGOs)
2. Read the LEGO registry (for whitelist building)
3. For each seed (1-20):
   - For each LEGO in that seed:
     - Build whitelist (all LEGOs taught up to this point)
     - Generate 10-12 candidate phrases
     - Select best 10 that pass all quality checks
     - Ensure 2-2-2-4 distribution
     - Validate GATE compliance word-by-word
     - Final LEGO: include complete seed as last phrase

### Phase 2: Self-Validation (5-10 minutes)
1. Run GATE 1: Format Validation
   - If fails: fix structure issues, re-run
2. Run GATE 2: Quality Validation
   - If fails: fix GATE violations and distribution, re-run
3. Iterate until BOTH gates pass
4. Set `validation_status: "PASSED"` in output
5. Set `validated_at` timestamp

### Phase 3: Submission
1. Save validated output to `batch_output/agent_XX_baskets.json`
2. Report: "Agent XX complete: ✅ VALIDATED - 20 seeds, Y LEGOs, Z phrases"

---

## ERROR HANDLING

### If GATE Violations Found:
1. **Identify the untaught word** in the violation report
2. **Remove the entire phrase** containing the violation
3. **Generate a replacement phrase** using only whitelist words
4. **Re-validate** to ensure replacement is compliant
5. **Update phrase_distribution** counts if needed

### If Distribution Errors Found:
1. **Count current distribution** for the LEGO
2. **Identify which category is wrong** (short/quite short/longer/long)
3. **Adjust phrases** to meet 2-2-2-4 requirement
4. **Re-validate** distribution

### If Completeness Issues Found:
1. Review phrases 3-10 for completeness
2. Expand fragments into complete thoughts
3. Ensure natural grammar in both languages

---

## QUALITY CHECKLIST

Before marking `validation_status: "PASSED"`, verify:

- [ ] ✅ JSON is valid (no syntax errors)
- [ ] ✅ Structure matches template exactly
- [ ] ✅ All 20 seeds present
- [ ] ✅ Each seed has seed_pair and legos
- [ ] ✅ Each LEGO has exactly 10 practice_phrases
- [ ] ✅ Each phrase is [English, Spanish, pattern/null, count]
- [ ] ✅ Distribution is 2-2-2-4 for every LEGO
- [ ] ✅ ZERO GATE violations (all Spanish words in whitelist)
- [ ] ✅ First 2 phrases can be fragments
- [ ] ✅ Phrases 3-10 are complete thoughts
- [ ] ✅ Final phrase of final LEGO = complete seed sentence
- [ ] ✅ English grammar correct (gerunds where required)
- [ ] ✅ Both languages sound natural
- [ ] ✅ Recency priority applied (5 previous seeds)

**Only save if ALL boxes checked ✅**

---

## SUCCESS CRITERIA

A successful agent submission achieves:

- ✅ **100% GATE compliance** - zero violations
- ✅ **100% format compliance** - structure matches template
- ✅ **100% distribution compliance** - all LEGOs follow 2-2-2-4
- ✅ **Proper completeness** - fragments OK for first 2 only
- ✅ **100% natural language** - both English and Spanish
- ✅ **All 20 seeds complete** - no missing seeds
- ✅ **Self-validated** - both gates passed before submission
- ✅ **Final seeds included** - every seed ends with complete sentence

**This is "top dollar content" quality with validation proof.**

---

## EXAMPLE VALIDATION OUTPUT

```
=== AGENT 05 SELF-VALIDATION ===

Gate 1: Format validation...
✅ Structure valid
✅ 20 seeds present
✅ All seeds have required fields
✅ All LEGOs have 10 phrases
✅ GATE 1: Format validation PASSED

Gate 2: Quality validation...
Checking GATE compliance (word-by-word)...
Checking distribution (2-2-2-4)...
Checking completeness (phrases 3-10)...
Checking final seed sentences...

=== GATE 2: Quality Validation ===
GATE Violations: 0
Distribution Errors: 0
Completeness Warnings: 2

✅ GATE 2: Quality validation PASSED

=== VALIDATION REPORT ===
✅ ALL CHECKS PASSED
Agent 05 ready for submission

Output: batch_output/agent_05_baskets.json
Status: ✅ VALIDATED
Seeds: 20
LEGOs: 87
Phrases: 870
```

---

**END OF AGENT PROMPT v4.0**
