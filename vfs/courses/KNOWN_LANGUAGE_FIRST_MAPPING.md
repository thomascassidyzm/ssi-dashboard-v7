# Known Language First Mapping

## The Core Principle

**Start with the KNOWN language sentence. Move through it word by word, finding what each chunk maps to in the TARGET language.**

**IF IN DOUBT → CHUNK UP** (prefer longer phrases over shorter ones)

---

## The Extraction Process

### Step 1: Bidirectional Sweep

**Given a seed pair, sweep through the KNOWN sentence BOTH ways:**

**Forward (left to right):**
- Start with first word
- Expand rightward
- Find longest FD mapping

**Backward (right to left):**
- Start with last word
- Expand leftward
- Find longest FD mapping

**Why both directions?** Sometimes patterns are clearer from one end than the other.

---

## Complete Example

**Seed S0007:**
```
TARGET: "Quiero intentar tan duro como pueda hoy."
KNOWN:  "I want to try as hard as I can today."
```

### Forward Sweep:

```
"I"                  → no map (too small, "I" alone is ambiguous)
"I want"             → "Quiero" ✓ FOUND
  ↓ Continue from "to"
"to"                 → no map (too small, preposition alone)
"to try"             → "intentar" ✓ FOUND
  ↓ Continue from "as"
"as"                 → no map (too small, polysemous)
"as hard"            → "tan duro" (maybe, but keep checking...)
"as hard as"         → still checking...
"as hard as I"       → still checking...
"as hard as I can"   → "tan duro como pueda" ✓ FOUND (this is better!)
  ↓ Continue from "today"
"today"              → "hoy" ✓ FOUND
```

### Backward Sweep:

```
"today"              → "hoy" ✓ FOUND
  ↓ Continue from "can"
"can"                → no map (too small)
"I can"              → no map (need context)
"as I can"           → no map (still need more)
"hard as I can"      → no map
"as hard as I can"   → "tan duro como pueda" ✓ FOUND
  ↓ Continue from "try"
"try"                → no map (need "to try")
"to try"             → "intentar" ✓ FOUND
  ↓ Continue from "want"
"want"               → no map (need "I want")
"I want"             → "Quiero" ✓ FOUND
```

### Merge Results:

Take the **longest matches** from both sweeps:

```json
[
  ["S0007L01", "B", "Quiero", "I want"],
  ["S0007L02", "B", "intentar", "to try"],
  ["S0007L03", "C", "tan duro como pueda", "as hard as I can", [
    ["tan", "as much"],
    ["duro", "hard"],
    ["como", "as/like"],
    ["pueda", "I can (in this context)"]
  ]],
  ["S0007L04", "B", "hoy", "today"]
]
```

---

## Why This Works

### Low Learner Uncertainty

When prompted with KNOWN chunk → learner knows EXACTLY what to say:

✅ **"I want"** → learner says "Quiero" (deterministic)
✅ **"to try"** → learner says "intentar" (deterministic)
✅ **"as hard as I can"** → learner says "tan duro como pueda" (deterministic)
✅ **"today"** → learner says "hoy" (deterministic)

❌ **"as"** → learner confused (tan? como? tanto? - NOT deterministic)

### Prefer Longer Chunks

**The Rule: IF IN DOUBT → CHUNK UP**

When you're uncertain whether a chunk is FD-compliant, **make it bigger**:

```
❌ "as" → tan (too small, ambiguous)
❌ "as hard" → tan duro (still uncertain)
✅ "as hard as I can" → tan duro como pueda (NOW it's clear!)
```

**Why?** More context = more certainty = FD compliance

---

## Classification

### BASE (B) - Atomic LEGOs

Single words or minimal indivisible units:
- "Quiero" = "I want" (can't break down further)
- "intentar" = "to try" (atomic verb)
- "hoy" = "today" (atomic adverb)

### COMPOSITE (C) - Molecular LEGOs

Multi-word chunks with componentization:
- "tan duro como pueda" = "as hard as I can"
  - Components show the literal structure
  - Reveals how target language builds this meaning

**Componentization shows ALL WORDS with LITERAL translations:**
```json
["S0007L03", "C", "tan duro como pueda", "as hard as I can", [
  ["tan", "as/as much"],
  ["duro", "hard"],
  ["como", "as/like"],
  ["pueda", "I can"]
]]
```

**Complete breakdown:** ALL FOUR WORDS in "tan duro como pueda"
This reveals: Spanish literally says "as much hard as I can"

---

## Another Example

**Seed S0010:**
```
TARGET: "No estoy seguro si puedo recordar toda la oración."
KNOWN:  "I'm not sure if I can remember the whole sentence."
```

### Forward Sweep:

```
"I'm"                → no map
"I'm not"            → no map
"I'm not sure"       → "No estoy seguro" ✓ FOUND
"if"                 → "si" ✓ FOUND
"I"                  → no map
"I can"              → "puedo" ✓ FOUND
"remember"           → no map
"to remember"        → "recordar" ✓ FOUND
"the"                → no map
"the whole"          → no map
"the whole sentence" → "toda la oración" ✓ FOUND
```

### Result:

```json
[
  ["S0010L01", "C", "No estoy seguro", "I'm not sure", [
    ["No", "not"],
    ["estoy", "I am"],
    ["seguro", "sure"]
  ]],
  ["S0010L02", "B", "si", "if"],
  ["S0010L03", "B", "puedo", "I can"],
  ["S0010L04", "B", "recordar", "to remember"],
  ["S0010L05", "C", "toda la oración", "the whole sentence", [
    ["toda", "whole"],
    ["la", "the"],
    ["oración", "sentence"]
  ]]
]
```

**Note:** ALL WORDS componentized:
- "No estoy seguro" → 3 components (No, estoy, seguro)
- "toda la oración" → 3 components (toda, la, oración)

---

## Key Judgment Points

### When to stop expanding?

**Stop when:**
- ✅ You found a clear, unambiguous mapping
- ✅ Making it longer would be unnatural
- ✅ You've covered a complete grammatical unit

**Keep going when:**
- ❌ Still ambiguous (could mean multiple things)
- ❌ Too small (single function word like "to", "as", "the")
- ❌ Not FD-compliant yet

### The FD Test:

**Ask: "If learner hears this KNOWN chunk, do they know EXACTLY ONE TARGET response?"**

- "as" → NO (could be tan, como, tanto...)
- "as hard as I can" → YES (tan duro como pueda - deterministic!)

### Componentization:

**For COMPOSITE LEGOs, show ALL WORDS with literal translations:**

EVERY word in the target phrase gets its own component entry.

**Example:**
```json
["S0007L03", "C", "tan duro como pueda", "as hard as I can", [
  ["tan", "as/as much"],
  ["duro", "hard"],
  ["como", "as/like"],
  ["pueda", "I can"]
]]
```

**ALL FOUR WORDS** - complete word-by-word breakdown.

**Rule:** Components use LITERAL translations (not interpretive).
- ✅ "tan" = "as/as much" (literal)
- ❌ "tan" = "very" (interpretive - not what it literally means here)

---

## Common Patterns

### Pattern 1: Prepositions Need Wrapping

```
❌ "to" → "a" (polysemous, not FD)
✅ "to try" → "intentar" (wrapped in verb phrase)
```

### Pattern 2: Prefer Complete Phrases

```
❌ "the" → "la" (gender/number unclear)
✅ "the whole sentence" → "toda la oración" (complete phrase)
```

### Pattern 3: Subjunctive Stays Together

```
❌ "hables" alone → (needs trigger)
✅ "que hables" → "you to speak" (trigger + form together)
```

---

## Summary

1. **Sweep KNOWN sentence** (forward AND backward)
2. **Find longest FD mappings** at each position
3. **IF IN DOUBT → CHUNK UP** (prefer more context)
4. **Classify**: BASE (atomic) or COMPOSITE (molecular)
5. **Componentize**: Show literal structure for COMPOSITE LEGOs

**The goal:** Every LEGO must be **functionally deterministic** - learner hears KNOWN → produces exactly ONE TARGET with zero uncertainty.

**The method:** Start from what learner will be prompted with (KNOWN language), find natural chunks that map cleanly.

**The bias:** When uncertain, prefer **longer chunks** (more context = less ambiguity = better FD compliance).
