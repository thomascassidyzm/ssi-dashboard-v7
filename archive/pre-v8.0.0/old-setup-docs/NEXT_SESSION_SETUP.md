# Setup Guide for S0201-S0668 LEGO Extraction

**Start Date:** 2025-11-07
**Previous Work:** S0001-S0200 completed (551 LEGOs)
**Remaining:** 468 seeds (S0201-S0668)

---

## Quick Start Commands

```bash
# 1. Navigate to project
cd /home/user/ssi-dashboard-v7

# 2. Pull latest changes
git fetch origin
git pull origin development

# 3. Checkout working branch
git checkout claude/incomplete-request-011CUsXry2xgxX1234in83at

# 4. Verify merge script has fixes
grep -A 3 "Normalize type" scripts/phase3_merge_batches.cjs
# Should see: const normalizedType = lego.type === 'B' ? 'A' : lego.type === 'C' ? 'M' : lego.type;

# 5. Check current status
git log --oneline -5
git status
```

---

## Extraction Plan: 3 Batches of 8 Agents

### Batch 1: S0201-S0360 (160 seeds)
- 8 agents × 20 seeds each
- Seeds need to be prepared and split into batch input files

### Batch 2: S0361-S0520 (160 seeds)
- 8 agents × 20 seeds each

### Batch 3: S0521-S0668 (148 seeds)
- 7 agents × 20 seeds (140 seeds)
- 1 agent × 8 seeds (S0661-S0668)

---

## What's Already Done

✅ **Validation Scripts Created:**
- `scripts/validation/check-gate-violations.js`
- `scripts/validation/check-speakability.js`
- `scripts/validation/check-conjunctions.js`
- `scripts/validation/run-all-checks.js`

✅ **Merge Script Fixed:**
- Auto-fills components for referenced M-type LEGOs
- Normalizes type codes (B→A, C→M)
- Reduced errors from 97 to 1 (98% improvement)

✅ **S0101-S0200 Extraction Complete:**
- 100 seeds processed
- 273 new LEGOs extracted
- 212 references from S0001-S0100
- Output: `phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json`

✅ **All Work Committed & Pushed:**
- Branch: `claude/incomplete-request-011CUsXry2xgxX1234in83at`
- Latest commits include merge script fixes

---

## Phase 3 Methodology (Use This)

**Core Principles:**

1. **FD (Functionally Deterministic):** IF IN DOUBT → CHUNK UP
   - ✅ "quiero" = "I want" (1:1, unambiguous)
   - ✅ "estoy intentando" = "I'm trying" (pattern, keep together)
   - ❌ "que" alone (ambiguous without context)

2. **Complete Tiling:** All LEGOs must reconstruct the seed

3. **Reference Existing:** Check registry for existing LEGOs
   - Registry location: Will need to be built from S0001-S0200

4. **Componentization:** M-type LEGOs need components
   - Example: `"components": [["estoy", "I am"], ["intentando", "trying"]]`
   - Note: Merge script now auto-fills from registry if missing

5. **Types:**
   - A (Atomic): Single word, unambiguous
   - M (Molecular): Multi-word OR pattern OR ambiguous if split
   - Note: B and C also work (merge script normalizes)

---

## Agent Prompt Template

Use this for each agent:

```
Extract LEGOs from Spanish seeds S0XXX-S0XXX using Phase 3 methodology.

**Input files:**
- Seeds: [path to seed batch file]
- Registry: [path to cumulative registry through S0200]

**Output:** [path to batch output file]

**Core Principles:**

1. **FD (Functionally Deterministic)**: If ambiguous → chunk up
2. **Complete Tiling**: All LEGOs must reconstruct the seed
3. **Reference Existing**: Check registry - if exists, mark with "ref": "S00XX"
4. **Componentization**: For M-type, include "components": [[word, translation], ...]
5. **Types**: A (atomic) or M (molecular)

**Output Format:**
{
  "batch_id": "S0XXX_S0XXX",
  "batch_number": X,
  "extractor": "Agent X",
  "extracted_at": "<timestamp>",
  "seeds": [
    {
      "seed_id": "S0XXX",
      "seed_pair": {"target": "...", "known": "..."},
      "legos": [
        {
          "provisional_id": "PROV_S0XXX_01" or "id": "S00XXL0X",
          "type": "A" or "M",
          "target": "Spanish",
          "known": "English",
          "new": true or false,
          "ref": "S00XX" (if reference),
          "components": [[...]] (if M-type and new)
        }
      ]
    }
  ]
}

Extract all seeds using bidirectional sweep. Ensure complete tiling and FD compliance.
```

---

## After Each Batch

**Workflow:**

1. **Merge outputs:**
   ```bash
   node scripts/phase3_merge_batches.cjs
   ```

2. **Validate:**
   ```bash
   node scripts/validate_lego_pairs.cjs [output_file]
   ```

3. **Review results:**
   - Check error count (should be near 0 with merge script fixes)
   - Review warnings (usually registry path issues, not data issues)

4. **Commit & Push:**
   ```bash
   git add .
   git commit -m "Complete Batch X: LEGO extraction for S0XXX-S0XXX"
   git push origin claude/incomplete-request-011CUsXry2xgxX1234in83at
   ```

5. **Proceed to next batch**

---

## Key Files & Locations

**Registry (for reference lookup):**
- S0001-S0100: `public/vfs/courses/spa_for_eng/lego_pairs.json`
- S0101-S0200: `phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json`
- Will need to build cumulative registry for S0201+

**Seed Files:**
- Full corpus: `public/vfs/courses/spa_for_eng/seed_pairs.json`
- Need to extract S0201-S0668 and split into batches

**Scripts:**
- Merge: `scripts/phase3_merge_batches.cjs`
- Validate: `scripts/validate_lego_pairs.cjs`
- All validation: `scripts/validation/`

**Previous Success:**
- Example: `phase3_test_s0101_s0200/` (good reference)

---

## Expected Results (Per Batch)

**Per 160-seed batch (~estimate):**
- New LEGOs: ~250-300
- References: ~100-150
- Reuse rate: ~40-50%
- Cumulative growth: ~1.5-2 new LEGOs per seed

**Quality Targets:**
- Complete tiling: 100%
- FD compliance: 100%
- Errors after merge: <5 (with fixes, was 1 for S0101-S0200)
- Warnings: 150-200 (mostly validator issues, acceptable)

---

## Important Notes

⚠️ **Merge script now handles:**
- Missing components on M-type references (auto-fills from registry)
- Type code variations (B→A, C→M normalization)
- This reduced errors by 98% in S0101-S0200

✅ **Agent prompts can be simpler:**
- Don't need to copy full component data for references
- Type codes B/C acceptable (auto-normalized)

✅ **Save after each batch:**
- Don't wait until all 468 seeds done
- Commit after each 160-seed batch
- Safer, allows quality checkpoints

---

## First Action

**TODO: Prepare Batch 1 infrastructure (S0201-S0360)**

1. Extract seeds S0201-S0360 from seed_pairs.json
2. Split into 8 files of 20 seeds each
3. Build cumulative registry (S0001-S0200 combined)
4. Set up batch output directory
5. Launch 8 agents in parallel

---

**Ready to go! Start with Batch 1: S0201-S0360**
