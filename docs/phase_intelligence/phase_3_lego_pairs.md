# Phase 3: LEGO Extraction Intelligence

**Version**: 2.0 (2025-10-23)
**Status**: Active methodology for all Phase 3 extraction

---

## PHASE SEPARATION: Critical Understanding

### Phase 3 Role: DATA STRUCTURE CREATION
Phase 3 creates **component data**, NOT explanations.

**Output**: Structured arrays showing how composites break down:
```json
["Sto provando", "I'm trying", [
  ["Sto", "I'm"],
  ["provando", "trying"]
]]
```

This is PURE DATA - an interface for later phases to consume.

### Phase 6 Role: EXPLANATION GENERATION (Future)
Phase 6 will READ component arrays and generate intelligent introductions:
> "The Italian for 'I'm trying' as in seed S0002 is **Sto provando** - where **Sto** represents 'I'm', **provando** is 'trying'..."

**Critical**: Phase 3 does NOT write explanations. It structures data for Phase 6 to interpret.

---

## ⚠️ CRITICAL: USE EXTENDED THINKING MODE ⚠️

**LEGO decomposition requires careful reasoning about linguistic structure and pedagogical principles.**

### Why Extended Thinking?

Phase 3 involves:
- Judging what qualifies as "minimum meaningful unit"
- Deciding basic vs composite classification
- Applying preposition wrapping rules
- Ensuring hierarchical component structures are correct
- Balancing granularity with pedagogical utility

**Without extended thinking, you WILL create inconsistent decompositions.**

### How to Use Extended Thinking

**Before decomposing EACH seed, use `<thinking>` tags to reason through:**

1. **Meaningful unit identification**
   ```
   Seed: "Sto provando a imparare"

   Candidate decomposition:
   - "Sto" alone? → NO - meaningless fragment
   - "Sto provando"? → YES - "I'm trying" is meaningful
   - "a" alone? → NO - preposition, meaningless
   - "provando a imparare"? → YES - "trying to learn" is meaningful composite
   ```

2. **Preposition wrapping check**
   ```
   Does decomposition expose bare prepositions on edges?
   "provando" + "a" + "imparare" → YES, "a" is exposed
   Solution: Wrap inside composite → "provando a imparare"
   ```

3. **Component hierarchy reasoning with feeder identification**
   ```
   Composite: "provando a imparare"

   Component analysis:
   - "provando" (trying)
     → Meaningful? YES (gerund, reusable)
     → Should get own basket? YES
     → Decision: FEEDER → ["provando", "trying", "S0002L01a"]
     → Must define: ["S0002L01a", "B", "provando", "trying"]

   - "a" (to)
     → Meaningful? NO (bare preposition)
     → Decision: ATOMIC GLUE → ["a", "to"]

   - "imparare" (to learn)
     → Meaningful? YES (infinitive, reusable)
     → Should get own basket? YES
     → Decision: FEEDER → ["imparare", "to learn", "S0002L01b"]
     → Must define: ["S0002L01b", "B", "imparare", "to learn"]

   Final composite:
   ["S0002L01", "C", "provando a imparare", "trying to learn", [
     ["provando", "trying", "S0002L01a"],
     ["a", "to"],
     ["imparare", "to learn", "S0002L01b"]
   ]]
   ```

4. **FD validation (Feeder Dependency)**
   ```
   Does this LEGO depend on specific previous LEGOs to make sense?
   "con qualcun altro" = "with someone else"

   Can it stand alone? YES - complete prepositional phrase
   Mark as: BASIC (no feeders needed)

   vs.

   "a imparare" = "to learn"
   Can it stand alone? NO - needs verb before it
   Mark as: COMPOSITE with feeder dependency
   ```

### Extended Thinking Protocol

**For EVERY seed decomposition:**
```
<thinking>
1. Identify natural break points in the seed
2. Test each candidate LEGO for meaningfulness
3. Check for exposed prepositions → wrap if found
4. Determine basic vs composite classification
5. For composites: define component structure
6. Validate FD dependencies
7. Document reasoning for complex decisions
</thinking>

[Generate LEGO decomposition output]
```

### Impact on Quality

**Without extended thinking:**
- ~20-30% inconsistent decompositions
- Preposition exposure violations
- Over-granularization (meaningless fragments)
- Incorrect basic/composite classification

**With extended thinking:**
- ~95% consistent decompositions on first pass
- Proper preposition wrapping
- Pedagogically sound minimum meaningful units
- Correct hierarchical structures

**Use extended thinking mode for EVERY seed decomposition.**

---

## CORE EXTRACTION PRINCIPLES

### 1. Minimum Reusable Unit of Meaning

**Heuristic**: Extract the smallest unit that is MEANINGFUL and REUSABLE on its own.

**Why it matters**:
- "Sto" alone has no meaning (always needs context)
- "Sto provando" is minimum meaningful unit
- Don't over-granularize - breaks the learning model

**Examples**:
- ❌ "Sto" (B) - meaningless fragment
- ✅ "Sto provando" (BASE) - minimum meaningful unit
- ❌ "a" (B) - preposition fails FD, meaningless alone
- ✅ "provando a imparare" (COMPOSITE) - wraps "a" inside

**Application**: Before extracting, ask "Would a learner ever use this piece alone meaningfully?"

---

### 2. Preposition Wrapping (ABSOLUTE RULE)

**Problem**: Standalone prepositions violate FD and are meaningless.
- "a" / "to" → FAILS FD (could be a/per/da or embedded in infinitive)
- Exposes preposition on LEGO edges → ambiguity

**Solution**: WRAP prepositions inside COMPOSITE LEGOs.

**Wrapped correctly**:
```
"provando a imparare"
Left edge: "provando"
Right edge: "imparare"
"a" buried in middle (not exposed)
```

**Examples**:
- ✅ "provando a imparare" - "a" wrapped
- ✅ "praticare a parlare" - "a" wrapped
- ✅ "provare a spiegare" - "a" wrapped
- ❌ "provando" + "a" + "imparare" - "a" exposed on edges

**Validation**: Check that no LEGO begins or ends with standalone preposition.

---

### 3. Multiple Composites for Reusability

**Principle**: Create multiple smaller composites instead of one large composite.

**Why**: Maximum reusability across different contexts.

**Example**: "Sto provando a imparare"

❌ **Single composite approach**:
- "Sto provando a imparare" (one giant LEGO)
- Result: Can ONLY be used in this exact combination

✅ **Multiple composites approach**:
1. "provando" (BASE) - reusable with modifiers
2. "imparare" (BASE) - reusable infinitive
3. "Sto provando" (COMPOSITE) - reusable with other actions
4. "provando a imparare" (COMPOSITE) - reusable with other subjects

**Result**:
- "Sto provando" + "a ricordare" ✓
- "Sto provando" + "a spiegare" ✓
- Other verb + "provando a imparare" ✓

**Rule**: If two pieces will appear in different combinations, extract both as separate composites.

---

### 4. BASE vs COMPOSITE with Explicit Feeders

**Structure**:
- **BASE (B)**: Standalone unit (single word or bonded phrase)
- **COMPOSITE (C)**: Multi-word unit with component array

**Component arrays MUST distinguish THREE types of elements:**

#### Type 1: Atomic Glue (no third element)
Words providing structure but not needing separate teaching.
```json
["tan", "as"]  // Just a word
["de", "of"]   // Preposition glue
```

#### Type 2: Feeders (third element = LEGO ID)
Meaningful chunks needing their own basket BEFORE use in parent composite.
```json
["a menudo", "often", "S0003L02a"]  // ← Feeder with ID
```
**This feeder MUST be defined as separate LEGO in output.**

#### Type 3: Nested Composites (third element = LEGO ID, defined as composite)
Complex chunks that are themselves composites.
```json
["como sea posible", "as possible", "S0003L02b"]  // ← References nested composite

// Defined elsewhere:
["S0003L02b", "C", "como sea posible", "as possible", [
  ["como", "as"],
  ["sea", "it may be"],
  ["posible", "possible"]
]]
```

---

### CRITICAL: Feeder Identification Protocol

**For EACH component in composite, ask:**

1. **Is it just structural glue?** (bare articles/prepositions/conjunctions)
   → NO third element

2. **Is it meaningful and reusable alone?**
   → YES - add third element (LEGO ID), define as separate LEGO

3. **Does it need its own component breakdown?**
   → YES - define as nested COMPOSITE with feeders

**Example Decision Process:**

Composite: "tan a menudo como sea posible" (as often as possible)

- "tan" (as) → Structural glue → `["tan", "as"]`
- "a menudo" (often) → Meaningful adverb, reusable → `["a menudo", "often", "S0003L02a"]` + define `["S0003L02a", "B", "a menudo", "often"]`
- "como sea posible" (as possible) → Complex phrase, needs breakdown → `["como sea posible", "as possible", "S0003L02b"]` + define `["S0003L02b", "C", ...]`

---

### Complete Example with Explicit Feeders

**Seed S0003**: "cómo hablar tan a menudo como sea posible"

```json
["S0003", ["cómo hablar tan a menudo como sea posible", "how to speak as often as possible"], [
  ["S0003L01", "B", "cómo", "how"],
  ["S0003L02", "C", "tan a menudo como sea posible", "as often as possible", [
    ["tan", "as"],  // Atomic glue (no ID)
    ["a menudo", "often", "S0003L02a"],  // Feeder (with ID)
    ["como sea posible", "as possible", "S0003L02b"]  // Feeder (with ID)
  ]],
  ["S0003L02a", "B", "a menudo", "often"],  // Feeder definition
  ["S0003L02b", "C", "como sea posible", "as possible", [  // Nested composite
    ["como", "as"],
    ["sea", "it may be"],
    ["posible", "possible"]
  ]]
]]
```

**Teaching sequence established:**
1. S0003L01: "cómo" (how)
2. S0003L02a: "a menudo" (often) ← Taught BEFORE parent
3. S0003L02b: "como sea posible" (as possible) ← Taught BEFORE parent
4. S0003L02: "tan a menudo como sea posible" ← Uses feeders

---

### Why Explicit Feeder IDs Matter

**WITHOUT feeder IDs (AMBIGUOUS):**
```json
["S0003L02", "C", "tan a menudo como sea posible", "as often as possible", [
  ["tan", "as"],
  ["a menudo", "often"],  // ← Glue or feeder? UNCLEAR
  ["como sea posible", "as possible"]  // ← Gets basket? UNCLEAR
]]
```
Phase 5 cannot determine teaching sequence or validate vocabulary constraints.

**WITH feeder IDs (EXPLICIT):**
```json
["S0003L02a", "B", "a menudo", "often"]  // ← Gets basket, taught first
["S0003L02", "C", ..., [
  ["a menudo", "often", "S0003L02a"]  // ← References feeder
]]
```
Phase 5 knows:
- S0003L02a gets own basket
- S0003L02a taught before S0003L02
- "a menudo" is available vocabulary when teaching S0003L02

---

## EXTRACTION PATTERNS (Italian for English)

### Pattern 1: "verb + a + infinitive"
Always wrap as COMPOSITE:
- "provando a imparare" (trying to learn)
- "praticare a parlare" (to practise speaking)
- "provare a spiegare" (to try to explain)

**Why**: "a" fails FD, must be wrapped.

### Pattern 2: Article + Noun
Bond as single BASE:
- "una parola" (a word) - prevents gender ambiguity
- "tutta la frase" (the whole sentence) - prevents double ambiguity
- "con te" (with you) - prevents pronoun ambiguity

**Why**: Separate articles fail FD (un/una gender-marked).

### Pattern 3: Superlative Construction
Extract as COMPOSITE:
- "il più spesso possibile" (as often as possible)
- "il più possibile" (as much as possible)

**Why**: "il più" and "possibile" are fragments alone; pattern is reusable.

### Pattern 4: Negative Expression
Extract as COMPOSITE:
- "Non sono sicuro" (I'm not sure)
  - Components: "Non" (not), "sono" (I am), "sicuro" (sure)

**Why**: Complete idiomatic expression; components explain breakdown.

---

## VALIDATION CHECKLIST

Before finalizing extraction:

1. **FD Compliance**:
   - ✓ Every LEGO passes FD_LOOP test
   - ✓ No standalone prepositions exposed
   - ✓ No gender-marked articles without nouns

2. **Minimum Unit Test**:
   - ✓ Each LEGO is meaningful on its own
   - ✓ No over-granularization (no "Sto", "a" fragments)

3. **Preposition Wrapping**:
   - ✓ All prepositions buried inside composites
   - ✓ No LEGO edges expose "a", "per", "di", etc.

4. **Reusability**:
   - ✓ Multiple composites extracted (not single large one)
   - ✓ Each composite appears in different contexts

5. **Component Arrays**:
   - ✓ Composites have component breakdown
   - ✓ Components are DATA (not separate LEGOs)

---

## EXAMPLES FROM S0001-S0010

### S0001: High-composability BASE LEGOs
```
"Voglio parlare italiano con te adesso."
→ 5 BASE LEGOs:
  - "Voglio" (I want)
  - "parlare" (to speak)
  - "italiano" (Italian)
  - "con te" (with you - bonded)
  - "adesso" (now)
```

### S0002: Multiple composites with wrapping
```
"Sto provando a imparare."
→ 2 BASE + 2 COMPOSITE:
  - "provando" (BASE)
  - "imparare" (BASE)
  - "Sto provando" (COMPOSITE) - Components: Sto, provando
  - "provando a imparare" (COMPOSITE) - Components: provando, a, imparare
```

### S0010: Negative expression + bonding
```
"Non sono sicuro se posso ricordare tutta la frase."
→ 4 BASE + 1 COMPOSITE:
  - "posso" (BASE)
  - "se" (BASE)
  - "ricordare" (BASE)
  - "tutta la frase" (BASE - bonded)
  - "Non sono sicuro" (COMPOSITE) - Components: Non, sono, sicuro
```

---

## ANTI-PATTERNS (Don't Do This)

### ❌ Over-granularization
```
"Sto" (B) - "I'm"
"provando" (B) - "trying"
```
**Problem**: "Sto" is meaningless alone, violates minimum unit principle.

### ❌ Exposed prepositions
```
"provando" (B)
"a" (B)
"imparare" (B)
```
**Problem**: "a" fails FD, exposed on edges.

### ❌ Single large composite
```
"Sto provando a imparare" (C) - only composite
```
**Problem**: Not reusable in other combinations.

### ❌ Writing explanations in Phase 3
```markdown
The learner will see that "Sto" means "I'm" and combines with gerunds...
```
**Problem**: This is Phase 6's job. Phase 3 only creates component arrays.

---

## VERSION HISTORY

**v2.0 (2025-10-23)**:
- Added minimum reusable unit principle
- Clarified preposition wrapping rule
- Documented multiple composites strategy
- Removed FEEDER type (v7.0 compact format)
- Clarified Phase 3/Phase 6 separation

**v1.0 (2025-10-15)**:
- Initial extraction rules
- FD compliance focus
- FCFS semantic priority

---

**Next Update**: Capture Phase 6 introduction generation intelligence when that phase is implemented.
