# Dashboard Course Format Mismatch Analysis
## Current vs Expected Data Structures

**Date:** October 15, 2025
**Status:** 🔴 **CRITICAL MISMATCH IDENTIFIED**

---

## Problem Summary

The dashboard (`automation_server.cjs` + Vue frontend) expects a **different file structure and terminology** than what our current course generation pipeline produces.

**Impact:** Our newly generated courses (spa_for_eng_30seeds, etc.) **CANNOT be loaded** by the dashboard.

---

## Current Course Structure (What We Have)

```
vfs/courses/spa_for_eng_30seeds/
├── translations.json                    ← SINGLE FILE with all 30 seeds
└── LEGO_BREAKDOWNS_COMPLETE.json       ← SINGLE FILE with all LEGO breakdowns
```

### translations.json Format:
```json
{
  "S0001": ["Quiero hablar español contigo ahora.", "I want to speak Spanish with you now."],
  "S0002": ["Estoy intentando aprender.", "I'm trying to learn."],
  ...
}
```

### LEGO_BREAKDOWNS_COMPLETE.json Format:
```json
{
  "phase": "LEGO_BREAKDOWNS",
  "target_language": "Spanish",
  "known_language": "English",
  "lego_breakdowns": [
    {
      "seed_id": "S0001",
      "original_target": "Quiero hablar español contigo ahora.",
      "original_known": "I want to speak Spanish with you now.",
      "lego_pairs": [...],
      "feeder_pairs": [...],
      "componentization": [...]
    }
  ]
}
```

---

## Expected Course Structure (What Dashboard Needs)

```
vfs/courses/spa_for_eng_30seeds/
├── course_metadata.json                 ← MISSING!
└── amino_acids/
    ├── translations/
    │   ├── S0001.json                   ← ONE FILE PER SEED
    │   ├── S0002.json
    │   └── ...
    ├── legos/                           ← MISSING!
    │   ├── S0001.json
    │   └── ...
    ├── legos_deduplicated/              ← MISSING!
    │   ├── LEGO_001.json
    │   └── ...
    ├── baskets/                         ← MISSING (Phase 5)
    │   └── BASKET_001.json
    └── introductions/                   ← MISSING (Phase 6)
        └── INTRO_001.json
```

### course_metadata.json Format (Expected):
```json
{
  "course_code": "spa_for_eng_30seeds",
  "source_language": "ENG",
  "target_language": "SPA",
  "total_seeds": 30,
  "version": "1.0",
  "created_at": "2025-10-15T...",
  "status": "ready_for_phase_4",
  "amino_acids": {
    "translations": 30,
    "legos": 95,
    "legos_deduplicated": 85,
    "baskets": 0,
    "introductions": 0
  },
  "phases_completed": ["0", "1", "3"],
  "seed_pairs": 30,
  "lego_pairs": 85,
  "lego_baskets": 0
}
```

### amino_acids/translations/S0001.json Format (Expected):
```json
{
  "seed_id": "S0001",
  "canonical_seed": "I want to speak [LANGUAGE] with you now.",
  "target_phrase": "Quiero hablar español contigo ahora.",
  "known_phrase": "I want to speak Spanish with you now.",
  "translation_metadata": {
    "heuristics_applied": ["naturalness", "frequency", "brevity"],
    "quality_score": 0.95
  }
}
```

### amino_acids/legos/S0001.json Format (Expected):
```json
{
  "seed_id": "S0001",
  "lego_pairs": [
    {
      "lego_id": "S0001L01",
      "target_chunk": "Quiero",
      "known_chunk": "I want",
      "fd_validated": true
    }
  ],
  "feeder_pairs": [],
  "componentization": []
}
```

---

## Terminology Mismatch

| Dashboard Term | Our Term | Meaning |
|----------------|----------|---------|
| `amino_acids` | N/A | Container directory for all course data |
| `translations` | `translations.json` | Seed pairs (target/known) |
| `legos` | `lego_pairs` (in LEGO_BREAKDOWNS_COMPLETE.json) | LEGO breakdowns per seed |
| `legos_deduplicated` | N/A | Unique LEGOs (not implemented yet) |
| `baskets` | N/A | Phase 5 output (not implemented yet) |
| `introductions` | N/A | Phase 6 output (not implemented yet) |
| `seed_pairs` | `translations` count | Number of translation pairs |
| `lego_pairs` | `lego_breakdowns` count | Number of LEGO breakdowns |
| `lego_baskets` | N/A | Number of generated baskets |

---

## Code Analysis: automation_server.cjs

### /api/courses Endpoint (Lines 1509-1607)

**What it does:**
1. Scans `/vfs/courses/` directory
2. For each course directory, looks for:
   - `course_metadata.json` ✅ (if exists)
   - `amino_acids/` directory ✅ (required)
   - `amino_acids/translations/` ✅ (counts .json files)
   - `amino_acids/legos_deduplicated/` ✅ (counts .json files)
   - `amino_acids/baskets/` ✅ (counts .json files)
   - `amino_acids/introductions/` ✅ (counts .json files)

**Expected fields:**
```javascript
{
  course_code: "spa_for_eng_30seeds",
  source_language: "ENG",
  target_language: "SPA",
  total_seeds: 30,
  version: "1.0",
  created_at: "ISO timestamp",
  status: "ready_for_phase_4",
  amino_acids: {
    translations: 30,
    legos: 0,
    legos_deduplicated: 95,
    baskets: 0,
    introductions: 0
  },
  seed_pairs: 30,          // Computed from amino_acids.translations
  lego_pairs: 95,          // Computed from amino_acids.legos_deduplicated
  lego_baskets: 0,         // Computed from amino_acids.baskets
  phases_completed: ["1", "3"]
}
```

---

### /api/courses/:courseCode Endpoint (Lines 1613-1683)

**What it does:**
1. Loads `course_metadata.json`
2. Loads up to 100 files from `amino_acids/translations/*.json`
3. Loads up to 50 files from `amino_acids/legos_deduplicated/*.json`
4. Loads all files from `amino_acids/baskets/*.json`

**Returns:**
```javascript
{
  course: { ...metadata... },
  translations: [ ...array of translation objects... ],
  legos: [ ...array of LEGO objects... ],
  baskets: [ ...array of basket objects... ]
}
```

---

## Dashboard Frontend Expectations

### CourseBrowser.vue (Lines 39-112)

**Expected course object:**
```javascript
{
  course_code: "spa_for_eng_30seeds",
  total_seeds: 30,
  status: "complete",
  seed_pairs: 30,
  lego_pairs: 95,
  lego_baskets: 0,
  amino_acids: {
    introductions: 0
  },
  phases_completed: ["1", "3"]
}
```

**UI displays:**
- Course name (formatted from course_code)
- Total seeds
- Status badge
- Stats grid:
  - SEED_PAIRS (displays `course.seed_pairs`)
  - LEGO_PAIRS (displays `course.lego_pairs`)
  - LEGO_BASKETS (displays `course.lego_baskets`)
  - Introductions (displays `course.amino_acids.introductions`)
- Phases completed (checkboxes for phases 0-6)

---

## The Gap

### What's Missing:

1. **course_metadata.json**
   - Status: ❌ NOT CREATED
   - Required by: Dashboard course list, course detail view
   - Contains: Metadata fields expected by frontend

2. **amino_acids/ directory structure**
   - Status: ❌ NOT CREATED
   - Required by: All API endpoints
   - Contains: Separate JSON files for translations, legos, etc.

3. **amino_acids/translations/*.json (one per seed)**
   - Status: ❌ NOT CREATED
   - We have: Single `translations.json` file
   - Need: Split into S0001.json, S0002.json, etc.

4. **amino_acids/legos/*.json (one per seed)**
   - Status: ❌ NOT CREATED
   - We have: Single `LEGO_BREAKDOWNS_COMPLETE.json` file
   - Need: Split into S0001.json, S0002.json, etc.

5. **amino_acids/legos_deduplicated/**
   - Status: ❌ NOT IMPLEMENTED
   - Purpose: Phase 4 output (deduplication)
   - Currently: Same as legos/

6. **Phases 5-6 outputs**
   - Status: ❌ NOT IMPLEMENTED
   - baskets/: Phase 5 (e-phrases + d-phrases)
   - introductions/: Phase 6 (zero-unknowns intros)

---

## Solution Options

### Option 1: Adapter Script (Quick Fix)
**Create a converter:** `translations.json` + `LEGO_BREAKDOWNS_COMPLETE.json` → amino_acids structure

**Pros:**
- Works with existing course files
- Can be run as post-processing step
- Doesn't change course generation pipeline

**Cons:**
- Duplication (same data in two formats)
- Extra step needed after generation
- Doesn't solve future phases (5-6)

---

### Option 2: Update Course Generation Pipeline (Proper Fix)
**Modify APML/agents:** Generate amino_acids structure directly

**Pros:**
- Single source of truth
- Dashboard-ready output
- Scales to Phase 5-6

**Cons:**
- Requires updating all phase prompts
- More complex file management
- Need to update all 4 existing courses

---

### Option 3: Hybrid Approach (Recommended)
**Short-term:** Adapter script for existing courses
**Long-term:** Update APML for new courses

**Pros:**
- Immediate dashboard compatibility
- Gradual migration path
- Preserves existing work

**Cons:**
- Maintains two formats temporarily
- Need to track which format each course uses

---

## Recommended Implementation Plan

### Phase 1: Create Adapter Script (Immediate)

**File:** `scripts/convert-to-amino-acids.js`

**What it does:**
1. Read `translations.json`
2. Read `LEGO_BREAKDOWNS_COMPLETE.json`
3. Create `course_metadata.json`
4. Create `amino_acids/translations/*.json` (one per seed)
5. Create `amino_acids/legos/*.json` (one per seed)
6. Copy `amino_acids/legos/` → `amino_acids/legos_deduplicated/` (for now)

**Run for all 4 courses:**
```bash
node scripts/convert-to-amino-acids.js spa_for_eng_30seeds
node scripts/convert-to-amino-acids.js ita_for_eng_30seeds
node scripts/convert-to-amino-acids.js fra_for_eng_30seeds
node scripts/convert-to-amino-acids.js cmn_for_eng_30seeds
```

---

### Phase 2: Test Dashboard Integration

1. Start automation server: `node automation_server.cjs`
2. Start Vue frontend: `npm run dev`
3. Navigate to `/courses`
4. Verify courses appear
5. Click "View & Edit"
6. Verify course data loads correctly

---

### Phase 3: Update APML (Future)

**Update Phase 1 prompt:**
- Output to: `amino_acids/translations/S0001.json` (not `translations.json`)
- Include per-seed metadata

**Update Phase 3 prompt:**
- Output to: `amino_acids/legos/S0001.json` (not `LEGO_BREAKDOWNS_COMPLETE.json`)
- Include per-seed LEGO data

**Add course_metadata.json generation:**
- After Phase 0 or Phase 1
- Update after each phase completion

---

## Adapter Script Specification

### Input Files:
```
vfs/courses/spa_for_eng_30seeds/
├── translations.json
└── LEGO_BREAKDOWNS_COMPLETE.json
```

### Output Files:
```
vfs/courses/spa_for_eng_30seeds/
├── course_metadata.json                 ← NEW
├── translations.json                    ← KEEP (backward compat)
├── LEGO_BREAKDOWNS_COMPLETE.json       ← KEEP (backward compat)
└── amino_acids/                         ← NEW
    ├── translations/
    │   ├── S0001.json
    │   ├── S0002.json
    │   └── ... (30 files)
    ├── legos/
    │   ├── S0001.json
    │   ├── S0002.json
    │   └── ... (30 files)
    └── legos_deduplicated/
        ├── S0001.json
        ├── S0002.json
        └── ... (30 files, same as legos/ for now)
```

### course_metadata.json Generation Logic:
```javascript
{
  course_code: directoryName,
  source_language: parseFromCode(knownLang),
  target_language: parseFromCode(targetLang),
  total_seeds: Object.keys(translations).length,
  version: "1.0",
  created_at: fs.stat(coursePath).birthtime.toISOString(),
  status: "ready_for_phase_4",  // Has Phase 1 + Phase 3
  amino_acids: {
    translations: translationCount,
    legos: legoCount,
    legos_deduplicated: legoCount,  // Same as legos for now
    baskets: 0,
    introductions: 0
  },
  phases_completed: ["1", "3"],
  seed_pairs: translationCount,
  lego_pairs: legoCount,
  lego_baskets: 0
}
```

### amino_acids/translations/S0001.json Format:
```javascript
{
  seed_id: "S0001",
  canonical_seed: null,  // We don't have this yet
  target_phrase: translations["S0001"][0],
  known_phrase: translations["S0001"][1],
  translation_metadata: {
    created_at: new Date().toISOString(),
    phase: "1",
    version: "1.0"
  }
}
```

### amino_acids/legos/S0001.json Format:
```javascript
{
  seed_id: "S0001",
  original_target: lego_breakdown.original_target,
  original_known: lego_breakdown.original_known,
  lego_pairs: lego_breakdown.lego_pairs,
  feeder_pairs: lego_breakdown.feeder_pairs,
  componentization: lego_breakdown.componentization,
  lego_metadata: {
    created_at: new Date().toISOString(),
    phase: "3",
    version: "1.0"
  }
}
```

---

## Next Steps

1. **Create adapter script** (`scripts/convert-to-amino-acids.js`)
2. **Run adapter on all 4 courses**
3. **Test dashboard integration**
4. **Document new workflow** (generate → convert → visualize)
5. **Update APML** (Phase 2 task - future)

---

## Success Criteria

✅ Dashboard shows all 4 courses
✅ Course list displays correct stats (seed_pairs, lego_pairs)
✅ Course detail view loads translations
✅ Course detail view loads LEGO breakdowns
✅ Phase completion indicators work
✅ No console errors in browser/server

---

## File Locations Reference

**Dashboard Files:**
- Frontend: `/src/views/CourseBrowser.vue`
- API Service: `/src/services/api.js`
- Backend: `/automation_server.cjs` (lines 1509-1683)

**Course Files:**
- Current: `/vfs/courses/{course_code}/translations.json`
- Current: `/vfs/courses/{course_code}/LEGO_BREAKDOWNS_COMPLETE.json`
- Needed: `/vfs/courses/{course_code}/course_metadata.json`
- Needed: `/vfs/courses/{course_code}/amino_acids/...`

**Scripts:**
- To create: `/scripts/convert-to-amino-acids.js`
- Existing: `/scripts/compile-apml-registry.cjs`

---

**Priority:** 🔴 **HIGH** - Dashboard is unusable without this fix
**Effort:** ⏱️ **MEDIUM** - Adapter script ~2-3 hours
**Impact:** ✅ **HIGH** - Enables full dashboard visualization
