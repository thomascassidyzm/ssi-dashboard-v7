# Phase 3 LEGO Validation & Cascade Detection

## Overview

Phase 3 validation runs AFTER Phase 3 (LEGO extraction) and Phase 3.5 (deduplication), before Phase 5 (basket generation).

Two validators ensure LEGO registry integrity:
1. **LEGO Registry Collision Checker** - Detects FD violations where same KNOWN key maps to multiple TARGET values
2. **Infinitive Form Checker** - Validates English linguistic rules for infinitive constructions

## Phase Sequence

```
Phase 1 (Translation)
    ↓
Phase 2 Validation (Seed-level FD check)
    ↓
Phase 3 (LEGO Extraction - parallel agents)
    ↓
Phase 3.5 (Deduplication - mark debuts vs repeats)
    ↓
[Phase 3.6 Validation] ← LEGO Registry Collision Check
    ↓ (if PASS)
[Phase 3.7 Cascade Detection] ← Basket Dependency Analysis
    ↓
Phase 5 (Baskets)
    ↓
Phase 6 (Seed Instructions)
    ↓
Phase 8 (Audio)
```

## Validator 1: LEGO Registry Collision Checker

### Purpose
Validates that KNOWN field acts as unique lookup key in LEGO registry (one-to-one mapping).

### Location
`scripts/validation/check-lego-fd-violations.cjs`

### Usage
```bash
node scripts/validation/check-lego-fd-violations.cjs <lego_pairs_path>
```

### Example Collision
```
❌ COLLISION KEY: "you are correct"

   → TARGET: "你是对的"
      S0042 S0042L05 (M)

   → TARGET: "你们是对的"
      S0087 S0087L12 (M)

Registry lookup ambiguity: "you are correct" → Which TARGET?
Violates one-to-one mapping constraint!
```

### Remediation: Chunking-Up

When collision detected, **DO NOT** extract the minimal colliding phrase as standalone LEGO.

Instead, **CHUNK UP** with adjacent LEGOs in the same seed to create a larger MOLECULAR_LEGO:

**Before (collision):**
```json
S0087L12: {
  "target": "你们是对的",
  "known": "you are correct"  ← COLLIDES with S0042L05!
}
```

**After chunking-up (resolved):**
```json
S0087L12: {
  "target": "我觉得你们是对的",
  "known": "I think you are correct"  ← Chunked with preceding context
}
```

**Constraint**: Use ONLY words from seed sentence - DO NOT add new words.

### Outputs

**1. Re-extraction Manifest**
`lego_pairs_reextraction_manifest.json`

Contains:
- List of affected seed IDs
- Collision details for each seed
- Chunking-up instructions
- **Cascade impact warning** for Phase 5 baskets

**2. Detailed Report**
`lego_pairs_fd_report.json`

Contains:
- Violation count
- All collisions with seed references
- Re-extraction manifest embedded

## Validator 2: Infinitive Form Checker

### Purpose
Validates English infinitive forms follow linguistic rules.

### Location
`scripts/validation/check-infinitive-forms.js`

### Checks
- Bare infinitives should have "to" prefix (unless after modals)
- Modal constructions use correct bare infinitives
- Initial position LEGOs marked CRITICAL

## Cascade Detection: Basket Dependency Tracker

### Purpose
When LEGOs are re-extracted with chunking-up, baskets containing those LEGOs must regenerate.

### Location
`scripts/validation/track-basket-dependencies.cjs`

### Usage
```bash
node scripts/validation/track-basket-dependencies.cjs <course_code>
```

### Inputs
- `lego_pairs_reextraction_manifest.json` (from collision detector)
- `baskets.json` (Phase 5 output)

### Output
`basket_regeneration_manifest.json`

**Example output:**
```json
{
  "course_code": "spa_for_eng",
  "total_baskets": 100,
  "affected_baskets_count": 18,
  "basket_impact_percentage": 18,
  "regeneration_strategy": "SELECTIVE",
  "regeneration_rationale": "Only 18% of baskets affected. Selective regeneration is efficient.",
  "affected_baskets": [
    {
      "basket_id": "B0003",
      "basket_title": "Correctness & Accuracy",
      "total_legos": 12,
      "affected_legos_count": 2,
      "impact_percentage": 17,
      "affected_legos": [
        {
          "lego_id": "S0042L05",
          "seed_id": "S0042",
          "current_known": "you are correct",
          "current_target": "你是对的"
        }
      ]
    }
  ]
}
```

### Regeneration Strategy

**Decision threshold: 30% of baskets**

**If < 30% affected → SELECTIVE regeneration:**
1. Re-run Phase 3 for affected seeds with chunking-up instructions
2. Run deduplication (Phase 3.5)
3. Delete affected baskets from baskets.json
4. Re-run Phase 5 ONLY for affected basket themes
5. Merge regenerated baskets back into baskets.json
6. Re-run Phase 6 for affected seeds
7. Re-run Phase 8 for affected seeds

**If ≥ 30% affected → FULL regeneration:**
1. Re-run Phase 3 for affected seeds with chunking-up instructions
2. Run deduplication (Phase 3.5)
3. Delete baskets.json entirely
4. Re-run Phase 5 for full course
5. Re-run Phase 6 for full course
6. Re-run Phase 8 for full course

### Special Case: Baskets Not Yet Generated

If Phase 5 hasn't run yet, tracker generates minimal manifest:

```json
{
  "baskets_status": "NOT_YET_GENERATED",
  "affected_legos_count": 237,
  "regeneration_strategy": "FULL",
  "note": "Phase 5 not yet run. When baskets are generated, they will automatically incorporate chunked-up LEGOs."
}
```

**Action**: Re-run Phase 3 with chunking-up, then proceed to Phase 5 normally.

## Orchestrator Integration

### Location
`services/orchestration/orchestrator.cjs`

### Validation Hook (After Phase 3)

```javascript
if (phase === 3) {
  // Run LEGO-level validators
  const validationPassed = await runPhaseValidation(courseCode, phase);

  if (!validationPassed) {
    // Validation failed - generate cascade analysis
    const basketAnalysisPath = path.join(__dirname, '../../scripts/validation/track-basket-dependencies.cjs');
    execSync(`node "${basketAnalysisPath}" "${courseCode}"`, { stdio: 'inherit' });

    console.log('\n⚠️  LEGO COLLISION CASCADE IMPACT:');
    console.log('   - LEGOs require chunking-up remediation');
    console.log('   - Affected baskets will need regeneration');
    console.log('   - See basket_regeneration_manifest.json for details\n');

    // Block progression until remediation
    state.status = 'validation_failed';
    return;
  }
}
```

## Current Collision Rates

### Spanish Course (spa_for_eng)
- **96 collisions** detected
- **237 affected seeds** (35% of 679 seeds)
- **Estimated 15-20 affected baskets** (~20% of total)
- **First 100 seeds**: 32 collisions (~3 baskets)
- **Recommended strategy**: SELECTIVE regeneration

### Chinese Course (cmn_for_eng)
- **125 collisions** detected
- **312 affected seeds** (47% of 662 seeds)
- **Estimated 25-30 affected baskets** (~26% of total)
- **First 100 seeds**: 60 collisions (~5 baskets)
- **Recommended strategy**: SELECTIVE regeneration

## Common Collision Patterns

### Spanish
1. **Preposition variations** (`para ir` vs `ir`) → Chunk with preceding verb
2. **Gerund vs infinitive** (`aprendiendo` vs `aprender`) → Chunk with auxiliary
3. **Self-collisions** (same seed, two variants) → Keep one, merge the other
4. **Synonyms** (`parar` vs `dejar`) → Chunk with adjacent context

### Chinese
1. **Aspect/completion markers** (`学习` vs `学会`) → Different meanings, chunk to disambiguate
2. **Verb-object compounds** (`说` vs `说话`) → Grammatical variations, chunk for context
3. **Reduplication** (`试试` vs `试着`) → Register differences, chunk for clarity
4. **"something" translations** (5 different targets!) → ALWAYS needs context, must chunk

## Chunking Examples

See `/tmp/chunking_analysis_spanish.md` and `/tmp/chunking_analysis_chinese.md` for detailed analysis of first 10 collisions in each course.

## Related Documentation

- `PHASE2_VALIDATION.md` - Seed-level validation (Phase 2)
- `PHASE5_CASCADE_IMPACT.md` - Detailed analysis of basket regeneration workflow
- `check-lego-fd-violations.cjs` - Collision detector source
- `track-basket-dependencies.cjs` - Cascade tracker source
