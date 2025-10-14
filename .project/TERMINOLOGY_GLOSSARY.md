# SSi Course Production - Official Terminology Glossary

**Date**: 2025-10-14
**Status**: User-confirmed definitions
**Purpose**: Single source of truth for ALL terminology

---

## THE 3 CORE USER-FACING CONCEPTS

### 1. SEED_PAIRS

**Definition**: Pedagogically optimized translation of a canonical seed into both target and known languages

**Reference Format**: S0001 to S0668 (S + 4-digit number)

**Structure**:
```json
{
  "seed_id": "S0041",
  "canonical_english": "I want to speak",
  "target_language": "Voglio parlare",
  "known_language": "Je veux parler",
  "metadata": { ... }
}
```

**Key Properties**:
- Total: 668 per course
- Language-direction specific (ita_for_fra has different SEED_PAIRS than ita_for_eng)
- Must be "lego_complete" - decomposes into LEGO_PAIRS that tile back perfectly
- **User can view/edit**: See all known-target pairs

**Phase**: Phase 1 (Pedagogical Translation)

**Storage**: `vfs/courses/{course_code}/amino_acids/translations/`

---

### 2. LEGO_PAIRS

**Definition**: Forward-deterministic teaching unit extracted from SEED_PAIRS. A LEGO cannot exist unless it has BOTH target and known languages mapped.

**Reference Format**: S0041L02 (seed reference + L + position)

**Structure**:
```json
{
  "provenance": "S0041L02",
  "target_text": "Voglio parlare",
  "known_text": "Je veux parler",
  "type": "BASE" | "COMPOSITE",
  "componentization": { ... },
  "metadata": { ... }
}
```

**Key Properties**:
- Course-specific AND language-direction specific
- Must pass FD_LOOP test (target → known → target = IDENTICAL)
- Two types:
  - **BASE LEGO**: Atomic, cannot be decomposed further
  - **COMPOSITE LEGO**: Contains BASE LEGOs + glue words, needs componentization
- **User can view/edit**: See all SEED_PAIR to LEGO_PAIRS breakdowns with provenance
- **Editing**: Movable dividers to try different decompositions
- Count: ~2000-3000 per course

**Alias**: "LEGOS" (informal, but LEGO_PAIRS is preferred since LEGOs require both languages)

**Phase**: Phase 3 (LEGO Decomposition)

**Storage**: `vfs/courses/{course_code}/amino_acids/legos_deduplicated/`

**Critical Concept**: "lego_complete"
- LEGO_PAIRS must tile to re-form the SEED_PAIR precisely
- No gaps, no overlaps, perfect reconstruction

---

### 3. LEGO_BASKETS

**Definition**: Complete set of practice phrases associated with ONE LEGO_PAIR, showing how the new LEGO plugs into previously learned LEGOs.

**Structure**:
```json
{
  "lego_pair_id": "S0041L02",
  "debut_phrases": [ ... ],    // Up to 8 d-phrases
  "eternal_phrases": [ ... ],  // Up to 5 e-phrases
  "metadata": { ... }
}
```

**Contains**:
- **DEBUT_PHRASES** (d-phrases): Up to 8 phrases
  - Progressive vocabulary only (can be clunky, just syntactically correct)
  - Expanding window fragments

- **ETERNAL_PHRASES** (e-phrases): Up to 5 phrases
  - 7-10 words, natural, perfect target grammar
  - Quality over quantity (3 excellent > 5 forced)
  - UNFORGIVEABLE to have grammar errors

**Key Properties**:
- One basket per LEGO_PAIR
- Shows how new LEGO combines with existing LEGOs
- Progressive vocabulary constraint (only use previously learned LEGOs)
- Count: ~100-150 per course (one per deduplicated LEGO)

**User can view/edit**: Complete set of phrases for each LEGO_PAIR

**Phase**: Phase 5 (Basket Generation)

**Storage**: `vfs/courses/{course_code}/amino_acids/baskets/`

---

## SUPPORTING CONCEPTS

### 4. LEGO_INTRODUCTIONS

**Definition**: Intelligence about LEGO type (BASE vs COMPOSITE) and componentization details

**Structure**:
```json
{
  "lego_pair_id": "S0041L02",
  "type": "COMPOSITE",
  "feeders": [
    { "id": "F01", "target": "voy", "known": "I'm going" },
    { "id": "F02", "target": "a decir", "known": "to say" }
  ],
  "componentization": {
    "explanation": "You already know 'voy' and 'decir', just add 'a' to connect them"
  }
}
```

**Key Properties**:
- Explains BASE vs COMPOSITE distinction
- For COMPOSITE LEGOs: shows how they break down into FEEDERs
- Helps learner understand "you already know the parts"

**User needs to see**: Yes - to understand LEGO architecture

**Phase**: Phase 6 (Introductions)

**Storage**: `vfs/courses/{course_code}/amino_acids/introductions/`

---

### 5. COMPONENTIZATION

**Definition**: Pedagogical explanation showing how multi-word LEGOs break down into components

**Two Forms**:

**For BASE LEGOs that TILE**:
```
"parlare italiano" = "to speak Italian"
where "parlare" = "to speak" and "italiano" = "Italian"
```
- LEGOs remain separate in structure
- Explanation helps learner clarity

**For COMPOSITE LEGOs**:
```
"voy a decir" = "I'm going to say"
where "voy" = "I'm going" (you already know)
and "decir" = "to say" (you already know)
with Spanish "a" added to glue the phrase together
```
- LEGO is structurally one unit (doesn't tile)
- Shows FEEDERs to help learner understand

**Status**: User says "not sure if fully captured" - needs review

---

## REFERENCE FORMATS

### Seed References
- **Format**: S + 4-digit number
- **Range**: S0001 to S0668
- **Example**: S0041

### LEGO References
- **Format**: S{seed}L{position}
- **Example**: S0041L02 (Seed 41, LEGO position 2)
- **Feeder Format**: S{seed}F{position} (for COMPOSITE components)
- **Example**: S0041F01 (Seed 41, FEEDER position 1)

---

## TERMINOLOGY TO AVOID (Confusing/Ambiguous)

❌ **"Translations"** → Use SEED_PAIRS
❌ **"LEGOs"** (alone) → Use LEGO_PAIRS (clearer that both languages required)
❌ **"Baskets"** (alone) → Use LEGO_BASKETS (clearer what's in them)
❌ **"Amino acids"** → Remove (was metaphor for LEGO_PAIRS, Claude got carried away)
❌ **"Teaching units"** → Use LEGO_PAIRS (specific term)
❌ **"Lessons"** → Use LEGO_BASKETS (clearer structure)

---

## LEGO TYPES (Critical Distinction)

### BASE LEGO
- Fundamental FD unit
- Cannot be decomposed further
- Single, atomic unit
- Examples: "Voglio" = "I want", "voy" = "I'm going"

### COMPOSITE LEGO
- FD unit comprising BASE LEGOs + glue words
- BASE LEGOs within DO NOT TILE (can't concatenate cleanly)
- Needs componentization explanation
- Examples:
  - "voy a decir" = "I'm going to say" (glue: "a")
  - "sto per esercitarmi" = "I'm going to practice" (glue: "per")

### FEEDERS
- BASE LEGOs that participate in a COMPOSITE
- Have dual existence:
  1. As independent BASE LEGOs (with their own baskets)
  2. As components within COMPOSITE LEGO
- Referenced with F## suffix in COMPOSITE context

---

## PHRASE TYPES

### DEBUT_PHRASES (d-phrases)
- **Count**: Up to 8 per LEGO_BASKET
- **Purpose**: Progressive vocabulary practice
- **Quality**: Can be clunky, just needs to be syntactically correct
- **Structure**: Expanding window fragments

### ETERNAL_PHRASES (e-phrases)
- **Count**: Up to 5 per LEGO_BASKET (quality > quantity)
- **Purpose**: Natural, memorable practice
- **Quality**: 7-10 words, perfect target grammar, UNFORGIVEABLE to have errors
- **Rule**: 3 excellent e-phrases better than 5 forced ones

---

## INTERNAL/TECHNICAL CONCEPTS (Not User-Facing)

### VFS (Virtual File System)
- Storage structure for course data
- Base path: `vfs/courses/{course_code}/`
- Subdirectories organize outputs by phase

### Provenance
- S{seed}L{position} format tracks birth-parent relationships
- Enables edit propagation (change SEED_PAIR → regenerate affected LEGOs)

### UUID
- Content-addressed identifier for immutability
- hash(content + metadata) ensures deterministic IDs
- Used for file naming, not shown to users

### lego_complete
- Property of SEED_PAIRS
- Means: LEGO_PAIRS tile perfectly to re-form the SEED_PAIR
- No gaps, no overlaps, perfect reconstruction
- Editing goal: maintain lego_complete property

---

## DASHBOARD DISPLAY TERMINOLOGY

### Course Library Card
```
ITA Course (668 seeds)                [Status Badge]

SEED_PAIRS:    668
LEGO_PAIRS:    2341
LEGO_BASKETS:  120
LEGO_INTROS:   89

Phases Completed: [0][1][2][3][3.5][4][5][6]

[View & Edit] [Details]
```

### Course Editor Views
1. **SEED_PAIRS View**: Browse/edit all 668 translations
2. **LEGO_PAIRS View**: See decomposition with movable dividers, edit breakdowns
3. **LEGO_BASKETS View**: View/edit d-phrases and e-phrases for each LEGO

---

## IMPLEMENTATION NOTE

**File Storage** (internal, don't rename):
- Keep: `amino_acids/translations/` (stores SEED_PAIRS)
- Keep: `amino_acids/legos_deduplicated/` (stores LEGO_PAIRS)
- Keep: `amino_acids/baskets/` (stores LEGO_BASKETS)
- Keep: `amino_acids/introductions/` (stores LEGO_INTRODUCTIONS)

**API Response Fields** (rename for clarity):
- OLD: `course.amino_acids.translations` → NEW: `course.seed_pairs`
- OLD: `course.amino_acids.legos_deduplicated` → NEW: `course.lego_pairs`
- OLD: `course.amino_acids.baskets` → NEW: `course.lego_baskets`
- OLD: `course.amino_acids.introductions` → NEW: `course.lego_introductions`

**UI Labels** (always use domain terms):
- Display: "SEED_PAIRS", "LEGO_PAIRS", "LEGO_BASKETS", "LEGO_INTRODUCTIONS"
- Never: "translations", "legos", "baskets", "introductions", "amino acids"

---

## QUESTIONS TO RESOLVE

1. ✅ COMPONENTIZATION - Is this fully captured in LEGO_INTRODUCTIONS?
2. ✅ "Amino acids" - Remove from APML? → YES, cast it out
3. ✅ Movable dividers - How should editing interface work?
4. ❓ Are phases 0, 2, 3.5, 4 outputs needed in UI at all?

---

## STATUS

- ✅ User confirmed 3 core concepts
- ✅ Clarified LEGO_PAIRS (not just "LEGOs")
- ✅ Defined d-phrases and e-phrases
- ✅ Explained lego_complete
- ✅ Confirmed reference formats (S0001-S0668, S0041L02)
- ✅ Confirmed amino acids can be removed
- ⏳ Ready to update APML Variable Registry
- ⏳ Ready to update Dashboard UI
- ⏳ Ready to update API responses

**Next Step**: Create update plan for APML and dashboard using this glossary as SSoT.
