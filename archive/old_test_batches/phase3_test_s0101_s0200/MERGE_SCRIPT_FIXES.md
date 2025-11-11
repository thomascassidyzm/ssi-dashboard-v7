# Phase 3 Merge Script - Quality Improvements

## The Problem

After running 10 parallel agents for S0101-S0200 extraction, validation found:
- **61 errors:** Missing components on M-type referenced LEGOs
- **36 errors:** Invalid type codes ("B" and "C" instead of "A" and "M")

## Root Causes

### 1. Missing Components on Referenced M-types

**What happened:**
- Agents correctly identified existing LEGOs (e.g., "la respuesta" from S0066L03)
- They marked them as references with `ref: "S0066"`
- But they didn't include the `components` field

**Why this happened:**
- Agents didn't copy component data from registry
- Merge script only included components if agent provided them

**Example of the issue:**
```json
{
  "id": "S0066L03",
  "type": "M",
  "target": "la respuesta",
  "known": "the answer",
  "ref": "S0066"
  // ❌ Missing: "components": [["la", "the"], ["respuesta", "answer"]]
}
```

### 2. Type Code Mismatch

**What happened:**
- Agent 10 used "B" (Base) and "C" (Composite) instead of "A" and "M"
- This is a valid alternative terminology but not standard for our system

**Why this happened:**
- Agent interpreted Phase 3 methodology differently
- Used different naming convention for LEGO types

## The Solutions

### Solution 1: Auto-Fill Components from Registry

**Location:** `scripts/phase3_merge_batches.cjs` lines 101-113

**What it does:**
```javascript
// For M-type LEGOs, ensure components are included (pull from registry if needed)
const components = lego.components || existing.components || null;

processedSeed.legos.push({
  id: existing.id,
  type: normalizedType,
  target: lego.target,
  known: lego.known,
  ref: existing.seed_id,
  ...(normalizedType === 'M' && components && { components })
});
```

**How it works:**
1. When processing a referenced LEGO, check if agent provided components
2. If not, pull from `existing.components` (from S0001-S0100 registry)
3. Only include components for M-type LEGOs
4. Automatically fills 98% of missing components

**Result:** 61 errors → 1 error (98% improvement)

### Solution 2: Type Normalization

**Location:** `scripts/phase3_merge_batches.cjs` lines 97-98

**What it does:**
```javascript
// Normalize type (some agents may use B/C instead of A/M)
const normalizedType = lego.type === 'B' ? 'A' : lego.type === 'C' ? 'M' : lego.type;
```

**Mapping:**
- `B` (Base) → `A` (Atomic)
- `C` (Composite) → `M` (Molecular)
- `A`, `M` → unchanged

**Result:** 36 type errors → 0 errors (100% fixed)

## For Next Time

### Agent Prompts - What Changed

**Before:**
- Agents needed to copy full LEGO data including components when referencing

**After:**
- Agents just need to mark: `"ref": "S00XX"`, `"type": "M"`
- Merge script automatically fills in components
- Type codes "B" and "C" are automatically normalized

**Benefit:** Simpler agent prompts, more robust merging

### Quality Metrics After Fixes

**Validation Results:**
- ✅ **Total LEGOs:** 485 (273 new, 212 ref)
- ✅ **Type distribution:** 57% Atomic, 43% Molecular
- ✅ **Reuse rate:** 44%
- ✅ **Errors:** 1 (down from 97)
- ⚠️ **Warnings:** 167 (mostly validator path issues)

**Remaining Issues:**
1. One genuinely missing component in S0180 "por un rato" (agent error)
2. Reference validation warnings (validator needs full registry access)

## Testing the Fixes

To verify the improvements work:

```bash
# Re-run merge with fixes
node scripts/phase3_merge_batches.cjs

# Validate output
node scripts/validate_lego_pairs.cjs phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json
```

**Expected results:**
- Components auto-filled for all referenced M-types ✅
- All type codes normalized to A/M ✅
- Only legitimate agent errors remain

## Architecture Improvements

### Before (Fragile)
```
Agent Output → Merge Script → Validation
     ↓              ↓              ↓
 Missing data   Passes through  61 errors
```

### After (Robust)
```
Agent Output → Merge Script (smart) → Validation
     ↓         Auto-fill components      ↓
 Missing data  Normalize types        1 error
```

## Conclusion

The merge script now:
1. ✅ Auto-fills missing components from registry
2. ✅ Normalizes type terminology variations
3. ✅ Reduces errors by 98% (97 → 1)
4. ✅ Makes agent prompts simpler
5. ✅ More robust for future extractions

**Grade improvement:** B+ → A- (Nearly production-ready)
