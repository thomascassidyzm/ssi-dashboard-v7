# Phase 3: LEGO Extraction Intelligence

**Version**: 3.5 🔒 **LOCKED** (2025-10-28)
**Status**: Active
**Output**: `vfs/courses/{course_code}/lego_pairs.json`

---

## 🎯 FOUNDATIONAL PRINCIPLE: TILING FIRST

**Your PRIMARY task: Each seed sentence must DECOMPOSE into LEGOs that TILE to RECONSTRUCT it perfectly.**

### What "Tiling" Means

Every word in the seed sentence must map to a LEGO. When you combine all the LEGOs back together, you get the exact seed sentence - nothing missing, nothing extra.

```
Seed: "Quiero hablar español contigo ahora"

Decomposition (tiles perfectly):
- "Quiero" → I want
- "hablar" → to speak
- "español" → Spanish
- "contigo" → with you
- "ahora" → now

Recombination: Quiero + hablar + español + contigo + ahora = exact seed ✓
```

### Treat Each Seed as Isolated

**CRITICAL**: Decompose each seed independently. Don't think about "reused LEGOs from earlier seeds" - just ask:

**"What LEGOs tile THIS sentence?"**

Each seed gets its own LEGO IDs (S0001L01, S0001L02, etc.). If "Quiero" appears in multiple seeds, it gets a new ID in each (S0001L01, S0007L01, S0015L01). De-duplication happens later - not your concern in Phase 3.

---

## 📋 DECOMPOSITION SEQUENCE (4 Steps)

Follow this sequence for EVERY seed:

### STEP 1: Identify Complete Tiling

Parse the seed and identify ALL pieces needed to reconstruct it.

```
Seed: "cómo hablar lo más frecuentemente posible"

Initial tiling pieces:
- cómo
- hablar
- lo más frecuentemente posible (multi-word chunk)
```

### STEP 2: Check Multi-Word LEGOs for Feeders

For any LEGO with > 1 word in BOTH languages, ask:
**"Can this decompose into meaningful feeders that reduce cognitive load?"**

```
"lo más frecuentemente posible" contains:
- "frecuentemente" = "frequently" (cognate, highly reusable)
- "posible" = "possible" (cognate, highly reusable)
- "lo más" = structural glue

Decision: Extract feeders
→ "frecuentemente" and "posible" become separate BASE LEGOs
→ "lo más frecuentemente posible" becomes COMPOSITE with feeder references
```

**When to extract feeders:**
- ✅ Meaningful standalone words (cognates, high-frequency)
- ✅ Reusable in other contexts
- ✅ Reduces cognitive load (learner sees familiar pieces)

**When NOT to extract feeders:**
- ❌ Pure structural glue ("lo más", "de que")
- ❌ Inseparable fused forms ("contigo" - can't split "con" + "tigo" meaningfully)
- ❌ Creates over-granularization (fragments with no meaning)

### STEP 3: Apply FD Test to Each LEGO

**Functional Determinism**: Each LEGO must map to exactly ONE target form in its context.

```
✅ FD PASS: "con" → "with" (always maps cleanly)
✅ FD PASS: "que hables" → "you to speak" (subjunctive form is deterministic in this construction)
❌ FD FAIL: "que" alone → could be "that", "what", "than" (ambiguous)
```

**If LEGO fails FD → chunk it larger (make it part of a composite)**

### STEP 4: Componentize with LITERAL Translations

**CRITICAL RULE:** For COMPOSITE LEGOs, componentization arrays MUST use **LITERAL translations**, NOT semantic roles.

**Why literal?**
- Reveals HOW the target language constructs meaning
- Shows learner the actual "building blocks" of target language thought
- Enables transparent understanding of language patterns
- Components can be recognized in other contexts

**Format:** `[[targetPart, literalKnown], ...]`

```
✅ CORRECT (literal - reveals construction):
["lo más a menudo posible", "as often as possible", [
  ["lo más", "the most"],      // literal: Spanish uses superlative "the most"
  ["a menudo", "often"],        // literal: direct translation
  ["posible", "possible"]       // literal: direct translation
]]

Phase 6 says: "where 'lo más' means 'the most', 'a menudo' means 'often',
               and 'posible' means 'possible'"
Learner sees: Spanish literally says "the most often possible" ← transparency!

❌ WRONG (semantic role - obscures construction):
["lo más a menudo posible", "as often as possible", [
  ["lo más", "as"],             // semantic role in English idiom
  ["a menudo", "often"],
  ["posible", "possible"]
]]

Phase 6 would say: "where 'lo más' means 'as'..." ← confusing! Hides superlative.
Learner thinks: "lo más" = "as" ← WRONG mental model
```

**Another example:**
```
✅ CORRECT:
["que hables", "you to speak", [
  ["que", "that"],              // Spanish literally uses "that"
  ["hables", "you speak"]       // subjunctive form
]]

Learner sees: Spanish says "that you speak", English says "you to speak"
Pedagogical win: Reveals subjunctive construction pattern

❌ WRONG:
["que hables", "you to speak", [
  ["que", "you to"],            // semantic role
  ["hables", "speak"]
]]

Hides the "that" + subjunctive pattern - learner can't recognize it elsewhere
```

**Golden rule:** Ask yourself: "If I saw this component alone in another sentence, what does it literally mean?"

### Synonym Flexibility Through Literal Components

**KEY INSIGHT**: Literal componentization automatically teaches synonym relationships.

**Example from Phase 1:**
```
Seed: "cómo hablar lo más frecuentemente posible"
Known: "how to speak as often as possible"

Notice: Spanish says "frecuentemente" (frequently), English says "often"
```

**Phase 3 componentization (literal):**
```json
["lo más frecuentemente posible", "as often as possible", [
  ["lo más", "the most"],
  ["frecuentemente", "frequently"],  ← literal translation
  ["posible", "possible"]
]]
```

**Phase 6 introduction says:**
"The Spanish for 'as often as possible' is 'lo más frecuentemente posible' - where 'lo más' means 'the most', 'frecuentemente' means 'frequently', and 'posible' means 'possible'."

**Learner experience:**
1. Hears English: "as **often** as possible"
2. Learns Spanish: "lo más **frecuentemente** posible"
3. Sees breakdown: "frecuentemente means **frequently**"
4. Mental bridge: "often = frequently" (synonyms!)
5. Bonus: Cognate transparency (frecuentemente ≈ frequently)

**Why this works pedagogically:**
- Canonical English stays natural ("often")
- Spanish uses cognate for transparency ("frecuentemente")
- Literal componentization reveals the synonym relationship
- Learner gains flexible vocabulary understanding
- No need to change canonical seeds to force exact word matches

---

## ⚖️ FD COMPLIANCE: THE GATE

**Functional Determinism (FD)** is your gate for all boundary decisions:

### The FD Test:

**"Does this LEGO produce exactly ONE target form in its context of use?"**

If YES → Valid LEGO
If NO → Chunk larger or add context

### FD-Compliant Examples:

```
✅ "con" → "with" (1:1 mapping across contexts)
✅ "Quiero" → "I want" (always this form)
✅ "que hables" → "you to speak" (subjunctive construction is deterministic)
✅ "va a" → "is going to" (future periphrastic, always "va a")
```

### FD Violations (need fixing):

```
❌ "que" alone → "that/what/than" (ambiguous)
   Fix: Keep in composite "lo que", "que hables", etc.

❌ "hables" alone → could be imperative or subjunctive (ambiguous without context)
   Fix: Keep in composite "que hables"

❌ "en" alone → "in/at/on" (preposition with multiple meanings)
   Judgment call: If context makes it deterministic → can be BASE
                  If ambiguous → wrap in composite
```

---

## 🧩 CHUNKING HEURISTICS: JUDGMENT, NOT RULES

Granularity is **judgment-based**, not rigid rules. Balance these factors:

### 1. Recombination Power
- High recombination → prefer atomic
- Low recombination → can chunk larger

```
"Quiero" appears in S0001, S0007, S0015, S0019 → Keep atomic
"todos los demás" appears once → Can be composite
```

### 2. Cognitive Load
- Simple, transparent → can be atomic
- Complex, opaque → wrap in composite

```
"con" = "with" → Transparent, atomic OK
"con tal de que" = "provided that" → Complex, make composite
```

### 3. Form Changes
- Unpredictable morphology → wrap in composite

```
"que hables" (subjunctive) → Not predictable from English, wrap together
"hablar" (infinitive) → Predictable form, keep atomic
```

### 4. Pedagogical Value
- Would learner benefit from practicing this separately?

```
"frecuentemente" (cognate, high-frequency) → YES, extract as feeder
"lo más" (structural glue) → NO, leave as component explanation
```

### Prepositions: Case-by-Case Judgment

**NOT a blanket ban** - apply FD test and judgment:

```
✅ "con" = "with" → FD-compliant, high recombination → Can be BASE
✅ "con alguien" → Also valid as COMPOSITE (pedagogical choice)

❌ "en" alone → Less deterministic (in/at/on), wrap in composites
✅ "en español" → COMPOSITE wrapping preposition

⚠️ "de" → Highly context-dependent (of/from/about), usually wrap
✅ "un poco de" → COMPOSITE wrapping preposition
```

**The principle: FD compliance determines validity. Pedagogical judgment determines granularity.**

---

## 🚫 HARD RULES (Non-Negotiable)

Some patterns ALWAYS fail pedagogy or FD:

### 1. Gender-Marked Articles MUST Bond with Nouns

```
❌ NEVER: ["una", "a"] + ["palabra", "word"] separately
✅ ALWAYS: ["una palabra", "a word"] bonded

Why: Gender learning requires article-noun bonding
```

### 2. Auxiliary Verbs MUST Join Main Verbs

```
❌ NEVER: ["Estoy", "I am"] alone
✅ ALWAYS: ["Estoy intentando", "I'm trying"] together

Why: Auxiliary has no meaning without main verb
```

### 3. Negation Markers MUST Join Expressions

```
❌ NEVER: ["No", "not"] alone
✅ ALWAYS: ["No estoy seguro", "I'm not sure"] together

Why: Negation needs something to negate
```

### 4. Object Pronouns MUST Join Verbs (When Verb-Attached)

```
❌ NEVER: ["Me", "me"] alone when verb-attached
✅ ALWAYS: ["Me gustaría", "I would like"] together

Why: Reflexive/object pronouns don't stand alone in target language
```

### 5. Multi-Word Verb Constructions Stay Together

```
❌ NEVER: ["va", "goes"] + ["a", "to"] separately
✅ ALWAYS: ["va a", "is going to"] together

Why: Periphrastic constructions function as units
```

---

## ⚠️ CRITICAL: USE EXTENDED THINKING MODE ⚠️

**LEGO decomposition requires careful reasoning about linguistic structure.**

### Extended Thinking Protocol

**For EVERY seed decomposition:**
```
<thinking>
STEP 1: TILING CHECK
- What pieces tile to reconstruct this seed?
- List all LEGOs needed

STEP 2: FEEDER ANALYSIS
- Any multi-word LEGOs?
- Can they decompose into meaningful feeders?
- Apply extraction heuristics

STEP 3: FD VALIDATION
- Test each LEGO: one input = one output?
- Any ambiguous forms?
- Chunk larger if FD fails

STEP 4: COMPONENT TRANSLATIONS
- Use LITERAL translations (not functional)
- Show target language construction patterns

STEP 5: FINAL TILING CHECK
- Do all LEGOs recombine to exact seed?
- Nothing missing, nothing extra?

STEP 6: HARD RULES SCAN
- Any standalone auxiliaries? (fix)
- Any unbonded articles? (fix)
- Any standalone negations? (fix)
- Any standalone object pronouns? (fix)
- Any split verb constructions? (fix)

If ANY issues → regenerate before outputting
</thinking>

[Generate LEGO decomposition output]
```

---

## 📤 OUTPUT FORMAT

**IMPORTANT**: Use **COMPACT JSON formatting** - arrays on single lines, minimal whitespace. Do NOT use pretty-print/vertical formatting.

```json
[
  ["S0003", ["cómo hablar lo más frecuentemente posible", "how to speak as frequently as possible"], [
    ["S0003L01", "B", "cómo", "how"],
    ["S0003L02", "B", "hablar", "to speak"],
    ["S0003L03", "B", "frecuentemente", "frequently"],
    ["S0003L04", "B", "posible", "possible"],
    ["S0003L05", "C", "lo más frecuentemente posible", "as frequently as possible", [
      ["lo más", "the most"],
      ["frecuentemente", "frequently", "S0003L03"],
      ["posible", "possible", "S0003L04"]
    ]]
  ]]
]
```

**Format requirements:**
- **Compact horizontal arrays** - each LEGO on one line
- **Minimal vertical spacing** - only between seeds
- **NO deep indentation** of array elements
- Each seed entry should fit on 3-5 lines total

**Key points:**
- Seed sentence at top
- ALL LEGOs that tile to reconstruct it
- BASE LEGOs: `[ID, "B", target, known]`
- COMPOSITE LEGOs: `[ID, "C", target, known, components]`
- Component arrays with LITERAL translations
- Feeder references: third element in component array

---

## 📝 NOTE ON VALIDATION

**Self-checking during generation** (via Extended Thinking) is part of this phase.

**Formal validation** (systematic checking across all seeds) happens in Phase 3.5.

If your Extended Thinking identifies issues, regenerate that seed before continuing.

---

## 📚 COMPLETE EXAMPLE: S0003

**Seed**: "cómo hablar lo más frecuentemente posible" / "how to speak as frequently as possible"

### Extended Thinking:

```
<thinking>
STEP 1: TILING
Pieces needed:
- cómo (how)
- hablar (to speak)
- lo más frecuentemente posible (as frequently as possible)

STEP 2: FEEDER ANALYSIS
"lo más frecuentemente posible" is multi-word:
- "frecuentemente" = cognate, high reuse → Extract as feeder
- "posible" = cognate, high reuse → Extract as feeder
- "lo más" = structural glue → Leave as component explanation

STEP 3: FD VALIDATION
- "cómo" → "how" (always) ✓
- "hablar" → "to speak" (always) ✓
- "frecuentemente" → "frequently" (always) ✓
- "posible" → "possible" (always) ✓
- "lo más frecuentemente posible" → "as frequently as possible" (always) ✓

All pass FD ✓

STEP 4: COMPONENT TRANSLATIONS (literal)
- "lo más" → "the most" (shows Spanish superlative structure)
- "frecuentemente" → "frequently" (with feeder reference)
- "posible" → "possible" (with feeder reference)

STEP 5: FINAL TILING
cómo + hablar + lo más frecuentemente posible = exact seed ✓

STEP 6: HARD RULES
- No auxiliaries alone ✓
- No articles alone ✓
- No negations alone ✓
- No pronouns alone ✓
- No split verbs ✓

Ready to output ✓
</thinking>
```

### Output:

```json
["S0003", ["cómo hablar lo más frecuentemente posible", "how to speak as frequently as possible"], [
  ["S0003L01", "B", "cómo", "how"],
  ["S0003L02", "B", "hablar", "to speak"],
  ["S0003L03", "B", "frecuentemente", "frequently"],
  ["S0003L04", "B", "posible", "possible"],
  ["S0003L05", "C", "lo más frecuentemente posible", "as frequently as possible", [
    ["lo más", "the most"],
    ["frecuentemente", "frequently", "S0003L03"],
    ["posible", "possible", "S0003L04"]
  ]]
]]
```

**Verification:**
- Tiling: cómo + hablar + "lo más frecuentemente posible" = exact seed ✓
- FD: All LEGOs pass ✓
- Components: Literal translations ✓
- Feeders: Referenced correctly ✓

---

## 🔄 VERSION HISTORY

**v3.5 (2025-10-28) 🔒 LOCKED - SYNONYM FLEXIBILITY**:
- **NEW SECTION**: Added "Synonym Flexibility Through Literal Components"
- **KEY INSIGHT**: Literal componentization automatically teaches synonym relationships
- Documented "often" → "frecuentemente" (frequently) example showing natural synonym bridging
- Learner experience: Hears "often", learns "frecuentemente", sees "frequently" breakdown, bridges synonyms
- **Pedagogical win**: Maintains canonical naturalness while maximizing cognate transparency
- No need to change canonical seeds to force exact word matches
- **Impact**: Validates Phase 1's synonym flexibility principle through Phase 3 implementation

**v3.4 (2025-10-28) 🔒 LOCKED - LITERAL COMPONENTIZATION**:
- **CRITICAL CLARIFICATION**: Strengthened STEP 4 to emphasize LITERAL translations in componentization
- **Pedagogical transparency**: Components must reveal HOW target language constructs meaning, not semantic roles
- **Golden rule added**: "If I saw this component alone, what does it literally mean?"
- **Clear examples**: "lo más" = "the most" (literal) NOT "as" (semantic role)
- **Phase 6 integration**: Literal components enable pedagogical introductions that show language construction
- **Why this matters**: Learners see "Spanish says 'the most often possible'" vs semantic obscurity
- Format simplified: `[[targetPart, literalKnown], ...]` (no feeder IDs in componentization array)

**v3.3 (2025-10-27) - MAJOR RESTRUCTURE**:
- **FOUNDATIONAL CHANGE**: TILING FIRST principle added as primary task
- **Isolated seed decomposition**: No "reused LEGO" concept - each seed decomposes independently
- **Component translation principle**: Use LITERAL translations to reveal target language construction
- **FD as gate, not rules**: Removed blanket "no prepositions" rule, added nuanced FD-based judgment
- **4-step decomposition sequence**: Clear process from tiling → feeders → FD → componentization
- **Chunking as heuristics**: Judgment-based, not rigid rules
- **Hard rules section**: Only truly non-negotiable patterns (articles, auxiliaries, negations, pronouns)
- **Generation-focused**: Removed separate validation loop (now Phase 3.5's responsibility)
- **Self-checking in Extended Thinking**: Agent validates own work during generation
- **Batch processing ready**: Designed for 20-seed batches with fresh intelligence
- Complete example showing full thinking process

**v3.2 (2025-10-26)**:
- Added PRE-FLIGHT CHECK section
- Added STOP AND FIX validation gate
- Strengthened Extended Thinking protocol

**v3.0-3.1**: Earlier methodology development

---

**End of Phase 3 v3.4 Intelligence**
