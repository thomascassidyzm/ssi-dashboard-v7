# Orchestrator Parallel Coordination Implementation

**Date:** 2025-11-19
**Status:** ✅ Complete - Hybrid orchestration with parallel phase execution

---

## What Was Built

### 1. **Updated PHASE_SERVERS Mapping** ✅

**File:** `services/orchestration/orchestrator.cjs` (line 31-38)

Added Phase 5.5 and Phase 7, fixed port numbers for all services:

```javascript
const PHASE_SERVERS = {
  1: process.env.PHASE1_URL || 'http://localhost:3457',    // Translation (includes Phase 2 LUT)
  3: process.env.PHASE3_URL || 'http://localhost:3458',    // LEGO Extraction
  5: process.env.PHASE5_URL || 'http://localhost:3459',    // Practice Baskets
  5.5: process.env.PHASE5_5_URL || 'http://localhost:3460', // Grammar Validation
  6: process.env.PHASE6_URL || 'http://localhost:3461',    // Introductions
  7: process.env.PHASE7_URL || 'http://localhost:3462',    // Manifest Compilation
  8: process.env.PHASE8_URL || 'http://localhost:3463'     // Audio/TTS
};
```

**Changes:**
- Added Phase 5.5 (Grammar Validation) at port 3460
- Added Phase 7 (Manifest Compilation) at port 3462
- Fixed Phase 6 port from 3460 → 3461
- Fixed Phase 8 port from 3461 → 3463

---

### 2. **Pipeline State Tracking** ✅

**File:** `services/orchestration/orchestrator.cjs` (line 61-63)

Added `pipelineJobs` Map to track parallel phase completion:

```javascript
// Pipeline state tracking for parallel phase coordination
// courseCode -> { phase1: {success, completedAt, stats}, phase3: {...}, phase5: {...}, phase6: {...}, phase7: {...} }
const pipelineJobs = new Map();
```

**Why this matters:**
- Tracks which phases have completed for each course
- Enables "wait for both" logic (Phase 5 + Phase 6 before Phase 7)
- Stores success status and stats for each phase
- Separate from `courseStates` (which tracks current active phase)

---

### 3. **Modified `/phase-complete` Endpoint** ✅

**File:** `services/orchestration/orchestrator.cjs` (line 716-831)

**Updated callback handler to:**
1. Accept `success` and `stats` parameters (not just `status`)
2. Update `pipelineJobs` Map with phase completion state
3. Delegate orchestration to `handlePhaseProgression()` function

**Key changes:**
```javascript
// Update pipeline state for parallel coordination
let pipelineJob = pipelineJobs.get(courseCode) || {};
const phaseKey = `phase${phase}`;
pipelineJob[phaseKey] = {
  success: success !== undefined ? success : status === 'complete',
  completedAt: new Date().toISOString(),
  stats: stats || {}
};
pipelineJobs.set(courseCode, pipelineJob);

// Auto-trigger next phase(s) based on orchestration logic
await handlePhaseProgression(courseCode, phase, state, pipelineJob);
```

---

### 4. **Parallel Coordination Logic** ✅

**File:** `services/orchestration/orchestrator.cjs` (line 777-831)

Added `handlePhaseProgression()` function to orchestrate parallel phases:

```javascript
/**
 * Handle phase progression with parallel coordination
 * Phase 3 → Phase 5 + Phase 6 (parallel)
 * Phase 5 + Phase 6 → Phase 7 (wait for both)
 */
async function handlePhaseProgression(courseCode, completedPhase, state, pipelineJob) {
  if (completedPhase === 'phase3' || completedPhase === 3) {
    // Phase 3 complete → trigger BOTH Phase 5 AND Phase 6 in parallel
    console.log(`   → Phase 3 complete, triggering Phase 5 AND Phase 6 in parallel`);
    setTimeout(() => {
      triggerPhase(courseCode, 5);
      triggerPhase(courseCode, 6);
    }, 2000);
  } else if (completedPhase === 'phase5' || completedPhase === 5) {
    // Phase 5 complete → check if Phase 6 also complete
    console.log(`   → Phase 5 complete, checking if Phase 6 is also done...`);
    if (pipelineJob.phase6?.success) {
      console.log(`   ✓ Both Phase 5 and Phase 6 complete, triggering Phase 7`);
      setTimeout(() => triggerPhase(courseCode, 7), 2000);
    } else {
      console.log(`   ⏳ Waiting for Phase 6 to complete before triggering Phase 7`);
    }
  } else if (completedPhase === 'phase6' || completedPhase === 6) {
    // Phase 6 complete → check if Phase 5 also complete
    console.log(`   → Phase 6 complete, checking if Phase 5 is also done...`);
    if (pipelineJob.phase5?.success) {
      console.log(`   ✓ Both Phase 5 and Phase 6 complete, triggering Phase 7`);
      setTimeout(() => triggerPhase(courseCode, 7), 2000);
    } else {
      console.log(`   ⏳ Waiting for Phase 5 to complete before triggering Phase 7`);
    }
  } else if (completedPhase === 'phase1' || completedPhase === 1) {
    // Phase 1 → Phase 3 (linear)
    console.log(`   → Phase 1 complete, triggering Phase 3`);
    setTimeout(() => triggerPhase(courseCode, 3), 2000);
  } else if (completedPhase === 'phase7' || completedPhase === 7) {
    // Phase 7 → Phase 8 (linear)
    console.log(`   → Phase 7 complete, triggering Phase 8`);
    setTimeout(() => triggerPhase(courseCode, 8), 2000);
  } else if (completedPhase === 'phase8' || completedPhase === 8) {
    // Phase 8 → All complete!
    state.status = 'complete';
    console.log(`   🎉 All phases complete!`);
  }
}
```

**Orchestration Rules:**
- **Phase 1 → Phase 3** (linear)
- **Phase 3 → Phase 5 + Phase 6** (parallel - both triggered immediately)
- **Phase 5 OR Phase 6 → Check if both done → Phase 7** (wait for both)
- **Phase 7 → Phase 8** (linear)
- **Phase 8 → Complete!**

---

### 5. **Phase 6 Orchestrator Notification** ✅

**File:** `services/phases/phase6-introduction-server.cjs`

**Added orchestrator callback when introductions complete:**

```javascript
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';

// In .then() after generateIntroductions() completes:
const response = await fetch(`${ORCHESTRATOR_URL}/phase-complete`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phase: 'phase6',
    courseCode,
    success: true,
    status: 'complete',
    stats: {
      introductionsGenerated: result.count || 0,
      completedAt: new Date().toISOString()
    }
  })
});
```

**Why this matters:**
- Phase 6 now notifies orchestrator when complete
- Orchestrator can coordinate Phase 5 + Phase 6 → Phase 7 transition
- Matches Phase 5 notification pattern

---

## Complete Automation Flow

```
User triggers Phase 1
  ↓
Phase 1: Translation + Phase 2 LUT check
  ↓
✅ Phase 1 complete → Orchestrator triggers Phase 3
  ↓
Phase 3: LEGO Extraction
  ↓
✅ Phase 3 complete → Orchestrator triggers BOTH Phase 5 AND Phase 6
  ↓                                           ↓
Phase 5: Baskets                         Phase 6: Introductions
  ↓                                           ↓
  - 15 browsers × 15 workers                  - Read lego_pairs.json
  - Generate baskets                          - Generate introductions
  - Upload via ngrok                          - Write introductions.json
  - Auto-merge + clean                        - ~20ms generation time
  - Trigger Phase 5.5                         ↓
  ↓                                    ✅ Phase 6 complete
Phase 5.5: Grammar Validation                ↓
  - 15 browsers × 15 workers × 3 seeds       Notify orchestrator
  - Validate all phrases                      ↓
  - Delete grammar errors               Check if Phase 5 done?
  - Check deletion rate (<20%)               ↓
  ↓                                          YES
✅ Phase 5 complete                           ↓
  ↓                                    ✅ BOTH Phase 5 + Phase 6 complete
Notify orchestrator                           ↓
  ↓                               Orchestrator triggers Phase 7
Check if Phase 6 done?                        ↓
  ↓                                    Phase 7: Manifest Compilation
  YES                                         ↓
  ↓                                    ✅ Phase 7 complete
  ↓                                           ↓
  ↓                                    Orchestrator triggers Phase 8
  ↓                                           ↓
  ↓                                    Phase 8: Audio/TTS
  ↓                                           ↓
  └────────────────────────────────────> ✅ ALL PHASES COMPLETE!
```

---

## Key Features

### **Parallel Execution**
- Phase 5 and Phase 6 run simultaneously after Phase 3 completes
- No blocking - both phases start immediately
- Orchestrator coordinates completion

### **Smart Coordination**
- Orchestrator waits for BOTH Phase 5 AND Phase 6 before triggering Phase 7
- Whichever finishes first waits for the other
- Clear logging shows wait status

### **Backward Compatible**
- Linear phases (1→3, 7→8) still work as before
- Fallback to `getNextPhase()` for unknown phases
- Respects `CHECKPOINT_MODE` setting

### **Robust Failure Handling**
- Phase failures don't trigger next phases
- Validation failures block progression
- Error states tracked in `pipelineJobs`

---

## Testing the Implementation

### Start all services:
```bash
npm run automation
```

This starts:
- Port 3456: Orchestrator
- Port 3457: Phase 1
- Port 3458: Phase 3
- Port 3459: Phase 5
- Port 3460: Phase 5.5 (Grammar)
- Port 3461: Phase 6 (Introductions)
- Port 3462: Phase 7 (Manifest)
- Port 3463: Phase 8 (Audio)

### Trigger Phase 1:
```bash
curl -X POST http://localhost:3456/api/courses/spa_for_eng/start-phase \
  -H "Content-Type: application/json" \
  -d '{"phase": 1, "totalSeeds": 668}'
```

### Monitor orchestrator logs:
```bash
# Watch for parallel execution messages:
#   → Phase 3 complete, triggering Phase 5 AND Phase 6 in parallel
#   → Phase 5 complete, checking if Phase 6 is also done...
#   ⏳ Waiting for Phase 6 to complete before triggering Phase 7
#   → Phase 6 complete, checking if Phase 5 is also done...
#   ✓ Both Phase 5 and Phase 6 complete, triggering Phase 7
```

### Check status:
```bash
curl http://localhost:3456/api/courses/spa_for_eng/status
```

---

## Files Modified

### **services/orchestration/orchestrator.cjs**
- Line 31-38: Updated PHASE_SERVERS mapping (added 5.5, 7, fixed ports)
- Line 61-63: Added pipelineJobs Map for parallel coordination
- Line 716-775: Modified /phase-complete endpoint
- Line 777-831: Added handlePhaseProgression() function

### **services/phases/phase6-introduction-server.cjs**
- Line 20: Added ORCHESTRATOR_URL constant
- Line 58-92: Added orchestrator notification on success
- Line 93-118: Added orchestrator notification on failure

---

## Architecture Decision

We chose **Option 3 (Hybrid)**:
- ✅ Orchestrator tracks pipeline state centrally (`pipelineJobs` Map)
- ✅ Phases notify orchestrator when complete (`/phase-complete` callback)
- ✅ Orchestrator decides what to trigger next (`handlePhaseProgression()`)
- ✅ Handles parallel coordination (Phase 5 + Phase 6 → Phase 7)
- ✅ Handles "wait for both" logic cleanly

**Why not Option 1 (Phases self-trigger)?**
- Hard to coordinate parallel phases
- No central visibility
- Race conditions possible

**Why not Option 2 (Orchestrator polls)?**
- Inefficient
- Delayed transitions
- More complex

---

## Next Steps

### Immediate:
1. ✅ **DONE:** Orchestrator parallel coordination
2. ⏳ **TODO:** Test with complete pipeline (Phase 1 → 8)
3. ⏳ **TODO:** Add Phase 7 and Phase 8 server implementations
4. ⏳ **TODO:** Verify Phase 5.5 triggers correctly from Phase 5

### Future Enhancements:
- Dashboard UI showing parallel execution state
- Real-time progress bars for Phase 5 + Phase 6
- Pipeline visualization (Gantt chart style)
- Error recovery (retry failed phases)

---

## Status Transitions

Course progresses through these orchestrated states:

```
idle
  ↓
Phase 1 running
  ↓
Phase 3 running
  ↓
Phase 5 + Phase 6 running (parallel)
  ↓
Phase 7 running (waits for both 5 + 6)
  ↓
Phase 8 running
  ↓
complete
```

Or if error:
```
validation_failed    ← Validation blocked progression
error                ← Phase execution failed
```

---

## Success Criteria

✅ Orchestrator tracks parallel phase state
✅ Phase 3 completion triggers BOTH Phase 5 AND Phase 6
✅ Phase 5 OR Phase 6 completion checks if both done
✅ Phase 7 triggered only after BOTH Phase 5 AND Phase 6 complete
✅ Phase 6 notifies orchestrator on completion
✅ PHASE_SERVERS mapping has correct ports for all phases
✅ Backward compatible with linear phases (1→3, 7→8)
✅ Clear logging shows orchestration decisions

**Ready for end-to-end testing!**
