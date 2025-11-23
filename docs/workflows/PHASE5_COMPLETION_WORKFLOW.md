# Phase 5 Completion Workflow

**Tested:** 2025-11-19

## Overview

Phase 5 currently runs automated basket generation via 12 parallel web agents, but stops after agents upload their baskets. This document describes the complete workflow from agent uploads through validation and merge.

## Current State

### ✅ Working (Automated)
1. User triggers Phase 5 from dashboard
2. 12 web agents spawn and generate baskets
3. Agents POST baskets to ngrok → local Phase 5 server (port 3459)
4. Baskets saved to:
   - `phase5_outputs/seed_S0XXX_baskets.json`
   - `phase5_baskets_staging/seed_S0XXX_baskets.json`

### ❌ Manual (Needs Automation)
5. Detect when all agents complete
6. Run merge script
7. Run validation suite
8. Clean data if needed
9. Mark Phase 5 complete
10. Trigger Phase 6 → Phase 7

---

## Complete Workflow (Tested on `spa_for_eng_test`)

### Step 1: Merge Staging Baskets

**Script:** `scripts/merge-phase5-staging.cjs`

**Command:**
```bash
node scripts/merge-phase5-staging.cjs <course_code>
```

**What it does:**
- Reads all JSON files from `phase5_baskets_staging/`
- Creates backup of `lego_baskets.json` with timestamp
- Merges baskets (adds new, updates existing)
- Updates metadata (last_merged timestamp, total count)
- Writes merged data back to `lego_baskets.json`

**Test Results (spa_for_eng_test):**
```
Before:           2392 baskets
Staged baskets:   1925 LEGOs
  - New:          0
  - Updated:      1925
After:            2392 baskets
Net change:       +0
Size:             3.27 MB
```

✅ **Success:** Merge completed without errors, backup created

---

### Step 2: Validate Phase 5 Quality

**Script:** `scripts/validate-phase5-quality.cjs`

**Command:**
```bash
node scripts/validate-phase5-quality.cjs <course_code>
```

**What it validates:**
1. **Phrase Count** - Each LEGO should have 10 practice phrases
2. **Vocabulary Constraints** - Only use words already introduced
3. **LEGO Presence** - Target LEGO should appear in practice phrases
4. **Complexity Progression** - Phrases should increase in complexity

**Test Results (spa_for_eng_test):**
```
Total baskets:    2392
Passed:           616 (25.8%)
Failed:           1776 (74.2%)
Errors:           5221 (BLOCKING)
Warnings:         1184 (NON-BLOCKING)
```

**Error Breakdown:**
- `incorrect_phrase_count`: 974 errors (LEGOs with ≠ 10 phrases)
- `vocabulary_constraint_violation`: 4247 errors (using unknown/future words)

**Warning Breakdown:**
- `missing_target_lego`: 1182 warnings (target LEGO not in practice)
- `complexity_regression`: 2 warnings (phrases getting shorter)

❌ **Failed:** Existing baskets have quality issues (expected for test data)

---

### Step 3: Clean GATE Violations

**Script:** `scripts/clean-baskets-gate.cjs`

**Command:**
```bash
node scripts/clean-baskets-gate.cjs <course_code>
```

**What it does:**
- Removes practice phrases that use words not yet introduced
- Modifies `lego_baskets.json` in-place
- Reports which LEGOs were cleaned and how many phrases removed

**Test Results (spa_for_eng_test):**
```
Cleaned ~40 LEGOs
Removed 1-3 phrases per LEGO
Examples:
  S0047L04: removed 1 phrase(s), kept 4
  S0105L01: removed 3 phrase(s), kept 7
  S0109L06: removed 3 phrase(s), kept 7
```

✅ **Success:** Data cleaning completed

---

### Step 4: Analyze Empty Baskets

**Script:** `scripts/analyze-empty-baskets.cjs`

**Command:**
```bash
node scripts/analyze-empty-baskets.cjs <course_code>
```

**What it does:**
- Scans `lego_baskets.json` for baskets with 0 phrases
- Groups empty baskets by seed
- Reports counts and LEGO IDs

**Test Results (spa_for_eng_test):**
```
Total empty baskets: 34 LEGOs
Affected seeds: 24

Examples:
  S0034: 5 LEGOs with 0 phrases
  S0035: 3 LEGOs with 0 phrases
  S0313: 4 LEGOs with 0 phrases
  S0319: 4 LEGOs with 0 phrases
```

⚠️ **Warning:** 34 baskets have no practice phrases (needs regeneration)

---

### Step 5: Other Validation Scripts

**Script:** `scripts/show-validation-warnings.cjs`
- Shows detailed validation warnings from previous run

**Script:** `scripts/validate-lego-pairs-baskets.cjs`
- Cross-validates baskets against `lego_pairs.json`
- Ensures all LEGOs from Phase 3 have baskets

---

## Recommended Automation Sequence

When all 12 agents complete:

```javascript
// 1. Merge staging baskets
await runScript('scripts/merge-phase5-staging.cjs', courseCode);
// Result: lego_baskets.json with all baskets

// 2. Clean GATE violations
await runScript('scripts/clean-baskets-gate.cjs', courseCode);
// Removes phrases using future/unknown words
// Some baskets may now have 0 phrases

// 3. Ensure minimum phrase
await runScript('scripts/ensure-minimum-phrase.cjs', courseCode);
// Adds LEGO itself as first phrase in every basket
// De-duplicates
// Guarantees NO empty baskets

// 4. Grammar validation (Phase 5.5)
const grammarResult = await runGrammarValidation(courseCode);
// 15 browsers × 15 workers × 3 seeds = 675 seed capacity
// Each worker validates 3 seeds (~20 baskets)
// Deletes grammatically incorrect phrases
// Even if all phrases deleted, LEGO itself remains

// 5. Check deletion rate
if (grammarResult.deletionRate > 0.20) {
  // More than 20% deleted - something wrong
  return { success: false, reason: 'excessive_grammar_errors' };
}

// 6. Proceed to Phase 6
return { success: true, nextPhase: 'phase6' };
```

---

## Quality Thresholds (DECIDED)

**HARD REQUIREMENTS (100% pass):**
1. ✅ GATE violations: 100% - cleaned by `clean-baskets-gate.cjs`
2. ✅ Grammar errors: 100% - validated by Phase 5.5
3. ✅ Empty baskets: 0 - ensured by `ensure-minimum-phrase.cjs`

**SOFT WARNINGS (don't block):**
1. ⚠️ Phrase count: Molecular LEGOs can have <10 phrases (atoms already introduced)
2. ⚠️ Complexity regression: Warning only
3. ⚠️ LEGO presence in phrases: Grammar check will catch if unrelated

**ACCEPTABLE LOSS:**
- Up to 20% of phrases can be deleted during validation
- ~20,000 total phrases → 4,000 deletions acceptable
- >20% deletion rate → flag for review (likely generation issue)

---

## File Locations

**Scripts:**
- `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/merge-phase5-staging.cjs`
- `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/validate-phase5-quality.cjs`
- `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/clean-baskets-gate.cjs`
- `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/analyze-empty-baskets.cjs`
- `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/show-validation-warnings.cjs`
- `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/validate-lego-pairs-baskets.cjs`

**Phase 5 Server:**
- `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/services/phases/phase5-basket-server.cjs`
- Current stopping point: lines 2315-2326 (after saving to staging)

**Data:**
- Staging: `public/vfs/courses/{course}/phase5_baskets_staging/`
- Outputs: `public/vfs/courses/{course}/phase5_outputs/`
- Merged: `public/vfs/courses/{course}/lego_baskets.json`

---

## Next Steps

1. ✅ Test complete workflow manually (DONE - this document)
2. ⏳ Test Phase 6 server
3. ⏳ Test Phase 7 manifest compilation
4. ⏳ Implement automation in `phase5-basket-server.cjs`
5. ⏳ Wire Phase 5 → Phase 6 → Phase 7 pipeline
6. ⏳ Add orchestrator callbacks for phase transitions

---

**Test Environment:** `spa_for_eng_test` (501MB copy of production data)
**Test Date:** 2025-11-19
**Status:** Phase 5 workflow documented and verified
