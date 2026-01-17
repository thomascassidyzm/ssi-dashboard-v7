/**
 * Phase 9: Manifest Compiler Service
 *
 * IMPORTANT: DATABASE-ONLY ARCHITECTURE (January 2026)
 * =====================================================
 * Course data is read EXCLUSIVELY from Supabase, NOT from JSON files.
 * This service reads from course_legos and course_practice_phrases tables.
 *
 * JSON files (lego_baskets.json) are DEPRECATED and only used as fallback.
 * The loadBasketsFromSupabase() function is the PRIMARY data source.
 *
 * Data Flow (DATABASE-FIRST):
 * 1. Load LEGOs from course_legos table
 * 2. Load phrases from course_practice_phrases table
 * 3. Transform into basket format for manifest generation
 * 4. Look up audio UUIDs from course_audio/audio_samples
 * 5. Generate course_manifest.json
 *
 * Features:
 * - Reads from Supabase (primary) or lego_baskets.json (fallback only)
 * - Looks up all audio UUIDs from Supabase
 * - Validates 100% audio coverage
 * - Writes course_manifest.json
 * - Updates course record in Supabase
 *
 * Port: 3466 (BASE_PORT + 10)
 *
 * @version 1.0.0
 */

require('dotenv').config()

const express = require('express')
const path = require('path')
const fs = require('fs-extra')

const db = require('../supabase-client.cjs')

const app = express()
const PORT = process.env.PORT || 3466

app.use(express.json())

// Logger for this service
const logger = {
  log: (...args) => console.log('[Phase9]', ...args),
  warn: (...args) => console.warn('[Phase9]', ...args),
  error: (...args) => console.error('[Phase9]', ...args)
}

/**
 * Load baskets from Supabase (database-first approach)
 * Transforms course_legos + course_practice_phrases into basket format
 *
 * @param {string} courseCode
 * @returns {Promise<Object|null>} Baskets in lego_baskets.json format, or null if not available
 */
async function loadBasketsFromSupabase(courseCode) {
  if (!db.isInitialized()) {
    logger.warn('Supabase not initialized, cannot load from database')
    return null
  }

  try {
    const supabase = db.getClient()

    // Get all LEGOs for this course
    const { data: legos, error: legosError } = await supabase
      .from('course_legos')
      .select('*')
      .eq('course_code', courseCode)
      .order('seed_number')
      .order('lego_index')

    if (legosError) {
      logger.warn(`Error loading LEGOs from Supabase: ${legosError.message}`)
      return null
    }

    if (!legos || legos.length === 0) {
      logger.warn(`No LEGOs found in Supabase for ${courseCode}`)
      return null
    }

    // Get all practice phrases for this course
    const { data: phrases, error: phrasesError } = await supabase
      .from('course_practice_phrases')
      .select('*')
      .eq('course_code', courseCode)
      .order('seed_number')
      .order('lego_index')
      .order('position')

    if (phrasesError) {
      logger.warn(`Error loading phrases from Supabase: ${phrasesError.message}`)
      return null
    }

    if (!phrases || phrases.length === 0) {
      logger.warn(`No practice phrases found in Supabase for ${courseCode}`)
      return null
    }

    // Transform into basket format
    // Group LEGOs by seed
    const legosBySeed = {}
    for (const lego of legos) {
      const seedId = 'S' + String(lego.seed_number).padStart(4, '0')
      if (!legosBySeed[seedId]) {
        legosBySeed[seedId] = []
      }
      legosBySeed[seedId].push(lego)
    }

    // Group phrases by seed+lego
    const phrasesByLego = {}
    for (const phrase of phrases) {
      const key = `${phrase.seed_number}-${phrase.lego_index}`
      if (!phrasesByLego[key]) {
        phrasesByLego[key] = []
      }
      phrasesByLego[key].push(phrase)
    }

    // Build basket structure
    const baskets = {}
    for (const [seedId, seedLegos] of Object.entries(legosBySeed)) {
      baskets[seedId] = {
        baskets: seedLegos.map(lego => {
          const legoId = `${seedId}L${String(lego.lego_index).padStart(2, '0')}`
          const phraseKey = `${lego.seed_number}-${lego.lego_index}`
          const legoPhrases = phrasesByLego[phraseKey] || []

          return {
            lego_id: legoId,
            is_debut: lego.is_new === true,
            is_component: lego.is_component === true,
            cycles: legoPhrases.map(p => ({
              target: p.target_text,
              source: p.known_text
            }))
          }
        })
      }
    }

    logger.log(`Loaded ${legos.length} LEGOs and ${phrases.length} phrases from Supabase for ${courseCode}`)
    return baskets

  } catch (error) {
    logger.warn(`Failed to load baskets from Supabase: ${error.message}`)
    return null
  }
}

/**
 * Get cadence for role (must match Phase 8)
 *
 * @param {string} role
 * @returns {string}
 */
function getCadenceForRole(role) {
  if (role === 'source') return 'natural'
  return 'slow'
}

/**
 * POST /compile
 *
 * Compile course manifest from lego_baskets.json and Supabase
 *
 * Body: {
 *   courseCode: "spa_for_eng",
 *   voices: { ... } // Optional, will lookup from Supabase if not provided
 * }
 */
app.post('/compile', async (req, res) => {
  const { courseCode, voices: voiceOverrides } = req.body

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

  try {
    // Try Supabase first (database-first approach), fallback to local JSON
    let baskets = await loadBasketsFromSupabase(courseCode)
    let dataSource = 'supabase'

    if (!baskets) {
      const vfsRoot = process.env.VFS_ROOT || './public/vfs/courses'
      const basketsPath = path.join(vfsRoot, courseCode, 'lego_baskets.json')

      if (!await fs.pathExists(basketsPath)) {
        return res.status(404).json({ error: 'No baskets found in Supabase or local file' })
      }

      baskets = await fs.readJson(basketsPath)
      dataSource = 'local_json'
      logger.log(`Loaded baskets from local JSON for ${courseCode}`)
    }

    // Parse course code for languages
    const parts = courseCode.split('_')
    let targetLang, knownLang

    if (parts.length === 3 && parts[1] === 'for') {
      targetLang = parts[0]
      knownLang = parts[2]
    } else {
      targetLang = parts[0] || 'spa'
      knownLang = parts[parts.length - 1] || 'eng'
    }

    // Get voice config (handle both nested and flat structure)
    const voiceConfig = voiceOverrides || await db.getCourseVoices(courseCode) || {}
    const voices = voiceConfig.voices || voiceConfig

    if (!voices.known || !voices.target1 || !voices.target2) {
      return res.status(400).json({
        error: 'Missing voice configuration',
        required: ['known', 'target1', 'target2'],
        provided: voices
      })
    }

    const manifest = {
      version: '10.2',
      courseCode,
      targetLang,
      knownLang,
      generatedAt: new Date().toISOString(),
      voices,
      slices: []
    }

    const missing = []
    let totalSamples = 0

    // Build manifest slices from baskets
    for (const [seedId, seedData] of Object.entries(baskets)) {
      const slice = {
        seedId,
        baskets: []
      }

      for (const basket of seedData.baskets || []) {
        const basketEntry = {
          legoId: basket.lego_id,
          isDebut: basket.is_debut || false,
          isComponent: basket.is_component || false,
          cycles: []
        }

        for (const cycle of basket.cycles || []) {
          const cycleEntry = {
            samples: []
          }

          // Target samples
          if (cycle.target) {
            for (const role of ['target1', 'target2']) {
              const voiceId = voices[role]
              const cadence = getCadenceForRole(role)
              const uuid = db.generateAudioUUID(voiceId, cycle.target, targetLang, role, cadence)

              const exists = await db.courseAudioExists(uuid)
              if (!exists) {
                missing.push({
                  text: cycle.target,
                  lang: targetLang,
                  role,
                  uuid,
                  seedId,
                  legoId: basket.lego_id
                })
              }

              cycleEntry.samples.push({
                id: uuid,
                role,
                cadence,
                text: cycle.target
              })
              totalSamples++
            }
          }

          // Source sample
          if (cycle.source) {
            const voiceId = voices.known
            const cadence = getCadenceForRole('source')
            const uuid = db.generateAudioUUID(voiceId, cycle.source, knownLang, 'source', cadence)

            const exists = await db.courseAudioExists(uuid)
            if (!exists) {
              missing.push({
                text: cycle.source,
                lang: knownLang,
                role: 'source',
                uuid,
                seedId,
                legoId: basket.lego_id
              })
            }

            cycleEntry.samples.push({
              id: uuid,
              role: 'source',
              cadence,
              text: cycle.source
            })
            totalSamples++
          }

          basketEntry.cycles.push(cycleEntry)
        }

        slice.baskets.push(basketEntry)
      }

      manifest.slices.push(slice)
    }

    // Check for missing audio
    if (missing.length > 0) {
      // Group missing by seed for better reporting
      const missingSummary = {}
      for (const m of missing) {
        if (!missingSummary[m.seedId]) {
          missingSummary[m.seedId] = []
        }
        missingSummary[m.seedId].push(`${m.role}: "${m.text.substring(0, 40)}..."`)
      }

      return res.status(422).json({
        success: false,
        error: 'Missing audio samples',
        missingCount: missing.length,
        totalSamples,
        coverage: `${Math.round(((totalSamples - missing.length) / totalSamples) * 100)}%`,
        missingSummary,
        missing: missing.slice(0, 50), // First 50 for debugging
        hint: 'Run Phase 8 audio generation first'
      })
    }

    // All audio exists - write manifest
    const manifestPath = path.join(vfsRoot, courseCode, 'course_manifest.json')
    await fs.writeJson(manifestPath, manifest, { spaces: 2 })

    // Update course status in Supabase
    await db.upsertCourse(courseCode, knownLang, targetLang, voices)

    console.log(`[Phase 9] Compiled manifest for ${courseCode}: ${manifest.slices.length} slices, ${totalSamples} samples`)

    res.json({
      success: true,
      manifestPath,
      sliceCount: manifest.slices.length,
      sampleCount: totalSamples,
      version: manifest.version
    })

  } catch (err) {
    console.error('[Phase 9] Compile error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /validate/:courseCode
 *
 * Check if all audio exists for a course without writing manifest
 */
app.get('/validate/:courseCode', async (req, res) => {
  const { courseCode } = req.params

  if (!db.isInitialized()) {
    return res.status(503).json({
      error: 'Supabase not initialized',
      hint: 'Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.automation'
    })
  }

  try {
    // Try Supabase first (database-first approach), fallback to local JSON
    let baskets = await loadBasketsFromSupabase(courseCode)
    let dataSource = 'supabase'

    if (!baskets) {
      const vfsRoot = process.env.VFS_ROOT || './public/vfs/courses'
      const basketsPath = path.join(vfsRoot, courseCode, 'lego_baskets.json')

      if (!await fs.pathExists(basketsPath)) {
        return res.status(404).json({ error: 'No baskets found in Supabase or local file' })
      }

      baskets = await fs.readJson(basketsPath)
      dataSource = 'local_json'
    }

    // Parse course code
    const parts = courseCode.split('_')
    const targetLang = parts[0]
    const knownLang = parts[parts.length - 1]

    // Get voices
    const voices = await db.getCourseVoices(courseCode) || {}

    let total = 0
    let existing = 0
    let missing = 0

    // Check each audio need
    for (const [seedId, seedData] of Object.entries(baskets)) {
      for (const basket of seedData.baskets || []) {
        for (const cycle of basket.cycles || []) {
          // Target samples
          if (cycle.target) {
            for (const role of ['target1', 'target2']) {
              total++
              const voiceId = voices[role]
              if (voiceId) {
                const cadence = getCadenceForRole(role)
                const uuid = db.generateAudioUUID(voiceId, cycle.target, targetLang, role, cadence)
                const exists = await db.courseAudioExists(uuid)
                if (exists) existing++
                else missing++
              } else {
                missing++
              }
            }
          }

          // Source
          if (cycle.source) {
            total++
            const voiceId = voices.known
            if (voiceId) {
              const cadence = getCadenceForRole('source')
              const uuid = db.generateAudioUUID(voiceId, cycle.source, knownLang, 'source', cadence)
              const exists = await db.courseAudioExists(uuid)
              if (exists) existing++
              else missing++
            } else {
              missing++
            }
          }
        }
      }
    }

    const valid = missing === 0
    const coverage = total > 0 ? Math.round((existing / total) * 100) : 0

    res.json({
      valid,
      courseCode,
      dataSource,
      total,
      existing,
      missing,
      coverage: `${coverage}%`,
      voices,
      message: valid ? 'All audio samples exist' : `Missing ${missing} samples`
    })

  } catch (err) {
    console.error('[Phase 9] Validation error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /status/:courseCode
 *
 * Get manifest status for a course
 * Reports availability from both Supabase and local files
 */
app.get('/status/:courseCode', async (req, res) => {
  const { courseCode } = req.params

  try {
    const vfsRoot = process.env.VFS_ROOT || './public/vfs/courses'
    const manifestPath = path.join(vfsRoot, courseCode, 'course_manifest.json')
    const basketsPath = path.join(vfsRoot, courseCode, 'lego_baskets.json')

    const manifestExists = await fs.pathExists(manifestPath)
    const basketsExistLocal = await fs.pathExists(basketsPath)

    // Check Supabase availability
    let basketsExistSupabase = false
    let supabaseStats = null
    if (db.isInitialized()) {
      try {
        const supabase = db.getClient()
        const { count: legoCount } = await supabase
          .from('course_legos')
          .select('*', { count: 'exact', head: true })
          .eq('course_code', courseCode)

        const { count: phraseCount } = await supabase
          .from('course_practice_phrases')
          .select('*', { count: 'exact', head: true })
          .eq('course_code', courseCode)

        basketsExistSupabase = (legoCount > 0 && phraseCount > 0)
        supabaseStats = {
          legos: legoCount || 0,
          phrases: phraseCount || 0
        }
      } catch (e) {
        logger.warn(`Error checking Supabase for ${courseCode}: ${e.message}`)
      }
    }

    let manifest = null
    let manifestStats = null

    if (manifestExists) {
      manifest = await fs.readJson(manifestPath)
      const stats = await fs.stat(manifestPath)
      manifestStats = {
        generatedAt: manifest.generatedAt,
        modifiedAt: stats.mtime.toISOString(),
        version: manifest.version,
        sliceCount: manifest.slices?.length || 0
      }
    }

    const canCompile = basketsExistSupabase || basketsExistLocal

    res.json({
      courseCode,
      manifestExists,
      basketsExist: {
        supabase: basketsExistSupabase,
        local: basketsExistLocal,
        any: canCompile
      },
      supabase: supabaseStats,
      manifest: manifestStats,
      readyToCompile: canCompile && !manifestExists,
      preferredSource: basketsExistSupabase ? 'supabase' : (basketsExistLocal ? 'local_json' : 'none')
    })

  } catch (err) {
    console.error('[Phase 9] Status error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Phase 9 Manifest Compiler',
    port: PORT,
    timestamp: new Date().toISOString(),
    supabase: db.isInitialized() ? 'connected' : 'not configured'
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`[Phase 9] Manifest Compiler running on port ${PORT}`)
  console.log(`[Phase 9] Supabase: ${db.isInitialized() ? 'connected' : 'not configured'}`)
})

module.exports = { app, getCadenceForRole }
