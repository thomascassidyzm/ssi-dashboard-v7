# Orchestrator API Reference - Pipeline Endpoints

## Table of Contents

1. [LUT Check Endpoint](#lut-check-endpoint)
2. [Basket Gap Analysis Endpoint](#basket-gap-analysis-endpoint)
3. [Basket Cleanup Endpoint](#basket-cleanup-endpoint)
4. [Automated Workflow](#automated-workflow)
5. [Response Schemas](#response-schemas)

---

## LUT Check Endpoint

### Endpoint
```
POST /api/courses/:courseCode/phase/3/validate
```

### Description
Runs the LUT (Learner Uncertainty Test) collision checker on Phase 3 LEGO extraction output. Validates that the LEGO registry maintains one-to-one mapping (one KNOWN key → one TARGET value).

### Parameters
- **courseCode** (path parameter): Course identifier (e.g., `spa_for_eng`)

### Request Example
```bash
curl -X POST http://localhost:3456/api/courses/spa_for_eng/phase/3/validate \
  -H "Content-Type: application/json"
```

### Success Response (No Violations)
**Status Code:** 200 OK

```json
{
  "courseCode": "spa_for_eng",
  "status": "pass",
  "collisions": 0,
  "message": "No LUT violations detected",
  "reextractionNeeded": false
}
```

### Failure Response (Violations Found)
**Status Code:** 200 OK

```json
{
  "courseCode": "spa_for_eng",
  "status": "fail",
  "collisions": 3,
  "message": "Found 3 LUT violations",
  "reextractionNeeded": true,
  "report": {
    "status": "FAIL",
    "timestamp": "2025-01-15T10:30:00Z",
    "input_file": "/path/to/lego_pairs.json",
    "total_legos": 450,
    "unique_known_legos": 445,
    "violation_count": 3,
    "violations": [
      {
        "known": "you are correct",
        "mappings": [
          {
            "target": "你是对的",
            "legos": [
              {
                "seed_id": "S0042",
                "lego_id": "S0042L05",
                "type": "ATOMIC_LEGO"
              }
            ]
          },
          {
            "target": "你们是对的",
            "legos": [
              {
                "seed_id": "S0087",
                "lego_id": "S0087L12",
                "type": "ATOMIC_LEGO"
              }
            ]
          }
        ]
      }
    ]
  },
  "manifest": {
    "reason": "FD_VIOLATIONS",
    "affected_seeds": ["S0042", "S0087"],
    "cascade_impact": {
      "phase_5_baskets": "REGENERATION_REQUIRED",
      "phase_6_instructions": "CONDITIONAL_REGENERATION",
      "phase_8_audio": "CONDITIONAL_REGENERATION"
    },
    "violations_by_seed": {
      "S0042": [
        {
          "collision_key": "you are correct",
          "conflicting_targets": ["你是对的", "你们是对的"],
          "instruction": "Registry collision: KNOWN key \"you are correct\" already exists..."
        }
      ]
    }
  }
}
```

### Error Responses

**404 Not Found**
```json
{
  "error": "lego_pairs.json not found - run Phase 3 first",
  "courseCode": "spa_for_eng"
}
```

**500 Internal Server Error**
```json
{
  "error": "Validation failed but no report generated",
  "courseCode": "spa_for_eng"
}
```

### Files Generated
- `lego_pairs_fd_report.json` - Full collision report
- `lego_pairs_reextraction_manifest.json` - Re-extraction instructions (if violations found)

---

## Basket Gap Analysis Endpoint

### Endpoint
```
GET /api/courses/:courseCode/baskets/gaps
```

### Description
Analyzes basket coverage by comparing current LEGO registry with existing baskets from GitHub main branch. Identifies baskets to keep, delete, and generate.

### Parameters
- **courseCode** (path parameter): Course identifier (e.g., `spa_for_eng`)

### Request Example
```bash
curl http://localhost:3456/api/courses/spa_for_eng/baskets/gaps
```

### Success Response
**Status Code:** 200 OK

```json
{
  "course_code": "spa_for_eng",
  "timestamp": "2025-01-15T10:30:00Z",
  "total_legos": 450,
  "existing_baskets": 430,
  "coverage_percentage": 95,
  "analysis": {
    "baskets_to_keep": 425,
    "baskets_to_delete": 5,
    "baskets_missing": 25
  },
  "baskets_to_keep": [
    "S0001L01",
    "S0001L02",
    "S0002L01"
  ],
  "baskets_to_delete": [
    "S0042L05",
    "S0087L12",
    "S0150L03"
  ],
  "baskets_missing": [
    "S0100L03",
    "S0150L07",
    "S0200L01"
  ],
  "deprecated_legos": [
    "S0042L05",
    "S0087L12"
  ],
  "next_steps": [
    "1. Delete 5 deprecated/orphaned baskets",
    "2. Generate 25 new baskets",
    "3. Verify 425 existing baskets remain valid"
  ]
}
```

### GitHub Fetch Behavior

The endpoint attempts to fetch `lego_baskets.json` from GitHub main branch in this order:

1. **gh CLI**: `gh api repos/:owner/:repo/contents/...`
2. **GitHub API**: `https://api.github.com/repos/.../contents/...`
3. **Local fallback**: `public/vfs/courses/{courseCode}/lego_baskets.json`

Console output indicates which method succeeded:
```
✅ Fetched 430 baskets from GitHub
⚠️  gh CLI failed, trying GitHub API...
⚠️  GitHub fetch failed, using local baskets file...
```

### Error Responses

**404 Not Found**
```json
{
  "error": "lego_pairs.json not found - run Phase 3 first",
  "courseCode": "spa_for_eng"
}
```

**500 Internal Server Error**
```json
{
  "error": "Basket gap analysis failed: ...",
  "courseCode": "spa_for_eng"
}
```

### Files Generated
- `basket_gaps_report.json` - Full gap analysis report

---

## Basket Cleanup Endpoint

### Endpoint
```
POST /api/courses/:courseCode/baskets/cleanup
```

### Description
Safely deletes deprecated/orphaned baskets with automatic backup and git commit.

### Parameters
- **courseCode** (path parameter): Course identifier (e.g., `spa_for_eng`)
- **basketIdsToDelete** (body parameter): Array of basket IDs to delete

### Request Example
```bash
curl -X POST http://localhost:3456/api/courses/spa_for_eng/baskets/cleanup \
  -H "Content-Type: application/json" \
  -d '{
    "basketIdsToDelete": [
      "S0042L05",
      "S0087L12",
      "S0150L03"
    ]
  }'
```

### Request Body Schema
```json
{
  "basketIdsToDelete": ["string"]
}
```

### Success Response
**Status Code:** 200 OK

```json
{
  "courseCode": "spa_for_eng",
  "success": true,
  "deleted": 3,
  "notFound": 0,
  "backupPath": "/path/to/deleted_baskets_backup.json",
  "message": "Deleted 3 baskets and saved backup"
}
```

### Partial Success Response (Some Not Found)
**Status Code:** 200 OK

```json
{
  "courseCode": "spa_for_eng",
  "success": true,
  "deleted": 2,
  "notFound": 1,
  "backupPath": "/path/to/deleted_baskets_backup.json",
  "message": "Deleted 2 baskets and saved backup"
}
```

### No-op Response (Empty Array)
**Status Code:** 200 OK

```json
{
  "courseCode": "spa_for_eng",
  "message": "No baskets to delete",
  "deleted": 0
}
```

### Error Responses

**400 Bad Request** (Missing parameter)
```json
{
  "error": "basketIdsToDelete array required in request body"
}
```

**404 Not Found** (No baskets file)
```json
{
  "error": "lego_baskets.json not found",
  "courseCode": "spa_for_eng"
}
```

**400 Bad Request** (Invalid structure)
```json
{
  "error": "Invalid lego_baskets.json structure",
  "courseCode": "spa_for_eng"
}
```

**500 Internal Server Error**
```json
{
  "error": "Basket cleanup error: ...",
  "courseCode": "spa_for_eng"
}
```

### Git Commit
If successful, the endpoint commits changes with this message format:
```
chore(spa_for_eng): cleanup 3 deprecated/orphaned baskets

Automated basket cleanup after LEGO re-extraction.

- Deleted: 3 baskets
- Backup: deleted_baskets_backup.json
- Basket IDs: S0042L05, S0087L12, S0150L03
```

Git commit failures are **non-fatal** - files are still updated and backed up.

### Files Modified/Created
- `lego_baskets.json` - Updated (baskets removed)
- `deleted_baskets_backup.json` - Created/updated (timestamped backup)

### Backup Format
```json
{
  "2025-01-15T10:30:00Z": {
    "deleted_count": 3,
    "basket_ids": ["S0042L05", "S0087L12", "S0150L03"],
    "baskets": {
      "S0042L05": {
        "id": "S0042L05",
        "known": "you are correct",
        "target": "你是对的",
        "practices": [...]
      }
    }
  }
}
```

Multiple cleanup operations append to the same backup file with new timestamps.

---

## Automated Workflow

### Trigger
The automated workflow runs when:
- Phase 3 completes
- `runPhaseValidation(courseCode, 3)` is called
- LUT check **fails** (violations found)

### Workflow Steps

```
Phase 3 Complete
       ↓
LUT Check (automatic)
       ↓
  ┌─────────┐
  │ Pass?   │
  └─────────┘
       ↓
   ┌───┴───┐
   │       │
  YES      NO
   │       │
   │       ↓
   │   Basket Gap Analysis (automatic)
   │       ↓
   │   Generate Task List (automatic)
   │       ↓
   │   Set status: validation_failed
   │       │
   ↓       ↓
Continue   BLOCK (manual intervention required)
```

### Console Output Example

```
🔬 Running Phase 3 validation for spa_for_eng...
   Running LEGO FD check...
   ❌ LEGO FD validation FAILED - learner uncertainty detected
   📄 Review report: /path/to/lego_pairs_fd_report.json

   🔄 Triggering automated basket gap analysis workflow...
   Running basket gap analysis...
   Total LEGOs in current registry: 450
   📁 Using local baskets: 430
   Deprecated LEGOs (from collisions): 2
   ✅ Analysis complete:
      Baskets to keep: 425 (94% coverage)
      Baskets to delete: 5
      Baskets missing: 25
   📄 Report saved: /path/to/basket_gaps_report.json

   📊 Basket Gap Analysis Results:
      Baskets to keep: 425
      Baskets to delete: 5
      Baskets missing: 25
      Report: /path/to/basket_gaps_report.json

   Generating re-extraction task list...
   📋 Re-extraction Task List:
      2 seeds need re-extraction
      5 baskets need cleanup
      25 new baskets needed
      Task list saved: /path/to/reextraction_task_list.json
```

### Files Generated (Automatic)

1. **lego_pairs_fd_report.json**
   - LUT collision report
   - Affected LEGO IDs
   - Violation details

2. **lego_pairs_reextraction_manifest.json**
   - Seeds to re-extract
   - Chunking-up instructions
   - Cascade impact analysis

3. **basket_gaps_report.json**
   - Baskets to keep/delete/generate
   - Coverage percentage
   - Next steps

4. **reextraction_task_list.json**
   - Consolidated action items
   - Step-by-step workflow
   - Automation flags

### Course Status After Failure

```json
{
  "courseCode": "spa_for_eng",
  "currentPhase": null,
  "status": "validation_failed",
  "waitingForApproval": false,
  "phasesCompleted": [1, 3]
}
```

Progression to Phase 5 is **blocked** until:
1. Affected seeds are re-extracted
2. LUT check passes
3. Manual approval (if in manual checkpoint mode)

---

## Response Schemas

### LUT Check Success Schema
```typescript
{
  courseCode: string;
  status: "pass";
  collisions: 0;
  message: string;
  reextractionNeeded: false;
}
```

### LUT Check Failure Schema
```typescript
{
  courseCode: string;
  status: "fail";
  collisions: number;
  message: string;
  reextractionNeeded: true;
  report: {
    status: "FAIL";
    timestamp: string;
    input_file: string;
    total_legos: number;
    unique_known_legos: number;
    violation_count: number;
    violations: Array<{
      known: string;
      mappings: Array<{
        target: string;
        legos: Array<{
          seed_id: string;
          lego_id: string;
          type: string;
        }>;
      }>;
    }>;
  };
  manifest: {
    reason: "FD_VIOLATIONS";
    affected_seeds: string[];
    cascade_impact: object;
    violations_by_seed: object;
  };
}
```

### Basket Gap Analysis Schema
```typescript
{
  course_code: string;
  timestamp: string;
  total_legos: number;
  existing_baskets: number;
  coverage_percentage: number;
  analysis: {
    baskets_to_keep: number;
    baskets_to_delete: number;
    baskets_missing: number;
  };
  baskets_to_keep: string[];
  baskets_to_delete: string[];
  baskets_missing: string[];
  deprecated_legos: string[];
  next_steps: string[];
}
```

### Basket Cleanup Schema
```typescript
{
  courseCode: string;
  success: true;
  deleted: number;
  notFound: number;
  backupPath: string;
  message: string;
}
```

---

## Usage Examples

### Complete Workflow (Manual)

```bash
# 1. Run LUT check
curl -X POST http://localhost:3456/api/courses/spa_for_eng/phase/3/validate

# 2. If violations found, analyze basket gaps
curl http://localhost:3456/api/courses/spa_for_eng/baskets/gaps

# 3. Review task list
cat public/vfs/courses/spa_for_eng/reextraction_task_list.json

# 4. Re-extract affected seeds (manual step - use Phase 3 server)

# 5. Verify LUT check now passes
curl -X POST http://localhost:3456/api/courses/spa_for_eng/phase/3/validate

# 6. Clean up deprecated baskets
curl -X POST http://localhost:3456/api/courses/spa_for_eng/baskets/cleanup \
  -H "Content-Type: application/json" \
  -d '{"basketIdsToDelete": ["S0042L05", "S0087L12"]}'

# 7. Generate new baskets (manual step - use Phase 5 server)
```

### Automated Workflow

```bash
# Start orchestrator
npm run automation

# Trigger Phase 3
curl -X POST http://localhost:3456/api/courses/spa_for_eng/start-phase \
  -H "Content-Type: application/json" \
  -d '{"phase": 3, "totalSeeds": 668}'

# LUT check runs automatically after Phase 3
# If violations found:
#   - Basket gap analysis runs automatically
#   - Task list is generated automatically
#   - Status set to validation_failed
#   - Progression blocked

# Check status
curl http://localhost:3456/api/courses/spa_for_eng/status
```

### Using with jq

```bash
# Extract basket IDs to delete
BASKET_IDS=$(curl -s http://localhost:3456/api/courses/spa_for_eng/baskets/gaps | \
  jq -c '.baskets_to_delete')

# Delete them
curl -X POST http://localhost:3456/api/courses/spa_for_eng/baskets/cleanup \
  -H "Content-Type: application/json" \
  -d "{\"basketIdsToDelete\": $BASKET_IDS}"

# Check affected seeds
curl -s -X POST http://localhost:3456/api/courses/spa_for_eng/phase/3/validate | \
  jq -r '.manifest.affected_seeds[]'
```

---

## Best Practices

1. **Always run LUT check** after Phase 3 completion
2. **Review task list** before manual re-extraction
3. **Backup verification**: Check `deleted_baskets_backup.json` after cleanup
4. **GitHub baseline**: Ensure `lego_baskets.json` is committed to GitHub main before gap analysis
5. **Git authentication**: Configure `gh` CLI for optimal GitHub fetching
6. **Error handling**: Check response status codes and handle partial failures

---

## See Also

- [ORCHESTRATOR_PIPELINE.md](./ORCHESTRATOR_PIPELINE.md) - Complete pipeline documentation
- [orchestrator-pipeline-workflow.sh](../examples/orchestrator-pipeline-workflow.sh) - Automated workflow script
- [check-lego-fd-violations.cjs](../scripts/validation/check-lego-fd-violations.cjs) - LUT checker implementation
- [analyze-basket-gaps.cjs](../scripts/validation/analyze-basket-gaps.cjs) - Gap analysis implementation
