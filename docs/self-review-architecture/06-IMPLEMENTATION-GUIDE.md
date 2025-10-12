# Implementation Guide for Self-Review Architecture

## Overview

This guide provides step-by-step instructions for implementing the self-review and quality scoring system into the existing APML Phase 3 LEGO extraction process.

**Version**: 1.0
**Created**: 2025-10-11
**Target Audience**: Developers implementing this system

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Implementation Phases](#implementation-phases)
3. [Step-by-Step Instructions](#step-by-step-instructions)
4. [Code Examples](#code-examples)
5. [Testing Strategy](#testing-strategy)
6. [Deployment Plan](#deployment-plan)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### Required Knowledge

- JavaScript/Node.js (existing Phase 3 script is in Node.js)
- JSON file I/O operations
- Understanding of existing APML pipeline (Phases 1-3)
- Familiarity with AI/LLM prompting

### Required Files/Systems

- Access to `/vfs/courses/{course_code}/` directory structure
- Existing Phase 3 extraction script: `process-phase-3.cjs`
- Translation amino acid files in `amino_acids/translations/`
- LEGO amino acid files in `amino_acids/legos/`

### Dependencies

```json
{
  "fs-extra": "^11.0.0",
  "crypto": "built-in",
  "lodash": "^4.17.21"  // optional, for statistical calculations
}
```

---

## Implementation Phases

### Phase 1: Core Scoring System (Week 1)

**Goal**: Implement dimension scoring functions and quality score calculation.

**Deliverables**:
- `lib/quality-scoring.js` - All scoring functions
- `lib/concern-detector.js` - Concern identification logic
- `lib/suggestion-generator.js` - Suggestion generation logic
- Unit tests for all scoring functions

**Estimated Effort**: 20-24 hours

---

### Phase 2: Self-Review Integration (Week 2)

**Goal**: Integrate self-review into Phase 3 extraction process.

**Deliverables**:
- Modified `process-phase-3.cjs` with self-review calls
- Extended translation amino acid saving logic
- Quality report generation
- Integration tests

**Estimated Effort**: 16-20 hours

---

### Phase 3: Retry & Decision Engine (Week 3)

**Goal**: Implement retry logic and human review queue.

**Deliverables**:
- `lib/retry-manager.js` - Retry queue and prompt improvement
- `lib/decision-engine.js` - Status determination logic
- Quality report files (flagged, failed, retry queue, human review)
- End-to-end workflow tests

**Estimated Effort**: 16-20 hours

---

### Phase 4: UI Integration & Polish (Week 4)

**Goal**: Add quality visualization to SeedVisualizer and dashboard.

**Deliverables**:
- Quality badges in SeedVisualizer component
- Dashboard quality summary panel
- Human review interface (basic)
- Documentation and user guides

**Estimated Effort**: 16-20 hours

---

## Step-by-Step Instructions

### Step 1: Create Core Scoring Library

Create `/lib/quality-scoring.js`:

```javascript
// lib/quality-scoring.js

const PREPOSITIONS = new Set([
  'to', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'of', 'about',
  'as', 'into', 'like', 'through', 'after', 'over', 'between', 'out',
  'against', 'during', 'without', 'before', 'under', 'around', 'among',
  'above', 'below', 'behind', 'beside', 'beneath', 'beyond', 'near',
  'off', 'onto', 'toward', 'towards', 'upon', 'within', 'across'
]);

/**
 * Score Iron Rule compliance
 * @param {Array} legos - Array of LEGO objects
 * @returns {Object} - { score, violations, notes }
 */
function scoreIronRuleCompliance(legos) {
  let violations = [];

  for (let lego of legos) {
    let words = lego.text.split(/\s+/).map(w => w.toLowerCase().replace(/[,.!?;:]/g, ''));
    let firstWord = words[0];
    let lastWord = words[words.length - 1];

    if (PREPOSITIONS.has(firstWord)) {
      violations.push({
        lego_id: lego.provenance,
        lego_text: lego.text,
        violation_type: 'starts_with_preposition',
        word: firstWord
      });
    }

    if (PREPOSITIONS.has(lastWord)) {
      violations.push({
        lego_id: lego.provenance,
        lego_text: lego.text,
        violation_type: 'ends_with_preposition',
        word: lastWord
      });
    }
  }

  // Calculate score based on violation rate
  let violationRate = violations.length / legos.length;
  let score;

  if (violations.length === 0) {
    score = 10;
  } else if (violationRate <= 0.02) {
    score = 9;
  } else if (violationRate <= 0.05) {
    score = 8;
  } else if (violationRate <= 0.10) {
    score = 7;
  } else if (violationRate <= 0.20) {
    score = 5;
  } else if (violationRate <= 0.30) {
    score = 3;
  } else {
    score = 1;
  }

  return {
    score,
    violations,
    violation_count: violations.length,
    violation_rate: `${(violationRate * 100).toFixed(1)}%`,
    notes: violations.length === 0
      ? 'Perfect Iron Rule compliance'
      : `${violations.length} Iron Rule violation(s) detected`
  };
}

/**
 * Score naturalness
 * @param {Array} legos - Array of LEGO objects
 * @param {String} sourceText - Original source sentence
 * @returns {Object} - { score, component_scores }
 */
function scoreNaturalness(legos, sourceText) {
  // Check phrasal verb integrity
  const PHRASAL_VERBS = [
    'going to', 'want to', 'need to', 'have to', 'able to', 'ought to',
    'trying to', 'used to', 'supposed to'
  ];

  let phrasalVerbSplits = 0;
  for (let pv of PHRASAL_VERBS) {
    if (sourceText.toLowerCase().includes(pv)) {
      // Check if any LEGO contains the complete phrasal verb
      let found = legos.some(l => l.text.toLowerCase().includes(pv));
      if (!found) {
        phrasalVerbSplits++;
      }
    }
  }

  let phrasalVerbScore = phrasalVerbSplits === 0 ? 10 : Math.max(0, 10 - phrasalVerbSplits * 3);

  // Check boundary naturalness (simplified)
  let unnaturalBoundaries = 0;
  for (let lego of legos) {
    let text = lego.text.toLowerCase().trim();

    // Ends with incomplete verb phrase indicators
    if (/\b(want|need|have|going|trying|able)\s*$/.test(text)) {
      unnaturalBoundaries++;
    }

    // Ends with dangling determiner
    if (/\b(a|an|the|this|that|my|your)\s*$/.test(text)) {
      unnaturalBoundaries++;
    }
  }

  let boundaryScore = Math.max(0, 10 - unnaturalBoundaries * 2);

  // Check semantic completeness (simplified)
  let incompleteCount = 0;
  for (let lego of legos) {
    let wordCount = lego.metadata.word_count;

    // Very short LEGOs often incomplete
    if (wordCount <= 2) {
      // Check if it's a complete thought
      if (!/^(I|you|we|they)\s+(know|can|will|do|did)$/i.test(lego.text)) {
        incompleteCount++;
      }
    }
  }

  let completenessScore = Math.max(0, 10 - incompleteCount * 1.5);

  // Weighted average
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

/**
 * Score pedagogical value
 * @param {Array} legos - Array of LEGO objects
 * @returns {Object} - { score, avg_word_count }
 */
function scorePedagogicalValue(legos) {
  let totalUtility = 0;
  let totalGranularity = 0;
  let totalReusability = 0;

  for (let lego of legos) {
    let text = lego.text.toLowerCase();
    let wordCount = lego.metadata.word_count;

    // Utility score
    let utilityScore = 5; // baseline

    // High-value patterns
    if (/^(do|can|will|would|should)\s+you/i.test(text)) utilityScore += 2;
    if (/^(how|what|where|when|why)\s+/i.test(text)) utilityScore += 2;
    if (/^I\s+(want|need|can|would|know|think)/i.test(text)) utilityScore += 2;
    if (/\s+(not|n't|never)\s+/i.test(text)) utilityScore += 1;

    utilityScore = Math.min(10, utilityScore);
    totalUtility += utilityScore;

    // Granularity score
    let granularityScore;
    if (wordCount >= 3 && wordCount <= 5) {
      granularityScore = 10;
    } else if (wordCount === 2 || wordCount === 6) {
      granularityScore = 8;
    } else if (wordCount === 1) {
      granularityScore = 4;
    } else {
      granularityScore = Math.max(3, 6 - (wordCount - 7));
    }
    totalGranularity += granularityScore;

    // Reusability score
    let reusabilityScore = 7; // baseline
    if (/^(I|you|we|they)\s+(want|need|can)\s+to\s+\w+$/i.test(text)) {
      reusabilityScore = 10; // template pattern
    } else if (/\b(I|you|we|they|he|she|it)\b/i.test(text)) {
      reusabilityScore = 8; // contains pronouns
    }
    totalReusability += reusabilityScore;
  }

  let avgUtility = totalUtility / legos.length;
  let avgGranularity = totalGranularity / legos.length;
  let avgReusability = totalReusability / legos.length;

  let overallScore = (
    avgUtility * 0.40 +
    avgGranularity * 0.35 +
    avgReusability * 0.25
  );

  return {
    score: Math.round(overallScore * 10) / 10,
    avg_word_count: legos.reduce((sum, l) => sum + l.metadata.word_count, 0) / legos.length
  };
}

/**
 * Score consistency
 * @param {Array} legos - Array of LEGO objects
 * @returns {Object} - { score, granularity_std_dev }
 */
function scoreConsistency(legos) {
  // Calculate standard deviation of word counts
  let wordCounts = legos.map(l => l.metadata.word_count);
  let mean = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
  let variance = wordCounts.reduce((sum, wc) => sum + Math.pow(wc - mean, 2), 0) / wordCounts.length;
  let stdDev = Math.sqrt(variance);

  // Score based on standard deviation
  let granularityScore;
  if (stdDev <= 0.8) {
    granularityScore = 10;
  } else if (stdDev <= 1.2) {
    granularityScore = 9;
  } else if (stdDev <= 1.5) {
    granularityScore = 8;
  } else if (stdDev <= 2.0) {
    granularityScore = 6;
  } else {
    granularityScore = 4;
  }

  // Pattern consistency (simplified - just use granularity for now)
  let patternScore = granularityScore;

  let overallScore = (granularityScore * 0.5 + patternScore * 0.5);

  return {
    score: Math.round(overallScore * 10) / 10,
    granularity_std_dev: Math.round(stdDev * 100) / 100
  };
}

/**
 * Score edge case handling
 * @param {Array} legos - Array of LEGO objects
 * @returns {Object} - { score, issues_found }
 */
function scoreEdgeCaseHandling(legos) {
  let issues = [];

  for (let lego of legos) {
    let text = lego.text;

    // Check for split contractions
    if (/\s+'(s|t|re|ve|ll|d|m)\b/i.test(text)) {
      issues.push({
        lego_id: lego.provenance,
        issue: 'split_contraction',
        text: text
      });
    }

    // Check for leading punctuation
    if (/^[.,;:!?]/.test(text)) {
      issues.push({
        lego_id: lego.provenance,
        issue: 'starts_with_punctuation',
        text: text
      });
    }

    // Check for multiple spaces
    if (/\s{2,}/.test(text)) {
      issues.push({
        lego_id: lego.provenance,
        issue: 'multiple_spaces',
        text: text
      });
    }

    // Check for untrimmed whitespace
    if (text !== text.trim()) {
      issues.push({
        lego_id: lego.provenance,
        issue: 'untrimmed_whitespace',
        text: text
      });
    }
  }

  let score = Math.max(0, 10 - issues.length * 2);

  return {
    score,
    issues_found: issues
  };
}

/**
 * Calculate overall quality score
 * @param {Object} dimensionScores - Scores for each dimension
 * @returns {Object} - { overall_score, dimension_scores, weights_used }
 */
function calculateOverallScore(dimensionScores) {
  const weights = {
    iron_rule_compliance: 0.35,
    naturalness: 0.25,
    pedagogical_value: 0.20,
    consistency: 0.10,
    edge_case_handling: 0.10
  };

  let weightedSum = 0;
  for (let dimension in dimensionScores) {
    if (weights[dimension]) {
      weightedSum += dimensionScores[dimension] * weights[dimension];
    }
  }

  return {
    overall_score: Math.round(weightedSum * 10) / 10,
    dimension_scores: dimensionScores,
    weights_used: weights
  };
}

module.exports = {
  scoreIronRuleCompliance,
  scoreNaturalness,
  scorePedagogicalValue,
  scoreConsistency,
  scoreEdgeCaseHandling,
  calculateOverallScore
};
```

---

### Step 2: Create Concern Detector

Create `/lib/concern-detector.js`:

```javascript
// lib/concern-detector.js

/**
 * Identify concerns based on scoring results
 * @param {Object} scoringResults - Results from all dimension scoring functions
 * @returns {Array} - Array of concern objects
 */
function identifyConcerns(scoringResults) {
  let concerns = [];

  // Iron Rule violations
  if (scoringResults.ironRule.violations && scoringResults.ironRule.violations.length > 0) {
    for (let violation of scoringResults.ironRule.violations) {
      concerns.push({
        concern_id: 'c_iron_rule_violation',
        severity: 'critical',
        category: 'iron_rule',
        description: `LEGO "${violation.lego_text}" (${violation.lego_id}) ${violation.violation_type.replace(/_/g, ' ')}: "${violation.word}"`,
        affected_legos: [violation.lego_id],
        suggested_fix: violation.violation_type === 'starts_with_preposition'
          ? `Extend LEGO to include what follows "${violation.word}" or remove "${violation.word}" from beginning`
          : `Contract LEGO to exclude "${violation.word}" from end or extend to include what follows`,
        auto_fixable: false
      });
    }
  }

  // Naturalness concerns
  if (scoringResults.naturalness.component_scores) {
    if (scoringResults.naturalness.component_scores.phrasal_verb_integrity < 8) {
      concerns.push({
        concern_id: 'c_phrasal_verb_split',
        severity: 'high',
        category: 'naturalness',
        description: 'One or more phrasal verbs (going to, want to, etc.) split across LEGO boundaries',
        affected_legos: [],
        suggested_fix: 'Keep phrasal verbs together as single units (e.g., "going to", "want to")',
        auto_fixable: false
      });
    }

    if (scoringResults.naturalness.component_scores.boundary_naturalness < 7) {
      concerns.push({
        concern_id: 'c_unnatural_boundary',
        severity: 'medium',
        category: 'naturalness',
        description: 'LEGOs breaking at unnatural linguistic boundaries (mid-phrase, incomplete verb phrases)',
        affected_legos: [],
        suggested_fix: 'Segment at clause or phrase boundaries, not mid-phrase. Complete verb phrases.',
        auto_fixable: false
      });
    }
  }

  // Pedagogical concerns
  if (scoringResults.pedagogical.avg_word_count < 2.5) {
    concerns.push({
      concern_id: 'c_too_small',
      severity: 'medium',
      category: 'pedagogical',
      description: `LEGOs too small on average (${scoringResults.pedagogical.avg_word_count.toFixed(1)} words). Optimal is 3-5 words.`,
      affected_legos: [],
      suggested_fix: 'Increase LEGO size to 3-5 words for better pedagogical value',
      auto_fixable: false
    });
  }

  if (scoringResults.pedagogical.avg_word_count > 6) {
    concerns.push({
      concern_id: 'c_too_large',
      severity: 'medium',
      category: 'pedagogical',
      description: `LEGOs too large on average (${scoringResults.pedagogical.avg_word_count.toFixed(1)} words). Optimal is 3-5 words.`,
      affected_legos: [],
      suggested_fix: 'Break down into smaller, more manageable phrases (3-5 words)',
      auto_fixable: false
    });
  }

  // Consistency concerns
  if (scoringResults.consistency.granularity_std_dev > 1.5) {
    concerns.push({
      concern_id: 'c_inconsistent_granularity',
      severity: 'medium',
      category: 'consistency',
      description: `LEGO sizes vary widely (StdDev: ${scoringResults.consistency.granularity_std_dev}). Prefer consistent sizes.`,
      affected_legos: [],
      suggested_fix: 'Apply more consistent chunking strategy. Aim for 3-5 words per LEGO.',
      auto_fixable: false
    });
  }

  // Edge case concerns
  if (scoringResults.edgeCase.issues_found && scoringResults.edgeCase.issues_found.length > 0) {
    let issuesByType = {};
    for (let issue of scoringResults.edgeCase.issues_found) {
      if (!issuesByType[issue.issue]) {
        issuesByType[issue.issue] = [];
      }
      issuesByType[issue.issue].push(issue.lego_id);
    }

    for (let issueType in issuesByType) {
      concerns.push({
        concern_id: `c_${issueType}`,
        severity: issueType.includes('contraction') ? 'high' : 'medium',
        category: 'edge_case',
        description: `${issueType.replace(/_/g, ' ')} detected in ${issuesByType[issueType].length} LEGO(s)`,
        affected_legos: issuesByType[issueType],
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
    'untrimmed_whitespace': 'Trim leading/trailing whitespace from all LEGOs',
    'non_standard_apostrophe': 'Normalize apostrophes to standard ASCII character'
  };
  return fixes[issueType] || 'Review and fix edge case';
}

module.exports = {
  identifyConcerns
};
```

---

### Step 3: Create Suggestion Generator

Create `/lib/suggestion-generator.js`:

```javascript
// lib/suggestion-generator.js

/**
 * Generate improvement suggestions based on concerns and scores
 * @param {Array} concerns - Array of concern objects
 * @param {Object} dimensionScores - Dimension score object
 * @returns {Array} - Array of suggestion objects
 */
function generateSuggestions(concerns, dimensionScores) {
  let suggestions = [];

  // Categorize concerns
  let concernsByCategory = {};
  for (let concern of concerns) {
    if (!concernsByCategory[concern.category]) {
      concernsByCategory[concern.category] = [];
    }
    concernsByCategory[concern.category].push(concern);
  }

  // Iron Rule suggestions
  if (concernsByCategory['iron_rule'] && concernsByCategory['iron_rule'].length > 0) {
    suggestions.push({
      suggestion_id: 's_enforce_iron_rule',
      type: 'heuristic_adjustment',
      priority: 'critical',
      current_prompt_excerpt: 'No LEGO may begin or end with a preposition',
      suggested_change: 'Add post-processing filter that automatically rejects LEGOs starting/ending with prepositions: ' +
                        Array.from(new Set(concernsByCategory['iron_rule'].map(c => c.affected_legos).flat())).join(', '),
      rationale: `${concernsByCategory['iron_rule'].length} Iron Rule violation(s) detected`,
      expected_improvement: `+${Math.min(9, concernsByCategory['iron_rule'].length * 3)} points in iron_rule_compliance`
    });
  }

  // Naturalness suggestions
  if (dimensionScores.naturalness < 7) {
    suggestions.push({
      suggestion_id: 's_improve_naturalness',
      type: 'prompt_improvement',
      priority: 'high',
      current_prompt_excerpt: 'Extract pedagogically useful phrases...',
      suggested_change: 'Add explicit rules:\n' +
        '1. Keep phrasal verbs together (going to, want to, able to, etc.)\n' +
        '2. Segment at clause boundaries\n' +
        '3. Complete verb phrases before ending LEGO',
      rationale: `Naturalness score is ${dimensionScores.naturalness.toFixed(1)}/10, indicating unnatural segmentation`,
      expected_improvement: '+2-3 points in naturalness'
    });
  }

  // Pedagogical suggestions
  if (dimensionScores.pedagogical_value < 7) {
    suggestions.push({
      suggestion_id: 's_improve_pedagogy',
      type: 'prompt_improvement',
      priority: 'medium',
      current_prompt_excerpt: 'Pedagogically useful phrases...',
      suggested_change: 'Prioritize:\n' +
        '1. High-frequency patterns (I want/need/can, questions)\n' +
        '2. 3-5 word LEGOs\n' +
        '3. Reusable templates',
      rationale: `Pedagogical value ${dimensionScores.pedagogical_value.toFixed(1)}/10 suggests less useful phrase selection`,
      expected_improvement: '+1-2 points in pedagogical_value'
    });
  }

  // Consistency suggestions
  if (concernsByCategory['consistency'] && concernsByCategory['consistency'].length > 0) {
    suggestions.push({
      suggestion_id: 's_consistency_heuristic',
      type: 'prompt_improvement',
      priority: 'medium',
      current_prompt_excerpt: 'Extract phrases...',
      suggested_change: 'Add guideline: "Target 3-5 words per LEGO. Apply similar segmentation to similar grammatical structures."',
      rationale: 'Inconsistent granularity reduces pedagogical effectiveness',
      expected_improvement: '+1-2 points in consistency'
    });
  }

  return suggestions;
}

module.exports = {
  generateSuggestions
};
```

---

### Step 4: Integrate into Phase 3

Modify `process-phase-3.cjs`:

```javascript
// At the top of process-phase-3.cjs
const qualityScoring = require('./lib/quality-scoring');
const concernDetector = require('./lib/concern-detector');
const suggestionGenerator = require('./lib/suggestion-generator');

// ... existing code ...

/**
 * NEW FUNCTION: Perform self-review on extracted LEGOs
 */
async function performSelfReview(translation, legos, attemptNumber = 1) {
  const timestamp = new Date().toISOString();

  // Calculate dimension scores
  const ironRuleResult = qualityScoring.scoreIronRuleCompliance(legos);
  const naturalnessResult = qualityScoring.scoreNaturalness(legos, translation.source);
  const pedagogicalResult = qualityScoring.scorePedagogicalValue(legos);
  const consistencyResult = qualityScoring.scoreConsistency(legos);
  const edgeCaseResult = qualityScoring.scoreEdgeCaseHandling(legos);

  const dimensionScores = {
    iron_rule_compliance: ironRuleResult.score,
    naturalness: naturalnessResult.score,
    pedagogical_value: pedagogicalResult.score,
    consistency: consistencyResult.score,
    edge_case_handling: edgeCaseResult.score
  };

  // Calculate overall score
  const overallResult = qualityScoring.calculateOverallScore(dimensionScores);

  // Identify concerns
  const scoringResults = {
    ironRule: ironRuleResult,
    naturalness: naturalnessResult,
    pedagogical: pedagogicalResult,
    consistency: consistencyResult,
    edgeCase: edgeCaseResult
  };
  const concerns = concernDetector.identifyConcerns(scoringResults);

  // Generate suggestions
  const suggestions = suggestionGenerator.generateSuggestions(concerns, dimensionScores);

  // Determine status
  let status;
  if (overallResult.overall_score >= 8.0) {
    status = 'accepted';
  } else if (overallResult.overall_score >= 5.0) {
    status = 'flagged';
  } else {
    status = attemptNumber < 3 ? 'failed' : 'retry_scheduled';
  }

  // Generate review notes
  const reviewNotes = generateReviewNotes(overallResult.overall_score, concerns, status);

  return {
    attempt_number: attemptNumber,
    timestamp: timestamp,
    agent_version: 'phase3_v2.1',
    prompt_version: '3.0.1',
    legos_extracted: legos.length,
    quality_score: {
      overall_score: overallResult.overall_score,
      dimension_scores: dimensionScores,
      calculated_at: timestamp,
      scoring_version: '1.0'
    },
    concerns: concerns,
    suggestions: suggestions,
    status: status,
    review_notes: reviewNotes
  };
}

function generateReviewNotes(score, concerns, status) {
  if (score >= 9.0) {
    return 'Excellent extraction with no significant issues. All quality criteria met.';
  } else if (score >= 8.0) {
    return 'Good extraction meeting quality standards. Minor issues identified but acceptable.';
  } else if (score >= 6.0) {
    let mainConcerns = concerns.slice(0, 2).map(c => c.description).join('; ');
    return `Acceptable extraction but with concerns: ${mainConcerns}. Flagged for review.`;
  } else {
    let criticalCount = concerns.filter(c => c.severity === 'critical').length;
    return `Extraction failed quality standards (score ${score.toFixed(1)}/10). ` +
           `${criticalCount} critical issue(s). Retry recommended with prompt improvements.`;
  }
}

// ... existing extraction logic ...

// MODIFY the main processing loop:
async function processTranslation(translation) {
  // Existing extraction logic here
  const legos = await extractLEGOs(translation);

  // NEW: Perform self-review
  const reviewResult = await performSelfReview(translation, legos);

  // NEW: Extend translation amino acid with review metadata
  translation.lego_extraction_attempts = translation.lego_extraction_attempts || [];
  translation.lego_extraction_attempts.push(reviewResult);
  translation.total_attempts = translation.lego_extraction_attempts.length;
  translation.current_quality_score = reviewResult.quality_score.overall_score;
  translation.quality_status = reviewResult.status;
  translation.last_reviewed_at = reviewResult.timestamp;
  translation.flagged_for_review = reviewResult.status === 'flagged' || reviewResult.status === 'failed';
  translation.human_review_requested = reviewResult.status === 'failed' && translation.total_attempts >= 3;

  // Save extended translation
  await saveTranslation(translation);

  // Save LEGOs (unchanged)
  await saveLEGOs(legos);

  return reviewResult;
}
```

---

### Step 5: Generate Quality Reports

Add to end of `process-phase-3.cjs`:

```javascript
/**
 * Generate aggregate quality reports
 */
async function generateQualityReports(allReviewResults) {
  const acceptedCount = allReviewResults.filter(r => r.status === 'accepted').length;
  const flaggedCount = allReviewResults.filter(r => r.status === 'flagged').length;
  const failedCount = allReviewResults.filter(r => r.status === 'failed').length;

  const avgScore = allReviewResults.reduce((sum, r) => sum + r.quality_score.overall_score, 0) / allReviewResults.length;

  const qualityReport = {
    version: '7.0',
    phase: '3',
    generated_at: new Date().toISOString(),
    course_code: COURSE_CODE,
    quality_summary: {
      total_seeds: allReviewResults.length,
      accepted: acceptedCount,
      flagged: flaggedCount,
      failed: failedCount,
      acceptance_rate: `${((acceptedCount / allReviewResults.length) * 100).toFixed(1)}%`,
      average_quality_score: avgScore.toFixed(1)
    }
    // ... more details ...
  };

  await fs.writeJson(
    path.join(OUTPUT_DIR, 'phase_3_quality_report.json'),
    qualityReport,
    { spaces: 2 }
  );

  console.log('\nQuality Summary:');
  console.log(`  Accepted: ${acceptedCount}/${allReviewResults.length}`);
  console.log(`  Flagged: ${flaggedCount}/${allReviewResults.length}`);
  console.log(`  Failed: ${failedCount}/${allReviewResults.length}`);
  console.log(`  Avg Score: ${avgScore.toFixed(1)}/10`);
}
```

---

## Testing Strategy

### Unit Tests

```javascript
// test/quality-scoring.test.js
const { scoreIronRuleCompliance } = require('../lib/quality-scoring');

describe('scoreIronRuleCompliance', () => {
  it('should return 10 for LEGOs with no violations', () => {
    const legos = [
      { text: 'I want', provenance: 'S1L1' },
      { text: 'I want to speak', provenance: 'S1L2' }
    ];

    const result = scoreIronRuleCompliance(legos);
    expect(result.score).toBe(10);
    expect(result.violations).toHaveLength(0);
  });

  it('should detect violations for LEGOs starting with prepositions', () => {
    const legos = [
      { text: 'to speak', provenance: 'S1L1' }
    ];

    const result = scoreIronRuleCompliance(legos);
    expect(result.score).toBeLessThan(10);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].violation_type).toBe('starts_with_preposition');
  });
});
```

### Integration Tests

Test on sample SEEDs with known good/bad extractions.

### End-to-End Tests

Run full Phase 3 on test corpus, verify quality reports generated correctly.

---

## Deployment Plan

### Development Environment

1. Test on small sample corpus (10-20 SEEDs)
2. Validate scoring accuracy against human assessments
3. Tune weights if needed

### Staging Environment

1. Run on full course (50-100 SEEDs)
2. Review quality reports
3. Identify any edge cases
4. Adjust thresholds/weights

### Production Deployment

1. Deploy to production
2. Monitor first run closely
3. Review flagged/failed SEEDs
4. Iterate on prompt improvements

---

## Monitoring & Maintenance

### Daily Checks

- Review human review queue
- Check for new error patterns
- Monitor acceptance rate trends

### Weekly Reviews

- Analyze quality score distributions
- Identify common concerns
- Evaluate suggestion effectiveness
- Tune scoring weights if needed

### Monthly Reports

- Overall quality trends
- Prompt version changelog
- Success rate of retries
- Human intervention rate

---

## Troubleshooting

### Low Acceptance Rate (< 70%)

**Cause**: Scoring too strict or extraction quality genuinely poor
**Fix**: Review sample extractions, adjust thresholds or improve extraction prompt

### High False Positive Rate (> 15%)

**Cause**: Scoring too lenient
**Fix**: Tighten thresholds, add more granular concern detection

### Retries Not Improving

**Cause**: Suggestions not actionable
**Fix**: Improve suggestion generation logic, make more specific

---

**Document Status**: Complete
**Implementation Ready**: Yes
**Estimated Total Effort**: 68-84 hours (4-5 weeks for one developer)
