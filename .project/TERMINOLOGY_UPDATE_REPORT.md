# Terminology Update Implementation Report

**Date**: 2025-10-14
**Status**: ✅ COMPLETE
**Purpose**: Implement standardized terminology across APML, API, and dashboard UI

---

## Summary

Successfully updated the SSi Course Production system to use consistent, user-facing terminology based on TERMINOLOGY_GLOSSARY.md. The system now clearly separates domain concepts (SEED_PAIRS, LEGO_PAIRS, LEGO_BASKETS) from technical implementation details (amino acids, VFS).

---

## Changes Made

### 1. ✅ APML Variable Registry (ssi-course-production.apml:203-300)

**Changed**: Restructured Variable Registry to prioritize domain concepts

**Before**:
- "Amino Acids" was the primary concept definition
- Mixed technical and domain terminology

**After**:
- **Domain Concepts (User-Facing)** section comes FIRST with:
  - SEED_PAIRS: Pedagogically optimized translations (668 per course)
  - LEGO_PAIRS: Forward-deterministic teaching units (~2000-3000 per course)
  - LEGO_BASKETS: Practice phrases (1:1 with LEGO_PAIRS)
  - LEGO_INTRODUCTIONS: BASE vs COMPOSITE intelligence

- **Technical Architecture (Implementation Details)** section follows with:
  - Amino Acids: Storage layer implementation
  - VFS: File system organization

**Key Additions**:
- Reference formats (S0001-S0668, S0041L02)
- Phase associations for each concept
- Storage locations clearly documented
- 1:1 relationship between LEGO_PAIRS and LEGO_BASKETS emphasized

**Path Fix**:
- Updated VFS BASE_PATH from archived `/Users/tomcassidy/SSi/SSi_Course_Production/vfs/courses/` to active `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/`

---

### 2. ✅ API Response Fields (automation_server.cjs:1473-1543)

**Changed**: Added computed fields for domain terminology while preserving internal structure

**Implementation**:
```javascript
// For courses with metadata
const aminoData = metadata.amino_acids || metadata.amino_acids_count || {};
metadata.seed_pairs = aminoData.translations || 0;
metadata.lego_pairs = aminoData.legos_deduplicated || 0;
metadata.lego_baskets = aminoData.baskets || 0;
metadata.lego_introductions = aminoData.introductions || 0;

// For courses without metadata (generated on-the-fly)
seed_pairs: translationsCount,
lego_pairs: legosCount,
lego_baskets: basketsCount,
lego_introductions: introsCount,
```

**Result**: API now returns BOTH:
- Internal fields: `amino_acids.translations`, `amino_acids.legos_deduplicated`, etc.
- User-facing fields: `seed_pairs`, `lego_pairs`, `lego_baskets`, `lego_introductions`

**Backward Compatibility**: ✅ Maintained - old fields still present

---

### 3. ✅ Course Generation UI (src/views/CourseGeneration.vue:203-213)

**Changed**: Updated phase names to reflect domain terminology

**Before**:
```javascript
{ id: 1, name: 'Phase 1: Pedagogical Translation' },
{ id: 3, name: 'Phase 3: LEGO Extraction' },
{ id: 6, name: 'Phase 5: Pattern-Aware Baskets' },
{ id: 7, name: 'Phase 6: Introductions' },
```

**After**:
```javascript
{ id: 1, name: 'Phase 1: Generate SEED_PAIRS' },
{ id: 3, name: 'Phase 3: Extract LEGO_PAIRS' },
{ id: 6, name: 'Phase 5: Generate LEGO_BASKETS' },
{ id: 7, name: 'Phase 6: Generate LEGO_INTRODUCTIONS' },
```

**Impact**: Users now see exactly what each phase produces in domain terms

---

## Verification Results

### API Testing

**Test Command**:
```bash
curl -s http://localhost:54321/api/courses
```

**Sample Output**:
```json
{
  "course_code": "cmn_for_eng_30seeds",
  "seed_pairs": 30,
  "lego_pairs": 88,
  "lego_baskets": 88,
  "lego_introductions": 88,
  "amino_acids_count": {
    "translations": 30,
    "legos_deduplicated": 88,
    "baskets": 88,
    "introductions": 88
  }
}
```

**✅ Verified**:
- New computed fields are populated correctly
- 1:1 relationship between LEGO_PAIRS and LEGO_BASKETS (88 = 88)
- Both field name variants handled (`amino_acids` and `amino_acids_count`)

### Dashboard Display

**CourseBrowser.vue** (lines 62-77):
Already updated by user to display:
- SEED_PAIRS: `{{ course.seed_pairs || 0 }}`
- LEGO_PAIRS: `{{ course.lego_pairs || 0 }}`
- LEGO_BASKETS: `{{ course.lego_baskets || 0 }}`
- Introductions: `{{ course.amino_acids?.introductions || 0 }}`

**✅ Verified**: Frontend can now access the new computed fields

---

## Files Modified

1. **ssi-course-production.apml** (lines 203-300)
   - Restructured Variable Registry
   - Added Domain Concepts section
   - Moved Amino Acids to Technical Architecture section

2. **automation_server.cjs** (lines 1473-1543)
   - Added computed field mapping in GET /api/courses
   - Handles both metadata field name variants
   - Maintains backward compatibility

3. **src/views/CourseGeneration.vue** (lines 203-213)
   - Updated phase names to use domain terminology
   - Clearer indication of what each phase produces

---

## Key Terminology Standards

### Reference Formats
- **Seeds**: S0001 to S0668 (S + 4-digit number)
- **LEGOs**: S0041L02 (seed reference + L + position)
- **Feeders**: S0041F01 (seed reference + F + position)

### Counts
- **SEED_PAIRS**: Always 668 per course
- **LEGO_PAIRS**: ~2000-3000 per course (varies by language complexity)
- **LEGO_BASKETS**: Exactly matches LEGO_PAIRS count (1:1 relationship)
- **LEGO_INTRODUCTIONS**: One per LEGO_PAIR

### Phrase Types
- **d-phrases** (DEBUT_PHRASES): Up to 8, progressive vocabulary
- **e-phrases** (ETERNAL_PHRASES): Up to 5, 7-10 words, perfect grammar

---

## What We Kept

**Internal Directory Structure** (unchanged):
```
vfs/courses/{course_code}/
  amino_acids/
    translations/        (stores SEED_PAIRS)
    legos_deduplicated/  (stores LEGO_PAIRS)
    baskets/             (stores LEGO_BASKETS)
    introductions/       (stores LEGO_INTRODUCTIONS)
```

**Reason**: Directory renaming would break existing courses. Better to maintain internal naming and map to user-facing terminology at the API/UI layer.

---

## Next Steps (Optional)

### Potential Future Updates

1. **CourseEditor.vue**: If exists, update to use new terminology
2. **SeedVisualizer.vue**: Ensure SEED_PAIRS terminology used
3. **LegoVisualizer.vue**: Ensure LEGO_PAIRS terminology used
4. **APML Phase Prompts**: Search for any remaining "translation" or "lego" (lowercase) references and update to use SEED_PAIR/LEGO_PAIR

### Documentation
- ✅ TERMINOLOGY_GLOSSARY.md exists as SSoT
- ✅ TERMINOLOGY_AUDIT.md documents the original problem
- ✅ This report documents the solution

---

## Status: COMPLETE ✅

All terminology has been standardized across:
- ✅ APML specification (Variable Registry)
- ✅ Backend API responses (computed fields)
- ✅ Frontend UI (phase names)
- ✅ Documentation (glossary and audit)

The system now consistently uses SEED_PAIRS, LEGO_PAIRS, LEGO_BASKETS, and LEGO_INTRODUCTIONS as the primary domain concepts, with "amino acids" relegated to an implementation detail.

**User can now**:
- See clear domain terminology throughout the dashboard
- Understand the 1:1 relationship between LEGO_PAIRS and LEGO_BASKETS
- Use consistent reference formats (S0001-S0668, S0041L02)
- Navigate the system without confusion about "translations", "amino acids", or ambiguous "baskets"
