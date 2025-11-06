# Componentization Rule for COMPOSITE LEGOs

## The Rule: ALL WORDS

**For every COMPOSITE/MOLECULAR LEGO, componentize ALL WORDS with literal translations.**

No exceptions. Every single word in the target phrase gets its own component entry.

---

## Examples

### Example 1: "tan duro como pueda"

**LEGO:**
```
TARGET: "tan duro como pueda"
KNOWN:  "as hard as I can"
TYPE:   COMPOSITE
```

**Componentization:**
```json
[
  ["tan", "as/as much"],
  ["duro", "hard"],
  ["como", "as/like"],
  ["pueda", "I can"]
]
```

**Count:** 4 words → 4 components ✓

---

### Example 2: "No estoy seguro"

**LEGO:**
```
TARGET: "No estoy seguro"
KNOWN:  "I'm not sure"
TYPE:   COMPOSITE
```

**Componentization:**
```json
[
  ["No", "not"],
  ["estoy", "I am"],
  ["seguro", "sure"]
]
```

**Count:** 3 words → 3 components ✓

---

### Example 3: "Me gustaría que hables"

**LEGO:**
```
TARGET: "Me gustaría que hables"
KNOWN:  "I'd like you to speak"
TYPE:   COMPOSITE
```

**Componentization:**
```json
[
  ["Me", "me/to me"],
  ["gustaría", "would please"],
  ["que", "that"],
  ["hables", "you speak (subj)"]
]
```

**Count:** 4 words → 4 components ✓

---

### Example 4: "toda la oración"

**LEGO:**
```
TARGET: "toda la oración"
KNOWN:  "the whole sentence"
TYPE:   COMPOSITE
```

**Componentization:**
```json
[
  ["toda", "whole"],
  ["la", "the"],
  ["oración", "sentence"]
]
```

**Count:** 3 words → 3 components ✓

---

## Why ALL WORDS?

### 1. Transparency
Shows learner EXACTLY how target language constructs meaning:
- Word order differences
- Grammatical particles
- Structural differences from known language

### 2. Complete Understanding
No hidden parts. Learner sees every element.

### 3. Pattern Recognition
Helps learners recognize:
- Which words are structural (como, que, de)
- Which words are content (duro, hablar, oración)
- How target language builds phrases differently

---

## Literal vs Interpretive Translations

**Components must be LITERAL, not interpretive:**

✅ **GOOD (Literal):**
```json
["tan", "as/as much"]     // what it literally means
["duro", "hard"]          // literal meaning
["como", "as/like"]       // literal meaning
["pueda", "I can"]        // literal meaning
```

❌ **BAD (Interpretive):**
```json
["tan", "very"]                    // interpretive, not literal
["duro", "difficult"]              // context-dependent, not literal here
["como pueda", "however I can"]    // combining words, not word-by-word
```

---

## What Counts as a "Word"?

**One word = one component:**

- "tan" → 1 word → 1 component
- "duro" → 1 word → 1 component
- "como" → 1 word → 1 component
- "pueda" → 1 word → 1 component

**Contractions/compounds:**

Spanish doesn't have many contractions, but if present:
- "del" (de + el) → could be 2 components: ["de", "of"], ["el", "the"]
- OR 1 component: ["del", "of the"]
- Use judgment: whichever reveals structure better

**Multi-word fixed expressions:**

If the LEGO itself is a fixed expression:
- "por supuesto" (of course) → ["por", "by/for"], ["supuesto", "supposed"]
- Still break it down literally

---

## Common Mistakes

### ❌ Mistake 1: Skipping Function Words

**WRONG:**
```json
["S0007L03", "C", "tan duro como pueda", "as hard as I can", [
  ["duro", "hard"],
  ["pueda", "I can"]
]]
```

**Problem:** Skipped "tan" and "como" (function words)

**CORRECT:**
```json
["S0007L03", "C", "tan duro como pueda", "as hard as I can", [
  ["tan", "as/as much"],
  ["duro", "hard"],
  ["como", "as/like"],
  ["pueda", "I can"]
]]
```

---

### ❌ Mistake 2: Grouping Words Together

**WRONG:**
```json
["S0010L01", "C", "No estoy seguro", "I'm not sure", [
  ["No estoy", "I'm not"],
  ["seguro", "sure"]
]]
```

**Problem:** Grouped "No estoy" together

**CORRECT:**
```json
["S0010L01", "C", "No estoy seguro", "I'm not sure", [
  ["No", "not"],
  ["estoy", "I am"],
  ["seguro", "sure"]
]]
```

---

### ❌ Mistake 3: Interpretive Translations

**WRONG:**
```json
["tan", "very"]  // "tan duro" does NOT mean "very hard" literally
```

**CORRECT:**
```json
["tan", "as/as much"]  // literal meaning in this construction
```

---

## Validation Checklist

Before finalizing a COMPOSITE LEGO componentization:

- [ ] **Count check:** # of words in target = # of components?
- [ ] **Coverage check:** Every word accounted for?
- [ ] **Literal check:** All translations literal (not interpretive)?
- [ ] **Order check:** Components in same order as target words?

---

## Special Cases

### Reflexive Pronouns Attached to Verbs

Spanish: "hablarme" (to speak to me)

**Option 1 (separate):**
```json
["hablar", "to speak"],
["me", "to me"]
```

**Option 2 (treat as one word):**
```json
["hablarme", "to speak to me"]
```

**Judgment:** If it's written as one word in the seed, treat as one component.

---

### Verb Conjugations

"hables" (you speak - subjunctive)

**Componentization:**
```json
["hables", "you speak (subj)"]
```

**NOT:**
```json
["habl-", "speak stem"],
["-es", "2nd person singular"]
```

**Why?** Too granular. "hables" functions as a complete conjugated verb.

---

## Summary

**The rule is simple:**

**COMPOSITE LEGO with N words → N components**

**Each component:**
1. One target word
2. Literal translation to known language
3. In same order as target phrase

**Purpose:**
- Reveals target language structure
- Transparent learning
- Complete word-by-word understanding

**Every word matters. Skip nothing. Literal translations only.**
