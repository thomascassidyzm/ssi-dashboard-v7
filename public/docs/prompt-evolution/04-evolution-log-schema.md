# Evolution Log Schema

## Executive Summary

This document defines the complete schema for tracking prompt evolution, including timeline, rules, patterns, metrics, and performance data.

---

## Schema Version

**Current Version**: 1.0.0

**Last Updated**: 2025-10-11

---

## Top-Level Structure

```typescript
interface EvolutionLog {
  schema_version: string;
  current_version: string;
  last_updated: string;

  timeline: TimelineEntry[];
  rules: RuleRegistry;
  patterns: PatternRegistry;
  statistics: GlobalStatistics;
  configuration: SystemConfiguration;
}
```

---

## Timeline Schema

Chronological record of all prompt versions and changes.

```typescript
interface TimelineEntry {
  version: string;                    // Semantic version (e.g., "1.5.2")
  date: string;                       // ISO 8601 timestamp
  type: VersionType;
  description: string;
  rules: string[];                    // Rule IDs included in this version
  metrics: VersionMetrics;
  git_tag?: string;
  git_commit?: string;
}

enum VersionType {
  BASELINE = "baseline",              // Initial version
  RULE_ADDITION = "rule_addition",    // New rule added
  RULE_REMOVAL = "rule_removal",      // Rule removed/reverted
  RULE_REFINEMENT = "rule_refinement",// Rule modified
  HOTFIX = "hotfix",                  // Bug fix
  MAJOR_REWRITE = "major_rewrite",    // Breaking change
}

interface VersionMetrics {
  mean_quality: number;
  median_quality: number;
  p95_quality: number;
  p99_quality: number;
  std_dev_quality: number;

  concern_rate: number;
  concerns_by_type: Record<ConcernType, number>;

  avg_legos_per_seed: number;
  avg_tokens_used: number;
  avg_processing_time_ms: number;

  total_extractions: number;
  human_validated_extractions: number;

  improvement_from_previous?: ImprovementMetrics;
}

interface ImprovementMetrics {
  quality_delta: number;
  quality_delta_percent: number;
  concern_rate_delta: number;
  concern_rate_delta_percent: number;
  p_value: number;
  effect_size: number;
  confidence_interval: [number, number];
}
```

### Timeline Example

```json
{
  "timeline": [
    {
      "version": "1.0.0",
      "date": "2025-10-01T00:00:00Z",
      "type": "baseline",
      "description": "Initial base prompt for Phase 3 LEGO extraction",
      "rules": [],
      "metrics": {
        "mean_quality": 7.12,
        "median_quality": 7.3,
        "p95_quality": 8.5,
        "p99_quality": 9.1,
        "std_dev_quality": 1.21,
        "concern_rate": 0.089,
        "concerns_by_type": {
          "over_segmentation": 45,
          "under_segmentation": 12,
          "missing_context": 23,
          "unnatural_splitting": 8,
          "inconsistent_granularity": 6
        },
        "avg_legos_per_seed": 4.2,
        "avg_tokens_used": 1850,
        "avg_processing_time_ms": 2341,
        "total_extractions": 500,
        "human_validated_extractions": 50
      },
      "git_tag": "v1.0.0",
      "git_commit": "a1b2c3d4"
    },
    {
      "version": "1.1.0",
      "date": "2025-10-10T09:15:00Z",
      "type": "rule_addition",
      "description": "Added R001: Keep Phrasal Verbs Together",
      "rules": ["R001"],
      "metrics": {
        "mean_quality": 7.89,
        "median_quality": 8.0,
        "p95_quality": 9.2,
        "p99_quality": 9.6,
        "std_dev_quality": 1.09,
        "concern_rate": 0.067,
        "concerns_by_type": {
          "over_segmentation": 28,
          "under_segmentation": 11,
          "missing_context": 19,
          "unnatural_splitting": 5,
          "inconsistent_granularity": 4
        },
        "avg_legos_per_seed": 4.1,
        "avg_tokens_used": 1920,
        "avg_processing_time_ms": 2398,
        "total_extractions": 600,
        "human_validated_extractions": 60,
        "improvement_from_previous": {
          "quality_delta": 0.77,
          "quality_delta_percent": 10.8,
          "concern_rate_delta": -0.022,
          "concern_rate_delta_percent": -24.7,
          "p_value": 0.0034,
          "effect_size": 0.58,
          "confidence_interval": [0.45, 1.09]
        }
      },
      "git_tag": "v1.1.0",
      "git_commit": "e5f6g7h8"
    }
  ]
}
```

---

## Rules Registry Schema

Comprehensive tracking of all rules across all statuses.

```typescript
interface RuleRegistry {
  committed: CommittedRule[];
  experimental: ExperimentalRule[];
  candidate: CandidateRule[];
  rejected: RejectedRule[];
  reverted: RevertedRule[];

  summary: RuleSummary;
}

interface RuleSummary {
  total_committed: number;
  total_experimental: number;
  total_candidate: number;
  total_rejected: number;
  total_reverted: number;

  success_rate: number;  // committed / (committed + rejected)
  avg_time_to_commit_days: number;
  avg_improvement_per_rule: number;
}
```

### Committed Rule Schema

```typescript
interface CommittedRule {
  rule_id: string;                    // e.g., "R001"
  name: string;
  version: string;
  status: "committed" | "stable";

  // Lifecycle
  created_at: string;
  committed_at: string;
  committed_in_version: string;
  promoted_to_stable_at?: string;

  // Learning provenance
  learned_from: string[];             // SEED IDs
  pattern_id?: string;                // Pattern that generated this rule

  // Rule definition
  category: RuleCategory;
  priority: number;
  description: string;
  conditions: RuleCondition[];
  action: RuleAction;
  examples: RuleExample[];

  // Performance
  performance: RulePerformance;

  // Validation
  generality_score: GeneralityScore;
  overfitting_checks: OverfittingChecks;

  // Conflicts
  conflicts: RuleConflict[];

  // Observation
  observation_period?: ObservationPeriod;

  // Usage statistics
  usage_stats: UsageStatistics;
}

interface RulePerformance {
  // A/B test results
  ab_test_id: string;
  quality_before: number;
  quality_after: number;
  improvement: number;
  improvement_percent: number;
  p_value: number;
  effect_size: number;
  confidence_interval: [number, number];
  sample_size: number;

  // Concern impact
  concern_rate_before: number;
  concern_rate_after: number;
  concern_rate_delta: number;

  // Per-concern-type impact
  concern_type_impact: Record<ConcernType, number>;

  // Win rate
  win_rate: number;
  tie_rate: number;
  loss_rate: number;
}

interface GeneralityScore {
  breadth: number;       // 0-1: % of SEED types that benefit
  consistency: number;   // 0-1: consistency across types
  magnitude: number;     // 0-1: average improvement magnitude
  overall: number;       // 0-1: weighted combination

  detailed_results: TestSetResult[];
}

interface TestSetResult {
  characteristics: {
    length: "short" | "medium" | "long";
    complexity: "beginner" | "intermediate" | "advanced";
    structure: "simple" | "compound" | "complex";
    domain: "conversation" | "description" | "instruction" | "question";
  };
  sample_size: number;
  performance: {
    baseline_quality: number;
    with_rule_quality: number;
    improvement: number;
    p_value: number;
  };
}

interface OverfittingChecks {
  holdout_validation: {
    passed: boolean;
    holdout_quality: number;
    training_quality: number;
    degradation_percent: number;
  };

  cross_validation: {
    passed: boolean;
    cv_scores: number[];
    mean_score: number;
    std_dev: number;
  };

  applicability_rate: number;  // % of SEEDs where rule applies
}

interface ObservationPeriod {
  start_date: string;
  end_date: string;
  status: "observing" | "completed" | "stable" | "reverted";

  baseline_metrics: VersionMetrics;
  current_metrics: VersionMetrics;

  issues: ObservationIssue[];
}

interface ObservationIssue {
  type: "regression" | "conflict" | "anomaly";
  detected_at: string;
  severity: "critical" | "moderate" | "minor";
  description: string;
  resolved: boolean;
  resolved_at?: string;
}

interface UsageStatistics {
  times_applied: number;
  times_triggered: number;         // How many times conditions matched
  application_rate: number;         // applied / triggered

  seeds_affected: number;
  avg_improvement_when_applied: number;

  last_applied: string;
  first_applied: string;
}
```

### Experimental Rule Schema

```typescript
interface ExperimentalRule {
  rule_id: string;                    // e.g., "E001"
  name: string;
  version: string;
  status: "experimental";

  // Lifecycle
  created_at: string;
  promoted_from_candidate_at: string;

  // Learning provenance
  learned_from: string[];
  pattern_id?: string;

  // Rule definition (same as committed)
  category: RuleCategory;
  priority: number;
  description: string;
  conditions: RuleCondition[];
  action: RuleAction;
  examples: RuleExample[];

  // A/B test
  ab_test: ABTestStatus;
}

interface ABTestStatus {
  test_id: string;
  start_date: string;
  control_version: string;
  experimental_version: string;

  progress: {
    samples_collected: number;
    samples_needed: number;
    percent_complete: number;
  };

  current_results: {
    control_quality: number;
    experimental_quality: number;
    delta: number;
    p_value: number;
    effect_size: number;
    win_rate: number;

    decision: "looking_good" | "neutral" | "looking_bad" | "needs_more_data";
  };

  estimated_completion_date: string;
}
```

### Candidate Rule Schema

```typescript
interface CandidateRule {
  rule_id: string;                    // e.g., "C001"
  name: string;
  version: string;
  status: "candidate";

  created_at: string;

  // Learning provenance
  learned_from: string[];
  pattern_id: string;

  // Rule definition
  category: RuleCategory;
  priority: number;
  description: string;
  conditions: RuleCondition[];
  action: RuleAction;
  examples: RuleExample[];

  // Validation
  validation_status: {
    syntax_valid: boolean;
    examples_valid: boolean;
    no_critical_conflicts: boolean;
    meets_applicability_threshold: boolean;

    ready_for_testing: boolean;
  };

  next_step: "validate" | "promote_to_experimental" | "reject";
}
```

### Rejected Rule Schema

```typescript
interface RejectedRule {
  rule_id: string;
  name: string;
  version: string;
  status: "rejected";

  created_at: string;
  rejected_at: string;

  // Learning provenance
  learned_from: string[];
  pattern_id?: string;

  // Rule definition
  category: RuleCategory;
  priority: number;
  description: string;
  conditions: RuleCondition[];
  action: RuleAction;
  examples: RuleExample[];

  // Rejection details
  rejection_reason: RejectionReason;
}

interface RejectionReason {
  type: "failed_ab_test" | "validation_failure" | "critical_conflicts" | "overfitting";
  description: string;

  ab_test_results?: {
    quality_delta: number;
    p_value: number;
    decision: string;
  };

  validation_failures?: string[];
  conflicts?: RuleConflict[];
  overfitting_indicators?: {
    generality_score: number;
    holdout_degradation: number;
  };
}
```

### Reverted Rule Schema

```typescript
interface RevertedRule {
  rule_id: string;
  name: string;
  version: string;
  status: "reverted";

  // Lifecycle
  created_at: string;
  committed_at: string;
  committed_in_version: string;
  reverted_at: string;
  reverted_in_version: string;

  // Learning provenance
  learned_from: string[];
  pattern_id?: string;

  // Rule definition
  category: RuleCategory;
  priority: number;
  description: string;
  conditions: RuleCondition[];
  action: RuleAction;
  examples: RuleExample[];

  // Performance (before reversion)
  performance: RulePerformance;

  // Reversion details
  reversion_reason: ReversionReason;
}

interface ReversionReason {
  type: "quality_regression" | "conflict_discovered" | "user_complaints";
  description: string;

  regression_details?: {
    baseline_quality: number;
    degraded_quality: number;
    degradation_percent: number;
  };

  issues: ObservationIssue[];
}
```

---

## Pattern Registry Schema

Tracks detected patterns and their lifecycle.

```typescript
interface PatternRegistry {
  active: ActivePattern[];
  monitoring: MonitoringPattern[];
  resolved: ResolvedPattern[];
  dismissed: DismissedPattern[];

  summary: PatternSummary;
}

interface PatternSummary {
  total_patterns_detected: number;
  patterns_converted_to_rules: number;
  patterns_dismissed: number;
  conversion_rate: number;

  most_common_pattern_types: Array<{
    type: ConcernType;
    count: number;
  }>;
}

interface ActivePattern {
  pattern_id: string;
  detected_at: string;
  description: string;

  // Pattern characteristics
  type: ConcernType;
  frequency: number;
  confidence: number;

  affected_seeds: string[];

  characteristics: PatternCharacteristics;

  // Status
  status: "detected" | "candidate_generated" | "experimental_testing";
  generated_rule_id?: string;
}

interface MonitoringPattern {
  pattern_id: string;
  detected_at: string;
  description: string;

  type: ConcernType;
  frequency: number;
  confidence: number;

  affected_seeds: string[];

  status: "monitoring";
  reason: "low_frequency" | "low_confidence" | "waiting_for_more_data";

  threshold_to_activate: {
    current_frequency: number;
    needed_frequency: number;
    current_confidence: number;
    needed_confidence: number;
  };
}

interface ResolvedPattern {
  pattern_id: string;
  detected_at: string;
  resolved_at: string;
  description: string;

  type: ConcernType;
  frequency: number;
  confidence: number;

  affected_seeds: string[];

  status: "resolved";
  resolution: "rule_committed" | "rule_rejected";
  generated_rule_id: string;

  outcome: {
    rule_status: "committed" | "rejected" | "reverted";
    performance?: RulePerformance;
  };
}

interface DismissedPattern {
  pattern_id: string;
  detected_at: string;
  dismissed_at: string;
  description: string;

  type: ConcernType;
  frequency: number;
  confidence: number;

  status: "dismissed";
  reason: "noise" | "not_generalizable" | "duplicate" | "manual_review";
}
```

---

## Global Statistics Schema

System-wide metrics and trends.

```typescript
interface GlobalStatistics {
  overall: OverallStatistics;
  trends: TrendAnalysis;
  quality_distribution: QualityDistribution;
  learning_efficiency: LearningEfficiency;
}

interface OverallStatistics {
  // Version stats
  total_versions: number;
  current_version: string;
  versions_per_month: number;

  // Rule stats
  total_rules_learned: number;
  total_rules_committed: number;
  total_rules_rejected: number;
  total_rules_reverted: number;
  success_rate: number;

  // Performance
  baseline_quality: number;
  current_quality: number;
  total_improvement: number;
  total_improvement_percent: number;

  baseline_concern_rate: number;
  current_concern_rate: number;
  concern_rate_reduction_percent: number;

  // Extraction stats
  total_extractions: number;
  total_concerns_raised: number;
  concerns_resolved: number;

  // Time stats
  system_age_days: number;
  avg_time_to_commit_days: number;
  avg_time_in_observation_days: number;
}

interface TrendAnalysis {
  quality_trend: Trend;
  concern_rate_trend: Trend;
  learning_rate_trend: Trend;

  monthly_metrics: MonthlyMetrics[];
}

interface Trend {
  direction: "improving" | "stable" | "degrading";
  rate_of_change: number;           // per month
  confidence: number;               // 0-1

  data_points: Array<{
    date: string;
    value: number;
  }>;

  regression_analysis: {
    slope: number;
    intercept: number;
    r_squared: number;
    p_value: number;
  };
}

interface MonthlyMetrics {
  month: string;                    // "2025-10"
  quality: number;
  concern_rate: number;
  rules_committed: number;
  rules_rejected: number;
  extractions: number;
}

interface QualityDistribution {
  // Current distribution
  bins: Array<{
    range: string;                  // "7.0-7.5"
    count: number;
    percent: number;
  }>;

  // Statistical measures
  mean: number;
  median: number;
  mode: number;
  std_dev: number;
  skewness: number;
  kurtosis: number;

  // Percentiles
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;

  // Quality goals
  target_mean: number;
  target_p95: number;
  percent_meeting_target: number;
}

interface LearningEfficiency {
  // How efficiently is the system learning?
  patterns_detected: number;
  patterns_converted_to_rules: number;
  conversion_rate: number;

  rules_tested: number;
  rules_committed: number;
  commit_rate: number;

  avg_improvement_per_rule: number;
  avg_cost_per_improvement: {
    samples_needed: number;
    time_days: number;
    compute_cost_usd: number;
  };

  // Return on investment
  roi_metrics: {
    total_investment: {
      time_days: number;
      samples_used: number;
      compute_cost_usd: number;
    };
    total_return: {
      quality_improvement: number;
      concern_reduction_percent: number;
      extractions_improved: number;
    };
    roi_ratio: number;
  };
}
```

---

## System Configuration Schema

Configuration and metadata about the learning system.

```typescript
interface SystemConfiguration {
  version: string;

  // Thresholds
  thresholds: {
    pattern_detection: {
      min_frequency: number;              // e.g., 5
      min_confidence: number;             // e.g., 0.70
    };

    rule_promotion: {
      min_p_value: number;                // e.g., 0.05
      min_effect_size: number;            // e.g., 0.2
      min_bayesian_confidence: number;    // e.g., 0.95
      min_win_rate: number;               // e.g., 0.60
      min_sample_size: number;            // e.g., 50
      max_sample_size: number;            // e.g., 200
    };

    overfitting: {
      min_generality_score: number;       // e.g., 0.60
      max_holdout_degradation: number;    // e.g., 0.10
      min_applicability_rate: number;     // e.g., 0.03
    };

    observation: {
      observation_period_days: number;    // e.g., 30
      critical_regression_threshold: number;  // e.g., -0.5 quality points
      moderate_regression_threshold: number;  // e.g., -0.3 quality points
    };
  };

  // A/B testing configuration
  ab_testing: {
    assignment_strategy: "random" | "stratified";
    traffic_split: number;              // e.g., 0.5 (50/50)
    early_stopping_enabled: boolean;
    minimum_test_duration_hours: number;
  };

  // Automation settings
  automation: {
    auto_promote_enabled: boolean;
    auto_revert_enabled: boolean;
    require_human_approval: boolean;

    notification_channels: string[];    // e.g., ["slack", "email"]
    alert_on_critical_issues: boolean;
  };

  // Feature flags
  features: {
    pattern_detection_enabled: boolean;
    rule_generation_enabled: boolean;
    ab_testing_enabled: boolean;
    auto_commit_enabled: boolean;
    production_monitoring_enabled: boolean;
  };

  // Metadata
  metadata: {
    system_deployed_at: string;
    last_config_update: string;
    config_version: string;
    environment: "development" | "staging" | "production";
  };
}
```

---

## Query API

API for querying the evolution log.

```typescript
class EvolutionLogQuery {
  /**
   * Get complete evolution log
   */
  async getLog(): Promise<EvolutionLog> {
    return await this.loadEvolutionLog();
  }

  /**
   * Get timeline between two versions
   */
  async getTimelineRange(
    fromVersion: string,
    toVersion: string
  ): Promise<TimelineEntry[]> {
    const log = await this.getLog();
    const fromIndex = log.timeline.findIndex(e => e.version === fromVersion);
    const toIndex = log.timeline.findIndex(e => e.version === toVersion);

    return log.timeline.slice(fromIndex, toIndex + 1);
  }

  /**
   * Get rule by ID
   */
  async getRule(ruleId: string): Promise<Rule | null> {
    const log = await this.getLog();

    // Search in all rule categories
    for (const category of Object.values(log.rules)) {
      if (Array.isArray(category)) {
        const rule = category.find(r => r.rule_id === ruleId);
        if (rule) return rule;
      }
    }

    return null;
  }

  /**
   * Get rules by status
   */
  async getRulesByStatus(
    status: "committed" | "experimental" | "candidate" | "rejected" | "reverted"
  ): Promise<Rule[]> {
    const log = await this.getLog();
    return log.rules[status] || [];
  }

  /**
   * Get top performing rules
   */
  async getTopRules(limit: number = 10): Promise<CommittedRule[]> {
    const committed = await this.getRulesByStatus("committed");

    return committed
      .filter(r => r.status === "stable")
      .sort((a, b) => b.performance.improvement - a.performance.improvement)
      .slice(0, limit);
  }

  /**
   * Get active patterns
   */
  async getActivePatterns(): Promise<ActivePattern[]> {
    const log = await this.getLog();
    return log.patterns.active;
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<GlobalStatistics> {
    const log = await this.getLog();
    return log.statistics;
  }

  /**
   * Get quality trend
   */
  async getQualityTrend(): Promise<Trend> {
    const stats = await this.getStatistics();
    return stats.trends.quality_trend;
  }

  /**
   * Get rules learned from specific SEED
   */
  async getRulesFromSeed(seedId: string): Promise<Rule[]> {
    const log = await this.getLog();
    const allRules: Rule[] = [
      ...log.rules.committed,
      ...log.rules.experimental,
      ...log.rules.candidate,
      ...log.rules.rejected,
      ...log.rules.reverted,
    ];

    return allRules.filter(rule =>
      rule.learned_from.includes(seedId)
    );
  }

  /**
   * Search rules by description
   */
  async searchRules(query: string): Promise<Rule[]> {
    const log = await this.getLog();
    const allRules: Rule[] = [
      ...log.rules.committed,
      ...log.rules.experimental,
      ...log.rules.candidate,
    ];

    const lowerQuery = query.toLowerCase();

    return allRules.filter(rule =>
      rule.name.toLowerCase().includes(lowerQuery) ||
      rule.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get version comparison
   */
  async compareVersions(
    v1: string,
    v2: string
  ): Promise<VersionComparison> {
    const log = await this.getLog();

    const version1 = log.timeline.find(e => e.version === v1);
    const version2 = log.timeline.find(e => e.version === v2);

    if (!version1 || !version2) {
      throw new Error("Version not found");
    }

    const rulesAdded = version2.rules.filter(
      r => !version1.rules.includes(r)
    );
    const rulesRemoved = version1.rules.filter(
      r => !version2.rules.includes(r)
    );

    return {
      version1: v1,
      version2: v2,
      rulesAdded,
      rulesRemoved,
      metricsComparison: {
        qualityDelta: version2.metrics.mean_quality - version1.metrics.mean_quality,
        concernRateDelta: version2.metrics.concern_rate - version1.metrics.concern_rate,
        improvement: version2.metrics.improvement_from_previous,
      },
    };
  }
}
```

---

## Update Operations

API for updating the evolution log.

```typescript
class EvolutionLogUpdater {
  /**
   * Add new version to timeline
   */
  async addVersion(entry: TimelineEntry): Promise<void> {
    const log = await this.loadEvolutionLog();

    log.timeline.push(entry);
    log.current_version = entry.version;
    log.last_updated = new Date().toISOString();

    await this.saveEvolutionLog(log);
  }

  /**
   * Add new rule
   */
  async addRule(
    rule: Rule,
    status: "committed" | "experimental" | "candidate"
  ): Promise<void> {
    const log = await this.loadEvolutionLog();

    log.rules[status].push(rule);
    log.last_updated = new Date().toISOString();

    await this.saveEvolutionLog(log);
  }

  /**
   * Update rule status
   */
  async updateRuleStatus(
    ruleId: string,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    const log = await this.loadEvolutionLog();

    // Find and remove from old status
    const ruleIndex = log.rules[oldStatus].findIndex(
      r => r.rule_id === ruleId
    );

    if (ruleIndex === -1) {
      throw new Error(`Rule ${ruleId} not found in ${oldStatus}`);
    }

    const rule = log.rules[oldStatus][ruleIndex];
    log.rules[oldStatus].splice(ruleIndex, 1);

    // Add to new status
    rule.status = newStatus;
    log.rules[newStatus].push(rule);

    log.last_updated = new Date().toISOString();

    await this.saveEvolutionLog(log);
  }

  /**
   * Update rule performance
   */
  async updateRulePerformance(
    ruleId: string,
    performance: RulePerformance
  ): Promise<void> {
    const log = await this.loadEvolutionLog();

    // Find rule
    const rule = await this.findRuleInLog(log, ruleId);

    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    rule.performance = performance;
    log.last_updated = new Date().toISOString();

    await this.saveEvolutionLog(log);
  }

  /**
   * Add pattern
   */
  async addPattern(pattern: ActivePattern): Promise<void> {
    const log = await this.loadEvolutionLog();

    log.patterns.active.push(pattern);
    log.last_updated = new Date().toISOString();

    await this.saveEvolutionLog(log);
  }

  /**
   * Update statistics
   */
  async updateStatistics(stats: GlobalStatistics): Promise<void> {
    const log = await this.loadEvolutionLog();

    log.statistics = stats;
    log.last_updated = new Date().toISOString();

    await this.saveEvolutionLog(log);
  }

  /**
   * Recompute statistics
   */
  async recomputeStatistics(): Promise<void> {
    const log = await this.loadEvolutionLog();

    // Recompute all statistics from scratch
    const stats = await this.computeStatistics(log);

    await this.updateStatistics(stats);
  }
}
```

---

## Backup and Migration

### Schema Migration

```typescript
interface SchemaMigration {
  from_version: string;
  to_version: string;
  migration_script: string;
  run_at: string;
  status: "success" | "failed";
}

class SchemaManager {
  async migrate(
    log: EvolutionLog,
    fromVersion: string,
    toVersion: string
  ): Promise<EvolutionLog> {
    const migrations = this.getMigrationsPath(fromVersion, toVersion);

    let currentLog = log;

    for (const migration of migrations) {
      currentLog = await this.applyMigration(currentLog, migration);
    }

    currentLog.schema_version = toVersion;

    return currentLog;
  }

  private async applyMigration(
    log: EvolutionLog,
    migration: SchemaMigration
  ): Promise<EvolutionLog> {
    // Load and run migration script
    const migrationFn = await import(migration.migration_script);

    return await migrationFn.default(log);
  }
}
```

### Backup Strategy

```typescript
class EvolutionLogBackup {
  async createBackup(): Promise<string> {
    const log = await this.loadEvolutionLog();

    const backup = {
      ...log,
      backup_metadata: {
        created_at: new Date().toISOString(),
        schema_version: log.schema_version,
        current_version: log.current_version,
      },
    };

    const filename = `evolution_log_backup_${Date.now()}.json`;
    await this.saveToFile(filename, backup);

    return filename;
  }

  async restoreFromBackup(filename: string): Promise<void> {
    const backup = await this.loadFromFile(filename);

    // Validate backup
    if (!this.validateBackup(backup)) {
      throw new Error("Invalid backup file");
    }

    // Check if migration needed
    if (backup.schema_version !== CURRENT_SCHEMA_VERSION) {
      backup = await this.schemaManager.migrate(
        backup,
        backup.schema_version,
        CURRENT_SCHEMA_VERSION
      );
    }

    await this.saveEvolutionLog(backup);
  }
}
```

---

## Summary

This evolution log schema provides:

1. **Comprehensive Tracking**: Every aspect of prompt evolution is recorded
2. **Rich Metadata**: Performance, validation, conflicts, and usage statistics
3. **Query API**: Easy access to historical data and trends
4. **Update Operations**: Structured way to modify the log
5. **Backup/Migration**: Schema versioning and data safety
6. **Auditability**: Complete provenance of every rule and decision

The schema enables:
- Historical analysis of prompt evolution
- Performance tracking over time
- Rule debugging and optimization
- Statistical reporting and dashboards
- Reproducible research
- Regulatory compliance and auditing
