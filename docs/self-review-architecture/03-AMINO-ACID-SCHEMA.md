# Extended Amino Acid Schema for Self-Review

## Overview

This document defines the complete JSON schema for translation amino acids extended with self-review metadata. It includes TypeScript-style type definitions, validation rules, and comprehensive examples.

**Version**: 1.0
**Created**: 2025-10-11

---

## Table of Contents

1. [Schema Definition](#schema-definition)
2. [Field Descriptions](#field-descriptions)
3. [Validation Rules](#validation-rules)
4. [Migration Path](#migration-path)
5. [Complete Examples](#complete-examples)
6. [Backwards Compatibility](#backwards-compatibility)

---

## Schema Definition

### TypeScript Interface

```typescript
interface TranslationAminoAcid {
  // ============ EXISTING FIELDS (unchanged) ============
  uuid: string;                    // 32-character hex string
  type: "translation";             // Constant
  seed_id: string;                 // Format: C0001, C0002, etc.
  source: string;                  // Source language text
  target: string;                  // Target language text
  metadata: {
    course_code: string;           // e.g., "mkd_for_eng_574seeds"
    phase: string;                 // e.g., "phase_1"
    heuristics_applied: string[];  // Array of heuristic names
    created_at: string;            // ISO 8601 timestamp
    migrated_from?: string;        // Optional migration info
  };

  // ============ NEW FIELDS FOR SELF-REVIEW ============
  lego_extraction_attempts: ExtractionAttempt[];
  quality_status: QualityStatus;
  current_quality_score: number;   // 0-10 scale
  total_attempts: number;          // Integer ≥ 1
  flagged_for_review: boolean;
  human_review_requested: boolean;
  last_reviewed_at: string;        // ISO 8601 timestamp
}

interface ExtractionAttempt {
  attempt_number: number;          // Integer ≥ 1
  timestamp: string;               // ISO 8601 timestamp
  agent_version: string;           // e.g., "phase3_v2.1"
  prompt_version: string;          // e.g., "3.0.1"
  legos_extracted: number;         // Count of LEGOs
  quality_score: QualityScore;
  concerns: Concern[];
  suggestions: Suggestion[];
  status: AttemptStatus;
  review_notes: string;
  compared_to_previous?: ComparisonResult;
}

interface QualityScore {
  overall_score: number;           // 0-10 scale, 1 decimal place
  dimension_scores: {
    iron_rule_compliance: number;  // 0-10 scale
    naturalness: number;           // 0-10 scale
    pedagogical_value: number;     // 0-10 scale
    consistency: number;           // 0-10 scale
    edge_case_handling: number;    // 0-10 scale
  };
  calculated_at: string;           // ISO 8601 timestamp
  scoring_version: string;         // e.g., "1.0"
}

interface Concern {
  concern_id: string;              // Format: c_{descriptive_name}
  severity: Severity;
  category: DimensionCategory;
  description: string;
  affected_legos: string[];        // Provenance IDs
  suggested_fix: string;
  auto_fixable: boolean;
}

interface Suggestion {
  suggestion_id: string;           // Format: s_{descriptive_name}
  type: SuggestionType;
  priority: Priority;
  current_prompt_excerpt?: string;
  suggested_change: string;
  rationale: string;
  expected_improvement: string;
}

interface ComparisonResult {
  score_delta: string;             // e.g., "+2.0", "-0.5"
  improvements: string[];
  regressions: string[];
}

type QualityStatus = "accepted" | "flagged" | "failed" | "pending_review";
type AttemptStatus = "accepted" | "flagged" | "failed" | "retry_scheduled";
type Severity = "low" | "medium" | "high" | "critical";
type Priority = "low" | "medium" | "high" | "critical";
type DimensionCategory = "iron_rule" | "naturalness" | "pedagogical" | "consistency" | "edge_case";
type SuggestionType = "prompt_improvement" | "heuristic_adjustment" | "training_data";
```

---

## Field Descriptions

### Existing Fields (Unchanged)

These fields remain identical to the current schema:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `uuid` | string | Unique identifier (32-char hex) | `"abe563fe55e11c8d67a5969e50a38651"` |
| `type` | string | Always `"translation"` | `"translation"` |
| `seed_id` | string | Corpus ID (C + 4 digits) | `"C0001"` |
| `source` | string | Source language sentence | `"I want to speak Macedonian."` |
| `target` | string | Target language sentence | `"Сакам да зборувам македонски."` |
| `metadata.course_code` | string | Course identifier | `"mkd_for_eng_574seeds"` |
| `metadata.phase` | string | Creation phase | `"phase_1"` |
| `metadata.heuristics_applied` | array | Heuristics used | `["naturalness", "frequency"]` |
| `metadata.created_at` | string | Creation timestamp (ISO 8601) | `"2025-10-10T10:18:16.477Z"` |

### New Top-Level Fields

#### `lego_extraction_attempts`

**Type**: `ExtractionAttempt[]`

**Description**: Complete history of all LEGO extraction attempts for this translation. Each attempt includes quality scores, concerns, and suggestions. Array is ordered chronologically (oldest first).

**Default**: `[]` (empty array before first extraction)

**Example**:
```json
"lego_extraction_attempts": [
  {
    "attempt_number": 1,
    "timestamp": "2025-10-11T14:00:00.000Z",
    "agent_version": "phase3_v2.0",
    "prompt_version": "3.0.0",
    "legos_extracted": 5,
    "quality_score": { "overall_score": 6.5, "..." },
    "concerns": [{ "concern_id": "c_unnatural_boundary", "..." }],
    "suggestions": [{ "suggestion_id": "s_improve_naturalness", "..." }],
    "status": "flagged",
    "review_notes": "Extraction technically correct but inconsistent granularity"
  },
  {
    "attempt_number": 2,
    "timestamp": "2025-10-11T15:30:00.000Z",
    "agent_version": "phase3_v2.1",
    "prompt_version": "3.0.1",
    "legos_extracted": 5,
    "quality_score": { "overall_score": 8.5, "..." },
    "concerns": [],
    "suggestions": [],
    "status": "accepted",
    "review_notes": "Significant improvement after prompt refinement",
    "compared_to_previous": {
      "score_delta": "+2.0",
      "improvements": ["More consistent LEGO sizes"],
      "regressions": []
    }
  }
]
```

#### `quality_status`

**Type**: `"accepted" | "flagged" | "failed" | "pending_review"`

**Description**: Current overall status of the LEGO extraction for this translation.

**Values**:
- `"accepted"`: Extraction meets quality standards (score ≥ 8.0)
- `"flagged"`: Extraction acceptable but has concerns (score 5.0-7.9)
- `"failed"`: Extraction below minimum standards (score < 5.0)
- `"pending_review"`: Awaiting human review after multiple failures

**Default**: `"pending_review"` (before first extraction)

#### `current_quality_score`

**Type**: `number` (0-10 scale, 1 decimal place)

**Description**: The overall quality score from the most recent extraction attempt. This is the same as `lego_extraction_attempts[last].quality_score.overall_score`.

**Default**: `0` (before first extraction)

**Example**: `8.5`

#### `total_attempts`

**Type**: `number` (integer ≥ 1)

**Description**: Total number of extraction attempts made for this translation. Equals `lego_extraction_attempts.length`.

**Default**: `0` (before first extraction)

**Example**: `2`

#### `flagged_for_review`

**Type**: `boolean`

**Description**: Whether this translation should be shown to a human reviewer. Set to `true` if:
- Quality status is `"flagged"` or `"failed"`
- Multiple concerns with high severity
- 3 or more extraction attempts
- Agent explicitly requests human review

**Default**: `false`

**Example**: `true`

#### `human_review_requested`

**Type**: `boolean`

**Description**: Whether the agent has explicitly requested human review. Set to `true` when:
- 3 consecutive failed attempts
- Critical concerns that cannot be auto-resolved
- Unusual SEED structure requiring human judgment

**Default**: `false`

**Example**: `false`

#### `last_reviewed_at`

**Type**: `string` (ISO 8601 timestamp)

**Description**: Timestamp of the most recent self-review (quality assessment). Updated after each extraction attempt.

**Default**: `null` (before first extraction)

**Example**: `"2025-10-11T15:30:00.000Z"`

### ExtractionAttempt Fields

#### `attempt_number`

**Type**: `number` (integer ≥ 1)

**Description**: Sequential number of this extraction attempt (1, 2, 3, ...).

**Example**: `2`

#### `timestamp`

**Type**: `string` (ISO 8601 timestamp)

**Description**: When this extraction attempt was performed.

**Example**: `"2025-10-11T15:30:00.000Z"`

#### `agent_version`

**Type**: `string`

**Description**: Version identifier of the extraction agent that performed this attempt. Useful for tracking improvements across agent versions.

**Format**: `"phase3_vX.Y"` or custom identifier

**Example**: `"phase3_v2.1"`

#### `prompt_version`

**Type**: `string`

**Description**: Version identifier of the prompt template used for this extraction. Incremented when prompt is modified based on suggestions.

**Format**: `"X.Y.Z"` (semantic versioning)

**Example**: `"3.0.1"`

#### `legos_extracted`

**Type**: `number` (integer ≥ 0)

**Description**: Count of LEGOs extracted in this attempt.

**Example**: `5`

#### `quality_score`

**Type**: `QualityScore`

**Description**: Detailed quality assessment of this extraction. See [QualityScore Schema](#qualityscore-schema).

#### `concerns`

**Type**: `Concern[]`

**Description**: Array of issues identified during self-review. Empty array if no concerns. See [Concern Schema](#concern-schema).

#### `suggestions`

**Type**: `Suggestion[]`

**Description**: Array of improvement suggestions generated by the agent. Empty array if no suggestions. See [Suggestion Schema](#suggestion-schema).

#### `status`

**Type**: `"accepted" | "flagged" | "failed" | "retry_scheduled"`

**Description**: Status of this specific attempt.

**Values**:
- `"accepted"`: This attempt's extraction was accepted
- `"flagged"`: This attempt has concerns but was accepted
- `"failed"`: This attempt failed quality standards
- `"retry_scheduled"`: This attempt failed, retry is scheduled

#### `review_notes`

**Type**: `string`

**Description**: Free-form text summarizing the agent's assessment of this extraction attempt. Should be concise (1-3 sentences).

**Example**: `"Significant improvement over attempt 1. Phrasal verb boundaries now correct. Consistency improved."`

#### `compared_to_previous`

**Type**: `ComparisonResult | undefined`

**Description**: Comparison to the previous attempt (if exists). Only present for attempts 2+.

**Structure**:
```json
{
  "score_delta": "+2.0",
  "improvements": [
    "More consistent LEGO sizes",
    "Better phrasal integrity"
  ],
  "regressions": []
}
```

### QualityScore Schema

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

**Fields**:
- `overall_score`: Weighted average of dimension scores (0-10, 1 decimal)
- `dimension_scores`: Individual scores for each quality dimension
- `calculated_at`: ISO 8601 timestamp of score calculation
- `scoring_version`: Version of scoring rubric used (for future changes)

### Concern Schema

```json
{
  "concern_id": "c_phrasal_verb_split",
  "severity": "medium",
  "category": "naturalness",
  "description": "Phrasal verb 'going to' split across LEGO boundaries",
  "affected_legos": ["S5L2", "S5L3"],
  "suggested_fix": "Keep 'going to' together as single unit",
  "auto_fixable": false
}
```

**Fields**:
- `concern_id`: Unique identifier using format `c_{descriptive_name}`
- `severity`: One of `"low"`, `"medium"`, `"high"`, `"critical"`
- `category`: One of `"iron_rule"`, `"naturalness"`, `"pedagogical"`, `"consistency"`, `"edge_case"`
- `description`: Human-readable explanation of the concern
- `affected_legos`: Array of provenance IDs (e.g., `["S5L2"]`)
- `suggested_fix`: Actionable recommendation to address the concern
- `auto_fixable`: Boolean indicating if this can be automatically corrected

### Suggestion Schema

```json
{
  "suggestion_id": "s_improve_naturalness",
  "type": "prompt_improvement",
  "priority": "high",
  "current_prompt_excerpt": "Extract phrases that are pedagogically useful...",
  "suggested_change": "Add explicit rule: 'Keep phrasal verbs together (e.g., going to, want to)'",
  "rationale": "Current prompt doesn't address phrasal verb splitting",
  "expected_improvement": "+1.5 points in naturalness score"
}
```

**Fields**:
- `suggestion_id`: Unique identifier using format `s_{descriptive_name}`
- `type`: One of `"prompt_improvement"`, `"heuristic_adjustment"`, `"training_data"`
- `priority`: One of `"low"`, `"medium"`, `"high"`, `"critical"`
- `current_prompt_excerpt`: Relevant portion of current prompt (optional)
- `suggested_change`: Specific modification to make
- `rationale`: Explanation of why this would help
- `expected_improvement`: Predicted impact (qualitative or quantitative)

---

## Validation Rules

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "uuid",
    "type",
    "seed_id",
    "source",
    "target",
    "metadata",
    "lego_extraction_attempts",
    "quality_status",
    "current_quality_score",
    "total_attempts",
    "flagged_for_review",
    "human_review_requested",
    "last_reviewed_at"
  ],
  "properties": {
    "uuid": {
      "type": "string",
      "pattern": "^[a-f0-9]{32}$"
    },
    "type": {
      "type": "string",
      "enum": ["translation"]
    },
    "seed_id": {
      "type": "string",
      "pattern": "^C[0-9]{4}$"
    },
    "source": {
      "type": "string",
      "minLength": 1
    },
    "target": {
      "type": "string",
      "minLength": 1
    },
    "metadata": {
      "type": "object",
      "required": ["course_code", "phase", "heuristics_applied", "created_at"],
      "properties": {
        "course_code": { "type": "string" },
        "phase": { "type": "string" },
        "heuristics_applied": {
          "type": "array",
          "items": { "type": "string" }
        },
        "created_at": {
          "type": "string",
          "format": "date-time"
        },
        "migrated_from": { "type": "string" }
      }
    },
    "lego_extraction_attempts": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "attempt_number",
          "timestamp",
          "agent_version",
          "prompt_version",
          "legos_extracted",
          "quality_score",
          "concerns",
          "suggestions",
          "status",
          "review_notes"
        ],
        "properties": {
          "attempt_number": {
            "type": "integer",
            "minimum": 1
          },
          "timestamp": {
            "type": "string",
            "format": "date-time"
          },
          "agent_version": { "type": "string" },
          "prompt_version": { "type": "string" },
          "legos_extracted": {
            "type": "integer",
            "minimum": 0
          },
          "quality_score": {
            "type": "object",
            "required": ["overall_score", "dimension_scores", "calculated_at", "scoring_version"],
            "properties": {
              "overall_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 10
              },
              "dimension_scores": {
                "type": "object",
                "required": [
                  "iron_rule_compliance",
                  "naturalness",
                  "pedagogical_value",
                  "consistency",
                  "edge_case_handling"
                ],
                "properties": {
                  "iron_rule_compliance": { "type": "number", "minimum": 0, "maximum": 10 },
                  "naturalness": { "type": "number", "minimum": 0, "maximum": 10 },
                  "pedagogical_value": { "type": "number", "minimum": 0, "maximum": 10 },
                  "consistency": { "type": "number", "minimum": 0, "maximum": 10 },
                  "edge_case_handling": { "type": "number", "minimum": 0, "maximum": 10 }
                }
              },
              "calculated_at": { "type": "string", "format": "date-time" },
              "scoring_version": { "type": "string" }
            }
          },
          "concerns": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "concern_id",
                "severity",
                "category",
                "description",
                "affected_legos",
                "suggested_fix",
                "auto_fixable"
              ],
              "properties": {
                "concern_id": { "type": "string", "pattern": "^c_[a-z_]+$" },
                "severity": { "enum": ["low", "medium", "high", "critical"] },
                "category": { "enum": ["iron_rule", "naturalness", "pedagogical", "consistency", "edge_case"] },
                "description": { "type": "string", "minLength": 1 },
                "affected_legos": {
                  "type": "array",
                  "items": { "type": "string", "pattern": "^S[0-9]+L[0-9]+$" }
                },
                "suggested_fix": { "type": "string", "minLength": 1 },
                "auto_fixable": { "type": "boolean" }
              }
            }
          },
          "suggestions": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "suggestion_id",
                "type",
                "priority",
                "suggested_change",
                "rationale",
                "expected_improvement"
              ],
              "properties": {
                "suggestion_id": { "type": "string", "pattern": "^s_[a-z_]+$" },
                "type": { "enum": ["prompt_improvement", "heuristic_adjustment", "training_data"] },
                "priority": { "enum": ["low", "medium", "high", "critical"] },
                "current_prompt_excerpt": { "type": "string" },
                "suggested_change": { "type": "string", "minLength": 1 },
                "rationale": { "type": "string", "minLength": 1 },
                "expected_improvement": { "type": "string", "minLength": 1 }
              }
            }
          },
          "status": { "enum": ["accepted", "flagged", "failed", "retry_scheduled"] },
          "review_notes": { "type": "string", "minLength": 1 },
          "compared_to_previous": {
            "type": "object",
            "required": ["score_delta", "improvements", "regressions"],
            "properties": {
              "score_delta": { "type": "string", "pattern": "^[+-][0-9]+\\.[0-9]$" },
              "improvements": {
                "type": "array",
                "items": { "type": "string" }
              },
              "regressions": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          }
        }
      }
    },
    "quality_status": { "enum": ["accepted", "flagged", "failed", "pending_review"] },
    "current_quality_score": {
      "type": "number",
      "minimum": 0,
      "maximum": 10
    },
    "total_attempts": {
      "type": "integer",
      "minimum": 0
    },
    "flagged_for_review": { "type": "boolean" },
    "human_review_requested": { "type": "boolean" },
    "last_reviewed_at": {
      "type": ["string", "null"],
      "format": "date-time"
    }
  }
}
```

### Business Logic Validation

In addition to JSON schema validation, implement these business rules:

```javascript
function validateTranslationAminoAcid(amino) {
  // Rule 1: total_attempts must equal lego_extraction_attempts.length
  if (amino.total_attempts !== amino.lego_extraction_attempts.length) {
    throw new Error('total_attempts must equal lego_extraction_attempts.length');
  }

  // Rule 2: attempt_numbers must be sequential (1, 2, 3, ...)
  for (let i = 0; i < amino.lego_extraction_attempts.length; i++) {
    if (amino.lego_extraction_attempts[i].attempt_number !== i + 1) {
      throw new Error('attempt_numbers must be sequential starting from 1');
    }
  }

  // Rule 3: current_quality_score must match last attempt's overall_score
  if (amino.lego_extraction_attempts.length > 0) {
    let lastAttempt = amino.lego_extraction_attempts[amino.lego_extraction_attempts.length - 1];
    if (amino.current_quality_score !== lastAttempt.quality_score.overall_score) {
      throw new Error('current_quality_score must match last attempt overall_score');
    }
  }

  // Rule 4: timestamps must be chronologically ordered
  for (let i = 1; i < amino.lego_extraction_attempts.length; i++) {
    let prevTime = new Date(amino.lego_extraction_attempts[i - 1].timestamp);
    let currTime = new Date(amino.lego_extraction_attempts[i].timestamp);
    if (currTime <= prevTime) {
      throw new Error('Attempt timestamps must be chronologically ordered');
    }
  }

  // Rule 5: quality_status must align with current_quality_score
  if (amino.current_quality_score >= 8.0 && amino.quality_status !== 'accepted') {
    console.warn('Score ≥8 should have status "accepted"');
  }
  if (amino.current_quality_score < 5.0 && amino.quality_status === 'accepted') {
    throw new Error('Score <5 cannot have status "accepted"');
  }

  // Rule 6: compared_to_previous only exists for attempts 2+
  if (amino.lego_extraction_attempts.length > 1) {
    for (let i = 0; i < amino.lego_extraction_attempts.length; i++) {
      let hasComparison = amino.lego_extraction_attempts[i].compared_to_previous !== undefined;
      if (i === 0 && hasComparison) {
        throw new Error('First attempt cannot have compared_to_previous');
      }
      if (i > 0 && !hasComparison) {
        console.warn(`Attempt ${i + 1} should have compared_to_previous`);
      }
    }
  }

  // Rule 7: concern IDs must follow format c_{name}
  for (let attempt of amino.lego_extraction_attempts) {
    for (let concern of attempt.concerns) {
      if (!/^c_[a-z_]+$/.test(concern.concern_id)) {
        throw new Error(`Invalid concern_id format: ${concern.concern_id}`);
      }
    }
  }

  // Rule 8: suggestion IDs must follow format s_{name}
  for (let attempt of amino.lego_extraction_attempts) {
    for (let suggestion of attempt.suggestions) {
      if (!/^s_[a-z_]+$/.test(suggestion.suggestion_id)) {
        throw new Error(`Invalid suggestion_id format: ${suggestion.suggestion_id}`);
      }
    }
  }

  return true;
}
```

---

## Migration Path

### Adding Self-Review to Existing Translations

For existing translation amino acids without self-review metadata:

```javascript
async function migrateExistingTranslation(oldTranslation) {
  // Add new fields with default values
  let extendedTranslation = {
    ...oldTranslation,
    lego_extraction_attempts: [],
    quality_status: "pending_review",
    current_quality_score: 0,
    total_attempts: 0,
    flagged_for_review: false,
    human_review_requested: false,
    last_reviewed_at: null
  };

  return extendedTranslation;
}
```

### Populating History for Previously Extracted LEGOs

If LEGOs were already extracted (Phase 3 complete), create a synthetic first attempt:

```javascript
async function createSyntheticAttempt(translation, existingLegos) {
  // Create a retroactive attempt record
  let syntheticAttempt = {
    attempt_number: 1,
    timestamp: translation.metadata.created_at,
    agent_version: "phase3_v1.0_legacy",
    prompt_version: "1.0.0",
    legos_extracted: existingLegos.length,
    quality_score: {
      overall_score: 7.5, // Default "unknown but assumed OK"
      dimension_scores: {
        iron_rule_compliance: 10, // Assumed compliant
        naturalness: 7,
        pedagogical_value: 7,
        consistency: 7,
        edge_case_handling: 8
      },
      calculated_at: translation.metadata.created_at,
      scoring_version: "0.0_retroactive"
    },
    concerns: [],
    suggestions: [],
    status: "accepted",
    review_notes: "Legacy extraction before self-review system was implemented"
  };

  return {
    ...translation,
    lego_extraction_attempts: [syntheticAttempt],
    quality_status: "accepted",
    current_quality_score: 7.5,
    total_attempts: 1,
    flagged_for_review: false,
    human_review_requested: false,
    last_reviewed_at: translation.metadata.created_at
  };
}
```

---

## Complete Examples

### Example 1: Accepted on First Attempt

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
    "heuristics_applied": ["naturalness", "frequency", "clarity", "brevity", "consistency", "utility"],
    "created_at": "2025-10-10T10:18:16.477Z",
    "migrated_from": "legacy_format"
  },
  "lego_extraction_attempts": [
    {
      "attempt_number": 1,
      "timestamp": "2025-10-11T14:00:00.000Z",
      "agent_version": "phase3_v2.1",
      "prompt_version": "3.0.1",
      "legos_extracted": 5,
      "quality_score": {
        "overall_score": 8.8,
        "dimension_scores": {
          "iron_rule_compliance": 10,
          "naturalness": 9,
          "pedagogical_value": 8,
          "consistency": 8,
          "edge_case_handling": 9
        },
        "calculated_at": "2025-10-11T14:00:00.123Z",
        "scoring_version": "1.0"
      },
      "concerns": [],
      "suggestions": [],
      "status": "accepted",
      "review_notes": "Excellent extraction. Natural boundaries, high pedagogical value, no issues detected."
    }
  ],
  "quality_status": "accepted",
  "current_quality_score": 8.8,
  "total_attempts": 1,
  "flagged_for_review": false,
  "human_review_requested": false,
  "last_reviewed_at": "2025-10-11T14:00:00.123Z"
}
```

### Example 2: Flagged, Then Improved on Retry

```json
{
  "uuid": "722f52212948b6daa5ff969919968c52",
  "type": "translation",
  "seed_id": "C0005",
  "source": "I'm going to practise speaking",
  "target": "Ќе вежбам зборување",
  "metadata": {
    "course_code": "mkd_for_eng_574seeds",
    "phase": "phase_1",
    "heuristics_applied": ["naturalness", "frequency", "clarity"],
    "created_at": "2025-10-10T10:18:18.123Z"
  },
  "lego_extraction_attempts": [
    {
      "attempt_number": 1,
      "timestamp": "2025-10-11T14:05:00.000Z",
      "agent_version": "phase3_v2.0",
      "prompt_version": "3.0.0",
      "legos_extracted": 4,
      "quality_score": {
        "overall_score": 6.2,
        "dimension_scores": {
          "iron_rule_compliance": 10,
          "naturalness": 5,
          "pedagogical_value": 7,
          "consistency": 5,
          "edge_case_handling": 8
        },
        "calculated_at": "2025-10-11T14:05:00.456Z",
        "scoring_version": "1.0"
      },
      "concerns": [
        {
          "concern_id": "c_phrasal_verb_split",
          "severity": "medium",
          "category": "naturalness",
          "description": "Phrasal verb 'going to' split across LEGOs. LEGO 'I'm going' and LEGO 'to practise' should keep 'going to' together.",
          "affected_legos": ["S5L1", "S5L2"],
          "suggested_fix": "Create LEGOs that preserve 'going to' as unit: 'I'm going to practise'",
          "auto_fixable": false
        },
        {
          "concern_id": "c_inconsistent_granularity",
          "severity": "medium",
          "category": "consistency",
          "description": "LEGO sizes vary widely: 2, 2, 3, 2 words. Prefer more consistent chunking.",
          "affected_legos": ["S5L1", "S5L2", "S5L3", "S5L4"],
          "suggested_fix": "Aim for 3-5 word LEGOs with consistent patterns",
          "auto_fixable": false
        }
      ],
      "suggestions": [
        {
          "suggestion_id": "s_preserve_phrasal_verbs",
          "type": "prompt_improvement",
          "priority": "high",
          "current_prompt_excerpt": "Extract pedagogically useful phrases...",
          "suggested_change": "Add explicit rule: 'Phrasal verbs (e.g., going to, want to, have to) must never be split across boundaries.'",
          "rationale": "Phrasal verb 'going to' was split, reducing naturalness score significantly",
          "expected_improvement": "+2.0 points in naturalness"
        },
        {
          "suggestion_id": "s_target_word_count",
          "type": "prompt_improvement",
          "priority": "medium",
          "current_prompt_excerpt": "Extract phrases...",
          "suggested_change": "Add guideline: 'Target 3-5 words per LEGO for optimal pedagogical value.'",
          "rationale": "LEGOs too small (avg 2.25 words), affecting pedagogical value and consistency",
          "expected_improvement": "+1.5 points in consistency"
        }
      ],
      "status": "flagged",
      "review_notes": "Technically compliant with Iron Rule but poor naturalness due to phrasal verb split. Flagged for improvement."
    },
    {
      "attempt_number": 2,
      "timestamp": "2025-10-11T14:15:00.000Z",
      "agent_version": "phase3_v2.1",
      "prompt_version": "3.0.1",
      "legos_extracted": 5,
      "quality_score": {
        "overall_score": 8.6,
        "dimension_scores": {
          "iron_rule_compliance": 10,
          "naturalness": 9,
          "pedagogical_value": 8,
          "consistency": 8,
          "edge_case_handling": 8
        },
        "calculated_at": "2025-10-11T14:15:00.789Z",
        "scoring_version": "1.0"
      },
      "concerns": [],
      "suggestions": [],
      "status": "accepted",
      "review_notes": "Excellent improvement. Phrasal verb 'going to' now preserved. Consistent LEGO sizes (3-5 words). All criteria met.",
      "compared_to_previous": {
        "score_delta": "+2.4",
        "improvements": [
          "Phrasal verb 'going to' now kept together",
          "More consistent LEGO sizes (3-5 words)",
          "Better overall naturalness"
        ],
        "regressions": []
      }
    }
  ],
  "quality_status": "accepted",
  "current_quality_score": 8.6,
  "total_attempts": 2,
  "flagged_for_review": false,
  "human_review_requested": false,
  "last_reviewed_at": "2025-10-11T14:15:00.789Z"
}
```

### Example 3: Failed Multiple Times, Needs Human Review

```json
{
  "uuid": "xyz123abc456def789abc123def456789",
  "type": "translation",
  "seed_id": "C0042",
  "source": "I'd like to be able to speak Macedonian fluently, confidently, and naturally.",
  "target": "Би сакал да можам да зборувам македонски течно, сигурно и природно.",
  "metadata": {
    "course_code": "mkd_for_eng_574seeds",
    "phase": "phase_1",
    "heuristics_applied": ["naturalness", "frequency"],
    "created_at": "2025-10-10T10:19:00.000Z"
  },
  "lego_extraction_attempts": [
    {
      "attempt_number": 1,
      "timestamp": "2025-10-11T14:30:00.000Z",
      "agent_version": "phase3_v2.0",
      "prompt_version": "3.0.0",
      "legos_extracted": 8,
      "quality_score": {
        "overall_score": 4.8,
        "dimension_scores": {
          "iron_rule_compliance": 7,
          "naturalness": 4,
          "pedagogical_value": 5,
          "consistency": 3,
          "edge_case_handling": 7
        },
        "calculated_at": "2025-10-11T14:30:00.123Z",
        "scoring_version": "1.0"
      },
      "concerns": [
        {
          "concern_id": "c_iron_rule_violation",
          "severity": "critical",
          "category": "iron_rule",
          "description": "LEGO 'to be' starts with preposition 'to'",
          "affected_legos": ["S42L2"],
          "suggested_fix": "Extend to 'I'd like to be' or contract to 'be able'",
          "auto_fixable": false
        },
        {
          "concern_id": "c_too_small",
          "severity": "medium",
          "category": "pedagogical",
          "description": "Multiple 2-word LEGOs with low pedagogical value",
          "affected_legos": ["S42L2", "S42L3", "S42L7"],
          "suggested_fix": "Combine into larger, more meaningful phrases",
          "auto_fixable": false
        },
        {
          "concern_id": "c_inconsistent_granularity",
          "severity": "high",
          "category": "consistency",
          "description": "LEGO sizes vary dramatically: 2, 2, 2, 3, 2, 1, 1, 2 words. No clear pattern.",
          "affected_legos": ["S42L1", "S42L2", "S42L3", "S42L4", "S42L5", "S42L6", "S42L7", "S42L8"],
          "suggested_fix": "Apply systematic chunking strategy",
          "auto_fixable": false
        }
      ],
      "suggestions": [
        {
          "suggestion_id": "s_handle_complex_sentences",
          "type": "prompt_improvement",
          "priority": "critical",
          "current_prompt_excerpt": "Extract phrases...",
          "suggested_change": "Add guidance: 'For complex sentences with multiple clauses, identify major constituents first, then chunk appropriately.'",
          "rationale": "This SEED is unusually long and complex. Current prompt doesn't handle well.",
          "expected_improvement": "+3 points in consistency, naturalness"
        }
      ],
      "status": "failed",
      "review_notes": "Sentence too complex for current heuristics. Iron Rule violation. Highly inconsistent chunking. Retry needed."
    },
    {
      "attempt_number": 2,
      "timestamp": "2025-10-11T14:45:00.000Z",
      "agent_version": "phase3_v2.1",
      "prompt_version": "3.0.1",
      "legos_extracted": 6,
      "quality_score": {
        "overall_score": 5.5,
        "dimension_scores": {
          "iron_rule_compliance": 10,
          "naturalness": 5,
          "pedagogical_value": 6,
          "consistency": 4,
          "edge_case_handling": 8
        },
        "calculated_at": "2025-10-11T14:45:00.456Z",
        "scoring_version": "1.0"
      },
      "concerns": [
        {
          "concern_id": "c_unnatural_boundary",
          "severity": "medium",
          "category": "naturalness",
          "description": "Breaking 'able to speak' across boundaries feels unnatural",
          "affected_legos": ["S42L2", "S42L3"],
          "suggested_fix": "Keep 'able to speak' together or segment differently",
          "auto_fixable": false
        },
        {
          "concern_id": "c_inconsistent_granularity",
          "severity": "medium",
          "category": "consistency",
          "description": "Still inconsistent: 4, 3, 2, 5, 1, 1 words",
          "affected_legos": ["S42L1", "S42L2", "S42L3", "S42L4", "S42L5", "S42L6"],
          "suggested_fix": "Rethink segmentation strategy for this complex SEED",
          "auto_fixable": false
        }
      ],
      "suggestions": [
        {
          "suggestion_id": "s_request_human_review",
          "type": "prompt_improvement",
          "priority": "critical",
          "suggested_change": "Escalate to human reviewer for complex sentences like this",
          "rationale": "Two attempts failed to find natural segmentation. Human judgment needed.",
          "expected_improvement": "N/A - requires human intervention"
        }
      ],
      "status": "failed",
      "review_notes": "Improvement (no Iron Rule violations) but still unnatural. Complex sentence structure defeating heuristics.",
      "compared_to_previous": {
        "score_delta": "+0.7",
        "improvements": ["Iron Rule compliance achieved", "Fewer LEGOs (better focus)"],
        "regressions": []
      }
    },
    {
      "attempt_number": 3,
      "timestamp": "2025-10-11T15:00:00.000Z",
      "agent_version": "phase3_v2.1",
      "prompt_version": "3.0.2",
      "legos_extracted": 5,
      "quality_score": {
        "overall_score": 6.1,
        "dimension_scores": {
          "iron_rule_compliance": 10,
          "naturalness": 6,
          "pedagogical_value": 7,
          "consistency": 5,
          "edge_case_handling": 8
        },
        "calculated_at": "2025-10-11T15:00:00.789Z",
        "scoring_version": "1.0"
      },
      "concerns": [
        {
          "concern_id": "c_unnatural_boundary",
          "severity": "medium",
          "category": "naturalness",
          "description": "Segmentation still feels forced due to sentence complexity",
          "affected_legos": ["S42L1", "S42L2", "S42L3"],
          "suggested_fix": "Human review required",
          "auto_fixable": false
        }
      ],
      "suggestions": [],
      "status": "failed",
      "review_notes": "Three attempts made. Marginal improvements but cannot achieve acceptable quality (≥8.0). This SEED requires human judgment due to unusual complexity. Recommending human review.",
      "compared_to_previous": {
        "score_delta": "+0.6",
        "improvements": ["Better consistency", "Improved pedagogical value"],
        "regressions": []
      }
    }
  ],
  "quality_status": "pending_review",
  "current_quality_score": 6.1,
  "total_attempts": 3,
  "flagged_for_review": true,
  "human_review_requested": true,
  "last_reviewed_at": "2025-10-11T15:00:00.789Z"
}
```

---

## Backwards Compatibility

### Reading Old Format

When loading a translation amino acid, check for presence of new fields:

```javascript
async function loadTranslation(uuid) {
  let data = await fs.readJson(`translations/${uuid}.json`);

  // Check if it has self-review metadata
  if (!data.lego_extraction_attempts) {
    // Old format - migrate on load
    data = await migrateExistingTranslation(data);
  }

  return data;
}
```

### Gradual Migration Strategy

1. **Phase 1**: Read old format, write new format (one-way migration)
2. **Phase 2**: All new extractions use new format
3. **Phase 3**: Batch migrate all existing translations
4. **Phase 4**: Remove old format support

---

## File Size Considerations

### Estimated Size Impact

**Old format**: ~300 bytes per translation

**New format**:
- Minimal (1 attempt, no concerns): ~1.5 KB (+5x)
- Typical (2 attempts, few concerns): ~3 KB (+10x)
- Complex (3 attempts, many concerns): ~5 KB (+17x)

**For 51 translations**:
- Old total: ~15 KB
- New total: ~75-150 KB (acceptable)

### Optimization Options

If file sizes become problematic:

1. **Compress concerns/suggestions**: Use IDs only, store descriptions in separate lookup
2. **Archive old attempts**: Move attempts 1-N to separate archive file, keep only latest
3. **Gzip compression**: Enable for JSON storage
4. **Database storage**: Move to SQLite or similar for large corpora

---

## Appendix: TypeScript Implementation

### Full TypeScript Types

```typescript
// Save to: src/types/amino-acids.ts

export type QualityStatus = "accepted" | "flagged" | "failed" | "pending_review";
export type AttemptStatus = "accepted" | "flagged" | "failed" | "retry_scheduled";
export type Severity = "low" | "medium" | "high" | "critical";
export type Priority = "low" | "medium" | "high" | "critical";
export type DimensionCategory = "iron_rule" | "naturalness" | "pedagogical" | "consistency" | "edge_case";
export type SuggestionType = "prompt_improvement" | "heuristic_adjustment" | "training_data";

export interface TranslationMetadata {
  course_code: string;
  phase: string;
  heuristics_applied: string[];
  created_at: string;
  migrated_from?: string;
}

export interface QualityScore {
  overall_score: number;
  dimension_scores: {
    iron_rule_compliance: number;
    naturalness: number;
    pedagogical_value: number;
    consistency: number;
    edge_case_handling: number;
  };
  calculated_at: string;
  scoring_version: string;
}

export interface Concern {
  concern_id: string;
  severity: Severity;
  category: DimensionCategory;
  description: string;
  affected_legos: string[];
  suggested_fix: string;
  auto_fixable: boolean;
}

export interface Suggestion {
  suggestion_id: string;
  type: SuggestionType;
  priority: Priority;
  current_prompt_excerpt?: string;
  suggested_change: string;
  rationale: string;
  expected_improvement: string;
}

export interface ComparisonResult {
  score_delta: string;
  improvements: string[];
  regressions: string[];
}

export interface ExtractionAttempt {
  attempt_number: number;
  timestamp: string;
  agent_version: string;
  prompt_version: string;
  legos_extracted: number;
  quality_score: QualityScore;
  concerns: Concern[];
  suggestions: Suggestion[];
  status: AttemptStatus;
  review_notes: string;
  compared_to_previous?: ComparisonResult;
}

export interface TranslationAminoAcid {
  uuid: string;
  type: "translation";
  seed_id: string;
  source: string;
  target: string;
  metadata: TranslationMetadata;
  lego_extraction_attempts: ExtractionAttempt[];
  quality_status: QualityStatus;
  current_quality_score: number;
  total_attempts: number;
  flagged_for_review: boolean;
  human_review_requested: boolean;
  last_reviewed_at: string | null;
}
```

---

**Document Status**: Complete
**Next Steps**: Create self-review prompt template (04-SELF-REVIEW-PROMPT.md)
