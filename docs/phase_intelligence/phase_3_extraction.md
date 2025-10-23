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

### 4. BASE vs COMPOSITE (No Separate Feeders)

**Key change from earlier thinking**: No separate FEEDER type in v7.0 compact format.

**Structure**:
- **BASE (B)**: Standalone unit (single word or bonded phrase)
- **COMPOSITE (C)**: Multi-word unit with component array

**Component array purpose**:
- Documents how composite breaks down
- DATA for Phase 6 to generate explanations
- NOT separate LEGOs with their own baskets

**Example**:
```json
["S0002L03", "C", "Sto provando", "I'm trying", [
  ["Sto", "I'm"],
  ["provando", "trying"]
]]
```

**"Sto" and "provando"**:
- Mentioned in component array (for explanation)
- NOT extracted as separate S0002L01, S0002L02
- Componentisation only (no separate baskets)

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
