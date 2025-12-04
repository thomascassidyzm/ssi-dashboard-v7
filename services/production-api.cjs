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
