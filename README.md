# SSi Course Production Dashboard v14.0.0 (Popty)

**APML v14.0: Course Builder Consolidation**

## Overview

Course production dashboard for SSi language learning system. Content lives in Supabase, audio files in S3.

**v14.0 Features:**
- **Course Builder API**: Single endpoint replaces Phases 0-3
- **Methodology by example**: Agent learns from Welsh/Spanish patterns
- **Atomic validation**: Tiling, ZUT, vocabulary, phrase counts in one call
- **Database-first**: All content in Supabase, no JSON files
- **Audio pipeline**: Phase 8 (TTS) + Phase 9 (manifest) unchanged
- QA workflow with sample flagging and real-time status
- Support for TTS (primary) and human recordings (edge-case languages)

## Quick Start

```bash
npm install
cp .env.example .env   # Configure environment variables
npm run dev            # Frontend (port 5173)
```

Note: the `generate-manifest` script referenced in older docs (`node generate-course-manifest.js`)
no longer exists in this repo — `npm run build:local` will fail if it still calls it. The learner
app reads course content directly from Supabase; it does not consume a generated manifest file
(see "Where things live" in `CLAUDE.md`).

### Environment Variables

```bash
# .env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_xxxxx

# AWS S3 (for course files and audio storage)
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_REGION=eu-west-1
```

## Architecture

### Data Flow (APML v14.0)

```
┌─────────────────────────────────────────────────────────────────┐
│                    v14 COURSE PRODUCTION PIPELINE                │
└─────────────────────────────────────────────────────────────────┘

Content Creation: Course Builder API (Port 3471)
────────────────────────────────────────────────
Agent reads brief → POST /api/seed/complete for each seed → Supabase

┌──────────────────────────────────────┐
│  For each seed:                      │
│    1. Translate seed to target lang  │
│    2. Decompose into LEGOs (peda-    │
│       gogical order, not sentence)   │
│    3. Generate practice phrases      │
│    4. POST to /api/seed/complete     │
│                                      │
│  API validates atomically:           │
│    - Tiling (seed = LEGO assembly)   │
│    - ZUT conflicts                   │
│    - Vocabulary constraints          │
│    - Phrase progression              │
└──────────────────────────────────────┘
       ↓
   Supabase (course_seeds, course_legos, course_practice_phrases)

Audio Generation: Phase 8 (Port 3465)
─────────────────────────────────────
Supabase content → TTS generation → S3 upload → course_audio table

Manifest Compilation: Phase 9 (Port 3466) — NOT RUNNING, see Services table below
─────────────────────────────────────────
course_audio → 100% coverage check → course_manifest.json
(legacy: the learner app reads Supabase directly, not this manifest)
```

### S3 Storage

Only one bucket is live: `ssi-audio-stage` (eu-west-1). It holds both staging and mastered audio
(`S3_BUCKET` defaults to it everywhere in `services/`, and no systemd unit sets `S3_PROD_BUCKET`).
A second bucket, `ssiborg-assets`, is referenced as a "production" target in `s3-deploy-service.cjs`
and as a legacy fallback key prefix in `s3-production-service.cjs`, but nothing in the live
deployment points there — it's dead code paths, not a bucket in active use. Don't write new code
against it without confirming first.

```
S3 (ssi-audio-stage)
    └── courses/{course_code}/
         ├── lego_pairs.json      (legacy Phase 2 output — deprecated, see below)
         ├── lego_baskets.json    (legacy Phase 3 output — deprecated, see below)
         └── course_manifest.json (legacy Phase 9 output — not on the learner path)
    └── mastered/{uuid}.mp3       (all audio files, keyed from course_audio.s3_key)
```

### Supabase Schema

Course content (seeds, LEGOs, phrases, audio) lives in these tables — see "Course Builder" above:

```
├── course_seeds            # Seed sentences (known/target text)
├── course_legos            # LEGO decomposition units
├── course_practice_phrases # BUILD/USE practice phrases
└── course_audio            # Audio metadata (TTS + human), S3 keys
```

Plus voice/QA workflow tables:

```
├── voices               # TTS and human voice registry
├── course_audio_usage   # Which courses use which audio
├── sample_flags          # QA workflow state
├── recording_provenance  # Human recording metadata
└── courses               # Course configuration
```

**Deprecated (no longer exist in the live schema):** `audio_samples`, `texts`, `audio_files`.

### Pipeline (APML v14.0)

| Service | Port | Description |
|---------|------|-------------|
| **Course Builder** | **3471** | **Content creation (replaces Phase 1-3)** |
| Audio Generator | 3465 | TTS generation → Supabase + S3 |
| Manifest Compiler | 3466 | Compile manifest from Supabase — **not running**, legacy (see Services table) |
| Production API | 3470 | QA workflow + WebSocket |
| Orchestrator | 3456 | Proxy hub for all services |

**Course Builder handles:**
- Translation (seed → target language)
- LEGO extraction (pedagogical order)
- Conflict resolution (ZUT validation)
- Basket generation (phrase build-up)

**Deprecated (v13):** Phase 1 (3457), Phase 2 (3458), Phase 3 (3459)

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/courses` | List all courses (from S3) |
| GET | `/api/courses/:code/files/:filename` | Get course file (proxy to S3) |
| POST | `/api/courses/:code/outputs` | Save phase outputs to S3 |

#### Phase 8 Audio Generator (port 3465)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/generate` | Start audio generation |
| GET | `/status/:courseCode` | Check job status |
| GET | `/health` | Health check |

#### Phase 9 Manifest Compiler (port 3466) — legacy, no service running this port
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/compile` | Compile manifest from Supabase |
| GET | `/validate/:courseCode` | Validate audio coverage |
| GET | `/health` | Health check |

### Services (systemd)

PM2 is gone (2026-07-30 to 2026-08-07 migration, `docs/DECISIONS.md` "orchestrator off pm2, onto
systemd" — `ecosystem.config.cjs` no longer exists and pm2 manages nothing). Services run as
per-user systemd units, prefixed `popty-`, watched by a cron watchdog:

```bash
systemctl --user list-units 'popty-*'
systemctl --user status popty-orchestrator.service
```

| Service | Port | Description | Status |
|---------|------|-------------|--------|
| orchestrator | 3456 | Main proxy hub | Active |
| **course-builder** | **3471** | **Content creation API** | **Active** |
| phase8-audio | 3465 | Audio generation (Supabase) | Active |
| ~~phase9-manifest~~ | ~~3466~~ | ~~Manifest compilation (Supabase)~~ | **Not running** — no `popty-phase9-manifest` unit exists (verified via `systemctl --user list-units 'popty-*'`); the learner app reads Supabase directly and never consumes a compiled manifest |
| production-api | 3470 | QA workflow + WebSocket | Active |
| ~~phase1-translation~~ | ~~3457~~ | ~~Translation server~~ | Deprecated |
| ~~phase2-conflict~~ | ~~3458~~ | ~~Conflict resolution~~ | Deprecated |
| ~~phase3-baskets~~ | ~~3459~~ | ~~Basket generation~~ | Deprecated |

## Build & Deploy

```bash
npm run build
vercel --prod
```

## Data Sources

| Data | Owner | Location |
|------|-------|----------|
| Seeds | Course Builder | Supabase: `course_seeds` |
| LEGOs | Course Builder | Supabase: `course_legos` |
| Phrases | Course Builder | Supabase: `course_practice_phrases` |
| Audio metadata | Phase 8 | Supabase: `course_audio` |
| Audio files | Phase 8 | S3: `mastered/{uuid}.mp3` |
| Manifest | Phase 9 | S3: `courses/{code}/course_manifest.json` |
| QA flags | Production API | Supabase: `sample_flags` |

**Deprecated (JSON files):** `lego_pairs.json`, `lego_baskets.json` - data now in Supabase

## Tech Stack

- Vue 3 (Composition API)
- Vite
- Tailwind CSS 4
- Express (API)
- **Supabase** (audio registry, QA workflow)
- AWS SDK v3 (S3)

---

**Version:** 14.0.0
**APML:** v14.0 (Course Builder Consolidation)
**Pipeline:** v3.0 (Course Builder + Supabase)
**S3 Bucket:** ssi-audio-stage (eu-west-1)
**Date:** 2026-09-01 (facts re-verified against live code/systemd/DB schema this pass)
