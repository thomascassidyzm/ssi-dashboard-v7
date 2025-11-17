# SSi Dashboard Architecture Audit & Cleanup Plan

**Goal:** Everyone everywhere sees the same files from GitHub. Local automation only for writing/generating, not for viewing.

---

## Current Architecture Issues

### ✅ GOOD - Already Using Static Files (GitHub SSoT)

These components correctly load from Vercel's static files:

1. **CourseEditor.vue** (lines 901, 921, 942)
   - ✅ `fetch('/vfs/courses/${courseCode}/lego_baskets.json')`
   - ✅ `fetch('/vfs/courses/${courseCode}/introductions.json')`
   - ✅ `fetch('/vfs/courses/${courseCode}/lego_pairs.json')`

2. **api.js course.get()** (lines 228-251)
   - ✅ `fetch('/vfs/courses/${courseCode}/seed_pairs.json')`
   - ✅ `fetch('/vfs/courses/${courseCode}/lego_pairs.json')`
   - ✅ `fetch('/vfs/courses/${courseCode}/lego_baskets.json')`
   - ✅ `fetch('/vfs/courses/${courseCode}/introductions.json')`

3. **api.js course.list()** (line 90)
   - ✅ `fetch('/vfs/courses-manifest.json')`

4. **api.js course.getBasket()** (line 456)
   - ✅ `fetch('/vfs/courses/${courseCode}/lego_baskets.json')`

---

### ⚠️ NEEDS REVIEW - Using Local Automation Server

These need localhost:3456 ONLY for **write operations** (generating/compiling):

#### Write Operations (Local automation required - OK)

1. **TrainingPhase.vue** - Phase pipeline execution
   - Triggers Claude Code agents via osascript
   - Needs local automation server ✓

2. **CourseEditor.vue**
   - Line 1015: `POST /api/courses/${courseCode}/baskets/generate` - Basket generation ✓
   - Line 1382: `PUT /api/courses/${courseCode}/breakdowns/${seedId}` - LEGO editing ✓

3. **CourseCompilation.vue**
   - Line 457: `POST /api/courses/${courseCode}/compile` - Compilation ✓
   - Line 498: `GET /api/audio/check-s3` - S3 audio check ✓
   - Line 538: `POST /api/audio/generate-missing` - Audio generation ✓
   - Line 574: `GET /api/audio/generation-status/${jobId}` - Status polling ✓
   - Line 625: `POST /api/courses/${courseCode}/deploy` - Deployment ✓

4. **AudioGeneration.vue**
   - Lines 588-730: Audio generation workflow ✓

5. **LegoVisualizer.vue**
   - Line 484: Likely saving LEGO edits ✓

#### Read Operations (Should use static files - NEEDS FIX)

1. **Skills.vue** (lines 274, 302, 316)
   - ❌ `fetch('http://localhost:3456/api/skills')` - HARDCODED localhost
   - ❌ Should load from `/vfs/skills/` or remove feature if unused

2. **AudioGeneration.vue** (lines 588, 609)
   - ❌ `fetch('/api/courses/list')` - Could use `/vfs/courses-manifest.json`
   - ❌ `fetch('/api/courses/${courseCode}/manifest')` - What manifest is this?

3. **qualityApi.js** (line 4)
   - ❌ Quality system - needs review (might be unused?)

---

## Clean Architecture Design

```
┌─────────────────────────────────────────────────────────────┐
│                         VIEWING LAYER                        │
│                   (Everyone sees same data)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User → Vercel → /public/vfs/courses/                       │
│                  /public/vfs/courses-manifest.json           │
│                                                              │
│  - Course files (seed_pairs, lego_pairs, etc.)              │
│  - 100% static files from GitHub                            │
│  - No local server needed                                   │
│  - Tom and Kai see identical data                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        EDITING LAYER                         │
│                 (Local automation for writing)               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Developer → automation_server.cjs (localhost:3456)          │
│            → osascript → Claude Code agents                  │
│            → Writes to local /public/vfs/                    │
│            → git commit + push                               │
│            → Vercel auto-deploys                             │
│            → Now everyone sees the changes                   │
│                                                              │
│  Write Operations:                                           │
│  - Phase pipeline execution (generate LEGOs, baskets)       │
│  - LEGO breakdown editing                                    │
│  - Audio generation                                          │
│  - Course compilation                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Cleanup Tasks

### Priority 1: Fix Read-Only Pages

1. ✅ **Skills.vue** - DEPRECATED (feature not in use)
   - Route commented out in router/index.js
   - File renamed to Skills.vue.deprecated

2. **AudioGeneration.vue** - Use static manifest
   - Line 588: Replace with `fetch('/vfs/courses-manifest.json')`
   - Line 609: Investigate what manifest this is

3. **qualityApi.js** - Determine if quality system is used
   - If unused: Remove
   - If used: Document when local server is required

### Priority 2: Documentation

1. Update README with clear architecture
2. Document when local automation server is needed:
   - ✅ Running Phase pipelines
   - ✅ Editing LEGO breakdowns
   - ✅ Generating audio
   - ✅ Compiling courses
   - ❌ Viewing course data
   - ❌ Browsing translations
   - ❌ Reviewing baskets

### Priority 3: Developer Experience

1. Add clear error messages:
   - "This action requires local automation server (port 3456)"
   - "This is a write operation - make sure automation_server.cjs is running"

2. Add visual indicator in UI:
   - Green dot = automation server connected (can write)
   - Gray dot = static mode only (can view)

3. Clarify .env configuration:
   - `VITE_API_BASE_URL` only needed for write operations
   - Viewing works without any env vars

---

## Key Principle

**"Reads are free, writes are local"**

- Reading course data → Static files from Vercel (always works)
- Writing course data → Local automation server (requires setup)

This ensures:
- ✅ Tom can view Kai's work instantly after push
- ✅ Kai can view Tom's work instantly after push
- ✅ No ngrok tunnels needed for viewing
- ✅ No PM2/automation server needed for viewing
- ✅ Clean separation of concerns
