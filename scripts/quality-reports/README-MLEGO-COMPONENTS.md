# M-LEGO Component Quality Analysis - README

## What This Analysis Does

This analysis examines **M-type (Molecular) LEGOs** across 6 major SSi courses to ensure they have proper component breakdowns. Components are the building blocks that should be taught BEFORE the full phrase.

## Files Generated

1. **mlego-components.json** (99 KB, 3,980 lines)
   - Complete JSON report with detailed metrics and examples
   - Per-course analysis with issue examples
   - Machine-readable for further processing

2. **mlego-components-SUMMARY.md** (13 KB)
   - Human-readable executive summary
   - Detailed course-by-course analysis
   - Examples of good and bad decompositions
   - Prioritized recommendations

3. **mlego-components-viz.txt** (7.1 KB)
   - ASCII art visualizations
   - Quick reference charts
   - Key metrics dashboard

## Quick Results

### Overall Quality: 69.1% Good Decompositions ⚠️

- **Total M-LEGOs analyzed:** 2,822 across 6 courses
- **Good decompositions:** 1,949 (69.1%)
- **Issues found:** 873 (30.9%)

### Course Rankings

1. 🟢 **Arabic** (ara_for_eng): **87.2%** - Excellent
2. 🟢 **German** (deu_for_eng): **87.1%** - Excellent
3. 🟢 **Chinese** (zho_for_eng): **82.7%** - Good
4. 🟡 **Dutch** (nld_for_eng): **71.8%** - Moderate
5. 🟡 **Irish** (gle_for_eng): **60.1%** - Needs Work
6. 🔴 **Korean** (kor_for_eng): **20.0%** - Critical Issues

## Critical Findings

### 🔴 Korean Course - CRITICAL (20.0% quality)

**Issue:** 50% of M-LEGOs use **dictionary forms** in components but target text has **conjugated forms**.

**Example:**
```
M-LEGO: "I want to speak" → "말하고 싶어요"
Component: "speak" → "말하다" ❌
Actual in target: "말하고" (conjugated)
```

**Impact:** Learners cannot mentally construct the M-LEGO from its components.

**Fix Required:** Use actual conjugated forms that appear in target text.

### 🟡 Grammar Explanations (24% of all M-LEGOs)

**Issue:** Using labels like "(possessive)", "(measure word)" instead of actual words.

**Examples:**

**Chinese:**
```
BAD:  "a" → "一个" with components: ["one"→"一", "(measure word)"→"个"]
GOOD: "a" → "一个" with components: ["one"→"一", "个"→"个"]
```

**Courses affected:**
- Irish: 264 cases (39% of its M-LEGOs)
- Korean: 173 cases (44% of its M-LEGOs)
- Dutch: 78 cases (27% of its M-LEGOs)
- Chinese: 74 cases (17% of its M-LEGOs)

## What Makes a Good Component?

### ✅ Good Components

1. **Real words**, not grammar explanations
2. **Actually appear** in the target text (exact substring match)
3. **Enable mental construction** of the full M-LEGO
4. **Long phrases** (4+ chars) have 2+ components

### ❌ Bad Components

1. Grammar labels: "(possessive)", "(measure word)", "plural"
2. Dictionary forms that don't appear in target (Korean issue)
3. Components that aren't substrings of target text
4. Single component for long phrases

## Good Examples

### Chinese
```
"I want" → "我想"
Components: ["I"→"我", "want"→"想"]
✅ Both are real words
✅ Both appear in target
```

### German
```
"with you" → "mit dir"
Components: ["with"→"mit", "you"→"dir"]
✅ Both are real words
✅ Both appear in target
```

### Arabic
```
(87.2% quality - best in class)
```

## Recommendations

### Immediate (Week 1)
- 🔴 Fix Korean component matching (195 broken M-LEGOs)
- 🟡 Review Chinese grammar labels (74 cases)

### Short-term (Month 1)
- 🟡 Replace Irish grammar labels (264 cases)
- 🟡 Fix Korean grammar labels (173 cases)
- 🟡 Dutch/German cleanup (78/72 cases)

### Long-term (Quarter 1)
- 🟢 Add automated validation to Course Builder
- 🟢 Create component best practices guide
- 🟢 Re-audit all courses after fixes

## How to Use This Report

### For Course Authors
1. Read **mlego-components-SUMMARY.md** for your course's section
2. Review examples of bad decompositions
3. Follow the fix patterns shown
4. Submit corrections via Course Builder

### For Developers
1. Parse **mlego-components.json** for detailed issue lists
2. Use issue examples to guide automated fixes
3. Implement validation rules based on quality gates
4. Add checks to Course Builder API

### For QA Team
1. Use visual summary (**mlego-components-viz.txt**) for quick dashboard
2. Track fixes by course priority
3. Re-run analysis after corrections
4. Monitor quality score trends

## Running the Analysis

```bash
# Run the analysis
node scripts/analyze-mlego-component-quality.cjs

# View results
cat scripts/quality-reports/mlego-components-SUMMARY.md
cat scripts/quality-reports/mlego-components-viz.txt
jq '.' scripts/quality-reports/mlego-components.json
```

## Technical Details

### Database Schema
```sql
-- course_legos table structure
CREATE TABLE course_legos (
  course_code TEXT,
  seed_number INTEGER,
  lego_index INTEGER,
  known_text TEXT,
  target_text TEXT,
  type CHAR(1),  -- 'A' for Atomic, 'M' for Molecular
  components JSONB,  -- Array of {known, target} objects
  is_new BOOLEAN
);
```

### Component Format
```javascript
components: [
  { "known": "I", "target": "我" },
  { "known": "want", "target": "想" }
]
```

## Quality Gates

1. ✅ **Has components?** (array not null/empty)
2. ✅ **Long phrases have 2+ components?** (4+ chars need 2+ components)
3. ✅ **Real words?** (not grammar explanations)
4. ✅ **In target text?** (substring match)

---

**Analysis Date:** 2026-02-02
**Analyst:** Claude Sonnet 4.5
**Database:** Supabase production
**Courses Analyzed:** zho_for_eng, nld_for_eng, gle_for_eng, deu_for_eng, kor_for_eng, ara_for_eng
