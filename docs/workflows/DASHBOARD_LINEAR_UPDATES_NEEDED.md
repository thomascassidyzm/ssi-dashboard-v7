# Dashboard Updates for Linear Pipeline

**Date:** 2025-11-19
**Status:** Audit Complete - Changes Needed

---

## Problem

The backend was simplified to a **linear pipeline** (Phase 3 now includes Phase 6 intro generation), but the **dashboard still shows Phase 6** as a separate phase.

**Result:** UI shows outdated/incorrect flow - confusing for users.

---

## Files with Phase 6 References

Found **40 references** to Phase 6 across **11 Vue files**:

1. `src/components/ProgressMonitor.vue` ⚠️ **HIGH PRIORITY**
2. `src/views/CourseGeneration.vue` ⚠️ **HIGH PRIORITY**
3. `src/views/Dashboard.vue` ⚠️ **MEDIUM PRIORITY**
4. `src/views/CourseEditor.vue`
5. `src/views/CourseValidator.vue`
6. `src/views/PhaseIntelligence.vue`
7. `src/views/ProcessOverview.vue`
8. `src/views/TrainingPhase.vue`
9. `src/views/APMLSpec.vue`
10. `src/views/TerminologyGlossary.vue`
11. `src/components/SkillsArchitectureVisualizer.vue`

---

## Recommended Changes

### 🔴 **HIGH PRIORITY: Core Functionality**

These directly affect course generation UX:

#### 1. **ProgressMonitor.vue** - Update Phase Display

**Current (Incorrect):**
```
✓ Phase 3: LEGO Extraction
○ Phase 5: Practice Baskets
○ Phase 6: Introductions      ← Shows as separate phase
○ Phase 7: Course Manifest
```

**Proposed (Correct):**
```
✓ Phase 3: LEGO Extraction + Introductions  ← Combined
○ Phase 5: Practice Baskets + Grammar
○ Phase 7: Course Manifest
○ Phase 8: Audio/TTS
```

**Changes needed:**
```vue
<!-- REMOVE: Phase 6 section (lines 87-101) -->
<!-- Phase 6: Introductions -->
<div class="bg-slate-900/50 rounded-lg p-4">
  <div class="flex items-center justify-between mb-2">
    <div class="flex items-center gap-3">
      <div v-if="phase6Complete" class="text-green-400">✓</div>
      <div v-else-if="phase6Active" class="text-yellow-400 animate-pulse">●</div>
      <div v-else class="text-slate-600">○</div>
      <span class="text-sm font-medium text-slate-300">Phase 6: Introductions</span>
    </div>
    <span v-if="phase6FileExists" class="text-xs text-green-400">introductions.json ✓</span>
  </div>
  <div v-if="phase6Active || phase6Complete" class="text-xs text-slate-400 ml-10">
    Generating LEGO presentation text (~2 seconds)
  </div>
</div>

<!-- UPDATE: Phase 3 section to mention introductions -->
<div class="bg-slate-900/50 rounded-lg p-4">
  <div class="flex items-center justify-between mb-2">
    <div class="flex items-center gap-3">
      <div v-if="phase3Complete" class="text-green-400">✓</div>
      <div v-else-if="phase3Active" class="text-yellow-400 animate-pulse">●</div>
      <div v-else class="text-slate-600">○</div>
      <span class="text-sm font-medium text-slate-300">Phase 3: LEGO Extraction</span>
    </div>
    <div class="flex gap-2">
      <span v-if="phase3FileExists" class="text-xs text-green-400">lego_pairs.json ✓</span>
      <span v-if="introductionsFileExists" class="text-xs text-green-400">introductions.json ✓</span>
    </div>
  </div>
  <div v-if="phase3Active || phase3Complete" class="text-xs text-slate-400 ml-10">
    Extracting linguistic building blocks + generating introductions
  </div>
  <!-- Show sub-progress if available -->
</div>

<!-- REMOVE: phase6 reactive state (lines 217, 256-261) -->
const phase6FileExists = ref(false)
const phase6Active = computed(() => { ... })
const phase6Complete = computed(() => { ... })

<!-- REMOVE: phase6 file check (lines 382-387) -->
try {
  const introductionsCheck = await fetch(...)
  phase6FileExists.value = introductionsCheck.ok
} catch (err) {
  phase6FileExists.value = false
}

<!-- ADD: Check introductions as part of Phase 3 -->
const introductionsFileExists = ref(false)

// In checkProgress():
try {
  const introductionsCheck = await fetch(GITHUB_CONFIG.getCourseFileUrl(baseCourseCode, 'introductions.json'), { method: 'HEAD' })
  introductionsFileExists.value = introductionsCheck.ok
} catch (err) {
  introductionsFileExists.value = false
}
```

---

#### 2. **CourseGeneration.vue** - Remove "Phase 6 Only" Option

**Current (Incorrect):**
```vue
<!-- Phase 6 Only -->
<button
  @click="phaseSelection = 'phase6'"
  :class="[
    'p-4 rounded-lg border-2 transition',
    phaseSelection === 'phase6'
      ? 'bg-blue-500/20 border-blue-500'
      : 'bg-slate-700/30 border-slate-600 hover:border-blue-400'
  ]"
>
  <h4 class="text-sm font-semibold text-slate-100 mb-1">Phase 6 Only</h4>
  <p class="text-xs text-slate-400">Generate introductions for existing LEGOs</p>
</button>
```

**Proposed (Correct):**
```vue
<!-- REMOVE: Phase 6 button entirely (lines 220-234) -->

<!-- UPDATE: Phase selection conditions -->
<!-- Line 256: Remove phase6 from condition -->
<strong>Phase {{ phaseSelection === 'phase1' ? '1' : phaseSelection === 'phase3' ? '3' : phaseSelection === 'phase5' ? '5' : '7' }} requirements:</strong>

<!-- Line 260: Remove phase6 case -->
<span v-else-if="phaseSelection === 'phase3'"> Requires seed_pairs.json (Phase 1 complete)</span>
<span v-else-if="phaseSelection === 'phase5'"> Requires lego_pairs.json (Phase 3 complete)</span>

<!-- Line 734: Update phaseProgressSteps array -->
const phaseProgressSteps = [
  { id: 0, name: 'Phase 1: Translation' },
  { id: 1, name: 'Phase 3: LEGO Extraction' },
  { id: 2, name: 'Phase 5: Practice Baskets' },
  { id: 3, name: 'Phase 7: Compilation' }  // Remove Phase 6 entry
]

<!-- Line 749: Remove phase6 check -->
function getPhaseProgressIndex(phase) {
  if (phase.includes('phase_1')) return 0
  if (phase.includes('phase_3')) return 1
  if (phase.includes('phase_5')) return 2
  if (phase.includes('phase_7')) return 3
  return -1
}
```

---

### 🟡 **MEDIUM PRIORITY: Informational/Display**

These are mostly documentation or reference views:

#### 3. **Dashboard.vue** - Update Quick Stats

Check if it shows Phase 6 as a separate metric. If so, update to show Phase 3 includes introductions.

#### 4. **ProcessOverview.vue** - Update Pipeline Diagram

Likely shows visual pipeline with Phase 6. Update diagram to show:
```
Phase 1 → Phase 3 (+ Intros) → Phase 5 → Phase 7 → Phase 8
```

#### 5. **PhaseIntelligence.vue** - Update Phase Documentation

Remove or update Phase 6 standalone documentation. Note it's part of Phase 3.

#### 6. **TrainingPhase.vue** - Check Phase Routes

If `/phase/6` route exists, redirect to Phase 3 or show "Phase 6 integrated into Phase 3" message.

---

### 🟢 **LOW PRIORITY: Reference Documentation**

These are reference views - update text only:

#### 7. **APMLSpec.vue** - Update APML Documentation
Update any references to Phase 6 as separate phase.

#### 8. **TerminologyGlossary.vue** - Update Glossary
Update Phase 6 definition to note integration into Phase 3.

#### 9. **CourseEditor.vue** - Check File Browser
Ensure it doesn't expect Phase 6 outputs in separate location.

#### 10. **CourseValidator.vue** - Update Validation Logic
Check if validator looks for Phase 6 separately. Update to validate introductions as part of Phase 3.

#### 11. **SkillsArchitectureVisualizer.vue** - Update Diagrams
Update any architecture diagrams showing Phase 6.

---

## Proposed UI Vision

### **Option 1: Compact (Recommended)**

Show Phase 3 and Phase 5 as single blocks with substeps:

```
┌─────────────────────────────────────┐
│ ✓ Phase 1: Translation              │
│   └─ seed_pairs.json                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ● Phase 3: LEGO Extraction          │
│   └─ lego_pairs.json ✓              │
│   └─ introductions.json ✓           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ○ Phase 5: Practice Baskets         │
│   └─ lego_baskets.json (pending)    │
│   └─ grammar validation (pending)   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ○ Phase 7: Course Manifest          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ○ Phase 8: Audio/TTS                │
└─────────────────────────────────────┘
```

**Benefits:**
- ✅ Clear linear flow
- ✅ Shows sub-outputs without cluttering
- ✅ No confusion about "where is Phase 6?"

---

### **Option 2: Detailed (Alternative)**

Expand Phase 3 to show substeps when active:

```
┌─────────────────────────────────────┐
│ ● Phase 3: LEGO Extraction          │
│                                     │
│   ✓ Step 1: Extract LEGOs           │
│   ✓ Step 2: Deduplicate             │
│   ● Step 3: Generate Introductions  │
│                                     │
│   Files:                            │
│   ✓ lego_pairs.json                 │
│   ● introductions.json (generating) │
└─────────────────────────────────────┘
```

**Benefits:**
- ✅ Shows real-time progress within phase
- ✅ Educational - users understand substeps

**Drawbacks:**
- ❌ More complex implementation
- ❌ Takes more vertical space

---

## Implementation Plan

### **Phase 1: Critical Fixes (30 mins)**

1. **ProgressMonitor.vue**
   - Remove Phase 6 section
   - Update Phase 3 to show introductions
   - Remove phase6 reactive state
   - Update file existence checks

2. **CourseGeneration.vue**
   - Remove "Phase 6 Only" button
   - Update phase selection logic
   - Update phaseProgressSteps array

**Test:** Generate a course and verify UI shows correct phases

---

### **Phase 2: Medium Priority (1 hour)**

3. **Dashboard.vue** - Update stats
4. **ProcessOverview.vue** - Update pipeline diagram
5. **PhaseIntelligence.vue** - Update phase docs
6. **TrainingPhase.vue** - Handle phase/6 routes

**Test:** Navigate through all main views, verify no broken UI

---

### **Phase 3: Documentation Cleanup (30 mins)**

7-11. Update remaining reference views

**Test:** Full site audit for "Phase 6" mentions

---

## Success Criteria

After updates:

- ✅ No standalone Phase 6 UI elements
- ✅ Progress monitor shows linear 1 → 3 → 5 → 7 → 8
- ✅ Phase 3 clearly indicates it includes introductions
- ✅ Course generation has no "Phase 6 Only" option
- ✅ All file checks validate correctly
- ✅ No 404s or broken routes related to Phase 6

---

## Quick Fix Script

```bash
# Find all Phase 6 references for manual review
grep -rn "phase6\|Phase 6" src/ --include="*.vue" > phase6-references.txt

# Priority files to update first:
# 1. src/components/ProgressMonitor.vue
# 2. src/views/CourseGeneration.vue
```

---

## Notes

- Keep `introductions.json` file checks - file still exists, just generated differently
- Phase 6 server file can stay (might be useful for standalone testing)
- Update API calls if any explicitly call Phase 6 endpoints (though orchestrator doesn't expose it)

---

**Recommendation:** Start with **Option 1 (Compact)** - simpler, cleaner, less refactoring needed.

**Want me to implement the high-priority changes now?**
