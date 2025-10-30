# Extended Thinking Protocol (MANDATORY)

**Use extended thinking for EVERY seed translation. Without it, ~30% inconsistent translations.**

---

## Why Extended Thinking?

Phase 1 involves complex reasoning:
- Determining if concepts match (vocabulary registry)
- Judging cognate similarity and semantic networks
- Checking semantic accuracy (frequency vs quantity)
- Validating target language grammar
- Maintaining consistency across 668 seeds
- Balancing naturalness with pedagogy

**Without extended thinking: inconsistent translations, violated rules, grammar errors**

---

## The 10-Step Protocol

**For EVERY seed translation:**

```
<thinking>
1. ⚠️ VERIFY CANONICAL MEANING - understand exactly what seed says
2. Check vocabulary registry for existing concept mappings
3. If new concept: CHECK FOR COGNATE FIRST (mandatory seeds 1-100)
   - Does known language have synonym that's cognate-friendly?
   - Does target language have the cognate?
   - If YES → use cognate (required)
4. Validate semantic accuracy (correct category?)
5. Check for grammatical simplification opportunities
   - Can I preserve meaning with simpler grammar?
   - If NO → use required grammar (subjunctive, etc.)
   - NEVER change canonical meaning to simplify
6. Validate grammar patterns for target language
7. Update registry with new concept mappings
8. If known is English → use canonical directly
9. If known is NOT English → translate with cognate matching
10. Document reasoning for complex decisions
</thinking>

[Generate target and known translations]
```

---

## Example 1: Concept Registry Check

```
<thinking>
Seed S0015: "I'm trying to remember"

Step 1: Verify canonical meaning
- "I'm trying to remember" (present progressive + infinitive)

Step 2: Check vocabulary registry
- "trying" → Already mapped to "intentar" in S0002 ✓
- "to remember" → Already mapped to "recordar" in S0006 ✓

Step 3: No new concepts, skip cognate check

Step 4: Semantic accuracy
- "trying" = attempting (not testing)
- "remember" = recall (not memorize)
- Semantics match ✓

Step 5: Grammar simplification
- "Estoy intentando recordar" (simple present progressive + infinitive)
- No complex grammar needed ✓

Step 6: Validate Spanish grammar
- "Estoy intentando" (correct progressive form)
- "recordar" (correct infinitive after intentando)
- Grammar perfect ✓

Step 7: Update registry
- No new mappings (using existing)

Step 8: Known is English
- Use canonical: "I'm trying to remember" ✓

Decision: Use registry words for consistency
Translation: ["Estoy intentando recordar.", "I'm trying to remember."]
</thinking>
```

---

## Example 2: New Concept - Cognate Check

```
<thinking>
Seed S0003: "how to speak as often as possible"

Step 1: Verify canonical meaning
- "how to speak as often as possible" (frequency maximization)

Step 2: Check vocabulary registry
- "how" → NEW concept
- "to speak" → Already mapped to "hablar" in S0001 ✓
- "often" → NEW concept
- "possible" → NEW concept

Step 3: CHECK COGNATE FIRST (mandatory for seeds 1-100)

New concept: "often"
- Direct cognate? No ("a menudo" is idiomatic, not cognate)
- Synonym with cognate? YES
  - "often" → English synonym "frequently"
  - "frequently" → Spanish cognate "frecuentemente" ✓

Decision: Use "frecuentemente" (cognate via synonym)
Register: "often/frequently" → "frecuentemente"

New concept: "possible"
- Cognate check: "possible" → "posible" ✓
- Direct cognate available

Decision: Use "posible"
Register: "possible" → "posible"

New concept: "how"
- Cognate check: "how" → "cómo" (different etymology but transparent)
- Use "cómo"

Register: "how" → "cómo"

Step 4: Semantic accuracy
- "as often as possible" = FREQUENCY (temporal), not QUANTITY
- "frecuentemente" preserves frequency meaning ✓

Step 5: Grammar simplification
- "tan frecuentemente como sea posible" (subjunctive "sea")
- "lo más frecuentemente posible" (no subjunctive, SAME meaning) ✓
- Choose simpler: "lo más frecuentemente posible"

Step 6: Validate Spanish grammar
- "lo más frecuentemente posible" (superlative + adverb + adjective)
- Grammatically correct ✓

Step 7: Update registry
- "often/frequently" → "frecuentemente"
- "possible" → "posible"
- "how" → "cómo"

Step 8: Known is English
- Use canonical: "how to speak as often as possible" ✓
- (Note: canonical uses "often" but target uses "frecuentemente" - Phase 6 reveals synonym)

Decision: Cognate preference applied, grammar simplified
Translation: ["cómo hablar lo más frecuentemente posible", "how to speak as often as possible"]
</thinking>
```

---

## Example 3: Semantic Preservation > Simplification

```
<thinking>
Seed S0015: "And I want you to speak Spanish with me tomorrow"

Step 1: Verify canonical meaning
- "I want YOU to speak" (subject wants different person to perform action)
- This is NOT "I want to speak" (different meaning)

Step 2: Check registry
- "want" → "querer" (from S0001) ✓
- "you" → "tú" form ✓
- "to speak" → "hablar" (from S0001) ✓
- "with me" → "conmigo" (from S0001) ✓
- "tomorrow" → "mañana" (from previous seeds) ✓

Step 3: No new concepts requiring cognate check

Step 4: Semantic accuracy
- CRITICAL: "want YOU to..." requires subjunctive in Spanish
- Cannot avoid without changing meaning

Step 5: Grammar simplification attempt
- Can I simplify? NO
- "Y quiero hablar español contigo mañana" = "I want to speak" ❌ WRONG MEANING
- "Y quiero que hables español conmigo mañana" = "I want you to speak" ✓ CORRECT
- Subjunctive "hables" is grammatically REQUIRED by semantics

Step 6: Validate Spanish grammar
- "quiero que" + subjunctive (correct structure)
- "hables" (2nd person singular subjunctive of "hablar") ✓
- Grammar perfect ✓

Step 7: Update registry
- No new mappings

Step 8: Known is English
- Use canonical: "And I want you to speak Spanish with me tomorrow" ✓

Decision: Semantic preservation > grammatical simplicity
- Even though subjunctive is complex, it's REQUIRED
- TWO ABSOLUTE RULES: NEVER change canonical meaning

Translation: ["Y quiero que hables español conmigo mañana.", "And I want you to speak Spanish with me tomorrow."]
</thinking>
```

---

## Impact of Extended Thinking

### Without Extended Thinking

```
Typical errors:
- 30-40% inconsistent concept mappings
- Semantic drift (frequency → quantity)
- Grammar violations
- Non-cognate choices in seeds 1-100
- Unnecessary complex grammar
- Back-translation of English
```

### With Extended Thinking

```
Quality achieved:
- 95%+ consistent translations on first pass
- Semantic category preservation
- Correct grammar patterns
- Optimal cognate selection
- Grammatically simple where possible
- No back-translation
```

**Extended thinking is MANDATORY for quality translations.**

---

## Quick Checklist (Every Seed)

Before generating translation, think through:

1. ✓ What exactly does canonical say?
2. ✓ Which concepts have I seen before? (check registry)
3. ✓ Which concepts are new? (check cognate FIRST for seeds 1-100)
4. ✓ Is semantic category correct? (frequency vs quantity vs intensity)
5. ✓ Can I simplify grammar without changing meaning?
6. ✓ Is target language grammar perfect?
7. ✓ Is known language English? (use canonical directly)
8. ✓ Have I updated registry with new mappings?

If all YES → generate translation

If any NO → fix issue in thinking, then generate

---

**Use extended thinking for EVERY seed. Quality depends on it.**
