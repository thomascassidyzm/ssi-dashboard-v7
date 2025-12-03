# SSi Course Production Dashboard v10.1.0

**APML v10.1: S3 as Single Source of Truth**

## Overview

Course production dashboard for SSi language learning system. All course data lives in S3 (not GitHub).

**v10.1 Features:**
- S3 is SSoT for all course data (bucket: `popty-bach-lfs`, region: `eu-west-1`)
- LEGO Debut cycle in basket generation
- API proxy for course files (avoids CORS)
- Support for TTS (primary) and human recordings (edge-case languages)

## Quick Start

```bash
npm install
npm run dev          # Frontend (port 5173)
```

## Architecture

### Data Flow

```
S3 (popty-bach-lfs)
    └── courses/{course_code}/
         ├── lego_pairs.json      (Phase 1+2 output - SSoT)
         ├── lego_baskets.json    (Phase 3 output - SSoT)
         ├── introductions.json   (derived)
         └── course_manifest.json (compiled for app)
```

### Pipeline (APML v10.1)

| Phase | Name | Port | Description |
|-------|------|------|-------------|
| 1 | Translation + LEGO Extraction | 3457 | Translate seeds, extract LEGOs |
| 2 | Conflict Resolution | 3458 | Resolve LEGO conflicts |
| 3 | Basket Generation | 3459 | Generate practice baskets with LEGO Debut cycle |
| - | Manifest Compilation | script | Compile course_manifest.json |
| - | Audio Generation | 3465 | TTS generation (Azure/ElevenLabs) |

**v10.1 Basket Cycle Sequence (M-type LEGOs):**
1. Components (`is_component: true`) - building blocks
2. LEGO Debut (`is_debut: true`) - the complete LEGO
3. Practice sentences - LEGO used in context

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/courses` | List all courses (from S3) |
| GET | `/api/courses/:code/files/:filename` | Get course file (proxy to S3) |
| POST | `/api/courses/:code/outputs` | Save phase outputs to S3 |

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
| phase7-manifest | 3464 | Manifest compilation |
| phase8-audio | 3465 | Audio generation |

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
| `course_manifest.json` | Manifest Script | S3: `courses/{code}/course_manifest.json` |
| Audio files | Audio Phase | S3: `ssiborg-assets/mastered/{uuid}.mp3` |

## Tech Stack

- Vue 3 (Composition API)
- Vite
- Tailwind CSS 4
- Express (API)
- AWS SDK v3 (S3)

---

**Version:** 10.1.0
**APML:** v10.1.0
**S3 Bucket:** popty-bach-lfs (eu-west-1)
**Date:** 2025-12-03
