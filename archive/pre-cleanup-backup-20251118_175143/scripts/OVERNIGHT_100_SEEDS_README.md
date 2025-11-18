# Overnight 100-Seed Course Generation Guide

## Overview

This guide walks you through generating complete course material for **seeds 1-100** in both **Spanish** and **Chinese**, incorporating all the learnings from recent sessions.

**Estimated Total Time**: 6-8 hours (depending on orchestrator performance)

---

## 🎯 What This Generates

For **both** `spa_for_eng_s0001-0100` and `cmn_for_eng_s0001-0100`:

1. ✅ **Phase 1**: Pedagogical translations (seed_pairs.json)
   - Cognate-first approach for Spanish
   - Simplicity-first for Chinese
   - Array format: `[known, target]` enforced

2. ✅ **Phase 3**: LEGO extraction (lego_pairs.json)
   - Word-level breakdowns
   - Component arrays: `[target, known]` (teaching format)
   - All other arrays: `[known, target]`

3. ✅ **Phase 5**: Practice baskets (seed_*.json files)
   - 12-15 phrases per LEGO
   - 70% window coverage validation
   - Compact one-line-per-phrase format
   - Grammar-reviewed and validated

---

## 🚀 Quick Start (Automated)

```bash
# STEP 1: Prepare Phase 1 batches
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean
bash scripts/OVERNIGHT_AUTO_100.sh
```

This creates orchestrator batches for both courses. Then follow the pipeline steps below.

---

## 📋 Complete Pipeline Steps

### STEP 1: Phase 1 Translation (Initial Setup)

```bash
bash scripts/OVERNIGHT_AUTO_100.sh
```

**Output**:
- `public/vfs/courses/spa_for_eng_s0001-0100/orchestrator_batches/phase1/`
- `public/vfs/courses/cmn_for_eng_s0001-0100/orchestrator_batches/phase1/`

**What it does**:
- Creates 3 orchestrator batches per course (3 orchestrators × 10 sub-agents = 30 concurrent)
- Each batch handles ~33 seeds (100 ÷ 3)
- Batches are ready to run

---

### STEP 2: Run Phase 1 Orchestrators ⚠️ MANUAL

**For each course, run the 3 orchestrator batches:**

```bash
# Spanish - 3 orchestrators
# Chinese - 3 orchestrators
# Total: 6 orchestrator runs (can run in parallel if you have capacity)
```

**Expected time**: 1-2 hours

**Output**:
- `public/vfs/courses/spa_for_eng_s0001-0100/seed_pairs.json`
- `public/vfs/courses/cmn_for_eng_s0001-0100/seed_pairs.json`

**Validation checklist**:
- ✅ 100 seeds translated in each file
- ✅ Array format is `[known, target]` (English first)
- ✅ Spanish uses cognates (frecuentemente, intentar, etc.)
- ✅ Chinese uses simple high-frequency characters

---

### STEP 3: Prepare Phase 3 Batches

```bash
bash scripts/prepare_phase3_batches.sh
```

**What it does**:
- Reads seed_pairs.json from each course
- Creates LEGO extraction batches
- Prepares orchestrator input files

**Output**:
- `public/vfs/courses/spa_for_eng_s0001-0100/orchestrator_batches/phase3/`
- `public/vfs/courses/cmn_for_eng_s0001-0100/orchestrator_batches/phase3/`

---

### STEP 4: Run Phase 3 Orchestrators ⚠️ MANUAL

**For each course, run the Phase 3 orchestrator batches:**

```bash
# Spanish Phase 3 orchestrators
# Chinese Phase 3 orchestrators
```

**Expected time**: 2-3 hours

**Output**: Raw LEGO extraction batches in orchestrator_batches/phase3/outputs/

---

### STEP 5: Phase 3 Post-Processing

```bash
bash scripts/phase3_postprocess.sh
```

**What it does**:
- Merges all LEGO batches
- Deduplicates LEGOs across seeds
- Builds LEGO registry
- Fixes array order (components stay `[target, known]`, everything else `[known, target]`)

**Output**:
- `public/vfs/courses/*/phase3_outputs/lego_pairs_deduplicated_final.json`

**Expected time**: 2-5 minutes

---

### STEP 6: Prepare Phase 5 Scaffolds

```bash
bash scripts/prepare_phase5_scaffolds.sh
```

**What it does**:
- Reads deduplicated LEGO pairs
- Creates practice basket scaffolds with sliding window
- One scaffold per seed

**Output**:
- `public/vfs/courses/*/phase5_outputs/seed_s*.json` (100 files per course)

**Expected time**: 5-10 minutes

---

### STEP 7: Run Phase 5 Orchestrators ⚠️ MANUAL

**For each course, run basket generation on all 100 scaffolds:**

```bash
# Spanish: 100 scaffold files → 100 basket generation tasks
# Chinese: 100 scaffold files → 100 basket generation tasks
```

**Strategy**: Batch in groups of 10-20 to avoid overwhelming the system

**Expected time**: 2-3 hours

**Output**: Completed basket files with practice_phrases filled in

---

### STEP 8: Phase 5 Post-Processing & Validation

```bash
bash scripts/phase5_postprocess.sh
```

**What it does**:
- Merges all baskets
- Grammar review pass
- Converts to compact format (one line per phrase)
- Fixes array order
- Validates window coverage (≥70% from recent 10 seeds)
- Runs gate validator

**Output**:
- Final basket files in `phase5_outputs/`
- Validation reports in `logs/phase5_postprocess_*/`

**Expected time**: 5-10 minutes

---

## 📊 Quality Checks

After completion, review:

### 1. Window Coverage Report
```bash
# Check logs/phase5_postprocess_*/window_*.log
# Look for: "X/100 seeds passed (≥70% window coverage)"
# Target: 90%+ pass rate
```

### 2. Gate Validation Report
```bash
# Check logs/phase5_postprocess_*/gates_*.log
# Look for vocabulary compliance, phrase distribution
```

### 3. Spot Checks

**Spanish S0001-S0010**:
```bash
# Check recent seed vocabulary is being reused
# Verify cognate preference (frecuentemente, intentar, practicar)
# Confirm practice phrases are natural and meaningful
```

**Chinese S0001-S0010**:
```bash
# Check character simplicity in early seeds
# Verify high-frequency patterns
# Confirm practice phrases make sense
```

### 4. Compare Across Languages
```bash
# Compare approach differences:
# - Spanish: Cognate-driven
# - Chinese: Simplicity-driven
# Both should show progressive complexity
```

---

## 🔧 Troubleshooting

### Issue: Phase 1 orchestrators failing

**Check**:
- Canonical seeds API is accessible
- Course code matches directory name
- Target/known language codes are correct

**Fix**:
```bash
# Verify canonical seeds
cat public/vfs/courses/*/orchestrator_batches/phase1/orch_01.json
```

### Issue: Window coverage too low (<70%)

**Likely cause**: Practice phrases not using enough recent vocabulary

**Fix**:
- Review Phase 5 intelligence doc examples
- Re-run specific seed baskets that failed
- Check if new LEGO vocabulary is being excluded correctly

### Issue: Array order violations

**Check**:
```bash
# Should show [known, target] everywhere except components
grep -A 2 "seed_pair" public/vfs/courses/*/seed_pairs.json | head -20
```

**Fix**:
```bash
# Re-run array fixer
node scripts/fix_array_order.cjs spa_for_eng_s0001-0100 phase1
node scripts/fix_array_order.cjs cmn_for_eng_s0001-0100 phase1
```

---

## 📁 Output Structure

```
public/vfs/courses/
├── spa_for_eng_s0001-0100/
│   ├── seed_pairs.json                    # Phase 1 output
│   ├── phase3_outputs/
│   │   └── lego_pairs_deduplicated_final.json
│   └── phase5_outputs/
│       ├── seed_s0001.json                # 100 basket files
│       ├── seed_s0002.json
│       └── ...
│
└── cmn_for_eng_s0001-0100/
    ├── seed_pairs.json
    ├── phase3_outputs/
    │   └── lego_pairs_deduplicated_final.json
    └── phase5_outputs/
        ├── seed_s0001.json
        ├── seed_s0002.json
        └── ...
```

---

## ✅ Success Criteria

At the end, you should have:

- [x] 100 Spanish translations (cognate-optimized)
- [x] 100 Chinese translations (simplicity-optimized)
- [x] ~300-500 deduplicated LEGOs per language
- [x] 100 practice baskets per language (12-15 phrases each)
- [x] 90%+ window coverage validation pass rate
- [x] All arrays in correct format
- [x] Grammar-reviewed and validated outputs

---

## 🎉 Completion

When all steps are done:

1. **Review validation reports** in logs/
2. **Spot-check** 5-10 random seeds in each language
3. **Compare** Spanish vs Chinese approaches
4. **Test** with frontend integration
5. **Celebrate** 🎊 - You've generated 200 complete seed units!

---

## 📝 Notes

- **Parallelization**: Steps 2, 4, and 7 can run Spanish and Chinese in parallel if you have the compute capacity
- **Checkpointing**: Each step produces durable output, so you can pause and resume
- **Logs**: All logs are timestamped and saved for debugging
- **Array Convention**: Enforced at Phase 1, Phase 3, and Phase 5 post-processing

---

**Good luck with your overnight run! 🚀**
