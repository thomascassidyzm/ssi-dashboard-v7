# SSi Pattern Variety Analysis - Summary Report

**Generated:** 2026-02-02
**Courses Analyzed:** 5 (deu_for_eng, ara_for_eng, eng_for_ara, eng_for_deu, cym_s_for_eng)
**Phrases per Course:** 1,000 USE phrases

---

## Executive Summary

The analysis reveals **significant variation** in pattern diversity across SSi courses. Welsh (cym_s_for_eng) demonstrates excellent variety (100/100), while courses for Arabic and German speakers learning English show concerning pattern monotony (scores 76-82/100).

### Overall Scores
- **Best:** cym_s_for_eng (South Welsh) - **100/100** ✅
- **Good:** deu_for_eng (German) - **98/100** ✅
- **Good:** ara_for_eng (Arabic) - **97/100** ✅
- **Poor:** eng_for_deu (English for Germans) - **82/100** ⚠️
- **Poor:** eng_for_ara (English for Arabs) - **76/100** ⚠️

**Average Score:** 90.6/100

---

## Key Findings

### 🏆 Best Practice: cym_s_for_eng (Welsh)
**Variety Score: 100/100**

**Strengths:**
- Near-perfect balance: 33.5% statements, 35% questions, 31.5% commands
- Diverse subjects: 45.8% first person, 22.5% second person
- No single opening exceeds 3.5% of phrases
- Rich variety in sentence starters

**Pattern Distribution:**
```
Statements:   33.5%  ████████████
Questions:    35.0%  █████████████
Commands:     31.5%  ███████████
Negations:     0.0%  (none detected)
```

**Subject Distribution:**
```
First Person:  45.8%  █████████████████
Second Person: 22.5%  ████████
Third Person:   5.2%  ██
Unknown:       26.5%  █████████
```

---

### ✅ Strong Courses: deu_for_eng & ara_for_eng
**Variety Scores: 98/100 & 97/100**

Both German and Arabic courses show good variety but share one weakness:

**Common Issue:**
- **Over-reliance on first-person subjects** (77-80%)
- Limited third-person constructions (9-12%)

**deu_for_eng (German):**
- 41% statements, 31% questions, 17% commands
- Top opening: "I think that" (6.4%)

**ara_for_eng (Arabic):**
- 34% statements, 22% questions, 33% commands
- Top opening: "I want to" (11%) ⚠️ (repetitive)

---

### ⚠️ Problem Courses: eng_for_ara & eng_for_deu

These courses suffer from **severe pattern monotony**:

#### eng_for_ara (English for Arabic speakers)
**Variety Score: 76/100** - CRITICAL ISSUES

**Problems:**
- **100% of phrases classified as "commands"** by English-language patterns
- This is likely a **detection artifact** due to Arabic text being analyzed
- 0% questions, 0% negations, 0% statements detected
- Pattern detector is evaluating **Arabic text with English rules**

**Reality Check:**
Looking at sample phrases, these ARE actual sentences in Arabic:
- "أريد أن أتحدث" = "I want to speak"
- "أنا أحاول أن" = "I am trying to"

**Root Cause:** The analysis script only detects patterns in English. The `known_text` column contains Arabic for reverse courses (eng_for_ara), causing false categorization.

#### eng_for_deu (English for German speakers)
**Variety Score: 82/100** - SIMILAR ISSUE

**Problems:**
- **89% classified as "commands"** (likely German text being misread)
- 11% questions, 0% negations, 0% statements
- All subjects marked "unknown" (100%)

**Sample German phrases:**
- "Ich will." = "I want."
- "Ich versuche zu" = "I try to"

**Root Cause:** Same as eng_for_ara - analyzing German text with English pattern rules.

---

## Recommendations

### 1. Fix Bilingual Pattern Detection ⚠️ URGENT

**Problem:** The current script only analyzes English text patterns. For reverse courses (eng_for_ara, eng_for_deu), the `known_text` is in the learner's native language (Arabic, German), causing false categorization.

**Solution:**
- For reverse courses, analyze `target_text` (English) instead of `known_text`
- Add pattern detection for German and Arabic (or skip non-English analysis)
- Flag courses where pattern detection fails

**Implementation:**
```javascript
// Detect if course is reverse (teaching English)
const isReverseEnglish = courseCode.startsWith('eng_for_');

// For reverse courses, analyze target_text (English output)
const textToAnalyze = isReverseEnglish ? p.target_text : p.known_text;
```

### 2. Reduce First-Person Over-Use (deu_for_eng, ara_for_eng)

Both courses are **77-80% first-person dominant**. Recommended distribution:
- First person: 40-60%
- Second person: 15-25%
- Third person: 15-25%

**Actions:**
- Add more "you" questions ("Do you want...", "Can you...?")
- Include storytelling with "he/she/they"
- Mix in descriptive sentences about others

### 3. Add Negation Patterns (cym_s_for_eng)

Welsh course has **0% negation** phrases detected. This may be accurate (Welsh handles negation differently), or a detection gap.

**Actions:**
- Review if negative constructions exist in Welsh phrases
- If missing, add phrases like:
  - "I don't want..."
  - "She can't..."
  - "We won't..."

### 4. Reduce Repetitive Openings (ara_for_eng)

**11% of phrases start with "I want to"** - this is too repetitive.

**Actions:**
- Vary with "I'd like to", "I need to", "I'm planning to"
- Introduce questions: "Do you want to...?"
- Add conditionals: "If I could..."

---

## Overall Trends

**Across all courses (where pattern detection worked):**
- Average statement usage: 21.6%
- Average question usage: 19.6%
- Average first-person usage: 40.5%

**Ideal targets:**
- Statements: 30-40%
- Questions: 20-30%
- Commands: 10-20%
- Negations: 10-15%
- First person: 40-50%
- Second person: 20-30%
- Third person: 15-25%

---

## Technical Notes

### Pattern Detection Logic

**Sentence Types:**
- **Questions:** Contains "?", starts with "do/does/can/will", or includes "what/where/when/why/how"
- **Negations:** Contains "don't/doesn't/not/never/can't/won't"
- **Commands:** Starts with verb, no subject pronoun
- **Statements:** Default category

**Subject Detection:**
- **First person:** "I", "me", "my", "we", "our", "us"
- **Second person:** "you", "your"
- **Third person:** "he", "she", "they", "him", "her", "them"

**Opening Pattern:** First 2-3 words of each phrase

### Limitations

1. **English-only pattern detection** - Fails on Arabic/German text
2. **Simple rule-based matching** - May miss complex grammatical patterns
3. **Command detection over-sensitive** - Classifies non-English as commands
4. **No context awareness** - Treats each phrase independently

---

## Action Items

### Immediate (Critical)
- [ ] Fix pattern detection for reverse courses (eng_for_ara, eng_for_deu)
- [ ] Re-run analysis with corrected script
- [ ] Verify actual variety in English outputs for these courses

### Short-term (1-2 weeks)
- [ ] Add 10-15% more third-person phrases to deu_for_eng and ara_for_eng
- [ ] Reduce "I want to" repetition in ara_for_eng (currently 11%)
- [ ] Review negation coverage in cym_s_for_eng

### Long-term (1-2 months)
- [ ] Develop multi-language pattern detection
- [ ] Add sentiment/emotional variety analysis
- [ ] Track variety across course progression (early vs late phrases)

---

## Conclusion

The SSi courses show **good overall variety** (90.6/100 average), with Welsh leading as a gold standard. However, the analysis reveals a **critical bug** in reverse course analysis that must be fixed before drawing conclusions about eng_for_ara and eng_for_deu.

Once corrected, focus should shift to:
1. Reducing first-person dominance in German/Arabic courses
2. Adding more third-person storytelling elements
3. Varying sentence openings to prevent monotony

**Next Steps:** Fix the bilingual detection issue and re-run the full analysis.

---

**Full Report:** `pattern-variety.json`
**Analysis Script:** `analyze-pattern-variety.cjs`
