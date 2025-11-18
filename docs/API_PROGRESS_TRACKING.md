# Progress Tracking API

Real-time progress monitoring for SSI course generation across all phases.

## Overview

The SSI Dashboard provides multiple APIs for tracking course generation progress:

1. **Unified Progress API** - Query all phases at once (port 3460)
2. **Phase 5 Upload System** - Real-time basket uploads (port 3459)
3. **Phase 3 Progress** - LEGO extraction progress (port 3458)

---

## Unified Progress API (Port 3462)

Single endpoint to query progress across all phases.

### Get All Phases Progress

**Endpoint:** `GET /api/progress/:course`

**Example:**
```bash
curl http://localhost:3462/api/progress/cmn_for_eng | jq .
```

**Response:**
```json
{
  "success": true,
  "course": "cmn_for_eng",
  "overallProgress": 60,
  "completedPhases": 3,
  "totalPhases": 5,
  "phases": {
    "phase1": {
      "phase": "phase1",
      "complete": true,
      "totalSeeds": 668,
      "progress": 100,
      "lastGenerated": "2025-11-17T12:00:00.000Z"
    },
    "phase3": {
      "phase": "phase3",
      "complete": true,
      "totalLegos": 2895,
      "totalSeeds": 668,
      "expectedSeeds": 668,
      "progress": 100,
      "lastGenerated": "2025-11-17T14:30:00.000Z"
    },
    "phase5": {
      "phase": "phase5",
      "complete": false,
      "totalBaskets": 2198,
      "totalNeeded": 2895,
      "missing": 697,
      "progress": 75.92,
      "lastUpload": "2025-11-18T01:36:22.100Z",
      "lastSeed": "S0532",
      "lastAgent": "agent-01",
      "activeAgents": ["agent-01", "agent-03"],
      "recentUploads": [
        {
          "timestamp": "2025-11-18T01:36:22.100Z",
          "seed": "S0532",
          "agentId": "agent-01",
          "legosAdded": 5
        }
      ]
    },
    "phase6": {
      "phase": "phase6",
      "complete": false,
      "totalIntroductions": 0,
      "totalNeeded": 2895,
      "progress": 0
    },
    "phase7": {
      "phase": "phase7",
      "complete": false,
      "progress": 0
    }
  }
}
```

### Get Specific Phase Progress

**Endpoint:** `GET /api/progress/:course/:phase`

**Example:**
```bash
curl http://localhost:3462/api/progress/cmn_for_eng/phase5 | jq .
```

**Response:**
```json
{
  "success": true,
  "course": "cmn_for_eng",
  "phase": "phase5",
  "complete": false,
  "totalBaskets": 2198,
  "totalNeeded": 2895,
  "missing": 697,
  "progress": 75.92,
  "lastUpload": "2025-11-18T01:36:22.100Z",
  "lastSeed": "S0532",
  "lastAgent": "agent-01",
  "activeAgents": ["agent-01", "agent-03"],
  "recentUploads": [...]
}
```

### Start the Progress API

**Using PM2 (recommended):**
```bash
pm2 start ecosystem.config.cjs --only progress-api
pm2 logs progress-api
```

**Manually:**
```bash
# Using environment variables
PORT=3462 VFS_ROOT=/path/to/public/vfs/courses node services/api/progress-tracker.cjs

# Or let it use defaults
node services/api/progress-tracker.cjs
```

---

## Phase 5 Upload System (Port 3459)

Real-time basket upload and progress tracking.

### Upload Baskets

**Endpoint:** `POST /upload-basket`

**ngrok URL:** `https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket`

**Request Body:**
```json
{
  "course": "cmn_for_eng",
  "seed": "S0532",
  "agentId": "agent-01",
  "baskets": {
    "S0532L01": {
      "lego": ["test phrase", "测试短语"],
      "type": "M",
      "practice_phrases": [
        ["Test phrase", "测试短语", null, 1],
        ["Test phrase now", "现在测试短语", null, 2]
      ]
    },
    "S0532L02": { ... }
  }
}
```

**Response:**
```json
{
  "success": true,
  "seed": "S0532",
  "agentId": "agent-01",
  "timestamp": "2025-11-18T01:36:22.100Z",
  "legosReceived": 5,
  "added": 5,
  "updated": 0,
  "totalBaskets": 2203,
  "totalNeeded": 2895,
  "missing": 692,
  "progress": 76.08
}
```

**Features:**
- ✅ Instant feedback on upload
- ✅ Real-time progress calculation
- ✅ Tracks agent activity
- ✅ Records upload history (last 50)
- ✅ Auto-merges into `lego_baskets.json`

### Check Basket Status

**Endpoint:** `GET /basket-status/:course`

**ngrok URL:** `https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/basket-status/cmn_for_eng`

**Response:**
```json
{
  "success": true,
  "totalBaskets": 2203,
  "totalNeeded": 2895,
  "missing": 692,
  "progress": 76.08,
  "lastUpload": "2025-11-18T01:36:22.100Z",
  "lastSeed": "S0532",
  "lastAgent": "agent-01",
  "activeAgents": ["agent-01", "agent-03"],
  "recentUploads": [
    {
      "timestamp": "2025-11-18T01:36:22.100Z",
      "seed": "S0532",
      "agentId": "agent-01",
      "legosAdded": 5,
      "legosUpdated": 0,
      "totalAfter": 2203
    }
  ]
}
```

**Usage in Agents:**
```javascript
// After generating baskets for seed S0532
const response = await fetch('https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    course: 'cmn_for_eng',
    seed: 'S0532',
    agentId: 'agent-01',
    baskets: baskets
  })
});

const result = await response.json();
console.log(`✅ Uploaded ${result.legosReceived} LEGOs`);
console.log(`📊 Progress: ${result.progress}% (${result.totalBaskets}/${result.totalNeeded})`);
console.log(`🎯 Missing: ${result.missing} baskets`);
```

---

## Phase 3 Progress (Port 3458)

LEGO extraction progress tracking.

### Get Phase 3 Progress

**Endpoint:** `GET /progress/:course`

**Example:**
```bash
curl http://localhost:3458/progress/cmn_for_eng | jq .
```

**Response:**
```json
{
  "success": true,
  "totalLegos": 2895,
  "totalSeeds": 668,
  "expectedSeeds": 668,
  "complete": true,
  "progress": 100,
  "lastGenerated": "2025-11-17T14:30:00.000Z"
}
```

### Get Detailed Job Status

**Endpoint:** `GET /status/:courseCode`

Returns detailed information about an active Phase 3 job including:
- Branch detection status
- Segment progress
- Agent activity
- Timing and velocity metrics

---

## Dashboard Integration

### Real-Time Progress Display

**Poll for updates every 5-10 seconds:**

```javascript
// Poll unified API for all phases
async function updateDashboard() {
  const response = await fetch('http://localhost:3462/api/progress/cmn_for_eng');
  const data = await response.json();

  // Update UI
  updateOverallProgress(data.overallProgress);
  updatePhaseProgress('phase5', data.phases.phase5);
  updateActiveAgents(data.phases.phase5.activeAgents);
  updateRecentActivity(data.phases.phase5.recentUploads);
}

setInterval(updateDashboard, 5000);
```

### Display Components

**Overall Progress:**
```
Course: cmn_for_eng
Progress: ████████░░ 60% (3/5 phases complete)
```

**Phase 5 Progress:**
```
Phase 5: Practice Baskets
Progress: ███████████░ 76.08% (2,203 / 2,895)
Missing: 692 baskets

Active Agents: agent-01, agent-03

Recent Uploads:
  ✅ S0532 by agent-01 (5 LEGOs) - 2 seconds ago
  ✅ S0531 by agent-03 (7 LEGOs) - 8 seconds ago
  ✅ S0530 by agent-01 (6 LEGOs) - 15 seconds ago
```

**Phase 3 Progress:**
```
Phase 3: LEGO Extraction
Progress: ████████████ 100% (668 / 668 seeds)
Total LEGOs: 2,895
Status: ✅ Complete
```

---

## Metadata Structure

### Phase 5 Metadata (lego_baskets.json)

```json
{
  "metadata": {
    "last_upload": "2025-11-18T01:36:22.100Z",
    "last_seed": "S0532",
    "last_agent": "agent-01",
    "total_baskets": 2203,
    "total_needed": 2895,
    "missing": 692,
    "progress": 76.08,
    "uploads": [
      {
        "timestamp": "2025-11-18T01:36:22.100Z",
        "seed": "S0532",
        "agentId": "agent-01",
        "legosAdded": 5,
        "legosUpdated": 0,
        "totalAfter": 2203
      }
    ]
  },
  "baskets": { ... }
}
```

**Upload History:**
- Stores last 50 uploads
- Tracks agent activity
- Records exact changes per upload
- Enables replay/debugging

---

## Active Agent Detection

Agents are considered "active" if they uploaded within the last 5 minutes.

**Use cases:**
- Show which agents are currently working
- Detect stalled agents
- Load balancing insights
- Completion estimates

---

## Starting All Services

**Using PM2 (recommended):**
```bash
# Start all services from ecosystem config
pm2 start ecosystem.config.cjs

# Or start individually
pm2 start ecosystem.config.cjs --only ssi-automation
pm2 start ecosystem.config.cjs --only dashboard-ui
pm2 start ecosystem.config.cjs --only ngrok-tunnel
pm2 start ecosystem.config.cjs --only progress-api

# Check status
pm2 list

# View logs
pm2 logs progress-api
pm2 logs ssi-automation

# Save configuration (auto-start on reboot)
pm2 save
pm2 startup
```

**Manually (for development):**
```bash
# Terminal 1: Automation server (starts all phase servers)
node start-automation.cjs

# Terminal 2: Dashboard UI
npm run dev

# Terminal 3: Progress API
PORT=3462 node services/api/progress-tracker.cjs

# Terminal 4: ngrok tunnel (for remote agents)
ngrok http 3459 --domain=mirthlessly-nonanesthetized-marilyn.ngrok-free.dev --log=stdout
```

---

## Testing

### Test Phase 5 Upload

```bash
curl -X POST https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket \
  -H "Content-Type: application/json" \
  -d '{
    "course": "cmn_for_eng",
    "seed": "S9999",
    "agentId": "test-agent",
    "baskets": {
      "S9999L01": {
        "lego": ["test", "测试"],
        "type": "M",
        "practice_phrases": [["Test", "测试", null, 1]]
      }
    }
  }'
```

### Check Status

```bash
curl https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/basket-status/cmn_for_eng | jq .
```

### Query Unified API

```bash
curl http://localhost:3462/api/progress/cmn_for_eng | jq .
curl http://localhost:3462/api/progress/cmn_for_eng/phase5 | jq .
curl http://localhost:3462/health | jq .
```

---

## Notes

- All progress percentages use 2 decimal places (e.g., 76.08%)
- Timestamps in ISO 8601 format
- Active agent detection: 5-minute window
- Upload history: Last 50 uploads retained
- ngrok tunnel must be running for remote agent access

---

**Last Updated:** 2025-11-18
