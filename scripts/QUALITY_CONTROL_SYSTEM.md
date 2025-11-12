# Quality Control System for Overnight Run

## 🚨 The Problem

**Agent laziness patterns:**
- "Let me write a Python script to validate these translations" ❌
- "I'll create a regex to check cognate usage" ❌
- Delegates judgment to code instead of using intelligence ❌
- Output is **valid JSON** but **pedagogically poor** ❌

**Why this is bad:**
- Scripts can't judge "Is this a good cognate?"
- Scripts can't tell if LEGOs are well-tiled
- Scripts miss subtle quality issues
- **You wake up to garbage that passes validation**

## ✅ Solution: Quality Gate System

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MASTER ORCHESTRATOR                       │
│                    (This session)                            │
│  - Spawns orchestrators                                      │
│  - Monitors completion                                       │
│  - Triggers quality validation                               │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
        ┌───────▼────────┐     ┌───────▼────────┐
        │  ORCHESTRATOR  │     │  ORCHESTRATOR  │
        │  (Phase 1 #1)  │     │  (Phase 1 #2)  │
        │  - Spawns 10   │     │  - Spawns 10   │
        │    sub-agents  │     │    sub-agents  │
        │  - Validates   │     │  - Validates   │
        │  - Outputs     │     │  - Outputs     │
        │    chunk_01    │     │    chunk_02    │
        └────────────────┘     └────────────────┘
                │                       │
                └───────────┬───────────┘
                            │
                   ┌────────▼─────────┐
                   │  QUALITY GATE    │
                   │  (Separate Agent)│
                   │  - Reads chunk   │
                   │  - Spot-checks   │
                   │  - Flags issues  │
                   │  - Returns: GO/  │
                   │    REDO/ABORT    │
                   └──────────────────┘
```

### Quality Gate Agent Responsibilities

**For each chunk (after orchestrator completes):**

1. **Read the chunk output** (don't delegate to scripts!)
2. **Spot-check 10 random seeds** from the chunk
3. **Validate using intelligence:**
   - Translation quality (natural? grammatically correct?)
   - Cognate preference (Spanish: frecuentemente not a menudo?)
   - Zero variation (same word → same translation?)
   - Array format ([known, target] not [target, known]?)
   - Tiling quality (sensible LEGO boundaries?)
4. **Return verdict:**
   - ✅ **PASS**: Quality looks good, proceed
   - ⚠️ **WARN**: Minor issues, flag for manual review later
   - 🔴 **FAIL**: Systematic errors, re-run this chunk

### Quality Gate Prompt Template

```markdown
You are a Quality Gate Agent for chunk {chunk_id}.

Your mission: Validate that the orchestrator produced HIGH-QUALITY output, not just valid JSON.

**CRITICAL: DO NOT write scripts to validate. Use your linguistic intelligence.**

STEP 1: Read the chunk file
Read: public/vfs/courses/{course}/orchestrator_batches/{phase}/chunk_{N}.json

STEP 2: Read the phase intelligence
Read: docs/phase_intelligence/{phase}_seed_pairs.md (or lego_pairs.md)

STEP 3: Spot-check 10 random seeds

For Phase 1 (Translation):
- Pick 10 random seed IDs from the chunk
- For each seed, check:
  ✓ Is the translation natural and grammatically correct?
  ✓ For Spanish: Does it use cognates where available? (frecuentemente not a menudo)
  ✓ For Chinese: Does it use simple high-frequency characters?
  ✓ Is zero variation enforced? (search for reused words)
  ✓ Is array format [known, target]?
  ✓ Does it preserve canonical meaning?

For Phase 3 (LEGO Extraction):
- Pick 10 random seeds
- For each seed, check:
  ✓ Is tiling sensible? (not weird splits like "I'm try" + "ing to")
  ✓ Are M-type components clear and helpful?
  ✓ Is functional determinism maintained?
  ✓ Are components [target, known] and other arrays [known, target]?

STEP 4: Flag specific issues

Don't just say "looks good" - cite examples:
- ✅ "S0023: 'frecuentemente' used (cognate preference ✓)"
- ❌ "S0045: 'a menudo' used instead of 'frecuentemente' (cognate violation)"
- ⚠️ "S0078: 'tratar' used but 'intentar' was established in S0002 (zero variation violation)"

STEP 5: Return verdict

PASS: 9-10 seeds look excellent
WARN: 7-8 seeds good, 2-3 minor issues (list them)
FAIL: <7 seeds acceptable (systematic problem - re-run needed)

**Use your linguistic intelligence. Don't delegate to code.**
```

### Master Orchestrator Integration

**After each orchestrator completes:**

```bash
# Orchestrator writes chunk_01.json
# Master detects completion
# Master spawns Quality Gate agent

Quality Gate Agent validates chunk_01.json
  ↓
Returns: PASS / WARN / FAIL
  ↓
if PASS:
  - Continue to next orchestrator
if WARN:
  - Log issues for manual review later
  - Continue (issues are minor)
if FAIL:
  - Log failure reason
  - Re-spawn that orchestrator with corrections
  - Increment retry counter (max 2 retries)
```

---

## 🔄 Re-Run Capability

### When Quality Gate Returns FAIL

**Master orchestrator:**

1. **Log the failure:**
   ```
   ❌ chunk_01.json FAILED quality gate
   Reason: Cognate preference violated in 5/10 seeds
   Examples: S0023 used 'a menudo' (should be 'frecuentemente')
   ```

2. **Prepare corrected prompt:**
   ```markdown
   You are Phase 1 Orchestrator #1 (RETRY).

   Previous attempt failed quality validation:
   - Issue: Cognate preference not enforced
   - Examples: Used 'a menudo' instead of 'frecuentemente'

   CRITICAL REMINDERS:
   - For Spanish seeds 1-100: Check cognates FIRST
   - Use known language synonyms to match cognates
   - "often" → synonym "frequently" → Spanish "frecuentemente"
   - Read lines 447-505 of phase_1_seed_pairs.md carefully

   [Rest of orchestrator prompt...]
   ```

3. **Re-spawn orchestrator** with clarified prompt

4. **Run quality gate again** on new output

5. **If fails twice:** Alert and pause (don't loop forever)

---

## 📊 Quality Metrics Dashboard

**Master orchestrator maintains live dashboard:**

```
========================================
OVERNIGHT RUN STATUS
========================================
Time elapsed: 1h 23m
Current phase: Phase 1

Spanish Course (spa_for_eng_s0001-0668):
  Chunk 01: ✅ PASS (orchestrator_01 complete)
  Chunk 02: ⏳ Running (orchestrator_02 in progress)
  Chunk 03: ⏸️  Pending

Chinese Course (cmn_for_eng_s0001-0668):
  Chunk 01: ✅ PASS (orchestrator_01 complete)
  Chunk 02: ⚠️  WARN (2 minor issues - logged)
  Chunk 03: 🔴 FAIL (retry 1/2 in progress)

Quality Gate Results:
  Passed: 2
  Warned: 1 (Spanish S0045, S0078 - review later)
  Failed: 1 (Chinese chunk_03 - cognate issues)
  Retries: 1

Next action: Wait for chunk_03 retry to complete
========================================
```

---

## 🎯 How This Prevents "Bag of Shite"

### Without Quality Gates:
- Orchestrator delegates to script ❌
- Script validates JSON structure only ❌
- Master sees "complete" ✅ and moves on ❌
- **You wake up to valid JSON with terrible translations** 💩

### With Quality Gates:
- Orchestrator completes ✅
- Quality Gate agent **reads and judges** ✅
- Spots: "Agent used 'a menudo' not 'frecuentemente'" 🔴
- Master **re-runs** that chunk ✅
- Quality Gate validates retry ✅
- **You wake up to high-quality output** 🎉

---

## 🚀 Implementation Plan

**Option 1: Full Quality Gates (Safest, Slower)**
- Quality gate after EVERY chunk (6 chunks Phase 1, 6 chunks Phase 3 = 12 gates)
- Expected time: +1-2 hours
- Confidence: Very high

**Option 2: Sampling Quality Gates (Faster, Still Safe)**
- Quality gate on FIRST chunk of each orchestrator batch
- If first passes, assume rest similar
- Quality gate on LAST chunk of each batch (final check)
- Expected time: +30 minutes
- Confidence: High

**Option 3: Post-Phase Quality Gates (Fastest, Medium Safety)**
- Run quality gates after Phase 1 complete (check merged output)
- Run quality gates after Phase 3 complete
- If issues found, identify and re-run problem chunks
- Expected time: +15 minutes
- Confidence: Medium

---

## 💡 Recommended: Option 2 (Sampling)

**Rationale:**
- First chunk catches systematic issues early
- Last chunk confirms quality maintained throughout
- Balance of speed and safety
- Total: 4 quality gates (2 per phase)

---

## 📋 Your Decision

Which approach do you want?

1. **Full Quality Gates**: Every chunk validated (safest, +2 hours)
2. **Sampling Gates**: First/last chunks (balanced, +30 min) ⭐ RECOMMENDED
3. **Post-Phase Gates**: Validate merged output (fastest, +15 min)
4. **No Gates**: Trust orchestrators (fastest, risky) ⚠️

**What's your risk tolerance?**
