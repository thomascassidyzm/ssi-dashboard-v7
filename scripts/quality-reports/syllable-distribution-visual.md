# Syllable Distribution - Visual Analysis

## Quick Reference Chart

### Distribution Heatmap

```
Course          | VS (1-3) | Short (4-6) | Medium (7-12) | Long (13-18) | VL (19+) | Status
----------------|----------|-------------|---------------|--------------|----------|--------
IDEAL TARGET    |    0%    |     10%     |      35%      |      30%     |    25%   | -
----------------|----------|-------------|---------------|--------------|----------|--------
eng_for_fra     |   0.6%   |     3.3%    |    ✓ 62.1%   |     33.8%    |    0.2%  | ✓ EXCELLENT
cym_s_for_eng   |   0.7%   |    10.8%    |    ✓ 61.4%   |     24.3%    |    2.8%  | ✓ EXCELLENT
eng_for_deu     |   0.1%   |     2.3%    |    ✓ 59.9%   |     34.5%    |    3.2%  | ✓ EXCELLENT
cym_n_for_eng   |   0.6%   |     8.6%    |    ✓ 55.3%   |     31.7%    |    3.8%  | ✓ EXCELLENT
deu_for_eng     |   0.0%   |     4.0%    |    ✓ 54.4%   |     37.4%    |    4.2%  | ✓ EXCELLENT
eng_for_ara     |   0.0%   |     3.1%    |    ✓ 49.6%   |     45.7%    |    1.6%  | ✓ VERY GOOD
bre_for_fra     |   0.0%   |     0.3%    |    ⚠ 24.8%   |     63.5%    |   11.4%  | ⚠ BORDERLINE
ara_for_eng     |   0.0%   |     0.1%    |    ✗ 2.0%    |     19.7%    |   78.2%  | ✗ CRITICAL
```

Legend:
- ✓ Green: Meets or exceeds 25% medium threshold
- ⚠ Yellow: Borderline (24-25%)
- ✗ Red: Below threshold (critical)

---

## Bar Chart (Text-Based)

### Medium Phrase Percentage by Course

```
  0%        25%       50%       75%      100%
  |---------|---------|---------|---------|

eng_for_fra     ████████████████████████████████████████████████████████████ 62.1%
cym_s_for_eng   █████████████████████████████████████████████████████████ 61.4%
eng_for_deu     ███████████████████████████████████████████████████████ 59.9%
cym_n_for_eng   ███████████████████████████████████████████████████ 55.3%
deu_for_eng     ████████████████████████████████████████████████ 54.4%
eng_for_ara     ████████████████████████████████████████████ 49.6%
bre_for_fra     ████████████████████ 24.8% ⚠
ara_for_eng     █ 2.0% ✗

Threshold ──────────────────── 25%
Ideal     ─────────────────── 35%
```

---

## Full Distribution Breakdown

### eng_for_fra (English for French speakers) - BEST
```
VS (1-3):   ▏0.6%
Short (4-6):  ▎3.3%
Medium:     ██████████████████████████████████████████ 62.1%
Long:       █████████████████ 33.8%
VL (19+):   ▏0.2%

Avg: 11.4 syllables | Range: 2-20
```

### cym_s_for_eng (Welsh South for English) - EXCELLENT
```
VS (1-3):   ▏0.7%
Short (4-6):  ████ 10.8%
Medium:     ████████████████████████████████████████ 61.4%
Long:       ████████████ 24.3%
VL (19+):   █ 2.8%

Avg: 10.7 syllables | Range: 2-25
```

### eng_for_deu (English for German speakers) - EXCELLENT
```
VS (1-3):   ▏0.1%
Short (4-6):  █ 2.3%
Medium:     ███████████████████████████████████████ 59.9%
Long:       █████████████████ 34.5%
VL (19+):   █ 3.2%

Avg: 11.7 syllables | Range: 2-22
```

### cym_n_for_eng (Welsh North for English) - EXCELLENT
```
VS (1-3):   ▏0.6%
Short (4-6):  ███ 8.6%
Medium:     ████████████████████████████████████ 55.3%
Long:       ████████████████ 31.7%
VL (19+):   █ 3.8%

Avg: 11.3 syllables | Range: 2-25
```

### deu_for_eng (German for English speakers) - EXCELLENT
```
VS (1-3):   ▏0.0%
Short (4-6):  █ 4.0%
Medium:     ███████████████████████████████████ 54.4%
Long:       ██████████████████ 37.4%
VL (19+):   █ 4.2%

Avg: 12.0 syllables | Range: 4-25
```

### eng_for_ara (English for Arabic speakers) - VERY GOOD
```
VS (1-3):   ▏0.0%
Short (4-6):  █ 3.1%
Medium:     ████████████████████████████████ 49.6%
Long:       ██████████████████████ 45.7%
VL (19+):   ▏1.6%

Avg: 12.2 syllables | Range: 4-21
```

### bre_for_fra (Breton for French speakers) - BORDERLINE ⚠
```
VS (1-3):   ▏0.0%
Short (4-6):  ▏0.3%
Medium:     ████████████ 24.8%  ← JUST BELOW THRESHOLD
Long:       ████████████████████████████████ 63.5%
VL (19+):   █████ 11.4%

Avg: 14.6 syllables | Range: 6-24
```

### ara_for_eng (Arabic for English speakers) - CRITICAL ✗
```
VS (1-3):   ▏0.0%
Short (4-6):  ▏0.1%
Medium:     █ 2.0%  ← SEVERE DEFICIT
Long:       ████████████ 19.7%
VL (19+):   ████████████████████████████████████████ 78.2%

Avg: 22.2 syllables | Range: 5-33
WARNING: Syllable counts appear inflated - verify Arabic counter
```

---

## Deviation from Ideal

### Courses ABOVE Ideal Medium (35%)

```
eng_for_fra:    +27.1% (62.1% vs 35% ideal)
cym_s_for_eng:  +26.4% (61.4% vs 35% ideal)
eng_for_deu:    +24.9% (59.9% vs 35% ideal)
cym_n_for_eng:  +20.3% (55.3% vs 35% ideal)
deu_for_eng:    +19.4% (54.4% vs 35% ideal)
eng_for_ara:    +14.6% (49.6% vs 35% ideal)
```

### Courses BELOW Ideal Medium (35%)

```
bre_for_fra:    -10.2% (24.8% vs 35% ideal) ⚠
ara_for_eng:    -33.0% (2.0% vs 35% ideal) ✗ CRITICAL
```

---

## Language Family Analysis

### European Languages (English, German, Welsh, Breton)
- **Average medium %:** 54.8%
- **Range:** 24.8% - 62.1%
- **Observation:** Generally healthy distributions
- **Issue:** Short phrases under-represented (avg 4.4% vs 10% ideal)

### Arabic
- **Medium %:** 2.0% (ara_for_eng)
- **Critical issue:** Syllable counter inflating counts
- **Action required:** Algorithm calibration

---

## Key Metrics Summary

| Metric | Value | Assessment |
|--------|-------|------------|
| Total courses analyzed | 8 | - |
| Courses meeting threshold (≥25% medium) | 6 (75%) | ✓ Strong |
| Courses with missing middle (<25%) | 2 (25%) | ⚠ Needs attention |
| Average medium percentage | 46.2% | ✓ Well above ideal (35%) |
| Average sample size | 1,000 phrases | ✓ Sufficient |
| Syllable coverage | 100% | ✓ Complete data |

---

## Priority Actions

### 🔴 CRITICAL (Week 1)
- **ara_for_eng:** Investigate syllable counter (78% phrases are 19+ syllables)
- **ara_for_eng:** Generate 200+ medium-length phrases

### 🟡 MEDIUM (Week 2)
- **bre_for_fra:** Add 10-20 medium phrases to cross 25% threshold

### 🟢 LOW (Future)
- All courses: Consider adding more short phrases (4-6 syllables)

---

## Conclusion

**The "missing middle" is NOT a systemic problem.**

75% of courses have excellent medium phrase coverage. The issue is isolated to:
1. Arabic course (critical - likely algorithm issue)
2. Breton course (borderline - minor adjustment needed)

Most courses actually have TOO MANY medium phrases relative to the ideal distribution, which is a positive problem to have for learner experience.
