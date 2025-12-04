# Service Startup Guide

## Overview

The SSi Dashboard v7 has multiple services that can be started in different ways depending on your use case. This guide explains what services exist, when to use them, and how to start them.

## Service Startup Methods

### 1. `start-automation.cjs` - Local Development & Pipeline Processing

**What it starts:**
- Orchestrator (Port 3456)
- Phase 1: Translation (Port 3457)
- Phase 1: LEGO Extraction (Port 3458)
- Phase 3: Basket Generation (Port 3459)
- Phase 7: Manifest Compilation (Port 3464)
- Phase 8: Audio Generator (Port 3465)
- Phase 9: Manifest Compiler (Port 3466)
- Production API (Port 3470)

**When to use:**
- Local development and testing
- Running the full course generation pipeline
- Agent-based content processing
- All services connect via localhost

**How to start:**
```bash
npm run automation
# or
node start-automation.cjs
```

**Configuration:**
- Requires `.env.automation` with `VFS_ROOT` set
- All services auto-configured with correct ports
- Services communicate via localhost URLs

---

### 2. `ecosystem.config.cjs` - PM2 Production Deployment

**What it starts:**
- Everything in `start-automation.cjs` PLUS:
  - Dashboard UI (Port 5173)
  - Progress API (Port 3462) - **DEPRECATED**
  - Ngrok Proxy (Port 3463) - **PRODUCTION SERVICE**
  - Ngrok Tunnel (external) - **PRODUCTION SERVICE**

**When to use:**
- Production deployments
- Running services as background daemons
- External agent access via ngrok
- Persistent service management

**How to start:**
```bash
# Start all services
pm2 start ecosystem.config.cjs

# Start specific services
pm2 start ecosystem.config.cjs --only ssi-orchestrator,phase3-baskets

# Start ngrok services for external access
pm2 start ecosystem.config.cjs --only ngrok-proxy,ngrok-tunnel
```

---

## Service Details

### Core Pipeline Services (in both startup methods)

| Service | Port | Status | Started By |
|---------|------|--------|------------|
| Orchestrator | 3456 | ✅ Active | start-automation + PM2 |
| Phase 1: Translation | 3457 | ✅ Active | start-automation + PM2 |
| Phase 1: LEGO Extraction | 3458 | ✅ Active | start-automation + PM2 |
| Phase 3: Basket Generation | 3459 | ✅ Active | start-automation + PM2 |
| Phase 7: Manifest Compilation | 3464 | ✅ Active | start-automation + PM2 |
| Phase 8: Audio Generator | 3465 | ✅ Active | start-automation + PM2 |
| Phase 9: Manifest Compiler | 3466 | ✅ Active | start-automation + PM2 |
| Production API | 3470 | ✅ Active | start-automation + PM2 |

### PM2-Only Services

| Service | Port | Status | Why Not in start-automation? |
|---------|------|--------|------------------------------|
| Dashboard UI | 5173 | ✅ Active | Typically run separately via `npm run dev` |
| **Progress API** | **3462** | **⚠️ DEPRECATED** | **Not used - replaced by orchestrator WebSocket** |
| **Ngrok Proxy** | **3463** | **✅ Active** | **Only needed for external agent access** |
| **Ngrok Tunnel** | **N/A** | **✅ Active** | **Requires ngrok proxy, external-only** |

---

## Services Explained

### ✅ Active Production Services

#### Ngrok Proxy (Port 3463)
**File:** `services/api/ngrok-proxy.cjs`

**Purpose:** Reverse proxy that routes external traffic to internal services

**Routes:**
- `/api/production/*` → Production API (Port 3470)
- `/api/*` → Orchestrator (Port 3456)
- `/phase1/*` → Phase 1 Translation (Port 3457)
- `/phase3/*` → Phase 1 LEGO Extraction (Port 3458)
- `/phase5/*` → Phase 3 Baskets (Port 3459)
- `/phase8/*` → Phase 8 Audio (Port 3465)

**Used by:**
- Dashboard `EnvironmentSwitcher.vue` (Tom's Machine option)
- External agents working via Claude Projects
- Remote access to local services

**Why not in start-automation:**
- Requires ngrok tunnel (separate process)
- Only needed for external agent access
- Local development uses direct localhost connections

**How to start manually:**
```bash
# Start proxy
PORT=3463 node services/api/ngrok-proxy.cjs

# Start ngrok tunnel (in separate terminal)
ngrok http 3463 --domain=mirthlessly-nonanesthetized-marilyn.ngrok-free.dev
```

**How to start with PM2:**
```bash
pm2 start ecosystem.config.cjs --only ngrok-proxy,ngrok-tunnel
```

---

### ⚠️ Deprecated Services

#### Progress Tracker API (Port 3462)
**File:** `services/api/progress-tracker.cjs`

**Status:** DEPRECATED - NOT USED IN PRODUCTION

**Purpose (historical):**
Unified progress tracking API across all phases, created during v9 development.

**Why deprecated:**
- Dashboard now uses orchestrator WebSocket (port 3456) for real-time progress
- Production API (port 3470) provides status endpoints for QA workflow
- Phase servers have their own status endpoints

**Replacement:**
- Real-time progress: `ws://localhost:3456` (orchestrator WebSocket)
- QA workflow: `http://localhost:3470/api/production/:course/status`
- Phase-specific: Each phase server has `/status/:courseCode` endpoint

**Still exists because:**
- Kept in PM2 config for manual testing/debugging
- May be useful for historical data analysis
- Could be re-enabled if needed for specific use cases

**How to start manually (for debugging):**
```bash
PORT=3462 node services/api/progress-tracker.cjs
```

---

## Quick Reference

### Local Development (Pipeline Processing)
```bash
# Start all pipeline services
npm run automation

# Access orchestrator
curl http://localhost:3456/api/health
```

### Production Deployment (PM2)
```bash
# Start everything
pm2 start ecosystem.config.cjs

# Start core pipeline only
pm2 start ecosystem.config.cjs --only ssi-orchestrator,phase1-translation,phase2-conflict,phase3-baskets,phase7-manifest,phase8-audio,phase9-manifest,production-api

# Start external access (ngrok)
pm2 start ecosystem.config.cjs --only ngrok-proxy,ngrok-tunnel

# Monitor
pm2 list
pm2 logs
```

### External Agent Access
```bash
# Start ngrok services
pm2 start ecosystem.config.cjs --only ngrok-proxy,ngrok-tunnel

# Public URL
https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev
```

---

## Environment Variables

### Required for All Services
```bash
VFS_ROOT=/path/to/public/vfs/courses
```

### Required for Audio Generation (Phase 8)
```bash
AZURE_SPEECH_KEY=xxxxx
AZURE_SPEECH_REGION=westeurope
ELEVENLABS_API_KEY=xxxxx
```

### Required for S3 Sync
```bash
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_REGION=eu-west-1
S3_BUCKET=popty-bach-lfs
```

### Required for Supabase (Phase 8 & 9)
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_xxxxx
```

---

## Troubleshooting

### Service won't start
1. Check environment variables in `.env.automation` or `.env`
2. Verify VFS_ROOT path exists
3. Check port isn't already in use: `lsof -i :PORT`
4. Review logs: `pm2 logs SERVICE_NAME`

### Ngrok not accessible
1. Verify ngrok-proxy is running: `pm2 list | grep ngrok-proxy`
2. Verify ngrok-tunnel is running: `pm2 list | grep ngrok-tunnel`
3. Check ngrok domain matches: `mirthlessly-nonanesthetized-marilyn.ngrok-free.dev`
4. Test locally first: `curl http://localhost:3463/health`

### Progress tracking not working
1. Don't use progress-tracker (port 3462) - it's deprecated
2. Use orchestrator WebSocket: `ws://localhost:3456`
3. Or use production API: `http://localhost:3470/api/production/:course/status`

---

## See Also

- `/docs/setup/PM2_SETUP.md` - PM2 configuration guide
- `/docs/workflows/AUDIO_GENERATION_WORKFLOW.md` - Audio pipeline
- `/CLAUDE.md` - Agent onboarding guide
- `/ecosystem.config.cjs` - PM2 service definitions
- `/start-automation.cjs` - Automation startup script
