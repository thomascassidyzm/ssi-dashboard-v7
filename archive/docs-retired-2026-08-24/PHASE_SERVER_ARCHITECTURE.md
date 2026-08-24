# Phase Server Architecture

> Documentation for the SSi Course Production pipeline servers (APML v9.0)

## Overview

The Popty-Bach system uses **isolated phase servers** for audio generation and course processing. Each phase server handles **one prompt-driven job** executed by agents. Servers run independently on their own ports, coordinated by a central orchestrator.

**Key Concept:** A "Phase" = one server = one prompt = one agent job

```
                      +------------------+
                      |   Orchestrator   |
                      |   Port: 3456     |
                      +--------+---------+
                               |
    +----------+----------+----------+----------+----------+
    |          |          |          |          |          |
    v          v          v          v          v          v
+---------+ +---------+ +---------+ +---------+ +---------+
| Phase 1 | | Phase 2 | | Phase 3 | | Manifest| | Audio   |
| Trans+  | | Conflict| | Basket  | | Compile | | TTS     |
| LEGO    | | Resoln  | | Gen     | | (script)| | (script)|
| 3457    | | 3458    | | 3459    | | 3464    | | 3465    |
+---------+ +---------+ +---------+ +---------+ +---------+
```

## Port Assignments

| Port | Phase | Description | Server File | Status |
|------|-------|-------------|-------------|--------|
| 3456 | - | **Main Orchestrator** | `services/orchestration/orchestrator.cjs` | Running |
| 3457 | 1 | Translation + LEGO Extraction | `services/phases/phase1-translation/server.cjs` | Available |
| 3458 | 2 | Conflict Resolution | `services/phases/phase1-lego-extraction/server.cjs` | Available |
| 3459 | 3 | Basket Generation | `services/phases/phase3-basket-generation/server.cjs` | Running |
| 3464 | - | Manifest Compilation (script) | `services/phases/manifest-compilation/server.cjs` | Available |
| 3465 | - | Audio/TTS Generation (script) | `services/phases/audio-server.cjs` | Available |

## What is a "Phase"?

A Phase is defined by:
1. **One isolated server** - runs on its own port
2. **One prompt** - defines what the agent should do
3. **One agent job** - agents execute the prompt autonomously

This isolation ensures:
- Each phase can be developed/tested independently
- Failures in one phase don't affect others
- Phases can run in parallel where appropriate
- Clear ownership of inputs → outputs

## PM2 Process Management

Currently running processes:

```bash
pm2 list
# ┌────┬─────────────────────┬─────────┬────────┬──────────┐
# │ id │ name                │ pid     │ uptime │ status   │
# ├────┼─────────────────────┼─────────┼────────┼──────────┤
# │ 0  │ ssi-orchestrator    │ 9070    │ 35h    │ online   │
# │ 1  │ phase3-baskets      │ 98960   │ 5D     │ online   │
# └────┴─────────────────────┴─────────┴────────┴──────────┘
```

### Managing Services

```bash
# View all processes
pm2 list

# View logs for a service
pm2 logs ssi-orchestrator
pm2 logs phase3-baskets

# Restart a service
pm2 restart ssi-orchestrator

# Stop a service
pm2 stop phase3-baskets

# Start a new service
pm2 start services/phases/audio-server.cjs --name "audio-server"
```

## Pipeline Flow (APML v10.1)

```
Canonical Seeds → Phase 1 → Phase 2 → Phase 3 → Manifest → Audio
                    │           │         │         │         │
                    v           v         v         v         v
             draft_lego_   lego_pairs  lego_    course_   *.mp3
               pairs.json   .json    baskets   manifest
                                      .json    .json
```

### Phase Outputs (S3 SSoT)

Each phase produces files stored in S3 (`popty-bach-lfs/courses/{courseCode}/`):

| Phase | Output File | Description |
|-------|-------------|-------------|
| Phase 1 | `draft_lego_pairs.json` | Translated seeds with LEGOs (may have conflicts) |
| Phase 2 | `lego_pairs.json` | Conflict-free LEGOs (SSoT) |
| Phase 3 | `lego_baskets.json` | Practice baskets with LEGO Debut cycle |
| Manifest | `course_manifest.json` | Complete course structure with UUIDs |
| Audio | `mastered/{uuid}.mp3` | Generated audio files (in `ssi-audio-stage` bucket) |

## Server Details

### Main Orchestrator (Port 3456)

**File:** `services/orchestration/orchestrator.cjs`

Coordinates the entire pipeline:
- Serves dashboard read-only APIs (courses, VFS files, metrics)
- Triggers phase servers in sequence
- Checkpoint management (manual/gated/full modes)
- Health monitoring of phase servers
- Course status tracking

**Key Endpoints:**
- `GET /health` - Health check
- `GET /api/courses` - List all courses
- `POST /api/pipeline/start` - Start pipeline for course
- `GET /api/progress/:courseCode` - Get pipeline progress

### Phase 1: Translation + LEGO Extraction (Port 3457)

**File:** `services/phases/phase1-translation/server.cjs`

Single prompt that handles:
- Seed translation from known language to target language
- LEGO component extraction (FD + LUT)
- Type classification (A-type atomic vs M-type molecular)

**Key Endpoints:**
- `POST /start` - Start Phase 1 job
- `GET /status/:courseCode` - Get job status

**Output:** `draft_lego_pairs.json` (may contain conflicts)

### Phase 2: Conflict Resolution (Port 3458)

**File:** `services/phases/phase1-lego-extraction/server.cjs`

Resolves LEGO conflicts from Phase 1:
- Identifies duplicate or conflicting LEGO definitions
- Resolves conflicts with linguistic judgment
- Produces clean, conflict-free LEGOs

**Key Endpoints:**
- `POST /start` - Start Phase 2 job
- `GET /status/:courseCode` - Get job status

**Output:** `lego_pairs.json` (SSoT - Single Source of Truth)

### Phase 3: Basket Generation (Port 3459)

**File:** `services/phases/phase3-basket-generation/server.cjs`

Generates practice baskets from LEGOs:
- Scaffolds preparation
- Parallel Claude Code browser sessions
- Auto-merge when complete
- Metadata stripping before S3 push

**Basket Cycle Sequence (v10.1):**
For M-type LEGOs, baskets follow this order:
1. Components (is_component: true) - building blocks
2. **LEGO Debut** (is_debut: true) - the complete LEGO
3. Practice sentences - LEGO used in context

**Key Endpoints:**
- `POST /start` - Start basket generation
- `GET /status/:courseCode` - Get job status
- `POST /scaffold` - Prepare scaffolds only

**Output:** `lego_baskets.json`

### Manifest Compilation (Port 3464)

**File:** `services/phases/manifest-compilation/server.cjs`

Compiles final course manifest:
- Deterministic UUID generation (SSi legacy format)
- Language-specific encouragements
- Backwards-compatible manifest structure

**Required Inputs:**
- `seed_pairs.json`
- `lego_pairs.json`
- `lego_baskets.json`
- `introductions.json`

**Key Endpoints:**
- `POST /start` - Start manifest compilation
- `GET /status/:courseCode` - Get job status

### Audio/TTS Generation (Port 3465)

**File:** `services/phases/audio-server.cjs`

Wraps Kai's comprehensive audio generation orchestrator:
- Two-phase generation (Phase A: targets/source, Phase B: presentations)
- QC checkpoints before processing/upload
- Azure TTS + ElevenLabs support
- S3 upload with Master Audio Registry (MAR)

**Key Endpoints:**
- `POST /start` - Start audio generation
- `GET /status/:courseCode` - Get job status

**Options:**
```json
{
  "courseCode": "spa_for_eng",
  "options": {
    "phase": "auto",        // "targets", "presentations", or "auto"
    "skipUpload": false,    // Skip S3 upload (for testing)
    "skipQC": false,        // Skip QC pause
    "uploadBucket": "stage" // "stage" or "prod"
  }
}
```

## Environment Variables

The orchestrator expects these environment variables:

```bash
VFS_ROOT=/path/to/vfs/courses    # Course data root
CHECKPOINT_MODE=gated            # manual, gated, or full
PORT=3456                        # Orchestrator port

# Phase server URLs (optional, defaults shown)
PHASE1_URL=http://localhost:3457
PHASE3_URL=http://localhost:3459
MANIFEST_URL=http://localhost:3464
AUDIO_URL=http://localhost:3465
```

## S3 Integration

### Buckets

| Bucket | Purpose |
|--------|---------|
| `popty-bach-lfs` | Course data (lego_pairs, baskets, manifests, recordings) |
| `ssi-audio-stage` | Mastered audio files (`mastered/{uuid}.mp3`) |

### S3 Course Structure

```
popty-bach-lfs/
  courses/
    spa_for_eng/
      lego_pairs.json
      lego_baskets.json
      introductions.json
      course_manifest.json
    ita_for_eng/
      ...
  recordings/
    {hash}_{lang}_{role}_{cadence}_{voiceId}.webm
  auth/
    users.json
    sessions/
    magic-links/
```

## Starting the System

### Development

```bash
# Start orchestrator
pm2 start services/orchestration/orchestrator.cjs --name ssi-orchestrator

# Start phase servers as needed
pm2 start services/phases/phase3-basket-generation/server.cjs --name phase3-baskets

# Save PM2 config
pm2 save
```

### Checking Health

```bash
# Check orchestrator
curl http://localhost:3456/health

# Check phase server
curl http://localhost:3459/health
```

## Troubleshooting

### Service not responding

```bash
# Check if service is running
pm2 list

# Check logs
pm2 logs ssi-orchestrator --lines 50

# Restart service
pm2 restart ssi-orchestrator
```

### Port already in use

```bash
# Find process using port
lsof -i :3456

# Kill if needed
kill -9 <PID>
```

### S3 connection issues

Ensure `.env` has correct AWS credentials:
```bash
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=eu-west-1  # Important: bucket is in eu-west-1
```

---

*Last updated: 2025-12-03*
