# SSi Course Output Schemas

Canonical data formats for all phase outputs. These schemas ensure consistency across all course generations.

## Pedagogical Model

### What is a LEGO?

A **LEGO** is a discrete unit of learning - a pedagogical atom that the learner masters as a single piece.

**Three types (cognitive load management):**

- **Base (B)**: Indivisible unit
  - Example: `"Quiero"` (I want), `"hablar"` (to speak)
  - Cannot be broken down further
  - Taught as a single piece

- **Feeder (F)**: Component of a composite, taught FIRST
  - Example: `"Estoy"` (I'm), `"intentando"` (trying)
  - Parts of a larger phrase
  - Taught individually to reduce cognitive load

- **Composite (C)**: Combination of feeders, taught AFTER parts are known
  - Example: `"Estoy intentando"` (I'm trying)
  - Learner already knows `"Estoy"` + `"intentando"`
  - Low cognitive load: only learning the combination, not the parts

**Why feeders before composites?**
- Teaching parts first: Learner masters `"Estoy"` and `"intentando"` separately
- Then composite: Learner just learns how they combine
- Result: **1 new thing** (the combination) vs **3 new things** (both parts + combination)

### What is a Basket?

A **basket** is a practice set that demonstrates how THIS LEGO "plugs into" LEGOs the learner ALREADY knows.

**NOT random phrases** - each phrase is a working example showing:
- How the new LEGO interfaces with prior knowledge
- Different contexts where the LEGO can be used
- Progressive complexity (e-phrases = full sentences, d-phrases = building blocks)

**Metaphor: API Documentation**
- LEGO = new function you're learning
- Basket = code examples showing how to call this function
- Available vocabulary = parameters already defined
- You can't use undefined parameters (LEGOs not yet learned)

### E-phrases vs D-phrases: Usage Pattern Distinction

**E-phrases (ETERNAL):**
- **When used**: At ANY point in the course AFTER this LEGO's introduction
- **Frequency**: Reusable FOREVER - permanent practice material
- **Purpose**: Long-term practice for this LEGO throughout the entire course
- **Quality**: MUST be excellent, natural, conversational (7-10 words)
- **Example**: Learner at Lesson #50 practicing LEGO #10 uses these e-phrases

**D-phrases (DEBUT):**
- **When used**: ONLY during this LEGO's FIRST introduction
- **Frequency**: Used ONCE, never repeated thereafter
- **Purpose**: Temporary scaffolding for initial learning
- **Quality**: Syntactically correct, but can be awkward fragments
- **Example**: Progressive building blocks (2-LEGO → 3-LEGO → 4-LEGO → 5-LEGO) showing how to construct sentences

**Why this matters:**
- E-phrases are permanent additions to practice repertoire (invest in quality)
- D-phrases are temporary scaffolding (focus on progressive difficulty demonstration)
- E-phrases practiced hundreds of times → must be natural
- D-phrases used once during debut → can be fragments for learning

### The Vocabulary Constraint

**Core principle:** A basket can ONLY use LEGOs the learner has already mastered.

**Why?**
- Zero unknowns except the LEGO being taught = manageable cognitive load
- Learner can focus 100% on the new LEGO, not distracted by unknown words
- Each practice phrase is immediately comprehensible

**Implementation:**
- LEGO at position #N can use vocabulary from positions #1 through #(N-1)
- Position = sequential order in the course (respecting feeder-first rule)
- Type (B/C/F) is irrelevant - only chronological position matters

## Design Principles

1. **Compact Arrays**: Use arrays instead of objects to reduce token usage (~70% reduction)
2. **Implicit Schema**: Field order is defined in schema, not repeated in data
3. **Type Codes**: Single letters for types (B=BASE, C=COMPOSITE, F=FEEDER)
4. **Validation**: All outputs must pass JSON Schema validation before acceptance

## Schema Files

- `phase1-translations.json` - Phase 1 output format
- `phase3-legos.json` - Phase 3 output format
- `phase5-baskets.json` - Phase 5 output format

## Token Savings

**Before (verbose):**
```json
{
  "lego_id": "S0001L01",
  "lego_type": "BASE",
  "target_chunk": "Quiero",
  "known_chunk": "I want"
}
```
~50 tokens

**After (compact):**
```json
["S0001L01", "B", "Quiero", "I want"]
```
~12 tokens (76% reduction)

For 668 seeds × 5 LEGOs avg = **~50K tokens saved per course**
