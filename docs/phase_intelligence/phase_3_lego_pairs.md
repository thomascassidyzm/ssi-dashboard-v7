# AGENT PROMPT: Phase 3 LEGO Extraction (v6.0)

**Version**: 6.0 - Clarity Edition (2025-11-11)
**Status**: Production Ready - Simplified M-LEGO Rules
**Purpose**: Extract pedagogically-sound LEGO vocabulary units from translated seed pairs

---

## 🎯 CORE PRINCIPLE

When a learner hears KNOWN → they produce exactly ONE TARGET (zero uncertainty)

---

## 🚨 THE THREE RULES

### 1. START FROM KNOWN SEMANTICS

Break down the KNOWN language first - how does a native speaker chunk this meaning?

```
Known: "I want to speak Spanish with you now"
Natural chunks: "I want" | "to speak" | "Spanish" | "with you" | "now"
```

Why? The learner THINKS in their native language.

### 2. EXTRACT MINIMUM FD-COMPLIANT CHUNKS

**Forward Sweep (KNOWN → TARGET):**
- Process left to right
- Find minimum chunk that passes FD test
- LOCK it, don't extend further

**FD Test**: When learner hears KNOWN → is there ZERO uncertainty about TARGET?

❌ **FAILS if:**
- Multiple possible TARGETs: "that" → "que/ese/eso"
- FCFS collision: Already learned simpler form
- Syntactic uncertainty: Can't produce correct form without context

✅ **PASSES**: Zero uncertainty → LOCK the chunk

**Backward Sweep (TARGET → KNOWN):**
- Process right to left
- Catches target-language particles missed by forward sweep
- Examples: Chinese 的/着, Spanish que/de/a particles

### 3. VERIFY COMPLETE TILING

The seed MUST reconstruct perfectly from LEGOs (no gaps, no extras)

```
Target: "Quiero hablar español"
LEGOs: quiero + hablar + español
Reconstruction: "Quiero hablar español" ✅
```

---

## 🔧 ATOMIC vs MOLECULAR

### When to Extract A-type (Atomic):
- Single word
- FD-compliant on its own
- 1:1 mapping

```json
{"type": "A", "target": "quiero", "known": "I want"}
```

### When to Extract M-type (Molecular):

**ONLY extract M-type when it teaches something you CAN'T get from tiling A-types:**

✅ **Extract M-type when:**
1. **Required for FD**: Can't split without ambiguity
   - "I'm trying" → "estoy intentando" (can't split "I'm" → estoy/soy ambiguous)
   - "a word" → "una palabra" (can't split "a" → una/un ambiguous)

2. **Non-obvious word order/construction**:
   - "as often as possible" → "tan frecuentemente como sea posible" (complex pattern with "tan...como sea")
   - "what I mean" → "lo que quiero decir" (idiomatic construction)

❌ **DON'T extract M-type when:**
- Both languages tile cleanly with A-types
- "I want to speak" → "quiero hablar" ❌ (both languages tile: "I want" + "to speak" = "quiero" + "hablar")
- "speak Spanish" → "hablar español" ❌ (just verb + object, obvious from atomics)

**The test**: Can learner reconstruct correctly using ONLY A-type LEGOs? If YES → skip M-type.

### Exception: M-type with A-type Components

**When you DO extract an M-type**, also extract its components as A-types IF they're FD-compliant:

```
M-type: "estoy intentando" = "I'm trying" (needed for FD)
Also extract: "intentando" = "trying" (A-type, FD on its own, reusable)

Why both?
- M-type teaches the construction
- A-type allows reuse in other contexts ("estoy intentando ahora")
```

---

## 📋 EXTRACTION ALGORITHM

```
For each seed:

1. FORWARD SWEEP (KNOWN → TARGET):
   pos = 0
   while pos < length(KNOWN):
     chunk = word[pos]
     while NOT FD_compliant(chunk):
       extend chunk to word[pos+1], word[pos+2]...
     LOCK chunk as LEGO
     classify as A or M
     pos = next_unmatched_position

2. BACKWARD SWEEP (TARGET → KNOWN):
   pos = END
   while pos >= 0:
     if position already covered: skip
     chunk = word[pos]
     while NOT FD_compliant(chunk):
       extend chunk leftward
     LOCK chunk as LEGO
     classify as A or M
     pos = previous_unmatched_position

3. CHECK M-TYPE COMPONENTS:
   for each M-type LEGO:
     for each word in M-type:
       if word is FD-compliant alone:
         extract as A-type LEGO

4. CRITICAL: ORDER A-TYPES BEFORE M-TYPES:
   within each seed:
     sort LEGOs: all A-types FIRST, then all M-types
     renumber IDs: S0010L01, L02, L03... in sorted order

   WHY: When learner encounters M-type "puedo recordar", they may
        have already learned "puedo" and "recordar" as A-types,
        making the M-LEGO a COMBINATION of known pieces

5. VERIFY TILING:
   reconstruct TARGET from LEGOs
   if fails: fix extraction

6. CHECK REGISTRY:
   for each new LEGO:
     if target+known exists: REFERENCE it
     else: mark as NEW
```

---

## 📤 OUTPUT FORMAT

```json
{
  "version": "6.0",
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": ["Quiero hablar español", "I want to speak Spanish"],
      "legos": [
        {
          "id": "S0001L01",
          "type": "A",
          "target": "quiero",
          "known": "I want",
          "new": true
        },
        {
          "id": "S0002L01",
          "type": "M",
          "target": "estoy intentando",
          "known": "I'm trying",
          "new": true,
          "components": [
            ["estoy", "I am"],
            ["intentando", "trying"]
          ]
        },
        {
          "id": "S0002L02",
          "type": "A",
          "target": "intentando",
          "known": "trying",
          "new": true
        },
        {
          "id": "S0001L03",
          "type": "A",
          "target": "español",
          "known": "Spanish",
          "ref": "S0001",
          "new": false
        }
      ]
    }
  ]
}
```

**Required fields:**
- `id`: LEGO ID (format: S####L##)
- `type`: "A" or "M"
- `target`: Target language
- `known`: Known language
- `new`: true/false
- `ref`: Source seed ID (if reference)
- `components`: [[target,known]] pairs for M-types (ALL WORDS, literal translations)

---

## ✅ SELF-VALIDATION CHECKLIST

Before submitting, verify:

### Tiling
- [ ] Every seed reconstructs perfectly from LEGOs
- [ ] No gaps, no extra words
- [ ] TARGET: All words covered
- [ ] KNOWN: All words covered

### FD Compliance
- [ ] No ambiguous standalone words (que, de, a alone)
- [ ] No FCFS collisions (check registry!)
- [ ] Each chunk: KNOWN → exactly ONE TARGET

### M-type Justification
- [ ] Each M-type is FD-required OR teaches non-obvious pattern
- [ ] No redundant M-types that could be tiled from A-types
- [ ] All M-types have complete components arrays
- [ ] Components use literal translations

### Registry
- [ ] Checked existing LEGOs before marking new
- [ ] References have proper `id` and `ref`
- [ ] Collision rule: BOTH target AND known must match

### Format
- [ ] Valid JSON
- [ ] All required fields present
- [ ] M-types have `components`

---

## 🎓 EXAMPLES

### Example 1: Simple Sentence (A-types only)

**Seed**: "Quiero hablar español contigo ahora" = "I want to speak Spanish with you now"

```json
{
  "legos": [
    {"id": "S0001L01", "type": "A", "target": "quiero", "known": "I want", "new": true},
    {"id": "S0001L02", "type": "A", "target": "hablar", "known": "to speak", "new": true},
    {"id": "S0001L03", "type": "A", "target": "español", "known": "Spanish", "new": true},
    {"id": "S0001L04", "type": "A", "target": "contigo", "known": "with you", "new": true},
    {"id": "S0001L05", "type": "A", "target": "ahora", "known": "now", "new": true}
  ]
}
```

**Why no M-types?** Both languages tile cleanly. "I want" + "to speak" = "quiero" + "hablar" with no ambiguity.

### Example 2: M-type Required for FD

**Seed**: "Estoy intentando aprender" = "I'm trying to learn"

```json
{
  "legos": [
    {
      "id": "S0002L01",
      "type": "M",
      "target": "estoy intentando",
      "known": "I'm trying",
      "new": true,
      "components": [["estoy", "I am"], ["intentando", "trying"]]
    },
    {
      "id": "S0002L02",
      "type": "A",
      "target": "intentando",
      "known": "trying",
      "new": true
    },
    {
      "id": "S0002L03",
      "type": "A",
      "target": "aprender",
      "known": "to learn",
      "new": true
    }
  ]
}
```

**Why M-type for "estoy intentando"?** Can't split: "I'm" → estoy/soy ambiguous (FD fails)
**Why also A-type for "intentando"?** Reusable: "estoy intentando ahora", "voy a intentando" etc.

### Example 3: Complex Pattern (M-type for construction)

**Seed**: "lo más frecuentamente posible" = "as often as possible"

```json
{
  "legos": [
    {
      "id": "S0003L02",
      "type": "M",
      "target": "lo más frecuentamente posible",
      "known": "as often as possible",
      "new": true,
      "components": [
        ["lo", "the"],
        ["más", "more"],
        ["frecuentamente", "often"],
        ["posible", "possible"]
      ]
    },
    {
      "id": "S0003L03",
      "type": "A",
      "target": "más",
      "known": "more",
      "new": true
    },
    {
      "id": "S0003L04",
      "type": "A",
      "target": "frecuentamente",
      "known": "often",
      "new": true
    },
    {
      "id": "S0003L05",
      "type": "A",
      "target": "posible",
      "known": "possible",
      "new": true
    }
  ]
}
```

**Why M-type?** Complex "lo más...posible" construction (the more...possible) not obvious from atomics
**Why also A-types?** "más", "frecuentamente", and "posible" are reusable in other contexts
**CRITICAL - Components use literal translations:** "más" = "more" (not "most"), because that's the literal meaning. The phrase becomes "the most" semantically, but components show word-by-word literals.

### Example 4: Registry Reference

**Seed**: "Hablo español ahora" = "I speak Spanish now"

```json
{
  "legos": [
    {"id": "S0009L01", "type": "A", "target": "hablo", "known": "I speak", "new": true},
    {"id": "S0001L03", "type": "A", "target": "español", "known": "Spanish", "ref": "S0001", "new": false},
    {"id": "S0001L05", "type": "A", "target": "ahora", "known": "now", "ref": "S0001", "new": false}
  ]
}
```

**Why references?** "español" and "ahora" already extracted in S0001 with same target+known

---

## 🚨 COMMON MISTAKES

### ❌ Over-extraction of M-types

```json
BAD:
{"type": "M", "target": "quiero hablar", "known": "I want to speak"}
// Both languages tile cleanly! No pattern to learn.

GOOD:
{"type": "A", "target": "quiero", "known": "I want"}
{"type": "A", "target": "hablar", "known": "to speak"}
```

### ❌ Under-chunking (FD violation)

```json
BAD:
{"type": "A", "target": "estoy", "known": "I am"} // estoy/soy ambiguous!

GOOD:
{"type": "M", "target": "estoy intentando", "known": "I'm trying"}
```

### ❌ Missing components

```json
BAD:
{
  "type": "M",
  "target": "estoy intentando",
  // Missing components!
}

GOOD:
{
  "type": "M",
  "target": "estoy intentando",
  "known": "I'm trying",
  "components": [["estoy", "I am"], ["intentando", "trying"]]
}
```

### ❌ Incomplete tiling

```json
Seed: "Quiero hablar español contigo"
BAD: quiero + hablar + español // Missing "contigo"!
GOOD: quiero + hablar + español + contigo ✅
```

---

## 🔄 USE EXTENDED THINKING

For EVERY seed, use `<thinking>` tags:

```xml
<thinking>
SEED: "Estoy intentando aprender"
KNOWN: "I'm trying to learn"

FORWARD SWEEP:
- "I'm" → fails (estoy/soy ambiguous)
- "I'm trying" → "estoy intentando" ✅ M-type (FD required)
- "to learn" → "aprender" ✅ A-type

CHECK M-TYPE COMPONENTS:
- "intentando" FD on its own? YES → extract as A-type

REGISTRY CHECK:
- "estoy intentando" new? YES
- "intentando" new? YES
- "aprender" new? YES

TILING: estoy intentando + aprender = "Estoy intentando aprender" ✅

OUTPUT READY
</thinking>
```

---

## 📊 SUCCESS METRICS

**Target:**
- 100% tiling success
- 40-60% atomic, 40-60% molecular
- 30-50% reuse rate
- Zero FD violations
- All M-types justified

**Version History:**
- v6.0 (2025-11-11): Simplified M-LEGO rules, clearer examples
- v5.0 (2025-11-09): Ultimate edition with S0101-S0200 learnings
- v4.0: Radical simplification (One Rule principle)

**Status**: ✅ Production Ready
