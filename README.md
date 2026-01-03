# SSi Course Production Dashboard v11.0.0

**APML v11.0: Audio-First Supabase Pipeline**

## Overview

Course production dashboard for SSi language learning system. Course content lives in S3, audio samples are managed via Supabase.

**v11.0 Features:**
- **Audio-first workflow**: Generate audio from lego_baskets BEFORE manifest compilation
- **Supabase** as Master Audio Registry (MAR) - source of truth for audio samples
- **Deterministic UUID**: hash(voice_id|text|lang|role|cadence) for cross-course deduplication
- S3 for course data and audio file storage
- Manifest compiled LAST after all audio exists (Phase 9)
- QA workflow with sample flagging and real-time status
- LEGO Debut cycle in basket generation
- API proxy for course files (avoids CORS)
- Support for TTS (primary) and human recordings (edge-case languages)

## Quick Start

```bash
npm install
cp .env.example .env   # Configure environment variables
npm run dev            # Frontend (port 5173)
```

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

### Data Flow (APML v11.0)

```
┌─────────────────────────────────────────────────────────────────┐
│                    COURSE PRODUCTION PIPELINE                    │
└─────────────────────────────────────────────────────────────────┘

Phase 1-3: Content Generation
─────────────────────────────
seeds.json → Phase 1 (Translation) → Phase 3 (Baskets) → lego_baskets.json

Phase 8: Audio Generation (NEW)
───────────────────────────────
lego_baskets.json
       ↓
┌──────────────────────────────────────┐
│  For each unique (text, lang, role): │
│    1. UUID = hash(voice|text|...)    │
│    2. Check Supabase - exists? SKIP  │
│    3. Generate TTS (Azure/ElevenLabs)│
│    4. Upload to S3                   │
│    5. Insert into Supabase           │
└──────────────────────────────────────┘
       ↓
     Supabase audio_samples table

Phase 9: Manifest Compilation (NEW)
───────────────────────────────────
Supabase audio_samples
       ↓
┌──────────────────────────────────────┐
│  For each sample needed:             │
│    1. Query Supabase by text+role    │
│    2. Get UUID                       │
│    3. Build manifest entry           │
│                                      │
│  Validation: 100% audio coverage     │
│    YES → write course_manifest.json  │
│    NO  → fail with missing list      │
└──────────────────────────────────────┘
       ↓
   course_manifest.json
```

### S3 Storage

```
S3 (ssi-audio-stage)
    └── courses/{course_code}/
         ├── lego_pairs.json      (Phase 2 output - SSoT)
         ├── lego_baskets.json    (Phase 3 output - SSoT)
         └── course_manifest.json (Phase 9 output)

S3 (ssiborg-assets)
    └── mastered/{uuid}.mp3       (all audio files)
```

### Supabase Schema

```
Tables:
├── voices              # TTS and human voice registry
├── audio_samples       # Master Audio Registry (MAR)
├── course_audio_usage  # Which courses use which audio
├── sample_flags        # QA workflow state
├── recording_provenance # Human recording metadata
└── courses             # Course configuration
```

### Pipeline (APML v10.2)

| Phase | Name | Port | Description |
|-------|------|------|-------------|
| 1 | Translation + LEGO Extraction | 3457 | Translate seeds, extract LEGOs |
| 2 | Conflict Resolution | 3458 | Resolve LEGO conflicts |
| 3 | Basket Generation | 3459 | Generate practice baskets with LEGO Debut cycle |
| **8** | **Audio Generator** | **3465** | **TTS generation → Supabase + S3** |
| **9** | **Manifest Compiler** | **3466** | **Compile manifest from Supabase** |
| - | Production API | 3470 | QA workflow + WebSocket |

**v10.2 Basket Cycle Sequence (M-type LEGOs):**
1. Components (`is_component: true`) - building blocks
2. LEGO Debut (`is_debut: true`) - the complete LEGO
3. Practice sentences - LEGO used in context

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

#### Phase 9 Manifest Compiler (port 3466)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/compile` | Compile manifest from Supabase |
| GET | `/validate/:courseCode` | Validate audio coverage |
| GET | `/health` | Health check |

### Services (PM2)

```bash
pm2 start ecosystem.config.cjs
pm2 status
```

| Service | Port | Description |
|---------|------|-------------|
| ssi-orchestrator | 3456 | Main orchestrator |
| phase1-translation | 3457 | Phase 1 server |
| phase2-conflict | 3458 | Phase 2 server |
| phase3-baskets | 3459 | Phase 3 server |
| phase7-manifest | 3464 | Legacy manifest (deprecated) |
| **phase8-audio** | **3465** | **Audio generation (Supabase)** |
| **phase9-manifest** | **3466** | **Manifest compilation (Supabase)** |
| production-api | 3470 | QA workflow + WebSocket |

## Build & Deploy

```bash
npm run build
vercel --prod
```

## SSoT Files

| File | Owner | Location |
|------|-------|----------|
| `lego_pairs.json` | Phase 2 | S3: `courses/{code}/lego_pairs.json` |
| `lego_baskets.json` | Phase 3 | S3: `courses/{code}/lego_baskets.json` |
| `course_manifest.json` | Phase 9 | S3: `courses/{code}/course_manifest.json` |
| Audio files | Phase 8 | S3: `ssiborg-assets/mastered/{uuid}.mp3` |
| Audio registry | Phase 8 | Supabase: `audio_samples` table |
| QA flags | Production API | Supabase: `sample_flags` table |

## Tech Stack

- Vue 3 (Composition API)
- Vite
- Tailwind CSS 4
- Express (API)
- **Supabase** (audio registry, QA workflow)
- AWS SDK v3 (S3)

---

**Version:** 10.2.0
**APML:** v10.2
**Pipeline:** v2.0 (Supabase-backed)
**S3 Bucket:** ssi-audio-stage (eu-west-1)
**Date:** 2025-12-04
