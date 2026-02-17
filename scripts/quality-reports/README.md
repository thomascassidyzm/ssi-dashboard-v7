# SSi Quality Analysis Reports

**Generated:** 2026-02-02
**Linguistic Quality Analyst:** Claude

This directory contains comprehensive quality analysis reports for the SSi language learning system.

---

## Available Analyses

### 1. **Tiling Coverage Analysis** 🆕
**Status:** ✅ Complete (97.9% pass rate)

Analyzes whether seed sentences can be fully reconstructed from their LEGOs.

**Files:**
- `TILING_COVERAGE_REPORT.md` - Complete report with all findings
- `TILING_COVERAGE_VISUAL.md` - Charts and visual summary
- `tiling-coverage-summary.md` - Detailed analysis with examples
- `tiling-coverage.json` - Raw data

**Analysis Script:** `scripts/analyze-tiling-coverage.py`

**Quick View:**
```bash
cat scripts/quality-reports/TILING_COVERAGE_REPORT.md
```

---

### 2. **ZUT (Zero Untaught) Compliance**
**Status:** ✅ Complete (98.24% pass rate)

**Analysis Tool:** `scripts/analyze-zut-compliance.cjs`

---

## Report Files

### 1. `zut-compliance.json`
**Full machine-readable data**
- Complete violation details for all 857 violations
- Per-course statistics and metrics
- Top violating words/seeds/LEGOs
- Sample violations for quick inspection

**Use for:** Automated processing, detailed analysis, data visualization

---

### 2. `zut-compliance-summary.md`
**Executive summary for stakeholders**
- Overall ZUT compliance: 98.24%
- Per-course analysis with severity ratings
- Critical issues identified
- Recommendations for improvement

**Use for:** Understanding overall quality, presenting to leadership

---

### 3. `zut-compliance-detailed-findings.md`
**Deep-dive into violation patterns**
- Detailed examples from each course
- Root cause analysis for each pattern
- Language-specific issues (German reflexives, Breton particles, etc.)
- Methodology and limitations

**Use for:** Understanding WHY violations occur, technical investigation

---

### 4. `zut-compliance-action-plan.md`
**Implementation roadmap**
- Prioritized fix list (Critical → High → Medium)
- Specific actions for each issue
- Estimated effort and impact
- Validation protocol

**Use for:** Actually fixing the issues, tracking progress

---

## Quick Start

### View Summary
```bash
cat scripts/quality-reports/zut-compliance-summary.md
```

### View Action Plan
```bash
cat scripts/quality-reports/zut-compliance-action-plan.md
```

### Re-run Analysis (after fixes)
```bash
node scripts/analyze-zut-compliance.cjs
```

---

## Key Findings At A Glance

| Course | Phrases | Pass Rate | Fail Rate | Status |
|--------|---------|-----------|-----------|--------|
| ara_for_eng | 9,058 | 99.92% | 0.08% | ✅ EXCELLENT |
| bre_for_fra | 8,591 | 98.84% | 1.16% | ✅ VERY GOOD |
| deu_for_eng | 9,279 | 98.25% | 1.75% | ✅ VERY GOOD |
| eng_for_deu | 8,820 | 97.93% | 2.07% | ✅ VERY GOOD |
| eng_for_ara | 10,818 | 96.26% | 3.74% | ⚠️ NEEDS ATTENTION |
| **OVERALL** | **46,566** | **98.24%** | **1.76%** | **🟡 MODERATE** |

---

## Top Issues to Fix

### Critical (Fix First)
1. **eng_for_ara:** Word "every" used 272 times before being taught
2. **deu_for_eng S0041:** 62.50% violation rate (verb "fühle" not introduced)
3. **deu_for_eng:** Reflexive pronoun "sich" used without introduction

### High Priority
4. **eng_for_deu:** Article "the" used 82 times before being taught
5. **All courses:** Contraction tokenization issues (couldn't → couldn, didn)

---

## What is ZUT?

**ZUT (Zero Untaught)** = Core SSi principle

Learners should NEVER see vocabulary they haven't learned. Every word/character in a practice phrase must come from:
1. Previously introduced LEGOs
2. Components of current M-type LEGO
3. The current LEGO itself

**Why it matters:** Ensures learners are never confused by unknown words, maintaining confidence and learning flow.

---

## Severity Assessment

**MODERATE SEVERITY**

> Good ZUT compliance but needs attention. 1-5% of phrases have violations. Systematic review recommended.

**Current:** 98.24% compliance
**Target:** >99% compliance
**Gap:** 0.76% (857 violations)

Eliminating the top 10-20 most common violating words would achieve target.

---

## Recommended Next Steps

1. **Read the Action Plan** (`zut-compliance-action-plan.md`)
2. **Start with Critical fixes** (eng_for_ara "every", deu_for_eng S0041)
3. **Validate after each fix** (re-run analysis)
4. **Track progress** toward >99% target

---

## Analysis Methodology

### How Vocabulary is Built
1. Start with empty vocabulary set
2. For each LEGO (in seed/index order):
   - Add M-LEGO components (if M-type)
   - Add LEGO's target_text
   - Check all phrases against this vocabulary
3. Flag any phrase using words not in vocabulary

### Tokenization
- **Character-based:** Arabic, Chinese (split into characters)
- **Word-based:** English, German, French, Spanish, Breton (split on whitespace)

### Limitations
- Contractions may be over-split
- Compound words not handled specially
- Celtic mutations need special handling

---

## Questions?

- **Technical details:** See `zut-compliance-detailed-findings.md`
- **How to fix:** See `zut-compliance-action-plan.md`
- **Raw data:** See `zut-compliance.json`

---

**Last Updated:** 2026-02-02
