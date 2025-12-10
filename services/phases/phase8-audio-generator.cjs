/**
 * Phase 8: Audio Generator Service
 *
 * Generates TTS audio for all unique phrases in lego_baskets.json.
 * Uses Supabase as the source of truth for audio samples.
 *
 * Features:
 * - Extracts unique audio needs from baskets
 * - Checks Supabase to skip existing audio
 * - Generates TTS via Azure or ElevenLabs
 * - Uploads to S3
 * - Records in Supabase
 * - Tracks course audio usage
 * - Reports real-time progress via WebSocket
 *
 * Port: 3465 (BASE_PORT + 9)
 *
 * @version 1.0.0
 */

const express = require('express')
const path = require('path')
const fs = require('fs-extra')
const crypto = require('crypto')
const os = require('os')
const createLogger = require('../shared/logger.cjs')

const logger = createLogger('Phase8')

const db = require('../supabase-client.cjs')
const audioProcessor = require('../audio-processor.cjs')

// TTS services (may not exist yet - graceful fallback)
let azureTTS, elevenLabsTTS, s3Service

try {
  azureTTS = require('../azure-tts-service.cjs')
} catch (e) {
  logger.warn('Azure TTS service not available')
}

try {
  elevenLabsTTS = require('../elevenlabs-service.cjs')
} catch (e) {
  logger.warn('ElevenLabs service not available')
}

try {
  s3Service = require('../s3-production-service.cjs')
} catch (e) {
  logger.warn('S3 production service not available')
}

const app = express()
const PORT = process.env.PORT || 3465

app.use(express.json())

// Active jobs tracking
const activeJobs = new Map()

/**
 * Extract unique audio needs from lego_baskets.json
 * Returns array of { text, lang, role, seedId, legoId }
 *
 * @param {Object} baskets - The lego_baskets.json content
 * @param {string} targetLang - Target language code
 * @param {string} knownLang - Known language code
 * @returns {Array}
 */
function extractAudioNeeds(baskets, targetLang, knownLang) {
  const needs = []
  const seen = new Set()

  for (const [seedId, seedData] of Object.entries(baskets)) {
    // Each seed has baskets with cycles
    for (const basket of seedData.baskets || []) {
      for (const cycle of basket.cycles || []) {
        // Target language samples (target1, target2)
        if (cycle.target) {
          const key1 = `${cycle.target}|${targetLang}|target1`
          if (!seen.has(key1)) {
            seen.add(key1)
            needs.push({
              text: cycle.target,
              lang: targetLang,
              role: 'target1',
              seedId,
              legoId: basket.lego_id
            })
          }
          // target2 is same text, different voice
          const key2 = `${cycle.target}|${targetLang}|target2`
          if (!seen.has(key2)) {
            seen.add(key2)
            needs.push({
              text: cycle.target,
              lang: targetLang,
              role: 'target2',
              seedId,
              legoId: basket.lego_id
            })
          }
        }

        // Source language (known)
        if (cycle.source) {
          const key = `${cycle.source}|${knownLang}|source`
          if (!seen.has(key)) {
            seen.add(key)
            needs.push({
              text: cycle.source,
              lang: knownLang,
              role: 'source',
              seedId,
              legoId: basket.lego_id
            })
          }
        }
      }
    }
  }

  return needs
}

/**
 * Get cadence for role
 * Target roles use slow cadence for learner clarity
 * Source uses natural cadence
 *
 * @param {string} role
 * @returns {string}
 */
function getCadenceForRole(role) {
  if (role === 'source') return 'natural'
  return 'slow'
}

/**
 * Generate audio for a single sample using TTS
 *
 * @param {string} text
 * @param {string} lang
 * @param {string} role
 * @param {string} voiceId
 * @param {string} cadence
 * @returns {Promise<{audioBuffer: Buffer, ttsEngine: string}>}
 */
async function generateSingleAudio(text, lang, role, voiceId, cadence) {
  const voice = await db.getVoice(voiceId)

  if (!voice) {
    throw new Error(`Voice not found: ${voiceId}`)
  }

  let audioBuffer
  let ttsEngine = voice.tts_engine

  if (voice.type === 'tts' && voice.tts_engine === 'azure') {
    if (!azureTTS) throw new Error('Azure TTS service not available')

    // Azure TTS synthesize
    const rate = cadence === 'slow' ? 0.8 : 1.0
    audioBuffer = await azureTTS.synthesize(text, voiceId, { rate })

  } else if (voice.type === 'tts' && voice.tts_engine === 'elevenlabs') {
    if (!elevenLabsTTS) throw new Error('ElevenLabs service not available')

    // ElevenLabs synthesize
    audioBuffer = await elevenLabsTTS.synthesize(text, voiceId, { stability: 0.5 })

  } else if (voice.type === 'human') {
    throw new Error(`Cannot generate TTS for human voice: ${voiceId}`)

  } else {
    throw new Error(`Unsupported voice type: ${voice.type}`)
  }

  return { audioBuffer, ttsEngine }
}

/**
 * POST /generate
 *
 * Start audio generation for a course
 *
 * Body: {
 *   courseCode: "spa_for_eng",
 *   voices: {
 *     source: "azure_en-GB-BellaNeural",
 *     target1: "azure_es-ES-ElviraNeural",
 *     target2: "azure_es-ES-AlvaroNeural"
 *   }
 * }
 */
app.post('/generate', async (req, res) => {
  const { courseCode, voices, dryRun = false } = req.body

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode required' })
  }

  // Check Supabase is initialized
  if (!db.isInitialized()) {
    return res.status(503).json({
      error: 'Supabase not initialized',
      hint: 'Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.automation'
    })
  }

  // Check for active job
  if (activeJobs.has(courseCode)) {
    return res.status(409).json({
      error: 'Generation already in progress',
      jobId: activeJobs.get(courseCode).jobId
    })
  }

  const jobId = `${courseCode}-${Date.now()}`
  const job = {
    jobId,
    courseCode,
    status: 'running',
    startedAt: new Date().toISOString(),
    dryRun,
    progress: { current: 0, total: 0, skipped: 0, generated: 0, failed: 0 }
  }
  activeJobs.set(courseCode, job)

  // Return immediately, process in background
  res.json({ success: true, jobId, message: dryRun ? 'Dry run started' : 'Generation started' })

  // Background processing
  try {
    // Load lego_baskets.json
    const vfsRoot = process.env.VFS_ROOT || './public/vfs/courses'
    const basketsPath = path.join(vfsRoot, courseCode, 'lego_baskets.json')

    if (!await fs.pathExists(basketsPath)) {
      job.status = 'failed'
      job.error = `lego_baskets.json not found at ${basketsPath}`
      return
    }

    const baskets = await fs.readJson(basketsPath)

    // Parse course code for languages (e.g., spa_for_eng)
    const parts = courseCode.split('_')
    let targetLang, knownLang

    if (parts.length === 3 && parts[1] === 'for') {
      // Standard format: spa_for_eng
      targetLang = parts[0]
      knownLang = parts[2]
    } else {
      // Fallback
      targetLang = parts[0] || 'spa'
      knownLang = parts[parts.length - 1] || 'eng'
    }

    // Extract audio needs
    const needs = extractAudioNeeds(baskets, targetLang, knownLang)
    job.progress.total = needs.length

    logger.log(`${courseCode}: ${needs.length} audio samples needed`)

    // Get voice config
    const voiceConfig = voices || await db.getCourseVoices(courseCode) || {}

    // Validate voices
    if (!voiceConfig.source || !voiceConfig.target1 || !voiceConfig.target2) {
      job.status = 'failed'
      job.error = 'Missing voice configuration. Required: source, target1, target2'
      return
    }

    // Process each need
    for (let i = 0; i < needs.length; i++) {
      const need = needs[i]
      const voiceId = voiceConfig[need.role]

      if (!voiceId) {
        logger.warn(`No voice configured for role: ${need.role}`)
        job.progress.failed++
        continue
      }

      const cadence = getCadenceForRole(need.role)
      const uuid = db.generateAudioUUID(voiceId, need.text, need.lang, need.role, cadence)
      const hashInput = db.getHashInput(voiceId, need.text, need.lang, need.role, cadence)

      // Check if exists
      const exists = await db.audioExists(uuid)
      if (exists) {
        job.progress.skipped++
        job.progress.current = i + 1

        // Still record usage (upsert is safe)
        await db.recordCourseUsage(courseCode, uuid, 'basket', need.seedId, need.legoId)
        continue
      }

      // Dry run mode - just count what would be generated
      if (dryRun) {
        job.progress.generated++
        job.progress.current = i + 1
        continue
      }

      // Generate audio
      try {
        const { audioBuffer, ttsEngine } = await generateSingleAudio(
          need.text, need.lang, need.role, voiceId, cadence
        )

        // Calculate metadata
        const checksum = crypto.createHash('md5').update(audioBuffer).digest('hex')
        const s3Key = `mastered/${uuid}.mp3`

        // Upload to S3
        if (s3Service) {
          await s3Service.uploadAudio(uuid, audioBuffer)
        } else {
          logger.warn(`S3 service not available, skipping upload for ${uuid}`)
        }

        // Extract audio duration
        let durationMs = null
        try {
          // Write buffer to temporary file for duration extraction
          const tempFile = path.join(os.tmpdir(), `${uuid}-temp.mp3`)
          await fs.writeFile(tempFile, audioBuffer)

          // Get duration in seconds using sox
          const durationSec = await audioProcessor.getAudioDuration(tempFile)
          durationMs = Math.round(durationSec * 1000) // Convert to milliseconds

          // Cleanup temp file
          await fs.remove(tempFile)

          logger.log(`Extracted duration for ${uuid}: ${durationMs}ms`)
        } catch (durationErr) {
          logger.warn(`Failed to extract duration for ${uuid}: ${durationErr.message}`)
          // Continue without duration - not critical
        }

        // Insert into Supabase
        await db.insertAudioSample({
          uuid,
          voiceId,
          text: need.text,
          lang: need.lang,
          role: need.role,
          cadence,
          s3Bucket: 'popty-bach-lfs',
          s3Key,
          durationMs,
          fileSizeBytes: audioBuffer.length,
          checksumMd5: checksum,
          source: `tts_${ttsEngine}`,
          ttsEngine,
          ttsVoiceVariant: voiceId,
          hashInput
        })

        // Record course usage
        await db.recordCourseUsage(courseCode, uuid, 'basket', need.seedId, need.legoId)

        job.progress.generated++
        logger.log(`Generated ${i + 1}/${needs.length}: ${uuid}`)

      } catch (err) {
        logger.error(`Failed to generate ${uuid}:`, err.message)
        job.progress.failed++
      }

      job.progress.current = i + 1

      // Emit progress (if production API is running)
      emitProgress(courseCode, job.progress)
    }

    job.status = 'complete'
    job.completedAt = new Date().toISOString()

    logger.log(`${courseCode} complete:`, job.progress)

    // Emit generation_complete event
    emitGenerationComplete(courseCode, job.progress)

  } catch (err) {
    job.status = 'failed'
    job.error = err.message
    logger.error(`${courseCode} failed:`, err)
  }
})

/**
 * POST /plan
 *
 * Show what would be generated without actually generating
 * Returns counts and sample of what needs generation
 */
app.post('/plan', async (req, res) => {
  const { courseCode, voices } = req.body

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode required' })
  }

  try {
    const vfsRoot = process.env.VFS_ROOT || './public/vfs/courses'
    const basketsPath = path.join(vfsRoot, courseCode, 'lego_baskets.json')

    if (!await fs.pathExists(basketsPath)) {
      return res.status(404).json({ error: 'lego_baskets.json not found' })
    }

    const baskets = await fs.readJson(basketsPath)

    // Parse course code
    const parts = courseCode.split('_')
    const targetLang = parts[0]
    const knownLang = parts[parts.length - 1]

    // Extract needs
    const needs = extractAudioNeeds(baskets, targetLang, knownLang)

    // Get voice config
    const voiceConfig = voices || await db.getCourseVoices(courseCode) || {}

    // Check which exist
    const results = {
      total: needs.length,
      existing: 0,
      toGenerate: 0,
      missingVoice: 0,
      samples: []
    }

    for (const need of needs.slice(0, 100)) { // Check first 100 for plan
      const voiceId = voiceConfig[need.role]

      if (!voiceId) {
        results.missingVoice++
        continue
      }

      const cadence = getCadenceForRole(need.role)
      const uuid = db.generateAudioUUID(voiceId, need.text, need.lang, need.role, cadence)

      const exists = db.isInitialized() ? await db.audioExists(uuid) : false

      if (exists) {
        results.existing++
      } else {
        results.toGenerate++
        if (results.samples.length < 10) {
          results.samples.push({
            text: need.text,
            lang: need.lang,
            role: need.role,
            uuid
          })
        }
      }
    }

    res.json({
      success: true,
      courseCode,
      plan: results,
      voices: voiceConfig
    })

  } catch (err) {
    logger.error('Plan error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /status/:courseCode
 *
 * Get status of active or completed job
 */
app.get('/status/:courseCode', (req, res) => {
  const { courseCode } = req.params
  const job = activeJobs.get(courseCode)

  if (!job) {
    return res.status(404).json({ error: 'No job found' })
  }

  res.json(job)
})

/**
 * DELETE /cancel/:courseCode
 *
 * Cancel an active job (marks it for cancellation)
 */
app.delete('/cancel/:courseCode', (req, res) => {
  const { courseCode } = req.params
  const job = activeJobs.get(courseCode)

  if (!job) {
    return res.status(404).json({ error: 'No job found' })
  }

  if (job.status !== 'running') {
    return res.status(400).json({ error: 'Job is not running' })
  }

  job.status = 'cancelled'
  job.cancelledAt = new Date().toISOString()

  res.json({ success: true, message: 'Job marked for cancellation' })
})

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Phase 8 Audio Generator',
    port: PORT,
    timestamp: new Date().toISOString(),
    supabase: db.isInitialized() ? 'connected' : 'not configured',
    azureTts: azureTTS ? 'available' : 'not available',
    elevenLabs: elevenLabsTTS ? 'available' : 'not available',
    s3: s3Service ? 'available' : 'not available'
  })
})

/**
 * Emit progress to Production API WebSocket
 *
 * @param {string} courseCode
 * @param {Object} progress
 */
async function emitProgress(courseCode, progress) {
  const productionApiUrl = process.env.PRODUCTION_API_URL || 'http://localhost:3470'

  try {
    const fetch = require('node-fetch')
    await fetch(`${productionApiUrl}/api/production/internal/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseCode,
        event: 'pipeline_progress',
        data: {
          phase: 'audio_generation',
          ...progress,
          percentage: progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
        }
      })
    })
  } catch (e) {
    // Ignore - production API might not be running
  }
}

/**
 * Emit generation complete event to Production API WebSocket
 *
 * @param {string} courseCode
 * @param {Object} progress - Final progress stats
 */
async function emitGenerationComplete(courseCode, progress) {
  const productionApiUrl = process.env.PRODUCTION_API_URL || 'http://localhost:3470'

  try {
    const fetch = require('node-fetch')
    await fetch(`${productionApiUrl}/api/production/internal/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseCode,
        event: 'generation_complete',
        data: {
          phase: 'audio_generation',
          completedAt: new Date().toISOString(),
          total: progress.total,
          generated: progress.generated,
          skipped: progress.skipped,
          failed: progress.failed,
          percentage: 100
        }
      })
    })
  } catch (e) {
    // Ignore - production API might not be running
  }
}

// Start server
app.listen(PORT, () => {
  logger.log(`Audio Generator running on port ${PORT}`)
  logger.log(`Supabase: ${db.isInitialized() ? 'connected' : 'not configured'}`)
})

module.exports = { app, extractAudioNeeds, getCadenceForRole }
