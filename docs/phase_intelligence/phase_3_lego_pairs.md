# AGENT PROMPT: Phase 3 LEGO Extraction (v6.0 - Bidirectional Sweep)

**Version**: 6.0 - Bidirectional Sweep Algorithm (2025-11-10)
**Status**: Production Ready
**Purpose**: Extract pedagogically-sound LEGO vocabulary units from translated seed pairs

---

## 🎯 YOUR MISSION

You are extracting LEGO vocabulary units from seed pairs. LEGOs are the atomic and molecular building blocks that learners will practice.

**Core Principle**: When a learner hears KNOWN → they produce exactly ONE TARGET (zero uncertainty)

**Critical**: This is achieved through a **bidirectional sweep algorithm** that ensures complete TARGET coverage.

---

## 🔄 THE BIDIRECTIONAL SWEEP ALGORITHM

### Overview

Extract LEGOs using THREE phases:
1. **Forward Sweep** (KNOWN order) - Learner's perspective
2. **Backward Sweep** (TARGET order) - Target language perspective
3. **Nested Extraction** - Dive into molecular LEGOs for smaller chunks

**Why bidirectional?**
- Forward sweep: Respects how learner chunks meaning (KNOWN language)
- Backward sweep: Captures target language particles, markers, word order
- Together: Complete coverage, no missed grammatical elements

---

## 📋 PHASE 1A: FORWARD SWEEP (KNOWN Order)

**Goal**: Find minimum-size FD chunks following KNOWN word order

**Process**:
```
Position 0 → end of KNOWN sentence:

1. Test word[pos] for FD compliance
   - Does this KNOWN chunk map to TARGET with zero uncertainty?

2. If FD FAILS:
   - Extend: word[pos..pos+1], word[pos..pos+2], etc.
   - Keep extending until FD PASSES

3. When FD PASSES:
   - Lock in this chunk (don't keep extending - we want minimum size!)
   - Check A/M classification
   - Move to next unmatched position

4. Repeat until end of sentence
```

**Example - Spanish S0006**:
```
Known: "I'm trying to remember a word"
Target: "Estoy intentando recordar una palabra"

Position 0:
  "I'm" → FAIL (estoy/soy ambiguous)
  "I'm trying" → "Estoy intentando" ✅ FD PASS (M) LOCK

Position 2:
  "to remember" → "recordar" ✅ FD PASS (A) LOCK

Position 3:
  "a" → FAIL (una/un ambiguous)
  "a word" → "una palabra" ✅ FD PASS (M) LOCK

Forward Result: [Estoy intentando] + [recordar] + [una palabra]
```

---

## 📋 PHASE 1B: BACKWARD SWEEP (TARGET Order)

**Goal**: Find minimum-size FD chunks following TARGET word order (catches particles/markers)

**Process**:
```
Position END → 0 of TARGET sentence:

1. Test word[pos] for FD compliance
   - Does this TARGET chunk map to KNOWN with zero uncertainty?

2. If FD FAILS:
   - Extend leftward: word[pos-1..pos], word[pos-2..pos], etc.
   - Keep extending until FD PASSES

3. When FD PASSES:
   - Lock in this chunk
   - Check A/M classification
   - Move to previous unmatched position

4. Repeat until start of sentence
```

**Example - Chinese S0013**:
```
Target: "你中文说得很好"
Known: "You speak Chinese very well"

From end:
  "好" ← "well" ✅ FD PASS (A) LOCK
  "很" ← "very" ✅ FD PASS (A) LOCK

Can also extract:
  "很好" ← "very well" ✅ FD PASS (M) LOCK

  "得" ← ??? (degree marker, no English equivalent) FAIL
  "说得很好" ← "speak very well" ✅ FD PASS (M) LOCK

  "中文" ← "Chinese" ✅ FD PASS (A) LOCK
  "你" ← "You" ✅ FD PASS (A) LOCK

Backward Result: Catches "得" particle via "说得很好" molecular LEGO!
```

---

## 📋 PHASE 1C: MERGE & VERIFY

**Merge both sweep results**:
```
1. Union of Forward Set and Backward Set
2. Remove exact duplicates
3. Keep overlapping LEGOs (different granularities are useful!)
4. Verify complete tiling:
   - All TARGET words covered
   - No gaps
   - No orphaned particles/markers
```

**Example - Spanish S0011**:
```
Target: "Me gustaría poder hablar después de que termines"
Known: "I'd like to be able to speak after you finish"

Forward sweep:
- "Me gustaría" (M)
- "poder" (A)
- "hablar" (A)
- "después de que termines" (M)

Backward sweep:
- "Me gustaría" (M) [duplicate, keep one]
- "poder" (A) [duplicate, keep one]
- "hablar" (A) [duplicate, keep one]
- "después de que termines" (M) [duplicate, keep one]
- "que termines" (M) [NEW - subjunctive clause!]
- "termines" (A) [NEW - verb form!]

Merged: Both sweeps agree + backward adds subjunctive details
```

---

## 🔍 THE FD TEST (Functional Determinism)

**The ONE Question**: When learner hears KNOWN → is there ANY uncertainty about expected TARGET response?

### FD FAILS if ANY of these are true:

**1. Semantic Uncertainty** - Multiple possible TARGETs:
- "that" → "que" OR "ese" OR "eso"? ❌ FAIL
- "to" → "a" OR "para" OR infinitive marker? ❌ FAIL

**2. FCFS Collision** - Already learned a different TARGET for same KNOWN:
- Registry has: "I want" → "quiero" (S0001)
- Current seed: "I want" → "deseo" ❌ COLLISION!
- Solution: Chunk up to "I really want" → "deseo" ✅ (different KNOWN)
- **CHECK REGISTRY FIRST!**

**CRITICAL**: A collision requires **BOTH target AND known to match**:
- Registry: "hablar" = "to speak" (S0001)
- Current: "hablar" = "speaking" ✅ **NOT a collision** (different KNOWN - extract as NEW LEGO!)
- Registry: "quiero" = "I want" (S0001)
- Current: "deseo" = "I want" ❌ **IS a collision** (same KNOWN, different TARGET)

**3. Syntactic Uncertainty** - Can't produce correct form/syntax without context:
- "que" alone → "that/which/than/what"? ❌ FAIL
- "hables" alone → Wrong mood without "que" ❌ FAIL
- "estado" alone → "estoy" or "he estado"? ❌ FAIL (tense ambiguous)
- "得" alone → Degree marker, meaningless standalone ❌ FAIL

### FD PASSES:
✅ **Zero uncertainty** → Learner can reliably produce correct TARGET

**Examples**:
- ✅ "quiero" = "I want" (unambiguous)
- ✅ "que hables" = "you to speak" (includes mood context)
- ✅ "说得很好" = "speak very well" (includes degree marker)
- ✅ "después de que" = "after" (includes subjunctive trigger)

---

## 🏷️ ATOMIC vs MOLECULAR CLASSIFICATION

**Simple rule**:
- **Multi-word in BOTH languages** → Molecular (M)
- **Otherwise** → Atomic (A)

**Examples**:

Atomic (A):
- "quiero" (single) = "I want" (multi) → A
- "recordar" (single) = "to remember" (multi) → A
- "我" (single) = "I" (single) → A

Molecular (M):
- "Estoy intentando" (multi) = "I'm trying" (multi) → M
- "una palabra" (multi) = "a word" (multi) → M
- "说得很好" (multi) = "speak very well" (multi) → M

**Why this matters**:
- A-LEGOs: Reusable vocabulary (flexible across contexts)
- M-LEGOs: Syntax patterns, constructions, idioms (target language structure)

---

## 📋 PHASE 2: EXTRACT NESTED LEGOs

**Goal**: Dive into Molecular LEGOs to extract smaller FD chunks

**Process**:
```
For each Molecular LEGO from Phase 1:

1. Look at the TARGET substring
2. Test all possible sub-chunks for FD compliance
3. Extract any that pass (both A and M types)
4. These provide overlapping coverage at multiple granularities
```

**Example - Chinese S0008**:
```
Molecular from Phase 1: "我要试着" = "I'm going to try"

Dive into TARGET "我要试着":
- "我" = "I" ✅ FD PASS (A) Extract
- "要" = ambiguous ❌ FD FAIL
- "我要" = "I'm going to" ✅ FD PASS (M) Extract
- "试" = "try" ✅ FD PASS (A) Extract
- "着" = aspect marker ❌ FD FAIL
- "试着" = "try" (progressive) ✅ FD PASS (M) Extract

Nested LEGOs extracted:
- "我" (A)
- "我要" (M)
- "试" (A)
- "试着" (M)

All are FD compliant, all are useful for recombination!
```

**Why overlapping coverage?**
- "我" teaches basic pronoun
- "我要" teaches future intention pattern
- "我要试着" teaches full construction
- Learner gets multiple entry points for practice

---

## 🔧 COMPONENTIZATION (M-LEGOs Only)

**Every Molecular LEGO MUST include components array**

**Format**:
```json
{
  "type": "M",
  "target": "说得很好",
  "known": "speak very well",
  "components": [
    ["说", "speak"],
    ["得", "(degree marker)"],
    ["很", "very"],
    ["好", "well"]
  ]
}
```

**Critical Rules**:

1. **TARGET word order** - Components follow TARGET language sequence
2. **ALL words included** - Every word in target must appear in components
3. **Literal translations** - Show actual meaning, not semantic role

**Examples**:

✅ CORRECT:
```json
{
  "target": "después de que",
  "known": "after",
  "components": [
    ["después", "after"],
    ["de", "of"],
    ["que", "that"]
  ]
}
```

❌ WRONG (missing words):
```json
{
  "target": "después de que",
  "components": [
    ["después", "after"],
    ["que", "that"]
  ]
}
// Missing "de"!
```

❌ WRONG (wrong order):
```json
{
  "target": "中文说得很好",
  "components": [
    ["说", "speak"],
    ["中文", "Chinese"],
    ["得", "得"],
    ["很好", "very well"]
  ]
}
// Should follow TARGET order: 中文, 说, 得, 很好
```

---

## 📤 PHASE 3: ORDER LEGOs FOR OUTPUT

**Pedagogical ordering** - Atomic building blocks before molecular patterns

**Order**:
1. **All Atomic LEGOs** (in sentence order)
2. **All Molecular LEGOs** (in sentence order)

**Example - Chinese S0008**:
```json
{
  "seed_id": "S0008",
  "legos": [
    // ATOMIC LEGOs first
    {"type": "A", "target": "我", "known": "I"},
    {"type": "A", "target": "试", "known": "try"},
    {"type": "A", "target": "解释", "known": "to explain"},
    {"type": "A", "target": "意思", "known": "meaning"},

    // MOLECULAR LEGOs second
    {"type": "M", "target": "我要", "known": "I'm going to", "components": [...]},
    {"type": "M", "target": "试着", "known": "try", "components": [...]},
    {"type": "M", "target": "我要试着", "known": "I'm going to try", "components": [...]},
    {"type": "M", "target": "我的", "known": "my", "components": [...]},
    {"type": "M", "target": "我的意思", "known": "what I mean", "components": [...]}
  ]
}
```

**Why this order?**
- Learner sees individual words first
- Then sees how they combine
- Natural learning progression: vocabulary → patterns

---

## 📤 OUTPUT FORMAT

```json
{
  "agent_id": 1,
  "seed_range": "S0001-S0020",
  "extracted_at": "2025-11-10T...",
  "seeds": {
    "S0001": {
      "seed_id": "S0001",
      "seed_pair": {
        "target": "Quiero hablar español contigo ahora",
        "known": "I want to speak Spanish with you now"
      },
      "legos": [
        {
          "provisional_id": "PROV_S0001_01",
          "type": "A",
          "target": "quiero",
          "known": "I want",
          "new": true
        },
        {
          "provisional_id": "PROV_S0001_02",
          "type": "M",
          "target": "quiero hablar",
          "known": "I want to speak",
          "new": true,
          "components": [
            ["quiero", "I want"],
            ["hablar", "to speak"]
          ]
        },
        {
          "id": "S0002L03",
          "type": "A",
          "target": "español",
          "known": "Spanish",
          "ref": "S0002",
          "new": false
        }
      ]
    }
  }
}
```

**Field Requirements**:
- `provisional_id` OR `id` (if reference)
- `type`: "A" or "M"
- `target`: Target language text
- `known`: Known language text
- `new`: true (new LEGO) or false (reference)
- `ref`: Seed ID if reference (e.g., "S0002")
- `components`: Array of [target, known] pairs for M-types (**ALL WORDS, TARGET ORDER**)

---

## ✅ COMPLETE WORKFLOW EXAMPLE

**Seed**: Spanish S0011
```
Target: "Me gustaría poder hablar después de que termines."
Known: "I'd like to be able to speak after you finish."
```

### Phase 1A - Forward Sweep:
```
"I'd" → FAIL
"I'd like" → "Me gustaría" ✅ (M) LOCK

"to" → FAIL
"to be able" → "poder" ✅ (A) LOCK

"to" → FAIL
"to speak" → "hablar" ✅ (A) LOCK

"after" → FAIL
"after you finish" → "después de que termines" ✅ (M) LOCK

Forward: [Me gustaría] [poder] [hablar] [después de que termines]
```

### Phase 1B - Backward Sweep:
```
"termines" ← FAIL (subjunctive needs trigger)
"que termines" ← "you finish" ✅ (M) LOCK

"de" ← FAIL (preposition alone)
"de que termines" ← FAIL
"después de que termines" ← "after you finish" ✅ (M) LOCK

"hablar" ← "speak" ✅ (A) LOCK
"poder" ← "be able" ✅ (A) LOCK

"gustaría" ← FAIL (conditional form needs "me")
"Me gustaría" ← "I'd like" ✅ (M) LOCK

Backward: [Me gustaría] [poder] [hablar] [después de que termines] [que termines]
```

### Phase 1C - Merge:
```
Union of Forward and Backward:
- Me gustaría (M)
- poder (A)
- hablar (A)
- después de que termines (M)
- que termines (M) [NEW from backward!]

Tiling check: Me gustaría + poder + hablar + después de que termines ✅
All TARGET words covered: Me gustaría poder hablar después de que termines ✅
```

### Phase 2 - Nested Extraction:

**Dive into "Me gustaría"**:
- "Me" = "me" ✅ (A)
- "gustaría" = "would like" ✅ (A)

**Dive into "después de que termines"**:
- "después" = "after" ✅ (A)
- "después de" = "after" ✅ (M)
- "después de que" = "after" ✅ (M)
- "termines" = "finish" ✅ (A)
- "que termines" = "you finish" ✅ (M) [already have from backward]

**Dive into "que termines"**:
- "que" = FAIL (ambiguous)
- "termines" = "finish" ✅ (A)

### Phase 3 - Order LEGOs:

**Atomic LEGOs (sentence order)**:
1. Me (A) = me
2. gustaría (A) = would like
3. poder (A) = be able
4. hablar (A) = to speak
5. después (A) = after
6. termines (A) = finish

**Molecular LEGOs (sentence order)**:
7. Me gustaría (M) = I'd like
8. después de (M) = after
9. después de que (M) = after
10. que termines (M) = you finish
11. después de que termines (M) = after you finish

**Final output**: Rich library with complete coverage and overlapping granularity!

---

## 🚨 COMMON MISTAKES TO AVOID

### ❌ Mistake 1: Skipping Backward Sweep

**BAD** (Forward only):
```
"speak very well" → 说 + 很 + 好
Missing: 得 (degree marker)
```

**GOOD** (Bidirectional):
```
Forward: 说, 很, 好
Backward: 说得很好
Merged: Catches 得 via molecular LEGO!
```

### ❌ Mistake 2: Wrong Component Order

**BAD**:
```json
{
  "target": "中文说得很好",
  "components": [
    ["说", "speak"],
    ["中文", "Chinese"],
    ["得", "得"],
    ["很好", "very well"]
  ]
}
```

**GOOD** (TARGET order):
```json
{
  "target": "中文说得很好",
  "components": [
    ["中文", "Chinese"],
    ["说", "speak"],
    ["得", "(degree marker)"],
    ["很好", "very well"]
  ]
}
```

### ❌ Mistake 3: Missing Components

**BAD**:
```json
{
  "target": "después de que",
  "components": [
    ["después", "after"],
    ["que", "that"]
  ]
}
// Missing "de"!
```

**GOOD**:
```json
{
  "target": "después de que",
  "components": [
    ["después", "after"],
    ["de", "of"],
    ["que", "that"]
  ]
}
```

### ❌ Mistake 4: FCFS Collision

**BAD**:
```
Registry: "I want" → "quiero" (S0001)
Current: "I want" → "deseo" (S0050)
❌ COLLISION - can't teach two TARGETs for same KNOWN!
```

**GOOD**:
```
Registry: "I want" → "quiero" (S0001)
Current: "I really want" → "deseo" (S0050)
✅ Different KNOWN phrase, no collision
```

---

## 🎯 QUALITY CHECKLIST

Before submitting, verify:

**Complete Tiling**:
- [ ] Every seed reconstructs perfectly from Phase 1 LEGOs
- [ ] All TARGET words covered (including particles, markers)
- [ ] No gaps, no orphaned words

**FD Compliance**:
- [ ] Every LEGO passes FD test (zero uncertainty)
- [ ] No ambiguous standalone words
- [ ] No FCFS collisions (checked registry)

**Bidirectional Coverage**:
- [ ] Forward sweep completed
- [ ] Backward sweep completed
- [ ] Both merged successfully

**Componentization**:
- [ ] ALL M-type LEGOs have components
- [ ] Components account for ALL WORDS
- [ ] Components follow TARGET order
- [ ] Literal translations used

**Ordering**:
- [ ] Atomic LEGOs listed first
- [ ] Molecular LEGOs listed second
- [ ] Both in sentence order

**Registry Check**:
- [ ] Checked existing LEGOs before marking new
- [ ] Referenced LEGOs have proper `id` and `ref`
- [ ] No duplicates

---

## 📚 WORKED EXAMPLES

### Example 1: Chinese S0008 (Complete)

**Seed**:
```
Target: 我要试着解释我的意思
Known: I'm going to try to explain what I mean.
```

**Phase 1A - Forward**:
```
"I'm going to try" → "我要试着" ✅ (M)
"to explain" → "解释" ✅ (A)
"what I mean" → "我的意思" ✅ (M)

Tiling: [我要试着] + [解释] + [我的意思] ✅
```

**Phase 1B - Backward**:
```
"意思" ← "meaning" ✅ (A)
"我的意思" ← "what I mean" ✅ (M)
"解释" ← "explain" ✅ (A)
"试着" ← "try" ✅ (M)
"试" ← "try" ✅ (A)
"要" ← FAIL
"我要" ← "going to" ✅ (M)
"我要试着" ← "I'm going to try" ✅ (M)
"我" ← "I" ✅ (A)
```

**Phase 1C - Merge**:
```
Atomic: 我, 试, 解释, 意思
Molecular: 我要, 试着, 我要试着, 我的意思
```

**Phase 2 - Nested** (already extracted in backward sweep):
```
From "我要试着": 我, 我要, 试, 试着
From "我的意思": 我, 意思, 我的
```

**Phase 3 - Final Order**:
```json
{
  "legos": [
    {"type": "A", "target": "我", "known": "I"},
    {"type": "A", "target": "试", "known": "try"},
    {"type": "A", "target": "解释", "known": "to explain"},
    {"type": "A", "target": "意思", "known": "meaning"},

    {"type": "M", "target": "我要", "known": "I'm going to",
     "components": [["我", "I"], ["要", "going to"]]},

    {"type": "M", "target": "试着", "known": "try",
     "components": [["试", "try"], ["着", "(progressive)"]]},

    {"type": "M", "target": "我要试着", "known": "I'm going to try",
     "components": [["我", "I"], ["要", "going to"], ["试着", "try"]]},

    {"type": "M", "target": "我的", "known": "my",
     "components": [["我", "I"], ["的", "'s"]]},

    {"type": "M", "target": "我的意思", "known": "what I mean",
     "components": [["我", "I"], ["的", "'s"], ["意思", "meaning"]]}
  ]
}
```

---

## 🎓 SUCCESS METRICS

**Target for Production**:
- ✅ 100% tiling success (all seeds reconstruct)
- ✅ Zero FD violations
- ✅ Complete TARGET coverage (no missed particles)
- ✅ Rich overlapping library (multiple granularities)
- ✅ Complete componentization (ALL words)
- ✅ Zero FCFS collisions

**Quality > Speed**: Take time to think through each seed carefully!

---

**Version History**:
- v6.0 (2025-11-10): Bidirectional sweep algorithm + complete TARGET coverage
- v5.0 (2025-11-09): Ultimate edition with S0101-S0200 learnings
- v4.0: Radical simplification (One Rule principle)

**Status**: ✅ Production Ready with Complete Coverage Guarantee
