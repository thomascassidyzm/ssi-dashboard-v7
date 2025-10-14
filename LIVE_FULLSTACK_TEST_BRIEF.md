# Orchestrator Brief: Live Full-Stack Integration Testing

**Mission**: Test the LIVE full-stack SSi Dashboard (Vercel + ngrok + automation server)

**Context**:
- Frontend deployed: https://ssi-dashboard-v7-clean.vercel.app
- Backend tunneled: https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev
- Full stack connected and operational (allegedly)

**Goal**: Verify everything ACTUALLY works end-to-end in production

---

## Testing Phases

### Phase 1: Backend Connectivity (5 min)
Test that Vercel frontend can reach automation server through ngrok

### Phase 2: Data Loading (5 min)
Test that real VFS data loads (not demo/hardcoded data)

### Phase 3: Critical Workflows (10 min)
Test the 4 APML critical features end-to-end

### Phase 4: Performance & UX (5 min)
Test that it's actually usable in production

---

## Phase 1: Backend Connectivity Testing

### Test 1.1: Direct Backend Access
**From your local machine**:

```bash
# Test automation server directly
curl https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/courses

# Should return JSON array of courses
# Example: [{"code":"ita_for_eng_574seeds",...}]
```

**Expected**: JSON response with course data
**If fails**: Backend or ngrok not working

### Test 1.2: Vercel → Backend Connection
**Open browser DevTools** (F12):

1. Navigate to https://ssi-dashboard-v7-clean.vercel.app
2. Open Console tab
3. Open Network tab
4. Refresh page

**Check Console**:
- Look for API calls to ngrok URL
- Should see requests like: `GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/courses`
- Should NOT see CORS errors
- Should NOT see "Failed to fetch" errors

**Check Network tab**:
- Find requests to ngrok domain
- Status should be 200 (not 404, 500, or CORS errors)
- Response should have JSON data

**Expected**: Clean console, successful API calls
**If fails**: CORS issue or VITE_API_BASE_URL not set correctly

---

## Phase 2: Data Loading Testing

### Test 2.1: Course List
1. Navigate to https://ssi-dashboard-v7-clean.vercel.app/courses
2. Does it show real courses or "demo" placeholder?

**Expected Courses** (from VFS):
- `ita_for_eng_574seeds` (Italian for English speakers)
- `spa_for_eng_668seeds` (Spanish for English speakers)
- `mkd_for_eng_574seeds` (Macedonian for English speakers)
- Others from `/Users/tomcassidy/SSi/SSi_Course_Production/vfs/courses/`

**Indicators it's REAL data**:
- Course codes match VFS directory names
- Seed counts are actual (30, 574, 668, etc.)
- Metadata shows real dates/stats

**Indicators it's DEMO data**:
- Generic course names like "Example Course"
- Placeholder seed counts (100)
- "No courses found" or loading spinner forever

### Test 2.2: Course Detail
1. Click into `ita_for_eng_574seeds` course
2. Does it show real seed data?

**Expected**:
- Real Italian translations (e.g., "Voglio parlare italiano con te adesso")
- Real seed IDs (S0001, S0002, etc.)
- Real phase outputs (LEGOs, baskets)

**Not expected**:
- "Loading..." forever
- Empty states
- Demo/placeholder text

### Test 2.3: Quality Dashboard
1. Navigate to `/quality/ita_for_eng_574seeds`
2. Does it show quality metrics?

**Expected** (from QUALITY_REPORT.md):
- Overall quality score (75.9/100 or similar)
- Flagged seeds count
- Phase breakdown
- Top issues list

**Check**:
- Is this the ACTUAL quality report data?
- Or generic placeholder metrics?

---

## Phase 3: Critical Workflow Testing

### Test 3.1: Live Prompt Viewing (Critical Feature #1)
**APML Lines 1298-1303**: TrainingPhase displays ACTUAL prompts from registry

1. Navigate to `/phase/5` (Phase 5: Pattern-Aware Baskets)
2. Scroll to "Current Prompt" section
3. Read the prompt text

**Verification Questions**:
- Does the prompt contain the Phase 5 APML text?
- Does it mention "E-PHRASE CRITICAL REQUIREMENTS"?
- Does it mention "UNFORGIVEABLE ERRORS"?
- Is it the REAL v7.2.0 prompt (with our fixes)?

**How to verify it's REAL** (not hardcoded):
- The prompt should be LONG (1000+ lines)
- Should have recent updates we made (grammar validation, length requirements)
- Look for specific text we added: "⚠️ **POOR SYNTAX IN TARGET LANGUAGE IS UNFORGIVEABLE** ⚠️"

**If you see generic/short prompts**: Loading from hardcoded fallback, not registry

### Test 3.2: Prompt Editing Workflow (Critical Feature #2)
**APML Lines 1298-1303**: Edit in UI → updates source → execution stays in sync

⚠️ **CAUTION**: This will actually modify the APML file and create git commits

**Test Steps**:
1. Navigate to `/phase/5`
2. Click "Edit Prompt" button (if exists)
3. Add test text at top: `# TEST EDIT - 2025-10-14 00:XX`
4. Click "Save Changes"

**Expected Behavior**:
- Success message appears
- Git commit created
- Version history updates
- `.apml-registry.json` recompiles

**How to verify**:
```bash
# Check git log
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean
git log -1 --oneline

# Should show recent commit with "Update Phase 5 prompt" or similar

# Check APML file
grep "TEST EDIT" ssi-course-production.apml

# Should find your test text
```

**If this works**: ✅ Self-improving DNA operational

### Test 3.3: Translation Editing (Critical Feature #3)
**APML Lines 1315-1323**: User edits translation → triggers Phase 3+ regeneration

⚠️ **CAUTION**: This will spawn Claude Code agents and regenerate phases

**Test Steps**:
1. Navigate to course editor: `/courses/ita_for_eng_574seeds`
2. Find seed S0005: "Sto per esercitarmi a parlare"
3. Click "Edit" on the translation
4. Change Italian to: "Sto per esercitarmi a parlare italiano" (add "italiano")
5. Click "Save"

**Expected Behavior**:
- Save succeeds
- Regeneration job starts automatically
- Progress card appears showing phases 3, 3.5, 4, 5, 6
- Terminal windows spawn on Mac (automation server via osascript)
- Progress updates as phases complete

**How to verify**:
- Dashboard shows regeneration progress
- automation_server.cjs logs show: `[Cascade] Starting Phase 3+ regeneration for S0005`
- New Terminal windows appear with Claude Code
- After completion, S0005 data updated with new LEGOs/baskets

**If this works**: ✅ Edit → regeneration cascade operational

### Test 3.4: Quality Review → Regeneration (Critical Feature #4)
**APML Lines 1308-1314**: Flag problematic seeds → automatic rerun

**Test Steps**:
1. Navigate to quality dashboard: `/quality/ita_for_eng_574seeds`
2. Find flagged seeds (should show 12/30 flagged per quality report)
3. Select a flagged seed (e.g., one with grammar errors)
4. Click "Regenerate" button

**Expected Behavior**:
- Regeneration job starts
- Status tracking shows progress
- After completion, quality metrics update

---

## Phase 4: Performance & UX Testing

### Test 4.1: Page Load Speed
1. Open https://ssi-dashboard-v7-clean.vercel.app
2. Check DevTools Performance tab
3. Measure First Contentful Paint (FCP)

**Expected**: < 2 seconds for initial load
**Acceptable**: < 5 seconds

### Test 4.2: API Response Times
Check Network tab for API calls:
- `/api/courses` - should be < 500ms
- `/api/courses/:code` - should be < 1s
- `/api/prompts/:phase` - should be < 500ms

**If slow**: ngrok latency or VFS disk reads

### Test 4.3: Navigation Smoothness
Click around dashboard:
- Home → Courses → Course Detail
- Home → Phase 5 → Edit prompt
- Home → Quality Dashboard → Seed Review

**Expected**: Instant navigation (Vue SPA)
**Not expected**: Full page reloads

### Test 4.4: Error Handling
Test graceful degradation:

1. **Kill automation server temporarily**:
   ```bash
   lsof -ti :54321 | xargs kill
   ```

2. **Refresh dashboard** - should show:
   - Loading states → Error messages
   - "Unable to connect to server"
   - Fallback to demo data (if implemented)
   - NOT: Blank white screen or crashed app

3. **Restart server**:
   ```bash
   cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean
   PORT=54321 node automation_server.cjs
   ```

4. **Refresh dashboard** - should recover and show data again

---

## Output Format

Create comprehensive report: `LIVE_FULLSTACK_TEST_REPORT.md`

### Structure:

```markdown
# Live Full-Stack Integration Test Report

**Tested**: https://ssi-dashboard-v7-clean.vercel.app
**Backend**: https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev
**Date**: 2025-10-14
**Duration**: [X] minutes

---

## Executive Summary

**Overall Status**: ✅ Working / ⚠️ Partially Working / ❌ Broken
**Integration Health**: [X]%
**Critical Features**: [X/4] working

**Quick Verdict**: [One paragraph assessment]

---

## Phase 1: Backend Connectivity

### Test 1.1: Direct Backend Access
- Status: ✅/❌
- Response time: [X]ms
- Evidence: [curl output or screenshot]

### Test 1.2: Vercel → Backend Connection
- Status: ✅/❌
- Console errors: [Yes/No - list if any]
- CORS working: ✅/❌
- Evidence: [screenshot of DevTools]

**Phase 1 Score**: [X/10]

---

## Phase 2: Data Loading

### Test 2.1: Course List
- Status: ✅/❌
- Data source: REAL / DEMO / MIXED
- Courses found: [list]
- Evidence: [screenshot]

### Test 2.2: Course Detail
- Status: ✅/❌
- Real translations visible: ✅/❌
- Real LEGOs visible: ✅/❌
- Evidence: [screenshot]

### Test 2.3: Quality Dashboard
- Status: ✅/❌
- Quality score shown: [X/100]
- Matches QUALITY_REPORT.md: ✅/❌
- Evidence: [screenshot]

**Phase 2 Score**: [X/10]

---

## Phase 3: Critical Workflows

### Test 3.1: Live Prompt Viewing
- Status: ✅/❌
- Prompt source: REGISTRY / HARDCODED
- Prompt version: v7.2.0 confirmed ✅/❌
- Contains our fixes: ✅/❌
- Evidence: [screenshot showing "UNFORGIVEABLE" text]

**APML Compliance**: Lines 1298-1303 - ✅/❌

### Test 3.2: Prompt Editing Workflow
- Status: ✅/❌/⏸️ (not tested)
- Git commit created: ✅/❌
- Registry recompiled: ✅/❌
- Evidence: [git log output]

**APML Compliance**: Lines 1298-1303 - ✅/❌

### Test 3.3: Translation Editing
- Status: ✅/❌/⏸️ (not tested)
- Regeneration triggered: ✅/❌
- Progress tracked: ✅/❌
- Agents spawned: ✅/❌
- Evidence: [screenshot + automation_server logs]

**APML Compliance**: Lines 1315-1323 - ✅/❌

### Test 3.4: Quality Review → Regeneration
- Status: ✅/❌/⏸️ (not tested)
- Can flag seeds: ✅/❌
- Can trigger regen: ✅/❌
- Evidence: [screenshot]

**APML Compliance**: Lines 1308-1314 - ✅/❌

**Phase 3 Score**: [X/10]

---

## Phase 4: Performance & UX

### Test 4.1: Page Load Speed
- First Contentful Paint: [X]s
- Grade: FAST / ACCEPTABLE / SLOW

### Test 4.2: API Response Times
- /api/courses: [X]ms
- /api/courses/:code: [X]ms
- /api/prompts/:phase: [X]ms
- Grade: FAST / ACCEPTABLE / SLOW

### Test 4.3: Navigation Smoothness
- Navigation type: SPA (instant) / Full reloads
- Grade: EXCELLENT / GOOD / POOR

### Test 4.4: Error Handling
- Graceful degradation: ✅/❌
- Error messages helpful: ✅/❌
- Recovery after server restart: ✅/❌

**Phase 4 Score**: [X/10]

---

## Issues Found

### Critical Issues 🚨
1. [Issue description] - Blocks: [workflow]
2. ...

### High Priority ⚠️
1. [Issue description]
2. ...

### Medium Priority 📝
1. [Issue description]
2. ...

---

## Evidence Collected

[Include screenshots showing]:
1. Dashboard home with real data
2. Course list with VFS courses
3. Phase 5 prompt showing v7.2.0 text
4. DevTools console (clean, no errors)
5. DevTools network tab (successful API calls)

[Optional: Record screen video of key workflows]

---

## Recommendations

### Immediate Actions (If Issues Found)
1. [Fix for issue #1]
2. [Fix for issue #2]

### Before Production Use
1. [Recommendation]
2. [Recommendation]

### Future Improvements
1. [Enhancement idea]
2. [Enhancement idea]

---

## Final Verdict

**Production Ready**: ✅ YES / ❌ NO / ⚠️ WITH CONDITIONS

**Confidence Level**: HIGH / MEDIUM / LOW

**Recommended Next Step**: [Specific action]

---

**Report Completed**: [timestamp]
**Tested By**: Claude Code Orchestrator
**Test Duration**: [X] minutes
```

---

## Success Criteria

✅ All 4 test phases completed
✅ Backend connectivity verified (actual API calls working)
✅ Real data loading (not demo/hardcoded)
✅ At least 3/4 critical features working
✅ No critical blockers found
✅ Evidence collected (screenshots/logs)
✅ Clear recommendations provided

---

## Important Notes

1. **Be thorough**: Actually open browser, test workflows, collect evidence
2. **Use browser DevTools**: Console + Network tabs are critical
3. **Verify REAL vs DEMO**: Don't assume - check the actual data
4. **Test workflows carefully**: Some modify APML/VFS (be ready to revert)
5. **Collect evidence**: Screenshots prove it works (or doesn't)

---

## If You Can't Access Browser

If testing from command line only:

```bash
# Test key endpoints
curl https://ssi-dashboard-v7-clean.vercel.app
curl https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/courses
curl https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/prompts/5

# Check automation server logs
tail -100 [path-to-automation-server-output]

# Check ngrok logs
curl http://127.0.0.1:4040/api/tunnels
```

But note: **Browser testing is required** for full verification. Command-line testing can only verify backend, not full-stack integration.

---

Ready to test! Save report to: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/LIVE_FULLSTACK_TEST_REPORT.md`
