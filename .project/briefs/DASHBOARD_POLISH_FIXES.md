# Brief: Dashboard Polish & Minor Fixes

**Status**: Dashboard is FUNCTIONAL but has minor polish issues
**Priority**: NON-BLOCKING but should be fixed before production use
**Estimated Time**: 2-3 hours

---

## Issues to Fix

### 1. Port Mismatch in Vue Components ⚠️
**Issue**: Some Vue components default to port 3456 instead of 54321
**Impact**: Production works fine (Vercel + ngrok), but local dev may fail
**Priority**: LOW (production works)

**Action**:
- Search all Vue files for port `3456`
- Update to `54321`
- Verify `src/services/api.js` or similar config uses correct port

**Files to check**:
```bash
grep -r "3456" src/
```

---

### 2. Training Content Says 574 Seeds (Should be 668) 📚
**Issue**: Phase 0 training content references 574 seeds
**Impact**: User confusion, outdated documentation
**Priority**: MEDIUM (user-facing content)

**Action**:
- Find training content for Phase 0
- Update "574" → "668"
- Check ALL training pages for 574 references

**Files to check**:
```bash
grep -r "574" src/views/
```

**Already fixed**:
- ✅ `src/views/CanonicalSeeds.vue` - now says 668
- ✅ `src/views/CourseGeneration.vue` - seed count defaults to 668

---

### 3. LEGO Architecture Missing from Training 🏗️
**Issue**: Dashboard training doesn't include BASE/COMPOSITE/FEEDERS/TILING concepts
**Impact**: Users won't understand LEGO architecture when viewing courses
**Priority**: HIGH (critical pedagogical concepts)

**Action**:
Add to Phase 3 training content:

**Section to add**: "LEGO Types & Architecture"

**Content needed**:
```markdown
## LEGO Types

### BASE LEGO
- Fundamental FD unit
- Cannot be broken down further
- Examples: "Voglio", "parlare", "voy", "algo"

### COMPOSITE LEGO
- FD unit = BASE LEGOs + glue words (non-LEGOs)
- BASE LEGOs within DON'T TILE
- Examples: "voy a decir" (voy + a + decir, where "a" is glue)

### FEEDERS
- BASE LEGOs that participate in a COMPOSITE
- Dual existence: independent + component
- Have F## suffix in COMPOSITE context

### TILING Concept
- **TILES**: LEGOs concatenate cleanly → keep separate
- **DOESN'T TILE**: Need glue words → create COMPOSITE

**Decision Rule**:
- If BASE LEGOs TILE → keep separate
- If BASE LEGOs DON'T TILE → create COMPOSITE + FEEDERs
```

**File to update**: `src/views/TrainingPhase.vue` or training content component

---

### 4. Full APML Document Viewer Endpoint 📄
**Issue**: Individual prompts accessible, but no full APML document viewer
**Impact**: Users can't browse entire APML in one view
**Priority**: MEDIUM (nice to have)

**Action**:
Create endpoint: `GET /api/apml/full`

**Returns**:
```json
{
  "version": "7.3.0",
  "phases": {
    "0": { "name": "...", "prompt": "...", "objectives": [...] },
    "1": { ... },
    ...
  },
  "architecture": {
    "lego_types": { ... },
    "tiling": { ... }
  }
}
```

**File to update**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/automation_server.cjs`

---

### 5. Legacy Endpoints Return Errors 🔧
**Issue**: Some old endpoints return errors (new visualizers work fine)
**Impact**: Console errors, but doesn't break functionality
**Priority**: LOW (cleanup)

**Action**:
- Identify which endpoints are failing
- Either: fix them OR remove references if deprecated
- Clean up dead code

**Method**:
Check browser console on dashboard for 404/500 errors, trace back to source

---

### 6. Italian Phase 5 Baskets in Old Format 🇮🇹
**Issue**: Italian course has Phase 5 baskets in old format
**Impact**: Basket visualizer can't display them correctly
**Priority**: MEDIUM (existing course visualization)

**Action**:
Two options:
1. **Convert old format to new** - update Italian basket files
2. **Support both formats** - make visualizer backward-compatible

**Recommended**: Option 2 (backward compatibility)

**File to check**:
- `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/ita_for_eng_668seeds/amino_acids/baskets/`
- Compare to Spanish baskets (if newer format)

---

## Verification After Fixes

Run these checks:

1. **Port Test**: `grep -r "3456" src/` → should be 0 results
2. **Seed Count Test**: `grep -r "574" src/` → only in old docs/comments
3. **Training Test**: Navigate to Phase 3 training → see LEGO architecture section
4. **APML Viewer Test**: `curl localhost:54321/api/apml/full` → returns full doc
5. **Console Test**: Open dashboard → no 404/500 errors in console
6. **Basket Test**: Navigate to Italian course baskets → displays correctly

---

## Deliverable

Create: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.project/decisions/DASHBOARD_POLISH_COMPLETE.md`

**Format**:
```markdown
# Dashboard Polish Complete

**Date**: 2025-10-14

## Fixes Applied

1. ✅ Port mismatch: [description of changes]
2. ✅ Training content: Updated to 668 seeds
3. ✅ LEGO architecture: Added to Phase 3 training
4. ✅ APML viewer: Full document endpoint created
5. ✅ Legacy endpoints: [cleaned up / fixed]
6. ✅ Italian baskets: [converted / backward compatibility added]

## Files Modified

- `src/views/TrainingPhase.vue` - Added LEGO architecture
- `automation_server.cjs` - Added /api/apml/full endpoint
- [list other files]

## Verification

All checks passed:
- ✅ No port mismatches
- ✅ All training content says 668
- ✅ LEGO architecture visible
- ✅ Full APML endpoint working
- ✅ No console errors
- ✅ Italian baskets display

## Dashboard Status

🎉 **READY FOR PRODUCTION USE**
```

---

## Success Criteria

- ✅ All 6 issues addressed
- ✅ No breaking changes
- ✅ Verification checks pass
- ✅ Dashboard fully polished
- ✅ Ready for manual course generation test

---

**Start with high-priority items first (LEGO architecture, seed count). Low-priority items can be deferred if time-constrained.**
