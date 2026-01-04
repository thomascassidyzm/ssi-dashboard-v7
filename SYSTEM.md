# SSi Dashboard v7 - System Documentation

**Last Updated:** 2026-01-04
**Status:** Working
**Architecture:** Microservices + Supabase Audio Pipeline + S3 Storage
**APML Version:** v13
**Pipeline Version:** v2.0 (Supabase-backed)

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

### Active Workflow: Phase 1 → 3 → 8 → 9

```
Canonical Content (3 inputs)
    ├── canonical_seeds.json (668 seeds)
    ├── eng_encouragements.json
    └── welcomes.json
         ↓
Phase 1: Translation + LEGO Extraction (Port 3457)
    ├── Substitutes {target} placeholders
    ├── Translates 668 seeds to target language
    ├── Extracts LEGO components
    └── Outputs: draft_lego_pairs.json (may have conflicts)
         ↓
Phase 2: Conflict Resolution (Port 3458)
    ├── Resolves LEGO conflicts
    └── Outputs: lego_pairs.json (SSoT)
         ↓
Phase 3: Basket Generation (Port 3459)
    ├── Generates practice phrases with LEGO Debut cycle
    └── Outputs: lego_baskets.json
         ↓
Phase 8: Audio Generation (Port 3465) ← NEW: Supabase-backed
    ├── Reads lego_baskets.json (NOT manifest)
    ├── For each unique (text, lang, role):
    │   ├── Generate deterministic UUID
    │   ├── Check Supabase - if exists, SKIP
    │   ├── Generate TTS (Azure/ElevenLabs)
    │   └── Upload to S3, insert into Supabase
    └── Outputs: audio files to S3, records to Supabase
         ↓
Phase 9: Manifest Compilation (Port 3466) ← NEW: Supabase-backed
    ├── Queries Supabase for all audio samples
    ├── Builds manifest by looking up UUIDs
    ├── Validates 100% audio coverage
    └── Outputs: course_manifest.json

Production API (Port 3470)
    ├── QA workflow (sample flagging)
    ├── WebSocket for real-time updates
    └── Course production status
```

### Phase Server Ports (Updated)

| Port | Phase | Description | Status |
|------|-------|-------------|--------|
| 3456 | - | Orchestrator | ✅ Active |
| 3457 | 1 | Translation + LEGO Extraction | ✅ Active |
| 3458 | 2 | Conflict Resolution | ✅ Active |
| 3459 | 3 | Basket Generation | ✅ Active |
| 3464 | - | Legacy Manifest (deprecated) | ⚠️ Deprecated |
| **3465** | **8** | **Audio Generator (Supabase)** | ✅ Active |
| **3466** | **9** | **Manifest Compiler (Supabase)** | ✅ Active |
| **3470** | **-** | **Production API (QA + WebSocket)** | ✅ Active |

### Architecture Change Summary

**Old Architecture (Deprecated):**
```
Phase 7 (Manifest) → Phase 8 (Audio) → MAR (JSON files)
```
- Manifest compiled first with UUIDs
- Audio generated after manifest
- MAR was JSON file-based (audio_index.json)
- Vulnerable to data loss, no proper database

**New Architecture (Current - v2.0):**
```
lego_baskets.json → Phase 8 (Audio Gen) → Supabase + S3 → Phase 9 (Manifest)
```
- Audio generated directly from baskets
- Supabase is source of truth for audio samples
- Manifest compiled last by looking up UUIDs from Supabase
- Proper database with RLS, realtime, audit trails

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

## Supabase Integration

### Overview

Supabase serves as the **Master Audio Registry (MAR)** and QA workflow database. It replaces the previous JSON file-based MAR system.

### Environment Variables

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_xxxxx
```

### Database Schema (v13)

```
Tables:
├── courses                # Course metadata with voice configuration
│   ├── code               # PRIMARY KEY - e.g., "spa_for_eng"
│   ├── display_name       # Human-readable name
│   ├── known_lang         # ISO 639-3 code (e.g., "eng")
│   ├── target_lang        # ISO 639-3 code (e.g., "spa")
│   ├── voice_config       # JSONB - voice assignments per role
│   ├── course_type        # "official" or "community"
│   ├── status             # "draft", "beta", "released"
│   └── created_at         # Timestamp
│
├── course_audio           # Audio owned by courses (flat, no joins)
│   ├── id                 # UUID
│   ├── course_code        # FK to courses.code
│   ├── text               # Original spoken text
│   ├── text_normalized    # Lowercased/trimmed for matching
│   ├── language           # ISO 639-3 code
│   ├── role               # "known", "target1", "target2", "presentation"
│   ├── voice_id           # e.g., "azure_es-ES-ElviraNeural"
│   ├── origin             # "tts" (regenerable) or "human" (precious)
│   ├── s3_key             # Path in S3 bucket ({uuid}.mp3)
│   ├── duration_ms        # Audio duration
│   └── created_at         # Timestamp
│   UNIQUE(course_code, text_normalized, language, role)
│
├── shared_audio           # Audio shared across courses
│   ├── id                 # UUID
│   ├── text               # Spoken text
│   ├── text_normalized    # Lowercased/trimmed
│   ├── language           # ISO 639-3 code
│   ├── audio_type         # "encouragement" or "instruction"
│   ├── voice_id           # Voice identifier
│   ├── origin             # "tts" or "human"
│   ├── s3_key             # Path in S3 ({uuid}.mp3)
│   └── created_at         # Timestamp
│   UNIQUE(text_normalized, language, audio_type)
│
└── sample_flags           # QA workflow state
    ├── uuid               # FK to course_audio or shared_audio
    ├── status             # pending, flagged, approved, etc.
    ├── notes              # Reviewer notes
    ├── flagged_by         # User email
    └── history            # Status change log

DEPRECATED (v12, removed in v13):
├── texts                  # REMOVED - over-engineered indirection
├── audio_files            # REMOVED - merged into course_audio
├── audio_samples          # LEGACY - don't use, 145k duplicated records
└── voices                 # REMOVED - replaced by course.voice_config JSONB
```

### Key Queries (v13)

**Check if audio exists:**
```sql
SELECT id, s3_key, voice_id, origin FROM course_audio
WHERE course_code = $1
  AND text_normalized = LOWER(TRIM($2))
  AND language = $3
  AND role = $4;
```

**Get all audio for course manifest:**
```sql
SELECT id, text, role, duration_ms, s3_key, origin
FROM course_audio
WHERE course_code = $1;
```

**Get course voice configuration:**
```sql
SELECT voice_config FROM courses WHERE code = $1;
-- Returns: {"known": "azure_en-GB-SoniaNeural", "target1": "azure_es-ES-ElviraNeural", ...}
```

**Flag sample for regeneration:**
```sql
UPDATE sample_flags
SET status = 'flagged_regen_tts', notes = $2, flagged_by = $3
WHERE uuid = $1;
```

### Services

- `services/phases/phase8-audio-supabase.cjs` - Audio generation with Supabase
- `services/phases/phase9-manifest-supabase.cjs` - Manifest compilation from Supabase
- `services/supabase-client.cjs` - Shared Supabase client configuration

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

### Progress Monitoring (v8.2.3)
```
GET /api/courses/{courseCode}/progress
Returns: {
  courseCode, currentPhase, overallStatus, startTime,
  phases: { 1: {...}, 3: {...}, ... },
  recentLogs: [...]
}
Dashboard polls this every 5s for live updates

POST /api/courses/{courseCode}/progress
Body: { phase, updates: {...}, logMessage }
Phase servers report progress here (e.g., every 10 seeds)
Orchestrator calculates ETA automatically
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
