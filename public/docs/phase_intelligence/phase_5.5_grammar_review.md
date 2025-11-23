# Phase 5.5: Grammar Review (Seeds 1-100 Only)

> **⚠️ DEPRECATED as of 2025-11-20 (APML v8.2.1)**
>
> **This phase has been removed from the automated pipeline.**
>
> **Reason:** Automated grammar validation proved brittle and slow. Strategic pivot to human semi-manual review for first 100 seeds (~20,000 phrases) before publishing.
>
> **Replacement Strategy:**
> - Human review of first 100 seeds (GOLDEN quality gate)
> - Manual deletion of problematic phrases via dashboard
> - Ship first course → iterate based on learner feedback
> - Future: Browse/review/flag UI for phrase management
> - Future: Incremental quality checks as patterns emerge
>
> **Historical documentation preserved below for reference.**

---

**Version**: v1.0 (2025-11-11)
**Status**: ⚠️ DEPRECATED (v8.2.1)
**Purpose**: Remove grammatically incorrect phrases from foundation seeds
**Applies to**: Seeds 1-100 ONLY (foundation learning material)

---

## 🎯 Overview

Phase 5.5 is a **critical quality gate** for the first 100 seeds. These seeds represent the learner's foundation - phrases that will be repeated 10-20 times each during practice, creating 40,000-80,000 total phrase encounters.

**Why only seeds 1-100?**
- Foundation material gets the most repetition
- Early errors embed incorrect patterns deeply
- Learners lack pattern recognition to self-correct
- After 100 seeds, learners have internalized correct patterns

**Input**: Phase 5 output (after GATE violations removed)
**Output**: Grammar-validated baskets with `generation_stage: "GRAMMAR_REVIEWED"`

---

## 📋 Review Criteria (Binary Pass/Fail)

### ✅ PASS: Grammatically Correct
Phrase must be grammatically correct in **BOTH** languages:
- English grammar is correct
- Spanish grammar is correct
- All required words present
- Word order correct
- Agreement correct (gender, number, verb conjugation)
- Structural integrity maintained

### ❌ FAIL: Grammatically Incorrect
Remove phrase if it has grammatical errors in **EITHER** language:

**English errors**:
```
❌ "I want say something" (missing "to")
❌ "If I can speak someone" (missing "with")
❌ "I trying to learn" (missing "am")
```

**Spanish errors**:
```
❌ "quiero hablar con alguien más" when "más" should be "otro"
❌ "estoy intentar aprender" (infinitive instead of gerund)
❌ "si puedo hablar español con" (incomplete prepositional phrase)
```

---

## 🚫 Out of Scope

The following are **NOT** reasons to remove a phrase:

### Naturalness / Stylistic Preferences
```
✅ KEEP: "I want to say something in Spanish"
(Slightly awkward - native might say "speak" - but grammatically correct)

✅ KEEP: "I'm trying to learn how to speak as often as possible"
(Formal/stilted, but correct and clear)

✅ KEEP: "I can remember what I want to say"
(Pedagogically useful even if slightly unnatural)
```

### Collocation Preferences (if grammatically sound)
```
✅ KEEP: "I want to practise speaking with someone else"
(Native might prefer "practice talking," but "practise speaking" is correct)
```

### Simplicity Over Idiomaticity
```
✅ KEEP: Cognate-based translations
✅ KEEP: Simplified constructions for pedagogy
✅ KEEP: Literal translations if grammatically sound
```

---

## 🔍 Grammar Check Categories

### 1. Missing Words
```
❌ "I want speak" → ✅ "I want to speak"
❌ "si puedo hablar alguien" → ✅ "si puedo hablar con alguien"
```

### 2. Wrong Word Order
```
❌ "I can what say?" → ✅ "What can I say?"
❌ "español hablar quiero" → ✅ "quiero hablar español"
```

### 3. Agreement Errors
```
❌ "la palabras" → ✅ "las palabras"
❌ "estoy segura" (if subject is male) → ✅ "estoy seguro"
❌ "I is trying" → ✅ "I am trying"
```

### 4. Verb Conjugation/Form Errors
```
❌ "estoy intentar" → ✅ "estoy intentando"
❌ "I can to speak" → ✅ "I can speak"
❌ "quiero hablo" → ✅ "quiero hablar"
```

### 5. Structural Errors
```
❌ Incomplete phrases: "if I want to" (no main clause)
❌ Sentence fragments: "with someone else" (no subject/verb)
❌ Run-on sentences without proper structure
```

---

## 📊 Process Flow

### Step 1: Run Grammar Review Script

**Script**: `grammar_review.cjs`
**Location**: `scripts/grammar_review.cjs`

**Input**: `phase5_outputs/seed_sXXXX.json` (seeds 1-100 only)
**Output**: Updated files with `generation_stage: "GRAMMAR_REVIEWED"`

**Method**: AI-assisted review (Claude Sonnet 4.5)

**Note**: Sonnet 4.5 required - Haiku lacks the reasoning capability for reliable grammar checking

**Prompt template**:
```
Review these practice phrases for GRAMMATICAL CORRECTNESS ONLY.

For each phrase, check if it is grammatically correct in BOTH English and Spanish.

REMOVE ONLY if:
- Missing required words
- Wrong word order
- Agreement errors (gender/number/verb)
- Conjugation errors
- Structural errors

DO NOT REMOVE for:
- Unnatural phrasing (if grammatically correct)
- Stylistic preferences
- Collocation awkwardness (if grammatically sound)
- Pedagogical simplicity

Phrases to review:
[English, Spanish, null, lego_count]
...

Return: List of phrase indices to REMOVE (grammatically incorrect only)
```

### Step 2: Remove Flagged Phrases

Script automatically:
1. Removes grammatically incorrect phrases
2. Updates `phrase_distribution` counts
3. Sets `generation_stage: "GRAMMAR_REVIEWED"`
4. Logs all removals with reasons

### Step 3: Manual Spot Check (Optional)

Review script output logs for:
- False positives (correct phrases flagged)
- False negatives (incorrect phrases kept)
- Adjust AI prompt if needed

---

## 📦 Output Format

Updated `phase5_outputs/seed_sXXXX.json`:

```json
{
  "version": "curated_v7_spanish",
  "seed_id": "S0001",
  "generation_stage": "GRAMMAR_REVIEWED",
  "seed_pair": {...},
  "legos": {
    "S0001L01": {
      "lego": ["to speak", "hablar"],
      "practice_phrases": [
        ["I want to speak", "quiero hablar", null, 2],
        ["I want to speak Spanish", "quiero hablar español", null, 3]
        // Only grammatically correct phrases remain
      ],
      "phrase_distribution": {
        // Updated counts after removal
      },
      "_grammar_review": {
        "phrases_removed": 1,
        "removal_reasons": [
          "Missing preposition: 'I want speak someone'"
        ]
      }
    }
  }
}
```

---

## 🎯 Success Criteria

**For seeds 1-100**:
- ✅ 100% grammatical correctness in both languages
- ✅ Zero structural errors
- ✅ Zero agreement errors
- ✅ Zero missing words
- ✅ All phrases clear and understandable
- ⚠️ Naturalness ~85% (acceptable if grammatically correct)

**Expected removals**: ~2-5% of phrases (grammatical errors only)

---

## 📊 Expected Metrics (Seeds 1-100)

**Before grammar review**: ~3,000-4,000 phrases (post-GATE)
**Grammar errors expected**: ~2-5% (60-200 phrases)
**After grammar review**: ~2,800-3,800 phrases
**Quality**: 100% grammatically correct

---

## 🚨 Common False Positives (Do NOT Remove)

### 1. Pedagogically Simplified Constructions
```
✅ KEEP: "I want to say something in Spanish"
(Prefer "speak" but "say" is grammatically correct)
```

### 2. Formal/Literal Translations
```
✅ KEEP: "I'm trying to learn how to speak"
(Formal but correct)
```

### 3. Cognate-Based Phrasing
```
✅ KEEP: Direct cognate translations if grammatically sound
```

### 4. Repetitive Practice Phrases
```
✅ KEEP: "I want to learn"
✅ KEEP: "I want to learn Spanish"
✅ KEEP: "I want to learn how to speak Spanish"
(Repetitive for practice - pedagogically valuable)
```

---

## 🔄 Seeds 101-668: No Grammar Review

**Why skip grammar review after seed 100?**

1. **Learner has foundation**: 100 seeds = ~3,000 correct patterns internalized
2. **Pattern recognition developed**: Can self-correct awkward constructions
3. **Diminishing returns**: Review time not justified
4. **GATE compliance sufficient**: Vocabulary safety maintained
5. **Acceptable error rate**: ~1-2% grammar errors tolerable with strong foundation

**Seeds 101-668 pipeline**:
- Phase 5: Generate baskets with GATE validation
- Phase 5 Step 4: Remove GATE violations
- **Skip Phase 5.5** (no grammar review)
- Proceed to Phase 6

---

## 🎓 Pedagogical Rationale

### Why 100% Grammar Correctness Matters (Seeds 1-100)

**Repetition amplification**:
- Each phrase repeated 10-20 times in app
- 1 error × 15 reps = 15 exposures to incorrect pattern
- 100 errors × 15 reps = 1,500 incorrect pattern encounters

**Foundation establishment**:
- Early patterns become the learner's internal grammar
- Errors in foundation create persistent mistakes
- Correct patterns enable self-correction later

**Learner confidence**:
- Grammatical errors undermine trust in system
- Perfect foundation builds confidence
- Learners question their own progress if materials have errors

---

## 🔗 Integration with Pipeline

**Full pipeline for seeds 1-100**:
1. Phase 3: LEGO extraction (A-before-M ordering)
2. Phase 4: Deduplication
3. Phase 5: Basket generation
   - Step 1: Generate scaffolds
   - Step 2: Generate phrases (agents)
   - Step 3: GATE validation
   - Step 4: Remove GATE violations
4. **Phase 5.5: Grammar review** ← This phase
5. Phase 6: Introductions
6. Phase 7: Compilation

**Pipeline for seeds 101-668**:
- Same as above, **skip Phase 5.5**

---

**Remember**: Grammar review is about **correctness**, not **perfection**. Keep pedagogically useful phrases even if slightly unnatural, as long as they are grammatically sound.
