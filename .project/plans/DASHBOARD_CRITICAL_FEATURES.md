# DASHBOARD CRITICAL FEATURES
**Verification Against APML Specification**

---

## OVERVIEW

This document verifies that all 4 APML-specified critical features are addressed in the dashboard build plan. Each critical feature is essential to the SSi Course Production system and must be implemented correctly.

**APML Source:** Lines 1298, 1324-1335, 1345-1354, 1363-1367

---

## CRITICAL FEATURE 1: TrainingPhase.vue Displays ACTUAL Prompts
**APML Reference:** Line 1298
**Priority:** ⚡ HIGHEST

### APML Specification
```
CRITICAL_FEATURE: TrainingPhase.vue displays ACTUAL prompts from registry
  - Fetches from: GET /api/registry/phase-prompts/:phase
  - Shows working reality (not generic docs)
  - Editable textarea allows prompt updates
  - Updates POST to: PUT /api/registry/phase-prompts/:phase
  - Creates version history for every change
```

### Current Implementation Status
**Status:** 🚧 70% COMPLETE

**What Exists:**
- ✅ TrainingPhase.vue component at `/src/views/TrainingPhase.vue`
- ✅ `usePromptManager` composable for API calls
- ✅ `fetchPrompt()` method calls `/api/prompts/:phase`
- ✅ `savePrompt()` method calls `PUT /api/prompts/:phase`
- ✅ Automation server implements endpoints (lines 1421-1502)
- ✅ Editable textarea with save/copy/download buttons
- ✅ Git commit on save with changelog

**Critical Gaps:**
- 🚧 Still shows hardcoded `phaseContent` object as fallback
- ❌ Version history not displayed in UI
- ❌ No visual indicator of "Live from APML Registry"
- ❌ Git history endpoint not integrated (`GET /api/prompts/:phase/history`)

### Build Plan Coverage
**Addressed in:** Track 1, Task 1.2

**Implementation Plan:**
1. **Remove/minimize hardcoded content** (priority: live data first)
2. **Add version history display** using Git log API
3. **Add live indicator** showing "🟢 Live from APML Registry"
4. **Test end-to-end** prompt fetch → edit → save → Git commit

**Files to Modify:**
- `/src/views/TrainingPhase.vue` (primary component)
- `/src/composables/usePromptManager.js` (if needed)

**Estimated Effort:** 3 hours

**Success Criteria:**
- [ ] Prompts load from `/api/prompts/:phase` on component mount
- [ ] No hardcoded content displayed when API succeeds
- [ ] Version history section shows Git log with dates, authors, messages
- [ ] Live indicator displays with green color and timestamp
- [ ] Save button commits to Git with user-provided changelog
- [ ] Prompt updates immediately reflect in automation_server
- [ ] Version increments on each save

**Testing Checklist:**
```bash
# Test 1: Fetch prompt from API
# Navigate to /phase/1
# Expected: Prompt loads from APML registry, shows "Live from APML Registry"

# Test 2: Edit and save prompt
# Edit textarea, click Save, enter changelog
# Expected: Prompt updates, Git commit created, version history updates

# Test 3: Version history
# View "Version History" section
# Expected: Shows Git commits with authors, dates, messages

# Test 4: Fallback behavior
# Stop automation_server.cjs
# Navigate to /phase/1
# Expected: Shows hardcoded fallback with warning message
```

---

## CRITICAL FEATURE 2: Self-Healing Quality System
**APML Reference:** Lines 1324-1335
**Priority:** ⚡ HIGHEST

### APML Specification
```
PURPOSE:
  - Visual review of all phase outputs
  - Flag problematic seeds for regeneration
  - Track prompt evolution over time
  - Self-healing: automatic rerun of failed extractions
```

### Current Implementation Status
**Status:** 🚧 60% COMPLETE

**What Exists:**
- ✅ **QualityDashboard.vue** - Complete component (28,980 bytes)
  - Quality stats cards (avg quality, flagged seeds, accepted, attempts)
  - Quality distribution chart
  - Filters and controls
  - Seed list with quality scores
  - Bulk actions (accept, regenerate)
  - Export functionality (CSV, PDF)

- ✅ **SeedQualityReview.vue** - Complete component (24,443 bytes)
  - Individual seed review interface
  - Attempt history display
  - Accept/reject/regenerate actions
  - Quality issue visualization (IRON RULE violations, low LEGO count)

- ✅ **PromptEvolutionView.vue** - Complete component (26,266 bytes)
  - Prompt version history display
  - Learned rules visualization
  - Experimental rules A/B testing
  - Success rate tracking
  - Rule promotion/rejection UI

- ✅ **Automation Server Quality Endpoints** (lines 762-1085)
  - `GET /api/courses/:code/quality` - Quality report
  - `GET /api/courses/:code/seeds/:seedId/review` - Seed detail
  - `POST /api/courses/:code/seeds/regenerate` - Trigger regeneration
  - `POST /api/courses/:code/seeds/:seedId/accept` - Accept seed
  - `DELETE /api/courses/:code/seeds/:seedId` - Exclude seed
  - `GET /api/courses/:code/prompt-evolution` - Evolution data
  - `POST /api/courses/:code/experimental-rules` - Test rules
  - `POST /api/courses/:code/prompt-evolution/commit` - Commit rules

**Critical Gaps:**
- ❌ **NOT IN ROUTER** - Quality components cannot be accessed
- ❌ **API URL MISMATCHES** - Frontend expects wrong endpoint format
- ❌ **NO NAVIGATION** - Dashboard doesn't link to quality features
- ❌ **SELF-HEALING NOT AUTOMATIC** - Manual regeneration only

### Build Plan Coverage
**Addressed in:** Track 2 (All Tasks)

**Implementation Plan:**

#### Task 2.1: Fix API URL Mismatches (1 hour) **BLOCKER**
```javascript
// Update src/services/api.js
// Change: /api/quality/:courseCode/* → /api/courses/:code/*
```

#### Task 2.2: Add Quality Routes (30 minutes)
```javascript
// Add to src/router/index.js
{
  path: '/quality/:courseCode',
  name: 'QualityDashboard',
  component: QualityDashboard,
  props: true
}
// + 3 more routes for seed review, evolution, health
```

#### Task 2.3: Dashboard Navigation (30 minutes)
```javascript
// Add to src/views/Dashboard.vue
<section class="mb-12">
  <h2>Quality Review & Self-Healing</h2>
  <!-- Quality Dashboard Card -->
  <!-- Prompt Evolution Card -->
</section>
```

#### Task 2.4: Test Quality Workflow (2 hours)
```
Test: Load Dashboard → View Seed → Flag → Regenerate → Accept
```

#### Task 2.5: Quality Indicators in Browser (1 hour)
```javascript
// Add quality badges to CourseBrowser.vue
<span class="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
  Quality: {{ avgQuality }}/10
</span>
```

**Files to Modify:**
- `/src/services/api.js` (fix URLs)
- `/src/router/index.js` (add routes)
- `/src/views/Dashboard.vue` (add navigation)
- `/src/views/CourseBrowser.vue` (add quality indicators)

**Estimated Effort:** 5-7 hours

**Success Criteria:**
- [ ] Quality Dashboard accessible at `/quality/:courseCode`
- [ ] Seed review accessible at `/quality/:courseCode/seeds/:seedId`
- [ ] Prompt evolution accessible at `/quality/:courseCode/evolution`
- [ ] All API endpoints return valid data (not 404)
- [ ] Quality metrics display correctly
- [ ] Seed regeneration triggers successfully
- [ ] Attempt history shows for each seed
- [ ] Prompt evolution tracks version changes
- [ ] Bulk actions work (accept, regenerate multiple seeds)
- [ ] Export to CSV/PDF functional

**Testing Checklist:**
```bash
# Test 1: Load Quality Dashboard
# Navigate to /quality/cym_for_eng_574seeds
# Expected: Stats cards show, distribution chart renders, seed list displays

# Test 2: View Individual Seed
# Click on flagged seed in quality dashboard
# Navigate to /quality/cym_for_eng_574seeds/seeds/C0042
# Expected: Translation shown, LEGOs listed, quality issues displayed, attempt history visible

# Test 3: Trigger Regeneration
# Click "Regenerate" on seed with quality issues
# Expected: Confirmation dialog, POST to /api/courses/:code/seeds/regenerate, job starts

# Test 4: Accept Seed
# Click "Accept" on reviewed seed
# Expected: Status changes to "accepted", seed removed from flagged list

# Test 5: Prompt Evolution
# Navigate to /quality/cym_for_eng_574seeds/evolution
# Expected: Version history displays, learned rules shown, experimental rules interface works

# Test 6: Bulk Actions
# Select multiple seeds, click "Regenerate All"
# Expected: Batch job starts, progress tracked, results displayed
```

### Self-Healing Implementation Note
**Current Status:** Manual regeneration only
**Future Enhancement:** Automatic self-healing would require:
1. Background job monitoring quality metrics
2. Automatic flagging of low-quality seeds
3. Automatic regeneration triggers below threshold
4. Notification system for completed self-healing

**Recommendation:** Implement manual quality review first (current plan), then add automatic self-healing in v7.1

---

## CRITICAL FEATURE 3: Edit Workflow (Regeneration Trigger)
**APML Reference:** Lines 1345-1354
**Priority:** ⚡ HIGHEST

### APML Specification
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

### Current Implementation Status
**Status:** 🚧 40% COMPLETE

**What Exists:**
- ✅ CourseEditor.vue at `/src/views/CourseEditor.vue` (19,616 bytes)
- ✅ Route exists: `/courses/:courseCode`
- ✅ Loads course data via `GET /api/courses/:courseCode`
- ✅ Displays translations in list
- ✅ Can edit translation text in textarea
- ✅ Calls `PUT /api/courses/:courseCode/translations/:uuid`

**Critical Gaps:**
- ❌ **No provenance display** before edit
- ❌ **No impact analysis** showing affected LEGOs/baskets
- ❌ **Doesn't trigger regeneration** after save
- ❌ **No polling for regeneration status**
- ❌ **No visual feedback** of regeneration progress

### Build Plan Coverage
**Addressed in:** Track 4, Task 4.3

**Implementation Plan:**

#### Step 1: Add Provenance Display (1 hour)
```javascript
// Before allowing edit, show impact analysis
const checkProvenance = async (seedId) => {
  const data = await api.course.traceProvenance(courseCode, seedId)
  // Show modal with affected LEGOs, baskets
}
```

#### Step 2: Add Provenance Modal (30 minutes)
```html
<div class="modal">
  <h2>Edit Impact Analysis</h2>
  <ul>
    <li>🔄 {{ data.legos }} LEGOs will be regenerated</li>
    <li>🔄 {{ data.baskets }} baskets will be recompiled</li>
  </ul>
  <button @click="proceedWithEdit">Proceed & Regenerate</button>
</div>
```

#### Step 3: Implement Regeneration Trigger (1 hour)
```javascript
const proceedWithEdit = async () => {
  // 1. Save edited translation
  await api.course.updateTranslation(...)

  // 2. Trigger regeneration
  const job = await api.quality.bulkRerun(courseCode, [seedId])

  // 3. Start polling for status
  startRegenerationPolling(job.jobId)
}
```

#### Step 4: Add Regeneration Status UI (30 minutes)
```html
<div class="fixed bottom-4 right-4 bg-slate-800 rounded-lg p-6">
  <h3>Regeneration in Progress</h3>
  <div>Status: {{ regenerationStatus.status }}</div>
  <div v-if="status === 'in_progress'">
    <svg class="animate-spin">...</svg>
    Regenerating affected phases...
  </div>
</div>
```

**Files to Modify:**
- `/src/views/CourseEditor.vue` (primary implementation)
- `/src/services/api.js` (add `getRegenerationStatus` if missing)

**Estimated Effort:** 3 hours

**Success Criteria:**
- [ ] Click "Edit" shows provenance modal first
- [ ] Modal displays number of affected LEGOs and baskets
- [ ] "Proceed" button saves edit AND triggers regeneration
- [ ] Regeneration job ID returned from API
- [ ] Polling starts for regeneration status
- [ ] Status toast/card shows progress in real-time
- [ ] When complete, course data reloads automatically
- [ ] Updated LEGOs/baskets visible in course view

**Testing Checklist:**
```bash
# Test 1: View Provenance Before Edit
# Navigate to /courses/cym_for_eng_574seeds
# Click edit on seed C0042
# Expected: Modal appears showing "5 LEGOs, 3 baskets will be affected"

# Test 2: Cancel Edit
# Click "Cancel" in provenance modal
# Expected: No changes made, modal closes

# Test 3: Proceed with Edit
# Click "Proceed with Edit & Regenerate"
# Expected:
#   - Translation saved via PUT /api/courses/:code/translations/:uuid
#   - Regeneration triggered via POST /api/courses/:code/seeds/regenerate
#   - Job ID returned
#   - Status polling starts

# Test 4: Monitor Regeneration
# Watch regeneration status card
# Expected:
#   - Shows "in_progress" with spinner
#   - Updates every 2 seconds
#   - Shows "completed" when done
#   - Course data reloads

# Test 5: View Updated Results
# After regeneration completes, view the edited seed
# Expected:
#   - Translation shows new text
#   - LEGOs regenerated from new translation
#   - Baskets reflect updated LEGOs
```

### Architecture Notes

**Provenance System:**
```
Translation UUID → LEGOs (via source_translation_uuid)
LEGO UUID → Deduplicated LEGOs (via provenance array)
Deduplicated LEGO UUID → Baskets (via lego_manifest)
```

**Regeneration Flow:**
```
1. Edit Translation (Phase 1 output)
   ↓
2. Regenerate Phase 3 (LEGO Extraction)
   ↓
3. Regenerate Phase 3.5 (Graph Construction)
   ↓
4. Regenerate Phase 4 (Deduplication)
   ↓
5. Regenerate Phase 5 (Baskets)
   ↓
6. Regenerate Phase 6 (Introductions)
   ↓
7. Recompile Manifest
```

**Why This Is Critical:**
- Enables iterative refinement of course content
- Provenance tracking prevents "breaking" changes
- Surgical updates avoid full course regeneration
- Edit → Regenerate workflow is core to self-improvement

---

## CRITICAL FEATURE 4: APML as Single Source of Truth
**APML Reference:** Lines 1363-1367
**Priority:** ⚡ HIGH

### APML Specification
```
SELF_DOCUMENTATION:
  - This APML file is the single source of truth
  - Dashboard components fetch from this specification
  - Changes to APML regenerate documentation
  - No drift between docs and reality
```

### Current Implementation Status
**Status:** ✅ 90% COMPLETE

**What Exists:**
- ✅ **APML File** at `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/ssi-course-production.apml`
- ✅ **APML Registry Compiler** at `scripts/compile-apml-registry.cjs`
- ✅ **Compiled Registry** at `.apml-registry.json`
- ✅ **Automation Server Loads Registry** (line 55-67)
  ```javascript
  const apmlRegistry = require('./.apml-registry.json')
  const PHASE_PROMPTS = apmlRegistry.variable_registry.PHASE_PROMPTS
  ```
- ✅ **APMLSpec.vue** displays specification at `/reference/apml`
- ✅ **Prompt Endpoints** fetch from APML:
  - `GET /api/prompts/:phase` (line 1421)
  - `PUT /api/prompts/:phase` (line 1444) - Updates APML + Git commit
  - `GET /api/prompts/:phase/history` (line 1508) - Git log
- ✅ **TrainingPhase.vue** can fetch from registry via `usePromptManager`

**Minor Gaps:**
- 🚧 TrainingPhase still shows hardcoded fallback (but has live fetch capability)
- ❌ No automatic doc regeneration on APML change (manual script run)
- ❌ PROJECT-DASHBOARD.html not implemented

### Build Plan Coverage
**Addressed in:** Track 1, Task 1.2 (TrainingPhase integration)

**Already Implemented:**
1. ✅ APML file contains all phase definitions
2. ✅ Registry compiler extracts variables
3. ✅ Automation server loads from registry
4. ✅ Prompt endpoints read/write APML
5. ✅ Git commits track all changes
6. ✅ APMLSpec.vue displays specification

**Remaining Work:**
1. 🚧 Ensure TrainingPhase prioritizes live data over hardcoded
2. ❌ Add automatic registry recompilation on APML save
3. ❌ Generate PROJECT-DASHBOARD.html from APML (optional)

**Estimated Effort:** 1 hour (just TrainingPhase fix)

**Success Criteria:**
- [ ] All phase prompts load from APML registry
- [ ] PUT /api/prompts/:phase updates APML file
- [ ] Git commit created on every prompt update
- [ ] Registry recompiles after APML update
- [ ] No hardcoded prompts displayed when API available
- [ ] APMLSpec.vue shows current APML content
- [ ] Version numbers increment correctly

**Testing Checklist:**
```bash
# Test 1: APML Registry Loading
# Start automation_server.cjs
# Check console output
# Expected: "✅ Loaded 8 phase prompts from APML registry"

# Test 2: Fetch Prompt from Registry
# GET /api/prompts/1
# Expected: Returns Phase 1 prompt from APML file

# Test 3: Update Prompt
# PUT /api/prompts/1 with new prompt text
# Expected:
#   - APML file updated
#   - Git commit created
#   - Registry recompiled
#   - automation_server reloads

# Test 4: View APML Specification
# Navigate to /reference/apml
# Expected: Shows complete APML content with syntax highlighting

# Test 5: No Drift
# Edit APML file manually
# Recompile registry: node scripts/compile-apml-registry.cjs
# Restart automation_server
# Navigate to /phase/1
# Expected: Shows updated prompt (not old cached version)
```

### Architecture Diagram: APML as Single Source of Truth

```
┌─────────────────────────────────────┐
│ ssi-course-production.apml          │
│ (Single Source of Truth)            │
│                                     │
│ - Phase Definitions                 │
│ - API Endpoints                     │
│ - Dashboard Specs                   │
│ - Critical Features                 │
└──────────┬──────────────────────────┘
           │
           ↓ compile-apml-registry.cjs
┌─────────────────────────────────────┐
│ .apml-registry.json                 │
│ (Compiled Registry)                 │
│                                     │
│ - variable_registry.PHASE_PROMPTS  │
│ - version                           │
│ - generated_at                      │
└──────────┬──────────────────────────┘
           │
           ↓ require()
┌─────────────────────────────────────┐
│ automation_server.cjs               │
│ (Backend API Server)                │
│                                     │
│ - Loads PHASE_PROMPTS on startup   │
│ - GET /api/prompts/:phase           │
│ - PUT /api/prompts/:phase           │
│   → Updates APML file               │
│   → Git commit                      │
│   → Recompile registry              │
│   → Reload in memory                │
└──────────┬──────────────────────────┘
           │
           ↓ API calls
┌─────────────────────────────────────┐
│ Dashboard Components                │
│                                     │
│ - TrainingPhase.vue                 │
│   → Fetches live prompts            │
│   → Displays actual working reality │
│   → Edits create version history    │
│                                     │
│ - APMLSpec.vue                      │
│   → Displays APML specification     │
│   → Shows version, timestamp        │
└─────────────────────────────────────┘
```

### Why This Is Critical

**Prevents Documentation Drift:**
- Traditional systems: Code changes, docs don't update
- APML system: Specification IS the documentation

**Enables Self-Improvement:**
- Prompt edits go directly to APML
- Git tracks every change
- Version history preserved
- Easy rollback if needed

**Single Source Advantages:**
1. **No ambiguity** - APML is authoritative
2. **No sync issues** - Dashboard fetches from APML
3. **Automatic versioning** - Git provides history
4. **Audit trail** - Every change tracked
5. **Rollback capability** - Git checkout previous version

---

## CRITICAL FEATURES SUMMARY TABLE

| # | Feature | APML Line | Status | Build Plan Track | Effort | Priority |
|---|---------|-----------|--------|-----------------|--------|----------|
| 1 | **TrainingPhase Displays ACTUAL Prompts** | 1298 | 🚧 70% | Track 1, Task 1.2 | 3h | ⚡ HIGHEST |
| 2 | **Self-Healing Quality System** | 1324-1335 | 🚧 60% | Track 2 (All) | 5-7h | ⚡ HIGHEST |
| 3 | **Edit Workflow (Regeneration)** | 1345-1354 | 🚧 40% | Track 4, Task 4.3 | 3h | ⚡ HIGHEST |
| 4 | **APML as Single Source of Truth** | 1363-1367 | ✅ 90% | Track 1, Task 1.2 | 1h | ⚡ HIGH |

**Overall Critical Features Status:** 65% Complete

---

## IMPLEMENTATION PRIORITY

### Week 1 (Sprint 1) - Critical Blockers
1. ⚡ **Feature 2:** Fix API URLs + Add Routes (2 hours) - **ENABLES QUALITY SYSTEM**
2. ⚡ **Feature 1:** TrainingPhase live prompts (3 hours) - **SHOWS WORKING REALITY**
3. ⚡ **Feature 4:** Complete APML integration (1 hour) - **ENSURES SINGLE SOURCE**

**Total:** ~6 hours → Critical Features 80% functional

### Week 2 (Sprint 2) - Feature Completion
1. ⚡ **Feature 3:** Edit regeneration workflow (3 hours) - **ENABLES ITERATIVE REFINEMENT**
2. ⚡ **Feature 2:** Test quality workflow end-to-end (2 hours) - **VERIFY SELF-HEALING**

**Total:** ~5 hours → Critical Features 100% complete

---

## VERIFICATION CHECKLIST

### Feature 1: TrainingPhase.vue Displays ACTUAL Prompts
- [ ] Prompts load from `/api/prompts/:phase` on mount
- [ ] Live indicator shows "🟢 Live from APML Registry"
- [ ] Version history displays Git commits
- [ ] Edit + Save creates Git commit with changelog
- [ ] Prompt updates immediately reflected in automation_server
- [ ] No hardcoded content shown when API succeeds

### Feature 2: Self-Healing Quality System
- [ ] Quality Dashboard accessible at `/quality/:courseCode`
- [ ] Stats display (avg quality, flagged seeds, attempts)
- [ ] Quality distribution chart renders
- [ ] Individual seed review shows translation + LEGOs + issues
- [ ] Regeneration trigger works (POST to correct endpoint)
- [ ] Accept/reject seeds functional
- [ ] Prompt evolution displays version history and learned rules
- [ ] Bulk actions work (regenerate multiple seeds)
- [ ] Export to CSV/PDF functional

### Feature 3: Edit Workflow (Regeneration Trigger)
- [ ] Edit shows provenance modal with impact analysis
- [ ] Modal displays affected LEGOs and baskets count
- [ ] "Proceed" saves edit AND triggers regeneration
- [ ] Regeneration status displayed in real-time
- [ ] Polling updates every 2 seconds
- [ ] Course data reloads when regeneration completes
- [ ] Updated LEGOs/baskets visible in course view

### Feature 4: APML as Single Source of Truth
- [ ] Automation server loads from APML registry on startup
- [ ] GET /api/prompts/:phase returns APML content
- [ ] PUT /api/prompts/:phase updates APML file
- [ ] Git commit created on prompt update
- [ ] Registry recompiles after APML update
- [ ] APMLSpec.vue displays current APML content
- [ ] No drift between APML and dashboard display

---

## RISK ASSESSMENT

### High Risk
- **Feature 3 (Edit Workflow):** Complex provenance tracking and regeneration orchestration
  - **Mitigation:** Implement in phases, test each step thoroughly

### Medium Risk
- **Feature 2 (Quality System):** API URL mismatches could block functionality
  - **Mitigation:** Fix API service URLs FIRST before testing quality components

### Low Risk
- **Feature 1 (TrainingPhase):** Core functionality exists, just needs refinement
  - **Mitigation:** Minimal changes to working component

- **Feature 4 (APML):** Already 90% complete
  - **Mitigation:** Just ensure TrainingPhase uses live data

---

## SUCCESS METRICS

### Sprint 1 Complete (Week 1)
- ✅ Feature 1: TrainingPhase shows live prompts (80% → 100%)
- ✅ Feature 2: Quality components accessible (60% → 80%)
- ✅ Feature 4: APML fully integrated (90% → 100%)
- **Critical Features: 85% Complete**

### Sprint 2 Complete (Week 2)
- ✅ Feature 2: Quality workflow tested end-to-end (80% → 100%)
- ✅ Feature 3: Edit workflow with regeneration (40% → 100%)
- **Critical Features: 100% Complete**

---

## FINAL VERIFICATION

Before marking critical features as complete, run this comprehensive test suite:

### Test Suite 1: TrainingPhase Prompts
```bash
# 1. Load phase page
curl http://localhost:5173/phase/1
# Expected: Prompt loads from /api/prompts/1

# 2. Check live indicator
# Expected: See "🟢 Live from APML Registry"

# 3. Edit prompt
# Click Save, enter changelog
# Expected: Git commit created, version increments

# 4. View history
# Expected: Git commits displayed with dates and authors
```

### Test Suite 2: Quality System
```bash
# 1. Load quality dashboard
curl http://localhost:5173/quality/cym_for_eng_574seeds
# Expected: Stats cards display, seed list renders

# 2. View flagged seed
curl http://localhost:5173/quality/cym_for_eng_574seeds/seeds/C0042
# Expected: Translation, LEGOs, issues shown

# 3. Trigger regeneration
# Click "Regenerate" button
# Expected: Job starts, status updates

# 4. Accept seed
# Click "Accept" button
# Expected: Status changes, removed from flagged list
```

### Test Suite 3: Edit Workflow
```bash
# 1. Edit translation
# Navigate to /courses/cym_for_eng_574seeds, click Edit on seed
# Expected: Provenance modal shows impact

# 2. Proceed with edit
# Click "Proceed with Edit & Regenerate"
# Expected:
#   - Translation saved
#   - Regeneration job started
#   - Status polling begins

# 3. Monitor regeneration
# Watch status card
# Expected: Shows progress, completes, reloads course

# 4. Verify results
# View edited seed
# Expected: LEGOs regenerated, baskets updated
```

### Test Suite 4: APML Integration
```bash
# 1. Check registry loading
# Restart automation_server, check logs
# Expected: "✅ Loaded 8 phase prompts from APML registry"

# 2. Fetch prompt
curl http://localhost:3456/api/prompts/1
# Expected: Returns Phase 1 prompt from APML

# 3. Update prompt
curl -X PUT http://localhost:3456/api/prompts/1 -d '{"prompt":"...","changelog":"test"}'
# Expected: APML file updated, Git commit created

# 4. Verify no drift
# Edit APML manually, recompile, restart server, check dashboard
# Expected: Dashboard shows updated content
```

---

## CONCLUSION

All 4 APML-specified critical features are **addressed in the build plan** with concrete implementation steps, effort estimates, and verification criteria.

**Current Status:**
- Feature 1 (TrainingPhase): 70% complete → Need 3 hours
- Feature 2 (Quality System): 60% complete → Need 5-7 hours
- Feature 3 (Edit Workflow): 40% complete → Need 3 hours
- Feature 4 (APML Single Source): 90% complete → Need 1 hour

**Total Effort to Complete Critical Features:** 12-14 hours

**Timeline:**
- Sprint 1 (Week 1): Features 1, 2, 4 → 85% complete
- Sprint 2 (Week 2): Feature 3 → 100% complete

**Confidence Level:** HIGH
- All features have working foundations
- Build plan provides detailed implementation steps
- Testing checklists ensure verification
- Risk mitigation strategies in place

**Recommendation:** Execute build plan Tracks 1-4 in parallel, prioritizing critical feature completion in Sprint 1.
