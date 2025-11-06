# Phase 3 v5.0 Migration Guide

**Date**: 2025-01-06
**Previous Version**: v7.7 (Type A/B/C/D classification)
**New Version**: v5.0 (Atomic/Molecular + Pattern Collections)

---

## Overview

Phase 3 v5.0 represents a complete methodological shift in LEGO extraction:

**Old Approach (v7.7):**
- Grammar-forward analysis
- Type A/B/C/D classification (complexity-based)
- Patterns as LEGO properties
- Post-extraction pattern identification

**New Approach (v5.0):**
- **Known Language First** - Start from learner's perspective
- **Atomic (A) / Molecular (M)** classification (structure-based)
- **Patterns as Collections** - Identified by observing LEGOs across seeds
- **Componentization** - Molecular LEGOs show internal structure
- **Pattern Instances** - Marked during extraction

---

## Key Concept Changes

### 1. Known Language First

**Old:** Analyze target language grammar → Extract LEGOs
**New:** Start from KNOWN language prompt → Ensure FD mapping → Extract LEGOs

**The Question:**
> "If I show the learner this KNOWN phrase, do they know exactly ONE correct TARGET response?"

If YES → Functionally Deterministic (FD) ✓
If NO → Chunk up until YES

**Example:**
```
KNOWN: "as" → TARGET: ??? (tan? como? tanto? ambiguous!)
Fix: Chunk up
KNOWN: "as hard as I can" → TARGET: "tan duro como pueda" (deterministic!)
```

### 2. Atomic vs Molecular (Not A/B/C/D)

**Old Classification (v7.7):**
- Type A: Atomic single word
- Type B: Building block phrase
- Type C: Complex phrase
- Type D: Sentence-level

**New Classification (v5.0):**
- **Atomic (A):** Single word, indivisible FD unit
  - "Quiero" → "I want"
  - "hablar" → "to speak"

- **Molecular (M):** Multi-word FD unit, composed of atoms/molecules
  - "Estoy intentando" → "I'm trying"
  - "tan duro como pueda" → "as hard as I can"
  - "después de que termines" → "after you finish"

**Both matter:**
- Atomics are reusable building blocks
- Moleculars demonstrate pattern structures

### 3. Patterns Are Collections

**Old:** Pattern was a property OF a LEGO
```json
{
  "lego_id": "S0007L01",
  "pattern": "P01",
  "structure": "Quiero + infinitive"
}
```

**New:** Pattern is a COLLECTION of LEGOs that fit the same template
```json
{
  "pattern_summary": {
    "P01": {
      "introduced": "S0001",
      "structure": "Quiero/quiere/Queremos + infinitive",
      "instances": ["S0001", "S0007", "S0015", ...]
    }
  }
}
```

**Pattern identification happens by observing the LEGO collection across all seeds.**

### 4. Componentization (Molecular LEGOs)

**New Requirement:** For EVERY molecular LEGO, show ALL WORDS.

**Rule 1:** Reference existing LEGOs as complete units
**Rule 2:** Show non-LEGO structural words with literal translations

**Example:**
```json
["S0011L01", "M", "Me gustaría", "I'd like", [
  ["Me", "me/to me"],           // ← non-LEGO structural word
  ["gustaría", "would please"]  // ← non-LEGO structural word
]]
```

**Or with existing LEGO reference:**
```json
["S0012L01", "M", "No me gustaría", "I wouldn't like", [
  ["No", "not"],                // ← non-LEGO structural word
  ["Me gustaría", "I'd like"]   // ← existing molecular LEGO (S0011L01)
]]
```

**Why:** Reveals target language structure transparently to learners.

### 5. Pattern Instances

**New:** LEGOs can demonstrate patterns (marked during extraction)

**At LEGO level:**
```json
{
  "lego_id": "S0007L01",
  "target": "Quiero",
  "known": "I want",
  "type": "A",
  "pattern_demonstrated": "P01"
}
```

**At seed level:**
```json
{
  "S0007": {
    "patterns_used": ["P01"],
    "patterns_introduced": [],
    "legos": [...]
  }
}
```

---

## Format Changes

### Seed Pair Format

**OLD (v7.7):**
```json
{"target": "Quiero hablar.", "known": "I want to speak."}
```

**NEW (v5.0):**
```json
["Quiero hablar.", "I want to speak."]
```

**Change:** Object → Array (simpler, more compact)

### LEGO Format

**OLD (v7.7) - Atomic:**
```json
["S0001L01", "A", "Quiero", "I want"]
```

**NEW (v5.0) - Atomic:**
```json
["S0001L01", "A", "Quiero", "I want"]
```

**Change:** None for atomics (same format!)

**OLD (v7.7) - Complex:**
```json
["S0002L01", "C", "Estoy intentando", "I'm trying"]
```

**NEW (v5.0) - Molecular:**
```json
["S0002L01", "M", "Estoy intentando", "I'm trying", [
  ["Estoy", "I am"],
  ["intentando", "trying"]
]]
```

**Change:**
- Type "C" → "M"
- **5th element added:** Componentization array
- ALL WORDS accounted for

### File Structure

**OLD (v7.7):**
```json
{
  "version": "7.7",
  "seeds": [
    [seed_id, {seed_pair}, [legos]]
  ]
}
```

**NEW (v5.0):**
```json
{
  "version": "5.0",
  "methodology": "Known Language First Mapping",
  "terminology": "Atomic (A) / Molecular (M)",
  "course": "spa_for_eng",
  "target_language": "spa",
  "known_language": "eng",
  "extracted_date": "2025-01-06",

  "seeds": [
    [seed_id, [target, known], [legos]]
  ],

  "pattern_summary": {
    "P01": {
      "introduced": "S0001",
      "structure": "...",
      "instances": [...]
    }
  },

  "lego_summary": {
    "total_legos": 450,
    "atomic": 280,
    "molecular": 170
  }
}
```

**Changes:**
- More metadata fields
- **pattern_summary** section (NEW!)
- **lego_summary** section (NEW!)
- Seed pair as array

---

## What Needs Updating

### 1. Data Structures

**Files:**
- `vfs/courses/{courseCode}/lego_pairs.json` (format changes)
- `vfs/courses/{courseCode}/seed_pairs.json` (seed pair format changes)

**Action:** Create format adapter/transformer

### 2. API Layer

**Files:**
- `automation_server.cjs` (GET /api/courses/:courseCode/legos)
- `src/services/api.js`

**Action:** Add format version detection, transform v7.7 → v5.0 on the fly if needed

### 3. UI Components

**Files:**
- `src/components/LegoBasketViewer.vue` (needs to display molecular components)
- Any other LEGO viewers

**Action:** Add component display, expand/collapse for molecular LEGOs

### 4. Basket Generation

**Files:**
- Phase 5 basket generation scripts
- `docs/phase_intelligence/phase_5_*.md`

**Action:** Update to understand v5.0 format, use pattern_summary for basket generation

### 5. Phase Intelligence Docs

**Files:**
- `docs/phase_intelligence/phase_3_*.md`

**Action:** Add v5.0 as primary methodology, mark v7.7 as deprecated

---

## Migration Strategy

### Phase 1: Format Adapter (This Week)

**Goal:** Support BOTH v7.7 and v5.0 formats

**Create:**
```javascript
// src/services/legoFormatAdapter.js

export function detectVersion(legoData) {
  // Detect v7.7 vs v5.0
}

export function transformToV5(v7Data) {
  // Convert v7.7 → v5.0 structure
}

export function transformToV7(v5Data) {
  // Convert v5.0 → v7.7 structure (for legacy compatibility)
}
```

**Benefits:**
- Existing data still works
- New v5.0 data works immediately
- No breaking changes

### Phase 2: UI Updates (This Week)

**LegoBasketViewer:**
- Detect molecular LEGOs (5th element present)
- Display componentization with expand/collapse
- Show pattern instances

**Example UI:**
```
S0011L01: Me gustaría → I'd like (Molecular) [Pattern: P04]
  └─ Components:
     - Me → me/to me
     - gustaría → would please
```

### Phase 3: Test Suite (This Week)

**Create:**
```javascript
// tests/legoFormat.test.js

describe('LEGO Format v5.0', () => {
  test('detects v5.0 format correctly')
  test('validates atomic LEGO structure')
  test('validates molecular LEGO with components')
  test('validates pattern_summary structure')
  test('transforms v7.7 to v5.0')
})
```

### Phase 4: New Extraction (Next Week)

**When you provide S0001-S0050 recast:**
- Use Phase 3 v5.0 methodology
- Extract with new format
- Test with adapter layer
- Verify UI displays correctly

### Phase 5: Legacy Data (Future)

**Options:**
- Keep v7.7 data as-is, rely on adapter
- Regenerate all courses with v5.0
- Hybrid: new courses v5.0, old courses v7.7

---

## Example: S0011 in Both Formats

### OLD (v7.7):

```json
{
  "seeds": [
    [
      "S0011",
      {
        "target": "Me gustaría poder hablar después de que termines.",
        "known": "I'd like to be able to speak after you finish."
      },
      [
        ["S0011L01", "C", "Me gustaría", "I'd like"],
        ["S0011L02", "B", "poder", "to be able to"],
        ["S0011L03", "C", "después de que", "after"],
        ["S0011L04", "C", "después de que termines", "after you finish"]
      ]
    ]
  ]
}
```

### NEW (v5.0):

```json
{
  "seeds": [
    [
      "S0011",
      ["Me gustaría poder hablar después de que termines.", "I'd like to be able to speak after you finish."],
      [
        ["S0011L01", "M", "Me gustaría", "I'd like", [
          ["Me", "me/to me"],
          ["gustaría", "would please"]
        ]],
        ["S0011L02", "A", "poder", "to be able to"],
        ["S0011L03", "M", "después de que termines", "after you finish", [
          ["después de que", "after that"],
          ["termines", "you finish (subj)"]
        ]]
      ]
    ]
  ],
  "pattern_summary": {
    "P04": {
      "introduced": "S0011",
      "structure": "Me gustaría + infinitive",
      "instances": ["S0011"]
    },
    "P10": {
      "introduced": "S0011",
      "structure": "después de que + subjunctive",
      "instances": ["S0011"]
    }
  }
}
```

**Key differences:**
1. Seed pair: object → array
2. L03+L04 merged into single molecular LEGO (L03)
3. Componentization arrays added
4. pattern_summary section added
5. Classification: C/B → M/A

---

## Basket Impact

**Question:** Does basket format also change?

**Current basket format (S0011):**
```json
{
  "seed": "S0011",
  "seed_pair": {
    "known": "I'd like to be able to speak after you finish.",
    "target": "Me gustaría poder hablar después de que termines."
  },
  "lessons": {
    "S0011L01": {
      "lego": ["I'd like", "Me gustaría"],
      "type": "C",
      "practice_phrases": [...]
    }
  }
}
```

**Likely v5.0 basket format:**
```json
{
  "seed": "S0011",
  "seed_pair": ["Me gustaría poder hablar después de que termines.", "I'd like to be able to speak after you finish."],
  "lessons": {
    "S0011L01": {
      "lego": ["Me gustaría", "I'd like"],
      "type": "M",
      "components": [
        ["Me", "me/to me"],
        ["gustaría", "would please"]
      ],
      "pattern_demonstrated": "P04",
      "practice_phrases": [...]
    }
  }
}
```

**Changes:**
- Seed pair: object → array
- Type: C → M
- **components** field added
- **pattern_demonstrated** field added

**Action:** Clarify with user if basket format changes or stays same.

---

## Backward Compatibility Plan

### Strategy: Support Both Formats

**API Layer:**
```javascript
async function getCourse(courseCode) {
  const data = await loadFromVFS(courseCode)
  const version = detectVersion(data)

  if (version === '7.7') {
    // Transform to v5.0 for consistent internal format
    return transformToV5(data)
  }

  return data // Already v5.0
}
```

**UI Layer:**
```vue
<template>
  <div v-for="lego in legos">
    <div class="lego-header">{{ lego.target }} → {{ lego.known }}</div>

    <!-- NEW: Molecular components -->
    <div v-if="lego.components" class="components">
      <div v-for="comp in lego.components">
        {{ comp[0] }} → {{ comp[1] }}
      </div>
    </div>
  </div>
</template>
```

**Benefits:**
- Existing courses continue working
- New v5.0 courses work immediately
- Gradual migration possible
- No flag day

---

## Testing Checklist

Before considering v5.0 implementation complete:

- [ ] Format adapter detects v7.7 vs v5.0 correctly
- [ ] Format adapter transforms v7.7 → v5.0
- [ ] API serves both formats
- [ ] LegoBasketViewer displays molecular components
- [ ] LegoBasketViewer shows pattern instances
- [ ] Basket generation works with v5.0 format
- [ ] Test suite covers v5.0 validation
- [ ] Example S0011 extraction in v5.0 format
- [ ] Documentation updated

---

## Open Questions

1. **Basket format:** Does it also change to v5.0, or stay in current format?
2. **Pattern display:** How should patterns be visualized in UI?
3. **Legacy data:** Regenerate old courses, or keep with adapter?
4. **Version tracking:** Should courses declare their version explicitly?
5. **Mixed versions:** Can a single dashboard handle multiple course versions?

---

## Next Steps

**Immediate (This Week):**
1. Create format adapter (legoFormatAdapter.js)
2. Update LegoBasketViewer for molecular display
3. Build test suite for v5.0 validation
4. Create example S0011 extraction in v5.0

**Short Term (Next Week):**
5. Apply Phase 3 v5.0 to S0001-S0050 recast
6. Test full pipeline with v5.0 data
7. Verify basket generation with v5.0

**Long Term (Month):**
8. Decide on legacy data strategy
9. Update all phase intelligence docs
10. Consider regenerating full courses with v5.0

---

**Status**: Migration guide complete, ready for implementation
**Date**: 2025-01-06
