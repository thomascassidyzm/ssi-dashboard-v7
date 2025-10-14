# Brief: Clarify LEGO Architecture in APML

**Problem**: APML conflates "COMPONENTIZATION" (pedagogical explanation) with "COMPOSITE LEGOs" (structural architecture)

**User's Critical Clarification**:

---

## The Three LEGO Types

### 1. BASE LEGO (Simple/Atomic)
**Definition**: Fundamental FD unit that cannot be broken down further

**Characteristics**:
- Single, complete LEGO
- FD (passes target → known → target test)
- Atomic (not composed of other LEGOs)

**Examples**:
- `voy` = `I'm going`
- `decir` = `to say`
- `algo` = `something`
- `Voglio` = `I want`

---

### 2. COMPOSITE LEGO
**Definition**: FD unit comprising BASE LEGOs + non-LEGO glue words

**Characteristics**:
- Itself is FD (passes FD_LOOP as a unit)
- Comprises at least ONE BASE LEGO + something that is NOT a LEGO
- BASE LEGOs within it DO NOT TILE (don't concatenate cleanly)
- The "glue words" prevent tiling

**Critical Example**:
```
Spanish: "voy a decir" = English: "I'm going to say"

Contains:
- "voy" (BASE LEGO) = "I'm going"
- "a" (GLUE WORD - NOT a LEGO)
- "decir" (BASE LEGO) = "to say"

Why COMPOSITE?
- "voy" + "decir" DON'T TILE (can't concatenate directly)
- Spanish "a" is needed between them
- "a" is NOT a LEGO itself (not FD on its own)
- Therefore "voy a decir" becomes its own COMPOSITE LEGO
```

**Another Example**:
```
Italian: "sto per esercitarmi" = English: "I'm going to practice"

Contains:
- "sto" (BASE LEGO) = "I am"
- "per" (GLUE WORD - NOT a LEGO)
- "esercitarmi" (BASE LEGO) = "to practice myself"

Why COMPOSITE?
- "sto" + "esercitarmi" DON'T TILE
- Italian "per" is glue
- "sto per esercitarmi" is COMPOSITE LEGO
```

---

### 3. FEEDERS
**Definition**: BASE LEGOs that participate in a COMPOSITE LEGO

**Characteristics**:
- They ARE BASE LEGOs themselves (FD, atomic, standalone)
- They have **dual existence**:
  1. As independent BASE LEGOs (with their own baskets, used in phrases)
  2. As components within a COMPOSITE LEGO
- They have their own UID (S####F##) when referenced as part of COMPOSITE
- NOT subordinate to COMPOSITE - they're full LEGOs used in multiple contexts

**In the "voy a decir" example**:
```
COMPOSITE LEGO: "voy a decir" (S0005L02)
  ├─ "voy" (S0005F01) ← FEEDER (also exists as BASE LEGO S0003L01)
  ├─ "a" ← GLUE WORD (NOT a LEGO, NOT a FEEDER)
  └─ "decir" (S0005F02) ← FEEDER (also exists as BASE LEGO S0004L01)
```

**Sub-components of COMPOSITE**:
- FEEDERS (BASE LEGOs): "voy", "decir"
- Glue words (NOT LEGOs): "a"

**Key Insight**: FEEDERs are not just "parts" - they're full BASE LEGOs that learners have already practiced independently before encountering them in the COMPOSITE

---

## The TILING Concept (Critical)

**TILING** = LEGOs that concatenate cleanly without glue words

**If LEGOs TILE → Remain separate BASE LEGOs**
Example:
```
"Voglio parlare" = "I want to speak"
- "Voglio" (BASE LEGO)
- "parlare" (BASE LEGO)
- They TILE perfectly (concatenate directly)
- Remain two separate LEGOs
```

**If LEGOs DON'T TILE → Create COMPOSITE LEGO**
Example:
```
"voy a decir" = "I'm going to say"
- "voy" (BASE LEGO)
- "decir" (BASE LEGO)
- They DON'T TILE (need "a" between)
- Create COMPOSITE LEGO: "voy a decir"
- Store FEEDERs: "voy" (F01), "decir" (F02)
```

---

## Phase 6: INTRODUCTIONS for COMPOSITE LEGOs

**Purpose**: Zero-unknowns introduction leveraging prior knowledge

### For BASE LEGO (Simple Introduction)
```
"The Spanish for 'I'm going' is 'voy'."
```
- Just the new vocabulary
- Direct mapping

### For COMPOSITE LEGO (Leveraged Introduction)
```
"The Spanish for 'I'm going to say' is 'voy a decir',
where 'voy' = 'I'm going', and 'decir' = 'to say',
both of which you already know,
with the Spanish 'a' added to glue the phrase together."
```

**Cognitive Load Reduction**:
- Learner recognizes: "I already know 'voy' and 'decir'!"
- Only NEW information: the glue pattern ("a" connects them)
- Pattern recognition: "Spanish uses 'a' to connect going + verb"
- Minimal unknowns = faster learning

**How Phase 6 Generates This**:
1. Read all previous baskets (LEGOs learned so far)
2. Identify which are FEEDERs in upcoming COMPOSITE
3. Generate intro: "You already know X and Y, just add glue Z"
4. Learner feels confident (building on known foundation)

**Example Flow for Learner**:
```
Lesson 10: Learn BASE LEGO "voy" = "I'm going"
  → Practice in basket (e-phrases, d-phrases)

Lesson 15: Learn BASE LEGO "decir" = "to say"
  → Practice in basket (e-phrases, d-phrases)

Lesson 20: Learn COMPOSITE "voy a decir" = "I'm going to say"
  → Introduction: "You know 'voy' and 'decir' - just add 'a'"
  → Practice COMPOSITE in its basket
  → Learner thinks: "Oh, I just combine what I know!"
```

This is why FEEDERs must be full BASE LEGOs - learners need to have practiced them independently BEFORE encountering the COMPOSITE.

---

## What's Wrong in Current APML

### Current Definition (Line 644):
```
COMPONENTIZATION REQUIREMENT
DEFINITION: Breaking multi-word LEGOs into sub-components (FEEDERs)
RULE: ONLY when BOTH target AND known are multi-word
```

**Problem**: This conflates two concepts:
1. **Pedagogical explanation** (showing learners how "parlare italiano" breaks down)
2. **Structural definition** (COMPOSITE LEGOs with glue words)

### What's Missing:
- No explanation of BASE vs COMPOSITE LEGOs
- No explanation of TILING
- No clear rule for when to create COMPOSITE vs separate BASE LEGOs
- FEEDERS defined vaguely as "sub-components"

---

## Correct Architecture

### Decision Tree for Phase 3 LEGO Extraction

```
For each chunk:

1. Is it FD on its own?
   NO → Break it down further
   YES → Continue to step 2

2. Does it contain multiple BASE LEGOs?
   NO → It's a BASE LEGO (done)
   YES → Continue to step 3

3. Do the BASE LEGOs TILE (concatenate cleanly)?
   YES → Keep as separate BASE LEGOs
   NO → Continue to step 4

4. Are there glue words between the BASE LEGOs?
   YES → Create COMPOSITE LEGO
        - Store COMPOSITE as main LEGO (S####L##)
        - Store BASE LEGOs as FEEDERs (S####F##)
   NO → Error (shouldn't happen if FD validated)
```

### Examples Through Decision Tree

**Example 1: "Voglio parlare"**
```
1. FD? YES
2. Multiple BASE LEGOs? YES ("Voglio" + "parlare")
3. TILE? YES (concatenate directly: Voglio + parlare)
→ Keep as TWO separate BASE LEGOs
   - S0001L01: "Voglio"
   - S0001L02: "parlare"
```

**Example 2: "voy a decir"**
```
1. FD? YES
2. Multiple BASE LEGOs? YES ("voy" + "decir")
3. TILE? NO (need "a" between)
4. Glue words? YES ("a")
→ Create COMPOSITE LEGO
   - S0005L02: "voy a decir" (COMPOSITE)
   - S0005F01: "voy" (FEEDER)
   - S0005F02: "decir" (FEEDER)
```

**Example 3: "parlare italiano"**
```
1. FD? YES
2. Multiple BASE LEGOs? YES ("parlare" + "italiano")
3. TILE? YES (concatenate directly)
→ Keep as TWO separate BASE LEGOs
   - S0001L02: "parlare"
   - S0001L03: "italiano"

BUT: If pedagogically useful, add componentization explanation:
"parler italien = parlare italiano, où parlare = parler et italiano = italien"
```

---

## What Needs to Change in APML

### 1. Add LEGO Type Definitions (After line 620)

```yaml
LEGO_TYPES:

  BASE_LEGO:
    DEFINITION: Fundamental FD unit that cannot be broken down further
    CHARACTERISTICS:
      - Single, atomic unit
      - FD (passes target → known → target)
      - Not composed of other LEGOs
    EXAMPLES:
      - "Voglio" = "I want"
      - "voy" = "I'm going"
      - "algo" = "something"

  COMPOSITE_LEGO:
    DEFINITION: FD unit comprising BASE LEGOs + non-LEGO glue words
    CHARACTERISTICS:
      - Itself is FD as a complete unit
      - Contains at least ONE BASE LEGO + glue words
      - BASE LEGOs within DO NOT TILE
      - Glue words are NOT LEGOs themselves
    EXAMPLES:
      - "voy a decir" = "I'm going to say" (glue: "a")
      - "sto per esercitarmi" = "I'm going to practice" (glue: "per")
    WHEN_TO_CREATE:
      - BASE LEGOs would TILE if concatenated directly
      - Glue words (prepositions, particles) required between
      - Unit is more useful taught as one piece

  FEEDERS:
    DEFINITION: BASE LEGOs that feed into a COMPOSITE LEGO
    CHARACTERISTICS:
      - They are BASE LEGOs themselves
      - Stored with F## suffix (not L##)
      - Represent components before glue added
    EXAMPLE:
      - COMPOSITE: "voy a decir" (S0005L02)
      - FEEDER 1: "voy" (S0005F01)
      - FEEDER 2: "decir" (S0005F02)
```

### 2. Add TILING Concept (After LEGO_TYPES)

```yaml
TILING_CONCEPT:

  DEFINITION: LEGOs that concatenate cleanly without glue words

  TILES (Concatenate directly):
    - No additional words needed between LEGOs
    - Direct concatenation reconstructs sentence
    - Keep as separate BASE LEGOs
    EXAMPLE: "Voglio parlare" = "Voglio" + "parlare" ✅ TILES

  DOES_NOT_TILE (Needs glue):
    - Additional words required between LEGOs
    - Cannot concatenate directly
    - Create COMPOSITE LEGO
    EXAMPLE: "voy a decir" ≠ "voy" + "decir" ❌ DOESN'T TILE (needs "a")

  DECISION_RULE:
    IF (BASE LEGOs TILE):
      → Keep as separate BASE LEGOs
    ELSE IF (BASE LEGOs DON'T TILE):
      → Create COMPOSITE LEGO with FEEDERs
```

### 3. Update COMPONENTIZATION Section (Line 643-665)

**OLD** (line 643):
```
### COMPONENTIZATION REQUIREMENT
DEFINITION: Breaking multi-word LEGOs into sub-components (FEEDERs)
RULE: ONLY when BOTH target AND known are multi-word
```

**NEW**:
```
### COMPONENTIZATION (Pedagogical Explanation)

**PURPOSE**: Help learners understand how multi-word LEGOs break down

**TWO TYPES**:

1. **For BASE LEGOs that TILE**:
   - LEGOs remain separate in structure
   - But add explanation for learner clarity
   - Example: "parlare italiano" stays as two LEGOs (parlare + italiano)
   - Add: "parler italien = parlare italiano, où parlare = parler et italiano = italien"

2. **For COMPOSITE LEGOs**:
   - LEGO is structurally one unit (doesn't tile)
   - Show FEEDERs to help learner understand components
   - Example: "voy a decir" is ONE COMPOSITE LEGO
   - FEEDERs: voy (F01), decir (F02)
   - Explanation shows: "voy a decir = I'm going to say, where voy = I'm going, a = [particle], decir = to say"

**RULE**: Add componentization when BOTH target AND known are multi-word

**FORMAT**: Simple word mappings in KNOWN language
  "[known LEGO] = [target LEGO], where [target1] = [known1] and [target2] = [known2]"
```

### 4. Update Phase 3 Prompt (Line 767+)

Add after "CORE PRINCIPLE" section:

```
## LEGO TYPES & ARCHITECTURE

### BASE LEGO (Simple/Atomic)
- Fundamental FD unit
- Cannot be broken down further
- Examples: "Voglio", "parlare", "voy", "decir"

### COMPOSITE LEGO (Contains BASE + Glue)
- FD unit with BASE LEGOs + non-LEGO glue words
- BASE LEGOs DON'T TILE (can't concatenate directly)
- Examples:
  - "voy a decir" (voy + a + decir) - "a" is glue
  - "sto per esercitarmi" (sto + per + esercitarmi) - "per" is glue

### FEEDERS
- BASE LEGOs within a COMPOSITE
- Stored separately with F## suffix
- Help learners understand COMPOSITE structure

### TILING TEST
**Question**: Can you concatenate these LEGOs directly?

IF YES (TILES):
→ Keep as separate BASE LEGOs
Example: "Voglio" + "parlare" = "Voglio parlare" ✅

IF NO (DOESN'T TILE):
→ Create COMPOSITE LEGO + FEEDERs
Example: "voy" + "decir" ≠ "voy decir" ❌ (need "a")
→ COMPOSITE: "voy a decir"
→ FEEDERs: "voy" (F01), "decir" (F02)

## YOUR EXTRACTION PROCESS

For each seed:

1. Break into potential chunks
2. Validate each chunk is FD
3. Check if chunks contain multiple BASE LEGOs
4. Apply TILING TEST:
   - TILES? → Separate BASE LEGOs
   - DOESN'T TILE? → COMPOSITE LEGO + FEEDERs
5. Add componentization explanation (pedagogical)
```

---

## Update Dashboard Visualizer

The dashboard should show:

**For BASE LEGO**:
```
Type: BASE
ID: S0005L01
Target: voy
Known: I'm going
FD: ✅
```

**For COMPOSITE LEGO**:
```
Type: COMPOSITE
ID: S0005L02
Target: voy a decir
Known: I'm going to say
FD: ✅
Feeders:
  - F01: voy = I'm going
  - F02: decir = to say
Glue: a (Spanish particle)
```

---

## Success Criteria

✅ APML clearly defines BASE, COMPOSITE, FEEDERS
✅ TILING concept explained with decision tree
✅ Phase 3 prompt includes LEGO type extraction logic
✅ Dashboard visualizer shows LEGO types correctly
✅ Examples use user's "voy a decir" case
✅ Distinction between pedagogical componentization and structural COMPOSITE clear

---

## Files to Modify

1. `ssi-course-production.apml` - Lines 620-780 (Phase 3 section)
2. Dashboard visualizer components (if they exist)

---

## Notes

**User's Key Insight**: TILING is the deciding factor
- LEGOs TILE → Separate BASE LEGOs
- LEGOs DON'T TILE → COMPOSITE LEGO

This is the architectural logic that was missing from APML.
