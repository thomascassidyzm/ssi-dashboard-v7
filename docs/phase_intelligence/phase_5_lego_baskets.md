# Phase 5: Basket Generation → lego_baskets.json

**Version**: 2.0 (2025-10-26)
**Status**: Active methodology for Phase 5 basket generation
**Output**: `vfs/courses/{course_code}/lego_baskets.json`

---

## 🎯 THE LEARNING MODEL (FOUNDATION)

**SSi learners acquire ONE LEGO at a time in strict sequence.**

### How Learners Progress

When a learner is practicing **LEGO #N**:
- ✅ They **HAVE** learned: LEGOs #1 through #(N-1)
- 🎯 They **ARE** learning: LEGO #N (current basket)
- ❌ They **HAVE NOT** seen: LEGOs #(N+1) onwards

**This is not optional - it's the entire pedagogical foundation.**

### Implication for Basket Generation

When generating practice phrases for LEGO #N:
- You can ONLY use vocabulary from LEGOs #1 to #(N-1)
- You CANNOT use LEGO #N itself (it's what they're learning)
- You CANNOT use any LEGOs from #(N+1) onwards (future vocabulary)

**Using future vocabulary destroys the pedagogy completely.**

---

## 🚨 VOCABULARY CONSTRAINT = ABSOLUTE GATE 🚨

**Before generating ANY phrase for LEGO #N, you MUST:**

### Step 1: Identify Available Vocabulary

```
Current basket: S0005L02
Available vocabulary: All LEGOs with UID < S0005L02
This means: S0001L01, S0001L02, ..., S0005L01 ✓
NOT ALLOWED: S0005L02 (self), S0005L03+, S0006L01+ ✗
```

### Step 2: Accept Vocabulary Limitations

**Early LEGOs have VERY LIMITED or NO vocabulary available:**

- **S0001L01** (1st LEGO): NO prior vocabulary → **Empty basket** `{"e": [], "d": {}}`
- **S0001L02** (2nd LEGO): Can only use S0001L01 → **Maximum 2-word phrases**
- **S0001L03** (3rd LEGO): Can only use S0001L01-L02 → **Maximum 3-4 word phrases**
- **S0001L05** (5th LEGO): Can only use S0001L01-L04 → **Maximum 5-6 word phrases**
- **S0010L01** (10th+ LEGO): Enough vocabulary for 7+ word phrases

**This is expected and correct.**

### Step 3: ONLY Generate Phrases Within Vocabulary Constraint

❌ **CATASTROPHIC ERROR**: Using future vocabulary to hit length requirements
✅ **CORRECT**: Accepting shorter phrases or empty baskets when vocabulary is limited

**ABSOLUTE RULE**: Vocabulary constraint is NON-NEGOTIABLE. All other requirements (length, naturalness, quantity) apply ONLY IF vocabulary permits.

---

## Task

Generate practice phrase baskets for each LEGO respecting the absolute vocabulary constraint.

---

## BASKET STRUCTURE: E-PHRASES vs D-PHRASES

Each basket contains two types of practice phrases:

### E-PHRASES (Eternal Practice Phrases)
**Purpose**: Natural, conversational sentences for real-world practice

**Characteristics**:
- Full, natural sentences in BOTH languages
- Things people actually say
- Perfect grammar required
- Ideal length: 7-10 words (if vocabulary permits)
- Quality over quantity: 3-5 excellent phrases per basket

**CRITICAL CONSTRAINT**: E-phrases must **TILE perfectly** from available LEGOs
- Every word must map to a LEGO
- No extra words allowed (no "y", "de", "el" unless they're in a LEGO)
- No missing words
- Must compose cleanly: LEGO + LEGO + LEGO = complete phrase

**Pedagogical role**: Core practice content - learners speak these repeatedly to build fluency

### D-PHRASES (Debut/Development Phrases)
**Purpose**: Scaffolding to build up to e-phrases gradually

**Characteristics**:
- Expanding windows: 2-LEGO, 3-LEGO, 4-LEGO, 5-LEGO combinations
- Extracted directly FROM e-phrases (not independent constructions)
- Windows expand AROUND the operative LEGO (LEGO #N being taught)
- Can be fragments (don't need to be complete sentences)
- Syntactically correct but can be awkward

**CRITICAL CONSTRAINT**: D-phrases MUST contain the operative LEGO
- If basket is for S0001L01 (Quiero), ALL d-phrases must include "Quiero"
- Windows expand outward from operative LEGO

**Pedagogical role**: Help learners assemble pieces before speaking full e-phrases

### Complete Example (Basket for S0001L01 "Quiero" / "I want")

**Available vocabulary**: None (this is LEGO #1) → This basket would be EMPTY

**Better example - Basket for S0001L05 "ahora" / "now":**

**Available vocabulary**: S0001L01 (Quiero), S0001L02 (hablar), S0001L03 (español), S0001L04 (contigo)

**SPECIAL RULE**: S0001L05 is the **culminating LEGO** (last LEGO in seed S0001)
- Therefore: **E-phrase #1 MUST be the complete seed sentence**

**E-phrase #1** (REQUIRED - the complete seed):
```
"Quiero hablar español contigo ahora" / "I want to speak Spanish with you now"
Tiles: S0001L01 + S0001L02 + S0001L03 + S0001L04 + S0001L05
This is the exact SEED_PAIR from S0001
```

**E-phrases #2-5** (additional practice phrases, tiles perfectly from LEGOs):
```
"Quiero hablar contigo ahora" / "I want to speak with you now"
Tiles: S0001L01 + S0001L02 + S0001L04 + S0001L05

"Hablo español ahora" / "I speak Spanish now"  (if "Hablo" available)
etc.
```

**D-phrases** (expanding windows around S0001L05 "ahora"):
```
2-LEGO: "hablar ahora" / "to speak now"
        (S0001L02 + S0001L05 - contains operative LEGO)

3-LEGO: "hablar español ahora" / "to speak Spanish now"
        (S0001L02 + S0001L03 + S0001L05 - contains operative LEGO)

4-LEGO: "hablar español contigo ahora" / "to speak Spanish with you now"
        (S0001L02 + S0001L03 + S0001L04 + S0001L05 - contains operative LEGO)

5-LEGO: "Quiero hablar español contigo ahora" / "I want to speak Spanish with you now"
        (All 5 LEGOs - contains operative LEGO)
```

### Key Rules
- **E-phrases**: Must TILE perfectly from LEGOs (no extra/missing words)
- **D-phrases**: Expanding windows FROM e-phrases, expanding AROUND operative LEGO
- **Both**: MUST respect vocabulary constraint (only use LEGOs #1 to #N-1)

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
1. **FIRST**: Identify available vocabulary (all UIDs < current)
   - List out ALL LEGOs available
   - Accept vocabulary limitations
   - If LEGO #1 or #2: Recognize empty/minimal basket is correct

2. Generate candidate phrases USING ONLY available vocabulary
   - Do NOT use future LEGOs to hit length requirements
   - Accept short phrases if that's all vocabulary allows

3. Validate each phrase:
   - **GATE**: Parse into components, check ALL components < current UID
   - If ANY component >= current UID → REJECT immediately
   - Then assess naturalness in BOTH languages
   - Then verify grammar perfection

4. If vocabulary validation fails → REJECT (do not regenerate with future vocab)
5. If quality/grammar fails → regenerate with SAME vocabulary constraints
6. Document reasoning for acceptable shorter phrases when vocabulary limited
</thinking>

[Generate basket output]
```

**MANDATORY**: Vocabulary checking is the FIRST gate. No phrase passes if it uses future vocabulary, regardless of how natural or grammatically perfect it is.

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

## VOCABULARY CONSTRAINT EXAMPLES

**See "VOCABULARY CONSTRAINT = ABSOLUTE GATE" section above for full explanation.**

Quick reference:
- LEGO #1: Empty basket
- LEGO #2: Max 2-word phrases
- LEGO #3: Max 3-4-word phrases
- LEGO #5: Max 5-6-word phrases
- LEGO #10+: Can start making 7+ word phrases

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

## E-PHRASES (Eternal Practice Phrases per LEGO)

### E-PHRASE REQUIREMENTS (IN PRIORITY ORDER)

#### 1. VOCABULARY CONSTRAINT (ABSOLUTE - NON-NEGOTIABLE)

**ALL words in e-phrase MUST come from LEGOs #1 to #(N-1) where N is current basket.**

❌ **CATASTROPHIC FAILURE**: Using future vocabulary
✅ **CORRECT**: Empty e-phrases array if insufficient vocabulary

**This rule overrides ALL other requirements.**

#### 2. Quality Requirements (IF Vocabulary Permits)

- **Perfect grammar** in BOTH languages
- **Natural, conversational** - things people actually say in BOTH languages
- **Smooth pronunciation** - not clunky or awkward in either language
- **QUALITY > QUANTITY**: Better to have 2 excellent phrases than 5 mediocre ones

#### 3. Length Goals (IF Vocabulary Permits)

- **IDEAL**: 7-10 words in target language
- **ACCEPTABLE**: 4-6 words for LEGOs #5-15 (limited vocabulary)
- **ACCEPTABLE**: 2-3 words for LEGOs #2-4 (very limited vocabulary)
- **ACCEPTABLE**: Empty for LEGO #1 (no prior vocabulary)
- **MAXIMUM**: 15 words (hard cap)

**Length is an ASPIRATION, not a requirement. Never sacrifice vocabulary constraint for length.**

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

Aim for 3-5 phrases per basket IF vocabulary permits:

- **MUST use ONLY vocabulary from LEGOs #1 to #(N-1)** (ABSOLUTE GATE)
- **MUST contain the target LEGO** (what learner is practicing)
- **Perfect grammar** in BOTH languages - validate target AND known language
- **Natural, conversational** - things people actually say in BOTH languages
- **Smooth pronunciation** - not clunky or awkward in either language
- **Variety in position** - LEGO at different positions in phrase (if vocabulary allows)

**Early LEGOs (1-10)**: Expect empty baskets or 1-3 short phrases - this is correct!
**Mid LEGOs (10-50)**: Expect 2-5 phrases, varying lengths
**Later LEGOs (50+)**: Expect 3-5 phrases, 7-10 words each

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

**Basic Requirements (IN PRIORITY ORDER):**

#### 1. VOCABULARY CONSTRAINT (ABSOLUTE GATE - ZERO TOLERANCE)

**For EACH phrase in EACH basket:**
- Parse phrase into component LEGOs
- Check: Are ALL components from LEGOs #1 to #(N-1)?
- If ANY component is >= N → REJECT IMMEDIATELY

**NEVER use:**
- ❌ Words from LEGOs that haven't been learned yet (LEGO #N or higher)
- ❌ Words not in any LEGO
- ❌ Future vocabulary to hit length requirements
- ❌ Made-up words to fill space

**This is the FIRST and ONLY non-negotiable gate.**

#### 2. Accept Vocabulary Limitations (Required Mindset)

**Expected pattern for baskets:**
- **LEGO #1**: EMPTY basket `{"e": [], "d": {}}` - NO PRIOR VOCABULARY
- **LEGO #2**: 0-1 phrases, max 2 words - VERY LIMITED VOCABULARY
- **LEGO #3-4**: 1-2 phrases, max 3-4 words - LIMITED VOCABULARY
- **LEGO #5-9**: 2-3 phrases, max 5-6 words - GROWING VOCABULARY
- **LEGO #10-20**: 2-4 phrases, 6-8 words - MODERATE VOCABULARY
- **LEGO #50+**: 3-5 phrases, 7-10 words - SUFFICIENT VOCABULARY

**This progression is EXPECTED and CORRECT.**

#### 3. Quality Requirements (IF Vocabulary Permits)

- All phrases must be grammatically correct in BOTH languages
- All phrases must be semantically meaningful in BOTH languages
- Prefer natural, conversational phrasing when possible
- Validate real-world language usage

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

**v2.0 (2025-10-26)**:
- **CRITICAL RESTRUCTURE**: Vocabulary constraint now THE ABSOLUTE GATE
- Added "THE LEARNING MODEL (FOUNDATION)" section explaining one-LEGO-at-a-time acquisition
- Added "BASKET STRUCTURE: E-PHRASES vs D-PHRASES" disambiguation section
  - E = Eternal (natural, conversational sentences for core practice)
  - D = Debut/Development (scaffolding fragments, expanding windows)
  - Clarified pedagogical roles and key differences
  - E-phrases must TILE perfectly from LEGOs (no extra/missing words)
  - D-phrases are expanding windows FROM e-phrases, AROUND operative LEGO
  - Complete example showing S0001L05 as culminating LEGO with seed as E-phrase #1
- Moved vocabulary constraint to TOP of document as primary rule
- Reframed length requirements as "aspiration IF vocabulary permits" (not hard requirement)
- Added explicit examples: S0001L01 (empty), S0001L02 (2 words max), progression to S0010+
- Changed priority order: 1) Vocabulary (ABSOLUTE), 2) Quality (IF permits), 3) Length (IF permits)
- Removed "CRITICAL FAILURE" language from length requirements
- Added "CATASTROPHIC ERROR" language to vocabulary violations
- Updated Extended Thinking protocol to check vocabulary FIRST as gate
- Added expected basket progression by LEGO number
- Clarified that empty/short baskets for early LEGOs are CORRECT and EXPECTED
- Addresses catastrophic vocabulary constraint violations in spa_for_eng_20seeds output

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

**Next Update**: Refine based on real-world generation results with v2.0 vocabulary-first approach
