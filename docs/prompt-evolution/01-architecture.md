# Prompt Evolution Architecture

## Executive Summary

This document defines the architecture for a self-learning prompt evolution system that automatically improves APML LEGO extraction quality over time by learning from failures and successes.

---

## Core Principles

### 1. Continuous Learning
- The system learns from every extraction, not just failures
- Success patterns are as valuable as failure patterns
- Learning happens in production, not just during development

### 2. Scientific Rigor
- Every change is measured with statistical significance
- A/B testing validates improvements before deployment
- Regression detection prevents quality degradation

### 3. Explainability
- Every learned rule has clear provenance (which SEEDs taught it)
- Rules include human-readable descriptions and examples
- Evolution history is auditable and reversible

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    EXTRACTION PIPELINE                       │
│                                                              │
│  SEED → Agent → LEGOs → Quality Check → Evolution Feedback  │
└─────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────┐
│                   EVOLUTION ORCHESTRATOR                     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Pattern    │  │   Rule       │  │   A/B Test   │     │
│  │   Detector   │→ │  Generator   │→ │   Engine     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────┐
│                   PROMPT VERSION CONTROL                     │
│                                                              │
│  Base Prompt ← Experimental Rules ← Committed Rules         │
└─────────────────────────────────────────────────────────────┘
```

---

## Q1: How do we track which prompt changes improve quality?

### Metric Framework

#### Primary Metrics
1. **Quality Score Distribution**
   - Track mean, median, p95, p99 quality scores
   - Compare distributions before/after rule application
   - Statistical significance via t-test or Mann-Whitney U

2. **Concern Rate**
   - Percentage of extractions flagged with concerns
   - Track by concern type (missing_context, over_segmentation, etc.)
   - Target: <5% concern rate

3. **Human Validation Agreement**
   - When humans validate extractions, track agreement rate
   - Gold standard for measuring true quality
   - Sample 10% of extractions for human review

4. **Downstream Success Metrics**
   - LEGO usage in sentence generation
   - Learner comprehension scores
   - Teacher satisfaction ratings

#### Secondary Metrics
1. **Extraction Consistency**
   - Same SEED extracted multiple times should yield similar LEGOs
   - Measure cosine similarity of LEGO sets
   - Target: >0.90 consistency

2. **Coverage Metrics**
   - Percentage of SEED words captured in LEGOs
   - Target: 95%+ coverage (excluding articles, obvious structural words)

3. **Efficiency Metrics**
   - Number of LEGOs per SEED
   - Processing time per extraction
   - Token usage per extraction

### Tracking Implementation

```typescript
interface PromptPerformanceTracker {
  promptVersion: string;
  rulesApplied: string[];

  // Tracked per extraction
  trackExtraction(result: ExtractionResult): void;

  // Aggregate metrics
  getMetrics(timeRange?: DateRange): PromptMetrics;

  // Comparison
  compareVersions(v1: string, v2: string): VersionComparison;
}

interface PromptMetrics {
  totalExtractions: number;
  qualityScore: {
    mean: number;
    median: number;
    stdDev: number;
    p95: number;
    p99: number;
  };
  concernRate: number;
  concernsByType: Record<ConcernType, number>;
  avgLEGOsPerSEED: number;
  avgTokensUsed: number;
  processingTime: {
    mean: number;
    p95: number;
  };
}

interface VersionComparison {
  version1: string;
  version2: string;
  sampleSize: number;

  qualityScoreDelta: number;
  statisticalSignificance: number; // p-value
  confidenceInterval: [number, number];

  concernRateDelta: number;
  winRate: number; // % of times v2 outperformed v1

  recommendation: "adopt" | "reject" | "needs_more_data";
}
```

### Tracking Database Schema

```sql
CREATE TABLE extraction_results (
  id UUID PRIMARY KEY,
  seed_id VARCHAR(10) NOT NULL,
  prompt_version VARCHAR(20) NOT NULL,
  rules_applied JSONB NOT NULL,

  -- Extraction output
  legos JSONB NOT NULL,
  quality_score FLOAT,
  concerns JSONB,

  -- Metrics
  num_legos INTEGER,
  tokens_used INTEGER,
  processing_time_ms INTEGER,

  -- Human validation (if available)
  human_validated BOOLEAN DEFAULT FALSE,
  human_quality_score FLOAT,
  human_concerns JSONB,

  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_prompt_version (prompt_version),
  INDEX idx_seed_id (seed_id),
  INDEX idx_quality_score (quality_score),
  INDEX idx_created_at (created_at)
);

CREATE TABLE prompt_version_metrics (
  id UUID PRIMARY KEY,
  prompt_version VARCHAR(20) NOT NULL,

  -- Aggregate metrics (computed daily)
  date DATE NOT NULL,
  total_extractions INTEGER,
  mean_quality_score FLOAT,
  median_quality_score FLOAT,
  p95_quality_score FLOAT,
  concern_rate FLOAT,
  concerns_by_type JSONB,

  UNIQUE(prompt_version, date)
);

CREATE TABLE ab_test_results (
  id UUID PRIMARY KEY,
  test_id VARCHAR(50) NOT NULL,
  control_version VARCHAR(20) NOT NULL,
  experimental_version VARCHAR(20) NOT NULL,

  start_date TIMESTAMP,
  end_date TIMESTAMP,

  control_metrics JSONB,
  experimental_metrics JSONB,
  statistical_analysis JSONB,

  decision VARCHAR(20), -- 'adopt', 'reject', 'continue'
  decided_at TIMESTAMP
);
```

---

## Q2: How do we measure "before/after" success rates?

### A/B Testing Framework

#### Test Design
1. **Randomized Assignment**
   - 50% of SEEDs use control prompt (current best)
   - 50% of SEEDs use experimental prompt (with new rule)
   - Assignment is stable per SEED (same SEED always gets same version during test)

2. **Sample Size Calculation**
   ```python
   from scipy.stats import norm

   def calculate_sample_size(
       baseline_quality: float,
       minimum_detectable_effect: float,
       alpha: float = 0.05,  # significance level
       power: float = 0.80    # 1 - beta
   ) -> int:
       """
       Calculate required sample size per group.

       Example:
       - Baseline quality: 7.5/10
       - Want to detect improvement of 0.5 points
       - 95% confidence, 80% power
       - Result: ~64 samples per group
       """
       z_alpha = norm.ppf(1 - alpha/2)
       z_beta = norm.ppf(power)

       # Assume std dev ~1.5 for quality scores
       std_dev = 1.5

       n = (2 * (z_alpha + z_beta)**2 * std_dev**2) / minimum_detectable_effect**2
       return int(np.ceil(n))
   ```

3. **Test Duration**
   - Minimum: 50 extractions per group
   - Maximum: 200 extractions per group (prevent indefinite testing)
   - Early stopping if statistical significance reached with sufficient evidence

#### Statistical Analysis

```python
class ABTestAnalyzer:
    def analyze(
        self,
        control_scores: List[float],
        experimental_scores: List[float]
    ) -> TestResult:
        """
        Comprehensive statistical analysis of A/B test.
        """

        # 1. Descriptive statistics
        control_stats = self._get_stats(control_scores)
        exp_stats = self._get_stats(experimental_scores)

        # 2. Hypothesis test (two-tailed t-test)
        t_stat, p_value = stats.ttest_ind(control_scores, experimental_scores)

        # 3. Effect size (Cohen's d)
        pooled_std = np.sqrt(
            (np.var(control_scores) + np.var(exp_scores)) / 2
        )
        cohens_d = (exp_stats.mean - control_stats.mean) / pooled_std

        # 4. Confidence interval for difference
        se_diff = np.sqrt(
            np.var(control_scores)/len(control_scores) +
            np.var(exp_scores)/len(exp_scores)
        )
        ci_lower = (exp_stats.mean - control_stats.mean) - 1.96 * se_diff
        ci_upper = (exp_stats.mean - control_stats.mean) + 1.96 * se_diff

        # 5. Bayesian probability of improvement
        # Using bootstrap simulation
        prob_improvement = self._bayesian_probability(
            control_scores, experimental_scores
        )

        return TestResult(
            control_stats=control_stats,
            experimental_stats=exp_stats,
            p_value=p_value,
            effect_size=cohens_d,
            confidence_interval=(ci_lower, ci_upper),
            probability_of_improvement=prob_improvement,
            recommendation=self._make_recommendation(
                p_value, cohens_d, prob_improvement
            )
        )

    def _make_recommendation(
        self,
        p_value: float,
        effect_size: float,
        prob_improvement: float
    ) -> str:
        """
        Decision criteria:
        - ADOPT: p < 0.05, effect > 0.2, prob > 0.95
        - REJECT: p > 0.20 or effect < 0, prob < 0.60
        - CONTINUE: Otherwise (need more data)
        """
        if p_value < 0.05 and effect_size > 0.2 and prob_improvement > 0.95:
            return "ADOPT"
        elif p_value > 0.20 or effect_size < 0 or prob_improvement < 0.60:
            return "REJECT"
        else:
            return "CONTINUE"
```

### Before/After Comparison Strategies

#### Strategy 1: Historical Comparison
- Compare new prompt against historical data from same SEEDs
- **Pros**: Fast, no need for parallel testing
- **Cons**: Confounded by time effects, data drift

#### Strategy 2: A/B Testing (Recommended)
- Parallel testing with random assignment
- **Pros**: Eliminates confounds, gold standard
- **Cons**: Requires more data, takes longer

#### Strategy 3: Sequential Testing
- Test on next N SEEDs, compare to previous N SEEDs
- **Pros**: Simple, no infrastructure needed
- **Cons**: Confounded by SEED difficulty changes

**Recommendation**: Use A/B testing for major rule changes, historical comparison for minor tweaks.

---

## Q3: When do we commit a learned rule to base prompt vs keep it experimental?

### Rule Lifecycle Stages

```
┌──────────────┐
│  CANDIDATE   │  Pattern detected (5+ occurrences)
└──────┬───────┘
       ↓
┌──────────────┐
│ EXPERIMENTAL │  A/B testing in progress (50-200 samples)
└──────┬───────┘
       ↓
   ┌───┴────┐
   ↓        ↓
┌────────┐ ┌──────────┐
│COMMITTED│ │ REJECTED │
└────────┘ └──────────┘
   ↓
┌──────────────┐
│    REVIEW    │  Performance monitoring (30 days)
└──────┬───────┘
       ↓
   ┌───┴────┐
   ↓        ↓
┌────────┐ ┌──────────┐
│  STABLE  │ │ REVERTED │
└────────┘ └──────────┘
```

### Promotion Criteria

#### CANDIDATE → EXPERIMENTAL
Automatic promotion when:
- Same pattern detected in 5+ different SEEDs
- Pattern affects quality score (improves or degrades)
- Rule can be articulated clearly (not just "magic")

#### EXPERIMENTAL → COMMITTED
Requires ALL of:
1. **Statistical Significance**: p-value < 0.05
2. **Meaningful Effect Size**: Cohen's d > 0.2 (small-to-medium effect)
3. **Consistent Improvement**: Win rate > 60% (experimental beats control)
4. **No Regression**: No increase in other concern types
5. **Bayesian Confidence**: >95% probability of improvement
6. **Sample Size**: Minimum 50 samples per group

#### COMMITTED → STABLE
After 30-day observation period:
- No quality degradation detected
- No increase in concern rate
- No user complaints or intervention needed

#### COMMITTED → REVERTED
If during observation period:
- Quality score drops >5% from baseline
- Concern rate increases >10%
- Conflicting rule discovered with higher priority

### Code Implementation

```typescript
class RuleLifecycleManager {
  async evaluateRulePromotion(ruleId: string): Promise<PromotionDecision> {
    const rule = await this.getRuleById(ruleId);

    switch (rule.status) {
      case "candidate":
        return this.evaluateCandidatePromotion(rule);

      case "experimental":
        return this.evaluateExperimentalPromotion(rule);

      case "committed":
        return this.evaluateCommittedStability(rule);

      default:
        throw new Error(`Unknown rule status: ${rule.status}`);
    }
  }

  private async evaluateExperimentalPromotion(
    rule: Rule
  ): Promise<PromotionDecision> {
    // Get A/B test results
    const testResults = await this.getABTestResults(rule.testId);

    // Check all promotion criteria
    const criteria = {
      statisticalSignificance: testResults.pValue < 0.05,
      meaningfulEffect: testResults.effectSize > 0.2,
      consistentImprovement: testResults.winRate > 0.60,
      noRegression: testResults.concernRateDelta <= 0,
      bayesianConfidence: testResults.probabilityOfImprovement > 0.95,
      sufficientSamples: testResults.sampleSize >= 50,
    };

    const allCriteriaMet = Object.values(criteria).every(v => v);

    if (allCriteriaMet) {
      return {
        decision: "PROMOTE_TO_COMMITTED",
        criteria,
        testResults,
        reasoning: "All promotion criteria satisfied.",
      };
    }

    // Check if we should continue testing or reject
    if (testResults.sampleSize >= 200) {
      // Max samples reached, make decision
      if (testResults.pValue > 0.20 || testResults.effectSize < 0) {
        return {
          decision: "REJECT",
          criteria,
          testResults,
          reasoning: "Insufficient evidence of improvement after 200 samples.",
        };
      }
    }

    return {
      decision: "CONTINUE_TESTING",
      criteria,
      testResults,
      reasoning: "Need more data to reach decision threshold.",
    };
  }
}
```

### Commit Strategy

When promoting a rule to COMMITTED:

1. **Semantic Versioning**
   - Major version (1.x.x → 2.x.x): Breaking changes, major rule overhauls
   - Minor version (x.1.x → x.2.x): New rule additions
   - Patch version (x.x.1 → x.x.2): Rule refinements, bug fixes

2. **Integration Method**
   ```markdown
   # Base Prompt v1.5.0

   ## Core Instructions
   [Original prompt content...]

   ## Learned Rules (Auto-generated - Do not edit manually)

   ### Rule: Keep Phrasal Verbs Together
   **Learned from**: C0012, C0034, C0089 (10/11/2025)
   **Performance**: +12% quality improvement (p=0.003)

   When encountering phrasal verbs (verb + preposition/adverb combinations),
   keep them as single LEGOs:
   - ✓ "go to" (not "go" + "to")
   - ✓ "look at" (not "look" + "at")
   - ✓ "come from" (not "come" + "from")

   Examples:
   - SEED: "I go to the park" → ["I", "go to", "the park"]
   - SEED: "Look at this!" → ["Look at", "this"]
   ```

3. **Rollback Plan**
   - Keep previous prompt version available
   - If quality degrades, instant rollback
   - Gradual rollout: 10% → 50% → 100% traffic

---

## Q4: How do we avoid overfitting to specific edge cases?

### Anti-Overfitting Strategies

#### 1. Cross-Validation Across SEED Types

```typescript
interface SEEDCharacteristics {
  length: "short" | "medium" | "long"; // word count
  complexity: "beginner" | "intermediate" | "advanced"; // vocabulary level
  structure: "simple" | "compound" | "complex"; // grammatical structure
  domain: "conversation" | "description" | "instruction" | "question";
}

class OverfittingDetector {
  async validateRule(rule: Rule): Promise<ValidationResult> {
    // Test rule across diverse SEED types
    const testSets = this.createStratifiedSample();

    const results = await Promise.all(
      testSets.map(async (testSet) => {
        const performance = await this.testRuleOnSet(rule, testSet);
        return {
          characteristics: testSet.characteristics,
          performance,
        };
      })
    );

    // Check for performance variation across types
    const performanceStdDev = this.calculateStdDev(
      results.map(r => r.performance.qualityScore)
    );

    // Rule is overfitted if performance varies widely
    if (performanceStdDev > 1.0) {
      return {
        isOverfitted: true,
        reasoning: "Rule performance inconsistent across SEED types",
        performanceByType: results,
      };
    }

    // Check if rule only helps specific types
    const improvementsByType = results.map(r =>
      r.performance.qualityScore - r.performance.baselineScore
    );

    const positiveImprovements = improvementsByType.filter(x => x > 0).length;

    if (positiveImprovements < testSets.length * 0.6) {
      return {
        isOverfitted: true,
        reasoning: "Rule only improves <60% of SEED types",
        performanceByType: results,
      };
    }

    return {
      isOverfitted: false,
      performanceByType: results,
    };
  }

  private createStratifiedSample(): TestSet[] {
    // Create balanced test sets across all dimensions
    const lengths = ["short", "medium", "long"];
    const complexities = ["beginner", "intermediate", "advanced"];
    const structures = ["simple", "compound", "complex"];
    const domains = ["conversation", "description", "instruction", "question"];

    // Sample 5 SEEDs for each combination (3*3*3*4 = 108 combinations)
    // Total: 540 test SEEDs
    const testSets: TestSet[] = [];

    for (const length of lengths) {
      for (const complexity of complexities) {
        for (const structure of structures) {
          for (const domain of domains) {
            const seeds = this.sampleSEEDs({
              length,
              complexity,
              structure,
              domain,
            }, 5);

            testSets.push({
              characteristics: { length, complexity, structure, domain },
              seeds,
            });
          }
        }
      }
    }

    return testSets;
  }
}
```

#### 2. Generality Score

Every rule gets a "generality score" based on:
- **Breadth**: How many different SEED types benefit?
- **Consistency**: Is improvement stable across types?
- **Magnitude**: How much improvement on average?

```typescript
interface GeneralityScore {
  breadth: number;      // 0-1: % of SEED types that benefit
  consistency: number;  // 0-1: 1 - (stdDev / mean) of improvements
  magnitude: number;    // 0-1: normalized average improvement
  overall: number;      // 0-1: weighted combination
}

function calculateGeneralityScore(
  results: PerformanceByType[]
): GeneralityScore {
  const improvements = results.map(r =>
    r.performance.qualityScore - r.performance.baselineScore
  );

  const beneficialTypes = improvements.filter(x => x > 0.1).length;
  const breadth = beneficialTypes / results.length;

  const mean = improvements.reduce((a, b) => a + b) / improvements.length;
  const stdDev = Math.sqrt(
    improvements.reduce((sum, x) => sum + (x - mean)**2, 0) / improvements.length
  );
  const consistency = mean > 0 ? 1 - (stdDev / Math.abs(mean)) : 0;

  const magnitude = Math.min(mean / 2.0, 1.0); // Cap at 2.0 improvement

  // Weighted combination (favor breadth and consistency)
  const overall = (breadth * 0.4) + (consistency * 0.4) + (magnitude * 0.2);

  return { breadth, consistency, magnitude, overall };
}
```

**Threshold**: Only commit rules with generality score > 0.60

#### 3. Holdout Validation Set

- Maintain 20% of SEEDs as holdout set (never used in rule learning)
- Before committing any rule, test on holdout set
- If holdout performance < training performance - 10%, rule is overfitted

#### 4. Rule Specificity Limits

```typescript
interface RuleSpecificity {
  // Too specific = overfitted
  maxExactWordMatches: number;  // e.g., max 3 specific words
  requiresPattern: boolean;      // Must be pattern-based, not word-list
  minApplicability: number;      // Must apply to >5% of SEEDs
}

function validateRuleSpecificity(rule: Rule): boolean {
  // Count exact word matches in rule
  const exactMatches = rule.conditions.filter(c => c.type === "exact_match");

  if (exactMatches.length > 3) {
    return false; // Too specific
  }

  // Check if rule is pattern-based
  const hasPattern = rule.conditions.some(c =>
    c.type === "regex" || c.type === "pos_tag" || c.type === "syntax_tree"
  );

  if (!hasPattern) {
    return false; // Should be pattern-based
  }

  // Check applicability
  const applicabilityRate = rule.metadata.timesApplied / rule.metadata.totalSEEDs;

  if (applicabilityRate < 0.05) {
    return false; // Applies to <5% of SEEDs
  }

  return true;
}
```

#### 5. Ensemble Validation

- Test rule alongside all existing rules
- Ensure it doesn't just "fix" examples that other rules break
- Measure marginal contribution above existing rule set

---

## Q5: How do we handle conflicting rules?

### Conflict Detection

```typescript
interface RuleConflict {
  rule1: string;
  rule2: string;
  conflictType: "contradictory" | "overlapping" | "ordering";
  severity: "critical" | "moderate" | "minor";
  examples: ConflictExample[];
}

interface ConflictExample {
  seedId: string;
  seedText: string;
  rule1Output: LEGO[];
  rule2Output: LEGO[];
  discrepancy: string;
}

class ConflictDetector {
  async detectConflicts(
    newRule: Rule,
    existingRules: Rule[]
  ): Promise<RuleConflict[]> {
    const conflicts: RuleConflict[] = [];

    // Test on diverse sample
    const testSEEDs = await this.getTestSEEDs(100);

    for (const existingRule of existingRules) {
      const conflictExamples: ConflictExample[] = [];

      for (const seed of testSEEDs) {
        // Extract with only new rule
        const output1 = await this.extractWithRule(seed, newRule);

        // Extract with only existing rule
        const output2 = await this.extractWithRule(seed, existingRule);

        // Extract with both rules
        const outputBoth = await this.extractWithRules(seed, [newRule, existingRule]);

        // Check for conflicts
        if (this.hasConflict(output1, output2, outputBoth)) {
          conflictExamples.push({
            seedId: seed.id,
            seedText: seed.text,
            rule1Output: output1,
            rule2Output: output2,
            discrepancy: this.describeConflict(output1, output2),
          });
        }
      }

      if (conflictExamples.length > 0) {
        conflicts.push({
          rule1: newRule.id,
          rule2: existingRule.id,
          conflictType: this.classifyConflictType(conflictExamples),
          severity: this.assessSeverity(conflictExamples.length, testSEEDs.length),
          examples: conflictExamples.slice(0, 5), // Top 5 examples
        });
      }
    }

    return conflicts;
  }

  private classifyConflictType(examples: ConflictExample[]): string {
    // Analyze examples to determine conflict type
    const contradictory = examples.some(ex =>
      this.isContradictory(ex.rule1Output, ex.rule2Output)
    );

    if (contradictory) return "contradictory";

    const overlapping = examples.some(ex =>
      this.hasOverlap(ex.rule1Output, ex.rule2Output)
    );

    if (overlapping) return "overlapping";

    return "ordering";
  }

  private assessSeverity(
    conflictCount: number,
    totalCount: number
  ): "critical" | "moderate" | "minor" {
    const rate = conflictCount / totalCount;

    if (rate > 0.30) return "critical";
    if (rate > 0.10) return "moderate";
    return "minor";
  }
}
```

### Conflict Resolution Strategies

#### Strategy 1: Rule Priority System

```typescript
interface Rule {
  id: string;
  priority: number; // 1-100, higher = higher priority
  category: RuleCategory;
  // ...
}

enum RuleCategory {
  SYNTACTIC = 1,        // Priority 90-100: Grammar structure rules
  PHRASAL_UNIT = 2,     // Priority 70-89: Multi-word expressions
  SEMANTIC = 3,         // Priority 50-69: Meaning-based rules
  CONTEXTUAL = 4,       // Priority 30-49: Context-dependent rules
  AESTHETIC = 5,        // Priority 10-29: Preferences, style
}

class PriorityResolver {
  resolveConflict(
    rules: Rule[],
    seed: SEED,
    conflictingSuggestions: LEGO[][]
  ): LEGO[] {
    // Sort rules by priority
    const sortedRules = rules.sort((a, b) => b.priority - a.priority);

    // Apply highest priority rule
    return conflictingSuggestions[sortedRules[0].id];
  }
}
```

**Priority Guidelines**:
- Syntactic rules (e.g., "don't split grammatical units") > Phrasal rules
- Older, stable rules > Newer experimental rules
- Higher generality score > Lower generality score
- Higher performance gain > Lower performance gain

#### Strategy 2: Conflict-Aware Rule Learning

When learning new rules, explicitly test for conflicts:

```typescript
async function learnNewRule(
  pattern: Pattern,
  existingRules: Rule[]
): Promise<Rule | null> {
  // Generate candidate rule
  const candidateRule = await generateRule(pattern);

  // Detect conflicts
  const conflicts = await conflictDetector.detectConflicts(
    candidateRule,
    existingRules
  );

  if (conflicts.length > 0) {
    // Try to resolve conflicts by refining rule
    const refinedRule = await refineRuleToAvoidConflicts(
      candidateRule,
      conflicts
    );

    if (refinedRule) {
      return refinedRule;
    }

    // If conflicts are severe, reject rule
    const criticalConflicts = conflicts.filter(c => c.severity === "critical");

    if (criticalConflicts.length > 0) {
      console.log(`Rejecting rule due to critical conflicts:`, criticalConflicts);
      return null;
    }

    // For moderate conflicts, assign priority and warn
    candidateRule.priority = calculatePriorityBasedOnConflicts(conflicts);
    candidateRule.metadata.conflicts = conflicts;
  }

  return candidateRule;
}
```

#### Strategy 3: Ensemble Approach

Instead of resolving conflicts, use ensemble voting:

```typescript
class EnsembleExtractor {
  async extract(seed: SEED, rules: Rule[]): Promise<LEGO[]> {
    // Get extraction from each rule
    const extractions = await Promise.all(
      rules.map(rule => this.extractWithRule(seed, rule))
    );

    // Combine extractions via voting
    const combinedLEGOs = this.voteOnLEGOs(extractions, rules);

    return combinedLEGOs;
  }

  private voteOnLEGOs(
    extractions: LEGO[][],
    rules: Rule[]
  ): LEGO[] {
    // Find consensus LEGOs (appear in majority of extractions)
    const legoVotes = new Map<string, number>();

    for (let i = 0; i < extractions.length; i++) {
      const weight = rules[i].priority / 100; // Weighted voting

      for (const lego of extractions[i]) {
        const key = lego.text;
        legoVotes.set(key, (legoVotes.get(key) || 0) + weight);
      }
    }

    // Select LEGOs with >50% weighted vote
    const threshold = rules.reduce((sum, r) => sum + r.priority, 0) / 200;

    const selectedLEGOs: LEGO[] = [];
    for (const [text, votes] of legoVotes) {
      if (votes >= threshold) {
        selectedLEGOs.push({ text, /* ... */ });
      }
    }

    return selectedLEGOs;
  }
}
```

#### Strategy 4: Conflict Retraining

When conflicts are detected:
1. Create training examples showing preferred resolution
2. Retrain or refine conflicting rules to align
3. Use human annotation to determine correct resolution

```typescript
interface ConflictResolutionTraining {
  conflictId: string;
  seedId: string;
  rule1Output: LEGO[];
  rule2Output: LEGO[];
  correctOutput: LEGO[]; // Human-annotated

  // Which rule was right?
  winningRule: string;

  // Should rules be refined?
  suggestedRefinement?: string;
}

class ConflictRetrainer {
  async retrainConflictingRules(
    trainingData: ConflictResolutionTraining[]
  ): Promise<void> {
    // Group by rule pairs
    const conflictGroups = this.groupByRulePair(trainingData);

    for (const [rulePair, examples] of conflictGroups) {
      const [rule1Id, rule2Id] = rulePair.split("|");

      // Analyze which rule is consistently correct
      const rule1Wins = examples.filter(ex => ex.winningRule === rule1Id).length;
      const rule2Wins = examples.filter(ex => ex.winningRule === rule2Id).length;

      if (rule1Wins > rule2Wins * 2) {
        // Rule1 is clearly better, downgrade rule2
        await this.downgradePriority(rule2Id);
      } else if (rule2Wins > rule1Wins * 2) {
        // Rule2 is clearly better, downgrade rule1
        await this.downgradePriority(rule1Id);
      } else {
        // Both rules are sometimes correct, refine scope
        await this.refineScopeToAvoidConflict(rule1Id, rule2Id, examples);
      }
    }
  }
}
```

### Conflict Prevention

Best practice: **Prevent conflicts during rule generation**

```typescript
interface RuleConstraints {
  // Scope constraints to prevent overlap
  mustNotApplyTo?: string[]; // Rule IDs
  appliesOnlyWhen?: Condition[]; // Specific conditions

  // Explicit exclusions
  excludePatterns?: RegExp[];
}

function generateRuleWithConstraints(
  pattern: Pattern,
  existingRules: Rule[]
): Rule {
  const rule = generateBaseRule(pattern);

  // Add constraints to avoid conflicts
  const relatedRules = findRelatedRules(pattern, existingRules);

  for (const relatedRule of relatedRules) {
    // Add exclusion condition
    rule.constraints.mustNotApplyTo.push(relatedRule.id);

    // Narrow scope to non-overlapping cases
    rule.conditions = refineConditionsToExclude(
      rule.conditions,
      relatedRule.conditions
    );
  }

  return rule;
}
```

---

## Summary: Architecture Decision Records

### ADR-001: A/B Testing is Primary Evaluation Method
**Decision**: Use randomized A/B testing as the primary method for evaluating prompt changes.

**Rationale**:
- Eliminates confounds (time, SEED difficulty, etc.)
- Industry gold standard for causal inference
- Provides statistical rigor

**Consequences**:
- Requires more data and time per rule
- Need infrastructure for stable randomization
- Worth it for quality assurance

### ADR-002: Multi-Dimensional Overfitting Prevention
**Decision**: Use stratified validation, generality scoring, and holdout sets to prevent overfitting.

**Rationale**:
- Single approach (e.g., just holdout set) is insufficient
- Language is complex, need multiple safeguards
- Generality score provides interpretable metric

**Consequences**:
- More complex validation pipeline
- Slower rule promotion
- Higher confidence in learned rules

### ADR-003: Priority-Based Conflict Resolution
**Decision**: Use rule priority system with category-based defaults.

**Rationale**:
- Simple, deterministic, explainable
- Allows human override when needed
- Better than ensemble voting for consistency

**Consequences**:
- Need to carefully assign priorities
- May need manual intervention for some conflicts
- Clear hierarchy aids debugging

### ADR-004: Three-Stage Rule Lifecycle
**Decision**: Candidate → Experimental → Committed → Stable

**Rationale**:
- Gradual promotion reduces risk
- Clear gates at each stage
- Allows rollback if issues detected

**Consequences**:
- Longer time to production
- More monitoring overhead
- Much safer system

---

## Next Steps

1. Implement `PromptPerformanceTracker` and database schema
2. Build A/B testing infrastructure
3. Create `RuleLifecycleManager` with promotion logic
4. Develop overfitting detection and validation
5. Implement conflict detection and resolution
6. Design monitoring dashboard for rule performance

---

## Appendix: Metrics Dashboard Mock

```
╔═══════════════════════════════════════════════════════════════════╗
║                  PROMPT EVOLUTION DASHBOARD                        ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Current Prompt: v1.5.2  (12 committed rules)                     ║
║  Quality Score: 8.2/10  (↑ 0.8 from baseline)                    ║
║  Concern Rate: 3.2%  (↓ 65% from baseline)                       ║
║                                                                    ║
╠═══════════════════════════════════════════════════════════════════╣
║  EXPERIMENTAL RULES (2 active)                                     ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │ Rule: keep_time_expressions                                 │  ║
║  │ Status: A/B Testing (45/50 samples)                         │  ║
║  │ Quality: 8.4 vs 8.2 (control)  [p=0.08]                    │  ║
║  │ Progress: ████████████░░░░ 90%                              │  ║
║  │ Decision: Need 5 more samples                               │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                    ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │ Rule: preserve_question_intonation                          │  ║
║  │ Status: A/B Testing (32/50 samples)                         │  ║
║  │ Quality: 8.5 vs 8.2 (control)  [p=0.02] ✓                 │  ║
║  │ Progress: ████████░░░░░░░░ 64%                              │  ║
║  │ Decision: Looking good! Continue testing                    │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                    ║
╠═══════════════════════════════════════════════════════════════════╣
║  RECENT COMMITS                                                    ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  v1.5.2 (2 hours ago) - keep_phrasal_verbs                       ║
║    +12% quality, -18% over_segmentation                          ║
║    [Rollout: 100%] ✓                                             ║
║                                                                    ║
║  v1.5.1 (1 day ago) - handle_contractions                        ║
║    +8% quality, -25% missing_context                             ║
║    [Rollout: 100%] ✓                                             ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
```
