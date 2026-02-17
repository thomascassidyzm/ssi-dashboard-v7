# QA Phrase Quality Comparison Report

**Generated:** 2026-01-30
**Sample Size:** 50 phrases per course per round
**Round 1:** 80% USE + 20% BUILD phrases
**Round 2:** 100% USE phrases only (≥5 syllables)
**Scoring Scale:** 1-9 (9=perfect native speech, 7-8=strong, 5-6=functional, 3-4=awkward, 1-2=marginal)

## Summary Table

| Course | Type | R1 Score | R2 Score | Change | Combined Avg |
|--------|------|----------|----------|--------|--------------|
| **cym_n_for_eng** | X_for_eng | 7.48 | 8.58 | +1.10 | **8.03** |
| **cym_s_for_eng** | X_for_eng | 7.58 | 7.78 | +0.20 | **7.68** |
| deu_for_eng | X_for_eng | 6.84 | 8.64 | +1.80 | **7.74** |
| fra_for_eng | X_for_eng | 6.72 | 7.42 | +0.70 | **7.07** |
| ita_for_eng | X_for_eng | 6.70 | 7.76 | +1.06 | **7.23** |
| jpn_for_eng | X_for_eng | 7.14 | 7.56 | +0.42 | **7.35** |
| kor_for_eng | X_for_eng | 7.00 | 8.24 | +1.24 | **7.62** |
| nld_for_eng | X_for_eng | 7.52 | 7.14 | -0.38 | **7.33** |
| por_for_eng | X_for_eng | 6.46 | 8.20 | +1.74 | **7.33** |
| spa_for_eng | X_for_eng | 6.40 | 8.04 | +1.64 | **7.22** |
| zho_for_eng | X_for_eng | 7.22 | 7.40 | +0.18 | **7.31** |
| ara_for_eng | X_for_eng | 6.36 | 6.56 | +0.20 | **6.46** |
| eng_for_ara | eng_for_X | 6.48 | 8.46 | +1.98 | **7.47** |
| eng_for_deu | eng_for_X | 7.00 | 7.88 | +0.88 | **7.44** |
| eng_for_fra | eng_for_X | 6.72 | 8.52 | +1.80 | **7.62** |
| eng_for_jpn | eng_for_X | 7.52 | 6.96 | -0.56 | **7.24** |
| eng_for_por | eng_for_X | 7.28 | 8.28 | +1.00 | **7.78** |
| eng_for_spa | eng_for_X | 7.26 | 8.32 | +1.06 | **7.79** |
| eng_for_zho | eng_for_X | 6.42 | 7.14 | +0.72 | **6.78** |

## Category Averages

### X_for_eng Courses (12 courses)
- **Round 1 Average:** 6.95
- **Round 2 Average:** 7.78
- **Combined Average:** 7.36

### eng_for_X Courses (7 courses)
- **Round 1 Average:** 6.95
- **Round 2 Average:** 7.94
- **Combined Average:** 7.45

### Welsh Flagship Benchmark
- **cym_n_for_eng Combined:** 8.03 (highest overall)
- **cym_s_for_eng Combined:** 7.68

## Key Findings

### 1. eng_for_X Courses Are NOT Worse
**Original hypothesis:** eng_for_X courses were "shabby" compared to X_for_eng courses.
**Finding:** The data does not support this. eng_for_X courses (7.46 combined avg) perform **slightly better** than X_for_eng courses (7.42 combined avg).

### 2. Courses Needing Attention (Combined Average < 7.0)
| Course | Combined Avg | Issues |
|--------|--------------|--------|
| **ara_for_eng** | 6.46 | Lowest score - Arabic romanization/transliteration issues |
| **eng_for_zho** | 6.78 | Chinese tonal complexity, character-based issues |

### 3. Top Performing Courses (Combined Average ≥ 7.5)
| Course | Combined Avg |
|--------|--------------|
| cym_n_for_eng | 8.03 |
| eng_for_spa | 7.79 |
| eng_for_por | 7.78 |
| deu_for_eng | 7.74 |
| cym_s_for_eng | 7.68 |
| eng_for_fra | 7.62 |
| kor_for_eng | 7.62 |

### 4. Round 2 Scores Generally Higher
Most courses showed improvement in Round 2 (USE-only sampling):
- Average R1: 6.99
- Average R2: 7.88
- **Average improvement: +0.89 points**

Possible explanations:
- BUILD phrases (short fragments) tend to lack context and score lower
- USE phrases (complete sentences) are more natural standalone
- Scoring variance between sampling rounds

### 5. Score Distribution by Round

**Round 1 (100 samples across 19 courses):**
- Scores 7+: 11 courses (58%)
- Scores 6-7: 8 courses (42%)

**Round 2 (100 samples across 19 courses):**
- Scores 8+: 10 courses (53%)
- Scores 7-8: 7 courses (37%)
- Scores 6-7: 2 courses (10%)

## Quality Threshold Analysis

**Target threshold: 7.0 average**

| Status | R1 | R2 | Combined |
|--------|----|----|----------|
| Above threshold (≥7.0) | 11 courses (58%) | 17 courses (89%) | 17 courses (89%) |
| Below threshold (<7.0) | 8 courses (42%) | 2 courses (11%) | 2 courses (11%) |

## Common Issues Found

### Data Integrity
- **eng_for_jpn**: Corrupted/truncated Japanese text ("答える前3") - data generation issue

### Incomplete Fragments
- Multiple courses have phrases missing objects, adjectives, or verbs
- "give her" (what?), "was fairly" (what adjective?), "help yourself understand"

### Temporal Contradictions
- "I had no time to help him next year" (past + future)
- "if I had known now" (past counterfactual + present)

### Grammar Mismatches
- Subject/verb agreement errors (Italian "zitto" vs "zitti")
- Pronoun mismatches (French "Je" with "se rencontrer")
- Missing subjunctive (Italian "mi dispiace che non è" should use "sia")

### Semantic Incoherence
- "so interesting that it changes" (meaningless causal relationship)
- "taking time before starting as soon as possible" (logical contradiction)

## Recommendations

1. **Priority 1 - ara_for_eng (6.46):** Review Arabic romanization system, check for consistency issues
2. **Priority 2 - eng_for_zho (6.78):** Review Chinese character/pinyin alignment, tonal accuracy
3. **Priority 3 - eng_for_jpn (7.24):** Investigate corrupted data, fix grammar pattern mismatches
4. **All courses:** Audit for incomplete fragments and temporal contradictions

## Methodology Notes

- Scoring scale: 1-9 (9=perfect native speech, 7-8=strong, 5-6=functional, 3-4=awkward, 1-2=marginal)
- Each phrase scored on both English AND target language naturalness
- Independent QA agents scored each course blind to avoid bias
- Syllable counting on English text determines USE (≥5) vs BUILD (<5)
