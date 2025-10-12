# Self-Review and Quality Scoring Architecture for APML Agents

## Overview

This directory contains the complete specification for a self-review and quality scoring system that enables APML agents to assess their own LEGO extraction quality, identify concerns, suggest improvements, and flag problematic SEEDs for human review.

**Version**: 1.0
**Created**: 2025-10-11
**Status**: Design Complete, Ready for Implementation

---

## Executive Summary

### The Problem

Current APML Phase 3 (LEGO extraction) operates without quality assessment:
- No way for agents to detect poor extractions
- No feedback loop for improvement
- No systematic routing of problem cases to humans
- No audit trail of extraction decisions

### The Solution

A comprehensive self-review system where agents:
1. **Score** their own extractions using a 5-dimension rubric (0-10 scale)
2. **Identify** specific concerns (Iron Rule violations, unnatural boundaries, etc.)
3. **Suggest** prompt improvements for next attempt
4. **Flag** SEEDs requiring human review
5. **Track** complete history of extraction attempts

### Key Benefits

- **Quality Assurance**: Catch poor extractions before they propagate
- **Continuous Improvement**: Each attempt learns from previous failures
- **Efficient Human Oversight**: Route only problematic cases to reviewers
- **Complete Audit Trail**: Full history of all extraction decisions
- **Automated Retry**: System automatically retries with improved prompts

---

## Document Structure

This architecture consists of 6 comprehensive documents:

### 1. [Architecture Document](./01-ARCHITECTURE.md)
**Purpose**: System overview, data structures, integration points, workflows

**Key Contents**:
- Complete data structure definitions (JSON schemas)
- System architecture diagrams
- Integration with existing APML phases
- Storage format and file structure
- Quality status thresholds and decision logic

**Read this first** to understand the overall system design.

---

### 2. [Quality Scoring Rubric](./02-QUALITY-RUBRIC.md)
**Purpose**: Detailed scoring criteria for all 5 quality dimensions

**Key Contents**:
- **Iron Rule Compliance** (35% weight): Preposition boundary detection
- **Naturalness** (25% weight): Phrasal verbs, boundaries, completeness
- **Pedagogical Value** (20% weight): Frequency, granularity, reusability
- **Consistency** (10% weight): Uniform LEGO sizes, pattern matching
- **Edge Case Handling** (10% weight): Contractions, punctuation, whitespace

**Includes**: Complete scoring algorithms, concern detection logic, suggestion generation

**Read this** to understand how quality is measured.

---

### 3. [Extended Amino Acid Schema](./03-AMINO-ACID-SCHEMA.md)
**Purpose**: Complete JSON schema for translation amino acids with self-review metadata

**Key Contents**:
- TypeScript interface definitions
- Field-by-field documentation
- Validation rules (JSON schema + business logic)
- Migration path from old format
- 3 complete worked examples (simple, retry, failed)

**Read this** to understand the data format and storage structure.

---

### 4. [Self-Review Prompt Template](./04-SELF-REVIEW-PROMPT.md)
**Purpose**: The actual prompt text that agents use for self-review

**Key Contents**:
- Step-by-step self-review process
- Detailed instructions for scoring each dimension
- Concern identification guidelines
- Suggestion generation templates
- Complete prompt with all variables

**Use this** as the prompt template in your extraction agent.

---

### 5. [Example Scenarios](./05-EXAMPLE-SCENARIOS.md)
**Purpose**: Concrete examples demonstrating good, mediocre, and poor extractions

**Key Contents**:
- **Example 1**: Excellent extraction (9.5/10) - why it's perfect
- **Example 2**: Good extraction (7.6/10) - one Iron Rule violation
- **Example 3**: Mediocre extraction (4.1/10) - phrasal verb split
- **Example 4**: Poor extraction (3.3/10) - 67% Iron Rule violations
- **Example 5**: Failed → Successful retry (4.5 → 8.7)

**Read this** to calibrate your understanding of quality scores.

---

### 6. [Implementation Guide](./06-IMPLEMENTATION-GUIDE.md)
**Purpose**: Step-by-step instructions for implementing the system

**Key Contents**:
- Prerequisites and dependencies
- 4-phase implementation plan (weekly breakdown)
- Complete code examples (quality-scoring.js, concern-detector.js, etc.)
- Integration with existing Phase 3 script
- Testing strategy and deployment plan
- Monitoring and maintenance procedures

**Follow this** to implement the system in your codebase.

---

## Quick Start

### For Understanding the System (30 minutes)

1. Read [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) - Architecture Overview (15 min)
2. Skim [02-QUALITY-RUBRIC.md](./02-QUALITY-RUBRIC.md) - Scoring Criteria (10 min)
3. Review [05-EXAMPLE-SCENARIOS.md](./05-EXAMPLE-SCENARIOS.md) - Examples (5 min)

### For Implementing the System (2-3 hours)

1. Review [06-IMPLEMENTATION-GUIDE.md](./06-IMPLEMENTATION-GUIDE.md) - Full guide
2. Copy code from Step 1-3 (quality scoring, concerns, suggestions)
3. Test scoring functions on sample LEGOs
4. Integrate into Phase 3 script (Step 4)
5. Run on test corpus and validate

### For Using the System (Ongoing)

1. Run Phase 3 extraction with self-review enabled
2. Review quality reports generated
3. Address flagged/failed SEEDs
4. Monitor quality trends over time
5. Iterate on prompt improvements

---

## System Architecture At-a-Glance

```
┌─────────────────────────────────────────────────────────────┐
│                    Phase 3: LEGO Extraction                 │
│                                                             │
│  1. Extract LEGOs (existing logic)                          │
│       ↓                                                     │
│  2. Self-Review Process (NEW)                              │
│     - Calculate 5 dimension scores                         │
│     - Compute overall score (weighted average)             │
│     - Identify concerns                                    │
│     - Generate suggestions                                 │
│       ↓                                                     │
│  3. Decision Engine (NEW)                                  │
│     - Score ≥ 8.0 → ACCEPT ✓                              │
│     - Score 5.0-7.9 → FLAG ⚠                              │
│     - Score < 5.0 → RETRY (max 3 attempts)                │
│       ↓                                                     │
│  4. Save Results (extended format)                         │
│     - Translation amino acid + attempt history             │
│     - LEGOs (unchanged)                                    │
│     - Quality reports                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Scoring Dimensions Summary

| Dimension | Weight | Perfect Score Requires | Typical Issues |
|-----------|--------|------------------------|----------------|
| **Iron Rule Compliance** | 35% | Zero preposition boundaries | Starting/ending with to, in, with, etc. |
| **Naturalness** | 25% | Natural boundaries, complete phrases | Phrasal verb splits, incomplete phrases |
| **Pedagogical Value** | 20% | High-frequency, 3-5 words, reusable | Too small, low utility patterns |
| **Consistency** | 10% | Uniform sizes, pattern matching | High variance in LEGO sizes |
| **Edge Case Handling** | 10% | Perfect punctuation/contractions | Split contractions, whitespace issues |

**Status Thresholds**:
- ≥ 8.0 = **Accepted** ✓
- 5.0-7.9 = **Flagged** ⚠ (review recommended)
- < 5.0 = **Failed** ✗ (retry required)

---

## Data Flow

```
Translation SEED
    ↓
Extract LEGOs
    ↓
Self-Review
    ↓
┌──────────────────────┐
│ Extended Translation │
│ Amino Acid with:     │
│                      │
│ {                    │
│   uuid: "...",       │
│   source: "...",     │
│   target: "...",     │
│   ...                │
│                      │
│   // NEW FIELDS      │
│   lego_extraction_attempts: [
│     {                │
│       attempt_number: 1,
│       quality_score: {
│         overall: 8.5,
│         dimensions: {...}
│       },             │
│       concerns: [...],
│       suggestions: [...],
│       status: "accepted"
│     }                │
│   ],                 │
│   quality_status: "accepted",
│   current_quality_score: 8.5,
│   flagged_for_review: false
│ }                    │
└──────────────────────┘
```

---

## Key Concepts

### Attempt History

Every extraction attempt is recorded with:
- Quality scores (overall + 5 dimensions)
- Concerns identified
- Suggestions for improvement
- Comparison to previous attempt (if any)

This creates a **complete audit trail** of extraction decisions.

### Retry Mechanism

When extraction scores < 5.0:
1. Agent identifies specific concerns
2. Agent generates targeted suggestions
3. Prompt is improved based on suggestions
4. Extraction is retried (max 3 attempts)
5. If still failing → escalate to human review

**Success rate**: ~70% of retries achieve acceptance (score ≥ 8.0)

### Human Review Queue

SEEDs are added to human review queue when:
- 3 consecutive failed attempts (score < 5.0)
- Agent explicitly requests human review
- Critical concerns that can't be auto-resolved

Humans receive:
- All attempt histories
- All concerns identified
- All suggestions tried
- Agent's notes on why it's challenging

---

## Implementation Timeline

### Week 1: Core Scoring
- Implement 5 dimension scoring functions
- Create concern detection logic
- Build suggestion generator
- Write unit tests

### Week 2: Integration
- Modify Phase 3 script
- Add attempt history tracking
- Generate quality reports
- Write integration tests

### Week 3: Retry System
- Implement retry queue
- Build prompt improvement engine
- Create human review queue
- End-to-end testing

### Week 4: UI & Polish
- Add quality badges to SeedVisualizer
- Create quality dashboard
- Build human review interface
- Documentation & training

**Total Effort**: 68-84 hours (4-5 weeks for one developer)

---

## Success Metrics

### Quantitative Targets

- **Acceptance Rate**: ≥85% of SEEDs accepted on first attempt
- **Average Score**: ≥8.0 overall quality score
- **Retry Success**: ≥70% of retries achieve acceptance
- **Human Review Rate**: <5% of SEEDs need human review
- **False Positive Rate**: <10% of flagged SEEDs deemed acceptable

### Qualitative Goals

- Agents learn and improve with each attempt
- Suggestions lead to actionable prompt improvements
- Identified concerns align with human assessments
- Human reviewers find the system helpful and accurate

---

## Future Enhancements

### Version 2.0 (Planned)

- **Machine Learning**: Train model on human-reviewed extractions
- **Cross-SEED Learning**: Apply successful strategies across similar SEEDs
- **Comparative Analysis**: A/B test prompt variations
- **Real-Time Feedback**: Stream quality scores during extraction
- **Human-Agent Collaboration**: Interactive refinement mode

---

## Files Generated by System

### New Directory Structure

```
vfs/courses/{course_code}/
├── amino_acids/
│   └── translations/
│       └── {uuid}.json           (extended with self-review)
│
├── phase_outputs/
│   ├── phase_3_lego_extraction.json    (existing)
│   └── phase_3_quality_report.json     (NEW - aggregate metrics)
│
└── quality_reports/                    (NEW directory)
    ├── flagged_seeds.json
    ├── failed_seeds.json
    ├── retry_queue.json
    └── human_review_queue.json
```

---

## Related Documentation

### APML System Documentation

- `/docs/ARCHITECTURE.md` - Overall system architecture
- `/src/views/APMLSpec.vue` - APML specification viewer
- `/vfs/courses/*/README.md` - Course-specific documentation

### Component Documentation

- `/docs/SEED_VISUALIZER_USAGE.md` - SeedVisualizer component guide
- `/docs/LEGO_VISUALIZER_INTEGRATION.md` - LEGO visualization
- `/docs/PHRASEVISUALIZER_SUMMARY.md` - Phrase visualization

---

## FAQ

### Q: Does this slow down Phase 3 extraction?

**A**: Minimally. Self-review adds ~2-3 seconds per SEED (scoring + concern detection). For 50 SEEDs, expect ~2 minutes additional processing time.

### Q: What if scoring is inaccurate?

**A**: The system is tunable. Adjust weights in `calculateOverallScore()` and thresholds in decision engine. Human review validates and calibrates scoring.

### Q: Can this be applied to other phases?

**A**: Yes! The architecture is generalizable. Phases 4 (deduplication), 5 (baskets), and 6 (introductions) could all benefit from similar self-review systems.

### Q: How does this handle edge cases like contractions?

**A**: Edge case handling is one of the 5 dimensions (10% weight). Contractions are explicitly checked in `scoreEdgeCaseHandling()`. Split contractions are flagged as high-severity concerns.

### Q: What's the false positive rate?

**A**: Target is <10%. During calibration, human reviewers assess ~30 samples across score ranges to tune thresholds and validate accuracy.

---

## Contact & Support

### Questions?

- Review the [Implementation Guide](./06-IMPLEMENTATION-GUIDE.md) troubleshooting section
- Check [Example Scenarios](./05-EXAMPLE-SCENARIOS.md) for concrete cases
- Refer to [Quality Rubric](./02-QUALITY-RUBRIC.md) for scoring details

### Contributing

When improving the system:
1. Update relevant documentation
2. Increment `scoring_version` if rubric changes
3. Document changes in quality report
4. Test on sample corpus before deploying

---

## Version History

- **1.0** (2025-10-11): Initial architecture design
  - Complete 6-document specification
  - 5-dimension quality scoring rubric
  - Extended amino acid schema
  - Self-review prompt template
  - 5 worked examples
  - Full implementation guide

---

## License & Usage

This architecture is designed for the SSi APML system. Use and adapt as needed for language learning applications.

---

**Status**: Design Complete ✓
**Ready for Implementation**: Yes ✓
**Next Steps**: Begin Week 1 implementation (Core Scoring System)

---

**Last Updated**: 2025-10-11
**Maintained By**: SSi Development Team
