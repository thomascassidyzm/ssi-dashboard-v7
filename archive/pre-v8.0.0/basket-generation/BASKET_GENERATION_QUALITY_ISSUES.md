# Basket Generation Quality Issues - Analysis Report

**Date**: 2025-11-05
**Commit Analyzed**: 79cc763 (CRITICAL FIX: Remove language mixing)
**Status**: Major quality issues identified

## Executive Summary

While commit 79cc763 fixed the **language mixing problem** (Spanish conjunctions in English phrases), analysis reveals **significant quality issues remain**:

1. **Massive GATE violations** - untaught vocabulary used extensively
2. **Awkward/incomplete phrases** - grammatically odd constructions
3. **Root cause**: Phase 5 intelligence lacks strict validation rules present in Phase 3

## Critical Issues Found

### 1. GATE Violations (Untaught Vocabulary)

**S0011 GATE Violations**:
- `saber` (to know) - line 457: "Me gustaría saber si puedo hablar"
- `mejor` (better) - line 469: "Me gustaría poder hablar mejor"
- `es posible` (it is possible) - line 481: "si es posible después de que"

**S0021 GATE Violations** (EXTENSIVE):
- `saber/sabes/saben` (to know) - used 4+ times, never taught
- `aquí` (here), `allá` (there) - line 63
- `caro` (expensive) - line 69
- `ella` (she), `él` (he) - lines 75, 99, 123
- `dirección` (address) - line 81
- `ya` (already) - line 87
- `esto` (this), `eso` (that) - lines 93, 111, 129
- `trabajando` (working) - lines 99, 123
- `conocer` (to know/be acquainted) - line 105
- `difícil` (difficult) - line 111
- `necesitar` (to need) - line 117
- `enfermo` (sick) - line 135

**Impact**: Learners prompted with words they haven't learned → **pedagogical failure**.

### 2. Awkward/Incomplete Phrases

**S0011 - Incomplete "después de que" phrases**:
```
Line 287: "I speak after" → "Hablo después de que"
          Problem: "después de que" requires a clause (after WHAT?)

Line 293: "how to speak after" → "cómo hablar después de que"
          Problem: Incomplete thought, grammatically awkward

Line 304: "I'm trying to learn after" → "Estoy intentando aprender después de que"
          Problem: Same issue - "after" needs completion
```

**S0011 - Awkward "después de que si" constructions**:
```
Line 335: "I'd like to be able to speak after if I can remember"
          → "Me gustaría poder hablar después de que si puedo recordar"

Problem: "después de que si" is unnatural Spanish
Better: "después de que pueda recordar" OR "si puedo recordar después"
```

### 3. Pattern Violations

**S0021L01 - Non-standard pattern codes**:
```
Lines 58-144 use custom pattern codes not in extraction map:
- "question_why"
- "question_why_and"
- "question_why_if"
- "question_why_but"

Expected: Should use P01-P18 standard pattern codes from extraction map
```

## Root Cause Analysis

### Why did Phase 5 produce low-quality output?

Comparing **Phase 3 (LEGO Extraction)** vs **Phase 5 (Basket Generation)**:

| Requirement | Phase 3 | Phase 5 | Result |
|------------|---------|---------|--------|
| **Language purity** | ✅ Explicit KNOWN/TARGET separation | ❌ Bad examples mixed languages | Fixed in 79cc763 |
| **GATE compliance** | ✅ "Only use taught vocabulary" | ⚠️ Weak enforcement | **MAJOR VIOLATIONS** |
| **Completeness check** | ✅ Tiling requirement (reconstruct seed) | ❌ No completeness check | Incomplete phrases |
| **Grammar validation** | ✅ FD test (deterministic mapping) | ❌ No grammar validation | Awkward constructions |
| **Vocabulary list** | ✅ Extraction map provided | ⚠️ Map available but not enforced | LLM ignored constraints |

### Phase 3's Strength: The FD Test

Phase 3 has a **rigorous 3-step validation** (docs/phase_intelligence/phase_3_lego_pairs.md):

```
STEP 2: TEST (The Uncertainty Checklist)
1. Does learner already know a simpler TARGET for this KNOWN?
2. Is this an ambiguous standalone word?
3. Can this word mean multiple things in KNOWN language?

STEP 3: FIX
If TEST fails → Make it BIGGER
```

This **prevents** issues like "después de que" alone (fails test #2: ambiguous standalone).

### Phase 5's Weakness: Vague Instructions

Phase 5 says (line 36-43):
```markdown
### 3. GATE COMPLIANCE (★★★★★)
**ONLY use vocabulary from previously taught LEGOs**

Every word in your Spanish phrases MUST appear in one of the previously taught LEGOs.
```

But **NO MECHANISM TO ENFORCE**:
- No vocabulary list validation
- No word-by-word checking protocol
- LLM free to hallucinate words

## Comparison: Phase 3 vs Phase 5 Quality

### Phase 3 (LEGO Extraction) Quality Characteristics:
- **Rigorous constraints**: Tiling, FD test, componentization rules
- **Explicit validation**: 3-step protocol with clear pass/fail
- **Pedagogical focus**: Every LEGO must have standalone utility
- **Result**: Clean, deterministic LEGOs that reconstruct seeds perfectly

### Phase 5 (Basket Generation) Quality Characteristics:
- **Looser constraints**: "Use taught vocabulary" without enforcement
- **No validation protocol**: Just "think like conversation"
- **Quantity focus**: 15 phrases, 40% conjunctions, 5+ LEGOs
- **Result**: High conversational scores but massive GATE violations

## Impact Assessment

### What Happens with These Baskets in Production?

**Scenario**: Learner using S0021 basket
1. Prompt: "Why do you know that?"
2. Expected response: "¿Por qué sabes eso?"
3. **Problem**: Learner hasn't learned `saber` yet!
4. **Result**:
   - Learner can't produce correct answer
   - Confidence damaged
   - Learning disrupted
   - System appears broken

**Multiplied across all generated baskets** = **pedagogical disaster**

## Recommendations

### Immediate Fixes Required

1. **Add strict GATE validation to Phase 5**:
   ```markdown
   STEP 0: LOAD VOCABULARY WHITELIST
   - Extract all Spanish words from taught LEGOs (provided in context)
   - Create whitelist of allowed words + conjugations

   STEP 3.5: VALIDATE GATE COMPLIANCE
   For EVERY Spanish phrase generated:
   - Extract all Spanish words (tokenize)
   - Check each word against whitelist
   - REJECT phrase if ANY word not in whitelist
   - Regenerate with feedback
   ```

2. **Add completeness validation**:
   ```markdown
   VALIDATE PHRASE COMPLETENESS:
   - Does English phrase form complete thought?
   - Does Spanish phrase form complete thought?
   - Can phrase stand alone without context?
   - REJECT if incomplete (e.g., "I speak after")
   ```

3. **Add grammar validation for constructions**:
   ```markdown
   VALIDATE SPANISH GRAMMAR:
   - "después de que" must be followed by verb clause
   - Don't chain: "después de que si" → awkward
   - Use: "si... después de que..." OR "después de que [verb]"
   ```

4. **Provide explicit vocabulary whitelist in prompt**:
   - Don't just reference "taught LEGOs"
   - **List every allowed Spanish word explicitly**
   - Include allowed conjugations (infinitive → conjugated forms)
   - Make it impossible to ignore

### Long-term Process Improvements

1. **Two-phase generation**:
   - Phase A: Generate 20 candidate phrases
   - Phase B: Validate each phrase strictly, keep only compliant ones
   - Regenerate if < 15 pass validation

2. **Post-generation validator**:
   - Automated script checks EVERY phrase
   - Word-by-word GATE compliance
   - Grammar pattern validation
   - Reject baskets with violations

3. **Learn from Phase 3**:
   - Import Phase 3's rigorous testing methodology
   - Adapt FD test for phrase validation
   - Same precision, applied to baskets

## Files to Update

1. `docs/phase_intelligence/phase_5_conversational_baskets.md` ✅ (Language mixing fixed)
   - **TODO**: Add strict GATE validation protocol
   - **TODO**: Add completeness validation
   - **TODO**: Add grammar validation rules

2. `claude_code_web_test/LEGO_EXTRACTION_MAP_S0001-S0050_AUTHORITATIVE.json`
   - **TODO**: Add cumulative vocabulary whitelist per seed
   - **TODO**: Include allowed conjugations explicitly

3. **NEW**: `validate_basket_gate_compliance.cjs`
   - Word-by-word Spanish vocabulary checking
   - Compare against extraction map
   - Reject phrases with untaught words

4. **NEW**: `validate_basket_completeness.cjs`
   - Check for incomplete phrases
   - Grammar pattern validation
   - Awkward construction detection

## Conclusion

The basket generation process achieved **high conversational scores** (100/100) but at the cost of **pedagogical integrity**. The massive GATE violations make these baskets **unusable in production** without significant rework.

**Primary root cause**: Phase 5 lacks the rigorous validation protocols that make Phase 3 successful.

**Path forward**: Import Phase 3's validation rigor into Phase 5, add automated validators, regenerate all baskets with strict enforcement.

---

**Status**: Analysis complete. Awaiting decision on regeneration strategy.
