# Audio Generation Workflow (v2.0 - Supabase)

## Overview

Audio generation creates TTS samples for language courses using Azure Speech and ElevenLabs APIs. This document describes the complete workflow using the **Supabase-backed audio pipeline** (Phase 8 & 9).

**Key Change:** Audio samples are now stored in Supabase (`audio_samples` table), not JSON files. Manifests are compiled last by looking up UUIDs from Supabase.

## Architecture Summary

### Pipeline Flow

```
lego_baskets.json
       ↓
Phase 8: Audio Generation (Port 3465)
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
Supabase audio_samples table + S3 files
       ↓
Phase 9: Manifest Compilation (Port 3466)
       ↓
┌──────────────────────────────────────┐
│  For each sample needed:             │
│    1. Query Supabase by text+role    │
│    2. Get UUID + duration            │
│    3. Build manifest entry           │
│                                      │
│  Validation: 100% audio coverage     │
│    YES → write course_manifest.json  │
│    NO  → fail with missing list      │
└──────────────────────────────────────┘
       ↓
course_manifest.json (to S3)
```

### Key Components

| Component | Port | Description |
|-----------|------|-------------|
| Phase 8 Audio Generator | 3465 | TTS generation → Supabase + S3 |
| Phase 9 Manifest Compiler | 3466 | Manifest compilation from Supabase |
| Production API | 3470 | QA workflow + WebSocket |

### Supabase Tables

| Table | Purpose |
|-------|---------|
| `voices` | TTS and human voice registry |
| `audio_samples` | Master Audio Registry (MAR) |
| `course_audio_usage` | Which courses use which audio |
| `sample_flags` | QA workflow state |

### S3 Buckets

| Bucket | Purpose |
|--------|---------|
| `popty-bach-lfs` | Course files (lego_baskets.json, course_manifest.json) |
| `ssiborg-assets` | Audio files (mastered/{uuid}.mp3) |

---

## Environment Setup

### Required Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_xxxxx

# TTS APIs
AZURE_SPEECH_KEY=xxxxx
AZURE_SPEECH_REGION=westeurope
ELEVENLABS_API_KEY=xxxxx

# S3 Configuration
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_REGION=eu-west-1
```

### Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Run the schema migrations in `supabase/migrations/`
3. Copy the project URL and service key to `.env`

---

## Phase 8: Audio Generation

### Starting the Service

```bash
node services/phases/phase8-audio-supabase.cjs
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/generate` | Start audio generation for a course |
| GET | `/status/:courseCode` | Check job status |
| GET | `/health` | Health check |

### Generation Flow

1. **Load baskets** - Read `lego_baskets.json` from S3
2. **Extract samples** - Collect all unique (text, language, role) combinations
3. **Check Supabase** - For each sample, check if it already exists
4. **Generate TTS** - For missing samples, generate audio via Azure/ElevenLabs
5. **Upload to S3** - Store audio file in `ssiborg-assets/mastered/{uuid}.mp3`
6. **Insert to Supabase** - Create record in `audio_samples` table
7. **Track usage** - Record course-to-sample relationship in `course_audio_usage`

### Sample Roles

| Role | Language | Voice | Cadence | Purpose |
|------|----------|-------|---------|---------|
| `target1` | Target (e.g., Spanish) | Azure Female | slow | Primary target vocabulary |
| `target2` | Target (e.g., Spanish) | Azure Male | slow | Alternate target voice |
| `source` | Source (e.g., English) | ElevenLabs | natural | Translations/prompts |
| `presentation` | Source (e.g., English) | ElevenLabs | natural | Introductory narration |

### UUID Generation

UUIDs are deterministic hashes of:
- voice_id
- normalized text (lowercase, trimmed)
- language code
- role
- cadence

This ensures the same text+voice always produces the same UUID, enabling cross-course deduplication.

### Example Request

```bash
curl -X POST http://localhost:3465/generate \
  -H "Content-Type: application/json" \
  -d '{"courseCode": "spa_for_eng"}'
```

### Example Response

```json
{
  "status": "started",
  "jobId": "abc123",
  "courseCode": "spa_for_eng",
  "estimatedSamples": 12543,
  "existingSamples": 8234,
  "toGenerate": 4309
}
```

---

## Phase 9: Manifest Compilation

### Starting the Service

```bash
node services/phases/phase9-manifest-supabase.cjs
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/compile` | Compile manifest for a course |
| GET | `/validate/:courseCode` | Validate audio coverage |
| GET | `/health` | Health check |

### Compilation Flow

1. **Load baskets** - Read `lego_baskets.json` from S3
2. **Extract required samples** - List all text+role combinations needed
3. **Query Supabase** - Look up each sample's UUID and duration
4. **Validate coverage** - Ensure 100% of samples have audio
5. **Build manifest** - Construct `course_manifest.json` with all UUIDs
6. **Upload to S3** - Store manifest in `courses/{code}/course_manifest.json`

### Validation

Before writing the manifest, Phase 9 validates:
- All required samples exist in Supabase
- All audio files exist in S3
- All durations are populated

If any samples are missing, the compilation fails with a list of missing items.

### Example Request

```bash
curl -X POST http://localhost:3466/compile \
  -H "Content-Type: application/json" \
  -d '{"courseCode": "spa_for_eng"}'
```

### Example Response

```json
{
  "status": "complete",
  "courseCode": "spa_for_eng",
  "totalSamples": 12543,
  "manifestPath": "courses/spa_for_eng/course_manifest.json",
  "s3Url": "s3://popty-bach-lfs/courses/spa_for_eng/course_manifest.json"
}
```

---

## QA Workflow

### Sample Flagging

The Production API (port 3470) provides QA workflow capabilities:

```bash
# Flag a sample for regeneration
curl -X POST http://localhost:3470/api/samples/flag \
  -H "Content-Type: application/json" \
  -d '{
    "uuid": "a1b2c3d4-e5f6-7890",
    "status": "flagged_regen_tts",
    "notes": "Pronunciation sounds unnatural",
    "flaggedBy": "qa@example.com"
  }'
```

### Sample Status Lifecycle

```
[pending] → Initial state
    │
    ├─→ [flagged_regen_tts]     → Audio needs regeneration
    ├─→ [flagged_human_needed]  → Requires human recording
    ├─→ [approved]              → Audio is good
    │
    ↓
[in_pipeline] → TTS generation queued
    │
    ├─→ [tts_complete]          → TTS generated
    ├─→ [tts_failed]            → Generation failed
    │
    ↓
[needs_review] → Ready for QA review
    │
    ├─→ [approved]              → Final approval
    ├─→ [rejected]              → Send back for regen
    │
    ↓
[complete] → Published
```

### WebSocket Updates

The Production API provides real-time updates via WebSocket:

```javascript
const socket = io('http://localhost:3470');

socket.on('sample_updated', (data) => {
  console.log('Sample updated:', data.uuid, data.status);
});

socket.on('generation_progress', (data) => {
  console.log('Progress:', data.completed, '/', data.total);
});
```

---

## Quick Reference

### Commands

```bash
# Start Phase 8 Audio Generator
node services/phases/phase8-audio-supabase.cjs

# Start Phase 9 Manifest Compiler
node services/phases/phase9-manifest-supabase.cjs

# Start Production API (QA workflow)
node services/production-api.cjs

# Generate audio for a course
curl -X POST http://localhost:3465/generate -d '{"courseCode":"spa_for_eng"}'

# Compile manifest for a course
curl -X POST http://localhost:3466/compile -d '{"courseCode":"spa_for_eng"}'

# Check audio coverage
curl http://localhost:3466/validate/spa_for_eng

# Check generation status
curl http://localhost:3465/status/spa_for_eng
```

### Port Reference

| Port | Service | Description |
|------|---------|-------------|
| 3456 | Orchestrator | Main coordinator |
| 3457 | Phase 1 | Translation + LEGO Extraction |
| 3458 | Phase 2 | Conflict Resolution |
| 3459 | Phase 3 | Basket Generation |
| 3464 | Legacy Manifest | Deprecated |
| **3465** | **Phase 8** | **Audio Generator (Supabase)** |
| **3466** | **Phase 9** | **Manifest Compiler (Supabase)** |
| **3470** | **Production API** | **QA workflow + WebSocket** |

---

## Migration from v1.0 (JSON-based MAR)

If you have audio from the old JSON-based MAR system:

1. **Export existing audio metadata** - Extract UUIDs from `audio_index.json`
2. **Run migration script** - `node scripts/migrate-mar-to-supabase.cjs`
3. **Verify audio in S3** - Ensure all files exist
4. **Test manifest compilation** - Run Phase 9 to validate

The migration script:
- Reads the old JSON MAR files
- Inserts records into Supabase `audio_samples` table
- Does NOT re-generate audio (reuses existing S3 files)

---

## Troubleshooting

### "Sample not found in Supabase"

The sample hasn't been generated yet. Run Phase 8 first:

```bash
curl -X POST http://localhost:3465/generate -d '{"courseCode":"spa_for_eng"}'
```

### "Audio file missing in S3"

The Supabase record exists but S3 file is missing. Check:

1. S3 bucket permissions
2. S3 region configuration
3. Re-run Phase 8 to regenerate missing files

### "Manifest compilation failed - missing samples"

Not all required samples exist in Supabase. Check:

1. Phase 8 completed successfully
2. All voice configurations are correct
3. Run `/validate/:courseCode` to see what's missing

### "TTS API rate limit"

Azure and ElevenLabs have rate limits. Phase 8 handles this with:

- Exponential backoff
- Parallel generation with concurrency limits
- Automatic retry for transient failures

---

## Best Practices

1. **Always run Phase 8 before Phase 9** - Audio must exist before manifest compilation
2. **Check coverage before production** - Use `/validate/:courseCode` endpoint
3. **Monitor generation progress** - Connect to WebSocket for real-time updates
4. **Use QA workflow for issues** - Flag samples instead of regenerating everything
5. **Deduplication is automatic** - Same text+voice reuses existing audio

---

**Last Updated:** 2025-12-04
**Version:** 2.0 (Supabase-backed)
**APML:** v11.0
