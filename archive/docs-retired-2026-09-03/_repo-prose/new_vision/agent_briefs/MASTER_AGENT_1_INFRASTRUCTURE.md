# MASTER AGENT 1: Infrastructure & Data Layer

## Mission Brief

You are **Master Agent 1** of 4, responsible for building the foundational infrastructure layer of the SSi Course Production Suite. Your work is **blocking** - Masters 2, 3, and 4 cannot begin until you complete and merge.

---

## Project Context

You are working on the SSi Dashboard v7 project. After cloning, your working directory is:
```
/Users/tomcassidy/SSi/ssi-dashboard-v7-clean
```

This is a Vue 3 + Vite application with Tailwind CSS. The project transforms language learning content through multiple phases and now needs a unified Course Production Suite for QA, audio generation, manual recording, and quality control.

**Read these files first to understand the existing codebase:**
- `CLAUDE.md` - Agent onboarding guide
- `SYSTEM.md` - System architecture
- `README.md` - Project overview
- `new_vision/MASTER_ORCHESTRATION_BRIEF.md` - Full architecture vision
- `new_vision/COURSE_PRODUCTION_SUITE_ARCHITECTURE.md` - Detailed specs
- `new_vision/autocue-teleprompter-prototype.html` - Design aesthetic reference

---

## Your Deliverables

### 1. Branch Setup
```bash
git checkout -b feature/production-suite-infrastructure
```

### 2. Install Dependencies
```bash
npm install pinia socket.io socket.io-client
```

### 3. Pinia Store: `src/stores/production.js`

Create a comprehensive Pinia store for shared production state:

```javascript
// src/stores/production.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useProductionStore = defineStore('production', () => {
  // Course state
  const currentCourseCode = ref(null)
  const courseManifest = ref(null)
  const sampleFlags = ref({})
  const audioMetadata = ref({})

  // Loading states
  const isLoading = ref(false)
  const error = ref(null)

  // WebSocket connection state
  const wsConnected = ref(false)

  // Computed: samples by status
  const samplesByStatus = computed(() => {
    const grouped = {
      pending: [],
      flagged_regen_tts: [],
      flagged_human_needed: [],
      in_pipeline: [],
      in_recording: [],
      needs_review: [],
      approved: [],
      rejected: []
    }

    if (!sampleFlags.value.samples) return grouped

    for (const [uuid, data] of Object.entries(sampleFlags.value.samples)) {
      const status = data.status || 'pending'
      if (grouped[status]) {
        grouped[status].push({ uuid, ...data })
      }
    }

    return grouped
  })

  // Computed: progress stats
  const progressStats = computed(() => {
    const samples = sampleFlags.value.samples || {}
    const total = Object.keys(samples).length
    const approved = Object.values(samples).filter(s => s.status === 'approved').length
    const flagged = Object.values(samples).filter(s =>
      s.status?.startsWith('flagged_')
    ).length
    const inProgress = Object.values(samples).filter(s =>
      s.status === 'in_pipeline' || s.status === 'in_recording'
    ).length

    return {
      total,
      approved,
      flagged,
      inProgress,
      pending: total - approved - flagged - inProgress,
      percentComplete: total > 0 ? Math.round((approved / total) * 100) : 0
    }
  })

  // Actions
  async function loadCourse(courseCode) {
    isLoading.value = true
    error.value = null
    currentCourseCode.value = courseCode

    try {
      const [manifestRes, flagsRes, metadataRes] = await Promise.all([
        fetch(`/api/production/${courseCode}/manifest`),
        fetch(`/api/production/${courseCode}/flags`),
        fetch(`/api/production/${courseCode}/audio-metadata`)
      ])

      if (!manifestRes.ok) throw new Error('Failed to load manifest')

      courseManifest.value = await manifestRes.json()
      sampleFlags.value = flagsRes.ok ? await flagsRes.json() : { samples: {} }
      audioMetadata.value = metadataRes.ok ? await metadataRes.json() : { audio: {} }

    } catch (err) {
      error.value = err.message
      console.error('Failed to load course:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function updateSampleFlag(uuid, flagData) {
    try {
      const response = await fetch(`/api/production/${currentCourseCode.value}/flags/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid, ...flagData })
      })

      if (!response.ok) throw new Error('Failed to update flag')

      // Update local state
      if (!sampleFlags.value.samples) {
        sampleFlags.value.samples = {}
      }
      sampleFlags.value.samples[uuid] = {
        ...sampleFlags.value.samples[uuid],
        ...flagData,
        updatedAt: new Date().toISOString()
      }

      return true
    } catch (err) {
      error.value = err.message
      return false
    }
  }

  async function bulkUpdateFlags(updates) {
    try {
      const response = await fetch(`/api/production/${currentCourseCode.value}/flags/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      })

      if (!response.ok) throw new Error('Failed to bulk update flags')

      // Update local state
      for (const { uuid, ...data } of updates) {
        if (!sampleFlags.value.samples) {
          sampleFlags.value.samples = {}
        }
        sampleFlags.value.samples[uuid] = {
          ...sampleFlags.value.samples[uuid],
          ...data,
          updatedAt: new Date().toISOString()
        }
      }

      return true
    } catch (err) {
      error.value = err.message
      return false
    }
  }

  function handleWebSocketUpdate(data) {
    // Handle real-time updates from WebSocket
    if (data.type === 'sample_updated' && data.courseCode === currentCourseCode.value) {
      if (!sampleFlags.value.samples) {
        sampleFlags.value.samples = {}
      }
      sampleFlags.value.samples[data.uuid] = {
        ...sampleFlags.value.samples[data.uuid],
        ...data.update
      }
    }

    if (data.type === 'audio_metadata_updated' && data.courseCode === currentCourseCode.value) {
      if (!audioMetadata.value.audio) {
        audioMetadata.value.audio = {}
      }
      audioMetadata.value.audio[data.uuid] = data.metadata
    }
  }

  function setWsConnected(connected) {
    wsConnected.value = connected
  }

  function reset() {
    currentCourseCode.value = null
    courseManifest.value = null
    sampleFlags.value = {}
    audioMetadata.value = {}
    error.value = null
  }

  return {
    // State
    currentCourseCode,
    courseManifest,
    sampleFlags,
    audioMetadata,
    isLoading,
    error,
    wsConnected,

    // Computed
    samplesByStatus,
    progressStats,

    // Actions
    loadCourse,
    updateSampleFlag,
    bulkUpdateFlags,
    handleWebSocketUpdate,
    setWsConnected,
    reset
  }
})
```

### 4. WebSocket Service: `src/services/websocket.js`

```javascript
// src/services/websocket.js
import { io } from 'socket.io-client'
import { useProductionStore } from '@/stores/production'

let socket = null

export function initWebSocket(serverUrl = '') {
  if (socket) {
    socket.disconnect()
  }

  socket = io(serverUrl || window.location.origin, {
    path: '/api/production/websocket',
    transports: ['websocket', 'polling']
  })

  const store = useProductionStore()

  socket.on('connect', () => {
    console.log('[WS] Connected to production server')
    store.setWsConnected(true)
  })

  socket.on('disconnect', () => {
    console.log('[WS] Disconnected from production server')
    store.setWsConnected(false)
  })

  socket.on('sample_updated', (data) => {
    console.log('[WS] Sample updated:', data.uuid)
    store.handleWebSocketUpdate({ type: 'sample_updated', ...data })
  })

  socket.on('pipeline_progress', (data) => {
    console.log('[WS] Pipeline progress:', data)
    // Emit custom event for components to listen
    window.dispatchEvent(new CustomEvent('pipeline_progress', { detail: data }))
  })

  socket.on('generation_complete', (data) => {
    console.log('[WS] Generation complete:', data.uuid)
    store.handleWebSocketUpdate({ type: 'audio_metadata_updated', ...data })
  })

  socket.on('recording_completed', (data) => {
    console.log('[WS] Recording completed:', data.uuid)
    store.handleWebSocketUpdate({ type: 'audio_metadata_updated', ...data })
  })

  socket.on('error', (error) => {
    console.error('[WS] Error:', error)
  })

  return socket
}

export function getSocket() {
  return socket
}

export function joinCourseRoom(courseCode) {
  if (socket && socket.connected) {
    socket.emit('join_course', { courseCode })
  }
}

export function leaveCourseRoom(courseCode) {
  if (socket && socket.connected) {
    socket.emit('leave_course', { courseCode })
  }
}

export function disconnectWebSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
```

### 5. S3 Service: `services/s3-production-service.cjs`

```javascript
// services/s3-production-service.cjs
const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

const BUCKET = process.env.S3_BUCKET || 'popty-bach-lfs'
const REGION = process.env.S3_REGION || 'eu-west-1'

const s3Client = new S3Client({ region: REGION })

// Helper to stream S3 object to string
async function streamToString(stream) {
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf-8')
}

// Get course manifest (read-only)
async function getCourseManifest(courseCode) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: `courses/${courseCode}/course_manifest.json`
    })
    const response = await s3Client.send(command)
    const body = await streamToString(response.Body)
    return JSON.parse(body)
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return null
    }
    throw error
  }
}

// Get sample flags (QA decisions)
async function getSampleFlags(courseCode) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: `courses/${courseCode}/sample_flags.json`
    })
    const response = await s3Client.send(command)
    const body = await streamToString(response.Body)
    return JSON.parse(body)
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      // Return empty structure if file doesn't exist
      return {
        courseCode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        samples: {}
      }
    }
    throw error
  }
}

// Save sample flags
async function saveSampleFlags(courseCode, flagsData) {
  const data = {
    ...flagsData,
    courseCode,
    updatedAt: new Date().toISOString()
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: `courses/${courseCode}/sample_flags.json`,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json'
  })

  await s3Client.send(command)
  return data
}

// Get audio metadata
async function getAudioMetadata(courseCode) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: `courses/${courseCode}/audio_metadata.json`
    })
    const response = await s3Client.send(command)
    const body = await streamToString(response.Body)
    return JSON.parse(body)
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return {
        courseCode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        audio: {}
      }
    }
    throw error
  }
}

// Save audio metadata
async function saveAudioMetadata(courseCode, metadataData) {
  const data = {
    ...metadataData,
    courseCode,
    updatedAt: new Date().toISOString()
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: `courses/${courseCode}/audio_metadata.json`,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json'
  })

  await s3Client.send(command)
  return data
}

// Get signed URL for audio file
async function getAudioSignedUrl(uuid, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: `ssiborg-assets/mastered/${uuid}.mp3`
  })

  return getSignedUrl(s3Client, command, { expiresIn })
}

// Check if audio file exists
async function audioFileExists(uuid) {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET,
      Key: `ssiborg-assets/mastered/${uuid}.mp3`
    })
    await s3Client.send(command)
    return true
  } catch (error) {
    if (error.name === 'NotFound') {
      return false
    }
    throw error
  }
}

// Upload recording
async function uploadRecording(courseCode, uuid, audioBuffer, metadata = {}) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: `ssiborg-assets/mastered/${uuid}.mp3`,
    Body: audioBuffer,
    ContentType: 'audio/mpeg',
    Metadata: {
      courseCode,
      uploadedAt: new Date().toISOString(),
      ...metadata
    }
  })

  await s3Client.send(command)
  return { uuid, uploaded: true }
}

module.exports = {
  getCourseManifest,
  getSampleFlags,
  saveSampleFlags,
  getAudioMetadata,
  saveAudioMetadata,
  getAudioSignedUrl,
  audioFileExists,
  uploadRecording
}
```

### 6. Production API Server: `services/production-api.cjs`

```javascript
// services/production-api.cjs
const express = require('express')
const cors = require('cors')
const { createServer } = require('http')
const { Server } = require('socket.io')

const s3Service = require('./s3-production-service.cjs')

const app = express()
const httpServer = createServer(app)

// WebSocket setup
const io = new Server(httpServer, {
  path: '/api/production/websocket',
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
})

app.use(cors())
app.use(express.json())

// Health check
app.get('/api/production/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Get course manifest
app.get('/api/production/:courseCode/manifest', async (req, res) => {
  try {
    const { courseCode } = req.params
    const manifest = await s3Service.getCourseManifest(courseCode)

    if (!manifest) {
      return res.status(404).json({ error: 'Manifest not found' })
    }

    res.json(manifest)
  } catch (error) {
    console.error('Error fetching manifest:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get sample flags
app.get('/api/production/:courseCode/flags', async (req, res) => {
  try {
    const { courseCode } = req.params
    const flags = await s3Service.getSampleFlags(courseCode)
    res.json(flags)
  } catch (error) {
    console.error('Error fetching flags:', error)
    res.status(500).json({ error: error.message })
  }
})

// Update single sample flag
app.post('/api/production/:courseCode/flags/update', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { uuid, status, reason, notes, flaggedBy } = req.body

    if (!uuid || !status) {
      return res.status(400).json({ error: 'uuid and status required' })
    }

    // Get current flags
    const currentFlags = await s3Service.getSampleFlags(courseCode)

    // Update the specific sample
    if (!currentFlags.samples) {
      currentFlags.samples = {}
    }

    currentFlags.samples[uuid] = {
      ...currentFlags.samples[uuid],
      status,
      reason: reason || currentFlags.samples[uuid]?.reason,
      notes: notes || currentFlags.samples[uuid]?.notes,
      flaggedBy: flaggedBy || currentFlags.samples[uuid]?.flaggedBy,
      updatedAt: new Date().toISOString(),
      history: [
        ...(currentFlags.samples[uuid]?.history || []),
        {
          status,
          reason,
          timestamp: new Date().toISOString(),
          by: flaggedBy
        }
      ]
    }

    // Save back to S3
    const saved = await s3Service.saveSampleFlags(courseCode, currentFlags)

    // Broadcast update via WebSocket
    io.to(`course:${courseCode}`).emit('sample_updated', {
      courseCode,
      uuid,
      update: currentFlags.samples[uuid]
    })

    res.json({ success: true, sample: currentFlags.samples[uuid] })
  } catch (error) {
    console.error('Error updating flag:', error)
    res.status(500).json({ error: error.message })
  }
})

// Bulk update sample flags
app.post('/api/production/:courseCode/flags/bulk-update', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { updates } = req.body

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'updates array required' })
    }

    // Get current flags
    const currentFlags = await s3Service.getSampleFlags(courseCode)

    if (!currentFlags.samples) {
      currentFlags.samples = {}
    }

    // Apply all updates
    for (const { uuid, status, reason, notes, flaggedBy } of updates) {
      currentFlags.samples[uuid] = {
        ...currentFlags.samples[uuid],
        status,
        reason: reason || currentFlags.samples[uuid]?.reason,
        notes: notes || currentFlags.samples[uuid]?.notes,
        flaggedBy: flaggedBy || currentFlags.samples[uuid]?.flaggedBy,
        updatedAt: new Date().toISOString()
      }
    }

    // Save back to S3
    await s3Service.saveSampleFlags(courseCode, currentFlags)

    // Broadcast bulk update
    io.to(`course:${courseCode}`).emit('bulk_update', {
      courseCode,
      count: updates.length
    })

    res.json({ success: true, updated: updates.length })
  } catch (error) {
    console.error('Error bulk updating flags:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get audio metadata
app.get('/api/production/:courseCode/audio-metadata', async (req, res) => {
  try {
    const { courseCode } = req.params
    const metadata = await s3Service.getAudioMetadata(courseCode)
    res.json(metadata)
  } catch (error) {
    console.error('Error fetching audio metadata:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get signed URL for audio playback
app.get('/api/production/:courseCode/audio/:uuid/url', async (req, res) => {
  try {
    const { uuid } = req.params
    const url = await s3Service.getAudioSignedUrl(uuid)
    res.json({ url })
  } catch (error) {
    console.error('Error generating signed URL:', error)
    res.status(500).json({ error: error.message })
  }
})

// Check audio file exists
app.get('/api/production/:courseCode/audio/:uuid/exists', async (req, res) => {
  try {
    const { uuid } = req.params
    const exists = await s3Service.audioFileExists(uuid)
    res.json({ exists })
  } catch (error) {
    console.error('Error checking audio existence:', error)
    res.status(500).json({ error: error.message })
  }
})

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`)

  socket.on('join_course', ({ courseCode }) => {
    socket.join(`course:${courseCode}`)
    console.log(`[WS] ${socket.id} joined course:${courseCode}`)
  })

  socket.on('leave_course', ({ courseCode }) => {
    socket.leave(`course:${courseCode}`)
    console.log(`[WS] ${socket.id} left course:${courseCode}`)
  })

  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`)
  })
})

// Emit helper for external use (e.g., from audio pipeline)
function emitToRoom(courseCode, event, data) {
  io.to(`course:${courseCode}`).emit(event, data)
}

const PORT = process.env.PRODUCTION_API_PORT || 3470

httpServer.listen(PORT, () => {
  console.log(`Production API server running on port ${PORT}`)
  console.log(`WebSocket path: /api/production/websocket`)
})

module.exports = { app, io, emitToRoom }
```

### 7. Register Pinia in Main App: Update `src/main.js`

Add Pinia to the Vue app. Find the existing `createApp` section and add:

```javascript
// Add to src/main.js
import { createPinia } from 'pinia'

const pinia = createPinia()
app.use(pinia)
```

### 8. Sample Flags JSON Schema

Create the schema documentation at `docs/schemas/sample_flags.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Sample Flags",
  "description": "QA decisions and status tracking for course samples",
  "type": "object",
  "properties": {
    "courseCode": {
      "type": "string",
      "description": "Course identifier (e.g., spa_for_eng)"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    },
    "updatedAt": {
      "type": "string",
      "format": "date-time"
    },
    "samples": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "status": {
            "type": "string",
            "enum": [
              "pending",
              "flagged_regen_tts",
              "flagged_human_needed",
              "in_pipeline",
              "in_recording",
              "needs_review",
              "approved",
              "rejected"
            ]
          },
          "reason": {
            "type": "string",
            "description": "Reason for flagging"
          },
          "notes": {
            "type": "string",
            "description": "Additional notes from reviewer"
          },
          "flaggedBy": {
            "type": "string",
            "description": "User who flagged the sample"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          },
          "history": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "status": { "type": "string" },
                "reason": { "type": "string" },
                "timestamp": { "type": "string", "format": "date-time" },
                "by": { "type": "string" }
              }
            }
          }
        },
        "required": ["status"]
      }
    }
  },
  "required": ["courseCode", "samples"]
}
```

---

## Design Aesthetic Reference

Follow the cinematic dark palette from `new_vision/autocue-teleprompter-prototype.html`:

```css
:root {
  /* Cinematic Dark Palette */
  --color-void: #0a0b0f;
  --color-shadow: #16181f;
  --color-slate: #23262f;
  --color-graphite: #34384a;

  /* Accent Colors */
  --color-film-red: #e63946;
  --color-tungsten: #ffa630;
  --color-emerald: #06ffa5;

  /* Text */
  --color-paper: #f7f7f2;
  --color-paper-dim: #c1c1bb;

  /* Typography */
  --font-display: 'Crimson Pro', serif;
  --font-ui: 'Josefin Sans', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/stores/production.js` | Pinia store for shared state |
| `src/services/websocket.js` | WebSocket client service |
| `services/s3-production-service.cjs` | S3 operations for production data |
| `services/production-api.cjs` | Express API + WebSocket server |
| `docs/schemas/sample_flags.schema.json` | JSON schema documentation |

## Files to Modify

| File | Change |
|------|--------|
| `src/main.js` | Add Pinia plugin |
| `package.json` | Dependencies added via npm install |

---

## Success Criteria

Before creating your PR, verify:

- [ ] `npm install` completes without errors
- [ ] Pinia store created at `src/stores/production.js`
- [ ] WebSocket service created at `src/services/websocket.js`
- [ ] S3 service created at `services/s3-production-service.cjs`
- [ ] Production API created at `services/production-api.cjs`
- [ ] Pinia registered in `src/main.js`
- [ ] Schema documented in `docs/schemas/sample_flags.schema.json`
- [ ] API server starts without errors: `node services/production-api.cjs`
- [ ] All files follow existing code style in the repo

---

## PR Instructions

When complete:

1. Commit all changes with descriptive message
2. Push branch to origin
3. Create PR with title: `[Infrastructure] Production Suite Data Layer & API`
4. PR body should list all files created/modified
5. Tag for review by Master Orchestrator

---

## Important Notes

- **DO NOT** create UI components - that's for Masters 2, 3, 4
- **DO NOT** modify existing files except `src/main.js` for Pinia
- **DO** ensure all paths match existing project structure
- **DO** test that the API server runs before submitting
- The API port is 3470 to avoid conflicts with existing services

---

**You are Master 1 of 4. Your infrastructure enables everything else. Build it solid.**
