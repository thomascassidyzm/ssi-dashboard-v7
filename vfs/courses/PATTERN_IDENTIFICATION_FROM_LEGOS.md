# Pattern Identification from Known Language First Mapping

## How Patterns Emerge from LEGO Extraction

**The connection:**
1. Extract LEGOs using **Known Language First Mapping**
2. Observe which LEGOs demonstrate **recurring grammatical structures**
3. Identify **PATTERN = INVARIANT structure** across multiple LEGO instances
4. Track patterns for basket generation (pattern + new vocabulary)

---

## Example: Discovering P01 Pattern

### S0001: First Instance
```
TARGET: "Quiero hablar español contigo ahora."
KNOWN:  "I want to speak Spanish with you now."
```

**Known Language First Mapping:**
```
"I want" → "Quiero" ✓
"to speak" → "hablar" ✓
"Spanish" → "español" ✓
```

**LEGOs Extracted:**
```json
["S0001L01", "B", "Quiero", "I want"],
["S0001L02", "B", "hablar", "to speak"]
```

**Pattern Observation:**
- "Quiero" (I want) + "hablar" (to speak - infinitive)
- STRUCTURE: Subject verb + infinitive
- This is **P01 pattern introduction**

### S0007: Pattern Reinforcement
```
TARGET: "Quiero intentar tan duro como pueda hoy."
KNOWN:  "I want to try as hard as I can today."
```

**Known Language First Mapping:**
```
"I want" → "Quiero" ✓
"to try" → "intentar" ✓
```

**LEGOs Extracted:**
```json
["S0007L01", "B", "Quiero", "I want"],
["S0007L02", "B", "intentar", "to try"]
```

**Pattern Recognition:**
- SAME STRUCTURE: "Quiero" + infinitive
- DIFFERENT VOCABULARY: "hablar" (S0001) vs "intentar" (S0007)
- **P01 pattern reinforced**

### S0012: Pattern with More Vocabulary
```
TARGET: "Quiero adivinar la respuesta."
KNOWN:  "I want to guess the answer."
```

**LEGOs Extracted:**
```json
["S0012L01", "B", "Quiero", "I want"],
["S0012L02", "B", "adivinar", "to guess"]
```

**Pattern Mastery:**
- SAME: "Quiero" + infinitive
- VARIANT: "adivinar" (yet another infinitive)
- Learner now sees: **"Quiero + ANY infinitive = I want to [do that thing]"**

---

## Pattern Definition

**P01 Pattern:**
```json
{
  "code": "P01",
  "parent_seed": "S0001",
  "structure": "Quiero + infinitive",
  "description": "First person want + action",
  "learner_description": "Use 'Quiero' + any verb to say 'I want to [do that thing]'",
  "category": "verb_phrase_modal",
  "introduced_seed": "S0001",
  "reinforcement_seeds": ["S0007", "S0012", "S0015", ...]
}
```

**INVARIANT:** "Quiero" + [INFINITIVE VERB]
**VARIANT:** Which infinitive (hablar, intentar, adivinar, aprender...)

---

## Example: Discovering P10 Pattern (Subjunctive)

### S0007 Revisited: Subjunctive Instance
```
TARGET: "Quiero intentar tan duro como pueda hoy."
KNOWN:  "I want to try as hard as I can today."
```

**Known Language First Mapping:**
```
"as hard as I can" → "tan duro como pueda" ✓
```

**LEGO Extracted:**
```json
["S0007L03", "C", "tan duro como pueda", "as hard as I can", [
  ["tan", "as/as much"],
  ["duro", "hard"],
  ["como", "as/like"],
  ["pueda", "I can"]
]]
```

**Componentization:** ALL FOUR WORDS in "tan duro como pueda" broken down literally

**Pattern Observation:**
- "como pueda" = "as I can"
- "pueda" is **subjunctive form** of "poder"
- STRUCTURE: "como" + subjunctive verb
- This introduces **P10 subjunctive pattern** (subset: comparison with subjunctive)

### S0011: Subjunctive with Different Trigger
```
TARGET: "Me gustaría que hables español conmigo."
KNOWN:  "I'd like you to speak Spanish with me."
```

**Known Language First Mapping:**
```
"I'd like you to speak" → "Me gustaría que hables" ✓
```

**LEGO Extracted:**
```json
["S0011L01", "C", "Me gustaría que hables", "I'd like you to speak", [
  ["Me", "me/to me"],
  ["gustaría", "would please"],
  ["que", "that"],
  ["hables", "you speak (subj)"]
]]
```

**Componentization:** ALL FOUR WORDS broken down literally

**Pattern Recognition:**
- "que hables" = "you to speak"
- "hables" is **subjunctive form**
- TRIGGER: "que" after desire verb
- **P10 pattern reinforced** (different trigger than "como")

---

## Example: Discovering P02 Pattern (Progressive)

### S0002: First Instance
```
TARGET: "Estoy intentando aprender."
KNOWN:  "I'm trying to learn."
```

**Known Language First Mapping:**
```
"I'm trying" → "Estoy intentando" ✓
```

**LEGO Extracted:**
```json
["S0002L01", "C", "Estoy intentando", "I'm trying", [
  ["Estoy", "I am"],
  ["intentando", "trying"]
]]
```

**Pattern Observation:**
- "Estoy" (I am) + "intentando" (gerund form)
- STRUCTURE: Estar + gerund
- This is **P02 pattern introduction** (progressive/continuous)

### S0006: Pattern with Different Verb
```
TARGET: "Estoy hablando español ahora."
KNOWN:  "I'm speaking Spanish now."
```

**Known Language First Mapping:**
```
"I'm speaking" → "Estoy hablando" ✓
```

**LEGO Extracted:**
```json
["S0006L01", "C", "Estoy hablando", "I'm speaking", [
  ["Estoy", "I am"],
  ["hablando", "speaking"]
]]
```

**Pattern Recognition:**
- SAME STRUCTURE: "Estoy" + gerund
- DIFFERENT VOCABULARY: "intentando" vs "hablando"
- **P02 pattern reinforced**

**Learner insight:** "Estoy + [verb]-ando/-iendo = I'm [verb]-ing"

---

## How Patterns Are Marked in Extraction

### LEGO-Level Pattern Marking

When extracting a LEGO that demonstrates a pattern, mark it:

```json
{
  "id": "S0007L01",
  "lego": ["I want", "Quiero"],
  "type": "B",
  "pattern_demonstrated": "P01",
  "note": "First person want - demonstrates P01 when followed by infinitive"
}
```

### Seed-Level Pattern Tracking

At the seed level, track which patterns appear:

```json
{
  "S0007": {
    "seed_pair": {
      "target": "Quiero intentar tan duro como pueda hoy.",
      "known": "I want to try as hard as I can today."
    },
    "patterns_used": ["P01", "P10"],
    "patterns_introduced": [],
    "legos": [...]
  }
}
```

- **patterns_introduced**: First appearance of this pattern in course
- **patterns_used**: Any pattern demonstrated in this seed (new or reinforced)

---

## Pattern Taxonomy from LEGO Extraction

### Category 1: Verb Phrase Patterns

**Discovered through modal/auxiliary + infinitive LEGOs:**

- **P01**: Quiero + infinitive (I want to...)
  - S0001: "I want" → "Quiero" + "to speak" → "hablar"
  - S0007: "I want" → "Quiero" + "to try" → "intentar"

- **P03**: Voy a + infinitive (I'm going to...)
  - S0005: "I'm going to" → "Voy a" + "to practice" → "practicar"

- **P17**: Necesito + infinitive (I need to...)
  - S0044: "I need" → "Necesito" + "to learn" → "aprender"

**Pattern structure emerges from LEGO combinations**

### Category 2: Tense/Aspect Patterns

**Discovered through conjugated verb forms:**

- **P02**: Estoy + gerund (I'm [verb]-ing)
  - S0002: "I'm trying" → "Estoy intentando"
  - S0006: "I'm speaking" → "Estoy hablando"

- **P16**: Estaba + gerund (I was [verb]-ing)
  - S0042: "I was trying" → "Estaba intentando"

**Same pattern structure, different tense marker**

### Category 3: Subjunctive Patterns (P10)

**Discovered through trigger + subjunctive form LEGOs:**

- S0007: "como pueda" (as I can - comparison subjunctive)
- S0011: "que hables" (you to speak - desire subjunctive)
- S0015: "después de que termines" (after you finish - temporal subjunctive)

**Pattern: Trigger word/phrase + verb in subjunctive mood**

---

## Integration with Basket Generation

Once patterns are identified, baskets can practice them with **new vocabulary**:

### P01 Basket Examples (S0001-S0050 vocabulary only)

**Pattern**: Quiero + infinitive

**Practice Phrases:**
```json
[
  "Quiero hablar español",           // reinforce with S0001 vocab
  "Quiero intentar ahora",           // reinforce with S0007 vocab
  "Quiero aprender algo nuevo",      // reinforce with S0002 vocab
  "Quiero adivinar la respuesta"     // reinforce with S0012 vocab
]
```

**Learner recognizes:** Same pattern (Quiero + infinitive), different verbs

### P02 Basket Examples

**Pattern**: Estoy + gerund

**Practice Phrases:**
```json
[
  "Estoy intentando aprender",       // S0002 vocab
  "Estoy hablando español",          // S0006 vocab
  "Estoy intentando recordar algo"   // mixed vocab
]
```

**Learner recognizes:** Same pattern (Estoy + gerund), different verbs

---

## The Complete Workflow

### 1. Extract LEGOs (Known Language First Mapping)
```
S0001: "I want" → "Quiero" ✓
S0001: "to speak" → "hablar" ✓
```

### 2. Identify Pattern (First Instance)
```
Pattern observed: "Quiero" + "hablar" (infinitive)
Mark as P01 introduction
```

### 3. Reinforce Pattern (Subsequent Seeds)
```
S0007: "I want" → "Quiero" ✓
S0007: "to try" → "intentar" ✓
Pattern: Same structure, different infinitive
Mark as P01 reinforcement
```

### 4. Generate Baskets (Pattern Practice)
```
Use P01 with any infinitive taught ≤ current seed
Learner practices: Quiero + [hablar|intentar|aprender|adivinar|...]
```

---

## Pattern Recognition Criteria

### Test 1: Slot Substitutability

**Can you swap vocabulary without changing structure?**

✅ **YES = It's a pattern**
```
Quiero hablar    (I want to speak)
Quiero intentar  (I want to try)
→ swap verb, structure unchanged = P01 pattern
```

❌ **NO = Not a pattern**
```
Quiero hablar    (I want to speak)
Hablo bien       (I speak well)
→ changed structure, not same pattern
```

### Test 2: Multiple Instances Exist

**Will this structure appear with different vocabulary 3+ times?**

✅ **YES = Worth identifying as pattern**
- "Quiero" + infinitive appears in S0001, S0007, S0012, S0015... (high ROI)

❌ **NO = Don't pattern-mark it**
- One-off construction (low ROI, adds cognitive load)

### Test 3: Learner Recognition

**Would learner say "I've seen this structure before!"?**

✅ **YES = Good pattern**
```
Estoy intentando aprender (I'm trying to learn)
Estoy intentando recordar (I'm trying to remember)
→ Learner: "Oh! Estoy + -ando/-iendo = I'm [verb]-ing"
```

---

## Summary

### Known Language First Mapping → Pattern Identification

1. **Extract LEGOs** using known language first (bidirectional sweep, chunk up)
2. **Observe structures** that recur across multiple seeds
3. **Identify INVARIANT** (what stays same) vs **VARIANT** (what changes)
4. **Mark patterns** at LEGO and seed level
5. **Use for baskets** (pattern + different vocabulary = practice)

### The Flow

```
LEGO Extraction              Pattern Identification         Basket Generation
───────────────              ──────────────────────         ─────────────────
S0001: Quiero + hablar   →   P01 introduced           →    Quiero hablar
S0007: Quiero + intentar →   P01 reinforced           →    Quiero intentar
S0012: Quiero + adivinar →   P01 mastered             →    Quiero aprender
                                                            Quiero practicar
                                                            ...
```

**Patterns are the SPINE.**
**Vocabulary is the FLESH.**
**LEGOs are the BUILDING BLOCKS.**

The known language first mapping extracts the LEGOs.
The patterns emerge from repeated LEGO structures.
The baskets practice patterns with varied vocabulary.

**Together:** Learners acquire language structure implicitly through pattern recognition.
