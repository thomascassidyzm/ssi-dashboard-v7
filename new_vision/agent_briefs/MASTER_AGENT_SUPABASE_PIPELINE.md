# Master Agent: Supabase Audio Pipeline

## Mission

Build the new audio generation pipeline that uses Supabase as the source of truth for audio samples. This replaces the old JSON-based MAR (Master Audio Registry) with a proper database.

**Branch:** `feature/supabase-audio-pipeline`

**Time Target:** 60 minutes

---

## The New Architecture

```
lego_baskets.json
       ↓
┌──────────────────────────────────────┐
│  Phase 8: Audio Generation           │
│                                      │
│  For each unique (text, lang, role): │
│    1. Get voice_id from course config│
│    2. Derive cadence from role       │
│    3. UUID = UUIDv5(voiceId:lang:role:cadence:text)
│    4. Check Supabase - exists?       │
│       YES → skip                     │
│       NO  → generate TTS → save S3   │
│    5. Insert into Supabase           │
└──────────────────────────────────────┘
       ↓
      Supabase (source of truth)
       ↓
┌──────────────────────────────────────┐
│  Phase 9: Manifest Compilation       │
│                                      │
│  For each sample in course:          │
│    → Query Supabase by text+role     │
│    → Get UUID                        │
│    → Write into manifest             │
│                                      │
│  Validation: ALL samples have UUIDs  │
│    YES → write course_manifest.json  │
│    NO  → fail with missing list      │
└──────────────────────────────────────┘
```

---

## Prerequisites (Human will do before you start)

1. Supabase project created
2. Schema applied (see `new_vision/supabase-schema.sql`)
3. Environment variables added to `.env.automation`:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGc...
   ```

---

## Your Task: Spawn 3 Sub-Agents

You are the orchestrator. Create and coordinate 3 sub-agents:

### Sub-Agent 1: Supabase Client Service
**Priority:** First (others depend on this)
**Output:** `services/supabase-client.cjs`

### Sub-Agent 2: Phase 8 Audio Generator
**Priority:** After Sub-Agent 1 completes
**Output:** `services/phases/phase8-audio-generator.cjs`

### Sub-Agent 3: Phase 9 Manifest Compiler
**Priority:** After Sub-Agent 1 completes (parallel with Sub-Agent 2)
**Output:** `services/phases/phase9-manifest-compiler.cjs`

---

## Sub-Agent 1: Supabase Client Service

### File: `services/supabase-client.cjs`

### Dependencies
```json
"@supabase/supabase-js": "^2.x"
```

Run `npm install @supabase/supabase-js` first.

### Implementation

```javascript
// services/supabase-client.cjs
//
// IMPORTANT: This uses the service_role key which bypasses RLS.
// Never expose this client or key to the browser.
// See: https://supabase.com/docs/guides/troubleshooting/performing-administration-tasks-on-the-server-side-with-the-servicerole-secret-BYM4Fa
//
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
}

// Service role client - bypasses RLS for server-side admin operations
// Must disable session handling for server-side usage
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
})

/**
 * Generate deterministic UUID from audio parameters
 *
 * Uses UUID v5 (RFC 4122) with SSi Audio namespace.
 * Order: voiceId:lang:role:cadence:text (least to most variable)
 * Format: 8-4-4-4-12 (e.g., B9D6E203-BA26-530F-9FC5-EBE50D6F5779)
 *
 * NOTE: Delegate to services/uuid-v11.cjs for canonical implementation
 */
function generateAudioUUID(voiceId, text, lang, role, cadence) {
  // Import from uuid-v11.cjs for production use:
  // const { generateSampleId } = require('../services/uuid-v11.cjs')
  // return generateSampleId(voiceId, text, lang, role, cadence)

  const normalizedText = text.toLowerCase().trim().replace(/\s+/g, ' ')
  const key = `${voiceId}:${lang}:${role}:${cadence}:${normalizedText}`
  // Use uuid-v11.cjs implementation for RFC 4122 compliant UUID v5
  return require('../services/uuid-v11.cjs').generateSampleId(voiceId, text, lang, role, cadence)
}

/**
 * Normalize text for consistent matching
 */
function normalizeText(text) {
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Check if audio sample exists by UUID
 */
async function audioExists(uuid) {
  const { data, error } = await supabase
    .from('audio_samples')
    .select('uuid')
    .eq('uuid', uuid)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    throw error
  }
  return !!data
}

/**
 * Get audio sample by UUID
 */
async function getAudioSample(uuid) {
  const { data, error } = await supabase
    .from('audio_samples')
    .select('*')
    .eq('uuid', uuid)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }
  return data
}

/**
 * Find audio by text and parameters
 */
async function findAudio(text, lang, role, voiceId, cadence) {
  const textNormalized = normalizeText(text)

  const { data, error } = await supabase
    .from('audio_samples')
    .select('*')
    .eq('text_normalized', textNormalized)
    .eq('lang', lang)
    .eq('role', role)
    .eq('voice_id', voiceId)
    .eq('cadence', cadence)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }
  return data
}

/**
 * Insert new audio sample
 */
async function insertAudioSample({
  uuid,
  voiceId,
  text,
  lang,
  role,
  cadence,
  s3Bucket,
  s3Key,
  durationMs,
  fileSizeBytes,
  checksumMd5,
  source,
  ttsEngine,
  ttsVoiceVariant,
  hashInput
}) {
  const { data, error } = await supabase
    .from('audio_samples')
    .insert({
      uuid,
      voice_id: voiceId,
      text,
      text_normalized: normalizeText(text),
      lang,
      role,
      cadence,
      s3_bucket: s3Bucket,
      s3_key: s3Key,
      duration_ms: durationMs,
      file_size_bytes: fileSizeBytes,
      checksum_md5: checksumMd5,
      source,
      tts_engine: ttsEngine,
      tts_voice_variant: ttsVoiceVariant,
      hash_input: hashInput
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Record course audio usage
 */
async function recordCourseUsage(courseCode, audioUuid, usedIn, seedId = null, legoId = null) {
  const { data, error } = await supabase
    .from('course_audio_usage')
    .upsert({
      course_code: courseCode,
      audio_uuid: audioUuid,
      used_in: usedIn,
      seed_id: seedId,
      lego_id: legoId
    }, {
      onConflict: 'course_code,audio_uuid'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get all audio UUIDs for a course
 */
async function getCourseAudioUuids(courseCode) {
  const { data, error } = await supabase
    .from('course_audio_usage')
    .select('audio_uuid, used_in, seed_id, lego_id')
    .eq('course_code', courseCode)

  if (error) throw error
  return data || []
}

/**
 * Get course voice configuration
 */
async function getCourseVoices(courseCode) {
  const { data, error } = await supabase
    .from('courses')
    .select('source_voice_id, target1_voice_id, target2_voice_id, presentation_voice_id')
    .eq('course_code', courseCode)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }
  return data
}

/**
 * Create or update course record
 */
async function upsertCourse(courseCode, knownLang, targetLang, voices = {}) {
  const { data, error } = await supabase
    .from('courses')
    .upsert({
      course_code: courseCode,
      known_lang: knownLang,
      target_lang: targetLang,
      source_voice_id: voices.source,
      target1_voice_id: voices.target1,
      target2_voice_id: voices.target2,
      presentation_voice_id: voices.presentation
    }, {
      onConflict: 'course_code'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get voice by ID
 */
async function getVoice(voiceId) {
  const { data, error } = await supabase
    .from('voices')
    .select('*')
    .eq('voice_id', voiceId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }
  return data
}

/**
 * Get all voices for a language
 */
async function getVoicesForLanguage(lang) {
  const { data, error } = await supabase
    .from('voices')
    .select('*')
    .contains('languages', [lang])
    .eq('is_active', true)

  if (error) throw error
  return data || []
}

/**
 * Batch check which UUIDs exist
 */
async function batchCheckExists(uuids) {
  const { data, error } = await supabase
    .from('audio_samples')
    .select('uuid')
    .in('uuid', uuids)

  if (error) throw error

  const existingSet = new Set((data || []).map(d => d.uuid))
  return uuids.map(uuid => ({ uuid, exists: existingSet.has(uuid) }))
}

/**
 * Update sample flag
 */
async function updateSampleFlag(audioUuid, courseCode, status, notes = null, flaggedBy = null) {
  const { data: existing } = await supabase
    .from('sample_flags')
    .select('id, history')
    .eq('audio_uuid', audioUuid)
    .eq('course_code', courseCode)
    .single()

  const historyEntry = {
    status,
    timestamp: new Date().toISOString(),
    by: flaggedBy
  }

  const history = existing?.history || []
  history.push(historyEntry)

  const { data, error } = await supabase
    .from('sample_flags')
    .upsert({
      id: existing?.id,
      audio_uuid: audioUuid,
      course_code: courseCode,
      status,
      notes,
      flagged_by: flaggedBy,
      flagged_at: new Date().toISOString(),
      history
    }, {
      onConflict: 'audio_uuid,course_code'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get flags for a course
 */
async function getCourseFlags(courseCode) {
  const { data, error } = await supabase
    .from('sample_flags')
    .select('*')
    .eq('course_code', courseCode)

  if (error) throw error
  return data || []
}

module.exports = {
  supabase,
  generateAudioUUID,
  normalizeText,
  audioExists,
  getAudioSample,
  findAudio,
  insertAudioSample,
  recordCourseUsage,
  getCourseAudioUuids,
  getCourseVoices,
  upsertCourse,
  getVoice,
  getVoicesForLanguage,
  batchCheckExists,
  updateSampleFlag,
  getCourseFlags
}
```

### Success Criteria
- [ ] Supabase client initializes without error
- [ ] `generateAudioUUID()` produces consistent hashes
- [ ] `audioExists()` returns true/false correctly
- [ ] `insertAudioSample()` inserts and returns data
- [ ] `findAudio()` queries by text+params

---

## Sub-Agent 2: Phase 8 Audio Generator

### File: `services/phases/phase8-audio-generator.cjs`

### Dependencies
- `services/supabase-client.cjs` (from Sub-Agent 1)
- `services/azure-tts-service.cjs` (existing)
- `services/elevenlabs-service.cjs` (existing)
- `services/s3-production-service.cjs` (existing)

### Input
- `lego_baskets.json` from course directory
- Course voice configuration from Supabase or passed in

### Implementation Outline

```javascript
// services/phases/phase8-audio-generator.cjs

const express = require('express')
const path = require('path')
const fs = require('fs-extra')
const crypto = require('crypto')

const db = require('../supabase-client.cjs')
const azureTTS = require('../azure-tts-service.cjs')
const elevenLabsTTS = require('../elevenlabs-service.cjs')
const s3Service = require('../s3-production-service.cjs')

const app = express()
const PORT = process.env.PORT || 3465

app.use(express.json())

// Active jobs
const activeJobs = new Map()

/**
 * Extract unique audio needs from lego_baskets.json
 * Returns array of { text, lang, role, seedId, legoId }
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
          const key = `${cycle.target}|${targetLang}|target1`
          if (!seen.has(key)) {
            seen.add(key)
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
 */
function getCadenceForRole(role) {
  // target1 and target2 use slow cadence for learner
  // source uses natural cadence
  if (role === 'source') return 'natural'
  return 'slow'
}

/**
 * Generate audio for a single sample
 */
async function generateSingleAudio(text, lang, role, voiceId, cadence) {
  const voice = await db.getVoice(voiceId)
  if (!voice) {
    throw new Error(`Voice not found: ${voiceId}`)
  }

  let audioBuffer
  let ttsEngine = voice.tts_engine

  if (voice.type === 'tts' && voice.tts_engine === 'azure') {
    audioBuffer = await azureTTS.synthesize(text, voiceId, { rate: cadence === 'slow' ? 0.8 : 1.0 })
  } else if (voice.type === 'tts' && voice.tts_engine === 'elevenlabs') {
    audioBuffer = await elevenLabsTTS.synthesize(text, voiceId, { stability: 0.5 })
  } else {
    throw new Error(`Unsupported voice type: ${voice.type}`)
  }

  return { audioBuffer, ttsEngine }
}

/**
 * POST /generate
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
  const { courseCode, voices } = req.body

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode required' })
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
    progress: { current: 0, total: 0, skipped: 0, generated: 0, failed: 0 }
  }
  activeJobs.set(courseCode, job)

  // Return immediately, process in background
  res.json({ success: true, jobId, message: 'Generation started' })

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
    const [targetLang, , knownLang] = courseCode.split('_')

    // Extract audio needs
    const needs = extractAudioNeeds(baskets, targetLang, knownLang)
    job.progress.total = needs.length

    console.log(`[Phase 8] ${courseCode}: ${needs.length} audio samples needed`)

    // Get voice config
    const voiceConfig = voices || await db.getCourseVoices(courseCode) || {}

    // Process each need
    for (let i = 0; i < needs.length; i++) {
      const need = needs[i]
      const voiceId = voiceConfig[need.role]

      if (!voiceId) {
        console.warn(`[Phase 8] No voice configured for role: ${need.role}`)
        job.progress.failed++
        continue
      }

      const cadence = getCadenceForRole(need.role)
      const uuid = db.generateAudioUUID(voiceId, need.text, need.lang, need.role, cadence)
      const hashInput = `${voiceId}|${need.text}|${need.lang}|${need.role}|${cadence}`

      // Check if exists
      const exists = await db.audioExists(uuid)
      if (exists) {
        job.progress.skipped++
        job.progress.current = i + 1

        // Still record usage
        await db.recordCourseUsage(courseCode, uuid, 'basket', need.seedId, need.legoId)
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
        await s3Service.uploadAudio(uuid, audioBuffer)

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
          durationMs: null, // Would need audio analysis
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

      } catch (err) {
        console.error(`[Phase 8] Failed to generate ${uuid}:`, err.message)
        job.progress.failed++
      }

      job.progress.current = i + 1

      // Emit progress (if production API is running)
      emitProgress(courseCode, job.progress)
    }

    job.status = 'complete'
    job.completedAt = new Date().toISOString()

    console.log(`[Phase 8] ${courseCode} complete:`, job.progress)

  } catch (err) {
    job.status = 'failed'
    job.error = err.message
    console.error(`[Phase 8] ${courseCode} failed:`, err)
  }
})

/**
 * GET /status/:courseCode
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
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({ service: 'Phase 8 Audio Generator', status: 'running', port: PORT })
})

/**
 * Emit progress to Production API WebSocket
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

app.listen(PORT, () => {
  console.log(`[Phase 8] Audio Generator running on port ${PORT}`)
})

module.exports = { app, extractAudioNeeds }
```

### Success Criteria
- [ ] Loads `lego_baskets.json` correctly
- [ ] Extracts unique audio needs
- [ ] Skips existing audio (checks Supabase)
- [ ] Generates TTS for missing audio
- [ ] Uploads to S3
- [ ] Inserts into Supabase
- [ ] Records course usage
- [ ] Reports progress

---

## Sub-Agent 3: Phase 9 Manifest Compiler

### File: `services/phases/phase9-manifest-compiler.cjs`

### Dependencies
- `services/supabase-client.cjs` (from Sub-Agent 1)

### Input
- `lego_baskets.json`
- Supabase audio_samples table

### Output
- `course_manifest.json` with UUIDs populated

### Implementation Outline

```javascript
// services/phases/phase9-manifest-compiler.cjs

const express = require('express')
const path = require('path')
const fs = require('fs-extra')

const db = require('../supabase-client.cjs')

const app = express()
const PORT = process.env.PORT || 3466

app.use(express.json())

/**
 * POST /compile
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

  try {
    const vfsRoot = process.env.VFS_ROOT || './public/vfs/courses'
    const basketsPath = path.join(vfsRoot, courseCode, 'lego_baskets.json')

    if (!await fs.pathExists(basketsPath)) {
      return res.status(404).json({ error: 'lego_baskets.json not found' })
    }

    const baskets = await fs.readJson(basketsPath)

    // Parse course code
    const [targetLang, , knownLang] = courseCode.split('_')

    // Get voice config
    const voices = voiceOverrides || await db.getCourseVoices(courseCode) || {}

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

    // Build manifest slices from baskets
    for (const [seedId, seedData] of Object.entries(baskets)) {
      const slice = {
        seedId,
        samples: {}
      }

      for (const basket of seedData.baskets || []) {
        for (const cycle of basket.cycles || []) {
          const samples = []

          // Target samples
          if (cycle.target) {
            for (const role of ['target1', 'target2']) {
              const voiceId = voices[role]
              const cadence = 'slow'
              const uuid = db.generateAudioUUID(voiceId, cycle.target, targetLang, role, cadence)

              const exists = await db.audioExists(uuid)
              if (!exists) {
                missing.push({ text: cycle.target, lang: targetLang, role, uuid })
              }

              samples.push({
                id: uuid,
                role,
                cadence,
                text: cycle.target
              })
            }
          }

          // Source sample
          if (cycle.source) {
            const voiceId = voices.source
            const cadence = 'natural'
            const uuid = db.generateAudioUUID(voiceId, cycle.source, knownLang, 'source', cadence)

            const exists = await db.audioExists(uuid)
            if (!exists) {
              missing.push({ text: cycle.source, lang: knownLang, role: 'source', uuid })
            }

            samples.push({
              id: uuid,
              role: 'source',
              cadence,
              text: cycle.source
            })
          }

          // Add to slice
          const key = cycle.target || cycle.source
          if (key) {
            slice.samples[key] = samples
          }
        }
      }

      manifest.slices.push(slice)
    }

    // Check for missing
    if (missing.length > 0) {
      return res.status(422).json({
        success: false,
        error: 'Missing audio samples',
        missing,
        missingCount: missing.length,
        hint: 'Run Phase 8 audio generation first'
      })
    }

    // Write manifest
    const manifestPath = path.join(vfsRoot, courseCode, 'course_manifest.json')
    await fs.writeJson(manifestPath, manifest, { spaces: 2 })

    // Update course status in Supabase
    await db.upsertCourse(courseCode, knownLang, targetLang, voices)

    res.json({
      success: true,
      manifestPath,
      sliceCount: manifest.slices.length,
      sampleCount: manifest.slices.reduce((acc, s) => acc + Object.keys(s.samples).length, 0)
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

  // Similar to compile but just returns validation result
  // ... (abbreviated - similar logic to compile but read-only)

  res.json({ valid: true, courseCode })
})

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({ service: 'Phase 9 Manifest Compiler', status: 'running', port: PORT })
})

app.listen(PORT, () => {
  console.log(`[Phase 9] Manifest Compiler running on port ${PORT}`)
})

module.exports = { app }
```

### Success Criteria
- [ ] Loads lego_baskets.json
- [ ] Looks up all UUIDs from Supabase
- [ ] Fails fast with missing list if audio not found
- [ ] Writes valid course_manifest.json
- [ ] Updates course record in Supabase

---

## Integration: Update start-automation.cjs

Add the new Phase 9 service:

```javascript
// In SERVICES object:
phase9: {
  script: 'services/phases/phase9-manifest-compiler.cjs',
  port: BASE_PORT + 10,  // 3466
  name: 'Phase 9 (Manifest)',
  color: '\x1b[92m'    // Bright Green
}
```

---

## Testing Checklist

After all sub-agents complete:

1. **Start services:**
   ```bash
   npm run automation
   ```

2. **Check Supabase connection:**
   ```bash
   curl http://localhost:3465/health
   curl http://localhost:3466/health
   ```

3. **Generate audio for a test course:**
   ```bash
   curl -X POST http://localhost:3465/generate \
     -H "Content-Type: application/json" \
     -d '{
       "courseCode": "spa_for_eng",
       "voices": {
         "source": "azure_en-GB-BellaNeural",
         "target1": "azure_es-ES-ElviraNeural",
         "target2": "azure_es-ES-AlvaroNeural"
       }
     }'
   ```

4. **Check progress:**
   ```bash
   curl http://localhost:3465/status/spa_for_eng
   ```

5. **Compile manifest:**
   ```bash
   curl -X POST http://localhost:3466/compile \
     -H "Content-Type: application/json" \
     -d '{"courseCode": "spa_for_eng"}'
   ```

6. **Verify in Supabase:**
   - Check `audio_samples` table has entries
   - Check `course_audio_usage` has mappings
   - Check `courses` table has course record

---

## File Summary

| File | Sub-Agent | Purpose |
|------|-----------|---------|
| `services/supabase-client.cjs` | 1 | Database client & utilities |
| `services/phases/phase8-audio-generator.cjs` | 2 | Generate audio from baskets |
| `services/phases/phase9-manifest-compiler.cjs` | 3 | Compile manifest from Supabase |

---

## Branch & PR

1. Create branch: `feature/supabase-audio-pipeline`
2. Commit after each sub-agent completes
3. Final commit with integration test results
4. Create PR to main

---

## Success Criteria (Overall)

- [ ] Supabase client works with all CRUD operations
- [ ] Phase 8 generates audio and populates Supabase
- [ ] Phase 9 compiles manifest from Supabase lookups
- [ ] Full flow: baskets → audio → manifest works end-to-end
- [ ] Services start via `npm run automation`
