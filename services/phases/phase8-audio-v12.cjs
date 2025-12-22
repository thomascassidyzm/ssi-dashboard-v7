#!/usr/bin/env node
/**
 * Phase 8: Audio Generator (v12.1 - APML Registry Schema)
 *
 * APML Registry Architecture:
 * - Writes to audio_samples table (canonical audio registry)
 * - Writes to lego_introductions for combined intro audio
 * - Uses UUID v4 for new records, dedupes on text+voice+role+cadence
 * - Clean separation: extract → check → generate → upload → link
 *
 * Endpoints:
 *   POST /generate     - Generate audio for a course
 *   POST /plan         - Preview what would be generated (dry run)
 *   GET  /status/:code - Check generation status
 *   DELETE /cancel/:code - Cancel active generation
 *   POST /assemble-introductions - Assemble intro audio
 *   GET  /health       - Health check
 *
 * Port: 3465
 */

const express = require('express')
const cors = require('cors')
const path = require('path')
const os = require('os')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
const { v4: uuidv4 } = require('uuid')

// Environment
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PHASE8_PORT || 3465

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// =============================================================================
// TTS SERVICE
// =============================================================================

let ttsService = null
try {
  ttsService = require('../tts-service.cjs')
  console.log('[Phase8-v12] TTS service loaded')
} catch (err) {
  console.warn('[Phase8-v12] TTS service not available:', err.message)
}

// =============================================================================
// S3 SERVICE
// =============================================================================

let s3Service = null
try {
  s3Service = require('../s3-service.cjs')
  console.log('[Phase8-v12] S3 service loaded')
} catch (err) {
  console.warn('[Phase8-v12] S3 service not available:', err.message)
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

const activeJobs = new Map()  // courseCode -> { status, progress, cancel }

// =============================================================================
// LOGGING
// =============================================================================

const logger = {
  log: (...args) => console.log(`[Phase8-v12]`, ...args),
  warn: (...args) => console.warn(`[Phase8-v12]`, ...args),
  error: (...args) => console.error(`[Phase8-v12]`, ...args),
}

// =============================================================================
// AUDIO_SAMPLES REGISTRY HELPERS
// =============================================================================

/**
 * Normalize text for deduplication
 */
function normalizeText(text) {
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Find or create audio sample in audio_samples table
 * This is the APML-compliant replacement for find_or_create_audio RPC
 */
async function findOrCreateAudioSample({ text, lang, role, voiceId, cadence }) {
  const textNormalized = normalizeText(text)

  // Try to find existing
  const { data: existing } = await supabase
    .from('audio_samples')
    .select('uuid, s3_key')
    .eq('text_normalized', textNormalized)
    .eq('lang', lang)
    .eq('role', role)
    .eq('voice_id', voiceId)
    .eq('cadence', cadence)
    .limit(1)
    .single()

  if (existing) {
    return { uuid: existing.uuid, s3_key: existing.s3_key, created: false }
  }

  // Create new record
  const uuid = uuidv4().toUpperCase()
  const { error } = await supabase
    .from('audio_samples')
    .insert({
      uuid,
      text,
      text_normalized: textNormalized,
      lang,
      role,
      voice_id: voiceId,
      cadence,
      source: 'pending',
      status: 'pending'
    })

  if (error) {
    // Handle race condition - another process may have created it
    if (error.code === '23505') { // unique violation
      const { data: retry } = await supabase
        .from('audio_samples')
        .select('uuid, s3_key')
        .eq('text_normalized', textNormalized)
        .eq('lang', lang)
        .eq('role', role)
        .eq('voice_id', voiceId)
        .eq('cadence', cadence)
        .limit(1)
        .single()

      if (retry) {
        return { uuid: retry.uuid, s3_key: retry.s3_key, created: false }
      }
    }
    throw new Error(`Failed to create audio sample: ${error.message}`)
  }

  return { uuid, s3_key: null, created: true }
}

/**
 * Update audio sample with S3 info after upload
 */
async function updateAudioSampleS3({ uuid, s3Bucket, s3Key, durationMs, fileSizeBytes, source }) {
  const { error } = await supabase
    .from('audio_samples')
    .update({
      s3_bucket: s3Bucket,
      s3_key: s3Key,
      duration_ms: durationMs,
      file_size_bytes: fileSizeBytes,
      source: source || 'azure',
      status: 'ready'
    })
    .eq('uuid', uuid)

  if (error) {
    logger.error(`Failed to update audio_samples for ${uuid}:`, error.message)
  }
}

/**
 * Create or update lego_introductions record
 */
async function upsertLegoIntroduction({ courseCode, legoId, audioUuid, durationMs }) {
  const { error } = await supabase
    .from('lego_introductions')
    .upsert({
      course_code: courseCode,
      lego_id: legoId,
      audio_uuid: audioUuid,
      duration_ms: durationMs || 0,
      version: 1
    }, {
      onConflict: 'course_code,lego_id'
    })

  if (error) {
    logger.error(`Failed to upsert lego_introductions for ${legoId}:`, error.message)
  }
}

// =============================================================================
// CORE: EXTRACT AUDIO NEEDS
// =============================================================================

/**
 * Extract all audio needs from course_practice_phrases
 * Returns array of { text, language, role, voiceId, cadence }
 */
async function extractAudioNeeds(courseCode) {
  logger.log(`Extracting audio needs for ${courseCode}`)

  // Get course with voice configuration
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('known_voice, target1_voice, target2_voice, voice_config')
    .eq('course_code', courseCode)
    .single()

  if (courseErr) throw new Error(`Failed to get course: ${courseErr.message}`)
  if (!course) throw new Error(`Course not found: ${courseCode}`)

  // Build voice lookup from course config
  // Voice IDs in courses table may or may not have azure_ prefix
  // Check voices table to find the correct format
  const voiceConfig = {}

  async function resolveVoiceId(voiceName) {
    if (!voiceName) return null

    // Try exact match first
    let { data } = await supabase
      .from('voices')
      .select('voice_id')
      .eq('voice_id', voiceName)
      .single()

    if (data) return data.voice_id

    // Try with azure_ prefix
    const prefixed = `azure_${voiceName}`
    ;({ data } = await supabase
      .from('voices')
      .select('voice_id')
      .eq('voice_id', prefixed)
      .single())

    if (data) return data.voice_id

    // Try without azure_ prefix if it has one
    if (voiceName.startsWith('azure_')) {
      const unprefixed = voiceName.replace('azure_', '')
      ;({ data } = await supabase
        .from('voices')
        .select('voice_id')
        .eq('voice_id', unprefixed)
        .single())
      if (data) return data.voice_id
    }

    logger.warn(`Voice not found in registry: ${voiceName}`)
    return voiceName  // Return as-is, will fail at generation time
  }

  if (course.target1_voice) {
    const vc = course.voice_config?.voices?.target1 || {}
    voiceConfig.target1 = {
      voiceId: await resolveVoiceId(course.target1_voice),
      cadence: vc.settings?.speed < 1 ? 'slow' : 'natural'
    }
  }

  if (course.target2_voice) {
    const vc = course.voice_config?.voices?.target2 || {}
    voiceConfig.target2 = {
      voiceId: await resolveVoiceId(course.target2_voice),
      cadence: 'natural'
    }
  }

  if (course.known_voice) {
    voiceConfig.known = {
      voiceId: await resolveVoiceId(course.known_voice),
      cadence: 'natural'
    }
  }

  // Presentation voice defaults to known voice
  const presentationVoice = course.voice_config?.voices?.presentation?.voiceId || course.known_voice
  if (presentationVoice) {
    voiceConfig.presentation = {
      voiceId: await resolveVoiceId(presentationVoice),
      cadence: 'natural'
    }
  }

  if (!voiceConfig.target1 && !voiceConfig.known) {
    throw new Error(`No voices configured for ${courseCode}`)
  }

  logger.log(`Voice config:`, voiceConfig)

  // Get practice phrases
  const { data: phrases, error: phraseErr } = await supabase
    .from('course_practice_phrases')
    .select('known_text, target_text, seed_number, lego_index, position')
    .eq('course_code', courseCode)
    .order('seed_number')
    .order('lego_index')
    .order('position')

  if (phraseErr) throw new Error(`Failed to get phrases: ${phraseErr.message}`)
  if (!phrases?.length) throw new Error(`No phrases found for ${courseCode}`)

  logger.log(`Found ${phrases.length} practice phrases`)

  // Determine languages from course code
  const [targetLang, , knownLang] = courseCode.split('_')  // e.g., "zho_for_eng" -> zho, for, eng

  // Build unique audio needs
  const needsMap = new Map()  // key -> need

  for (const phrase of phrases) {
    const context = `S${String(phrase.seed_number).padStart(4, '0')}L${String(phrase.lego_index).padStart(2, '0')}P${phrase.position}`

    // Target language needs (target1 = slow, target2 = natural typically)
    if (phrase.target_text && voiceConfig.target1) {
      const key = `${phrase.target_text}|${targetLang}|target1`
      if (!needsMap.has(key)) {
        needsMap.set(key, {
          text: phrase.target_text,
          language: targetLang,
          role: 'target1',
          voiceId: voiceConfig.target1.voiceId,
          cadence: voiceConfig.target1.cadence || 'slow',
          contexts: [context]
        })
      } else {
        needsMap.get(key).contexts.push(context)
      }
    }

    if (phrase.target_text && voiceConfig.target2) {
      const key = `${phrase.target_text}|${targetLang}|target2`
      if (!needsMap.has(key)) {
        needsMap.set(key, {
          text: phrase.target_text,
          language: targetLang,
          role: 'target2',
          voiceId: voiceConfig.target2.voiceId,
          cadence: voiceConfig.target2.cadence || 'natural',
          contexts: [context]
        })
      } else {
        needsMap.get(key).contexts.push(context)
      }
    }

    // Known language (typically English)
    if (phrase.known_text && voiceConfig.known) {
      const key = `${phrase.known_text}|${knownLang}|known`
      if (!needsMap.has(key)) {
        needsMap.set(key, {
          text: phrase.known_text,
          language: knownLang,
          role: 'known',
          voiceId: voiceConfig.known.voiceId,
          cadence: voiceConfig.known.cadence || 'natural',
          contexts: [context]
        })
      } else {
        needsMap.get(key).contexts.push(context)
      }
    }
  }

  // Extract introduction needs if presentation voice is available
  let introCount = 0
  if (voiceConfig.presentation) {
    const introNeeds = await extractIntroductionNeeds(courseCode, voiceConfig.presentation, knownLang)
    for (const intro of introNeeds) {
      const key = `${intro.text}|${knownLang}|introduction`
      if (!needsMap.has(key)) {
        needsMap.set(key, intro)
        introCount++
      }
    }
    logger.log(`Added ${introCount} introduction audio needs`)
  }

  const needs = Array.from(needsMap.values())
  logger.log(`Extracted ${needs.length} unique audio needs (${needs.length - introCount} phrases + ${introCount} introductions)`)

  return { needs, voiceConfig, phraseCount: phrases.length, introCount }
}

/**
 * Extract introduction audio needs from introductions.json or database
 */
async function extractIntroductionNeeds(courseCode, presentationVoice, knownLang) {
  const introNeeds = []

  // Try to load from VFS first (legacy JSON file)
  try {
    const introPath = path.join(__dirname, '../../public/vfs/courses', courseCode, 'introductions.json')
    if (fs.existsSync(introPath)) {
      const introData = JSON.parse(fs.readFileSync(introPath, 'utf8'))
      const presentations = introData.presentations || {}

      for (const [legoId, presentation] of Object.entries(presentations)) {
        // Handle both old format (string with {target1}) and new format (object with text field)
        let introText = typeof presentation === 'string' ? presentation : presentation.text

        // Strip out {target1} and {target2} tags - we just want the spoken script
        // Old format: "The Chinese for 'I want', as in 'I want to speak', is: ... {target1}'我想' ... {target2}'我想'"
        // We extract just: "The Chinese for 'I want', as in 'I want to speak', is:"
        introText = introText
          .replace(/\s*\.\.\.\s*\{target[12]\}[^.]*$/g, '')  // Remove trailing target refs
          .replace(/\{target[12]\}[^{]*/g, '')  // Remove inline target refs
          .replace(/\s+/g, ' ')  // Normalize whitespace
          .trim()

        if (introText && introText.length > 5) {
          introNeeds.push({
            text: introText,
            language: knownLang,
            role: 'introduction',
            voiceId: presentationVoice.voiceId,
            cadence: presentationVoice.cadence || 'natural',
            contexts: [legoId]
          })
        }
      }

      logger.log(`Loaded ${introNeeds.length} introductions from JSON file`)
    }
  } catch (err) {
    logger.warn(`Could not load introductions.json: ${err.message}`)
  }

  return introNeeds
}

// =============================================================================
// CORE: CHECK WHAT NEEDS GENERATION
// =============================================================================

/**
 * FAST check for planning - batch query to see what audio already exists
 * Does NOT create records, just checks existence in audio_samples
 */
async function checkAudioStatusFast(needs) {
  logger.log(`Fast-checking audio status for ${needs.length} needs`)

  // Query existing audio_samples that have s3_key set (already generated)
  const { data: existingAudio, error } = await supabase
    .from('audio_samples')
    .select('uuid, text_normalized, lang, voice_id, cadence, s3_key')
    .not('s3_key', 'is', null)

  if (error) {
    logger.warn(`Could not query existing audio: ${error.message}`)
    // Fall back to assuming all need generation
    return {
      results: needs.map(n => ({ ...n, needsGeneration: true })),
      needsGeneration: needs
    }
  }

  // Build lookup set of existing audio (normalized text + lang + voice + cadence)
  const existingSet = new Set()
  for (const audio of existingAudio || []) {
    const key = `${audio.text_normalized}|${audio.lang}|${audio.voice_id}|${audio.cadence}`
    existingSet.add(key)
  }

  logger.log(`Found ${existingSet.size} existing audio samples in database`)

  // Check each need against existing
  const results = []
  const needsGeneration = []

  for (const need of needs) {
    const key = `${normalizeText(need.text)}|${need.language}|${need.voiceId}|${need.cadence}`
    const exists = existingSet.has(key)

    results.push({ ...need, needsGeneration: !exists })

    if (!exists) {
      needsGeneration.push(need)
    }
  }

  logger.log(`Status: ${results.length} checked, ${needsGeneration.length} need generation`)

  return { results, needsGeneration }
}

/**
 * For each need, call find_or_create_audio to get audio_id and check if generation needed
 * Used during actual generation (slower but creates records)
 */
async function checkAudioStatus(needs) {
  logger.log(`Checking audio status for ${needs.length} needs (with record creation)`)

  const results = []
  const needsGeneration = []

  for (const need of needs) {
    try {
      const { data, error } = await supabase.rpc('find_or_create_audio', {
        p_content: need.text,
        p_language: need.language,
        p_voice_id: need.voiceId,
        p_cadence: need.cadence
      })

      if (error) {
        logger.error(`find_or_create_audio failed for "${need.text}":`, error.message)
        continue
      }

      const result = data[0]
      results.push({
        ...need,
        audioId: result.audio_id,
        s3Key: result.s3_key,
        needsGeneration: result.needs_generation
      })

      if (result.needs_generation) {
        needsGeneration.push({
          ...need,
          audioId: result.audio_id
        })
      }
    } catch (err) {
      logger.error(`Error checking "${need.text}":`, err.message)
    }
  }

  logger.log(`Status: ${results.length} checked, ${needsGeneration.length} need generation`)

  return { results, needsGeneration }
}

// =============================================================================
// CORE: GENERATE AND UPLOAD
// =============================================================================

/**
 * Generate TTS audio and upload to S3
 * Writes to audio_samples table (APML-compliant)
 */
async function generateAndUpload(need, jobState) {
  if (!ttsService) throw new Error('TTS service not available')

  // Check for cancellation
  if (jobState?.cancelled) {
    throw new Error('Job cancelled')
  }

  // Create/get audio record in audio_samples
  let audioUuid = need.audioUuid
  if (!audioUuid) {
    const result = await findOrCreateAudioSample({
      text: need.text,
      lang: need.language,
      role: need.role,
      voiceId: need.voiceId,
      cadence: need.cadence
    })
    audioUuid = result.uuid
    need.audioUuid = audioUuid

    // Skip if already has S3 key (already generated)
    if (result.s3_key) {
      return { audioUuid, s3Key: result.s3_key, skipped: true }
    }
  }

  // Get voice details for TTS
  const { data: voice, error: voiceErr } = await supabase
    .from('voices')
    .select('tts_engine, tts_voice_name, tts_locale')
    .eq('voice_id', need.voiceId)
    .single()

  if (voiceErr || !voice) {
    throw new Error(`Voice not found: ${need.voiceId}`)
  }

  // Map cadence to SSML rate
  const rate = need.cadence === 'slow' ? 'slow' : 'medium'

  // Generate TTS using the correct API
  const provider = voice.tts_engine || 'azure'

  // Azure voices need full name format: locale-voiceName (e.g., "en-US-JennyNeural")
  const azureVoiceName = voice.tts_locale
    ? `${voice.tts_locale}-${voice.tts_voice_name}`
    : voice.tts_voice_name

  const config = provider === 'azure' ? {
    subscriptionKey: process.env.AZURE_SPEECH_KEY,
    region: process.env.AZURE_SPEECH_REGION,
    voiceName: azureVoiceName,
    rate
  } : {
    apiKey: process.env.ELEVENLABS_API_KEY,
    voiceId: voice.tts_voice_name,
    speed: rate === 'slow' ? 0.85 : 1.0
  }

  const audioBuffer = await ttsService.generateWithRetry(need.text, provider, config)

  // Upload to S3
  const s3Key = `mastered/${audioUuid}.mp3`
  const s3Bucket = process.env.S3_BUCKET || 'ssi-audio-stage'

  if (s3Service) {
    await s3Service.uploadAudio(audioUuid, audioBuffer)
  } else {
    logger.warn(`S3 service not available, skipping upload for ${audioUuid}`)
  }

  // Extract duration (optional)
  let durationMs = null
  try {
    const tempFile = path.join(os.tmpdir(), `${audioUuid}-temp.mp3`)
    fs.writeFileSync(tempFile, audioBuffer)
    const { execSync } = require('child_process')
    const output = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempFile}"`, { encoding: 'utf8' })
    durationMs = Math.round(parseFloat(output.trim()) * 1000)
    fs.unlinkSync(tempFile)
  } catch (err) {
    logger.warn(`Could not extract duration: ${err.message}`)
  }

  // Update audio_samples with S3 info
  await updateAudioSampleS3({
    uuid: audioUuid,
    s3Bucket,
    s3Key,
    durationMs,
    fileSizeBytes: audioBuffer.length,
    source: voice.tts_engine === 'azure' ? 'tts_azure' : 'tts_elevenlabs'
  })

  return { audioUuid, s3Key, durationMs, size: audioBuffer.length }
}

// =============================================================================
// NOTE: course_audio linking removed - APML uses lego_introductions for intro links
// and audio_samples is course-agnostic (same phrase can be reused across courses)
// =============================================================================

// =============================================================================
// PROGRESS EMISSION
// =============================================================================

async function emitProgress(courseCode, progress) {
  const productionApiUrl = process.env.PRODUCTION_API_URL || 'http://localhost:3470'
  try {
    await fetch(`${productionApiUrl}/api/production/internal/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'audio:progress',
        data: { courseCode, ...progress }
      })
    })
  } catch (err) {
    // Silent fail for progress emission
  }
}

// =============================================================================
// ENDPOINTS
// =============================================================================

/**
 * POST /plan - Preview what would be generated (dry run)
 */
app.post('/plan', async (req, res) => {
  try {
    const { courseCode } = req.body

    if (!courseCode) {
      return res.status(400).json({ error: 'courseCode is required' })
    }

    logger.log(`Planning audio generation for ${courseCode}`)

    // Extract needs
    const { needs, voiceConfig, phraseCount, introCount } = await extractAudioNeeds(courseCode)

    // Check what already exists (fast batch query for planning)
    const { results, needsGeneration } = await checkAudioStatusFast(needs)

    const plan = {
      courseCode,
      phraseCount,
      introCount: introCount || 0,
      uniqueAudioNeeds: needs.length,
      alreadyExists: results.length - needsGeneration.length,
      needsGeneration: needsGeneration.length,
      voiceConfig,
      breakdown: {
        target1: needsGeneration.filter(n => n.role === 'target1').length,
        target2: needsGeneration.filter(n => n.role === 'target2').length,
        known: needsGeneration.filter(n => n.role === 'known').length,
        introduction: needsGeneration.filter(n => n.role === 'introduction').length
      },
      estimatedCost: `~$${(needsGeneration.length * 0.002).toFixed(2)} (Azure TTS)`,
      samples: needsGeneration.slice(0, 5).map(n => ({
        text: n.text.substring(0, 50) + (n.text.length > 50 ? '...' : ''),
        role: n.role,
        voice: n.voiceId
      }))
    }

    logger.log(`Plan: ${plan.needsGeneration} to generate, ${plan.alreadyExists} exist`)

    // Check assembly status (how many combined intros exist)
    const { data: assembledIntros } = await supabase
      .from('audio_samples')
      .select('uuid')
      .eq('voice_id', 'combined-introduction')
      .not('s3_key', 'is', null)

    const assemblyStats = {
      total: plan.introCount,
      assembled: (assembledIntros || []).length,
      pending: Math.max(0, plan.introCount - (assembledIntros || []).length)
    }

    // Return in format expected by production-api
    res.json({
      plan: {
        total: plan.uniqueAudioNeeds,
        phraseNeeds: plan.phraseCount * 3,  // 3 audio files per phrase (target1, target2, known)
        introNeeds: plan.introCount,
        existing: plan.alreadyExists,
        toGenerate: plan.needsGeneration,
        samples: needsGeneration.slice(0, 10).map(n => ({
          text: n.text.substring(0, 50) + (n.text.length > 50 ? '...' : ''),
          role: n.role,
          voice: n.voiceId
        }))
      },
      assembly: assemblyStats,
      voices: plan.voiceConfig,
      dataSource: 'supabase-v12'
    })

  } catch (err) {
    logger.error('Plan failed:', err.message)
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /generate - Generate audio for a course
 */
app.post('/generate', async (req, res) => {
  try {
    const { courseCode, batchSize = 50 } = req.body

    if (!courseCode) {
      return res.status(400).json({ error: 'courseCode is required' })
    }

    // Check if already running
    if (activeJobs.has(courseCode) && activeJobs.get(courseCode).status === 'running') {
      return res.status(409).json({ error: 'Generation already in progress for this course' })
    }

    logger.log(`Starting audio generation for ${courseCode}`)

    // Initialize job state
    const jobState = {
      status: 'running',
      startTime: Date.now(),
      cancelled: false,
      progress: { generated: 0, failed: 0, total: 0 }
    }
    activeJobs.set(courseCode, jobState)

    // Respond immediately
    res.json({ status: 'started', courseCode })

    // Run generation in background
    ;(async () => {
      try {
        // Extract needs
        const { needs, phraseCount } = await extractAudioNeeds(courseCode)

        // Fast check what needs generation (no record creation - that happens on-the-fly)
        const { results, needsGeneration } = await checkAudioStatusFast(needs)

        jobState.progress.total = needsGeneration.length
        logger.log(`Generating ${needsGeneration.length} audio files`)

        await emitProgress(courseCode, {
          phase: 'generating',
          total: needsGeneration.length,
          generated: 0
        })

        // Generate in batches
        const generated = []
        for (let i = 0; i < needsGeneration.length; i++) {
          if (jobState.cancelled) {
            logger.log(`Job cancelled at ${i}/${needsGeneration.length}`)
            break
          }

          const need = needsGeneration[i]
          try {
            const result = await generateAndUpload(need, jobState)
            generated.push({ ...need, ...result })
            jobState.progress.generated++

            logger.log(`Generated ${i + 1}/${needsGeneration.length}: ${need.text.substring(0, 30)}...`)

            // Emit progress every 10 items
            if ((i + 1) % 10 === 0) {
              await emitProgress(courseCode, {
                phase: 'generating',
                total: needsGeneration.length,
                generated: jobState.progress.generated,
                failed: jobState.progress.failed
              })
            }

          } catch (err) {
            logger.error(`Failed to generate "${need.text}":`, err.message)
            jobState.progress.failed++
          }
        }

        // NOTE: course_audio linking removed - APML uses lego_introductions instead
        // (audio_samples is course-agnostic, intro links handled by assembleIntroduction)

        logger.log(`TTS generation complete: ${jobState.progress.generated} generated, ${jobState.progress.failed} failed`)

        // Auto-trigger introduction assembly
        await emitProgress(courseCode, {
          phase: 'assembling',
          message: 'Assembling introduction audio...'
        })

        const assemblyResult = await runIntroductionAssembly(courseCode)

        // Update job state
        jobState.status = jobState.cancelled ? 'cancelled' : 'completed'
        jobState.endTime = Date.now()
        jobState.assembly = assemblyResult

        logger.log(`Assembly complete: ${assemblyResult.assembled} assembled, ${assemblyResult.failed} failed`)

        await emitProgress(courseCode, {
          phase: 'complete',
          total: needsGeneration.length,
          generated: jobState.progress.generated,
          failed: jobState.progress.failed,
          assembly: assemblyResult,
          durationMs: jobState.endTime - jobState.startTime
        })

      } catch (err) {
        logger.error('Generation failed:', err.message)
        jobState.status = 'failed'
        jobState.error = err.message
      }
    })()

  } catch (err) {
    logger.error('Generate failed:', err.message)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /status/:courseCode - Check generation status
 * Uses DATABASE as source of truth for progress
 */
app.get('/status/:courseCode', async (req, res) => {
  const { courseCode } = req.params
  const job = activeJobs.get(courseCode)

  // Query database for real progress (source of truth)
  try {
    // Get total audio needs for this course
    const { needs } = await extractAudioNeeds(courseCode)
    const total = needs.length

    // Query how many have been generated (have s3_key)
    // audio_samples has text inline (no join needed)
    const { data: generated, error } = await supabase
      .from('audio_samples')
      .select('uuid, s3_key, lang')
      .not('s3_key', 'is', null)

    // Filter to just this course's languages
    const courseLanguages = [...new Set(needs.map(n => n.language))]
    const generatedForCourse = (generated || []).filter(a =>
      courseLanguages.includes(a.lang)
    ).length

    const dbProgress = {
      generated: generatedForCourse,
      total,
      percent: total > 0 ? Math.round((generatedForCourse / total) * 100) : 0
    }

    // Get assembly stats
    const introCount = needs.filter(n => n.role === 'introduction').length
    const { data: assembledIntros } = await supabase
      .from('audio_samples')
      .select('uuid')
      .eq('voice_id', 'combined-introduction')
      .not('s3_key', 'is', null)

    const assembly = {
      total: introCount,
      assembled: (assembledIntros || []).length,
      pending: Math.max(0, introCount - (assembledIntros || []).length)
    }

    if (!job) {
      return res.json({
        status: 'idle',
        courseCode,
        progress: dbProgress,
        assembly
      })
    }

    res.json({
      status: job.status,
      courseCode,
      progress: {
        ...job.progress,
        // Override with database truth
        generated: dbProgress.generated,
        total: dbProgress.total,
        percent: dbProgress.percent
      },
      assembly: job.assembly || assembly,
      startTime: job.startTime,
      endTime: job.endTime,
      error: job.error
    })
  } catch (err) {
    // Fallback to in-memory if DB query fails
    if (!job) {
      return res.json({ status: 'idle', courseCode })
    }
    res.json({
      status: job.status,
      courseCode,
      progress: job.progress,
      startTime: job.startTime,
      endTime: job.endTime,
      error: job.error
    })
  }
})

/**
 * DELETE /cancel/:courseCode - Cancel active generation
 */
app.delete('/cancel/:courseCode', (req, res) => {
  const { courseCode } = req.params
  const job = activeJobs.get(courseCode)

  if (!job || job.status !== 'running') {
    return res.status(404).json({ error: 'No active job found' })
  }

  job.cancelled = true
  job.status = 'cancelling'
  logger.log(`Cancellation requested for ${courseCode}`)

  res.json({ status: 'cancelling', courseCode })
})

// =============================================================================
// INTRODUCTION ASSEMBLY
// =============================================================================

/**
 * Assemble complete introduction audio files
 * Combines: narration + pause + target1 + pause + target2
 */
async function assembleIntroduction(introData, courseCode, voiceConfig, knownLang, targetLang) {
  const { legoId, narrationText, targetText } = introData
  const tempDir = path.join(os.tmpdir(), `intro-assembly-${Date.now()}`)

  try {
    fs.mkdirSync(tempDir, { recursive: true })

    // 1. Find narration audio in audio_samples
    const cleanNarration = narrationText
      .replace(/\s*\.\.\.\s*\{target[12]\}[^.]*$/g, '')
      .replace(/\{target[12]\}[^{]*/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    const presentationVoice = voiceConfig.presentation?.voiceId || voiceConfig.known?.voiceId
    const { data: narrationAudio } = await supabase
      .from('audio_samples')
      .select('uuid, s3_key')
      .eq('text_normalized', normalizeText(cleanNarration))
      .eq('voice_id', presentationVoice)
      .not('s3_key', 'is', null)
      .limit(1)
      .single()

    if (!narrationAudio) {
      throw new Error(`Narration audio not found for: ${cleanNarration.substring(0, 50)}...`)
    }

    // 2. Find target1 audio (slow) in audio_samples
    const { data: target1Audio } = await supabase
      .from('audio_samples')
      .select('uuid, s3_key')
      .eq('text_normalized', normalizeText(targetText))
      .eq('voice_id', voiceConfig.target1?.voiceId)
      .eq('cadence', 'slow')
      .not('s3_key', 'is', null)
      .limit(1)
      .single()

    if (!target1Audio) {
      throw new Error(`Target1 audio not found for: ${targetText}`)
    }

    // 3. Find target2 audio (natural) in audio_samples
    const { data: target2Audio } = await supabase
      .from('audio_samples')
      .select('uuid, s3_key')
      .eq('text_normalized', normalizeText(targetText))
      .eq('voice_id', voiceConfig.target2?.voiceId)
      .eq('cadence', 'natural')
      .not('s3_key', 'is', null)
      .limit(1)
      .single()

    if (!target2Audio) {
      throw new Error(`Target2 audio not found for: ${targetText}`)
    }

    // 4. Download all audio files from S3
    const narrationPath = path.join(tempDir, 'narration.mp3')
    const target1Path = path.join(tempDir, 'target1.mp3')
    const target2Path = path.join(tempDir, 'target2.mp3')
    const silencePath = path.join(tempDir, 'silence.mp3')
    const outputPath = path.join(tempDir, 'combined.mp3')

    await s3Service.downloadAudioFile(narrationAudio.uuid, narrationPath)
    await s3Service.downloadAudioFile(target1Audio.uuid, target1Path)
    await s3Service.downloadAudioFile(target2Audio.uuid, target2Path)

    // 5. Generate 500ms silence
    const { execSync } = require('child_process')
    execSync(`ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 0.5 -q:a 9 "${silencePath}" -y 2>/dev/null`)

    // 6. Concatenate: narration + silence + target1 + silence + target2
    const listPath = path.join(tempDir, 'files.txt')
    fs.writeFileSync(listPath, [
      `file '${narrationPath}'`,
      `file '${silencePath}'`,
      `file '${target1Path}'`,
      `file '${silencePath}'`,
      `file '${target2Path}'`
    ].join('\n'))

    execSync(`ffmpeg -f concat -safe 0 -i "${listPath}" -c:a libmp3lame -q:a 2 "${outputPath}" -y 2>/dev/null`)

    // 7. Read the combined file
    const combinedBuffer = fs.readFileSync(outputPath)

    // 8. Extract duration
    let durationMs = null
    try {
      const output = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`, { encoding: 'utf8' })
      durationMs = Math.round(parseFloat(output.trim()) * 1000)
    } catch (err) {
      logger.warn(`Could not extract duration: ${err.message}`)
    }

    // 9. Create audio_samples record for combined intro
    const introUuid = uuidv4().toUpperCase()
    const s3Key = `mastered/${introUuid}.mp3`
    const s3Bucket = process.env.S3_BUCKET || 'ssi-audio-stage'

    const { error: insertErr } = await supabase
      .from('audio_samples')
      .insert({
        uuid: introUuid,
        text: `[INTRO] ${legoId}: ${targetText}`,
        text_normalized: normalizeText(`intro ${legoId} ${targetText}`),
        lang: knownLang,
        role: 'introduction',
        voice_id: 'combined-introduction',
        cadence: 'natural',
        s3_bucket: s3Bucket,
        s3_key: s3Key,
        duration_ms: durationMs,
        file_size_bytes: combinedBuffer.length,
        source: 'assembled',
        status: 'ready'
      })

    if (insertErr) {
      throw new Error(`Failed to create intro audio_samples record: ${insertErr.message}`)
    }

    // 10. Upload combined file to S3
    await s3Service.uploadAudio(introUuid, combinedBuffer)

    // 11. Create lego_introductions record
    await upsertLegoIntroduction({
      courseCode,
      legoId,
      audioUuid: introUuid,
      durationMs
    })

    return { legoId, introUuid, s3Key, durationMs, size: combinedBuffer.length }

  } finally {
    // Cleanup temp files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Run introduction assembly for a course (sync, returns result)
 * Used by auto-assembly after TTS generation
 */
async function runIntroductionAssembly(courseCode) {
  logger.log(`Running introduction assembly for ${courseCode}`)

  const result = { assembled: 0, failed: 0, errors: [] }

  try {
    // Get course voice config
    const { voiceConfig } = await extractAudioNeeds(courseCode)

    // Get course languages
    const [targetLang, , knownLang] = courseCode.split('_')

    // Load introductions.json
    const introPath = path.join(__dirname, '../../public/vfs/courses', courseCode, 'introductions.json')
    if (!fs.existsSync(introPath)) {
      logger.warn(`No introductions.json found for ${courseCode}`)
      return result
    }

    const introData = JSON.parse(fs.readFileSync(introPath, 'utf8'))
    const presentations = introData.presentations || {}

    for (const [legoId, presentation] of Object.entries(presentations)) {
      try {
        const text = typeof presentation === 'string' ? presentation : presentation.text

        // Extract target text
        const targetMatch = text.match(/\{target1\}[''""]([^''"]+)[''""]/)
        if (!targetMatch) {
          continue
        }

        const targetText = targetMatch[1]

        await assembleIntroduction(
          { legoId, narrationText: text, targetText },
          courseCode,
          voiceConfig,
          knownLang,
          targetLang
        )

        result.assembled++
        logger.log(`Assembled intro ${result.assembled}: ${legoId}`)

      } catch (err) {
        result.failed++
        result.errors.push({ legoId, error: err.message })
      }
    }

  } catch (err) {
    logger.error(`Assembly failed for ${courseCode}:`, err.message)
    result.errors.push({ error: err.message })
  }

  return result
}

/**
 * POST /assemble-introductions - Assemble complete introduction audio
 * Combines narration + target1 + target2 into single files
 */
app.post('/assemble-introductions', async (req, res) => {
  try {
    const { courseCode } = req.body

    if (!courseCode) {
      return res.status(400).json({ error: 'courseCode is required' })
    }

    logger.log(`Assembling introductions for ${courseCode}`)

    // Get course voice config
    const { voiceConfig } = await extractAudioNeeds(courseCode)

    // Get course languages
    const [targetLang, , knownLang] = courseCode.split('_')

    // Load introductions.json
    const introPath = path.join(__dirname, '../../public/vfs/courses', courseCode, 'introductions.json')
    if (!fs.existsSync(introPath)) {
      return res.status(404).json({ error: 'introductions.json not found' })
    }

    const introData = JSON.parse(fs.readFileSync(introPath, 'utf8'))
    const presentations = introData.presentations || {}

    // Start assembly in background
    res.json({
      status: 'started',
      courseCode,
      total: Object.keys(presentations).length
    })

    // Process asynchronously
    ;(async () => {
      const results = []
      const errors = []
      let processed = 0

      for (const [legoId, presentation] of Object.entries(presentations)) {
        try {
          // Parse the presentation to get target text
          const text = typeof presentation === 'string' ? presentation : presentation.text

          // Extract target text from presentation
          // Format: "The Chinese for 'I want'... is: ... {target1}'我想' ... {target2}'我想'"
          const targetMatch = text.match(/\{target1\}[''""]([^''"]+)[''""]/)
          if (!targetMatch) {
            logger.warn(`Could not extract target from ${legoId}: ${text.substring(0, 50)}...`)
            continue
          }

          const targetText = targetMatch[1]

          const result = await assembleIntroduction(
            { legoId, narrationText: text, targetText },
            courseCode,
            voiceConfig,
            knownLang,
            targetLang
          )

          results.push(result)
          processed++
          logger.log(`Assembled ${processed}/${Object.keys(presentations).length}: ${legoId}`)

        } catch (err) {
          logger.error(`Failed to assemble ${legoId}:`, err.message)
          errors.push({ legoId, error: err.message })
        }
      }

      logger.log(`Assembly complete: ${results.length} assembled, ${errors.length} failed`)
    })()

  } catch (err) {
    logger.error('Assembly failed:', err.message)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /health - Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'phase8-audio-v12',
    version: '12.1.0',
    ttsAvailable: !!ttsService,
    s3Available: !!s3Service,
    supabaseConnected: !!supabase,
    activeJobs: activeJobs.size
  })
})

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  logger.log(`Phase 8 Audio Generator v12 running on port ${PORT}`)
  logger.log(`  TTS: ${ttsService ? 'available' : 'NOT available'}`)
  logger.log(`  S3: ${s3Service ? 'available' : 'NOT available'}`)
  logger.log(`  Supabase: ${supabase ? 'connected' : 'NOT connected'}`)
})

module.exports = app
