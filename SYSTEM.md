# SSi Dashboard v7 - System Documentation

**Last Updated:** 2025-11-20
**Status:** Working ✅
**Architecture:** Microservices + Canonical Content

---

## Core Principle: Folder-Based Course Discovery

**SIMPLE RULE:** Any folder in `public/vfs/courses/` is a course.

The system automatically discovers courses by scanning `public/vfs/courses/` and checking for data files.

---

## Data Formats

### 1. Seed Pairs (`seed_pairs.json`)

**Location:** `public/vfs/courses/{course_code}/seed_pairs.json`

**Format:**
```json
{
  "version": "7.7",
  "translations": {
    "S0001": ["target_sentence", "known_sentence"],
    "S0002": ["target_sentence", "known_sentence"],
    ...
  }
}
```

**Example (Chinese):**
```json
{
  "version": "7.7",
  "translations": {
    "S0001": ["我现在想和你说中文", "I want to speak Chinese with you now."],
    "S0002": ["我在试着学习", "I'm trying to learn."]
  }
}
```

---

### 2. LEGO Pairs (`lego_pairs.json`)

**Location:** `public/vfs/courses/{course_code}/lego_pairs.json`

**Two formats supported:**

#### v5.0.1 Format (CLI extraction output)
```json
{
  "version": "5.0.1",
  "methodology": "Phase 3 LEGO + Pattern Extraction v5.0.1 - COMPLETE TILING",
  "extraction_date": "2025-11-06",
  "language_pair": "zho_for_eng",
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": ["我现在想和你说中文", "I want to speak Chinese with you now."],
      "legos": [
        {
          "id": "S0001L01",
          "type": "A",        // A = Atomic, M = Molecular
          "target": "我",
          "known": "I",
          "new": true         // true = first appearance, false = reference to earlier LEGO
        },
        {
          "id": "S0001L04",
          "type": "M",
          "target": "和你",
          "known": "with you",
          "new": true,
          "components": [     // Molecular LEGOs have components
            ["和", "with"],
            ["你", "you"]
          ]
        }
      ],
      "patterns": ["P01_want_to_verb"],
      "cumulative_legos": 6
    }
  ]
}
```

#### v7.7 Format (Array-based)
```json
{
  "version": "7.7",
  "seeds": [
    ["S0001", ["target", "known"], [
      ["S0001L01", "B", "target", "known"],
      ["S0001L02", "C", "target", "known", [["part1", "literal"], ["part2", "literal"]]]
    ]]
  ]
}
```

**Key Differences:**
- v5.0.1: Objects with `new: true/false` to track first appearances
- v7.7: Arrays with all LEGOs inline (no `new` flag)

---

### 3. Baskets (Practice Phrases)

**Location:** `public/baskets/lego_baskets_${seedId}.json`

**Example:** `public/baskets/lego_baskets_s0010.json`

**Format:**
```json
{
  "version": "curated_v6_molecular_lego",
  "seed": "S0010",
  "seed_pair": {
    "known": "I'm not sure if I can remember the whole sentence.",
    "target": "No estoy seguro si puedo recordar toda la oración."
  },
  "patterns_introduced": "P06, P18",
  "cumulative_patterns": ["P01", "P02", "P03", "P04", "P05", "P06", "P18"],
  "cumulative_legos": 31,

  "S0010L01": {
    "lego": ["not", "No"],
    "type": "B",
    "available_legos": 26,
    "practice_phrases": [
      ["not", "No", null, 1],
      ["not now", "No ahora", null, 2],
      ["I'm not trying", "No estoy intentando", "P02", 2],
      ...
    ]
  },

  "S0010L02": {
    "lego": ["I'm not sure", "No estoy seguro"],
    "type": "C",
    "practice_phrases": [...]
  }
}
```

**Practice Phrase Format:**
```javascript
["known_phrase", "target_phrase", "pattern_id", lego_count]
```

---

## Pipeline Architecture

### Active Workflow: Phase 1 → 3 (includes 6) → 5 → 7 → 8

```
Canonical Content (3 inputs)
    ├── canonical_seeds.json (668 seeds)
    ├── eng_encouragements.json
    └── welcomes.json
         ↓
Phase 1: Translation (Port 3457)
    ├── Substitutes {target} placeholders
    ├── Translates 668 seeds to target language
    └── Outputs: seed_pairs.json
         ↓
Phase 3: LEGO Extraction + Introductions (Port 3458)
    ├── Extracts LEGO components
    ├── Generates introduction presentations
    └── Outputs: lego_pairs.json + introductions.json
         ↓
Phase 5: Basket Generation (Port 3459)
    ├── Generates practice phrases
    └── Outputs: lego_baskets.json
         ↓
Phase 7: Manifest Compilation (Port 3462)
    ├── Compiles all phase outputs
    ├── Generates deterministic UUIDs
    ├── Creates placeholders for Phase 8
    └── Outputs: course_manifest.json
         ↓
Phase 8: Audio/TTS Generation (Port 3463)
    ├── Reads manifest samples object
    ├── Generates ~110,000 audio files
    ├── Uploads to S3
    └── Optionally populates duration fields
```

### Phase Server Ports

| Phase | Server | Port | Status |
|-------|--------|------|--------|
| 1 | Translation (includes Phase 2 LUT) | 3457 | ✅ Active |
| 3 | LEGO Extraction (includes Phase 6) | 3458 | ✅ Active |
| 5 | Basket Generation | 3459 | ✅ Active |
| 7 | Manifest Compilation | 3462 | ✅ Active |
| 8 | Audio/TTS Generation | 3463 | 🔧 In Development (Kai) |

**Note**: Phase 6 (introductions) is integrated into Phase 3 server and runs automatically after LEGO extraction (<1s overhead).

### Canonical Content System

**Location**: `public/vfs/canonical/`

**3-Parameter Input Model**:
1. **Target language code** (e.g., "spa", "fra", "cmn")
2. **Known language code** (e.g., "eng")
3. **Canonical content** (seeds, encouragements, welcomes)

**Benefits**:
- Single source of truth for curriculum (668 seeds)
- Language-agnostic pedagogy
- Easy to improve: Update 668 seeds once → regenerate all courses
- Consistent learning progression across all languages

**Files**:
- `canonical_seeds.json` - 668 pedagogically-ordered seeds with `{target}` placeholders
- `eng_encouragements.json` - 26 pooled encouragements (English)
- `welcomes.json` - Course introduction template

**See**: `public/docs/phase_intelligence/CANONICAL_CONTENT.md` for details.

---

## System Architecture

### Course Discovery Flow

1. **Build time:** `generate-course-manifest.js` scans `public/vfs/courses/`
2. Creates `public/vfs/courses-manifest.json` with all course metadata
3. **Runtime:** Frontend loads manifest from static file or API

### Data Loading Flow

```
User selects course
    ↓
Frontend calls api.course.list()
    ↓
├─ Try API server (/api/courses)
│  └─ Automation server reads public/vfs/courses/ directories
└─ Fallback to static manifest (/vfs/courses-manifest.json)
    ↓
User selects seed
    ↓
Frontend calls api.course.getBasket(courseCode, seedId)
    ↓
├─ Try API server (/api/courses/{courseCode}/baskets/{seedId})
└─ Fallback to static file (/baskets/lego_baskets_${seedId}.json)
```

### Critical Files

**Frontend:**
- `src/services/api.js` - API client with static file fallbacks
- `src/components/LegoBasketViewer.vue` - Main viewer component
- `src/services/courseCache.js` - IndexedDB caching layer

**Backend:**
- `automation_server.cjs` - Express API server (port 3456)
- `generate-course-manifest.js` - Build-time course scanner

**Data:**
- `public/vfs/courses/` - Course data (git-tracked)
- `public/baskets/` - Practice baskets (git-tracked)
- `public/vfs/courses-manifest.json` - Generated manifest

---

## Course Code Patterns

Supported patterns:
- `xxx_for_yyy` (e.g., `spa_for_eng`, `zho_for_eng`)
- `xxx_for_yyy_NNseeds` (e.g., `ita_for_eng_10seeds`)

Language codes (ISO 639-3):
- `spa` = Spanish
- `zho` = Chinese (Mandarin)
- `ita` = Italian
- `fra` = French
- `gle` = Irish
- `mkd` = Macedonian

---

## API Endpoints

### List Courses
```
GET /api/courses
Returns: { courses: [...] }
```

### Get Course Data
```
GET /api/courses/{courseCode}
Returns: { course, translations, legos, lego_breakdowns, baskets }
```

### Get Basket
```
GET /api/courses/{courseCode}/baskets/{seedId}
Returns: basket JSON
```

---

## Static File Fallbacks

All API endpoints have fallback to static files for offline/serverless operation:

| Endpoint | Fallback Path |
|----------|---------------|
| `/api/courses` | `/vfs/courses-manifest.json` |
| `/api/courses/{code}` | `/vfs/courses/{code}/seed_pairs.json`<br>`/vfs/courses/{code}/lego_pairs.json` |
| `/api/courses/{code}/baskets/{seed}` | `/baskets/lego_baskets_{seed}.json` |

---

## Adding a New Course

1. Create folder: `public/vfs/courses/{course_code}/`
2. Add `seed_pairs.json` (see format above)
3. Add `lego_pairs.json` (v5.0.1 or v7.7 format)
4. Run: `node generate-course-manifest.js`
5. Commit and push

**That's it!** The course will appear in the dashboard automatically.

---

## Current Courses (2025-11-06)

| Code | Language | Seeds | LEGOs | Format | Status |
|------|----------|-------|-------|--------|--------|
| `zho_for_eng` | Chinese | 668 | 254 | v5.0.1 | ✅ Working |
| `spa_for_eng` | Spanish | 668 | 278 | v5.0.1 | ✅ Working |
| `ita_for_eng_668seeds` | Italian | 668 | 668 | v7.7 | ✅ Working |
| `ita_for_eng_10seeds` | Italian | 10 | 63 | v7.7 | ✅ Working |

---

## Troubleshooting

### Course not showing up?
1. Check folder exists in `public/vfs/courses/`
2. Check `seed_pairs.json` exists and is valid JSON
3. Run `node generate-course-manifest.js`
4. Check browser console for errors

### Baskets not loading?
1. Check basket exists at `public/baskets/lego_baskets_${seedId}.json`
2. Check seedId is lowercase (e.g., `s0010` not `S0010`)
3. Check basket JSON is valid

### 500 errors from API?
1. Check automation server is running (`pm2 list`)
2. Check `public/vfs/courses/` path exists
3. Check file formats match expected schema

---

## Key Design Decisions

1. **Folder = Course:** No configuration needed, just add a folder
2. **Static file fallbacks:** Works without backend server
3. **Format flexibility:** Supports both v5.0.1 and v7.7 LEGO formats
4. **Git-tracked data:** All courses in public/ are version controlled
5. **Build-time manifest:** Fast course discovery without scanning filesystem

---

## Next Steps (Future)

- [ ] Support basket files inside course folders
- [ ] Auto-generate missing baskets
- [ ] Support more LEGO formats
- [ ] Add basket validation
- [ ] Create course upload UI
