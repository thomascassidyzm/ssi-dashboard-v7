# Course Production Suite - Quick Reference Card

**Essential Information at a Glance**

---

## 📁 All Documents

Located in: `/Users/tomcassidy/`

1. **PRODUCTION_SUITE_INDEX.md** ← START HERE (navigation guide)
2. **PRODUCTION_SUITE_SUMMARY.md** (executive overview, 20 pages)
3. **COURSE_PRODUCTION_SUITE_ARCHITECTURE.md** (complete spec, 60+ pages)
4. **course-production-suite-visual.html** (visual guide, open in browser)
5. **PRODUCTION_SUITE_IMPLEMENTATION_GUIDE.md** (developer guide, 40+ pages)
6. **PRODUCTION_SUITE_DIAGRAMS.md** (14 Mermaid diagrams)

---

## 🎯 The Four Tools

### 1. Script Viewer (QA Tool)
**Route:** `/production/:courseCode/script`
**Purpose:** Review entire course, flag items for correction/regeneration
**Key Features:** Hierarchical view, inline playback, flagging, filtering

### 2. Audio Pipeline
**Route:** `/production/:courseCode/audio-pipeline`
**Purpose:** TTS batch generation and monitoring
**Key Features:** Queue management, real-time progress, retry logic

### 3. Recording Studio
**Route:** `/production/:courseCode/recording`
**Purpose:** Manual voice recording for exotic languages
**Key Features:** Autocue, phrase grouping, slow-mode, S3 upload

### 4. Samples Browser
**Route:** `/production/:courseCode/samples`
**Purpose:** Quality review all audio (TTS + human)
**Key Features:** Grid/list view, compare mode, approve/reject

---

## 🗄️ Single Source of Truth (S3)

### Structure
```
courses/{code}/
  ├── course_manifest.json      (Phase 7 output - READ ONLY)
  ├── sample_flags.json          (QA decisions - READ/WRITE)
  └── audio_metadata.json        (generated audio info)

ssiborg-assets/mastered/
  └── {uuid}.mp3                 (all audio files)
```

### Bucket
**Name:** `popty-bach-lfs`
**Region:** `eu-west-1`

---

## 🔄 Status Lifecycle

```
pending → flagged_regen_tts → in_pipeline → tts_complete → needs_review → approved → complete
            OR
pending → flagged_human_needed → in_recording → recorded → needs_review → approved → complete
```

---

## 🌐 Key API Endpoints

```
# Core
GET  /api/production/:courseCode/manifest
GET  /api/production/:courseCode/flags
POST /api/production/:courseCode/flags/update

# Script Viewer
GET  /api/production/:courseCode/script/seeds
GET  /api/production/:courseCode/script/seeds/:seedId

# Audio Pipeline
GET  /api/production/:courseCode/audio-pipeline/status
POST /api/production/:courseCode/audio-pipeline/queue/add

# Recording Studio
GET  /api/production/:courseCode/recording/queues
POST /api/production/:courseCode/recording/upload

# Samples Browser
GET  /api/production/:courseCode/samples/list
POST /api/production/:courseCode/samples/:uuid/approve

# Real-Time
WS   /api/production/websocket
```

---

## 💻 Tech Stack

**Frontend:** Vue 3, Vite, Tailwind CSS 4, Pinia, Socket.io
**Backend:** Express.js, AWS SDK v3, Socket.io
**Infrastructure:** S3, Vercel, Railway, PM2

---

## 🎨 Design Colors

- Background: `#0f172a` (deep slate)
- Primary: `#10b981` (emerald)
- Warning: `#f59e0b` (amber)
- Danger: `#ef4444` (red)
- Info: `#06b6d4` (cyan)

---

## 📅 Implementation Timeline

- **Week 1-2:** Infrastructure (Pinia, WebSocket, API)
- **Week 3-4:** Script Viewer
- **Week 5:** Audio Pipeline
- **Week 6-7:** Recording Studio
- **Week 8:** Samples Browser
- **Week 9:** Mission Control Dashboard
- **Week 10:** Polish & Launch

---

## 🔍 Quick Searches

**Need to find:**
- "sample_flags.json" → Architecture doc → Shared Data Structures
- API endpoint → Implementation guide → Phase 1
- Component code → Implementation guide → Phase 2-5
- Visual wireframe → Open `course-production-suite-visual.html`
- Data flow diagram → Diagrams doc → #2
- Status state machine → Diagrams doc → #3

---

## 🚀 Getting Started

1. Read `PRODUCTION_SUITE_INDEX.md`
2. Choose your role's reading order
3. Review relevant documents
4. Check out existing codebase: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/`
5. Start implementation (Phase 1)

---

**Need more info?** See `PRODUCTION_SUITE_INDEX.md` for complete navigation guide.

*v1.0.0 | 2025-12-04*
