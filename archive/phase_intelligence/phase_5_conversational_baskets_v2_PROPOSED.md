# Phase 5 Intelligence: LEGO Basket Generation v2.0 (PROPOSED)

**Version**: 2.0 (PROPOSED - Not Yet Active)
**Status**: Draft - Awaiting Review
**Purpose**: Add rigorous validation protocol inspired by Phase 3's success

---

## What Changed from v1.0?

**v1.0 Problem**: Massive GATE violations, awkward phrases, incomplete constructions
**v1.0 Cause**: Aspirational guidelines without enforcement mechanisms
**v2.0 Solution**: Procedural validation protocol with falsifiable tests

---

## Your Mission

Generate **15 high-quality, GATE-compliant practice phrases** for this LEGO using a rigorous 5-step validation protocol.

---

## GENERATION PROTOCOL (Follow These Steps)

### STEP 0: LOAD VOCABULARY WHITELIST

**Before generating any phrases**, create your allowed vocabulary:

1. **Extract all Spanish words** from the `taught_legos` list provided
2. **Create whitelist**: `allowed_spanish_words = [...]`
3. **Add conjugation variants**:
   - Verb infinitives → all conjugated forms
   - Example: "hablar" → habla, hablo, hablas, hablamos, hablan, hablando, hablado
   - Example: "estar" → estoy, estás, está, estamos, están

4. **Store whitelist** for validation in STEP 2

**Example**:
```
Taught LEGOs through S0010:
- Quiero, hablar, español, contigo, ahora
- Estoy intentando, aprender
- cómo, lo más frecuentemente posible
- ...

Whitelist (Spanish words only):
[Quiero, quiere, quieres, queremos, quieren,
 hablar, hablo, habla, hablas, hablamos, hablan, hablando, hablado,
 español,
 contigo,
 ahora,
 Estoy, está, estás, están,
 intentando, intentar, intento, intentas, intenta, intentamos, intentan,
 aprender, aprendo, aprendes, aprende, aprendemos, aprenden, aprendiendo,
 cómo,
 lo, más, frecuentemente, posible,
 ...]
```

---

### STEP 1: GENERATE CANDIDATES (20 phrases)

Generate **20 candidate phrases** (over-booking for validation):

**Distribution target**:
- 3-4 phrases: 1-2 LEGOs (building blocks)
- 6-7 phrases: 3-4 LEGOs (pattern practice)
- 10-11 phrases: 5+ LEGOs (conversational - these are GOLD)

**Conjunction usage**:
- Aim for 40%+ (8+ out of 20) using: pero, y, porque, si, cuando
- Chain thoughts naturally: "I want to X and I'm trying to Y but I'm not sure if Z"

**Pattern variety**:
- Use ALL available patterns across your 20 phrases

**At this stage**: Generate freely, be creative, aim for conversational quality.

---

### STEP 2: VALIDATE GATE COMPLIANCE (Word-by-Word)

**For EACH of the 20 candidate phrases**:

1. **Tokenize Spanish phrase** → extract all words
   - Example: "Quiero hablar mejor español" → [Quiero, hablar, mejor, español]

2. **Check EVERY word against whitelist**:
   - Quiero ✓ (in whitelist)
   - hablar ✓ (in whitelist)
   - mejor ❌ (NOT in whitelist - GATE VIOLATION)
   - español ✓ (in whitelist)

3. **Result**: mejor not taught → **REJECT THIS PHRASE**

4. **Keep only phrases where ALL words pass**

**After STEP 2**: You should have ~12-15 GATE-compliant phrases remaining.

**If < 10 phrases remain**: Validation too strict - review whitelist for missing conjugations.

---

### STEP 3: VALIDATE COMPLETENESS

**For EACH remaining phrase**:

**Test 1: English Completeness**
- Does English phrase express a complete thought?
- Can it stand alone without additional context?

**Test 2: Spanish Completeness**
- Does Spanish phrase express a complete thought?
- No incomplete constructions?

**Examples of FAILURES**:
```
❌ "I speak after" → "Hablo después de que"
   Problem: "after" needs completion - after WHAT?

❌ "how to speak after" → "cómo hablar después de que"
   Problem: "después de que" requires a verb clause

❌ "to be able to" → "poder"
   Problem: Incomplete - "to be able to" do WHAT?
```

**Examples of PASSES**:
```
✓ "I can speak after you finish" → "Puedo hablar después de que termines"
  Complete thought in both languages

✓ "I want to be able to speak" → "Quiero poder hablar"
  Complete thought in both languages

✓ "I'd like to speak Spanish with you now" → "Me gustaría hablar español contigo ahora"
  Complete thought in both languages
```

**Reject incomplete phrases**.

**After STEP 3**: You should have ~10-12 complete phrases remaining.

---

### STEP 4: VALIDATE GRAMMAR

**For EACH remaining phrase**, check Spanish grammar:

**Rule 1: "después de que" requires verb clause**
```
❌ "después de que" alone
✓ "después de que termines" (complete clause)
✓ "después de que puedas" (complete clause)
```

**Rule 2: Don't chain awkward constructions**
```
❌ "después de que si puedo" (awkward)
✓ "si puedo después de que termines" (natural)
✓ "después de que termines si es posible" (natural)
```

**Rule 3: Verb conjugations must match subject**
```
❌ "yo habla" (yo + 3rd person)
✓ "yo hablo" (yo + 1st person)
```

**Rule 4: Natural word order**
```
❌ "español quiero hablar" (unnatural)
✓ "quiero hablar español" (natural)
```

**Reject grammatically awkward phrases**.

**After STEP 4**: You should have ~10-12 grammatically correct phrases remaining.

---

### STEP 5: SELECT FINAL 15

**From your validated phrases** (should have 10-12), select the **best** based on:

1. **Distribution**:
   - 2 phrases: 1-2 LEGOs
   - 5-6 phrases: 3-4 LEGOs
   - 7-8 phrases: 5+ LEGOs ⭐

2. **Conjunction usage**: 40%+ (6+ out of 15)

3. **Pattern variety**: All available patterns represented

4. **Natural flow**: Most conversational, most useful

**If you have < 10 validated phrases after STEP 4**:
- **DO NOT** submit
- Return to STEP 1
- Generate 10 MORE candidates
- Run through validation (STEPS 2-4)
- Repeat until you have 15+ validated phrases

---

## OUTPUT FORMAT

Return ONLY a JSON array of 15 phrases:

```json
[
  ["known phrase", "target phrase", "pattern_code_or_null", lego_count],
  ["I want to speak", "Quiero hablar", "P01", 2],
  ["I want to speak and I'm trying to learn", "Quiero hablar y estoy intentando aprender", "P01", 4]
]
```

Each phrase is: `[English, Spanish, Pattern (or null), Number of LEGOs used]`

---

## CRITICAL REQUIREMENTS SUMMARY

### ✅ GATE COMPLIANCE (STEP 2)
- **Every Spanish word** must be in whitelist
- **No exceptions**
- **Word-by-word validation required**

### ✅ COMPLETENESS (STEP 3)
- **Complete thoughts** in both languages
- **Standalone phrases** (no context needed)
- **No fragments**

### ✅ GRAMMAR (STEP 4)
- **Natural Spanish** grammar
- **Proper constructions** (después de que + verb)
- **No awkward chains**

### ✅ CONVERSATIONAL (STEP 5)
- **7-8 phrases with 5+ LEGOs**
- **40%+ conjunction usage**
- **Pattern variety**

---

## Why This Works

**Comparison with Phase 3 (LEGO Extraction)**:

Phase 3 uses:
1. TILE → Decompose seed
2. TEST → Check each piece (FD test)
3. FIX → Wrap larger if needed

Phase 5 v2.0 uses:
1. GENERATE → Create candidates
2. VALIDATE → Check each phrase (GATE, completeness, grammar)
3. FIX → Regenerate if insufficient valid phrases

**Same rigor, different domain.**

---

## Extended Thinking Protocol

```xml
<thinking>
STEP 0: VOCABULARY WHITELIST
- Taught LEGOs: [list all]
- Spanish words: [extract]
- Add conjugations: [verb forms]
- Whitelist complete: [yes/no]

STEP 1: GENERATE 20 CANDIDATES
[List all 20 phrases with known/target/pattern/count]

STEP 2: GATE VALIDATION
[For each phrase:]
- Tokenize Spanish: [words]
- Check whitelist: [word1 ✓, word2 ✓, word3 ❌]
- Result: PASS/REJECT
[Summary: X phrases pass GATE compliance]

STEP 3: COMPLETENESS VALIDATION
[For each GATE-compliant phrase:]
- English complete? yes/no
- Spanish complete? yes/no
- Result: PASS/REJECT
[Summary: X phrases pass completeness]

STEP 4: GRAMMAR VALIDATION
[For each complete phrase:]
- Check grammar rules
- Natural Spanish? yes/no
- Result: PASS/REJECT
[Summary: X phrases pass grammar]

STEP 5: FINAL SELECTION
- Have X validated phrases
- Select best 15 based on distribution/variety
- If < 10, regenerate more candidates

OUTPUT: 15 validated phrases ready
</thinking>
```

---

## Common Pitfalls (Learn from v1.0 Failures)

### ❌ v1.0 Failure: Trust LLM Memory
**v1.0**: "Use taught vocabulary" (no enforcement)
**Result**: LLM hallucinated: saber, mejor, aquí, difícil, enfermo...

**v2.0 Fix**: STEP 2 word-by-word validation against explicit whitelist

### ❌ v1.0 Failure: Incomplete Phrases
**v1.0**: "I speak after" → "Hablo después de que"
**Result**: Awkward, incomplete constructions

**v2.0 Fix**: STEP 3 completeness validation (must be standalone thoughts)

### ❌ v1.0 Failure: Awkward Grammar
**v1.0**: "después de que si puedo" (unnatural)
**Result**: Grammatically odd Spanish

**v2.0 Fix**: STEP 4 grammar validation (check constructions)

---

## Success Criteria

A successful basket generation achieves:

- ✅ **100% GATE compliance** (0 violations)
- ✅ **100% completeness** (0 fragments)
- ✅ **100% grammar correctness** (0 awkward constructions)
- ✅ **100% conversational score** (7-8 phrases with 5+ LEGOs)
- ✅ **40%+ conjunction usage**
- ✅ **Pattern variety** (all patterns used)

**This is "top dollar content" quality.**

---

## Migration Path from v1.0

**Existing baskets** (generated with v1.0):
1. **Validate** using v2.0 protocol
2. **Identify** GATE violations, incomplete phrases, grammar issues
3. **Regenerate** using v2.0 protocol
4. **Compare** quality metrics (should see 100% compliance)

**New baskets** (use v2.0 from start):
1. Follow 5-step protocol
2. Generate 20 candidates
3. Validate strictly
4. Select best 15
5. Submit only after all validations pass

---

## Context Provided to You

You will receive:

```json
{
  "current_lego": {
    "id": "S0011L01",
    "lego": ["I'd like", "Me gustaría"],
    "type": "C"
  },
  "taught_legos": [
    {"id": "S0001L01", "lego": ["I want", "Quiero"]},
    {"id": "S0001L02", "lego": ["to speak", "hablar"]},
    ...
  ],
  "available_patterns": ["P01", "P02", "P03", "P04", "P05", "P06", "P12", "P18"],
  "available_conjunctions": ["si"],
  "is_final_lego": false
}
```

**Use `taught_legos` to build your STEP 0 whitelist.**

---

## Final Checklist (Before Submitting)

- [ ] STEP 0: Vocabulary whitelist created from taught_legos
- [ ] STEP 1: Generated 20 candidate phrases
- [ ] STEP 2: Validated GATE compliance (word-by-word)
- [ ] STEP 3: Validated completeness (standalone thoughts)
- [ ] STEP 4: Validated grammar (natural Spanish)
- [ ] STEP 5: Selected best 15 phrases
- [ ] All phrases pass all validations
- [ ] Distribution: 2 minimal, 5-6 medium, 7-8 conversational
- [ ] Conjunction usage: 40%+ (6+ out of 15)
- [ ] Pattern variety: All patterns represented
- [ ] If final LEGO: Full seed sentence included

**Only submit if ALL checkboxes checked ✅**

---

**End of Phase 5 v2.0 (PROPOSED)**
