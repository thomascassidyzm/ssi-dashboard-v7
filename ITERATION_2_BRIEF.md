# Iteration 2 Brief: Edit Workflow Automation

**Date**: 2025-10-13
**Target**: Complete Critical Feature #3 (Edit Workflow)
**Estimated Effort**: 4-6 hours
**Priority**: Medium (Required before 668-seed scale, optional for 30-seed test)

---

## Mission

Implement automatic phase regeneration when translations are edited through the dashboard UI, completing Critical Feature #3 as specified in APML lines 1467-1476.

---

## Current State (From APML Verification Report)

### What Works
✅ User can edit translations in CourseEditor.vue
✅ PUT /api/courses/:code/translations/:uuid endpoint saves edits
✅ Course metadata is marked with `needs_regeneration: true` flag

### What's Missing
❌ Automatic triggering of Phase 3+ regeneration
❌ Real-time dashboard updates showing regeneration progress
❌ Edit cascade workflow (edit → trigger → execute → display)

---

## APML Specification Requirements

**Source**: ssi-course-production.apml, lines 1467-1476

```
EDIT_WORKFLOW:
  User edits translation in UI
    ↓
  PUT /api/courses/:code/translations/:uuid
    ↓
  Triggers regeneration of affected phases
    ↓
  Phase 3+ re-run with updated translation
    ↓
  Dashboard shows updated results
```

**Current vs Required**:
```javascript
// CURRENT (automation_server.cjs:1395-1400)
metadata.needs_regeneration = true;  // Only sets flag
metadata.last_edit = { seed_id, timestamp };
await fs.writeJson(metadataPath, metadata);
// → User must manually trigger regeneration

// REQUIRED
metadata.needs_regeneration = true;
const jobId = await triggerRegenerationCascade(courseCode, seedId);
res.json({ success: true, jobId, message: 'Regeneration started' });
// → Automatic cascade with job tracking
```

---

## Implementation Plan

### Task 1: Backend - Automatic Regeneration Trigger

**File**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/automation_server.cjs`
**Location**: Lines 1367-1411 (PUT /api/courses/:code/translations/:uuid)

**Changes Required**:

1. **Add regeneration cascade function** (insert before line 1367):

```javascript
/**
 * Trigger regeneration of phases affected by translation edit
 * @param {string} courseCode - Course identifier
 * @param {string} seedId - Edited seed ID (e.g., 'S0042')
 * @returns {Promise<string>} - Job ID for tracking
 */
async function triggerRegenerationCascade(courseCode, seedId) {
  const jobId = `regen_${Date.now()}_${seedId}`;
  const coursePath = path.join(CONFIG.VFS_ROOT, courseCode);

  // Create regeneration job
  ACTIVE_JOBS[jobId] = {
    type: 'regeneration',
    courseCode,
    seedId,
    status: 'running',
    startTime: Date.now(),
    phases: ['3', '3.5', '4', '5', '6'],
    currentPhase: '3',
    progress: 0
  };

  // Execute phases sequentially (Phase 3 → 3.5 → 4 → 5 → 6)
  const phasesToRun = [
    { id: '3', name: 'LEGO Extraction' },
    { id: '3.5', name: 'Graph Construction' },
    { id: '4', name: 'Deduplication' },
    { id: '5', name: 'Pattern-Aware Baskets' },
    { id: '6', name: 'Introductions' }
  ];

  // Run regeneration in background
  (async () => {
    try {
      for (const [index, phase] of phasesToRun.entries()) {
        ACTIVE_JOBS[jobId].currentPhase = phase.id;
        ACTIVE_JOBS[jobId].progress = Math.round(((index) / phasesToRun.length) * 100);

        console.log(`[${jobId}] Running Phase ${phase.id}: ${phase.name}...`);

        // Execute phase using existing infrastructure
        await spawnPhaseAgent(courseCode, phase.id, PHASE_PROMPTS[phase.id]);

        console.log(`[${jobId}] Phase ${phase.id} complete`);
      }

      // Mark complete
      ACTIVE_JOBS[jobId].status = 'completed';
      ACTIVE_JOBS[jobId].progress = 100;
      ACTIVE_JOBS[jobId].endTime = Date.now();

      console.log(`✅ Regeneration cascade complete for ${seedId}`);

    } catch (error) {
      ACTIVE_JOBS[jobId].status = 'failed';
      ACTIVE_JOBS[jobId].error = error.message;
      console.error(`❌ Regeneration cascade failed for ${seedId}:`, error);
    }
  })();

  return jobId;
}
```

2. **Update PUT /api/courses/:code/translations/:uuid** (modify lines 1367-1411):

```javascript
app.put('/api/courses/:courseCode/translations/:uuid', async (req, res) => {
  try {
    const { courseCode, uuid } = req.params;
    const { source, target } = req.body;
    const coursePath = path.join(CONFIG.VFS_ROOT, courseCode);

    // Find translation file
    const translationPath = path.join(coursePath, 'amino_acids', 'translations', `${uuid}.json`);

    if (!await fs.pathExists(translationPath)) {
      return res.status(404).json({ error: 'Translation not found' });
    }

    // Load existing translation
    const translation = await fs.readJson(translationPath);

    // Update fields
    translation.source = source;
    translation.target = target;
    translation.metadata.updated_at = new Date().toISOString();
    translation.metadata.edited = true;

    // Save updated translation
    await fs.writeJson(translationPath, translation, { spaces: 2 });

    // Update course metadata
    const metadataPath = path.join(coursePath, 'course_metadata.json');
    const metadata = await fs.readJson(metadataPath);
    metadata.needs_regeneration = true;
    metadata.last_edit = {
      seed_id: translation.seed_id,
      timestamp: new Date().toISOString()
    };
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });

    // **NEW**: Trigger automatic regeneration cascade
    const jobId = await triggerRegenerationCascade(courseCode, translation.seed_id);

    res.json({
      success: true,
      message: 'Translation updated. Regeneration started automatically.',
      translation,
      jobId,  // Return job ID for tracking
      regenerationStatus: 'started'
    });
  } catch (error) {
    console.error('Error updating translation:', error);
    res.status(500).json({ error: 'Failed to update translation' });
  }
});
```

3. **Add regeneration status endpoint** (insert after line 1411):

```javascript
/**
 * GET /api/courses/:courseCode/regeneration/:jobId
 * Check status of regeneration job
 */
app.get('/api/courses/:courseCode/regeneration/:jobId', (req, res) => {
  const { jobId } = req.params;

  const job = ACTIVE_JOBS[jobId];

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    jobId,
    status: job.status,
    currentPhase: job.currentPhase,
    progress: job.progress,
    startTime: job.startTime,
    endTime: job.endTime,
    error: job.error
  });
});
```

---

### Task 2: Frontend - Real-time Regeneration Status

**File**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/views/CourseEditor.vue`

**Changes Required**:

1. **Add regeneration state tracking** (add to component setup):

```vue
<script setup>
import { ref, computed, onUnmounted } from 'vue'
import api from '../services/api'

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  }
})

// Existing state...
const editedTranslation = ref(null)
const saving = ref(false)

// NEW: Regeneration tracking
const isRegenerating = ref(false)
const regenerationJobId = ref(null)
const regenerationProgress = ref(0)
const regenerationPhase = ref('')
const regenerationError = ref(null)
let pollInterval = null

// NEW: Save and regenerate
const saveTranslation = async () => {
  saving.value = true
  try {
    const response = await api.course.updateTranslation(
      props.courseCode,
      editedTranslation.value.uuid,
      {
        source: editedTranslation.value.source,
        target: editedTranslation.value.target
      }
    )

    // Start tracking regeneration
    if (response.jobId) {
      regenerationJobId.value = response.jobId
      isRegenerating.value = true
      startRegenerationPolling()
    }

    alert('✅ Translation saved! Regenerating affected phases...')
  } catch (error) {
    alert(`❌ Failed to save translation: ${error.message}`)
  } finally {
    saving.value = false
  }
}

// NEW: Poll regeneration status
const startRegenerationPolling = () => {
  pollInterval = setInterval(async () => {
    try {
      const response = await fetch(
        `${api.defaults.baseURL}/api/courses/${props.courseCode}/regeneration/${regenerationJobId.value}`
      )
      const data = await response.json()

      regenerationProgress.value = data.progress
      regenerationPhase.value = data.currentPhase

      if (data.status === 'completed') {
        isRegenerating.value = false
        stopPolling()
        alert('✅ Regeneration complete! Course updated.')
      } else if (data.status === 'failed') {
        isRegenerating.value = false
        regenerationError.value = data.error
        stopPolling()
        alert(`❌ Regeneration failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to fetch regeneration status:', error)
    }
  }, 2000) // Poll every 2 seconds
}

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

onUnmounted(() => {
  stopPolling()
})
</script>
```

2. **Add regeneration UI** (insert in template):

```vue
<template>
  <div class="course-editor">

    <!-- Existing editor UI... -->

    <!-- NEW: Regeneration Progress Banner -->
    <div v-if="isRegenerating" class="fixed bottom-0 left-0 right-0 bg-blue-900/95 border-t-2 border-blue-500 p-6 shadow-2xl z-50">
      <div class="max-w-7xl mx-auto">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <svg class="animate-spin w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div>
              <h3 class="text-white font-semibold">Regenerating Course</h3>
              <p class="text-blue-300 text-sm">Phase {{ regenerationPhase }} in progress...</p>
            </div>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold text-white">{{ regenerationProgress }}%</div>
            <div class="text-xs text-blue-300">Processing</div>
          </div>
        </div>
        <div class="w-full bg-blue-950 rounded-full h-3">
          <div
            class="bg-blue-400 h-3 rounded-full transition-all duration-300"
            :style="{ width: `${regenerationProgress}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Error Banner -->
    <div v-if="regenerationError" class="fixed bottom-0 left-0 right-0 bg-red-900/95 border-t-2 border-red-500 p-4 z-50">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-3">
          <svg class="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
          <div>
            <h3 class="text-white font-semibold">Regeneration Failed</h3>
            <p class="text-red-300 text-sm">{{ regenerationError }}</p>
          </div>
        </div>
        <button @click="regenerationError = null" class="text-white hover:text-red-200">
          ✕
        </button>
      </div>
    </div>

  </div>
</template>
```

---

### Task 3: API Service Integration

**File**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/services/api.js`

**Changes Required**:

Verify `updateTranslation` method exists (should already be there from line 52-55). If not, add:

```javascript
async updateTranslation(courseCode, uuid, data) {
  const response = await api.put(`/api/courses/${courseCode}/translations/${uuid}`, data)
  return response.data
}
```

---

### Task 4: Minor - API Endpoint Naming Alignment

**File**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/automation_server.cjs`

**Changes Required** (OPTIONAL - Low priority):

Add alias routes to match APML specification naming:

```javascript
// Alias routes for APML compliance (lines 1421 and 1444 specify /api/registry/phase-prompts)
app.get('/api/registry/phase-prompts/:phase', (req, res) => {
  req.url = req.url.replace('/api/registry/phase-prompts/', '/api/prompts/')
  app._router.handle(req, res)
})

app.put('/api/registry/phase-prompts/:phase', (req, res) => {
  req.url = req.url.replace('/api/registry/phase-prompts/', '/api/prompts/')
  app._router.handle(req, res)
})
```

Or simpler - just update APML line 1421 to say `/api/prompts/:phase`.

---

## Testing Checklist

After implementation, verify:

### Backend Testing
- [ ] Edit a translation via PUT /api/courses/:code/translations/:uuid
- [ ] Verify response includes `jobId` field
- [ ] Verify `regenerationStatus: 'started'` in response
- [ ] Check ACTIVE_JOBS contains regeneration job
- [ ] Verify GET /api/courses/:code/regeneration/:jobId returns job status
- [ ] Verify phases execute in sequence: 3 → 3.5 → 4 → 5 → 6
- [ ] Verify job status updates to 'completed' when done
- [ ] Check VFS for regenerated LEGO/basket files with updated timestamps

### Frontend Testing
- [ ] Open CourseEditor for a course
- [ ] Edit a translation and save
- [ ] Verify regeneration progress banner appears
- [ ] Verify progress bar updates every 2 seconds
- [ ] Verify phase name displays current phase
- [ ] Verify banner dismisses when regeneration completes
- [ ] Verify success alert shows
- [ ] Verify no memory leaks (polling stops after completion)

### Integration Testing
- [ ] Edit translation → verify automatic cascade
- [ ] Check quality dashboard shows updated extraction
- [ ] Verify provenance preserved through regeneration
- [ ] Test multiple simultaneous edits (job queue handling)

---

## Files to Modify

1. `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/automation_server.cjs`
   - Add `triggerRegenerationCascade()` function (~50 lines)
   - Modify PUT /api/courses/:code/translations/:uuid (~15 lines)
   - Add GET /api/courses/:code/regeneration/:jobId (~20 lines)
   - Optional: Add alias routes (~10 lines)

2. `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/views/CourseEditor.vue`
   - Add regeneration state management (~30 lines)
   - Add polling logic (~40 lines)
   - Add regeneration UI components (~80 lines)

**Total Changes**: ~245 lines of code across 2 files

---

## APML Line References

- **Lines 1467-1476**: Edit workflow specification
- **Line 1421**: Prompt API endpoint naming
- **Line 1424**: PUT endpoint for prompt updates
- **Lines 803-843**: Existing regeneration endpoint pattern (reference for consistency)

---

## Success Criteria

After Iteration 2:

✅ User edits translation in CourseEditor.vue
✅ PUT /api/courses/:code/translations/:uuid automatically triggers Phase 3+ regeneration
✅ Regeneration runs in background with job tracking
✅ Dashboard shows real-time regeneration progress with visual feedback
✅ User sees success notification when regeneration completes
✅ Critical Feature #3 = 100% complete
✅ APML compliance = 95%+ (all major requirements met)

---

## Notes

### Why This Wasn't Included in Track Implementations

The track agents focused on **UI component implementation** (displaying data, forms, visualizations). The **workflow automation logic** (triggering cascades, background jobs) requires integration across multiple systems and wasn't explicitly called out in track briefs.

### Reusing Existing Infrastructure

The good news: All necessary infrastructure already exists!
- ✅ `ACTIVE_JOBS` tracking system
- ✅ `spawnPhaseAgent()` for phase execution
- ✅ `PHASE_PROMPTS` registry
- ✅ Status polling patterns from CourseGeneration.vue

Iteration 2 is just **connecting the pieces**.

---

## Estimated Timeline

- **Task 1 (Backend)**: 2-3 hours
- **Task 2 (Frontend)**: 2 hours
- **Task 3 (API)**: 15 minutes (verification only)
- **Task 4 (Optional)**: 15 minutes
- **Testing**: 1 hour

**Total**: 4-6 hours for a single developer

---

## Alternative: Manual Workflow (Current State)

If Iteration 2 is deferred:

**Current Workaround**:
1. User edits translation
2. User navigates to Quality Dashboard
3. User selects edited seed
4. User clicks "Rerun Seed"
5. System regenerates Phase 3+

**Pros**: Already works, no additional development
**Cons**: Manual, extra steps, not what APML specifies

**Recommendation**: Fine for 30-seed test, but implement Iteration 2 before 668-seed scale.

---

**Brief Created**: 2025-10-13
**Priority**: Medium
**Blocking**: No (optional for 30-seed test)
**Recommended**: Yes (before full-scale 668-seed rollout)
