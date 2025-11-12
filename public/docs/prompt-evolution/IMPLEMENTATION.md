# Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the Prompt Evolution and Learning System.

---

## Phase 1: Foundation (Weeks 1-4)

### Week 1: Infrastructure Setup

#### 1.1 Directory Structure

```bash
# Create directory structure
mkdir -p prompts/{base/phase_3,rules/{committed,experimental,candidate,rejected},evolution/{ab_tests,patterns,metrics},builds,templates,tests/{fixtures,regression,validation}}

# Create initial files
touch prompts/README.md
touch prompts/.promptrc
touch prompts/evolution/evolution_log.json
```

#### 1.2 Database Schema

```sql
-- Create database
CREATE DATABASE apml_evolution;

-- Create tables
\i scripts/sql/create_tables.sql

-- Tables to create:
-- - extraction_results
-- - prompt_version_metrics
-- - ab_test_results
-- - patterns
-- - rules
-- - observations
```

#### 1.3 Base Prompt

```bash
# Create base prompt v1.0.0
cat > prompts/base/phase_3/v1.0.0.md <<EOF
# Phase 3: LEGO Extraction

## Instructions

You are extracting "LEGOs" (Learning Elements for Growth Optimization) from Welsh SEEDs (Simple Expression Elements for Development).

[... base prompt content ...]

<!-- LEARNED_RULES_INJECTION_POINT -->

EOF
```

#### 1.4 Evolution Log Initialization

```json
{
  "schema_version": "1.0.0",
  "current_version": "1.0.0",
  "last_updated": "2025-10-11T00:00:00Z",
  "timeline": [
    {
      "version": "1.0.0",
      "date": "2025-10-11T00:00:00Z",
      "type": "baseline",
      "description": "Initial base prompt",
      "rules": [],
      "metrics": null
    }
  ],
  "rules": {
    "committed": [],
    "experimental": [],
    "candidate": [],
    "rejected": [],
    "reverted": []
  },
  "patterns": {
    "active": [],
    "monitoring": [],
    "resolved": [],
    "dismissed": []
  },
  "statistics": null,
  "configuration": {
    "thresholds": {
      "pattern_detection": {
        "min_frequency": 5,
        "min_confidence": 0.70
      },
      "rule_promotion": {
        "min_p_value": 0.05,
        "min_effect_size": 0.2,
        "min_bayesian_confidence": 0.95,
        "min_win_rate": 0.60,
        "min_sample_size": 50,
        "max_sample_size": 200
      }
    }
  }
}
```

### Week 2: Core Modules

#### 2.1 Tracking System

```typescript
// src/evolution/tracking/performance-tracker.ts

export class PromptPerformanceTracker {
  private db: Database;

  async trackExtraction(result: ExtractionResult): Promise<void> {
    await this.db.query(`
      INSERT INTO extraction_results (
        seed_id, prompt_version, rules_applied, legos,
        quality_score, concerns, tokens_used, processing_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      result.seedId,
      result.promptVersion,
      JSON.stringify(result.rulesApplied),
      JSON.stringify(result.legos),
      result.qualityScore,
      JSON.stringify(result.concerns),
      result.tokensUsed,
      result.processingTimeMs,
    ]);
  }

  async getMetrics(version: string): Promise<VersionMetrics> {
    const results = await this.db.query(`
      SELECT
        AVG(quality_score) as mean_quality,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY quality_score) as median_quality,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY quality_score) as p95_quality,
        STDDEV(quality_score) as std_dev_quality,
        SUM(CASE WHEN concerns IS NOT NULL THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as concern_rate,
        COUNT(*) as total_extractions
      FROM extraction_results
      WHERE prompt_version = $1
    `, [version]);

    return results.rows[0];
  }
}
```

#### 2.2 Pattern Detection

```typescript
// src/evolution/learning/pattern-detector.ts

export class PatternDetector {
  private concernBuffer: ExtractionConcern[] = [];
  private readonly BUFFER_SIZE = 1000;
  private readonly DETECTION_THRESHOLD = 100;

  async processConcern(concern: ExtractionConcern): Promise<void> {
    this.concernBuffer.push(concern);

    // Keep rolling window
    if (this.concernBuffer.length > this.BUFFER_SIZE) {
      this.concernBuffer.shift();
    }

    // Trigger pattern detection periodically
    if (this.concernBuffer.length >= this.DETECTION_THRESHOLD) {
      await this.detectPatterns();
    }
  }

  private async detectPatterns(): Promise<void> {
    const grouped = this.groupConcernsByType(this.concernBuffer);

    for (const [type, concerns] of Object.entries(grouped)) {
      const patterns = await this.extractPatterns(concerns);

      const significant = patterns.filter(
        p => p.frequency >= 5 && p.confidence > 0.70
      );

      for (const pattern of significant) {
        await this.handlePattern(pattern);
      }
    }
  }

  private async handlePattern(pattern: Pattern): Promise<void> {
    // Save to database
    await this.savePattern(pattern);

    // Generate candidate rule
    const rule = await this.ruleGenerator.generateRule(pattern);

    // Save candidate rule
    await this.saveRule(rule);

    // Notify
    await this.notifyPatternDetected(pattern, rule);
  }
}
```

#### 2.3 A/B Testing Framework

```typescript
// src/evolution/testing/ab-test-manager.ts

export class ABTestManager {
  async createTest(rule: Rule): Promise<ABTest> {
    const sampleSize = this.calculateSampleSize({
      baselineQuality: await this.getBaselineQuality(),
      minimumDetectableEffect: 0.3,
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
      results: { control: [], experimental: [] },
      status: "running",
    };

    await this.saveTest(test);
    return test;
  }

  async assignSEED(test: ABTest, seedId: string): Promise<string> {
    // Stable random assignment
    const hash = this.hashSeedId(seedId, test.testId);
    const group = hash % 2 === 0 ? "control" : "experimental";

    test.assignments.set(seedId, group);

    return group === "control"
      ? test.controlVersion
      : test.experimentalVersion;
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

    // Check if should analyze
    if (this.shouldAnalyze(test)) {
      await this.analyzeTest(test);
    }
  }
}
```

### Week 3: Analysis and Decision

#### 3.1 Statistical Analyzer

```typescript
// src/evolution/analysis/ab-test-analyzer.ts

export class ABTestAnalyzer {
  async analyze(test: ABTest): Promise<ABTestAnalysis> {
    const controlScores = test.results.control.map(r => r.qualityScore);
    const expScores = test.results.experimental.map(r => r.qualityScore);

    // T-test
    const tTestResult = this.twoSampleTTest(controlScores, expScores);

    // Effect size
    const effectSize = this.calculateCohenD(controlScores, expScores);

    // Bayesian probability
    const bayesianProb = this.bayesianProbability(controlScores, expScores);

    // Win rate
    const winRate = this.calculateWinRate(test);

    // Decision
    const decision = this.makeDecision({
      tTestResult,
      effectSize,
      bayesianProb,
      winRate,
      sampleSize: test.currentSampleSize,
      targetSize: test.targetSampleSize,
    });

    return {
      testId: test.testId,
      pValue: tTestResult.pValue,
      effectSize,
      probabilityOfImprovement: bayesianProb,
      winRate,
      decision: decision.action,
      reasoning: decision.reasoning,
    };
  }

  private makeDecision(params: DecisionParams): Decision {
    const { tTestResult, effectSize, bayesianProb, winRate, sampleSize, targetSize } = params;

    // ADOPT criteria
    if (
      tTestResult.pValue < 0.05 &&
      effectSize > 0.2 &&
      bayesianProb > 0.95 &&
      winRate > 0.60 &&
      sampleSize >= Math.min(targetSize, 50)
    ) {
      return { action: "ADOPT", reasoning: "All criteria satisfied" };
    }

    // REJECT criteria
    if (
      (tTestResult.pValue > 0.20 && sampleSize >= targetSize) ||
      effectSize < 0 ||
      bayesianProb < 0.60 ||
      sampleSize >= 200
    ) {
      return { action: "REJECT", reasoning: "Insufficient evidence" };
    }

    return { action: "CONTINUE", reasoning: "Need more data" };
  }
}
```

#### 3.2 Rule Promoter

```typescript
// src/evolution/lifecycle/rule-promoter.ts

export class RulePromoter {
  async evaluatePromotion(rule: Rule, test: ABTest): Promise<PromotionResult> {
    // 1. A/B test analysis
    const analysis = await this.analyzer.analyze(test);

    if (analysis.decision !== "ADOPT") {
      return { promoted: false, reason: analysis.reasoning };
    }

    // 2. Generality score
    const generalityScore = await this.calculateGeneralityScore(rule, test);

    if (generalityScore.overall < 0.60) {
      return {
        promoted: false,
        reason: `Low generality: ${generalityScore.overall.toFixed(2)}`
      };
    }

    // 3. Conflict detection
    const conflicts = await this.conflictDetector.detectConflicts(
      rule,
      await this.getCommittedRules()
    );

    const critical = conflicts.filter(c => c.severity === "critical");

    if (critical.length > 0) {
      return {
        promoted: false,
        reason: `${critical.length} critical conflicts`
      };
    }

    // 4. Holdout validation
    const holdoutResults = await this.validateOnHoldout(rule);

    if (holdoutResults.quality < analysis.experimental.mean * 0.90) {
      return {
        promoted: false,
        reason: "Failed holdout validation"
      };
    }

    return {
      promoted: true,
      reason: "All criteria passed",
      analysis,
      generalityScore,
      holdoutResults,
    };
  }

  async promoteRule(rule: Rule, result: PromotionResult): Promise<void> {
    // Update rule
    rule.status = "committed";
    const committedId = await this.getNextCommittedId();
    rule.id = `R${String(committedId).padStart(3, '0')}`;

    // Move file
    await this.moveRuleFile(rule);

    // Build new version
    const newVersion = await this.versionManager.bumpMinorVersion();
    await this.buildPrompt(newVersion, rule);

    // Update evolution log
    await this.updateEvolutionLog(rule, newVersion, result);

    // Start observation
    await this.startObservation(rule, newVersion);
  }
}
```

### Week 4: Integration and Testing

#### 4.1 Learning Orchestrator

```typescript
// src/evolution/orchestrator.ts

export class LearningOrchestrator {
  async runLearningCycle(): Promise<void> {
    console.log("Starting learning cycle...");

    // 1. Pattern Detection
    const patterns = await this.patternDetector.detectPatterns();
    console.log(`Detected ${patterns.length} patterns`);

    // 2. Rule Generation
    for (const pattern of patterns) {
      const rule = await this.ruleGenerator.generateRule(pattern);
      const validation = await this.ruleValidator.validate(rule);

      if (validation.passed) {
        await this.saveRule(rule);
        const test = await this.abTestManager.createTest(rule);
        console.log(`Started test: ${test.testId}`);
      }
    }

    // 3. Monitor A/B Tests
    const activeTests = await this.getActiveTests();

    for (const test of activeTests) {
      const analysis = await this.abTestAnalyzer.analyze(test);

      if (analysis.decision === "ADOPT") {
        const result = await this.rulePromoter.evaluatePromotion(test.rule, test);

        if (result.promoted) {
          await this.rulePromoter.promoteRule(test.rule, result);
          console.log(`Promoted rule ${test.rule.id}`);
        }
      } else if (analysis.decision === "REJECT") {
        await this.rejectRule(test.rule, analysis.reasoning);
      }
    }

    // 4. Monitor Production
    const observations = await this.getActiveObservations();

    for (const observation of observations) {
      await this.productionMonitor.performDailyCheck(observation);
    }
  }

  async start(): Promise<void> {
    console.log("Starting Learning Orchestrator...");

    // Run continuously
    while (true) {
      try {
        await this.runLearningCycle();
      } catch (error) {
        console.error("Error in learning cycle:", error);
      }

      // Wait 1 hour before next cycle
      await this.sleep(60 * 60 * 1000);
    }
  }
}
```

#### 4.2 Integration Tests

```typescript
// tests/integration/learning-cycle.test.ts

describe("Learning Cycle", () => {
  it("should detect pattern and generate rule", async () => {
    // 1. Create concerns showing pattern
    const concerns = createPhrasalVerbConcerns(10);

    for (const concern of concerns) {
      await patternDetector.processConcern(concern);
    }

    // 2. Should detect pattern
    const patterns = await getActivePatterns();
    expect(patterns).toHaveLength(1);
    expect(patterns[0].description).toContain("phrasal verb");

    // 3. Should generate candidate rule
    const rules = await getCandidateRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].name).toContain("Phrasal Verb");
  });

  it("should run A/B test and promote good rule", async () => {
    // 1. Create rule
    const rule = createTestRule();
    await saveRule(rule);

    // 2. Start A/B test
    const test = await abTestManager.createTest(rule);

    // 3. Simulate extractions
    for (let i = 0; i < 60; i++) {
      const seed = createTestSeed();
      const version = await abTestManager.assignSEED(test, seed.id);
      const result = await extract(seed, version);
      await abTestManager.recordResult(test, seed.id, result);
    }

    // 4. Should analyze and recommend adoption
    const analysis = await abTestAnalyzer.analyze(test);
    expect(analysis.decision).toBe("ADOPT");

    // 5. Should promote rule
    const promotion = await rulePromoter.evaluatePromotion(rule, test);
    expect(promotion.promoted).toBe(true);
  });

  it("should revert rule if quality degrades", async () => {
    // 1. Create and commit rule
    const rule = await createAndCommitRule();

    // 2. Simulate quality degradation
    await simulateQualityDegradation(rule);

    // 3. Should detect regression
    const observation = await getObservation(rule.id);
    await productionMonitor.performDailyCheck(observation);

    // 4. Should revert rule
    const updatedRule = await getRule(rule.id);
    expect(updatedRule.status).toBe("reverted");
  });
});
```

---

## Phase 2: Production Deployment (Weeks 5-8)

### Week 5: Prompt Injection

#### 5.1 Hybrid Injector

```typescript
// src/evolution/injection/hybrid-injector.ts

export class HybridInjector {
  inject(basePrompt: string, rules: Rule[]): string {
    const sections = [
      this.generateHeader(),
      this.generateMetaPrinciples(),
      this.generateLearnedRules(rules),
      this.generateReferenceExamples(rules, 10),
      this.generateApplicationProcess(),
    ];

    return basePrompt + "\n\n" + sections.join("\n\n");
  }

  private generateMetaPrinciples(): string {
    return `## Extraction Methodology

### Meta-Principles

1. **Semantic Units**: Keep words together if they form semantic units
2. **Learner-Centric**: LEGOs should be maximally useful for learners
3. **Natural Boundaries**: Split at natural linguistic boundaries
4. **Context Preservation**: Each LEGO should carry enough context`;
  }

  private generateLearnedRules(rules: Rule[]): string {
    let section = "### Learned Rules (Priority-Ordered)\n\n";

    const sorted = rules.sort((a, b) => b.priority - a.priority);

    for (let i = 0; i < sorted.length; i++) {
      const rule = sorted[i];

      section += `#### ${i + 1}. ${rule.name} [${rule.id}]\n\n`;
      section += `**Pattern:** ${this.describePattern(rule)}\n`;
      section += `**Examples:** ${this.formatExamples(rule)}\n`;

      if (rule.performance) {
        section += `**Evidence:** +${rule.performance.improvement_percent.toFixed(0)}% quality\n`;
      }

      section += "\n---\n\n";
    }

    return section;
  }
}
```

### Week 6: Monitoring Dashboard

#### 6.1 Dashboard API

```typescript
// src/api/evolution-dashboard.ts

export class EvolutionDashboard {
  async getDashboardData(): Promise<DashboardData> {
    const currentVersion = await this.getCurrentVersion();
    const metrics = await this.getVersionMetrics(currentVersion);
    const experiments = await this.getActiveExperiments();
    const trend = await this.getQualityTrend();
    const recentCommits = await this.getRecentCommits(5);

    return {
      currentVersion,
      metrics,
      experiments,
      trend,
      recentCommits,
    };
  }

  async getExperimentDetails(testId: string): Promise<ExperimentDetails> {
    const test = await this.getTest(testId);
    const analysis = await this.analyzer.analyze(test);

    return {
      test,
      analysis,
      progress: this.calculateProgress(test),
      estimatedCompletion: this.estimateCompletion(test),
    };
  }
}
```

#### 6.2 Web Dashboard

```typescript
// src/web/dashboard/components/EvolutionDashboard.tsx

export function EvolutionDashboard() {
  const { data, loading } = useEvolutionData();

  if (loading) return <Loading />;

  return (
    <div>
      <Header version={data.currentVersion} metrics={data.metrics} />

      <QualityTrendChart trend={data.trend} />

      <ActiveExperiments experiments={data.experiments} />

      <RecentCommits commits={data.recentCommits} />

      <RuleLibrary />
    </div>
  );
}
```

### Week 7: Production Integration

#### 7.1 Extraction Service Integration

```typescript
// src/services/lego-extraction.service.ts

export class LEGOExtractionService {
  async extract(seed: SEED): Promise<ExtractionResult> {
    // 1. Get appropriate prompt version
    const promptVersion = await this.getPromptForSeed(seed);

    // 2. Extract LEGOs
    const legos = await this.extractLEGOs(seed, promptVersion);

    // 3. Assess quality
    const quality = await this.assessQuality(legos, seed);

    // 4. Track result
    await this.performanceTracker.trackExtraction({
      seedId: seed.id,
      promptVersion,
      legos,
      qualityScore: quality.score,
      concerns: quality.concerns,
    });

    // 5. If concerns, process for pattern detection
    if (quality.concerns.length > 0) {
      await this.patternDetector.processConcern({
        seedId: seed.id,
        seedText: seed.text,
        legos,
        qualityScore: quality.score,
        concernType: quality.concerns[0].type,
        concernDescription: quality.concerns[0].description,
      });
    }

    return {
      legos,
      quality: quality.score,
      concerns: quality.concerns,
    };
  }

  private async getPromptForSeed(seed: SEED): Promise<string> {
    // Check if seed is in A/B test
    const activeTests = await this.abTestManager.getActiveTests();

    for (const test of activeTests) {
      if (test.assignments.has(seed.id)) {
        return test.assignments.get(seed.id)!;
      }
    }

    // Use current production version
    return await this.versionManager.getCurrentVersion();
  }
}
```

### Week 8: Deployment and Validation

#### 8.1 Deployment Script

```bash
#!/bin/bash
# scripts/deploy_evolution_system.sh

set -e

echo "Deploying Prompt Evolution System..."

# 1. Run tests
npm test

# 2. Build
npm run build

# 3. Database migrations
npm run db:migrate

# 4. Deploy services
kubectl apply -f k8s/evolution-orchestrator.yaml
kubectl apply -f k8s/pattern-detector.yaml
kubectl apply -f k8s/ab-test-manager.yaml

# 5. Start orchestrator
kubectl rollout status deployment/evolution-orchestrator

# 6. Verify
npm run evolution:health-check

echo "Deployment complete!"
```

#### 8.2 Health Checks

```typescript
// src/health/evolution-health.ts

export class EvolutionHealthCheck {
  async check(): Promise<HealthStatus> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkOrchestrator(),
      this.checkPatternDetector(),
      this.checkABTesting(),
      this.checkMetrics(),
    ]);

    const allHealthy = checks.every(c => c.healthy);

    return {
      healthy: allHealthy,
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkOrchestrator(): Promise<ComponentHealth> {
    try {
      const lastRun = await this.getLastOrchestratorRun();
      const timeSinceRun = Date.now() - lastRun.getTime();

      // Should run at least once per hour
      const healthy = timeSinceRun < 60 * 60 * 1000;

      return {
        component: "orchestrator",
        healthy,
        message: healthy
          ? "Running normally"
          : `Last run ${timeSinceRun}ms ago`,
      };
    } catch (error) {
      return {
        component: "orchestrator",
        healthy: false,
        message: error.message,
      };
    }
  }
}
```

---

## Phase 3: Optimization (Weeks 9-12)

### Week 9: Performance Optimization

```typescript
// src/evolution/optimization/token-optimizer.ts

export class TokenOptimizer {
  async optimizePrompt(prompt: string, rules: Rule[]): Promise<string> {
    // 1. Identify redundant content
    const redundancies = this.findRedundancies(prompt);

    // 2. Compress examples
    const compressed = this.compressExamples(prompt);

    // 3. Remove low-value rules
    const filtered = this.filterLowValueRules(rules);

    // 4. Regenerate prompt
    return this.injector.inject(compressed, filtered);
  }

  private filterLowValueRules(rules: Rule[]): Rule[] {
    // Keep rules with high impact
    return rules.filter(rule => {
      const impact = rule.performance.improvement;
      const applicability = rule.usage_stats.application_rate;

      return impact > 0.3 || applicability > 0.10;
    });
  }
}
```

### Week 10: Advanced Features

```typescript
// src/evolution/advanced/adaptive-injector.ts

export class AdaptiveInjector {
  async inject(
    basePrompt: string,
    rules: Rule[],
    seed: SEED
  ): Promise<string> {
    const complexity = await this.assessComplexity(seed);
    const relevantRules = await this.selectRelevantRules(rules, seed);

    if (complexity === "low") {
      // Simple prompt with top 3 rules
      return this.generateSimplePrompt(basePrompt, relevantRules.slice(0, 3));
    } else if (complexity === "high") {
      // Full hybrid prompt
      return this.hybridInjector.inject(basePrompt, relevantRules);
    } else {
      // Standard prompt
      return this.standardInjector.inject(basePrompt, relevantRules.slice(0, 8));
    }
  }

  private async selectRelevantRules(rules: Rule[], seed: SEED): Promise<Rule[]> {
    // Use ML to predict which rules are most likely to apply
    const predictions = await this.ruleRelevanceModel.predict(seed, rules);

    return rules
      .map((rule, i) => ({ rule, relevance: predictions[i] }))
      .sort((a, b) => b.relevance - a.relevance)
      .map(x => x.rule);
  }
}
```

### Week 11-12: Testing and Refinement

Run comprehensive tests and refine based on results.

---

## Maintenance

### Daily Tasks

```bash
# Check system health
npm run evolution:health

# View dashboard
npm run evolution:dashboard

# Review pending rules
npm run evolution:pending
```

### Weekly Tasks

```bash
# Review A/B test results
npm run evolution:review-tests

# Check for regressions
npm run evolution:check-regressions

# Update metrics dashboard
npm run evolution:update-metrics
```

### Monthly Tasks

```bash
# Recompute statistics
npm run evolution:recompute-stats

# Review stable rules
npm run evolution:review-stable

# Optimize token usage
npm run evolution:optimize-tokens

# Backup evolution log
npm run evolution:backup
```

---

## Troubleshooting

### Issue: Pattern not detected

```bash
# Check concern buffer
npm run evolution:debug-concerns

# Lower frequency threshold temporarily
npm run evolution:config set pattern_detection.min_frequency 3

# Check specific SEED
npm run evolution:analyze-seed C0123
```

### Issue: A/B test stuck

```bash
# Check test status
npm run evolution:test-status ab_test_123

# View test results
npm run evolution:test-results ab_test_123

# Force decision (use with caution)
npm run evolution:force-decision ab_test_123 REJECT
```

### Issue: Quality regression

```bash
# Identify problematic rule
npm run evolution:identify-regression

# Revert last commit
npm run evolution:revert-last

# Rollback to specific version
npm run evolution:rollback v1.5.0
```

---

## Resources

- [Architecture Documentation](./01-architecture.md)
- [Version Control Guide](./02-version-control.md)
- [Learning Algorithm](./03-learning-algorithm.md)
- [Evolution Log Schema](./04-evolution-log-schema.md)
- [Injection Strategies](./05-prompt-injection-strategy.md)
- [Approach Comparison](./06-approach-comparison.md)

---

## Support

For questions or issues:
- Documentation: This directory
- Issues: GitHub Issues
- Team: @apml-team

---

**Version**: 1.0.0
**Last Updated**: 2025-10-11
