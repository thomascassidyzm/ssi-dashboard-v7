# Unified Phase 1+3 Generator Prompt v3.0

> **The definitive prompt for generating LUT-compliant translations and LEGO decompositions for any language pair.**

---

## The Core Principle: Zero Ambiguity

**LUT = Learner Uncertainty Test**

When a learner hears a chunk in the KNOWN language, there must be **ZERO ambiguity** about what they should produce in the TARGET language.

```
IF learner hears X in known:
    Is there ANY ambiguity about what to produce in target?

    IF ambiguity > 0:
        Chunk UP (add context) until ambiguity = 0

    IF ambiguity = 0:
        Valid LEGO candidate
```

**Goal:** Find the SMALLEST chunks with zero ambiguity = maximum combinatorial power.

---

## LEGO Types

### A-type (Atomic)

**Definition:** Single word in AT LEAST ONE language. Cannot be split.

**Criteria:**
1. Zero ambiguity ✓
2. Meaningful standalone (can answer a question) ✓
3. Single word in one or both languages (physically cannot split)

**⚠️ CLASSIFICATION RULE:** If EITHER the known OR target is a single word, it MUST be A-type.
You cannot split a single word, regardless of how many words are on the other side.

**Examples:**
```
"red" → "rojo"                 A-type (1 word both)
"want to" → "querer"           A-type (can't split "querer")
"with you" → "contigo"         A-type (can't split "contigo")
"tomorrow" → "mañana"          A-type (1 word both)
"to be able to" → "poder"      A-type (can't split "poder")
"after" → "después de que"     A-type (can't split "after")
"you finish" → "termines"      A-type (can't split "termines")
```

**Key insight:** Word count asymmetry is FINE for A-types:
```
"I want to" (3 words) → "querer" (1 word)    = A-type ✓
"after" (1 word) → "después de que" (3 words) = A-type ✓
```

**NOT A-type (fail meaningful-standalone test):**
```
"the" → "el/la"                ✗ Cannot answer a question with "the"
"a" → "un/una"                 ✗ Cannot answer a question with "a"
```

These only appear as COMPONENTS within M-types.

---

### M-type (Molecular)

**Definition:** 2+ words in BOTH languages, where the combination teaches something unexpected.

**Criteria:**
1. Zero ambiguity ✓
2. Meaningful standalone ✓
3. 2+ words in BOTH languages
4. **Combination teaches something non-obvious:**
   - Word order difference
   - Linking word appears (a, de, que, に, 的, etc.)
   - Form changes in combination
   - Structural divergence between languages

**Examples:**
```
"a week" → "una semana" (M-type)
  └─ components: a/una, week/semana
  └─ TEACHES: article agreement (una not un)

"voy a practicar" → "I'm going to practise" (M-type)
  └─ TEACHES: the "a" linkage in ir + a + infinitive

"practicar hablar" → "practise speaking" (M-type)
  └─ TEACHES: two infinitives (Spanish) vs infinitive + gerund (English)

"un poco de español" → "a little Spanish" (M-type)
  └─ TEACHES: "de" appears in Spanish, not in English
```

---

### NOT M-type (trivial concatenation)

If A + A = predictable combination with nothing new, **do NOT create an M-type**.

```
"quiero" = "I want" (A)
"hablar" = "to speak" (A)
"quiero hablar" = "I want to speak"  ← NOT M-type!
  └─ Just concatenation, nothing unexpected
  └─ Learner can figure this out from the A-types
```

**M-type test:**
> "Does this combination reveal something the learner couldn't predict from the A-types alone?"

| Combination | Predictable? | M-type? |
|-------------|--------------|---------|
| quiero hablar | Yes | ❌ No |
| voy a practicar | No ("a" appears) | ✅ Yes |
| practicar hablar | No (two infinitives?) | ✅ Yes |
| un poco de español | No ("de" appears) | ✅ Yes |
| la mesa roja | No (adjective AFTER noun) | ✅ Yes |

---

## The Lattice: Overlapping M-types

Overlapping M-types are **encouraged** when each teaches something different:

```
voy = I'm going (A)
  └─ Base vocabulary

voy a practicar (M)
  └─ TEACHES: ir + a + infinitive pattern

practicar hablar (M)
  └─ TEACHES: infinitive + infinitive chain

voy a practicar hablar (M)
  └─ TEACHES: full chain rhythm, how it flows
```

**Each M-type in the lattice is a lesson**, not redundancy.

**The lattice IS the pedagogy** - it shows learners progressively how pieces combine.

---

## Component Rules

M-type components can be:

1. **Existing A-types** (reused):
   ```
   "week" → "semana" (A-type introduced earlier)
   └─ Reused as component in "a week" → "una semana"
   ```

2. **Component-only** (never standalone LEGOs):
   ```
   "a" → "una" (only appears within M-types)
   "the" → "la" (only appears within M-types)
   ```

Articles, some prepositions, and particles only exist as components - they fail the "meaningful standalone" test.

---

## The Algorithm

```
FOR each sentence:
    1. Generate natural translation (Phase 1)

    2. FOR each potential chunk:
        a. Test: Zero ambiguity?
           - No → Chunk up, try again
           - Yes → Continue

        b. Test: Meaningful standalone?
           - No → Can only be component, not LEGO
           - Yes → Continue

        c. Test: Single word in either language?
           - Yes → A-type
           - No → Continue

        d. Test: Combination teaches something new?
           - No → Not M-type, use A-types separately
           - Yes → M-type with components

    3. Build lattice of overlapping M-types where pedagogically valuable
```

---

## Output Format

```json
{
  "seed_id": "S0001",
  "seed_pair": {
    "known": "I want to speak Spanish with you now.",
    "target": "Quiero hablar español contigo ahora."
  },
  "legos": [
    {
      "id": "S0001L01",
      "type": "A",
      "new": true,
      "lego": {"known": "I want to", "target": "quiero"}
    },
    {
      "id": "S0001L02",
      "type": "A",
      "new": true,
      "lego": {"known": "to speak", "target": "hablar"}
    },
    {
      "id": "S0001L03",
      "type": "A",
      "new": true,
      "lego": {"known": "Spanish", "target": "español"}
    },
    {
      "id": "S0001L04",
      "type": "A",
      "new": true,
      "lego": {"known": "with you", "target": "contigo"}
    },
    {
      "id": "S0001L05",
      "type": "A",
      "new": true,
      "lego": {"known": "now", "target": "ahora"}
    }
  ]
}
```

Note: S0001 has NO M-types because all combinations are predictable concatenations.

**Contrast with S0005:**

```json
{
  "seed_id": "S0005",
  "seed_pair": {
    "known": "I'm going to practise speaking with someone else.",
    "target": "Voy a practicar hablar con alguien más."
  },
  "legos": [
    {
      "id": "S0005L01",
      "type": "A",
      "new": true,
      "lego": {"known": "I go", "target": "voy"}
    },
    {
      "id": "S0005L02",
      "type": "M",
      "new": true,
      "lego": {"known": "I'm going to", "target": "voy a"},
      "components": [
        {"known": "I go", "target": "voy"},
        {"known": "to", "target": "a"}
      ],
      "teaches": "ir + a + infinitive pattern"
    },
    {
      "id": "S0005L03",
      "type": "A",
      "new": true,
      "lego": {"known": "to practise", "target": "practicar"}
    },
    {
      "id": "S0005L04",
      "type": "M",
      "new": true,
      "lego": {"known": "going to practise", "target": "voy a practicar"},
      "components": [
        {"known": "going to", "target": "voy a"},
        {"known": "to practise", "target": "practicar"}
      ],
      "teaches": "complete ir + a + infinitive construction"
    },
    {
      "id": "S0005L05",
      "type": "A",
      "new": true,
      "lego": {"known": "speaking", "target": "hablar"}
    },
    {
      "id": "S0005L06",
      "type": "M",
      "new": true,
      "lego": {"known": "practise speaking", "target": "practicar hablar"},
      "components": [
        {"known": "to practise", "target": "practicar"},
        {"known": "speaking", "target": "hablar"}
      ],
      "teaches": "infinitive + infinitive (Spanish) vs infinitive + gerund (English)"
    },
    {
      "id": "S0005L07",
      "type": "A",
      "new": true,
      "lego": {"known": "with", "target": "con"}
    },
    {
      "id": "S0005L08",
      "type": "M",
      "new": true,
      "lego": {"known": "someone else", "target": "alguien más"},
      "components": [
        {"known": "someone", "target": "alguien"},
        {"known": "else", "target": "más"}
      ],
      "teaches": "word order same but 'más' placement"
    }
  ]
}
```

---

## Tracking Across Seeds

- `"new": true` - First occurrence of this LEGO
- `"new": false` - Reuse from earlier seed

Track LEGO reuse to show learners building vocabulary progressively.

---

## Language-Agnostic Principle

This framework works for ANY language pair because:

1. **Zero Ambiguity** is universal
2. **Meaningful standalone** is universal
3. **"Teaches something new"** adapts to each language's quirks:
   - Word order (Chinese, Japanese, German)
   - Linking particles (Spanish a/de, Japanese の/に, Chinese 的)
   - Agreement (gender, case, honorifics)
   - Structural differences

The PRINCIPLE is constant. The PATTERNS discovered vary by language.

---

## Summary

| Question | Answer | Result |
|----------|--------|--------|
| Zero ambiguity? | No | Chunk up |
| Meaningful standalone? | No | Component only |
| Single word in either language? | Yes | A-type |
| Combination teaches something new? | No | Use A-types separately |
| Combination teaches something new? | Yes | M-type with components |

**The goal:** Maximum combinatorial power through minimal, pedagogically-rich LEGOs.

---

## Version History
- v1.0: Initial attempt (infinitives, no null mappings)
- v2.0: Added overlapping lattice structure
- v3.0: Principle-first framework (Zero Ambiguity + Meaningful Standalone + Teaches Something New)
