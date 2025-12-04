# Agent 5: Backend Integration

## Mission
Extend the existing orchestrator with Production API endpoints, WebSocket server handlers, and flag persistence layer to support the Course Production Suite UI.

---

## Context

### What Already Exists
- **Orchestrator** at `services/orchestration/orchestrator.cjs` (Port 3456)
- **Phase 8 Audio Server** at `services/phases/audio-server.cjs` (Port 3465)
- **ngrok Proxy** at `services/api/ngrok-proxy.cjs` (Port 3463)
- **Frontend Store** at `src/stores/production.js` - defines the API contract
- **Frontend WebSocket** at `src/services/websocket.js` - defines expected events

### What You're Building
1. **Production API endpoints** - REST routes for manifest, flags, audio-metadata
2. **WebSocket server** - Socket.io handlers for real-time updates
3. **Flag persistence** - JSON file storage for sample flags

---

## API Contract (From Frontend Store)

The frontend expects these endpoints:

```javascript
GET  /api/production/:courseCode/manifest      // Return course_manifest.json
GET  /api/production/:courseCode/flags         // Return { samples: { uuid: flagData } }
GET  /api/production/:courseCode/audio-metadata // Return { audio: { uuid: metadata } }
POST /api/production/:courseCode/flags/update  // Body: { uuid, status, ...flagData }
POST /api/production/:courseCode/flags/bulk-update // Body: { updates: [{ uuid, ...data }] }
```

---

## WebSocket Contract (From Frontend Service)

The frontend connects to `/api/production/websocket` and expects:

```javascript
// Events to EMIT from server:
'sample_updated'        // { courseCode, uuid, update: {...} }
'pipeline_progress'     // { courseCode, phase, progress, message }
'generation_complete'   // { courseCode, uuid, metadata: {...} }
'recording_completed'   // { courseCode, uuid, metadata: {...} }
'error'                 // { message, details }

// Events to LISTEN for from client:
'join_course'           // { courseCode } - join room for updates
'leave_course'          // { courseCode } - leave room
```

---

## Implementation Tasks

### Task 1: Flag Persistence Layer

Create `services/production-flags-service.cjs`:

```javascript
// Storage location: {courseDir}/production_flags.json
// Structure:
{
  "samples": {
    "uuid-1": {
      "status": "pending|flagged_regen_tts|flagged_human_needed|in_pipeline|in_recording|needs_review|approved|rejected",
      "flaggedAt": "ISO timestamp",
      "flaggedBy": "system|human",
      "notes": "optional notes",
      "updatedAt": "ISO timestamp"
    }
  },
  "metadata": {
    "courseCode": "spa_for_eng",
    "lastUpdated": "ISO timestamp"
  }
}

// Functions needed:
loadFlags(courseCode)           // Read from JSON file
saveFlags(courseCode, flags)    // Write to JSON file
updateFlag(courseCode, uuid, flagData)  // Update single flag
bulkUpdateFlags(courseCode, updates)    // Update multiple flags
```

**File Location:** Store alongside course data:
```
public/vfs/courses/{courseCode}/production_flags.json
```

### Task 2: Audio Metadata Service

Create `services/production-audio-metadata.cjs`:

```javascript
// Reads audio metadata from:
// 1. S3 bucket (ssi-audio-stage or ssiborg-assets)
// 2. Local cache at {courseDir}/audio_metadata.json

// Functions:
loadAudioMetadata(courseCode)   // Load cached metadata
refreshFromS3(courseCode)       // Sync from S3
getAudioUrl(courseCode, uuid)   // Get playback URL
```

### Task 3: Production API Routes

Add to `services/orchestration/orchestrator.cjs` OR create new `services/production-api.cjs`:

```javascript
const express = require('express');
const router = express.Router();
const flagsService = require('./production-flags-service.cjs');
const path = require('path');
const fs = require('fs-extra');

const VFS_ROOT = process.env.VFS_ROOT || './public/vfs/courses';

// GET manifest
router.get('/:courseCode/manifest', async (req, res) => {
  const { courseCode } = req.params;
  const manifestPath = path.join(VFS_ROOT, courseCode, 'course_manifest.json');

  try {
    const manifest = await fs.readJson(manifestPath);
    res.json(manifest);
  } catch (err) {
    res.status(404).json({ error: 'Manifest not found' });
  }
});

// GET flags
router.get('/:courseCode/flags', async (req, res) => {
  const { courseCode } = req.params;
  const flags = await flagsService.loadFlags(courseCode);
  res.json(flags);
});

// GET audio metadata
router.get('/:courseCode/audio-metadata', async (req, res) => {
  const { courseCode } = req.params;
  // Load from cache or S3
  const metadata = await loadAudioMetadata(courseCode);
  res.json(metadata);
});

// POST update single flag
router.post('/:courseCode/flags/update', async (req, res) => {
  const { courseCode } = req.params;
  const { uuid, ...flagData } = req.body;

  const result = await flagsService.updateFlag(courseCode, uuid, flagData);

  // Emit WebSocket event
  io.to(courseCode).emit('sample_updated', {
    courseCode,
    uuid,
    update: flagData
  });

  res.json({ success: true, result });
});

// POST bulk update flags
router.post('/:courseCode/flags/bulk-update', async (req, res) => {
  const { courseCode } = req.params;
  const { updates } = req.body;

  const result = await flagsService.bulkUpdateFlags(courseCode, updates);

  // Emit WebSocket events for each update
  for (const { uuid, ...data } of updates) {
    io.to(courseCode).emit('sample_updated', {
      courseCode,
      uuid,
      update: data
    });
  }

  res.json({ success: true, count: updates.length });
});

module.exports = router;
```

### Task 4: WebSocket Server Setup

Add Socket.io to orchestrator:

```javascript
const { Server } = require('socket.io');

// After Express app setup:
const httpServer = require('http').createServer(app);
const io = new Server(httpServer, {
  path: '/api/production/websocket',
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Connection handling
io.on('connection', (socket) => {
  console.log('[WS] Client connected:', socket.id);

  socket.on('join_course', ({ courseCode }) => {
    socket.join(courseCode);
    console.log(`[WS] ${socket.id} joined room: ${courseCode}`);
  });

  socket.on('leave_course', ({ courseCode }) => {
    socket.leave(courseCode);
    console.log(`[WS] ${socket.id} left room: ${courseCode}`);
  });

  socket.on('disconnect', () => {
    console.log('[WS] Client disconnected:', socket.id);
  });
});

// Export io for use in routes
module.exports.io = io;

// Change app.listen to httpServer.listen
httpServer.listen(PORT, () => {
  console.log(`Orchestrator running on port ${PORT}`);
});
```

### Task 5: Hook Into Phase 8 Events

When Phase 8 audio server generates audio, emit events:

```javascript
// In audio-server.cjs or via orchestrator callback:

// After TTS generation completes for a sample:
io.to(courseCode).emit('generation_complete', {
  courseCode,
  uuid,
  metadata: {
    duration,
    generatedAt: new Date().toISOString(),
    voice,
    provider: 'azure|elevenlabs'
  }
});

// During pipeline progress:
io.to(courseCode).emit('pipeline_progress', {
  courseCode,
  phase: 'phase_a|phase_b',
  progress: 0.45,  // 0-1
  message: 'Generating target samples...',
  current: 45,
  total: 100
});
```

---

## File Structure to Create

```
services/
├── production-flags-service.cjs    # Flag persistence
├── production-audio-metadata.cjs   # Audio metadata cache
└── production-api.cjs              # REST API routes (or extend orchestrator.cjs)
```

---

## Integration Points

### With Orchestrator
- Mount production routes: `app.use('/api/production', productionRouter)`
- Share `io` instance for WebSocket events

### With Phase 8 Audio Server
- Call back to orchestrator on generation events
- Or have orchestrator poll Phase 8 status and emit events

### With ngrok Proxy
- Add route: `/production/*` → `localhost:3456/api/production/*`

---

## Testing

After implementation, verify:

1. **API endpoints work:**
```bash
curl http://localhost:3456/api/production/spa_for_eng/manifest
curl http://localhost:3456/api/production/spa_for_eng/flags
```

2. **WebSocket connects:**
```javascript
const socket = io('http://localhost:3456', { path: '/api/production/websocket' });
socket.emit('join_course', { courseCode: 'spa_for_eng' });
```

3. **Flag updates broadcast:**
```bash
curl -X POST http://localhost:3456/api/production/spa_for_eng/flags/update \
  -H "Content-Type: application/json" \
  -d '{"uuid": "test-uuid", "status": "approved"}'
```

---

## Dependencies

Add to `package.json` if not present:
```json
{
  "dependencies": {
    "socket.io": "^4.8.1"
  }
}
```

Already present - confirmed in package.json.

---

## Branch

Work in branch: `feature/production-backend-integration`

---

## Success Criteria

- [ ] Production API endpoints return correct data
- [ ] Flags persist to JSON files in course directory
- [ ] WebSocket server accepts connections and room joins
- [ ] Flag updates emit `sample_updated` events to room
- [ ] ngrok proxy routes production endpoints correctly
- [ ] No breaking changes to existing orchestrator functionality
