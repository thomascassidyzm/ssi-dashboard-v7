# Dashboard API Update Plan
## Adapt Dashboard to Read New Course Format

**Date:** October 15, 2025
**Goal:** Make dashboard read from `translations.json` + `LEGO_BREAKDOWNS_COMPLETE.json` directly

---

## Current Course Format (Source of Truth)

```
vfs/courses/spa_for_eng_30seeds/
├── translations.json                    ← READ FROM THIS
└── LEGO_BREAKDOWNS_COMPLETE.json       ← READ FROM THIS
```

**This format is STAYING** - dashboard must adapt to it.

---

## API Endpoint Updates Needed

### 1. GET /api/courses (Line 1509)

**Current logic:**
- Looks for `amino_acids/` directory
- Counts files in subdirectories

**New logic:**
- Look for `translations.json` + `LEGO_BREAKDOWNS_COMPLETE.json`
- Parse these files to get counts
- Generate metadata on-the-fly

**Updated code:**
```javascript
app.get('/api/courses', async (req, res) => {
  try {
    const courseDirs = await fs.readdir(CONFIG.VFS_ROOT);
    const courses = [];

    for (const dir of courseDirs) {
      const coursePath = path.join(CONFIG.VFS_ROOT, dir);
      const stats = await fs.stat(coursePath);

      if (stats.isDirectory() && dir !== '.DS_Store') {
        const translationsPath = path.join(coursePath, 'translations.json');
        const legosPath = path.join(coursePath, 'LEGO_BREAKDOWNS_COMPLETE.json');

        // Check if this is a valid course (has both required files)
        if (await fs.pathExists(translationsPath) && await fs.pathExists(legosPath)) {
          // Parse course code
          const match = dir.match(/^([a-z]{3})_for_([a-z]{3})_(\d+)seeds$/);
          if (!match) continue;

          const targetLang = match[1];
          const knownLang = match[2];
          const seedCount = parseInt(match[3]);

          // Load translations to get actual count
          const translations = await fs.readJson(translationsPath);
          const translationCount = Object.keys(translations).length;

          // Load LEGO breakdowns to get count
          const legoData = await fs.readJson(legosPath);
          const legoCount = legoData.lego_breakdowns?.length || 0;

          courses.push({
            course_code: dir,
            source_language: knownLang.toUpperCase(),
            target_language: targetLang.toUpperCase(),
            total_seeds: seedCount,
            version: '1.0',
            created_at: (await fs.stat(coursePath)).birthtime.toISOString(),
            status: 'phase_3_complete',
            // Computed fields for dashboard
            seed_pairs: translationCount,
            lego_pairs: legoCount,
            lego_baskets: 0,
            phases_completed: ['1', '3'],
            // Backward compat (if needed)
            amino_acids: {
              translations: translationCount,
              legos: 0,
              legos_deduplicated: legoCount,
              baskets: 0,
              introductions: 0
            }
          });
        }
      }
    }

    res.json({ courses });
  } catch (error) {
    console.error('Error listing courses:', error);
    res.status(500).json({ error: 'Failed to list courses' });
  }
});
```

---

### 2. GET /api/courses/:courseCode (Line 1613)

**Current logic:**
- Loads from `amino_acids/translations/*.json` (one per seed)
- Loads from `amino_acids/legos_deduplicated/*.json`

**New logic:**
- Load `translations.json` and convert to array
- Load `LEGO_BREAKDOWNS_COMPLETE.json` and extract array

**Updated code:**
```javascript
app.get('/api/courses/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const coursePath = path.join(CONFIG.VFS_ROOT, courseCode);

    // Check if course exists
    if (!await fs.pathExists(coursePath)) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Load translations.json
    const translationsPath = path.join(coursePath, 'translations.json');
    const translationsData = await fs.readJson(translationsPath);

    // Convert to array format expected by frontend
    const translations = Object.entries(translationsData).map(([seed_id, [target_phrase, known_phrase]]) => ({
      seed_id,
      target_phrase,
      known_phrase,
      canonical_seed: null // We don't have this yet
    }));

    // Load LEGO_BREAKDOWNS_COMPLETE.json
    const legosPath = path.join(coursePath, 'LEGO_BREAKDOWNS_COMPLETE.json');
    const legoData = await fs.readJson(legosPath);

    // Extract lego_breakdowns array
    const legos = legoData.lego_breakdowns || [];

    // Generate course metadata
    const match = courseCode.match(/^([a-z]{3})_for_([a-z]{3})_(\d+)seeds$/);
    const course = {
      course_code: courseCode,
      source_language: match ? match[2].toUpperCase() : 'UNK',
      target_language: match ? match[1].toUpperCase() : 'UNK',
      total_seeds: match ? parseInt(match[3]) : 0,
      version: '1.0',
      created_at: (await fs.stat(coursePath)).birthtime.toISOString(),
      status: 'phase_3_complete',
      seed_pairs: translations.length,
      lego_pairs: legos.length,
      lego_baskets: 0,
      phases_completed: ['1', '3']
    };

    res.json({
      course,
      translations,
      legos,
      baskets: [] // Empty for now (Phase 5 not implemented)
    });
  } catch (error) {
    console.error('Error loading course:', error);
    res.status(500).json({ error: 'Failed to load course' });
  }
});
```

---

## Data Transformation

### translations.json → Dashboard Format

**Input:**
```json
{
  "S0001": ["Quiero hablar español contigo ahora.", "I want to speak Spanish with you now."],
  "S0002": ["Estoy intentando aprender.", "I'm trying to learn."]
}
```

**Output:**
```json
[
  {
    "seed_id": "S0001",
    "target_phrase": "Quiero hablar español contigo ahora.",
    "known_phrase": "I want to speak Spanish with you now.",
    "canonical_seed": null
  },
  {
    "seed_id": "S0002",
    "target_phrase": "Estoy intentando aprender.",
    "known_phrase": "I'm trying to learn.",
    "canonical_seed": null
  }
]
```

---

### LEGO_BREAKDOWNS_COMPLETE.json → Dashboard Format

**Input:**
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

**Output:**
```json
[
  {
    "seed_id": "S0001",
    "original_target": "Quiero hablar español contigo ahora.",
    "original_known": "I want to speak Spanish with you now.",
    "lego_pairs": [...],
    "feeder_pairs": [...],
    "componentization": [...]
  }
]
```

Just extract the `lego_breakdowns` array - already in correct format!

---

## Frontend Updates (If Needed)

### CourseBrowser.vue

**Current expectations:** ✅ ALREADY COMPATIBLE
- `course.course_code` ✅
- `course.total_seeds` ✅
- `course.seed_pairs` ✅
- `course.lego_pairs` ✅
- `course.status` ✅
- `course.phases_completed` ✅

**No changes needed** - API will provide these fields!

---

### Other Components

**Check these for compatibility:**
- `SeedVisualizer.vue`
- `LegoVisualizer.vue`
- `CourseEditor.vue`

**Expected data structures:**
- Translation object: `{ seed_id, target_phrase, known_phrase }`
- LEGO breakdown: `{ seed_id, lego_pairs, feeder_pairs, componentization }`

**Both MATCH our current format!** ✅

---

## Implementation Steps

1. ✅ Update `automation_server.cjs` GET /api/courses endpoint
2. ✅ Update `automation_server.cjs` GET /api/courses/:courseCode endpoint
3. ✅ Test with existing Spanish course
4. ✅ Verify all 4 courses load correctly
5. ✅ Test visualizers work with LEGO data

---

## Benefits of This Approach

1. **Single Source of Truth:** `translations.json` + `LEGO_BREAKDOWNS_COMPLETE.json`
2. **No Duplication:** Don't need to maintain two formats
3. **Cleaner Structure:** Flat file structure instead of nested directories
4. **Easier Updates:** Edit one file instead of 30 individual files
5. **Better for Git:** Single file changes = cleaner diffs
6. **Future-Proof:** When we remove "amino_acids" terminology, we're already there

---

## Testing Checklist

### API Tests:
- [ ] GET /api/courses returns all 4 courses
- [ ] Each course has correct seed_pairs count
- [ ] Each course has correct lego_pairs count
- [ ] GET /api/courses/spa_for_eng_30seeds returns course data
- [ ] translations array has 30 entries
- [ ] legos array has ~95 entries
- [ ] Each translation has seed_id, target_phrase, known_phrase
- [ ] Each LEGO has seed_id, lego_pairs, etc.

### Frontend Tests:
- [ ] Course browser shows all 4 courses
- [ ] Stats display correctly (30 seed_pairs, etc.)
- [ ] Clicking "View & Edit" loads course
- [ ] Translations display in UI
- [ ] LEGO breakdowns display in visualizer
- [ ] No console errors

---

## Migration Path

### Old Format (amino_acids):
```
DEPRECATED - will be removed
```

### New Format (current):
```
translations.json + LEGO_BREAKDOWNS_COMPLETE.json
THIS IS THE STANDARD
```

### Future Phases (5-6):
When we implement Phase 5 (baskets) and Phase 6 (introductions):
- Option A: Add to LEGO_BREAKDOWNS_COMPLETE.json as new top-level keys
- Option B: Create separate baskets.json and introductions.json files
- Decision: TBD based on file size

---

## Code to Update

**File:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/automation_server.cjs`

**Lines:**
- 1509-1607: GET /api/courses
- 1613-1683: GET /api/courses/:courseCode

**Changes:**
- Replace amino_acids directory scanning with direct JSON file loading
- Transform data to match frontend expectations
- Keep backward compatibility fields for now

---

**Priority:** 🔴 **HIGH**
**Effort:** ⏱️ **LOW** (1-2 hours max)
**Impact:** ✅ **HIGH** (Dashboard immediately functional)
