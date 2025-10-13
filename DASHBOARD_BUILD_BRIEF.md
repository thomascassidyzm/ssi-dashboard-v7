# Orchestrator Brief: SSi Dashboard Build-Out

**Mission**: Build out the SSi Dashboard from current state to complete APML-specified functionality

**Orchestrator Role**:
- First: Extract dashboard requirements from APML (what SHOULD it do?)
- Second: Assess current dashboard state (what DOES it do?)
- Third: Identify gaps and coordinate parallel build agents
- DO NOT block main conversation thread
- Report back with implementation plan

---

## Phase 1: Requirements Discovery (DO THIS FIRST)

### Task: Extract Dashboard Requirements from APML

**Source**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/ssi-course-production.apml`

**Read APML Lines 1288-1368**: "DASHBOARD INTERFACE SPECIFICATIONS"

**Extract**:
1. What components are specified?
2. What functionality is required for each component?
3. What API endpoints does the dashboard need to consume?
4. What data flows are specified?
5. What critical features are called out?

**Output**: Create a requirements document answering:
- "What does the SSi Dashboard need to do?" (based on APML SSoT)

---

## Phase 2: Current State Assessment

### Task: Assess Existing Dashboard Implementation

**Source**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/`

**Inventory**:
- What Vue components currently exist?
- What routes are configured?
- What API integrations are implemented?
- What's working vs stubbed/incomplete?

**Compare**:
- APML requirements (from Phase 1) vs current implementation
- Identify: ✅ Complete, 🚧 Partial, ❌ Missing

**Output**: Gap analysis
- What's already built?
- What's missing?
- What needs fixing?

---

## Phase 3: Implementation Planning

### Task: Create Parallel Build Plan

Based on gaps from Phase 2, organize work into parallel tracks:

**Track 1: Course Generation UI**
- CourseGeneration.vue implementation
- ProcessOverview.vue (phase progress)
- TrainingPhase.vue (prompt display/editing)
- API integration with automation_server.cjs

**Track 2: Quality Review UI**
- QualityDashboard.vue (metrics overview)
- SeedQualityReview.vue (individual seed review)
- PromptEvolutionView.vue (version history)
- Regeneration controls

**Track 3: Visualization UI**
- LegoVisualizer.vue (LEGO breakdown display)
- SeedVisualizer.vue (seed pair visualization)
- PhraseVisualizer.vue (phrase pattern visualization)
- CourseEditor.vue (editing interface)

**Track 4: System UI**
- APMLSpec.vue (specification display)
- Dashboard.vue (main navigation)
- API service layer (services/)
- Routing (router/)

**For each track**:
- List specific components to build/fix
- Identify dependencies between components
- Estimate complexity (simple/medium/complex)
- Determine if it can be built in parallel

---

## Phase 4: Critical Features Verification

### Task: Ensure APML-Specified Critical Features

From APML lines 1298-1303, verify these critical features are in the plan:

1. **TrainingPhase.vue displays ACTUAL prompts from registry**
   - Fetches from: GET /api/prompts/:phase
   - Shows working reality (not generic docs)
   - Editable textarea allows prompt updates
   - Updates POST to: PUT /api/prompts/:phase
   - Creates version history for every change

2. **Self-Healing Quality System**
   - Visual review of all phase outputs
   - Flag problematic seeds for regeneration
   - Track prompt evolution over time
   - Automatic rerun of failed extractions

3. **Edit Workflow**
   - User edits translation in UI
   - Triggers regeneration of affected phases
   - Phase 3+ re-run with updated translation
   - Dashboard shows updated results

4. **APML as Single Source of Truth**
   - This APML file is the single source of truth
   - Dashboard components fetch from this specification
   - Changes to APML regenerate documentation
   - No drift between docs and reality

---

## Deliverables (Save to Dashboard Root)

### 1. DASHBOARD_REQUIREMENTS.md
From Phase 1: What the dashboard needs to do (extracted from APML)

### 2. DASHBOARD_GAP_ANALYSIS.md
From Phase 2: Current state vs requirements, what's missing

### 3. DASHBOARD_BUILD_PLAN.md
From Phase 3: Organized implementation plan with parallel tracks

### 4. DASHBOARD_CRITICAL_FEATURES.md
From Phase 4: Verification that critical features are covered

---

## Orchestrator Instructions

### Step 1: Requirements Discovery (Sequential)
1. Read APML specification (lines 1288-1368)
2. Extract all dashboard requirements
3. Create DASHBOARD_REQUIREMENTS.md

### Step 2: Current State Assessment (Sequential, depends on Step 1)
1. Read current Vue components in src/
2. Compare against requirements
3. Create DASHBOARD_GAP_ANALYSIS.md

### Step 3: Implementation Planning (Sequential, depends on Step 2)
1. Organize gaps into 4 parallel tracks
2. Identify dependencies
3. Create DASHBOARD_BUILD_PLAN.md

### Step 4: Critical Features Check (Sequential, depends on Step 3)
1. Verify all APML critical features in plan
2. Create DASHBOARD_CRITICAL_FEATURES.md

### Step 5: Report Back
Once all 4 deliverables created, report to main thread:
```
✅ Dashboard build planning complete.

Deliverables:
- DASHBOARD_REQUIREMENTS.md (what it needs to do)
- DASHBOARD_GAP_ANALYSIS.md (what's missing)
- DASHBOARD_BUILD_PLAN.md (how to build it)
- DASHBOARD_CRITICAL_FEATURES.md (critical feature verification)

Ready for parallel implementation when you are.
```

---

## Key Files to Read

**APML Spec**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/ssi-course-production.apml`
- Lines 1288-1368: Dashboard Interface Specifications
- Lines 755-1086: API Endpoints (what dashboard needs to call)
- Lines 1372-1415: Compilation & Deployment

**Current Dashboard**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/`
- components/ - Vue components
- views/ - Page views
- router/ - Routing config
- services/ - API integration

**Automation Server**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/automation_server.cjs`
- Lines 755-1086: Available API endpoints
- What's already implemented vs what dashboard can use

**Example Data**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/italian_30seeds_app_format.json`
- What the final app format looks like
- What data structures the dashboard needs to display

---

## Success Criteria

✅ Requirements extracted from APML (authoritative source)
✅ Current state accurately assessed
✅ Gap analysis identifies all missing pieces
✅ Build plan organizes work into parallel tracks
✅ Critical features verified
✅ All deliverables saved to dashboard root
✅ Main conversation stays clean

---

## Notes for Orchestrator

- **APML is the SSoT**: All requirements come from APML, not assumptions
- **Be specific**: List exact component names, API endpoints, features
- **Be practical**: Note complexity, dependencies, blockers
- **Be organized**: Group related work into parallel tracks
- **Keep main thread clean**: Work autonomously, report when done

---

## Important: Answer the Question First!

The user asked: "What DO we need the dashboard to do?"

Your FIRST deliverable (DASHBOARD_REQUIREMENTS.md) must answer this clearly and completely, extracted from APML lines 1288-1368.

Start there.
