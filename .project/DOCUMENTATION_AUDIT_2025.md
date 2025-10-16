# Documentation & Terminology Audit - January 2025

**Date**: 2025-01-16
**Status**: Audit Complete - Ready for Updates
**Context**: After implementing LEGO_BASKETS visualization, reviewing all documentation for consistency

---

## EXECUTIVE SUMMARY

**Current State**: APML is UP TO DATE ✅ but Dashboard UI has INCONSISTENCIES ⚠️

The `ssi-course-production.apml` file (v7.6.0) correctly defines all phases and terminology. However, several UI components still reference:
- ❌ "amino_acids" storage paths (deprecated)
- ❌ Old Phase 4 (now deprecated, merged into Phase 5.5)
- ❌ Generic "translations" instead of "SEED_PAIRS"
- ❌ Old batch processing references

---

## PHASE DEFINITIONS (APML v7.6.0 - CORRECT)

### User-Facing Phases

| Phase | Name | Purpose | Output |
|-------|------|---------|--------|
| **1** | Pedagogical Translation | Translate 668 canonical seeds into target+known languages | `translations.json` (SEED_PAIRS) |
| **2** | Corpus Intelligence | Analyze FCFS order and utility scores | `corpus_intelligence.json` |
| **3** | LEGO Decomposition | Extract FD teaching units from seeds | `LEGO_BREAKDOWNS_COMPLETE.json` |
| **3.5** | Graph Construction | Map LEGO adjacency patterns | `lego_graph.json` |
| **3.9** | Automated Quality Validation | Validate LEGO quality, trigger recursive QA | Quality reports |
| **4** | ~~Deduplication~~ | **DEPRECATED** - Merged into Phase 5.5 | N/A |
| **5** | Basket Generation | Create practice phrases for ALL LEGOs | `baskets.json` (LEGO_BASKETS) |
| **5.5** | Basket Deduplication | Deduplicate baskets, keep first occurrence | `baskets_deduplicated.json` |
| **6** | Introductions | Generate pedagogical explanations | `introductions/` |

### Storage Updates (v7.6.0)

**NEW** (Consolidated Files):
- ✅ `vfs/courses/{course_code}/translations.json` - All SEED_PAIRS in single file
- ✅ `vfs/courses/{course_code}/baskets.json` - All LEGO_BASKETS in single file (includes LEGO core pairs)

**OLD** (Deprecated):
- ❌ `amino_acids/translations/` - Individual files per seed
- ❌ `amino_acids/legos/` - Individual files per LEGO
- ❌ `amino_acids/baskets/` - Individual files per basket

**Note**: APML correctly documents this transition. Dashboard needs updating.

---

## TERMINOLOGY (FROM GLOSSARY - CORRECT)

### The 3 Core Concepts

| Term | Definition | Reference Format | Storage |
|------|------------|------------------|---------|
| **SEED_PAIRS** | Pedagogically optimized translation of canonical seed | S0001-S0668 | `translations.json` |
| **LEGO_PAIRS** | FD teaching unit (target+known pair) | S0041L02 | Integrated into `baskets.json` |
| **LEGO_BASKETS** | Complete practice set for ONE LEGO | Same as LEGO_ID | `baskets.json` |

### What to AVOID

❌ "Translations" → ✅ SEED_PAIRS
❌ "LEGOs" alone → ✅ LEGO_PAIRS
❌ "Baskets" alone → ✅ LEGO_BASKETS
❌ "Amino acids" → ✅ Remove entirely (was Claude metaphor)
❌ "Teaching units" → ✅ LEGO_PAIRS
❌ "Lessons" → ✅ LEGO_BASKETS

---

## ISSUES FOUND

### 1. TerminologyGlossary.vue ⚠️

**File**: `/src/views/TerminologyGlossary.vue`

**Issues**:
- Line 60: Shows old storage path `amino_acids/translations/`
- Line 127: Shows old storage path `amino_acids/legos_deduplicated/`
- Line 194: Shows old storage path `amino_acids/baskets/`
- Line 321: Shows old storage path `amino_acids/introductions/`

**Should Be**:
- SEED_PAIRS: `vfs/courses/{course_code}/translations.json`
- LEGO_PAIRS: Integrated into `baskets.json`
- LEGO_BASKETS: `vfs/courses/{course_code}/baskets.json`
- LEGO_INTRODUCTIONS: `vfs/courses/{course_code}/introductions/`

### 2. TrainingPhase.vue ⚠️⚠️⚠️

**File**: `/src/views/TrainingPhase.vue`

**Major Issues**:
- **Line 387**: "Store translation amino acids in amino_acids/translations/" (outdated)
- **Line 392**: "Each translation is an immutable amino acid component" (remove amino acid concept)
- **Line 582**: "Store LEGO amino acids in amino_acids/legos/" (outdated path)
- **Line 589**: "LEGOs are immutable amino acids" (remove amino acid concept)
- **Line 812**: "LEGO amino acids: vfs/amino_acids/legos/*.json" (outdated)
- **Line 813**: "Translation amino acids: vfs/amino_acids/translations/*.json" (outdated)
- **Line 934**: "vfs/amino_acids/legos_deduplicated/*.json" (outdated)
- **Line 994**: "Store basket amino acids in amino_acids/baskets/" (outdated)
- **Line 1001**: "Baskets are still amino acids" (remove amino acid concept)
- **Line 1010**: "Deduplicated LEGOs: vfs/amino_acids/legos_deduplicated/*.json" (outdated)

**Phase 4 References**:
- Still shows Phase 4 as "Deduplication" when it's now DEPRECATED
- Should show Phase 4 as deprecated, explain Phase 5.5 took over

### 3. CourseEditor.vue ✅

**File**: `/src/views/CourseEditor.vue`

**Status**: MOSTLY GOOD

- ✅ Uses "SEED_PAIRS" in tab labels
- ✅ Uses "LEGO_PAIRS" in tab labels
- ✅ Uses "LEGO_BASKETS" in tab labels
- ✅ Loads from correct `baskets.json` via VFS endpoint
- ⚠️ Stats card line 51: Shows "lego_baskets" count (minor - could be clearer)

### 4. README.md - NOT CHECKED YET

**File**: `/README.md`

**Status**: Needs review

### 5. Dashboard Stats Display ⚠️

**Location**: Course library cards

**Current**:
```
SEED_PAIRS:    668
LEGO_PAIRS:    2341
LEGO_BASKETS:  120
```

**Good!** But need to verify:
- Are these counts accurately calculated from new storage format?
- Is Phase completion tracking correct?

---

## CORRECT PHASE FLOW (FROM APML)

```
Phase 1: Pedagogical Translation
  └─> translations.json (all 668 SEED_PAIRS)
        ↓
Phase 2: Corpus Intelligence
  └─> corpus_intelligence.json (FCFS + utility scores)
        ↓
Phase 3: LEGO Decomposition
  └─> LEGO_BREAKDOWNS_COMPLETE.json (all seed→LEGO mappings)
        ↓
Phase 3.5: Graph Construction
  └─> lego_graph.json (adjacency patterns)
        ↓
Phase 3.9: Automated Quality Validation
  └─> Quality reports + recursive improvement loop
        ↓
Phase 5: Basket Generation
  └─> baskets.json (all LEGO_BASKETS with embedded LEGO pairs)
        ↓
Phase 5.5: Basket Deduplication
  └─> baskets_deduplicated.json (unique baskets only)
        ↓
Phase 6: Introductions
  └─> introductions/ (BASE vs COMPOSITE explanations)
```

**Note**: Phase 4 is DEPRECATED (merged into Phase 5.5)

---

## ACTION PLAN

### Priority 1: Fix Storage Path References (High Impact)

**Files to Update**:
1. `src/views/TerminologyGlossary.vue` - Update all 4 storage paths
2. `src/views/TrainingPhase.vue` - Update ~15 storage path references

**Changes**:
- Replace `amino_acids/translations/` → `translations.json`
- Replace `amino_acids/legos/` → `baskets.json (integrated)`
- Replace `amino_acids/legos_deduplicated/` → `baskets.json (integrated)`
- Replace `amino_acids/baskets/` → `baskets.json`

### Priority 2: Remove "Amino Acids" Terminology (Medium Impact)

**Files to Update**:
1. `src/views/TrainingPhase.vue` - Remove all "amino acid" references
2. Update all prompts to say "SEED_PAIR" / "LEGO_PAIR" / "LEGO_BASKET" instead

**Changes**:
- "translation amino acid" → "SEED_PAIR"
- "LEGO amino acid" → "LEGO_PAIR"
- "basket amino acid" → "LEGO_BASKET"
- "immutable amino acid" → "immutable component"

### Priority 3: Update Phase 4 Documentation (Medium Impact)

**Files to Update**:
1. `src/views/TrainingPhase.vue` - Mark Phase 4 as DEPRECATED

**Changes**:
- Add deprecation notice: "Phase 4 DEPRECATED - merged into Phase 5.5"
- Explain new flow: Phase 5 generates all baskets, Phase 5.5 deduplicates
- Update any UI that shows phase progression

### Priority 4: Verify Dashboard Stats (Low Impact)

**Task**: Ensure dashboard correctly counts from new storage format
- SEED_PAIRS count from `translations.json`
- LEGO_PAIRS count from `baskets.json` (count basket keys)
- LEGO_BASKETS count from `baskets.json` (should match LEGO_PAIRS)

### Priority 5: Update Main README (Low Impact)

**File**: `README.md`

**Task**: Review and update with latest terminology and phase flow

---

## VERIFICATION CHECKLIST

After updates, verify:

- [ ] No references to `amino_acids/` directories in user-facing docs
- [ ] All storage paths point to consolidated JSON files
- [ ] Phase 4 marked as DEPRECATED everywhere
- [ ] "Amino acid" only appears in technical/implementation context (if at all)
- [ ] Terminology glossary matches APML exactly
- [ ] Phase flow diagrams show phases 1,2,3,3.5,3.9,5,5.5,6 (not 4)
- [ ] Dashboard stats calculate correctly from new storage
- [ ] All phase descriptions match APML prompts

---

## NOTES

**What's Working Well**:
- ✅ APML is fully up to date (v7.6.0)
- ✅ VFS endpoint correctly serves `baskets.json`
- ✅ CourseEditor uses correct terminology in UI
- ✅ Terminology glossary is comprehensive and accurate
- ✅ New basket visualization uses correct structure

**What Needs Work**:
- ⚠️ Training/Phase documentation has outdated paths
- ⚠️ "Amino acids" concept still visible in many places
- ⚠️ Phase 4 not marked as deprecated in UI

**Recommended Next Steps**:
1. Update TerminologyGlossary.vue storage paths (10 min)
2. Update TrainingPhase.vue to remove amino acids + update paths (30 min)
3. Add Phase 4 deprecation notice (10 min)
4. Review README.md (15 min)
5. Test dashboard stats calculations (10 min)

**Total Estimated Time**: ~1.5 hours to bring all documentation into alignment with APML v7.6.0
