// services/production-api.cjs
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs-extra')
const { createServer } = require('http')
const { Server } = require('socket.io')
const createLogger = require('./shared/logger.cjs')

const logger = createLogger('ProductionAPI')

const s3Service = require('./s3-production-service.cjs')
const supabaseClient = require('./supabase-client.cjs')
const manifestGenerator = require('./manifest-generator.cjs')
const courseDataService = require('./course-data-service.cjs')

// VFS root for local file checks
const VFS_ROOT = process.env.VFS_ROOT?.endsWith('/courses')
  ? process.env.VFS_ROOT
  : path.join(process.env.VFS_ROOT || path.join(__dirname, '../public/vfs'), 'courses')

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
// Priority: 1) Database (if course structure exists), 2) S3 static file, 3) Stub
app.get('/api/production/:courseCode/manifest', async (req, res) => {
  try {
    const { courseCode } = req.params
    const source = req.query.source // 'db', 's3', or auto (default)

    // Option 1: Try database-first generation (new architecture)
    if (source !== 's3' && supabaseClient.isInitialized()) {
      try {
        const manifest = await manifestGenerator.generateManifest(courseCode)
        if (manifest && manifest.slices?.[0]?.seeds?.length > 0) {
          logger.info(`Manifest for ${courseCode} generated from database`)
          return res.json({
            ...manifest,
            _source: 'database'
          })
        }
      } catch (dbError) {
        // Course not in database yet, fall through to S3
        logger.debug(`Database manifest generation failed for ${courseCode}: ${dbError.message}`)
      }
    }

    // Option 2: Try S3 static manifest (legacy)
    if (source !== 'db') {
      const manifest = await s3Service.getCourseManifest(courseCode)
      if (manifest) {
        logger.info(`Manifest for ${courseCode} loaded from S3`)
        return res.json({
          ...manifest,
          _source: 's3'
        })
      }
    }

    // Option 3: Return stub if course exists but manifest not ready
    const basketsPath = path.join(VFS_ROOT, courseCode, 'lego_baskets.json')
    if (await fs.pathExists(basketsPath)) {
      const baskets = await fs.readJson(basketsPath)
      const basketCount = Object.keys(baskets.baskets || baskets || {}).length
      return res.json({
        _stub: true,
        _source: 'stub',
        _message: 'Manifest not yet compiled. Import course to database or run audio generation.',
        courseCode,
        status: 'pre-audio',
        basketCount,
        seeds: [],
        audio: {},
        version: 'stub'
      })
    }

    return res.status(404).json({ error: 'Course not found' })
  } catch (error) {
    logger.error('Error fetching manifest:', error)
    res.status(500).json({ error: error.message })
  }
})

// Generate manifest from database (explicit trigger)
app.post('/api/production/:courseCode/manifest/generate', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    logger.info(`Generating manifest for ${courseCode} from database...`)
    const manifest = await manifestGenerator.generateManifest(courseCode)

    // Validate it
    const validation = await manifestGenerator.validateManifest(manifest)

    res.json({
      success: true,
      manifest,
      validation,
      stats: {
        seeds: manifest.slices?.[0]?.seeds?.length || 0,
        samples: Object.keys(manifest.slices?.[0]?.samples || {}).length
      }
    })
  } catch (error) {
    logger.error('Error generating manifest:', error)
    res.status(500).json({ error: error.message })
  }
})

// Validate manifest audio coverage
app.get('/api/production/:courseCode/manifest/validate', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const manifest = await manifestGenerator.generateManifest(courseCode)
    const validation = await manifestGenerator.validateManifest(manifest)

    res.json(validation)
  } catch (error) {
    logger.error('Error validating manifest:', error)
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
    const {
      uuid,
      audioData,
      metadata = {},
      provenance = {}
    } = req.body

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
        `Recorded by ${metadata.recordedBy || provenance.recordedBy || 'human'} at ${new Date().toISOString()}`,
        metadata.recordedBy || provenance.recordedBy || 'human'
      )

      // Insert recording provenance if metadata provided
      if (provenance.recordedBy) {
        try {
          await supabaseClient.insertRecordingProvenance({
            audioUuid: uuid,
            recordedBy: provenance.recordedBy,
            speakerNativeLanguage: provenance.speakerNativeLanguage,
            speakerProficiency: provenance.speakerProficiency,
            speakerAgeRange: provenance.speakerAgeRange,
            speakerDialect: provenance.speakerDialect,
            speakerRegion: provenance.speakerRegion,
            recordedAt: provenance.recordedAt || new Date().toISOString(),
            recordingLocation: provenance.recordingLocation,
            recordingDevice: provenance.recordingDevice,
            recordingEnvironment: provenance.recordingEnvironment,
            speakerConsent: provenance.speakerConsent !== undefined ? provenance.speakerConsent : true,
            consentFormRef: provenance.consentFormRef,
            usageRights: provenance.usageRights,
            qualityNotes: provenance.qualityNotes,
            retakeCount: provenance.retakeCount || 0
          })
          logger.log(`Provenance metadata recorded for ${uuid}`)
        } catch (provenanceError) {
          // Log error but don't fail the upload
          logger.error('Error inserting provenance metadata:', provenanceError)
          logger.error('Upload succeeded but provenance recording failed')
        }
      }
    }

    // Emit recording_completed event
    io.to(`course:${courseCode}`).emit('recording_completed', {
      courseCode,
      uuid,
      metadata: {
        recordedAt: provenance.recordedAt || new Date().toISOString(),
        recordedBy: metadata.recordedBy || provenance.recordedBy || 'human',
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

// NOTE: Audio Pipeline routes are defined at the bottom of this file (lines ~940+)
// They use axios with proper response transformation for the frontend

// Recording Queue: Get recording queue
// GET /api/production/:courseCode/recording/queue
app.get('/api/production/:courseCode/recording/queue', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { page = 1, pageSize = 20 } = req.query

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    logger.log(`Getting recording queue for ${courseCode}`)

    const result = await supabaseClient.getRecordingQueue(
      courseCode,
      parseInt(page),
      parseInt(pageSize)
    )

    res.json(result)
  } catch (error) {
    logger.error('Error getting recording queue:', error)
    res.status(500).json({ error: error.message })
  }
})

// Recording: Claim a sample for recording
// POST /api/production/:courseCode/recording/claim
// Body: { uuid, claimedBy }
app.post('/api/production/:courseCode/recording/claim', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { uuid, claimedBy } = req.body

    if (!uuid) {
      return res.status(400).json({ error: 'uuid is required' })
    }
    if (!claimedBy) {
      return res.status(400).json({ error: 'claimedBy is required' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    logger.log(`${claimedBy} claiming sample ${uuid} for recording in ${courseCode}`)

    // Update status from 'flagged_human_needed' to 'in_recording'
    const updated = await supabaseClient.updateRecordingStatus(
      uuid,
      courseCode,
      'in_recording',
      `Claimed by ${claimedBy}`,
      claimedBy
    )

    // Emit WebSocket event
    io.to(`course:${courseCode}`).emit('recording_claimed', {
      courseCode,
      uuid,
      claimedBy,
      timestamp: new Date().toISOString()
    })

    res.json({
      success: true,
      sample: updated
    })
  } catch (error) {
    logger.error('Error claiming recording:', error)

    // Handle invalid transition
    if (error.message.includes('Invalid transition')) {
      return res.status(400).json({ error: error.message })
    }

    res.status(500).json({ error: error.message })
  }
})

// Recording: Release a claimed sample
// POST /api/production/:courseCode/recording/release
// Body: { uuid, releasedBy }
app.post('/api/production/:courseCode/recording/release', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { uuid, releasedBy } = req.body

    if (!uuid) {
      return res.status(400).json({ error: 'uuid is required' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    logger.log(`${releasedBy || 'User'} releasing sample ${uuid} in ${courseCode}`)

    // Update status from 'in_recording' back to 'flagged_human_needed'
    const updated = await supabaseClient.updateRecordingStatus(
      uuid,
      courseCode,
      'flagged_human_needed',
      `Released by ${releasedBy || 'User'}`,
      releasedBy
    )

    // Emit WebSocket event
    io.to(`course:${courseCode}`).emit('recording_released', {
      courseCode,
      uuid,
      releasedBy,
      timestamp: new Date().toISOString()
    })

    res.json({
      success: true,
      sample: updated
    })
  } catch (error) {
    logger.error('Error releasing recording:', error)

    if (error.message.includes('Invalid transition')) {
      return res.status(400).json({ error: error.message })
    }

    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// REGENERATION ENDPOINTS
// =============================================================================

// Regeneration Queue: Get samples needing regeneration
// GET /api/production/:courseCode/regeneration/queue
app.get('/api/production/:courseCode/regeneration/queue', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Get flagged samples from Supabase
    const flaggedSamples = await supabaseClient.getFlaggedForRegeneration(courseCode)

    // Transform to include audio details
    const items = flaggedSamples.map(flag => ({
      uuid: flag.audio_uuid,
      status: flag.status,
      notes: flag.notes,
      flaggedBy: flag.flagged_by,
      flaggedAt: flag.flagged_at,
      history: flag.history,
      audio: flag.audio_samples
    }))

    res.json({
      items,
      total: items.length
    })
  } catch (error) {
    logger.error('Error fetching regeneration queue:', error)
    res.status(500).json({ error: error.message })
  }
})

// Regeneration: Trigger regeneration for specific samples
// POST /api/production/:courseCode/regeneration/trigger
app.post('/api/production/:courseCode/regeneration/trigger', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { uuids } = req.body

    if (!Array.isArray(uuids) || uuids.length === 0) {
      return res.status(400).json({ error: 'uuids array required' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    logger.log(`Triggering regeneration for ${uuids.length} samples in ${courseCode}`)

    // Update status to 'in_pipeline'
    await supabaseClient.bulkUpdateFlagStatus(
      uuids,
      courseCode,
      'in_pipeline',
      'Regeneration triggered'
    )

    // Get sample details for regeneration
    const samples = []
    for (const uuid of uuids) {
      const sample = await supabaseClient.getAudioSample(uuid)
      if (sample) {
        samples.push(sample)
      }
    }

    // Call Phase 8 to regenerate audio
    const response = await proxyToPhase8('POST', '/generate', {
      courseCode,
      regenerate: true,
      uuids
    })

    // Emit WebSocket event
    io.to(`course:${courseCode}`).emit('regeneration_started', {
      courseCode,
      uuids,
      count: uuids.length,
      timestamp: new Date().toISOString()
    })

    // Update status based on Phase 8 response
    if (response.status === 200) {
      res.json({
        success: true,
        count: uuids.length,
        jobId: response.data.jobId
      })
    } else {
      // If Phase 8 failed, update status back to flagged
      await supabaseClient.bulkUpdateFlagStatus(
        uuids,
        courseCode,
        'flagged_regen_tts',
        `Regeneration failed: ${response.data.error || 'Unknown error'}`
      )
      res.status(response.status).json(response.data)
    }
  } catch (error) {
    logger.error('Error triggering regeneration:', error)
    res.status(500).json({ error: error.message })
  }
})

// Regeneration: Trigger regeneration for ALL flagged samples
// POST /api/production/:courseCode/regeneration/trigger-all
app.post('/api/production/:courseCode/regeneration/trigger-all', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    logger.log(`Triggering regeneration for ALL flagged samples in ${courseCode}`)

    // Get all flagged samples
    const flaggedSamples = await supabaseClient.getFlaggedForRegeneration(courseCode)

    if (flaggedSamples.length === 0) {
      return res.json({
        success: true,
        count: 0,
        message: 'No samples flagged for regeneration'
      })
    }

    const uuids = flaggedSamples.map(flag => flag.audio_uuid)

    // Update status to 'in_pipeline'
    await supabaseClient.bulkUpdateFlagStatus(
      uuids,
      courseCode,
      'in_pipeline',
      'Bulk regeneration triggered'
    )

    // Call Phase 8 to regenerate audio
    const response = await proxyToPhase8('POST', '/generate', {
      courseCode,
      regenerate: true,
      uuids
    })

    // Emit WebSocket event
    io.to(`course:${courseCode}`).emit('regeneration_started', {
      courseCode,
      uuids,
      count: uuids.length,
      timestamp: new Date().toISOString()
    })

    // Update status based on Phase 8 response
    if (response.status === 200) {
      res.json({
        success: true,
        count: uuids.length,
        jobId: response.data.jobId
      })
    } else {
      // If Phase 8 failed, update status back to flagged
      await supabaseClient.bulkUpdateFlagStatus(
        uuids,
        courseCode,
        'flagged_regen_tts',
        `Bulk regeneration failed: ${response.data.error || 'Unknown error'}`
      )
      res.status(response.status).json(response.data)
    }
  } catch (error) {
    logger.error('Error triggering bulk regeneration:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// VOICE MANAGEMENT ENDPOINTS
// =============================================================================

// List all voices with optional filters
// GET /api/production/voices?type=human&language=spa&active=true
app.get('/api/production/voices', async (req, res) => {
  try {
    const { type, language, active } = req.query

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const filters = {}
    if (type) filters.type = type
    if (language) filters.language = language
    if (active !== undefined) filters.isActive = active === 'true'

    const voices = await supabaseClient.listVoices(filters)

    res.json({
      success: true,
      count: voices.length,
      voices
    })
  } catch (error) {
    logger.error('Error listing voices:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get voice details by ID
// GET /api/production/voices/:voiceId
app.get('/api/production/voices/:voiceId', async (req, res) => {
  try {
    const { voiceId } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const voice = await supabaseClient.getVoice(voiceId)

    if (!voice) {
      return res.status(404).json({ error: 'Voice not found' })
    }

    res.json({
      success: true,
      voice
    })
  } catch (error) {
    logger.error('Error getting voice:', error)
    res.status(500).json({ error: error.message })
  }
})

// Register a new human voice
// POST /api/production/voices/register-human
// Body: { voiceId, humanName, humanEmail, languages, metadata }
app.post('/api/production/voices/register-human', async (req, res) => {
  try {
    const { voiceId, humanName, humanEmail, languages, metadata } = req.body

    // Validation
    if (!voiceId) {
      return res.status(400).json({ error: 'voiceId is required' })
    }
    if (!humanName) {
      return res.status(400).json({ error: 'humanName is required' })
    }
    if (!languages || !Array.isArray(languages) || languages.length === 0) {
      return res.status(400).json({ error: 'languages array must have at least one entry' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Register the voice
    const voice = await supabaseClient.registerHumanVoice({
      voiceId,
      humanName,
      humanEmail,
      languages,
      metadata
    })

    logger.log(`Registered human voice: ${voiceId} (${humanName})`)

    res.status(201).json({
      success: true,
      voice
    })
  } catch (error) {
    logger.error('Error registering human voice:', error)

    // Handle duplicate voice error
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message })
    }

    // Handle validation errors
    if (error.message.includes('must start with') ||
        error.message.includes('is required') ||
        error.message.includes('must have at least')) {
      return res.status(400).json({ error: error.message })
    }

    res.status(500).json({ error: error.message })
  }
})

// Update voice status (activate/deactivate)
// PATCH /api/production/voices/:voiceId/status
// Body: { isActive: boolean }
app.patch('/api/production/voices/:voiceId/status', async (req, res) => {
  try {
    const { voiceId } = req.params
    const { isActive } = req.body

    // Validation
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Update status
    const voice = await supabaseClient.updateVoiceStatus(voiceId, isActive)

    logger.log(`Updated voice ${voiceId} status to: ${isActive ? 'active' : 'inactive'}`)

    res.json({
      success: true,
      voice
    })
  } catch (error) {
    logger.error('Error updating voice status:', error)

    // Handle not found error
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Voice not found' })
    }

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

// =============================================================================
// AUDIO PIPELINE ROUTES - Proxy to Phase 8 service on port 3465
// =============================================================================

const PHASE8_URL = process.env.PHASE8_URL || 'http://localhost:3465'
const axios = require('axios')

// GET /api/production/:courseCode/audio-pipeline/plan
// Get generation plan with cost estimates
app.get('/api/production/:courseCode/audio-pipeline/plan', async (req, res) => {
  const { courseCode } = req.params
  try {
    const response = await axios.post(`${PHASE8_URL}/plan`, { courseCode })
    // Transform response for frontend
    const plan = response.data.plan || {}
    res.json({
      success: true,
      estimatedCost: `$${plan.estimatedCostUSD || '0.00'}`,
      estimatedTime: `${Math.ceil((plan.missingSamples || 0) / 60)} min`,
      total: plan.totalSamples || 0,
      existing: plan.existingSamples || 0,
      missing: plan.missingSamples || 0,
      breakdown: [
        { role: 'source', count: plan.sampleBreakdown?.source || 0 },
        { role: 'target1', count: plan.sampleBreakdown?.target1 || 0 },
        { role: 'target2', count: plan.sampleBreakdown?.target2 || 0 }
      ],
      voices: plan.voiceAssignments || {}
    })
  } catch (error) {
    logger.error(`Audio plan error for ${courseCode}:`, error.message)
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Phase 8 audio service not running' })
    }
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message })
  }
})

// POST /api/production/:courseCode/audio-pipeline/start
// Start audio generation
app.post('/api/production/:courseCode/audio-pipeline/start', async (req, res) => {
  const { courseCode } = req.params
  const { options } = req.body
  try {
    const response = await axios.post(`${PHASE8_URL}/generate`, { courseCode, options })
    res.json(response.data)
  } catch (error) {
    logger.error(`Audio start error for ${courseCode}:`, error.message)
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Phase 8 audio service not running' })
    }
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message })
  }
})

// GET /api/production/:courseCode/audio-pipeline/status
// Get generation status
app.get('/api/production/:courseCode/audio-pipeline/status', async (req, res) => {
  const { courseCode } = req.params
  try {
    const response = await axios.get(`${PHASE8_URL}/status/${courseCode}`)
    res.json(response.data)
  } catch (error) {
    if (error.response?.status === 404) {
      return res.json({ success: true, job: null, message: 'No active job' })
    }
    logger.error(`Audio status error for ${courseCode}:`, error.message)
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Phase 8 audio service not running' })
    }
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message })
  }
})

// POST /api/production/:courseCode/audio-pipeline/cancel
// Cancel generation (POST to match frontend expectation)
app.post('/api/production/:courseCode/audio-pipeline/cancel', async (req, res) => {
  const { courseCode } = req.params
  try {
    const response = await axios.delete(`${PHASE8_URL}/cancel/${courseCode}`)
    res.json(response.data)
  } catch (error) {
    logger.error(`Audio cancel error for ${courseCode}:`, error.message)
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Phase 8 audio service not running' })
    }
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message })
  }
})

// POST /api/production/:courseCode/audio-pipeline/retry
// Retry failed audio generation
app.post('/api/production/:courseCode/audio-pipeline/retry', async (req, res) => {
  const { courseCode } = req.params
  const { options } = req.body
  try {
    const response = await axios.post(`${PHASE8_URL}/generate`, {
      courseCode,
      retry: true,
      ...options
    })
    res.json(response.data)
  } catch (error) {
    logger.error(`Audio retry error for ${courseCode}:`, error.message)
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Phase 8 audio service not running' })
    }
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message })
  }
})

// =============================================================================
// Database-First Course Data Endpoints
// =============================================================================

// Get seeds from database
app.get('/api/production/:courseCode/seeds', async (req, res) => {
  const { courseCode } = req.params
  try {
    const seeds = await courseDataService.getSeedsByCourse(courseCode)
    res.json({
      courseCode,
      count: seeds.length,
      seeds
    })
  } catch (error) {
    logger.error(`Error fetching seeds for ${courseCode}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// Get LEGOs from database
app.get('/api/production/:courseCode/legos', async (req, res) => {
  const { courseCode } = req.params
  try {
    const legos = await courseDataService.getLegosByCourse(courseCode)
    res.json({
      courseCode,
      count: legos.length,
      legos
    })
  } catch (error) {
    logger.error(`Error fetching legos for ${courseCode}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// Get course progress from database
app.get('/api/production/:courseCode/progress', async (req, res) => {
  const { courseCode } = req.params
  try {
    const progress = await courseDataService.getCourseProgress(courseCode)
    res.json(progress)
  } catch (error) {
    logger.error(`Error fetching progress for ${courseCode}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// Update a LEGO in database
app.patch('/api/production/:courseCode/lego/:legoId', async (req, res) => {
  const { courseCode, legoId } = req.params
  const updates = req.body
  try {
    // Parse legoId: "S0001L02" -> seedNumber=1, legoIndex=2
    const seedNumber = courseDataService.parseSeedNumber(legoId)
    const legoIndex = courseDataService.parseLegoIndex(legoId)

    if (!seedNumber || !legoIndex) {
      return res.status(400).json({ error: `Invalid legoId format: ${legoId}` })
    }

    const result = await courseDataService.updateLego(courseCode, seedNumber, legoIndex, updates)
    res.json({
      success: true,
      lego: result
    })
  } catch (error) {
    logger.error(`Error updating lego ${legoId}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// Delete a seed from database (soft delete by removing from course)
app.delete('/api/production/:courseCode/seed/:seedNumber', async (req, res) => {
  const { courseCode, seedNumber } = req.params
  try {
    const result = await courseDataService.deleteSeed(courseCode, parseInt(seedNumber))
    if (!result) {
      return res.status(404).json({ error: `Seed ${seedNumber} not found in course ${courseCode}` })
    }
    res.json({
      success: true,
      deleted: courseDataService.formatSeedId(parseInt(seedNumber))
    })
  } catch (error) {
    logger.error(`Error deleting seed ${seedNumber} from ${courseCode}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// Get basket phrases for a LEGO
app.get('/api/production/:courseCode/lego/:legoId/basket', async (req, res) => {
  const { courseCode, legoId } = req.params
  try {
    // Parse legoId: "S0001L02" -> seedNumber=1, legoIndex=2
    const seedNumber = courseDataService.parseSeedNumber(legoId)
    const legoIndex = courseDataService.parseLegoIndex(legoId)

    if (!seedNumber || !legoIndex) {
      return res.status(400).json({ error: `Invalid legoId format: ${legoId}` })
    }

    const phrases = await courseDataService.getPracticePhrases(courseCode, seedNumber, legoIndex)
    res.json({
      courseCode,
      legoId,
      count: phrases.length,
      phrases
    })
  } catch (error) {
    logger.error(`Error fetching basket for lego ${legoId}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// Get all baskets for a seed (for LegoBasketViewer)
app.get('/api/production/:courseCode/seed/:seedId/baskets', async (req, res) => {
  const { courseCode, seedId } = req.params
  try {
    // Get seed with all legos and their basket phrases (nested via includeLegos)
    const seedData = await courseDataService.getSeed(courseCode, seedId.toUpperCase(), {
      includeLegos: true  // This includes lego_components and basket_phrases
    })

    if (!seedData) {
      return res.status(404).json({ error: `Seed ${seedId} not found in ${courseCode}` })
    }

    // Build baskets object keyed by lego_id (e.g., "S0001L01")
    const baskets = {}
    for (const lego of seedData.course_legos || []) {
      // Derive lego_id from seed_number and lego_index
      const derivedSeedId = 'S' + seedData.seed_number.toString().padStart(4, '0')
      const derivedLegoId = derivedSeedId + 'L' + lego.lego_index.toString().padStart(2, '0')

      if (lego.course_practice_phrases && lego.course_practice_phrases.length > 0) {
        baskets[derivedLegoId] = {
          lego: {
            known: lego.known_text,
            target: lego.target_text
          },
          type: lego.type,
          is_new: lego.is_new,
          components: (lego.lego_components || []).map(c => ({
            known: c.known_text,
            target: c.target_text
          })),
          practice_phrases: lego.course_practice_phrases.sort((a, b) => a.position - b.position).map(bp => ({
            known: bp.known_text,
            target: bp.target_text,
            is_debut: bp.is_debut,
            is_component: bp.is_component
          }))
        }
      }
    }

    res.json({
      courseCode,
      seedId: courseDataService.formatSeedId(seedData.seed_number),
      seed_pair: {
        known: seedData.known_text,
        target: seedData.target_text
      },
      basketCount: Object.keys(baskets).length,
      baskets
    })
  } catch (error) {
    logger.error(`Error fetching baskets for seed ${seedId}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// Mark LEGO as new/not-new
app.post('/api/production/:courseCode/lego/:legoId/mark-new', async (req, res) => {
  const { courseCode, legoId } = req.params
  const { isNew } = req.body
  try {
    // Parse legoId: "S0001L02" -> seedNumber=1, legoIndex=2
    const seedNumber = courseDataService.parseSeedNumber(legoId)
    const legoIndex = courseDataService.parseLegoIndex(legoId)

    if (!seedNumber || !legoIndex) {
      return res.status(400).json({ error: `Invalid legoId format: ${legoId}` })
    }

    const result = await courseDataService.markLegoAsNew(courseCode, seedNumber, legoIndex, isNew)
    res.json({
      success: true,
      lego: result
    })
  } catch (error) {
    logger.error(`Error marking lego ${legoId} as new:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

const PORT = process.env.PRODUCTION_API_PORT || 3470

httpServer.listen(PORT, () => {
  logger.log(`Production API server running on port ${PORT}`)
  logger.log(`WebSocket path: /api/production/websocket`)
})

module.exports = { app, io, emitToRoom }
