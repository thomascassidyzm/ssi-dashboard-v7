# Pattern Variety Analysis - Complete Documentation

**Analysis Date:** February 2, 2026
**Analyst:** SSi Linguistic Quality Team
**Status:** ✅ Complete

---

## Purpose

This analysis evaluates **pattern variety** across SSi language courses to ensure learners experience diverse sentence structures rather than repetitive patterns. Good variety prevents boredom and builds flexible language skills.

---

## Files in This Report

### Primary Analysis Files

1. **`PATTERN_VARIETY_FINDINGS.md`** ⭐ **START HERE**
   - Complete detailed findings report
   - Course-by-course analysis with recommendations
   - Actionable priorities with examples
   - 18 pages of comprehensive analysis

2. **`pattern-variety-quick-reference.txt`** 📊 **EXECUTIVE SUMMARY**
   - Visual quick reference with ASCII charts
   - Key metrics at a glance
   - Priority actions with timelines
   - Perfect for sharing with stakeholders

3. **`pattern-variety-summary.md`** 📝 **TECHNICAL NOTES**
   - Initial analysis findings (v1)
   - Documents the bilingual detection bug discovered
   - Shows the analysis methodology evolution

### Data Files

4. **`pattern-variety-v2.json`** ✅ **AUTHORITATIVE DATA**
   - Complete analysis results (bilingual-aware)
   - All 5 courses, 1,000 phrases each
   - Pattern distributions, opening frequencies, variety scores
   - Use this for programmatic access to findings

5. **`pattern-variety.json`** 🔧 **HISTORICAL DATA**
   - Original v1 analysis (bilingual detection bug)
   - Kept for comparison and learning
   - Shows what happens when analyzing wrong language

### Analysis Scripts

6. **`analyze-pattern-variety-v2.cjs`** ✅ **PRODUCTION SCRIPT**
   - Improved bilingual-aware analysis
   - Detects target language and analyzes correct text field
   - Run with: `node scripts/quality-reports/analyze-pattern-variety-v2.cjs`

7. **`analyze-pattern-variety.cjs`** 🔧 **ORIGINAL SCRIPT**
   - V1 with bilingual bug
   - Kept for reference and learning

---

## Key Findings Summary

### Overall Assessment: EXCELLENT (98.6/100)

All five courses demonstrate outstanding sentence pattern variety:

| Course | Score | Status |
|--------|-------|--------|
| **cym_s_for_eng** (Welsh) | 100/100 | 🏆 Gold Standard |
| **eng_for_deu** (English→German) | 99/100 | ⭐ Excellent |
| **deu_for_eng** (German→English) | 98/100 | ⭐ Excellent |
| **ara_for_eng** (Arabic→English) | 98/100 | ⭐ Excellent |
| **eng_for_ara** (English→Arabic) | 98/100 | ⭐ Excellent |

### What's Working Well ✅

- **Sentence type diversity:** Excellent mix of statements, questions, commands
- **Question integration:** 22-38% questions across courses (target: 25-35%)
- **Negation coverage:** 8-12% in most courses (target: 10-15%)
- **No catastrophic repetition:** All courses avoid severe pattern monotony

### Primary Issue ⚠️

**Over-reliance on first-person subjects (73-77% in most courses)**

Current distribution:
- First person (I, we): 73-77% ⚠️ **TOO HIGH**
- Second person (you): 8-12% ⚠️ **TOO LOW**
- Third person (he/she/they): 8-12% ⚠️ **TOO LOW**

Target distribution:
- First person: 40-50%
- Second person: 20-25%
- Third person: 15-20%

### Critical Issue 🔴

**"I want to" repetition in Arabic courses**
- ara_for_eng: 11% of phrases start with "I want to"
- eng_for_ara: 12.3% of phrases start with "I want to"
- Target: <4% per opening pattern

---

## Priority Actions

### 1. Fix "I want to" Repetition (URGENT)
**Courses:** ara_for_eng, eng_for_ara
**Timeline:** This week
**Impact:** HIGH (learner boredom risk)

Replace 60-70% with alternatives:
- "I'd like to..."
- "I need to..."
- "I'm planning to..."
- "Do you want to...?" (question)

### 2. Reduce First-Person Dominance
**Courses:** All (except Welsh)
**Timeline:** 1 month
**Impact:** MEDIUM (limits conversational fluency)

Convert 200-300 phrases per course:
- From: "I want to learn"
- To: "You want to learn" (second person)
- To: "She wants to learn" (third person)

### 3. Increase Second-Person Usage
**Courses:** All (except Welsh)
**Timeline:** 1-2 weeks
**Impact:** MEDIUM (improves dialogue readiness)

Add 100-150 phrases per course:
- "You should try..."
- "Can you help...?"
- "What about you?"

---

## How to Use This Analysis

### For Course Designers
1. Read `PATTERN_VARIETY_FINDINGS.md` for detailed recommendations
2. Focus on Priority 1 (fix "I want to" repetition) first
3. Use Welsh course (cym_s_for_eng) as gold standard template
4. Implement changes incrementally (Priority 1 → 2 → 3 → 4)

### For Quality Analysts
1. Use `pattern-variety-v2.json` for data-driven analysis
2. Run `analyze-pattern-variety-v2.cjs` periodically to track improvements
3. Compare scores before/after changes
4. Monitor opening pattern distributions (top 10 should be <45% combined)

### For Stakeholders
1. Read `pattern-variety-quick-reference.txt` for executive summary
2. Key takeaway: Courses are excellent (98.6/100) but need more "you/he/she" perspectives
3. Welsh course is perfect model for others to follow
4. Estimated improvement timeline: 1-2 months

---

## Methodology

### What We Analyzed
- **Data Source:** Supabase `course_practice_phrases` table
- **Sample Size:** 1,000 USE phrases per course (5,000 total)
- **Courses:** deu_for_eng, ara_for_eng, eng_for_ara, eng_for_deu, cym_s_for_eng

### Pattern Categories

**Sentence Types:**
- **Statements:** "I want to learn"
- **Questions:** "Do you want to learn?"
- **Commands:** "Try to learn!"
- **Negations:** "I don't want to learn"

**Subject Perspectives:**
- **First person:** I, me, we, us
- **Second person:** you, your
- **Third person:** he, she, they, him, her

**Opening Patterns:** First 2-3 words of each phrase

### Variety Score Calculation (0-100)

Higher score = more diverse patterns

**Penalties applied for:**
- Any category >70% (over-concentration)
- Any category <5% (missing diversity)
- Top opening >15% (repetitive)
- Top 5 openings >40% (top-heavy)

### Bilingual Course Handling

**Key improvement in v2:**
- For reverse courses (eng_for_X), analyzes **target_text** (English output)
- For standard courses (X_for_eng), analyzes **known_text** (English input)
- V1 bug: Analyzed wrong field, resulting in false "command" categorization

---

## Example Output Interpretation

### Good Variety (Welsh - 100/100)
```
Statements:   24.7%  ████████
Questions:    22.9%  ███████▋
Commands:     52.4%  █████████████████
First person: 27.9%  █████████
Second person:22.5%  ███████▌
Top opening:  "I met someone" (3.5%) ✅
```
**Why it's good:** Balanced distribution, no dominant pattern

### Poor Variety (Hypothetical - 60/100)
```
Statements:   85.0%  ████████████████████████████ ⚠️
Questions:     5.0%  █▋
Commands:      5.0%  █▋
First person: 92.0%  ██████████████████████████████ ⚠️
Top opening:  "I want to" (35%) 🔴
```
**Why it's bad:** Over-concentration, repetitive openings

---

## Technical Details

### Requirements
- Node.js 16+
- @supabase/supabase-js
- dotenv
- Access to Supabase database (credentials in .env)

### Running the Analysis
```bash
# Navigate to repository root
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean

# Run analysis (v2 - recommended)
node scripts/quality-reports/analyze-pattern-variety-v2.cjs

# Output: pattern-variety-v2.json
```

### Customizing Analysis
Edit `COURSES` array in script to analyze different courses:
```javascript
const COURSES = [
  'deu_for_eng',
  'fra_for_eng',  // Add French
  'spa_for_eng'   // Add Spanish
];
```

---

## Comparison with V1 (Bug Discovery)

### V1 Bug: Analyzed Wrong Language
For reverse courses (eng_for_ara, eng_for_deu), v1 analyzed the KNOWN text (Arabic/German) with English pattern rules, resulting in:
- eng_for_ara: 100% "commands" ❌ (false detection)
- eng_for_deu: 89% "commands" ❌ (false detection)

### V2 Fix: Bilingual-Aware
V2 detects which language is being taught and analyzes the correct field:
- eng_for_ara: Analyzes **target_text** (English output) ✅
- eng_for_deu: Analyzes **target_text** (English output) ✅

Result: Accurate pattern categorization for all courses.

---

## Future Enhancements

### Planned Improvements
1. **Multi-language pattern detection:** Analyze patterns in German, Arabic, Welsh
2. **Emotional variety analysis:** Detect sentiment/tone patterns
3. **Progression tracking:** Pattern variety across course levels (early vs. late)
4. **Automated alerts:** Flag courses when patterns become too repetitive

### Research Questions
1. Does subject variety (I/you/he) correlate with learner fluency?
2. What's the optimal negation percentage for natural conversation?
3. Do learners prefer question-heavy or statement-heavy courses?

---

## Validation & Quality Assurance

### How We Validated the Analysis

1. **Manual review:** Inspected sample phrases from each category
2. **Cross-course comparison:** Identified consistent patterns across courses
3. **Gold standard:** Welsh course (100/100) used as reference model
4. **Bug fixing:** Discovered and fixed bilingual detection issue

### Known Limitations

1. **English-only pattern detection:** Cannot analyze German/Arabic/Welsh patterns
2. **Simple rule-based matching:** May miss complex grammatical structures
3. **Command over-detection:** Phrases without subject pronouns flagged as commands
4. **Context-free analysis:** Each phrase analyzed independently

---

## Questions & Support

### For Questions About This Analysis
- Review `PATTERN_VARIETY_FINDINGS.md` for detailed explanations
- Check `pattern-variety-v2.json` for raw data
- Contact SSi Quality Analysis team

### For Technical Issues
- Script errors: Check .env for Supabase credentials
- Database access: Verify SUPABASE_URL and SUPABASE_SERVICE_KEY
- Node.js issues: Ensure Node.js 16+ installed

---

## Changelog

### Version 2.0 (February 2, 2026)
- ✅ Added bilingual course support
- ✅ Fixed reverse course analysis (eng_for_X)
- ✅ Added language detection for non-English phrases
- ✅ Improved variety score calculation
- ✅ Added comprehensive documentation

### Version 1.0 (February 2, 2026)
- ⚠️ Initial analysis with bilingual detection bug
- ✅ Basic pattern categorization
- ✅ Opening pattern analysis
- ✅ Variety score calculation

---

## Related Analyses

This pattern variety analysis is part of a comprehensive quality assessment suite:

- **Vocabulary Balance:** Ensures gradual vocabulary introduction
- **ZUT Compliance:** Validates zero untaught LEGOs
- **Translation Accuracy:** Checks seed translation quality
- **Tiling Coverage:** Verifies LEGO decomposition completeness
- **M-LEGO Components:** Analyzes multi-word LEGO structures
- **Syllable Distribution:** Tracks phrase complexity
- **Grammar Analysis:** Reviews grammatical pattern variety

See `scripts/quality-reports/` for all analyses.

---

## Citation

When referencing this analysis:

> SSi Linguistic Quality Team. (2026). *Pattern Variety Analysis: Sentence Structure Diversity in SSi Language Courses*. SSi Dashboard v7 Quality Reports. Retrieved from `/scripts/quality-reports/PATTERN_VARIETY_FINDINGS.md`

---

**Last Updated:** February 2, 2026
**Analysis Version:** 2.0
**Next Review:** After implementing Priority 1 & 2 actions (March 2026)

---

## Quick Start

**Want the highlights?** Read these in order:
1. `pattern-variety-quick-reference.txt` (5 min - executive summary)
2. `PATTERN_VARIETY_FINDINGS.md` (20 min - detailed analysis)
3. `pattern-variety-v2.json` (data access)

**Want to re-run analysis?**
```bash
node scripts/quality-reports/analyze-pattern-variety-v2.cjs
```

**Want to improve courses?** Focus on:
1. Fix "I want to" repetition (Priority 1)
2. Add more "you/he/she" phrases (Priority 2)

---

✅ **Analysis complete. All courses show excellent variety (98.6/100 average).**
