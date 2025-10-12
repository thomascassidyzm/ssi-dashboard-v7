# SSi Regeneration & Quality API

**Version:** 7.0.0
**Base URL:** `http://localhost:3456/api`
**Production:** Use ngrok tunnel URL

---

## Overview

The Regeneration & Quality API provides the backend engine for the self-healing translation system. It enables:

- **Quality Analysis**: Automated quality scoring and issue detection
- **Attempt Tracking**: Complete history of regeneration attempts per SEED
- **Regeneration Orchestration**: Spawn Claude Code agents for targeted re-extraction
- **Prompt Evolution**: Learn and commit successful translation rules
- **Experimental Testing**: A/B test new rules before deployment

---

## Table of Contents

1. [Quality Endpoints](#quality-endpoints)
2. [Regeneration Endpoints](#regeneration-endpoints)
3. [Prompt Evolution Endpoints](#prompt-evolution-endpoints)
4. [Data Structures](#data-structures)
5. [Workflows](#workflows)
6. [Error Handling](#error-handling)

---

## Quality Endpoints

### GET `/api/courses/:code/quality`

Get comprehensive quality report for a course.

**Parameters:**
- `code` (path) - Course code (e.g., `mkd_for_eng_574seeds`)

**Response:**
```json
{
  "course_code": "mkd_for_eng_574seeds",
  "generated_at": "2025-10-11T12:34:56.789Z",
  "total_seeds": 574,
  "avg_quality": 82,
  "quality_distribution": {
    "excellent": 245,
    "good": 289,
    "poor": 35,
    "critical": 5
  },
  "flagged_seeds": [
    {
      "seed_id": "C0042",
      "uuid": "abc123...",
      "quality_score": 45,
      "issues": [
        {
          "type": "iron_rule_violation",
          "lego": "to the",
          "position": "S42L3"
        },
        {
          "type": "low_lego_count",
          "message": "Translation produced fewer than 2 LEGOs"
        }
      ],
      "attempts": 2,
      "last_modified": "2025-10-11T10:15:30.000Z"
    }
  ],
  "attempt_summary": {
    "total_attempts": 612,
    "avg_attempts_per_seed": 1.07,
    "seeds_with_multiple_attempts": 38
  }
}
```

**Quality Score Calculation:**
- **90-100**: Excellent - Ready for production
- **70-89**: Good - Minor issues, acceptable
- **50-69**: Poor - Significant issues, should regenerate
- **0-49**: Critical - Major violations, must regenerate

**Composite Score Formula:**
```
composite_score =
  iron_rule_compliance * 0.6 +
  lego_count_score * 0.2 +
  avg_lego_quality * 0.2
```

---

### GET `/api/courses/:code/seeds/:seedId/review`

Get detailed review for a specific SEED with complete attempt history.

**Parameters:**
- `code` (path) - Course code
- `seedId` (path) - Seed ID (e.g., `C0042`)

**Response:**
```json
{
  "seed_id": "C0042",
  "translation": {
    "uuid": "abc123...",
    "type": "translation",
    "seed_id": "C0042",
    "source": "I want to go to the shop",
    "target": "Dw i eisiau mynd i'r siop",
    "metadata": {
      "course_code": "mkd_for_eng_574seeds",
      "phase": "phase_1",
      "created_at": "2025-10-10T10:15:00.000Z",
      "updated_at": "2025-10-11T08:30:00.000Z",
      "prompt_version": "v1.2",
      "regeneration_reason": "iron_rule_violation",
      "attempt_history": [
        {
          "attempt_number": 1,
          "timestamp": "2025-10-10T10:15:00.000Z",
          "source": "I want to go to the shop",
          "target": "Dw i eisiau fynd i'r siop",
          "quality_score": 45,
          "lego_count": 4,
          "issues": [
            {
              "type": "iron_rule_violation",
              "lego": "to the",
              "position": "S42L3"
            }
          ],
          "prompt_version": "v1.0"
        }
      ],
      "status": "active"
    }
  },
  "legos": [
    {
      "uuid": "lego1...",
      "text": "Dw i eisiau",
      "provenance": "S42L1",
      "iron_rule_compliant": true
    },
    {
      "uuid": "lego2...",
      "text": "mynd i'r siop",
      "provenance": "S42L2",
      "iron_rule_compliant": true
    }
  ],
  "quality": {
    "composite_score": 85,
    "details": {
      "iron_rule_compliance": 100,
      "lego_count": 2,
      "avg_lego_quality": 78,
      "issues": []
    },
    "flagged": false
  },
  "attempts": [
    {
      "attempt_number": 1,
      "timestamp": "2025-10-10T10:15:00.000Z",
      "quality_score": 45,
      "lego_count": 4,
      "status": "archived"
    },
    {
      "attempt_number": 2,
      "timestamp": "2025-10-11T08:30:00.000Z",
      "quality_score": 85,
      "lego_count": 2,
      "status": "current"
    }
  ],
  "total_attempts": 2,
  "status": "active"
}
```

---

## Regeneration Endpoints

### POST `/api/courses/:code/seeds/regenerate`

Trigger regeneration for one or more SEEDs.

**Parameters:**
- `code` (path) - Course code

**Request Body:**
```json
{
  "seed_ids": ["C0042", "C0089", "C0123"],
  "reason": "iron_rule_violation",
  "prompt_version": "v1.2"
}
```

**Fields:**
- `seed_ids` (required) - Array of seed IDs to regenerate
- `reason` (optional) - Reason for regeneration (default: `"manual_regeneration"`)
  - Common values: `"low_quality"`, `"iron_rule_violation"`, `"low_lego_count"`, `"manual_regeneration"`
- `prompt_version` (optional) - Prompt version to use (default: latest active version)

**Response:**
```json
{
  "success": true,
  "message": "Regeneration job started for 3 seeds",
  "job": {
    "jobId": "regen_1728123456789_abc123xyz",
    "courseCode": "mkd_for_eng_574seeds",
    "seedIds": ["C0042", "C0089", "C0123"],
    "status": "in_progress",
    "reason": "iron_rule_violation",
    "promptVersion": "v1.2"
  }
}
```

**Notes:**
- Spawns a new Claude Code agent in Terminal
- Agent receives targeted prompt with specified seeds
- Attempt history is automatically preserved
- Quality assessment is performed by agent during extraction

---

### GET `/api/courses/:code/regeneration/:jobId`

Get status and results of a regeneration job.

**Parameters:**
- `code` (path) - Course code
- `jobId` (path) - Job ID returned from regenerate endpoint

**Response:**
```json
{
  "job": {
    "jobId": "regen_1728123456789_abc123xyz",
    "courseCode": "mkd_for_eng_574seeds",
    "seedIds": ["C0042", "C0089", "C0123"],
    "status": "in_progress",
    "startTime": "2025-10-11T12:00:00.000Z",
    "reason": "iron_rule_violation",
    "promptVersion": "v1.2",
    "results": []
  },
  "elapsed": 45000
}
```

**Status Values:**
- `in_progress` - Agent is working
- `completed` - All seeds regenerated successfully
- `failed` - Regeneration failed (see error details)

---

### POST `/api/courses/:code/seeds/:seedId/accept`

Mark a SEED as accepted after human review.

**Parameters:**
- `code` (path) - Course code
- `seedId` (path) - Seed ID to accept

**Response:**
```json
{
  "success": true,
  "message": "Seed C0042 marked as accepted",
  "translation": {
    "uuid": "abc123...",
    "seed_id": "C0042",
    "metadata": {
      "status": "accepted",
      "accepted_at": "2025-10-11T12:34:56.789Z",
      "reviewed": true
    }
  }
}
```

**Notes:**
- Marks translation as human-reviewed and approved
- Does not remove from quality reports (for tracking purposes)
- Can be used to prevent auto-regeneration

---

### DELETE `/api/courses/:code/seeds/:seedId`

Exclude a SEED from the corpus.

**Parameters:**
- `code` (path) - Course code
- `seedId` (path) - Seed ID to exclude

**Request Body:**
```json
{
  "reason": "untranslatable_idiom"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Seed C0042 marked as excluded",
  "translation": {
    "uuid": "abc123...",
    "seed_id": "C0042",
    "metadata": {
      "status": "excluded",
      "excluded_at": "2025-10-11T12:34:56.789Z",
      "exclusion_reason": "untranslatable_idiom"
    }
  }
}
```

**Notes:**
- Does not delete the translation (immutable)
- Marks as excluded in course metadata
- Will not appear in final course compilation

---

## Prompt Evolution Endpoints

### GET `/api/courses/:code/prompt-evolution`

Get prompt evolution history and learned rules.

**Parameters:**
- `code` (path) - Course code

**Response:**
```json
{
  "course_code": "mkd_for_eng_574seeds",
  "created_at": "2025-10-10T10:00:00.000Z",
  "versions": [
    {
      "version": "v1.0",
      "created_at": "2025-10-10T10:00:00.000Z",
      "rules": [
        "Apply 6 pedagogical heuristics",
        "IRON RULE: No LEGOs with preposition boundaries",
        "Prioritize naturalness over literal translation"
      ],
      "success_rate": 0.75,
      "status": "archived"
    },
    {
      "version": "v2.0",
      "created_at": "2025-10-11T08:00:00.000Z",
      "rules": [
        "Apply 6 pedagogical heuristics",
        "IRON RULE: No LEGOs with preposition boundaries",
        "Prioritize naturalness over literal translation",
        "Avoid splitting phrasal verbs across LEGO boundaries"
      ],
      "parent_version": "v1.0",
      "success_rate": 0.92,
      "status": "active"
    }
  ],
  "learned_rules": [
    {
      "rule": "Avoid splitting phrasal verbs across LEGO boundaries",
      "discovered_at": "2025-10-11T08:00:00.000Z",
      "test_results": {
        "success_rate": 0.92,
        "examples": [
          {
            "seed_id": "C0089",
            "before_score": 65,
            "after_score": 88,
            "improvement": "Phrasal verb 'pick up' kept together"
          }
        ]
      },
      "success_rate": 0.92,
      "status": "committed"
    }
  ],
  "experimental_rules": [
    {
      "rule": "Use contractions for more natural speech",
      "discovered_at": "2025-10-11T10:00:00.000Z",
      "test_results": {
        "success_rate": 0.65,
        "examples": []
      },
      "success_rate": 0.65,
      "status": "experimental"
    }
  ]
}
```

---

### POST `/api/courses/:code/experimental-rules`

Test a new rule on a subset of seeds before committing.

**Parameters:**
- `code` (path) - Course code

**Request Body:**
```json
{
  "rule": "Avoid splitting phrasal verbs across LEGO boundaries",
  "test_seed_ids": ["C0089", "C0123", "C0156", "C0234", "C0301"],
  "description": "Test if keeping phrasal verbs together improves LEGO quality"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Experimental rule test started on 5 seeds",
  "experiment": {
    "version": "v2.0-exp",
    "rule": "Avoid splitting phrasal verbs across LEGO boundaries",
    "description": "Test if keeping phrasal verbs together improves LEGO quality",
    "test_seed_ids": ["C0089", "C0123", "C0156", "C0234", "C0301"],
    "jobId": "regen_1728123456789_xyz789abc",
    "base_version": "v1.0"
  }
}
```

**Workflow:**
1. Submit experimental rule with test seeds
2. Agent regenerates test seeds with new rule
3. Compare quality scores before/after
4. If success rate >= 80%, commit to active prompt
5. If < 80%, keep as experimental for refinement

---

### POST `/api/courses/:code/prompt-evolution/commit`

Commit an experimental rule to the active prompt.

**Parameters:**
- `code` (path) - Course code

**Request Body:**
```json
{
  "rule": "Avoid splitting phrasal verbs across LEGO boundaries",
  "test_results": {
    "success_rate": 0.92,
    "examples": [
      {
        "seed_id": "C0089",
        "before_score": 65,
        "after_score": 88,
        "improvement": "Phrasal verb 'pick up' kept together"
      },
      {
        "seed_id": "C0123",
        "before_score": 70,
        "after_score": 90,
        "improvement": "Phrasal verb 'give up' kept together"
      }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rule committed to active prompt",
  "evolution": {
    "course_code": "mkd_for_eng_574seeds",
    "versions": [
      {
        "version": "v2.0",
        "created_at": "2025-10-11T12:34:56.789Z",
        "rules": [
          "Apply 6 pedagogical heuristics",
          "IRON RULE: No LEGOs with preposition boundaries",
          "Prioritize naturalness over literal translation",
          "Avoid splitting phrasal verbs across LEGO boundaries"
        ],
        "parent_version": "v1.0",
        "success_rate": null,
        "status": "active"
      }
    ],
    "learned_rules": [
      {
        "rule": "Avoid splitting phrasal verbs across LEGO boundaries",
        "discovered_at": "2025-10-11T12:34:56.789Z",
        "test_results": {
          "success_rate": 0.92,
          "examples": [...]
        },
        "success_rate": 0.92,
        "status": "committed"
      }
    ]
  },
  "new_version": {
    "version": "v2.0",
    "rules": [...]
  }
}
```

**Notes:**
- Success rate >= 80% required for auto-commit
- Rules with < 80% success are kept as experimental
- New version inherits all rules from parent + new rule
- Previous version is archived (not deleted)

---

## Data Structures

### Quality Score Details

```javascript
{
  iron_rule_compliance: 100,      // 0-100, penalty for preposition violations
  lego_count: 3,                  // Number of LEGOs extracted
  avg_lego_quality: 85,           // Average pedagogical score of LEGOs
  issues: [                       // Array of detected issues
    {
      type: "iron_rule_violation", // Issue type
      lego: "to the",              // Problematic LEGO text
      position: "S42L3"            // Provenance
    }
  ]
}
```

### Issue Types

- `iron_rule_violation` - LEGO starts/ends with preposition
- `low_lego_count` - Translation produced < 2 LEGOs
- `split_phrasal_verb` - Phrasal verb split across LEGOs (future)
- `low_naturalness` - Translation sounds unnatural (future)

### Attempt History Entry

```javascript
{
  attempt_number: 1,
  timestamp: "2025-10-11T12:34:56.789Z",
  source: "I want to go to the shop",
  target: "Dw i eisiau fynd i'r siop",
  quality_score: 45,
  lego_count: 4,
  issues: [...],
  prompt_version: "v1.0"
}
```

---

## Workflows

### Workflow 1: Automated Quality-Driven Regeneration

```javascript
import qualityApi from '@/services/qualityApi'

// 1. Get quality report
const report = await qualityApi.getCourseQuality('mkd_for_eng_574seeds')

// 2. Filter critical seeds
const criticalSeeds = report.flagged_seeds
  .filter(s => s.quality_score < 50)
  .map(s => s.seed_id)

// 3. Regenerate critical seeds
if (criticalSeeds.length > 0) {
  const job = await qualityApi.regenerateSeeds(
    'mkd_for_eng_574seeds',
    criticalSeeds,
    { reason: 'auto_fix_critical_quality' }
  )

  // 4. Poll for completion
  const result = await qualityApi.pollRegenerationJob(
    'mkd_for_eng_574seeds',
    job.job.jobId,
    (status) => {
      console.log(`Progress: ${status.job.status}`)
    }
  )

  console.log('Regeneration complete:', result)
}
```

---

### Workflow 2: IRON RULE Violation Batch Fix

```javascript
// 1. Get quality report
const report = await qualityApi.getCourseQuality('mkd_for_eng_574seeds')

// 2. Find IRON RULE violations
const violators = await qualityApi.regenerateByIssueType(
  'mkd_for_eng_574seeds',
  report,
  'iron_rule_violation'
)

console.log(`Regenerating ${violators.job.seedIds.length} IRON RULE violations`)
```

---

### Workflow 3: Experimental Rule Testing & Commit

```javascript
// 1. Test new rule on sample seeds
const experiment = await qualityApi.testExperimentalRule(
  'mkd_for_eng_574seeds',
  'Avoid splitting phrasal verbs across LEGO boundaries',
  ['C0089', 'C0123', 'C0156', 'C0234', 'C0301'],
  'Test phrasal verb integrity'
)

// 2. Wait for agent to complete test
await qualityApi.pollRegenerationJob(
  'mkd_for_eng_574seeds',
  experiment.experiment.jobId
)

// 3. Compare quality scores (manual or automated)
const testResults = {
  success_rate: 0.92,
  examples: [
    { seed_id: 'C0089', before_score: 65, after_score: 88 },
    { seed_id: 'C0123', before_score: 70, after_score: 90 }
  ]
}

// 4. Commit rule if successful
if (testResults.success_rate >= 0.8) {
  const result = await qualityApi.commitRule(
    'mkd_for_eng_574seeds',
    'Avoid splitting phrasal verbs across LEGO boundaries',
    testResults
  )

  console.log('Rule committed! New version:', result.new_version.version)
}
```

---

### Workflow 4: Human Review & Accept/Exclude

```javascript
// 1. Get detailed review for flagged seed
const review = await qualityApi.getSeedReview('mkd_for_eng_574seeds', 'C0042')

// 2. Human reviews attempts and LEGOs
console.log('Current quality:', review.quality.composite_score)
console.log('Attempts:', review.total_attempts)
console.log('Issues:', review.quality.details.issues)

// 3. Decision: Accept, Regenerate, or Exclude
if (humanDecision === 'accept') {
  await qualityApi.acceptSeed('mkd_for_eng_574seeds', 'C0042')
} else if (humanDecision === 'regenerate') {
  await qualityApi.regenerateSeeds(
    'mkd_for_eng_574seeds',
    ['C0042'],
    { reason: 'human_requested_improvement' }
  )
} else if (humanDecision === 'exclude') {
  await qualityApi.excludeSeed(
    'mkd_for_eng_574seeds',
    'C0042',
    'untranslatable_idiom'
  )
}
```

---

## Error Handling

All endpoints return standard error responses:

```json
{
  "error": "Failed to generate quality report",
  "message": "Course not found or no translations available"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad request (missing parameters, invalid data)
- `404` - Resource not found (course, seed, job)
- `409` - Conflict (job already in progress)
- `500` - Server error

**Common Errors:**

| Code | Error | Solution |
|------|-------|----------|
| 404 | `Course not found` | Verify course code exists in VFS |
| 404 | `Seed not found` | Check seed ID spelling and case |
| 404 | `Regeneration job not found` | Job may have expired (check jobId) |
| 400 | `Missing or invalid seed_ids array` | Ensure seed_ids is non-empty array |
| 500 | `Failed to spawn agent` | Check osascript permissions and Terminal access |

---

## Storage Locations

### VFS Directory Structure

```
vfs/courses/{courseCode}/
├── amino_acids/
│   └── translations/
│       └── {uuid}.json          # Translation with attempt_history
├── prompt_evolution/
│   ├── evolution_log.json       # Prompt versions and learned rules
│   └── experiments/
│       └── {experiment_id}.json # Experimental test results
└── course_metadata.json         # Course-level quality stats
```

### Translation Amino Acid with Attempt History

```json
{
  "uuid": "abc123...",
  "type": "translation",
  "seed_id": "C0042",
  "source": "I want to go to the shop",
  "target": "Dw i eisiau mynd i'r siop",
  "metadata": {
    "course_code": "mkd_for_eng_574seeds",
    "phase": "phase_1",
    "created_at": "2025-10-10T10:15:00.000Z",
    "updated_at": "2025-10-11T08:30:00.000Z",
    "prompt_version": "v1.2",
    "regeneration_reason": "iron_rule_violation",
    "status": "active",
    "attempt_history": [
      {
        "attempt_number": 1,
        "timestamp": "2025-10-10T10:15:00.000Z",
        "source": "I want to go to the shop",
        "target": "Dw i eisiau fynd i'r siop",
        "quality_score": 45,
        "lego_count": 4,
        "issues": [
          {
            "type": "iron_rule_violation",
            "lego": "to the",
            "position": "S42L3"
          }
        ],
        "prompt_version": "v1.0"
      }
    ]
  }
}
```

---

## Testing

### Manual Testing with curl

```bash
# Get quality report
curl http://localhost:3456/api/courses/mkd_for_eng_574seeds/quality

# Get seed review
curl http://localhost:3456/api/courses/mkd_for_eng_574seeds/seeds/C0042/review

# Regenerate seeds
curl -X POST http://localhost:3456/api/courses/mkd_for_eng_574seeds/seeds/regenerate \
  -H "Content-Type: application/json" \
  -d '{"seed_ids":["C0042","C0089"],"reason":"low_quality"}'

# Get regeneration status
curl http://localhost:3456/api/courses/mkd_for_eng_574seeds/regeneration/regen_1728123456789_abc123

# Accept seed
curl -X POST http://localhost:3456/api/courses/mkd_for_eng_574seeds/seeds/C0042/accept

# Exclude seed
curl -X DELETE http://localhost:3456/api/courses/mkd_for_eng_574seeds/seeds/C0042 \
  -H "Content-Type: application/json" \
  -d '{"reason":"untranslatable_idiom"}'

# Get prompt evolution
curl http://localhost:3456/api/courses/mkd_for_eng_574seeds/prompt-evolution

# Test experimental rule
curl -X POST http://localhost:3456/api/courses/mkd_for_eng_574seeds/experimental-rules \
  -H "Content-Type: application/json" \
  -d '{
    "rule":"Avoid splitting phrasal verbs",
    "test_seed_ids":["C0089","C0123"],
    "description":"Test phrasal verb integrity"
  }'

# Commit rule
curl -X POST http://localhost:3456/api/courses/mkd_for_eng_574seeds/prompt-evolution/commit \
  -H "Content-Type: application/json" \
  -d '{
    "rule":"Avoid splitting phrasal verbs",
    "test_results":{
      "success_rate":0.92,
      "examples":[{"seed_id":"C0089","before_score":65,"after_score":88}]
    }
  }'
```

---

## Performance Considerations

- **Quality Report**: O(n) where n = number of translations (can be slow for large courses)
- **Seed Review**: O(m) where m = number of LEGOs for that seed (fast)
- **Regeneration**: Spawns new agent process (may take minutes depending on seed count)
- **Polling**: Use 3-5 second intervals to avoid excessive server load

### Optimization Tips

1. **Cache quality reports**: Reports are expensive to generate, cache on frontend
2. **Paginate flagged seeds**: Only load top N worst seeds initially
3. **Batch regenerations**: Regenerate multiple seeds in one job when possible
4. **Use webhooks**: Consider webhook notifications instead of polling (future enhancement)

---

## Security Considerations

1. **CORS**: Configured for Vercel domain and localhost
2. **Authentication**: Not implemented (local server only)
3. **Rate Limiting**: Not implemented (add if exposing publicly)
4. **Input Validation**: All seed IDs and course codes are validated
5. **File System Access**: Server only accesses VFS directory

---

## Future Enhancements

- [ ] Webhook notifications for job completion
- [ ] Real-time WebSocket updates for job progress
- [ ] Batch operations API (regenerate all poor quality in one call)
- [ ] Quality trend analysis (track improvements over time)
- [ ] Automatic A/B testing for experimental rules
- [ ] Integration with Phase 3-6 for cascading regeneration
- [ ] Export/import prompt evolution rules across courses

---

## Support

For issues or questions:
- Check server logs: `tail -f automation_server.log`
- Verify VFS structure: `ls -la vfs/courses/{courseCode}/`
- Test with curl commands above
- Review attempt history in translation amino acids

---

**Last Updated:** 2025-10-11
**API Version:** 7.0.0
**Author:** SSi Course Production Team
