# Automation Server Status Communication Issue

## What You Asked For

> "it seems not to be communicating back to the dashboard what it's doing - and the automation server SHOULD be merging all new branches into main, and pushing to main automatically - at the end of a phase completion - I'm not sure how we can know that new branches have been created and pushed to but the automation server should do some sort of watching process?"

## What I Found

### ✅ What's Working

1. **Dashboard Polling** - Dashboard polls `/api/courses/:code/status` every 30 seconds ✓
2. **Git Auto-Merge** - Automation server DOES merge Claude branches and push to main ✓
3. **Status Updates** - Job status is stored in `STATE.jobs` and returned via API ✓

### ❌ What's NOT Working

**The automation server only knows agents are complete when they write provisional files to `phase5_outputs/agent_*_provisional.json`**

**If Claude Code on Web:**
- Completes work ✓
- Commits changes ✓
- Pushes to `claude/phase5-xxx` branch ✓
- **BUT doesn't write provisional files** ❌

**Then:**
- Automation server waits forever for provisional files that never come
- Git merge never triggers
- Job status never updates to 'completed'
- Dashboard keeps showing "phase_5_staged_running" forever

### Current Detection Logic

```javascript
// automation_server.cjs, line 2084-2110
let agentsComplete = 0;
while (agentsComplete < expectedAgents) {
  await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10s

  if (await fs.pathExists(outputsDir)) {
    const files = await fs.readdir(outputsDir);
    agentsComplete = files.filter(f => f.match(/^agent_\d+_provisional\.json$/)).length;
  }
}

// Only after provisional files detected does it merge:
await execAsync('git fetch --all', { cwd: baseCourseDir });
await execAsync('git merge origin/claude/phase5-xxx ...', { cwd: baseCourseDir });
await execAsync('git push origin main', { cwd: baseCourseDir });
```

## The Solution

**Add git-based detection as a FALLBACK** to file-based detection:

### Dual Detection System

```
┌─────────────────────────────────────────────────┐
│  Phase 5 Completion Detection                   │
├─────────────────────────────────────────────────┤
│                                                  │
│  Method 1: File-Based (existing)                │
│  - Poll phase5_outputs/agent_*_provisional.json │
│  - Works for local mode                         │
│  - Good when agents write to filesystem         │
│                                                  │
│           OR                                     │
│                                                  │
│  Method 2: Git-Based (NEW)                      │
│  - Poll git remote for claude/phase5-* branches │
│  - Check if commits are newer than job start    │
│  - Works for Web mode                           │
│  - Detects when Claude pushes to branches       │
│                                                  │
│  ➜ Whichever detects first triggers merge       │
└─────────────────────────────────────────────────┘
```

### Implementation

I've created a detailed solution document: **`GIT_BRANCH_WATCHING_SOLUTION.md`**

Key changes needed:

1. **Add `pollGitBranches()` function** - Polls git remote for new branches
2. **Update waiting loops** - Check BOTH provisional files AND git branches
3. **Add background watcher** (optional) - Real-time detection without polling

## Example: What Should Happen

```
User clicks "Generate Phase 5" in dashboard
  ↓
Automation server:
  - Creates job
  - Opens Claude Code on Web
  - Pastes master prompt
  - Sets status = 'phase_5_staged_running'
  ↓
Claude Code on Web:
  - Executes prompt
  - Generates phase5_outputs/seed_s0001.json (etc)
  - Commits to claude/phase5-20250114-xyz
  - Pushes to GitHub
  ↓
Automation server (polling every 10s):
  - git fetch --all
  - Finds origin/claude/phase5-20250114-xyz
  - Checks commit time > job start time → NEW! ✅
  - Merges to main
  - Pushes to main
  - Sets status = 'completed'
  ↓
Dashboard (polling every 30s):
  - GET /api/courses/:code/status
  - Sees status = 'completed'
  - Shows green checkmark ✓
  - Updates UI
```

## Why This is Better

| Current (File-Only) | Proposed (Dual Detection) |
|---------------------|---------------------------|
| ❌ Fails if no provisional files | ✅ Works even without provisional files |
| ❌ Only works for local mode | ✅ Works for Web mode and local mode |
| ❌ Gets stuck waiting forever | ✅ Detects via git as fallback |
| ✅ Fast when files written | ✅ Still fast when files written |

## Testing Required

Once implemented, test:

1. ✅ **Phase 5 Web Mode** - Run Chinese course Phase 5, verify completion detected
2. ✅ **Phase 1 Web Mode** - Run new course Phase 1, verify completion detected
3. ✅ **Phase 3 Web Mode** - Run new course Phase 3, verify completion detected
4. ✅ **Auto-merge** - Verify branches merged to main automatically
5. ✅ **Dashboard Update** - Verify status updates within 30 seconds

## Files to Modify

1. **`automation_server.cjs`**
   - Line ~2084: Add git-based detection to Phase 5 loop
   - Line ~1900: Add git-based detection to Phase 1 loop (if applicable)
   - Line ~2370: Add git-based detection to Phase 3 loop (if applicable)
   - Add `pollGitBranches()` helper function

2. **No dashboard changes needed** - Polling already works correctly

## Priority

**HIGH** - This blocks the full automation workflow. Without this:
- Web mode appears broken
- Dashboard never shows completion
- Manual git merge required
- No Phase 6/7 auto-trigger

## Estimated Time

- **Core implementation**: 1-2 hours
- **Testing**: 30 minutes
- **Total**: 2-3 hours

## Next Action

Ready to implement? I can:
1. ✅ Add `pollGitBranches()` function to automation_server.cjs
2. ✅ Update Phase 5 waiting loop with dual detection
3. ✅ Test with existing Chinese course
4. ✅ Apply to Phase 1 and Phase 3 if needed
