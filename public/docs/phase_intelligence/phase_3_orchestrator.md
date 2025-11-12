# Phase 3: LEGO Extraction Orchestration

**Version**: v7.0 - A-before-M Ordering (2025-11-11)
**Purpose**: Extract vocabulary LEGOs from seed pairs with proper pedagogical ordering

---

## 🎯 Overview

Phase 3 transforms seed pairs (target/known sentence pairs) into vocabulary LEGOs (atomic and molecular learning units). This phase is **critical** for establishing proper learning progression.

**Input**: Seed pairs (Phase 2 output)
**Output**: LEGO pairs with A-before-M ordering
**Agent Intelligence**: `docs/phase_intelligence/phase_3_lego_pairs.md`

---

## 📋 Pipeline Steps

### Step 1: LEGO Extraction

**What happens**: Each seed pair is broken down into vocabulary LEGOs

**Process**:
1. Identify all meaningful units in the target sentence
2. Classify each as Atomic (A-type: single word) or Molecular (M-type: multi-word phrase)
3. Create LEGO pairs: `[known_language_unit, target_language_unit]`
4. **CRITICAL**: Order ALL A-type LEGOs before M-type LEGOs within each seed
5. Assign sequential IDs: S0001L01, S0001L02, S0001L03...

**Example**:
```
Seed: "No estoy seguro si puedo recordar toda la oración."
      "I'm not sure if I can remember the whole sentence."

LEGOs extracted (A-before-M ordered):
S0010L01: "if" / "si" (A)
S0010L02: "I can" / "puedo" (A)
S0010L03: "I'm not sure" / "no estoy seguro" (M)
S0010L04: "I can remember" / "puedo recordar" (M)
S0010L05: "the whole sentence" / "toda la oración" (M)
```

---

## ⭐ Critical Principle: A-BEFORE-M ORDERING

**Rule**: Within each seed, ALL A-type LEGOs must come BEFORE M-type LEGOs.

**Why**: Pedagogical progression. When a learner encounters M-type "puedo recordar" (I can remember), they should already know:
- A-type "puedo" (I can)
- A-type "recordar" (to remember)

This makes the M-LEGO a **combination of known pieces**, not new vocabulary.

**Validation**:
```
✅ Correct order:
S0010L01: "if" / "si" (A)
S0010L02: "I can" / "puedo" (A)
S0010L03: "I'm not sure" / "no estoy seguro" (M)

❌ Wrong order:
S0010L01: "if" / "si" (A)
S0010L02: "I'm not sure" / "no estoy seguro" (M) ← M before all A-types!
S0010L03: "I can" / "puedo" (A) ← A after M-type!
```

**If ordering is wrong**: Output is invalid and must be regenerated.

---

## 🔍 Validation Criteria

All Phase 3 outputs must satisfy:

### 1. TILING FIRST
LEGOs must reconstruct the seed sentence exactly:
```
Seed: "Quiero hablar español"
✅ Correct: ["quiero", "hablar", "español"] → tiles perfectly
❌ Wrong: ["quiero hablar", "español"] → partial coverage
```

### 2. A-BEFORE-M ORDERING (Critical!)
Within each seed, ALL A-types before ALL M-types. No exceptions.

### 3. Functional Determinism
Same seed input → same LEGO output (reproducible, not random)

### 4. Component Tracking
M-types should have `components` field referencing their A-type building blocks (structure validation only)

### 5. Proper Classification
- **A-type**: Single words or indivisible units ("puedo", "recordar")
- **M-type**: Multi-word phrases built from A-types ("puedo recordar")

---

## 📦 Output Format

```json
{
  "version": "curated_v7_spanish",
  "course_id": "spa_for_eng",
  "seed_range": {"start": 1, "end": 134},
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": ["Target sentence", "Known sentence"],
      "legos": [
        {
          "id": "S0001L01",
          "target": "target_word",
          "known": "known_word",
          "type": "A"
        },
        {
          "id": "S0001L02",
          "target": "multi word phrase",
          "known": "multi word phrase",
          "type": "M",
          "components": [
            {"known": "multi", "target": "multi"},
            {"known": "word", "target": "word"}
          ]
        }
      ]
    }
  ]
}
```

**File location**: `vfs/courses/{course}/lego_pairs.json`

---

## 📊 Expected Metrics

**Per seed**: 3-7 LEGOs (average ~4.25)
**Per 134 seeds**: ~570 LEGOs total
**Type distribution**: ~60% A-types, ~40% M-types
**Ordering compliance**: 100% (A-before-M enforced)

---

## 🚨 Common Issues

### Issue 1: M-types before A-types
**Symptom**: S0010L02 is M-type, S0010L03 is A-type
**Impact**: Breaks pedagogical progression
**Fix**: Re-extract with A-before-M ordering enforced

### Issue 2: Incomplete tiling
**Symptom**: LEGOs don't reconstruct seed exactly
**Impact**: Missing or redundant vocabulary
**Fix**: Re-extract with TILING FIRST emphasis

### Issue 3: Inconsistent classification
**Symptom**: Same phrase classified as A-type in one seed, M-type in another
**Impact**: Breaks functional determinism
**Fix**: Establish consistent classification rules

---

## 🔄 Post-Phase Processing

After Phase 3 completes, run deduplication:

**Script**: `deduplicate_legos.cjs`
**Purpose**: Mark duplicate LEGOs across seeds to avoid regenerating practice baskets

**Output**: Adds `new: true/false` flag and `ref` field to each LEGO:
```json
{
  "id": "S0005L02",
  "target": "hablar",
  "known": "to speak",
  "type": "A",
  "new": false,
  "ref": "S0001L02"
}
```

**Why**: Saves work in Phase 5 - only generate practice baskets for `new: true` LEGOs.

---

## 🎓 Pedagogical Foundation

Phase 3 establishes the **vocabulary curriculum**. Proper A-before-M ordering ensures:

1. **Incremental learning**: Molecular phrases build on atomic foundations
2. **Cognitive chunking**: Learners recognize familiar components in new phrases
3. **Efficient practice**: Practice focuses on new combinations, not re-learning basics
4. **Natural progression**: Course moves from simple to complex naturally

**This ordering is non-negotiable** - it is the foundation of the entire learning system.

---

## 🔗 Next Phase

Phase 3 output feeds into **Phase 4: Deduplication** → **Phase 5: Basket Generation**

See: `docs/phase_intelligence/phase_5_orchestrator.md`
