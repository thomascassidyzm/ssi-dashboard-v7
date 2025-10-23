# Phase 1: Pedagogical Translation → seed_pairs.json

**Version**: 1.0 (Extracted from APML 2025-10-23)
**Status**: Active methodology for Phase 1 translation
**Output**: `vfs/courses/{course_code}/seed_pairs.json`

---

## Task

Apply 6 pedagogical heuristics to translate all 668 canonical concepts into BOTH target and known languages, creating optimized learning material.

## Input

- **Canonical seeds**: Fetch from `GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/seeds`
  - Returns 668 pipe-delimited seeds: `S0001|I want to speak {target} with you now.`
  - Supports `?limit=30` to fetch subset (e.g., first 30 seeds)
  - Token-efficient format (~3k tokens vs 30k for JSON)
- Target language code (e.g., "ita" for Italian)
- Known language code (e.g., "fra" for French)

## Critical Understanding

Canonical seeds are **NOT English content** - they are language-agnostic concepts that happen to be expressed in English as a reference. You will translate each concept into:
1. **TARGET language** (the language being learned) - pedagogically optimized
2. **KNOWN language** (the learner's language) - structurally matched to target

**Exception**: If target or known IS English, reuse the canonical expression (no translation needed).

---

## The Pedagogical Heuristics (Progressive Optimization Curve)

**CRITICAL**: Heuristic priority changes based on seed position!

### SEEDS 1-100 (Beginner Phase)

**Priority order for first 100 seeds:**

#### 1. COGNATE PREFERENCE ⭐

Maximize vocabulary similarity to known language

**Why**: Reduces cognitive load, learner recognizes words faster

**Examples by language:**

**Spanish for English:**
- ✅ "intentar" (intend) > "tratar" (try)
- ✅ "practicar" (practice) > "entrenar" (train)
- ✅ "importante" (important) > "relevante" (relevant)
- ✅ "usar" (use), even better "utilizar" (utilize)
- ✅ "continuar" (continue) > "seguir" (continue)
- ✅ "explicar" (explain) > "aclarar" (clarify)

**French for English:**
- ✅ "pratiquer" (practice) > "s'entraîner" (train)
- ✅ "important" > "significatif"
- ✅ "utiliser" (utilize) > "employer" (use)
- ✅ "essayer" (essay/assay) is acceptable
- ✅ "expliquer" (explain) > "clarifier"
- ✅ "continuer" (continue) > "poursuivre"

**Italian for English:**
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

#### 2. VARIATION REDUCTION ⭐

**"First Word Wins"** - Once you establish a mapping, stick with it!

**Process**: Maintain an internal VOCABULARY REGISTRY as you translate:

```
VOCABULARY REGISTRY (build as you translate):
- "to speak" → "hablar" (claimed in S0001)
- "to want" → "querer" (claimed in S0001)
- "to try" → "intentar" (claimed in S0002)
- "to learn" → "aprender" (claimed in S0002)
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

**EXCEPTION - Grammatically Required Variation:**

Some variation is unavoidable when grammar requires it:
- Spanish: "ser" vs "estar" (both "to be" but permanent vs temporary)
- French: "savoir" vs "connaître" (both "to know" but facts vs people)

In these cases, introduce BOTH but explain the distinction clearly in seed context.

#### 3-8. Other Heuristics (lower priority for seeds 1-100)

3. **Consistency** - Maintain consistent terminology across seeds
4. **Clarity** - Prioritize clear, unambiguous expressions
5. **Utility** - Maximize teaching value (versatile phrases, reusable structures)
6. **Frequency** - Prefer high-frequency vocabulary (but AFTER cognates)
7. **Naturalness** - Target should sound native (but AFTER cognates/consistency)
8. **Brevity** - Shorter translations preferred when equivalent

### SEEDS 101-300 (Intermediate Phase)

Start introducing natural alternatives while maintaining established patterns

### SEEDS 301-668 (Advanced Phase)

Full natural/idiomatic expressions, variation encouraged

---

## Translation Workflow

For each canonical concept (expressed in English as reference):

### STEP 1: Canonical → Target (Pedagogical Optimization)

- Apply all 6 pedagogical heuristics
- Generate optimized target language translation
- Validate: Natural, high-frequency, clear, brief, consistent, useful

### STEP 2: Target → Known (Back-Translation)

- Take the optimized target translation
- Translate to known language
- Ensure known translation MATCHES target structure
- Goal: Known ↔ Target alignment for better FD_LOOP

### STEP 3: Generate Output

- Store ALL translations in single consolidated file
- Format: `{ "S0001": [target, known], "S0002": [target, known], ... }`
- File: `vfs/courses/{course_code}/seed_pairs.json`

---

## Language-Specific Rules

### For courses where known=English (e.g., ita_for_eng):
- Step 1 produces optimized target
- Step 2 can reuse canonical English (it's already the known language)
- But verify the English phrasing aligns with target structure

### For courses where known≠English (e.g., ita_for_fra):
- Step 1 produces optimized Italian
- Step 2 MUST translate Italian → French (NOT English → French)
- This ensures French mirrors Italian structure

---

## Critical Rules

- Translations are NOT literal - they are pedagogically optimized
- Each translation is an immutable amino acid component
- UUIDs are content-based (deterministic)
- Preserve seed_id for provenance tracking

## Example Translation

**Seed S42**: "I would like to go"

- **Literal**: "Hoffwn i fynd"
- **Pedagogical**: "Dw i eisiau mynd" (more natural, higher frequency, clearer for learners)

---

## Output Format

```json
{
  "S0001": ["Quiero hablar español.", "I want to speak Spanish."],
  "S0002": ["Estoy intentando aprender.", "I'm trying to learn."],
  "S0003": ["Cómo hablar lo más frecuentemente posible.", "How to speak as often as possible."]
}
```

---

## Success Criteria

✓ All 668 seeds translated
✓ All 6 heuristics applied to each
✓ Cognate preference maximized for seeds 1-100
✓ Variation reduction enforced (vocabulary registry maintained)
✓ Deterministic UUIDs generated
✓ Output stored in `seed_pairs.json`
✓ Provenance preserved (seed_id in each entry)

---

## Version History

**v1.0 (2025-10-23)**:
- Extracted from APML PHASE_PROMPTS
- Documented progressive heuristic curve (1-100, 101-300, 301-668)
- Clarified cognate preference as #1 priority for beginners
- Added variation reduction ("First Word Wins") methodology
- Included language-specific examples (Spanish, French, Italian, Mandarin)

---

**Next Update**: Capture any new translation heuristics discovered during course generation
