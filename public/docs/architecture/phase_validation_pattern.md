# Phase Validation Architecture Pattern

**Version**: 1.0 (2025-10-27)
**Status**: Foundational architecture for all SSi course generation

---

## Core Principle: AI as Operating System

**The Pattern:**
```
Generate → Validate → Pass → Next Phase
                   ↓ Fail
            Regenerate with Feedback → Validate → ...
```

Each generation phase focuses on **creating** outputs.
Each validation phase focuses on **checking** outputs.
Validation failures trigger **targeted regeneration** with explicit error feedback.

---

## The Architecture

### Generation Phases (X.0)
- **Phase 1**: Seed pair translation
- **Phase 3**: LEGO decomposition
- **Phase 5**: Basket generation

**Focus**: Quality generation using phase intelligence
**Output**: JSON data files
**Intelligence**: "How to create X well"

### Validation Phases (X.5)
- **Phase 1.5**: Translation quality validation
- **Phase 3.5**: LEGO tiling + FD validation
- **Phase 5.5**: Vocabulary constraint validation

**Focus**: Systematic checking against rules
**Output**: `{ valid: boolean, errors: [...], failedItems: [...] }`
**Intelligence**: "How to verify X is correct"

---

## Phase 1 → Phase 1.5 → Phase 3

### Phase 1: Seed Pair Translation
**Input**: Canonical seeds
**Output**: `seed_pairs.json`
**Intelligence**: Cognate preference, zero-variation, grammatical simplicity

### Phase 1.5: Translation Validation
**Input**: `seed_pairs.json`
**Checks**:
- ✓ Zero-variation compliance (one concept = one word)
- ✓ Cognate preference applied (seeds 1-100)
- ✓ Grammatical simplicity (no subjunctive in seeds 1-50)
- ✓ Natural, conversational phrasing
- ✓ Semantic accuracy

**Output**:
```json
{
  "valid": false,
  "errors": [
    {
      "type": "zero_variation_violation",
      "seedId": "S0012",
      "concept": "to speak",
      "expected": "hablar",
      "actual": "decir",
      "message": "Concept 'to speak' established as 'hablar' in S0001, but S0012 uses 'decir'"
    }
  ],
  "failedSeeds": ["S0012"]
}
```

**If valid**: Proceed to Phase 3
**If invalid**:
1. Pass `failedSeeds` + `errors` back to Phase 1
2. Phase 1 regenerates ONLY failed seeds with error context
3. Run Phase 1.5 again
4. Repeat until valid

---

## Phase 3 → Phase 3.5 → Phase 5

### Phase 3: LEGO Decomposition
**Input**: `seed_pairs.json`
**Output**: `lego_pairs.json`
**Intelligence**: Tiling first, FD compliance, feeder extraction, literal components

### Phase 3.5: LEGO Validation
**Input**: `lego_pairs.json`
**Checks**:
- ✓ **Tiling check**: LEGOs reconstruct seed exactly (FIRST CHECK)
- ✓ **Hard rules**: No auxiliaries alone, no unbonded articles, no negations alone
- ✓ **FD compliance**: Each LEGO deterministic (one input = one output)
- ✓ **Component translations**: Literal (not functional equivalents)
- ✓ **Feeder references**: All referenced LEGOs exist

**Output**:
```json
{
  "valid": false,
  "errors": [
    {
      "type": "tiling_failure",
      "seedId": "S0003",
      "seed": "cómo hablar lo más frecuentemente posible",
      "legosTile": "cómo lo más frecuentemente posible",
      "missing": ["hablar"],
      "message": "LEGOs don't tile to reconstruct seed - missing 'hablar'"
    },
    {
      "type": "unbonded_article",
      "seedId": "S0006",
      "legoId": "S0006L02",
      "lego": ["una", "a"],
      "message": "Gender-marked article 'una' must bond with noun"
    }
  ],
  "failedSeeds": ["S0003", "S0006"]
}
```

**If valid**: Proceed to Phase 5
**If invalid**:
1. Pass `failedSeeds` + `errors` back to Phase 3
2. Phase 3 regenerates ONLY failed seeds with error context
3. Run Phase 3.5 again
4. Repeat until valid

---

## Phase 5 → Phase 5.5 → Complete

### Phase 5: Basket Generation
**Input**: `lego_pairs.json`
**Output**: `lego_baskets.json`
**Intelligence**: Vocabulary constraint as ABSOLUTE GATE, E-phrase tiling, D-phrase expanding windows

### Phase 5.5: Basket Validation
**Input**: `lego_baskets.json` + `lego_pairs.json`
**Checks**:
- ✓ **Vocabulary constraint**: Each basket ONLY uses prior LEGOs (FIRST CHECK)
- ✓ **E-phrase tiling**: E-phrases tile from available LEGOs
- ✓ **D-phrase operative LEGO**: D-phrases contain the LEGO being taught
- ✓ **Culminating LEGO**: E-phrase #1 is complete seed
- ✓ **Grammar**: Perfect target + known language grammar

**Output**:
```json
{
  "valid": false,
  "errors": [
    {
      "type": "vocabulary_constraint_violation",
      "legoId": "S0001L02",
      "basketPosition": 2,
      "phrase": ["Quiero hablar español contigo mañana en casa", "..."],
      "violatingLego": "S0012L05",
      "violatingWord": "mañana",
      "message": "Basket S0001L02 (position 2) uses 'mañana' from S0012L05 (position 67)"
    }
  ],
  "failedLegos": ["S0001L02", "S0001L03"]
}
```

**If valid**: Course generation complete ✅
**If invalid**:
1. Pass `failedLegos` + `errors` back to Phase 5
2. Phase 5 regenerates ONLY failed baskets with error context
3. Run Phase 5.5 again
4. Repeat until valid

---

## Benefits of This Architecture

### 1. Separation of Concerns
- Generation phases focus on **quality creation**
- Validation phases focus on **systematic checking**
- No mixed responsibilities

### 2. Explicit Feedback Loops
- Validators provide specific error descriptions
- Regeneration gets context: "S0003 failed because LEGOs don't tile - missing 'hablar'"
- AI can learn from explicit feedback

### 3. Efficiency
- Only regenerate what failed
- S0001-S0017 pass → keep them
- S0003, S0010 fail → regenerate only those 2

### 4. Debuggability
- Validators run standalone for testing
- Inspect validation results independently
- Clear audit trail of what passed/failed

### 5. Reusability
- Validators are independent scripts
- Can be called from automation server OR run manually
- Can evolve independently from generation phases

### 6. Scalability
- Pattern works for ANY number of phases
- Add Phase 7 → add Phase 7.5 validator
- Consistent across entire pipeline

---

## Implementation

### Validator Structure

Each validator is a standalone script:

```javascript
// validators/validate-phase3-legos.cjs

async function validatePhase3(courseDir) {
  const errors = [];
  const failedSeeds = [];

  // Load input
  const legoPairs = await fs.readJson(path.join(courseDir, 'lego_pairs.json'));

  // Run checks
  for (const seed of legoPairs) {
    // Check 1: Tiling (FIRST AND MOST IMPORTANT)
    const tilingErrors = checkTiling(seed);
    if (tilingErrors.length > 0) {
      errors.push(...tilingErrors);
      failedSeeds.push(seed[0]);
      continue; // Skip other checks if tiling fails
    }

    // Check 2: Hard rules
    const hardRuleErrors = checkHardRules(seed);
    errors.push(...hardRuleErrors);

    // Check 3: FD compliance
    const fdErrors = checkFDCompliance(seed);
    errors.push(...fdErrors);

    // If any errors for this seed, mark as failed
    if (hardRuleErrors.length > 0 || fdErrors.length > 0) {
      if (!failedSeeds.includes(seed[0])) {
        failedSeeds.push(seed[0]);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    failedSeeds: failedSeeds,
    stats: {
      totalSeeds: legoPairs.length,
      passedSeeds: legoPairs.length - failedSeeds.length,
      failedSeeds: failedSeeds.length
    }
  };
}

module.exports = { validatePhase3 };
```

### Automation Server Integration

```javascript
// automation_server.cjs

async function generateCourse(courseCode) {
  // Phase 1: Generate seed pairs
  await runPhase1(courseCode);

  // Phase 1.5: Validate seed pairs
  let phase1Valid = false;
  let phase1Attempts = 0;

  while (!phase1Valid && phase1Attempts < 3) {
    const validation = await validatePhase1(courseDir);

    if (validation.valid) {
      phase1Valid = true;
      console.log('✅ Phase 1 validation passed');
    } else {
      phase1Attempts++;
      console.log(`❌ Phase 1 validation failed (attempt ${phase1Attempts}/3)`);
      console.log(`Regenerating ${validation.failedSeeds.length} failed seeds`);

      // Regenerate only failed seeds with error context
      await runPhase1Retry(courseCode, validation.failedSeeds, validation.errors);
    }
  }

  if (!phase1Valid) {
    throw new Error('Phase 1 validation failed after 3 attempts');
  }

  // Phase 3: Generate LEGOs
  await runPhase3(courseCode);

  // Phase 3.5: Validate LEGOs
  let phase3Valid = false;
  let phase3Attempts = 0;

  while (!phase3Valid && phase3Attempts < 3) {
    const validation = await validatePhase3(courseDir);

    if (validation.valid) {
      phase3Valid = true;
      console.log('✅ Phase 3 validation passed');
    } else {
      phase3Attempts++;
      console.log(`❌ Phase 3 validation failed (attempt ${phase3Attempts}/3)`);
      console.log(`Regenerating ${validation.failedSeeds.length} failed seeds`);

      await runPhase3Retry(courseCode, validation.failedSeeds, validation.errors);
    }
  }

  if (!phase3Valid) {
    throw new Error('Phase 3 validation failed after 3 attempts');
  }

  // Phase 5: Generate baskets
  await runPhase5(courseCode);

  // Phase 5.5: Validate baskets
  let phase5Valid = false;
  let phase5Attempts = 0;

  while (!phase5Valid && phase5Attempts < 3) {
    const validation = await validatePhase5(courseDir);

    if (validation.valid) {
      phase5Valid = true;
      console.log('✅ Phase 5 validation passed');
    } else {
      phase5Attempts++;
      console.log(`❌ Phase 5 validation failed (attempt ${phase5Attempts}/3)`);
      console.log(`Regenerating ${validation.failedLegos.length} failed baskets`);

      await runPhase5Retry(courseCode, validation.failedLegos, validation.errors);
    }
  }

  if (!phase5Valid) {
    throw new Error('Phase 5 validation failed after 3 attempts');
  }

  console.log('✅ Course generation complete - all validations passed');
}
```

---

## Retry Intelligence

Each retry gets:
1. **Failed item IDs**: Only regenerate what failed
2. **Error descriptions**: Specific feedback on what's wrong
3. **Original outputs**: Context of what passed (for consistency)

Example Phase 3 retry prompt:

```
You previously generated LEGO decompositions for 18 seeds.

✅ PASSED (15 seeds): S0001, S0002, S0004, S0005, S0007, S0008, S0009, S0011, S0012, S0013, S0014, S0015, S0016, S0017, S0018

❌ FAILED (3 seeds): S0003, S0006, S0010

Please regenerate ONLY the failed seeds. Here's what went wrong:

S0003: "cómo hablar lo más frecuentemente posible"
Error: TILING FAILURE
- Your LEGOs tile to: "cómo lo más frecuentemente posible"
- Missing: "hablar" (to speak)
- Fix: Include "hablar" as a LEGO in the decomposition

S0006: "Estoy intentando recordar una palabra"
Error: UNBONDED ARTICLE
- LEGO S0006L02: ["una", "a"] is standalone
- Fix: Bond with noun → ["una palabra", "a word"]

S0010: "No estoy seguro si puedo recordar toda la frase"
Errors:
1. NEGATION ALONE: S0010L01 ["No", "not"] is standalone
2. AUXILIARY ALONE: S0010L02 ["estoy", "I am"] is standalone
- Fix: Combine as composite ["No estoy seguro", "I'm not sure"]

Phase intelligence: [full Phase 3 intelligence loaded]

Generate corrected decompositions for S0003, S0006, S0010 only.
```

---

## Testing & Development Workflow

### 1. Develop Validator Independently
```bash
# Create validator
node validators/validate-phase3-legos.cjs vfs/courses/spa_for_eng_18seeds

# See detailed error output
# Iterate on validation logic
```

### 2. Test Validator Against Known Good/Bad Outputs
```bash
# Good output (should pass)
node validators/validate-phase3-legos.cjs test/fixtures/good_legos

# Bad output (should fail with specific errors)
node validators/validate-phase3-legos.cjs test/fixtures/bad_legos
```

### 3. Integrate Into Automation Server
```bash
# Run full course generation with validation loops
node automation_server.cjs spa_for_eng_18seeds
```

### 4. Debug Failed Generations
```bash
# Inspect validation results
cat vfs/courses/spa_for_eng_18seeds/validation_phase3.json

# See exactly what failed and why
# Fix phase intelligence or validator logic
```

---

## Future Extensions

### Phase 7: De-duplication
- **Phase 7**: Identify and merge identical LEGO_PAIRS
- **Phase 7.5**: Validate de-duplication didn't break references

### Phase 9: Quality Scoring
- **Phase 9**: Score each basket for pedagogical quality
- **Phase 9.5**: Validate scores meet thresholds

### Phase 11: Cross-Language Consistency
- **Phase 11**: Generate parallel course in another language
- **Phase 11.5**: Validate structural consistency across languages

**The pattern scales infinitely.**

---

## Version History

**v1.0 (2025-10-27)**:
- Initial architecture documentation
- Defined Generation (X.0) vs Validation (X.5) pattern
- Documented retry loop with explicit feedback
- Provided implementation examples
- Described benefits and scalability

---

**End of Phase Validation Architecture Pattern**
