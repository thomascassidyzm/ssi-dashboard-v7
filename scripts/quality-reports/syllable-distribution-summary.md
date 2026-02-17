# Syllable Distribution Analysis - Summary Report

**Generated:** 2026-02-02
**Analysis Type:** Syllable/Length Distribution across 8 SSi courses
**Purpose:** Identify "missing middle" problem - insufficient medium-length phrases

---

## Executive Summary

The analysis of 8,000 USE phrases (1,000 per course) reveals that **MOST COURSES DO NOT HAVE A "MISSING MIDDLE" PROBLEM**. The concern about insufficient medium-length phrases applies to only **2 out of 8 courses** (25%).

**Key Finding:** The average medium-length phrase percentage is **46.2%** - significantly ABOVE the ideal target of 35%.

---

## Flagged Courses (Missing Middle < 25%)

### 1. **ara_for_eng** (Arabic for English speakers) - CRITICAL
- **Medium phrases:** 2.0% (SEVERE deficit, -33% from ideal)
- **Problem:** 78.2% of phrases are VERY LONG (19+ syllables)
- **Root cause:** Arabic syllable counting algorithm may be inflating counts (2.5 syllables per word estimate)
- **Impact:** Almost no phrases suitable for practice progression phase
- **Recommendation:**
  - Review Arabic syllable counting algorithm
  - Generate shorter context phrases (7-12 syllables)
  - Break down long phrases into components

### 2. **bre_for_fra** (Breton for French speakers) - BORDERLINE
- **Medium phrases:** 24.8% (barely below 25% threshold)
- **Distribution:** 63.5% long phrases (13-18 syllables)
- **Impact:** Minimal - just 0.2% below threshold
- **Recommendation:** Generate ~10 additional medium phrases to cross threshold

---

## Healthy Courses (✓ Sufficient Medium Phrases)

| Course | Medium % | Status | Notes |
|--------|----------|--------|-------|
| **eng_for_fra** | 62.1% | EXCELLENT | Best distribution, minimal very long phrases |
| **cym_s_for_eng** | 61.4% | EXCELLENT | Good short phrase representation (10.8%) |
| **eng_for_deu** | 59.9% | EXCELLENT | Well-balanced distribution |
| **cym_n_for_eng** | 55.3% | EXCELLENT | Balanced across all buckets |
| **deu_for_eng** | 54.4% | EXCELLENT | Good variety of lengths |
| **eng_for_ara** | 49.6% | VERY GOOD | Slight deficit in short phrases |

---

## Distribution Analysis

### Comparison to Ideal Distribution

**Ideal Target:**
- Very Short (1-3 syllables): 0%
- Short (4-6 syllables): 10%
- Medium (7-12 syllables): 35%
- Long (13-18 syllables): 30%
- Very Long (19+ syllables): 25%

**Actual Average Across 8 Courses:**
- Very Short: 0.3% (close to target)
- Short: 4.0% (below target -6%)
- Medium: **46.2%** (ABOVE target +11.2%)
- Long: 36.3% (above target +6.3%)
- Very Long: 13.1% (below target -11.9%)

### Key Insights

1. **Medium phrases are OVER-represented**, not under-represented (except ara_for_eng, bre_for_fra)
2. **Short phrases (4-6 syllables) are under-represented** across all courses
3. **Very long phrases are under-represented** (which is actually good for learner experience)
4. The "missing middle" concern appears to be **course-specific, not systemic**

---

## Language-Specific Observations

### Arabic (ara_for_eng)
- **Average syllables:** 22.2 (highest)
- **Issue:** Syllable counting algorithm estimates 2.5 syllables per word
- **Effect:** Inflates all phrase lengths dramatically
- **Action:** Review/calibrate Arabic syllable counter

### Breton (bre_for_fra)
- **Average syllables:** 14.6
- **Issue:** 63.5% long phrases, only 0.3% short
- **Effect:** Borderline missing middle
- **Action:** Minor adjustment - add ~10 medium phrases

### English (eng_for_ara, eng_for_deu, eng_for_fra)
- **Average syllables:** 11.4 - 12.2
- **Status:** All three courses have EXCELLENT distributions (50-62% medium)
- **Short phrase representation:** Consistently low (2-3%)

### German (deu_for_eng)
- **Average syllables:** 12.0
- **Status:** EXCELLENT (54.4% medium)
- **Distribution:** Well-balanced

### Welsh (cym_s_for_eng, cym_n_for_eng)
- **Average syllables:** 10.7 - 11.3
- **Status:** Both EXCELLENT (55-61% medium)
- **Short phrase representation:** BEST among all courses (8.6-10.8%)

---

## Recommendations

### Priority 1: HIGH - ara_for_eng (Arabic)
1. **Verify syllable counting algorithm** - current estimates may be too high
2. **Generate 200+ medium-length phrases** (7-12 syllables)
3. **Break down very long phrases** into components
4. **Target distribution:** Shift from 78% very long → 35% medium

### Priority 2: MEDIUM - bre_for_fra (Breton)
1. **Generate 10-20 medium phrases** to cross 25% threshold
2. Current status is borderline, minor adjustment needed

### Priority 3: LOW - Short Phrase Generation (All Courses)
- All courses show **4% short phrases vs 10% ideal**
- Consider generating more 4-6 syllable phrases for DEBUT phase
- Not critical, as medium phrases can serve this purpose

### Priority 4: VALIDATION - Arabic Syllable Counter
- Review `scripts/syllable-counter.cjs` Arabic algorithm
- Current: 2.5 syllables per word estimate
- Consider: Character-based or phoneme-based counting
- Test with native speaker validation

---

## Conclusion

**The "missing middle" problem is NOT systemic.**

- **6 out of 8 courses** (75%) have EXCELLENT medium phrase coverage (46-62%)
- **1 course** (ara_for_eng) has a CRITICAL deficit requiring immediate attention
- **1 course** (bre_for_fra) is borderline and needs minor adjustment

The analysis suggests that:
1. The phrase generation system is working well for most languages
2. The Arabic syllable counter needs calibration
3. Short phrases (4-6 syllables) are under-represented across all courses
4. The system tends to generate longer phrases than the ideal distribution suggests

---

## Technical Details

**Methodology:**
- Sample size: 1,000 USE phrases per course
- Syllable counting: Language-specific algorithms (CJK, Arabic, European)
- Buckets: Very Short (1-3), Short (4-6), Medium (7-12), Long (13-18), Very Long (19+)
- Missing middle threshold: < 25% medium phrases

**Data Quality:**
- 100% syllable coverage across all courses
- 5,707 phrases had pre-existing syllable counts
- 2,293 phrases had syllables calculated on-demand
- 0 phrases with missing data

**Full Report:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/quality-reports/syllable-distribution.json`

---

## Next Steps

1. **Immediate:** Review and fix ara_for_eng syllable distribution
2. **Short-term:** Add 10-20 medium phrases to bre_for_fra
3. **Long-term:** Consider generating more short phrases (4-6 syllables) across all courses
4. **Validation:** Calibrate Arabic syllable counting algorithm with native speakers

---

*This analysis challenges the initial assumption that "missing middle" is a widespread problem. The data shows most courses have excellent medium phrase coverage.*
