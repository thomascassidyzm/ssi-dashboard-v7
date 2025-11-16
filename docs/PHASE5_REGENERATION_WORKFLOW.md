# Phase 5 Regeneration Workflow

## Overview

After fixing LUT (Learner Uncertainty Test) collisions via chunking-up, baskets need to be regenerated. This document explains the complete workflow.

---

## The Problem

When Phase 3 LEGO extraction has collisions (same KNOWN → different TARGETs), we need to:

1. **Fix collisions** → chunk up affected LEGOs (combine adjacent LEGOs to disambiguate)
2. **Delete old baskets** → baskets for deprecated LEGO_IDs must be removed
3. **Generate new baskets** → baskets for chunked-up LEGOs must be created
4. **Merge cleanly** → new baskets replace old ones in `lego_baskets.json`

---

## Automated Workflow

### Step 1: Run LUT Check

```bash
POST /api/courses/:courseCode/phase/3/validate
```

**Response (if failures found):**
```json
{
  "status": "fail",
  "collisions": 120,
  "reextractionNeeded": true,
  "manifest": {
    "affected_seeds": ["S0012", "S0019", ...],
    "affected_lego_count": 240
  }
}
```

**What this does:**
- Runs `check-lego-fd-violations.cjs`
- Identifies collisions (same KNOWN → different TARGETs)
- Generates re-extraction manifest

---

### Step 2: Analyze Basket Gaps

```bash
GET /api/courses/:courseCode/baskets/gaps
```

**Response:**
```json
{
  "courseCode": "spa_for_eng",
  "total_legos": 3042,
  "coverage_percentage": 85,
  "analysis": {
    "baskets_to_keep": 2587,
    "baskets_to_delete": 215,
    "baskets_missing": 240
  },
  "baskets_to_delete": ["S0012L03", "S0019L05", ...],
  "baskets_missing": ["S0012L03_L04", "S0019L05_L06", ...],
  "deprecated_legos": ["S0012L03", "S0019L05", ...]
}
```

**What this does:**
- Fetches `lego_baskets.json` from GitHub main (SSoT)
- Compares with current `lego_pairs.json` (local, updated)
- Identifies:
  - **baskets_to_delete**: Deprecated/orphaned baskets
  - **baskets_missing**: LEGOs that need baskets
  - **baskets_to_keep**: Valid existing baskets

---

### Step 3: Regenerate Baskets

```bash
POST /api/courses/:courseCode/phase/5/regenerate
Body: {
  "courseCode": "spa_for_eng",
  "legoIds": ["S0012L03_L04", "S0019L05_L06", ...],
  "target": "Spanish",
  "known": "English"
}
```

**Response:**
```json
{
  "success": true,
  "cleanup": {
    "deletedOldBaskets": 215,
    "backupSaved": true
  },
  "segmentation": {
    "totalBaskets": 240,
    "browsersNeeded": 5,
    "estimatedTime": "~60 minutes",
    "browsers": [...]
  },
  "status": "running"
}
```

**What this does:**

1. **Automatic Cleanup** (NEW!):
   - Reads `lego_baskets.json`
   - Deletes old baskets for specified LEGO_IDs
   - Saves backup to `deleted_baskets_backup.json`
   - Saves updated `lego_baskets.json`

2. **Segmentation**:
   - 5 baskets per agent (faster than seed-based)
   - 10 agents per browser
   - 50 baskets per browser
   - Spawns `Math.ceil(240 / 50)` = 5 browsers

3. **Branch Spawning**:
   - Each browser creates branch: `claude/baskets-regen-spa_for_eng-{timestamp}-w{N}`
   - Agents generate new baskets
   - Strip metadata before push
   - Push to GitHub

4. **Auto-Merge**:
   - Branch watcher detects all branches
   - Merges new baskets into `lego_baskets.json`
   - Old baskets already deleted → no conflicts!
   - New baskets inserted cleanly

---

## Key Insight: Cleanup BEFORE Regeneration

**Old workflow (broken):**
```
lego_baskets.json:  { S0012L03: {...old}, S0019L05: {...old} }
                           ↓
                    Regenerate new baskets
                           ↓
Branch adds:        { S0012L03_L04: {...new} }
                           ↓
                    Merge (object spread)
                           ↓
Result:             { S0012L03: {...old ❌}, S0012L03_L04: {...new ✅}, S0019L05: {...old ❌} }
                      ↑ STILL THERE (should be deleted!)
```

**New workflow (fixed):**
```
lego_baskets.json:  { S0012L03: {...old}, S0019L05: {...old} }
                           ↓
                    /regenerate endpoint → CLEANUP
                           ↓
After cleanup:      { } (old baskets deleted, backup saved)
                           ↓
                    Spawn browsers → generate new
                           ↓
Branch adds:        { S0012L03_L04: {...new} }
                           ↓
                    Merge (object spread)
                           ↓
Result:             { S0012L03_L04: {...new ✅} }
                      ↑ CLEAN! No orphans
```

---

## Standard Phase 5 Run (First Time)

For **first-time** basket generation, use the standard endpoint:

```bash
POST /api/courses/:courseCode/phase/5/start
Body: {
  "courseCode": "spa_for_eng",
  "startSeed": 1,
  "endSeed": 668,
  "target": "Spanish",
  "known": "English"
}
```

**Differences from regeneration:**
- Uses **seed-based** segmentation (10 seeds/agent)
- No cleanup needed (no existing baskets)
- Branch pattern: `claude/baskets-{courseCode}-*`
- Generates ALL baskets for the course

---

## Git Workflow

### Branches Created

**Standard run:**
```
claude/baskets-spa_for_eng-w1
claude/baskets-spa_for_eng-w2
...
```

**Regeneration:**
```
claude/baskets-regen-spa_for_eng-1731789234567-w1
claude/baskets-regen-spa_for_eng-1731789234567-w2
...
```

### What Gets Pushed

Each agent:
1. Generates `seed_SXXXX_FULL.json` (local only, gitignored)
2. Strips metadata → `seed_SXXXX_baskets.json` (~7KB vs 336KB)
3. Pushes ONLY stripped file to branch
4. Server merges on detection

### Merge Logic

`scripts/watch_and_merge_branches.cjs`:
```javascript
// Line 238
merged.data = { ...merged.data, ...content };
```

This works because:
- Old baskets already deleted by `/regenerate`
- New baskets have different LEGO_IDs (chunked up)
- Object spread just adds new keys

---

## Validation

After merge completes, validate:

```bash
node scripts/validation/analyze-basket-gaps.cjs spa_for_eng
```

**Expected output:**
```
📊 BASKET GAP ANALYSIS

   Total LEGOs: 3042
   Baskets to keep: 2827 (93% coverage)
   Baskets to delete: 0
   Baskets missing: 0

✅ All LEGOs have baskets!
```

---

## Recovery from Errors

### If regeneration fails mid-way

1. Check job status:
```bash
GET /api/courses/:courseCode/phase/5/status
```

2. Restore from backup if needed:
```bash
# Backup is at: public/vfs/courses/{courseCode}/deleted_baskets_backup.json
# Contains timestamped backups of all deleted baskets
```

3. Re-run from gap analysis:
```bash
GET /api/courses/:courseCode/baskets/gaps
POST /api/courses/:courseCode/phase/5/regenerate
```

### If merge creates duplicates

This shouldn't happen with the new workflow, but if it does:

1. The cleanup step deletes old baskets BEFORE regeneration
2. New baskets have different LEGO_IDs (chunked up)
3. No key collision possible

---

## Summary

**Automated Pipeline:**
```
LUT Check → Gap Analysis → Regenerate (with auto-cleanup) → Auto-merge → Validate
```

**Key Features:**
- ✅ Automatic cleanup of deprecated baskets
- ✅ Timestamped backups before deletion
- ✅ Parallel regeneration (5 baskets/agent, 50/browser)
- ✅ Clean merge (no orphans, no duplicates)
- ✅ GitHub SSoT for gap analysis
- ✅ Metadata stripping before push
- ✅ Branch-based workflow with auto-merge

**Manual intervention required:**
- None! Fully automated once triggered.

**Time estimate:**
- 240 baskets = 5 browsers × ~12 minutes = **~60 minutes total**
