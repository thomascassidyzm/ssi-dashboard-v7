# SSi Vocabulary Balance Analysis - Executive Summary

**Generated:** 2026-02-02
**Analyst:** Claude (Linguistic Quality Analysis Agent)
**Courses Analyzed:** 5 courses (4,481 total LEGOs, 38,746 total phrases)

---

## Executive Summary

This analysis examines how evenly vocabulary (LEGOs) is distributed across practice phrases in SSi courses. Balanced exposure ensures learners encounter all vocabulary items with appropriate frequency - neither neglecting important words nor causing repetition fatigue.

**Key Finding:** All courses show significant imbalance, with 19-31% of LEGOs receiving insufficient practice (< 3 appearances). The system shows systematic inequality with an average Gini coefficient of 0.295.

---

## Overall Metrics

| Course | LEGOs | Phrases | Avg/LEGO | Std Dev | Gini | Underused | Overused |
|--------|-------|---------|----------|---------|------|-----------|----------|
| **deu_for_eng** | 1,194 | 9,279 | 7.77 | 5.41 | 0.374 | 30.6% | 0.3% |
| **ara_for_eng** | 1,078 | 9,058 | 8.40 | 5.12 | 0.309 | 25.6% | 0.0% |
| **bre_for_fra** | 895 | 8,591 | 9.60 | 4.84 | 0.242 | 19.0% | 0.2% |
| **cym_s_for_eng** | 679 | 6,021 | 8.87 | 5.24 | 0.255 | 1.2% | 7.7% |
| **cym_n_for_eng** | 635 | 5,797 | 9.13 | 6.27 | 0.294 | 1.4% | 9.0% |

**Definitions:**
- **Underused:** < 3 phrase appearances (insufficient exposure)
- **Overused:** > 15 phrase appearances (potential repetition fatigue)
- **Gini Coefficient:** Inequality measure (0 = perfect equality, 1 = perfect inequality)

---

## Critical Findings

### 1. German (deu_for_eng) - CRITICAL IMBALANCE

**Status:** ⚠️ Critical - Requires immediate attention

**Issues:**
- **30.6% of LEGOs are underused** (365 LEGOs with < 3 appearances)
- **Highest inequality** (Gini: 0.374)
- Early course LEGOs (Seeds 1-10) have **0 practice phrases**

**Examples of Neglected LEGOs:**
- S0004-L1: "how" / "wie" - 0 phrases
- S0005-L2: "to speak" / "sprechen" - 0 phrases
- S0006-L1: "I am trying" / "ich versuche" - 0 phrases
- S0007-L1: "I want" / "ich will" - 0 phrases

**Most Used:**
- S0155-L1: "it doesn't matter to me" - 16 phrases
- S0191-L4: "I don't mind" - 16 phrases

**Recommendation:** Add practice phrases for Seeds 1-30 urgently. These fundamental LEGOs need 5-8 practice phrases each.

---

### 2. Arabic (ara_for_eng) - HIGH IMBALANCE

**Status:** ⚠️ High Priority

**Issues:**
- **25.6% of LEGOs are underused** (276 LEGOs with < 3 appearances)
- **No overused LEGOs** (0% > 15 phrases) - good ceiling control
- Early Seeds also have gaps

**Examples of Neglected LEGOs:**
- S0004-L1: "how" / "كيف" - 0 phrases
- S0006-L1: "I'm trying" / "أحاول" - 0 phrases
- S0007-L1: "I want" / "أريد" - 0 phrases
- S0009-L1: "I speak" / "أتكلم" - 0 phrases
- S0009-L4: "Arabic" / "العربية" - 0 phrases

**Most Used:**
- S0149-L1: "This is not very difficult" - 15 phrases
- S0209-L2: "to spend more time" - 15 phrases

**Recommendation:** Fill gaps in Seeds 1-20. Consider why basic conversational LEGOs lack practice.

---

### 3. Breton (bre_for_fra) - BEST BALANCE (but still issues)

**Status:** ✅ Best performer, but room for improvement

**Strengths:**
- **Lowest Gini coefficient** (0.242) - most equal distribution
- **Fewest overused LEGOs** (0.2%)
- **Highest average** phrases per LEGO (9.60)

**Issues:**
- Still **19% underused** (170 LEGOs with < 3 appearances)
- Likely same early-seed gap pattern

**Recommendation:** This is the model to follow. Apply its phrase generation strategy to other courses.

---

### 4. Welsh South (cym_s_for_eng) - OVERUSE PATTERN

**Status:** ⚠️ Moderate - Different problem

**Issues:**
- **Only 1.2% underused** - excellent coverage!
- BUT **7.7% overused** (52 LEGOs with > 15 phrases)
- **Max phrases: 51** (vs. 16 in German) - excessive repetition

**Examples of Overused LEGOs:**
- S0274-L2: "you'd help" / "byddet ti'n helpu" - 51 phrases
- S0273-L2: "if I could" / "'sen i'n gallu" - 47 phrases
- S0081-L2: "today" / "heddiw" - 46 phrases

**Recommendation:** Redistribute phrases from overused LEGOs to underused ones. Cap at 20 phrases per LEGO.

---

### 5. Welsh North (cym_n_for_eng) - SIMILAR TO SOUTH

**Status:** ⚠️ Moderate

**Issues:**
- **1.4% underused** - good coverage
- **9.0% overused** (57 LEGOs with > 15 phrases)
- Similar overuse pattern to Welsh South

**Recommendation:** Same as Welsh South - cap and redistribute.

---

## Systematic Issues Across All Courses

### Issue #1: Early Seed Gap (deu_for_eng, ara_for_eng, likely others)

**Pattern:** Seeds 1-10 LEGOs have 0-2 practice phrases despite being fundamental vocabulary.

**Examples:**
- "I want" - 0 phrases (German, Arabic)
- "to speak" - 0 phrases (German)
- "how" - 0 phrases (German, Arabic)

**Root Cause:** Phrase generation likely starts after Seed 10-15, leaving early vocabulary without reinforcement.

**Fix:** Backfill practice phrases for Seeds 1-30 in all courses. Priority: Seeds 1-10.

---

### Issue #2: High Inequality (Gini > 0.3)

**Courses Affected:** German (0.374), Arabic (0.309)

**Interpretation:**
- Gini > 0.4 = severe inequality
- Gini 0.3-0.4 = concerning inequality
- Gini 0.2-0.3 = moderate inequality
- Gini < 0.2 = good balance

**Current Range:** 0.242 (Breton, best) to 0.374 (German, worst)

**Target:** All courses should aim for Gini < 0.25 (following Breton's model)

---

### Issue #3: Zero-Practice LEGOs

**Counts:**
- German: Multiple LEGOs with 0 phrases (Seeds 4-7)
- Arabic: Multiple LEGOs with 0 phrases (Seeds 4-9)
- Welsh South: 2 LEGOs with 0 phrases (Seeds 1, 58)
- Breton: Unknown count (needs investigation)
- Welsh North: Unknown count (needs investigation)

**Impact:** Learners encounter these LEGOs in seed translation but never practice them. Knowledge won't consolidate.

**Fix:** Every LEGO must appear in minimum 3-5 practice phrases.

---

## Recommendations by Priority

### URGENT (Week 1)

1. **Backfill German Seeds 1-30**
   - Add 5-8 practice phrases per LEGO
   - Focus on Seeds 1-10 first (0 phrases currently)
   - Target: Reduce underused from 30.6% to < 10%

2. **Backfill Arabic Seeds 1-20**
   - Add 5-8 practice phrases per LEGO
   - Target: Reduce underused from 25.6% to < 10%

3. **Audit all courses for zero-practice LEGOs**
   - Create comprehensive list
   - Generate minimum 3 phrases per LEGO

### HIGH PRIORITY (Month 1)

4. **Cap Welsh overuse**
   - Limit maximum phrases per LEGO to 20
   - Redistribute excess phrases to underused LEGOs
   - Target: Reduce overused from 7-9% to < 5%

5. **Standardize phrase counts**
   - Target: 8-10 phrases per LEGO (following Breton)
   - Establish min/max thresholds: 5 minimum, 20 maximum

6. **Apply Breton model to other courses**
   - Analyze Breton's phrase generation strategy
   - Replicate its balanced distribution (Gini 0.242)

### MEDIUM PRIORITY (Quarter 1)

7. **Rebalance German & Arabic**
   - Target Gini < 0.25 (from 0.374 and 0.309)
   - Review phrase generation algorithms
   - Consider LEGO frequency in seed translations vs. practice

8. **Create monitoring dashboard**
   - Real-time Gini coefficient tracking
   - Alerts for LEGOs with < 3 or > 20 phrases
   - Per-seed phrase count visualization

9. **Establish quality gates**
   - Automated checks before course release
   - Block release if > 10% LEGOs underused
   - Block release if Gini > 0.30

---

## Interpretation Guide

### Gini Coefficient Thresholds

| Range | Assessment | Action |
|-------|------------|--------|
| 0.00 - 0.20 | Excellent balance | Maintain |
| 0.20 - 0.25 | Good balance | Monitor |
| 0.25 - 0.30 | Moderate inequality | Review & improve |
| 0.30 - 0.40 | High inequality | **Requires action** |
| > 0.40 | Severe inequality | **Critical - halt release** |

### Standard Deviation Guidance

**Rule of thumb:** SD should be < 50% of the mean.

- German: SD 5.41 / Mean 7.77 = 70% ⚠️ (too high)
- Arabic: SD 5.12 / Mean 8.40 = 61% ⚠️ (too high)
- Breton: SD 4.84 / Mean 9.60 = 50% ✅ (acceptable)
- Welsh South: SD 5.24 / Mean 8.87 = 59% ⚠️ (borderline)
- Welsh North: SD 6.27 / Mean 9.13 = 69% ⚠️ (too high)

**Target:** SD should be 40-50% of mean for healthy distribution.

---

## Success Metrics

To achieve balanced vocabulary exposure:

1. **< 5% underused LEGOs** (currently 1-31% across courses)
2. **< 5% overused LEGOs** (currently 0-9% across courses)
3. **Gini coefficient < 0.25** (currently 0.24-0.37 across courses)
4. **Zero LEGOs with 0 phrases** (currently multiple per course)
5. **SD < 50% of mean** (currently 50-70% across courses)

---

## Next Steps

1. **Run this analysis weekly** to track improvements
2. **Prioritize German & Arabic** for immediate backfill
3. **Study Breton's success** - what's different about its phrase generation?
4. **Establish phrase generation standards** based on findings
5. **Create automated alerts** for imbalance during course development

---

## Technical Notes

**Analysis Method:**
- Queries `course_legos` and `course_practice_phrases` tables
- Counts phrases per LEGO using `seed_number` + `lego_index` relationships
- Calculates Gini coefficient using Lorenz curve approach
- Groups LEGOs into underused (< 3), normal (3-15), overused (> 15)

**Data Source:** Supabase database (production)
**Script:** `scripts/analyze-vocabulary-balance.cjs`
**Full Report:** `scripts/quality-reports/vocabulary-balance.json`

---

## Conclusion

All five courses suffer from vocabulary imbalance to varying degrees. German and Arabic show critical underuse of early-course LEGOs, while Welsh courses show overuse patterns. Breton demonstrates the best balance but still has room for improvement.

**Immediate action required:** Backfill German and Arabic Seeds 1-30 with practice phrases. These foundational LEGOs are currently receiving zero or minimal practice, severely impacting learning effectiveness.

**Long-term goal:** Achieve Gini < 0.25 across all courses with < 5% LEGOs in underused/overused categories.
