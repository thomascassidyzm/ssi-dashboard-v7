# SSi Course Pipeline Server Architecture

> Design document for the unified course generation pipeline server.
> Updated: 2025-11-24 (APML v9.0)

## Overview

A single Express server orchestrating the complete course generation pipeline, from raw seeds to conflict-free LEGOs.

## Phase Architecture (APML v9.0)

| Phase | Name | Input | Output | Trigger |
|-------|------|-------|--------|---------|
| **1** | Translation + LEGO Extraction | canonical_seeds.json | draft_lego_pairs.json | Swarm (25 agents) |
| **2** | Conflict Resolution | draft_lego_pairs.json | lego_pairs.json | Agent + Script |
| **3** | Basket Generation | lego_pairs.json | lego_baskets.json | Existing server |
| - | Manifest | All above | course_manifest.json | Script |
| - | Audio | course_manifest.json | audio/*.mp3 | TTS API |

**Key Principle:** A phase triggers agents. Scripts run instantly.

## Server Architecture

### Endpoints (Port 3457)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PIPELINE SERVER                               │
├─────────────────────────────────────────────────────────────────┤
│  STATUS & PIPELINE:                                              │
│    GET  /health              - Server status                     │
│    GET  /courses             - List all courses                  │
│    GET  /course/:code/status - Real-time progress                │
│    GET  /pipeline/:code      - Full pipeline with handoffs       │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 1 → draft_lego_pairs.json:                                │
│    POST /upload-seed         - Single seed from agent            │
│    POST /phase1/merge        - Merge all seeds                   │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 2 → lego_pairs.json:                                      │
│    POST /phase2/detect       - Analyze conflicts                 │
│    POST /phase2/apply        - Apply resolutions                 │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 3 → lego_baskets.json:                                    │
│    POST /upload-basket       - Single basket from agent          │
├─────────────────────────────────────────────────────────────────┤
│  UTILITIES:                                                      │
│    POST /reset-course        - Clear state for re-run            │
│    POST /set-expected-seeds  - Configure seed count              │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
public/vfs/courses/<course_code>/
├── seeds/                      # Phase 1 per-seed outputs
│   ├── S0001.json
│   └── ...
├── draft_lego_pairs.json       # Phase 1 output (may have conflicts)
├── conflict_report.json        # Phase 2a analysis
├── upchunk_resolutions.json    # Phase 2b agent output
├── lego_pairs.json             # Phase 2 output (SINGLE SOURCE OF TRUTH)
├── lego_baskets.json           # Phase 3 output
├── introductions.json          # Auto-generated
├── course_manifest.json        # Compiled manifest
└── audio/                      # Generated audio
```

## Data Flow

### Phase 1: Translation + LEGO Extraction

```
canonical_seeds.json
        │
        ▼
   ┌─────────┐
   │  SWARM  │  25 agents (5 browsers × 5 agents)
   │ 75 seeds │  POST /upload-seed for each
   └─────────┘
        │
        ▼
   POST /phase1/merge
        │
        ▼
draft_lego_pairs.json
```

### Phase 2: Conflict Resolution

```
draft_lego_pairs.json
        │
        ▼
   POST /phase2/detect
        │
        ▼
conflict_report.json
        │
        ▼
   ┌─────────────┐
   │ UPCHUNKING  │  Agent resolves conflicts
   │    AGENT    │  Creates upchunk_resolutions.json
   └─────────────┘
        │
        ▼
   POST /phase2/apply
        │
        ▼
lego_pairs.json (SINGLE SOURCE OF TRUTH)
```

### Phase 3: Basket Generation

```
lego_pairs.json
        │
        ▼
   ┌───────────┐
   │  BASKET   │  Existing server
   │  SERVER   │  DO NOT MODIFY
   └───────────┘
        │
        ▼
lego_baskets.json
```

## API Reference

### GET /pipeline/:code

Returns full pipeline status with inputs, outputs, and recommendations.

**Response:**
```json
{
  "success": true,
  "data": {
    "course": "spa_for_eng",
    "pipeline": {
      "phase1": {
        "name": "Translation + LEGO Extraction",
        "status": "complete",
        "input": {"file": "canonical_seeds.json", "ready": true},
        "output": {"file": "draft_lego_pairs.json", "exists": true}
      },
      "phase2": {...},
      "phase3": {...}
    },
    "recommendation": {
      "phase": 3,
      "action": "Run existing Phase 3 basket generation"
    }
  }
}
```

### POST /upload-seed

Receives single seed from swarm agents. Enables real-time progress tracking.

**Request:**
```json
{
  "course": "spa_for_eng",
  "agentId": "1.3",
  "seed": {
    "seed_id": "S0007",
    "seed_pair": {"known": "...", "target": "..."},
    "legos": [...]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "seedId": "S0007",
    "completed": 47,
    "expected": 75,
    "progress": "62.7%"
  }
}
```

### POST /phase1/merge

Merges all received seeds into draft_lego_pairs.json.

### POST /phase2/detect

Analyzes draft_lego_pairs.json for KNOWN→TARGET conflicts.

### POST /phase2/apply

Applies upchunk_resolutions.json to create final lego_pairs.json.

## Configuration

```javascript
// Environment variables
PORT=3457
VFS_ROOT=./public/vfs/courses

// Swarm configuration (in spawn script)
BROWSERS=5
AGENTS_PER_BROWSER=5
SEEDS_PER_AGENT=3
TOTAL_SEEDS=75
```

## Error Handling

### Validation Errors (400)
- Missing required fields
- Invalid course code
- Missing prerequisite files

### Not Found (404)
- Course directory doesn't exist

### Server Errors (500)
- File system errors
- JSON parse errors

## Running the Server

```bash
# Start pipeline server
npm run pipeline

# Or directly
node services/pipeline/pipeline-server.cjs
```

## Integration with Dashboard

The dashboard uses:
1. `GET /pipeline/:code` for pipeline status visualization
2. `GET /course/:code/status` for real-time progress during swarm runs
3. Direct VFS access for content editing

## See Also

- [APML v9.0 Pipeline Architecture](../../public/docs/APML_v9.0_PIPELINE_ARCHITECTURE.md) - Full specification
- [CLAUDE.md](../../CLAUDE.md) - Agent onboarding guide
