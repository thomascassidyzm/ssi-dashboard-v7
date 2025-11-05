# Phase 3 vs Phase 5: Quality Control Comparison

**Analysis Date**: 2025-11-05
**Purpose**: Understand why Phase 3 (LEGO Extraction) succeeds where Phase 5 (Basket Generation) fails

---

## Overview

| Aspect | Phase 3 (LEGO Extraction) | Phase 5 (Basket Generation) |
|--------|---------------------------|------------------------------|
| **Purpose** | Decompose seed sentences into reusable LEGOs | Generate practice phrases for each LEGO |
| **Quality** | ✅ Excellent - rigorous, deterministic | ❌ Poor - GATE violations, awkward phrases |
| **Validation** | ✅ 3-step TEST protocol | ❌ Vague "use taught vocabulary" |
| **Constraints** | ✅ FD test, tiling requirement | ⚠️ Conversational metrics only |
| **Result** | ✅ Production-ready LEGOs | ❌ Unusable baskets (pedagogical failures) |

---

## The Core Difference: Rigor vs Aspiration

### Phase 3: The Only Rule That Matters

```
🎯 THE ONLY RULE THAT MATTERS

When learner hears KNOWN → they produce exactly ONE TARGET (zero uncertainty)

Everything below is just ways to check this rule.
```

**Implication**: If learner has ANY uncertainty about what to produce → **FAIL**.

This is **testable, falsifiable, strict**.

### Phase 5: Aspirational Goals

```
### 3. GATE COMPLIANCE (★★★★★)
**ONLY use vocabulary from previously taught LEGOs**

Every word in your Spanish phrases MUST appear in one of the previously taught LEGOs.
```

**Implication**: LLM should remember to check... but **no mechanism to enforce**.

This is **aspirational, non-enforceable, weak**.

---

## Detailed Comparison

### 1. Vocabulary Control

#### Phase 3: Implicit Control via FD Test

Phase 3 doesn't explicitly say "only use taught vocabulary" because:
- It's **extracting FROM seeds** (vocabulary predetermined)
- FD test ensures no ambiguity (prevents introducing untaught words)
- Tiling requirement = must reconstruct seed exactly

**Result**: Impossible to use untaught vocabulary (source is the seed itself).

#### Phase 5: Explicit But Unenforced

Phase 5 says:
```markdown
**ONLY use vocabulary from previously taught LEGOs**

Every word in your Spanish phrases MUST appear in one of the previously taught LEGOs.
```

But **provides no enforcement**:
- No vocabulary whitelist in prompt
- No word-by-word validation step
- LLM must "remember" what's taught
- LLM free to hallucinate: saber, mejor, aquí, allá, difícil, enfermo, etc.

**Result**: Massive GATE violations (10+ untaught words per basket).

---

### 2. Validation Protocol

#### Phase 3: 3-Step Test (TILE → TEST → FIX)

```
STEP 1: TILE
Break seed into pieces that reconstruct it perfectly.

STEP 2: TEST (The Uncertainty Checklist)
For EVERY piece, ask these 3 questions:
1. Does learner already know a simpler TARGET for this KNOWN?
2. Is this an ambiguous standalone word?
3. Can this word mean multiple things in KNOWN language?

STEP 3: FIX
If TEST fails → Make it BIGGER
```

**This is a PROTOCOL**:
- Step-by-step procedure
- Clear pass/fail criteria
- Iterative refinement (test → fix → retest)
- Must check EVERY piece

**Result**: High-quality, deterministic LEGOs that pass all tests.

#### Phase 5: Quality Checklist (No Protocol)

```markdown
## Quality Checklist Before Submitting

- [ ] At least 7-8 phrases have 5+ LEGOs
- [ ] At least 6 phrases use conjunctions (pero, y, porque, si, cuando)
- [ ] All Spanish words appear in taught LEGOs list (GATE compliant)
- [ ] Natural, conversational phrasing (how people actually think/speak)
- [ ] All available patterns represented
```

**This is ASPIRATIONAL**:
- Checklist items, not procedural steps
- No mechanism to verify "All Spanish words appear in taught LEGOs list"
- LLM checks boxes mentally but doesn't validate
- No iterative refinement

**Result**: LLM generates phrases, assumes compliance, submits with violations.

---

### 3. Completeness Requirement

#### Phase 3: Tiling = Perfect Reconstruction

```
STEP 1: TILE
Break seed into pieces that reconstruct it perfectly.

Seed: "Quiero hablar español contigo ahora"
Pieces: Quiero + hablar + español + contigo + ahora

Recombination: Quiero + hablar + español + contigo + ahora = exact seed ✓
```

**Enforcement**: If pieces don't reconstruct seed → FAIL.

**Result**: Every piece is complete and meaningful.

#### Phase 5: No Completeness Check

Phase 5 has no equivalent to "tiling". Phrases can be:
- Incomplete: "I speak after" (after WHAT?)
- Fragmentary: "how to speak after" (makes no sense standalone)
- Awkward: "después de que" alone (needs clause)

**Result**: Generated baskets contain incomplete, awkward phrases.

---

### 4. Ambiguity Prevention

#### Phase 3: FD Test Question #2

```
2. "Is this an ambiguous standalone word?"
   - que, de, a, en (alone) ← always ambiguous
   - Articles, auxiliaries, negations (alone) ← need context
```

**Example**:
```
❌ "que" = "that" [fails test #2]
   Problem: Ambiguous - could be subordinate, relative, comparative

✅ "que es" = "that it is" [passes - context makes it deterministic]
   Solution: Wrap with context until deterministic
```

**Enforcement**: If ambiguous standalone → **MUST wrap larger**.

**Result**: No ambiguous LEGOs in output.

#### Phase 5: No Ambiguity Check

Phase 5 doesn't test for standalone ambiguity. Generated phrases like:
- "I speak after" → "Hablo después de que"
- Problem: "después de que" is ambiguous/incomplete without following clause

**Result**: Awkward, incomplete constructions in baskets.

---

### 5. Example: How Each Handles "después de que"

#### Phase 3 Approach (if it were extracting this):

```
STEP 1: TILE
Seed: "Me gustaría hablar después de que termines"
Pieces: Me gustaría + hablar + después de que termines

STEP 2: TEST "después de que"
Question 1: Does learner know simpler form?
  → No simpler form

Question 2: Is this ambiguous standalone?
  → YES! "después de que" requires a clause (después de que WHAT?)
  → FAIL ❌

STEP 3: FIX
Wrap larger: "después de que termines" (complete clause)
  → Now deterministic ✓

Result: LEGO is "después de que termines" (complete)
```

#### Phase 5 Approach (what actually happened):

```
Generate practice phrases for "después de que":

1. "after" → "después de que" [1 LEGO]
2. "I speak after" → "Hablo después de que" [2 LEGOs]
3. "how to speak after" → "cómo hablar después de que" [3 LEGOs]

Problem: None of these are complete thoughts!
Result: Awkward, incomplete phrases ❌
```

**Phase 5 lacks the FD test that would catch this.**

---

### 6. Language Mixing (Fixed but Reveals Systemic Issue)

#### Phase 3: Never Had This Problem

Phase 3 examples are always properly separated:

```markdown
**The LEGO says:** "I'm going to practise" (natural English)
**The components reveal:** Spanish literally says "I go to practise"
**Learner understands:** Future periphrastic construction
```

Clear separation: English example, then Spanish explanation.

#### Phase 5: Had Language Mixing (Fixed in 79cc763)

Phase 5 **originally** had:

```markdown
GOLD conjunctions - use liberally:
- **pero** (but) - "I want to speak pero I'm not sure"
- **y** (and) - "I'm trying to learn y I want to practise"
```

**Root cause**: Examples were teaching materials, not rigorous specifications.

**Fix applied**: Now uses table format with explicit separation.

**Lesson**: Phase 5 lacked rigor from the start; fixing symptoms not root cause.

---

## Why Phase 3 Works and Phase 5 Doesn't

### Phase 3 Success Factors:

1. **Extraction, not generation**
   - Source material (seed) constrains vocabulary
   - Can't hallucinate untaught words
   - Tiling requirement = perfect reconstruction

2. **Falsifiable tests**
   - FD test has clear pass/fail
   - Ambiguity test is objective
   - Must check EVERY piece

3. **Iterative refinement**
   - Test → Fix → Retest
   - Explicit protocol for failures
   - Can't proceed until all tests pass

4. **Pedagogical focus**
   - Zero uncertainty principle
   - Learner confidence paramount
   - Every decision traced to learner's mental state

### Phase 5 Failure Factors:

1. **Generation, not extraction**
   - LLM creates phrases from scratch
   - Can hallucinate any word it knows
   - No source constraint

2. **Aspirational goals**
   - "Use taught vocabulary" = suggestion, not requirement
   - No falsifiable test
   - LLM assumes compliance

3. **No validation protocol**
   - Checklist, not procedure
   - No word-by-word checking
   - No iterative refinement

4. **Metrics-focused**
   - 40% conjunctions = metric
   - 5+ LEGOs = metric
   - Metrics ≠ quality
   - Hit metrics, ignore pedagogy

---

## The Fundamental Problem

### Phase 3 is a PROCEDURE:

```
Input: Seed sentence
Step 1: Decompose (TILE)
Step 2: Test each piece (FD test)
Step 3: Fix failures (wrap larger)
Output: Validated LEGOs
```

**This is executable, verifiable, deterministic.**

### Phase 5 is a REQUEST:

```
Input: LEGO + taught vocabulary
Request: Generate 15 phrases
Guidelines: Be conversational, use conjunctions, GATE compliant
Output: 15 phrases (assumed compliant)
```

**This is aspirational, unverified, trust-based.**

---

## Path Forward: Make Phase 5 Procedural

### Proposed: Phase 5 v2.0 with Validation Protocol

```markdown
## GENERATION PROTOCOL (5 Steps)

### STEP 0: LOAD VOCABULARY WHITELIST
- Extract all Spanish words from taught LEGOs (provided)
- Create allowed_words = [word1, word2, ...]
- Include conjugation rules: verb → all tenses

### STEP 1: GENERATE CANDIDATES
- Create 20 candidate phrases
- Focus on conversational (5+ LEGOs)
- Use conjunctions (pero, y, porque, si)

### STEP 2: VALIDATE GATE COMPLIANCE
For EACH phrase:
- Tokenize Spanish (extract all words)
- Check: Is word in allowed_words?
- If NO → REJECT phrase
- Keep only GATE-compliant phrases

### STEP 3: VALIDATE COMPLETENESS
For EACH remaining phrase:
- Does English form complete thought?
- Does Spanish form complete thought?
- Can stand alone without context?
- If NO → REJECT phrase

### STEP 4: VALIDATE GRAMMAR
For EACH remaining phrase:
- Check constructions: "después de que" + verb clause?
- No awkward chains: "después de que si" ?
- Natural Spanish grammar?
- If NO → REJECT phrase

### STEP 5: SELECT FINAL 15
- From validated phrases, select best 15
- Ensure distribution: 2 minimal, 5-6 medium, 7-8 conversational
- Ensure pattern variety
- If < 15 valid → regenerate more in STEP 1
```

**This is now PROCEDURAL, FALSIFIABLE, RIGOROUS.**

---

## Conclusion

**Phase 3 succeeds because it's a PROCEDURE with TESTS.**

**Phase 5 fails because it's a REQUEST with HOPES.**

To fix Phase 5:
1. Add explicit vocabulary whitelist to prompts
2. Create step-by-step validation protocol
3. Make GATE compliance falsifiable (word-by-word check)
4. Add completeness and grammar validation
5. Iterate: generate → validate → fix → repeat

**Import Phase 3's rigor into Phase 5.**

---

**Next Steps**: Implement Phase 5 v2.0 with procedural validation protocol.
