# DASHBOARD GAP ANALYSIS
**Comparing APML Requirements vs Current Implementation**

---

## EXECUTIVE SUMMARY

**Analysis Date:** 2025-10-13
**APML Version:** 7.0
**Dashboard Location:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/`

### Overall Status
- ✅ **Complete:** 35%
- 🚧 **Partial:** 40%
- ❌ **Missing:** 25%

### Key Findings
1. **Course Generation pipeline is functional** - UI exists and polls status correctly
2. **TrainingPhase.vue exists but needs prompt fetching integration** - Currently shows hardcoded content
3. **Quality Review components exist but NOT integrated with routes** - Components built but not accessible
4. **Visualization components exist** - LegoVisualizer, SeedVisualizer, PhraseVisualizer are built
5. **API service is incomplete** - Many endpoints defined but quality endpoints use wrong URLs

---

## SECTION 1: COURSE GENERATION PIPELINE

### 1.1 CourseGeneration.vue
**Status:** ✅ **COMPLETE**

**Location:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/views/CourseGeneration.vue`

**What Works:**
- ✅ Language pair selection (target + known)
- ✅ Seed count input with default 574
- ✅ POST to `/api/courses/generate`
- ✅ Status polling via `GET /api/courses/:code/status`
- ✅ Real-time progress bar display
- ✅ Phase-by-phase status visualization
- ✅ Error handling

**Gaps:** None - fully functional

---

### 1.2 ProcessOverview.vue
**Status:** 🚧 **PARTIAL**

**Location:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/views/ProcessOverview.vue`

**What Works:**
- ✅ Basic documentation page exists
- ✅ Shows overview of 8-phase pipeline
- ✅ Static content displayed correctly

**Gaps:**
- ❌ Not connected to actual course generation data
- ❌ Doesn't show real-time phase progress
- ❌ Could link to TrainingPhase.vue for each phase
- ❌ Missing "view current course" functionality

**Recommendation:** Keep as documentation page, but add links to view active generation jobs

---

### 1.3 TrainingPhase.vue - CRITICAL FEATURE
**Status:** 🚧 **PARTIAL - NEEDS WORK**

**Location:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/views/TrainingPhase.vue`

**APML Requirement (Line 1298):**
> "CRITICAL_FEATURE: TrainingPhase.vue displays ACTUAL prompts from registry"

**What Works:**
- ✅ Component exists and displays phase information
- ✅ Shows hardcoded phase documentation
- ✅ Has editable textarea for prompt
- ✅ Has save/copy/download buttons
- ✅ Uses `usePromptManager` composable

**Critical Gaps:**
- 🚧 **Prompt fetching integration exists but needs testing**
  - Has `fetchPrompt()` that calls `/api/prompts/:phase`
  - Has `savePrompt()` that calls `PUT /api/prompts/:phase`
  - **BUT:** Still shows hardcoded fallback content from `phaseContent` object
- 🚧 **Version history not displayed**
  - Has `promptMeta` from composable
  - Doesn't show Git history of changes
- ❌ **Not showing "working reality"**
  - Should fetch from APML registry on mount
  - Should replace hardcoded content with live data

**What Needs to Happen:**
1. Test `/api/prompts/:phase` endpoint (appears implemented in automation_server.cjs lines 1418-1438)
2. Remove or de-prioritize hardcoded `phaseContent` object
3. Add version history display (Git log available via `/api/prompts/:phase/history`)
4. Add visual indicator showing "Live from APML Registry"

---

## SECTION 2: QUALITY REVIEW & SELF-HEALING

### 2.1 QualityDashboard.vue
**Status:** 🚧 **BUILT BUT NOT INTEGRATED**

**Location:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/components/quality/QualityDashboard.vue`

**What Exists:**
- ✅ **Complete component built** (28,980 bytes)
- ✅ Quality stats cards (avg quality, flagged seeds, accepted, attempts)
- ✅ Quality distribution chart
- ✅ Filters and controls
- ✅ Seed list with quality scores
- ✅ Bulk actions (accept, regenerate)
- ✅ Export functionality (CSV, PDF)

**Critical Gap:**
- ❌ **NOT IN ROUTER** - Cannot access from dashboard
- ❌ **No route defined** in `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/router/index.js`
- ❌ **No navigation link** from Dashboard.vue

**API Integration Issues:**
- 🚧 Uses `/api/quality/:courseCode/overview` (lines 61-64 in api.js)
- ⚠️ **Automation server implements:** `/api/courses/:code/quality` (line 766)
- ⚠️ **URL MISMATCH** - API service expects wrong endpoint format

---

### 2.2 SeedQualityReview.vue
**Status:** 🚧 **BUILT BUT NOT INTEGRATED**

**Location:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/components/quality/SeedQualityReview.vue`

**What Exists:**
- ✅ **Complete component built** (24,443 bytes)
- ✅ Individual seed review interface
- ✅ Attempt history display
- ✅ Accept/reject/regenerate actions
- ✅ Quality issue visualization

**Critical Gap:**
- ❌ **NOT IN ROUTER** - No route defined
- ❌ **No way to navigate to individual seed reviews**

**API Integration Issues:**
- 🚧 Uses `/api/quality/:courseCode/seeds/:seedId` (line 73)
- ⚠️ **Automation server implements:** `/api/courses/:code/seeds/:seedId/review` (line 784)
- ⚠️ **URL MISMATCH** - Different endpoint structure

---

### 2.3 PromptEvolutionView.vue
**Status:** 🚧 **BUILT BUT NOT INTEGRATED**

**Location:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/components/quality/PromptEvolutionView.vue`

**What Exists:**
- ✅ **Complete component built** (26,266 bytes)
- ✅ Prompt version history display
- ✅ Learned rules visualization
- ✅ Experimental rules A/B testing
- ✅ Success rate tracking
- ✅ Rule promotion/rejection UI

**Critical Gap:**
- ❌ **NOT IN ROUTER** - No route defined
- ❌ **Cannot access from dashboard**

**API Integration Issues:**
- 🚧 Uses `/api/quality/:courseCode/prompt-evolution` (line 129)
- ⚠️ **Automation server implements:** `/api/courses/:code/prompt-evolution` (line 987)
- ⚠️ **URL MISMATCH**

---

### 2.4 CourseHealthReport.vue
**Status:** ✅ **BUILT (Bonus Component)**

**Location:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/components/quality/CourseHealthReport.vue`

**What Exists:**
- ✅ Course health metrics
- ✅ Quality trend visualization
- ✅ Issue breakdown

**Status:** Built but also not integrated into routes

---

## SECTION 3: VISUALIZATION & EDITING

### 3.1 LegoVisualizer.vue
**Status:** ✅ **COMPLETE**

**Location:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/components/LegoVisualizer.vue`

**What Works:**
- ✅ Visual LEGO breakdown display (20,701 bytes)
- ✅ Shows provenance (S{seed}L{position})
- ✅ Visualizes LEGO boundaries
- ✅ IRON RULE compliance highlighting
- ✅ Has example view at `/src/components/LegoVisualizerExample.vue`

**Usage:** Can be imported and used in other views

---

### 3.2 SeedVisualizer.vue
**Status:** ✅ **COMPLETE**

**Location:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/components/SeedVisualizer.vue`

**What Works:**
- ✅ Seed pair visualization (10,116 bytes)
- ✅ Shows source + target
- ✅ Displays extracted LEGOs
- ✅ Demo view available at `/src/views/SeedVisualizerDemo.vue`

**Usage:** Can be imported and used in other views

---

### 3.3 PhraseVisualizer.vue
**Status:** ✅ **COMPLETE**

**Location:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/components/PhraseVisualizer.vue`

**What Works:**
- ✅ Phrase pattern visualization (16,090 bytes)
- ✅ Shows graph edges
- ✅ Displays adjacency relationships

**Usage:** Can be imported and used in other views

---

### 3.4 CourseEditor.vue - CRITICAL FEATURE
**Status:** 🚧 **PARTIAL**

**Location:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/views/CourseEditor.vue`

**APML Requirement (Lines 1345-1354):**
> "EDIT_WORKFLOW: User edits translation in UI → Triggers regeneration of affected phases"

**What Works:**
- ✅ Component exists (19,616 bytes)
- ✅ Route exists: `/courses/:courseCode`
- ✅ Loads course data via `GET /api/courses/:courseCode`
- ✅ Displays translations
- ✅ Can edit translation text

**Critical Gaps:**
- 🚧 **Edit workflow NOT triggering regeneration**
  - Has `PUT /api/courses/:courseCode/translations/:uuid` call
  - Doesn't poll for regeneration status
  - Doesn't show "affected phases" alert
- ❌ **Provenance visualization missing**
  - Should show which LEGOs/baskets will be affected
  - Should call `/api/courses/:courseCode/provenance/:seedId`
- ❌ **No confirmation dialog** showing impact of edit

**What Needs to Happen:**
1. Add provenance display before edit
2. Show "This will regenerate Phase 3+" warning
3. Trigger regeneration job
4. Poll for regeneration completion
5. Show updated results

---

## SECTION 4: APML SPECIFICATION & DOCS

### 4.1 APMLSpec.vue
**Status:** ✅ **COMPLETE**

**Location:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/views/APMLSpec.vue`

**What Works:**
- ✅ Displays APML specification
- ✅ Route exists: `/reference/apml`
- ✅ Shows phase definitions
- ✅ Accessible from dashboard

**Gaps:** None - fully functional

---

### 4.2 Dashboard.vue (Main Navigation)
**Status:** 🚧 **PARTIAL**

**Location:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/views/Dashboard.vue`

**What Works:**
- ✅ Main dashboard page exists (10,985 bytes)
- ✅ Navigation to course generation
- ✅ Navigation to course browser
- ✅ Navigation to APML spec
- ✅ Links to phase training pages

**Critical Gaps:**
- ❌ **No links to Quality Review**
  - QualityDashboard not accessible
  - SeedQualityReview not accessible
  - PromptEvolutionView not accessible
- ❌ **No "Quality" section** in navigation
- ❌ **Missing course health indicators**

---

## SECTION 5: API SERVICE ANALYSIS

### 5.1 Core Endpoints
**Location:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/services/api.js`

**Status:** 🚧 **PARTIAL - URL MISMATCHES**

#### Working Endpoints (✅)
```javascript
POST /api/courses/generate ✅
GET  /api/courses/:courseCode/status ✅
GET  /api/courses ✅
GET  /api/courses/:courseCode ✅
GET  /api/courses/:courseCode/provenance/:seedId ✅
PUT  /api/courses/:courseCode/translations/:uuid ✅
```

#### Quality Endpoints (⚠️ URL MISMATCH)
**Problem:** api.js defines `/api/quality/:courseCode/*` format
**Automation Server Implements:** `/api/courses/:code/*` format

| API Service Expects | Automation Server Has | Status |
|---------------------|----------------------|--------|
| `/api/quality/:courseCode/overview` | `/api/courses/:code/quality` | ❌ MISMATCH |
| `/api/quality/:courseCode/seeds` | (not implemented) | ❌ MISSING |
| `/api/quality/:courseCode/seeds/:seedId` | `/api/courses/:code/seeds/:seedId/review` | ❌ MISMATCH |
| `/api/quality/:courseCode/seeds/:seedId/rerun` | `/api/courses/:code/seeds/regenerate` | ❌ MISMATCH |
| `/api/quality/:courseCode/prompt-evolution` | `/api/courses/:code/prompt-evolution` | ❌ MISMATCH |

**Impact:** Quality components will fail when making API calls

---

### 5.2 Prompt Management Endpoints
**Status:** ❌ **MISSING FROM API SERVICE**

**Required (from APML):**
```javascript
GET /api/registry/phase-prompts/:phase
PUT /api/registry/phase-prompts/:phase
```

**Automation Server Implements:**
```javascript
GET /api/prompts/:phase         (line 1421)
PUT /api/prompts/:phase         (line 1444)
GET /api/prompts/:phase/history (line 1508)
```

**Current API Service Has:**
- ❌ Nothing for prompt management in main api.js
- ✅ `usePromptManager` composable uses correct endpoints

**Impact:** TrainingPhase.vue works via composable, but inconsistent with main API service

---

## SECTION 6: ROUTING ANALYSIS

**Location:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/router/index.js`

### Current Routes (✅)
```javascript
/ → Dashboard
/generate → CourseGeneration
/courses → CourseBrowser
/courses/:courseCode → CourseEditor
/phase/:id → TrainingPhase
/reference/overview → ProcessOverview
/reference/seeds → CanonicalSeeds
/reference/apml → APMLSpec
```

### Missing Routes (❌)
```javascript
/quality/:courseCode → QualityDashboard (MISSING)
/quality/:courseCode/seeds/:seedId → SeedQualityReview (MISSING)
/quality/:courseCode/evolution → PromptEvolutionView (MISSING)
/quality/:courseCode/health → CourseHealthReport (MISSING)
/visualize/lego → LegoVisualizerExample (MISSING)
/visualize/seed → SeedVisualizerDemo (MISSING)
/visualize/basket → BasketVisualizerView (MISSING)
```

---

## SECTION 7: CRITICAL FEATURES STATUS

### Feature 1: TrainingPhase.vue Displays ACTUAL Prompts
**APML Line:** 1298
**Status:** 🚧 **70% COMPLETE**

**Working:**
- ✅ Component exists
- ✅ usePromptManager composable fetches from `/api/prompts/:phase`
- ✅ Save functionality calls `PUT /api/prompts/:phase`
- ✅ Automation server has endpoints

**Gaps:**
- 🚧 Still shows hardcoded fallback content
- ❌ Version history not displayed
- ❌ No visual indicator of "live from registry"
- ❌ Git history endpoint not integrated

---

### Feature 2: Self-Healing Quality System
**APML Lines:** 1324-1335
**Status:** 🚧 **60% COMPLETE**

**Working:**
- ✅ All quality components built
- ✅ Automation server has quality endpoints

**Gaps:**
- ❌ Quality components not in router
- ❌ API URL mismatches
- ❌ No navigation from main dashboard
- ❌ Cannot access quality review interface

---

### Feature 3: Edit Workflow (Regeneration Trigger)
**APML Lines:** 1345-1354
**Status:** 🚧 **40% COMPLETE**

**Working:**
- ✅ CourseEditor.vue exists
- ✅ Can edit translations
- ✅ PUT endpoint exists

**Gaps:**
- ❌ Doesn't show provenance before edit
- ❌ Doesn't trigger regeneration job
- ❌ Doesn't poll for completion
- ❌ No visual feedback of affected phases

---

### Feature 4: APML as Single Source of Truth
**APML Lines:** 1363-1367
**Status:** ✅ **90% COMPLETE**

**Working:**
- ✅ APMLSpec.vue displays specification
- ✅ automation_server loads from APML registry
- ✅ Prompt endpoints fetch from APML

**Gaps:**
- 🚧 TrainingPhase still shows hardcoded content as fallback
- ❌ No automatic doc regeneration on APML change

---

## GAP SUMMARY TABLE

| Component/Feature | Status | Completeness | Priority | Blocker |
|-------------------|--------|--------------|----------|---------|
| **CourseGeneration.vue** | ✅ Complete | 100% | High | None |
| **ProcessOverview.vue** | 🚧 Partial | 70% | Low | Static content only |
| **TrainingPhase.vue** | 🚧 Partial | 70% | **CRITICAL** | Needs live prompt integration |
| **QualityDashboard.vue** | 🚧 Built | 60% | **CRITICAL** | Not in router, API mismatch |
| **SeedQualityReview.vue** | 🚧 Built | 60% | High | Not in router, API mismatch |
| **PromptEvolutionView.vue** | 🚧 Built | 60% | High | Not in router, API mismatch |
| **CourseHealthReport.vue** | 🚧 Built | 60% | Medium | Not in router |
| **LegoVisualizer.vue** | ✅ Complete | 100% | Medium | None |
| **SeedVisualizer.vue** | ✅ Complete | 100% | Medium | None |
| **PhraseVisualizer.vue** | ✅ Complete | 100% | Medium | None |
| **CourseEditor.vue** | 🚧 Partial | 40% | **CRITICAL** | No regeneration trigger |
| **APMLSpec.vue** | ✅ Complete | 100% | High | None |
| **Dashboard.vue** | 🚧 Partial | 80% | High | Missing quality links |
| **Router** | 🚧 Partial | 60% | **CRITICAL** | Missing quality routes |
| **API Service** | 🚧 Partial | 70% | **CRITICAL** | URL mismatches |

---

## TOP PRIORITY GAPS (CRITICAL PATH)

### 1. Fix API URL Mismatches (BLOCKER)
**Impact:** Quality components will fail
**Effort:** 1 hour
**Action:** Update api.js to match automation_server endpoints

### 2. Add Quality Routes to Router (BLOCKER)
**Impact:** Cannot access quality features
**Effort:** 30 minutes
**Action:** Add 4 quality routes

### 3. Integrate TrainingPhase with Live Prompts
**Impact:** Critical feature not working as specified
**Effort:** 2 hours
**Action:** Remove hardcoded fallback, display version history

### 4. Add Dashboard Navigation to Quality
**Impact:** No way to discover quality features
**Effort:** 30 minutes
**Action:** Add "Quality Review" section to Dashboard.vue

### 5. Implement Edit Regeneration Workflow
**Impact:** Critical feature not working
**Effort:** 3 hours
**Action:** Add provenance display, regeneration trigger, polling

---

## RECOMMENDATIONS

### Immediate (Week 1)
1. **Fix API URL mismatches** - Quality components will work
2. **Add quality routes** - Make components accessible
3. **Update Dashboard navigation** - Surface quality features
4. **Test TrainingPhase live prompt fetching** - Verify critical feature

### Short-term (Week 2)
1. **Implement edit regeneration workflow** - Complete CourseEditor
2. **Add version history to TrainingPhase** - Show Git log
3. **Add provenance visualization** - Show edit impact
4. **Test end-to-end quality workflow** - Flag → Regenerate → Accept

### Medium-term (Week 3-4)
1. **Add real-time updates to ProcessOverview** - Show active jobs
2. **Implement PROJECT-DASHBOARD.html generator** - Auto-generate from APML
3. **Add integration tests** - Verify critical paths
4. **Performance optimization** - Lazy loading, code splitting

---

## CONCLUSION

**Overall Assessment:** Dashboard is 60% complete with strong foundations but critical integration gaps.

**Strengths:**
- Core course generation pipeline works
- All visualization components built
- Quality review components fully built
- Solid architecture and code quality

**Critical Issues:**
1. Quality components exist but not accessible (routing issue)
2. API service URL mismatches will cause failures
3. TrainingPhase not displaying live prompts from registry
4. Edit workflow doesn't trigger regeneration

**Recommendation:** Focus on the 5 critical gaps above to achieve 90% completeness within 1-2 weeks.
