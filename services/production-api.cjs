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
const { SchemaValidator } = require('./schema-validator.cjs')
const learningScriptGenerator = require('./learning-script-generator.cjs')
const audioProcessor = require('./audio-processor.cjs')

// =============================================================================
// MANIFEST CACHING
// =============================================================================
// Cache generated manifests - DISABLED during development
// Re-enable once testing is complete
const manifestCache = new Map()
const MANIFEST_CACHE_TTL_MS = 0 // DISABLED - caching causes issues during testing

async function getCachedManifest(courseCode) {
  const cached = manifestCache.get(courseCode)
  if (cached && (Date.now() - cached.timestamp) < MANIFEST_CACHE_TTL_MS) {
    logger.info(`[Cache HIT] Manifest for ${courseCode} (age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`)
    return cached.manifest
  }

  // Generate fresh manifest
  const startTime = Date.now()
  const manifest = await manifestGenerator.generateManifest(courseCode)
  const elapsed = Date.now() - startTime

  logger.info(`[Cache MISS] Generated manifest for ${courseCode} in ${elapsed}ms`)

  // Cache it
  manifestCache.set(courseCode, { manifest, timestamp: Date.now() })

  return manifest
}

// Clear cache for a specific course (call after data updates)
function invalidateManifestCache(courseCode) {
  if (manifestCache.has(courseCode)) {
    manifestCache.delete(courseCode)
    logger.info(`[Cache] Invalidated manifest cache for ${courseCode}`)
  }
}

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

// Disable ALL caching on API responses during development
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  res.set('Surrogate-Control', 'no-store')
  next()
})

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

// Schema validation - compare APML spec against live database
app.get('/api/production/schema/validate', async (req, res) => {
  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const validator = new SchemaValidator(supabaseClient.getClient())
    const results = await validator.validate()

    logger.info(`Schema validation: ${results.valid ? 'VALID' : 'DRIFT DETECTED'}`)

    res.json(results)
  } catch (err) {
    logger.error('Schema validation failed:', err)
    res.status(500).json({ error: err.message })
  }
})

// Get content stats for all courses (seeds, legos, baskets counts)
// Used by dashboard course listings to show real counts
// Database-only: no local JSON fallback (remote users can't access local files)
app.get('/api/production/course-stats', async (req, res) => {
  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const stats = await supabaseClient.getAllCourseContentStats()
    logger.info(`Returning content stats for ${Object.keys(stats).length} courses from database`)

    res.json({
      success: true,
      stats
    })
  } catch (err) {
    logger.error('Failed to get course content stats:', err)
    res.status(500).json({ error: err.message })
  }
})

// Get content stats for a single course
// Used by Course Editor to show accurate counts matching Production Suite list
app.get('/api/production/:courseCode/stats', async (req, res) => {
  const { courseCode } = req.params
  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const stats = await supabaseClient.getCourseContentStats(courseCode)
    logger.info(`Returning content stats for ${courseCode}: ${JSON.stringify(stats)}`)

    res.json({
      success: true,
      courseCode,
      stats
    })
  } catch (err) {
    logger.error(`Failed to get stats for ${courseCode}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Get course info including status
// Used by Production Suite to display course status and allow status changes
app.get('/api/production/:courseCode/info', async (req, res) => {
  const { courseCode } = req.params
  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const course = await supabaseClient.getCourse(courseCode)
    if (!course) {
      return res.status(404).json({ error: `Course ${courseCode} not found` })
    }

    logger.info(`Returning info for ${courseCode}: status=${course.status}`)

    res.json({
      success: true,
      course: {
        code: course.course_code,
        displayName: course.display_name,
        knownLang: course.known_lang,
        targetLang: course.target_lang,
        status: course.status,
        courseType: course.course_type,
        creatorEmail: course.creator_email,
        createdAt: course.created_at,
        updatedAt: course.updated_at,
        seed_count: course.seed_count  // Release target for decomposition
      }
    })
  } catch (err) {
    logger.error(`Failed to get info for ${courseCode}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Update course status
// Used by Production Suite to mark courses as draft, beta, or released
app.post('/api/production/:courseCode/status', async (req, res) => {
  const { courseCode } = req.params
  const { status } = req.body

  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required' })
    }

    const validStatuses = ['draft', 'beta', 'released']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`
      })
    }

    const updatedCourse = await supabaseClient.updateCourseStatus(courseCode, status)
    logger.info(`Updated ${courseCode} status to ${status}`)

    // Emit WebSocket event for real-time UI updates
    io.emit('course:statusChanged', {
      courseCode,
      status,
      updatedAt: updatedCourse.updated_at
    })

    res.json({
      success: true,
      course: {
        code: updatedCourse.course_code,
        status: updatedCourse.status,
        updatedAt: updatedCourse.updated_at
      }
    })
  } catch (err) {
    logger.error(`Failed to update status for ${courseCode}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Get introductions for a course
// Used by Course Editor INTRODUCTIONS tab to display lego presentations
app.get('/api/production/:courseCode/introductions', async (req, res) => {
  const { courseCode } = req.params
  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const introductions = await supabaseClient.getIntroductionsByCourse(courseCode)
    logger.info(`Returning ${introductions.count} introductions for ${courseCode}`)

    res.json({
      success: true,
      ...introductions
    })
  } catch (err) {
    logger.error(`Failed to get introductions for ${courseCode}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Get course manifest
// Priority: 1) Database (if course structure exists), 2) S3 static file, 3) Stub
app.get('/api/production/:courseCode/manifest', async (req, res) => {
  try {
    const { courseCode } = req.params
    const source = req.query.source // 'db', 's3', or auto (default)

    // Option 1: Try database-first generation (new architecture) with caching
    if (source !== 's3' && supabaseClient.isInitialized()) {
      try {
        const manifest = await getCachedManifest(courseCode)
        if (manifest && manifest.slices?.[0]?.seeds?.length > 0) {
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

// Generate manifest from database (explicit trigger - bypasses and refreshes cache)
app.post('/api/production/:courseCode/manifest/generate', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Invalidate cache to force fresh generation
    invalidateManifestCache(courseCode)

    logger.info(`Generating fresh manifest for ${courseCode} from database...`)
    const startTime = Date.now()
    const manifest = await manifestGenerator.generateManifest(courseCode)
    const elapsed = Date.now() - startTime

    // Cache the fresh manifest
    manifestCache.set(courseCode, { manifest, timestamp: Date.now() })
    logger.info(`Manifest generated in ${elapsed}ms, cached for future requests`)

    // Validate it
    const validation = await manifestGenerator.validateManifest(manifest)

    res.json({
      success: true,
      manifest,
      validation,
      generationTimeMs: elapsed,
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

    const manifest = await getCachedManifest(courseCode)
    const validation = await manifestGenerator.validateManifest(manifest)

    res.json(validation)
  } catch (error) {
    logger.error('Error validating manifest:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// LEGACY MANIFEST EXPORT WITH COMBINED AUDIO
// =============================================================================

// Track active legacy audio jobs
const legacyAudioJobs = new Map()

// Export legacy manifest (for old learning app)
// Query params:
//   withAudio=true  - Start background job to generate combined presentation audio
app.get('/api/production/:courseCode/export-legacy', async (req, res) => {
  try {
    const { courseCode } = req.params
    const withAudio = req.query.withAudio === 'true'

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Import the legacy manifest generator
    const { generateLegacyManifest, validateManifest } = require('./phases/generate-legacy-manifest.cjs')

    logger.info(`Generating legacy manifest for ${courseCode}${withAudio ? ' (with audio)' : ''}`)

    // Generate manifest (always without audio for immediate response)
    // The manifest already has placeholder presentation UUIDs
    const manifest = await generateLegacyManifest(courseCode, { withAudio: false })

    // Validate the manifest for critical issues
    const validation = validateManifest(manifest)
    if (!validation.valid) {
      logger.warn(`Legacy manifest validation issues for ${courseCode}: ${validation.summary}`)
    }

    // Generate filename with date
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const filename = `${manifest.id}_legacy_${date}.json`

    // Count intro items for audio generation
    let introCount = 0
    for (const seed of manifest.slices[0].seeds) {
      introCount += (seed.introduction_items || []).length
    }

    // Start background audio generation if requested
    let audioJobId = null
    if (withAudio && introCount > 0) {
      audioJobId = `legacy-audio-${courseCode}-${Date.now()}`
      startLegacyAudioGeneration(courseCode, audioJobId, manifest)
    }

    res.json({
      success: true,
      manifest,
      filename,
      stats: {
        seeds: manifest.slices[0].seeds.length,
        orderedEncouragements: manifest.slices[0].orderedEncouragements.length,
        pooledEncouragements: manifest.slices[0].pooledEncouragements.length
      },
      validation: {
        valid: validation.valid,
        summary: validation.summary,
        invalidUUIDs: validation.issues.invalidUUIDs.length,
        emptyStrings: validation.issues.emptyStrings.length,
        // Include first few details for display
        invalidUUIDDetails: validation.issues.invalidUUIDs.slice(0, 5),
        emptyStringDetails: validation.issues.emptyStrings.slice(0, 5)
      },
      audioJobId
    })
  } catch (error) {
    logger.error('Error generating legacy manifest:', error)
    res.status(500).json({ error: error.message })
  }
})

// Start background audio generation for legacy manifest
async function startLegacyAudioGeneration(courseCode, jobId, manifest) {
  // Import the combined presentations generator
  const { generateCombinedPresentations } = require('./phases/generate-legacy-manifest.cjs')

  // Query database to get lego info with original lego_id
  // We need this because the manifest only has generated UUIDs, not the S0001L01 format
  const client = supabaseClient.getClient()
  if (!client) {
    logger.error(`[LegacyAudio] Supabase not initialized`)
    return
  }

  // Get all new LEGOs with their lego_id
  const { data: dbLegos } = await client
    .from('course_legos')
    .select('lego_id, seed_number, lego_index, known_text, target_text, is_new')
    .eq('course_code', courseCode)
    .eq('is_new', true)
    .order('seed_number')
    .order('lego_index')

  if (!dbLegos || dbLegos.length === 0) {
    logger.info(`[LegacyAudio] No new LEGOs found for ${courseCode}`)
    return
  }

  // Build intro items directly from database LEGOs (not manifest)
  // This ensures we have the correct lego_id format for presentation lookup
  const introItems = dbLegos.map(lego => ({
    legoId: lego.lego_id,  // Original format: S0001L01
    knownText: lego.known_text,
    targetText: lego.target_text,
    // Presentation text isn't needed for lookup since we use lego_id
    presentation: `The ... for '${lego.known_text}', is: ... '${lego.target_text}' ... '${lego.target_text}'`
  }))

  logger.info(`[LegacyAudio] Built ${introItems.length} intro items from database LEGOs`)

  // Create job record
  legacyAudioJobs.set(jobId, {
    courseCode,
    status: 'running',
    total: introItems.length,
    completed: 0,
    startedAt: Date.now(),
    cancelled: false
  })

  logger.info(`[LegacyAudio] Starting job ${jobId} for ${courseCode}: ${introItems.length} items`)

  // Emit start event
  io.emit('legacyAudio:started', { jobId, courseCode, total: introItems.length })

  try {
    // Load audio data from database
    const client = supabaseClient.getClient()
    const course = await supabaseClient.getCourse(courseCode)
    const targetLang = course.target_lang
    const knownLang = course.known_lang

    // Load audio records
    const { data: dbAudio } = await client
      .from('course_audio')
      .select('id, text, text_normalized, language, role, duration_ms, lego_id, s3_key')
      .eq('course_code', courseCode)

    // Build lookup maps
    const audioLookup = new Map()
    const presentationByLegoId = new Map()

    if (dbAudio) {
      for (const record of dbAudio) {
        if (record.role === 'presentation' && record.lego_id) {
          presentationByLegoId.set(record.lego_id, record)
        }
        const key = `${record.text_normalized}|${record.language}|${record.role}`
        audioLookup.set(key, record)
      }
    }

    logger.info(`[LegacyAudio] Audio lookup: ${audioLookup.size} by text, ${presentationByLegoId.size} presentations by lego_id`)

    // Generate combined presentations with progress callback
    const job = legacyAudioJobs.get(jobId)

    await generateCombinedPresentations(
      courseCode,
      introItems,
      audioLookup,
      presentationByLegoId,
      targetLang,
      knownLang,
      {
        dryRun: false,
        concurrency: 4,
        onProgress: (completed, total) => {
          const currentJob = legacyAudioJobs.get(jobId)
          if (currentJob) {
            currentJob.completed = completed
            io.emit('legacyAudio:progress', { jobId, completed, total })
          }
        },
        shouldCancel: () => {
          const currentJob = legacyAudioJobs.get(jobId)
          return currentJob?.cancelled === true
        }
      }
    )

    // Check if cancelled
    const finalJob = legacyAudioJobs.get(jobId)
    if (finalJob?.cancelled) {
      finalJob.status = 'cancelled'
      io.emit('legacyAudio:cancelled', { jobId })
      logger.info(`[LegacyAudio] Job ${jobId} cancelled`)
    } else {
      if (finalJob) finalJob.status = 'completed'
      io.emit('legacyAudio:completed', { jobId })
      logger.info(`[LegacyAudio] Job ${jobId} completed`)
    }
  } catch (err) {
    const job = legacyAudioJobs.get(jobId)
    if (job) job.status = 'failed'
    io.emit('legacyAudio:failed', { jobId, error: err.message })
    logger.error(`[LegacyAudio] Job ${jobId} failed:`, err)
  }

  // Clean up job after some time
  setTimeout(() => {
    legacyAudioJobs.delete(jobId)
  }, 5 * 60 * 1000) // Keep for 5 minutes
}

// Cancel legacy audio generation
app.post('/api/production/:courseCode/cancel-legacy-audio', (req, res) => {
  const { courseCode } = req.params

  // Find and cancel active job for this course
  for (const [jobId, job] of legacyAudioJobs) {
    if (job.courseCode === courseCode && job.status === 'running') {
      job.cancelled = true
      logger.info(`[LegacyAudio] Cancellation requested for job ${jobId}`)
      return res.json({ success: true, jobId })
    }
  }

  res.status(404).json({ error: 'No active audio job found for this course' })
})

// Get legacy audio job status
app.get('/api/production/:courseCode/legacy-audio-status', (req, res) => {
  const { courseCode } = req.params

  for (const [jobId, job] of legacyAudioJobs) {
    if (job.courseCode === courseCode) {
      return res.json({
        jobId,
        status: job.status,
        total: job.total,
        completed: job.completed,
        startedAt: job.startedAt
      })
    }
  }

  res.json({ status: 'none' })
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
    const updated = await supabaseClient.updateSampleFlag(uuid, {
      courseCode,
      status,
      notes: combinedNotes,
      flaggedBy
    })

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

// =============================================================================
// AUDIO FLAGS (NEW simple workflow)
// =============================================================================

// Get all audio flags for a course
app.get('/api/production/:courseCode/audio-flags', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const flags = await supabaseClient.getAudioFlags(courseCode)
    const stats = await supabaseClient.getAudioFlagStats(courseCode)

    res.json({ flags, stats })
  } catch (error) {
    logger.error('Error getting audio flags:', error)
    res.status(500).json({ error: error.message })
  }
})

// Create or update an audio flag
app.post('/api/production/:courseCode/audio-flags', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { audio_uuid, status, reason, flagged_by } = req.body

    if (!audio_uuid) {
      return res.status(400).json({ error: 'audio_uuid required' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const flag = await supabaseClient.upsertAudioFlag(audio_uuid, courseCode, {
      status: status || 'flagged',
      reason,
      flagged_by: flagged_by || 'qa'
    })

    logger.info(`Audio flagged: ${audio_uuid} in ${courseCode} - ${reason || 'no reason'}`)

    // Broadcast via WebSocket
    io.to(`course:${courseCode}`).emit('audio_flagged', {
      courseCode,
      audio_uuid,
      flag
    })

    res.json({ success: true, flag })
  } catch (error) {
    logger.error('Error creating audio flag:', error)
    res.status(500).json({ error: error.message })
  }
})

// Resolve an audio flag
app.post('/api/production/:courseCode/audio-flags/:audioUuid/resolve', async (req, res) => {
  try {
    const { courseCode, audioUuid } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const flag = await supabaseClient.resolveAudioFlag(audioUuid, courseCode)

    logger.info(`Audio flag resolved: ${audioUuid} in ${courseCode}`)

    io.to(`course:${courseCode}`).emit('audio_flag_resolved', {
      courseCode,
      audio_uuid: audioUuid,
      flag
    })

    res.json({ success: true, flag })
  } catch (error) {
    logger.error('Error resolving audio flag:', error)
    res.status(500).json({ error: error.message })
  }
})

// Delete an audio flag
app.delete('/api/production/:courseCode/audio-flags/:audioUuid', async (req, res) => {
  try {
    const { courseCode, audioUuid } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    await supabaseClient.deleteAudioFlag(audioUuid, courseCode)

    logger.info(`Audio flag deleted: ${audioUuid} in ${courseCode}`)

    io.to(`course:${courseCode}`).emit('audio_flag_deleted', {
      courseCode,
      audio_uuid: audioUuid
    })

    res.json({ success: true })
  } catch (error) {
    logger.error('Error deleting audio flag:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// LEGACY FLAGS (old sample_flags table - keep for backwards compat)
// =============================================================================

// Delete a sample flag (item is done, no longer needs regen)
app.post('/api/production/:courseCode/flags/delete', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { uuid } = req.body

    if (!uuid) {
      return res.status(400).json({ error: 'uuid required' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Delete flag from Supabase
    await supabaseClient.deleteSampleFlag(uuid)

    // Broadcast deletion via WebSocket
    io.to(`course:${courseCode}`).emit('sample_updated', {
      courseCode,
      uuid,
      update: { deleted: true }
    })

    res.json({ success: true })
  } catch (error) {
    logger.error('Error deleting flag:', error)
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
      const updated = await supabaseClient.updateSampleFlag(uuid, {
        courseCode,
        status,
        notes: combinedNotes,
        flaggedBy
      })
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

// ============================================================================
// USER FEEDBACK ENDPOINTS
// Crowdsourced QA - users flag issues, aggregated by threshold
// ============================================================================

// Submit user feedback on audio/content
app.post('/api/production/:courseCode/feedback', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { audioId, feedbackType, userId, comment, sessionContext } = req.body

    // Validate required fields
    if (!feedbackType) {
      return res.status(400).json({ error: 'feedbackType required' })
    }

    const validTypes = ['translation', 'audio_quality', 'pronunciation', 'too_fast', 'confusing', 'other']
    if (!validTypes.includes(feedbackType)) {
      return res.status(400).json({
        error: `Invalid feedbackType. Must be one of: ${validTypes.join(', ')}`
      })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // Insert feedback
    const { data, error } = await supabase
      .from('content_feedback')
      .insert({
        audio_id: audioId || null,
        course_code: courseCode,
        feedback_type: feedbackType,
        user_id: userId || 'anonymous',
        comment: comment || null,
        session_context: sessionContext || null
      })
      .select()
      .single()

    if (error) throw error

    logger.info(`Feedback submitted: ${feedbackType} for ${courseCode}${audioId ? ` (audio: ${audioId})` : ''}`)

    // Broadcast feedback event
    io.to(`course:${courseCode}`).emit('feedback_submitted', {
      courseCode,
      feedbackType,
      audioId
    })

    res.json({ success: true, feedback: data })
  } catch (error) {
    logger.error('Error submitting feedback:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get aggregated feedback above threshold
app.get('/api/production/:courseCode/feedback/aggregated', async (req, res) => {
  try {
    const { courseCode } = req.params
    const threshold = parseInt(req.query.threshold) || 3  // Default: 3 flags to surface
    const feedbackType = req.query.type || null           // Optional filter by type
    const limit = parseInt(req.query.limit) || 50

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // Query aggregated feedback
    // Note: Using raw SQL via RPC would be more efficient, but this works for now
    let query = supabase
      .from('content_feedback')
      .select('audio_id, feedback_type, comment, created_at, session_context')
      .eq('course_code', courseCode)
      .is('resolved_at', null)
      .order('created_at', { ascending: false })

    if (feedbackType) {
      query = query.eq('feedback_type', feedbackType)
    }

    const { data: allFeedback, error } = await query

    if (error) throw error

    // Aggregate in JS (could be optimized with a DB view/function)
    const aggregated = {}
    for (const fb of allFeedback || []) {
      const key = `${fb.audio_id || 'general'}:${fb.feedback_type}`
      if (!aggregated[key]) {
        aggregated[key] = {
          audio_id: fb.audio_id,
          feedback_type: fb.feedback_type,
          flag_count: 0,
          comments: [],
          first_flagged: fb.created_at,
          last_flagged: fb.created_at,
          session_contexts: []
        }
      }
      aggregated[key].flag_count++
      aggregated[key].last_flagged = fb.created_at
      if (fb.comment) {
        aggregated[key].comments.push(fb.comment)
      }
      if (fb.session_context) {
        aggregated[key].session_contexts.push(fb.session_context)
      }
    }

    // Filter by threshold and sort by flag count
    const issues = Object.values(aggregated)
      .filter(item => item.flag_count >= threshold)
      .sort((a, b) => b.flag_count - a.flag_count)
      .slice(0, limit)

    // Get text info for audio IDs (v13: course_audio has text directly)
    const audioIds = issues.map(i => i.audio_id).filter(Boolean)
    let audioInfo = {}

    if (audioIds.length > 0) {
      const { data: audioData } = await supabase
        .from('course_audio')
        .select('id, text, language, voice_id')
        .in('id', audioIds)

      if (audioData) {
        for (const audio of audioData) {
          audioInfo[audio.id] = {
            text: audio.text,
            language: audio.language,
            voice_id: audio.voice_id
          }
        }
      }
    }

    // Enrich issues with text info
    const enrichedIssues = issues.map(issue => ({
      ...issue,
      text: audioInfo[issue.audio_id]?.text || null,
      language: audioInfo[issue.audio_id]?.language || null,
      voice_id: audioInfo[issue.audio_id]?.voice_id || null
    }))

    res.json({
      success: true,
      threshold,
      total_issues: enrichedIssues.length,
      issues: enrichedIssues
    })
  } catch (error) {
    logger.error('Error getting aggregated feedback:', error)
    res.status(500).json({ error: error.message })
  }
})

// Resolve feedback (mark as addressed)
app.post('/api/production/:courseCode/feedback/resolve', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { audioId, feedbackType, resolvedBy, resolutionNote } = req.body

    if (!resolvedBy) {
      return res.status(400).json({ error: 'resolvedBy required' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // Build update query
    let query = supabase
      .from('content_feedback')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
        resolution_note: resolutionNote || null
      })
      .eq('course_code', courseCode)
      .is('resolved_at', null)

    if (audioId) {
      query = query.eq('audio_id', audioId)
    }
    if (feedbackType) {
      query = query.eq('feedback_type', feedbackType)
    }

    const { data, error, count } = await query.select()

    if (error) throw error

    logger.info(`Resolved ${data?.length || 0} feedback items for ${courseCode}`)

    // Broadcast resolution
    io.to(`course:${courseCode}`).emit('feedback_resolved', {
      courseCode,
      audioId,
      feedbackType,
      resolvedCount: data?.length || 0
    })

    res.json({
      success: true,
      resolved: data?.length || 0
    })
  } catch (error) {
    logger.error('Error resolving feedback:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get feedback stats for course
app.get('/api/production/:courseCode/feedback/stats', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // Get counts by type
    const { data: allFeedback, error } = await supabase
      .from('content_feedback')
      .select('feedback_type, resolved_at')
      .eq('course_code', courseCode)

    if (error) throw error

    const stats = {
      total: allFeedback?.length || 0,
      unresolved: 0,
      resolved: 0,
      by_type: {}
    }

    for (const fb of allFeedback || []) {
      if (fb.resolved_at) {
        stats.resolved++
      } else {
        stats.unresolved++
      }
      stats.by_type[fb.feedback_type] = (stats.by_type[fb.feedback_type] || 0) + 1
    }

    res.json({ success: true, stats })
  } catch (error) {
    logger.error('Error getting feedback stats:', error)
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
// Looks up s3_key from database for v13 audio, falls back to legacy path
app.get('/api/production/:courseCode/audio/:uuid/url', async (req, res) => {
  try {
    const { courseCode, uuid } = req.params

    // Try to get audio record from database for s3_key
    let s3Key = null
    if (supabaseClient.isInitialized()) {
      const supabase = supabaseClient.getClient()
      const { data: audioData } = await supabase
        .from('course_audio')
        .select('s3_key')
        .eq('id', uuid)
        .single()

      if (audioData?.s3_key) {
        s3Key = audioData.s3_key
      }
    }

    // Generate signed URL (uses s3_key if available, otherwise legacy path)
    const url = await s3Service.getAudioSignedUrl(uuid, 3600, { s3Key })
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

// Get audio URL by text lookup
// Used by CyclePlayer and ScriptViewer to find audio for phrases
// v13 Schema: course_audio (flat table with text, course_code, role, s3_key)
app.get('/api/production/:courseCode/audio/by-text', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { text, role = 'target1' } = req.query

    if (!text) {
      return res.status(400).json({ error: 'text parameter required' })
    }

    const supabase = supabaseClient.getClient()
    if (!supabase) {
      return res.status(500).json({ error: 'Database not initialized' })
    }

    // v13: Query course_audio directly (flat table, no joins needed)
    const normalizedText = text.toString().toLowerCase().trim()

    const { data: audioData, error: audioError } = await supabase
      .from('course_audio')
      .select('id, s3_key, voice_id, role')
      .eq('course_code', courseCode)
      .eq('text_normalized', normalizedText)
      .eq('role', role)
      .single()

    if (audioError || !audioData) {
      // Try without role filter and find best match
      const { data: anyAudio } = await supabase
        .from('course_audio')
        .select('id, s3_key, voice_id, role')
        .eq('course_code', courseCode)
        .eq('text_normalized', normalizedText)
        .limit(1)
        .single()

      if (!anyAudio) {
        return res.status(404).json({ error: `Audio not found for text in course ${courseCode}` })
      }

      // Use the fallback audio
      const url = await s3Service.getAudioSignedUrl(anyAudio.id, 3600, { s3Key: anyAudio.s3_key })
      return res.json({ url, uuid: anyAudio.id, role: anyAudio.role })
    }

    // Get signed URL using s3_key from database
    const url = await s3Service.getAudioSignedUrl(audioData.id, 3600, { s3Key: audioData.s3_key })
    res.json({ url, uuid: audioData.id })
  } catch (error) {
    logger.error('Error fetching audio by text:', error)
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
      provenance = {},
      mimeType = 'audio/webm'
    } = req.body

    if (!uuid || !audioData) {
      return res.status(400).json({ error: 'uuid and audioData required' })
    }

    // Decode base64 audio data
    const rawBuffer = Buffer.from(audioData, 'base64')
    logger.log(`[Upload] Received ${rawBuffer.length} bytes for ${uuid}`)

    // Determine input format from MIME type
    let inputFormat = 'webm'
    if (mimeType.includes('mp3')) inputFormat = 'mp3'
    else if (mimeType.includes('wav')) inputFormat = 'wav'
    else if (mimeType.includes('m4a') || mimeType.includes('mp4')) inputFormat = 'm4a'
    else if (mimeType.includes('ogg')) inputFormat = 'ogg'

    // Process audio: convert to MP3, normalize, trim silence
    logger.log(`[Upload] Processing audio (format: ${inputFormat})...`)
    const { buffer: processedBuffer, metadata: audioMeta } = await audioProcessor.processRecordingBuffer(
      rawBuffer,
      {
        inputFormat,
        trimSilence: true,
        normalize: true,
        targetLUFS: -16
      }
    )

    if (audioMeta.processed) {
      logger.log(`[Upload] Audio processed: ${audioMeta.inputSize} -> ${audioMeta.outputSize} bytes, duration: ${audioMeta.durationMs}ms`)
    } else {
      logger.warn(`[Upload] Audio processing skipped: ${audioMeta.reason}`)
    }

    // Upload processed audio to S3
    const result = await s3Service.uploadRecording(courseCode, uuid, processedBuffer, {
      ...metadata,
      recordedBy: 'human',
      source: 'recording',
      audioProcessing: audioMeta
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

    res.json({
      success: true,
      uuid,
      uploaded: true,
      audioProcessing: audioMeta.processed ? {
        durationMs: audioMeta.durationMs,
        format: audioMeta.format,
        sizeReduction: audioMeta.inputSize - audioMeta.outputSize
      } : null
    })
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

    // Get flagged samples from audio_flags table (new simplified system)
    const flaggedSamples = await supabaseClient.getAudioFlagsWithDetails(courseCode)

    // Transform to match expected format
    const items = flaggedSamples.map(flag => ({
      uuid: flag.audio_uuid,
      status: flag.status,
      notes: flag.reason,
      flaggedBy: flag.flagged_by,
      flaggedAt: flag.created_at,
      regenCount: flag.regen_count || 0,
      audio: flag.audio
    }))

    // Group by role for UI display
    const byRole = { known: 0, target1: 0, target2: 0 }
    for (const item of items) {
      if (item.audio?.role && byRole[item.audio.role] !== undefined) {
        byRole[item.audio.role]++
      }
    }

    res.json({
      items,
      total: items.length,
      byRole
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
      const sample = await supabaseClient.getCourseAudio(uuid)
      if (sample) {
        samples.push(sample)
      }
    }

    // Call Phase 8 to generate audio for these specific UUIDs
    // Note: Phase 8's /generate endpoint generates MISSING audio, not regenerates
    // For UUID-based regeneration, we need to use the direct TTS approach
    // For now, proxy to generate endpoint with courseCode in path
    const response = await proxyToPhase8('POST', `/generate/${courseCode}`, {
      dryRun: false,
      limit: uuids.length
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
      // Mark flags as complete after successful regeneration
      await supabaseClient.bulkUpdateFlagStatus(
        uuids,
        courseCode,
        'complete',
        'Regeneration completed'
      )
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

    // Get all flagged samples (using new audio_flags system)
    const flaggedSamples = await supabaseClient.getAudioFlagsWithDetails(courseCode)

    if (flaggedSamples.length === 0) {
      return res.json({
        success: true,
        count: 0,
        message: 'No samples flagged for regeneration'
      })
    }

    // Group by role for regeneration
    const byRole = {}
    for (const flag of flaggedSamples) {
      const role = flag.audio?.role || 'unknown'
      if (!byRole[role]) byRole[role] = []
      byRole[role].push(flag.audio_uuid)
    }

    const uuids = flaggedSamples.map(flag => flag.audio_uuid)

    // Emit WebSocket event
    io.to(`course:${courseCode}`).emit('regeneration_started', {
      courseCode,
      uuids,
      count: uuids.length,
      byRole: Object.fromEntries(Object.entries(byRole).map(([k, v]) => [k, v.length])),
      timestamp: new Date().toISOString()
    })

    // Call Phase 8 to regenerate each role with flaggedOnly=true
    // Process roles in parallel for efficiency
    const roleResults = await Promise.all(
      Object.keys(byRole)
        .filter(role => ['known', 'target1', 'target2', 'presentation'].includes(role))
        .map(async (role) => {
          try {
            const response = await proxyToPhase8('POST', `/regenerate-role/${courseCode}`, {
              role,
              dryRun: false,
              flaggedOnly: true,
              limit: byRole[role].length
            })
            return { role, success: response.status === 200, data: response.data }
          } catch (err) {
            return { role, success: false, error: err.message }
          }
        })
    )

    // Check results
    const allSuccess = roleResults.every(r => r.success)
    const totalProcessed = roleResults.reduce((sum, r) => sum + (r.data?.success || 0), 0)
    const totalFailed = roleResults.reduce((sum, r) => sum + (r.data?.failed || 0), 0)

    // Aggregate regeneratedItems from all roles for inline preview
    const allRegeneratedItems = roleResults.flatMap(r => r.data?.regeneratedItems || [])

    // NOTE: Don't auto-resolve flags here - let user review and mark done manually
    // Flags stay at 'flagged' until user clicks "Done" after reviewing audio

    if (allSuccess) {
      res.json({
        success: true,
        count: uuids.length,
        processed: totalProcessed,
        failed: totalFailed,
        regeneratedItems: allRegeneratedItems,
        byRole: roleResults.map(r => ({ role: r.role, ...r.data }))
      })
    } else {
      // Some roles failed
      res.json({
        success: false,
        partial: true,
        count: uuids.length,
        processed: totalProcessed,
        failed: totalFailed,
        regeneratedItems: allRegeneratedItems,
        byRole: roleResults.map(r => ({ role: r.role, success: r.success, ...r.data, error: r.error }))
      })
    }
  } catch (error) {
    logger.error('Error triggering bulk regeneration:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// ROLE-BASED REGENERATION ENDPOINTS
// =============================================================================

// Regenerate audio by role (known, target1, target2)
// POST /api/audio/regenerate-role/:courseCode
// Body: { role, dryRun, flaggedOnly, limit }
app.post('/api/audio/regenerate-role/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { role, dryRun = true, flaggedOnly = false, limit = 1000 } = req.body

    if (!role || !['known', 'target1', 'target2'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be known, target1, or target2' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    logger.log(`[Regenerate Role] ${dryRun ? 'Preview' : 'Execute'} ${role} for ${courseCode}, flaggedOnly=${flaggedOnly}`)

    // Get course voice config
    const course = await supabaseClient.getCourse(courseCode)
    if (!course) {
      return res.status(404).json({ error: `Course not found: ${courseCode}` })
    }

    const voiceConfig = course.voice_config || {}
    const voiceId = voiceConfig[role] || voiceConfig.default || 'unknown'
    const language = role === 'known' ? course.known_lang : course.target_lang

    // Query audio samples by role
    let audioQuery = supabaseClient.getClient()
      .from('course_audio')
      .select('id, text, text_normalized, language, role, voice_id, duration_ms')
      .eq('course_code', courseCode)
      .eq('role', role)
      .limit(limit)

    const { data: audioSamples, error: audioError } = await audioQuery

    if (audioError) {
      logger.error('Error fetching audio samples:', audioError)
      return res.status(500).json({ error: audioError.message })
    }

    let samplesToRegenerate = audioSamples || []

    // If flaggedOnly, filter to only flagged samples (using NEW audio_flags table)
    if (flaggedOnly && samplesToRegenerate.length > 0) {
      const uuids = samplesToRegenerate.map(s => s.id)
      const { data: flags } = await supabaseClient.getClient()
        .from('audio_flags')
        .select('audio_uuid')
        .eq('course_code', courseCode)
        .in('audio_uuid', uuids)
        .eq('status', 'flagged')

      const flaggedUuids = new Set((flags || []).map(f => f.audio_uuid))
      samplesToRegenerate = samplesToRegenerate.filter(s => flaggedUuids.has(s.id))
    }

    // For dry run, just return preview
    if (dryRun) {
      return res.json({
        dryRun: true,
        count: samplesToRegenerate.length,
        voiceId,
        language,
        sample: samplesToRegenerate[0] || null
      })
    }

    // Execute regeneration
    if (samplesToRegenerate.length === 0) {
      return res.json({
        dryRun: false,
        total: 0,
        success: 0,
        failed: 0,
        voiceId,
        language,
        regeneratedItems: [],
        message: 'No samples to regenerate'
      })
    }

    const uuids = samplesToRegenerate.map(s => s.id)

    // Call Phase 8 to regenerate audio by role
    const response = await proxyToPhase8('POST', `/regenerate-role/${courseCode}`, {
      role,
      dryRun: false,
      flaggedOnly,
      limit
    })

    // Emit WebSocket event
    io.to(`course:${courseCode}`).emit('regeneration_started', {
      courseCode,
      uuids,
      role,
      count: uuids.length,
      timestamp: new Date().toISOString()
    })

    if (response.status === 200) {
      res.json({
        dryRun: false,
        total: uuids.length,
        success: response.data.success || uuids.length,
        failed: response.data.failed || 0,
        voiceId,
        language,
        regeneratedItems: samplesToRegenerate.map(s => ({
          id: s.id,
          text: s.text,
          role: s.role
        })),
        jobId: response.data.jobId
      })
    } else {
      res.status(response.status).json({
        error: response.data.error || 'Regeneration failed',
        ...response.data
      })
    }
  } catch (error) {
    logger.error('Error in regenerate-role:', error)
    res.status(500).json({ error: error.message })
  }
})

// Regenerate presentation audio
// POST /api/audio/regenerate-presentations/:courseCode
// Body: { dryRun, limit }
app.post('/api/audio/regenerate-presentations/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { dryRun = true, limit = 1000 } = req.body

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    logger.log(`[Regenerate Presentations] ${dryRun ? 'Preview' : 'Execute'} for ${courseCode}`)

    // Get course info
    const course = await supabaseClient.getCourse(courseCode)
    if (!course) {
      return res.status(404).json({ error: `Course not found: ${courseCode}` })
    }

    // Query presentation audio
    const { data: presentations, error } = await supabaseClient.getClient()
      .from('course_audio')
      .select('id, text, text_normalized, language, role, voice_id, duration_ms')
      .eq('course_code', courseCode)
      .eq('role', 'presentation')
      .limit(limit)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    const samplesToRegenerate = presentations || []

    if (dryRun) {
      return res.json({
        dryRun: true,
        count: samplesToRegenerate.length,
        sample: samplesToRegenerate[0] || null
      })
    }

    if (samplesToRegenerate.length === 0) {
      return res.json({
        dryRun: false,
        total: 0,
        success: 0,
        failed: 0,
        regeneratedItems: [],
        message: 'No presentation audio to regenerate'
      })
    }

    const uuids = samplesToRegenerate.map(s => s.id)

    // Call Phase 8 to regenerate presentation audio
    const response = await proxyToPhase8('POST', `/regenerate-role/${courseCode}`, {
      role: 'presentation',
      dryRun: false,
      limit
    })

    io.to(`course:${courseCode}`).emit('regeneration_started', {
      courseCode,
      uuids,
      role: 'presentation',
      count: uuids.length,
      timestamp: new Date().toISOString()
    })

    if (response.status === 200) {
      res.json({
        dryRun: false,
        total: uuids.length,
        success: response.data.success || uuids.length,
        failed: response.data.failed || 0,
        regeneratedItems: samplesToRegenerate.map(s => ({
          id: s.id,
          text: s.text.substring(0, 50) + '...'
        })),
        jobId: response.data.jobId
      })
    } else {
      res.status(response.status).json({
        error: response.data.error || 'Regeneration failed',
        ...response.data
      })
    }
  } catch (error) {
    logger.error('Error in regenerate-presentations:', error)
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

// GET /api/production/:courseCode/audio-stats (alias for audio-pipeline/stats)
app.get('/api/production/:courseCode/audio-stats', (req, res) => {
  res.redirect(307, `/api/production/${req.params.courseCode}/audio-pipeline/stats`)
})

// GET /api/production/:courseCode/audio-pipeline/stats
// Fast stats using plan endpoint - use this for dashboard loading
app.get('/api/production/:courseCode/audio-pipeline/stats', async (req, res) => {
  const { courseCode } = req.params
  try {
    // Use the plan endpoint which exists
    const response = await axios.get(`${PHASE8_URL}/plan/${courseCode}`)
    const data = response.data || {}

    // Calculate estimates
    const toGenerate = data.missing || 0
    const estimatedCostUSD = (toGenerate * 0.004).toFixed(2)

    res.json({
      success: true,
      estimatedCost: `$${estimatedCostUSD}`,
      estimatedTime: `${Math.ceil(toGenerate / 60)} min`,
      total: data.existing + toGenerate,
      existing: data.existing || 0,
      missing: toGenerate,
      dataSource: 'database'
    })
  } catch (error) {
    logger.error(`Audio stats error for ${courseCode}:`, error.message)
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Phase 8 audio service not running' })
    }
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message })
  }
})

// GET /api/production/:courseCode/audio-pipeline/plan
// Get generation plan with cost estimates
app.get('/api/production/:courseCode/audio-pipeline/plan', async (req, res) => {
  const { courseCode } = req.params
  try {
    const response = await axios.post(`${PHASE8_URL}/plan`, { courseCode })
    // Transform Phase 8 response for frontend
    // Phase 8 v13 returns data at root level (not nested under .plan)
    const plan = response.data.plan || response.data || {}
    const voices = response.data.voices || plan.course?.voiceConfig || {}

    // Calculate breakdown by role from Phase 8 response
    const samples = plan.samples || []
    const breakdownFromPlan = plan.breakdown || {}
    const breakdown = {
      known: breakdownFromPlan.known || samples.filter(s => s.role === 'known').length,
      target1: breakdownFromPlan.target1 || samples.filter(s => s.role === 'target1').length,
      target2: breakdownFromPlan.target2 || samples.filter(s => s.role === 'target2').length,
      // Phase 8 v13 returns presentation count in breakdown.presentation
      introduction: breakdownFromPlan.presentation || plan.introNeeds || 0
    }

    // Estimate cost: ~$0.004 per TTS request (Azure average)
    const toGenerate = plan.missing || plan.toGenerate || 0
    const estimatedCostUSD = (toGenerate * 0.004).toFixed(2)

    // Total should be existing + missing, or totalPhrases * 3 (for known, target1, target2)
    const total = (plan.existing || 0) + toGenerate

    res.json({
      success: true,
      estimatedCost: plan.estimatedCost || `$${estimatedCostUSD}`,
      estimatedTime: `${Math.ceil(toGenerate / 60)} min`,
      total: total,
      existing: plan.existing || 0,
      missing: toGenerate,
      phraseNeeds: plan.totalPhrases || plan.phraseNeeds || 0,
      introNeeds: plan.introNeeds || 0,
      breakdown: [
        { role: 'known', count: breakdown.known },
        { role: 'target1', count: breakdown.target1 },
        { role: 'target2', count: breakdown.target2 },
        { role: 'introduction', count: breakdown.introduction }
      ],
      assembly: response.data.assembly || null,
      voices: voices,
      dataSource: plan.course ? 'database' : 'unknown'
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
    const response = await axios.post(`${PHASE8_URL}/generate/${courseCode}`, options || {})
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
    const response = await axios.post(`${PHASE8_URL}/generate/${courseCode}`, {
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

// GET /api/production/:courseCode/audio-pipeline/missing
// Get detailed list of missing audio with sample playback URLs for voice matching
app.get('/api/production/:courseCode/audio-pipeline/missing', async (req, res) => {
  const { courseCode } = req.params
  logger.info(`Getting missing audio details for ${courseCode}`)

  try {
    const supabase = supabaseClient.getClient()

    // Paginate practice phrases (avoid 1000 row limit)
    let phrases = []
    let offset = 0
    const pageSize = 1000

    while (true) {
      const { data: page, error } = await supabase
        .from('course_practice_phrases')
        .select('seed_number, lego_index, known_text, target_text')
        .eq('course_code', courseCode)
        .range(offset, offset + pageSize - 1)

      if (error) throw error
      if (!page || page.length === 0) break
      phrases = phrases.concat(page)
      if (page.length < pageSize) break
      offset += pageSize
    }

    // Also fetch LEGOs for presentation tracking (only new LEGOs need intros)
    let legos = []
    offset = 0

    while (true) {
      const { data: page, error } = await supabase
        .from('course_legos')
        .select('lego_id, seed_number, lego_index, known_text, target_text, is_new')
        .eq('course_code', courseCode)
        .eq('is_new', true)
        .range(offset, offset + pageSize - 1)

      if (error) throw error
      if (!page || page.length === 0) break
      legos = legos.concat(page)
      if (page.length < pageSize) break
      offset += pageSize
    }

    // Paginate existing audio (v13: course_audio is flat, no joins needed)
    let existingAudio = []
    offset = 0

    while (true) {
      const { data: page, error } = await supabase
        .from('course_audio')
        .select('id, text, text_normalized, role, voice_id, s3_key, lego_id')
        .eq('course_code', courseCode)
        .range(offset, offset + pageSize - 1)

      if (error) throw error
      if (!page || page.length === 0) break
      existingAudio = existingAudio.concat(page)
      if (page.length < pageSize) break
      offset += pageSize
    }

    // Build lookup of existing texts by role
    const existingByRole = {
      known: new Map(),  // text -> { audioId, voiceId, s3Key }
      target1: new Map(),
      target2: new Map(),
      presentation: new Map()  // For presentation, we match on embedded target text
    }

    // Also collect sample audio for each role (for voice matching)
    const samplesByRole = {
      known: null,
      target1: null,
      target2: null,
      presentation: null
    }

    for (const ca of existingAudio) {
      // Use text_normalized for matching (case-insensitive)
      const normalizedText = ca.text_normalized || ca.text?.toLowerCase().trim()
      const role = ca.role

      // For presentation audio, match by lego_id (always populated since Jan 2026)
      // IMPORTANT: Only count as existing if s3_key is mastered/ (not pending/)
      if (role === 'presentation') {
        // Skip pending presentations - they have placeholder s3_key but no actual audio
        if (ca.s3_key?.startsWith('pending/')) {
          continue
        }
        // Use lego_id for matching (preferred, more reliable than regex extraction)
        if (ca.lego_id) {
          existingByRole.presentation.set(ca.lego_id, {
            audioId: ca.id,
            voiceId: ca.voice_id,
            s3Key: ca.s3_key,
            fullText: ca.text
          })
        }
        // Keep first audio as sample for voice matching
        if (!samplesByRole.presentation) {
          samplesByRole.presentation = {
            text: ca.text,
            audioId: ca.id,
            voiceId: ca.voice_id,
            s3Key: ca.s3_key
          }
        }
      } else if (normalizedText && existingByRole[role]) {
        // Standard roles: known, target1, target2
        existingByRole[role].set(normalizedText, {
          audioId: ca.id,
          voiceId: ca.voice_id,
          s3Key: ca.s3_key
        })
        // Keep first audio as sample for voice matching
        if (!samplesByRole[role]) {
          samplesByRole[role] = {
            text: ca.text,
            audioId: ca.id,
            voiceId: ca.voice_id,
            s3Key: ca.s3_key
          }
        }
      }
    }

    // Find missing by role
    const missingByRole = {
      known: [],
      target1: [],
      target2: [],
      presentation: []
    }
    const seen = {
      known: new Set(),
      target1: new Set(),
      target2: new Set(),
      presentation: new Set()
    }

    for (const p of phrases) {
      const seedId = `S${String(p.seed_number).padStart(4, '0')}`
      const legoId = `${seedId}L${String(p.lego_index).padStart(2, '0')}`

      // Normalize texts for comparison
      const knownNorm = p.known_text?.toLowerCase().trim()
      const targetNorm = p.target_text?.toLowerCase().trim()

      // Check known (use normalized for matching)
      if (knownNorm && !existingByRole.known.has(knownNorm) && !seen.known.has(knownNorm)) {
        seen.known.add(knownNorm)
        missingByRole.known.push({ text: p.known_text, seedId, legoId })
      }
      // Check target1
      if (targetNorm && !existingByRole.target1.has(targetNorm) && !seen.target1.has(targetNorm)) {
        seen.target1.add(targetNorm)
        missingByRole.target1.push({ text: p.target_text, seedId, legoId })
      }
      // Check target2
      if (targetNorm && !existingByRole.target2.has(targetNorm) && !seen.target2.has(targetNorm)) {
        seen.target2.add(targetNorm)
        missingByRole.target2.push({ text: p.target_text, seedId, legoId })
      }
    }

    // Check LEGOs for missing presentation audio (only new LEGOs need intros)
    // Match by lego_id (always populated since Jan 2026)
    for (const lego of legos) {
      if (lego.lego_id && !existingByRole.presentation.has(lego.lego_id) && !seen.presentation.has(lego.lego_id)) {
        seen.presentation.add(lego.lego_id)
        missingByRole.presentation.push({
          text: lego.known_text,  // Show the known text (what's in the presentation)
          targetText: lego.target_text,
          seedId: `S${String(lego.seed_number).padStart(4, '0')}`,
          legoId: lego.lego_id
        })
      }
    }

    // Generate signed URLs for sample audio (v13: flat S3 storage)
    for (const role of ['known', 'target1', 'target2', 'presentation']) {
      if (samplesByRole[role]) {
        try {
          const url = await s3Service.getAudioSignedUrl(samplesByRole[role].audioId, 3600, {
            s3Key: samplesByRole[role].s3Key
          })
          samplesByRole[role].url = url
        } catch (e) {
          logger.warn(`Could not get signed URL for ${role} sample: ${e.message}`)
        }
      }
    }

    const totalMissing = missingByRole.known.length + missingByRole.target1.length + missingByRole.target2.length + missingByRole.presentation.length

    res.json({
      success: true,
      courseCode,
      totalMissing,
      totalPhrases: phrases.length,
      totalLegos: legos.length,
      existingCounts: {
        known: existingByRole.known.size,
        target1: existingByRole.target1.size,
        target2: existingByRole.target2.size,
        presentation: existingByRole.presentation.size
      },
      missing: missingByRole,
      samples: samplesByRole  // Sample audio for each role for voice matching
    })

  } catch (error) {
    logger.error(`Missing audio error for ${courseCode}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/:courseCode/audio-pipeline/sync-s3
// Sync existing S3 audio files to Supabase (import existing audio)
app.post('/api/production/:courseCode/audio-pipeline/sync-s3', async (req, res) => {
  const { courseCode } = req.params
  logger.info(`Starting S3 to Supabase sync for ${courseCode}`)

  try {
    // Step 1: Get ALL audio needs directly from database (not limited like Phase 8 plan)
    const supabase = supabaseClient.getClient()

    // Get course voices (voice_config JSONB column, courses.course_code is PK)
    const { data: courseData } = await supabase
      .from('courses')
      .select('voice_config')
      .eq('course_code', courseCode)
      .single()

    const voiceConfig = courseData?.voice_config || {}
    const voices = {
      known: voiceConfig.known,
      target1: voiceConfig.target1,
      target2: voiceConfig.target2
    }

    // Get all practice phrases for this course
    const { data: phrases, error: phrasesError } = await supabase
      .from('course_practice_phrases')
      .select('seed_number, lego_index, position, known_text, target_text')
      .eq('course_code', courseCode)

    if (phrasesError) throw phrasesError

    logger.info(`Found ${phrases?.length || 0} practice phrases in database for ${courseCode}`)

    // Parse course code for languages
    const parts = courseCode.split('_for_')
    const targetLang = parts[0] || 'zho'
    const knownLang = parts[1] || 'eng'

    // Build samples list with UUIDs
    const samples = []
    const seen = new Set()

    for (const phrase of phrases || []) {
      // Target1 audio
      if (phrase.target_text && voices.target1) {
        const uuid = supabaseClient.generateAudioUUID(voices.target1, phrase.target_text, targetLang, 'target1', 'slow')
        if (!seen.has(uuid)) {
          seen.add(uuid)
          samples.push({ uuid, text: phrase.target_text, lang: targetLang, role: 'target1' })
        }
      }
      // Target2 audio
      if (phrase.target_text && voices.target2) {
        const uuid = supabaseClient.generateAudioUUID(voices.target2, phrase.target_text, targetLang, 'target2', 'slow')
        if (!seen.has(uuid)) {
          seen.add(uuid)
          samples.push({ uuid, text: phrase.target_text, lang: targetLang, role: 'target2' })
        }
      }
      // Known audio
      if (phrase.known_text && voices.known) {
        const uuid = supabaseClient.generateAudioUUID(voices.known, phrase.known_text, knownLang, 'known', 'natural')
        if (!seen.has(uuid)) {
          seen.add(uuid)
          samples.push({ uuid, text: phrase.known_text, lang: knownLang, role: 'known' })
        }
      }
    }

    logger.info(`Extracted ${samples.length} unique audio needs from database`)

    if (samples.length === 0) {
      return res.json({ success: true, message: 'No audio samples needed', synced: 0 })
    }

    // Step 2: Batch check which UUIDs exist in S3
    const uuids = samples.map(s => s.uuid)
    const existsResults = await s3Service.batchCheckAudio(uuids, process.env.S3_BUCKET || 'ssi-audio-stage')

    const existingInS3 = samples.filter(s => existsResults[s.uuid])
    logger.info(`Found ${existingInS3.length}/${samples.length} samples in S3`)

    if (existingInS3.length === 0) {
      return res.json({ success: true, message: 'No matching audio in S3', synced: 0 })
    }

    // Step 3: Register in Supabase (v13: use course_audio table)
    let synced = 0
    let skipped = 0
    let errors = 0

    for (const sample of existingInS3) {
      try {
        // Check if already registered (v13: course_audio with text_normalized)
        const normalizedText = sample.text.toLowerCase().trim()
        const { data: existing } = await supabase
          .from('course_audio')
          .select('id')
          .eq('course_code', courseCode)
          .eq('text_normalized', normalizedText)
          .eq('role', sample.role)
          .single()

        if (existing) {
          skipped++
          continue
        }

        // Register the audio (v13: course_audio is flat)
        const { error } = await supabase
          .from('course_audio')
          .insert({
            course_code: courseCode,
            text: sample.text,
            text_normalized: normalizedText,
            language: sample.lang,
            role: sample.role,
            voice_id: voices[sample.role] || null,
            origin: 'tts',
            s3_key: `${sample.uuid}.mp3`
          })

        if (error && error.code !== '23505') {
          logger.warn(`Error registering ${sample.uuid}: ${error.message}`)
          errors++
        } else {
          synced++
        }
      } catch (err) {
        logger.warn(`Error processing ${sample.uuid}: ${err.message}`)
        errors++
      }
    }

    logger.info(`S3 sync complete: ${synced} synced, ${skipped} skipped, ${errors} errors`)
    res.json({
      success: true,
      totalInPlan: samples.length,
      foundInS3: existingInS3.length,
      synced,
      skipped,
      errors
    })
  } catch (error) {
    logger.error(`S3 sync error for ${courseCode}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// Database-First Course Data Endpoints
// =============================================================================

// Get seeds from database
app.get('/api/production/:courseCode/seeds', async (req, res) => {
  const { courseCode } = req.params
  const status = req.query.status || 'all'  // Default to all statuses (draft, released, etc.)
  try {
    const seeds = await courseDataService.getSeedsByCourse(courseCode, { status })

    // Transform database format to match frontend expectations:
    // - course_legos → legos
    // - course_practice_phrases → basket_phrases
    const transformedSeeds = seeds.map(seed => ({
      ...seed,
      legos: (seed.course_legos || []).map(lego => ({
        ...lego,
        basket_phrases: lego.course_practice_phrases || []
      }))
    }))

    // Remove the original nested properties to avoid confusion
    transformedSeeds.forEach(seed => {
      delete seed.course_legos
      seed.legos.forEach(lego => {
        delete lego.course_practice_phrases
      })
    })

    res.json({
      courseCode,
      count: transformedSeeds.length,
      seeds: transformedSeeds
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
    // Get seed with all legos and their practice phrases (nested via includeLegos)
    const seedData = await courseDataService.getSeed(courseCode, seedId.toUpperCase(), {
      includeLegos: true  // This includes course_legos (with components JSONB) and course_practice_phrases
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
          components: (lego.components || []).map(c => ({
            known: c.known,
            target: c.target
          })),
          practice_phrases: lego.course_practice_phrases.sort((a, b) => a.position - b.position).map(bp => ({
            known: bp.known_text,
            target: bp.target_text,
            position: bp.position,
            word_count: bp.word_count,
            lego_count: bp.lego_count
            // NOTE: phrase_type computed at runtime from position/word_count/lego_count per registry v1.1.0
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

// =============================================================================
// SCRIPT VIEW ENDPOINT
// Returns hierarchical structure: seeds -> legos -> phrases for script editing
// =============================================================================

/**
 * Batch lookup audio UUIDs for a set of texts
 * Returns a map: normalized_text -> { known, target1, target2 }
 *
 * Uses audio_registry table (v12 schema) with voice/cadence matching
 * This matches the practice_cycles view join logic
 */
async function batchLookupAudioUuids(supabase, courseCode, knownTexts, targetTexts) {
  const audioMap = new Map()  // normalized_text -> { known?, target1?, target2? }

  // Get course config for voice/cadence matching
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('known_lang, target_lang, known_voice, target1_voice, target2_voice, known_cadence, target_cadence')
    .eq('course_code', courseCode)
    .single()

  if (courseError || !course) {
    logger.warn(`Could not find course ${courseCode} for audio lookup`)
    return audioMap
  }

  // Normalize and deduplicate texts
  const normalizedKnown = [...new Set(knownTexts.filter(t => t).map(t => t.toLowerCase().trim()))]
  const normalizedTarget = [...new Set(targetTexts.filter(t => t).map(t => t.toLowerCase().trim()))]

  if (normalizedKnown.length === 0 && normalizedTarget.length === 0) return audioMap

  // Query known audio (source language)
  if (normalizedKnown.length > 0 && course.known_voice) {
    const { data: knownAudio } = await supabase
      .from('audio_registry')
      .select('audio_id, content_normalized, duration_ms')
      .in('content_normalized', normalizedKnown)
      .eq('language', course.known_lang)
      .eq('voice_id', course.known_voice)
      .eq('cadence', course.known_cadence || 'natural')

    for (const audio of (knownAudio || [])) {
      if (!audioMap.has(audio.content_normalized)) {
        audioMap.set(audio.content_normalized, {})
      }
      const entry = audioMap.get(audio.content_normalized)
      entry.known = audio.audio_id
      entry.known_duration_ms = audio.duration_ms
    }
  }

  // Query target1 audio
  if (normalizedTarget.length > 0 && course.target1_voice) {
    const { data: target1Audio } = await supabase
      .from('audio_registry')
      .select('audio_id, content_normalized, duration_ms')
      .in('content_normalized', normalizedTarget)
      .eq('language', course.target_lang)
      .eq('voice_id', course.target1_voice)
      .eq('cadence', course.target_cadence || 'slow')

    for (const audio of (target1Audio || [])) {
      if (!audioMap.has(audio.content_normalized)) {
        audioMap.set(audio.content_normalized, {})
      }
      const entry = audioMap.get(audio.content_normalized)
      entry.target1 = audio.audio_id
      entry.target1_duration_ms = audio.duration_ms
    }
  }

  // Query target2 audio
  if (normalizedTarget.length > 0 && course.target2_voice) {
    const { data: target2Audio } = await supabase
      .from('audio_registry')
      .select('audio_id, content_normalized, duration_ms')
      .in('content_normalized', normalizedTarget)
      .eq('language', course.target_lang)
      .eq('voice_id', course.target2_voice)
      .eq('cadence', course.target_cadence || 'slow')

    for (const audio of (target2Audio || [])) {
      if (!audioMap.has(audio.content_normalized)) {
        audioMap.set(audio.content_normalized, {})
      }
      const entry = audioMap.get(audio.content_normalized)
      entry.target2 = audio.audio_id
      entry.target2_duration_ms = audio.duration_ms
    }
  }

  return audioMap
}

// Get script view data - all phrases grouped by seed and LEGO
// Uses practice_cycles view which already has audio UUIDs joined (same as learning app)
// Supports pagination via query params: seedStart, seedEnd (e.g., S0001, S0030)
app.get('/api/production/:courseCode/script-view', async (req, res) => {
  const { courseCode } = req.params
  const { seedStart, seedEnd } = req.query

  // Parse seed range from query params (S0001 -> 1, S0030 -> 30)
  const parseSeedNumber = (s) => {
    if (!s) return null
    const match = String(s).match(/(\d+)/)
    return match ? parseInt(match[1], 10) : null
  }
  const startNum = parseSeedNumber(seedStart)
  const endNum = parseSeedNumber(seedEnd)

  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // Query practice_cycles view - already has audio UUIDs joined via audio_registry
    // This is the same view the learning app uses
    let cyclesQuery = supabase
      .from('practice_cycles')
      .select('*')
      .eq('course_code', courseCode)

    // Apply seed range filter if provided
    if (startNum !== null) {
      cyclesQuery = cyclesQuery.gte('seed_number', startNum)
    }
    if (endNum !== null) {
      cyclesQuery = cyclesQuery.lte('seed_number', endNum)
    }

    cyclesQuery = cyclesQuery.order('seed_number', { ascending: true })
      .order('lego_index', { ascending: true })
      .order('position', { ascending: true })

    // Also query course_seeds and course_legos for their text values
    let seedsQuery = supabase
      .from('course_seeds')
      .select('seed_number, known_text, target_text, status')
      .eq('course_code', courseCode)

    if (startNum !== null) {
      seedsQuery = seedsQuery.gte('seed_number', startNum)
    }
    if (endNum !== null) {
      seedsQuery = seedsQuery.lte('seed_number', endNum)
    }

    let legosQuery = supabase
      .from('course_legos')
      .select('seed_number, lego_index, known_text, target_text, type, is_new')
      .eq('course_code', courseCode)

    if (startNum !== null) {
      legosQuery = legosQuery.gte('seed_number', startNum)
    }
    if (endNum !== null) {
      legosQuery = legosQuery.lte('seed_number', endNum)
    }

    // Query audio_flags for this course (NEW simplified system)
    const flagsQuery = supabase
      .from('audio_flags')
      .select('audio_uuid, status, reason, flagged_by, created_at, regen_count')
      .eq('course_code', courseCode)

    // Query lego_cycles to get LEGO debut audio (the LEGO itself as a playable/flaggable item)
    let legoCyclesQuery = supabase
      .from('lego_cycles')
      .select('id, lego_id, seed_number, lego_index, known_text, target_text, known_audio_uuid, target1_audio_uuid, target2_audio_uuid, known_duration_ms, target1_duration_ms, target2_duration_ms')
      .eq('course_code', courseCode)

    if (startNum !== null) {
      legoCyclesQuery = legoCyclesQuery.gte('seed_number', startNum)
    }
    if (endNum !== null) {
      legoCyclesQuery = legoCyclesQuery.lte('seed_number', endNum)
    }

    // Run all queries in parallel
    const [cyclesResult, seedsResult, legosResult, flagsResult, legoCyclesResult] = await Promise.all([
      cyclesQuery,
      seedsQuery,
      legosQuery,
      flagsQuery,
      legoCyclesQuery
    ])

    if (cyclesResult.error) {
      logger.error(`Script view cycles query error for ${courseCode}:`, cyclesResult.error)
      throw cyclesResult.error
    }

    const cycles = cyclesResult.data
    const seedsData = seedsResult.data || []
    const legosData = legosResult.data || []
    const flagsData = flagsResult.data || []
    const legoCyclesData = legoCyclesResult.data || []

    // Build LEGO debut lookup: "seed_number:lego_index" -> lego cycle with audio
    const legoDebutMap = new Map()
    for (const lc of legoCyclesData) {
      const key = `${lc.seed_number}:${lc.lego_index}`
      legoDebutMap.set(key, lc)
    }

    // Build flags lookup map: audio_uuid -> { status, notes, flagged_by, flagged_at, regen_count }
    const flagsMap = new Map()
    for (const flag of flagsData) {
      flagsMap.set(flag.audio_uuid, {
        status: flag.status,
        notes: flag.reason, // Map to old field name for compatibility
        flagged_by: flag.flagged_by,
        flagged_at: flag.created_at, // Map to old field name for compatibility
        regen_count: flag.regen_count || 0
      })
    }

    // Build lookup maps for seeds and legos
    const seedTextMap = new Map()  // seed_number -> { known_text, target_text, status }
    for (const seed of seedsData) {
      seedTextMap.set(seed.seed_number, {
        known_text: seed.known_text,
        target_text: seed.target_text,
        status: seed.status
      })
    }

    const legoTextMap = new Map()  // "seed_number:lego_index" -> { known_text, target_text, type, is_new }
    for (const lego of legosData) {
      const key = `${lego.seed_number}:${lego.lego_index}`
      legoTextMap.set(key, {
        known_text: lego.known_text,
        target_text: lego.target_text,
        type: lego.type,
        is_new: lego.is_new
      })
    }

    logger.info(`Loaded ${cycles?.length || 0} practice cycles, ${seedsData.length} seeds, ${legosData.length} legos for ${courseCode}`)

    // Group flat cycles into hierarchical structure: seeds -> legos -> phrases
    // practice_cycles view already has audio UUIDs joined via audio_registry
    const seedsMap = new Map()  // seed_number -> { legos: Map<lego_id, { phrases: [] }> }

    for (const cycle of (cycles || [])) {
      const seedNum = cycle.seed_number
      const legoId = cycle.lego_id  // Already formatted as S0001L01 in the view

      // Get or create seed entry
      if (!seedsMap.has(seedNum)) {
        seedsMap.set(seedNum, {
          seed_number: seedNum,
          seed_id: 'S' + String(seedNum).padStart(4, '0'),
          known_text: null,  // Will get from first phrase
          target_text: null,
          legos: new Map()
        })
      }
      const seedEntry = seedsMap.get(seedNum)

      // Get or create lego entry
      if (!seedEntry.legos.has(legoId)) {
        seedEntry.legos.set(legoId, {
          lego_id: legoId,
          lego_index: cycle.lego_index,
          type: null,  // Not in practice_cycles view
          known_text: null,
          target_text: null,
          is_new: null,
          phrases: []
        })
      }
      const legoEntry = seedEntry.legos.get(legoId)

      // S3 path is mastered/{UUID-UPPERCASE}.mp3 (same as learning app)
      const buildS3Key = (uuid) => uuid ? `mastered/${uuid.toUpperCase()}.mp3` : null

      // Check flags for any audio in this phrase
      const knownFlag = cycle.known_audio_uuid ? flagsMap.get(cycle.known_audio_uuid) : null
      const target1Flag = cycle.target1_audio_uuid ? flagsMap.get(cycle.target1_audio_uuid) : null
      const target2Flag = cycle.target2_audio_uuid ? flagsMap.get(cycle.target2_audio_uuid) : null
      // Only count as flagged if status is 'flagged' (new audio_flags table)
      const isFlagged = (flag) => flag?.status === 'flagged'
      const anyFlagged = isFlagged(knownFlag) || isFlagged(target1Flag) || isFlagged(target2Flag)

      // Add phrase
      legoEntry.phrases.push({
        id: cycle.id,
        position: cycle.position,
        known_text: cycle.known_text,
        target_text: cycle.target_text,
        type: cycle.phrase_type || 'practice',  // From view
        word_count: cycle.word_count,
        lego_count: cycle.lego_count,
        // Audio UUIDs directly from practice_cycles view (already joined via audio_registry)
        known_audio_uuid: cycle.known_audio_uuid || null,
        target1_audio_uuid: cycle.target1_audio_uuid || null,
        target2_audio_uuid: cycle.target2_audio_uuid || null,
        // S3 keys for direct URL construction
        known_s3_key: buildS3Key(cycle.known_audio_uuid),
        target1_s3_key: buildS3Key(cycle.target1_audio_uuid),
        target2_s3_key: buildS3Key(cycle.target2_audio_uuid),
        // Durations from view
        known_duration_ms: cycle.known_duration_ms || null,
        target1_duration_ms: cycle.target1_duration_ms || null,
        target2_duration_ms: cycle.target2_duration_ms || null,
        // Flag status from database
        is_flagged: anyFlagged,
        known_flag: knownFlag || null,
        target1_flag: target1Flag || null,
        target2_flag: target2Flag || null
      })
    }

    // Convert maps to arrays and sort, enriching with seed/lego text from lookup maps
    const transformedSeeds = Array.from(seedsMap.values())
      .sort((a, b) => a.seed_number - b.seed_number)
      .map(seed => {
        // Get seed text from lookup map
        const seedData = seedTextMap.get(seed.seed_number) || {}

        return {
          seed_id: seed.seed_id,
          seed_number: seed.seed_number,
          known_text: seedData.known_text || null,
          target_text: seedData.target_text || null,
          status: seedData.status || null,
          legos: Array.from(seed.legos.values())
            .sort((a, b) => a.lego_index - b.lego_index)
            .map(lego => {
              // Get lego text from lookup map
              const legoKey = `${seed.seed_number}:${lego.lego_index}`
              const legoData = legoTextMap.get(legoKey) || {}

              // Get LEGO debut (the LEGO itself as a phrase at position 0)
              const legoDebut = legoDebutMap.get(legoKey)
              const allPhrases = [...lego.phrases]

              // Insert LEGO debut as position 0 if it has audio
              if (legoDebut && (legoDebut.known_audio_uuid || legoDebut.target1_audio_uuid || legoDebut.target2_audio_uuid)) {
                const buildS3Key = (uuid) => uuid ? `mastered/${uuid.toUpperCase()}.mp3` : null
                const knownFlag = legoDebut.known_audio_uuid ? flagsMap.get(legoDebut.known_audio_uuid) : null
                const target1Flag = legoDebut.target1_audio_uuid ? flagsMap.get(legoDebut.target1_audio_uuid) : null
                const target2Flag = legoDebut.target2_audio_uuid ? flagsMap.get(legoDebut.target2_audio_uuid) : null
                const isFlagged = (flag) => flag?.status === 'flagged'

                allPhrases.unshift({
                  id: legoDebut.id,
                  position: 0,
                  known_text: legoDebut.known_text,
                  target_text: legoDebut.target_text,
                  type: 'lego_debut',
                  word_count: 1,
                  lego_count: 1,
                  known_audio_uuid: legoDebut.known_audio_uuid || null,
                  target1_audio_uuid: legoDebut.target1_audio_uuid || null,
                  target2_audio_uuid: legoDebut.target2_audio_uuid || null,
                  known_s3_key: buildS3Key(legoDebut.known_audio_uuid),
                  target1_s3_key: buildS3Key(legoDebut.target1_audio_uuid),
                  target2_s3_key: buildS3Key(legoDebut.target2_audio_uuid),
                  known_duration_ms: legoDebut.known_duration_ms || null,
                  target1_duration_ms: legoDebut.target1_duration_ms || null,
                  target2_duration_ms: legoDebut.target2_duration_ms || null,
                  is_flagged: isFlagged(knownFlag) || isFlagged(target1Flag) || isFlagged(target2Flag),
                  known_flag: knownFlag || null,
                  target1_flag: target1Flag || null,
                  target2_flag: target2Flag || null
                })
              }

              return {
                lego_id: lego.lego_id,
                lego_index: lego.lego_index,
                type: legoData.type || null,
                known_text: legoData.known_text || null,
                target_text: legoData.target_text || null,
                is_new: legoData.is_new ?? null,
                phrases: allPhrases.sort((a, b) => a.position - b.position)
              }
            })
        }
      })

    // Get total seed count for pagination info (without range filter)
    const { count: totalSeedCount } = await supabase
      .from('course_seeds')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)

    const rangeInfo = startNum || endNum
      ? ` (range: ${startNum || 1}-${endNum || totalSeedCount})`
      : ' (all)'
    logger.info(`Returning script view for ${courseCode}: ${transformedSeeds.length} seeds${rangeInfo}`)

    res.json({
      courseCode,
      seeds: transformedSeeds,
      pagination: {
        returned: transformedSeeds.length,
        total: totalSeedCount || transformedSeeds.length,
        seedStart: startNum,
        seedEnd: endNum
      }
    })
  } catch (err) {
    logger.error(`Failed to get script view for ${courseCode}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// =============================================================================
// LEARNING JOURNEY VIEW
// =============================================================================
// Generate learning script showing how the course looks to a learner
// Shows rounds with spaced repetition (Fibonacci-based reviews)
// Ported from ssi-learning-app's generateLearningScript()
app.get('/api/production/:courseCode/learning-journey', async (req, res) => {
  const { courseCode } = req.params
  const { maxLegos, offset } = req.query

  // Parse query params
  const maxLegosNum = maxLegos ? parseInt(maxLegos, 10) : 50
  const offsetNum = offset ? parseInt(offset, 10) : 0

  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    const { rounds, allItems, stats } = await learningScriptGenerator.generateLearningScript(
      supabase,
      courseCode,
      maxLegosNum,
      offsetNum
    )

    logger.info(`Returning learning journey for ${courseCode}: ${rounds.length} rounds, ${allItems.length} items`)

    res.json({
      courseCode,
      rounds,
      allItems,
      stats,
      pagination: {
        maxLegos: maxLegosNum,
        offset: offsetNum,
        returned: rounds.length,
      }
    })
  } catch (err) {
    logger.error(`Failed to generate learning journey for ${courseCode}:`, err)
    res.status(500).json({ error: err.message })
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

// =============================================================================
// PHRASE EDITING ENDPOINT
// =============================================================================

// Update a practice phrase (text editing with regeneration flagging)
// PATCH /api/production/:courseCode/phrase/:phraseId
// Body: { known_text?, target_text?, flag_for_regeneration? }
app.patch('/api/production/:courseCode/phrase/:phraseId', async (req, res) => {
  const { courseCode, phraseId } = req.params
  const { known_text, target_text, flag_for_regeneration } = req.body

  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // First, get the existing phrase to merge metadata
    const { data: existingPhrase, error: fetchError } = await supabase
      .from('course_practice_phrases')
      .select('*')
      .eq('id', phraseId)
      .eq('course_code', courseCode)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: `Phrase ${phraseId} not found in course ${courseCode}` })
      }
      throw fetchError
    }

    // Build the update object
    const updateData = {}

    if (known_text !== undefined) {
      updateData.known_text = known_text
    }

    if (target_text !== undefined) {
      updateData.target_text = target_text
    }

    // Handle regeneration flagging in metadata
    if (flag_for_regeneration !== undefined) {
      const existingMetadata = existingPhrase.metadata || {}
      updateData.metadata = {
        ...existingMetadata,
        needs_regeneration: flag_for_regeneration,
        regeneration_flagged_at: flag_for_regeneration ? new Date().toISOString() : null
      }
    }

    // If no updates provided, return error
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid update fields provided' })
    }

    // Perform the update
    const { data: updatedPhrase, error: updateError } = await supabase
      .from('course_practice_phrases')
      .update(updateData)
      .eq('id', phraseId)
      .eq('course_code', courseCode)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    logger.info(`Updated phrase ${phraseId} in ${courseCode}: ${JSON.stringify(updateData)}`)

    // Emit WebSocket event for real-time updates
    io.to(`course:${courseCode}`).emit('phrase_updated', {
      courseCode,
      phraseId,
      phrase: updatedPhrase
    })

    res.json({
      success: true,
      phrase: updatedPhrase
    })
  } catch (error) {
    logger.error(`Error updating phrase ${phraseId}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// RECORDING OPTIMIZER ENDPOINTS
// =============================================================================

// Import the recording optimizer algorithm
const { generateRecordingScript } = require('../tools/recording-optimizer/generate-recording-script.cjs')

// GET /api/production/:courseCode/recording-optimizer
// Runs the GuaranteedCoverage algorithm to find minimum recording set
app.get('/api/production/:courseCode/recording-optimizer', async (req, res) => {
  try {
    const { courseCode } = req.params

    logger.log(`[Recording Optimizer] Generating script for ${courseCode}`)

    // Run the algorithm (suppress console output by redirecting)
    const originalLog = console.log
    const logs = []
    console.log = (...args) => logs.push(args.join(' '))

    const result = await generateRecordingScript(courseCode, { verbose: false })

    console.log = originalLog

    if (!result) {
      return res.status(404).json({ error: 'No LEGOs found for course. Run Course Builder first.' })
    }

    // Format response for dashboard
    res.json({
      courseCode,
      generatedAt: result.generatedAt,
      statistics: {
        totalLegos: result.statistics.totalLegos,
        phrasesToRecord: result.recordingScript.phrases.length,
        directRecord: result.directRecord.items.length,
        totalRecordings: result.statistics.totalRecordings,
        coveragePercent: result.statistics.coveragePercent,
        reductionPercent: result.statistics.reductionPercent,
        estimatedMinutes: result.statistics.estimatedMinutes,
        totalPhrases: result.statistics.totalLegos * 10 // Approx phrases generatable
      },
      recordingScript: result.recordingScript.phrases.slice(0, 50), // First 50 for preview
      directRecord: result.directRecord.items.slice(0, 20), // First 20 for preview
      fullScript: result // Full data if needed
    })
  } catch (error) {
    logger.error('Error running recording optimizer:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/production/:courseCode/frankenstein-demo
// Returns audio URLs for the frankenstein demo (Seeds 1, 6, 11, and synthesized results)
app.get('/api/production/:courseCode/frankenstein-demo', async (req, res) => {
  try {
    const { courseCode } = req.params

    // Demo splice S3 keys (pre-generated spliced audio stored in S3)
    // V2: Generated with deterministic silence detection, 44.1kHz/128k CBR
    const demoSplices = {
      // demo1: "dw i ddim isio siarad Cymraeg rŵan" - built from seeds 1, 6, 11
      60: { s3Key: 'demo-splices/demo1.mp3', duration: 8934 },
      // demo2: "fedra i ddim siarad Cymraeg" - built from seed 6
      61: { s3Key: 'demo-splices/demo2.mp3', duration: 7105 },
      // demo3: "dw i isio ymarfer siarad Cymraeg" - built from seeds 1, 11
      62: { s3Key: 'demo-splices/demo3.mp3', duration: 7105 }
    }

    // The demo phrases for Welsh North
    // Source phrases (seeds 1, 6, 11) - fetched from database
    // Synthesized phrases (seeds 60, 61, 62) - use pre-spliced demo files
    const demoPhrases = [
      { seed: 1, text: 'dw i isio siarad Cymraeg', role: 'target1', isSynthesized: false },
      { seed: 6, text: 'fedra i ddim cofio sut i siarad Cymraeg', role: 'target1', isSynthesized: false },
      { seed: 11, text: 'ond well i mi ymarfer siarad Cymraeg rŵan', role: 'target1', isSynthesized: false },
      { seed: 60, text: 'dw i ddim isio siarad Cymraeg rŵan', english: "I don't want to speak Welsh now", role: 'target1', isSynthesized: true },
      { seed: 61, text: 'fedra i ddim siarad Cymraeg', english: "I can't speak Welsh", role: 'target1', isSynthesized: true },
      { seed: 62, text: 'dw i isio ymarfer siarad Cymraeg', english: "I want to practice speaking Welsh", role: 'target1', isSynthesized: true }
    ]

    const results = []

    for (const phrase of demoPhrases) {
      // For synthesized phrases, use the pre-spliced demo files with signed URLs
      if (phrase.isSynthesized && demoSplices[phrase.seed]) {
        const splice = demoSplices[phrase.seed]
        const url = await s3Service.getAudioSignedUrl(`demo-splice-${phrase.seed}`, 3600, { s3Key: splice.s3Key })
        results.push({
          seed: phrase.seed,
          text: phrase.text,
          english: phrase.english,
          audioId: `demo-splice-${phrase.seed}`,
          url,
          duration: splice.duration,
          isSynthesized: true
        })
        continue
      }

      // For source phrases, find audio in the database
      const audio = await supabaseClient.findCourseAudio(courseCode, phrase.text, 'cym', phrase.role)

      if (audio) {
        // Get signed URL
        const url = await s3Service.getAudioSignedUrl(audio.id, 3600, { s3Key: audio.s3_key })
        results.push({
          seed: phrase.seed,
          text: phrase.text,
          audioId: audio.id,
          url,
          duration: audio.duration_ms,
          isSynthesized: false
        })
      } else {
        results.push({
          seed: phrase.seed,
          text: phrase.text,
          audioId: null,
          url: null,
          duration: null,
          isSynthesized: false
        })
      }
    }

    res.json({
      courseCode,
      phrases: results
    })
  } catch (error) {
    logger.error('Error fetching frankenstein demo audio:', error)
    res.status(500).json({ error: error.message })
  }
})

const PORT = process.env.PRODUCTION_API_PORT || 3470

httpServer.listen(PORT, () => {
  logger.log(`Production API server running on port ${PORT}`)
  logger.log(`WebSocket path: /api/production/websocket`)
})

module.exports = { app, io, emitToRoom }
