# Vocabulary Balance - Quick Reference

**Analysis Date:** 2026-02-02
**Status:** ⚠️ Action Required

---

## At-a-Glance Summary

| Course | Status | Gini | Underused | Action Priority |
|--------|--------|------|-----------|-----------------|
| **deu_for_eng** | 🔴 Critical | 0.374 | 30.6% | **URGENT** |
| **ara_for_eng** | 🟠 High | 0.309 | 25.6% | **HIGH** |
| **bre_for_fra** | 🟡 Moderate | 0.242 | 19.0% | Medium |
| **cym_s_for_eng** | 🟢 Good | 0.255 | 1.2% | Monitor (overuse) |
| **cym_n_for_eng** | 🟢 Good | 0.294 | 1.4% | Monitor (overuse) |

**Legend:**
- 🔴 Critical: > 25% underused OR Gini > 0.35
- 🟠 High: 15-25% underused OR Gini 0.30-0.35
- 🟡 Moderate: 10-15% underused OR Gini 0.25-0.30
- 🟢 Good: < 10% underused AND Gini < 0.25

---

## Top 3 Action Items

### 1. 🔥 German (deu_for_eng) - Backfill Seeds 1-30

**Problem:** 365 LEGOs (30.6%) have < 3 practice phrases. Seeds 1-10 have 0 phrases.

**Critical Missing LEGOs:**
- "how" (wie) - 0 phrases
- "to speak" (sprechen) - 0 phrases
- "I am trying" (ich versuche) - 0 phrases
- "I want" (ich will) - 0 phrases

**Action:** Generate 5-8 practice phrases per LEGO for Seeds 1-30.

**Timeline:** Week 1

---

### 2. 🔥 Arabic (ara_for_eng) - Backfill Seeds 1-20

**Problem:** 276 LEGOs (25.6%) have < 3 practice phrases. Basic conversational vocabulary missing.

**Critical Missing LEGOs:**
- "how" (كيف) - 0 phrases
- "I'm trying" (أحاول) - 0 phrases
- "I want" (أريد) - 0 phrases
- "I speak" (أتكلم) - 0 phrases
- "Arabic" (العربية) - 0 phrases

**Action:** Generate 5-8 practice phrases per LEGO for Seeds 1-20.

**Timeline:** Week 1

---

### 3. 📊 Welsh (cym_s_for_eng, cym_n_for_eng) - Cap Overuse

**Problem:** 7-9% of LEGOs have > 15 phrases (up to 51 phrases for a single LEGO).

**Overused Examples:**
- "you'd help" (byddet ti'n helpu) - 51 phrases
- "if I could" ('sen i'n gallu) - 47 phrases
- "today" (heddiw) - 46 phrases

**Action:** Cap maximum at 20 phrases per LEGO. Redistribute excess to underused LEGOs.

**Timeline:** Month 1

---

## Detailed Statistics

```
┌─────────────────┬────────┬─────────┬──────────┬─────────┬───────┬────────────┬──────────┐
│ Course          │ LEGOs  │ Phrases │ Avg/LEGO │ Std Dev │ Gini  │ Underused% │ Overused%│
├─────────────────┼────────┼─────────┼──────────┼─────────┼───────┼────────────┼──────────┤
│ deu_for_eng     │   1194 │    9279 │     7.77 │    5.41 │ 0.374 │       30.6 │      0.3 │
│ ara_for_eng     │   1078 │    9058 │     8.40 │    5.12 │ 0.309 │       25.6 │      0.0 │
│ bre_for_fra     │    895 │    8591 │     9.60 │    4.84 │ 0.242 │       19.0 │      0.2 │
│ cym_s_for_eng   │    679 │    6021 │     8.87 │    5.24 │ 0.255 │        1.2 │      7.7 │
│ cym_n_for_eng   │    635 │    5797 │     9.13 │    6.27 │0.294 │        1.4 │      9.0 │
└─────────────────┴────────┴─────────┴──────────┴─────────┴───────┴────────────┴──────────┘
```

**Definitions:**
- **Underused:** < 3 phrase appearances
- **Overused:** > 15 phrase appearances
- **Gini:** Inequality coefficient (0 = perfect equality, 1 = perfect inequality)

---

## Quality Thresholds

### Gini Coefficient

| Range | Assessment |
|-------|------------|
| < 0.20 | ✅ Excellent |
| 0.20 - 0.25 | ✅ Good |
| 0.25 - 0.30 | ⚠️ Moderate |
| 0.30 - 0.40 | 🔴 High inequality |
| > 0.40 | 🔴 Severe inequality |

**Current Status:**
- ✅ Breton (0.242) - best performer
- ⚠️ Welsh South (0.255), Welsh North (0.294)
- 🔴 Arabic (0.309), German (0.374)

### Phrase Distribution Goals

| Metric | Current | Target |
|--------|---------|--------|
| Average phrases/LEGO | 7.8 - 9.6 | 8-10 |
| Underused LEGOs | 1.2% - 30.6% | < 5% |
| Overused LEGOs | 0% - 9.0% | < 5% |
| LEGOs with 0 phrases | Multiple | 0 |

---

## Success Criteria

✅ **Achieve by end of Q1:**
1. All courses: Gini < 0.25
2. All courses: < 5% LEGOs underused
3. All courses: < 5% LEGOs overused
4. Zero LEGOs with 0 practice phrases
5. Standard deviation < 50% of mean

---

## Best Practice: Learn from Breton

**Why is Breton (bre_for_fra) the best balanced?**

- Lowest Gini (0.242)
- Highest average phrases/LEGO (9.60)
- Fewest overused LEGOs (0.2%)
- Most consistent distribution (SD = 50% of mean)

**Action:** Analyze Breton's phrase generation strategy and replicate across other courses.

---

## Files Generated

1. **vocabulary-balance.json** (41 KB)
   - Full analysis data
   - Per-course detailed breakdowns
   - Top/bottom 10 LEGOs per course
   - Statistical measures

2. **vocabulary-balance-summary.md** (10 KB)
   - Executive summary
   - Detailed findings per course
   - Interpretation guide
   - Recommendations

3. **vocabulary-balance-quick-reference.md** (this file)
   - At-a-glance status
   - Top 3 actions
   - Quick statistics

---

## Next Steps

1. ✅ **Week 1:** Backfill German & Arabic Seeds 1-30
2. ⏭️ **Month 1:** Cap Welsh overuse, redistribute phrases
3. ⏭️ **Month 1:** Analyze Breton's strategy
4. ⏭️ **Q1:** Apply rebalancing to all courses
5. ⏭️ **Q1:** Establish automated monitoring

---

## Contact

**Script:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/analyze-vocabulary-balance.cjs`

**Rerun analysis:**
```bash
node scripts/analyze-vocabulary-balance.cjs
```

**View full report:**
```bash
cat scripts/quality-reports/vocabulary-balance.json | jq .
```

---

*Generated by Claude - Linguistic Quality Analyst*
*Last updated: 2026-02-02*
