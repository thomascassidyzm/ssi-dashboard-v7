# Validation Loop Integration - Phase 3.5

**Version**: 1.0 (2025-10-29)
**Status**: ✅ Integrated into automation_server.cjs
**Principle**: Evidence-based, self-healing AI system

---

## The Problem

**Before Integration**: Phase 3 LEGO extraction had serious quality issues that went undetected:

```
❌ "estuviera" = "I'm" (FD violation - could be estoy/soy/estuviera)
❌ "hablar" = "to speaking" (abomination!)
❌ "Hablas" = "You speak" vs "Do you speak" (inconsistent)
❌ "aprender" = "learn" vs "to learn" (infinitive inconsistency)
```

**Root Cause**: Validators existed but weren't integrated into automation loops
- No validate → regenerate → validate cycles
- AI drift from prompt intelligence
- Manual detection only

---

## The Solution

**Phase 3.5 Intelligent Validation Loop** - integrated into automation server

### Flow Diagram

```
Phase 1 (Translation) → seed_pairs.json
    ↓
Phase 3 (LEGO Extraction - Batches) → lego_pairs.tmp.json
    ↓
Poll for lego_pairs.tmp.json (all batches complete)
    ↓
╔════════════════════════════════════════════════════════════╗
║ PHASE 3.5: INTELLIGENT VALIDATION LOOP                     ║
║ (temp file → final file only when validated)               ║
╠════════════════════════════════════════════════════════════╣
║                                                             ║
║  ┌────────────────────────────────────────┐                ║
║  │ Rename lego_pairs.tmp.json → .json     │                ║
║  │ Run Intelligent Validator               │                ║
║  │ - Tiling integrity check                │                ║
║  │ - FD consistency (evidence-based)       │                ║
║  │ - Co-occurrence patterns                │                ║
║  │ - Hard rules (structural)               │                ║
║  └────────────────┬────────────────────────┘                ║
║                   │                                          ║
║         ┌─────────┴─────────┐                               ║
║         │                   │                               ║
║     ✅ VALID            ❌ INVALID                           ║
║         │                   │                               ║
║  Keep as .json      Rename back to .tmp.json               ║
║  (FINAL NAME)               │                               ║
║         │         ┌─────────┴─────────┐                     ║
║         │         │                   │                     ║
║         │   Attempt < 3?      Attempt = 3                   ║
║         │         │                   │                     ║
║         │      ┌──┴──┐                │                     ║
║         │     YES    NO                │                     ║
║         │      │      │                │                     ║
║         │  ┌───┘      │                │                     ║
║         │  │   FAIL (exit)      FAIL (exit)                 ║
║         │  │  .tmp.json remains  .tmp.json remains          ║
║         │  │                                                 ║
║         │  ▼                                                 ║
║         │  ┌────────────────────────────────┐               ║
║         │  │ Regenerate Failed Seeds        │               ║
║         │  │ - Build error feedback         │               ║
║         │  │ - Show evidence                │               ║
║         │  │ - Spawn retry agent            │               ║
║         │  │ - Update lego_pairs.tmp.json   │               ║
║         │  └────────────┬───────────────────┘               ║
║         │               │                                    ║
║         │  ┌────────────▼───────────┐                       ║
║         │  │ Wait 60s for retry     │                       ║
║         │  └────────────┬───────────┘                       ║
║         │               │                                    ║
║         │               └─────► Validate again              ║
║         │                       (loop)                       ║
║         │                                                    ║
╚═════════┼════════════════════════════════════════════════════╝
          │
          ▼
    lego_pairs.json EXISTS → Triggers Phase 5
          ↓
Phase 5 (Basket Generation)
```

---

## Temporary File Pattern

**Key Innovation**: Phase 3 outputs use temporary filenames until validation passes.

### Why Temporary Files?

**Problem**: If Phase 3 writes directly to `lego_pairs.json`, the orchestrator can't distinguish between:
- "Generation complete but not validated"
- "Generation complete AND validated"

**Solution**: Use different filenames for different states:

| State | Filename | Meaning |
|-------|----------|---------|
| Generating | `lego_pairs.tmp.json` | Phase 3 batches writing output |
| Validating | `lego_pairs.json` (temporary) | Validator running checks |
| Validation failed | `lego_pairs.tmp.json` | Renamed back - needs retry |
| Validation passed | `lego_pairs.json` (final) | Ready for Phase 5 |

### File State Machine

```
[Phase 3 Batch 1] → Create lego_pairs.tmp.json
[Phase 3 Batch 2] → Append to lego_pairs.tmp.json
[Phase 3 Batch N] → Append to lego_pairs.tmp.json
                            ↓
                 Poll for .tmp.json complete
                            ↓
              ┌─────────────┴─────────────┐
              │ Validation Attempt        │
              │ Rename .tmp.json → .json  │
              └─────────────┬─────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
          ✅ PASS                      ❌ FAIL
              │                           │
      Keep as .json          Rename back to .tmp.json
      (FINAL - done!)                     │
                                 ┌────────┴────────┐
                                 │ Retry agent     │
                                 │ updates .tmp    │
                                 └────────┬────────┘
                                          │
                                   Next attempt...
```

### Benefits

1. **Clean Orchestration**: Polling just waits for final file - no knowledge of validation internals
2. **Clear Signal**: `lego_pairs.json` exists = validated and ready
3. **Atomic Transition**: Rename is atomic filesystem operation
4. **No Race Conditions**: Temp file isolated until validation complete
5. **Resumability**: If process crashes, `.tmp.json` indicates "needs validation"

---

## Implementation

### 1. Integration Point (automation_server.cjs:1222-1275)

```javascript
// WAIT FOR PHASE 3 GENERATION (temp file)
console.log(`[Polling] Checking Phase 3 generation completion every 30s...`);
const phase3GenerationComplete = await pollPhaseCompletion(courseDir, 'lego_pairs.tmp.json', seeds, 30000);

if (!phase3GenerationComplete) {
  console.error(`[Polling] ❌ Phase 3 generation timeout after 30 minutes`);
  job.status = 'failed';
  job.error = 'Phase 3 generation timeout';
  return;
}

console.log(`\n[Polling] ✅ Phase 3 GENERATION COMPLETE! LEGOs extracted for all ${seeds} seeds.\n`);

// PHASE 3.5: INTELLIGENT VALIDATION LOOP
console.log(`\n[Phase 3.5] Starting intelligent validation loop...\n`);
console.log(`[Phase 3.5] Validating lego_pairs.tmp.json → will rename to lego_pairs.json when validated\n`);
let phase3Valid = false;
let phase3Attempts = 0;
const maxPhase3Attempts = 3;

while (!phase3Valid && phase3Attempts < maxPhase3Attempts) {
  phase3Attempts++;
  console.log(`[Phase 3.5] Validation attempt ${phase3Attempts}/${maxPhase3Attempts}`);

  // Run intelligent validator (renames .tmp.json → .json, validates, renames back if fail)
  const validation = await runIntelligentValidator(courseDir);

  if (validation.valid) {
    phase3Valid = true;
    console.log(`[Phase 3.5] ✅ Validation passed! ${validation.stats.passedSeeds}/${validation.stats.totalSeeds} seeds valid`);
    console.log(`[Phase 3.5] ✅ Renamed lego_pairs.tmp.json → lego_pairs.json (FINAL)\n`);
  } else {
    console.log(`[Phase 3.5] ❌ Validation failed: ${validation.errors.length} errors in ${validation.failedSeeds.length} seeds`);
    console.log(`[Phase 3.5] Failed seeds: ${validation.failedSeeds.slice(0, 10).join(', ')}${validation.failedSeeds.length > 10 ? '...' : ''}`);
    console.log(`[Phase 3.5] File remains as lego_pairs.tmp.json (not validated yet)`);

    if (phase3Attempts < maxPhase3Attempts) {
      console.log(`[Phase 3.5] 🔄 Regenerating ${validation.failedSeeds.length} failed seeds with explicit error feedback...`);
      await regeneratePhase3Seeds(courseCode, courseDir, validation, params);

      // Wait for regeneration to complete
      console.log(`[Phase 3.5] ⏳ Waiting for regeneration...`);
      await new Promise(resolve => setTimeout(resolve, 60000)); // 1 min wait
    } else {
      console.error(`[Phase 3.5] ❌ Validation failed after ${maxPhase3Attempts} attempts`);
      console.error(`[Phase 3.5] File remains as lego_pairs.tmp.json - MANUAL FIX REQUIRED`);
      job.status = 'failed';
      job.error = `Phase 3 validation failed: ${validation.errors.length} errors persist`;
      return;
    }
  }
}

job.progress = 60;
// Continue to Phase 5...
```

### 2. Validator Integration with Temp File Handling (automation_server.cjs:1000-1035)

```javascript
async function runIntelligentValidator(courseDir) {
  const tmpPath = path.join(courseDir, 'lego_pairs.tmp.json');
  const finalPath = path.join(courseDir, 'lego_pairs.json');

  try {
    // Temporarily rename .tmp.json → .json for validator
    if (await fs.pathExists(tmpPath)) {
      await fs.rename(tmpPath, finalPath);
    }

    const { IntelligentValidator } = require('./validators/validate-phase3-intelligent.cjs');
    const validator = new IntelligentValidator(courseDir);
    const result = await validator.validate();

    // If validation fails, rename back to .tmp.json
    if (!result.valid && await fs.pathExists(finalPath)) {
      await fs.rename(finalPath, tmpPath);
    }
    // If validation passes, leave as .json (final name)

    return result;
  } catch (error) {
    console.error(`[Validation] Error running intelligent validator:`, error.message);

    // On error, restore .tmp.json if needed
    if (await fs.pathExists(finalPath) && !await fs.pathExists(tmpPath)) {
      await fs.rename(finalPath, tmpPath);
    }

    return { valid: false, errors: [{ message: error.message }], stats: { totalSeeds: 0, passedSeeds: 0, failedSeeds: 0 }, failedSeeds: [] };
  }
}
```

**Key Points**:
- Temporarily renames `.tmp.json` → `.json` so validator can read it
- If validation **passes**: keeps as `.json` (final name)
- If validation **fails**: renames back to `.tmp.json` (needs retry)
- Error handling: ensures `.tmp.json` is restored on any error

### 3. Regeneration with Feedback (automation_server.cjs:1037-1064)

```javascript
async function regeneratePhase3Seeds(courseCode, courseDir, validation, params) {
  const { target, known } = params;
  const { failedSeeds, errors } = validation;

  console.log(`\n[Phase 3 Retry] Regenerating ${failedSeeds.length} failed seeds`);
  console.log(`[Phase 3 Retry] Error breakdown:`);
  console.log(`  - Tiling: ${validation.stats.errorBreakdown.tiling}`);
  console.log(`  - Consistency (FD): ${validation.stats.errorBreakdown.consistency}`);
  console.log(`  - Co-occurrence: ${validation.stats.errorBreakdown.cooccurrence}`);
  console.log(`  - Hard rules: ${validation.stats.errorBreakdown.hardRules}`);

  // Build retry brief with explicit error feedback
  const retryBrief = generatePhase3RetryBrief(courseCode, {
    target,
    known,
    failedSeeds,
    errors,
    validation
  }, courseDir);

  // Spawn retry agent (will update lego_pairs.tmp.json)
  await spawnPhaseAgent('3-retry', retryBrief, courseDir, courseCode);
}
```

**Note**: Retry agent updates `lego_pairs.tmp.json` (temp file), not the final `.json` file.

### 4. Retry Brief Generation (automation_server.cjs:1066-1156)

The retry brief includes:

1. **Context**: How many seeds passed vs failed
2. **Specific Errors**: Detailed breakdown by seed with evidence
3. **Fix Instructions**: Exact actions needed for each error
4. **Phase Intelligence**: Full Phase 3 prompt for reference
5. **Critical Rules**: Emphasized FD, tiling, consistency rules
6. **File Instructions**: Update `lego_pairs.tmp.json` (not final file)

Example error feedback format:

```markdown
### S0029
**Error**: fd_violation_inconsistent
- Message: "hablar" inconsistently mapped to "to speaking", expected "to speak"
- Evidence: This word maps to: to speak (15x), talking (2x), to speaking (1x)
- Fix: Use consistent mapping: "hablar" → "to speak"

## Files
- Input: lego_pairs.tmp.json (current - UPDATE FAILED SEEDS)
- Output: lego_pairs.tmp.json (corrected - overwrite with fixes)

NOTE: File remains .tmp.json until all validation passes, then will be renamed to lego_pairs.json
```

---

## How It Works End-to-End

### Scenario: Spanish Course Generation (60 seeds)

**Step 1**: Phase 3 Batches Complete → lego_pairs.tmp.json
```
[Polling] Checking Phase 3 generation completion every 30s...
[Polling] lego_pairs.tmp.json: 60/60 seeds
[Polling] ✅ Phase 3 GENERATION COMPLETE! LEGOs extracted for all 60 seeds.
```

**Step 2**: Start Validation Loop
```
[Phase 3.5] Starting intelligent validation loop...
[Phase 3.5] Validating lego_pairs.tmp.json → will rename to lego_pairs.json when validated
```

**Step 3**: Run Intelligent Validator (renames .tmp.json → .json temporarily)
```
[Phase 3.5] Validation attempt 1/3

[Validator] Renamed lego_pairs.tmp.json → lego_pairs.json (temporary)

📊 Evidence collected:
   - 101 unique target words
   - 11 inconsistent mappings detected
   - 318 co-occurrence patterns

🔍 Check 1: Tiling Integrity
   Found 0 tiling failures

🔍 Check 2: FD Consistency (Evidence-Based)
   Found 15 consistency violations

🔍 Check 3: Co-occurrence Patterns (Split Constructions)
   Found 0 potential split constructions

🔍 Check 4: Hard Rules (Structural Patterns)
   Found 0 hard rule violations
```

**Step 4**: Validation Fails - Rename Back to .tmp.json
```
[Phase 3.5] ❌ Validation failed: 15 errors in 14 seeds
[Phase 3.5] Failed seeds: S0014, S0019, S0020, S0023, S0024, S0028, S0029, S0032, S0040, S0041, S0046, S0047, S0048, S0059
[Phase 3.5] File remains as lego_pairs.tmp.json (not validated yet)
[Phase 3.5] 🔄 Regenerating 14 failed seeds with explicit error feedback...

[Phase 3 Retry] Regenerating 14 failed seeds
[Phase 3 Retry] Error breakdown:
  - Tiling: 0
  - Consistency (FD): 15
  - Co-occurrence: 0
  - Hard rules: 0
```

**Step 5**: Spawn Retry Agent with Error Feedback
```
[Phase 3 Retry] Retry agent spawned for 14 seeds

# Brief includes:

### S0029
**Error**: fd_violation_inconsistent
- Message: "hablar" inconsistently mapped to "to speaking", expected "to speak"
- Evidence: This word maps to: to speak (15x), talking (2x), to speaking (1x)
- Fix: Use consistent mapping: "hablar" → "to speak"

## Files
- Input: lego_pairs.tmp.json (current - UPDATE FAILED SEEDS)
- Output: lego_pairs.tmp.json (corrected)

[Full Phase 3 intelligence + critical rules emphasized]
```

**Step 6**: Retry Agent Fixes Issues → Updates lego_pairs.tmp.json
- Reads lego_pairs.tmp.json
- Updates ONLY the 14 failed seeds
- Uses evidence-based mappings ("to speak" has 15 uses, so use that)
- Writes corrected lego_pairs.tmp.json (still temp!)

**Step 7**: Validate Again (Attempt 2/3) → Final Rename
```
[Phase 3.5] ⏳ Waiting for regeneration...
[Phase 3.5] Validation attempt 2/3

[Validator] Renamed lego_pairs.tmp.json → lego_pairs.json (temporary)

✅ Validation Result:
   Valid: true
   Passed: 60/60 seeds
   Failed: 0 seeds
   Total errors: 0

[Phase 3.5] ✅ Validation passed! 60/60 seeds valid
[Phase 3.5] ✅ Renamed lego_pairs.tmp.json → lego_pairs.json (FINAL)
```

**Step 8**: Continue to Phase 5 (lego_pairs.json now exists and is validated)
```
job.progress = 60;
// START PHASE 5 (SEQUENTIAL with validators)
```

---

## Key Features

### 1. Evidence-Based Feedback

Not just "this is wrong" - **shows the evidence**:

```
"hablar" inconsistently mapped to "to speaking"
Expected: "to speak"
Evidence: This word maps to: to speak (15x), talking (2x), to speaking (1x)
Fix: Use consistent mapping: "hablar" → "to speak"
```

AI learns from **actual usage patterns** across all seeds.

### 2. Incremental Fixes

- Only regenerates failed seeds
- Preserves correct seeds (no thrashing)
- Reduces token usage (14 seeds vs 60)

### 3. Explicit Retry Limit

- Max 3 attempts to prevent infinite loops
- If validation still fails after 3 attempts → fail gracefully
- Human intervention required at that point

### 4. Zero Hardcoding

- Works for ANY language pair
- Learns from course data itself
- No Spanish/French/Chinese-specific rules

### 5. Comprehensive Logging

Every step is logged for debugging:
```
[Phase 3.5] Validation attempt 1/3
[Phase 3.5] ❌ Validation failed: 15 errors in 14 seeds
[Phase 3.5] Failed seeds: S0014, S0019, S0020...
[Phase 3 Retry] Regenerating 14 failed seeds
[Phase 3 Retry] Error breakdown:
  - Consistency (FD): 15
```

---

## Files Modified

### `/automation_server.cjs`

**Lines 998-1011**: `runIntelligentValidator()` function
**Lines 1013-1040**: `regeneratePhase3Seeds()` function
**Lines 1042-1132**: `generatePhase3RetryBrief()` function
**Lines 1073-1108**: Validation loop integration in `pollAndContinue()`

---

## Testing

### Manual Test

```bash
# Start automation server
node automation_server.cjs

# Trigger course generation via API
curl -X POST http://localhost:3456/api/courses/generate \
  -H "Content-Type: application/json" \
  -d '{"target": "spa", "known": "eng", "startSeed": 1, "endSeed": 60}'

# Watch logs for Phase 3.5 validation loop
```

Expected output:
```
[Polling] ✅ Phase 3 COMPLETE! LEGOs extracted for all 60 seeds.
[Phase 3.5] Starting intelligent validation loop...
[Phase 3.5] Validation attempt 1/3
...
[Phase 3.5] ✅ Validation passed! 60/60 seeds valid
```

### Automated Test

```bash
# Run intelligent validator directly on existing course
node validators/validate-phase3-intelligent.cjs spa_for_eng_60seeds
```

---

## Future Enhancements

### 1. Phase 1.5 Validation Loop

Apply same pattern to seed translation:
- Detect unnatural translations
- Check pedagogical appropriateness
- Verify length/complexity progression

### 2. Phase 5.5 Validation Loop

Apply to basket generation:
- ABSOLUTE GATE compliance (already working)
- Pattern coverage (already working)
- Add FD validation for practice phrases

### 3. Cross-Language Learning

```javascript
// Learn patterns across multiple courses
const patterns = {
  spa: { "que + subjunctive": 0.85 },
  ita: { "che + congiuntivo": 0.82 },
  fra: { "que + subjonctif": 0.87 }
};

// Recognize parallel constructions automatically
if (patternSimilarity > 0.8) {
  applyValidationRule(targetLang);
}
```

### 4. Confidence Scoring

```javascript
{
  target: "hablar",
  expectedKnown: "to speak",
  confidence: 0.93,  // 15/16 uses = high confidence
  minority: "to speaking",
  minorityRate: 0.06  // 1/16 uses = likely error
}
```

### 5. Real-Time Feedback

Instead of waiting 60s between attempts, poll for completion:
```javascript
await pollForRetryCompletion(courseDir, failedSeeds);
```

---

## Success Metrics

### Before Integration
- ❌ FD violations go undetected
- ❌ Manual review required
- ❌ Quality degrades over time
- ❌ No systematic improvement

### After Integration
- ✅ Automatic FD violation detection
- ✅ Self-healing with explicit feedback
- ✅ Quality improves with each retry
- ✅ Evidence-based learning

---

## The "AI as OS" Promise

This validation loop embodies the core principle:

> **The system learns from its own outputs**

- AI generates LEGOs → Validator learns patterns → AI fixes errors
- No human linguistic expertise hardcoded
- Gets smarter with every course
- Works across ALL languages with zero configuration

**It's not just validating - it's teaching the AI to be consistent.**

---

**Status**: ✅ Integrated and ready for testing
**Next**: Test with Spanish course regeneration
**Future**: Extend to Phases 1.5 and 5.5
