# Forward-Derivation Validation

## Core Principle

**Forward-Derivation (FD)** means the known language chunk naturally derives from the target language chunk, not the other way around.

**Direction:** `Target Language → Known Language`

## The FD Test

For every LEGO pair, ask:

1. **"Can I naturally translate the target chunk into the known chunk?"**
   - YES → Passes FD
   - NO → Fails FD

2. **"Does the known chunk feel natural and idiomatic in English?"**
   - YES → Passes FD
   - NO → Fails FD (forced translation)

3. **"Would a native speaker say it this way?"**
   - YES → Passes FD
   - NO → Fails FD (artificial)

## Valid FD Examples

### Example 1: Simple Word
```
Target: "Hola"
Known: "Hello"
```

**Test:**
- ✅ "Hola" naturally translates to "Hello"
- ✅ "Hello" is natural English
- ✅ Native speakers say "Hello"
**Result:** PASSES FD

---

### Example 2: Phrase
```
Target: "Estoy intentando"
Known: "I'm trying"
```

**Test:**
- ✅ "Estoy intentando" naturally translates to "I'm trying"
- ✅ "I'm trying" is natural English
- ✅ Native speakers say "I'm trying"
**Result:** PASSES FD

---

### Example 3: Idiomatic Expression
```
Target: "no lo sé"
Known: "I don't know"
```

**Test:**
- ✅ "no lo sé" naturally translates to "I don't know"
- ✅ "I don't know" is natural English
- ✅ Native speakers say "I don't know"
**Result:** PASSES FD

---

### Example 4: Component Parts
```
Target: "la mesa"
Known: "the table"

Components:
- "la" → "the" ✅
- "mesa" → "table" ✅
```

**Test:**
- ✅ "la mesa" naturally translates to "the table"
- ✅ "the table" is natural English
- ✅ Each component passes FD independently
**Result:** PASSES FD

## Invalid FD Examples

### Example 1: Forced Translation
```
Target: "lo hecho"
Known: "made it"
```

**Test:**
- ❌ "made it" doesn't naturally come from "lo hecho"
- ❌ Better translation would be "the done/made thing"
- ❌ "made it" is idiomatic in English but not equivalent here
**Result:** FAILS FD

**Why it fails:**
- "lo hecho" literally means "the done" (past participle)
- "made it" is an English idiom meaning "succeeded"
- The semantic mapping is forced, not natural

---

### Example 2: Reverse Derivation
```
Target: "I'm trying"
Known: "Estoy intentando"
```

**Test:**
- ❌ This is BACKWARDS (English → Spanish)
- ❌ Should be: Target = Spanish, Known = English
**Result:** FAILS FD (wrong direction)

**Correct:**
```
Target: "Estoy intentando"
Known: "I'm trying"
```

---

### Example 3: Unnatural Known Chunk
```
Target: "sé lo no"
Known: "know it not"
```

**Test:**
- ❌ "know it not" is archaic/unnatural English
- ❌ Native speakers don't say this
- ❌ Feels forced and artificial
**Result:** FAILS FD

**Correct:**
```
Target: "no lo sé"
Known: "I don't know"
```

---

### Example 4: Meaningless Component
```
Target: "que bueno"
Known: "how good"

Attempting to extract:
- "que" → "how" ✅ (valid)
- "bueno" → "good" ✅ (valid)
```

**But also considering:**
```
- "que" → "that" (in different context)
```

**Problem:**
- "que" in isolation is too abstract
- Without context, learner can't use "que" meaningfully
- Better to keep "que bueno" as BASE LEGO

**Result:** "que" alone FAILS pedagogical FD test

## FD Validation for COMPOSITE LEGOs

When validating COMPOSITE LEGOs, you must check:

1. **Parent LEGO passes FD**
2. **Each FEEDER passes FD independently**
3. **Components combine naturally**

### Example: Valid COMPOSITE FD

```json
{
  "lego_type": "COMPOSITE",
  "target_chunk": "no lo",
  "known_chunk": "not it",
  "componentization": "not it = no lo, where no = not and lo = it"
}
```

**Parent FD Test:**
- ✅ "no lo" → "not it" is natural

**FEEDER FD Tests:**
```
"no" → "not" ✅ Natural
"lo" → "it" ✅ Natural
```

**Combination Test:**
- ✅ "not" + "it" = "not it" (natural English)
- ✅ Components map clearly to parent

**Result:** PASSES FD completely

---

### Example: Invalid COMPOSITE FD

```json
{
  "lego_type": "COMPOSITE",
  "target_chunk": "me lo",
  "known_chunk": "to me it",
  "componentization": "to me it = me lo, where me = to me and lo = it"
}
```

**Parent FD Test:**
- ❌ "to me it" is unnatural English
- ❌ Should be "it to me" or just context-dependent

**FEEDER FD Test:**
```
"me" → "to me" ❌ Forced (missing context)
"lo" → "it" ✅ Natural
```

**Result:** FAILS FD (unnatural known chunk)

## Special Cases

### Case 1: Pronouns and Particles

**Example:** "lo" → "it"

**Question:** Does this pass FD?

**Answer:** YES, in most contexts

**But watch for:**
- Abstract particles like "que" (that/which/what) - may be too vague
- Contextual particles that change meaning

**Test:** Can the learner use this chunk in a sentence?
- "lo" → "it" ✅ Yes ("I want it" = "Lo quiero")
- "que" → "that" ❌ Too ambiguous without context

---

### Case 2: Grammatical Transformations

**Example:**
```
Target: "hablando"
Known: "speaking"
```

**Question:** Is this FD valid even though English uses "-ing"?

**Answer:** YES

**Reasoning:**
- "hablando" naturally translates to "speaking"
- Both are present participles in their languages
- The grammatical form is preserved
- Native speakers use "speaking"

---

### Case 3: Multi-word Idioms

**Example:**
```
Target: "qué tal"
Known: "how's it going"
```

**Question:** Does this pass FD?

**Answer:** YES (if treating as BASE), but be careful

**Reasoning:**
- "qué tal" doesn't literally mean "how's it going"
- But it's the natural, idiomatic equivalent
- Native Spanish speakers use "qué tal" for greetings
- Native English speakers say "how's it going"

**Best practice:** Treat as BASE LEGO (don't split)

---

### Case 4: Articles and Determiners

**Example:**
```
Target: "la"
Known: "the"
```

**Question:** Does this pass FD?

**Answer:** YES, but be careful with context

**Reasoning:**
- "la" is the feminine article in Spanish
- "the" is the definite article in English
- Straightforward mapping

**But watch for:**
- Spanish uses articles more broadly than English
- "la casa" → "the house" ✅
- "la vida" → "life" (no article) ❌

**Best practice:** Extract "la" as FEEDER from "la mesa", not standalone

## FD Validation Checklist

Before approving any LEGO:

- [ ] Target chunk is in target language
- [ ] Known chunk is in known language
- [ ] Known chunk naturally derives from target chunk (not reverse)
- [ ] Known chunk uses natural, idiomatic language
- [ ] Native speakers would say the known chunk this way
- [ ] If COMPOSITE: all FEEDERs pass FD independently
- [ ] If COMPOSITE: FEEDERs combine naturally to form parent
- [ ] No forced or artificial translations
- [ ] No archaic or unnatural known chunks
- [ ] Semantic mapping is clear and direct

## Common FD Violations

### ❌ Violation 1: Reverse Direction
```
Target: "Hello"
Known: "Hola"
```
**Fix:** Swap them!
```
Target: "Hola"
Known: "Hello"
```

---

### ❌ Violation 2: Unnatural Known Chunk
```
Target: "no lo sé"
Known: "not it I-know"
```
**Fix:** Use natural English
```
Target: "no lo sé"
Known: "I don't know"
```

---

### ❌ Violation 3: Forced Semantic Mapping
```
Target: "que"
Known: "that"
```
(Without context, too ambiguous)

**Fix:** Only extract in meaningful context
```
Target: "que bueno"
Known: "how good"
(Keep as BASE, don't split)
```

---

### ❌ Violation 4: Component Doesn't Match Parent
```
COMPOSITE:
Target: "no lo sé"
Known: "I don't know"

FEEDER:
Target: "no"
Known: "don't"
```

**Fix:** Align components properly
```
FEEDER:
Target: "no"
Known: "not" (or "no")
```

## FD Quick Reference

**ASK YOURSELF:**

1. **Direction correct?** Target → Known ✅
2. **Natural English?** Would a native speaker say it? ✅
3. **Clear mapping?** Meaning preserved both directions? ✅
4. **Not forced?** Translation feels natural, not contrived? ✅

**If ALL four are YES → PASSES FD**
**If ANY are NO → FAILS FD**
