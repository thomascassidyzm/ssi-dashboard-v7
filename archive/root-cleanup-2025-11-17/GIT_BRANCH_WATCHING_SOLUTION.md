# Git Branch Watching Solution

## Problem Statement

**Issue**: When Claude Code on Web completes a phase, it commits and pushes to a new branch (e.g., `claude/phase5-xxx`), but the dashboard doesn't show completion status properly.

**Root Cause**: The automation server currently relies ONLY on detecting `phase5_outputs/agent_*_provisional.json` files to know when agents are complete. If Claude Code doesn't write these provisional files (or writes to a different location), the automation server never triggers the git merge and never updates the job status.

## Current Flow

```
Claude Code on Web
  ↓ completes work
  ↓ git commit & push to claude/phase5-xxx branch
  ↓
Automation Server (WAITING for provisional files)
  ↓ polling phase5_outputs/ directory
  ↓ NO files found → never triggers merge
  ↓ job.status stays "phase_5_staged_running"
  ↓
Dashboard
  ↓ polls /api/courses/:code/status every 30s
  ↓ sees status = "phase_5_staged_running"
  ↓ NEVER shows completion ❌
```

## Solution: Dual Detection System

We need **TWO ways** to detect completion:

### 1. **File-Based Detection** (current)
- Poll for `phase5_outputs/agent_*_provisional.json` files
- Works when agents write to local filesystem
- Good for local mode

### 2. **Git-Based Detection** (NEW - needed for Web mode)
- Poll git remote branches for `claude/phase*` branches
- When new branch detected:
  - Check if branch has commits newer than job start time
  - Auto-merge branch to main
  - Update job status to 'completed'
  - Trigger post-processing (validators, Phase 6/7)

## Implementation Plan

### Step 1: Add Git Branch Watcher

Add to `automation_server.cjs` after line 2110:

```javascript
/**
 * Poll git remote for new Claude branches
 * Returns: { branch: 'claude/phase5-xxx', commitTime: Date, isNew: boolean }
 */
async function pollGitBranches(baseCourseDir, jobStartTime, phasePattern = 'claude/phase5') {
  try {
    // Fetch latest branches
    await execAsync('git fetch --all', { cwd: baseCourseDir });

    // Find matching branches
    const branchesResult = await execAsync(
      `git branch -r | grep "origin/${phasePattern}"`,
      { cwd: baseCourseDir }
    );

    if (!branchesResult.stdout.trim()) {
      return [];
    }

    const branches = branchesResult.stdout.trim().split('\n').map(b => b.trim());
    const branchInfo = [];

    for (const branch of branches) {
      // Get latest commit time on this branch
      const branchName = branch.replace('origin/', '');
      const commitTimeResult = await execAsync(
        `git log ${branch} -1 --format=%ct`,
        { cwd: baseCourseDir }
      );

      const commitTime = new Date(parseInt(commitTimeResult.stdout.trim()) * 1000);
      const isNew = commitTime > jobStartTime;

      branchInfo.push({
        branch: branchName,
        remoteBranch: branch,
        commitTime,
        isNew
      });
    }

    return branchInfo;

  } catch (err) {
    console.error(`[Git Poll] Error polling branches: ${err.message}`);
    return [];
  }
}
```

### Step 2: Integrate into Phase 5 Waiting Loop

Replace lines 2084-2110 with:

```javascript
// Poll for completion using DUAL detection
console.log(`[Web Orchestrator] Waiting for Phase 5 completion...`);
console.log(`[Web Orchestrator] Monitoring both provisional files AND git branches`);

const outputsDir = path.join(baseCourseDir, 'phase5_outputs');
const jobStartTime = job.startTime;
let agentsComplete = 0;
let gitBranchesDetected = false;

while (agentsComplete < expectedAgents && !gitBranchesDetected) {
  await new Promise(resolve => setTimeout(resolve, 10000)); // Check every 10 seconds

  // Detection Method 1: Provisional files (local filesystem)
  if (await fs.pathExists(outputsDir)) {
    const files = await fs.readdir(outputsDir);
    agentsComplete = files.filter(f => f.match(/^agent_\d+_provisional\.json$/)).length;

    if (agentsComplete > 0) {
      job.message = `Phase 5: ${agentsComplete}/${expectedAgents} agents complete (file-based)`;
      job.subProgress = {
        phase: 'phase_5',
        completed: agentsComplete,
        total: expectedAgents,
        percentage: Math.round((agentsComplete / expectedAgents) * 100)
      };
      console.log(`[Web Orchestrator] File-based: ${agentsComplete}/${expectedAgents} agents`);
    }
  }

  // Detection Method 2: Git branches (remote commits)
  const newBranches = await pollGitBranches(baseCourseDir, jobStartTime, 'claude/phase5');
  if (newBranches.length > 0 && newBranches.some(b => b.isNew)) {
    console.log(`[Web Orchestrator] Git-based: Detected ${newBranches.length} new Claude branches!`);
    newBranches.forEach(b => {
      if (b.isNew) {
        console.log(`  - ${b.branch} (committed at ${b.commitTime.toISOString()})`);
      }
    });
    gitBranchesDetected = true;

    // Update job status
    job.message = `Phase 5: Detected completion via git branches`;
    job.subProgress = {
      phase: 'phase_5',
      completed: newBranches.length,
      total: expectedAgents,
      percentage: 100
    };
  }
}

if (gitBranchesDetected) {
  console.log(`[Web Orchestrator] ✅ Phase 5 complete (git-based detection)!`);
} else {
  console.log(`[Web Orchestrator] ✅ Phase 5 complete (file-based detection)!`);
}
```

### Step 3: Add Similar Detection for Phase 1 and Phase 3

Apply the same pattern to Phase 1 (line ~1900) and Phase 3 (line ~2370):

**Phase 1:**
```javascript
const newBranches = await pollGitBranches(courseDir, jobStartTime, 'claude/phase1');
```

**Phase 3:**
```javascript
const newBranches = await pollGitBranches(courseDir, jobStartTime, 'claude/phase3');
```

### Step 4: Add Background Git Watcher (Optional Enhancement)

For real-time detection without polling, add a background watcher:

```javascript
// In GLOBAL STATE section (after line 159)
const STATE = {
  jobs: new Map(),
  regenerationJobs: new Map(),
  promptVersions: new Map(),
  audioJobs: new Map(),
  gitWatchers: new Map(), // courseCode -> { interval, lastChecked }
};

// Start watching for git branches
function startGitWatcher(courseCode, jobStartTime, phasePattern) {
  if (STATE.gitWatchers.has(courseCode)) {
    console.log(`[Git Watcher] Already watching ${courseCode}`);
    return;
  }

  console.log(`[Git Watcher] Starting watcher for ${courseCode} (pattern: ${phasePattern})`);

  const interval = setInterval(async () => {
    const baseCourseDir = path.join(CONFIG.VFS_ROOT, courseCode);
    const job = STATE.jobs.get(courseCode);

    if (!job || job.status === 'completed') {
      console.log(`[Git Watcher] Job complete or not found, stopping watcher`);
      stopGitWatcher(courseCode);
      return;
    }

    const newBranches = await pollGitBranches(baseCourseDir, jobStartTime, phasePattern);

    if (newBranches.length > 0 && newBranches.some(b => b.isNew)) {
      console.log(`[Git Watcher] 🔔 New branches detected for ${courseCode}!`);

      // Trigger merge and post-processing
      await mergeAndFinalize(courseCode, newBranches);

      // Update job status
      job.status = 'completed';
      job.progress = 100;
      job.message = 'Phase complete (detected via git watcher)';

      stopGitWatcher(courseCode);
    }
  }, 15000); // Check every 15 seconds

  STATE.gitWatchers.set(courseCode, {
    interval,
    phasePattern,
    startTime: new Date()
  });
}

function stopGitWatcher(courseCode) {
  const watcher = STATE.gitWatchers.get(courseCode);
  if (watcher) {
    clearInterval(watcher.interval);
    STATE.gitWatchers.delete(courseCode);
    console.log(`[Git Watcher] Stopped watcher for ${courseCode}`);
  }
}
```

## Testing Plan

1. **Test File-Based Detection** (existing behavior)
   ```bash
   # Should still work as before
   node automation_server.cjs
   # Run Phase 5 locally → writes provisional files → merge happens
   ```

2. **Test Git-Based Detection** (new behavior)
   ```bash
   # Start automation server
   node automation_server.cjs

   # From dashboard, start Phase 5 in Web mode
   # Claude Code commits to claude/phase5-xxx
   # Automation server should detect branch within 10 seconds
   # Should auto-merge and mark job as complete
   ```

3. **Test Background Watcher** (if implemented)
   ```bash
   # Start automation server
   # Job should auto-complete when branch is pushed
   # No manual polling needed
   ```

## Benefits

1. ✅ **Works with Web Mode** - Detects when Claude Code pushes branches
2. ✅ **Backward Compatible** - Still supports file-based detection
3. ✅ **Real-time Updates** - Dashboard sees completion within 10-15 seconds
4. ✅ **Auto-Merge** - Branches automatically merged to main
5. ✅ **Auto-Push** - Changes pushed to GitHub automatically
6. ✅ **Resilient** - Falls back to file detection if git polling fails

## Next Steps

1. Implement `pollGitBranches()` function
2. Update Phase 5 waiting loop
3. Test with Chinese course Phase 5 run
4. Apply to Phase 1 and Phase 3
5. (Optional) Add background git watcher for real-time detection

## Related Files

- **Automation Server**: `/automation_server.cjs`
- **Dashboard**: `/src/components/ProgressMonitor.vue`
- **API Polling**: Line 231 in ProgressMonitor.vue (`apiClient.get('/api/courses/:code/status')`)
