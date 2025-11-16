# Automated Orchestrator Pipeline - LUT Check & Basket Gap Analysis

## Overview

The orchestrator now includes an automated quality control workflow that bridges Phase 3 (LEGO extraction) and Phase 5 (basket generation). This pipeline automatically detects LEGO registry collisions (LUT violations), analyzes basket gaps, and generates consolidated re-extraction task lists.

## Architecture

```
Phase 3 Complete
       ↓
LUT Check (Automatic)
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
   │   Basket Gap Analysis (Automatic)
   │       ↓
   │   Generate Task List (Automatic)
   │       ↓
   │   Block Progression
   │       │
   ↓       ↓
Continue   Manual Re-extraction Required
```

## New Endpoints

### 1. LUT Check Endpoint

**`POST /api/courses/:courseCode/phase/3/validate`**

Validates LEGO registry integrity by running the LUT (Learner Uncertainty Test) collision checker.

**Request:**
```bash
curl -X POST http://localhost:3456/api/courses/spa_for_eng/phase/3/validate
```

**Response (Pass):**
```json
{
  "courseCode": "spa_for_eng",
  "status": "pass",
  "collisions": 0,
  "message": "No LUT violations detected",
  "reextractionNeeded": false
}
```

**Response (Fail):**
```json
{
  "courseCode": "spa_for_eng",
  "status": "fail",
  "collisions": 3,
  "message": "Found 3 LUT violations",
  "reextractionNeeded": true,
  "report": {
    "status": "FAIL",
    "violation_count": 3,
    "violations": [...]
  },
  "manifest": {
    "affected_seeds": ["S0042", "S0087"],
    "cascade_impact": {...}
  }
}
```

**What it does:**
- Runs `/scripts/validation/check-lego-fd-violations.cjs` on the course
- Returns collision report with affected seeds
- Generates re-extraction manifest if violations found
- Used in automated Phase 3 validation workflow

---

### 2. Basket Gap Analysis Endpoint

**`GET /api/courses/:courseCode/baskets/gaps`**

Analyzes which baskets need to be kept, deleted, or generated after LEGO re-extraction.

**Request:**
```bash
curl http://localhost:3456/api/courses/spa_for_eng/baskets/gaps
```

**Response:**
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
  "baskets_to_keep": ["S0001L01", "S0001L02", ...],
  "baskets_to_delete": ["S0042L05", "S0087L12", ...],
  "baskets_missing": ["S0100L03", "S0150L07", ...],
  "deprecated_legos": ["S0042L05", "S0087L12"],
  "next_steps": [
    "1. Delete 5 deprecated/orphaned baskets",
    "2. Generate 25 new baskets",
    "3. Verify 425 existing baskets remain valid"
  ]
}
```

**What it does:**
- Fetches `lego_baskets.json` from GitHub main branch (production baseline)
- Compares with current `lego_pairs.json` (local/updated registry)
- Identifies deprecated LEGOs from collision report
- Returns baskets to keep, delete, and generate
- Saves report to `basket_gaps_report.json`

**GitHub Fetch Strategy:**
1. Try `gh` CLI first: `gh api repos/:owner/:repo/contents/...`
2. Fall back to GitHub API via node-fetch
3. Fall back to local file if GitHub unavailable

---

### 3. Basket Cleanup Endpoint

**`POST /api/courses/:courseCode/baskets/cleanup`**

Safely deletes deprecated/orphaned baskets with automatic backup and git commit.

**Request:**
```bash
curl -X POST http://localhost:3456/api/courses/spa_for_eng/baskets/cleanup \
  -H "Content-Type: application/json" \
  -d '{
    "basketIdsToDelete": ["S0042L05", "S0087L12"]
  }'
```

**Response:**
```json
{
  "courseCode": "spa_for_eng",
  "success": true,
  "deleted": 2,
  "notFound": 0,
  "backupPath": "/path/to/deleted_baskets_backup.json",
  "message": "Deleted 2 baskets and saved backup"
}
```

**What it does:**
- Loads `lego_baskets.json`
- Backs up deleted baskets to `deleted_baskets_backup.json` (timestamped)
- Removes baskets from `lego_baskets.json`
- Commits changes to git with descriptive message
- Returns deletion summary

**Safety Features:**
- Timestamped backups allow recovery
- Non-existent basket IDs are logged but don't fail the operation
- Git commit is non-fatal (warns if it fails)
- Backup is always saved before deletion

---

## Automated Workflow

### When Phase 3 Completes

The orchestrator automatically:

1. **Runs LUT Check** (`runPhaseValidation`)
   - Executes `check-lego-fd-violations.cjs`
   - If PASS: Continue to next phase
   - If FAIL: Trigger automated workflow

2. **Triggers Basket Gap Analysis** (automatic)
   - Runs `runBasketGapAnalysis()`
   - Compares local LEGOs with GitHub baskets
   - Identifies deprecated and missing baskets

3. **Generates Re-extraction Task List** (automatic)
   - Consolidates FD report and gap analysis
   - Creates `reextraction_task_list.json`
   - Lists all action items with automation status

4. **Blocks Progression**
   - Sets course status to `validation_failed`
   - Requires manual re-extraction before continuing

### Consolidated Task List

Generated at: `public/vfs/courses/{courseCode}/reextraction_task_list.json`

```json
{
  "course_code": "spa_for_eng",
  "timestamp": "2025-01-15T10:30:00Z",
  "workflow_status": "REEXTRACTION_REQUIRED",
  "phase_3_reextraction": {
    "affected_seeds": ["S0042", "S0087"],
    "seed_count": 2,
    "reextraction_manifest": {...}
  },
  "phase_5_basket_cleanup": {
    "baskets_to_delete": ["S0042L05", "S0087L12"],
    "baskets_to_generate": ["S0100L03", "S0150L07"],
    "baskets_to_keep": [...]
  },
  "action_items": [
    {
      "step": 1,
      "action": "Re-run Phase 3 LEGO extraction",
      "description": "Re-extract 2 seeds with chunking-up instructions",
      "seeds": ["S0042", "S0087"],
      "automated": false,
      "status": "pending"
    },
    {
      "step": 2,
      "action": "Verify LUT check passes",
      "description": "Run POST /api/courses/:courseCode/phase/3/validate",
      "automated": true,
      "status": "pending"
    },
    {
      "step": 3,
      "action": "Clean up deprecated baskets",
      "description": "Delete 2 deprecated baskets",
      "automated": true,
      "status": "pending",
      "endpoint": "POST /api/courses/:courseCode/baskets/cleanup"
    },
    {
      "step": 4,
      "action": "Generate new baskets",
      "description": "Generate 25 new baskets for Phase 5",
      "automated": false,
      "status": "pending"
    }
  ]
}
```

---

## Manual Usage

### Scenario 1: Check a Course for LUT Violations

```bash
# Run LUT check
curl -X POST http://localhost:3456/api/courses/spa_for_eng/phase/3/validate

# If violations found, review reports
cat public/vfs/courses/spa_for_eng/lego_pairs_fd_report.json
cat public/vfs/courses/spa_for_eng/lego_pairs_reextraction_manifest.json
```

### Scenario 2: Analyze Basket Gaps

```bash
# Run gap analysis (fetches from GitHub)
curl http://localhost:3456/api/courses/spa_for_eng/baskets/gaps

# Review report
cat public/vfs/courses/spa_for_eng/basket_gaps_report.json
```

### Scenario 3: Clean Up Baskets

```bash
# Get list of baskets to delete from gap analysis
BASKETS=$(jq -r '.baskets_to_delete | join(",")' public/vfs/courses/spa_for_eng/basket_gaps_report.json)

# Delete them (with backup)
curl -X POST http://localhost:3456/api/courses/spa_for_eng/baskets/cleanup \
  -H "Content-Type: application/json" \
  -d "{\"basketIdsToDelete\": [\"$BASKETS\"]}"

# Verify backup exists
cat public/vfs/courses/spa_for_eng/deleted_baskets_backup.json
```

### Scenario 4: Full Re-extraction Workflow

```bash
# 1. Phase 3 completes and fails LUT check (automatic)
# 2. Review task list
cat public/vfs/courses/spa_for_eng/reextraction_task_list.json

# 3. Re-extract affected seeds (manual)
# ... use Phase 3 server with collision instructions

# 4. Verify LUT check now passes
curl -X POST http://localhost:3456/api/courses/spa_for_eng/phase/3/validate

# 5. Clean up deprecated baskets (automated endpoint)
curl -X POST http://localhost:3456/api/courses/spa_for_eng/baskets/cleanup \
  -H "Content-Type: application/json" \
  -d @basket_cleanup_payload.json

# 6. Generate new baskets (manual)
# ... use Phase 5 server
```

---

## Generated Files

After automated workflow, these files are created:

1. **`lego_pairs_fd_report.json`** - LUT collision report
2. **`lego_pairs_reextraction_manifest.json`** - Re-extraction instructions
3. **`basket_gaps_report.json`** - Basket gap analysis
4. **`reextraction_task_list.json`** - Consolidated task list
5. **`deleted_baskets_backup.json`** - Backup of deleted baskets (when cleanup runs)

---

## Error Handling

### LUT Check Endpoint
- Returns 404 if `lego_pairs.json` not found
- Returns 500 if validation script fails unexpectedly
- Non-zero exit from script = violations found (expected behavior)

### Basket Gap Analysis
- Falls back to local file if GitHub fetch fails
- Warns about deprecated LEGOs if collision report exists
- Returns empty arrays if no baskets exist yet

### Basket Cleanup
- Returns 400 if `basketIdsToDelete` not provided
- Returns 404 if `lego_baskets.json` not found
- Logs basket IDs not found but continues
- Git commit failure is non-fatal (warns only)

---

## Integration with Existing Workflow

### Phase 3 Validation (Automatic)

The `runPhaseValidation()` function now:

1. Runs LUT check automatically after Phase 3
2. If violations found:
   - Triggers basket gap analysis
   - Generates consolidated task list
   - Sets status to `validation_failed`
   - Blocks progression to Phase 5
3. If no violations:
   - Continues to infinitive form check
   - Proceeds to Phase 5 if all pass

### Checkpoint Modes

- **Manual Mode**: Stops after validation (pass or fail)
- **Gated Mode**: Auto-progresses if validation passes, stops if fails
- **Full Mode**: Same as gated (validation is always enforced)

---

## Testing

### Test LUT Check

```bash
# Start orchestrator
npm run automation

# Trigger Phase 3 for a course
curl -X POST http://localhost:3456/api/courses/spa_for_eng/start-phase \
  -H "Content-Type: application/json" \
  -d '{"phase": 3, "totalSeeds": 668}'

# Wait for Phase 3 to complete
# LUT check runs automatically

# Check course status
curl http://localhost:3456/api/courses/spa_for_eng/status
```

### Test Gap Analysis

```bash
# Manually trigger gap analysis
curl http://localhost:3456/api/courses/spa_for_eng/baskets/gaps

# Check report
cat public/vfs/courses/spa_for_eng/basket_gaps_report.json
```

### Test Cleanup

```bash
# Create test payload
echo '{"basketIdsToDelete": ["S0001L01"]}' > /tmp/cleanup.json

# Run cleanup
curl -X POST http://localhost:3456/api/courses/spa_for_eng/baskets/cleanup \
  -H "Content-Type: application/json" \
  -d @/tmp/cleanup.json

# Verify backup
cat public/vfs/courses/spa_for_eng/deleted_baskets_backup.json
```

---

## Troubleshooting

### GitHub Fetch Fails

If basket gap analysis can't fetch from GitHub:

1. Check `gh` CLI is installed: `gh --version`
2. Check GitHub authentication: `gh auth status`
3. Check git remote: `git config --get remote.origin.url`
4. Falls back to local file automatically

### Git Commit Fails

If basket cleanup can't commit:

1. Check git is configured: `git config user.name`
2. Check working directory: `pwd` in course folder
3. Commit manually: `cd public/vfs/courses/spa_for_eng && git commit -am "cleanup"`
4. Non-fatal - files are still updated and backed up

### Validation Always Fails

If LUT check always fails:

1. Check `check-lego-fd-violations.cjs` exists
2. Run script manually: `node scripts/validation/check-lego-fd-violations.cjs public/vfs/courses/spa_for_eng/lego_pairs.json`
3. Review FD report: `cat public/vfs/courses/spa_for_eng/lego_pairs_fd_report.json`
4. Re-extract affected seeds with chunking-up instructions

---

## Future Enhancements

1. **Automated Re-extraction**: Trigger Phase 3 re-extraction for specific seeds
2. **Webhook Notifications**: Notify team when validation fails
3. **Dashboard Integration**: Display task list in UI
4. **Batch Cleanup**: Delete multiple courses' baskets at once
5. **Rollback Support**: Restore from backup automatically

---

## Summary

The automated orchestrator pipeline provides:

- **Quality Gates**: Automatic LUT checking after Phase 3
- **Impact Analysis**: Basket gap analysis with GitHub baseline
- **Safe Cleanup**: Backed-up basket deletion with git commits
- **Task Tracking**: Consolidated re-extraction task lists
- **Manual Override**: All endpoints callable independently

This ensures LEGO registry integrity is maintained throughout the production pipeline, preventing learner uncertainty from reaching production.
