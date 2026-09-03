# Enhanced Status Tracking Implementation

## Overview

Enhanced realistic status tracking has been implemented in the Phase 5 basket server, providing granular visibility into observable milestones without making false promises about internal agent state.

## What Was Implemented (Phase 5)

### 1. Enhanced Job State Structure

```javascript
const job = {
  // Basic info
  courseCode,
  totalSeeds,
  startSeed,
  endSeed,
  target,
  known,
  status: 'preparing_scaffolds',
  startedAt: new Date().toISOString(),

  // NEW: Milestone tracking
  milestones: {
    scaffoldsReady: false,
    scaffoldsReadyAt: null,
    watcherStarted: false,
    watcherStartedAt: null,
    windowsSpawned: 0,
    windowsTotal: 0,
    lastWindowSpawnedAt: null,
    branchesDetected: 0,
    branchesExpected: 0,
    lastBranchDetectedAt: null,
    branchesMerged: 0,
    mergeStartedAt: null,
    mergeCompletedAt: null
  },

  // NEW: Detailed branch tracking
  branches: [
    {
      branchName: 'claude/baskets-spa_for_eng-window-01',
      detectedAt: '2025-11-16T22:08:15Z',
      seedRange: 'S0001-S0070',
      expectedSeeds: 70,
      merged: false
    }
  ],

  // Configuration
  config: {
    browsers: 10,
    agents: 7,
    seedsPerAgent: 10,
    totalAgents: 70,
    capacity: 700
  },

  // Warnings & errors
  error: null,
  warnings: []
};
```

### 2. Enhanced `/status` Endpoint

Returns comprehensive observable data:

```javascript
{
  courseCode: 'spa_for_eng',
  status: 'waiting_for_branches',
  subStatus: '3_of_10_branches_detected',

  // Milestone tracking
  milestones: { ... },

  // Detailed branch info
  branches: [
    {
      branchName: 'claude/baskets-spa_for_eng-window-01',
      detectedAt: '2025-11-16T22:08:15Z',
      seedRange: 'S0001-S0070',
      expectedSeeds: 70,
      merged: false
    }
  ],

  // Timing & velocity
  timing: {
    startedAt: '2025-11-16T22:00:00Z',
    elapsedSeconds: 720,
    velocity: {
      branchesCompleted: 3,
      elapsedSinceFirstBranch: 264,
      avgSecondsPerBranch: 88,
      estimatedSecondsRemaining: 616,
      estimatedCompletionAt: '2025-11-16T22:22:40Z'
    }
  },

  // Coverage analysis
  coverage: {
    seedsAssigned: 700,
    seedsActual: 668,
    seedsUnassigned: 0,
    coveragePercent: 95.4
  },

  config: { ... },
  error: null,
  warnings: []
}
```

### 3. Branch Watcher Enhancement

Detects and tracks branches in detail:

- Detects new branch appearances
- Extracts window number from branch name
- Calculates seed range based on window number
- Updates milestones on detection
- Tracks merge progress
- Updates branch status when merged

### 4. Window Spawning Tracking

Updates milestones as windows are spawned:

```javascript
job.milestones.windowsSpawned++;
job.milestones.lastWindowSpawnedAt = new Date().toISOString();
```

### 5. Velocity Calculation

Real-time velocity calculation once branches start appearing:

```javascript
const avgSecondsPerBranch = elapsedSinceFirstBranch / branchesCompleted;
const estimatedSecondsRemaining = remainingBranches * avgSecondsPerBranch;
const estimatedCompletionAt = new Date(now + estimatedSecondsRemaining * 1000);
```

## Dashboard Display Examples

With this tracking, dashboards can show:

**Spawning Phase:**
```
🌐 Phase 5: Practice Basket Generation

Status: Spawning browser windows
├─ Windows spawned: 8/10
├─ Next spawn: 5 seconds
└─ Watching for branches: claude/baskets-spa_for_eng-*

Configuration:
├─ Browsers: 10
├─ Agents per window: 7 (70 total)
├─ Seeds per agent: 10
└─ Total capacity: 700 seeds (covers 668)

Elapsed: 2m 20s
```

**Waiting for Branches:**
```
🌐 Phase 5: Practice Basket Generation

Status: Waiting for agent branches
├─ Branches detected: 3/10
├─ Last detected: 2 minutes ago
└─ Branch pattern: claude/baskets-spa_for_eng-*

Detected branches:
├─ window-01 (S0001-S0070) - detected 12m ago
├─ window-02 (S0071-S0140) - detected 10m ago
└─ window-03 (S0141-S0210) - detected 8m ago

Velocity: ~1 branch every 4 minutes
Estimated completion: 28 minutes remaining

Elapsed: 12m 00s
```

## Applying to Phase 1 and Phase 3

### Phase 1 (Translation)

Phase 1 currently uses a sequential single-agent approach, so the tracking should be simpler:

```javascript
// Job state
{
  milestones: {
    branchDetected: false,
    branchDetectedAt: null,
    translationComplete: false
  },
  branches: [],  // Usually just 1 branch
  estimatedCompletion: '~10 minutes'
}
```

**Status endpoint enhancement:**
- Track when branch is detected
- No velocity calculation (single branch)
- Show elapsed time
- Show expected completion time (can be hardcoded based on seed count)

### Phase 3 (LEGO Extraction)

Phase 3 uses segmentation, so tracking is similar to Phase 5:

```javascript
{
  milestones: {
    segmentationCalculated: true,
    segmentationCalculatedAt: null,
    windowsSpawned: 0,
    windowsTotal: 0,
    branchesDetected: 0,
    branchesExpected: 0,
    mergeStartedAt: null,
    mergeCompletedAt: null
  },
  branches: [],
  segmentation: {
    strategy: 'MEDIUM_SINGLE',
    segmentCount: 1,
    totalAgents: 10,
    seedsPerAgent: 10
  }
}
```

**Apply same patterns:**
1. Track milestones as they occur
2. Detect branches and calculate seed ranges
3. Calculate velocity once branches start appearing
4. Track merge progress

## Key Principles

✅ **Only track observables** - No guessing about internal agent state
✅ **Branch detection = progress** - This is our only real-time metric
✅ **Calculate velocity** - Once branches appear, estimate completion
✅ **Track configuration** - Known upfront, helps calculate coverage
✅ **Preserve timestamps** - For all milestones, enables velocity calc
✅ **Detailed branch info** - Track which seeds each branch handles

❌ **Don't track internal agent state** - We have no visibility
❌ **Don't track items processed** - Only known when branch appears
❌ **Don't track active agents** - Sandboxed, no visibility

## Files Modified

### Phase 5 (Basket Generation)
- `/services/phases/phase5-basket-server.cjs`
  - Enhanced job state structure (lines 158-200)
  - Added milestone tracking throughout
  - Enhanced `/status` endpoint with velocity calculation (lines 282-377)
  - Enhanced branch watcher to track detailed branch info (lines 431-503)
  - Enhanced window spawning to track milestones (lines 570-589)

### Phase 3 (LEGO Extraction)
- `/services/phases/phase3-lego-extraction-server.cjs`
  - Enhanced job state structure with milestones and branches (lines 385-425)
  - Added segmentation-specific milestones (deduplication tracking)
  - Enhanced `/status` endpoint with velocity calculation (lines 621-719)
  - Implemented proper branch watcher with git polling (lines 530-644)
  - Enhanced segment spawning to track milestones (lines 675-710)

## Implementation Status

1. ✅ Phase 5 - Complete
2. ✅ Phase 3 - Complete
3. ⏭️  Phase 1 - Not needed (single non-parallel agent)
4. ✅ **Orchestrator integration** - Status endpoint now proxies phase server details
5. ⏳ Dashboard UI updates to display enhanced tracking (optional - works with existing UI)
6. ⏳ Test with real course generation

## Orchestrator Integration

The orchestrator now **automatically includes** detailed phase tracking in its status response:

**Before:**
```json
GET /api/courses/spa_for_eng/status
{
  "currentPhase": 3,
  "status": "running",
  "phasesCompleted": [1]
}
```

**After (Enhanced):**
```json
GET /api/courses/spa_for_eng/status
{
  "currentPhase": 3,
  "status": "running",
  "phasesCompleted": [1],
  "estimatedCompletion": "2025-11-16T22:45:00Z",

  "phaseDetails": {
    "status": "waiting_for_branches",
    "subStatus": "3_of_10_branches_detected",
    "milestones": { ... },
    "branches": [ ... ],
    "timing": {
      "velocity": {
        "avgSecondsPerBranch": 88,
        "estimatedCompletionAt": "2025-11-16T22:45:00Z"
      }
    }
  }
}
```

**Key Features:**
- ✅ Backward compatible - existing dashboard still works
- ✅ Non-blocking - 2-second timeout for phase server fetch
- ✅ Graceful degradation - missing phase details don't break response
- ✅ Real-time - includes velocity-based time estimates
- ✅ No dashboard changes required - enhancement is additive

See `/services/orchestration/STATUS_API.md` for complete API documentation.

## Testing

### Testing Phase 5 (Basket Generation)

1. Start automation services:
   ```bash
   cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean
   node start-automation.cjs
   ```

2. Trigger Phase 5 for a course:
   ```bash
   curl -X POST http://localhost:3459/start \
     -H "Content-Type: application/json" \
     -d '{
       "courseCode": "spa_for_eng",
       "startSeed": 1,
       "endSeed": 100,
       "target": "Spanish",
       "known": "English"
     }'
   ```

3. Poll status endpoint:
   ```bash
   curl http://localhost:3459/status/spa_for_eng | jq
   ```

4. Observe:
   - Milestones updating as windows spawn
   - Branches appearing in `branches` array
   - Velocity calculation appearing once 2+ branches detected
   - Estimated completion time updating

### Testing Phase 3 (LEGO Extraction)

1. Trigger Phase 3 for a course:
   ```bash
   curl -X POST http://localhost:3458/start \
     -H "Content-Type: application/json" \
     -d '{
       "courseCode": "spa_for_eng",
       "totalSeeds": 100,
       "target": "spa",
       "known": "eng",
       "strategy": "auto"
     }'
   ```

2. Poll status endpoint:
   ```bash
   curl http://localhost:3458/status/spa_for_eng | jq
   ```

3. Observe:
   - Segmentation strategy calculated (MEDIUM_SINGLE for 100 seeds)
   - Orchestrators spawning milestones
   - Branches detected with segment numbers and seed ranges
   - Velocity calculation once multiple segments complete
   - Deduplication phase tracking (Phase 3.5)
   - Estimated completion time
