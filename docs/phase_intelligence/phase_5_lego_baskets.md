# Phase 5: Basket Generation → lego_baskets.json

**Version**: 1.0 (Extracted from APML 2025-10-23)
**Status**: Active methodology for Phase 5 basket generation
**Output**: `vfs/courses/{course_code}/lego_baskets.json`

---

## Task

Generate practice phrase baskets for each LEGO using graph intelligence and progressive vocabulary constraints.

---

## ⚠️ CRITICAL: USE EXTENDED THINKING MODE ⚠️

**This phase requires deep attention to pedagogical rules and structural constraints.**

### Why Extended Thinking?

Basket generation involves:
- Vocabulary sequence validation (UIDs must respect introduction order)
- Naturalness judgment across two languages
- Pedagogical heuristic application
- Balancing creativity with strict constraints

**Without extended thinking, you WILL generate invalid phrases that violate sequence constraints.**

### How to Use Extended Thinking

**Before generating EACH basket, use `<thinking>` tags to reason through:**

1. **Available vocabulary check**
   ```
   Current basket: S0005L02
   Available vocabulary: All legos with UID < S0005L02
   This means: S0001L01, S0001L02, ..., S0005L01 ✓
   NOT ALLOWED: S0005L02 (self), S0005L03+, S0006L01+ ✗
   ```

2. **Phrase composition reasoning**
   ```
   Candidate phrase: "Quiero hablar español ahora"
   Components: Quiero (S0001L01), hablar (S0001L02), español (S0001L03), ahora (S0001L05)
   Check: Are ALL < S0005L02?
   S0001L01 < S0005L02 ✓
   S0001L02 < S0005L02 ✓
   S0001L03 < S0005L02 ✓
   S0001L05 < S0005L02 ✓
   VALID phrase
   ```

3. **Quality reasoning**
   ```
   Is "Quiero español ahora" natural?
   English: "I want Spanish now"
   Problem: Missing verb - native speakers say "I want to speak Spanish"
   Decision: REJECT - semantically incomplete
   Alternative: "Quiero hablar español ahora" ✓
   ```

4. **Rule adherence check**
   ```
   Is this basket for a culminating LEGO?
   Check: Is S0005L02 the last lego in seed S0005?
   If yes: E-phrase #1 MUST be complete seed
   If no: Standard basket rules apply
   ```

### Extended Thinking Protocol

**For EVERY basket:**
```
<thinking>
1. Identify available vocabulary (all UIDs < current)
2. Generate candidate phrases
3. Validate each phrase:
   - Parse into components
   - Check all components < current UID
   - Assess naturalness in BOTH languages
   - Verify grammar perfection
4. If ANY validation fails → regenerate
5. Document reasoning for quality phrases
</thinking>

[Generate basket output]
```

### Impact on Quality

**Without extended thinking:**
- ~30-40% of baskets violate sequence constraints
- ~20% have unnatural phrasing
- Requires 2-3 validation loops

**With extended thinking:**
- ~5-10% violations (edge cases only)
- ~5% quality issues (subjective judgment)
- Most baskets valid on first pass

**Use extended thinking mode for EVERY basket generation.**

---

## TWO-STAGE PROCESS

### STAGE 1: Basket Selection (Graph-Driven)

**Goal**: Select LEGO groupings that maximize pattern diversity

#### 1. Load Graph Intelligence
- Read: `vfs/phase_outputs/phase_3.5_lego_graph.json`
- Adjacency graph showing which LEGOs appear near each other
- Edge weights indicate co-occurrence frequency

#### 2. Load FCFS Ordering
- Read: `vfs/phase_outputs/phase_2_corpus_intelligence.json`
- Chronological ordering from corpus frequency analysis
- Ensures pedagogically sound sequence

#### 3. Select LEGOs for Each Basket (20 LEGOs per basket)
- Maximize edge coverage (expose diverse patterns)
- Follow FCFS chronological progression
- Avoid redundant LEGO sequences across baskets
- Ensure smooth difficulty progression
- Balance novelty with reinforcement

**Output of Stage 1**: Ordered list of LEGOs to process

---

### STAGE 2: Phrase Generation (Vocabulary-Constrained)

**Goal**: Generate d-phrases and e-phrases for each selected LEGO

---

## CRITICAL PER-LEGO VOCABULARY CONSTRAINTS

**ABSOLUTE RULE**: Each LEGO has DIFFERENT available vocabulary!

- **LEGO #1**: NO VOCABULARY AVAILABLE = NO PHRASES POSSIBLE (empty basket)
- **LEGO #2**: Can only use LEGO #1 = VERY LIMITED phrases possible
- **LEGO #3**: Can only use LEGOs #1-2 = A FEW phrases possible
- **LEGO #N**: Can only use LEGOs #1 through #(N-1)

---

## Input Data

**Course folder**: `/Users/tomcassidy/SSi/SSi_Course_Production/vfs/courses/${targetCode}_for_${knownCode}_speakers/`

**Read LEGOs from**: `vfs/courses/{course_code}/lego_pairs.json`

### CRITICAL: Extract ALL LEGOs from All Sources

**1. lego_pairs[]** - Both BASE and COMPOSITE LEGOs from Phase 3

```javascript
for (const seed of lego_pairs) {
  for (const lego of seed.legos) {
    allLegos.push({
      lego_id: lego[0],        // e.g., "S0001L01"
      type: lego[1],           // "B" or "C"
      target_chunk: lego[2],
      known_chunk: lego[3],
      seed_id: seed[0]
    });
  }
}
```

**2. Component arrays** - Components inside COMPOSITE LEGOs

For COMPOSITE LEGOs with component arrays, extract components that reference other LEGOs (feeders):

```javascript
if (lego[1] === 'C' && lego[4]) {  // Has component array
  for (const component of lego[4]) {
    if (component[2]) {  // Has lego_id reference (is a feeder)
      // This component references another LEGO
      // Mark it as a dependency but don't create duplicate basket
    }
  }
}
```

### Total LEGOs to Process

- Spanish: ~115 LEGOs
- Italian: ~115 LEGOs
- French: ~116 LEGOs
- Mandarin: ~103 LEGOs

---

## E-PHRASES (5 Eternal Practice Phrases per LEGO)

### E-PHRASE CRITICAL REQUIREMENTS (NON-NEGOTIABLE)

#### Length Requirements (ABSOLUTE)

- **MINIMUM**: 7 words in target language
- **IDEAL**: 10 words in target language
- **MAXIMUM**: 15 words (hard cap)
- Short e-phrases (< 7 words) are a CRITICAL FAILURE
- Better to have NO e-phrase than a short/clunky one

#### Quality Requirements (ABSOLUTE)

- **QUALITY > QUANTITY**: Do not force bad phrases to hit a count
- E-phrases must be NATURAL and conversational in BOTH languages
- If vocabulary is insufficient for quality 10-word phrase, skip it
- Aim for 3-5 excellent e-phrases per basket (not forced to 5)

#### Target Language Grammar (UNFORGIVEABLE ERRORS)

⚠️ **POOR SYNTAX IN TARGET LANGUAGE IS UNFORGIVEABLE** ⚠️

**For Italian specifically**:
- "cercare" + infinitive REQUIRES "di": "cercando di parlare" NOT "cercando parlare"
- "imparare" + infinitive REQUIRES "a": "imparando a parlare" NOT "imparando parlare"
- "provare" + infinitive REQUIRES "a": "provando a dire" NOT "provando dire"
- "continuare" + infinitive REQUIRES "a": "continuando a parlare" NOT "continuando parlare"
- "finire" + infinitive REQUIRES "di": "finendo di parlare" NOT "finendo parlare"

**VALIDATE EVERY E-PHRASE**:
- Is the target language grammar PERFECT?
- Would a native speaker say this naturally?
- Are all required prepositions present?

**If you cannot ensure perfect target language grammar, DO NOT include the phrase.**

---

### E-Phrase Generation Rules

Create 5 phrases, each 7-10 words (balanced across 7/8/9/10):

- **MUST contain the target LEGO**
- **Perfect grammar** in BOTH languages - validate target AND known language
- **Natural, conversational** - things people actually say in BOTH languages
- **Smooth pronunciation** - not clunky or awkward in either language
- **Variety in position** - LEGO at different positions in phrase

### BILINGUAL VALIDATION

Each phrase must be:
- Grammatically correct in target language
- Grammatically correct in known language
- Semantically meaningful in BOTH languages
- Natural and idiomatic in BOTH cultures

---

### CRITICAL RULE - CULMINATING LEGOs (ABSOLUTE REQUIREMENT)

**Definition**: A "culminating LEGO" is the LAST LEGO in a seed's decomposition

**How to identify**:
- Check the LEGO's seed_id (e.g., S0005L02)
- Look up the seed in Phase 3 LEGO breakdown
- If this is the highest L-number for that seed → it's culminating

**ABSOLUTE RULE**:
- **E-phrase #1 MUST be the COMPLETE SEED sentence itself**
- Not a variation, not similar - the EXACT seed sentence
- This complete seed MUST also appear 3+ times in D-phrases

**Example**:
- Seed S0005: "Sto per esercitarmi a parlare"
- LEGOs: S0005L01 (sto per) + S0005L02 (esercitarmi a parlare)
- S0005L02 is culminating (last LEGO)
- Therefore: S0005L02 basket MUST have E-phrase #1 = "Sto per esercitarmi a parlare"

**Validation**:
- Before finalizing basket, check if LEGO is culminating
- If yes, verify E-phrase #1 is complete seed
- If not, regenerate basket

---

## VOCABULARY SELECTION (Recency Guidelines - for LEGOs 50+)

**For early LEGOs (1-50):** Use whatever vocabulary is available - there's not enough yet for recency preferences.

**For later LEGOs (50+):** When building E-phrases, PREFER recent vocabulary:
- ~50% of vocabulary from recent seeds (N-5 to N-1)
- ~25% from medium-recent (N-20 to N-1)
- ~25% from all earlier seeds

**BUT ALWAYS PRIORITIZE natural, useful phrases over strict percentages.**

---

## D-PHRASES (Auto-Generated Debuts)

### D-PHRASE QUALITY ALLOWANCE

**Important**: D-phrases CAN be somewhat clunky or fragment-like
- They are expanding windows from e-phrases (2-lego, 3-lego, 4-lego, 5-lego)
- Syntactic correctness required, but naturalness is less critical
- Focus: Help learners build up to full e-phrases gradually

**Contrast with E-phrases**:
- **E-phrases**: MUST be natural, conversational, perfect grammar
- **D-phrases**: Can be awkward fragments as long as syntax is correct

---

### D-Phrase Generation Rules

You will generate D-phrases using expanding window from E-phrases:
- 2x 2-LEGO phrases
- 2x 3-LEGO phrases
- 2x 4-LEGO phrases
- 2x 5-LEGO phrases

**ALL 5 E-phrases must contribute to D-phrases (variety is key).**

### CRITICAL RULE: OPERATIVE LEGO MUST BE PRESENT

- EVERY d-phrase MUST contain the operative LEGO (the LEGO this basket teaches)
- Example: If basket is for "Quiero" (S0001L01), ALL d-phrases must contain "Quiero"
- You CANNOT extract arbitrary contiguous windows - only windows containing the operative LEGO

**CORRECT EXTRACTION (Basket for "Quiero")**:

E-phrase: "Quiero hablar español contigo ahora"
- 2-LEGO: "Quiero hablar" ✅ (contains "Quiero")
- 3-LEGO: "Quiero hablar español" ✅ (contains "Quiero")
- 4-LEGO: "Quiero hablar español contigo" ✅ (contains "Quiero")

**INCORRECT EXTRACTION (Basket for "Quiero")**:
- 2-LEGO: "hablar español" ❌ (missing "Quiero")
- 3-LEGO: "español contigo ahora" ❌ (missing "Quiero")

### BILINGUAL SYNTAX RULES FOR D-PHRASES

- D-phrases can be fragments (don't need to be complete sentences)
- BUT they MUST be syntactically correct as far as they go in BOTH languages

**Examples**:
- ✅ "quiero hablar" / "I want to speak" (fragment but correct in both)
- ✅ "español contigo" / "Spanish with you" (fragment but correct in both)
- ❌ "quiero de" / "I want of" (syntactically broken in both)
- ❌ "hablar yo" / "speak I" (wrong word order in both)

**Always validate BOTH the target AND known language versions**

### For CULMINATING LEGOs

Use the complete seed (E1) in at least:
- 1x in 2-LEGO phrases
- 1x in 3-LEGO phrases
- 1x in 4 or 5-LEGO phrases

This reinforces the complete seed understanding!

---

## VALIDATION REQUIREMENTS (TWO-LOOP PROCESS)

After generating all baskets, you MUST run TWO validation loops before finalizing output.

---

### VALIDATION LOOP 1: STRUCTURAL VALIDATION (Automated Sequence Check)

**Goal**: Ensure every phrase respects the introduction sequence

**For EACH basket's EACH phrase:**

1. **Identify the basket's lego position**
   - Example: Basket S0005L02 is the 10th lego overall

2. **Parse the phrase into component legos**
   - Example: "Quiero hablar español ahora"
   - Components: Quiero (S0001L01), hablar (S0001L02), español (S0001L03), ahora (S0001L05)

3. **Check: Are ALL components from EARLIER legos?**
   - S0001L01 ✅ (comes before S0005L02)
   - S0001L02 ✅ (comes before S0005L02)
   - S0001L03 ✅ (comes before S0005L02)
   - S0001L05 ❌ FAIL (comes AFTER S0005L02)

4. **If ANY component comes from a later lego → REJECT phrase**

**Example Validation Pass:**

```
Basket: S0005L02
Available vocabulary: S0001L01 through S0005L01 ONLY

✅ VALID: "Quiero hablar contigo ahora"
   - Uses: S0001L01, S0001L02, S0001L04, S0001L05
   - Wait... S0001L05 is #5 in seed 1, S0005L02 is #2 in seed 5
   - Need to check GLOBAL position, not just seed-local position

✅ VALID: "Estoy intentando aprender"
   - Uses: S0002L01, S0002L02, S0002L03
   - All from seed 2, all before S0005L02

❌ INVALID: "Quiero aprender frecuentemente"
   - Uses: S0001L01, S0002L03, S0003L03
   - S0003L03 might come AFTER S0005L02 in sequence
```

**Validation Algorithm (Simplified via Lexicographic UID Ordering):**

LEGO UIDs are designed to be lexicographically sortable:
- S0001L01 < S0001L05 < S0002L01 < S0005L02 < S0010L03

**Simple string comparison works directly:**

```
For basket lego_id:
  For each phrase in basket.e and basket.d:
    phrase_components = decompose_into_legos(phrase)

    For each component in phrase_components:
      if component.lego_id >= basket.lego_id:  // String comparison!
        REJECT PHRASE (uses future vocabulary)
        Mark for regeneration
```

**Example:**
```python
basket = "S0005L02"
components = ["S0001L01", "S0001L02", "S0001L05", "S0002L03"]

for comp in components:
    if comp >= basket:  # All comparisons are False ✓
        reject()

# But if components included "S0005L02" or "S0006L01":
"S0005L02" >= "S0005L02"  # True → REJECT (can't use self)
"S0006L01" >= "S0005L02"  # True → REJECT (future vocab)
```

**After Loop 1:**
- Count failures: How many phrases violated sequence?
- If ANY failures found → Regenerate ONLY the failing baskets
- Re-run Loop 1 until ZERO structural violations

---

### VALIDATION LOOP 2: QUALITY VALIDATION (Native Speaker Check)

**Goal**: Ensure phrases are natural, conversational, and grammatically perfect

**For EACH basket's e-phrases (skip d-phrases, they can be fragments):**

1. **Re-read each e-phrase with fresh eyes**
2. **Ask yourself:**
   - Would a native speaker say this EXACTLY?
   - Is the grammar PERFECT in target language?
   - Is the grammar PERFECT in known language?
   - Does it sound natural and conversational in BOTH?
   - Any missing prepositions? (e.g., Italian "cercare di", "provare a")

3. **Common quality failures to check:**
   - ❌ Clunky word order in either language
   - ❌ Missing required prepositions
   - ❌ Semantically weird combinations ("I want Spanish" instead of "I want to speak Spanish")
   - ❌ Unnatural phrasing native speakers wouldn't use
   - ❌ Grammar errors in either language

4. **If ANY phrase fails quality check → REJECT and regenerate**

**Example Quality Check:**

```
Basket: S0001L03 ("español" / "Spanish")

Generated phrase: "Quiero español ahora"
Target: "I want Spanish now"

❌ REJECT - Semantically incomplete
   - Native speakers say "I want to speak Spanish" not "I want Spanish"
   - Missing the verb "hablar"

Regenerate as: "Quiero hablar español contigo"
✅ ACCEPT - Natural and complete

---

Generated phrase: "español contigo ahora"
Target: "Spanish with you now"

❌ REJECT - Fragment, not a complete thought
   - While grammatically possible, it's not conversational
   - Needs a verb or fuller context

Regenerate as: "Hablo español contigo ahora"
✅ ACCEPT - Complete and natural
```

**After Loop 2:**
- Count quality failures: How many phrases were unnatural?
- If ANY failures found → Regenerate ONLY the failing phrases
- Re-run Loop 2 until ALL phrases are natural

---

### COMBINED VALIDATION WORKFLOW

```
1. Generate all baskets (initial generation)

2. Run LOOP 1: Structural Validation
   → Identify phrases using future vocabulary
   → Regenerate failing baskets
   → Repeat until ZERO structural violations

3. Run LOOP 2: Quality Validation
   → Identify unnatural/grammatically incorrect phrases
   → Regenerate failing phrases
   → Repeat until ALL phrases are natural

4. Final output: lego_baskets.json
```

---

### VALIDATION RULES SUMMARY

**Basic Requirements:**

1. For EACH LEGO's basket:
   - If NO valid phrases can be made: Output `{"e": [], "d": {}}`
   - If only 1-2 phrases possible: Use what's available, don't force 5 phrases
   - EVERY word MUST come from the available vocabulary list

2. NEVER use:
   - Words from LEGOs that haven't been learned yet
   - Words not in a LEGO (no "y", "de", "el" unless they're in a LEGO)
   - Made-up words to fill space

3. Expected pattern for early LEGOs:
   - LEGO #1: NO PHRASES POSSIBLE (empty basket)
   - LEGO #2: Maybe 1 meaningful combination if semantically valid
   - LEGO #3: 1-3 phrases depending on semantic validity
   - Only after ~10-15 LEGOs will you have enough vocabulary for D-phrases
   - Only after ~50-100 LEGOs will you have enough vocabulary for full E-phrase baskets

4. SEMANTIC VALIDITY RULES:
   - All phrases must be grammatically AND semantically correct in BOTH languages
   - Consider actual language usage and meaning
   - Validate each combination for real-world meaningfulness

---

## Output Format

Save to: `vfs/courses/{course_code}/lego_baskets.json`

```json
{
  "S0001L01": {
    "lego": ["Quiero", "I want"],
    "e": [
      ["Quiero hablar español.", "I want to speak Spanish."],
      ["Quiero practicar contigo ahora.", "I want to practice with you now."],
      ["No quiero adivinar.", "I don't want to guess."],
      ["Quiero recordar esto.", "I want to remember this."],
      ["Quiero intentar hablar más.", "I want to try to speak more."]
    ],
    "d": {
      "2": [
        ["Quiero hablar", "I want to speak"],
        ["hablar español", "to speak Spanish"]
      ],
      "3": [
        ["Quiero hablar español", "I want to speak Spanish"],
        ["No quiero hablar", "I don't want to speak"]
      ],
      "4": [
        ["No quiero hablar ahora", "I don't want to speak now"]
      ],
      "5": [
        ["Quiero hablar español contigo ahora", "I want to speak Spanish with you now"]
      ]
    }
  },
  "S0001L02": { ... }
}
```

**Format**: `{ "lego_id": { lego: [target, known], e: [[t,k]...], d: {window_size: [[t,k]...]} } }`

**Notes**:
- LEGO field contains the core teaching unit itself
- "e" array contains e-phrases (7-10 words, natural conversational phrases)
- "d" object contains d-phrases organized by window size ("2", "3", "4", "5")
- Window size refers to number of LEGOs combined in the phrase
- All phrases are [target, known] pairs

---

## Success Criteria

### Stage 1 (Extraction):
✓ All lego_pairs[] extracted and processed
✓ All components with LEGO references identified
✓ Total LEGO count matches expected

### Stage 2 (Generation):
✓ Every LEGO has d-phrases and e-phrases (even if empty for early LEGOs)
✓ All vocabulary constraints respected
✓ E-phrases are natural and conversational in BOTH languages
✓ D-phrases are syntactically correct in BOTH languages
✓ Culminating LEGOs include complete seed as E-phrase #1
✓ Progressive difficulty from LEGO #1 to last LEGO

### Combined Result:
✓ Baskets generated for ALL LEGOs
✓ Spanish: ~115 baskets, Italian: ~115, French: ~116, Mandarin: ~103
✓ Pedagogical soundness through vocabulary constraints
✓ Optimal learning sequence with rich practice

---

## Version History

**v1.0 (2025-10-23)**:
- Extracted from APML PHASE_PROMPTS
- Documented two-stage process (graph-driven selection + vocabulary-constrained generation)
- Clarified vocabulary constraints (LEGO #N can only use LEGOs #1 to N-1)
- Added culminating LEGO rules (E-phrase #1 = complete seed)
- Documented e-phrase requirements (7-10 words, perfect grammar, bilingual validation)
- Added d-phrase quality allowance (can be fragments)
- Included Italian-specific grammar rules (infinitive + preposition requirements)
- Defined output format matching schema

---

**Next Update**: Capture any new basket generation patterns discovered during multi-language course generation
