/**
 * Phase 8: Audio Generation Service (v13)
 *
 * Generates TTS audio for courses using the v13 schema.
 * Writes directly to course_audio table (flat, course-owned).
 *
 * @version 13.0.0
 * @port 3465
 */

const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
const createLogger = require('../shared/logger.cjs')

const logger = createLogger('Phase8-Audio-v13')

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || process.env.PHASE8_PORT || 3465

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
// HEALTH CHECK
// =============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'phase8-audio-v13', port: PORT })
})

// =============================================================================
// GET PLAN - What audio is missing?
// =============================================================================

app.get('/plan/:courseCode', async (req, res) => {
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
      .select('known, target')
      .eq('course_code', courseCode)

    if (phrasesError) throw phrasesError

    // Build needed list
    const needed = []
    const existingSet = new Set(
      (existingAudio || []).map(a => `${a.text_normalized}|${a.language}|${a.role}`)
    )

    for (const phrase of phrases || []) {
      // Known language audio
      const knownKey = `${phrase.known.toLowerCase().trim()}|${course.known_lang}|known`
      if (!existingSet.has(knownKey)) {
        needed.push({ text: phrase.known, language: course.known_lang, role: 'known' })
      }

      // Target language audio (target1 and target2)
      for (const role of ['target1', 'target2']) {
        const targetKey = `${phrase.target.toLowerCase().trim()}|${course.target_lang}|${role}`
        if (!existingSet.has(targetKey)) {
          needed.push({ text: phrase.target, language: course.target_lang, role })
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
})

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
      .select('known, target')
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
    for (const phrase of phrases || []) {
      const knownKey = `${phrase.known.toLowerCase().trim()}|${course.known_lang}|known`
      if (!existingSet.has(knownKey)) {
        needed.push({
          text: phrase.known,
          language: course.known_lang,
          role: 'known',
          voiceId: voiceConfig.known
        })
      }

      for (const role of ['target1', 'target2']) {
        const targetKey = `${phrase.target.toLowerCase().trim()}|${course.target_lang}|${role}`
        if (!existingSet.has(targetKey)) {
          needed.push({
            text: phrase.target,
            language: course.target_lang,
            role,
            voiceId: voiceConfig[role]
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

    // TODO: Actual TTS generation
    // For now, return what would be generated
    res.json({
      status: 'queued',
      courseCode,
      toGenerate: uniqueNeeded.length,
      message: 'TTS generation not yet implemented in v13 - use this as reference',
      samples: uniqueNeeded.slice(0, 5)
    })

  } catch (error) {
    logger.error('Generate error:', error)
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
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  logger.info(`Phase 8 Audio Service (v13) running on port ${PORT}`)
  logger.info(`Supabase: ${process.env.SUPABASE_URL ? 'configured' : 'NOT configured'}`)
  logger.info(`S3 Bucket: ${S3_BUCKET}`)
})

module.exports = app
