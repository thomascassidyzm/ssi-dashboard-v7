# Live Progress Monitoring System

**Version:** 8.2.3
**Date:** 2025-11-21
**Status:** Active ✅

---

## Overview

Real-time progress tracking system that allows phase servers to report their progress to the orchestrator, which calculates ETAs and provides live updates to the dashboard.

**Perfect for:** Remote demos via ngrok tunnel where co-founders can watch progress without seeing Claude Code windows.

---

## Architecture

```
Phase Agents → POST progress → Orchestrator (calculates ETA) → GET progress ← Dashboard (polls every 5s)
```

### Flow:

1. **Phase servers** (1, 3, 5, 7, 8) POST progress updates to orchestrator
2. **Orchestrator** calculates ETA based on seeds/second rate
3. **Dashboard** polls GET endpoint every 5 seconds
4. **User** sees live progress bar, percentage, ETA, and activity log

---

## API Endpoints

### POST `/api/courses/:courseCode/progress`

**Phase servers report progress here**

**Request:**
```json
{
  "phase": 1,
  "updates": {
    "status": "running",
    "seedsCompleted": 20,
    "seedsTotal": 668,
    "currentSeed": "S0020",
    "startTime": "2025-11-21T10:30:00.000Z"
  },
  "logMessage": "Completed S0020 - 648 remaining"
}
```

**Response:**
```json
{
  "success": true,
  "progress": {
    "courseCode": "spa_for_eng",
    "currentPhase": 1,
    "overallStatus": "running",
    "phases": {
      "1": {
        "status": "running",
        "seedsCompleted": 20,
        "seedsTotal": 668,
        "eta": "2025-11-21T10:42:30.000Z",
        "etaHuman": "12m 30s"
      }
    }
  }
}
```

### GET `/api/courses/:courseCode/progress`

**Dashboard polls this for live updates**

**Response:**
```json
{
  "courseCode": "spa_for_eng",
  "currentPhase": 1,
  "overallStatus": "running",
  "startTime": "2025-11-21T10:30:00.000Z",
  "phases": {
    "1": {
      "status": "running",
      "seedsCompleted": 20,
      "seedsTotal": 668,
      "currentSeed": "S0020",
      "eta": "2025-11-21T10:42:30.000Z",
      "etaHuman": "12m 30s"
    },
    "3": { "status": "pending" },
    "5": { "status": "pending" },
    "7": { "status": "pending" },
    "8": { "status": "pending" }
  },
  "recentLogs": [
    {
      "time": "2025-11-21T10:32:00.000Z",
      "level": "info",
      "message": "Completed S0020 - 648 remaining"
    }
  ]
}
```

---

## ETA Calculation

Orchestrator automatically calculates ETA when progress is reported:

```javascript
// Elapsed time since start
const elapsed = Date.now() - new Date(updates.startTime).getTime();

// Seeds per second rate
const rate = updates.seedsCompleted / (elapsed / 1000);

// Remaining seeds
const remaining = updates.seedsTotal - updates.seedsCompleted;

// ETA in seconds
const etaSeconds = remaining / rate;

// ISO timestamp
updates.eta = new Date(Date.now() + etaSeconds * 1000).toISOString();

// Human-readable: "2m 30s" or "1h 15m"
updates.etaHuman = formatDuration(etaSeconds);
```

**Format function:**
```javascript
function formatDuration(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}
```

---

## Phase Reporting Strategies

### Phase 1: Translation

**Reports every 10 seeds completed**

Agents are instructed in the prompt:
```markdown
4. **Report progress every 10 seeds**:
   POST progress updates to: `http://localhost:3456/api/courses/{courseCode}/progress`

   After every 10 seeds completed
   When you finish all seeds
   Store startTime when you begin (used for ETA calculation)
```

### Phase 3: LEGO Extraction

**Each sub-agent reports after completing their batch**

Master orchestrator spawns N agents (typically 10 seeds/agent).
Each agent reports when done:

```markdown
## 📊 STEP 5: REPORT PROGRESS

After completing your seeds, report progress to orchestrator:
- agentId: <your_agent_number>
- seedsCompleted: <your_end_seed>
- logMessage: "Agent <N>: Completed S00XX-S00YY (10 seeds extracted)"
```

### Phase 5: Basket Generation

**TODO**: Add progress reporting (similar to Phase 3)

### Phase 7: Manifest Compilation

**Standalone script** - No live progress needed (completes in ~5 seconds)

### Phase 8: Audio Generation

**Kai's domain** - Will add progress reporting for ~110,000 audio files

---

## Dashboard Component

### ProgressMonitor.vue

**Location:** `src/components/ProgressMonitor.vue`

**Props:**
- `courseCode` (String, required) - Course to monitor
- `pollInterval` (Number, default 5000) - Polling interval in ms
- `seedCount` (Number) - Total seeds for the course

**Features:**
- Live progress card with pulsing indicator
- Progress bar (seeds completed / total)
- Percentage complete
- ETA display (human-readable)
- Recent activity log (last 5 events)
- Phase-by-phase breakdown
- Graceful degradation when backend unavailable

**Usage:**
```vue
<template>
  <ProgressMonitor
    course-code="spa_for_eng"
    :poll-interval="5000"
    :seed-count="668"
  />
</template>
```

---

## Benefits

✅ **Real-time visibility** - No more "is it working?" uncertainty
✅ **Accurate ETAs** - Based on actual execution rate, not estimates
✅ **Remote demos** - Perfect for ngrok tunnel presentations
✅ **Audit trail** - Activity log shows what happened and when
✅ **Efficient** - Phases push updates (no filesystem polling)
✅ **Scalable** - Works with any number of agents/phases

---

## Use Case: Remote Demo with Co-Founder

**Scenario:** Demonstrating course generation to Aran via ngrok tunnel

**Setup:**
1. Start automation services: `npm run automation`
2. Start ngrok tunnel: `ngrok http 3456`
3. Share ngrok URL with Aran

**Demo:**
1. Open dashboard at ngrok URL
2. Navigate to Course Generator
3. Start course generation (Phase 1 → 3 → 5 → 7)
4. Aran watches live progress in dashboard
5. No need to see Claude Code windows
6. Real-time visibility: "Phase 1: 20/668 seeds - ETA 12m 30s"
7. Activity log shows: "Completed S0020 - 648 remaining"

**What Aran sees:**
- Current phase with pulsing indicator
- Progress bar updating every 5 seconds
- Percentage complete
- Accurate ETA based on execution rate
- Recent activity log with timestamps

---

## Implementation Files

### Backend
- `services/orchestration/orchestrator.cjs:933-969` - Progress endpoints
- `services/phases/phase1-translation/server.cjs:136-157` - Phase 1 prompt
- `services/phases/phase3-lego-extraction/server.cjs:270-309` - Phase 3 prompt

### Frontend
- `src/components/ProgressMonitor.vue` - Progress monitoring component

### Documentation
- `ssi-course-production.apml` - v8.2.3 changelog
- `CLAUDE.md` - Progress monitoring section
- `SYSTEM.md` - API endpoints section
- `docs/PROGRESS_MONITORING.md` - This file

---

## Future Enhancements

- [ ] Phase 5 progress reporting (basket generation)
- [ ] Phase 8 progress reporting (audio generation - ~110,000 files)
- [ ] WebSocket support for push-based updates (vs polling)
- [ ] Progress persistence (survive orchestrator restarts)
- [ ] Historical progress charts (show previous runs)
- [ ] Slack/email notifications on completion

---

**Last Updated:** 2025-11-21
**APML Version:** 8.2.3
