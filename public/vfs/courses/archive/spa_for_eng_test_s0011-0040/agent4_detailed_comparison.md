# Detailed Side-by-Side Comparison: S0011-S0015

## S0011: "Me gustaría poder hablar después de que termines."

### BROKEN Extraction (Your Original)
```
A-types:
- poder → "to be able to"
- hablar → "to speak"
- termines → "you finish"

M-types:
- me gustaría → "I'd like"
- poder hablar → "to be able to speak" ❌ UNNECESSARY!
- después de que termines → "after you finish" ❌ WRONG CHUNKING!
```

### CORRECT Extraction (Agent 4)
```
A-types:
- poder → "to be able to"
- hablar → "to speak"
- termines → "you finish"

M-types:
- me gustaría → "I'd like" ✅ (idiomatic "me" construction)
- después de que → "after" ✅ (particle "de que" required)
```

**Why "poder hablar" M-type is wrong:**
- English: "to be able to" + "to speak" = clear composition
- Spanish: "poder" + "hablar" = clear composition
- FD Test: PASSES for both separately
- Rule violation: "DON'T extract M-type when both languages tile cleanly"

**Why "después de que termines" chunking is wrong:**
- Should split at: "después de que" (after) + "termines" (you finish)
- Current chunking includes verb with particle - not minimal

---

## S0012: "No me gustaría adivinar lo que va a ocurrir mañana."

### BROKEN Extraction
```
A-types:
- adivinar → "to guess"
- ocurrir → "to happen"
- mañana → "tomorrow"

M-types:
- no me gustaría → "I wouldn't like"
- lo que va a ocurrir → "what's going to happen" ❌ OVER-CHUNKED!
```

### CORRECT Extraction
```
A-types:
- adivinar → "to guess"
- ocurrir → "to happen"
- mañana → "tomorrow"

M-types:
- no me gustaría → "I wouldn't like" ✅
- lo que → "what" ✅ (particle construction)
- va a → "going to" ✅ (future particle)
```

**Why "lo que va a ocurrir" is wrong:**
- Over-chunked: combines 3 separate meaningful units
- Should be: "lo que" + "va a" + "ocurrir"
- Each piece is reusable: "lo que dices" (what you say), "voy a" (I'm going to)
- Rule: Extract MINIMUM FD-compliant chunks

---

## S0013: "Hablas español muy bien."

### BROKEN Extraction
```
A-types:
- hablas → "you speak"
- español → "Spanish"
- bien → "well"

M-types:
- muy bien → "very well" ❌ TILES CLEANLY!
```

### CORRECT Extraction
```
A-types:
- hablas → "you speak"
- español → "Spanish"
- muy → "very"
- bien → "well"

M-types:
- NONE
```

**Why "muy bien" M-type is wrong:**
- English: "very" + "well" = transparent
- Spanish: "muy" + "bien" = transparent
- Same word order in both languages
- No ambiguity whatsoever
- **CLASSIC example of over-extraction**

From phase docs:
> ❌ "speak Spanish" → "hablar español" (just verb + object, obvious from atomics)

Same applies to "muy bien" - just adverb + adverb, obvious from atomics!

---

## S0014: "¿Hablas español todo el día?"

### BROKEN Extraction
```
A-types:
- hablas → "you speak"
- español → "Spanish"
- día → "day"

M-types:
- todo el día → "all day" ✅ CORRECT!
```

### CORRECT Extraction
```
Same as broken - this one is correct!
```

**Why "todo el día" M-type IS justified:**
- Article "el" is embedded: "all THE day" (literal)
- English doesn't use article: "all day"
- Non-obvious construction that must be learned as unit
- Cannot split "el" alone (FD violation)

---

## S0015: "Y quiero que hables español conmigo mañana."

### BROKEN Extraction
```
A-types:
- y → "and"
- hables → "speak"
- español → "Spanish"
- conmigo → "with me"
- mañana → "tomorrow"

M-types:
- quiero que hables → "I want you to speak" ❌ OVER-CHUNKED!
```

### CORRECT Extraction
```
A-types:
- y → "and"
- quiero → "I want"
- hables → "speak"
- español → "Spanish"
- conmigo → "with me"
- mañana → "tomorrow"

M-types:
- quiero que → "I want that" ✅ (subjunctive trigger)
```

**Why "quiero que hables" is wrong:**
- Over-chunked: should stop at particle boundary
- "quiero que" is the construction (triggers subjunctive)
- "hables" is reusable in other contexts: "cuando hables" (when you speak)
- Including verb prevents reuse of the particle construction

**Why "quiero que" M-type IS justified:**
- Particle "que" cannot stand alone (FD violation)
- "quiero que" = subjunctive trigger construction
- Must be learned as unit to understand when subjunctive is required

---

## Summary Statistics

### Invalid M-types in Broken Extraction

1. **S0011: "poder hablar"** - tiles cleanly, no justification
2. **S0011: "después de que termines"** - wrong boundary (verb included)
3. **S0012: "lo que va a ocurrir"** - over-chunked (3 units combined)
4. **S0013: "muy bien"** - tiles cleanly, same word order
5. **S0015: "quiero que hables"** - over-chunked (verb included)

### Valid M-types (Both Extractions Should Have)

1. **S0011: "me gustaría"** - idiomatic construction
2. **S0011: "después de que"** - particle construction (corrected boundary)
3. **S0012: "no me gustaría"** - negative construction
4. **S0012: "lo que"** - particle construction
5. **S0012: "va a"** - future particle
6. **S0014: "todo el día"** - article construction
7. **S0015: "quiero que"** - subjunctive trigger (corrected boundary)

---

## The Core Test

For each potential M-type, ask:

**"Can the learner reconstruct this correctly using ONLY A-type LEGOs?"**

- "poder hablar" → YES (poder + hablar) → Don't extract M-type ✅
- "muy bien" → YES (muy + bien) → Don't extract M-type ✅
- "me gustaría" → NO ("me" particle required) → Extract M-type ✅
- "lo que" → NO ("que" alone is ambiguous) → Extract M-type ✅

---

**This is the difference between correct FD-compliant extraction and over-extraction.**
