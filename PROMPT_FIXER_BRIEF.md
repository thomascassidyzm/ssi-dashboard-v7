# Orchestrator Brief: APML Prompt Fixes Based on 30-Seed Validation

**Mission**: Update APML phase prompts to fix critical quality issues identified in validation report

**Input**:
- `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/QUALITY_REPORT.md`
- `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/ssi-course-production.apml`

**User Clarifications** (authoritative decisions):

---

## Issue Resolutions

### Issue #1: E-Phrase Count (NOT blocking)
**User Decision**: E-phrase count is NOT an iron rule - it's a direction
- **Goal**: Reasonably long phrases (~10 words) in as many e-phrases as possible
- **Minimum**: Hopefully at least 3 per basket
- **Quality > Quantity**: Having a bad/clunky e-phrase is WORSE than having nothing
- **D-phrases CAN be clunky** (they're expanding windows from e-phrases)
- **Action**: Update Phase 5 prompt to prioritize quality over count

### Issue #2: IRON RULE - Infinitive "to" (RESOLVED)
**User Decision**: Allow infinitive "to" - it's NOT a preposition
- **Reasoning**:
  - "to" is part of the infinitive, not a preposition
  - Bare infinitives are NOT FD (commands + verb conjugations overlap)
  - Full infinitives ARE FD-compliant
- **Action**: Update APML IRON RULE section to explicitly allow infinitive "to"

### Issue #3: Italian Grammar Errors (CRITICAL - UNFORGIVEABLE)
**User Decision**: This MUST NEVER happen - egregious error
- **15 instances** of missing prepositions ("cercando parlare" vs "cercando di parlare")
- **Poor syntax in target language is unforgiveable**
- **LLM MUST KNOW THIS!!!**
- **Action**:
  1. Find where these errors were introduced (which phase?)
  2. Update that phase's prompt with STRONG validation requirements
  3. Add explicit Italian grammar rules to Phase 5 prompt

### Issue #4: Culminating LEGO Rule (EASY FIX)
**User Decision**: All culminating LEGOs MUST have parent SEED as e-phrase #1
- **This is very easy to fix**
- **Action**: Update Phase 5 prompt to enforce this rule clearly

### Issue #5: E-Phrase Length (CRITICAL FAILURE)
**User Decision**: Short e-phrases are a FAIL
- **MUST endeavour to have e-phrases of at least 7 words**
- **Ideally around 10 words**
- **Cannot have short e-phrases**
- **Action**: Update Phase 5 prompt with strict length requirements (7+ words minimum, 10 ideal)

---

## Tasks (Execute in Sequence)

### Task 1: Investigate Grammar Errors
**Find the source of the 15 Italian grammar errors**

1. Read Phase 5 basket file: `/Users/tomcassidy/SSi/SSi_Course_Production/vfs/courses/ita_for_eng_574seeds/phase_5a_BASKETS_30seeds_v8.json`
2. Locate the 15 instances:
   - "cercando parlare" (should be "cercando di parlare")
   - "imparando parlare" (should be "imparando a parlare")
3. Determine: Were these errors in Phase 1 translations? Or introduced in Phase 5 basket generation?
4. Document findings

### Task 2: Update APML IRON RULE Section
**Location**: APML lines ~487-489

**Current Text**:
```
### IRON RULE
ABSOLUTE_CONSTRAINT: No LEGO begins or ends with a preposition
EXAMPLES:
  ✗ "to the"
  ✗ "with me"
  ✗ "in"
NON_NEGOTIABLE: Zero exceptions allowed
```

**Update To**:
```
### IRON RULE
ABSOLUTE_CONSTRAINT: No LEGO begins or ends with a preposition

IMPORTANT CLARIFICATION:
  - The infinitive marker "to" (as in "to speak") is NOT a preposition
  - It is a grammatical marker that forms part of the infinitive verb
  - Full infinitives like "to speak", "to learn" are ALLOWED and FD-compliant
  - Bare infinitives are NOT FD (conflict with commands and conjugations)

EXAMPLES OF VIOLATIONS:
  ✗ "to the" (preposition "to" for direction)
  ✗ "with me" (preposition "with")
  ✗ "in" (standalone preposition)
  ✗ "con" (standalone preposition)
  ✗ "da" (standalone preposition)

EXAMPLES OF ALLOWED:
  ✅ "to speak" (infinitive marker + verb)
  ✅ "to learn" (infinitive marker + verb)
  ✅ "parlare" (infinitive without marker)

NON_NEGOTIABLE: No standalone prepositions or prepositional phrase boundaries
```

### Task 3: Update Phase 5 Prompt - E-Phrase Quality & Length
**Location**: APML Phase 5 prompt (search for "E-PHRASES")

**Add these requirements PROMINENTLY**:

```
## E-PHRASE CRITICAL REQUIREMENTS (NON-NEGOTIABLE)

### Length Requirements (ABSOLUTE)
- **MINIMUM**: 7 words in target language
- **IDEAL**: 10 words in target language
- **MAXIMUM**: 15 words (hard cap)
- Short e-phrases (< 7 words) are a CRITICAL FAILURE
- Better to have NO e-phrase than a short/clunky one

### Quality Requirements (ABSOLUTE)
- QUALITY > QUANTITY: Do not force bad phrases to hit a count
- E-phrases must be NATURAL and conversational in BOTH languages
- If vocabulary is insufficient for quality 10-word phrase, skip it
- Aim for 3-5 excellent e-phrases per basket (not forced to 5)

### Target Language Grammar (UNFORGIVEABLE ERRORS)
⚠️ **POOR SYNTAX IN TARGET LANGUAGE IS UNFORGIVEABLE** ⚠️

For Italian specifically:
- "cercare" + infinitive REQUIRES "di": "cercando di parlare" NOT "cercando parlare"
- "imparare" + infinitive REQUIRES "a": "imparando a parlare" NOT "imparando parlare"
- "provare" + infinitive REQUIRES "a": "provando a dire" NOT "provando dire"
- "continuare" + infinitive REQUIRES "a": "continuando a parlare" NOT "continuando parlare"
- "finire" + infinitive REQUIRES "di": "finendo di parlare" NOT "finendo parlare"

**VALIDATE EVERY E-PHRASE**:
- Is the target language grammar PERFECT?
- Would a native speaker say this naturally?
- Are all required prepositions present?

If you cannot ensure perfect target language grammar, DO NOT include the phrase.
```

### Task 4: Update Phase 5 Prompt - Culminating LEGO Rule
**Location**: Phase 5 prompt, "CULMINATING LEGO RULE" section

**Update existing text to be MORE EXPLICIT**:

```
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
```

### Task 5: Update Phase 5 Prompt - D-Phrase Clarification
**Location**: Phase 5 prompt, "D-PHRASES" section

**Add this note**:

```
### D-PHRASE QUALITY ALLOWANCE

**Important**: D-phrases CAN be somewhat clunky or fragment-like
- They are expanding windows from e-phrases (2-lego, 3-lego, 4-lego, 5-lego)
- Syntactic correctness required, but naturalness is less critical
- Focus: Help learners build up to full e-phrases gradually

**Contrast with E-phrases**:
- E-phrases: MUST be natural, conversational, perfect grammar
- D-phrases: Can be awkward fragments as long as syntax is correct
```

### Task 6: Clarify Phase 1 Two-Step Translation Architecture
**Location**: APML Phase 1 section (around lines 218-375)

**Critical Architectural Clarification**:
Phase 1 does NOT translate canonical English into both target AND known simultaneously.
Instead, it uses a TWO-STEP process:

**Step 1**: English canonical → Target (pedagogically optimized with 6 heuristics)
**Step 2**: Target → Known (back-translation to match target's structure)

**Why This Matters**:
- Target is the "truth" (optimized for teaching)
- Known translation matches target's phrasing (ensures better FD_LOOP compliance)
- Works for ANY language pair combination:
  - `ita_for_eng`: English→Italian (optimized), Italian→English (already done since canonical IS English)
  - `ita_for_fra`: English→Italian (optimized), Italian→French (back-translation)
  - `cym_for_spa`: English→Welsh (optimized), Welsh→Spanish (back-translation)

**Add to Phase 1 CRITICAL_RULES section** (before PROMPT):

```
TRANSLATION_ARCHITECTURE:
  Phase 1 uses a TWO-STEP translation process to ensure optimal FD_LOOP compliance:

  STEP 1 - Canonical → Target (Pedagogical Optimization):
    - Start with English canonical seed
    - Apply all 6 pedagogical heuristics
    - Generate pedagogically optimized target language translation
    - This becomes the "source of truth"

  STEP 2 - Target → Known (Back-Translation):
    - Take the optimized target translation from Step 1
    - Translate it into the known language
    - Ensure known translation MATCHES target's structure
    - This creates better FD_LOOP compliance (target ↔ known alignment)

  EXAMPLES:
    Course: ita_for_eng (Italian for English speakers)
      - Canonical: "I want to speak Italian with you now"
      - Step 1: English → Italian (optimized): "Voglio parlare italiano con te adesso"
      - Step 2: Italian → English: Use canonical (since canonical IS English)

    Course: ita_for_fra (Italian for French speakers)
      - Canonical: "I want to speak Italian with you now"
      - Step 1: English → Italian (optimized): "Voglio parlare italiano con te adesso"
      - Step 2: Italian → French: "Je veux parler italien avec toi maintenant"
      - Note: French matches Italian structure, NOT English canonical

  WHY THIS WORKS:
    - Target is pedagogically optimized (6 heuristics applied)
    - Known translation mirrors target structure (easier LEGO mapping)
    - FD_LOOP more reliable (target ↔ known designed to align)
    - Works for ANY language pair combination
```

**Update Phase 1 PROMPT** to reflect two-step process:

Find the section that says "Apply 6 pedagogical heuristics to translate..." and update to:

```
## Your Mission

For each canonical English seed:

1. **STEP 1: Canonical → Target (Pedagogical Optimization)**
   - Apply all 6 pedagogical heuristics
   - Generate optimized target language translation
   - Validate: Natural, high-frequency, clear, brief, consistent, useful

2. **STEP 2: Target → Known (Back-Translation)**
   - Take the optimized target translation
   - Translate to known language
   - Ensure known translation MATCHES target structure
   - Goal: Known ↔ Target alignment for better FD_LOOP

3. **Generate Amino Acid**
   - Deterministic UUID: hash(source + target + metadata)
   - Store as: vfs/amino_acids/translations/{uuid}.json
   - Content: { source, target, seed_id, heuristics_applied, metadata }

IMPORTANT: For courses where known=English (e.g., ita_for_eng):
- Step 1 produces optimized target
- Step 2 can reuse canonical English (it's already the known language)
- But verify the English phrasing aligns with target structure

For courses where known≠English (e.g., ita_for_fra):
- Step 1 produces optimized Italian
- Step 2 MUST translate Italian → French (NOT English → French)
- This ensures French mirrors Italian structure
```

### Task 7: Version Update
Update APML version from 7.1.0 → 7.2.0

Add to VERSION HISTORY:
```
VERSION: 7.2.0
DATE: 2025-10-13
CHANGES:
  - Clarified Phase 1 two-step translation architecture (canonical→target→known)
  - Clarified IRON RULE: infinitive "to" is NOT a preposition (explicitly allowed)
  - Updated Phase 5 prompt with CRITICAL e-phrase length requirements (7-10 words)
  - Added UNFORGIVEABLE target language grammar validation
  - Strengthened culminating LEGO rule enforcement
  - Clarified e-phrase quality > quantity (3-5 excellent vs forced 5)
  - Added D-phrase quality allowance explanation
  - Based on 30-seed Italian validation findings (QUALITY_REPORT.md)
```

---

## Validation

After updates, verify:
1. ✅ IRON RULE section explicitly allows infinitive "to"
2. ✅ Phase 5 prompt has prominent length requirements (7+ words)
3. ✅ Phase 5 prompt has Italian grammar validation rules
4. ✅ Phase 5 prompt has clear culminating LEGO enforcement
5. ✅ Phase 5 prompt clarifies quality > quantity for e-phrases
6. ✅ Version updated to 7.2.0
7. ✅ Grammar error source identified in Task 1

---

## Output

**Report Back**:
```
✅ APML prompts updated (v7.2.0)

Fixes Applied:
1. IRON RULE: Infinitive "to" explicitly allowed
2. Phase 5: E-phrase length requirements (7-10 words MANDATORY)
3. Phase 5: Italian grammar validation (UNFORGIVEABLE errors listed)
4. Phase 5: Culminating LEGO rule strengthened
5. Phase 5: Quality > quantity clarified

Grammar Error Investigation:
- [Report findings from Task 1 - where did the 15 errors originate?]

Ready to regenerate 30-seed baskets with improved Phase 5 prompt.
```

---

## Critical Notes

- **Be autonomous**: Make the updates directly to APML
- **Be precise**: Follow the exact text provided above
- **Be thorough**: Don't skip validation steps
- **Keep user informed**: Report back when done
- **Don't execute regeneration**: Just update the prompts, report back

**The user will decide when to regenerate baskets with new prompts.**
