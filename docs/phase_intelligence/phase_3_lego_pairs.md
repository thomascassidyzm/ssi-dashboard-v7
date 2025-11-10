# AGENT PROMPT: Phase 3 LEGO Extraction (ULTIMATE v5.0)

**Version**: 5.0 - Ultimate Edition (2025-11-09)
**Status**: Production Ready - Incorporates S0101-S0200 Test Learnings
**Purpose**: Extract pedagogically-sound LEGO vocabulary units from translated seed pairs

---

## 🎯 YOUR MISSION

You are extracting LEGO vocabulary units from seed pairs. LEGOs are the atomic and molecular building blocks that learners will practice.

**Core Principle**: When a learner hears KNOWN → they produce exactly ONE TARGET (zero uncertainty)

---

## 🚨 THE THREE ABSOLUTES

### 1. START FROM KNOWN SEMANTICS

**Break down the KNOWN language first** - how does a native speaker chunk this meaning?

```
Known: "I want to speak Spanish with you now"
Natural chunks: "I want" | "to speak" | "Spanish" | "with you" | "now"
```

Why? The learner THINKS in their native language. Respect how their brain chunks meaning.

### 2. PROVIDE BOTH ATOMIC AND MOLECULAR

**Overlap is GOOD** - multiple reconstruction paths teach better:

- **Atomic**: Maximum flexibility (individual semantic units)
- **Molecular**: Show target language patterns (common combinations)

```
Example:
Atomic: 我 (I), 想 (want), 说 (to speak)
Molecular: 我想 (I want)
Both valid: (我 + 想 + 说) OR (我想 + 说) ✓
```

### 3. VERIFY COMPLETE TILING

**The seed MUST reconstruct perfectly from LEGOs**

```
Target: "Quiero hablar español"
LEGOs: quiero + hablar + español
Reconstruction: "Quiero hablar español" ✅
```

---

## 📋 THE EXTRACTION PROCESS

### STEP 1: CHUNK THE KNOWN (Bidirectional Sweep)

Start from KNOWN language and chunk semantically:

```
Known: "I'm enjoying finding out more about this language"

Forward sweep:
"I'm enjoying" | "finding out" | "more" | "about" | "this" | "language"

Check: Do these chunks make sense to a native speaker? ✅
```

### STEP 2: MAP TO TARGET

Map each KNOWN chunk to TARGET language:

```
"I'm enjoying" → "estoy disfrutando"
"finding out" → "descubrir"
"more" → "más"
"about" → "sobre"
"this" → "este"
"language" → "lenguaje"
```

### STEP 3: APPLY FD TEST (Functional Determinism)

**The ONE Question**: When learner hears KNOWN → is there ANY uncertainty about expected response?

❌ **FAIL (has uncertainty) if ANY are true:**

1. **Semantic uncertainty** - Multiple possible TARGETs:
   - "that" → "que" OR "ese" OR "eso"? ❌
   - "to" → "a" OR "para" OR infinitive? ❌

2. **FCFS collision** - Already learned a simpler TARGET:
   - "a entender" = "to understand" but already knows "entender" = "to understand" ❌
   - "soy" = "I am" but already knows "estoy" = "I am" (FCFS!) ❌
   - **CHECK REGISTRY FIRST!**

3. **Syntactic uncertainty** - Can't produce correct form/syntax:
   - "que" alone → "that/which/than/what"? ❌
   - "hables" alone → "hablas" or "hables"? (wrong mood without "que") ❌
   - "estado" alone → "estoy" or "he estado"? (wrong tense without "he") ❌
   - "pensar" alone → "pensar en" or "pensar de"? (wrong preposition) ❌

**Why uncertainty = FD violation:**
- Learner can't reliably reconstruct valid syntax from LEGO recombination
- Multiple possible responses → Creates hesitation/errors
- If context determines form/meaning → Keep context together

✅ **PASS (zero uncertainty)** → LEGO is Functionally Deterministic

**Examples:**
- ✅ "quiero" + "que hables" → Zero uncertainty, valid reconstruction
- ❌ "quiero que" + "hables" → Uncertainty about mood, breaks reconstruction
- ✅ "he estado" → Zero uncertainty, atomic for tense
- ❌ "he" + "estado" → Uncertainty about tense construction

### STEP 4: FIX FAILURES → CHUNK UP

**If FD test fails → Make it BIGGER**

```
❌ "que" = "that" [fails test #2 - ambiguous]
✅ "que es" = "that it is" [passes - context makes it deterministic]

❌ "a entender" = "to understand" [fails test #1 - collision with "entender"]
✅ "empezar a entender" = "to start to understand" [passes]
```

### STEP 5: CHECK FCFS REGISTRY

**Critical**: Before marking any LEGO as NEW, check the existing LEGO registry!

```json
Registry shows:
- "I am" → "estoy" (S0002) [FCFS!]

Now processing S0150: "Soy profesor" = "I am a teacher"

❌ "soy" = "I am" [COLLISION with estoy]
✅ "soy profesor" = "I am a teacher" [No collision - wrapped larger]
```

### STEP 6: ADD BOTH ATOMIC AND MOLECULAR

Don't just extract the minimum - provide learning flexibility:

```
Seed: "Quiero hablar español"

Extract:
1. "quiero" (A) - I want
2. "hablar" (A) - to speak
3. "español" (A) - Spanish
4. "quiero hablar" (M) - I want to speak [BONUS - common verb phrase]
5. "hablar español" (M) - speak Spanish [BONUS - common object phrase]

All valid tilings:
- quiero + hablar + español
- quiero hablar + español
- quiero + hablar español
```

### STEP 7: COMPONENTIZE ALL M-TYPES

**Every molecular LEGO MUST show ALL WORDS in components**

```json
{
  "type": "M",
  "target": "estoy intentando",
  "known": "I'm trying",
  "components": [
    ["estoy", "I am"],
    ["intentando", "trying"]
  ]
}
```

**Critical**: Components use LITERAL translations, not semantic roles:

```json
✅ CORRECT:
["para", "in order to"] ← shows purpose construction

❌ WRONG:
["para", "to"] ← hides the construction
```

---

## 🔧 ATOMIC vs MOLECULAR CLASSIFICATION

### Atomic (A)
- Single word
- Unambiguous standalone
- 1:1 mapping
- Reusable across many seeds

```json
{"type": "A", "target": "quiero", "known": "I want"}
```

### Molecular (M)
- Multi-word OR
- Pattern/construction OR
- Would be ambiguous if split

```json
{"type": "M", "target": "estoy intentando", "known": "I'm trying"}
```

**Rule**: When in doubt → M (better to over-chunk than under-chunk)

---

## 📤 OUTPUT FORMAT

```json
{
  "agent_id": 1,
  "seed_range": "S0001-S0070",
  "extracted_at": "2025-11-09T...",
  "seeds": [
    {
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
          "type": "A",
          "target": "hablar",
          "known": "to speak",
          "new": true
        },
        {
          "id": "S0023L02",
          "type": "A",
          "target": "más",
          "known": "more",
          "ref": "S0023",
          "new": false
        },
        {
          "provisional_id": "PROV_S0001_03",
          "type": "M",
          "target": "estoy intentando",
          "known": "I'm trying",
          "new": true,
          "components": [
            ["estoy", "I am"],
            ["intentando", "trying"]
          ]
        }
      ]
    }
  ]
}
```

**Field Requirements:**
- `provisional_id` OR `id` (if reference)
- `type`: "A" or "M"
- `target`: Target language text
- `known`: Known language text
- `new`: true (new LEGO) or false (reference)
- `ref`: Seed ID if reference (e.g., "S0023")
- `components`: Array of [target, known] pairs for M-types (**ALL WORDS**)

---

## ✅ QUALITY CHECKLIST

Before submitting, verify:

**Complete Tiling:**
- [ ] Every seed reconstructs perfectly from LEGOs
- [ ] No gaps, no extra words

**FD Compliance:**
- [ ] No ambiguous standalone words (que, de, a, en alone)
- [ ] No FCFS collisions (checked registry)
- [ ] All chunks deterministic (Known → exactly ONE Target)

**Componentization:**
- [ ] ALL M-type LEGOs have components
- [ ] Components account for ALL WORDS
- [ ] Components use literal translations

**Registry Check:**
- [ ] Checked existing LEGOs before marking new
- [ ] Referenced LEGOs have proper `id` and `ref`
- [ ] No duplicates

**A/M Balance:**
- [ ] Atomic: ~40-60% (single words, unambiguous)
- [ ] Molecular: ~40-60% (multi-word, patterns)

---

## 🎓 EXAMPLES FROM PRODUCTION

### Example 1: S0101 (NEW + REFERENCE MIX)

**Seed**: "Estoy disfrutando descubrir más sobre este lenguaje"
**Known**: "I'm enjoying finding out more about this language"

**Extraction:**

```json
{
  "seed_id": "S0101",
  "legos": [
    {
      "provisional_id": "PROV_S0101_01",
      "type": "M",
      "target": "estoy disfrutando",
      "known": "I'm enjoying",
      "new": true,
      "components": [
        ["estoy", "I am"],
        ["disfrutando", "enjoying"]
      ]
    },
    {
      "provisional_id": "PROV_S0101_02",
      "type": "A",
      "target": "descubrir",
      "known": "to find out",
      "new": true
    },
    {
      "id": "S0023L02",
      "type": "A",
      "target": "más",
      "known": "more",
      "ref": "S0023",
      "new": false
    },
    {
      "provisional_id": "PROV_S0101_03",
      "type": "A",
      "target": "sobre",
      "known": "about",
      "new": true
    },
    {
      "provisional_id": "PROV_S0101_04",
      "type": "A",
      "target": "este",
      "known": "this",
      "new": true
    },
    {
      "provisional_id": "PROV_S0101_05",
      "type": "A",
      "target": "lenguaje",
      "known": "language",
      "new": true
    }
  ]
}
```

**Tiling Check**: estoy disfrutando + descubrir + más + sobre + este + lenguaje ✅

---

### Example 2: FCFS Collision Avoided

**Registry shows:**
- "I am" → "estoy" (S0002)

**Now processing S0150:**
- Seed: "Soy profesor" = "I am a teacher"

**Thinking:**
```
Option 1: "soy" = "I am" ❌ COLLISION with estoy (FCFS violation!)
Option 2: "soy profesor" = "I am a teacher" ✅ No collision
```

**Correct extraction:**
```json
{
  "provisional_id": "PROV_S0150_01",
  "type": "M",
  "target": "soy profesor",
  "known": "I am a teacher",
  "new": true,
  "components": [
    ["soy", "I am"],
    ["profesor", "teacher"]
  ]
}
```

---

### Example 3: Ambiguous Word Chunked Up

**Seed**: "Mejor que tú" = "Better than you"

**Thinking:**
```
"que" alone = "that/what/than/who/which" ❌ FAILS FD test #2
"mejor que" = "better than" ✅ PASSES (deterministic in context)
```

**Correct extraction:**
```json
{
  "provisional_id": "PROV_S0XXX_01",
  "type": "M",
  "target": "mejor que",
  "known": "better than",
  "new": true,
  "components": [
    ["mejor", "better"],
    ["que", "than"]
  ]
}
```

---

## 🚨 COMMON MISTAKES TO AVOID

### ❌ Mistake 1: Over-Atomization

```json
BAD:
{"target": "después", "known": "after"}
{"target": "de", "known": "of"}
{"target": "que", "known": "that"}

GOOD:
{"target": "después de que", "known": "after", "type": "M"}
```

### ❌ Mistake 1.5: Violating FD Type 3 - Incomplete Context

**Problem**: Creating LEGOs that can't reconstruct valid syntax when recombined

```json
BAD - Breaks grammatical dependency (FD Type 3 violation):
Seed: "Quiero que hables español" = "I want you to speak Spanish"

{"target": "quiero que", "known": "I want that"} ← FD VIOLATION!
{"target": "hables", "known": "you speak"} ← FD VIOLATION!

WHY WRONG:
- "que" needs "hables" to determine subjunctive mood
- "hables" needs "que" to know it's subjunctive not indicative
- When learner recombines: "quiero" + "que" + "hables" → might produce "quiero que hablas" ❌

GOOD Option 1 (respect grammatical boundary):
{"target": "quiero", "known": "I want", "type": "A"}
{"target": "que hables", "known": "you to speak", "type": "M"}

GOOD Option 2 (entire construction):
{"target": "quiero que hables", "known": "I want you to speak", "type": "M"}
```

**Remember**: These aren't "grammar rules" - they're FD violations (Type 3: Incomplete Context)
- If form/syntax depends on context → Keep context together
- If you can't reliably reconstruct from LEGOs → You violated FD

### ❌ Mistake 2: Missing Components

```json
BAD:
{
  "type": "M",
  "target": "estoy intentando",
  "components": [["estoy", "I am"]] ← Missing "intentando"!
}

GOOD:
{
  "type": "M",
  "target": "estoy intentando",
  "components": [
    ["estoy", "I am"],
    ["intentando", "trying"]
  ]
}
```

### ❌ Mistake 3: Ignoring FCFS Registry

```json
BAD:
{"target": "quiero", "known": "I want", "new": true} ← Already exists!

GOOD:
{"id": "S0001L01", "target": "quiero", "known": "I want", "ref": "S0001", "new": false}
```

### ❌ Mistake 4: Incomplete Tiling

```json
Seed: "Quiero hablar español contigo"
LEGOs: quiero + hablar + español ← Missing "contigo"! ❌

Correct: quiero + hablar + español + contigo ✅
```

---

## 🎯 SUCCESS METRICS

**From S0101-S0200 Test Run:**
- ✅ 100% complete tiling (all seeds reconstruct)
- ✅ 44% reuse rate (good registry checking)
- ✅ ~7 minutes for 100 seeds (10 parallel agents)
- ✅ FD compliance maintained
- ⚠️ A/M balance varied (ensure 40-60% each)

**Target for Full Course (668 seeds):**
- 100% tiling success rate
- 40-60% atomic, 40-60% molecular
- 30-50% reuse rate from prior seeds
- Zero FD violations
- Complete componentization

---

## 🔄 EXTENDED THINKING PROTOCOL

Use `<thinking>` tags for EVERY seed:

```
<thinking>
SEED: "Estoy intentando aprender español"
KNOWN: "I'm trying to learn Spanish"

STEP 1: CHUNK KNOWN
"I'm trying" | "to learn" | "Spanish"

STEP 2: MAP TO TARGET
"I'm trying" → "estoy intentando"
"to learn" → "aprender"
"Spanish" → "español"

STEP 3: FD TEST
- "estoy intentando" = "I'm trying" ✓ (passes all tests)
- "aprender" = "to learn" ✓ (passes)
- "español" = "Spanish" ✓ (CHECK REGISTRY → S0001L03 exists!)

STEP 4: CLASSIFY
- "estoy intentando" → M (multi-word pattern)
- "aprender" → A (single word)
- "español" → REFERENCE (already exists)

STEP 5: COMPONENTIZE
"estoy intentando" → [["estoy", "I am"], ["intentando", "trying"]]

STEP 6: TILING
estoy intentando + aprender + español = "Estoy intentando aprender español" ✅

OUTPUT READY
</thinking>
```

---

**Target Time per Seed**: 1-2 minutes with extended thinking
**Quality over Speed**: Better to take time and get it right!

---

## 📚 REFERENCE

**Phase Intelligence**: `/docs/phase_intelligence/phase_3_lego_pairs.md`
**Test Results**: `/phase3_test_s0101_s0200/EXTRACTION_SUMMARY.md`
**Registry Format**: `/phase3_test_s0101_s0200/templates/lego_registry_s0001_s0100.json`

---

**Version History:**
- v5.0 (2025-11-09): Ultimate edition with S0101-S0200 learnings
- v4.0.2: Readable JSON + sorting
- v4.0: Radical simplification (One Rule principle)
- v3.6: FD direction corrected

**Status**: ✅ Production Ready for Full 668-Seed Course
