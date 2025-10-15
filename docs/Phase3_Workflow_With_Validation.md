# Phase 3 Workflow with Automated Validation

**Updated:** 2025-10-15
**APML Version:** 7.6
**Status:** Production Ready

---

## 🎯 Overview

Phase 3 (LEGO Decomposition) now includes automated quality validation as Phase 3.9. This ensures APML compliance before human review and supports iterative refinement for non-deterministic agent generation.

---

## 📊 Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: Seed Translations (translations.json)             │
│  - Spanish, Italian, French, Mandarin                        │
│  - APML v7.6 (Cognate Preference + Variation Reduction)     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: LEGO Decomposition                                 │
│  - Agent generates LEGO_BREAKDOWNS_COMPLETE.json            │
│  - FD_LOOP, IRON RULE, CHUNK UP principles                 │
│  - BASE/COMPOSITE classification + FEEDERS                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 3.9: Automated Validation                            │
│  - validate-lego-breakdowns.cjs                             │
│  - Checks: FD, IRON RULE, Translation Sync, Structure       │
│  - Reports: CRITICAL/HIGH/MEDIUM/LOW issues                 │
└────────────────┬────────────────────────────────────────────┘
                 │
       ┌─────────┴─────────┐
       │                   │
       ▼                   ▼
   ✅ PASS              ❌ FAIL
      │                   │
      │            Has CRITICAL/HIGH?
      │                   │
      │             ┌─────┴─────┐
      │             │           │
      │             ▼           ▼
      │        Manual Fix   Regenerate
      │             │           │
      │             └─────┬─────┘
      │                   │
      │                   ▼
      │            Phase 3.9 Again
      │                   │
      └───────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 4+: Basket Generation, Introductions, etc.          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tools & Scripts

### 1. **Validation Script**
**Path:** `/vfs/courses/validate-lego-breakdowns.cjs`

**Usage:**
```bash
# Validate single course
cd vfs/courses
node validate-lego-breakdowns.cjs spa_for_eng_30seeds

# Validate all courses
node validate-lego-breakdowns.cjs --all
```

**Checks:**
- ✅ FD_LOOP compliance (CRITICAL)
- ✅ IRON RULE enforcement (CRITICAL)
- ✅ Translation synchronization (CRITICAL)
- ✅ CHUNK UP principle (HIGH)
- ✅ Structure validation (HIGH)
- ✅ COMPOSITE componentization (MEDIUM)

**Output:**
```
══════════════════════════════════════════════════════════════
LEGO BREAKDOWNS VALIDATION REPORT
Course: spa_for_eng_30seeds
══════════════════════════════════════════════════════════════

SUMMARY
  Total Issues: 2
  CRITICAL: 0
  HIGH: 0
  MEDIUM: 0
  LOW: 2

✅ VALIDATION PASSED - No critical or high-priority issues
══════════════════════════════════════════════════════════════
```

### 2. **Orchestration Script** (With Auto-Retry)
**Path:** `/vfs/courses/process-phase-3-with-validation.cjs`

**Usage:**
```bash
# Single course with automatic retries (default: 3 attempts)
node process-phase-3-with-validation.cjs spa_for_eng_30seeds

# Custom max attempts
node process-phase-3-with-validation.cjs spa_for_eng_30seeds --max-attempts=5

# All courses
node process-phase-3-with-validation.cjs --all
```

**Features:**
- 🔄 Automatic regeneration on failure
- 💾 Backup previous attempts
- 📊 Comparative scoring
- 🎯 Best attempt recommendation
- 📦 Batch processing

---

## 📋 Severity Levels

| Severity | Action | Examples |
|----------|--------|----------|
| **CRITICAL** | MUST fix | IRON_RULE_VIOLATION, FD_VALIDATION_FAILED, EMPTY_CHUNK |
| **HIGH** | Should fix | FD_CONTEXT_MISSING, TRANSLATION_MISSING, MISSING_FIELD |
| **MEDIUM** | Fix if time | FD_GENDER_AMBIGUOUS, MISSING_COMPONENTIZATION |
| **LOW** | Optional | MISSING_FEEDERS (may be intentional) |

---

## 🔄 Iteration Strategy

### Decision Matrix

| Validation Result | Action |
|------------------|--------|
| **0 CRITICAL/HIGH** | ✅ Ship it |
| **1-2 isolated CRITICAL** | 🛠️ Manual fix (faster than regeneration) |
| **>10% seeds with CRITICAL** | 🔄 Full regeneration with improved prompt |
| **Systematic pattern failure** | 📝 Update APML prompt → Regenerate |
| **Only MEDIUM/LOW** | ✅ Ship it (regeneration may not improve) |

### Multi-Attempt Strategy

When using non-deterministic agents:

1. **Generate Attempt 1** → Validate → Record scores
2. **Generate Attempt 2** → Validate → Record scores
3. **Generate Attempt 3** → Validate → Record scores
4. **Compare all attempts:**
   - Fewest CRITICAL issues wins
   - Tie-breaker: Fewest HIGH issues
   - Tie-breaker: Lowest total issues
5. **Select best attempt**

**Automated by:** `process-phase-3-with-validation.cjs`

---

## 📖 Example Session

```bash
$ cd /vfs/courses
$ node process-phase-3-with-validation.cjs spa_for_eng_30seeds --max-attempts=3

════════════════════════════════════════════════════════════
Processing: spa_for_eng_30seeds
Max Attempts: 3
════════════════════════════════════════════════════════════

─── Attempt 1 of 3 ───

Phase 3: LEGO Generation
✓ Found LEGO_BREAKDOWNS_COMPLETE.json

Phase 3.9: Quality Validation

SUMMARY
  Total Issues: 12
  CRITICAL: 3
  HIGH: 5
  MEDIUM: 2
  LOW: 2

❌ VALIDATION FAILED

⚠️  Attempt 1 has 3 CRITICAL and 5 HIGH issues
Proceeding to attempt 2...

─── Attempt 2 of 3 ───

  Backed up to: LEGO_BREAKDOWNS_COMPLETE.backup_attempt1.json

Phase 3: LEGO Generation
✓ Found LEGO_BREAKDOWNS_COMPLETE.json

Phase 3.9: Quality Validation

SUMMARY
  Total Issues: 2
  CRITICAL: 0
  HIGH: 0
  MEDIUM: 0
  LOW: 2

✅ VALIDATION PASSED - No critical or high-priority issues

✅ SUCCESS - Validation passed on attempt 2
```

---

## 🔍 Common Validation Failures & Fixes

### 1. **FD_CONTEXT_MISSING** (Subjunctive without context)

**Issue:**
```json
{
  "lego_id": "S0029L03",
  "target_chunk": "pueda",
  "known_chunk": "I can",
  "fd_validated": true
}
```

**Problem:** "pueda" is subjunctive, FD_LOOP fails: pueda → I can → puedo ❌

**Fix:**
```json
{
  "lego_id": "S0029L03",
  "target_chunk": "en cuanto pueda",
  "known_chunk": "as soon as I can",
  "fd_validated": true
}
```

### 2. **IRON_RULE_VIOLATION** (Standalone preposition)

**Issue:**
```json
{
  "lego_id": "S0001L04",
  "target_chunk": "con",
  "known_chunk": "with",
  "fd_validated": true
}
```

**Problem:** Standalone preposition without object

**Fix:**
```json
{
  "lego_id": "S0001L04",
  "target_chunk": "con te",
  "known_chunk": "with you",
  "fd_validated": true
}
```

### 3. **TRANSLATION_MISMATCH**

**Issue:** LEGO breakdown uses old translation that doesn't match `translations.json`

**Fix:** Regenerate LEGOs using updated `translations.json`

---

## 📚 Related Documentation

- **Full Process:** `/docs/LEGO_Quality_Validation_Process.md`
- **APML Spec:** `/ssi-course-production.apml` (Phase 3.9 section)
- **Validation Script:** `/vfs/courses/validate-lego-breakdowns.cjs`
- **Orchestration:** `/vfs/courses/process-phase-3-with-validation.cjs`

---

## ✅ Pre-Ship Checklist

Before shipping LEGO decompositions to production:

- [ ] Run `validate-lego-breakdowns.cjs <course>`
- [ ] **0 CRITICAL issues**
- [ ] **0 HIGH issues**
- [ ] MEDIUM issues reviewed (acceptable for release)
- [ ] Spot-check 5-10 random seeds manually
- [ ] S0028-S0029 specifically reviewed (common failure points)
- [ ] Translations sync with `translations.json`
- [ ] All seeds have English translations in known_chunk

---

## 🎓 Agent Prompt Integration

When generating LEGOs, include in Phase 3 agent prompt:

```
Your output will be automatically validated for:
- FD_LOOP compliance (CRITICAL)
- IRON RULE enforcement (CRITICAL)
- Translation synchronization (CRITICAL)
- CHUNK UP principle (HIGH)
- Structure completeness (HIGH)

Focus especially on:
1. Subjunctive forms → Must include temporal context (e.g., "en cuanto pueda")
2. Standalone prepositions → Must include objects (e.g., "con te" not "con")
3. Gender-ambiguous words → Must include nouns (e.g., "su nombre" not "su")
4. fd_validated field → Must be true for ALL LEGOs in output

Aim for ZERO CRITICAL/HIGH issues.
```

---

## 🚀 Quick Start

```bash
# Navigate to courses directory
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses

# Option 1: Just validate existing LEGOs
node validate-lego-breakdowns.cjs spa_for_eng_30seeds

# Option 2: Full workflow with auto-retry
node process-phase-3-with-validation.cjs spa_for_eng_30seeds --max-attempts=3

# Option 3: Batch validate all courses
node validate-lego-breakdowns.cjs --all
```

---

**Status:** ✅ All 4 current languages (spa/ita/fra/cmn) pass validation
**Last Run:** 2025-10-15
**Next Steps:** Apply to seeds 31-100, then full 668-seed courses
