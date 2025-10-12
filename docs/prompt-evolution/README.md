# Prompt Evolution and Learning System for APML

## Overview

This directory contains a complete architectural design for a self-learning prompt evolution system that automatically improves APML LEGO extraction quality over time by learning from failures and successes.

**Vision:** A system that continuously learns from every extraction, automatically identifies patterns, generates rules, validates improvements, and deploys better prompts—creating a self-healing, continuously improving extraction engine.

---

## Documents

### 1. [Architecture](./01-architecture.md)

**Core Design Questions Answered:**
- How do we track which prompt changes improve quality?
- How do we measure "before/after" success rates?
- When do we commit a learned rule to base prompt vs keep it experimental?
- How do we avoid overfitting to specific edge cases?
- How do we handle conflicting rules?

**Key Components:**
- Metric Framework (primary & secondary metrics)
- A/B Testing Framework (randomized, statistically rigorous)
- Rule Lifecycle (Candidate → Experimental → Committed → Stable)
- Overfitting Prevention (cross-validation, generality scoring, holdout sets)
- Conflict Resolution (priority-based, conflict-aware learning)

**Highlights:**
```
Pattern Detection → Rule Generation → A/B Testing →
Commit Decision → Production Monitoring → Stable or Revert
```

### 2. [Version Control System](./02-version-control.md)

**Complete system for managing prompt versions:**

```
prompts/
├── base/
│   └── phase_3/
│       ├── v1.0.0.md (baseline)
│       ├── v1.1.0.md (+ phrasal verbs rule)
│       ├── v1.5.2.md (current production)
│       └── CHANGELOG.md
├── rules/
│   ├── committed/    (R001, R002, ...)
│   ├── experimental/ (E001, E002, ...)
│   ├── candidate/    (C001, C002, ...)
│   └── rejected/     (X001, X002, ...)
├── evolution/
│   ├── evolution_log.json
│   ├── ab_tests/
│   └── metrics/
└── builds/
    ├── v1.5.2/
    │   ├── prompt.md
    │   ├── rules_applied.json
    │   └── validation_report.json
    └── latest -> v1.5.2
```

**Features:**
- Semantic versioning (MAJOR.MINOR.PATCH)
- JSON rule schema with full metadata
- Automated build process
- Git integration (branches, tags, workflow)
- Version comparison tools
- Backup and recovery

### 3. [Learning Algorithm](./03-learning-algorithm.md)

**Complete end-to-end learning pipeline:**

**Stage 1: Pattern Detection**
- Aggregate concerns across SEEDs
- Extract linguistic, semantic, and structural patterns
- Validate patterns (frequency, confidence, generalizability)

**Stage 2: Rule Generation**
- Synthesize rules from validated patterns
- Determine category and priority
- Generate conditions, actions, and examples
- Validate rule quality

**Stage 3: Experimental Testing**
- A/B test setup with randomized assignment
- Statistical analysis (t-test, effect size, Bayesian probability)
- Decision criteria (adopt, reject, continue)
- Sample size calculation

**Stage 4: Commit Decision**
- Evaluate promotion criteria (all must pass)
- Calculate generality score
- Detect conflicts
- Holdout validation

**Stage 5: Production Monitoring**
- 30-day observation period
- Daily regression checks
- Automatic reversion if quality degrades
- Promotion to stable status

**Key Code:**
```typescript
class LearningOrchestrator {
  async runLearningCycle() {
    const patterns = await this.detectPatterns();
    const rules = await this.generateRules(patterns);
    await this.testRules(rules);
    await this.promoteBestRules();
    await this.monitorProduction();
  }
}
```

### 4. [Evolution Log Schema](./04-evolution-log-schema.md)

**Comprehensive schema for tracking everything:**

```typescript
interface EvolutionLog {
  timeline: TimelineEntry[];        // Chronological version history
  rules: RuleRegistry;              // All rules (committed, experimental, etc.)
  patterns: PatternRegistry;        // Detected patterns
  statistics: GlobalStatistics;     // System-wide metrics
  configuration: SystemConfiguration;
}
```

**Features:**
- Complete rule lifecycle tracking
- Performance metrics per rule
- Generality scores
- A/B test results
- Pattern provenance
- Trend analysis
- Query and update APIs

**Example Query:**
```typescript
const topRules = await evolutionLog.getTopRules(10);
const qualityTrend = await evolutionLog.getQualityTrend();
const rulesFromSeed = await evolutionLog.getRulesFromSeed("C0012");
```

### 5. [Prompt Injection Strategy](./05-prompt-injection-strategy.md)

**Five strategies for injecting learned rules:**

**Strategy 1: Markdown Append** (75-85% compliance)
- Append rules as markdown sections
- Simple, readable, maintainable
- Good for <10 rules

**Strategy 2: JSON Rules** (80-90% compliance)
- Structured JSON format
- Explicit priorities
- Machine-parseable

**Strategy 3: Few-Shot Examples** (70-85% compliance)
- Show successful extractions
- Let agent learn patterns
- Flexible, generalizable

**Strategy 4: Hybrid** (85-95% compliance) ⭐ **Recommended**
- Rules + Examples + Meta-learning
- Best balance of compliance and flexibility
- Evidence-based approach

**Strategy 5: Chaining** (90-95% compliance)
- Multiple validation steps
- Self-correcting
- Highest quality but slowest

**Recommendation:** Use **Hybrid** for production, with adaptive selection based on SEED complexity.

### 6. [Approach Comparison](./06-approach-comparison.md)

**Three fundamentally different approaches:**

#### Approach A: Rule-Based Accumulation
- Explicit rules added to prompt
- High predictability and explainability
- Best for: Regulated industries, <20 rules, clear patterns
- Compliance: 85% | Quality: +0.85 | Tokens: 150/rule

#### Approach B: Example-Based Learning
- Show successful examples
- High flexibility and generalization
- Best for: Creative tasks, hard-to-articulate patterns
- Compliance: 78% | Quality: +0.65 | Tokens: 80/example

#### Approach C: Hybrid Meta-Learning ⭐ **Recommended for APML**
- Rules + Examples + Meta-principles + Process
- Highest quality and robustness
- Best for: Production systems, complex domains
- Compliance: 92% | Quality: +1.05 | Tokens: 2500 total

**Recommendation for APML:**
1. **Phase 1 (Months 1-2)**: Start with Approach A (Rule-Based)
2. **Phase 2 (Months 3-4)**: Transition to Approach C Lite (Hybrid Lite)
3. **Phase 3 (Months 5-6)**: Full Approach C (Hybrid Deep)
4. **Long-term (6+ months)**: Adaptive Hybrid (optimize tokens)

---

## Quick Start

### 1. Understand the System

Read documents in order:
1. Architecture (understand the big picture)
2. Version Control (understand how it's organized)
3. Learning Algorithm (understand how it learns)
4. Evolution Log (understand what's tracked)
5. Injection Strategy (understand how rules are used)
6. Approach Comparison (understand tradeoffs)

### 2. Set Up Infrastructure

```bash
# Create directory structure
./scripts/setup_prompt_evolution.sh

# Initialize evolution log
./scripts/init_evolution_log.sh

# Set up database
./scripts/setup_database.sh
```

### 3. Start Learning

```typescript
// Start the learning orchestrator
import { LearningOrchestrator } from './learning-orchestrator';

const orchestrator = new LearningOrchestrator({
  mode: 'production',
  autoCommit: false,  // Require human approval initially
  observationPeriodDays: 30,
});

await orchestrator.start();
```

### 4. Monitor Progress

```bash
# View dashboard
npm run evolution:dashboard

# Check current version
npm run evolution:version

# View active experiments
npm run evolution:experiments

# Compare versions
npm run evolution:compare v1.5.0 v1.5.2
```

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXTRACTION PIPELINE                           │
│  User → SEED → Agent → LEGOs → Quality Assessment → Feedback    │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                   PATTERN DETECTION ENGINE                       │
│  • Aggregate concerns                                            │
│  • Identify patterns (linguistic, semantic, structural)          │
│  • Validate patterns (frequency ≥5, confidence >0.70)           │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    RULE GENERATION ENGINE                        │
│  • Synthesize rules from patterns                                │
│  • Generate conditions, actions, examples                        │
│  • Validate rule quality                                         │
│  • Assign category and priority                                  │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                      A/B TESTING ENGINE                          │
│  • Randomized assignment (50/50 split)                           │
│  • Collect samples (target: 50-200 per group)                   │
│  • Statistical analysis (t-test, effect size, Bayesian)          │
│  • Decision: Adopt | Reject | Continue                           │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                   COMMIT DECISION ENGINE                         │
│  • Check all promotion criteria                                  │
│  • Calculate generality score                                    │
│  • Detect conflicts with existing rules                          │
│  • Validate on holdout set                                       │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  PRODUCTION MONITORING                           │
│  • 30-day observation period                                     │
│  • Daily regression checks                                       │
│  • Conflict detection                                            │
│  • Automatic reversion if quality degrades                       │
│  • Promotion to stable                                           │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                   PROMPT VERSION CONTROL                         │
│  • Semantic versioning                                           │
│  • Git integration                                               │
│  • Build and deployment                                          │
│  • Rollback capability                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Metrics

### Quality Metrics

- **Mean Quality Score**: Target >8.0/10
- **P95 Quality**: Target >9.0/10
- **Concern Rate**: Target <5%
- **Human Agreement**: Target >90%

### Learning Metrics

- **Patterns Detected**: Track over time
- **Rules Generated**: Track candidate → committed conversion rate
- **Success Rate**: committed / (committed + rejected), target >50%
- **Time to Commit**: Average days from candidate → committed, target <7 days
- **Improvement per Rule**: Average quality gain per rule, target >0.5 points

### Efficiency Metrics

- **Token Usage**: Track per extraction
- **Processing Time**: Track P95, target <3s
- **Cost per Improvement**: Track ROI
- **Automation Rate**: % of promotions without human intervention

---

## Safety Mechanisms

### 1. Statistical Rigor

- A/B testing with proper sample sizes
- Multiple statistical tests (t-test, effect size, Bayesian)
- Confidence intervals
- Early stopping rules

### 2. Overfitting Prevention

- Cross-validation across SEED types
- Generality score (breadth, consistency, magnitude)
- Holdout validation set (20% of data)
- Applicability rate threshold (>3%)

### 3. Conflict Management

- Automatic conflict detection
- Priority-based resolution
- Conflict-aware rule generation
- Runtime conflict monitoring

### 4. Production Safeguards

- 30-day observation period
- Daily regression checks
- Automatic reversion on quality drop
- Human approval for critical rules
- Gradual rollout (10% → 50% → 100%)

### 5. Rollback Capability

- Version control with Git
- Instant rollback to previous version
- Automated backups
- Recovery procedures

---

## Monitoring Dashboard

```
╔═══════════════════════════════════════════════════════════╗
║              PROMPT EVOLUTION DASHBOARD                    ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  Current Version: v1.5.2                                  ║
║  Committed Rules: 12                                      ║
║  Experimental Rules: 2 (testing)                          ║
║  Candidate Rules: 3 (pending validation)                  ║
║                                                            ║
║  Quality Score: 8.2/10  (↑ 0.8 from baseline)           ║
║  Concern Rate: 3.2%     (↓ 65% from baseline)           ║
║  Success Rate: 54%      (7/13 rules committed)           ║
║                                                            ║
╠═══════════════════════════════════════════════════════════╣
║  ACTIVE EXPERIMENTS                                        ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  E001: keep_time_expressions                              ║
║    Progress: ████████████░░░░ 90% (45/50)                ║
║    Quality: 8.4 vs 8.2 (control) [p=0.08]                ║
║    Decision: Need 5 more samples                          ║
║                                                            ║
║  E002: preserve_question_intonation                       ║
║    Progress: ████████░░░░░░░░ 64% (32/50)                ║
║    Quality: 8.5 vs 8.2 (control) [p=0.02] ✓              ║
║    Decision: Looking good! Continue testing               ║
║                                                            ║
╠═══════════════════════════════════════════════════════════╣
║  QUALITY TREND                                             ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  9.0│                                             ●        ║
║  8.5│                                    ●      ●          ║
║  8.0│                          ●      ●                   ║
║  7.5│                 ●      ●                             ║
║  7.0│        ●      ●                                      ║
║     └─────┴─────┴─────┴─────┴─────┴─────┴─────┴────────  ║
║     v1.0  v1.1  v1.2  v1.3  v1.4  v1.5  v1.6  (target)   ║
║                                                            ║
║  Trend: ↑ Improving (+0.15 per month)                    ║
║  Projection: Reach 9.0 target in 5.3 months              ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝
```

---

## Configuration

### Thresholds

```typescript
{
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
  },
  "overfitting": {
    "min_generality_score": 0.60,
    "max_holdout_degradation": 0.10,
    "min_applicability_rate": 0.03
  },
  "observation": {
    "observation_period_days": 30,
    "critical_regression_threshold": -0.5,
    "moderate_regression_threshold": -0.3
  }
}
```

### Feature Flags

```typescript
{
  "pattern_detection_enabled": true,
  "rule_generation_enabled": true,
  "ab_testing_enabled": true,
  "auto_commit_enabled": false,  // Require human approval
  "production_monitoring_enabled": true,
  "auto_revert_enabled": true
}
```

---

## Future Enhancements

### Phase 1 (Months 1-3)
- [ ] Implement basic pattern detection
- [ ] Set up A/B testing infrastructure
- [ ] Create evolution log database
- [ ] Build monitoring dashboard
- [ ] Deploy first 5 rules

### Phase 2 (Months 4-6)
- [ ] Implement generality scoring
- [ ] Add conflict detection
- [ ] Create holdout validation
- [ ] Implement adaptive injection
- [ ] Optimize token usage

### Phase 3 (Months 7-12)
- [ ] Multi-model ensemble
- [ ] Reinforcement learning from user feedback
- [ ] Automated rule refinement
- [ ] Cross-language rule transfer
- [ ] Advanced conflict resolution

### Long-term (12+ months)
- [ ] Neural rule synthesis (end-to-end learning)
- [ ] User-specific prompt customization
- [ ] Real-time learning (no A/B testing delay)
- [ ] Federated learning across deployments
- [ ] Explanation generation for rules

---

## Contributing

### Adding a New Rule Manually

```bash
# 1. Create rule file
cat > rules/candidate/C099_my_new_rule.json <<EOF
{
  "id": "C099",
  "name": "My New Rule",
  "description": "...",
  ...
}
EOF

# 2. Validate rule
npm run evolution:validate-rule C099

# 3. Promote to experimental
npm run evolution:promote C099 experimental

# 4. Start A/B test
npm run evolution:ab-test C099

# 5. Monitor results
npm run evolution:test-status C099
```

### Modifying the Learning Algorithm

1. Update relevant module in `src/learning/`
2. Add tests in `tests/learning/`
3. Run full test suite: `npm test`
4. Update documentation
5. Create PR with benchmark results

---

## References

- [Scientific A/B Testing](https://en.wikipedia.org/wiki/A/B_testing)
- [Cohen's d Effect Size](https://en.wikipedia.org/wiki/Effect_size#Cohen's_d)
- [Bayesian A/B Testing](https://www.evanmiller.org/bayesian-ab-testing.html)
- [Semantic Versioning](https://semver.org/)
- [Few-Shot Learning](https://arxiv.org/abs/2005.14165)
- [Prompt Engineering Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)

---

## License

Copyright 2025 SSi Language Learning Platform

---

## Contact

For questions or support:
- Documentation: This directory
- Issues: GitHub Issues
- Team: @apml-team

---

**Version**: 1.0.0
**Last Updated**: 2025-10-11
**Status**: Design Complete, Ready for Implementation
