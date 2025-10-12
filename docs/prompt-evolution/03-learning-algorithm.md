# Learning Algorithm

## Executive Summary

This document defines the complete learning algorithm for automated prompt evolution, including pattern detection, rule generation, testing, and deployment.

---

## Learning Pipeline Overview

```
┌────────────────────────────────────────────────────────────────┐
│                    EXTRACTION FEEDBACK LOOP                     │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│  STAGE 1: PATTERN DETECTION                                    │
│  - Aggregate concerns across SEEDs                             │
│  - Identify recurring patterns                                 │
│  - Filter noise from signal                                    │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│  STAGE 2: RULE GENERATION                                      │
│  - Analyze pattern characteristics                             │
│  - Generate candidate rule                                     │
│  - Validate rule specificity                                   │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│  STAGE 3: EXPERIMENTAL TESTING                                 │
│  - Design A/B test                                             │
│  - Collect samples (50-200)                                    │
│  - Statistical analysis                                        │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│  STAGE 4: COMMIT DECISION                                      │
│  - Evaluate promotion criteria                                 │
│  - Check for conflicts                                         │
│  - Commit or reject                                            │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│  STAGE 5: PRODUCTION MONITORING                                │
│  - 30-day observation period                                   │
│  - Quality regression detection                                │
│  - Promote to stable or revert                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Pattern Detection

### 1.1 Concern Aggregation

Every extraction with quality score < 7 or explicit concerns triggers pattern detection.

```typescript
interface ExtractionConcern {
  seedId: string;
  seedText: string;
  legos: LEGO[];
  qualityScore: number;
  concernType: ConcernType;
  concernDescription: string;
  timestamp: string;
}

enum ConcernType {
  OVER_SEGMENTATION = "over_segmentation",
  UNDER_SEGMENTATION = "under_segmentation",
  MISSING_CONTEXT = "missing_context",
  UNNATURAL_SPLITTING = "unnatural_splitting",
  INCONSISTENT_GRANULARITY = "inconsistent_granularity",
}

class PatternDetector {
  private concernBuffer: ExtractionConcern[] = [];

  async processConcern(concern: ExtractionConcern): Promise<void> {
    // Add to buffer
    this.concernBuffer.push(concern);

    // Keep rolling window of last 1000 concerns
    if (this.concernBuffer.length > 1000) {
      this.concernBuffer.shift();
    }

    // Trigger pattern detection if buffer has enough data
    if (this.concernBuffer.length >= 100) {
      await this.detectPatterns();
    }
  }

  private async detectPatterns(): Promise<void> {
    // Group concerns by type
    const grouped = this.groupConcernsByType(this.concernBuffer);

    for (const [type, concerns] of Object.entries(grouped)) {
      // Extract patterns from each group
      const patterns = await this.extractPatterns(concerns);

      // Filter significant patterns (frequency threshold)
      const significantPatterns = patterns.filter(
        p => p.frequency >= 5 && p.confidence > 0.70
      );

      for (const pattern of significantPatterns) {
        await this.handlePattern(pattern);
      }
    }
  }
}
```

### 1.2 Pattern Extraction

```typescript
interface Pattern {
  id: string;
  type: ConcernType;
  description: string;
  frequency: number;
  confidence: number;
  affectedSEEDs: string[];
  characteristics: PatternCharacteristics;
}

interface PatternCharacteristics {
  // Linguistic features
  posPattern?: string[];          // e.g., ["VERB", "PREP"]
  dependencyPattern?: string;      // e.g., "verb → prep"
  wordPattern?: RegExp;            // e.g., /go to|come from/

  // Semantic features
  phraseType?: string;             // e.g., "phrasal_verb"
  semanticRole?: string;           // e.g., "direction"

  // Statistical features
  avgPosition: number;             // Position in sentence (0-1)
  avgLength: number;               // Words in problematic segment
  contextWords: string[];          // Common surrounding words
}

class PatternExtractor {
  async extractPatterns(
    concerns: ExtractionConcern[]
  ): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // 1. Linguistic pattern analysis
    const lingPatterns = await this.extractLinguisticPatterns(concerns);
    patterns.push(...lingPatterns);

    // 2. Semantic pattern analysis
    const semPatterns = await this.extractSemanticPatterns(concerns);
    patterns.push(...semPatterns);

    // 3. Structural pattern analysis
    const structPatterns = await this.extractStructuralPatterns(concerns);
    patterns.push(...structPatterns);

    // 4. Deduplicate and merge similar patterns
    const merged = this.mergePatterns(patterns);

    return merged;
  }

  private async extractLinguisticPatterns(
    concerns: ExtractionConcern[]
  ): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // Analyze POS tag sequences
    const posSequences = new Map<string, ExtractionConcern[]>();

    for (const concern of concerns) {
      // Parse SEEDs to get POS tags
      const posTags = await this.getPOSTags(concern.seedText);

      // Extract n-grams (2-3 words)
      for (let n = 2; n <= 3; n++) {
        for (let i = 0; i <= posTags.length - n; i++) {
          const sequence = posTags.slice(i, i + n).join(" ");

          if (!posSequences.has(sequence)) {
            posSequences.set(sequence, []);
          }
          posSequences.get(sequence)!.push(concern);
        }
      }
    }

    // Filter sequences that appear in 5+ concerns
    for (const [sequence, concernsWithSeq] of posSequences) {
      if (concernsWithSeq.length >= 5) {
        const pattern: Pattern = {
          id: `P_${Date.now()}_${Math.random()}`,
          type: concernsWithSeq[0].concernType,
          description: `POS pattern: ${sequence}`,
          frequency: concernsWithSeq.length,
          confidence: this.calculateConfidence(concernsWithSeq, concerns),
          affectedSEEDs: concernsWithSeq.map(c => c.seedId),
          characteristics: {
            posPattern: sequence.split(" "),
            avgPosition: this.calculateAvgPosition(concernsWithSeq),
            avgLength: this.calculateAvgLength(concernsWithSeq),
            contextWords: this.extractContextWords(concernsWithSeq),
          },
        };

        patterns.push(pattern);
      }
    }

    return patterns;
  }

  private async extractSemanticPatterns(
    concerns: ExtractionConcern[]
  ): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // Use NLP to identify semantic patterns
    for (const concern of concerns) {
      // Identify phrase types
      const phrases = await this.identifyPhrases(concern.seedText);

      for (const phrase of phrases) {
        // Count occurrences of this phrase type in concerns
        const occurrences = concerns.filter(c =>
          c.seedText.includes(phrase.text)
        );

        if (occurrences.length >= 5) {
          const pattern: Pattern = {
            id: `P_${Date.now()}_${Math.random()}`,
            type: concern.concernType,
            description: `Semantic pattern: ${phrase.type}`,
            frequency: occurrences.length,
            confidence: occurrences.length / concerns.length,
            affectedSEEDs: occurrences.map(c => c.seedId),
            characteristics: {
              phraseType: phrase.type,
              semanticRole: phrase.role,
              avgPosition: this.calculateAvgPosition(occurrences),
              avgLength: phrase.text.split(" ").length,
              contextWords: this.extractContextWords(occurrences),
            },
          };

          patterns.push(pattern);
        }
      }
    }

    return patterns;
  }

  private calculateConfidence(
    concernsWithPattern: ExtractionConcern[],
    allConcerns: ExtractionConcern[]
  ): number {
    // Confidence = frequency / total concerns of this type
    const typeMatches = allConcerns.filter(
      c => c.concernType === concernsWithPattern[0].concernType
    );

    return concernsWithPattern.length / typeMatches.length;
  }
}
```

### 1.3 Pattern Validation

Not all patterns should become rules. Validate before proceeding.

```typescript
class PatternValidator {
  validate(pattern: Pattern): ValidationResult {
    const checks = [
      this.checkFrequencyThreshold(pattern),
      this.checkConfidenceThreshold(pattern),
      this.checkSpecificity(pattern),
      this.checkGeneralizability(pattern),
      this.checkNoiseRatio(pattern),
    ];

    const passed = checks.every(check => check.passed);

    return {
      passed,
      checks,
      recommendation: this.makeRecommendation(checks),
    };
  }

  private checkFrequencyThreshold(pattern: Pattern): ValidationCheck {
    // Must occur at least 5 times
    const threshold = 5;
    const passed = pattern.frequency >= threshold;

    return {
      name: "Frequency Threshold",
      passed,
      message: passed
        ? `Pattern occurs ${pattern.frequency} times (≥ ${threshold})`
        : `Pattern only occurs ${pattern.frequency} times (< ${threshold})`,
    };
  }

  private checkConfidenceThreshold(pattern: Pattern): ValidationCheck {
    // Must have confidence > 0.70
    const threshold = 0.70;
    const passed = pattern.confidence >= threshold;

    return {
      name: "Confidence Threshold",
      passed,
      message: passed
        ? `Confidence ${pattern.confidence.toFixed(2)} (≥ ${threshold})`
        : `Confidence ${pattern.confidence.toFixed(2)} (< ${threshold})`,
    };
  }

  private checkSpecificity(pattern: Pattern): ValidationCheck {
    // Pattern should not be too specific (e.g., only one specific word)
    const hasGeneralPattern =
      pattern.characteristics.posPattern ||
      pattern.characteristics.phraseType ||
      pattern.characteristics.dependencyPattern;

    const notTooSpecific =
      !pattern.characteristics.wordPattern ||
      pattern.characteristics.wordPattern.source.includes("|"); // Multiple alternatives

    const passed = hasGeneralPattern && notTooSpecific;

    return {
      name: "Specificity Check",
      passed,
      message: passed
        ? "Pattern is generalizable"
        : "Pattern is too specific (may overfit)",
    };
  }

  private checkGeneralizability(pattern: Pattern): ValidationCheck {
    // Check if pattern applies to diverse SEED types
    const seedTypes = this.getSEEDTypes(pattern.affectedSEEDs);
    const uniqueTypes = new Set(seedTypes).size;

    // Should affect at least 3 different SEED types
    const passed = uniqueTypes >= 3;

    return {
      name: "Generalizability Check",
      passed,
      message: passed
        ? `Affects ${uniqueTypes} different SEED types`
        : `Only affects ${uniqueTypes} SEED type(s) - may not generalize`,
    };
  }

  private checkNoiseRatio(pattern: Pattern): ValidationCheck {
    // Check if pattern has clear signal vs noise
    // High frequency but low confidence suggests noisy pattern

    const signal = pattern.confidence;
    const noise = 1 - pattern.confidence;
    const snr = signal / noise;

    // Signal-to-noise ratio should be > 2
    const passed = snr > 2;

    return {
      name: "Signal-to-Noise Ratio",
      passed,
      message: passed
        ? `SNR = ${snr.toFixed(2)} (good signal)`
        : `SNR = ${snr.toFixed(2)} (too noisy)`,
    };
  }
}
```

---

## Stage 2: Rule Generation

### 2.1 Rule Synthesis

Once a pattern is validated, generate a candidate rule.

```typescript
class RuleGenerator {
  async generateRule(pattern: Pattern): Promise<Rule> {
    // 1. Determine rule category
    const category = this.determineCategory(pattern);

    // 2. Generate rule conditions
    const conditions = this.generateConditions(pattern);

    // 3. Generate rule action
    const action = this.generateAction(pattern);

    // 4. Extract examples
    const examples = await this.extractExamples(pattern);

    // 5. Assign priority based on category
    const priority = this.calculatePriority(category, pattern);

    // 6. Generate human-readable description
    const description = this.generateDescription(pattern, conditions, action);

    const rule: Rule = {
      id: `C${String(await this.getNextCandidateId()).padStart(3, '0')}`,
      version: "1.0.0",
      name: this.generateName(pattern),
      description,
      status: "candidate",
      category,
      priority,
      conditions,
      action,
      examples,
      metadata: {
        learned_from: pattern.affectedSEEDs,
        created_at: new Date().toISOString(),
        created_by: "automatic",
        generality_score: null, // Will be calculated during validation
      },
      performance: {
        baseline_quality: null, // Will be filled during A/B test
        with_rule_quality: null,
        improvement: null,
        p_value: null,
        effect_size: null,
        sample_size: null,
        test_id: null,
      },
      conflicts: [],
    };

    return rule;
  }

  private determineCategory(pattern: Pattern): RuleCategory {
    // Use heuristics to determine category

    if (pattern.characteristics.dependencyPattern) {
      return "syntactic";
    }

    if (pattern.characteristics.phraseType === "phrasal_verb" ||
        pattern.characteristics.phraseType === "idiom" ||
        pattern.characteristics.phraseType === "collocation") {
      return "phrasal_unit";
    }

    if (pattern.characteristics.semanticRole) {
      return "semantic";
    }

    return "contextual";
  }

  private generateConditions(pattern: Pattern): RuleCondition[] {
    const conditions: RuleCondition[] = [];

    // Add POS pattern condition if available
    if (pattern.characteristics.posPattern) {
      conditions.push({
        type: "pos_tag",
        pattern: pattern.characteristics.posPattern.join(" "),
        description: `Match POS sequence: ${pattern.characteristics.posPattern.join("-")}`,
      });
    }

    // Add dependency pattern condition if available
    if (pattern.characteristics.dependencyPattern) {
      conditions.push({
        type: "dependency",
        pattern: pattern.characteristics.dependencyPattern,
        description: `Match dependency relation: ${pattern.characteristics.dependencyPattern}`,
      });
    }

    // Add semantic condition if available
    if (pattern.characteristics.phraseType) {
      conditions.push({
        type: "semantic",
        pattern: `is_${pattern.characteristics.phraseType}`,
        description: `Check if phrase is ${pattern.characteristics.phraseType}`,
      });
    }

    // Add word pattern condition if available
    if (pattern.characteristics.wordPattern) {
      conditions.push({
        type: "pattern",
        pattern: pattern.characteristics.wordPattern.source,
        description: `Match word pattern`,
      });
    }

    return conditions;
  }

  private generateAction(pattern: Pattern): RuleAction {
    // Determine action based on concern type

    switch (pattern.type) {
      case "over_segmentation":
        return {
          type: "keep_together",
          description: "Keep matched words as single LEGO",
        };

      case "under_segmentation":
        return {
          type: "split",
          description: "Split matched phrase into separate LEGOs",
        };

      case "missing_context":
        return {
          type: "preserve",
          description: "Preserve contextual information in LEGO",
        };

      case "unnatural_splitting":
        return {
          type: "merge",
          description: "Merge unnaturally split segments",
        };

      default:
        return {
          type: "transform",
          description: "Apply transformation to improve quality",
        };
    }
  }

  private async extractExamples(pattern: Pattern): Promise<RuleExample[]> {
    const examples: RuleExample[] = [];

    // Get up to 5 representative examples
    const seedIds = pattern.affectedSEEDs.slice(0, 5);

    for (const seedId of seedIds) {
      const concern = await this.getConcernBySeedId(seedId);

      // Extract what went wrong
      const incorrect = concern.legos.map(l => l.text);

      // Generate what should have happened (using pattern knowledge)
      const correct = await this.generateCorrectLEGOs(
        concern.seedText,
        pattern
      );

      examples.push({
        seed: concern.seedText,
        correct,
        incorrect,
        explanation: this.generateExplanation(pattern, correct, incorrect),
      });
    }

    return examples;
  }

  private generateName(pattern: Pattern): string {
    // Generate human-readable rule name

    if (pattern.characteristics.phraseType === "phrasal_verb") {
      return "Keep Phrasal Verbs Together";
    }

    if (pattern.characteristics.phraseType === "time_expression") {
      return "Preserve Time Expressions";
    }

    if (pattern.type === "over_segmentation") {
      return `Keep ${pattern.characteristics.phraseType || 'Units'} Together`;
    }

    if (pattern.type === "under_segmentation") {
      return `Split ${pattern.characteristics.phraseType || 'Phrases'}`;
    }

    return `${pattern.type.replace(/_/g, ' ')} Rule`;
  }

  private calculatePriority(
    category: RuleCategory,
    pattern: Pattern
  ): number {
    // Base priority by category
    const basePriorities = {
      syntactic: 90,
      phrasal_unit: 75,
      semantic: 60,
      contextual: 45,
      aesthetic: 20,
    };

    let priority = basePriorities[category];

    // Adjust based on pattern strength
    priority += Math.floor(pattern.confidence * 10); // +0 to +10
    priority += Math.min(pattern.frequency, 10); // +0 to +10

    // Cap at 100
    return Math.min(priority, 100);
  }
}
```

### 2.2 Rule Validation

Before moving to experimental stage, validate the rule.

```typescript
class RuleValidator {
  async validate(rule: Rule): Promise<RuleValidationResult> {
    const checks = [
      await this.validateSyntax(rule),
      await this.validateExamples(rule),
      await this.checkForConflicts(rule),
      await this.testApplicability(rule),
    ];

    const passed = checks.every(c => c.passed);

    return {
      passed,
      checks,
      rule: passed ? rule : null,
    };
  }

  private async validateSyntax(rule: Rule): Promise<ValidationCheck> {
    // Ensure rule JSON is well-formed
    try {
      const schema = await this.loadRuleSchema();
      const valid = this.validateAgainstSchema(rule, schema);

      return {
        name: "Syntax Validation",
        passed: valid,
        message: valid ? "Rule syntax is valid" : "Rule syntax is invalid",
      };
    } catch (error) {
      return {
        name: "Syntax Validation",
        passed: false,
        message: `Validation error: ${error.message}`,
      };
    }
  }

  private async validateExamples(rule: Rule): Promise<ValidationCheck> {
    // Ensure examples are correct and demonstrate rule

    if (rule.examples.length < 3) {
      return {
        name: "Example Validation",
        passed: false,
        message: "Need at least 3 examples",
      };
    }

    // Test that rule actually produces correct output for examples
    let allCorrect = true;

    for (const example of rule.examples) {
      const output = await this.applyRuleToSeed(rule, example.seed);

      if (!this.arraysEqual(output, example.correct)) {
        allCorrect = false;
        break;
      }
    }

    return {
      name: "Example Validation",
      passed: allCorrect,
      message: allCorrect
        ? "All examples produce correct output"
        : "Some examples produce incorrect output",
    };
  }

  private async checkForConflicts(rule: Rule): Promise<ValidationCheck> {
    // Check if rule conflicts with existing rules
    const existingRules = await this.getCommittedRules();
    const conflicts = await this.detectConflicts(rule, existingRules);

    const criticalConflicts = conflicts.filter(c => c.severity === "critical");

    return {
      name: "Conflict Check",
      passed: criticalConflicts.length === 0,
      message:
        criticalConflicts.length === 0
          ? "No critical conflicts detected"
          : `${criticalConflicts.length} critical conflict(s) found`,
      details: conflicts,
    };
  }

  private async testApplicability(rule: Rule): Promise<ValidationCheck> {
    // Test rule on sample of SEEDs to ensure it's applicable

    const testSEEDs = await this.getRandomSEEDs(100);
    let applicableCount = 0;

    for (const seed of testSEEDs) {
      const applicable = await this.isRuleApplicable(rule, seed);
      if (applicable) applicableCount++;
    }

    const applicabilityRate = applicableCount / testSEEDs.length;

    // Should apply to at least 3% of SEEDs
    const passed = applicabilityRate >= 0.03;

    return {
      name: "Applicability Test",
      passed,
      message: passed
        ? `Rule applies to ${(applicabilityRate * 100).toFixed(1)}% of SEEDs`
        : `Rule only applies to ${(applicabilityRate * 100).toFixed(1)}% of SEEDs (< 3%)`,
    };
  }
}
```

---

## Stage 3: Experimental Testing (A/B Test)

### 3.1 A/B Test Setup

```typescript
interface ABTest {
  testId: string;
  rule: Rule;
  controlVersion: string;  // Current production prompt version
  experimentalVersion: string;  // Prompt with new rule

  startDate: Date;
  endDate?: Date;

  targetSampleSize: number;  // e.g., 50 per group
  currentSampleSize: number;

  assignments: Map<string, "control" | "experimental">;

  results: {
    control: ExtractionResult[];
    experimental: ExtractionResult[];
  };

  status: "running" | "completed" | "stopped";
}

class ABTestManager {
  async createTest(rule: Rule): Promise<ABTest> {
    // Calculate required sample size
    const sampleSize = this.calculateSampleSize({
      baselineQuality: await this.getBaselineQuality(),
      minimumDetectableEffect: 0.3, // Want to detect 0.3 point improvement
      alpha: 0.05,
      power: 0.80,
    });

    const test: ABTest = {
      testId: `ab_test_${Date.now()}`,
      rule,
      controlVersion: await this.getCurrentVersion(),
      experimentalVersion: await this.createExperimentalVersion(rule),
      startDate: new Date(),
      targetSampleSize: sampleSize,
      currentSampleSize: 0,
      assignments: new Map(),
      results: {
        control: [],
        experimental: [],
      },
      status: "running",
    };

    await this.saveTest(test);

    return test;
  }

  async assignSEED(test: ABTest, seedId: string): string {
    // Stable random assignment (same SEED always gets same group)
    const hash = this.hashSeedId(seedId, test.testId);
    const group = hash % 2 === 0 ? "control" : "experimental";

    test.assignments.set(seedId, group);

    return group === "control" ? test.controlVersion : test.experimentalVersion;
  }

  async recordResult(
    test: ABTest,
    seedId: string,
    result: ExtractionResult
  ): Promise<void> {
    const group = test.assignments.get(seedId);

    if (group === "control") {
      test.results.control.push(result);
    } else {
      test.results.experimental.push(result);
    }

    test.currentSampleSize = Math.min(
      test.results.control.length,
      test.results.experimental.length
    );

    await this.saveTest(test);

    // Check if we should analyze results
    if (this.shouldAnalyze(test)) {
      await this.analyzeTest(test);
    }
  }

  private shouldAnalyze(test: ABTest): boolean {
    // Analyze when:
    // 1. Reached target sample size, or
    // 2. Every 10 samples to check for early stopping

    return (
      test.currentSampleSize >= test.targetSampleSize ||
      test.currentSampleSize % 10 === 0
    );
  }
}
```

### 3.2 Statistical Analysis

```typescript
class ABTestAnalyzer {
  async analyze(test: ABTest): Promise<ABTestAnalysis> {
    const controlScores = test.results.control.map(r => r.qualityScore);
    const expScores = test.results.experimental.map(r => r.qualityScore);

    // 1. Descriptive statistics
    const controlStats = this.calculateStats(controlScores);
    const expStats = this.calculateStats(expScores);

    // 2. T-test for mean difference
    const tTestResult = this.twoSampleTTest(controlScores, expScores);

    // 3. Effect size (Cohen's d)
    const effectSize = this.calculateCohenD(controlScores, expScores);

    // 4. Confidence interval
    const ci = this.calculateConfidenceInterval(controlScores, expScores);

    // 5. Bayesian analysis
    const bayesianProb = this.bayesianProbability(controlScores, expScores);

    // 6. Win rate (how often experimental beats control)
    const winRate = this.calculateWinRate(test);

    // 7. Concern rate analysis
    const concernRateAnalysis = this.analyzeConcernRates(test);

    // 8. Make decision
    const decision = this.makeDecision({
      tTestResult,
      effectSize,
      bayesianProb,
      winRate,
      concernRateAnalysis,
      sampleSize: test.currentSampleSize,
      targetSize: test.targetSampleSize,
    });

    const analysis: ABTestAnalysis = {
      testId: test.testId,
      analyzedAt: new Date(),
      sampleSize: test.currentSampleSize,

      control: controlStats,
      experimental: expStats,

      delta: expStats.mean - controlStats.mean,
      pValue: tTestResult.pValue,
      effectSize,
      confidenceInterval: ci,
      probabilityOfImprovement: bayesianProb,
      winRate,

      concernRateControl: concernRateAnalysis.control,
      concernRateExperimental: concernRateAnalysis.experimental,
      concernRateDelta: concernRateAnalysis.delta,

      decision: decision.action,
      reasoning: decision.reasoning,
    };

    return analysis;
  }

  private makeDecision(params: DecisionParams): Decision {
    const {
      tTestResult,
      effectSize,
      bayesianProb,
      winRate,
      concernRateAnalysis,
      sampleSize,
      targetSize,
    } = params;

    // ADOPT criteria (all must be true)
    const adoptCriteria = {
      statisticalSignificance: tTestResult.pValue < 0.05,
      meaningfulEffect: effectSize > 0.2,
      highConfidence: bayesianProb > 0.95,
      consistentWins: winRate > 0.60,
      noConcernIncrease: concernRateAnalysis.delta <= 0,
      sufficientSample: sampleSize >= Math.min(targetSize, 50),
    };

    if (Object.values(adoptCriteria).every(v => v)) {
      return {
        action: "ADOPT",
        reasoning: "All adoption criteria satisfied",
        criteria: adoptCriteria,
      };
    }

    // REJECT criteria (any can trigger)
    const rejectCriteria = {
      notSignificant: tTestResult.pValue > 0.20 && sampleSize >= targetSize,
      negativeEffect: effectSize < 0,
      lowProbability: bayesianProb < 0.60,
      concernIncrease: concernRateAnalysis.delta > 0.05,
      maxSamplesReached: sampleSize >= 200, // Max sample size
    };

    if (rejectCriteria.notSignificant ||
        rejectCriteria.negativeEffect ||
        rejectCriteria.lowProbability ||
        rejectCriteria.concernIncrease) {
      return {
        action: "REJECT",
        reasoning: this.explainRejection(rejectCriteria),
        criteria: rejectCriteria,
      };
    }

    if (rejectCriteria.maxSamplesReached) {
      // Reached max samples but no clear winner
      return {
        action: "REJECT",
        reasoning: "Reached maximum sample size without clear improvement",
        criteria: rejectCriteria,
      };
    }

    // CONTINUE testing
    return {
      action: "CONTINUE",
      reasoning: `Need more data. Current sample: ${sampleSize}/${targetSize}`,
      criteria: { adoptCriteria, rejectCriteria },
    };
  }

  private calculateCohenD(
    control: number[],
    experimental: number[]
  ): number {
    const mean1 = this.mean(control);
    const mean2 = this.mean(experimental);

    const var1 = this.variance(control);
    const var2 = this.variance(experimental);

    const pooledStd = Math.sqrt((var1 + var2) / 2);

    return (mean2 - mean1) / pooledStd;
  }

  private bayesianProbability(
    control: number[],
    experimental: number[]
  ): number {
    // Use bootstrap simulation to estimate probability that
    // experimental > control

    const nBootstrap = 10000;
    let experimentalWins = 0;

    for (let i = 0; i < nBootstrap; i++) {
      const controlSample = this.bootstrapSample(control);
      const expSample = this.bootstrapSample(experimental);

      const controlMean = this.mean(controlSample);
      const expMean = this.mean(expSample);

      if (expMean > controlMean) {
        experimentalWins++;
      }
    }

    return experimentalWins / nBootstrap;
  }

  private calculateWinRate(test: ABTest): number {
    // For each SEED, compare control vs experimental quality
    // Count how often experimental wins

    let experimentalWins = 0;
    let totalComparisons = 0;

    const controlResults = new Map(
      test.results.control.map(r => [r.seedId, r.qualityScore])
    );

    for (const expResult of test.results.experimental) {
      const controlScore = controlResults.get(expResult.seedId);

      if (controlScore !== undefined) {
        totalComparisons++;
        if (expResult.qualityScore > controlScore) {
          experimentalWins++;
        }
      }
    }

    return totalComparisons > 0 ? experimentalWins / totalComparisons : 0;
  }

  private analyzeConcernRates(test: ABTest): ConcernRateAnalysis {
    const controlConcerns = test.results.control.filter(
      r => r.concerns && r.concerns.length > 0
    ).length;

    const expConcerns = test.results.experimental.filter(
      r => r.concerns && r.concerns.length > 0
    ).length;

    const controlRate = controlConcerns / test.results.control.length;
    const expRate = expConcerns / test.results.experimental.length;

    return {
      control: controlRate,
      experimental: expRate,
      delta: expRate - controlRate,
    };
  }
}
```

---

## Stage 4: Commit Decision

### 4.1 Promotion Logic

```typescript
class RulePromoter {
  async evaluatePromotion(rule: Rule, test: ABTest): Promise<PromotionResult> {
    // 1. Get A/B test analysis
    const analysis = await this.analyzer.analyze(test);

    if (analysis.decision !== "ADOPT") {
      return {
        promoted: false,
        reason: analysis.reasoning,
        analysis,
      };
    }

    // 2. Run additional validation
    const validation = await this.runPromotionValidation(rule);

    if (!validation.passed) {
      return {
        promoted: false,
        reason: "Failed promotion validation",
        validation,
      };
    }

    // 3. Check for conflicts
    const conflicts = await this.conflictDetector.detectConflicts(
      rule,
      await this.getCommittedRules()
    );

    const criticalConflicts = conflicts.filter(c => c.severity === "critical");

    if (criticalConflicts.length > 0) {
      return {
        promoted: false,
        reason: `${criticalConflicts.length} critical conflicts detected`,
        conflicts: criticalConflicts,
      };
    }

    // 4. Calculate generality score
    const generalityScore = await this.calculateGeneralityScore(rule, test);

    if (generalityScore.overall < 0.60) {
      return {
        promoted: false,
        reason: `Generality score ${generalityScore.overall.toFixed(2)} < 0.60 (may be overfitted)`,
        generalityScore,
      };
    }

    // 5. Holdout validation
    const holdoutResults = await this.validateOnHoldout(rule);

    if (holdoutResults.quality < analysis.experimental.mean * 0.90) {
      return {
        promoted: false,
        reason: "Failed holdout validation (>10% degradation)",
        holdoutResults,
      };
    }

    // All checks passed - promote!
    return {
      promoted: true,
      reason: "All promotion criteria satisfied",
      analysis,
      validation,
      generalityScore,
      holdoutResults,
    };
  }

  async promoteRule(rule: Rule, promotionResult: PromotionResult): Promise<void> {
    // 1. Change rule status
    rule.status = "committed";

    // 2. Assign committed ID
    const committedId = await this.getNextCommittedId();
    const oldId = rule.id;
    rule.id = `R${String(committedId).padStart(3, '0')}`;

    // 3. Move file
    await this.moveRuleFile(
      `rules/experimental/${oldId}_*.json`,
      `rules/committed/${rule.id}_${rule.name.toLowerCase().replace(/\s/g, '_')}.json`
    );

    // 4. Fill in performance data
    rule.performance = {
      baseline_quality: promotionResult.analysis.control.mean,
      with_rule_quality: promotionResult.analysis.experimental.mean,
      improvement: promotionResult.analysis.delta,
      p_value: promotionResult.analysis.pValue,
      effect_size: promotionResult.analysis.effectSize,
      sample_size: promotionResult.analysis.sampleSize,
      test_id: promotionResult.analysis.testId,
    };

    // 5. Set observation period
    rule.metadata.committed_at = new Date().toISOString();

    // 6. Update generality score
    rule.metadata.generality_score = promotionResult.generalityScore;

    // 7. Save rule
    await this.saveRule(rule);

    // 8. Build new prompt version
    const newVersion = await this.versionManager.bumpMinorVersion();
    await this.buildPrompt(newVersion, rule);

    // 9. Update evolution log
    await this.updateEvolutionLog(rule, newVersion, promotionResult);

    // 10. Start observation period
    await this.startObservation(rule, newVersion);
  }
}
```

### 4.2 Generality Score Calculation

```typescript
class GeneralityCalculator {
  async calculate(rule: Rule, test: ABTest): Promise<GeneralityScore> {
    // Test rule across diverse SEED types
    const testSets = await this.createStratifiedTestSets();

    const results: TestSetResult[] = [];

    for (const testSet of testSets) {
      const performance = await this.testRuleOnSet(rule, testSet);
      results.push({
        characteristics: testSet.characteristics,
        performance,
      });
    }

    // Calculate breadth (% of SEED types that benefit)
    const breadth = this.calculateBreadth(results);

    // Calculate consistency (low variance across types)
    const consistency = this.calculateConsistency(results);

    // Calculate magnitude (average improvement)
    const magnitude = this.calculateMagnitude(results);

    // Weighted combination
    const overall = (breadth * 0.4) + (consistency * 0.4) + (magnitude * 0.2);

    return {
      breadth,
      consistency,
      magnitude,
      overall,
      detailedResults: results,
    };
  }

  private calculateBreadth(results: TestSetResult[]): number {
    // Count how many test sets show improvement > 0.1
    const beneficialSets = results.filter(
      r => r.performance.improvement > 0.1
    ).length;

    return beneficialSets / results.length;
  }

  private calculateConsistency(results: TestSetResult[]): number {
    // Calculate coefficient of variation of improvements
    const improvements = results.map(r => r.performance.improvement);

    const mean = improvements.reduce((a, b) => a + b) / improvements.length;

    if (mean <= 0) return 0; // No improvement, no consistency

    const variance =
      improvements.reduce((sum, x) => sum + (x - mean) ** 2, 0) /
      improvements.length;

    const stdDev = Math.sqrt(variance);
    const cv = stdDev / Math.abs(mean); // Coefficient of variation

    // Convert to 0-1 score (lower CV = higher consistency)
    // CV of 0.5 = score of 0.5, CV of 0 = score of 1.0
    return Math.max(0, 1 - cv);
  }

  private calculateMagnitude(results: TestSetResult[]): number {
    // Average improvement across all test sets
    const improvements = results.map(r => r.performance.improvement);
    const avgImprovement = improvements.reduce((a, b) => a + b) / improvements.length;

    // Normalize to 0-1 (assume 2.0 improvement is maximum reasonable)
    return Math.min(avgImprovement / 2.0, 1.0);
  }
}
```

---

## Stage 5: Production Monitoring

### 5.1 Observation Period

After committing a rule, monitor for 30 days.

```typescript
class ProductionMonitor {
  async startObservation(rule: Rule, version: string): Promise<void> {
    const observation: ObservationPeriod = {
      ruleId: rule.id,
      version,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: "observing",
      baseline: await this.getVersionMetrics(version),
      dailyMetrics: [],
      issues: [],
    };

    await this.saveObservation(observation);

    // Schedule daily checks
    this.scheduleDailyChecks(observation);
  }

  async performDailyCheck(observation: ObservationPeriod): Promise<void> {
    const currentMetrics = await this.getVersionMetrics(observation.version);

    observation.dailyMetrics.push({
      date: new Date(),
      metrics: currentMetrics,
    });

    // Check for regression
    const regression = this.detectRegression(
      observation.baseline,
      currentMetrics
    );

    if (regression) {
      observation.issues.push({
        type: "regression",
        detected_at: new Date(),
        description: regression.description,
        severity: regression.severity,
      });

      // If critical regression, trigger alert
      if (regression.severity === "critical") {
        await this.alertCriticalRegression(observation, regression);
      }
    }

    // Check for conflicts
    const conflicts = await this.detectRuntimeConflicts(observation.ruleId);

    if (conflicts.length > 0) {
      observation.issues.push({
        type: "conflict",
        detected_at: new Date(),
        description: `${conflicts.length} conflicts detected`,
        severity: this.assessConflictSeverity(conflicts),
        details: conflicts,
      });
    }

    await this.saveObservation(observation);

    // Check if observation period is complete
    if (new Date() >= observation.endDate) {
      await this.completeObservation(observation);
    }
  }

  private detectRegression(
    baseline: VersionMetrics,
    current: VersionMetrics
  ): Regression | null {
    const qualityDelta = current.meanQuality - baseline.meanQuality;
    const concernDelta = current.concernRate - baseline.concernRate;

    // Critical regression: >5% quality drop or >10% concern increase
    if (qualityDelta < -0.5 || concernDelta > 0.10) {
      return {
        severity: "critical",
        description: `Quality: ${qualityDelta.toFixed(2)}, Concerns: +${(concernDelta * 100).toFixed(1)}%`,
      };
    }

    // Moderate regression: >3% quality drop or >5% concern increase
    if (qualityDelta < -0.3 || concernDelta > 0.05) {
      return {
        severity: "moderate",
        description: `Quality: ${qualityDelta.toFixed(2)}, Concerns: +${(concernDelta * 100).toFixed(1)}%`,
      };
    }

    return null;
  }

  private async completeObservation(
    observation: ObservationPeriod
  ): Promise<void> {
    observation.status = "completed";

    // Determine outcome
    const criticalIssues = observation.issues.filter(
      i => i.severity === "critical"
    );

    if (criticalIssues.length > 0) {
      // Revert rule
      await this.revertRule(observation.ruleId, criticalIssues);
      observation.status = "reverted";
    } else {
      // Promote to stable
      await this.promoteToStable(observation.ruleId);
      observation.status = "stable";
    }

    await this.saveObservation(observation);
  }

  private async revertRule(
    ruleId: string,
    issues: Issue[]
  ): Promise<void> {
    const rule = await this.getRule(ruleId);

    // 1. Change status to reverted
    rule.status = "reverted";

    // 2. Move file
    await this.moveRuleFile(
      `rules/committed/${ruleId}_*.json`,
      `rules/rejected/${ruleId}_*.json`
    );

    // 3. Build new version without this rule
    const newVersion = await this.versionManager.bumpPatchVersion();
    await this.buildPromptWithoutRule(newVersion, ruleId);

    // 4. Update evolution log
    await this.logReversion(rule, newVersion, issues);

    // 5. Alert team
    await this.alertRuleReversion(rule, issues);
  }
}
```

---

## Learning Pipeline Orchestrator

### Main Orchestration Loop

```typescript
class LearningOrchestrator {
  async run(): Promise<void> {
    console.log("Starting learning orchestrator...");

    // Run continuously
    while (true) {
      try {
        await this.runLearningCycle();
      } catch (error) {
        console.error("Error in learning cycle:", error);
      }

      // Wait before next cycle (e.g., 1 hour)
      await this.sleep(60 * 60 * 1000);
    }
  }

  private async runLearningCycle(): Promise<void> {
    console.log("Running learning cycle...");

    // 1. Pattern Detection
    console.log("Stage 1: Pattern Detection");
    const patterns = await this.patternDetector.detectPatterns();
    console.log(`Detected ${patterns.length} patterns`);

    // 2. Rule Generation
    console.log("Stage 2: Rule Generation");
    for (const pattern of patterns) {
      const rule = await this.ruleGenerator.generateRule(pattern);
      const validation = await this.ruleValidator.validate(rule);

      if (validation.passed) {
        console.log(`Generated candidate rule: ${rule.id}`);
        await this.saveRule(rule);

        // Start A/B test
        const test = await this.abTestManager.createTest(rule);
        console.log(`Started A/B test: ${test.testId}`);
      } else {
        console.log(`Rule validation failed: ${validation.checks}`);
      }
    }

    // 3. Check ongoing A/B tests
    console.log("Stage 3: A/B Test Monitoring");
    const activeTests = await this.getActiveTests();

    for (const test of activeTests) {
      const analysis = await this.abTestAnalyzer.analyze(test);
      console.log(`Test ${test.testId}: ${analysis.decision}`);

      if (analysis.decision === "ADOPT") {
        // Promote rule
        const promotionResult = await this.rulePromoter.evaluatePromotion(
          test.rule,
          test
        );

        if (promotionResult.promoted) {
          await this.rulePromoter.promoteRule(test.rule, promotionResult);
          console.log(`Promoted rule ${test.rule.id} to committed`);
        } else {
          console.log(`Promotion blocked: ${promotionResult.reason}`);
        }
      } else if (analysis.decision === "REJECT") {
        // Reject rule
        await this.rejectRule(test.rule, analysis.reasoning);
        console.log(`Rejected rule ${test.rule.id}: ${analysis.reasoning}`);
      }
    }

    // 4. Monitor production rules
    console.log("Stage 4: Production Monitoring");
    const observations = await this.getActiveObservations();

    for (const observation of observations) {
      await this.productionMonitor.performDailyCheck(observation);
    }

    console.log("Learning cycle complete");
  }
}
```

---

## Summary

This learning algorithm provides:

1. **Automated Pattern Detection**: Identifies recurring issues across multiple SEEDs
2. **Rule Generation**: Automatically creates candidate rules from patterns
3. **Scientific Testing**: Rigorous A/B testing with statistical analysis
4. **Quality Gates**: Multiple validation stages before production deployment
5. **Continuous Monitoring**: 30-day observation period for new rules
6. **Self-Healing**: Automatic reversion if quality degrades

The system learns continuously from extraction results, improving prompts over time without manual intervention while maintaining scientific rigor and safety.
