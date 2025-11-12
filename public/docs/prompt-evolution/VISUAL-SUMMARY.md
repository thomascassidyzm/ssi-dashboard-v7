# Visual Summary: Prompt Evolution System

## System at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                    SELF-LEARNING SYSTEM                      │
│                                                              │
│  Extraction → Feedback → Learning → Testing → Deployment   │
│                      ↑                          ↓           │
│                      └──────── Monitoring ──────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## The Big Idea

**Every extraction teaches the system.**

1. User extracts LEGOs from a SEED
2. If quality is low, system flags concern
3. System detects patterns across concerns
4. System generates candidate rule
5. System tests rule via A/B testing
6. If successful, rule is committed to prompt
7. System monitors rule performance
8. If quality improves, keep rule; if not, revert

**Result**: Prompt gets better over time, automatically.

---

## Data Flow

```
                    ┌─────────────┐
                    │   User      │
                    └──────┬──────┘
                           ↓
                    ┌─────────────┐
                    │   SEED      │
                    │  "I go to"  │
                    └──────┬──────┘
                           ↓
              ┌────────────────────────┐
              │  Extraction Agent      │
              │  (with prompt v1.5.2)  │
              └────────┬───────────────┘
                       ↓
              ┌────────────────────┐
              │  LEGOs + Quality   │
              │  ["I", "go", "to"] │
              │  Quality: 6.5/10   │ ← LOW QUALITY!
              └────────┬───────────┘
                       ↓
         ┌─────────────────────────────┐
         │  Pattern Detector           │
         │  "Phrasal verbs being split"│
         └─────────┬───────────────────┘
                   ↓
         ┌─────────────────────────────┐
         │  Rule Generator             │
         │  "Keep phrasal verbs intact"│
         └─────────┬───────────────────┘
                   ↓
         ┌─────────────────────────────┐
         │  A/B Tester                 │
         │  Test new rule vs baseline  │
         └─────────┬───────────────────┘
                   ↓
         ┌─────────────────────────────┐
         │  Statistical Analysis       │
         │  Quality: 7.8 vs 7.1        │
         │  p-value: 0.003 ✓          │
         └─────────┬───────────────────┘
                   ↓
         ┌─────────────────────────────┐
         │  Commit Rule                │
         │  Prompt v1.6.0 released     │
         └─────────┬───────────────────┘
                   ↓
         ┌─────────────────────────────┐
         │  Production Monitoring      │
         │  30-day observation         │
         └─────────┬───────────────────┘
                   ↓
         ┌─────────────────────────────┐
         │  Stable or Revert           │
         │  Quality maintained? Keep!  │
         └─────────────────────────────┘
```

---

## Rule Lifecycle

```
┌──────────────┐
│  CONCERN     │  "I go to" split incorrectly (5+ times)
└──────┬───────┘
       ↓
┌──────────────┐
│  CANDIDATE   │  Generate rule: "Keep phrasal verbs together"
└──────┬───────┘
       ↓
┌──────────────┐
│ EXPERIMENTAL │  A/B test: 50 samples control, 50 experimental
└──────┬───────┘
       ↓
   ┌───┴────┐
   ↓        ↓
┌────────┐ ┌──────────┐
│COMMITTED│ │ REJECTED │  Quality improved? → Commit
└────┬───┘ └──────────┘  No improvement? → Reject
     ↓
┌──────────────┐
│    REVIEW    │  30-day observation period
└──────┬───────┘
       ↓
   ┌───┴────┐
   ↓        ↓
┌────────┐ ┌──────────┐
│  STABLE  │ │ REVERTED │  Quality maintained? → Stable
└────────┘ └──────────┘  Quality degraded? → Revert

Time: ~7-45 days from Candidate → Stable
```

---

## Quality Evolution

```
Quality Score
    ↑
10.0│                                             ⭐ Target
    │
 9.0│                                       ●
    │                                    ●
 8.5│                               ●
    │                          ●
 8.0│                     ●          R003
    │                ●               committed
 7.5│           ●    R002
    │      ●   R001  committed
 7.0│  ●  committed
    │●
    └─────┴─────┴─────┴─────┴─────┴─────┴─────┴───→ Time
    v1.0  v1.1  v1.2  v1.3  v1.4  v1.5  v1.6  v2.0

    Each version adds learned rules
    Quality improves stepwise
    Target: 9.0+ average quality
```

---

## Three Approaches Compared

### Approach A: Rule-Based

```
Base Prompt
    ↓
  Rule 1: Keep phrasal verbs together
  Rule 2: Handle contractions
  Rule 3: Preserve time expressions
  ...
    ↓
  Extract LEGOs

Pros: Explicit, debuggable, predictable
Cons: Verbose, can become unwieldy
Best for: <20 rules, clear patterns
```

### Approach B: Example-Based

```
Base Prompt
    ↓
  Example 1: "I go to" → ["I", "go to"]
  Example 2: "I'm happy" → ["I'm", "happy"]
  Example 3: "At 3 o'clock" → ["At 3 o'clock"]
  ...
    ↓
  Extract LEGOs (following patterns)

Pros: Flexible, natural learning
Cons: Unpredictable, hard to debug
Best for: Hard-to-articulate patterns
```

### Approach C: Hybrid (Recommended)

```
Base Prompt
    ↓
  Meta-Principles
    ↓
  Learned Rules (priority-ordered)
    ↓
  Reference Examples
    ↓
  Reasoning Process
    ↓
  Extract LEGOs

Pros: Best quality, robust, balanced
Cons: More complex, uses more tokens
Best for: Production systems
```

---

## System Components

```
┌──────────────────────────────────────────────────────┐
│                 USER INTERFACE                        │
│  • Dashboard                                          │
│  • Metrics visualization                              │
│  • Rule browser                                       │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────┐
│                 API LAYER                             │
│  • Evolution queries                                  │
│  • Version management                                 │
│  • Rule CRUD                                          │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────┐
│              ORCHESTRATOR                             │
│  • Coordinates all components                         │
│  • Runs learning cycles                               │
│  • Makes promotion decisions                          │
└────────────────┬─────────────────────────────────────┘
                 ↓
      ┌──────────┴──────────┐
      ↓                     ↓
┌──────────────┐    ┌──────────────┐
│   Pattern    │    │   A/B Test   │
│   Detector   │    │   Manager    │
└──────────────┘    └──────────────┘
      ↓                     ↓
┌──────────────┐    ┌──────────────┐
│     Rule     │    │  Statistical │
│  Generator   │    │   Analyzer   │
└──────────────┘    └──────────────┘
      ↓                     ↓
┌──────────────┐    ┌──────────────┐
│     Rule     │    │  Production  │
│   Promoter   │    │   Monitor    │
└──────────────┘    └──────────────┘
      ↓                     ↓
┌──────────────────────────────────┐
│      VERSION CONTROL             │
│  • Git integration               │
│  • Semantic versioning           │
│  • Rollback capability           │
└──────────────┬───────────────────┘
               ↓
┌──────────────────────────────────┐
│      STORAGE LAYER               │
│  • Evolution log (JSON)          │
│  • Metrics database (PostgreSQL) │
│  • Rule files (Git)              │
└──────────────────────────────────┘
```

---

## A/B Testing Process

```
New Rule Generated
        ↓
  ┌─────────────┐
  │ Create Test │
  │ Target: 50  │
  │ samples/grp │
  └──────┬──────┘
         ↓
    ┌────────────────┐
    │  Randomization │
    │  50% Control   │
    │  50% Exp       │
    └────┬───────────┘
         ↓
    ┌────────────────┐
    │ Collect Data   │
    │ 10, 20, 30...  │
    │ samples        │
    └────┬───────────┘
         ↓
    ┌────────────────┐
    │ Statistical    │
    │ Analysis       │
    │ • t-test       │
    │ • Effect size  │
    │ • Bayesian     │
    └────┬───────────┘
         ↓
    ┌────────────────┐
    │   Decision     │
    │ ADOPT/REJECT/  │
    │ CONTINUE       │
    └────┬───────────┘
         ↓
    ┌────┴─────┐
    ↓          ↓
┌────────┐  ┌──────┐
│ COMMIT │  │REJECT│
└────────┘  └──────┘
    ↓
┌────────────────┐
│   Observe      │
│   30 days      │
└────┬───────────┘
     ↓
┌─────────────┐
│   STABLE    │
└─────────────┘
```

---

## Overfitting Prevention

```
                New Rule
                    ↓
         ┌──────────────────┐
         │ Test on Diverse  │
         │   SEED Types     │
         │                  │
         │ • Short/Long     │
         │ • Simple/Complex │
         │ • Conversation/  │
         │   Description    │
         └────────┬─────────┘
                  ↓
         ┌──────────────────┐
         │ Calculate        │
         │ Generality Score │
         │                  │
         │ Breadth:    0.87 │
         │ Consistency:0.91 │
         │ Magnitude:  0.68 │
         │ Overall:    0.82 │← Must be >0.60
         └────────┬─────────┘
                  ↓
         ┌──────────────────┐
         │ Holdout          │
         │ Validation       │
         │                  │
         │ Training: 8.2    │
         │ Holdout:  8.1    │← Degradation <10%
         └────────┬─────────┘
                  ↓
         ┌──────────────────┐
         │ Applicability    │
         │ Check            │
         │                  │
         │ Applies to 8.5%  │← Must be >3%
         │ of SEEDs         │
         └────────┬─────────┘
                  ↓
            All Pass?
         ┌────┴────┐
         ↓         ↓
      ✓ YES     ✗ NO
    Accept    Reject
```

---

## Conflict Resolution

```
        New Rule (R005)
              ↓
    ┌──────────────────┐
    │ Compare with     │
    │ Existing Rules   │
    └────────┬─────────┘
             ↓
    ┌──────────────────┐
    │ Test on 100      │
    │ Sample SEEDs     │
    └────────┬─────────┘
             ↓
    Does it conflict?
         ┌────┴────┐
         ↓         ↓
      No Conflict  Conflict!
         ↓         ↓
      Accept    ┌──────────────┐
                │ Assess       │
                │ Severity     │
                └────┬─────────┘
                     ↓
              ┌──────┴───────┐
              ↓              ↓
         Critical      Moderate/Minor
              ↓              ↓
         Reject        ┌──────────────┐
                       │ Priority     │
                       │ Resolution   │
                       └────┬─────────┘
                            ↓
                       ┌──────────────┐
                       │ Higher       │
                       │ Priority     │
                       │ Wins         │
                       └──────────────┘
```

---

## Metrics Dashboard Layout

```
┌────────────────────────────────────────────────────────┐
│                  EVOLUTION DASHBOARD                    │
├────────────────────────────────────────────────────────┤
│                                                         │
│  Version: v1.5.2   Rules: 12   Quality: 8.2/10        │
│                                                         │
├────────────────────────────────────────────────────────┤
│  Quality Trend                                          │
│  ┌──────────────────────────────────────────────────┐ │
│  │  9.0│                                      ●      │ │
│  │  8.5│                                 ●           │ │
│  │  8.0│                           ●                 │ │
│  │  7.5│                     ●                       │ │
│  │  7.0│               ●                             │ │
│  │      └───┴───┴───┴───┴───┴───┴───┴───┴──→       │ │
│  └──────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│  Active Experiments (2)                                 │
│  ┌──────────────────────────────────────────────────┐ │
│  │ E001: keep_time_expressions                      │ │
│  │ Progress: ████████████░░░░ 90%                   │ │
│  │ Quality: 8.4 vs 8.2 (p=0.08)                    │ │
│  └──────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────┐ │
│  │ E002: preserve_question_intonation               │ │
│  │ Progress: ████████░░░░░░░░ 64%                   │ │
│  │ Quality: 8.5 vs 8.2 (p=0.02) ✓                  │ │
│  └──────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│  Recent Commits                                         │
│  • v1.5.2 (2h ago)  - R012: keep_phrasal_verbs        │
│  • v1.5.1 (1d ago)  - R011: handle_contractions       │
│  • v1.5.0 (3d ago)  - R010: time_expressions          │
└────────────────────────────────────────────────────────┘
```

---

## Timeline Example

```
October 2025
    ↓
  Day 1: System detects "phrasal verbs being split" pattern
         (observed in C0012, C0034, C0089, C0103, C0156)
    ↓
  Day 2: Generate candidate rule C001
         "Keep phrasal verbs together"
    ↓
  Day 3: Validate rule, promote to experimental E001
    ↓
  Day 3-7: A/B test (collect 50 samples per group)
         Control: 7.12 quality
         Experimental: 7.89 quality
         p-value: 0.003 ✓
    ↓
  Day 8: Statistical analysis passes all criteria
         Promote to committed R001
         Release prompt v1.1.0
    ↓
  Day 9-38: 30-day observation period
         Daily quality checks
         No regressions detected
    ↓
  Day 39: Promote to stable status
         Rule R001 is now permanent
    ↓
  Ongoing: R001 applies to ~850 extractions
           98.3% success rate
           +12% quality improvement
```

---

## Quick Reference

### Key Thresholds

| Metric | Threshold | Purpose |
|--------|-----------|---------|
| Pattern Frequency | ≥5 occurrences | Trigger rule generation |
| Pattern Confidence | >0.70 | Pattern is significant |
| A/B Test p-value | <0.05 | Statistical significance |
| Effect Size | >0.2 | Meaningful improvement |
| Bayesian Confidence | >0.95 | High certainty of improvement |
| Win Rate | >0.60 | Experimental wins majority |
| Generality Score | >0.60 | Rule generalizes well |
| Holdout Degradation | <10% | Not overfitted |

### Status Lifecycle

```
CANDIDATE → EXPERIMENTAL → COMMITTED → STABLE
                    ↓           ↓
                REJECTED    REVERTED
```

### Version Numbering

```
v1.5.2
│ │ │
│ │ └─ PATCH:  Bug fixes, minor refinements
│ └─── MINOR:  New rules added
└───── MAJOR:  Breaking changes, major rewrites
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-4)
✓ Infrastructure setup
✓ Core modules
✓ A/B testing framework
✓ Basic integration

### Phase 2: Production (Weeks 5-8)
✓ Prompt injection
✓ Monitoring dashboard
✓ Production integration
✓ Deployment

### Phase 3: Optimization (Weeks 9-12)
✓ Performance tuning
✓ Advanced features
✓ Testing and refinement

---

## Success Criteria

After 6 months:

- [ ] Quality: >8.5/10 average (baseline: 7.1)
- [ ] Concern Rate: <3% (baseline: 8.9%)
- [ ] Rules Learned: 15-20 committed rules
- [ ] Success Rate: >60% (committed/tested)
- [ ] Automation: >80% rules auto-promoted
- [ ] Stability: Zero reverts in last 30 days

---

## The Vision

**A prompt that teaches itself.**

Every extraction is a learning opportunity. Patterns emerge. Rules crystallize. Quality improves. The system becomes smarter with every SEED processed.

This is not just prompt engineering—it's **prompt evolution**.

---

**Complete Documentation:**

1. [Architecture](./01-architecture.md) - System design and decisions
2. [Version Control](./02-version-control.md) - Managing prompt versions
3. [Learning Algorithm](./03-learning-algorithm.md) - How learning works
4. [Evolution Log](./04-evolution-log-schema.md) - What we track
5. [Injection Strategy](./05-prompt-injection-strategy.md) - How rules are used
6. [Approach Comparison](./06-approach-comparison.md) - Which approach to choose
7. [README](./README.md) - Quick start guide
8. [Implementation](./IMPLEMENTATION.md) - Step-by-step implementation

---

**Status**: Ready for Implementation
**Version**: 1.0.0
**Date**: 2025-10-11
