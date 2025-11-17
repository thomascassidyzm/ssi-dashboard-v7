# Phase 5: Sync & Viewing Loop Optimization

**Date**: 2025-11-17
**Purpose**: Optimize the extraction → sync → dashboard viewing loop

---

## Current Architecture (What's Actually Implemented)

### ✅ What EXISTS

**Git branch watching** (`pollGitBranches()` in automation_server.cjs:2000)
- Polls `git fetch --all` every 10 seconds
- Detects branches matching pattern `claude/phase5-*`
- Filters for branches newer than job start time
- Auto-merges new branches to main

**Dual detection system**:
1. **File-based**: Watches for `phase5_outputs/agent_*_provisional.json` files
2. **Git-based**: Watches for `claude/phase5-*` branches pushed to GitHub

**Current branch pattern for Phase 5**:
```bash
claude/phase5-xxx  # Claude Code Web auto-generates unique suffix
```

---

## Current Workflow (Step by Step)

### Browser Tab → GitHub Flow

```
[BROWSER TAB 1] Master Agent for Patch 1
  ↓
  Spawns 10 sub-agents (Task tool)
  ↓
  [SUB-AGENT 1] Processes 6 seeds
    ↓ Generates baskets
    ↓ Self-validates grammar
    ↓ git add phase5_outputs/seed_S00*.json
    ↓ git commit -m "Phase 5 Patch 1 Sub-agent 1: Seeds S0001-S0006"
    ↓ Reports completion to master
  ↓
  [MASTER] Tracks completion: 1/10 done
  ↓
  ... (repeat for all 10 sub-agents)
  ↓
  [MASTER] All 10 complete!
  ↓
  git push origin claude/phase5-patch-01
```

**Key point**: Each browser tab (master) pushes to ONE branch
- Patch 1 → `claude/phase5-patch-01`
- Patch 2 → `claude/phase5-patch-02`
- ...
- Patch 12 → `claude/phase5-patch-12`

---

## GitHub → Dashboard Flow

### Current Implementation (automation_server.cjs lines 2333-2380)

```javascript
// Wait for completion
while (!gitBranchesDetected) {
  await sleep(10000); // Poll every 10 seconds

  // Detect branches pushed since job start
  const newBranches = await pollGitBranches(
    baseCourseDir,
    jobStartTime,
    'claude/phase5'
  );

  if (newBranches.length > 0) {
    gitBranchesDetected = true;

    // Auto-merge to main
    for (const branch of newBranches) {
      await execAsync(`git checkout main`, { cwd: baseCourseDir });
      await execAsync(`git merge ${branch.remoteBranch} --no-ff`, { cwd: baseCourseDir });
    }

    // Push to main
    await execAsync(`git push origin main`, { cwd: baseCourseDir });

    // Update job status
    job.status = 'completed';
    job.progress = 100;
  }
}
```

### Dashboard Polling (ProgressMonitor.vue)

```javascript
// Poll every 30 seconds
setInterval(() => {
  apiClient.get(`/api/courses/${courseCode}/status`)
    .then(status => {
      if (status.phase === 'phase_5' && status.progress === 100) {
        showCompletionNotification();
      }
    });
}, 30000);
```

---

## Current Problems

### ❌ Problem 1: 12 Separate Merges
**Issue**: Each master pushes to different branch
- `claude/phase5-patch-01` through `claude/phase5-patch-12`
- Automation server must merge all 12 branches
- 12 separate merge operations

**Current behavior**:
```bash
# When Patch 1 completes:
git merge claude/phase5-patch-01  # OK

# When Patch 2 completes:
git merge claude/phase5-patch-02  # OK

# ... but what if they complete out of order?
# Patches 1, 3, 5 done but 2, 4 waiting?
# Dashboard shows incomplete data!
```

### ❌ Problem 2: Partial Data Visibility
**Issue**: Dashboard shows merged data ONLY, not branch data

**Example timeline**:
```
10:00 - Patch 1 completes → merged to main → visible ✓
10:05 - Patch 3 completes → merged to main → visible ✓
10:10 - Patch 2 still running → NOT merged → invisible ❌
```

**User sees**: S0001-S0112 (Patch 1) + S0225-S0336 (Patch 3)
**User missing**: S0113-S0224 (Patch 2 - still generating)

**This breaks the UI** - looks like data is corrupted/missing

### ❌ Problem 3: Dashboard Reads from Main Branch Only
**Issue**: `CourseLibrary.vue` loads data via:
```javascript
const seedPairs = await fetch(`/api/courses/${code}/seed_pairs.json`);
const legoPairs = await fetch(`/api/courses/${code}/lego_pairs.json`);
const baskets = await fetch(`/api/courses/${code}/lego_baskets.json`);
```

These endpoints read from **local filesystem** (VFS_ROOT), which reflects **main branch only**.

**Branches are invisible** until merged.

### ❌ Problem 4: Merge Conflicts (Potential)
**Issue**: 12 masters merging to main simultaneously

**Risk scenario**:
```bash
# Patch 1 merges:
git merge claude/phase5-patch-01  # Modifies lego_baskets.json

# Patch 2 tries to merge (hasn't pulled Patch 1 changes):
git merge claude/phase5-patch-02  # CONFLICT in lego_baskets.json!
```

**Current prevention**: Patches are seed-range isolated (no overlap)
- Patch 1: S0001-S0056
- Patch 2: S0057-S0112
- No file collisions... **UNLESS** final merge creates `lego_baskets.json`

---

## Proposed Optimizations

### Optimization 1: Single Merge Point (RECOMMENDED)

**Change**: All 12 masters merge to ONE temporary branch, then merge that to main

**New flow**:
```bash
# Each master pushes to INDIVIDUAL branch:
claude/phase5-patch-01
claude/phase5-patch-02
...
claude/phase5-patch-12

# Automation server WAITS for all 12, then:
git checkout -b phase5-complete-2025-11-17
git merge claude/phase5-patch-01
git merge claude/phase5-patch-02
... (merge all 12)
git checkout main
git merge phase5-complete-2025-11-17 --no-ff
git push origin main
```

**Benefits**:
- ✅ Single atomic merge to main
- ✅ All 12 patches tested together first
- ✅ Dashboard shows complete data or nothing (no partial)
- ✅ Clear audit trail (`phase5-complete-YYYY-MM-DD` branch)

**Implementation**:
```javascript
// automation_server.cjs - replace lines 2376-2400
async function mergeAllPhase5Patches(baseCourseDir, patches) {
  const today = new Date().toISOString().split('T')[0];
  const mergeBranch = `phase5-complete-${today}`;

  // Create merge branch
  await execAsync(`git checkout main`, { cwd: baseCourseDir });
  await execAsync(`git pull origin main`, { cwd: baseCourseDir });
  await execAsync(`git checkout -b ${mergeBranch}`, { cwd: baseCourseDir });

  // Merge all 12 patches
  for (const patch of patches) {
    console.log(`[Merge] Merging ${patch.branch}...`);
    await execAsync(
      `git merge ${patch.remoteBranch} --no-ff -m "Merge ${patch.branch}"`,
      { cwd: baseCourseDir }
    );
  }

  // Merge to main
  await execAsync(`git checkout main`, { cwd: baseCourseDir });
  await execAsync(
    `git merge ${mergeBranch} --no-ff -m "Complete Phase 5: ${patches.length} patches"`,
    { cwd: baseCourseDir }
  );

  // Push
  await execAsync(`git push origin main`, { cwd: baseCourseDir });

  console.log(`[Merge] ✅ All ${patches.length} patches merged to main`);
}
```

### Optimization 2: Branch Preview in Dashboard

**Change**: Dashboard reads from branches BEFORE merge

**New API endpoint**:
```javascript
// GET /api/courses/:code/preview-branch/:branchName
app.get('/api/courses/:code/preview-branch/:branchName', async (req, res) => {
  const { code, branchName } = req.params;
  const courseDir = path.join(CONFIG.VFS_ROOT, code);

  // Checkout branch temporarily
  await execAsync(`git fetch origin ${branchName}`, { cwd: courseDir });
  await execAsync(`git checkout ${branchName}`, { cwd: courseDir });

  // Read data
  const baskets = await fs.readJson(path.join(courseDir, 'lego_baskets.json'));

  // Return to main
  await execAsync(`git checkout main`, { cwd: courseDir });

  res.json(baskets);
});
```

**Dashboard component**:
```vue
<!-- Show preview of in-progress work -->
<div v-if="phase5Branches.length > 0">
  <h3>Phase 5 In Progress: {{ phase5Branches.length }}/12 patches complete</h3>
  <button @click="previewBranch('claude/phase5-patch-01')">
    Preview Patch 1 (S0001-S0056)
  </button>
  <!-- ... repeat for all detected branches -->
</div>
```

**Benefits**:
- ✅ User sees progress BEFORE merge
- ✅ Can inspect partial results
- ✅ Can stop/fix if errors detected early

**Drawbacks**:
- ⚠️ Requires git checkout (blocks other operations)
- ⚠️ More complex to implement

### Optimization 3: Progress Aggregation (SIMPLEST)

**Change**: Track branch count, show estimated completion

**Current detection**:
```javascript
const newBranches = await pollGitBranches(baseCourseDir, jobStartTime, 'claude/phase5');
// newBranches = [ { branch: 'claude/phase5-patch-01', isNew: true }, ... ]
```

**Enhanced tracking**:
```javascript
// In job object
job.subProgress = {
  phase: 'phase_5',
  patchesComplete: newBranches.filter(b => b.isNew).length,
  patchesTotal: 12,
  percentage: Math.round((newBranches.length / 12) * 100)
};

// Dashboard shows:
// "Phase 5: 7/12 patches complete (58%)"
```

**Benefits**:
- ✅ Simple to implement (already have branch detection)
- ✅ Shows progress without reading data
- ✅ No git checkout needed

**Implementation** (automation_server.cjs lines 2336-2350):
```javascript
const newBranches = await pollGitBranches(baseCourseDir, jobStartTime, 'claude/phase5');
const completedPatches = newBranches.filter(b => b.isNew).length;

job.message = `Phase 5: ${completedPatches}/12 patches complete`;
job.subProgress = {
  phase: 'phase_5',
  patchesComplete: completedPatches,
  patchesTotal: 12,
  percentage: Math.round((completedPatches / 12) * 100)
};

// Wait for all 12 before merging
if (completedPatches >= 12) {
  gitBranchesDetected = true;
  await mergeAllPhase5Patches(baseCourseDir, newBranches);
}
```

### Optimization 4: Incremental Validation (QUALITY GATE)

**Change**: Validate each patch BEFORE merging to main

**New flow**:
```bash
# Patch 1 completes and pushes
↓
# Automation server detects branch
↓
# Run validators on BRANCH (not main)
git checkout claude/phase5-patch-01
node scripts/phase5_gate_validator_v2.cjs cmn_for_eng
↓
# If validation passes:
git checkout main
git merge claude/phase5-patch-01
↓
# If validation FAILS:
# Don't merge, create issue report
echo "Patch 1 has GATE violations - holding merge"
```

**Benefits**:
- ✅ Catch errors early (per patch, not all 12 at end)
- ✅ Don't pollute main with bad data
- ✅ Easier to debug (know which patch failed)

**Implementation**:
```javascript
async function validateAndMergePatch(baseCourseDir, courseCode, branch) {
  // Checkout branch
  await execAsync(`git checkout ${branch}`, { cwd: baseCourseDir });

  // Run validators
  const gateResult = await execAsync(
    `node scripts/phase5_gate_validator_v2.cjs ${courseCode}`,
    { cwd: baseCourseDir }
  );

  const lutResult = await execAsync(
    `node scripts/phase5_lut_validator.cjs ${courseCode}`,
    { cwd: baseCourseDir }
  );

  // Check for violations
  const violations = await fs.readJson(
    path.join(baseCourseDir, 'phase5_gate_violations.json')
  );

  if (violations.total_violations > 0) {
    console.error(`[Validation] ❌ Patch ${branch} has ${violations.total_violations} GATE violations`);

    // Don't merge - create report
    await fs.writeJson(
      path.join(baseCourseDir, `${branch}_validation_failed.json`),
      { branch, violations, timestamp: new Date() }
    );

    return { success: false, violations };
  }

  // Validation passed - merge
  await execAsync(`git checkout main`, { cwd: baseCourseDir });
  await execAsync(`git merge ${branch} --no-ff`, { cwd: baseCourseDir });

  console.log(`[Validation] ✅ Patch ${branch} validated and merged`);
  return { success: true };
}
```

---

## Recommended Approach (Combining Best Ideas)

### Phase A: Sub-Agent Work (No Changes)
```
Sub-agent generates baskets (40-60 min)
  ↓
Self-validates grammar ✓
  ↓
git commit (local) ✓
  ↓
Reports to master ✓
```

### Phase B: Master Coordination (Enhanced)
```
Master tracks 10 sub-agents
  ↓
All 10 complete? → git push origin claude/phase5-patch-NN ✓
  ↓
[NEW] Master reports patch completion to automation server
  ↓
POST /api/courses/{code}/patch-complete
{
  "patch_id": 3,
  "branch": "claude/phase5-patch-03",
  "seeds_processed": 56,
  "legos_generated": 196
}
```

### Phase C: Automation Server (NEW LOGIC)
```
automation_server.cjs monitors for patch completions
  ↓
Receives 12 PATCH-COMPLETE events (or detects 12 branches)
  ↓
For each patch:
  1. git checkout claude/phase5-patch-NN
  2. Run validators (GATE, LUT, Grammar)
  3. If pass → mark for merge
  4. If fail → create violation report, HOLD merge
  ↓
Once all 12 validated:
  1. Create phase5-complete-YYYY-MM-DD branch
  2. Merge all 12 patches to it
  3. Run FINAL validation on merged result
  4. If pass → merge to main, push
  5. Update job status to 'completed'
```

### Phase D: Dashboard Display (Enhanced Progress)
```
Dashboard polls /api/courses/{code}/status every 10 seconds
  ↓
Shows: "Phase 5: 7/12 patches complete, 5 validating..."
  ↓
When all merged:
  Shows: "Phase 5 complete! 14,970 phrases generated"
  ↓
[NEW] "View detailed report" button
  Shows: Per-patch statistics, validation results
```

---

## Implementation Checklist

### ✅ Already Implemented
- [x] `pollGitBranches()` function (automation_server.cjs:2000)
- [x] Git branch detection in Phase 5 loop (lines 2333-2380)
- [x] Auto-merge to main
- [x] Job progress tracking

### 🔧 Needs Implementation
- [ ] **Wait for all 12 patches** (don't merge incrementally)
- [ ] **Aggregate progress** (show 7/12 patches complete)
- [ ] **Per-patch validation** (validate before merge)
- [ ] **Single merge point** (merge all 12 to temp branch first)
- [ ] **Dashboard progress display** (show patch count)
- [ ] **Violation reporting** (per-patch + final)

### 🎯 Priority Order

**MUST HAVE (for next Phase 5 run)**:
1. Wait for all 12 patches (don't merge incrementally)
2. Aggregate progress display (7/12 patches)
3. Single merge point (all 12 → temp → main)

**SHOULD HAVE (quality gates)**:
4. Per-patch validation
5. Violation reporting
6. Auto-stop if validation fails

**NICE TO HAVE (user experience)**:
7. Branch preview in dashboard
8. Detailed completion report
9. Real-time patch status indicators

---

## File Changes Required

### 1. automation_server.cjs (lines 2333-2400)

**Replace**:
```javascript
// Current: merges incrementally as branches arrive
const newBranches = await pollGitBranches(...);
for (const branch of newBranches) {
  await merge(branch); // ❌ Incremental merge
}
```

**With**:
```javascript
// NEW: wait for all 12, then merge together
const EXPECTED_PATCHES = 12;
let detectedPatches = [];

while (detectedPatches.length < EXPECTED_PATCHES) {
  await sleep(10000);

  const newBranches = await pollGitBranches(baseCourseDir, jobStartTime, 'claude/phase5');
  detectedPatches = newBranches.filter(b => b.isNew);

  job.subProgress = {
    phase: 'phase_5',
    patchesComplete: detectedPatches.length,
    patchesTotal: EXPECTED_PATCHES,
    percentage: Math.round((detectedPatches.length / EXPECTED_PATCHES) * 100)
  };

  console.log(`[Phase 5] Patches: ${detectedPatches.length}/${EXPECTED_PATCHES}`);
}

// All 12 detected → merge together
await mergeAllPhase5Patches(baseCourseDir, detectedPatches);
```

### 2. Add mergeAllPhase5Patches() function

```javascript
async function mergeAllPhase5Patches(baseCourseDir, patches) {
  const today = new Date().toISOString().split('T')[0];
  const mergeBranch = `phase5-complete-${today}`;

  await execAsync(`git checkout main`, { cwd: baseCourseDir });
  await execAsync(`git pull origin main`, { cwd: baseCourseDir });
  await execAsync(`git checkout -b ${mergeBranch}`, { cwd: baseCourseDir });

  for (const patch of patches) {
    console.log(`[Merge] ${patch.branch}...`);
    await execAsync(`git merge ${patch.remoteBranch} --no-ff`, { cwd: baseCourseDir });
  }

  await execAsync(`git checkout main`, { cwd: baseCourseDir });
  await execAsync(`git merge ${mergeBranch} --no-ff`, { cwd: baseCourseDir });
  await execAsync(`git push origin main`, { cwd: baseCourseDir });

  console.log(`[Merge] ✅ All ${patches.length} patches merged`);
}
```

### 3. ProgressMonitor.vue (Dashboard)

**Add to template**:
```vue
<div v-if="jobStatus.subProgress">
  <p>Phase 5 Progress:</p>
  <p>{{ jobStatus.subProgress.patchesComplete }}/{{ jobStatus.subProgress.patchesTotal }} patches complete</p>
  <progress
    :value="jobStatus.subProgress.percentage"
    max="100"
  ></progress>
</div>
```

---

## Testing Plan

### Test 1: 12-Patch Detection
```bash
# Start automation server
pm2 restart ssi-automation

# Launch 12 masters (use test course with 120 LEGOs, not 1,497)
node scripts/phase5_launch_12_masters.sh

# Expected: automation server shows "7/12 patches" as they complete
# Expected: waits for all 12 before merging
```

### Test 2: Single Merge Point
```bash
# After all 12 complete:
git branch | grep phase5-complete
# Expected: phase5-complete-2025-11-17

git log main --oneline | head -1
# Expected: "Merge phase5-complete-2025-11-17: 12 patches"
```

### Test 3: Dashboard Progress Display
```bash
# Open dashboard: http://localhost:5173
# Start Phase 5
# Expected: Shows "3/12 patches complete (25%)"
# Expected: Updates every 10 seconds
# Expected: Shows "12/12 patches complete (100%)" when done
```

---

## Success Criteria

✅ **User can see progress in real-time**
- Dashboard shows "7/12 patches complete"
- Updates every 10 seconds

✅ **All 12 patches merge atomically**
- No partial merges to main
- Single merge commit with all changes

✅ **Validation runs before merge**
- Per-patch GATE/LUT check
- Final validation on merged result

✅ **Dashboard shows complete data or nothing**
- No "missing seed ranges" confusion
- Clear indication of completion

---

**Next Steps**: Implement Priority 1-3 (wait for all 12, progress display, single merge) before next Phase 5 run.

*Last updated: 2025-11-17*
