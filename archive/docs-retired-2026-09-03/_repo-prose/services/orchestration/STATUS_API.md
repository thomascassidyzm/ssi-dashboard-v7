# Orchestrator Status API - Enhanced Response Format

## Endpoint

```
GET /api/courses/:courseCode/status
```

## Description

Returns comprehensive status information for a course generation job, combining:
1. **Orchestrator-level state** - High-level progress across all phases
2. **Phase-level details** - Granular tracking from the active phase server (if running)

## Response Format

### When No Active Job

```json
{
  "courseCode": "spa_for_eng",
  "currentPhase": null,
  "status": "idle",
  "checkpointMode": "gated"
}
```

### When Job is Running (Enhanced with Phase Details)

```json
{
  // ===== ORCHESTRATOR-LEVEL STATE =====
  "courseCode": "spa_for_eng",
  "currentPhase": 3,
  "status": "running",
  "startedAt": "2025-11-16T22:00:00.000Z",
  "lastUpdated": "2025-11-16T22:15:30.000Z",
  "phasesCompleted": [1],
  "checkpointMode": "gated",
  "waitingForApproval": false,
  "estimatedCompletion": "2025-11-16T22:45:00.000Z",

  // ===== PHASE-LEVEL DETAILS (from active phase server) =====
  "phaseDetails": {
    "courseCode": "spa_for_eng",
    "status": "waiting_for_branches",
    "subStatus": "3_of_10_branches_detected",

    // Milestone tracking
    "milestones": {
      "segmentationCalculated": true,
      "segmentationCalculatedAt": "2025-11-16T22:00:00.000Z",
      "watcherStarted": true,
      "watcherStartedAt": "2025-11-16T22:00:05.000Z",
      "orchestratorsSpawned": 10,
      "orchestratorsTotal": 10,
      "lastOrchestratorSpawnedAt": "2025-11-16T22:02:20.000Z",
      "branchesDetected": 3,
      "branchesExpected": 10,
      "lastBranchDetectedAt": "2025-11-16T22:12:34.000Z",
      "branchesMerged": 0,
      "mergeStartedAt": null,
      "mergeCompletedAt": null
    },

    // Detailed branch tracking
    "branches": [
      {
        "branchName": "claude/phase3-segment-1-spa_for_eng",
        "detectedAt": "2025-11-16T22:08:15.000Z",
        "seedRange": "S0001-S0100",
        "segmentNumber": 1,
        "expectedSeeds": 100,
        "merged": false
      },
      {
        "branchName": "claude/phase3-segment-2-spa_for_eng",
        "detectedAt": "2025-11-16T22:10:22.000Z",
        "seedRange": "S0101-S0200",
        "segmentNumber": 2,
        "expectedSeeds": 100,
        "merged": false
      },
      {
        "branchName": "claude/phase3-segment-3-spa_for_eng",
        "detectedAt": "2025-11-16T22:12:34.000Z",
        "seedRange": "S0201-S0300",
        "segmentNumber": 3,
        "expectedSeeds": 100,
        "merged": false
      }
    ],

    // Timing & velocity
    "timing": {
      "startedAt": "2025-11-16T22:00:00.000Z",
      "elapsedSeconds": 720,
      "velocity": {
        "branchesCompleted": 3,
        "elapsedSinceFirstBranch": 264,
        "avgSecondsPerBranch": 88,
        "estimatedSecondsRemaining": 616,
        "estimatedCompletionAt": "2025-11-16T22:22:40.000Z"
      }
    },

    // Coverage analysis (Phase 3 specific)
    "coverage": {
      "seedsTotal": 668,
      "segmentCount": 7,
      "totalAgents": 70,
      "seedsPerAgent": 10,
      "strategy": "LARGE_MULTI"
    },

    // Segmentation details
    "segmentation": {
      "totalSeeds": 668,
      "segmentSize": 100,
      "seedsPerAgent": 10,
      "segmentCount": 7,
      "totalAgents": 70,
      "strategy": "LARGE_MULTI",
      "segments": [
        {
          "segmentNumber": 1,
          "startSeed": 1,
          "endSeed": 100,
          "seedCount": 100,
          "agentCount": 10,
          "seedsPerAgent": 10
        }
        // ... more segments
      ]
    },

    "error": null,
    "warnings": []
  }
}
```

## Phase-Specific Details

### Phase 1 (Translation)
Currently returns basic status only (single non-parallel agent).

### Phase 3 (LEGO Extraction)
```json
{
  "phaseDetails": {
    "status": "waiting_for_branches",
    "subStatus": "3_of_7_branches_detected",
    "milestones": { ... },
    "branches": [ ... ],
    "timing": { "velocity": { ... } },
    "coverage": {
      "seedsTotal": 668,
      "segmentCount": 7,
      "totalAgents": 70,
      "strategy": "LARGE_MULTI"
    },
    "segmentation": { ... }
  }
}
```

### Phase 5 (Basket Generation)
```json
{
  "phaseDetails": {
    "status": "waiting_for_branches",
    "subStatus": "5_of_10_branches_detected",
    "milestones": {
      "scaffoldsReady": true,
      "windowsSpawned": 10,
      "windowsTotal": 10,
      "branchesDetected": 5,
      "branchesExpected": 10
    },
    "branches": [ ... ],
    "timing": { "velocity": { ... } },
    "coverage": {
      "seedsAssigned": 700,
      "seedsActual": 668,
      "seedsUnassigned": 0,
      "coveragePercent": 95.4
    },
    "config": {
      "browsers": 10,
      "agents": 7,
      "seedsPerAgent": 10,
      "totalAgents": 70,
      "capacity": 700
    }
  }
}
```

## Dashboard Display Recommendations

### High-Level Progress (Orchestrator)
```
Phase 3 of 5 complete
Current: Phase 5 (Practice Baskets)
Estimated completion: 25 minutes
```

### Detailed Progress (Phase Server)
```
Phase 5: Generating Practice Baskets

Status: Waiting for agent branches
├─ Branches detected: 5/10
├─ Last detected: 3 minutes ago
└─ Velocity: ~1 branch every 4 minutes

Estimated completion: 20 minutes remaining
Elapsed: 18m 00s
```

### Branch Timeline
```
✅ window-01 (S0001-S0070) - completed 15m ago
✅ window-02 (S0071-S0140) - completed 12m ago
✅ window-03 (S0141-S0210) - completed 9m ago
✅ window-04 (S0211-S0280) - completed 6m ago
✅ window-05 (S0281-S0350) - completed 3m ago
⏳ window-06 (S0351-S0420) - in progress
⏳ window-07 (S0421-S0490) - in progress
⏳ window-08 (S0491-S0560) - in progress
⏳ window-09 (S0561-S0630) - in progress
⏳ window-10 (S0631-S0668) - in progress
```

## Error Handling

### Phase Server Unavailable
If the phase server is not running or doesn't respond, the orchestrator gracefully degrades:

```json
{
  "courseCode": "spa_for_eng",
  "currentPhase": 5,
  "status": "running",
  "startedAt": "2025-11-16T22:00:00.000Z",
  "phasesCompleted": [1, 3],
  "checkpointMode": "gated"
  // No phaseDetails field - fallback to basic status
}
```

The dashboard should handle missing `phaseDetails` gracefully and show basic progress only.

### Phase Server Returns 404
Normal - means the phase server doesn't have an active job for this course yet (orchestrator hasn't delegated to it).

## Implementation Notes

1. **Non-blocking** - Phase server fetch has 2-second timeout
2. **Graceful degradation** - Missing phase details don't break the response
3. **Backward compatible** - Existing dashboard code still works with base fields
4. **Real-time** - Dashboard polls this endpoint (typically every 2-5 seconds)
5. **Cacheable** - Response includes `lastUpdated` timestamp for caching

## Example Usage

```bash
# Poll status during generation
while true; do
  curl -s http://localhost:3456/api/courses/spa_for_eng/status | jq '
    {
      phase: .currentPhase,
      status: .phaseDetails.status,
      branches: "\(.phaseDetails.branches | length)/\(.phaseDetails.milestones.branchesExpected)",
      eta: .estimatedCompletion
    }
  '
  sleep 5
done
```

Output:
```json
{
  "phase": 5,
  "status": "waiting_for_branches",
  "branches": "5/10",
  "eta": "2025-11-16T22:45:00.000Z"
}
```
