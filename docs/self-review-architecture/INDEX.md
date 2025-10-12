# Self-Review Architecture - Document Index

## Complete Documentation Set

This directory contains **6,347 lines** of comprehensive documentation across **7 files** totaling **208 KB**.

---

## Core Documents (Read in Order)

### 1. [README.md](./README.md) - Start Here
**14 KB | 450 lines**

High-level overview of the entire system. Read this first to understand what the self-review architecture does and how all the pieces fit together.

**Key Sections**:
- Executive Summary
- Document Structure Guide
- Quick Start (30 min to understand, 2-3 hours to implement)
- System Architecture At-a-Glance
- FAQ

**Read if**: You're new to this system or want a quick overview

---

### 2. [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) - System Design
**32 KB | 932 lines**

Complete architectural specification including data structures, workflows, integration points, and storage formats.

**Key Sections**:
- Architecture Overview & Core Components
- Complete Data Structure Definitions (Quality Score, Concern, Suggestion, ExtractionAttempt)
- Storage Format & File Structure
- Integration Points with Existing Systems
- Detailed Workflow Diagrams
- Implementation Phases

**Read if**: You need to understand the overall system architecture and how components interact

---

### 3. [02-QUALITY-RUBRIC.md](./02-QUALITY-RUBRIC.md) - Scoring Criteria
**30 KB | 1,105 lines**

Detailed specification of the 5-dimension quality scoring system with complete algorithms and detection logic.

**Key Sections**:
- **Iron Rule Compliance** (35% weight) - Preposition detection algorithm
- **Naturalness** (25% weight) - Phrasal verbs, boundaries, completeness
- **Pedagogical Value** (20% weight) - Frequency, granularity, reusability
- **Consistency** (10% weight) - Standard deviation calculations
- **Edge Case Handling** (10% weight) - Contractions, punctuation, whitespace
- Overall Score Calculation (weighted average formula)
- Concern Detection Logic
- Suggestion Generation Rules

**Read if**: You need to implement scoring functions or understand how quality is measured

---

### 4. [03-AMINO-ACID-SCHEMA.md](./03-AMINO-ACID-SCHEMA.md) - Data Format
**40 KB | 1,289 lines**

Complete JSON schema for translation amino acids extended with self-review metadata.

**Key Sections**:
- TypeScript Interface Definitions (full type system)
- Field-by-Field Documentation
- Validation Rules (JSON Schema + business logic)
- Migration Path from Old Format
- 3 Complete Worked Examples:
  - Example 1: Accepted on first attempt
  - Example 2: Flagged, then improved on retry
  - Example 3: Failed multiple times, needs human review
- Backwards Compatibility Strategy

**Read if**: You need to understand the data structure or implement storage/validation

---

### 5. [04-SELF-REVIEW-PROMPT.md](./04-SELF-REVIEW-PROMPT.md) - Agent Prompt
**19 KB | 650 lines**

The actual prompt template that AI agents should use to perform self-review after LEGO extraction.

**Key Sections**:
- Complete Self-Review Prompt (ready to use)
- Step-by-Step Instructions for Each Dimension
- Scoring Guidelines (with examples)
- Concern Identification Templates
- Suggestion Generation Format
- JSON Output Structure
- Integration Instructions
- Prompt Versioning Strategy
- Appendices: Common Concerns & Suggestions Reference

**Read if**: You're implementing the AI agent or need the prompt text

---

### 6. [05-EXAMPLE-SCENARIOS.md](./05-EXAMPLE-SCENARIOS.md) - Concrete Examples
**27 KB | 933 lines**

Five detailed examples showing good, mediocre, and poor extractions with complete self-review assessments.

**Examples**:
1. **Excellent** (Score 9.5/10) - "I know how to practise speaking"
2. **Good** (Score 7.6/10) - "I want to speak Macedonian with you now" (one Iron Rule violation)
3. **Mediocre** (Score 4.1/10) - "I'm going to practise speaking" (phrasal verb split)
4. **Poor** (Score 3.3/10) - "And I want you to speak..." (67% Iron Rule violations)
5. **Retry Success** (Score 4.5 → 8.7) - "I'd like to be able to speak" (shows improvement process)

Each example includes:
- Complete dimension-by-dimension scoring
- All concerns identified
- All suggestions generated
- Review notes
- Status determination

**Read if**: You want to understand what different quality scores look like in practice

---

### 7. [06-IMPLEMENTATION-GUIDE.md](./06-IMPLEMENTATION-GUIDE.md) - How to Build It
**29 KB | 988 lines**

Step-by-step implementation instructions with complete code examples.

**Key Sections**:
- Prerequisites & Dependencies
- 4-Phase Implementation Plan (weekly breakdown):
  - Week 1: Core Scoring System
  - Week 2: Self-Review Integration
  - Week 3: Retry & Decision Engine
  - Week 4: UI Integration & Polish
- Complete Code Examples:
  - `lib/quality-scoring.js` (full implementation)
  - `lib/concern-detector.js` (full implementation)
  - `lib/suggestion-generator.js` (full implementation)
  - Modified `process-phase-3.cjs` (integration code)
- Testing Strategy (unit, integration, e2e)
- Deployment Plan
- Monitoring & Maintenance
- Troubleshooting Guide

**Read if**: You're ready to implement the system

---

## Reading Paths

### Path 1: Executive Understanding (30 minutes)
For managers, stakeholders, or anyone who needs a high-level understanding:

1. **README.md** - Executive Summary (5 min)
2. **01-ARCHITECTURE.md** - Architecture Overview section (10 min)
3. **05-EXAMPLE-SCENARIOS.md** - Example 1 and Example 5 (10 min)
4. **README.md** - FAQ and Success Metrics (5 min)

**Outcome**: Understand what the system does, why it's valuable, and what success looks like

---

### Path 2: Technical Design Review (90 minutes)
For architects, tech leads, or anyone evaluating the design:

1. **README.md** - Full read (15 min)
2. **01-ARCHITECTURE.md** - Complete read (30 min)
3. **02-QUALITY-RUBRIC.md** - Scoring Dimensions sections (25 min)
4. **03-AMINO-ACID-SCHEMA.md** - Schema Definition and Examples (15 min)
5. **06-IMPLEMENTATION-GUIDE.md** - Implementation Phases and Code Structure (5 min)

**Outcome**: Deep understanding of architecture, able to critique or approve design

---

### Path 3: Implementation (4-8 hours first read, then 4-5 weeks to build)
For developers implementing the system:

**First Read** (4-8 hours):
1. **README.md** - Full read (15 min)
2. **01-ARCHITECTURE.md** - Full read (45 min)
3. **02-QUALITY-RUBRIC.md** - Full read, study algorithms (90 min)
4. **03-AMINO-ACID-SCHEMA.md** - Full read, understand data structures (60 min)
5. **04-SELF-REVIEW-PROMPT.md** - Full read (45 min)
6. **05-EXAMPLE-SCENARIOS.md** - Work through all 5 examples (60 min)
7. **06-IMPLEMENTATION-GUIDE.md** - Full read, copy code examples (90 min)

**Then Build** (4-5 weeks):
- Week 1: Core Scoring (20-24 hours)
- Week 2: Integration (16-20 hours)
- Week 3: Retry System (16-20 hours)
- Week 4: UI & Polish (16-20 hours)

**Outcome**: Fully implemented self-review system

---

### Path 4: AI Agent Developer (3 hours)
For those integrating self-review into AI agents:

1. **README.md** - Overview (10 min)
2. **02-QUALITY-RUBRIC.md** - All scoring algorithms (60 min)
3. **04-SELF-REVIEW-PROMPT.md** - Complete prompt template (60 min)
4. **05-EXAMPLE-SCENARIOS.md** - Study all examples (45 min)
5. **03-AMINO-ACID-SCHEMA.md** - Output format (15 min)

**Outcome**: Able to implement self-review in an AI agent

---

### Path 5: Quality Assurance (2 hours)
For QA engineers testing the system:

1. **README.md** - Overview and Success Metrics (15 min)
2. **02-QUALITY-RUBRIC.md** - Understand scoring criteria (45 min)
3. **05-EXAMPLE-SCENARIOS.md** - Test cases and expected outputs (45 min)
4. **06-IMPLEMENTATION-GUIDE.md** - Testing Strategy section (15 min)

**Outcome**: Able to create test plans and validate implementation

---

## Quick Reference

### Key Concepts

| Concept | Definition | Document |
|---------|------------|----------|
| **Quality Score** | 0-10 weighted average of 5 dimensions | [02-QUALITY-RUBRIC.md](./02-QUALITY-RUBRIC.md) |
| **Iron Rule** | No LEGO may start/end with preposition | [02-QUALITY-RUBRIC.md](./02-QUALITY-RUBRIC.md) |
| **Concern** | Specific issue identified during review | [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) |
| **Suggestion** | Improvement recommendation for next attempt | [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) |
| **Attempt** | Single extraction + self-review cycle | [03-AMINO-ACID-SCHEMA.md](./03-AMINO-ACID-SCHEMA.md) |
| **Status** | accepted \| flagged \| failed \| pending_review | [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) |

### Status Thresholds

| Score Range | Status | Action |
|-------------|--------|--------|
| ≥ 8.0 | **Accepted** ✓ | Proceed to next phase |
| 5.0-7.9 | **Flagged** ⚠ | Review recommended but continue |
| < 5.0 | **Failed** ✗ | Retry with improved prompt (max 3×) |
| 3 failures | **Pending Review** 👤 | Escalate to human |

### Dimension Weights

| Dimension | Weight | Why This Weight? |
|-----------|--------|------------------|
| Iron Rule Compliance | 35% | Objective, critical quality gate |
| Naturalness | 25% | Core to learnability |
| Pedagogical Value | 20% | Core to usefulness |
| Consistency | 10% | Important but less critical |
| Edge Case Handling | 10% | Important but affects fewer LEGOs |

---

## File Statistics

```
Total Lines:   6,347
Total Size:    208 KB
Total Files:   7

Breakdown:
  1,289 lines - 03-AMINO-ACID-SCHEMA.md        (20.3%)
  1,105 lines - 02-QUALITY-RUBRIC.md           (17.4%)
    988 lines - 06-IMPLEMENTATION-GUIDE.md     (15.6%)
    933 lines - 05-EXAMPLE-SCENARIOS.md        (14.7%)
    932 lines - 01-ARCHITECTURE.md             (14.7%)
    650 lines - 04-SELF-REVIEW-PROMPT.md       (10.2%)
    450 lines - README.md                      ( 7.1%)
```

---

## Visual Guide to Document Relationships

```
                    README.md
                        │
                 [Start Here!]
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
 01-ARCHITECTURE   02-QUALITY     05-EXAMPLE
       │            RUBRIC         SCENARIOS
       │               │               │
       │               │               │
    [System        [How to          [What
    Design]        Measure          Good
       │           Quality]         Looks Like]
       │               │               │
       │               │               │
       └───────┬───────┴───────┬───────┘
               │               │
               ▼               ▼
        03-AMINO-ACID    04-SELF-REVIEW
           SCHEMA            PROMPT
               │               │
               │               │
           [Data           [Agent
          Format]         Instructions]
               │               │
               └───────┬───────┘
                       │
                       ▼
              06-IMPLEMENTATION
                    GUIDE
                       │
                       │
                  [How to
                  Build It]
```

---

## Version Information

**Architecture Version**: 1.0
**Created**: 2025-10-11
**Status**: Complete, Ready for Implementation

**Scoring Rubric Version**: 1.0
**Prompt Version**: 3.0.0
**Schema Version**: 7.0 (extends existing APML v7.0)

---

## Next Steps

### If You're Just Starting

1. Read [README.md](./README.md) (15 minutes)
2. Decide which reading path above matches your role
3. Follow that path
4. Start implementation when ready

### If You're Ready to Implement

1. Follow **Path 3: Implementation** above
2. Start with Week 1 in [06-IMPLEMENTATION-GUIDE.md](./06-IMPLEMENTATION-GUIDE.md)
3. Copy code from implementation guide
4. Test on sample corpus
5. Deploy and monitor

### If You Have Questions

- Check the FAQ in [README.md](./README.md)
- Review examples in [05-EXAMPLE-SCENARIOS.md](./05-EXAMPLE-SCENARIOS.md)
- Refer to troubleshooting in [06-IMPLEMENTATION-GUIDE.md](./06-IMPLEMENTATION-GUIDE.md)

---

**Document Status**: Complete ✓
**Last Updated**: 2025-10-11
