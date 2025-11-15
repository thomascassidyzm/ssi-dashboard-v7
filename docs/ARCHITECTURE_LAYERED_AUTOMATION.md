# Layered Automation Architecture - Design Proposal

## Current State (Monolithic)

```
automation_server.cjs (10,363 lines)
├── Phase 1 orchestration
├── Phase 3 orchestration
├── Phase 5 orchestration
├── Phase 8 audio generation
├── VFS file management
├── Quality review endpoints
├── Basket validation
├── Storage/S3 sync
├── Visualization APIs
├── Skills library
├── Prompt history
└── 50+ API endpoints
```

**Problems:**
- Single point of failure
- Hard to maintain/debug
- Can't restart individual phases
- Mixed concerns (orchestration + data serving + validation)
- 10K+ lines in one file

## Proposed Architecture (Layered)

```
┌─────────────────────────────────────────────────────────────┐
│              Main Orchestrator (orchestrator.cjs)           │
│  - Course lifecycle management                              │
│  - Phase sequencing (1→3→5→6→8)                            │
│  - Checkpoint/gating logic                                   │
│  - Dashboard API (read-only data endpoints)                 │
│  - ~500 lines                                               │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Phase 1 Server  │  │  Phase 3 Server  │  │  Phase 5 Server  │
│  (port 3457)     │  │  (port 3458)     │  │  (port 3459)     │
│                  │  │                  │  │                  │
│ - Translation    │  │ - LEGO extract   │  │ - Basket gen     │
│ - Agent spawn    │  │ - Agent spawn    │  │ - Branch watch   │
│ - Validation     │  │ - Validation     │  │ - Auto-merge     │
│ - ~800 lines     │  │ - ~1000 lines    │  │ - ~600 lines     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
        ┌──────────────────┐  ┌──────────────────┐
        │  Phase 6 Server  │  │  Phase 8 Server  │
        │  (port 3460)     │  │  (port 3461)     │
        │                  │  │                  │
        │ - Introductions  │  │ - TTS generation │
        │ - ~500 lines     │  │ - S3 upload      │
        └──────────────────┘  │ - ~400 lines     │
                              └──────────────────┘
```

## Service Responsibilities

### Main Orchestrator (`services/orchestration/orchestrator.cjs`)

**Port:** 3456 (keeps existing port for dashboard compatibility)

**Responsibilities:**
- Serve dashboard read-only APIs (courses list, VFS files, metrics)
- Trigger phase servers in sequence
- Checkpoint management (manual/gated/full modes)
- Health monitoring of phase servers
- Course status tracking

**API Endpoints:**
```
GET  /api/courses                    - List all courses
GET  /api/courses/:code              - Get course details
GET  /api/courses/:code/status       - Current phase status
POST /api/courses/:code/start-phase  - Trigger next phase
GET  /api/health                     - Health check
GET  /api/vfs/courses/:code/:file    - Serve VFS files
```

**Config:**
```javascript
{
  phaseServers: {
    1: 'http://localhost:3457',
    3: 'http://localhost:3458',
    5: 'http://localhost:3459',
    6: 'http://localhost:3460',
    8: 'http://localhost:3461'
  },
  checkpointMode: 'gated',  // manual | gated | full
  vfsRoot: '/path/to/vfs'
}
```

### Phase 1 Server (`services/phases/phase1-translation-server.cjs`)

**Port:** 3457

**Responsibilities:**
- Spawn parallel translation agents (osascript)
- Monitor translation progress
- Validate translations (cognate rules, zero variation)
- Write seed_pairs.json to VFS
- Report completion to orchestrator

**API Endpoints:**
```
POST /start              - Start Phase 1 for course
GET  /status/:courseCode - Get progress
GET  /validate/:courseCode - Run validation
POST /abort/:courseCode  - Emergency stop
```

### Phase 3 Server (`services/phases/phase3-lego-extraction-server.cjs`)

**Port:** 3458

**Responsibilities:**
- Spawn parallel LEGO extraction agents
- Monitor extraction progress
- Validate LEGO quality (two heuristics)
- Write lego_pairs.json to VFS
- Report completion to orchestrator

**API Endpoints:**
```
POST /start              - Start Phase 3 for course
GET  /status/:courseCode - Get progress
GET  /validate/:courseCode - Run validation
POST /abort/:courseCode  - Emergency stop
```

### Phase 5 Server (`services/phases/phase5-basket-server.cjs`)

**Port:** 3459

**Responsibilities:**
- Spawn parallel basket generation agents (browser windows)
- **Watch for claude/segment-* branches** (NEW from debug-connectivity branch)
- **Auto-merge segments when ready** (NEW)
- **Strip metadata before merge** (NEW - 99.5% size reduction)
- Validate basket quality
- Write lego_baskets.json to VFS
- Auto-deploy to Vercel
- Report completion to orchestrator

**API Endpoints:**
```
POST /start              - Start Phase 5 for course
GET  /status/:courseCode - Get progress
GET  /branches           - List waiting claude/* branches
POST /merge              - Manually trigger merge
GET  /validate/:courseCode - Run validation
POST /abort/:courseCode  - Emergency stop
```

**Integration with debug-connectivity tools:**
```javascript
// Phase 5 server uses these scripts internally
const watchAndMerge = require('../../scripts/watch_and_merge_branches.cjs');
const stripMetadata = require('../../scripts/strip_phase5_metadata.cjs');

// Start watcher when Phase 5 begins
watchAndMerge.start({
  pattern: 'claude/baskets-*',
  output: `${VFS_ROOT}/${courseCode}/lego_baskets.json`,
  minBranches: expectedAgentCount,
  autoDeploy: true,
  autoDelete: true
});
```

### Phase 6 Server (`services/phases/phase6-introduction-server.cjs`)

**Port:** 3460

**Responsibilities:**
- Generate introduction presentations for each LEGO
- Write introductions.json to VFS
- Report completion to orchestrator

### Phase 8 Server (`services/phases/phase8-audio-server.cjs`)

**Port:** 3461

**Responsibilities:**
- Generate TTS audio for phrases
- Upload to S3
- Update audio manifests
- Report completion to orchestrator

## Process Management (PM2)

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'orchestrator',
      script: 'services/orchestration/orchestrator.cjs',
      env: {
        PORT: 3456,
        VFS_ROOT: '/Users/tomcassidy/SSi/SSi_Course_Production',
        CHECKPOINT_MODE: 'gated'
      }
    },
    {
      name: 'phase1-server',
      script: 'services/phases/phase1-translation-server.cjs',
      env: { PORT: 3457 }
    },
    {
      name: 'phase3-server',
      script: 'services/phases/phase3-lego-extraction-server.cjs',
      env: { PORT: 3458 }
    },
    {
      name: 'phase5-server',
      script: 'services/phases/phase5-basket-server.cjs',
      env: {
        PORT: 3459,
        WATCH_BRANCHES: true,
        AUTO_MERGE: true,
        STRIP_METADATA: true
      }
    },
    {
      name: 'phase6-server',
      script: 'services/phases/phase6-introduction-server.cjs',
      env: { PORT: 3460 }
    },
    {
      name: 'phase8-server',
      script: 'services/phases/phase8-audio-server.cjs',
      env: { PORT: 3461 }
    }
  ]
};
```

**Management:**
```bash
# Start all services
pm2 start ecosystem.config.cjs

# Restart just Phase 5 (doesn't affect other phases)
pm2 restart phase5-server

# Check logs for specific phase
pm2 logs phase3-server

# Stop Phase 5 for maintenance
pm2 stop phase5-server

# Monitor all services
pm2 monit
```

## Communication Flow

### Example: Generate Full Course

```
1. Dashboard → Orchestrator: POST /api/courses/spa_for_eng/start

2. Orchestrator checks status:
   - If empty → start Phase 1
   - If has translations → start Phase 3
   - If has LEGOs → start Phase 5
   - etc.

3. Orchestrator → Phase 1 Server: POST /start
   {
     "courseCode": "spa_for_eng",
     "sourceLanguage": "ENG",
     "targetLanguage": "SPA",
     "totalSeeds": 668
   }

4. Phase 1 Server:
   - Spawns 10 parallel Claude Code agents (osascript)
   - Each agent translates ~67 seeds
   - Writes individual segment files
   - Merges to seed_pairs.json
   - Validates translations

5. Phase 1 Server → Orchestrator: POST /phase-complete
   {
     "phase": 1,
     "courseCode": "spa_for_eng",
     "status": "success",
     "validationResults": { ... }
   }

6. Orchestrator checks checkpoint mode:
   - manual: Pause, wait for user approval
   - gated: Check validation passed, auto-proceed if OK
   - full: Auto-proceed immediately

7. Orchestrator → Phase 3 Server: POST /start
   (repeat pattern for Phase 3, 5, 6, 8...)
```

### Example: Phase 5 with Branch Watching (NEW)

```
1. Orchestrator → Phase 5 Server: POST /start

2. Phase 5 Server:
   - Spawns 50 parallel browser windows (Claude Code sessions)
   - Starts branch watcher: watch_and_merge_branches.cjs

3. Each Claude Code session:
   - Generates baskets for its segment
   - Runs: node scripts/push_segment.cjs segment-042.json
   - Script strips metadata (418KB → 2KB)
   - Pushes to claude/baskets-segment-042 branch

4. Branch watcher detects all 50 branches ready:
   - Pulls all segment files
   - Merges into single lego_baskets.json
   - Pushes to main branch
   - Triggers Vercel deployment
   - Deletes claude/baskets-* branches

5. Phase 5 Server → Orchestrator: POST /phase-complete
```

## Migration Plan

### Step 1: Extract Phase Servers (Non-Breaking)

Keep existing automation_server.cjs but create new phase servers in parallel:

```bash
services/
├── orchestration/
│   └── orchestrator.cjs          # NEW - lightweight coordinator
└── phases/
    ├── phase1-translation-server.cjs    # Extract from automation_server.cjs
    ├── phase3-lego-extraction-server.cjs
    ├── phase5-basket-server.cjs         # Integrates debug-connectivity tools
    ├── phase6-introduction-server.cjs
    └── phase8-audio-server.cjs
```

### Step 2: Test Phase Servers Independently

Start individual phase servers and test:
```bash
# Terminal 1
node services/phases/phase5-basket-server.cjs

# Terminal 2
curl -X POST http://localhost:3459/start \
  -H "Content-Type: application/json" \
  -d '{"courseCode": "spa_for_eng", "totalSeeds": 668}'
```

### Step 3: Integrate with Orchestrator

Update orchestrator to delegate to phase servers instead of handling directly.

### Step 4: Deprecate Monolith

Once all phases work through new architecture:
```bash
mv automation_server.cjs automation_server.cjs.deprecated
```

## Benefits

1. **Modularity**: Each phase is independent, can be developed/tested/deployed separately
2. **Resilience**: Phase 3 crash doesn't kill Phase 5
3. **Scalability**: Can run phase servers on different machines
4. **Maintainability**: 500-1000 lines per file vs 10K monolith
5. **Integration**: debug-connectivity tools fit naturally into Phase 5 server
6. **Debugging**: `pm2 logs phase5-server` vs grepping 10K lines
7. **Team Development**: Different developers can own different phases

## Integration with debug-connectivity Branch

The Phase 5 server will use all three tools from the branch:

1. **push_segment.cjs** - Claude sessions use this to push segments
2. **watch_and_merge_branches.cjs** - Phase 5 server runs this as child process
3. **strip_phase5_metadata.cjs** - Automatically strips bloat before merge

This makes the debug-connectivity tools a core part of Phase 5 automation.

## Next Steps

1. **Review this architecture** - Does it fit your vision?
2. **Start with Phase 5 server** - Extract Phase 5 logic, integrate debug-connectivity tools
3. **Test Phase 5 independently** - Run parallel basket generation end-to-end
4. **Extract other phases** - Phase 1, 3, 6, 8
5. **Build orchestrator** - Lightweight coordinator
6. **Deprecate monolith** - Archive automation_server.cjs

## Questions to Resolve

1. Should orchestrator also handle dashboard data APIs? (I vote yes - keeps port 3456 for compatibility)
2. Should phase servers auto-start on boot? (I vote yes - via PM2)
3. Should we add message queue (Redis/RabbitMQ) between orchestrator and phase servers? (Maybe later)
4. Should phase servers be RESTful or use webhooks to notify orchestrator? (RESTful for now, webhooks if needed)
