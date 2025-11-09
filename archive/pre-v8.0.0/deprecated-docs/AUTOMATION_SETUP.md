# SSi Course Production - Automation Setup Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Vercel (Production)                                            │
│  https://ssi-dashboard-v7.vercel.app                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Dashboard (Vue.js)                                       │  │
│  │ - Course Generation UI                                   │  │
│  │ - Progress Monitoring                                    │  │
│  │ - Phase Training Docs                                    │  │
│  └────────────────────────┬─────────────────────────────────┘  │
└─────────────────────────────┼─────────────────────────────────────┘
                              │ HTTPS Request
                              ▼
                    ┌─────────────────────┐
                    │   ngrok Tunnel      │
                    │   (Public → Local)  │
                    └──────────┬──────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Local Machine (macOS)                                          │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ automation_server.cjs                                     │  │
│  │ Port: 54321                                               │  │
│  │ - Express API server                                      │  │
│  │ - VFS Manager (vfs/courses/)                             │  │
│  │ - Job Queue & Status Tracking                            │  │
│  │ - Phase Orchestration                                     │  │
│  └────────────────────────┬──────────────────────────────────┘  │
│                           │ osascript                           │
│                           ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Warp Terminal + Claude Code                               │  │
│  │ - Opens new terminal tabs via AppleScript                │  │
│  │ - Receives phase prompts from APML registry              │  │
│  │ - Executes phases sequentially or in parallel            │  │
│  │ - Writes outputs to vfs/courses/{courseCode}/            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Node.js** (v16 or higher)
2. **ngrok** (for tunneling)
3. **Warp Terminal** (for Claude Code integration)
4. **Claude Code CLI** (claude command)

## Installation

### 1. Install Dependencies

```bash
npm install
```

The automation server requires:
- `express` - API server
- `cors` - Cross-origin requests
- `body-parser` - JSON request parsing
- `fs-extra` - File system utilities

### 2. Install ngrok

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

### 3. Verify Claude Code

```bash
# Check Claude Code is installed
claude --version
```

## Starting the Automation Server

### Step 1: Start the Automation Server

```bash
# Start on default port 54321
npm run server

# Or with custom port
PORT=54321 node automation_server.cjs
```

You should see:
```
✅ Loaded 7 phase prompts from APML registry
🚀 SSi Automation Server v7.0 listening on http://localhost:54321
📂 VFS Root: /Users/you/SSi/ssi-dashboard-v7-clean/vfs/courses
🌐 CORS enabled for Vercel domain
```

### Step 2: Create ngrok Tunnel

In a **separate terminal**:

```bash
# Create tunnel to port 54321
ngrok http 54321
```

You'll see output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:54321
```

**Copy the https URL** (e.g., `https://abc123.ngrok.io`)

### Step 3: Configure Frontend

The frontend needs to know your ngrok URL. There are two options:

#### Option A: Environment Variable (Recommended for Development)

Create `.env.local` in the project root:

```bash
VITE_API_BASE_URL=https://abc123.ngrok.io
```

Then rebuild and redeploy:
```bash
npm run build
git add .env.local
git commit -m "Add ngrok tunnel URL"
git push
```

#### Option B: Update API Service (Quick Test)

Edit `src/services/api.js` and update the `baseURL`:

```javascript
const apiClient = axios.create({
  baseURL: 'https://abc123.ngrok.io',  // Your ngrok URL
  timeout: 30000
});
```

## How Course Generation Works

### 1. User Initiates Generation

User goes to **Dashboard → Generate New Course** and selects:
- Known Language (e.g., `eng`)
- Target Language (e.g., `ita`)
- Number of Seeds (e.g., `668`)

### 2. Frontend Sends Request

```javascript
POST https://ssi-dashboard-v7.vercel.app
  ↓ (via ngrok)
POST http://localhost:54321/api/courses/generate

Body: {
  "target": "ita",
  "known": "eng",
  "seeds": 668
}
```

### 3. Automation Server Creates Job

```javascript
// Creates course code: ita_for_eng_668seeds
const job = {
  courseCode: "ita_for_eng_668seeds",
  status: "in_progress",
  phase: "initializing",
  progress: 0,
  startTime: new Date(),
  params: { target, known, seeds }
};
```

### 4. Orchestrator Agent Spawned

The server calls `spawnCourseOrchestrator()` which:

1. **Creates course directory**: `vfs/courses/ita_for_eng_668seeds/`
2. **Generates orchestrator brief** with:
   - Course metadata
   - All phase instructions
   - Expected outputs
   - Quality standards
3. **Opens Warp terminal** via osascript:
   ```applescript
   tell application "Warp"
       activate
       -- Opens new tab
       -- Loads orchestrator brief
       -- Agent executes all phases sequentially
   end tell
   ```

### 5. Orchestrator Executes Phases

The Claude Code agent in Warp:

1. **Phase 1**: Generates pedagogical translations
   - Input: `seeds/canonical_seeds.json` (668 seeds)
   - Output: `translations.json`

2. **Phase 3**: Extracts LEGO pairs
   - Input: `translations.json`
   - Output: `LEGO_BREAKDOWNS_COMPLETE.json`

3. **Phase 5**: Generates practice baskets
   - Input: `LEGO_BREAKDOWNS_COMPLETE.json`
   - Output: `baskets.json`

4. **Phase 5.5**: Deduplicates baskets
   - Input: `baskets.json`
   - Output: `baskets_deduplicated.json` + `lego_provenance_map.json`

5. **Phase 6**: Creates introductions
   - Input: `LEGO_BREAKDOWNS_COMPLETE.json` + `lego_provenance_map.json`
   - Output: `introductions.json`

All outputs are written to: `vfs/courses/ita_for_eng_668seeds/`

### 6. Frontend Polls for Status

```javascript
// Every 2 seconds
GET http://localhost:54321/api/courses/ita_for_eng_668seeds/status

Response: {
  "courseCode": "ita_for_eng_668seeds",
  "status": "running",  // or "completed", "failed"
  "phase": "phase_3",   // current phase
  "progress": 45,       // 0-100%
  "elapsed": 123456     // milliseconds
}
```

### 7. Completion

When all phases finish:
- Status changes to `"completed"`
- Frontend shows "✓ Completed!" message
- User can click "View Course Files" to open course editor

## Phase Prompts (APML Registry)

All phase prompts are loaded from `.apml-registry.json`, which is compiled from `ssi-course-production.apml`.

**To update a phase prompt:**

1. Edit `ssi-course-production.apml`
2. Run the compiler:
   ```bash
   node scripts/compile-apml-registry.cjs
   ```
3. Restart automation server

Current phases in registry:
- Phase 1: Pedagogical Translation (6 heuristics)
- Phase 3: LEGO Extraction (BASE/COMPOSITE/FEEDER)
- Phase 5: Basket Generation (d-phrases + e-phrases)
- Phase 5.5: Basket Deduplication (provenance tracking)
- Phase 6: Introductions (contextual with componentization)

## Parallel Execution

The orchestrator can spawn multiple agents in parallel using Claude Code's Task tool:

```markdown
Execute Phase 5 basket generation in parallel for all LEGOs by launching
multiple task agents, each handling a batch of LEGOs concurrently.
```

The agent will automatically:
1. Split work into batches
2. Launch multiple Task agents in parallel
3. Merge results
4. Write final output

## Monitoring & Debugging

### Check Automation Server Logs

```bash
# Server console shows:
[Orchestrator] Starting course generation: ita_for_eng_668seeds
[Agent] Spawning Phase orchestrator agent in Warp...
[Agent] Phase orchestrator agent spawned successfully in Warp
[Orchestrator] Course orchestrator spawned for ita_for_eng_668seeds
[Orchestrator] Single Warp window executing all phases
```

### Check VFS Directory

```bash
ls -la vfs/courses/ita_for_eng_668seeds/

# You should see phase outputs appear:
# - translations.json (Phase 1)
# - LEGO_BREAKDOWNS_COMPLETE.json (Phase 3)
# - baskets_deduplicated.json (Phase 5.5)
# - introductions.json (Phase 6)
```

### Watch Warp Terminal

The orchestrator runs in a visible Warp terminal window, so you can:
- Watch phase execution in real-time
- See Claude's reasoning and decisions
- Debug any errors immediately

### Query Job Status

```bash
curl http://localhost:54321/api/courses/ita_for_eng_668seeds/status
```

## Troubleshooting

### Error: "CORS blocked"

**Problem:** Frontend can't reach automation server through ngrok.

**Solution:** Check `CORS_ORIGINS` in automation_server.cjs includes your Vercel domain:

```javascript
CORS_ORIGINS: [
  'https://ssi-dashboard-v7.vercel.app',
  /\.vercel\.app$/
]
```

### Error: "osascript permission denied"

**Problem:** macOS doesn't allow automation_server to control Warp.

**Solution:**
1. Open **System Settings → Privacy & Security → Automation**
2. Find `node` or `terminal`
3. Enable **Warp** access

### Error: "Phase prompt not found"

**Problem:** APML registry not compiled or corrupted.

**Solution:**
```bash
# Recompile registry
node scripts/compile-apml-registry.cjs

# Restart server
npm run server
```

### Error: "ngrok tunnel not found"

**Problem:** ngrok URL changed (ngrok generates new URLs on each start).

**Solution:**
1. Stop ngrok
2. Restart: `ngrok http 54321`
3. Update `.env.local` with new URL
4. Rebuild and redeploy frontend

### Warp window doesn't open

**Problem:** osascript can't find Warp or wrong terminal app.

**Solution:** Check automation_server.cjs line 340:
```javascript
tell application "Warp"  // Change to "Terminal" or "iTerm" if needed
```

## Production Deployment

### Using Railway/Render for Automation Server

For a permanent public URL (instead of ngrok):

1. Deploy automation_server.cjs to Railway/Render
2. Set environment variable: `VFS_ROOT=/app/vfs/courses`
3. Update frontend to use production URL
4. Configure osascript to work with hosted terminal (or use headless mode)

### Headless Mode (No Terminal Windows)

For production, you can run phases without opening terminal windows:

1. Modify `spawnPhaseAgent()` to use `exec()` instead of osascript
2. Run Claude Code in non-interactive mode: `claude code --prompt="..." --dir="..."`
3. Capture output and write to VFS

## API Reference

### POST /api/courses/generate

**Request:**
```json
{
  "target": "ita",
  "known": "eng",
  "seeds": 668
}
```

**Response:**
```json
{
  "success": true,
  "courseCode": "ita_for_eng_668seeds",
  "message": "Course generation started with orchestrator pattern",
  "status": {
    "courseCode": "ita_for_eng_668seeds",
    "status": "in_progress",
    "phase": "initializing",
    "progress": 0,
    "startTime": "2025-01-17T14:30:00.000Z"
  }
}
```

### GET /api/courses/:courseCode/status

**Response:**
```json
{
  "courseCode": "ita_for_eng_668seeds",
  "status": "running",
  "phase": "phase_3",
  "progress": 45,
  "startTime": "2025-01-17T14:30:00.000Z",
  "elapsed": 123456
}
```

### GET /api/courses

Lists all available courses in VFS.

### POST /api/courses/:code/seeds/regenerate

Regenerates a specific seed in an existing course.

## Next Steps

1. **Start the automation server**: `npm run server`
2. **Create ngrok tunnel**: `ngrok http 54321`
3. **Update frontend with tunnel URL**
4. **Test course generation** from dashboard
5. **Monitor Warp terminal** for real-time execution
6. **Check VFS directory** for phase outputs

---

🎯 **Goal**: Fully automated end-to-end course generation with minimal human intervention.

The orchestrator agent is given full autonomy to execute all phases, manage quality control, handle errors, and produce a complete, production-ready language course.
