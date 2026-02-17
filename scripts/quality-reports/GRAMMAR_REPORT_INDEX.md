# Grammar Quality Analysis - Report Index

**Analysis Date:** February 2, 2026
**Analyst:** Claude (Sonnet 4.5) via Anthropic API

---

## 📊 Quick Start

**Want a quick overview?** Start here:
- **[VIEW_RESULTS.md](./VIEW_RESULTS.md)** - Visual summary with charts and action items

**Need the executive summary?** Read this:
- **[GRAMMAR_ANALYSIS_SUMMARY.md](./GRAMMAR_ANALYSIS_SUMMARY.md)** - Full executive summary (2 pages)

**Want the detailed data?** Use these:
- **[grammar-analysis.json](./grammar-analysis.json)** - Comprehensive structured report (15KB)
- **[grammar-analysis-ai.json](./grammar-analysis-ai.json)** - Raw AI analysis results (101KB)

---

## 📁 Report Files

### Primary Reports

| File | Type | Size | Description |
|------|------|------|-------------|
| **VIEW_RESULTS.md** | Markdown | 8.5KB | **START HERE** - Visual quick view with charts |
| **GRAMMAR_ANALYSIS_SUMMARY.md** | Markdown | 8.6KB | Executive summary with recommendations |
| **grammar-analysis.json** | JSON | 15KB | Structured comprehensive report |
| **grammar-analysis-ai.json** | JSON | 101KB | Raw AI analysis with detailed findings |

### Supporting Data

| File | Type | Size | Description |
|------|------|------|-------------|
| **grammar-manual-review-samples.json** | JSON | 65KB | Sample phrases extracted for human review |

### Analysis Scripts

| File | Type | Description |
|------|------|-------------|
| **analyze-grammar-quality.py** | Python | Automated grammar checking script |
| **analyze-grammar-manual-review.py** | Python | Sample extraction for manual review |
| **analyze-grammar-with-ai.py** | Python | AI-powered linguistic analysis |

---

## 🎯 Key Findings at a Glance

### Overall Grade: **B+** (Good to Excellent)

```
Courses Analyzed:             8
Phrases Reviewed:             160 (20 per course)
Total Database Phrases:       ~59,587
Sample Coverage:              0.27%

Known Language Quality:       86.2/100  (B+)
Target Language Quality:      78.4/100  (C+)
Grammatical Correctness:      95/100    (A)
Natural Fluency:              82/100    (B)

Total Errors Found:           25
Error Rate:                   15.6%
Accuracy Rate:                84.4%
```

### Top 3 Courses
1. **English for German speakers** (eng_for_deu) - 100/100 - Grade A
2. **Arabic for English speakers** (ara_for_eng) - 95/100 - Grade A
3. **South Welsh for English speakers** (cym_s_for_eng) - 92/100 - Grade A

### Top 3 Issues
1. **English preposition naturalness** - "speak with" → "speak to" (HIGH PRIORITY)
2. **Celtic language mutations** - Consistency needed (MEDIUM PRIORITY)
3. **Dialectal mixing** - Some courses mix forms (MEDIUM PRIORITY)

---

## 🔍 What Was Analyzed

### Courses Included

| Course Code | Course Name | Phrases in DB | Analyzed | Grade |
|-------------|-------------|---------------|----------|-------|
| eng_for_ara | English for Arabic speakers | 10,818 | 20 | B |
| deu_for_eng | German for English speakers | 9,279 | 20 | ERROR |
| ara_for_eng | Arabic for English speakers | 9,058 | 20 | A |
| eng_for_deu | English for German speakers | 8,820 | 20 | A |
| bre_for_fra | Breton for French speakers | 8,591 | 20 | A- |
| cym_s_for_eng | South Welsh for English speakers | 6,021 | 20 | A |
| cym_n_for_eng | North Welsh for English speakers | 5,797 | 20 | B+ |
| eng_for_fra | English for French speakers | 1,143 | 20 | B |
| **TOTAL** | | **59,527** | **160** | **B+** |

### Analysis Methodology

1. **Sample Selection:** 20 USE phrases per course (distributed across beginning, middle, end)
2. **AI Analysis:** Claude Sonnet 4.5 with linguistic expertise prompts
3. **Dimensions Evaluated:**
   - Grammatical correctness
   - Natural fluency and idiomaticity
   - Pedagogical appropriateness
   - Consistency

4. **Error Classification:**
   - Grammar errors (conjugation, agreement, etc.)
   - Naturalness issues (idiomatic usage)
   - Word order problems
   - Missing elements (articles, particles)
   - Orthographic inconsistencies

---

## 📋 Action Items Summary

### 🔴 HIGH PRIORITY (This Week)

1. **Fix English Preposition Issue**
   - Courses: eng_for_ara, eng_for_fra
   - Find/replace: "speak with you" → "speak to you"
   - Estimated phrases: ~50-100
   - Time: 4-6 hours

2. **Re-analyze German Course**
   - Course: deu_for_eng
   - Manual review or re-run AI analysis
   - Time: 2-3 hours

### 🟡 MEDIUM PRIORITY (This Month)

3. **Celtic Mutation Review**
   - Courses: cym_s_for_eng, cym_n_for_eng, bre_for_fra
   - Native speaker expert review
   - Estimated phrases: ~30-50
   - Budget: Consider compensation

4. **Dialect Consistency Check**
   - Courses: cym_n_for_eng, ara_for_eng
   - Document guidelines
   - Create validation rules
   - Time: 8-10 hours

### 🟢 LOW PRIORITY (This Quarter)

5. **Standalone Phrase Context**
   - Course: eng_for_ara
   - Add objects/context to incomplete phrases
   - Estimated phrases: ~5-10
   - Time: 2-3 hours

6. **Automated Validation Pipeline**
   - All courses
   - Build quality checks
   - Integrate with workflow
   - Time: 2-3 weeks

---

## 📊 Error Distribution

### By Course
```
eng_for_ara    8 errors  (40.0%)  [████████░░]
bre_for_fra    8 errors  (40.0%)  [████████░░]
cym_n_for_eng  4 errors  (20.0%)  [████░░░░░░]
eng_for_fra    2 errors  (10.0%)  [██░░░░░░░░]
cym_s_for_eng  2 errors  (10.0%)  [██░░░░░░░░]
ara_for_eng    1 error   ( 5.0%)  [█░░░░░░░░░]
eng_for_deu    0 errors  ( 0.0%)  [░░░░░░░░░░]
deu_for_eng    ERROR     (N/A)    [??????????]
```

### By Type
```
Naturalness      14 errors (56%)  [██████████████░░░░░░]
Mutation          4 errors (16%)  [█████░░░░░░░░░░░░░░░]
Orthography       3 errors (12%)  [████░░░░░░░░░░░░░░░░]
Word Order        2 errors  (8%)  [███░░░░░░░░░░░░░░░░░]
Other             2 errors  (8%)  [███░░░░░░░░░░░░░░░░░]
```

### By Severity
```
Critical      0 errors   (0%)   [░░░░░░░░░░░░░░░░░░░░]
Major         8 errors  (32%)   [████████░░░░░░░░░░░░]
Minor        17 errors  (68%)   [█████████████████░░░]
```

---

## 🎯 Recommendations

### Immediate (This Week)
- [ ] Apply English preposition fixes
- [ ] Re-analyze deu_for_eng
- [ ] Share report with team

### Short-term (This Month)
- [ ] Schedule native speaker reviews
- [ ] Update course builder prompts
- [ ] Document dialect guidelines

### Long-term (This Quarter)
- [ ] Build automated validation
- [ ] Implement quality dashboard
- [ ] Establish QA process
- [ ] Re-audit after fixes

---

## 💡 Lessons Learned

### What Works Well
- High grammatical accuracy (95%+)
- Good pedagogical structure
- Practical vocabulary selection
- Some courses are exemplary (eng_for_deu)

### What Needs Work
- Focus on naturalness over correctness
- Address systematic patterns at root cause
- Need language-specific expert reviews
- Automation can catch basic issues

### Best Practices (from eng_for_deu)
- Natural, idiomatic target language
- No standalone incomplete phrases
- Good word order variations
- Appropriate complexity progression

---

## 🔗 Related Reports

This grammar analysis is part of a broader quality audit series:

- **[MASTER-SUMMARY.md](./MASTER-SUMMARY.md)** - Overview of all quality reports
- **[zut-compliance-summary.md](./zut-compliance-summary.md)** - Vocabulary ordering analysis
- **[tiling-coverage-summary.md](./tiling-coverage-summary.md)** - LEGO tiling analysis
- **[pattern-variety-summary.md](./pattern-variety-summary.md)** - Phrase variety analysis
- **[translation-accuracy-summary.md](./translation-accuracy-summary.md)** - Translation quality

---

## 📞 Contact & Questions

**Report Generated By:** Claude (Sonnet 4.5) via Anthropic API
**Date:** February 2, 2026
**For Questions:** Contact Tom Cassidy or SSi Dashboard team

**Scripts Location:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/`
**Reports Location:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/quality-reports/`

---

## 🔄 Next Audit Schedule

- **Re-audit Date:** After fixes applied (Q2 2026)
- **Frequency:** Quarterly recommended
- **Scope:** Full course audit (100+ phrases per course)
- **Focus Areas:** Track improvement on identified issues

---

**Last Updated:** February 2, 2026
