# LEGO Tiling Coverage Analysis - Summary Report

**Date:** 2026-02-02
**Analyst:** Claude (Linguistic Quality Analyst)
**Task:** Analyze whether seed sentences can be fully reconstructed from their LEGOs

---

## Executive Summary

**Overall Tiling Success Rate: 97.9%** (1,330 of 1,359 seeds fully tileable)

The SSi LEGO tiling system demonstrates **excellent coverage** across all analyzed courses. Out of 1,359 seeds with translations:
- **1,330 seeds (97.9%)** can be fully reconstructed from their LEGOs
- **29 seeds (2.1%)** have gaps

**Key Finding:** Most gaps are **minor** (punctuation, particles) rather than severe (missing vocabulary).

---

## Per-Course Results

| Course | Language | Total Seeds | Fully Tiled | Success Rate | Severity |
|--------|----------|-------------|-------------|--------------|----------|
| **fra_for_eng** | French | 275 | 275 | **100.0%** | ✅ None |
| **jpn_for_eng** | Japanese | 260 | 258 | 99.2% | ✅ Minor |
| **spa_for_eng** | Spanish | 304 | 302 | 99.3% | ⚠️ Severe |
| **deu_for_eng** | German | 260 | 253 | 97.3% | ⚠️ Severe |
| **zho_for_eng** | Chinese | 260 | 242 | 93.1% | ✅ Minor |

---

## Gap Analysis by Type

### Chinese (zho_for_eng)
- **18 seeds with gaps (6.9%)**
- Gap breakdown:
  - **Punctuation only:** 17 seeds (commas in Chinese text)
  - **Mixed particles + content:** 1 seed (seed 38)

**Severity:** **MINOR** - 94% of gaps are just punctuation (Chinese commas: ，)

**Example (Seed 73):**
```
Target: 非常感谢，但是我还有更多要学的。
LEGOs: 感谢, 非常, 更, 的, 还, 有, 多, 要, 学, 但是, 我
Gap: ，(comma only)
```

**Notable Exception - Seed 38:**
```
Known: I've been learning for about a week.
Target: 我学了大概一个星期。
LEGOs: Only 1 LEGO found: '一个星期' (a week)
Gap: 我, 学, 了, 大, 概 (actual content words missing)
```
This is a **data issue** - the seed is missing LEGOs.

---

### Japanese (jpn_for_eng)
- **2 seeds with gaps (0.8%)**
- Gap breakdown:
  - **Particles only:** 2 seeds (grammatical particles で, が)

**Severity:** **MINOR** - All gaps are grammatical particles

**Examples:**
- Seed 102: Missing particle で
- Seed 238: Missing particle が

---

### German (deu_for_eng)
- **7 seeds with gaps (2.7%)**
- Gap breakdown:
  - **Content words:** 7 seeds

**Severity:** **SEVERE** - All gaps are content words (vocabulary)

**Examples:**

**Umlaut Encoding Issues (6 seeds):**
- Seed 28: LEGO "nutzlich" vs Seed "nützlich", LEGO "moglich" vs Seed "möglich"
- Seed 29: LEGO "moglich" vs Seed "möglich"
- Seed 39: LEGO "mude" vs Seed "müde"
- Seed 40: LEGO "fuhlst" vs Seed "fühlst"

**Vocabulary Mismatch (1 seed):**
- Seed 7: Missing "hart" and "wie"
  - LEGO has "so gut ich kann" (as well as I can) but seed needs "so hart wie ich kann" (as hard as I can)
  - This is a genuine vocabulary gap - the LEGO doesn't contain the required words

**Root Causes:**
1. **Character encoding (6/7 seeds):** German umlauts (ü, ö, ä) stripped in LEGOs
2. **Vocabulary gap (1/7 seeds):** Seed requires different words than provided in LEGO

---

### French (fra_for_eng)
- **0 seeds with gaps**

**Severity:** **NONE** - Perfect tiling coverage!

---

### Spanish (spa_for_eng)
- **2 seeds with gaps (0.7%)**
- Gap breakdown:
  - **Content words:** 2 seeds

**Severity:** **SEVERE** - Both gaps are content words

**Examples:**
- Seed 268: Missing "sí" (yes with accent)
  - LEGO has "si" (no accent) but seed has "sí"
- Seed 269: Missing "qué" (what with accent)
  - LEGO has "que" (no accent) but seed has "qué"

**Root Cause:** Accent mark handling in Spanish (í, é, á)

---

## Key Issues Identified

### 1. ✅ Minor: Punctuation (Chinese)
**Impact:** 17 seeds in Chinese
**Nature:** Chinese commas (，) not included in LEGOs
**Severity:** Minor - punctuation doesn't affect learning
**Recommendation:** Consider whether to include punctuation in LEGOs for completeness

### 2. ✅ Minor: Particles (Japanese)
**Impact:** 2 seeds in Japanese
**Nature:** Grammatical particles (で, が) missing from LEGO decomposition
**Severity:** Minor - particles are learned in context
**Recommendation:** No action needed; this is acceptable

### 3. ⚠️ SEVERE: Character Encoding (German)
**Impact:** 6 seeds in German
**Nature:** Umlauts (ü, ö, ä) stripped from LEGOs but present in seeds
**Severity:** SEVERE - appears as vocabulary mismatch but is actually encoding issue
**Recommendation:** **ACTION REQUIRED** - Restore umlauts in German LEGOs or normalize both sides

### 4. ⚠️ SEVERE: Accent Marks (Spanish)
**Impact:** 2 seeds in Spanish
**Nature:** Accented characters (í, é, á) not matching
**Severity:** SEVERE - vocabulary mismatch
**Recommendation:** **ACTION REQUIRED** - Normalize accent handling for Spanish

### 5. 🚨 CRITICAL: Missing LEGOs (Chinese Seed 38)
**Impact:** 1 seed
**Nature:** Only 1 LEGO when multiple are needed
**Severity:** CRITICAL - seed cannot be constructed
**Recommendation:** **URGENT** - Investigate why seed 38 has incomplete LEGO data

---

## Validation Rules Assessment

### Current State
The SSi tiling validation is **mostly working** with a 97.9% success rate.

### Recommended Actions

#### Priority 1: Critical Data Issues
1. 🚨 **Fix Seed 38 in Chinese** - Add missing LEGOs (only has 1 LEGO, needs ~5)

#### Priority 2: Character Encoding Issues
2. **Fix German umlauts** - Restore ü, ö, ä in LEGOs (affects 6 seeds)
3. **Fix Spanish accents** - Restore í, é, á in LEGOs (affects 2 seeds)
4. **Investigate German Seed 7** - Vocabulary mismatch between LEGO and seed requirement

#### Priority 2: Minor Improvements
4. **Review punctuation policy** - Decide whether commas should be included in tiling
5. **Document particle handling** - Clarify that CJK particles may be omitted from tiling

---

## Statistical Summary

### Gap Categories (All Courses Combined)

| Category | Count | Percentage | Severity |
|----------|-------|------------|----------|
| **Punctuation only** | 17 | 58.6% | Minor |
| **Particles only** | 2 | 6.9% | Minor |
| **Content words** | 9 | 31.0% | Severe |
| **Mixed particles + content** | 1 | 3.4% | Severe |

**Conclusion:** 65.5% of gaps are minor (punctuation/particles), 34.5% are severe (content words).

---

## Methodology Notes

### Character-Level Tiling (CJK)
Chinese and Japanese use character-level tiling:
- Each character in the seed must be present in at least one LEGO
- Punctuation is normalized (removed for comparison)
- Particles may be omitted

### Word-Level Tiling (European)
German, French, and Spanish use word-level tiling:
- Each word in the seed must be present in at least one LEGO
- Case-insensitive comparison
- Punctuation is normalized
- Partial stem matching for conjugations

---

## Recommendations for Future Analysis

1. **Add LEGO completeness check:** Flag seeds with unusually few LEGOs (like seed 38)
2. **Add character normalization:** Pre-normalize umlauts, accents before tiling analysis
3. **Track gap patterns over time:** Monitor if issues are resolved as courses evolve
4. **Analyze untranslated seeds:** Spanish has 668 total seeds but only 304 with translations

---

## Technical Details

- **Analysis Script:** `scripts/analyze-tiling-coverage.py`
- **Output Report:** `scripts/quality-reports/tiling-coverage.json`
- **Database:** Supabase (tables: `course_seeds`, `course_legos`)
- **Courses Analyzed:** zho_for_eng, jpn_for_eng, deu_for_eng, fra_for_eng, spa_for_eng

---

## Conclusion

The SSi LEGO tiling system demonstrates **strong coverage** with 97.9% of seeds fully tileable. The main issues are:

1. **German/Spanish character encoding** (9 seeds) - fixable with normalization
2. **Chinese punctuation** (17 seeds) - minor, policy decision
3. **One critical data issue** (seed 38) - needs investigation

**Overall Assessment:** ✅ **PASS** - Tiling coverage meets quality standards with minor fixes needed.

---

**Generated by:** Claude Sonnet 4.5
**Analysis Date:** 2026-02-02
