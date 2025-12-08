# Unified Phase 1+3 Generator Prompt v4.1

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
"as quickly as possible" → "尽快"  A-type (尽快 is single unit)
"last night" → "anoche"        A-type (can't split "anoche")
```

**Key insight:** Word count asymmetry is FINE for A-types:
```
"I need" (2 words) → "necesito" (1 word)       = A-type ✓
"to improve" (2 words) → "mejorar" (1 word)    = A-type ✓
"why" (1 word) → "por qué" (2 words)           = A-type ✓
"as quickly as possible" → "尽快"               = A-type ✓
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
| Particle absorbed | "所有的事" / "all things" | The "的" isn't in English |
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

**Why?** The bare infinitive after a modal has no "to" marker, so "speak" alone is ambiguous. The learner wouldn't know whether to produce the infinitive or a conjugated form. Chunking with the modal resolves the ambiguity.

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

The learner sees "所有" and "事" separately, then learns how they combine (with "的" in between) when the full LEGO is introduced.

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

**Why?** "my" → "我的" is useful - learner can use this. "I" → "我" + "'s" → "的" is useless as practice items.

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

The components prime the learner with useful vocabulary. The full LEGO teaches how they combine.

### Component Examples by Language

**Spanish:**
```json
{
  "lego": {"known": "a good thing", "target": "una cosa buena"},
  "components": [
    {"known": "a", "target": "una"},
    {"known": "thing", "target": "cosa"},
    {"known": "good", "target": "buena"}
  ]
}
```

**Chinese:**
```json
{
  "lego": {"known": "making mistakes", "target": "犯错"},
  "components": [
    {"known": "commit", "target": "犯"},
    {"known": "mistake", "target": "错"}
  ]
}
```

**French/Italian:**
```json
{
  "lego": {"known": "je ne pensais pas", "target": "non pensavo"},
  "components": [
    {"known": "ne pas", "target": "non"},
    {"known": "je pensais", "target": "pensavo"}
  ]
}
```

---

## Overlapping M-types (The Lattice)

Overlapping M-types are **required** when they teach different things:

```
Sentence: "Voy a empezar a hablar"

LEGOs needed:
1. "voy" / "I go" (A)
2. "voy a" / "I'm going to" (M) - teaches ir + a pattern
3. "empezar" / "to start" (A)
4. "voy a empezar" / "I'm going to start" (M) - prevents "going to to start"
5. "hablar" / "to speak" (A)
6. "empezar a hablar" / "to start speaking" (M) - teaches empezar + a + infinitive
```

**Why overlap?** Without "voy a empezar" as an M-type, concatenating "voy a" + "empezar" might produce "I'm going to to start".

**The lattice IS the pedagogy** - each M-type is a lesson showing how pieces combine.

---

## Output Format

```json
{
  "seed_id": "S0047",
  "seed_pair": {
    "known": "Because I think that it's a good thing to make mistakes.",
    "target": "Porque pienso que es una cosa buena cometer errores."
  },
  "legos": [
    {
      "id": "S0047L01",
      "type": "A",
      "new": true,
      "lego": {"known": "because", "target": "porque"}
    },
    {
      "id": "S0047L02",
      "type": "A",
      "new": true,
      "lego": {"known": "I think", "target": "pienso"}
    },
    {
      "id": "S0047L03",
      "type": "A",
      "new": true,
      "lego": {"known": "that", "target": "que"}
    },
    {
      "id": "S0047L04",
      "type": "A",
      "new": true,
      "lego": {"known": "it is", "target": "es"}
    },
    {
      "id": "S0047L05",
      "type": "M",
      "new": true,
      "lego": {"known": "a good thing", "target": "una cosa buena"},
      "components": [
        {"known": "a", "target": "una"},
        {"known": "thing", "target": "cosa"},
        {"known": "good", "target": "buena"}
      ]
    },
    {
      "id": "S0047L06",
      "type": "M",
      "new": true,
      "lego": {"known": "to make mistakes", "target": "cometer errores"},
      "components": [
        {"known": "to make/commit", "target": "cometer"},
        {"known": "mistakes", "target": "errores"}
      ]
    }
  ]
}
```

**Note:** No `teaches` field - the components themselves show what's being taught.

---

## Tracking Across Seeds

- `"new": true` - Mark all LEGOs as new during Phase 1-3 extraction
- Phase 2 (Conflict Resolution) handles reuse detection and marks subsequent occurrences as `"new": false` with a `"ref"` field pointing to the original

**Note**: Each agent processes a small batch (e.g., 3-5 seeds) without visibility into other batches. Reuse tracking happens in Phase 2 when the full dataset is available.

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
```

---

## Language-Agnostic Examples

### Spanish (spa_for_eng)
```
"no me importa" / "I don't care" (M-type)
  └─ components: [no/not, me importa/it matters to me]
  └─ Why M?: Spanish uses impersonal construction

"cometer errores" / "making mistakes" (M-type)
  └─ components: [cometer/to commit, errores/mistakes]
  └─ Why M?: Spanish uses "commit errors" idiom
```

### Chinese (cmn_for_eng)
```
"我的意思" / "my meaning" (M-type)
  └─ components: [我的/my, 意思/meaning]
  └─ Why M?: 我的 is useful standalone (not 我 + 的)

"犯错" / "making mistakes" (M-type)
  └─ components: [犯/commit, 错/mistake]
  └─ Why M?: Compound verb structure
```

### French→Italian (ita_for_fra)
```
"non pensavo" / "je ne pensais pas" (M-type)
  └─ components: [non/ne pas, pensavo/je pensais]
  └─ Why M?: Negation structure differs

"una cosa buona" / "une bonne chose" (M-type)
  └─ components: [una/une, cosa/chose, buona/bonne]
  └─ Why M?: Adjective placement differs
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

**The goal:** Maximum combinatorial power through minimal, pedagogically-rich LEGOs.

---

## Version History
- v1.0: Initial attempt (infinitives, no null mappings)
- v2.0: Added overlapping lattice structure
- v3.0: Principle-first framework (Zero Ambiguity + Meaningful Standalone + Teaches Something New)
- v4.0: Clarified components as pedagogical scaffolding (not parse trees), removed `teaches` field, added translation rules, multi-language examples
- v4.1: Added Infinitive Marker Rule ("to speak" → A-type, bare infinitive after modal → M-type), fixed "I want" vs "I want to" decomposition
