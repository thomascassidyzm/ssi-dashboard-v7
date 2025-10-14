# Orchestrator Brief: Dashboard Comprehensive Testing

**Mission**: Test ALL aspects of the deployed SSi Dashboard and report findings

**Deployed Dashboard**: https://vercel.com/zenjin/ssi-dashboard-v7/BDCSnqaZvG9cY5nFXjHksZjSXnp7

**Context**:
- 4 parallel build agents just completed dashboard implementation
- APML v7.2.0 is the SSoT for what dashboard should do
- Need to validate what's working vs broken

---

## Testing Approach

### Phase 1: Static Testing (No Backend Required)
Test UI components, routing, visual presentation

### Phase 2: API Integration Testing (Requires Automation Server)
Test backend connectivity, data loading, API endpoints

### Phase 3: End-to-End Workflow Testing
Test complete user journeys (generation, quality review, editing)

---

## Phase 1: Static UI Testing

### Test 1.1: Navigation & Routing
**What to test**:
- Can you access the dashboard home page?
- Are all routes accessible (navigation menu)?
- Expected routes (from APML):
  - `/` - Dashboard home
  - `/courses` - Course list
  - `/courses/:code` - Course detail
  - `/quality/:code` - Quality dashboard
  - `/seeds/:seedId/review` - Seed review
  - `/visualization/legos` - LEGO visualizer
  - `/visualization/seeds` - Seed visualizer
  - `/visualization/phrases` - Phrase visualizer
  - `/training/:phase` - Training/prompt viewer
  - `/apml` - APML specification viewer

**Report**:
- Which routes exist? ✅
- Which routes are missing? ❌
- Which routes return 404? ⚠️
- Navigation UX (smooth, broken links, etc.)

### Test 1.2: Component Rendering
**What to test**:
- Do pages render without errors?
- Are there console errors (check browser DevTools)?
- Broken images, missing CSS, layout issues?
- Responsive design (mobile, tablet, desktop)?

**Report**:
- Visual quality score (1-10)
- Critical rendering issues
- Console errors found

### Test 1.3: APML Specification Display
**What to test**:
- Is there an APML viewer page?
- Does it display the complete APML content?
- Is it formatted/readable?
- Can you see:
  - Human-AI Collaboration Model section?
  - Phase specifications?
  - Variable Registry?
  - Version history?

**Report**:
- APML displayed correctly? ✅/❌
- Formatting quality
- Any missing sections

---

## Phase 2: API Integration Testing

### Test 2.1: Automation Server Connectivity
**Prerequisites**:
- Automation server must be running (port 3456 or 54321)
- Check: `http://localhost:3456/api/health` or `http://localhost:54321/api/health`

**What to test**:
- Can dashboard connect to automation server?
- Is API_BASE_URL configured correctly?
- CORS working (no cross-origin errors)?

**Report**:
- Server reachable? ✅/❌
- API_BASE_URL value
- Connection errors found

### Test 2.2: Course Data Loading
**What to test**:
- Navigate to course list page
- Does it load existing courses?
- Expected course: `ita_for_eng_574seeds`
- Can you click into course detail?

**Data location**: `/Users/tomcassidy/SSi/SSi_Course_Production/vfs/courses/ita_for_eng_574seeds/`

**Report**:
- Courses displayed? ✅/❌
- Data loaded from VFS correctly?
- Any loading errors?

### Test 2.3: Quality Dashboard
**What to test**:
- Navigate to quality dashboard for Italian course
- Expected data from: `QUALITY_REPORT.md`
- Does it show:
  - Overall quality score (75.9/100)?
  - Phase breakdown?
  - Flagged seeds (12/30)?
  - Top 5 issues?

**Report**:
- Quality data displayed? ✅/❌
- Metrics accurate?
- Visualization working (charts, graphs)?

### Test 2.4: Seed Review Interface
**What to test**:
- Pick a seed (e.g., S0005)
- Navigate to seed review page
- Does it show:
  - Translation (Phase 1)?
  - LEGO breakdown (Phase 3)?
  - Basket/phrases (Phase 5)?
  - Quality score?
  - Attempt history?

**Report**:
- Seed data displayed? ✅/❌
- All phases visible?
- Navigation between seeds working?

### Test 2.5: Visualization Components
**What to test**:
- **LEGO Visualizer**: Does it show all LEGOs from Phase 3?
- **Seed Visualizer**: Does it show seed pairs with provenance?
- **Phrase Visualizer**: Does it show baskets with e/d-phrases?

**Report**:
- Which visualizers work? ✅
- Which visualizers broken? ❌
- Visual quality and usability

### Test 2.6: Prompt Management
**What to test**:
- Navigate to training/prompt viewer
- Can you view Phase 1 prompt?
- Can you view Phase 5 prompt?
- Does it show:
  - Current prompt content?
  - Version information?
  - Edit capability (textarea)?

**Expected**: Prompts fetched from `/api/prompts/:phase`

**Report**:
- Prompts displayed? ✅/❌
- Editable? ✅/❌
- Version info shown?

---

## Phase 3: End-to-End Workflow Testing

### Test 3.1: Course Generation Workflow
**What to test**:
1. Navigate to course generation page
2. Select target language (e.g., Spanish)
3. Select known language (e.g., English)
4. Set seed count (e.g., 30)
5. Click "Generate Course"
6. Does it:
   - Show progress indicator?
   - Poll for status updates?
   - Display phase progression (0 → 1 → 2 → 3 → 3.5 → 4 → 5 → 6)?

**Report**:
- Generation UI working? ✅/❌
- Progress tracking working?
- Can it actually trigger generation?

### Test 3.2: Edit → Regeneration Workflow
**What to test**:
1. Navigate to seed review (e.g., S0005)
2. Edit translation (change Italian text)
3. Click "Save"
4. Does it:
   - Trigger Phase 3+ regeneration automatically?
   - Show regeneration job status?
   - Update affected phases?
   - Display new results when done?

**Report**:
- Edit capability working? ✅/❌
- Auto-regeneration triggered?
- Status tracking working?
- Results updated?

### Test 3.3: Prompt Evolution Workflow
**What to test**:
1. View Phase 5 prompt
2. Click "Edit"
3. Make a change (e.g., add "TEST UPDATE")
4. Save changes
5. Does it:
   - Update APML file?
   - Create git commit?
   - Recompile registry?
   - Show updated version?

**Report**:
- Prompt editing working? ✅/❌
- APML update working?
- Version tracking working?

### Test 3.4: Quality Review → Regeneration
**What to test**:
1. Navigate to quality dashboard
2. View flagged seeds (e.g., seeds with grammar errors)
3. Select seeds for regeneration
4. Trigger regeneration
5. Does it:
   - Start regeneration job?
   - Track progress?
   - Update quality scores when done?

**Report**:
- Flagging working? ✅/❌
- Batch regeneration working?
- Quality tracking updated?

---

## Phase 4: Critical Feature Verification

### Critical Feature 1: "Dashboard IS the Living System"
**Test**: Does the dashboard show ACTUAL working prompts (not generic docs)?

**Verify**:
- Prompts displayed match APML content
- Not placeholder/mock data
- Shows real system state

**Report**: ✅/❌ + notes

### Critical Feature 2: "Edit in UI → Updates Source"
**Test**: Can you edit a prompt in dashboard and have it update APML?

**Verify**:
- Prompt editor functional
- Changes persist
- Git commit created

**Report**: ✅/❌ + notes

### Critical Feature 3: "Self-Healing Quality System"
**Test**: Can you flag problematic seeds and trigger regeneration?

**Verify**:
- Quality metrics displayed
- Regeneration triggerable
- Results trackable

**Report**: ✅/❌ + notes

### Critical Feature 4: "Provenance Tracking Visible"
**Test**: Can you trace a LEGO back to its source seed(s)?

**Verify**:
- Provenance labels visible (S####L##)
- Click-through to source working
- Deduplication history shown

**Report**: ✅/❌ + notes

---

## Testing Tools & Methods

### Browser DevTools
- Open Console (check for errors)
- Open Network tab (check API calls)
- Open Elements tab (inspect components)

### API Testing
If automation server running:
```bash
# Test endpoints directly
curl http://localhost:3456/api/health
curl http://localhost:3456/api/courses
curl http://localhost:3456/api/prompts/5
```

### File System Checks
Verify dashboard can access:
- APML: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/ssi-course-production.apml`
- VFS: `/Users/tomcassidy/SSi/SSi_Course_Production/vfs/courses/ita_for_eng_574seeds/`
- Quality Report: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/QUALITY_REPORT.md`

---

## Output Format

Create a comprehensive report: `DASHBOARD_TEST_REPORT.md`

### Structure:

```markdown
# SSi Dashboard Test Report

**Tested**: [Dashboard URL]
**Date**: 2025-10-13
**Tester**: Claude Code (Sonnet 4.5)

---

## Executive Summary

**Overall Status**: [Working/Partially Working/Broken]
**Completion**: X% functional

### Quick Scores
- Navigation & Routing: X/10
- Component Rendering: X/10
- API Integration: X/10
- Data Visualization: X/10
- Workflows: X/10

**Blocking Issues**: X critical issues found
**Ready for Use**: ✅/❌

---

## Phase 1: Static UI Testing (No Backend)

### Test 1.1: Navigation & Routing
- Status: ✅/❌/⚠️
- Routes found: [list]
- Routes missing: [list]
- Issues: [describe]

[Continue for all tests...]

---

## Phase 2: API Integration Testing

[Results for each test...]

---

## Phase 3: End-to-End Workflows

[Results for each workflow...]

---

## Phase 4: Critical Feature Verification

[Results for each critical feature...]

---

## Findings Summary

### What's Working ✅
1. [Feature/component]
2. [Feature/component]
...

### What's Broken ❌
1. [Issue] - Priority: [HIGH/MEDIUM/LOW]
2. [Issue] - Priority: [HIGH/MEDIUM/LOW]
...

### What's Partially Working ⚠️
1. [Feature] - Issue: [description]
...

---

## Recommendations

### Immediate Fixes (Blocking)
1. [Action needed]
2. [Action needed]

### High Priority
1. [Action needed]

### Medium Priority
1. [Action needed]

---

## Next Steps

Based on findings:
1. [Specific action]
2. [Specific action]
3. [Specific action]
```

---

## Important Notes

1. **Be thorough**: Test EVERY aspect listed above
2. **Be specific**: Name exact routes, components, API endpoints
3. **Be honest**: Report what's broken, don't sugarcoat
4. **Be practical**: Focus on blockers first, polish later
5. **Be visual**: Take screenshots if needed (save to dashboard root)

---

## Success Criteria

✅ All test phases completed
✅ Every route tested
✅ Every API endpoint tested
✅ Every workflow tested
✅ All 4 critical features verified
✅ Comprehensive report generated
✅ Clear next steps provided

---

## Automation Server Setup (If Needed)

If automation server not running, test what you CAN test:
- Static UI (Phase 1)
- Component rendering
- Routing
- APML display

Report: "⚠️ Automation server not running - API tests skipped"

Then recommend starting the server:
```bash
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean
node automation_server.cjs
```

---

**Ready to test!**

Save report to: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/DASHBOARD_TEST_REPORT.md`
