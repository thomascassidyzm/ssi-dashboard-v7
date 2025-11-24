# SSi Course Pipeline Server Architecture

> Design document for the unified course generation pipeline server.

## Overview

A single Express server orchestrating the complete course generation pipeline, from raw seeds to playable audio.

## Phase Numbering (NEW)

| Phase | Name | Input | Output | Method |
|-------|------|-------|--------|--------|
| **1** | Translation + LEGO Extraction | canonical_seeds.json | draft_lego_pairs.json | Swarm (25 agents) |
| **2** | Conflict Resolution | draft_lego_pairs.json | lego_pairs.json | Agent + Script |
| **3** | Basket Generation | lego_pairs.json | lego_baskets.json | Local/Agent |
| **4** | Introductions | lego_baskets.json | introductions.json | Agent |
| **5** | Course Manifest | All above | course_manifest.json | Script |
| **6** | Audio Generation | course_manifest.json | audio/*.mp3 | TTS API |

## Server Architecture

### Single Server Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    PIPELINE SERVER (port 3457)                   │
├─────────────────────────────────────────────────────────────────┤
│  /health              - Server health + active jobs             │
│  /courses             - List all courses with status            │
│  /course/:code        - Detailed course status                  │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 1: Translation + LEGO Extraction                         │
│  POST /phase1/upload-batch     - Receive swarm batch            │
│  POST /phase1/merge            - Merge batches → draft_lego     │
│  GET  /phase1/status/:code     - Batch collection status        │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 2: Conflict Resolution                                   │
│  POST /phase2/detect           - Generate conflict report       │
│  POST /phase2/apply            - Apply resolutions → lego_pairs │
│  GET  /phase2/conflicts/:code  - Get conflict report            │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 3: Basket Generation                                     │
│  POST /phase3/generate         - Generate baskets               │
│  GET  /phase3/status/:code     - Generation progress            │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 4: Introductions                                         │
│  POST /phase4/generate         - Generate introductions         │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 5: Course Manifest                                       │
│  POST /phase5/generate         - Generate manifest              │
│  POST /phase5/validate         - Validate manifest              │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 6: Audio Generation                                      │
│  POST /phase6/generate         - Start audio generation         │
│  GET  /phase6/progress/:code   - Audio generation progress      │
│  POST /phase6/qc-approve       - Approve QC samples             │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
public/vfs/courses/<course_code>/
├── batch_outputs/              # Phase 1 swarm results
│   ├── batch_1.1_*.json
│   ├── batch_1.2_*.json
│   └── ...
├── draft_lego_pairs.json       # Phase 1 output (may have conflicts)
├── conflict_report.json        # Phase 2a analysis
├── upchunk_resolutions.json    # Phase 2b resolutions
├── lego_pairs.json             # Phase 2 output (conflict-free)
├── lego_baskets.json           # Phase 3 output
├── introductions.json          # Phase 4 output
├── course_manifest.json        # Phase 5 output
└── audio/                      # Phase 6 output
    ├── samples/
    └── full/
```

## API Design

### Standard Response Format

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "course": "spa_for_eng",
    "phase": 1,
    "timestamp": "2025-11-24T15:00:00Z"
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT_DETECTED",
    "message": "18 conflicts found in draft_lego_pairs.json",
    "details": { ... }
  }
}
```

### Key Endpoints

#### POST /phase1/upload-batch
Receives batch results from swarm agents.

```json
// Request
{
  "course": "spa_for_eng",
  "browserId": 1,
  "agentId": "1.3",
  "seedRange": "S0007-S0009",
  "seeds": [{ seed_id, seed_pair, legos }]
}

// Response
{
  "success": true,
  "data": {
    "batchId": "batch_1.3_1763995799.json",
    "seedsReceived": 3,
    "totalBatches": 12,
    "expectedBatches": 25
  }
}
```

#### POST /phase1/merge
Merges all batch outputs into draft_lego_pairs.json.

```json
// Request
{ "course": "spa_for_eng" }

// Response
{
  "success": true,
  "data": {
    "totalSeeds": 75,
    "totalLegos": 317,
    "outputFile": "draft_lego_pairs.json",
    "conflicts": 18
  }
}
```

#### POST /phase2/detect
Analyzes draft_lego_pairs.json for conflicts.

```json
// Request
{ "course": "spa_for_eng" }

// Response
{
  "success": true,
  "data": {
    "totalConflicts": 18,
    "byType": {
      "capitalization": 3,
      "preposition": 2,
      "semantic": 13
    },
    "reportFile": "conflict_report.json"
  }
}
```

#### POST /phase2/apply
Applies upchunk_resolutions.json to create final lego_pairs.json.

```json
// Request
{ "course": "spa_for_eng" }

// Response
{
  "success": true,
  "data": {
    "capitalNormalized": 11,
    "canonicalApplied": 7,
    "mTypesAdded": 7,
    "remainingConflicts": 0,
    "outputFile": "lego_pairs.json"
  }
}
```

## Implementation Plan

### Phase 1: Core Infrastructure (Day 1)
1. Create unified server skeleton
2. Migrate /upload-batch from existing phase1-translation-server
3. Add /phase1/merge endpoint
4. Test with existing batch_outputs

### Phase 2: Conflict Resolution (Day 1)
1. Add /phase2/detect endpoint (wraps reconcile-lego-conflicts.cjs)
2. Add /phase2/apply endpoint (wraps phase4-upchunk-pipeline.cjs)
3. Test end-to-end with ita_for_eng_test

### Phase 3: Remaining Phases (Day 2)
1. Integrate existing phase5-basket-server logic
2. Integrate phase6-introduction-server logic
3. Add manifest generation
4. Add audio generation endpoints

### Phase 4: Polish (Day 2-3)
1. Add comprehensive logging
2. Add progress tracking
3. Add WebSocket for real-time updates (optional)
4. Documentation

## Configuration

```javascript
// config/pipeline.config.js
module.exports = {
  port: process.env.PORT || 3457,
  vfsRoot: process.env.VFS_ROOT || './public/vfs/courses',

  swarm: {
    expectedBatches: 25,    // 5 browsers × 5 agents
    seedsPerAgent: 3,
    timeoutMs: 300000       // 5 minutes per batch
  },

  phase2: {
    autoCapitalization: true,
    requireResolutions: true
  },

  phase6: {
    ttsProvider: 'azure',   // or 'google', 'elevenlabs'
    qcSampleCount: 10
  }
};
```

## Error Handling

### Recoverable Errors
- Network timeout → Retry with exponential backoff
- Partial batch → Mark incomplete, allow manual retry
- TTS rate limit → Queue and retry

### Fatal Errors
- Invalid course code → 404
- Missing prerequisites → 400 with clear message
- Validation failure → 400 with detailed report

## Security Considerations (Future)

- [ ] API key authentication for production
- [ ] Rate limiting per course
- [ ] Input validation/sanitization
- [ ] Audit logging

## Monitoring

### Health Check Response
```json
{
  "status": "healthy",
  "uptime": 3600,
  "activeJobs": 2,
  "memory": { "used": "150MB", "total": "512MB" },
  "courses": {
    "spa_for_eng": { "phase": 3, "progress": "45%" }
  }
}
```

## Migration Notes

### From Old Architecture
1. phase1-translation-server.cjs → /phase1/* endpoints
2. phase3-lego-extraction-server.cjs → Deprecated (merged into Phase 1)
3. phase5-basket-server.cjs → /phase3/* endpoints
4. phase6-introduction-server.cjs → /phase4/* endpoints
5. phase8-audio-server.cjs → /phase6/* endpoints

### Backward Compatibility
- Keep /upload-batch working (alias to /phase1/upload-batch)
- Keep /health working
