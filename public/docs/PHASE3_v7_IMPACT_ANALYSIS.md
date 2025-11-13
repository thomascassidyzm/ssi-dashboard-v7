# Phase 3 v7.0 Impact Analysis

**Date**: 2025-11-13
**APML Version**: v8.1.1
**Phase 3 Version**: v7.0 (Two Heuristics Edition) ✅

---

## 🎯 Summary

Phase 3 v7.0 introduced a **hierarchical format** for `lego_pairs.json` that impacts downstream phases. This document analyzes:

1. ✅ **Quick Test** - Works for all phases (random 10 seeds)
2. 🔄 **Format Changes** - New hierarchical structure (seed_pair → legos)
3. 📊 **Phase 5 Impact** - How Phase 5 reads and uses the new format

---

## 1. Quick Test Functionality

### Current Implementation (CourseGeneration.vue:735-748)

```javascript
const quickTest = () => {
  segmentMode.value = 'single'
  courseSize.value = 'test'

  // Random 10 seeds from full course (1-668)
  const randomStart = Math.floor(Math.random() * (668 - 10 + 1)) + 1
  startSeed.value = randomStart
  endSeed.value = randomStart + 9

  console.log(`[Quick Test] Random seeds: S${String(randomStart).padStart(4, '0')}-S${String(randomStart + 9).padStart(4, '0')}`)

  // Auto-start generation with current phase
  startGeneration()
}
```

### ✅ Phase-Agnostic Design

The quick test is **phase-agnostic** by design:
- Uses currently selected phase (`phaseSelection.value`)
- Works with any phase: 1, 3, 5, 6, 7
- Generates random 10-seed range (e.g., S0482-S0491)
- Uses 5 parallel agents for speed

### Testing Phase 5 with Quick Test

**Steps:**
1. Select Phase 5 in dashboard
2. Click "Quick Test (10 seeds)"
3. Random range selected (e.g., S0234-S0243)
4. Phase 5 orchestrator reads from hierarchical `lego_pairs.json`
5. Generates baskets for those 10 seeds

**Expected behavior**: Phase 5 reads hierarchical format and extracts LEGOs for the specified seed range.

---

## 2. Phase 3 v7.0 Format Changes

### Old Format (Pre-v7.0): Flat LEGO List

```json
{
  "version": "8.1.1",
  "phase": "3",
  "total_legos": 2965,
  "legos": [
    {
      "id": "S0001L01",
      "type": "A",
      "target": "quiero",
      "known": "I want",
      "new": true,
      "seed_id": "S0001"
    }
  ]
}
```

**Characteristics:**
- Flat array of all LEGOs
- Seed context in each LEGO
- No seed_pair included
- Requires external seed_pairs.json lookup

### New Format (v7.0): Hierarchical seed_pair → legos

```json
{
  "version": "8.1.1",
  "phase": "3",
  "methodology": "Phase 3 v7.0 - Two Heuristics Edition",
  "generated_at": "2025-11-13T03:34:38.562Z",
  "course": "spa_for_eng",
  "total_seeds": 668,
  "total_legos": 2965,
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": [
        "I want to speak Spanish with you now.",
        "Quiero hablar español contigo ahora."
      ],
      "legos": [
        {
          "id": "S0001L01",
          "type": "A",
          "target": "quiero",
          "known": "I want",
          "new": true
        },
        {
          "id": "S0001L02",
          "type": "M",
          "target": "quiero hablar",
          "known": "I want to speak",
          "new": true,
          "components": [
            ["quiero","I want"],
            ["hablar","to speak"]
          ]
        }
      ]
    }
  ]
}
```

**Characteristics:**
- Hierarchical: `seeds` array with nested `legos`
- Each seed includes `seed_pair` (English/Spanish sentences)
- Complete standalone document (no external lookups needed)
- Compact component arrays: `["target","known"]` on single lines
- 896 KB file size (668 seeds, 2,965 LEGOs)

---

## 3. Phase 5 Impact Analysis

### Phase 5 Input Requirements

Phase 5 needs:
1. **Seed pairs** - Full English/Spanish sentences for context
2. **LEGOs** - Vocabulary units with type, target, known
3. **Recent seed context** - Last 10 seeds for sliding window
4. **Incremental availability** - LEGOs available at each step

### How Phase 5 Reads lego_pairs.json

**Current Phase 5 logic** (from phase_5_lego_baskets.md):

Phase 5 receives a **SCAFFOLD JSON** containing:
- `seed_pair`: Current seed being taught
- `recent_seed_pairs`: Last 10 seeds with their LEGOs
- `legos`: LEGOs to teach with incremental availability

**Example scaffold structure:**
```json
{
  "seed_id": "S0010",
  "seed_pair": {
    "known": "I'm not sure if I can remember the whole sentence.",
    "target": "No estoy seguro si puedo recordar toda la oración."
  },
  "recent_seed_pairs": {
    "S0001": [
      ["I want to speak Spanish with you now.","Quiero hablar español contigo ahora."],
      [["S0001L01","I want","quiero"],["S0001L02","to speak","hablar"]]
    ]
  },
  "legos": {
    "S0010L01": {
      "lego": ["if","si"],
      "type": "A",
      "practice_phrases": []
    }
  }
}
```

### 🔄 Required Changes for Phase 5

**Phase 5 orchestrator needs to:**

1. **Read hierarchical format** - Navigate `seeds` array instead of flat `legos` array
2. **Extract seed_pair** - Use embedded seed_pair instead of external lookup
3. **Build recent_seed_pairs** - Extract from hierarchical structure
4. **Filter by seed range** - For quick tests (e.g., S0482-S0491)

**Pseudocode for Phase 5 orchestrator:**
```javascript
// OLD (flat format)
const allLegos = legoData.legos
const seedLegos = allLegos.filter(l => l.seed_id === targetSeedId)
const seedPair = await loadSeedPairsJson() // External file

// NEW (hierarchical format)
const allSeeds = legoData.seeds
const targetSeed = allSeeds.find(s => s.seed_id === targetSeedId)
const seedLegos = targetSeed.legos
const seedPair = targetSeed.seed_pair // Embedded!
```

### Benefits for Phase 5

✅ **Embedded seed_pair** - No external `seed_pairs.json` lookup
✅ **Complete context** - All data in one file
✅ **Sliding window** - Easy to extract recent 10 seeds
✅ **Cleaner orchestration** - Single file read
✅ **Random seed tests** - Works seamlessly with hierarchical structure

---

## 4. Format Compatibility Matrix

| Phase | Old Format Support | New Format Support | Migration Needed? |
|-------|-------------------|-------------------|-------------------|
| Phase 1 | N/A | N/A | No (generates seed_pairs.json) |
| Phase 3 | ❌ Deprecated | ✅ v7.0 | No (generates new format) |
| Phase 4 | ⚠️ Needs update | ⚠️ Needs update | **Yes** |
| Phase 5 | ⚠️ Needs update | ⚠️ Needs update | **Yes** |
| Phase 6 | ⚠️ Needs update | ⚠️ Needs update | **Yes** |
| Phase 7 | ⚠️ Needs update | ⚠️ Needs update | **Yes** |

---

## 5. Migration Checklist for Phase 5

### Phase 5 Orchestrator Updates

- [ ] Update `lego_pairs.json` reader to handle hierarchical format
- [ ] Extract `seed_pair` from embedded structure (not external file)
- [ ] Build `recent_seed_pairs` from `seeds` array
- [ ] Filter seeds by range for quick tests (e.g., S0482-S0491)
- [ ] Update scaffold generator to use new format
- [ ] Test with quick test (random 10 seeds)

### Phase 5 Prompt Updates

- [ ] Confirm prompt still matches scaffold structure
- [ ] Verify `recent_seed_pairs` format in examples
- [ ] Update any references to flat LEGO structure

### Testing Strategy

1. **Quick test with random 10 seeds** (e.g., S0234-S0243)
2. **Verify scaffold generation** from hierarchical format
3. **Check recent_seed_pairs** extraction (last 10 seeds)
4. **Validate basket output** format
5. **Full 668-seed run** after successful test

---

## 6. Output Format Considerations

### Phase 3 Output: lego_pairs.json (NEW)
- **Structure**: Hierarchical (seed_pair → legos)
- **Size**: 896 KB
- **Format**: Compact component arrays
- **Location**: `public/vfs/courses/spa_for_eng/lego_pairs.json`

### Phase 5 Output: lego_baskets.json (EXISTING)
- **Structure**: Should match hierarchical pattern?
- **Question**: Should baskets also use seed → baskets hierarchy?

**Proposed Phase 5 output format:**
```json
{
  "version": "8.1.1",
  "phase": "5",
  "methodology": "Phase 5 v3.0 - Sliding Window",
  "course": "spa_for_eng",
  "total_seeds": 668,
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": ["English", "Spanish"],
      "baskets": [
        {
          "lego_id": "S0001L01",
          "lego": ["I want", "quiero"],
          "type": "A",
          "practice_phrases": [
            ["I want to speak", "quiero hablar", null, 2]
          ]
        }
      ]
    }
  ]
}
```

**Benefits:**
- ✅ Consistent with Phase 3 format
- ✅ Complete standalone document
- ✅ Easy Phase 7 compilation (reads one hierarchical file)
- ✅ Seed context preserved throughout pipeline

---

## 7. Recommendations

### Immediate Actions

1. **✅ Quick test works for all phases** - No changes needed to test mechanism
2. **🔄 Update Phase 5 orchestrator** - Read hierarchical `lego_pairs.json`
3. **🔄 Consider hierarchical baskets** - Match Phase 3 format pattern
4. **🔄 Update Phases 4, 6, 7** - Handle new format consistently

### Long-term Strategy

**Standardize on hierarchical format** across all phases:
- Phase 1: `seed_pairs.json` → Already hierarchical (seed_id → pair)
- Phase 3: `lego_pairs.json` → ✅ Hierarchical (seed → legos)
- Phase 5: `lego_baskets.json` → 🔄 Migrate to hierarchical (seed → baskets)
- Phase 6: `introductions.json` → 🔄 Consider hierarchical structure
- Phase 7: `course_manifest.json` → Already hierarchical (final compilation)

**Benefits:**
- Consistent data architecture
- Standalone documents at each phase
- Easier orchestration (single file reads)
- Better for quick tests and debugging

---

## 8. Testing Protocol

### Quick Test for Phase 5

```bash
# 1. Select Phase 5 in dashboard
# 2. Click "Quick Test (10 seeds)"
# 3. Observe random seed range (e.g., S0482-S0491)
# 4. Check console logs for orchestrator behavior
# 5. Verify scaffold generation
# 6. Review basket output
```

### Expected Console Output

```
[Quick Test] Random seeds: S0482-S0491
[Phase 5] Reading lego_pairs.json
[Phase 5] Found 668 seeds in hierarchical format
[Phase 5] Filtering seeds S0482-S0491 (10 seeds)
[Phase 5] Extracting recent_seed_pairs (S0472-S0481)
[Phase 5] Building scaffolds for 10 seeds
[Phase 5] Agent 01: Seeds S0482-S0484 (3 seeds)
[Phase 5] Agent 02: Seeds S0485-S0487 (3 seeds)
[Phase 5] Agent 03: Seeds S0488-S0491 (4 seeds)
```

---

## 9. Version History

- **v7.0** (2025-11-13): Hierarchical `lego_pairs.json` format introduced
  - seed_pair → legos structure
  - Compact component arrays
  - Complete standalone document (896 KB)
  - Zero Pragmatic FD violations
  - Overlapping LEGOs for recombination power

- **v6.3** (2025-11-12): Flat LEGO format (deprecated)
  - Single legos array
  - External seed_pairs.json required

---

## 10. Conclusion

**Quick Test**: ✅ Works for all phases without modification

**Phase 5 Impact**: 🔄 Requires orchestrator update to read hierarchical format

**Benefits**:
- Cleaner data architecture
- Complete standalone documents
- Better testability
- Consistent across pipeline

**Next Steps**:
1. Update Phase 5 orchestrator to read hierarchical `lego_pairs.json`
2. Test with quick test (random 10 seeds)
3. Consider migrating Phase 5 output to hierarchical format
4. Standardize format across all phases

---

**Status**: Phase 3 v7.0 Complete ✅ | Phase 5 Update Pending 🔄
