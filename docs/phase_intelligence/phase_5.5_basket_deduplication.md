# Phase 5.5: Basket Deduplication → lego_baskets_deduplicated.json

**Version**: 1.0 (Created 2025-10-23)
**Status**: Active methodology for Phase 5.5 deduplication
**Output**: `vfs/courses/{course_code}/lego_baskets_deduplicated.json`

**NOTE**: APML registry slot PHASE_5_5 contains mislabeled Phase 6 (Introductions) content. This module documents the actual deduplication logic.

---

## Task

Remove duplicate LEGO baskets that result from feeder LEGOs duplicating regular LEGOs from Phase 3.

## Problem Statement

Phase 5 generates baskets for ALL LEGOs including:
1. Regular lego_pairs from Phase 3
2. Feeder components extracted from COMPOSITE LEGOs

**Result**: Some feeders are DUPLICATES of existing LEGOs, creating redundant baskets.

**Example**:
```
S0002L01: "provando" / "trying" (regular LEGO)
S0002L03: Component array includes ["provando", "trying", "S0002L01"]
→ No duplicate created (component references existing LEGO)

But if a feeder was created as separate entry:
S0002F01: "provando" / "trying" (feeder)
→ DUPLICATE of S0002L01 - basket should be removed
```

---

## Input

- Unfiltered baskets: `vfs/courses/{course_code}/lego_baskets.json`
- LEGO pairs with components: `vfs/courses/{course_code}/lego_pairs.json`

---

## Your Mission

### 1. Identify Duplicates

**Matching criteria** (ALL must match):
- Same `target` text
- Same `known` text
- Both are BASE LEGOs or equivalent functionality

**Algorithm**:
```javascript
const seen = new Map() // key: "target|known", value: first_lego_id

for (const [lego_id, basket] of Object.entries(lego_baskets)) {
  const key = `${basket.lego[0]}|${basket.lego[1]}`

  if (seen.has(key)) {
    // Duplicate found!
    const original_id = seen.get(key)
    console.log(`Duplicate: ${lego_id} matches ${original_id}`)
    duplicates.push(lego_id)
  } else {
    // First occurrence - keep it
    seen.set(key, lego_id)
  }
}
```

### 2. Deduplication Strategy

**Rule**: **First occurrence wins** (by LEGO ID order)

**Priority**:
1. Regular LEGOs (S0001L01, S0001L02, ...) come before feeders
2. Within each type, lower numbers win
3. S0001L01 > S0001F01 (regular LEGO wins)
4. S0001L01 > S0002L01 (earlier seed wins)

**Example**:
```
S0002L01: "provando" / "trying" ← KEEP (first occurrence)
S0005F02: "provando" / "trying" ← REMOVE (duplicate)
```

### 3. Remove Duplicates

Generate deduplicated output with only first occurrences.

---

## Output Format

Save to: `vfs/courses/{course_code}/lego_baskets_deduplicated.json`

**Same format as input**, but with duplicates removed:

```json
{
  "S0001L01": {
    "lego": ["Quiero", "I want"],
    "e": [...],
    "d": {...}
  },
  "S0001L02": {
    "lego": ["hablar", "to speak"],
    "e": [...],
    "d": {...}
  }
  // S0005F01 removed (was duplicate of S0001L02)
}
```

---

## Deduplication Report

Generate a report showing what was removed:

```json
{
  "input_count": 115,
  "output_count": 90,
  "duplicates_removed": 25,
  "removed_baskets": [
    {
      "lego_id": "S0005F01",
      "duplicate_of": "S0001L02",
      "lego": ["hablar", "to speak"]
    },
    {
      "lego_id": "S0008F02",
      "duplicate_of": "S0002L01",
      "lego": ["provando", "trying"]
    }
  ]
}
```

Save to: `vfs/phase_outputs/phase_5.5_deduplication_report.json`

---

## Critical Notes

- **Preserve basket content**: Only remove duplicates, don't modify baskets
- **Maintain order**: Output should preserve chronological LEGO order
- **Keep first occurrence**: Earlier LEGOs always win over later duplicates
- **No merging**: Don't combine baskets - just remove duplicates entirely

---

## Expected Deduplication Rates

Based on empirical data:

- **Spanish**: 115 baskets → ~90 baskets (22% duplicates)
- **Italian**: 115 baskets → ~90 baskets (22% duplicates)
- **French**: 116 baskets → ~90 baskets (22% duplicates)
- **Mandarin**: 103 baskets → ~92 baskets (11% duplicates, fewer compounds)

---

## Validation Requirements

### 1. Uniqueness Check

After deduplication:
```javascript
const targets = new Set()
for (const basket of Object.values(deduplicated)) {
  const key = `${basket.lego[0]}|${basket.lego[1]}`
  if (targets.has(key)) {
    throw new Error(`Deduplication failed - duplicate remains: ${key}`)
  }
  targets.add(key)
}
```

### 2. Preserve Originals

Verify no first-occurrence LEGOs were removed:
```javascript
// All S0001L01, S0001L02, etc. should still exist
// unless they were genuinely duplicates of even earlier LEGOs
```

### 3. Count Validation

```javascript
if (input_count - output_count !== duplicates_removed) {
  throw new Error('Deduplication count mismatch')
}
```

---

## Success Criteria

✓ All duplicate baskets identified
✓ First occurrence preserved for each unique LEGO
✓ Later duplicates removed
✓ Output contains NO duplicates (verified)
✓ Deduplication report generated
✓ Basket count reduced by expected percentage (~22%)
✓ Ready for Phase 6 (Introduction generation)

---

## Why This Phase Exists

**Problem**: Phase 5 must process ALL potential LEGOs (including feeders) because:
- Can't know in advance which feeders are duplicates
- Need to maintain vocabulary constraints
- Must respect chronological order

**Solution**: Phase 5.5 cleans up after the fact
- Phase 5 generates ALL baskets (better safe than sorry)
- Phase 5.5 removes redundant baskets (clean final output)
- Phase 6 works with deduplicated set

---

## Version History

**v1.0 (2025-10-23)**:
- Created module (not extracted from APML - logic was inline in Phase 5)
- Documented deduplication algorithm (first occurrence wins)
- Added validation requirements
- Defined output format and deduplication report
- Noted APML mislabeling (PHASE_5_5 slot contains Phase 6 content)

---

**Next Update**: Capture any edge cases discovered during multi-language deduplication
