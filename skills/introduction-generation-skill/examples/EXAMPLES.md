# Introduction Examples

## Good Examples

### BASE LEGO (Simple Format)

**Input LEGO:**
```json
[
  "S0001L01",
  "B",
  "Quiero",
  "I want",
  []
]
```

**Seed context:** "I want to speak Spanish with you now"

**Good introduction:**
```
"Now, the Spanish for "I want" as in "I want to speak Spanish with you now" is "Quiero", Quiero."
```

**What makes this good:**
- Starts with "Now, the"
- Includes seed context ("as in...")
- Ends with repetition for pronunciation
- Natural, conversational tone

---

### COMPOSITE LEGO with 2 Components

**Input LEGO:**
```json
[
  "S0002L01",
  "C",
  "Estoy intentando",
  "I'm trying",
  [
    ["Estoy", "I am"],
    ["intentando", "trying"]
  ]
]
```

**Seed context:** "I'm trying to learn"

**Good introduction:**
```
"The Spanish for "I'm trying" as in "I'm trying to learn" is "Estoy intentando" - where "Estoy" means "I am" and "intentando" means "trying"."
```

**What makes this good:**
- Uses "The" (not "Now, the") for composite
- Includes seed context
- Uses "and" for 2 components (no comma)
- Uses "means" for component explanations
- Ends with period after last component

---

### COMPOSITE LEGO with 3+ Components

**Input LEGO:**
```json
[
  "S0003L05",
  "C",
  "lo más a menudo posible",
  "as often as possible",
  [
    ["lo más", "as"],
    ["a menudo", "often"],
    ["posible", "possible"]
  ]
]
```

**Seed context:** "how to speak as often as possible"

**Good introduction:**
```
"The Spanish for "as often as possible" as in "how to speak as often as possible" is "lo más a menudo posible" - where "lo más" means "as", "a menudo" means "often", and "posible" means "possible"."
```

**What makes this good:**
- Uses Oxford comma (X, Y, and Z)
- All components explained with "means"
- Seed context included
- Proper grammar throughout

---

## Bad Examples (Common Mistakes)

### Missing Seed Context

**Bad:**
```
"Now, the Spanish for "I want" is "Quiero", Quiero."
```

**Why it's bad:** No seed context - learner doesn't know which usage/meaning

**Fix:**
```
"Now, the Spanish for "I want" as in "I want to speak Spanish with you now" is "Quiero", Quiero."
```

---

### Wrong Component Grammar (2 components)

**Bad:**
```
"The Spanish for "I'm trying" is "Estoy intentando" - where "Estoy" means "I am", and "intentando" means "trying"."
```

**Why it's bad:** Comma before "and" with only 2 components

**Fix:**
```
"The Spanish for "I'm trying" is "Estoy intentando" - where "Estoy" means "I am" and "intentando" means "trying"."
```

---

### Missing Component Explanations

**Bad:**
```
"The Spanish for "I'm trying" as in "I'm trying to learn" is "Estoy intentando"."
```

**Why it's bad:** COMPOSITE LEGO must explain components

**Fix:**
```
"The Spanish for "I'm trying" as in "I'm trying to learn" is "Estoy intentando" - where "Estoy" means "I am" and "intentando" means "trying"."
```

---

### Wrong Format for BASE vs COMPOSITE

**Bad (BASE treated as COMPOSITE):**
```
"The Spanish for "I want" is "Quiero" - where "Quiero" means "I want"."
```

**Why it's bad:** BASE LEGOs don't need component breakdown

**Fix:**
```
"Now, the Spanish for "I want" as in "I want to speak Spanish with you now" is "Quiero", Quiero."
```

---

### Using "is" instead of "means"

**Bad:**
```
"The Spanish for "I'm trying" is "Estoy intentando" - where "Estoy" is "I am" and "intentando" is "trying"."
```

**Why it's bad:** Should use "means" for component explanations

**Fix:**
```
"The Spanish for "I'm trying" is "Estoy intentando" - where "Estoy" means "I am" and "intentando" means "trying"."
```

---

## Quick Checklist

Before writing an introduction, verify:

- [ ] Type is B or C (determines format)
- [ ] Seed context is included ("as in...")
- [ ] BASE: starts with "Now, the" and ends with repetition
- [ ] COMPOSITE: uses "where" and "means" for components
- [ ] Component grammar is correct (and/commas)
- [ ] Natural, conversational language
- [ ] Proper quote escaping in JSON
