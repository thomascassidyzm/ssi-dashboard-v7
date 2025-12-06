// services/production-api.cjs
const express = require('express')
const cors = require('cors')
const { createServer } = require('http')
const { Server } = require('socket.io')
const createLogger = require('./shared/logger.cjs')

const logger = createLogger('ProductionAPI')

const s3Service = require('./s3-production-service.cjs')
const supabaseClient = require('./supabase-client.cjs')

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
  const supabaseInitialized = supabaseClient.isInitialized()
  res.json({
    status: 'ok',
    service: 'Production API',
    port: PORT,
    timestamp: new Date().toISOString(),
    supabase: supabaseInitialized ? 'connected' : 'not initialized'
  })
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
    logger.error('Error fetching manifest:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get sample flags
app.get('/api/production/:courseCode/flags', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Get flags from Supabase
    const flagsArray = await supabaseClient.getCourseFlags(courseCode)

    // Transform Supabase format to legacy S3 format for backward compatibility
    const flags = {
      courseCode,
      samples: {}
    }

    for (const flag of flagsArray) {
      flags.samples[flag.audio_uuid] = {
        status: flag.status,
        notes: flag.notes,
        flaggedBy: flag.flagged_by,
        updatedAt: flag.flagged_at,
        history: flag.history || []
      }
    }

    res.json(flags)
  } catch (error) {
    logger.error('Error fetching flags:', error)
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

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Update flag in Supabase (includes automatic history tracking)
    const combinedNotes = reason ? `${reason}${notes ? '\n' + notes : ''}` : notes
    const updated = await supabaseClient.updateSampleFlag(
      uuid,
      courseCode,
      status,
      combinedNotes,
      flaggedBy
    )

    // Broadcast update via WebSocket
    io.to(`course:${courseCode}`).emit('sample_updated', {
      courseCode,
      uuid,
      update: {
        status: updated.status,
        notes: updated.notes,
        flaggedBy: updated.flagged_by,
        updatedAt: updated.flagged_at,
        history: updated.history
      }
    })

    res.json({
      success: true,
      sample: {
        status: updated.status,
        notes: updated.notes,
        flaggedBy: updated.flagged_by,
        updatedAt: updated.flagged_at,
        history: updated.history
      }
    })
  } catch (error) {
    logger.error('Error updating flag:', error)
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

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Apply all updates to Supabase
    const results = []
    for (const { uuid, status, reason, notes, flaggedBy } of updates) {
      const combinedNotes = reason ? `${reason}${notes ? '\n' + notes : ''}` : notes
      const updated = await supabaseClient.updateSampleFlag(
        uuid,
        courseCode,
        status,
        combinedNotes,
        flaggedBy
      )
      results.push(updated)
    }

    // Broadcast bulk update
    io.to(`course:${courseCode}`).emit('bulk_update', {
      courseCode,
      count: updates.length
    })

    res.json({ success: true, updated: updates.length })
  } catch (error) {
    logger.error('Error bulk updating flags:', error)
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
    logger.error('Error fetching audio metadata:', error)
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
    logger.error('Error generating signed URL:', error)
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
    logger.error('Error checking audio existence:', error)
    res.status(500).json({ error: error.message })
  }
})

// Upload human recording
// POST /api/production/:courseCode/recording/upload
app.post('/api/production/:courseCode/recording/upload', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { uuid, audioData, metadata = {} } = req.body

    if (!uuid || !audioData) {
      return res.status(400).json({ error: 'uuid and audioData required' })
    }

    // Decode base64 audio data
    const audioBuffer = Buffer.from(audioData, 'base64')

    // Upload to S3
    const result = await s3Service.uploadRecording(courseCode, uuid, audioBuffer, {
      ...metadata,
      recordedBy: 'human',
      source: 'recording'
    })

    // Update the sample flag in Supabase to mark as recorded
    if (supabaseClient.isInitialized()) {
      await supabaseClient.updateSampleFlag(
        uuid,
        courseCode,
        'needs_review',
        `Recorded by ${metadata.recordedBy || 'human'} at ${new Date().toISOString()}`,
        metadata.recordedBy || 'human'
      )
    }

    // Emit recording_completed event
    io.to(`course:${courseCode}`).emit('recording_completed', {
      courseCode,
      uuid,
      metadata: {
        recordedAt: new Date().toISOString(),
        recordedBy: metadata.recordedBy || 'human',
        source: 'recording',
        ...metadata
      }
    })

    res.json({ success: true, uuid, uploaded: true })
  } catch (error) {
    logger.error('Error uploading recording:', error)
    res.status(500).json({ error: error.message })
  }
})

// Helper function to proxy requests to Phase 8 Audio Generator (port 3465)
async function proxyToPhase8(method, path, body = null) {
  const http = require('http')

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3465,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    }

    const req = http.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve({ status: res.statusCode, data: parsed })
        } catch (error) {
          resolve({ status: res.statusCode, data })
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    if (body) {
      req.write(JSON.stringify(body))
    }

    req.end()
  })
}

// Audio Pipeline: Start audio generation
// POST /api/production/:courseCode/audio-pipeline/start
app.post('/api/production/:courseCode/audio-pipeline/start', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { options } = req.body

    logger.log(`Starting audio pipeline for ${courseCode}`)

    const response = await proxyToPhase8('POST', '/generate', {
      courseCode,
      ...options
    })

    res.status(response.status).json(response.data)
  } catch (error) {
    logger.error('Error starting audio pipeline:', error)
    res.status(500).json({ error: error.message })
  }
})

// Audio Pipeline: Cancel audio generation
// POST /api/production/:courseCode/audio-pipeline/cancel
app.post('/api/production/:courseCode/audio-pipeline/cancel', async (req, res) => {
  try {
    const { courseCode } = req.params

    logger.log(`Cancelling audio pipeline for ${courseCode}`)

    const response = await proxyToPhase8('DELETE', `/cancel/${courseCode}`)

    res.status(response.status).json(response.data)
  } catch (error) {
    logger.error('Error cancelling audio pipeline:', error)
    res.status(500).json({ error: error.message })
  }
})

// Audio Pipeline: Retry audio generation
// POST /api/production/:courseCode/audio-pipeline/retry
app.post('/api/production/:courseCode/audio-pipeline/retry', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { options } = req.body

    logger.log(`Retrying audio pipeline for ${courseCode}`)

    const response = await proxyToPhase8('POST', '/generate', {
      courseCode,
      retry: true,
      ...options
    })

    res.status(response.status).json(response.data)
  } catch (error) {
    logger.error('Error retrying audio pipeline:', error)
    res.status(500).json({ error: error.message })
  }
})

// Audio Pipeline: Get generation plan (dry-run)
// GET /api/production/:courseCode/audio-pipeline/plan
app.get('/api/production/:courseCode/audio-pipeline/plan', async (req, res) => {
  try {
    const { courseCode } = req.params

    logger.log(`Getting audio pipeline plan for ${courseCode}`)

    const response = await proxyToPhase8('POST', '/plan', { courseCode })

    res.status(response.status).json(response.data)
  } catch (error) {
    logger.error('Error getting audio pipeline plan:', error)
    res.status(500).json({ error: error.message })
  }
})

// Recording Queue: Get recording queue (mock for now)
// GET /api/production/:courseCode/recording/queue
app.get('/api/production/:courseCode/recording/queue', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { page = 1, pageSize = 20 } = req.query

    logger.log(`Getting recording queue for ${courseCode}`)

    // TODO: Implement real recording queue from Supabase
    // For now, return mock data
    res.json({
      items: [],
      total: 0,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    })
  } catch (error) {
    logger.error('Error getting recording queue:', error)
    res.status(500).json({ error: error.message })
  }
})

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.log(`Client connected: ${socket.id}`)

  socket.on('join_course', ({ courseCode }) => {
    socket.join(`course:${courseCode}`)
    logger.log(`${socket.id} joined course:${courseCode}`)
  })

  socket.on('leave_course', ({ courseCode }) => {
    socket.leave(`course:${courseCode}`)
    logger.log(`${socket.id} left course:${courseCode}`)
  })

  socket.on('disconnect', () => {
    logger.log(`Client disconnected: ${socket.id}`)
  })
})

// Emit helper for external use (e.g., from audio pipeline)
function emitToRoom(courseCode, event, data) {
  io.to(`course:${courseCode}`).emit(event, data)
}

// Internal emit endpoint - for phase servers to emit WebSocket events
// POST /api/production/internal/emit
app.post('/api/production/internal/emit', (req, res) => {
  const { courseCode, event, data } = req.body

  if (!courseCode || !event) {
    return res.status(400).json({ error: 'courseCode and event required' })
  }

  emitToRoom(courseCode, event, { courseCode, ...data })
  logger.log(`Emitted ${event} to course:${courseCode}`)

  res.json({ success: true, event, courseCode })
})

const PORT = process.env.PRODUCTION_API_PORT || 3470

httpServer.listen(PORT, () => {
  logger.log(`Production API server running on port ${PORT}`)
  logger.log(`WebSocket path: /api/production/websocket`)
})

module.exports = { app, io, emitToRoom }
