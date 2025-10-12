# Self-Review and Quality Scoring Architecture for APML Agents

## Executive Summary

This document defines a comprehensive self-review and quality scoring system for APML agents that perform LEGO extraction (Phase 3). The system enables agents to:

1. Self-assess extraction quality using a 0-10 scoring rubric
2. Document specific concerns and issues identified during extraction
3. Suggest prompt improvements for subsequent attempts
4. Flag SEEDs requiring human review or re-runs
5. Maintain a complete history of extraction attempts for continuous improvement

**Version**: 1.0
**Created**: 2025-10-11
**Status**: Design Specification

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Structures](#data-structures)
3. [Quality Scoring System](#quality-scoring-system)
4. [Storage Format](#storage-format)
5. [Integration Points](#integration-points)
6. [Workflow Diagrams](#workflow-diagrams)
7. [Implementation Phases](#implementation-phases)

---

## Architecture Overview

### System Goals

The self-review architecture serves multiple purposes:

1. **Quality Assurance**: Agents detect and flag poor extractions before they propagate
2. **Continuous Improvement**: Each attempt learns from previous failures
3. **Human Oversight**: Efficiently route problem cases to human reviewers
4. **Audit Trail**: Complete history of extraction decisions and reasoning
5. **Automated Retry**: System can automatically retry low-scoring extractions with improved prompts

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Phase 3: LEGO Extraction                     │
│                                                                 │
│  ┌──────────────────┐                                          │
│  │ 1. Extract LEGOs │                                          │
│  │    from SEED     │                                          │
│  └────────┬─────────┘                                          │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────┐                                          │
│  │ 2. Self-Review   │ ◄── NEW COMPONENT                       │
│  │    Process       │                                          │
│  └────────┬─────────┘                                          │
│           │                                                     │
│           ├─── Score: 0-10                                     │
│           ├─── Concerns: []                                    │
│           ├─── Suggestions: []                                 │
│           └─── Status: accepted|flagged|failed                 │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────┐                                          │
│  │ 3. Decision      │                                          │
│  │    Engine        │                                          │
│  └────────┬─────────┘                                          │
│           │                                                     │
│           ├─── Score ≥ 8: ACCEPT                              │
│           ├─── Score 5-7: FLAG for review                     │
│           └─── Score < 5: RETRY with improved prompt          │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────┐                                          │
│  │ 4. Store Results │                                          │
│  │    + History     │                                          │
│  └──────────────────┘                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Self-Contained**: Each extraction attempt includes complete review metadata
2. **Transparent**: All scoring criteria are explicit and auditable
3. **Incremental**: System improves with each attempt through prompt refinement
4. **Non-Blocking**: Review process doesn't slow down the extraction pipeline
5. **Human-in-Loop**: Critical decisions escalate to human reviewers

---

## Data Structures

### 1. Quality Score Object

```json
{
  "overall_score": 8.5,
  "dimension_scores": {
    "iron_rule_compliance": 10,
    "naturalness": 8,
    "pedagogical_value": 9,
    "consistency": 8,
    "edge_case_handling": 8
  },
  "calculated_at": "2025-10-11T15:30:00.000Z",
  "scoring_version": "1.0"
}
```

**Fields:**
- `overall_score` (float): Weighted average of dimension scores (0-10 scale)
- `dimension_scores` (object): Individual scores for each quality dimension
- `calculated_at` (ISO timestamp): When the score was computed
- `scoring_version` (string): Version of the scoring rubric used

### 2. Concern Object

```json
{
  "concern_id": "c1_unnatural_boundary",
  "severity": "medium",
  "category": "naturalness",
  "description": "LEGO 'I know' breaks at an unnatural point. More natural: 'I know how'",
  "affected_legos": ["S37L1"],
  "suggested_fix": "Extend boundary to include 'how' for complete thought",
  "auto_fixable": false
}
```

**Fields:**
- `concern_id` (string): Unique identifier for concern type
- `severity` (enum): `"low"` | `"medium"` | `"high"` | `"critical"`
- `category` (string): Maps to quality dimension (e.g., "naturalness", "iron_rule")
- `description` (string): Human-readable explanation of the issue
- `affected_legos` (array): Provenance IDs of LEGOs with this concern
- `suggested_fix` (string): Actionable recommendation
- `auto_fixable` (boolean): Whether this can be automatically corrected

### 3. Suggestion Object

```json
{
  "suggestion_id": "s1_prompt_refinement",
  "type": "prompt_improvement",
  "priority": "high",
  "current_prompt_excerpt": "Extract phrases that are pedagogically useful...",
  "suggested_change": "Add explicit instruction: 'Avoid breaking phrasal verbs (e.g., keep \"go to\" together)'",
  "rationale": "Agent consistently breaks common phrasal verbs",
  "expected_improvement": "+1.5 points in naturalness score"
}
```

**Fields:**
- `suggestion_id` (string): Unique identifier for suggestion type
- `type` (enum): `"prompt_improvement"` | `"heuristic_adjustment"` | `"training_data"`
- `priority` (enum): `"low"` | `"medium"` | `"high"`
- `current_prompt_excerpt` (string): Relevant portion of current prompt
- `suggested_change` (string): Specific modification to make
- `rationale` (string): Why this change would help
- `expected_improvement` (string): Predicted impact on quality

### 4. Extraction Attempt Object

```json
{
  "attempt_number": 2,
  "timestamp": "2025-10-11T15:30:00.000Z",
  "agent_version": "phase3_v2.1",
  "prompt_version": "3.0.1",
  "legos_extracted": 5,
  "quality_score": {
    "overall_score": 8.5,
    "dimension_scores": { "..." }
  },
  "concerns": [
    { "concern_id": "...", "..." }
  ],
  "suggestions": [
    { "suggestion_id": "...", "..." }
  ],
  "status": "accepted",
  "review_notes": "Improvement over attempt 1. Phrasal verb boundaries now correct.",
  "compared_to_previous": {
    "score_delta": "+2.0",
    "improvements": ["Phrasal verbs now intact", "More natural boundaries"],
    "regressions": []
  }
}
```

**Fields:**
- `attempt_number` (integer): Sequential attempt counter (1, 2, 3...)
- `timestamp` (ISO timestamp): When extraction was performed
- `agent_version` (string): Version of extraction agent used
- `prompt_version` (string): Version of prompt template used
- `legos_extracted` (integer): Count of LEGOs produced
- `quality_score` (object): Quality assessment (see Quality Score Object)
- `concerns` (array): Issues identified (see Concern Object)
- `suggestions` (array): Improvement recommendations (see Suggestion Object)
- `status` (enum): `"accepted"` | `"flagged"` | `"failed"` | `"retry_scheduled"`
- `review_notes` (string): Agent's self-reflection on this attempt
- `compared_to_previous` (object): Comparative analysis vs. previous attempt

### 5. Extended Translation Amino Acid

The translation amino acid is extended with self-review metadata:

```json
{
  "uuid": "abe563fe55e11c8d67a5969e50a38651",
  "type": "translation",
  "seed_id": "C0001",
  "source": "I want to speak Macedonian with you now.",
  "target": "Сакам да зборувам македонски со тебе сега.",
  "metadata": {
    "course_code": "mkd_for_eng_574seeds",
    "phase": "phase_1",
    "heuristics_applied": ["naturalness", "frequency", "clarity"],
    "created_at": "2025-10-10T10:18:16.477Z",
    "migrated_from": "legacy_format"
  },

  // ============ NEW FIELDS FOR SELF-REVIEW ============

  "lego_extraction_attempts": [
    {
      "attempt_number": 1,
      "timestamp": "2025-10-11T14:00:00.000Z",
      "agent_version": "phase3_v2.0",
      "prompt_version": "3.0.0",
      "legos_extracted": 5,
      "quality_score": {
        "overall_score": 6.5,
        "dimension_scores": {
          "iron_rule_compliance": 10,
          "naturalness": 6,
          "pedagogical_value": 7,
          "consistency": 5,
          "edge_case_handling": 7
        }
      },
      "concerns": [
        {
          "concern_id": "c2_inconsistent_granularity",
          "severity": "medium",
          "category": "consistency",
          "description": "LEGO lengths vary widely (2-6 words) with no clear pattern",
          "affected_legos": ["S1L1", "S1L2", "S1L3"],
          "suggested_fix": "Apply more consistent chunking strategy",
          "auto_fixable": false
        }
      ],
      "suggestions": [
        {
          "suggestion_id": "s2_consistency_heuristic",
          "type": "prompt_improvement",
          "priority": "high",
          "suggested_change": "Add guideline: 'Prefer 3-5 word LEGOs for consistency'",
          "rationale": "Wide variance in LEGO size reduces pedagogical effectiveness"
        }
      ],
      "status": "flagged",
      "review_notes": "Extraction technically correct but inconsistent granularity"
    },
    {
      "attempt_number": 2,
      "timestamp": "2025-10-11T15:30:00.000Z",
      "agent_version": "phase3_v2.1",
      "prompt_version": "3.0.1",
      "legos_extracted": 5,
      "quality_score": {
        "overall_score": 8.5,
        "dimension_scores": {
          "iron_rule_compliance": 10,
          "naturalness": 9,
          "pedagogical_value": 8,
          "consistency": 8,
          "edge_case_handling": 8
        }
      },
      "concerns": [],
      "suggestions": [],
      "status": "accepted",
      "review_notes": "Significant improvement. Consistent chunking applied successfully.",
      "compared_to_previous": {
        "score_delta": "+2.0",
        "improvements": ["More consistent LEGO sizes", "Better phrasal integrity"],
        "regressions": []
      }
    }
  ],

  "quality_status": "accepted",
  "current_quality_score": 8.5,
  "total_attempts": 2,
  "flagged_for_review": false,
  "human_review_requested": false,
  "last_reviewed_at": "2025-10-11T15:30:00.000Z"
}
```

**New Top-Level Fields:**
- `lego_extraction_attempts` (array): Complete history of all extraction attempts
- `quality_status` (enum): `"accepted"` | `"flagged"` | `"failed"` | `"pending_review"`
- `current_quality_score` (float): Score from the most recent accepted attempt
- `total_attempts` (integer): How many times extraction has been attempted
- `flagged_for_review` (boolean): Whether a human should review this SEED
- `human_review_requested` (boolean): Whether agent has explicitly requested human review
- `last_reviewed_at` (ISO timestamp): When the most recent self-review occurred

---

## Quality Scoring System

### Scoring Formula

```
overall_score = (
  iron_rule_compliance × 0.35 +      // 35% weight (critical)
  naturalness × 0.25 +                // 25% weight (high importance)
  pedagogical_value × 0.20 +          // 20% weight (high importance)
  consistency × 0.10 +                // 10% weight (moderate importance)
  edge_case_handling × 0.10           // 10% weight (moderate importance)
)
```

### Weight Rationale

1. **Iron Rule Compliance (35%)**: Highest weight because violations are objective failures
2. **Naturalness (25%)**: Critical for learner comprehension and usability
3. **Pedagogical Value (20%)**: Core purpose of LEGO extraction
4. **Consistency (10%)**: Important for curriculum coherence but less critical
5. **Edge Case Handling (10%)**: Important but affects fewer LEGOs

### Dimension Definitions

See [02-QUALITY-RUBRIC.md](./02-QUALITY-RUBRIC.md) for detailed scoring criteria.

### Status Thresholds

```
Score ≥ 8.0  → status: "accepted"        (ship it!)
Score 5.0-7.9 → status: "flagged"         (review recommended)
Score < 5.0   → status: "failed"          (must retry or escalate)
```

**Decision Logic:**

- **Score ≥ 8.0**: Accept extraction, proceed to Phase 4
- **Score 5.0-7.9**: Flag for human review but allow to proceed
- **Score < 5.0**: Automatic retry with improved prompt (max 3 attempts)
- **3 failures**: Escalate to human for manual extraction

---

## Storage Format

### File Structure

```
vfs/courses/{course_code}/
├── amino_acids/
│   ├── translations/
│   │   └── {uuid}.json              (extended with self-review metadata)
│   ├── legos/
│   │   └── {uuid}.json              (unchanged)
│   └── legos_index.json             (unchanged)
│
├── phase_outputs/
│   ├── phase_3_lego_extraction.json (extended with aggregate stats)
│   └── phase_3_quality_report.json  (NEW - detailed quality metrics)
│
└── quality_reports/                 (NEW directory)
    ├── flagged_seeds.json
    ├── failed_seeds.json
    ├── retry_queue.json
    └── human_review_queue.json
```

### New Files

#### 1. `phase_3_quality_report.json`

Aggregate quality metrics for the entire extraction run:

```json
{
  "version": "7.0",
  "phase": "3",
  "generated_at": "2025-10-11T16:00:00.000Z",
  "course_code": "mkd_for_eng_574seeds",

  "quality_summary": {
    "total_seeds": 51,
    "accepted": 45,
    "flagged": 4,
    "failed": 2,
    "acceptance_rate": "88.2%",
    "average_quality_score": 8.3,
    "average_attempts_per_seed": 1.4
  },

  "dimension_averages": {
    "iron_rule_compliance": 9.8,
    "naturalness": 8.1,
    "pedagogical_value": 8.5,
    "consistency": 7.9,
    "edge_case_handling": 8.0
  },

  "concern_frequency": {
    "c1_unnatural_boundary": 8,
    "c2_inconsistent_granularity": 5,
    "c3_phrasal_verb_split": 3,
    "c4_missing_context": 2
  },

  "improvement_trends": {
    "seeds_improved_on_retry": 6,
    "average_score_improvement": "+2.1",
    "most_effective_suggestion": "s1_prompt_refinement"
  },

  "human_review_needed": [
    {
      "seed_id": "C0042",
      "uuid": "...",
      "reason": "3 consecutive failed attempts",
      "last_score": 4.2
    }
  ]
}
```

#### 2. `quality_reports/flagged_seeds.json`

```json
{
  "generated_at": "2025-10-11T16:00:00.000Z",
  "total_flagged": 4,
  "seeds": [
    {
      "seed_id": "C0023",
      "uuid": "...",
      "current_score": 6.8,
      "status": "flagged",
      "primary_concern": "Inconsistent granularity",
      "flagged_at": "2025-10-11T15:45:00.000Z",
      "requires_action": false
    }
  ]
}
```

#### 3. `quality_reports/retry_queue.json`

```json
{
  "generated_at": "2025-10-11T16:00:00.000Z",
  "queue_length": 2,
  "retries": [
    {
      "seed_id": "C0042",
      "uuid": "...",
      "current_attempt": 2,
      "max_attempts": 3,
      "last_score": 4.5,
      "retry_reason": "Low naturalness score",
      "suggested_prompt_changes": [
        "Add phrasal verb preservation rule",
        "Increase context window for boundary decisions"
      ],
      "scheduled_retry_at": "2025-10-11T16:15:00.000Z"
    }
  ]
}
```

#### 4. `quality_reports/human_review_queue.json`

```json
{
  "generated_at": "2025-10-11T16:00:00.000Z",
  "queue_length": 1,
  "urgent_count": 0,
  "reviews": [
    {
      "seed_id": "C0042",
      "uuid": "...",
      "priority": "high",
      "reason": "3 failed extraction attempts",
      "current_status": "failed",
      "best_attempt_score": 4.5,
      "concerns_summary": [
        "Consistently unnatural boundaries",
        "Unclear how to segment complex sentence"
      ],
      "agent_notes": "This SEED has unusual structure. Human judgment needed for optimal segmentation.",
      "added_to_queue_at": "2025-10-11T16:00:00.000Z"
    }
  ]
}
```

---

## Integration Points

### Phase 3 Modification

Current Phase 3 flow:
```
Load translations → Extract LEGOs → Save LEGO files → Generate phase output
```

New Phase 3 flow with self-review:
```
Load translations
    ↓
For each translation:
    ↓
    Extract LEGOs (existing logic)
    ↓
    Self-Review Process (NEW)
    ├─ Calculate quality scores
    ├─ Identify concerns
    ├─ Generate suggestions
    └─ Determine status
    ↓
    Decision Engine (NEW)
    ├─ If score ≥ 8: Accept
    ├─ If score 5-7: Flag & Accept
    └─ If score < 5: Add to retry queue
    ↓
    Save extended translation amino acid (with attempt history)
    ↓
    Save LEGO files (unchanged)
    ↓
Process retry queue (NEW)
    ↓
Generate phase outputs + quality reports (NEW)
```

### Integration with Existing Systems

#### 1. SeedVisualizer Integration

The SeedVisualizer component can display quality metadata:

```vue
<template>
  <div class="seed-visualizer">
    <!-- Existing visualization -->

    <!-- NEW: Quality indicator -->
    <div v-if="translation.current_quality_score" class="quality-badge">
      <span class="score">{{ translation.current_quality_score.toFixed(1) }}</span>
      <span :class="statusClass">{{ translation.quality_status }}</span>
    </div>

    <!-- NEW: Concerns panel -->
    <div v-if="hasActiveConcerns" class="concerns-panel">
      <h4>Extraction Concerns</h4>
      <ul>
        <li v-for="concern in currentConcerns" :key="concern.concern_id">
          <span class="severity">{{ concern.severity }}</span>
          {{ concern.description }}
        </li>
      </ul>
    </div>

    <!-- NEW: Attempt history -->
    <div v-if="showHistory" class="attempt-history">
      <h4>Extraction History ({{ translation.total_attempts }} attempts)</h4>
      <div v-for="attempt in translation.lego_extraction_attempts" :key="attempt.attempt_number">
        Attempt {{ attempt.attempt_number }}: Score {{ attempt.quality_score.overall_score }}
      </div>
    </div>
  </div>
</template>
```

#### 2. Dashboard Integration

Add quality metrics to the main dashboard:

```
Course: Macedonian for English Speakers
Status: Phase 3 Complete

Quality Summary:
├─ Accepted: 45/51 (88.2%)
├─ Flagged: 4/51 (7.8%)
├─ Failed: 2/51 (3.9%)
└─ Avg Score: 8.3/10

[View Quality Report] [Review Flagged Seeds] [Retry Failed Seeds]
```

#### 3. Automation Server Integration

The automation server can monitor quality reports and trigger actions:

```javascript
// In automation_server.cjs

async function monitorQualityReports(courseCode) {
  const qualityReport = await loadQualityReport(courseCode);

  // Auto-retry failed seeds
  if (qualityReport.quality_summary.failed > 0) {
    await retryFailedSeeds(courseCode);
  }

  // Notify humans of review queue
  if (qualityReport.human_review_needed.length > 0) {
    await notifyHumanReviewers(qualityReport.human_review_needed);
  }

  // Log quality trends
  await logQualityMetrics(qualityReport);
}
```

---

## Workflow Diagrams

### Complete Self-Review Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                 Phase 3: LEGO Extraction Start                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │ Load Translation │
                  │   Amino Acid     │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │ Extract LEGOs    │
                  │ (existing logic) │
                  └────────┬─────────┘
                           │
                           ▼
        ┌──────────────────────────────────────────┐
        │    SELF-REVIEW PROCESS (NEW)             │
        │                                           │
        │  1. Calculate dimension scores:          │
        │     • Iron Rule Compliance               │
        │     • Naturalness                        │
        │     • Pedagogical Value                  │
        │     • Consistency                        │
        │     • Edge Case Handling                 │
        │                                           │
        │  2. Compute overall score (weighted avg) │
        │                                           │
        │  3. Identify concerns:                   │
        │     • Unnatural boundaries               │
        │     • Inconsistent granularity           │
        │     • Phrasal verb splits                │
        │     • etc.                               │
        │                                           │
        │  4. Generate suggestions:                │
        │     • Prompt improvements                │
        │     • Heuristic adjustments              │
        │                                           │
        │  5. Create attempt record                │
        └──────────────┬───────────────────────────┘
                       │
                       ▼
        ┌─────────────────────────────┐
        │  DECISION ENGINE (NEW)      │
        │                             │
        │  What's the overall score?  │
        └──────────┬──────────────────┘
                   │
       ┌───────────┼───────────┐
       │           │           │
       ▼           ▼           ▼
    ≥ 8.0      5.0-7.9      < 5.0
       │           │           │
       │           │           ▼
       │           │     ┌──────────────────┐
       │           │     │ Attempt < 3?     │
       │           │     └───┬──────────┬───┘
       │           │         │ YES      │ NO
       │           │         │          │
       │           │         ▼          ▼
       │           │   ┌─────────┐  ┌──────────────┐
       │           │   │ RETRY   │  │ ESCALATE TO  │
       │           │   │  with   │  │    HUMAN     │
       │           │   │improved │  │   REVIEW     │
       │           │   │ prompt  │  └──────────────┘
       │           │   └────┬────┘
       │           │        │
       │           │        └──────┐
       │           │               │
       ▼           ▼               ▼
    ┌──────────────────────────────────┐
    │  Save Extended Translation       │
    │  Amino Acid with:               │
    │  • Attempt history              │
    │  • Quality scores               │
    │  • Concerns                     │
    │  • Suggestions                  │
    │  • Status                       │
    └───────────┬──────────────────────┘
                │
                ▼
    ┌──────────────────────┐
    │  Save LEGO files     │
    │  (unchanged format)  │
    └───────────┬──────────┘
                │
                ▼
    ┌────────────────────────────┐
    │  Update Quality Reports:   │
    │  • phase_3_quality_report  │
    │  • flagged_seeds.json      │
    │  • retry_queue.json        │
    │  • human_review_queue.json │
    └───────────┬────────────────┘
                │
                ▼
    ┌──────────────────────┐
    │  Phase 3 Complete    │
    │  (or continue retry) │
    └──────────────────────┘
```

### Retry Loop Detail

```
Extraction Failed (score < 5.0)
        │
        ▼
┌──────────────────┐
│ Check attempt #  │
└────┬─────────────┘
     │
     ├─── Attempt 1 or 2?
     │    │
     │    ▼
     │    ┌────────────────────────────────────┐
     │    │ Analyze concerns & suggestions:    │
     │    │                                    │
     │    │ • Most common concern type?        │
     │    │ • Highest priority suggestion?     │
     │    │ • What changed from last attempt?  │
     │    └───────────┬────────────────────────┘
     │                │
     │                ▼
     │    ┌──────────────────────────────┐
     │    │ Generate improved prompt:    │
     │    │                              │
     │    │ Base prompt                  │
     │    │   +                          │
     │    │ Specific fixes for concerns  │
     │    │   +                          │
     │    │ Implement suggestions        │
     │    └───────────┬──────────────────┘
     │                │
     │                ▼
     │    ┌──────────────────────────┐
     │    │ Re-run extraction with   │
     │    │ improved prompt          │
     │    └───────────┬──────────────┘
     │                │
     │                └─────► (Back to Self-Review Process)
     │
     └─── Attempt 3?
          │
          ▼
     ┌────────────────────────────────────┐
     │ 3 failures → Human review required │
     │                                    │
     │ Add to human_review_queue.json:   │
     │ • All attempt histories           │
     │ • All concerns identified         │
     │ • All suggestions tried           │
     │ • Agent notes on why it's hard    │
     └────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Core Self-Review (Week 1)

**Deliverables:**
- Quality scoring functions
- Concern identification logic
- Suggestion generation logic
- Extended translation amino acid schema
- Basic attempt history tracking

**Tasks:**
1. Implement dimension scoring functions
2. Create concern detector system
3. Build suggestion generator
4. Modify translation amino acid storage
5. Update Phase 3 script to include self-review

### Phase 2: Decision Engine & Storage (Week 2)

**Deliverables:**
- Decision engine with threshold logic
- Retry mechanism with prompt improvement
- Quality report generation
- New file storage structure

**Tasks:**
1. Implement status determination logic
2. Build retry queue system
3. Create prompt improvement engine
4. Generate quality reports
5. Create new directory structure

### Phase 3: Integration & UI (Week 3)

**Deliverables:**
- SeedVisualizer quality display
- Dashboard quality metrics
- Human review interface
- Automation server monitoring

**Tasks:**
1. Add quality badges to SeedVisualizer
2. Create quality summary dashboard
3. Build human review interface
4. Add automation server quality checks

### Phase 4: Testing & Refinement (Week 4)

**Deliverables:**
- Full test suite
- Documented edge cases
- Performance benchmarks
- User documentation

**Tasks:**
1. Test on all existing courses
2. Tune scoring weights based on results
3. Optimize performance
4. Write comprehensive docs

---

## Success Metrics

### Quantitative Metrics

1. **Acceptance Rate**: Target 85%+ seeds accepted on first attempt
2. **Average Score**: Target 8.0+ average quality score
3. **Retry Success Rate**: Target 70%+ retries result in acceptance
4. **Human Review Rate**: Target <5% seeds need human review
5. **False Positive Rate**: <10% of flagged seeds deemed acceptable by humans

### Qualitative Metrics

1. **Agent Learning**: Successive attempts show measurable improvement
2. **Prompt Evolution**: Suggestions lead to actionable prompt improvements
3. **Concern Accuracy**: Identified concerns align with human assessments
4. **Human Satisfaction**: Reviewers find flagged seeds genuinely problematic

---

## Future Enhancements

### Version 2.0 Features

1. **Machine Learning Integration**
   - Train model on human-reviewed extractions
   - Predict quality scores without full extraction
   - Learn optimal prompt configurations

2. **Cross-SEED Learning**
   - Identify patterns in high-scoring extractions
   - Apply successful strategies across similar SEEDs
   - Build knowledge base of edge case solutions

3. **Comparative Analysis**
   - Compare extractions across different agents
   - A/B test prompt variations
   - Identify best-performing heuristics

4. **Real-Time Feedback**
   - Stream quality scores during extraction
   - Early stopping for clearly failed attempts
   - Dynamic prompt adjustment mid-extraction

5. **Human-Agent Collaboration**
   - Human can provide hints for difficult SEEDs
   - Agent learns from human corrections
   - Interactive refinement mode

---

## Appendices

### A. Related Documents

- [02-QUALITY-RUBRIC.md](./02-QUALITY-RUBRIC.md) - Detailed scoring criteria
- [03-AMINO-ACID-SCHEMA.md](./03-AMINO-ACID-SCHEMA.md) - Complete schema documentation
- [04-SELF-REVIEW-PROMPT.md](./04-SELF-REVIEW-PROMPT.md) - Prompt template for agents
- [05-EXAMPLE-SCENARIOS.md](./05-EXAMPLE-SCENARIOS.md) - Concrete examples
- [06-IMPLEMENTATION-GUIDE.md](./06-IMPLEMENTATION-GUIDE.md) - Step-by-step implementation

### B. Glossary

- **SEED**: A translation pair (source sentence + target sentence)
- **LEGO**: A pedagogically useful phrase extracted from a SEED
- **Amino Acid**: A JSON file representing a translation, LEGO, basket, or introduction
- **Provenance**: ID format S{seed}L{position} tracking LEGO origin
- **Iron Rule**: No LEGO may begin or end with a preposition
- **Phase 3**: The LEGO extraction phase of the APML pipeline

### C. Version History

- **1.0** (2025-10-11): Initial architecture design

---

**Document Status**: Complete
**Next Steps**: Implement quality rubric (02-QUALITY-RUBRIC.md)
