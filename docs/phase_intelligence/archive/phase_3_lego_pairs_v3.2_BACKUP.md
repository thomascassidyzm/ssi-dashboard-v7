# Phase 3: LEGO Extraction Intelligence

**Version**: 3.2 (2025-10-26)
**Status**: Active methodology for all Phase 3 extraction

---

## 🚨 PRE-FLIGHT CHECK (READ BEFORE STARTING) 🚨

**Before decomposing ANY seeds, acknowledge these ABSOLUTE RULES:**

### ❌ NEVER CREATE:

1. **Standalone prepositions as BASE LEGOs**
   ```
   ❌ WRONG: ["S0004L03", "B", "en", "in"]
   ✅ RIGHT: Wrap inside composite "en español" (in Spanish)
   ```

2. **Auxiliary verbs without main verbs**
   ```
   ❌ WRONG: ["S0002L01", "B", "Estoy", "I am"]
   ✅ RIGHT: ["S0002L01", "C", "Estoy intentando", "I'm trying"]
   ```

3. **Negation markers alone**
   ```
   ❌ WRONG: ["S0010L01", "B", "No", "not"]
   ✅ RIGHT: ["S0010L01", "C", "No estoy seguro", "I'm not sure"]
   ```

4. **Object pronouns alone (when verb-attached)**
   ```
   ❌ WRONG: ["S0011L01", "B", "Me", "me"]
   ✅ RIGHT: ["S0011L01", "C", "Me gustaría", "I would like"]
   ```

5. **Gender-marked articles without nouns**
   ```
   ❌ WRONG: ["S0006L02", "B", "una", "a"]
   ✅ RIGHT: ["S0006L02", "B", "una palabra", "a word"]
   ```

6. **Parts of multi-word verb constructions**
   ```
   ❌ WRONG: ["S0012L03", "B", "va", "goes"] + ["S0012L04", "B", "a", "to"]
   ✅ RIGHT: ["S0012L03", "C", "va a", "is going to"]
   ```

### ✅ ALWAYS DO:

1. **Ask: "Would a learner use this piece alone meaningfully?"**
   - If NO → It's not a valid BASE LEGO

2. **Check LEGO edges for exposed prepositions**
   - If found → Wrap inside composite

3. **Bond gender-marked articles with nouns**
   - "una palabra" (not "una" + "palabra")
   - "la frase" (not "la" + "frase")
   - "el día" (not "el" + "día")

4. **Run validation loop BEFORE outputting files**
   - See VALIDATION LOOP section below

---

## Core Philosophy

**The fundamental question**: Where do we draw the line between LEGOs?

This is the deepest intellectual challenge of the SSi method. The boundary decision determines:
- How many LEGOs learners must memorize
- How productively LEGOs recombine
- How much cognitive load each combination requires
- Whether functional determinism can be maintained

**The answer**: Use systematic heuristics to find boundaries that maximize recombination while minimizing cognitive load and maintaining functional determinism.

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
- Applying substitutability tests
- Calculating recombination power
- Ensuring functional determinism
- Balancing granularity with pedagogical utility

**Without extended thinking, you WILL create inconsistent decompositions.**

### How to Use Extended Thinking

**Before decomposing EACH seed, use `<thinking>` tags to reason through:**

1. **Substitutability testing**
   ```
   Seed: "Quiero hablar español"

   Test: Can we substitute after "Quiero"?
   - "Quiero hablar" ✓
   - "Quiero aprender" ✓
   - "Quiero practicar" ✓

   Conclusion: Boundary after "Quiero"
   → Creates LEGO: "Quiero" (highly recombinable)
   ```

2. **Recombination power analysis**
   ```
   "hablar" (to speak) appears with:
   - Quiero hablar
   - Voy a hablar
   - Puedo hablar
   - Intento hablar

   High recombination → Keep as atomic LEGO
   ```

3. **Glue word detection**
   ```
   Known: "I'm going to speak"
   Target: "voy a hablar"

   The "a" doesn't exist in English surface
   It's required by Spanish grammar

   Solution: COMPOSITE LEGO
   "voy a hablar" (glue word embedded)
   ```

4. **Functional determinism validation**
   ```
   Does "hablar" always produce "hablar"? YES
   Does "quiero" always produce "quiero"? YES

   Determinism maintained ✓
   ```

### Extended Thinking Protocol

**For EVERY seed decomposition:**
```
<thinking>
1. Apply Substitutability Test - where can elements swap?
2. Calculate Recombination Power - how reusable is each piece?
3. Check for Glue Words - any words missing from surface structure?
4. Test Functional Determinism - one input = one output?
5. Identify Form Changes - any unpredictable morphology?
6. Apply Five Quality Questions
7. Check Red Flags for wrong boundaries

8. **CRITICAL ERROR CHECK** (scan every LEGO before finalizing):
   ❌ Any standalone prepositions? (en, de, con, a, per, di, etc.)
   ❌ Any auxiliary verbs alone? (Estoy, va, voy, etc.)
   ❌ Any negation markers alone? (No, non, ne, etc.)
   ❌ Any pronouns alone? (Me, te, se, etc.)
   ❌ Any articles without nouns? (una, la, el, un, etc.)
   ❌ Any incomplete verb phrases? (va + a separately)

9. If ANY errors found → regenerate that LEGO as COMPOSITE or bonded unit
10. Document reasoning for complex decisions
</thinking>

[Generate LEGO decomposition output]
```

**MANDATORY**: If Extended Thinking detects ANY of the error patterns in step 8, you MUST regenerate the problematic LEGO before outputting files.

---

## Part 1: The LEGO Boundary Decision Framework

### 1. The Substitutability Test

**Core heuristic**: Draw a LEGO boundary where you can substitute different elements.

**Example:**
```
"I want to speak"

Test: Can we substitute after "I want to"?
- "I want to speak" ✓
- "I want to learn" ✓
- "I want to remember" ✓
- "I want to practise" ✓

Conclusion: Boundary after "I want to"
→ Creates LEGO: "I want to" (highly recombinable)

Test: Can we substitute before "speak"?
- "I want to speak" ✓
- "I'm going to speak" ✓
- "I need to speak" ✓
- "I'd like to speak" ✓

Conclusion: Boundary before "speak"
→ Creates LEGO: "to speak" (highly recombinable)
```

**Counter-example:**
```
"I'm trying to"

Test: Can we substitute before "to"?
- "I'm trying to speak" ✓
- "I'm trying speak" ✗ (ungrammatical)
- "I'm trying now" ✗ (doesn't work)

Conclusion: Boundary must be AFTER "to"
→ LEGO is "I'm trying to" (not "I'm trying")
```

**The principle**: Boundaries should align with **syntactic substitutability** in the known language.

---

### 2. The Recombination Power Metric

**Question**: How many different contexts will this LEGO appear in?

**High recombination = atomic LEGO preferred:**
```
"to speak" appears with:
- I want to speak
- I'm going to speak
- I need to speak
- I can speak (no "to" in target, but concept is same)
- I'd like to speak
- I'm trying to speak

High recombination → Keep as atomic LEGO
```

**Low recombination = composite LEGO acceptable:**
```
"you to speak" only appears with:
- I want you to speak
- I need you to speak
- I'd like you to speak
- I expect you to speak

Lower frequency → Can be composite
Especially since target structure diverges (subjunctive)
```

**The principle**: **High-frequency elements should be maximally atomic** (more recombination opportunities). **Low-frequency elements can be chunked larger** (less recombination needed, reduces total LEGO count).

---

### 3. The Cognitive Load Calculation

**Smaller LEGOs:**
- Advantage: More flexible, more recombination
- Disadvantage: Require assembly, more mental steps

**Larger LEGOs:**
- Advantage: Pre-assembled, faster production
- Disadvantage: Less flexible, more to memorize

**The optimal balance:**
```
For "I'm going to speak":

Option A: [I'm going to] + [speak]
- Problem: "voy a" is incomplete thought
- Problem: "speak" without "to" is ambiguous form

Option B: [I'm going] + [to speak]
- Problem: Glue word "a" missing (doesn't tile!)

Option C: [I'm going to speak] (composite)
- Learner memorizes: entire phrase → "voy a hablar"
- Production: One retrieval step
- Advantage: Includes glue word "a"
- Advantage: Pre-assembled future construction

Decision: Option C + FEEDERs
- Teach "voy" separately (as motion verb)
- Teach "hablar" separately (as infinitive)
- Then present composite "voy a hablar"
- Learner sees relationship but produces as unit
```

**The insight**: When FEEDERs don't tile to make the composite (due to glue words, word order, or form changes), use a COMPOSITE LEGO. The FEEDERs provide vocabulary familiarity; the COMPOSITE provides production pattern.

---

### 4. Functional Determinism Preservation

**The non-negotiable rule**: Each LEGO must map to exactly one target form in its context of use.

**Where this gets subtle:**
```
"to speak" in different contexts:

Context 1: "I want to speak"
Known: "to speak"
Target: "hablar" (infinitive)
✓ Deterministic

Context 2: "I'm going to speak"
Known: "to speak"
Target: "hablar" (still infinitive)
✓ Same form, still deterministic

Context 3: "you to speak" (in "I want you to speak")
Known: "you to speak"
Target: "hables" (subjunctive!)
✗ NOT the same as "hablar"

Decision: "you to speak" must be DIFFERENT LEGO
Because it produces different form (hables ≠ hablar)
```

**The principle**: **If the target form changes, it's a different LEGO**, even if the known form looks similar.

---

### 5. The Glue Word Problem

**Recognition**: Target language requires words that don't exist in known language surface form.

**Example 1:**
```
Known: "I'm going to speak"
Target (ES): "voy a hablar"

The "a" doesn't come from "I'm going" or "to speak"
It's required by Spanish grammar (preposition before infinitive after motion verb)

Solution: COMPOSITE LEGO
"I'm going to speak" → "voy a hablar" (glue word embedded)
```

**Example 2:**
```
Known: "I want you to speak"
Target (ES): "quiero que hables"

The "que" doesn't exist in English surface
It's required by Spanish grammar (complementizer before subjunctive)

Solution: COMPOSITE LEGO
"I want you to speak" → "quiero que hables" (glue word embedded)
```

**The principle**: **Glue words are evidence you need a COMPOSITE.** Don't try to make FEEDERs tile when glue words are required - the composite handles it.

---

### 6. The Word Order Divergence Decision

**When word order differs, you have two options:**

**Option 1: Teach target order through COMPOSITE (SSi choice)**
```
Known: "a blue book"
Target (ES): "un libro azul"

COMPOSITE: "a blue book" → "un libro azul"
(presented as single unit, order is embedded)

FEEDERs:
- "blue" → "azul" (vocabulary)
- "book" → "libro" (vocabulary)

FEEDERs don't tile: "un azul libro" is wrong
COMPOSITE provides correct order
```

**Option 2: Adjust known language to match target order**
```
Known: "a book blue" (adjusted)
Target (ES): "un libro azul"

Now atomics can work:
"a book" → "un libro"
"blue" → "azul"

Problem: "a book blue" is unnatural English
Advantage: Shows learner the target structure explicitly
```

**SSi choice: Option 1** (natural known language, COMPOSITE handles divergence)

**Reasoning**:
- Keep known language natural (learner is already fluent in it)
- Target language structure is what needs to be learned
- COMPOSITE presents "this English pattern produces this target pattern"
- Learner infers structure through pattern exposure, not explicit teaching

---

### 7. The Form Change Decision

**Critical insight**: If target requires a different grammatical form (not predictable from known), it's a COMPOSITE.

**Example 1: Subjunctive trigger**
```
Known: "I want you to speak"
Analysis:
- "I want" → "quiero" (indicative)
- "you to speak" → needs subjunctive "hables"

Why subjunctive? Spanish grammar: desire verb + different subject = subjunctive

This is NOT predictable from English!

Solution: COMPOSITE
"you to speak" → "hables" (form change embedded)
```

**Example 2: Aspect selection**
```
Known: "I was speaking"
Target (ES): Could be "hablaba" (imperfect) or "hablé" (preterite)

The English doesn't specify which aspect!

Solution: Choose most common/default for SEED context
Document choice for consistency (Phase 1 vocabulary registry)
This becomes the deterministic mapping
```

**The principle**: **Unpredictable form changes require COMPOSITEs.** If the learner can't deduce the form from the known language, make it a pre-packaged unit.

---

## Part 2: Core Extraction Principles

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

### 3. The "Keep It Together" Rule

**When elements must co-occur in the target language, keep them together in a LEGO.**

**Example:**
```
Known: "you to speak" (in "I want you to speak")

Analysis:
- "you to" triggers subjunctive in Spanish
- "speak" becomes "hables" (not "hablar")
- The subjunctive is triggered by "you to" construction
- Can't separate "you to" from the verb

Solution: "you to speak" as single LEGO → "hables"

Why not break it down?
- "you to" → ??? (incomplete, doesn't mean anything alone)
- "speak" → "hablar" (but this is wrong form!)

The subjunctive IS the construction
Can't atomize further without losing the grammar
```

**Counter-example:**
```
Known: "I want to speak"

Analysis:
- "I want" → "quiero" (works independently)
- "to speak" → "hablar" (works independently)
- They tile: "quiero hablar" ✓
- No hidden dependencies

Solution: Keep as two atomic LEGOs
Maximum recombination potential
```

**The principle**: **If separating elements would break functional determinism (produce wrong forms), keep them together.**

---

### 4. The Ambiguity Avoidance Principle

**Rule**: If a known form is ambiguous about which target form to produce, it cannot be an atomic LEGO.

**Example 1: Verb form ambiguity**
```
Known: "speak" (bare form)

Could mean:
- Infinitive: "to speak" → "hablar"
- Imperative: "Speak!" → "¡Habla!"
- Present tense: "I speak" → "hablo"

Solution: Include disambiguating context in LEGO
- "to speak" → "hablar" (infinitive clear)
- "Speak!" → "¡Habla!" (imperative clear)
- "I speak" → "hablo" (conjugated form clear)

Never just "speak" alone
```

**Example 2: Demonstrative ambiguity**
```
Known: "that"

Could mean:
- Demonstrative: "that book" → "ese libro"
- Complementizer: "I think that..." → "Creo que..."
- Relative: "the book that..." → "el libro que..."

Solution: Different LEGOs for each
- "that [noun]" → demonstrative LEGO
- "I think that" → complementizer embedded in composite
- "[noun] that" → relative embedded in composite
```

**The principle**: **Functional determinism requires unambiguous known forms.** Include enough context in the LEGO to eliminate ambiguity.

---

### 5. Multiple Composites for Reusability

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

## Part 3: BASE vs COMPOSITE with Explicit Feeders

### Structure
- **BASE (B)**: Standalone unit (single word or bonded phrase)
- **COMPOSITE (C)**: Multi-word unit with component array

### Component arrays MUST distinguish THREE types of elements:

#### Type 1: Atomic Glue (no third element)
Words providing structure but not needing separate teaching.
```json
["tan", "as"]  // Just a word
["de", "of"]   // Preposition glue
```

#### Type 2: Feeders (third element = LEGO ID)
Meaningful chunks needing their own basket BEFORE use in parent composite.
```json
["frecuentemente", "frequently", "S0003L02a"]  // ← Feeder with ID (cognate!)
```
**This feeder MUST be defined as separate LEGO in output.**

**Note**: Example uses "frecuentemente" (cognate) not "a menudo" (idiomatic) because seed 3 is in seeds 1-100 range where cognate preference applies.

#### Type 3: Nested Composites (third element = LEGO ID, defined as composite)
Complex chunks that are themselves composites.
```json
["posible", "possible"]  // ← Simple atomic glue (cognate, no breakdown needed)

// For more complex composites:
["algo importante", "something important", "S0005L03b"]  // ← References nested composite

// Defined elsewhere:
["S0005L03b", "C", "algo importante", "something important", [
  ["algo", "something"],
  ["importante", "important"]
]]
```

**Note**: "posible" is cognate and simple enough to be atomic glue. Earlier examples incorrectly showed "como sea posible" with subjunctive - avoid subjunctive in seeds 1-50.

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

Composite: "lo más frecuentemente posible" (as frequently as possible)

**Context**: Seed 3 (in seeds 1-100 range) → Cognate preference applies + Avoid subjunctive

- "lo más" (as/the most) → Superlative pattern, high recombination → `["lo más", "as", "S0003L02c"]` + define `["S0003L02c", "B", "lo más", "as / the most"]`
- "frecuentemente" (frequently) → Meaningful adverb, reusable, COGNATE → `["frecuentemente", "frequently", "S0003L02a"]` + define `["S0003L02a", "B", "frecuentemente", "frequently"]`
- "posible" (possible) → Meaningful adjective, reusable, COGNATE → `["posible", "possible", "S0003L02b"]` + define `["S0003L02b", "B", "posible", "possible"]`

**Why not "tan a menudo como sea posible"?**
- "a menudo" = not cognate (idiomatic Spanish)
- "como sea posible" = uses subjunctive ("sea"), too complex for seed 3
- Phase 1 chose "frecuentemente" (cognate) and "lo más...posible" (no subjunctive)

---

### Why Explicit Feeder IDs Matter

**WITHOUT feeder IDs (AMBIGUOUS):**
```json
["S0003L04", "C", "lo más frecuentemente posible", "as frequently as possible", [
  ["lo más", "as"],  // ← Glue or feeder? UNCLEAR
  ["frecuentemente", "frequently"],  // ← Gets basket? UNCLEAR
  ["posible", "possible"]  // ← Gets basket? UNCLEAR
]]
```
Phase 5 cannot determine teaching sequence or validate vocabulary constraints.

**WITH feeder IDs (EXPLICIT):**
```json
["S0003L04a", "B", "posible", "possible"]  // ← Gets basket, taught first
["S0003L04b", "B", "frecuentemente", "frequently"]  // ← Gets basket, taught second
["S0003L04c", "B", "lo más", "as / the most"]  // ← Gets basket, taught third
["S0003L04", "C", "lo más frecuentemente posible", "as frequently as possible", [
  ["lo más", "as", "S0003L04c"],  // ← References feeder
  ["frecuentemente", "frequently", "S0003L04b"],  // ← References feeder
  ["posible", "possible", "S0003L04a"]  // ← References feeder
]]
```
Phase 5 knows:
- S0003L04a, S0003L04b, S0003L04c get own baskets
- All feeders taught before S0003L04
- All vocabulary is available when teaching composite
- Learner already practiced all three pieces

---

## Part 4: The Five Quality Questions

**For every LEGO boundary decision, ask:**

### 1. Is this functionally deterministic?
```
Can this known form map to exactly one target form in its context?
If NO → Adjust boundary or create context-specific variants
```

### 2. Does this maximize recombination?
```
Will this LEGO appear with many different partners?
If YES → Prefer atomic
If NO → Can be larger chunk
```

### 3. Is this the minimal cognitive load?
```
Is this the simplest mapping that maintains determinism?
Could we chunk larger without losing recombination?
Could we chunk smaller without creating ambiguity?
```

### 4. Does this respect linguistic structure?
```
Does the boundary align with natural syntactic constituents?
Or are we cutting through the middle of a construction?
```

### 5. Is this consistent with our existing LEGOs?
```
Have we made similar decisions for parallel cases?
Does this fit the pattern we've established?
```

---

## Part 5: Red Flags for Wrong Boundaries

### Red Flag 1: Can't tile
```
If FEEDERs are supposed to tile but don't → Need COMPOSITE
Example: "voy" + "hablar" ≠ "voy a hablar"
The glue word "a" indicates COMPOSITE needed
```

### Red Flag 2: Ambiguous form
```
If known form could mean multiple things → Need more context in LEGO
Example: "speak" alone is ambiguous
Need: "to speak" (infinitive), "I speak" (present), etc.
```

### Red Flag 3: Low recombination with high granularity
```
If you split something very fine but it only appears in 2 contexts
→ Too granular, chunk it larger
Example: "in the first place" used once → Don't split into 4 LEGOs
```

### Red Flag 4: Breaking grammatical dependencies
```
If separating elements causes wrong form in target
→ Keep together
Example: Can't separate "you to" from "speak" when it triggers subjunctive
```

### Red Flag 5: Inconsistent with parallel cases
```
If you treated similar structures differently
→ Align the decisions
Example: If "I want to" is one LEGO, then "I need to" should also be one LEGO
```

---

## VALIDATION LOOP (MANDATORY)

After decomposing all seeds, you MUST run this validation pass:

### Step 1: Over-Granularization Check

**For EACH BASE LEGO, ask: "Would a learner ever use this piece alone meaningfully?"**

**Common Over-Granularization Errors:**

1. **Auxiliary verbs without main verb (Spanish/Italian)**
   - ❌ "Estoy" (B) - meaningless without gerund
   - ✅ "Estoy intentando" (C) - complete meaningful unit

2. **Negation markers alone**
   - ❌ "No" (B) - learner can't use alone in context
   - ✅ "No estoy seguro" (C) - complete negative expression

3. **Pronoun subjects alone (when verb inflection shows subject)**
   - ❌ "Me" (B) - incomplete without verb
   - ✅ "Me gustaría" (C) - complete expression

4. **Parts of verb phrases**
   - ❌ "va" (B) alone + "a" (B) alone
   - ✅ "va a" (C) - complete future construction

**Article + Noun Bonding Rules:**

**MUST bond when article is gender-marked:**
- ✅ "una palabra" (B) - prevents "un palabra" error
- ✅ "la frase" (B) - prevents article confusion
- ✅ "el día" (B) - prevents "la día" error

**Can separate when article is not gender-specific:**
- ✓ "los" + "días" - learner can recombine
- But bonding is safer - prefer bonding for early seeds (1-100)

### Step 2: Substitutability Validation

**For EACH LEGO boundary:**
- Can we substitute elements on either side?
- If NO → Wrong boundary, should be composite

### Step 3: Glue Word Detection

**For EACH COMPOSITE:**
- Are there target words not present in known surface?
- If YES → Validate composite wraps them correctly
- If NO → Could this be atomic LEGOs instead?

### Step 4: Feeder Completeness Check

**For EACH composite with components:**
- Does component have third element (LEGO ID)? → Check that LEGO is defined
- Is it atomic glue (no third element)? → Verify it's truly structural
- Are all feeders defined as separate LEGOs before use?

### Step 5: FD Compliance Check

**For EACH LEGO:**
- Can learner use it alone in a sentence without prior context?
- Does it have a complete meaning independently?
- Does it always produce the same target form?
- If NO to any → it's wrong, regenerate

### Step 6: Apply Five Quality Questions

**For EACH seed decomposition:**
- Run through all 5 quality questions
- Check for any red flags
- Ensure consistency with previous seeds

### Step 7: Final Review

**After validation loops, regenerate ANY seeds that failed:**
- Over-granularization detected → merge fragments into composites
- Missing feeder definitions → add them
- Exposed prepositions → wrap in composites
- Unbonded articles → bond with nouns
- Failed substitutability test → adjust boundaries
- Glue words not wrapped → create composites

### 🛑 STOP AND FIX BEFORE OUTPUTTING FILES 🛑

**Scan ENTIRE output for these BLOCKING ERRORS:**

```python
# Pseudo-code validation (run mentally or actually):
for lego in all_legos:
    if lego.type == "B":
        # Check 1: Standalone prepositions
        if lego.target in ["en", "de", "con", "a", "per", "di", "dans", "à", "sur", "para"]:
            ERROR: f"LEGO {lego.id} is standalone preposition '{lego.target}'"
            ACTION: "Wrap inside composite or remove"

        # Check 2: Articles without nouns
        if lego.target in ["una", "la", "el", "un", "lo", "los", "las"]:
            ERROR: f"LEGO {lego.id} is standalone article '{lego.target}'"
            ACTION: "Bond with following noun"

        # Check 3: Auxiliary verbs alone
        if lego.target in ["Estoy", "estoy", "va", "voy", "Voy", "está", "están"]:
            ERROR: f"LEGO {lego.id} is incomplete verb construction '{lego.target}'"
            ACTION: "Combine with main verb in composite"

        # Check 4: Negation alone
        if lego.target in ["No", "no", "non", "ne"]:
            ERROR: f"LEGO {lego.id} is standalone negation '{lego.target}'"
            ACTION: "Combine with verb/expression in composite"

        # Check 5: Pronouns alone
        if lego.target in ["Me", "me", "Te", "te", "Se", "se"]:
            ERROR: f"LEGO {lego.id} is standalone pronoun '{lego.target}'"
            ACTION: "Combine with verb in composite"

# If ANY errors found:
if errors_found:
    STOP()
    REGENERATE_FAILED_LEGOS()
    RERUN_VALIDATION()
else:
    PROCEED_TO_FILE_OUTPUT()
```

**Only proceed to file output when ZERO blocking errors remain.**

---

## VALIDATION CHECKLIST

Summary of required checks:

1. **FD Compliance**:
   - ✓ Every LEGO passes FD_LOOP test
   - ✓ No standalone prepositions exposed
   - ✓ No gender-marked articles without nouns

2. **Minimum Unit Test**:
   - ✓ Each LEGO is meaningful on its own
   - ✓ No over-granularization (no "Estoy", "Me", "va" fragments)

3. **Preposition Wrapping**:
   - ✓ All prepositions buried inside composites
   - ✓ No LEGO edges expose "a", "per", "di", "de", etc.

4. **Substitutability**:
   - ✓ LEGO boundaries align with substitution points
   - ✓ Elements can be swapped at boundaries

5. **Glue Words**:
   - ✓ Target-only words wrapped in composites
   - ✓ No missing structural words

6. **Reusability**:
   - ✓ Multiple composites extracted (not single large one)
   - ✓ Each composite appears in different contexts
   - ✓ High-frequency elements kept atomic

7. **Component Arrays**:
   - ✓ Composites have component breakdown with explicit feeder IDs
   - ✓ All feeders defined as separate LEGOs
   - ✓ Atomic glue has no third element

8. **Five Quality Questions**:
   - ✓ All LEGOs pass all 5 quality questions
   - ✓ No red flags present

---

## EXAMPLES FROM S0001-S0010

### S0001: High-composability BASE LEGOs
```
"Voglio parlare italiano con te adesso."
→ 5 BASE LEGOs:
  - "Voglio" (I want) - high recombination
  - "parlare" (to speak) - high recombination
  - "italiano" (Italian) - high recombination
  - "con te" (with you - bonded) - prevents pronoun ambiguity
  - "adesso" (now) - high recombination
```

### S0002: Multiple composites with wrapping
```
"Sto provando a imparare."
→ 2 BASE + 2 COMPOSITE:
  - "provando" (BASE) - feeder for composite
  - "imparare" (BASE) - feeder for composite
  - "Sto provando" (COMPOSITE) - glue "Sto" wrapped
  - "provando a imparare" (COMPOSITE) - glue "a" wrapped
```

### S0010: Negative expression + bonding
```
"Non sono sicuro se posso ricordare tutta la frase."
→ 4 BASE + 1 COMPOSITE:
  - "posso" (BASE)
  - "se" (BASE)
  - "ricordare" (BASE)
  - "tutta la frase" (BASE - bonded, prevents article ambiguity)
  - "Non sono sicuro" (COMPOSITE) - complete idiomatic expression
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

### ❌ Failed substitutability
```
"I'm trying" split as "I'm" + "trying"
But "I'm" can't stand alone grammatically
```
**Problem**: Boundary doesn't align with substitution point.

### ❌ Missing glue words
```
"voy" (B) + "hablar" (B) = "voy hablar"
```
**Problem**: Missing "a", should be composite "voy a hablar".

### ❌ Writing explanations in Phase 3
```markdown
The learner will see that "Sto" means "I'm" and combines with gerunds...
```
**Problem**: This is Phase 6's job. Phase 3 only creates component arrays.

---

## VERSION HISTORY

**v3.2 (2025-10-26)**:
- **CRITICAL**: Added PRE-FLIGHT CHECK section at top with explicit ❌ NEVER CREATE examples
- Added STOP AND FIX validation gate with pseudo-code error checking
- Strengthened Extended Thinking protocol with CRITICAL ERROR CHECK (step 8)
- Added mandatory regeneration requirement if errors detected
- Made blocking errors absolutely unmissable for fresh Claude Code sessions
- Addresses persistent over-granularization issues in spa_for_eng_20seeds test

**v3.1 (2025-10-26)**:
- Updated all examples to use cognates (frecuentemente > a menudo)
- Updated examples to use simpler structures (lo más...posible > como sea posible)
- Added notes explaining why examples use cognates and avoid subjunctive
- Corrected S0003 example to align with Phase 1 methodology
- Added context notes: "Seed 3 in seeds 1-100 range → Cognate preference applies"
- Emphasized alignment between Phase 1 translation choices and Phase 3 decomposition

**v3.0 (2025-10-26)**:
- Complete methodology overhaul based on SSi LEGO Boundary Methodology document
- Added full boundary decision framework (Substitutability Test, Recombination Power, Cognitive Load)
- Added Five Quality Questions for systematic decision-making
- Added Red Flags for identifying wrong boundaries
- Formalized "Keep It Together" rule
- Expanded Glue Word Problem handling
- Added Word Order Divergence Decision framework
- Added Form Change Decision framework
- Added Ambiguity Avoidance Principle
- Expanded validation loop to include substitutability and glue word detection
- Added Extended Thinking protocol requirements

**v2.1 (2025-10-25)**:
- Added mandatory validation loop with 4 steps
- Explicit over-granularization checks (Estoy, Me, va, No)
- Article+noun bonding rules with gender-marking guidance
- Feeder completeness validation
- Language-specific error examples

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
