# Dashboard Parallel Pipeline UI - Simple Implementation

**Date:** 2025-11-19
**Status:** Proposal - Minimal changes for maximum clarity

---

## Current State

### What Exists ✅
- **ProgressMonitor.vue** component showing linear phases: 1 → 3 → 5 → 6 → 7
- Polls `/api/courses/:courseCode/status` every 30 seconds
- Shows checkmarks (✓) for complete, pulsing dots (●) for active, empty dots (○) for pending
- Activity timeline shows events
- Already has nice Tailwind CSS styling

### What's Missing ❌
- No visual indication that Phase 5 and Phase 6 run **in parallel**
- No "waiting for both" state before Phase 7
- No display of which phase is done vs which is still running

---

## Proposed Changes (MINIMAL)

We'll make **3 simple changes** - keep the existing UI mostly the same, just add parallel awareness.

---

## 1. Backend: Orchestrator Status Endpoint ✨

**File:** `services/orchestration/orchestrator.cjs`

**Modify:** `/api/courses/:courseCode/status` endpoint (line 565-605)

**Add pipeline job state to response:**

```javascript
app.get('/api/courses/:courseCode/status', async (req, res) => {
  const { courseCode } = req.params;
  const state = courseStates.get(courseCode);

  if (!state) {
    return res.json({
      courseCode,
      currentPhase: null,
      status: 'idle',
      checkpointMode: CHECKPOINT_MODE
    });
  }

  // Get pipeline job state for parallel coordination
  const pipelineJob = pipelineJobs.get(courseCode) || {};

  const response = {
    courseCode,
    currentPhase: state.currentPhase,
    status: state.status,
    startedAt: state.startedAt,
    lastUpdated: state.lastUpdated,
    phasesCompleted: state.phasesCompleted,
    checkpointMode: CHECKPOINT_MODE,
    waitingForApproval: state.waitingForApproval,

    // NEW: Add pipeline state
    pipeline: {
      phase1: pipelineJob.phase1 || null,
      phase3: pipelineJob.phase3 || null,
      phase5: pipelineJob.phase5 || null,
      phase6: pipelineJob.phase6 || null,
      phase7: pipelineJob.phase7 || null,
      phase8: pipelineJob.phase8 || null,

      // Helper flags for UI
      phase5And6Running: !!(
        (pipelineJob.phase3?.success) &&          // Phase 3 done
        (!pipelineJob.phase5?.success || !pipelineJob.phase6?.success) // At least one not done
      ),
      waitingForBoth: !!(
        (pipelineJob.phase5?.success && !pipelineJob.phase6?.success) ||
        (pipelineJob.phase6?.success && !pipelineJob.phase5?.success)
      )
    }
  };

  // ... rest of existing code (phase details fetch, etc.)

  res.json(response);
});
```

**Why this works:**
- ✅ Returns pipeline state for all phases
- ✅ Includes helper flags `phase5And6Running` and `waitingForBoth`
- ✅ UI can show parallel execution easily
- ✅ Backward compatible - existing UI still works

---

## 2. Frontend: ProgressMonitor Update 🎨

**File:** `src/components/ProgressMonitor.vue`

### Option A: Side-by-Side Layout (RECOMMENDED)

```vue
<!-- Phase 5 & 6: Parallel Execution -->
<div v-if="pipelineState?.phase5And6Running || phase5Active || phase6Active"
     class="bg-slate-900/50 rounded-lg p-4">
  <div class="text-xs text-purple-400 mb-2 font-medium">
    ⚡ Running in Parallel
  </div>

  <div class="grid grid-cols-2 gap-4">
    <!-- Phase 5 -->
    <div class="bg-slate-800/50 rounded-lg p-3">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <div v-if="phase5Complete" class="text-green-400">✓</div>
          <div v-else-if="phase5Active" class="text-yellow-400 animate-pulse">●</div>
          <div v-else class="text-slate-600">○</div>
          <span class="text-sm font-medium text-slate-300">Phase 5</span>
        </div>
      </div>
      <div class="text-xs text-slate-400">Practice Baskets</div>
      <div v-if="phase5Active" class="text-xs text-emerald-400 mt-1">
        Generating...
      </div>
    </div>

    <!-- Phase 6 -->
    <div class="bg-slate-800/50 rounded-lg p-3">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <div v-if="phase6Complete" class="text-green-400">✓</div>
          <div v-else-if="phase6Active" class="text-yellow-400 animate-pulse">●</div>
          <div v-else class="text-slate-600">○</div>
          <span class="text-sm font-medium text-slate-300">Phase 6</span>
        </div>
      </div>
      <div class="text-xs text-slate-400">Introductions</div>
      <div v-if="phase6Active" class="text-xs text-emerald-400 mt-1">
        Generating...
      </div>
    </div>
  </div>

  <!-- Waiting for both message -->
  <div v-if="pipelineState?.waitingForBoth"
       class="mt-3 text-xs text-purple-400 flex items-center gap-2 bg-purple-500/10 rounded px-3 py-2">
    <span class="animate-pulse">⏳</span>
    <span>Waiting for {{ phase5Complete ? 'Phase 6' : 'Phase 5' }} to complete before Phase 7</span>
  </div>
</div>
```

**Visual Example:**

```
┌─────────────────────────────────────┐
│ ⚡ Running in Parallel              │
├──────────────────┬──────────────────┤
│ ● Phase 5        │ ✓ Phase 6        │
│ Practice Baskets │ Introductions    │
│ Generating...    │                  │
└──────────────────┴──────────────────┘
┌─────────────────────────────────────┐
│ ⏳ Waiting for Phase 5 to complete  │
│    before Phase 7                   │
└─────────────────────────────────────┘
```

---

### Option B: Stacked with Connector (Alternative)

```vue
<!-- Phase 3 -->
<div class="bg-slate-900/50 rounded-lg p-4">
  <!-- existing Phase 3 UI -->
</div>

<!-- Parallel Divider -->
<div v-if="phase3Complete && !phase7Active" class="flex items-center gap-2">
  <div class="flex-1 h-px bg-purple-500/30"></div>
  <span class="text-xs text-purple-400 font-medium">Parallel Execution</span>
  <div class="flex-1 h-px bg-purple-500/30"></div>
</div>

<!-- Phase 5 -->
<div class="bg-slate-900/50 rounded-lg p-4">
  <!-- existing Phase 5 UI with ⚡ badge -->
</div>

<!-- Phase 6 -->
<div class="bg-slate-900/50 rounded-lg p-4">
  <!-- existing Phase 6 UI with ⚡ badge -->
</div>

<!-- "Waiting for both" message -->
<div v-if="pipelineState?.waitingForBoth" class="...">
  ⏳ Waiting for both Phase 5 and Phase 6 to complete
</div>
```

**Visual Example:**

```
┌─────────────────────────────────────┐
│ ✓ Phase 3: LEGO Extraction          │
└─────────────────────────────────────┘
     ─── Parallel Execution ───
┌─────────────────────────────────────┐
│ ● Phase 5: Practice Baskets ⚡      │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ ✓ Phase 6: Introductions ⚡         │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ ⏳ Waiting for Phase 5 to complete  │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ ○ Phase 7: Course Manifest          │
└─────────────────────────────────────┘
```

---

## 3. Add Pipeline State to Component 📊

**File:** `src/components/ProgressMonitor.vue` (script section)

```javascript
// Add to state (around line 210)
const pipelineState = ref(null)

// Add to checkProgress() function (around line 350)
const checkProgress = async () => {
  try {
    const jobResponse = await apiClient.get(`/api/courses/${props.courseCode}/status`)
    if (jobResponse.data) {
      status.value = jobResponse.data.status
      currentPhase.value = jobResponse.data.phase || ''
      currentMessage.value = jobResponse.data.message || ''
      subProgress.value = jobResponse.data.subProgress || null
      events.value = jobResponse.data.events || []
      windows.value = jobResponse.data.windows || []

      // NEW: Store pipeline state
      pipelineState.value = jobResponse.data.pipeline || null
    }

    // ... rest of existing code
  } catch (error) {
    console.error('[ProgressMonitor] Failed to check progress:', error)
  }
}
```

---

## Implementation Complexity

### 🟢 **Backend: EASY (10 minutes)**
- Add `pipelineJobs` state to status response
- Add helper flags for UI
- ~15 lines of code

### 🟢 **Frontend: EASY (15 minutes)**
- Add `pipelineState` ref
- Update template with parallel layout
- ~30 lines of code

### Total: **~25 minutes of work**

---

## Comparison: What Users Will See

### Before (Linear - Confusing)
```
✓ Phase 3: LEGO Extraction
○ Phase 5: Practice Baskets
○ Phase 6: Introductions
○ Phase 7: Course Manifest

[5 minutes later...]

✓ Phase 3: LEGO Extraction
● Phase 5: Practice Baskets  ← Running
✓ Phase 6: Introductions     ← Done! But why is Phase 7 not starting?
○ Phase 7: Course Manifest   ← User confused: "Why isn't this running?"
```

**User thinks:** "Phase 6 is done, why isn't Phase 7 starting? Is it stuck?"

---

### After (Parallel - Clear)
```
✓ Phase 3: LEGO Extraction

⚡ Running in Parallel
┌──────────────────┬──────────────────┐
│ ● Phase 5        │ ✓ Phase 6        │
│ Generating...    │ Complete         │
└──────────────────┴──────────────────┘

⏳ Waiting for Phase 5 to complete before Phase 7

○ Phase 7: Course Manifest
```

**User thinks:** "Oh! Phase 5 and 6 run in parallel. Phase 6 is done, but Phase 7 is waiting for Phase 5. Makes sense!"

---

## Recommendation: Option A (Side-by-Side)

**Why Option A is better:**
- ✅ **Immediately obvious** that Phase 5 + 6 are parallel
- ✅ Clear "waiting for both" message
- ✅ Less vertical space (fits on screen better)
- ✅ Visually distinct from linear phases
- ✅ No confusion about "why isn't Phase 7 starting?"

**Why NOT Option B:**
- ❌ Looks too similar to linear execution
- ❌ Takes more vertical space
- ❌ Less obvious that phases run in parallel

---

## Alternative: Even Simpler (Minimal Touch)

If you want the **absolute minimum** change:

### Just add a banner when waiting:

```vue
<!-- Between Phase 6 and Phase 7 -->
<div v-if="phase5Complete && phase6Complete && !phase7Active"
     class="my-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
  <div class="flex items-center gap-2 text-sm text-green-400">
    <span>✓</span>
    <span>Both Phase 5 and Phase 6 complete - starting Phase 7...</span>
  </div>
</div>

<div v-else-if="(phase5Complete || phase6Complete) && !phase7Active"
     class="my-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
  <div class="flex items-center gap-2 text-sm text-purple-400">
    <span class="animate-pulse">⏳</span>
    <span>Phase {{ phase5Complete ? '6' : '5' }} still running - Phase 7 will start when both Phase 5 and 6 complete</span>
  </div>
</div>
```

**This is literally 10 lines of template code** and requires NO backend changes (uses existing phase completion flags).

---

## Testing the UI

### Start automation server:
```bash
npm run automation
```

### Trigger Phase 3 completion (or full pipeline from Phase 1):
```bash
curl -X POST http://localhost:3456/api/courses/spa_for_eng/start-phase \
  -H "Content-Type: application/json" \
  -d '{"phase": 3, "totalSeeds": 668}'
```

### Watch the dashboard:
1. Phase 3 completes
2. **Parallel section appears** with Phase 5 + Phase 6
3. Whichever finishes first shows **waiting message**
4. When both complete, Phase 7 starts
5. Clear visual feedback throughout

---

## Files to Modify

### Backend:
1. **services/orchestration/orchestrator.cjs** (line 565-605)
   - Add `pipeline` object to status response
   - Add helper flags (`phase5And6Running`, `waitingForBoth`)

### Frontend:
1. **src/components/ProgressMonitor.vue** (template)
   - Add parallel layout section
   - Add waiting message

2. **src/components/ProgressMonitor.vue** (script)
   - Add `pipelineState` ref
   - Update `checkProgress()` to capture pipeline state

---

## Summary

**Minimal Implementation (10 lines):**
- Add waiting banner between Phase 6 and Phase 7
- No backend changes needed
- Uses existing phase completion flags

**Recommended Implementation (50 lines):**
- Side-by-side parallel layout for Phase 5 + 6
- Backend adds pipeline state to API response
- Clear "waiting for both" message
- Professional, obvious, no confusion

**Which should we build?**

I recommend the **Recommended Implementation** - it's only 25 minutes of work and provides crystal-clear UX.

---

**Ready to implement?** Let me know which option you prefer and I'll code it up!
