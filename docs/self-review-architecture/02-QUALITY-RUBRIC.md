# Quality Scoring Rubric for LEGO Extraction

## Overview

This document defines the specific criteria, heuristics, and evaluation methods for scoring LEGO extraction quality. Each dimension is scored on a 0-10 scale using objective, measurable criteria that an AI agent can apply consistently.

**Version**: 1.0
**Created**: 2025-10-11

---

## Table of Contents

1. [Scoring Dimensions](#scoring-dimensions)
2. [Iron Rule Compliance](#iron-rule-compliance)
3. [Naturalness](#naturalness)
4. [Pedagogical Value](#pedagogical-value)
5. [Consistency](#consistency)
6. [Edge Case Handling](#edge-case-handling)
7. [Overall Score Calculation](#overall-score-calculation)
8. [Concern Detection](#concern-detection)
9. [Suggestion Generation](#suggestion-generation)

---

## Scoring Dimensions

All dimensions use a 10-point scale:

```
10 = Perfect      No issues detected
9  = Excellent    Minor, negligible issues
8  = Good         Small issues that don't significantly impact quality
7  = Acceptable   Noticeable issues but still usable
6  = Fair         Multiple issues affecting quality
5  = Poor         Significant problems requiring attention
4  = Very Poor    Major issues throughout
3  = Failing      Fundamentally broken in this dimension
2  = Critical     Severe failures, unusable
1  = Disastrous   Complete failure in this dimension
0  = N/A          Not applicable or could not assess
```

---

## Iron Rule Compliance

**Weight**: 35% (highest priority)

**Definition**: No LEGO may begin or end with a preposition.

### Evaluation Criteria

#### Preposition List

```javascript
const PREPOSITIONS = [
  'to', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'of', 'about',
  'as', 'into', 'like', 'through', 'after', 'over', 'between', 'out',
  'against', 'during', 'without', 'before', 'under', 'around', 'among',
  'above', 'below', 'behind', 'beside', 'beneath', 'beyond', 'near',
  'off', 'onto', 'toward', 'towards', 'upon', 'within', 'across'
];
```

#### Scoring Algorithm

```javascript
function scoreIronRuleCompliance(legos) {
  let totalLegos = legos.length;
  let violations = 0;
  let violationDetails = [];

  for (let lego of legos) {
    let words = lego.text.split(/\s+/);
    let firstWord = words[0].toLowerCase().replace(/[,.!?;:]/g, '');
    let lastWord = words[words.length - 1].toLowerCase().replace(/[,.!?;:]/g, '');

    let firstIsPrep = PREPOSITIONS.includes(firstWord);
    let lastIsPrep = PREPOSITIONS.includes(lastWord);

    if (firstIsPrep || lastIsPrep) {
      violations++;
      violationDetails.push({
        lego_id: lego.provenance,
        lego_text: lego.text,
        violation_type: firstIsPrep ? 'starts_with_preposition' : 'ends_with_preposition',
        word: firstIsPrep ? firstWord : lastWord
      });
    }
  }

  // Calculate score
  if (violations === 0) {
    return { score: 10, violations: [], notes: "Perfect Iron Rule compliance" };
  }

  // Score decreases based on violation percentage
  let violationRate = violations / totalLegos;

  let score;
  if (violationRate <= 0.02) {      // ≤2% violations
    score = 9;
  } else if (violationRate <= 0.05) { // ≤5% violations
    score = 8;
  } else if (violationRate <= 0.10) { // ≤10% violations
    score = 7;
  } else if (violationRate <= 0.20) { // ≤20% violations
    score = 5;
  } else if (violationRate <= 0.30) { // ≤30% violations
    score = 3;
  } else {                            // >30% violations
    score = 1;
  }

  return {
    score,
    violations: violationDetails,
    violation_count: violations,
    violation_rate: `${(violationRate * 100).toFixed(1)}%`,
    notes: `${violations} Iron Rule violation(s) detected`
  };
}
```

#### Example Violations

```json
{
  "score": 5,
  "violations": [
    {
      "lego_id": "S12L3",
      "lego_text": "to speak",
      "violation_type": "starts_with_preposition",
      "word": "to"
    },
    {
      "lego_id": "S19L2",
      "lego_text": "going to",
      "violation_type": "ends_with_preposition",
      "word": "to"
    }
  ],
  "violation_count": 2,
  "violation_rate": "13.3%",
  "notes": "2 Iron Rule violation(s) detected"
}
```

#### Concerns Generated

- **Critical Severity**: Any Iron Rule violation
- **Concern ID**: `c_iron_rule_violation`
- **Auto-fixable**: Sometimes (if extending/contracting boundary is obvious)

---

## Naturalness

**Weight**: 25%

**Definition**: LEGOs should segment at natural linguistic boundaries (phrase breaks, clauses) rather than arbitrary word positions.

### Evaluation Criteria

#### 1. Phrasal Verb Integrity (30% of naturalness score)

Phrasal verbs should never be split:

```javascript
// GOOD: Kept together
"I'm going to practise"  → ✓ "going to" intact

// BAD: Split
"I'm going"    → ✗ "going to" split
"to practise"
```

**Detection**:
```javascript
const PHRASAL_VERBS = [
  'going to', 'want to', 'need to', 'have to', 'able to', 'ought to',
  'trying to', 'used to', 'supposed to', 'going on', 'look up', 'find out',
  'figure out', 'look after', 'get up', 'put on', 'take off', 'turn on'
];

function checkPhrasalVerbIntegrity(legos, sourceText) {
  let words = sourceText.split(/\s+/);
  let splits = 0;

  for (let pv of PHRASAL_VERBS) {
    if (sourceText.toLowerCase().includes(pv)) {
      // Check if this phrasal verb is split across boundaries
      let pvWords = pv.split(/\s+/);
      // ... (implementation details)
    }
  }

  return splits === 0 ? 10 : Math.max(0, 10 - splits * 2);
}
```

#### 2. Grammatical Phrase Boundaries (40% of naturalness score)

LEGOs should end at natural phrase boundaries:

**Natural boundaries:**
- End of a clause: "I want to speak" ✓
- After a complete prepositional phrase: "in Macedonian" ✓
- After a complete verb phrase: "I'm trying to learn" ✓
- End of a noun phrase: "the word" ✓

**Unnatural boundaries:**
- Mid-noun phrase: "I want to" ✗ (should include "speak")
- Mid-verb phrase: "I'm trying" ✗ (should include "to learn")
- Before final noun: "I'm trying to remember" ✗ (should include "a word")

**Detection**:
```javascript
function assessBoundaryNaturalness(lego, nextLego, sourceText) {
  let text = lego.text.toLowerCase();
  let concerns = [];

  // Check for incomplete verb phrases
  if (/\b(want|need|have|going|trying|used|able)\s*$/.test(text)) {
    concerns.push({
      type: 'incomplete_verb_phrase',
      description: `LEGO ends with '${text.match(/\w+\s*$/)[0]}' but likely continues`
    });
  }

  // Check for dangling determiners/adjectives
  if (/\b(a|an|the|this|that|these|those|my|your|his|her)\s*$/.test(text)) {
    concerns.push({
      type: 'dangling_determiner',
      description: 'LEGO ends with determiner but missing noun'
    });
  }

  // Check for mid-phrase splits
  if (/\b(to|of|in|on|at|for|with)\s*$/.test(text) && nextLego) {
    concerns.push({
      type: 'mid_phrase_split',
      description: 'LEGO likely splits a prepositional phrase'
    });
  }

  return concerns.length === 0 ? 10 : Math.max(0, 10 - concerns.length * 3);
}
```

#### 3. Semantic Completeness (30% of naturalness score)

LEGOs should express complete thoughts when possible:

```javascript
// GOOD: Complete thought
"I want to speak Macedonian"  ✓

// LESS NATURAL: Incomplete thought (but sometimes necessary)
"I want to"  ✗
"speak Macedonian"  ✗
```

**Scoring**:
```javascript
function assessSemanticCompleteness(lego) {
  let text = lego.text;
  let words = text.split(/\s+/);

  // Very short LEGOs (2 words) are often semantically incomplete
  if (words.length === 2) {
    // But some 2-word LEGOs are complete: "I know", "You can", "Thank you"
    if (/^(I|you|we|they)\s+(know|can|will|do|did)$/i.test(text)) {
      return 10; // Complete thought
    }
    return 6; // Likely incomplete
  }

  // 3-4 words: usually complete if contains subject + verb
  if (words.length >= 3) {
    if (/\b(I|you|we|they|he|she|it)\s+\w+/.test(text)) {
      return 9; // Likely complete
    }
    return 7; // Possibly complete
  }

  return 8; // Reasonable length, probably fine
}
```

#### Overall Naturalness Score

```javascript
function scoreNaturalness(legos, sourceText) {
  let phrasalVerbScore = checkPhrasalVerbIntegrity(legos, sourceText);
  let boundaryScore = 0;
  let completenessScore = 0;

  for (let i = 0; i < legos.length; i++) {
    let nextLego = i < legos.length - 1 ? legos[i + 1] : null;
    boundaryScore += assessBoundaryNaturalness(legos[i], nextLego, sourceText);
    completenessScore += assessSemanticCompleteness(legos[i]);
  }

  boundaryScore /= legos.length;
  completenessScore /= legos.length;

  let overallScore = (
    phrasalVerbScore * 0.30 +
    boundaryScore * 0.40 +
    completenessScore * 0.30
  );

  return {
    score: Math.round(overallScore * 10) / 10,
    component_scores: {
      phrasal_verb_integrity: phrasalVerbScore,
      boundary_naturalness: boundaryScore,
      semantic_completeness: completenessScore
    }
  };
}
```

#### Concerns Generated

- **Severity Medium**: Phrasal verb split
- **Severity Medium**: Incomplete verb phrase
- **Severity Low**: Dangling determiner
- **Concern IDs**: `c_phrasal_verb_split`, `c_incomplete_phrase`, `c_unnatural_boundary`

---

## Pedagogical Value

**Weight**: 20%

**Definition**: LEGOs should be useful for language learning - high-frequency, practical phrases that learners will actually use.

### Evaluation Criteria

#### 1. Frequency & Utility (40% of pedagogical score)

Common, useful phrases score higher:

```javascript
const HIGH_VALUE_PATTERNS = [
  // Questions
  /^(do|does|can|could|will|would|should|are|is)\s+you/i,
  /^(how|what|where|when|why|who)\s+/i,

  // Common verbs in first person
  /^I\s+(want|need|have|can|would|should|know|think|like)\s+/i,

  // Negations
  /\s+(not|n't|never)\s+/i,

  // Time expressions
  /\s+(now|today|tomorrow|yesterday)\s*$/i,

  // Politeness
  /^(please|thank\s+you|excuse\s+me|I'm\s+sorry)/i
];

function assessFrequencyValue(lego) {
  let text = lego.text;
  let score = 5; // baseline

  for (let pattern of HIGH_VALUE_PATTERNS) {
    if (pattern.test(text)) {
      score += 1;
    }
  }

  return Math.min(10, score);
}
```

#### 2. Appropriate Granularity (35% of pedagogical score)

LEGOs should be neither too small (not useful) nor too large (hard to learn):

```javascript
function assessGranularity(lego) {
  let wordCount = lego.metadata.word_count;

  // Optimal: 3-5 words
  if (wordCount >= 3 && wordCount <= 5) {
    return 10;
  }

  // Acceptable: 2 words or 6 words
  if (wordCount === 2 || wordCount === 6) {
    return 8;
  }

  // Too small: 1 word
  if (wordCount === 1) {
    return 4; // Single words rarely pedagogically valuable as LEGOs
  }

  // Too large: 7+ words
  if (wordCount >= 7) {
    return 6 - Math.min(3, wordCount - 7); // Decreases with length
  }

  return 7;
}
```

#### 3. Reusability (25% of pedagogical score)

LEGOs with flexible, reusable structures score higher:

```javascript
function assessReusability(lego) {
  let text = lego.text.toLowerCase();

  // Highly reusable patterns (templates)
  if (/^(I|you|we|they)\s+(want|need|can)\s+to\s+\w+$/i.test(text)) {
    return 10; // "I want to X" pattern
  }

  if (/^(I'm|you're|we're|they're)\s+(going\s+to|trying\s+to)\s+\w+$/i.test(text)) {
    return 10; // "I'm going to X" pattern
  }

  // Contains pronouns (easily substitutable)
  if (/\b(I|you|we|they|he|she|it)\b/i.test(text)) {
    return 8;
  }

  // Specific, less reusable
  if (/\b(Macedonian|English)\b/i.test(text)) {
    return 6; // Language-specific, less transferable
  }

  return 7; // Neutral
}
```

#### Overall Pedagogical Score

```javascript
function scorePedagogicalValue(legos) {
  let totalScore = 0;

  for (let lego of legos) {
    let frequencyScore = assessFrequencyValue(lego);
    let granularityScore = assessGranularity(lego);
    let reusabilityScore = assessReusability(lego);

    let legoScore = (
      frequencyScore * 0.40 +
      granularityScore * 0.35 +
      reusabilityScore * 0.25
    );

    totalScore += legoScore;
  }

  return {
    score: Math.round((totalScore / legos.length) * 10) / 10,
    avg_word_count: legos.reduce((sum, l) => sum + l.metadata.word_count, 0) / legos.length
  };
}
```

#### Concerns Generated

- **Severity Low**: Single-word LEGOs
- **Severity Medium**: LEGOs > 7 words
- **Concern IDs**: `c_too_small`, `c_too_large`, `c_low_reusability`

---

## Consistency

**Weight**: 10%

**Definition**: Similar linguistic structures should be segmented similarly across the corpus.

### Evaluation Criteria

#### 1. Granularity Consistency (50% of consistency score)

LEGO sizes should follow predictable patterns:

```javascript
function assessGranularityConsistency(legos) {
  let wordCounts = legos.map(l => l.metadata.word_count);
  let mean = wordCounts.reduce((a, b) => a + b) / wordCounts.length;

  // Calculate standard deviation
  let variance = wordCounts.reduce((sum, wc) => sum + Math.pow(wc - mean, 2), 0) / wordCounts.length;
  let stdDev = Math.sqrt(variance);

  // Score based on standard deviation
  // Lower std dev = more consistent
  if (stdDev <= 0.8) {
    return 10; // Very consistent
  } else if (stdDev <= 1.2) {
    return 9;  // Consistent
  } else if (stdDev <= 1.5) {
    return 8;  // Reasonably consistent
  } else if (stdDev <= 2.0) {
    return 6;  // Somewhat inconsistent
  } else {
    return 4;  // Highly inconsistent
  }
}
```

#### 2. Pattern Consistency (50% of consistency score)

Similar grammatical structures should segment similarly:

```javascript
function assessPatternConsistency(legos, allCorpusLegos) {
  let inconsistencies = [];

  // Example: Check "I want to X" pattern
  let wantToLegos = legos.filter(l => /^I\s+want\s+to\s+/i.test(l.text));

  if (wantToLegos.length > 1) {
    // Check if they're segmented consistently
    let structures = wantToLegos.map(l => {
      let words = l.text.split(/\s+/);
      return words.length;
    });

    let allSameLength = structures.every(len => len === structures[0]);
    if (!allSameLength) {
      inconsistencies.push({
        pattern: "I want to X",
        description: "Inconsistent segmentation of 'I want to' pattern",
        examples: wantToLegos.map(l => l.text)
      });
    }
  }

  // Score: 10 if no inconsistencies, -2 per inconsistency
  return Math.max(0, 10 - inconsistencies.length * 2);
}
```

#### Overall Consistency Score

```javascript
function scoreConsistency(legos, allCorpusLegos) {
  let granularityScore = assessGranularityConsistency(legos);
  let patternScore = assessPatternConsistency(legos, allCorpusLegos);

  return {
    score: (granularityScore * 0.5 + patternScore * 0.5),
    granularity_std_dev: calculateStdDev(legos.map(l => l.metadata.word_count)),
    pattern_inconsistencies: [] // detailed list
  };
}
```

#### Concerns Generated

- **Severity Medium**: High standard deviation in LEGO sizes
- **Severity Medium**: Inconsistent segmentation of same patterns
- **Concern IDs**: `c_inconsistent_granularity`, `c_pattern_mismatch`

---

## Edge Case Handling

**Weight**: 10%

**Definition**: LEGOs should correctly handle punctuation, contractions, compound words, and other edge cases.

### Evaluation Criteria

#### 1. Contraction Handling (30% of edge case score)

```javascript
function assessContractionHandling(legos) {
  let issues = [];

  for (let lego of legos) {
    let text = lego.text;

    // Check for split contractions (should never happen)
    if (/\s+'(s|t|re|ve|ll|d|m)\b/i.test(text)) {
      issues.push({
        lego_id: lego.provenance,
        issue: 'split_contraction',
        text: text
      });
    }

    // Check for proper contraction inclusion
    if (/\b(I|you|he|she|it|we|they)\s+(am|is|are|have|has|had|will|would)\b/i.test(text)) {
      // Should probably be contracted in informal speech
      // But this is not necessarily an error, just a note
    }
  }

  return issues.length === 0 ? 10 : Math.max(0, 10 - issues.length * 3);
}
```

#### 2. Punctuation Handling (30% of edge case score)

```javascript
function assessPunctuationHandling(legos) {
  let issues = [];

  for (let lego of legos) {
    let text = lego.text;

    // LEGOs should not start with punctuation (except quotes)
    if (/^[.,;:!?]/.test(text)) {
      issues.push({
        lego_id: lego.provenance,
        issue: 'starts_with_punctuation',
        text: text
      });
    }

    // LEGOs should not have mid-sentence punctuation mishandling
    if (/\s+,\s+\S+\s+\.\s*$/.test(text)) {
      issues.push({
        lego_id: lego.provenance,
        issue: 'complex_punctuation_in_lego',
        text: text
      });
    }
  }

  return issues.length === 0 ? 10 : Math.max(0, 10 - issues.length * 2);
}
```

#### 3. Special Character Handling (20% of edge case score)

```javascript
function assessSpecialCharacters(legos) {
  let issues = [];

  for (let lego of legos) {
    let text = lego.text;

    // Check for proper apostrophe normalization
    if (/['']/g.test(text)) {
      // Should be normalized to standard apostrophe
      issues.push({
        lego_id: lego.provenance,
        issue: 'non_standard_apostrophe',
        text: text
      });
    }

    // Check for unexpected characters
    if (/[^a-zA-Z0-9\s.,!?;:'"'\-]/.test(text)) {
      issues.push({
        lego_id: lego.provenance,
        issue: 'unexpected_characters',
        text: text
      });
    }
  }

  return issues.length === 0 ? 10 : Math.max(0, 10 - issues.length * 2);
}
```

#### 4. Word Boundary Handling (20% of edge case score)

```javascript
function assessWordBoundaries(legos) {
  let issues = [];

  for (let lego of legos) {
    let text = lego.text;

    // Check for extra whitespace
    if (/\s{2,}/.test(text)) {
      issues.push({
        lego_id: lego.provenance,
        issue: 'multiple_spaces',
        text: text
      });
    }

    // Check for leading/trailing whitespace
    if (text !== text.trim()) {
      issues.push({
        lego_id: lego.provenance,
        issue: 'untrimmed_whitespace',
        text: text
      });
    }
  }

  return issues.length === 0 ? 10 : Math.max(0, 10 - issues.length * 2);
}
```

#### Overall Edge Case Score

```javascript
function scoreEdgeCaseHandling(legos) {
  let contractionScore = assessContractionHandling(legos);
  let punctuationScore = assessPunctuationHandling(legos);
  let specialCharScore = assessSpecialCharacters(legos);
  let boundaryScore = assessWordBoundaries(legos);

  return {
    score: (
      contractionScore * 0.30 +
      punctuationScore * 0.30 +
      specialCharScore * 0.20 +
      boundaryScore * 0.20
    ),
    issues_found: [] // detailed list
  };
}
```

#### Concerns Generated

- **Severity High**: Split contractions
- **Severity Medium**: Punctuation issues
- **Severity Low**: Whitespace issues
- **Concern IDs**: `c_contraction_error`, `c_punctuation_error`, `c_whitespace_error`

---

## Overall Score Calculation

### Weighted Average Formula

```javascript
function calculateOverallScore(dimensionScores) {
  const weights = {
    iron_rule_compliance: 0.35,
    naturalness: 0.25,
    pedagogical_value: 0.20,
    consistency: 0.10,
    edge_case_handling: 0.10
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (let dimension in dimensionScores) {
    if (weights[dimension] !== undefined) {
      weightedSum += dimensionScores[dimension] * weights[dimension];
      totalWeight += weights[dimension];
    }
  }

  let overallScore = weightedSum / totalWeight;

  return {
    overall_score: Math.round(overallScore * 10) / 10,
    dimension_scores: dimensionScores,
    weights_used: weights
  };
}
```

### Complete Scoring Function

```javascript
function performSelfReview(legos, sourceText, allCorpusLegos) {
  // Calculate dimension scores
  let ironRuleResult = scoreIronRuleCompliance(legos);
  let naturalnessResult = scoreNaturalness(legos, sourceText);
  let pedagogicalResult = scorePedagogicalValue(legos);
  let consistencyResult = scoreConsistency(legos, allCorpusLegos);
  let edgeCaseResult = scoreEdgeCaseHandling(legos);

  // Assemble dimension scores
  let dimensionScores = {
    iron_rule_compliance: ironRuleResult.score,
    naturalness: naturalnessResult.score,
    pedagogical_value: pedagogicalResult.score,
    consistency: consistencyResult.score,
    edge_case_handling: edgeCaseResult.score
  };

  // Calculate overall score
  let overallResult = calculateOverallScore(dimensionScores);

  // Identify concerns
  let concerns = identifyConcerns(
    ironRuleResult,
    naturalnessResult,
    pedagogicalResult,
    consistencyResult,
    edgeCaseResult
  );

  // Generate suggestions
  let suggestions = generateSuggestions(concerns, dimensionScores);

  // Determine status
  let status = determineStatus(overallResult.overall_score, concerns);

  return {
    quality_score: {
      overall_score: overallResult.overall_score,
      dimension_scores: dimensionScores,
      calculated_at: new Date().toISOString(),
      scoring_version: "1.0"
    },
    concerns: concerns,
    suggestions: suggestions,
    status: status,
    review_notes: generateReviewNotes(overallResult, concerns)
  };
}
```

---

## Concern Detection

### Concern Identification Logic

```javascript
function identifyConcerns(ironRuleResult, naturalnessResult, pedagogicalResult, consistencyResult, edgeCaseResult) {
  let concerns = [];

  // Iron Rule violations (always critical)
  if (ironRuleResult.violations && ironRuleResult.violations.length > 0) {
    for (let violation of ironRuleResult.violations) {
      concerns.push({
        concern_id: 'c_iron_rule_violation',
        severity: 'critical',
        category: 'iron_rule',
        description: `LEGO "${violation.lego_text}" ${violation.violation_type.replace(/_/g, ' ')}`,
        affected_legos: [violation.lego_id],
        suggested_fix: violation.violation_type === 'starts_with_preposition'
          ? `Remove "${violation.word}" from beginning or extend to include what follows`
          : `Remove "${violation.word}" from end or contract to exclude it`,
        auto_fixable: false
      });
    }
  }

  // Naturalness issues
  if (naturalnessResult.component_scores) {
    if (naturalnessResult.component_scores.phrasal_verb_integrity < 8) {
      concerns.push({
        concern_id: 'c_phrasal_verb_split',
        severity: 'medium',
        category: 'naturalness',
        description: 'Phrasal verbs are being split across LEGO boundaries',
        affected_legos: [], // identify specific LEGOs
        suggested_fix: 'Keep phrasal verbs together (e.g., "going to", "want to")',
        auto_fixable: false
      });
    }

    if (naturalnessResult.component_scores.boundary_naturalness < 7) {
      concerns.push({
        concern_id: 'c_unnatural_boundary',
        severity: 'medium',
        category: 'naturalness',
        description: 'LEGOs breaking at unnatural linguistic boundaries',
        affected_legos: [],
        suggested_fix: 'Segment at clause or phrase boundaries, not mid-phrase',
        auto_fixable: false
      });
    }
  }

  // Pedagogical issues
  if (pedagogicalResult.avg_word_count && pedagogicalResult.avg_word_count < 2.5) {
    concerns.push({
      concern_id: 'c_too_small',
      severity: 'low',
      category: 'pedagogical',
      description: 'LEGOs are too small on average (< 2.5 words)',
      affected_legos: [],
      suggested_fix: 'Increase LEGO size to 3-5 words for better pedagogical value',
      auto_fixable: false
    });
  }

  // Consistency issues
  if (consistencyResult.granularity_std_dev && consistencyResult.granularity_std_dev > 1.5) {
    concerns.push({
      concern_id: 'c_inconsistent_granularity',
      severity: 'medium',
      category: 'consistency',
      description: 'LEGO sizes vary widely (high standard deviation)',
      affected_legos: [],
      suggested_fix: 'Apply more consistent chunking strategy (aim for 3-5 words)',
      auto_fixable: false
    });
  }

  // Edge case issues
  if (edgeCaseResult.issues_found && edgeCaseResult.issues_found.length > 0) {
    // Group by issue type
    let issueGroups = {};
    for (let issue of edgeCaseResult.issues_found) {
      if (!issueGroups[issue.issue]) {
        issueGroups[issue.issue] = [];
      }
      issueGroups[issue.issue].push(issue.lego_id);
    }

    for (let issueType in issueGroups) {
      concerns.push({
        concern_id: `c_${issueType}`,
        severity: issueType.includes('contraction') ? 'high' : 'medium',
        category: 'edge_case',
        description: `${issueType.replace(/_/g, ' ')} detected`,
        affected_legos: issueGroups[issueType],
        suggested_fix: getEdgeCaseFix(issueType),
        auto_fixable: issueType.includes('whitespace')
      });
    }
  }

  return concerns;
}

function getEdgeCaseFix(issueType) {
  const fixes = {
    'split_contraction': 'Keep contractions together (e.g., "I\'m", "you\'re")',
    'starts_with_punctuation': 'Remove leading punctuation from LEGOs',
    'multiple_spaces': 'Normalize to single spaces between words',
    'untrimmed_whitespace': 'Trim leading/trailing whitespace',
    'non_standard_apostrophe': 'Normalize apostrophes to standard ASCII'
  };
  return fixes[issueType] || 'Review and fix edge case';
}
```

---

## Suggestion Generation

### Suggestion Logic

```javascript
function generateSuggestions(concerns, dimensionScores) {
  let suggestions = [];

  // Analyze concern patterns
  let concernsByCategory = {};
  for (let concern of concerns) {
    if (!concernsByCategory[concern.category]) {
      concernsByCategory[concern.category] = [];
    }
    concernsByCategory[concern.category].push(concern);
  }

  // Generate suggestions based on low-scoring dimensions
  if (dimensionScores.naturalness < 7) {
    suggestions.push({
      suggestion_id: 's_improve_naturalness',
      type: 'prompt_improvement',
      priority: 'high',
      current_prompt_excerpt: 'Extract pedagogically useful phrases...',
      suggested_change: 'Add explicit rules: "Keep phrasal verbs together", "Segment at clause boundaries", "Complete verb phrases"',
      rationale: 'Naturalness score is low due to unnatural segmentation',
      expected_improvement: '+1.5 points in naturalness'
    });
  }

  if (concernsByCategory['iron_rule'] && concernsByCategory['iron_rule'].length > 0) {
    suggestions.push({
      suggestion_id: 's_enforce_iron_rule',
      type: 'heuristic_adjustment',
      priority: 'critical',
      current_prompt_excerpt: 'No LEGO may begin or end with a preposition',
      suggested_change: 'Add post-processing filter to automatically reject preposition-bounded LEGOs',
      rationale: 'Iron Rule violations detected',
      expected_improvement: '+5 points in iron_rule_compliance'
    });
  }

  if (concernsByCategory['consistency'] && concernsByCategory['consistency'].length > 0) {
    suggestions.push({
      suggestion_id: 's_consistency_heuristic',
      type: 'prompt_improvement',
      priority: 'medium',
      current_prompt_excerpt: 'Extract phrases...',
      suggested_change: 'Add guideline: "Prefer 3-5 word LEGOs", "Apply similar segmentation to similar structures"',
      rationale: 'Inconsistent granularity reduces pedagogical effectiveness',
      expected_improvement: '+2 points in consistency'
    });
  }

  if (dimensionScores.pedagogical_value < 7) {
    suggestions.push({
      suggestion_id: 's_improve_pedagogy',
      type: 'prompt_improvement',
      priority: 'medium',
      current_prompt_excerpt: 'Pedagogically useful phrases...',
      suggested_change: 'Prioritize high-frequency patterns: "I want/need/can", questions, common verbs',
      rationale: 'Pedagogical value score indicates less useful phrase selection',
      expected_improvement: '+1 point in pedagogical_value'
    });
  }

  return suggestions;
}
```

---

## Usage Example

```javascript
// In Phase 3 extraction script

const translation = loadTranslation(uuid);
const legos = extractLEGOs(translation); // existing extraction logic

// NEW: Perform self-review
const reviewResult = performSelfReview(
  legos,
  translation.source,
  allCorpusLegos
);

console.log('Overall Quality Score:', reviewResult.quality_score.overall_score);
console.log('Status:', reviewResult.status);

if (reviewResult.concerns.length > 0) {
  console.log('Concerns identified:');
  for (let concern of reviewResult.concerns) {
    console.log(`  - [${concern.severity}] ${concern.description}`);
  }
}

if (reviewResult.suggestions.length > 0) {
  console.log('Suggestions for improvement:');
  for (let suggestion of reviewResult.suggestions) {
    console.log(`  - [${suggestion.priority}] ${suggestion.suggested_change}`);
  }
}

// Save extended translation with review metadata
await saveExtendedTranslation(translation, reviewResult);
```

---

## Calibration & Tuning

### Adjustment Process

1. **Baseline Run**: Process existing corpus with default weights
2. **Human Review**: Sample 20-30 extractions across score ranges
3. **Compare**: Human scores vs. automated scores
4. **Adjust Weights**: Tune weights to align with human judgment
5. **Re-run**: Validate improvements
6. **Iterate**: Repeat until correlation > 0.85

### Calibration Metrics

```javascript
{
  "calibration_date": "2025-10-11",
  "human_reviewed_samples": 30,
  "correlation_coefficient": 0.87,
  "mean_absolute_error": 0.6,
  "weight_adjustments": {
    "iron_rule_compliance": "unchanged (0.35)",
    "naturalness": "increased from 0.20 to 0.25",
    "pedagogical_value": "decreased from 0.25 to 0.20",
    "consistency": "unchanged (0.10)",
    "edge_case_handling": "unchanged (0.10)"
  }
}
```

---

## Appendix: Complete Rubric Summary

| Dimension | Weight | Key Criteria | Perfect Score Requires |
|-----------|--------|--------------|------------------------|
| **Iron Rule Compliance** | 35% | No preposition boundaries | 0 violations |
| **Naturalness** | 25% | Phrasal verb integrity, boundary quality, semantic completeness | Natural segmentation throughout |
| **Pedagogical Value** | 20% | Frequency, granularity, reusability | High-frequency, 3-5 word, reusable phrases |
| **Consistency** | 10% | Granularity variance, pattern matching | Uniform LEGO sizes, consistent patterns |
| **Edge Case Handling** | 10% | Contractions, punctuation, special chars | All edge cases handled correctly |

**Total**: 100%

**Status Thresholds**:
- **≥ 8.0**: Accepted
- **5.0-7.9**: Flagged
- **< 5.0**: Failed / Retry

---

**Document Status**: Complete
**Next Steps**: Create extended amino acid schema documentation (03-AMINO-ACID-SCHEMA.md)
