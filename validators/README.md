# Course Validation Tools

Comprehensive validation and analysis tools for SSi course quality assurance.

## Overview

These validators analyze different dimensions of course completeness and quality:

1. **LEGO Frequency Analyzer** - Vocabulary coverage and practice distribution
2. **Pattern Coverage Analyzer** - LEGO combination diversity and edge coverage
3. **Completeness Analyzer** - Comprehensive multi-dimensional quality report

## Evolution Principle

**These validators are NOT fixed specifications.** They are v1.0 measurement tools that provide initial quality feedback. The system can:

- Refine existing validators as it learns better metrics
- Create new validators for newly discovered quality dimensions
- Iterate on measurement algorithms
- Evolve the validation toolkit itself

**Validators are sensors in the AI OS** - they feed the SELF-REGULATION and MEMORY layers. Their output becomes system state that agents read and adapt to in the next batch generation.

**Intent**: The measurement tools themselves evolve recursively alongside the course generation intelligence.

---

## 1. LEGO Frequency Analyzer

**File**: `analyze-lego-frequency.cjs`

### Purpose

Analyzes how often each LEGO appears in practice phrases (e-PHRASES and d-PHRASES). Identifies under-practiced and over-practiced LEGOs to ensure balanced vocabulary coverage.

### Usage

```bash
node validators/analyze-lego-frequency.cjs <course_code> [--output report.json]
```

**Example**:
```bash
node validators/analyze-lego-frequency.cjs spa_for_eng_20seeds --output lego_frequency_report.json
```

### Metrics

- **Total practices per LEGO** - Sum of e-PHRASES + d-PHRASES
- **Average practices** - Mean across all LEGOs
- **Under-practiced LEGOs** - LEGOs with < 3 total practices
- **Over-practiced LEGOs** - LEGOs with > 2× average practices
- **Zero-practice LEGOs** - LEGOs with no practice phrases

### Output

JSON report with:
- `summary` - Overall statistics
- `under_practiced` - List of LEGOs needing more practice
- `over_practiced` - List of overused LEGOs
- `zero_practice` - LEGOs with no practice (should only be first LEGO)
- `frequency_distribution` - Full distribution sorted by total practices

### Interpretation

**Good indicators**:
- Zero-practice count = 1 (only first LEGO, which cannot have practices due to GATE constraint)
- Average practices per LEGO: 8-12
- Low number of under-practiced LEGOs

**Warning signs**:
- Multiple zero-practice LEGOs (indicates missing baskets)
- High variance in practice counts (some LEGOs 0-3, others 20+)
- Under-practiced count > 10%

---

## 2. Pattern Coverage Analyzer

**File**: `analyze-pattern-coverage.cjs`

### Purpose

Analyzes which LEGO pairs (edges) appear together in practice phrases. Identifies missing edges and over-used combinations to ensure balanced pattern coverage.

**Key concept**: Due to the ABSOLUTE GATE constraint (LEGO N can only combine with LEGOs 1 to N-1), there are `N×(N-1)/2` possible edges for N LEGOs. This analyzer compares actual vs possible edges.

### Usage

```bash
node validators/analyze-pattern-coverage.cjs <course_code> [--output report.json]
```

**Example**:
```bash
node validators/analyze-pattern-coverage.cjs spa_for_eng_20seeds --output pattern_coverage_report.json
```

### Metrics

- **Pattern Density** - Ratio of actual edges to possible edges (%)
- **Missing Edges** - Valid LEGO pairs that never appear together
- **Over-used Edges** - Pairs appearing > 3 standard deviations above mean
- **Edge Frequency Distribution** - How often each pair appears

### Output

JSON report with:
- `summary` - Statistics including pattern density
- `missing_edges` - LEGO pairs that could combine but don't (limited to top 50)
- `overused_edges` - Pairs appearing excessively
- `edge_distribution` - Top 100 most frequent edges with examples

### Interpretation

**Good indicators**:
- Pattern density > 50%
- Few over-used edges
- Even distribution across edge frequencies

**Warning signs**:
- Pattern density < 30% (indicates many valid combinations are missing)
- Many over-used edges (same patterns repeated excessively)
- High Gini coefficient (uneven distribution)

**Example findings**:
```
Pattern Density: 29.6%
Missing Edges: 1420 out of 2016 possible
Over-used: "hablar" + "español" appears 83 times
```

This indicates need for more diverse LEGO combinations.

---

## 3. Completeness Analyzer

**File**: `analyze-completeness.cjs`

### Purpose

Comprehensive multi-dimensional analysis combining vocabulary frequency, pattern coverage, semantic diversity, and progression quality into a single completeness score.

### Usage

```bash
node validators/analyze-completeness.cjs <course_code> [--output report.json]
```

**Example**:
```bash
node validators/analyze-completeness.cjs spa_for_eng_20seeds --output completeness_report.json
```

### Dimensions Analyzed

#### 1. Vocabulary (35% of overall score)
- **Coverage**: % of LEGOs with practice phrases
- **Balance**: Gini coefficient (inequality measure)
- Combines: 60% coverage + 40% balance

#### 2. Patterns (35% of overall score)
- **Density**: % of possible edges actually used
- **Balance**: Gini coefficient for edge frequency
- Combines: 60% density + 40% balance

#### 3. Distribution (15% of overall score)
- **Semantic Diversity**: Entropy-based measure of LEGO type distribution
- Higher entropy = more diverse types (BASE, COMPOSITE, etc.)

#### 4. Progression (15% of overall score)
- **Complexity Slope**: Linear regression of phrase complexity over time
- Positive slope = increasing complexity (ideal)
- Negative slope = decreasing complexity (warning)

### Output

JSON report with:
- `overall.completeness_score` - Weighted overall score (0-100)
- `vocabulary` - Coverage, balance, Gini, quartiles, zero-practice LEGOs
- `patterns` - Density, balance, edge statistics
- `distribution` - Semantic diversity entropy
- `progression` - Complexity trend analysis
- `recommendations` - Prioritized list of improvements

### Interpretation

**Overall Score Ranges**:
- **90-100%**: Excellent - Production ready
- **70-89%**: Good - Minor improvements recommended
- **50-69%**: Fair - Significant gaps to address
- **< 50%**: Poor - Major revision needed

**Example output**:
```
╔════════════════════════════════════════╗
║  OVERALL COMPLETENESS: 68.0%              ║
╚════════════════════════════════════════╝

📊 Dimension Scores:
   ├─ Vocabulary:    95.2%
   ├─ Patterns:      37.3%  ⚠️ LOW
   ├─ Distribution:  94.2%
   └─ Progression:   49.9%

Recommendations:
   1. [HIGH] Patterns: Low pattern density (29.6%)
      → Increase LEGO combination diversity
```

### Gini Coefficient

The **Gini coefficient** measures inequality in distribution (0 = perfect equality, 1 = perfect inequality).

**Interpretation**:
- **< 0.3**: Very equal distribution (excellent)
- **0.3-0.4**: Moderate inequality (acceptable)
- **0.4-0.5**: High inequality (warning)
- **> 0.5**: Very high inequality (needs attention)

**Example**: Gini 0.51 for edge frequency means some LEGO pairs appear far more often than others, indicating overuse of certain patterns.

---

## Workflow

### 1. Initial Course Validation

After generating a new course, run all three analyzers:

```bash
# Set course code
COURSE="spa_for_eng_20seeds"

# Create reports directory
mkdir -p vfs/courses/$COURSE/reports

# Run all analyzers
node validators/analyze-lego-frequency.cjs $COURSE \
  --output vfs/courses/$COURSE/reports/frequency.json

node validators/analyze-pattern-coverage.cjs $COURSE \
  --output vfs/courses/$COURSE/reports/patterns.json

node validators/analyze-completeness.cjs $COURSE \
  --output vfs/courses/$COURSE/reports/completeness.json
```

### 2. Review Completeness Report

Start with the comprehensive report:

```bash
cat vfs/courses/$COURSE/reports/completeness.json | jq '.overall'
cat vfs/courses/$COURSE/reports/completeness.json | jq '.recommendations'
```

### 3. Deep Dive Based on Issues

If **vocabulary** score is low:
```bash
# Check zero-practice LEGOs
cat vfs/courses/$COURSE/reports/frequency.json | jq '.zero_practice'

# Check under-practiced LEGOs
cat vfs/courses/$COURSE/reports/frequency.json | jq '.under_practiced[]'
```

If **pattern** score is low:
```bash
# Check pattern density
cat vfs/courses/$COURSE/reports/patterns.json | jq '.summary.pattern_density'

# See missing edges
cat vfs/courses/$COURSE/reports/patterns.json | jq '.missing_edges[0:10]'

# See over-used edges
cat vfs/courses/$COURSE/reports/patterns.json | jq '.overused_edges[]'
```

### 4. Iterate on Phase 5 Intelligence

Based on findings, refine Phase 5 basket generation:

- **Low pattern density** → Increase diversity in eternal phrases, use wider LEGO range
- **Over-used edges** → Add constraints to prevent same pairs appearing too often
- **Under-practiced LEGOs** → Ensure all LEGOs appear in sufficient baskets

---

## Technical Details

### ABSOLUTE GATE Constraint

LEGO N can only combine with LEGOs 1 to N-1. This means:

- LEGO 1 (index 0): Cannot have practice phrases (no prior LEGOs)
- LEGO 2 (index 1): Can combine with LEGO 1 only (1 possible edge)
- LEGO 3 (index 2): Can combine with LEGOs 1-2 (2 possible edges)
- LEGO N: Can combine with LEGOs 1 to N-1 (N-1 possible edges)

**Total possible edges** = 1 + 2 + 3 + ... + (N-1) = `N×(N-1)/2`

For 64 LEGOs: `64 × 63 / 2 = 2,016 possible edges`

### LEGO Extraction Strategy

All analyzers use the same LEGO extraction from phrases:

1. Sort LEGOs by target text length (descending)
2. Greedy match: Find longest LEGO target first
3. Remove matched text to avoid double-counting
4. Repeat for remaining text

This handles COMPOSITE LEGOs correctly (matches "lo más a menudo posible" before "a menudo").

### e-PHRASES vs d-PHRASES

- **e-PHRASES**: Eternal phrases for spaced repetition (returned to repeatedly)
- **d-PHRASES**: Debut phrases for first presentation (expanding windows: 2, 3, 4, 5 LEGOs)

Both count toward vocabulary frequency, but d-PHRASES provide more pattern diversity due to windowed structure.

---

## Common Issues and Solutions

### Issue: Zero-practice LEGOs (> 1)

**Symptom**: Multiple LEGOs have zero practice phrases
**Cause**: Missing baskets or Phase 5 generation failure
**Solution**: Re-run Phase 5 for affected LEGOs

### Issue: Low Pattern Density (< 30%)

**Symptom**: Only 20-30% of possible edges are used
**Cause**: Phase 5 not creating diverse enough eternal phrases
**Solution**: Refine Phase 5 to:
- Use wider range of previous LEGOs in eternal phrases
- Avoid clustering (e.g., always using LEGOs N-5 to N-1)
- Ensure balanced vocabulary sampling

### Issue: Over-used Edges

**Symptom**: Some pairs appear 50-80+ times while others appear 1-2 times
**Cause**: Phase 5 defaulting to "easy" combinations
**Solution**: Add edge frequency tracking and constraints in Phase 5

### Issue: Low Progression Score

**Symptom**: Complexity doesn't increase (flat or decreasing slope)
**Cause**: Later LEGOs not combining into longer phrases
**Solution**: Review d-PHRASE window generation

---

## Example: spa_for_eng_20seeds Results

**Test Course**: 20 seeds, 64 LEGOs (after deduplication)

### Frequency Analysis
- Total practices: 617 (189 e-phrases, 428 d-phrases)
- Average: 9.64 per LEGO
- Range: 0-12
- Zero-practice: 1 (S0001L01 "Quiero" - expected as first LEGO)
- Under-practiced: 1 (S0001L02 "hablar" with 2 practices)

### Pattern Coverage
- Possible edges: 2,016
- Actual edges: 596
- Pattern density: **29.6%** ⚠️
- Missing edges: 1,420
- Over-used edges: 8 (e.g., "hablar + español" appears 83 times)

### Completeness
- **Overall: 68.0%**
- Vocabulary: 95.2% ✅
- Patterns: 37.3% ⚠️ (main weakness)
- Distribution: 94.2% ✅
- Progression: 49.9% (stable, not increasing)

**Key Finding**: Vocabulary coverage is excellent, but pattern diversity needs improvement. Phase 5 should generate more diverse LEGO combinations.

---

## Future Enhancements

1. **Semantic clustering** - Identify if practice phrases cluster around certain topics/domains
2. **Grammatical pattern coverage** - Ensure all grammatical structures are practiced
3. **Difficulty scoring** - Analyze if difficulty progression matches pedagogical theory
4. **Learner simulation** - Model learner exposure and predict retention
5. **Cross-course comparison** - Compare metrics across different courses

---

## Version

**Validators Version**: 1.0.0 (2025-10-28)
**Compatible with**: SSi Dashboard v7.8.1

---

**See Also**:
- `docs/phase_intelligence/phase_5_lego_baskets.md` - Basket generation methodology
- `docs/LOCKED_INTELLIGENCE_v7.8.1.md` - Overall system architecture
