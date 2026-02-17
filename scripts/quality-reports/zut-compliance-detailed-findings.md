# ZUT Compliance: Detailed Findings & Examples

**Generated:** 2026-02-02
**Analysis Type:** Deep-dive into violation patterns

---

## Purpose

This document provides detailed examples and patterns of ZUT (Zero Untaught) violations discovered in the analysis. Use this to understand the root causes and guide remediation efforts.

---

## 1. eng_for_ara: The "every" Problem

### Overview
- **272 violations** (67% of all violations in this course)
- Word "every" used extensively in phrases but never introduced as a LEGO
- Affects seeds S0061 through S0111

### Example Violations

```
S0061_L6_P9: "I want to learn English a little more every day."
S0064_L3_P6: "It is fun to learn enough different words every day."
S0064_L3_P8: "It is fun to do interesting things with you every day."
S0065_L1_P8: "It isn't easy to take time every day."
S0065_L2_P6: "I want to test what I learn every day."
```

### Root Cause
The phrase "every day" is used as a temporal expression throughout the course, but the word "every" is never introduced as an atomic LEGO. This suggests:
1. Either "every day" should be taught as an M-type LEGO
2. Or "every" should be introduced as an A-type LEGO before S0061

### Recommendation
Add "every" as an A-type LEGO in seed S0055-S0060 (before first usage in S0061).

---

## 2. eng_for_ara: Missing Function Words

### "something" (6 violations in S0004)
Used in early practice phrases without introduction:
```
S0004_L2_P5: "I want to say something now."
S0004_L2_P6: "I'm trying to say something now."
S0004_L2_P7: "I want to learn how to say something."
```

### "in" (6 violations in S0004)
Preposition used before being taught:
```
S0004_L2_P9: "How to say something in English now?"
S0004_L3_P6: "I'm trying to say something in English."
```

### "am" (42 violations)
Present tense form of "be" appearing in contractions:
```
Various phrases with "I am" appearing before proper introduction
```

### Recommendation
Add early A-type LEGOs for:
- "something" (before S0004)
- "in" (before S0004)
- "am" (S0001-S0003)

---

## 3. deu_for_eng: Verb Stem Issues (S0041)

### Overview
- **25 violations in S0041** (62.50% of phrases in this seed)
- Verb "fühle" (feel) used without introduction
- Additional issue: adjective "müde" (tired) also untaught

### Example Violations

```
S0041_L1_P2: "fühle" [Unknown: fühle]
S0041_L1_P4: "ich fühle mich" [Unknown: fühle]
S0041_L1_P5: "ich fühle mich gut" [Unknown: fühle]
S0041_L1_P6: "ich fühle mich müde" [Unknown: fühle, müde]
S0041_L1_P8: "ich fühle mich ein bisschen müde" [Unknown: fühle, müde]
```

### Root Cause
S0041 appears to introduce emotional states (feeling good/tired), but the verb stem "fühle" itself is not introduced as a LEGO before being used in practice phrases. This is a structural issue with the seed design.

### Recommendation
Restructure S0041 to:
1. First introduce "fühlen/fühle" as an A-type or M-type LEGO
2. Then introduce "müde" (tired) as an A-type LEGO
3. Only then use them in combined practice phrases

---

## 4. deu_for_eng: Reflexive Pronoun "sich"

### Overview
- Multiple violations across various seeds
- "sich" (reflexive pronoun) appears in phrases without introduction
- Particularly affects reflexive verbs like "sich erinnern" (to remember)

### Example Violations

```
S0006_L4_P4: "sich an etwas erinnern" [Unknown: sich]
S0006_L5_P6: "sich an ein Wort erinnern" [Unknown: sich]
S0010_L7_P6: "sich an den ganzen Satz erinnern" [Unknown: sich]
S0018_L2_P9: "er will sich morgen mit allen anderen treffen" [Unknown: sich]
```

### Root Cause
German reflexive pronouns are grammatically necessary for certain verbs, but they're being used before formal introduction. This is a common issue in teaching German as a foreign language.

### Recommendation
1. Introduce "sich" as an A-type LEGO early (before S0006)
2. Add teaching note explaining reflexive pronouns
3. Consider if reflexive verbs should be avoided in very early seeds

---

## 5. eng_for_deu: Article "the" Problem

### Overview
- **82 violations** from the definite article "the"
- Most common violation in this course
- Affects learning flow for German speakers

### Example Pattern
"the" appears in practice phrases throughout the course before being formally introduced as a vocabulary item.

### Root Cause
English articles are challenging for German speakers (who have der/die/das). The course assumes "the" is implicitly known but doesn't formally teach it.

### Recommendation
1. Introduce "the" as an A-type LEGO in S0001-S0003
2. Consider comparative teaching approach (English "the" vs German "der/die/das")

---

## 6. Contraction Tokenization Issues

### Overview
Affects multiple courses when contractions are split by tokenizer:
- "couldn't" → "couldn" + "t"
- "didn't" → "didn" + "t"
- "I'll" → "I" + "ll"

### Example Violations

```
eng_for_ara: "couldn" appears 20 times (from "couldn't")
ara_for_eng: "didn", "ll", "re", "d" (all contraction fragments)
```

### Root Cause
The tokenizer splits contractions at apostrophes, but the vocabulary only contains the full contraction forms (couldn't, didn't), not the split components.

### Solutions (Choose One)

**Option A: Fix Tokenizer**
- Don't split contractions at apostrophes
- Treat "couldn't" as single token

**Option B: Add Split Forms to Vocabulary**
- When LEGO contains "couldn't", also add "couldn" and "t" to vocabulary
- More complex but handles edge cases

**Option C: Normalize Before Comparison**
- Expand all contractions to full forms before tokenization
- "couldn't" → "could not" in both LEGOs and phrases

### Recommendation
Implement Option A (simplest and most correct) - contractions should be treated as single vocabulary items.

---

## 7. bre_for_fra: Single-Character Particles

### Overview
- **16 unique violating words**, many are single characters
- Breton language uses particles and mutation indicators
- Examples: `y`, `v`, `n`, `ar`, `e`

### Example Violations
```
Top violating words:
- y: 36 occurrences
- v: 22 occurrences
- n: 11 occurrences
- ar: 10 occurrences
```

### Root Cause
This appears to be a Breton-specific linguistic feature:
- `y` could be a mutation marker or particle
- `v` could be a mutated form of `b` or `m`
- `ar` is the Breton definite article
- `n` could be a negation particle

### Special Consideration
Celtic languages like Breton have initial consonant mutations that change word beginnings based on grammatical context. The tokenizer may be splitting these as separate particles when they're actually part of the word.

### Recommendation
1. Consult with Breton language expert
2. Determine if these are truly separate particles or part of words
3. If separate: add as A-type LEGOs early in curriculum
4. If part of words: adjust tokenizer to handle Breton mutations

---

## 8. ara_for_eng: Excellent Compliance

### Overview
- **99.92% pass rate** - best in all courses
- Only 7 violations total out of 9,058 phrases
- Violations are all contraction-related

### Example Violations
```
Unknown tokens: d, re, didn, ll (all from contractions)
```

### Why This Course Excels
1. Careful vocabulary introduction sequencing
2. Better phrase generation (avoids untaught words)
3. Simpler English constructions in early seeds

### Lessons for Other Courses
Study ara_for_eng seed structure to understand best practices for ZUT compliance.

---

## Priority Fix List

### Critical (Fix Immediately)

1. **eng_for_ara: Add "every"** as A-type LEGO before S0061
2. **deu_for_eng: Restructure S0041** to introduce "fühle" and "müde" properly
3. **deu_for_eng: Add "sich"** as A-type LEGO before S0006
4. **eng_for_ara: Add "something"** as A-type LEGO before S0004

### High Priority

5. **eng_for_deu: Add "the"** as A-type LEGO in S0001-S0003
6. **All courses: Fix contraction tokenization**
7. **eng_for_ara: Add "in"** as A-type LEGO before S0004
8. **eng_for_ara: Add "am"** as A-type LEGO in S0001-S0003

### Medium Priority

9. **deu_for_eng: Add "bis"** (until) as A-type LEGO before S0025
10. **deu_for_eng: Add "dass"** (that) as A-type LEGO before S0015
11. **bre_for_fra: Investigate particle handling** for y, v, n, ar

---

## Testing After Fixes

After implementing fixes, re-run ZUT analysis:

```bash
node scripts/analyze-zut-compliance.cjs
```

Target metrics:
- Overall pass rate: >99%
- No single seed with >10% violation rate
- No single LEGO with >20% violation rate

---

## Methodology Notes

### Vocabulary Building Logic

For each LEGO at position (seed_number, lego_index):

1. **Start with global vocabulary** (all previous LEGOs)
2. **Add M-LEGO components** (if current LEGO is M-type)
3. **Add current LEGO target_text**
4. **Check all practice phrases** against this vocabulary

### Tokenization

- **Character-based:** Arabic (ara), Chinese (zho)
  - Split into individual characters
  - Filter to keep only language-specific Unicode ranges

- **Word-based:** English (eng), German (deu), French (fra), Spanish (spa), Breton (bre)
  - Split on whitespace and punctuation
  - Convert to lowercase
  - Keep only alphabetic words

### Limitations

1. **Compound words:** German compounds not yet handled specially
2. **Mutations:** Celtic language mutations need special handling
3. **Particles:** Some languages use particles that may be part of words
4. **Contractions:** Current tokenizer over-splits contractions

---

## Appendix: Course Statistics

| Course | Total Phrases | Pass Rate | Fail Rate | Top Violation |
|--------|--------------|-----------|-----------|---------------|
| ara_for_eng | 9,058 | 99.92% | 0.08% | Contractions |
| bre_for_fra | 8,591 | 98.84% | 1.16% | Particles (y, v) |
| deu_for_eng | 9,279 | 98.25% | 1.75% | zu (infinitive) |
| eng_for_deu | 8,820 | 97.93% | 2.07% | the (article) |
| eng_for_ara | 10,818 | 96.26% | 3.74% | every |

---

**End of Detailed Findings Report**
