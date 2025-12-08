# Phase 1: Translation + LEGO Extraction (v4.2)

> **The definitive prompt for generating LUT-compliant translations and LEGO decompositions for any language pair.**

**Port**: 3457
**Output**: `draft_lego_pairs.json`
**Status**: Active (APML v11.0)

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

## Translation Rules (Phase 1)

Before extracting LEGOs, generate the target translation following these principles:

### 1. Zero Variation
Each seed has ONE correct translation. No alternatives, no optionality.
- ❌ "quiero/deseo hablar"
- ✅ "quiero hablar"

### 2. Use Cognates (Seeds 1-100 especially)
Prefer cognate vocabulary where natural to reduce cognitive load:
- ✅ "practicar" over "entrenar" (practice)
- ✅ "diferente" over "distinto" (different)
- ✅ "importante" over "relevante" (important)

### 3. Natural, Idiomatic Translation
Translate meaning, not word-for-word:
- "I'm going to" → "voy a" (not "estoy yendo a")
- "I feel like" → appropriate idiomatic form in target

### 4. Consistent Formality
Maintain consistent register throughout the course (typically informal/tú form for Spanish).

---

## LEGO Types

### A-type (Atomic)

**Definition:** A LEGO PAIR where AT LEAST ONE side is a single word. Cannot be split.

**⚠️ CRITICAL:** We classify the LEGO PAIR, not individual translations. If EITHER the known OR target is a single word, the whole pair is A-type.

**Criteria:**
1. Zero ambiguity ✓
2. Meaningful standalone (can answer a question) ✓
3. Single word in one or both languages (physically cannot split)

**Examples:**
```
"red" → "rojo"                 A-type (1 word both sides)
"I want" → "quiero"            A-type (can't split "quiero")
"to speak" → "hablar"          A-type (can't split "hablar")
"with you" → "contigo"         A-type (can't split "contigo")
"why" → "por qué"              A-type (can't split "why")
"last night" → "anoche"        A-type (can't split "anoche")
```

**Key insight:** Word count asymmetry is FINE for A-types:
```
"I need" (2 words) → "necesito" (1 word)       = A-type ✓
"to improve" (2 words) → "mejorar" (1 word)    = A-type ✓
"why" (1 word) → "por qué" (2 words)           = A-type ✓
```

**NOT A-type (fail meaningful-standalone test):**
```
"the" → "el/la"                ✗ Cannot answer a question with "the"
"a" → "un/una"                 ✗ Cannot answer a question with "a"
```

These only appear as COMPONENTS within M-types.

---

### M-type (Molecular)

**Definition:** A LEGO PAIR with 2+ words in BOTH languages, where the combination teaches something the learner couldn't predict.

**Criteria:**
1. Zero ambiguity ✓
2. Meaningful standalone ✓
3. 2+ words in BOTH languages
4. Combination is non-obvious (can't just concatenate A-types)

**When to create M-types:**

| Pattern | Example | Why M-type? |
|---------|---------|-------------|
| Word order differs | "una cosa buena" / "a good thing" | Adjective placement |
| Linking word appears | "voy a practicar" / "I'm going to practise" | The "a" linkage |
| Structural divergence | "no me importa" / "I don't care" | Different construction |
| Concatenation fails | "voy a empezar" / "I'm going to start" | Prevents "going to to start" |
| Bare infinitive | "I can speak" / "puedo hablar" | No "to" marker = ambiguous |

---

### Infinitive Marker Rule (CRITICAL)

**With "to" → A-type:** The infinitive marker disambiguates
```
"to speak" → "hablar"     A-type ✓ (the "to" signals infinitive)
"to go" → "ir"            A-type ✓
"to eat" → "comer"        A-type ✓
```

**Without "to" (bare infinitive) → MUST chunk up as M-type:**
```
"speak" → ???             LUT FAILS (hablar? habla? hablo? hablas?)
"I can speak" → "puedo hablar"    M-type ✓ (modal + bare infinitive)
"I might come" → "podría venir"   M-type ✓
"I must go" → "debo ir"           M-type ✓
```

**Why?** The bare infinitive after a modal has no "to" marker, so "speak" alone is ambiguous. Chunking with the modal resolves the ambiguity.

---

### NOT M-type (trivial concatenation)

If A + A = predictable result with nothing new learned, **do NOT create an M-type**.

```
"quiero" = "I want" (A)
"hablar" = "to speak" (A)
"quiero hablar" = "I want to speak"  ← NOT M-type!
  └─ Just concatenation, learner can figure this out
```

**M-type test:**
> "If a learner knows the A-types, can they produce this combination correctly without help?"
> - Yes → NOT M-type (trivial concatenation)
> - No → M-type needed

---

## Overlapping M-types: The Lattice (CRITICAL)

### Why Overlap?

Overlapping LEGOs serve TWO purposes:
1. **Teach the joints** - how pieces connect (prevents "going to to practise")
2. **Unlock combinatorial freedom** - smaller pieces become available for later practice

### The Embedding Rule

When a smaller LEGO appears **character-exact** inside a larger LEGO in the same seed:
- **INCLUDE BOTH** as separate LEGOs
- The larger one: `new: true` (introduces it)
- The smaller one: `new: false` (already embedded, but now unlocked for reuse)

**EXAMPLE - S0005: "I'm going to practise speaking with someone else."**

```
Target: "Voy a practicar hablar con alguien más."

LEGOs (in order):
1. "voy a" / "I'm going to"              new: true   (teaches ir+a pattern)
2. "voy a practicar" / "I'm going to practise"  new: true   (extends, prevents double "to")
3. "practicar hablar" / "to practise speaking"  new: true   (verb+infinitive chain)
4. "hablar" / "to speak"                 new: false  (embedded in #3, unlocked for reuse)
5. "con alguien más" / "with someone else"      new: true
6. "alguien más" / "someone else"        new: false  (embedded in #5, unlocked for reuse)
```

**Why include "alguien más" with new:false?**

Without it, later practice baskets could ONLY use "con alguien más" as a unit.
With it, we can build phrases using EITHER "con alguien más" OR "alguien más" alone.

The `new: false` LEGOs don't get introduced (they're already embedded in the larger LEGO above), but they ARE available as building blocks for later practice.

### Multi-Language Lattice Examples

**Spanish:**
```
"Voy a empezar a hablar" (I'm going to start speaking)

LEGOs:
- "voy a" / "I'm going to"               new: true
- "voy a empezar" / "I'm going to start" new: true  (prevents "going to to start")
- "empezar a hablar" / "to start speaking" new: true (teaches empezar+a+inf)
- "hablar" / "to speak"                  new: false (embedded, unlocked)
```

**Mandarin:**
```
"我想跟你说话" (I want to speak with you)

LEGOs:
- "我想" / "I want"                      new: true
- "跟你" / "with you"                    new: true
- "跟你说话" / "to speak with you"        new: true  (verb takes object position)
- "说话" / "to speak"                    new: false (embedded, unlocked)
```

**French→Italian:**
```
"Je vais commencer à parler" → "Vado a cominciare a parlare"

LEGOs:
- "vado a" / "je vais"                   new: true
- "vado a cominciare" / "je vais commencer" new: true
- "cominciare a parlare" / "commencer à parler" new: true
- "parlare" / "parler"                   new: false (embedded, unlocked)
```

### Quick Test for Embedding

For each M-type, ask:
> "Does this chunk contain a smaller chunk that would be useful on its own later?"

If yes → include the smaller chunk as a separate LEGO with `new: false`

---

## Components: Pedagogical Scaffolding

**Components are NOT a linguistic parse tree.** They are the **practice items that precede the LEGO debut**.

### How Components Work in Learning

When a learner encounters an M-type LEGO, they first practice the components:

```
M-LEGO: "所有的事" = "all things"

Practice sequence:
1. all → 所有         (component 1)
2. things → 事        (component 2)
3. all things → 所有的事  (LEGO debut)
4. ...practice sentences
```

### Component Rules

**Components should be USEFUL STANDALONE MAPPINGS:**

✅ GOOD components:
```json
{
  "lego": {"known": "my meaning", "target": "我的意思"},
  "components": [
    {"known": "my", "target": "我的"},
    {"known": "meaning", "target": "意思"}
  ]
}
```

❌ BAD components (mechanical word-by-word split):
```json
{
  "lego": {"known": "my meaning", "target": "我的意思"},
  "components": [
    {"known": "I", "target": "我"},
    {"known": "'s", "target": "的"},
    {"known": "meaning", "target": "意思"}
  ]
}
```

### Components Don't Need to Tile Exactly

Components don't have to mechanically reconstruct the M-LEGO:

```
M-LEGO: "所有的事" (all things)
Components:
  - "所有" (all)
  - "事" (things)

Note: "的" is NOT a component - it's a structural particle
the learner absorbs when they see the full LEGO.
```

---

## Output Format (STRICT - FOLLOW EXACTLY)

**⚠️ CRITICAL: Use this EXACT structure. Do not deviate.**

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
      "type": "M",
      "new": true,
      "lego": {"known": "I'm going to", "target": "voy a"},
      "components": [
        {"known": "I go", "target": "voy"},
        {"known": "to", "target": "a"}
      ]
    },
    {
      "id": "S0005L02",
      "type": "M",
      "new": true,
      "lego": {"known": "I'm going to practise", "target": "voy a practicar"},
      "components": [
        {"known": "I'm going to", "target": "voy a"},
        {"known": "to practise", "target": "practicar"}
      ]
    },
    {
      "id": "S0005L03",
      "type": "M",
      "new": true,
      "lego": {"known": "to practise speaking", "target": "practicar hablar"},
      "components": [
        {"known": "to practise", "target": "practicar"},
        {"known": "to speak", "target": "hablar"}
      ]
    },
    {
      "id": "S0005L04",
      "type": "A",
      "new": false,
      "lego": {"known": "to speak", "target": "hablar"}
    },
    {
      "id": "S0005L05",
      "type": "M",
      "new": true,
      "lego": {"known": "with someone else", "target": "con alguien más"},
      "components": [
        {"known": "with", "target": "con"},
        {"known": "someone else", "target": "alguien más"}
      ]
    },
    {
      "id": "S0005L06",
      "type": "M",
      "new": false,
      "lego": {"known": "someone else", "target": "alguien más"}
    }
  ]
}
```

### Format Requirements Checklist

- ✅ `seed_id`: "S0001" format
- ✅ `seed_pair`: object with `known` and `target` (NOT `eng`/`spa`, NOT `seed_eng`/`seed_spa`)
- ✅ Each LEGO has `id`: "S0001L01" format (seed ID + L + number)
- ✅ Each LEGO has `type`: "A" or "M"
- ✅ Each LEGO has `new`: true or false
- ✅ Each LEGO has `lego`: object with `known` and `target` (NOT flat fields)
- ✅ M-types have `components`: array of `{known, target}` objects
- ✅ A-types do NOT have components

**Note on `new: false`:** These LEGOs are embedded character-exact in a larger LEGO above. They don't need introduction but ARE available for later practice combinations.

---

## Tracking Across Seeds

- Within a single seed: Use `new: false` for LEGOs embedded in larger LEGOs (as shown above)
- Across seeds: Phase 2 (Conflict Resolution) handles reuse detection across the full dataset

**Note**: Each agent processes a small batch (e.g., 3-5 seeds) without visibility into other batches. Cross-seed reuse tracking happens in Phase 2.

---

## The Algorithm

```
FOR each sentence:
    1. Generate natural translation (following Translation Rules)

    2. FOR each potential chunk:
        a. Test: Zero ambiguity?
           - No → Chunk up, try again
           - Yes → Continue

        b. Test: Meaningful standalone?
           - No → Can only be component, not LEGO
           - Yes → Continue

        c. Test: Single word in EITHER language?
           - Yes → A-type (classify the PAIR)
           - No → Continue

        d. Test: Would concatenating A-types produce correct result?
           - Yes → NOT M-type, use A-types separately
           - No → M-type with useful components

    3. Build overlapping M-types where concatenation would fail

    4. For each M-type, check if it contains smaller useful chunks
       - If yes → add smaller chunk as separate LEGO with new: false
```

---

## Quick Reference

| Question | Answer | Result |
|----------|--------|--------|
| Zero ambiguity? | No | Chunk up |
| Meaningful standalone? | No | Component only (not a LEGO) |
| Single word in EITHER language? | Yes | A-type |
| Can learner produce from A-types alone? | Yes | NOT M-type |
| Can learner produce from A-types alone? | No | M-type with components |
| Does M-type contain useful smaller chunk? | Yes | Add smaller as new: false |

**The goal:** Maximum combinatorial power through minimal, pedagogically-rich LEGOs with overlapping lattice for reuse.

---

## Version History
- v1.0: Initial attempt (infinitives, no null mappings)
- v2.0: Added overlapping lattice structure
- v3.0: Principle-first framework (Zero Ambiguity + Meaningful Standalone + Teaches Something New)
- v4.0: Clarified components as pedagogical scaffolding (not parse trees), removed `teaches` field, added translation rules, multi-language examples
- v4.1: Added Infinitive Marker Rule ("to speak" → A-type, bare infinitive after modal → M-type), fixed "I want" vs "I want to" decomposition
- v4.2: Strengthened Overlapping Lattice section - clarified embedding rule (new: false for character-exact substrings), added multi-language lattice examples, emphasized combinatorial freedom unlocking
