# Phase 1: Pedagogical Translation → seed_pairs.json

**Version**: 2.3 (2025-10-28)
**Status**: Active methodology for Phase 1 translation
**Output**: `vfs/courses/{course_code}/seed_pairs.json`

---

## Core Philosophy

**The fundamental challenge**: Enable learners to produce fluent target language from day one, without explicit grammar instruction, while building genuine generative capacity.

**The SSi resolution**: Functional determinism at the translation level through **ZERO VARIATION** in early seeds, combined with strategic decisions that maximize cognitive fluency.

---

## The Three-Way Tension in Translation

Every translation decision balances three competing forces:

1. **Naturalness** (target language fluency)
2. **Transparency** (cognitive ease of mapping)
3. **Consistency** (functional determinism)

**The SSi resolution for SEEDs 1-100**: **Consistency trumps naturalness.**

After learners have automaticity (SEEDs 100+), natural variation can be introduced.

**Key insight**: Learners aren't learning "the full target language" in the first 100 SEEDs - they're learning "a sufficient subset to have conversations about learning the language." The subset is intentionally constrained.

---

## Task

Apply pedagogical translation methodology to translate all 668 canonical concepts into BOTH target and known languages, creating optimized learning material that prioritizes:
- Cognitive fluency over native perfection
- Automatic retrieval over comprehensive vocabulary
- Consistency over naturalness (early seeds)
- Semantic network building through cognates
- Grammatical simplicity in early seeds

---

## Input

- **Canonical seeds**: Fetch from `GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/seeds`
  - Returns 668 pipe-delimited seeds: `S0001|I want to speak {target} with you now.`
  - Supports `?limit=30` to fetch subset (e.g., first 30 seeds)
  - Token-efficient format (~3k tokens vs 30k for JSON)
- Target language code (e.g., "ita" for Italian)
- Known language code (e.g., "fra" for French)

---

## Critical Understanding

Canonical seeds are **language-agnostic concepts** expressed in English as a reference format. You will generate:
1. **TARGET language** (the language being learned) - pedagogically optimized
2. **KNOWN language** (the learner's language) - provides the learning context

**CRITICAL RULE**:
- **If target OR known IS English → Use canonical English directly**
- **NO back-translation from target to English**
- **NO "optimizing" the English**
- The canonical seeds ARE the definitive English version

**Why this matters:**
- Back-translation optimizes English naturalness at target language's expense
- Canonical English is already perfectly understandable
- Target language should maintain full naturalness (not compromised by back-translation)

---

## ⚠️ CRITICAL: USE EXTENDED THINKING MODE ⚠️

**Translation requires careful reasoning about semantic accuracy, consistency, and pedagogical optimization.**

### Why Extended Thinking?

Phase 1 involves:
- Determining if two concepts are the same (vocabulary registry management)
- Judging cognate similarity and semantic network connections
- Checking semantic accuracy (frequency vs quantity vs intensity)
- Validating grammar patterns for target language
- Maintaining consistency across 668 seeds
- Balancing naturalness with pedagogical optimization

**Without extended thinking, you WILL create inconsistent translations and violate methodology principles.**

### How to Use Extended Thinking

**Before translating EACH seed, use `<thinking>` tags to reason through:**

1. **Concept identification & registry check**
   ```
   Seed S0015: "I'm trying to remember"

   Concepts present:
   - "trying" → Check registry: Already mapped to "intentar" in S0002 ✓
   - "to remember" → Check registry: Already mapped to "recordar" in S0006 ✓

   Decision: Must use same words for consistency
   Translation: "Estoy intentando recordar"
   ```

2. **Cognate selection (if new concept)**
   ```
   New concept: "often" (seed 3)

   Options:
   - "frecuentemente" (from "frequent" - cognate) ✓
   - "a menudo" (idiomatic, no English cognate) ✗

   Analysis:
   - "frecuentemente" = cognate, builds semantic network
   - Connects to: frequent, frequency, infrequent, infrequently
   - Gives insight into temporal/frequency dimension
   - High utility across contexts

   Seed number: 3 (in seeds 1-100 range)
   Decision: Use cognate "frecuentemente"
   Register: "often/frequently" → "frecuentemente"
   ```

3. **Semantic accuracy validation**
   ```
   Canonical: "as often as possible"

   Semantic category: FREQUENCY (temporal), not QUANTITY

   Spanish options:
   - "tan frecuentemente como sea posible" (frequency - but subjunctive)
   - "lo más frecuentemente posible" (frequency - superlative, simpler) ✓
   - "lo más posible" (quantity - wrong semantic category) ✗

   Choice: "lo más frecuentemente posible"
   Reason: Preserves frequency meaning, uses cognate, avoids subjunctive
   ```

4. **Grammatical simplification check**
   ```
   Draft: "tan frecuentemente como sea posible"

   Analysis:
   - Uses subjunctive ("sea")
   - Seed number: 3 (very early)
   - Subjunctive = complex grammar for beginners

   Alternative: "lo más frecuentemente posible"
   - Superlative structure (simpler)
   - Same meaning
   - No subjunctive

   Decision: Use simpler structure for seed 3
   ```

5. **Grammar pattern validation**
   ```
   Draft: "Hablo un poco español"

   Grammar check: Spanish requires "de" after "un poco" before nouns
   Correct: "Hablo un poco de español"

   Validation: ✓ Fixed
   ```

### Extended Thinking Protocol

**For EVERY seed translation:**
```
<thinking>
1. Check vocabulary registry for existing concept mappings
2. If new concept: Apply cognate preference + utility analysis
3. Validate semantic accuracy (correct category?)
4. Check for grammatical simplification opportunities
5. Validate grammar patterns for target language
6. Update registry with new concept mappings
7. Perform back-translation with synonym flexibility
8. Document reasoning for complex decisions
</thinking>

[Generate target and known translations]
```

### Impact on Quality

**Without extended thinking:**
- ~30-40% inconsistent concept mappings
- Semantic drift errors (frequency → quantity)
- Grammar violations
- Non-cognate choices in early seeds
- Unnecessary subjunctive/complex grammar

**With extended thinking:**
- ~95% consistent translations on first pass
- Proper semantic category preservation
- Correct grammar patterns
- Optimal cognate selection with utility
- Grammatically simple structures in early seeds

**Use extended thinking mode for EVERY seed translation.**

---

## Part 1: The Zero-Variation Principle (SEEDs 1-100)

### Core Rule

**One concept in known language = ONE translation in target language, even if less natural.**

### Why This Works

1. **Eliminates decision paralysis** ("Which word do I use?")
2. **Builds automatic retrieval** (no thinking required)
3. **Creates cognitive fluency** before expanding vocabulary
4. **Reduces cognitive load** (one mapping to memorize, not three)

### Implementation

**Example (English → Spanish):**
```
speak / talk / say / chat / tell → ALL "hablar"
(even though "decir," "contar," "charlar" exist)

First 100 SEEDs: Only "hablar"
SEEDs 200+: Introduce "decir" as distinct concept with distinct contexts
```

**The principle**: Consistency creates automaticity. Variation creates decision points. Early SEEDs need automaticity.

### Comprehensible but Slightly Unnatural is GOOD

**Important mindset shift**: We are NOT aiming for "how a native would say it." We are aiming for "what enables the learner to speak fluently on day one."

**Examples:**
- ✅ Using "hablar" for all speaking contexts (even where "decir" is more natural)
- ✅ Using "importante" every time (even where "significativo" fits better)
- ✅ Using masculine default for generic references (simpler cognitive load)

**The goal**: Cognitive fluency, not native perfection.

---

## Part 2: The Pedagogical Heuristics (Progressive Optimization Curve)

**CRITICAL**: Heuristic priority changes based on seed position!

### SEEDS 1-100 (Beginner Phase)

**Priority order for first 100 seeds:**

#### 1. COGNATE PREFERENCE ⭐⭐⭐

**Maximize vocabulary similarity to known language**

**Why**: Reduces cognitive load, learner recognizes words faster

**CRITICAL INSIGHT**: Cognates aren't just easier - they build semantic networks.

**The deeper value of cognates:**
- ✅ **Transparent recognition** ("frecuentemente" = "frequently" - instant insight)
- ✅ **Word family access** (frequent → frequency → infrequent → infrequently)
- ✅ **Conceptual clarity** (temporal/frequency dimension becomes clear)
- ✅ **Transferable knowledge** (concept applies across many contexts)
- ✅ **Reduced memorization** (pattern recognition instead of rote learning)

**Example: "often" in seed 3**

**Bad choice: "a menudo"**
- ❌ Isolated vocabulary item
- ❌ No conceptual framework
- ❌ No English cognate
- ❌ Just memorization, no insight
- ❌ Doesn't transfer to related concepts

**Good choice: "frecuentemente"**
- ✅ Cognate with "frequently"
- ✅ Connects to word family (frequent, frequency, infrequent)
- ✅ Clarifies frequency/temporal concept
- ✅ Useful across many contexts
- ✅ Builds semantic network understanding

**The principle**: Cognates provide **semantic network building**, not just ease of learning.

**Examples by language:**

**Spanish for English:**
- ✅ "frecuentemente" (frequently) > "a menudo" (often - idiomatic)
  - Builds semantic network: frequent → frequency → infrequent
  - Clarifies temporal/frequency dimension
- ✅ "intentar" (intend/intent) > "tratar" (try)
  - Connects to: intention, intentional, unintentional
- ✅ "practicar" (practice) > "entrenar" (train)
  - Connects to: practical, practice, practiced
- ✅ "importante" (important) > "relevante" (relevant)
  - Connects to: importance, importantly, unimportant
- ✅ "utilizar" (utilize) > "usar" (use)
  - Connects to: utility, utilization, utilitarian
- ✅ "continuar" (continue) > "seguir" (continue/follow)
  - Connects to: continuation, continuous, continuously
- ✅ "explicar" (explain) > "aclarar" (clarify)
  - Connects to: explanation, explanatory, inexplicable
- ✅ "posible" (possible) > "factible" (feasible)
  - Connects to: possibility, possibly, impossible

**French for English:**
- ✅ "fréquemment" (frequently) > "souvent" (often - idiomatic)
- ✅ "pratiquer" (practice) > "s'entraîner" (train)
- ✅ "important" > "significatif"
- ✅ "utiliser" (utilize) > "employer" (use)
- ✅ "essayer" (essay/assay) is acceptable
- ✅ "expliquer" (explain) > "clarifier"
- ✅ "continuer" (continue) > "poursuivre"

**Italian for English:**
- ✅ "frequentemente" (frequently) > "spesso" (often - idiomatic)
- ✅ "importante" > "rilevante"
- ✅ "praticare" > "allenarsi"
- ✅ "usare", even better "utilizzare"
- ✅ "continuare" > "proseguire"
- ✅ "spiegare" is OK (explain)

**Mandarin for English:**
- No cognates available
- Use SIMPLEST high-frequency characters instead
- ✅ Single character > two-character compounds when possible
- ✅ 说 (shuō - speak) > 讲话 (jiǎnghuà - speak)
- ✅ 学 (xué - learn) > 学习 (xuéxí - study)

#### 2. ZERO VARIATION ⭐⭐⭐

**"First Word Wins"** - Once you establish a mapping, stick with it!

**Process**: Maintain an internal **VOCABULARY REGISTRY** as you translate:

```
VOCABULARY REGISTRY (build as you translate):
- "to speak" → "hablar" (claimed in S0001)
- "to want" → "querer" (claimed in S0001)
- "to try" → "intentar" (claimed in S0002)
- "to learn" → "aprender" (claimed in S0002)
- "often/frequently" → "frecuentemente" (claimed in S0003)
- "to practice" → "practicar" (claimed in S0005)
- "to remember" → "recordar" (claimed in S0006)
- "to explain" → "explicar" (claimed in S0008)
```

**Rules:**
1. When you encounter a new concept, pick the BEST cognate
2. Record it in your registry
3. ALL future occurrences of that concept → use SAME word
4. Do NOT introduce synonyms, even if "more natural"

**Example - BAD:**
```
S0002: "tratando" = trying
S0007: "intentar" = to try
S0008: "tratar" = to try
```
❌ Learner confused: "Which word should I use for 'try'?"

**Example - GOOD:**
```
S0002: "intentando" = trying (CLAIM: "intentar" for "to try")
S0007: "intentar" = to try (use claimed word)
S0008: "intentar" = to try (use claimed word)
```
✅ Learner confident: "'intentar' is THE word for try!"

**The First-Come-First-Served Principle:**

The first time a concept appears determines its canonical translation for the next ~100 SEEDs.

```
SEED 30: "I wanted to ask you something"
Translation chosen: "I wanted" → "quería" (imperfect)

This locks in imperfect aspect for "wanted"

SEED 150: "I wanted to see you"
Must also use: "I wanted" → "quería"

Only later (SEED 300+) can you introduce:
"I wanted" → "quise" (preterite, different context)
```

**EXCEPTION - Grammatically Required Variation:**

Some variation is unavoidable when grammar requires it:
- Spanish: "ser" vs "estar" (both "to be" but permanent vs temporary)
- French: "savoir" vs "connaître" (both "to know" but facts vs people)

In these cases, introduce BOTH but choose consistently based on context.

#### 3. GRAMMATICAL SIMPLICITY ⭐⭐

**Avoid complex grammar in seeds 1-100, especially seeds 1-50**

**Principle**: When multiple structures express the same meaning, choose the grammatically simpler one.

**Critical grammar to avoid in early seeds:**

**Seeds 1-50: Avoid subjunctive**
- Complex mood system
- Unpredictable from English
- Cognitive load too high for beginners

**Example: "as...as possible" in Spanish**

Canonical: "as often as possible" (seed 3)

Options:
- ❌ "tan frecuentemente como sea posible"
  - Uses subjunctive mood ("sea")
  - Too complex for seed 3
  - More literary/formal

- ✅ "lo más frecuentemente posible"
  - Superlative structure (simpler)
  - Same meaning
  - No subjunctive required
  - More common in speech

**Decision for seed 3**: Use simpler structure

**Other simplification examples:**

**Spanish conditional structures:**
```
Seed 10: "I would like"
- ❌ "quisiera" (conditional/subjunctive form)
- ✅ "me gustaría" (conditional of gustar - more common, clearer structure)
```

**Complex verb constructions:**
```
Seed 20: "I keep trying"
- ❌ "sigo intentando" (requires understanding of "seguir + gerund")
- ✅ "intento otra vez" (simpler: "I try again")
- OR wait until seed 100+ to introduce "seguir + gerund" pattern
```

**The principle**: Grammatical simplification without semantic loss. Preserve the meaning, simplify the grammar.

#### 4-8. Other Heuristics (lower priority for seeds 1-100)

4. **Consistency** - Maintain consistent terminology across seeds
5. **Clarity** - Prioritize clear, unambiguous expressions
6. **Utility** - Maximize teaching value (versatile phrases, reusable structures)
7. **Frequency** - Prefer high-frequency vocabulary (but AFTER cognates)
8. **Naturalness** - Target should sound native (but AFTER cognates/consistency)
9. **Brevity** - Shorter translations preferred when equivalent

### SEEDS 101-300 (Intermediate Phase)

Start introducing natural alternatives while maintaining established patterns

### SEEDS 301-668 (Advanced Phase)

Full natural/idiomatic expressions, variation encouraged

---

## Part 3: Context-Appropriate Register & Grammatical Decisions

### Default Register

**Default**: Friendly, conversational, neutral

**Reasoning**: SEEDs are about language practice conversations, not formal settings. The register should feel like two language learners talking comfortably.

### Formal vs. Informal "You"

**For languages with T-V distinction (tu/vous, tú/usted, du/Sie):**
- **Default to informal** for most SEEDs
- **Reason**: Learners are talking to each other, not to strangers
- **Exception**: Mark specific SEEDs where formal is contextually required (e.g., SEED 639-668 "sir/madam")

### Handling Grammatical Mismatches

#### Gender (when target requires, known doesn't):

```
Strategy: Use masculine as default for generic references
Rationale: Simpler cognitive load, consistent choice

"tired" → "cansado" (not randomly switching cansado/cansada)

BUT: Use feminine when referent is clearly female
"She's tired" → "Ella está cansada"
```

#### Articles (when known requires, target doesn't):

```
Russian lacks articles but English requires them

Strategy: Keep articles in known LEGO
"a book" as unit (not "book")

The COMPOSITE in Phase 3 handles dropping article in target
"a book" → "книга" (article absorbed by composite)
```

**The principle**: Keep the known language natural. Let COMPOSITEs (Phase 3) handle structural differences.

#### Form Changes (aspect, mood, etc.):

When target language requires aspect/mood distinctions that known language doesn't mark:

```
Known: "I was speaking"
Target (ES): Could be "hablaba" (imperfect) or "hablé" (preterite)

The English doesn't specify which aspect!

Solution: Choose most common/default for SEED context
Document choice in vocabulary registry for consistency
This becomes the deterministic mapping for that concept
```

---

## Translation Workflow

For each canonical concept (expressed in English as reference):

### ⚠️ CRITICAL: English Handling

**If target OR known language is English:**
- **Use canonical English seeds directly** (no translation needed)
- The canonical seeds ARE the English version
- Do NOT back-translate from target to English

**Example - Spanish for English (spa_for_eng):**
```
Canonical: "I want to speak {target} with you now."
Target (Spanish): Translate: "Quiero hablar español contigo ahora."
Known (English): Use canonical: "I want to speak Spanish with you now."
```

**Example - English for Spanish (eng_for_spa):**
```
Canonical: "I want to speak {target} with you now."
Target (English): Use canonical: "I want to speak English with you now."
Known (Spanish): Translate: "Quiero hablar inglés contigo ahora."
```

**Only translate when NEITHER language is English** (e.g., ita_for_fra).

---

### STEP 1: Generate Target Language

**If target IS English:**
- Use canonical directly (replace {target} placeholder with target language name)

**If target is NOT English:**
- Apply all pedagogical heuristics
- Check vocabulary registry for existing mappings
- For new concepts: Apply cognate preference + utility analysis
- Choose grammatically simple structures for early seeds
- Generate optimized target language translation
- Validate: Natural, high-frequency, clear, brief, consistent, useful

### STEP 2: Generate Known Language

**If known IS English:**
- Use canonical directly (replace {target} placeholder with target language name)

**If known is NOT English:**
- Translate canonical to known language
- **If target uses cognate, match it with cognate in known**
- Ensure known translation MATCHES target structure (when both are non-English)
- Goal: Known ↔ Target alignment for better FD_LOOP

**Example (Italian for French - NEITHER is English):**
```
Canonical: "as often as possible"
Target (Italian): "il più frequentemente possibile" (uses cognate "frequentemente")
Known (French): "aussi fréquemment que possible" (matches cognate "fréquemment")

Why this works:
- Learner is fluent in known language (French)
- Recognizing synonym variations requires ~0.1 units of cognitive effort
- Enables transparent cognate mapping: "fréquemment" ↔ "frequentemente"
- All cognitive load goes to target language learning
```

**Principle for non-English known language**: Prefer translations that:
- Match target language cognates (maximize transparency)
- Preserve semantic meaning (no drift)
- Require minimal cognitive effort
- Build semantic network understanding

### STEP 3: Update Vocabulary Registry

- Record new concept mappings
- Ensure future uses are consistent

### STEP 4: Generate Output

- Store ALL translations in single consolidated file
- Format: `{ "S0001": [target, known], "S0002": [target, known], ... }`
- File: `vfs/courses/{course_code}/seed_pairs.json`

---

## Language-Specific Rules

### For courses where known=English (e.g., spa_for_eng):
- Step 1: Translate canonical English → optimized target (Spanish)
- Step 2: **Use canonical English directly** (no back-translation)
- Result: Canonical English + optimized Spanish

### For courses where target=English (e.g., eng_for_spa):
- Step 1: **Use canonical English directly** for target
- Step 2: Translate canonical English → optimized known (Spanish)
- Result: Canonical English + optimized Spanish

### For courses where NEITHER is English (e.g., ita_for_fra):
- Step 1: Translate canonical English → optimized target (Italian)
- Step 2: Translate canonical English → optimized known (French)
- Use cognate matching between Italian and French where possible
- This ensures French mirrors Italian structure for transparency

---

## 📝 NOTE ON VALIDATION

**Self-checking during generation** (via Extended Thinking) is part of this phase.

**Formal validation** (systematic checking across all seeds) happens in Phase 1.5.

Phase 1.5 validator checks:
- ✓ Zero-variation compliance (one concept = one word)
- ✓ Cognate preference applied (seeds 1-100)
- ✓ Grammatical simplicity (no subjunctive in seeds 1-50)
- ✓ Semantic accuracy (frequency vs quantity vs intensity)
- ✓ Grammar perfection (target and known languages)
- ✓ Vocabulary consistency (registry maintained)

If your Extended Thinking identifies issues, regenerate that seed before continuing.

---

## Output Format

```json
{
  "S0001": ["Quiero hablar español contigo ahora.", "I want to speak Spanish with you now."],
  "S0002": ["Estoy intentando aprender.", "I'm trying to learn."],
  "S0003": ["Cómo hablar español lo más frecuentemente posible.", "How to speak Spanish as frequently as possible."]
}
```

---

## Critical Rules

- Translations are NOT literal - they are pedagogically optimized
- Each translation is an immutable amino acid component
- UUIDs are content-based (deterministic)
- Preserve seed_id for provenance tracking
- Consistency > Naturalness for seeds 1-100
- Cognitive fluency > Native perfection
- Cognates build semantic networks, not just ease
- Grammatical simplicity in early seeds (avoid subjunctive in 1-50)
- Known language can flex with synonyms to match cognates

---

## Success Criteria

✓ All 668 seeds translated
✓ All pedagogical heuristics applied to each
✓ Cognate preference maximized for seeds 1-100 (with semantic network building)
✓ Zero variation enforced (vocabulary registry maintained)
✓ Grammatical simplicity maintained (subjunctive avoided in seeds 1-50)
✓ Known language uses synonyms to match cognates
✓ Validation loop completed (zero semantic/grammar errors)
✓ Output stored in `seed_pairs.json`
✓ Provenance preserved (seed_id in each entry)
✓ Functional determinism maintained (one concept = one word, early seeds)

---

## Version History

**v2.3 (2025-10-28)**:
- **CRITICAL FIX**: English handling - use canonical directly when English is target OR known
- **NO back-translation**: Eliminates target language quality degradation from English back-translation
- Updated Translation Workflow to check English first before translating
- Clarified Critical Understanding section with explicit NO back-translation rule
- Updated Language-Specific Rules with three scenarios (known=English, target=English, neither=English)
- **Impact**: Preserves target language naturalness when English is involved

**v2.2 (2025-10-27)**:
- **Generation-focused**: Removed validation loop (now Phase 1.5's responsibility)
- **Self-checking in Extended Thinking**: Agent validates own work during generation
- Added note directing to Phase 1.5 for formal validation
- Batch processing ready: Designed for 20-seed batches with fresh intelligence

**v2.1 (2025-10-26)**:
- Added Extended Thinking requirement (CRITICAL for quality)
- Emphasized cognates build semantic networks (not just ease of learning)
- Added grammatical simplicity principle (avoid subjunctive in seeds 1-50)
- Added known-language synonym flexibility for cognate matching
- Updated all examples to use cognates (frecuentemente > a menudo)
- Updated examples to use simpler structures (lo más...posible > como sea posible)
- Added utility/transferability analysis for cognate selection
- Expanded validation loop to include grammatical simplicity check

**v2.0 (2025-10-26)**:
- Complete methodology overhaul based on SSi Methodology document
- Added Zero-Variation Principle as core philosophy
- Added Three-Way Tension framework (Naturalness/Transparency/Consistency)
- Formalized First-Come-First-Served principle
- Added "Comprehensible but slightly unnatural is GOOD" guidance
- Expanded grammatical mismatch handling (gender, articles, form changes)
- Added vocabulary consistency check to validation loop
- Emphasized cognitive fluency over native perfection

**v1.1 (2025-10-25)**:
- Added mandatory validation loop with semantic and grammar checks
- Explicit error examples (quantity vs frequency vs intensity)
- Spanish grammar validation (un poco de, prepositions)
- Final review requirements before output

**v1.0 (2025-10-23)**:
- Extracted from APML PHASE_PROMPTS
- Documented progressive heuristic curve (1-100, 101-300, 301-668)
- Clarified cognate preference as #1 priority for beginners
- Added variation reduction ("First Word Wins") methodology
- Included language-specific examples (Spanish, French, Italian, Mandarin)

---

**Next Update**: Capture any new translation heuristics discovered during course generation
