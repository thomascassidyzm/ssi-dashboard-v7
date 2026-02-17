# M-LEGO Component Quality Analysis

**Analysis Date:** 2026-02-02
**Analyst:** Claude (Linguistic Quality Analysis)
**Database:** Supabase production

---

## Executive Summary

Analyzed **2,822 M-type LEGOs** across 6 major SSi courses to assess component breakdown quality. Components are the building blocks that learners should understand BEFORE attempting the full molecular phrase.

### Overall Results

- **69.1% Good Decompositions** (1,949 / 2,822 M-LEGOs)
- **100% Have Components** (no M-LEGOs completely missing components)
- **Average Quality Score: 68.1%**

### Key Findings

1. ✅ **No missing components**: All M-LEGOs have component arrays defined
2. ⚠️ **Grammar explanations**: 677 M-LEGOs (24%) use grammar labels instead of real words
3. ⚠️ **Components not in target**: 258 M-LEGOs (9%) have components that don't match the target text
4. ✅ **Sufficient decomposition**: Long phrases generally have 2+ components

---

## Course Rankings (by Quality Score)

| Rank | Course | Quality Score | Good | Total | Issues |
|------|--------|---------------|------|-------|--------|
| 1 | **ara_for_eng** (Arabic) | **87.2%** | 347 | 398 | 51 |
| 2 | **deu_for_eng** (German) | **87.1%** | 552 | 634 | 82 |
| 3 | **zho_for_eng** (Chinese) | **82.7%** | 354 | 428 | 74 |
| 4 | **nld_for_eng** (Dutch) | **71.8%** | 206 | 287 | 81 |
| 5 | **gle_for_eng** (Irish) | **60.1%** | 412 | 685 | 273 |
| 6 | **kor_for_eng** (Korean) | **20.0%** | 78 | 390 | 312 |

---

## Detailed Course Analysis

### 1. Arabic (ara_for_eng) - 87.2% Quality Score ✅

**Strongest performer** with minimal issues.

**Metrics:**
- Total M-LEGOs: 398
- Good decompositions: 347 (87.2%)
- Grammar explanations: 16 (4%)
- Components not in target: 35 (9%)

**Status:** Excellent component quality. Minor cleanup needed for edge cases.

---

### 2. German (deu_for_eng) - 87.1% Quality Score ✅

**Near-perfect decomposition** with consistent component structure.

**Metrics:**
- Total M-LEGOs: 634
- Good decompositions: 552 (87.1%)
- Grammar explanations: 72 (11%)
- Components not in target: 11 (2%)

**Good Examples:**
```
M-LEGO: "I want" → "ich will"
Components: ["I"→"ich", "want"→"will"]

M-LEGO: "with you" → "mit dir"
Components: ["with"→"mit", "you"→"dir"]

M-LEGO: "as often as possible" → "so oft wie möglich"
Components: ["often"→"oft", "possible"→"möglich"]
```

**Status:** Excellent quality. Minor grammar explanation cleanup needed.

---

### 3. Chinese (zho_for_eng) - 82.7% Quality Score ✅

**Strong decomposition** but uses grammar labels for particles.

**Metrics:**
- Total M-LEGOs: 428
- Good decompositions: 354 (82.7%)
- Grammar explanations: 74 (17%)
- Components not in target: 0 (0%)

**Grammar Explanation Issues:**

Chinese uses grammar labels for particles that don't translate well:

```
BAD: "a" → "一个"
Components: ["one"→"一", "(measure word)"→"个"]
❌ "(measure word)" is not a learnable component

BAD: "my" → "我的"
Components: ["I"→"我", "(possessive)"→"的"]
❌ "(possessive)" is not a learnable component

BAD: "them" → "他们"
Components: ["he"→"他", "plural"→"们"]
❌ "plural" is not a learnable component
```

**Good Examples:**
```
GOOD: "I want" → "我想"
Components: ["I"→"我", "want"→"想"]
✅ Both are real words

GOOD: "with you" → "和你"
Components: ["with"→"和", "you"→"你"]
✅ Both are real words

GOOD: "something" → "一些东西"
Components: ["some"→"一些", "thing"→"东西"]
✅ Both are real words
```

**Recommendation:** Replace grammar labels with the actual character/word, even if it doesn't have a direct English equivalent. The learner needs to recognize "个" as a component, not understand it as "(measure word)".

**Status:** Good quality with systematic grammar label issue.

---

### 4. Dutch (nld_for_eng) - 71.8% Quality Score ⚠️

**Moderate quality** with some component mismatches.

**Metrics:**
- Total M-LEGOs: 287
- Good decompositions: 206 (71.8%)
- Grammar explanations: 78 (27%)
- Components not in target: 6 (2%)

**Issues:**
- Grammar explanations for compound constructions
- Some component mismatches (6 cases)

**Status:** Moderate quality. Needs review of grammar labels and component matching.

---

### 5. Irish (gle_for_eng) - 60.1% Quality Score ⚠️

**Significant quality issues** with extensive grammar labeling.

**Metrics:**
- Total M-LEGOs: 685 (largest M-LEGO count)
- Good decompositions: 412 (60.1%)
- Grammar explanations: 264 (39%)
- Components not in target: 11 (2%)

**Issues:**
- Heavy use of grammar labels (39% of M-LEGOs)
- Irish uses mutations, particles, prepositions that get labeled instead of taught as components

**Status:** Needs systematic review to replace grammar labels with actual Irish words/particles.

---

### 6. Korean (kor_for_eng) - 20.0% Quality Score ⚠️⚠️⚠️

**CRITICAL QUALITY ISSUES** - requires immediate attention.

**Metrics:**
- Total M-LEGOs: 390
- Good decompositions: 78 (20.0%)
- Grammar explanations: 173 (44%)
- **Components not in target: 195 (50%)**

**Critical Issue: Dictionary Forms vs. Conjugated Forms**

Korean components use dictionary forms (e.g., "말하다", "배우다") but the target text contains conjugated forms:

```
BROKEN: "I want to speak" → "말하고 싶어요"
Components: ["speak"→"말하다", "want to"→"싶다"]
❌ "말하다" does NOT appear in "말하고 싶어요"
✅ The actual form is "말하고" (stem + connector)

BROKEN: "trying to learn" → "배우려고 해요"
Components: ["learn"→"배우다", "try"→"하다"]
❌ Neither "배우다" nor "하다" appear in "배우려고 해요"
✅ The actual forms are "배우려고" and "해요"

BROKEN: "how to speak" → "말하는 방법"
Components: ["speak"→"말하다", "way/method"→"방법"]
❌ "말하다" does NOT appear in "말하는 방법"
✅ The actual form is "말하는" (present continuous modifier)
```

**Root Cause:** Korean components were generated using dictionary forms for pedagogical clarity, but this breaks the fundamental principle that **components must actually appear in the target text**.

**Impact:**
- 50% of M-LEGOs have non-matching components
- Learners cannot mentally construct the M-LEGO from its components
- Component phrases would teach forms that don't appear in the debut phrase

**Status:** CRITICAL - requires complete rework of Korean component strategy.

---

## Issue Types Explained

### 1. Grammar Explanations (677 total, 24% of M-LEGOs)

**Problem:** Using labels like "(possessive)", "(plural)", "(measure word)" instead of actual words.

**Why it's bad:** Learners need to recognize and use the actual word/particle, not understand it as a grammatical category. Grammar explanations don't help construct the phrase.

**Example - Chinese:**
```
BAD:
M-LEGO: "a" → "一个"
Components: ["one"→"一", "(measure word)"→"个"]

BETTER:
M-LEGO: "a" → "一个"
Components: ["one"→"一", "个"→"个"]
OR: ["one"→"一", "piece/item"→"个"]
```

**Distribution:**
- Irish (gle_for_eng): 264 cases (39% of its M-LEGOs)
- Korean (kor_for_eng): 173 cases (44% of its M-LEGOs)
- Dutch (nld_for_eng): 78 cases (27% of its M-LEGOs)
- Chinese (zho_for_eng): 74 cases (17% of its M-LEGOs)
- German (deu_for_eng): 72 cases (11% of its M-LEGOs)
- Arabic (ara_for_eng): 16 cases (4% of its M-LEGOs)

---

### 2. Components Not in Target (258 total, 9% of M-LEGOs)

**Problem:** Component target text doesn't appear in the M-LEGO target text.

**Why it's critical:** If a component doesn't appear in the target, the learner cannot mentally construct the M-LEGO from its parts. This breaks the entire LEGO methodology.

**Example - Korean:**
```
BROKEN:
M-LEGO: "I want to speak" → "말하고 싶어요"
Components: ["speak"→"말하다"]

Problem: "말하다" does NOT appear in "말하고 싶어요"
The actual form is "말하고" (conjugated)
```

**Distribution:**
- Korean (kor_for_eng): 195 cases (50% of its M-LEGOs) - CRITICAL
- Arabic (ara_for_eng): 35 cases (9% of its M-LEGOs)
- German (deu_for_eng): 11 cases (2% of its M-LEGOs)
- Irish (gle_for_eng): 11 cases (2% of its M-LEGOs)
- Dutch (nld_for_eng): 6 cases (2% of its M-LEGOs)
- Chinese (zho_for_eng): 0 cases (0% of its M-LEGOs) ✅

---

## Recommendations by Priority

### CRITICAL - Korean Course (kor_for_eng)

**Issue:** 50% of components don't match target text due to dictionary vs. conjugated forms.

**Action Required:**
1. **Decide on strategy:**
   - **Option A (Pedagogical):** Keep dictionary forms in components but add note that these are "base forms"
   - **Option B (Literal):** Use actual conjugated forms that appear in target text
   - **Option C (Hybrid):** Show both base form and actual form in component

2. **Recommendation:** Option B (Literal) - Components MUST match what appears in target text
   - This is foundational to LEGO methodology
   - Learners construct phrases from actual pieces, not abstract forms
   - If Korean verbs change form, teach those forms as components

3. **Example fix:**
```
CURRENT (BROKEN):
M-LEGO: "I want to speak" → "말하고 싶어요"
Components: ["speak"→"말하다", "want to"→"싶다"]

FIXED (Option B):
M-LEGO: "I want to speak" → "말하고 싶어요"
Components: ["speak (connector form)"→"말하고", "want"→"싶어요"]
OR even better:
Components: ["speak and"→"말하고", "want"→"싶어요"]
```

**Timeline:** Immediate review required before course release.

---

### HIGH - Grammar Explanations (all courses)

**Issue:** 677 M-LEGOs use grammar labels instead of real words.

**Courses affected:** All, but especially Irish (264), Korean (173), Dutch (78), Chinese (74)

**Action Required:**
1. **Review all grammar labels** in components
2. **Replace with actual words/particles** that appear in the target
3. **If no English equivalent exists**, use the target language word

**Example fixes:**

**Chinese:**
```
CURRENT: ["one"→"一", "(measure word)"→"个"]
OPTION 1: ["one"→"一", "个"→"个"]  (just the character)
OPTION 2: ["one"→"一", "piece"→"个"]  (approximate meaning)
OPTION 3: ["一"→"一", "个"→"个"]  (target-only for particles)
```

**Irish:** (similar approach for mutations, particles)
**Korean:** (combine with critical fix above)

---

### MEDIUM - Component Mismatches

**Issue:** 258 M-LEGOs have components that don't appear in target (excluding Korean's 195).

**Courses affected:** Arabic (35), German (11), Irish (11), Dutch (6)

**Action Required:**
1. **Audit each case** to understand why component doesn't match
2. **Fix component definitions** to use actual substring from target
3. **Verify all components are substrings** of the M-LEGO target text

---

## Technical Notes

### Analysis Methodology

1. **Data Source:** Supabase production database (`course_legos` table)
2. **M-LEGO Identification:** `type='M'` filter
3. **Component Extraction:** JSONB `components` column
4. **Quality Gates:**
   - Has components? (components array not null/empty)
   - Long phrases (4+ chars) have 2+ components?
   - Components are real words (not grammar labels)?
   - Components appear in target text?

### Grammar Pattern Detection

Detected patterns for grammar explanations:
- Parentheses: `(possessive)`, `(measure word)`, `(plural)`
- Brackets: `[verb]`, `[noun]`
- Keywords: `particle`, `classifier`, `marker`, `tense`, `aspect`
- Suffixes: `-s`, `-ed`
- Abbreviations: `PL`, `PAST`

### Character Counting

- **CJK languages** (Chinese, Japanese, Korean): Count characters directly
- **Other languages**: Count words (space-separated)
- **Threshold for "long"**: 4+ characters/words

---

## Next Steps

### Immediate (Week 1)
1. ✅ **Generate this report** (COMPLETE)
2. 🔴 **Korean course audit** - Critical component mismatch fix
3. 🟡 **Chinese grammar labels** - Replace with actual characters

### Short-term (Month 1)
4. 🟡 **Irish grammar labels** - Systematic review (264 cases)
5. 🟡 **Korean grammar labels** - After fixing component matching
6. 🟢 **Dutch/German cleanup** - Minor fixes

### Long-term (Quarter 1)
7. 🟢 **Automated validation** - Add component quality checks to Course Builder
8. 🟢 **Best practices doc** - Component decomposition guidelines per language type
9. 🟢 **Re-audit all courses** - After fixes applied

---

## Files Generated

1. **mlego-components.json** - Complete JSON report with all examples
2. **mlego-components-SUMMARY.md** - This document (human-readable summary)

---

## Conclusion

**Overall Assessment:** Component quality is **good but needs attention** in specific areas.

**Strengths:**
- ✅ 100% of M-LEGOs have component arrays defined
- ✅ Arabic and German show excellent decomposition (87%+)
- ✅ Most components enable mental construction of M-LEGOs

**Weaknesses:**
- ⚠️ Korean has critical component matching issues (50% broken)
- ⚠️ Grammar labels used instead of real words (24% overall)
- ⚠️ Irish needs systematic grammar label replacement

**Priority Actions:**
1. **Fix Korean** - Critical component mismatch (use conjugated forms, not dictionary forms)
2. **Replace grammar labels** - Especially in Irish, Korean, Chinese
3. **Verify component matching** - All components must be substrings of target text

**Impact:** Good M-LEGO decomposition is foundational for effective learning. Without proper components, learners cannot mentally construct phrases from building blocks, breaking the core SSi methodology.

---

**Report prepared by:** Claude (Sonnet 4.5)
**For:** SSi Dashboard v7 (Popty) - Linguistic Quality Analysis
**Database:** Supabase production environment
**Analysis Script:** `/scripts/analyze-mlego-component-quality.cjs`
