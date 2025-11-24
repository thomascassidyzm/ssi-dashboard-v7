# APML v9.0 - Pipeline Architecture Specification

> Single Source of Truth for SSi Course Generation Pipeline
> Last Updated: 2025-11-24

## Overview

APML v9.0 introduces a streamlined 3-phase pipeline for course generation, with clear input/output contracts and automatic handoffs.

## Phase Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SSi COURSE GENERATION PIPELINE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CANONICAL SEEDS                                                             │
│  public/vfs/canonical/canonical_seeds.json                                   │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ PHASE 1: Translation + LEGO Extraction                               │    │
│  │ Trigger: Swarm (25 agents in parallel)                               │    │
│  │ Output:  draft_lego_pairs.json (may have conflicts)                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ PHASE 2: Conflict Resolution                                         │    │
│  │ Trigger: Upchunking Agent                                            │    │
│  │ Steps:   detect → agent → apply                                      │    │
│  │ Output:  lego_pairs.json (conflict-free, single source of truth)     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ PHASE 3: Basket Generation                                           │    │
│  │ Trigger: Existing basket server (DO NOT MODIFY)                      │    │
│  │ Output:  lego_baskets.json                                           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ MANIFEST: Course Compilation (Script)                                │    │
│  │ Inputs:  lego_pairs.json + lego_baskets.json + introductions.json    │    │
│  │ Output:  course_manifest.json                                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ AUDIO: TTS Generation (Separate process)                             │    │
│  │ Input:   course_manifest.json                                        │    │
│  │ Output:  audio/*.mp3                                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## File Structure

```
public/vfs/courses/<course_code>/
├── seeds/                      # Individual seed files (Phase 1 per-seed)
│   ├── S0001.json
│   ├── S0002.json
│   └── ...
├── draft_lego_pairs.json       # Phase 1 output (may have conflicts)
├── conflict_report.json        # Phase 2a analysis
├── upchunk_resolutions.json    # Phase 2b agent output
├── lego_pairs.json             # Phase 2 output (SINGLE SOURCE OF TRUTH)
├── lego_baskets.json           # Phase 3 output
├── introductions.json          # Auto-generated at Phase 2 end
├── course_manifest.json        # Final compiled manifest
└── audio/                      # Generated audio files
    ├── samples/
    └── full/
```

## Data Formats

### lego_pairs.json (Single Source of Truth)

This is THE master file for course content. It contains:
- All seed pairs (no separate seed_pairs.json needed)
- All extracted LEGOs
- All upchunked M-types from conflict resolution

```json
{
  "course": "spa_for_eng",
  "generated": "2025-11-24T15:00:00Z",
  "phase": "final",
  "phase2Applied": "2025-11-24T15:30:00Z",
  "totalSeeds": 75,
  "totalLegos": 319,
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": {
        "known": "Hello",
        "target": "Hola"
      },
      "legos": [
        {
          "id": "S0001L01",
          "type": "A",
          "new": true,
          "lego": {
            "known": "hello",
            "target": "hola"
          }
        }
      ]
    }
  ],
  "upchunked_mtypes": [
    {
      "id": "UP0001",
      "type": "M",
      "source": "phase2_upchunk",
      "lego": {
        "known": "a little bit of",
        "target": "un poco de"
      },
      "components": [
        {"known": "a little", "target": "un poco"},
        {"known": "of", "target": "de"}
      ],
      "teaches": "partitive construction before nouns"
    }
  ]
}
```

### LEGO Types

| Type | Description | Example |
|------|-------------|---------|
| **A** | Atomic - single word either side | hello → hola |
| **M** | Molecular - 2+ words both sides, teaches pattern | I'm going to → voy a |

### M-type Requirements

M-types MUST:
1. Have 2+ words on BOTH sides
2. Teach something non-obvious (word order, linking words, idioms)
3. Include `components` array showing constituent parts
4. Include `teaches` field explaining the pattern

M-types must NOT be:
- Simple concatenations (e.g., "I want" = just "I" + "want")
- Trivial word-for-word translations

## Phase Contracts

### Phase 1: Translation + LEGO Extraction

| Property | Value |
|----------|-------|
| **Input** | canonical_seeds.json |
| **Output** | draft_lego_pairs.json |
| **Trigger** | Swarm (25 parallel agents) |
| **Handoff** | POST /phase2/detect |

**Swarm Configuration:**
- 5 browser tabs
- 5 agents per tab
- 3 seeds per agent
- Total: 75 seeds processed in parallel

**Per-Seed POST:**
```bash
curl -X POST http://localhost:3457/upload-seed \
  -H "Content-Type: application/json" \
  -d '{"course": "spa_for_eng", "agentId": "1.3", "seed": {...}}'
```

### Phase 2: Conflict Resolution

| Property | Value |
|----------|-------|
| **Input** | draft_lego_pairs.json |
| **Output** | lego_pairs.json |
| **Trigger** | Upchunking Agent |
| **Handoff** | Run Phase 3 basket generation |

**Steps:**
1. `POST /phase2/detect` → conflict_report.json
2. Run upchunking agent → upchunk_resolutions.json
3. `POST /phase2/apply` → lego_pairs.json

**Conflict Detection:**
Same KNOWN phrase mapping to different TARGET translations.

**Resolution Strategy:**
1. Choose most context-neutral form as canonical
2. Create M-type upchunks for context-specific variants
3. Auto-normalize capitalization

### Phase 3: Basket Generation

| Property | Value |
|----------|-------|
| **Input** | lego_pairs.json |
| **Output** | lego_baskets.json |
| **Trigger** | Existing basket server |
| **Handoff** | Run manifest generation |

**IMPORTANT: Do not modify Phase 3 code. It works perfectly.**

## Pipeline Server

**Port:** 3457

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server status |
| `/pipeline/:code` | GET | Full pipeline status with handoffs |
| `/course/:code/status` | GET | Real-time progress |
| `/upload-seed` | POST | Phase 1 per-seed upload |
| `/phase1/merge` | POST | Merge seeds → draft_lego_pairs |
| `/phase2/detect` | POST | Analyze conflicts |
| `/phase2/apply` | POST | Apply resolutions |
| `/upload-basket` | POST | Phase 3 per-basket upload |

### Pipeline Status Response

```json
{
  "course": "spa_for_eng",
  "pipeline": {
    "phase1": {
      "name": "Translation + LEGO Extraction",
      "status": "complete",
      "input": {"file": "canonical_seeds.json", "ready": true},
      "output": {"file": "draft_lego_pairs.json", "exists": true}
    },
    "phase2": {
      "name": "Conflict Resolution",
      "status": "complete",
      "input": {"file": "draft_lego_pairs.json", "ready": true},
      "output": {"file": "lego_pairs.json", "exists": true}
    },
    "phase3": {
      "name": "Basket Generation",
      "status": "ready",
      "input": {"file": "lego_pairs.json", "ready": true},
      "output": {"file": "lego_baskets.json", "exists": false}
    }
  },
  "recommendation": {
    "phase": 3,
    "action": "Run existing Phase 3 basket generation"
  }
}
```

## Migration from Previous Versions

### Deprecated Files
- `seed_pairs.json` - Now embedded in lego_pairs.json
- `batch_outputs/` - Replaced by per-seed uploads

### Phase Number Changes
| Old | New | Description |
|-----|-----|-------------|
| Phase 1-3 | Phase 1 | Translation + LEGO Extraction |
| Phase 4 | Phase 2 | Conflict Resolution (Upchunking) |
| Phase 5 | Phase 3 | Basket Generation |
| Phase 6 | - | Introductions (auto-script at Phase 2 end) |
| Phase 7 | Manifest | Course compilation script |
| Phase 8 | Audio | TTS generation (separate process) |

## Quality Gates

### Phase 1 Output Validation
- All 75 seeds present
- Each seed has at least 1 LEGO
- All LEGOs have valid structure

### Phase 2 Output Validation
- Zero conflicts remaining
- All canonical forms applied
- Capitalization normalized

### Phase 3 Output Validation
- All LEGOs assigned to baskets
- Basket sequences are valid
- No orphaned LEGOs

## Dashboard Integration

The dashboard reads from:
1. `/pipeline/:code` - Pipeline status
2. `/course/:code/status` - Real-time progress
3. VFS files directly for content editing

## Appendix: Quick Reference

**Start Pipeline Server:**
```bash
npm run pipeline
```

**Run Full Course Generation:**
```bash
# 1. Start server
npm run pipeline

# 2. Run swarm
node tools/orchestrators/spawn-swarm-5x5x3.cjs spa_for_eng --api-url=https://your-ngrok-url

# 3. After swarm completes, merge
curl -X POST http://localhost:3457/phase1/merge -d '{"course":"spa_for_eng"}'

# 4. Detect conflicts
curl -X POST http://localhost:3457/phase2/detect -d '{"course":"spa_for_eng"}'

# 5. Run upchunking agent (creates upchunk_resolutions.json)

# 6. Apply resolutions
curl -X POST http://localhost:3457/phase2/apply -d '{"course":"spa_for_eng"}'

# 7. Run Phase 3 basket generation

# 8. Run manifest generation

# 9. Run audio generation
```
