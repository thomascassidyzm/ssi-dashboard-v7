# Phase 3: LEGO & Pattern Extraction Intelligence

**Version**: 5.0.1 (2025-01-06)
**Status**: 🔒 Active - Unified LEGO + Pattern Extraction with Complete Tiling
**Output**: `vfs/courses/{course_code}/lego_pairs.json`

---

## The Vision

**What we're building:** A compositional knowledge graph that enables learners to generate infinite natural sentences from finite building blocks, with zero uncertainty about which block to use when.

**The insight:** Languages are molecular. They're built from atoms (words) and molecules (phrases) that combine in predictable patterns. The learner's brain is a pattern recognition engine. Our job is to feed it the right building blocks in the right order, with massive differential exposure so patterns emerge naturally.

---

## Core Principles

### 1. Known Language First

**Start from what the learner will HEAR (the KNOWN language prompt).**

When we extract, we're not analyzing target language grammar. We're ensuring that when a learner hears a KNOWN chunk, they know EXACTLY what TARGET to produce.

**The question:** "If I show the learner this KNOWN phrase, do they know exactly ONE correct TARGET response?"

**If YES** → FD (Functionally Deterministic) ✓
**If NO** → Chunk up until YES

### 2. Atomic + Molecular

**Atomic (A):** Single word, indivisible FD unit
- "Quiero" → "I want"
- "hablar" → "to speak"
- "hoy" → "today"

**Molecular (M):** Multi-word, composed of atoms and/or other molecules
- "Estoy intentando" → "I'm trying"
- "tan duro como pueda" → "as hard as I can"
- "después de que termines" → "after you finish"

**Both matter:**
- Atomics are reusable building blocks
- Moleculars demonstrate pattern structures

### 3. Patterns Are Collections

**A pattern is NOT a component of a LEGO.**

**A pattern IS a collection of LEGOs that fit the same template:**
- Some parts stay FIXED (the pattern structure)
- Some parts are VARIABLE (the slots)
- The LEGOs "chunk together" following this template

**Example:**
```
Pattern P01: [Quiero/quiere/Queremos] + SLOT(infinitive)

Collection:
- Quiero hablar (S0001)
- Quiero intentar (S0007)
- quiere descubrir (S0017)
- Queremos reunirnos (S0018)

INVARIANT: Want-verb conjugation
SLOT: Which infinitive (hablar, intentar, descubrir, reunir...)
```

**Pattern identification happens by observing the LEGO collection across all seeds.**

### 4. Complete Tiling - Every Seed Reconstructible

**CRITICAL:** Each seed must show ALL LEGOs needed to reconstruct it, not just new ones.

**Why this matters:**
- Basket generation needs to see the complete LEGO composition
- Pattern analysis requires knowing which LEGOs tile together
- Validation requires proving every seed reconstructs perfectly
- Agents need complete context to generate practice phrases

**Implementation:**
- Mark new LEGOs: `"new": true`
- Reference existing LEGOs: `"ref": "S000X"` (where X is the seed that introduced it)
- Track cumulative total: `"cumulative_legos": 145`

**Example (S0007):**

Seed: "Quiero intentar tan duro como pueda hoy." = "I want to try as hard as I can today."

```json
{
  "seed_id": "S0007",
  "seed_pair": ["Quiero intentar tan duro como pueda hoy.", "I want to try as hard as I can today."],
  "legos": [
    {"id": "S0001L01", "type": "A", "target": "Quiero", "known": "I want", "ref": "S0001"},
    {"id": "S0007L01", "type": "A", "target": "intentar", "known": "to try", "new": true},
    {"id": "S0007L02", "type": "M", "target": "tan duro como pueda", "known": "as hard as I can",
     "new": true, "components": [...]},
    {"id": "S0007L03", "type": "A", "target": "hoy", "known": "today", "new": true}
  ],
  "patterns": ["P01", "P10"],
  "cumulative_legos": 22
}
```

**Notice:**
- S0007 shows "Quiero" with `"ref": "S0001"` - not new, but necessary for reconstruction
- Complete tiling: Quiero + intentar + tan duro como pueda + hoy = full sentence ✓
- Cumulative tracking: 22 total LEGOs exist after S0007

**Without complete tiling (WRONG):**
```json
{
  "seed_id": "S0007",
  "legos": [
    {"id": "S0007L01", "target": "intentar", "new": true},
    {"id": "S0007L02", "target": "tan duro como pueda", "new": true},
    {"id": "S0007L03", "target": "hoy", "new": true}
  ]
}
// Missing "Quiero" - seed cannot be reconstructed! ❌
```

### 5. Massive Differential Exposure

Extract all 668 seeds → Complete LEGO corpus → Complete pattern instances

Basket generation then creates 10+ practice phrases per LEGO, showing:
- SAME PATTERN with DIFFERENT VOCABULARY
- Learner sees P01 in 50+ variations
- Their brain pattern-matches automatically
- No explicit grammar teaching needed

---

## The Extraction Process

### Step 1: Bidirectional Sweep

**Given a seed pair, sweep through the KNOWN sentence both ways:**

**Forward (left to right):**
```
"I want to try as hard as I can today"

"I" → no map (too small)
"I want" → "Quiero" ✓ FOUND
  ↓ continue from "to"
"to" → no map (preposition alone)
"to try" → "intentar" ✓ FOUND
  ↓ continue from "as"
"as" → no map (polysemous)
"as hard" → keep checking...
"as hard as I can" → "tan duro como pueda" ✓ FOUND
  ↓ continue from "today"
"today" → "hoy" ✓ FOUND
```

**Backward (right to left):**
```
"today" → "hoy" ✓
"I can" → no map
"as I can" → keep checking...
"as hard as I can" → "tan duro como pueda" ✓
"to try" → "intentar" ✓
"I want" → "Quiero" ✓
```

**Merge: Take longest matches from both sweeps.**

### Step 2: The IF IN DOUBT → CHUNK UP Rule

**When uncertain if a chunk is FD, make it BIGGER:**

❌ "as" alone → ambiguous (tan? como? tanto?)
❌ "as hard" → still uncertain
✅ "as hard as I can" → NOW deterministic!

**More context = more certainty = FD compliance**

### Step 3: Classify Atomic vs Molecular

**Atomic:** Cannot be broken down further while maintaining FD
- Single word with 1:1 KNOWN → TARGET mapping
- "Quiero" = "I want"

**Molecular:** Multi-word FD unit
- Shows grammatical structure
- Contains atoms and/or other molecules
- "Estoy intentando" = "I'm trying"

### Step 4: Componentize Molecular LEGOs

**For EVERY molecular LEGO, show ALL WORDS with literal translations:**

**Rule 1: Reference Existing LEGOs**
If a word/phrase is already an established LEGO (atomic OR molecular), reference it as a complete unit.

**Rule 2: Show Non-LEGO Structural Words**
Words that CANNOT be standalone LEGOs (not FD, polysemous, need context) get literal translations.

**Example:**
```json
["S0012L01", "M", "No me gustaría", "I wouldn't like", [
  ["No", "not"],              // ← non-LEGO structural word
  ["Me gustaría", "I'd like"] // ← existing molecular LEGO (S0011L01)
]]
```

**ALL WORDS accounted for:**
- "No" (not a LEGO - negation particle)
- "Me gustaría" (existing LEGO from S0011)

**Another example:**
```json
["S0007L03", "M", "tan duro como pueda", "as hard as I can", [
  ["tan", "as/as much"],  // ← non-LEGO (polysemous)
  ["duro", "hard"],       // ← could be atomic LEGO if established elsewhere
  ["como", "as/like"],    // ← non-LEGO (polysemous)
  ["pueda", "I can"]      // ← could be atomic LEGO if established elsewhere
]]
```

**Componentization reveals structure:**
Spanish literally says "as much hard as I can" - shows word order, shows particles.

### Step 5: Identify Pattern Instances

**Mark which patterns this LEGO demonstrates:**

**At LEGO level:**
```json
{
  "lego_id": "S0007L01",
  "target": "Quiero",
  "known": "I want",
  "type": "A",
  "pattern_demonstrated": "P01",
  "note": "Want-verb, demonstrates P01 when + infinitive"
}
```

**At seed level:**
```json
{
  "S0007": {
    "patterns_used": ["P01"],
    "patterns_introduced": [],
    "legos": [...]
  }
}
```

**patterns_introduced:** First appearance of pattern in course
**patterns_used:** Any pattern demonstrated (new or reinforced)

---

## Output Format

### JSON Structure (Per Seed) - WITH COMPLETE TILING

```json
{
  "seed_id": "S0007",
  "seed_pair": ["Quiero intentar tan duro como pueda hoy.", "I want to try as hard as I can today."],
  "legos": [
    {"id": "S0001L01", "type": "A", "target": "Quiero", "known": "I want", "ref": "S0001"},
    {"id": "S0007L01", "type": "A", "target": "intentar", "known": "to try", "new": true},
    {"id": "S0007L02", "type": "M", "target": "tan duro como pueda", "known": "as hard as I can",
     "new": true, "components": [
      ["tan", "as/as much"],
      ["duro", "hard"],
      ["como", "as/like"],
      ["pueda", "I can"]
    ]},
    {"id": "S0007L03", "type": "A", "target": "hoy", "known": "today", "new": true}
  ],
  "patterns": ["P01", "P10"],
  "cumulative_legos": 22
}
```

**Key formatting:**
- Each seed is an object with `seed_id`, `seed_pair`, `legos`, `patterns`, `cumulative_legos`
- **CRITICAL:** `legos` array shows ALL LEGOs (new + referenced) needed to reconstruct seed
- New LEGOs: `"new": true`
- Referenced LEGOs: `"ref": "S000X"`
- Molecular LEGOs include `"components"` array
- Patterns array shows which patterns this seed demonstrates
- Cumulative tracking after each seed

### Complete File Structure

```json
{
  "version": "5.0.1",
  "methodology": "Phase 3 LEGO + Pattern Extraction v5.0.1 - COMPLETE TILING",
  "extraction_date": "2025-01-06",
  "note": "Every seed shows ALL LEGOs (new + referenced) needed to reconstruct it.",

  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": ["Quiero hablar español contigo ahora.", "I want to speak Spanish with you now."],
      "legos": [
        {"id": "S0001L01", "type": "A", "target": "Quiero", "known": "I want", "new": true},
        {"id": "S0001L02", "type": "A", "target": "hablar", "known": "to speak", "new": true},
        {"id": "S0001L03", "type": "A", "target": "español", "known": "Spanish", "new": true},
        {"id": "S0001L04", "type": "A", "target": "contigo", "known": "with you", "new": true},
        {"id": "S0001L05", "type": "A", "target": "ahora", "known": "now", "new": true}
      ],
      "patterns": ["P01_introduced"],
      "cumulative_legos": 5
    },

    {
      "seed_id": "S0002",
      "seed_pair": ["Estoy intentando aprender.", "I'm trying to learn."],
      "legos": [
        {"id": "S0002L01", "type": "M", "target": "Estoy intentando", "known": "I'm trying",
         "new": true, "components": [
          ["Estoy", "I am"],
          ["intentando", "trying"]
        ]},
        {"id": "S0002L02", "type": "A", "target": "aprender", "known": "to learn", "new": true}
      ],
      "patterns": ["P02_introduced"],
      "cumulative_legos": 7
    },

    {
      "seed_id": "S0003",
      "seed_pair": ["cómo hablar lo más frecuentemente posible", "how to speak as often as possible"],
      "legos": [
        {"id": "S0003L01", "type": "A", "target": "cómo", "known": "how", "new": true},
        {"id": "S0001L02", "type": "A", "target": "hablar", "known": "to speak", "ref": "S0001"},
        {"id": "S0003L02", "type": "M", "target": "lo más frecuentemente posible",
         "known": "as often as possible", "new": true, "components": [
          ["lo más", "the most"],
          ["frecuentemente", "often"],
          ["posible", "possible"]
        ]}
      ],
      "patterns": ["P12_introduced"],
      "cumulative_legos": 9
    }
  ],

  "extraction_notes": {
    "batch": "S0001-S0050",
    "status": "FOUNDATION COMPLETE",
    "methodology_applied": [
      "Known Language First bidirectional sweep",
      "IF IN DOUBT → CHUNK UP consistently applied",
      "Complete tiling - every seed shows ALL LEGOs (new + referenced)",
      "ALL WORDS componentization for molecular LEGOs",
      "Pattern instances marked at introduction and continuation"
    ],
    "patterns_introduced": {
      "P01": {
        "introduced": "S0001",
        "structure": "Quiero/quiere/Queremos + infinitive",
        "instances": ["S0001", "S0007", "S0015", ...],
        "note": "Want + infinitive - highly productive pattern"
      }
    },
    "lego_summary": {
      "total_new_legos": 145,
      "atomic": 71,
      "molecular": 74,
      "most_reused": ["español (S0001)", "hablar (S0001)", "quiero (S0001)"]
    },
    "foundation_quality": {
      "complete_tiling": true,
      "fd_compliant": true,
      "all_words_componentization": true,
      "pattern_instances_marked": true,
      "cumulative_tracking": true
    }
  }
}
```

---

## Language-Agnostic Examples

### Spanish (Romance Language)

**Seed S0011:**
```
TARGET: "Me gustaría poder hablar después de que termines."
KNOWN:  "I'd like to be able to speak after you finish."
```

**Forward sweep:**
```
"I'd like" → "Me gustaría" ✓
"to be able to" → "poder" ✓
"to speak" → "hablar" ✓
"after you finish" → "después de que termines" ✓
```

**Extraction:**
```json
[
  ["S0011L01", "M", "Me gustaría", "I'd like", [
    ["Me", "me/to me"],
    ["gustaría", "would please"]
  ]],
  ["S0011L02", "A", "poder", "to be able to"],
  ["S0011L03", "M", "después de que termines", "after you finish", [
    ["después de que", "after that"],
    ["termines", "you finish (subj)"]
  ]]
]
```

**Patterns identified:**
- P04: "Me gustaría" + infinitive (conditional desire)
- P10: "después de que" + subjunctive (temporal trigger)

---

### Chinese (Isolating Language)

**Seed S0002 (hypothetical):**
```
TARGET: "我正在试着学习。"
KNOWN:  "I'm trying to learn."
```

**Forward sweep:**
```
"I'm trying" → "我正在试着" ✓
"to learn" → "学习" ✓
```

**Extraction:**
```json
[
  ["S0002L01", "M", "我正在试着", "I'm trying", [
    ["我", "I"],
    ["正在", "in the process of"],
    ["试着", "trying"]
  ]],
  ["S0002L02", "A", "学习", "to learn"]
]
```

**Patterns identified:**
- P02: "正在" + verb (progressive aspect)
- Different structure than Spanish, same principle

---

## Pattern Taxonomy

**Patterns emerge from observing LEGO collections across all seeds.**

### Category 1: Verb Phrase Patterns

**Structure: [Modal/Auxiliary] + SLOT(verb form)**

- P01: Quiero/quiere/Queremos + infinitive
- P02: Estoy + gerund
- P03: Voy a + infinitive
- P04: Me gustaría + infinitive
- P17: Necesito + infinitive
- P18: Puedo + infinitive

**INVARIANT:** Modal verb
**SLOT:** Infinitive or gerund

### Category 2: Mood/Aspect Patterns

**Structure: [Trigger] + SLOT(subjunctive/mood)**

- P10: después de que + subjunctive
- P10: quiero que + subjunctive
- P05: Simple present tense
- P13: Imperfect tense

**INVARIANT:** Grammatical trigger
**SLOT:** Verb in required form

### Category 3: Structural Patterns

**Structure: Language-specific constructions**

Spanish:
- Negation placement: "No quiero"
- Pronoun attachment: "reunirnos"
- Article patterns: "toda la oración"

Chinese:
- Aspect markers: 了, 着, 过
- Measure words: 个, 只, 本
- 的 constructions

**These reveal how target language structures meaning differently from known language.**

### Category 4: Idiomatic Chunking

**Structure: Fixed expressions**

- Time expressions: "esta noche", "más tarde"
- Fixed phrases: "lo que", "cuál es"
- Comparisons: "tan...como"

---

## The Parallel Extraction Architecture

### Workflow:

**1. Parallel Extraction (668 seeds)**
```
Agent 1:  Extract S0001-S0013 → lego_batch_01.json
Agent 2:  Extract S0014-S0026 → lego_batch_02.json
...
Agent 50: Extract S0655-S0668 → lego_batch_50.json

Each agent:
- Processes independently
- No dependency on other batches
- Outputs LEGOs + pattern instances
```

**2. Post-Aggregation**
```
Merge all batches
Build complete LEGO corpus
Identify pattern instances across all seeds
Keep duplicates (useful for basket generation context)
```

**3. Basket Generation (Parallel)**
```
For each LEGO:
- Knows full corpus (all 668 seeds extracted)
- Can use any LEGO/pattern introduced ≤ current seed (GATE)
- Generates 10+ practice phrases
- Recency bias: favor vocab from last 5 seeds
- Shows pattern variations with different vocabulary
```

**4. Post-Basket Deduplication**
```
After baskets generated:
- Deduplicate LEGOs (mark duplicates)
- FCFS: first occurrence owns the mapping
- Later occurrences reference first
```

---

## Quality Checklist

Before finalizing extraction for a seed, verify:

### FD Compliance
- [ ] Every LEGO has 1:1 KNOWN → TARGET mapping
- [ ] Learner hearing KNOWN knows exactly ONE TARGET response
- [ ] No ambiguity, no uncertainty

### Atomic/Molecular Classification
- [ ] Atomics are single words, indivisible
- [ ] Moleculars are multi-word FD units
- [ ] Both have pedagogical value

### Componentization (Molecular LEGOs)
- [ ] ALL WORDS accounted for
- [ ] Existing LEGOs referenced as complete units
- [ ] Non-LEGO structural words shown with literal translations
- [ ] Reveals target language structure transparently

### Pattern Instance Marking
- [ ] LEGOs that demonstrate patterns are marked
- [ ] Seed-level pattern tracking (introduced vs used)
- [ ] Pattern instances will enable differential exposure in baskets

### **COMPLETE TILING (CRITICAL)**
- [ ] **Every seed shows ALL LEGOs (new + referenced) needed to reconstruct it**
- [ ] **New LEGOs marked with `"new": true`**
- [ ] **Referenced LEGOs marked with `"ref": "S000X"`**
- [ ] **Cumulative LEGO count tracked after each seed**
- [ ] **Seed can be perfectly reconstructed by concatenating all LEGO targets**
- [ ] No gaps, no missing chunks
- [ ] Natural linguistic units (not arbitrary segmentation)

---

## Common Extraction Patterns

### Always Chunk These (Never Standalone)

**Prepositions:** de, a, en, con, para, por
- Never extract alone
- Always wrapped: "un poco de", "Voy a", "en español"
- Exception: "con" can be atomic if FD in target language

**Articles:** el, la, un, una, los, las
- Never extract alone
- Always with noun: "la oración", "el día"

**Conjunctions (most):** que, si (when introducing clauses)
- "que" alone → polysemous (that/which/than/what)
- Wrapped: "quiero que", "lo que", "después de que"
- Exception: coordinating conjunctions CAN be atomic: "y", "pero", "o"

**Auxiliaries in multi-word constructions:**
- "estoy" + gerund → molecular "Estoy intentando"
- "voy a" + infinitive → molecular "Voy a"

### Prefer Atomic When

**Content words with clear 1:1 mapping:**
- Nouns: "español", "palabra", "respuesta"
- Verbs (infinitive form): "hablar", "aprender", "intentar"
- Adjectives: "seguro", "duro"
- Adverbs: "ahora", "hoy", "rápidamente"
- Question words: "cómo", "por qué"

**Conjugated verbs that are FD:**
- "Quiero" = "I want" (first person singular, FD)
- "Hablas" = "you speak" (second person singular, FD)
- "Queremos" = "we want" (first person plural, FD)

### Always Molecular When

**Subjunctive constructions:**
- "después de que termines" (trigger + mood inseparable)
- "quiero que hables" (trigger + subjunctive form)

**Fixed expressions:**
- "Me gustaría" (indirect object + conditional, idiomatic)
- "lo que" (what - relative pronoun construction)

**Grammatical constructions:**
- "Estoy intentando" (progressive: estar + gerund)
- "Voy a practicar" (near future: ir a + infinitive)

---

## Edge Cases and Judgment Calls

### Overlapping LEGOs (Both Atomic and Molecular)

**Extract BOTH when both have pedagogical value:**

```json
["S0005L02", "A", "practicar", "to practise"],
["S0005L03", "M", "practicar hablar", "to practise speaking", [
  ["practicar", "to practise"],
  ["hablar", "speaking"]
]]
```

**Why both:**
- Atomic "practicar" is reusable (can slot into any pattern)
- Molecular "practicar hablar" demonstrates pattern (verb + infinitive)
- Basket generation uses both: atomic for recombination, molecular for pattern exposure

### Gerund vs Infinitive Sense

**"hablar" can mean:**
- "to speak" (infinitive) - "Quiero hablar"
- "speaking" (gerund sense) - "practicar hablar"

**How to extract:**
Both are valid if context makes them FD:
- Context 1: "I want to speak" → "hablar" = "to speak"
- Context 2: "to practise speaking" → "hablar" = "speaking"

Different KNOWN contexts = different FD mappings = both valid.

### Pronoun Attachment

**Spanish: "reunirnos" = "to meet" (literally: to reunite-ourselves)**

**Extract as:**
```json
["S0018L02", "A", "reunirnos", "to meet"]
```

**Why atomic:**
- Written as one word in target
- FD mapping to known
- Reflexive pronoun attachment is internal structure

**Componentization would be:**
Not necessary - treat as atomic unit. The reflexive is part of the verb's meaning.

### Idiomatic Expressions

**"tan duro como pueda" = "as hard as I can"**

**Not literally:** "as much hard as I can"
**But idiomatically:** "as hard as I can"

**Extract as molecular showing literal structure:**
```json
["tan duro como pueda", "as hard as I can", [
  ["tan", "as/as much"],
  ["duro", "hard"],
  ["como", "as/like"],
  ["pueda", "I can"]
]]
```

**KNOWN is idiomatic English, components show literal Spanish construction.**

---

## Validation: The FD Test

**For every LEGO, ask:**

> "If I show a learner only the KNOWN chunk, do they know exactly ONE correct TARGET response?"

**Example tests:**

✅ PASS:
```
KNOWN: "I want" → TARGET: "Quiero"
Learner thinks: "Quiero" (deterministic, no alternatives)
```

✅ PASS:
```
KNOWN: "as hard as I can" → TARGET: "tan duro como pueda"
Learner thinks: "tan duro como pueda" (deterministic, context clear)
```

❌ FAIL:
```
KNOWN: "the" → TARGET: ???
Learner thinks: "el? la? los? las? which one?"
Fix: Chunk up to "the table" → "la mesa"
```

❌ FAIL:
```
KNOWN: "as" → TARGET: ???
Learner thinks: "tan? como? tanto? which one?"
Fix: Chunk up to "as hard as I can" → "tan duro como pueda"
```

**If FAIL → Chunk up until PASS.**

---

## Expected Output Metrics

### For 668-seed full course:

**Total LEGOs:** ~2000-3000
- Atomic: ~60-70%
- Molecular: ~30-40%

**Total Patterns:** ~50-80 (language-dependent)
- Verb patterns: ~15-25
- Mood/aspect patterns: ~10-15
- Structural patterns: ~20-30
- Idiomatic patterns: ~10-20

**Pattern instances per pattern:** 10-100+
- High-frequency patterns (P01, P02, P03): 50-100+ instances
- Mid-frequency patterns: 20-50 instances
- Low-frequency patterns: 5-20 instances

### Quality indicators:

✓ **High reuse:** Atomic LEGOs appear in multiple seeds
✓ **Pattern coverage:** Every seed demonstrates 1-3 patterns
✓ **Progressive complexity:** Early seeds simpler, later seeds show pattern combinations
✓ **FD compliance:** Zero ambiguous LEGOs

---

## Anti-Patterns (What NOT To Do)

### ❌ Extracting Ambiguous Atoms

**Bad:**
```json
["que", "that"]  // polysemous - could be that/which/than/what
```

**Good:**
```json
["quiero que hables", "I want you to speak", [
  ["Quiero", "I want"],
  ["que", "that"],
  ["hables", "you speak (subj)"]
]]
```

### ❌ Over-Atomization

**Bad:**
```json
["de", "of"]           // preposition alone, not FD
["que", "that"]        // conjunction alone, not FD
["termines", "finish"] // subjunctive form without trigger, not FD
```

**Good:**
```json
["después de que termines", "after you finish", [...]]
```

### ❌ Under-Extraction

**Bad:**
```json
["Quiero hablar español contigo ahora", "I want to speak Spanish with you now"]
// Too large, not recombinable
```

**Good:**
```json
["Quiero", "I want"]
["hablar", "to speak"]
["español", "Spanish"]
["contigo", "with you"]
["ahora", "now"]
// Multiple reusable units
```

### ❌ Missing Componentization

**Bad:**
```json
["S0002L01", "M", "Estoy intentando", "I'm trying"]
// Missing component breakdown
```

**Good:**
```json
["S0002L01", "M", "Estoy intentando", "I'm trying", [
  ["Estoy", "I am"],
  ["intentando", "trying"]
]]
```

### ❌ Interpretive Components

**Bad:**
```json
["tan duro como pueda", "as hard as I can", [
  ["tan duro", "as hard"],  // grouped, not word-by-word
  ["como pueda", "as I can"] // grouped, not word-by-word
]]
```

**Good:**
```json
["tan duro como pueda", "as hard as I can", [
  ["tan", "as/as much"],     // literal, word-by-word
  ["duro", "hard"],          // literal, word-by-word
  ["como", "as/like"],       // literal, word-by-word
  ["pueda", "I can"]         // literal, word-by-word
]]
```

---

## Summary: The Elegant System

### The Flow:

1. **Known Language First** → Extract LEGOs that are FD from learner's perspective
2. **Atomic + Molecular** → Build reusable atoms, demonstrate patterns with molecules
3. **Componentization** → Reveal target language structure transparently
4. **Pattern Instances** → Mark which patterns each LEGO demonstrates
5. **Parallel Extraction** → Process 668 seeds independently
6. **Post-Aggregation** → Merge, build pattern catalog
7. **Basket Generation** → Massive differential exposure (pattern + varied vocabulary)
8. **Implicit Acquisition** → Learner's brain pattern-matches automatically

### The Goal:

**Not:** "Learn these grammar rules"
**But:** "See these patterns 50+ times with different words, and your brain will figure it out"

**The system serves the learner's natural pattern recognition engine.**

---

## Version History

**v5.0.1 (2025-01-06):** Complete Tiling Implementation
- **CRITICAL FIX:** Added "Complete Tiling" as Core Principle #4
- Updated output format to show ALL LEGOs per seed (new + referenced)
- Added `"new": true` and `"ref": "S000X"` markers
- Added cumulative LEGO tracking
- Emphasized tiling in quality checklist
- Validated through S0001-S0050 extraction (145 LEGOs, 18 patterns)
- **Why:** Initial extractions failed validation because seeds couldn't be reconstructed - only showed NEW LEGOs, missing referenced ones

**v5.0.0 (2025-01-06):** Unified LEGO + Pattern extraction
- Known Language First Mapping methodology
- Atomic (A) / Molecular (M) terminology
- Componentization: existing LEGOs + non-LEGO structural words
- Pattern instances marked during extraction
- Language-agnostic (Spanish + Chinese examples)
- Parallel extraction architecture
- Complete quality checklist and anti-patterns

---

**This is the definitive Phase 3 intelligence. Extract LEGOs and patterns that enable learners to acquire language through pattern recognition, not grammar memorization.**
