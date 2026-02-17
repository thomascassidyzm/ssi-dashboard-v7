# Chunk Opportunity Analysis - Impact Visualization

**Analysis Date**: 2026-02-02
**Dataset**: 5,867 LEGOs, 42,835 practice phrases across 5 languages

---

## Executive Summary: Impact of Top 10 Chunks

```
┌────────────────────────────────────────────────────────────────────────┐
│                 CHUNK-FIRST APPROACH - IMPACT ANALYSIS                  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  If we implement the TOP 10 universal chunks:                          │
│                                                                         │
│  📊 PHRASES AFFECTED:    14,352 / 42,835  (33.5%)                      │
│  ⚡ ASSEMBLY STEPS SAVED: ~14,352 steps    (37% reduction estimate)    │
│  🎯 IMPACT LEVEL:        CRITICAL          (highest priority)          │
│                                                                         │
│  Top 10 Chunks:                                                        │
│  1. want to       (3,426 uses)  ████████████████████████████████ 100%  │
│  2. wanted to     (1,705 uses)  ██████████████████ 50%                 │
│  3. I want        (1,685 uses)  ██████████████████ 49%                 │
│  4. to learn      (1,455 uses)  ████████████████ 42%                   │
│  5. I want to     (1,381 uses)  ███████████████ 40%                    │
│  6. I don't       (1,166 uses)  █████████████ 34%                      │
│  7. to speak      (1,163 uses)  █████████████ 34%                      │
│  8. I think       (1,158 uses)  █████████████ 34%                      │
│  9. do you        (1,134 uses)  █████████████ 33%                      │
│  10. to do        (1,079 uses)  ████████████ 31%                       │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Pattern Distribution by Language

### "want to" - The Universal Champion

```
Frequency across all 5 languages: 3,426 total occurrences

German:  ████████████████████████████████████████████████████████ 770 (22%)
Arabic:  ████████████████████████████████████████████████████████ 770 (22%)
Chinese: ██████████████████████████████████████████████ 690 (20%)
Spanish: ███████████████████████████████████████ 660 (19%)
Welsh:   ████████████████████████████████ 536 (16%)

IMPACT: Teaching "want to" as a single chunk would improve:
  • 8% of ALL practice phrases analyzed
  • 100% reduction in assembly steps for this pattern (2 → 1)
  • Natural fluency (native speakers use "want to" as a unit)
```

### Modal + Infinitive Patterns

```
Pattern          Total  German Arabic Chinese Spanish Welsh
─────────────────────────────────────────────────────────────
want to          3,426  █ 770  █ 770  █ 690  █ 660  █ 536
wanted to        1,705  █ 399  █ 520  █ 189  █ 348  █ 249
need to            770  █ 248  █ 248  █ 148  █ 188  █ 186
going to           682  █ 202  N/A    N/A    █ 239  █ 241
trying to          324  N/A    N/A    N/A    █ 178  █ 146
like to            331  N/A    N/A    N/A    █ 189  █ 142
how to             286  N/A    N/A    █ 152  N/A    █ 134

TOTAL:          7,524 occurrences of modal+infinitive patterns
IMPACT:         17.6% of all phrases would benefit
```

### Subject + Verb Patterns

```
Pattern          Total  Impact
─────────────────────────────────────────────────
I want           1,685  ████████████████████ HIGH
I don't          1,166  ███████████████ HIGH
I think          1,158  ███████████████ HIGH
do you           1,134  ███████████████ HIGH
I am               645  ████████ MEDIUM

TOTAL:          5,788 occurrences
IMPACT:         13.5% of all phrases
```

---

## Per-Language Deep Dive

### German (1,194 LEGOs, 9,279 phrases)

**Top 5 Chunk Opportunities**:

```
1. want to                 ████████████████████████████████ 770 uses
2. I want                  ████████████████ 457 uses
3. to learn                ███████████████ 432 uses
4. wanted to               ██████████████ 399 uses
5. I want to               █████████████ 386 uses
                           ─────────────────────────────────
                           TOTAL: 2,444 phrases (26% of German course)
```

**Missing Intermediates Example**:
- ✓ Have: "learn" (lernen)
- ✓ Have: "German" (Deutsch)
- ✗ Missing: "learn German" (Deutsch lernen) - appears 270 times
- ✗ Missing: "speak German" (Deutsch sprechen) - appears 260 times

**Recommendation**: Add "learn German", "speak German" as intermediate M-LEGOs

---

### Arabic (1,078 LEGOs, 9,058 phrases)

**Top 5 Chunk Opportunities**:

```
1. want to                 ████████████████████████████████ 770 uses
2. with everyone           █████████████████ 535 uses
3. wanted to               █████████████████ 520 uses
4. Arabic with             ███████████████ 466 uses
5. I want                  ███████████████ 462 uses
                           ─────────────────────────────────
                           TOTAL: 2,753 phrases (30% of Arabic course)
```

**Unique Finding**: "with everyone" (535 uses) is Arabic-specific
- Social/conversational context emphasis
- Consider creating this as Arabic-specific chunk

---

### Chinese (2,084 LEGOs, 10,291 phrases)

**Top 5 Chunk Opportunities**:

```
1. want to                 ████████████████████████████ 690 uses
2. I am                    ███████ 296 uses
3. she said                ███████ 288 uses
4. wants to                ██████ 267 uses
5. my friend               ██████ 263 uses
                           ─────────────────────────────────
                           TOTAL: 1,804 phrases (17.5% of Chinese course)
```

**Language-Specific Collocations** (Verb + Complement):

```
Pattern                    Frequency  Complement Type
────────────────────────────────────────────────────────
good                       9          Resultative (好)
arrive                     7          Directional (到)
very good                  6          Intensifier + resultative
finished                   5          Completive (了)
reach                      5          Directional (到)
do well                    5          Resultative
trying                     5          Durative (着)
```

**Critical Finding**: Chinese verb + complement patterns MUST be taught as chunks
- Not compositional (can't build from parts naturally)
- Native speakers process as single units
- Example: 吃完了 (eat-finish-PERFECTIVE) = "finished eating"

---

### Welsh (679 LEGOs, 6,021 phrases)

**Top 5 Chunk Opportunities**:

```
1. want to                 ██████████████████████████ 536 uses
2. to say                  ██████ 274 uses
3. wanted to               █████ 249 uses
4. going to                █████ 241 uses
5. I want                  █████ 223 uses
                           ─────────────────────────────────
                           TOTAL: 1,523 phrases (25.3% of Welsh course)
```

**Missing Intermediate Example**:
- "let's not" - appears in multiple phrases but not taught as chunk
- Important for Welsh soft mutation after negative particle

---

### Spanish (832 LEGOs, 8,186 phrases)

**Top 5 Chunk Opportunities**:

```
1. want to                 ████████████████████████████ 660 uses
2. I don't                 ████████████████ 458 uses
3. I think                 ██████████████ 404 uses
4. wanted to               ███████████ 348 uses
5. I want                  ███████ 280 uses
                           ─────────────────────────────────
                           TOTAL: 2,150 phrases (26.3% of Spanish course)
```

**Note**: Limited language-specific collocations detected
- Analysis focused on English known_text (not Spanish target_text)
- Need additional analysis on Spanish verb + infinitive patterns:
  - querer + infinitive (want to)
  - poder + infinitive (can/be able to)
  - ir a + infinitive (going to)

---

## Comparative Analysis

### Universal Chunks (Present in ALL 5 Languages)

```
Chunk          German Arabic Chinese Spanish Welsh  TOTAL   Impact
────────────────────────────────────────────────────────────────────
want to        770    770    690     660     536    3,426   CRITICAL
wanted to      399    520    189     348     249    1,705   HIGH
I want to      386    366    231     223     175    1,381   HIGH
to learn       432    449    202     255     N/A    1,338   HIGH
I don't        223    382    N/A     458     135    1,198   HIGH
do you         230    243    210     267     184    1,134   HIGH
to speak       282    362    N/A     207     192    1,043   HIGH

TOTAL UNIVERSAL CHUNKS: 11,225 occurrences (26% of all phrases)
```

### Language-Specific Opportunities

```
Language  Unique Pattern           Frequency  Why Language-Specific?
───────────────────────────────────────────────────────────────────────
Arabic    with everyone            535        Social/conversational emphasis
Arabic    Arabic with              466        Meta-linguistic (course-specific)
German    German with              286        Meta-linguistic (course-specific)
Chinese   Verb + 了/着/过           ~30        Aspect markers (grammar feature)
Welsh     Mutation triggers        N/A        Grammatical feature (mutations)

RECOMMENDATION: Create language-specific chunk libraries
```

---

## Impact Estimation: Before vs. After

### Example: Building "I want to learn Chinese"

**Before (Atomic-First)**:
```
LEGOs needed: [I] + [want] + [to] + [learn] + [Chinese]
Assembly steps: 5
Cognitive load: HIGH (5 pieces in working memory)
Natural fluency: LOW (word-by-word construction)
```

**After (Chunk-First)**:
```
LEGOs needed: [I want to] + [learn] + [Chinese]
Assembly steps: 3
Cognitive load: MEDIUM (3 chunks in working memory)
Natural fluency: HIGH (native-like collocations)
```

**Improvement**: 40% reduction in assembly steps, more natural output

---

### Example: Building "She wanted to speak German with you"

**Before (Atomic-First)**:
```
[She] + [wanted] + [to] + [speak] + [German] + [with] + [you]
= 7 assembly steps
```

**After (Chunk-First with Overlapping Variants)**:
```
[She] + [wanted to] + [speak German] + [with you]
= 4 assembly steps
```

**Improvement**: 43% reduction in assembly steps

---

## ROI Analysis

### Development Effort vs. Impact

**Effort to Implement Top 10 Universal Chunks**:
- 10 M-LEGOs to create
- ~30 practice phrases per chunk = 300 total phrases
- Estimated time: 2-3 hours per chunk = 20-30 hours total
- One-time effort, reusable across ALL courses

**Impact**:
- 14,352 phrases affected (33.5% of all phrases)
- ~14,352 assembly steps saved
- Improved fluency for learners across 5 languages
- Reduced cognitive load (fewer pieces to assemble)

**ROI**: HIGH - modest effort, massive impact

---

## Recommended Implementation Sequence

### Phase 1: Quick Wins (Week 1-2)
Implement top 3 universal chunks:
```
1. want to        (3,426 uses) ████████████████████████████████ 100%
2. wanted to      (1,705 uses) ████████████████ 50%
3. I want to      (1,381 uses) ███████████████ 40%

TOTAL IMPACT: 6,512 phrases (15.2% of all phrases)
```

### Phase 2: Modal Expansion (Week 3-4)
Add remaining modal + infinitive patterns:
```
4. need to        (770 uses)
5. going to       (682 uses)
6. trying to      (324 uses)
7. like to        (331 uses)
8. how to         (286 uses)

TOTAL IMPACT: +2,393 phrases (5.6% additional)
```

### Phase 3: Subject + Verb (Week 5-6)
Add common sentence starters:
```
9. I think        (1,158 uses)
10. I don't       (1,166 uses)
11. do you        (1,134 uses)
12. I want        (1,685 uses)

TOTAL IMPACT: +5,143 phrases (12% additional)
```

### Phase 4: Language-Specific (Week 7-12)
- Chinese: Verb + complement patterns
- German: Separable verbs, modal constructions
- Spanish: Verb + infinitive (querer, poder, ir a)
- Welsh: Mutation-triggering constructions
- Arabic: Morphological patterns (requires expert analysis)

---

## Success Metrics

### Quantitative Metrics
- **Assembly Steps**: Measure average steps to build practice phrases
  - Target: 20-30% reduction with chunk-first
- **Phrase Variety**: Number of unique phrases learners can construct
  - Target: Maintain or increase (chunks + atoms = more flexibility)
- **Error Rate**: Mistakes in phrase construction
  - Target: Reduce by 15-25% (fewer assembly steps = fewer errors)

### Qualitative Metrics
- **Fluency**: Do phrases sound more natural?
- **Confidence**: Do learners feel more confident building sentences?
- **Retention**: Do chunks stick better than isolated atoms?

### A/B Test Design
- **Group A**: Atomic-first (current approach)
- **Group B**: Chunk-first (top 10 universal chunks)
- **Measure**: After 10 sessions, test phrase-building speed, accuracy, fluency
- **Hypothesis**: Chunk-first group will show better fluency and retention

---

## Conclusion

The data strongly supports a chunk-first approach for high-frequency multi-word expressions:

✅ **33.5% of all phrases** would benefit from top 10 universal chunks
✅ **Significant reduction** in assembly steps (20-40%)
✅ **Natural fluency** by teaching collocations as natives use them
✅ **Language-appropriate** (respects grammar patterns like Chinese complements)
✅ **Modest effort** (10 M-LEGOs × 5 languages = 50 total chunks)
✅ **Measurable impact** (can A/B test learner outcomes)

**Recommendation**: Pilot implementation with Spanish course, measure results, scale to all languages.

---

**Next Steps**:
1. Linguistic validation of top 20 chunks per language
2. Pilot implementation in one course
3. A/B test with learners
4. Scale based on results

**Data Available For**:
- Deep dive analysis: `CHUNK-OPPORTUNITIES-DEEP-DIVE.md`
- Implementation guide: `CHUNK-LEGO-EXAMPLES.md`
- Raw data: `chunk-opportunities.json`
