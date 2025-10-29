# Phase 3: LEGO Extraction Intelligence

**Version**: 4.0.2 (2025-10-29)
**Status**: Active - Simplified
**Output**: `vfs/courses/{course_code}/lego_pairs.json`

---

## 🎯 THE ONLY RULE THAT MATTERS

**When learner hears KNOWN → they produce exactly ONE TARGET (zero uncertainty)**

Everything below is just ways to check this rule.

---

## 📋 HOW TO DECOMPOSE (3 Steps)

### STEP 1: TILE
Break seed into pieces that reconstruct it perfectly.

```
Seed: "Quiero hablar español contigo ahora"
Pieces: Quiero + hablar + español + contigo + ahora
```

### STEP 2: TEST (The Uncertainty Checklist)

For EVERY piece, ask these 3 questions:

**❌ FAIL if ANY are true:**

1. **"Does learner already know a simpler TARGET for this KNOWN?"**
   - Example: "a entender" = "to understand" ← learner knows "entender" = "to understand"
   - Creates uncertainty which one to use

2. **"Is this an ambiguous standalone word?"**
   - que, de, a, en (alone) ← always ambiguous
   - Articles, auxiliaries, negations (alone) ← need context

3. **"Can this word mean multiple things in KNOWN language?"**
   - Example: "that" could be "que" (subordinate) or "ese" (demonstrative)
   - Creates uncertainty which TARGET to produce

**✅ PASS if NONE are true**

### STEP 3: FIX

**If TEST fails → Make it BIGGER**

Wrap with enough context to make KNOWN → TARGET deterministic (only one possible answer).

```
❌ "a entender" = "to understand" [fails test #1]
✅ "empezar a entender" = "to start to understand" [passes - "a" no longer confusing]

❌ "que" = "that" [fails test #2]
✅ "que es" = "that it is" [passes - context makes it deterministic]

❌ "de" = "of" [fails test #2]
✅ "un poco de" = "a little" [passes - context makes it deterministic]
```

---

## ⚡ QUICK CHECKLIST

**ALWAYS wrap these (they never pass alone):**
- que, de, a, en
- Articles (un/una/el/la) + noun
- Auxiliaries (estoy/voy a/etc) + verb
- Negations (no/nunca) + expression

**ALWAYS keep atomic:**
- Content words with 1:1 mapping
- Example: "hablar" → "to speak" (learner hears "to speak" → says "hablar" deterministically)

---

## 🤖 EXTENDED THINKING PROTOCOL

```
<thinking>
STEP 1: TILE
- List all pieces that reconstruct seed

STEP 2: TEST EACH PIECE
- Already knows simpler form? [YES = fail]
- Ambiguous standalone word? [YES = fail]
- Multiple possible TARGETs? [YES = fail]

STEP 3: FIX FAILURES
- Wrap failed pieces larger
- Re-test wrapped version
- Continue until all pass

OUTPUT: All pieces pass → generate JSON
</thinking>
```

---

## 📤 OUTPUT FORMAT

**Formatted, readable JSON** - each seed is a block:

```json
{
  "version": "7.7",
  "seeds": [
    [
      "S0001",
      ["Quiero hablar español contigo ahora.", "I want to speak Spanish with you now."],
      [
        ["S0001L01", "B", "Quiero", "I want"],
        ["S0001L02", "B", "hablar", "to speak"],
        ["S0001L03", "B", "español", "Spanish"],
        ["S0001L04", "B", "contigo", "with you"],
        ["S0001L05", "B", "ahora", "now"]
      ]
    ],
    [
      "S0002",
      ["Estoy intentando aprender.", "I'm trying to learn."],
      [
        ["S0002L01", "C", "Estoy intentando", "I'm trying", [["Estoy", "I am"], ["intentando", "trying"]]],
        ["S0002L02", "B", "aprender", "to learn"]
      ]
    ]
  ]
}
```

**Key formatting rules:**
- **SORT seeds in alphanumeric order by seed ID** (S0001, S0002, ..., S0010, S0011, ...)
- Each seed is a separate block with blank line after
- Seed ID, seed pair, and LEGOs on separate indented lines
- Each LEGO array on its own line
- COMPOSITE components stay compact: `[["target", "known"], ...]`

---

## 🧩 COMPONENTIZATION: Show the Construction

**When you wrap larger (make COMPOSITE), add components with LITERAL translations.**

**Why?** Shows learner HOW the target language builds meaning.

**Simple example:**
```json
["S0009L02", "C", "un poco de español", "a little Spanish", [
  ["un poco", "a little"],
  ["de", "of"],
  ["español", "Spanish"]
]]
```
Note: "de" = "of" (literal) shows Spanish uses "of" here

**The LEGO says:** "a little Spanish" (matches seed)
**The components reveal:** Spanish literally says "a little **of** Spanish"
**Learner understands:** Partitive construction (transparent!)

**Another example:**
```json
["S0005L01", "C", "Voy a practicar", "I'm going to practise", [
  ["Voy", "I go"],
  ["a", "to"],
  ["practicar", "to practise"]
]]
```
Note: Components show literal construction: "I go" + "to" + "to practise"

**The LEGO says:** "I'm going to practise" (natural English)
**The components reveal:** Spanish literally says "I go to practise"
**Learner understands:** Future periphrastic construction

**Rule:** Components use LITERAL meanings (not semantic roles). This reveals target language patterns.

---

## 📚 COMPLETE EXAMPLE

**Seed**: "No estoy seguro si puedo recordar la frase completa." / "I'm not sure if I can remember the whole sentence."

```
<thinking>
STEP 1: TILE
- No estoy seguro
- si
- puedo
- recordar
- la frase completa

STEP 2: TEST
- "No estoy seguro" → "I'm not sure" ✓ (passes all tests)
- "si" → "if" ✓ (passes - deterministic in this context)
- "puedo" → "I can" ✓ (passes - deterministic)
- "recordar" → "to remember" ✓ (passes - deterministic)
- "la frase completa" → "the whole sentence" ✓ (passes - article bonded)

STEP 3: FIX
- No failures, all pass

OUTPUT READY
</thinking>
```

**Output**:
```json
[
  "S0010",
  ["No estoy seguro si puedo recordar la frase completa.", "I'm not sure if I can remember the whole sentence."],
  [
    ["S0010L01", "C", "No estoy seguro", "I'm not sure", [["No", "not"], ["estoy", "I am"], ["seguro", "sure"]]],
    ["S0010L02", "B", "si", "if"],
    ["S0010L03", "B", "puedo", "I can"],
    ["S0010L04", "B", "recordar", "to remember"],
    ["S0010L05", "C", "la frase completa", "the whole sentence", [["la", "the"], ["frase", "sentence"], ["completa", "whole"]]]
  ]
]
```

---

## ⚠️ REMEMBER

**The test is simple: When learner hears KNOWN, do they produce exactly ONE correct TARGET?**

If NO → make it bigger until YES.

That's it. That's the whole system.

---

# APPENDICES

## Appendix A: Why This Rule Matters

**The Pedagogical Moment**: Phase 6 prompts learner with KNOWN phrase. They must produce TARGET.

**If uncertain which TARGET:**
```
Prompt: "to understand"
Learner: "entender... or was it 'a entender'? I forget..."
Result: ❌ Anxiety, wrong answer, learning disrupted
```

**If certain:**
```
Prompt: "to start to understand"
Learner: "empezar a entender"
Result: ✅ Confident, correct, learning reinforced
```

**FD = Zero uncertainty = Maximum learner confidence**

---

## Appendix B: Common Patterns

### Pattern 1: Prepositions
Spanish prepositions are polysemous (one word, many meanings).

**The problem:**
- "de" can mean: of, from, about, at, to
- If learner hears "of", which Spanish preposition? (de/desde/...)

**The solution:**
- Never "de" alone
- Always wrapped: "un poco de" = "a little", "seguro de" = "sure about", etc.

### Pattern 2: Construction Markers
Spanish uses grammatical particles that create constructions.

**The problem:**
- "a entender" = "to understand"
- Learner already knows "entender" = "to understand"
- Now they're uncertain which to use

**The solution:**
- Never "a + verb" = "to + verb" (creates collision)
- Always wrap larger: "empezar a entender" = "to start to understand"

### Pattern 3: Relative Pronouns
"que" is a chameleon word (10+ different translations).

**The problem:**
- "que" = that/what/than/who/which/whom/∅
- Learner hears "that" → which usage of "que"?

**The solution:**
- Never "que" alone
- Always wrapped with context: "que es" = "that it is", "mejor que" = "better than"

---

## Appendix C: Edge Cases & Judgment Calls

### When can prepositions be standalone?

**Very rarely.** Only if:
1. They pass all 3 test questions
2. They have 1:1 mapping in your specific language pair
3. High reuse across many seeds

**Example:** "con" = "with" might pass in Spanish→English (but safer to wrap anyway).

### What about verb form variations?

**Normalize to ONE canonical form per verb:**
- "hablar" → ALWAYS "to speak" (not "speaking", "talking", "speak")
- Even if English context wants different form
- Prevents uncertainty about which form to use

### Multi-word chunks: How big?

**Big enough to pass the test, small enough to be reusable.**

Balance:
- Too small: Fails uncertainty test
- Too big: Not reusable
- Just right: Passes test + appears in multiple seeds

**Heuristic:** Minimal sufficient context (smallest chunk that makes KNOWN → TARGET deterministic)

---

## Appendix D: Technical Details

### Componentization Rules

**Components use LITERAL translations** (not semantic roles):

```
✅ CORRECT:
["lo más", "the most"]  ← shows Spanish uses superlative literally

❌ WRONG:
["lo más", "as"]  ← hides the superlative construction
```

**Components explain construction, don't reconstruct LEGO's known:**

```
["para hablar", "to talk", [
  ["para", "in order to"],  ← literal meaning
  ["hablar", "to talk"]
]]
```
- LEGO says "to talk" (matches seed)
- Component reveals "para" = "in order to" (purpose construction)
- Component doesn't reconstruct "to talk" - it explains the Spanish

### Feeder Extraction

**Rarely needed.** Only extract feeders if:
- Cognate (frecuentemente → frequently)
- High frequency across seeds
- Reduces cognitive load

**Most composites don't need feeders** - just componentization.

---

## Appendix E: Version History

**v4.0.2 (2025-10-29) - READABLE JSON FORMAT + SORTING**:
- Changed OUTPUT FORMAT from compact single-line to formatted, readable JSON
- **Seeds must be sorted in alphanumeric order by seed ID** (S0001, S0002, ..., S0010, S0011, ...)
- Each seed is now a properly indented block (easier to read/debug)
- Seed ID, seed pair, and LEGOs array on separate lines with proper indentation
- COMPOSITE components stay compact on their line
- Format matches lego_pairs.formatted.json style

**v4.0.1 (2025-10-29) - COMPONENTIZATION IN CORE**:
- Added COMPONENTIZATION section to core (not just appendix)
- Simple examples showing literal translations
- Why it matters: reveals target language construction
- Important because v4.0 wraps much more → more composites → more components

**v4.0 (2025-10-29) - RADICAL SIMPLIFICATION**:
- Reduced core from 400+ lines to ~80 lines
- ONE RULE: Known → Target is 1:1 (zero uncertainty)
- 3-question test checklist (simple yes/no)
- 3-step protocol (tile/test/fix)
- Moved all details to appendices
- Goal: Reduce cognitive load on model

**v3.6.1 (2025-10-29) - "ALREADY KNOWS" CHECK**:
- Added explicit check for learner's existing knowledge
- Catches subtle collisions like "a entender" = "to understand"

**v3.6 (2025-10-29) - FD DIRECTION CORRECTED**:
- Fixed FD definition: Known → Target (not Target → Known)
- Language-agnostic terminology

**v3.0-3.5**: Earlier iterations with increasing complexity

---

**End of Phase 3 v4.0 Intelligence**
