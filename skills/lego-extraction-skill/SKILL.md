# LEGO Extraction Skill

---
name: lego-extraction-skill
description: Extracts pedagogically optimal LEGO pairs from translations, classifies as BASE/COMPOSITE/FEEDER, validates forward-derivation, and generates componentization
version: 7.6.0
---

## Purpose

Extract LEGO pairs from seed translations that:
1. **Maximize pedagogical value** - focus on reusable, generalizable chunks
2. **Follow forward-derivation** - known language must derive from target language naturally
3. **Classify correctly** - BASE (atomic), COMPOSITE (multi-part), or FEEDER (extracted component)
4. **Provide componentization** - explain how COMPOSITE LEGOs break down
5. **Maintain SSi quality standards** - avoid meaningless chunks, ensure naturalness

## Progressive Disclosure

**Level 1 - Quick Reference:**
- Input: `translations.json`
- Output: `LEGO_BREAKDOWNS_COMPLETE.json`
- Types: BASE (atomic), COMPOSITE (multi-part), FEEDER (component)
- Key Rule: Forward-derivation ALWAYS (target → known, never reverse)

**Level 2 - Classification Logic:**
See [CLASSIFICATION.md](./rules/CLASSIFICATION.md) for BASE vs COMPOSITE vs FEEDER decision tree

**Level 3 - Detailed Rules:**
- [FD_VALIDATION.md](./rules/FD_VALIDATION.md) - Forward-derivation rules
- [COMPONENTIZATION.md](./rules/COMPONENTIZATION.md) - How to explain COMPOSITE breakdown
- [QUALITY_HEURISTICS.md](./rules/QUALITY_HEURISTICS.md) - 6 quality filters

**Level 4 - Resources:**
- [SCHEMAS.md](./schemas/SCHEMAS.md) - JSON structure specifications
- [EXAMPLES.md](./examples/EXAMPLES.md) - Annotated good/bad examples
- [EDGE_CASES.md](./examples/EDGE_CASES.md) - Tricky cases and solutions

## Classification Quick Reference

```
┌─────────────────────────────────────────────────────────┐
│ Is it a single, atomic, indivisible chunk?             │
│ YES → BASE                                              │
│ NO  → Continue...                                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Does it contain multiple meaningful parts?              │
│ YES → COMPOSITE (extract feeders)                       │
│ NO  → BASE                                              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ For COMPOSITE: Extract meaningful components            │
│ Each component → FEEDER with parent_lego_id             │
└─────────────────────────────────────────────────────────┘
```

## Key Principles

### 1. Forward-Derivation (FD) is Mandatory

✅ **VALID FD:** "Estoy intentando" → "I'm trying"
- Spanish phrase naturally maps to English phrase
- Meaning preserved in both directions

❌ **INVALID FD:** "I'm trying" → "Estoy intentando"
- This is REVERSE derivation (wrong direction)
- Target must be source, known must be derived

❌ **INVALID FD:** "lo hecho" → "made it"
- "made it" doesn't naturally map to "lo hecho" (idiom mismatch)
- Known language feels forced or unnatural

### 2. Pedagogical Value over Completeness

❌ **Bad LEGO:** "que" → "that"
- Too abstract, minimal pedagogical value
- Learner can't use this in isolation

✅ **Good LEGO:** "que bueno" → "how good"
- Concrete, reusable phrase
- High pedagogical value

### 3. Naturalness in Both Languages

✅ **Natural:** "no lo sé" → "I don't know"
- Both phrases are natural, common expressions

❌ **Unnatural:** "sé lo no" → "know it not"
- Known language chunk feels forced/artificial

### 4. COMPOSITE LEGOs Must Componentize

✅ **Good COMPOSITE:**
```json
{
  "lego_id": "S0002L01",
  "lego_type": "COMPOSITE",
  "target_chunk": "Estoy intentando",
  "known_chunk": "I'm trying",
  "componentization": "I'm trying = Estoy intentando, where Estoy = I'm and intentando represents trying"
}
```

❌ **Bad COMPOSITE (missing componentization):**
```json
{
  "lego_id": "S0002L01",
  "lego_type": "COMPOSITE",
  "target_chunk": "Estoy intentando",
  "known_chunk": "I'm trying"
  // Missing componentization!
}
```

### 5. FEEDERS Must Have Parents

✅ **Good FEEDER:**
```json
{
  "feeder_id": "S0002F01",
  "target_chunk": "Estoy",
  "known_chunk": "I'm",
  "parent_lego_id": "S0002L01"
}
```

❌ **Bad FEEDER (missing parent):**
```json
{
  "feeder_id": "S0002F01",
  "target_chunk": "Estoy",
  "known_chunk": "I'm"
  // Missing parent_lego_id!
}
```

## Quality Standards

Every LEGO extraction must pass:

1. ✅ **FD Validation** - Forward-derivation holds in both directions
2. ✅ **Pedagogical Value** - Chunk is reusable and generalizable
3. ✅ **Naturalness** - Both chunks feel natural in their languages
4. ✅ **Correct Classification** - BASE/COMPOSITE/FEEDER accurately assigned
5. ✅ **Complete Metadata** - All required fields present
6. ✅ **Componentization** - COMPOSITE LEGOs explain their breakdown

## Common Mistakes to Avoid

❌ **Reverse Derivation:** Known → Target (should be Target → Known)
❌ **Missing Componentization:** COMPOSITE without explanation
❌ **Orphaned Feeders:** Feeders without parent_lego_id
❌ **Low-Value Chunks:** Abstract particles with no pedagogical value
❌ **Unnatural Mappings:** Forced translations that don't feel right
❌ **Wrong Types:** COMPOSITE when should be BASE (or vice versa)

## Quick Usage

For detailed step-by-step process:
1. Read [CLASSIFICATION.md](./rules/CLASSIFICATION.md) - Learn BASE/COMPOSITE/FEEDER decision tree
2. Read [FD_VALIDATION.md](./rules/FD_VALIDATION.md) - Ensure all LEGOs pass FD test
3. Read [COMPONENTIZATION.md](./rules/COMPONENTIZATION.md) - Write good explanations
4. Check [EXAMPLES.md](./examples/EXAMPLES.md) - See annotated good/bad cases

## Expected Output Counts

For 30-seed courses:
- Spanish: ~115 LEGOs (50 lego_pairs + 65 feeders)
- Italian: ~115 LEGOs
- French: ~116 LEGOs
- Mandarin: ~103 LEGOs

For 668-seed full corpus:
- Expect 2000-3000 LEGOs total

## See Also

- [Phase 3 Training Docs](../../docs/phase-3-lego-extraction.md)
- [SSi Pedagogical Principles](../../docs/ssi-pedagogical-principles.md)
- [Forward-Derivation Explained](../../docs/forward-derivation.md)
