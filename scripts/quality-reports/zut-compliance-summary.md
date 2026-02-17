# ZUT (Zero Untaught) Compliance Analysis Report

**Generated:** 2026-02-02
**Analyzer:** ZUT Compliance Quality Gate
**Database:** Supabase Production

---

## Executive Summary

**Overall Assessment: MODERATE SEVERITY**

The SSi language learning system achieves **98.24% ZUT compliance** across all analyzed courses, with **1.76% of phrases containing untaught vocabulary**. This represents good but not excellent compliance with the ZUT principle.

### Key Findings

- **Total Phrases Analyzed:** 46,566
- **Phrases Passing ZUT:** 45,709 (98.24%)
- **Phrases Failing ZUT:** 857 (1.76%)
- **Courses Analyzed:** 5

### Severity Assessment

**MODERATE** - Good ZUT compliance but needs attention. 1-5% of phrases have violations. Systematic review recommended.

---

## What is ZUT?

**ZUT (Zero Untaught)** is a core SSi principle: learners should NEVER see vocabulary they haven't learned. Every word/character in a practice phrase must come from:

1. Previously introduced LEGOs (by seed_number, lego_index)
2. Components of the current M-type LEGO
3. The current LEGO itself

---

## Per-Course Analysis

### 1. ara_for_eng (Arabic for English speakers) ✅ EXCELLENT
- **Total Phrases:** 9,058
- **Pass Rate:** 99.92%
- **Fail Rate:** 0.08%
- **Violations:** 7
- **Unique Violating Words:** 9

**Top Violating Words:**
1. `d` (4 occurrences)
2. `re` (1)
3. `didn` (1)
4. `ll` (1)

**Status:** Near-perfect ZUT compliance. Violations appear to be contractions (didn't → didn, I'll → ll) suggesting a tokenization issue rather than actual ZUT violations.

---

### 2. bre_for_fra (Breton for French speakers) ✅ VERY GOOD
- **Total Phrases:** 8,591
- **Pass Rate:** 98.84%
- **Fail Rate:** 1.16%
- **Violations:** 100
- **Unique Violating Words:** 16

**Top Violating Words:**
1. `y` (36 occurrences)
2. `v` (22)
3. `n` (11)
4. `ar` (10)
5. `e` (7)

**Worst Seeds:**
1. S0151: 18/40 violations (45.00%)
2. S0152: 12/40 violations (30.00%)
3. S0074: 10/40 violations (25.00%)

**Status:** Very good ZUT compliance. Single-letter violations suggest possible mutation or particle handling issues in Breton.

---

### 3. eng_for_deu (English for German speakers) ✅ VERY GOOD
- **Total Phrases:** 8,820
- **Pass Rate:** 97.93%
- **Fail Rate:** 2.07%
- **Violations:** 183
- **Unique Violating Words:** 22

**Top Violating Words:**
1. `the` (82 occurrences)
2. `every` (23)
3. `thing` (18)
4. `one` (9)
5. `another` (8)

**Worst Seeds:**
1. S0152: 12/41 violations (29.27%)
2. S0151: 11/41 violations (26.83%)
3. S0174: 10/45 violations (22.22%)

**Status:** Very good ZUT compliance. Main issue is "the" article appearing before being taught.

---

### 4. deu_for_eng (German for English speakers) ✅ VERY GOOD
- **Total Phrases:** 9,279
- **Pass Rate:** 98.25%
- **Fail Rate:** 1.75%
- **Violations:** 162
- **Unique Violating Words:** 25

**Top Violating Words:**
1. `zu` (75 occurrences) - German infinitive marker
2. `auch` (21) - "also"
3. `dann` (14) - "then"
4. `noch` (11) - "still/yet"
5. `alles` (9) - "everything"

**Worst Seeds:**
1. S0041: 25/40 violations (62.50%) ⚠️ CRITICAL
2. S0040: 13/22 violations (59.09%) ⚠️ CRITICAL
3. S0028: 16/51 violations (31.37%)

**Status:** Very good overall, but S0041 and S0040 have critically high violation rates (>60%), suggesting systematic issues with German reflexive pronouns ("sich") and infinitive constructions.

---

### 5. eng_for_ara (English for Arabic speakers) ⚠️ NEEDS ATTENTION
- **Total Phrases:** 10,818
- **Pass Rate:** 96.26%
- **Fail Rate:** 3.74%
- **Violations:** 405
- **Unique Violating Words:** 12

**Top Violating Words:**
1. `every` (272 occurrences) ⚠️ MAJOR ISSUE
2. `am` (42)
3. `place` (37)
4. `couldn` (20) - contraction fragment
5. `until` (11)

**Worst Seeds:**
1. S0111: 16/63 violations (25.40%)
2. S0104: 11/49 violations (22.45%)
3. S0004: 10/43 violations (23.26%)
4. S0101: 12/62 violations (19.35%)
5. S0103: 12/63 violations (19.05%)

**Worst LEGOs:**
1. S0004_L2: 6/10 violations (60.00%) ⚠️ CRITICAL
2. S0004_L3: 4/10 violations (40.00%)
3. S0101_L2: 4/10 violations (40.00%)
4. S0239_L2: 4/10 violations (40.00%)

**Status:** NEEDS ATTENTION. The word "every" appears 272 times in phrases before being taught, suggesting it's used in component phrases but never introduced as a standalone LEGO.

---

## Critical Issues Identified

### 1. Systematic "every" Problem (eng_for_ara)
**Impact:** 272 violations (67% of all violations in this course)
**Root Cause:** The word "every" is used extensively in practice phrases but never properly introduced as a LEGO.
**Recommendation:** Add "every" as an A-type LEGO in an early seed (before S0004).

### 2. German Reflexive Pronoun Problem (deu_for_eng)
**Impact:** High violation rates in specific seeds (S0041: 62.50%, S0040: 59.09%)
**Root Cause:** Reflexive pronoun "sich" used extensively before being taught
**Recommendation:** Add "sich" as an early A-type LEGO or restructure phrases to avoid reflexives in early seeds.

### 3. Article Problems (eng_for_deu)
**Impact:** 82 violations from "the" article
**Root Cause:** "the" appears in phrases before being introduced
**Recommendation:** Introduce "the" as an A-type LEGO earlier in the curriculum.

### 4. Contraction Tokenization Issues (Multiple Courses)
**Impact:** "couldn't" → "couldn", "I'll" → "ll", "didn't" → "didn"
**Root Cause:** Tokenizer splitting contractions but not treating them as taught vocabulary
**Recommendation:** Update tokenizer to handle contractions properly, or ensure both forms are in vocabulary.

---

## Pattern Analysis

### Common Violation Patterns

1. **Function Words:** Articles (the), quantifiers (every, some), modal particles (zu)
2. **Connector Words:** Temporal (until, then), additive (also, another)
3. **Contraction Fragments:** Incomplete contractions after tokenization
4. **Single Characters:** Mutation indicators (y, v, n in Breton), particles in character-based languages

### Courses by Severity (Worst to Best)

1. **eng_for_ara:** 3.74% fail rate (NEEDS ATTENTION)
2. **eng_for_deu:** 2.07% fail rate (VERY GOOD)
3. **deu_for_eng:** 1.75% fail rate (VERY GOOD)
4. **bre_for_fra:** 1.16% fail rate (VERY GOOD)
5. **ara_for_eng:** 0.08% fail rate (EXCELLENT)

---

## Recommendations

### Immediate Actions (Priority 1)

1. **Fix eng_for_ara "every" problem:** Add "every" as an early A-type LEGO
2. **Fix deu_for_eng S0001:** Introduce "zu" before first seed or restructure early phrases
3. **Fix high-violation LEGOs:** Review and fix LEGOs with >30% violation rates:
   - eng_for_ara: S0004_L2 (60%), S0004_L3 (40%), S0101_L2 (40%)

### Systematic Improvements (Priority 2)

1. **Enhance Tokenizer:** Handle contractions properly (don't, I'll, couldn't)
2. **Add Missing Function Words:** Systematically review and add early A-type LEGOs for:
   - Articles (the, a, an)
   - Common quantifiers (every, some, any)
   - Temporal connectors (until, then, when)

### Monitoring & Prevention (Priority 3)

1. **Automated ZUT Gate:** Integrate this analysis into Course Builder API validation
2. **Pre-submission Checks:** Run ZUT analysis before releasing new seeds
3. **Continuous Monitoring:** Weekly ZUT compliance reports for all courses

---

## Technical Notes

### Analysis Methodology

1. **Vocabulary Building:** Progressive vocabulary set built in seed/LEGO order
2. **Tokenization:**
   - Character-based for Arabic, Chinese (individual characters)
   - Word-based for Germanic/Romance languages (whitespace-delimited)
3. **Validation:** Each phrase checked against vocabulary available at that exact point in curriculum
4. **Violation Detection:** Tokens not in vocabulary flagged as violations

### Limitations

1. **Tokenization:** Current approach may over-split contractions and compounds
2. **Particle Handling:** Single-character particles in Breton may need special handling
3. **Mutation:** Celtic language mutations not yet handled
4. **Compounds:** German compound words may be under-counted

---

## Conclusion

The SSi system demonstrates **strong ZUT compliance (98.24%)** but has room for improvement. Most violations are concentrated in specific courses (eng_for_ara) and specific vocabulary items (every, the, zu). Addressing the top 10-20 violating words would likely bring overall compliance to >99%.

The ZUT principle is fundamental to the SSi methodology. While current compliance is good, achieving 99%+ should be the target to ensure learners never encounter confusing untaught vocabulary.

---

**Full Data:** See `zut-compliance.json` for detailed violation listings and statistics.
