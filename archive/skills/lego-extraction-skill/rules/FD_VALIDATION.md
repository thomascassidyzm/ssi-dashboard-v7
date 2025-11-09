# FD Validation: Functional Determinism + FCFS

## Core Principles

### FD = Functionally Deterministic

**Definition:** A LEGO is **functionally deterministic** if showing the learner the **known chunk** results in **exactly ONE correct target response**.

**Why it matters:** If a learner sees "the" and doesn't know whether to say "el", "la", "los", or "las", the LEGO fails. The learner must **always know what to say**.

### FCFS = First Come First Served

**The Rule:** When a known chunk *could* map to multiple target chunks, the **FIRST occurrence** claims that mapping. All subsequent occurrences must be **chunked up** with more context to remain FD.

**Why it matters:** This prevents ambiguity. Once "I think" → "creo" is established (first occurrence), every time the learner sees "I think" alone, they know to say "creo".

---

## The FD Test

For every LEGO pair, ask:

**"If I show the learner ONLY the known chunk, do they know EXACTLY what target chunk to produce?"**

- **YES** → FD passes ✅
- **NO** → FD fails ❌ (chunk up or reject)

### Valid FD Examples

#### Example 1: Simple Word
```
Known: "Hello"
Target: "Hola"
```

**Test:**
- Learner sees: "Hello"
- Learner says: "Hola" (only one option)
- **Result: PASSES FD** ✅

---

#### Example 2: Phrase
```
Known: "I'm trying"
Target: "Estoy intentando"
```

**Test:**
- Learner sees: "I'm trying"
- Learner says: "Estoy intentando" (only one option)
- **Result: PASSES FD** ✅

---

#### Example 3: Complete Context
```
Known: "the table"
Target: "la mesa"
```

**Test:**
- Learner sees: "the table"
- Learner says: "la mesa" (only one option - context determines gender)
- **Result: PASSES FD** ✅

---

### Invalid FD Examples

#### Example 1: Ambiguous Article
```
Known: "the"
Target: ???
```

**Test:**
- Learner sees: "the"
- Learner could say: "el" OR "la" OR "los" OR "las"
- **Result: FAILS FD** ❌

**Why it fails:** Gender/number of following noun determines which article. Without context, learner cannot know which to use.

**Fix:** Only extract "the" with full context:
```
✅ "the table" → "la mesa" (FD passes)
✅ "the book" → "el libro" (FD passes)
```

---

#### Example 2: Ambiguous Verb Form
```
Known: "I like"
Target: ???
```

**Test:**
- Learner sees: "I like"
- Learner could say: "me gusta" (singular object) OR "me gustan" (plural object)
- **Result: FAILS FD** ❌

**Why it fails:** Singular/plural object determines verb form. Learner needs context.

**Fix:** Include object for determinism:
```
✅ "I like it" → "me gusta" (FD passes)
✅ "I like them" → "me gustan" (FD passes)
```

---

#### Example 3: Multiple Verb Meanings
```
Known: "I think"
Target: ???
```

**Test:**
- Learner sees: "I think"
- Learner could say: "creo" (believe/think an opinion) OR "pienso" (think about something)
- **Result: FAILS FD** ❌

**Why it fails:** Context determines which verb. But FCFS can save this!

**Fix with FCFS:** See next section.

---

## The FCFS Rule

### How FCFS Works

When a known chunk has **multiple possible targets**, the **first seed** claims one mapping. Subsequent seeds must chunk up.

### Example 1: "I think" (creo vs pienso)

**Seed 1 (First occurrence):**
```
Translation: "I think" → "creo"
Extract: "I think" → "creo" ✅
Status: FCFS claims "I think" → "creo"
```

**Seed 15 (Later occurrence):**
```
Translation: "I think about you" → "pienso en ti"
Problem: "I think" already mapped to "creo" (FCFS)
Cannot extract: "I think" → "pienso" ❌
Solution: Chunk up with context
Extract: "I think about you" → "pienso en ti" ✅
```

**Result:**
- Learner sees "I think" alone → says "creo" (FD maintained)
- Learner sees "I think about you" → says "pienso en ti" (FD maintained)
- No ambiguity ✅

---

### Example 2: "the" (el vs la)

**Seed 3 (First occurrence):**
```
Translation: "the table" → "la mesa"
Extract: "la" → "the" (as FEEDER) ✅
Status: FCFS claims "the" → "la" (feminine article)
```

**Seed 10 (Later occurrence):**
```
Translation: "the book" → "el libro"
Problem: "the" already mapped to "la" (FCFS)
Cannot extract: "the" → "el" ❌
Solution: Don't extract "the" from this seed
Extract: "the book" → "el libro" (keep full phrase) ✅
OR: Wait to introduce "el" in different context (e.g., "he" → "él")
```

**Result:**
- Learner sees "the" alone → says "la" (FD maintained via FCFS)
- Learner sees "the book" → says "el libro" (FD via full phrase)
- No ambiguity ✅

---

### Example 3: "to be" (ser vs estar)

**Seed 5 (First occurrence):**
```
Translation: "I am" → "Estoy"
Extract: "I am" → "Estoy" ✅
Status: FCFS claims "I am" → "Estoy" (estar form)
```

**Seed 20 (Later occurrence):**
```
Translation: "I am a teacher" → "Soy un profesor"
Problem: "I am" already mapped to "Estoy" (FCFS)
Cannot extract: "I am" → "Soy" ❌
Solution: Chunk up with context
Extract: "I am a teacher" → "Soy un profesor" ✅
```

**Result:**
- Learner sees "I am" alone → says "Estoy" (FD via FCFS)
- Learner sees "I am a teacher" → says "Soy un profesor" (FD via context)
- No ambiguity ✅

---

## FD + FCFS Validation Process

### Step 1: FD Test

**Ask:** "If learner sees the known chunk, is there exactly ONE target response?"

```
Known: "Hello" → Target: ?
Answer: "Hola" (only one) ✅ → GO TO STEP 2

Known: "the" → Target: ?
Answer: "el"? "la"? "los"? "las"? ❌ → FAILS FD, chunk up
```

### Step 2: FCFS Check

**Ask:** "Has this known chunk already been mapped in an earlier seed?"

```
Check extraction history:
- "I think" already mapped?
  - NO → This is FIRST occurrence, extract it ✅
  - YES → FCFS already claimed, chunk up or mark duplicate
```

### Step 3: Extract or Chunk Up

**If FD passes AND FCFS allows:**
```json
{
  "lego_id": "S0001L01",
  "target_chunk": "creo",
  "known_chunk": "I think"
}
```

**If FD fails OR FCFS blocks:**
```json
{
  "lego_id": "S0015L01",
  "target_chunk": "pienso en ti",
  "known_chunk": "I think about you"
}
```

---

## Chunking Up Strategies

When FCFS blocks extraction or FD fails, add context to make it deterministic:

### Strategy 1: Add Object
```
❌ "I like" → "me gustan" (blocked by FCFS or FD)
✅ "I like them" → "me gustan" (chunked up)
```

### Strategy 2: Add Prepositional Phrase
```
❌ "I think" → "pienso" (blocked by FCFS)
✅ "I think about" → "pienso en" (chunked up)
```

### Strategy 3: Add Complement
```
❌ "I am" → "Soy" (blocked by FCFS)
✅ "I am a teacher" → "Soy un profesor" (chunked up)
```

### Strategy 4: Keep Full Phrase
```
❌ "the" → "el" (blocked by FCFS)
✅ "the book" → "el libro" (keep full phrase, don't extract article)
```

---

## Provenance Map Connection

**Phase 5.5 (Deduplication)** creates a provenance map that enforces FCFS:

```json
{
  "S0015F01": "S0001L02"
}
```

**Meaning:**
- `S0015F01` tried to map "the" → "el"
- But `S0001L02` already mapped "the" → "la" (FCFS)
- Mark `S0015F01` as duplicate of `S0001L02`

**In Phase 6 (Introductions):**
```javascript
if (provenanceMap["S0015F01"]) {
  console.log("SKIP S0015F01: duplicate of S0001L02");
  continue; // Don't create introduction for duplicate
}
```

**The provenance map is the enforcement mechanism for FCFS + FD.**

---

## FD + FCFS Validation Checklist

Before approving any LEGO:

- [ ] **FD Test:** Show learner known chunk → exactly ONE target response?
- [ ] **FCFS Check:** Is this the first occurrence of this known chunk?
- [ ] **If FCFS blocked:** Have I chunked up with enough context?
- [ ] **Determinism confirmed:** No possible ambiguity for learner?
- [ ] **Natural language:** Both chunks feel natural in their languages?
- [ ] **Pedagogical value:** Chunk is reusable and generalizable?

---

## Common FD Violations and Fixes

### ❌ Violation 1: Ambiguous Articles

**Bad:**
```
"the" → "el"  (learner doesn't know when to use this vs "la")
```

**Good:**
```
First occurrence:  "the table" → "la mesa" (FCFS claims "la")
Later occurrences: "the book" → "el libro" (full phrase, not just "the")
```

---

### ❌ Violation 2: Ambiguous Verbs

**Bad:**
```
Seed 1: "I think" → "creo" ✅ (FCFS)
Seed 15: "I think" → "pienso" ❌ (violates FCFS)
```

**Good:**
```
Seed 1: "I think" → "creo" ✅ (FCFS claims)
Seed 15: "I think about you" → "pienso en ti" ✅ (chunked up)
```

---

### ❌ Violation 3: Ignoring FCFS

**Bad:**
```
Both extracted as separate LEGOs:
- "I am" → "Estoy"
- "I am" → "Soy"
```

**Good:**
```
FCFS resolution:
- "I am" → "Estoy" ✅ (first occurrence)
- "I am a teacher" → "Soy un profesor" ✅ (chunked up)
```

---

### ❌ Violation 4: Missing Context

**Bad:**
```
"I like" → "me gustan" (learner doesn't know singular vs plural)
```

**Good:**
```
"I like them" → "me gustan" (plural object makes it deterministic)
```

---

## Language-Specific FD Challenges

### Spanish

**Common FD issues:**
- Articles: el/la/los/las
- Verb forms: ser/estar, saber/conocer
- Object pronouns: lo/la/los/las
- Verb conjugations based on subject

**FCFS strategy:** First occurrence claims basic form, chunk up later

---

### Italian

**Common FD issues:**
- Articles: il/lo/la/i/gli/le
- Preposition + article contractions: del/dello/della/etc.
- Verb forms: essere/stare

**FCFS strategy:** Same as Spanish

---

### French

**Common FD issues:**
- Articles: le/la/les
- Contractions: du/de la/des, au/à la/aux
- Verb forms: être/avoir

**FCFS strategy:** Same as Spanish

---

### Mandarin

**Common FD issues:**
- Measure words: 个/只/本/张 (context-dependent)
- Aspect markers: 了/过/着 (semantic differences)
- Question particles: 吗/呢

**FCFS strategy:** First occurrence claims basic form

---

## FD Quick Reference

**Ask yourself:**

1. **Determinism:** Learner sees known chunk → exactly ONE target? ✅
2. **FCFS:** Is this the FIRST time this known chunk appears? ✅
3. **If blocked:** Have I chunked up with enough context? ✅
4. **No ambiguity:** Learner always knows what to say? ✅

**If all YES → EXTRACT**
**If any NO → CHUNK UP or REJECT**

---

## Examples Summary

### ✅ PASSES FD + FCFS

```
"Hello" → "Hola" (deterministic, no alternatives)
"I'm trying" → "Estoy intentando" (deterministic)
"I think" → "creo" (first occurrence, FCFS claims it)
"the table" → "la mesa" (context makes it deterministic)
```

### ❌ FAILS FD

```
"the" → "el" (could be la/los/las)
"I like" → "me gustan" (could be gusta with singular)
"I am" → "Soy" (if "Estoy" already claimed by FCFS)
```

### ✅ CHUNKED UP (FD Restored)

```
"I think about you" → "pienso en ti" (chunked up from "I think")
"I like them" → "me gustan" (chunked up from "I like")
"I am a teacher" → "Soy un profesor" (chunked up from "I am")
"the book" → "el libro" (full phrase instead of just "the")
```

---

**FD = Functionally Deterministic: One known → One target, always**
**FCFS = First Come First Served: First occurrence wins the mapping**
