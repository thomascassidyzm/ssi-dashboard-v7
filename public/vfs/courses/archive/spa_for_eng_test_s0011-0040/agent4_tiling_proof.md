# Tiling Verification: Proof of Correct Extraction

## S0013: "Hablas español muy bien." (The Clearest Example)

### Target Sentence
```
Spanish: "Hablas español muy bien."
English: "You speak Spanish very well."
```

### BROKEN Extraction Tiling
```
Lego 1: hablas        → "you speak"   (A-type) ✅
Lego 2: español       → "Spanish"     (A-type) ✅
Lego 3: bien          → "well"        (A-type) ✅
Lego 4: muy bien      → "very well"   (M-type) ❌ REDUNDANT!

Reconstruction: hablas + español + muy bien
                (you speak + Spanish + very well) ✅ Works

BUT: What about "muy" alone? It's in the M-type but not as A-type!
     Can't reuse "muy" in other contexts!
```

### CORRECT Extraction Tiling
```
Lego 1: hablas        → "you speak"   (A-type) ✅
Lego 2: español       → "Spanish"     (A-type) ✅
Lego 3: muy           → "very"        (A-type) ✅
Lego 4: bien          → "well"        (A-type) ✅

Reconstruction: hablas + español + muy + bien
                (you speak + Spanish + very + well) ✅ Works

BONUS: Can now reuse "muy" in other contexts!
       - "muy rápido" (very fast)
       - "muy importante" (very important)
```

### The Test
```
Question: "Can learner reconstruct 'muy bien' from A-types only?"

BROKEN:  No - needs M-type because "muy" not available as A-type
CORRECT: Yes - tiles from "muy" + "bien" A-types

Winner: CORRECT extraction (no M-type needed!)
```

---

## S0011: "Me gustaría poder hablar después de que termines."

### Target Sentence
```
Spanish: "Me gustaría poder hablar después de que termines."
English: "I'd like to be able to speak after you finish."
```

### BROKEN Extraction Tiling
```
Lego 1: poder                      → "to be able to"         (A-type) ✅
Lego 2: hablar                     → "to speak"              (A-type) ✅
Lego 3: termines                   → "you finish"            (A-type) ✅
Lego 4: me gustaría                → "I'd like"              (M-type) ✅
Lego 5: poder hablar               → "to be able to speak"   (M-type) ❌
Lego 6: después de que termines    → "after you finish"      (M-type) ❌

Reconstruction: me gustaría + poder hablar + después de que termines
                ✅ Works BUT has redundancy

Issues:
- "poder hablar" M-type is redundant (can tile from L1 + L2)
- "después de que termines" includes verb unnecessarily
- Can't reuse "después de que" with other verbs!
```

### CORRECT Extraction Tiling
```
Lego 1: poder                → "to be able to"    (A-type) ✅
Lego 2: hablar               → "to speak"         (A-type) ✅
Lego 3: termines             → "you finish"       (A-type) ✅
Lego 4: me gustaría          → "I'd like"         (M-type) ✅ (needed)
Lego 5: después de que       → "after"            (M-type) ✅ (needed)

Reconstruction: me gustaría + poder + hablar + después de que + termines
                ✅ Works perfectly

Why M-types:
- "me gustaría" needed (idiomatic "me" particle)
- "después de que" needed (particle "de que" construction)

Reusability gained:
- "después de que" + ANY_VERB (después de que llegues, vengas, etc.)
- "poder" + ANY_VERB (poder comer, poder dormir, etc.)
- "hablar" + ANY_CONTEXT (hablar español, hablar ahora, etc.)
```

### The Test
```
Question: "Can learner reconstruct 'poder hablar' from A-types only?"

BROKEN:  No - but wait, we HAVE "poder" and "hablar" as A-types!
         The M-type is actually redundant!

CORRECT: Yes - tiles from "poder" + "hablar" A-types
         Both languages: "to be able to" + "to speak" = clear!

Question: "Can learner reconstruct 'después de que' without verb?"

BROKEN:  No - verb is locked into the M-type
         Can't reuse "después de que" with other verbs!

CORRECT: Yes - "después de que" is separate, reusable construction
         Can combine with any verb: termines, llegues, vengas...

Winner: CORRECT extraction (minimal FD chunks!)
```

---

## S0012: "No me gustaría adivinar lo que va a ocurrir mañana."

### BROKEN vs CORRECT Comparison

```
BROKEN M-type:
"lo que va a ocurrir" → "what's going to happen"

Can split? Let's test:
- "lo que" → "what" (particle, can't split further) ✅ FD-compliant
- "va a" → "going to" (future particle) ✅ FD-compliant
- "ocurrir" → "to happen" (single word) ✅ FD-compliant

All three pieces are independently FD-compliant!
Therefore: Should NOT be combined into one M-type!

CORRECT approach:
Extract as 3 separate pieces for maximum reusability:
- "lo que" can combine with other verbs: "lo que dices" (what you say)
- "va a" can combine with other verbs: "va a comer" (going to eat)
- "ocurrir" can be used alone: "puede ocurrir" (can happen)

Reconstruction: lo que + va a + ocurrir
                (what + going to + happen) ✅
```

---

## The Proof is in the Reusability

### Example: Building New Sentences

With CORRECT extraction, learner can now construct:

From S0013 A-types:
- "muy rápido" (very fast) - reusing "muy"
- "hablas bien" (you speak well) - reusing "hablas" + "bien"

From S0011 LEGOs:
- "después de que llegues" (after you arrive) - reusing "después de que"
- "quiero poder hablar" (I want to be able to speak) - reusing "poder" + "hablar"

From S0012 LEGOs:
- "lo que dices" (what you say) - reusing "lo que"
- "voy a ocurrir" (I'm going to happen) - reusing "va a" pattern

With BROKEN extraction:
- Can't reuse "muy" independently (locked in "muy bien" M-type)
- Can't reuse "después de que" with other verbs (locked with "termines")
- Can't reuse "lo que" independently (locked in large chunk)

---

## Conclusion

The CORRECT extraction:
1. ✅ Maximizes reusability of components
2. ✅ Extracts minimum FD-compliant chunks
3. ✅ Follows the FD test religiously
4. ✅ Enables compositional learning

The BROKEN extraction:
1. ❌ Over-extracts M-types unnecessarily
2. ❌ Creates redundant chunks
3. ❌ Locks components together that should be separate
4. ❌ Reduces reusability and compositionality

**This is why following the phase intelligence documentation precisely matters!**
