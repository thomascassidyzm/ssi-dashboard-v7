# Phase 2: Automatic FD Violation Detection

## What Phase 2 Does

Phase 2 is a **validation gate** that runs automatically after Phase 1 completes when `CHECKPOINT_MODE=gated`. It checks for **Functional Determinism (FD) violations** in the translation pairs.

### FD Violation Detection: The Learner Uncertainty Test

**The Core Principle:** When a learner hears X in their known language, do they ALWAYS know exactly what to produce in the target language?

If not, the translations are inconsistent and create learner uncertainty.

**❌ Violation Example (Creates Learner Uncertainty):**
```json
{
  "S0001": ["trabajo", "work"],
  "S0042": ["labor", "work"]
}
```

When the learner hears "work", should they say "trabajo" or "labor"? The course is inconsistent - this violates Functional Determinism and creates confusion.

**✅ Valid Example (Deterministic & Learner-Friendly):**
```json
{
  "S0001": ["trabajo", "work"],
  "S0042": ["trabajo", "work"]
}
```

When the learner hears "work", they ALWAYS produce "trabajo". No uncertainty, no confusion.

### Why This Matters

Phase 2 validation ensures **zero learner uncertainty** by enforcing:
- **Functional Determinism:** KNOWN → TARGET mapping is deterministic (one-to-one)
- **Consistency:** Same input always produces same output
- **Predictability:** Learners can trust their pattern recognition

## Integration with Automation Workflow

### Checkpoint Mode: `gated`

When `CHECKPOINT_MODE=gated`, the orchestrator:

1. **Phase 1 completes** → Branch watcher detects completion
2. **Phase 2 validation runs automatically** → FD collision check
3. **If validation PASSES**:
   - ✅ Auto-triggers Phase 3
   - Continues down the pipeline (3 → 5 → 6 → 8)
4. **If validation FAILS**:
   - ❌ Sets status to `validation_failed`
   - **Blocks** progression to Phase 3
   - Writes detailed report: `seed_pairs_phase2_report.json`
   - Requires manual intervention

### Validation Script

**Location:** `scripts/phase2_collision_check.cjs`

**Exit Codes:**
- `0` - PASS (no violations)
- `1` - FAIL (violations detected)

**Output:**
```bash
🔍 Phase 2: Collision Avoidance Check

Reading: /path/to/seed_pairs.json

✅ PASS: No FD violations detected

   Total unique KNOWN phrases: 668
   Total seed pairs: 668
   All KNOWN phrases map to exactly one TARGET

📄 Report saved: seed_pairs_phase2_report.json
```

## Orchestrator Integration

### Code Changes

**services/orchestration/orchestrator.cjs:**

```javascript
async function runPhaseValidation(courseCode, phase) {
  if (phase === 1) {
    // Phase 2: FD Collision Check
    const seedPairsFile = path.join(VFS_ROOT, courseCode, 'phase_1', 'seed_pairs.json');
    const validatorPath = path.join(__dirname, '../../scripts/phase2_collision_check.cjs');

    try {
      execSync(`node "${validatorPath}" "${seedPairsFile}"`, {
        cwd: VFS_ROOT,
        stdio: 'inherit'
      });
      console.log(`   ✅ Phase 2 validation PASSED - no FD violations`);
      return true;
    } catch (error) {
      console.log(`   ❌ Phase 2 validation FAILED - FD violations detected`);
      return false;
    }
  }

  return true; // No validators for other phases
}
```

### Checkpoint Mode Handling

When Phase 1 completes and checkpoint mode is `gated`:

```javascript
if (CHECKPOINT_MODE === 'gated') {
  const validationPassed = await runPhaseValidation(courseCode, phase);

  if (validationPassed) {
    const nextPhase = getNextPhase(phase);
    if (nextPhase) {
      console.log(`   ✓ Validation passed, auto-triggering Phase ${nextPhase}`);
      setTimeout(() => triggerPhase(courseCode, nextPhase), 2000);
    }
  } else {
    state.status = 'validation_failed';
    console.log(`   ❌ Validation failed - manual intervention required`);
  }
}
```

## Phase Sequence

```
Phase 1 (Translation)
    ↓
[Phase 2 Validation Gate] ← Automatic FD check (unconditional)
    ↓ (if PASS)
Phase 3 (LEGO Extraction - parallel agents)
    ↓
[Phase 3.5 Deduplication] ← Mark debuts (new: true) vs repeats (new: false)
    ↓
Phase 5 (Baskets)
    ↓
Phase 6 (Introductions)
    ↓
Phase 8 (Audio)
```

**Note:** Phase 2 and Phase 3.5 are NOT separate servers - they're validation/processing scripts that run automatically between phases.

## Example Workflow

### Successful Run

```bash
[Phase 1 (Translation)] ✓ Phase 1 complete for nor_for_eng
[Phase 1 (Translation)] → Notifying orchestrator: http://localhost:3456/phase-complete

[Orchestrator] 📥 Phase complete notification: Phase 1 (nor_for_eng)

🔬 Running Phase 1 validation for nor_for_eng...
🔍 Phase 2: Collision Avoidance Check

Reading: /path/to/nor_for_eng/phase_1/seed_pairs.json

✅ PASS: No FD violations detected
   Total unique KNOWN phrases: 10
   Total seed pairs: 10

   ✅ Phase 2 validation PASSED - no FD violations
   ✓ Validation passed, auto-triggering Phase 3

🚀 Auto-triggering Phase 3 for nor_for_eng
   Delegating to: http://localhost:3458
   ✓ Phase 3 started successfully
```

### Failed Run (FD Violations)

```bash
[Orchestrator] 📥 Phase complete notification: Phase 1 (cmn_for_eng)

🔬 Running Phase 1 validation for cmn_for_eng...
🔍 Phase 2: Collision Avoidance Check

❌ FAIL: 2 FD violation(s) detected

1. KNOWN: "work"
   Maps to 2 different TARGETs:

   → "trabajo" (S0001, S0023)
   → "labor" (S0042)

2. KNOWN: "run"
   Maps to 2 different TARGETs:

   → "correr" (S0005)
   → "ejecutar" (S0088)

⚠️  ACTION REQUIRED:
   Review violations and either:
   1. Modify seed pairs to use different wording
   2. Add disambiguating context to KNOWN phrases
   3. Remove duplicate/conflicting seeds

📄 Detailed report saved: cmn_for_eng/phase_1/seed_pairs_phase2_report.json

   ❌ Phase 2 validation FAILED - FD violations detected
   📄 Review report: /path/to/seed_pairs_phase2_report.json
   ❌ Validation failed - manual intervention required
```

## Manual Fixes

When Phase 2 validation fails:

1. **Review the report:**
   ```bash
   cat public/vfs/courses/{courseCode}/phase_1/seed_pairs_phase2_report.json
   ```

2. **Fix violations** by editing `seed_pairs.json`:
   - Add disambiguating context ("work (labor)" vs "work (function)")
   - Use consistent translations across seeds
   - Remove duplicate/conflicting seeds

3. **Re-run Phase 1** with corrected translations

4. **Or manually trigger Phase 3** if violations are acceptable (not recommended)

## Benefits

✅ **Automatic Quality Gate** - No manual Phase 2 script runs needed
✅ **Blocks Bad Data** - Prevents Functional Determinism violations from propagating to LEGOs
✅ **Clear Reports** - Detailed violation reports with seed IDs
✅ **Seamless Integration** - Works transparently in gated mode
✅ **No User Action** - Validation runs automatically between phases

## Configuration

Add to `.env.automation`:

```bash
# Checkpoint mode: manual | gated | full
CHECKPOINT_MODE=gated  # Enables automatic Phase 2 validation
```

## Testing

Test with the Norwegian translations:

```bash
# This should PASS Phase 2 validation (if translations are consistent)
curl -X POST http://localhost:3456/api/courses/nor_for_eng/start-phase \
  -H "Content-Type: application/json" \
  -d '{"phase": 1, "totalSeeds": 10}'

# Watch logs for:
# ✅ Phase 2 validation PASSED
# 🚀 Auto-triggering Phase 3
```

## Architecture

```
┌─────────────────────────────────────┐
│   Phase 1 Server                    │
│   - Spawns browser sessions         │
│   - Watches for completion branch   │
│   - Merges to main                  │
│   - Notifies orchestrator           │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│   Orchestrator                      │
│   - Receives completion notice      │
│   - Runs runPhaseValidation(1)      │
│   └─> Executes phase2_collision     │
│       check.cjs                     │
│   - Checks exit code                │
│   - IF PASS: triggerPhase(3)        │
│   - IF FAIL: status=validation_failed│
└──────────┬──────────────────────────┘
           │
           ▼ (if validation passed)
┌─────────────────────────────────────┐
│   Phase 3 Server                    │
│   - LEGO extraction begins          │
└─────────────────────────────────────┘
```

## Future Validators

The validation framework supports adding more validators:

```javascript
async function runPhaseValidation(courseCode, phase) {
  if (phase === 1) {
    // Phase 2: FD Collision Check
    return await runFDValidation(courseCode);
  }

  if (phase === 3) {
    // Phase 4: LEGO Quality Check (future)
    return await runLegoValidation(courseCode);
  }

  if (phase === 5) {
    // Phase 5.5: Basket Grammar Check (future)
    return await runBasketValidation(courseCode);
  }

  return true; // No validator configured
}
```

This creates a robust quality gate system throughout the pipeline!
