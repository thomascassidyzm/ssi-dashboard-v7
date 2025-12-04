# Service Mesh Configuration

> Documentation for service discovery and inter-service communication URLs

## Overview

The SSi automation system uses a **service mesh architecture** where multiple microservices communicate via HTTP. Service URLs are automatically configured by `start-automation.cjs` and passed to all services via environment variables.

**Key Principle:** Services discover each other through environment variables, not hardcoded URLs. This allows flexible deployment (localhost, ngrok tunnels, remote servers).

## Service Mesh URLs

These environment variables are automatically set by `start-automation.cjs` when you run `npm run automation`:

### Core Service URLs

| Variable | Default | Port | Purpose |
|----------|---------|------|---------|
| `ORCHESTRATOR_URL` | `http://localhost:3456` | 3456 | Main orchestrator - coordinates pipeline execution |
| `PHASE1_TRANSLATION_URL` | `http://localhost:3457` | 3457 | Translation service (Phase 1a) |
| `PHASE1_LEGO_URL` | `http://localhost:3458` | 3458 | LEGO extraction + conflict resolution (Phase 1b + 2) |
| `PHASE3_URL` | `http://localhost:3459` | 3459 | Basket generation service (Phase 3) |
| `MANIFEST_URL` | `http://localhost:3464` | 3464 | Legacy manifest compilation (deprecated) |
| `PHASE8_URL` | `http://localhost:3465` | 3465 | Audio generation service (Supabase-backed) |
| `PHASE9_URL` | `http://localhost:3466` | 3466 | Manifest compilation service (Supabase-backed) |
| `AUDIO_URL` | `http://localhost:3465` | 3465 | Alias for PHASE8_URL (TTS audio generation) |
| `PRODUCTION_API_URL` | `http://localhost:3470` | 3470 | Production API (QA workflow + WebSocket) |

### Port Calculation

All ports are auto-calculated from `BASE_PORT` (default: 3456):

```javascript
const BASE_PORT = parseInt(process.env.BASE_PORT || '3456');

// Port assignments:
ORCHESTRATOR_URL       = BASE_PORT      // 3456
PHASE1_TRANSLATION_URL = BASE_PORT + 1  // 3457
PHASE1_LEGO_URL        = BASE_PORT + 2  // 3458
PHASE3_URL             = BASE_PORT + 3  // 3459
MANIFEST_URL           = BASE_PORT + 8  // 3464 (legacy)
PHASE8_URL             = BASE_PORT + 9  // 3465
PHASE9_URL             = BASE_PORT + 10 // 3466
AUDIO_URL              = BASE_PORT + 9  // 3465 (alias)
PRODUCTION_API_URL     = BASE_PORT + 14 // 3470
```

## Service Discovery

### How Services Use These URLs

Services use environment variables to communicate:

```javascript
// Example: Orchestrator calling Phase 1 Translation
const PHASE1_TRANSLATION_URL = process.env.PHASE1_TRANSLATION_URL || 'http://localhost:3457';

const response = await axios.post(`${PHASE1_TRANSLATION_URL}/translate`, {
  courseCode: 'spa_for_eng',
  seedRange: 'S0001-S0010'
});
```

### Available on All Services

Every service started by `start-automation.cjs` receives ALL service URLs as environment variables. This allows any service to communicate with any other service.

**Example:** Phase 8 (Audio Generator) can call the Orchestrator to report status:

```javascript
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL;
await axios.post(`${ORCHESTRATOR_URL}/api/status`, { status: 'completed' });
```

## When to Override URLs

### Default: Localhost Development

By default, all services run on `localhost` and communicate locally. This is configured automatically - **no action required**.

### Use Case 1: Ngrok Tunnels (External Agents)

When using external AI agents (e.g., Claude in browser) that need to access the orchestrator:

```bash
# Terminal 1: Start ngrok
ngrok http 3456

# Terminal 2: Set NGROK_URL and start services
NGROK_URL=https://abc123.ngrok.io npm run automation
```

This sets `ORCHESTRATOR_URL` to the ngrok URL, allowing external agents to trigger pipeline jobs.

**Note:** Only `ORCHESTRATOR_URL` needs to be exposed. Phase services remain on localhost and communicate internally.

### Use Case 2: Remote Services

If running services on different machines (e.g., distributed GPU processing):

```bash
# .env.automation
PHASE8_URL=http://gpu-server.local:3465  # Audio generation on GPU machine
PHASE9_URL=http://localhost:3466         # Manifest compilation locally
```

### Use Case 3: Custom Port Configuration

To avoid port conflicts with other services:

```bash
# .env.automation
BASE_PORT=4000  # All services shift: 4000, 4001, 4002, etc.
```

## Service Endpoints

### Orchestrator (Port 3456)

```
POST   /api/orchestrate           # Start full pipeline
GET    /api/progress/:courseCode  # Get pipeline status
GET    /api/health                # Health check
GET    /api/courses               # List all courses
```

### Phase 1: Translation (Port 3457)

```
POST   /translate                 # Translate seed batch
GET    /status                    # Get current status
GET    /health                    # Health check
```

### Phase 1: LEGO Extraction (Port 3458)

```
POST   /resolve                   # Extract LEGOs + resolve conflicts
GET    /status                    # Get current status
GET    /health                    # Health check
```

### Phase 3: Basket Generation (Port 3459)

```
POST   /generate                  # Generate practice baskets
GET    /status                    # Get current status
GET    /health                    # Health check
```

### Phase 8: Audio Generation (Port 3465)

```
POST   /generate                  # Start audio generation
POST   /plan                      # Show generation plan (dry-run)
GET    /status/:courseCode        # Check job status
DELETE /cancel/:courseCode        # Cancel active job
GET    /health                    # Health check
```

### Phase 9: Manifest Compilation (Port 3466)

```
POST   /compile                   # Compile manifest from Supabase
GET    /validate/:courseCode      # Validate audio coverage
GET    /status/:courseCode        # Get manifest status
GET    /health                    # Health check
```

### Production API (Port 3470)

```
GET    /api/production/health                              # Health check
GET    /api/production/:courseCode/manifest                # Get course manifest
GET    /api/production/:courseCode/flags                   # Get sample flags
POST   /api/production/:courseCode/flags/update            # Update flag
POST   /api/production/:courseCode/flags/bulk-update       # Bulk update
GET    /api/production/:courseCode/audio-metadata          # Audio metadata
GET    /api/production/:courseCode/audio/:uuid/url         # Signed audio URL
GET    /api/production/:courseCode/audio/:uuid/exists      # Check audio exists
POST   /api/production/:courseCode/recording/upload        # Upload recording
POST   /api/production/internal/emit                       # WebSocket emit

# WebSocket
/api/production/websocket    # Real-time updates (Socket.IO)
```

## Configuration Reference

### Minimal Configuration (Recommended)

For local development, only `VFS_ROOT` is required:

```bash
# .env.automation
VFS_ROOT=/path/to/SSi_Course_Production
```

All service URLs are auto-configured.

### Full Configuration Example

```bash
# .env.automation

# Required
VFS_ROOT=/Users/yourname/SSi_Course_Production

# Optional: Override base port
BASE_PORT=3456

# Optional: Ngrok for external agents
NGROK_URL=https://abc123.ngrok.io

# Optional: Override individual service URLs
# (Only needed for distributed deployments)
# PHASE8_URL=http://gpu-server:3465
# PRODUCTION_API_URL=http://api-server:3470
```

## Verification

### Check Service Discovery

After starting services with `npm run automation`:

```bash
# All services should show their URLs on startup:
# Orchestrator                  → http://localhost:3456
# Phase 1 (Translation)         → http://localhost:3457
# Phase 1 (LEGO Extraction)     → http://localhost:3458
# Phase 3 (Baskets)             → http://localhost:3459
# Manifest Compilation          → http://localhost:3464
# Phase 8 (Audio Generator)     → http://localhost:3465
# Phase 9 (Manifest Compiler)   → http://localhost:3466
# Production API                → http://localhost:3470
```

### Test Service Communication

```bash
# Check orchestrator health
curl http://localhost:3456/api/health

# Check Phase 3 health
curl http://localhost:3459/health

# Check Phase 8 health
curl http://localhost:3465/health

# Check Production API health
curl http://localhost:3470/api/production/health
```

All services should respond with status `200 OK`.

## Architecture Flow

```
External Agent (Browser/CLI)
        |
        v
  ORCHESTRATOR_URL (3456)
        |
        +-- PHASE1_TRANSLATION_URL (3457)
        |
        +-- PHASE1_LEGO_URL (3458)
        |
        +-- PHASE3_URL (3459)
        |
        +-- PHASE8_URL (3465) -----> Supabase + S3
        |
        +-- PHASE9_URL (3466) -----> Supabase
        |
        +-- PRODUCTION_API_URL (3470) -----> WebSocket Clients
```

## Troubleshooting

### "Connection refused" errors

**Problem:** Service URL is incorrect or service isn't running.

**Solution:**
1. Verify all services are running: `ps aux | grep node`
2. Check `npm run automation` output for startup errors
3. Verify ports aren't blocked by firewall
4. Check `.env.automation` for URL overrides

### "Cannot reach orchestrator"

**Problem:** External agent can't reach localhost orchestrator.

**Solution:**
1. Use ngrok: `ngrok http 3456`
2. Set `NGROK_URL` in `.env.automation`
3. Restart services: `npm run automation`

### Port conflicts

**Problem:** Port already in use (e.g., "EADDRINUSE").

**Solution:**
1. Find conflicting process: `lsof -i :3456`
2. Kill process or change `BASE_PORT` in `.env.automation`
3. Restart: `npm run automation`

## Related Documentation

- **Setup Guide:** `docs/setup/AUTOMATION_SETUP.md`
- **Phase Architecture:** `docs/PHASE_SERVER_ARCHITECTURE.md`
- **Audio Workflow:** `docs/workflows/AUDIO_GENERATION_WORKFLOW.md`
- **Orchestrator Details:** `docs/workflows/ORCHESTRATOR_PARALLEL_COORDINATION.md`

---

**Last updated:** 2025-12-04
**APML Version:** v11.0
