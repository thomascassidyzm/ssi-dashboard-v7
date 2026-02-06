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
const voiceConfigService = require('./voice-config-service.cjs')
const voiceDiscoveryService = require('./voice-discovery-service.cjs')
const publishManifestService = require('./publish-manifest-service.cjs')
const languageCodeService = require('./language-code-service.cjs')

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

// List all courses (simplified endpoint for frontend)
// Replaces orchestrator's /api/courses endpoint
app.get('/api/courses', async (req, res) => {
  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const courses = await supabaseClient.getCourses()
    const stats = await supabaseClient.getAllCourseContentStats()

    // Helper to compute days since beta started
    function computeBetaDays(betaStartedAt) {
      if (!betaStartedAt) return null
      const start = new Date(betaStartedAt)
      const now = new Date()
      const diffMs = now - start
      return Math.floor(diffMs / (1000 * 60 * 60 * 24))
    }

    // Merge course info with stats and platform status
    const result = courses.map(c => ({
      code: c.course_code,
      course_code: c.course_code,
      known_lang: c.known_lang,
      target_lang: c.target_lang,
      display_name: c.display_name,
      status: c.status,
      // Platform deployment status
      new_app_status: c.new_app_status || 'not_available',
      legacy_app_status: c.legacy_app_status || 'not_available',
      new_app_beta_started_at: c.new_app_beta_started_at,
      legacy_app_beta_started_at: c.legacy_app_beta_started_at,
      new_app_beta_days: computeBetaDays(c.new_app_beta_started_at),
      legacy_app_beta_days: computeBetaDays(c.legacy_app_beta_started_at),
      content_status: c.content_status || 'empty',
      export_ready: c.export_ready || false,
      stats: stats[c.course_code] || { seeds: 0, completedSeeds: 0, legos: 0, phrases: 0 }
    }))

    logger.info(`Returning ${result.length} courses from database`)
    res.json({ courses: result })
  } catch (err) {
    logger.error('Failed to get courses:', err)
    res.status(500).json({ error: err.message })
  }
})

// Update platform deployment status for a course
app.patch('/api/courses/:courseCode/platform-status', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { platform, status } = req.body

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Validate platform
    if (!['new_app', 'legacy_app'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform. Must be "new_app" or "legacy_app"' })
    }

    // Validate status (UI uses 'testing'/'live', DB uses 'draft'/'released')
    const validStatuses = ['not_available', 'draft', 'testing', 'beta', 'released', 'live', 'deprecated']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` })
    }
    // Normalize UI terms to DB terms: testing→draft, live→released
    let normalizedStatus = status
    if (status === 'testing') normalizedStatus = 'draft'
    if (status === 'live') normalizedStatus = 'released'

    const supabase = supabaseClient.getClient()

    // Get current course to check previous status
    const { data: current, error: fetchError } = await supabase
      .from('courses')
      .select(`${platform}_status, ${platform}_beta_started_at`)
      .eq('course_code', courseCode)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Course not found' })
      }
      throw fetchError
    }

    // Prepare update object
    const statusColumn = `${platform}_status`
    const betaColumn = `${platform}_beta_started_at`
    const updateData = { [statusColumn]: normalizedStatus }

    // Auto-set beta_started_at when entering beta
    const previousStatus = current[statusColumn]
    if (normalizedStatus === 'beta' && previousStatus !== 'beta') {
      updateData[betaColumn] = new Date().toISOString()
    }
    // Clear beta_started_at when leaving beta
    if (normalizedStatus !== 'beta' && previousStatus === 'beta') {
      updateData[betaColumn] = null
    }

    // Update the course
    const { data, error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('course_code', courseCode)
      .select()
      .single()

    if (error) throw error

    logger.info(`Updated ${platform} status for ${courseCode}: ${previousStatus} -> ${status}`)

    res.json({
      success: true,
      course_code: courseCode,
      platform,
      status,
      beta_started_at: data[betaColumn]
    })
  } catch (err) {
    logger.error(`Failed to update platform status for ${req.params.courseCode}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Stats endpoint - mirrors course-builder-api's /api/stats/:courseCode
// So TextGeneration.vue and ProductionOverview.vue can use the same endpoint via ngrok
app.get('/api/stats/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // Count LEGOs
    const { count: legos } = await supabase
      .from('course_legos')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)

    // Count only NEW legos (unique introductions)
    const { count: newLegos } = await supabase
      .from('course_legos')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .eq('is_new', true)

    // Count phrases
    const { count: phrases } = await supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)

    // Count total seeds
    const { count: totalSeeds } = await supabase
      .from('course_seeds')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)

    // Count completed seeds (those with non-empty target_text)
    const { count: completedSeeds } = await supabase
      .from('course_seeds')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .neq('target_text', '')

    // Count DISTINCT seed numbers from LEGOs (seeds with decomposition done)
    const { data: seedData } = await supabase
      .from('course_legos')
      .select('seed_number')
      .eq('course_code', courseCode)
    const seedsWithLegos = new Set(seedData?.map(r => r.seed_number)).size

    // Ratio based on NEW legos only
    const effectiveLegos = newLegos || 0
    const ratio = effectiveLegos > 0 ? (phrases / effectiveLegos) : 0

    // Calculate average phrase quality score (USE phrases have scores 5-9)
    const { data: scoreData } = await supabase
      .from('course_practice_phrases')
      .select('score')
      .eq('course_code', courseCode)
      .not('score', 'is', null)

    const scoredPhrases = scoreData?.filter(p => typeof p.score === 'number') || []
    const avgScore = scoredPhrases.length > 0
      ? (scoredPhrases.reduce((sum, p) => sum + p.score, 0) / scoredPhrases.length)
      : null

    res.json({
      course_code: courseCode,
      total_seeds: totalSeeds || 668,
      completed_seeds: completedSeeds || 0,
      seeds_with_legos: seedsWithLegos || 0,
      seeds: seedsWithLegos || 0,
      legos: effectiveLegos,
      legos_total: legos || 0,
      phrases: phrases || 0,
      ratio: ratio.toFixed(1),
      avg_phrase_score: avgScore ? avgScore.toFixed(1) : null,
      scored_phrases: scoredPhrases.length
    })
  } catch (err) {
    logger.error(`Failed to get stats for ${req.params.courseCode}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Proxy /api/build/* to course-builder-api (port 3471)
// Course Builder runs on a separate service that handles osascript/iTerm launch
const COURSE_BUILDER_URL = process.env.COURSE_BUILDER_URL || 'http://localhost:3471'

// Generic proxy function for course-builder routes
async function proxyCourseBuilder(req, res) {
  try {
    const targetUrl = `${COURSE_BUILDER_URL}${req.originalUrl}`
    logger.info(`[Proxy] ${req.method} ${req.originalUrl} -> ${targetUrl}`)

    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...req.headers
      }
    }

    // Forward body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body)
    }

    const response = await fetch(targetUrl, fetchOptions)
    const data = await response.json()

    res.status(response.status).json(data)
  } catch (err) {
    logger.error(`[Proxy] Failed to proxy ${req.originalUrl}:`, err.message)
    res.status(502).json({ error: 'Course Builder service unavailable', details: err.message })
  }
}

app.all('/api/build/*', proxyCourseBuilder)
app.all('/api/activity', proxyCourseBuilder)
app.all('/api/activity/*', proxyCourseBuilder)
app.all('/api/agents', proxyCourseBuilder)
app.all('/api/agents/*', proxyCourseBuilder)

// Proxy to orchestrator (port 3456) for mission-control and health endpoints
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3456'

async function proxyOrchestrator(req, res) {
  try {
    const targetUrl = `${ORCHESTRATOR_URL}${req.originalUrl}`
    logger.info(`[Proxy] ${req.method} ${req.originalUrl} -> ${targetUrl}`)

    // Only pass safe headers - exclude hop-by-hop headers that break proxying
    const safeHeaders = {
      'Content-Type': 'application/json',
      'Accept': req.headers.accept || 'application/json'
    }
    // Pass through ngrok-skip-browser-warning if present
    if (req.headers['ngrok-skip-browser-warning']) {
      safeHeaders['ngrok-skip-browser-warning'] = req.headers['ngrok-skip-browser-warning']
    }
    // Pass through authorization if present
    if (req.headers.authorization) {
      safeHeaders['Authorization'] = req.headers.authorization
    }

    const fetchOptions = {
      method: req.method,
      headers: safeHeaders
    }

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body)
    }

    const response = await fetch(targetUrl, fetchOptions)
    const data = await response.json()
    res.status(response.status).json(data)
  } catch (err) {
    logger.error(`[Proxy] Failed to proxy ${req.originalUrl}:`, err.message)
    res.status(502).json({ error: 'Orchestrator service unavailable', details: err.message })
  }
}

// =============================================================================
// DIRECT ROUTES (replacing orchestrator - consolidation Jan 2026)
// =============================================================================

// Health check - production-api's own health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Production API',
    port: PORT || 3470,
    timestamp: new Date().toISOString(),
    supabase: supabaseClient.isInitialized() ? 'connected' : 'not initialized'
  })
})

// Languages endpoint - ISO 639 language codes
app.get('/api/languages', async (req, res) => {
  try {
    // Common languages for course creation
    const languages = [
      { code: 'eng', name: 'English' },
      { code: 'spa', name: 'Spanish' },
      { code: 'fra', name: 'French' },
      { code: 'deu', name: 'German' },
      { code: 'ita', name: 'Italian' },
      { code: 'por', name: 'Portuguese' },
      { code: 'zho', name: 'Chinese' },
      { code: 'jpn', name: 'Japanese' },
      { code: 'kor', name: 'Korean' },
      { code: 'ara', name: 'Arabic' },
      { code: 'rus', name: 'Russian' },
      { code: 'hin', name: 'Hindi' },
      { code: 'cym', name: 'Welsh' },
      { code: 'gle', name: 'Irish' },
      { code: 'nld', name: 'Dutch' },
      { code: 'swe', name: 'Swedish' },
      { code: 'pol', name: 'Polish' },
      { code: 'tur', name: 'Turkish' },
      { code: 'vie', name: 'Vietnamese' },
      { code: 'tha', name: 'Thai' }
    ]
    res.json(languages)
  } catch (error) {
    logger.error('Error serving languages:', error)
    res.status(500).json({ error: 'Failed to load languages' })
  }
})

// Courses list endpoint - query Supabase directly
app.get('/api/courses', async (req, res) => {
  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // Get courses from database
    const { data: dbCourses, error } = await supabase
      .from('courses')
      .select('course_code, known_lang, target_lang, display_name, status')
      .order('course_code')

    if (error) throw error

    // Get content stats for each course
    const contentStats = await supabaseClient.getAllCourseContentStats()

    const courses = (dbCourses || []).map(c => {
      const stats = contentStats[c.course_code] || { seeds: 0, legos: 0, baskets: 0 }
      return {
        code: c.course_code,
        course_code: c.course_code,
        known_lang: c.known_lang,
        target_lang: c.target_lang,
        display_name: c.display_name,
        status: c.status || 'draft',
        seeds: stats.seeds,
        legos: stats.legos,
        phrases: stats.phrases || stats.baskets
      }
    })

    res.json(courses)
  } catch (error) {
    logger.error('Error fetching courses:', error)
    res.status(500).json({ error: error.message })
  }
})

// Create new course - DATABASE-FIRST (APML v14)
app.post('/api/courses/create', async (req, res) => {
  const { courseCode, displayName, sourceLanguage, targetLanguage, seedStart, seedEnd } = req.body

  logger.info(`Creating course: ${courseCode}`)

  if (!courseCode || !sourceLanguage || !targetLanguage) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['courseCode', 'sourceLanguage', 'targetLanguage']
    })
  }

  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({
        error: 'Database not available',
        message: 'Supabase is not configured. Course creation requires database.'
      })
    }

    const supabase = supabaseClient.getClient()

    // Check if course already exists
    const { data: existing } = await supabase
      .from('courses')
      .select('course_code')
      .eq('course_code', courseCode)
      .single()

    if (existing) {
      return res.status(409).json({
        error: 'Course already exists',
        courseCode
      })
    }

    // Insert into Supabase courses table
    const { error: dbError } = await supabase
      .from('courses')
      .insert({
        course_code: courseCode,
        known_lang: sourceLanguage,
        target_lang: targetLanguage,
        display_name: displayName || `${targetLanguage} for ${sourceLanguage} speakers`,
        status: 'draft'
      })

    if (dbError) {
      logger.error(`Failed to insert course into database:`, dbError)
      return res.status(500).json({
        error: 'Failed to create course in database',
        message: dbError.message
      })
    }

    logger.info(`Course created in Supabase: ${courseCode}`)

    res.json({
      success: true,
      courseCode,
      displayName: displayName || `${targetLanguage} for ${sourceLanguage} speakers`,
      sourceLanguage,
      targetLanguage,
      seedRange: { start: seedStart || 1, end: seedEnd || 668 },
      message: 'Course created. Use Course Builder to add content.'
    })

  } catch (error) {
    logger.error(`Failed to create course ${courseCode}:`, error)
    res.status(500).json({
      error: 'Failed to create course',
      message: error.message
    })
  }
})

// =============================================================================
// VOICE CONFIGURATION ROUTES (consolidated from orchestrator)
// =============================================================================

// GET /api/courses/:courseCode/voice-config - Load voice configuration
app.get('/api/courses/:courseCode/voice-config', async (req, res) => {
  const { courseCode } = req.params
  try {
    const config = await voiceConfigService.loadVoiceConfig(courseCode)
    res.json({ success: true, config })
  } catch (error) {
    logger.error(`[VoiceConfig] Error loading config for ${courseCode}:`, error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// PUT /api/courses/:courseCode/voice-config - Save voice configuration
app.put('/api/courses/:courseCode/voice-config', async (req, res) => {
  const { courseCode } = req.params
  const config = req.body
  try {
    const validation = voiceConfigService.validateVoiceConfig({
      ...config,
      courseCode
    })
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors })
    }
    const savedConfig = await voiceConfigService.saveVoiceConfig(courseCode, config)
    res.json({ success: true, config: savedConfig })
  } catch (error) {
    logger.error(`[VoiceConfig] Error saving config for ${courseCode}:`, error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// PATCH /api/courses/:courseCode/voice-config/:role - Update single voice role
app.patch('/api/courses/:courseCode/voice-config/:role', async (req, res) => {
  const { courseCode, role } = req.params
  const voiceSettings = req.body
  try {
    const validRoles = ['target1', 'target2', 'known', 'presentation']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: `Invalid role: ${role}` })
    }
    const updatedConfig = await voiceConfigService.updateVoiceRole(courseCode, role, voiceSettings)
    res.json({ success: true, config: updatedConfig })
  } catch (error) {
    logger.error(`[VoiceConfig] Error updating ${role} for ${courseCode}:`, error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// =============================================================================
// VOICE DISCOVERY & PREVIEW ROUTES (for VoiceConfiguration component)
// =============================================================================

// GET /api/voices/discover/:language - Discover available Azure voices for a language
app.get('/api/voices/discover/:language', async (req, res) => {
  const { language } = req.params
  try {
    logger.info(`[VoiceDiscovery] Discovering voices for language: ${language}`)

    const voices = await voiceDiscoveryService.discoverAzureVoices(language)

    logger.info(`[VoiceDiscovery] Found ${voices.length} voices for ${language}`)
    res.json({ success: true, voices })
  } catch (error) {
    logger.error(`[VoiceDiscovery] Error discovering voices for ${language}:`, error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/voices/preview - Generate a voice preview audio sample
app.post('/api/voices/preview', async (req, res) => {
  const { voiceId, text, speed, provider } = req.body

  // Validation
  if (!voiceId) {
    return res.status(400).json({ success: false, error: 'voiceId is required' })
  }
  if (!text) {
    return res.status(400).json({ success: false, error: 'text is required' })
  }
  if (text.length > 1000) {
    return res.status(400).json({ success: false, error: 'Text too long (max 1000 characters for preview)' })
  }

  try {
    const azureKey = process.env.AZURE_SPEECH_KEY
    const azureRegion = process.env.AZURE_SPEECH_REGION || 'westeurope'

    if (!azureKey) {
      return res.status(500).json({
        success: false,
        error: 'Azure Speech not configured (AZURE_SPEECH_KEY not set)'
      })
    }

    logger.info(`[VoicePreview] Generating preview: ${voiceId}, text length: ${text.length}`)

    // Extract locale from voiceId (e.g., 'es-ES' from 'es-ES-ElviraNeural')
    const locale = voiceId.split('-').slice(0, 2).join('-')

    // Build SSML with optional speed adjustment
    const rate = speed && speed !== 1.0 ? speed : null
    let ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${locale}'>`
    ssml += `<voice name='${voiceId}'>`
    if (rate) {
      ssml += `<prosody rate='${rate}'>`
    }
    ssml += escapeXml(text)
    if (rate) {
      ssml += `</prosody>`
    }
    ssml += `</voice></speak>`

    // Call Azure TTS API
    const response = await fetch(
      `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': azureKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
          'User-Agent': 'SSi-Dashboard-Voice-Preview'
        },
        body: ssml
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`[VoicePreview] Azure TTS error: ${response.status} ${errorText}`)
      return res.status(response.status).json({
        success: false,
        error: `Azure TTS error: ${response.status}`,
        message: errorText
      })
    }

    // Convert audio to base64 data URI for frontend playback
    const audioBuffer = await response.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')
    const dataUri = `data:audio/mpeg;base64,${base64Audio}`

    logger.info(`[VoicePreview] Generated ${audioBuffer.byteLength} bytes of audio`)

    res.json({
      success: true,
      audio: dataUri,
      byteLength: audioBuffer.byteLength
    })
  } catch (error) {
    logger.error('[VoicePreview] Error generating preview:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Helper: Escape special XML characters for SSML
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// =============================================================================
// MISSION CONTROL - Active Jobs from build_jobs table
// =============================================================================

/**
 * GET /api/mission-control/jobs
 * Returns active build jobs from the build_jobs database table
 * AND active audio generation jobs from Phase 8
 */
app.get('/api/mission-control/jobs', async (req, res) => {
  const jobs = []

  try {
    if (!supabaseClient.isInitialized()) {
      return res.json({ jobs: [], services: {}, timestamp: new Date().toISOString() })
    }

    const supabase = supabaseClient.getClient()

    // Query build_jobs for active jobs
    const { data: buildJobs, error } = await supabase
      .from('build_jobs')
      .select('*')
      .in('status', ['pending', 'running', 'stalled'])
      .order('started_at', { ascending: false })

    if (error) {
      logger.warn('[Mission Control] Could not fetch build_jobs:', error.message)
    } else if (buildJobs && buildJobs.length > 0) {
      for (const row of buildJobs) {
        const totalSeeds = row.total_seeds || 1
        const seedsCompleted = row.seeds_completed || 0

        jobs.push({
          id: `${row.course_code}-build`,
          courseCode: row.course_code,
          service: 'course-builder',
          type: 'build',
          status: row.status,
          startedAt: row.started_at,
          canStop: row.status === 'running',
          progress: {
            current: seedsCompleted,
            total: totalSeeds,
            percentage: Math.round((seedsCompleted / totalSeeds) * 100)
          },
          metadata: {
            pass: row.pass,
            currentSeed: row.current_seed,
            requestedBy: row.requested_by,
            lastHeartbeat: row.last_heartbeat,
            errorMessage: row.error_message
          }
        })
      }
    }

    // Also check for active audio generation jobs from Phase 8
    try {
      const audioStatusResponse = await proxyToPhase8('GET', '/status')
      if (audioStatusResponse.status === 200 && audioStatusResponse.data?.active) {
        const audio = audioStatusResponse.data
        const current = audio.current || 0
        const total = audio.total || 1
        const percentage = total > 0 ? Math.round((current / total) * 100) : 0

        jobs.push({
          id: `${audio.courseCode || 'unknown'}-audio`,
          courseCode: audio.courseCode || 'unknown',
          service: 'phase8-audio',
          type: 'audio',
          status: 'running',
          startedAt: audio.startedAt || null,
          canStop: true,
          progress: {
            current,
            total,
            percentage,
            success: audio.success || 0,
            failed: audio.failed || 0
          },
          metadata: {
            operation: audio.operation || 'generate',
            role: audio.role || null,
            lastItem: audio.lastItem || null
          }
        })
      }
    } catch (audioErr) {
      // Phase 8 not running or no active job - that's fine
      logger.debug('[Mission Control] No active audio job (Phase 8 not running or idle)')
    }
  } catch (err) {
    logger.error('[Mission Control] Error fetching jobs:', err.message)
  }

  res.json({
    jobs,
    services: {},
    timestamp: new Date().toISOString()
  })
})

/**
 * POST /api/mission-control/jobs/:jobId/stop
 * Stop a job - proxies to course-builder for build jobs, Phase 8 for audio jobs
 */
app.post('/api/mission-control/jobs/:jobId/stop', async (req, res) => {
  const { jobId } = req.params

  // Parse job ID: {courseCode}-{type}
  const match = jobId.match(/^(.+)-(build|audio)$/)
  if (!match) {
    return res.status(400).json({ success: false, error: 'Invalid job ID format' })
  }

  const [, courseCode, jobType] = match

  if (jobType === 'build') {
    // Proxy to course-builder
    try {
      const response = await fetch(`${COURSE_BUILDER_URL}/api/build/stop/${courseCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      return res.json({ success: data.ok, ...data })
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message })
    }
  }

  if (jobType === 'audio') {
    // Proxy to Phase 8 audio generator cancel endpoint
    try {
      const response = await proxyToPhase8('POST', '/cancel')
      return res.json({ success: response.data?.success || true, ...response.data })
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message })
    }
  }

  res.status(400).json({ success: false, error: `Unknown job type: ${jobType}` })
})

/**
 * POST /api/mission-control/jobs/:jobId/resume
 * Resume a stalled job - spawns a new agent to continue the build
 */
app.post('/api/mission-control/jobs/:jobId/resume', async (req, res) => {
  const { jobId } = req.params
  const { terminal = 'iTerm2' } = req.body || {}

  // Parse job ID: {courseCode}-{type}
  const match = jobId.match(/^(.+)-(build|audio)$/)
  if (!match) {
    return res.status(400).json({ success: false, error: 'Invalid job ID format' })
  }

  const [, courseCode, jobType] = match

  if (jobType === 'build') {
    // Proxy to course-builder's start endpoint (handles existing stalled jobs)
    try {
      const response = await fetch(`${COURSE_BUILDER_URL}/api/build/start/${courseCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terminal, targetSeeds: 260 })
      })
      const data = await response.json()
      return res.json({ success: data.ok, ...data })
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message })
    }
  }

  res.status(400).json({ success: false, error: `Resume not supported for job type: ${jobType}` })
})

/**
 * POST /api/mission-control/jobs/:jobId/clear
 * Clear/dismiss a stalled job from the active jobs list
 */
app.post('/api/mission-control/jobs/:jobId/clear', async (req, res) => {
  const { jobId } = req.params

  // Parse job ID: {courseCode}-{type}
  const match = jobId.match(/^(.+)-(build|audio)$/)
  if (!match) {
    return res.status(400).json({ success: false, error: 'Invalid job ID format' })
  }

  const [, courseCode, jobType] = match

  if (jobType === 'build') {
    // Mark the stalled job as 'cleared' in the database
    const supabase = supabaseClient.getClient()
    try {
      const { data: job, error: findError } = await supabase
        .from('build_jobs')
        .select('id, status')
        .eq('course_code', courseCode)
        .eq('status', 'stalled')
        .order('started_at', { ascending: false })
        .limit(1)
        .single()

      if (findError || !job) {
        return res.status(404).json({ success: false, error: 'No stalled job found for this course' })
      }

      const { error: updateError } = await supabase
        .from('build_jobs')
        .update({
          status: 'stopped',
          stop_requested: true
        })
        .eq('id', job.id)

      if (updateError) {
        return res.status(500).json({ success: false, error: updateError.message })
      }

      logger.info(`[Mission Control] Cleared stalled job ${job.id} for ${courseCode}`)
      return res.json({ success: true, jobId: job.id, message: 'Job cleared' })
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message })
    }
  }

  res.status(400).json({ success: false, error: `Clear not supported for job type: ${jobType}` })
})

// PM2 service management routes - keep proxying to orchestrator for now
// These are admin-only and rarely used; can be migrated later
app.get('/api/services', proxyOrchestrator)
app.post('/api/services/:name/restart', proxyOrchestrator)
app.get('/api/services/:name/logs', proxyOrchestrator)

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

    // Fetch course and stats in parallel
    const [course, stats] = await Promise.all([
      supabaseClient.getCourse(courseCode),
      supabaseClient.getCourseContentStats(courseCode)
    ])

    if (!course) {
      return res.status(404).json({ error: `Course ${courseCode} not found` })
    }

    logger.info(`Returning info for ${courseCode}: status=${course.status}, completedSeeds=${stats.completedSeeds}`)

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
        seed_count: course.seed_count,  // Release target for decomposition
        // Include stats so frontend doesn't need separate Supabase queries
        stats: {
          seeds: stats.seeds,
          completedSeeds: stats.completedSeeds,
          legos: stats.legos,
          phrases: stats.phrases,
          audio: stats.audio
        }
      }
    })
  } catch (err) {
    logger.error(`Failed to get info for ${courseCode}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Update course status
// Used by Production Suite to mark courses as draft, beta, or released
// UI sends: testing, beta, live → mapped to DB: draft, beta, released
app.post('/api/production/:courseCode/status', async (req, res) => {
  const { courseCode } = req.params
  const { status: uiStatus } = req.body

  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    if (!uiStatus) {
      return res.status(400).json({ error: 'Status is required' })
    }

    // Map UI status to database status
    // UI uses: testing, beta, live (user-friendly)
    // DB uses: draft, beta, released (canonical)
    const statusMap = {
      'testing': 'draft',
      'beta': 'beta',
      'live': 'released',
      // Also accept DB values directly for backwards compatibility
      'draft': 'draft',
      'released': 'released'
    }

    const dbStatus = statusMap[uiStatus]
    if (!dbStatus) {
      return res.status(400).json({
        error: `Invalid status: ${uiStatus}. Must be one of: testing, beta, live`
      })
    }

    // Map to new_app_status for learning app
    // not_available = not deployed, draft = testing, beta = beta, released = live
    const appStatusMap = {
      'draft': 'draft',
      'beta': 'beta',
      'released': 'released'
    }
    const newAppStatus = appStatusMap[dbStatus]

    const updatedCourse = await supabaseClient.updateCourseStatus(courseCode, dbStatus, newAppStatus)
    logger.info(`Updated ${courseCode} status to ${dbStatus} (new_app_status: ${newAppStatus})`)

    // Emit WebSocket event for real-time UI updates
    io.emit('course:statusChanged', {
      courseCode,
      status: dbStatus,
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
// PHRASE MANAGEMENT
// =============================================================================

// Delete a practice phrase
app.delete('/api/production/:courseCode/phrases/:phraseId', async (req, res) => {
  try {
    const { courseCode, phraseId } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // Delete the phrase from course_practice_phrases
    const { error } = await supabase
      .from('course_practice_phrases')
      .delete()
      .eq('course_code', courseCode)
      .eq('id', phraseId)

    if (error) {
      logger.error(`Error deleting phrase ${phraseId}:`, error)
      throw error
    }

    logger.info(`Phrase deleted: ${phraseId} from ${courseCode}`)

    // Broadcast deletion via WebSocket
    io.to(`course:${courseCode}`).emit('phrase_deleted', {
      courseCode,
      phraseId
    })

    res.json({ success: true })
  } catch (error) {
    logger.error('Error deleting phrase:', error)
    res.status(500).json({ error: error.message })
  }
})

// Batch delete practice phrases
app.post('/api/production/:courseCode/phrases/batch-delete', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { phraseIds } = req.body

    if (!phraseIds || !Array.isArray(phraseIds) || phraseIds.length === 0) {
      return res.status(400).json({ error: 'phraseIds array required' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // Delete all phrases in the batch
    const { error, count } = await supabase
      .from('course_practice_phrases')
      .delete()
      .eq('course_code', courseCode)
      .in('id', phraseIds)

    if (error) {
      logger.error(`Error batch deleting phrases:`, error)
      throw error
    }

    logger.info(`Batch deleted ${phraseIds.length} phrases from ${courseCode}`)

    // Broadcast deletion via WebSocket
    io.to(`course:${courseCode}`).emit('phrases_batch_deleted', {
      courseCode,
      phraseIds,
      count: phraseIds.length
    })

    res.json({ success: true, deleted: phraseIds.length })
  } catch (error) {
    logger.error('Error batch deleting phrases:', error)
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

// FAST audio stats endpoint - counts audio matching CURRENT course content
// Returns total needed vs existing audio for Progress Dashboard

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

// GET /api/audio/status - Get audio generation status (proxies to Phase 8)
app.get('/api/audio/status', async (req, res) => {
  try {
    const response = await proxyToPhase8('GET', '/status')
    res.status(response.status).json(response.data)
  } catch (error) {
    // If Phase 8 is not running, return inactive status
    res.json({ active: false, error: 'Audio server not running' })
  }
})

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

    // Use total from Phase 8 (based on current course content, not orphaned audio)
    // Fallback to existing + missing for backwards compatibility
    const total = plan.total || ((plan.existing || 0) + toGenerate)

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
    const response = await axios.post(`${PHASE8_URL}/generate/${courseCode}`, options || {}, {
      timeout: 3600000 // 1 hour - audio generation can take a very long time for large courses
    })
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
    // Phase8 /status returns global state (no courseCode in URL)
    const response = await axios.get(`${PHASE8_URL}/status`)
    const status = response.data

    // Check if the active job is for the requested course
    if (status.active && status.courseCode !== courseCode) {
      // Job is for a different course
      return res.json({ success: true, job: null, message: 'No active job for this course' })
    }

    // Wrap in job object for frontend compatibility
    if (status.active) {
      res.json({
        success: true,
        job: {
          status: 'running',
          courseCode: status.courseCode,
          operation: status.operation,
          progress: {
            current: status.current,
            total: status.total,
            generated: status.success,
            failed: status.failed
          },
          lastItem: status.lastItem,
          startedAt: status.startedAt
        }
      })
    } else {
      res.json({ success: true, job: null, message: 'No active job' })
    }
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
    }, {
      timeout: 3600000 // 1 hour - audio generation can take a very long time for large courses
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
// AZURE COUNTS: Delegated to Phase8 /plan (single source of truth)
// ELEVENLABS COUNTS: Handled locally (shared audio, welcomes)
app.get('/api/production/:courseCode/audio-pipeline/missing', async (req, res) => {
  const { courseCode } = req.params
  logger.info(`Getting missing audio details for ${courseCode}`)

  try {
    // =========================================================================
    // AZURE TTS COUNTS: Get from Phase8 /plan (single source of truth)
    // =========================================================================
    let phase8Plan
    try {
      const response = await axios.get(`${PHASE8_URL}/plan/${courseCode}`)
      phase8Plan = response.data
    } catch (e) {
      logger.error(`Phase8 /plan failed for ${courseCode}: ${e.message}`)
      return res.status(503).json({
        error: 'Phase 8 audio service not available',
        details: e.message,
        hint: 'Ensure phase8-audio-v13.cjs is running on port 3465'
      })
    }

    const supabase = supabaseClient.getClient()

    // Get course info for ElevenLabs checks
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('known_lang, target_lang, seed_count')
      .eq('course_code', courseCode)
      .single()

    if (courseErr) throw courseErr

    const knownLang = course?.known_lang || 'eng'
    const releaseTarget = course?.seed_count || 260

    // =========================================================================
    // SAMPLE AUDIO: Get one sample per role for voice matching UI
    // =========================================================================
    const samplesByRole = { known: null, target1: null, target2: null, presentation: null }

    const { data: sampleAudio } = await supabase
      .from('course_audio')
      .select('id, text, role, voice_id, s3_key')
      .eq('course_code', courseCode)
      .not('s3_key', 'like', 'pending/%')
      .in('role', ['known', 'target1', 'target2', 'presentation'])
      .limit(100)

    for (const sa of sampleAudio || []) {
      if (!samplesByRole[sa.role]) {
        samplesByRole[sa.role] = {
          text: sa.text,
          audioId: sa.id,
          voiceId: sa.voice_id,
          s3Key: sa.s3_key
        }
      }
    }

    // Generate signed URLs for samples
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

    // =========================================================================
    // ELEVENLABS: Shared audio (encouragements, instructions, welcome)
    // =========================================================================
    const SHARED_AUDIO_REQUIREMENTS = { encouragement: 26, instruction: 48 }

    const { count: encCount } = await supabase
      .from('shared_audio')
      .select('*', { count: 'exact', head: true })
      .eq('language', knownLang)
      .eq('audio_type', 'encouragement')

    const { count: instrCount } = await supabase
      .from('shared_audio')
      .select('*', { count: 'exact', head: true })
      .eq('language', knownLang)
      .eq('audio_type', 'instruction')

    const sharedAudio = {
      language: knownLang,
      encouragements: {
        expected: SHARED_AUDIO_REQUIREMENTS.encouragement,
        existing: encCount || 0,
        missing: Math.max(0, SHARED_AUDIO_REQUIREMENTS.encouragement - (encCount || 0))
      },
      instructions: {
        expected: SHARED_AUDIO_REQUIREMENTS.instruction,
        existing: instrCount || 0,
        missing: Math.max(0, SHARED_AUDIO_REQUIREMENTS.instruction - (instrCount || 0))
      }
    }

    // Welcome audio check
    let welcomeStatus = { exists: false, hasAudio: false, details: null }
    try {
      const welcomesPath = require('path').join(__dirname, '../public/vfs/canonical/welcomes.json')
      if (require('fs').existsSync(welcomesPath)) {
        const welcomes = JSON.parse(require('fs').readFileSync(welcomesPath, 'utf8'))
        const welcome = welcomes.welcomes?.[courseCode]
        if (welcome) {
          welcomeStatus = {
            exists: true,
            hasAudio: !!welcome.id,
            hasDuration: welcome.duration > 0,
            details: { id: welcome.id, duration: welcome.duration, voice: welcome.voice }
          }
        }
      }
    } catch (e) {
      logger.warn(`Could not read welcomes.json: ${e.message}`)
    }

    // =========================================================================
    // BUILD RESPONSE: Phase8 data for Azure, local data for ElevenLabs
    // =========================================================================
    const breakdown = phase8Plan.breakdown || { known: 0, target1: 0, target2: 0, presentation: 0 }
    const azureMissing = phase8Plan.missing || 0
    const sharedMissing = sharedAudio.encouragements.missing + sharedAudio.instructions.missing
    const welcomeMissing = welcomeStatus.hasAudio ? 0 : 1
    const totalMissing = azureMissing + sharedMissing + welcomeMissing

    // Build missing arrays for UI (empty - UI uses counts, detail lists not needed)
    const missingByRole = { known: [], target1: [], target2: [], presentation: [] }

    res.json({
      success: true,
      courseCode,
      releaseTarget,
      totalMissing,
      totalPhrases: phase8Plan.totalPhrases || 0,
      totalLegos: phase8Plan.totalPresentationsNeeded || 0,
      existingCounts: phase8Plan.existingByRole || { known: 0, target1: 0, target2: 0, presentation: 0 },

      // Phase8 breakdown for Azure (UI reads .length but we provide counts via byProcess)
      missing: missingByRole,
      missingCounts: breakdown,  // Direct counts for UI
      samples: samplesByRole,

      // Seeds/LEGOs included in phase8 counts (no separate tracking needed)
      seeds: { counts: {}, missing: { known: [], target1: [], target2: [] }, totalMissing: 0 },
      legos: { counts: {}, missing: { known: [], target1: [], target2: [] }, totalMissing: 0 },

      // ElevenLabs (local)
      sharedAudio,
      welcome: welcomeStatus,

      // Summary by generation process
      byProcess: {
        azure: {
          label: 'Azure TTS (Phrases)',
          missing: breakdown.known + breakdown.target1 + breakdown.target2,
          categories: ['known', 'target1', 'target2']
        },
        azureSeeds: {
          label: 'Azure TTS (Seeds)',
          missing: 0,  // Included in phase8 deduped counts
          categories: []
        },
        azureLegos: {
          label: 'Azure TTS (LEGOs)',
          missing: breakdown.presentation,
          categories: ['presentation']
        },
        elevenLabs: {
          label: 'ElevenLabs (UI Audio)',
          missing: sharedMissing + welcomeMissing,
          categories: ['encouragements', 'instructions', 'welcome']
        }
      }
    })

  } catch (error) {
    logger.error(`Missing audio error for ${courseCode}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/production/:courseCode/audio-pipeline/orphan-legos
// Find NEW LEGOs that don't have any phrases (position=0 is the debut phrase)
// Phrase table uses seed_number + lego_index to identify the LEGO, not lego_id
app.get('/api/production/:courseCode/audio-pipeline/orphan-legos', async (req, res) => {
  const { courseCode } = req.params
  logger.info(`Finding orphan LEGOs for ${courseCode}`)

  try {
    const supabase = supabaseClient.getClient()

    // Get all NEW LEGOs (only new LEGOs need debut phrases)
    const { data: legos, error: legosError } = await supabase
      .from('course_legos')
      .select('lego_id, seed_number, lego_index, known_text, target_text, type')
      .eq('course_code', courseCode)
      .eq('is_new', true)

    if (legosError) throw legosError

    // Get all practice phrases (any phrase, position 0 is debut)
    // Use seed_number + lego_index to identify which LEGO has phrases
    const { data: phrases, error: phrasesError } = await supabase
      .from('course_practice_phrases')
      .select('seed_number, lego_index')
      .eq('course_code', courseCode)

    if (phrasesError) throw phrasesError

    // Build set of LEGOs that have at least one phrase
    const legosWithPhrases = new Set(
      (phrases || []).map(p => `${p.seed_number}-${p.lego_index}`)
    )

    // Find LEGOs without any phrases
    const orphanLegos = (legos || []).filter(l =>
      !legosWithPhrases.has(`${l.seed_number}-${l.lego_index}`)
    )

    logger.info(`Found ${orphanLegos.length} orphan LEGOs (LEGOs without any phrases)`)

    res.json({
      success: true,
      orphanLegos,
      total: orphanLegos.length
    })
  } catch (error) {
    logger.error(`Orphan LEGOs error for ${courseCode}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/:courseCode/audio-pipeline/fix-orphan-legos
// Add debut phrases (position=0) for LEGOs that don't have any phrases
app.post('/api/production/:courseCode/audio-pipeline/fix-orphan-legos', async (req, res) => {
  const { courseCode } = req.params
  const { dryRun = false } = req.body

  try {
    const supabase = supabaseClient.getClient()

    // OPTIMIZATION: Quick count of new LEGOs first - most courses have none
    const { count: newLegoCount, error: countError } = await supabase
      .from('course_legos')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .eq('is_new', true)

    if (countError) throw countError

    // Fast path: no new LEGOs means no orphans possible
    if (!newLegoCount || newLegoCount === 0) {
      return res.json({ success: true, addedCount: 0, message: 'No new LEGOs to check' })
    }

    logger.info(`Fixing orphan LEGOs for ${courseCode} (${newLegoCount} new LEGOs, dryRun: ${dryRun})`)

    // Get all NEW LEGOs (we know there are some)
    const { data: legos, error: legosError } = await supabase
      .from('course_legos')
      .select('lego_id, seed_number, lego_index, known_text, target_text, type')
      .eq('course_code', courseCode)
      .eq('is_new', true)

    if (legosError) throw legosError

    // Only get phrases for the seeds that have new LEGOs (much smaller query)
    const seedNumbers = [...new Set(legos.map(l => l.seed_number))]
    const { data: phrases, error: phrasesError } = await supabase
      .from('course_practice_phrases')
      .select('seed_number, lego_index')
      .eq('course_code', courseCode)
      .in('seed_number', seedNumbers)

    if (phrasesError) throw phrasesError

    // Build set of LEGOs that have at least one phrase
    const legosWithPhrases = new Set(
      (phrases || []).map(p => `${p.seed_number}-${p.lego_index}`)
    )

    // Find LEGOs without any phrases
    const orphanLegos = (legos || []).filter(l =>
      !legosWithPhrases.has(`${l.seed_number}-${l.lego_index}`)
    )

    if (orphanLegos.length === 0) {
      return res.json({ success: true, addedCount: 0, message: 'No orphan LEGOs found' })
    }

    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        wouldAdd: orphanLegos.length,
        orphanLegos: orphanLegos.map(l => ({
          lego_id: l.lego_id,
          known_text: l.known_text,
          target_text: l.target_text
        }))
      })
    }

    // Create debut phrases for orphan LEGOs
    // Position 0 is the debut phrase (shows the LEGO itself)
    // word_count is required by database schema - count words in target_text
    const debutPhrases = orphanLegos.map(lego => ({
      course_code: courseCode,
      seed_number: lego.seed_number,
      lego_index: lego.lego_index,
      position: 0,
      known_text: lego.known_text,
      target_text: lego.target_text,
      word_count: (lego.target_text || '').split(/\s+/).filter(w => w.length > 0).length || 1,
      is_debut: true
    }))

    const { error: insertError } = await supabase
      .from('course_practice_phrases')
      .insert(debutPhrases)

    if (insertError) throw insertError

    logger.info(`Added ${debutPhrases.length} debut phrases for orphan LEGOs in ${courseCode}`)

    res.json({
      success: true,
      addedCount: debutPhrases.length,
      message: `Added ${debutPhrases.length} debut phrases`
    })
  } catch (error) {
    logger.error(`Fix orphan LEGOs error for ${courseCode}:`, error.message)
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

// =============================================================================
// EXPORT WORKFLOW ENDPOINTS (Legacy Manifest Publication)
// =============================================================================

const s3DeployService = require('./s3-deploy-service.cjs')

// GET /api/production/:courseCode/export-state
// Get current export workflow state for a course
app.get('/api/production/:courseCode/export-state', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()
    const { data, error } = await supabase
      .from('course_export_states')
      .select('*')
      .eq('course_code', courseCode)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // Return empty state if not found
    if (!data) {
      return res.json({
        courseCode,
        manifestGenerated: false,
        s3Verified: false,
        manifestPublished: false,
        audioDeployed: false
      })
    }

    res.json({
      courseCode: data.course_code,
      manifestGenerated: data.manifest_generated,
      manifestGeneratedAt: data.manifest_generated_at,
      s3Verified: data.s3_verified,
      s3VerifiedAt: data.s3_verified_at,
      manifestPublished: data.manifest_published,
      manifestPublishedAt: data.manifest_published_at,
      audioDeployed: data.audio_deployed,
      audioDeployedAt: data.audio_deployed_at,
      manifestVersion: data.manifest_version,
      manifestStatus: data.manifest_status,
      s3Verification: data.s3_verification,
      publishCourseConfigsPath: data.publish_course_configs_path,
      publishApidevFilename: data.publish_apidev_filename,
      deployPlan: data.deploy_plan,
      deployExecutedAt: data.deploy_executed_at,
      updatedAt: data.updated_at,
      pendingManifestPath: data.pending_manifest_path,
      generatedOnMachine: data.generated_on_machine
    })
  } catch (error) {
    logger.error('Error getting export state:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/:courseCode/export-state
// Update export workflow state for a course
app.post('/api/production/:courseCode/export-state', async (req, res) => {
  try {
    const { courseCode } = req.params
    const updates = req.body

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // Build update object with snake_case keys
    const updateData = { course_code: courseCode }

    if ('manifestGenerated' in updates) updateData.manifest_generated = updates.manifestGenerated
    if ('manifestGeneratedAt' in updates) updateData.manifest_generated_at = updates.manifestGeneratedAt
    if ('s3Verified' in updates) updateData.s3_verified = updates.s3Verified
    if ('s3VerifiedAt' in updates) updateData.s3_verified_at = updates.s3VerifiedAt
    if ('manifestPublished' in updates) updateData.manifest_published = updates.manifestPublished
    if ('manifestPublishedAt' in updates) updateData.manifest_published_at = updates.manifestPublishedAt
    if ('audioDeployed' in updates) updateData.audio_deployed = updates.audioDeployed
    if ('audioDeployedAt' in updates) updateData.audio_deployed_at = updates.audioDeployedAt
    if ('manifestVersion' in updates) updateData.manifest_version = updates.manifestVersion
    if ('manifestStatus' in updates) updateData.manifest_status = updates.manifestStatus
    if ('manifestHash' in updates) updateData.manifest_hash = updates.manifestHash
    if ('manifestSeedCount' in updates) updateData.manifest_seed_count = updates.manifestSeedCount
    if ('manifestLegoCount' in updates) updateData.manifest_lego_count = updates.manifestLegoCount
    if ('manifestAudioCount' in updates) updateData.manifest_audio_count = updates.manifestAudioCount
    if ('s3Verification' in updates) updateData.s3_verification = updates.s3Verification
    if ('publishCourseConfigsPath' in updates) updateData.publish_course_configs_path = updates.publishCourseConfigsPath
    if ('publishApidevFilename' in updates) updateData.publish_apidev_filename = updates.publishApidevFilename
    if ('deployPlan' in updates) updateData.deploy_plan = updates.deployPlan
    if ('deployExecutedAt' in updates) updateData.deploy_executed_at = updates.deployExecutedAt
    if ('pendingManifestPath' in updates) updateData.pending_manifest_path = updates.pendingManifestPath
    if ('generatedOnMachine' in updates) updateData.generated_on_machine = updates.generatedOnMachine

    const { data, error } = await supabase
      .from('course_export_states')
      .upsert(updateData, { onConflict: 'course_code' })
      .select()
      .single()

    if (error) throw error

    logger.info(`Export state updated for ${courseCode}`)
    res.json({ success: true, state: data })
  } catch (error) {
    logger.error('Error updating export state:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/:courseCode/export-legacy-with-state
// Step 1: Generate legacy manifest and save to temp with state tracking
app.post('/api/production/:courseCode/export-legacy-with-state', async (req, res) => {
  const { courseCode } = req.params
  try {
    const { withAudio = false } = req.body

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Get course metadata
    const course = await supabaseClient.getCourse(courseCode)
    if (!course) {
      return res.status(404).json({ error: `Course ${courseCode} not found` })
    }

    const knownCode = languageCodeService.legacyToStandard(course.known_lang)
    const targetCode = languageCodeService.legacyToStandard(course.target_lang)
    const courseConfigsId = `${knownCode}-${targetCode}`

    // Import the legacy manifest generator
    const { generateLegacyManifest, validateManifest } = require('./phases/generate-legacy-manifest.cjs')

    logger.info(`Generating legacy manifest for ${courseCode} (courseConfigsId: ${courseConfigsId}, withAudio: ${withAudio})`)

    // Generate a job ID for audio generation tracking
    const audioJobId = withAudio ? `legacy-audio-${courseCode}-${Date.now()}` : null

    // If withAudio, run audio generation in background and return response immediately
    if (withAudio && audioJobId) {
      // Generate manifest WITHOUT audio first (fast)
      const { manifest, audioGenerationWarnings: noAudioWarnings } = await generateLegacyManifest(courseCode, { withAudio: false })

      // Validate and save manifest
      const validation = validateManifest(manifest)
      const seedCount = manifest.slices?.[0]?.seeds?.length || 0
      const orderedEnc = manifest.slices?.[0]?.orderedEncouragements?.length || 0
      const pooledEnc = manifest.slices?.[0]?.pooledEncouragements?.length || 0

      const legoIds = new Set()
      for (const seed of manifest.slices[0]?.seeds || []) {
        for (const item of seed.introduction_items || []) {
          if (item.node?.id) legoIds.add(item.node.id)
        }
      }
      const legoCount = legoIds.size

      const audioIds = new Set()
      for (const variants of Object.values(manifest.slices[0]?.samples || {})) {
        for (const audio of variants) {
          if (audio.id) audioIds.add(audio.id)
        }
      }
      const audioCount = audioIds.size

      // Save manifest
      const manifestPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_pending_manifest.json`)
      await fs.ensureDir(path.dirname(manifestPath))
      await fs.writeJson(manifestPath, manifest, { spaces: 2 })
      logger.info(`Saved pending manifest to: ${manifestPath}`)

      // Save to Supabase
      const supabase = supabaseClient.getClient()
      await supabase
        .from('course_export_states')
        .upsert({
          course_code: courseCode,
          manifest_generated: true,
          manifest_generated_at: new Date().toISOString(),
          manifest_seed_count: seedCount,
          manifest_lego_count: legoCount,
          manifest_audio_count: audioCount,
          pending_manifest_path: manifestPath,
          generated_on_machine: require('os').hostname(),
          s3_verified: false,
          s3_verified_at: null,
          s3_verification: null,
          manifest_published: false,
          manifest_published_at: null
        }, { onConflict: 'course_code' })

      logger.info(`Export state saved for ${courseCode}`)

      // Return response IMMEDIATELY so frontend can connect WebSocket
      res.json({
        success: true,
        courseCode,
        courseConfigsId,
        stats: {
          seeds: seedCount,
          legos: legoCount,
          audio: audioCount,
          orderedEncouragements: orderedEnc,
          pooledEncouragements: pooledEnc
        },
        validation: {
          valid: validation.valid,
          summary: validation.summary
        },
        savedToState: true,
        pendingPath: manifestPath,
        warnings: [],
        audioJobId: audioJobId
      })

      // NOW generate combined audio in background
      logger.info(`[AudioProgress] Starting background audio generation for job ${audioJobId}`)

      // Re-generate manifest with audio (will use the existing one and just add combined audio)
      const { manifest: finalManifest, audioGenerationWarnings } = await generateLegacyManifest(courseCode, {
        withAudio: true,
        onAudioProgress: (completed, total) => {
          logger.info(`[AudioProgress] Emitting progress: ${completed}/${total} for job ${audioJobId}`)
          io.emit('legacyAudio:progress', { jobId: audioJobId, completed, total, courseCode })
        }
      })

      // Update manifest with combined audio
      await fs.writeJson(manifestPath, finalManifest, { spaces: 2 })
      logger.info(`Updated manifest with combined presentations: ${manifestPath}`)

      // Emit completion event
      const skippedCount = audioGenerationWarnings?.skippedCount || 0
      const skippedItems = audioGenerationWarnings?.skippedItems || []
      logger.info(`[AudioProgress] Emitting completion for job ${audioJobId}, skipped: ${skippedCount}`)
      io.emit('legacyAudio:completed', {
        jobId: audioJobId,
        courseCode,
        successful: 704 - skippedCount,
        skippedCount,
        skipped: skippedItems
      })

      return // Already sent response
    }

    // Normal path (withAudio: false)
    const { manifest, audioGenerationWarnings, welcomeMissing } = await generateLegacyManifest(courseCode, { withAudio: false })

    // Validate the manifest
    const validation = validateManifest(manifest)

    // Compute stats
    const seedCount = manifest.slices?.[0]?.seeds?.length || 0
    const orderedEnc = manifest.slices?.[0]?.orderedEncouragements?.length || 0
    const pooledEnc = manifest.slices?.[0]?.pooledEncouragements?.length || 0

    // Count LEGOs (unique LEGO IDs)
    const legoIds = new Set()
    for (const seed of manifest.slices[0]?.seeds || []) {
      for (const item of seed.introduction_items || []) {
        if (item.node?.id) legoIds.add(item.node.id)
      }
    }
    const legoCount = legoIds.size

    // Count audio (all UUIDs in samples)
    const audioIds = new Set()
    for (const variants of Object.values(manifest.slices[0]?.samples || {})) {
      for (const audio of variants) {
        if (audio.id) audioIds.add(audio.id)
      }
    }
    const audioCount = audioIds.size

    // Save manifest to temp/course_export_states
    const manifestPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_pending_manifest.json`)
    await fs.ensureDir(path.dirname(manifestPath))
    await fs.writeJson(manifestPath, manifest, { spaces: 2 })
    logger.info(`Saved pending manifest to: ${manifestPath}`)

    // Save to Supabase export state
    const supabase = supabaseClient.getClient()
    await supabase
      .from('course_export_states')
      .upsert({
        course_code: courseCode,
        manifest_generated: true,
        manifest_generated_at: new Date().toISOString(),
        manifest_seed_count: seedCount,
        manifest_lego_count: legoCount,
        manifest_audio_count: audioCount,
        pending_manifest_path: manifestPath,
        generated_on_machine: require('os').hostname(),
        // Clear previous verification state
        s3_verified: false,
        s3_verified_at: null,
        s3_verification: null,
        manifest_published: false,
        manifest_published_at: null
      }, { onConflict: 'course_code' })

    logger.info(`Export state saved for ${courseCode}`)

    res.json({
      success: true,
      courseCode,
      courseConfigsId,
      stats: {
        seeds: seedCount,
        legos: legoCount,
        audio: audioCount,
        orderedEncouragements: orderedEnc,
        pooledEncouragements: pooledEnc
      },
      validation: {
        valid: validation.valid,
        summary: validation.summary
      },
      savedToState: true,
      pendingPath: manifestPath,
      warnings: [
        ...(audioGenerationWarnings ? [audioGenerationWarnings.message] : []),
        ...(welcomeMissing ? ['Welcome audio missing - course will use placeholder introduction'] : [])
      ],
      audioJobId: audioJobId // Will be null if withAudio=false
    })
  } catch (error) {
    logger.error(`Error generating legacy manifest for ${courseCode}:`, error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/production/:courseCode/export-state
// Reset export workflow state for a course
app.delete('/api/production/:courseCode/export-state', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Delete local temp files (manifest and durations only)
    const manifestPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_pending_manifest.json`)
    const durationsPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_extracted_durations.json`)

    if (fs.existsSync(manifestPath)) {
      await fs.remove(manifestPath)
      logger.info(`Deleted pending manifest for ${courseCode}`)
    }

    if (fs.existsSync(durationsPath)) {
      await fs.remove(durationsPath)
      logger.info(`Deleted extracted durations for ${courseCode}`)
    }

    // Delete from Supabase
    const supabase = supabaseClient.getClient()
    const { error } = await supabase
      .from('course_export_states')
      .delete()
      .eq('course_code', courseCode)

    if (error && error.code !== 'PGRST116') {
      // Ignore "not found" error
      throw error
    }

    logger.info(`Export state reset for ${courseCode}`)
    res.json({ success: true, message: 'Export state reset successfully' })
  } catch (error) {
    logger.error('Error resetting export state:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/production/:courseCode/pending-manifest
// Download pending manifest for review before publishing
app.get('/api/production/:courseCode/pending-manifest', async (req, res) => {
  try {
    const { courseCode } = req.params

    // Load manifest from temp/course_export_states
    const manifestPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_pending_manifest.json`)
    if (!fs.existsSync(manifestPath)) {
      return res.status(404).json({ error: 'No pending manifest found. Generate manifest first (Step 1).' })
    }

    const manifest = await fs.readJson(manifestPath)
    res.json(manifest)
  } catch (error) {
    logger.error(`Get pending manifest error for ${courseCode}:`, error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/production/:courseCode/export-state/manifest
// Re-download manifest (Step 1 - Redownload button)
app.get('/api/production/:courseCode/export-state/manifest', async (req, res) => {
  try {
    const { courseCode } = req.params

    // Check if manifest exists in temp folder
    const manifestPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_pending_manifest.json`)
    if (!fs.existsSync(manifestPath)) {
      return res.status(404).json({ error: 'No pending manifest found. Generate manifest first (Step 1).' })
    }

    const manifest = await fs.readJson(manifestPath)

    // Get generation info from Supabase
    if (supabaseClient.isInitialized()) {
      const supabase = supabaseClient.getClient()
      const { data: exportState } = await supabase
        .from('course_export_states')
        .select('manifest_generated_at, manifest_hash')
        .eq('course_code', courseCode)
        .single()

      res.json({
        manifest,
        generatedAt: exportState?.manifest_generated_at || null,
        hash: exportState?.manifest_hash || null
      })
    } else {
      res.json({ manifest })
    }
  } catch (error) {
    logger.error('Error getting cached manifest:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/:courseCode/publish-manifest
// Step 3: Publish manifest to course-configs repo and/or apidev
app.post('/api/production/:courseCode/publish-manifest', async (req, res) => {
  try {
    const { courseCode } = req.params
    const {
      version,
      status = 'beta',
      commitToCourseConfigs = true,
      scpToApidev = false
    } = req.body

    if (!version) {
      return res.status(400).json({ error: 'Version is required' })
    }

    // Check if manifest exists
    const manifestPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_pending_manifest.json`)
    if (!fs.existsSync(manifestPath)) {
      return res.status(404).json({ error: 'No pending manifest found. Generate and verify first.' })
    }

    const manifest = await fs.readJson(manifestPath)

    logger.info(`Publishing manifest for ${courseCode}: v${version}, status=${status}`)

    // Use publish manifest service
    const result = await publishManifestService.publishManifest(manifest, {
      version,
      status,
      commitToCourseConfigs,
      scpToApidev
    })

    if (result.success) {
      // Update export state
      if (supabaseClient.isInitialized()) {
        const supabase = supabaseClient.getClient()
        await supabase
          .from('course_export_states')
          .upsert({
            course_code: courseCode,
            manifest_published: true,
            manifest_published_at: new Date().toISOString(),
            manifest_version: version,
            manifest_status: status,
            publish_course_configs_path: result.courseConfigs?.filePath || null,
            publish_apidev_filename: result.apidev?.filename || null
          }, { onConflict: 'course_code' })
      }

      logger.info(`Manifest published for ${courseCode}: v${version}`)
    }

    res.json(result)
  } catch (error) {
    logger.error('Error publishing manifest:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/production/:courseCode/publish-manifest/version
// Step 3: Check course-configs repo and suggest next version
app.get('/api/production/:courseCode/publish-manifest/version', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const course = await supabaseClient.getCourse(courseCode)
    if (!course) {
      return res.status(404).json({ error: `Course ${courseCode} not found` })
    }

    const knownCode = languageCodeService.legacyToStandard(course.known_lang)
    const targetCode = languageCodeService.legacyToStandard(course.target_lang)
    const courseConfigsId = `${knownCode}-${targetCode}`

    const repoCheck = publishManifestService.checkCourseConfigsRepo()
    const versionInfo = publishManifestService.suggestVersion(courseConfigsId)

    res.json({
      courseCode,
      courseConfigsId,
      repoAvailable: repoCheck.exists,
      repoError: repoCheck.error,
      ...versionInfo
    })
  } catch (error) {
    logger.error('Error getting version suggestion:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/production/course-configs/status
// Get status of course-configs repo (commits ahead, branch, etc.)
app.get('/api/production/course-configs/status', async (req, res) => {
  try {
    const status = publishManifestService.getRepoStatus()
    res.json(status)
  } catch (error) {
    logger.error('Error getting repo status:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/course-configs/push
// Push course-configs commits to remote
app.post('/api/production/course-configs/push', async (req, res) => {
  try {
    logger.info('Pushing course-configs to remote...')
    const result = publishManifestService.pushToRemote()

    if (result.success) {
      res.json(result)
    } else {
      res.status(500).json(result)
    }
  } catch (error) {
    logger.error('Error pushing to remote:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/:courseCode/verify-s3
// Step 2: Verify stage audio exists and durations match manifest
app.post('/api/production/:courseCode/verify-s3', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Load manifest from temp/course_export_states
    const manifestPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_pending_manifest.json`)
    if (!fs.existsSync(manifestPath)) {
      return res.status(404).json({ error: 'No pending manifest found. Generate manifest first.' })
    }

    const pendingManifest = await fs.readJson(manifestPath)

    // Collect all UUIDs from manifest
    const uuids = []

    // Introduction
    if (pendingManifest.introduction?.id) {
      uuids.push(pendingManifest.introduction.id)
    }

    // Encouragements
    for (const enc of pendingManifest.slices[0]?.orderedEncouragements || []) {
      if (enc.id) uuids.push(enc.id)
    }
    for (const enc of pendingManifest.slices[0]?.pooledEncouragements || []) {
      if (enc.id) uuids.push(enc.id)
    }

    // Samples
    const samples = pendingManifest.slices[0]?.samples || {}
    for (const [text, audioArray] of Object.entries(samples)) {
      for (const audio of audioArray) {
        if (audio.id) uuids.push(audio.id)
      }
    }

    logger.info(`Verifying ${uuids.length} audio files for ${courseCode}`)

    // Stage 1: Existence check + Stage 2: Duration verification
    const verifyResults = await s3DeployService.verifyStageAudio(
      uuids,
      pendingManifest,
      (phase, checked, total, ...phaseData) => {
        if (phase === 'existence') {
          io.emit('s3Verify:progress', { courseCode, phase: 'existence', checked, total })
        } else if (phase === 'duration') {
          const [matched, mismatched, errors] = phaseData
          io.emit('s3Verify:progress', {
            courseCode, phase: 'duration', checked, total, matched, mismatched, errors
          })
        }
      },
      { checkDurations: true, durationTolerance: 0 }
    )

    const results = { ...verifyResults }

    // Save state after Stage 2 (database-first)
    const supabase = supabaseClient.getClient()
    await supabase
      .from('course_export_states')
      .upsert({
        course_code: courseCode,
        s3_verification: results,
        s3_verified: false, // Not verified yet until auto-fix completes
        updated_at: new Date().toISOString()
      }, { onConflict: 'course_code' })

    // Send immediate response after Stage 2 - don't block the UI
    logger.info(`[VERIFY-S3] Stages 1-2 complete, starting auto-fix in background`)
    res.json(results)

    // Stage 3 & 4: Auto-fix and verify in BACKGROUND (async, non-blocking)
    if (results.durationMismatched > 0) {
      setImmediate(async () => {
        try {
          logger.info(`[AUTO-FIX] Starting background auto-fix for ${results.durationMismatched} duration mismatches`)
          io.emit('s3Verify:progress', { courseCode, phase: 'fixing', checked: 0, total: results.durationMismatched })

          // Save extracted S3 durations to temp file
          const durationsPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_extracted_durations.json`)
          const durationsObj = Object.fromEntries(verifyResults.extractedDurations || new Map())
          await fs.writeJson(durationsPath, durationsObj, { spaces: 2 })
          logger.info(`[AUTO-FIX] Saved ${Object.keys(durationsObj).length} extracted durations`)

          // Run auto-fix with pre-extracted durations (should be instant)
          const fixResults = await s3DeployService.autoFixDurations(
            uuids,
            pendingManifest,
            (phase, checked, total, fixed, errors) => {
              io.emit('s3Verify:progress', {
                courseCode, phase: 'fixing', checked, total, fixed, errors
              })
            },
            verifyResults.extractedDurations
          )

          logger.info(`[AUTO-FIX] Fixed ${fixResults.fixed} durations, ${fixResults.errors} errors`)

          // Save updated manifest
          await fs.writeJson(manifestPath, fixResults.updatedManifest, { spaces: 2 })
          results.durationsFixed = fixResults.fixed
          results.durationFixErrors = fixResults.errors

          // Stage 4: Verify fixed durations
          logger.info(`[VERIFY-FIX] Verifying ${fixResults.fixed} fixed durations`)
          io.emit('s3Verify:progress', { courseCode, phase: 'verifying', checked: 0, total: fixResults.fixed })

          const fixedManifest = fixResults.updatedManifest
          const extractedDurations = await fs.readJson(durationsPath)

          let verifyChecked = 0
          let verifyMatched = 0
          let verifyMismatched = 0
          const verifyMismatchDetails = []
          let progressCounter = 0

          // Check all fixed durations with progress updates
          const checkSample = (uuid, manifestDuration) => {
            verifyChecked++
            progressCounter++
            const s3Duration = extractedDurations[uuid]

            if (s3Duration !== undefined) {
              const diff = Math.abs(manifestDuration - s3Duration)
              if (diff < 0.001) {
                verifyMatched++
              } else {
                verifyMismatched++
                verifyMismatchDetails.push({
                  uuid,
                  manifestDuration,
                  s3Duration,
                  difference: diff
                })
              }
            }

            // Send progress update every 100 samples
            if (progressCounter % 100 === 0) {
              io.emit('s3Verify:progress', {
                courseCode, phase: 'verifying', checked: verifyChecked, total: fixResults.fixed,
                matched: verifyMatched, mismatched: verifyMismatched
              })
            }
          }

          // Check introduction
          if (fixedManifest.introduction?.id && fixedManifest.introduction?.duration) {
            checkSample(fixedManifest.introduction.id, fixedManifest.introduction.duration)
          }

          // Check encouragements
          for (const enc of fixedManifest.slices[0]?.orderedEncouragements || []) {
            if (enc.id && enc.duration) checkSample(enc.id, enc.duration)
          }
          for (const enc of fixedManifest.slices[0]?.pooledEncouragements || []) {
            if (enc.id && enc.duration) checkSample(enc.id, enc.duration)
          }

          // Check samples
          for (const audioArray of Object.values(fixedManifest.slices[0]?.samples || {})) {
            for (const audio of audioArray) {
              if (audio.id && audio.duration) checkSample(audio.id, audio.duration)
            }
          }

          // Final progress update
          io.emit('s3Verify:progress', {
            courseCode, phase: 'verifying', checked: verifyChecked, total: verifyChecked,
            matched: verifyMatched, mismatched: verifyMismatched
          })

          logger.info(`[VERIFY-FIX] Verification complete: ${verifyMatched} matched, ${verifyMismatched} mismatched`)

          results.verifyFixed = {
            checked: verifyChecked,
            matched: verifyMatched,
            mismatched: verifyMismatched,
            mismatchDetails: verifyMismatchDetails
          }

          // Clean up temp durations file
          await fs.remove(durationsPath)

          // Update final state (database-first)
          const s3Verified = results.missing === 0 && verifyMismatched === 0
          await supabase
            .from('course_export_states')
            .update({
              s3_verification: results,
              s3_verified: s3Verified,
              s3_verified_at: s3Verified ? new Date().toISOString() : null,
              updated_at: new Date().toISOString()
            })
            .eq('course_code', courseCode)

          // Notify completion
          logger.info(`[VERIFY-S3] All stages complete for ${courseCode}`)
          io.emit('s3Verify:completed', { courseCode, ...results })

        } catch (err) {
          logger.error(`[AUTO-FIX] Background error for ${courseCode}:`, err)
          io.emit('s3Verify:error', { courseCode, error: err.message })
        }
      })
    } else {
      // No mismatches, mark as verified immediately (database-first)
      const s3Verified = results.missing === 0
      await supabase
        .from('course_export_states')
        .update({
          s3_verification: results,
          s3_verified: s3Verified,
          s3_verified_at: s3Verified ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('course_code', courseCode)

      io.emit('s3Verify:completed', { courseCode, ...results })
    }

  } catch (error) {
    logger.error(`Verify S3 error for ${courseCode}:`, error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Load published manifest from course-configs repo or local fallback
 * @param {string} courseCode - Course code (e.g., 'fra_for_eng')
 * @returns {Object} { manifest, source } - manifest object and source location
 */
async function loadPublishedManifest(courseCode) {
  // Get course to compute courseConfigsId from language codes
  const course = await supabaseClient.getCourse(courseCode)
  if (!course) {
    throw new Error(`Course ${courseCode} not found`)
  }

  // Compute courseConfigsId dynamically from language codes (e.g., "en-cmn" for zho_for_eng)
  const knownCode = languageCodeService.databaseToManifest(course.known_lang)
  const targetCode = languageCodeService.databaseToManifest(course.target_lang)
  const courseConfigsId = `${knownCode}-${targetCode}`

  // Try course-configs repo first (canonical published location)
  const courseConfigsRepo = process.env.COURSE_CONFIGS_REPO || path.join(require('os').homedir(), 'Documents', 'GitHub', 'course-configs')
  const courseConfigsPath = path.join(courseConfigsRepo, 'Courses', `${courseConfigsId}.json`)

  if (fs.existsSync(courseConfigsPath)) {
    logger.info(`Loading published manifest from course-configs: ${courseConfigsPath}`)
    const manifest = await fs.readJson(courseConfigsPath)
    return { manifest, source: 'course-configs' }
  }

  // Fallback to local published manifest
  const localPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_published_manifest.json`)
  if (fs.existsSync(localPath)) {
    logger.info(`Loading published manifest from local: ${localPath}`)
    const manifest = await fs.readJson(localPath)
    return { manifest, source: 'local' }
  }

  throw new Error('No published manifest found. Publish manifest first (Step 3).')
}

// POST /api/production/:courseCode/deploy-audio/plan
// Get deployment plan (what files need to be deployed)
app.post('/api/production/:courseCode/deploy-audio/plan', async (req, res) => {
  const { courseCode } = req.params
  try {
    // Load published manifest from course-configs or local
    const { manifest: publishedManifest, source } = await loadPublishedManifest(courseCode)
    logger.info(`[Deploy Plan] Loaded manifest for ${courseCode} from ${source}`)

    // Collect all UUIDs
    const uuids = []
    if (publishedManifest.introduction?.id) uuids.push(publishedManifest.introduction.id)
    for (const enc of publishedManifest.slices[0]?.orderedEncouragements || []) {
      if (enc.id) uuids.push(enc.id)
    }
    for (const enc of publishedManifest.slices[0]?.pooledEncouragements || []) {
      if (enc.id) uuids.push(enc.id)
    }
    const samples = publishedManifest.slices[0]?.samples || {}
    for (const [text, audioArray] of Object.entries(samples)) {
      for (const audio of audioArray) {
        if (audio.id) uuids.push(audio.id)
      }
    }
    logger.info(`[Deploy Plan] Collected ${uuids.length} UUIDs for ${courseCode}`)

    const plan = await s3DeployService.generateDeployPlan(uuids)
    logger.info(`[Deploy Plan] Complete for ${courseCode}: ${plan.newFiles} new, ${plan.overwrites} overwrites`)

    // Save to state (database-first)
    if (supabaseClient.isInitialized()) {
      const supabase = supabaseClient.getClient()
      await supabase
        .from('course_export_states')
        .update({
          deploy_plan: plan,
          updated_at: new Date().toISOString()
        })
        .eq('course_code', courseCode)
    }

    res.json(plan)
  } catch (error) {
    logger.error(`[Deploy Plan] Error for ${courseCode}:`, error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/:courseCode/deploy-audio/execute
// Execute deployment (copy stage → production)
app.post('/api/production/:courseCode/deploy-audio/execute', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { confirmation } = req.body

    // Load published manifest from course-configs or local
    const { manifest: publishedManifest } = await loadPublishedManifest(courseCode)

    // Collect UUIDs
    const uuids = []
    if (publishedManifest.introduction?.id) uuids.push(publishedManifest.introduction.id)
    for (const enc of publishedManifest.slices[0]?.orderedEncouragements || []) {
      if (enc.id) uuids.push(enc.id)
    }
    for (const enc of publishedManifest.slices[0]?.pooledEncouragements || []) {
      if (enc.id) uuids.push(enc.id)
    }
    const samples = publishedManifest.slices[0]?.samples || {}
    for (const [text, audioArray] of Object.entries(samples)) {
      for (const audio of audioArray) {
        if (audio.id) uuids.push(audio.id)
      }
    }

    const result = await s3DeployService.deployToProduction(uuids, {
      confirmOverwrite: confirmation,
      onProgress: (copied, total) => {
        io.emit('audioDeploy:progress', { courseCode, copied, total })
      }
    })

    // Post-deployment verification
    const verificationResult = await s3DeployService.verifyProductionDurations(
      uuids,
      publishedManifest,
      (checked, matched, mismatched, errors) => {
        io.emit('audioDeploy:verifyProgress', {
          courseCode, checked, total: uuids.length, matched, mismatched, errors
        })
      }
    )

    result.verification = verificationResult

    // Save to state (database-first)
    if (supabaseClient.isInitialized()) {
      const supabase = supabaseClient.getClient()
      await supabase
        .from('course_export_states')
        .update({
          audio_deployed: true,
          audio_deployed_at: new Date().toISOString(),
          deploy_plan: verificationResult,
          updated_at: new Date().toISOString()
        })
        .eq('course_code', courseCode)
    }

    res.json(result)
  } catch (error) {
    logger.error(`Deploy error for ${courseCode}:`, error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/:courseCode/verify-production-durations
// Step 4: Verify production audio durations WITHOUT deploying
app.post('/api/production/:courseCode/verify-production-durations', async (req, res) => {
  try {
    const { courseCode } = req.params

    // Load published manifest from course-configs or local
    const { manifest: publishedManifest } = await loadPublishedManifest(courseCode)

    // Collect UUIDs
    const uuids = []
    if (publishedManifest.introduction?.id) uuids.push(publishedManifest.introduction.id)
    for (const enc of publishedManifest.slices[0]?.orderedEncouragements || []) {
      if (enc.id) uuids.push(enc.id)
    }
    for (const enc of publishedManifest.slices[0]?.pooledEncouragements || []) {
      if (enc.id) uuids.push(enc.id)
    }
    const samples = publishedManifest.slices[0]?.samples || {}
    for (const [text, audioArray] of Object.entries(samples)) {
      for (const audio of audioArray) {
        if (audio.id) uuids.push(audio.id)
      }
    }

    const verificationResult = await s3DeployService.verifyProductionDurations(
      uuids,
      publishedManifest,
      (checked, matched, mismatched, errors) => {
        io.emit('audioDeploy:verifyProgress', {
          courseCode, checked, total: uuids.length, matched, mismatched, errors
        })
      }
    )

    // Save to state (database-first)
    if (supabaseClient.isInitialized()) {
      const supabase = supabaseClient.getClient()
      await supabase
        .from('course_export_states')
        .update({
          deploy_plan: verificationResult,
          updated_at: new Date().toISOString()
        })
        .eq('course_code', courseCode)
    }

    res.json(verificationResult)
  } catch (error) {
    logger.error(`Verify production error for ${courseCode}:`, error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/:courseCode/deploy-audio/missing-only
// Deploy ONLY missing files (safe deployment after verification)
app.post('/api/production/:courseCode/deploy-audio/missing-only', async (req, res) => {
  try {
    const { courseCode } = req.params

    // Load published manifest from course-configs or local
    const { manifest: publishedManifest } = await loadPublishedManifest(courseCode)

    // Collect UUIDs
    const uuids = []
    if (publishedManifest.introduction?.id) uuids.push(publishedManifest.introduction.id)
    for (const enc of publishedManifest.slices[0]?.orderedEncouragements || []) {
      if (enc.id) uuids.push(enc.id)
    }
    for (const enc of publishedManifest.slices[0]?.pooledEncouragements || []) {
      if (enc.id) uuids.push(enc.id)
    }
    const samples = publishedManifest.slices[0]?.samples || {}
    for (const [text, audioArray] of Object.entries(samples)) {
      for (const audio of audioArray) {
        if (audio.id) uuids.push(audio.id)
      }
    }

    // First verify production to get missing files
    const verification = await s3DeployService.verifyProductionDurations(
      uuids,
      publishedManifest,
      (checked, matched, mismatched, errors) => {
        io.emit('audioDeploy:verifyProgress', {
          courseCode, checked, total: uuids.length, matched, mismatched, errors
        })
      }
    )

    const missingUuids = verification.missingUuids || []

    if (missingUuids.length === 0) {
      return res.json({
        success: true,
        message: 'No missing files to deploy',
        copied: 0,
        total: uuids.length,
        missing: 0
      })
    }

    // Deploy ONLY missing files (no overwrites, no confirmation needed)
    const result = await s3DeployService.deployToProduction(missingUuids, {
      confirmOverwrite: false, // Safe - no overwrites
      onProgress: (copied, total) => {
        io.emit('audioDeploy:progress', { courseCode, copied, total: missingUuids.length })
      }
    })

    result.message = `Deployed ${result.copied} missing files`

    // Update state (database-first)
    if (supabaseClient.isInitialized()) {
      const supabase = supabaseClient.getClient()
      const audioDeployed = verification.missing === 0 // Only mark complete if everything is there
      await supabase
        .from('course_export_states')
        .update({
          audio_deployed: audioDeployed,
          audio_deployed_at: audioDeployed ? new Date().toISOString() : null,
          deploy_plan: verification,
          updated_at: new Date().toISOString()
        })
        .eq('course_code', courseCode)
    }

    res.json(result)
  } catch (error) {
    logger.error(`Deploy missing error for ${courseCode}:`, error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// CHECKPOINT PROXY ROUTES (to Course Builder API)
// =============================================================================

const COURSE_BUILDER_API_URL = process.env.COURSE_BUILDER_API_URL || 'http://localhost:3471'

// Proxy /api/checkpoint/* to Course Builder API
app.use('/api/checkpoint', async (req, res) => {
  const targetUrl = `${COURSE_BUILDER_API_URL}/api/checkpoint${req.url}`
  logger.info(`[Checkpoint Proxy] ${req.method} ${targetUrl}`)

  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })

    res.status(response.status).json(response.data)
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'Course Builder API not running',
        message: 'Start with: pm2 start services/course-builder-api.cjs --name course-builder'
      })
    }

    const status = error.response?.status || 500
    const data = error.response?.data || { error: error.message }
    res.status(status).json(data)
  }
})

const PORT = process.env.PRODUCTION_API_PORT || 3470

httpServer.listen(PORT, () => {
  logger.log(`Production API server running on port ${PORT}`)
  logger.log(`WebSocket path: /api/production/websocket`)
})

module.exports = { app, io, emitToRoom }
