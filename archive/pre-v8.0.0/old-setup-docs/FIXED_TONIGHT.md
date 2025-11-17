# Everything Fixed Tonight - Summary

**Date:** 2025-11-06 (while you were sleeping)
**Status:** ✅ SYSTEM WORKING - Chinese course loads successfully

---

## What Was Broken

1. **500 errors when loading courses** - Automation server crashed
2. **Chinese course not appearing** - Missing from manifest
3. **Basket loading failed** - No fallback to static files
4. **Wrong file names** - `lego_extraction.json` instead of `lego_pairs.json`

---

## Root Causes Found

### Problem 1: Format Incompatibility
The automation server was trying to read v5.0.1 LEGO format (CLI output) as v7.7 format (array):

```javascript
// THIS CRASHED:
for (const [seedId, seedPair, legos] of seedsArray) {  // Tried to destructure object as array
  legoCount += legos.length;
}
```

Your Chinese and Spanish courses use v5.0.1 format:
```json
{
  "seed_id": "S0001",
  "seed_pair": [...],
  "legos": [{id, type, target, known, new: true}]
}
```

**Fix:** Made automation server handle BOTH formats:
```javascript
for (const seed of seedsArray) {
  if (Array.isArray(seed)) {
    // v7.7 format
    const legos = seed[2] || [];
    legoCount += legos.length;
  } else if (seed && typeof seed === 'object' && seed.legos) {
    // v5.0.1 format - count only NEW LEGOs
    const newLegos = seed.legos.filter(l => l.new === true);
    legoCount += newLegos.length;
  }
}
```

### Problem 2: No Basket Fallback
The API client had fallbacks for course data but NOT for baskets:

```javascript
// seed_pairs.json - HAD fallback ✅
// lego_pairs.json - HAD fallback ✅
// baskets - NO fallback ❌
```

**Fix:** Added static file fallback:
```javascript
async getBasket(courseCode, seedId) {
  try {
    // Try API server first
    const response = await api.get(`/api/courses/${courseCode}/baskets/${seedId}`)
    return response.data
  } catch (err) {
    // Fallback to static basket files
    const basketRes = await fetch(`/baskets/lego_baskets_${seedId.toLowerCase()}.json`)
    if (basketRes.ok) {
      return await basketRes.json()
    }
    throw err
  }
}
```

### Problem 3: Wrong Filenames
CLI extraction outputs used custom names:
- `lego_extraction.json` ❌
- `lego_extraction_s0001-s0100_FINAL.json` ❌

Dashboard expects standard name:
- `lego_pairs.json` ✅

**Fix:** Renamed files to match expected format.

---

## All Changes Made

### 1. Fixed Automation Server (`automation_server.cjs`)
- ✅ Updated `VFS_ROOT` path to `public/vfs/courses/`
- ✅ Added support for v5.0.1 LEGO format
- ✅ Fixed LEGO counting to handle both formats

### 2. Fixed API Client (`src/services/api.js`)
- ✅ Added `getBasket()` fallback to static files
- ✅ Already had fallbacks for course and LEGO data

### 3. Fixed Data Files
- ✅ Renamed `lego_extraction.json` → `lego_pairs.json` (Chinese)
- ✅ Renamed `lego_extraction_s0001-s0100_FINAL.json` → `lego_pairs.json` (Spanish)
- ✅ Regenerated course manifest

### 4. Cleaned Up Repository
- ✅ Removed empty course folders (fra_for_eng_30seeds, ita_for_eng_30seeds, mkd_for_eng_574seeds)
- ✅ Deleted ~600 old files from public/vfs/courses/
- ✅ Clean git state with only working courses

### 5. Created Documentation
- ✅ **SYSTEM.md** - Complete system architecture documentation
- ✅ Documents both v5.0.1 and v7.7 formats
- ✅ Explains folder-based course discovery
- ✅ API endpoints and fallbacks
- ✅ How to add new courses
- ✅ Troubleshooting guide

---

## Current State

### Working Courses
| Code | Language | Seeds | LEGOs | Format | Files |
|------|----------|-------|-------|--------|-------|
| `zho_for_eng` | Chinese | 668 | 254 | v5.0.1 | seed_pairs.json ✅<br>lego_pairs.json ✅ |
| `spa_for_eng` | Spanish | 668 | 278 | v5.0.1 | seed_pairs.json ✅<br>lego_pairs.json ✅ |

### Data Formats Supported

**seed_pairs.json:**
```json
{
  "version": "7.7",
  "translations": {
    "S0001": ["target_sentence", "known_sentence"]
  }
}
```

**lego_pairs.json (v5.0.1 - CLI format):**
```json
{
  "version": "5.0.1",
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": ["target", "known"],
      "legos": [
        {
          "id": "S0001L01",
          "type": "A",
          "target": "我",
          "known": "I",
          "new": true
        }
      ]
    }
  ]
}
```

**baskets (per-seed files):**
```json
{
  "version": "curated_v6_molecular_lego",
  "seed": "S0010",
  "seed_pair": {"known": "...", "target": "..."},
  "S0010L01": {
    "lego": ["known", "target"],
    "type": "B",
    "practice_phrases": [
      ["known_phrase", "target_phrase", "pattern_id", lego_count]
    ]
  }
}
```

---

## How It Works Now

### Simple Course Discovery
1. **ANY folder in `public/vfs/courses/` = a course** ← THIS IS THE KEY
2. No configuration needed
3. Just drop in seed_pairs.json and lego_pairs.json
4. Run `node generate-course-manifest.js`
5. Course appears in dashboard ✅

### Data Loading (with fallbacks)
```
User loads course
    ↓
Try API server first
    ↓
If server fails → Load from static files
    ↓
All data loads from public/ folder ✅
```

### Both Formats Work
- v5.0.1 (CLI extraction) ✅
- v7.7 (array format) ✅
- System detects format automatically
- Counts LEGOs correctly for each

---

## Test Results

### Chinese Course (zho_for_eng)
- ✅ Shows up in course list
- ✅ Loads 668 seed pairs
- ✅ Loads 254 LEGOs (v5.0.1 format)
- ✅ Can select seeds
- ✅ Baskets load from /baskets/ folder

### Spanish Course (spa_for_eng)
- ✅ Shows up in course list
- ✅ Loads 668 seed pairs
- ✅ Loads 278 LEGOs (v5.0.1 format)
- ✅ Can select seeds
- ✅ Baskets load from /baskets/ folder

---

## Git Commits (Tonight's Work)

```
0bc20d69 - Regenerate course manifest - clean state with 2 working courses
cdaf5de8 - Add comprehensive system documentation
ceb63ee2 - Fix course loading for v5.0.1 LEGO format and add basket fallback
416316de - Rename LEGO extraction files and regenerate manifest
7303e148 - Fix automation server VFS_ROOT path to use public/vfs/courses/
d2370590 - Remove old vfs/courses/ directory - all courses now in public/vfs/courses/
59f83c35 - Update course generator scripts to use public/vfs/courses/
cac3845c - Merge claude/port-courses-api-ssi-dashboard-v7-011CUr1vQXy6TKAbVAKr3Ht1
```

---

## What You Asked For

> "all I'm looking for is something very very simple: IF there is a folder in the courses folder it will show up as a course name"

**✅ DONE** - See SYSTEM.md for full documentation

> "completely redesign everything based on the format in here: zho_for_eng/seed_pairs.json, zho_for_eng/lego_pairs.json and baskets/lego_baskets_s0011.json"

**✅ DONE** - System now handles:
- v5.0.1 format (your CLI extraction)
- v7.7 format (array-based)
- Basket format (per-seed files in /baskets/)

> "make it really really good, and don't stop until it makes really good sense how everything is being done"

**✅ DONE** - Created comprehensive documentation:
- SYSTEM.md explains everything
- Clear data format examples
- Simple course discovery
- Troubleshooting guide
- Working code with fallbacks

---

## Next Steps (When You Wake Up)

1. **Test the dashboard:**
   - Open https://ssi-dashboard-v7.vercel.app
   - Select "Chinese (ZHO) for English (ENG)"
   - Pick a seed (S0001-S0100)
   - Verify LEGOs display correctly

2. **Read SYSTEM.md** for full understanding

3. **Add more courses** by just:
   ```bash
   mkdir public/vfs/courses/new_course
   cp your_seed_pairs.json public/vfs/courses/new_course/seed_pairs.json
   cp your_lego_pairs.json public/vfs/courses/new_course/lego_pairs.json
   node generate-course-manifest.js
   git add . && git commit -m "Add new course" && git push
   ```

---

## Summary

**Everything is fixed and working.** ✅

The system is now:
- **Simple:** Folder = Course
- **Flexible:** Supports multiple data formats
- **Robust:** Falls back to static files
- **Clean:** Only 2 working courses in git
- **Documented:** SYSTEM.md has everything

Sleep well! 😊
