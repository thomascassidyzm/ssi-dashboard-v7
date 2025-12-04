/**
 * Phase 9: Manifest Compiler Service
 *
 * Compiles lego_baskets.json into course_manifest.json with Supabase UUID lookups.
 * Validates that all required audio samples exist before writing the manifest.
 *
 * Features:
 * - Reads lego_baskets.json
 * - Looks up all audio UUIDs from Supabase
 * - Validates 100% audio coverage
 * - Writes course_manifest.json
 * - Updates course record in Supabase
 *
 * Port: 3466 (BASE_PORT + 10)
 *
 * @version 1.0.0
 */

const express = require('express')
const path = require('path')
const fs = require('fs-extra')

const db = require('../supabase-client.cjs')

const app = express()
const PORT = process.env.PORT || 3466

app.use(express.json())

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
    const vfsRoot = process.env.VFS_ROOT || './public/vfs/courses'
    const basketsPath = path.join(vfsRoot, courseCode, 'lego_baskets.json')

    if (!await fs.pathExists(basketsPath)) {
      return res.status(404).json({ error: 'lego_baskets.json not found' })
    }

    const baskets = await fs.readJson(basketsPath)

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

    // Get voice config
    const voices = voiceOverrides || await db.getCourseVoices(courseCode) || {}

    if (!voices.source || !voices.target1 || !voices.target2) {
      return res.status(400).json({
        error: 'Missing voice configuration',
        required: ['source', 'target1', 'target2'],
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

              const exists = await db.audioExists(uuid)
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
            const voiceId = voices.source
            const cadence = getCadenceForRole('source')
            const uuid = db.generateAudioUUID(voiceId, cycle.source, knownLang, 'source', cadence)

            const exists = await db.audioExists(uuid)
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
                const exists = await db.audioExists(uuid)
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
            const voiceId = voices.source
            if (voiceId) {
              const cadence = getCadenceForRole('source')
              const uuid = db.generateAudioUUID(voiceId, cycle.source, knownLang, 'source', cadence)
              const exists = await db.audioExists(uuid)
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
 */
app.get('/status/:courseCode', async (req, res) => {
  const { courseCode } = req.params

  try {
    const vfsRoot = process.env.VFS_ROOT || './public/vfs/courses'
    const manifestPath = path.join(vfsRoot, courseCode, 'course_manifest.json')
    const basketsPath = path.join(vfsRoot, courseCode, 'lego_baskets.json')

    const manifestExists = await fs.pathExists(manifestPath)
    const basketsExist = await fs.pathExists(basketsPath)

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

    res.json({
      courseCode,
      manifestExists,
      basketsExist,
      manifest: manifestStats,
      readyToCompile: basketsExist && !manifestExists
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
