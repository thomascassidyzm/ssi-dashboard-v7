# API & Server Architecture Audit

**Generated**: 2025-11-17
**Project**: SSi Dashboard v7 Clean
**Location**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean`

---

## Executive Summary

The SSi Dashboard architecture has **TWO MODES**:

1. **LEGACY MODE** (currently active): Monolithic `automation_server.cjs` on port 3456
2. **LAYERED MODE** (future): Orchestrator + 5 phase servers on ports 3456-3461

**TRUTH**: Only the monolithic server is production-ready. Layered services exist but are not complete.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT LAYERS                            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  FRONTEND (Vercel)                                                    │
│  • Dashboard UI (Vue 3 + Vite)                                        │
│  • Static hosting on https://ssi-dashboard-v7.vercel.app             │
│  • Port 5173 in dev mode                                              │
│  • Serverless API routes in /api/ (Vercel Functions)                 │
│    - /api/intelligence/[phase].js                                     │
│    - /api/courses/[courseCode]/outputs.js                             │
│    - /api/courses/[courseCode]/baskets/[seedId].js                    │
│    - /api/courses/[courseCode]/introductions/[legoId].js              │
│    - /api/courses/[courseCode]/translations/[uuid].js                 │
└──────────────────────────────────────────────────────────────────────┘
                              ↓ HTTP(S)
┌──────────────────────────────────────────────────────────────────────┐
│  NGROK TUNNEL (Managed by PM2)                                        │
│  • Domain: mirthlessly-nonanesthetized-marilyn.ngrok-free.dev        │
│  • Exposes: Port 3456 → Public HTTPS                                  │
│  • Purpose: Allow Vercel frontend to call local automation server    │
└──────────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│  BACKEND SERVERS (Local Mac)                                          │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  LEGACY MODE (Active)                                           │  │
│  │  • automation_server.cjs                                        │  │
│  │  • Port: 3456                                                   │  │
│  │  • 92 API endpoints (monolithic)                                │  │
│  │  • Manages: VFS, course generation, validation, audio, S3 sync  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  LAYERED MODE (Incomplete/Future)                               │  │
│  │                                                                  │  │
│  │  Port 3456: services/orchestration/orchestrator.cjs             │  │
│  │             • Coordinates phases                                 │  │
│  │             • Read-only APIs (courses, VFS, metrics)             │  │
│  │             • Checkpoint management                              │  │
│  │                                                                  │  │
│  │  Port 3457: services/phases/phase1-translation-server.cjs       │  │
│  │             • Spawns parallel translation agents                 │  │
│  │             • Merges seed_pairs.json                             │  │
│  │                                                                  │  │
│  │  Port 3458: services/phases/phase3-lego-extraction-server.cjs   │  │
│  │             • LEGO extraction orchestration                      │  │
│  │             • Re-extraction on collisions                        │  │
│  │                                                                  │  │
│  │  Port 3459: services/phases/phase5-basket-server.cjs            │  │
│  │             • Basket generation                                  │  │
│  │             • Regeneration endpoint                              │  │
│  │                                                                  │  │
│  │  Port 3460: services/phases/phase6-introduction-server.cjs      │  │
│  │             • Introduction generation                            │  │
│  │                                                                  │  │
│  │  Port 3461: services/phases/phase8-audio-server.cjs (STUB)      │  │
│  │             • Not yet implemented                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│  DATA LAYER                                                            │
│  • VFS Root: /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/...  │
│  • S3 Bucket: (configured in .env)                                     │
│  • Course data: public/vfs/courses/{courseCode}/                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Port Mapping

| Port | Service | Status | Purpose |
|------|---------|--------|---------|
| **3456** | automation_server.cjs (LEGACY) | ✅ ACTIVE | Monolithic API server - all endpoints |
| **3456** | orchestrator.cjs (LAYERED) | ⚠️ INCOMPLETE | Phase coordinator (alternative mode) |
| **3457** | phase1-translation-server.cjs | ⚠️ INCOMPLETE | Translation orchestration |
| **3458** | phase3-lego-extraction-server.cjs | ⚠️ INCOMPLETE | LEGO extraction |
| **3459** | phase5-basket-server.cjs | ⚠️ INCOMPLETE | Basket generation |
| **3460** | phase6-introduction-server.cjs | ⚠️ INCOMPLETE | Introduction generation |
| **3461** | phase8-audio-server.cjs | ❌ STUB | Audio/TTS (not implemented) |
| **5173** | Vite dev server | 🔧 DEV ONLY | Frontend development |

**Note**: Ports 3456-3461 are auto-configured via `BASE_PORT` env var in `start-automation.cjs`

---

## Server Instance Inventory

### 1. Automation Server (Monolithic - LEGACY)

**File**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/automation_server.cjs`
**Lines**: 10,550
**Port**: 3456 (configurable via `PORT` env var)
**Status**: ✅ Production Ready
**Started by**: `npm run server` OR `pm2 start ecosystem.config.cjs`

**Configuration** (from .env.automation):
```bash
VFS_ROOT=/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses
CHECKPOINT_MODE=gated  # manual | gated | full
BASE_PORT=3456
```

**CORS Origins**:
- `http://localhost:5173` (Vite dev)
- `http://localhost:3000`
- `https://ssi-dashboard-v7.vercel.app`
- `*.vercel.app` (all preview deployments)

**Total Endpoints**: 92

---

### 2. Orchestrator (Layered Architecture)

**File**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/services/orchestration/orchestrator.cjs`
**Port**: 3456 (backward compatible)
**Status**: ⚠️ Incomplete (future mode)
**Started by**: `npm run automation` (when LEGACY_MODE=false)

**Purpose**:
- Serve read-only dashboard APIs (courses, VFS, metrics)
- Trigger phase servers in sequence (1 → 3 → 5 → 6 → 8)
- Checkpoint management (manual/gated/full modes)
- Health monitoring of phase servers

**Key Endpoints** (29 total):
```
GET  /api/courses
GET  /api/courses/:courseCode
GET  /api/courses/:courseCode/status
POST /api/courses/:courseCode/start-phase
POST /api/courses/generate
POST /phase-complete  # Phase servers callback here
GET  /health
GET  /health/all  # Check all phase servers
GET  /api/languages
GET  /api/courses/validate/all
GET  /api/courses/:courseCode/validate
POST /api/courses/:courseCode/phase/3/validate
POST /api/courses/:courseCode/phase/3/infinitive-check
POST /api/courses/:courseCode/phase/3/fix-collisions
GET  /api/courses/:courseCode/baskets/gaps
POST /api/courses/:courseCode/baskets/cleanup
POST /api/courses/:courseCode/baskets/regenerate
GET  /api/vfs/courses/:code/:file(*)
```

**Phase Server Coordination**:
```javascript
PHASE_SERVERS = {
  1: process.env.PHASE1_URL || 'http://localhost:3457',
  3: process.env.PHASE3_URL || 'http://localhost:3458',
  5: process.env.PHASE5_URL || 'http://localhost:3459',
  6: process.env.PHASE6_URL || 'http://localhost:3460',
  8: process.env.PHASE8_URL || 'http://localhost:3461'
}
```

---

### 3. Phase 1 Server (Translation)

**File**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/services/phases/phase1-translation-server.cjs`
**Port**: 3457
**Status**: ⚠️ Incomplete

**Endpoints**:
```
POST /start           # Start translation for a course
GET  /status/:courseCode
POST /stop/:courseCode
POST /phase-complete  # Internal callback
GET  /health
```

**Responsibilities**:
- Spawn parallel Claude Code browser sessions
- Coordinate multiple translation agents (70 seeds/agent typical)
- Watch for phase1-* branches
- Merge outputs into seed_pairs.json
- Validate translation quality
- Write to VFS
- Report completion to orchestrator

---

### 4. Phase 3 Server (LEGO Extraction)

**File**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/services/phases/phase3-lego-extraction-server.cjs`
**Port**: 3458
**Status**: ⚠️ Incomplete

**Endpoints**:
```
POST /start           # Start LEGO extraction
GET  /status/:courseCode
POST /stop/:courseCode
POST /phase-complete  # Internal callback
POST /reextract       # Re-extract after collision fixes
GET  /health
```

**Responsibilities**:
- LEGO extraction orchestration
- FD/LUT collision detection
- Infinitive form validation
- Re-extraction workflow
- Write lego_pairs.json to VFS

---

### 5. Phase 5 Server (Basket Generation)

**File**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/services/phases/phase5-basket-server.cjs`
**Port**: 3459
**Status**: ⚠️ Incomplete

**Endpoints**:
```
POST /start             # Start basket generation
GET  /status/:courseCode
POST /abort/:courseCode
POST /regenerate        # Regenerate specific baskets
GET  /health
```

**Responsibilities**:
- Generate practice baskets from LEGOs
- Eternal/debut phrase creation
- Batch-aware edge targeting
- Write lego_baskets.json to VFS

---

### 6. Phase 6 Server (Introductions)

**File**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/services/phases/phase6-introduction-server.cjs`
**Port**: 3460
**Status**: ⚠️ Incomplete

**Endpoints**:
```
POST /start             # Start introduction generation
GET  /status/:courseCode
GET  /health
```

**Responsibilities**:
- Generate introduction presentations for LEGOs
- Read lego_pairs.json
- Create natural language intros (BASE/COMPOSITE)
- Write introductions.json to VFS

**Implementation**: Calls `scripts/phase6-generate-introductions.cjs`

---

### 7. Phase 8 Server (Audio/TTS)

**File**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/services/phases/phase8-audio-server.cjs`
**Port**: 3461
**Status**: ❌ STUB (Not Implemented)

**Endpoints**:
```
POST /start   # Returns 501 Not Implemented
GET  /health  # Returns stub status
```

**Note**: Audio generation currently handled by automation_server.cjs in legacy mode via:
- `services/tts-service.cjs`
- `services/s3-audio-service.cjs`

---

### 8. Vite Dev Server (Frontend)

**File**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vite.config.js`
**Port**: 5173
**Status**: 🔧 Dev Only
**Started by**: `npm run dev`

**Configuration**:
```javascript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:3456',
      changeOrigin: true,
      secure: false
    }
  }
}
```

**Purpose**: Development frontend with API proxy to automation server

---

## Complete Endpoint Map

### Automation Server (Monolithic - 92 Endpoints)

#### Course Management
```
POST   /api/courses/generate
GET    /api/courses
GET    /api/courses/list
GET    /api/courses/:courseCode
GET    /api/courses/:courseCode/status
DELETE /api/courses/:courseCode/status
DELETE /api/courses/:courseCode/job
GET    /api/courses/:code/manifest
POST   /api/courses/generate-code
```

#### Validation & Analysis
```
GET  /api/courses/validate/all
GET  /api/courses/:courseCode/validate
GET  /api/courses/:courseCode/validate/deep
GET  /api/courses/:courseCode/validate/deep/:phase
POST /api/courses/:courseCode/validate/:phase
POST /api/validate/phase/:phase
GET  /api/courses/:courseCode/analyze
```

#### Phase Execution
```
POST /api/courses/:courseCode/rerun/:phase
POST /api/courses/:courseCode/phase/1/prepare
POST /api/courses/:courseCode/phase/1/orchestrate
GET  /api/courses/:courseCode/phase/1/orchestrators/status
POST /api/courses/:courseCode/phase/1/validate
POST /api/courses/:courseCode/phase/2
POST /api/courses/:courseCode/phase/4
GET  /api/courses/:courseCode/phase/4/status
POST /api/courses/:courseCode/phase/5
GET  /api/courses/:courseCode/phase/5/status
POST /api/courses/:courseCode/phase/5/merge
POST /api/courses/:courseCode/phase/6
POST /api/courses/:courseCode/compile
POST /api/courses/:courseCode/deploy
```

#### Baskets (Phase 5)
```
POST /api/courses/:code/baskets/generate
GET  /api/courses/:courseCode/baskets
GET  /api/courses/:courseCode/baskets/:seedId
PUT  /api/courses/:courseCode/baskets/:seedId
POST /api/courses/:courseCode/baskets/:seedId/flag
POST /api/courses/:courseCode/baskets/:seedId/regenerate
POST /api/courses/:courseCode/baskets/validate
```

#### Introductions (Phase 6)
```
PUT /api/courses/:courseCode/introductions/:legoId
```

#### Quality & Regeneration
```
GET    /api/courses/:code/quality
GET    /api/courses/:code/seeds/:seedId/review
POST   /api/courses/:code/seeds/regenerate
GET    /api/courses/:code/regeneration/:jobId
GET    /api/courses/:code/regeneration/:jobId/status
POST   /api/courses/:code/seeds/:seedId/accept
DELETE /api/courses/:code/seeds/:seedId
```

#### Prompt Evolution (Self-Learning)
```
GET  /api/courses/:code/prompt-evolution
GET  /api/courses/:code/learned-rules
POST /api/courses/:code/experimental-rules
POST /api/courses/:code/prompt-evolution/commit
```

#### Translations & LEGOs
```
GET /api/courses/:courseCode/provenance/:seedId
PUT /api/courses/:courseCode/translations/:uuid
PUT /api/courses/:courseCode/breakdowns/:seedId
GET /api/courses/:code/seed-lego-breakdown
PUT /api/courses/:code/seeds/:seedId/lego-breakdown
GET /api/courses/:code/lego/:legoProvenance/basket
```

#### Visualization
```
GET /api/visualization/legos/:code
GET /api/visualization/seed/:uuid
GET /api/visualization/phrases/:code
```

#### Languages & Prompts
```
GET /api/languages
GET /api/prompts/:phase
PUT /api/prompts/:phase
GET /api/prompts/:phase/history
GET /api/phase-prompts/status
```

#### Skills (Phase Intelligence)
```
GET /api/skills
GET /api/skills/:skillId
GET /api/skills/:skillId/file/*
GET /api/skills/used-by/:phase
```

#### VFS (Virtual File System)
```
GET    /api/vfs/courses
GET    /api/vfs/courses/:code/:file(*)
PUT    /api/vfs/courses/:code/:file(*)
DELETE /api/vfs/courses/:code/:file(*)
GET    /api/courses/:courseCode/vfs/:filename
```

#### S3 Storage
```
GET  /api/storage/test-s3
GET  /api/storage/courses
POST /api/storage/sync/:courseCode
POST /api/storage/download/:courseCode
```

#### Audio (Phase 8)
```
POST /api/audio/check-s3
POST /api/audio/generate
POST /api/audio/generate-missing
GET  /api/audio/generation-status/:jobId
```

#### Metadata & Utilities
```
GET /api/seeds
GET /api/apml/full
GET /api/metrics/generations
GET /api/health  (appears twice in code - one is duplicate)
```

#### Fine-Tuning (Experimental)
```
GET  /api/fine-tuning/ready
POST /api/fine-tuning/start
GET  /api/fine-tuning/status/:jobId
POST /api/fine-tuning/compare
```

#### Phase Intelligence Docs
```
GET /phase-intelligence/:phase  # Returns markdown from public/docs/phase_intelligence/
```

#### Phase 5 Web Agents (Experimental)
```
POST /api/phase5/spawn-web-agents
GET  /api/phase5/progress/:batchName
```

---

### Vercel Serverless Functions (5 Endpoints)

**Location**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/api/`

These are serverless functions deployed to Vercel, callable from the frontend:

```
GET  /api/intelligence/[phase]
     → Returns raw markdown for phase intelligence
     → File: api/intelligence/[phase].js
     → Sources: docs/phase_intelligence/*.md

POST /api/courses/[courseCode]/outputs
     → Receives extraction outputs from Claude Code agents
     → Writes to VFS (no git branch merging)
     → File: api/courses/[courseCode]/outputs.js

GET  /api/courses/[courseCode]/baskets/[seedId]
     → Fetch specific basket data
     → File: api/courses/[courseCode]/baskets/[seedId].js

GET  /api/courses/[courseCode]/introductions/[legoId]
     → Fetch introduction for specific LEGO
     → File: api/courses/[courseCode]/introductions/[legoId].js

PUT  /api/courses/[courseCode]/translations/[uuid]
     → Update translation amino acid
     → File: api/courses/[courseCode]/translations/[uuid].js
```

**Note**: These are Vercel edge functions, NOT Express routes. They run on Vercel's infrastructure.

---

## PM2 Ecosystem Configuration

**File**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/ecosystem.config.cjs`

**Managed Processes**:

### 1. ssi-automation
```javascript
{
  name: 'ssi-automation',
  script: 'start-automation.cjs',
  port: 3456,
  env: {
    NODE_ENV: 'development',
    PORT: 3456,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    S3_BUCKET: process.env.S3_BUCKET,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
  }
}
```

**What it actually runs**:
- Checks if `services/orchestration/orchestrator.cjs` exists
- If yes: Starts layered services (ports 3456-3461)
- If no (or LEGACY_MODE=true): Starts `automation_server.cjs` on port 3456

**Current behavior**: Runs LEGACY mode (monolithic server)

### 2. dashboard-ui
```javascript
{
  name: 'dashboard-ui',
  script: 'npm',
  args: 'run dev',
  port: 5173,  // Vite dev server
  env: {
    NODE_ENV: 'development',
    VITE_API_BASE_URL: 'http://localhost:3456'
  }
}
```

**Purpose**: Starts Vite dev server for local frontend development

### 3. ngrok-tunnel
```javascript
{
  name: 'ngrok-tunnel',
  script: 'ngrok',
  args: 'http --domain=mirthlessly-nonanesthetized-marilyn.ngrok-free.dev 3456',
  port: 3456  // Exposes this port
}
```

**Purpose**: Creates public HTTPS tunnel to automation server so Vercel-hosted dashboard can call it

---

## Truth vs Configuration vs Dead Code

### ✅ ACTUALLY RUNNING (Production)

**PM2 Ecosystem**:
1. `automation_server.cjs` on port 3456 (LEGACY mode)
2. `dashboard-ui` on port 5173 (dev mode only)
3. `ngrok-tunnel` exposing port 3456

**Vercel Deployment**:
1. Static Vue 3 dashboard on https://ssi-dashboard-v7.vercel.app
2. 5 serverless API routes in `/api/` directory
3. VFS data served from `/public/vfs/`

### ⚠️ CONFIGURED BUT INCOMPLETE

**Layered Services** (ports 3456-3461):
- Code exists in `services/` directory
- Configured in `start-automation.cjs`
- NOT production-ready (orchestrator has incomplete endpoints)
- Can be started with `LEGACY_MODE=false npm run automation`

### ❌ DEAD CODE / DEPRECATED

**Root directory chaos**:
- 30+ phase5 processing scripts (experimental iterations)
- Multiple merge scripts (phase3, baskets)
- Old orchestrator variants
- These are NOT used in production

**Duplicates**:
- `automation_server.cjs` (root) - ✅ ACTIVE
- `tools/orchestrators/automation_server.cjs` - ❌ COPY
- `scripts/automation/automation_server.cjs` - ❌ COPY
- `services/orchestration/orchestrator.cjs.FULL_BACKUP` - ❌ BACKUP

---

## Data Flow Architecture

### Course Generation Flow

```
User clicks "Generate Course" in Dashboard
        ↓
POST /api/courses/generate (Vercel → ngrok → automation_server:3456)
        ↓
automation_server spawns orchestrator via osascript
        ↓
Orchestrator (Claude Code) executes phases 1→3→5→6→7
        ↓
Each phase writes to VFS: public/vfs/courses/{courseCode}/
        ↓
Dashboard polls: GET /api/courses/:courseCode/status
        ↓
On completion: Course data available via VFS endpoints
```

### Agent Output Flow (Alternative)

```
Claude Code Agent (browser session)
        ↓
POST /api/courses/{courseCode}/outputs (Vercel serverless function)
        ↓
Writes directly to public/vfs/courses/{courseCode}/
        ↓
No git branching required
        ↓
Dashboard reflects changes immediately
```

---

## Phase Intelligence Documentation

**Location**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/docs/phase_intelligence/`

**Files** (15 total):
```
phase_1_orchestrator.md         # Master prompt for Phase 1
phase_1_seed_pairs.md           # Translation methodology v2.6
phase_3_lego_pairs_v7.md        # LEGO extraction v4.0.2
phase_3_lego_pairs.md           # (duplicate/older version)
phase_3_orchestrator.md         # Master prompt for Phase 3
phase_5_lego_baskets.md         # Basket generation v2.2
phase_5_complete_pipeline.md    # Full Phase 5 workflow
phase_5_orchestrator.md         # Master prompt for Phase 5
phase_5.5_basket_deduplication.md  # Deduplication v2.0
phase_5.5_grammar_review.md     # Grammar validation
phase_6_introductions.md        # Introduction generation v2.0
phase_7_compilation.md          # Manifest compilation v1.0
phase_8_audio_generation.md     # TTS + S3 upload v1.0
PHASE_EVOLUTION.md              # Version history
README.md                       # Intelligence index
```

**How They're Served**:
1. **Via automation_server**: `GET /phase-intelligence/:phase`
2. **Via Vercel function**: `GET /api/intelligence/[phase]`
3. **Loaded at startup**: Into `PHASE_PROMPTS` object in automation_server.cjs

**Purpose**: These are the "DNA" of the course generation system. Claude Code agents fetch these to understand how to execute each phase.

---

## Environment Configuration

### .env.automation (Active)
```bash
VFS_ROOT=/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses
CHECKPOINT_MODE=gated  # manual | gated | full
BASE_PORT=3456
```

### .env (Shared Defaults)
Contains AWS credentials, S3 bucket, Anthropic API key

### .env.production (Vercel)
Minimal config for Vercel deployment

---

## Critical Architectural Decisions

### 1. **Ngrok Tunnel Necessity**

**Why?**
- Dashboard deployed on Vercel (static hosting)
- Automation server runs locally (Mac mini)
- Vercel can't directly call `localhost:3456`
- Ngrok creates public HTTPS endpoint

**Alternative**: Deploy automation server to cloud (AWS/Railway/Render)

### 2. **Layered vs Monolithic**

**Current**: Monolithic (all endpoints in one 10,550-line file)
**Future**: Layered (orchestrator + 5 phase servers)
**Blocker**: Orchestrator incomplete, missing many endpoints from monolith

**Recommendation**: Complete layered refactor OR embrace monolith (it works!)

### 3. **Vercel Serverless Functions**

**Purpose**: Allow agents to POST outputs directly without ngrok dependency
**Status**: Working, but limited usage (only 5 endpoints)
**Gap**: Most APIs still require automation_server via ngrok

### 4. **VFS Architecture**

**Current**: Local filesystem (`public/vfs/courses/`)
**Sync**: Manual S3 sync via `/api/storage/sync/:courseCode`
**Issue**: No real-time collaboration (single developer workflow)

---

## Port Usage Summary

| Port | Service | Mode | Status |
|------|---------|------|--------|
| 3456 | Automation Server OR Orchestrator | Both | ✅ One or the other |
| 3457 | Phase 1 Server | Layered Only | ⚠️ Incomplete |
| 3458 | Phase 3 Server | Layered Only | ⚠️ Incomplete |
| 3459 | Phase 5 Server | Layered Only | ⚠️ Incomplete |
| 3460 | Phase 6 Server | Layered Only | ⚠️ Incomplete |
| 3461 | Phase 8 Server | Layered Only | ❌ Stub |
| 5173 | Vite Dev Server | Dev Only | 🔧 Local dev |
| N/A | Ngrok Tunnel | Production | ✅ Exposes 3456 |

**TRUTH**: Only port 3456 is active in production (monolithic server)

---

## Recommendations

### Immediate
1. **Document current state as canonical**: Monolith works, don't break it
2. **Clean up root directory**: Move/delete 30+ experimental phase5 scripts
3. **Mark layered services as WIP**: Add warnings or disable incomplete servers
4. **Consolidate duplicates**: Delete copied automation_server.cjs files

### Short-term
1. **Complete layered refactor OR remove it**: Half-finished architecture is technical debt
2. **Move more endpoints to Vercel functions**: Reduce ngrok dependency
3. **Add health checks**: Monitoring for ngrok tunnel uptime
4. **Document which mode is "blessed"**: Make a decision (layered vs monolithic)

### Long-term
1. **Consider cloud deployment**: AWS Lambda, Railway, or Render for automation server
2. **Real-time collaboration**: Replace local VFS with database or cloud storage
3. **Containerization**: Docker for consistent deployment
4. **Service mesh**: If going layered, use proper service discovery

---

## Quick Start Guide

### Run Legacy Mode (Current Production)
```bash
# Start all services via PM2
pm2 start ecosystem.config.cjs

# Or manually
npm run automation  # Starts automation_server.cjs on 3456

# In another terminal
npm run dev  # Vite dev server on 5173
```

### Run Layered Mode (Experimental)
```bash
# Set environment
export LEGACY_MODE=false

# Start layered services
npm run automation
# This starts:
#   - Orchestrator on 3456
#   - Phase 1 on 3457
#   - Phase 3 on 3458
#   - Phase 5 on 3459
#   - Phase 6 on 3460
#   - Phase 8 on 3461 (stub)
```

### Check What's Running
```bash
# PM2 status
pm2 list

# Manual port check
lsof -i :3456
lsof -i :5173

# Test health endpoints
curl http://localhost:3456/api/health
curl http://localhost:3457/health  # If layered mode
```

---

## Glossary

- **VFS**: Virtual File System (local course data storage)
- **APML**: Adaptive Pedagogy Markup Language (course data format)
- **LEGO**: Reusable language component (Phase 3 output)
- **Basket**: Practice phrase set (Phase 5 output)
- **Amino Acid**: Individual course data unit
- **Checkpoint Mode**: Controls phase automation (manual/gated/full)
- **Orchestrator**: Coordinates multi-phase course generation
- **Phase Intelligence**: Markdown docs defining how each phase works

---

## Files Referenced

**Server Code**:
- `automation_server.cjs` (10,550 lines, 92 endpoints)
- `start-automation.cjs` (244 lines, mode selector)
- `services/orchestration/orchestrator.cjs` (1,827 lines, 29 endpoints)
- `services/phases/phase1-translation-server.cjs` (553 lines, 5 endpoints)
- `services/phases/phase3-lego-extraction-server.cjs` (1,441 lines, 6 endpoints)
- `services/phases/phase5-basket-server.cjs` (1,143 lines, 5 endpoints)
- `services/phases/phase6-introduction-server.cjs` (107 lines, 3 endpoints)
- `services/phases/phase8-audio-server.cjs` (28 lines, 2 endpoints - stub)

**Configuration**:
- `ecosystem.config.cjs` (PM2 process management)
- `vite.config.js` (Frontend dev server)
- `vercel.json` (Vercel deployment config)
- `.env.automation` (Local server config)

**API Routes** (Vercel):
- `api/intelligence/[phase].js`
- `api/courses/[courseCode]/outputs.js`
- `api/courses/[courseCode]/baskets/[seedId].js`
- `api/courses/[courseCode]/introductions/[legoId].js`
- `api/courses/[courseCode]/translations/[uuid].js`

---

**End of Audit**
Generated by Claude Code on 2025-11-17
