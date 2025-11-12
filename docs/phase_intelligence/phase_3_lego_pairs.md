# AGENT PROMPT: Phase 3 LEGO Extraction (v6.3)

**Version**: 6.3 - Pragmatic FD Edition (2025-11-12)
**Status**: Production Ready - Maximum Useful Granularity
**Purpose**: Extract pedagogically-sound LEGO vocabulary units from translated seed pairs

---

## 🎯 CORE PRINCIPLE

When a learner hears KNOWN → they produce exactly ONE TARGET (zero uncertainty)

**Assumption**: Phase 1 curation ensures no FD violations exist between different seed pairs. If the same KNOWN phrase appears with different TARGET phrases across seeds, that's a Phase 1 error caught by Phase 2 collision detection.

---

## 🚨 THE THREE RULES

### 1. START FROM KNOWN SEMANTICS

Break down the KNOWN language first - how does a native speaker chunk this meaning?

```
Known: "I want to speak Spanish with you now"
Natural chunks: "I want" | "to speak" | "Spanish" | "with you" | "now"
```

Why? The learner THINKS in their native language.

### 2. EXTRACT MAXIMUM TILING SET (Most Granular FD-Compliant Chunks)

**Forward Sweep (KNOWN → TARGET):**
- Process left to right
- Find the smallest chunk that passes FD test
- LOCK it, don't extend further (maximize granularity = maximize reusability)

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

**A-type (Atomic)**: Single unit, no componentization needed
- Example: "quiero" / "I want", "por qué" / "why", "con" / "with"

**M-type (Molecular)**: Multi-word unit, needs components array to show word-by-word mapping
- Example: "voy a" / "I'm going to" → components: [["voy", "I go"], ["a", "to"]]

**When to use M-type:**
1. **FD requires it**: Can't split without ambiguity
2. **Pattern teaching**: Non-obvious construction (like gerund → infinitive)
3. **Pragmatic FD**: Can split technically, but shouldn't pedagogically

**Key principle**: Extract the MAXIMUM USEFUL tiling set. Each chunk must:
- Pass FD test (zero uncertainty KNOWN → TARGET)
- Be capable of generating meaningful practice phrases

**Pragmatic FD Heuristic:**

Even if both chunks pass FD independently, prefer M-type if splitting creates pedagogically weak chunks:

✅ **Keep paired (generally):**
- **Pronouns + verbs**: "he wants" / "él quiere"
  - Why: "he" alone can't generate practice; "wants" needs subject agreement
- **Articles + nouns**: "the house" / "la casa"
  - Why: "the" alone is meaningless without noun

✅ **Can split:**
- **Prepositions**: "with" / "con" is useful standalone
- **Adverbs**: "quickly" / "rápidamente" is useful standalone
- **Content words**: "to speak" + "Spanish" both generate practice

**The test**: "Would a learner practice this chunk in isolation and generate 5+ meaningful phrases?"
- If NO → keep paired with adjacent chunk (M-type)
- If YES → maximum granularity achieved

**Remember**: These are HEURISTICS, not rigid rules. Languages have exceptions. Use judgment.

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

3. ADD COMPONENTS TO M-TYPES:
   for each M-type LEGO:
     add components array showing word-by-word literal mapping
     (for learner transparency - NOT for extracting more LEGOs)

4. VERIFY TILING:
   reconstruct TARGET from LEGOs
   if fails: fix extraction

5. FD VALIDATION & MERGE:
   for each LEGO in extraction order:
     TEST: Does KNOWN → TARGET pass FD with zero uncertainty?

     IF FAILS (marked forms like subjunctive without trigger):
       Option A: Merge with PREVIOUS LEGO in seed
       Option B: Merge with NEXT LEGO in seed
       Choose option that creates FD-compliant LEGO
       Update components array for merged M-type

     EXAMPLE:
       "puedas" / "you can" → FAILS FD (puedes/puedas ambiguous)
       Previous LEGO: "tan pronto como" / "as soon as"
       MERGE → "tan pronto como puedas" / "as soon as you can" ✅

     CLUE: If TARGET has marked form (subjunctive: -as/-es/-an/-en endings,
           conditional: -ría endings), check if KNOWN includes trigger context

6. MARK ALL AS NEW:
   for each extracted LEGO:
     mark as new: true
   (Deduplication happens later in Phase 3.5 script)
```

---

## 📤 OUTPUT FORMAT

```json
{
  "version": "6.0",
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": ["I want to speak Spanish", "Quiero hablar español"],
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
          "target": "aprender",
          "known": "to learn",
          "new": true
        }
      ]
    },
    {
      "seed_id": "S0003",
      "seed_pair": ["I speak Spanish now", "Hablo español ahora"],
      "legos": [
        {
          "id": "S0003L01",
          "type": "A",
          "target": "hablo",
          "known": "I speak",
          "new": true
        },
        {
          "id": "S0003L02",
          "type": "A",
          "target": "español",
          "known": "Spanish",
          "new": true
        },
        {
          "id": "S0003L03",
          "type": "A",
          "target": "ahora",
          "known": "now",
          "new": true
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

### Initial Extraction (All New)
- [ ] All LEGOs marked with `new: true`
- [ ] All LEGOs needed to tile the seed are included
- [ ] No registry checking during extraction (deduplication happens in Phase 3.5)

### Format
- [ ] Valid JSON
- [ ] All required fields present
- [ ] M-types have `components`

---

## 🎓 EXAMPLE: Complete Seed Extraction

**Seed**: "Voy a practicar hablar con alguien más" = "I'm going to practise speaking with someone else"

```json
{
  "legos": [
    {
      "id": "S0003L01",
      "type": "M",
      "target": "voy a",
      "known": "I'm going to",
      "new": true,
      "components": [["voy", "I go"], ["a", "to"]]
    },
    {
      "id": "S0003L02",
      "type": "M",
      "target": "practicar hablar",
      "known": "practise speaking",
      "new": true,
      "components": [["practicar", "to practise"], ["hablar", "to speak"]]
    },
    {
      "id": "S0003L03",
      "type": "A",
      "target": "con",
      "known": "with",
      "new": true
    },
    {
      "id": "S0003L04",
      "type": "M",
      "target": "alguien más",
      "known": "someone else",
      "new": true,
      "components": [["alguien", "someone"], ["más", "else/more"]]
    }
  ]
}
```

**Extraction reasoning:**
- "voy a" → M-type (FD: "I'm" alone ambiguous, must keep together)
- "practicar hablar" → M-type (pattern: English gerund "speaking" → Spanish infinitive "hablar")
- "con" → A-type (single unit, FD-compliant)
- "alguien más" → M-type (FD: "else" alone ambiguous - otro/más/demás)

**Components show literal word-by-word mapping for learner transparency.**

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
SEED: "Voy a practicar hablar con alguien más"
KNOWN: "I'm going to practise speaking with someone else"

FORWARD SWEEP:
- "I'm" → fails (voy/estoy/soy ambiguous)
- "I'm going to" → "voy a" ✅ M-type (FD required, add components)
- "practise" → "practicar" ✅ could be A-type BUT...
- "practise speaking" → need pattern: gerund→infinitive → M-type "practicar hablar" ✅
- "with" → "con" ✅ A-type
- "someone" → could be A-type BUT...
- "someone else" → "else" ambiguous → M-type "alguien más" ✅

TILING: voy a + practicar hablar + con + alguien más ✅
All words covered, maximum granularity achieved

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
- v6.3 (2025-11-12): Added Pragmatic FD heuristic - maximum USEFUL granularity, not just maximum granularity
- v6.2 (2025-11-12): Added FD validation & merge step, Phase 1 assumption documented
- v6.1 (2025-11-11): Maximum tiling set, no double extraction, components for transparency only
- v6.0 (2025-11-11): Simplified M-LEGO rules, clearer examples
- v5.0 (2025-11-09): Ultimate edition with S0101-S0200 learnings
- v4.0: Radical simplification (One Rule principle)

**Status**: ✅ Production Ready
