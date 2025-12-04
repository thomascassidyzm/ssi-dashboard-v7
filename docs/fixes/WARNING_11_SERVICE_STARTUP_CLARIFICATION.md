# Fix Report: Warning #11 - Orphaned Services Not in start-automation.cjs

**Date:** 2025-12-04
**Issue:** Services exist but aren't started by automation
**Status:** ✅ RESOLVED

---

## Problem Summary

Three services existed in the codebase but were not included in `start-automation.cjs`, creating confusion about their status:

1. `services/pipeline/pipeline-server.cjs` (Port 3457) - Already deprecated in Critical #3
2. `services/api/progress-tracker.cjs` (Port 3462) - Status unclear
3. `services/api/ngrok-proxy.cjs` (Port 3463) - Status unclear

---

## Investigation Results

### 1. pipeline-server.cjs (Port 3457)
**Status:** Already fixed in Critical #3 (deprecated)

### 2. progress-tracker.cjs (Port 3462)
**Status:** NOT USED IN PRODUCTION - Deprecated

**Evidence:**
- No references in frontend code (`src/`)
- Dashboard uses orchestrator WebSocket for real-time progress
- Production API (3470) provides status endpoints for QA workflow
- Only referenced in documentation and PM2 config

**Historical Context:**
- Created during v9 development for unified progress tracking
- Superseded by WebSocket implementation in orchestrator
- Kept in PM2 config for manual testing/debugging

**Replacement Services:**
- Real-time progress: Orchestrator WebSocket (`ws://localhost:3456`)
- QA workflow status: Production API (`http://localhost:3470/api/production/:course/status`)
- Phase-specific: Each phase server has `/status/:courseCode` endpoint

### 3. ngrok-proxy.cjs (Port 3463)
**Status:** ACTIVE IN PRODUCTION - Critical Service

**Evidence:**
- Used by dashboard `src/components/EnvironmentSwitcher.vue` (Tom's Machine option)
- Routes external traffic to internal services
- Multiple references in codebase (17+ files)
- Active ngrok domain: `mirthlessly-nonanesthetized-marilyn.ngrok-free.dev`

**Why NOT in start-automation.cjs:**
- Requires ngrok tunnel setup (separate process in PM2)
- Only needed for external agent access via Claude Projects
- Local development typically uses direct localhost connections
- Intentionally PM2-only for production deployments

**Routes Provided:**
- `/api/production/*` → Production API (3470)
- `/api/*` → Orchestrator (3456)
- `/phase1/*` → Phase 1 Translation (3457)
- `/phase3/*` → Phase 1 LEGO Extraction (3458)
- `/phase5/*` → Phase 3 Baskets (3459)
- `/phase8/*` → Phase 8 Audio (3465)

---

## Actions Taken

### 1. Updated progress-tracker.cjs
**File:** `/services/api/progress-tracker.cjs`

**Changes:**
- Added comprehensive deprecation notice in header
- Documented why it's not in start-automation.cjs
- Listed replacement services (orchestrator WebSocket, production API)
- Added manual startup instructions for debugging
- Updated startup banner to warn users it's deprecated

### 2. Updated ngrok-proxy.cjs
**File:** `/services/api/ngrok-proxy.cjs`

**Changes:**
- Added "CRITICAL PRODUCTION SERVICE" notice in header
- Documented all routes and their purposes
- Explained why it's NOT in start-automation.cjs
- Listed actual users (dashboard, external agents)
- Included ngrok domain and setup instructions
- Updated startup banner with usage information

### 3. Updated ecosystem.config.cjs
**File:** `/ecosystem.config.cjs`

**Changes:**
- Added inline comments for progress-api service:
  - Marked as DEPRECATED
  - Explained replacement (orchestrator WebSocket)
  - Noted it's kept for manual testing only
- Added inline comments for ngrok-proxy service:
  - Marked as PRODUCTION SERVICE
  - Listed actual users
  - Explained why not in start-automation.cjs
- Added comments for ngrok-tunnel service:
  - Marked as PRODUCTION SERVICE
  - Documented ngrok domain

### 4. Created SERVICE_STARTUP_GUIDE.md
**File:** `/docs/setup/SERVICE_STARTUP_GUIDE.md` (266 lines)

**Contents:**
- Overview of service startup methods
- Comparison: start-automation.cjs vs ecosystem.config.cjs
- Detailed service table showing what's in which config
- Explanation of each service's purpose and status
- Why certain services are PM2-only
- Quick reference for common operations
- Troubleshooting guide
- Environment variables reference

### 5. Updated CONSISTENCY_AUDIT_REPORT.md
**File:** `/docs/CONSISTENCY_AUDIT_REPORT.md`

**Changes:**
- Marked Warning #11 as ✅ FIXED
- Documented actions taken for each service
- Added reference to new SERVICE_STARTUP_GUIDE.md

---

## Files Modified

1. `/services/api/progress-tracker.cjs` - Added deprecation notice
2. `/services/api/ngrok-proxy.cjs` - Documented as production service
3. `/ecosystem.config.cjs` - Added inline documentation
4. `/docs/CONSISTENCY_AUDIT_REPORT.md` - Marked warning as fixed
5. `/docs/setup/SERVICE_STARTUP_GUIDE.md` - **NEW** - Comprehensive guide
6. `/docs/fixes/WARNING_11_SERVICE_STARTUP_CLARIFICATION.md` - **NEW** - This report

---

## Key Takeaways

### For Developers
1. **Use start-automation.cjs for local development** - All core pipeline services
2. **Use PM2 for production** - Includes ngrok for external access
3. **Don't use progress-tracker** - Use orchestrator WebSocket instead

### Service Startup Decision Tree
```
Need local development?
  → Use: npm run automation (start-automation.cjs)
  → Gets: All pipeline services on localhost

Need production deployment?
  → Use: pm2 start ecosystem.config.cjs
  → Gets: All services + Dashboard UI

Need external agent access?
  → Use: pm2 start ecosystem.config.cjs --only ngrok-proxy,ngrok-tunnel
  → Gets: Public ngrok URL routing to internal services

Need progress tracking?
  → DON'T use progress-tracker (port 3462)
  → DO use orchestrator WebSocket (ws://localhost:3456)
  → OR use production API (http://localhost:3470/api/production/:course/status)
```

### Why Services Are Where They Are

**In BOTH start-automation.cjs AND ecosystem.config.cjs:**
- Core pipeline services (orchestrator, phases, production API)
- Required for any course processing

**ONLY in ecosystem.config.cjs:**
- Dashboard UI (5173) - Typically run separately via `npm run dev`
- Progress API (3462) - DEPRECATED, kept for manual testing
- Ngrok Proxy (3463) - External access only, requires tunnel
- Ngrok Tunnel - External access only

---

## Testing Recommendations

### Test 1: Local Development
```bash
npm run automation
# Verify all pipeline services start
curl http://localhost:3456/api/health
```

### Test 2: PM2 Production
```bash
pm2 start ecosystem.config.cjs
pm2 list  # Verify all services running
```

### Test 3: External Access
```bash
pm2 start ecosystem.config.cjs --only ngrok-proxy,ngrok-tunnel
curl https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/health
```

### Test 4: Verify Progress Tracking
```bash
# Start orchestrator
npm run automation

# Connect to WebSocket (in browser console or tool)
const ws = new WebSocket('ws://localhost:3456');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

---

## Documentation References

- **Service Startup Guide:** `/docs/setup/SERVICE_STARTUP_GUIDE.md`
- **PM2 Setup:** `/docs/setup/PM2_SETUP.md`
- **Audio Workflow:** `/docs/workflows/AUDIO_GENERATION_WORKFLOW.md`
- **Agent Onboarding:** `/CLAUDE.md`
- **Ecosystem Config:** `/ecosystem.config.cjs`
- **Automation Script:** `/start-automation.cjs`

---

## Conclusion

Warning #11 has been resolved by:

1. **Documenting deprecation** of `progress-tracker.cjs` with clear migration path
2. **Documenting production status** of `ngrok-proxy.cjs` with usage details
3. **Explaining architectural decisions** about which services go where
4. **Creating comprehensive guide** for all service startup scenarios

All services now have clear status indicators and documentation explaining their purpose, usage, and startup method.
