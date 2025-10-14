# Brief: Dashboard Verification Test

**Mission**: Systematically verify every dashboard feature works before manual course generation test.

---

## Your Task

Test the live dashboard at **https://ssi-dashboard-v7-clean.vercel.app** and verify:
1. ✅ Every link works
2. ✅ All training content accessible
3. ✅ APML visible and navigable
4. ✅ Prompts are editable
5. ✅ All features functional

---

## Test Checklist

### 1. Navigation Test (Every Link)

**Dashboard Home** (`/`)
- [ ] "Course Generation" link → works
- [ ] "Process Overview" link → works
- [ ] "Training Content" link → works
- [ ] "Canonical Seeds" link → works
- [ ] Any other nav links → work

**Course Generation** (`/course-generation`)
- [ ] Page loads
- [ ] Language selectors populate
- [ ] Seed count defaults to 668
- [ ] "Generate Course" button present

**Process Overview** (`/process-overview`)
- [ ] Page loads
- [ ] Phase 0-6 described
- [ ] Links to training content work (if any)

**Training Content** (`/training`)
- [ ] Page loads
- [ ] Phase 0 training content visible
- [ ] Phase 1 training content visible
- [ ] Phase 2 training content visible
- [ ] Phase 3 training content visible
- [ ] Phase 3.5 training content visible
- [ ] Phase 4 training content visible
- [ ] Phase 5 training content visible
- [ ] Phase 6 training content visible
- [ ] All 7 phases have content

**Canonical Seeds** (`/canonical-seeds`)
- [ ] Page loads
- [ ] Says "668" seeds (not 574)
- [ ] Content describes seed structure

**Course Editor** (if accessible)
- [ ] Can view existing courses
- [ ] Can navigate course data
- [ ] Visualization works

---

### 2. APML Content Test

**Check APML is accessible:**
- [ ] APML content visible somewhere on site
- [ ] Can read phase prompts
- [ ] Can see LEGO architecture docs
- [ ] Can see heuristics definitions
- [ ] Version number shown (should be 7.3.0)

**If APML not yet published as HTML:**
- [ ] Note: "APML not yet visible on dashboard" → needs APML visualizer (separate task)

---

### 3. Training Content Test

For EACH phase (0, 1, 2, 3, 3.5, 4, 5, 6):

**Phase Content Must Include:**
- [ ] Phase name and number
- [ ] What the phase does
- [ ] Input requirements
- [ ] Output format
- [ ] Key concepts
- [ ] Examples (if applicable)

**Check these phases specifically:**

**Phase 1 - Translation:**
- [ ] 6 heuristics explained (naturalness, frequency, clarity, brevity, consistency, utility)
- [ ] Two-step translation process
- [ ] FD_LOOP explanation

**Phase 3 - LEGO Extraction:**
- [ ] BASE LEGO definition
- [ ] COMPOSITE LEGO definition
- [ ] FEEDERS definition
- [ ] TILING concept explained
- [ ] IRON RULE explained

**Phase 5 - Basket Generation:**
- [ ] E-phrases vs D-phrases
- [ ] Progressive vocabulary constraint
- [ ] Culminating LEGO rule
- [ ] 7-10 word requirement for e-phrases

---

### 4. Prompt Editing Test

**Backend API:**
- [ ] Check if `/api/apml` endpoint exists
- [ ] Check if `/api/apml/update` or similar exists
- [ ] Can prompts be edited through API?

**Frontend:**
- [ ] Is there a "Edit Prompt" UI anywhere?
- [ ] Can you click to edit phase prompts?
- [ ] Does it save changes?

**If editing not implemented:**
- [ ] Note: "Prompt editing UI not found" → needs implementation

---

### 5. Course Generation Flow Test (Dry Run)

**DO NOT actually generate a course yet** - just verify UI works:

1. Navigate to Course Generation
2. [ ] Select target language (e.g., Irish - gle)
3. [ ] Select known language (e.g., English - eng)
4. [ ] Set seed count to 30 (small test)
5. [ ] Click "Generate Course"
6. [ ] Does it attempt to spawn terminal/Claude Code?
7. [ ] Does progress monitor appear?
8. [ ] Can you see what phase it would run?

**Expected**: Button should trigger something (Warp terminal spawn, progress display, etc.)

---

### 6. Existing Course Visualization Test

**If there are existing courses in VFS** (spa_for_eng_668seeds, ita_for_eng_668seeds, fra_for_eng_668seeds):

- [ ] Can you navigate to these courses?
- [ ] Can you view translations?
- [ ] Can you view LEGOs?
- [ ] Can you view baskets?
- [ ] Are visualizations working?

**Test these endpoints** (via browser or API):
- [ ] `/api/courses` - lists courses
- [ ] `/api/courses/spa_for_eng_668seeds/translations` - shows translations
- [ ] `/api/courses/spa_for_eng_668seeds/legos` - shows LEGOs
- [ ] `/api/visualization/lego-breakdown` - shows LEGO structure

---

### 7. Data Integrity Test

**Verify backend can access:**
- [ ] `ssi-course-production.apml` at root
- [ ] `canonical_seeds.json` at root (668 seeds)
- [ ] `vfs/courses/` directory

**Test via browser console or API:**
```javascript
// In browser console on dashboard:
fetch('YOUR_NGROK_OR_API_URL/api/health').then(r => r.json()).then(console.log)
```

- [ ] Backend responds
- [ ] Backend can read APML
- [ ] Backend can read canonical seeds

---

### 8. Automation Server Test

**Check automation_server.cjs is running:**
- [ ] Server responding (check ngrok URL or localhost:54321)
- [ ] Can reach `/api/health` or similar
- [ ] CORS configured for Vercel domain

**Test key endpoints:**
- [ ] `GET /api/courses` - lists courses
- [ ] `GET /api/apml` - returns APML metadata
- [ ] `POST /api/courses/generate` - accepts generation request

---

## Deliverable

Create: `DASHBOARD_VERIFICATION_REPORT.md`

**Format:**
```markdown
# Dashboard Verification Report

**Date**: 2025-10-14
**Tested**: https://ssi-dashboard-v7-clean.vercel.app
**Status**: [PASS / PARTIAL / FAIL]

## Summary
[2-3 sentences: overall state]

## Results

### Navigation: [✅ PASS / ⚠️ PARTIAL / ❌ FAIL]
- Home: ✅
- Course Generation: ✅
- Process Overview: ✅
- Training Content: ⚠️ (Phase 5 content incomplete)
- Canonical Seeds: ✅

[Issues found: ...]

### Training Content: [✅ PASS / ⚠️ PARTIAL / ❌ FAIL]
- Phase 0: ✅
- Phase 1: ✅ (all 6 heuristics visible)
- Phase 3: ⚠️ (TILING concept missing)
- Phase 5: ❌ (progressive vocabulary not explained)

[Issues found: ...]

### APML Accessibility: [✅ PASS / ⚠️ PARTIAL / ❌ FAIL]
[Can users browse APML? Is it formatted?]

### Prompt Editing: [✅ PASS / ⚠️ PARTIAL / ❌ FAIL]
[Can prompts be edited through UI?]

### Course Generation UI: [✅ PASS / ⚠️ PARTIAL / ❌ FAIL]
[Does generation flow work?]

### Visualization: [✅ PASS / ⚠️ PARTIAL / ❌ FAIL]
[Can existing courses be viewed?]

### Data Integrity: [✅ PASS / ⚠️ PARTIAL / ❌ FAIL]
[Backend accessing correct files?]

## Critical Issues (Blockers)
1. [Issue that prevents course generation]
2. [Issue that prevents...]

## Non-Critical Issues
1. [UI polish needed]
2. [Documentation incomplete]

## Ready for Manual Test?
[YES / NO - explain why]

## Next Steps
1. Fix critical issue X
2. Add missing training content Y
3. Test manual course generation
```

---

## Success Criteria

**Dashboard is READY when:**
- ✅ All navigation links work
- ✅ All 7 phases have training content
- ✅ APML content is accessible (HTML or raw)
- ✅ Course generation UI triggers correctly
- ✅ Backend responding to API calls
- ✅ Seed count shows 668
- ✅ No critical blockers

**Dashboard is NOT READY when:**
- ❌ Navigation broken
- ❌ Training content missing for any phase
- ❌ Backend can't access APML or seeds
- ❌ Course generation button does nothing
- ❌ Critical data paths broken

---

## Important Notes

1. **Don't actually generate a course yet** - just verify UI/flow
2. **Test on actual deployed Vercel URL** - not localhost
3. **Check backend is running** - verify ngrok tunnel or Railway is live
4. **Be thorough** - test every single link and feature
5. **Document everything** - screenshots if needed

---

## When Complete

Report back with:
1. `DASHBOARD_VERIFICATION_REPORT.md` created
2. Overall status: READY / NOT READY
3. If NOT READY: list of blockers to fix
4. If READY: confirmation user can proceed with manual test

---

**Start now. Test systematically. Document everything.**
