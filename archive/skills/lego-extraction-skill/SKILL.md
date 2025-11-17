# LEGO Extraction Skill

---
name: lego-extraction-skill
description: Extracts pedagogically optimal LEGO pairs from translations, classifies as BASE/COMPOSITE/FEEDER, validates functional determinism (FD) with FCFS rule, and generates componentization
version: 7.6.0
---

## Purpose

Extract LEGO pairs from seed translations that:
1. **Maximize pedagogical value** - focus on reusable, generalizable chunks
2. **Are functionally deterministic (FD)** - learner sees known chunk → knows exactly what to say
3. **Follow FCFS rule** - first occurrence claims ambiguous mappings
4. **Classify correctly** - BASE (atomic), COMPOSITE (multi-part), or FEEDER (extracted component)
5. **Provide componentization** - explain how COMPOSITE LEGOs break down
6. **Maintain SSi quality standards** - avoid meaningless chunks, ensure naturalness

## Progressive Disclosure

**Level 1 - Quick Reference:**
- Input: `translations.json`
- Output: `LEGO_BREAKDOWNS_COMPLETE.json`
- Types: BASE (atomic), COMPOSITE (multi-part), FEEDER (component)
- **Key Rule:** FD (Functionally Deterministic) + FCFS (First Come First Served)

**Level 2 - Classification Logic:**
See [CLASSIFICATION.md](./rules/CLASSIFICATION.md) for BASE vs COMPOSITE vs FEEDER decision tree

**Level 3 - Detailed Rules:**
- [FD_VALIDATION.md](./rules/FD_VALIDATION.md) - FD + FCFS rules and test
- [COMPONENTIZATION.md](./rules/COMPONENTIZATION.md) - How to explain COMPOSITE breakdown
- [QUALITY_HEURISTICS.md](./rules/QUALITY_HEURISTICS.md) - 6 quality filters (TODO)

**Level 4 - Resources:**
- [SCHEMAS.md](./schemas/SCHEMAS.md) - JSON structure specifications (TODO)
- [EXAMPLES.md](./examples/EXAMPLES.md) - Annotated good/bad examples (TODO)
- [EDGE_CASES.md](./examples/EDGE_CASES.md) - Tricky cases and solutions (TODO)

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

### 1. FD (Functionally Deterministic) is Mandatory

**Definition:** Learner sees known chunk → knows EXACTLY which target chunk to produce (one and only one).

✅ **VALID FD:** "Hello" → "Hola"
- Learner sees "Hello" → always says "Hola"
- No alternatives, no ambiguity

❌ **INVALID FD:** "the" → "el"
- Learner sees "the" → could say "el", "la", "los", or "las"
- Gender/number determines which article
- Not functionally deterministic

✅ **FD RESTORED:** "the table" → "la mesa"
- Context makes it deterministic
- Learner knows exactly what to say

### 2. FCFS (First Come First Served) Resolves Ambiguity

**The Rule:** When a known chunk could map to multiple targets, the FIRST occurrence wins. Later occurrences must chunk up.

✅ **FCFS in action:**
```
Seed 1: "I think" → "creo" ✅ (first occurrence, FCFS claims it)
Seed 15: "I think about you" → "pienso en ti" ✅ (chunked up)
```

**Why this works:**
- Learner sees "I think" alone → always says "creo" (FD via FCFS)
- Learner sees "I think about you" → says "pienso en ti" (FD via context)
- No confusion, no ambiguity

❌ **FCFS violation:**
```
Seed 1: "I think" → "creo" ✅
Seed 15: "I think" → "pienso" ❌ (violates FCFS - "I think" already claimed)
```

### 3. Pedagogical Value over Completeness

❌ **Low value LEGO:** "the" → "el"
- Too abstract, not FD
- Learner can't use this alone

✅ **High value LEGO:** "the table" → "la mesa"
- Concrete, reusable, FD
- Learner knows what to say

### 4. Naturalness in Both Languages

✅ **Natural:** "no lo sé" → "I don't know"
- Both phrases are natural, idiomatic
- FD maintained

❌ **Unnatural:** "sé lo no" → "know it not"
- Known chunk is archaic/forced
- Not how native speakers talk

### 5. COMPOSITE LEGOs Must Componentize

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

### 6. FEEDERS Must Have Parents

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

## FD + FCFS Test

For every LEGO extraction:

### Step 1: FD Test
**Ask:** "If learner sees the known chunk, is there EXACTLY ONE target response?"

```
Known: "Hello" → Target: ?
Answer: "Hola" (only one) ✅ FD passes

Known: "the" → Target: ?
Answer: "el"? "la"? "los"? "las"? ❌ FD fails
```

### Step 2: FCFS Check
**Ask:** "Has this known chunk already been mapped in an earlier seed?"

```
"I think" already mapped?
  NO → First occurrence, extract it ✅
  YES → FCFS claimed, chunk up ❌
```

### Step 3: Extract or Chunk Up

**If FD passes AND FCFS allows:** Extract the LEGO ✅

**If FD fails OR FCFS blocks:** Chunk up with more context ✅

## Quality Standards

Every LEGO extraction must pass:

1. ✅ **FD Validation** - Learner knows exactly what to say (one known → one target)
2. ✅ **FCFS Check** - First occurrence or properly chunked up
3. ✅ **Pedagogical Value** - Chunk is reusable and generalizable
4. ✅ **Naturalness** - Both chunks feel natural in their languages
5. ✅ **Correct Classification** - BASE/COMPOSITE/FEEDER accurately assigned
6. ✅ **Complete Metadata** - All required fields present
7. ✅ **Componentization** - COMPOSITE LEGOs explain their breakdown

## Common Mistakes to Avoid

❌ **Violating FD:** Extracting ambiguous chunks like "the" → "el"
❌ **Violating FCFS:** Mapping "I think" → "pienso" when "creo" already claimed it
❌ **Missing Componentization:** COMPOSITE without explanation
❌ **Orphaned Feeders:** Feeders without parent_lego_id
❌ **Low-Value Chunks:** Abstract particles with no pedagogical value
❌ **Unnatural Mappings:** Forced translations that don't feel right
❌ **Wrong Types:** COMPOSITE when should be BASE (or vice versa)

## Quick Usage

For detailed step-by-step process:
1. Read [CLASSIFICATION.md](./rules/CLASSIFICATION.md) - Learn BASE/COMPOSITE/FEEDER decision tree
2. Read [FD_VALIDATION.md](./rules/FD_VALIDATION.md) - Ensure all LEGOs pass FD + FCFS test
3. Read [COMPONENTIZATION.md](./rules/COMPONENTIZATION.md) - Write good explanations
4. Check [EXAMPLES.md](./examples/EXAMPLES.md) - See annotated good/bad cases (TODO)

## Expected Output Counts

For 30-seed courses:
- Spanish: ~115 LEGOs (50 lego_pairs + 65 feeders)
- Italian: ~115 LEGOs
- French: ~116 LEGOs
- Mandarin: ~103 LEGOs

For 668-seed full corpus:
- Expect 2000-3000 LEGOs total

## FD + FCFS Examples

### ✅ Valid FD + FCFS

```
"Hello" → "Hola" (FD: deterministic, no alternatives)
"I'm trying" → "Estoy intentando" (FD: deterministic)
"I think" → "creo" (FD + FCFS: first occurrence claims it)
"the table" → "la mesa" (FD: context makes it deterministic)
```

### ❌ Fails FD

```
"the" → "el" (could be la/los/las - not FD)
"I like" → "me gustan" (could be gusta with singular - not FD)
"I am" → "Soy" (if "Estoy" already claimed by FCFS)
```

### ✅ Chunked Up (FD Restored)

```
"I think about you" → "pienso en ti" (chunked up from "I think")
"I like them" → "me gustan" (chunked up from "I like")
"I am a teacher" → "Soy un profesor" (chunked up from "I am")
"the book" → "el libro" (full phrase instead of just "the")
```

## See Also

- [Phase 3 Training Docs](../../docs/phase-3-lego-extraction.md)
- [SSi Pedagogical Principles](../../docs/ssi-pedagogical-principles.md)
- [FD + FCFS Explained](./rules/FD_VALIDATION.md)
