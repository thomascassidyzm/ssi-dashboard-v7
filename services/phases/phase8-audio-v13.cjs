/**
 * Phase 8: Audio Generation Service (v13)
 *
 * Generates TTS audio for courses using the v13 schema.
 * Writes directly to course_audio table (flat, course-owned).
 *
 * @version 13.0.0
 * @port 3465
 */

require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
const { v4: uuidv4 } = require('uuid')
const fs = require('fs-extra')
const path = require('path')
const os = require('os')
const createLogger = require('../shared/logger.cjs')
const ttsService = require('../tts-service.cjs')
const audioProcessor = require('../audio-processor.cjs')

const logger = createLogger('Phase8-Audio-v13')

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PHASE8_PORT || 3465  // Always use PHASE8_PORT, not generic PORT

// =============================================================================
// CLIENTS
// =============================================================================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
)

const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' })
const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'

// =============================================================================
// CONCURRENCY SETTINGS
// =============================================================================

// Azure TTS limits: Free=20/min, Standard=200/min
// Default 10 works well with standard tier (200 req/min)
const CONCURRENCY = parseInt(process.env.AUDIO_CONCURRENCY, 10) || 10

/**
 * Process items in parallel with concurrency limit
 * @param {Array} items - Items to process
 * @param {Function} processor - Async function to process each item
 * @param {number} concurrency - Max concurrent operations
 * @returns {Promise<{success: number, failed: number, errors: Array}>}
 */
async function processInParallel(items, processor, concurrency = CONCURRENCY) {
  const results = { success: 0, failed: 0, errors: [] }

  // Process in batches
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)

    const batchResults = await Promise.allSettled(
      batch.map(item => processor(item))
    )

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j]
      if (result.status === 'fulfilled') {
        results.success++
      } else {
        results.failed++
        results.errors.push({
          item: batch[j],
          error: result.reason?.message || 'Unknown error'
        })
      }
    }
  }

  return results
}

// =============================================================================
// AUDIO MASTERING
// =============================================================================

/**
 * Master audio: normalize loudness and extract duration
 *
 * @param {Buffer} audioBuffer - Raw audio from TTS
 * @returns {Promise<{buffer: Buffer, durationMs: number}>} Mastered audio and duration
 */
async function masterAudio(audioBuffer) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audio-master-'))
  const rawPath = path.join(tempDir, 'raw.mp3')
  const masteredPath = path.join(tempDir, 'mastered.mp3')

  try {
    // Write raw audio to temp file
    await fs.writeFile(rawPath, audioBuffer)

    // Normalize to -16 LUFS (broadcast standard)
    await audioProcessor.normalizeAudio(rawPath, masteredPath, -16.0)

    // Extract duration
    const metadata = await audioProcessor.getAudioMetadata(masteredPath)
    const durationMs = Math.round(metadata.duration * 1000)

    // Read mastered audio back
    const masteredBuffer = await fs.readFile(masteredPath)

    logger.debug(`Mastered audio: ${durationMs}ms, ${masteredBuffer.length} bytes`)

    return { buffer: masteredBuffer, durationMs }
  } finally {
    // Cleanup temp directory
    await fs.remove(tempDir)
  }
}

// =============================================================================
// GLOBAL PROGRESS STATE (for any audio generation)
// =============================================================================

const currentWork = {
  active: false,
  operation: null,      // 'generate' | 'regenerate-role' | 'regenerate-presentations'
  courseCode: null,
  role: null,
  current: 0,
  total: 0,
  success: 0,
  failed: 0,
  startedAt: null,
  lastItem: null,       // Last processed item (for display)
  errors: []            // Recent errors
}

function startWork(operation, courseCode, total, role = null) {
  currentWork.active = true
  currentWork.operation = operation
  currentWork.courseCode = courseCode
  currentWork.role = role
  currentWork.current = 0
  currentWork.total = total
  currentWork.success = 0
  currentWork.failed = 0
  currentWork.startedAt = new Date().toISOString()
  currentWork.lastItem = null
  currentWork.errors = []
  logger.info(`[PROGRESS] Started ${operation} for ${courseCode}${role ? ` (${role})` : ''}: ${total} items`)
}

function updateWork(itemText, success = true, errorMsg = null) {
  currentWork.current++
  if (success) {
    currentWork.success++
  } else {
    currentWork.failed++
    if (errorMsg) {
      currentWork.errors.push({ text: itemText?.substring(0, 50), error: errorMsg })
      if (currentWork.errors.length > 10) currentWork.errors.shift() // Keep last 10
    }
  }
  currentWork.lastItem = itemText?.substring(0, 40)

  // Log progress every 10 items or on completion
  if (currentWork.current % 10 === 0 || currentWork.current === currentWork.total) {
    logger.info(`[PROGRESS] ${currentWork.current}/${currentWork.total} (${currentWork.success} ok, ${currentWork.failed} failed)`)
  }
}

function endWork() {
  logger.info(`[PROGRESS] Completed: ${currentWork.success}/${currentWork.total} success, ${currentWork.failed} failed`)
  currentWork.active = false
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'phase8-audio-v13', port: PORT })
})

// =============================================================================
// STATUS ENDPOINT - Current work progress
// =============================================================================

app.get('/status', (req, res) => {
  res.json({ ...currentWork })
})

// =============================================================================
// GET PLAN - What audio is missing?
// =============================================================================

// POST /plan - for production-api compatibility (takes courseCode in body)
app.post('/plan', async (req, res) => {
  const { courseCode } = req.body
  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode required' })
  }
  // Redirect to GET handler
  req.params = { courseCode }
  return planHandler(req, res)
})

// GET /plan/:courseCode - direct access
app.get('/plan/:courseCode', planHandler)

async function planHandler(req, res) {
  try {
    const { courseCode } = req.params

    // Get course info
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    // Get what audio we have
    const { data: existingAudio, error: audioError } = await supabase
      .from('course_audio')
      .select('text_normalized, language, role')
      .eq('course_code', courseCode)

    if (audioError) throw audioError

    // Get what phrases we need (from practice phrases)
    const { data: phrases, error: phrasesError } = await supabase
      .from('course_practice_phrases')
      .select('known_text, target_text')
      .eq('course_code', courseCode)

    if (phrasesError) throw phrasesError

    // Build needed list
    const needed = []
    const existingSet = new Set(
      (existingAudio || []).map(a => `${a.text_normalized}|${a.language}|${a.role}`)
    )

    for (const phrase of phrases || []) {
      // Known language audio
      const knownKey = `${phrase.known_text.toLowerCase().trim()}|${course.known_lang}|known`
      if (!existingSet.has(knownKey)) {
        needed.push({ text: phrase.known_text, language: course.known_lang, role: 'known' })
      }

      // Target language audio (target1 and target2)
      for (const role of ['target1', 'target2']) {
        const targetKey = `${phrase.target_text.toLowerCase().trim()}|${course.target_lang}|${role}`
        if (!existingSet.has(targetKey)) {
          needed.push({ text: phrase.target_text, language: course.target_lang, role })
        }
      }
    }

    // Deduplicate
    const uniqueNeeded = [...new Map(
      needed.map(n => [`${n.text}|${n.language}|${n.role}`, n])
    ).values()]

    // Cost estimate (rough: $0.016 per 1000 chars for Azure Neural)
    const totalChars = uniqueNeeded.reduce((sum, n) => sum + n.text.length, 0)
    const estimatedCost = (totalChars / 1000) * 0.016

    res.json({
      courseCode,
      course: {
        displayName: course.display_name,
        knownLang: course.known_lang,
        targetLang: course.target_lang,
        voiceConfig: course.voice_config
      },
      existing: existingAudio?.length || 0,
      missing: uniqueNeeded.length,
      totalPhrases: phrases?.length || 0,
      estimatedCost: `$${estimatedCost.toFixed(2)}`,
      estimatedChars: totalChars,
      breakdown: {
        known: uniqueNeeded.filter(n => n.role === 'known').length,
        target1: uniqueNeeded.filter(n => n.role === 'target1').length,
        target2: uniqueNeeded.filter(n => n.role === 'target2').length
      }
    })
  } catch (error) {
    logger.error('Plan error:', error)
    res.status(500).json({ error: error.message })
  }
}

// =============================================================================
// GET INVENTORY - Audio summary for a course
// =============================================================================

app.get('/inventory/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params

    const { data, error } = await supabase
      .rpc('get_course_audio_summary', { p_course_code: courseCode })

    if (error) throw error

    res.json({
      courseCode,
      inventory: data || []
    })
  } catch (error) {
    logger.error('Inventory error:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// POST GENERATE - Generate missing audio (requires approval)
// =============================================================================

app.post('/generate/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { dryRun = false, limit = 100 } = req.body

    // Get course with voice config
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const voiceConfig = course.voice_config || {}
    if (!voiceConfig.known || !voiceConfig.target1) {
      return res.status(400).json({
        error: 'Course missing voice configuration',
        voiceConfig
      })
    }

    // Get missing audio using RPC
    const { data: phrases, error: phrasesError } = await supabase
      .from('course_practice_phrases')
      .select('known_text, target_text')
      .eq('course_code', courseCode)

    if (phrasesError) throw phrasesError

    // Build needed list (same logic as plan)
    const { data: existingAudio } = await supabase
      .from('course_audio')
      .select('text_normalized, language, role')
      .eq('course_code', courseCode)

    const existingSet = new Set(
      (existingAudio || []).map(a => `${a.text_normalized}|${a.language}|${a.role}`)
    )

    const needed = []
    // Helper to get speed from voice config (everything is a parameter!)
    const getSpeedForRole = (role) => {
      return voiceConfig.voices?.[role]?.settings?.speed || 1.0
    }

    for (const phrase of phrases || []) {
      const knownKey = `${phrase.known_text.toLowerCase().trim()}|${course.known_lang}|known`
      if (!existingSet.has(knownKey)) {
        needed.push({
          text: phrase.known_text,
          language: course.known_lang,
          role: 'known',
          voiceId: voiceConfig.known,
          speed: getSpeedForRole('known')
        })
      }

      for (const role of ['target1', 'target2']) {
        const targetKey = `${phrase.target_text.toLowerCase().trim()}|${course.target_lang}|${role}`
        if (!existingSet.has(targetKey)) {
          needed.push({
            text: phrase.target_text,
            language: course.target_lang,
            role,
            voiceId: voiceConfig[role],
            speed: getSpeedForRole(role)
          })
        }
      }
    }

    // Deduplicate
    const uniqueNeeded = [...new Map(
      needed.map(n => [`${n.text}|${n.language}|${n.role}`, n])
    ).values()].slice(0, limit)

    if (dryRun) {
      return res.json({
        dryRun: true,
        wouldGenerate: uniqueNeeded.length,
        samples: uniqueNeeded.slice(0, 10)
      })
    }

    // Start progress tracking
    startWork('generate', courseCode, uniqueNeeded.length)

    // Process items in parallel with concurrency limit
    logger.info(`Generating ${uniqueNeeded.length} audio files with concurrency=${CONCURRENCY}`)

    const results = { success: 0, failed: 0, errors: [] }

    // Helper to generate a single audio item
    const generateItem = async (item) => {
      // Determine TTS provider from voice config
      // Voice format: azure_es-ES-ElviraNeural or elevenlabs_voiceId
      const [provider, voiceName] = item.voiceId.split('_', 2)

      // Use speed from voice config (everything is a parameter!)
      const speed = item.speed || 1.0

      // Generate TTS audio
      let rawAudioBuffer
      if (provider === 'azure') {
        rawAudioBuffer = await ttsService.generateWithRetry(item.text, 'azure', {
          subscriptionKey: process.env.AZURE_SPEECH_KEY,
          region: process.env.AZURE_SPEECH_REGION || 'westeurope',
          voiceName: voiceName,
          speed
        })
      } else if (provider === 'elevenlabs') {
        rawAudioBuffer = await ttsService.generateWithRetry(item.text, 'elevenlabs', {
          apiKey: process.env.ELEVENLABS_API_KEY,
          voiceId: voiceName,
          speed
        })
      } else {
        throw new Error(`Unknown TTS provider: ${provider}`)
      }

      // Master audio: normalize loudness and extract duration
      const { buffer: masteredBuffer, durationMs } = await masterAudio(rawAudioBuffer)

      // Generate UUID for S3 key (UPPERCASE to match existing S3 convention)
      const audioId = uuidv4().toUpperCase()
      const s3Key = `mastered/${audioId}.mp3`

      // Upload mastered audio to S3
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: masteredBuffer,
        ContentType: 'audio/mpeg'
      }))

      // Insert into course_audio with duration
      const { error: insertError } = await supabase
        .from('course_audio')
        .upsert({
          course_code: courseCode,
          text: item.text,
          text_normalized: item.text.toLowerCase().trim(),
          language: item.language,
          role: item.role,
          voice_id: item.voiceId,
          origin: 'tts',
          s3_key: s3Key,
          duration_ms: durationMs
        }, {
          onConflict: 'course_code,text_normalized,language,role'
        })

      if (insertError) throw insertError

      updateWork(item.text, true)
      logger.info(`Generated: ${item.role} - "${item.text.substring(0, 30)}..."`)
      return { success: true, item }
    }

    // Process in parallel batches
    for (let i = 0; i < uniqueNeeded.length; i += CONCURRENCY) {
      const batch = uniqueNeeded.slice(i, i + CONCURRENCY)
      const batchNum = Math.floor(i / CONCURRENCY) + 1
      const totalBatches = Math.ceil(uniqueNeeded.length / CONCURRENCY)

      logger.info(`Processing batch ${batchNum}/${totalBatches} (${batch.length} items)`)

      const batchResults = await Promise.allSettled(batch.map(generateItem))

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j]
        if (result.status === 'fulfilled') {
          results.success++
        } else {
          results.failed++
          const item = batch[j]
          results.errors.push({
            text: item.text.substring(0, 50),
            role: item.role,
            error: result.reason?.message || 'Unknown error'
          })
          updateWork(item.text, false, result.reason?.message)
          logger.error(`Failed: ${item.role} - "${item.text.substring(0, 30)}...": ${result.reason?.message}`)
        }
      }
    }

    endWork()

    res.json({
      status: 'completed',
      courseCode,
      total: uniqueNeeded.length,
      success: results.success,
      failed: results.failed,
      errors: results.errors.slice(0, 10)
    })

  } catch (error) {
    logger.error('Generate error:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// POST REGENERATE-ROLE - Regenerate all audio for a specific role
// =============================================================================

app.post('/regenerate-role/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { role, dryRun = false, limit = 1000, flaggedOnly = false } = req.body

    if (!role) {
      return res.status(400).json({ error: 'Role is required' })
    }

    // Validate role
    const validRoles = ['known', 'target1', 'target2', 'presentation', 'encouragement', 'instruction']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}` })
    }

    // Get course with voice config
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const voiceConfig = course.voice_config || {}

    // Get the voice settings for this role
    const voiceSettings = voiceConfig.voices?.[role] || {}
    const voiceId = voiceSettings.voiceId || voiceConfig[role]
    const voiceProvider = voiceSettings.provider || 'azure'  // Default to azure

    // Get audio for this role - optionally filter by flagged status
    let audioToRegenerate = []

    if (flaggedOnly) {
      // Get flagged audio IDs from user_feedback table
      const { data: feedback, error: feedbackError } = await supabase
        .from('user_feedback')
        .select('audio_id')
        .eq('code', courseCode)

      if (feedbackError) throw feedbackError

      const flaggedIds = [...new Set(feedback?.map(f => f.audio_id).filter(Boolean) || [])]

      if (flaggedIds.length === 0) {
        return res.json({
          status: 'no_flagged',
          courseCode,
          role,
          flaggedOnly: true,
          message: `No flagged audio found for course`
        })
      }

      // Get audio that matches both role AND is flagged
      const { data: existingAudio, error: audioError } = await supabase
        .from('course_audio')
        .select('id, text, text_normalized, language, role, voice_id, s3_key')
        .eq('course_code', courseCode)
        .eq('role', role)
        .in('id', flaggedIds)
        .limit(limit)

      if (audioError) throw audioError
      audioToRegenerate = existingAudio || []
    } else {
      // Get all audio for this role
      const { data: existingAudio, error: audioError } = await supabase
        .from('course_audio')
        .select('id, text, text_normalized, language, role, voice_id, s3_key')
        .eq('course_code', courseCode)
        .eq('role', role)
        .limit(limit)

      if (audioError) throw audioError
      audioToRegenerate = existingAudio || []
    }

    if (audioToRegenerate.length === 0) {
      return res.json({
        status: 'no_audio',
        courseCode,
        role,
        flaggedOnly,
        message: flaggedOnly
          ? `No flagged audio found for role: ${role}`
          : `No audio found for role: ${role}`
      })
    }

    // Determine language for this role
    const language = role === 'known' || role === 'presentation' || role === 'encouragement' || role === 'instruction'
      ? course.known_lang
      : course.target_lang

    if (dryRun) {
      return res.json({
        dryRun: true,
        courseCode,
        role,
        flaggedOnly,
        voiceId: voiceId || null,
        voiceConfigured: !!voiceId,
        language,
        count: audioToRegenerate.length,
        sample: audioToRegenerate.slice(0, 5).map(a => ({
          text: a.text.substring(0, 50),
          currentVoice: a.voice_id
        })),
        message: voiceId ? null : `Configure voice for "${role}" role before regenerating`
      })
    }

    // Check voice config for actual regeneration
    if (!voiceId) {
      return res.status(400).json({
        error: `No voice configured for role: ${role}`,
        voiceConfig,
        audioCount: audioToRegenerate.length
      })
    }

    // Start progress tracking
    startWork('regenerate-role', courseCode, audioToRegenerate.length, role)

    // Process items in parallel with concurrency limit
    logger.info(`Regenerating ${audioToRegenerate.length} ${role} audio files with concurrency=${CONCURRENCY}`)

    const results = { success: 0, failed: 0, errors: [] }
    // Use speed from voice config (everything is a parameter!)
    const speed = voiceSettings.settings?.speed || 1.0

    // Helper to regenerate a single audio item
    const regenerateItem = async (item) => {
      // Generate TTS audio using provider from voice config
      let rawAudioBuffer
      if (voiceProvider === 'azure') {
        rawAudioBuffer = await ttsService.generateWithRetry(item.text, 'azure', {
          subscriptionKey: process.env.AZURE_SPEECH_KEY,
          region: process.env.AZURE_SPEECH_REGION || 'westeurope',
          voiceName: voiceId,
          speed
        })
      } else if (voiceProvider === 'elevenlabs') {
        rawAudioBuffer = await ttsService.generateWithRetry(item.text, 'elevenlabs', {
          apiKey: process.env.ELEVENLABS_API_KEY,
          voiceId: voiceId,
          speed
        })
      } else {
        throw new Error(`Unknown TTS provider: ${voiceProvider}`)
      }

      // Master audio: normalize loudness and extract duration
      const { buffer: masteredBuffer, durationMs } = await masterAudio(rawAudioBuffer)

      // Generate new UUID for S3 key (UPPERCASE to match existing S3 convention)
      const audioId = uuidv4().toUpperCase()
      const s3Key = `mastered/${audioId}.mp3`

      // Upload mastered audio to S3
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: masteredBuffer,
        ContentType: 'audio/mpeg'
      }))

      // Update course_audio record with duration
      const { error: updateError } = await supabase
        .from('course_audio')
        .update({
          voice_id: voiceId,
          origin: 'tts',
          s3_key: s3Key,
          duration_ms: durationMs
        })
        .eq('id', item.id)

      if (updateError) throw updateError

      updateWork(item.text, true)
      logger.info(`Regenerated: ${role} - "${item.text.substring(0, 30)}..." (${durationMs}ms)`)
      return { success: true, item }
    }

    // Process in parallel batches
    for (let i = 0; i < audioToRegenerate.length; i += CONCURRENCY) {
      const batch = audioToRegenerate.slice(i, i + CONCURRENCY)
      const batchNum = Math.floor(i / CONCURRENCY) + 1
      const totalBatches = Math.ceil(audioToRegenerate.length / CONCURRENCY)

      logger.info(`Processing batch ${batchNum}/${totalBatches} (${batch.length} items)`)

      const batchResults = await Promise.allSettled(batch.map(regenerateItem))

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j]
        if (result.status === 'fulfilled') {
          results.success++
        } else {
          results.failed++
          const item = batch[j]
          results.errors.push({
            text: item.text.substring(0, 50),
            error: result.reason?.message || 'Unknown error'
          })
          updateWork(item.text, false, result.reason?.message)
          logger.error(`Failed: ${role} - "${item.text.substring(0, 30)}...": ${result.reason?.message}`)
        }
      }
    }

    endWork()

    res.json({
      status: 'completed',
      courseCode,
      role,
      voiceId,
      total: audioToRegenerate.length,
      success: results.success,
      failed: results.failed,
      errors: results.errors.slice(0, 10)
    })

  } catch (error) {
    logger.error('Regenerate role error:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// POST INSERT - Insert audio record (after TTS or recording)
// =============================================================================

app.post('/insert', async (req, res) => {
  try {
    const {
      courseCode,
      text,
      language,
      role,
      voiceId,
      origin,
      s3Key,
      durationMs
    } = req.body

    if (!courseCode || !text || !language || !role || !voiceId || !origin || !s3Key) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const { data, error } = await supabase
      .from('course_audio')
      .upsert({
        course_code: courseCode,
        text,
        text_normalized: text.toLowerCase().trim(),
        language,
        role,
        voice_id: voiceId,
        origin,
        s3_key: s3Key,
        duration_ms: durationMs
      }, {
        onConflict: 'course_code,text_normalized,language,role'
      })
      .select()
      .single()

    if (error) throw error

    res.json({ success: true, audio: data })
  } catch (error) {
    logger.error('Insert error:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// LANGUAGE NAMES MAPPING
// =============================================================================

const LANG_NAMES = {
  'eng': 'English',
  'spa': 'Spanish',
  'fra': 'French',
  'deu': 'German',
  'ita': 'Italian',
  'por': 'Portuguese',
  'cmn': 'Chinese',
  'zho': 'Chinese',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'ara': 'Arabic',
  'cym': 'Welsh',
  'gle': 'Irish',
  'gla': 'Scottish Gaelic',
  'nld': 'Dutch',
  'rus': 'Russian'
}

// =============================================================================
// POST REGENERATE-PRESENTATIONS - Regenerate presentation text for a course
// =============================================================================

app.post('/regenerate-presentations/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { dryRun = true, regenerateAudio = false } = req.body

    logger.info(`Regenerating presentations for ${courseCode} (dryRun=${dryRun})`)

    // Get course info
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const knownLang = course.known_lang
    const targetLang = course.target_lang
    const targetLangName = LANG_NAMES[targetLang] || targetLang

    // Get template for this known language
    const { data: templates, error: templateError } = await supabase
      .from('presentation_templates')
      .select('*')
      .eq('known_lang', knownLang)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)

    if (templateError) throw templateError

    // Fall back to default English template if no specific one found
    let template = templates?.[0]?.template
    if (!template) {
      template = "The {target_lang_name} for '{known}', as in '{seed}', is:"
      logger.warn(`No template found for ${knownLang}, using default English`)
    }

    logger.info(`Using template: ${template}`)

    // Get all LEGOs for this course
    const { data: legos, error: legosError } = await supabase
      .from('course_legos')
      .select('lego_id, known_text, target_text, seed_number')
      .eq('course_code', courseCode)

    if (legosError) throw legosError

    if (!legos || legos.length === 0) {
      return res.json({
        success: true,
        message: 'No LEGOs found for this course',
        count: 0
      })
    }

    // Get all seed sentences for context
    const seedNumbers = [...new Set(legos.map(l => l.seed_number).filter(Boolean))]

    let seedMap = {}
    if (seedNumbers.length > 0) {
      const { data: seeds, error: seedsError } = await supabase
        .from('course_seeds')
        .select('seed_number, known_text')
        .eq('course_code', courseCode)
        .in('seed_number', seedNumbers)

      if (!seedsError && seeds) {
        seedMap = Object.fromEntries(seeds.map(s => [s.seed_number, s.known_text]))
      }
    }

    // Generate presentation text for each LEGO
    // Short template (no "as in" context) for alternating in early seeds
    const shortTemplate = template.replace(/, as in '\{seed\}'|，如"\{seed\}"|, fel yn '\{seed\}'|, como en '\{seed\}'/g, '')

    const presentations = []
    for (const lego of legos) {
      const seedText = seedMap[lego.seed_number] || lego.known_text

      // Parse lego_id to get lego_index (e.g., "S0001L03" → 3)
      const legoIndexMatch = lego.lego_id.match(/L(\d+)$/)
      const legoIndex = legoIndexMatch ? parseInt(legoIndexMatch[1], 10) : 1

      // For first 2 seeds, alternate: odd LEGOs get full template, even get short
      const useShortTemplate = lego.seed_number <= 2 && legoIndex % 2 === 0
      const activeTemplate = useShortTemplate ? shortTemplate : template

      // Fill in template
      let presText = activeTemplate
        .replace('{target_lang_name}', targetLangName)
        .replace('{known}', lego.known_text)
        .replace('{seed}', seedText)

      presentations.push({
        lego_id: lego.lego_id,
        known: lego.known_text,
        target: lego.target_text,
        seed: seedText,
        seed_number: lego.seed_number,
        lego_index: legoIndex,
        uses_short_template: useShortTemplate,
        presentation_text: presText
      })
    }

    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        courseCode,
        template,
        shortTemplate,
        targetLangName,
        count: presentations.length,
        sample: presentations.slice(0, 10)  // Show first 10 to see alternation
      })
    }

    // Actually update/insert presentation audio records AND lego_introductions
    const voiceConfig = course.voice_config || {}
    const presentationVoiceId = voiceConfig.presentation || `azure_${knownLang === 'eng' ? 'en-GB-SoniaNeural' : 'en-GB-SoniaNeural'}`

    let updated = 0
    let introductions = 0
    let errors = []

    for (const pres of presentations) {
      try {
        // Generate placeholder s3_key (UPPERCASE to match existing S3 convention)
        const placeholderUuid = uuidv4().toUpperCase()
        const placeholderS3Key = `pending/${placeholderUuid}.mp3`
        const textNormalized = pres.presentation_text.toLowerCase().trim()

        // Upsert into course_audio
        const { error: upsertError } = await supabase
          .from('course_audio')
          .upsert({
            course_code: courseCode,
            text: pres.presentation_text,
            text_normalized: textNormalized,
            language: knownLang,
            role: 'presentation',
            voice_id: presentationVoiceId,
            origin: 'tts',
            s3_key: placeholderS3Key
          }, {
            onConflict: 'course_code,text_normalized,language,role',
            ignoreDuplicates: false
          })

        if (upsertError) {
          errors.push({ lego_id: pres.lego_id, error: upsertError.message })
          continue
        }

        // Query for the ID explicitly (upsert doesn't reliably return ID on conflict)
        const { data: audioRecord, error: selectError } = await supabase
          .from('course_audio')
          .select('id')
          .eq('course_code', courseCode)
          .eq('text_normalized', textNormalized)
          .eq('language', knownLang)
          .eq('role', 'presentation')
          .single()

        if (selectError || !audioRecord?.id) {
          errors.push({ lego_id: pres.lego_id, error: 'Could not find audio record after upsert' })
          continue
        }

        updated++
        const presentationAudioId = audioRecord.id

        // Upsert into lego_introductions (only presentation_audio_id needed)
        // Target1/target2 audio derived from course_audio by LEGO's target_text at playback
        const { error: introError } = await supabase
          .from('lego_introductions')
          .upsert({
            lego_id: pres.lego_id,
            course_code: courseCode,
            presentation_audio_id: presentationAudioId,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'lego_id,course_code'
          })

        if (!introError) {
          introductions++
        }
      } catch (err) {
        errors.push({ lego_id: pres.lego_id, error: err.message })
      }
    }

    res.json({
      success: true,
      dryRun: false,
      courseCode,
      template,
      targetLangName,
      total: presentations.length,
      updated,
      introductions,
      errors: errors.slice(0, 10),
      message: `Presentation text updated. ${introductions} lego_introductions created. Run regenerate-role with role=presentation to generate audio.`
    })

  } catch (error) {
    logger.error('Regenerate presentations error:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  logger.info(`Phase 8 Audio Service (v13) running on port ${PORT}`)
  logger.info(`Supabase: ${process.env.SUPABASE_URL ? 'configured' : 'NOT configured'}`)
  logger.info(`S3 Bucket: ${S3_BUCKET}`)
})

module.exports = app
